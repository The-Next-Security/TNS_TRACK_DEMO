/**
 * PDF Generator Service
 * Feature: 004-reportes-base-core (T014)
 *
 * Generates PDF files from HTML content using Puppeteer
 * Manages browser pool for memory efficiency
 */

const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');
const configLoader = require('../../config/js_files/configLoader_Config');

// Configuración leída en primer uso (no en carga del módulo)
let _maxBrowserInstances = null;
let _pdfTimeoutMs = null;
function _getPdfConfig() {
  if (_pdfTimeoutMs == null) {
    const raw = configLoader.getValue('reports_module_config');
    _maxBrowserInstances = (raw?.max_concurrent_reports) || 3;
    _pdfTimeoutMs = ((raw?.pdf_generation_timeout) || 60) * 1000;
  }
  return { maxInstances: _maxBrowserInstances, timeoutMs: _pdfTimeoutMs };
}

// Browser pool management
class BrowserPool {
  constructor() {
    this.browsers = [];
    this.availableBrowsers = [];
    this.maxInstances = 3; // actualizado en getBrowser() si hace falta
  }

  async getBrowser() {
    const { maxInstances } = _getPdfConfig();
    this.maxInstances = maxInstances;
    // Return available browser if exists
    if (this.availableBrowsers.length > 0) {
      return this.availableBrowsers.pop();
    }

    // Create new browser if under limit
    if (this.browsers.length < this.maxInstances) {
      console.log(`[PDFGenerator] Launching new browser instance (${this.browsers.length + 1}/${this.maxInstances})`);
      const browser = await puppeteer.launch({
        headless: 'new',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu'
        ]
      });
      this.browsers.push(browser);
      return browser;
    }

    // Wait for available browser
    console.log('[PDFGenerator] All browsers busy, waiting for available instance...');
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (this.availableBrowsers.length > 0) {
          clearInterval(checkInterval);
          resolve(this.availableBrowsers.pop());
        }
      }, 500);
    });
  }

  releaseBrowser(browser) {
    if (!this.availableBrowsers.includes(browser)) {
      this.availableBrowsers.push(browser);
    }
  }

  async closeAll() {
    console.log(`[PDFGenerator] Closing all ${this.browsers.length} browser instances...`);
    for (const browser of this.browsers) {
      try {
        await browser.close();
      } catch (error) {
        console.error('[PDFGenerator] Error closing browser:', error.message);
      }
    }
    this.browsers = [];
    this.availableBrowsers = [];
  }
}

// Singleton browser pool
const browserPool = new BrowserPool();

/**
 * Generate PDF from HTML content
 *
 * @param {string} htmlContent - Complete HTML content to convert
 * @param {string} outputPath - Absolute path where PDF should be saved
 * @param {Object} options - PDF generation options
 * @returns {Promise<{success: boolean, filePath: string, fileSize: number}>}
 */
async function generatePDF(htmlContent, outputPath, options = {}) {
  const startTime = Date.now();
  let browser = null;

  try {
    // Ensure output directory exists
    const outputDir = path.dirname(outputPath);
    await fs.mkdir(outputDir, { recursive: true });

    // Get browser from pool
    browser = await browserPool.getBrowser();
    const page = await browser.newPage();

    // Set viewport for consistent rendering
    await page.setViewport({
      width: 1200,
      height: 800,
      deviceScaleFactor: 2
    });

    const { timeoutMs } = _getPdfConfig();
    page.setDefaultTimeout(timeoutMs);

    await page.setContent(htmlContent, {
      waitUntil: ['networkidle0', 'domcontentloaded'],
      timeout: timeoutMs
    });

    // PDF generation options
    const pdfOptions = {
      path: outputPath,
      format: options.format || 'A4',
      printBackground: true,
      margin: options.margin || {
        top: '20mm',
        right: '15mm',
        bottom: '20mm',
        left: '15mm'
      },
      ...options
    };

    // Generate PDF
    await page.pdf(pdfOptions);

    // Close page
    await page.close();

    // Release browser back to pool
    browserPool.releaseBrowser(browser);

    // Get file size
    const stats = await fs.stat(outputPath);
    const fileSizeBytes = stats.size;
    const fileSizeMB = (fileSizeBytes / (1024 * 1024)).toFixed(2);

    const duration = Date.now() - startTime;
    console.log(`[PDFGenerator] ✅ PDF generated successfully in ${(duration / 1000).toFixed(2)}s (${fileSizeMB}MB): ${outputPath}`);

    return {
      success: true,
      filePath: outputPath,
      fileSize: fileSizeBytes,
      durationMs: duration
    };

  } catch (error) {
    console.error('[PDFGenerator] ❌ Error generating PDF:', error.message);

    // Release browser on error
    if (browser) {
      browserPool.releaseBrowser(browser);
    }

    throw error;
  }
}

/**
 * Cleanup function to close all browsers on shutdown
 */
async function cleanup() {
  await browserPool.closeAll();
}

// Cleanup on process exit
process.on('SIGINT', async () => {
  await cleanup();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await cleanup();
  process.exit(0);
});

module.exports = {
  generatePDF,
  cleanup
};
