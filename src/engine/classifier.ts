import {
  DOCUMENT_CATEGORIES,
  type CategoryScore,
  type ClassificationModelOutput,
  type ClassifierMetricsReport,
  type DocumentCategory,
  type DocumentClassification,
} from '../types';
import { TRAINING_CORPUS, type LabeledTrainingExample } from '../data/trainingCorpus';
import { lemmatizeToken, STOP_WORDS, tokenizeWords } from './nlpPipeline';
import { cosineSimilarity, EMBEDDING_DIM, embedText } from './vectorStore';

function extractFeatures(text: string): string[] {
  const words = tokenizeWords(text)
    .map((w) => lemmatizeToken(w.toLowerCase()))
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
  const features = [...words];
  for (let i = 0; i < words.length - 1; i++) {
    features.push(`${words[i]} ${words[i + 1]}`);
  }
  return features;
}

/**
 * Model 1: Traditional ML Baseline — TF-IDF + Multinomial Naive Bayes (Laplace smoothing)
 */
class TfidfNaiveBayesClassifier {
  private vocab = new Set<string>();
  private idf = new Map<string, number>();
  private classTfidfSums = new Map<DocumentCategory, Map<string, number>>();
  private classTotals = new Map<DocumentCategory, number>();
  private classPriors = new Map<DocumentCategory, number>();

  public train(examples: LabeledTrainingExample[]): void {
    this.vocab.clear();
    this.idf.clear();
    this.classTfidfSums.clear();
    this.classTotals.clear();
    this.classPriors.clear();

    const docFreq = new Map<string, number>();
    const parsed = examples.map((ex) => {
      const feats = extractFeatures(ex.text);
      const unique = new Set(feats);
      for (const f of unique) {
        this.vocab.add(f);
        docFreq.set(f, (docFreq.get(f) ?? 0) + 1);
      }
      return { category: ex.category, feats };
    });

    const N = examples.length;
    for (const term of this.vocab) {
      const df = docFreq.get(term) ?? 0;
      this.idf.set(term, Math.log((N + 1) / (df + 1)) + 1);
    }

    const catCounts = new Map<DocumentCategory, number>();
    for (const cat of DOCUMENT_CATEGORIES) {
      this.classTfidfSums.set(cat, new Map());
      this.classTotals.set(cat, 0);
      catCounts.set(cat, 0);
    }

    for (const item of parsed) {
      catCounts.set(item.category, (catCounts.get(item.category) ?? 0) + 1);
      const tf = new Map<string, number>();
      for (const f of item.feats) {
        tf.set(f, (tf.get(f) ?? 0) + 1);
      }
      const catMap = this.classTfidfSums.get(item.category)!;
      let totalWeight = this.classTotals.get(item.category) ?? 0;

      for (const [term, count] of tf.entries()) {
        const weight = (1 + Math.log(count)) * (this.idf.get(term) ?? 1);
        catMap.set(term, (catMap.get(term) ?? 0) + weight);
        totalWeight += weight;
      }
      this.classTotals.set(item.category, totalWeight);
    }

    for (const cat of DOCUMENT_CATEGORIES) {
      this.classPriors.set(cat, Math.log(((catCounts.get(cat) ?? 0) + 1) / (N + DOCUMENT_CATEGORIES.length)));
    }
  }

