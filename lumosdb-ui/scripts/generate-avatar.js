#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { createCanvas } = require('canvas');

// Create a default avatar
const size = 200;
const canvas = createCanvas(size, size);
const ctx = canvas.getContext('2d');

// Background circle
ctx.fillStyle = '#e2e8f0'; // Slate-200
ctx.beginPath();
ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
ctx.fill();

// User silhouette
ctx.fillStyle = '#94a3b8'; // Slate-400
// Head
const headSize = size * 0.35;
ctx.beginPath();
ctx.arc(size / 2, size / 2 - headSize * 0.1, headSize, 0, Math.PI * 2);
ctx.fill();

// Body
ctx.beginPath();
ctx.moveTo(size / 2 - headSize, size / 2 + headSize * 0.8);
ctx.quadraticCurveTo(
  size / 2, 
  size * 1.2, 
  size / 2 + headSize, 
  size / 2 + headSize * 0.8
);
ctx.fill();

// Save as PNG
const publicDir = path.join(__dirname, '../public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

const buffer = canvas.toBuffer('image/png');
fs.writeFileSync(path.join(publicDir, 'avatar.png'), buffer);

console.log('Default avatar generated successfully!'); 