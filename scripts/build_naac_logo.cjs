const fs = require('fs');
const { execSync } = require('child_process');

const width = 600;
const height = 480;

// Generate Laurel wreath leaves
function generateLaurelBranch(isRight = false) {
  const leaves = [];
  const count = 12;
  const cx = 300;
  const cy = 180;
  const rx = 150;
  const ry = 135;

  for (let i = 0; i < count; i++) {
    const t = 0.40 + (i / (count - 1)) * 1.05; // radians from horizontal
    const angle = isRight ? (Math.PI / 2 - t) : (Math.PI / 2 + t);
    const x = cx + Math.cos(angle) * rx;
    const y = cy + Math.sin(angle) * ry;

    const rotDeg = isRight ? (angle * 180 / Math.PI - 90 + 35) : (angle * 180 / Math.PI - 90 - 35);
    const scale = 0.85 + 0.35 * Math.sin((i / count) * Math.PI);

    // Leaf
    leaves.push(`
      <g transform="translate(${x.toFixed(1)}, ${y.toFixed(1)}) rotate(${rotDeg.toFixed(1)}) scale(${scale.toFixed(2)})">
        <!-- Leaf body with gradient -->
        <path d="M 0,-26 C 14,-14 14,14 0,26 C -14,14 -14,-14 0,-26 Z" fill="url(#goldGrad)" stroke="#B87B05" stroke-width="0.8" />
        <!-- Leaf highlight center spine -->
        <path d="M 0,-24 C 6,-10 6,10 0,24 C 1,10 1,-10 0,-24 Z" fill="url(#goldLightGrad)" opacity="0.9" />
        <line x1="0" y1="-22" x2="0" y2="22" stroke="#B8860B" stroke-width="1.2" />
      </g>
    `);

    // Inner leaf
    if (i >= 1 && i < count - 1) {
      const innerX = cx + Math.cos(angle) * (rx - 30);
      const innerY = cy + Math.sin(angle) * (ry - 26);
      const innerRot = rotDeg + (isRight ? -25 : 25);
      leaves.push(`
        <g transform="translate(${innerX.toFixed(1)}, ${innerY.toFixed(1)}) rotate(${innerRot.toFixed(1)}) scale(${(scale * 0.75).toFixed(2)})">
          <path d="M 0,-22 C 12,-11 12,11 0,22 C -12,11 -12,-11 0,-22 Z" fill="url(#goldGrad)" stroke="#B87B05" stroke-width="0.7" />
          <path d="M 0,-20 C 5,-8 5,8 0,20 C 1,8 1,-8 0,-20 Z" fill="#FFF8C4" opacity="0.8" />
        </g>
      `);
    }
  }
  return leaves.join('\n');
}

const leftLeaves = generateLaurelBranch(false);
const rightLeaves = generateLaurelBranch(true);

