import type { FileSourceType, FileValidationResult } from '../types';

export const MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

const EXTENSION_MAP: Record<string, FileSourceType> = {
  pdf: 'PDF',
  txt: 'TXT',
  png: 'IMAGE',
  jpg: 'IMAGE',
  jpeg: 'IMAGE',
  webp: 'IMAGE',
};

export function validateUploadFile(file: {
  name: string;
  size: number;
  type?: string;
}): FileValidationResult {
  if (!file || !file.name) {
    return { valid: false, error: 'Please select a valid file to upload.' };
  }

  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  const fileType = EXTENSION_MAP[ext];

  if (!fileType) {
    return {
      valid: false,
      error: `Unsupported file format ".${ext || 'unknown'}". Accepted formats: PDF, TXT, PNG, JPG, JPEG.`,
    };
  }

  if (file.size <= 0) {
    return {
      valid: false,
      error: 'The selected file is empty (0 bytes). Please upload a document containing readable text.',
    };
  }

  if (file.size > MAX_UPLOAD_SIZE_BYTES) {
    return {
      valid: false,
      error: `File exceeds the 10 MB size limit (${(file.size / (1024 * 1024)).toFixed(1)} MB uploaded).`,
    };
  }

  return { valid: true, fileType };
}

/**
 * Cleans and normalizes raw extracted text (from PDF, TXT, or OCR):
 * - Unicode NFKC normalization
 * - Fixes ligatures and broken hyphenated line-wraps
 * - Strips OCR control noise and stray separator bars
 * - Collapses redundant whitespace while retaining paragraph breaks
 */
