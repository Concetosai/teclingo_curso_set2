import { useState, useEffect, useRef } from 'react'
import './index.css'
import { useTheme } from './hooks/useTheme'
import ThemeToggle from './components/ThemeToggle'

const API_BASE = import.meta.env.VITE_API_URL || '';
import UnscrambleExercise from './components/UnscrambleExercise'
import WritingRulesPanel from './components/WritingRulesPanel'
import LibraryPanel from './components/LibraryPanel'
import ActivityEngine from './components/ActivityEngine'
import ExamPage from './components/ExamPage'
import TrueFalseExercise from './components/TrueFalseExercise'
import FlashcardExercise from './components/FlashcardExercise'
import HangmanExercise from './components/HangmanExercise'
import DragDropExercise from './components/DragDropExercise'
import TimerQuizExercise from './components/TimerQuizExercise'
import AIConversationExercise from './components/AIConversationExercise'
import OnboardingFlow from './components/Onboarding/OnboardingFlow';
import { loginConGoogle, logout, obtenerUsuarioActual } from './services/authService'
import { saveProgress, saveActivity, logEntrada, logSalida } from './services/sheetsService'
import { cargarEstadoTutor, type TutorContext } from './services/tutorService'
import { useLastSession } from './hooks/useLastSession'
import { speak as ttsSpeak, stop as ttsStop, pause as ttsPause, resume as ttsResume, isPlaying as ttsIsPlaying, isPaused as ttsIsPaused, setVoiceGender } from './services/ttsService'

interface SubtopicData {
  title: string;
  mcer_descriptor?: string;
  mcer_goal?: string;
  theory?: string;
  vocabulary?: string[];
  exercises?: {
    grammar?: { id: string; type?: string; question: string; options?: string[]; words?: string[]; answer: string }[];
    vocabulary?: { id: string; question: string; answer: string }[];
    reading?: { text: string; questions: { id: string; question: string; options: string[]; answer: string }[] };
    listening?: { script: string; questions: { id: string; question: string; options: string[]; answer: string }[] };
    speaking?: { id: string; prompt: string }[];
    writing?: { id: string; type: string; question?: string; prompt?: string; words?: string[]; answer?: string }[];
    pronunciation?: { id: string; phrase: string; focus: string }[];
  };
}

interface SubtopicMenu { subtopic_id: string; title: string; sequence_order: number; }
interface BatchResult { is_correct: boolean; score: number; feedback: string; pedagogical_reason: string; rule_hint?: string; }
interface BatchFeedback { summary: string; results: BatchResult[]; }
type SkillTab = 'grammar' | 'vocabulary' | 'reading' | 'listening' | 'writing' | 'pronunciation';
type MainTab = 'lesson' | 'settings' | 'progress' | 'library' | 'exam' | 'games';
type GameType = 'true_false' | 'flashcards' | 'hangman' | 'drag_drop' | 'timer_quiz' | 'ai_conversation' | null;

