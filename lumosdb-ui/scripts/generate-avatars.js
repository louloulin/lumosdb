const fs = require('fs');
const path = require('path');

// Ensure public directory exists
const publicDir = path.join(__dirname, '../public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Create a simple avatar SVG
const createAvatar = (filename) => {
  const svg = `<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="40" height="40" rx="20" fill="#0f172a"/>
    <circle cx="20" cy="16" r="7" fill="#6366f1"/>
    <path d="M32 36C32 29.3726 26.6274 24 20 24C13.3726 24 8 29.3726 8 36" stroke="#6366f1" stroke-width="4"/>
  </svg>`;
  
  fs.writeFileSync(path.join(publicDir, filename), svg);
  console.log(`Created ${filename}`);
};

// Generate avatar
createAvatar('avatar.svg');

console.log('Avatar generated successfully!'); 