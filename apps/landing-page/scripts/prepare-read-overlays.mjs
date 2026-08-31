import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const scriptRoot = path.dirname(fileURLToPath(import.meta.url));
const imageRoot = path.join(scriptRoot, "../public/images/read");
const names = ["composition", "light", "color", "focus", "subject", "intent"];
// Atlas landmarks are calibrated to the awning (y=198) and threshold (y=402)
// in a 418x627 rendering of the unchanged source photograph.
const calibration = [
  { width: 483, height: 609, x: -61, y: -126 },
  { width: 461, height: 612, x: -5, y: -127 },
  { width: 463, height: 618, x: 34, y: -131 },
  { width: 528, height: 564, x: -87, y: -59 },
  { width: 457, height: 615, x: -5, y: -96 },
  { width: 467, height: 592, x: 38, y: -87 },
];

async function placeOnFrame(input, { width, height, x, y }) {
  const scaled = await sharp(input).resize(width, height, { fit: "fill" }).toBuffer();
  const left = Math.max(0, -x);
  const top = Math.max(0, -y);
  const clipped = await sharp(scaled).extract({
    left,
    top,
    width: Math.min(width - left, 418 - Math.max(0, x)),
    height: Math.min(height - top, 627 - Math.max(0, y)),
  }).toBuffer();
  return sharp({ create: { width: 418, height: 627, channels: 3, background: "#000" } })
    .composite([{ input: clipped, left: Math.max(0, x), top: Math.max(0, y) }])
    .png().toBuffer();
}

async function main() {
  const output = path.join(imageRoot, "overlays");
  await fs.mkdir(output, { recursive: true });
  const frames = await Promise.all(names.map(async (name, index) => {
    const tile = await sharp(path.join(imageRoot, "read-overlays-atlas-v1.png"))
      .extract({ left: (index % 3) * 418, top: Math.floor(index / 3) * 627, width: 418, height: 627 })
      .png().toBuffer();
    // Keep the atlas's color swatches inside the frame when the facade is zoomed.
    const artwork = index === 2
      ? await sharp(tile).extract({ left: 0, top: 0, width: 315, height: 627 })
        .extend({ right: 103, background: "#000" }).toBuffer()
      : tile;
    let frame = await placeOnFrame(artwork, calibration[index]);
    if (index === 2) {
      const swatches = await sharp(tile).extract({ left: 336, top: 202, width: 64, height: 347 })
        .resize(40, 342, { fit: "fill" }).toBuffer();
      frame = await sharp(frame).composite([{ input: swatches, left: 376, top: 68 }]).png().toBuffer();
    }
    await fs.writeFile(path.join(output, `${name}.png`), frame);
    const photo = await sharp(path.join(imageRoot, "read-photo.jpg")).resize(418, 627).toBuffer();
    return sharp(photo).composite([{ input: frame, blend: "screen" }]).png().toBuffer();
  }));
  const previewRoot = path.join(scriptRoot, "../.tmp");
  await fs.mkdir(previewRoot, { recursive: true });
  await sharp({ create: { width: 1254, height: 1254, channels: 3, background: "#000" } })
    .composite(frames.map((input, index) => ({ input, left: (index % 3) * 418, top: Math.floor(index / 3) * 627 })))
    .jpeg({ quality: 92 }).toFile(path.join(previewRoot, "read-overlays-contact.jpg"));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
