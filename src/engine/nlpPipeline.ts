import type { ExtractedEntity, NLPResult, TokenAnalysis } from '../types';
import { cleanDocumentText, splitSentences } from './textCleaner';

export const STOP_WORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and',
  'any', 'are', 'as', 'at', 'be', 'because', 'been', 'before', 'being', 'below',
  'between', 'both', 'but', 'by', 'can', 'could', 'did', 'do', 'does', 'doing',
  'down', 'during', 'each', 'few', 'for', 'from', 'further', 'had', 'has', 'have',
  'having', 'he', 'her', 'here', 'hers', 'herself', 'him', 'himself', 'his', 'how',
  'i', 'if', 'in', 'into', 'is', 'it', 'its', 'itself', 'just', 'me', 'more',
  'most', 'must', 'my', 'myself', 'no', 'nor', 'not', 'now', 'of', 'off', 'on',
  'once', 'only', 'or', 'other', 'our', 'ours', 'ourselves', 'out', 'over', 'own',
  'same', 'shall', 'she', 'should', 'so', 'some', 'such', 'than', 'that', 'the',
  'their', 'theirs', 'them', 'themselves', 'then', 'there', 'these', 'they', 'this',
  'those', 'through', 'to', 'too', 'under', 'until', 'up', 'very', 'was', 'we',
  'were', 'what', 'when', 'where', 'which', 'while', 'who', 'whom', 'why', 'will',
  'with', 'would', 'you', 'your', 'yours', 'yourself', 'also', 'via', 'per', 'all',
  'hereby', 'informed', 'kindly', 'note', 'please', 'dear',
]);

/**
 * Classic Porter Stemmer (Porter 1980) for English tokens.
 */
export function porterStem(word: string): string {
  let w = word.toLowerCase().replace(/[^a-z]/g, '');
  if (w.length < 3) return w;

  const c = '[^aeiou]';
  const v = '[aeiouy]';
  const C = `${c}[^aeiouy]*`;
  const V = `${v}[aeiou]*`;
  const mgr0 = new RegExp(`^(${C})?${V}${C}`);
  const meq1 = new RegExp(`^(${C})?${V}${C}(${V})?$`);
  const mgr1 = new RegExp(`^(${C})?${V}${C}${V}${C}`);
  const s_v = new RegExp(`^(${C})?${v}`);

  const firstChar = w[0];
  if (firstChar === 'y') {
    w = 'Y' + w.slice(1);
  }

  // Step 1a
  if (/^(.+?)(ss|i)es$/.test(w)) {
    w = w.replace(/^(.+?)(ss|i)es$/, '$1$2');
  } else if (/^(.+?)([^s])s$/.test(w)) {
    w = w.replace(/^(.+?)([^s])s$/, '$1$2');
  }

  // Step 1b
  const re1b = /^(.+?)eed$/;
  const re1b2 = /^(.+?)(ed|ing)$/;
  if (re1b.test(w)) {
    const stem = w.replace(re1b, '$1');
    if (mgr0.test(stem)) {
      w = w.slice(0, -1);
    }
  } else if (re1b2.test(w)) {
    const stem = w.replace(re1b2, '$1');
    if (s_v.test(stem)) {
      w = stem;
      if (/(at|bl|iz)$/.test(w)) {
        w += 'e';
      } else if (/([^aeiouylsz])\1$/.test(w)) {
        w = w.slice(0, -1);
      } else if (new RegExp(`^${C}${v}[^aeiouwxy]$`).test(w)) {
        w += 'e';
      }
    }
  }

  // Step 1c
  if (/^(.+?)y$/.test(w)) {
    const stem = w.replace(/^(.+?)y$/, '$1');
    if (s_v.test(stem)) {
      w = stem + 'i';
    }
  }

  // Step 2
  const step2List: Record<string, string> = {
    ational: 'ate',
    tional: 'tion',
    enci: 'ence',
    anci: 'ance',
    izer: 'ize',
    bli: 'ble',
    alli: 'al',
    entli: 'ent',
    eli: 'e',
    ousli: 'ous',
    ization: 'ize',
    ation: 'ate',
    ator: 'ate',
    alism: 'al',
    iveness: 'ive',
    fulness: 'ful',
    ousness: 'ous',
    aliti: 'al',
    iviti: 'ive',
    biliti: 'ble',
    logi: 'log',
  };
  const re2 =
    /^(.+?)(ational|tional|enci|anci|izer|bli|alli|entli|eli|ousli|ization|ation|ator|alism|iveness|fulness|ousness|aliti|iviti|biliti|logi)$/;
  const m2 = re2.exec(w);
  if (m2 && mgr0.test(m2[1])) {
    w = m2[1] + step2List[m2[2]];
  }

  // Step 3
  const step3List: Record<string, string> = {
    icate: 'ic',
    ative: '',
    alize: 'al',
    iciti: 'ic',
    ical: 'ic',
    ful: '',
    ness: '',
  };
  const re3 = /^(.+?)(icate|ative|alize|iciti|ical|ful|ness)$/;
  const m3 = re3.exec(w);
  if (m3 && mgr0.test(m3[1])) {
    w = m3[1] + step3List[m3[2]];
  }

  // Step 4
  const re4 =
    /^(.+?)(al|ance|ence|er|ic|able|ible|ant|ement|ment|ent|ou|ism|ate|iti|ous|ive|ize)$/;
  const m4 = re4.exec(w);
  if (m4 && mgr1.test(m4[1])) {
    w = m4[1];
  } else if (/^(.+?)(s|t)(ion)$/.test(w)) {
    const m4b = /^(.+?)(s|t)(ion)$/.exec(w)!;
    if (mgr1.test(m4b[1] + m4b[2])) {
      w = m4b[1] + m4b[2];
    }
  }

  // Step 5a
  if (/^(.+?)e$/.test(w)) {
    const stem = w.replace(/^(.+?)e$/, '$1');
    if (mgr1.test(stem) || (meq1.test(stem) && !new RegExp(`^${C}${v}[^aeiouwxy]$`).test(stem))) {
      w = stem;
    }
  }
  // Step 5b
  if (/ll$/.test(w) && mgr1.test(w)) {
    w = w.slice(0, -1);
  }

  if (firstChar === 'y') {
    w = 'y' + w.slice(1);
  }
  return w;
}

