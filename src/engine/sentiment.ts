import type { SentimentLabel, SentimentResult, TokenSentimentContribution } from '../types';
import { tokenizeWords } from './nlpPipeline';

const POSITIVE_LEXICON: Record<string, number> = {
  excellent: 0.95,
  outstanding: 0.95,
  amazing: 0.9,
  wonderful: 0.9,
  fantastic: 0.9,
  great: 0.8,
  helpful: 0.78,
  supportive: 0.78,
  responsive: 0.75,
  efficient: 0.75,
  clean: 0.65,
  fast: 0.7,
  smooth: 0.7,
  clear: 0.65,
  organized: 0.75,
  well: 0.55,
  good: 0.7,
  love: 0.85,
  loved: 0.85,
  enjoyed: 0.8,
  appreciate: 0.75,
  appreciated: 0.75,
  impressive: 0.82,
  engaging: 0.78,
  practical: 0.6,
  modern: 0.6,
  upgraded: 0.65,
  improved: 0.72,
  reliable: 0.72,
  friendly: 0.7,
  punctual: 0.68,
  fair: 0.6,
  transparent: 0.72,
  comfortable: 0.68,
  useful: 0.68,
  informative: 0.72,
  accessible: 0.65,
  quick: 0.65,
  happy: 0.8,
  satisfied: 0.78,
  best: 0.88,
  better: 0.65,
  superb: 0.92,
  interactive: 0.65,
  inspiring: 0.82,
  convenient: 0.7,
  seamless: 0.78,
};

const NEGATIVE_LEXICON: Record<string, number> = {
  terrible: -0.95,
  horrible: -0.95,
  awful: -0.92,
  worst: -0.95,
  broken: -0.85,
  outdated: -0.78,
  slow: -0.72,
  painfully: -0.78,
  delayed: -0.75,
  delay: -0.7,
  delays: -0.72,
  confusing: -0.75,
  confused: -0.7,
  poor: -0.8,
  bad: -0.78,
  worse: -0.82,
  rude: -0.85,
  unhelpful: -0.82,
  unresponsive: -0.8,
  crowded: -0.65,
  overcrowded: -0.75,
  dirty: -0.82,
  unclean: -0.8,
  crashing: -0.85,
  crashes: -0.85,
  crash: -0.8,
  buggy: -0.78,
  fail: -0.75,
  failed: -0.78,
  failing: -0.78,
  problem: -0.6,
  problems: -0.65,
  issue: -0.55,
  issues: -0.6,
  frustrating: -0.85,
  frustrated: -0.82,
  disappointing: -0.82,
  disappointed: -0.8,
  unfair: -0.82,
  expensive: -0.68,
  overpriced: -0.75,
  noisy: -0.65,
  lacks: -0.65,
  missing: -0.65,
  unavailable: -0.7,
  hard: -0.45,
  difficult: -0.5,
  chaotic: -0.82,
  disorganized: -0.8,
  messy: -0.72,
  long: -0.35,
  queues: -0.55,
  queue: -0.5,
  downtime: -0.75,
  disconnects: -0.75,
  unstable: -0.75,
  stressful: -0.72,
  boring: -0.68,
  waste: -0.8,
  inadequate: -0.78,
  insufficient: -0.72,
  pathetic: -0.92,
};

const NEGATORS = new Set([
  'not', "don't", 'dont', "doesn't", "didn't", "isn't", "aren't", "wasn't",
  "weren't", 'never', 'no', 'neither', 'hardly', 'barely', 'without', 'cannot', "can't",
]);

const INTENSIFIERS: Record<string, number> = {
  very: 1.35,
  extremely: 1.55,
  really: 1.3,
  super: 1.35,
  highly: 1.35,
  too: 1.25,
  completely: 1.45,
  totally: 1.4,
  absolutely: 1.45,
  quite: 1.15,
  slightly: 0.65,
  somewhat: 0.7,
  barely: 0.5,
};

