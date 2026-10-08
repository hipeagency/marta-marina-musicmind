/* =========================================================
   Marta Marina — Music Mind · Endpoint de formularios
   Google Apps Script Web App
   ---------------------------------------------------------
   Qué hace:
   - Newsletter (web): guarda el alta, envía el email de bienvenida
     con el audio de regalo y te avisa por email.
   - Contacto (web): guarda el mensaje y te avisa por email.
   - Lead (landing de audio): guarda el lead, le envía el audio
     por email y te avisa.
   - En todos los casos registra el consentimiento (RGPD).
   ========================================================= */

// ====== CONFIGURA ESTO ======================================
// 1) Email(s) donde quieres recibir los avisos (separados por coma).
var NOTIFY_EMAIL = 'maxim@hipeagency.es, hipebasketballagency@gmail.com, marta.marina@musicmind.es, martamarinachacon2@gmail.com';

// 2) Google Sheet donde se registra todo. Pestañas: SHEET_NAME (newsletter),
//    "Mensajes" (contacto) y LEADS_SHEET_NAME (landing). Se crean solas.
var SHEET_ID = '1KHgp_kiLbRdO7Bw5z3pSpuAlVPJwamV-xO8b3xnsZMg';
var SHEET_NAME = 'LEADS WEB MUSIC MIND';
var LEADS_SHEET_NAME = 'LEADS AUDIO';

// 3) Remitente de los emails que reciben los suscriptores.
//    Se envían desde la cuenta de Google que ejecuta este script; aquí solo
//    se fija el nombre visible y a qué dirección llegan las respuestas.
var SENDER_NAME = 'Marta Marina · Music Mind';
var REPLY_TO = 'marta.marina@musicmind.es';
var SITE_URL = 'https://www.musicmind.es/';

// 4) Audios de regalo. Sube los MP3 a la carpeta assets/audio/ de la web.
//    Si url está vacía, no se envía el email del audio (solo se registra).
var WELCOME_AUDIO = {
  title: 'Antes de entrar',
  url: 'https://www.musicmind.es/assets/audio/antes-de-entrar.mp3'
};
// Una entrada por landing. La clave es el MAGNET de la landing (kit-emergencia/index.html).
var LEAD_MAGNETS = {
  'kit-emergencia': {
    title: 'Tu kit de emergencia',
    url: 'https://www.musicmind.es/assets/audio/kit-emergencia.mp3',
    intro: 'Aquí tienes tu kit de emergencia: cuatro minutos para parar, respirar y volver a ti. Mejor con auriculares, en un sitio donde puedas cerrar los ojos un momento.',
    outro: 'Guárdalo cerca y úsalo cada vez que sientas que el ritmo de fuera intenta arrastrarte. Recuerda que siempre puedes parar, y que el camino de regreso a ti está solo a una exhalación de distancia.'
  }
};
// ============================================================

// Texto EXACTO que el usuario acepta en cada formulario. Es la prueba de
// consentimiento (RGPD): guárdalo tal cual aparece en la web. Si cambias el
// texto en la web, actualiza también estas constantes (subiendo la versión)
// para que quede registrado a qué consintió cada persona y cuándo.
var CONSENT_VERSION = '2026-10-07';
var CONSENT_TEXT_CONTACT = 'He leído y acepto la política de privacidad y el tratamiento de mis datos para responder a mi consulta.';
var CONSENT_TEXT_NEWS = 'Acepto recibir la newsletter y la política de privacidad. Sin spam; puedes darte de baja cuando quieras.';
var CONSENT_TEXT_LEAD = 'He leído y acepto la política de privacidad y que se use mi email para enviarme este audio.';

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
    var consentCell = 'Sí · v' + CONSENT_VERSION;

    if (type === 'contact') return handleContact(p, email, source, ts, consentCell);
    if (type === 'lead') return handleLead(p, email, source, ts, consentCell);
    return handleNewsletter(email, source, ts, consentCell);
  } catch (err) {
    return json({ result: 'error', message: 'Error interno: ' + err });
  }
}

// ---- Mensaje de contacto (formulario modal) ----
function handleContact(p, email, source, ts, consentCell) {
  var name = (p.name || '').trim();
  var message = (p.message || '').trim();
  if (!name || !message) {
    return json({ result: 'error', message: 'Faltan datos.' });
  }
  if (SHEET_ID) {
    var sheet = getSheet('Mensajes', ['Fecha', 'Nombre', 'Email', 'Mensaje', 'Origen', 'Consentimiento', 'Texto consentimiento']);
    sheet.appendRow([ts, name, email, message, source, consentCell, CONSENT_TEXT_CONTACT]);
  }
  MailApp.sendEmail({
    to: NOTIFY_EMAIL,
    replyTo: email,
    subject: '✉ Nuevo mensaje · Music Mind — ' + name,
    htmlBody: notifyHtml('Nuevo mensaje desde la web', [
      ['Nombre', name], ['Email', email], ['Mensaje', message], ['Fecha', ts.toLocaleString()],
      ['Consentimiento', consentCell + ' — «' + CONSENT_TEXT_CONTACT + '»']
    ])
  });
  return json({ result: 'success', message: 'Mensaje enviado.' });
}