const IRREGULAR_LEMMAS: Record<string, string> = {
  examinations: 'examination',
  exams: 'exam',
  submitted: 'submit',
  submitting: 'submit',
  submissions: 'submission',
  registered: 'register',
  registering: 'register',
  registrations: 'registration',
  classes: 'class',
  courses: 'course',
  fees: 'fee',
  students: 'student',
  notices: 'notice',
  announcements: 'announcement',
  holidays: 'holiday',
  events: 'event',
  deadlines: 'deadline',
  schedules: 'schedule',
  scheduled: 'schedule',
  departments: 'department',
  paid: 'pay',
  paying: 'pay',
  payments: 'payment',
  held: 'hold',
  holding: 'hold',
  begins: 'begin',
  began: 'begin',
  beginning: 'begin',
  conducted: 'conduct',
  conducting: 'conduct',
  closed: 'close',
  closing: 'close',
  remains: 'remain',
  remaining: 'remain',
  required: 'require',
  requiring: 'require',
  studying: 'study',
  studied: 'study',
  studies: 'study',
  written: 'write',
  writing: 'write',
  taken: 'take',
  taking: 'take',
  given: 'give',
  giving: 'give',
  was: 'be',
  were: 'be',
  been: 'be',
  being: 'be',
  is: 'be',
  are: 'be',
  has: 'have',
  had: 'have',
  having: 'have',
  better: 'good',
  best: 'good',
  worse: 'bad',
  worst: 'bad',
  faculties: 'faculty',
  libraries: 'library',
  laboratories: 'laboratory',
  labs: 'lab',
  marks: 'mark',
  grades: 'grade',
  projects: 'project',
  assignments: 'assignment',
  scholarships: 'scholarship',
  installments: 'installment',
  fines: 'fine',
  penalties: 'penalty',
  workshops: 'workshop',
  seminars: 'seminar',
  hackathons: 'hackathon',
};

export function lemmatizeToken(word: string): string {
  const w = word.toLowerCase();
  if (IRREGULAR_LEMMAS[w]) return IRREGULAR_LEMMAS[w];
  if (w.length <= 3) return w;

  if (w.endsWith('ies') && w.length > 4) return w.slice(0, -3) + 'y';
  if (w.endsWith('ves') && w.length > 4) return w.slice(0, -3) + 'f';
  if (/(ches|shes|xes|zes|sses)$/.test(w)) return w.slice(0, -2);
  if (w.endsWith('ing') && w.length > 5) {
    const base = w.slice(0, -3);
    if (/([bcdfghjklmnpqrstvwxz])\1$/.test(base)) return base.slice(0, -1);
    return base;
  }
  if (w.endsWith('ed') && w.length > 4) {
    const base = w.slice(0, -2);
    if (/([bcdfghjklmnpqrstvwxz])\1$/.test(base)) return base.slice(0, -1);
    return base;
  }
  if (w.endsWith('s') && !w.endsWith('ss') && !w.endsWith('us') && !w.endsWith('is') && w.length > 3) {
    return w.slice(0, -1);
  }
  return w;
}

