import sharp from 'sharp';
import fs from 'fs';

async function generateGlow() {
  try {
    const inputPath = 'client/public/streamvault-logo.png';
    const outputPath = 'client/public/streamvault-logo-glow.png';

    const originalBuffer = fs.readFileSync(inputPath);
    const metadata = await sharp(originalBuffer).metadata();
    
    const maskBuffer = await sharp(originalBuffer)
      .extractChannel('alpha')
      .toBuffer();

    const padding = 60;
    const w = metadata.width;
    const h = metadata.height;

    // Create the red body perfectly masked by the alpha channel
    const silhouette = await sharp({
      create: {
        width: w,
        height: h,
        channels: 4,
        background: { r: 229, g: 9, b: 20, alpha: 1 }
      }
    })
      .joinChannel(maskBuffer)
      .extend({
        top: padding, bottom: padding, left: padding, right: padding,
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .blur(20)
      .toBuffer();

    // The output composited with the exact buffer
    await sharp(silhouette)
      .composite([{
        input: await sharp(originalBuffer).toBuffer(),
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