// ---- Alta en la newsletter (web) + email de bienvenida con audio ----
function handleNewsletter(email, source, ts, consentCell) {
  var isNew = true;
  if (SHEET_ID) {
    var sheet = getSheet(SHEET_NAME, ['Fecha', 'Email', 'Origen', 'Consentimiento', 'Texto consentimiento']);
    isNew = !emailExists(sheet, 2, email);
    if (isNew) sheet.appendRow([ts, email, source, consentCell, CONSENT_TEXT_NEWS]);
  }

  // Bienvenida solo la primera vez, para no reenviarla si alguien se suscribe dos veces.
  if (isNew && WELCOME_AUDIO.url) {
    sendToSubscriber(email, 'Bienvenida a Music Mind · tu audio de regalo', welcomeHtml());
  }

  MailApp.sendEmail({
    to: NOTIFY_EMAIL,
    subject: '✦ Nueva suscripción · Music Mind',
    htmlBody: notifyHtml('Nueva alta en la newsletter', [
      ['Email', email], ['Origen', source], ['Fecha', ts.toLocaleString()],
      ['Ya estaba suscrito', isNew ? 'No' : 'Sí (no se reenvía la bienvenida)'],
      ['Consentimiento', consentCell + ' — «' + CONSENT_TEXT_NEWS + '»']
    ])
  });
  return json({ result: 'success', message: 'Suscripción registrada.' });
}

// ---- Lead desde una landing de audio ----
function handleLead(p, email, source, ts, consentCell) {
  var key = p.magnet || '';
  var magnet = LEAD_MAGNETS[key];
  if (!magnet) {
    return json({ result: 'error', message: 'Contenido no encontrado.' });
  }
  if (SHEET_ID) {
    var sheet = getSheet(LEADS_SHEET_NAME, ['Fecha', 'Email', 'Audio', 'Origen', 'Consentimiento', 'Texto consentimiento']);
    sheet.appendRow([ts, email, key, source, consentCell, CONSENT_TEXT_LEAD]);
  }
  // Se envía siempre (aunque repita): quien lo pide otra vez probablemente lo ha perdido.
  if (magnet.url) {
    sendToSubscriber(email, magnet.title + ' · Music Mind', leadHtml(magnet));
  }
  MailApp.sendEmail({
    to: NOTIFY_EMAIL,
    subject: '♪ Nuevo lead · ' + magnet.title,
    htmlBody: notifyHtml('Nuevo lead desde la landing', [
      ['Email', email], ['Audio', key + ' · ' + magnet.title], ['Origen', source],
      ['Fecha', ts.toLocaleString()],
      ['Consentimiento', consentCell + ' — «' + CONSENT_TEXT_LEAD + '»']
    ])
  });
  return json({ result: 'success', message: 'Audio enviado.' });
}

// Healthcheck (abrir la URL en el navegador)
function doGet() {
  return json({ result: 'ok', message: 'MusicMind newsletter endpoint activo.' });
}

/* ---------- Plantillas de email (para el suscriptor) ----------
   HTML con tablas y estilos en línea: es lo que mejor se ve en Gmail,
   Outlook y Apple Mail. Los textos entre [corchetes] son PLACEHOLDER. */

function welcomeHtml() {
  return emailLayout({
    preheader: 'Gracias por unirte. Aquí tienes tu audio de regalo.',
    eyebrow: 'Bienvenida',
    title: 'Gracias por <em>estar aquí.</em>',
    paragraphs: [
      'Hola:',
      'Soy Marta Marina. Me alegra mucho que te hayas unido a Music Mind. Cada mes te escribiré con una mirada honesta a lo que ocurre dentro de la industria musical, y con herramientas para cuidarte en ella.',
      'Para empezar, te regalo un audio: <b>' + escapeHtml(WELCOME_AUDIO.title) + '</b>. Son tres minutos pensados para los momentos previos a una reunión importante, a defender un proyecto o a una entrevista delante de mucha gente. Escúchalo justo antes de entrar.',
      'Porque no vas a demostrar nada: vas a compartir lo que sabes. Y la diferencia es enorme.'
    ],
    button: { text: 'Escuchar el audio', url: WELCOME_AUDIO.url },
    closing: 'Un abrazo,<br>Marta',
    footer: 'Recibes este email porque te has suscrito a la newsletter de Music Mind en musicmind.es. Si no quieres recibir más emails, responde a este correo con la palabra «BAJA» y te daré de baja.'
  });
}

function leadHtml(magnet) {
  return emailLayout({
    preheader: 'Cuatro minutos para parar, respirar y volver a ti.',
    eyebrow: 'Tu audio',
    title: escapeHtml(magnet.title),
    paragraphs: [
      'Hola:',
      magnet.intro,
      magnet.outro,
      'Si te resuena y quieres hablar de tu caso, solo tienes que responder a este email.'
    ],
    button: { text: 'Escuchar el audio', url: magnet.url },
    closing: 'Un abrazo,<br>Marta Marina',
    footer: 'Recibes este email porque lo has solicitado en musicmind.es. No te hemos suscrito a ninguna lista: solo te enviamos este audio.'
  });
}

