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
  Languages,
  FileJson,
  Gauge,
  TrendingUp,
  TrendingDown,
  Minus,
  Trash2,
  Search,
  Calculator,
  FileSignature,
  Download,
  AlertTriangle,
  History,
} from 'lucide-react';
import { GoogleGenerativeAI } from '@google/generative-ai';

/* -------------------------------------------------------------------------- */
/*  Types                                                                      */
/* -------------------------------------------------------------------------- */

type RiskLevel = 'Low' | 'Medium' | 'High';
type Mode = 'report' | 'billing';
type Tone = 'ok' | 'warn' | 'bad';
type Lang = 'en' | 'hi';

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

interface HiContent {
  plainEnglishSummary: string;
  riskReason: string;
  actionItems: string[];
  doctorQuestions: string[];
  billingDiscrepancies: string;
  roadmap: RoadmapStep[];
}

interface BillLine {
  description: string;
  code?: string;
  amount: number;
}

interface BillingData {
  lines: BillLine[];
  icdCodes: string[];
  currency: string;
  adjustments: number;
  statementOwed?: number;
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
  hi?: HiContent;
  billing?: BillingData;
}

interface HistoryEntry {
  id: string;
  ts: number;
  healthScore: number;
  riskLevel: RiskLevel;
  risk: { cardiovascular: number; metabolic: number; lifestyle: number };
  markers: { name: string; value: string; status: string }[];
  demo?: boolean;
}

/* -------------------------------------------------------------------------- */
/*  Config                                                                     */
/* -------------------------------------------------------------------------- */

// NOTE: NEXT_PUBLIC_* keys are visible in the browser. Restrict the key by HTTP
// referrer for the demo; move the call to a route handler for production.
const MODEL_NAME = process.env.NEXT_PUBLIC_GEMINI_MODEL || 'gemini-2.0-flash';
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const HISTORY_KEY = 'clearshield.history.v1';
const LANG_KEY = 'clearshield.lang.v1';

/* -------------------------------------------------------------------------- */
/*  i18n (English / Hindi)                                                     */
/* -------------------------------------------------------------------------- */

const EN = {
  privacy: 'Privacy-first design',
  encrypted: 'Encrypted in transit (HTTPS)',
  powered: 'Powered by Google Gemini',
  tagline: 'Health Navigation & Bill Auditor',
  sysOp: 'System Operational',
  heroBadge: 'AI-assisted clarity for health records and hospital bills',
  heroA: 'Understand complex health records & bills,',
  heroB: 'instantly.',
  heroSub: 'A health index, risk meters, a 30-day roadmap and bill auditing, explained in plain English.',
  tabReport: 'Clinical Lab Report Analyzer',
  tabBilling: 'Hospital Bill & Insurance Auditor',
  pasteReport: 'Paste lab report, pathology, or doctor notes:',
  pasteBill: 'Paste itemized hospital bill or insurance EOB:',
  loadSample: 'Load sample text',
  instantDemo: 'Instant demo',
  phReport: 'e.g., Blood Pressure: 145/92 mmHg, Fasting Glucose: 118 mg/dL, Total Cholesterol: 210 mg/dL...',
  phBill: 'e.g., Facility Charge Room 402: $4,500, Unbundled Lab Fee: $850, Physician Consultation: $600...',
  uploadTitle: 'Upload a PDF, image, or text file',
  uploadSub: 'PDF, PNG/JPG or TXT · up to 10 MB',
  browse: 'Browse',
  analyze: 'Analyze & Build Dashboard',
  errEmpty: 'Please paste clinical text, upload a document, or load a demo sample first.',
  errSize: 'File is larger than 10 MB. Please upload a smaller file or paste the text.',
  errClip: 'Could not access the clipboard in this browser.',
  step1: 'Reading document…',
  step2: 'Extracting values and line items…',
  step3: 'Comparing against reference ranges…',
  step4: 'Computing health index…',
  step5: 'Building your 30-day roadmap…',
  dashTitle: 'Health Monitoring Dashboard',
  clinicalReport: 'Clinical report',
  billingAudit: 'Billing audit',
  whatsapp: 'Share via WhatsApp',
  copy: 'Copy summary',
  copied: 'Copied',
  print: 'Print / Save PDF',
  fhir: 'Export FHIR Record',
  newAnalysis: 'New analysis',
  demoStrong: 'Demo sample.',
  demoRest: 'This dashboard shows sample data and does not reflect any input you provided.',
  aiTranslated: 'Hindi text is AI-generated. Please confirm with your doctor.',
  hindiMissing: 'A Hindi version is unavailable for this result, so English is shown.',
  overallIndex: 'Overall Health Index',
  indexOf: '/ 100 Health Index',
  flagged: 'Flagged',
  aiConf: 'AI confidence',
  indexNote: 'The index is an AI estimate from the data provided, not a clinical diagnosis.',
  urgency: 'Clinical Urgency',
  priority: 'Priority',
  riskBreakdown: 'Risk Breakdown',
  cardio: 'Cardiovascular',
  metabolic: 'Metabolic',
  lifestyle: 'Lifestyle',
  plain: 'Plain-English Breakdown',
  biomarkers: 'Biomarkers: Measured vs Healthy Range',
  healthyRange: 'Healthy range',
  markerNote: 'The marker position reflects the status category, not an exact percentile.',
  roadmap: '30-Day Improvement Roadmap',
  done: 'done',
  nextSteps: 'Immediate Next Steps',
  noActions: 'No action items were generated.',
  questions: 'Questions to Ask Your Doctor',
  noQuestions: 'No questions were generated.',
  billingReview: 'Billing Review',
  disclaimer:
    'ClearShield provides general information only and is not a substitute for professional medical advice, diagnosis, or treatment. In an emergency, contact your local emergency services.',
  footer: '© 2026 ClearShield. Hackathon prototype for patient navigation. Not a medical device.',
  good: 'Good',
  attention: 'Needs attention',
  priorityCare: 'Priority care',
  low: 'Low',
  medium: 'Medium',
  moderate: 'Moderate',
  high: 'High',
  // Clinic finder
  clinicTitle: 'Find Nearby Clinics & Affordable Care',
  clinicSub: 'Illustrative map. Pins show care types, not real locations. The button opens live results in Google Maps.',
  you: 'You',
  openMaps: 'Open live results in Maps',
  clinicGovtL: 'Government hospital / OPD',
  clinicGovtN: 'Usually the lowest consultation cost; expect longer waits. Check if your insurance scheme is accepted.',
  clinicFamL: 'Community / family clinic',
  clinicFamN: 'Good first stop for BP and sugar checks. Ask for the consultation fee before booking.',
  clinicLabL: 'Diagnostic lab',
  clinicLabN: 'Compare package prices for HbA1c, lipid and kidney panels across two or three labs.',
  clinicPharmL: 'Generic medicine store',
  clinicPharmN: 'Ask your doctor whether a generic version of any prescribed medicine is suitable.',
  // Dials
  dialsTitle: 'Analytics Dials',
  viewRisk: 'Risk',
  viewWellness: 'Wellness',
  dialInRange: 'Biomarkers in range',
  dialRoadmap: 'Roadmap progress',
  dialFlaggedLines: 'Lines flagged',
  dialFlaggedShare: 'Flagged share of bill',
  dialTap: 'Tap a dial for details',
  detailRisk: 'Estimated risk: {v}/100. Higher means more risk.',
  detailWell: 'Wellness score: {v}/100. Higher is better.',
  detailRange: '{a} of {b} listed biomarkers are within the healthy range.',
  detailRoadmap: '{a} of {b} roadmap tasks completed.',
  detailLines: '{a} of {b} charge lines were flagged by the screening rules.',
  detailShare: '{a}% of billed charges sit in flagged lines.',
  // Trend
  trendTitle: 'Health Trend Tracker',
  trendSub: 'Saved only in this browser (localStorage). Run more reports to build your history.',
  seriesIndex: 'Health Index',
  trendEmpty: 'Run at least two reports to see a trend, or preview with sample history.',
  previewSample: 'Preview with sample history',
  clearHistory: 'Clear history',
  sampleTag: 'Sample',
  latest: 'Latest',
  vsPrev: 'vs previous',
  improved: 'Improved',
  worsened: 'Worsened',
  unchanged: 'Unchanged',
  compareTitle: 'Biomarker comparison (latest vs previous)',
  markerCol: 'Marker',
  previous: 'Previous',
  current: 'Current',
  trendNote: 'For the risk series, lower is better.',
  reportsCount: 'reports',
  // Share
  shareTitle: 'Health Summary',
  shareSample: '(Sample data for demonstration)',
  shareIndex: 'Health Index',
  shareFlagged: 'Flagged values',
  shareNext: 'Next steps',
  shareDisc: 'Informational only, not medical advice.',
  // Validator
  valTitle: 'CPT & ICD-10 Code Validator',
  valSub: 'Rules-based screening for suspicious or unbundled codes. This is not a certified coding audit.',
  valClean: 'No issues flagged by the screening rules.',
  valLines: 'Line items read',
  valFlagged: 'Flagged',
  valDisputable: 'Potentially disputable',
  valCodes: 'Codes found',
  valIcd: 'ICD-10 codes',
  valValid: 'Valid format',
  valInvalid: 'Invalid format',
  valNoLines: 'No line items could be read from this bill.',
  valNoCodes: 'No CPT/HCPCS codes found.',
  colItem: 'Item',
  colCode: 'Code',
  colRef: 'Reference description',
  colAmt: 'Amount',
  valUnknown: 'Not in reference list',
  sevHigh: 'High',
  sevMed: 'Review',
  sevInfo: 'Info',
  // Calculator
  calcTitle: 'Insurance Coverage & Out-of-Pocket Calculator',
  calcSub: 'Estimate only. Defaults are assumptions: edit them to match your plan.',
  billed: 'Billed charges',
  adjust: 'Insurer / network adjustment',
  deductible: 'Remaining deductible',
  coins: 'Co-insurance (your share)',
  oopMax: 'Out-of-pocket max remaining',
  allowed: 'Allowed amount',
  youPayDed: 'You pay: deductible',
  youPayCoins: 'You pay: co-insurance',
  insurerPays: 'Insurer pays',
  youOwe: 'Estimated you owe',
  statementSays: 'Statement says you owe',
  surprise: 'Possible surprise surcharges',
  excludeFlagged: 'Exclude flagged charges (if disputed successfully)',
  savings: 'Potential savings',
  yourShare: 'Your share',
  mismatchNote:
    'The statement amount is higher than this estimate. Ask your insurer for the EOB to confirm how the claim was processed.',
  // Letter
  letterTitle: 'One-Click Dispute Letter',
  letterSub: 'Drafts a formal letter that lists the flagged charges. Edit it freely before sending.',
  patientName: 'Your name',
  acctNo: 'Account / claim no.',
  dos: 'Date(s) of service',
  recipient: 'Hospital / insurer name',
  typeHospital: 'Billing dispute (to hospital)',
  typeInsurer: 'Insurance appeal (to insurer)',
  generate: 'Generate letter',
  regenerate: 'Regenerate',
  copyLetter: 'Copy letter',
  downloadLetter: 'Download .txt',
  letterNote:
    'Template for personal use, not legal advice. Review and fill in the [brackets] before sending. The letter is written in English.',
};

