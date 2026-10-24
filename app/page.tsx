'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  FileText,
  Upload,
  ShieldCheck,
  HelpCircle,
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
  HeartPulse,
  Droplets,
  Dumbbell,
  MessageCircle,
  MapPin,
  Navigation,
  Stethoscope,
  Pill,
  Building2,
  TestTube2,
  CalendarCheck,
  ExternalLink,
} from 'lucide-react';
import { GoogleGenerativeAI } from '@google/generative-ai';

/* -------------------------------------------------------------------------- */
/*  Types                                                                      */
/* -------------------------------------------------------------------------- */

type RiskLevel = 'Low' | 'Medium' | 'High';
type Mode = 'report' | 'billing';
type Tone = 'ok' | 'warn' | 'bad';

interface Biomarker {
  name: string;
  value: string;
  status: string;
  norm: string;
}

interface RoadmapStep {
  period: string;
  title: string;
  tasks: string[];
}

interface Analysis {
  plainEnglishSummary: string;
  riskLevel: RiskLevel;
  riskReason: string;
  confidenceScore: string;
  healthScore: number;
  riskBreakdown: { cardiovascular: number; metabolic: number; lifestyle: number };
  actionItems: string[];
  doctorQuestions: string[];
  billingDiscrepancies: string;
  biomarkersFlagged: Biomarker[];
  roadmap: RoadmapStep[];
}

/* -------------------------------------------------------------------------- */
/*  Config & sample data                                                       */
/* -------------------------------------------------------------------------- */

// NOTE: NEXT_PUBLIC_* keys are visible in the browser. Restrict the key by HTTP
// referrer for the demo; move the call to a route handler for production.
const MODEL_NAME = process.env.NEXT_PUBLIC_GEMINI_MODEL || 'gemini-2.0-flash';
const MAX_FILE_BYTES = 10 * 1024 * 1024;

const SAMPLE_REPORT = `Patient: Demo Patient, 52 M
Blood Pressure: 145/92 mmHg
Fasting Glucose: 118 mg/dL
Total Cholesterol: 210 mg/dL
LDL: 134 mg/dL
HDL: 44 mg/dL
Creatinine: 0.9 mg/dL
Physician note: Occasional headaches and fatigue. Sedentary job. Family history of type 2 diabetes.`;

const SAMPLE_BILL = `Hospital Statement (Demo)
Room 402 Facility Charge: $4,500
Unbundled Lab Fee (CBC + Metabolic Panel billed separately): $850
Physician Consultation (CPT 99214): $600
Facility Surcharge: $450
Insurance Adjustment: -$1,200
Patient Responsibility: $5,200`;

const DEMO_REPORT: Analysis = {
  plainEnglishSummary:
    'This sample shows blood pressure and fasting blood sugar above typical healthy ranges, with cholesterol just over the borderline mark. Together these readings are worth discussing with a doctor soon, since they can raise long-term heart and diabetes risk if left unaddressed.',
  riskLevel: 'High',
  riskReason: 'Blood pressure in the Stage 2 range plus elevated fasting glucose warrants prompt clinical review.',
  confidenceScore: 'Sample data',
  healthScore: 58,
  riskBreakdown: { cardiovascular: 78, metabolic: 66, lifestyle: 52 },
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
  billingDiscrepancies: '',
  biomarkersFlagged: [
    { name: 'Blood Pressure', value: '145/92 mmHg', status: 'Stage 2 Range', norm: '<120/80 mmHg' },
    { name: 'Fasting Glucose', value: '118 mg/dL', status: 'Elevated', norm: '70-99 mg/dL' },
    { name: 'Total Cholesterol', value: '210 mg/dL', status: 'Borderline High', norm: '<200 mg/dL' },
    { name: 'LDL Cholesterol', value: '134 mg/dL', status: 'Borderline High', norm: '<100 mg/dL' },
    { name: 'HDL Cholesterol', value: '44 mg/dL', status: 'Low', norm: '>40 mg/dL (men)' },
    { name: 'Creatinine', value: '0.9 mg/dL', status: 'Normal', norm: '0.7-1.3 mg/dL' },
  ],
  roadmap: [
    {
      period: 'Days 1-7',
      title: 'Get a clinical baseline',
      tasks: ['See your doctor about BP and glucose', 'Start a daily BP log (morning and evening)', 'Ask about an HbA1c test'],
    },
    {
      period: 'Days 8-14',
      title: 'Fix the food basics',
      tasks: ['Cut added salt and packaged snacks', 'Swap sugary drinks for water', 'Add a vegetable to every main meal'],
    },
    {
      period: 'Days 15-21',
      title: 'Build movement habit',
      tasks: ['Walk 30 minutes, 5 days a week', 'Break up long sitting every hour', 'Aim for 7 hours of sleep'],
    },
    {
      period: 'Days 22-30',
      title: 'Review and adjust',
      tasks: ['Compare your BP log with day 1', 'Share the log with your doctor', 'Plan repeat tests as advised'],
    },
  ],
};

