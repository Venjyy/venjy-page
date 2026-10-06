document.addEventListener('DOMContentLoaded', function () {
    // Variables
    const sidebar = document.getElementById('sidebar');
    const toggleSidebar = document.getElementById('toggleSidebar');
    const mainContent = document.querySelector('.main-content');

    // Función para alternar la sidebar en móviles
    function toggleSidebarMobile() {
        sidebar.classList.toggle('active');
    }

    // Event listeners
    toggleSidebar.addEventListener('click', toggleSidebarMobile);

    // Cerrar sidebar al hacer clic fuera en móviles
    document.addEventListener('click', function (e) {
        if (window.innerWidth <= 992) {
            if (!sidebar.contains(e.target) && !toggleSidebar.contains(e.target)) {
                sidebar.classList.remove('active');
            }
        }
    });

    // Simular datos para las tarjetas (en un sistema real esto vendría de una API)
    function updateCardData() {
        // Aquí iría la llamada a la API para obtener datos reales
        console.log("Actualizando datos de las tarjetas...");
    }

    // Simular carga de datos de reservas (en un sistema real esto vendría de una API)
    function loadReservations() {
        // Aquí iría la llamada a la API para obtener las reservas
        console.log("Cargando reservas...");
    }

    // Inicializar funciones
    updateCardData();
    loadReservations();

    // Manejar el redimensionamiento de la ventana
    window.addEventListener('resize', function () {
        if (window.innerWidth > 992) {
            sidebar.classList.remove('active');
        }
    });

    // Efecto hover para los botones de acción
    const actionButtons = document.querySelectorAll('.action-button');
    actionButtons.forEach(button => {
        button.addEventListener('mouseenter', function () {
            this.style.transform = 'translateY(-3px)';
        });

        button.addEventListener('mouseleave', function () {
            this.style.transform = 'translateY(0)';
        });
    });

    // Efecto hover para las cards
    const cards = document.querySelectorAll('.card');
    cards.forEach(card => {
        card.addEventListener('mouseenter', function () {
            this.style.transform = 'translateY(-5px)';
            this.style.boxShadow = '0 5px 15px rgba(0, 0, 0, 0.1)';
        });

        card.addEventListener('mouseleave', function () {
            this.style.transform = 'translateY(0)';
            this.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.05)';
        });
    });

    // Simular acción de los botones de acción rápida
    const quickActionButtons = document.querySelectorAll('.action-button');
    quickActionButtons.forEach(button => {
        button.addEventListener('click', function () {
            const actionText = this.querySelector('span').textContent;
            alert(`Acción: ${actionText}\n\nEn una implementación real, esto abriría un formulario o realizaría una acción específica.`);
        });
    });

    // Simular acción de los botones de la tabla
    const tableActionButtons = document.querySelectorAll('.action-btn');
    tableActionButtons.forEach(button => {
        button.addEventListener('click', function () {
            const row = this.closest('tr');
            const reservationId = row.querySelector('td:first-child').textContent;
            const clientName = row.querySelector('td:nth-child(2)').textContent;

            if (this.classList.contains('view')) {
                alert(`Viendo detalles de la reserva ${reservationId} de ${clientName}`);
            } else if (this.classList.contains('edit')) {
                alert(`Editando reserva ${reservationId} de ${clientName}`);
            }
        });
    });
});