'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  FileText,
  Upload,
  ShieldCheck,
  HelpCircle,
  CheckCircle2,
  Loader2,
  Lock,
  Activity,
  Sparkles,
  FileSearch,
  DollarSign,
  ShieldAlert,
  CheckSquare,
  Printer,
  Copy,
  Check,
  X,
  RotateCcw,
  Info,
  AlertCircle,
  FlaskConical,
} from 'lucide-react';
import { GoogleGenerativeAI } from '@google/generative-ai';

/* -------------------------------------------------------------------------- */
/*  Types                                                                      */
/* -------------------------------------------------------------------------- */

type RiskLevel = 'Low' | 'Medium' | 'High';
type Mode = 'report' | 'billing';

interface Biomarker {
  name: string;
  value: string;
  status: string;
  norm: string;
}

interface Analysis {
  plainEnglishSummary: string;
  riskLevel: RiskLevel;
  riskReason: string;
  confidenceScore: string;
  actionItems: string[];
  doctorQuestions: string[];
  billingDiscrepancies: string;
  biomarkersFlagged: Biomarker[];
}

interface Notice {
  kind: 'demo' | 'error';
  message: string;
}

/* -------------------------------------------------------------------------- */
/*  Config & sample data                                                       */
/* -------------------------------------------------------------------------- */

// NOTE: NEXT_PUBLIC_* keys are visible in the browser. Fine for a hackathon demo
// with a restricted key; for production move the Gemini call to a route handler.
const MODEL_NAME = process.env.NEXT_PUBLIC_GEMINI_MODEL || 'gemini-2.0-flash';
const MAX_FILE_BYTES = 10 * 1024 * 1024;

const SAMPLE_REPORT = `Patient: Demo Patient, 52 M
Blood Pressure: 145/92 mmHg
Fasting Glucose: 118 mg/dL
Total Cholesterol: 210 mg/dL
LDL: 134 mg/dL
HDL: 44 mg/dL
Creatinine: 0.9 mg/dL
Physician note: Patient reports occasional headaches and fatigue. Family history of type 2 diabetes.`;

const SAMPLE_BILL = `Hospital Statement (Demo)
Room 402 Facility Charge: $4,500
Unbundled Lab Fee (CBC + Metabolic Panel billed separately): $850
Physician Consultation (CPT 99214): $600
Facility Surcharge: $450
Insurance Adjustment: -$1,200
Patient Responsibility: $5,200`;

const DEMO_REPORT: Analysis = {
  plainEnglishSummary:
    'This sample shows blood pressure and fasting blood sugar above the typical healthy ranges, with cholesterol sitting just over the borderline mark. Taken together, these readings are worth discussing with a doctor soon, since they can raise long-term heart and diabetes risk if left unaddressed.',
  riskLevel: 'High',
  riskReason:
    'Blood pressure in the Stage 2 range combined with elevated fasting glucose warrants prompt clinical review.',
  confidenceScore: 'Sample data',
  actionItems: [
    'Book an appointment with your primary physician within the next week.',
    'Log home blood pressure and, if advised, blood glucose readings daily.',
    'Discuss sodium, sugar and activity changes with your doctor.',
  ],
  doctorQuestions: [
    'Do these blood pressure readings need medication, or can lifestyle changes come first?',
    'Should I get an HbA1c test to check my longer-term blood sugar control?',
    'Which follow-up tests (kidney function, ECG, lipid panel) make sense for me?',
  ],
  billingDiscrepancies: 'No billing information was provided in this sample.',
  biomarkersFlagged: [
    { name: 'Blood Pressure', value: '145/92 mmHg', status: 'Stage 2 Range', norm: '<120/80 mmHg' },
    { name: 'Fasting Glucose', value: '118 mg/dL', status: 'Elevated', norm: '70-99 mg/dL' },
    { name: 'Total Cholesterol', value: '210 mg/dL', status: 'Borderline High', norm: '<200 mg/dL' },
  ],
};

