// ============================================================
// Ricartech Dashboard — Estadísticas
// ============================================================

(function () {
    'use strict';

    // Precios de referencia para cálculos
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

    window.renderStats = function () {
        var tickets = typeof window.getAllTickets === 'function' ? window.getAllTickets() : [];
        if (!tickets.length) return;

        renderStatusChart(tickets);
        renderMonthlyChart(tickets);
        renderTopServices(tickets);
        renderTopLocations(tickets);
        renderRevenue(tickets);
    };

    // Gráfico de barras: tickets por estado (usando CSS, sin canvas library)
    function renderStatusChart(tickets) {
        var canvas = document.getElementById('chart-status');
        if (!canvas) return;

        var counts = {};
        var statuses = ['Pendiente', 'En proceso', 'Presupuesto enviado', 'Aceptado', 'Reparando', 'Completado', 'Cancelado'];
        for (var i = 0; i < statuses.length; i++) counts[statuses[i]] = 0;
        for (var j = 0; j < tickets.length; j++) {
            var s = tickets[j].estado || 'Pendiente';
            if (counts[s] !== undefined) counts[s]++;
            else counts[s] = 1;
        }

        var max = Math.max.apply(null, Object.values(counts)) || 1;
        var colors = {
            'Pendiente': '#F59E0B',
            'En proceso': '#06B6D4',
            'Presupuesto enviado': '#6366F1',
            'Aceptado': '#22C55E',
            'Reparando': '#4F46E5',
            'Completado': '#10B981',
            'Cancelado': '#EF4444'
        };

        var ctx = canvas.getContext('2d');
        var w = canvas.width = canvas.parentElement.clientWidth - 32;
        var h = canvas.height = 250;
        ctx.clearRect(0, 0, w, h);

        var barWidth = Math.min(40, (w - 60) / statuses.length - 8);
        var startX = 50;
        var startY = h - 30;
        var chartHeight = h - 60;

        // Eje Y
        ctx.strokeStyle = '#374151';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(startX, 10);
        ctx.lineTo(startX, startY);
        ctx.lineTo(w - 10, startY);
        ctx.stroke();

        // Barras
        for (var k = 0; k < statuses.length; k++) {
            var count = counts[statuses[k]];
            var barHeight = (count / max) * chartHeight;
            var x = startX + 10 + k * (barWidth + 8);
            var y = startY - barHeight;

            ctx.fillStyle = colors[statuses[k]] || '#6B7280';
            ctx.fillRect(x, y, barWidth, barHeight);

            // Valor encima
            ctx.fillStyle = '#D1D5DB';
            ctx.font = '11px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(count, x + barWidth / 2, y - 5);

            // Label abajo
            ctx.fillStyle = '#9CA3AF';
            ctx.font = '9px Inter, sans-serif';
            ctx.save();
            ctx.translate(x + barWidth / 2, startY + 12);
            ctx.rotate(-Math.PI / 4);
            ctx.textAlign = 'right';
            var shortLabel = statuses[k].length > 10 ? statuses[k].substring(0, 10) + '…' : statuses[k];
            ctx.fillText(shortLabel, 0, 0);
            ctx.restore();
        }
    }

    // Gráfico de línea: tickets por mes
    function renderMonthlyChart(tickets) {
        var canvas = document.getElementById('chart-monthly');
        if (!canvas) return;

        var months = [];
        var now = new Date();
        for (var i = 11; i >= 0; i--) {
            var d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            months.push({
                key: d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'),
                label: d.toLocaleString('es', { month: 'short', year: '2-digit' })
            });
        }

        var counts = {};
        for (var m = 0; m < months.length; m++) counts[months[m].key] = 0;

        for (var j = 0; j < tickets.length; j++) {
            var created = tickets[j].created_at;
            if (!created) continue;
            var d2 = new Date(created);
            var key = d2.getFullYear() + '-' + String(d2.getMonth() + 1).padStart(2, '0');
            if (counts[key] !== undefined) counts[key]++;
        }

        var values = months.map(function (m) { return counts[m.key]; });
        var max = Math.max.apply(null, values) || 1;

        var ctx = canvas.getContext('2d');
        var w = canvas.width = canvas.parentElement.clientWidth - 32;
        var h = canvas.height = 250;
        ctx.clearRect(0, 0, w, h);

        var startX = 40;
        var endX = w - 20;
        var startY = h - 30;
        var chartHeight = h - 60;
        var stepX = (endX - startX) / (months.length - 1);

        // Ejes
        ctx.strokeStyle = '#374151';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(startX, 10);
        ctx.lineTo(startX, startY);
        ctx.lineTo(endX, startY);
        ctx.stroke();

        // Línea
        ctx.strokeStyle = '#4F46E5';
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (var n = 0; n < values.length; n++) {
            var x = startX + n * stepX;
            var y = startY - (values[n] / max) * chartHeight;
            if (n === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();

        // Puntos
        for (var p = 0; p < values.length; p++) {
            var px = startX + p * stepX;
            var py = startY - (values[p] / max) * chartHeight;

            ctx.fillStyle = '#4F46E5';
            ctx.beginPath();
            ctx.arc(px, py, 4, 0, Math.PI * 2);
            ctx.fill();

            // Valor
            if (values[p] > 0) {
                ctx.fillStyle = '#D1D5DB';
                ctx.font = '10px Inter, sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(values[p], px, py - 8);
            }

            // Label
            ctx.fillStyle = '#9CA3AF';
            ctx.font = '9px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(months[p].label, px, startY + 14);
        }
    }

    // Top servicios
    function renderTopServices(tickets) {
        var container = document.getElementById('top-services');
        if (!container) return;

        var counts = {};
        for (var i = 0; i < tickets.length; i++) {
            var services = tickets[i].averia_servicios;
            if (!Array.isArray(services)) continue;
            for (var j = 0; j < services.length; j++) {
                var s = services[j];
                counts[s] = (counts[s] || 0) + 1;
            }
        }

        var sorted = Object.entries(counts).sort(function (a, b) { return b[1] - a[1]; }).slice(0, 5);
        var max = sorted.length ? sorted[0][1] : 1;

        var html = '';
        for (var k = 0; k < sorted.length; k++) {
            var name = sorted[k][0];
            var count = sorted[k][1];
            var pct = Math.round((count / max) * 100);
            html += '<div class="top-item">' +
                '<div class="top-item-header">' +
                '<span class="top-item-name">' + escapeHtml(name) + '</span>' +
                '<span class="top-item-count">' + count + '</span>' +
                '</div>' +
                '<div class="top-bar"><div class="top-bar-fill" style="width:' + pct + '%"></div></div>' +
                '</div>';
        }

        container.innerHTML = html || '<p class="empty-state">Sin datos</p>';
    }

    // Top localidades
    function renderTopLocations(tickets) {
        var container = document.getElementById('top-locations');
        if (!container) return;

        var counts = {};
        for (var i = 0; i < tickets.length; i++) {
            var loc = tickets[i].cliente_localidad;
            if (loc) counts[loc] = (counts[loc] || 0) + 1;
        }

        var sorted = Object.entries(counts).sort(function (a, b) { return b[1] - a[1]; }).slice(0, 5);
        var max = sorted.length ? sorted[0][1] : 1;

        var html = '';
        for (var k = 0; k < sorted.length; k++) {
            var name = sorted[k][0];
            var count = sorted[k][1];
            var pct = Math.round((count / max) * 100);
            html += '<div class="top-item">' +
                '<div class="top-item-header">' +
                '<span class="top-item-name">' + escapeHtml(name) + '</span>' +
                '<span class="top-item-count">' + count + '</span>' +
                '</div>' +
                '<div class="top-bar"><div class="top-bar-fill" style="width:' + pct + '%"></div></div>' +
                '</div>';
        }

        container.innerHTML = html || '<p class="empty-state">Sin datos</p>';
    }

    // Ingresos
    function renderRevenue(tickets) {
        var totalFacturado = 0;
        var totalPendiente = 0;
        var countFacturado = 0;

        for (var i = 0; i < tickets.length; i++) {
            var t = tickets[i];
            if (t.importe_total) {
                if (t.facturado) {
                    totalFacturado += parseFloat(t.importe_total) || 0;
                    countFacturado++;
                } else {
                    totalPendiente += parseFloat(t.importe_total) || 0;
                }
            }
        }

        var avg = countFacturado > 0 ? Math.round(totalFacturado / countFacturado) : 0;

        var elTotal = document.getElementById('revenue-total');
        var elPending = document.getElementById('revenue-pending');
        var elAvg = document.getElementById('revenue-avg');

        if (elTotal) elTotal.textContent = totalFacturado.toFixed(0) + ' €';
        if (elPending) elPending.textContent = totalPendiente.toFixed(0) + ' €';
        if (elAvg) elAvg.textContent = avg + ' €';
    }

    // Hacer accesible la función de estimación de precio
    window.estimateServicePrice = function (serviceName) {
        return SERVICE_PRICES[serviceName] || 0;
    };
})();
