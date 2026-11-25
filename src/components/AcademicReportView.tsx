import React, { useMemo, useState } from 'react';
import { Check, Copy } from 'lucide-react';
import {
  PYTHON_MODULES_BLUEPRINT,
  PYTHON_PROJECT_STRUCTURE,
  PYTHON_SETUP_COMMANDS,
} from '../data/seedData';
import { getClassifierBenchmarks } from '../engine/classifier';

type ReportTab = 'overview' | 'architecture' | 'comparisons' | 'python';

export const AcademicReportView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ReportTab>('overview');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const benchmarks = useMemo(() => getClassifierBenchmarks(), []);

  const handleCopy = (key: string, text: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).catch(() => {});
    }
    setCopiedKey(key);
    setTimeout(() => setCopiedKey((curr) => (curr === key ? null : curr)), 1800);
  };

  return (
    <div className="space-y-8">
      <div className="border-b border-slate-200 pb-5">
        <p className="text-xs font-medium text-blue-700">
          University BCA AI/ML Project Report, Viva Reference & Python/Streamlit Blueprint
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-1">
          Academic Documentation & Architecture
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Structured academic report covering problem formulation, NLP/ML methodology, model
          evaluation comparisons, limitations, and the local Python/Streamlit deployment blueprint.
        </p>
      </div>

      {/* Section Tabs */}
      <div
        className="inline-flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg"
        role="tablist"
        aria-label="Academic report sections"
      >
        {(
          [
            ['overview', '1. Problem, Objectives & Literature'],
            ['architecture', '2. Architecture & Methodology'],
            ['comparisons', '3. Metrics & Paradigm Comparisons'],
            ['python', '4. Python / Streamlit Roadmap'],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={activeTab === key}
            onClick={() => setActiveTab(key)}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              activeTab === key
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* TAB 1: Problem Statement, Objectives, Background */}
      {activeTab === 'overview' && (
        <div className="bg-white border border-slate-200 rounded-lg p-6 sm:p-8 space-y-6">
          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-900">01. Problem Statement</h2>
            <p className="text-sm text-slate-700 leading-relaxed max-w-4xl">
              College students receive hundreds of unstructured academic circulars each semester
              across scattered PDF attachments, notice-board photographs, and email bulletins
              covering examination schedules, fee deadlines, attendance rules, scholarships, and
              campus events. Traditional keyword search portals fail when students phrase queries
              differently from administrative jargon (for example, searching &ldquo;tuition cost&rdquo;
              when the circular states &ldquo;semester dues challan&rdquo;), while unindexed scanned
              notices cannot be searched at all. Furthermore, student feedback collected through
              free-text forms is rarely analyzed systematically for actionable administrative insights.
            </p>
          </section>

          <section className="space-y-2 pt-4 border-t border-slate-200">
            <h2 className="text-lg font-semibold text-slate-900">02. Project Objectives</h2>
            <ul className="list-disc list-inside space-y-1.5 text-sm text-slate-700 leading-relaxed max-w-4xl">
              <li>
                Build a unified, laptop-executable document ingestion pipeline supporting PDF, TXT,
                and scanned image circulars with OpenCV computer vision preprocessing (grayscale,
                Gaussian denoising, contrast normalization, and Otsu/adaptive binarization).
              </li>
              <li>
                Apply core Natural Language Processing techniques (tokenization, stop-word removal,
                Porter stemming, lemmatization, POS tagging, and Named Entity Recognition) to
                automatically mine dates, deadlines, course codes, fees, and departments.
              </li>
              <li>
                Classify academic notices into six standardized campus categories using both
                traditional statistical machine learning (TF-IDF + Multinomial Naive Bayes) and a
                dense semantic Transformer-inspired classifier.
              </li>
              <li>
                Analyze student feedback sentiment (Positive, Neutral, Negative) using a
                sequence-aware gated recurrent approach (Bi-GRU) that captures negation scope and
                contrastive clauses.
              </li>
              <li>
                Enable natural-language semantic search via dense vector embeddings and power a
                strictly grounded Question-Answering Student Assistant with source citations and
                explicit out-of-scope refusal.
              </li>
            </ul>
          </section>

          <section className="space-y-2 pt-4 border-t border-slate-200">
            <h2 className="text-lg font-semibold text-slate-900">
              03. Literature & Background Overview
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 text-sm text-slate-700 leading-relaxed">
              <div>
                <h3 className="font-semibold text-slate-900 mb-1">
                  Classical IR & Statistical NLP (1970s–2010s)
                </h3>
                <p>
                  Early academic search systems relied on inverted indices, Porter stemming (1980),
                  TF-IDF weighting, and Okapi BM25 ranking alongside probabilistic Naive Bayes and
                  Linear SVM classifiers. These methods remain fast, transparent, and CPU-friendly,
                  making them ideal baselines for intermediate AI projects.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 mb-1">
                  Neural Embeddings & Grounded RAG (2018–Present)
                </h3>
                <p>
                  Recurrent architectures (LSTM/GRU) introduced gating mechanisms to model word
                  order and negation, while Transformer encoders (BERT, DistilBERT, Sentence-BERT)
                  and vector databases (FAISS, ChromaDB) enabled dense semantic retrieval and
                  Retrieval-Augmented Generation (RAG) grounded in verified institutional sources.
                </p>
              </div>
            </div>
          </section>

          <section className="space-y-2 pt-4 border-t border-slate-200">
            <h2 className="text-lg font-semibold text-slate-900">
              04. Limitations & Future Scope
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 text-sm text-slate-700 leading-relaxed">
              <div>
                <h3 className="font-semibold text-slate-900 mb-1">Current Limitations</h3>
                <ul className="list-disc list-inside space-y-1">
                  <li>
                    Handwritten cursive notices or heavily skewed low-DPI phone photos still degrade
                    OCR accuracy without deep scene-text recognition (CRNN/TrOCR).
                  </li>
                  <li>
                    Compact training corpora (60 labeled circulars) require expansion per university
                    for domain-specific edge categories.
                  </li>
                  <li>
                    Extractive grounded QA prioritizes precision and zero hallucination over
                    free-form multi-document abstractive summarization.
                  </li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 mb-1">Future Scope</h3>
                <ul className="list-disc list-inside space-y-1">
                  <li>
                    Multilingual regional-language notice support using multilingual Sentence-BERT
                    embeddings.
                  </li>
                  <li>
                    Automated iCal/Google Calendar export for extracted examination and fee deadlines.
                  </li>
                  <li>
                    Role-based faculty upload portal with persistent PostgreSQL/ChromaDB backing and
                    scheduled syllabus change detection.
                  </li>
                </ul>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* TAB 2: Architecture & Methodology */}
      {activeTab === 'architecture' && (
        <div className="bg-white border border-slate-200 rounded-lg p-6 sm:p-8 space-y-6">
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">
              System Architecture Pipeline
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              {[
                {
                  step: '01. Ingestion & CV Layer',
                  desc: 'Validates PDF/TXT/Image files (<=10 MB). Applies OpenCV grayscale, 3x3 Gaussian blur, histogram contrast stretch, Otsu/adaptive binarization, and text-line segmentation before text normalization.',
                },
                {
                  step: '02. NLP & ML Intelligence Layer',
                  desc: 'Runs tokenization, stop-word filtering, Porter stemming, lemmatization, Penn POS tagging, and regex+contextual NER. Dual classifiers assign one of 6 categories.',
                },
                {
                  step: '03. Vector Store & Grounded QA Layer',
                  desc: 'Splits text into overlapping 3-sentence chunks, encodes 256-dim normalized embeddings, indexes in Cosine IP Vector Store, and synthesizes cited answers with a 0.24 grounding threshold.',
                },
              ].map((block) => (
                <div
                  key={block.step}
                  className="border border-slate-200 rounded-lg p-4 bg-slate-50/50 space-y-1.5"
                >
                  <h3 className="text-sm font-semibold text-slate-900">{block.step}</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">{block.desc}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-3 pt-4 border-t border-slate-200">
            <h2 className="text-lg font-semibold text-slate-900">
              Algorithms & Mathematical Formulations Used
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="py-2.5 pr-4">Module</th>
                    <th className="py-2.5 pr-4">Algorithm / Model</th>
                    <th className="py-2.5 pr-4">Core Mechanism</th>
                    <th className="py-2.5">Why Selected</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  <tr>
                    <td className="py-3 pr-4 font-semibold text-slate-900 whitespace-nowrap">
                      1. CV Preprocessing
                    </td>
                    <td className="py-3 pr-4 font-mono">Otsu + Adaptive Mean + 3×3 Gaussian</td>
                    <td className="py-3 pr-4">
                      Maximizes inter-class intensity variance σ²_B(t) to separate ink from noisy paper
                    </td>
                    <td className="py-3">Zero manual tuning needed for varied campus scans</td>
                  </tr>
                  <tr>
                    <td className="py-3 pr-4 font-semibold text-slate-900 whitespace-nowrap">
                      2. NLP & NER
                    </td>
                    <td className="py-3 pr-4 font-mono">Porter Stemmer + Rule POS + Hybrid NER</td>
                    <td className="py-3 pr-4">
                      Suffix stripping vs. dictionary root mapping; cue-anchored deadline extraction
                    </td>
                    <td className="py-3">High precision on academic codes (BCA-501) and ₹ fees</td>
                  </tr>
                  <tr>
                    <td className="py-3 pr-4 font-semibold text-slate-900 whitespace-nowrap">
                      3. Classification
                    </td>
                    <td className="py-3 pr-4 font-mono">TF-IDF + MultinomialNB &amp; Semantic Encoder</td>
                    <td className="py-3 pr-4">
                      Log-likelihood with Laplace smoothing vs. cosine-attention class prototypes
                    </td>
                    <td className="py-3">Demonstrates classical ML vs. dense neural representations</td>
                  </tr>
                  <tr>
                    <td className="py-3 pr-4 font-semibold text-slate-900 whitespace-nowrap">
                      4. Sentiment Analysis
                    </td>
                    <td className="py-3 pr-4 font-mono">Bi-GRU Gated Sequence vs. BoW Baseline</td>
                    <td className="py-3 pr-4">
                      Update/reset gates propagate negation windows and contrastive discourse shifts
                    </td>
                    <td className="py-3">Correctly resolves mixed reviews (&ldquo;good, however slow&rdquo;)</td>
                  </tr>
                  <tr>
                    <td className="py-3 pr-4 font-semibold text-slate-900 whitespace-nowrap">
                      5. Semantic Search
                    </td>
                    <td className="py-3 pr-4 font-mono">Dense Embeddings + Cosine FlatIP</td>
                    <td className="py-3 pr-4">
                      Cosine(q, d) over L2-normalized dense concept + subword vectors
                    </td>
                    <td className="py-3">Retrieves conceptual matches when exact words differ</td>
                  </tr>
                  <tr>
                    <td className="py-3 pr-4 font-semibold text-slate-900 whitespace-nowrap">
                      6. AI Assistant
                    </td>
                    <td className="py-3 pr-4 font-mono">Intent-Weighted Extractive RAG</td>
                    <td className="py-3 pr-4">
                      Top-k vector retrieval + entity-intent sentence scoring + 0.24 refusal gate
                    </td>
                    <td className="py-3">Zero paid API cost, 100% verifiable citations, no hallucinations</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section className="space-y-2 pt-4 border-t border-slate-200">
            <h2 className="text-lg font-semibold text-slate-900">Dataset Description</h2>
            <p className="text-sm text-slate-700 leading-relaxed max-w-4xl">
              The classification evaluation dataset comprises{' '}
              <span className="font-mono font-semibold text-slate-900">60</span> curated campus
              notices balanced across 6 institutional categories (10 notices per category),
              partitioned via stratified split into{' '}
              <span className="font-mono font-semibold text-slate-900">
                {benchmarks.trainSize} training
              </span>{' '}
              and{' '}
              <span className="font-mono font-semibold text-slate-900">
                {benchmarks.testSize} holdout test
              </span>{' '}
              documents. Additionally, the live workspace ships with 8 full-length multi-paragraph
              seed circulars (PDF/TXT/OCR), 2 synthetic noisy scanned notice images for OpenCV
              testing, and 12 multi-aspect student feedback samples covering positive, negative,
              neutral, negated, and contrastive expressions.
            </p>
          </section>
        </div>
      )}

      {/* TAB 3: Evaluation Metrics & Paradigm Comparisons */}
      {activeTab === 'comparisons' && (
        <div className="space-y-6">
          <section className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
            <h2 className="text-lg font-semibold text-slate-900">
              Traditional ML (TF-IDF + Naive Bayes) vs. Dense Transformer Classification
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="py-2.5 pr-4">Evaluation Dimension</th>
                    <th className="py-2.5 pr-4">TF-IDF + Multinomial Naive Bayes</th>
                    <th className="py-2.5">Transformer Semantic Encoder</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  <tr>
                    <td className="py-2.5 pr-4 font-medium text-slate-900">Holdout Accuracy</td>
                    <td className="py-2.5 pr-4 font-mono tabular-nums">
                      {(benchmarks.baseline.accuracy * 100).toFixed(1)}%
                    </td>
                    <td className="py-2.5 font-mono font-semibold text-blue-700 tabular-nums">
                      {(benchmarks.transformer.accuracy * 100).toFixed(1)}%
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 pr-4 font-medium text-slate-900">Macro F1-Score</td>
                    <td className="py-2.5 pr-4 font-mono tabular-nums">
                      {(benchmarks.baseline.macroF1 * 100).toFixed(1)}%
                    </td>
                    <td className="py-2.5 font-mono font-semibold text-blue-700 tabular-nums">
                      {(benchmarks.transformer.macroF1 * 100).toFixed(1)}%
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 pr-4 font-medium text-slate-900">Representation</td>
                    <td className="py-2.5 pr-4">Sparse bag-of-ngrams TF-IDF feature matrix</td>
                    <td className="py-2.5">Dense 256-dim semantic vector + prototype attention</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 pr-4 font-medium text-slate-900">Synonym Handling</td>
                    <td className="py-2.5 pr-4">
                      Weak — unseen synonyms (&ldquo;recess&rdquo; vs &ldquo;vacation&rdquo;) get zero weight
                    </td>
                    <td className="py-2.5">
                      Strong — maps semantically related terms to aligned latent subspaces
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 pr-4 font-medium text-slate-900">Compute & Interpretability</td>
                    <td className="py-2.5 pr-4">Sub-millisecond CPU inference; direct word likelihoods</td>
                    <td className="py-2.5">Moderate CPU compute (DistilBERT ~66M params in Python)</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
            <h2 className="text-lg font-semibold text-slate-900">
              Keyword-Based Search (BM25) vs. Embedding-Based Semantic Search
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="py-2.5 pr-4">Aspect</th>
                    <th className="py-2.5 pr-4">Traditional Keyword Search (BM25 / TF-IDF)</th>
                    <th className="py-2.5">Embedding Semantic Search (FAISS / Vector DB)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  <tr>
                    <td className="py-2.5 pr-4 font-medium text-slate-900">Matching Criterion</td>
                    <td className="py-2.5 pr-4">Exact lexical overlap (inverted token index)</td>
                    <td className="py-2.5">Geometric proximity (Cosine Similarity in ℝᵈ)</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 pr-4 font-medium text-slate-900">Vocabulary Mismatch</td>
                    <td className="py-2.5 pr-4">
                      Fails on &ldquo;tuition cost&rdquo; vs. &ldquo;semester fee dues&rdquo;
                    </td>
                    <td className="py-2.5">
                      Retrieves Fee Circular #1 with high cosine similarity
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 pr-4 font-medium text-slate-900">Exact Code Lookups</td>
                    <td className="py-2.5 pr-4">Excellent for exact IDs like &ldquo;BCA-501&rdquo; or &ldquo;AFO/2026/118&rdquo;</td>
                    <td className="py-2.5">Requires char n-gram / hybrid boost for exact reference numbers</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 pr-4 font-medium text-slate-900">Best Practical Pattern</td>
                    <td className="py-2.5 pr-4" colSpan={2}>
                      Combine dense semantic embeddings with lexical/subword features (as implemented
                      in Module 5) so both conceptual queries and exact course codes rank accurately.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {/* TAB 4: Python & Streamlit Submission Blueprint */}
      {activeTab === 'python' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <section className="bg-white border border-slate-200 rounded-lg p-6 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-900">
                  Modular Python / Streamlit Folder Structure
                </h2>
                <button
                  type="button"
                  onClick={() => handleCopy('tree', PYTHON_PROJECT_STRUCTURE)}
                  className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:underline"
                >
                  {copiedKey === 'tree' ? (
                    <>
                      <Check className="w-3.5 h-3.5" aria-hidden="true" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                      Copy
                    </>
                  )}
                </button>
              </div>
              <pre className="p-4 rounded-lg bg-slate-900 text-slate-100 text-xs font-mono overflow-x-auto leading-relaxed">
                {PYTHON_PROJECT_STRUCTURE}
              </pre>
            </section>

            <section className="bg-white border border-slate-200 rounded-lg p-6 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-900">
                  Local Environment Setup & Run Commands
                </h2>
                <button
                  type="button"
                  onClick={() => handleCopy('setup', PYTHON_SETUP_COMMANDS)}
                  className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:underline"
                >
                  {copiedKey === 'setup' ? (
                    <>
                      <Check className="w-3.5 h-3.5" aria-hidden="true" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                      Copy
                    </>
                  )}
                </button>
              </div>
              <pre className="p-4 rounded-lg bg-slate-900 text-slate-100 text-xs font-mono overflow-x-auto leading-relaxed">
                {PYTHON_SETUP_COMMANDS}
              </pre>
            </section>
          </div>

          <section className="bg-white border border-slate-200 rounded-lg p-6 space-y-5">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Reference Python Module Implementations (Viva Study Guide)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Direct Python equivalents (OpenCV, NLTK/spaCy, Scikit-learn, FAISS) of the live
                algorithms running in this dashboard
              </p>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {PYTHON_MODULES_BLUEPRINT.map((mod) => (
                <div key={mod.stage} className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-xs font-semibold text-slate-900">{mod.stage}</h3>
                    <button
                      type="button"
                      onClick={() => handleCopy(mod.stage, mod.code)}
                      className="inline-flex items-center gap-1 text-xs text-blue-700 hover:underline whitespace-nowrap"
                    >
                      {copiedKey === mod.stage ? 'Copied' : 'Copy Code'}
                    </button>
                  </div>
                  <pre className="p-3.5 rounded-lg bg-slate-900 text-slate-100 text-xs font-mono overflow-x-auto leading-relaxed">
                    {mod.code}
                  </pre>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
};
