import React, { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { DOCUMENT_CATEGORIES, type CampusDocument } from '../types';
import { classifyDocument, getClassifierBenchmarks } from '../engine/classifier';

interface ClassificationViewProps {
  documents: CampusDocument[];
  activeModel: 'baseline' | 'transformer';
  onChangeActiveModel: (model: 'baseline' | 'transformer') => void;
}

const SHORT_CAT: Record<string, string> = {
  'Examination announcements': 'Exam',
  'Academic notices': 'Academic',
  'Fee-related announcements': 'Fees',
  'College events': 'Events',
  Holidays: 'Holidays',
  'General announcements': 'General',
};

export const ClassificationView: React.FC<ClassificationViewProps> = ({
  documents,
  activeModel,
  onChangeActiveModel,
}) => {
  const benchmarks = useMemo(() => getClassifierBenchmarks(), []);
  const [testInput, setTestInput] = useState(
    'Last date to deposit semester laboratory and tuition dues via NEFT or UPI is 15 December 2026 to avoid late surcharge.'
  );
  const [testError, setTestError] = useState('');
  const [liveResult, setLiveResult] = useState(() => classifyDocument(testInput, activeModel));

  const handleTestClassify = (e: React.FormEvent) => {
    e.preventDefault();
    if (testInput.trim().length < 10) {
      setTestError('Enter at least 10 characters of text to run classification.');
      return;
    }
    setTestError('');
    setLiveResult(classifyDocument(testInput, activeModel));
  };

  const metricComparisonData = [
    {
      metric: 'Accuracy',
      'TF-IDF + Naive Bayes': Number((benchmarks.baseline.accuracy * 100).toFixed(1)),
      'Transformer Semantic': Number((benchmarks.transformer.accuracy * 100).toFixed(1)),
    },
    {
      metric: 'Macro Precision',
      'TF-IDF + Naive Bayes': Number((benchmarks.baseline.macroPrecision * 100).toFixed(1)),
      'Transformer Semantic': Number((benchmarks.transformer.macroPrecision * 100).toFixed(1)),
    },
    {
      metric: 'Macro Recall',
      'TF-IDF + Naive Bayes': Number((benchmarks.baseline.macroRecall * 100).toFixed(1)),
      'Transformer Semantic': Number((benchmarks.transformer.macroRecall * 100).toFixed(1)),
    },
    {
      metric: 'Macro F1-Score',
      'TF-IDF + Naive Bayes': Number((benchmarks.baseline.macroF1 * 100).toFixed(1)),
      'Transformer Semantic': Number((benchmarks.transformer.macroF1 * 100).toFixed(1)),
    },
  ];

  const activeBenchmark =
    activeModel === 'baseline' ? benchmarks.baseline : benchmarks.transformer;

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <p className="text-xs font-medium text-blue-700">
            Module 3 · TF-IDF + Multinomial Naive Bayes vs. Transformer Semantic Encoder
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-1">
            Intelligent Document Classification
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Compare traditional statistical ML against dense contextual classification across all 6
            campus notice categories.
          </p>
        </div>

        <div
          className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-lg shrink-0"
          role="group"
          aria-label="Active classification model"
        >
          <button
            type="button"
            onClick={() => onChangeActiveModel('baseline')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              activeModel === 'baseline'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            TF-IDF + Naive Bayes
          </button>
          <button
            type="button"
            onClick={() => onChangeActiveModel('transformer')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              activeModel === 'transformer'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Transformer Semantic
          </button>
        </div>
      </div>

      {/* Live Custom Notice Tester */}
      <section className="bg-white border border-slate-200 rounded-lg p-6 space-y-5">
        <div>
          <h2 className="text-base font-semibold text-slate-900">
            Live Dual-Model Classifier Playground
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Test any unseen notice text simultaneously on TF-IDF + Naive Bayes and Transformer Semantic Encoder
          </p>
        </div>

        <form onSubmit={handleTestClassify} className="space-y-3">
          <label htmlFor="classifier-test-input" className="sr-only">
            Test notice text
          </label>
          <textarea
            id="classifier-test-input"
            rows={3}
            value={testInput}
            onChange={(e) => setTestInput(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
          {testError && <p className="text-xs text-red-600">{testError}</p>}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-slate-500">Try sample:</span>
              <button
                type="button"
                onClick={() => {
                  const s =
                    'Campus remains closed on 26 January on account of Republic Day national holiday.';
                  setTestInput(s);
                  setLiveResult(classifyDocument(s, activeModel));
                }}
                className="text-blue-700 hover:underline"
              >
                Holiday Circular
              </button>
              <span aria-hidden="true" className="text-slate-300">·</span>
              <button
                type="button"
                onClick={() => {
                  const s =
                    'Register your 4-member team for the Annual AI Hackathon and cultural fest at Main Auditorium.';
                  setTestInput(s);
                  setLiveResult(classifyDocument(s, activeModel));
                }}
                className="text-blue-700 hover:underline"
              >
                College Event
              </button>
              <span aria-hidden="true" className="text-slate-300">·</span>
              <button
                type="button"
                onClick={() => {
                  const s =
                    'End-semester supplementary backlog exam admit cards and seating chart released by Examination Cell.';
                  setTestInput(s);
                  setLiveResult(classifyDocument(s, activeModel));
                }}
                className="text-blue-700 hover:underline"
              >
                Exam Notice
              </button>
            </div>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors whitespace-nowrap"
            >
              Classify Text
            </button>
          </div>
        </form>

        {/* Side-by-Side Prediction Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-200">
          {[liveResult.baseline, liveResult.transformer].map((modelOut) => (
            <div key={modelOut.modelName} className="space-y-3">
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="text-sm font-semibold text-slate-900">{modelOut.modelName}</h3>
                <span className="font-mono text-xs text-emerald-700 font-semibold tabular-nums">
                  {(modelOut.confidence * 100).toFixed(1)}% confidence
                </span>
              </div>
              <p className="text-sm font-semibold text-blue-700">
                Predicted: {modelOut.predictedCategory}
              </p>
              <div className="space-y-2">
                {modelOut.scores.slice(0, 4).map((sc) => (
                  <div key={sc.category} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-700">{sc.category}</span>
                      <span className="font-mono text-slate-600 tabular-nums">
                        {(sc.probability * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          sc.category === modelOut.predictedCategory
                            ? 'bg-blue-700'
                            : 'bg-slate-400'
                        }`}
                        style={{ width: `${Math.max(2, Math.round(sc.probability * 100))}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-slate-500">
                Top predictive features:{' '}
                <span className="font-mono text-slate-700">
                  {modelOut.topFeatures.length > 0 ? modelOut.topFeatures.join(', ') : 'None'}
                </span>
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Uploaded Documents Classification Results */}
      <section className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900">
            Uploaded Campus Documents Classification Results
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Active model: <span className="font-medium text-slate-800">{activeModel === 'baseline' ? 'TF-IDF + Naive Bayes' : 'Transformer Semantic Encoder'}</span>
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-medium text-slate-500">
                <th className="py-2.5 pr-4">Document</th>
                <th className="py-2.5 pr-4">TF-IDF + Naive Bayes</th>
                <th className="py-2.5 pr-4">Transformer Semantic</th>
                <th className="py-2.5 pr-4">Key Terms</th>
                <th className="py-2.5 text-right">Model Consensus</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {documents.map((doc) => (
                <tr key={doc.id} className="hover:bg-slate-50">
                  <td className="py-3 pr-4 font-medium text-slate-900 max-w-xs truncate">
                    {doc.title}
                  </td>
                  <td className="py-3 pr-4 whitespace-nowrap">
                    <span className="text-slate-800">
                      {doc.classification.baseline.predictedCategory}
                    </span>
                    <span className="font-mono text-slate-500 ml-1.5 tabular-nums">
                      ({(doc.classification.baseline.confidence * 100).toFixed(0)}%)
                    </span>
                  </td>
                  <td className="py-3 pr-4 whitespace-nowrap">
                    <span className="font-medium text-blue-700">
                      {doc.classification.transformer.predictedCategory}
                    </span>
                    <span className="font-mono text-slate-500 ml-1.5 tabular-nums">
                      ({(doc.classification.transformer.confidence * 100).toFixed(0)}%)
                    </span>
                  </td>
                  <td className="py-3 pr-4 font-mono text-slate-600">
                    {doc.classification.transformer.topFeatures.slice(0, 3).join(', ')}
                  </td>
                  <td className="py-3 text-right font-medium whitespace-nowrap">
                    {doc.classification.modelsAgree ? (
                      <span className="text-emerald-700">Agreed</span>
                    ) : (
                      <span className="text-amber-700">Diverged</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Evaluation Metrics & Confusion Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <section className="lg:col-span-6 bg-white border border-slate-200 rounded-lg p-6 space-y-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Holdout Test Evaluation ({benchmarks.trainSize} Train / {benchmarks.testSize} Test)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Computed dynamically from the labeled 6-class campus notice corpus
            </p>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metricComparisonData} margin={{ top: 8, right: 8, left: -16, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="metric" tick={{ fill: '#475569', fontSize: 12 }} axisLine={{ stroke: '#cbd5e1' }} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} unit="%" />
                <Tooltip formatter={(val: unknown) => [`${val}%`]} />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="TF-IDF + Naive Bayes" fill="#64748b" radius={[4, 4, 0, 0]} maxBarSize={30} />
                <Bar dataKey="Transformer Semantic" fill="#1d4ed8" radius={[4, 4, 0, 0]} maxBarSize={30} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="lg:col-span-6 bg-white border border-slate-200 rounded-lg p-6 space-y-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Confusion Matrix — {activeBenchmark.modelName}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Rows = Actual class · Columns = Predicted class · Accuracy:{' '}
              <span className="font-mono font-semibold text-slate-900 tabular-nums">
                {(activeBenchmark.accuracy * 100).toFixed(1)}%
              </span>
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-center border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-2 px-2 text-left font-medium">Actual \ Pred</th>
                  {DOCUMENT_CATEGORIES.map((cat) => (
                    <th key={cat} className="py-2 px-1.5 font-medium whitespace-nowrap">
                      {SHORT_CAT[cat]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono tabular-nums">
                {DOCUMENT_CATEGORIES.map((rowCat, rIdx) => (
                  <tr key={rowCat}>
                    <td className="py-2 px-2 text-left font-sans font-medium text-slate-700 whitespace-nowrap">
                      {SHORT_CAT[rowCat]}
                    </td>
                    {activeBenchmark.confusionMatrix[rIdx].map((val, cIdx) => {
                      const isDiag = rIdx === cIdx;
                      const bg =
                        isDiag && val > 0
                          ? 'bg-blue-50 text-blue-800 font-semibold'
                          : !isDiag && val > 0
                            ? 'bg-red-50 text-red-700 font-semibold'
                            : 'text-slate-400';
                      return (
                        <td key={cIdx} className={`py-2 px-1.5 ${bg}`}>
                          {val}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
};
