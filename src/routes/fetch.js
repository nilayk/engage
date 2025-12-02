/**
 * URL Fetch Route
 * Proxy endpoint to fetch URLs (avoids CORS issues)
 */

const express = require('express');
const httpClient = require('../utils/http-client');

const router = express.Router();

/**
 * POST /api/fetch
 * Fetches a URL and returns its HTML content
 */
router.post('/', async (req, res) => {
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
    const response = await httpClient.get(url);
    
    if (response.statusCode >= 200 && response.statusCode < 300) {
      res.json({ 
        html: response.data,
        contentType: response.headers['content-type'] || 'text/html',
        statusCode: response.statusCode,
      });
    } else {
      res.status(response.statusCode || 500).json({ 
        error: `Failed to fetch URL: ${response.statusCode}`,
      });
    }
  } catch (error) {
    res.status(500).json({ error: `Failed to fetch URL: ${error.message}` });
  }
});

module.exports = router;

