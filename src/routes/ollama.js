/**
 * Ollama AI Routes
 * Endpoints for AI-powered content processing
 */

const express = require('express');
const config = require('../config');
const httpClient = require('../utils/http-client');

const router = express.Router();

/**
 * GET /api/ollama/status
 * Check if Ollama is available
 */
router.get('/status', async (req, res) => {
  try {
    const url = new URL('/api/tags', config.ollama.host).toString();
    
    const response = await httpClient.get(url, { 
      timeout: config.ollama.statusTimeout,
    });
    
    if (response.statusCode === 200) {
      res.json({ 
        available: true, 
        host: config.ollama.host, 
        model: config.ollama.model,
      });
    } else {
      res.json({ available: false });
    }
  } catch (error) {
    res.json({ available: false });
  }
});

/**
 * POST /api/ollama/cleanup
 * AI content cleanup using Ollama LLM
 */
router.post('/cleanup', async (req, res) => {
  try {
    const { html } = req.body;
    
    if (!html) {
      return res.status(400).json({ error: 'HTML content is required' });
    }

    // Truncate if too long (LLMs have context limits)
    const maxLength = 15000;
    const truncatedHtml = html.length > maxLength 
      ? html.substring(0, maxLength) + '...[truncated]' 
      : html;

    const prompt = `You are a content cleanup assistant. Clean up the following HTML content to make it more suitable for a beautiful book-like PDF. 

Instructions:
1. Remove any remaining navigation, ads, or non-content elements
2. Fix any broken or messy formatting
3. Ensure headings follow proper hierarchy (h1 > h2 > h3)
4. Clean up excessive whitespace
5. Remove any tracking pixels or scripts
6. Keep all actual content intact
7. Return ONLY the cleaned HTML, no explanations

HTML to clean:
${truncatedHtml}

Cleaned HTML:`;

    const url = new URL('/api/generate', config.ollama.host).toString();
    
    const response = await httpClient.postJSON(url, {
      model: config.ollama.model,
      prompt: prompt,
      stream: false,
      options: {
        temperature: 0.1,
        num_predict: 16000,
      },
    }, { timeout: config.ollama.generateTimeout });

    if (response.data?.response) {
      // Extract HTML from response
      let cleanedHtml = response.data.response.trim();
      
      // If wrapped in code blocks, extract
      const codeBlockMatch = cleanedHtml.match(/```html?\n?([\s\S]*?)```/);
      if (codeBlockMatch) {
        cleanedHtml = codeBlockMatch[1].trim();
      }
      
      res.json({ cleanedHtml, model: config.ollama.model });
    } else {
      res.json({ cleanedHtml: html }); // Return original if no response
    }
  } catch (error) {
    console.error('Ollama cleanup error:', error);
    res.json({ cleanedHtml: req.body.html }); // Return original on error
  }
});

/**
 * POST /api/ollama/extract
 * Smart content extraction using embeddings
 */
router.post('/extract', async (req, res) => {
  try {
    const { blocks } = req.body;
    
    if (!blocks || !Array.isArray(blocks) || blocks.length === 0) {
      return res.status(400).json({ error: 'Text blocks array is required' });
    }

    // Reference text that represents "main article content"
    const referenceTexts = [
      "This is the main article content with paragraphs of text discussing the topic in detail.",
      "The article explains concepts, provides information, and contains substantive paragraphs.",
      "Educational content with explanations, examples, and detailed descriptions.",
    ];

    // Get reference embedding (average of reference texts)
    const refEmbeddings = await Promise.all(referenceTexts.map(t => getEmbedding(t)));
    const validRefEmbeddings = refEmbeddings.filter(e => e !== null);
    
    if (validRefEmbeddings.length === 0) {
      // Return all if embedding fails
      return res.json({ extractedIndices: blocks.map((_, i) => i) });
    }

    // Average the reference embeddings
    const refEmbedding = validRefEmbeddings[0].map((_, i) => 
      validRefEmbeddings.reduce((sum, e) => sum + e[i], 0) / validRefEmbeddings.length
    );

    // Process blocks in batches to avoid overwhelming the server
    const batchSize = 10;
    const results = [];
    
    for (let i = 0; i < blocks.length; i += batchSize) {
      const batch = blocks.slice(i, i + batchSize);
      const embeddings = await Promise.all(batch.map(b => getEmbedding(b.text)));
      
      embeddings.forEach((embedding, j) => {
        const blockIndex = i + j;
        const block = blocks[blockIndex];
        
        if (embedding) {
          const similarity = cosineSimilarity(embedding, refEmbedding);
          results.push({
            index: blockIndex,
            similarity,
            length: block.text.length,
          });
        } else {
          // If embedding fails, include block if it has substantial text
          results.push({
            index: blockIndex,
            similarity: block.text.length > 200 ? 0.5 : 0.2,
            length: block.text.length,
          });
        }
      });
    }

    // Dynamic threshold based on content distribution
    const similarities = results.map(r => r.similarity).sort((a, b) => b - a);
    const threshold = Math.max(0.3, similarities[Math.floor(similarities.length * 0.3)] || 0.3);

    // Filter blocks that are likely main content
    const extractedIndices = results
      .filter(r => {
        // Include if high similarity OR if it's substantial text with moderate similarity
        return r.similarity >= threshold || (r.similarity >= 0.25 && r.length > 500);
      })
      .map(r => r.index)
      .sort((a, b) => a - b);

    res.json({ 
      extractedIndices,
      threshold,
      model: config.ollama.embeddingModel,
      blocksProcessed: blocks.length,
      blocksKept: extractedIndices.length,
    });
  } catch (error) {
    console.error('Embedding extraction error:', error);
    // On error, return all indices (fall back to keeping everything)
    res.json({ extractedIndices: req.body.blocks?.map((_, i) => i) || [] });
  }
});

/**
 * Helper: Get embedding for text
 */
async function getEmbedding(text) {
  try {
    const url = new URL('/api/embeddings', config.ollama.host).toString();
    
    const response = await httpClient.postJSON(url, {
      model: config.ollama.embeddingModel,
      prompt: text.substring(0, 2000), // Limit text length
    }, { timeout: config.ollama.embeddingTimeout });

    return response.data?.embedding || null;
  } catch (error) {
    return null;
  }
}

/**
 * Helper: Calculate cosine similarity between two vectors
 */
function cosineSimilarity(a, b) {
  if (!a || !b || a.length !== b.length) return 0;
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

module.exports = router;

