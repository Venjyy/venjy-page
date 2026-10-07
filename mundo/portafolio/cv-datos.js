// =========================================================
// VENJY · Contenido del CV para los atriles de la Sala del CV
// Salió de CV_BenjaminFloresB_ES / _EN (images/cv). Si cambias el CV, actualiza este archivo.
// No incluye el teléfono: sigue estando en el PDF para quien lo descargue.
// Cada página: { titulo, parrafos?: [texto], items?: [texto], sub?: [{ cab, texto }] }
// =========================================================

export const CV_PDF = {
    es: 'images/cv/CV_BenjaminFloresB_ES.pdf',
    en: 'images/cv/CV_BenjaminFloresB_EN.pdf'
};

export const CV_PAGINAS = {
    es: [
        {
            titulo: 'Benjamín Flores Bravo',
            sub: [{ cab: 'Desarrollador Full Stack', texto: 'React · Node.js · Docker · Cloud (Azure/DigitalOcean)' }, { cab: 'Concepción, Chile', texto: 'benjaf243@gmail.com · github.com/Venjyy · LinkedIn' }],
            parrafos: [
                'Desarrollador Full Stack con experiencia en el diseño, desarrollo y despliegue de sistemas ERP, APIs REST y arquitecturas de microservicios. Especializado en React, Node.js, Express y MySQL, con práctica en Docker, Git y despliegue en la nube (Azure, DigitalOcean).',
                'Historial comprobado en migración de sistemas monolíticos a microservicios, integración de APIs de terceros (pagos, clima, autenticación, asistencia) y buenas prácticas de seguridad (JWT, validación de entradas, prevención de SQL Injection).'
            ]
        },
        {
            titulo: 'Habilidades técnicas',
            sub: [
                { cab: 'Lenguajes', texto: 'JavaScript, Python, TypeScript (básico), SQL, HTML5, CSS3, C#' },
                { cab: 'Frontend', texto: 'React.js, React Hooks, Context API, diseño responsivo, componentes reutilizables' },
                { cab: 'Backend', texto: 'Node.js, Express.js, ASP.NET MVC, Entity Framework, APIs REST, JWT, microservicios' },
                { cab: 'Bases de datos', texto: 'MySQL, SQL Server, modelado relacional, optimización de consultas' },
                { cab: 'DevOps / Cloud', texto: 'Docker, Docker Compose, CI/CD, Git/GitHub, Azure, DigitalOcean, Linux básico' }
            ]
        },
        {
            titulo: 'Más habilidades',
            sub: [
                { cab: 'Integraciones', texto: 'GeoVictoria, Khipu, Meteored, Gmail API, Webhooks, OAuth/JWT' },
                { cab: 'Seguridad', texto: 'Validación de entradas, prevención de SQL Injection, manejo seguro de tokens' },
                { cab: 'Prácticas', texto: 'Scrum/Kanban, control de calidad de datos, documentación técnica' },
                { cab: 'Idiomas', texto: 'Español (nativo), Inglés B2 (intermedio-alto)' }
            ]
        },
        {
            titulo: 'Dafa Facility · iDafa Connect',
            sub: [{ cab: 'Desarrollador Full Stack', texto: 'Coronel, Chile · Jun. 2025 – Ene. 2026' }],
            parrafos: ['Sistema ERP para gestión de recursos humanos, contabilidad y prevención de riesgos.'],
            items: [
                'Lideré la migración de una arquitectura monolítica a microservicios con Docker: despliegue 60 % más rápido.',
                'ERP de RR. HH. y contabilidad para 10 usuarios internos: procesos administrativos 45 % más ágiles.',
                'Rediseño del frontend en React con identidad visual por empresa (white-label): 50 % menos tickets de soporte.',
                '8 módulos nuevos entregados a tiempo; APIs REST en Node.js y MySQL con más de 700 solicitudes al día.',
                'Entornos reproducibles y apoyo a CI/CD: 40 % menos errores de despliegue.',
                'Integración segura de GeoVictoria (asistencia de más de 30 empleados) y 35 % menos inconsistencias de datos.'
            ],
            pie: 'React, Node.js, MySQL, Docker, Git, Postman, Claude Agent'
        },
        {
            titulo: 'El Patio de Lea',
            sub: [{ cab: 'Consultor y Desarrollador Full Stack', texto: 'Concepción, Chile · Feb. 2025 – Dic. 2025' }],
            items: [
                'Sistema web de reservas y gestión de eventos de punta a punta: 80 % más reservas gestionadas digitalmente.',
                'Frontend en React y backend en Node.js + Express, con JWT, para más de 50 usuarios concurrentes.',
                'Consultas MySQL optimizadas: 40 % menos tiempo de respuesta.',
                'Infraestructura en DigitalOcean con 99,5 % de disponibilidad.',
                'Integración de Khipu (pagos), Meteored (clima) y Gmail API: 50 % menos gestión manual.',
                'Buenas prácticas de seguridad, sin incidentes reportados.'
            ]
        },
        {
            titulo: 'Mentor Inclusivo',
            sub: [{ cab: 'Instituto Santo Tomás', texto: 'Concepción, Chile · Mar. 2025 – Jul. 2025' }],
            items: [
                'Acompañamiento académico personalizado a un estudiante en situación de discapacidad o vulnerabilidad, con cierre exitoso del semestre.',
                'Desarrollo de empatía, comunicación efectiva y habilidades interpersonales, útiles para el trabajo en equipo.'
            ]
        },
        {
            titulo: 'Educación y cursos',
            sub: [{ cab: 'Ingeniería en Informática (tercer año)', texto: 'Instituto Santo Tomás, Concepción · 2024 – presente' }],
            items: [
                'Máster en SQL Server: de cero a profesional · Udemy · 16 h · 10/2025',
                'Máster en ASP.NET MVC: Entity Framework (.NET 9) · Udemy · 22 h · 10/2025',
                'Ultimate Python: de cero a programador experto · Udemy · 18 h · 09/2025'
            ]
        }
    ],
    en: [
        {
            titulo: 'Benjamín Flores Bravo',
            sub: [{ cab: 'Full Stack Developer', texto: 'React · Node.js · Docker · Cloud (Azure/DigitalOcean)' }, { cab: 'Concepción, Chile', texto: 'benjaf243@gmail.com · github.com/Venjyy · LinkedIn' }],
            parrafos: [
                'Full Stack Developer with experience designing, building and deploying ERP systems, REST APIs and microservices. Specialized in React, Node.js, Express and MySQL, with hands-on Docker, Git and cloud deployment (Azure, DigitalOcean).',
                'Proven track record migrating monoliths to microservices, integrating third-party APIs (payments, weather, authentication, attendance) and applying security best practices (JWT, input validation, SQL injection prevention).'
            ]
        },
        {
            titulo: 'Technical skills',
            sub: [
                { cab: 'Languages', texto: 'JavaScript, Python, TypeScript (basic), SQL, HTML5, CSS3, C#' },
                { cab: 'Frontend', texto: 'React.js, React Hooks, Context API, responsive design, reusable components' },
                { cab: 'Backend', texto: 'Node.js, Express.js, ASP.NET MVC, Entity Framework, REST APIs, JWT, microservices' },
                { cab: 'Databases', texto: 'MySQL, SQL Server, relational modeling, query optimization' },
                { cab: 'DevOps / Cloud', texto: 'Docker, Docker Compose, CI/CD, Git/GitHub, Azure, DigitalOcean, basic Linux' }
            ]
        },
        {
            titulo: 'More skills',
            sub: [
                { cab: 'Integrations', texto: 'GeoVictoria, Khipu, Meteored, Gmail API, Webhooks, OAuth/JWT' },
                { cab: 'Security', texto: 'Input validation, SQL injection prevention, secure token handling' },
                { cab: 'Practices', texto: 'Scrum/Kanban, data quality control, technical documentation' },
                { cab: 'Languages spoken', texto: 'Spanish (native), English B2 (upper-intermediate)' }
            ]
        },
        {
            titulo: 'Dafa Facility · iDafa Connect',
            sub: [{ cab: 'Full Stack Developer', texto: 'Coronel, Chile · Jun. 2025 – Jan. 2026' }],
            parrafos: ['ERP system for human resources, accounting and risk-prevention management.'],
            items: [
                'Led the migration from a monolith to Docker microservices: deployments 60% faster.',
                'HR and accounting ERP for 10 internal users: administrative processes 45% more efficient.',
                'Redesigned the React frontend with white-label visual identity per company: 50% fewer support tickets.',
                '8 new modules delivered on schedule; Node.js and MySQL REST APIs handling 700+ requests a day.',
                'Reproducible environments and CI/CD support: 40% fewer deployment errors.',
                'Secure GeoVictoria integration (attendance of 30+ employees) and 35% fewer data inconsistencies.'
            ],
            pie: 'React, Node.js, MySQL, Docker, Git, Postman, Claude Agent'
        },
        {
            titulo: 'El Patio de Lea',
            sub: [{ cab: 'Full Stack Developer & Consultant', texto: 'Concepción, Chile · Feb. 2025 – Dec. 2025' }],
            items: [
                'End-to-end web reservation and event management system: 80% more bookings managed digitally.',
                'React frontend and Node.js + Express backend with JWT for 50+ concurrent users.',
                'Optimized MySQL queries: 40% faster responses.',
                'DigitalOcean infrastructure with 99.5% uptime.',
                'Khipu (payments), Meteored (weather) and Gmail API integrations: 50% less manual work.',
                'Security best practices, zero reported incidents.'
            ]
        },
        {
            titulo: 'Inclusive Learning Mentor',
            sub: [{ cab: 'Instituto Santo Tomás', texto: 'Concepción, Chile · Mar. 2025 – Jul. 2025' }],
            items: [
                'Personalized academic support for a student with disabilities or in vulnerable circumstances, ending the semester successfully.',
                'Built empathy, effective communication and interpersonal skills, transferable to teamwork.'
            ]
        },
        {
            titulo: 'Education and courses',
            sub: [{ cab: 'B.S. in Computer Engineering (3rd year)', texto: 'Instituto Santo Tomás, Concepción · 2024 – present' }],
            items: [
                'SQL Server Master Course: from zero to professional · Udemy · 16 h · 10/2025',
                'ASP.NET MVC Master Course: Entity Framework (.NET 9) · Udemy · 22 h · 10/2025',
                'Ultimate Python: from zero to expert programmer · Udemy · 18 h · 09/2025'
            ]
        }
    ]
};
