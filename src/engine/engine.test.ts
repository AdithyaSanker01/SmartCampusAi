import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildSamplePdfBytes,
  cleanDocumentText,
  extractTextFromPdfBytes,
  validateUploadFile,
} from './textCleaner';
import {
  applyBinarization,
  computeOtsuThreshold,
  detectTextLineBoxes,
  runCvPreprocessingPipeline,
  toGrayscaleBuffer,
} from './cvPipeline';
import { lemmatizeToken, porterStem, runNlpPipeline } from './nlpPipeline';
import { classifyDocument, getClassifierBenchmarks } from './classifier';
import { analyzeSentiment } from './sentiment';
import { CampusVectorStore, cosineSimilarity, embedText } from './vectorStore';
import { answerStudentQuestion } from './ragAssistant';
import { createInitialDocuments } from '../data/seedData';

test('Module 1: File validation rejects unsupported, empty, and oversized files', () => {
  assert.equal(validateUploadFile({ name: 'circular.pdf', size: 1200 }).valid, true);
  assert.equal(validateUploadFile({ name: 'notes.txt', size: 300 }).valid, true);
  assert.equal(validateUploadFile({ name: 'scan.png', size: 42000 }).valid, true);

  const badExt = validateUploadFile({ name: 'malware.exe', size: 500 });
  assert.equal(badExt.valid, false);
  assert.match(badExt.error ?? '', /Unsupported file format/);

  const empty = validateUploadFile({ name: 'empty.txt', size: 0 });
  assert.equal(empty.valid, false);

  const oversized = validateUploadFile({ name: 'huge.pdf', size: 20 * 1024 * 1024 });
  assert.equal(oversized.valid, false);
});

test('Module 1: Text cleaner fixes ligatures, hyphenated wraps, and PDF round-trip works', async () => {
  const dirty = 'Ofﬁce of Exam-\nination Cell   \r\n\r\n\r\nSubmit by 25 Nov 2026.';
  const cleaned = cleanDocumentText(dirty);
  assert.equal(cleaned, 'Office of Examination Cell\n\nSubmit by 25 Nov 2026.');

  const pdfBytes = buildSamplePdfBytes('BCA Exam Circular', [
    'Last date to submit form is 25 November 2026.',
    'Venue: Examination Hall A.',
  ]);
  const extracted = await extractTextFromPdfBytes(pdfBytes);
  assert.match(extracted, /BCA Exam Circular/);
  assert.match(extracted, /25 November 2026/);
});

test('Module 1 (CV): Grayscale, Otsu threshold, binarization, and text-line projection', () => {
  // Construct a synthetic 60x30 scanned image: light paper (230) with two dark text bands (30)
  const w = 60;
  const h = 30;
  const rgba = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const isInk = ((y >= 5 && y <= 10) || (y >= 18 && y <= 23)) && x >= 6 && x <= 52;
      const val = isInk ? 30 : 230;
      const idx = (y * w + x) * 4;
      rgba[idx] = val;
      rgba[idx + 1] = val;
      rgba[idx + 2] = val;
      rgba[idx + 3] = 255;
    }
  }

  const gray = toGrayscaleBuffer(rgba);
  const otsu = computeOtsuThreshold(gray);
  assert.ok(otsu >= 30 && otsu <= 230, `Expected Otsu between 30 and 230, got ${otsu}`);

  const { binary } = applyBinarization(gray, w, h, 'otsu');
  const lines = detectTextLineBoxes(binary, w, h);
  assert.equal(lines.length, 2, 'Should detect exactly 2 horizontal text bands');

  const res = runCvPreprocessingPipeline(rgba, w, h, {
    grayscale: true,
    denoise: true,
    contrastStretch: true,
    binarize: true,
    binarizeMode: 'otsu',
    manualThreshold: 128,
  });
  assert.equal(res.stats.detectedLines, 2);
  assert.ok(res.stats.inkCoveragePercent > 10 && res.stats.inkCoveragePercent < 60);
});

test('Module 2 (NLP): Tokenization, Porter stemming, lemmatization, POS, and NER extraction', () => {
  assert.equal(porterStem('examinations'), 'examin');
  assert.equal(lemmatizeToken('examinations'), 'examination');
  assert.equal(lemmatizeToken('submitted'), 'submit');

  const sample =
    'Department of Computer Applications requires BCA-501 students to submit the ₹1,800 exam fee before 25 November 2026 to Dr. Meera Nair at Main Auditorium.';
  const nlp = runNlpPipeline(sample);

  assert.ok(nlp.cleanedWordCount > 15);
  assert.ok(nlp.filteredTokens.length < nlp.cleanedWordCount);
  assert.ok(nlp.entities.some((e) => e.type === 'DEADLINE' && e.text.includes('25 November 2026')));
  assert.ok(nlp.entities.some((e) => e.type === 'COURSE' && e.text === 'BCA-501'));
  assert.ok(nlp.entities.some((e) => e.type === 'DEPARTMENT' && e.text.includes('Department of Computer Applications')));
  assert.ok(nlp.entities.some((e) => e.type === 'FEE' && e.text.includes('1,800')));
  assert.ok(nlp.entities.some((e) => e.type === 'VENUE' && e.text.includes('Main Auditorium')));
  assert.ok(nlp.entities.some((e) => e.type === 'AUTHORITY' && e.text.includes('Dr. Meera Nair')));
});