  public predict(text: string): ClassificationModelOutput {
    const feats = extractFeatures(text);
    const tf = new Map<string, number>();
    for (const f of feats) {
      tf.set(f, (tf.get(f) ?? 0) + 1);
    }

    const V = Math.max(1, this.vocab.size);
    const alpha = 0.8;
    const logProbs: Array<{ category: DocumentCategory; logProb: number }> = [];
    const termEvidence = new Map<DocumentCategory, Array<{ term: string; lift: number }>>();

    for (const cat of DOCUMENT_CATEGORIES) {
      let score = this.classPriors.get(cat) ?? 0;
      const catMap = this.classTfidfSums.get(cat)!;
      const denom = (this.classTotals.get(cat) ?? 0) + alpha * V;
      const evidence: Array<{ term: string; lift: number }> = [];

      for (const [term, count] of tf.entries()) {
        if (!this.vocab.has(term)) continue;
        const idf = this.idf.get(term) ?? 1;
        const tfidf = (1 + Math.log(count)) * idf;
        const likelihood = ((catMap.get(term) ?? 0) + alpha) / denom;
        score += tfidf * Math.log(likelihood);
        if ((catMap.get(term) ?? 0) > 0) {
          evidence.push({ term, lift: tfidf * (catMap.get(term) ?? 0) });
        }
      }
      logProbs.push({ category: cat, logProb: score });
      termEvidence.set(cat, evidence);
    }

    // Softmax with temperature scaling for calibrated probabilities
    const maxLog = Math.max(...logProbs.map((p) => p.logProb));
    const temperature = 1.6;
    const exps = logProbs.map((p) => ({
      category: p.category,
      val: Math.exp((p.logProb - maxLog) / temperature),
    }));
    const sumExp = exps.reduce((acc, e) => acc + e.val, 0) || 1;

    const scores: CategoryScore[] = exps
      .map((e) => ({
        category: e.category,
        probability: Number((e.val / sumExp).toFixed(4)),
      }))
      .sort((a, b) => b.probability - a.probability);

    const best = scores[0];
    const topFeatures = (termEvidence.get(best.category) ?? [])
      .sort((a, b) => b.lift - a.lift)
      .slice(0, 5)
      .map((e) => e.term);

    return {
      modelName: 'TF-IDF + Naive Bayes',
      predictedCategory: best.category,
      confidence: best.probability,
      scores,
      topFeatures,
    };
  }
}

/**
 * Model 2: Transformer-Inspired Dense Semantic Prototype Classifier
 * Projects documents into the 128-dim contextual embedding space and classifies
 * via temperature-scaled cosine attention against learned class prototypes & k-NN support vectors.
 */
class TransformerSemanticClassifier {
  private prototypes = new Map<DocumentCategory, number[]>();
  private supportVectors: Array<{ category: DocumentCategory; vec: number[] }> = [];

  public train(examples: LabeledTrainingExample[]): void {
    this.prototypes.clear();
    this.supportVectors = [];

    const sums = new Map<DocumentCategory, Float64Array>();
    for (const cat of DOCUMENT_CATEGORIES) {
      sums.set(cat, new Float64Array(EMBEDDING_DIM));
    }

    for (const ex of examples) {
      const vec = embedText(ex.text);
      this.supportVectors.push({ category: ex.category, vec });
      const acc = sums.get(ex.category)!;
      for (let i = 0; i < EMBEDDING_DIM; i++) {
        acc[i] += vec[i];
      }
    }

    for (const cat of DOCUMENT_CATEGORIES) {
      const acc = sums.get(cat)!;
      let normSq = 0;
      for (let i = 0; i < EMBEDDING_DIM; i++) normSq += acc[i] * acc[i];
      const norm = Math.sqrt(normSq) || 1;
      const unit = new Array<number>(EMBEDDING_DIM);
      for (let i = 0; i < EMBEDDING_DIM; i++) unit[i] = acc[i] / norm;
      this.prototypes.set(cat, unit);
    }
  }

  public predict(text: string): ClassificationModelOutput {
    const docVec = embedText(text);
    const rawScores: Array<{ category: DocumentCategory; sim: number }> = [];

    for (const cat of DOCUMENT_CATEGORIES) {
      const proto = this.prototypes.get(cat)!;
      const protoSim = cosineSimilarity(docVec, proto);

      // Top-3 attention-weighted support vectors within class
      const catSims = this.supportVectors
        .filter((sv) => sv.category === cat)
        .map((sv) => cosineSimilarity(docVec, sv.vec))
        .sort((a, b) => b - a)
        .slice(0, 3);
      const topSupportSim =
        catSims.length > 0 ? catSims.reduce((a, b) => a + b, 0) / catSims.length : 0;

      const combined = 0.65 * protoSim + 0.35 * topSupportSim;
      rawScores.push({ category: cat, sim: combined });
    }

    const temp = 0.14;
    const maxSim = Math.max(...rawScores.map((r) => r.sim));
    const exps = rawScores.map((r) => ({
      category: r.category,
      val: Math.exp((r.sim - maxSim) / temp),
    }));
    const sumExp = exps.reduce((acc, e) => acc + e.val, 0) || 1;

    const scores: CategoryScore[] = exps
      .map((e) => ({
        category: e.category,
        probability: Number((e.val / sumExp).toFixed(4)),
      }))
      .sort((a, b) => b.probability - a.probability);

    const best = scores[0];
    // Identify top semantically salient terms contributing to the winning class prototype
    const bestProto = this.prototypes.get(best.category)!;
    const uniqueWords = Array.from(
      new Set(
        tokenizeWords(text)
          .map((w) => lemmatizeToken(w.toLowerCase()))
          .filter((w) => w.length > 2 && !STOP_WORDS.has(w))
      )
    );
    const topFeatures = uniqueWords
      .map((w) => ({ word: w, sim: cosineSimilarity(embedText(w), bestProto) }))
      .sort((a, b) => b.sim - a.sim)
      .slice(0, 5)
      .map((w) => w.word);

    return {
      modelName: 'Transformer Semantic Encoder',
      predictedCategory: best.category,
      confidence: best.probability,
      scores,
      topFeatures,
    };
  }
}

