/**
 * Application configuration
 * All environment variables and settings in one place
 */

module.exports = {
  // Server
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',

  // Ollama AI
  ollama: {
    host: process.env.OLLAMA_HOST || 'http://localhost:11434',
    // qwen2.5-coder is optimized for code/HTML processing - lightweight and fast
    model: process.env.OLLAMA_MODEL || 'qwen2.5-coder:1.5b',
    embeddingModel: process.env.EMBEDDING_MODEL || 'nomic-embed-text',
    // Context window size (tokens) - increase for longer pages, requires more VRAM
    // qwen2.5-coder supports up to 32k context
    contextSize: parseInt(process.env.OLLAMA_CONTEXT_SIZE, 10) || 16384,
    // Timeouts (generate timeout is longer to handle model cold-starts and large content)
    statusTimeout: 3000,
    generateTimeout: parseInt(process.env.OLLAMA_GENERATE_TIMEOUT, 10) || 180000,
    embeddingTimeout: 30000,
  },

  // Request limits
  bodyLimit: '50mb',
};

