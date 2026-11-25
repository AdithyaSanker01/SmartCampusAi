import React, { useEffect, useRef, useState } from 'react';
import { Eye, RotateCcw, Send } from 'lucide-react';
import type { ChatMessage } from '../types';
import { CampusVectorStore } from '../engine/vectorStore';
import { answerStudentQuestion } from '../engine/ragAssistant';

interface StudentAssistantViewProps {
  vectorStore: CampusVectorStore;
  documentCount: number;
  onInspectDocument: (docId: string) => void;
}

const SUGGESTED_QUESTIONS = [
  'When is the last date to submit the BCA semester exam form?',
  'How much is the semester tuition fee and what is the late penalty?',
  'What is the minimum mandatory attendance requirement?',
  'Where and when is the InnovateAI 2026 hackathon being held?',
  'When do regular classes resume after the winter vacation break?',
  'What is the recipe for chocolate cake on Mars?',
];

export const StudentAssistantView: React.FC<StudentAssistantViewProps> = ({
  vectorStore,
  documentCount,
  onInspectDocument,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-msg',
      role: 'assistant',
      content: `Hello! I am your grounded Smart Campus AI Student Assistant. I answer questions strictly from your ${documentCount} uploaded campus documents using semantic retrieval and always show supporting source excerpts. If an answer is not in the uploaded circulars, I will tell you clearly instead of guessing.`,
      timestamp: 'Ready',
      grounded: true,
    },
  ]);
  const [input, setInput] = useState('');
  const [inputError, setInputError] = useState('');
  const chatScrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages.length]);

  const handleAsk = (questionText: string) => {
    const trimmed = questionText.trim();
    if (!trimmed) {
      setInputError('Please enter a question to ask the assistant.');
      return;
    }
    setInputError('');

    const nowLabel = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: trimmed,
      timestamp: nowLabel,
    };

    const ragResult = answerStudentQuestion(trimmed, vectorStore);
    const botMsg: ChatMessage = {
      id: `bot-${Date.now() + 1}`,
      role: 'assistant',
      content: ragResult.answer,
      timestamp: nowLabel,
      grounded: ragResult.grounded,
      citations: ragResult.citations,
      intentDetected: ragResult.intentDetected,
    };

    setMessages((prev) => [...prev, userMsg, botMsg]);
    setInput('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleAsk(input);
  };

  const handleReset = () => {
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        role: 'assistant',
        content: `Conversation cleared. Ask any question about the ${documentCount} indexed campus documents.`,
        timestamp: 'Ready',
        grounded: true,
      },
    ]);
    setInput('');
    setInputError('');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <p className="text-xs font-medium text-blue-700">
            Module 6 · Retrieval-Augmented Grounded Question Answering
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-1">
            AI Student Assistant
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Answers are retrieved via dense semantic search across {documentCount} indexed
            documents ({vectorStore.size()} chunks) with verifiable citations and strict
            out-of-scope refusal.
          </p>
        </div>
        <button
          type="button"
          onClick={handleReset}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap shrink-0"
        >
          <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
          Clear Conversation
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Main Chat Area */}
        <section className="lg:col-span-8 bg-white border border-slate-200 rounded-lg flex flex-col">
          <div
            ref={chatScrollRef}
            className="p-6 space-y-6 max-h-[540px] overflow-y-auto"
            aria-live="polite"
            aria-label="Assistant conversation history"
          >
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div className="flex items-center gap-2 text-xs text-slate-500 mb-1.5">
                  <span className="font-medium text-slate-700">
                    {msg.role === 'user' ? 'Student' : 'Smart Campus AI'}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono tabular-nums">{msg.timestamp}</span>
                  {msg.intentDetected && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>{msg.intentDetected}</span>
                    </>
                  )}
                </div>

                <div
                  className={`max-w-2xl rounded-lg px-4 py-3 text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-blue-700 text-white'
                      : msg.grounded === false
                        ? 'bg-amber-50 border border-amber-200 text-slate-800'
                        : 'bg-slate-50 border border-slate-200 text-slate-800'
                  }`}
                >
                  {msg.role === 'assistant' && msg.grounded === false && (
                    <p className="text-xs font-semibold text-amber-800 mb-1">
                      Not Found in Uploaded Documents
                    </p>
                  )}
                  <p>{msg.content}</p>
                </div>

                {/* Source Citations */}
                {msg.citations && msg.citations.length > 0 && (
                  <div className="mt-3 w-full max-w-2xl space-y-2">
                    <p className="text-xs font-semibold text-slate-600">
                      Supporting Source Evidence ({msg.citations.length})
                    </p>
                    <div className="divide-y divide-slate-200 border border-slate-200 rounded-lg bg-white">
                      {msg.citations.map((cit) => (
                        <div key={`${msg.id}-${cit.documentId}`} className="p-3.5 space-y-1.5">
                          <div className="flex items-center justify-between gap-2 text-xs">
                            <span className="font-semibold text-slate-900">
                              {cit.documentTitle}
                            </span>
                            <span className="font-mono text-blue-700 font-medium whitespace-nowrap tabular-nums">
                              {(cit.similarity * 100).toFixed(1)}% match
                            </span>
                          </div>
                          <p className="text-xs text-slate-500">{cit.category}</p>
                          <p className="text-xs text-slate-700 leading-relaxed">
                            &ldquo;{cit.excerpt}&rdquo;
                          </p>
                          <button
                            type="button"
                            onClick={() => onInspectDocument(cit.documentId)}
                            className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:underline pt-0.5"
                          >
                            <Eye className="w-3 h-3" aria-hidden="true" />
                            Inspect Full Document
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Input Form */}
          <form
            onSubmit={handleSubmit}
            className="p-4 border-t border-slate-200 bg-slate-50/70 rounded-b-lg space-y-2"
          >
            <div className="flex gap-2.5">
              <label htmlFor="assistant-question-input" className="sr-only">
                Ask a question about campus documents
              </label>
              <input
                id="assistant-question-input"
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about exam schedules, fees, deadlines, holidays, or events..."
                className="flex-1 px-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
              <button
                type="submit"
                className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                <Send className="w-4 h-4" aria-hidden="true" />
                Ask
              </button>
            </div>
            {inputError && <p className="text-xs text-red-600">{inputError}</p>}
          </form>
        </section>

        {/* Right Panel: Suggested Student Prompts & Grounding Rules */}
        <aside className="lg:col-span-4 space-y-6">
          <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-3">
            <h2 className="text-sm font-semibold text-slate-900">Sample Student Questions</h2>
            <p className="text-xs text-slate-500">
              Click any question to run real-time semantic retrieval and answer synthesis.
            </p>
            <div className="divide-y divide-slate-100">
              {SUGGESTED_QUESTIONS.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => handleAsk(q)}
                  className="w-full text-left py-2.5 text-xs text-slate-700 hover:text-blue-700 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-2.5">
            <h2 className="text-sm font-semibold text-slate-900">How Grounding Works</h2>
            <ol className="space-y-2 text-xs text-slate-600 list-decimal list-inside leading-relaxed">
              <li>Student query is converted into a 256-dim normalized semantic vector.</li>
              <li>Cosine similarity retrieves top matching chunks from the Vector Store.</li>
              <li>Intent detection boosts dates, fees, venues, or faculty names.</li>
              <li>
                Queries below the <span className="font-mono text-slate-800">0.24</span> similarity
                threshold are refused to prevent hallucination.
              </li>
            </ol>
          </div>
        </aside>
      </div>
    </div>
  );
};
