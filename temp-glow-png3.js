import sharp from 'sharp';
import fs from 'fs';

async function generateGlow() {
  try {
    const inputPath = 'client/public/streamvault-logo.png';
    const outputPath = 'client/public/streamvault-logo-glow.png';

    const originalBuffer = fs.readFileSync(inputPath);
    const metadata = await sharp(originalBuffer).metadata();
    
    // Create PNG buffer instead of raw
    const maskBuffer = await sharp(originalBuffer)
      .extractChannel('alpha')
      .png()
      .toBuffer();

    const padding = 50;
    const w = metadata.width;
    const h = metadata.height;

    const silhouette = await sharp({
      create: {
        width: w,
        height: h,
        channels: 4,
        background: { r: 229, g: 9, b: 20, alpha: 1 }
      }
    })
      .joinChannel(await sharp(originalBuffer).extractChannel('alpha').toBuffer())
      .extend({
        top: padding, bottom: padding, left: padding, right: padding,
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .blur(20)
      .png()
      .toBuffer();

    await sharp(silhouette)
      .composite([{
        input: await sharp(originalBuffer).png().toBuffer(),
        top: padding,
        left: padding
      }])
      .png()
      .toFile(outputPath);
      
    console.log("SUCCESS");
  } catch(e) {
    console.error(e);
  }
}
generateGlow();
