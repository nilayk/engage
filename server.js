const express = require('express');
const cors = require('cors');
const path = require('path');
const https = require('https');
const http = require('http');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static('public'));

// Proxy endpoint to fetch URLs (avoids CORS)
app.post('/api/fetch', async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'Valid URL is required' });
    }

    // Validate URL format
    let targetUrl;
    try {
      targetUrl = new URL(url);
    } catch (e) {
      return res.status(400).json({ error: 'Invalid URL format' });
    }

    // Only allow http/https
    if (!['http:', 'https:'].includes(targetUrl.protocol)) {
      return res.status(400).json({ error: 'Only HTTP and HTTPS URLs are allowed' });
    }

    // Fetch the URL
    const fetchModule = targetUrl.protocol === 'https:' ? https : http;
    
    fetchModule.get(url, (response) => {
      let data = '';
      
      response.on('data', (chunk) => {
        data += chunk;
      });
      
      response.on('end', () => {
        if (response.statusCode >= 200 && response.statusCode < 300) {
          res.setHeader('Content-Type', response.headers['content-type'] || 'text/html');
          res.json({ 
            html: data,
            contentType: response.headers['content-type'] || 'text/html',
            statusCode: response.statusCode
          });
        } else {
          res.status(response.statusCode || 500).json({ 
            error: `Failed to fetch URL: ${response.statusCode}` 
          });
        }
      });
    }).on('error', (error) => {
      res.status(500).json({ error: `Failed to fetch URL: ${error.message}` });
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Ollama configuration
const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://localhost:11434';
// qwen2.5-coder is optimized for code/HTML processing - lightweight and fast
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'qwen2.5-coder:1.5b';
const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || 'nomic-embed-text';

// Check Ollama availability
app.get('/api/ollama/status', async (req, res) => {
  try {
    const ollamaUrl = new URL('/api/tags', OLLAMA_HOST);
    const protocol = ollamaUrl.protocol === 'https:' ? https : http;
    
    const request = protocol.get(ollamaUrl.toString(), { timeout: 3000 }, (response) => {
      if (response.statusCode === 200) {
        res.json({ available: true, host: OLLAMA_HOST, model: OLLAMA_MODEL });
      } else {
        res.json({ available: false });
      }
    });
    
    request.on('error', () => {
      res.json({ available: false });
    });
    
    request.on('timeout', () => {
      request.destroy();
      res.json({ available: false });
    });
  } catch (error) {
    res.json({ available: false });
  }
});

// AI content cleanup using Ollama
app.post('/api/ollama/cleanup', async (req, res) => {
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

    const ollamaUrl = new URL('/api/generate', OLLAMA_HOST);
    const postData = JSON.stringify({
      model: OLLAMA_MODEL,
      prompt: prompt,
      stream: false,
      options: {
        temperature: 0.1,
        num_predict: 16000
      }
    });

    const protocol = ollamaUrl.protocol === 'https:' ? https : http;
    
    const request = protocol.request(ollamaUrl.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      },
      timeout: 60000 // 60 second timeout for LLM processing
    }, (response) => {
      let data = '';
      
      response.on('data', (chunk) => {
        data += chunk;
      });
      
      response.on('end', () => {
        try {
          const result = JSON.parse(data);
          if (result.response) {
            // Extract HTML from response
            let cleanedHtml = result.response.trim();
            
            // If wrapped in code blocks, extract
            const codeBlockMatch = cleanedHtml.match(/```html?\n?([\s\S]*?)```/);
            if (codeBlockMatch) {
              cleanedHtml = codeBlockMatch[1].trim();
            }
            
            res.json({ cleanedHtml, model: OLLAMA_MODEL });
          } else {
            res.json({ cleanedHtml: html }); // Return original if no response
          }
        } catch (e) {
          res.json({ cleanedHtml: html }); // Return original on parse error
        }
      });
    });

    request.on('error', (error) => {
      console.error('Ollama error:', error);
      res.json({ cleanedHtml: html }); // Return original on error
    });

    request.on('timeout', () => {
      request.destroy();
      res.json({ cleanedHtml: html }); // Return original on timeout
    });

    request.write(postData);
    request.end();

  } catch (error) {
    console.error('Ollama cleanup error:', error);
    res.json({ cleanedHtml: req.body.html }); // Return original on error
  }
});

// Smart content extraction using embeddings
app.post('/api/ollama/extract', async (req, res) => {
  try {
    const { blocks } = req.body;
    
    if (!blocks || !Array.isArray(blocks) || blocks.length === 0) {
      return res.status(400).json({ error: 'Text blocks array is required' });
    }

    // Reference text that represents "main article content"
    const referenceTexts = [
      "This is the main article content with paragraphs of text discussing the topic in detail.",
      "The article explains concepts, provides information, and contains substantive paragraphs.",
      "Educational content with explanations, examples, and detailed descriptions."
    ];

    // Helper function to get embedding
    const getEmbedding = (text) => {
      return new Promise((resolve, reject) => {
        const ollamaUrl = new URL('/api/embeddings', OLLAMA_HOST);
        const postData = JSON.stringify({
          model: EMBEDDING_MODEL,
          prompt: text.substring(0, 2000) // Limit text length
        });

        const protocol = ollamaUrl.protocol === 'https:' ? https : http;
        
        const request = protocol.request(ollamaUrl.toString(), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
          },
          timeout: 30000
        }, (response) => {
          let data = '';
          response.on('data', chunk => data += chunk);
          response.on('end', () => {
            try {
              const result = JSON.parse(data);
              resolve(result.embedding || null);
            } catch (e) {
              resolve(null);
            }
          });
        });

        request.on('error', () => resolve(null));
        request.on('timeout', () => {
          request.destroy();
          resolve(null);
        });

        request.write(postData);
        request.end();
      });
    };

    // Calculate cosine similarity
    const cosineSimilarity = (a, b) => {
      if (!a || !b || a.length !== b.length) return 0;
      let dotProduct = 0, normA = 0, normB = 0;
      for (let i = 0; i < a.length; i++) {
        dotProduct += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
      }
      return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    };

    // Get reference embedding (average of reference texts)
    const refEmbeddings = await Promise.all(referenceTexts.map(t => getEmbedding(t)));
    const validRefEmbeddings = refEmbeddings.filter(e => e !== null);
    
    if (validRefEmbeddings.length === 0) {
      return res.json({ extractedIndices: blocks.map((_, i) => i) }); // Return all if embedding fails
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
            length: block.text.length
          });
        } else {
          // If embedding fails, include block if it has substantial text
          results.push({
            index: blockIndex,
            similarity: block.text.length > 200 ? 0.5 : 0.2,
            length: block.text.length
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
      model: EMBEDDING_MODEL,
      blocksProcessed: blocks.length,
      blocksKept: extractedIndices.length
    });

  } catch (error) {
    console.error('Embedding extraction error:', error);
    // On error, return all indices (fall back to keeping everything)
    res.json({ extractedIndices: req.body.blocks?.map((_, i) => i) || [] });
  }
});

// Serve index.html for root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Engage server running on port ${PORT}`);
  console.log(`Ollama integration: ${OLLAMA_HOST}`);
  console.log(`  - Code model: ${OLLAMA_MODEL}`);
  console.log(`  - Embedding model: ${EMBEDDING_MODEL}`);
});