const DETERMINERS = new Set(['the', 'a', 'an', 'this', 'that', 'these', 'those', 'all', 'each', 'every', 'some', 'any', 'no']);
const PREPOSITIONS = new Set(['in', 'on', 'at', 'to', 'for', 'from', 'by', 'with', 'about', 'against', 'between', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'under', 'over', 'of', 'until', 'via', 'per']);
const MODALS = new Set(['will', 'shall', 'must', 'should', 'can', 'could', 'may', 'might', 'would']);
const PRONOUNS = new Set(['i', 'you', 'he', 'she', 'it', 'we', 'they', 'their', 'our', 'your', 'his', 'her', 'its', 'who', 'which', 'whom']);
const CONJUNCTIONS = new Set(['and', 'or', 'but', 'nor', 'yet', 'so', 'although', 'however', 'because', 'if', 'while', 'when']);
const AUX_VERBS = new Set(['is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did']);
const COMMON_VERBS = new Set([
  'submit', 'register', 'pay', 'attend', 'conduct', 'schedule', 'announce', 'notify',
  'inform', 'complete', 'download', 'upload', 'collect', 'verify', 'apply', 'remain',
  'close', 'open', 'begin', 'start', 'end', 'commence', 'report', 'bring', 'carry',
  'contact', 'visit', 'check', 'participate', 'organize', 'celebrate', 'issue', 'release',
]);
const COMMON_ADJECTIVES = new Set([
  'final', 'mandatory', 'compulsory', 'academic', 'annual', 'practical', 'internal',
  'external', 'late', 'online', 'offline', 'regular', 'supplementary', 'new', 'important',
  'urgent', 'official', 'public', 'national', 'winter', 'summer', 'semester', 'eligible',
  'strict', 'extended', 'revised', 'updated', 'free', 'open', 'closed', 'first', 'second',
  'third', 'fourth', 'fifth', 'sixth', 'excellent', 'poor', 'slow', 'fast', 'helpful', 'clean',
]);

const POS_LABELS: Record<string, string> = {
  NN: 'Noun (Singular)',
  NNS: 'Noun (Plural)',
  NNP: 'Proper Noun',
  VB: 'Verb (Base)',
  VBD: 'Verb (Past)',
  VBG: 'Verb (Gerund)',
  JJ: 'Adjective',
  RB: 'Adverb',
  CD: 'Cardinal Number',
  IN: 'Preposition',
  DT: 'Determiner',
  MD: 'Modal Verb',
  PRP: 'Pronoun',
  CC: 'Conjunction',
};

export function tagPOS(token: string, indexInSentence: number, prevPos?: string): { pos: string; posLabel: string } {
  const lower = token.toLowerCase();

  if (/^[\d₹$.,:/%-]+$/.test(token) || /^\d+(st|nd|rd|th)?$/i.test(token)) {
    return { pos: 'CD', posLabel: POS_LABELS.CD };
  }
  if (DETERMINERS.has(lower)) return { pos: 'DT', posLabel: POS_LABELS.DT };
  if (PREPOSITIONS.has(lower)) return { pos: 'IN', posLabel: POS_LABELS.IN };
  if (MODALS.has(lower)) return { pos: 'MD', posLabel: POS_LABELS.MD };
  if (PRONOUNS.has(lower)) return { pos: 'PRP', posLabel: POS_LABELS.PRP };
  if (CONJUNCTIONS.has(lower)) return { pos: 'CC', posLabel: POS_LABELS.CC };
  if (AUX_VERBS.has(lower) || COMMON_VERBS.has(lower)) return { pos: 'VB', posLabel: POS_LABELS.VB };
  if (COMMON_ADJECTIVES.has(lower)) return { pos: 'JJ', posLabel: POS_LABELS.JJ };

  // Proper noun heuristic: capitalized mid-sentence or course code
  if (/^[A-Z]{2,5}-?\d{2,4}$/.test(token) || (indexInSentence > 0 && /^[A-Z][a-zA-Z]+$/.test(token))) {
    return { pos: 'NNP', posLabel: POS_LABELS.NNP };
  }
  if (lower.endsWith('ly') && lower.length > 4) return { pos: 'RB', posLabel: POS_LABELS.RB };
  if (lower.endsWith('ing') && lower.length > 4) return { pos: 'VBG', posLabel: POS_LABELS.VBG };
  if (lower.endsWith('ed') && lower.length > 3) return { pos: 'VBD', posLabel: POS_LABELS.VBD };
  if (/(ive|ous|ful|able|ible|al|ic|ary|ory)$/.test(lower) && lower.length > 4) {
    return { pos: 'JJ', posLabel: POS_LABELS.JJ };
  }
  if (prevPos === 'MD' && !lower.endsWith('s')) {
    return { pos: 'VB', posLabel: POS_LABELS.VB };
  }
  if (lower.endsWith('s') && !lower.endsWith('ss') && !lower.endsWith('us') && lower.length > 3) {
    return { pos: 'NNS', posLabel: POS_LABELS.NNS };
  }
  return { pos: 'NN', posLabel: POS_LABELS.NN };
}

