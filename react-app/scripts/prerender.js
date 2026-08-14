import puppeteer from 'puppeteer';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 4173;
const DIST_DIR = path.resolve(__dirname, '../dist');
const BASE_PATH = '/Remote-Access-Feature-Matrix/';

async function prerender() {
  if (!fs.existsSync(DIST_DIR)) {
    console.error('dist directory not found. Please build the project first.');
    process.exit(1);
  }

  const app = express();
  
  // Serve static files from dist at the correct base path
  app.use(BASE_PATH, express.static(DIST_DIR));
  
  // Redirect root to base path
  app.get('/', (req, res) => res.redirect(BASE_PATH));
  
  // Fallback for SPA routing
  app.use((req, res) => {
    res.sendFile(path.join(DIST_DIR, 'index.html'));
  });

  const server = app.listen(PORT, async () => {
    console.log(`Server started on port ${PORT}`);
    
    try {
      const browser = await puppeteer.launch({ 
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      const page = await browser.newPage();
      
      console.log('Navigating to local server...');
      await page.goto(`http://localhost:${PORT}${BASE_PATH}`, { waitUntil: 'networkidle0' });
      
      console.log('Waiting for React to render...');
      // Wait for table to load
      await page.waitForSelector('.table-container', { timeout: 10000 });
      // Wait an extra moment to ensure JSON-LD and tooltips are fully rendered
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      console.log('Capturing HTML...');
      const html = await page.evaluate(() => {
        // Find and remove script tags that shouldn't be in the static HTML 
        // Note: We keep the application/ld+json script
        document.querySelectorAll('script:not([type="application/ld+json"])').forEach(s => {
          // keep the vite module scripts so hydration works
          if (!s.src.includes('assets/')) {
             // s.remove();
          }
        });
        return '<!DOCTYPE html>\n' + document.documentElement.outerHTML;
      });
      
      fs.writeFileSync(path.join(DIST_DIR, 'index.html'), html);
      console.log('Prerendered index.html successfully!');
      
      await browser.close();
    } catch (err) {
      console.error('Error during prerendering:', err);
      process.exit(1);
    } finally {
      server.close();
    }
  });
}

prerender();
