# Newsletter · Google Apps Script

La newsletter de la web manda los emails a tu Gmail (y opcionalmente a una Google Sheet)
usando un **Google Apps Script** desplegado como *Web App*. No necesitas servidor.

## Pasos (5 minutos)

1. Entra en **https://script.google.com** con la cuenta de Gmail que recibirá los avisos.
2. **Nuevo proyecto** → borra el contenido y pega todo el archivo [`Code.gs`](./Code.gs).
3. Arriba del archivo, edita:
   - `NOTIFY_EMAIL` → el Gmail donde quieres recibir cada alta. **(obligatorio)**
   - `SHEET_ID` → (opcional) ID de una Google Sheet para guardar la lista.
     Crea una hoja vacía, copia el ID de su URL
     (`docs.google.com/spreadsheets/d/`**`ESTE_ID`**`/edit`) y pégalo.
4. **Implementar → Nueva implementación → Tipo: Aplicación web.**
   - *Ejecutar como*: **Yo**
   - *Quién tiene acceso*: **Cualquier persona**
   - Pulsa **Implementar** y **autoriza** los permisos (Gmail / Sheets).
5. Copia la **URL `/exec`** que te da Google.
6. Pégala en [`js/main.js`](../js/main.js), en la constante:

   ```js
   const NEWSLETTER_ENDPOINT = 'https://script.google.com/macros/s/XXXX/exec';
   ```

¡Listo! Cada alta llegará a tu Gmail y se guardará en la hoja (si la configuraste).

## Probar

- Para ver los dos correos completos, configura `PREVIEW_TO` en `Code.gs` y ejecuta
  `previewEmails` desde el editor de Apps Script.
- Ambos correos muestran una tarjeta por audio con play, onda decorativa y enlaces
  para descargar. El play abre la página con el reproductor; la descarga
  abre `audios/?audio=...#descargar`, donde el botón permite guardar el archivo.
  Publica la carpeta `audios/` junto con la web antes de activar estas plantillas
  en una nueva versión de Apps Script.

- Abre la URL `/exec` en el navegador: debe responder
  `{"result":"ok","message":"MusicMind newsletter endpoint activo."}`.
- Rellena el formulario de la web → te llega un email **«✦ Nueva suscripción · MusicMind»**.

## Notas

- Mientras `NEWSLETTER_ENDPOINT` esté vacío, la web funciona en **modo demo**
  (muestra confirmación pero no envía nada).
- Si cambias el `Code.gs`, vuelve a **Implementar → Gestionar implementaciones → Editar → Nueva versión**
  para que los cambios surtan efecto (la URL se mantiene).
- Cuota gratuita de Gmail vía Apps Script: ~100 emails/día. De sobra para avisos de altas.
