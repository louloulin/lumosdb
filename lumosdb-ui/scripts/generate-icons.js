#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { createCanvas } = require('canvas');

// Create icons directory if it doesn't exist
const iconsDir = path.join(__dirname, '../public/icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Icon sizes needed
const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

// Generate icons for each size
sizes.forEach(size => {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  
  // Background
  ctx.fillStyle = '#6366f1'; // Indigo color
  ctx.beginPath();
  ctx.roundRect(0, 0, size, size, size * 0.2);
  ctx.fill();
  
  // Database icon
  ctx.fillStyle = '#0f172a'; // Dark blue
  ctx.strokeStyle = 'white';
  ctx.lineWidth = size * 0.03;
  
  // Draw database shape
  ctx.beginPath();
  ctx.moveTo(size * 0.25, size * 0.35);
  ctx.lineTo(size * 0.4, size * 0.25);
  ctx.lineTo(size * 0.75, size * 0.25);
  ctx.lineTo(size * 0.75, size * 0.75);
  ctx.lineTo(size * 0.25, size * 0.75);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  
  // Circle detail
  ctx.fillStyle = 'white';
  ctx.beginPath();
  ctx.arc(size * 0.6, size * 0.4, size * 0.1, 0, Math.PI * 2);
  ctx.fill();
  
  // Rectangle detail
  ctx.beginPath();
  ctx.roundRect(size * 0.3, size * 0.55, size * 0.4, size * 0.1, size * 0.05);
  ctx.fill();
  
  // Save as PNG
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(path.join(iconsDir, `icon-${size}x${size}.png`), buffer);
  console.log(`Created icon-${size}x${size}.png`);
});

// Create shortcut icons
const shortcutIcons = [
  { name: 'sql-editor', color: '#60a5fa' }, // Blue
  { name: 'vectors', color: '#8b5cf6' }     // Purple
];

// Generate shortcut icons
shortcutIcons.forEach(icon => {
  const size = 96;
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  
  // Background
  ctx.fillStyle = icon.color;
  ctx.beginPath();
  ctx.roundRect(0, 0, size, size, 20);
  ctx.fill();
  
  if (icon.name === 'sql-editor') {
    // SQL Editor icon
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 3;
    
    // Document shape
    ctx.beginPath();
    ctx.moveTo(20, 40);
    ctx.lineTo(40, 25);
    ctx.lineTo(60, 25);
    ctx.lineTo(60, 75);
    ctx.lineTo(20, 75);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    
    // Lines of code
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.roundRect(30, 38, 30, 6, 3);
    ctx.fill();
    
    ctx.beginPath();
    ctx.roundRect(30, 50, 20, 6, 3);
    ctx.fill();
    
    ctx.beginPath();
    ctx.roundRect(30, 62, 25, 6, 3);
    ctx.fill();
  } else if (icon.name === 'vectors') {
    // Vector icon
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 3;
    
    // Nodes
    ctx.beginPath();
    ctx.arc(35, 35, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    
    ctx.beginPath();
    ctx.arc(65, 35, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    
    ctx.beginPath();
    ctx.arc(50, 65, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    
    // Connections
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2;
    
    ctx.beginPath();
    ctx.moveTo(35, 35);
    ctx.lineTo(65, 35);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(35, 35);
    ctx.lineTo(50, 65);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(65, 35);
    ctx.lineTo(50, 65);
    ctx.stroke();
  }
  
  // Save as PNG
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(path.join(iconsDir, `${icon.name}.png`), buffer);
  console.log(`Created ${icon.name}.png`);
});

console.log('All icons generated successfully!');