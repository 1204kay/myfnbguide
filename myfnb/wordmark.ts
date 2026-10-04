// Draws the MyF&B wordmark (logo option 3, decided 10/4: capitals, wide tracking, "MY" in the accent) as SVG
// paths from Noto Sans SC Bold (SIL OFL 1.1), so no font loads: site/brand/wordmark.svg and wordmark-dark.svg
// for share images, and the path data for site/brand/Logo.tsx.
//   node myfnb/wordmark.ts <@fontsource/noto-sans-sc package directory>   (npm pack @fontsource/noto-sans-sc@5.3.0)
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import opentype from "opentype.js";

const pkg = process.argv[2];
if (!pkg) throw new Error("usage: node myfnb/wordmark.ts <noto-sans-sc package dir>");
const font = opentype.parse(readFileSync(path.join(pkg, "files/noto-sans-sc-latin-700-normal.woff")).buffer);

/** Cap height in the mark's units, and the space between two letters' inks. */
const CAP = 100;
const TRACK = CAP * 0.22;
const parts = [{ text: "MY", accent: true }, { text: "F&B", accent: false }];

const scale = CAP / (font.tables.os2.sCapHeight as number);
let x = 0;
const paths: Record<"accent" | "ink", string[]> = { accent: [], ink: [] };
for (const part of parts) {
  for (const ch of part.text) {
    const glyph = font.charToGlyph(ch);
    const box = glyph.getPath(0, 0, font.unitsPerEm * scale).getBoundingBox();
    // Each letter's ink starts where the last one's ended, plus the tracking.
    const p = glyph.getPath(x - box.x1, CAP, font.unitsPerEm * scale);
    paths[part.accent ? "accent" : "ink"].push(p.toPathData(1));
    x += box.x2 - box.x1 + TRACK;
  }
}
const width = Math.ceil(x - TRACK);
const top = Math.floor(Math.min(0, ...parts.flatMap((p) => [...p.text].map((ch) => font.charToGlyph(ch).getPath(0, CAP, font.unitsPerEm * scale).getBoundingBox().y1))));
const bottom = Math.ceil(Math.max(CAP, ...parts.flatMap((p) => [...p.text].map((ch) => font.charToGlyph(ch).getPath(0, CAP, font.unitsPerEm * scale).getBoundingBox().y2))));
const viewBox = `0 ${top} ${width} ${bottom - top}`;
const d = { accent: paths.accent.join(""), ink: paths.ink.join("") };

const svg = (accent: string, ink: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="${width}" height="${bottom - top}" role="img" aria-label="MyF&amp;B"><path fill="${accent}" d="${d.accent}"/><path fill="${ink}" d="${d.ink}"/></svg>\n`;
writeFileSync("site/brand/wordmark.svg", svg("#176b75", "#1b2427"));
writeFileSync("site/brand/wordmark-dark.svg", svg("#2ce2e8", "#e6eded"));
writeFileSync(path.join(process.env.TEMP ?? ".", "wordmark-paths.json"), JSON.stringify({ viewBox, aspect: width / (bottom - top), ...d }));
console.log(viewBox, `aspect ${(width / (bottom - top)).toFixed(3)}`);