const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <defs>
    <!-- Rich Golden Gradient -->
    <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFF2A3" />
      <stop offset="25%" stop-color="#FCD438" />
      <stop offset="65%" stop-color="#E59E0B" />
      <stop offset="100%" stop-color="#B87303" />
    </linearGradient>

    <!-- Bright Gold Highlight -->
    <linearGradient id="goldLightGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#FFFFFF" />
      <stop offset="40%" stop-color="#FFF099" />
      <stop offset="100%" stop-color="#F5BA16" />
    </linearGradient>

    <!-- 3D Shadow Bronze for Letter A Sides -->
    <linearGradient id="goldDark3D" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#C7870A" />
      <stop offset="50%" stop-color="#8C5702" />
      <stop offset="100%" stop-color="#5E3801" />
    </linearGradient>

    <!-- Deep Red Ribbon Gradient -->
    <linearGradient id="ribbonRed" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#E61A35" />
      <stop offset="25%" stop-color="#C7102A" />
      <stop offset="75%" stop-color="#A1081E" />
      <stop offset="100%" stop-color="#730312" />
    </linearGradient>

    <!-- Dark Ribbon Fold/Tails -->
    <linearGradient id="ribbonDark" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#780616" />
      <stop offset="100%" stop-color="#400109" />
    </linearGradient>
  </defs>

  <g id="naac-a-grade-badge">
    <!-- 1. LAUREL WREATH STEM ARCS -->
    <path d="M 180,265 C 130,220 135,130 185,80 C 215,50 255,40 280,45" fill="none" stroke="#D99B0F" stroke-width="4.5" stroke-linecap="round" />
    <path d="M 420,265 C 470,220 465,130 415,80 C 385,50 345,40 320,45" fill="none" stroke="#D99B0F" stroke-width="4.5" stroke-linecap="round" />

    <!-- 2. LAUREL WREATH LEAVES -->
    <g id="wreath-leaves">
      ${leftLeaves}
      ${rightLeaves}
    </g>

    <!-- 3. CENTRAL 3D GOLDEN LETTER 'A' -->
    <!-- Drawn cleanly with exact geometry: Apex (300, 60), Left foot (235, 215), Right foot (365, 215) -->
    <g id="golden-letter-a">
      <!-- 3D Extrusion Side Blocks (Offset by +12px X, +8px Y for prominent 3D bevel) -->
      <!-- Left leg right inner side -->
      <polygon points="295,95 307,103 293,153 281,145" fill="#7A4B02" />
      <!-- Right leg outer right side -->
      <polygon points="305,60 317,68 377,223 365,215" fill="url(#goldDark3D)" />
      <!-- Left leg left side -->
      <polygon points="295,60 285,60 223,215 235,215" fill="#5E3801" />
      <!-- Right foot bottom thickness -->
      <polygon points="340,215 352,223 377,223 365,215" fill="#4A2B00" />
      <!-- Left foot bottom thickness -->
      <polygon points="212,215 224,223 248,223 236,215" fill="#4A2B00" />
      <!-- Crossbar 3D thickness -->
      <polygon points="260,165 272,173 328,173 316,165" fill="#7A4B02" />

      <!-- Front Face of 3D Golden Letter A -->
      <!-- Left Leg (flared serif foot) -->
      <polygon points="295,60 300,60 258,215 220,215 220,205 240,205 285,60" fill="url(#goldGrad)" stroke="#B87B05" stroke-width="1" />
      <!-- Right Leg (flared serif foot) -->
      <polygon points="305,60 300,60 342,215 380,215 380,205 360,205 315,60" fill="url(#goldGrad)" stroke="#B87B05" stroke-width="1" />
      <!-- Top apex cross -->
      <polygon points="280,60 320,60 310,75 290,75" fill="url(#goldLightGrad)" />
      <!-- Crossbar -->
      <polygon points="252,148 348,148 342,165 258,165" fill="url(#goldGrad)" stroke="#B87B05" stroke-width="0.8" />

      <!-- Inner Triangular Cutout -->
      <polygon points="300,100 274,148 326,148" fill="#FFFFFF" opacity="0.0" />

      <!-- Highlights on Face -->
      <!-- Left leg shine -->
      <polygon points="288,68 296,68 256,205 248,205" fill="#FFFFFF" opacity="0.45" />
      <!-- Crossbar shine -->
      <rect x="262" y="150" width="76" height="5" fill="#FFFFFF" opacity="0.5" />
      <!-- Apex shine -->
      <polygon points="292,62 308,62 305,70 295,70" fill="#FFFFFF" opacity="0.8" />
    </g>

    <!-- 4. TEXT 'GRADE' DIRECTLY UNDER 'A' -->
    <g id="grade-text">
      <text x="300" y="254" 
            text-anchor="middle" 
            font-family="'Arial Black', 'Helvetica Black', sans-serif" 
            font-size="28" 
            font-weight="900" 
            letter-spacing="5" 
            fill="#111827">GRADE</text>
    </g>

    <!-- 5. HORIZONTAL RED BANNER RIBBON ('ACCREDITED BY') -->
    <g id="ribbon-banner">
      <!-- Left Tail (Swallowtail ribbon behind) -->
      <path d="M 60,336 L 125,326 L 125,376 L 60,366 L 85,351 Z" fill="url(#ribbonDark)" stroke="#4A020B" stroke-width="1" />
      <!-- Right Tail (Swallowtail ribbon behind) -->
      <path d="M 540,336 L 475,326 L 475,376 L 540,366 L 515,351 Z" fill="url(#ribbonDark)" stroke="#4A020B" stroke-width="1" />

      <!-- Fold Under-Shadows -->
      <polygon points="120,368 145,368 145,385" fill="#3D0108" />
      <polygon points="480,368 455,368 455,385" fill="#3D0108" />

      <!-- Main Center Arched Banner -->
      <path d="M 125,308 
               Q 300,292 475,308 
               L 470,368 
               Q 300,352 130,368 
               Z" 
            fill="url(#ribbonRed)" 
            stroke="#8A0615" 
            stroke-width="1.8" />

      <!-- Top Edge Light Line -->
      <path d="M 128,311 Q 300,295 472,311" fill="none" stroke="#FF9AA7" stroke-width="1.8" opacity="0.75" />
      <!-- Bottom Edge Shadow Line -->
      <path d="M 132,365 Q 300,349 468,365" fill="none" stroke="#52020B" stroke-width="1.8" opacity="0.8" />

      <!-- Ribbon Text: ACCREDITED BY -->
      <text x="300" y="346" 
            text-anchor="middle" 
            font-family="'Arial Black', Arial, Helvetica, sans-serif" 
            font-size="27" 
            font-weight="900" 
            letter-spacing="2.5" 
            fill="#FFFFFF">ACCREDITED BY</text>
    </g>

    <!-- 6. TEXT 'NAAC' CENTERED BELOW RIBBON -->
    <g id="naac-text">
      <!-- Dark Maroon Bold Capital Letters -->
      <text x="300" y="440" 
            text-anchor="middle" 
            font-family="'Arial Black', 'Impact', sans-serif" 
            font-size="52" 
            font-weight="900" 
            letter-spacing="9" 
            fill="#8B0000">NAAC</text>
    </g>
  </g>
</svg>
`;

fs.writeFileSync('public/assets/naac_logo.svg', svgContent, 'utf8');

console.log('Rendering high-resolution NAAC A Grade PNG with ffmpeg...');
execSync('ffmpeg -y -i public/assets/naac_logo.svg -vf "scale=600:480" public/assets/naac_logo.png');

const pngBuffer = fs.readFileSync('public/assets/naac_logo.png');
console.log('Generated PNG size:', pngBuffer.length, 'bytes');

const base64Png = 'data:image/png;base64,' + pngBuffer.toString('base64');
const tsContent = '// Official NAAC \'A\' Grade Accreditation Insignia Logo (Laurel Wreath, 3D Gold A, Red Ribbon, NAAC)\n' +
  'export const NAAC_LOGO_BASE64 =\n' +
  '  "' + base64Png + '";\n';

fs.writeFileSync('src/assets/naacLogoBase64.ts', tsContent, 'utf8');
console.log('Updated src/assets/naacLogoBase64.ts successfully!');
