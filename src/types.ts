export type DocumentCategory =
  | 'Examination announcements'
  | 'Academic notices'
  | 'Fee-related announcements'
  | 'College events'
  | 'Holidays'
  | 'General announcements';

export const DOCUMENT_CATEGORIES: DocumentCategory[] = [
  'Examination announcements',
  'Academic notices',
  'Fee-related announcements',
  'College events',
  'Holidays',
  'General announcements',
];

export type FileSourceType = 'PDF' | 'TXT' | 'IMAGE';

export interface FileValidationResult {
  valid: boolean;
  error?: string;
  fileType?: FileSourceType;
}

export interface TokenAnalysis {
  original: string;
  normalized: string;
  isStopWord: boolean;
  stem: string;
  lemma: string;
  pos: string;
  posLabel: string;
}

export type EntityType =
  | 'DATE'
  | 'DEADLINE'
  | 'COURSE'
  | 'DEPARTMENT'
  | 'FEE'
  | 'VENUE'
  | 'AUTHORITY';

export interface ExtractedEntity {
  text: string;
  type: EntityType;
  context: string;
  confidence: number;
}

export interface NLPResult {
  rawWordCount: number;
  cleanedWordCount: number;
  sentenceCount: number;
  vocabularySize: number;
  lexicalDiversity: number;
  sentences: string[];
  tokens: TokenAnalysis[];
  filteredTokens: string[];
  topKeywords: Array<{ term: string; count: number }>;
  entities: ExtractedEntity[];
  deadlines: Array<{ date: string; description: string }>;
}

export interface CategoryScore {
  category: DocumentCategory;
  probability: number;
}

export interface ClassificationModelOutput {
  modelName: 'TF-IDF + Naive Bayes' | 'Transformer Semantic Encoder';
  predictedCategory: DocumentCategory;
  confidence: number;
  scores: CategoryScore[];
  topFeatures: string[];
}

export interface DocumentClassification {
  baseline: ClassificationModelOutput;
  transformer: ClassificationModelOutput;
  activeCategory: DocumentCategory;
  modelsAgree: boolean;
}

export interface CampusDocument {
  id: string;
  title: string;
  fileName: string;
  fileType: FileSourceType;
  fileSizeBytes: number;
  uploadedAt: string;
  rawText: string;
  cleanedText: string;
  ocrApplied: boolean;
  nlp: NLPResult;
  classification: DocumentClassification;
  chunkCount: number;
}

export type SentimentLabel = 'Positive' | 'Negative' | 'Neutral';

export interface TokenSentimentContribution {
  token: string;
  weight: number;
  role: 'positive' | 'negative' | 'negator' | 'intensifier' | 'contrast' | 'neutral';
}

export interface SentimentResult {
  label: SentimentLabel;
  polarity: number; // -1 to +1
  confidence: number; // 0 to 1
  scores: {
    positive: number;
    neutral: number;
    negative: number;
  };
  baselineLabel: SentimentLabel;
  baselinePolarity: number;
  aspect: string;
  tokenContributions: TokenSentimentContribution[];
  explanation: string;
}

export interface StudentFeedback {
  id: string;
  studentName: string;
  department: string;
  semester: string;
  submittedAt: string;
  text: string;
  analysis: SentimentResult;
}

export interface DocumentChunk {
  id: string;
  documentId: string;
  documentTitle: string;
  category: DocumentCategory;
  chunkIndex: number;
  text: string;
  embedding: number[];
}

export interface SearchHit {
  chunkId: string;
  documentId: string;
  documentTitle: string;
  category: DocumentCategory;
  text: string;
  score: number;
  matchedTerms: string[];
  rank: number;
}

export interface AssistantCitation {
  documentId: string;
  documentTitle: string;
  category: DocumentCategory;
  excerpt: string;
  similarity: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  grounded?: boolean;
  citations?: AssistantCitation[];
  intentDetected?: string;
}

export interface ClassifierMetricsReport {
  modelName: string;
  accuracy: number;
  macroPrecision: number;
  macroRecall: number;
  macroF1: number;
  perClass: Array<{
    category: DocumentCategory;
    precision: number;
    recall: number;
    f1: number;
    support: number;
  }>;
  confusionMatrix: number[][];
}

export interface CVPreprocessingOptions {
  grayscale: boolean;
  denoise: boolean;
  contrastStretch: boolean;
  binarize: boolean;
  binarizeMode: 'otsu' | 'adaptive' | 'manual';
  manualThreshold: number;
}

export interface ImageStats {
  width: number;
  height: number;
  meanLuminance: number;
  contrastStdDev: number;
  otsuThreshold: number;
  inkCoveragePercent: number;
  detectedLines: number;
}

export type NavSection =
  | 'overview'
  | 'documents'
  | 'nlp'
  | 'classification'
  | 'search'
  | 'assistant'
  | 'sentiment'
  | 'report';
