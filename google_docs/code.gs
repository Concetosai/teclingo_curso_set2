// ==========================================
// TECLINGO - PRODUCCIÓN CON OAUTH 2.0
// ==========================================
// ✅ Este archivo contiene SOLO funciones de producción.
// ❌ NO incluye scripts de setup, pruebas o inicialización.
// ⚠️ Los scripts de una sola ejecución están en pruebas.gs

// --- CONFIGURACIÓN GLOBAL ---
const CONFIG = {
  // ID de tu hoja de cálculo
  SPREADSHEET_ID: '19Xa2wUcAGWgyp-AA8b1vrPFsLnZxZqNXbzCHG2pN6L8',
  
  // Cuenta de correo para envíos (configurada en Gmail)
  EMAIL_FROM: 'conceptosaimx@gmail.com',
  
  // Nombres de las hojas (pestañas)
  SHEET_NAMES: {
    USERS: 'Usuarios',
    GRAMMAR_LOGS: 'RegistrosGramatica',
    FEEDBACK: 'Feedback',
    TOEFL_LOGS: 'RegistrosTOEFL',
    PRONUNCIATION_LOGS: 'RegistrosPronunciacion',
    SETTINGS: 'ConfiguracionApp',
    COURSE_PROGRESS: 'ProgresoCurso',
    ONBOARDING_ADN: 'OnboardingADN'
  }
};

// ==========================================
// 1. FUNCIONES DE BASE DE DATOS (SHEETS)
// ==========================================

/**
 * Guarda un nuevo usuario en la hoja 'Usuarios'
 * @param {Object} datosUsuario - {nombre, email, nivel, progreso, telefono, plan, picture, id_google}
 * @returns {Object} { success, mensaje, emailEnviado }
 */
function guardarUsuario(datosUsuario) {
  try {
    const sheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID)
                               .getSheetByName(CONFIG.SHEET_NAMES.USERS);
    
    // Verificar si el email ya existe
    const data = sheet.getDataRange().getValues();
    const now = new Date().toISOString();
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][2] === datosUsuario.email) {
        // Usuario ya existe - actualizar ultimo_acceso y metodo_registro
        const row = i + 1;
        sheet.getRange(row, 9).setValue(now);                                    // ultimo_acceso (col I)
        if (datosUsuario.metodo_registro) {
          sheet.getRange(row, 10).setValue(datosUsuario.metodo_registro);        // metodo_registro (col J)
        }
        if (datosUsuario.id_google) {
          sheet.getRange(row, 11).setValue(datosUsuario.id_google);              // id_google (col K)
        }
        if (datosUsuario.picture) {
          // Guardar picture como metadato si hay columna extra
        }
        return { 
          success: true, 
          mensaje: `Usuario ${datosUsuario.email} ya existe. ultimo_acceso actualizado.`,
          existing: true
        };
      }
    }
    
    // Agregar nueva fila con TODAS las 11 columnas
    sheet.appendRow([
      now,                                        // timestamp (col A)
      datosUsuario.nombre,                        // nombre (col B)
      datosUsuario.email,                         // email (col C)
      datosUsuario.nivel || 'A1',                 // nivel (col D)
      datosUsuario.progreso || '0',               // progreso (col E)
      datosUsuario.telefono || '',                // telefono (col F)
      datosUsuario.plan || 'Basic',               // plan (col G)
      'Activo',                                   // estado (col H)
      now,                                        // ultimo_acceso (col I)
      datosUsuario.metodo_registro || 'form',     // metodo_registro (col J)
      datosUsuario.id_google || ''                // id_google (col K)
    ]);
    
    // Registrar en log de actividad
    registrarActividad('Nuevo usuario', datosUsuario.email);
    
    return { 
      success: true, 
      mensaje: `Usuario ${datosUsuario.nombre} registrado exitosamente.`,
      existing: false
    };
    
  } catch (error) {
    console.error('Error en guardarUsuario:', error);
    return { error: true, mensaje: error.toString() };
  }
}

/**
 * Registra un análisis de gramática en la hoja 'RegistrosGramatica'
 * @param {Object} datos - {email, textoOriginal, erroresEncontrados, textoCorregido, nivel}
 * @returns {Object} { success, mensaje }
 */
function registrarAnalisisGramatica(datos) {
  try {
    const sheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID)
                               .getSheetByName(CONFIG.SHEET_NAMES.GRAMMAR_LOGS);
    
    sheet.appendRow([
      new Date().toISOString(),        // timestamp
      datos.email,                     // email del usuario
      datos.nivel || 'B1',             // nivel del usuario
      datos.textoOriginal,             // texto analizado
      datos.erroresEncontrados,        // número de errores
      datos.textoCorregido,            // texto corregido
      datos.tiempoAnalisis || ''       // tiempo de respuesta de la IA
    ]);
    
    // Actualizar contador de prácticas del usuario
    actualizarContadorPracticas(datos.email);
    
    return { success: true, mensaje: 'Análisis guardado correctamente.' };
    
  } catch (error) {
    console.error('Error en registrarAnalisisGramatica:', error);
    return { error: true, mensaje: error.toString() };
  }
}

