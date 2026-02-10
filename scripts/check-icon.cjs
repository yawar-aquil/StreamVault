
const fs = require('fs');
const path = require('path');

const iconPath = path.resolve(__dirname, '../client/public/icons/icon-alt.png');

try {
    const fd = fs.openSync(iconPath, 'r');
    const buffer = Buffer.alloc(24);
    fs.readSync(fd, buffer, 0, 24, 0);
    fs.closeSync(fd);

    // Check PNG signature
    if (buffer.toString('hex', 0, 8) !== '89504e470d0a1a0a') {
        console.error('Not a PNG file!');
        process.exit(1);
    }

    // Read IHDR chunk width and height (big endian)
    const width = buffer.readUInt32BE(16);
    const height = buffer.readUInt32BE(20);

    console.log(`Width: ${width}`);
    console.log(`Height: ${height}`);

    if (width !== 512 || height !== 512) {
        console.warn(`WARNING: Dimensions are not 512x512!`);
    } else {
        console.log('Dimensions are correct: 512x512');
    }

} catch (err) {
    console.error("Error reading file:", err);
}
