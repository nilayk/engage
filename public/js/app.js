/**
 * Engage - Main Application Logic
 * URL to PDF Converter with client-side generation
 */

// Initialize PDF engine
const pdfEngine = new PdfEngine();

// DOM Elements
const elements = {
    // Input mode
    urlModeBtn: document.querySelector('[data-mode="url"]'),
    htmlModeBtn: document.querySelector('[data-mode="html"]'),
    urlInputContainer: document.getElementById('url-input-container'),
    htmlInputContainer: document.getElementById('html-input-container'),
    
    // Input fields
    urlInput: document.getElementById('url-input'),
    htmlInput: document.getElementById('html-input'),
    fetchBtn: document.getElementById('fetch-btn'),
    loadHtmlBtn: document.getElementById('load-html-btn'),
    
    // PDF options
    pageSize: document.getElementById('page-size'),
    customSizeContainer: document.getElementById('custom-size-container'),
    customWidth: document.getElementById('custom-width'),
    customHeight: document.getElementById('custom-height'),
    marginTop: document.getElementById('margin-top'),
    marginRight: document.getElementById('margin-right'),
    marginBottom: document.getElementById('margin-bottom'),
    marginLeft: document.getElementById('margin-left'),
    fontScale: document.getElementById('font-scale'),
    fontScaleValue: document.getElementById('font-scale-value'),
    includeBackground: document.getElementById('include-background'),
    syntaxHighlight: document.getElementById('syntax-highlight'),
    stripChrome: document.getElementById('strip-chrome'),
    
    // Book mode options
    bookMode: document.getElementById('book-mode'),
    bookOptions: document.getElementById('book-options'),
    generateToc: document.getElementById('generate-toc'),
    dropCaps: document.getElementById('drop-caps'),
    chapterHeaders: document.getElementById('chapter-headers'),
    bookFont: document.getElementById('book-font'),
    smartExtract: document.getElementById('smart-extract'),
    extractHint: document.getElementById('extract-hint'),
    aiCleanup: document.getElementById('ai-cleanup'),
    aiHint: document.getElementById('ai-hint'),
    
    // Actions
    generatePdfBtn: document.getElementById('generate-pdf-btn'),
    printPdfBtn: document.getElementById('print-pdf-btn'),
    
    // Content area
    loadingIndicator: document.getElementById('loading-indicator'),
    errorMessage: document.getElementById('error-message'),
    previewContainer: document.getElementById('preview-container'),
    contentPreview: document.getElementById('content-preview'),
    emptyState: document.getElementById('empty-state'),
    
    // Toast
    toast: document.getElementById('toast')
};

// State
let currentContent = null;
let currentMode = 'url';

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initializeEventListeners();
    updateFontScaleDisplay();
});

/**
 * Initialize all event listeners
 */
function initializeEventListeners() {
    // Mode toggle
    elements.urlModeBtn.addEventListener('click', () => switchMode('url'));
    elements.htmlModeBtn.addEventListener('click', () => switchMode('html'));
    
    // Fetch URL
    elements.fetchBtn.addEventListener('click', handleFetchUrl);
    elements.urlInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleFetchUrl();
    });
    
    // Load HTML
    elements.loadHtmlBtn.addEventListener('click', handleLoadHtml);
    
    // Page size change
    elements.pageSize.addEventListener('change', handlePageSizeChange);
    
    // Font scale slider
    elements.fontScale.addEventListener('input', updateFontScaleDisplay);
    
    // Book mode toggle
    elements.bookMode.addEventListener('change', handleBookModeToggle);
    elements.smartExtract.addEventListener('change', handleSmartExtractToggle);
    elements.aiCleanup.addEventListener('change', handleAiCleanupToggle);
    
    // Generate PDF
    elements.generatePdfBtn.addEventListener('click', handleGeneratePDF);
    
    // Print to PDF (browser native)
    elements.printPdfBtn.addEventListener('click', handlePrintPDF);
    
    // Add keyboard shortcut (Ctrl/Cmd + Enter to generate)
    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && currentContent) {
            handleGeneratePDF();
        }
        // Ctrl/Cmd + P for print
        if ((e.ctrlKey || e.metaKey) && e.key === 'p' && currentContent) {
            e.preventDefault();
            handlePrintPDF();
        }
    });
}

