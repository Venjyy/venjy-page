document.addEventListener('DOMContentLoaded', function () {
    // Marcar como activo el item del menú
    const currentPage = window.location.pathname.split('/').pop();
    const menuItems = document.querySelectorAll('.menu-item a');

    menuItems.forEach(item => {
        if (item.getAttribute('href') === currentPage) {
            item.parentElement.classList.add('active');
        } else {
            item.parentElement.classList.remove('active');
        }
    });

    // Lógica específica para la gestión de clientes
    document.getElementById('nuevoCliente').addEventListener('click', function () {
        // Abrir modal o formulario para nuevo cliente
    });

    // Cargar lista de clientes desde API
    function cargarClientes() {
        // Lógica para obtener y mostrar clientes
    }

    cargarClientes();
});