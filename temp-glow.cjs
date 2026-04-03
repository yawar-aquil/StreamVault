const fs = require('fs');
const imgBuf = fs.readFileSync('client/public/streamvault-logo.png');
const base64 = imgBuf.toString('base64');
const svg = `<svg width="200" height="200" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  <defs>
    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="10" result="blur" />
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
  <image href="data:image/png;base64,${base64}" x="15" y="15" width="170" height="170" filter="url(#glow)" />
</svg>`;
fs.writeFileSync('client/public/streamvault-logo-glow.svg', svg);