export function cleanDocumentText(rawText: string): string {
  if (!rawText) return '';

  return rawText
    .normalize('NFKC')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/ﬁ/g, 'fi')
    .replace(/ﬂ/g, 'fl')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/([a-zA-Z])-\n([a-zA-Z])/g, '$1$2')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ' ')
    .replace(/[|~`]{2,}/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function splitSentences(text: string): string[] {
  const cleaned = cleanDocumentText(text);
  if (!cleaned) return [];

  // Protect common academic abbreviations from false sentence splits
  const protectedText = cleaned
    .replace(/\b(Dr|Prof|Mr|Mrs|Ms|No|Rs|Dept|St|vs|etc|Jan|Feb|Mar|Apr|Aug|Sep|Sept|Oct|Nov|Dec)\./gi, '$1__DOT__')
    .replace(/(\d)\.(\d)/g, '$1__DEC__$2');

  const rawSegments = protectedText
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) =>
      s
        .replace(/__DOT__/g, '.')
        .replace(/__DEC__/g, '.')
        .trim()
    )
    .filter((s) => s.length > 2);

  return rawSegments;
}

function decodePdfStringLiteral(raw: string): string {
  let out = '';
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    if (ch === '\\' && i + 1 < raw.length) {
      const next = raw[i + 1];
      if (next === 'n') {
        out += '\n';
        i++;
      } else if (next === 'r') {
        out += '\r';
        i++;
      } else if (next === 't') {
        out += '\t';
        i++;
      } else if (next === '(' || next === ')' || next === '\\') {
        out += next;
        i++;
      } else if (/[0-7]/.test(next)) {
        const oct = raw.slice(i + 1, i + 4).match(/^[0-7]{1,3}/)?.[0] ?? '';
        out += String.fromCharCode(parseInt(oct, 8));
        i += oct.length;
      } else {
        out += next;
        i++;
      }
    } else {
      out += ch;
    }
  }
  return out;
}

function decodePdfHexString(hex: string): string {
  const cleanHex = hex.replace(/\s+/g, '');
  if (cleanHex.length < 2) return '';
  // UTF-16BE BOM check
  if (cleanHex.toUpperCase().startsWith('FEFF')) {
    let str = '';
    for (let i = 4; i + 3 < cleanHex.length; i += 4) {
      str += String.fromCharCode(parseInt(cleanHex.slice(i, i + 4), 16));
    }
    return str;
  }
  let str = '';
  for (let i = 0; i + 1 < cleanHex.length; i += 2) {
    const code = parseInt(cleanHex.slice(i, i + 2), 16);
    if (code >= 32 && code <= 126) {
      str += String.fromCharCode(code);
    } else if (code === 10 || code === 13) {
      str += '\n';
    }
  }
  return str;
}

function extractTextOperators(content: string): string {
  const blocks: string[] = [];
  const btRegex = /BT([\s\S]*?)ET/g;
  let match: RegExpExecArray | null;

  while ((match = btRegex.exec(content)) !== null) {
    const block = match[1];
    const parts: string[] = [];

    // Match TJ arrays like [(Hello ) -20 (World)] TJ
    const tjArrayRegex = /\[([\s\S]*?)\]\s*TJ/g;
    let arrMatch: RegExpExecArray | null;
    while ((arrMatch = tjArrayRegex.exec(block)) !== null) {
      const inner = arrMatch[1];
      const strRegex = /\(([^)\\]*(?:\\.[^)\\]*)*)\)|<([0-9A-Fa-f\s]+)>/g;
      let tokenMatch: RegExpExecArray | null;
      let line = '';
      while ((tokenMatch = strRegex.exec(inner)) !== null) {
        if (tokenMatch[1] !== undefined) {
          line += decodePdfStringLiteral(tokenMatch[1]);
        } else if (tokenMatch[2] !== undefined) {
          line += decodePdfHexString(tokenMatch[2]);
        }
      }
      if (line.trim()) parts.push(line);
    }

    // Match single Tj or ' or " strings
    const singleRegex = /\(([^)\\]*(?:\\.[^)\\]*)*)\)\s*(?:Tj|'|")|<([0-9A-Fa-f\s]+)>\s*Tj/g;
    let singleMatch: RegExpExecArray | null;
    while ((singleMatch = singleRegex.exec(block)) !== null) {
      const decoded =
        singleMatch[1] !== undefined
          ? decodePdfStringLiteral(singleMatch[1])
          : decodePdfHexString(singleMatch[2] ?? '');
      if (decoded.trim()) parts.push(decoded);
    }

    if (parts.length > 0) {
      blocks.push(parts.join(' '));
    }
  }

  return blocks.join('\n');
}

async function inflateBytes(compressed: Uint8Array): Promise<string | null> {
  if (typeof DecompressionStream === 'undefined') return null;
  try {
    const ds = new DecompressionStream('deflate');
    const writer = ds.writable.getWriter();
    writer.write(new Uint8Array(compressed));
    writer.close();
    const reader = ds.readable.getReader();
    const chunks: Uint8Array[] = [];
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      if (value) chunks.push(value);
    }
    const totalLen = chunks.reduce((acc, c) => acc + c.length, 0);
    const merged = new Uint8Array(totalLen);
    let offset = 0;
    for (const c of chunks) {
      merged.set(c, offset);
      offset += c.length;
    }
    return new TextDecoder('latin1').decode(merged);
  } catch {
    return null;
  }
}

/**
 * Pure TypeScript PDF text stream extractor supporting uncompressed and FlateDecode PDF streams.
 */
export async function extractTextFromPdfBytes(bytes: Uint8Array): Promise<string> {
  const latin1 = new TextDecoder('latin1').decode(bytes);
  if (!latin1.startsWith('%PDF')) {
    throw new Error('The uploaded file does not have a valid PDF header (%PDF).');
  }

  const collected: string[] = [];

  // 1. Direct uncompressed BT..ET blocks
  const direct = extractTextOperators(latin1);
  if (direct.trim()) {
    collected.push(direct);
  }

  // 2. Scan FlateDecode streams
  const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  let streamMatch: RegExpExecArray | null;
  while ((streamMatch = streamRegex.exec(latin1)) !== null) {
    const headerSlice = latin1.slice(Math.max(0, streamMatch.index - 220), streamMatch.index);
    if (/FlateDecode/.test(headerSlice)) {
      const startIdx = streamMatch.index + streamMatch[0].indexOf('\n') + 1;
      const rawBody = streamMatch[1];
      const streamBytes = bytes.slice(startIdx, startIdx + rawBody.length);
      const inflated = await inflateBytes(streamBytes);
      if (inflated) {
        const extracted = extractTextOperators(inflated);
        if (extracted.trim()) {
          collected.push(extracted);
        }
      }
    }
  }

  const combined = cleanDocumentText(collected.join('\n\n'));
  if (!combined) {
    throw new Error(
      'No embedded text streams were detected in this PDF (it may be a scanned image-only PDF). Convert the page to PNG/JPG and use the OpenCV OCR Scanner tab.'
    );
  }
  return combined;
}

/**
 * Generates a real valid minimal PDF binary containing the given title & lines
 * so students can download a genuine .pdf test document and re-upload it.
 */
export function buildSamplePdfBytes(title: string, bodyLines: string[]): Uint8Array {
  const escapePdf = (s: string) => s.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
  const allLines = [title, '', ...bodyLines];
  const ops: string[] = ['BT', '/F1 11 Tf', '50 760 Td', '16 TL'];
  for (const line of allLines) {
    ops.push(`(${escapePdf(line)}) Tj T*`);
  }
  ops.push('ET');
  const stream = ops.join('\n');

  const objects = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n',
    `4 0 obj\n<< /Length ${stream.length} >>\nstream\n${stream}\nendstream\nendobj\n`,
    '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n',
  ];

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [0];
  for (const obj of objects) {
    offsets.push(pdf.length);
    pdf += obj;
  }
  const xrefPos = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i < offsets.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF\n`;

  return new TextEncoder().encode(pdf);
}
