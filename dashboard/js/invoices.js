// ============================================================
// Ricartech Dashboard — Generador de Facturas
// ============================================================

(function () {
    'use strict';

    var currentTicket = null;
    var invoiceOverlay = document.getElementById('invoice-overlay');
    var invoiceBody = document.getElementById('invoice-body');
    var invoiceClose = document.getElementById('invoice-close');
    var invoiceCancel = document.getElementById('invoice-cancel');
    var invoiceGenerate = document.getElementById('invoice-generate');

    // Precios de referencia
    var SERVICE_PRICES = {
        'Soporte Remoto (25€/h)': 25,
        'Instalación de Sistemas (50€)': 50,
        'Mantenimiento Físico (55€)': 55,
        'Migración HDD→SSD (70€)': 70,
        'Gestión de Datos (desde 40€)': 40,
        'Limpieza de Consolas (45€)': 45,
        'Reparación de Consolas (desde 50€)': 50
    };

    function escapeHtml(str) {
        if (!str) return '';
        var div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    function formatDate(isoStr) {
        if (!isoStr) return '—';
        var d = new Date(isoStr);
        if (isNaN(d.getTime())) return '—';
        var pad = function (n) { return n < 10 ? '0' + n : String(n); };
        return pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/' + d.getFullYear();
    }

    // Abrir modal de factura
    window.openInvoiceModal = function (ticket) {
        currentTicket = ticket;
        if (!invoiceOverlay || !invoiceBody) return;

        var services = Array.isArray(ticket.averia_servicios) ? ticket.averia_servicios : [];

        var html = '';

        // Datos del cliente
        html += '<div class="invoice-section">';
        html += '<h4>Cliente</h4>';
        html += '<p><strong>' + escapeHtml(ticket.cliente_nombre) + '</strong></p>';
        html += '<p>' + escapeHtml(ticket.cliente_direccion) + '</p>';
        html += '<p>' + escapeHtml(ticket.cliente_localidad) + (ticket.cliente_cp ? ' (' + escapeHtml(ticket.cliente_cp) + ')' : '') + '</p>';
        html += '<p>' + escapeHtml(ticket.cliente_email) + '</p>';
        html += '<p>' + escapeHtml(ticket.cliente_telefono) + '</p>';
        html += '</div>';

        // Datos del ticket
        html += '<div class="invoice-section">';
        html += '<h4>Ticket: ' + escapeHtml(ticket.id) + '</h4>';
        html += '<p>Fecha: ' + formatDate(ticket.created_at) + '</p>';
        html += '<p>Dispositivo: ' + escapeHtml(ticket.dispositivo_tipo) + ' ' + escapeHtml(ticket.dispositivo_marca) + ' ' + escapeHtml(ticket.dispositivo_modelo) + '</p>';
        html += '</div>';

        // Servicios con precios editables
        html += '<div class="invoice-section">';
        html += '<h4>Servicios</h4>';
        html += '<table class="invoice-table">';
        html += '<thead><tr><th>Servicio</th><th>Precio (€)</th><th>Quitar</th></tr></thead>';
        html += '<tbody id="invoice-services">';

        for (var i = 0; i < services.length; i++) {
            var price = SERVICE_PRICES[services[i]] || 0;
            html += '<tr class="invoice-row">' +
                '<td>' + escapeHtml(services[i]) + '</td>' +
                '<td><input type="number" class="invoice-price" data-service="' + escapeHtml(services[i]) + '" value="' + price + '" min="0" step="0.01"></td>' +
                '<td><button class="btn btn-ghost btn-sm remove-service" data-idx="' + i + '">×</button></td>' +
                '</tr>';
        }

        html += '</tbody></table>';

        // Agregar servicio custom
        html += '<div class="add-service-row">';
        html += '<input type="text" id="custom-service-name" placeholder="Servicio adicional" class="f-input">';
        html += '<input type="number" id="custom-service-price" placeholder="Precio" class="f-input" min="0" step="0.01">';
        html += '<button class="btn btn-ghost btn-sm" id="add-custom-service">+ Agregar</button>';
        html += '</div>';

        html += '</div>';

        // Descuento
        html += '<div class="invoice-section invoice-summary">';
        html += '<div class="invoice-row-summary">';
        html += '<label>Descuento (€):</label>';
        html += '<input type="number" id="invoice-discount" value="0" min="0" step="0.01" class="f-input f-input-sm">';
        html += '</div>';
        html += '<div class="invoice-row-summary">';
        html += '<label>IVA (%):</label>';
        html += '<input type="number" id="invoice-iva" value="21" min="0" max="100" class="f-input f-input-sm">';
        html += '</div>';
        html += '<div class="invoice-total">';
        html += '<span>Total:</span>';
        html += '<span id="invoice-total-value">0 €</span>';
        html += '</div>';
        html += '</div>';

        invoiceBody.innerHTML = html;

        // Bind events
        bindInvoiceEvents();

        invoiceOverlay.classList.add('open');
        invoiceOverlay.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
    };

    function bindInvoiceEvents() {
        // Update total on price change
        var priceInputs = document.querySelectorAll('.invoice-price');
        for (var i = 0; i < priceInputs.length; i++) {
            priceInputs[i].addEventListener('input', updateInvoiceTotal);
        }

        var discountInput = document.getElementById('invoice-discount');
        var ivaInput = document.getElementById('invoice-iva');
        if (discountInput) discountInput.addEventListener('input', updateInvoiceTotal);
        if (ivaInput) ivaInput.addEventListener('input', updateInvoiceTotal);

        // Remove service
        var removeBtns = document.querySelectorAll('.remove-service');
        for (var j = 0; j < removeBtns.length; j++) {
            removeBtns[j].addEventListener('click', function () {
                var row = this.closest('.invoice-row');
                if (row) row.remove();
                updateInvoiceTotal();
            });
        }

        // Add custom service
        var addBtn = document.getElementById('add-custom-service');
        if (addBtn) {
            addBtn.addEventListener('click', function () {
                var name = document.getElementById('custom-service-name');
                var price = document.getElementById('custom-service-price');
                if (!name || !price || !name.value.trim()) return;

                var tbody = document.getElementById('invoice-services');
                var tr = document.createElement('tr');
                tr.className = 'invoice-row';
                tr.innerHTML = '<td>' + escapeHtml(name.value.trim()) + '</td>' +
                    '<td><input type="number" class="invoice-price" value="' + (parseFloat(price.value) || 0) + '" min="0" step="0.01"></td>' +
                    '<td><button class="btn btn-ghost btn-sm remove-service">×</button></td>';
                tbody.appendChild(tr);

                tr.querySelector('.remove-service').addEventListener('click', function () {
                    tr.remove();
                    updateInvoiceTotal();
                });
                tr.querySelector('.invoice-price').addEventListener('input', updateInvoiceTotal);

                name.value = '';
                price.value = '';
                updateInvoiceTotal();
            });
        }

        updateInvoiceTotal();
    }

    function getInvoiceData() {
        var prices = document.querySelectorAll('.invoice-price');
        var services = [];
        var subtotal = 0;

        for (var i = 0; i < prices.length; i++) {
            var val = parseFloat(prices[i].value) || 0;
            services.push({
                name: prices[i].dataset.service || prices[i].closest('tr').querySelector('td').textContent,
                price: val
            });
            subtotal += val;
        }

        var discount = parseFloat(document.getElementById('invoice-discount').value) || 0;
        var ivaRate = parseFloat(document.getElementById('invoice-iva').value) || 0;
        var base = subtotal - discount;
        if (base < 0) base = 0;
        var iva = base * (ivaRate / 100);
        var total = base + iva;

        return {
            services: services,
            subtotal: subtotal,
            discount: discount,
            ivaRate: ivaRate,
            iva: iva,
            total: total
        };
    }

    function updateInvoiceTotal() {
        var data = getInvoiceData();
        var totalEl = document.getElementById('invoice-total-value');
        if (totalEl) totalEl.textContent = data.total.toFixed(2) + ' €';
    }

    // Generar factura (imprimir)
    if (invoiceGenerate) {
        invoiceGenerate.addEventListener('click', async function () {
            if (!currentTicket) return;

            var data = getInvoiceData();

            // Guardar importe en el ticket
            if (typeof window.updateTicket === 'function') {
                await window.updateTicket(currentTicket.id, {
                    importe_total: data.total,
                    facturado: true,
                    fecha_factura: new Date().toISOString(),
                    numero_factura: 'FAC-' + currentTicket.id.replace('TKT-', '')
                });
            }

            // Generar vista de impresión
            printInvoice(currentTicket, data);

            closeInvoiceModal();
            window.showToast && window.showToast('Factura generada correctamente', 'success');
        });
    }

    function printInvoice(ticket, data) {
        var printWindow = window.open('', '_blank');
        if (!printWindow) {
            window.showToast && window.showToast('Permitir ventanas emergentes para imprimir', 'warning');
            return;
        }

        var servicesHtml = '';
        for (var i = 0; i < data.services.length; i++) {
            servicesHtml += '<tr>' +
                '<td>' + escapeHtml(data.services[i].name) + '</td>' +
                '<td style="text-align:right">' + data.services[i].price.toFixed(2) + ' €</td>' +
                '</tr>';
        }

        var html = '<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">' +
            '<title>Factura ' + currentTicket.id + '</title>' +
            '<style>' +
            'body { font-family: Inter, Arial, sans-serif; margin: 40px; color: #1f2937; font-size: 14px; }' +
            '.header { display: flex; justify-content: space-between; margin-bottom: 30px; border-bottom: 2px solid #4F46E5; padding-bottom: 20px; }' +
            '.brand { font-size: 24px; font-weight: 700; color: #4F46E5; }' +
            '.brand em { font-style: normal; color: #06B6D4; }' +
            '.factura-title { font-size: 20px; font-weight: 700; text-align: right; color: #4F46E5; }' +
            '.meta { margin-bottom: 20px; }' +
            '.meta p { margin: 2px 0; }' +
            'table { width: 100%; border-collapse: collapse; margin: 20px 0; }' +
            'th { background: #4F46E5; color: white; padding: 8px 12px; text-align: left; }' +
            'td { padding: 8px 12px; border-bottom: 1px solid #e5e7eb; }' +
            '.totals { text-align: right; margin-top: 20px; }' +
            '.totals p { margin: 4px 0; }' +
            '.totals .total-final { font-size: 18px; font-weight: 700; color: #4F46E5; border-top: 2px solid #4F46E5; padding-top: 8px; }' +
            '.footer { margin-top: 40px; font-size: 12px; color: #6b7280; text-align: center; border-top: 1px solid #e5e7eb; padding-top: 15px; }' +
            '@media print { body { margin: 20px; } }' +
            '</style></head><body>' +
            '<div class="header"><div class="brand">Ricar<em>tech</em></div>' +
            '<div class="factura-title">FACTURA</div></div>' +
            '<div class="meta">' +
            '<p><strong>Factura:</strong> FAC-' + currentTicket.id.replace('TKT-', '') + '</p>' +
            '<p><strong>Fecha:</strong> ' + formatDate(new Date().toISOString()) + '</p>' +
            '<p><strong>Ticket:</strong> ' + currentTicket.id + '</p>' +
            '</div>' +
            '<div class="meta"><h4>Cliente</h4>' +
            '<p>' + escapeHtml(ticket.cliente_nombre) + '</p>' +
            '<p>' + escapeHtml(ticket.cliente_direccion) + '</p>' +
            '<p>' + escapeHtml(ticket.cliente_localidad) + (ticket.cliente_cp ? ' (' + escapeHtml(ticket.cliente_cp) + ')' : '') + '</p>' +
            '<p>' + escapeHtml(ticket.cliente_email) + ' · ' + escapeHtml(ticket.cliente_telefono) + '</p>' +
            '</div>' +
            '<table><thead><tr><th>Servicio</th><th style="text-align:right">Importe</th></tr></thead>' +
            '<tbody>' + servicesHtml + '</tbody></table>' +
            '<div class="totals">' +
            '<p>Subtotal: ' + data.subtotal.toFixed(2) + ' €</p>' +
            (data.discount > 0 ? '<p>Descuento: -' + data.discount.toFixed(2) + ' €</p>' : '') +
            (data.ivaRate > 0 ? '<p>IVA (' + data.ivaRate + '%): ' + data.iva.toFixed(2) + ' €</p>' : '') +
            '<p class="total-final">Total: ' + data.total.toFixed(2) + ' €</p>' +
            '</div>' +
            '<div class="footer">' +
            '<p>Cristian Ricardo Rodríguez Arias — Técnico Informático Freelance</p>' +
            '<p>Sitges, Barcelona · Christtopherrodriguezarias@gmail.com</p>' +
            '</div>' +
            '</body></html>';

        printWindow.document.write(html);
        printWindow.document.close();
        setTimeout(function () { printWindow.print(); }, 500);
    }

    function closeInvoiceModal() {
        if (invoiceOverlay) {
            invoiceOverlay.classList.remove('open');
            invoiceOverlay.setAttribute('aria-hidden', 'true');
            document.body.style.overflow = '';
        }
        currentTicket = null;
    }

    if (invoiceClose) invoiceClose.addEventListener('click', closeInvoiceModal);
    if (invoiceCancel) invoiceCancel.addEventListener('click', closeInvoiceModal);
    if (invoiceOverlay) {
        invoiceOverlay.addEventListener('click', function (e) {
            if (e.target === invoiceOverlay) closeInvoiceModal();
        });
    }

    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') closeInvoiceModal();
    });
})();