const DEMO_BILL: Analysis = {
  plainEnglishSummary:
    'This sample statement lists a room charge, lab fees, a consultation and a facility surcharge. A few lines are worth questioning: the lab tests look billed separately instead of as a bundle, and the surcharge has no stated justification.',
  riskLevel: 'Medium',
  riskReason: 'No clinical urgency, but several charges may be inflated or duplicated and merit a billing review.',
  confidenceScore: 'Sample data',
  healthScore: 72,
  riskBreakdown: { cardiovascular: 20, metabolic: 25, lifestyle: 30 },
  actionItems: [
    'Request a fully itemized bill with procedure codes for every line.',
    'Ask your insurer for the Explanation of Benefits (EOB) and compare it with the hospital statement.',
    'Call the billing office to dispute any charge without a clear justification.',
  ],
  doctorQuestions: [
    'Why were the blood tests billed separately rather than as a panel?',
    'What does the facility surcharge cover, and does my plan allow it?',
    'Is the room charge consistent with my in-network rate?',
  ],
  billingDiscrepancies:
    'Possible issues: (1) the $850 lab fee may be unbundled; (2) the $450 facility surcharge has no itemized justification; (3) consultation code 99214 should be checked against the documented visit complexity. Request an itemized bill and EOB before paying.',
  biomarkersFlagged: [],
  roadmap: [
    { period: 'Days 1-7', title: 'Collect documents', tasks: ['Request itemized bill with codes', 'Get the insurer EOB', 'Note every date of service'] },
    { period: 'Days 8-14', title: 'Dispute unclear charges', tasks: ['Call billing office, log name and date', 'Send a written dispute for flagged lines', 'Ask for a payment hold while reviewing'] },
    { period: 'Days 15-30', title: 'Resolve and confirm', tasks: ['Get a corrected statement in writing', 'Confirm insurer re-processed the claim', 'Ask about payment plans if needed'] },
  ],
};

const LOADING_STEPS = [
  'Reading document…',
  'Extracting values and line items…',
  'Comparing against reference ranges…',
  'Computing health index…',
  'Building your 30-day roadmap…',
];

/* -------------------------------------------------------------------------- */
/*  Robust parsing                                                             */
/* -------------------------------------------------------------------------- */

