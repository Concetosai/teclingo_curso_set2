const API_BASE = import.meta.env.VITE_API_URL || '';

let currentAudio: HTMLAudioElement | null = null;

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
  const clean = text.replace(/['"]([^'"]+)['"]/g, '$1').trim();
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
    })
    .catch(() => {
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
