document.addEventListener('DOMContentLoaded', function () {
    // Referencias a elementos
    const btnAgregarEspacio = document.getElementById('btnAgregarEspacio');
    const espacioModal = document.getElementById('espacioModal');
    const confirmDeleteModal = document.getElementById('confirmDeleteModal');
    const closeModalButtons = document.querySelectorAll('.close-modal');

    // Mostrar modal para agregar espacio
    btnAgregarEspacio.addEventListener('click', function () {
        document.getElementById('modalTitle').textContent = 'Agregar Nuevo Espacio';
        document.getElementById('espacioForm').reset();
        espacioModal.classList.add('show');
    });

    // Cerrar modales
    closeModalButtons.forEach(button => {
        button.addEventListener('click', function () {
            espacioModal.classList.remove('show');
            confirmDeleteModal.classList.remove('show');
        });
    });

    // Cancelar formulario
    document.getElementById('btnCancelar').addEventListener('click', function () {
        espacioModal.classList.remove('show');
    });

    // Cancelar eliminación
    document.getElementById('btnCancelarEliminar').addEventListener('click', function () {
        confirmDeleteModal.classList.remove('show');
    });

    // Funcionalidad para editar (ejemplo)
    const editButtons = document.querySelectorAll('.btn-icon .fa-edit');
    editButtons.forEach(button => {
        button.parentElement.addEventListener('click', function () {
            document.getElementById('modalTitle').textContent = 'Editar Espacio';
            // Aquí cargarías los datos del espacio a editar

            espacioModal.classList.add('show');
        });
    });

    // Funcionalidad para eliminar (ejemplo)
    const deleteButtons = document.querySelectorAll('.btn-icon .fa-trash');
    deleteButtons.forEach(button => {
        button.parentElement.addEventListener('click', function () {
            confirmDeleteModal.classList.add('show');
        });
    });
});