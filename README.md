# Venjy Portfolio

Portafolio personal de Benjamin "Venjy" Flores, desarrollado como una web estática con temática inspirada en Minecraft y estética retro/pixel art. El sitio presenta información personal, experiencia profesional, habilidades, proyectos, galería de gatos y botones para descargar el CV en inglés y español.

## Descripción

Este proyecto está pensado como una carta de presentación digital para mostrar:

- perfil profesional y académico
- experiencia laboral y proyectos
- habilidades técnicas
- proyectos indie y personales
- contacto y enlaces de descarga de CV
- cambio de idioma entre inglés y español

La página principal se encuentra en `index.html`, con estilos y lógica en `style.css` y `script.js`.

## Tecnologías utilizadas

- HTML5
- CSS3
- JavaScript
- Diseño responsivo
- Tipografía pixelada
- Imágenes locales y galería interactiva

## Estructura del proyecto

```text
venjy-page/
├── index.html
├── style.css
├── script.js
├── AGENTS.md
├── font/
├── images/
├── centroeventostest/
│   ├── index.html
│   ├── style.css
│   ├── script.js
│   └── admincentro/
└── README.md
```

### Descripción de carpetas

- `index.html`: portada principal del portafolio.
- `style.css`: estilos visuales del sitio y tema Minecraft.
- `script.js`: cambio de idioma, scroll suave, typewriter, modal, audio y efectos interactivos.
- `images/`: fotos, avatares, galerías y CVs.
- `centroeventostest/`: demo o proyecto complementario de reservas y administración de eventos.

## Características principales

- Barra de ítems fija con navegación interna
- Tipo de letra pixelada estilo retro
- Header con fondo animado y efecto typewriter
- Selector de idioma (`EN` / `ES`)
- Descarga de CV en PDF, CSV y DOCX
- Sección de experiencia con enfoque profesional
- Galería de imágenes con modal
- Responsive para distintas pantallas
- Efectos visuales y sonoros inspirados en el estilo de Minecraft

## Rediseño 2026: «El mapa de Venjy»

En octubre de 2026 la página se rediseñó completa manteniendo la estética Minecraft y todos los apartados:

- La portada es un muro de mapas de Minecraft generado en canvas (`script.js`) con la paleta real de los mapas; cada apartado es un lugar marcado con un estandarte.
- Navegación con barra de ítems (teclas 1–9), minimapa con niebla de exploración y CV en un cofre (PDF, Word y CSV).
- Español por defecto, con inglés completo en todas las secciones.
- ProcedimientoSeguro aparece como experiencia y proyecto destacado, con su video promocional en `images/procseg/`.
- La versión anterior quedó respaldada en `respaldo-2026-10-06/`.

## Pendiente: envío real del formulario de contacto

Hoy el formulario arma el mensaje y abre la aplicación de correo del visitante (`mailto:`), porque el sitio es estático y no tiene backend. Se quiere implementar un envío real con un servicio gratuito (por ejemplo Formspree, Web3Forms o un Worker de Cloudflare), sin exponer claves en el código.

## Cómo ejecutar el proyecto

Como es un sitio web estático, no requiere instalación ni servidor complejo.

### Opción 1: abrir directamente

- Abre `index.html` en tu navegador.

### Opción 2: usar Live Server (recomendado)

1. Abre la carpeta en VS Code.
2. Instala la extensión "Live Server".
3. Haz clic derecho en `index.html`.
4. Selecciona "Open with Live Server".

## Personalización

Puedes modificar fácilmente:

- textos y contenidos en `index.html`
- colores, layout y tipografía en `style.css`
- comportamiento de idioma, animaciones y modal en `script.js`
- imágenes y CVs en la carpeta `images/`

## Importante

El proyecto está orientado al contexto chileno y en español, manteniendo una identidad visual marcada por el estilo Minecraft, con énfasis en la personalidad del autor y su perfil profesional.

## Autor

Benjamin "Venjy" Flores

## Nota

El portafolio sirve como presentación personal y de proyectos, mientras que `centroeventostest` representa un ejemplo de sistema de reservas y administración para eventos.