const DEMO_BILL: Analysis = {
  plainEnglishSummary:
    'This sample statement lists a room charge, lab fees, a consultation and a facility surcharge. A few lines look worth questioning: the lab tests appear billed separately instead of as a bundle, and the surcharge has no stated justification.',
  riskLevel: 'Medium',
  riskReason: 'No clinical urgency, but several charges may be inflated or duplicated and merit a billing review.',
  confidenceScore: 'Sample data',
  actionItems: [
    'Request a fully itemized bill with procedure codes for every line.',
    'Ask your insurer for the Explanation of Benefits (EOB) and compare it to the hospital statement.',
    'Call the billing office to dispute any charge without a clear justification.',
  ],
  doctorQuestions: [
    'Why were the blood tests billed as separate items rather than as a panel?',
    'What does the facility surcharge cover, and is it allowed under my plan?',
    'Is the room charge consistent with my in-network rate?',
  ],
  billingDiscrepancies:
    'Possible issues: (1) $850 lab fee may be unbundled; (2) $450 facility surcharge has no itemized justification; (3) consultation code 99214 should be checked against the visit complexity documented. Request an itemized bill and EOB before paying.',
  biomarkersFlagged: [],
};

/* -------------------------------------------------------------------------- */
/*  Robust parsing helpers                                                     */
/* -------------------------------------------------------------------------- */

