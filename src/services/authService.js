const GOOGLE_CLIENT_ID = '765600384773-tq06mk73fsvvqmae19mq4huio3l908ap.apps.googleusercontent.com';
const SHEETS_API_URL = 'https://script.google.com/macros/s/AKfycbz_aCE0YmQvfCB3tLJkB7g5KXt-fev72I2vWRBk2wSOsDlC6GtNo0JGHX-1sO2X-lX8lg/exec';

const SESSION_KEY = 'teclingo_session_active';

let tokenClient = null;

function marcarSesionActiva() {
  sessionStorage.setItem(SESSION_KEY, 'true');
}

export function limpiarSesionSiCerraronNavegador() {
  const sesionActiva = sessionStorage.getItem(SESSION_KEY);
  if (!sesionActiva && estaAutenticado()) {
    localStorage.removeItem('teclingo_user');
    localStorage.removeItem('teclingo_token');
    return true;
  }
  return false;
}

export function estaSesionActiva() {
  return !!sessionStorage.getItem(SESSION_KEY);
}

function cargarGoogleScript() {
  return new Promise((resolve, reject) => {
    if (window.google && window.google.accounts) { resolve(window.google); return; }
    const existingScript = document.querySelector('script[src*="accounts.google.com/gsi/client"]');
    if (existingScript) {
      const check = setInterval(() => {
        if (window.google && window.google.accounts) { clearInterval(check); resolve(window.google); }
      }, 100);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      const check = setInterval(() => {
        if (window.google && window.google.accounts) { clearInterval(check); resolve(window.google); }
      }, 100);
    };
    script.onerror = () => reject(new Error('Error loading Google library'));
    document.head.appendChild(script);
  });
}

export async function loginConGoogle() {
  try {
    await cargarGoogleScript();
    const tokenResponse = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Timeout. Google window did not respond.')), 30000);
      window.google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: 'profile email',
        callback: (response) => { clearTimeout(timeout); response.error ? reject(new Error(response.error)) : resolve(response); },
        prompt: 'select_account',
      }).requestAccessToken();
    });

    const token = tokenResponse.access_token;
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!userInfoResponse.ok) throw new Error('Error getting user info');
    const userInfo = await userInfoResponse.json();

    const userData = {
      email: userInfo.email,
      nombre: userInfo.name || 'Usuario',
      picture: userInfo.picture || '',
    };

    try {
      await fetch(SHEETS_API_URL, {
        method: 'POST', mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accion: 'loginGoogle', email: userData.email, nombre: userData.nombre, picture: userData.picture })
      });
    } catch (e) { console.warn('Backend sync failed:', e); }

    const usuarioLocal = { nombre: userData.nombre, email: userData.email, picture: userData.picture };
    localStorage.setItem('teclingo_user', JSON.stringify(usuarioLocal));
    localStorage.setItem('teclingo_token', token);
    marcarSesionActiva();

    return { success: true, usuario: usuarioLocal };
  } catch (error) {
    console.error('Google login error:', error);
    return { success: false, mensaje: error.message || 'Login failed' };
  }
}

export function logout() {
  const token = localStorage.getItem('teclingo_token');
  if (token && window.google && window.google.accounts) {
    try { window.google.accounts.oauth2.revoke(token, () => {}); } catch (e) {}
  }
  localStorage.removeItem('teclingo_user');
  localStorage.removeItem('teclingo_token');
  sessionStorage.removeItem(SESSION_KEY);
}

export function estaAutenticado() {
  return !!(localStorage.getItem('teclingo_user') && localStorage.getItem('teclingo_token'));
}

export function obtenerUsuarioActual() {
  const sesionActiva = sessionStorage.getItem(SESSION_KEY);
  if (!sesionActiva) {
    localStorage.removeItem('teclingo_user');
    localStorage.removeItem('teclingo_token');
    return null;
  }
  const user = localStorage.getItem('teclingo_user');
  return user ? JSON.parse(user) : null;
}
