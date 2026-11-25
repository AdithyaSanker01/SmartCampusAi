import React from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ArrowRight, Calendar, FileText, MessageSquare, Search, Upload } from 'lucide-react';
import {
  DOCUMENT_CATEGORIES,
  type CampusDocument,
  type NavSection,
  type StudentFeedback,
} from '../types';

interface OverviewDashboardProps {
  documents: CampusDocument[];
  feedback: StudentFeedback[];
  vectorChunkCount: number;
  onNavigate: (section: NavSection) => void;
  onInspectDocument: (docId: string) => void;
}

const SHORT_CATEGORY_LABELS: Record<string, string> = {
  'Examination announcements': 'Exams',
  'Academic notices': 'Academic',
  'Fee-related announcements': 'Fees',
  'College events': 'Events',
  Holidays: 'Holidays',
  'General announcements': 'General',
};

export const OverviewDashboard: React.FC<OverviewDashboardProps> = ({
  documents,
  feedback,
  vectorChunkCount,
  onNavigate,
  onInspectDocument,
}) => {
  const allDeadlines = documents.flatMap((doc) =>
    doc.nlp.deadlines.map((d) => ({
      date: d.date,
      description: d.description,
      documentTitle: doc.title,
      documentId: doc.id,
      category: doc.classification.activeCategory,
    }))
  );

  const totalEntities = documents.reduce((acc, d) => acc + d.nlp.entities.length, 0);
  const positiveCount = feedback.filter((f) => f.analysis.label === 'Positive').length;
  const negativeCount = feedback.filter((f) => f.analysis.label === 'Negative').length;
  const positiveShare =
    feedback.length > 0 ? Math.round((positiveCount / feedback.length) * 100) : 0;

  const categoryData = DOCUMENT_CATEGORIES.map((cat) => ({
    name: SHORT_CATEGORY_LABELS[cat] ?? cat,
    fullName: cat,
    count: documents.filter((d) => d.classification.activeCategory === cat).length,
  }));

  return (
    <div className="space-y-8">
      {/* Intro & Primary Actions */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between border-b border-slate-200 pb-6">
        <div className="space-y-1.5 max-w-2xl">
          <p className="text-xs font-medium text-blue-700">
            Academic Intelligence Workspace · NLP, Machine Learning & Semantic Retrieval
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 text-balance">
            Campus Document Intelligence Overview
          </h1>
          <p className="text-sm text-slate-600 leading-relaxed">
            Real-time pipeline metrics across uploaded university notices, extracted entities,
            dense vector chunks, and student sentiment analytics.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => onNavigate('assistant')}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            <MessageSquare className="w-4 h-4" aria-hidden="true" />
            Ask Student Assistant
          </button>
          <button
            type="button"
            onClick={() => onNavigate('documents')}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            <Upload className="w-4 h-4" aria-hidden="true" />
            Upload Notice
          </button>
        </div>
      </div>

      {/* 4-Column Hairline-Divided KPI Strip (Single Elevation) */}
      <section aria-label="Key project statistics">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 bg-white border border-slate-200 rounded-lg divide-y sm:divide-y-0 sm:divide-x divide-slate-200">
          <div className="p-5">
            <p className="text-xs font-medium text-slate-500">Indexed Documents</p>
            <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900 font-mono tabular-nums">
              {documents.length}
            </p>
            <p className="mt-1.5 text-xs text-slate-500">
              {documents.filter((d) => d.ocrApplied).length} OCR-scanned · 6 ML categories
            </p>
          </div>

          <div className="p-5">
            <p className="text-xs font-medium text-slate-500">Vector Index Chunks</p>
            <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900 font-mono tabular-nums">
              {vectorChunkCount}
            </p>
            <p className="mt-1.5 text-xs text-slate-500">
              256-dim dense embeddings · Cosine IP
            </p>
          </div>

          <div className="p-5">
            <p className="text-xs font-medium text-slate-500">Extracted Entities & Deadlines</p>
            <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900 font-mono tabular-nums">
              {totalEntities}
            </p>
            <p className="mt-1.5 text-xs text-slate-500">
              {allDeadlines.length} critical deadlines detected via NER
            </p>
          </div>

          <div className="p-5">
            <p className="text-xs font-medium text-slate-500">Student Feedback Positive Rate</p>
            <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900 font-mono tabular-nums">
              {positiveShare}%
            </p>
            <p className="mt-1.5 text-xs text-slate-500">
              {feedback.length} reviews · {positiveCount} positive / {negativeCount} negative
            </p>
          </div>
        </div>
      </section>

      {/* Main Analytics Split: Category Chart + Extracted Deadlines */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left: Category Distribution */}
        <section className="lg:col-span-5 bg-white border border-slate-200 rounded-lg p-6 flex flex-col">
          <div className="flex items-start justify-between gap-4 mb-5">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Document Classification Distribution
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Auto-classified across 6 academic notice categories
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('classification')}
              className="text-xs font-medium text-blue-700 hover:text-blue-800 inline-flex items-center gap-1 whitespace-nowrap shrink-0"
            >
              View Metrics
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>

          <div className="h-64 w-full flex-1 min-h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData} margin={{ top: 8, right: 8, left: -22, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fill: '#475569', fontSize: 12 }}
                  axisLine={{ stroke: '#cbd5e1' }}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fill: '#64748b', fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  cursor={{ fill: '#f1f5f9' }}
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderColor: '#e2e8f0',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                  formatter={(value: unknown) => [`${value} documents`, 'Count']}
                  labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName ?? ''}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={40}>
                  {categoryData.map((entry, idx) => (
                    <Cell
                      key={entry.fullName}
                      fill={idx === 0 ? '#1d4ed8' : idx === 2 ? '#0f766e' : '#334155'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Right: Upcoming Extracted Deadlines */}
        <section className="lg:col-span-7 bg-white border border-slate-200 rounded-lg p-6 flex flex-col">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Extracted Key Deadlines
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Automatically mined from uploaded circulars using NER deadline cues
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('nlp')}
              className="text-xs font-medium text-blue-700 hover:text-blue-800 inline-flex items-center gap-1 whitespace-nowrap shrink-0"
            >
              Inspect Entities
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>

          {allDeadlines.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-10 text-center">
              <Calendar className="w-8 h-8 text-slate-300 mb-2" aria-hidden="true" />
              <p className="text-sm font-medium text-slate-700">No deadlines extracted yet</p>
              <p className="text-xs text-slate-500 mt-1">
                Upload a college notice containing submission dates to populate this schedule.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-xs font-medium text-slate-500">
                    <th className="py-2.5 pr-4 whitespace-nowrap">Date</th>
                    <th className="py-2.5 pr-4">Deadline Context</th>
                    <th className="py-2.5 text-right whitespace-nowrap">Source</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {allDeadlines.slice(0, 6).map((item, idx) => (
                    <tr key={`${item.documentId}-${idx}`} className="hover:bg-slate-50">
                      <td className="py-2.5 pr-4 font-mono text-xs font-medium text-amber-700 whitespace-nowrap tabular-nums">
                        {item.date}
                      </td>
                      <td className="py-2.5 pr-4 text-slate-700 text-xs leading-relaxed">
                        {item.description}
                      </td>
                      <td className="py-2.5 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => onInspectDocument(item.documentId)}
                          className="text-xs font-medium text-blue-700 hover:underline"
                        >
                          Inspect
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {/* Bottom Row: Indexed Documents Table */}
      <section className="bg-white border border-slate-200 rounded-lg p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Recent Processed Campus Documents
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Click any document to inspect tokenization, POS tags, NER extraction, and embeddings
            </p>
          </div>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => onNavigate('search')}
              className="text-xs font-medium text-slate-700 hover:text-blue-700 inline-flex items-center gap-1.5 whitespace-nowrap"
            >
              <Search className="w-3.5 h-3.5" aria-hidden="true" />
              Semantic Search
            </button>
            <button
              type="button"
              onClick={() => onNavigate('documents')}
              className="text-xs font-medium text-blue-700 hover:text-blue-800 inline-flex items-center gap-1 whitespace-nowrap"
            >
              Manage All ({documents.length})
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-medium text-slate-500">
                <th className="py-2.5 pr-4">Document Title</th>
                <th className="py-2.5 pr-4">Predicted Category</th>
                <th className="py-2.5 pr-4">Format</th>
                <th className="py-2.5 pr-4 text-right">Entities</th>
                <th className="py-2.5 pr-4 text-right">Confidence</th>
                <th className="py-2.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {documents.slice(0, 6).map((doc) => (
                <tr key={doc.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <FileText className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />
                      <div className="min-w-0">
                        <p className="font-medium text-slate-900 truncate max-w-md">{doc.title}</p>
                        <p className="text-xs text-slate-500 truncate max-w-md">
                          {doc.fileName} · {doc.uploadedAt}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 pr-4 text-xs font-medium text-slate-700 whitespace-nowrap">
                    {doc.classification.activeCategory}
                  </td>
                  <td className="py-3 pr-4 font-mono text-xs text-slate-600 whitespace-nowrap">
                    {doc.fileType}
                    {doc.ocrApplied ? ' / OCR' : ''}
                  </td>
                  <td className="py-3 pr-4 text-right font-mono text-xs text-slate-700 tabular-nums">
                    {doc.nlp.entities.length}
                  </td>
                  <td className="py-3 pr-4 text-right font-mono text-xs text-emerald-700 font-medium tabular-nums">
                    {(doc.classification.transformer.confidence * 100).toFixed(1)}%
                  </td>
                  <td className="py-3 text-right whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => onInspectDocument(doc.id)}
                      className="text-xs font-medium text-blue-700 hover:underline"
                    >
                      Open NLP View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