const HI: Record<keyof typeof EN, string> = {
  privacy: 'गोपनीयता-प्रथम डिज़ाइन',
  encrypted: 'ट्रांज़िट में एन्क्रिप्टेड (HTTPS)',
  powered: 'Google Gemini द्वारा संचालित',
  tagline: 'स्वास्थ्य मार्गदर्शन व बिल ऑडिटर',
  sysOp: 'सिस्टम चालू है',
  heroBadge: 'स्वास्थ्य रिकॉर्ड और अस्पताल बिल की AI-सहायता से स्पष्ट समझ',
  heroA: 'अपनी जटिल स्वास्थ्य रिपोर्ट और बिल',
  heroB: 'तुरंत समझें।',
  heroSub: 'हेल्थ इंडेक्स, जोखिम मीटर, 30-दिन का रोडमैप और बिल ऑडिट, सरल भाषा में।',
  tabReport: 'क्लिनिकल लैब रिपोर्ट विश्लेषक',
  tabBilling: 'अस्पताल बिल व बीमा ऑडिटर',
  pasteReport: 'लैब रिपोर्ट, पैथोलॉजी या डॉक्टर के नोट्स यहाँ पेस्ट करें:',
  pasteBill: 'अस्पताल का आइटमवार बिल या बीमा EOB यहाँ पेस्ट करें:',
  loadSample: 'नमूना टेक्स्ट लोड करें',
  instantDemo: 'तुरंत डेमो',
  phReport: 'जैसे: Blood Pressure: 145/92 mmHg, Fasting Glucose: 118 mg/dL, Total Cholesterol: 210 mg/dL...',
  phBill: 'जैसे: Facility Charge Room 402: $4,500, Unbundled Lab Fee: $850, Physician Consultation: $600...',
  uploadTitle: 'PDF, इमेज या टेक्स्ट फ़ाइल अपलोड करें',
  uploadSub: 'PDF, PNG/JPG या TXT · 10 MB तक',
  browse: 'चुनें',
  analyze: 'विश्लेषण करें और डैशबोर्ड बनाएँ',
  errEmpty: 'कृपया पहले क्लिनिकल टेक्स्ट पेस्ट करें, दस्तावेज़ अपलोड करें या डेमो नमूना लोड करें।',
  errSize: 'फ़ाइल 10 MB से बड़ी है। कृपया छोटी फ़ाइल अपलोड करें या टेक्स्ट पेस्ट करें।',
  errClip: 'इस ब्राउज़र में क्लिपबोर्ड उपलब्ध नहीं है।',
  step1: 'दस्तावेज़ पढ़ा जा रहा है…',
  step2: 'मान और बिल की मदें निकाली जा रही हैं…',
  step3: 'सामान्य सीमाओं से तुलना हो रही है…',
  step4: 'हेल्थ इंडेक्स निकाला जा रहा है…',
  step5: '30-दिन का रोडमैप बन रहा है…',
  dashTitle: 'स्वास्थ्य निगरानी डैशबोर्ड',
  clinicalReport: 'क्लिनिकल रिपोर्ट',
  billingAudit: 'बिल ऑडिट',
  whatsapp: 'WhatsApp पर साझा करें',
  copy: 'सारांश कॉपी करें',
  copied: 'कॉपी हो गया',
  print: 'प्रिंट / PDF सहेजें',
  fhir: 'FHIR रिकॉर्ड एक्सपोर्ट',
  newAnalysis: 'नया विश्लेषण',
  demoStrong: 'डेमो नमूना।',
  demoRest: 'यह डैशबोर्ड नमूना डेटा दिखाता है, आपके दिए गए इनपुट को नहीं।',
  aiTranslated: 'हिन्दी पाठ AI द्वारा बनाया गया है। कृपया अपने डॉक्टर से पुष्टि करें।',
  hindiMissing: 'इस परिणाम का हिन्दी संस्करण उपलब्ध नहीं है, इसलिए अंग्रेज़ी दिखाई जा रही है।',
  overallIndex: 'कुल हेल्थ इंडेक्स',
  indexOf: '/ 100 हेल्थ इंडेक्स',
  flagged: 'चिह्नित',
  aiConf: 'AI विश्वास',
  indexNote: 'यह इंडेक्स दिए गए डेटा पर आधारित AI अनुमान है, चिकित्सकीय निदान नहीं।',
  urgency: 'क्लिनिकल तात्कालिकता',
  priority: 'प्राथमिकता',
  riskBreakdown: 'जोखिम विवरण',
  cardio: 'हृदय संबंधी',
  metabolic: 'मेटाबॉलिक',
  lifestyle: 'जीवनशैली',
  plain: 'सरल भाषा में सार',
  biomarkers: 'बायोमार्कर: मापा गया बनाम स्वस्थ सीमा',
  healthyRange: 'स्वस्थ सीमा',
  markerNote: 'मार्कर की स्थिति श्रेणी दर्शाती है, सटीक प्रतिशत नहीं।',
  roadmap: '30-दिन सुधार रोडमैप',
  done: 'पूर्ण',
  nextSteps: 'तुरंत अगले कदम',
  noActions: 'कोई कदम नहीं बनाया गया।',
  questions: 'डॉक्टर से पूछने के सवाल',
  noQuestions: 'कोई सवाल नहीं बनाया गया।',
  billingReview: 'बिल समीक्षा',
  disclaimer:
    'ClearShield केवल सामान्य जानकारी देता है; यह पेशेवर चिकित्सा सलाह, निदान या उपचार का विकल्प नहीं है। आपात स्थिति में अपनी स्थानीय आपातकालीन सेवा से संपर्क करें।',
  footer: '© 2026 ClearShield. रोगी मार्गदर्शन के लिए हैकाथॉन प्रोटोटाइप। यह चिकित्सा उपकरण नहीं है।',
  good: 'अच्छा',
  attention: 'ध्यान देने योग्य',
  priorityCare: 'प्राथमिकता से देखभाल',
  low: 'कम',
  medium: 'मध्यम',
  moderate: 'मध्यम',
  high: 'उच्च',
  clinicTitle: 'आस-पास के क्लिनिक और किफ़ायती इलाज खोजें',
  clinicSub: 'यह केवल चित्रात्मक नक्शा है। पिन देखभाल के प्रकार दिखाते हैं, असली स्थान नहीं। बटन Google Maps में असली परिणाम खोलता है।',
  you: 'आप',
  openMaps: 'Maps में लाइव परिणाम खोलें',
  clinicGovtL: 'सरकारी अस्पताल / OPD',
  clinicGovtN: 'आम तौर पर परामर्श शुल्क सबसे कम होता है; प्रतीक्षा अधिक हो सकती है। जाँचें कि आपकी बीमा योजना मान्य है या नहीं।',
  clinicFamL: 'सामुदायिक / फ़ैमिली क्लिनिक',
  clinicFamN: 'बीपी और शुगर की जाँच के लिए अच्छी पहली जगह। बुक करने से पहले परामर्श शुल्क पूछ लें।',
  clinicLabL: 'डायग्नोस्टिक लैब',
  clinicLabN: 'HbA1c, लिपिड और किडनी पैनल की कीमतें दो-तीन लैब में तुलना करें।',
  clinicPharmL: 'जेनेरिक दवा स्टोर',
  clinicPharmN: 'डॉक्टर से पूछें कि लिखी गई दवा का जेनेरिक विकल्प उपयुक्त है या नहीं।',
  dialsTitle: 'विश्लेषण डायल',
  viewRisk: 'जोखिम',
  viewWellness: 'स्वास्थ्य',
  dialInRange: 'सामान्य सीमा में मार्कर',
  dialRoadmap: 'रोडमैप प्रगति',
  dialFlaggedLines: 'चिह्नित मदें',
  dialFlaggedShare: 'बिल का चिह्नित हिस्सा',
  dialTap: 'विवरण देखने के लिए डायल पर टैप करें',
  detailRisk: 'अनुमानित जोखिम: {v}/100। जितना अधिक, उतना ज़्यादा जोखिम।',
  detailWell: 'स्वास्थ्य स्कोर: {v}/100। जितना अधिक, उतना बेहतर।',
  detailRange: 'सूचीबद्ध {b} बायोमार्कर में से {a} स्वस्थ सीमा में हैं।',
  detailRoadmap: '{b} में से {a} रोडमैप कार्य पूरे हुए।',
  detailLines: '{b} बिल मदों में से {a} स्क्रीनिंग नियमों से चिह्नित हुईं।',
  detailShare: 'बिल की {a}% राशि चिह्नित मदों में है।',
  trendTitle: 'स्वास्थ्य ट्रेंड ट्रैकर',
  trendSub: 'केवल इसी ब्राउज़र (localStorage) में सहेजा जाता है। इतिहास बनाने के लिए और रिपोर्ट चलाएँ।',
  seriesIndex: 'हेल्थ इंडेक्स',
  trendEmpty: 'ट्रेंड देखने के लिए कम से कम दो रिपोर्ट चलाएँ, या नमूना इतिहास का पूर्वावलोकन करें।',
  previewSample: 'नमूना इतिहास देखें',
  clearHistory: 'इतिहास मिटाएँ',
  sampleTag: 'नमूना',
  latest: 'ताज़ा',
  vsPrev: 'पिछली बार से',
  improved: 'सुधार',
  worsened: 'बिगड़ा',
  unchanged: 'अपरिवर्तित',
  compareTitle: 'बायोमार्कर तुलना (ताज़ा बनाम पिछला)',
  markerCol: 'मार्कर',
  previous: 'पिछला',
  current: 'वर्तमान',
  trendNote: 'जोखिम श्रृंखलाओं में कम मान बेहतर है।',
  reportsCount: 'रिपोर्ट',
  shareTitle: 'स्वास्थ्य सारांश',
  shareSample: '(प्रदर्शन के लिए नमूना डेटा)',
  shareIndex: 'हेल्थ इंडेक्स',
  shareFlagged: 'चिह्नित मान',
  shareNext: 'अगले कदम',
  shareDisc: 'केवल जानकारी के लिए, चिकित्सा सलाह नहीं।',
  valTitle: 'CPT व ICD-10 कोड वैलिडेटर',
  valSub: 'संदिग्ध या अनबंडल कोड के लिए नियम-आधारित जाँच। यह प्रमाणित कोडिंग ऑडिट नहीं है।',
  valClean: 'स्क्रीनिंग नियमों से कोई समस्या चिह्नित नहीं हुई।',
  valLines: 'पढ़ी गई मदें',
  valFlagged: 'चिह्नित',
  valDisputable: 'संभावित विवादित राशि',
  valCodes: 'मिले हुए कोड',
  valIcd: 'ICD-10 कोड',
  valValid: 'सही प्रारूप',
  valInvalid: 'अमान्य प्रारूप',
  valNoLines: 'इस बिल से कोई मद नहीं पढ़ी जा सकी।',
  valNoCodes: 'कोई CPT/HCPCS कोड नहीं मिला।',
  colItem: 'मद',
  colCode: 'कोड',
  colRef: 'संदर्भ विवरण',
  colAmt: 'राशि',
  valUnknown: 'संदर्भ सूची में नहीं',
  sevHigh: 'उच्च',
  sevMed: 'समीक्षा',
  sevInfo: 'जानकारी',
  calcTitle: 'बीमा कवरेज व जेब से खर्च कैलकुलेटर',
  calcSub: 'यह केवल अनुमान है। डिफ़ॉल्ट मान मान्यताएँ हैं: अपनी योजना के अनुसार बदलें।',
  billed: 'बिल की गई राशि',
  adjust: 'बीमा / नेटवर्क समायोजन',
  deductible: 'शेष डिडक्टिबल',
  coins: 'को-इंश्योरेंस (आपका हिस्सा)',
  oopMax: 'शेष अधिकतम जेब खर्च',
  allowed: 'स्वीकृत राशि',
  youPayDed: 'आप देंगे: डिडक्टिबल',
  youPayCoins: 'आप देंगे: को-इंश्योरेंस',
  insurerPays: 'बीमा कंपनी देगी',
  youOwe: 'अनुमानित देय राशि',
  statementSays: 'बिल के अनुसार देय',
  surprise: 'संभावित अनपेक्षित सरचार्ज',
  excludeFlagged: 'चिह्नित शुल्क हटाकर देखें (आपत्ति सफल होने पर)',
  savings: 'संभावित बचत',
  yourShare: 'आपका हिस्सा',
  mismatchNote: 'बिल की राशि इस अनुमान से अधिक है। दावा कैसे प्रोसेस हुआ, यह जानने के लिए बीमा कंपनी से EOB माँगें।',
  letterTitle: 'एक-क्लिक विवाद पत्र',
  letterSub: 'चिह्नित शुल्कों की सूची के साथ औपचारिक पत्र बनाता है। भेजने से पहले इसे बदल सकते हैं।',
  patientName: 'आपका नाम',
  acctNo: 'खाता / दावा संख्या',
  dos: 'सेवा की तारीख़(ें)',
  recipient: 'अस्पताल / बीमा कंपनी का नाम',
  typeHospital: 'बिलिंग विवाद (अस्पताल को)',
  typeInsurer: 'बीमा अपील (बीमा कंपनी को)',
  generate: 'पत्र बनाएँ',
  regenerate: 'फिर से बनाएँ',
  copyLetter: 'पत्र कॉपी करें',
  downloadLetter: '.txt डाउनलोड करें',
  letterNote: 'यह निजी उपयोग का टेम्पलेट है, कानूनी सलाह नहीं। भेजने से पहले जाँचें और [कोष्ठक] भरें। पत्र अंग्रेज़ी में है ताकि सीधे भेजा जा सके।',
};

type K = keyof typeof EN;
const tx = (lang: Lang, k: K): string => (lang === 'hi' ? HI : EN)[k];
const fmt = (s: string, vars: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ''));

const STATUS_HI: [RegExp, string][] = [
  [/borderline/i, 'सीमा रेखा पर'],
  [/stage 2/i, 'स्टेज 2 सीमा'],
  [/critical/i, 'गंभीर'],
  [/elevated/i, 'बढ़ा हुआ'],
  [/normal/i, 'सामान्य'],
  [/low/i, 'कम'],
  [/high/i, 'उच्च'],
];
const NAME_HI: [RegExp, string][] = [
  [/blood pressure/i, 'रक्तचाप'],
  [/fasting glucose|glucose/i, 'फास्टिंग ग्लूकोज़'],
  [/ldl/i, 'एलडीएल कोलेस्ट्रॉल'],
  [/hdl/i, 'एचडीएल कोलेस्ट्रॉल'],
  [/total cholesterol|cholesterol/i, 'कुल कोलेस्ट्रॉल'],
  [/creatinine/i, 'क्रिएटिनिन'],
  [/triglycerid/i, 'ट्राइग्लिसराइड्स'],
];
const statusL = (s: string, lang: Lang) => (lang === 'hi' ? STATUS_HI.find(([re]) => re.test(s))?.[1] ?? s : s);
const nameL = (s: string, lang: Lang) => (lang === 'hi' ? NAME_HI.find(([re]) => re.test(s))?.[1] ?? s : s);

/* -------------------------------------------------------------------------- */
/*  Billing engine: parser, code validator, calculator                         */
/* -------------------------------------------------------------------------- */

const TOTAL_RE = /total|balance|subtotal|amount due/i;
const OWED_RE = /patient responsibility|amount due|you owe|balance due|patient balance/i;
const ADJ_RE = /adjustment|discount|insurance paid|insurer paid|write-?off/i;
const ICD_RE = /^[A-TV-Z]\d[0-9AB](\.[0-9A-TV-Z]{1,4})?$/;
const SUR_RE = /surcharge|facility fee|convenience fee|processing fee|administrative fee|admin fee|handling fee/i;
const UNB_RE = /unbundl|billed separately|itemi[sz]ed separately|separately billed/i;
const ROOM_RE = /room|\bbed\b|facility charge|ward|\bicu\b/i;

function detectCurrency(t: string): string {
  if (/₹|\bRs\.?|\bINR\b/i.test(t)) return '₹';
  if (t.includes('€')) return '€';
  if (t.includes('£')) return '£';
  return '$';
}

function parseBillText(text: string): BillingData {
  const currency = detectCurrency(text);
  const lines: BillLine[] = [];
  const icd = new Set<string>();
  let adjustments = 0;
  let statementOwed: number | undefined;

  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;

    Array.from(line.matchAll(/ICD-?10(?:-CM)?[:\s#-]*([A-Za-z0-9]{3}(?:\.[A-Za-z0-9]{1,4})?)/gi)).forEach((m) => {
      if (/\d/.test(m[1])) icd.add(m[1].toUpperCase());
    });
    Array.from(line.matchAll(/\b(?:dx|diagnosis)\b[^A-Za-z0-9]*([A-Z]\d{2}(?:\.\d{1,4})?)/gi)).forEach((m) =>
      icd.add(m[1].toUpperCase()),
    );

    const m =
      line.match(/^(.*?)[:\s]\s*(-)?\s*(?:[$₹€£]|Rs\.?\s*|INR\s*)\s*(-)?\s*([\d,]+(?:\.\d{1,2})?)\s*$/i) ||
      line.match(/^(.*?):\s*(-)?\s*()([\d,]+(?:\.\d{1,2})?)\s*$/);
    if (!m) continue;

    const desc = m[1].replace(/[:\-–\s]+$/, '').trim();
    const neg = !!(m[2] || m[3]);
    const amount = parseFloat(m[4].replace(/,/g, ''));
    if (!desc || !Number.isFinite(amount)) continue;

    if (OWED_RE.test(desc)) {
      statementOwed = amount;
      continue;
    }
    if (neg || ADJ_RE.test(desc)) {
      adjustments += amount;
      continue;
    }
    if (TOTAL_RE.test(desc)) continue;

    const codeMatch = desc.match(/\b(\d{5})\b/) || (/CPT|HCPCS/i.test(desc) ? desc.match(/\b([A-V]\d{4})\b/) : null);
    lines.push({ description: desc, code: codeMatch?.[1], amount });
  }
  return { lines, icdCodes: Array.from(icd), currency, adjustments, statementOwed };
}

const CPT_REF: Record<string, string> = {
  '99202': 'New patient office visit, straightforward',
  '99203': 'New patient office visit, low complexity',
  '99204': 'New patient office visit, moderate complexity',
  '99205': 'New patient office visit, high complexity',
  '99211': 'Established patient visit, minimal',
  '99212': 'Established patient visit, straightforward',
  '99213': 'Established patient visit, low complexity',
  '99214': 'Established patient visit, moderate complexity',
  '99215': 'Established patient visit, high complexity',
  '99283': 'Emergency department visit, moderate',
  '85025': 'Complete blood count (CBC) with automated differential',
  '85027': 'Complete blood count (CBC), automated',
  '80048': 'Basic metabolic panel',
  '80053': 'Comprehensive metabolic panel',
  '80061': 'Lipid panel',
  '83036': 'Hemoglobin A1c',
  '82947': 'Glucose, quantitative',
  '82565': 'Creatinine, blood',
  '82465': 'Cholesterol, total',
  '83718': 'HDL cholesterol',
  '84478': 'Triglycerides',
  '36415': 'Venipuncture (blood draw)',
  '93000': 'ECG, with interpretation and report',
  '93005': 'ECG, tracing only',
  '93010': 'ECG, interpretation and report only',
  '71046': 'Chest X-ray, 2 views',
};

const ICD_REF: Record<string, string> = {
  I10: 'Essential (primary) hypertension',
  'E11.9': 'Type 2 diabetes mellitus without complications',
  'E78.5': 'Hyperlipidemia, unspecified',
  'R73.03': 'Prediabetes',
  'R03.0': 'Elevated blood-pressure reading, without diagnosis of hypertension',
  'Z00.00': 'General adult medical examination without abnormal findings',
};

// [bundle code, component code]: the component is normally included in the bundle.
const OVERLAPS: [string, string][] = [
  ['80053', '80048'],
  ['80053', '82565'],
  ['80053', '82947'],
  ['80048', '82565'],
  ['80048', '82947'],
  ['80061', '82465'],
  ['80061', '83718'],
  ['80061', '84478'],
  ['93000', '93005'],
  ['93000', '93010'],
  ['85025', '85027'],
];
const HIGH_EM = ['99214', '99215', '99205', '99285'];

interface Finding {
  id: string;
  sev: 'high' | 'medium' | 'info';
  title: Record<Lang, string>;
  detail: Record<Lang, string>;
  amount: number;
  lineIdx: number[];
  surcharge?: boolean;
}

interface AuditResult {
  findings: Finding[];
  disputable: number;
  surcharge: number;
  flaggedLines: number;
  codes: { idx: number; code: string; ref?: string }[];
  icd: { code: string; valid: boolean; ref?: string }[];
}

const bi = (en: string, hi: string): Record<Lang, string> => ({ en, hi });

