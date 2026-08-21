export interface Point {
  x: number;
  y: number;
}

export interface CropData {
  topLeft: Point;
  topRight: Point;
  bottomRight: Point;
  bottomLeft: Point;
}

export interface PageSettings {
  crop: CropData;
  rotation: number;
  filter: string;
  brightness: number;
  contrast: number;
  sharpness: number;
}

export function defaultCrop(w: number, h: number): CropData {
  const m = 0.05;
  return {
    topLeft: { x: w * m, y: h * m },
    topRight: { x: w * (1 - m), y: h * m },
    bottomRight: { x: w * (1 - m), y: h * (1 - m) },
    bottomLeft: { x: w * m, y: h * (1 - m) },
  };
}

export function defaultSettings(w: number, h: number): PageSettings {
  return {
    crop: defaultCrop(w, h),
    rotation: 0,
    filter: "original",
    brightness: 0,
    contrast: 0,
    sharpness: 0,
  };
}

function buildTransformString(s: PageSettings, w: number, h: number): string {
  const c = Math.cos((s.rotation * Math.PI) / 180);
  const sin = Math.sin((s.rotation * Math.PI) / 180);
  return `rotate(${s.rotation}deg)`;
}

function getCanvasDims(w: number, h: number, rotation: number): { cw: number; ch: number } {
  const r = ((rotation % 360) + 360) % 360;
  if (r === 90 || r === 270) return { cw: h, ch: w };
  return { cw: w, ch: h };
}

function applyBrightnessContrast(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  brightness: number,
  contrast: number
) {
  if (brightness === 0 && contrast === 0) return;
  const imageData = ctx.getImageData(0, 0, w, h);
  const d = imageData.data;
  const bFactor = brightness * 2.55;
  const cFactor = (259 * (contrast * 2.55 + 255)) / (255 * (259 - contrast * 2.55));

  for (let i = 0; i < d.length; i += 4) {
    let r = d[i] + bFactor;
    let g = d[i + 1] + bFactor;
    let b = d[i + 2] + bFactor;
    if (contrast !== 0) {
      r = cFactor * (r - 128) + 128;
      g = cFactor * (g - 128) + 128;
      b = cFactor * (b - 128) + 128;
    }
    d[i] = Math.max(0, Math.min(255, r));
    d[i + 1] = Math.max(0, Math.min(255, g));
    d[i + 2] = Math.max(0, Math.min(255, b));
  }
  ctx.putImageData(imageData, 0, 0);
}

function applyFilter(ctx: CanvasRenderingContext2D, w: number, h: number, filter: string) {
  if (filter === "original") return;
  const imageData = ctx.getImageData(0, 0, w, h);
  const d = imageData.data;

  switch (filter) {
    case "grayscale": {
      for (let i = 0; i < d.length; i += 4) {
        const avg = d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114;
        d[i] = d[i + 1] = d[i + 2] = avg;
      }
      break;
    }
    case "bw": {
      for (let i = 0; i < d.length; i += 4) {
        const avg = d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114;
        d[i] = d[i + 1] = d[i + 2] = avg > 140 ? 255 : 0;
      }
      break;
    }
    case "highcontrast": {
      for (let i = 0; i < d.length; i += 4) {
        const avg = d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114;
        const v = avg < 100 ? 0 : avg > 180 ? 255 : ((avg - 100) / 80) * 255;
        d[i] = d[i + 1] = d[i + 2] = v;
      }
      break;
    }
    case "auto": {
      let minR = 255, maxR = 0, minG = 255, maxG = 0, minB = 255, maxB = 0;
      for (let i = 0; i < d.length; i += 4) {
        minR = Math.min(minR, d[i]); maxR = Math.max(maxR, d[i]);
        minG = Math.min(minG, d[i+1]); maxG = Math.max(maxG, d[i+1]);
        minB = Math.min(minB, d[i+2]); maxB = Math.max(maxB, d[i+2]);
      }
      const rangeR = maxR - minR || 1;
      const rangeG = maxG - minG || 1;
      const rangeB = maxB - minB || 1;
      for (let i = 0; i < d.length; i += 4) {
        d[i] = Math.min(255, Math.max(0, ((d[i] - minR) / rangeR) * 255));
        d[i+1] = Math.min(255, Math.max(0, ((d[i+1] - minG) / rangeG) * 255));
        d[i+2] = Math.min(255, Math.max(0, ((d[i+2] - minB) / rangeB) * 255));
      }
      break;
    }
    case "color": {
      for (let i = 0; i < d.length; i += 4) {
        d[i] = Math.min(255, d[i] * 1.05);
        d[i+1] = Math.min(255, d[i+1] * 1.05);
        d[i+2] = Math.min(255, d[i+2] * 1.05);
      }
      break;
    }
  }
  ctx.putImageData(imageData, 0, 0);
}

