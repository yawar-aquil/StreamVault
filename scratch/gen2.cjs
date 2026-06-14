const cx = 50;
const cy = 50;
const R = 44; 
const maxThickness = 4.5;
const numPoints = 120;
const angleSpan = 280;
const startAngle = -90; 

let path = `M ${cx} ${cy - R} `;

const endOuterAngle = startAngle - angleSpan;
const outerEndX = cx + R * Math.cos(endOuterAngle * Math.PI / 180);
const outerEndY = cy + R * Math.sin(endOuterAngle * Math.PI / 180);

path += `A ${R} ${R} 0 1 0 ${outerEndX} ${outerEndY} `;

for (let i = 0; i <= numPoints; i++) {
    const progress = i / numPoints;
    const currentAngle = endOuterAngle + progress * angleSpan;
    const currentThickness = maxThickness * progress;
    const currentR = R - currentThickness;
    const x = cx + currentR * Math.cos(currentAngle * Math.PI / 180);
    const y = cy + currentR * Math.sin(currentAngle * Math.PI / 180);
    path += `L ${x} ${y} `;
}

const capRadius = maxThickness / 2;
path += `A ${capRadius} ${capRadius} 0 0 1 ${cx} ${cy - R} Z`;

console.log(path);