// Singleton trained instances on the training split (42 train / 18 holdout test)
const trainSplit = TRAINING_CORPUS.filter((e) => e.split === 'train');
const testSplit = TRAINING_CORPUS.filter((e) => e.split === 'test');

const baselineClassifier = new TfidfNaiveBayesClassifier();
baselineClassifier.train(trainSplit);

const transformerClassifier = new TransformerSemanticClassifier();
transformerClassifier.train(trainSplit);

export function classifyDocument(
  text: string,
  preferredModel: 'baseline' | 'transformer' = 'transformer'
): DocumentClassification {
  const baseline = baselineClassifier.predict(text);
  const transformer = transformerClassifier.predict(text);
  const activeCategory =
    preferredModel === 'baseline' ? baseline.predictedCategory : transformer.predictedCategory;

  return {
    baseline,
    transformer,
    activeCategory,
    modelsAgree: baseline.predictedCategory === transformer.predictedCategory,
  };
}

function evaluateModel(
  modelName: string,
  predictFn: (text: string) => DocumentCategory
): ClassifierMetricsReport {
  const k = DOCUMENT_CATEGORIES.length;
  const matrix: number[][] = Array.from({ length: k }, () => new Array(k).fill(0));
  let correct = 0;

  for (const sample of testSplit) {
    const actualIdx = DOCUMENT_CATEGORIES.indexOf(sample.category);
    const pred = predictFn(sample.text);
    const predIdx = DOCUMENT_CATEGORIES.indexOf(pred);
    matrix[actualIdx][predIdx]++;
    if (actualIdx === predIdx) correct++;
  }

  const perClass = DOCUMENT_CATEGORIES.map((category, i) => {
    const tp = matrix[i][i];
    let fp = 0;
    let fn = 0;
    let support = 0;
    for (let j = 0; j < k; j++) {
      support += matrix[i][j];
      if (j !== i) {
        fn += matrix[i][j];
        fp += matrix[j][i];
      }
    }
    const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
    const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
    const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;
    return {
      category,
      precision: Number(precision.toFixed(3)),
      recall: Number(recall.toFixed(3)),
      f1: Number(f1.toFixed(3)),
      support,
    };
  });

  const macroPrecision = perClass.reduce((a, c) => a + c.precision, 0) / k;
  const macroRecall = perClass.reduce((a, c) => a + c.recall, 0) / k;
  const macroF1 = perClass.reduce((a, c) => a + c.f1, 0) / k;

  return {
    modelName,
    accuracy: Number((correct / Math.max(1, testSplit.length)).toFixed(3)),
    macroPrecision: Number(macroPrecision.toFixed(3)),
    macroRecall: Number(macroRecall.toFixed(3)),
    macroF1: Number(macroF1.toFixed(3)),
    perClass,
    confusionMatrix: matrix,
  };
}

let cachedBenchmarks: {
  baseline: ClassifierMetricsReport;
  transformer: ClassifierMetricsReport;
  trainSize: number;
  testSize: number;
} | null = null;

export function getClassifierBenchmarks() {
  if (!cachedBenchmarks) {
    cachedBenchmarks = {
      baseline: evaluateModel('TF-IDF + Naive Bayes', (t) => baselineClassifier.predict(t).predictedCategory),
      transformer: evaluateModel('Transformer Semantic Encoder', (t) => transformerClassifier.predict(t).predictedCategory),
      trainSize: trainSplit.length,
      testSize: testSplit.length,
    };
  }
  return cachedBenchmarks;
}
