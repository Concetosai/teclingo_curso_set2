import { useState, useEffect } from 'react';
import { speak as ttsSpeak } from '../services/ttsService';

const API_BASE = import.meta.env.VITE_API_URL || '';

// ==========================================
// TYPES
// ==========================================
type ExamStatus = 'intro' | 'in_progress' | 'submitting' | 'results' | 'mini_intro' | 'mini_in_progress' | 'mini_results';
type ExamSection = 'grammar' | 'vocabulary' | 'reading' | 'listening' | 'writing' | 'pronunciation';
type SkillTab = 'grammar' | 'vocabulary' | 'reading' | 'listening' | 'writing' | 'pronunciation';

interface ExamQuestion { id: string; question: string; options?: string[]; words?: string[]; answer: string; type?: string; }
interface ReadingPassage { id: string; text: string; questions: { id: string; question: string; options: string[]; answer: string }[]; }
interface ListeningAudio { id: string; script: string; questions: { id: string; question: string; options: string[]; answer: string }[]; }
interface WritingExercise { id: string; type: string; question?: string; words?: string[]; answer: string; }
interface PronunciationExercise { id: string; prompt: string; }

interface SectionResult { skill: string; score: number; correct: number; total: number; passed: boolean; threshold: number; }
interface ExamResults { results: SectionResult[]; a1_passed: boolean; overall_score: number; }

interface BatchResult { is_correct: boolean; score: number; feedback: string; pedagogical_reason: string; rule_hint?: string; }
interface BatchFeedback { summary: string; results: BatchResult[]; }

interface Props { userId: string; userContext: any; }

// ==========================================
// QUESTION BANKS
// ==========================================
const GRAMMAR_BANK: ExamQuestion[] = [
  { id: "EG-01", question: "I ___ a student.", options: ["am", "is", "are"], answer: "am" },
  { id: "EG-02", question: "She ___ not at home.", options: ["is", "are", "am"], answer: "is" },
  { id: "EG-03", question: "___ they your neighbors?", options: ["Are", "Is", "Am"], answer: "Are" },
  { id: "EG-04", question: "We ___ from Mexico.", options: ["are", "is", "am"], answer: "are" },
  { id: "EG-05", question: "He ___ a teacher.", options: ["is", "are", "am"], answer: "is" },
  { id: "EG-06", question: "I ___ happy today.", options: ["am", "is", "are"], answer: "am" },
  { id: "EG-07", question: "You ___ my neighbor.", options: ["are", "is", "am"], answer: "are" },
  { id: "EG-08", question: "It ___ a big house.", options: ["is", "are", "am"], answer: "is" },
  { id: "EG-09", question: "They ___ students.", options: ["are", "is", "am"], answer: "are" },
  { id: "EG-10", question: "She ___ not from here.", options: ["is", "are", "am"], answer: "is" },
];

const VOCAB_BANK: ExamQuestion[] = [
  { id: "EV-01", question: "Lugar donde vives:", answer: "house" },
  { id: "EV-02", question: "Persona que vive cerca:", answer: "neighbor" },
  { id: "EV-03", question: "Opuesto de big:", answer: "small" },
  { id: "EV-04", question: "Lugar para comprar comida:", answer: "store" },
  { id: "EV-05", question: "Bebida blanca de vaca:", answer: "milk" },
  { id: "EV-06", question: "Lugar para estudiar:", answer: "school" },
  { id: "EV-07", question: "Opuesto de dirty:", answer: "clean" },
  { id: "EV-08", question: "Lugar donde cocinas:", answer: "kitchen" },
  { id: "EV-09", question: "Dia despues del lunes:", answer: "tuesday" },
  { id: "EV-10", question: "Opuesto de old:", answer: "new" },
];

const READING_BANK: ReadingPassage[] = [
  {
    id: "ER-01", text: "My name is Ana. I wake up at 7 AM. I eat breakfast at 8. I work from Monday to Friday. I study English at night. I sleep at 10 PM.",
    questions: [
      { id: "ER-01-1", question: "What time does Ana wake up?", options: ["6 AM", "7 AM", "8 AM"], answer: "7 AM" },
      { id: "ER-01-2", question: "When does she study English?", options: ["Morning", "Afternoon", "Night"], answer: "Night" },
      { id: "ER-01-3", question: "What time does she sleep?", options: ["9 PM", "10 PM", "11 PM"], answer: "10 PM" },
    ]
  },
  {
    id: "ER-02", text: "I live in a small neighborhood. There is a park near my house. My neighbor is very friendly. We have a bakery on our street. I like my area because it is quiet and safe.",
    questions: [
      { id: "ER-02-1", question: "Is the neighborhood big?", options: ["Yes", "No"], answer: "No" },
      { id: "ER-02-2", question: "What is near the house?", options: ["A park", "A school", "A hospital"], answer: "A park" },
      { id: "ER-02-3", question: "Why does the person like the area?", options: ["It is quiet and safe", "It is big", "It is expensive"], answer: "It is quiet and safe" },
    ]
  }
];

const LISTENING_BANK: ListeningAudio[] = [
  {
    id: "EL-01", script: "A: Hello! Where do you live? B: I live on Main Street. A: Is there a park near your house? B: Yes, there is a beautiful park.",
    questions: [
      { id: "EL-01-1", question: "Where does person B live?", options: ["Main Street", "Oak Avenue", "Park Road"], answer: "Main Street" },
      { id: "EL-01-2", question: "Is there a park?", options: ["Yes", "No"], answer: "Yes" },
      { id: "EL-01-3", question: "How is the park?", options: ["Beautiful", "Small", "Old"], answer: "Beautiful" },
    ]
  },
  {
    id: "EL-02", script: "A: Can you help me? B: Sure! What do you need? A: I need to carry this box. It is very heavy. B: No problem, I can help you.",
    questions: [
      { id: "EL-02-1", question: "What does person A need?", options: ["Help", "Money", "Food"], answer: "Help" },
      { id: "EL-02-2", question: "What is heavy?", options: ["The box", "The bag", "The book"], answer: "The box" },
      { id: "EL-02-3", question: "Can B help?", options: ["Yes", "No", "Maybe"], answer: "Yes" },
    ]
  }
];