test('Module 3 (Classification): Both TF-IDF NB and Transformer classify campus notices accurately', () => {
  const examRes = classifyDocument(
    'End-semester examination hall tickets and exam timetable for BCA Semester V released by Examination Cell.'
  );
  assert.equal(examRes.baseline.predictedCategory, 'Examination announcements');
  assert.equal(examRes.transformer.predictedCategory, 'Examination announcements');

  const feeRes = classifyDocument(
    'Last date to pay semester tuition fee of Rs. 42,500 via UPI or bank challan at Accounts Office without late fine.'
  );
  assert.equal(feeRes.baseline.predictedCategory, 'Fee-related announcements');
  assert.equal(feeRes.transformer.predictedCategory, 'Fee-related announcements');

  const holRes = classifyDocument(
    'College campus remains closed for Christmas public holiday and winter vacation recess until 3 January.'
  );
  assert.equal(holRes.transformer.predictedCategory, 'Holidays');

  const bench = getClassifierBenchmarks();
  assert.ok(bench.baseline.accuracy >= 0.75, `Baseline accuracy too low: ${bench.baseline.accuracy}`);
  assert.ok(bench.transformer.accuracy >= 0.8, `Transformer accuracy too low: ${bench.transformer.accuracy}`);
  const matrixTotal = bench.transformer.confusionMatrix.flat().reduce((a, b) => a + b, 0);
  assert.equal(matrixTotal, bench.testSize);
});

test('Module 4 (Sentiment): Bi-GRU handles positive, negative, negation, and contrastive clauses', () => {
  const pos = analyzeSentiment('The faculty mentorship and AI lab sessions are excellent and super helpful.');
  assert.equal(pos.label, 'Positive');
  assert.ok(pos.polarity > 0.3);

  const neg = analyzeSentiment('The campus Wi-Fi is painfully slow and the fee portal crashes constantly.');
  assert.equal(neg.label, 'Negative');
  assert.ok(neg.polarity < -0.3);

  const negated = analyzeSentiment('The seminar audio was not good and not clear at all.');
  assert.equal(negated.label, 'Negative');
  assert.ok(negated.polarity < 0, 'Negation should flip positive adjectives to negative');

  const contrastive = analyzeSentiment(
    'The faculty is great, however the lab computers are broken and painfully slow.'
  );
  assert.equal(contrastive.label, 'Negative', 'Contrastive reset gate should prioritize post-however clause');

  const neutral = analyzeSentiment('Elective registration opens on November 19 on the academic portal.');
  assert.equal(neutral.label, 'Neutral');
});

test('Module 5 (Semantic Search): Dense embeddings beat exact keyword search on conceptual queries', () => {
  const docs = createInitialDocuments();
  const store = new CampusVectorStore();
  store.buildFromDocuments(docs);

  assert.ok(store.size() >= docs.length);

  // Query uses "tuition" and "money" / "cost" — check semantic retrieval finds Fee circular #1
  const semanticHits = store.searchSemantic('when is the deadline to pay college tuition cost');
  assert.ok(semanticHits.length > 0);
  assert.equal(semanticHits[0].category, 'Fee-related announcements');

  // Verify synonyms have high embedding cosine similarity
  const simSynonyms = cosineSimilarity(embedText('pay tuition dues'), embedText('semester fee challan'));
  const simUnrelated = cosineSimilarity(embedText('pay tuition dues'), embedText('christmas winter holiday'));
  assert.ok(simSynonyms > simUnrelated + 0.25);
});

test('Module 6 (AI Assistant): Returns grounded cited answers and refuses out-of-scope questions', () => {
  const docs = createInitialDocuments();
  const store = new CampusVectorStore();
  store.buildFromDocuments(docs);

  const examAnswer = answerStudentQuestion('When is the last date to submit the BCA exam form?', store);
  assert.equal(examAnswer.grounded, true);
  assert.ok(examAnswer.citations.length > 0);
  assert.match(examAnswer.answer, /25 November 2026/);

  const outOfScope = answerStudentQuestion('What is the recipe for baking chocolate lava cake on Mars?', store);
  assert.equal(outOfScope.grounded, false);
  assert.equal(outOfScope.citations.length, 0);
  assert.match(outOfScope.answer, /could not find this information/i);
});
