import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DIST_DIR = path.resolve(__dirname, '../dist');
const BASE_URL = 'https://usbridge-technologies.github.io/Remote-Access-Feature-Matrix/';

function generateSitemap() {
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${BASE_URL}</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>`;

  fs.writeFileSync(path.join(DIST_DIR, 'sitemap.xml'), sitemap, 'utf8');
  console.log('Generated sitemap.xml');
}

function generateRobotsTxt() {
  const robots = `User-agent: *
Allow: /

Sitemap: ${BASE_URL}sitemap.xml`;

  fs.writeFileSync(path.join(DIST_DIR, 'robots.txt'), robots, 'utf8');
  console.log('Generated robots.txt');
}

if (fs.existsSync(DIST_DIR)) {
  generateSitemap();
  generateRobotsTxt();
} else {
  console.warn('dist directory not found, skipping sitemap generation.');
}