function extractJson(raw: string): unknown {
  const cleaned = raw.replace(/```(?:json)?/gi, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end <= start) throw new Error('No JSON object found in model output');
  const slice = cleaned.slice(start, end + 1);

  try {
    return JSON.parse(slice);
  } catch {
    const repaired = slice
      .replace(/[\u201C\u201D]/g, '"')
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/,\s*([}\]])/g, '$1')
      .replace(/[\u0000-\u001F]+/g, ' ');
    return JSON.parse(repaired);
  }
}

const asString = (v: unknown, fallback = ''): string =>
  typeof v === 'string' && v.trim() ? v.trim() : typeof v === 'number' ? String(v) : fallback;

const asStringList = (v: unknown): string[] =>
  Array.isArray(v) ? v.map((x) => asString(x)).filter(Boolean) : [];

function normalizeRisk(v: unknown): RiskLevel {
  const s = asString(v).toLowerCase();
  if (s.includes('high') || s.includes('critical') || s.includes('urgent')) return 'High';
  if (s.includes('med') || s.includes('moderate')) return 'Medium';
  return 'Low';
}

function normalizeAnalysis(data: unknown): Analysis {
  if (!data || typeof data !== 'object') throw new Error('Model output was not an object');
  const d = data as Record<string, unknown>;

  const biomarkers: Biomarker[] = Array.isArray(d.biomarkersFlagged)
    ? d.biomarkersFlagged
        .filter((b): b is Record<string, unknown> => !!b && typeof b === 'object')
        .map((b) => ({
          name: asString(b.name, 'Unnamed marker'),
          value: asString(b.value, '—'),
          status: asString(b.status, 'Flagged'),
          norm: asString(b.norm, '—'),
        }))
    : [];

  const summary = asString(d.plainEnglishSummary);
  if (!summary) throw new Error('Model output missing summary');

  return {
    plainEnglishSummary: summary,
    riskLevel: normalizeRisk(d.riskLevel),
    riskReason: asString(d.riskReason, 'No rationale provided.'),
    confidenceScore: asString(d.confidenceScore, 'N/A'),
    actionItems: asStringList(d.actionItems),
    doctorQuestions: asStringList(d.doctorQuestions),
    billingDiscrepancies: asString(d.billingDiscrepancies),
    biomarkersFlagged: biomarkers,
  };
}

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

function buildPrompt(mode: Mode, text: string): string {
  const focus =
    mode === 'report'
      ? 'The content is a clinical document (lab report, pathology, or doctor notes). Prioritize biomarkers, clinical risk and doctor questions.'
      : 'The content is a hospital bill or insurance EOB. Prioritize itemized charge auditing, unbundling, duplicate or unexplained charges and coverage gaps. Leave biomarkersFlagged empty unless clinical values are present.';

  return `You are a clinical document and medical-billing explainer for patients. ${focus}
Only use information actually present in the content. Never invent values, charges or diagnoses. If something is missing, say so.
Return ONLY a valid JSON object (no markdown, no commentary) with exactly this shape:
{
  "plainEnglishSummary": "string, clear layperson explanation",
  "riskLevel": "Low" | "Medium" | "High",
  "riskReason": "string",
  "confidenceScore": "string, your self-rated confidence such as '85%'",
  "actionItems": ["string"],
  "doctorQuestions": ["string"],
  "billingDiscrepancies": "string, empty if no billing data",
  "biomarkersFlagged": [{"name":"string","value":"string","status":"string","norm":"string"}]
}
${text ? `Content to analyze:\n${text}` : 'The content is in the attached file.'}`;
}

/* -------------------------------------------------------------------------- */
/*  Styles (animations + print)                                                */
/* -------------------------------------------------------------------------- */

const GLOBAL_CSS = `
@keyframes cs-fade-up { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
@keyframes cs-shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
@keyframes cs-bar { from { width: 0; } }
.cs-fade-up { animation: cs-fade-up .55s cubic-bezier(.2,.8,.2,1) both; }
.cs-shimmer { background: linear-gradient(90deg,#e2e8f0 25%,#f1f5f9 50%,#e2e8f0 75%); background-size: 200% 100%; animation: cs-shimmer 1.4s infinite; }
.cs-bar { animation: cs-bar .9s cubic-bezier(.2,.8,.2,1) both; }
@media (prefers-reduced-motion: reduce) { .cs-fade-up, .cs-shimmer, .cs-bar { animation: none !important; } }
@media print {
  body { background: #fff !important; }
  .cs-fade-up { animation: none !important; }
  .cs-card { box-shadow: none !important; break-inside: avoid; }
}
`;

const LOADING_STEPS = [
  'Reading document…',
  'Extracting values and line items…',
  'Comparing against reference ranges…',
  'Stratifying risk…',
  'Drafting questions for your doctor…',
];

/* -------------------------------------------------------------------------- */
/*  Component                                                                  */
/* -------------------------------------------------------------------------- */

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [textInput, setTextInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [inputError, setInputError] = useState('');
  const [activeTab, setActiveTab] = useState<Mode>('report');
  const [copied, setCopied] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Rotate loading messages
  useEffect(() => {
    if (!loading) return;
    setLoadingStep(0);
    const id = setInterval(() => setLoadingStep((s) => (s + 1) % LOADING_STEPS.length), 1300);
    return () => clearInterval(id);
  }, [loading]);

  // Scroll to results when ready
  useEffect(() => {
    if (analysis) resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [analysis]);

  const riskTheme = useMemo(() => {
    const level = analysis?.riskLevel ?? 'Low';
    return {
      High: { box: 'bg-red-50 border-red-200 text-red-950', icon: 'bg-red-600', bar: 'bg-red-500', pct: '100%' },
      Medium: { box: 'bg-amber-50 border-amber-200 text-amber-950', icon: 'bg-amber-500', bar: 'bg-amber-500', pct: '60%' },
      Low: { box: 'bg-emerald-50 border-emerald-200 text-emerald-950', icon: 'bg-emerald-600', bar: 'bg-emerald-500', pct: '25%' },
    }[level];
  }, [analysis]);

  const handleFile = (f: File | null) => {
    setInputError('');
    if (!f) return;
    if (f.size > MAX_FILE_BYTES) {
      setInputError('File is larger than 10 MB. Please upload a smaller file or paste the text.');
      return;
    }
    setFile(f);
  };

  const loadSample = () => {
    setTextInput(activeTab === 'report' ? SAMPLE_REPORT : SAMPLE_BILL);
    setInputError('');
  };

  const reset = () => {
    setAnalysis(null);
    setNotice(null);
    setTextInput('');
    setFile(null);
    setInputError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAnalyze = async () => {
    if (!textInput.trim() && !file) {
      setInputError('Please paste clinical text or upload a document first.');
      return;
    }
    setInputError('');
    setNotice(null);
    setLoading(true);

    try {
      const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
      if (!apiKey) throw new Error('Missing NEXT_PUBLIC_GEMINI_API_KEY');

      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({
        model: MODEL_NAME,
        generationConfig: { responseMimeType: 'application/json', temperature: 0.2 },
      });

      const parts: any[] = [{ text: buildPrompt(activeTab, textInput.trim()) }];

      if (file) {
        const isText = file.type.startsWith('text/') || /\.(txt|csv|md)$/i.test(file.name);
        if (isText) {
          parts.push({ text: `Attached file (${file.name}):\n${await file.text()}` });
        } else if (file.type === 'application/pdf' || file.type.startsWith('image/')) {
          parts.push({ inlineData: { mimeType: file.type, data: await fileToBase64(file) } });
        } else {
          throw new Error('Unsupported file type. Use PDF, image or text.');
        }
      }

      const result = await model.generateContent(parts);
      const parsed = extractJson(result.response.text());
      setAnalysis(normalizeAnalysis(parsed));
    } catch (err) {
      console.error('ClearShield analysis failed:', err);
      // Seamless fallback so the demo never breaks, clearly labelled as sample output.
      setAnalysis(activeTab === 'report' ? DEMO_REPORT : DEMO_BILL);
      setNotice({
        kind: 'demo',
        message:
          'Live analysis was unavailable, so this is sample output for demonstration. It does not reflect your input.',
      });
    } finally {
      setLoading(false);
    }
  };

  const buildPlainText = (a: Analysis) =>
    [
      'CLEARSHIELD SUMMARY',
      `Priority: ${a.riskLevel} — ${a.riskReason}`,
      '',
      'SUMMARY',
      a.plainEnglishSummary,
      '',
      a.biomarkersFlagged.length
        ? 'FLAGGED VALUES\n' +
          a.biomarkersFlagged.map((b) => `- ${b.name}: ${b.value} (${b.status}; normal ${b.norm})`).join('\n') +
          '\n'
        : '',
      'ACTION ITEMS',
      ...a.actionItems.map((x, i) => `${i + 1}. ${x}`),
      '',
      'QUESTIONS FOR YOUR DOCTOR',
      ...a.doctorQuestions.map((x, i) => `${i + 1}. ${x}`),
      a.billingDiscrepancies ? `\nBILLING REVIEW\n${a.billingDiscrepancies}` : '',
      '',
      'Informational only. Not medical advice.',
    ].join('\n');

  const handleCopy = async () => {
    if (!analysis) return;
    try {
      await navigator.clipboard.writeText(buildPlainText(analysis));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setInputError('Could not access the clipboard in this browser.');
    }
  };

  const statusColor = (status: string) =>
    /normal|optimal|healthy/i.test(status)
      ? 'text-emerald-600'
      : /critical|high|stage|severe/i.test(status)
      ? 'text-red-600'
      : 'text-amber-600';

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 selection:bg-blue-600 selection:text-white">
      <style>{GLOBAL_CSS}</style>

      {/* Trust bar */}
      <div className="bg-slate-900 text-slate-200 text-xs py-2 px-6 border-b border-slate-800 print:hidden">
        <div className="max-w-7xl mx-auto flex flex-wrap justify-between items-center gap-3">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
              <ShieldCheck className="w-4 h-4" /> Privacy-first design
            </span>
            <span className="flex items-center gap-1.5 text-slate-300">
              <Lock className="w-3.5 h-3.5 text-blue-400" /> Encrypted in transit (HTTPS)
            </span>
          </div>
          <div className="flex items-center gap-2 bg-slate-800 px-3 py-1 rounded-full text-blue-300 border border-slate-700">
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            <span className="font-medium">Powered by Google Gemini</span>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="bg-white/90 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50 shadow-sm print:static print:shadow-none">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/25 transition-transform hover:scale-105 hover:rotate-3">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <span className="font-extrabold text-2xl tracking-tight bg-gradient-to-r from-blue-700 to-indigo-900 bg-clip-text text-transparent">
                ClearShield
              </span>
              <span className="block text-[11px] text-blue-600 uppercase tracking-widest font-bold">
                Clinical Navigation &amp; Billing Auditor
              </span>
            </div>
          </div>
          <span className="hidden sm:inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm print:hidden">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 mr-2 animate-pulse" />
            System Operational
          </span>
        </div>
      </nav>

      {/* Hero */}
      <div className="max-w-5xl mx-auto px-6 pt-16 pb-10 text-center print:hidden">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 mb-5 border border-blue-200 shadow-sm">
          <Sparkles className="w-4 h-4 text-blue-600" />
          AI-assisted clarity for health records and hospital bills
        </div>
        <h1 className="text-4xl md:text-6xl font-black tracking-tight text-slate-900 mb-6 leading-tight">
          Understand complex health records &amp; bills, <span className="text-blue-600">instantly.</span>
        </h1>
        <p className="text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
          Plain-English explanations, risk prioritization, smart questions for your doctor, and itemized bill auditing,
          built for patient clarity.
        </p>
      </div>

      <div className="max-w-4xl mx-auto px-6 mb-16">
        {/* Input card */}
        <div className="cs-card bg-white rounded-3xl shadow-xl shadow-slate-200/60 border border-slate-200 overflow-hidden print:hidden">
          <div className="flex border-b border-slate-200 bg-slate-50 p-2.5 gap-3" role="tablist">
            {(
              [
                { id: 'report', label: 'Clinical Lab Report Analyzer', Icon: FileSearch },
                { id: 'billing', label: 'Hospital Bill & Insurance Auditor', Icon: DollarSign },
              ] as const
            ).map(({ id, label, Icon }) => (
              <button
                key={id}
                role="tab"
                aria-selected={activeTab === id}
                onClick={() => setActiveTab(id)}
                className={`flex-1 py-3.5 px-3 sm:px-5 rounded-2xl font-bold text-xs sm:text-sm transition-all duration-200 flex items-center justify-center gap-2.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
                  activeTab === id
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" /> {label}
              </button>
            ))}
          </div>

          <div className="p-6 sm:p-8">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <label htmlFor="clinical-input" className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600" />
                {activeTab === 'report'
                  ? 'Paste lab report, pathology, or doctor notes:'
                  : 'Paste itemized hospital bill or insurance EOB:'}
              </label>
              <button
                type="button"
                onClick={loadSample}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-3 py-1.5 rounded-full transition-all hover:-translate-y-0.5"
              >
                <FlaskConical className="w-3.5 h-3.5" /> Load sample
              </button>
            </div>

            <textarea
              id="clinical-input"
              rows={6}
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder={
                activeTab === 'report'
                  ? 'e.g., Blood Pressure: 145/92 mmHg, Fasting Glucose: 118 mg/dL, Total Cholesterol: 210 mg/dL...'
                  : 'e.g., Facility Charge Room 402: $4,500, Unbundled Lab Fee: $850, Physician Consultation: $600...'
              }
              className="w-full rounded-2xl bg-slate-50 border border-slate-300 p-5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white text-slate-900 placeholder-slate-400 font-mono shadow-inner transition-colors"
            />

            {/* Upload */}
            <div className="mt-4 flex items-center justify-between gap-3 border-2 border-dashed border-slate-300 rounded-2xl p-4 bg-slate-50/50 hover:border-blue-500 hover:bg-blue-50/30 transition-all">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-inner shrink-0">
                  <Upload className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-bold text-slate-800 truncate">
                    {file ? file.name : 'Upload a PDF, image, or text file'}
                  </div>
                  <div className="text-xs text-slate-500">PDF, PNG/JPG or TXT · up to 10 MB</div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {file && (
                  <button
                    type="button"
                    onClick={() => setFile(null)}
                    aria-label="Remove file"
                    className="p-2 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
                <input
                  type="file"
                  id="file-upload"
                  className="hidden"
                  accept="application/pdf,image/*,text/plain,.txt,.csv,.md"
                  onChange={(e) => {
                    handleFile(e.target.files?.[0] ?? null);
                    e.target.value = '';
                  }}
                />
                <label
                  htmlFor="file-upload"
                  className="cursor-pointer px-4 py-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-300 text-xs font-bold text-slate-700 shadow-sm transition-all hover:-translate-y-0.5"
                >
                  Browse
                </label>
              </div>
            </div>

            {inputError && (
              <div role="alert" className="mt-4 flex items-center gap-2 text-sm font-semibold text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3 cs-fade-up">
                <AlertCircle className="w-4 h-4 shrink-0" /> {inputError}
              </div>
            )}

            <div className="mt-6">
              <button
                onClick={handleAnalyze}
                disabled={loading}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-base shadow-xl shadow-blue-500/25 hover:from-blue-700 hover:to-indigo-700 hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-3 disabled:opacity-60 disabled:hover:translate-y-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-600"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    {LOADING_STEPS[loadingStep]}
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" /> Analyze &amp; Prioritize
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Loading skeleton */}
        {loading && (
          <div className="mt-10 space-y-6" aria-hidden="true">
            <div className="grid md:grid-cols-3 gap-6">
              <div className="md:col-span-2 h-32 rounded-3xl cs-shimmer" />
              <div className="h-32 rounded-3xl cs-shimmer" />
            </div>
            <div className="h-40 rounded-3xl cs-shimmer" />
          </div>
        )}

        {/* Results */}
        {analysis && !loading && (
          <div ref={resultsRef} className="mt-10 space-y-8 scroll-mt-28">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 print:hidden cs-fade-up">
              <h2 className="text-xl font-extrabold text-slate-900">Your Clinical Report</h2>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={handleCopy}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-100 hover:-translate-y-0.5 transition-all shadow-sm"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'Copied' : 'Copy summary'}
                </button>
                <button
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 hover:-translate-y-0.5 transition-all shadow-md shadow-blue-500/25"
                >
                  <Printer className="w-4 h-4" /> Print / Save PDF
                </button>
                <button
                  onClick={reset}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-100 hover:-translate-y-0.5 transition-all shadow-sm"
                >
                  <RotateCcw className="w-4 h-4" /> New analysis
                </button>
              </div>
            </div>

            {notice && (
              <div
                role="status"
                className="cs-fade-up flex items-start gap-3 text-sm font-medium text-amber-900 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4"
              >
                <Info className="w-5 h-5 shrink-0 mt-0.5 text-amber-600" />
                <span>
                  <strong className="font-extrabold">Demo sample.</strong> {notice.message}
                </span>
              </div>
            )}

            {/* Risk + confidence */}
            <div className="grid md:grid-cols-3 gap-6 cs-fade-up" style={{ animationDelay: '60ms' }}>
              <div className={`cs-card md:col-span-2 p-6 rounded-3xl border shadow-sm hover:shadow-md transition-shadow ${riskTheme.box}`}>
                <div className="flex items-center gap-5">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-md shrink-0 ${riskTheme.icon}`}>
                    <ShieldAlert className="w-7 h-7" />
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-widest font-extrabold opacity-75">Clinical Urgency</div>
                    <div className="text-2xl font-black mt-0.5">{analysis.riskLevel} Priority</div>
                  </div>
                </div>
                <div className="mt-4 h-2 rounded-full bg-black/10 overflow-hidden" aria-hidden="true">
                  <div className={`h-full rounded-full cs-bar ${riskTheme.bar}`} style={{ width: riskTheme.pct }} />
                </div>
                <p className="text-sm opacity-90 mt-3 leading-relaxed font-medium">{analysis.riskReason}</p>
              </div>

              <div className="cs-card bg-white border border-slate-200 p-6 rounded-3xl flex flex-col justify-center items-center text-center shadow-sm hover:shadow-md transition-shadow">
                <div className="text-xs uppercase tracking-widest font-bold text-slate-500 mb-1">Model Confidence</div>
                <div className="text-3xl font-black text-blue-600 font-mono break-words">{analysis.confidenceScore}</div>
                <div className="text-xs text-slate-500 mt-2 font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-slate-400" /> Self-rated by the AI, not a clinical measure
                </div>
              </div>
            </div>

            {/* Biomarkers */}
            {analysis.biomarkersFlagged.length > 0 && (
              <div className="cs-card cs-fade-up bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-sm" style={{ animationDelay: '120ms' }}>
                <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-blue-600" /> Flagged Biomarkers &amp; Vitals
                </h3>
                <div className="grid md:grid-cols-3 gap-4">
                  {analysis.biomarkersFlagged.map((bio, idx) => (
                    <div
                      key={idx}
                      className="bg-slate-50 p-4 rounded-2xl border border-slate-200 hover:border-blue-300 hover:shadow-md hover:-translate-y-0.5 transition-all"
                    >
                      <div className="text-xs text-slate-500 font-bold">{bio.name}</div>
                      <div className="text-xl font-extrabold text-slate-900 my-1 font-mono">{bio.value}</div>
                      <div className="flex justify-between items-center gap-2 mt-2 pt-2 border-t border-slate-200 text-xs">
                        <span className={`font-extrabold ${statusColor(bio.status)}`}>{bio.status}</span>
                        <span className="text-slate-500 font-mono text-right">Norm: {bio.norm}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Summary */}
            <div className="cs-card cs-fade-up bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-sm" style={{ animationDelay: '180ms' }}>
              <h3 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" /> Plain-English Breakdown
              </h3>
              <p className="text-slate-700 leading-relaxed text-base">{analysis.plainEnglishSummary}</p>
            </div>

            {/* Actions + questions */}
            <div className="grid md:grid-cols-2 gap-6 cs-fade-up" style={{ animationDelay: '240ms' }}>
              <div className="cs-card bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-sm hover:shadow-md transition-shadow">
                <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <CheckSquare className="w-5 h-5 text-emerald-600" /> Recommended Next Steps
                </h3>
                {analysis.actionItems.length ? (
                  <ul className="space-y-4">
                    {analysis.actionItems.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-3.5 text-sm text-slate-700">
                        <span className="w-6 h-6 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 font-bold flex items-center justify-center shrink-0 text-xs mt-0.5">
                          {idx + 1}
                        </span>
                        <span className="leading-relaxed font-medium">{item}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-slate-500">No action items were generated.</p>
                )}
              </div>

              <div className="cs-card bg-blue-50/50 border border-blue-100 rounded-3xl p-6 md:p-8 shadow-sm hover:shadow-md transition-shadow">
                <h3 className="text-base font-bold text-blue-950 mb-4 flex items-center gap-2">
                  <HelpCircle className="w-5 h-5 text-blue-600" /> Questions to Ask Your Doctor
                </h3>
                {analysis.doctorQuestions.length ? (
                  <ul className="space-y-4">
                    {analysis.doctorQuestions.map((q, idx) => (
                      <li key={idx} className="flex items-start gap-3.5 text-sm text-blue-900">
                        <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 border border-blue-200 font-bold flex items-center justify-center shrink-0 text-xs mt-0.5">
                          Q
                        </span>
                        <span className="font-semibold leading-relaxed">{q}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-blue-900/60">No questions were generated.</p>
                )}
              </div>
            </div>

            {/* Billing */}
            {analysis.billingDiscrepancies && (
              <div className="cs-card cs-fade-up bg-purple-50 border border-purple-200 rounded-3xl p-6 md:p-8 shadow-sm flex items-start gap-5" style={{ animationDelay: '300ms' }}>
                <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-700 border border-purple-200 flex items-center justify-center shrink-0">
                  <DollarSign className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-purple-950 text-base mb-1">Billing Review</h4>
                  <p className="text-sm text-purple-900 leading-relaxed font-medium">{analysis.billingDiscrepancies}</p>
                </div>
              </div>
            )}

            <p className="text-xs text-slate-500 text-center leading-relaxed">
              ClearShield provides general information only and is not a substitute for professional medical advice,
              diagnosis, or treatment. Always consult a qualified clinician.
            </p>
          </div>
        )}
      </div>

      <footer className="bg-white border-t border-slate-200 py-10 text-center text-xs text-slate-500 print:hidden">
        <p>© 2026 ClearShield. Hackathon prototype for patient navigation. Not a medical device.</p>
      </footer>
    </main>
  );
}