/**
 * Switch between URL and HTML input modes
 */
function switchMode(mode) {
    currentMode = mode;
    
    // Update button states
    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.mode === mode);
    });
    
    // Toggle containers with animation
    if (mode === 'url') {
        elements.urlInputContainer.style.display = 'flex';
        elements.htmlInputContainer.style.display = 'none';
        elements.urlInput.focus();
    } else {
        elements.urlInputContainer.style.display = 'none';
        elements.htmlInputContainer.style.display = 'flex';
        elements.htmlInput.focus();
    }
}

/**
 * Handle fetching URL content
 */
async function handleFetchUrl() {
    const url = elements.urlInput.value.trim();
    
    if (!url) {
        showError('Please enter a URL to fetch');
        return;
    }
    
    // Basic URL validation
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        showError('Please enter a valid URL starting with http:// or https://');
        return;
    }
    
    try {
        showLoading('Fetching page content...');
        hideError();
        setButtonLoading(elements.fetchBtn, true, 'Fetching...');
        
        const response = await fetch('/api/fetch', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ url })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to fetch URL');
        }
        
        let htmlContent = (await response.json()).html;
        
        // Apply smart extraction if enabled (embeddings-based)
        if (elements.smartExtract.checked) {
            showLoading('Extracting main content with AI...');
            try {
                htmlContent = await extractMainContent(htmlContent);
            } catch (e) {
                console.warn('Smart extraction failed, using original:', e);
            }
        }
        
        // Apply AI cleanup if enabled (LLM-based)
        if (elements.aiCleanup.checked) {
            showLoading('AI is cleaning up formatting...');
            try {
                htmlContent = await cleanContentWithAI(htmlContent);
            } catch (e) {
                console.warn('AI cleanup failed, using original:', e);
            }
        }
        
        // Sanitize HTML
        const sanitizedHtml = DOMPurify.sanitize(htmlContent, {
            ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'b', 'i', 'u', 's', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 
                          'ul', 'ol', 'li', 'a', 'img', 'blockquote', 'pre', 'code', 'div', 
                          'span', 'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'hr', 'section', 
                          'article', 'header', 'footer', 'nav', 'main', 'aside', 'figure', 'figcaption',
                          'dl', 'dt', 'dd', 'address', 'time', 'mark', 'sub', 'sup', 'small'],
            ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class', 'id', 'style', 'target', 'width', 'height',
                          'datetime', 'cite', 'lang', 'dir']
        });
        
        displayContent(sanitizedHtml);
        
        // Show appropriate success message
        const features = [];
        if (elements.smartExtract.checked) features.push('extracted');
        if (elements.aiCleanup.checked) features.push('cleaned');
        const message = features.length > 0 
            ? `Content loaded and ${features.join(' & ')} with AI!`
            : 'Content loaded successfully!';
        showToast(message);
        
    } catch (error) {
        console.error('Fetch error:', error);
        showError(error.message || 'Failed to fetch URL. Please check the URL and try again.');
        hideContent();
    } finally {
        setButtonLoading(elements.fetchBtn, false, '🔗 Fetch Page');
    }
}

/**
 * Handle loading raw HTML
 */
function handleLoadHtml() {
    const html = elements.htmlInput.value.trim();
    
    if (!html) {
        showError('Please paste some HTML content');
        return;
    }
    
    try {
        hideError();
        
        // Sanitize HTML
        const sanitizedHtml = DOMPurify.sanitize(html, {
            ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'b', 'i', 'u', 's', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 
                          'ul', 'ol', 'li', 'a', 'img', 'blockquote', 'pre', 'code', 'div', 
                          'span', 'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'hr', 'section', 
                          'article', 'header', 'footer', 'nav', 'main', 'aside', 'figure', 'figcaption',
                          'dl', 'dt', 'dd', 'address', 'time', 'mark', 'sub', 'sup', 'small'],
            ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class', 'id', 'style', 'target', 'width', 'height',
                          'datetime', 'cite', 'lang', 'dir']
        });
        
        if (!sanitizedHtml.trim()) {
            showError('The HTML content appears to be empty or contains only unsupported elements');
            return;
        }
        
        displayContent(sanitizedHtml);
        showToast('HTML loaded successfully!');
        
    } catch (error) {
        console.error('Load HTML error:', error);
        showError('Failed to parse HTML. Please check your HTML and try again.');
        hideContent();
    }
}

