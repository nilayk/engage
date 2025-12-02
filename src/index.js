/**
 * Engage - URL to PDF Converter
 * Main application entry point
 */

const express = require('express');
const cors = require('cors');
const path = require('path');

const config = require('./config');
const fetchRoutes = require('./routes/fetch');
const ollamaRoutes = require('./routes/ollama');

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: config.bodyLimit }));
app.use(express.urlencoded({ limit: config.bodyLimit, extended: true }));
app.use(express.static(path.join(__dirname, '..', 'public')));

// API Routes
app.use('/api/fetch', fetchRoutes);
app.use('/api/ollama', ollamaRoutes);

// Serve index.html for root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// Start server
app.listen(config.port, () => {
  console.log(`Engage server running on port ${config.port}`);
  console.log(`Ollama integration: ${config.ollama.host}`);
  console.log(`  - Code model: ${config.ollama.model}`);
  console.log(`  - Embedding model: ${config.ollama.embeddingModel}`);
});