/**
 * Registra un resultado de TOEFL en la hoja 'RegistrosTOEFL'
 * @param {Object} datos - {email, seccion, puntaje, nivel, detalles, tiempoCompletado}
 * @returns {Object} { success, mensaje }
 */
function registrarTOEFL(datos) {
  try {
    const sheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID)
                               .getSheetByName(CONFIG.SHEET_NAMES.TOEFL_LOGS);
    
    // Si la hoja no existe, crearla (fallback de seguridad)
    if (!sheet) {
      const newSheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID)
                                    .insertSheet(CONFIG.SHEET_NAMES.TOEFL_LOGS);
      newSheet.appendRow(['timestamp', 'email', 'seccion', 'puntaje', 'nivel', 'detalles', 'tiempoCompletado']);
    }
    
    const targetSheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID)
                                      .getSheetByName(CONFIG.SHEET_NAMES.TOEFL_LOGS);
    
    targetSheet.appendRow([
      new Date().toISOString(),
      datos.email,
      datos.seccion,          // Listening, Reading, Writing, etc.
      datos.puntaje,          // Score 0-30
      datos.nivel,            // MCER estimado
      datos.detalles || '',   // JSON con desglose
      datos.tiempoCompletado || ''
    ]);
    
    return { success: true, mensaje: 'Resultado TOEFL guardado.' };
    
  } catch (error) {
    console.error('Error en registrarTOEFL:', error);
    return { error: true, mensaje: error.toString() };
  }
}

/**
 * Registra un resultado de pronunciación en 'RegistrosPronunciacion'
 * @param {Object} datos - {email, palabra, puntaje, feedback, ipaDetectado, mejoras}
 * @returns {Object} { success, mensaje }
 */
function registrarPronunciacion(datos) {
  try {
    const sheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID)
                               .getSheetByName(CONFIG.SHEET_NAMES.PRONUNCIATION_LOGS);
    
    // Si la hoja no existe, crearla (fallback de seguridad)
    if (!sheet) {
      const newSheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID)
                                    .insertSheet(CONFIG.SHEET_NAMES.PRONUNCIATION_LOGS);
      newSheet.appendRow(['timestamp', 'email', 'palabra', 'puntaje', 'feedback', 'ipaDetectado', 'mejoras']);
    }
    
    const targetSheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID)
                                      .getSheetByName(CONFIG.SHEET_NAMES.PRONUNCIATION_LOGS);
    
    targetSheet.appendRow([
      new Date().toISOString(),
      datos.email,
      datos.palabra,          // Palabra o frase practicada
      datos.puntaje,          // % de precisión
      datos.feedback || '',   // Comentario de la IA
      datos.ipaDetectado || '', // IPA detectado
      datos.mejoras || ''     // Áreas de mejora
    ]);
    
    return { success: true, mensaje: 'Registro de pronunciación guardado.' };
    
  } catch (error) {
    console.error('Error en registrarPronunciacion:', error);
    return { error: true, mensaje: error.toString() };
  }
}

/**
 * Registra el progreso del curso A1 en 'ProgresoCurso'
 * @param {Object} datos - {email, subtopicId, skill, score, attempts, world, fecha}
 * @returns {Object} { success, mensaje }
 */
function registrarProgreso(datos) {
  try {
    let sheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID)
                              .getSheetByName(CONFIG.SHEET_NAMES.COURSE_PROGRESS);
    
    if (!sheet) {
      const newSheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID)
                                    .insertSheet(CONFIG.SHEET_NAMES.COURSE_PROGRESS);
      newSheet.appendRow(['timestamp', 'email', 'subtopicId', 'skill', 'score', 'attempts', 'world']);
      sheet = newSheet;
    }
    
    sheet.appendRow([
      datos.fecha || new Date().toISOString(),
      datos.email,
      datos.subtopicId,
      datos.skill,
      datos.score,
      datos.attempts,
      datos.world || 'tecnm'
    ]);
    
    return { success: true, mensaje: 'Progreso registrado.' };
    
  } catch (error) {
    console.error('Error en registrarProgreso:', error);
    return { error: true, mensaje: error.toString() };
  }
}

/**
 * Obtiene el progreso completo de un usuario desde 'ProgresoCurso'
 * @param {Object} datos - {email, world}
 * @returns {Object} { skill_stats, overall_completion, a1_achieved, ... }
 */
