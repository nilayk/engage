/**
 * PDF Engine - Handles client-side PDF generation with customization options
 * Includes Book Mode for beautiful, publication-ready PDFs
 */

class PdfEngine {
    constructor() {
        this.pageSizes = {
            a4: { width: 210, height: 297, unit: 'mm' },
            letter: { width: 215.9, height: 279.4, unit: 'mm' },
            legal: { width: 215.9, height: 355.6, unit: 'mm' },
            tabloid: { width: 279.4, height: 431.8, unit: 'mm' },
            kindle: { width: 90, height: 122, unit: 'mm' },
            smartphone: { width: 90, height: 160, unit: 'mm' },
            'smartphone-wide': { width: 100, height: 140, unit: 'mm' }
        };

        this.bookFonts = {
            serif: {
                family: 'Georgia, "Times New Roman", serif',
                name: 'Georgia'
            },
            modern: {
                family: '"Merriweather", Georgia, serif',
                name: 'Merriweather'
            },
            elegant: {
                family: '"Libre Baskerville", Baskerville, Georgia, serif',
                name: 'Libre Baskerville'
            },
            readable: {
                family: '"Literata", Georgia, serif',
                name: 'Literata'
            }
        };
    }

    /**
     * Get page dimensions based on selected size
     */
    getPageDimensions(pageSize, customWidth, customHeight) {
        if (pageSize === 'custom') {
            return {
                width: parseFloat(customWidth) || 210,
                height: parseFloat(customHeight) || 297,
                unit: 'mm'
            };
        }
        return this.pageSizes[pageSize] || this.pageSizes.a4;
    }

    /**
     * Extract page title from content
     */
    extractTitle(element) {
        const sources = [
            () => element.querySelector('h1')?.textContent,
            () => element.querySelector('title')?.textContent,
            () => element.querySelector('[class*="title"]')?.textContent,
            () => element.querySelector('h2')?.textContent,
            () => element.querySelector('article h1, article h2')?.textContent,
        ];

        for (const getTitle of sources) {
            const title = getTitle();
            if (title && title.trim()) {
                return this.sanitizeFilename(title.trim());
            }
        }

        return 'document';
    }

