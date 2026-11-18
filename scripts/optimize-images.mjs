import { mkdir } from "node:fs/promises";
import sharp from "sharp";

const products = [
  { source: "cranberryCan", output: "cranberryCan" },
  { source: "blueberryCan", output: "blueberryCan" },
  { source: "kiwi", output: "kiwi" },
  { source: "watermelon", output: "watermelon" },
  { source: "mangoCan", output: "mangoCan" },
  { source: "grapeCan", output: "grapeCan" },
  { source: "Mixed berries can mockup", output: "mixedBerriesCan" },
];
const widths = [400, 800];
await mkdir("public/images/optimized", { recursive: true });

await Promise.all(products.flatMap(({ source, output }) => widths.flatMap((width) => {
  const sourcePath = `public/images/${source}.png`;
  const base = sharp(sourcePath).resize({ width, withoutEnlargement: true });
  return [
    base.clone().webp({ quality: 82 }).toFile(`public/images/optimized/${output}-${width}.webp`),
    base.clone().avif({ quality: 55 }).toFile(`public/images/optimized/${output}-${width}.avif`),
  ];
})));

console.info(`Generated ${products.length * widths.length * 2} responsive product assets.`);
