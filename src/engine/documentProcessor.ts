import type { CampusDocument, FileSourceType } from '../types';
import { classifyDocument } from './classifier';
import { runNlpPipeline } from './nlpPipeline';
import { cleanDocumentText } from './textCleaner';
import { chunkDocument } from './vectorStore';

export interface ProcessDocumentInput {
  id?: string;
  title: string;
  fileName: string;
  fileType: FileSourceType;
  fileSizeBytes: number;
  rawText: string;
  ocrApplied?: boolean;
  uploadedAt?: string;
  preferredClassifier?: 'baseline' | 'transformer';
}

/**
 * End-to-end document ingestion pipeline:
 * Module 1 (Clean/Normalize) -> Module 2 (NLP & NER) -> Module 3 (Auto-Classify) -> Module 5 (Chunk count)
 */
export function processCampusDocument(input: ProcessDocumentInput): CampusDocument {
  const cleanedText = cleanDocumentText(input.rawText);
  if (!cleanedText) {
    throw new Error('Extracted text is empty after cleaning. Please verify the document content.');
  }

  const nlp = runNlpPipeline(cleanedText);
  const classification = classifyDocument(
    `${input.title}. ${cleanedText}`,
    input.preferredClassifier ?? 'transformer'
  );

  const id = input.id ?? `doc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const chunks = chunkDocument({
    id,
    title: input.title,
    cleanedText,
    classification,
  });

  return {
    id,
    title: input.title.trim(),
    fileName: input.fileName,
    fileType: input.fileType,
    fileSizeBytes: input.fileSizeBytes,
    uploadedAt: input.uploadedAt ?? new Date().toISOString().slice(0, 10),
    rawText: input.rawText,
    cleanedText,
    ocrApplied: Boolean(input.ocrApplied),
    nlp,
    classification,
    chunkCount: chunks.length,
  };
}
