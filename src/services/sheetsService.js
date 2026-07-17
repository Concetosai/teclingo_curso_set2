const SHEETS_API_URL = 'https://script.google.com/macros/s/AKfycbz_aCE0YmQvfCB3tLJkB7g5KXt-fev72I2vWRBk2wSOsDlC6GtNo0JGHX-1sO2X-lX8lg/exec';

function getUserEmail() {
  try {
    const user = JSON.parse(localStorage.getItem('teclingo_user') || '{}');
    return user.email || '';
  } catch { return ''; }
}

async function sendToSheets(accion, datos) {
  try {
    await fetch(SHEETS_API_URL, {
      method: 'POST', mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accion, datos })
    });
    console.log(`[Sheets] ${accion} sent`);
  } catch (err) {
    console.warn(`[Sheets] ${accion} failed:`, err);
  }
}

export async function saveProgress({ subtopicId, skill, score, attempts, world }) {
  const email = getUserEmail();
  if (!email) return;
  await sendToSheets('registrarProgreso', {
    email, subtopicId, skill,
    score: String(score), attempts: String(attempts),
    world: world || 'tecnm',
    fecha: new Date().toISOString()
  });
}

export async function saveActivity(tipo, detalle) {
  const email = getUserEmail();
  if (!email) return;
  await sendToSheets('registrarActividad', { email, tipo, detalle });
}

export async function logEntrada() {
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

export async function logSalida(motivo = 'cerrar_sesion') {
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

export default { saveProgress, saveActivity, logEntrada, logSalida };
