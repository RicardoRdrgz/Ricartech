/**
 * Google Apps Script - Recepción de tickets desde formulario web
 *
 * Este script recibe datos JSON vía POST y los guarda en una hoja
 * de cálculo de Google Sheets llamada "Tickets".
 *
 * SETUP:
 * 1. Crea una nueva hoja de cálculo en Google Sheets.
 * 2. Ve a Extensiones > Apps Script.
 * 3. Pega este código completo en el editor.
 * 4. Crea una hoja llamada "Tickets" con los encabezados correspondientes
 *    (ver constante HEADERS más abajo).
 * 5. Despliega como app web: Implementar > Nueva implementación > Aplicación web.
 *    - Ejecutar como: Yo
 *    - Quién tiene acceso: Cualquier persona
 * 6. Copia la URL de despliegue y úsala como BACKEND_URL en tu script.js.
 */

// ============================================================
// CONFIGURACIÓN
// ============================================================

/** Nombre de la hoja donde se almacenan los tickets */
var SHEET_NAME = "Tickets";

/** Encabezados de las columnas en el orden exacto */
var HEADERS = [
  "ID",
  "Fecha",
  "Estado",
  "Nombre",
  "Teléfono",
  "Email",
  "Dirección",
  "Localidad",
  "CP",
  "Cliente Habitual",
  "Tipo Dispositivo",
  "Marca",
  "Modelo",
  "Serie",
  "SO",
  "Año",
  "Servicios Solicitados",
  "Síntomas",
  "Descripción Avería",
  "Fecha Inicio",
  "Intentos Previos",
  "Urgencia",
  "Modalidad",
  "Disponibilidad",
  "Backup",
  "Observaciones"
];

// ============================================================
// UTILIDADES
// ============================================================

/**
 * Une los elementos de un array en un string separado por ", ".
 * Si el valor no es un array, lo devuelve tal cual.
 * Si es null o undefined, devuelve cadena vacía.
 */
function flattenArray(value) {
  if (value === null || value === undefined) return "";
  if (Array.isArray(value)) return value.join(", ");
  return String(value);
}

/**
 * Devuelve el valor seguro de un objeto anidado.
 * Si alguna clave intermedia no existe, devuelve "".
 */
function safeGet(obj /*, ...keys */) {
  if (!obj || typeof obj !== "object") return "";
  var keys = Array.prototype.slice.call(arguments, 1);
  var current = obj;
  for (var i = 0; i < keys.length; i++) {
    if (current === null || current === undefined) return "";
    current = current[keys[i]];
  }
  return current !== null && current !== undefined ? String(current) : "";
}

/**
 * Convierte una fecha ISO a formato legible (YYYY-MM-DD HH:mm).
 * Si el valor está vacío o no es válido, devuelve "".
 */
function formatDate(value) {
  if (!value) return "";
  try {
    var d = new Date(value);
    if (isNaN(d.getTime())) return String(value);
    var pad = function (n) { return n < 10 ? "0" + n : String(n); };
    return (
      d.getFullYear() + "-" +
      pad(d.getMonth() + 1) + "-" +
      pad(d.getDate()) + " " +
      pad(d.getHours()) + ":" +
      pad(d.getMinutes())
    );
  } catch (e) {
    return String(value);
  }
}

/**
 * Asegura que la hoja "Tickets" existe y tiene los encabezados correctos.
 * Si la hoja no existe, la crea con los encabezados.
 * Si la hoja existe pero está vacía, escribe los encabezados.
 */
function ensureSheetReady() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);

  // Crear la hoja si no existe
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }

  // Escribir encabezados si la hoja está vacía (sin datos)
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    sheet.getRange(1, 1, 1, HEADERS.length)
      .setFontWeight("bold")
      .setBackground("#4285f4")
      .setFontColor("#ffffff");
  }

  return sheet;
}

/**
 * Extrae los valores planos del objeto JSON del ticket
 * y los devuelve como un array en el mismo orden que HEADERS.
 */