/**
 * Display content in preview
 */
function displayContent(html) {
    elements.contentPreview.innerHTML = html;
    currentContent = elements.contentPreview;
    
    // Apply syntax highlighting if enabled
    if (elements.syntaxHighlight.checked) {
        pdfEngine.applySyntaxHighlighting(elements.contentPreview);
    }
    
    // Show preview with animation
    elements.previewContainer.style.display = 'block';
    elements.emptyState.style.display = 'none';
    elements.loadingIndicator.style.display = 'none';
    
    // Enable generate buttons
    elements.generatePdfBtn.disabled = false;
    elements.printPdfBtn.disabled = false;
}

/**
 * Hide content preview
 */
function hideContent() {
    elements.previewContainer.style.display = 'none';
    elements.emptyState.style.display = 'flex';
    elements.generatePdfBtn.disabled = true;
    elements.printPdfBtn.disabled = true;
    currentContent = null;
}

/**
 * Show loading indicator
 */
function showLoading(message = 'Loading content...') {
    const loadingText = elements.loadingIndicator.querySelector('p');
    if (loadingText) loadingText.textContent = message;
    
    elements.loadingIndicator.style.display = 'flex';
    elements.previewContainer.style.display = 'none';
    elements.emptyState.style.display = 'none';
}

/**
 * Show error message
 */
function showError(message) {
    elements.errorMessage.textContent = message;
    elements.errorMessage.style.display = 'flex';
    elements.loadingIndicator.style.display = 'none';
}

/**
 * Hide error message
 */
function hideError() {
    elements.errorMessage.style.display = 'none';
}

/**
 * Handle page size change
 */
function handlePageSizeChange() {
    const isCustom = elements.pageSize.value === 'custom';
    elements.customSizeContainer.style.display = isCustom ? 'block' : 'none';
}

/**
 * Handle book mode toggle
 */
function handleBookModeToggle() {
    const isEnabled = elements.bookMode.checked;
    elements.bookOptions.style.display = isEnabled ? 'block' : 'none';
}

/**
 * Handle smart extract toggle
 */
function handleSmartExtractToggle() {
    elements.extractHint.style.display = elements.smartExtract.checked ? 'block' : 'none';
}

/**
 * Handle AI cleanup toggle
 */
function handleAiCleanupToggle() {
    elements.aiHint.style.display = elements.aiCleanup.checked ? 'block' : 'none';
}

/**
 * Check if Ollama is available
 */
async function checkOllamaAvailable() {
    try {
        const response = await fetch('/api/ollama/status');
        const data = await response.json();
        return data.available;
    } catch {
        return false;
    }
}

/**
 * Clean content using Ollama LLM
 */
async function cleanContentWithAI(html) {
    try {
        const response = await fetch('/api/ollama/cleanup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ html })
        });
        
        if (!response.ok) {
            throw new Error('AI cleanup failed');
        }
        
        const data = await response.json();
        return data.cleanedHtml || html;
    } catch (error) {
        console.warn('AI cleanup failed, using original content:', error);
        return html;
    }
}

/**
 * Extract main content using embeddings
 * Identifies article content vs navigation/boilerplate
 */
