# Marta Marina · MusicMind — Web

One-pager moderno, animado y elegante. Bienestar emocional para artistas con alta
exposición mediática. La info se amplía en **drawers/modales**, sin scrolls infinitos.

## Ver la web en local

```bash
cd martamarina
python3 -m http.server 8765
# abre http://localhost:8765
```
> Conviene usar un servidor (no abrir el `index.html` con doble clic) para que carguen
> bien las tipografías y los módulos.

## Estructura

```
index.html            → toda la página (contenido + plantillas de los modales)
css/style.css         → estilos, paleta Soft Blue, animaciones
js/main.js            → animaciones, scroll-reveal, modales/drawers, newsletter
assets/fonts/         → Canela (titulares)  ·  Helvetica Neue/Inter (texto)
assets/logos/         → logotipos (SVG + PNG)
apps-script/          → newsletter por Gmail (ver su README)
```

## Qué editar (sin saber programar)

| Quiero cambiar… | Dónde |
|---|---|
| Textos de secciones | `index.html` (busca la sección por su título) |
| Textos de los pop-ups | `index.html`, bloque `<!-- DRAWER CONTENT -->` (las `<template>`) |
| Pilares / programas | tarjetas en `index.html` + su `<template id="tpl-...">` |
| **Foto de Marta** | sustituye la imagen en la sección `#marta` (`marta__portrait`) |
| Email de contacto | busca `marta.marina@musicmind.es` en `index.html` |
| Redes (IG / TikTok) | enlaces en el `<footer>` (`footer__social`) |
| Colores | variables `:root` al inicio de `css/style.css` |

## Newsletter → Gmail

Sigue [`apps-script/README.md`](./apps-script/README.md): despliegas el script,
copias la URL y la pegas en `js/main.js` (`NEWSLETTER_ENDPOINT`).
Hasta entonces, el formulario funciona en **modo demo**.

## Tipografías

Las Canela incluidas son **versiones Trial**. Para publicar la web comercialmente,
adquiere la licencia en commercialtype.com. Helvetica Neue usa la del sistema (Apple)
con *Inter* como respaldo en otros dispositivos.

## Publicar (gratis)

Sube la carpeta a **Netlify** (arrastrar y soltar), **Vercel** o **GitHub Pages**.
Es una web estática: no necesita backend.
