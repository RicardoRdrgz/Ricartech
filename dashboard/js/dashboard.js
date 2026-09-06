// ============================================================
// Ricartech Dashboard — Orquestador Principal
// ============================================================

(function () {
    'use strict';

    var currentView = 'tickets';
    var sidebar = document.getElementById('sidebar');
    var sidebarToggle = document.getElementById('sidebar-toggle');

    // Inicializar cuando auth esté listo
    window.addEventListener('auth-ready', function () {
        initDashboard();
    });

    // También intentar si auth.js ya cargó la sesión
    if (document.getElementById('app') && !document.getElementById('app').classList.contains('hidden')) {
        setTimeout(function () {
            if (!window._db) return;
            initDashboard();
        }, 500);
    }

    function initDashboard() {
        // Cargar tickets iniciales
        if (typeof window.loadTickets === 'function') {
            window.loadTickets();
        }

        // Navegación del sidebar
        var navItems = document.querySelectorAll('.nav-item');
        for (var i = 0; i < navItems.length; i++) {
            navItems[i].addEventListener('click', function (e) {
                e.preventDefault();
                var view = this.dataset.view;
                if (view) switchView(view);
                // Cerrar sidebar en móvil
                if (sidebar) sidebar.classList.remove('open');
            });
        }

        // Toggle sidebar en móvil
        if (sidebarToggle && sidebar) {
            sidebarToggle.addEventListener('click', function () {
                sidebar.classList.toggle('open');
            });
        }

        // Cerrar sidebar al hacer click fuera
        document.addEventListener('click', function (e) {
            if (sidebar && sidebar.classList.contains('open') &&
                !sidebar.contains(e.target) && e.target !== sidebarToggle) {
                sidebar.classList.remove('open');
            }
        });

        // Botón de nueva factura en vista invoices
        var newInvoiceBtn = document.getElementById('new-invoice-btn');
        if (newInvoiceBtn) {
            newInvoiceBtn.addEventListener('click', function () {
                switchView('tickets');
                window.showToast && window.showToast('Selecciona un ticket para generar su factura', 'info');
            });
        }

        // Toast notification system (del mismo estilo que la web)
        window.showToast = function (msg, type, duration) {
            var container = document.getElementById('toast-container');
            if (!container) return;
            type = type || 'info';
            duration = duration || 4000;

            var toast = document.createElement('div');
            toast.className = 'toast toast-' + type;
            toast.innerHTML = '<span class="toast-msg">' + escapeText(msg) + '</span>' +
                '<button class="toast-close" aria-label="Cerrar">&times;</button>';

            container.appendChild(toast);
            requestAnimationFrame(function () {
                toast.classList.add('show');
            });

            var dismiss = function () {
                toast.classList.remove('show');
                toast.classList.add('hide');
                setTimeout(function () { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 400);
            };

            toast.querySelector('.toast-close').addEventListener('click', dismiss);
            setTimeout(dismiss, duration);
        };
    }

    function switchView(viewName) {
        currentView = viewName;

        // Actualizar nav
        var navItems = document.querySelectorAll('.nav-item');
        for (var i = 0; i < navItems.length; i++) {
            navItems[i].classList.toggle('active', navItems[i].dataset.view === viewName);
        }

        // Mostrar vista
        var views = document.querySelectorAll('.view');
        for (var j = 0; j < views.length; j++) {
            views[j].classList.toggle('active', views[j].id === 'view-' + viewName);
        }

        // Renderizar contenido de la vista
        if (viewName === 'stats' && typeof window.renderStats === 'function') {
            setTimeout(function () { window.renderStats(); }, 100);
        }
    }

    function escapeText(value) {
        return value == null ? '' : String(value);
    }
})();
