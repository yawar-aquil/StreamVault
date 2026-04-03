import sharp from 'sharp';

const input = 'client/public/streamvault-logo.png';
const output = 'client/public/streamvault-logo-glow-native.png';

async function generateGlow() {
  try {
    const metadata = await sharp(input).metadata();
    const w = metadata.width;
    const h = metadata.height;
    const extend = 60; // Extra padding for the shadow spread
    
    // We isolate the alpha channel to make a perfect solid red shadow silhouette
    const mask = await sharp(input)
      .extractChannel('alpha')
      .toBuffer();

    const redSilhouette = await sharp({
      create: { width: w, height: h, channels: 4, background: { r: 229, g: 9, b: 20, alpha: 0.9 } }
    })
      .joinChannel(mask)
      .extend({ top: extend, bottom: extend, left: extend, right: extend, background: { r:0,g:0,b:0,alpha:0 } })
      .blur(20) // Deep red blur exactly like the extension
      .toBuffer();

    // Layer the original image on top of the blurred silhouette
    await sharp(redSilhouette)
      .composite([
        { input: input, top: extend, left: extend }
      ])
      .png()
      .toFile(output);
      
    console.log('Successfully created streamvault-logo-glow-native.png');
  } catch (error) {
    console.error('Failed to create image: ', error);
  }
}
generateGlow();
