// Изрязва всяка снимка до квадрат, центриран върху храната.
// Храната се намира като всичко, което се различава от цветовете по краищата (фон, стена, мрамор).
// Употреба: node scripts/center-crop.js images-original/menu public/images/menu
const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const [, , inDir, outDir] = process.argv;
fs.mkdirSync(outDir, { recursive: true });

function percentile(sorted, p) {
  return sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))];
}

async function findCenter(file, W, H) {
  const S = 200; // анализ на намалено копие
  const { data, info } = await sharp(file)
    .resize(S, S, { fit: "fill" })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  // Цветовете по краищата (стена, фон, мрамор) са „фон“; всичко рядко
  // срещано по краищата е чинията/храната.
  const q = (i) => ((data[i] >> 4) << 8) | ((data[i + 1] >> 4) << 4) | (data[i + 2] >> 4);
  const border = new Map();
  const m = Math.round(S * 0.06);
  let nb = 0;
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    if (x >= m && x < S - m && y >= m && y < S - m) continue;
    const k = q((y * S + x) * 3); border.set(k, (border.get(k) || 0) + 1); nb++;
  }
  const xs = [], ys = [];
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    if ((border.get(q((y * S + x) * 3)) || 0) / nb < 0.002) { xs.push(x); ys.push(y); }
  }
  if (xs.length < 200) return { cx: 0.5, cy: 0.5, n: xs.length };
  xs.sort((a, b) => a - b); ys.sort((a, b) => a - b);
  // Средата между 5-и и 95-и персентил — устойчиво на отделни цветни петна.
  const cx = (percentile(xs, 0.05) + percentile(xs, 0.95)) / 2 / info.width;
  const cy = (percentile(ys, 0.05) + percentile(ys, 0.95)) / 2 / info.height;
  return { cx, cy, n: xs.length };
}

(async () => {
  for (const f of fs.readdirSync(inDir).filter((f) => /\.(webp|jpe?g|png)$/i.test(f))) {
    const file = path.join(inDir, f);
    const { width: W, height: H } = await sharp(file).metadata();
    const { cx, cy, n } = await findCenter(file, W, H);
    const side = Math.min(W, H);
    const left = Math.round(Math.max(0, Math.min(W - side, cx * W - side / 2)));
    const top = Math.round(Math.max(0, Math.min(H - side, cy * H - side / 2)));
    await sharp(file)
      .extract({ left, top, width: side, height: side })
      .webp({ quality: 85 })
      .toFile(path.join(outDir, f.replace(/\.\w+$/, ".webp")));
    console.log(`${f}\t${W}x${H}\tc=(${cx.toFixed(2)},${cy.toFixed(2)})\tn=${n}`);
  }
})();
