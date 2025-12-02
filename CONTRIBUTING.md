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

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/engage.git
cd engage

# Install dependencies
npm install

# Start development server
npm start

# Open http://localhost:3000
```

### Code Style

- Use consistent indentation (2 spaces)
- Add comments for complex logic
- Keep functions focused and small
- Test your changes in multiple browsers

## Project Structure

```
engage/
├── server.js           # Express server
├── public/
│   ├── index.html      # Main HTML
│   ├── css/styles.css  # Styling
│   └── js/
│       ├── app.js      # Main application logic
│       └── pdf-engine.js # PDF generation
├── Dockerfile          # Docker configuration
└── docker-compose.yml  # Docker Compose setup
```

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