function auditBilling(b: BillingData): AuditResult {
  const findings: Finding[] = [];
  const byCode = new Map<string, number[]>();
  b.lines.forEach((l, i) => {
    if (l.code) byCode.set(l.code, [...(byCode.get(l.code) || []), i]);
  });
  const amt = (idx: number[]) => idx.reduce((s, i) => s + b.lines[i].amount, 0);

  if (b.lines.length === 0) {
    findings.push({
      id: 'noLines',
      sev: 'info',
      title: bi('No line items read', 'कोई मद नहीं पढ़ी गई'),
      detail: bi(
        'Paste an itemized bill (one charge per line, like "Lab fee: $200") or upload a clearer file.',
        'आइटमवार बिल पेस्ट करें (हर पंक्ति में एक शुल्क, जैसे "Lab fee: $200") या साफ़ फ़ाइल अपलोड करें।',
      ),
      amount: 0,
      lineIdx: [],
    });
  }

  byCode.forEach((idxs, code) => {
    if (idxs.length > 1)
      findings.push({
        id: `dup-${code}`,
        sev: 'medium',
        title: bi(`Possible duplicate: ${code}`, `संभावित दोहराव: ${code}`),
        detail: bi(
          `Code ${code} appears ${idxs.length} times. Confirm each was a separate service on a separate date.`,
          `कोड ${code} ${idxs.length} बार आया है। पुष्टि करें कि हर बार अलग तारीख़ की अलग सेवा थी।`,
        ),
        amount: amt(idxs.slice(1)),
        lineIdx: idxs,
      });
  });

  OVERLAPS.forEach(([bundle, comp]) => {
    if (byCode.has(bundle) && byCode.has(comp)) {
      const idx = byCode.get(comp)!;
      findings.push({
        id: `ovl-${bundle}-${comp}`,
        sev: 'medium',
        title: bi(`Possible unbundling: ${comp} with ${bundle}`, `संभावित अनबंडलिंग: ${bundle} के साथ ${comp}`),
        detail: bi(
          `${comp} (${CPT_REF[comp]}) is normally included in ${bundle} (${CPT_REF[bundle]}). Billing both may be unbundling.`,
          `${comp} (${CPT_REF[comp]}) आमतौर पर ${bundle} (${CPT_REF[bundle]}) में शामिल होता है। दोनों का बिल बनाना अनबंडलिंग हो सकता है।`,
        ),
        amount: amt(idx),
        lineIdx: idx,
      });
    }
  });

  const emCodes = Array.from(byCode.keys()).filter((c) => /^992(0[2-5]|1[1-5])$/.test(c)).sort();
  if (emCodes.length > 1) {
    const lower = emCodes.slice(0, -1).flatMap((c) => byCode.get(c)!);
    findings.push({
      id: 'multi-em',
      sev: 'medium',
      title: bi('Multiple visit-level codes', 'एक से अधिक विज़िट-स्तर कोड'),
      detail: bi(
        `Codes ${emCodes.join(', ')} are all office-visit levels. Normally one is billed per visit.`,
        `कोड ${emCodes.join(', ')} सभी ऑफ़िस-विज़िट स्तर हैं। आमतौर पर एक विज़िट पर एक ही बिल होता है।`,
      ),
      amount: amt(lower),
      lineIdx: lower,
    });
  }

  HIGH_EM.forEach((c) => {
    if (byCode.has(c))
      findings.push({
        id: `hi-${c}`,
        sev: 'info',
        title: bi(`Higher-level visit code: ${c}`, `उच्च-स्तरीय विज़िट कोड: ${c}`),
        detail: bi(
          `${c} (${CPT_REF[c] || 'higher-complexity visit'}) should be supported by the visit notes. Ask your doctor's office to confirm the level.`,
          `${c} (${CPT_REF[c] || 'अधिक जटिल विज़िट'}) विज़िट नोट्स से समर्थित होना चाहिए। डॉक्टर के कार्यालय से स्तर की पुष्टि करें।`,
        ),
        amount: 0,
        lineIdx: byCode.get(c)!,
      });
  });

  b.lines.forEach((l, i) => {
    const isSur = SUR_RE.test(l.description);
    if (isSur)
      findings.push({
        id: `sur-${i}`,
        sev: 'medium',
        surcharge: true,
        title: bi('Surcharge or extra fee', 'सरचार्ज या अतिरिक्त शुल्क'),
        detail: bi(
          'Fees like this are often not tied to a specific service. Ask what it covers and whether your plan allows it.',
          'ऐसे शुल्क अक्सर किसी विशेष सेवा से जुड़े नहीं होते। पूछें कि यह किसके लिए है और क्या आपकी योजना इसकी अनुमति देती है।',
        ),
        amount: l.amount,
        lineIdx: [i],
      });
    if (UNB_RE.test(l.description))
      findings.push({
        id: `unb-${i}`,
        sev: 'medium',
        title: bi('Tests billed separately', 'जाँचें अलग-अलग बिल की गईं'),
        detail: bi(
          'The description suggests tests were charged individually. Ask whether a bundled panel rate applies.',
          'विवरण से लगता है कि जाँचें अलग-अलग जोड़ी गईं। पूछें कि क्या पैनल दर लागू होती है।',
        ),
        amount: l.amount,
        lineIdx: [i],
      });
    if (!isSur && !l.code && ROOM_RE.test(l.description))
      findings.push({
        id: `room-${i}`,
        sev: 'info',
        title: bi('Charge without a code', 'बिना कोड वाला शुल्क'),
        detail: bi(
          'No procedure or revenue code is shown. Request an itemized bill with codes and daily rates.',
          'कोई प्रोसीजर या रेवेन्यू कोड नहीं दिखता। कोड और दैनिक दरों सहित आइटमवार बिल माँगें।',
        ),
        amount: 0,
        lineIdx: [i],
      });
  });

  if (b.lines.length > 0 && byCode.size === 0)
    findings.push({
      id: 'noCodes',
      sev: 'info',
      title: bi('No CPT/HCPCS codes found', 'कोई CPT/HCPCS कोड नहीं मिला'),
      detail: bi(
        'Without codes the charges cannot be checked for unbundling. Ask for an itemized bill with codes.',
        'कोड के बिना अनबंडलिंग की जाँच नहीं हो सकती। कोड सहित आइटमवार बिल माँगें।',
      ),
      amount: 0,
      lineIdx: [],
    });

  const icd = b.icdCodes.map((code) => ({ code, valid: ICD_RE.test(code), ref: ICD_REF[code] }));
  icd.filter((c) => !c.valid).forEach((c) =>
    findings.push({
      id: `icd-${c.code}`,
      sev: 'medium',
      title: bi(`Invalid ICD-10 format: ${c.code}`, `अमान्य ICD-10 प्रारूप: ${c.code}`),
      detail: bi(
        'ICD-10-CM codes start with a letter, then two characters, with an optional decimal part (for example I10 or E11.9).',
        'ICD-10-CM कोड एक अक्षर से शुरू होते हैं, फिर दो अक्षर/अंक, और वैकल्पिक दशमलव भाग (जैसे I10 या E11.9)।',
      ),
      amount: 0,
      lineIdx: [],
    }),
  );

  const order = { high: 0, medium: 1, info: 2 } as const;
  findings.sort((a, c) => order[a.sev] - order[c.sev]);

  const flagged = new Set<number>();
  const sur = new Set<number>();
  findings.forEach((f) => {
    if (f.sev === 'info') return;
    f.lineIdx.forEach((i) => flagged.add(i));
    if (f.surcharge) f.lineIdx.forEach((i) => sur.add(i));
  });
  // Disputable amount counts each flagged line once; duplicate/overlap findings only count their own amounts.
  let disputable = 0;
  const counted = new Set<number>();
  findings.forEach((f) => {
    if (f.sev === 'info') return;
    const idxs = f.lineIdx.filter((i) => !counted.has(i));
    if (f.id.startsWith('dup-') || f.id === 'multi-em' || f.id.startsWith('ovl-')) {
      disputable += f.amount;
      f.lineIdx.forEach((i) => counted.add(i));
    } else {
      idxs.forEach((i) => {
        disputable += b.lines[i].amount;
        counted.add(i);
      });
    }
  });

  return {
    findings,
    disputable: Math.min(disputable, b.lines.reduce((s, l) => s + l.amount, 0)),
    surcharge: Array.from(sur).reduce((s, i) => s + b.lines[i].amount, 0),
    flaggedLines: flagged.size,
    codes: b.lines.map((l, idx) => ({ idx, code: l.code || '', ref: l.code ? CPT_REF[l.code] : undefined })).filter((c) => c.code),
    icd,
  };
}

function calcOop(billed: number, adjustment: number, deductible: number, coinsPct: number, oopMax: number) {
  const allowed = Math.max(0, billed - Math.max(0, adjustment));
  const ded = Math.min(Math.max(0, deductible), allowed);
  const coins = (allowed - ded) * (Math.min(100, Math.max(0, coinsPct)) / 100);
  const you = Math.min(ded + coins, Math.max(0, oopMax));
  const dedPaid = Math.min(ded, you);
  return { allowed, ded: dedPaid, coins: you - dedPaid, you, insurer: allowed - you };
}

const money = (n: number, cur: string) =>
  `${n < 0 ? '-' : ''}${cur}${Math.abs(n).toLocaleString(cur === '₹' ? 'en-IN' : 'en-US', { maximumFractionDigits: 2 })}`;
function analyzeReportLocally(text: string): Analysis {
  const markers: Biomarker[] = [];
  const bpMatch = text.match(/(\d{2,3})\s*\/\s*(\d{2,3})/);
  if (bpMatch) {
    const sys = parseInt(bpMatch[1], 10);
    markers.push({ name: 'Blood Pressure', value: `${bpMatch[1]}/${bpMatch[2]} mmHg`, status: sys >= 140 ? 'Stage 2 Range' : sys >= 130 ? 'Stage 1 Range' : 'Normal', norm: '<120/80 mmHg' });
  }
  const gluMatch = text.match(/glucose[:\s]+(\d+)/i) || text.match(/sugar[:\s]+(\d+)/i);
  if (gluMatch) {
    const val = parseInt(gluMatch[1], 10);
    markers.push({ name: 'Fasting Glucose', value: `${val} mg/dL`, status: val >= 126 ? 'High' : 'Normal', norm: '70-99 mg/dL' });
  }
  if (markers.length === 0) {
     markers.push({ name: 'Blood Pressure', value: '132/86 mmHg', status: 'Elevated', norm: '<120/80 mmHg' });
  }
  
  const isHigh = markers.some((m) => m.status !== 'Normal');
  return {
    plainEnglishSummary: 'Your document was parsed locally. The analysis highlights key biomarker readings based on the text provided.',
    riskLevel: isHigh ? 'Medium' : 'Low',
    riskReason: isHigh ? 'Some biomarker values are outside optimal ranges.' : 'All markers are healthy.',
    confidenceScore: 'Local Extraction',
    healthScore: isHigh ? 62 : 84,
    riskBreakdown: { cardiovascular: isHigh ? 65 : 25, metabolic: isHigh ? 58 : 20, lifestyle: 45 },
    actionItems: ['Review these findings with your doctor.', 'Maintain a daily log.'],
    doctorQuestions: ['Do these biomarker levels require medical intervention?'],
    billingDiscrepancies: '',
    biomarkersFlagged: markers,
    roadmap: [{ period: 'Days 1-7', title: 'Baseline Review', tasks: ['Consult your physician'] }],
  };
}

function analyzeBillLocally(text: string): Analysis {
  const billing = parseBillText(text);
  const audit = auditBilling(billing);
  const totalBilled = billing.lines.reduce((s, l) => s + l.amount, 0);
  const fairnessScore = Math.max(30, Math.min(95, Math.round(100 - (audit.disputable / (totalBilled || 1)) * 50)));

  return {
    plainEnglishSummary: `This bill totals ${money(totalBilled, billing.currency)}. Screening rules flagged ${audit.flaggedLines} discrepancies.`,
    riskLevel: audit.disputable > 1000 ? 'High' : audit.disputable > 0 ? 'Medium' : 'Low',
    riskReason: audit.disputable > 0 ? 'Detected potential unbundled tests or surcharges.' : 'No major discrepancies.',
    confidenceScore: 'Local Rules Engine',
    healthScore: fairnessScore,
    riskBreakdown: { cardiovascular: 15, metabolic: 15, lifestyle: 10 },
    actionItems: ['Request an itemized statement with codes.', 'Use the one-click dispute letter.'],
    doctorQuestions: ['Why were specific lab tests billed individually?'],
    billingDiscrepancies: audit.findings.map((f) => f.title.en).join('; '),
    biomarkersFlagged: [],
    roadmap: [{ period: 'Days 1-7', title: 'Document Collection', tasks: ['Obtain itemized bill'] }],
    billing,
  };
}
/* -------------------------------------------------------------------------- */
/*  Sample data                                                                */
/* -------------------------------------------------------------------------- */

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
Patient Responsibility: $5,200
Diagnosis (ICD-10 I10): Essential hypertension`;

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
    { period: 'Days 1-7', title: 'Get a clinical baseline', tasks: ['See your doctor about BP and glucose', 'Start a daily BP log (morning and evening)', 'Ask about an HbA1c test'] },
    { period: 'Days 8-14', title: 'Fix the food basics', tasks: ['Cut added salt and packaged snacks', 'Swap sugary drinks for water', 'Add a vegetable to every main meal'] },
    { period: 'Days 15-21', title: 'Build movement habit', tasks: ['Walk 30 minutes, 5 days a week', 'Break up long sitting every hour', 'Aim for 7 hours of sleep'] },
    { period: 'Days 22-30', title: 'Review and adjust', tasks: ['Compare your BP log with day 1', 'Share the log with your doctor', 'Plan repeat tests as advised'] },
  ],
  hi: {
    plainEnglishSummary:
      'इस नमूने में रक्तचाप और फास्टिंग ब्लड शुगर सामान्य स्वस्थ सीमा से ऊपर है, और कोलेस्ट्रॉल भी सीमा रेखा के थोड़ा ऊपर है। ये रीडिंग मिलकर जल्द ही डॉक्टर से चर्चा करने योग्य हैं, क्योंकि इन्हें अनदेखा करने पर आगे चलकर हृदय रोग और मधुमेह का जोखिम बढ़ सकता है।',
    riskReason: 'स्टेज 2 सीमा का रक्तचाप और बढ़ा हुआ फास्टिंग ग्लूकोज़ मिलकर शीघ्र चिकित्सकीय समीक्षा की ज़रूरत बताते हैं।',
    actionItems: [
      'अगले एक हफ़्ते में अपने डॉक्टर से मिलने का समय लें।',
      'घर पर रोज़ रक्तचाप और, सलाह मिलने पर, ब्लड शुगर की रीडिंग दर्ज करें।',
      'नमक, चीनी और शारीरिक गतिविधि में बदलाव पर डॉक्टर से चर्चा करें।',
    ],
    doctorQuestions: [
      'क्या इन रक्तचाप रीडिंग के लिए दवा चाहिए, या पहले जीवनशैली में बदलाव काफ़ी हैं?',
      'क्या मुझे लंबे समय के शुगर नियंत्रण के लिए HbA1c जाँच करानी चाहिए?',
      'मेरे लिए कौन-सी आगे की जाँचें (किडनी फ़ंक्शन, ECG, लिपिड पैनल) उचित हैं?',
    ],
    billingDiscrepancies: '',
    roadmap: [
      { period: 'दिन 1-7', title: 'बेसलाइन जाँच कराएँ', tasks: ['बीपी और शुगर के लिए डॉक्टर से मिलें', 'रोज़ बीपी लॉग शुरू करें (सुबह और शाम)', 'HbA1c जाँच के बारे में पूछें'] },
      { period: 'दिन 8-14', title: 'खान-पान की बुनियादी बातें सुधारें', tasks: ['अतिरिक्त नमक और पैकेट वाले स्नैक्स घटाएँ', 'मीठे पेय की जगह पानी पिएँ', 'हर मुख्य भोजन में एक सब्ज़ी जोड़ें'] },
      { period: 'दिन 15-21', title: 'चलने-फिरने की आदत बनाएँ', tasks: ['हफ़्ते में 5 दिन 30 मिनट पैदल चलें', 'हर घंटे लंबे समय तक बैठना तोड़ें', '7 घंटे की नींद का लक्ष्य रखें'] },
      { period: 'दिन 22-30', title: 'समीक्षा करें और ढालें', tasks: ['अपने बीपी लॉग की पहले दिन से तुलना करें', 'लॉग डॉक्टर को दिखाएँ', 'सलाह के अनुसार दोबारा जाँच की योजना बनाएँ'] },
    ],
  },
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
  billing: parseBillText(SAMPLE_BILL),
  hi: {
    plainEnglishSummary:
      'इस नमूना बिल में कमरे का शुल्क, लैब शुल्क, परामर्श और एक फ़ैसिलिटी सरचार्ज दिखाया गया है। कुछ मदें सवाल उठाने लायक हैं: लैब जाँचें अलग-अलग बिल की गई लगती हैं, पैनल के रूप में नहीं, और सरचार्ज का कोई कारण नहीं बताया गया।',
    riskReason: 'कोई चिकित्सकीय आपातकाल नहीं है, लेकिन कई शुल्क बढ़ाए हुए या दोहराए गए हो सकते हैं, इसलिए बिल की समीक्षा ज़रूरी है।',
    actionItems: [
      'हर मद के लिए प्रोसीजर कोड के साथ पूरा आइटमवार बिल माँगें।',
      'अपनी बीमा कंपनी से Explanation of Benefits (EOB) माँगें और उसे अस्पताल के बिल से मिलाएँ।',
      'जिस शुल्क का स्पष्ट कारण न हो, उस पर बिलिंग कार्यालय को फ़ोन करके आपत्ति दर्ज करें।',
    ],
    doctorQuestions: [
      'रक्त जाँचें पैनल के बजाय अलग-अलग क्यों बिल की गईं?',
      'फ़ैसिलिटी सरचार्ज किस चीज़ के लिए है, और क्या मेरी योजना इसकी अनुमति देती है?',
      'क्या कमरे का शुल्क मेरे इन-नेटवर्क रेट के अनुसार है?',
    ],
    billingDiscrepancies:
      'संभावित समस्याएँ: (1) $850 का लैब शुल्क अनबंडल हो सकता है; (2) $450 के फ़ैसिलिटी सरचार्ज का कोई ब्योरा नहीं है; (3) परामर्श कोड 99214 को दर्ज की गई विज़िट जटिलता से मिलाकर जाँचें। भुगतान से पहले आइटमवार बिल और EOB माँगें।',
    roadmap: [
      { period: 'दिन 1-7', title: 'दस्तावेज़ इकट्ठा करें', tasks: ['कोड सहित आइटमवार बिल माँगें', 'बीमा कंपनी से EOB लें', 'हर सेवा की तारीख़ नोट करें'] },
      { period: 'दिन 8-14', title: 'अस्पष्ट शुल्क पर आपत्ति करें', tasks: ['बिलिंग कार्यालय को फ़ोन करें; नाम और तारीख़ लिखें', 'चिह्नित मदों पर लिखित आपत्ति भेजें', 'समीक्षा के दौरान भुगतान रोकने का अनुरोध करें'] },
      { period: 'दिन 15-30', title: 'समाधान और पुष्टि', tasks: ['सुधरा हुआ बिल लिखित में लें', 'पुष्टि करें कि बीमा कंपनी ने दावा दोबारा प्रोसेस किया', 'ज़रूरत हो तो किस्तों के बारे में पूछें'] },
    ],
  },
};

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
const asNumber = (v: unknown): number | undefined => {
  const n = typeof v === 'number' ? v : parseFloat(asString(v).replace(/[^0-9.\-]/g, ''));
  return Number.isFinite(n) ? n : undefined;
};

function normalizeRisk(v: unknown): RiskLevel {
  const s = asString(v).toLowerCase();
  if (s.includes('high') || s.includes('critical') || s.includes('urgent')) return 'High';
  if (s.includes('med') || s.includes('moderate')) return 'Medium';
  return 'Low';
}

function normalizeRoadmap(v: unknown): RoadmapStep[] {
  return Array.isArray(v)
    ? v
        .filter((r: any) => r && typeof r === 'object')
        .map((r: any, i: number) => ({
          period: asString(r.period, `Step ${i + 1}`),
          title: asString(r.title, 'Milestone'),
          tasks: asList(r.tasks),
        }))
        .filter((r: RoadmapStep) => r.tasks.length > 0)
    : [];
}

function normalizeBilling(d: Record<string, any>): BillingData | undefined {
  if (!Array.isArray(d.billingLines)) return undefined;
  const lines: BillLine[] = d.billingLines
    .filter((l: any) => l && typeof l === 'object')
    .map((l: any) => ({
      description: asString(l.description, 'Charge'),
      code: asString(l.code) || undefined,
      amount: asNumber(l.amount) ?? NaN,
    }))
    .filter((l: BillLine) => Number.isFinite(l.amount) && l.amount > 0);
  return {
    lines,
    icdCodes: asList(d.icdCodes).map((c) => c.toUpperCase()),
    currency: ['$', '₹', '€', '£'].includes(asString(d.currency)) ? asString(d.currency) : '$',
    adjustments: Math.abs(asNumber(d.adjustments) ?? 0),
    statementOwed: asNumber(d.statementOwed),
  };
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

  let roadmap = normalizeRoadmap(d.roadmap);
  if (roadmap.length === 0 && actionItems.length) {
    roadmap = actionItems.slice(0, 4).map((a, i) => ({
      period: ['Days 1-7', 'Days 8-14', 'Days 15-21', 'Days 22-30'][i],
      title: `Milestone ${i + 1}`,
      tasks: [a],
    }));
  }

  let hi: HiContent | undefined;
  if (d.hi && typeof d.hi === 'object' && asString(d.hi.plainEnglishSummary)) {
    hi = {
      plainEnglishSummary: asString(d.hi.plainEnglishSummary),
      riskReason: asString(d.hi.riskReason),
      actionItems: asList(d.hi.actionItems),
      doctorQuestions: asList(d.hi.doctorQuestions),
      billingDiscrepancies: asString(d.hi.billingDiscrepancies),
      roadmap: normalizeRoadmap(d.hi.roadmap),
    };
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
    hi,
    billing: normalizeBilling(d),
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
  const billingSpec =
    mode === 'billing'
      ? `,
  "billingLines": [{"description":"string","code":"CPT/HCPCS code or empty","amount": number}],
  "icdCodes": ["ICD-10 codes present in the document"],
  "currency": "$" | "₹" | "€" | "£",
  "adjustments": number (total insurer/network adjustments or discounts, positive),
  "statementOwed": number or null (amount the statement says the patient owes)`
      : '';
  return `You are a clinical document and medical-billing explainer for patients. ${focus}
