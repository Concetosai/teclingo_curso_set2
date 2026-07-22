const TECLINGO_API_URL = 'https://script.google.com/macros/s/AKfycbz_aCE0YmQvfCB3tLJkB7g5KXt-fev72I2vWRBk2wSOsDlC6GtNo0JGHX-1sO2X-lX8lg/exec';

export interface TutorState {
  current_day_number: number;
  streak_days: number;
  total_time_minutes: number;
  last_completed_date: string | null;
}

export interface NextPrep {
  topic: string;
  warmup_question: string;
  suggested_vocabulary: string;
}

export interface TutorContext {
  state: TutorState;
  next_prep: NextPrep | null;
}

export async function cargarEstadoTutor(userId: string): Promise<TutorContext | null> {
  try {
    const response = await fetch(TECLINGO_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        accion: 'obtenerEstadoTutor',
        datos: { user_id: userId }
      })
    });

    const respuesta = await response.json();

    if (respuesta.success) {
      return {
        state: respuesta.state,
        next_prep: respuesta.next_prep ?? null
      };
    }

    console.error('Error devuelto por la API Teclingo:', respuesta.mensaje);
    return null;
  } catch (error) {
    console.error('Error al conectar con la API de Teclingo:', error);
    return null;
  }
}
