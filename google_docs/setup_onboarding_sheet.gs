// =============================================================
// TECLINGO - SCRIPT DE UNA SOLA EJECUCIÓN
// =============================================================
// OBJETIVO: Crear la hoja "OnboardingADN" en el Google Sheet
//           y registrar la función `guardarADN` + `obtenerADN`.
//
// INSTRUCCIONES:
//   1. Abre Google Apps Script (script.google.com)
//   2. Pega este script en tu proyecto existente (o crea uno nuevo)
//   3. Selecciona la función: configurarHojaOnboarding
//   4. Ejecuta una sola vez
//   5. Verifica que aparezca la pestaña "OnboardingADN" en tu Sheet
//
// ⚠️  NO vuelvas a ejecutar después de la primera vez.
// =============================================================

// ID de tu hoja de cálculo (debe coincidir con code.gs)
const SPREADSHEET_ID = '19Xa2wUcAGWgyp-AA8b1vrPFsLnZxZqNXbzCHG2pN6L8';

// Nombre de la nueva hoja
const SHEET_NAME = 'OnboardingADN';

// Encabezados de las columnas (14 pasos del onboarding)
const HEADERS = [
  'timestamp',          // A - Fecha/hora de completado
  'email',              // B - Correo del usuario
  'confianza',          // C - Paso 2: Confianza al hablar inglés (1-3, 4-6, 7-8, 9-10)
  'nivel',              // D - Paso 3: Nivel actual (Principiante, Intermedio, Avanzado)
  'motivo',             // E - Paso 4: Motivo principal (Profesional, Viajes, Académico, Personal)
  'meta_3m',            // F - Paso 5: Meta en 3 meses (Entrevista, Series, Redacción, Fluidez)
  'urgencia',           // G - Paso 6: Urgencia (Extrema, Alta, Moderada)
  'temas',              // H - Paso 7: Temas de interés (IA/Tech, Negocios, Cultura, Ciencia)
  'formato',            // I - Paso 8: Formato preferido (Artículos, Noticias, Películas, Podcasts)
  'estilo_sesion',      // J - Paso 9: Estilo de sesión (Cortas, Largas)
  'que_evitar',         // K - Paso 10: Qué no gusta (Gramática, Repetitivos)
  'correccion',         // L - Paso 11: Tipo de corrección (Instante, Final)
  'horario',            // M - Paso 12: Horario ideal (Mañana, Tarde, Noche)
  'minutos_dia'         // N - Paso 13: Minutos al día (15m, 30m, 60m)
];

/**
 * Función principal: Ejecuta esto una sola vez
 */
function configurarHojaOnboarding() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  
  // 1. Verificar si la hoja ya existe
  let sheet = ss.getSheetByName(SHEET_NAME);
  
  if (sheet) {
    Logger.log('⚠️ La hoja "' + SHEET_NAME + '" ya existe. Se omitirá la creación.');
    
    // Verificar si los encabezados son correctos
    const existingHeaders = sheet.getRange(1, 1, 1, HEADERS.length).getValues()[0];
    const headersMatch = HEADERS.every((h, i) => existingHeaders[i] === h);
    
    if (!headersMatch) {
      Logger.log('🔄 Actualizando encabezados de la hoja...');
      sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
      Logger.log('✅ Encabezados actualizados.');
    } else {
      Logger.log('✅ Los encabezados ya son correctos.');
    }
    
    // Verificar que las funciones guardarADN/obtenerADN existan en el proyecto
    Logger.log('ℹ️ Asegúrate de que code.gs tenga las funciones guardarADN y obtenerADN (ver PASO 2 del README).');
    return;
  }
  
  // 2. Crear la hoja
  sheet = ss.insertSheet(SHEET_NAME);
  Logger.log('✅ Hoja "' + SHEET_NAME + '" creada.');
  
  // 3. Escribir encabezados
  sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
  Logger.log('✅ Encabezados escritos: ' + HEADERS.join(', '));
  
  // 4. Formatear encabezados (negrita, fondo azul, texto blanco)
  const headerRange = sheet.getRange(1, 1, 1, HEADERS.length);
  headerRange.setFontWeight('bold');
  headerRange.setBackground('#0058bc');
  headerRange.setFontColor('#ffffff');
  headerRange.setHorizontalAlignment('center');
  
  // 5. Ajustar ancho de columnas automáticamente
  sheet.autoResizeColumns(1, HEADERS.length);
  
  // 6. Congelar la primera fila
  sheet.setFrozenRows(1);
  
  Logger.log('');
  Logger.log('=============================================');
  Logger.log('✅ CONFIGURACIÓN COMPLETADA');
  Logger.log('=============================================');
  Logger.log('Hoja creada: ' + SHEET_NAME);
  Logger.log('Columnas (' + HEADERS.length + '): ' + HEADERS.join(' → '));
  Logger.log('');
  Logger.log('SIGUIENTE PASO: Agregar las funciones guardarADN()');
  Logger.log('y obtenerADN() al archivo code.gs de producción.');
  Logger.log('=============================================');
}

/**
 * Función auxiliar: Lista el estado actual de la hoja
 */
function verificarEstadoOnboarding() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_NAME);
  
  if (!sheet) {
    Logger.log('❌ La hoja "' + SHEET_NAME + '" NO existe todavía.');
    Logger.log('   Ejecuta configurarHojaOnboarding() primero.');
    return;
  }
  
  const data = sheet.getDataRange().getValues();
  const totalRows = data.length - 1; // Sin contar encabezado
  
  Logger.log('✅ Hoja "' + SHEET_NAME + '" encontrada.');
  Logger.log('   Filas de datos: ' + totalRows);
  Logger.log('   Columnas: ' + (data[0] ? data[0].length : 0));
  
  if (totalRows > 0) {
    Logger.log('');
    Logger.log('   Últimos 5 registros:');
    const start = Math.max(1, data.length - 5);
    for (let i = start; i < data.length; i++) {
      Logger.log('   [' + i + '] ' + data[i][1] + ' | ' + data[i][0]);
    }
  }
}
