// ============================================================
// Ricartech Dashboard — Tickets CRUD
// ============================================================

(function () {
    'use strict';

    var db = null;
    var allTickets = [];
    var currentPage = 1;
    var perPage = 15;
    var searchQuery = '';
    var filterStatus = '';

    function getDb() {
        return window._db;
    }

    function formatDate(isoStr) {
        if (!isoStr) return '—';
        var d = new Date(isoStr);
        if (isNaN(d.getTime())) return '—';
        var pad = function (n) { return n < 10 ? '0' + n : String(n); };
        return pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/' + d.getFullYear();
    }

    function statusColor(status) {
        var colors = {
            'Pendiente': 'var(--amber)',
            'En proceso': 'var(--cyan)',
            'Presupuesto enviado': 'var(--indigo-light)',
            'Aceptado': 'var(--green)',
            'Reparando': 'var(--indigo)',
            'Completado': 'var(--green)',
            'Cancelado': '#ef4444'
        };
        return colors[status] || 'var(--text-dim)';
    }

    function escapeHtml(str) {
        if (!str) return '';
        var div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    // Cargar todos los tickets
    window.loadTickets = async function () {
        db = getDb();
        if (!db) return;

        var { data, error } = await db
            .from('tickets')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error loading tickets:', error);
            return;
        }

        allTickets = data || [];
        updateKPIs();
        renderTickets();
    };

    // Filtrar tickets
    function getFilteredTickets() {
        return allTickets.filter(function (t) {
            var matchSearch = !searchQuery ||
                (t.cliente_nombre && t.cliente_nombre.toLowerCase().indexOf(searchQuery) !== -1) ||
                (t.cliente_email && t.cliente_email.toLowerCase().indexOf(searchQuery) !== -1) ||
                (t.id && t.id.toLowerCase().indexOf(searchQuery) !== -1);

            var matchStatus = !filterStatus || t.estado === filterStatus;

            return matchSearch && matchStatus;
        });
    }

    // Renderizar tabla
    function renderTickets() {
        var tbody = document.getElementById('tickets-body');
        if (!tbody) return;

        var filtered = getFilteredTickets();
        var total = filtered.length;
        var start = (currentPage - 1) * perPage;
        var page = filtered.slice(start, start + perPage);

        if (page.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="empty-state">No se encontraron tickets.</td></tr>';
        } else {
            var html = '';
            for (var i = 0; i < page.length; i++) {
                var t = page[i];
                var device = [t.dispositivo_tipo, t.dispositivo_marca].filter(Boolean).join(' ') || '—';
                html += '<tr data-id="' + escapeHtml(t.id) + '">' +
                    '<td class="ticket-id">' + escapeHtml(t.id) + '</td>' +
                    '<td>' + formatDate(t.created_at) + '</td>' +
                    '<td>' + escapeHtml(t.cliente_nombre) + '<br><span class="text-dim">' + escapeHtml(t.cliente_email) + '</span></td>' +
                    '<td>' + escapeHtml(device) + '</td>' +
                    '<td><span class="badge badge-urgency">' + escapeHtml(t.logistica_urgencia || '—') + '</span></td>' +
                    '<td><select class="status-select" data-id="' + escapeHtml(t.id) + '" style="border-color:' + statusColor(t.estado) + '">' +
                    buildStatusOptions(t.estado) + '</select></td>' +
                    '<td><button class="btn btn-ghost btn-sm view-ticket" data-id="' + escapeHtml(t.id) + '">Ver</button></td>' +
                    '</tr>';
            }
            tbody.innerHTML = html;
        }

        renderPagination(total);
        bindTableEvents();
    }

    function buildStatusOptions(current) {
        var statuses = ['Pendiente', 'En proceso', 'Presupuesto enviado', 'Aceptado', 'Reparando', 'Completado', 'Cancelado'];
        var html = '';
        for (var i = 0; i < statuses.length; i++) {
            html += '<option value="' + statuses[i] + '"' + (statuses[i] === current ? ' selected' : '') + '>' + statuses[i] + '</option>';
        }
        return html;
    }

    // Paginación
    function renderPagination(total) {
        var pagination = document.getElementById('pagination');
        if (!pagination) return;

        var pages = Math.ceil(total / perPage);
        if (pages <= 1) {
            pagination.innerHTML = '';
            return;
        }

        var html = '';
        html += '<button class="page-btn" data-page="' + (currentPage - 1) + '"' + (currentPage === 1 ? ' disabled' : '') + '>← Anterior</button>';

        for (var i = 1; i <= pages; i++) {
            if (pages > 7 && i > 2 && i < pages - 1 && Math.abs(i - currentPage) > 1) {
                if (i === 3 || i === pages - 2) html += '<span class="page-dots">…</span>';
                continue;
            }
            html += '<button class="page-btn' + (i === currentPage ? ' active' : '') + '" data-page="' + i + '">' + i + '</button>';
        }

        html += '<button class="page-btn" data-page="' + (currentPage + 1) + '"' + (currentPage === pages ? ' disabled' : '') + '>Siguiente →</button>';

        pagination.innerHTML = html;

        var btns = pagination.querySelectorAll('.page-btn');
        for (var b = 0; b < btns.length; b++) {
            btns[b].addEventListener('click', function () {
                var p = parseInt(this.dataset.page);
                if (p >= 1 && p <= pages) {
                    currentPage = p;
                    renderTickets();
                }
            });
        }
    }

    // KPIs
    function updateKPIs() {
        var total = allTickets.length;
        var pending = 0, inProgress = 0, done = 0;
        for (var i = 0; i < allTickets.length; i++) {
            var s = allTickets[i].estado;
            if (s === 'Pendiente') pending++;
            else if (s === 'En proceso' || s === 'Presupuesto enviado' || s === 'Aceptado' || s === 'Reparando') inProgress++;
            else if (s === 'Completado') done++;
        }

        var elTotal = document.getElementById('kpi-total');
        var elPending = document.getElementById('kpi-pending');
        var elProgress = document.getElementById('kpi-progress');
        var elDone = document.getElementById('kpi-done');
        if (elTotal) elTotal.textContent = total;
        if (elPending) elPending.textContent = pending;
        if (elProgress) elProgress.textContent = inProgress;
        if (elDone) elDone.textContent = done;
    }

    // Eventos de tabla
    function bindTableEvents() {
        // Ver detalle
        var viewBtns = document.querySelectorAll('.view-ticket');
        for (var i = 0; i < viewBtns.length; i++) {
            viewBtns[i].addEventListener('click', function () {
                var id = this.dataset.id;
                var ticket = allTickets.find(function (t) { return t.id === id; });
                if (ticket) showTicketDetail(ticket);
            });
        }

        // Cambio de estado rápido
        var statusSelects = document.querySelectorAll('.status-select');
        for (var j = 0; j < statusSelects.length; j++) {
            statusSelects[j].addEventListener('change', async function () {
                var id = this.dataset.id;
                var newStatus = this.value;
                await updateTicketStatus(id, newStatus);
            });
        }
    }

    // Actualizar estado
    async function updateTicketStatus(id, newStatus) {
        db = getDb();
        if (!db) return;

        var { error } = await db
            .from('tickets')
            .update({ estado: newStatus })
            .eq('id', id);

        if (error) {
            console.error('Error updating status:', error);
            window.showToast && window.showToast('Error al actualizar estado', 'error');
            return;
        }

        // Actualizar en memoria
        for (var i = 0; i < allTickets.length; i++) {
            if (allTickets[i].id === id) {
                allTickets[i].estado = newStatus;
                break;
            }
        }

        updateKPIs();
        window.showToast && window.showToast('Estado actualizado a: ' + newStatus, 'success');
    }

    // Ver detalle del ticket
    function showTicketDetail(ticket) {
        var overlay = document.getElementById('modal-overlay');
        var modalBody = document.getElementById('modal-body');
        var modalTitle = document.getElementById('modal-title');
        var modalFooter = document.getElementById('modal-footer');

        if (!overlay || !modalBody) return;

        modalTitle.textContent = 'Ticket: ' + ticket.id;

        var html = '';

        // Estado actual con selector
        html += '<div class="detail-section">';
        html += '<label class="detail-label">Estado actual</label>';
        html += '<select class="status-select-lg" id="detail-status" data-id="' + escapeHtml(ticket.id) + '">' +
            buildStatusOptions(ticket.estado) + '</select>';
        html += '</div>';

        // Datos del cliente
        html += '<div class="detail-section">';
        html += '<h4>Datos del cliente</h4>';
        html += '<div class="detail-grid">';
        html += detailRow('Nombre', ticket.cliente_nombre);
        html += detailRow('Teléfono', ticket.cliente_telefono);
        html += detailRow('Email', ticket.cliente_email);
        html += detailRow('Dirección', ticket.cliente_direccion);
        html += detailRow('Localidad', ticket.cliente_localidad);
        html += detailRow('CP', ticket.cliente_cp);
        html += detailRow('Cliente habitual', ticket.cliente_habitual === 'si' ? 'Sí' : 'No');
        html += '</div></div>';

        // Dispositivo
        html += '<div class="detail-section">';
        html += '<h4>Dispositivo</h4>';
        html += '<div class="detail-grid">';
        html += detailRow('Tipo', ticket.dispositivo_tipo);
        html += detailRow('Marca', ticket.dispositivo_marca);
        html += detailRow('Modelo', ticket.dispositivo_modelo);
        html += detailRow('Serie', ticket.dispositivo_serie);
        html += detailRow('S.O.', ticket.dispositivo_so);
        html += detailRow('Año', ticket.dispositivo_anio);
        html += '</div></div>';

        // Problema
        html += '<div class="detail-section">';
        html += '<h4>El problema</h4>';
        html += '<div class="detail-grid">';
        html += detailRow('Servicios', Array.isArray(ticket.averia_servicios) ? ticket.averia_servicios.join(', ') : ticket.averia_servicios);
        html += detailRow('Síntomas', Array.isArray(ticket.averia_sintomas) ? ticket.averia_sintomas.join(', ') : ticket.averia_sintomas);
        html += detailRow('Descripción', ticket.averia_descripcion);
        html += detailRow('Inicio', ticket.averia_fecha_inicio);
        html += detailRow('Intentos previos', ticket.averia_intentos);
        html += '</div></div>';

        // Logística
        html += '<div class="detail-section">';
        html += '<h4>Logística</h4>';
        html += '<div class="detail-grid">';
        html += detailRow('Urgencia', ticket.logistica_urgencia);
        html += detailRow('Modalidad', ticket.logistica_modalidad);
        html += detailRow('Disponibilidad', Array.isArray(ticket.logistica_disponibilidad) ? ticket.logistica_disponibilidad.join(', ') : ticket.logistica_disponibilidad);
        html += detailRow('Backup', ticket.logistica_backup);
        html += '</div></div>';

        // Observaciones
        if (ticket.extra_observaciones) {
            html += '<div class="detail-section">';
            html += '<h4>Observaciones</h4>';
            html += '<p class="detail-text">' + escapeHtml(ticket.extra_observaciones) + '</p>';
            html += '</div>';
        }

        // Importe
        html += '<div class="detail-section">';
        html += '<h4>Facturación</h4>';
        html += '<div class="detail-grid">';
        html += detailRow('Importe', ticket.importe_total ? ticket.importe_total + ' €' : '—');
        html += detailRow('Facturado', ticket.facturado ? 'Sí' : 'No');
        html += detailRow('Nº Factura', ticket.numero_factura || '—');
        html += '</div></div>';

        modalBody.innerHTML = html;

        // Footer con acciones
        modalFooter.innerHTML =
            '<button class="btn btn-ghost" id="modal-delete" data-id="' + escapeHtml(ticket.id) + '">Eliminar</button>' +
            '<a href="tel:' + escapeHtml(String(ticket.cliente_telefono || '')).replace(/"/g, '&quot;') + '" class="btn btn-ghost">Llamar</a>' +
            '<a href="mailto:' + escapeHtml(String(ticket.cliente_email || '')).replace(/"/g, '&quot;') + '" class="btn btn-ghost">Email</a>' +
            '<button class="btn btn-p" id="modal-invoice" data-id="' + escapeHtml(ticket.id) + '">Generar factura</button>';

        // Bind events
        var statusLg = document.getElementById('detail-status');
        if (statusLg) {
            statusLg.addEventListener('change', async function () {
                await updateTicketStatus(this.dataset.id, this.value);
                ticket.estado = this.value;
            });
        }

        var deleteBtn = document.getElementById('modal-delete');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', async function () {
                if (confirm('¿Eliminar el ticket ' + this.dataset.id + '? Esta acción no se puede deshacer.')) {
                    await deleteTicket(this.dataset.id);
                    closeModal();
                }
            });
        }

        var invoiceBtn = document.getElementById('modal-invoice');
        if (invoiceBtn) {
            invoiceBtn.addEventListener('click', function () {
                closeModal();
                if (typeof window.openInvoiceModal === 'function') {
                    window.openInvoiceModal(ticket);
                }
            });
        }

        overlay.classList.add('open');
        overlay.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
    }

    function detailRow(label, value) {
        return '<div class="detail-row"><span class="detail-label">' + label + '</span><span class="detail-value">' + escapeHtml(value) + '—</span></div>';
    }

    function closeModal() {
        var overlay = document.getElementById('modal-overlay');
        if (overlay) {
            overlay.classList.remove('open');
            overlay.setAttribute('aria-hidden', 'true');
            document.body.style.overflow = '';
        }
    }

    // Eliminar ticket
    async function deleteTicket(id) {
        db = getDb();
        if (!db) return;

        var { error } = await db
            .from('tickets')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting ticket:', error);
            window.showToast && window.showToast('Error al eliminar ticket', 'error');
            return;
        }

        allTickets = allTickets.filter(function (t) { return t.id !== id; });
        updateKPIs();
        renderTickets();
        window.showToast && window.showToast('Ticket eliminado', 'success');
    }

    // Editar ticket (update general)
    window.updateTicket = async function (id, updates) {
        db = getDb();
        if (!db) return;

        var { error } = await db
            .from('tickets')
            .update(updates)
            .eq('id', id);

        if (error) {
            console.error('Error updating ticket:', error);
            window.showToast && window.showToast('Error al actualizar ticket', 'error');
            return false;
        }

        // Actualizar en memoria
        for (var i = 0; i < allTickets.length; i++) {
            if (allTickets[i].id === id) {
                Object.assign(allTickets[i], updates);
                break;
            }
        }

        updateKPIs();
        renderTickets();
        return true;
    };

    // Buscar
    var searchInput = document.getElementById('search-tickets');
    if (searchInput) {
        var searchTimeout;
        searchInput.addEventListener('input', function () {
            clearTimeout(searchTimeout);
            var self = this;
            searchTimeout = setTimeout(function () {
                searchQuery = self.value.toLowerCase().trim();
                currentPage = 1;
                renderTickets();
            }, 250);
        });
    }

    // Filtrar por estado
    var filterSelect = document.getElementById('filter-status');
    if (filterSelect) {
        filterSelect.addEventListener('change', function () {
            filterStatus = this.value;
            currentPage = 1;
            renderTickets();
        });
    }

    // Cerrar modal
    var modalClose = document.getElementById('modal-close');
    var modalOverlay = document.getElementById('modal-overlay');
    if (modalClose) modalClose.addEventListener('click', closeModal);
    if (modalOverlay) {
        modalOverlay.addEventListener('click', function (e) {
            if (e.target === modalOverlay) closeModal();
        });
    }

    // Escape para cerrar modal
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') closeModal();
    });

    // Exponer funciones
    window.getAllTickets = function () { return allTickets; };
    window.getTicketById = function (id) {
        return allTickets.find(function (t) { return t.id === id; });
    };
})();
