import type { CVPreprocessingOptions, ImageStats } from '../types';

/**
 * Pure Computer Vision preprocessing pipeline mirroring OpenCV steps:
 * - ITU-R BT.601 Grayscale conversion
 * - 3x3 Gaussian blur denoising
 * - Min-Max Contrast stretching (histogram normalization)
 * - Otsu's between-class variance thresholding
 * - Adaptive local mean thresholding
 * - Horizontal projection profile text-line segmentation
 */

export function toGrayscaleBuffer(rgba: Uint8ClampedArray): Uint8ClampedArray {
  const pixelCount = Math.floor(rgba.length / 4);
  const gray = new Uint8ClampedArray(pixelCount);
  for (let i = 0; i < pixelCount; i++) {
    const idx = i * 4;
    gray[i] = Math.round(0.299 * rgba[idx] + 0.587 * rgba[idx + 1] + 0.114 * rgba[idx + 2]);
  }
  return gray;
}

export function applyGaussianBlur3x3(
  gray: Uint8ClampedArray,
  width: number,
  height: number
): Uint8ClampedArray {
  const out = new Uint8ClampedArray(gray.length);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (x === 0 || y === 0 || x === width - 1 || y === height - 1) {
        out[y * width + x] = gray[y * width + x];
        continue;
      }
      const sum =
        gray[(y - 1) * width + (x - 1)] * 1 +
        gray[(y - 1) * width + x] * 2 +
        gray[(y - 1) * width + (x + 1)] * 1 +
        gray[y * width + (x - 1)] * 2 +
        gray[y * width + x] * 4 +
        gray[y * width + (x + 1)] * 2 +
        gray[(y + 1) * width + (x - 1)] * 1 +
        gray[(y + 1) * width + x] * 2 +
        gray[(y + 1) * width + (x + 1)] * 1;
      out[y * width + x] = Math.round(sum / 16);
    }
  }
  return out;
}

export function applyContrastStretch(gray: Uint8ClampedArray): Uint8ClampedArray {
  const hist = new Uint32Array(256);
  for (let i = 0; i < gray.length; i++) {
    hist[gray[i]]++;
  }
  // 2nd and 98th percentile robust stretch to avoid salt-and-pepper outliers
  const total = gray.length;
  const lowTarget = Math.floor(total * 0.02);
  const highTarget = Math.floor(total * 0.98);

  let cumulative = 0;
  let minVal = 0;
  let maxVal = 255;

  for (let i = 0; i < 256; i++) {
    cumulative += hist[i];
    if (cumulative >= lowTarget) {
      minVal = i;
      break;
    }
  }
  cumulative = 0;
  for (let i = 0; i < 256; i++) {
    cumulative += hist[i];
    if (cumulative >= highTarget) {
      maxVal = i;
      break;
    }
  }

  const range = Math.max(1, maxVal - minVal);
  const out = new Uint8ClampedArray(gray.length);
  for (let i = 0; i < gray.length; i++) {
    const stretched = ((gray[i] - minVal) * 255) / range;
    out[i] = Math.max(0, Math.min(255, Math.round(stretched)));
  }
  return out;
}

export function computeOtsuThreshold(gray: Uint8ClampedArray): number {
  const hist = new Uint32Array(256);
  for (let i = 0; i < gray.length; i++) {
    hist[gray[i]]++;
  }
  const total = gray.length;
  if (total === 0) return 128;

  let sumAll = 0;
  for (let t = 0; t < 256; t++) {
    sumAll += t * hist[t];
  }

  let sumB = 0;
  let weightB = 0;
  let maxVariance = -1;
  let optimalThreshold = 128;

  for (let t = 0; t < 256; t++) {
    weightB += hist[t];
    if (weightB === 0) continue;
    const weightF = total - weightB;
    if (weightF === 0) break;

    sumB += t * hist[t];
    const meanB = sumB / weightB;
    const meanF = (sumAll - sumB) / weightF;
    const betweenVariance = weightB * weightF * (meanB - meanF) * (meanB - meanF);

    if (betweenVariance > maxVariance) {
      maxVariance = betweenVariance;
      optimalThreshold = t;
    }
  }

  return optimalThreshold;
}

export function applyBinarization(
  gray: Uint8ClampedArray,
  width: number,
  height: number,
  mode: 'otsu' | 'adaptive' | 'manual',
  manualThreshold = 140
): { binary: Uint8ClampedArray; thresholdUsed: number } {
  const out = new Uint8ClampedArray(gray.length);

  if (mode === 'otsu' || mode === 'manual') {
    const threshold = mode === 'otsu' ? computeOtsuThreshold(gray) : manualThreshold;
    for (let i = 0; i < gray.length; i++) {
      out[i] = gray[i] <= threshold ? 0 : 255;
    }
    return { binary: out, thresholdUsed: threshold };
  }

  // Adaptive local mean thresholding via integral image (O(W*H))
  const integral = new Float64Array((width + 1) * (height + 1));
  for (let y = 1; y <= height; y++) {
    let rowSum = 0;
    for (let x = 1; x <= width; x++) {
      rowSum += gray[(y - 1) * width + (x - 1)];
      integral[y * (width + 1) + x] = integral[(y - 1) * (width + 1) + x] + rowSum;
    }
  }

  const radius = 8;
  const biasC = 10;
  for (let y = 0; y < height; y++) {
    const y1 = Math.max(0, y - radius);
    const y2 = Math.min(height - 1, y + radius);
    for (let x = 0; x < width; x++) {
      const x1 = Math.max(0, x - radius);
      const x2 = Math.min(width - 1, x + radius);
      const area = (x2 - x1 + 1) * (y2 - y1 + 1);
      const sum =
        integral[(y2 + 1) * (width + 1) + (x2 + 1)] -
        integral[y1 * (width + 1) + (x2 + 1)] -
        integral[(y2 + 1) * (width + 1) + x1] +
        integral[y1 * (width + 1) + x1];
      const localMean = sum / area;
      out[y * width + x] = gray[y * width + x] < localMean - biasC ? 0 : 255;
    }
  }

  return { binary: out, thresholdUsed: computeOtsuThreshold(gray) };
}