export function tokenizeWords(text: string): string[] {
  const matches = text.match(/[₹$€]?\d[\d,]*(?:\.\d+)?|[A-Z]{2,5}-\d{2,4}|[A-Za-z]+(?:['-][A-Za-z]+)*/g);
  return matches ?? [];
}

/**
 * Named Entity Recognition & Structured Academic Information Extractor
 */
export function extractNamedEntities(text: string): {
  entities: ExtractedEntity[];
  deadlines: Array<{ date: string; description: string }>;
} {
  const entities: ExtractedEntity[] = [];
  const deadlines: Array<{ date: string; description: string }> = [];
  const seen = new Set<string>();

  const pushEntity = (entity: ExtractedEntity) => {
    const key = `${entity.type}::${entity.text.toLowerCase()}`;
    if (!seen.has(key)) {
      seen.add(key);
      entities.push(entity);
    }
  };

  const sentences = splitSentences(text);

  // 1. Dates & Deadlines
  const datePattern =
    /\b(?:\d{1,2}(?:st|nd|rd|th)?\s+(?:January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)(?:,?\s+\d{4})?|(?:January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)\s+\d{1,2}(?:st|nd|rd|th)?(?:,?\s+\d{4})?|\d{1,2}[-/]\d{1,2}[-/]\d{2,4}|\d{4}-\d{2}-\d{2})\b/gi;
  const deadlineCue = /\b(last date|deadline|due|before|by|on or before|latest by|closing date|cutoff|submit|remit)\b/i;

  for (const sentence of sentences) {
    let m: RegExpExecArray | null;
    datePattern.lastIndex = 0;
    while ((m = datePattern.exec(sentence)) !== null) {
      const dateStr = m[0].trim();
      const isDeadline = deadlineCue.test(sentence);
      pushEntity({
        text: dateStr,
        type: isDeadline ? 'DEADLINE' : 'DATE',
        context: sentence.slice(0, 140),
        confidence: isDeadline ? 0.94 : 0.91,
      });
      if (isDeadline) {
        if (!deadlines.some((d) => d.date === dateStr && d.description === sentence)) {
          deadlines.push({
            date: dateStr,
            description: sentence.length > 130 ? `${sentence.slice(0, 127)}...` : sentence,
          });
        }
      }
    }
  }

  // 2. Course codes and academic course names
  const courseCodePattern = /\b(?:BCA|MCA|B\.?Tech|M\.?Tech|B\.?Sc|M\.?Sc|CS|IT|AI|DS|ML|EC|ME|MBA|BBA)[-\s]?\d{3,4}\b/g;
  const courseNamePattern =
    /\b(?:BCA(?:\s*\(AI\s*&\s*ML\))?|MCA|B\.?Tech\s*(?:CSE|IT|AI\s*&\s*DS)?|B\.?Sc\s*(?:Computer Science|Data Science)?|Natural Language Processing|Machine Learning|Deep Learning|Data Structures(?:\s*and\s*Algorithms)?|Database Management Systems|Operating Systems|Computer Networks|Artificial Intelligence|Python Programming|Software Engineering|Web Development|Cloud Computing)\b/gi;

  for (const sentence of sentences) {
    for (const pattern of [courseCodePattern, courseNamePattern]) {
      pattern.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = pattern.exec(sentence)) !== null) {
        const val = m[0].trim();
        if (val.length >= 3) {
          pushEntity({
            text: val,
            type: 'COURSE',
            context: sentence.slice(0, 140),
            confidence: 0.92,
          });
        }
      }
    }
  }

  // 3. Departments & Campus Offices
  const deptPattern =
    /\b(?:Department of [A-Z][A-Za-z&\s]{3,42}|School of [A-Z][A-Za-z&\s]{3,36}|Examination Cell|Controller of Examinations|Accounts(?:\s*&\s*Finance)?\s*Office|Academic Affairs(?:\s*Office)?|Training\s*(?:&|and)\s*Placement\s*Cell|Student Welfare Office|Central Library|Registrar(?:'s)?\s*Office|Scholarship Cell|IT Infrastructure Cell)\b/g;
  for (const sentence of sentences) {
    deptPattern.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = deptPattern.exec(sentence)) !== null) {
      pushEntity({
        text: m[0].trim().replace(/[.,;:]$/, ''),
        type: 'DEPARTMENT',
        context: sentence.slice(0, 140),
        confidence: 0.93,
      });
    }
  }

  // 4. Monetary Fees & Amounts
  const feePattern = /(?:₹|Rs\.?\s*|INR\s*|\$)\s?\d[\d,]*(?:\.\d{1,2})?/gi;
  for (const sentence of sentences) {
    feePattern.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = feePattern.exec(sentence)) !== null) {
      pushEntity({
        text: m[0].trim(),
        type: 'FEE',
        context: sentence.slice(0, 140),
        confidence: 0.96,
      });
    }
  }

  // 5. Venues & Locations
  const venuePattern =
    /\b(?:Main Auditorium|Seminar Hall(?:\s*[A-Z0-9-]+)?|Computer Lab(?:\s*[A-Z0-9-]+)?|AI\s*&\s*ML Lab(?:\s*\d+)?|Lab\s*[0-9A-Z-]+|Block\s*[A-Z](?:\s*,\s*Room\s*\d+)?|Room\s*(?:No\.?\s*)?\d{2,4}|Central Library|Sports Complex|Innovation Center|Examination Hall(?:\s*[A-Z0-9-]+)?|Student Portal)\b/gi;
  for (const sentence of sentences) {
    venuePattern.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = venuePattern.exec(sentence)) !== null) {
      pushEntity({
        text: m[0].trim(),
        type: 'VENUE',
        context: sentence.slice(0, 140),
        confidence: 0.88,
      });
    }
  }

  // 6. Authorities / Named Faculty
  const personPattern = /\b(?:Dr\.|Prof\.|Mr\.|Ms\.|Mrs\.)\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2}\b/g;
  for (const sentence of sentences) {
    personPattern.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = personPattern.exec(sentence)) !== null) {
      pushEntity({
        text: m[0].trim(),
        type: 'AUTHORITY',
        context: sentence.slice(0, 140),
        confidence: 0.9,
      });
    }
  }

  return { entities, deadlines };
}