const WRITING_BANK: WritingExercise[] = [
  { id: "EW-01", type: "unscramble", words: ["My", "house", "is", "near", "the", "park"], answer: "My house is near the park" },
  { id: "EW-02", type: "fill_blank", question: "I ___ at 7 AM. (wake)", answer: "wake" },
  { id: "EW-03", type: "fill_blank", question: "She ___ breakfast. (eat)", answer: "eats" },
  { id: "EW-04", type: "unscramble", words: ["There", "is", "a", "store", "nearby"], answer: "There is a store nearby" },
  { id: "EW-05", type: "fill_blank", question: "We ___ English. (study)", answer: "study" },
  { id: "EW-06", type: "unscramble", words: ["Can", "you", "help", "me", "?"], answer: "Can you help me?" },
];

const PRONUNCIATION_BANK: PronunciationExercise[] = [
  { id: "EP-01", prompt: "I am from this neighborhood." },
  { id: "EP-02", prompt: "The kitchen is very clean." },
  { id: "EP-03", prompt: "Can you help me, please?" },
  { id: "EP-04", prompt: "My house is small but comfortable." },
  { id: "EP-05", prompt: "How much is the bread?" },
  { id: "EP-06", prompt: "I am going to visit my family." },
];

const SECTION_ORDER: ExamSection[] = ['grammar', 'vocabulary', 'reading', 'listening', 'writing', 'pronunciation'];
const SECTION_LABELS: Record<ExamSection, { label: string; icon: string }> = {
  grammar: { label: 'Grammar', icon: '📝' }, vocabulary: { label: 'Vocabulary', icon: '📚' },
  reading: { label: 'Reading', icon: '📖' }, listening: { label: 'Listening', icon: '🎧' },
  writing: { label: 'Writing', icon: '✍️' }, pronunciation: { label: 'Speaking', icon: '🎤' },
};
const A1_THRESHOLDS: Record<string, number> = { grammar: 70, vocabulary: 70, reading: 60, listening: 60, writing: 60, pronunciation: 60 };

