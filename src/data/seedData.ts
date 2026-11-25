import type { CampusDocument, StudentFeedback } from '../types';
import { processCampusDocument } from '../engine/documentProcessor';
import { analyzeSentiment } from '../engine/sentiment';

export interface RawSeedDoc {
  id: string;
  title: string;
  fileName: string;
  fileType: 'PDF' | 'TXT' | 'IMAGE';
  uploadedAt: string;
  ocrApplied: boolean;
  rawText: string;
}

const RAW_SEED_DOCS: RawSeedDoc[] = [
  {
    id: 'doc-exam-01',
    title: 'End-Semester Theory & Practical Examination Schedule — Dec 2026',
    fileName: 'BCA_Sem5_Exam_Timetable_Dec2026.pdf',
    fileType: 'PDF',
    uploadedAt: '2026-11-04',
    ocrApplied: false,
    rawText: `OFFICE OF THE CONTROLLER OF EXAMINATIONS
Examination Cell — Department of Computer Applications

All students enrolled in BCA (AI & ML) Semester V and MCA Semester III are hereby notified that the End-Semester Theory Examinations will commence on 8 December 2026 in Examination Hall A and Block B, Room 204.

Key Examination Schedule:
- BCA-501 Natural Language Processing: 8 December 2026 (9:30 AM to 12:30 PM)
- BCA-502 Machine Learning: 10 December 2026 (9:30 AM to 12:30 PM)
- BCA-503 Deep Learning & Computer Vision Lab Practical Viva: 14 December 2026 at AI & ML Lab 2

The last date to submit the online examination registration form without late fine is 25 November 2026. Hall tickets can be downloaded from the Student Portal starting 2 December 2026. Students must carry their university ID card and signed admit card. Electronic watches and mobile phones are strictly prohibited inside the examination hall.

For seating queries or supplementary backlog examination forms, contact Dr. Meera Nair at the Examination Cell before 28 November 2026.`,
  },
  {
    id: 'doc-fee-02',
    title: 'Semester Fee Payment Circular & Scholarship Concession Notice',
    fileName: 'Accounts_Fee_Circular_EvenSem_2026.pdf',
    fileType: 'PDF',
    uploadedAt: '2026-11-06',
    ocrApplied: false,
    rawText: `ACCOUNTS & FINANCE OFFICE
Fee-Related Circular No. AFO/2026/118

Students of BCA, B.Tech CSE, and MCA programs are informed that the Even Semester tuition and laboratory dues for Academic Session 2026-27 are open for payment on the Student Portal.

Fee Breakdown:
- Regular Semester Tuition Fee: ₹42,500
- AI & Computing Laboratory Fee: ₹4,200
- Examination Registration Fee: ₹1,800 (₹450 per backlog paper)

The deadline to remit full semester fees via UPI, NEFT, or Bank Challan without penalty is 30 November 2026. A late fee penalty of ₹500 per week will be levied from 1 December 2026 onwards.

Eligible students applying for the Merit-cum-Means Scholarship or 25% tuition fee waiver must submit income verification documents and the previous semester fee receipt to the Scholarship Cell by 24 November 2026. Approved installment plans allow paying 60% upfront and the remaining balance before 20 January 2027. Contact Prof. Rajesh Kulkarni at the Accounts & Finance Office for challan reconciliation.`,
  },
  {
    id: 'doc-acad-03',
    title: 'Mandatory 75% Attendance Policy & Elective Registration Notice',
    fileName: 'Academic_Affairs_Attendance_Electives.txt',
    fileType: 'TXT',
    uploadedAt: '2026-11-08',
    ocrApplied: false,
    rawText: `ACADEMIC AFFAIRS OFFICE
Department of Computer Applications

This academic notice reiterates that a minimum of 75% classroom and laboratory attendance is mandatory for eligibility to appear in end-semester examinations across all BCA and B.Sc Computer Science courses.

Monthly attendance shortfall rosters will be published on 22 November 2026. Students with medical emergencies between 65% and 74% attendance must submit a certified medical condonation request endorsed by the Head of Department, Dr. Ananya Deshmukh, on or before 29 November 2026.

Additionally, course registration for Semester VI Open Electives — including Cloud Computing (BCA-604), Database Management Systems (BCA-605), and Software Engineering — opens on 19 November 2026 and closes on 27 November 2026 via the Academic Portal.`,
  },
  {
    id: 'doc-event-04',
    title: 'InnovateAI 2026 — Annual Campus TechFest & 24-Hour Hackathon',
    fileName: 'InnovateAI_2026_Hackathon_Brochure.pdf',
    fileType: 'PDF',
    uploadedAt: '2026-11-10',
    ocrApplied: false,
    rawText: `STUDENT WELFARE OFFICE & AI CODING CLUB
College Event Announcement

The Department of Computer Applications proudly invites students across all disciplines to InnovateAI 2026, our Annual TechFest and 24-Hour Applied AI Hackathon, scheduled for 28 November 2026 and 29 November 2026 at the Main Auditorium and Innovation Center.

Featured Tracks:
1. Natural Language Processing for Smart Campuses
2. Computer Vision & Edge Healthcare Diagnostics
3. Sustainable FinTech Analytics

Total cash prizes worth ₹75,000, cloud credits, and verified certificates of achievement will be awarded to the top three teams. Teams of 2 to 4 students must complete free online registration before 23 November 2026. A hands-on pre-hackathon PyTorch & Hugging Face workshop will be led by Prof. Vikramaditya Rao in Seminar Hall A on 25 November 2026 at 2:00 PM.`,
  },
  {
    id: 'doc-hol-05',
    title: 'Winter Vacation Break & Official Public Holiday Schedule',
    fileName: 'Registrar_Winter_Holidays_2026.png',
    fileType: 'IMAGE',
    uploadedAt: '2026-11-11',
    ocrApplied: true,
    rawText: `REGISTRAR'S OFFICE — HOLIDAY CIRCULAR
Notice Ref: REG/HOL/2026-44

All students, faculty, and administrative staff are notified of the upcoming official campus holidays and winter recess schedule:

1. Christmas Public Holiday: The university campus, Central Library, and all academic blocks will remain closed on 25 December 2026.
2. Winter Vacation Recess: Academic classes for BCA, MCA, and B.Tech cohorts will remain suspended from 24 December 2026 to 3 January 2027.
3. New Year Day Holiday: Administrative offices will remain closed on 1 January 2027.

Regular classes for the new semester will resume on 4 January 2027 at 9:00 AM. Hostel residential wings will remain open for outstation students during the winter break with skeleton mess operations.`,
  },
  {
    id: 'doc-gen-06',
    title: 'Central Library Extended Study Hours & Campus Wi-Fi Upgrade',
    fileName: 'Central_Library_WiFi_Advisory.txt',
    fileType: 'TXT',
    uploadedAt: '2026-11-12',
    ocrApplied: false,
    rawText: `CENTRAL LIBRARY & IT INFRASTRUCTURE CELL
General Campus Announcement

To support students preparing for upcoming semester assessments, the Central Library reading hall will operate on extended hours from 8:00 AM to 11:00 PM daily between 20 November 2026 and 18 December 2026.

The IT Infrastructure Cell has completed the Campus Wi-Fi 6E upgrade across Block A, Block B, and the Central Library. Students must rotate their intranet login credentials on the Student Portal by 26 November 2026. Scheduled server maintenance will take place on Sunday, 22 November 2026 from 2:00 AM to 5:00 AM.

Please carry your biometric student ID badge for evening library entry and updated campus shuttle bus boarding from Main Gate to North Hostel.`,
  },
  {
    id: 'doc-acad-07',
    title: 'Final Year BCA Capstone Project Synopsis & Viva Guidelines',
    fileName: 'BCA_Capstone_Project_Guidelines.pdf',
    fileType: 'PDF',
    uploadedAt: '2026-11-14',
    ocrApplied: false,
    rawText: `DEPARTMENT OF COMPUTER APPLICATIONS
Academic Project Guidelines — BCA (AI & ML)

Final-year undergraduate students undertaking their Major Capstone Project must submit their 3-page project synopsis covering problem statement, methodology, dataset description, and system architecture by 26 November 2026.

Project Evaluation Rubric:
- Working Prototype & Modular Code Architecture: 40 marks
- NLP / Machine Learning Model Evaluation & Metrics: 25 marks
- Project Documentation & Literature Review: 20 marks
- Final Viva Voce Presentation: 15 marks

Hardbound reports and source repositories must be submitted to faculty guide Dr. Siddharth Menon in Room 312 by 11 December 2026 prior to the external viva.`,
  },
  {
    id: 'doc-event-08',
    title: 'Campus Placement Readiness Bootcamp & Resume Clinic',
    fileName: 'Training_Placement_Bootcamp_Notice.txt',
    fileType: 'TXT',
    uploadedAt: '2026-11-15',
    ocrApplied: false,
    rawText: `TRAINING & PLACEMENT CELL
Event & Career Readiness Notice

The Training & Placement Cell is organizing a two-day Technical Interview Bootcamp, GitHub Portfolio Review, and Mock HR Interview Clinic for pre-final and final-year BCA and B.Tech students on 1 December 2026 and 2 December 2026 in Seminar Hall B.

Industry mentors from leading AI and software firms will conduct live whiteboarding sessions on Data Structures and Algorithms, Python Programming, and Applied Machine Learning case studies. Students wishing to book one-on-one resume review slots must upload their updated resume to the placement portal before 27 November 2026. Contact Ms. Priya Venkatesh at the Training & Placement Cell for registration support.`,
  },
];