function extractJson(raw: string): unknown {
  const cleaned = raw.replace(/```(?:json)?/gi, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end <= start) throw new Error('No JSON object found');
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

const asString = (v: unknown, fb = ''): string =>
  typeof v === 'string' && v.trim() ? v.trim() : typeof v === 'number' ? String(v) : fb;
const asList = (v: unknown): string[] => (Array.isArray(v) ? v.map((x) => asString(x)).filter(Boolean) : []);
const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));
const asScore = (v: unknown, fb: number): number => {
  const n = typeof v === 'number' ? v : parseFloat(asString(v));
  return Number.isFinite(n) ? clamp(n) : fb;
};

function normalizeRisk(v: unknown): RiskLevel {
  const s = asString(v).toLowerCase();
  if (s.includes('high') || s.includes('critical') || s.includes('urgent')) return 'High';
  if (s.includes('med') || s.includes('moderate')) return 'Medium';
  return 'Low';
}

function normalizeAnalysis(data: unknown): Analysis {
  if (!data || typeof data !== 'object') throw new Error('Not an object');
  const d = data as Record<string, any>;
  const summary = asString(d.plainEnglishSummary);
  if (!summary) throw new Error('Missing summary');

  const risk = normalizeRisk(d.riskLevel);
  const baseScore = { High: 45, Medium: 65, Low: 85 }[risk];
  const baseRisk = { High: 70, Medium: 50, Low: 25 }[risk];
  const rb = d.riskBreakdown && typeof d.riskBreakdown === 'object' ? d.riskBreakdown : {};

  const actionItems = asList(d.actionItems);

  let roadmap: RoadmapStep[] = Array.isArray(d.roadmap)
    ? d.roadmap
        .filter((r: any) => r && typeof r === 'object')
        .map((r: any, i: number) => ({
          period: asString(r.period, `Step ${i + 1}`),
          title: asString(r.title, 'Milestone'),
          tasks: asList(r.tasks),
        }))
        .filter((r: RoadmapStep) => r.tasks.length > 0)
    : [];
  if (roadmap.length === 0 && actionItems.length) {
    roadmap = actionItems.slice(0, 4).map((a, i) => ({
      period: ['Days 1-7', 'Days 8-14', 'Days 15-21', 'Days 22-30'][i],
      title: `Milestone ${i + 1}`,
      tasks: [a],
    }));
  }

  return {
    plainEnglishSummary: summary,
    riskLevel: risk,
    riskReason: asString(d.riskReason, 'No rationale provided.'),
    confidenceScore: asString(d.confidenceScore, 'N/A'),
    healthScore: asScore(d.healthScore, baseScore),
    riskBreakdown: {
      cardiovascular: asScore(rb.cardiovascular, baseRisk),
      metabolic: asScore(rb.metabolic, baseRisk),
      lifestyle: asScore(rb.lifestyle, baseRisk),
    },
    actionItems,
    doctorQuestions: asList(d.doctorQuestions),
    billingDiscrepancies: asString(d.billingDiscrepancies),
    biomarkersFlagged: Array.isArray(d.biomarkersFlagged)
      ? d.biomarkersFlagged
          .filter((b: any) => b && typeof b === 'object')
          .map((b: any) => ({
            name: asString(b.name, 'Unnamed marker'),
            value: asString(b.value, '—'),
            status: asString(b.status, 'Flagged'),
            norm: asString(b.norm, '—'),
          }))
      : [],
    roadmap,
  };
}

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(',')[1] || '');
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });

function buildPrompt(mode: Mode, text: string): string {
  const focus =
    mode === 'report'
      ? 'The content is a clinical document. Prioritize biomarkers, risk, and a practical 30-day improvement roadmap.'
      : 'The content is a hospital bill or insurance EOB. Prioritize auditing itemized charges (unbundling, duplicates, unexplained fees, coverage gaps). Leave biomarkersFlagged empty unless clinical values are present. The roadmap should be a 30-day plan for resolving the bill.';
  return `You are a clinical document and medical-billing explainer for patients. ${focus}
Only use information actually present in the content. Never invent values, charges or diagnoses.
healthScore is a 0-100 wellness index (100 = best) based only on the data provided. riskBreakdown values are 0-100 (100 = highest risk) for cardiovascular, metabolic and lifestyle factors; use a moderate value if the data says little about one.
Return ONLY a valid JSON object (no markdown, no commentary) with exactly this shape:
{
  "plainEnglishSummary": "string",
  "riskLevel": "Low" | "Medium" | "High",
  "riskReason": "string",
  "confidenceScore": "string, your self-rated confidence such as '85%'",
  "healthScore": number,
  "riskBreakdown": {"cardiovascular": number, "metabolic": number, "lifestyle": number},
  "actionItems": ["string"],
  "doctorQuestions": ["string"],
  "billingDiscrepancies": "string, empty if no billing data",
  "biomarkersFlagged": [{"name":"string","value":"string","status":"string","norm":"string"}],
  "roadmap": [{"period":"Days 1-7","title":"string","tasks":["string"]}]
}
Roadmap must have 3-4 steps covering 30 days, 2-3 short tasks each.
${text ? `Content to analyze:\n${text}` : 'The content is in the attached file.'}`;
}

/* -------------------------------------------------------------------------- */
/*  Visual helpers                                                             */
/* -------------------------------------------------------------------------- */

const toneOf = (status: string): Tone =>
  /normal|optimal|healthy|good/i.test(status)
    ? 'ok'
    : /critical|high|stage|severe|elevated|low|abnormal/i.test(status) && !/borderline/i.test(status)
    ? 'bad'
    : 'warn';

const TONE_BADGE: Record<Tone, string> = {
  ok: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  warn: 'bg-amber-50 text-amber-700 border-amber-200',
  bad: 'bg-red-50 text-red-700 border-red-200',
};
const TONE_MARKER: Record<Tone, string> = { ok: '16%', warn: '50%', bad: '86%' };
const TONE_DOT: Record<Tone, string> = { ok: 'bg-emerald-500', warn: 'bg-amber-500', bad: 'bg-red-500' };

const scoreColor = (s: number) => (s >= 75 ? '#0d9488' : s >= 50 ? '#d97706' : '#dc2626');
const scoreLabel = (s: number) => (s >= 75 ? 'Good' : s >= 50 ? 'Needs attention' : 'Priority care');
const riskBarColor = (v: number) => (v >= 66 ? 'from-red-500 to-rose-500' : v >= 40 ? 'from-amber-400 to-orange-500' : 'from-teal-400 to-emerald-500');
const riskWord = (v: number) => (v >= 66 ? 'High' : v >= 40 ? 'Moderate' : 'Low');

const WATERMARK = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 80 80'%3E%3Cpath d='M38 30h4v8h8v4h-8v8h-4v-8h-8v-4h8z' fill='%230f766e' fill-opacity='0.06'/%3E%3Ccircle cx='4' cy='4' r='1.2' fill='%230f172a' fill-opacity='0.06'/%3E%3Ccircle cx='44' cy='64' r='1.2' fill='%230f172a' fill-opacity='0.05'/%3E%3C/svg%3E")`;

const GLASS =
  'bg-white/70 backdrop-blur-xl border border-white/70 ring-1 ring-slate-900/5 shadow-[0_8px_30px_rgb(15,23,42,0.06)]';

const GLOBAL_CSS = `
@keyframes cs-fade-up { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
@keyframes cs-shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
@keyframes cs-bar { from { transform: scaleX(0); } to { transform: scaleX(1); } }
@keyframes cs-ping { 0% { transform: scale(.6); opacity: .7; } 100% { transform: scale(2.2); opacity: 0; } }
.cs-fade-up { animation: cs-fade-up .6s cubic-bezier(.2,.8,.2,1) both; }
.cs-shimmer { background: linear-gradient(90deg,#e2e8f0 25%,#f1f5f9 50%,#e2e8f0 75%); background-size: 200% 100%; animation: cs-shimmer 1.4s infinite; }
.cs-bar { transform-origin: left; animation: cs-bar 1s cubic-bezier(.2,.8,.2,1) both; }
.cs-ping { animation: cs-ping 1.8s ease-out infinite; transform-box: fill-box; transform-origin: center; }
@media (prefers-reduced-motion: reduce) { .cs-fade-up, .cs-shimmer, .cs-bar, .cs-ping { animation: none !important; } }
@media print {
  body { background: #fff !important; }
  .cs-fade-up, .cs-bar { animation: none !important; }
  .cs-card { box-shadow: none !important; backdrop-filter: none !important; break-inside: avoid; }
}
`;

/* ---- Health ring ---- */
function ScoreRing({ score }: { score: number }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / 1100);
      setShown(Math.round(score * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [score]);

  const r = 78;
  const c = 2 * Math.PI * r;
  const color = scoreColor(score);
  return (
    <div className="relative w-52 h-52 mx-auto">
      <svg viewBox="0 0 200 200" className="w-full h-full -rotate-90" role="img" aria-label={`Health index ${score} out of 100`}>
        <circle cx="100" cy="100" r={r} fill="none" stroke="#e2e8f0" strokeWidth="14" />
        <circle
          cx="100"
          cy="100"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="14"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - shown / 100)}
          style={{ filter: `drop-shadow(0 0 6px ${color}55)` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-5xl font-black text-slate-900 font-mono leading-none">{shown}</div>
        <div className="text-xs font-bold text-slate-500 mt-1">/ 100 Health Index</div>
        <div className="mt-2 text-[11px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full text-white" style={{ background: color }}>
          {scoreLabel(score)}
        </div>
      </div>
    </div>
  );
}

function RiskBar({ label, value, Icon, delay }: { label: string; value: number; Icon: typeof HeartPulse; delay: number }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="flex items-center gap-2 text-sm font-bold text-slate-800">
          <span className="w-7 h-7 rounded-lg bg-teal-50 text-teal-700 border border-teal-100 flex items-center justify-center">
            <Icon className="w-4 h-4" />
          </span>
          {label}
        </span>
        <span className="text-xs font-bold text-slate-600 font-mono">
          {value}/100 · {riskWord(value)}
        </span>
      </div>
      <div className="h-3 rounded-full bg-slate-200/80 overflow-hidden">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${riskBarColor(value)} cs-bar`}
          style={{ width: `${Math.max(value, 3)}%`, animationDelay: `${delay}ms` }}
        />
      </div>
    </div>
  );
}

/* ---- Clinic finder ---- */
const CLINIC_TYPES = [
  {
    id: 'govt',
    label: 'Government hospital / OPD',
    Icon: Building2,
    query: 'government hospital OPD near me',
    note: 'Usually the lowest consultation cost; expect longer waits. Check if your insurance scheme is accepted.',
    x: 118,
    y: 92,
  },
  {
    id: 'clinic',
    label: 'Community / family clinic',
    Icon: Stethoscope,
    query: 'family clinic general physician near me',
    note: 'Good first stop for BP and sugar checks. Ask for the consultation fee before booking.',
    x: 262,
    y: 70,
  },
  {
    id: 'lab',
    label: 'Diagnostic lab',
    Icon: TestTube2,
    query: 'diagnostic lab blood test near me',
    note: 'Compare package prices for HbA1c, lipid and kidney panels across two or three labs.',
    x: 330,
    y: 160,
  },
  {
    id: 'pharmacy',
    label: 'Generic medicine store',
    Icon: Pill,
    query: 'generic medicine store Jan Aushadhi near me',
    note: 'Ask your doctor whether a generic version of any prescribed medicine is suitable.',
    x: 170,
    y: 175,
  },
] as const;

function ClinicFinder() {
  const [selected, setSelected] = useState<(typeof CLINIC_TYPES)[number]['id']>('clinic');
  const sel = CLINIC_TYPES.find((c) => c.id === selected)!;
  const mapsUrl = `https://www.google.com/maps/search/${encodeURIComponent(sel.query)}`;

  return (
    <section className={`cs-card cs-fade-up rounded-3xl p-6 md:p-8 ${GLASS}`}>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
        <div>
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-teal-600" /> Find Nearby Clinics &amp; Affordable Care
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Illustrative map. Pins show care types, not real locations. The button opens live results in Google Maps.
          </p>
        </div>
      </div>

      <div className="grid md:grid-cols-5 gap-6">
        <div className="md:col-span-3 relative rounded-2xl overflow-hidden border border-slate-200 bg-gradient-to-br from-sky-50 to-teal-50">
          <svg viewBox="0 0 400 240" className="w-full h-auto" role="img" aria-label="Illustrative map of care types">
            <defs>
              <pattern id="cs-grid" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M20 0H0V20" fill="none" stroke="#0f766e" strokeOpacity="0.08" />
              </pattern>
            </defs>
            <rect width="400" height="240" fill="url(#cs-grid)" />
            <path d="M0 120 C100 90 160 150 260 110 S380 90 400 100" stroke="#bae6fd" strokeWidth="14" fill="none" strokeLinecap="round" />
            <path d="M60 0 L120 240 M0 190 L400 150 M250 0 L300 240" stroke="#cbd5e1" strokeWidth="3" fill="none" />
            {/* You */}
            <g transform="translate(200 125)">
              <circle r="9" fill="#2563eb" fillOpacity="0.25" className="cs-ping" />
              <circle r="6" fill="#2563eb" stroke="#fff" strokeWidth="2" />
              <text y="22" textAnchor="middle" fontSize="10" fontWeight="700" fill="#1e3a8a">
                You
              </text>
            </g>
            {CLINIC_TYPES.map((c) => {
              const active = c.id === selected;
              return (
                <g
                  key={c.id}
                  transform={`translate(${c.x} ${c.y})`}
                  onClick={() => setSelected(c.id)}
                  className="cursor-pointer"
                  role="button"
                  aria-label={c.label}
                >
                  {active && <circle r="14" fill="#0d9488" fillOpacity="0.25" className="cs-ping" />}
                  <path
                    d="M0 -18 C-10 -18 -14 -8 -14 -2 C-14 8 0 20 0 20 C0 20 14 8 14 -2 C14 -8 10 -18 0 -18Z"
                    fill={active ? '#0f766e' : '#475569'}
                    stroke="#fff"
                    strokeWidth="2"
                    style={{ transition: 'fill .2s' }}
                  />
                  <circle cx="0" cy="-5" r="4.5" fill="#fff" />
                </g>
              );
            })}
            {/* Direction line */}
            <line x1="200" y1="125" x2={sel.x} y2={sel.y} stroke="#0f766e" strokeWidth="2" strokeDasharray="5 4" />
          </svg>
        </div>

        <div className="md:col-span-2 space-y-2.5">
          {CLINIC_TYPES.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setSelected(id)}
              className={`w-full flex items-center gap-3 text-left px-3.5 py-2.5 rounded-xl border text-sm font-bold transition-all hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 ${
                selected === id
                  ? 'bg-teal-600 text-white border-teal-600 shadow-md shadow-teal-600/25'
                  : 'bg-white/80 text-slate-700 border-slate-200 hover:border-teal-300'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" /> {label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-teal-50/70 border border-teal-100 p-4">
        <p className="text-sm text-teal-950 font-medium leading-relaxed flex-1 min-w-[220px]">
          <strong className="font-extrabold">{sel.label}:</strong> {sel.note}
        </p>
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 hover:-translate-y-0.5 transition-all shadow-md print:hidden"
        >
          <Navigation className="w-4 h-4" /> Open live results in Maps <ExternalLink className="w-3 h-3 opacity-70" />
        </a>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  Page                                                                       */
/* -------------------------------------------------------------------------- */

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [textInput, setTextInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [isDemo, setIsDemo] = useState(false);
  const [inputError, setInputError] = useState('');
  const [activeTab, setActiveTab] = useState<Mode>('report');
  const [copied, setCopied] = useState(false);
  const [done, setDone] = useState<Record<string, boolean>>({});
  const resultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!loading) return;
    setLoadingStep(0);
    const id = setInterval(() => setLoadingStep((s) => (s + 1) % LOADING_STEPS.length), 1300);
    return () => clearInterval(id);
  }, [loading]);

  useEffect(() => {
    if (analysis) resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [analysis]);

  const totalTasks = useMemo(() => analysis?.roadmap.reduce((n, s) => n + s.tasks.length, 0) ?? 0, [analysis]);
  const doneCount = Object.values(done).filter(Boolean).length;
  const progress = totalTasks ? Math.round((doneCount / totalTasks) * 100) : 0;

  const risk = analysis?.riskLevel ?? 'Low';
  const riskTheme = {
    High: { box: 'bg-red-50/80 border-red-200 text-red-950', icon: 'bg-red-600' },
    Medium: { box: 'bg-amber-50/80 border-amber-200 text-amber-950', icon: 'bg-amber-500' },
    Low: { box: 'bg-emerald-50/80 border-emerald-200 text-emerald-950', icon: 'bg-emerald-600' },
  }[risk];

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

  const showDemoNow = () => {
    setTextInput(activeTab === 'report' ? SAMPLE_REPORT : SAMPLE_BILL);
    setDone({});
    setIsDemo(true);
    setAnalysis(activeTab === 'report' ? DEMO_REPORT : DEMO_BILL);
  };

  const reset = () => {
    setAnalysis(null);
    setIsDemo(false);
    setTextInput('');
    setFile(null);
    setDone({});
    setInputError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAnalyze = async () => {
    if (!textInput.trim() && !file) {
      setInputError('Please paste clinical text, upload a document, or load a demo sample first.');
      return;
    }
    setInputError('');
    setLoading(true);
    setDone({});

    try {
      const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
      if (!apiKey) throw new Error('Missing NEXT_PUBLIC_GEMINI_API_KEY');

      const model = new GoogleGenerativeAI(apiKey).getGenerativeModel({
        model: MODEL_NAME,
        generationConfig: { responseMimeType: 'application/json', temperature: 0.2 },
      });

      const parts: any[] = [{ text: buildPrompt(activeTab, textInput.trim()) }];
      if (file) {
        const isText = file.type.startsWith('text/') || /\.(txt|csv|md)$/i.test(file.name);
        if (isText) parts.push({ text: `Attached file (${file.name}):\n${await file.text()}` });
        else if (file.type === 'application/pdf' || file.type.startsWith('image/'))
          parts.push({ inlineData: { mimeType: file.type, data: await fileToBase64(file) } });
        else throw new Error('Unsupported file type');
      }

      const result = await model.generateContent(parts);
      setAnalysis(normalizeAnalysis(extractJson(result.response.text())));
      setIsDemo(false);
    } catch (err) {
      console.error('ClearShield analysis failed:', err);
      setAnalysis(activeTab === 'report' ? DEMO_REPORT : DEMO_BILL);
      setIsDemo(true);
    } finally {
      setLoading(false);
    }
  };

  const shareText = (a: Analysis) =>
    [
      '*ClearShield Health Summary*',
      isDemo ? '_(Sample data for demonstration)_' : '',
      '',
      `Health Index: ${a.healthScore}/100 (${scoreLabel(a.healthScore)})`,
      `Priority: ${a.riskLevel}. ${a.riskReason}`,
      '',
      a.biomarkersFlagged.length
        ? '*Flagged values*\n' + a.biomarkersFlagged.slice(0, 5).map((b) => `• ${b.name}: ${b.value} (${b.status})`).join('\n') + '\n'
        : '',
      '*Next steps*',
      ...a.actionItems.slice(0, 3).map((x, i) => `${i + 1}. ${x}`),
      '',
      '_Informational only, not medical advice._',
    ]
      .filter((l, i, arr) => !(l === '' && arr[i - 1] === ''))
      .join('\n');

  const whatsappUrl = analysis ? `https://wa.me/?text=${encodeURIComponent(shareText(analysis))}` : '#';

  const handleCopy = async () => {
    if (!analysis) return;
    try {
      await navigator.clipboard.writeText(shareText(analysis).replace(/\*/g, '').replace(/_/g, ''));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setInputError('Could not access the clipboard in this browser.');
    }
  };

  return (
    <main
      className="relative min-h-screen bg-gradient-to-b from-slate-100 via-sky-50/60 to-teal-50/40 text-slate-900 selection:bg-teal-600 selection:text-white overflow-x-clip"
      style={{ backgroundImage: undefined }}
    >
      <style>{GLOBAL_CSS}</style>

      {/* Watermark layers */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 print:hidden" style={{ backgroundImage: WATERMARK }} />
      <div aria-hidden="true" className="pointer-events-none absolute -top-24 -right-24 w-[520px] h-[520px] rounded-full bg-teal-300/20 blur-3xl print:hidden" />
      <div aria-hidden="true" className="pointer-events-none absolute top-1/3 -left-32 w-[460px] h-[460px] rounded-full bg-sky-300/20 blur-3xl print:hidden" />
      <HeartPulse aria-hidden="true" className="pointer-events-none absolute top-40 right-6 w-[360px] h-[360px] text-teal-900/[0.035] print:hidden hidden lg:block" strokeWidth={1} />

      <div className="relative">
        {/* Trust bar */}
        <div className="bg-slate-900 text-slate-200 text-xs py-2 px-6 border-b border-slate-800 print:hidden">
          <div className="max-w-7xl mx-auto flex flex-wrap justify-between items-center gap-3">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5 text-teal-300 font-semibold">
                <ShieldCheck className="w-4 h-4" /> Privacy-first design
              </span>
              <span className="flex items-center gap-1.5 text-slate-300">
                <Lock className="w-3.5 h-3.5 text-sky-300" /> Encrypted in transit (HTTPS)
              </span>
            </div>
            <div className="flex items-center gap-2 bg-slate-800 px-3 py-1 rounded-full text-sky-200 border border-slate-700">
              <Sparkles className="w-3.5 h-3.5 text-teal-300" />
              <span className="font-medium">Powered by Google Gemini</span>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="bg-white/80 backdrop-blur-xl border-b border-slate-200 sticky top-0 z-50 shadow-sm print:static print:shadow-none">
          <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-slate-900 via-teal-700 to-sky-500 flex items-center justify-center text-white shadow-lg shadow-teal-600/25 transition-transform hover:scale-105 hover:rotate-3">
                <Activity className="w-6 h-6" />
              </div>
              <div>
                <span className="font-extrabold text-2xl tracking-tight bg-gradient-to-r from-slate-900 to-teal-700 bg-clip-text text-transparent">
                  ClearShield
                </span>
                <span className="block text-[11px] text-teal-700 uppercase tracking-widest font-bold">
                  Health Navigation &amp; Bill Auditor
                </span>
              </div>
            </div>
            <span className="hidden sm:inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold bg-teal-50 text-teal-700 border border-teal-200 shadow-sm print:hidden">
              <span className="w-2.5 h-2.5 rounded-full bg-teal-500 mr-2 animate-pulse" />
              System Operational
            </span>
          </div>
        </nav>

        {/* Hero */}
        {!analysis && (
          <div className="max-w-5xl mx-auto px-6 pt-16 pb-10 text-center print:hidden">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold bg-white/80 text-teal-700 mb-5 border border-teal-200 shadow-sm backdrop-blur">
              <Sparkles className="w-4 h-4 text-teal-600" />
              AI-assisted clarity for health records and hospital bills
            </div>
            <h1 className="text-4xl md:text-6xl font-black tracking-tight text-slate-900 mb-6 leading-tight">
              Understand complex health records &amp; bills, <span className="bg-gradient-to-r from-teal-600 to-sky-600 bg-clip-text text-transparent">instantly.</span>
            </h1>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
              A health index, risk meters, a 30-day roadmap and bill auditing, explained in plain English.
            </p>
          </div>
        )}

        <div className={`max-w-6xl mx-auto px-6 mb-16 ${analysis ? 'pt-8' : ''}`}>
          {/* Input */}
          <div className={`cs-card max-w-4xl mx-auto rounded-3xl overflow-hidden print:hidden ${GLASS}`}>
            <div className="flex border-b border-slate-200/80 bg-slate-100/60 p-2.5 gap-3" role="tablist">
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
                  className={`flex-1 py-3.5 px-3 sm:px-5 rounded-2xl font-bold text-xs sm:text-sm transition-all duration-200 flex items-center justify-center gap-2.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 ${
                    activeTab === id
                      ? 'bg-slate-900 text-white shadow-md shadow-slate-900/25'
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
                  <FileText className="w-4 h-4 text-teal-600" />
                  {activeTab === 'report' ? 'Paste lab report, pathology, or doctor notes:' : 'Paste itemized hospital bill or insurance EOB:'}
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={loadSample}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 px-3 py-1.5 rounded-full transition-all hover:-translate-y-0.5"
                  >
                    <FlaskConical className="w-3.5 h-3.5" /> Load sample text
                  </button>
                  <button
                    type="button"
                    onClick={showDemoNow}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 px-3 py-1.5 rounded-full transition-all hover:-translate-y-0.5 shadow"
                  >
                    <Sparkles className="w-3.5 h-3.5" /> Instant demo
                  </button>
                </div>
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
                className="w-full rounded-2xl bg-white/70 border border-slate-300 p-5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600 focus:bg-white text-slate-900 placeholder-slate-400 font-mono shadow-inner transition-colors"
              />

              <div className="mt-4 flex items-center justify-between gap-3 border-2 border-dashed border-slate-300 rounded-2xl p-4 bg-white/40 hover:border-teal-500 hover:bg-teal-50/40 transition-all">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center shadow-inner shrink-0">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-slate-800 truncate">{file ? file.name : 'Upload a PDF, image, or text file'}</div>
                    <div className="text-xs text-slate-500">PDF, PNG/JPG or TXT · up to 10 MB</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {file && (
                    <button type="button" onClick={() => setFile(null)} aria-label="Remove file" className="p-2 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors">
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
                  <label htmlFor="file-upload" className="cursor-pointer px-4 py-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-300 text-xs font-bold text-slate-700 shadow-sm transition-all hover:-translate-y-0.5">
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
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-slate-900 via-teal-700 to-teal-600 text-white font-bold text-base shadow-xl shadow-teal-700/25 hover:brightness-110 hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-3 disabled:opacity-60 disabled:hover:translate-y-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-teal-600"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" /> {LOADING_STEPS[loadingStep]}
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" /> Analyze &amp; Build Dashboard
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Loading skeleton */}
          {loading && (
            <div className="mt-10 grid md:grid-cols-3 gap-6" aria-hidden="true">
              <div className="h-72 rounded-3xl cs-shimmer" />
              <div className="md:col-span-2 h-72 rounded-3xl cs-shimmer" />
            </div>
          )}

          {/* Dashboard */}
          {analysis && !loading && (
            <div ref={resultsRef} className="mt-10 space-y-6 scroll-mt-28">
              {/* Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-3 cs-fade-up">
                <div>
                  <h2 className="text-2xl font-black text-slate-900">Health Monitoring Dashboard</h2>
                  <p className="text-xs text-slate-500 font-medium">
                    {new Date().toLocaleDateString(undefined, { dateStyle: 'long' })} · {activeTab === 'report' ? 'Clinical report' : 'Billing audit'}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 print:hidden">
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#25D366] text-white text-xs font-bold hover:brightness-95 hover:-translate-y-0.5 transition-all shadow-md shadow-emerald-600/25"
                  >
                    <MessageCircle className="w-4 h-4" /> Share via WhatsApp
                  </a>
                  <button onClick={handleCopy} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/80 border border-slate-300 text-xs font-bold text-slate-700 hover:bg-white hover:-translate-y-0.5 transition-all shadow-sm">
                    {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                    {copied ? 'Copied' : 'Copy summary'}
                  </button>
                  <button onClick={() => window.print()} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 hover:-translate-y-0.5 transition-all shadow-md">
                    <Printer className="w-4 h-4" /> Print / Save PDF
                  </button>
                  <button onClick={reset} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/80 border border-slate-300 text-xs font-bold text-slate-700 hover:bg-white hover:-translate-y-0.5 transition-all shadow-sm">
                    <RotateCcw className="w-4 h-4" /> New analysis
                  </button>
                </div>
              </div>

              {isDemo && (
                <div role="status" className="cs-fade-up flex items-start gap-3 text-sm font-medium text-amber-900 bg-amber-50/90 border border-amber-200 rounded-2xl px-5 py-4">
                  <Info className="w-5 h-5 shrink-0 mt-0.5 text-amber-600" />
                  <span>
                    <strong className="font-extrabold">Demo sample.</strong> This dashboard shows sample data and does not reflect any input you provided.
                  </span>
                </div>
              )}

              {/* Row 1: score + risk meters */}
              <div className="grid lg:grid-cols-5 gap-6">
                <section className={`cs-card cs-fade-up lg:col-span-2 rounded-3xl p-6 md:p-8 ${GLASS}`} style={{ animationDelay: '60ms' }}>
                  <h3 className="text-sm uppercase tracking-widest font-extrabold text-slate-500 mb-4 text-center">Overall Health Index</h3>
                  <ScoreRing score={analysis.healthScore} />
                  <div className="mt-5 grid grid-cols-2 gap-3 text-center">
                    <div className="rounded-xl bg-white/70 border border-slate-200 py-2.5">
                      <div className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Flagged</div>
                      <div className="text-xl font-black font-mono text-slate-900">{analysis.biomarkersFlagged.filter((b) => toneOf(b.status) !== 'ok').length}</div>
                    </div>
                    <div className="rounded-xl bg-white/70 border border-slate-200 py-2.5">
                      <div className="text-[10px] uppercase tracking-wider font-bold text-slate-500">AI confidence</div>
                      <div className="text-sm font-black font-mono text-slate-900 pt-1 truncate px-1">{analysis.confidenceScore}</div>
                    </div>
                  </div>
                  <p className="mt-3 text-[11px] text-slate-500 text-center leading-snug">
                    The index is an AI estimate from the data provided, not a clinical diagnosis.
                  </p>
                </section>

                <div className="lg:col-span-3 space-y-6">
                  <section className={`cs-card cs-fade-up rounded-3xl p-6 border ${riskTheme.box} backdrop-blur-xl shadow-sm`} style={{ animationDelay: '120ms' }}>
                    <div className="flex items-center gap-5">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-md shrink-0 ${riskTheme.icon}`}>
                        <ShieldAlert className="w-7 h-7" />
                      </div>
                      <div>
                        <div className="text-xs uppercase tracking-widest font-extrabold opacity-75">Clinical Urgency</div>
                        <div className="text-2xl font-black mt-0.5">{analysis.riskLevel} Priority</div>
                      </div>
                    </div>
                    <p className="text-sm opacity-90 mt-3 leading-relaxed font-medium">{analysis.riskReason}</p>
                  </section>

                  <section className={`cs-card cs-fade-up rounded-3xl p-6 md:p-8 ${GLASS}`} style={{ animationDelay: '180ms' }}>
                    <h3 className="text-base font-bold text-slate-900 mb-5 flex items-center gap-2">
                      <Activity className="w-5 h-5 text-teal-600" /> Risk Breakdown
                    </h3>
                    <div className="space-y-5">
                      <RiskBar label="Cardiovascular" value={analysis.riskBreakdown.cardiovascular} Icon={HeartPulse} delay={200} />
                      <RiskBar label="Metabolic" value={analysis.riskBreakdown.metabolic} Icon={Droplets} delay={350} />
                      <RiskBar label="Lifestyle" value={analysis.riskBreakdown.lifestyle} Icon={Dumbbell} delay={500} />
                    </div>
                  </section>
                </div>
              </div>

              {/* Summary */}
              <section className={`cs-card cs-fade-up rounded-3xl p-6 md:p-8 ${GLASS}`} style={{ animationDelay: '220ms' }}>
                <h3 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-teal-600" /> Plain-English Breakdown
                </h3>
                <p className="text-slate-700 leading-relaxed text-base">{analysis.plainEnglishSummary}</p>
              </section>

              {/* Biomarkers */}
              {analysis.biomarkersFlagged.length > 0 && (
                <section className={`cs-card cs-fade-up rounded-3xl p-6 md:p-8 ${GLASS}`} style={{ animationDelay: '260ms' }}>
                  <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <TestTube2 className="w-5 h-5 text-teal-600" /> Biomarkers: Measured vs Healthy Range
                  </h3>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {analysis.biomarkersFlagged.map((b, i) => {
                      const tone = toneOf(b.status);
                      return (
                        <div key={i} className="group bg-white/80 p-4 rounded-2xl border border-slate-200 hover:border-teal-300 hover:shadow-lg hover:-translate-y-1 transition-all duration-200">
                          <div className="flex items-start justify-between gap-2">
                            <div className="text-xs text-slate-500 font-bold">{b.name}</div>
                            <span className={`text-[10px] font-extrabold uppercase tracking-wide px-2 py-0.5 rounded-full border ${TONE_BADGE[tone]}`}>{b.status}</span>
                          </div>
                          <div className="text-2xl font-extrabold text-slate-900 my-2 font-mono">{b.value}</div>
                          <div className="relative h-2 rounded-full overflow-hidden flex" aria-hidden="true">
                            <div className="flex-1 bg-emerald-300" />
                            <div className="flex-1 bg-amber-300" />
                            <div className="flex-1 bg-red-300" />
                            <div
                              className={`absolute top-1/2 w-3.5 h-3.5 -translate-y-1/2 -translate-x-1/2 rounded-full border-2 border-white shadow ${TONE_DOT[tone]} transition-all duration-700`}
                              style={{ left: TONE_MARKER[tone] }}
                            />
                          </div>
                          <div className="mt-2 text-[11px] text-slate-500 font-mono">Healthy range: {b.norm}</div>
                        </div>
                      );
                    })}
                  </div>
                  <p className="mt-3 text-[11px] text-slate-500">The marker position reflects the status category, not an exact percentile.</p>
                </section>
              )}

              {/* Roadmap */}
              <section className={`cs-card cs-fade-up rounded-3xl p-6 md:p-8 ${GLASS}`} style={{ animationDelay: '300ms' }}>
                <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                  <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <CalendarCheck className="w-5 h-5 text-teal-600" /> 30-Day Improvement Roadmap
                  </h3>
                  <div className="flex items-center gap-3 print:hidden">
                    <div className="w-36 h-2.5 rounded-full bg-slate-200 overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-teal-500 to-sky-500 transition-all duration-500" style={{ width: `${progress}%` }} />
                    </div>
                    <span className="text-xs font-bold text-slate-600 font-mono">{doneCount}/{totalTasks} done</span>
                  </div>
                </div>

                <ol className="relative border-l-2 border-teal-200 ml-3 space-y-7">
                  {analysis.roadmap.map((step, si) => (
                    <li key={si} className="ml-6 relative">
                      <span className="absolute -left-[37px] top-0 w-7 h-7 rounded-full bg-gradient-to-br from-teal-600 to-sky-600 text-white text-xs font-black flex items-center justify-center ring-4 ring-white shadow">
                        {si + 1}
                      </span>
                      <div className="flex flex-wrap items-baseline gap-2 mb-2">
                        <span className="text-[11px] font-extrabold uppercase tracking-wider text-teal-700 bg-teal-50 border border-teal-100 px-2 py-0.5 rounded-full">{step.period}</span>
                        <h4 className="font-bold text-slate-900">{step.title}</h4>
                      </div>
                      <ul className="space-y-1.5">
                        {step.tasks.map((t, ti) => {
                          const key = `${si}-${ti}`;
                          const checked = !!done[key];
                          return (
                            <li key={key}>
                              <label className="flex items-start gap-3 text-sm cursor-pointer rounded-lg px-2 py-1.5 -mx-2 hover:bg-teal-50/70 transition-colors">
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => setDone((d) => ({ ...d, [key]: !d[key] }))}
                                  className="mt-0.5 w-4 h-4 accent-teal-600"
                                />
                                <span className={`leading-relaxed font-medium transition-colors ${checked ? 'line-through text-slate-400' : 'text-slate-700'}`}>{t}</span>
                              </label>
                            </li>
                          );
                        })}
                      </ul>
                    </li>
                  ))}
                </ol>
              </section>

              {/* Actions + questions */}
              <div className="grid md:grid-cols-2 gap-6">
                <section className={`cs-card cs-fade-up rounded-3xl p-6 md:p-8 ${GLASS}`} style={{ animationDelay: '340ms' }}>
                  <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <CheckSquare className="w-5 h-5 text-emerald-600" /> Immediate Next Steps
                  </h3>
                  {analysis.actionItems.length ? (
                    <ul className="space-y-4">
                      {analysis.actionItems.map((item, i) => (
                        <li key={i} className="flex items-start gap-3.5 text-sm text-slate-700">
                          <span className="w-6 h-6 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold flex items-center justify-center shrink-0 text-xs mt-0.5">{i + 1}</span>
                          <span className="leading-relaxed font-medium">{item}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-slate-500">No action items were generated.</p>
                  )}
                </section>

                <section className="cs-card cs-fade-up rounded-3xl p-6 md:p-8 bg-sky-50/70 backdrop-blur-xl border border-sky-100 ring-1 ring-slate-900/5 shadow-[0_8px_30px_rgb(15,23,42,0.05)]" style={{ animationDelay: '380ms' }}>
                  <h3 className="text-base font-bold text-sky-950 mb-4 flex items-center gap-2">
                    <HelpCircle className="w-5 h-5 text-sky-600" /> Questions to Ask Your Doctor
                  </h3>
                  {analysis.doctorQuestions.length ? (
                    <ul className="space-y-4">
                      {analysis.doctorQuestions.map((q, i) => (
                        <li key={i} className="flex items-start gap-3.5 text-sm text-sky-950">
                          <span className="w-6 h-6 rounded-full bg-sky-100 text-sky-700 border border-sky-200 font-bold flex items-center justify-center shrink-0 text-xs mt-0.5">Q</span>
                          <span className="font-semibold leading-relaxed">{q}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-sky-900/60">No questions were generated.</p>
                  )}
                </section>
              </div>

              {/* Billing */}
              {analysis.billingDiscrepancies && (
                <section className="cs-card cs-fade-up rounded-3xl p-6 md:p-8 bg-violet-50/70 backdrop-blur-xl border border-violet-200 shadow-sm flex items-start gap-5" style={{ animationDelay: '420ms' }}>
                  <div className="w-12 h-12 rounded-2xl bg-violet-100 text-violet-700 border border-violet-200 flex items-center justify-center shrink-0">
                    <DollarSign className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-violet-950 text-base mb-1">Billing Review</h4>
                    <p className="text-sm text-violet-900 leading-relaxed font-medium">{analysis.billingDiscrepancies}</p>
                  </div>
                </section>
              )}

              <ClinicFinder />

              <p className="text-xs text-slate-500 text-center leading-relaxed max-w-2xl mx-auto">
                ClearShield provides general information only and is not a substitute for professional medical advice, diagnosis, or treatment.
                In an emergency, contact your local emergency services.
              </p>
            </div>
          )}
        </div>

        <footer className="bg-white/80 backdrop-blur border-t border-slate-200 py-10 text-center text-xs text-slate-500 print:hidden">
          <p>© 2026 ClearShield. Hackathon prototype for patient navigation. Not a medical device.</p>
        </footer>
      </div>
    </main>
  );
}