    /**
     * Sanitize string for use as filename
     */
    sanitizeFilename(name) {
        return name
            .replace(/[<>:"/\\|?*]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '')
            .substring(0, 100)
            .toLowerCase() || 'document';
    }

    /**
     * Apply font scaling to content
     */
    applyFontScaling(element, scale) {
        if (!element) return;

        const style = window.getComputedStyle(element);
        const baseFontSize = parseFloat(style.fontSize);
        const scaledSize = baseFontSize * scale;

        element.style.fontSize = `${scaledSize}px`;
        
        const allElements = element.querySelectorAll('*');
        allElements.forEach(el => {
            const elStyle = window.getComputedStyle(el);
            const elFontSize = parseFloat(elStyle.fontSize);
            if (elFontSize > 0) {
                el.style.fontSize = `${elFontSize * scale}px`;
            }
        });
    }

    /**
     * Strip chrome elements (headers, nav, footers, ads)
     */
    stripChrome(element) {
        if (!element) return;

        const chromeSelectors = [
            'header', 'nav', 'footer',
            '[role="banner"]', '[role="navigation"]', '[role="contentinfo"]',
            '.header', '.navbar', '.nav', '.navigation', '.footer',
            '.site-header', '.site-nav', '.site-footer',
            '.main-nav', '.primary-nav',
            '.ad', '.advertisement', '.ads', '.ad-container',
            '.sidebar', '.social-share', '.share-buttons',
            '.cookie-banner', '.cookie-consent',
            '.newsletter', '.subscribe',
            '[class*="ad-"]', '[class*="advertisement"]',
            '[id*="ad-"]', '[id*="advertisement"]'
        ];

        chromeSelectors.forEach(selector => {
            try {
                const elements = element.querySelectorAll(selector);
                elements.forEach(el => {
                    const style = window.getComputedStyle(el);
                    if (style.display !== 'none' && style.visibility !== 'hidden') {
                        el.remove();
                    }
                });
            } catch (e) {
                // Invalid selector, skip
            }
        });
    }

    /**
     * Apply syntax highlighting to code blocks
     */
    applySyntaxHighlighting(element) {
        if (!element) return;

        const codeBlocks = element.querySelectorAll('pre code, code');
        
        codeBlocks.forEach(block => {
            if (!block.classList.contains('hljs')) {
                try {
                    hljs.highlightElement(block);
                } catch (e) {
                    console.warn('Syntax highlighting failed for element:', e);
                }
            }
        });
    }

    /**
     * Add page break hints for better PDF pagination
     */
    addPageBreakHints(element) {
        const avoidBreakElements = element.querySelectorAll('pre, code, table, img, figure, blockquote, ul, ol');
        avoidBreakElements.forEach(el => {
            el.style.pageBreakInside = 'avoid';
            el.style.breakInside = 'avoid';
        });

        const headings = element.querySelectorAll('h1, h2, h3, h4, h5, h6');
        headings.forEach(el => {
            el.style.pageBreakAfter = 'avoid';
            el.style.breakAfter = 'avoid';
        });
    }

    // ==========================================
    // BOOK MODE FEATURES
    // ==========================================

    /**
     * Generate table of contents from headings
     */
    generateTableOfContents(element) {
        const headings = element.querySelectorAll('h1, h2, h3');
        if (headings.length < 3) return null; // Not enough content for TOC

        const toc = document.createElement('div');
        toc.className = 'book-toc';
        toc.innerHTML = '<h2 class="toc-title">Table of Contents</h2>';
        
        const tocList = document.createElement('ul');
        tocList.className = 'toc-list';

        let chapterNum = 0;
        headings.forEach((heading, index) => {
            const level = parseInt(heading.tagName[1]);
            const text = heading.textContent.trim();
            
            // Skip very short headings or empty ones
            if (text.length < 2) return;

            // Add ID for linking
            const id = `section-${index}`;
            heading.id = id;

            const li = document.createElement('li');
            li.className = `toc-item toc-level-${level}`;
            
            if (level === 1 || level === 2) {
                chapterNum++;
                li.innerHTML = `<span class="toc-number">${chapterNum}.</span> <a href="#${id}">${text}</a>`;
            } else {
                li.innerHTML = `<a href="#${id}">${text}</a>`;
            }
            
            tocList.appendChild(li);
        });

        toc.appendChild(tocList);
        return toc;
    }

    /**
     * Apply drop caps to first paragraph of sections
     */
    applyDropCaps(element) {
        // Find paragraphs that follow headings
        const headings = element.querySelectorAll('h1, h2');
        
        headings.forEach(heading => {
            let next = heading.nextElementSibling;
            
            // Skip non-paragraph elements
            while (next && next.tagName !== 'P') {
                next = next.nextElementSibling;
            }
            
            if (next && next.tagName === 'P') {
                const text = next.textContent.trim();
                if (text.length > 50) { // Only apply to substantial paragraphs
                    // Get first letter
                    const firstLetter = text.charAt(0);
                    if (/[A-Za-z]/.test(firstLetter)) {
                        const restOfText = next.innerHTML.substring(1);
                        next.innerHTML = `<span class="drop-cap">${firstLetter}</span>${restOfText}`;
                        next.classList.add('has-drop-cap');
                    }
                }
            }
        });
    }

    /**
     * Format chapter headers with decorative styling
     */
    formatChapterHeaders(element) {
        const h1s = element.querySelectorAll('h1');
        let chapterNum = 0;

        h1s.forEach((h1, index) => {
            chapterNum++;
            const text = h1.textContent.trim();
            
            // Create chapter header wrapper
            const wrapper = document.createElement('div');
            wrapper.className = 'chapter-header';
            wrapper.innerHTML = `
                <div class="chapter-number">Chapter ${chapterNum}</div>
                <h1 class="chapter-title">${text}</h1>
                <div class="chapter-divider"></div>
            `;
            
            h1.replaceWith(wrapper);
        });

        // Also style h2s as section headers
        const h2s = element.querySelectorAll('h2');
        h2s.forEach(h2 => {
            h2.classList.add('section-header');
        });
    }

    /**
     * Clean up typography for book-like appearance
     */
    cleanupTypography(element) {
        // Fix common typography issues
        const textNodes = this.getTextNodes(element);
        
        textNodes.forEach(node => {
            let text = node.textContent;
            
            // Smart quotes
            text = text.replace(/"/g, '"').replace(/"/g, '"');
            text = text.replace(/'/g, "'").replace(/'/g, "'");
            
            // Em dashes
            text = text.replace(/--/g, '—');
            text = text.replace(/ - /g, ' — ');
            
            // Ellipsis
            text = text.replace(/\.\.\./g, '…');
            
            // Fix multiple spaces
            text = text.replace(/  +/g, ' ');
            
            node.textContent = text;
        });

        // Add proper spacing after punctuation
        const paragraphs = element.querySelectorAll('p');
        paragraphs.forEach(p => {
            p.style.textAlign = 'justify';
            p.style.hyphens = 'auto';
        });
    }

    /**
     * Get all text nodes in element
     */
    getTextNodes(element) {
        const nodes = [];
        const walker = document.createTreeWalker(
            element,
            NodeFilter.SHOW_TEXT,
            null,
            false
        );
        
        let node;
        while (node = walker.nextNode()) {
            if (node.textContent.trim()) {
                nodes.push(node);
            }
        }
        return nodes;
    }

    /**
     * Apply book styling CSS
     */
    applyBookStyles(element, fontChoice) {
        const font = this.bookFonts[fontChoice] || this.bookFonts.serif;
        
        // Create style element
        const style = document.createElement('style');
        style.textContent = `
            /* Book Mode Styles */
            .book-content {
                font-family: ${font.family};
                font-size: 11pt;
                line-height: 1.7;
                color: #1a1a1a;
                text-rendering: optimizeLegibility;
                -webkit-font-smoothing: antialiased;
            }

            /* Table of Contents */
            .book-toc {
                page-break-after: always;
                padding: 2em 0;
                margin-bottom: 2em;
            }
            .toc-title {
                font-size: 1.5em;
                text-align: center;
                margin-bottom: 1.5em;
                font-weight: normal;
                letter-spacing: 0.1em;
                text-transform: uppercase;
            }
            .toc-list {
                list-style: none;
                padding: 0;
                max-width: 80%;
                margin: 0 auto;
            }
            .toc-item {
                margin: 0.5em 0;
                display: flex;
                align-items: baseline;
            }
            .toc-item a {
                color: inherit;
                text-decoration: none;
                border-bottom: 1px dotted #999;
                flex: 1;
            }
            .toc-number {
                font-weight: bold;
                margin-right: 0.5em;
                min-width: 2em;
            }
            .toc-level-1 { font-weight: 600; font-size: 1.05em; }
            .toc-level-2 { padding-left: 1.5em; }
            .toc-level-3 { padding-left: 3em; font-size: 0.95em; color: #555; }

            /* Chapter Headers */
            .chapter-header {
                page-break-before: always;
                text-align: center;
                padding: 3em 0 2em 0;
                margin-bottom: 2em;
            }
            .chapter-header:first-of-type {
                page-break-before: auto;
            }
            .chapter-number {
                font-size: 0.85em;
                letter-spacing: 0.2em;
                text-transform: uppercase;
                color: #666;
                margin-bottom: 0.5em;
            }
            .chapter-title {
                font-size: 2em;
                font-weight: normal;
                margin: 0;
                line-height: 1.2;
            }
            .chapter-divider {
                width: 50px;
                height: 3px;
                background: linear-gradient(90deg, transparent, #333, transparent);
                margin: 1.5em auto 0;
            }

            /* Section Headers */
            .section-header {
                font-size: 1.3em;
                font-weight: 600;
                margin-top: 2em;
                margin-bottom: 1em;
                padding-bottom: 0.3em;
                border-bottom: 1px solid #ddd;
            }

            /* Drop Caps */
            .drop-cap {
                float: left;
                font-size: 4em;
                line-height: 0.8;
                padding-right: 0.1em;
                padding-top: 0.05em;
                font-weight: bold;
                color: #333;
            }
            .has-drop-cap {
                overflow: hidden;
            }

            /* Typography refinements */
            p {
                margin-bottom: 1em;
                text-indent: 1.5em;
            }
            p:first-of-type,
            .chapter-header + p,
            h2 + p, h3 + p, h4 + p,
            blockquote + p,
            .has-drop-cap {
                text-indent: 0;
            }

            /* Blockquotes */
            blockquote {
                font-style: italic;
                margin: 1.5em 2em;
                padding-left: 1em;
                border-left: 3px solid #ccc;
                color: #444;
            }

            /* Code blocks */
            pre {
                background: #f8f8f8;
                border: 1px solid #e0e0e0;
                border-radius: 4px;
                padding: 1em;
                font-size: 0.85em;
                overflow-x: auto;
                margin: 1.5em 0;
            }
            code {
                font-family: 'JetBrains Mono', Consolas, monospace;
                font-size: 0.9em;
            }
            p code, li code {
                background: #f0f0f0;
                padding: 0.15em 0.4em;
                border-radius: 3px;
            }

            /* Lists */
            ul, ol {
                margin: 1em 0;
                padding-left: 2em;
            }
            li {
                margin: 0.3em 0;
            }

            /* Images */
            img {
                max-width: 100%;
                height: auto;
                display: block;
                margin: 1.5em auto;
            }
            figure {
                margin: 2em 0;
                text-align: center;
            }
            figcaption {
                font-size: 0.9em;
                color: #666;
                font-style: italic;
                margin-top: 0.5em;
            }

            /* Tables */
            table {
                width: 100%;
                border-collapse: collapse;
                margin: 1.5em 0;
                font-size: 0.95em;
            }
            th, td {
                padding: 0.6em;
                border-bottom: 1px solid #ddd;
                text-align: left;
            }
            th {
                font-weight: 600;
                border-bottom: 2px solid #333;
            }

            /* Links */
            a {
                color: #0055aa;
                text-decoration: none;
            }

            /* Page numbers (for print) */
            @media print {
                @page {
                    margin: 2cm;
                    @bottom-center {
                        content: counter(page);
                    }
                }
            }
        `;
        
        element.insertBefore(style, element.firstChild);
        element.classList.add('book-content');
    }

    /**
     * Apply all book mode transformations
     */
    applyBookMode(element, options) {
        // Apply book styling
        this.applyBookStyles(element, options.bookFont || 'serif');
        
        // Clean up typography
        this.cleanupTypography(element);
        
        // Format chapter headers
        if (options.chapterHeaders !== false) {
            this.formatChapterHeaders(element);
        }
        
        // Generate and insert TOC
        if (options.generateToc !== false) {
            const toc = this.generateTableOfContents(element);
            if (toc) {
                // Insert after title or at beginning
                const firstHeading = element.querySelector('.chapter-header, h1, h2');
                if (firstHeading) {
                    firstHeading.parentNode.insertBefore(toc, firstHeading.nextSibling);
                } else {
                    element.insertBefore(toc, element.firstChild);
                }
            }
        }
        
        // Apply drop caps
        if (options.dropCaps !== false) {
            this.applyDropCaps(element);
        }
    }

    /**
     * Prepare content for PDF generation
     */
    prepareContent(sourceElement, options) {
        const clone = sourceElement.cloneNode(true);
        
        // Apply font scaling
        if (options.fontScale && options.fontScale !== 1) {
            this.applyFontScaling(clone, options.fontScale);
        }

        // Strip chrome if requested
        if (options.stripChrome) {
            this.stripChrome(clone);
        }

        // Apply syntax highlighting if requested
        if (options.syntaxHighlight) {
            this.applySyntaxHighlighting(clone);
        }

        // Apply book mode if enabled
        if (options.bookMode) {
            this.applyBookMode(clone, options);
        }

        // Add page break hints
        this.addPageBreakHints(clone);

        // Handle background
        if (!options.includeBackground) {
            clone.style.backgroundColor = 'white';
            const allElements = clone.querySelectorAll('*');
            allElements.forEach(el => {
                const style = window.getComputedStyle(el);
                if (style.backgroundImage !== 'none') {
                    el.style.backgroundImage = 'none';
                }
                if (style.backgroundColor !== 'rgba(0, 0, 0, 0)' && 
                    style.backgroundColor !== 'transparent') {
                    if (el.tagName === 'BODY' || el.tagName === 'HTML' || 
                        el.classList.contains('bg-') || 
                        el.getAttribute('class')?.includes('bg-')) {
                        el.style.backgroundColor = 'white';
                    }
                }
            });
        }

        clone.style.width = '100%';
        clone.style.maxWidth = 'none';
        clone.style.overflow = 'visible';

        return clone;
    }

    /**
     * Generate PDF from HTML element
     */
    async generatePDF(sourceElement, options) {
        return new Promise((resolve, reject) => {
            try {
                // Extract title if filename not provided
                if (!options.filename || options.filename === 'document.pdf') {
                    const title = this.extractTitle(sourceElement);
                    options.filename = `${title}.pdf`;
                }

                // Prepare content
                const preparedContent = this.prepareContent(sourceElement, options);

                // Get page dimensions
                const pageDims = this.getPageDimensions(
                    options.pageSize,
                    options.customWidth,
                    options.customHeight
                );

                // Calculate content width
                const dpi = 96;
                const mmToInch = 0.0393701;
                const marginH = (parseFloat(options.marginLeft) || 10) + (parseFloat(options.marginRight) || 10);
                const contentWidthMm = pageDims.width - marginH;
                const contentWidthPx = contentWidthMm * mmToInch * dpi;

                // Configure html2pdf options
                const opt = {
                    margin: [
                        parseFloat(options.marginTop) || 10,
                        parseFloat(options.marginRight) || 10,
                        parseFloat(options.marginBottom) || 10,
                        parseFloat(options.marginLeft) || 10
                    ],
                    filename: options.filename,
                    image: { 
                        type: 'jpeg', 
                        quality: 0.95 
                    },
                    html2canvas: {
                        scale: 2,
                        useCORS: true,
                        logging: false,
                        letterRendering: true,
                        allowTaint: true,
                        backgroundColor: options.includeBackground ? null : '#ffffff',
                        scrollX: 0,
                        scrollY: 0,
                        windowWidth: contentWidthPx * 2,
                    },
                    jsPDF: {
                        unit: pageDims.unit,
                        format: [pageDims.width, pageDims.height],
                        orientation: pageDims.height > pageDims.width ? 'portrait' : 'landscape',
                        compress: true,
                        putOnlyUsedFonts: true
                    },
                    pagebreak: { 
                        mode: ['avoid-all', 'css', 'legacy'],
                        before: '.page-break-before, .chapter-header',
                        after: '.page-break-after, .book-toc',
                        avoid: ['pre', 'code', 'table', 'img', 'figure', 'blockquote', 'tr']
                    },
                    enableLinks: true
                };

                // Generate PDF
                html2pdf()
                    .set(opt)
                    .from(preparedContent)
                    .save()
                    .then(() => {
                        resolve();
                    })
                    .catch((error) => {
                        reject(error);
                    });

            } catch (error) {
                reject(error);
            }
        });
    }
}

// Export for use in other scripts
window.PdfEngine = PdfEngine;