export function createInitialDocuments(): CampusDocument[] {
  return RAW_SEED_DOCS.map((raw) =>
    processCampusDocument({
      id: raw.id,
      title: raw.title,
      fileName: raw.fileName,
      fileType: raw.fileType,
      fileSizeBytes: new TextEncoder().encode(raw.rawText).length * (raw.fileType === 'PDF' ? 14 : raw.fileType === 'IMAGE' ? 120 : 1),
      rawText: raw.rawText,
      ocrApplied: raw.ocrApplied,
      uploadedAt: raw.uploadedAt,
    })
  );
}

interface RawFeedback {
  id: string;
  studentName: string;
  department: string;
  semester: string;
  submittedAt: string;
  text: string;
}

const RAW_SEED_FEEDBACK: RawFeedback[] = [
  {
    id: 'fb-1',
    studentName: 'Aarav Sharma',
    department: 'BCA (AI & ML)',
    semester: 'Semester V',
    submittedAt: '2026-11-16',
    text: 'The hands-on Natural Language Processing lab sessions and faculty mentorship have been excellent and very helpful for our capstone projects.',
  },
  {
    id: 'fb-2',
    studentName: 'Neha Krishnan',
    department: 'BCA (AI & ML)',
    semester: 'Semester III',
    submittedAt: '2026-11-15',
    text: 'The Wi-Fi network in Block B disconnects frequently and the lab computers are painfully slow during afternoon practical exams.',
  },
  {
    id: 'fb-3',
    studentName: 'Rohan Verma',
    department: 'B.Tech CSE',
    semester: 'Semester V',
    submittedAt: '2026-11-15',
    text: 'The new extended Central Library hours until 11 PM are super convenient and the quiet study desks are clean and well organized.',
  },
  {
    id: 'fb-4',
    studentName: 'Divya Patel',
    department: 'MCA',
    semester: 'Semester III',
    submittedAt: '2026-11-14',
    text: 'The faculty is great and supportive, however the online fee portal is buggy and crashes whenever students download receipts.',
  },
  {
    id: 'fb-5',
    studentName: 'Karthik Iyer',
    department: 'BCA (AI & ML)',
    semester: 'Semester V',
    submittedAt: '2026-11-14',
    text: 'The examination timetable for December was published on the notice board yesterday with room numbers for all sections.',
  },
  {
    id: 'fb-6',
    studentName: 'Sneha Nair',
    department: 'B.Sc Computer Science',
    semester: 'Semester III',
    submittedAt: '2026-11-13',
    text: 'InnovateAI hackathon registration was smooth and the pre-event PyTorch workshop was really engaging and informative.',
  },
  {
    id: 'fb-7',
    studentName: 'Arjun Menon',
    department: 'BCA (AI & ML)',
    semester: 'Semester I',
    submittedAt: '2026-11-13',
    text: 'Accounts office queues are chaotic and confusing, and scholarship verification delays are frustrating for outstation students.',
  },
  {
    id: 'fb-8',
    studentName: 'Meghna Das',
    department: 'MCA',
    semester: 'Semester I',
    submittedAt: '2026-11-12',
    text: 'The new cafeteria menu is not bad, though seating gets slightly crowded during the 1 PM lunch break.',
  },
  {
    id: 'fb-9',
    studentName: 'Siddharth Rao',
    department: 'B.Tech CSE',
    semester: 'Semester VII',
    submittedAt: '2026-11-11',
    text: 'Placement bootcamp mock interviews were outstanding and gave us clear, practical feedback on our GitHub portfolios.',
  },
  {
    id: 'fb-10',
    studentName: 'Ananya Bose',
    department: 'BCA (AI & ML)',
    semester: 'Semester III',
    submittedAt: '2026-11-10',
    text: 'The seminar hall projector was not working properly and the audio system had poor clarity during the guest lecture.',
  },
  {
    id: 'fb-11',
    studentName: 'Vikram Joshi',
    department: 'B.Sc Computer Science',
    semester: 'Semester V',
    submittedAt: '2026-11-09',
    text: 'Elective registration opens on November 19 on the academic portal for Semester VI batches.',
  },
  {
    id: 'fb-12',
    studentName: 'Priya Kulkarni',
    department: 'BCA (AI & ML)',
    semester: 'Semester V',
    submittedAt: '2026-11-08',
    text: 'Really appreciate how transparent and punctual the Examination Cell has been with internal assessment marks this term.',
  },
];

