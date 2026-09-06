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

/** Shared secret — cambiar por un valor único y guardarlo en PropertiesService */
var API_SECRET = "RT-" + Utilities.getUuid().substring(0, 8);

/** Límites de validación */
var MAX_FIELD_LENGTH = 500;
var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
var PHONE_RE = /^[+]?[\d\s\-()]{7,20}$/;

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
 */
function flattenArray(value) {
  if (value === null || value === undefined) return "";
  if (Array.isArray(value)) return value.join(", ");
  return String(value);
}

/**
 * Devuelve el valor seguro de un objeto anidado.
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
 * Trunca un string al máximo de caracteres permitidos.
 */
function truncate(value, maxLen) {
  var s = String(value || "");
  return s.length > maxLen ? s.substring(0, maxLen) : s;
}

/**
 * Valida los campos requeridos y formatos del ticket.
 * Devuelve null si es válido, o un string con el mensaje de error.
 */
function validateTicket(data) {
  if (!data.id || typeof data.id !== "string") return "ID inválido";
  if (data.id.length > 100) return "ID demasiado largo";

  var nombre = safeGet(data, "cliente", "nombre");
  if (!nombre || nombre.trim().length === 0) return "Nombre del cliente requerido";
  if (nombre.length > MAX_FIELD_LENGTH) return "Nombre demasiado largo";

  var email = safeGet(data, "cliente", "email");
  if (email && !EMAIL_RE.test(email)) return "Email inválido";

  var telefono = safeGet(data, "cliente", "telefono");
  if (telefono && !PHONE_RE.test(telefono)) return "Teléfono inválido";

  return null;
}

/**
 * EscapaHTML para prevenir XSS en datos almacenados.
 */
function escapeHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
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
  try {
    if (!e.postData || !e.postData.contents) {
      return jsonResponse({ ok: false, error: "No se recibieron datos" });
    }

    var data = JSON.parse(e.postData.contents);

    // Validar campos requeridos y formatos
    var validationError = validateTicket(data);
    if (validationError) {
      return jsonResponse({ ok: false, error: validationError });
    }

    // Truncar campos para evitar abuso
    var row = parseTicket(data).map(function(val) {
      return truncate(val, MAX_FIELD_LENGTH);
    });

    var sheet = ensureSheetReady();
    sheet.appendRow(row);

    Logger.log("Ticket guardado: " + data.id);
    return jsonResponse({ ok: true, id: data.id });

  } catch (error) {
    Logger.log("Error en doPost: " + error.message);
    return jsonResponse({ ok: false, error: "Error interno del servidor" });
  }
}

/**
 * Maneja las solicitudes GET.
 * Devuelve instrucciones de uso en formato texto.
 * Útil para verificar que el despliegue está funcionando.
 */
function doGet(e) {
  return ContentService
    .createTextOutput("Ricartech API - Activa")
    .setMimeType(ContentService.MimeType.TEXT);
}