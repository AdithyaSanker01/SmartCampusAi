import React, { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Trash2 } from 'lucide-react';
import type { SentimentLabel, StudentFeedback } from '../types';
import { analyzeSentiment } from '../engine/sentiment';

interface SentimentDashboardViewProps {
  feedback: StudentFeedback[];
  onAddFeedback: (entry: {
    studentName: string;
    department: string;
    semester: string;
    text: string;
  }) => void;
  onDeleteFeedback: (id: string) => void;
}

const DEPARTMENTS = [
  'BCA (AI & ML)',
  'MCA',
  'B.Tech CSE',
  'B.Sc Computer Science',
  'BBA',
];

const SEMESTERS = ['Semester I', 'Semester III', 'Semester V', 'Semester VII'];

const SENTIMENT_COLORS: Record<SentimentLabel, string> = {
  Positive: '#16a34a',
  Neutral: '#d97706',
  Negative: '#dc2626',
};

const SENTIMENT_TEXT_CLASSES: Record<SentimentLabel, string> = {
  Positive: 'text-emerald-700',
  Neutral: 'text-amber-700',
  Negative: 'text-red-700',
};

export const SentimentDashboardView: React.FC<SentimentDashboardViewProps> = ({
  feedback,
  onAddFeedback,
  onDeleteFeedback,
}) => {
  const [studentName, setStudentName] = useState('');
  const [department, setDepartment] = useState(DEPARTMENTS[0]);
  const [semester, setSemester] = useState(SEMESTERS[2]);
  const [feedbackText, setFeedbackText] = useState('');
  const [formError, setFormError] = useState('');
  const [filterLabel, setFilterLabel] = useState<'ALL' | SentimentLabel>('ALL');

  const livePreview = useMemo(
    () => (feedbackText.trim().length >= 5 ? analyzeSentiment(feedbackText) : null),
    [feedbackText]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentName.trim()) {
      setFormError('Please enter your name before submitting feedback.');
      return;
    }
    if (feedbackText.trim().length < 12) {
      setFormError('Please enter at least 12 characters of campus feedback.');
      return;
    }
    setFormError('');
    onAddFeedback({
      studentName: studentName.trim(),
      department,
      semester,
      text: feedbackText.trim(),
    });
    setStudentName('');
    setFeedbackText('');
  };

  const counts = useMemo(() => {
    const pos = feedback.filter((f) => f.analysis.label === 'Positive').length;
    const neu = feedback.filter((f) => f.analysis.label === 'Neutral').length;
    const neg = feedback.filter((f) => f.analysis.label === 'Negative').length;
    return { pos, neu, neg };
  }, [feedback]);

  const pieData = [
    { name: 'Positive', value: counts.pos, color: SENTIMENT_COLORS.Positive },
    { name: 'Neutral', value: counts.neu, color: SENTIMENT_COLORS.Neutral },
    { name: 'Negative', value: counts.neg, color: SENTIMENT_COLORS.Negative },
  ];

  const aspectData = useMemo(() => {
    const map = new Map<string, { aspect: string; sum: number; count: number }>();
    for (const f of feedback) {
      const existing = map.get(f.analysis.aspect) ?? {
        aspect: f.analysis.aspect,
        sum: 0,
        count: 0,
      };
      existing.sum += f.analysis.polarity;
      existing.count += 1;
      map.set(f.analysis.aspect, existing);
    }
    return Array.from(map.values()).map((item) => ({
      aspect: item.aspect.split(' ')[0],
      fullAspect: item.aspect,
      avgPolarity: Number((item.sum / item.count).toFixed(2)),
      count: item.count,
    }));
  }, [feedback]);

  const filteredFeedback =
    filterLabel === 'ALL'
      ? feedback
      : feedback.filter((f) => f.analysis.label === filterLabel);

  return (
    <div className="space-y-8">
      <div className="border-b border-slate-200 pb-5">
        <p className="text-xs font-medium text-blue-700">
          Module 4 · Bi-GRU Sequence Gated Sentiment Model vs. Bag-of-Words Baseline
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-1">
          Student Feedback Sentiment Analysis
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Submit campus feedback and inspect sequence-aware negation handling, contrastive reset
          gates (&ldquo;but&rdquo;, &ldquo;however&rdquo;), aspect classification, and polarity trends.
        </p>
      </div>

      {/* Submission Form + Live Model Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <section className="lg:col-span-6 bg-white border border-slate-200 rounded-lg p-6">
          <h2 className="text-base font-semibold text-slate-900">Submit Student Feedback</h2>
          <p className="text-xs text-slate-500 mt-0.5 mb-4">
            Every entry is analyzed immediately by both the Bi-GRU sequence model and Bag-of-Words baseline
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label htmlFor="fb-student-name" className="block text-xs font-medium text-slate-700 mb-1">
                  Student Name
                </label>
                <input
                  id="fb-student-name"
                  type="text"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  placeholder="e.g., Aditi Rao"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
              <div>
                <label htmlFor="fb-department" className="block text-xs font-medium text-slate-700 mb-1">
                  Department
                </label>
                <select
                  id="fb-department"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full px-2.5 py-2 text-sm border border-slate-200 rounded-lg bg-white"
                >
                  {DEPARTMENTS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="fb-semester" className="block text-xs font-medium text-slate-700 mb-1">
                  Semester
                </label>
                <select
                  id="fb-semester"
                  value={semester}
                  onChange={(e) => setSemester(e.target.value)}
                  className="w-full px-2.5 py-2 text-sm border border-slate-200 rounded-lg bg-white"
                >
                  {SEMESTERS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="fb-text" className="block text-xs font-medium text-slate-700 mb-1">
                Feedback Comment
              </label>
              <textarea
                id="fb-text"
                rows={4}
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                placeholder="Try contrastive phrasing like: 'The library Wi-Fi is fast, however the AI lab computers are outdated and slow.'"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            {formError && <p className="text-xs text-red-600">{formError}</p>}

            <div className="flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={() =>
                  setFeedbackText(
                    'The AI faculty is helpful and engaging, however the lab computers are painfully slow and the fee portal crashes.'
                  )
                }
                className="text-xs font-medium text-blue-700 hover:underline"
              >
                Load contrastive sample
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors whitespace-nowrap"
              >
                Analyze & Submit Feedback
              </button>
            </div>
          </form>
        </section>

        {/* Live Prediction Explanation */}
        <section className="lg:col-span-6 bg-white border border-slate-200 rounded-lg p-6 flex flex-col justify-between">
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Real-Time Sentiment Sequence Inspector
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Start typing feedback on the left to watch GRU gates evaluate token polarity
              </p>
            </div>

            {livePreview ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                  <div>
                    <p className="text-xs text-slate-500">Bi-GRU Sequence Model</p>
                    <p
                      className={`text-lg font-bold mt-0.5 ${SENTIMENT_TEXT_CLASSES[livePreview.label]}`}
                    >
                      {livePreview.label}
                    </p>
                    <p className="text-xs font-mono text-slate-600 tabular-nums">
                      Polarity: {livePreview.polarity >= 0 ? '+' : ''}
                      {livePreview.polarity.toFixed(2)} · {(livePreview.confidence * 100).toFixed(0)}% conf
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Bag-of-Words Baseline</p>
                    <p
                      className={`text-lg font-bold mt-0.5 ${SENTIMENT_TEXT_CLASSES[livePreview.baselineLabel]}`}
                    >
                      {livePreview.baselineLabel}
                    </p>
                    <p className="text-xs font-mono text-slate-600 tabular-nums">
                      Polarity: {livePreview.baselinePolarity >= 0 ? '+' : ''}
                      {livePreview.baselinePolarity.toFixed(2)} · Aspect: {livePreview.aspect}
                    </p>
                  </div>
                </div>

                <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 border border-slate-200 rounded-lg p-3">
                  {livePreview.explanation}
                </p>

                <div>
                  <p className="text-xs font-medium text-slate-600 mb-2">
                    Token-Level Gate Attribution
                  </p>
                  <div className="flex flex-wrap gap-x-2 gap-y-1 text-xs font-mono leading-relaxed">
                    {livePreview.tokenContributions.map((tc, i) => {
                      const cls =
                        tc.role === 'positive'
                          ? 'text-emerald-700 font-semibold underline decoration-emerald-300'
                          : tc.role === 'negative'
                            ? 'text-red-700 font-semibold underline decoration-red-300'
                            : tc.role === 'contrast'
                              ? 'text-blue-700 font-semibold'
                              : tc.role === 'negator'
                                ? 'text-amber-700 font-semibold'
                                : 'text-slate-600';
                      return (
                        <span key={`${tc.token}-${i}`} className={cls}>
                          {tc.token}
                          {tc.weight !== 0 ? `(${tc.weight > 0 ? '+' : ''}${tc.weight.toFixed(1)})` : ''}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-10 text-center border-t border-slate-100">
                <p className="text-sm font-medium text-slate-700">Awaiting feedback text</p>
                <p className="text-xs text-slate-500 mt-1">
                  Enter at least 5 characters in the feedback box or click &ldquo;Load contrastive
                  sample&rdquo; to inspect sequence gates.
                </p>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Charts: Distribution & Aspect Polarity */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <section className="lg:col-span-5 bg-white border border-slate-200 rounded-lg p-6 space-y-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Sentiment Distribution ({feedback.length} Reviews)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Positive: {counts.pos} · Neutral: {counts.neu} · Negative: {counts.neg}
            </p>
          </div>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={52}
                  outerRadius={82}
                  paddingAngle={2}
                >
                  {pieData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(val: unknown) => [`${val} reviews`]} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-center gap-6 text-xs text-slate-600">
            <span className="font-medium text-emerald-700">Positive ({counts.pos})</span>
            <span className="font-medium text-amber-700">Neutral ({counts.neu})</span>
            <span className="font-medium text-red-700">Negative ({counts.neg})</span>
          </div>
        </section>

        <section className="lg:col-span-7 bg-white border border-slate-200 rounded-lg p-6 space-y-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Average Polarity Score by Campus Aspect
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Scale from -1.0 (Strongly Negative) to +1.0 (Strongly Positive)
            </p>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={aspectData} margin={{ top: 8, right: 12, left: -16, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis
                  dataKey="aspect"
                  tick={{ fill: '#475569', fontSize: 12 }}
                  axisLine={{ stroke: '#cbd5e1' }}
                  tickLine={false}
                />
                <YAxis
                  domain={[-1, 1]}
                  tick={{ fill: '#64748b', fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  formatter={(val: unknown) => [`${val}`, 'Avg Polarity']}
                  labelFormatter={(_, payload) => payload?.[0]?.payload?.fullAspect ?? ''}
                />
                <Bar dataKey="avgPolarity" radius={[4, 4, 0, 0]} maxBarSize={36}>
                  {aspectData.map((entry) => (
                    <Cell
                      key={entry.fullAspect}
                      fill={
                        entry.avgPolarity >= 0.14
                          ? '#16a34a'
                          : entry.avgPolarity <= -0.14
                            ? '#dc2626'
                            : '#d97706'
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      {/* Feedback Log */}
      <section className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Analyzed Student Feedback Log ({filteredFeedback.length})
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Displays Bi-GRU sequence label, polarity score, detected aspect, and baseline comparison
            </p>
          </div>
          <div className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-lg w-fit">
            {(['ALL', 'Positive', 'Neutral', 'Negative'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setFilterLabel(tab)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  filterLabel === tab
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab === 'ALL' ? 'All' : tab}
              </button>
            ))}
          </div>
        </div>

        <div className="divide-y divide-slate-200 border-t border-slate-200">
          {filteredFeedback.map((item) => (
            <article key={item.id} className="py-4 space-y-1.5">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="text-slate-600">
                  <span className="font-semibold text-slate-900">{item.studentName}</span>
                  <span aria-hidden="true"> · </span>
                  <span>{item.department}</span>
                  <span aria-hidden="true"> · </span>
                  <span>{item.semester}</span>
                  <span aria-hidden="true"> · </span>
                  <span className="font-mono">{item.submittedAt}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`font-semibold ${SENTIMENT_TEXT_CLASSES[item.analysis.label]}`}
                  >
                    {item.analysis.label}
                  </span>
                  <span className="font-mono text-slate-600 tabular-nums">
                    {item.analysis.polarity >= 0 ? '+' : ''}
                    {item.analysis.polarity.toFixed(2)}
                  </span>
                  <button
                    type="button"
                    onClick={() => onDeleteFeedback(item.id)}
                    aria-label={`Delete feedback from ${item.studentName}`}
                    className="text-slate-400 hover:text-red-600 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                </div>
              </div>
              <p className="text-sm text-slate-800 leading-relaxed">{item.text}</p>
              <p className="text-xs text-slate-500">
                Aspect: <span className="text-slate-700 font-medium">{item.analysis.aspect}</span>
                <span aria-hidden="true"> · </span>
                Baseline BoW:{' '}
                <span className="text-slate-700">{item.analysis.baselineLabel}</span>
                <span aria-hidden="true"> · </span>
                {item.analysis.explanation}
              </p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
};