export function createInitialFeedback(): StudentFeedback[] {
  return RAW_SEED_FEEDBACK.map((fb) => ({
    ...fb,
    analysis: analyzeSentiment(fb.text),
  }));
}

export interface ScannedNoticeSample {
  id: string;
  label: string;
  title: string;
  fileName: string;
  lines: string[];
  extractedText: string;
}

export const SAMPLE_SCANNED_NOTICES: ScannedNoticeSample[] = [
  {
    id: 'scan-exam',
    label: 'Scanned Exam Hall Ticket Notice',
    title: 'Supplementary Exam Hall Ticket & Lab Re-Test Circular',
    fileName: 'scanned_exam_circular_2026.png',
    lines: [
      'EXAMINATION CELL - URGENT CIRCULAR',
      'Ref: EXM/2026/88   Date: 17 Nov 2026',
      '-----------------------------------------',
      'BCA-302 Data Structures & BCA-404 AI Lab',
      'Supplementary Re-Test: 19 December 2026',
      'Venue: Examination Hall B, Block C',
      'Reporting Time: 9:00 AM sharp',
      'Last Date to Apply: 30 November 2026',
      'Fee: Rs. 450 per subject via Portal',
      'Signed: Dr. Meera Nair, Controller',
    ],
    extractedText:
      'EXAMINATION CELL - URGENT CIRCULAR. Ref: EXM/2026/88, Date: 17 November 2026. Students appearing for BCA-302 Data Structures and BCA-404 AI Lab supplementary re-test are informed that the examination will be held on 19 December 2026 at Examination Hall B, Block C at 9:00 AM sharp. The last date to apply is 30 November 2026 with a supplementary examination fee of Rs. 450 per subject via the Student Portal. Issued by Dr. Meera Nair, Controller of Examinations.',
  },
  {
    id: 'scan-holiday',
    label: 'Scanned Republic Day & Fest Holiday Slip',
    title: 'Gazetted Holiday & Campus Cultural Rehearsal Notice',
    fileName: 'scanned_holiday_notice_2027.png',
    lines: [
      'REGISTRAR OFFICE - OFFICIAL NOTICE',
      'Notice No: REG/2027/04',
      '-----------------------------------------',
      'Republic Day Gazetted Holiday: 26 Jan 2027',
      'All BCA & MCA classes remain suspended.',
      'Flag Hoisting: Main Ground at 8:30 AM',
      'Central Library remains closed all day.',
      'Classes resume on 27 January 2027.',
      'Signed: Registrar Office, Smart Campus',
    ],
    extractedText:
      'REGISTRAR OFFICE - OFFICIAL NOTICE (Notice No: REG/2027/04). The university declares a gazetted national holiday on 26 January 2027 on account of Republic Day. All BCA and MCA classes and laboratories will remain suspended and the Central Library will remain closed all day. Flag hoisting ceremony will take place at the Main Ground at 8:30 AM. Regular academic classes resume on 27 January 2027.',
  },
];

