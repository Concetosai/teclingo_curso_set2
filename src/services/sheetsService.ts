const SHEETS_API_URL = 'https://script.google.com/macros/s/AKfycbz_aCE0YmQvfCB3tLJkB7g5KXt-fev72I2vWRBk2wSOsDlC6GtNo0JGHX-1sO2X-lX8lg/exec';

interface ProgressPayload {
  subtopicId: string;
  skill: string;
  score: number;
  attempts: number;
  world?: string;
}

interface UserInfo {
  email?: string;
}

function getUserEmail(): string {
  try {
    const user: UserInfo = JSON.parse(localStorage.getItem('teclingo_user') || '{}');
    return user.email || '';
  } catch {
    return '';
  }
}

async function sendToSheets(accion: string, datos: Record<string, any>): Promise<void> {
  try {
    await fetch(SHEETS_API_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ accion, datos })
    });
    console.log(`[Sheets] ${accion} sent`);
  } catch (err) {
    console.warn(`[Sheets] ${accion} failed:`, err);
  }
}

export async function saveProgress(payload: ProgressPayload): Promise<void> {
  const email = getUserEmail();
  if (!email) return;
  await sendToSheets('registrarProgreso', {
    email,
    subtopicId: payload.subtopicId,
    skill: payload.skill,
    score: String(payload.score),
    attempts: String(payload.attempts),
    world: payload.world || 'tecnm',
    fecha: new Date().toISOString()
  });
}

export async function saveActivity(tipo: string, detalle: string): Promise<void> {
  const email = getUserEmail();
  if (!email) return;
  await sendToSheets('registrarActividad', { email, tipo, detalle });
}

export async function logEntrada(): Promise<void> {
  const email = getUserEmail();
  if (!email) return;
  const now = new Date();
  await sendToSheets('registrarActividad', {
    email,
    tipo: 'entrada_sesion',
    detalle: `Inicio de sesion - ${now.toLocaleDateString('es-MX')} ${now.toLocaleTimeString('es-MX')}`,
    fecha: now.toISOString()
  });
}

export async function logSalida(motivo: string = 'cerrar_sesion'): Promise<void> {
  const email = getUserEmail();
  if (!email) return;
  const now = new Date();
  await sendToSheets('registrarActividad', {
    email,
    tipo: 'salida_sesion',
    detalle: `Fin de sesion (${motivo}) - ${now.toLocaleDateString('es-MX')} ${now.toLocaleTimeString('es-MX')}`,
    fecha: now.toISOString()
  });
}

const sheetsService = { saveProgress, saveActivity, logEntrada, logSalida };
export default sheetsService;''