import React, { useMemo, useState } from 'react';
import type { CampusDocument, EntityType } from '../types';
import { runNlpPipeline } from '../engine/nlpPipeline';

interface NlpInspectorViewProps {
  documents: CampusDocument[];
  selectedDocId: string;
  onSelectDoc: (docId: string) => void;
}

const ENTITY_TYPE_LABELS: Record<EntityType, string> = {
  DEADLINE: 'Deadline',
  DATE: 'Date',
  COURSE: 'Course / Subject',
  DEPARTMENT: 'Department / Office',
  FEE: 'Fee / Amount',
  VENUE: 'Venue / Location',
  AUTHORITY: 'Faculty / Authority',
};

const ENTITY_TEXT_COLORS: Record<EntityType, string> = {
  DEADLINE: 'text-red-700',
  DATE: 'text-amber-700',
  COURSE: 'text-blue-700',
  DEPARTMENT: 'text-indigo-700',
  FEE: 'text-emerald-700',
  VENUE: 'text-teal-700',
  AUTHORITY: 'text-slate-800',
};

export const NlpInspectorView: React.FC<NlpInspectorViewProps> = ({
  documents,
  selectedDocId,
  onSelectDoc,
}) => {
  const [sourceMode, setSourceMode] = useState<'document' | 'custom'>('document');
  const [customText, setCustomText] = useState(
    'Department of Computer Applications requires BCA-501 Machine Learning students to submit their ₹1,800 exam form to Dr. Meera Nair at Examination Hall A on or before 25 November 2026.'
  );
  const [hideStopWords, setHideStopWords] = useState(true);
  const [entityFilter, setEntityFilter] = useState<'ALL' | EntityType>('ALL');

  const activeDoc = documents.find((d) => d.id === selectedDocId) ?? documents[0];

  const nlpResult = useMemo(() => {
    if (sourceMode === 'custom') {
      return runNlpPipeline(customText);
    }
    return activeDoc ? activeDoc.nlp : runNlpPipeline('');
  }, [sourceMode, customText, activeDoc]);

  const visibleTokens = useMemo(() => {
    const base = hideStopWords
      ? nlpResult.tokens.filter((t) => !t.isStopWord)
      : nlpResult.tokens;
    return base.slice(0, 60);
  }, [nlpResult.tokens, hideStopWords]);

  const filteredEntities = useMemo(() => {
    if (entityFilter === 'ALL') return nlpResult.entities;
    return nlpResult.entities.filter((e) => e.type === entityFilter);
  }, [nlpResult.entities, entityFilter]);

  const stopWordCount = nlpResult.tokens.filter((t) => t.isStopWord).length;

  return (
    <div className="space-y-8">
      <div className="border-b border-slate-200 pb-5">
        <p className="text-xs font-medium text-blue-700">
          Module 2 · Tokenization, Stemming, Lemmatization, POS & NER
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-1">
          NLP Text Processing & Entity Extraction
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Inspect live linguistic pipeline transformations on any uploaded notice or test custom
          sentences in real time.
        </p>
      </div>

      {/* Source Selector */}
      <section className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-lg w-fit">
            <button
              type="button"
              onClick={() => setSourceMode('document')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                sourceMode === 'document'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Uploaded Document
            </button>
            <button
              type="button"
              onClick={() => setSourceMode('custom')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                sourceMode === 'custom'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Custom Text Sandbox
            </button>
          </div>

          {sourceMode === 'document' && documents.length > 0 && (
            <div className="flex items-center gap-2.5 flex-1 max-w-lg">
              <label htmlFor="nlp-doc-select" className="text-xs font-medium text-slate-600 whitespace-nowrap">
                Select Notice:
              </label>
              <select
                id="nlp-doc-select"
                value={activeDoc?.id ?? ''}
                onChange={(e) => onSelectDoc(e.target.value)}
                className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white text-slate-900"
              >
                {documents.map((doc) => (
                  <option key={doc.id} value={doc.id}>
                    {doc.title}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {sourceMode === 'custom' ? (
          <div>
            <label htmlFor="nlp-custom-input" className="block text-xs font-medium text-slate-700 mb-1.5">
              Input Academic Text to Analyze
            </label>
            <textarea
              id="nlp-custom-input"
              rows={3}
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>
        ) : activeDoc ? (
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
            <p className="text-xs font-medium text-slate-500 mb-1.5">
              Normalized Text · {activeDoc.fileName} · {activeDoc.classification.activeCategory}
            </p>
            <p className="text-sm text-slate-800 whitespace-pre-line leading-relaxed max-h-40 overflow-y-auto">
              {activeDoc.cleanedText}
            </p>
          </div>
        ) : (
          <p className="text-sm text-slate-500">Upload a document first to inspect its NLP pipeline.</p>
        )}

        {/* Quantitative NLP Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 pt-3 border-t border-slate-200">
          <div>
            <p className="text-xs text-slate-500">Total Tokens</p>
            <p className="text-lg font-bold font-mono text-slate-900 tabular-nums">
              {nlpResult.cleanedWordCount}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Stop-words Removed</p>
            <p className="text-lg font-bold font-mono text-slate-900 tabular-nums">
              {stopWordCount}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Unique Lemmas</p>
            <p className="text-lg font-bold font-mono text-slate-900 tabular-nums">
              {nlpResult.vocabularySize}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Sentences</p>
            <p className="text-lg font-bold font-mono text-slate-900 tabular-nums">
              {nlpResult.sentenceCount}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Lexical Diversity</p>
            <p className="text-lg font-bold font-mono text-blue-700 tabular-nums">
              {(nlpResult.lexicalDiversity * 100).toFixed(1)}%
            </p>
          </div>
        </div>
      </section>

      {/* Named Entity Recognition (NER) & Structured Dates */}
      <section className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Named Entity Recognition (NER) & Structured Extraction ({filteredEntities.length})
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Identifies dates, deadlines, course codes, departments, fees, venues, and faculty authorities
            </p>
          </div>
          <select
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value as 'ALL' | EntityType)}
            aria-label="Filter extracted entities by type"
            className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white text-slate-700 w-fit"
          >
            <option value="ALL">All Entity Types</option>
            {(Object.keys(ENTITY_TYPE_LABELS) as EntityType[]).map((type) => (
              <option key={type} value={type}>
                {ENTITY_TYPE_LABELS[type]}
              </option>
            ))}
          </select>
        </div>

        {filteredEntities.length === 0 ? (
          <p className="text-sm text-slate-500 py-6 text-center border-t border-slate-100">
            No entities of this type were detected in the selected text.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-medium text-slate-500">
                  <th className="py-2.5 pr-4">Entity Type</th>
                  <th className="py-2.5 pr-4">Extracted Value</th>
                  <th className="py-2.5 pr-4">Supporting Sentence Context</th>
                  <th className="py-2.5 text-right">Confidence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredEntities.map((ent, idx) => (
                  <tr key={`${ent.type}-${ent.text}-${idx}`} className="hover:bg-slate-50">
                    <td className={`py-2.5 pr-4 font-mono text-xs font-semibold whitespace-nowrap ${ENTITY_TEXT_COLORS[ent.type]}`}>
                      {ENTITY_TYPE_LABELS[ent.type]}
                    </td>
                    <td className="py-2.5 pr-4 font-medium text-slate-900 whitespace-nowrap">
                      {ent.text}
                    </td>
                    <td className="py-2.5 pr-4 text-xs text-slate-600 leading-relaxed">
                      {ent.context}
                    </td>
                    <td className="py-2.5 text-right font-mono text-xs text-slate-700 tabular-nums">
                      {(ent.confidence * 100).toFixed(0)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Tokenization, Porter Stemming, Lemmatization & POS Table */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <section className="lg:col-span-8 bg-white border border-slate-200 rounded-lg p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Tokenization, Stemming vs. Lemmatization & POS Tagging
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Showing first {visibleTokens.length} tokens · Compare algorithmic Porter stems against dictionary lemmas
              </p>
            </div>
            <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={hideStopWords}
                onChange={(e) => setHideStopWords(e.target.checked)}
                className="rounded border-slate-300 text-blue-700"
              />
              Hide Stop-Words
            </label>
          </div>

          <div className="overflow-x-auto max-h-96 overflow-y-auto">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-white">
                <tr className="border-b border-slate-200 text-xs font-medium text-slate-500">
                  <th className="py-2 pr-4">Original Token</th>
                  <th className="py-2 pr-4">Porter Stem</th>
                  <th className="py-2 pr-4">Lemma</th>
                  <th className="py-2 pr-4">POS Tag</th>
                  <th className="py-2">Stop-Word</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {visibleTokens.map((tok, i) => (
                  <tr key={`${tok.original}-${i}`} className="hover:bg-slate-50">
                    <td className="py-2 pr-4 font-medium text-slate-900">{tok.original}</td>
                    <td className="py-2 pr-4 font-mono text-slate-600">{tok.stem}</td>
                    <td className="py-2 pr-4 font-mono text-blue-700">{tok.lemma}</td>
                    <td className="py-2 pr-4">
                      <span className="font-mono font-semibold text-slate-800">{tok.pos}</span>
                      <span className="text-slate-500"> · {tok.posLabel}</span>
                    </td>
                    <td className="py-2 text-slate-500">{tok.isStopWord ? 'Filtered' : 'Kept'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Top Keywords Frequency */}
        <section className="lg:col-span-4 bg-white border border-slate-200 rounded-lg p-6 space-y-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Top Normalized Lemmas</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Post-stop-word term frequencies feeding TF-IDF
            </p>
          </div>
          {nlpResult.topKeywords.length === 0 ? (
            <p className="text-xs text-slate-500">No keywords extracted.</p>
          ) : (
            <div className="space-y-3">
              {nlpResult.topKeywords.map((kw) => {
                const maxCount = nlpResult.topKeywords[0]?.count || 1;
                const widthPct = Math.max(10, Math.round((kw.count / maxCount) * 100));
                return (
                  <div key={kw.term} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono font-medium text-slate-800">{kw.term}</span>
                      <span className="font-mono text-slate-500 tabular-nums">{kw.count}×</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-700 rounded-full"
                        style={{ width: `${widthPct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