// ==========================================
// HELPERS
// ==========================================
function shuffle<T>(arr: T[]): T[] { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function pickRandom<T>(arr: T[], n: number): T[] { return shuffle(arr).slice(0, n); }
function normalizeAnswer(s: string): string { return s.toLowerCase().replace(/[.,!?;:'"]/g, '').trim(); }
function speak(text: string) { ttsSpeak(text, { rate: 0.92 }); }
function getScoreColor(score: number): string { return score >= 80 ? 'text-green-400' : score >= 50 ? 'text-yellow-400' : 'text-red-400'; }

// ==========================================
// MAIN COMPONENT
// ==========================================
export default function ExamPage({ userId, userContext }: Props) {
  const [status, setStatus] = useState<ExamStatus>('intro');
  const [currentSection, setCurrentSection] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState(30 * 60);
  const [extensions, setExtensions] = useState(0);
  const [results, setResults] = useState<ExamResults | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Mini exam state
  const [miniSkill, setMiniSkill] = useState<SkillTab>('grammar');
  const [miniAnswers, setMiniAnswers] = useState<Record<string, string>>({});
  const [miniResults, setMiniResults] = useState<{ skill: string; score: number; correct: number; total: number } | null>(null);
  const [miniSelectedQuestions, setMiniSelectedQuestions] = useState<any>(null);

  // Writing/pronunciation AI state
  const [aiFeedback, setAiFeedback] = useState<BatchFeedback | null>(null);

  // Selected exercises (randomized on exam start)
  const [selectedExercises, setSelectedExercises] = useState<{
    grammar: ExamQuestion[];
    vocabulary: ExamQuestion[];
    reading: ReadingPassage;
    listening: ListeningAudio;
    writing: WritingExercise[];
    pronunciation: PronunciationExercise[];
  } | null>(null);

  // Timer
  useEffect(() => {
    if (status !== 'in_progress') return;
    const t = setInterval(() => {
      setTimeLeft(p => {
        if (p <= 1) {
          handleSubmitExam();
          return 0;
        }
        return p - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [status]);

  const formatTime = (s: number) => { const m = Math.floor(s / 60); const sec = s % 60; return `${m}:${sec.toString().padStart(2, '0')}`; };

  // Start exam
  const startExam = () => {
    setSelectedExercises({
      grammar: pickRandom(GRAMMAR_BANK, 5),
      vocabulary: pickRandom(VOCAB_BANK, 5),
      reading: pickRandom(READING_BANK, 1)[0],
      listening: pickRandom(LISTENING_BANK, 1)[0],
      writing: pickRandom(WRITING_BANK, 3),
      pronunciation: pickRandom(PRONUNCIATION_BANK, 3),
    });
    setAnswers({});
    setCurrentSection(0);
    setTimeLeft(30 * 60);
    setExtensions(0);
    setAiFeedback(null);
    setStatus('in_progress');
  };

  // Navigate sections
  const goNext = () => { if (currentSection < SECTION_ORDER.length - 1) setCurrentSection(p => p + 1); };
  const goPrev = () => { if (currentSection > 0) setCurrentSection(p => p - 1); };

  // Evaluate local sections (grammar, vocab, reading, listening)
  const evaluateLocal = (section: ExamSection): { correct: number; total: number } => {
    if (!selectedExercises) return { correct: 0, total: 0 };
    let correct = 0; let total = 0;

    if (section === 'grammar') {
      for (const q of selectedExercises.grammar) { total++; if (normalizeAnswer(answers[q.id] || '') === normalizeAnswer(q.answer)) correct++; }
    } else if (section === 'vocabulary') {
      for (const q of selectedExercises.vocabulary) { total++; if (normalizeAnswer(answers[q.id] || '') === normalizeAnswer(q.answer)) correct++; }
    } else if (section === 'reading') {
      for (const q of selectedExercises.reading.questions) { total++; if (normalizeAnswer(answers[q.id] || '') === normalizeAnswer(q.answer)) correct++; }
    } else if (section === 'listening') {
      for (const q of selectedExercises.listening.questions) { total++; if (normalizeAnswer(answers[q.id] || '') === normalizeAnswer(q.answer)) correct++; }
    }
    return { correct, total };
  };

  // Submit exam
  const handleSubmitExam = async () => {
    if (!selectedExercises) return;
    setSubmitting(true);

    const sectionResults: SectionResult[] = [];

    // Local sections
    for (const skill of ['grammar', 'vocabulary', 'reading', 'listening']) {
      const { correct, total } = evaluateLocal(skill as ExamSection);
      const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
      sectionResults.push({ skill, score: pct, correct, total, passed: pct >= A1_THRESHOLDS[skill], threshold: A1_THRESHOLDS[skill] });
    }

    // Writing & Pronunciation via AI
    for (const skill of ['writing', 'pronunciation'] as ExamSection[]) {
      const exercises = skill === 'writing' ? selectedExercises.writing : selectedExercises.pronunciation;
      const payload = exercises.map((ex: any) => ({
        question: ex.question || ex.prompt || '',
        user_answer: answers[ex.id] || '',
        correct_answer: ex.answer || ex.prompt || '',
      }));

      try {
        const response = await fetch(`${API_BASE}/api/course/feedback/batch`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ exercises: payload, user_context: userContext })
        });
        const result: BatchFeedback = await response.json();
        const scores = result.results.map((r: any) => r.score || 0);
        const avg = scores.length > 0 ? Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length) : 0;
        const correctCount = result.results.filter((r: any) => r.is_correct).length;
        sectionResults.push({ skill, score: avg, correct: correctCount, total: exercises.length, passed: avg >= A1_THRESHOLDS[skill], threshold: A1_THRESHOLDS[skill] });
      } catch {
        sectionResults.push({ skill, score: 0, correct: 0, total: exercises.length, passed: false, threshold: A1_THRESHOLDS[skill] });
      }
    }

    const a1Passed = sectionResults.every(r => r.passed);
    const overall = Math.round(sectionResults.reduce((a, b) => a + b.score, 0) / sectionResults.length);

    const examResults: ExamResults = { results: sectionResults, a1_passed: a1Passed, overall_score: overall };
    setResults(examResults);

    // Save to backend
    const backendAnswers = sectionResults.map(r => ({ skill: r.skill, is_correct: r.passed }));
    fetch(`${API_BASE}/api/course/exam/a1`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, world: userContext.institutional_world, answers: backendAnswers })
    }).catch(() => {});

    setSubmitting(false);
    setStatus('results');
  };

  // ==========================================
  // MINI EXAM LOGIC
  // ==========================================
  const startMiniExam = (skill: SkillTab) => {
    setMiniSkill(skill);
    setMiniAnswers({});
    setMiniResults(null);
    setAiFeedback(null);
    let selected: any = null;
    if (skill === 'grammar') selected = pickRandom(GRAMMAR_BANK, 5);
    else if (skill === 'vocabulary') selected = pickRandom(VOCAB_BANK, 5);
    else if (skill === 'reading') selected = pickRandom(READING_BANK, 1)[0];
    else if (skill === 'listening') selected = pickRandom(LISTENING_BANK, 1)[0];
    else if (skill === 'writing') selected = pickRandom(WRITING_BANK, 3);
    else if (skill === 'pronunciation') selected = pickRandom(PRONUNCIATION_BANK, 3);
    setMiniSelectedQuestions(selected);
    setStatus('mini_in_progress');
  };

  const evaluateMiniExam = async () => {
    setSubmitting(true);
    const skill = miniSkill;
    const bank = miniSelectedQuestions;
    let correct = 0; let total = 0; let pct = 0;

    if (skill === 'grammar' || skill === 'vocabulary') {
      for (const q of bank) { total++; if (normalizeAnswer(miniAnswers[q.id] || '') === normalizeAnswer(q.answer)) correct++; }
      pct = Math.round((correct / total) * 100);
    } else if (skill === 'reading') {
      for (const q of bank.questions) { total++; if (normalizeAnswer(miniAnswers[q.id] || '') === normalizeAnswer(q.answer)) correct++; }
      pct = Math.round((correct / total) * 100);
    } else if (skill === 'listening') {
      for (const q of bank.questions) { total++; if (normalizeAnswer(miniAnswers[q.id] || '') === normalizeAnswer(q.answer)) correct++; }
      pct = Math.round((correct / total) * 100);
    } else if (skill === 'writing' || skill === 'pronunciation') {
      total = bank.length;
      const payload = bank.map((ex: any) => ({
        question: ex.question || ex.prompt || '', user_answer: miniAnswers[ex.id] || '', correct_answer: ex.answer || ex.prompt || '',
      }));
      try {
        const response = await fetch(`${API_BASE}/api/course/feedback/batch`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ exercises: payload, user_context: userContext })
        });
        const result: BatchFeedback = await response.json();
        setAiFeedback(result);
        const scores = result.results.map((r: any) => r.score || 0);
        pct = scores.length > 0 ? Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length) : 0;
        correct = result.results.filter((r: any) => r.is_correct).length;
      } catch { pct = 0; }
    }

    setMiniResults({ skill, score: pct, correct, total });
    setSubmitting(false);
  };

  // ==========================================
  // RENDER: INTRO
  // ==========================================
  if (status === 'intro') {
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <div className="bg-gradient-to-r from-amber-900/40 to-orange-900/40 border border-amber-700 p-8 rounded-2xl text-center">
          <p className="text-6xl mb-4">📝</p>
          <h2 className="text-3xl font-bold text-amber-400 mb-2">Examen de Certificacion A1</h2>
          <p className="text-slate-300 text-lg">Evalua todas tus habilidades en un solo examen.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
            <h3 className="text-lg font-bold text-white mb-3">📋 Estructura del Examen</h3>
            <ul className="space-y-2 text-sm text-slate-300">
              <li>📝 Grammar - 5 preguntas</li>
              <li>📚 Vocabulary - 5 preguntas</li>
              <li>📖 Reading - 1 texto + 3 preguntas</li>
              <li>🎧 Listening - 1 audio + 3 preguntas</li>
              <li>✍️ Writing - 3 ejercicios (evaluacion IA)</li>
              <li>🎤 Speaking - 3 ejercicios (evaluacion IA)</li>
            </ul>
          </div>
          <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
            <h3 className="text-lg font-bold text-white mb-3">⏱️ Temporizador</h3>
            <p className="text-slate-300 text-sm mb-3">Tiempo inicial: <span className="text-amber-400 font-bold">30 minutos</span></p>
            <p className="text-slate-300 text-sm mb-3">Puedes agregar hasta <span className="text-amber-400 font-bold">2 extensiones</span> de 5 min cada una.</p>
            <p className="text-slate-300 text-sm">Al expirar el tiempo, se enviarian tus respuestas automaticamente.</p>
          </div>
        </div>

        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
          <h3 className="text-lg font-bold text-white mb-3">📊 Criterios de Aprobacion A1</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
            <div className="bg-slate-900/50 p-3 rounded-lg"><span className="text-blue-400">📝 Grammar:</span> <span className="text-white font-bold">70%+</span></div>
            <div className="bg-slate-900/50 p-3 rounded-lg"><span className="text-green-400">📚 Vocabulary:</span> <span className="text-white font-bold">70%+</span></div>
            <div className="bg-slate-900/50 p-3 rounded-lg"><span className="text-purple-400">📖 Reading:</span> <span className="text-white font-bold">60%+</span></div>
            <div className="bg-slate-900/50 p-3 rounded-lg"><span className="text-yellow-400">🎧 Listening:</span> <span className="text-white font-bold">60%+</span></div>
            <div className="bg-slate-900/50 p-3 rounded-lg"><span className="text-indigo-400">✍️ Writing:</span> <span className="text-white font-bold">60%+</span></div>
            <div className="bg-slate-900/50 p-3 rounded-lg"><span className="text-pink-400">🎤 Speaking:</span> <span className="text-white font-bold">60%+</span></div>
          </div>
          <p className="text-slate-400 text-xs mt-3">* Debes aprobar TODAS las habilidades para obtener la certificacion A1.</p>
        </div>

        <div className="flex gap-4">
          <button onClick={startExam} className="flex-1 py-4 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-xl transition-all shadow-lg">
            🚀 Comenzar Examen
          </button>
          <button onClick={() => setStatus('mini_intro')} className="py-4 px-8 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-bold text-lg transition-all">
            🎯 Practicar por Habilidad
          </button>
        </div>
      </div>
    );
  }

  // ==========================================
  // RENDER: MINI EXAM INTRO
  // ==========================================
  if (status === 'mini_intro') {
    const skills: { key: SkillTab; label: string; icon: string; desc: string }[] = [
      { key: 'grammar', label: 'Grammar', icon: '📝', desc: '5 preguntas de To Be y estructuras basicas' },
      { key: 'vocabulary', label: 'Vocabulary', icon: '📚', desc: '5 palabras en espanol para traducir' },
      { key: 'reading', label: 'Reading', icon: '📖', desc: '1 texto corto + 3 preguntas' },
      { key: 'listening', label: 'Listening', icon: '🎧', desc: '1 dialogo + 3 preguntas' },
      { key: 'writing', label: 'Writing', icon: '✍️', desc: '3 ejercicios de escritura evaluados por IA' },
      { key: 'pronunciation', label: 'Speaking', icon: '🎤', desc: '3 ejercicios de habla evaluados por IA' },
    ];
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-amber-400">🎯 Practicar por Habilidad</h2>
          <button onClick={() => setStatus('intro')} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-semibold">← Volver</button>
        </div>
        <p className="text-slate-400">Elige una habilidad para practicar. Estos ejercicios NO guardan resultado.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {skills.map(s => (
            <button key={s.key} onClick={() => startMiniExam(s.key)} className="bg-slate-800 p-6 rounded-xl border border-slate-700 hover:border-amber-600 text-left transition-all hover:bg-slate-750">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-3xl">{s.icon}</span>
                <span className="text-xl font-bold text-white">{s.label}</span>
              </div>
              <p className="text-slate-400 text-sm">{s.desc}</p>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ==========================================
  // RENDER: MINI EXAM IN PROGRESS
  // ==========================================
  if (status === 'mini_in_progress') {
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-amber-400">{SECTION_LABELS[miniSkill].icon} Mini-Examen: {SECTION_LABELS[miniSkill].label}</h2>
          <button onClick={() => setStatus('mini_intro')} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-semibold">← Salir</button>
        </div>

        {miniSkill === 'grammar' && <MiniGrammarExam answers={miniAnswers} setAnswers={setMiniAnswers} bank={miniSelectedQuestions} />}
        {miniSkill === 'vocabulary' && <MiniVocabExam answers={miniAnswers} setAnswers={setMiniAnswers} bank={miniSelectedQuestions} />}
        {miniSkill === 'reading' && <MiniReadingExam answers={miniAnswers} setAnswers={setMiniAnswers} passage={miniSelectedQuestions} />}
        {miniSkill === 'listening' && <MiniListeningExam answers={miniAnswers} setAnswers={setMiniAnswers} audio={miniSelectedQuestions} />}
        {miniSkill === 'writing' && <MiniWritingExam answers={miniAnswers} setAnswers={setMiniAnswers} bank={miniSelectedQuestions} />}
        {miniSkill === 'pronunciation' && <MiniPronunciationExam answers={miniAnswers} setAnswers={setMiniAnswers} bank={miniSelectedQuestions} />}

        {!miniResults && (
          <button onClick={evaluateMiniExam} disabled={submitting} className="w-full py-3 bg-amber-600 hover:bg-amber-700 disabled:bg-slate-600 text-white rounded-lg font-bold text-lg">
            {submitting ? '🤖 Evaluando...' : '✅ Evaluar'}
          </button>
        )}

        {miniResults && (
          <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 text-center">
            <p className={`text-4xl font-bold ${getScoreColor(miniResults.score)}`}>{miniResults.score}/100</p>
            <p className="text-slate-300 mt-2">{miniResults.correct}/{miniResults.total} correctas</p>
            <p className="text-slate-400 text-sm mt-1">{miniResults.score >= A1_THRESHOLDS[miniResults.skill] ? '✅ Superarias el umbral A1' : '❌ No alcanzarias el umbral A1'}</p>
            {aiFeedback && (
              <div className="mt-4 space-y-2 text-left">
                {aiFeedback.results.map((r: BatchResult, i: number) => (
                  <div key={i} className="bg-slate-900/50 p-3 rounded-lg border border-slate-700">
                    <span className={`font-bold ${getScoreColor(r.score)}`}>{r.is_correct ? '✅' : '❌'} {r.score}/100</span>
                    <p className="text-slate-300 text-sm mt-1">{r.feedback}</p>
                  </div>
                ))}
              </div>
            )}
            <button onClick={() => setStatus('mini_intro')} className="mt-4 px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-semibold">← Volver a habilidades</button>
          </div>
        )}
      </div>
    );
  }

  // ==========================================
  // RENDER: EXAM IN PROGRESS
  // ==========================================
  if (status === 'in_progress' && selectedExercises) {
    const section = SECTION_ORDER[currentSection];
    const timeWarning = timeLeft <= 300;
    const progress = ((currentSection + 1) / SECTION_ORDER.length) * 100;

    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        {/* Header */}
        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-amber-400">📝 Examen A1 - En Progreso</h2>
            <p className="text-slate-400 text-sm">Seccion {currentSection + 1}/{SECTION_ORDER.length}: {SECTION_LABELS[section].icon} {SECTION_LABELS[section].label}</p>
          </div>
          <div className="flex items-center gap-4">
            {extensions < 2 && (
              <button onClick={() => { setExtensions(p => p + 1); setTimeLeft(p => p + 300); }} className="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-semibold">
                +5 min ({2 - extensions} restantes)
              </button>
            )}
            <div className={`text-2xl font-mono font-bold ${timeWarning ? 'text-red-400 animate-pulse' : 'text-white'}`}>
              ⏱️ {formatTime(timeLeft)}
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-slate-700 rounded-full h-2">
          <div className="bg-amber-500 h-2 rounded-full transition-all" style={{ width: `${progress}%` }}></div>
        </div>

        {/* Section dots */}
        <div className="flex justify-center gap-2">
          {SECTION_ORDER.map((s, i) => (
            <div key={s} className={`w-3 h-3 rounded-full ${i === currentSection ? 'bg-amber-400' : i < currentSection ? 'bg-green-500' : 'bg-slate-600'}`} title={SECTION_LABELS[s].label}></div>
          ))}
        </div>

        {/* Section content */}
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
          {section === 'grammar' && <GrammarSection exercises={selectedExercises.grammar} answers={answers} setAnswers={setAnswers} />}
          {section === 'vocabulary' && <VocabularySection exercises={selectedExercises.vocabulary} answers={answers} setAnswers={setAnswers} />}
          {section === 'reading' && <ReadingSection passage={selectedExercises.reading} answers={answers} setAnswers={setAnswers} />}
          {section === 'listening' && <ListeningSection audio={selectedExercises.listening} answers={answers} setAnswers={setAnswers} />}
          {section === 'writing' && <WritingSection exercises={selectedExercises.writing} answers={answers} setAnswers={setAnswers} />}
          {section === 'pronunciation' && <PronunciationSection exercises={selectedExercises.pronunciation} answers={answers} setAnswers={setAnswers} />}
        </div>

        {/* Navigation */}
        <div className="flex justify-between">
          <button onClick={goPrev} disabled={currentSection === 0} className="px-6 py-3 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-semibold">
            ← Anterior
          </button>
          {currentSection < SECTION_ORDER.length - 1 ? (
            <button onClick={goNext} className="px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold">
              Siguiente →
            </button>
          ) : (
            <button onClick={handleSubmitExam} disabled={submitting} className="px-8 py-3 bg-green-600 hover:bg-green-700 disabled:bg-slate-600 text-white rounded-lg font-bold text-lg">
              {submitting ? '🤖 Enviando examen...' : '🏁 Terminar y Enviar'}
            </button>
          )}
        </div>
      </div>
    );
  }

  // ==========================================
  // RENDER: SUBMITTING
  // ==========================================
  if (status === 'submitting' || submitting) {
    return (
      <div className="text-center py-20">
        <p className="text-6xl mb-4 animate-bounce">🤖</p>
        <p className="text-2xl font-bold text-amber-400">Evaluando tu examen...</p>
        <p className="text-slate-400 mt-2">La IA esta analizando tus respuestas de Writing y Speaking.</p>
      </div>
    );
  }

  // ==========================================
  // RENDER: RESULTS
  // ==========================================
  if (status === 'results' && results) {
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <div className={`text-center p-8 rounded-2xl border-2 ${results.a1_passed ? 'bg-gradient-to-r from-green-900/40 to-emerald-900/40 border-green-500' : 'bg-gradient-to-r from-red-900/40 to-orange-900/40 border-red-500'}`}>
          <p className="text-6xl mb-3">{results.a1_passed ? '🏆' : '📚'}</p>
          <h2 className={`text-3xl font-bold ${results.a1_passed ? 'text-green-400' : 'text-red-400'}`}>
            {results.a1_passed ? '¡CERTIFICACION A1 APROBADA!' : 'Sigue practicando...'}
          </h2>
          <p className={`text-xl mt-2 ${results.a1_passed ? 'text-green-300' : 'text-red-300'}`}>
            Promedio General: <span className="font-bold">{results.overall_score}%</span>
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {results.results.map(r => (
            <div key={r.skill} className={`bg-slate-800 p-5 rounded-xl border ${r.passed ? 'border-green-700' : 'border-red-700'}`}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-lg font-bold text-white">{SECTION_LABELS[r.skill as ExamSection]?.icon} {r.skill.charAt(0).toUpperCase() + r.skill.slice(1)}</span>
                <span className={`text-sm font-bold ${r.passed ? 'text-green-400' : 'text-red-400'}`}>{r.passed ? '✅ PASS' : '❌ FAIL'}</span>
              </div>
              <div className="flex items-end gap-2 mb-2">
                <span className={`text-3xl font-bold ${getScoreColor(r.score)}`}>{r.score}%</span>
                <span className="text-slate-500 text-sm mb-1">/ {r.total} preguntas</span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-3">
                <div className={`h-3 rounded-full ${r.passed ? 'bg-green-500' : 'bg-red-500'}`} style={{ width: `${Math.min(r.score, 100)}%` }}></div>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-1 mt-1 relative">
                <div className="absolute top-0 h-1 w-0.5 bg-white" style={{ left: `${r.threshold}%` }}></div>
              </div>
              <p className="text-slate-400 text-xs mt-2">Umbral A1: {r.threshold}% | Correctas: {r.correct}/{r.total}</p>
            </div>
          ))}
        </div>

        <div className="flex gap-4">
          <button onClick={() => { setStatus('intro'); setResults(null); }} className="flex-1 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-lg">
            🔄 Tomar Examen de Nuevo
          </button>
          <button onClick={() => setStatus('mini_intro')} className="py-3 px-8 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-bold">
            🎯 Practicar
          </button>
        </div>
      </div>
    );
  }

  return null;
}

