// Configuración y variables globales
const CONFIG = {
    textosRotativos: [
        "Elige desde 1 hasta 7 días y asegura tu lugar",
        "Celebra en un ambiente natural y acogedor",
        "Espacios únicos para eventos inolvidables",
        "Rodeado de naturaleza y tranquilidad"
    ],
    intervaloTexto: 4000,
    tiempoTransicion: 500
};

let indiceTextoActual = 0;
let intervalID = null;

// Inicialización cuando el DOM está listo
document.addEventListener('DOMContentLoaded', function () {
    inicializarAplicacion();
});

// Función principal de inicialización
function inicializarAplicacion() {
    inicializarTextoRotativo();
    configurarFormulario();
    configurarNavegacionSuave();
    configurarGaleria();
    configurarAnimacionesScroll();
    configurarValidacionRUT();
    configurarFechaMinima();
}

// === TEXTO ROTATIVO EN HERO ===
function inicializarTextoRotativo() {
    const elemento = document.getElementById('textoRotativo');
    if (!elemento) return;

    // Configurar el primer texto
    elemento.style.transition = `opacity ${CONFIG.tiempoTransicion}ms ease-in-out`;

    // Iniciar rotación
    intervalID = setInterval(cambiarTexto, CONFIG.intervaloTexto);
}

function cambiarTexto() {
    const elemento = document.getElementById('textoRotativo');
    if (!elemento) return;

    // Fade out
    elemento.style.opacity = '0';

    setTimeout(() => {
        // Cambiar texto
        indiceTextoActual = (indiceTextoActual + 1) % CONFIG.textosRotativos.length;
        elemento.textContent = CONFIG.textosRotativos[indiceTextoActual];

        // Fade in
        elemento.style.opacity = '1';
    }, CONFIG.tiempoTransicion);
}

// === CONFIGURACIÓN DEL FORMULARIO ===
function configurarFormulario() {
    const form = document.getElementById('formReserva');
    if (!form) return;

    form.addEventListener('submit', manejarEnvioFormulario);

    // Configurar validación en tiempo real
    const campos = form.querySelectorAll('input, select, textarea');
    campos.forEach(campo => {
        campo.addEventListener('blur', validarCampo);
        campo.addEventListener('input', limpiarErrores);
    });
}

function manejarEnvioFormulario(e) {
    e.preventDefault();

    if (validarFormularioCompleto()) {
        mostrarMensajeExito();
        resetearFormulario();
    }
}

function validarFormularioCompleto() {
    const form = document.getElementById('formReserva');
    const campos = form.querySelectorAll('input[required], select[required], textarea[required]');
    let esValido = true;

    campos.forEach(campo => {
        if (!validarCampo({ target: campo })) {
            esValido = false;
        }
    });

    return esValido;
}

function validarCampo(e) {
    const campo = e.target;
    const valor = campo.value.trim();
    let esValido = true;
    let mensaje = '';

    // Limpiar errores previos
    limpiarErrorCampo(campo);

    // Validaciones específicas
    switch (campo.type) {
        case 'email':
            if (valor && !validarEmail(valor)) {
                mensaje = 'Ingrese un correo electrónico válido';
                esValido = false;
            }
            break;
        case 'tel':
            if (valor && !validarTelefono(valor)) {
                mensaje = 'Ingrese un número de teléfono válido';
                esValido = false;
            }
            break;
        case 'date':
            if (valor && !validarFecha(valor)) {
                mensaje = 'Seleccione una fecha válida (no puede ser anterior a hoy)';
                esValido = false;
            }
            break;
        case 'number':
            const num = parseInt(valor);
            if (valor && (isNaN(num) || num < 1 || num > 100)) {
                mensaje = 'Ingrese un número entre 1 y 100';
                esValido = false;
            }
            break;
    }

    // Validación de RUT
    if (campo.id === 'rut' && valor && !validarRUT(valor)) {
        mensaje = 'Ingrese un RUT válido (formato: 12.345.678-9)';
        esValido = false;
    }

    // Validación de campos requeridos
    if (campo.hasAttribute('required') && !valor) {
        mensaje = 'Este campo es obligatorio';
        esValido = false;
    }

    if (!esValido) {
        mostrarErrorCampo(campo, mensaje);
    }

    return esValido;
}

function mostrarErrorCampo(campo, mensaje) {
    campo.style.borderColor = '#e74c3c';
    campo.style.boxShadow = '0 0 0 3px rgba(231, 76, 60, 0.1)';

    // Crear elemento de error si no existe
    let errorElement = campo.parentNode.querySelector('.error-message');
    if (!errorElement) {
        errorElement = document.createElement('div');
        errorElement.className = 'error-message';
        errorElement.style.cssText = `
            color: #e74c3c;
            font-size: 0.875rem;
            margin-top: 5px;
            font-weight: 500;
        `;
        campo.parentNode.appendChild(errorElement);
    }

    errorElement.textContent = mensaje;
}

function limpiarErrorCampo(campo) {
    campo.style.borderColor = '';
    campo.style.boxShadow = '';

    const errorElement = campo.parentNode.querySelector('.error-message');
    if (errorElement) {
        errorElement.remove();
    }
}

function limpiarErrores(e) {
    limpiarErrorCampo(e.target);
}

