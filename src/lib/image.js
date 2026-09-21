// Photo helpers: crop, lesion mask (severity), and a small JPEG for storage.

export async function loadImage(file) {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = 'async';
    img.src = url;
    await img.decode();
    return img;
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }
}

// Centre square crop, resized to `size` px.
export function squareCanvas(img, size) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const s = Math.min(img.naturalWidth || img.width, img.naturalHeight || img.height);
  const sx = ((img.naturalWidth || img.width) - s) / 2;
  const sy = ((img.naturalHeight || img.height) - s) / 2;
  c.getContext('2d').drawImage(img, sx, sy, s, s, 0, 0, size, size);
  return c;
}

// Small JPEG (~30–80 KB) saved inside the Firestore case, so it syncs offline too.
export function smallJpeg(img, size = 360, quality = 0.6) {
  return squareCanvas(img, size).toDataURL('image/jpeg', quality);
}

function rgbToHsv(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  let h = 0;
  if (d) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60; if (h < 0) h += 360;
  }
  return [h, max ? d / max : 0, max];
}

// Leaf severity = lesion-coloured pixels ÷ (lesion + green) pixels.
// Simple colour thresholds, not a second model. Works best with one leaf filling
// the frame. Returns the % and an image with the lesions highlighted.
export function lesionMask(img, size = 256) {
  const c = squareCanvas(img, size);
  const ctx = c.getContext('2d');
  const data = ctx.getImageData(0, 0, size, size);
  const px = data.data;
  const kind = new Uint8Array(size * size); // 0 bg, 1 green, 2 lesion
  let minX = size, minY = size, maxX = -1, maxY = -1;
  for (let i = 0; i < size * size; i++) {
    const [h, s, v] = rgbToHsv(px[i * 4], px[i * 4 + 1], px[i * 4 + 2]);
    if (s < 0.18 || v < 0.12) continue;
    if (h >= 65 && h <= 170) {
      kind[i] = 1;
      const x = i % size, y = (i / size) | 0;
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
    } else if (h < 65 || h > 330) kind[i] = 2;
  }
  // Only count lesion pixels inside the leaf's bounding box (ignores soil at the edges).
  const padX = (maxX - minX) * 0.05, padY = (maxY - minY) * 0.05;
  let green = 0, lesion = 0;
  const overlay = ctx.createImageData(size, size);
  for (let i = 0; i < size * size; i++) {
    const x = i % size, y = (i / size) | 0;
    const inside = maxX >= 0 && x >= minX - padX && x <= maxX + padX && y >= minY - padY && y <= maxY + padY;
    if (kind[i] === 1) green++;
    else if (kind[i] === 2 && inside) {
      lesion++;
      overlay.data[i * 4] = 230; overlay.data[i * 4 + 1] = 70; overlay.data[i * 4 + 2] = 20; overlay.data[i * 4 + 3] = 150;
    }
  }
  const leaf = green + lesion;
  const pct = leaf ? Math.round((lesion / leaf) * 1000) / 10 : 0;
  // Compose photo + overlay.
  const out = document.createElement('canvas');
  out.width = out.height = size;
  const octx = out.getContext('2d');
  octx.drawImage(c, 0, 0);
  const ov = document.createElement('canvas');
  ov.width = ov.height = size;
  ov.getContext('2d').putImageData(overlay, 0, 0);
  octx.drawImage(ov, 0, 0);
  return { pct, leafFraction: leaf / (size * size), maskUrl: out.toDataURL('image/jpeg', 0.7) };
}
