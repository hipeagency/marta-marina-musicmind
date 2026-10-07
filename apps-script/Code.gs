/* =========================================================
   Marta Marina — MusicMind · Newsletter endpoint
   Google Apps Script Web App
   ---------------------------------------------------------
   Qué hace:
   - Recibe el email del formulario de la web (POST).
   - Te envía un aviso por Gmail con cada alta.
   - Guarda cada alta en una Google Sheet (opcional pero recomendado).
   ========================================================= */

// ====== CONFIGURA ESTO ======================================
// 1) Email(s) donde quieres recibir los avisos.
//    Puedes poner uno o VARIOS separados por coma:
var NOTIFY_EMAIL = 'maxim@hipeagency.es, hipebasketballagency@gmail.com, marta.marina@musicmind.es, martamarinachacon2@gmail.com';

// 2) Guardar todo en un Excel (Google Sheet).
//    Crea una hoja de cálculo vacía en Google, copia el ID de su URL
//    (docs.google.com/spreadsheets/d/ESTE_ID/edit) y pégalo aquí.
//    Se crean solas dos pestañas: la de SHEET_NAME (newsletter) y "Mensajes".
//    Si lo dejas vacío, solo se envían los avisos por email (sin Excel).
var SHEET_ID = '1KHgp_kiLbRdO7Bw5z3pSpuAlVPJwamV-xO8b3xnsZMg';
var SHEET_NAME = 'LEADS WEB MUSIC MIND';
// ============================================================

// Texto EXACTO que el usuario acepta en cada formulario. Es la prueba de
// consentimiento (RGPD): guárdalo tal cual aparece en la web. Si cambias el
// texto en la web, actualiza también estas constantes (idealmente subiendo la
// versión) para que quede registrado a qué consintió cada persona y cuándo.
var CONSENT_VERSION = '2026-10-07';
var CONSENT_TEXT_CONTACT = 'He leído y acepto la política de privacidad y el tratamiento de mis datos para responder a mi consulta.';
var CONSENT_TEXT_NEWS = 'Acepto recibir la newsletter y la política de privacidad. Sin spam; puedes darte de baja cuando quieras.';

function doPost(e) {
  try {
    var p = (e && e.parameter) ? e.parameter : {};
    var type = p.type || 'newsletter';
    var email = (p.email || '').trim();
    var source = p.source || 'web';
    var consent = String(p.consent || '') === 'true';

    if (!isValidEmail(email)) {
      return json({ result: 'error', message: 'Email no válido.' });
    }

    // RGPD: sin consentimiento explícito no se guarda ni se procesa nada.
    if (!consent) {
      return json({ result: 'error', message: 'Falta el consentimiento.' });
    }

    var ts = new Date();
    var consentText = (type === 'contact') ? CONSENT_TEXT_CONTACT : CONSENT_TEXT_NEWS;
    var consentCell = 'Sí · v' + CONSENT_VERSION;

    // ---- Mensaje de contacto (formulario modal) ----
    if (type === 'contact') {
      var name = (p.name || '').trim();
      var message = (p.message || '').trim();
      if (!name || !message) {
        return json({ result: 'error', message: 'Faltan datos.' });
      }
      if (SHEET_ID) {
        var ssc = SpreadsheetApp.openById(SHEET_ID);
        var msgSheet = ssc.getSheetByName('Mensajes') || ssc.insertSheet('Mensajes');
        ensureHeader(msgSheet, ['Fecha', 'Nombre', 'Email', 'Mensaje', 'Origen', 'Consentimiento', 'Texto consentimiento']);
        msgSheet.appendRow([ts, name, email, message, source, consentCell, consentText]);
      }
      MailApp.sendEmail({
        to: NOTIFY_EMAIL,
        replyTo: email,
        subject: '✉ Nuevo mensaje · MusicMind — ' + name,
        htmlBody:
          '<div style="font-family:Helvetica,Arial,sans-serif;color:#2F4A55">' +
          '<h2 style="font-weight:400">Nuevo mensaje desde la web</h2>' +
          '<p><b>Nombre:</b> ' + escapeHtml(name) + '</p>' +
          '<p><b>Email:</b> ' + escapeHtml(email) + '</p>' +
          '<p><b>Mensaje:</b></p><p style="white-space:pre-wrap">' + escapeHtml(message) + '</p>' +
          '<p style="color:#6E8A96"><b>Fecha:</b> ' + ts.toLocaleString() + '</p>' +
          '<p style="color:#6E8A96"><b>Consentimiento:</b> ' + escapeHtml(consentCell) + ' — «' + escapeHtml(consentText) + '»</p>' +
          '</div>'
      });
      return json({ result: 'success', message: 'Mensaje enviado.' });
    }

    // Guardar en Sheet (si está configurada)
    if (SHEET_ID) {
      var ss = SpreadsheetApp.openById(SHEET_ID);
      var sheet = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
      ensureHeader(sheet, ['Fecha', 'Email', 'Origen', 'Consentimiento', 'Texto consentimiento']);
      // Evitar duplicados (Email sigue en la columna 2)
      var existing = sheet.getRange(2, 2, Math.max(sheet.getLastRow() - 1, 0) || 1, 1).getValues()
        .map(function (r) { return String(r[0]).toLowerCase(); });
      if (existing.indexOf(email.toLowerCase()) === -1) {
        sheet.appendRow([ts, email, source, consentCell, consentText]);
      }
    }

    // Aviso por email
    MailApp.sendEmail({
      to: NOTIFY_EMAIL,
      subject: '✦ Nueva suscripción · MusicMind',
      htmlBody:
        '<div style="font-family:Helvetica,Arial,sans-serif;color:#2F4A55">' +
        '<h2 style="font-weight:400">Nueva alta en la newsletter</h2>' +
        '<p><b>Email:</b> ' + escapeHtml(email) + '</p>' +
        '<p><b>Origen:</b> ' + escapeHtml(source) + '</p>' +
        '<p style="color:#6E8A96"><b>Fecha:</b> ' + ts.toLocaleString() + '</p>' +
        '<p style="color:#6E8A96"><b>Consentimiento:</b> ' + escapeHtml(consentCell) + ' — «' + escapeHtml(consentText) + '»</p>' +
        '</div>'
    });

    return json({ result: 'success', message: 'Suscripción registrada.' });
  } catch (err) {
    return json({ result: 'error', message: 'Error interno: ' + err });
  }
}

// Healthcheck (abrir la URL en el navegador)
function doGet() {
  return json({ result: 'ok', message: 'MusicMind newsletter endpoint activo.' });
}

// Escribe la cabecera en la fila 1. Compatible con hojas antiguas: las columnas
// de consentimiento se añaden al final, sin mover las que ya existían.
function ensureHeader(sheet, cols) {
  sheet.getRange(1, 1, 1, cols.length).setValues([cols]);
}

function isValidEmail(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