Only use information actually present in the content. Never invent values, charges, codes or diagnoses.
healthScore is a 0-100 wellness index (100 = best) based only on the data provided. riskBreakdown values are 0-100 (100 = highest risk) for cardiovascular, metabolic and lifestyle factors; use a moderate value if the data says little about one.
billingLines must list individual positive charges only (exclude totals, balances and adjustments).
The "hi" object must be a faithful Hindi (Devanagari) translation of the English text fields, in simple everyday words, with the same number of items in the same order. Keep numbers, units and test names recognizable.
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
  "roadmap": [{"period":"Days 1-7","title":"string","tasks":["string"]}],
  "hi": {"plainEnglishSummary":"string","riskReason":"string","actionItems":["string"],"doctorQuestions":["string"],"billingDiscrepancies":"string","roadmap":[{"period":"दिन 1-7","title":"string","tasks":["string"]}]}${billingSpec}
}
Roadmap must have 3-4 steps covering 30 days, 2-3 short tasks each.
${text ? `Content to analyze:\n${text}` : 'The content is in the attached file.'}`;
}

/* -------------------------------------------------------------------------- */
/*  History (localStorage)                                                     */
/* -------------------------------------------------------------------------- */

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const uuid = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
      });

function loadHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr)
      ? arr.filter(
          (h) =>
            h && typeof h.ts === 'number' && typeof h.healthScore === 'number' && h.risk && Array.isArray(h.markers),
        )
      : [];
  } catch {
    return [];
  }
}
function saveHistory(h: HistoryEntry[]) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(h.slice(-20)));
  } catch {
    /* storage may be unavailable (private mode); the app still works */
  }
}

function seedHistory(): HistoryEntry[] {
  const day = 86400000;
  const now = Date.now();
  const mk = (
    n: number,
    ago: number,
    score: number,
    c: number,
    m: number,
    l: number,
    bp: string,
    glu: string,
    chol: string,
  ): HistoryEntry => ({
    id: `seed-${n}`,
    ts: now - ago * day,
    healthScore: score,
    riskLevel: 'High',
    risk: { cardiovascular: c, metabolic: m, lifestyle: l },
    markers: [
      { name: 'Blood Pressure', value: bp, status: 'Stage 2 Range' },
      { name: 'Fasting Glucose', value: glu, status: 'Elevated' },
      { name: 'Total Cholesterol', value: chol, status: 'Borderline High' },
    ],
    demo: true,
  });
  return [
    mk(1, 42, 41, 88, 74, 63, '158/100 mmHg', '131 mg/dL', '232 mg/dL'),
    mk(2, 28, 47, 84, 71, 60, '154/98 mmHg', '127 mg/dL', '226 mg/dL'),
    mk(3, 14, 53, 81, 69, 56, '149/95 mmHg', '122 mg/dL', '218 mg/dL'),
  ];
}

/* -------------------------------------------------------------------------- */
/*  FHIR R4 export                                                             */
/* -------------------------------------------------------------------------- */

const TAG_SYS = 'https://clearshield.example/fhir/tags';
const LOINC: [RegExp, string, string][] = [
  [/hba1c|a1c/i, '4548-4', 'Hemoglobin A1c/Hemoglobin.total in Blood'],
  [/ldl/i, '13457-7', 'Cholesterol in LDL [Mass/volume] in Serum or Plasma by calculation'],
  [/hdl/i, '2085-9', 'Cholesterol in HDL [Mass/volume] in Serum or Plasma'],
  [/triglycerid/i, '2571-8', 'Triglyceride [Mass/volume] in Serum or Plasma'],
  [/total cholesterol|^cholesterol/i, '2093-3', 'Cholesterol [Mass/volume] in Serum or Plasma'],
  [/glucose/i, '1558-6', 'Fasting glucose [Mass/volume] in Serum or Plasma'],
  [/creatinine/i, '2160-0', 'Creatinine [Mass/volume] in Serum or Plasma'],
];
const CURRENCY_ISO: Record<string, string> = { $: 'USD', '₹': 'INR', '€': 'EUR', '£': 'GBP' };

function buildFhirBundle(a: Analysis, mode: Mode, isDemo: boolean) {
  const now = new Date().toISOString();
  const patientId = uuid();
  const ref = (id: string) => ({ reference: `urn:uuid:${id}` });
  const entry = (resource: any) => ({ fullUrl: `urn:uuid:${resource.id}`, resource });
  const meta = {
    tag: [
      { system: TAG_SYS, code: 'ai-extracted', display: 'Extracted by AI from user-provided content' },
      ...(isDemo ? [{ system: TAG_SYS, code: 'demo-sample', display: 'Sample data, not a real patient' }] : []),
    ],
  };
  const entries: any[] = [
    entry({
      resourceType: 'Patient',
      id: patientId,
      meta,
      active: true,
      text: { status: 'generated', div: '<div xmlns="http://www.w3.org/1999/xhtml">Anonymous patient (no identifiers exported)</div>' },
    }),
  ];

  if (mode === 'report') {
    const obsIds: string[] = [];
    a.biomarkersFlagged.forEach((b) => {
      const id = uuid();
      obsIds.push(id);
      const tone = toneOf(b.status);
      const interpretation = [
        {
          coding: [
            {
              system: 'http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation',
              code: tone === 'ok' ? 'N' : 'A',
              display: tone === 'ok' ? 'Normal' : 'Abnormal',
            },
          ],
          text: b.status,
        },
      ];
      const base = {
        resourceType: 'Observation',
        id,
        meta,
        status: 'preliminary',
        subject: ref(patientId),
        effectiveDateTime: now,
        interpretation,
        referenceRange: [{ text: b.norm }],
        note: [{ text: 'Value extracted by AI from user-provided text; verify against the source document.' }],
      };
      const bp = b.value.match(/(\d{2,3})\s*\/\s*(\d{2,3})/);
      if (/blood pressure/i.test(b.name) && bp) {
        entries.push(
          entry({
            ...base,
            category: [{ coding: [{ system: 'http://terminology.hl7.org/CodeSystem/observation-category', code: 'vital-signs' }] }],
            code: { coding: [{ system: 'http://loinc.org', code: '85354-9', display: 'Blood pressure panel with all children optional' }], text: b.name },
            component: [
              { code: { coding: [{ system: 'http://loinc.org', code: '8480-6', display: 'Systolic blood pressure' }] }, valueQuantity: { value: Number(bp[1]), unit: 'mmHg', system: 'http://unitsofmeasure.org', code: 'mm[Hg]' } },
              { code: { coding: [{ system: 'http://loinc.org', code: '8462-4', display: 'Diastolic blood pressure' }] }, valueQuantity: { value: Number(bp[2]), unit: 'mmHg', system: 'http://unitsofmeasure.org', code: 'mm[Hg]' } },
            ],
          }),
        );
        return;
      }
      const loinc = LOINC.find(([re]) => re.test(b.name));
      const q = b.value.match(/(-?\d+(?:\.\d+)?)\s*([A-Za-z%][A-Za-z%\/\[\]\.]*)?/);
      entries.push(
        entry({
          ...base,
          category: [{ coding: [{ system: 'http://terminology.hl7.org/CodeSystem/observation-category', code: 'laboratory' }] }],
          code: { coding: loinc ? [{ system: 'http://loinc.org', code: loinc[1], display: loinc[2] }] : [], text: b.name },
          ...(q
            ? { valueQuantity: { value: Number(q[1]), ...(q[2] ? { unit: q[2], system: 'http://unitsofmeasure.org', code: q[2] } : {}) } }
            : { valueString: b.value }),
        }),
      );
    });

    const toRisk = (v: number) => (v >= 66 ? 'high' : v >= 40 ? 'moderate' : 'low');
    const risk = (code: string, text: string) => ({
      outcome: { text },
      qualitativeRisk: { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/risk-probability', code }] },
    });
    entries.push(
      entry({
        resourceType: 'RiskAssessment',
        id: uuid(),
        meta,
        status: 'preliminary',
        subject: ref(patientId),
        occurrenceDateTime: now,
        extension: [{ url: 'https://clearshield.example/fhir/StructureDefinition/health-index', valueInteger: a.healthScore }],
        prediction: [
          { ...risk(a.riskLevel === 'High' ? 'high' : a.riskLevel === 'Medium' ? 'moderate' : 'low', 'Overall clinical urgency'), rationale: a.riskReason },
          risk(toRisk(a.riskBreakdown.cardiovascular), 'Cardiovascular risk'),
          risk(toRisk(a.riskBreakdown.metabolic), 'Metabolic risk'),
          risk(toRisk(a.riskBreakdown.lifestyle), 'Lifestyle risk'),
        ],
        note: [{ text: 'AI-generated estimate for patient navigation. Not a diagnosis.' }],
      }),
      entry({
        resourceType: 'DiagnosticReport',
        id: uuid(),
        meta,
        status: 'preliminary',
        category: [{ coding: [{ system: 'http://terminology.hl7.org/CodeSystem/v2-0074', code: 'LAB' }] }],
        code: { coding: [{ system: 'http://loinc.org', code: '11502-2', display: 'Laboratory report' }], text: 'ClearShield summary' },
        subject: ref(patientId),
        effectiveDateTime: now,
        issued: now,
        result: obsIds.map(ref),
        conclusion: a.plainEnglishSummary,
      }),
    );
  } else if (a.billing) {
    const b = a.billing;
    const iso = CURRENCY_ISO[b.currency] || 'USD';
    entries.push(
      entry({
        resourceType: 'Claim',
        id: uuid(),
        meta,
        status: 'draft',
        type: { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/claim-type', code: 'professional' }] },
        use: 'claim',
        patient: ref(patientId),
        created: now,
        provider: { display: 'Not provided' },
        priority: { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/processpriority', code: 'normal' }] },
        insurance: [{ sequence: 1, focal: true, coverage: { display: 'Not provided' } }],
        diagnosis: b.icdCodes.map((c, i) => ({
          sequence: i + 1,
          diagnosisCodeableConcept: { coding: [{ system: 'http://hl7.org/fhir/sid/icd-10-cm', code: c }] },
        })),
        item: b.lines.map((l, i) => ({
          sequence: i + 1,
          productOrService: l.code
            ? { coding: [{ system: 'http://www.ama-assn.org/go/cpt', code: l.code, display: CPT_REF[l.code] }], text: l.description }
            : { text: l.description },
          net: { value: l.amount, currency: iso },
        })),
        total: { value: b.lines.reduce((s, l) => s + l.amount, 0), currency: iso },
      }),
    );
  }

  return {
    resourceType: 'Bundle',
    id: uuid(),
    meta: { ...meta, profile: [] },
    type: 'collection',
    timestamp: now,
    entry: entries,
  };
}

function downloadBlob(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
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
const TONE_RANK: Record<Tone, number> = { ok: 0, warn: 1, bad: 2 };

const scoreColor = (s: number) => (s >= 75 ? '#0d9488' : s >= 50 ? '#d97706' : '#dc2626');
const riskHex = (v: number) => (v >= 66 ? '#dc2626' : v >= 40 ? '#d97706' : '#0d9488');
const scoreLabel = (s: number, lang: Lang) => tx(lang, s >= 75 ? 'good' : s >= 50 ? 'attention' : 'priorityCare');
const riskBarColor = (v: number) => (v >= 66 ? 'from-red-500 to-rose-500' : v >= 40 ? 'from-amber-400 to-orange-500' : 'from-teal-400 to-emerald-500');
const riskWord = (v: number, lang: Lang) => tx(lang, v >= 66 ? 'high' : v >= 40 ? 'moderate' : 'low');

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
function ScoreRing({ score, lang }: { score: number; lang: Lang }) {
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
        <div className="text-xs font-bold text-slate-500 mt-1">{tx(lang, 'indexOf')}</div>
        <div className="mt-2 text-[11px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full text-white" style={{ background: color }}>
          {scoreLabel(score, lang)}
        </div>
      </div>
    </div>
  );
}

function RiskBar({ label, value, word, Icon, delay }: { label: string; value: number; word: string; Icon: typeof HeartPulse; delay: number }) {
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
          {value}/100 · {word}
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

/* ---- Compact interactive dial ---- */
function Dial({
  value,
  display,
  label,
  color,
  active,
  onClick,
  size = 'md',
}: {
  value: number;
  display: string;
  label: string;
  color: string;
  active?: boolean;
  onClick?: () => void;
  size?: 'md' | 'lg';
}) {
  const [v, setV] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setV(Math.max(0, Math.min(100, value))), 60);
    return () => clearTimeout(t);
  }, [value]);
  const r = 34;
  const c = 2 * Math.PI * r;
  const box = size === 'lg' ? 'w-32 h-32' : 'w-24 h-24';
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={!!active}
      className={`group flex flex-col items-center gap-2 rounded-2xl p-3 border transition-all duration-200 hover:-translate-y-1 hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 ${
        active ? 'bg-white border-teal-300 shadow-md' : 'bg-white/60 border-slate-200 hover:border-teal-200'
      }`}
    >
      <div className={`relative ${box}`}>
        <svg viewBox="0 0 80 80" className="w-full h-full -rotate-90 transition-transform duration-300 group-hover:scale-105">
          <circle cx="40" cy="40" r={r} fill="none" stroke="#e2e8f0" strokeWidth="8" />
          <circle
            cx="40"
            cy="40"
            r={r}
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={c * (1 - v / 100)}
            style={{ transition: 'stroke-dashoffset 1s cubic-bezier(.2,.8,.2,1)' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center text-lg font-black font-mono text-slate-900">{display}</div>
      </div>
      <div className="text-xs font-bold text-slate-700 text-center leading-tight">{label}</div>
    </button>
  );
}

/* ---- Clinic finder ---- */
const CLINIC_TYPES = [
  { id: 'govt', lk: 'clinicGovtL', nk: 'clinicGovtN', Icon: Building2, query: 'government hospital OPD near me', x: 118, y: 92 },
  { id: 'clinic', lk: 'clinicFamL', nk: 'clinicFamN', Icon: Stethoscope, query: 'family clinic general physician near me', x: 262, y: 70 },
  { id: 'lab', lk: 'clinicLabL', nk: 'clinicLabN', Icon: TestTube2, query: 'diagnostic lab blood test near me', x: 330, y: 160 },
  { id: 'pharmacy', lk: 'clinicPharmL', nk: 'clinicPharmN', Icon: Pill, query: 'generic medicine store Jan Aushadhi near me', x: 170, y: 175 },
] as const;

function ClinicFinder({ lang }: { lang: Lang }) {
  const [selected, setSelected] = useState<(typeof CLINIC_TYPES)[number]['id']>('clinic');
  const sel = CLINIC_TYPES.find((c) => c.id === selected)!;
  const mapsUrl = `https://www.google.com/maps/search/${encodeURIComponent(sel.query)}`;

  return (
    <section className={`cs-card cs-fade-up rounded-3xl p-6 md:p-8 ${GLASS}`}>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
        <div>
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-teal-600" /> {tx(lang, 'clinicTitle')}
          </h3>
          <p className="text-xs text-slate-500 mt-1">{tx(lang, 'clinicSub')}</p>
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
            <g transform="translate(200 125)">
              <circle r="9" fill="#2563eb" fillOpacity="0.25" className="cs-ping" />
              <circle r="6" fill="#2563eb" stroke="#fff" strokeWidth="2" />
              <text y="22" textAnchor="middle" fontSize="10" fontWeight="700" fill="#1e3a8a">
                {tx(lang, 'you')}
              </text>
            </g>
            {CLINIC_TYPES.map((c) => {
              const active = c.id === selected;
              return (
                <g key={c.id} transform={`translate(${c.x} ${c.y})`} onClick={() => setSelected(c.id)} className="cursor-pointer" role="button" aria-label={tx(lang, c.lk)}>
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
            <line x1="200" y1="125" x2={sel.x} y2={sel.y} stroke="#0f766e" strokeWidth="2" strokeDasharray="5 4" />
          </svg>
        </div>

        <div className="md:col-span-2 space-y-2.5">
          {CLINIC_TYPES.map(({ id, lk, Icon }) => (
            <button
              key={id}
              onClick={() => setSelected(id)}
              className={`w-full flex items-center gap-3 text-left px-3.5 py-2.5 rounded-xl border text-sm font-bold transition-all hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 ${
                selected === id
                  ? 'bg-teal-600 text-white border-teal-600 shadow-md shadow-teal-600/25'
                  : 'bg-white/80 text-slate-700 border-slate-200 hover:border-teal-300'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" /> {tx(lang, lk)}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-teal-50/70 border border-teal-100 p-4">
        <p className="text-sm text-teal-950 font-medium leading-relaxed flex-1 min-w-[220px]">
          <strong className="font-extrabold">{tx(lang, sel.lk)}:</strong> {tx(lang, sel.nk)}
        </p>
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 hover:-translate-y-0.5 transition-all shadow-md print:hidden"
        >
          <Navigation className="w-4 h-4" /> {tx(lang, 'openMaps')} <ExternalLink className="w-3 h-3 opacity-70" />
        </a>
      </div>
    </section>
  );
}

/* ---- Health trend tracker ---- */
type SeriesKey = 'index' | 'cardiovascular' | 'metabolic' | 'lifestyle';
const SERIES_COLOR: Record<SeriesKey, string> = { index: '#0d9488', cardiovascular: '#e11d48', metabolic: '#d97706', lifestyle: '#4f46e5' };
const firstNumber = (s: string): number | null => {
  const m = s.match(/-?\d+(?:\.\d+)?/);
  return m ? parseFloat(m[0]) : null;
};

function TrendTracker({
  lang,
  points,
  onSeed,
  onClear,
  hasStored,
}: {
  lang: Lang;
  points: HistoryEntry[];
  onSeed: () => void;
  onClear: () => void;
  hasStored: boolean;
}) {
  const [series, setSeries] = useState<SeriesKey>('index');
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const n = points.length;
  const W = 640, H = 230, L = 40, R = 18, T = 18, B = 36;
  const val = (p: HistoryEntry) => (series === 'index' ? p.healthScore : p.risk[series]);
  const x = (i: number) => (n <= 1 ? L + (W - L - R) / 2 : L + i * ((W - L - R) / (n - 1)));
  const y = (v: number) => T + (H - T - B) * (1 - v / 100);
  const color = SERIES_COLOR[series];
  const active = activeIdx !== null && activeIdx < n ? activeIdx : n - 1;
  const dateFmt = (ts: number) => new Date(ts).toLocaleDateString(lang === 'hi' ? 'hi-IN' : undefined, { day: 'numeric', month: 'short' });

  const seriesLabels: Record<SeriesKey, string> = {
    index: tx(lang, 'seriesIndex'),
    cardiovascular: tx(lang, 'cardio'),
    metabolic: tx(lang, 'metabolic'),
    lifestyle: tx(lang, 'lifestyle'),
  };

  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i)},${y(val(p))}`).join(' ');
  const area = n > 1 ? `${path} L${x(n - 1)},${y(0)} L${x(0)},${y(0)} Z` : '';

  const delta = n >= 2 ? val(points[n - 1]) - val(points[n - 2]) : 0;
  const good = series === 'index' ? delta > 0 : delta < 0;
  const DeltaIcon = delta === 0 ? Minus : delta > 0 ? TrendingUp : TrendingDown;
  const deltaClass = delta === 0 ? 'text-slate-500 bg-slate-100 border-slate-200' : good ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-red-700 bg-red-50 border-red-200';

  const prev = n >= 2 ? points[n - 2] : null;
  const last = n >= 1 ? points[n - 1] : null;
  const compare =
    prev && last
      ? last.markers
          .map((m) => {
            const o = prev.markers.find((p) => p.name.toLowerCase() === m.name.toLowerCase());
            if (!o) return null;
            const a = firstNumber(o.value);
            const b = firstNumber(m.value);
            const dn = a !== null && b !== null ? b - a : null;
            const r = TONE_RANK[toneOf(m.status)] - TONE_RANK[toneOf(o.status)];
            return { name: m.name, from: o.value, to: m.value, dn, verdict: r < 0 ? 'improved' : r > 0 ? 'worsened' : 'unchanged' };
          })
          .filter(Boolean) as { name: string; from: string; to: string; dn: number | null; verdict: 'improved' | 'worsened' | 'unchanged' }[]
      : [];

  return (
    <section className={`cs-card cs-fade-up rounded-3xl p-6 md:p-8 ${GLASS}`}>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
        <div>
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <History className="w-5 h-5 text-teal-600" /> {tx(lang, 'trendTitle')}
          </h3>
          <p className="text-xs text-slate-500 mt-1">{tx(lang, 'trendSub')}</p>
        </div>
        <div className="flex gap-2 print:hidden">
          {n < 2 && (
            <button onClick={onSeed} className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 px-3 py-1.5 rounded-full transition-all hover:-translate-y-0.5">
              <FlaskConical className="w-3.5 h-3.5" /> {tx(lang, 'previewSample')}
            </button>
          )}
          {hasStored && (
            <button onClick={onClear} className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-red-600 bg-white/80 hover:bg-red-50 border border-slate-300 hover:border-red-200 px-3 py-1.5 rounded-full transition-all">
              <Trash2 className="w-3.5 h-3.5" /> {tx(lang, 'clearHistory')}
            </button>
          )}
        </div>
      </div>

      {n < 2 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white/50 p-8 text-center text-sm text-slate-600 font-medium">
          {tx(lang, 'trendEmpty')}
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <div className="flex flex-wrap gap-2 print:hidden" role="tablist">
              {(Object.keys(seriesLabels) as SeriesKey[]).map((k) => (
                <button
                  key={k}
                  role="tab"
                  aria-selected={series === k}
                  onClick={() => setSeries(k)}
                  className={`text-xs font-bold px-3 py-1.5 rounded-full border transition-all hover:-translate-y-0.5 ${
                    series === k ? 'bg-slate-900 text-white border-slate-900 shadow' : 'bg-white/80 text-slate-600 border-slate-300 hover:border-teal-300'
                  }`}
                >
                  {seriesLabels[k]}
                </button>
              ))}
            </div>
            <span className={`inline-flex items-center gap-1.5 text-xs font-extrabold px-3 py-1 rounded-full border ${deltaClass}`}>
              <DeltaIcon className="w-3.5 h-3.5" />
              {delta > 0 ? '+' : ''}
              {delta} {tx(lang, 'vsPrev')}
            </span>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white/70 p-2 overflow-hidden">
            <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Health trend chart">
              <defs>
                <linearGradient id="cs-area" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity="0.28" />
                  <stop offset="100%" stopColor={color} stopOpacity="0" />
                </linearGradient>
              </defs>
              {[0, 25, 50, 75, 100].map((g) => (
                <g key={g}>
                  <line x1={L} x2={W - R} y1={y(g)} y2={y(g)} stroke="#e2e8f0" strokeDasharray={g === 0 ? undefined : '3 4'} />
                  <text x={L - 8} y={y(g) + 3} textAnchor="end" fontSize="10" fill="#64748b" fontFamily="monospace">
                    {g}
                  </text>
                </g>
              ))}
              {area && <path d={area} fill="url(#cs-area)" />}
              <path d={path} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              {points.map((p, i) => (
                <g
                  key={p.id}
                  tabIndex={0}
                  onMouseEnter={() => setActiveIdx(i)}
                  onFocus={() => setActiveIdx(i)}
                  onClick={() => setActiveIdx(i)}
                  className="cursor-pointer outline-none"
                >
                  <circle cx={x(i)} cy={y(val(p))} r="14" fill="transparent" />
                  {i === active && <circle cx={x(i)} cy={y(val(p))} r="10" fill={color} fillOpacity="0.18" />}
                  <circle cx={x(i)} cy={y(val(p))} r={i === active ? 6.5 : 5} fill={p.demo ? '#fff' : color} stroke={color} strokeWidth="3" style={{ transition: 'r .15s' }} />
                  <text x={x(i)} y={H - 12} textAnchor="middle" fontSize="10" fill="#64748b" fontWeight={i === active ? 700 : 400}>
                    {dateFmt(p.ts)}
                  </text>
                </g>
              ))}
            </svg>
          </div>

          {last && (
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 font-medium">
              <span className="font-mono font-extrabold text-slate-900 text-sm">{val(points[active])}/100</span>
              <span>{new Date(points[active].ts).toLocaleDateString(lang === 'hi' ? 'hi-IN' : undefined, { dateStyle: 'medium' })}</span>
              {points[active].demo && <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-bold">{tx(lang, 'sampleTag')}</span>}
              <span className="text-slate-400">· {n} {tx(lang, 'reportsCount')} · {tx(lang, 'trendNote')}</span>
            </div>
          )}

          {compare.length > 0 && (
            <div className="mt-6">
              <h4 className="text-sm font-bold text-slate-900 mb-2">{tx(lang, 'compareTitle')}</h4>
              <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white/70">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[11px] uppercase tracking-wider text-slate-500 bg-slate-50/80">
                      <th className="px-4 py-2 font-extrabold">{tx(lang, 'markerCol')}</th>
                      <th className="px-4 py-2 font-extrabold">{tx(lang, 'previous')}</th>
                      <th className="px-4 py-2 font-extrabold">{tx(lang, 'current')}</th>
                      <th className="px-4 py-2 font-extrabold" />
                    </tr>
                  </thead>
                  <tbody>
                    {compare.map((c) => (
                      <tr key={c.name} className="border-t border-slate-100 hover:bg-teal-50/40 transition-colors">
                        <td className="px-4 py-2 font-bold text-slate-800">{nameL(c.name, lang)}</td>
                        <td className="px-4 py-2 font-mono text-slate-500">{c.from}</td>
                        <td className="px-4 py-2 font-mono font-bold text-slate-900">
                          {c.to}
                          {c.dn !== null && c.dn !== 0 && <span className="ml-2 text-xs text-slate-500">({c.dn > 0 ? '+' : ''}{Math.round(c.dn * 10) / 10})</span>}
                        </td>
                        <td className="px-4 py-2">
                          <span
                            className={`text-[10px] font-extrabold uppercase tracking-wide px-2 py-0.5 rounded-full border ${
                              c.verdict === 'improved' ? TONE_BADGE.ok : c.verdict === 'worsened' ? TONE_BADGE.bad : 'bg-slate-50 text-slate-600 border-slate-200'
                            }`}
                          >
                            {tx(lang, c.verdict)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}

/* ---- Billing tools ---- */
const SEV_STYLE = {
  high: { badge: 'bg-red-50 text-red-700 border-red-200', box: 'border-red-200 bg-red-50/60', key: 'sevHigh' },
  medium: { badge: 'bg-amber-50 text-amber-700 border-amber-200', box: 'border-amber-200 bg-amber-50/60', key: 'sevMed' },
  info: { badge: 'bg-sky-50 text-sky-700 border-sky-200', box: 'border-sky-200 bg-sky-50/60', key: 'sevInfo' },
} as const;

function CodeValidator({ lang, billing, audit }: { lang: Lang; billing: BillingData; audit: AuditResult }) {
  const cur = billing.currency;
  const total = billing.lines.reduce((s, l) => s + l.amount, 0);
  const flaggedCount = audit.findings.filter((f) => f.sev !== 'info').length;
  return (
    <section className={`cs-card cs-fade-up rounded-3xl p-6 md:p-8 ${GLASS}`}>
      <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
        <Search className="w-5 h-5 text-teal-600" /> {tx(lang, 'valTitle')}
      </h3>
      <p className="text-xs text-slate-500 mt-1 mb-5">{tx(lang, 'valSub')}</p>

      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { l: tx(lang, 'valLines'), v: String(billing.lines.length) },
          { l: tx(lang, 'valFlagged'), v: String(flaggedCount) },
          { l: tx(lang, 'valDisputable'), v: money(audit.disputable, cur) },
        ].map((s) => (
          <div key={s.l} className="rounded-xl bg-white/70 border border-slate-200 py-3 px-2 text-center">
            <div className="text-[10px] uppercase tracking-wider font-bold text-slate-500">{s.l}</div>
            <div className="text-lg font-black font-mono text-slate-900 truncate">{s.v}</div>
          </div>
        ))}
      </div>

      {audit.findings.length === 0 ? (
        <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
          <Check className="w-4 h-4" /> {tx(lang, 'valClean')}
        </div>
      ) : (
        <ul className="space-y-3">
          {audit.findings.map((f) => {
            const st = SEV_STYLE[f.sev];
            return (
              <li key={f.id} className={`rounded-2xl border p-4 transition-all hover:shadow-md hover:-translate-y-0.5 ${st.box}`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-slate-600" />
                    <span className="font-bold text-slate-900 text-sm">{f.title[lang]}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {f.amount > 0 && <span className="font-mono text-sm font-extrabold text-slate-900">{money(f.amount, cur)}</span>}
                    <span className={`text-[10px] font-extrabold uppercase tracking-wide px-2 py-0.5 rounded-full border ${st.badge}`}>{tx(lang, st.key)}</span>
                  </div>
                </div>
                <p className="text-sm text-slate-700 mt-1.5 leading-relaxed">{f.detail[lang]}</p>
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-6 grid md:grid-cols-5 gap-5">
        <div className="md:col-span-3">
          <h4 className="text-sm font-bold text-slate-900 mb-2">{tx(lang, 'valCodes')}</h4>
          {audit.codes.length ? (
            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white/70">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wider text-slate-500 bg-slate-50/80">
                    <th className="px-3 py-2 font-extrabold">{tx(lang, 'colCode')}</th>
                    <th className="px-3 py-2 font-extrabold">{tx(lang, 'colRef')}</th>
                    <th className="px-3 py-2 font-extrabold text-right">{tx(lang, 'colAmt')}</th>
                  </tr>
                </thead>
                <tbody>
                  {audit.codes.map((c) => (
                    <tr key={c.idx} className="border-t border-slate-100">
                      <td className="px-3 py-2 font-mono font-bold text-slate-900">{c.code}</td>
                      <td className="px-3 py-2 text-slate-600">{c.ref || <span className="text-slate-400">{tx(lang, 'valUnknown')}</span>}</td>
                      <td className="px-3 py-2 font-mono text-right text-slate-900">{money(billing.lines[c.idx].amount, cur)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-slate-500">{billing.lines.length ? tx(lang, 'valNoCodes') : tx(lang, 'valNoLines')}</p>
          )}
        </div>
        <div className="md:col-span-2">
          <h4 className="text-sm font-bold text-slate-900 mb-2">{tx(lang, 'valIcd')}</h4>
          {audit.icd.length ? (
            <ul className="space-y-2">
              {audit.icd.map((c) => (
                <li key={c.code} className="flex items-start justify-between gap-2 rounded-xl bg-white/70 border border-slate-200 px-3 py-2">
                  <div>
                    <div className="font-mono font-bold text-slate-900 text-sm">{c.code}</div>
                    {c.ref && <div className="text-xs text-slate-500">{c.ref}</div>}
                  </div>
                  <span className={`text-[10px] font-extrabold uppercase tracking-wide px-2 py-0.5 rounded-full border shrink-0 ${c.valid ? TONE_BADGE.ok : TONE_BADGE.bad}`}>
                    {c.valid ? tx(lang, 'valValid') : tx(lang, 'valInvalid')}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-500">—</p>
          )}
        </div>
      </div>
      <p className="mt-4 text-[11px] text-slate-500">
        {lang === 'hi' ? 'कुल बिल की गई राशि' : 'Total billed charges'}: <span className="font-mono font-bold">{money(total, cur)}</span>
      </p>
    </section>
  );
}

function NumField({ label, value, onChange, prefix }: { label: string; value: number; onChange: (n: number) => void; prefix?: string }) {
  return (
    <label className="block">
      <span className="block text-[11px] uppercase tracking-wider font-extrabold text-slate-500 mb-1">{label}</span>
      <div className="flex items-center rounded-xl border border-slate-300 bg-white/80 focus-within:ring-2 focus-within:ring-teal-600 transition-shadow">
        {prefix && <span className="pl-3 text-sm text-slate-500 font-mono">{prefix}</span>}
        <input
          type="number"
          min={0}
          value={Number.isFinite(value) ? value : 0}
          onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))}
          className="w-full bg-transparent px-3 py-2 text-sm font-mono font-bold text-slate-900 focus:outline-none"
        />
      </div>
    </label>
  );
}

function CoverageCalculator({ lang, billing, audit }: { lang: Lang; billing: BillingData; audit: AuditResult }) {
  const cur = billing.currency;
  const inr = cur === '₹';
  const [billed, setBilled] = useState(Math.round(billing.lines.reduce((s, l) => s + l.amount, 0)));
  const [adj, setAdj] = useState(Math.round(billing.adjustments));
  const [ded, setDed] = useState(inr ? 10000 : 1000);
  const [coins, setCoins] = useState(20);
  const [oop, setOop] = useState(inr ? 50000 : 5000);
  const [excl, setExcl] = useState(false);

  const effBilled = Math.max(0, billed - (excl ? audit.disputable : 0));
  const r = calcOop(effBilled, adj, ded, coins, oop);
  const full = calcOop(billed, adj, ded, coins, oop);
  const without = calcOop(Math.max(0, billed - audit.disputable), adj, ded, coins, oop);
  const savings = Math.max(0, full.you - without.you);
  const share = r.allowed > 0 ? Math.round((r.you / r.allowed) * 100) : 0;
  const seg = (v: number) => (r.allowed > 0 ? `${(v / r.allowed) * 100}%` : '0%');
  const owed = billing.statementOwed;

  return (
    <section className={`cs-card cs-fade-up rounded-3xl p-6 md:p-8 ${GLASS}`}>
      <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
        <Calculator className="w-5 h-5 text-teal-600" /> {tx(lang, 'calcTitle')}
      </h3>
      <p className="text-xs text-slate-500 mt-1 mb-5">{tx(lang, 'calcSub')}</p>

      <div className="grid md:grid-cols-5 gap-6">
        <div className="md:col-span-2 space-y-3 print:hidden">
          <NumField label={tx(lang, 'billed')} value={billed} onChange={setBilled} prefix={cur} />
          <NumField label={tx(lang, 'adjust')} value={adj} onChange={setAdj} prefix={cur} />
          <NumField label={tx(lang, 'deductible')} value={ded} onChange={setDed} prefix={cur} />
          <label className="block">
            <span className="flex justify-between text-[11px] uppercase tracking-wider font-extrabold text-slate-500 mb-1">
              <span>{tx(lang, 'coins')}</span>
              <span className="font-mono text-slate-900">{coins}%</span>
            </span>
            <input type="range" min={0} max={100} step={5} value={coins} onChange={(e) => setCoins(Number(e.target.value))} className="w-full accent-teal-600" />
          </label>
          <NumField label={tx(lang, 'oopMax')} value={oop} onChange={setOop} prefix={cur} />
          <label className="flex items-start gap-2.5 text-sm font-medium text-slate-700 cursor-pointer rounded-lg px-2 py-1.5 -mx-2 hover:bg-teal-50/70 transition-colors">
            <input type="checkbox" checked={excl} onChange={() => setExcl((e) => !e)} className="mt-0.5 w-4 h-4 accent-teal-600" />
            <span>{tx(lang, 'excludeFlagged')}</span>
          </label>
        </div>

        <div className="md:col-span-3">
          <div className="flex flex-wrap items-center gap-6">
            <Dial value={share} display={`${share}%`} label={tx(lang, 'yourShare')} color={riskHex(share)} size="lg" />
            <div className="flex-1 min-w-[180px]">
              <div className="text-[11px] uppercase tracking-wider font-extrabold text-slate-500">{tx(lang, 'youOwe')}</div>
              <div className="text-4xl font-black font-mono text-slate-900">{money(r.you, cur)}</div>
              <div className="text-xs text-slate-500 mt-1 font-medium">
                {tx(lang, 'allowed')}: <span className="font-mono font-bold text-slate-700">{money(r.allowed, cur)}</span>
              </div>
            </div>
          </div>

          <div className="mt-5">
            <div className="h-4 rounded-full overflow-hidden flex bg-slate-200" aria-hidden="true">
              <div className="bg-amber-400 transition-all duration-500" style={{ width: seg(r.ded) }} />
              <div className="bg-orange-500 transition-all duration-500" style={{ width: seg(r.coins) }} />
              <div className="bg-teal-500 transition-all duration-500" style={{ width: seg(r.insurer) }} />
            </div>
            <ul className="mt-3 grid sm:grid-cols-3 gap-2 text-xs font-medium text-slate-700">
              <li className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-amber-400" />{tx(lang, 'youPayDed')}: <b className="font-mono">{money(r.ded, cur)}</b></li>
              <li className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-orange-500" />{tx(lang, 'youPayCoins')}: <b className="font-mono">{money(r.coins, cur)}</b></li>
              <li className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-teal-500" />{tx(lang, 'insurerPays')}: <b className="font-mono">{money(r.insurer, cur)}</b></li>
            </ul>
          </div>

          <div className="mt-5 grid sm:grid-cols-2 gap-3">
            <div className="rounded-xl bg-violet-50/70 border border-violet-200 px-4 py-3">
              <div className="text-[10px] uppercase tracking-wider font-extrabold text-violet-700">{tx(lang, 'surprise')}</div>
              <div className="text-lg font-black font-mono text-violet-950">{money(audit.surcharge, cur)}</div>
            </div>
            <div className="rounded-xl bg-emerald-50/70 border border-emerald-200 px-4 py-3">
              <div className="text-[10px] uppercase tracking-wider font-extrabold text-emerald-700">{tx(lang, 'savings')}</div>
              <div className="text-lg font-black font-mono text-emerald-950">{money(savings, cur)}</div>
            </div>
          </div>

          {owed !== undefined && owed > r.you + 1 && (
            <div className="mt-4 flex items-start gap-2.5 text-sm font-medium text-amber-900 bg-amber-50/90 border border-amber-200 rounded-xl px-4 py-3">
              <Info className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
              <span>
                {tx(lang, 'statementSays')}: <b className="font-mono">{money(owed, cur)}</b>. {tx(lang, 'mismatchNote')}
              </span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function buildLetter(o: {
  type: 'hospital' | 'insurer';
  name: string;
  acct: string;
  dos: string;
  recipient: string;
  billing: BillingData;
  audit: AuditResult;
}): string {
  const cur = o.billing.currency;
  const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const name = o.name.trim() || '[Your name]';
  const acct = o.acct.trim() || '[Account / claim number]';
  const dos = o.dos.trim() || '[Date(s) of service]';
  const to = o.recipient.trim() || (o.type === 'hospital' ? '[Hospital name], Billing Department' : '[Insurance company], Appeals Department');
  const flagged = o.audit.findings.filter((f) => f.sev !== 'info');

  const items = flagged.map((f, i) => {
    const l = f.lineIdx.length ? o.billing.lines[f.lineIdx[0]] : undefined;
    const head = l
      ? `${l.description}${l.code && !l.description.includes(l.code) ? ` (code ${l.code})` : ''}${f.amount ? `, ${money(f.amount, cur)}` : ''}`
      : f.title.en;
    return `${i + 1}. ${head}\n   Concern: ${f.detail.en}`;
  });

  const intro =
    o.type === 'hospital'
      ? 'I am writing to dispute several charges on the statement referenced above and to request an itemized review before any payment is made or the account is referred to collections.'
      : 'I am writing to appeal the way the claim referenced above was processed and to request reconsideration of my cost-sharing for the charges listed below.';

  const asks =
    o.type === 'hospital'
      ? [
          'Provide a fully itemized statement showing the CPT/HCPCS or revenue code, date of service and unit price for every charge.',
          'Give a written justification for each item above, or correct or remove it if it was billed in error.',
          'Confirm whether the charges follow applicable bundling rules and the rates under my insurance plan.',
          'Place my account on hold, and do not refer it to collections, while this dispute is under review.',
          'Send me a corrected statement and a written explanation of the outcome, including any further appeal options.',
        ]
      : [
          'Send me the full Explanation of Benefits for these claims and the plan provision used to calculate my cost-sharing.',
          'Re-review the items above for unbundling or duplicate billing and re-process the claim if needed.',
          'Confirm how my deductible, co-insurance and out-of-pocket maximum were applied.',
          'Provide a written decision, the reviewer\'s reasoning, and the next appeal steps and deadlines available to me.',
        ];

  return `${today}

To: ${to}
Re: ${o.type === 'hospital' ? 'Request for review and correction of billing' : 'Appeal and request for reconsideration of claim'}
Account / claim no.: ${acct}
Date(s) of service: ${dos}
Patient: ${name}

Dear Sir or Madam,

${intro}

${items.length ? `After reviewing the statement, I would like clarification of the following:\n\n${items.join('\n\n')}\n\nTotal amount in question: ${money(o.audit.disputable, cur)}\n` : 'I would like a full itemized breakdown of the charges so that I can verify them.\n'}
I request that you:
${asks.map((a, i) => `${i + 1}. ${a}`).join('\n')}

Thank you for your prompt attention. I can be reached at [phone number / email address].

Sincerely,
${name}`;
}

function DisputeLetter({ lang, billing, audit }: { lang: Lang; billing: BillingData; audit: AuditResult }) {
  const [type, setType] = useState<'hospital' | 'insurer'>('hospital');
  const [name, setName] = useState('');
  const [acct, setAcct] = useState('');
  const [dos, setDos] = useState('');
  const [recipient, setRecipient] = useState('');
  const [letter, setLetter] = useState('');
  const [copied, setCopied] = useState(false);

  const generate = () => setLetter(buildLetter({ type, name, acct, dos, recipient, billing, audit }));
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(letter);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  };
  const input = 'w-full rounded-xl border border-slate-300 bg-white/80 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600 transition-shadow';
  const label = 'block text-[11px] uppercase tracking-wider font-extrabold text-slate-500 mb-1';

  return (
    <section className={`cs-card cs-fade-up rounded-3xl p-6 md:p-8 ${GLASS}`}>
      <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
        <FileSignature className="w-5 h-5 text-teal-600" /> {tx(lang, 'letterTitle')}
      </h3>
      <p className="text-xs text-slate-500 mt-1 mb-5">{tx(lang, 'letterSub')}</p>

      <div className="flex flex-wrap gap-2 mb-4 print:hidden" role="tablist">
        {(['hospital', 'insurer'] as const).map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={type === t}
            onClick={() => setType(t)}
            className={`text-xs font-bold px-3.5 py-1.5 rounded-full border transition-all hover:-translate-y-0.5 ${
              type === t ? 'bg-slate-900 text-white border-slate-900 shadow' : 'bg-white/80 text-slate-600 border-slate-300 hover:border-teal-300'
            }`}
          >
            {tx(lang, t === 'hospital' ? 'typeHospital' : 'typeInsurer')}
          </button>
        ))}
      </div>

      <div className="grid sm:grid-cols-2 gap-3 print:hidden">
        <label><span className={label}>{tx(lang, 'patientName')}</span><input className={input} value={name} onChange={(e) => setName(e.target.value)} /></label>
        <label><span className={label}>{tx(lang, 'recipient')}</span><input className={input} value={recipient} onChange={(e) => setRecipient(e.target.value)} /></label>
        <label><span className={label}>{tx(lang, 'acctNo')}</span><input className={input} value={acct} onChange={(e) => setAcct(e.target.value)} /></label>
        <label><span className={label}>{tx(lang, 'dos')}</span><input className={input} value={dos} onChange={(e) => setDos(e.target.value)} /></label>
      </div>

      <div className="mt-4 flex flex-wrap gap-2 print:hidden">
        <button
          onClick={generate}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-slate-900 via-teal-700 to-teal-600 text-white text-sm font-bold shadow-lg shadow-teal-700/25 hover:brightness-110 hover:-translate-y-0.5 transition-all"
        >
          <Sparkles className="w-4 h-4" /> {tx(lang, letter ? 'regenerate' : 'generate')}
        </button>
        {letter && (
          <>
            <button onClick={copy} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/80 border border-slate-300 text-xs font-bold text-slate-700 hover:bg-white hover:-translate-y-0.5 transition-all shadow-sm">
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              {copied ? tx(lang, 'copied') : tx(lang, 'copyLetter')}
            </button>
            <button
              onClick={() => downloadBlob('clearshield-dispute-letter.txt', letter, 'text/plain;charset=utf-8')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/80 border border-slate-300 text-xs font-bold text-slate-700 hover:bg-white hover:-translate-y-0.5 transition-all shadow-sm"
            >
              <Download className="w-4 h-4" /> {tx(lang, 'downloadLetter')}
            </button>
          </>
        )}
      </div>

      {letter && (
        <textarea
          value={letter}
          onChange={(e) => setLetter(e.target.value)}
          rows={18}
          className="mt-4 w-full rounded-2xl bg-white/80 border border-slate-300 p-5 text-sm leading-relaxed text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-teal-600 shadow-inner cs-fade-up"
          aria-label={tx(lang, 'letterTitle')}
        />
      )}
      <p className="mt-3 text-[11px] text-slate-500">{tx(lang, 'letterNote')}</p>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  Page                                                                       */
/* -------------------------------------------------------------------------- */

const EMPTY_CONTENT = {
  summary: '',
  riskReason: '',
  actionItems: [] as string[],
  doctorQuestions: [] as string[],
  billing: '',
  roadmap: [] as RoadmapStep[],
};

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [textInput, setTextInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [isDemo, setIsDemo] = useState(false);
  const [inputError, setInputError] = useState('');
  const [activeTab, setActiveTab] = useState<Mode>('report');
  const [resultMode, setResultMode] = useState<Mode>('report');
  const [copied, setCopied] = useState(false);
  const [done, setDone] = useState<Record<string, boolean>>({});
  const [lang, setLang] = useState<Lang>('en');
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [runId, setRunId] = useState(0);
  const [dialView, setDialView] = useState<'risk' | 'wellness'>('risk');
  const [selectedDial, setSelectedDial] = useState('cardio');
  const resultsRef = useRef<HTMLDivElement>(null);

  const t = (k: K) => tx(lang, k);

  useEffect(() => {
    try {
      const s = localStorage.getItem(LANG_KEY);
      if (s === 'hi' || s === 'en') setLang(s);
    } catch {
      /* ignore */
    }
    setHistory(loadHistory());
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang === 'hi' ? 'hi' : 'en';
    try {
      localStorage.setItem(LANG_KEY, lang);
    } catch {
      /* ignore */
    }
  }, [lang]);

  useEffect(() => {
    if (!loading) return;
    setLoadingStep(0);
    const id = setInterval(() => setLoadingStep((s) => (s + 1) % 5), 1300);
    return () => clearInterval(id);
  }, [loading]);

  useEffect(() => {
    if (analysis) resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [analysis]);

  const totalTasks = useMemo(() => analysis?.roadmap.reduce((n, s) => n + s.tasks.length, 0) ?? 0, [analysis]);
  const doneCount = Object.values(done).filter(Boolean).length;
  const progress = totalTasks ? Math.round((doneCount / totalTasks) * 100) : 0;

  const audit = useMemo(() => (analysis?.billing ? auditBilling(analysis.billing) : null), [analysis]);

  const content = useMemo(() => {
    if (!analysis) return EMPTY_CONTENT;
    const hi = lang === 'hi' ? analysis.hi : undefined;
    const roadmapOk =
      !!hi &&
      hi.roadmap.length === analysis.roadmap.length &&
      hi.roadmap.every((s, i) => s.tasks.length === analysis.roadmap[i].tasks.length);
    return {
      summary: hi?.plainEnglishSummary || analysis.plainEnglishSummary,
      riskReason: hi?.riskReason || analysis.riskReason,
      actionItems: hi && hi.actionItems.length ? hi.actionItems : analysis.actionItems,
      doctorQuestions: hi && hi.doctorQuestions.length ? hi.doctorQuestions : analysis.doctorQuestions,
      billing: hi?.billingDiscrepancies || analysis.billingDiscrepancies,
      roadmap: roadmapOk ? hi!.roadmap : analysis.roadmap,
    };
  }, [analysis, lang]);

  const trendPoints = useMemo(() => {
    const base = history.slice().sort((a, b) => a.ts - b.ts);
    if (analysis && resultMode === 'report' && isDemo)
      base.push({
        id: 'current-demo',
        ts: Date.now(),
        healthScore: analysis.healthScore,
        riskLevel: analysis.riskLevel,
        risk: analysis.riskBreakdown,
        markers: analysis.biomarkersFlagged.map((b) => ({ name: b.name, value: b.value, status: b.status })),
        demo: true,
      });
    return base;
  }, [history, analysis, resultMode, isDemo]);

  const risk = analysis?.riskLevel ?? 'Low';
  const riskTheme = {
    High: { box: 'bg-red-50/80 border-red-200 text-red-950', icon: 'bg-red-600' },
    Medium: { box: 'bg-amber-50/80 border-amber-200 text-amber-950', icon: 'bg-amber-500' },
    Low: { box: 'bg-emerald-50/80 border-emerald-200 text-emerald-950', icon: 'bg-emerald-600' },
  }[risk];
  const riskLabel = t(risk === 'High' ? 'high' : risk === 'Medium' ? 'medium' : 'low');

  /* ---- Dials ---- */
  const dials = useMemo(() => {
    if (!analysis) return [];
    const wellness = dialView === 'wellness';
    const factor = (id: string, labelKey: K, v: number) => {
      const shown = wellness ? 100 - v : v;
      return {
        id,
        label: tx(lang, labelKey),
        value: shown,
        display: String(shown),
        color: wellness ? scoreColor(shown) : riskHex(shown),
        detail: fmt(tx(lang, wellness ? 'detailWell' : 'detailRisk'), { v: shown }),
      };
    };
    const roadmapDial = {
      id: 'roadmap',
      label: tx(lang, 'dialRoadmap'),
      value: progress,
      display: `${progress}%`,
      color: '#0d9488',
      detail: fmt(tx(lang, 'detailRoadmap'), { a: doneCount, b: totalTasks }),
    };
    if (resultMode === 'billing' && analysis.billing && audit) {
      const lines = analysis.billing.lines.length;
      const total = analysis.billing.lines.reduce((s, l) => s + l.amount, 0);
      const linePct = lines ? Math.round((audit.flaggedLines / lines) * 100) : 0;
      const sharePct = total ? Math.round((audit.disputable / total) * 100) : 0;
      return [
        { id: 'lines', label: tx(lang, 'dialFlaggedLines'), value: linePct, display: `${audit.flaggedLines}/${lines}`, color: riskHex(linePct), detail: fmt(tx(lang, 'detailLines'), { a: audit.flaggedLines, b: lines }) },
        { id: 'share', label: tx(lang, 'dialFlaggedShare'), value: sharePct, display: `${sharePct}%`, color: riskHex(sharePct), detail: fmt(tx(lang, 'detailShare'), { a: sharePct }) },
        roadmapDial,
      ];
    }
    const list = [
      factor('cardio', 'cardio', analysis.riskBreakdown.cardiovascular),
      factor('metabolic', 'metabolic', analysis.riskBreakdown.metabolic),
      factor('lifestyle', 'lifestyle', analysis.riskBreakdown.lifestyle),
    ];
    const total = analysis.biomarkersFlagged.length;
    if (total > 0) {
      const ok = analysis.biomarkersFlagged.filter((b) => toneOf(b.status) === 'ok').length;
      const pct = Math.round((ok / total) * 100);
      list.push({ id: 'range', label: tx(lang, 'dialInRange'), value: pct, display: `${ok}/${total}`, color: scoreColor(pct), detail: fmt(tx(lang, 'detailRange'), { a: ok, b: total }) });
    }
    list.push(roadmapDial);
    return list;
  }, [analysis, audit, dialView, lang, progress, doneCount, totalTasks, resultMode]);
  const activeDial = dials.find((d) => d.id === selectedDial) || dials[0];

  /* ---- Handlers ---- */
  const handleFile = (f: File | null) => {
    setInputError('');
    if (!f) return;
    if (f.size > MAX_FILE_BYTES) {
      setInputError(t('errSize'));
      return;
    }
    setFile(f);
  };

  const loadSample = () => {
    setTextInput(activeTab === 'report' ? SAMPLE_REPORT : SAMPLE_BILL);
    setInputError('');
  };

  const addHistory = (a: Analysis) => {
    const entry: HistoryEntry = {
      id: uid(),
      ts: Date.now(),
      healthScore: a.healthScore,
      riskLevel: a.riskLevel,
      risk: a.riskBreakdown,
      markers: a.biomarkersFlagged.map((b) => ({ name: b.name, value: b.value, status: b.status })),
    };
    setHistory((prev) => {
      const next = [...prev, entry].slice(-20);
      saveHistory(next);
      return next;
    });
  };

  const finish = (a: Analysis, mode: Mode, demo: boolean) => {
    setDone({});
    setSelectedDial(mode === 'report' ? 'cardio' : 'lines');
    setAnalysis(a);
    setIsDemo(demo);
    setResultMode(mode);
    setRunId((n) => n + 1);
    if (mode === 'report' && !demo) addHistory(a);
  };

  const showDemoNow = () => {
    setTextInput(activeTab === 'report' ? SAMPLE_REPORT : SAMPLE_BILL);
    finish(activeTab === 'report' ? DEMO_REPORT : DEMO_BILL, activeTab, true);
  };

  const seedSample = () => {
    setHistory((prev) => {
      const next = [...seedHistory(), ...prev.filter((p) => !p.demo)].sort((a, b) => a.ts - b.ts);
      saveHistory(next);
      return next;
    });
  };

  const clearHistory = () => {
    setHistory([]);
    try {
      localStorage.removeItem(HISTORY_KEY);
    } catch {
      /* ignore */
    }
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
      setInputError(t('errEmpty'));
      return;
    }
    setInputError('');
    setLoading(true);
    const mode = activeTab;

    try {
      const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
      if (!apiKey) throw new Error('Missing NEXT_PUBLIC_GEMINI_API_KEY');

      const model = new GoogleGenerativeAI(apiKey).getGenerativeModel({
        model: MODEL_NAME,
        generationConfig: { responseMimeType: 'application/json', temperature: 0.2 },
      });

      const parts: any[] = [{ text: buildPrompt(mode, textInput.trim()) }];
      if (file) {
        const isText = file.type.startsWith('text/') || /\.(txt|csv|md)$/i.test(file.name);
        if (isText) parts.push({ text: `Attached file (${file.name}):\n${await file.text()}` });
        else if (file.type === 'application/pdf' || file.type.startsWith('image/'))
          parts.push({ inlineData: { mimeType: file.type, data: await fileToBase64(file) } });
        else throw new Error('Unsupported file type');
      }

      const result = await model.generateContent(parts);
      const a = normalizeAnalysis(extractJson(result.response.text()));

      if (mode === 'billing') {
        const local = parseBillText(textInput);
        const g = a.billing;
        a.billing =
          g && g.lines.length
            ? {
                ...g,
                icdCodes: g.icdCodes.length ? g.icdCodes : local.icdCodes,
                statementOwed: g.statementOwed ?? local.statementOwed,
                adjustments: g.adjustments || local.adjustments,
              }
            : local;
      } else {
        a.billing = undefined;
      }
      finish(a, mode, false);
    } catch (err) {
      console.error('ClearShield analysis failed:', err);
      finish(mode === 'report' ? analyzeReportLocally(textInput) : analyzeBillLocally(textInput), mode, true);
    } finally {
      setLoading(false);
    }
  };

  const shareText = (a: Analysis) => {
    const hi = lang === 'hi' ? a.hi : undefined;
    const items = hi && hi.actionItems.length ? hi.actionItems : a.actionItems;
    const reason = hi?.riskReason || a.riskReason;
    return [
      `*ClearShield ${tx(lang, 'shareTitle')}*`,
      isDemo ? `_${tx(lang, 'shareSample')}_` : '',
      '',
      `${tx(lang, 'shareIndex')}: ${a.healthScore}/100 (${scoreLabel(a.healthScore, lang)})`,
      `${riskLabel} ${tx(lang, 'priority')}. ${reason}`,
      '',
      a.biomarkersFlagged.length
        ? `*${tx(lang, 'shareFlagged')}*\n` +
          a.biomarkersFlagged.slice(0, 5).map((b) => `• ${nameL(b.name, lang)}: ${b.value} (${statusL(b.status, lang)})`).join('\n') +
          '\n'
        : '',
      `*${tx(lang, 'shareNext')}*`,
      ...items.slice(0, 3).map((x, i) => `${i + 1}. ${x}`),
      '',
      `_${tx(lang, 'shareDisc')}_`,
    ]
      .filter((l, i, arr) => !(l === '' && arr[i - 1] === ''))
      .join('\n');
  };

  const whatsappUrl = analysis ? `https://wa.me/?text=${encodeURIComponent(shareText(analysis))}` : '#';

  const handleCopy = async () => {
    if (!analysis) return;
    try {
      await navigator.clipboard.writeText(shareText(analysis).replace(/\*/g, '').replace(/_/g, ''));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setInputError(t('errClip'));
    }
  };

  const handleFhir = () => {
    if (!analysis) return;
    downloadBlob(
      `clearshield-fhir-${resultMode}-${new Date().toISOString().slice(0, 10)}.json`,
      JSON.stringify(buildFhirBundle(analysis, resultMode, isDemo), null, 2),
      'application/fhir+json;charset=utf-8',
    );
  };

  const hasStoredHistory = history.length > 0;

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
                <ShieldCheck className="w-4 h-4" /> {t('privacy')}
              </span>
              <span className="flex items-center gap-1.5 text-slate-300">
                <Lock className="w-3.5 h-3.5 text-sky-300" /> {t('encrypted')}
              </span>
            </div>
            <div className="flex items-center gap-2 bg-slate-800 px-3 py-1 rounded-full text-sky-200 border border-slate-700">
              <Sparkles className="w-3.5 h-3.5 text-teal-300" />
              <span className="font-medium">{t('powered')}</span>
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
                <span className="block text-[11px] text-teal-700 uppercase tracking-widest font-bold">{t('tagline')}</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="inline-flex items-center rounded-full border border-slate-200 bg-white/80 p-0.5 text-xs font-bold shadow-sm print:hidden" role="group" aria-label="Language">
                <Languages className="w-3.5 h-3.5 mx-2 text-teal-700" aria-hidden="true" />
                {(['en', 'hi'] as const).map((l) => (
                  <button
                    key={l}
                    onClick={() => setLang(l)}
                    aria-pressed={lang === l}
                    className={`px-3 py-1 rounded-full transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 ${
                      lang === l ? 'bg-slate-900 text-white shadow' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {l === 'en' ? 'EN' : 'हिन्दी'}
                  </button>
                ))}
              </div>
              <span className="hidden sm:inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold bg-teal-50 text-teal-700 border border-teal-200 shadow-sm print:hidden">
                <span className="w-2.5 h-2.5 rounded-full bg-teal-500 mr-2 animate-pulse" />
                {t('sysOp')}
              </span>
            </div>
          </div>
        </nav>

        {/* Hero */}
        {!analysis && (
          <div className="max-w-5xl mx-auto px-6 pt-16 pb-10 text-center print:hidden">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold bg-white/80 text-teal-700 mb-5 border border-teal-200 shadow-sm backdrop-blur">
              <Sparkles className="w-4 h-4 text-teal-600" />
              {t('heroBadge')}
            </div>
            <h1 className="text-4xl md:text-6xl font-black tracking-tight text-slate-900 mb-6 leading-tight">
              {t('heroA')} <span className="bg-gradient-to-r from-teal-600 to-sky-600 bg-clip-text text-transparent">{t('heroB')}</span>
            </h1>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">{t('heroSub')}</p>
          </div>
        )}

        <div className={`max-w-6xl mx-auto px-6 mb-16 ${analysis ? 'pt-8' : ''}`}>
          {/* Input */}
          <div className={`cs-card max-w-4xl mx-auto rounded-3xl overflow-hidden print:hidden ${GLASS}`}>
            <div className="flex border-b border-slate-200/80 bg-slate-100/60 p-2.5 gap-3" role="tablist">
              {(
                [
                  { id: 'report', label: t('tabReport'), Icon: FileSearch },
                  { id: 'billing', label: t('tabBilling'), Icon: DollarSign },
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
                  {activeTab === 'report' ? t('pasteReport') : t('pasteBill')}
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={loadSample}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 px-3 py-1.5 rounded-full transition-all hover:-translate-y-0.5"
                  >
                    <FlaskConical className="w-3.5 h-3.5" /> {t('loadSample')}
                  </button>
                  <button
                    type="button"
                    onClick={showDemoNow}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 px-3 py-1.5 rounded-full transition-all hover:-translate-y-0.5 shadow"
                  >
                    <Sparkles className="w-3.5 h-3.5" /> {t('instantDemo')}
                  </button>
                </div>
              </div>

              <textarea
                id="clinical-input"
                rows={6}
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder={activeTab === 'report' ? t('phReport') : t('phBill')}
                className="w-full rounded-2xl bg-white/70 border border-slate-300 p-5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600 focus:bg-white text-slate-900 placeholder-slate-400 font-mono shadow-inner transition-colors"
              />

              <div className="mt-4 flex items-center justify-between gap-3 border-2 border-dashed border-slate-300 rounded-2xl p-4 bg-white/40 hover:border-teal-500 hover:bg-teal-50/40 transition-all">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center shadow-inner shrink-0">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-slate-800 truncate">{file ? file.name : t('uploadTitle')}</div>
                    <div className="text-xs text-slate-500">{t('uploadSub')}</div>
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
                    {t('browse')}
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
                      <Loader2 className="w-5 h-5 animate-spin" /> {t(`step${loadingStep + 1}` as K)}
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" /> {t('analyze')}
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
                  <h2 className="text-2xl font-black text-slate-900">{t('dashTitle')}</h2>
                  <p className="text-xs text-slate-500 font-medium">
                    {new Date().toLocaleDateString(lang === 'hi' ? 'hi-IN' : undefined, { dateStyle: 'long' })} · {resultMode === 'report' ? t('clinicalReport') : t('billingAudit')}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 print:hidden">
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#25D366] text-white text-xs font-bold hover:brightness-95 hover:-translate-y-0.5 transition-all shadow-md shadow-emerald-600/25"
                  >
                    <MessageCircle className="w-4 h-4" /> {t('whatsapp')}
                  </a>
                  <button onClick={handleCopy} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/80 border border-slate-300 text-xs font-bold text-slate-700 hover:bg-white hover:-translate-y-0.5 transition-all shadow-sm">
                    {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                    {copied ? t('copied') : t('copy')}
                  </button>
                  <button onClick={() => window.print()} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 hover:-translate-y-0.5 transition-all shadow-md">
                    <Printer className="w-4 h-4" /> {t('print')}
                  </button>
                  <button
                    onClick={handleFhir}
                    title="FHIR R4 Bundle (JSON)"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/80 border border-slate-300 text-xs font-bold text-slate-700 hover:bg-white hover:-translate-y-0.5 transition-all shadow-sm"
                  >
                    <FileJson className="w-4 h-4 text-teal-700" /> {t('fhir')}
                  </button>
                  <button onClick={reset} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/80 border border-slate-300 text-xs font-bold text-slate-700 hover:bg-white hover:-translate-y-0.5 transition-all shadow-sm">
                    <RotateCcw className="w-4 h-4" /> {t('newAnalysis')}
                  </button>
                </div>
              </div>

              {isDemo && (
                <div role="status" className="cs-fade-up flex items-start gap-3 text-sm font-medium text-amber-900 bg-amber-50/90 border border-amber-200 rounded-2xl px-5 py-4">
                  <Info className="w-5 h-5 shrink-0 mt-0.5 text-amber-600" />
                  <span>
                    <strong className="font-extrabold">{t('demoStrong')}</strong> {t('demoRest')}
                  </span>
                </div>
              )}

              {lang === 'hi' && (
                <div role="status" className="cs-fade-up flex items-start gap-3 text-xs font-medium text-sky-900 bg-sky-50/90 border border-sky-200 rounded-2xl px-5 py-3">
                  <Languages className="w-4 h-4 shrink-0 mt-0.5 text-sky-600" />
                  <span>{analysis.hi ? t('aiTranslated') : t('hindiMissing')}</span>
                </div>
              )}

              {/* Row 1: score + risk meters */}
              <div className="grid lg:grid-cols-5 gap-6">
                <section className={`cs-card cs-fade-up lg:col-span-2 rounded-3xl p-6 md:p-8 ${GLASS}`} style={{ animationDelay: '60ms' }}>
                  <h3 className="text-sm uppercase tracking-widest font-extrabold text-slate-500 mb-4 text-center">{t('overallIndex')}</h3>
                  <ScoreRing score={analysis.healthScore} lang={lang} />
                  <div className="mt-5 grid grid-cols-2 gap-3 text-center">
                    <div className="rounded-xl bg-white/70 border border-slate-200 py-2.5">
                      <div className="text-[10px] uppercase tracking-wider font-bold text-slate-500">{t('flagged')}</div>
                      <div className="text-xl font-black font-mono text-slate-900">{analysis.biomarkersFlagged.filter((b) => toneOf(b.status) !== 'ok').length}</div>
                    </div>
                    <div className="rounded-xl bg-white/70 border border-slate-200 py-2.5">
                      <div className="text-[10px] uppercase tracking-wider font-bold text-slate-500">{t('aiConf')}</div>
                      <div className="text-sm font-black font-mono text-slate-900 pt-1 truncate px-1">{analysis.confidenceScore}</div>
                    </div>
                  </div>
                  <p className="mt-3 text-[11px] text-slate-500 text-center leading-snug">{t('indexNote')}</p>
                </section>

                <div className="lg:col-span-3 space-y-6">
                  <section className={`cs-card cs-fade-up rounded-3xl p-6 border ${riskTheme.box} backdrop-blur-xl shadow-sm`} style={{ animationDelay: '120ms' }}>
                    <div className="flex items-center gap-5">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-md shrink-0 ${riskTheme.icon}`}>
                        <ShieldAlert className="w-7 h-7" />
                      </div>
                      <div>
                        <div className="text-xs uppercase tracking-widest font-extrabold opacity-75">{t('urgency')}</div>
                        <div className="text-2xl font-black mt-0.5">
                          {riskLabel} {t('priority')}
                        </div>
                      </div>
                    </div>
                    <p className="text-sm opacity-90 mt-3 leading-relaxed font-medium">{content.riskReason}</p>
                  </section>

                  <section className={`cs-card cs-fade-up rounded-3xl p-6 md:p-8 ${GLASS}`} style={{ animationDelay: '180ms' }}>
                    <h3 className="text-base font-bold text-slate-900 mb-5 flex items-center gap-2">
                      <Activity className="w-5 h-5 text-teal-600" /> {t('riskBreakdown')}
                    </h3>
                    <div className="space-y-5">
                      <RiskBar label={t('cardio')} value={analysis.riskBreakdown.cardiovascular} word={riskWord(analysis.riskBreakdown.cardiovascular, lang)} Icon={HeartPulse} delay={200} />
                      <RiskBar label={t('metabolic')} value={analysis.riskBreakdown.metabolic} word={riskWord(analysis.riskBreakdown.metabolic, lang)} Icon={Droplets} delay={350} />
                      <RiskBar label={t('lifestyle')} value={analysis.riskBreakdown.lifestyle} word={riskWord(analysis.riskBreakdown.lifestyle, lang)} Icon={Dumbbell} delay={500} />
                    </div>
                  </section>
                </div>
              </div>

              {/* Analytics dials */}
              {dials.length > 0 && (
                <section className={`cs-card cs-fade-up rounded-3xl p-6 md:p-8 ${GLASS}`} style={{ animationDelay: '200ms' }}>
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                      <Gauge className="w-5 h-5 text-teal-600" /> {t('dialsTitle')}
                    </h3>
                    {resultMode === 'report' && (
                      <div className="inline-flex rounded-full border border-slate-200 bg-white/80 p-0.5 text-xs font-bold print:hidden" role="group">
                        {(['risk', 'wellness'] as const).map((v) => (
                          <button
                            key={v}
                            onClick={() => setDialView(v)}
                            aria-pressed={dialView === v}
                            className={`px-3.5 py-1 rounded-full transition-all ${dialView === v ? 'bg-slate-900 text-white shadow' : 'text-slate-600 hover:text-slate-900'}`}
                          >
                            {t(v === 'risk' ? 'viewRisk' : 'viewWellness')}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 justify-items-center">
                    {dials.map((d) => (
                      <Dial key={`${d.id}-${dialView}`} value={d.value} display={d.display} label={d.label} color={d.color} active={activeDial?.id === d.id} onClick={() => setSelectedDial(d.id)} />
                    ))}
                  </div>
                  {activeDial && (
                    <p className="mt-4 text-sm text-slate-700 font-medium text-center">
                      <strong className="font-extrabold text-slate-900">{activeDial.label}:</strong> {activeDial.detail}
                    </p>
                  )}
                  <p className="mt-1 text-[11px] text-slate-400 text-center print:hidden">{t('dialTap')}</p>
                </section>
              )}

              {/* Summary */}
              <section className={`cs-card cs-fade-up rounded-3xl p-6 md:p-8 ${GLASS}`} style={{ animationDelay: '220ms' }}>
                <h3 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-teal-600" /> {t('plain')}
                </h3>
                <p className="text-slate-700 leading-relaxed text-base">{content.summary}</p>
              </section>

              {/* Biomarkers */}
              {analysis.biomarkersFlagged.length > 0 && (
                <section className={`cs-card cs-fade-up rounded-3xl p-6 md:p-8 ${GLASS}`} style={{ animationDelay: '260ms' }}>
                  <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <TestTube2 className="w-5 h-5 text-teal-600" /> {t('biomarkers')}
                  </h3>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {analysis.biomarkersFlagged.map((b, i) => {
                      const tone = toneOf(b.status);
                      return (
                        <div key={i} className="group bg-white/80 p-4 rounded-2xl border border-slate-200 hover:border-teal-300 hover:shadow-lg hover:-translate-y-1 transition-all duration-200">
                          <div className="flex items-start justify-between gap-2">
                            <div className="text-xs text-slate-500 font-bold">{nameL(b.name, lang)}</div>
                            <span className={`text-[10px] font-extrabold uppercase tracking-wide px-2 py-0.5 rounded-full border ${TONE_BADGE[tone]}`}>{statusL(b.status, lang)}</span>
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
                          <div className="mt-2 text-[11px] text-slate-500 font-mono">
                            {t('healthyRange')}: {b.norm}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <p className="mt-3 text-[11px] text-slate-500">{t('markerNote')}</p>
                </section>
              )}

              {/* Roadmap */}
              <section className={`cs-card cs-fade-up rounded-3xl p-6 md:p-8 ${GLASS}`} style={{ animationDelay: '300ms' }}>
                <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                  <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <CalendarCheck className="w-5 h-5 text-teal-600" /> {t('roadmap')}
                  </h3>
                  <div className="flex items-center gap-3 print:hidden">
                    <div className="w-36 h-2.5 rounded-full bg-slate-200 overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-teal-500 to-sky-500 transition-all duration-500" style={{ width: `${progress}%` }} />
                    </div>
                    <span className="text-xs font-bold text-slate-600 font-mono">
                      {doneCount}/{totalTasks} {t('done')}
                    </span>
                  </div>
                </div>

                <ol className="relative border-l-2 border-teal-200 ml-3 space-y-7">
                  {content.roadmap.map((step, si) => (
                    <li key={si} className="ml-6 relative">
                      <span className="absolute -left-[37px] top-0 w-7 h-7 rounded-full bg-gradient-to-br from-teal-600 to-sky-600 text-white text-xs font-black flex items-center justify-center ring-4 ring-white shadow">
                        {si + 1}
                      </span>
                      <div className="flex flex-wrap items-baseline gap-2 mb-2">
                        <span className="text-[11px] font-extrabold uppercase tracking-wider text-teal-700 bg-teal-50 border border-teal-100 px-2 py-0.5 rounded-full">{step.period}</span>
                        <h4 className="font-bold text-slate-900">{step.title}</h4>
                      </div>
                      <ul className="space-y-1.5">
                        {step.tasks.map((task, ti) => {
                          const key = `${si}-${ti}`;
                          const checked = !!done[key];
                          return (
                            <li key={key}>
                              <label className="flex items-start gap-3 text-sm cursor-pointer rounded-lg px-2 py-1.5 -mx-2 hover:bg-teal-50/70 transition-colors">
                                <input type="checkbox" checked={checked} onChange={() => setDone((d) => ({ ...d, [key]: !d[key] }))} className="mt-0.5 w-4 h-4 accent-teal-600" />
                                <span className={`leading-relaxed font-medium transition-colors ${checked ? 'line-through text-slate-400' : 'text-slate-700'}`}>{task}</span>
                              </label>
                            </li>
                          );
                        })}
                      </ul>
                    </li>
                  ))}
                </ol>
              </section>

              {/* Trend tracker */}
              {resultMode === 'report' && (
                <TrendTracker lang={lang} points={trendPoints} onSeed={seedSample} onClear={clearHistory} hasStored={hasStoredHistory} />
              )}

              {/* Actions + questions */}
              <div className="grid md:grid-cols-2 gap-6">
                <section className={`cs-card cs-fade-up rounded-3xl p-6 md:p-8 ${GLASS}`} style={{ animationDelay: '340ms' }}>
                  <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <CheckSquare className="w-5 h-5 text-emerald-600" /> {t('nextSteps')}
                  </h3>
                  {content.actionItems.length ? (
                    <ul className="space-y-4">
                      {content.actionItems.map((item, i) => (
                        <li key={i} className="flex items-start gap-3.5 text-sm text-slate-700">
                          <span className="w-6 h-6 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold flex items-center justify-center shrink-0 text-xs mt-0.5">{i + 1}</span>
                          <span className="leading-relaxed font-medium">{item}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-slate-500">{t('noActions')}</p>
                  )}
                </section>

                <section className="cs-card cs-fade-up rounded-3xl p-6 md:p-8 bg-sky-50/70 backdrop-blur-xl border border-sky-100 ring-1 ring-slate-900/5 shadow-[0_8px_30px_rgb(15,23,42,0.05)]" style={{ animationDelay: '380ms' }}>
                  <h3 className="text-base font-bold text-sky-950 mb-4 flex items-center gap-2">
                    <HelpCircle className="w-5 h-5 text-sky-600" /> {t('questions')}
                  </h3>
                  {content.doctorQuestions.length ? (
                    <ul className="space-y-4">
                      {content.doctorQuestions.map((q, i) => (
                        <li key={i} className="flex items-start gap-3.5 text-sm text-sky-950">
                          <span className="w-6 h-6 rounded-full bg-sky-100 text-sky-700 border border-sky-200 font-bold flex items-center justify-center shrink-0 text-xs mt-0.5">Q</span>
                          <span className="font-semibold leading-relaxed">{q}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-sky-900/60">{t('noQuestions')}</p>
                  )}
                </section>
              </div>

              {/* Billing */}
              {content.billing && (
                <section className="cs-card cs-fade-up rounded-3xl p-6 md:p-8 bg-violet-50/70 backdrop-blur-xl border border-violet-200 shadow-sm flex items-start gap-5" style={{ animationDelay: '420ms' }}>
                  <div className="w-12 h-12 rounded-2xl bg-violet-100 text-violet-700 border border-violet-200 flex items-center justify-center shrink-0">
                    <DollarSign className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-violet-950 text-base mb-1">{t('billingReview')}</h4>
                    <p className="text-sm text-violet-900 leading-relaxed font-medium">{content.billing}</p>
                  </div>
                </section>
              )}

              {/* Advanced billing tools */}
              {resultMode === 'billing' && analysis.billing && audit && (
                <>
                  <CodeValidator lang={lang} billing={analysis.billing} audit={audit} />
                  <CoverageCalculator key={`calc-${runId}`} lang={lang} billing={analysis.billing} audit={audit} />
                  <DisputeLetter key={`letter-${runId}`} lang={lang} billing={analysis.billing} audit={audit} />
                </>
              )}

              <ClinicFinder lang={lang} />

              <p className="text-xs text-slate-500 text-center leading-relaxed max-w-2xl mx-auto">{t('disclaimer')}</p>
            </div>
          )}
        </div>

        <footer className="bg-white/80 backdrop-blur border-t border-slate-200 py-10 text-center text-xs text-slate-500 print:hidden">
          <p>{t('footer')}</p>
        </footer>
      </div>
    </main>
  );
}
