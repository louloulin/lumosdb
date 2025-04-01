#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { createCanvas } = require('canvas');

// Define icon sizes from manifest.json
const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

// Create icons directory if it doesn't exist
const iconsDir = path.join(__dirname, '../public/icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Function to draw a database icon
function drawDatabaseIcon(ctx, width, height) {
  const centerX = width / 2;
  const dbWidth = width * 0.7;
  const dbHeight = height * 0.8;
  const topHeight = dbHeight * 0.3;
  
  // Background
  ctx.fillStyle = '#3b82f6'; // Primary blue color
  ctx.beginPath();
  ctx.arc(centerX, topHeight, dbWidth / 2, Math.PI, 0);
  ctx.lineTo(centerX + dbWidth / 2, dbHeight);
  ctx.arc(centerX, dbHeight, dbWidth / 2, 0, Math.PI);
  ctx.lineTo(centerX - dbWidth / 2, topHeight);
  ctx.fill();
  
  // Highlights
  ctx.fillStyle = '#60a5fa'; // Lighter blue
  ctx.beginPath();
  ctx.ellipse(centerX, topHeight, dbWidth / 2, topHeight / 2, 0, Math.PI, 0);
  ctx.fill();
  
  // Middle line decoration
  ctx.fillStyle = '#93c5fd'; // Even lighter blue
  ctx.beginPath();
  ctx.ellipse(centerX, dbHeight / 2, dbWidth / 2, topHeight / 3, 0, Math.PI, 0);
  ctx.fill();
  
  // Text "LDB"
  ctx.fillStyle = 'white';
  ctx.font = `bold ${width * 0.25}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('LDB', centerX, dbHeight / 1.8);
}

// Generate icons for each size
sizes.forEach(size => {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  
  // Clear canvas
  ctx.fillStyle = 'transparent';
  ctx.fillRect(0, 0, size, size);
  
  // Draw database icon
  drawDatabaseIcon(ctx, size, size);
  
  // Save as PNG
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(path.join(iconsDir, `icon-${size}x${size}.png`), buffer);
  
  console.log(`Generated icon-${size}x${size}.png`);
});

// Also create shortcut icons
const shortcutIcons = [
  { name: 'sql-editor', color: '#f59e0b' }, // Amber
  { name: 'vectors', color: '#10b981' }     // Emerald
];

shortcutIcons.forEach(icon => {
  const size = 192;
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  
  // Background circle
  ctx.fillStyle = icon.color;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
  ctx.fill();
  
  // Draw simplified icon based on type
  ctx.fillStyle = 'white';
  if (icon.name === 'sql-editor') {
    // SQL icon: { }
    ctx.font = `bold ${size * 0.5}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('{ }', size / 2, size / 2);
  } else if (icon.name === 'vectors') {
    // Vector icon: grid of dots
    const dotSize = size * 0.12;
    const spacing = size * 0.25;
    const offset = size * 0.25;
    
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        ctx.beginPath();
        ctx.arc(offset + i * spacing, offset + j * spacing, dotSize, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  
  // Save as PNG
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(path.join(iconsDir, `${icon.name}.png`), buffer);
  
  console.log(`Generated ${icon.name}.png`);
});

console.log('All icons generated successfully!'); 