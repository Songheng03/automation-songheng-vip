const { createCanvas } = require('canvas');
const fs = require('fs');

try {
  // Try to use canvas library
  const canvas = createCanvas(1200, 630);
  const ctx = canvas.getContext('2d');
  
  // Dark background
  ctx.fillStyle = '#0d1117';
  ctx.fillRect(0, 0, 1200, 630);
  
  // Gradient accent bar
  const gradient = ctx.createLinearGradient(0, 0, 1200, 0);
  gradient.addColorStop(0, '#58a6ff');
  gradient.addColorStop(1, '#8250df');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 1200, 4);
  
  // Title
  ctx.fillStyle = '#c9d1d9';
  ctx.font = 'bold 64px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('AI Code Review', 600, 200);
  
  // Subtitle
  ctx.fillStyle = '#8b949e';
  ctx.font = '36px system-ui, -apple-system, sans-serif';
  ctx.fillText('Instant Security Scanning & Code Analysis', 600, 280);
  
  // Features
  ctx.fillStyle = '#58a6ff';
  ctx.font = '28px system-ui, -apple-system, sans-serif';
  ctx.fillText('7 AI Services • 50+ Free Tools • From $5', 600, 380);
  
  // Button
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.roundRect(400, 440, 400, 60, 30);
  ctx.fill();
  
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 24px system-ui, -apple-system, sans-serif';
  ctx.fillText('Try Free Now', 600, 478);
  
  // Footer
  ctx.fillStyle = '#484f58';
  ctx.font = '18px system-ui, -apple-system, sans-serif';
  ctx.fillText('automation.songheng.vip', 600, 580);
  
  // Save
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync('content/og-image.png', buffer);
  
  console.log('✓ Created professional og-image.png (1200x630)');
  console.log('File size:', (buffer.length / 1024).toFixed(1), 'KB');
  
} catch (e) {
  console.log('Canvas library not available:', e.message);
  console.log('Keeping placeholder og-image.png');
}
