const API_BASE = import.meta.env.VITE_API_URL || '';

export interface ADNData {
  email: string;
  confianza: string;
  nivel: string;
  motivo: string;
  meta_3m: string;
  urgencia: string;
  temas: string;
  formato: string;
  estilo_sesion: string;
  que_evitar: string;
  correccion: string;
  horario: string;
  minutos_dia: string;
}

export async function saveADN(data: ADNData): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/api/adn/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function getADN(email: string): Promise<ADNData | null> {
  try {
    const response = await fetch(`${API_BASE}/api/adn/${encodeURIComponent(email)}`);
    if (response.status === 404) return null;
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}