export const PYTHON_PROJECT_STRUCTURE = `smart-campus-ai/
├── app.py                          # Streamlit multi-page dashboard entry point
├── requirements.txt                # Pinned open-source Python dependencies
├── config.py                       # Paths, model identifiers, and thresholds
├── data/
│   ├── sample_notices/             # Sample PDF, TXT, and scanned JPG/PNG circulars
│   ├── classification_dataset.csv  # Labeled campus circulars (6 categories)
│   └── student_feedback.csv        # Sample labeled student feedback entries
├── backend/
│   ├── document_loader.py          # PyPDF2 / pdfplumber + TXT file ingestion & validation
│   ├── cv_ocr.py                   # OpenCV grayscale, Gaussian blur, Otsu threshold + Tesseract OCR
│   └── text_cleaner.py             # Regex & Unicode normalization pipeline
├── nlp/
│   ├── preprocessor.py             # NLTK tokenization, stopwords, PorterStemmer, WordNetLemmatizer
│   └── ner_extractor.py            # spaCy en_core_web_sm + EntityRuler (courses, deadlines, fees)
├── ml_models/
│   ├── doc_classifier.py           # Scikit-learn TF-IDF + MultinomialNB & DistilBERT zero-shot/fine-tuned
│   ├── sentiment_model.py          # PyTorch Bi-GRU sequence model & DistilBERT sentiment pipeline
│   └── evaluator.py                # Accuracy, Macro Precision/Recall/F1, Confusion Matrix
├── retrieval/
│   ├── embeddings.py               # sentence-transformers (all-MiniLM-L6-v2, 384-dim)
│   ├── vector_store.py             # FAISS IndexFlatIP / ChromaDB persistent collection
│   └── qa_assistant.py             # Grounded RAG QA with similarity threshold & source citations
├── ui/
│   ├── dashboard.py                # Home KPI metrics & Plotly category/deadline visuals
│   ├── upload_view.py              # Upload, OpenCV preview & document manager
│   ├── nlp_view.py                 # Token/POS/NER inspector
│   ├── search_chat_view.py         # Semantic vs Keyword search & grounded Q&A chat
│   └── sentiment_view.py           # Feedback form & Plotly sentiment analytics
└── tests/
    └── test_pipeline.py            # Pytest unit tests for NLP, ML, OCR & retrieval`;

