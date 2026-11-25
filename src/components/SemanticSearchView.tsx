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
import { Eye, Search } from 'lucide-react';
import { CampusVectorStore, EMBEDDING_DIM } from '../engine/vectorStore';
import type { SearchHit } from '../types';

interface SemanticSearchViewProps {
  vectorStore: CampusVectorStore;
  onInspectDocument: (docId: string) => void;
}

const DEMO_QUERIES = [
  {
    label: 'Conceptual Tuition Query',
    query: 'when do I need to pay college tuition cost',
    note: 'Demonstrates semantic retrieval matching "fee / dues / challan" even when "cost" is absent.',
  },
  {
    label: 'Festival Break / Recess',
    query: 'when is campus closed for winter break vacation',
    note: 'Matches holiday schedule & reopening dates via semantic concept clusters.',
  },
  {
    label: 'Coding Competition Prizes',
    query: 'student hackathon contest cash award registration',
    note: 'Connects "contest / award" semantically to "TechFest / prizes".',
  },
  {
    label: 'Exam Admit Card Rules',
    query: 'rules for university test hall ticket and roll number',
    note: 'Maps "test" to "examination" and "admit card" rules.',
  },
];

export const SemanticSearchView: React.FC<SemanticSearchViewProps> = ({
  vectorStore,
  onInspectDocument,
}) => {
  const [query, setQuery] = useState(DEMO_QUERIES[0].query);
  const [submittedQuery, setSubmittedQuery] = useState(DEMO_QUERIES[0].query);
  const [viewMode, setViewMode] = useState<'compare' | 'semantic' | 'keyword'>('compare');
  const [validationError, setValidationError] = useState('');

  const semanticHits = useMemo(
    () => vectorStore.searchSemantic(submittedQuery, 5, 0.1),
    [vectorStore, submittedQuery]
  );

  const keywordHits = useMemo(
    () => vectorStore.searchKeywordBM25(submittedQuery, 5),
    [vectorStore, submittedQuery]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) {
      setValidationError('Enter a natural language query to search across indexed documents.');
      return;
    }
    setValidationError('');
    setSubmittedQuery(query.trim());
  };

  // Build comparison chart combining top docs across both engines
  const comparisonChartData = useMemo(() => {
    const docMap = new Map<string, { title: string; semantic: number; keyword: number }>();
    for (const hit of semanticHits) {
      const existing = docMap.get(hit.documentId);
      const semPct = Math.round(hit.score * 100);
      if (!existing || semPct > existing.semantic) {
        docMap.set(hit.documentId, {
          title:
            hit.documentTitle.length > 26
              ? `${hit.documentTitle.slice(0, 24)}...`
              : hit.documentTitle,
          semantic: semPct,
          keyword: existing?.keyword ?? 0,
        });
      }
    }
    for (const hit of keywordHits) {
      const existing = docMap.get(hit.documentId);
      const kwPct = Math.round(hit.score * 100);
      if (existing) {
        existing.keyword = Math.max(existing.keyword, kwPct);
      } else {
        docMap.set(hit.documentId, {
          title:
            hit.documentTitle.length > 26
              ? `${hit.documentTitle.slice(0, 24)}...`
              : hit.documentTitle,
          semantic: 0,
          keyword: kwPct,
        });
      }
    }
    return Array.from(docMap.values()).slice(0, 5);
  }, [semanticHits, keywordHits]);

  const renderHitList = (hits: SearchHit[], engineType: 'semantic' | 'keyword') => {
    if (hits.length === 0) {
      return (
        <div className="py-10 text-center border-t border-slate-100">
          <p className="text-sm font-medium text-slate-700">No matching document chunks found</p>
          <p className="text-xs text-slate-500 mt-1">
            {engineType === 'keyword'
              ? 'Traditional keyword matching fails when the exact query words do not appear verbatim in the notice.'
              : 'Try broadening your search terms or uploading relevant campus notices.'}
          </p>
        </div>
      );
    }

    return (
      <div className="divide-y divide-slate-200 border-t border-slate-200">
        {hits.map((hit) => (
          <article key={`${engineType}-${hit.chunkId}`} className="py-4 space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs text-slate-500">
                  Rank #{hit.rank} · {hit.category}
                </p>
                <h3 className="text-sm font-semibold text-slate-900 mt-0.5">
                  {hit.documentTitle}
                </h3>
              </div>
              <span
                className={`font-mono text-xs font-semibold whitespace-nowrap tabular-nums ${
                  engineType === 'semantic' ? 'text-blue-700' : 'text-slate-700'
                }`}
              >
                {(hit.score * 100).toFixed(1)}% {engineType === 'semantic' ? 'cosine' : 'BM25'}
              </span>
            </div>

            <p className="text-xs text-slate-700 leading-relaxed">{hit.text}</p>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
              <p className="text-slate-500">
                {hit.matchedTerms.length > 0 ? (
                  <>
                    Matched terms:{' '}
                    <span className="font-mono text-slate-700">
                      {hit.matchedTerms.join(', ')}
                    </span>
                  </>
                ) : (
                  <span className="text-blue-700">
                    Retrieved via latent semantic similarity (zero exact keyword overlap)
                  </span>
                )}
              </p>
              <button
                type="button"
                onClick={() => onInspectDocument(hit.documentId)}
                className="inline-flex items-center gap-1 font-medium text-blue-700 hover:underline whitespace-nowrap"
              >
                <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                Inspect Source
              </button>
            </div>
          </article>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <p className="text-xs font-medium text-blue-700">
            Module 5 · {EMBEDDING_DIM}-Dim Dense Vector Database vs. BM25 Keyword Search
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-1">
            Semantic Search & Retrieval Benchmark
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Query {vectorStore.size()} indexed document chunks using natural language and compare
            cosine vector similarity against traditional exact keyword matching.
          </p>
        </div>

        <div className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-lg shrink-0">
          {(
            [
              ['compare', 'Side-by-Side'],
              ['semantic', 'Semantic Only'],
              ['keyword', 'Keyword BM25'],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setViewMode(key)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                viewMode === key
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Search Form */}
      <section className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search
              className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2"
              aria-hidden="true"
            />
            <label htmlFor="semantic-search-input" className="sr-only">
              Natural language search query
            </label>
            <input
              id="semantic-search-input"
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask in natural language, e.g. 'when do I pay semester tuition?'"
              className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>
          <button
            type="submit"
            className="px-5 py-2.5 text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            Search Documents
          </button>
        </form>
        {validationError && <p className="text-xs text-red-600">{validationError}</p>}

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
          <span className="text-slate-500 font-medium">Sample Queries:</span>
          {DEMO_QUERIES.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => {
                setQuery(item.query);
                setSubmittedQuery(item.query);
                setValidationError('');
              }}
              className="text-blue-700 hover:underline whitespace-nowrap"
            >
              {item.label}
            </button>
          ))}
        </div>
      </section>

      {/* Score Comparison Chart */}
      {comparisonChartData.length > 0 && viewMode === 'compare' && (
        <section className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Retrieval Score Comparison for &ldquo;{submittedQuery}&rdquo;
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Semantic cosine similarity (%) vs. traditional BM25 exact keyword match (%)
            </p>
          </div>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={comparisonChartData}
                margin={{ top: 8, right: 12, left: -16, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis
                  dataKey="title"
                  tick={{ fill: '#475569', fontSize: 11 }}
                  axisLine={{ stroke: '#cbd5e1' }}
                  tickLine={false}
                />
                <YAxis
                  domain={[0, 100]}
                  unit="%"
                  tick={{ fill: '#64748b', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip formatter={(val: unknown) => [`${val}%`]} />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar
                  dataKey="semantic"
                  name="Semantic Vector Search"
                  fill="#1d4ed8"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={32}
                />
                <Bar
                  dataKey="keyword"
                  name="BM25 Keyword Search"
                  fill="#94a3b8"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={32}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {/* Results Columns */}
      <div
        className={`grid grid-cols-1 gap-6 ${
          viewMode === 'compare' ? 'lg:grid-cols-2' : 'lg:grid-cols-1'
        }`}
      >
        {(viewMode === 'compare' || viewMode === 'semantic') && (
          <section className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
            <div className="flex items-baseline justify-between gap-2">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  Semantic Embedding Search (Vector Index)
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Inner-product cosine ranking over L2-normalized dense embeddings
                </p>
              </div>
              <span className="font-mono text-xs text-blue-700 tabular-nums">
                {semanticHits.length} hits
              </span>
            </div>
            {renderHitList(semanticHits, 'semantic')}
          </section>
        )}

        {(viewMode === 'compare' || viewMode === 'keyword') && (
          <section className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
            <div className="flex items-baseline justify-between gap-2">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  Traditional Keyword Search (BM25)
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Exact token frequency and inverse document frequency baseline
                </p>
              </div>
              <span className="font-mono text-xs text-slate-600 tabular-nums">
                {keywordHits.length} hits
              </span>
            </div>
            {renderHitList(keywordHits, 'keyword')}
          </section>
        )}
      </div>
    </div>
  );
};
