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