export const PYTHON_SETUP_COMMANDS = `# 1. Create and activate an isolated Python 3.10+ virtual environment
python -m venv venv
source venv/bin/activate          # On Windows: venv\\Scripts\\activate

# 2. Install free, locally runnable AI/ML dependencies (CPU-friendly)
pip install streamlit pypdf pdfplumber opencv-python pytesseract pillow
pip install nltk spacy scikit-learn torch transformers sentence-transformers
pip install faiss-cpu plotly pandas numpy pytest

# 3. Download required local NLP corpora & spaCy small model
python -m spacy download en_core_web_sm
python -c "import nltk; nltk.download(['punkt', 'stopwords', 'wordnet', 'averaged_perceptron_tagger'])"

# 4. Run automated verification tests
pytest tests/test_pipeline.py -v

# 5. Launch the Smart Campus AI Streamlit web dashboard
streamlit run app.py --server.port 8501`;

export const PYTHON_MODULES_BLUEPRINT = [
  {
    stage: 'Stage 1: OpenCV + Tesseract OCR (backend/cv_ocr.py)',
    code: `import cv2
import numpy as np
import pytesseract

def preprocess_and_ocr(image_bytes: bytes) -> tuple[np.ndarray, str]:
    arr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    denoised = cv2.GaussianBlur(gray, (3, 3), 0)
    # Otsu automatic global thresholding separates dark ink from uneven scans
    _, binary = cv2.threshold(denoised, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    text = pytesseract.image_to_string(binary, config="--oem 3 --psm 6")
    return binary, text.strip()`,
  },
  {
    stage: 'Stage 2: NLTK & spaCy NLP Pipeline (nlp/ner_extractor.py)',
    code: `import spacy
from nltk.corpus import stopwords
from nltk.stem import PorterStemmer, WordNetLemmatizer

nlp = spacy.load("en_core_web_sm")
stemmer, lemmatizer = PorterStemmer(), WordNetLemmatizer()
stop_words = set(stopwords.words("english"))

def analyze_document(text: str) -> dict:
    doc = nlp(text)
    tokens = [
        {
            "token": t.text, "pos": t.pos_,
            "stem": stemmer.stem(t.text.lower()),
            "lemma": lemmatizer.lemmatize(t.text.lower()),
            "is_stop": t.text.lower() in stop_words,
        }
        for t in doc if t.is_alpha
    ]
    entities = [{"text": ent.text, "label": ent.label_} for ent in doc.ents]
    return {"tokens": tokens, "entities": entities}`,
  },
  {
    stage: 'Stage 3: TF-IDF + MultinomialNB Classifier (ml_models/doc_classifier.py)',
    code: `from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.naive_bayes import MultinomialNB
from sklearn.pipeline import Pipeline

def build_baseline_classifier() -> Pipeline:
    return Pipeline([
        ("tfidf", TfidfVectorizer(ngram_range=(1, 2), stop_words="english")),
        ("clf", MultinomialNB(alpha=0.8)),
    ])`,
  },
  {
    stage: 'Stage 4: Sentence-Transformers + FAISS Semantic Search (retrieval/vector_store.py)',
    code: `import faiss
import numpy as np
from sentence_transformers import SentenceTransformer

class CampusFaissStore:
    def __init__(self, model_name="all-MiniLM-L6-v2"):
        self.encoder = SentenceTransformer(model_name)
        self.index = faiss.IndexFlatIP(384)
        self.metadata = []

    def add_chunks(self, chunks: list[dict]):
        vecs = self.encoder.encode([c["text"] for c in chunks], normalize_embeddings=True)
        self.index.add(np.asarray(vecs, dtype="float32"))
        self.metadata.extend(chunks)

    def search(self, query: str, top_k: int = 4, min_score: float = 0.25):
        q_vec = self.encoder.encode([query], normalize_embeddings=True)
        scores, indices = self.index.search(np.asarray(q_vec, dtype="float32"), top_k)
        return [
            {**self.metadata[idx], "score": float(score)}
            for score, idx in zip(scores[0], indices[0])
            if idx != -1 and score >= min_score
        ]`,
  },
];