function obtenerProgreso(datos) {
  try {
    const sheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID)
                              .getSheetByName(CONFIG.SHEET_NAMES.COURSE_PROGRESS);
    
    if (!sheet) {
      return { skill_stats: {}, overall_completion: 0, a1_achieved: false };
    }
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const emailCol = headers.indexOf('email');
    const skillCol = headers.indexOf('skill');
    const scoreCol = headers.indexOf('score');
    const worldCol = headers.indexOf('world');
    
    const entries = [];
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (row[emailCol] === datos.email) {
        if (datos.world && row[worldCol] && row[worldCol] !== datos.world) continue;
        entries.push({
          skill: row[skillCol],
          score: parseFloat(row[scoreCol]) || 0
        });
      }
    }
    
    const skills = ['grammar', 'vocabulary', 'reading', 'listening', 'writing', 'pronunciation'];
    const skill_stats = {};
    for (const skill of skills) {
      const skillEntries = entries.filter(e => e.skill === skill);
      if (skillEntries.length > 0) {
        const scores = skillEntries.map(e => e.score);
        skill_stats[skill] = {
          avg_score: Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10,
          lessons_completed: skillEntries.length,
          best_score: Math.max(...scores),
          total_lessons: 13
        };
      } else {
        skill_stats[skill] = { avg_score: 0, lessons_completed: 0, best_score: 0, total_lessons: 13 };
      }
    }
    
    const A1_THRESHOLDS = { grammar: 70, vocabulary: 70, reading: 60, listening: 60, writing: 60, pronunciation: 60 };
    const A1_MIN_LESSONS = 8;
    const a1_skills_passed = {};
    for (const skill of skills) {
      const st = skill_stats[skill];
      const threshold = A1_THRESHOLDS[skill] || 60;
      a1_skills_passed[skill] = st.avg_score >= threshold && st.lessons_completed >= A1_MIN_LESSONS;
    }
    
    const totalEntries = entries.length;
    const totalPossible = 78;
    const overallCompletion = totalPossible > 0 ? Math.round((totalEntries / totalPossible) * 1000) / 10 : 0;
    const allScores = entries.map(e => e.score);
    const avgAll = allScores.length > 0 ? Math.round((allScores.reduce((a, b) => a + b, 0) / allScores.length) * 10) / 10 : 0;
    
    return {
      user_id: datos.email,
      world: datos.world || null,
      skill_stats: skill_stats,
      overall_completion: overallCompletion,
      overall_average: avgAll,
      total_entries: totalEntries,
      a1_achieved: Object.values(a1_skills_passed).every(v => v),
      a1_skills_passed: a1_skills_passed,
      a1_thresholds: A1_THRESHOLDS
    };
    
  } catch (error) {
    console.error('Error en obtenerProgreso:', error);
    return { error: true, mensaje: error.toString() };
  }
}

/**
 * Obtiene el progreso de un usuario para un subtopic específico
 * @param {Object} datos - {email, subtopicId}
 * @returns {Object} { grammar: {score, attempts}, vocabulary: {...}, ... }
 */
function obtenerProgresoSubtopic(datos) {
  try {
    const sheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID)
                              .getSheetByName(CONFIG.SHEET_NAMES.COURSE_PROGRESS);
    
    const skills = ['grammar', 'vocabulary', 'reading', 'listening', 'writing', 'pronunciation'];
    const result = {};
    for (const skill of skills) {
      result[skill] = { score: 0, attempts: 0 };
    }
    
    if (!sheet) return result;
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const emailCol = headers.indexOf('email');
    const subtopicCol = headers.indexOf('subtopicId');
    const skillCol = headers.indexOf('skill');
    const scoreCol = headers.indexOf('score');
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (row[emailCol] === datos.email && row[subtopicCol] === datos.subtopicId) {
        const skill = row[skillCol];
        const score = parseFloat(row[scoreCol]) || 0;
        if (result[skill]) {
          result[skill].score = Math.max(result[skill].score, score);
          result[skill].attempts += 1;
        }
      }
    }
    
    return result;
    
  } catch (error) {
    console.error('Error en obtenerProgresoSubtopic:', error);
    return { error: true, mensaje: error.toString() };
  }
}

// ==========================================
// 1B. FUNCIONES DE ONBOARDING / ADN DEL ALUMNO
// ==========================================

/**
 * Guarda las respuestas del onboarding del usuario en la hoja 'OnboardingADN'
 * @param {Object} datos - {email, confianza, nivel, motivo, meta_3m, urgencia, temas, formato, estilo_sesion, que_evitar, correccion, horario, minutos_dia}
 * @returns {Object} { success, mensaje }
 */
