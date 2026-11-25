import React, { useMemo, useState } from 'react';
import {
  BarChart3,
  BookOpen,
  FileText,
  GraduationCap,
  LayoutDashboard,
  Menu,
  MessageSquare,
  Search,
  Sparkles,
  Tags,
  Upload,
  X,
} from 'lucide-react';
import type { CampusDocument, FileSourceType, NavSection, StudentFeedback } from './types';
import { createInitialDocuments, createInitialFeedback } from './data/seedData';
import { processCampusDocument } from './engine/documentProcessor';
import { analyzeSentiment } from './engine/sentiment';
import { CampusVectorStore } from './engine/vectorStore';
import { OverviewDashboard } from './components/OverviewDashboard';
import { DocumentManagerView } from './components/DocumentManagerView';
import { NlpInspectorView } from './components/NlpInspectorView';
import { ClassificationView } from './components/ClassificationView';
import { SemanticSearchView } from './components/SemanticSearchView';
import { StudentAssistantView } from './components/StudentAssistantView';
import { SentimentDashboardView } from './components/SentimentDashboardView';
import { AcademicReportView } from './components/AcademicReportView';

interface NavItem {
  id: NavSection;
  label: string;
  breadcrumb: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'overview', label: 'Overview', breadcrumb: 'Overview', icon: LayoutDashboard },
  { id: 'documents', label: 'Documents & OCR', breadcrumb: 'Documents & OCR', icon: FileText },
  { id: 'nlp', label: 'NLP & Entities', breadcrumb: 'NLP & Entities', icon: Sparkles },
  { id: 'classification', label: 'Classification', breadcrumb: 'Classification', icon: Tags },
  { id: 'search', label: 'Semantic Search', breadcrumb: 'Semantic Search', icon: Search },
  { id: 'assistant', label: 'Student Assistant', breadcrumb: 'Student Assistant', icon: MessageSquare },
  { id: 'sentiment', label: 'Sentiment Analysis', breadcrumb: 'Sentiment Analysis', icon: BarChart3 },
  { id: 'report', label: 'Academic Report', breadcrumb: 'Academic Report', icon: BookOpen },
];