function applySharpen(ctx: CanvasRenderingContext2D, w: number, h: number, amount: number) {
  if (amount <= 0) return;
  const strength = amount / 100;
  const src = ctx.getImageData(0, 0, w, h);
  const dst = ctx.createImageData(w, h);
  const s = src.data;
  const d = dst.data;
  const kernel = [0, -1, 0, -1, 5, -1, 0, -1, 0];

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      for (let c = 0; c < 3; c++) {
        let val = 0;
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const idx = ((y + ky) * w + (x + kx)) * 4 + c;
            val += s[idx] * kernel[(ky + 1) * 3 + (kx + 1)];
          }
        }
        const idx = (y * w + x) * 4 + c;
        d[idx] = Math.max(0, Math.min(255, s[idx] + (val - s[idx]) * strength));
      }
      d[(y * w + x) * 4 + 3] = 255;
    }
  }
  ctx.putImageData(dst, 0, 0);
}

export function processImage(
  sourceImage: HTMLImageElement,
  settings: PageSettings
): HTMLCanvasElement {
  const srcW = sourceImage.naturalWidth;
  const srcH = sourceImage.naturalHeight;

  const crop = settings.crop;
  const polyPoints = [crop.topLeft, crop.topRight, crop.bottomRight, crop.bottomLeft];

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of polyPoints) {
    minX = Math.min(minX, p.x); minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y);
  }

  const srcPoly = [
    { x: polyPoints[0].x / srcW, y: polyPoints[0].y / srcH },
    { x: polyPoints[1].x / srcW, y: polyPoints[1].y / srcH },
    { x: polyPoints[2].x / srcW, y: polyPoints[2].y / srcH },
    { x: polyPoints[3].x / srcW, y: polyPoints[3].y / srcH },
  ];

  const cropW = Math.round(maxX - minX);
  const cropH = Math.round(maxY - minY);
  const outW = Math.max(cropW, 1);
  const outH = Math.max(cropH, 1);

  const perspCanvas = document.createElement("canvas");
  perspCanvas.width = outW;
  perspCanvas.height = outH;
  const pctx = perspCanvas.getContext("2d")!;
  pctx.imageSmoothingEnabled = true;
  pctx.imageSmoothingQuality = "high";

  pctx.save();
  pctx.beginPath();
  pctx.moveTo(0, 0);
  pctx.lineTo(outW, 0);
  pctx.lineTo(outW, outH);
  pctx.lineTo(0, outH);
  pctx.closePath();
  pctx.clip();

  const srcQuad = [
    { x: (polyPoints[0].x - minX) / outW, y: (polyPoints[0].y - minY) / outH },
    { x: (polyPoints[1].x - minX) / outW, y: (polyPoints[1].y - minY) / outH },
    { x: (polyPoints[2].x - minX) / outW, y: (polyPoints[2].y - minY) / outH },
    { x: (polyPoints[3].x - minX) / outW, y: (polyPoints[3].y - minY) / outH },
  ];

  const w = outW;
  const h = outH;
  const sx0 = srcQuad[0].x * srcW, sy0 = srcQuad[0].y * srcH;
  const sx1 = srcQuad[1].x * srcW, sy1 = srcQuad[1].y * srcH;
  const sx2 = srcQuad[2].x * srcW, sy2 = srcQuad[2].y * srcH;
  const sx3 = srcQuad[3].x * srcW, sy3 = srcQuad[3].y * srcH;

  const iterations = 10;
  for (let i = 0; i < iterations; i++) {
    const t = i / iterations;
    const nt = (i + 1) / iterations;

    const srcTopX = sx0 + (sx1 - sx0) * t;
    const srcTopY = sy0 + (sy1 - sy0) * t;
    const srcBotX = sx3 + (sx2 - sx3) * t;
    const srcBotY = sy3 + (sy2 - sy3) * t;
    const srcTopXn = sx0 + (sx1 - sx0) * nt;
    const srcTopYn = sy0 + (sy1 - sy0) * nt;
    const srcBotXn = sx3 + (sx2 - sx3) * nt;
    const srcBotYn = sy3 + (sy2 - sy3) * nt;

    const dstX = w * t;
    const dstW = w / iterations;

    pctx.drawImage(
      sourceImage,
      srcTopX, srcTopY, srcTopXn - srcTopX || 1, srcBotY - srcTopY || 1,
      dstX, 0, dstW, h
    );
  }
  pctx.restore();

  const { cw, ch } = getCanvasDims(outW, outH, settings.rotation);
  const rotCanvas = document.createElement("canvas");
  rotCanvas.width = cw;
  rotCanvas.height = ch;
  const rctx = rotCanvas.getContext("2d")!;
  rctx.translate(cw / 2, ch / 2);
  rctx.rotate((settings.rotation * Math.PI) / 180);
  rctx.drawImage(perspCanvas, -outW / 2, -outH / 2, outW, outH);

  applyFilter(rctx, cw, ch, settings.filter);
  applyBrightnessContrast(rctx, cw, ch, settings.brightness, settings.contrast);
  applySharpen(rctx, cw, ch, settings.sharpness);

  return rotCanvas;
}