function guardarADN(datos) {
  try {
    let sheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID)
                              .getSheetByName(CONFIG.SHEET_NAMES.ONBOARDING_ADN);

    // Fallback: si la hoja no existe, crearla con encabezados
    if (!sheet) {
      const newSheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID)
                                    .insertSheet(CONFIG.SHEET_NAMES.ONBOARDING_ADN);
      newSheet.appendRow([
        'timestamp', 'email', 'confianza', 'nivel', 'motivo', 'meta_3m',
        'urgencia', 'temas', 'formato', 'estilo_sesion', 'que_evitar',
        'correccion', 'horario', 'minutos_dia'
      ]);
      newSheet.getRange(1, 1, 1, 14).setFontWeight('bold').setBackground('#0058bc').setFontColor('#ffffff');
      sheet = newSheet;
    }

    const now = new Date().toISOString();

    // Verificar si ya existe registro para este email → actualizar
    const data = sheet.getDataRange().getValues();
    const emailCol = 1; // col B = email

    for (let i = 1; i < data.length; i++) {
      if (String(data[i][emailCol]).toLowerCase() === String(datos.email).toLowerCase()) {
        const row = i + 1;
        sheet.getRange(row, 1).setValue(now);                    // timestamp
        sheet.getRange(row, 3).setValue(datos.confianza || '');  // confianza
        sheet.getRange(row, 4).setValue(datos.nivel || '');      // nivel
        sheet.getRange(row, 5).setValue(datos.motivo || '');     // motivo
        sheet.getRange(row, 6).setValue(datos.meta_3m || '');    // meta_3m
        sheet.getRange(row, 7).setValue(datos.urgencia || '');   // urgencia
        sheet.getRange(row, 8).setValue(datos.temas || '');      // temas
        sheet.getRange(row, 9).setValue(datos.formato || '');    // formato
        sheet.getRange(row, 10).setValue(datos.estilo_sesion || ''); // estilo_sesion
        sheet.getRange(row, 11).setValue(datos.que_evitar || '');    // que_evitar
        sheet.getRange(row, 12).setValue(datos.correccion || '');    // correccion
        sheet.getRange(row, 13).setValue(datos.horario || '');       // horario
        sheet.getRange(row, 14).setValue(datos.minutos_dia || '');   // minutos_dia

        registrarActividad('ADN actualizado', datos.email);
        return { success: true, mensaje: 'ADN actualizado para ' + datos.email };
      }
    }

    // Si no existe, insertar nueva fila
    sheet.appendRow([
      now,                       // timestamp (A)
      datos.email,               // email (B)
      datos.confianza || '',     // confianza (C)
      datos.nivel || '',         // nivel (D)
      datos.motivo || '',        // motivo (E)
      datos.meta_3m || '',       // meta_3m (F)
      datos.urgencia || '',      // urgencia (G)
      datos.temas || '',         // temas (H)
      datos.formato || '',       // formato (I)
      datos.estilo_sesion || '', // estilo_sesion (J)
      datos.que_evitar || '',    // que_evitar (K)
      datos.correccion || '',    // correccion (L)
      datos.horario || '',       // horario (M)
      datos.minutos_dia || ''    // minutos_dia (N)
    ]);

    registrarActividad('ADN guardado', datos.email);
    return { success: true, mensaje: 'ADN guardado para ' + datos.email };

  } catch (error) {
    console.error('Error en guardarADN:', error);
    return { error: true, mensaje: error.toString() };
  }
}

/**
 * Obtiene el ADN de un usuario desde la hoja 'OnboardingADN'
 * @param {Object} datos - {email}
 * @returns {Object} { email, confianza, nivel, ... } o { error }
 */
function obtenerADN(datos) {
  try {
    const sheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID)
                              .getSheetByName(CONFIG.SHEET_NAMES.ONBOARDING_ADN);

    if (!sheet) {
      return { data: null };
    }

    const data = sheet.getDataRange().getValues();
    const emailCol = 1;

    for (let i = 1; i < data.length; i++) {
      if (String(data[i][emailCol]).toLowerCase() === String(datos.email).toLowerCase()) {
        return {
          data: {
            email: data[i][1],
            confianza: data[i][2],
            nivel: data[i][3],
            motivo: data[i][4],
            meta_3m: data[i][5],
            urgencia: data[i][6],
            temas: data[i][7],
            formato: data[i][8],
            estilo_sesion: data[i][9],
            que_evitar: data[i][10],
            correccion: data[i][11],
            horario: data[i][12],
            minutos_dia: data[i][13]
          }
        };
      }
    }

    return { data: null };

  } catch (error) {
    console.error('Error en obtenerADN:', error);
    return { error: true, mensaje: error.toString() };
  }
}

// ==========================================
// 2. FUNCIONES DE EMAIL DE BIENVENIDA
// ==========================================

/**
 * Envía un email de bienvenida a un nuevo usuario
 * @param {Object} datosUsuario - {nombre, email, nivel}
 * @returns {Object} { success, mensaje }
 */
function enviarEmailBienvenida(datosUsuario) {
  try {
    const { nombre, email, nivel } = datosUsuario;
    
    const asunto = `🎉 ¡Bienvenido a Teclingo, ${nombre}!`;
    
    // Cuerpo en HTML (versión optimizada y limpia)
    const htmlBody = getHtmlBienvenida(nombre, nivel);
    
    // Versión en texto plano (fallback)
    const plainBody = `
🎉 ¡Bienvenido a Teclingo, ${nombre}!

Tu viaje hacia el dominio del inglés comienza aquí.

📚 Nivel asignado: ${nivel || 'A1'}

✨ Lo que te espera en Teclingo:
- AI Pronunciation Lab: Perfecciona tu acento
- AI Listening Lab: Entrena tu oído
- SafeZone Chat: Practica conversación sin miedo
- AI Tutor: Tu profesor personal 24/7
- TOEFL Simulator: Prepárate para el examen oficial
- Grammar & Reading Labs: Perfecciona tu escritura

🔹 ¿Tienes dudas? Escríbenos a soporte@teclingoingles.com

🌐 Accede a tu dashboard: https://teclingoingles.com

---
Teclingo — Una plataforma de Conceptos AI MX
conceptosaimx@gmail.com
    `;
    
    // Enviar el email usando la cuenta configurada
    GmailApp.sendEmail(
      email,
      asunto,
      plainBody,
      {
        htmlBody: htmlBody,
        from: CONFIG.EMAIL_FROM,
        name: 'Equipo Teclingo'
      }
    );
    
    registrarActividad('Email bienvenida enviado', email);
    
    return { success: true, mensaje: `Email de bienvenida enviado a ${email}` };
    
  } catch (error) {
    console.error('Error en enviarEmailBienvenida:', error);
    return { success: false, mensaje: error.toString() };
  }
}

