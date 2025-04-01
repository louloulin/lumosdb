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

// Create a sample desktop screenshot SVG
const createDesktopScreenshot = () => {
  const svg = `<svg width="1280" height="800" viewBox="0 0 1280 800" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="1280" height="800" fill="#0f172a"/>
    <!-- Header -->
    <rect width="1280" height="60" fill="#1e293b"/>
    <rect x="20" y="20" width="200" height="20" rx="4" fill="#6366f1"/>
    <rect x="1080" y="20" width="40" height="20" rx="4" fill="#475569"/>
    <rect x="1140" y="20" width="40" height="20" rx="4" fill="#475569"/>
    <rect x="1200" y="20" width="40" height="20" rx="4" fill="#475569"/>
    
    <!-- Sidebar -->
    <rect width="240" height="740" y="60" fill="#1e293b"/>
    <rect x="20" y="100" width="200" height="30" rx="4" fill="#3e4c5e"/>
    <rect x="20" y="150" width="200" height="30" rx="4" fill="#2e3a4d"/>
    <rect x="20" y="200" width="200" height="30" rx="4" fill="#2e3a4d"/>
    <rect x="20" y="250" width="200" height="30" rx="4" fill="#2e3a4d"/>
    <rect x="20" y="300" width="200" height="30" rx="4" fill="#2e3a4d"/>
    <rect x="20" y="350" width="200" height="30" rx="4" fill="#2e3a4d"/>
    
    <!-- Main Content -->
    <rect x="260" y="80" width="1000" height="40" rx="4" fill="#1e293b"/>
    <rect x="260" y="140" width="480" height="300" rx="8" fill="#1e293b"/>
    <rect x="280" y="160" width="440" height="20" rx="4" fill="#475569"/>
    <rect x="280" y="200" width="440" height="160" rx="4" fill="#0f172a"/>
    <rect x="280" y="380" width="80" height="30" rx="4" fill="#6366f1"/>
    
    <rect x="760" y="140" width="480" height="300" rx="8" fill="#1e293b"/>
    <rect x="780" y="160" width="440" height="20" rx="4" fill="#475569"/>
    <rect x="780" y="200" width="440" height="160" rx="4" fill="#0f172a"/>
    <rect x="780" y="380" width="80" height="30" rx="4" fill="#6366f1"/>
    
    <rect x="260" y="460" width="980" height="280" rx="8" fill="#1e293b"/>
    <rect x="280" y="480" width="940" height="240" rx="4" fill="#0f172a"/>
    <circle cx="300" cy="500" r="10" fill="#6366f1"/>
    <rect x="320" y="495" width="200" height="10" rx="2" fill="#475569"/>
    <circle cx="300" cy="540" r="10" fill="#6366f1"/>
    <rect x="320" y="535" width="300" height="10" rx="2" fill="#475569"/>
    <circle cx="300" cy="580" r="10" fill="#6366f1"/>
    <rect x="320" y="575" width="250" height="10" rx="2" fill="#475569"/>
    <circle cx="300" cy="620" r="10" fill="#6366f1"/>
    <rect x="320" y="615" width="280" height="10" rx="2" fill="#475569"/>
    <circle cx="300" cy="660" r="10" fill="#6366f1"/>
    <rect x="320" y="655" width="320" height="10" rx="2" fill="#475569"/>
    <circle cx="300" cy="700" r="10" fill="#6366f1"/>
    <rect x="320" y="695" width="270" height="10" rx="2" fill="#475569"/>
  </svg>`;
  
  fs.writeFileSync(path.join(screenshotsDir, 'desktop.svg'), svg);
  console.log(`Created desktop.svg`);
};

// Create a sample mobile screenshot SVG
const createMobileScreenshot = () => {
  const svg = `<svg width="390" height="844" viewBox="0 0 390 844" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="390" height="844" fill="#0f172a"/>
    <!-- Header -->
    <rect width="390" height="60" fill="#1e293b"/>
    <rect x="20" y="20" width="200" height="20" rx="4" fill="#6366f1"/>
    <rect x="340" y="20" width="30" height="20" rx="4" fill="#475569"/>
    
    <!-- Navigation Tabs -->
    <rect width="390" height="50" y="60" fill="#1e293b"/>
    <rect x="10" y="70" width="80" height="30" rx="4" fill="#3e4c5e"/>
    <rect x="100" y="70" width="80" height="30" rx="4" fill="#2e3a4d"/>
    <rect x="190" y="70" width="80" height="30" rx="4" fill="#2e3a4d"/>
    <rect x="280" y="70" width="80" height="30" rx="4" fill="#2e3a4d"/>
    
    <!-- Main Content -->
    <rect x="20" y="130" width="350" height="40" rx="4" fill="#1e293b"/>
    <rect x="20" y="190" width="350" height="200" rx="8" fill="#1e293b"/>
    <rect x="40" y="210" width="310" height="20" rx="4" fill="#475569"/>
    <rect x="40" y="250" width="310" height="100" rx="4" fill="#0f172a"/>
    <rect x="40" y="370" width="80" height="30" rx="4" fill="#6366f1"/>
    
    <rect x="20" y="410" width="350" height="200" rx="8" fill="#1e293b"/>
    <rect x="40" y="430" width="310" height="20" rx="4" fill="#475569"/>
    <rect x="40" y="470" width="310" height="100" rx="4" fill="#0f172a"/>
    <rect x="40" y="590" width="80" height="30" rx="4" fill="#6366f1"/>
    
    <rect x="20" y="630" width="350" height="190" rx="8" fill="#1e293b"/>
    <circle cx="50" cy="660" r="10" fill="#6366f1"/>
    <rect x="70" y="655" width="200" height="10" rx="2" fill="#475569"/>
    <circle cx="50" cy="700" r="10" fill="#6366f1"/>
    <rect x="70" y="695" width="250" height="10" rx="2" fill="#475569"/>
    <circle cx="50" cy="740" r="10" fill="#6366f1"/>
    <rect x="70" y="735" width="220" height="10" rx="2" fill="#475569"/>
    <circle cx="50" cy="780" r="10" fill="#6366f1"/>
    <rect x="70" y="775" width="270" height="10" rx="2" fill="#475569"/>
  </svg>`;
  
  fs.writeFileSync(path.join(screenshotsDir, 'mobile.svg'), svg);
  console.log(`Created mobile.svg`);
};

// Generate screenshots
generateDesktopScreenshot();
generateMobileScreenshot();
createDesktopScreenshot();
createMobileScreenshot();

console.log('All screenshots generated successfully!'); 