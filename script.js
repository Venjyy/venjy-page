// ===================================
// SISTEMA DE CAMBIO DE IDIOMA
// ===================================
let currentLanguage = 'en';

function changeLanguage(lang) {
    currentLanguage = lang;
    localStorage.setItem('preferredLanguage', lang);
    
    // Actualizar todos los elementos con atributos data-en y data-es
    document.querySelectorAll('[data-en]').forEach(element => {
        if (lang === 'en' && element.getAttribute('data-en')) {
            element.textContent = element.getAttribute('data-en');
        } else if (lang === 'es' && element.getAttribute('data-es')) {
            element.textContent = element.getAttribute('data-es');
        }
    });
    
    // Actualizar botones de idioma
    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-lang') === lang) {
            btn.classList.add('active');
        }
    });
}

// Inicializar idioma al cargar la página
document.addEventListener('DOMContentLoaded', function() {
    const savedLang = localStorage.getItem('preferredLanguage') || 'en';
    changeLanguage(savedLang);
    
    // Event listeners para botones de idioma
    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const lang = this.getAttribute('data-lang');
            changeLanguage(lang);
            playClickSound();
        });
    });
});

const header = document.querySelector('.dynamic-header'); // Selecciona el header con la clase
const images = ['images/MilayGala2.jpg', 'images/Galeriamila10.jfif', 'images/Cutes.gif']; // Lista de imágenes
let currentIndex = 0;

function changeBackground() {
    if (header) {
        header.style.backgroundImage = `url(${images[currentIndex]})`;
        currentIndex = (currentIndex + 1) % images.length; // Cambia al siguiente índice
    }
}

// Cambia la imagen cada 5 segundos
setInterval(changeBackground, 5000);

// Modal para imágenes
const modal = document.getElementById("imageModal");
const modalImg = document.getElementById("modalImage");
const span = document.getElementsByClassName("close")[0];

// Cuando se hace click en cualquier imagen de la galería
document.querySelectorAll('.gallery img').forEach(img => {
    img.onclick = function () {
        modal.style.display = "block";
        modalImg.src = this.src;
        modalImg.alt = this.alt;
    }
});

// Cerrar modal
span.onclick = function () {
    modal.style.display = "none";
}

// Cerrar al hacer click fuera
modal.onclick = function (event) {
    if (event.target === modal) {
        modal.style.display = "none";
    }
}

// Cerrar con tecla ESC
document.addEventListener('keydown', function (event) {
    if (event.key === "Escape" && modal.style.display === "block") {
        modal.style.display = "none";
    }
});

// Scroll suave para navegación interna
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();

        const targetId = this.getAttribute('href');
        const targetElement = document.querySelector(targetId);

        if (targetElement) {
            window.scrollTo({
                top: targetElement.offsetTop - 60, // Ajuste para la barra de navegación
                behavior: 'smooth'
            });

            // Cerrar menú móvil si está abierto (añadirlo más adelante)
        }
    });
});

// Cambiar estilo de la barra de navegación al hacer scroll
window.addEventListener('scroll', function () {
    const navbar = document.getElementById('navbar');
    if (window.scrollY > 100) {
        navbar.style.backgroundColor = 'rgba(30, 30, 30, 0.95)';
        navbar.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.8)';
    } else {
        navbar.style.backgroundColor = 'rgba(45, 45, 45, 0.9)';
        navbar.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.5)';
    }
});

// Validación básica del formulario de contacto
const contactForm = document.querySelector('.contact-form form');
if (contactForm) {
    contactForm.addEventListener('submit', function (e) {
        e.preventDefault();

        const name = this.querySelector('input[type="text"]').value;
        const email = this.querySelector('input[type="email"]').value;
        const message = this.querySelector('textarea').value;

        if (name && email && message) {
            alert('This button doesnt work due to GitHub page limitations. If youd like to contact me, please contact me on LinkedIn.');
            this.reset();
        } else {
            alert('Please fill in all fields.');
        }
    });
}
// Animación de máquina de escribir
const typewriterElement = document.getElementById('typewriter');
const texts = ['Full Stack Dev', 'Indie Creator', 'Student'];
let currentTextIndex = 0;
let currentCharIndex = 0;
let isDeleting = false;