/**
 * Full Module 2 NLP Processing Pipeline
 */
export function runNlpPipeline(rawText: string): NLPResult {
  const cleaned = cleanDocumentText(rawText);
  const sentences = splitSentences(cleaned);
  const tokens: TokenAnalysis[] = [];
  const filteredTokens: string[] = [];
  const freqMap = new Map<string, number>();

  for (const sentence of sentences) {
    const words = tokenizeWords(sentence);
    let prevPos: string | undefined;
    for (let i = 0; i < words.length; i++) {
      const original = words[i];
      const normalized = original.toLowerCase();
      const isStopWord = STOP_WORDS.has(normalized) || original.length <= 1;
      const stem = /^[a-z]+$/i.test(original) ? porterStem(original) : normalized;
      const lemma = /^[a-z]+$/i.test(original) ? lemmatizeToken(original) : normalized;
      const { pos, posLabel } = tagPOS(original, i, prevPos);
      prevPos = pos;

      tokens.push({
        original,
        normalized,
        isStopWord,
        stem,
        lemma,
        pos,
        posLabel,
      });

      if (!isStopWord && /^[a-z]/i.test(lemma) && lemma.length > 2) {
        filteredTokens.push(lemma);
        freqMap.set(lemma, (freqMap.get(lemma) ?? 0) + 1);
      }
    }
  }

  const topKeywords = Array.from(freqMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([term, count]) => ({ term, count }));

  const vocabSet = new Set(filteredTokens);
  const { entities, deadlines } = extractNamedEntities(cleaned);

  return {
    rawWordCount: rawText.trim() ? rawText.trim().split(/\s+/).length : 0,
    cleanedWordCount: tokens.length,
    sentenceCount: sentences.length,
    vocabularySize: vocabSet.size,
    lexicalDiversity:
      filteredTokens.length > 0 ? Number((vocabSet.size / filteredTokens.length).toFixed(3)) : 0,
    sentences,
    tokens,
    filteredTokens,
    topKeywords,
    entities,
    deadlines,
  };
}