function emailLayout(o) {
  var ink = '#2F4A55', muted = '#4C6672', accent = '#5E7A87', bg = '#F1EAE1', surface = '#FBF7F1';
  var serif = "Georgia,'Times New Roman',serif", sans = "'Helvetica Neue',Helvetica,Arial,sans-serif";
  var paras = o.paragraphs.map(function (t) {
    return '<p style="margin:0 0 16px;font-family:' + sans + ';font-size:16px;line-height:1.6;color:' + muted + '">' + t + '</p>';
  }).join('');
  var title = o.title.replace(/<em>/g, '<em style="font-style:italic;color:' + accent + '">');
  return '' +
    '<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>' +
    '<body style="margin:0;padding:0;background:' + bg + '">' +
    '<div style="display:none;max-height:0;overflow:hidden;opacity:0">' + o.preheader + '</div>' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:' + bg + '"><tr><td align="center" style="padding:32px 16px">' +
      '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px">' +
        '<tr><td align="center" style="padding:0 0 24px">' +
          '<a href="' + SITE_URL + '"><img src="' + SITE_URL + 'assets/logos/LOGO%20MM-04.png" alt="Marta Marina · Music Mind" height="44" style="height:44px;border:0"></a>' +
        '</td></tr>' +
        '<tr><td style="background:' + surface + ';border:1px solid rgba(58,61,64,.13);border-radius:24px;padding:40px 36px">' +
          '<p style="margin:0 0 14px;font-family:' + sans + ';font-size:11px;letter-spacing:3px;text-transform:uppercase;color:' + accent + '">' + o.eyebrow + '</p>' +
          '<h1 style="margin:0 0 24px;font-family:' + serif + ';font-weight:400;font-size:32px;line-height:1.15;color:' + ink + '">' + title + '</h1>' +
          paras +
          '<table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0"><tr><td style="background:' + ink + ';border-radius:100px">' +
            '<a href="' + o.button.url + '" style="display:inline-block;padding:14px 28px;font-family:' + sans + ';font-size:15px;font-weight:500;color:#ffffff;text-decoration:none">' + o.button.text + ' &rarr;</a>' +
          '</td></tr></table>' +
          '<p style="margin:0;font-family:' + sans + ';font-size:16px;line-height:1.6;color:' + ink + '">' + o.closing + '</p>' +
        '</td></tr>' +
        '<tr><td style="padding:24px 12px 0;font-family:' + sans + ';font-size:12px;line-height:1.6;color:' + muted + ';text-align:center">' +
          o.footer + '<br><br>' +
          '<a href="' + SITE_URL + '" style="color:' + muted + '">musicmind.es</a> · ' +
          '<a href="' + SITE_URL + '#privacidad" style="color:' + muted + '">Política de privacidad</a>' +
        '</td></tr>' +
      '</table>' +
    '</td></tr></table></body></html>';
}

function sendToSubscriber(to, subject, html) {
  MailApp.sendEmail({ to: to, subject: subject, htmlBody: html, name: SENDER_NAME, replyTo: REPLY_TO });
}

// Aviso interno (para ti y Marta)
function notifyHtml(heading, rows) {
  return '<div style="font-family:Helvetica,Arial,sans-serif;color:#2F4A55">' +
    '<h2 style="font-weight:400">' + escapeHtml(heading) + '</h2>' +
    rows.map(function (r) {
      return '<p><b>' + escapeHtml(r[0]) + ':</b> <span style="white-space:pre-wrap">' + escapeHtml(r[1]) + '</span></p>';
    }).join('') +
    '</div>';
}

/* ---------- Utilidades ---------- */

// Devuelve la pestaña (la crea si no existe) y escribe la cabecera en la fila 1.
// Compatible con hojas antiguas: las columnas nuevas van al final.
function getSheet(name, cols) {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheetByName(name) || ss.insertSheet(name);
  sheet.getRange(1, 1, 1, cols.length).setValues([cols]);
  return sheet;
}

function emailExists(sheet, col, email) {
  var rows = sheet.getLastRow() - 1;
  if (rows < 1) return false;
  return sheet.getRange(2, col, rows, 1).getValues()
    .some(function (r) { return String(r[0]).toLowerCase() === email.toLowerCase(); });
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

/* ---------- Previsualizar emails ----------
   Ejecuta esta función desde el editor (▶ Ejecutar) para recibir en
   PREVIEW_TO cómo se ven los emails de bienvenida y del audio. */
var PREVIEW_TO = 'maxim@hipeagency.es';
function previewEmails() {
  MailApp.sendEmail({ to: PREVIEW_TO, subject: '[PRUEBA] Bienvenida', htmlBody: welcomeHtml(), name: SENDER_NAME, replyTo: REPLY_TO });
  var key = Object.keys(LEAD_MAGNETS)[0];
  MailApp.sendEmail({ to: PREVIEW_TO, subject: '[PRUEBA] Audio landing', htmlBody: leadHtml(LEAD_MAGNETS[key]), name: SENDER_NAME, replyTo: REPLY_TO });
}
