const fs = require('fs');

const cx = 50;
const cy = 50;
const R = 40; // Outer radius
const maxThickness = 6;
const numPoints = 100;
const angleSpan = 270; // 270 degrees of arc

// Start at top (90 degrees mathematically, but in SVG Y goes down, so -90 degrees)
const startAngle = -90; 

let path = `M ${cx} ${cy - R} `;

// Draw the outer arc (perfect circle)
// 270 degrees is more than 180, so large-arc-flag = 1
const endOuterAngle = startAngle - angleSpan; // Counter-clockwise drawing
const outerEndX = cx + R * Math.cos(endOuterAngle * Math.PI / 180);
const outerEndY = cy + R * Math.sin(endOuterAngle * Math.PI / 180);

path += `A ${R} ${R} 0 1 0 ${outerEndX} ${outerEndY} `;

// Now draw the inner arc by generating points and using lines/curves.
// We go backwards from endOuterAngle to startAngle.
for (let i = 0; i <= numPoints; i++) {
    // i=0 is the tail (thickness 0)
    // i=numPoints is the head (thickness maxThickness)
    const progress = i / numPoints;
    const currentAngle = endOuterAngle + progress * angleSpan;
    // Tapering thickness: 0 at the tail, maxThickness at the head
    const currentThickness = maxThickness * progress;
    const currentR = R - currentThickness;
    
    const x = cx + currentR * Math.cos(currentAngle * Math.PI / 180);
    const y = cy + currentR * Math.sin(currentAngle * Math.PI / 180);
    
    if (i === 0) {
        path += `L ${x} ${y} `;
    } else {
        path += `L ${x} ${y} `;
    }
}

// Draw the rounded cap at the head
// The inner arc ended at (cx, cy - R + maxThickness).
// The outer arc started at (cx, cy - R).
// We draw a semi-circle connecting them.
const capRadius = maxThickness / 2;
path += `A ${capRadius} ${capRadius} 0 0 1 ${cx} ${cy - R} Z`;

fs.writeFileSync('scratch/comet.html', `<svg viewBox="0 0 100 100" width="100" height="100" style="background:black;"><path d="${path}" fill="#e50914" /></svg>`);
console.log(path);
