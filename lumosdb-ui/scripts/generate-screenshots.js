#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { createCanvas } = require('canvas');

// Create screenshots directory if it doesn't exist
const screenshotsDir = path.join(__dirname, '../public/screenshots');
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

// Generate desktop screenshot (1280x800)
function generateDesktopScreenshot() {
  const width = 1280;
  const height = 800;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  
  // Background
  ctx.fillStyle = '#0f172a'; // Dark background
  ctx.fillRect(0, 0, width, height);
  
  // Sidebar
  ctx.fillStyle = '#1e293b'; // Slightly lighter
  ctx.fillRect(0, 0, 240, height);
  
  // Header
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(240, 0, width - 240, 64);
  
  // Logo area
  ctx.fillStyle = '#3b82f6'; // Blue
  ctx.fillRect(20, 20, 200, 40);
  
  // Menu items in sidebar
  ctx.fillStyle = '#64748b';
  for (let i = 0; i < 6; i++) {
    ctx.fillRect(20, 100 + i * 50, 200, 35);
  }
  
  // Content area - create a grid of cards
  const cardWidth = 280;
  const cardHeight = 180;
  const startX = 280;
  const startY = 100;
  const cols = 3;
  const rows = 3;
  
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = startX + col * (cardWidth + 30);
      const y = startY + row * (cardHeight + 30);
      
      if (x + cardWidth < width && y + cardHeight < height) {
        // Card background
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(x, y, cardWidth, cardHeight);
        
        // Card header
        ctx.fillStyle = '#3b82f6';
        ctx.fillRect(x, y, cardWidth, 40);
        
        // Card content
        ctx.fillStyle = '#334155';
        ctx.fillRect(x + 15, y + 60, cardWidth - 30, 25);
        ctx.fillRect(x + 15, y + 100, cardWidth - 30, 25);
        ctx.fillRect(x + 15, y + 140, cardWidth - 90, 25);
      }
    }
  }

  // Save as PNG
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(path.join(screenshotsDir, 'desktop.png'), buffer);
  console.log('Generated desktop screenshot');
}

// Generate mobile screenshot (750x1334 - iPhone dimensions)
function generateMobileScreenshot() {
  const width = 750;
  const height = 1334;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  
  // Background
  ctx.fillStyle = '#0f172a'; // Dark background
  ctx.fillRect(0, 0, width, height);
  
  // Header
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(0, 0, width, 100);
  
  // Logo in header
  ctx.fillStyle = '#3b82f6'; // Blue
  ctx.fillRect(width / 2 - 100, 30, 200, 40);
  
  // Cards
  const cardWidth = width - 40;
  const cardHeight = 200;
  
  for (let i = 0; i < 5; i++) {
    const y = 120 + i * (cardHeight + 20);
    
    // Card background
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(20, y, cardWidth, cardHeight);
    
    // Card header
    ctx.fillStyle = '#3b82f6';
    ctx.fillRect(20, y, cardWidth, 50);
    
    // Card content
    ctx.fillStyle = '#334155';
    ctx.fillRect(40, y + 70, cardWidth - 80, 30);
    ctx.fillRect(40, y + 120, cardWidth - 80, 30);
    ctx.fillRect(40, y + 160, cardWidth - 200, 30);
  }
  
  // Bottom navigation
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(0, height - 80, width, 80);
  
  // Nav items
  ctx.fillStyle = '#64748b';
  const navItemWidth = width / 5;
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    ctx.arc(navItemWidth * i + navItemWidth / 2, height - 50, 15, 0, Math.PI * 2);
    ctx.fill();
  }

  // Save as PNG
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(path.join(screenshotsDir, 'mobile.png'), buffer);
  console.log('Generated mobile screenshot');
}

generateDesktopScreenshot();
generateMobileScreenshot();
console.log('All screenshots generated successfully!'); 