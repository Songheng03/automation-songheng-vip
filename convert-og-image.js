const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

(async () => {
  const svgPath = path.join(__dirname, 'content/og-image.svg');
  const pngPath = path.join(__dirname, 'content/og-image.png');
  
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  // Set viewport to match OG image dimensions
  await page.setViewport({ width: 1200, height: 630 });
  
  // Load the SVG file
  const svgContent = fs.readFileSync(svgPath, 'utf8');
  await page.setContent(`
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { margin: 0; padding: 0; }
        svg { display: block; }
      </style>
    </head>
    <body>${svgContent}</body>
    </html>
  `);
  
  // Screenshot
  await page.screenshot({
    path: pngPath,
    type: 'png',
    clip: { x: 0, y: 0, width: 1200, height: 630 }
  });
  
  await browser.close();
  
  console.log('✓ Created og-image.png (1200x630)');
  console.log('File size:', (fs.statSync(pngPath).size / 1024).toFixed(1), 'KB');
})();
