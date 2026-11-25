import type { CampusDocument, DocumentChunk, SearchHit } from '../types';
import { lemmatizeToken, STOP_WORDS, tokenizeWords } from './nlpPipeline';
import { splitSentences } from './textCleaner';

/**
 * 128-dimensional dense semantic embedding space:
 * - Dimensions 0..47: Domain-calibrated Latent Semantic Concept Axes
 *   (groups synonyms, paraphrases, and campus concepts onto shared dense axes
 *    so semantic search retrieves relevant notices even with zero exact keyword overlap).
 * - Dimensions 48..127: Character 3-gram & lexical locality-sensitive signed random projections
 *   (captures morphological similarity, course codes, names, dates, and OOV terms).
 */
export const EMBEDDING_DIM = 256;
export const CONCEPT_AXES_COUNT = 48;
const PROJECTION_SLOTS = EMBEDDING_DIM - CONCEPT_AXES_COUNT;

interface ConceptCluster {
  axis: number;
  weight: number;
  terms: string[];
}

const SEMANTIC_CLUSTERS: ConceptCluster[] = [
  // Exams & assessments (axes 0..7)
  { axis: 0, weight: 2.2, terms: ['exam', 'examination', 'test', 'assessment', 'midterm', 'endterm', 'quiz', 'paper', 'evaluation', 'viva', 'practical'] },
  { axis: 1, weight: 2.0, terms: ['timetable', 'schedule', 'date', 'slot', 'timing', 'morning', 'afternoon', 'session', 'calendar', 'when'] },
  { axis: 2, weight: 2.0, terms: ['hall', 'ticket', 'admit', 'card', 'seat', 'seating', 'roll', 'invigilator', 'center', 'room'] },
  { axis: 3, weight: 1.9, terms: ['revaluation', 'recheck', 'backlog', 'arrear', 'supplementary', 'result', 'grade', 'mark', 'score', 'pass', 'fail'] },
  { axis: 4, weight: 1.8, terms: ['project', 'capstone', 'thesis', 'presentation', 'report', 'synopsis', 'dissertation', 'defense', 'mentor', 'guide'] },
  // Fees & finance (axes 8..14)
  { axis: 8, weight: 2.4, terms: ['fee', 'tuition', 'dues', 'payment', 'pay', 'charge', 'cost', 'amount', 'price', 'money', 'rupee', 'rs', 'inr', 'bill'] },
  { axis: 9, weight: 2.2, terms: ['challan', 'upi', 'neft', 'portal', 'receipt', 'remit', 'bank', 'account', 'finance', 'online', 'installment', 'deposit'] },
  { axis: 10, weight: 2.1, terms: ['fine', 'penalty', 'late', 'overdue', 'surcharge', 'clearance', 'refund', 'caution', 'waiver'] },
  { axis: 11, weight: 2.1, terms: ['scholarship', 'grant', 'aid', 'stipend', 'financial', 'merit', 'reimbursement', 'concession', 'discount'] },
  { axis: 12, weight: 1.8, terms: ['hostel', 'mess', 'accommodation', 'transport', 'bus', 'pass'] },
  // Academics & coursework (axes 15..22)
  { axis: 15, weight: 2.2, terms: ['attendance', 'present', 'absent', 'shortage', 'condonation', 'percentage', 'mandatory', 'minimum', 'class', 'lecture'] },
  { axis: 16, weight: 2.1, terms: ['syllabus', 'curriculum', 'course', 'subject', 'elective', 'credit', 'module', 'semester', 'registration', 'enroll'] },
  { axis: 17, weight: 2.0, terms: ['assignment', 'homework', 'submission', 'submit', 'deadline', 'due', 'last', 'cutoff', 'before', 'closing'] },
  { axis: 18, weight: 2.0, terms: ['internship', 'placement', 'career', 'resume', 'interview', 'company', 'recruiter', 'job', 'training', 'industry'] },
  { axis: 19, weight: 1.9, terms: ['bca', 'mca', 'btech', 'computer', 'application', 'science', 'ai', 'ml', 'nlp', 'python', 'data', 'machine', 'learning', 'deep'] },
  { axis: 20, weight: 1.8, terms: ['department', 'faculty', 'professor', 'hod', 'dean', 'registrar', 'academic', 'office', 'authority', 'dr', 'prof'] },
  // Events & campus life (axes 23..29)
  { axis: 23, weight: 2.3, terms: ['event', 'fest', 'techfest', 'hackathon', 'competition', 'contest', 'championship', 'tournament', 'celebration'] },
  { axis: 24, weight: 2.2, terms: ['workshop', 'seminar', 'symposium', 'conference', 'webinar', 'lecture', 'bootcamp', 'talk', 'keynote', 'speaker', 'guest'] },
  { axis: 25, weight: 2.0, terms: ['register', 'participate', 'team', 'prize', 'certificate', 'award', 'win', 'club', 'society', 'cultural', 'sport'] },
  { axis: 26, weight: 1.9, terms: ['auditorium', 'venue', 'hall', 'amphitheater', 'ground', 'center', 'complex', 'where', 'location', 'block'] },
  // Holidays & closures (axes 30..35)
  { axis: 30, weight: 2.4, terms: ['holiday', 'vacation', 'break', 'recess', 'off', 'closed', 'closure', 'suspend', 'cancel', 'leave'] },
  { axis: 31, weight: 2.2, terms: ['festival', 'christmas', 'diwali', 'new', 'year', 'republic', 'national', 'public', 'gazetted', 'winter', 'summer', 'autumn'] },
  { axis: 32, weight: 1.9, terms: ['reopen', 'resume', 'rain', 'weather', 'alert'] },
  // Campus facilities & general (axes 36..44)
  { axis: 36, weight: 2.2, terms: ['library', 'book', 'reading', 'borrow', 'return', 'journal', 'study', 'quiet', 'hour', 'open'] },
  { axis: 37, weight: 2.2, terms: ['wifi', 'internet', 'network', 'portal', 'maintenance', 'server', 'downtime', 'password', 'login', 'intranet', 'it'] },
  { axis: 38, weight: 2.1, terms: ['lab', 'laboratory', 'computer', 'software', 'hardware', 'system', 'workstation', 'printer', 'kiosk'] },
  { axis: 39, weight: 2.0, terms: ['id', 'identity', 'badge', 'biometric', 'security', 'gate', 'parking', 'shuttle', 'cafeteria', 'canteen', 'water', 'medical', 'health', 'lost', 'found'] },
  // Temporal & quantitative signals (axes 42..47)
  { axis: 42, weight: 1.5, terms: ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'] },
  { axis: 43, weight: 1.5, terms: ['am', 'pm', 'hour', 'hours', 'week', 'day', 'month', 'morning', 'evening'] },
  { axis: 44, weight: 1.4, terms: ['how', 'much', 'cost', 'rate', 'total', 'fee'] },
  { axis: 45, weight: 1.4, terms: ['who', 'contact', 'coordinator', 'chair', 'controller', 'head'] },
];

// Build fast lookup map from lemma -> list of {axis, weight}
const TERM_TO_AXES = new Map<string, Array<{ axis: number; weight: number }>>();
for (const cluster of SEMANTIC_CLUSTERS) {
  for (const term of cluster.terms) {
    const existing = TERM_TO_AXES.get(term) ?? [];
    existing.push({ axis: cluster.axis, weight: cluster.weight });
    TERM_TO_AXES.set(term, existing);
  }
}

function hashString(str: string, seed: number): number {
  let h = seed >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Generates an L2-normalized 128-dimensional dense semantic embedding for text.
 */
export function embedText(text: string): number[] {
  const vec = new Float64Array(EMBEDDING_DIM);
  const rawTokens = tokenizeWords(text);

  const lemmas: string[] = [];
  for (const tok of rawTokens) {
    const lower = tok.toLowerCase();
    if (lower.length < 2 || STOP_WORDS.has(lower)) continue;
    const lemma = /^[a-z]+$/.test(lower) ? lemmatizeToken(lower) : lower;
    lemmas.push(lemma);
  }

  for (let i = 0; i < lemmas.length; i++) {
    const lemma = lemmas[i];

    // 1. Project onto calibrated semantic concept axes (0..47)
    const directAxes = TERM_TO_AXES.get(lemma);
    if (directAxes) {
      for (const { axis, weight } of directAxes) {
        vec[axis] += weight;
      }
    } else {
      // Partial stem/substring resonance for compound academic words (e.g., "hackathon", "timetable", "rechecking")
      for (const [key, axes] of TERM_TO_AXES.entries()) {
        if (key.length >= 4 && (lemma.includes(key) || key.includes(lemma))) {
          for (const { axis, weight } of axes) {
            vec[axis] += weight * 0.65;
          }
        }
      }
    }

    // 2. Lexical random projection into dims 48..255
    const h1 = hashString(lemma, 2166136261);
    const h2 = hashString(lemma, 374761393);
    const idx1 = CONCEPT_AXES_COUNT + (h1 % PROJECTION_SLOTS);
    const idx2 = CONCEPT_AXES_COUNT + (h2 % PROJECTION_SLOTS);
    vec[idx1] += (h1 & 1) === 0 ? 0.9 : -0.9;
    vec[idx2] += (h2 & 1) === 0 ? 0.5 : -0.5;

    // 3. Character 3-grams for morphological similarity & course codes
    if (lemma.length >= 3) {
      const padded = `^${lemma}$`;
      for (let g = 0; g <= padded.length - 3; g++) {
        const gram = padded.slice(g, g + 3);
        const hg = hashString(gram, 1315423911);
        const idxG = CONCEPT_AXES_COUNT + (hg % PROJECTION_SLOTS);
        vec[idxG] += (hg & 1) === 0 ? 0.22 : -0.22;
      }
    }

    // 4. Contextual bigram hashing
    if (i + 1 < lemmas.length) {
      const bigram = `${lemma}_${lemmas[i + 1]}`;
      const hb = hashString(bigram, 2654435761);
      const idxB = CONCEPT_AXES_COUNT + (hb % PROJECTION_SLOTS);
      vec[idxB] += (hb & 1) === 0 ? 0.45 : -0.45;
    }
  }

  // L2 normalization
  let normSq = 0;
  for (let i = 0; i < EMBEDDING_DIM; i++) {
    normSq += vec[i] * vec[i];
  }
  const norm = Math.sqrt(normSq);
  const out = new Array<number>(EMBEDDING_DIM);
  if (norm > 1e-9) {
    for (let i = 0; i < EMBEDDING_DIM; i++) {
      out[i] = vec[i] / norm;
    }
  } else {
    out.fill(0);
  }
  return out;
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
  }
  return Math.max(-1, Math.min(1, dot));
}

/**
 * Splits a document into overlapping semantic chunks (sentences grouped to ~2-3 sentences
 * with 1-sentence sliding window overlap) for fine-grained vector retrieval.
 */
export function chunkDocument(doc: Pick<CampusDocument, 'id' | 'title' | 'cleanedText' | 'classification'>): DocumentChunk[] {
  const sentences = splitSentences(doc.cleanedText);
  if (sentences.length === 0) return [];

  const chunks: DocumentChunk[] = [];
  const windowSize = 3;
  const stride = 2;

  if (sentences.length <= windowSize) {
    const text = sentences.join(' ');
    chunks.push({
      id: `${doc.id}-chunk-0`,
      documentId: doc.id,
      documentTitle: doc.title,
      category: doc.classification.activeCategory,
      chunkIndex: 0,
      text,
      embedding: embedText(`${doc.title}. ${text}`),
    });
    return chunks;
  }

  let chunkIdx = 0;
  for (let start = 0; start < sentences.length; start += stride) {
    const slice = sentences.slice(start, start + windowSize);
    if (slice.length === 0) break;
    const text = slice.join(' ');
    chunks.push({
      id: `${doc.id}-chunk-${chunkIdx}`,
      documentId: doc.id,
      documentTitle: doc.title,
      category: doc.classification.activeCategory,
      chunkIndex: chunkIdx,
      text,
      embedding: embedText(`${doc.title}. ${text}`),
    });
    chunkIdx++;
    if (start + windowSize >= sentences.length) break;
  }

  return chunks;
}

/**
 * In-Memory Vector Database (FAISS FlatIP / ChromaDB Cosine Index equivalent)
 */
export class CampusVectorStore {
  private chunks: DocumentChunk[] = [];

  public buildFromDocuments(docs: CampusDocument[]): void {
    this.chunks = [];
    for (const doc of docs) {
      const docChunks = chunkDocument(doc);
      this.chunks.push(...docChunks);
    }
  }

  public getChunks(): DocumentChunk[] {
    return this.chunks;
  }

  public size(): number {
    return this.chunks.length;
  }

  /**
   * Dense Embedding Semantic Search (cosine similarity over L2-normalized vectors)
   */
  public searchSemantic(query: string, topK = 5, minScore = 0.08): SearchHit[] {
    if (!query.trim() || this.chunks.length === 0) return [];
    const queryVec = embedText(query);
    const queryTerms = new Set(
      tokenizeWords(query)
        .map((w) => lemmatizeToken(w.toLowerCase()))
        .filter((w) => w.length > 2 && !STOP_WORDS.has(w))
    );

    const scored = this.chunks.map((chunk) => {
      const sim = cosineSimilarity(queryVec, chunk.embedding);
      const chunkTokens = tokenizeWords(`${chunk.documentTitle} ${chunk.text}`).map((w) =>
        lemmatizeToken(w.toLowerCase())
      );
      const matchedTerms = Array.from(new Set(chunkTokens.filter((t) => queryTerms.has(t))));
      return {
        chunk,
        score: Number(Math.max(0, sim).toFixed(4)),
        matchedTerms,
      };
    });

    return scored
      .filter((item) => item.score >= minScore)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK)
      .map((item, idx) => ({
        chunkId: item.chunk.id,
        documentId: item.chunk.documentId,
        documentTitle: item.chunk.documentTitle,
        category: item.chunk.category,
        text: item.chunk.text,
        score: item.score,
        matchedTerms: item.matchedTerms,
        rank: idx + 1,
      }));
  }

  /**
   * Traditional Keyword Search (BM25 exact term matching) for direct comparison
   * against embedding-based semantic search.
   */
  public searchKeywordBM25(query: string, topK = 5): SearchHit[] {
    if (!query.trim() || this.chunks.length === 0) return [];

    const queryTerms = Array.from(
      new Set(
        tokenizeWords(query)
          .map((w) => w.toLowerCase())
          .filter((w) => w.length > 2 && !STOP_WORDS.has(w))
      )
    );
    if (queryTerms.length === 0) return [];

    const N = this.chunks.length;
    const tokenizedDocs = this.chunks.map((c) =>
      tokenizeWords(`${c.documentTitle} ${c.text}`).map((w) => w.toLowerCase())
    );
    const avgLen =
      tokenizedDocs.reduce((acc, d) => acc + d.length, 0) / Math.max(1, N);

    // Document frequency per query term
    const df = new Map<string, number>();
    for (const term of queryTerms) {
      let count = 0;
      for (const tokens of tokenizedDocs) {
        if (tokens.includes(term)) count++;
      }
      df.set(term, count);
    }

    const k1 = 1.5;
    const b = 0.75;

    const results = this.chunks.map((chunk, i) => {
      const tokens = tokenizedDocs[i];
      const docLen = tokens.length;
      let bm25 = 0;
      const matchedTerms: string[] = [];

      for (const term of queryTerms) {
        let tf = 0;
        for (const t of tokens) {
          if (t === term) tf++;
        }
        if (tf > 0) {
          matchedTerms.push(term);
          const docFreq = df.get(term) ?? 0;
          const idf = Math.log((N - docFreq + 0.5) / (docFreq + 0.5) + 1);
          bm25 += idf * ((tf * (k1 + 1)) / (tf + k1 * (1 - b + (b * docLen) / Math.max(1, avgLen))));
        }
      }

      // Normalize BM25 roughly to 0..1 display range via logistic saturation
      const normalizedScore = bm25 > 0 ? Number((1 - Math.exp(-bm25 / 3.5)).toFixed(4)) : 0;
      return {
        chunk,
        score: normalizedScore,
        rawBm25: bm25,
        matchedTerms,
      };
    });

    return results
      .filter((r) => r.rawBm25 > 0)
      .sort((a, b) => b.rawBm25 - a.rawBm25)
      .slice(0, topK)
      .map((item, idx) => ({
        chunkId: item.chunk.id,
        documentId: item.chunk.documentId,
        documentTitle: item.chunk.documentTitle,
        category: item.chunk.category,
        text: item.chunk.text,
        score: item.score,
        matchedTerms: item.matchedTerms,
        rank: idx + 1,
      }));
  }
}
