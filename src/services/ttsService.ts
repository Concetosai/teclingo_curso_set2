const API_BASE = import.meta.env.VITE_API_URL || '';

let currentAudio: HTMLAudioElement | null = null;

function isDialogue(text: string): boolean {
  return /\b[A-H]\s*:\s*/i.test(text);
}

function cleanTextForSpeech(raw: string): string {
  let t = raw;
  t = t.replace(/['"]([^'"]+)['"]/g, '$1');
  t = t.replace(/Escucha[^.]*\./gi, '');
  t = t.replace(/Listen[^.]*\./gi, '');
  t = t.replace(/Read[^.]*\./gi, '');
  t = t.replace(/Choose[^.]*\./gi, '');
  t = t.replace(/Select[^.]*\./gi, '');
  t = t.replace(/Write[^.]*\./gi, '');
  t = t.replace(/Answer[^.]*\./gi, '');
  t = t.replace(/What[^?]*\?/gi, '');
  t = t.replace(/How[^?]*\?/gi, '');
  t = t.replace(/Where[^?]*\?/gi, '');
  t = t.replace(/When[^?]*\?/gi, '');
  t = t.replace(/Why[^?]*\?/gi, '');
  t = t.replace(/Who[^?]*\?/gi, '');
  t = t.replace(/True or False[^.]*\.?/gi, '');
  t = t.replace(/Verdadero o Falso[^.]*\.?/gi, '');
  t = t.replace(/Complete[^.]*\.?/gi, '');
  t = t.replace(/Completa[^.]*\.?/gi, '');
  t = t.replace(/Unscramble[^.]*\.?/gi, '');
  t = t.replace(/Arrange[^.]*\.?/gi, '');
  t = t.replace(/Drag[^.]*\.?/gi, '');
  t = t.replace(/Rearrange[^.]*\.?/gi, '');
  t = t.replace(/Rewrite[^.]*\.?/gi, '');
  t = t.replace(/Escribe[^.]*\.?/gi, '');
  t = t.replace(/Ordena[^.]*\.?/gi, '');
  t = t.replace(/Arrastra[^.]*\.?/gi, '');
  t = t.replace(/Reescribe[^.]*\.?/gi, '');
  t = t.replace(/Reorganiza[^.]*\.?/gi, '');
  t = t.replace(/Opción correcta[^.]*\.?/gi, '');
  t = t.replace(/Correct option[^.]*\.?/gi, '');
  t = t.replace(/Opciones[^.]*\.?/gi, '');
  t = t.replace(/Options:/gi, '');
  t = t.replace(/\b[a-hA-H]\)\s*/g, ' ');
  t = t.replace(/\b[a-hA-H]\.\s*/g, ' ');
  t = t.replace(/\bSpeaker\s*\d*\s*:/gi, '');
  t = t.replace(/\bNarrator\s*:/gi, '');
  t = t.replace(/\bTeacher\s*:/gi, '');
  t = t.replace(/\bStudent\s*:/gi, '');
  t = t.replace(/\([^)]{0,80}\)/g, ' ');
  t = t.replace(/\[[^\]]{0,80}\]/g, ' ');
  t = t.replace(/\{[^}]{0,80}\}/g, ' ');
  t = t.replace(/\s{2,}/g, ' ');
  t = t.replace(/\.\s*\./g, '.');
  t = t.replace(/,\s*,/g, ',');
  t = t.replace(/^\s*[.,;:!]\s*/, '');
  t = t.replace(/\s*[.,;:!]\s*$/g, '.');
  t = t.trim();
  return t;
}

function playAudioBlob(blob: Blob, opts?: { rate?: number; onStart?: () => void; onEnd?: () => void; onError?: () => void }): void {
  const url = URL.createObjectURL(blob);
  const audio = new Audio(url);
  audio.playbackRate = opts?.rate ?? 0.92;
  currentAudio = audio;

  audio.onplay = () => opts?.onStart?.();
  audio.onended = () => {
    URL.revokeObjectURL(url);
    currentAudio = null;
    opts?.onEnd?.();
  };
  audio.onerror = () => {
    URL.revokeObjectURL(url);
    currentAudio = null;
    opts?.onError?.();
  };
  audio.play().catch(() => {
    URL.revokeObjectURL(url);
    currentAudio = null;
    opts?.onError?.();
  });
}

export function speak(
  text: string,
  opts?: {
    rate?: number;
    onStart?: () => void;
    onEnd?: () => void;
    onError?: () => void;
  }
): void {
  stop();

  if (isDialogue(text)) {
    speakDialogue(text, opts);
    return;
  }

  const clean = cleanTextForSpeech(text);
  if (!clean) return;

  fetch(`${API_BASE}/api/tts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: clean }),
  })
    .then((res) => {
      if (!res.ok) throw new Error('TTS API error');
      return res.blob();
    })
    .then((blob) => {
      playAudioBlob(blob, opts);
    })
    .catch(() => {
      fallbackSpeak(clean, opts);
    });
}

function speakDialogue(
  text: string,
  opts?: { rate?: number; onStart?: () => void; onEnd?: () => void; onError?: () => void }
): void {
  fetch(`${API_BASE}/api/tts-dialogue`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, rate: '+0%' }),
  })
    .then((res) => {
      if (!res.ok) throw new Error('TTS dialogue API error');
      return res.blob();
    })
    .then((blob) => {
      playAudioBlob(blob, opts);
    })
    .catch(() => {
      const clean = cleanTextForSpeech(text);
      fallbackSpeak(clean, opts);
    });
}

export function stop(): void {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    currentAudio = null;
  }
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}

export function pause(): void {
  if (currentAudio && !currentAudio.paused) {
    currentAudio.pause();
  }
}

export function resume(): void {
  if (currentAudio && currentAudio.paused) {
    currentAudio.play().catch(() => {});
  }
}

export function isPaused(): boolean {
  return currentAudio !== null && currentAudio.paused;
}

export function isPlaying(): boolean {
  return currentAudio !== null && !currentAudio.paused;
}

function fallbackSpeak(
  text: string,
  opts?: { rate?: number; onStart?: () => void; onEnd?: () => void; onError?: () => void }
): void {
  if (!('speechSynthesis' in window)) {
    opts?.onError?.();
    return;
  }
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'en-US';
  u.rate = opts?.rate ?? 0.92;
  u.onstart = () => opts?.onStart?.();
  u.onend = () => opts?.onEnd?.();
  u.onerror = () => opts?.onError?.();
  window.speechSynthesis.speak(u);
}
