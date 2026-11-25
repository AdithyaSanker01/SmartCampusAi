import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Download,
  Eye,
  FileImage,
  FileText,
  ScanLine,
  Search,
  Trash2,
  Upload,
} from 'lucide-react';
import {
  DOCUMENT_CATEGORIES,
  type CampusDocument,
  type CVPreprocessingOptions,
  type DocumentCategory,
  type FileSourceType,
  type ImageStats,
} from '../types';
import { runCvPreprocessingPipeline, type TextLineBox } from '../engine/cvPipeline';
import {
  buildSamplePdfBytes,
  extractTextFromPdfBytes,
  validateUploadFile,
} from '../engine/textCleaner';
import { SAMPLE_SCANNED_NOTICES, type ScannedNoticeSample } from '../data/seedData';

interface DocumentManagerViewProps {
  documents: CampusDocument[];
  onAddDocument: (payload: {
    title: string;
    fileName: string;
    fileType: FileSourceType;
    fileSizeBytes: number;
    rawText: string;
    ocrApplied: boolean;
  }) => void;
  onDeleteDocument: (docId: string) => void;
  onInspectDocument: (docId: string) => void;
}

type IngestionMode = 'file' | 'ocr' | 'paste';

function renderSyntheticScanToCanvas(
  canvas: HTMLCanvasElement,
  sample: ScannedNoticeSample
): ImageData {
  const width = 560;
  const height = 340;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  // Uneven scanned paper lighting gradient
  const grad = ctx.createLinearGradient(0, 0, width, height);
  grad.addColorStop(0, '#ebe8dc');
  grad.addColorStop(0.55, '#dcd8c8');
  grad.addColorStop(1, '#c5c0ae');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  // Subtle scanner noise speckles
  for (let i = 0; i < 2400; i++) {
    const x = (i * 73) % width;
    const y = (i * 137) % height;
    const shade = i % 2 === 0 ? 'rgba(90,85,70,0.16)' : 'rgba(255,255,255,0.2)';
    ctx.fillStyle = shade;
    ctx.fillRect(x, y, 2, 2);
  }

  // Printed notice text
  ctx.fillStyle = '#2d2b26';
  sample.lines.forEach((line, idx) => {
    ctx.font = idx === 0 ? 'bold 16px monospace' : '13px monospace';
    ctx.fillText(line, 28, 46 + idx * 27);
  });

  return ctx.getImageData(0, 0, width, height);
}