export interface TextLineBox {
  yStart: number;
  yEnd: number;
  xStart: number;
  xEnd: number;
}

/**
 * Horizontal projection profile segmentation to detect text line bounding boxes
 */
export function detectTextLineBoxes(
  binary: Uint8ClampedArray,
  width: number,
  height: number
): TextLineBox[] {
  const rowCounts = new Uint32Array(height);
  for (let y = 0; y < height; y++) {
    let dark = 0;
    for (let x = 0; x < width; x++) {
      if (binary[y * width + x] < 128) dark++;
    }
    rowCounts[y] = dark;
  }

  const minRowInk = Math.max(3, Math.floor(width * 0.012));
  const boxes: TextLineBox[] = [];
  let inBand = false;
  let yStart = 0;

  for (let y = 0; y < height; y++) {
    if (!inBand && rowCounts[y] >= minRowInk) {
      inBand = true;
      yStart = y;
    } else if (inBand && (rowCounts[y] < minRowInk || y === height - 1)) {
      inBand = false;
      const yEnd = y;
      if (yEnd - yStart >= 4) {
        let xStart = width;
        let xEnd = 0;
        for (let py = yStart; py <= yEnd; py++) {
          for (let px = 0; px < width; px++) {
            if (binary[py * width + px] < 128) {
              if (px < xStart) xStart = px;
              if (px > xEnd) xEnd = px;
            }
          }
        }
        if (xEnd > xStart + 6) {
          boxes.push({ yStart, yEnd, xStart, xEnd });
        }
      }
    }
  }

  return boxes;
}

export function runCvPreprocessingPipeline(
  sourceRgba: Uint8ClampedArray,
  width: number,
  height: number,
  options: CVPreprocessingOptions
): {
  outputRgba: Uint8ClampedArray;
  stats: ImageStats;
  lineBoxes: TextLineBox[];
} {
  let workingGray = toGrayscaleBuffer(sourceRgba);

  if (options.denoise) {
    workingGray = applyGaussianBlur3x3(workingGray, width, height);
  }
  if (options.contrastStretch) {
    workingGray = applyContrastStretch(workingGray);
  }

  const otsu = computeOtsuThreshold(workingGray);

  // Compute luminance mean & std dev before binarization
  let sum = 0;
  for (let i = 0; i < workingGray.length; i++) sum += workingGray[i];
  const meanLuminance = workingGray.length ? sum / workingGray.length : 0;
  let varSum = 0;
  for (let i = 0; i < workingGray.length; i++) {
    const d = workingGray[i] - meanLuminance;
    varSum += d * d;
  }
  const contrastStdDev = workingGray.length ? Math.sqrt(varSum / workingGray.length) : 0;

  let finalGray = workingGray;
  if (options.binarize) {
    finalGray = applyBinarization(
      workingGray,
      width,
      height,
      options.binarizeMode,
      options.manualThreshold
    ).binary;
  }

  // Always compute binary projection for line detection
  const binaryForLines = options.binarize
    ? finalGray
    : applyBinarization(workingGray, width, height, 'otsu').binary;
  const lineBoxes = detectTextLineBoxes(binaryForLines, width, height);

  let darkPixels = 0;
  for (let i = 0; i < binaryForLines.length; i++) {
    if (binaryForLines[i] < 128) darkPixels++;
  }
  const inkCoveragePercent = binaryForLines.length
    ? (darkPixels / binaryForLines.length) * 100
    : 0;

  const outputRgba = new Uint8ClampedArray(sourceRgba.length);
  if (!options.grayscale && !options.denoise && !options.contrastStretch && !options.binarize) {
    outputRgba.set(sourceRgba);
  } else {
    for (let i = 0; i < finalGray.length; i++) {
      const v = finalGray[i];
      const idx = i * 4;
      outputRgba[idx] = v;
      outputRgba[idx + 1] = v;
      outputRgba[idx + 2] = v;
      outputRgba[idx + 3] = 255;
    }
  }

  return {
    outputRgba,
    stats: {
      width,
      height,
      meanLuminance: Number(meanLuminance.toFixed(1)),
      contrastStdDev: Number(contrastStdDev.toFixed(1)),
      otsuThreshold: otsu,
      inkCoveragePercent: Number(inkCoveragePercent.toFixed(1)),
      detectedLines: lineBoxes.length,
    },
    lineBoxes,
  };
}