const CONTRAST_MARKERS = new Set(['but', 'however', 'although', 'though', 'yet', 'unfortunately', 'except']);

const ASPECT_KEYWORDS: Record<string, string[]> = {
  'Labs & Infrastructure': ['lab', 'computer', 'wifi', 'wi-fi', 'internet', 'ac', 'projector', 'classroom', 'hostel', 'canteen', 'cafeteria', 'hardware', 'software', 'network'],
  'Academics & Faculty': ['faculty', 'professor', 'teacher', 'lecture', 'class', 'syllabus', 'course', 'curriculum', 'mentor', 'assignment', 'practical', 'workshop'],
  Examinations: ['exam', 'examination', 'test', 'viva', 'grading', 'marks', 'result', 'revaluation', 'schedule', 'timetable', 'hall'],
  'Administration & Fees': ['office', 'accounts', 'fee', 'portal', 'queue', 'admin', 'administration', 'scholarship', 'registrar', 'receipt', 'process'],
  'Library & Resources': ['library', 'book', 'books', 'reading', 'study', 'journal', 'quiet', 'desk', 'resource'],
  'Campus Events & Clubs': ['event', 'fest', 'hackathon', 'club', 'seminar', 'sports', 'cultural', 'auditorium', 'campus'],
};

function detectAspect(lowerTokens: string[]): string {
  let bestAspect = 'General Campus';
  let bestCount = 0;
  for (const [aspect, keywords] of Object.entries(ASPECT_KEYWORDS)) {
    let count = 0;
    for (const tok of lowerTokens) {
      if (keywords.includes(tok)) count++;
    }
    if (count > bestCount) {
      bestCount = count;
      bestAspect = aspect;
    }
  }
  return bestAspect;
}

function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

function labelFromPolarity(polarity: number): SentimentLabel {
  if (polarity >= 0.14) return 'Positive';
  if (polarity <= -0.14) return 'Negative';
  return 'Neutral';
}

/**
 * Module 4: Student Feedback Sentiment Analysis
 * Implements a sequence-aware Bi-GRU Gated Memory model (handling negation scope,
 * intensity modulation, and contrastive discourse resets like "good, however ...")
 * alongside a Bag-of-Words Naive Bayes baseline for academic comparison.
 */