export const DocumentManagerView: React.FC<DocumentManagerViewProps> = ({
  documents,
  onAddDocument,
  onDeleteDocument,
  onInspectDocument,
}) => {
  const [mode, setMode] = useState<IngestionMode>('file');
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // File upload state
  const [pendingFileMeta, setPendingFileMeta] = useState<{
    title: string;
    fileName: string;
    fileType: FileSourceType;
    fileSizeBytes: number;
    extractedText: string;
  } | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);

  // Paste text form state
  const [pasteTitle, setPasteTitle] = useState('');
  const [pasteText, setPasteText] = useState('');

  // OpenCV Image Scanner & OCR Lab state
  const origCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const procCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [sourceImageData, setSourceImageData] = useState<ImageData | null>(null);
  const [ocrTitle, setOcrTitle] = useState(SAMPLE_SCANNED_NOTICES[0].title);
  const [ocrFileName, setOcrFileName] = useState(SAMPLE_SCANNED_NOTICES[0].fileName);
  const [ocrExtractedText, setOcrExtractedText] = useState(
    SAMPLE_SCANNED_NOTICES[0].extractedText
  );
  const [showLineBoxes, setShowLineBoxes] = useState(true);
  const [cvStats, setCvStats] = useState<ImageStats | null>(null);
  const [cvOptions, setCvOptions] = useState<CVPreprocessingOptions>({
    grayscale: true,
    denoise: true,
    contrastStretch: true,
    binarize: true,
    binarizeMode: 'otsu',
    manualThreshold: 135,
  });

  // Repository filtering state
  const [repoSearch, setRepoSearch] = useState('');
  const [repoCategory, setRepoCategory] = useState<'ALL' | DocumentCategory>('ALL');

  // Initialize default scanned image when switching to OCR lab
  useEffect(() => {
    if (mode !== 'ocr') return;
    if (!sourceImageData && origCanvasRef.current) {
      const imgData = renderSyntheticScanToCanvas(
        origCanvasRef.current,
        SAMPLE_SCANNED_NOTICES[0]
      );
      setSourceImageData(imgData);
    }
  }, [mode, sourceImageData]);

  // Run real OpenCV pixel pipeline whenever image or CV parameters change
  useEffect(() => {
    if (mode !== 'ocr' || !sourceImageData || !procCanvasRef.current) return;
    const { width, height, data } = sourceImageData;
    const { outputRgba, stats, lineBoxes } = runCvPreprocessingPipeline(
      data,
      width,
      height,
      cvOptions
    );
    setCvStats(stats);

    const canvas = procCanvasRef.current;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;
    const outImg = new ImageData(new Uint8ClampedArray(outputRgba), width, height);
    ctx.putImageData(outImg, 0, 0);

    if (showLineBoxes && lineBoxes.length > 0) {
      ctx.strokeStyle = 'rgba(29, 78, 216, 0.72)';
      ctx.lineWidth = 1.25;
      lineBoxes.forEach((box: TextLineBox) => {
        ctx.strokeRect(
          Math.max(0, box.xStart - 2),
          Math.max(0, box.yStart - 2),
          box.xEnd - box.xStart + 4,
          box.yEnd - box.yStart + 4
        );
      });
    }
  }, [mode, sourceImageData, cvOptions, showLineBoxes]);

  const handleLoadSampleScan = (sample: ScannedNoticeSample) => {
    setStatusMessage(null);
    if (!origCanvasRef.current) return;
    const imgData = renderSyntheticScanToCanvas(origCanvasRef.current, sample);
    setSourceImageData(imgData);
    setOcrTitle(sample.title);
    setOcrFileName(sample.fileName);
    setOcrExtractedText(sample.extractedText);
  };

  const handleImageFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    setStatusMessage(null);
    const file = event.target.files?.[0];
    if (!file) return;

    const validation = validateUploadFile(file);
    if (!validation.valid || validation.fileType !== 'IMAGE') {
      setStatusMessage({
        type: 'error',
        text: validation.error ?? 'Please select a PNG, JPG, or JPEG scanned notice image.',
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        if (!origCanvasRef.current) return;
        const maxW = 560;
        const scale = Math.min(1, maxW / img.width);
        const w = Math.max(120, Math.round(img.width * scale));
        const h = Math.max(80, Math.round(img.height * scale));
        origCanvasRef.current.width = w;
        origCanvasRef.current.height = h;
        const ctx = origCanvasRef.current.getContext('2d')!;
        ctx.drawImage(img, 0, 0, w, h);
        const imgData = ctx.getImageData(0, 0, w, h);
        setSourceImageData(imgData);
        const baseTitle = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]+/g, ' ');
        setOcrTitle(baseTitle);
        setOcrFileName(file.name);
        setOcrExtractedText(
          `[Image preprocessed via OpenCV pipeline: ${w}x${h}px. Verify or type the scanned notice text below before indexing into the NLP & Vector Database.]`
        );
        setStatusMessage({
          type: 'success',
          text: `Loaded "${file.name}" into OpenCV preprocessing pipeline. Review detected text lines and verify OCR transcript before indexing.`,
        });
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  const handleDocumentFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    setStatusMessage(null);
    const file = event.target.files?.[0];
    if (!file) return;

    const validation = validateUploadFile(file);
    if (!validation.valid) {
      setStatusMessage({ type: 'error', text: validation.error ?? 'Invalid file selected.' });
      event.target.value = '';
      return;
    }

    if (validation.fileType === 'IMAGE') {
      setMode('ocr');
      handleImageFileSelect(event);
      return;
    }

    setIsExtracting(true);
    try {
      let extracted = '';
      if (validation.fileType === 'TXT') {
        extracted = await file.text();
      } else if (validation.fileType === 'PDF') {
        const buf = await file.arrayBuffer();
        extracted = await extractTextFromPdfBytes(new Uint8Array(buf));
      }

      if (!extracted.trim()) {
        throw new Error('No readable text could be extracted from this file.');
      }

      const defaultTitle = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]+/g, ' ');
      setPendingFileMeta({
        title: defaultTitle,
        fileName: file.name,
        fileType: validation.fileType!,
        fileSizeBytes: file.size,
        extractedText: extracted,
      });
      setStatusMessage({
        type: 'success',
        text: `Extracted ${extracted.split(/\s+/).length} words from "${file.name}". Review and click "Process & Index Document".`,
      });
    } catch (err) {
      setPendingFileMeta(null);
      setStatusMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to extract text from file.',
      });
    } finally {
      setIsExtracting(false);
      event.target.value = '';
    }
  };

  const handleDownloadSamplePdf = () => {
    const bytes = buildSamplePdfBytes('Department of Computer Applications - AI Workshop Notice', [
      'Notice Ref: DCA/2026/91   Date: 17 November 2026',
      'A hands-on workshop on Natural Language Processing, TF-IDF classification, and FAISS semantic search',
      'will be conducted on 5 December 2026 at Seminar Hall A from 10:00 AM to 4:00 PM.',
      'Course codes eligible: BCA-501, BCA-502, and MCA Semester III.',
      'Registration fee is Rs. 250 via the Student Portal. Last date to register is 1 December 2026.',
      'Coordinator: Dr. Meera Nair, Department of Computer Applications.',
    ]);
    const blob = new Blob([new Uint8Array(bytes)], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Sample_AI_Workshop_Notice.pdf';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleIndexPendingFile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingFileMeta) {
      setStatusMessage({ type: 'error', text: 'Please select a PDF or TXT file first.' });
      return;
    }
    if (!pendingFileMeta.title.trim() || pendingFileMeta.extractedText.trim().length < 20) {
      setStatusMessage({
        type: 'error',
        text: 'Document title and at least 20 characters of extracted text are required.',
      });
      return;
    }
    onAddDocument({
      title: pendingFileMeta.title.trim(),
      fileName: pendingFileMeta.fileName,
      fileType: pendingFileMeta.fileType,
      fileSizeBytes: pendingFileMeta.fileSizeBytes,
      rawText: pendingFileMeta.extractedText,
      ocrApplied: false,
    });
    setStatusMessage({
      type: 'success',
      text: `Indexed "${pendingFileMeta.title.trim()}" through NLP, Classifier, and Vector Store.`,
    });
    setPendingFileMeta(null);
  };

  const handleIndexOcrDocument = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ocrTitle.trim() || ocrExtractedText.trim().length < 20) {
      setStatusMessage({
        type: 'error',
        text: 'Please provide a notice title and at least 20 characters of verified OCR text.',
      });
      return;
    }
    onAddDocument({
      title: ocrTitle.trim(),
      fileName: ocrFileName,
      fileType: 'IMAGE',
      fileSizeBytes: sourceImageData ? sourceImageData.data.length : 145000,
      rawText: ocrExtractedText,
      ocrApplied: true,
    });
    setStatusMessage({
      type: 'success',
      text: `OCR document "${ocrTitle.trim()}" preprocessed, classified, and added to the Vector Index.`,
    });
  };

  const handleIndexPastedNotice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pasteTitle.trim()) {
      setStatusMessage({ type: 'error', text: 'Please enter a document title before indexing.' });
      return;
    }
    if (pasteText.trim().length < 25) {
      setStatusMessage({
        type: 'error',
        text: 'Please enter at least 25 characters of campus notice content so NLP and ML models can analyze it.',
      });
      return;
    }
    const safeFileName = `${pasteTitle
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .slice(0, 36)}.txt`;
    onAddDocument({
      title: pasteTitle.trim(),
      fileName: safeFileName,
      fileType: 'TXT',
      fileSizeBytes: new TextEncoder().encode(pasteText).length,
      rawText: pasteText,
      ocrApplied: false,
    });
    setStatusMessage({
      type: 'success',
      text: `Indexed "${pasteTitle.trim()}" successfully. Entities, category, and vector chunks are live.`,
    });
    setPasteTitle('');
    setPasteText('');
  };

  const filteredDocs = documents.filter((doc) => {
    const matchesCat =
      repoCategory === 'ALL' || doc.classification.activeCategory === repoCategory;
    const q = repoSearch.trim().toLowerCase();
    const matchesQuery =
      !q ||
      doc.title.toLowerCase().includes(q) ||
      doc.fileName.toLowerCase().includes(q) ||
      doc.cleanedText.toLowerCase().includes(q);
    return matchesCat && matchesQuery;
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <p className="text-xs font-medium text-blue-700">Module 1 · Ingestion, OpenCV & Validation</p>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-1">
            Document Upload & OpenCV OCR Lab
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Upload PDF, TXT, or scanned campus images. Every document is validated, normalized,
            entity-extracted, auto-classified, and embedded into the vector store.
          </p>
        </div>
        <button
          type="button"
          onClick={handleDownloadSamplePdf}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap shrink-0"
        >
          <Download className="w-3.5 h-3.5" aria-hidden="true" />
          Download Sample PDF
        </button>
      </div>

      {/* Mode Switcher */}
      <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-6">
        <div
          className="inline-flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg"
          role="tablist"
          aria-label="Document ingestion methods"
        >
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'file'}
            onClick={() => {
              setMode('file');
              setStatusMessage(null);
            }}
            className={`inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              mode === 'file'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Upload className="w-3.5 h-3.5" aria-hidden="true" />
            Upload PDF / TXT / Image
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'ocr'}
            onClick={() => {
              setMode('ocr');
              setStatusMessage(null);
            }}
            className={`inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              mode === 'ocr'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ScanLine className="w-3.5 h-3.5" aria-hidden="true" />
            OpenCV Image Scanner & OCR
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'paste'}
            onClick={() => {
              setMode('paste');
              setStatusMessage(null);
            }}
            className={`inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              mode === 'paste'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5" aria-hidden="true" />
            Create / Paste Notice Text
          </button>
        </div>

        {/* Status Alert */}
        {statusMessage && (
          <div
            role="status"
            className={`flex items-start gap-2.5 p-3.5 rounded-lg border text-sm ${
              statusMessage.type === 'error'
                ? 'bg-red-50 border-red-200 text-red-800'
                : 'bg-emerald-50 border-emerald-200 text-emerald-800'
            }`}
          >
            {statusMessage.type === 'error' ? (
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
            ) : (
              <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
            )}
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* TAB 1: File Upload */}
        {mode === 'file' && (
          <div className="space-y-5">
            <div className="border-2 border-dashed border-slate-200 rounded-lg p-8 text-center bg-slate-50/50">
              <Upload className="w-8 h-8 text-slate-400 mx-auto mb-3" aria-hidden="true" />
              <p className="text-sm font-semibold text-slate-900">
                Select a college circular (PDF, TXT, PNG, JPG)
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Max 10 MB · PDF text streams are parsed locally; images route directly into OpenCV preprocessing
              </p>
              <div className="mt-4">
                <label className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg cursor-pointer transition-colors">
                  <Upload className="w-3.5 h-3.5" aria-hidden="true" />
                  {isExtracting ? 'Extracting Text...' : 'Choose File'}
                  <input
                    type="file"
                    accept=".pdf,.txt,.png,.jpg,.jpeg"
                    onChange={handleDocumentFileSelect}
                    className="sr-only"
                  />
                </label>
              </div>
            </div>

            {pendingFileMeta && (
              <form onSubmit={handleIndexPendingFile} className="space-y-4 pt-2 border-t border-slate-200">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="upload-doc-title"
                      className="block text-xs font-medium text-slate-700 mb-1.5"
                    >
                      Document Title
                    </label>
                    <input
                      id="upload-doc-title"
                      type="text"
                      value={pendingFileMeta.title}
                      onChange={(e) =>
                        setPendingFileMeta({ ...pendingFileMeta, title: e.target.value })
                      }
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                  <div className="flex items-end">
                    <p className="text-xs text-slate-500 font-mono pb-2">
                      File: {pendingFileMeta.fileName} · {pendingFileMeta.fileType} ·{' '}
                      {(pendingFileMeta.fileSizeBytes / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </div>
                <div>
                  <label
                    htmlFor="upload-extracted-preview"
                    className="block text-xs font-medium text-slate-700 mb-1.5"
                  >
                    Extracted & Normalized Text Preview
                  </label>
                  <textarea
                    id="upload-extracted-preview"
                    rows={5}
                    value={pendingFileMeta.extractedText}
                    onChange={(e) =>
                      setPendingFileMeta({ ...pendingFileMeta, extractedText: e.target.value })
                    }
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setPendingFileMeta(null)}
                    className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors"
                  >
                    Process & Index Document
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* TAB 2: OpenCV Image Scanner & OCR Preprocessing Lab */}
        {mode === 'ocr' && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-200">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium text-slate-600">Load Sample Scan:</span>
                {SAMPLE_SCANNED_NOTICES.map((sample) => (
                  <button
                    key={sample.id}
                    type="button"
                    onClick={() => handleLoadSampleScan(sample)}
                    className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors whitespace-nowrap"
                  >
                    {sample.label}
                  </button>
                ))}
              </div>
              <label className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md cursor-pointer transition-colors whitespace-nowrap">
                <FileImage className="w-3.5 h-3.5" aria-hidden="true" />
                Upload Scanned Image
                <input
                  type="file"
                  accept=".png,.jpg,.jpeg"
                  onChange={handleImageFileSelect}
                  className="sr-only"
                />
              </label>
            </div>

            {/* CV Controls */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-4 space-y-4">
                <h3 className="text-sm font-semibold text-slate-900">
                  OpenCV Preprocessing Controls
                </h3>
                <div className="space-y-2.5 text-xs text-slate-700">
                  <label className="flex items-center justify-between gap-2 cursor-pointer">
                    <span>1. Grayscale (BT.601 Luminance)</span>
                    <input
                      type="checkbox"
                      checked={cvOptions.grayscale}
                      onChange={(e) =>
                        setCvOptions({ ...cvOptions, grayscale: e.target.checked })
                      }
                      className="rounded border-slate-300 text-blue-700"
                    />
                  </label>
                  <label className="flex items-center justify-between gap-2 cursor-pointer">
                    <span>2. Gaussian Blur Denoise (3×3)</span>
                    <input
                      type="checkbox"
                      checked={cvOptions.denoise}
                      onChange={(e) =>
                        setCvOptions({ ...cvOptions, denoise: e.target.checked })
                      }
                      className="rounded border-slate-300 text-blue-700"
                    />
                  </label>
                  <label className="flex items-center justify-between gap-2 cursor-pointer">
                    <span>3. Histogram Contrast Stretch</span>
                    <input
                      type="checkbox"
                      checked={cvOptions.contrastStretch}
                      onChange={(e) =>
                        setCvOptions({ ...cvOptions, contrastStretch: e.target.checked })
                      }
                      className="rounded border-slate-300 text-blue-700"
                    />
                  </label>
                  <label className="flex items-center justify-between gap-2 cursor-pointer">
                    <span>4. Threshold Binarization</span>
                    <input
                      type="checkbox"
                      checked={cvOptions.binarize}
                      onChange={(e) =>
                        setCvOptions({ ...cvOptions, binarize: e.target.checked })
                      }
                      className="rounded border-slate-300 text-blue-700"
                    />
                  </label>
                  <label className="flex items-center justify-between gap-2 cursor-pointer">
                    <span>5. Text-Line Bounding Boxes</span>
                    <input
                      type="checkbox"
                      checked={showLineBoxes}
                      onChange={(e) => setShowLineBoxes(e.target.checked)}
                      className="rounded border-slate-300 text-blue-700"
                    />
                  </label>
                </div>

                {cvOptions.binarize && (
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <label
                      htmlFor="binarize-mode-select"
                      className="block text-xs font-medium text-slate-700"
                    >
                      Thresholding Algorithm
                    </label>
                    <select
                      id="binarize-mode-select"
                      value={cvOptions.binarizeMode}
                      onChange={(e) =>
                        setCvOptions({
                          ...cvOptions,
                          binarizeMode: e.target.value as 'otsu' | 'adaptive' | 'manual',
                        })
                      }
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-md bg-white"
                    >
                      <option value="otsu">Otsu Automatic Global Threshold</option>
                      <option value="adaptive">Adaptive Local Mean (Integral Image)</option>
                      <option value="manual">Manual Threshold</option>
                    </select>
                    {cvOptions.binarizeMode === 'manual' && (
                      <div>
                        <div className="flex justify-between text-xs text-slate-600 font-mono">
                          <span>Cutoff</span>
                          <span>{cvOptions.manualThreshold}</span>
                        </div>
                        <input
                          type="range"
                          min={40}
                          max={220}
                          value={cvOptions.manualThreshold}
                          onChange={(e) =>
                            setCvOptions({
                              ...cvOptions,
                              manualThreshold: Number(e.target.value),
                            })
                          }
                          aria-label="Manual binarization threshold"
                          className="w-full accent-blue-700"
                        />
                      </div>
                    )}
                  </div>
                )}

                {cvStats && (
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-2 pt-3 border-t border-slate-200 text-xs">
                    <div>
                      <dt className="text-slate-500">Optimal Otsu (t*)</dt>
                      <dd className="font-mono font-semibold text-slate-900 tabular-nums">
                        {cvStats.otsuThreshold} / 255
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Detected Text Lines</dt>
                      <dd className="font-mono font-semibold text-blue-700 tabular-nums">
                        {cvStats.detectedLines} lines
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Contrast StdDev</dt>
                      <dd className="font-mono font-semibold text-slate-900 tabular-nums">
                        {cvStats.contrastStdDev}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Ink Coverage</dt>
                      <dd className="font-mono font-semibold text-slate-900 tabular-nums">
                        {cvStats.inkCoveragePercent}%
                      </dd>
                    </div>
                  </dl>
                )}
              </div>

              {/* Canvases */}
              <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-slate-600">
                    Raw Scanned Document Input
                  </p>
                  <div className="border border-slate-200 rounded-lg overflow-hidden bg-slate-100">
                    <canvas
                      ref={origCanvasRef}
                      data-testid="cv-original-canvas"
                      className="w-full h-auto block"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-slate-600">
                    OpenCV Preprocessed Output (OCR Ready)
                  </p>
                  <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
                    <canvas
                      ref={procCanvasRef}
                      data-testid="cv-processed-canvas"
                      className="w-full h-auto block"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* OCR Verification & Ingestion Form */}
            <form onSubmit={handleIndexOcrDocument} className="space-y-4 pt-4 border-t border-slate-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="ocr-doc-title"
                    className="block text-xs font-medium text-slate-700 mb-1.5"
                  >
                    Notice Title
                  </label>
                  <input
                    id="ocr-doc-title"
                    type="text"
                    value={ocrTitle}
                    onChange={(e) => setOcrTitle(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
                <div className="flex items-end">
                  <p className="text-xs text-slate-500 font-mono pb-2">
                    Source: {ocrFileName} · Pipeline: OpenCV + Text Segmentation
                  </p>
                </div>
              </div>
              <div>
                <label
                  htmlFor="ocr-extracted-text"
                  className="block text-xs font-medium text-slate-700 mb-1.5"
                >
                  OCR Extracted Text (Editable for Verification)
                </label>
                <textarea
                  id="ocr-extracted-text"
                  rows={4}
                  value={ocrExtractedText}
                  onChange={(e) => setOcrExtractedText(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors"
                >
                  Index OCR Document into Campus AI
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TAB 3: Paste / Author New Notice */}
        {mode === 'paste' && (
          <form onSubmit={handleIndexPastedNotice} className="space-y-4">
            <div>
              <label
                htmlFor="paste-notice-title"
                className="block text-xs font-medium text-slate-700 mb-1.5"
              >
                Notice Title
              </label>
              <input
                id="paste-notice-title"
                type="text"
                placeholder="e.g., BCA Semester VI Practical Exam Schedule — April 2027"
                value={pasteTitle}
                onChange={(e) => setPasteTitle(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
            <div>
              <label
                htmlFor="paste-notice-body"
                className="block text-xs font-medium text-slate-700 mb-1.5"
              >
                Notice Content
              </label>
              <textarea
                id="paste-notice-body"
                rows={5}
                placeholder="Paste any college announcement, timetable, fee circular, holiday notice, or event brochure here..."
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                className="px-4 py-2 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors"
              >
                Process & Index Notice
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Document Management Repository */}
      <section className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Document Repository ({filteredDocs.length} of {documents.length})
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Deleting or adding a document automatically synchronizes the vector search index
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search
                className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"
                aria-hidden="true"
              />
              <input
                type="search"
                value={repoSearch}
                onChange={(e) => setRepoSearch(e.target.value)}
                placeholder="Filter documents..."
                aria-label="Filter documents by keyword"
                className="pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg w-52 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
            <select
              value={repoCategory}
              onChange={(e) => setRepoCategory(e.target.value as 'ALL' | DocumentCategory)}
              aria-label="Filter documents by category"
              className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white text-slate-700"
            >
              <option value="ALL">All Categories</option>
              {DOCUMENT_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        {filteredDocs.length === 0 ? (
          <div className="py-10 text-center border-t border-slate-100">
            <p className="text-sm font-medium text-slate-700">No matching documents found</p>
            <p className="text-xs text-slate-500 mt-1">
              Clear your search filter or upload a new college circular above.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-medium text-slate-500">
                  <th className="py-2.5 pr-4">Title & File</th>
                  <th className="py-2.5 pr-4">Category</th>
                  <th className="py-2.5 pr-4 text-right">Words</th>
                  <th className="py-2.5 pr-4 text-right">Chunks</th>
                  <th className="py-2.5 pr-4 text-right">Deadlines</th>
                  <th className="py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredDocs.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-50">
                    <td className="py-3 pr-4">
                      <p className="font-medium text-slate-900">{doc.title}</p>
                      <p className="text-xs text-slate-500">
                        {doc.fileName} · {doc.fileType}
                        {doc.ocrApplied ? ' (OCR)' : ''} · Uploaded {doc.uploadedAt}
                      </p>
                    </td>
                    <td className="py-3 pr-4 text-xs font-medium text-slate-700 whitespace-nowrap">
                      {doc.classification.activeCategory}
                    </td>
                    <td className="py-3 pr-4 text-right font-mono text-xs text-slate-700 tabular-nums">
                      {doc.nlp.cleanedWordCount}
                    </td>
                    <td className="py-3 pr-4 text-right font-mono text-xs text-slate-700 tabular-nums">
                      {doc.chunkCount}
                    </td>
                    <td className="py-3 pr-4 text-right font-mono text-xs text-slate-700 tabular-nums">
                      {doc.nlp.deadlines.length}
                    </td>
                    <td className="py-3 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => onInspectDocument(doc.id)}
                          aria-label={`Inspect NLP for ${doc.title}`}
                          className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:underline"
                        >
                          <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                          Inspect
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteDocument(doc.id)}
                          aria-label={`Delete ${doc.title}`}
                          className="inline-flex items-center gap-1 text-xs font-medium text-red-600 hover:underline"
                        >
                          <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                          Remove
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};
