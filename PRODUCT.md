# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Dos audiencias con el mismo peso:

- **Reclutadores y equipos técnicos** que evalúan a Benjamin para un empleo o práctica como desarrollador. Su trabajo: entender rápido qué ha construido, con qué tecnologías y en qué contexto, y descargar el CV.
- **Clientes freelance** (pymes, negocios locales, personas) que necesitan un sistema o sitio web. Su trabajo: ver evidencia de proyectos reales en producción y escribirle.

Ambos llegan desde un enlace (CV, LinkedIn, GitHub, mensaje directo) y deciden en pocos segundos si siguen leyendo.

## Product Purpose

Carta de presentación digital de Benjamin "Venjy" Flores, estudiante de Ingeniería en Informática (tercer año, Chile). Muestra perfil, experiencia, habilidades, proyectos, sus gatas y los medios de contacto. Éxito: que el visitante descargue el CV o lo contacte, convencido de que construye software real que se usa.

## Positioning

No es un portafolio de ejercicios: muestra aplicaciones en producción con usuarios y clientes reales (ProcedimientoSeguro, El Patio de LEA), hechas de punta a punta por la misma persona, junto con una personalidad propia (videojuegos, pixel art, gatas) que se nota en todo el sitio.

## Operating Context

- Sitio estático (`index.html`, `style.css`, `script.js`) sin build ni backend; se abre directo o con Live Server.
- Bilingüe con atributos `data-es` / `data-en`. **Español por defecto** (decisión 06/10/2026), con selector para inglés; todas las secciones deben estar traducidas (hoy Gatos, Contacto y Footer están solo en inglés).
- CV descargable en PDF, CSV y Word, en español e inglés (`images/cv/`), según el idioma activo.
- Contexto chileno: nombres, textos y endpoints en español.

## Capabilities and Constraints

- Secciones que deben mantenerse: Inicio, Sobre mí, Experiencia, Habilidades, Proyectos, Mis Gatos (con galería y visor de imágenes), Contacto, Footer.
- **Contacto:** el formulario abre el cliente de correo con `mailto:` (sin servicios externos). Queda pendiente, y debe anotarse en el README, implementar un envío real con un servicio gratuito.
- Contacto real: benjaf243@gmail.com, github.com/Venjyy, linkedin.com/in/benjamin-flores-aa59112b5.
- Varios GIFs son pesados (Plantotchi 12 MB, Cutes 9,7 MB, InstantGIF 7,1 MB, pagcentroevn 4,9 MB); el sitio no debe cargarlos todos de entrada.
- `centroeventostest/` es una demo aparte de sistema de reservas; no forma parte de la página principal.

### ProcedimientoSeguro (proyecto destacado y entrada de experiencia)

- Aplicación web **en producción** para que funcionarios de las Fuerzas de Orden y Seguridad Pública de Chile confeccionen actas y declaraciones desde el celular y las descarguen en PDF y Word.
- Landing pública en https://procedimientoseguro.cl (desde 01/10/2026) y app funcional en https://app.procedimientoseguro.cl (desde 02/10/2026, piloto gratuito).
- Rol de Benjamin: **cofundador (con socio) y responsable del desarrollo completo de la aplicación**.
- Se presenta como una aplicación funcional y útil en uso, no como un proyecto en espera. Va en Proyectos (destacado) y en Experiencia (Cofundador y desarrollador, 2026 – presente; mes de inicio por confirmar).
- Capacidades reales: declaraciones y denuncias (varios documentos por denuncia), registro de controles, actas de tránsito con croquis, medida cautelar, fijación fotográfica (hasta 15 fotos), procedimientos con detenidos (3 a 7 actas de una vez), firma guardada en el perfil, revisión y edición del documento antes de finalizar, funciona sin señal e instalable, las actas no salen del teléfono, compartir por WhatsApp.
- Stack: Next.js, TypeScript, Prisma, PostgreSQL, TailwindCSS, Zod; VM Linux en Azure con Cloudflare Tunnel, systemd y respaldos cifrados.
- Repositorio **privado**: no se enlaza GitHub.
- No nombrar a Carabineros fuera de un aviso de "no oficial"; usar "Fuerzas de Orden y Seguridad Pública".
- Video promocional disponible en `../actas-policiales-video/out/` (Promo.mp4, PromoVertical.mp4, promo-horizontal.mp4, promo-vertical.mp4).

## Brand Commitments

- Identidad: Benjamin "Venjy" Flores.
- **Estética Minecraft obligatoria** (AGENTS.md, confirmada por el usuario 06/10/2026): tipografía pixelada (`font/pixelcraft.ttf`), sensación de bloques y bordes pixelados, imágenes y GIFs propios de `images/`. Se evita cualquier look moderno o minimalista que rompa la temática.
- Voz cercana y con humor (gatas, "Carey + fat = Mila"), pero sin restar seriedad al trabajo profesional.

## Evidence on Hand

- Experiencia: Full Stack en IDafa-connect (06/2025 – 01/2026), Consultor y Full Stack en El Patio de Lea (02/2025 – 12/2025), Mentor Inclusivo en Instituto Santo Tomás (03/2025 – 07/2025).
- Proyectos: ProcedimientoSeguro (en producción), El Patio de LEA (freelance pagado, repo público), Cat Clicker, InstantGIF, Plantotchi (con informe IoT de 80+ páginas).
- Foto de perfil `images/Venjy.png`, GIFs de proyectos y fotos de Mila y Gala en `images/`.
- No hay testimonios, métricas de uso de ProcedimientoSeguro ni logos de clientes: no se inventan.

## Product Principles

- Lo real primero: lo que está en producción y lo pagado por clientes encabeza, con enlaces que funcionan.
- Dos audiencias, un camino corto: CV y contacto a la mano en todo momento.
- La personalidad es parte del valor: el mundo Minecraft y las gatas se quedan, pero nunca tapan la evidencia profesional.
- Bilingüe completo: ninguna sección queda a medio traducir.
- Rápido aunque sea pixelado: los medios pesados se cargan cuando hacen falta.
