import type { AssistantCitation } from '../types';
import { extractNamedEntities, lemmatizeToken, STOP_WORDS, tokenizeWords } from './nlpPipeline';
import { splitSentences } from './textCleaner';
import { CampusVectorStore, CONCEPT_AXES_COUNT, cosineSimilarity, embedText } from './vectorStore';

export interface RagAnswer {
  answer: string;
  grounded: boolean;
  citations: AssistantCitation[];
  intentDetected: string;
}

type QueryIntent = 'WHEN' | 'HOW_MUCH' | 'WHERE' | 'WHO' | 'GENERAL';

function detectQuestionIntent(query: string): QueryIntent {
  const q = query.toLowerCase();
  if (/\b(when|date|deadline|last date|schedule|timing|time|until|before|reopen|start|begin)\b/.test(q)) {
    return 'WHEN';
  }
  if (/\b(how much|fee|fees|cost|amount|fine|penalty|rs|₹|rupees|dues|charge|pay|tuition)\b/.test(q)) {
    return 'HOW_MUCH';
  }
  if (/\b(where|venue|room|hall|lab|auditorium|location|building|block)\b/.test(q)) {
    return 'WHERE';
  }
  if (/\b(who|contact|coordinator|faculty|professor|dr|head|authority|incharge|mentor)\b/.test(q)) {
    return 'WHO';
  }
  return 'GENERAL';
}

const INTENT_LABELS: Record<QueryIntent, string> = {
  WHEN: 'Temporal / Deadline Lookup',
  HOW_MUCH: 'Fee & Financial Inquiry',
  WHERE: 'Venue & Location Lookup',
  WHO: 'Faculty / Authority Lookup',
  GENERAL: 'General Document Inquiry',
};

const GROUNDING_THRESHOLD = 0.24;

/**
 * Module 6: Grounded AI Student Assistant
 * - Retrieves top-k relevant document chunks using dense vector cosine similarity.
 * - Enforces a strict grounding threshold: if no uploaded document supports the query,
 *   explicitly states that the answer cannot be found in the uploaded documents.
 * - Synthesizes concise, verifiable answers directly grounded in the highest-scoring sentences
 *   and attaches full source document citations.
 */
export function answerStudentQuestion(
  question: string,
  vectorStore: CampusVectorStore
): RagAnswer {
  const trimmed = question.trim();
  const intent = detectQuestionIntent(trimmed);

  if (!trimmed) {
    return {
      answer: 'Please enter a question about your uploaded campus notices, schedules, fees, or events.',
      grounded: false,
      citations: [],
      intentDetected: INTENT_LABELS[intent],
    };
  }

  if (vectorStore.size() === 0) {
    return {
      answer:
        'There are currently no documents indexed in the vector database. Please upload at least one campus document (PDF, TXT, or scanned image) to ask questions.',
      grounded: false,
      citations: [],
      intentDetected: INTENT_LABELS[intent],
    };
  }

  const hits = vectorStore.searchSemantic(trimmed, 4, 0.12);
  const topHit = hits[0];
  const queryVec = embedText(trimmed);

  // Compute concept-space overlap with top hit to guard against random hash collisions on OOD queries
  let topConceptOverlap = 0;
  if (topHit) {
    const topChunkVec = embedText(`${topHit.documentTitle}. ${topHit.text}`);
    for (let i = 0; i < CONCEPT_AXES_COUNT; i++) {
      topConceptOverlap += queryVec[i] * topChunkVec[i];
    }
  }

  const hasGroundingEvidence =
    Boolean(topHit) &&
    topHit.score >= GROUNDING_THRESHOLD &&
    (topHit.matchedTerms.length > 0 || topConceptOverlap >= 0.18);

  if (!hasGroundingEvidence) {
    return {
      answer:
        'I could not find this information in the uploaded campus documents. The semantic similarity to all indexed notices fell below the grounding threshold. Please upload a relevant college circular or try rephrasing your question.',
      grounded: false,
      citations: [],
      intentDetected: INTENT_LABELS[intent],
    };
  }

  // Keep hits close to the top hit so unrelated notices don't pollute citations
  const relevantHits = hits.filter((h) => h.score >= Math.max(GROUNDING_THRESHOLD, topHit.score * 0.72));
  const queryLemmas = new Set(
    tokenizeWords(trimmed)
      .map((w) => lemmatizeToken(w.toLowerCase()))
      .filter((w) => w.length > 2 && !STOP_WORDS.has(w))
  );

  // Rank individual sentences across top retrieved chunks by semantic + intent entity match
  interface CandidateSentence {
    sentence: string;
    docTitle: string;
    score: number;
  }

  const candidates: CandidateSentence[] = [];
  const seenSentences = new Set<string>();

  for (const hit of relevantHits) {
    const sentences = splitSentences(hit.text);
    for (const sentence of sentences) {
      const key = sentence.toLowerCase();
      if (seenSentences.has(key)) continue;
      seenSentences.add(key);

      const sentVec = embedText(sentence);
      let score = cosineSimilarity(queryVec, sentVec) * 0.65 + hit.score * 0.35;

      // Lexical overlap boost
      const sentLemmas = tokenizeWords(sentence).map((w) => lemmatizeToken(w.toLowerCase()));
      let overlap = 0;
      for (const l of sentLemmas) {
        if (queryLemmas.has(l)) overlap++;
      }
      score += Math.min(0.25, overlap * 0.06);

      // Entity-intent alignment boost
      const { entities } = extractNamedEntities(sentence);
      if (intent === 'WHEN' && entities.some((e) => e.type === 'DATE' || e.type === 'DEADLINE')) {
        score += 0.22;
      } else if (intent === 'HOW_MUCH' && entities.some((e) => e.type === 'FEE')) {
        score += 0.24;
      } else if (intent === 'WHERE' && entities.some((e) => e.type === 'VENUE')) {
        score += 0.22;
      } else if (intent === 'WHO' && entities.some((e) => e.type === 'AUTHORITY' || e.type === 'DEPARTMENT')) {
        score += 0.22;
      }

      candidates.push({ sentence, docTitle: hit.documentTitle, score });
    }
  }

  candidates.sort((a, b) => b.score - a.score);
  const selectedSentences: string[] = [];
  for (const cand of candidates) {
    const cleanSent = cand.sentence.replace(/^[-•*]\s+/, '').trim();
    if (cleanSent.length < 12) continue;
    const lowerClean = cleanSent.toLowerCase();
    const isDuplicate = selectedSentences.some((existing) => {
      const lowerEx = existing.toLowerCase();
      return lowerEx.includes(lowerClean) || lowerClean.includes(lowerEx);
    });
    if (!isDuplicate) {
      selectedSentences.push(cleanSent);
    }
    if (selectedSentences.length >= 2) break;
  }

  // Deduplicate citations by documentId (keeping highest-scoring excerpt per source document)
  const citationMap = new Map<string, AssistantCitation>();
  for (const hit of relevantHits) {
    if (!citationMap.has(hit.documentId)) {
      citationMap.set(hit.documentId, {
        documentId: hit.documentId,
        documentTitle: hit.documentTitle,
        category: hit.category,
        excerpt: hit.text,
        similarity: hit.score,
      });
    }
  }
  const citations = Array.from(citationMap.values()).slice(0, 3);

  const primarySource = citations[0];
  const answerBody = selectedSentences.join(' ');
  const answer = `Based on "${primarySource.documentTitle}" (${primarySource.category}): ${answerBody}`;

  return {
    answer,
    grounded: true,
    citations,
    intentDetected: INTENT_LABELS[intent],
  };
}