// ==========================================
// SECTION COMPONENTS
// ==========================================

function GrammarSection({ exercises, answers, setAnswers }: { exercises: ExamQuestion[]; answers: Record<string, string>; setAnswers: React.Dispatch<React.SetStateAction<Record<string, string>>> }) {
  return (
    <div className="space-y-6">
      <h3 className="text-xl font-bold text-blue-400">📝 Grammar - Selecciona la respuesta correcta</h3>
      {exercises.map((q, idx) => (
        <div key={q.id} className="bg-slate-900/50 p-4 rounded-lg border border-slate-700">
          <p className="text-slate-200 mb-3 font-medium">{idx + 1}. {q.question}</p>
          <div className="flex gap-2 flex-wrap">
            {q.options?.map((opt, i) => (
              <button key={i} onClick={() => setAnswers(p => ({ ...p, [q.id]: opt }))} className={`px-4 py-2 rounded-lg border transition-all ${answers[q.id] === opt ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600'}`}>{opt}</button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function VocabularySection({ exercises, answers, setAnswers }: { exercises: ExamQuestion[]; answers: Record<string, string>; setAnswers: React.Dispatch<React.SetStateAction<Record<string, string>>> }) {
  return (
    <div className="space-y-6">
      <h3 className="text-xl font-bold text-green-400">📚 Vocabulary - Escribe la palabra en ingles</h3>
      {exercises.map((q, idx) => (
        <div key={q.id} className="bg-slate-900/50 p-4 rounded-lg border border-slate-700">
          <p className="text-slate-200 mb-3 font-medium">{idx + 1}. {q.question}</p>
          <input type="text" value={answers[q.id] || ''} onChange={(e) => setAnswers(p => ({ ...p, [q.id]: e.target.value }))} placeholder="Escribe tu respuesta..." className="w-full p-3 rounded-lg bg-slate-700 text-white border border-slate-600 focus:border-green-500 focus:outline-none" />
        </div>
      ))}
    </div>
  );
}

function ReadingSection({ passage, answers, setAnswers }: { passage: ReadingPassage; answers: Record<string, string>; setAnswers: React.Dispatch<React.SetStateAction<Record<string, string>>> }) {
  return (
    <div className="space-y-6">
      <h3 className="text-xl font-bold text-purple-400">📖 Reading - Lee el texto y responde</h3>
      <div className="bg-slate-900/50 p-5 rounded-lg border border-slate-700">
        <p className="text-slate-200 leading-relaxed">{passage.text}</p>
      </div>
      <div className="space-y-4">
        {passage.questions.map((q, idx) => (
          <div key={q.id} className="bg-slate-900/50 p-4 rounded-lg border border-slate-700">
            <p className="text-slate-200 mb-3 font-medium">{idx + 1}. {q.question}</p>
            <div className="flex gap-2 flex-wrap">
              {q.options.map((opt, i) => (
                <button key={i} onClick={() => setAnswers(p => ({ ...p, [q.id]: opt }))} className={`px-4 py-2 rounded-lg border transition-all ${answers[q.id] === opt ? 'bg-purple-600 border-purple-500 text-white' : 'bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600'}`}>{opt}</button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ListeningSection({ audio, answers, setAnswers }: { audio: ListeningAudio; answers: Record<string, string>; setAnswers: React.Dispatch<React.SetStateAction<Record<string, string>>> }) {
  return (
    <div className="space-y-6">
      <h3 className="text-xl font-bold text-yellow-400">🎧 Listening - Escucha y responde</h3>
      <div className="bg-slate-900/50 p-5 rounded-lg border border-slate-700">
        <div className="flex items-center gap-3 mb-3">
          <button onClick={() => speak(audio.script)} className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg font-semibold">🔊 Escuchar dialogo</button>
        </div>
        <p className="text-slate-400 text-sm italic">"{audio.script}"</p>
      </div>
      <div className="space-y-4">
        {audio.questions.map((q, idx) => (
          <div key={q.id} className="bg-slate-900/50 p-4 rounded-lg border border-slate-700">
            <p className="text-slate-200 mb-3 font-medium">{idx + 1}. {q.question}</p>
            <div className="flex gap-2 flex-wrap">
              {q.options.map((opt, i) => (
                <button key={i} onClick={() => setAnswers(p => ({ ...p, [q.id]: opt }))} className={`px-4 py-2 rounded-lg border transition-all ${answers[q.id] === opt ? 'bg-yellow-600 border-yellow-500 text-white' : 'bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600'}`}>{opt}</button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function WritingSection({ exercises, answers, setAnswers }: { exercises: WritingExercise[]; answers: Record<string, string>; setAnswers: React.Dispatch<React.SetStateAction<Record<string, string>>> }) {
  return (
    <div className="space-y-6">
      <h3 className="text-xl font-bold text-indigo-400">✍️ Writing - Escribe tu respuesta</h3>
      <p className="text-slate-400 text-sm">Tus respuestas seran evaluadas por la IA. Escribe frases completas en ingles.</p>
      {exercises.map((ex, idx) => (
        <div key={ex.id} className="bg-slate-900/50 p-4 rounded-lg border border-slate-700">
          {ex.type === 'unscramble' && ex.words ? (
            <div>
              <p className="text-slate-200 mb-3 font-medium">{idx + 1}. Ordena las palabras:</p>
              <div className="flex flex-wrap gap-2 mb-3">
                {ex.words.map((w, i) => (
                  <span key={i} className="px-3 py-1 bg-indigo-900/50 border border-indigo-600 rounded-lg text-white text-sm">{w}</span>
                ))}
              </div>
              <input type="text" value={answers[ex.id] || ''} onChange={(e) => setAnswers(p => ({ ...p, [ex.id]: e.target.value }))} placeholder="Escribe la frase ordenada..." className="w-full p-3 rounded-lg bg-slate-700 text-white border border-slate-600 focus:border-indigo-500 focus:outline-none" />
            </div>
          ) : (
            <div>
              <p className="text-slate-200 mb-3 font-medium">{idx + 1}. {ex.question}</p>
              <input type="text" value={answers[ex.id] || ''} onChange={(e) => setAnswers(p => ({ ...p, [ex.id]: e.target.value }))} placeholder="Escribe tu respuesta..." className="w-full p-3 rounded-lg bg-slate-700 text-white border border-slate-600 focus:border-indigo-500 focus:outline-none" />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function PronunciationSection({ exercises, answers, setAnswers }: { exercises: PronunciationExercise[]; answers: Record<string, string>; setAnswers: React.Dispatch<React.SetStateAction<Record<string, string>>> }) {
  const startRecording = (id: string) => {
    // @ts-ignore
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { alert("Tu navegador no soporta reconocimiento de voz. Usa Chrome o Edge."); return; }
    const r = new SR(); r.lang = 'en-US';
    r.onresult = (e: any) => setAnswers(p => ({ ...p, [id]: e.results[0][0].transcript }));
    r.onerror = (e: any) => { if (e.error === 'no-speech') alert("No se detecto voz. Intenta de nuevo."); };
    r.start();
  };

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-bold text-pink-400">🎤 Speaking - Habla y graba tu voz</h3>
      <p className="text-slate-400 text-sm">Lee la frase en voz alta y graba tu respuesta. La IA evaluara tu pronunciacion.</p>
      {exercises.map((ex, idx) => (
        <div key={ex.id} className="bg-slate-900/50 p-4 rounded-lg border border-slate-700">
          <p className="text-slate-200 mb-3 font-medium">{idx + 1}. {ex.prompt}</p>
          <div className="flex gap-3">
            <button onClick={() => speak(ex.prompt)} className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold">🔊 Escuchar</button>
            <button onClick={() => startRecording(ex.id)} className="px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white rounded-lg font-semibold">🎤 Grabar</button>
          </div>
          {answers[ex.id] && (
            <p className="text-slate-400 text-sm mt-2 italic">Tu respuesta: "{answers[ex.id]}"</p>
          )}
        </div>
      ))}
    </div>
  );
}

// ==========================================
// MINI EXAM COMPONENTS
// ==========================================

function MiniGrammarExam({ answers, setAnswers, bank }: { answers: Record<string, string>; setAnswers: React.Dispatch<React.SetStateAction<Record<string, string>>>; bank: ExamQuestion[] }) {
  return (
    <div className="space-y-4">
      <p className="text-slate-400 text-sm">Responde las 5 preguntas de Grammar.</p>
      {bank.map((q, idx) => (
        <div key={q.id} className="bg-slate-900/50 p-4 rounded-lg border border-slate-700">
          <p className="text-slate-200 mb-3 font-medium">{idx + 1}. {q.question}</p>
          <div className="flex gap-2 flex-wrap">
            {q.options?.map((opt, i) => (
              <button key={i} onClick={() => setAnswers(p => ({ ...p, [q.id]: opt }))} className={`px-4 py-2 rounded-lg border transition-all ${answers[q.id] === opt ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600'}`}>{opt}</button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function MiniVocabExam({ answers, setAnswers, bank }: { answers: Record<string, string>; setAnswers: React.Dispatch<React.SetStateAction<Record<string, string>>>; bank: ExamQuestion[] }) {
  return (
    <div className="space-y-4">
      <p className="text-slate-400 text-sm">Escribe la palabra en ingles.</p>
      {bank.map((q, idx) => (
        <div key={q.id} className="bg-slate-900/50 p-4 rounded-lg border border-slate-700">
          <p className="text-slate-200 mb-3 font-medium">{idx + 1}. {q.question}</p>
          <input type="text" value={answers[q.id] || ''} onChange={(e) => setAnswers(p => ({ ...p, [q.id]: e.target.value }))} placeholder="Tu respuesta..." className="w-full p-3 rounded-lg bg-slate-700 text-white border border-slate-600 focus:border-green-500 focus:outline-none" />
        </div>
      ))}
    </div>
  );
}

function MiniReadingExam({ answers, setAnswers, passage }: { answers: Record<string, string>; setAnswers: React.Dispatch<React.SetStateAction<Record<string, string>>>; passage: ReadingPassage }) {
  return (
    <div className="space-y-4">
      <div className="bg-slate-900/50 p-5 rounded-lg border border-slate-700">
        <p className="text-slate-200 leading-relaxed">{passage.text}</p>
      </div>
      {passage.questions.map((q, idx) => (
        <div key={q.id} className="bg-slate-900/50 p-4 rounded-lg border border-slate-700">
          <p className="text-slate-200 mb-3 font-medium">{idx + 1}. {q.question}</p>
          <div className="flex gap-2 flex-wrap">
            {q.options.map((opt, i) => (
              <button key={i} onClick={() => setAnswers(p => ({ ...p, [q.id]: opt }))} className={`px-4 py-2 rounded-lg border transition-all ${answers[q.id] === opt ? 'bg-purple-600 border-purple-500 text-white' : 'bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600'}`}>{opt}</button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function MiniListeningExam({ answers, setAnswers, audio }: { answers: Record<string, string>; setAnswers: React.Dispatch<React.SetStateAction<Record<string, string>>>; audio: ListeningAudio }) {
  return (
    <div className="space-y-4">
      <div className="bg-slate-900/50 p-5 rounded-lg border border-slate-700">
        <button onClick={() => speak(audio.script)} className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg font-semibold mb-3">🔊 Escuchar dialogo</button>
        <p className="text-slate-400 text-sm italic">"{audio.script}"</p>
      </div>
      {audio.questions.map((q, idx) => (
        <div key={q.id} className="bg-slate-900/50 p-4 rounded-lg border border-slate-700">
          <p className="text-slate-200 mb-3 font-medium">{idx + 1}. {q.question}</p>
          <div className="flex gap-2 flex-wrap">
            {q.options.map((opt, i) => (
              <button key={i} onClick={() => setAnswers(p => ({ ...p, [q.id]: opt }))} className={`px-4 py-2 rounded-lg border transition-all ${answers[q.id] === opt ? 'bg-yellow-600 border-yellow-500 text-white' : 'bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600'}`}>{opt}</button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function MiniWritingExam({ answers, setAnswers, bank }: { answers: Record<string, string>; setAnswers: React.Dispatch<React.SetStateAction<Record<string, string>>>; bank: WritingExercise[] }) {
  return (
    <div className="space-y-4">
      <p className="text-slate-400 text-sm">Escribe tu respuesta. La IA la evaluara.</p>
      {bank.map((ex, idx) => (
        <div key={ex.id} className="bg-slate-900/50 p-4 rounded-lg border border-slate-700">
          {ex.type === 'unscramble' && ex.words ? (
            <div>
              <p className="text-slate-200 mb-3 font-medium">{idx + 1}. Ordena las palabras:</p>
              <div className="flex flex-wrap gap-2 mb-3">
                {ex.words.map((w, i) => <span key={i} className="px-3 py-1 bg-indigo-900/50 border border-indigo-600 rounded-lg text-white text-sm">{w}</span>)}
              </div>
              <input type="text" value={answers[ex.id] || ''} onChange={(e) => setAnswers(p => ({ ...p, [ex.id]: e.target.value }))} placeholder="Frase ordenada..." className="w-full p-3 rounded-lg bg-slate-700 text-white border border-slate-600 focus:border-indigo-500 focus:outline-none" />
            </div>
          ) : (
            <div>
              <p className="text-slate-200 mb-3 font-medium">{idx + 1}. {ex.question}</p>
              <input type="text" value={answers[ex.id] || ''} onChange={(e) => setAnswers(p => ({ ...p, [ex.id]: e.target.value }))} placeholder="Tu respuesta..." className="w-full p-3 rounded-lg bg-slate-700 text-white border border-slate-600 focus:border-indigo-500 focus:outline-none" />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function MiniPronunciationExam({ answers, setAnswers, bank }: { answers: Record<string, string>; setAnswers: React.Dispatch<React.SetStateAction<Record<string, string>>>; bank: PronunciationExercise[] }) {
  const startRecording = (id: string) => {
    // @ts-ignore
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { alert("Tu navegador no soporta reconocimiento de voz. Usa Chrome o Edge."); return; }
    const r = new SR(); r.lang = 'en-US';
    r.onresult = (e: any) => setAnswers(p => ({ ...p, [id]: e.results[0][0].transcript }));
    r.onerror = (e: any) => { if (e.error === 'no-speech') alert("No se detecto voz. Intenta de nuevo."); };
    r.start();
  };

  return (
    <div className="space-y-4">
      <p className="text-slate-400 text-sm">Lee la frase en voz alta y graba tu respuesta.</p>
      {bank.map((ex, idx) => (
        <div key={ex.id} className="bg-slate-900/50 p-4 rounded-lg border border-slate-700">
          <p className="text-slate-200 mb-3 font-medium">{idx + 1}. {ex.prompt}</p>
          <div className="flex gap-3">
            <button onClick={() => speak(ex.prompt)} className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold">🔊 Escuchar</button>
            <button onClick={() => startRecording(ex.id)} className="px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white rounded-lg font-semibold">🎤 Grabar</button>
          </div>
          {answers[ex.id] && <p className="text-slate-400 text-sm mt-2 italic">Tu respuesta: "{answers[ex.id]}"</p>}
        </div>
      ))}
    </div>
  );
}