async function extractMainContent(html) {
    try {
        // Parse HTML and extract text blocks with their elements
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        // Find all content-bearing elements
        const contentElements = doc.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li, blockquote, pre, td, th, figcaption, dt, dd');
        
        if (contentElements.length < 3) {
            return html; // Not enough content to process
        }

        // Build blocks array with text and references
        const blocks = [];
        const elementMap = new Map();
        
        contentElements.forEach((el, index) => {
            const text = el.textContent.trim();
            if (text.length > 20) { // Only process substantial text
                blocks.push({ text, index });
                elementMap.set(index, el);
            }
        });

        if (blocks.length < 3) {
            return html; // Not enough blocks
        }

        // Call embedding API
        const response = await fetch('/api/ollama/extract', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ blocks })
        });

        if (!response.ok) {
            throw new Error('Extraction failed');
        }

        const data = await response.json();
        const keepIndices = new Set(data.extractedIndices || []);

        console.log(`Smart extraction: keeping ${keepIndices.size} of ${blocks.length} blocks (threshold: ${data.threshold?.toFixed(2)})`);

        // If we're keeping most content, just return original
        if (keepIndices.size > blocks.length * 0.8) {
            return html;
        }

        // Mark elements to remove
        blocks.forEach((block, i) => {
            if (!keepIndices.has(i)) {
                const el = elementMap.get(block.index);
                if (el && el.parentNode) {
                    // Add a marker class instead of removing (so structure is preserved)
                    el.classList.add('extracted-remove');
                    el.style.display = 'none';
                }
            }
        });

        // Also hide parent containers that are now empty
        const containers = doc.querySelectorAll('div, section, article, aside, nav, header, footer');
        containers.forEach(container => {
            const visibleContent = container.querySelector('p:not(.extracted-remove), h1:not(.extracted-remove), h2:not(.extracted-remove), h3:not(.extracted-remove)');
            if (!visibleContent && container.querySelectorAll('.extracted-remove').length > 0) {
                container.style.display = 'none';
            }
        });

        return doc.body.innerHTML;

    } catch (error) {
        console.warn('Smart extraction failed, using original content:', error);
        return html;
    }
}

/**
 * Update font scale display value
 */
function updateFontScaleDisplay() {
    const value = parseFloat(elements.fontScale.value);
    elements.fontScaleValue.textContent = `${value.toFixed(1)}x`;
}

/**
 * Set button loading state
 */
function setButtonLoading(button, isLoading, text) {
    if (isLoading) {
        button.disabled = true;
        button.innerHTML = `<span class="btn-icon">⏳</span> ${text}`;
    } else {
        button.disabled = false;
        button.innerHTML = `<span class="btn-icon">${text.split(' ')[0]}</span> ${text.split(' ').slice(1).join(' ')}`;
    }
}

/**
 * Show toast notification
 */