function parseTicket(data) {
  return [
    safeGet(data, "id"),
    formatDate(safeGet(data, "fecha")),
    safeGet(data, "estado"),
    safeGet(data, "cliente", "nombre"),
    safeGet(data, "cliente", "telefono"),
    safeGet(data, "cliente", "email"),
    safeGet(data, "cliente", "direccion"),
    safeGet(data, "cliente", "localidad"),
    safeGet(data, "cliente", "cp"),
    safeGet(data, "cliente", "habitual"),
    safeGet(data, "dispositivo", "tipo"),
    safeGet(data, "dispositivo", "marca"),
    safeGet(data, "dispositivo", "modelo"),
    safeGet(data, "dispositivo", "serie"),
    safeGet(data, "dispositivo", "so"),
    safeGet(data, "dispositivo", "anio"),
    flattenArray(safeGet(data, "averia", "servicios")),
    flattenArray(safeGet(data, "averia", "sintomas")),
    safeGet(data, "averia", "descripcion"),
    safeGet(data, "averia", "fechaInicio"),
    safeGet(data, "averia", "intentos"),
    safeGet(data, "logistica", "urgencia"),
    safeGet(data, "logistica", "modalidad"),
    flattenArray(safeGet(data, "logistica", "disponibilidad")),
    safeGet(data, "logistica", "backup"),
    safeGet(data, "extra", "observaciones")
  ];
}

/**
 * Devuelve una respuesta JSON con cabeceras CORS.
 */
function jsonResponse(data, statusCode) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ============================================================
// HANDLERS
// ============================================================

/**
 * Maneja las solicitudes POST.
 * Espera un body JSON con la estructura del ticket y lo guarda
 * en la hoja "Tickets" de la hoja de cálculo vinculada.
 */
function doPost(e) {
  // Habilitar CORS para todas las respuestas
  var corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };

  try {
    // Verificar que hay datos en el body
    if (!e.postData || !e.postData.contents) {
      return jsonResponse({ ok: false, error: "No se recibieron datos en el body" });
    }

    // Parsear el JSON del body
    var data = JSON.parse(e.postData.contents);

    // Validar que el ticket tenga al menos un ID
    if (!data.id) {
      return jsonResponse({ ok: false, error: "El campo 'id' es obligatorio" });
    }

    // Asegurar que la hoja está lista (con encabezados)
    var sheet = ensureSheetReady();

    // Extraer los valores del ticket como fila plana
    var row = parseTicket(data);

    // Añadir la nueva fila al final de la hoja
    sheet.appendRow(row);

    // Registrar en el log de ejecución de Apps Script (visible en el editor)
    Logger.log("Ticket guardado: " + data.id);

    // Responder con éxito
    return jsonResponse({ ok: true, id: data.id });

  } catch (error) {
    // Registrar el error para depuración
    Logger.log("Error en doPost: " + error.message);
    Logger.log("Stack: " + error.stack);

    // Responder con el error
    return jsonResponse({
      ok: false,
      error: "Error interno del servidor: " + error.message
    });
  }
}

/**
 * Maneja las solicitudes GET.
 * Devuelve instrucciones de uso en formato texto.
 * Útil para verificar que el despliegue está funcionando.
 */
function doGet(e) {
  var instructions = [
    "=== API de Tickets - Google Apps Script ===",
    "",
    "ESTADO: Activa",
    "",
    "MÉTODOS DISPONIBLES:",
    "",
    "  POST / (doPost)",
    "    Recibe un ticket en formato JSON y lo guarda en la hoja 'Tickets'.",
    "    Content-Type: application/json",
    "",
    "    Estructura del JSON esperado:",
    "    {",
    '      "id": "TKT-20260704-1234",',
    '      "fecha": "2026-07-04T10:00:00.000Z",',
    '      "estado": "Pendiente",',
    '      "cliente": { "nombre": "", "telefono": "", "email": "", "direccion": "", "localidad": "", "cp": "", "habitual": "" },',
    '      "dispositivo": { "tipo": "", "marca": "", "modelo": "", "serie": "", "so": "", "anio": "" },',
    '      "averia": { "servicios": [], "sintomas": [], "descripcion": "", "fechaInicio": "", "intentos": "" },',
    '      "logistica": { "urgencia": "", "modalidad": "", "disponibilidad": [], "backup": "" },',
    '      "extra": { "observaciones": "" }',
    "    }",
    "",
    "  GET / (doGet)",
    "    Devuelve estas instrucciones de uso.",
    "",
    "RESPUESTAS:",
    '  Éxito:   { "ok": true, "id": "TKT-..." }',
    '  Error:   { "ok": false, "error": "Descripción del error" }',
    "",
    "HOJA DESTINO: " + SHEET_NAME,
    "COLUMNAS: " + HEADERS.length,
    "",
    "Para más información consulta el archivo SETUP.md del proyecto."
  ].join("\n");

  return ContentService
    .createTextOutput(instructions)
    .setMimeType(ContentService.MimeType.TEXT);
}