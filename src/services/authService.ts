export interface Usuario {
  email: string;
  nombre: string;
  foto?: string;
}

export interface LoginResult {
  success: boolean;
  usuario: Usuario | null;
}

export async function loginConGoogle(): Promise<LoginResult> {
  // @ts-ignore
  const google = window.google;
  if (!google?.accounts?.oauth2) {
    console.error('Google Identity Services no cargó');
    return { success: false, usuario: null };
  }

  return new Promise((resolve) => {
    const client = google.accounts.oauth2.initTokenClient({
      client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
      scope: 'email profile',
      callback: (response: any) => {
        if (response.error) {
          resolve({ success: false, usuario: null });
          return;
        }
        fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
          headers: { Authorization: `Bearer ${response.access_token}` } // ✅ CORREGIDO: Agregadas comillas invertidas y variable
        })
          .then(r => r.json())
          .then(userInfo => {
            const usuario: Usuario = {
              email: userInfo.email,
              nombre: userInfo.name || userInfo.email.split('@')[0],
              foto: userInfo.picture
            };
            localStorage.setItem('teclingo_user', JSON.stringify(usuario));
            localStorage.setItem('teclingo_token', response.access_token);
            resolve({ success: true, usuario });
          })
          .catch(() => resolve({ success: false, usuario: null }));
      },
      error_callback: () => resolve({ success: false, usuario: null })
    });
    client.requestAccessToken();
  });
}

export function logout(): void {
  localStorage.removeItem('teclingo_user');
  localStorage.removeItem('teclingo_token');
  // @ts-ignore
  const google = window.google;
  const token = localStorage.getItem('teclingo_token');
  if (google?.accounts?.oauth2 && token) {
    google.accounts.oauth2.revoke(token, () => {});
  }
}

export function estaAutenticado(): boolean {
  return !!localStorage.getItem('teclingo_user');
}

export function obtenerUsuarioActual(): Usuario | null {
  try {
    const raw = localStorage.getItem('teclingo_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}