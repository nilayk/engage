# Engage - URL to PDF Converter

A beautiful, lightweight web application that converts URLs and raw HTML to customizable, publication-quality PDFs with client-side generation and optional AI-powered content cleanup.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> **Note**: This project was generated with the assistance of Claude (Anthropic), an AI language model. The code has been reviewed but may contain imperfections. Contributions and improvements are welcome!

## Features

### Core Features
- **URL Conversion**: Fetch any webpage and convert it to PDF
- **Raw HTML Support**: Paste HTML directly for conversion
- **Print to PDF**: Browser-native printing for very long documents

### PDF Customization
- **Page Sizes**: A4, Letter, Legal, Tabloid, Kindle, Smartphone, Custom
- **Margins**: Adjustable margins on all sides
- **Font Scaling**: Scale text for readability
- **Syntax Highlighting**: Code blocks with highlight.js
- **Strip Navigation**: Remove headers, footers, nav, ads
- **Background Control**: Include/exclude backgrounds

### Book Mode
Transform web content into beautiful, publication-ready PDFs:

- **Table of Contents**: Auto-generated from headings
- **Drop Caps**: Elegant first-letter styling
- **Chapter Headers**: Decorative chapter formatting
- **Book Fonts**: Georgia, Merriweather, Libre Baskerville, Literata
- **Typography Cleanup**: Smart quotes, em-dashes, justified text