export function detectDocumentEdges(
  image: HTMLImageElement
): CropData | null {
  const w = image.naturalWidth;
  const h = image.naturalHeight;

  const sampleCanvas = document.createElement("canvas");
  const sw = Math.min(w, 640);
  const sh = Math.round((h / w) * sw);
  sampleCanvas.width = sw;
  sampleCanvas.height = sh;
  const sctx = sampleCanvas.getContext("2d")!;
  sctx.drawImage(image, 0, 0, sw, sh);
  const data = sctx.getImageData(0, 0, sw, sh).data;

  const gray = new Uint8Array(sw * sh);
  for (let i = 0; i < gray.length; i++) {
    gray[i] = data[i * 4] * 0.299 + data[i * 4 + 1] * 0.587 + data[i * 4 + 2] * 0.114;
  }

  let sum = 0;
  for (let i = 0; i < gray.length; i++) sum += gray[i];
  const mean = sum / gray.length;

  let edgeCount = 0;
  let sumX = 0, sumY = 0;
  const margin = 5;

  for (let y = margin; y < sh - margin; y++) {
    for (let x = margin; x < sw - margin; x++) {
      const idx = y * sw + x;
      const gx = -gray[idx - 1] + gray[idx + 1];
      const gy = -gray[idx - sw] + gray[idx + sw];
      const mag = Math.sqrt(gx * gx + gy * gy);
      if (mag > 50) {
        edgeCount++;
        sumX += x;
        sumY += y;
      }
    }
  }

  if (edgeCount < 100) return null;

  const cx = sumX / edgeCount;
  const cy = sumY / edgeCount;

  const corners: Point[] = [];
  const quadrants = [
    { xRange: [margin, Math.floor(cx)], yRange: [margin, Math.floor(cy)] },
    { xRange: [Math.floor(cx), sw - margin], yRange: [margin, Math.floor(cy)] },
    { xRange: [Math.floor(cx), sw - margin], yRange: [Math.floor(cy), sh - margin] },
    { xRange: [margin, Math.floor(cx)], yRange: [Math.floor(cy), sh - margin] },
  ];

  for (const q of quadrants) {
    let maxMag = 0;
    let bestX = (q.xRange[0] + q.xRange[1]) / 2;
    let bestY = (q.yRange[0] + q.yRange[1]) / 2;
    for (let y = q.yRange[0]; y < q.yRange[1]; y += 3) {
      for (let x = q.xRange[0]; x < q.xRange[1]; x += 3) {
        const idx = y * sw + x;
        const gx = -gray[idx - 1] + gray[idx + 1];
        const gy = -gray[idx - sw] + gray[idx + sw];
        const mag = Math.sqrt(gx * gx + gy * gy);
        if (mag > maxMag) {
          maxMag = mag;
          bestX = x;
          bestY = y;
        }
      }
    }
    corners.push({ x: (bestX / sw) * w, y: (bestY / sh) * h });
  }

  const dist = (a: Point, b: Point) => Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
  const diag = dist(corners[0], corners[2]);
  const imgDiag = dist({ x: 0, y: 0 }, { x: w, y: h });

  if (diag < imgDiag * 0.3 || diag > imgDiag * 0.98) return null;

  return {
    topLeft: corners[0],
    topRight: corners[1],
    bottomRight: corners[2],
    bottomLeft: corners[3],
  };
}

export async function blobToImage(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image"));
    };
    img.src = url;
  });
}

export async function canvasToBlob(
  canvas: HTMLCanvasElement,
  type = "image/jpeg",
  quality = 0.92
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Failed to create blob"));
      },
      type,
      quality
    );
  });
}
