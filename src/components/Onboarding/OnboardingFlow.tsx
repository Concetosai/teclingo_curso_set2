import { useState, useEffect, useRef } from 'react';
import { saveADN, type ADNData } from '../../services/adnService';

interface Props { 
  userEmail: string; 
  onComplete: () => void; 
}

const STEPS = [
  { id: 1, text: "¿Cómo te sientes hoy?", video: "/assets/onboarding/01_bienvenida.mp4", options: ["¡Comencemos!"] },
  { id: 2, text: "¿Qué tanta confianza sientes al hablar inglés?", video: "/assets/onboarding/02_confianza.mp4", options: ["1-3", "4-6", "7-8", "9-10"] },
  { id: 3, text: "¿Cuál es tu nivel actual?", video: "/assets/onboarding/03_nivel_general.mp4", options: ["Principiante", "Intermedio", "Avanzado"] },
  { id: 4, text: "¿Cuál es el motivo principal?", video: "/assets/onboarding/04_motivo.mp4", options: ["Profesional", "Viajes", "Académico", "Personal"] },
  { id: 5, text: "¿Meta en tres meses?", video: "/assets/onboarding/05_meta_3m.mp4", options: ["Entrevista", "Series", "Redacción", "Fluidez"] },
  { id: 6, text: "¿Urgencia?", video: "/assets/onboarding/06_urgencia.mp4", options: ["Extrema", "Alta", "Moderada"] },
  { id: 7, text: "¿Temas que te apasionan?", video: "/assets/onboarding/07_temas.mp4", options: ["IA/Tech", "Negocios", "Cultura", "Ciencia"] },
  { id: 8, text: "¿Formato preferido?", video: "/assets/onboarding/08_formato.mp4", options: ["Artículos", "Noticias", "Películas", "Podcasts"] },
  { id: 9, text: "¿Estilo de sesión?", video: "/assets/onboarding/09_estilo.mp4", options: ["Cortas", "Largas"] },
  { id: 10, text: "¿Qué no te gusta?", video: "/assets/onboarding/10_que_evitar.mp4", options: ["Gramática", "Repetitivos"] },
  { id: 11, text: "¿Correcciones?", video: "/assets/onboarding/11_correcciones.mp4", options: ["Instante", "Final"] },
  { id: 12, text: "¿Horario ideal?", video: "/assets/onboarding/12_horario.mp4", options: ["Mañana", "Tarde", "Noche"] },
  { id: 13, text: "¿Minutos al día?", video: "/assets/onboarding/13_tiempo.mp4", options: ["15m", "30m", "60m"] },
  { id: 14, text: "¡Todo listo!", video: "/assets/onboarding/14_despedida.mp4", options: ["¡Finalizar!"] }
];

export default function OnboardingFlow({ userEmail, onComplete }: Props) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(false);
  const [videoEnded, setVideoEnded] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoStartedAt = useRef<number>(0);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.src = STEPS[step].video;
      videoRef.current.load();
      videoStartedAt.current = Date.now();
      setVideoEnded(false);
      videoRef.current.muted = isMuted;
      videoRef.current.play().catch(err => {
        console.warn("Autoplay bloqueado o error de video:", err);
      });
    }
  }, [step, isMuted]);

  const toggleMute = () => {
    if (videoRef.current) {
      const newMuted = !videoRef.current.muted;
      videoRef.current.muted = newMuted;
      setIsMuted(newMuted);
    }
  };

  const handleVideoEnded = () => {
    const elapsed = Date.now() - videoStartedAt.current;
    if (elapsed > 800) {
      setVideoEnded(true);
    }
  };

  const handleOption = (opt: string) => {
    const id = STEPS[step].id;
    setAnswers(prev => ({ ...prev, [id]: opt }));
    setVideoEnded(false);

    if (step === STEPS.length - 1) {
      finish();
    } else {
      setStep(step + 1);
    }
  };

  const finish = async () => {
    setLoading(true);
    const adn: ADNData = {
      email: userEmail,
      confianza: answers[2] || '',
      nivel: answers[3] || '',
      motivo: answers[4] || '',
      meta_3m: answers[5] || '',
      urgencia: answers[6] || '',
      temas: answers[7] || '',
      formato: answers[8] || '',
      estilo_sesion: answers[9] || '',
      que_evitar: answers[10] || '',
      correccion: answers[11] || '',
      horario: answers[12] || '',
      minutos_dia: answers[13] || ''
    };
    
    const ok = await saveADN(adn);
    setLoading(false);
    
    if (ok) {
      onComplete();
    } else {
      alert('Error al guardar tu perfil. Por favor, intenta de nuevo.');
    }
  };

  const current = STEPS[step];

  return (
    <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
      <div className="relative w-full max-w-2xl mx-auto p-4">
        <video 
          ref={videoRef} 
          className="w-full rounded-2xl shadow-2xl border border-white/10" 
          autoPlay 
          muted={isMuted}
          playsInline 
          onEnded={handleVideoEnded}
          onPlay={() => setVideoEnded(false)}
        />
        
        <button
          onClick={toggleMute}
          className="absolute top-6 right-6 z-10 w-12 h-12 bg-black/50 hover:bg-black/70 backdrop-blur-md rounded-full flex items-center justify-center text-white text-2xl border border-white/20 transition-all hover:scale-110"
          title={isMuted ? "Activar sonido" : "Silenciar"}
        >
          {isMuted ? '🔇' : '🔊'}
        </button>

        <div 
          className={`absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm rounded-2xl p-8 transition-opacity duration-500 ${
            videoEnded ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        >
          <h2 className="text-white text-2xl md:text-3xl font-bold mb-6 text-center drop-shadow-lg">
            {current.text}
          </h2>
          
          <div className="flex flex-wrap gap-3 justify-center">
            {current.options.map(opt => (
              <button
                key={opt}
                onClick={() => handleOption(opt)}
                disabled={loading}
                className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl border border-white/20 font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed backdrop-blur-md"
              >
                {opt}
              </button>
            ))}
          </div>
          
          {loading && (
            <p className="text-white text-sm mt-6 animate-pulse flex items-center gap-2">
              <span className="w-2 h-2 bg-white rounded-full animate-bounce"></span>
              Guardando tu perfil de aprendizaje...
            </p>
          )}
          
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-1.5">
            {STEPS.map((_, i) => (
              <div 
                key={i} 
                className={`h-2 rounded-full transition-all duration-300 ${
                  i === step ? 'bg-white w-6' : 'bg-white/30 w-2'
                }`} 
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