function showToast(message, type = 'success') {
    const toast = elements.toast;
    const messageEl = toast.querySelector('.toast-message');
    const iconEl = toast.querySelector('.toast-icon');
    
    // Update content
    messageEl.textContent = message;
    iconEl.textContent = type === 'success' ? '✓' : '⚠';
    
    // Update class
    toast.className = `toast toast-${type}`;
    
    // Show toast
    toast.classList.add('show');
    
    // Hide after 3 seconds
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

/**
 * Handle Print to PDF (browser native print dialog)
 * Better for very long documents
 */
function handlePrintPDF() {
    if (!currentContent) {
        showError('No content to print. Please fetch a URL or load HTML first.');
        return;
    }

    try {
        // Create a new window with just the content
        const printWindow = window.open('', '_blank', 'width=800,height=600');
        
        if (!printWindow) {
            showError('Pop-up blocked. Please allow pop-ups and try again.');
            return;
        }

        // Get page title for the document
        const title = pdfEngine.extractTitle(currentContent);
        
        // Clone and prepare content
        const content = currentContent.cloneNode(true);
        
        // Apply syntax highlighting if enabled
        if (elements.syntaxHighlight.checked) {
            pdfEngine.applySyntaxHighlighting(content);
        }
        
        // Strip chrome if enabled
        if (elements.stripChrome.checked) {
            pdfEngine.stripChrome(content);
        }

        // Determine font family for book mode
        const bookFonts = {
            serif: 'Georgia, "Times New Roman", serif',
            modern: '"Merriweather", Georgia, serif',
            elegant: '"Libre Baskerville", Baskerville, Georgia, serif',
            readable: '"Literata", Georgia, serif'
        };
        const fontFamily = elements.bookMode.checked 
            ? bookFonts[elements.bookFont.value] || bookFonts.serif
            : '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

        // Build print document with styles
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>${title}</title>
                <link rel="preconnect" href="https://fonts.googleapis.com">
                <link href="https://fonts.googleapis.com/css2?family=Merriweather:ital,wght@0,400;0,700;1,400&family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&family=Literata:ital,wght@0,400;0,600;1,400&display=swap" rel="stylesheet">
                <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github.min.css">
                <style>
                    * { box-sizing: border-box; }
                    body {
                        font-family: ${fontFamily};
                        font-size: ${elements.fontScale.value}rem;
                        line-height: 1.7;
                        color: #1a1a1a;
                        max-width: 100%;
                        padding: 20px;
                        margin: 0;
                        text-rendering: optimizeLegibility;
                    }
                    img { max-width: 100%; height: auto; }
                    pre {
                        background: #f4f4f4;
                        padding: 1em;
                        overflow-x: auto;
                        border-radius: 4px;
                        page-break-inside: avoid;
                    }
                    code {
                        font-family: 'JetBrains Mono', Consolas, monospace;
                        font-size: 0.9em;
                    }
                    h1, h2, h3, h4, h5, h6 {
                        page-break-after: avoid;
                        margin-top: 1.5em;
                    }
                    table, figure, blockquote {
                        page-break-inside: avoid;
                    }
                    a { color: #0055aa; text-decoration: none; }
                    
                    /* Book mode styles */
                    ${elements.bookMode.checked ? `
                    p {
                        text-align: justify;
                        text-indent: 1.5em;
                        margin-bottom: 0.8em;
                        hyphens: auto;
                    }
                    p:first-of-type,
                    h1 + p, h2 + p, h3 + p,
                    blockquote + p {
                        text-indent: 0;
                    }
                    h1 {
                        text-align: center;
                        font-size: 2em;
                        margin-top: 2em;
                        page-break-before: always;
                    }
                    h1:first-of-type {
                        page-break-before: auto;
                    }
                    h2 {
                        border-bottom: 1px solid #ddd;
                        padding-bottom: 0.3em;
                    }
                    blockquote {
                        font-style: italic;
                        margin: 1.5em 2em;
                        padding-left: 1em;
                        border-left: 3px solid #ccc;
                    }
                    ` : ''}
                    
                    @media print {
                        body { padding: 0; }
                        @page {
                            margin: 2cm;
                        }
                    }
                </style>
            </head>
            <body>
                ${content.innerHTML}
            </body>
            </html>
        `);
        
        printWindow.document.close();
        
        // Wait for content to load, then trigger print
        printWindow.onload = () => {
            setTimeout(() => {
                printWindow.print();
            }, 250);
        };
        
        showToast('Print dialog opened. Select "Save as PDF" as destination.');
        
    } catch (error) {
        console.error('Print error:', error);
        showError(`Failed to open print dialog: ${error.message}`);
    }
}

/**
 * Handle PDF generation
 */
async function handleGeneratePDF() {
    if (!currentContent) {
        showError('No content to convert. Please fetch a URL or load HTML first.');
        return;
    }
    
    try {
        // Update button state
        elements.generatePdfBtn.disabled = true;
        elements.generatePdfBtn.innerHTML = '<span class="btn-icon">⏳</span> Generating...';
        
        // Collect options - filename will be extracted from content by PDF engine
        const options = {
            pageSize: elements.pageSize.value,
            customWidth: elements.customWidth.value,
            customHeight: elements.customHeight.value,
            marginTop: elements.marginTop.value,
            marginRight: elements.marginRight.value,
            marginBottom: elements.marginBottom.value,
            marginLeft: elements.marginLeft.value,
            fontScale: parseFloat(elements.fontScale.value),
            includeBackground: elements.includeBackground.checked,
            syntaxHighlight: elements.syntaxHighlight.checked,
            stripChrome: elements.stripChrome.checked,
            // Book mode options
            bookMode: elements.bookMode.checked,
            generateToc: elements.generateToc.checked,
            dropCaps: elements.dropCaps.checked,
            chapterHeaders: elements.chapterHeaders.checked,
            bookFont: elements.bookFont.value,
            filename: null // Will be auto-extracted from page title
        };
        
        // Generate PDF
        await pdfEngine.generatePDF(currentContent, options);
        
        // Show success
        showToast('PDF generated successfully!');
        
    } catch (error) {
        console.error('PDF generation error:', error);
        showError(`Failed to generate PDF: ${error.message}`);
        showToast('PDF generation failed', 'error');
    } finally {
        // Reset button
        elements.generatePdfBtn.disabled = false;
        elements.generatePdfBtn.innerHTML = '<span class="btn-icon">📄</span> Generate PDF';
    }
}