// === VALIDACIONES ESPECÍFICAS ===
function validarEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validarTelefono(telefono) {
    return /^(\+56|56)?[\s\-]?[9][\s\-]?[0-9]{4}[\s\-]?[0-9]{4}$/.test(telefono.replace(/\s/g, ''));
}

function validarFecha(fecha) {
    const fechaSeleccionada = new Date(fecha);
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    return fechaSeleccionada >= hoy;
}

function configurarValidacionRUT() {
    const rutInput = document.getElementById('rut');
    if (!rutInput) return;

    rutInput.addEventListener('input', function (e) {
        // Formatear automáticamente el RUT mientras se escribe
        let valor = e.target.value.replace(/[^0-9kK]/g, '');
        if (valor.length > 1) {
            valor = valor.slice(0, -1).replace(/\B(?=(\d{3})+(?!\d))/g, '.') + '-' + valor.slice(-1);
        }
        e.target.value = valor;
    });
}

function validarRUT(rut) {
    // Limpiar formato
    const rutLimpio = rut.replace(/[.-]/g, '');
    if (rutLimpio.length < 8 || rutLimpio.length > 9) return false;

    const cuerpo = rutLimpio.slice(0, -1);
    const dv = rutLimpio.slice(-1).toLowerCase();

    // Calcular dígito verificador
    let suma = 0;
    let multiplicador = 2;

    for (let i = cuerpo.length - 1; i >= 0; i--) {
        suma += parseInt(cuerpo[i]) * multiplicador;
        multiplicador = multiplicador === 7 ? 2 : multiplicador + 1;
    }

    const resto = suma % 11;
    const dvCalculado = resto === 0 ? '0' : resto === 1 ? 'k' : (11 - resto).toString();

    return dv === dvCalculado;
}

function configurarFechaMinima() {
    const fechaInput = document.getElementById('fecha');
    if (!fechaInput) return;

    // Establecer fecha mínima como hoy
    const hoy = new Date();
    const fechaMinima = hoy.toISOString().split('T')[0];
    fechaInput.setAttribute('min', fechaMinima);
}

function mostrarMensajeExito() {
    // Crear modal de éxito
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(26, 71, 42, 0.9);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
        opacity: 0;
        transition: opacity 0.3s ease;
    `;

    const contenido = document.createElement('div');
    contenido.style.cssText = `
        background: white;
        padding: 40px;
        border-radius: 20px;
        text-align: center;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        max-width: 400px;
        margin: 20px;
        transform: translateY(20px);
        transition: transform 0.3s ease;
    `;

    contenido.innerHTML = `
        <div style="color: #27ae60; font-size: 3rem; margin-bottom: 20px;">✓</div>
        <h3 style="color: #1a472a; margin-bottom: 15px; font-size: 1.5rem;">¡Reserva Enviada!</h3>
        <p style="color: #5a6c7d; margin-bottom: 25px;">Tu solicitud de reserva ha sido enviada exitosamente. Nos contactaremos contigo pronto.</p>
        <button onclick="this.closest('.modal').remove()" style="
            background: linear-gradient(135deg, #c8860d 0%, #d4940f 100%);
            color: white;
            border: none;
            padding: 12px 30px;
            border-radius: 25px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
        ">Cerrar</button>
    `;

    modal.className = 'modal';
    modal.appendChild(contenido);
    document.body.appendChild(modal);

    // Animación de entrada
    requestAnimationFrame(() => {
        modal.style.opacity = '1';
        contenido.style.transform = 'translateY(0)';
    });

    // Auto-cerrar después de 5 segundos
    setTimeout(() => {
        if (modal.parentNode) {
            modal.style.opacity = '0';
            setTimeout(() => modal.remove(), 300);
        }
    }, 5000);
}
function resetearFormulario() {
    const form = document.getElementById('formReserva');
    if (form) {
        form.reset();
        // Limpiar errores visuales
        const errores = form.querySelectorAll('.error-message');
        errores.forEach(error => error.remove());

        const campos = form.querySelectorAll('input, select, textarea');
        campos.forEach(campo => {
            campo.style.borderColor = '';
            campo.style.boxShadow = '';
        });
    }
}

// === NAVEGACIÓN SUAVE ===
function configurarNavegacionSuave() {
    const enlaces = document.querySelectorAll('a[href^="#"]');
    enlaces.forEach(enlace => {
        enlace.addEventListener('click', function (e) {
            const destino = document.querySelector(this.getAttribute('href'));
            if (destino) {
                e.preventDefault();
                destino.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });
}

// === GALERÍA SIMPLE (puedes expandir según tus necesidades) ===
function configurarGaleria() {
    // Aquí podrías agregar lógica para una galería interactiva si lo deseas
}

// === ANIMACIONES AL HACER SCROLL (opcional, ejemplo simple) ===
function configurarAnimacionesScroll() {
    const secciones = document.querySelectorAll('section, .servicio-card');
    const mostrarSeccion = (entrada) => {
        entrada.forEach(e => {
            if (e.isIntersecting) {
                e.target.classList.add('visible');
            }
        });
    };
    const observer = new IntersectionObserver(mostrarSeccion, { threshold: 0.1 });
    secciones.forEach(sec => observer.observe(sec));
}