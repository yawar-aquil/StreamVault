import fs from 'fs';

const imgBuf = fs.readFileSync('client/public/streamvault-logo.png');
const base64 = imgBuf.toString('base64');
const svg = `<svg width="250" height="250" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  <defs>
    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="15" result="blur" />
      <feComponentTransfer in="blur" result="glow1">
          <feFuncA type="linear" slope="3"/>
      </feComponentTransfer>
      <feFlood flood-color="#E50914" flood-opacity="0.9" />
      <feComposite in2="glow1" operator="in" result="glow2" />
      <feMerge>
        <feMergeNode in="glow2" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
  </defs>
  <image href="data:image/png;base64,${base64}" x="35" y="35" width="180" height="180" filter="url(#glow)" />
</svg>`;
fs.writeFileSync('client/public/streamvault-logo-glow-first.svg', svg);