function loadExerciseState(userEmail: string, subtopicId: string) {
  try {
    const key = `teclingo_exercise_${userEmail}_${subtopicId}`;
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

function saveExerciseState(userEmail: string, subtopicId: string, state: any) {
  try {
    const key = `teclingo_exercise_${userEmail}_${subtopicId}`;
    localStorage.setItem(key, JSON.stringify(state));
  } catch {}
}

function extractSpokenPhrase(prompt: string): string {
  if (!prompt) return '';
  const firstQuote = prompt.search(/['"]/);
  if (firstQuote >= 0) {
    const lastQuote = prompt.lastIndexOf(prompt[firstQuote]);
    if (lastQuote > firstQuote) {
      return prompt.substring(firstQuote + 1, lastQuote).trim();
    }
  }
  const cleaned = prompt
    .replace(/^(say|dime|graba|habla|repeat|repite|introduce yourself|introduce a friend|introduce tu|introduce a|read aloud|lee en voz alta|lee|decir|responde)[\s:]+/i, '')
    .replace(/^['"]|['"]$/g, '')
    .trim();
  return cleaned || prompt;
}

function App() {
  const { theme, toggleTheme } = useTheme();
  const [user, setUser] = useState<any>(() => obtenerUsuarioActual());
  const [loggingIn, setLoggingIn] = useState(false);
  const [subtopicsList, setSubtopicsList] = useState<SubtopicMenu[]>([]);
  const [currentSubtopicId, setCurrentSubtopicId] = useState<string>('A1-M01-ST01');
  const [data, setData] = useState<SubtopicData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedAnswers, setSelectedAnswers] = useState<{[key: string]: string}>(() => {
    if (!user) return {};
    const saved = loadExerciseState(user.email, 'A1-M01-ST01');
    return saved?.selectedAnswers || {};
  });
  const [batchFeedbacks, setBatchFeedbacks] = useState<{[skill: string]: BatchFeedback}>(() => {
    if (!user) return {};
    const saved = loadExerciseState(user.email, 'A1-M01-ST01');
    return saved?.batchFeedbacks || {};
  });
  const [attempts, setAttempts] = useState<{[skill: string]: number}>(() => {
    if (!user) return {};
    const saved = loadExerciseState(user.email, 'A1-M01-ST01');
    return saved?.attempts || {};
  });
  const [completedSkills, setCompletedSkills] = useState<{[skill: string]: boolean}>(() => {
    if (!user) return {};
    const saved = loadExerciseState(user.email, 'A1-M01-ST01');
    return saved?.completedSkills || {};
  });
  const [evaluatingSkill, setEvaluatingSkill] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<MainTab>('lesson');
  const [skillTab, setSkillTab] = useState<SkillTab>('grammar');
  const [audioState, setAudioState] = useState<{ isPlaying: boolean; text: string }>({ isPlaying: false, text: '' });
  const [userContext, setUserContext] = useState({ country: 'México', city: 'Ciudad de México', institutional_world: 'tecnm' });
  const [realProgress, setRealProgress] = useState<any>(null);
  const [recordingKey, setRecordingKey] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [gameType, setGameType] = useState<GameType>(null);
  const [gameSkill, setGameSkill] = useState<string>('grammar');
  const [gameResults, setGameResults] = useState<{[key: string]: number}>({});
  const [navOpen, setNavOpen] = useState(false);
  const [showOnboardingManual, setShowOnboardingManual] = useState(false);
  const [_alternateExercises, setAlternateExercises] = useState<{[skill: string]: any}>({});
  const [openExercises, setOpenExercises] = useState<{[key: string]: boolean}>({});
  const [showGuestAlert, setShowGuestAlert] = useState(false);
  const [pendingLessonId, setPendingLessonId] = useState<string | null>(null);
  const [showHelpHint, setShowHelpHint] = useState(() => {
    return localStorage.getItem('teclingo_hide_help_hint') !== 'true';
  });
  const [showScrollHint, setShowScrollHint] = useState(() => {
    return localStorage.getItem('teclingo_hide_scroll_hint') !== 'true';
  });
  const scrollHintRef = useRef<HTMLDivElement>(null);
  const generatedOptionsCacheRef = useRef<Record<string, string[]>>({});
  const [showCertAlert, setShowCertAlert] = useState(false);
  const [showTrialMode, setShowTrialMode] = useState(false);
  const isGuest = user?.email?.includes('teclingo.local') || false;
  const isDemoUser = user?.email === 'demo@teclingo.local' || localStorage.getItem('teclingo_demo_mode') === 'true';
  const DEMO_LESSONS_LIMIT = 3;
  const recRef = useRef<any>(null);
  const timerRef = useRef<any>(null);
  const lessonContentRef = useRef<HTMLDivElement>(null);
  const skillsRef = useRef<HTMLDivElement>(null);
  const [loadingAlternate, setLoadingAlternate] = useState<string | null>(null);
  const [isAlternateMode, setIsAlternateMode] = useState<{[skill: string]: boolean}>({});
  const [showLessonGrid, setShowLessonGrid] = useState(false);
  const [showSkillsSection, setShowSkillsSection] = useState(false);
  const [showMiniGames, setShowMiniGames] = useState(false);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState<{[skill: string]: number}>({});
  const [questionAttemptCount, setQuestionAttemptCount] = useState<{[key: string]: number}>({});
  
  // Estados para el Modal de Ayuda
  const [showHelp, setShowHelp] = useState(false);
  const [currentHelpType, setCurrentHelpType] = useState<string>('grammar');

  // Estado del Tutor AI
  const [tutorContext, setTutorContext] = useState<TutorContext | null>(null);
  const [loadingTutor, setLoadingTutor] = useState(false);

  const openHelp = (type: string) => {
    setCurrentHelpType(type);
    setShowHelp(true);
  };

  const userId = user?.email || 'anonymous';
  const { lastSession, saveLastSession, hasRecentSession } = useLastSession(user?.email || null);

  // ==========================================
  // DICCIONARIO DE INSTRUCCIONES POR HABILIDAD/JUEGO
  // ==========================================
  const helpInstructions: Record<string, { title: string; instructions: string[] }> = {
    grammar: {
      title: "Cómo funciona: Grammar",
      instructions: [
        "Lee la oración o pregunta cuidadosamente.",
        "Selecciona la opción correcta o toca las palabras del banco para ordenar la oración.",
        "La IA evaluará tu respuesta automáticamente al seleccionarla.",
        "¡Tienes 2 intentos por pregunta!",
        "Si te equivocas, revisa la 'Regla gramatical' que te sugiere la IA."
      ]
    },
    vocabulary: {
      title: "Cómo funciona: Vocabulary",
      instructions: [
        "Primero, lee el texto y escucha el audio de referencia (si está disponible).",
        "Responde las preguntas escribiendo o seleccionando la palabra en inglés.",
        "Presta mucha atención a la ortografía (spelling).",
        "La IA evaluará tu respuesta automáticamente al seleccionarla."
      ]
    },
    reading: {
      title: "Cómo funciona: Reading",
      instructions: [
        "Lee el texto completo con calma. Puedes usar el botón '🔊 Escuchar texto'.",
        "Las preguntas aparecen abajo. Selecciona la opción que mejor responda según el texto.",
        "No necesitas saber todas las palabras, busca las ideas principales."
      ]
    },
    listening: {
      title: "Cómo funciona: Listening",
      instructions: [
        "Presiona '▶️ Play' para escuchar el diálogo o texto. Puedes pausarlo y repetirlo.",
        "Las preguntas están abajo. Elige la opción correcta basada en lo que escuchaste.",
        "Consejo: Anota mentalmente nombres, lugares o números mientras escuchas."
      ]
    },
    writing: {
      title: "Cómo funciona: Writing",
      instructions: [
        "Ordena las palabras para formar una oración correcta o escribe tu propia respuesta.",
        "Recuerda: Inicia con mayúscula y termina con punto (.)",
        "La IA evaluará tu gramática y te dará retroalimentación detallada.",
        "¡No copies la respuesta del ejercicio, intenta escribirlo tú!"
      ]
    },
    pronunciation: {
      title: "Cómo funciona: Speaking / Pronunciation",
      instructions: [
        "Presiona '🔊 Escuchar' para saber cómo debe sonar la frase.",
        "Presiona '🎤 Grabar' y lee la frase en voz alta y con claridad.",
        "El navegador te pedirá permiso para usar el micrófono la primera vez. Acepta.",
        "La IA comparará tu audio con la frase original y te dará un puntaje."
      ]
    },
    games: {
      title: "Cómo funcionan los Mini-Juegos",
      instructions: [
        "Elige una habilidad (Grammar, Vocabulary, etc.) en la parte superior.",
        "Selecciona el tipo de juego que prefieras (Flashcards, Hangman, Quiz, etc.).",
        "Los juegos son prácticos y sin límite de intentos. ¡Diviértete aprendiendo!",
        "Tu puntaje se guardará en tu historial de resultados."
      ]
    }
  };

  // Variables locales seguras (evitan errores "possibly undefined")
  const grammarExercises = data?.exercises?.grammar ?? [];
  const vocabularyExercises = data?.exercises?.vocabulary ?? [];
  const readingExercises = data?.exercises?.reading;
  const listeningExercises = data?.exercises?.listening;
  const writingExercises = data?.exercises?.writing ?? [];
  const speakingExercises = data?.exercises?.speaking ?? [];
  const pronunciationExercises = data?.exercises?.pronunciation ?? [];

  const loadAlternateExercises = async (skill: SkillTab) => {
    if (!data) return;
    setLoadingAlternate(skill);
    try {
      const response = await fetch(`${API_BASE}/api/course/generate-alternate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          skill,
          subtopic_id: currentSubtopicId,
          theory: data.theory || '',
          title: data.title || '',
          user_context: userContext
        })
      });
      const result = await response.json();
      if (result.exercises && result.exercises[skill]) {
        setAlternateExercises(prev => ({ ...prev, [skill]: result.exercises[skill] }));
        setIsAlternateMode(prev => ({ ...prev, [skill]: true }));
        setData(prev => prev ? { ...prev, exercises: { ...prev.exercises, [skill]: result.exercises[skill] } } : prev);
        setSelectedAnswers({});
        setBatchFeedbacks(prev => { const n = {...prev}; delete n[skill]; return n; });
        setAttempts(prev => ({ ...prev, [skill]: 0 }));
      }
    } catch (err) {
      console.error('Error loading alternate exercises:', err);
    } finally {
      setLoadingAlternate(null);
    }
  };

  const exitAlternateMode = (skill: SkillTab) => {
    setIsAlternateMode(prev => ({ ...prev, [skill]: false }));
    setSelectedAnswers({});
    setBatchFeedbacks(prev => { const n = {...prev}; delete n[skill]; return n; });
    setAttempts(prev => ({ ...prev, [skill]: 0 }));
    const worldParam = userContext.institutional_world;
    fetch(`${API_BASE}/api/course/subtopic/${currentSubtopicId}?world=${worldParam}`)
      .then(res => res.json())
      .then(original => setData(original))
      .catch(() => {});
  };

  const handleLogin = async () => {
    setLoggingIn(true);
    const result = await loginConGoogle();
    if (result.success) {
      setUser(result.usuario);
      logEntrada();
      // Restaurar última sesión guardada
      if (result.usuario?.email) {
        try {
          const raw = localStorage.getItem(`teclingo_last_session_${result.usuario.email}`);
          if (raw) {
            const session = JSON.parse(raw);
            const isRecent = Date.now() - session.timestamp < 7 * 24 * 60 * 60 * 1000;
            if (isRecent) {
              if (session.tab) setActiveTab(session.tab);
              if (session.subtopicId) setCurrentSubtopicId(session.subtopicId);
              if (session.skillTab) setSkillTab(session.skillTab);
            }
          }
        } catch {}
      }
    }
    setLoggingIn(false);
  };

  const handleLogout = () => { logSalida('cerrar_sesion'); logout(); setUser(null); };
  
  const openOnboarding = () => {
    setShowOnboardingManual(true);
  };

  const isSkillPerfect = (skill: string): boolean => {
    const fb = batchFeedbacks[skill];
    if (!fb?.results || fb.results.length === 0) return false;
    const exercises = getExercisesForSkill(skill);
    if (exercises.length === 0) return false;
    const answeredCount = fb.results.filter(Boolean).length;
    return answeredCount >= exercises.length && fb.results.every((r: any) => r && r.score === 100);
  };

  const allSkillsCompleted = (): boolean => {
    const skills: SkillTab[] = ['grammar', 'vocabulary', 'reading', 'listening', 'writing', 'pronunciation'];
    return skills.every(s => completedSkills[s]);
  };

  const lastLessonOrder = subtopicsList.length > 0 ? subtopicsList[subtopicsList.length - 1].sequence_order : 13;
  const isExamUnlocked = (realProgress?.overall_completion || 0) >= 100 && (realProgress?.overall_average || 0) >= 70;

  const toggleExercise = (key: string) => {
    setOpenExercises(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const getExerciseIcon = (fb: BatchResult | undefined, isLocked: boolean): string => {
    if (!fb) return '○';
    if (fb.is_correct) return '✅';
    if (isLocked) return '❌';
    return '📝';
  };

  const isExerciseOpen = (key: string): boolean => {
    return openExercises[key] === true;
  };

  const goToNextSkill = () => {
    const skills: SkillTab[] = ['grammar', 'vocabulary', 'reading', 'listening', 'writing', 'pronunciation'];
    const currentIdx = skills.indexOf(skillTab);
    if (currentIdx >= 0 && currentIdx < skills.length - 1) {
      setSkillTab(skills[currentIdx + 1]);
      setOpenExercises({});
    } else {
      const subIdx = subtopicsList.findIndex(s => s.subtopic_id === currentSubtopicId);
      if (subIdx >= 0 && subIdx < subtopicsList.length - 1) {
        setCurrentSubtopicId(subtopicsList[subIdx + 1].subtopic_id);
      } else {
        setActiveTab('lesson');
      }
    }
  };

  const getNextSkillLabel = (): string => {
    const labels: Record<string, string> = { grammar: 'Grammar', vocabulary: 'Vocabulary', reading: 'Reading', listening: 'Listening', writing: 'Writing', pronunciation: 'Speaking' };
    const skills: SkillTab[] = ['grammar', 'vocabulary', 'reading', 'listening', 'writing', 'pronunciation'];
    const idx = skills.indexOf(skillTab);
    if (idx >= 0 && idx < skills.length - 1) return labels[skills[idx + 1]] || 'Siguiente';
    return 'Siguiente lección';
  };

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (user) {
        logSalida('cierre_navegador');
        // Guardar sesión actual de forma síncrona antes de cerrar
        if (!isGuest) {
          saveLastSession({ tab: activeTab, subtopicId: currentSubtopicId, skillTab });
        }
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [user, isGuest, activeTab, currentSubtopicId, skillTab, saveLastSession]);

  const adaptText = (text: string | null | undefined): string => {
    if (!text) return '';
    let adapted = text;
    if (userContext.institutional_world === 'tecnm') {
      adapted = adapted.replace(/the Campus/gi, 'el TecNM').replace(/Campus/gi, 'TecNM');
    } else if (userContext.institutional_world === 'empresa') {
      adapted = adapted.replace(/the Campus/gi, 'la Empresa').replace(/Campus/gi, 'Oficina');
    } else if (userContext.institutional_world === 'viajes') {
      adapted = adapted.replace(/the Campus/gi, 'el destino').replace(/Campus/gi, 'ciudad');
    } else if (userContext.institutional_world === 'vida_diaria') {
      adapted = adapted.replace(/the Campus/gi, 'mi comunidad').replace(/Campus/gi, 'barrio');
    } else if (userContext.institutional_world === 'usa_university') {
      adapted = adapted.replace(/the Campus/gi, 'the University').replace(/Campus/gi, 'University');
    }
    return adapted;
  };

  useEffect(() => {
    if (!user) return;
    const worldParam = userContext.institutional_world;
    fetch(`${API_BASE}/api/course/module/A1-M01/subtopics?world=${worldParam}`)
      .then(res => res.json())
      .then(data => setSubtopicsList(Array.isArray(data) ? data : []))
      .catch(err => console.error(err));
  }, [user, userContext.institutional_world]);

  useEffect(() => {
    if (!user) return;
    const saved = loadExerciseState(user.email, currentSubtopicId);
    setSelectedAnswers(saved?.selectedAnswers || {});
    setBatchFeedbacks(saved?.batchFeedbacks || {});
    setAttempts(saved?.attempts || {});
    setSkillTab('grammar');
    setCurrentQuestionIdx({});
    setQuestionAttemptCount({});
    setLoading(true);
    const worldParam = userContext.institutional_world;
    Promise.all([
      fetch(`${API_BASE}/api/course/subtopic/${currentSubtopicId}?world=${worldParam}`)
        .then(async (res) => {
          const text = await res.text();
          if (text.trim().startsWith('<!doctype') || text.trim().startsWith('<html')) {
            console.error('[API] ⚠️ Backend devolvió HTML en /subtopic');
            return null;
          }
          return JSON.parse(text);
        }),
      fetch(`${API_BASE}/api/course/progress/${userId}/subtopic/${currentSubtopicId}`)
        .then(async (res) => {
          const text = await res.text();
          if (text.trim().startsWith('<!doctype') || text.trim().startsWith('<html')) {
            console.error('[API] ⚠️ Backend devolvió HTML en /progress/subtopic');
            return null;
          }
          return JSON.parse(text);
        })
    ]).then(([topicData, progressData]) => {
      if (topicData) setData(topicData);
      const dbCompleted: {[key: string]: boolean} = {};
      const dbAttempts: {[key: string]: number} = {};
      if (progressData && typeof progressData === 'object') {
        Object.entries(progressData).forEach(([skill, info]: [string, any]) => {
          dbAttempts[skill] = info.attempts || 0;
          if (info.score >= 100) dbCompleted[skill] = true;
        });
      }
      const mergedCompleted = { ...dbCompleted };
      Object.keys(mergedCompleted).forEach(k => { if (!mergedCompleted[k]) delete mergedCompleted[k]; });
      const mergedAttempts: {[key: string]: number} = {};
      (['grammar','vocabulary','reading','listening','writing','pronunciation'] as SkillTab[]).forEach(s => {
        mergedAttempts[s] = Math.max(saved?.attempts?.[s] || 0, dbAttempts[s] || 0);
      });
      setCompletedSkills(mergedCompleted);
      setAttempts(mergedAttempts);
      setLoading(false);
    }).catch(err => { console.error(err); setData(null); setLoading(false); });
  }, [currentSubtopicId, userContext.institutional_world, user, userId]);

  useEffect(() => {
    if (localStorage.getItem('teclingo_hide_scroll_hint') !== 'true') {
      setShowScrollHint(true);
    }
  }, [currentSubtopicId]);

  useEffect(() => {
    if (data && lessonContentRef.current) {
      setTimeout(() => {
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        lessonContentRef.current?.scrollIntoView({
          behavior: prefersReducedMotion ? 'auto' : 'smooth',
          block: 'start',
          inline: 'nearest'
        });
      }, 400);
    }
  }, [currentSubtopicId]);

  useEffect(() => {
    const setVH = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };
    setVH();
    window.addEventListener('resize', setVH);
    document.body.style.overflowX = 'hidden';
    document.documentElement.style.overflowX = 'hidden';
    return () => {
      window.removeEventListener('resize', setVH);
      document.body.style.overflowX = '';
      document.documentElement.style.overflowX = '';
    };
  }, []);

  useEffect(() => {
    if (!showScrollHint || !skillsRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setShowScrollHint(false); },
      { threshold: 0.3 }
    );
    observer.observe(skillsRef.current);
    return () => observer.disconnect();
  }, [showScrollHint, currentSubtopicId]);

  const fetchProgress = () => {
    if (!user) return;
    fetch(`${API_BASE}/api/course/progress/${userId}?world=${userContext.institutional_world}`)
      .then(async (res) => {
        const text = await res.text();
        if (text.trim().startsWith('<!doctype') || text.trim().startsWith('<html')) {
          console.error('[API] ⚠️ Backend devolvió HTML en /progress:', text.substring(0, 200));
          return null;
        }
        try { return JSON.parse(text); }
        catch { console.error('[API] ⚠️ Respuesta no es JSON válido:', text.substring(0, 200)); return null; }
      })
      .then(data => { if (data) setRealProgress(data); })
      .catch((err) => { console.error('[API] ❌ Error en /progress:', err); });
  };

  useEffect(() => {
    fetchProgress();
  }, [user, userContext.institutional_world, userId]);

  useEffect(() => {
    if (!user) return;
    Object.entries(attempts).forEach(([skill, count]) => {
      if ((count >= 2 || isSkillPerfect(skill)) && !completedSkills[skill]) {
        setCompletedSkills(prev => ({ ...prev, [skill]: true }));
      }
    });
  }, [attempts, completedSkills, user]);

  useEffect(() => {
    if (!user || !currentSubtopicId) return;
    saveExerciseState(user.email, currentSubtopicId, { selectedAnswers, batchFeedbacks, attempts, completedSkills });
  }, [selectedAnswers, batchFeedbacks, attempts, completedSkills, user, currentSubtopicId]);

  // Guardar última sesión (tab, subtopic, skill) para restaurar al volver
  useEffect(() => {
    if (!user || isGuest) return;
    saveLastSession({ tab: activeTab, subtopicId: currentSubtopicId, skillTab });
  }, [activeTab, currentSubtopicId, skillTab, user, isGuest, saveLastSession]);

  // Cargar estado del Tutor AI
  useEffect(() => {
    if (!user) return;
    setLoadingTutor(true);
    cargarEstadoTutor(userId).then(ctx => {
      setTutorContext(ctx);
      if (ctx?.state.preferred_voice_gender) {
        setVoiceGender(ctx.state.preferred_voice_gender);
      }
      setLoadingTutor(false);
    }).catch(() => setLoadingTutor(false));
  }, [user, userId]);

  // =============================================
  // PANTALLA DE SELECCIÓN DE EXPERIENCIAS (PRUEBA SIN REGISTRO)
  // =============================================
  if (showTrialMode && !user) {
    return (
      <div className="min-h-[100dvh] min-h-[calc(var(--vh,1vh)*100)] bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex flex-col justify-center p-3 relative overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-lime-500/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-[-15%] right-[-10%] w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 w-full max-w-md mx-auto animate-in fade-in duration-500 flex flex-col">
          {/* Header — compacto */}
          <div className="text-center mb-3">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-lime-500/10 border border-lime-500/20 mb-2">
              <span className="w-1.5 h-1.5 rounded-full bg-lime-400 animate-pulse"></span>
              <span className="text-[9px] font-mono tracking-widest text-lime-400 uppercase">Modo Prueba Activo</span>
            </div>
            <h1 className="text-xl font-black text-white mb-1">
              Elige tu <span className="text-lime-400">experiencia</span>
            </h1>
            <p className="text-slate-400 text-[11px] font-light">
              Explora sin registro. Descubre cómo TECLINGO puede entrenar tu cerebro.
            </p>
          </div>

          {/* Tarjetas — compactas */}
          <div className="space-y-2">
            {/* IA */}
            <button
              onClick={() => window.open('https://www.teclingoingles.com', '_blank')}
              className="group w-full text-left p-3 rounded-xl bg-slate-900/80 border border-slate-800/80 hover:border-lime-500/30 transition-all duration-300"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-lime-500/10 border border-lime-500/20 flex items-center justify-center text-lg flex-shrink-0">
                  🤖
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-white font-bold text-[13px] leading-tight group-hover:text-lime-400 transition-colors">Probar Herramientas IA</h3>
                  <p className="text-slate-400 text-[10px] leading-snug mt-0.5">Grammar, vocabulary, speaking y más. Evaluación automática con IA.</p>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    <span className="px-1.5 py-[1px] rounded-full bg-slate-800/60 text-[7px] font-mono text-slate-400 uppercase border border-slate-700/50">Grammar</span>
                    <span className="px-1.5 py-[1px] rounded-full bg-slate-800/60 text-[7px] font-mono text-slate-400 uppercase border border-slate-700/50">Vocabulary</span>
                    <span className="px-1.5 py-[1px] rounded-full bg-slate-800/60 text-[7px] font-mono text-slate-400 uppercase border border-slate-700/50">Speaking</span>
                    <span className="px-1.5 py-[1px] rounded-full bg-lime-500/10 text-[7px] font-mono text-lime-400 uppercase border border-lime-500/20">IA</span>
                  </div>
                </div>
                <div className="flex flex-col items-center flex-shrink-0 gap-0.5">
                  <span className="text-slate-600 group-hover:text-lime-400 transition-colors text-sm">→</span>
                  <span className="text-[7px] text-slate-600 font-mono">pestaña</span>
                </div>
              </div>
            </button>

            {/* Curso Express — Demo */}
            <button
              onClick={() => {
                const demoUser = { email: 'demo@teclingo.local', nombre: 'Usuario Demo' };
                setUser(demoUser);
                localStorage.setItem('teclingo_mock_user', JSON.stringify(demoUser));
                localStorage.setItem('teclingo_demo_mode', 'true');
                setCurrentSubtopicId('A1-M01-ST01');
                setActiveTab('lesson');
              }}
              className="group w-full text-left p-3 rounded-xl bg-slate-900/80 border border-slate-800/80 hover:border-emerald-500/30 transition-all duration-300"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-lg flex-shrink-0">
                  📚
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-white font-bold text-[13px] leading-tight group-hover:text-emerald-400 transition-colors">Curso Express</h3>
                    <span className="px-1.5 py-[1px] bg-amber-500/20 text-amber-400 text-[7px] font-bold uppercase rounded-full border border-amber-500/30">Demo</span>
                  </div>
                  <p className="text-slate-400 text-[10px] leading-snug mt-0.5">3 lecciones: Pronouns, Verb To Be, Negatives. Teoría + ejercicios.</p>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    <span className="px-1.5 py-[1px] rounded-full bg-slate-800/60 text-[7px] font-mono text-slate-400 uppercase">A1</span>
                    <span className="px-1.5 py-[1px] rounded-full bg-slate-800/60 text-[7px] font-mono text-slate-400 uppercase">3 lecciones</span>
                    <span className="px-1.5 py-[1px] rounded-full bg-amber-500/10 text-[7px] font-mono text-amber-400 uppercase border border-amber-500/20">Limitado</span>
                  </div>
                </div>
                <span className="text-slate-600 group-hover:text-emerald-400 transition-colors text-sm flex-shrink-0">→</span>
              </div>
            </button>

            {/* ADN Digital */}
            <button
              onClick={() => {
                const mockUser = { email: 'estudiante@teclingo.local', nombre: 'Estudiante de Prueba' };
                setUser(mockUser);
                localStorage.setItem('teclingo_mock_user', JSON.stringify(mockUser));
                setShowOnboardingManual(true);
              }}
              className="group w-full text-left p-3 rounded-xl bg-slate-900/80 border border-slate-800/80 hover:border-violet-500/30 transition-all duration-300"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-lg flex-shrink-0">
                  🧬
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-white font-bold text-[13px] leading-tight group-hover:text-violet-400 transition-colors">Descubre tu ADN Digital</h3>
                  <p className="text-slate-400 text-[10px] leading-snug mt-0.5">Perfil de aprendizaje, motivación, estilo y horario. 14 pasos.</p>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    <span className="px-1.5 py-[1px] rounded-full bg-slate-800/60 text-[7px] font-mono text-slate-400 uppercase">ADN</span>
                    <span className="px-1.5 py-[1px] rounded-full bg-slate-800/60 text-[7px] font-mono text-slate-400 uppercase">14 pasos</span>
                    <span className="px-1.5 py-[1px] rounded-full bg-slate-800/60 text-[7px] font-mono text-slate-400 uppercase">Videos</span>
                  </div>
                </div>
                <span className="text-slate-600 group-hover:text-violet-400 transition-colors text-sm flex-shrink-0">→</span>
              </div>
            </button>
          </div>

          {/* Botón volver */}
          <div className="mt-3 text-center">
            <button
              onClick={() => setShowTrialMode(false)}
              className="text-slate-500 hover:text-white text-[10px] font-medium transition-colors"
            >
              ← Volver a opciones de acceso
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-[100dvh] min-h-[calc(var(--vh,1vh)*100)] bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-3 relative overflow-hidden">
        {/* Fondo decorativo */}
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-lime-500/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-[-15%] right-[-10%] w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 w-full max-w-md flex flex-col items-center">
          {/* Card principal */}
          <div className="bg-slate-900/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-slate-800/80 overflow-hidden w-full">
            
            {/* Header con logo */}
            <div className="relative px-5 pt-6 pb-3 flex flex-col items-center">
              {/* Logo — compacto */}
              <div className="w-[72px] h-[72px] rounded-2xl shadow-xl shadow-lime-500/10 mb-2 overflow-hidden bg-slate-800/50 border border-slate-700/50 flex items-center justify-center">
                <img src="/assets/images/mascotas/teclingo_main_logo.webp" alt="Logo TECLINGO" className="w-full h-full object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              </div>

              {/* Badge animado */}
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-lime-500/10 border border-lime-500/20 mb-2">
                <span className="w-1.5 h-1.5 rounded-full bg-lime-400 animate-pulse"></span>
                <span className="text-[9px] font-mono tracking-widest text-lime-400 uppercase">Coach IA Activo</span>
              </div>

              {/* Título */}
              <h1 className="text-xl font-black tracking-tight text-white leading-tight mb-1">
                Tu coach personal<br/>
                <span className="text-lime-400">para hablar inglés.</span>
              </h1>

              {/* Subtítulo */}
              <p className="text-slate-400 text-[11px] font-light leading-snug max-w-[260px] text-center">
                Entrena tu cerebro con sesiones diarias de IA.
                <span className="text-lime-400/80 font-medium"> 7 días gratis.</span> Sin tarjeta.
              </p>

              {/* Badges de confianza — compactos */}
              <div className="flex flex-wrap justify-center gap-1.5 mt-2">
                <span className="px-2 py-0.5 rounded-full border border-slate-700/60 text-[8px] font-mono uppercase text-slate-400">🧠 Neuroplasticidad</span>
                <span className="px-2 py-0.5 rounded-full border border-slate-700/60 text-[8px] font-mono uppercase text-slate-400">⚡ 5 min/día</span>
                <span className="px-2 py-0.5 rounded-full border border-slate-700/60 text-[8px] font-mono uppercase text-slate-400">📈 Progreso real</span>
              </div>
            </div>

            {/* Botones de acción — compactos */}
            <div className="px-5 pb-4 space-y-2">
              {/* Botón principal */}
              <button
                onClick={() => setShowTrialMode(true)}
                className="group relative w-full py-3 bg-lime-400 hover:bg-lime-300 text-slate-950 rounded-xl font-black text-xs uppercase tracking-wider transition-all duration-300 shadow-lg shadow-lime-500/20 hover:shadow-lime-400/30 hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
              >
                <span className="absolute inset-0 rounded-xl overflow-hidden">
                  <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></span>
                </span>
                <span className="text-base">🚀</span>
                Comienza tu prueba gratuita
                <span className="text-xs opacity-70">→</span>
              </button>

              {/* Separador */}
              <div className="flex items-center gap-2 py-0.5">
                <div className="flex-1 h-px bg-slate-700/50"></div>
                <span className="text-[8px] font-mono uppercase tracking-widest text-slate-600">O accede con</span>
                <div className="flex-1 h-px bg-slate-700/50"></div>
              </div>

              {/* Botón Google */}
              <button
                onClick={handleLogin}
                disabled={loggingIn}
                className="w-full py-2.5 bg-slate-800/60 border border-slate-700/60 text-white text-[11px] font-medium rounded-xl hover:bg-slate-700/60 hover:border-slate-600 transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continuar con Google
              </button>

              {/* Social Proof — compacto inline */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-800/60">
                <div className="flex items-center gap-1.5">
                  <div className="flex -space-x-1.5">
                    {[1,2,3].map((i) => (
                      <div key={i} className="w-5 h-5 rounded-full bg-slate-700 border-2 border-slate-900 flex items-center justify-center text-[7px] text-white font-mono">
                        {String.fromCharCode(64 + i)}
                      </div>
                    ))}
                  </div>
                  <span className="text-[9px] text-slate-400">
                    <span className="text-lime-400 font-medium">2,500+</span> estudiantes
                  </span>
                </div>
                <div className="flex items-center gap-0.5">
                  <div className="flex text-lime-400 text-[9px]">★★★★★</div>
                  <span className="text-[8px] text-slate-500 font-mono">4.9/5</span>
                </div>
              </div>
            </div>
          </div>

          {/* Features grid — compacto fuera del card */}
          <div className="grid grid-cols-3 gap-2 mt-3 w-full px-1">
            {[
              { icon: "🧠", title: "Entrenamiento\ncerebral" },
              { icon: "🎯", title: "Speaking\npráctico" },
              { icon: "📊", title: "Progreso\nmedible" },
            ].map((feature, i) => (
              <div key={i} className="flex flex-col items-center text-center gap-1 p-2 rounded-xl bg-slate-900/40 border border-slate-800/40">
                <span className="text-lg">{feature.icon}</span>
                <span className="text-[9px] font-semibold text-slate-300 uppercase tracking-wider whitespace-pre-line leading-tight">{feature.title}</span>
              </div>
            ))}
          </div>

          {/* Botón DEV — fuera del viewport, accesible al final del scroll */}
          <button
            onClick={() => {
              const mockUser = { email: 'estudiante@teclingo.local', nombre: 'Estudiante de Prueba' };
              setUser(mockUser);
              localStorage.setItem('teclingo_mock_user', JSON.stringify(mockUser));
            }}
            className="mt-6 py-2 px-4 bg-transparent border border-slate-800/30 text-slate-700 text-[8px] font-mono uppercase tracking-widest hover:text-lime-400 hover:border-lime-500/30 transition-all duration-300 rounded-lg cursor-pointer"
          >
            🧪 DEV: modo prueba
          </button>
        </div>
      </div>
    );
  }

  const handleAnswerSelect = (key: string, answer: string) => {
    setSelectedAnswers(prev => ({ ...prev, [key]: answer }));
    const skill = key.split('-')[0];
    setBatchFeedbacks(prev => { const n = {...prev}; delete n[skill]; return n; });
  };

  const speak = (text: string) => {
    if (recordingKey) { stopRecording(); return; }
    if (audioState.isPlaying && audioState.text === text) { ttsPause(); setAudioState({ isPlaying: false, text: '' }); return; }
    if (!audioState.isPlaying && audioState.text === text && ttsIsPaused()) { ttsResume(); setAudioState({ isPlaying: true, text }); return; }
    ttsStop();
    setAudioState({ isPlaying: true, text });
    ttsSpeak(text, {
      rate: 0.92,
      onEnd: () => setAudioState({ isPlaying: false, text: '' }),
      onError: () => setAudioState({ isPlaying: false, text: '' }),
    });
  };

  const stopAudio = () => { ttsStop(); setAudioState({ isPlaying: false, text: '' }); };

  const stopRecording = () => {
    if (recRef.current) { try { recRef.current.stop(); } catch(e) {} recRef.current = null; }
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    setRecordingKey(null);
    setRecordingTime(0);
  };

  const startRecording = (key: string, onResult?: (transcript: string) => void) => {
    if (audioState.isPlaying) stopAudio();
    // @ts-ignore
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { alert("Tu navegador no soporta reconocimiento de voz. Usa Chrome o Edge."); return; }
    const r = new SR(); r.lang = 'en-US';
    recRef.current = r;
    setRecordingKey(key);
    setRecordingTime(0);
    const timerInterval = setInterval(() => setRecordingTime(p => p + 1), 1000);
    timerRef.current = timerInterval;
    r.onresult = (e: any) => {
      const transcript = e.results[0][0].transcript;
      handleAnswerSelect(key, transcript);
      clearInterval(timerInterval);
      timerRef.current = null;
      recRef.current = null;
      setRecordingKey(null);
      if (onResult) onResult(transcript);
    };
    r.onerror = (e: any) => {
      clearInterval(timerInterval);
      timerRef.current = null;
      recRef.current = null;
      setRecordingKey(null);
      if (e.error === 'no-speech') alert("No se detectó voz. Intenta de nuevo.");
    };
    r.onend = () => {
      clearInterval(timerInterval);
      timerRef.current = null;
      recRef.current = null;
      setRecordingKey(null);
    };
    r.start();
  };

  const formatRecordTime = (s: number) => { const m = Math.floor(s / 60); const sec = s % 60; return `${m}:${sec.toString().padStart(2, '0')}`; };

  const getExercisesForSkill = (skill: SkillTab): any[] => {
    switch(skill) {
      case 'grammar': return grammarExercises;
      case 'vocabulary': return vocabularyExercises;
      case 'reading': return readingExercises?.questions || [];
      case 'listening': return listeningExercises?.questions || [];
      case 'writing': return writingExercises;
      case 'pronunciation': return speakingExercises;
      default: return [];
    }
  };

  const isSkillQuestionsDone = (skill: SkillTab): boolean => {
    const exercises = getExercisesForSkill(skill);
    const idx = currentQuestionIdx[skill] || 0;
    return exercises.length > 0 && idx >= exercises.length;
  };

  const calculateSkillScore = (skill: SkillTab): number => {
    const fbs = batchFeedbacks[skill]?.results || [];
    const scores = fbs.filter(Boolean).map((r: any) => r.score || 0);
    return scores.length > 0 ? Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length) : 0;
  };

  const generateOptionsFromAnswer = (correctAnswer: string, allVocab: string[]): string[] => {
    if (!correctAnswer) return [];
    const distractors = allVocab
      .filter(w => w.length > 0 && w.toLowerCase() !== correctAnswer.toLowerCase())
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);
    const opts = [...distractors, correctAnswer].sort(() => Math.random() - 0.5);
    return opts.length >= 2 ? opts : [correctAnswer];
  };

  const getGeneratedOptions = (key: string, correctAnswer: string, allVocab: string[]): string[] => {
    if (!generatedOptionsCacheRef.current[key]) {
      generatedOptionsCacheRef.current[key] = generateOptionsFromAnswer(correctAnswer, allVocab);
    }
    return generatedOptionsCacheRef.current[key];
  };

  const autoEvaluateQuestion = async (skill: SkillTab, qIdx: number, answer: string) => {
    const exercises = getExercisesForSkill(skill);
    const ex = exercises[qIdx];
    if (!ex) return;

    const qKey = `${skill}-${qIdx}`;
    const currentQAttempts = questionAttemptCount[qKey] || 0;
    if (currentQAttempts >= 2) return;

    const correctAnswer = ex.answer || '';

    const normalize = (s: string) => s.toLowerCase().replace(/[.,!?;:'"()\[\]{}]/g, '').replace(/\s+/g, ' ').trim();

    const exactMatch = skill !== 'pronunciation' && correctAnswer && normalize(answer) === normalize(correctAnswer);

    const isUnscramble = Array.isArray(ex.words) && ex.words.length > 0;
    let unscrambleMatch = false;
    if (!exactMatch && isUnscramble && skill !== 'pronunciation') {
      const answerWords = normalize(answer).split(' ').filter(Boolean);
      const bankWords = ex.words.map((w: string) => normalize(w));
      const freq = (arr: string[]) => { const m: Record<string, number> = {}; arr.forEach(w => { m[w] = (m[w] || 0) + 1; }); return m; };
      const answerFreq = freq(answerWords);
      const bankFreq = freq(bankWords);
      const usedAll = answerWords.length === bankWords.length &&
        Object.keys(bankFreq).every(w => (answerFreq[w] || 0) === bankFreq[w]);
      if (usedAll) {
        const expectedNorm = normalize(correctAnswer);
        const answerNorm = normalize(answer);
        unscrambleMatch = answerNorm === expectedNorm;
        if (!unscrambleMatch) {
          const removeArticle = (s: string) => s.replace(/\b(the|a|an)\b/g, '').replace(/\s+/g, ' ').trim();
          unscrambleMatch = removeArticle(answerNorm) === removeArticle(expectedNorm);
        }
      }
    }

    const localMatch = exactMatch || unscrambleMatch;

    let fb: any;
    if (localMatch) {
      fb = {
        is_correct: true,
        score: 100,
        feedback: unscrambleMatch && !exactMatch
          ? '¡Correcto! Usaste todas las palabras del banco correctamente.'
          : '¡Correcto! Tu respuesta coincide exactamente con la esperada.',
        pedagogical_reason: 'Respuesta verificada localmente.',
      };
    } else {
      const payload = [{
        question: ex.question || ex.prompt || `Pregunta ${qIdx + 1}`,
        user_answer: answer,
        correct_answer: correctAnswer
      }];

      setEvaluatingSkill(skill);
      try {
        const response = await fetch(`${API_BASE}/api/course/feedback/batch`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ exercises: payload, user_context: userContext })
        });
        const result = await response.json();
        if (!result.results?.[0]) return;
        fb = result.results[0];
      } catch (err) {
        console.error("Error:", err);
        return;
      } finally {
        setEvaluatingSkill(null);
      }
    }

    const newQAttempts = currentQAttempts + 1;
    setQuestionAttemptCount(prev => ({ ...prev, [qKey]: newQAttempts }));

    setBatchFeedbacks(prev => {
      const existing = prev[skill] || { summary: '', results: [] };
      const newResults = [...existing.results];
      newResults[qIdx] = fb;
      return { ...prev, [skill]: { summary: existing.summary, results: newResults } };
    });

    const isLastQ = qIdx >= exercises.length - 1;
    let skillAttemptsForSave = attempts[skill] || 0;
    if (isLastQ && (fb.is_correct || fb.score >= 80 || newQAttempts >= 2)) {
      skillAttemptsForSave = (attempts[skill] || 0) + 1;
      setAttempts(prev => ({ ...prev, [skill]: skillAttemptsForSave }));
    }

    const allFbs = [...((batchFeedbacks[skill]?.results || []))];
    allFbs[qIdx] = fb;
    const scores = allFbs.filter(Boolean).map((r: any) => r.score || 0);
    const avgScore = scores.length > 0 ? Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length) : 0;

    if (!isDemoUser) {
      Promise.all([
        fetch(`${API_BASE}/api/course/progress/save`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: userId, subtopic_id: currentSubtopicId, skill, score: avgScore, attempts: skillAttemptsForSave, world: userContext.institutional_world })
        }),
        saveProgress({ subtopicId: currentSubtopicId, skill, score: avgScore, attempts: skillAttemptsForSave, world: userContext.institutional_world }),
        saveActivity('evaluacion', `${skill} - ${currentSubtopicId} - score:${avgScore}`)
      ]).catch(() => {});
    }

    if (fb.is_correct || fb.score >= 80 || newQAttempts >= 2) {
      setTimeout(() => {
        setCurrentQuestionIdx(prev => ({ ...prev, [skill]: qIdx + 1 }));
      }, fb.is_correct || fb.score >= 80 ? 1200 : 2500);
    }

    fetchProgress();
  };

  const getScoreColor = (score: number) => score >= 80 ? 'text-green-400' : score >= 50 ? 'text-yellow-400' : 'text-red-400';
  const getBorderColor = (score: number) => score >= 80 ? 'border-green-700' : score >= 50 ? 'border-yellow-700' : 'border-red-700';

  const skillLabels: { key: SkillTab; label: string; icon: string }[] = [
    { key: 'grammar', label: 'Grammar', icon: '📝' }, { key: 'vocabulary', label: 'Vocabulary', icon: '📚' },
    { key: 'reading', label: 'Reading', icon: '📖' }, { key: 'listening', label: 'Listening', icon: '🎧' },
    { key: 'writing', label: 'Writing', icon: '✍️' }, { key: 'pronunciation', label: 'Speaking', icon: '🎤' },
  ];

  if (loading) return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white text-xl">Cargando TECLINGO AI...</div>;
  
  if (showOnboardingManual && user) {
    return <OnboardingFlow userEmail={user.email} onComplete={() => { setShowOnboardingManual(false); setActiveTab('lesson'); setCurrentSubtopicId('A1-M01-ST01'); }} />;
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans">
      <div className="max-w-5xl mx-auto p-4 md:p-8">
        {isDemoUser && (
          <div className="bg-amber-600/15 border border-amber-500/30 px-3 py-2 rounded-lg mb-3 flex items-center justify-between text-[11px]">
            <div className="flex items-center gap-2">
              <span className="text-amber-400 font-semibold">🧪 Modo Demo</span>
              <span className="text-slate-500">|</span>
              <span className="text-slate-400">Acceso limitado a 3 lecciones</span>
            </div>
            <button onClick={() => { localStorage.removeItem('teclingo_demo_mode'); localStorage.removeItem('teclingo_mock_user'); setUser(null); }} className="text-amber-400 hover:text-amber-300 underline font-medium transition-colors">Salir</button>
          </div>
        )}
        <header className="mb-6 header-border">
          <div className="header-bar">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-blue-500">TECLINGO AI</h1>
              <p className="text-slate-400 text-xs md:text-sm mt-0.5">Nivel A1 - Modulo 1 · {user.nombre}</p>
            </div>
            <button onClick={() => setNavOpen(!navOpen)} className={`hamburger-btn ${navOpen ? 'hamburger-open' : ''}`}>
              <span className="hamburger-line"></span>
              <span className="hamburger-line"></span>
              <span className="hamburger-line"></span>
            </button>
            <div className="header-desktop-nav flex flex-wrap gap-2 items-center">
              <button onClick={() => { setActiveTab('lesson'); setNavOpen(false); }} className={`nav-btn-3d ${activeTab === 'lesson' ? 'nav-active-blue' : 'nav-btn-inactive'}`}><span className="nav-icon">📚</span> Lección</button>
              <button onClick={() => { setActiveTab('progress'); setNavOpen(false); }} className={`nav-btn-3d ${activeTab === 'progress' ? 'nav-active-green' : 'nav-btn-inactive'}`}><span className="nav-icon">📊</span> Progreso</button>
              <button onClick={() => { setActiveTab('library'); setNavOpen(false); }} className={`nav-btn-3d ${activeTab === 'library' ? 'nav-active-amber' : 'nav-btn-inactive'}`}><span className="nav-icon">📚</span> Librería</button>
              <button onClick={() => { setActiveTab('settings'); setNavOpen(false); }} className={`nav-btn-3d ${activeTab === 'settings' ? 'nav-active-purple' : 'nav-btn-inactive'}`}><span className="nav-icon">⚙️</span> Ajustes</button>
              <button onClick={() => { if (!isExamUnlocked) { setShowCertAlert(true); return; } setActiveTab('exam'); setNavOpen(false); }} className={`nav-btn-3d ${activeTab === 'exam' ? 'nav-active-amber' : 'nav-btn-inactive'}`} title={!isExamUnlocked ? 'Completa todas las lecciones con promedio 70+ para desbloquear' : 'Ir al Examen A1'}><span className="nav-icon">{isExamUnlocked ? '📝' : '🔒'}</span> Examen</button>
              <button onClick={() => { setActiveTab('games'); setGameType(null); setNavOpen(false); }} className={`nav-btn-3d ${activeTab === 'games' ? 'nav-active-pink' : 'nav-btn-inactive'}`}><span className="nav-icon">🎮</span> Juegos</button>
              <ThemeToggle theme={theme} onToggle={toggleTheme} variant="header" />
              <button onClick={() => { handleLogout(); setNavOpen(false); }} className="nav-btn-3d nav-btn-logout">Salir</button>
            </div>
          </div>
          <div className={`nav-accordion ${navOpen ? 'nav-accordion-open' : ''}`}>
            <div className="nav-accordion-grid">
              <button onClick={() => { setActiveTab('lesson'); setNavOpen(false); }} className={`nav-btn-3d ${activeTab === 'lesson' ? 'nav-active-blue' : 'nav-btn-inactive'}`}><span className="nav-icon">📚</span> Lección</button>
              <button onClick={() => { setActiveTab('progress'); setNavOpen(false); }} className={`nav-btn-3d ${activeTab === 'progress' ? 'nav-active-green' : 'nav-btn-inactive'}`}><span className="nav-icon">📊</span> Progreso</button>
              <button onClick={() => { setActiveTab('library'); setNavOpen(false); }} className={`nav-btn-3d ${activeTab === 'library' ? 'nav-active-amber' : 'nav-btn-inactive'}`}><span className="nav-icon">📚</span> Librería</button>
              <button onClick={() => { setActiveTab('settings'); setNavOpen(false); }} className={`nav-btn-3d ${activeTab === 'settings' ? 'nav-active-purple' : 'nav-btn-inactive'}`}><span className="nav-icon">⚙️</span> Ajustes</button>
              <button onClick={() => { if (!isExamUnlocked) { setShowCertAlert(true); return; } setActiveTab('exam'); setNavOpen(false); }} className={`nav-btn-3d ${activeTab === 'exam' ? 'nav-active-amber' : 'nav-btn-inactive'}`} title={!isExamUnlocked ? 'Completa todas las lecciones con promedio 70+ para desbloquear' : 'Ir al Examen A1'}><span className="nav-icon">{isExamUnlocked ? '📝' : '🔒'}</span> Examen</button>
              <button onClick={() => { setActiveTab('games'); setGameType(null); setNavOpen(false); }} className={`nav-btn-3d ${activeTab === 'games' ? 'nav-active-pink' : 'nav-btn-inactive'}`}><span className="nav-icon">🎮</span> Juegos</button>
              <ThemeToggle theme={theme} onToggle={toggleTheme} variant="header" />
              <button onClick={() => { handleLogout(); setNavOpen(false); }} className="nav-btn-3d nav-btn-logout" style={{ gridColumn: 'span 2' }}>Cerrar sesión</button>
            </div>
          </div>
        </header>

        {activeTab === 'progress' && (
          <div className="space-y-8 animate-in fade-in duration-300">
            {realProgress ? (
              <>
                {realProgress.a1_achieved && (
                  <div className="bg-gradient-to-r from-green-900/40 to-emerald-900/40 border-2 border-green-500 p-6 rounded-xl text-center">
                    <p className="text-5xl mb-2">🏆</p>
                    <h2 className="text-2xl font-bold text-green-400 mb-1">¡NIVEL A1 ALCANZADO!</h2>
                    <p className="text-green-300 text-sm">Has demostrado competencia en todas las habilidades del nivel A1.</p>
                  </div>
                )}

                {!realProgress.a1_achieved && (
                  <div className="space-y-6">

                    {/* === SECCION 1: Tarjeta principal con progreso === */}
                    <div className="panel-3d overflow-hidden">
                      <div className="bg-gradient-to-r from-blue-900/60 to-indigo-900/60 p-6 md:p-8">
                        {/* Header */}
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                          <div>
                            <h3 className="text-xl font-bold text-white mb-1 flex items-center gap-2">🗺️ Tu Camino hacia la Certificación A1</h3>
                            <p className="text-slate-400 text-sm">Módulos completados de 13 · {realProgress.overall_completion >= 100 ? '¡Listo para examen!' : 'Sigue avanzando'}</p>
                          </div>
                          <div className={`px-4 py-2 rounded-xl text-sm font-bold border ${realProgress.overall_completion >= 100 ? 'bg-green-900/30 border-green-500 text-green-400' : 'bg-blue-900/30 border-blue-500 text-blue-400'}`}>
                            {realProgress.overall_completion >= 100 ? '🔓 Examen Desbloqueado' : `${Math.round(realProgress.overall_completion)}% para desbloquear examen`}
                          </div>
                        </div>

                        {/* Barra de progreso principal */}
                        <div className="mb-2">
                          <div className="flex justify-between items-baseline mb-2">
                            <span className="text-sm font-semibold text-slate-300">Progreso Total</span>
                            <span className="text-lg font-bold text-blue-400">{Math.min(realProgress.overall_completion, 100)}%</span>
                          </div>
                          <div className="w-full bg-slate-700/80 rounded-full h-6 relative overflow-hidden">
                            <div
                              className="bg-gradient-to-r from-blue-500 to-indigo-400 h-6 rounded-full transition-all duration-700 ease-out relative"
                              style={{ width: `${Math.min(Math.max(realProgress.overall_completion, 2), 100)}%` }}
                            >
                              <div className="absolute inset-0 bg-gradient-to-b from-white/15 to-transparent rounded-full"></div>
                            </div>
                            <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white drop-shadow-lg pointer-events-none">
                              {realProgress.overall_completion > 5 ? `${Math.min(realProgress.overall_completion, 100)}%` : ''}
                            </div>
                          </div>
                        </div>

                        {/* Subtopicos como mini pasos */}
                        {subtopicsList.length > 0 && (
                          <div className="mt-4 pt-4 border-t border-blue-800/40">
                            <div className="flex items-center gap-0.5">
                              {subtopicsList.map((st, idx) => {
                                const totalLessons = subtopicsList.length;
                                const widthPct = totalLessons > 0 ? (100 / totalLessons) : 10;
                                const skills = ['grammar','vocabulary','reading','listening','writing','pronunciation'];
                                const hasProgress = skills.some(s => {
                                  const sStats = realProgress.skill_stats?.[s];
                                  return sStats && sStats.lessons_completed > 0 && st.sequence_order <= sStats.lessons_completed;
                                });
                                const isCompleted = st.sequence_order === lastLessonOrder || (realProgress.a1_skills_passed && Object.values(realProgress.a1_skills_passed).some(Boolean) && st.sequence_order <= 3);
                                let barColor = 'bg-slate-600';
                                if (isCompleted) barColor = 'bg-green-500';
                                else if (hasProgress) barColor = 'bg-amber-400';
                                return (
                                  <div key={st.subtopic_id} className="group/step relative flex flex-col items-center cursor-pointer" style={{ width: `${widthPct}%` }}>
                                    <div className={`w-full h-1.5 rounded-sm ${barColor} transition-all duration-200 group-hover/step:h-2.5 group-hover/step:shadow-lg`} style={{ minHeight: '4px' }}></div>
                                    <span className="text-[9px] text-slate-500 mt-1 leading-none group-hover/step:text-blue-300 transition-colors font-medium">{idx + 1}</span>
                                    {/* Tooltip */}
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover/step:opacity-100 transition-all duration-200 pointer-events-none z-30 whitespace-nowrap">
                                      <div className="bg-slate-800 border border-slate-600 text-white text-[10px] font-semibold px-2.5 py-1.5 rounded-lg shadow-xl">
                                        <span className="text-blue-300">#{idx + 1}</span> {st.title}
                                        {isCompleted && <span className="text-green-400 ml-1">✓</span>}
                                      </div>
                                      <div className="w-2 h-2 bg-slate-800 border-b border-r border-slate-600 rotate-45 mx-auto -mt-1"></div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                            <div className="flex gap-4 mt-2 justify-center">
                              <span className="flex items-center gap-1.5 text-[10px] text-slate-400"><span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block"></span>Completada</span>
                              <span className="flex items-center gap-1.5 text-[10px] text-slate-400"><span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block"></span>En progreso</span>
                              <span className="flex items-center gap-1.5 text-[10px] text-slate-400"><span className="w-2.5 h-2.5 rounded-full bg-slate-600 inline-block"></span>Sin iniciar</span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* 3 stats en fila inferior */}
                      <div className="grid grid-cols-3 divide-x divide-slate-700/50 bg-slate-800/30">
                        <div className="text-center py-4 px-3">
                          <p className="text-2xl font-bold text-white">{realProgress.overall_average}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5 uppercase tracking-wider font-medium">Promedio General</p>
                        </div>
                        <div className="text-center py-4 px-3">
                          <p className="text-2xl font-bold text-blue-400">{realProgress.total_entries}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5 uppercase tracking-wider font-medium">Ejercicios</p>
                        </div>
                        <div className="text-center py-4 px-3">
                          <p className="text-lg font-bold text-indigo-400 capitalize">{(realProgress.world || userContext.institutional_world).replace('_', ' ')}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5 uppercase tracking-wider font-medium">Tu Mundo</p>
                        </div>
                      </div>
                    </div>

                    {/* === SECCION 2: Habilidades A1 === */}
                    <div className="panel-3d overflow-hidden">
                      <button
                        onClick={() => setShowSkillsSection(!showSkillsSection)}
                        className="w-full flex items-center justify-between p-6 pb-0 cursor-pointer text-left"
                      >
                        <div>
                          <h3 className="text-lg font-bold text-white mb-1">📊 Habilidades A1</h3>
                          {!showSkillsSection && (
                            <p className="text-slate-400 text-xs">Promedio por habilidad. Toca para expandir.</p>
                          )}
                        </div>
                        <svg className={`w-5 h-5 text-slate-400 transition-transform duration-300 flex-shrink-0 ${showSkillsSection ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      <div className={`skills-section-body ${showSkillsSection ? 'open' : ''}`}>
                        <div className="px-6 pb-6 pt-2">
                          <p className="text-slate-400 text-xs mb-5">Promedio por habilidad. Necesitas alcanzar la meta para aprobar el nivel A1.</p>
                      <div className="space-y-4">
                        {Object.entries(realProgress.skill_stats || {}).map(([skill, stats]: [string, any]) => {
                          const thresholds: Record<string, number> = { grammar: 70, vocabulary: 70, reading: 60, listening: 60, writing: 60, pronunciation: 60 };
                          const icons: Record<string, string> = { grammar: '📝', vocabulary: '📚', reading: '📖', listening: '🎧', writing: '✍️', pronunciation: '🎤' };
                          const labels: Record<string, string> = { grammar: 'Grammar', vocabulary: 'Vocabulary', reading: 'Reading', listening: 'Listening', writing: 'Writing', pronunciation: 'Speaking' };
                          const passed = realProgress.a1_skills_passed?.[skill] || false;
                          const threshold = thresholds[skill] || 60;
                          const avg = stats.avg_score || 0;
                          const pct = Math.min(avg, 100);
                          const lessonsDone = stats.lessons_completed || 0;
                          const lessonsTotal = stats.total_lessons || lastLessonOrder;
                          const lessonPct = lessonsTotal > 0 ? (lessonsDone / lessonsTotal) * 100 : 0;
                          return (
                            <div key={skill} className={`p-4 rounded-xl border transition-all ${passed ? 'bg-green-900/20 border-green-600/50' : 'bg-slate-800/40 border-slate-700/60'}`}>
                              {/* Title row */}
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-lg">{icons[skill]}</span>
                                  <span className="text-sm font-bold text-white">{labels[skill]}</span>
                                </div>
                                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${passed ? 'bg-green-600 text-white' : 'bg-slate-700 text-slate-300'}`}>
                                  {passed ? '✅ A1 PASS' : `Meta: ${threshold}+`}
                                </span>
                              </div>
                              {/* Score bar */}
                              <div className="mb-2">
                                <div className="flex justify-between items-baseline mb-1">
                                  <span className="text-xs text-slate-400">Promedio</span>
                                  <span className="text-sm font-bold text-white">{avg}<span className="text-slate-500 font-normal">/100</span></span>
                                </div>
                                <div className="w-full bg-slate-700 rounded-full h-3 relative">
                                  <div className={`h-3 rounded-full transition-all ${passed ? 'bg-green-500' : avg >= threshold * 0.7 ? 'bg-amber-400' : avg > 0 ? 'bg-blue-500' : 'bg-slate-600'}`} style={{ width: `${Math.max(pct, avg > 0 ? 3 : 0)}%` }}></div>
                                  <div className="absolute top-0 h-full w-0.5 bg-white/50 z-10" style={{ left: `${threshold}%` }} title={`Meta A1: ${threshold}`}></div>
                                </div>
                              </div>
                              {/* Lessons progress */}
                              <div>
                                <div className="flex justify-between items-baseline mb-1">
                                  <span className="text-xs text-slate-400">Lecciones</span>
                                  <span className="text-xs font-semibold text-slate-300">{lessonsDone}<span className="text-slate-500">/{lessonsTotal}</span></span>
                                </div>
                                <div className="w-full bg-slate-700 rounded-full h-1.5">
                                  <div className="h-1.5 rounded-full bg-indigo-500 transition-all" style={{ width: `${Math.max(lessonPct, lessonsDone > 0 ? 5 : 0)}%` }}></div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                        </div>
                      </div>
                      </div>
                    </div>

                    {/* === SECCION 3: Siguiente paso === */}
                    {(() => {
                      const thresholds: Record<string, number> = { grammar: 70, vocabulary: 70, reading: 60, listening: 60, writing: 60, pronunciation: 60 };
                      const icons: Record<string, string> = { grammar: '📝', vocabulary: '📚', reading: '📖', listening: '🎧', writing: '✍️', pronunciation: '🎤' };
                      const labels: Record<string, string> = { grammar: 'Grammar', vocabulary: 'Vocabulary', reading: 'Reading', listening: 'Listening', writing: 'Writing', pronunciation: 'Speaking' };
                      const pending = Object.entries(realProgress.skill_stats || {}).filter(([skill, _stats]: [string, any]) => !realProgress.a1_skills_passed?.[skill]);
                      if (pending.length === 0) return null;
                      const weakest = pending.sort((a, b) => ((a[1] as any).avg_score || 0) - ((b[1] as any).avg_score || 0))[0];
                      const [worstSkill, worstStats] = weakest as [string, any];
                      const diff = (thresholds[worstSkill] || 60) - (worstStats.avg_score || 0);
                      return (
                        <div className="bg-gradient-to-r from-amber-900/30 to-orange-900/30 p-5 rounded-xl border border-amber-600/50">
                          <p className="text-amber-400 font-bold text-sm mb-1">💡 Siguiente Paso Recomendado</p>
                          <p className="text-slate-300 text-sm">
                            Tu habilidad más baja es <span className="text-white font-bold">{icons[worstSkill]} {labels[worstSkill]}</span> con {worstStats.avg_score}/100.
                            Necesitas <span className="text-amber-400 font-bold">+{Math.max(0, Math.round(diff))} puntos</span> para alcanzar el umbral A1 de {thresholds[worstSkill]}%.
                          </p>
                          <button onClick={() => setActiveTab('lesson')} className="mt-3 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-semibold transition-all">
                            📚 Practicar {labels[worstSkill]} ahora
                          </button>
                        </div>
                      );
                    })()}

                  </div>
                )}

                <div className="panel-3d p-6">
                  <h3 className="text-lg font-bold text-white mb-4">🚀 Acciones Rápidas</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <button onClick={() => setActiveTab('lesson')} className="action-btn-3d action-btn-blue p-4 text-left justify-start">
                      <div>
                        <p className="font-bold text-sm">📚 Practicar Lecciones</p>
                        <p className="text-blue-100/70 text-xs mt-1">Mejora tus habilidades con ejercicios</p>
                      </div>
                    </button>
                    <button onClick={() => { if (!isExamUnlocked) { setShowCertAlert(true); return; } setActiveTab('exam'); }} className={`action-btn-3d action-btn-amber p-4 text-left justify-start ${!isExamUnlocked ? 'opacity-60' : ''}`} title={!isExamUnlocked ? 'Completa todas las lecciones con promedio 70+ para desbloquear' : 'Tomar Examen A1'}>
                      <div>
                        <p className="font-bold text-sm">{isExamUnlocked ? '📝' : '🔒'} Tomar Examen A1</p>
                        <p className="text-amber-100/70 text-xs mt-1">{isExamUnlocked ? 'Certifica tu nivel' : 'Completa las lecciones primero'}</p>
                      </div>
                    </button>
                    <button onClick={() => setActiveTab('library')} className="action-btn-3d action-btn-purple p-4 text-left justify-start">
                      <div>
                        <p className="font-bold text-sm">📖 Ver Librería</p>
                        <p className="text-purple-100/70 text-xs mt-1">Consulta reglas gramaticales</p>
                      </div>
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center p-12 text-slate-400">
                <p className="text-4xl mb-4">📊</p>
                <p className="text-lg">Aún no hay datos de progreso.</p>
                <p className="text-sm mt-2">Empieza a practicar lecciones para ver tu avance aquí.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'library' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="panel-header-3d panel-header-amber p-6">
              <h2 className="text-2xl font-bold text-amber-400 mb-2">📚 Librería del Módulo 1</h2>
              <p className="text-slate-300 text-sm">Referencia rápida de todo lo que necesitas saber en este nivel.</p>
            </div>
            <LibraryPanel world={userContext.institutional_world} />
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-8 animate-in fade-in duration-300">
            <ThemeToggle theme={theme} onToggle={toggleTheme} variant="settings" />
            <div className="panel-header-3d panel-header-blue p-6 space-y-4">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-3xl">🌎</span>
                <div>
                  <h2 className="text-2xl font-bold text-white">Tu Realidad Local</h2>
                  <p className="text-blue-200 text-sm">La IA usará estos datos para adaptar nombres, lugares y ejemplos a tu entorno.</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                <div>
                  <label className="block text-blue-200 text-xs font-semibold mb-1.5 uppercase tracking-wider">Pais</label>
                  <select value={userContext.country} onChange={(e) => setUserContext({...userContext, country: e.target.value})} className="w-full bg-slate-800/80 text-white p-3 rounded-xl border border-blue-500/30 focus:border-blue-400 outline-none transition-all">
                    <option value="Mexico">MX Mexico</option><option value="Colombia">CO Colombia</option><option value="Argentina">AR Argentina</option><option value="Espana">ES Espana</option>
                  </select>
                </div>
                <div>
                  <label className="block text-blue-200 text-xs font-semibold mb-1.5 uppercase tracking-wider">Ciudad</label>
                  <input type="text" value={userContext.city} onChange={(e) => setUserContext({...userContext, city: e.target.value})} className="w-full bg-slate-800/80 text-white p-3 rounded-xl border border-blue-500/30 focus:border-blue-400 outline-none transition-all" placeholder="Ej. Monterrey, Puebla..." />
                </div>
                <div>
                  <label className="block text-blue-200 text-xs font-semibold mb-1.5 uppercase tracking-wider">Tu Institucion o Empresa</label>
                  <select 
                    value={userContext.institutional_world} 
                    onChange={(e) => setUserContext({ ...userContext, institutional_world: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                  >
                    <option value="tecnm">TecNM (Tecnologico Nacional)</option>
                    <option value="empresa">Empresa Exportadora / PyME</option>
                    <option value="usa_university">USA University</option>
                    <option value="viajes">Viajes</option>
                    <option value="vida_diaria">Vida Diaria</option>
                  </select>
                </div>
              </div>
            </div>
            <ActivityEngine onNavigateToGames={(gameType) => {
              setActiveTab('games');
              if (gameType === 'multiple_choice' || gameType === 'true_false') setGameType('true_false');
              else if (gameType === 'flashcards') setGameType('flashcards');
              else if (gameType === 'hangman') setGameType('hangman');
              else if (gameType === 'drag_drop') setGameType('drag_drop');
              else if (gameType === 'timed_quiz') setGameType('timer_quiz');
              else if (gameType === 'ai_conversation') setGameType('ai_conversation');
              else setGameType(null);
            }} />
          </div>
        )}

        {activeTab === 'exam' && (
          <ExamPage userId={userId} userContext={userContext} />
        )}

        {activeTab === 'games' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {!gameType ? (
              <>
                <div className="panel-header-3d panel-header-pink overflow-hidden">
                  <button
                    onClick={() => setShowMiniGames(!showMiniGames)}
                    className="w-full flex items-center justify-between p-6 pb-0 cursor-pointer text-left"
                  >
                    <div>
                      <h2 className="text-2xl font-bold text-pink-400 mb-1">🎮 Mini-Juegos</h2>
                      {!showMiniGames && (
                        <p className="text-slate-400 text-xs">Practica inglés de forma divertida. Toca para expandir.</p>
                      )}
                    </div>
                    <svg className={`w-5 h-5 text-slate-400 transition-transform duration-300 flex-shrink-0 ${showMiniGames ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>

                <div className={`skills-section-body ${showMiniGames ? 'open' : ''}`}>
                  <div className="px-0 pb-2 pt-2">
                    <p className="text-slate-300 text-sm mb-4 px-1">Practica inglés de forma divertida con juegos interactivos. ¡Usa el vocabulario y gramática de la lección actual!</p>

                    <div className="panel-3d p-4">
                      <p className="text-sm text-slate-400 mb-3">Selecciona una habilidad para practicar:</p>
                      <div className="flex flex-wrap gap-2">
                        {skillLabels.map(s => (
                          <button key={s.key} onClick={() => setGameSkill(s.key)} className={`skill-tab-3d ${gameSkill === s.key ? 'skill-tab-active' : 'skill-tab-inactive'}`}>
                            {s.icon} {s.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <button onClick={() => setGameType('true_false')} className="game-card-3d game-card-green p-6 text-left">
                        <p className="text-3xl mb-2">✅</p>
                        <h3 className="text-white font-bold">True / False</h3>
                        <p className="text-slate-400 text-sm mt-1">Determina si las oraciones son correctas</p>
                        <p className="text-green-400 text-xs mt-2">📝 Grammar · 📚 Vocabulary</p>
                      </button>
                      <button onClick={() => setGameType('flashcards')} className="game-card-3d game-card-purple p-6 text-left">
                        <p className="text-3xl mb-2">🃏</p>
                        <h3 className="text-white font-bold">Flashcards</h3>
                        <p className="text-slate-400 text-sm mt-1">Voltea tarjetas para memorizar vocabulario</p>
                        <p className="text-purple-400 text-xs mt-2">📚 Vocabulary</p>
                      </button>
                      <button onClick={() => setGameType('hangman')} className="game-card-3d game-card-orange p-6 text-left">
                        <p className="text-3xl mb-2">💀</p>
                        <h3 className="text-white font-bold">Hangman</h3>
                        <p className="text-slate-400 text-sm mt-1">Adivina la palabra letra por letra</p>
                        <p className="text-orange-400 text-xs mt-2">📚 Vocabulary · 📝 Grammar</p>
                      </button>
                      <button onClick={() => setGameType('drag_drop')} className="game-card-3d game-card-cyan p-6 text-left">
                        <p className="text-3xl mb-2">🎯</p>
                        <h3 className="text-white font-bold">Emparejar</h3>
                        <p className="text-slate-400 text-sm mt-1">Conecta palabras con sus traducciones</p>
                        <p className="text-cyan-400 text-xs mt-2">📚 Vocabulary</p>
                      </button>
                      <button onClick={() => setGameType('timer_quiz')} className="game-card-3d game-card-yellow p-6 text-left">
                        <p className="text-3xl mb-2">⏱️</p>
                        <h3 className="text-white font-bold">Quiz Reloj</h3>
                        <p className="text-slate-400 text-sm mt-1">Responde rápido antes de que se agote el tiempo</p>
                        <p className="text-yellow-400 text-xs mt-2">📝 All Skills</p>
                      </button>
                      <button onClick={() => setGameType('ai_conversation')} className="game-card-3d game-card-blue p-6 text-left">
                        <p className="text-3xl mb-2">🗣️</p>
                        <h3 className="text-white font-bold">AI Conversation</h3>
                        <p className="text-slate-400 text-sm mt-1">Chatea con el tutor de IA en inglés</p>
                        <p className="text-blue-400 text-xs mt-2">🎤 Speaking · ✍️ Writing</p>
                      </button>
                    </div>

                    {Object.keys(gameResults).length > 0 && (
                      <div className="panel-3d p-4">
                        <h3 className="text-white font-bold mb-3">📊 Resultados Recientes</h3>
                        <div className="space-y-2">
                          {Object.entries(gameResults).map(([game, score]) => (
                            <div key={game} className="flex items-center justify-between text-sm">
                              <span className="text-slate-300 capitalize">{game.replace('_', ' ')}</span>
                              <span className={`font-bold ${score >= 80 ? 'text-green-400' : score >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>{score}%</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="space-y-6">
                <button onClick={() => setGameType(null)} className="flex items-center gap-2 text-slate-400 hover:text-white transition-all">
                  ← Volver a Juegos
                </button>

                <div className="panel-3d p-4 flex items-center justify-between">
                  <h3 className="text-white font-bold">
                    {gameType === 'true_false' && '✅ True / False'}
                    {gameType === 'flashcards' && '🃏 Flashcards'}
                    {gameType === 'hangman' && '💀 Hangman'}
                    {gameType === 'drag_drop' && '🎯 Emparejar'}
                    {gameType === 'timer_quiz' && '⏱️ Quiz Reloj'}
                    {gameType === 'ai_conversation' && '🗣️ AI Conversation'}
                  </h3>
                  <span className="text-slate-400 text-sm">{skillLabels.find(s => s.key === gameSkill)?.icon} {skillLabels.find(s => s.key === gameSkill)?.label}</span>
                </div>

                <div className="panel-3d p-6">
                  {gameType === 'true_false' && grammarExercises.length > 0 && (
                    <TrueFalseExercise
                      exercises={grammarExercises}
                      onComplete={(score) => {
                        setGameResults({ ...gameResults, true_false: score });
                        if (!isDemoUser) {
                          saveProgress({ subtopicId: currentSubtopicId, skill: 'grammar', score, attempts: 1, world: userContext.institutional_world }).catch(() => {});
                          saveActivity('juego', `true_false - ${currentSubtopicId} - score:${score}`).catch(() => {});
                        }
                      }}
                    />
                  )}
                  {gameType === 'flashcards' && vocabularyExercises.length > 0 && (
                    <FlashcardExercise
                      exercises={vocabularyExercises}
                      onComplete={(score) => {
                        setGameResults({ ...gameResults, flashcards: score });
                        if (!isDemoUser) {
                          saveProgress({ subtopicId: currentSubtopicId, skill: 'vocabulary', score, attempts: 1, world: userContext.institutional_world }).catch(() => {});
                          saveActivity('juego', `flashcards - ${currentSubtopicId} - score:${score}`).catch(() => {});
                        }
                      }}
                    />
                  )}
                  {gameType === 'hangman' && vocabularyExercises.length > 0 && (
                    <HangmanExercise
                      exercises={vocabularyExercises}
                      onComplete={(score) => {
                        setGameResults({ ...gameResults, hangman: score });
                        if (!isDemoUser) {
                          saveProgress({ subtopicId: currentSubtopicId, skill: 'vocabulary', score, attempts: 1, world: userContext.institutional_world }).catch(() => {});
                          saveActivity('juego', `hangman - ${currentSubtopicId} - score:${score}`).catch(() => {});
                        }
                      }}
                    />
                  )}
                  {gameType === 'drag_drop' && vocabularyExercises.length > 0 && (
                    <DragDropExercise
                      exercises={vocabularyExercises}
                      onComplete={(score) => {
                        setGameResults({ ...gameResults, drag_drop: score });
                        if (!isDemoUser) {
                          saveProgress({ subtopicId: currentSubtopicId, skill: 'vocabulary', score, attempts: 1, world: userContext.institutional_world }).catch(() => {});
                          saveActivity('juego', `drag_drop - ${currentSubtopicId} - score:${score}`).catch(() => {});
                        }
                      }}
                    />
                  )}
                  {gameType === 'timer_quiz' && grammarExercises.length > 0 && (
                    <TimerQuizExercise
                      exercises={grammarExercises}
                      skill={gameSkill}
                      timePerQuestion={15}
                      onComplete={(score) => {
                        setGameResults({ ...gameResults, timer_quiz: score });
                        if (!isDemoUser) {
                          saveProgress({ subtopicId: currentSubtopicId, skill: gameSkill, score, attempts: 1, world: userContext.institutional_world }).catch(() => {});
                          saveActivity('juego', `timer_quiz - ${currentSubtopicId} - score:${score}`).catch(() => {});
                        }
                      }}
                    />
                  )}
                  {gameType === 'ai_conversation' && (
                    <AIConversationExercise
                      lessonContext={`${data?.title || ''}. ${data?.theory || ''}`}
                      subtopicId={currentSubtopicId}
                      world={userContext.institutional_world}
                      userContext={userContext}
                      onComplete={(score) => {
                        setGameResults({ ...gameResults, ai_conversation: score });
                        if (!isDemoUser) {
                          saveProgress({ subtopicId: currentSubtopicId, skill: 'pronunciation', score, attempts: 1, world: userContext.institutional_world }).catch(() => {});
                          saveActivity('juego', `ai_conversation - ${currentSubtopicId} - score:${score}`).catch(() => {});
                        }
                      }}
                    />
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'lesson' && (
          <div className="space-y-8">
            {/* CARD DE CONTEXTO DEL TUTOR AI */}
            {loadingTutor && (
              <div className="bg-slate-800/60 border border-purple-500/20 rounded-2xl p-4 animate-pulse">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg">🤖</span>
                  <span className="text-xs font-semibold text-purple-400 uppercase tracking-widest">Cargando contexto del Tutor...</span>
                </div>
                <div className="space-y-2">
                  <div className="h-3 bg-slate-700 rounded w-1/3"></div>
                  <div className="h-3 bg-slate-700 rounded w-2/3"></div>
                </div>
              </div>
            )}
            {!loadingTutor && tutorContext && (
              <div className="bg-gradient-to-r from-purple-900/40 to-indigo-900/40 border border-purple-500/30 rounded-2xl overflow-hidden">
                <div className="px-5 pt-4 pb-3">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-lg">🤖</span>
                    <h3 className="text-sm font-bold text-purple-300 uppercase tracking-widest">Tu Tutor IA — Día {tutorContext.state.current_day_number}</h3>
                  </div>
                  <div className="grid grid-cols-3 gap-3 mb-3">
                    <div className="text-center bg-slate-900/40 rounded-xl py-2 px-1">
                      <p className="text-xl font-black text-white">{tutorContext.state.streak_days}</p>
                      <p className="text-[9px] text-slate-400 uppercase tracking-wider">Racha 🔥</p>
                    </div>
                    <div className="text-center bg-slate-900/40 rounded-xl py-2 px-1">
                      <p className="text-xl font-black text-blue-400">{tutorContext.state.current_day_number}</p>
                      <p className="text-[9px] text-slate-400 uppercase tracking-wider">Día</p>
                    </div>
                    <div className="text-center bg-slate-900/40 rounded-xl py-2 px-1">
                      <p className="text-xl font-black text-emerald-400">{tutorContext.state.total_time_minutes}<span className="text-xs font-normal text-slate-500">m</span></p>
                      <p className="text-[9px] text-slate-400 uppercase tracking-wider">Practicado</p>
                    </div>
                  </div>
                  {tutorContext.next_prep && (
                    <div className="bg-slate-900/50 rounded-xl p-3 border border-slate-700/40">
                      <p className="text-[10px] text-purple-400 font-semibold uppercase tracking-wider mb-1">Tema de hoy</p>
                      <p className="text-white text-sm font-bold mb-2">{tutorContext.next_prep.topic}</p>
                      <div className="bg-slate-800/60 rounded-lg p-2.5 border border-slate-700/30">
                        <p className="text-[9px] text-slate-500 uppercase tracking-wider mb-1">Pregunta de calentamiento</p>
                        <p className="text-slate-200 text-xs leading-relaxed italic">"{tutorContext.next_prep.warmup_question}"</p>
                      </div>
                      {tutorContext.next_prep.suggested_vocabulary && (
                        <div className="mt-2">
                          <p className="text-[9px] text-slate-500 uppercase tracking-wider mb-1">Vocabulario sugerido</p>
                          <p className="text-slate-300 text-[11px] leading-relaxed">{tutorContext.next_prep.suggested_vocabulary}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
            {/* BARRA COMPACTA DE LECCIÓN ACTUAL (cuando la grilla está colapsada) */}
            {!showLessonGrid && data && (
              <div className="bg-slate-800/80 p-4 rounded-2xl border border-blue-500/30 flex items-center justify-between gap-3 lesson-change-flash">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <span className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-lg shadow-blue-500/30">
                    #{subtopicsList.find(s => s.subtopic_id === currentSubtopicId)?.sequence_order || '?'}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-blue-400 uppercase tracking-wider font-semibold">Lección actual</p>
                    <p className="text-white font-bold text-sm truncate">{adaptText(data.title)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => setShowLessonGrid(true)}
                    className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white rounded-xl text-sm font-semibold transition-all border border-slate-600 hover:border-blue-500"
                  >
                    📋 Cambiar
                  </button>
                </div>
              </div>
            )}
            {/* FLECHA INDICADORA DE CONTENIDO ABAJO */}
            {!showLessonGrid && data && (
              <div className="flex justify-center animate-bounce-slow">
                <div className="flex flex-col items-center gap-1 text-cyan-400">
                  <span className="text-xs font-semibold text-cyan-300 tracking-wide">Contenido abajo</span>
                  <svg className="w-5 h-5 drop-shadow-[0_0_8px_rgba(34,211,238,0.6)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            )}

            {/* GRILLA DE LECCIONES (solo visible cuando showLessonGrid es true o no hay data) */}
            {(showLessonGrid || !data) && (
            <div className="relative bg-slate-900 p-5 rounded-2xl border border-slate-700/50 shadow-2xl lesson-grid-panel">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-300 uppercase tracking-widest flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                  Selecciona una lección:
                </h3>
                {data && (
                  <button
                    onClick={() => setShowLessonGrid(false)}
                    aria-label="Cerrar panel de lecciones y ver contenido"
                    className="close-btn-prominent"
                  >
                    Cerrar y ver lección ↓
                  </button>
                )}
              </div>
              {data && (
                <div className="mb-3 text-center animate-pulse-slow">
                  <p className="text-cyan-300 text-sm font-bold mb-1 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]">Cierra la ventana y desliza hacia abajo para ver habilidades y retos</p>
                  <span className="bounce-arrow text-cyan-400 text-2xl drop-shadow-[0_0_12px_rgba(34,211,238,0.6)]">⬇</span>
                </div>
              )}
              {/* TARJETA: Continúa donde lo dejaste */}
              {lastSession && hasRecentSession() && lastSession.subtopicId && lastSession.subtopicId !== currentSubtopicId && (
                <button
                  onClick={() => {
                    if (isGuest) { setPendingLessonId(lastSession.subtopicId); setShowGuestAlert(true); return; }
                    setCurrentSubtopicId(lastSession.subtopicId);
                    if (lastSession.skillTab) setSkillTab(lastSession.skillTab as SkillTab);
                    setShowLessonGrid(false);
                  }}
                  className="w-full mb-4 p-4 rounded-xl bg-gradient-to-r from-lime-500/10 to-emerald-500/10 border border-lime-500/30 hover:border-lime-400/50 transition-all text-left group cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="w-2 h-2 rounded-full bg-lime-400 animate-pulse flex-shrink-0"></span>
                      <div>
                        <p className="text-[10px] font-mono uppercase tracking-widest text-lime-400">Continúa donde lo dejaste</p>
                        <p className="text-white text-sm font-bold group-hover:text-lime-300 transition-colors mt-0.5">
                          {subtopicsList.find(s => s.subtopic_id === lastSession.subtopicId)?.title || lastSession.subtopicId}
                        </p>
                      </div>
                    </div>
                    <span className="text-lime-500/60 group-hover:text-lime-400 transition-colors text-lg">→</span>
                  </div>
                </button>
              )}
              <div className="lesson-grid-3d">
                {isDemoUser && subtopicsList.length > DEMO_LESSONS_LIMIT && (
                  <div className="col-span-2 bg-amber-900/20 border border-amber-500/30 rounded-xl p-3 text-center mb-2">
                    <p className="text-amber-400 text-xs font-semibold">🔒 Modo Demo: {DEMO_LESSONS_LIMIT} de {subtopicsList.length} lecciones disponibles</p>
                    <p className="text-slate-500 text-[10px] mt-1">Crea una cuenta gratuita para acceder a todas las lecciones</p>
                  </div>
                )}
                {subtopicsList && subtopicsList.length > 0 && subtopicsList.map((st) => {
                  if (isDemoUser && st.sequence_order > DEMO_LESSONS_LIMIT) return null;
                  const isActive = currentSubtopicId === st.subtopic_id;
                  const isCompleted = st.sequence_order === lastLessonOrder || (currentSubtopicId === st.subtopic_id && allSkillsCompleted());
                  const btnClass = isActive ? 'lesson-btn-active' : isCompleted ? 'lesson-btn-completed' : 'lesson-btn-pending';
                  const displayTitle = adaptText(st.title) && adaptText(st.title).length > 28
                    ? adaptText(st.title).substring(0, 28) + '...'
                    : adaptText(st.title);
                  return (
                    <button key={st.subtopic_id} onClick={() => {
                      if (isGuest) { setPendingLessonId(st.subtopic_id); setShowGuestAlert(true); return; }
                      setCurrentSubtopicId(st.subtopic_id);
                      setShowLessonGrid(false);
                    }}
                      className={`lesson-btn-3d ${btnClass} ${isActive ? 'lesson-btn-just-selected' : ''}`}>
                      <span className="lesson-num">{st.sequence_order}</span>
                      <span className="lesson-title">{displayTitle}</span>
                      {isCompleted && <span className="lesson-check">✓</span>}
                    </button>
                  );
                })}
              </div>
            </div>
            )}

            {/* BOTÓN EXAMEN DE CERTIFICACIÓN A1 */}
            {data && realProgress && (() => {
              const allLessonsDone = subtopicsList.every(st => {
                if (st.sequence_order === lastLessonOrder) return true;
                return st.sequence_order < lastLessonOrder && (realProgress.skill_stats && Object.keys(realProgress.skill_stats).length > 0);
              });
              const completion100 = (realProgress.overall_completion || 0) >= 100;
              const avg70 = (realProgress.overall_average || 0) >= 70;
              const isUnlocked = completion100 && avg70;
              return (
                <div className={`relative p-5 rounded-2xl border-2 transition-all duration-300 ${isUnlocked
                  ? 'bg-gradient-to-br from-amber-900/30 via-yellow-900/20 to-orange-900/30 border-amber-500/60 shadow-lg shadow-amber-500/10 cursor-pointer hover:shadow-amber-500/25 hover:border-amber-400'
                  : 'bg-slate-800/60 border-slate-600/50 cursor-pointer hover:border-slate-500'
                }`}>
                  <div className="flex items-center gap-4">
                    <div className={`w-16 h-16 rounded-xl flex items-center justify-center text-3xl flex-shrink-0 ${isUnlocked
                      ? 'bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg'
                      : 'bg-slate-700/80'
                    }`}>
                      {isUnlocked ? '🎓' : '🔒'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className={`font-bold text-lg ${isUnlocked ? 'text-amber-300' : 'text-slate-400'}`}>
                        Examen de Certificación A1
                      </h4>
                      <p className={`text-sm mt-0.5 ${isUnlocked ? 'text-amber-400/70' : 'text-slate-500'}`}>
                        Evalúa todas tus habilidades en un solo examen.
                      </p>
                      {!isUnlocked && (
                        <div className="flex flex-col gap-1 mt-2">
                          <div className="flex items-center gap-2 text-xs">
                            <span className={completion100 ? 'text-green-400' : 'text-slate-500'}>
                              {completion100 ? '✅' : '❌'} Progreso: {realProgress.overall_completion || 0}% / 100%
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-xs">
                            <span className={avg70 ? 'text-green-400' : 'text-slate-500'}>
                              {avg70 ? '✅' : '❌'} Promedio mínimo: {realProgress.overall_average || 0} / 70
                            </span>
                          </div>
                        </div>
                      )}
                      {isUnlocked && (
                        <span className="inline-block mt-2 text-xs font-bold text-amber-300 bg-amber-500/20 px-3 py-1 rounded-full border border-amber-500/30">
                          ¡Listo para examinarte!
                        </span>
                      )}
                    </div>
                    <div className={`text-2xl ${isUnlocked ? 'text-amber-400' : 'text-slate-600'}`}>
                      ›
                    </div>
                  </div>
                  <div onClick={() => {
                    if (isGuest) { setShowGuestAlert(true); return; }
                    if (isUnlocked) return;
                    setShowCertAlert(true);
                  }} className="absolute inset-0 rounded-2xl" />
                </div>
              );
            })()}

            {data ? (
              <>
                <section key={currentSubtopicId} ref={lessonContentRef} className="panel-3d p-6 scroll-mt-20 lesson-content-enter">
                  <h2 className="text-xl font-bold text-white mb-2">{adaptText(data.title)}</h2>
                  <p className="text-slate-400 italic">"{data.mcer_goal || data.mcer_descriptor}"</p>
                </section>

                {showScrollHint && !showLessonGrid && (
                  <div ref={scrollHintRef} className="scroll-hint-card">
                    <button
                      onClick={() => {
                        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
                        skillsRef.current?.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'start' });
                      }}
                      className="scroll-hint-main"
                    >
                      <div className="scroll-hint-arrow-wrap">
                        <svg className="scroll-hint-arrow-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 5v14M5 12l7 7 7-7" />
                        </svg>
                      </div>
                      <span className="scroll-hint-text">El contenido de ejercicios está abajo — desliza para verlo</span>
                    </button>
                    <label className="scroll-hint-dismiss">
                      <input
                        type="checkbox"
                        onChange={(e) => {
                          if (e.target.checked) {
                            localStorage.setItem('teclingo_hide_scroll_hint', 'true');
                            if (scrollHintRef.current) {
                              scrollHintRef.current.classList.add('scroll-hint-fadeout');
                              setTimeout(() => setShowScrollHint(false), 300);
                            } else {
                              setShowScrollHint(false);
                            }
                          }
                        }}
                      />
                      <span>No volver a mostrar</span>
                    </label>
                  </div>
                )}

                {data.theory && <section className="panel-3d p-6"><h3 className="text-xl font-bold text-blue-400 mb-3">📖 Teoría</h3><p className="text-slate-300 leading-relaxed">{adaptText(data.theory)}</p></section>}

                {allSkillsCompleted() ? (
                  <section className="bg-gradient-to-b from-green-900/40 to-emerald-900/30 border-2 border-green-500 rounded-2xl p-8 text-center shadow-2xl">
                    <p className="text-5xl mb-4">🏆</p>
                    <h2 className="text-2xl font-bold text-green-400 mb-2">¡Lección Completada al 100%!</h2>
                    <p className="text-green-300/80 text-base mb-2">Has completado todas las secciones de esta lección con excelencia.</p>
                    <p className="text-slate-400 text-sm mb-6">Grammar ✅ Vocabulary ✅ Reading ✅ Listening ✅ Writing ✅ Speaking ✅</p>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                      <button onClick={() => {
                        const subIdx = subtopicsList.findIndex(s => s.subtopic_id === currentSubtopicId);
                        if (subIdx >= 0 && subIdx < subtopicsList.length - 1) {
                          setCurrentSubtopicId(subtopicsList[subIdx + 1].subtopic_id);
                        } else {
                          setActiveTab('lesson');
                        }
                      }} className="px-8 py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold text-lg transition-all shadow-lg shadow-green-900/50">
                        {subtopicsList.findIndex(s => s.subtopic_id === currentSubtopicId) < subtopicsList.length - 1 ? '➡️ Ir a la siguiente lección' : '🏠 Volver al panel principal'}
                      </button>
                      <button onClick={() => setActiveTab('progress')} className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-semibold text-base transition-all">
                        📊 Ver progreso
                      </button>
                    </div>
                  </section>
                ) : (
                <section ref={skillsRef} className="panel-3d panel-header-purple p-6 scroll-mt-20">
                  <h3 className="text-xl font-bold text-purple-400 mb-4">Práctica por Habilidad</h3>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex flex-wrap gap-2 border-b border-slate-700 pb-3">
                      {skillLabels.map(s => (<button key={s.key} onClick={() => setSkillTab(s.key)} className={`px-3 py-2 rounded-lg text-sm font-medium ${skillTab === s.key ? 'bg-purple-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>{s.icon} {s.label}</button>))}
                    </div>
                    <div className="relative group">
                      {showHelpHint && (
                        <div className="absolute bottom-full right-0 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none group-hover:pointer-events-auto z-30">
                          <div className="bg-slate-800/95 backdrop-blur-sm border border-slate-700/60 rounded-lg shadow-lg p-3 min-w-[200px]">
                            <p className="text-slate-300 text-xs mb-2 leading-relaxed">
                              ¿Necesitas ayuda? Haz clic aquí para ver las instrucciones.
                            </p>
                            <label className="flex items-center gap-2 cursor-pointer group/checkbox">
                              <input
                                type="checkbox"
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    localStorage.setItem('teclingo_hide_help_hint', 'true');
                                    setShowHelpHint(false);
                                  }
                                }}
                                className="w-3.5 h-3.5 rounded border-slate-600 bg-slate-700 text-purple-500 focus:ring-purple-500 focus:ring-offset-0 cursor-pointer"
                              />
                              <span className="text-slate-400 text-[10px] group-hover/checkbox:text-slate-300 transition-colors">
                                No volver a mostrar
                              </span>
                            </label>
                          </div>
                          <div className="absolute top-full right-4 -mt-px">
                            <div className="w-2 h-2 bg-slate-800/95 border-r border-b border-slate-700/60 rotate-45"></div>
                          </div>
                        </div>
                      )}
                      <button 
                        onClick={() => { openHelp(skillTab); if (showHelpHint) { setShowHelpHint(false); localStorage.setItem('teclingo_hide_help_hint', 'true'); } }}
                        className="flex items-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-blue-400 rounded-lg text-sm font-semibold transition-all border border-slate-600 hover:border-blue-500"
                        title="Ver instrucciones de esta sección"
                      >
                        <span className="text-lg">❓</span>
                        <span className="hidden sm:inline">¿Cómo funciona?</span>
                      </button>
                    </div>
                  </div>

                  {/* GRAMMAR */}
                  {skillTab === 'grammar' && grammarExercises.length > 0 && (
                    isSkillPerfect('grammar') ? (
                      <div className="flex flex-col items-center justify-center py-16 px-4">
                        <div className="text-center p-10 bg-gradient-to-b from-green-900/40 to-emerald-900/30 border-2 border-green-500 rounded-2xl shadow-2xl max-w-lg w-full">
                          <p className="text-5xl mb-4">🎉</p>
                          <p className="text-green-400 font-bold text-2xl mb-2">¡Felicitaciones!</p>
                          <p className="text-green-300 text-lg mb-2">¡Grammar completado al 100%!</p>
                          <p className="text-slate-400 text-sm mb-6">Has demostrado un dominio completo de esta sección.</p>
                          <div className="flex flex-col sm:flex-row gap-3 justify-center">
                            <button onClick={goToNextSkill} className="px-6 py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold text-base transition-all shadow-lg">
                              {'➡️ Ir a ' + getNextSkillLabel()}
                            </button>
                            <button onClick={() => setActiveTab('lesson')} className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-semibold text-base transition-all">
                              📋 Ir al menú principal
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                    <div className="space-y-6">
                      <div className="space-y-4">
                        {(() => {
                          const totalQ = grammarExercises.length;
                          const gIdx = currentQuestionIdx['grammar'] || 0;
                          const gDone = gIdx >= totalQ;
                          if (gDone) {
                            const score = calculateSkillScore('grammar');
                            const remaining = skillLabels.filter(s => s.key !== 'grammar' && !isSkillQuestionsDone(s.key) && !isSkillPerfect(s.key));
                            const allDone = skillLabels.every(s => isSkillQuestionsDone(s.key) || isSkillPerfect(s.key));
                            return (
                              <div className="flex flex-col items-center py-10 slide-up-anim">
                                <div className="text-center p-8 bg-gradient-to-b from-purple-900/40 to-violet-900/30 border-2 border-purple-500 rounded-2xl shadow-2xl max-w-md w-full celebration-glow">
                                  <p className="text-6xl mb-3">🎉</p>
                                  <h3 className="text-xl font-bold text-purple-400 mb-1">¡Grammar Completado!</h3>
                                  <p className="text-purple-300 text-lg mb-1">Puntaje: {score}/100</p>
                                  <p className="text-slate-400 text-sm mb-5">Has completado todas las preguntas de gramática.</p>
                                  {allDone ? (
                                    <div className="space-y-3 slide-up-anim-delay-2">
                                      <p className="text-amber-400 font-bold text-sm">🏆 ¡Todas las habilidades completadas!</p>
                                      <button onClick={() => { const subIdx = subtopicsList.findIndex(s => s.subtopic_id === currentSubtopicId); if (subIdx >= 0 && subIdx < subtopicsList.length - 1) setCurrentSubtopicId(subtopicsList[subIdx + 1].subtopic_id); else setActiveTab('lesson'); }} className="w-full px-6 py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold transition-all shadow-lg">➡️ Ir a la siguiente lección</button>
                                      <button onClick={() => setActiveTab('progress')} className="w-full px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-semibold transition-all">📊 Ver mi progreso</button>
                                    </div>
                                  ) : (
                                    <div className="space-y-3 slide-up-anim-delay-1">
                                      <p className="text-slate-300 text-sm">Continúa con la siguiente habilidad:</p>
                                      <div className="flex flex-wrap gap-2 justify-center">
                                        {remaining.length > 0 ? remaining.map(s => (
                                          <button key={s.key} onClick={() => setSkillTab(s.key)} className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-semibold transition-all text-sm">{s.icon} {s.label}</button>
                                        )) : (
                                          <button onClick={() => { const subIdx = subtopicsList.findIndex(s => s.subtopic_id === currentSubtopicId); if (subIdx >= 0 && subIdx < subtopicsList.length - 1) setCurrentSubtopicId(subtopicsList[subIdx + 1].subtopic_id); else setActiveTab('lesson'); }} className="px-6 py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold transition-all shadow-lg">➡️ Siguiente lección</button>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                  <button onClick={() => loadAlternateExercises('grammar')} disabled={loadingAlternate === 'grammar' || !!completedSkills['grammar']} className={`repasar-btn-3d mt-3 ${completedSkills['grammar'] ? 'repasar-completed' : ''}`}>
                                    {completedSkills['grammar'] ? '✅ Ejercicio completado' : (loadingAlternate === 'grammar' ? '🤖 Generando...' : '🔄 Repasar con 5 ejercicios diferentes')}
                                  </button>
                                </div>
                              </div>
                            );
                          }
                          const ex = grammarExercises[gIdx];
                          const key = `g-${ex.id || gIdx}`;
                          const fb: BatchResult | undefined = batchFeedbacks['grammar']?.results[gIdx];
                          const qKey = `grammar-${gIdx}`;
                          const qAttempts = questionAttemptCount[qKey] || 0;
                          const canInteract = qAttempts < 2 && !(fb?.is_correct);
                          const isUnscramble = ex.type === 'unscramble' && Array.isArray(ex.words) && ex.words.length > 0;
                          const hasOptions = ex.options && ex.options.length > 0;
                          return (
                            <div>
                              <div className="flex items-center gap-3 mb-5">
                                <span className="text-sm text-slate-400 font-medium whitespace-nowrap">Pregunta {gIdx + 1} de {totalQ}</span>
                                <div className="flex-1 bg-slate-700 rounded-full h-2.5"><div className="bg-purple-500 h-2.5 rounded-full transition-all duration-500" style={{ width: `${(gIdx / totalQ) * 100}%` }} /></div>
                                <span className="text-sm text-purple-400 font-bold">{batchFeedbacks['grammar']?.results?.filter((r: any) => r?.is_correct).length || 0}/{totalQ}</span>
                              </div>
                              <div className={`bg-slate-900/50 p-6 rounded-xl border-2 transition-all duration-300 ${fb?.is_correct ? 'border-green-500 bg-green-900/10' : fb && !fb.is_correct ? 'border-red-500/50 bg-red-900/10' : 'border-slate-700'}`}>
                                <p className="text-white font-semibold text-lg mb-5"><span className="text-purple-400 mr-2">{gIdx + 1}.</span>{ex.question || 'Ejercicio'}</p>
                                {isUnscramble ? (
                                  <UnscrambleExercise exercise={ex} index={gIdx} userAnswer={selectedAnswers[key] || ''} onAnswerChange={(answer: string) => canInteract && handleAnswerSelect(key, answer)} onComplete={() => canInteract && !fb && autoEvaluateQuestion('grammar', gIdx, selectedAnswers[key] || '')} feedback={fb} isLocked={!canInteract} />
                                ) : hasOptions ? (
                                  <div className="flex gap-3 flex-wrap">
                                    {ex.options!.map((opt: string, i: number) => (
                                      <button key={i} onClick={() => { if (canInteract) { handleAnswerSelect(key, opt); speak(opt); setTimeout(() => autoEvaluateQuestion('grammar', gIdx, opt), 300); } }} disabled={!canInteract}
                                        className={`exercise-opt-3d transition-all ${!canInteract ? (selectedAnswers[key] === opt ? (fb?.is_correct ? 'exercise-opt-selected !border-green-500 !bg-green-900/30' : 'exercise-opt-selected !border-red-500 !bg-red-900/30') : 'exercise-opt-locked') : selectedAnswers[key] === opt ? 'exercise-opt-selected' : 'exercise-opt-default'}`}
                                      >{opt}</button>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="space-y-3">
                                    <div className="flex gap-3 flex-wrap">
                                      {getGeneratedOptions(key, ex.answer, grammarExercises.map((e: any) => e.answer).filter(Boolean)).map((opt: string, i: number) => (
                                        <button key={i} onClick={() => { if (canInteract) { handleAnswerSelect(key, opt); speak(opt); setTimeout(() => autoEvaluateQuestion('grammar', gIdx, opt), 300); } }} disabled={!canInteract}
                                          className={`exercise-opt-3d transition-all ${!canInteract ? (selectedAnswers[key] === opt ? (fb?.is_correct ? 'exercise-opt-selected !border-green-500 !bg-green-900/30' : 'exercise-opt-selected !border-red-500 !bg-red-900/30') : 'exercise-opt-locked') : selectedAnswers[key] === opt ? 'exercise-opt-selected' : 'exercise-opt-default'}`}
                                        >{opt}</button>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                {evaluatingSkill === 'grammar' && <div className="mt-4 flex items-center gap-2 text-purple-400"><span className="animate-spin text-lg">⏳</span><span className="text-sm font-semibold">Evaluando...</span></div>}
                                {fb && (
                                  <div className={`mt-4 p-4 rounded-lg border transition-all slide-up-anim ${fb.is_correct ? 'bg-green-900/20 border-green-700' : 'bg-red-900/20 border-red-700'}`}>
                                    <span className={`font-bold text-lg ${fb.is_correct ? 'text-green-400' : 'text-yellow-400'}`}>{fb.is_correct ? '✅ ¡Correcto!' : '💡 ¡Casi!'}</span>
                                    <p className="text-slate-200 text-sm mt-1">{fb.feedback}</p>
                                    {!fb.is_correct && fb.rule_hint && <button onClick={() => setTimeout(() => setActiveTab('library'), 100)} className="mt-2 text-xs text-blue-400 hover:text-blue-300 underline">📖 Ver regla: {fb.rule_hint}</button>}
                                    {!fb.is_correct && qAttempts < 2 && <p className="text-yellow-400 text-xs mt-2 font-semibold animate-pulse">🔄 Selecciona otra opción para tu segundo intento.</p>}
                                    {!fb.is_correct && qAttempts >= 2 && <p className="text-slate-400 text-xs mt-2">Avanzando a la siguiente pregunta...</p>}
                                  </div>
                                )}
                                {fb && fb.is_correct && (
                                  <div className="mt-4 p-4 bg-slate-900/80 border border-cyan-500/30 rounded-xl flex items-center justify-between animate-fadeIn">
                                    <div>
                                      <span className="text-cyan-400 font-bold text-sm block">¡Correcto! Has ejercitado tu cerebro</span>
                                      <p className="text-xs text-slate-300">Sigue así para completar tu lección.</p>
                                    </div>
                                    <div className="w-16 h-16 flex items-center justify-center shrink-0">
                                      <img src="/assets/images/cerebro-gym.webp" alt="Cerebro Tec-English AI" className="w-full h-auto object-contain animate-bounce drop-shadow-[0_0_12px_rgba(6,182,212,0.4)]" />
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                    )
                  )}

                  {/* VOCABULARY */}
                  {skillTab === 'vocabulary' && vocabularyExercises.length > 0 && (
                    isSkillPerfect('vocabulary') ? (
                      <div className="flex flex-col items-center justify-center py-16 px-4">
                        <div className="text-center p-10 bg-gradient-to-b from-green-900/40 to-emerald-900/30 border-2 border-green-500 rounded-2xl shadow-2xl max-w-lg w-full">
                          <p className="text-5xl mb-4">🎉</p>
                          <p className="text-green-400 font-bold text-2xl mb-2">¡Felicitaciones!</p>
                          <p className="text-green-300 text-lg mb-2">¡Vocabulary completado al 100%!</p>
                          <p className="text-slate-400 text-sm mb-6">Has demostrado un dominio completo de esta sección.</p>
                          <div className="flex flex-col sm:flex-row gap-3 justify-center">
                            <button onClick={goToNextSkill} className="px-6 py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold text-base transition-all shadow-lg">
                              {'➡️ Ir a ' + getNextSkillLabel()}
                            </button>
                            <button onClick={() => setActiveTab('lesson')} className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-semibold text-base transition-all">
                              📋 Ir al menú principal
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                    <div className="space-y-6">
                      <div className="bg-gradient-to-r from-blue-900/40 to-purple-900/40 border border-blue-700 p-6 rounded-xl">
                        <h4 className="text-blue-400 font-semibold mb-3 flex items-center gap-2"><span>📚</span> Contexto de Referencia</h4>
                        <p className="text-slate-300 mb-4 text-sm">Lee el texto y escucha el audio para familiarizarte con el vocabulario.</p>
                        <div className="bg-yellow-900/30 border border-yellow-700 p-3 rounded-lg mb-4">
                          <p className="text-yellow-400 text-xs font-semibold mb-1">💡 Nota importante:</p>
                          <p className="text-slate-300 text-xs">El texto y el audio presentan situaciones diferentes para que practiques más vocabulario. ¡No son el mismo contenido!</p>
                        </div>
                        {readingExercises?.text && (
                          <div className="mb-4">
                            <div className="flex items-center gap-2 mb-2"><span className="text-green-400 font-semibold text-sm">📖 Texto de Lectura:</span></div>
                            <div className="bg-slate-900/60 p-4 rounded-lg border border-slate-700"><p className="text-slate-200 leading-relaxed text-sm">{adaptText(readingExercises.text)}</p></div>
                          </div>
                        )}
                        {listeningExercises?.script && (
                          <div className="mb-4">
                            <div className="flex items-center gap-2 mb-2"><span className="text-purple-400 font-semibold text-sm">🎧 Audio de Listening (contenido diferente):</span></div>
                            <div className="flex items-center gap-4 bg-slate-900/60 p-4 rounded-lg border border-slate-700">
                              <div className="flex gap-2">
                                <button onClick={() => speak(listeningExercises.script || '')} className={`px-4 py-2 rounded-lg font-semibold transition-all ${audioState.isPlaying && audioState.text === (listeningExercises.script || '') ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-purple-600 hover:bg-purple-700'} text-white`}>
                                  {audioState.isPlaying && audioState.text === (listeningExercises.script || '') ? '⏸️ Pausar' : '▶️ Play'}
                                </button>
                                {audioState.text === (listeningExercises.script || '') && <button onClick={stopAudio} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold">⏹️ Stop</button>}
                              </div>
                              <div className="flex-1"><p className="text-slate-400 text-xs italic">"{adaptText(listeningExercises.script)}"</p></div>
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="space-y-4">
                        {(() => {
                          const totalQ = vocabularyExercises.length;
                          const vIdx = currentQuestionIdx['vocabulary'] || 0;
                          const vDone = vIdx >= totalQ;
                          if (vDone) {
                            const score = calculateSkillScore('vocabulary');
                            const remaining = skillLabels.filter(s => s.key !== 'vocabulary' && !isSkillQuestionsDone(s.key) && !isSkillPerfect(s.key));
                            const allDone = skillLabels.every(s => isSkillQuestionsDone(s.key) || isSkillPerfect(s.key));
                            return (
                              <div className="flex flex-col items-center py-10 slide-up-anim">
                                <div className="text-center p-8 bg-gradient-to-b from-blue-900/40 to-indigo-900/30 border-2 border-blue-500 rounded-2xl shadow-2xl max-w-md w-full celebration-glow">
                                  <p className="text-6xl mb-3">🎉</p>
                                  <h3 className="text-xl font-bold text-blue-400 mb-1">¡Vocabulary Completado!</h3>
                                  <p className="text-blue-300 text-lg mb-1">Puntaje: {score}/100</p>
                                  <p className="text-slate-400 text-sm mb-5">Has completado todas las preguntas de vocabulario.</p>
                                  {allDone ? (
                                    <div className="space-y-3 slide-up-anim-delay-2">
                                      <p className="text-amber-400 font-bold text-sm">🏆 ¡Todas las habilidades completadas!</p>
                                      <button onClick={() => { const subIdx = subtopicsList.findIndex(s => s.subtopic_id === currentSubtopicId); if (subIdx >= 0 && subIdx < subtopicsList.length - 1) setCurrentSubtopicId(subtopicsList[subIdx + 1].subtopic_id); else setActiveTab('lesson'); }} className="w-full px-6 py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold transition-all shadow-lg">➡️ Ir a la siguiente lección</button>
                                      <button onClick={() => setActiveTab('progress')} className="w-full px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-semibold transition-all">📊 Ver mi progreso</button>
                                    </div>
                                  ) : (
                                    <div className="space-y-3 slide-up-anim-delay-1">
                                      <p className="text-slate-300 text-sm">Continúa con la siguiente habilidad:</p>
                                      <div className="flex flex-wrap gap-2 justify-center">
                                        {remaining.length > 0 ? remaining.map(s => (
                                          <button key={s.key} onClick={() => setSkillTab(s.key)} className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-semibold transition-all text-sm">{s.icon} {s.label}</button>
                                        )) : (
                                          <button onClick={() => { const subIdx = subtopicsList.findIndex(s => s.subtopic_id === currentSubtopicId); if (subIdx >= 0 && subIdx < subtopicsList.length - 1) setCurrentSubtopicId(subtopicsList[subIdx + 1].subtopic_id); else setActiveTab('lesson'); }} className="px-6 py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold transition-all shadow-lg">➡️ Siguiente lección</button>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                  <button onClick={() => loadAlternateExercises('vocabulary')} disabled={loadingAlternate === 'vocabulary' || !!completedSkills['vocabulary']} className={`repasar-btn-3d mt-3 ${completedSkills['vocabulary'] ? 'repasar-completed' : ''}`}>
                                    {completedSkills['vocabulary'] ? '✅ Ejercicio completado' : (loadingAlternate === 'vocabulary' ? '🤖 Generando...' : '🔄 Repasar con 5 ejercicios diferentes')}
                                  </button>
                                </div>
                              </div>
                            );
                          }
                          const ex = vocabularyExercises[vIdx];
                          const key = `v-${ex.id || vIdx}`;
                          const fb: BatchResult | undefined = batchFeedbacks['vocabulary']?.results[vIdx];
                          const qKey = `vocabulary-${vIdx}`;
                          const qAttempts = questionAttemptCount[qKey] || 0;
                          const canInteract = qAttempts < 2 && !(fb?.is_correct);
                          const options = ex.options || (ex.words && ex.words.length > 0 ? ex.words : generateOptionsFromAnswer(ex.answer, data?.vocabulary || []));
                          return (
                            <div>
                              <div className="flex items-center gap-3 mb-5">
                                <span className="text-sm text-slate-400 font-medium whitespace-nowrap">Pregunta {vIdx + 1} de {totalQ}</span>
                                <div className="flex-1 bg-slate-700 rounded-full h-2.5"><div className="bg-blue-500 h-2.5 rounded-full transition-all duration-500" style={{ width: `${(vIdx / totalQ) * 100}%` }} /></div>
                                <span className="text-sm text-blue-400 font-bold">{batchFeedbacks['vocabulary']?.results?.filter((r: any) => r?.is_correct).length || 0}/{totalQ}</span>
                              </div>
                              <div className={`bg-slate-900/50 p-6 rounded-xl border-2 transition-all duration-300 ${fb?.is_correct ? 'border-green-500 bg-green-900/10' : fb && !fb.is_correct ? 'border-red-500/50 bg-red-900/10' : 'border-slate-700'}`}>
                                <p className="text-white font-semibold text-lg mb-5"><span className="text-blue-400 mr-2">{vIdx + 1}.</span>{ex.question}</p>
                                {options && options.length > 0 ? (
                                  <div className="flex gap-3 flex-wrap">
                                    {options.map((opt: string, i: number) => (
                                      <button key={i} onClick={() => { if (canInteract) { handleAnswerSelect(key, opt); speak(opt); setTimeout(() => autoEvaluateQuestion('vocabulary', vIdx, opt), 300); } }} disabled={!canInteract}
                                        className={`exercise-opt-3d transition-all ${!canInteract ? (selectedAnswers[key] === opt ? (fb?.is_correct ? 'exercise-opt-selected !border-green-500 !bg-green-900/30' : 'exercise-opt-selected !border-red-500 !bg-red-900/30') : 'exercise-opt-locked') : selectedAnswers[key] === opt ? 'exercise-opt-selected' : 'exercise-opt-default'}`}
                                      >{opt}</button>
                                    ))}
                                  </div>
                                ) : (
                                  <UnscrambleExercise exercise={ex} index={vIdx} userAnswer={selectedAnswers[key] || ''} onAnswerChange={(answer: string) => canInteract && handleAnswerSelect(key, answer)} onComplete={() => canInteract && !fb && autoEvaluateQuestion('vocabulary', vIdx, selectedAnswers[key] || '')} feedback={fb} isLocked={!canInteract} />
                                )}
                                {evaluatingSkill === 'vocabulary' && <div className="mt-4 flex items-center gap-2 text-purple-400"><span className="animate-spin text-lg">⏳</span><span className="text-sm font-semibold">Evaluando...</span></div>}
                                {fb && (
                                  <div className={`mt-4 p-4 rounded-lg border transition-all slide-up-anim ${fb.is_correct ? 'bg-green-900/20 border-green-700' : 'bg-red-900/20 border-red-700'}`}>
                                    <span className={`font-bold text-lg ${fb.is_correct ? 'text-green-400' : 'text-yellow-400'}`}>{fb.is_correct ? '✅ ¡Correcto!' : '💡 ¡Casi!'}</span>
                                    <p className="text-slate-200 text-sm mt-1">{fb.feedback}</p>
                                    {!fb.is_correct && qAttempts < 2 && <p className="text-yellow-400 text-xs mt-2 font-semibold animate-pulse">🔄 Selecciona otra opción para tu segundo intento.</p>}
                                    {!fb.is_correct && qAttempts >= 2 && <p className="text-slate-400 text-xs mt-2">Avanzando a la siguiente pregunta...</p>}
                                  </div>
                                )}
                                {fb && fb.is_correct && (
                                  <div className="mt-4 p-4 bg-slate-900/80 border border-cyan-500/30 rounded-xl flex items-center justify-between animate-fadeIn">
                                    <div>
                                      <span className="text-cyan-400 font-bold text-sm block">¡Correcto! Has ejercitado tu cerebro</span>
                                      <p className="text-xs text-slate-300">Sigue así para completar tu lección.</p>
                                    </div>
                                    <div className="w-16 h-16 flex items-center justify-center shrink-0">
                                      <img src="/assets/images/cerebro-gym.webp" alt="Cerebro Tec-English AI" className="w-full h-auto object-contain animate-bounce drop-shadow-[0_0_12px_rgba(6,182,212,0.4)]" />
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                    )
                  )}

                  {/* READING */}
                  {skillTab === 'reading' && readingExercises && readingExercises.questions && readingExercises.questions.length > 0 && (
                    isSkillPerfect('reading') ? (
                      <div className="flex flex-col items-center justify-center py-16 px-4">
                        <div className="text-center p-10 bg-gradient-to-b from-green-900/40 to-emerald-900/30 border-2 border-green-500 rounded-2xl shadow-2xl max-w-lg w-full">
                          <p className="text-5xl mb-4">🎉</p>
                          <p className="text-green-400 font-bold text-2xl mb-2">¡Felicitaciones!</p>
                          <p className="text-green-300 text-lg mb-2">¡Reading completado al 100%!</p>
                          <p className="text-slate-400 text-sm mb-6">Has demostrado un dominio completo de esta sección.</p>
                          <div className="flex flex-col sm:flex-row gap-3 justify-center">
                            <button onClick={goToNextSkill} className="px-6 py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold text-base transition-all shadow-lg">
                              {'➡️ Ir a ' + getNextSkillLabel()}
                            </button>
                            <button onClick={() => setActiveTab('lesson')} className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-semibold text-base transition-all">
                              📋 Ir al menú principal
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                    <div className="space-y-6">
                      <div className="bg-gradient-to-r from-green-900/40 to-teal-900/40 border border-green-700 p-6 rounded-xl">
                        <h4 className="text-green-400 font-semibold mb-3 flex items-center gap-2"><span>📖</span> Texto de Lectura</h4>
                        <div className="bg-slate-900/60 p-4 rounded-lg border border-slate-700">
                          <p className="text-slate-200 leading-relaxed">{adaptText(readingExercises.text)}</p>
                        </div>
                        <button onClick={() => speak(readingExercises.text)} className={`mt-4 px-4 py-2 rounded-lg font-semibold transition-all ${audioState.isPlaying && audioState.text === readingExercises.text ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-green-600 hover:bg-green-700'} text-white`}>
                          {audioState.isPlaying && audioState.text === readingExercises.text ? '⏸️ Pausar' : '🔊 Escuchar texto'}
                        </button>
                      </div>
                      <div className="space-y-4">
                        <h4 className="text-green-400 font-semibold">Preguntas de Comprensión</h4>
                        {(() => {
                          const questions = readingExercises.questions;
                          const rIdx = currentQuestionIdx['reading'] || 0;
                          const totalQ = questions.length;
                          const rDone = rIdx >= totalQ;
                          if (rDone) {
                            const score = calculateSkillScore('reading');
                            const remaining = skillLabels.filter(s => s.key !== 'reading' && !isSkillQuestionsDone(s.key) && !isSkillPerfect(s.key));
                            const allDone = skillLabels.every(s => isSkillQuestionsDone(s.key) || isSkillPerfect(s.key));
                            return (
                              <div className="flex flex-col items-center py-10 slide-up-anim">
                                <div className="text-center p-8 bg-gradient-to-b from-green-900/40 to-emerald-900/30 border-2 border-green-500 rounded-2xl shadow-2xl max-w-md w-full celebration-glow">
                                  <p className="text-6xl mb-3">🎉</p>
                                  <h3 className="text-xl font-bold text-green-400 mb-1">¡Reading Completado!</h3>
                                  <p className="text-green-300 text-lg mb-1">Puntaje: {score}/100</p>
                                  <p className="text-slate-400 text-sm mb-5">Has completado todas las preguntas de comprensión.</p>
                                  {allDone ? (
                                    <div className="space-y-3 slide-up-anim-delay-2">
                                      <p className="text-amber-400 font-bold text-sm">🏆 ¡Todas las habilidades completadas!</p>
                                      <button onClick={() => { const subIdx = subtopicsList.findIndex(s => s.subtopic_id === currentSubtopicId); if (subIdx >= 0 && subIdx < subtopicsList.length - 1) setCurrentSubtopicId(subtopicsList[subIdx + 1].subtopic_id); else setActiveTab('lesson'); }} className="w-full px-6 py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold transition-all shadow-lg">➡️ Ir a la siguiente lección</button>
                                      <button onClick={() => setActiveTab('progress')} className="w-full px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-semibold transition-all">📊 Ver mi progreso</button>
                                    </div>
                                  ) : (
                                    <div className="space-y-3 slide-up-anim-delay-1">
                                      <p className="text-slate-300 text-sm">Continúa con la siguiente habilidad:</p>
                                      <div className="flex flex-wrap gap-2 justify-center">
                                        {remaining.length > 0 ? remaining.map(s => (
                                          <button key={s.key} onClick={() => setSkillTab(s.key)} className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-semibold transition-all text-sm">{s.icon} {s.label}</button>
                                        )) : (
                                          <button onClick={() => { const subIdx = subtopicsList.findIndex(s => s.subtopic_id === currentSubtopicId); if (subIdx >= 0 && subIdx < subtopicsList.length - 1) setCurrentSubtopicId(subtopicsList[subIdx + 1].subtopic_id); else setActiveTab('lesson'); }} className="px-6 py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold transition-all shadow-lg">➡️ Siguiente lección</button>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                  <button onClick={() => loadAlternateExercises('reading')} disabled={loadingAlternate === 'reading' || !!completedSkills['reading']} className={`repasar-btn-3d mt-3 ${completedSkills['reading'] ? 'repasar-completed' : ''}`}>
                                    {completedSkills['reading'] ? '✅ Ejercicio completado' : (loadingAlternate === 'reading' ? '🤖 Generando...' : '🔄 Repasar con 5 ejercicios diferentes')}
                                  </button>
                                </div>
                              </div>
                            );
                          }
                          const q = questions[rIdx];
                          const key = `r-${q.id || rIdx}`;
                          const fb: BatchResult | undefined = batchFeedbacks['reading']?.results[rIdx];
                          const qKey = `reading-${rIdx}`;
                          const qAttempts = questionAttemptCount[qKey] || 0;
                          const canInteract = qAttempts < 2 && !(fb?.is_correct);
                          return (
                            <div>
                              <div className="flex items-center gap-3 mb-5">
                                <span className="text-sm text-slate-400 font-medium whitespace-nowrap">Pregunta {rIdx + 1} de {totalQ}</span>
                                <div className="flex-1 bg-slate-700 rounded-full h-2.5"><div className="bg-green-500 h-2.5 rounded-full transition-all duration-500" style={{ width: `${(rIdx / totalQ) * 100}%` }} /></div>
                                <span className="text-sm text-green-400 font-bold">{batchFeedbacks['reading']?.results?.filter((r: any) => r?.is_correct).length || 0}/{totalQ}</span>
                              </div>
                              <div className={`bg-slate-900/50 p-6 rounded-xl border-2 transition-all duration-300 ${fb?.is_correct ? 'border-green-500 bg-green-900/10' : fb && !fb.is_correct ? 'border-red-500/50 bg-red-900/10' : 'border-slate-700'}`}>
                                <p className="text-white font-semibold text-lg mb-5"><span className="text-green-400 mr-2">{rIdx + 1}.</span>{q.question}</p>
                                <div className="flex gap-3 flex-wrap">
                                  {q.options.map((opt, i) => (
                                    <button key={i} onClick={() => { if (canInteract) { handleAnswerSelect(key, opt); speak(opt); setTimeout(() => autoEvaluateQuestion('reading', rIdx, opt), 300); } }} disabled={!canInteract}
                                      className={`exercise-opt-3d transition-all ${!canInteract ? (selectedAnswers[key] === opt ? (fb?.is_correct ? 'exercise-opt-selected !border-green-500 !bg-green-900/30' : 'exercise-opt-selected !border-red-500 !bg-red-900/30') : 'exercise-opt-locked') : selectedAnswers[key] === opt ? 'exercise-opt-selected' : 'exercise-opt-default'}`}
                                    >{opt}</button>
                                  ))}
                                </div>
                                {evaluatingSkill === 'reading' && <div className="mt-4 flex items-center gap-2 text-purple-400"><span className="animate-spin text-lg">⏳</span><span className="text-sm font-semibold">Evaluando...</span></div>}
                                {fb && (
                                  <div className={`mt-4 p-4 rounded-lg border transition-all slide-up-anim ${fb.is_correct ? 'bg-green-900/20 border-green-700' : 'bg-red-900/20 border-red-700'}`}>
                                    <span className={`font-bold text-lg ${fb.is_correct ? 'text-green-400' : 'text-yellow-400'}`}>{fb.is_correct ? '✅ ¡Correcto!' : '💡 ¡Casi!'}</span>
                                    <p className="text-slate-200 text-sm mt-1">{fb.feedback}</p>
                                    {!fb.is_correct && qAttempts < 2 && <p className="text-yellow-400 text-xs mt-2 font-semibold animate-pulse">🔄 Selecciona otra opción para tu segundo intento.</p>}
                                    {!fb.is_correct && qAttempts >= 2 && <p className="text-slate-400 text-xs mt-2">Avanzando a la siguiente pregunta...</p>}
                                  </div>
                                )}
                                {fb && fb.is_correct && (
                                  <div className="mt-4 p-4 bg-slate-900/80 border border-cyan-500/30 rounded-xl flex items-center justify-between animate-fadeIn">
                                    <div>
                                      <span className="text-cyan-400 font-bold text-sm block">¡Correcto! Has ejercitado tu cerebro</span>
                                      <p className="text-xs text-slate-300">Sigue así para completar tu lección.</p>
                                    </div>
                                    <div className="w-16 h-16 flex items-center justify-center shrink-0">
                                      <img src="/assets/images/cerebro-gym.webp" alt="Cerebro Tec-English AI" className="w-full h-auto object-contain animate-bounce drop-shadow-[0_0_12px_rgba(6,182,212,0.4)]" />
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  )
                  )}

                  {/* LISTENING */}
                  {skillTab === 'listening' && listeningExercises && listeningExercises.questions && listeningExercises.questions.length > 0 && (
                    isSkillPerfect('listening') ? (
                      <div className="flex flex-col items-center justify-center py-16 px-4">
                        <div className="text-center p-10 bg-gradient-to-b from-green-900/40 to-emerald-900/30 border-2 border-green-500 rounded-2xl shadow-2xl max-w-lg w-full">
                          <p className="text-5xl mb-4">🎉</p>
                          <p className="text-green-400 font-bold text-2xl mb-2">¡Felicitaciones!</p>
                          <p className="text-green-300 text-lg mb-2">¡Listening completado al 100%!</p>
                          <p className="text-slate-400 text-sm mb-6">Has demostrado un dominio completo de esta sección.</p>
                          <div className="flex flex-col sm:flex-row gap-3 justify-center">
                            <button onClick={goToNextSkill} className="px-6 py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold text-base transition-all shadow-lg">
                              {'➡️ Ir a ' + getNextSkillLabel()}
                            </button>
                            <button onClick={() => setActiveTab('lesson')} className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-semibold text-base transition-all">
                              📋 Ir al menú principal
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                    <div className="space-y-6">
                      <div className="bg-gradient-to-r from-purple-900/40 to-indigo-900/40 border border-purple-700 p-6 rounded-xl">
                        <h4 className="text-purple-400 font-semibold mb-3 flex items-center gap-2"><span>🎧</span> Audio de Listening</h4>
                        <div className="bg-slate-900/60 p-4 rounded-lg border border-slate-700">
                          <p className="text-slate-400 text-xs italic mb-3">Escucha el audio y responde las preguntas:</p>
                          <p className="text-slate-200 leading-relaxed italic">"{adaptText(listeningExercises.script)}"</p>
                        </div>
                        <div className="flex gap-3 mt-4">
                          <button onClick={() => speak(listeningExercises.script)} className={`px-4 py-2 rounded-lg font-semibold transition-all ${audioState.isPlaying && audioState.text === listeningExercises.script ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-purple-600 hover:bg-purple-700'} text-white`}>
                            {audioState.isPlaying && audioState.text === listeningExercises.script ? '⏸️ Pausar' : '▶️ Play'}
                          </button>
                          {audioState.text === listeningExercises.script && <button onClick={stopAudio} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold">⏹️ Stop</button>}
                        </div>
                      </div>
                      <div className="space-y-4">
                        <h4 className="text-purple-400 font-semibold">Preguntas de Listening</h4>
                        {(() => {
                          const questions = listeningExercises.questions;
                          const lIdx = currentQuestionIdx['listening'] || 0;
                          const totalQ = questions.length;
                          const lDone = lIdx >= totalQ;
                          if (lDone) {
                            const score = calculateSkillScore('listening');
                            const remaining = skillLabels.filter(s => s.key !== 'listening' && !isSkillQuestionsDone(s.key) && !isSkillPerfect(s.key));
                            const allDone = skillLabels.every(s => isSkillQuestionsDone(s.key) || isSkillPerfect(s.key));
                            return (
                              <div className="flex flex-col items-center py-10 slide-up-anim">
                                <div className="text-center p-8 bg-gradient-to-b from-purple-900/40 to-indigo-900/30 border-2 border-purple-500 rounded-2xl shadow-2xl max-w-md w-full celebration-glow">
                                  <p className="text-6xl mb-3">🎉</p>
                                  <h3 className="text-xl font-bold text-purple-400 mb-1">¡Listening Completado!</h3>
                                  <p className="text-purple-300 text-lg mb-1">Puntaje: {score}/100</p>
                                  <p className="text-slate-400 text-sm mb-5">Has completado todas las preguntas de listening.</p>
                                  {allDone ? (
                                    <div className="space-y-3 slide-up-anim-delay-2">
                                      <p className="text-amber-400 font-bold text-sm">🏆 ¡Todas las habilidades completadas!</p>
                                      <button onClick={() => { const subIdx = subtopicsList.findIndex(s => s.subtopic_id === currentSubtopicId); if (subIdx >= 0 && subIdx < subtopicsList.length - 1) setCurrentSubtopicId(subtopicsList[subIdx + 1].subtopic_id); else setActiveTab('lesson'); }} className="w-full px-6 py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold transition-all shadow-lg">➡️ Ir a la siguiente lección</button>
                                      <button onClick={() => setActiveTab('progress')} className="w-full px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-semibold transition-all">📊 Ver mi progreso</button>
                                    </div>
                                  ) : (
                                    <div className="space-y-3 slide-up-anim-delay-1">
                                      <p className="text-slate-300 text-sm">Continúa con la siguiente habilidad:</p>
                                      <div className="flex flex-wrap gap-2 justify-center">
                                        {remaining.length > 0 ? remaining.map(s => (
                                          <button key={s.key} onClick={() => setSkillTab(s.key)} className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-semibold transition-all text-sm">{s.icon} {s.label}</button>
                                        )) : (
                                          <button onClick={() => { const subIdx = subtopicsList.findIndex(s => s.subtopic_id === currentSubtopicId); if (subIdx >= 0 && subIdx < subtopicsList.length - 1) setCurrentSubtopicId(subtopicsList[subIdx + 1].subtopic_id); else setActiveTab('lesson'); }} className="px-6 py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold transition-all shadow-lg">➡️ Siguiente lección</button>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                  <button onClick={() => loadAlternateExercises('listening')} disabled={loadingAlternate === 'listening' || !!completedSkills['listening']} className={`repasar-btn-3d mt-3 ${completedSkills['listening'] ? 'repasar-completed' : ''}`}>
                                    {completedSkills['listening'] ? '✅ Ejercicio completado' : (loadingAlternate === 'listening' ? '🤖 Generando...' : '🔄 Repasar con 5 ejercicios diferentes')}
                                  </button>
                                </div>
                              </div>
                            );
                          }
                          const q = questions[lIdx];
                          const key = `l-${q.id || lIdx}`;
                          const fb: BatchResult | undefined = batchFeedbacks['listening']?.results[lIdx];
                          const qKey = `listening-${lIdx}`;
                          const qAttempts = questionAttemptCount[qKey] || 0;
                          const canInteract = qAttempts < 2 && !(fb?.is_correct);
                          return (
                            <div>
                              <div className="flex items-center gap-3 mb-5">
                                <span className="text-sm text-slate-400 font-medium whitespace-nowrap">Pregunta {lIdx + 1} de {totalQ}</span>
                                <div className="flex-1 bg-slate-700 rounded-full h-2.5"><div className="bg-purple-500 h-2.5 rounded-full transition-all duration-500" style={{ width: `${(lIdx / totalQ) * 100}%` }} /></div>
                                <span className="text-sm text-purple-400 font-bold">{batchFeedbacks['listening']?.results?.filter((r: any) => r?.is_correct).length || 0}/{totalQ}</span>
                              </div>
                              <div className={`bg-slate-900/50 p-6 rounded-xl border-2 transition-all duration-300 ${fb?.is_correct ? 'border-green-500 bg-green-900/10' : fb && !fb.is_correct ? 'border-red-500/50 bg-red-900/10' : 'border-slate-700'}`}>
                                <p className="text-white font-semibold text-lg mb-5"><span className="text-purple-400 mr-2">{lIdx + 1}.</span>{q.question}</p>
                                <div className="flex gap-3 flex-wrap">
                                  {q.options.map((opt, i) => (
                                    <button key={i} onClick={() => { if (canInteract) { handleAnswerSelect(key, opt); speak(opt); setTimeout(() => autoEvaluateQuestion('listening', lIdx, opt), 300); } }} disabled={!canInteract}
                                      className={`exercise-opt-3d transition-all ${!canInteract ? (selectedAnswers[key] === opt ? (fb?.is_correct ? 'exercise-opt-selected !border-green-500 !bg-green-900/30' : 'exercise-opt-selected !border-red-500 !bg-red-900/30') : 'exercise-opt-locked') : selectedAnswers[key] === opt ? 'exercise-opt-selected' : 'exercise-opt-default'}`}
                                    >{opt}</button>
                                  ))}
                                </div>
                                {evaluatingSkill === 'listening' && <div className="mt-4 flex items-center gap-2 text-purple-400"><span className="animate-spin text-lg">⏳</span><span className="text-sm font-semibold">Evaluando...</span></div>}
                                {fb && (
                                  <div className={`mt-4 p-4 rounded-lg border transition-all slide-up-anim ${fb.is_correct ? 'bg-green-900/20 border-green-700' : 'bg-red-900/20 border-red-700'}`}>
                                    <span className={`font-bold text-lg ${fb.is_correct ? 'text-green-400' : 'text-yellow-400'}`}>{fb.is_correct ? '✅ ¡Correcto!' : '💡 ¡Casi!'}</span>
                                    <p className="text-slate-200 text-sm mt-1">{fb.feedback}</p>
                                    {!fb.is_correct && qAttempts < 2 && <p className="text-yellow-400 text-xs mt-2 font-semibold animate-pulse">🔄 Selecciona otra opción para tu segundo intento.</p>}
                                    {!fb.is_correct && qAttempts >= 2 && <p className="text-slate-400 text-xs mt-2">Avanzando a la siguiente pregunta...</p>}
                                  </div>
                                )}
                                {fb && fb.is_correct && (
                                  <div className="mt-4 p-4 bg-slate-900/80 border border-cyan-500/30 rounded-xl flex items-center justify-between animate-fadeIn">
                                    <div>
                                      <span className="text-cyan-400 font-bold text-sm block">¡Correcto! Has ejercitado tu cerebro</span>
                                      <p className="text-xs text-slate-300">Sigue así para completar tu lección.</p>
                                    </div>
                                    <div className="w-16 h-16 flex items-center justify-center shrink-0">
                                      <img src="/assets/images/cerebro-gym.webp" alt="Cerebro Tec-English AI" className="w-full h-auto object-contain animate-bounce drop-shadow-[0_0_12px_rgba(6,182,212,0.4)]" />
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  )
                  )}

                  {/* WRITING */}
                  {skillTab === 'writing' && writingExercises.length > 0 && (
                    isSkillPerfect('writing') ? (
                      <div className="flex flex-col items-center justify-center py-16 px-4">
                        <div className="text-center p-10 bg-gradient-to-b from-green-900/40 to-emerald-900/30 border-2 border-green-500 rounded-2xl shadow-2xl max-w-lg w-full">
                          <p className="text-5xl mb-4">🎉</p>
                          <p className="text-green-400 font-bold text-2xl mb-2">¡Felicitaciones!</p>
                          <p className="text-green-300 text-lg mb-2">¡Writing completado al 100%!</p>
                          <p className="text-slate-400 text-sm mb-6">Has demostrado un dominio completo de esta sección.</p>
                          <div className="flex flex-col sm:flex-row gap-3 justify-center">
                            <button onClick={goToNextSkill} className="px-6 py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold text-base transition-all shadow-lg">
                              {'➡️ Ir a ' + getNextSkillLabel()}
                            </button>
                            <button onClick={() => setActiveTab('lesson')} className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-semibold text-base transition-all">
                              📋 Ir al menú principal
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                    <div className="space-y-6">
                      <div className="bg-gradient-to-r from-indigo-900/40 to-blue-900/40 border border-indigo-700 p-6 rounded-xl">
                        <h4 className="text-indigo-400 font-semibold mb-3 flex items-center gap-2"><span>✍️</span> Ejercicios de Escritura</h4>
                        <p className="text-slate-300 text-sm">Ordena las palabras para formar oraciones correctas o escribe tu respuesta.</p>
                      </div>
                      <WritingRulesPanel />
                      <div className="space-y-4">
                        {(() => {
                          const totalQ = writingExercises.length;
                          const wIdx = currentQuestionIdx['writing'] || 0;
                          const wDone = wIdx >= totalQ;
                          if (wDone) {
                            const score = calculateSkillScore('writing');
                            const remaining = skillLabels.filter(s => s.key !== 'writing' && !isSkillQuestionsDone(s.key) && !isSkillPerfect(s.key));
                            const allDone = skillLabels.every(s => isSkillQuestionsDone(s.key) || isSkillPerfect(s.key));
                            return (
                              <div className="flex flex-col items-center py-10 slide-up-anim">
                                <div className="text-center p-8 bg-gradient-to-b from-indigo-900/40 to-blue-900/30 border-2 border-indigo-500 rounded-2xl shadow-2xl max-w-md w-full celebration-glow">
                                  <p className="text-6xl mb-3">🎉</p>
                                  <h3 className="text-xl font-bold text-indigo-400 mb-1">¡Writing Completado!</h3>
                                  <p className="text-indigo-300 text-lg mb-1">Puntaje: {score}/100</p>
                                  <p className="text-slate-400 text-sm mb-5">Has completado todos los ejercicios de escritura.</p>
                                  {allDone ? (
                                    <div className="space-y-3 slide-up-anim-delay-2">
                                      <p className="text-amber-400 font-bold text-sm">🏆 ¡Todas las habilidades completadas!</p>
                                      <button onClick={() => { const subIdx = subtopicsList.findIndex(s => s.subtopic_id === currentSubtopicId); if (subIdx >= 0 && subIdx < subtopicsList.length - 1) setCurrentSubtopicId(subtopicsList[subIdx + 1].subtopic_id); else setActiveTab('lesson'); }} className="w-full px-6 py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold transition-all shadow-lg">➡️ Ir a la siguiente lección</button>
                                      <button onClick={() => setActiveTab('progress')} className="w-full px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-semibold transition-all">📊 Ver mi progreso</button>
                                    </div>
                                  ) : (
                                    <div className="space-y-3 slide-up-anim-delay-1">
                                      <p className="text-slate-300 text-sm">Continúa con la siguiente habilidad:</p>
                                      <div className="flex flex-wrap gap-2 justify-center">
                                        {remaining.length > 0 ? remaining.map(s => (
                                          <button key={s.key} onClick={() => setSkillTab(s.key)} className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-semibold transition-all text-sm">{s.icon} {s.label}</button>
                                        )) : (
                                          <button onClick={() => { const subIdx = subtopicsList.findIndex(s => s.subtopic_id === currentSubtopicId); if (subIdx >= 0 && subIdx < subtopicsList.length - 1) setCurrentSubtopicId(subtopicsList[subIdx + 1].subtopic_id); else setActiveTab('lesson'); }} className="px-6 py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold transition-all shadow-lg">➡️ Siguiente lección</button>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                  <button onClick={() => loadAlternateExercises('writing')} disabled={loadingAlternate === 'writing' || !!completedSkills['writing']} className={`repasar-btn-3d mt-3 ${completedSkills['writing'] ? 'repasar-completed' : ''}`}>
                                    {completedSkills['writing'] ? '✅ Ejercicio completado' : (loadingAlternate === 'writing' ? '🤖 Generando...' : '🔄 Repasar con 5 ejercicios diferentes')}
                                  </button>
                                </div>
                              </div>
                            );
                          }
                          const ex = writingExercises[wIdx];
                          const key = `w-${ex.id || wIdx}`;
                          const fb: BatchResult | undefined = batchFeedbacks['writing']?.results[wIdx];
                          const qKey = `writing-${wIdx}`;
                          const qAttempts = questionAttemptCount[qKey] || 0;
                          const canInteract = qAttempts < 2 && !(fb?.is_correct);
                          const isUnscramble = ex.type === 'unscramble' && Array.isArray(ex.words) && ex.words.length > 0;
                          const hasOptions = ex.options && ex.options.length > 0;
                          const isTranslation = !isUnscramble && !hasOptions && !!ex.answer;
                          const opts = hasOptions ? ex.options : (isUnscramble ? ex.words : null);
                          return (
                            <div>
                              <div className="flex items-center gap-3 mb-5">
                                <span className="text-sm text-slate-400 font-medium whitespace-nowrap">Pregunta {wIdx + 1} de {totalQ}</span>
                                <div className="flex-1 bg-slate-700 rounded-full h-2.5"><div className="bg-indigo-500 h-2.5 rounded-full transition-all duration-500" style={{ width: `${(wIdx / totalQ) * 100}%` }} /></div>
                                <span className="text-sm text-indigo-400 font-bold">{batchFeedbacks['writing']?.results?.filter((r: any) => r?.is_correct).length || 0}/{totalQ}</span>
                              </div>
                              <div className={`bg-slate-900/50 p-6 rounded-xl border-2 transition-all duration-300 ${fb?.is_correct ? 'border-green-500 bg-green-900/10' : fb && !fb.is_correct ? 'border-red-500/50 bg-red-900/10' : 'border-slate-700'}`}>
                                <p className="text-white font-semibold text-lg mb-5"><span className="text-indigo-400 mr-2">{wIdx + 1}.</span>{ex.question || ex.prompt || 'Ejercicio de escritura'}</p>
                                {isUnscramble ? (
                                  <UnscrambleExercise exercise={ex} index={wIdx} userAnswer={selectedAnswers[key] || ''} onAnswerChange={(answer: string) => canInteract && handleAnswerSelect(key, answer)} onComplete={() => canInteract && !fb && autoEvaluateQuestion('writing', wIdx, selectedAnswers[key] || '')} feedback={fb} isLocked={!canInteract} />
                                ) : isTranslation ? (
                                  <div className="space-y-3">
                                    <textarea
                                      value={selectedAnswers[key] || ''}
                                      onChange={(e) => canInteract && handleAnswerSelect(key, e.target.value)}
                                      disabled={!canInteract}
                                      placeholder="Escribe tu respuesta en inglés..."
                                      className={`w-full p-3 rounded-lg border focus:outline-none transition-all ${!canInteract ? 'bg-slate-800 text-slate-400 border-slate-700 cursor-not-allowed' : 'bg-slate-700 text-white border-slate-600 focus:border-purple-500'}`}
                                      rows={3}
                                    />
                                    {canInteract && selectedAnswers[key] && (
                                      <button onClick={() => autoEvaluateQuestion('writing', wIdx, selectedAnswers[key])}
                                        className="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold text-sm transition-all shadow-lg">
                                        ✅ Enviar respuesta
                                      </button>
                                    )}
                                  </div>
                                ) : opts && opts.length > 0 ? (
                                  <div className="flex gap-3 flex-wrap">
                                    {opts.map((opt: string, i: number) => (
                                      <button key={i} onClick={() => { if (canInteract) { handleAnswerSelect(key, opt); speak(opt); setTimeout(() => autoEvaluateQuestion('writing', wIdx, opt), 300); } }} disabled={!canInteract}
                                        className={`exercise-opt-3d transition-all ${!canInteract ? (selectedAnswers[key] === opt ? (fb?.is_correct ? 'exercise-opt-selected !border-green-500 !bg-green-900/30' : 'exercise-opt-selected !border-red-500 !bg-red-900/30') : 'exercise-opt-locked') : selectedAnswers[key] === opt ? 'exercise-opt-selected' : 'exercise-opt-default'}`}
                                      >{opt}</button>
                                    ))}
                                  </div>
                                ) : (
                                  <UnscrambleExercise exercise={ex} index={wIdx} userAnswer={selectedAnswers[key] || ''} onAnswerChange={(answer: string) => canInteract && handleAnswerSelect(key, answer)} onComplete={() => canInteract && !fb && autoEvaluateQuestion('writing', wIdx, selectedAnswers[key] || '')} feedback={fb} isLocked={!canInteract} />
                                )}
                                {evaluatingSkill === 'writing' && <div className="mt-4 flex items-center gap-2 text-purple-400"><span className="animate-spin text-lg">⏳</span><span className="text-sm font-semibold">Evaluando...</span></div>}
                                {fb && (
                                  <div className={`mt-4 p-4 rounded-lg border transition-all slide-up-anim ${fb.is_correct ? 'bg-green-900/20 border-green-700' : 'bg-red-900/20 border-red-700'}`}>
                                    <span className={`font-bold text-lg ${fb.is_correct ? 'text-green-400' : 'text-yellow-400'}`}>{fb.is_correct ? '✅ ¡Correcto!' : '💡 ¡Casi!'}</span>
                                    <p className="text-slate-200 text-sm mt-1">{fb.feedback}</p>
                                    {!fb.is_correct && qAttempts < 2 && <p className="text-yellow-400 text-xs mt-2 font-semibold animate-pulse">🔄 {isTranslation ? 'Intenta escribir otra respuesta.' : 'Selecciona otra opción para tu segundo intento.'}</p>}
                                    {!fb.is_correct && qAttempts >= 2 && <p className="text-slate-400 text-xs mt-2">Avanzando a la siguiente pregunta...</p>}
                                  </div>
                                )}
                                {fb && fb.is_correct && (
                                  <div className="mt-4 p-4 bg-slate-900/80 border border-cyan-500/30 rounded-xl flex items-center justify-between animate-fadeIn">
                                    <div>
                                      <span className="text-cyan-400 font-bold text-sm block">¡Correcto! Has ejercitado tu cerebro</span>
                                      <p className="text-xs text-slate-300">Sigue así para completar tu lección.</p>
                                    </div>
                                    <div className="w-16 h-16 flex items-center justify-center shrink-0">
                                      <img src="/assets/images/cerebro-gym.webp" alt="Cerebro Tec-English AI" className="w-full h-auto object-contain animate-bounce drop-shadow-[0_0_12px_rgba(6,182,212,0.4)]" />
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  )
                  )}

                  {/* SPEAKING / PRONUNCIATION */}
                  {skillTab === 'pronunciation' && pronunciationExercises.length > 0 && (
                    isSkillPerfect('pronunciation') ? (
                      <div className="flex flex-col items-center justify-center py-16 px-4">
                        <div className="text-center p-10 bg-gradient-to-b from-green-900/40 to-emerald-900/30 border-2 border-green-500 rounded-2xl shadow-2xl max-w-lg w-full">
                          <p className="text-5xl mb-4">🎉</p>
                          <p className="text-green-400 font-bold text-2xl mb-2">¡Felicitaciones!</p>
                          <p className="text-green-300 text-lg mb-2">¡Pronunciation completado al 100%!</p>
                          <p className="text-slate-400 text-sm mb-6">Has demostrado un dominio completo de esta sección.</p>
                          <div className="flex flex-col sm:flex-row gap-3 justify-center">
                            <button onClick={goToNextSkill} className="px-6 py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold text-base transition-all shadow-lg">
                              {'➡️ Ir a ' + getNextSkillLabel()}
                            </button>
                            <button onClick={() => setActiveTab('lesson')} className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-semibold text-base transition-all">
                              📋 Ir al menú principal
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                    <div className="space-y-6">
                      <div className="bg-gradient-to-r from-pink-900/40 to-rose-900/40 border border-pink-700 p-6 rounded-xl">
                        <h4 className="text-pink-400 font-semibold mb-3 flex items-center gap-2"><span>🎤</span> Pronunciación y Speaking</h4>
                        <p className="text-slate-300 text-sm">Practica la pronunciación y graba tu voz para ser evaluada.</p>
                      </div>
                      {(() => {
                        const totalQ = speakingExercises.length;
                        const pIdx = currentQuestionIdx['pronunciation'] || 0;
                        const pDone = pIdx >= totalQ;
                        if (pDone && totalQ > 0) {
                          const score = calculateSkillScore('pronunciation');
                          const remaining = skillLabels.filter(s => s.key !== 'pronunciation' && !isSkillQuestionsDone(s.key) && !isSkillPerfect(s.key));
                          const allDone = skillLabels.every(s => isSkillQuestionsDone(s.key) || isSkillPerfect(s.key));
                          return (
                            <div className="flex flex-col items-center py-10 slide-up-anim">
                              <div className="text-center p-8 bg-gradient-to-b from-pink-900/40 to-rose-900/30 border-2 border-pink-500 rounded-2xl shadow-2xl max-w-md w-full celebration-glow">
                                <p className="text-6xl mb-3">🎉</p>
                                <h3 className="text-xl font-bold text-pink-400 mb-1">¡Speaking Completado!</h3>
                                <p className="text-pink-300 text-lg mb-1">Puntaje: {score}/100</p>
                                <p className="text-slate-400 text-sm mb-5">Has completado todos los ejercicios de pronunciación.</p>
                                {allDone ? (
                                  <div className="space-y-3 slide-up-anim-delay-2">
                                    <p className="text-amber-400 font-bold text-sm">🏆 ¡Todas las habilidades completadas!</p>
                                    <button onClick={() => { const subIdx = subtopicsList.findIndex(s => s.subtopic_id === currentSubtopicId); if (subIdx >= 0 && subIdx < subtopicsList.length - 1) setCurrentSubtopicId(subtopicsList[subIdx + 1].subtopic_id); else setActiveTab('lesson'); }} className="w-full px-6 py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold transition-all shadow-lg">➡️ Ir a la siguiente lección</button>
                                    <button onClick={() => setActiveTab('progress')} className="w-full px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-semibold transition-all">📊 Ver mi progreso</button>
                                  </div>
                                ) : (
                                  <div className="space-y-3 slide-up-anim-delay-1">
                                    <p className="text-slate-300 text-sm">Continúa con la siguiente habilidad:</p>
                                    <div className="flex flex-wrap gap-2 justify-center">
                                      {remaining.length > 0 ? remaining.map(s => (
                                        <button key={s.key} onClick={() => setSkillTab(s.key)} className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-semibold transition-all text-sm">{s.icon} {s.label}</button>
                                      )) : (
                                        <button onClick={() => { const subIdx = subtopicsList.findIndex(s => s.subtopic_id === currentSubtopicId); if (subIdx >= 0 && subIdx < subtopicsList.length - 1) setCurrentSubtopicId(subtopicsList[subIdx + 1].subtopic_id); else setActiveTab('lesson'); }} className="px-6 py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold transition-all shadow-lg">➡️ Siguiente lección</button>
                                      )}
                                    </div>
                                  </div>
                                )}
                                <button onClick={() => loadAlternateExercises('pronunciation')} disabled={loadingAlternate === 'pronunciation' || !!completedSkills['pronunciation']} className={`repasar-btn-3d mt-3 ${completedSkills['pronunciation'] ? 'repasar-completed' : ''}`}>
                                  {completedSkills['pronunciation'] ? '✅ Ejercicio completado' : (loadingAlternate === 'pronunciation' ? '🤖 Generando...' : '🔄 Repasar con 5 ejercicios diferentes')}
                                </button>
                              </div>
                            </div>
                          );
                        }
                        if (totalQ === 0) return null;
                        const ex = speakingExercises[pIdx];
                        const key = `p-${ex.id || pIdx}`;
                        const fb: BatchResult | undefined = batchFeedbacks['pronunciation']?.results[pIdx];
                        const qKey = `pronunciation-${pIdx}`;
                        const qAttempts = questionAttemptCount[qKey] || 0;
                        const canInteract = qAttempts < 2 && !(fb?.is_correct);
                        return (
                          <div className="space-y-4">
                            <div className="flex items-center gap-3 mb-5">
                              <span className="text-sm text-slate-400 font-medium whitespace-nowrap">Ejercicio {pIdx + 1} de {totalQ}</span>
                              <div className="flex-1 bg-slate-700 rounded-full h-2.5"><div className="bg-pink-500 h-2.5 rounded-full transition-all duration-500" style={{ width: `${(pIdx / totalQ) * 100}%` }} /></div>
                              <span className="text-sm text-pink-400 font-bold">{batchFeedbacks['pronunciation']?.results?.filter((r: any) => r?.is_correct).length || 0}/{totalQ}</span>
                            </div>
                            <div className={`bg-slate-900/50 p-6 rounded-xl border-2 transition-all duration-300 ${fb?.is_correct ? 'border-green-500 bg-green-900/10' : fb && !fb.is_correct ? 'border-red-500/50 bg-red-900/10' : 'border-slate-700'}`}>
                              <p className="text-white font-semibold text-lg mb-5"><span className="text-pink-400 mr-2">{pIdx + 1}.</span>{ex.prompt}</p>
                              <div className="flex gap-3 items-center flex-wrap">
                                <button onClick={() => { if (recordingKey) stopRecording(); speak(ex.prompt); }} className={`px-5 py-2.5 rounded-lg font-semibold transition-all ${audioState.isPlaying && audioState.text === ex.prompt ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-purple-600 hover:bg-purple-700'} text-white`}>
                                  {audioState.isPlaying && audioState.text === ex.prompt ? '⏸️ Pausar' : '🔊 Escuchar'}
                                </button>
                                <button onClick={() => recordingKey === key ? stopRecording() : startRecording(key, (transcript) => autoEvaluateQuestion('pronunciation', pIdx, transcript))} className={`px-5 py-2.5 rounded-lg font-semibold transition-all ${recordingKey === key ? 'bg-red-600 text-white animate-pulse ring-2 ring-red-400' : 'bg-pink-600 hover:bg-pink-700 text-white'}`}>
                                  {recordingKey === key ? '⏹️ Detener' : '🎤 Grabar'}
                                </button>
                                {recordingKey === key && (
                                  <div className="flex items-center gap-2 bg-green-900/50 px-3 py-1.5 rounded-full border border-green-600">
                                    <div className="w-2.5 h-2.5 bg-green-400 rounded-full animate-pulse"></div>
                                    <span className="text-green-400 text-sm font-mono font-bold">{formatRecordTime(recordingTime)}</span>
                                  </div>
                                )}
                                {selectedAnswers[key] && recordingKey !== key && (
                                  <span className="text-green-400 text-sm italic bg-green-900/30 px-3 py-1.5 rounded border border-green-700">"{selectedAnswers[key]}"</span>
                                )}
                              </div>
                              {fb && (
                                <div className={`mt-4 p-4 rounded-lg border transition-all slide-up-anim ${fb.is_correct ? 'bg-green-900/20 border-green-700' : 'bg-red-900/20 border-red-700'}`}>
                                  <span className={`font-bold text-lg ${fb.is_correct ? 'text-green-400' : 'text-yellow-400'}`}>{fb.is_correct ? '✅ ¡Correcto!' : '💡 ¡Casi!'}</span>
                                  <p className="text-slate-200 text-sm mt-1">{fb.feedback}</p>
                                  {!fb.is_correct && qAttempts < 2 && <p className="text-yellow-400 text-xs mt-2 font-semibold animate-pulse">🔄 Intenta grabar tu voz de nuevo con más claridad.</p>}
                                  {!fb.is_correct && qAttempts >= 2 && <p className="text-slate-400 text-xs mt-2">Avanzando al siguiente ejercicio...</p>}
                                </div>
                              )}
                              {fb && fb.is_correct && (
                                <div className="mt-4 p-4 bg-slate-900/80 border border-cyan-500/30 rounded-xl flex items-center justify-between animate-fadeIn">
                                  <div>
                                    <span className="text-cyan-400 font-bold text-sm block">¡Correcto! Has ejercitado tu cerebro</span>
                                    <p className="text-xs text-slate-300">Sigue así para completar tu lección.</p>
                                  </div>
                                  <div className="w-16 h-16 flex items-center justify-center shrink-0">
                                    <img src="/assets/images/cerebro-gym.webp" alt="Cerebro Tec-English AI" className="w-full h-auto object-contain animate-bounce drop-shadow-[0_0_12px_rgba(6,182,212,0.4)]" />
                                  </div>
                                </div>
                              )}
                            </div>
                            {pronunciationExercises.length > 0 && (
                              <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                                <p className="text-pink-400 text-sm font-semibold mb-2">💡 Tip de pronunciación:</p>
                                <p className="text-slate-300 text-sm italic">{pronunciationExercises[pIdx % pronunciationExercises.length]?.focus}</p>
                                <button onClick={() => speak(pronunciationExercises[pIdx % pronunciationExercises.length]?.phrase || ex.prompt)} className="mt-2 px-3 py-1.5 bg-pink-600/50 hover:bg-pink-600 text-white rounded-lg text-xs font-semibold transition-all">🔊 Escuchar pronunciación correcta</button>
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  )
                  )}
                </section>
                )}
              </>
            ) : (
              <div className="panel-header-3d panel-header-amber p-6 text-center">
                <p className="text-yellow-400 text-lg mb-2">⚠️ No se pudo cargar el contenido de la lección</p>
                <button onClick={() => window.location.reload()} className="action-btn-3d action-btn-amber mt-4">Recargar Página</button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* MODAL DE AYUDA GLOBAL (Corregido: ahora está dentro del return de App) */}
      <HelpModal 
        isOpen={showHelp} 
        onClose={() => setShowHelp(false)} 
        title={helpInstructions[currentHelpType]?.title || "Ayuda"}
        instructions={helpInstructions[currentHelpType]?.instructions || ["Instrucciones no disponibles."]}
      />

      {/* MODAL DE ALERTA INVITADO */}
      {showGuestAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-800 border border-amber-500/50 rounded-2xl shadow-2xl max-w-sm w-full p-6 text-center space-y-4 animate-in fade-in duration-200">
            <div className="w-14 h-14 mx-auto bg-amber-500/20 rounded-full flex items-center justify-center">
              <span className="text-3xl">⚠️</span>
            </div>
            <h3 className="text-xl font-bold text-white">Modo Invitado</h3>
            <p className="text-slate-300 text-sm leading-relaxed">
              Estás usando la app como <span className="text-amber-400 font-semibold">invitado</span>. Tu progreso <span className="text-red-400 font-semibold">no se guardará</span> ni se sincronizará entre dispositivos.
            </p>
            <p className="text-slate-400 text-xs">
              Regístrate con Google para que tu avance quede registrado permanentemente.
            </p>
            <div className="flex flex-col gap-2 pt-2">
              <button
                onClick={() => { setShowGuestAlert(false); setPendingLessonId(null); handleLogin(); }}
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-bold transition-all shadow-lg"
              >
                🔑 Registrarme con Google
              </button>
              <button
                onClick={() => { setShowGuestAlert(false); if (pendingLessonId) setCurrentSubtopicId(pendingLessonId); setPendingLessonId(null); }}
                className="w-full py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-xl font-semibold text-sm transition-all"
              >
                Continuar sin guardar progreso
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CERTIFICACIÓN A1 - Condición de desbloqueo */}
      {showCertAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-800 border border-amber-500/50 rounded-2xl shadow-2xl max-w-sm w-full p-6 text-center space-y-4 animate-in fade-in duration-200">
            <div className="w-14 h-14 mx-auto bg-amber-500/20 rounded-full flex items-center justify-center">
              <span className="text-3xl">🔒</span>
            </div>
            <h3 className="text-xl font-bold text-amber-400">Examen de Certificación A1</h3>
            <p className="text-slate-300 text-sm leading-relaxed">
              Para desbloquear este examen debes cumplir ambas condiciones:
            </p>
            <div className="bg-slate-700/50 rounded-xl p-4 text-left space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-lg">📚</span>
                <span className="text-slate-300">Completar el <span className="text-white font-bold">100%</span> del contenido</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-lg">🎯</span>
                <span className="text-slate-300">Mantener un promedio mínimo de <span className="text-white font-bold">70/100</span></span>
              </div>
            </div>
            <p className="text-slate-400 text-xs leading-relaxed">
              Sigue practicando cada lección para alcanzar el 100% de avance con un promedio de al menos 70.
            </p>
            <button
              onClick={() => setShowCertAlert(false)}
              className="w-full py-3 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white rounded-xl font-bold transition-all shadow-lg"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// COMPONENTE: MODAL DE AYUDA / INSTRUCCIONES
// ==========================================
interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  instructions: string[];
}

function HelpModal({ isOpen, onClose, title, instructions }: HelpModalProps) {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (isOpen) window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={onClose}>
      <div 
        className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl max-w-md w-full p-6 relative animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors p-1">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
        
        <h3 className="text-xl font-bold text-blue-400 mb-4 flex items-center gap-2">
          <span className="text-2xl">❓</span> {title}
        </h3>
        
        <ul className="space-y-3 mb-6">
          {instructions.map((inst, i) => (
            <li key={i} className="flex gap-3 text-slate-300 text-sm leading-relaxed">
              <span className="text-blue-500 font-bold mt-0.5 shrink-0">•</span>
              <span>{inst}</span>
            </li>
          ))}
        </ul>
        
        <button 
          onClick={onClose} 
          className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-900/50"
        >
          ¡Entendido, a practicar!
        </button>
      </div>
    </div>
  );
}

export default App;