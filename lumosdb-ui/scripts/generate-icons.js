#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Create icons directory if it doesn't exist
const iconsDir = path.join(__dirname, '../public/icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Icon sizes needed
const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

// Generate SVG icon for each size
sizes.forEach(size => {
  const svg = `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="${size}" height="${size}" rx="${size * 0.2}" fill="#6366f1"/>
    <path d="M${size * 0.25} ${size * 0.35}L${size * 0.4} ${size * 0.25}L${size * 0.75} ${size * 0.25}L${size * 0.75} ${size * 0.75}L${size * 0.25} ${size * 0.75}Z" fill="#0f172a" stroke="white" stroke-width="${size * 0.03}"/>
    <circle cx="${size * 0.6}" cy="${size * 0.4}" r="${size * 0.1}" fill="white"/>
    <rect x="${size * 0.3}" y="${size * 0.55}" width="${size * 0.4}" height="${size * 0.1}" rx="${size * 0.05}" fill="white"/>
  </svg>`;
  
  fs.writeFileSync(path.join(iconsDir, `icon-${size}x${size}.svg`), svg);
  console.log(`Created icon-${size}x${size}.svg`);
});

// Create shortcut icons
const shortcutIcons = [
  {
    name: 'sql-editor.svg',
    color: '#60a5fa',
    symbol: `<path d="M20 40L40 25L60 25L60 75L20 75Z" fill="#0f172a" stroke="white" stroke-width="3"/>
      <rect x="30" y="38" width="30" height="6" rx="3" fill="white"/>
      <rect x="30" y="50" width="20" height="6" rx="3" fill="white"/>
      <rect x="30" y="62" width="25" height="6" rx="3" fill="white"/>`
  },
  {
    name: 'vectors.svg',
    color: '#8b5cf6',
    symbol: `<circle cx="35" cy="35" r="15" fill="#0f172a" stroke="white" stroke-width="3"/>
      <circle cx="65" cy="35" r="10" fill="#0f172a" stroke="white" stroke-width="3"/>
      <circle cx="50" cy="65" r="12" fill="#0f172a" stroke="white" stroke-width="3"/>
      <line x1="35" y1="35" x2="65" y2="35" stroke="white" stroke-width="2"/>
      <line x1="35" y1="35" x2="50" y2="65" stroke="white" stroke-width="2"/>
      <line x1="65" y1="35" x2="50" y2="65" stroke="white" stroke-width="2"/>`
  }
];

// Generate shortcut icons
shortcutIcons.forEach(icon => {
  const svg = `<svg width="96" height="96" viewBox="0 0 96 96" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="96" height="96" rx="20" fill="${icon.color}"/>
    ${icon.symbol}
  </svg>`;
  
  fs.writeFileSync(path.join(iconsDir, icon.name), svg);
  console.log(`Created ${icon.name}`);
});

console.log('All icons generated successfully!');