function typeWriter() {
    const currentText = texts[currentTextIndex];

    if (isDeleting) {
        // Borrar caracteres
        typewriterElement.textContent = currentText.substring(0, currentCharIndex - 1);
        currentCharIndex--;

        if (currentCharIndex === 0) {
            isDeleting = false;
            currentTextIndex = (currentTextIndex + 1) % texts.length;
            setTimeout(typeWriter, 500); // Pausa antes de escribir el siguiente texto
        } else {
            setTimeout(typeWriter, 50); // Velocidad de borrado más rápida
        }
    } else {
        // Escribir caracteres
        typewriterElement.textContent = currentText.substring(0, currentCharIndex + 1);
        currentCharIndex++;

        if (currentCharIndex === currentText.length) {
            isDeleting = true;
            setTimeout(typeWriter, 2000); // Pausa antes de empezar a borrar
        } else {
            setTimeout(typeWriter, 100); // Velocidad de escritura
        }
    }
}

// Iniciar la animación después de un pequeño delay
setTimeout(typeWriter, 1000);

// ===================================
// EFECTOS DE SONIDO MINECRAFT (OPCIONAL)
// ===================================
// Crear sonidos simples usando Web Audio API para efectos Minecraft
let audioContext;
let soundEnabled = true; // Cambiar a false para deshabilitar sonidos

function initAudio() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
}

function playClickSound() {
    if (!soundEnabled || !audioContext) return;

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 800;
    oscillator.type = 'square';

    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.1);
}

function playHoverSound() {
    if (!soundEnabled || !audioContext) return;

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 600;
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0.05, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.05);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.05);
}

// Agregar efectos de sonido a elementos interactivos
document.addEventListener('DOMContentLoaded', function () {
    // Inicializar audio context al primer clic del usuario
    document.body.addEventListener('click', function initOnce() {
        initAudio();
        document.body.removeEventListener('click', initOnce);
    }, { once: true });

    // Sonidos en skill blocks
    const skillBlocks = document.querySelectorAll('.skill-block');
    skillBlocks.forEach(block => {
        block.addEventListener('mouseenter', playHoverSound);
    });

    // Sonidos en experience entries
    const experienceEntries = document.querySelectorAll('.experience-entry');
    experienceEntries.forEach(entry => {
        entry.addEventListener('mouseenter', playHoverSound);
    });

    // Sonidos en tech tags
    const techTags = document.querySelectorAll('.tech-tag');
    techTags.forEach(tag => {
        tag.addEventListener('mouseenter', playHoverSound);
    });

    // Sonidos en botones de navegación
    const navLinks = document.querySelectorAll('#navbar a');
    navLinks.forEach(link => {
        link.addEventListener('click', playClickSound);
    });

    // Sonidos en skill categories
    const skillCategories = document.querySelectorAll('.skill-category');
    skillCategories.forEach(category => {
        category.addEventListener('mouseenter', playHoverSound);
    });

    // Efecto de "partículas" al hacer clic en skill blocks
    skillBlocks.forEach(block => {
        block.addEventListener('click', function (e) {
            createParticles(e.clientX, e.clientY);
        });
    });
});

// Función para crear efecto de partículas tipo Minecraft
function createParticles(x, y) {
    const particleCount = 8;

    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.left = x + 'px';
        particle.style.top = y + 'px';

        const angle = (Math.PI * 2 * i) / particleCount;
        const velocity = 2 + Math.random() * 2;
        const vx = Math.cos(angle) * velocity;
        const vy = Math.sin(angle) * velocity;

        particle.style.setProperty('--vx', vx);
        particle.style.setProperty('--vy', vy);

        document.body.appendChild(particle);

        setTimeout(() => {
            particle.remove();
        }, 1000);
    }
}

// Contador de Easter Egg - Clic múltiple en el nombre
let clickCount = 0;
let clickTimer;
const aboutName = document.querySelector('.about-name');

if (aboutName) {
    aboutName.addEventListener('click', function () {
        clickCount++;
        clearTimeout(clickTimer);

        if (clickCount >= 5) {
            this.style.animation = 'none';
            setTimeout(() => {
                this.style.animation = 'nameGlow 0.5s ease-in-out infinite';
            }, 10);
            clickCount = 0;

            // Mensaje secreto
            const secretMsg = document.createElement('div');
            secretMsg.textContent = '🎮 Achievement Unlocked: Found the Secret! 🎮';
            secretMsg.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: rgba(76, 175, 80, 0.95);
                color: #000;
                padding: 2rem;
                border: 5px solid #FFD700;
                font-family: 'Press Start 2P', cursive;
                font-size: 0.8rem;
                z-index: 10000;
                text-align: center;
                box-shadow: 0 0 30px rgba(76, 175, 80, 0.8);
            `;
            document.body.appendChild(secretMsg);

            setTimeout(() => {
                secretMsg.remove();
            }, 3000);
        }

        clickTimer = setTimeout(() => {
            clickCount = 0;
        }, 1000);
    });
}
