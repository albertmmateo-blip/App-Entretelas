/**
 * Generates icon.ico from icon.svg using sharp + png-to-ico.
 * Run once: node scripts/generate-icon.js
 */

const fs = require('fs').promises;
const path = require('path');
const sharp = require('sharp');
const toIco = require('to-ico');

const SRC_SVG = path.join(__dirname, '../src/renderer/assets/icon.svg');
const DEST_ICO = path.join(__dirname, '../src/renderer/assets/icon.ico');

const SIZES = [16, 24, 32, 48, 64, 128, 256];

async function main() {
  const svgBuffer = await fs.readFile(SRC_SVG);

  const pngBuffers = await Promise.all(
    SIZES.map((size) => sharp(svgBuffer).resize(size, size).png().toBuffer())
  );

  const icoBuffer = await toIco(pngBuffers);
  await fs.writeFile(DEST_ICO, icoBuffer);
  console.log(`✔ icon.ico written (sizes: ${SIZES.join(', ')}px)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