### AI Features (Optional)
Integrated [Ollama](https://ollama.ai/) for intelligent content processing:

**Smart Extraction** (Embeddings-based):
- Uses `nomic-embed-text` to semantically identify main content
- Automatically filters out navigation, sidebars, and boilerplate
- Works better than CSS selectors for complex pages

**AI Cleanup** (LLM-based):
- Uses `qwen2.5-coder` to clean up formatting
- Fixes heading hierarchy
- Removes remaining non-content elements

---

## Docker Setup (Recommended)

### Prerequisites

1. **Install Docker Desktop**
   - Windows: [Download Docker Desktop for Windows](https://docs.docker.com/desktop/install/windows-install/)
   - macOS: [Download Docker Desktop for Mac](https://docs.docker.com/desktop/install/mac-install/)
   - Linux: [Install Docker Engine](https://docs.docker.com/engine/install/)

2. **Verify Installation**
   ```bash
   docker --version
   docker-compose --version
   ```

### Option 1: Full Setup (with AI)

This setup includes Ollama for AI-powered content cleanup. Requires ~4GB RAM and ~2GB disk space.

```bash
# 1. Clone or download the repository
git clone <repository-url>
cd engage

# 2. Build and start all services
docker-compose up -d

# 3. Wait for the model to download (first run only, ~2GB)
#    Monitor progress:
docker logs engage-ollama-pull -f

# 4. Check all services are running
docker-compose ps

# 5. Open in browser
#    http://localhost:3000
```

**What gets started:**
| Container | Description | Port |
|-----------|-------------|------|
| `engage` | Main web application | 3000 |
| `engage-ollama` | Ollama AI server | 11434 |
| `engage-ollama-pull` | Downloads AI model (exits after completion) | - |

### Option 2: Lite Setup (no AI)

Lightweight setup without AI features. Requires only ~256MB RAM.

```bash
# 1. Clone or download the repository
git clone <repository-url>
cd engage

# 2. Build and start (lite version)
docker-compose -f docker-compose.lite.yml up -d

# 3. Check service is running
docker-compose -f docker-compose.lite.yml ps

# 4. Open in browser
#    http://localhost:3000
```

### Managing the Services

```bash
# View running containers
docker-compose ps

# View logs
docker-compose logs -f           # All services
docker-compose logs -f engage    # Just the web app
docker-compose logs -f ollama    # Just Ollama

# Stop services (keeps data)
docker-compose stop

# Start services again
docker-compose start

# Stop and remove containers
docker-compose down

# Stop and remove everything including AI model data
docker-compose down -v

# Rebuild after code changes
docker-compose up -d --build
```

### Updating

```bash
# Pull latest changes
git pull

# Rebuild and restart
docker-compose up -d --build
```

### Changing the AI Model

The default model is `qwen2.5-coder:1.5b`, optimized for HTML/code processing. Alternatives:

| Model | Size | RAM | Best For |
|-------|------|-----|----------|
| `qwen2.5-coder:1.5b` | ~1GB | 4GB | Default - fast, efficient |
| `qwen2.5-coder:3b` | ~2GB | 6GB | Better quality |
| `phi3:mini` | ~2GB | 6GB | Good instruction following |
| `llama3.2:3b` | ~2GB | 6GB | General purpose |

To change, edit `docker-compose.yml`:

```yaml
environment:
  - OLLAMA_MODEL=qwen2.5-coder:3b    # Your preferred model
```

Update the pull command in the `ollama-pull` service to match, then restart:
```bash
docker-compose down
docker-compose up -d
```

---

## Local Development (without Docker)

### Prerequisites
- Node.js 18+ ([Download](https://nodejs.org/))
- npm (comes with Node.js)

### Setup

```bash
# 1. Clone repository
git clone <repository-url>
cd engage

# 2. Install dependencies
npm install

# 3. Start development server
npm start

# 4. Open http://localhost:3000
```

### With Local Ollama (optional)

```bash
# 1. Install Ollama from https://ollama.ai/

# 2. Pull the recommended model (optimized for HTML/code)
ollama pull qwen2.5-coder:1.5b

# 3. Start Ollama (runs on port 11434)
ollama serve

# 4. In another terminal, start Engage
npm start

# AI cleanup will automatically connect to localhost:11434
```

---

## Docker Architecture

```
┌─────────────────────────────────────────────────┐
│                  Docker Network                  │
│  ┌─────────────┐          ┌─────────────────┐   │
│  │   Engage    │◄────────►│     Ollama      │   │
│  │  :3000      │   HTTP   │    :11434       │   │
│  │  (Node.js)  │          │  (llama3.2)     │   │
│  └─────────────┘          └─────────────────┘   │
│         │                         │             │
│         │                  ┌──────┴──────┐      │
│         │                  │ ollama_data │      │
│         │                  │  (volume)   │      │
└─────────┼──────────────────┴─────────────┴──────┘
          │                         
     Port 3000                 
     (Web UI)               
```

---

## Usage Guide

1. **Enter Content**: Paste a URL or raw HTML
2. **Customize**: Adjust PDF settings and enable Book Mode if desired
3. **Generate**: Click "Generate PDF" or "Print to PDF"

### Tips for Best Results

| Scenario | Recommendation |
|----------|----------------|
| Long documents (20+ pages) | Use "Print to PDF" button |
| Articles, guides, docs | Enable Book Mode |
| E-readers, smartphones | Increase Font Scale, use Kindle/Smartphone size |
| Messy web pages | Enable "Strip Navigation" + "AI Cleanup" |

---

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3000 | Server port |
| `OLLAMA_HOST` | http://localhost:11434 | Ollama API endpoint |
| `OLLAMA_MODEL` | qwen2.5-coder:1.5b | LLM for AI cleanup |
| `EMBEDDING_MODEL` | nomic-embed-text | Model for smart extraction |

### Custom Port

**Docker:**
```yaml
# In docker-compose.yml
ports:
  - "8080:3000"  # Access on port 8080
```

**Local:**
```bash
PORT=8080 npm start
```

---

## Troubleshooting

### Docker Issues

**"Cannot connect to Docker daemon"**
- Ensure Docker Desktop is running
- On Linux, ensure your user is in the `docker` group

**"Port 3000 already in use"**
```bash
# Find what's using the port
# Windows:
netstat -ano | findstr :3000
# Linux/Mac:
lsof -i :3000

# Or change the port in docker-compose.yml
```

**"AI cleanup not working"**
```bash
# Check if Ollama is running
docker logs engage-ollama

# Check if model was downloaded
docker logs engage-ollama-pull

# Verify Ollama is accessible
curl http://localhost:11434/api/tags
```

**"Out of memory"**
- Increase Docker Desktop memory limit (Settings > Resources)
- Or use the lite version without Ollama

### PDF Issues

**"PDF is only 1-2 pages"**
- Use "Print to PDF" button for long documents
- This uses the browser's native PDF generation which handles long content better

**"Formatting looks wrong"**
- Enable "Strip Navigation" to remove page chrome
- Try enabling "Book Mode" for cleaner output
- Adjust font scale if text is too small/large

---

## System Requirements

### Lite Version (no AI)
- Docker: ~100MB image
- Memory: 256MB RAM
- Storage: 100MB

### Full Version (with AI)
- Docker: ~100MB (Engage) + ~2.5GB (Ollama + models)
- Memory: 4GB RAM recommended
- Storage: ~2.5GB for model data (qwen2.5-coder + nomic-embed-text)

---

## Technology Stack

- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Backend**: Node.js with Express
- **PDF Generation**: html2pdf.js (client-side)
- **Syntax Highlighting**: highlight.js
- **HTML Sanitization**: DOMPurify
- **AI Integration**: Ollama with qwen2.5-coder

---

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Ways to Contribute
- Report bugs and issues
- Suggest new features
- Submit pull requests
- Improve documentation
- Add translations

---

## Disclaimer

This project was created with the assistance of **Claude** (Anthropic), a large language model (LLM). While the code has been tested and reviewed, it may contain:

- Imperfections or bugs
- Suboptimal implementations
- Security considerations that need review for production use

**Use at your own discretion.** The maintainers make no warranties about the suitability of this software for any particular purpose. Always review code before deploying to production environments.

If you find issues, please report them or submit a pull request!

---

## License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

```
MIT License - Copyright (c) 2024 Engage Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software...
```

---

## Acknowledgments

- [html2pdf.js](https://github.com/eKoopmans/html2pdf.js) - Client-side PDF generation
- [highlight.js](https://highlightjs.org/) - Syntax highlighting
- [DOMPurify](https://github.com/cure53/DOMPurify) - HTML sanitization
- [Ollama](https://ollama.ai/) - Local LLM integration
- [Express](https://expressjs.com/) - Web framework
- [Claude](https://www.anthropic.com/claude) - AI assistant used in development