export default function App() {
  const [activeSection, setActiveSection] = useState<NavSection>('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeClassifierModel, setActiveClassifierModel] = useState<'baseline' | 'transformer'>(
    'transformer'
  );
  const [documents, setDocuments] = useState<CampusDocument[]>(() => createInitialDocuments());
  const [feedback, setFeedback] = useState<StudentFeedback[]>(() => createInitialFeedback());
  const [selectedDocId, setSelectedDocId] = useState<string>(() => 'doc-exam-01');

  // Recompute documents' activeCategory cleanly when switching classification model
  const normalizedDocuments = useMemo(
    () =>
      documents.map((doc) => ({
        ...doc,
        classification: {
          ...doc.classification,
          activeCategory:
            activeClassifierModel === 'baseline'
              ? doc.classification.baseline.predictedCategory
              : doc.classification.transformer.predictedCategory,
        },
      })),
    [documents, activeClassifierModel]
  );

  // Live reactive Vector Store synced to the current document corpus
  const vectorStore = useMemo(() => {
    const store = new CampusVectorStore();
    store.buildFromDocuments(normalizedDocuments);
    return store;
  }, [normalizedDocuments]);

  const handleAddDocument = (payload: {
    title: string;
    fileName: string;
    fileType: FileSourceType;
    fileSizeBytes: number;
    rawText: string;
    ocrApplied: boolean;
  }) => {
    const processed = processCampusDocument({
      ...payload,
      preferredClassifier: activeClassifierModel,
    });
    setDocuments((prev) => [processed, ...prev]);
    setSelectedDocId(processed.id);
  };

  const handleDeleteDocument = (docId: string) => {
    setDocuments((prev) => {
      const next = prev.filter((d) => d.id !== docId);
      if (selectedDocId === docId && next.length > 0) {
        setSelectedDocId(next[0].id);
      }
      return next;
    });
  };

  const handleInspectDocument = (docId: string) => {
    setSelectedDocId(docId);
    setActiveSection('nlp');
    setMobileMenuOpen(false);
  };

  const handleAddFeedback = (entry: {
    studentName: string;
    department: string;
    semester: string;
    text: string;
  }) => {
    const newFeedback: StudentFeedback = {
      id: `fb-${Date.now()}`,
      studentName: entry.studentName,
      department: entry.department,
      semester: entry.semester,
      submittedAt: new Date().toISOString().slice(0, 10),
      text: entry.text,
      analysis: analyzeSentiment(entry.text),
    };
    setFeedback((prev) => [newFeedback, ...prev]);
  };

  const handleDeleteFeedback = (id: string) => {
    setFeedback((prev) => prev.filter((item) => item.id !== id));
  };

  const currentNav = NAV_ITEMS.find((n) => n.id === activeSection) ?? NAV_ITEMS[0];

  const handleNavigate = (section: NavSection) => {
    setActiveSection(section);
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 bg-white border-r border-slate-200 z-30">
        <div className="h-16 px-6 flex items-center gap-2.5 border-b border-slate-200">
          <GraduationCap className="w-5 h-5 text-blue-700 shrink-0" aria-hidden="true" />
          <span className="font-display text-base font-bold tracking-tight text-slate-900 whitespace-nowrap">
            Smart Campus AI
          </span>
        </div>

        <nav className="flex-1 px-3 py-5 space-y-1 overflow-y-auto" aria-label="Main navigation">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavigate(item.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors text-left whitespace-nowrap ${
                  isActive
                    ? 'bg-blue-50 text-blue-800'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 ${isActive ? 'text-blue-700' : 'text-slate-400'}`}
                  aria-hidden="true"
                />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="px-6 py-4 border-t border-slate-200 text-xs text-slate-500">
          <p className="font-medium text-slate-700">BCA AI/ML Capstone</p>
          <p className="mt-0.5 font-mono tabular-nums">
            {normalizedDocuments.length} docs · {vectorStore.size()} vectors
          </p>
        </div>
      </aside>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/40"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />
          <aside className="relative w-64 max-w-[80vw] bg-white h-full flex flex-col border-r border-slate-200 z-10">
            <div className="h-14 px-5 flex items-center justify-between border-b border-slate-200">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-blue-700" aria-hidden="true" />
                <span className="font-display text-base font-bold text-slate-900">
                  Smart Campus AI
                </span>
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Close navigation menu"
                className="p-2 text-slate-500 hover:text-slate-900"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>
            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto" aria-label="Mobile navigation">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = activeSection === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleNavigate(item.id)}
                    aria-current={isActive ? 'page' : undefined}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors text-left ${
                      isActive
                        ? 'bg-blue-50 text-blue-800'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <Icon
                      className={`w-4 h-4 shrink-0 ${isActive ? 'text-blue-700' : 'text-slate-400'}`}
                      aria-hidden="true"
                    />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </aside>
        </div>
      )}

      {/* Main Content Wrapper */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        {/* Top Bar Contract: Contextual Breadcrumb on left, 1 primary action on right */}
        <header className="sticky top-0 z-20 h-14 lg:h-16 bg-white/95 backdrop-blur-xs border-b border-slate-200 px-4 sm:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open navigation menu"
              className="lg:hidden p-2 -ml-2 text-slate-600 hover:text-slate-900 rounded-lg"
            >
              <Menu className="w-5 h-5" aria-hidden="true" />
            </button>
            <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm min-w-0">
              <button
                type="button"
                onClick={() => handleNavigate('overview')}
                className="hidden sm:inline text-slate-500 hover:text-slate-900 transition-colors whitespace-nowrap shrink-0"
              >
                Smart Campus AI
              </button>
              <span className="hidden sm:inline text-slate-300" aria-hidden="true">/</span>
              <span className="font-semibold sm:font-medium text-slate-900 truncate">
                {currentNav.breadcrumb}
              </span>
            </nav>
          </div>

          <button
            type="button"
            onClick={() => handleNavigate('documents')}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            <Upload className="w-3.5 h-3.5" aria-hidden="true" />
            <span className="sm:hidden">Upload</span>
            <span className="hidden sm:inline">Upload Document</span>
          </button>
        </header>

        {/* Main Viewport */}
        <main className="flex-1 px-4 sm:px-8 py-6 sm:py-8 max-w-7xl w-full mx-auto">
          {activeSection === 'overview' && (
            <OverviewDashboard
              documents={normalizedDocuments}
              feedback={feedback}
              vectorChunkCount={vectorStore.size()}
              onNavigate={handleNavigate}
              onInspectDocument={handleInspectDocument}
            />
          )}

          {activeSection === 'documents' && (
            <DocumentManagerView
              documents={normalizedDocuments}
              onAddDocument={handleAddDocument}
              onDeleteDocument={handleDeleteDocument}
              onInspectDocument={handleInspectDocument}
            />
          )}

          {activeSection === 'nlp' && (
            <NlpInspectorView
              documents={normalizedDocuments}
              selectedDocId={selectedDocId}
              onSelectDoc={setSelectedDocId}
            />
          )}

          {activeSection === 'classification' && (
            <ClassificationView
              documents={normalizedDocuments}
              activeModel={activeClassifierModel}
              onChangeActiveModel={setActiveClassifierModel}
            />
          )}

          {activeSection === 'search' && (
            <SemanticSearchView
              vectorStore={vectorStore}
              onInspectDocument={handleInspectDocument}
            />
          )}

          {activeSection === 'assistant' && (
            <StudentAssistantView
              vectorStore={vectorStore}
              documentCount={normalizedDocuments.length}
              onInspectDocument={handleInspectDocument}
            />
          )}

          {activeSection === 'sentiment' && (
            <SentimentDashboardView
              feedback={feedback}
              onAddFeedback={handleAddFeedback}
              onDeleteFeedback={handleDeleteFeedback}
            />
          )}

          {activeSection === 'report' && <AcademicReportView />}
        </main>
      </div>
    </div>
  );
}
