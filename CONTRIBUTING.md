# Contributing to Engage

Thank you for your interest in contributing to Engage! This document provides guidelines and information for contributors.

## How to Contribute

### Reporting Bugs

1. Check if the bug has already been reported in Issues
2. If not, create a new issue with:
   - Clear title and description
   - Steps to reproduce
   - Expected vs actual behavior
   - Browser/OS information
   - Screenshots if applicable

### Suggesting Features

1. Check existing issues for similar suggestions
2. Create a new issue with the "feature request" label
3. Describe the feature and its use case
4. Explain why it would be valuable

### Pull Requests

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Test thoroughly
5. Commit with clear messages (`git commit -m 'Add amazing feature'`)
6. Push to your fork (`git push origin feature/amazing-feature`)
7. Open a Pull Request

### Development Setup

#### Option 1: Local Node.js

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/engage.git
cd engage

# Install dependencies
npm install

# (Optional) Create .env for custom configuration
cp .env.example .env

# Start development server
npm start

# Open http://localhost:3000
```

#### Option 2: Docker Development

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/engage.git
cd engage

# Build and run with local changes
docker compose up -d --build

# View logs
docker compose logs -f engage

# Rebuild after code changes
docker compose up -d --build
```

#### With Local Ollama (for AI features)

```bash
# Install Ollama from https://ollama.ai/
ollama pull qwen2.5-coder:1.5b
ollama pull nomic-embed-text

# Start Engage (connects to localhost:11434 automatically)
npm start
```

### Code Style

- Use consistent indentation (2 spaces)
- Add comments for complex logic
- Keep functions focused and small
- Test your changes in multiple browsers

## Project Structure

```
engage/
├── server.js              # Express server
├── public/
│   ├── index.html         # Main HTML
│   ├── css/styles.css     # Styling
│   └── js/
│       ├── app.js         # Main application logic
│       └── pdf-engine.js  # PDF generation
├── Dockerfile             # Docker configuration
├── docker-compose.yml     # Full setup (with AI)
├── docker-compose.lite.yml # Lite setup (no AI)
├── .env.example           # Environment configuration template
└── .github/
    └── workflows/
        └── docker-publish.yml # CI/CD pipeline
```

## CI/CD Pipeline

When you push to `main` or create a version tag, GitHub Actions automatically:

1. Builds the Docker image
2. Pushes to GitHub Container Registry (`ghcr.io/nilayk/engage`)
3. Tags with `latest`, commit SHA, and version (if tagged)

**Testing your changes:**
- PRs don't trigger image publishing
- Test locally with `docker compose up -d --build` before submitting

## Areas for Contribution

- Bug fixes
- Performance improvements
- New page size presets
- Additional book fonts
- Better chrome stripping heuristics
- Accessibility improvements
- Documentation improvements
- Translations

## Code of Conduct

Be respectful and inclusive. We welcome contributors of all backgrounds and experience levels.

## Questions?

Feel free to open an issue for any questions about contributing.

---

Thank you for helping make Engage better!