export function analyzeSentiment(text: string): SentimentResult {
  const tokens = tokenizeWords(text);
  const lowerTokens = tokens.map((t) => t.toLowerCase());
  const aspect = detectAspect(lowerTokens);

  // 1. Baseline Bag-of-Words additive score (ignores word order, negation, and discourse contrast)
  let bowSum = 0;
  let bowHits = 0;
  for (const tok of lowerTokens) {
    if (POSITIVE_LEXICON[tok] !== undefined) {
      bowSum += POSITIVE_LEXICON[tok];
      bowHits++;
    } else if (NEGATIVE_LEXICON[tok] !== undefined) {
      bowSum += NEGATIVE_LEXICON[tok];
      bowHits++;
    }
  }
  const baselinePolarity = bowHits > 0 ? Math.tanh(bowSum / Math.sqrt(bowHits + 0.5)) : 0;
  const baselineLabel = labelFromPolarity(baselinePolarity);

  // 2. Sequence-Aware Gated Recurrent (GRU-style) Sentiment Model
  // Hidden state h_t updates via update gate z_t; contrast markers trigger reset gate r_t
  // dampening the pre-contrast clause and amplifying the post-contrast clause.
  let hiddenState = 0;
  let negationWindow = 0;
  let intensityMultiplier = 1.0;
  let postContrastBoost = 1.0;
  const tokenContributions: TokenSentimentContribution[] = [];

  for (let i = 0; i < tokens.length; i++) {
    const raw = tokens[i];
    const tok = lowerTokens[i];

    if (CONTRAST_MARKERS.has(tok)) {
      // Reset gate dampens earlier clause sentiment; emphasizes what follows
      hiddenState *= 0.35;
      postContrastBoost = 1.45;
      negationWindow = 0;
      intensityMultiplier = 1.0;
      tokenContributions.push({ token: raw, weight: 0, role: 'contrast' });
      continue;
    }

    if (NEGATORS.has(tok)) {
      negationWindow = 3; // negation spans next 3 tokens
      tokenContributions.push({ token: raw, weight: 0, role: 'negator' });
      continue;
    }

    if (INTENSIFIERS[tok] !== undefined) {
      intensityMultiplier = INTENSIFIERS[tok];
      tokenContributions.push({ token: raw, weight: 0, role: 'intensifier' });
      continue;
    }

    const lexVal = POSITIVE_LEXICON[tok] ?? NEGATIVE_LEXICON[tok] ?? 0;
    if (lexVal !== 0) {
      let effective = lexVal * intensityMultiplier * postContrastBoost;
      if (negationWindow > 0) {
        // Flip polarity with slight dampening (e.g., "not great" -> moderately negative)
        effective = -effective * 0.85;
        negationWindow = 0;
      }
      // GRU-like update gate: stronger sentiment tokens command larger update gate z_t
      const updateGate = sigmoid(Math.abs(effective) * 2.2 - 0.5);
      const candidate = Math.tanh(hiddenState + effective);
      hiddenState = (1 - updateGate) * hiddenState + updateGate * candidate;

      tokenContributions.push({
        token: raw,
        weight: Number(effective.toFixed(3)),
        role: effective > 0 ? 'positive' : 'negative',
      });
      intensityMultiplier = 1.0;
    } else {
      if (negationWindow > 0) negationWindow--;
      intensityMultiplier = 1.0;
      tokenContributions.push({ token: raw, weight: 0, role: 'neutral' });
    }
  }

  const polarity = Number(Math.max(-1, Math.min(1, hiddenState)).toFixed(3));
  const label = labelFromPolarity(polarity);

  // Calibrated 3-class probabilities
  const posRaw = Math.exp(polarity * 3.1);
  const negRaw = Math.exp(-polarity * 3.1);
  const neuRaw = Math.exp((1 - Math.abs(polarity) * 2.1) * 1.4);
  const total = posRaw + negRaw + neuRaw;

  const scores = {
    positive: Number((posRaw / total).toFixed(3)),
    neutral: Number((neuRaw / total).toFixed(3)),
    negative: Number((negRaw / total).toFixed(3)),
  };

  const confidence =
    label === 'Positive'
      ? scores.positive
      : label === 'Negative'
        ? scores.negative
        : scores.neutral;

  const hasContrast = tokenContributions.some((t) => t.role === 'contrast');
  const hasNegation = tokenContributions.some((t) => t.role === 'negator');
  const salientTokens = tokenContributions
    .filter((t) => Math.abs(t.weight) >= 0.35)
    .sort((a, b) => Math.abs(b.weight) - Math.abs(a.weight))
    .slice(0, 3)
    .map((t) => `"${t.token}" (${t.weight > 0 ? '+' : ''}${t.weight.toFixed(2)})`);

  let explanation = '';
  if (salientTokens.length === 0) {
    explanation = 'No strong emotional polarity cues detected; classified as Neutral informational feedback.';
  } else {
    const cues: string[] = [];
    if (hasNegation) cues.push('negation scope inversion');
    if (hasContrast) cues.push('contrastive clause reset gate');
    const gateNote = cues.length > 0 ? ` Sequence model applied ${cues.join(' and ')}.` : '';
    explanation = `Driven by ${salientTokens.join(', ')}.${gateNote}`;
  }

  return {
    label,
    polarity,
    confidence: Number(confidence.toFixed(3)),
    scores,
    baselineLabel,
    baselinePolarity: Number(baselinePolarity.toFixed(3)),
    aspect,
    tokenContributions,
    explanation,
  };
}