/**
 * Función pública para enviar email de bienvenida (vía API)
 */
function enviarEmailBienvenidaPublico(datos) {
  const { email, nombre, nivel } = datos;
  
  if (!email || !nombre) {
    return { error: true, mensaje: 'Faltan datos: email y nombre son requeridos.' };
  }
  
  return enviarEmailBienvenida({ nombre, email, nivel });
}

/**
 * Genera el HTML del email de bienvenida
 * @param {string} nombre - Nombre del usuario
 * @param {string} nivel - Nivel asignado
 * @returns {string} HTML formateado
 */
function getHtmlBienvenida(nombre, nivel) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8f9fa; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); overflow: hidden; }
    .header { background: linear-gradient(135deg, #0058bc 0%, #007bf2 100%); padding: 30px 20px; text-align: center; }
    .header h1 { color: #ffffff; font-size: 28px; font-weight: 700; margin: 0; }
    .header .subtitle { color: rgba(255,255,255,0.85); font-size: 14px; margin-top: 8px; }
    .content { padding: 30px 25px; }
    .content h2 { color: #1a1b1f; font-size: 20px; margin-top: 0; }
    .content p { color: #4a4b50; font-size: 15px; line-height: 1.6; margin: 12px 0; }
    .features { background-color: #f4f7fc; border-radius: 12px; padding: 20px; margin: 20px 0; }
    .features ul { margin: 0; padding: 0; list-style: none; }
    .features li { padding: 8px 0; color: #1a1b1f; font-size: 14px; border-bottom: 1px solid #e8edf4; display: flex; align-items: center; gap: 10px; }
    .features li:last-child { border-bottom: none; }
    .features li::before { content: "✅"; font-size: 16px; }
    .badge { display: inline-block; background: #e8f1ff; color: #0058bc; padding: 4px 12px; border-radius: 50px; font-size: 12px; font-weight: 600; }
    .button { display: inline-block; background: linear-gradient(135deg, #0058bc 0%, #007bf2 100%); color: #ffffff !important; padding: 14px 32px; border-radius: 50px; text-decoration: none; font-weight: 600; font-size: 15px; margin-top: 10px; }
    .footer { background-color: #f4f7fc; padding: 20px; text-align: center; color: #8e8e93; font-size: 12px; border-top: 1px solid #e8edf4; }
    .footer a { color: #0058bc; text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🚀 Teclingo AI</h1>
      <div class="subtitle">Tu viaje hacia el dominio del inglés comienza aquí</div>
    </div>
    <div class="content">
      <h2>¡Hola, ${nombre}! 👋</h2>
      <p>Nos alegra muchísimo darte la bienvenida a <strong>Teclingo</strong>, la plataforma de inmersión lingüística impulsada por Inteligencia Artificial creada por <strong>Conceptos AI MX</strong>.</p>
      <p><span class="badge">🎯 Nivel Asignado: ${nivel || 'A1'}</span></p>
      <div class="features">
        <p style="font-weight: 600; color: #0058bc; margin-top: 0;">✨ Lo que te espera en Teclingo:</p>
        <ul>
          <li><strong>AI Pronunciation Lab</strong> — Perfecciona tu acento con análisis fonético en tiempo real</li>
          <li><strong>AI Listening Lab</strong> — Entrena tu oído con diálogos reales generados por IA</li>
          <li><strong>SafeZone Chat</strong> — Practica conversación sin miedo con nuestra IA empática</li>
          <li><strong>AI Tutor</strong> — Tu profesor personal disponible 24/7</li>
          <li><strong>TOEFL Simulator</strong> — Prepárate para el examen oficial con simulaciones calibradas</li>
          <li><strong>Grammar & Reading Labs</strong> — Perfecciona tu escritura y comprensión lectora</li>
        </ul>
      </div>
      <p><strong>🔹 ¿Tienes dudas o necesitas ayuda?</strong><br>Nuestro equipo de soporte está disponible en <a href="mailto:soporte@teclingoingles.com" style="color: #0058bc;">soporte@teclingoingles.com</a></p>
      <p style="text-align: center; margin: 25px 0;">
        <a href="https://teclingoingles.com" class="button">🎯 Comenzar ahora</a>
      </p>
      <p style="font-size: 13px; color: #6c6c70; text-align: center;">📚 Los 12 niveles de Teclingo están alineados al <strong>TecNM</strong> y al estándar internacional <strong>MCER (B1/B2)</strong>.</p>
    </div>
    <div class="footer">
      <p><strong>Teclingo</strong> — Una plataforma de <strong>Conceptos AI MX</strong><br>
      <a href="https://teclingoingles.com">teclingoingles.com</a> &middot; 
      <a href="mailto:soporte@teclingoingles.com">soporte@teclingoingles.com</a></p>
      <p style="margin-top: 8px; font-size: 11px;">© 2026 Conceptos AI MX. Todos los derechos reservados.</p>
    </div>
  </div>
</body>
</html>`;
}

// ==========================================
// 3. FUNCIONES DE GMAIL (Correos)
// ==========================================

/**
 * Envía un email usando Gmail desde la cuenta configurada
 * @param {Object} datos - {destinatario, asunto, cuerpo, html}
 * @returns {Object} { success, mensaje }
 */
function enviarEmail(datos) {
  try {
    const { destinatario, asunto, cuerpo, html } = datos;
    
    if (!destinatario || !destinatario.includes('@')) {
      return { error: true, mensaje: 'Email inválido.' };
    }
    
    const opciones = { 
      from: CONFIG.EMAIL_FROM,
      name: 'Teclingo AI Team',
      replyTo: 'soporte@teclingoingles.com'
    };
    
    if (html) {
      opciones.htmlBody = html;
    }
    
    GmailApp.sendEmail(destinatario, asunto, cuerpo, opciones);
    registrarActividad('Email enviado', destinatario);
    
    return { success: true, mensaje: `Email enviado a ${destinatario}` };
    
  } catch (error) {
    console.error('Error en enviarEmail:', error);
    return { error: true, mensaje: error.toString() };
  }
}

/**
 * Envía un email masivo a todos los usuarios activos
 * @param {string} asunto - Asunto del correo
 * @param {string} cuerpo - Cuerpo del correo
 * @returns {Object} { success, mensaje, enviados, total }
 */
function enviarEmailMasivo(asunto, cuerpo) {
  try {
    const sheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID)
                               .getSheetByName(CONFIG.SHEET_NAMES.USERS);
    
    const data = sheet.getDataRange().getValues();
    const emails = data.slice(1)
                      .filter(row => row[7] === 'Activo')
                      .map(row => row[2]);
    
    if (emails.length === 0) {
      return { error: true, mensaje: 'No hay usuarios activos.' };
    }
    
    let enviados = 0;
    for (const email of emails) {
      try {
        GmailApp.sendEmail(email, asunto, cuerpo, { 
          from: CONFIG.EMAIL_FROM,
          name: 'Teclingo AI Team' 
        });
        enviados++;
      } catch (e) {
        console.error(`Error enviando a ${email}:`, e);
      }
    }
    
    registrarActividad('Email masivo enviado', `${enviados} de ${emails.length}`);
    
    return { 
      success: true, 
      mensaje: `Emails enviados a ${enviados} de ${emails.length} usuarios.`,
      enviados: enviados,
      total: emails.length
    };
    
  } catch (error) {
    console.error('Error en enviarEmailMasivo:', error);
    return { error: true, mensaje: error.toString() };
  }
}

// ==========================================
// 4. FUNCIONES DE CALENDARIO
// ==========================================

/**
 * Crea un evento en Google Calendar
 * @param {Object} datos - {titulo, fechaInicio, fechaFin, descripcion, emailInvitado}
 * @returns {Object} { success, mensaje, idEvento, enlace }
 */
function crearEventoCalendario(datos) {
  try {
    const { titulo, fechaInicio, fechaFin, descripcion, emailInvitado } = datos;
    
    const calendar = CalendarApp.getDefaultCalendar();
    
    const evento = calendar.createEvent(
      titulo,
      new Date(fechaInicio),
      new Date(fechaFin),
      { 
        description: descripcion || '',
        guests: emailInvitado ? [emailInvitado] : [],
        sendInvites: true
      }
    );
    
    registrarActividad('Evento creado', titulo);
    
    return { 
      success: true, 
      mensaje: 'Evento creado exitosamente',
      idEvento: evento.getId(),
      enlace: evento.getUrl()
    };
    
  } catch (error) {
    console.error('Error en crearEventoCalendario:', error);
    return { error: true, mensaje: error.toString() };
  }
}

// ==========================================
// 5. FUNCIONES AUXILIARES (Internas)
// ==========================================

/**
 * Actualiza el contador de prácticas de un usuario
 * @param {string} email - Email del usuario
 */
function actualizarContadorPracticas(email) {
  try {
    const sheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID)
                               .getSheetByName(CONFIG.SHEET_NAMES.USERS);
    
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][2] === email) {
        const progresoActual = parseInt(data[i][4]) || 0;
        const nuevoProgreso = Math.min(progresoActual + 1, 100);
        sheet.getRange(i + 1, 5).setValue(nuevoProgreso);
        break;
      }
    }
  } catch (error) {
    console.error('Error actualizando contador:', error);
  }
}

/**
 * Registra actividad general en la hoja de configuración
 * @param {string} tipo - Tipo de actividad
 * @param {string} detalle - Detalle de la actividad
 */
function registrarActividad(tipo, detalle) {
  try {
    let sheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID)
                              .getSheetByName(CONFIG.SHEET_NAMES.SETTINGS);
    
    // Si la hoja no existe, crearla (fallback de seguridad)
    if (!sheet) {
      const newSheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID)
                                    .insertSheet(CONFIG.SHEET_NAMES.SETTINGS);
      newSheet.appendRow(['timestamp', 'tipo', 'detalle', 'usuario']);
      sheet = newSheet;
    }
    
    sheet.appendRow([
      new Date().toISOString(),
      tipo,
      detalle,
      Session.getActiveUser().getEmail() || 'Script'
    ]);
  } catch (error) {
    console.error('Error registrando actividad:', error);
  }
}

// ==========================================
// 6. ENRUTADOR PRINCIPAL (WEB APP)
// ==========================================

/**
 * Punto de entrada para peticiones POST
 * Recibe las acciones del frontend y las enruta a las funciones correspondientes
 */
function doPost(e) {
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };

  // Handle preflight
  if (e.parameter && e.parameter.method === 'OPTIONS') {
    return ContentService
      .createTextOutput('')
      .setMimeType(ContentService.MimeType.JSON);
  }

  try {
    const params = JSON.parse(e.postData.contents);
    const accion = params.accion;
    
    console.log(`[Teclingo API] Accion: ${accion}`);
    
    let respuesta = {};
    
    switch(accion) {
      case 'loginGoogle':
        respuesta = guardarUsuario({
          nombre: params.nombre,
          email: params.email,
          nivel: 'A1',
          progreso: '0',
          plan: 'Basic',
          metodo_registro: 'google',
          id_google: params.id_google || '',
          picture: params.picture || ''
        });
        break;
        
      case 'guardarUsuario':
        respuesta = guardarUsuario(params.datos);
        break;
        
      case 'registrarGramatica':
        respuesta = registrarAnalisisGramatica(params.datos);
        break;
        
      case 'registrarTOEFL':
        respuesta = registrarTOEFL(params.datos);
        break;
        
      case 'registrarPronunciacion':
        respuesta = registrarPronunciacion(params.datos);
        break;
        
      case 'registrarActividad':
        registrarActividad(params.datos.tipo || 'activity', params.datos.detalle || '');
        respuesta = { success: true, mensaje: 'Actividad registrada.' };
        break;
        
      case 'registrarProgreso':
        respuesta = registrarProgreso(params.datos);
        break;

      case 'obtenerProgreso':
        respuesta = obtenerProgreso(params.datos);
        break;

      case 'obtenerProgresoSubtopic':
        respuesta = obtenerProgresoSubtopic(params.datos);
        break;

      case 'guardarADN':
        respuesta = guardarADN(params.datos);
        break;

      case 'obtenerADN':
        respuesta = obtenerADN(params.datos);
        break;
        
      case 'enviarBienvenida':
        respuesta = enviarEmailBienvenidaPublico(params.datos);
        break;
        
      case 'enviarEmail':
        respuesta = enviarEmail({
          destinatario: params.email,
          asunto: params.asunto,
          cuerpo: params.cuerpo,
          html: params.html
        });
        break;
        
      case 'enviarEmailMasivo':
        respuesta = enviarEmailMasivo(params.asunto, params.cuerpo);
        break;
        
      case 'crearEvento':
        respuesta = crearEventoCalendario({
          titulo: params.titulo,
          fechaInicio: params.inicio,
          fechaFin: params.fin,
          descripcion: params.descripcion,
          emailInvitado: params.emailInvitado
        });
        break;
        
      case 'getEstadisticas':
        respuesta = obtenerEstadisticas();
        break;
        
      default:
        throw new Error(`Acción no válida: ${accion}`);
    }
    
    return ContentService
      .createTextOutput(JSON.stringify(respuesta))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    console.error('Error en doPost:', error);
    return ContentService
      .createTextOutput(JSON.stringify({
        error: true,
        mensaje: error.toString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Punto de entrada para peticiones GET (verificación)
 */
function doGet() {
  return ContentService
    .createTextOutput(JSON.stringify({
      mensaje: 'Teclingo API v2.0 - Servicio activo',
      status: 'online',
      version: '2.0.0',
      documentacion: 'Usa POST para interactuar con la API.'
    }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ==========================================
// 7. FUNCIONES DE ESTADÍSTICAS Y DIAGNÓSTICO
// ==========================================

/**
 * Obtiene estadísticas de la base de datos
 * @returns {Object} Estadísticas de todas las hojas
 */
function obtenerEstadisticas() {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    const stats = {
      timestamp: new Date().toISOString(),
      usuario: Session.getActiveUser().getEmail() || 'Script'
    };
    
    for (const [key, nombre] of Object.entries(CONFIG.SHEET_NAMES)) {
      const sheet = ss.getSheetByName(nombre);
      if (sheet) {
        const rows = sheet.getDataRange().getValues();
        stats[key] = {
          nombre: nombre,
          filas: rows.length - 1,
          columnas: rows[0] ? rows[0].length : 0
        };
      } else {
        stats[key] = { nombre: nombre, filas: 0, columnas: 0, error: 'No encontrada' };
      }
    }
    
    return stats;
    
  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    return { error: error.toString() };
  }
}

/**
 * Verifica la conexión con la hoja de cálculo
 * @returns {Object} Estado de la conexión
 */
function verificarConexion() {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    return {
      success: true,
      mensaje: `Conexión exitosa: "${ss.getName()}"`,
      url: ss.getUrl(),
      hojas: ss.getSheets().map(s => s.getName())
    };
  } catch (error) {
    return {
      success: false,
      mensaje: `Error de conexión: ${error.toString()}`
    };
  }
}

// ==========================================
// 8. FUNCIONES DE AUTENTICACIÓN OAUTH 2.0
// ==========================================

/**
 * 🔐 Verifica el token de acceso de Google OAuth 2.0
 * @param {string} token - Token de acceso de Google
 * @returns {Object} { autenticado, email, nombre, mensaje }
 */
function verificarTokenGoogle(token) {
  try {
    if (!token) {
      return { autenticado: false, mensaje: 'Token de acceso requerido.' };
    }
    
    // Verificar el token con Google's tokeninfo endpoint
    const url = `https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=${token}`;
    const response = UrlFetchApp.fetch(url);
    const data = JSON.parse(response.getContentText());
    
    // Verificar que el token sea válido y el audience coincida
    if (data.aud !== CONFIG.OAUTH.client_id) {
      return { 
        autenticado: false, 
        mensaje: 'Token inválido: no coincide con el cliente ID.' 
      };
    }
    
    return {
      autenticado: true,
      email: data.email,
      nombre: data.name || data.email?.split('@')[0] || 'Usuario',
      picture: data.picture || ''
    };
    
  } catch (error) {
    console.error('Error verificando token Google:', error);
    return { autenticado: false, mensaje: error.toString() };
  }
}

/**
 * 🔐 Autentica un usuario con Google OAuth 2.0
 * @param {Object} datos - { token, email, nombre }
 * @returns {Object} { success, usuario, mensaje }
 */
function autenticarUsuarioGoogle(datos) {
  try {
    const { token, email, nombre } = datos;
    
    // Verificar el token con Google
    const verificacion = verificarTokenGoogle(token);
    
    if (!verificacion.autenticado) {
      return { 
        success: false, 
        mensaje: verificacion.mensaje || 'Error de autenticación.' 
      };
    }
    
    // Verificar si el usuario existe en la base de datos
    const sheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID)
                               .getSheetByName(CONFIG.SHEET_NAMES.USERS);
    
    const data = sheet.getDataRange().getValues();
    let usuarioExistente = null;
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][2] === verificacion.email) {
        usuarioExistente = {
          nombre: data[i][1],
          email: data[i][2],
          nivel: data[i][3],
          progreso: data[i][4],
          plan: data[i][6],
          estado: data[i][7]
        };
        break;
      }
    }
    
    // Si no existe, crearlo automáticamente (login social)
    if (!usuarioExistente) {
      const nombreUsuario = verificacion.nombre || nombre || 'Usuario Google';
      
      // Registrar nuevo usuario con Google
      const nuevoUsuario = {
        nombre: nombreUsuario,
        email: verificacion.email,
        nivel: 'A1',
        progreso: '0',
        telefono: '',
        plan: 'Basic'
      };
      
      const registro = guardarUsuario(nuevoUsuario);
      
      if (registro.error) {
        return { 
          success: false, 
          mensaje: 'Error al crear usuario: ' + registro.mensaje 
        };
      }
      
      usuarioExistente = {
        nombre: nombreUsuario,
        email: verificacion.email,
        nivel: 'A1',
        progreso: '0',
        plan: 'Basic',
        estado: 'Activo'
      };
    }
    
    // Registrar actividad de login
    registrarActividad('Login Google', verificacion.email);
    
    return {
      success: true,
      mensaje: 'Autenticación exitosa',
      usuario: {
        nombre: usuarioExistente.nombre,
        email: usuarioExistente.email,
        nivel: usuarioExistente.nivel,
        progreso: usuarioExistente.progreso,
        plan: usuarioExistente.plan,
        estado: usuarioExistente.estado
      }
    };
    
  } catch (error) {
    console.error('Error en autenticarUsuarioGoogle:', error);
    return { success: false, mensaje: error.toString() };
  }
}

/**
 * 🔐 Función pública para autenticación (vía API)
 */
function loginConGoogle(datos) {
  const { token, email, nombre } = datos;
  
  if (!token) {
    return { error: true, mensaje: 'Token de Google requerido.' };
  }
  
  return autenticarUsuarioGoogle({ token, email, nombre });
}

/**
 * 🔐 Genera un token de sesión interno para la app
 * @param {string} email - Email del usuario
 * @returns {string} Token de sesión JWT (simulado)
 */
function generarTokenSesion(email) {
  // En producción, usa una librería JWT real
  // Esta es una versión simplificada para demostración
  const payload = {
    email: email,
    timestamp: Date.now(),
    exp: Date.now() + (24 * 60 * 60 * 1000) // 24 horas
  };
  
  // Token simple (en producción usar JWT con firma)
  return btoa(JSON.stringify(payload));
}

/**
 * 🔐 Valida un token de sesión interno
 * @param {string} token - Token de sesión
 * @returns {Object} { valido, email, expirado }
 */
function validarTokenSesion(token) {
  try {
    if (!token) return { valido: false, mensaje: 'Token requerido.' };
    
    const payload = JSON.parse(atob(token));
    
    if (payload.exp && payload.exp < Date.now()) {
      return { valido: false, mensaje: 'Token expirado.' };
    }
    
    return {
      valido: true,
      email: payload.email,
      mensaje: 'Token válido.'
    };
    
  } catch (error) {
    console.error('Error validando token:', error);
    return { valido: false, mensaje: error.toString() };
  }
}