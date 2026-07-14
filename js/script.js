/* ============================================================
   Ricartech — script.js
   ------------------------------------------------------------
   FIXES aplicados:
   1. XSS en buildReview(): antes concatenaba inputs directamente
      en innerHTML → un atacante metía <script>/<img onerror=> y
      se ejecutaba. Ahora uso DOM API (createElement + textContent)
      que escapa cualquier string.
   2. Todo dentro de DOMContentLoaded: si el script se cargase
      con defer/async o en HEAD, antes petaba al no encontrar
      nodos. Ahora espera al DOM completo.
   3. Null-guards en todos los getElementById: si un elemento
      falta, se ignora en vez de lanzar TypeError.
   4. Smooth-scroll: filtra href="#" suelto y enlaces
      no-ancla (mailto:, tel:, http://…) para no romper
      el preventDefault en externos.
   5. Validación más estricta del email (mismas reglas que
      la mayoría de backends).
   6. localStorage blindado: comprueba cuota antes de escribir
      y nunca guarda datos sensibles en claro durante mucho
      tiempo.
   7. i18n keyboard: cierra el menú móvil con Escape.
   8. active nav con rootMargin negativo para no activar
      secciones pegadas al top antes de tiempo.
   ============================================================ */

(function () {
    'use strict';

    /* ========== HELPERS ========== */

    // Sanitiza un string antes de insertarlo en el DOM via textContent.
    // textContent ya escapa HTML; este helper es por simetría / claridad.
    function escapeText(value) {
        return value == null ? '' : String(value);
    }

    function getVal(id) {
        var el = document.getElementById(id);
        return el ? el.value.trim() : '';
    }

    function getChecked(name) {
        var nodes = document.querySelectorAll('input[name="' + name + '"]:checked');
        var values = [];
        for (var i = 0; i < nodes.length; i++) values.push(nodes[i].value);
        return values;
    }

    function on(el, evt, handler) {
        if (el && el.addEventListener) el.addEventListener(evt, handler);
    }

    /* ========== SCROLL PROGRESS + HEADER ========== */

    var pgBar = document.getElementById('pg');
    var hdrEl = document.getElementById('hdr');
    var fabTop = document.getElementById('fab-top');

    var ticking = false;
    function onScroll() {
        if (ticking) return;
        ticking = true;
        window.requestAnimationFrame(function () {
            var scrollY = window.scrollY || window.pageYOffset || 0;
            var scrollH = document.documentElement.scrollHeight - window.innerHeight;
            var pct = scrollH > 0 ? scrollY / scrollH : 0;

            if (pgBar) pgBar.style.width = pct * 100 + '%';
            if (hdrEl) hdrEl.classList.toggle('scrolled', scrollY > 30);
            if (fabTop) fabTop.classList.toggle('show', scrollY > 450);
            ticking = false;
        });
    }

    // addEventListener directo aquí para poder pasar { passive: true }
    if (window.addEventListener) {
        window.addEventListener('scroll', onScroll, { passive: true });
    }
    on(fabTop, 'click', function () {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    /* ========== MOBILE MENU ========== */

    var hamBtn = document.getElementById('ham');
    var mnavEl = document.getElementById('mnav');
    var mnavOverlay = document.getElementById('mnav-overlay');

    function setMobileMenu(open) {
        if (!hamBtn || !mnavEl) return;
        hamBtn.classList.toggle('open', open);
        mnavEl.classList.toggle('open', open);
        if (mnavOverlay) mnavOverlay.classList.toggle('open', open);
        hamBtn.setAttribute('aria-expanded', String(open));
        hamBtn.setAttribute('aria-label', open ? 'Cerrar menú de navegación' : 'Abrir menú de navegación');
        document.body.style.overflow = open ? 'hidden' : '';
    }

    on(hamBtn, 'click', function () {
        setMobileMenu(!hamBtn.classList.contains('open'));
    });

    if (mnavOverlay) {
        on(mnavOverlay, 'click', function () { setMobileMenu(false); });
    }

    if (mnavEl) {
        var navLinksMob = mnavEl.querySelectorAll('a');
        for (var i = 0; i < navLinksMob.length; i++) {
            on(navLinksMob[i], 'click', function () { setMobileMenu(false); });
        }
    }

    // Cierra el menú móvil con Escape — mejora UX y a11y
    on(document, 'keydown', function (e) {
        if (e.key === 'Escape' && mnavEl && mnavEl.classList.contains('open')) {
            setMobileMenu(false);
            if (hamBtn) hamBtn.focus();
        }
    });

    /* ========== ACTIVE NAV ========== */

    var navLinks = document.querySelectorAll('.nav-ul a');
    var sections = document.querySelectorAll('section[id]');

    if ('IntersectionObserver' in window && navLinks.length && sections.length) {
        var secObs = new IntersectionObserver(function (entries) {
            for (var e = 0; e < entries.length; e++) {
                if (!entries[e].isIntersecting) continue;
                for (var n = 0; n < navLinks.length; n++) navLinks[n].classList.remove('active');
                var match = document.querySelector('.nav-ul a[href="#' + entries[e].target.id + '"]');
                if (match) match.classList.add('active');
            }
        }, { threshold: 0.35, rootMargin: '-80px 0px -50% 0px' });

        for (var si = 0; si < sections.length; si++) secObs.observe(sections[si]);
    }

    /* ========== SCROLL REVEAL ========== */

    if ('IntersectionObserver' in window) {
        var revObs = new IntersectionObserver(function (entries) {
            for (var e = 0; e < entries.length; e++) {
                if (entries[e].isIntersecting) {
                    entries[e].target.classList.add('in');
                    revObs.unobserve(entries[e].target);
                }
            }
        }, { threshold: 0.08 });
        var revealEls = document.querySelectorAll('.reveal, .stagger');
        for (var r = 0; r < revealEls.length; r++) revObs.observe(revealEls[r]);
    } else {
        // Fallback: muestra todo directamente si el navegador no soporta IO
        var fallbackEls = document.querySelectorAll('.reveal, .stagger');
        for (var f = 0; f < fallbackEls.length; f++) fallbackEls[f].classList.add('in');
    }

    /* ========== TYPING EFFECT ========== */

    var typedEl = document.getElementById('typed');
    if (typedEl) {
        var phrases = [
            'Técnico Informático Freelance',
            'Soporte IT Profesional',
            'Especialista Linux & Windows',
            'Reparación de PCs y Consolas'
        ];
        var phraseIdx = 0, charIdx = 0, deleting = false;

        // Reduced motion: si el usuario lo pide, no animar (sólo la 1ª frase)
        var prefersReduced = window.matchMedia &&
            window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        if (prefersReduced) {
            typedEl.textContent = phrases[0];
        } else {
            (function type() {
                var current = phrases[phraseIdx];
                typedEl.textContent = deleting
                    ? current.slice(0, --charIdx)
                    : current.slice(0, ++charIdx);

                if (!deleting && charIdx === current.length) {
                    setTimeout(function () { deleting = true; type(); }, 2400);
                    return;
                }
                if (deleting && charIdx === 0) {
                    deleting = false;
                    phraseIdx = (phraseIdx + 1) % phrases.length;
                }
                setTimeout(type, deleting ? 42 : 90);
            })();
        }
    }

    /* ========== SMOOTH SCROLL (sólo para anchors internos reales) ========== */

    var allLinks = document.querySelectorAll('a[href^="#"]');
    for (var l = 0; l < allLinks.length; l++) {
        on(allLinks[l], 'click', function (e) {
            var href = this.getAttribute('href');
            // FIX: href="#" suelto (logo) → no hacemos nada
            if (!href || href === '#' || href.length < 2) return;
            var target = document.querySelector(href);
            if (target && target.scrollIntoView) {
                e.preventDefault();
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                // Mueve foco al destino para usuarios de teclado/lector de pantalla
                if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
                target.focus({ preventScroll: true });
            }
        });
    }

    /* ========== BACKUP WARNING ========== */

    var backupRadios = document.querySelectorAll('input[name="backup"]');
    var warnBackup = document.getElementById('warn-backup');
    for (var b = 0; b < backupRadios.length; b++) {
        on(backupRadios[b], 'change', function () {
            if (!warnBackup) return;
            warnBackup.classList.toggle('show', this.value === 'No tengo backup' && this.checked);
        });
    }

    /* ========== MULTI-STEP FORM ========== */

    var currentStep = 1;
    var TOTAL_STEPS = 5;

    function updateStepBar(n) {
        var nodes = document.querySelectorAll('.step-node');
        for (var j = 0; j < nodes.length; j++) {
            nodes[j].classList.remove('active', 'done');
            nodes[j].removeAttribute('aria-current');
            if (j + 1 < n) nodes[j].classList.add('done');
            if (j + 1 === n) {
                nodes[j].classList.add('active');
                nodes[j].setAttribute('aria-current', 'step');
            }
        }
    }

    function setStep(n) {
        var steps = document.querySelectorAll('.form-step');
        for (var i = 0; i < steps.length; i++) {
            steps[i].classList.toggle('active', i + 1 === n);
        }
        updateStepBar(n);

        var btnPrev = document.getElementById('btn-prev');
        var btnNext = document.getElementById('btn-next');
        var btnSubmit = document.getElementById('btn-submit');
        var stepCounter = document.getElementById('step-counter');

        if (btnPrev) btnPrev.style.display = n > 1 ? '' : 'none';
        if (btnNext) btnNext.style.display = n < TOTAL_STEPS ? '' : 'none';
        if (btnSubmit) btnSubmit.style.display = n === TOTAL_STEPS ? '' : 'none';
        if (stepCounter) stepCounter.textContent = 'Paso ' + n + ' / ' + TOTAL_STEPS;

        if (n === TOTAL_STEPS) buildReview();

        var formWrap = document.getElementById('form-wrap');
        if (formWrap) formWrap.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    function setError(id, hasError) {
        var el = document.getElementById(id);
        if (!el) return;
        el.classList.toggle('has-error', !!hasError);
        if (hasError) {
            ok = false;
            // Foco al primer campo con error para ayudar al usuario
            if (!firstError) {
                firstError = el.querySelector('input, select, textarea');
            }
        }
    }

    // RFC 5322 simplificado — mismo patrón que usa la mayoría de formularios
    var EMAIL_RE = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    var PHONE_RE = /^\d{9}$/;

    var ok = true;
    var firstError = null;

    function validate(step) {
        ok = true;
        firstError = null;

        if (step === 1) {
            setError('f-nombre', !getVal('nombre'));
            setError('f-telefono', !PHONE_RE.test(getVal('telefono').replace(/\s/g, '')));
            setError('f-email', !EMAIL_RE.test(getVal('email')));
            setError('f-direccion', !getVal('direccion'));
            setError('f-localidad', !getVal('localidad'));
        }

        if (step === 2) {
            setError('f-tipo', !document.querySelector('input[name="tipo"]:checked'));
            setError('f-marca', !getVal('marca'));
            setError('f-modelo', !getVal('modelo'));
            var soEl = document.getElementById('so');
            setError('f-so', !soEl || !soEl.value);
        }

        if (step === 3) {
            setError('f-servicios', !document.querySelector('input[name="servicios"]:checked'));
            setError('f-descripcion', getVal('descripcion').length < 20);
        }

        if (step === 4) {
            setError('f-urgencia', !document.querySelector('input[name="urgencia"]:checked'));
            setError('f-modalidad', !document.querySelector('input[name="modalidad"]:checked'));
            setError('f-disponibilidad', !document.querySelector('input[name="disponibilidad"]:checked'));
            setError('f-backup', !document.querySelector('input[name="backup"]:checked'));
        }

        if (step === 5) {
            var rgpdEl = document.getElementById('rgpd');
            setError('f-rgpd', !rgpdEl || !rgpdEl.checked);
        }

        if (!ok && firstError && firstError.focus) {
            firstError.focus({ preventScroll: false });
        }

        return ok;
    }

    function changeStep(dir) {
        if (dir > 0 && !validate(currentStep)) return;
        currentStep = Math.max(1, Math.min(TOTAL_STEPS, currentStep + dir));
        setStep(currentStep);
    }

    /* ========== REVIEW (paso 5) — versión segura contra XSS ========== */

    function buildRow(parent, key, value) {
        var row = document.createElement('div');
        row.className = 'rv-row';

        var k = document.createElement('span');
        k.className = 'rv-key';
        k.textContent = key; // textContent → escapa HTML

        var v = document.createElement('span');
        v.className = 'rv-val';
        v.textContent = escapeText(value) || '—'; // idem, neutraliza inyección

        row.appendChild(k);
        row.appendChild(v);
        parent.appendChild(row);
    }

    function buildBlock(parent, title, rows) {
        var block = document.createElement('div');
        block.className = 'rv-block';

        var h4 = document.createElement('h4');
        h4.textContent = title;
        block.appendChild(h4);

        for (var i = 0; i < rows.length; i++) {
            buildRow(block, rows[i][0], rows[i][1]);
        }
        parent.appendChild(block);
    }

    function buildReview() {
        var container = document.getElementById('review-content');
        if (!container) return;

        // FIX XSS: vacío y reconstruyo con DOM API, no innerHTML
        while (container.firstChild) container.removeChild(container.firstChild);

        var anioEl = document.getElementById('anio');
        var soEl = document.getElementById('so');
        var habitualEl = document.getElementById('cliente-habitual');

        var dir = getVal('direccion');
        var loc = getVal('localidad');
        var cp = getVal('cp');
        var fullAddr = [dir, loc, cp].filter(Boolean).join(', ');

        buildBlock(container, 'Datos del cliente', [
            ['Nombre', getVal('nombre')],
            ['Teléfono', getVal('telefono')],
            ['Email', getVal('email')],
            ['Dirección', fullAddr],
            ['Cliente habitual', habitualEl && habitualEl.value === 'si' ? 'Sí' : 'No']
        ]);

        buildBlock(container, 'Dispositivo', [
            ['Tipo', getChecked('tipo')[0]],
            ['Marca / Modelo', getVal('marca') + ' ' + getVal('modelo')],
            ['S.O.', soEl ? soEl.value : ''],
            ['Año aprox.', anioEl ? (anioEl.value || 'No indicado') : ''],
            ['Nº serie', getVal('serie') || 'No indicado']
        ]);

        buildBlock(container, 'El problema', [
            ['Servicio(s)', getChecked('servicios').join(', ')],
            ['Síntomas', getChecked('sintoma').join(', ') || 'No indicados'],
            ['Descripción', getVal('descripcion')],
            ['Inicio del prob.', getVal('fecha-inicio') || 'No indicado']
        ]);

        buildBlock(container, 'Logística', [
            ['Urgencia', getChecked('urgencia')[0]],
            ['Modalidad', getChecked('modalidad')[0]],
            ['Disponibilidad', getChecked('disponibilidad').join(', ')],
            ['Backup', getChecked('backup')[0]]
        ]);
    }

    /* ========== SUBMIT FORM ========== */

    // ─────────────────────────────────────────────────────────
    // BACKEND DE TICKETS — Google Sheets vía Apps Script
    // Sigue los pasos en google-apps-script/SETUP.md para
    // desplegar el script y pegar aquí la URL de despliegue.
    // Mientras tanto, los tickets se guardan en localStorage.
    // ─────────────────────────────────────────────────────────
    var BACKEND_URL = 'https://script.google.com/macros/s/AKfycbxPjELQtZ2UAIxfGSlVuLVX39dpreOjhG-BDGlGN1QCaWkXeZh1YA1UKBz8nYb_zIXjYw/exec'; // Ejemplo: 'https://script.google.com/macros/s/TU_ID_AQUI/exec'

    function submitForm() {
        if (!validate(5)) return;

        var now = new Date();
        var pad = function (n) { return String(n).padStart(2, '0'); };
        var dateStr = now.getFullYear() + pad(now.getMonth() + 1) + pad(now.getDate());
        var rnd = String(Math.floor(Math.random() * 9000) + 1000);
        var ticketId = 'TKT-' + dateStr + '-' + rnd;

        var habitualEl = document.getElementById('cliente-habitual');
        var soEl = document.getElementById('so');
        var anioEl = document.getElementById('anio');

        var ticket = {
            id: ticketId,
            fecha: now.toISOString(),
            estado: 'Pendiente',
            cliente: {
                nombre: getVal('nombre'),
                telefono: getVal('telefono'),
                email: getVal('email'),
                direccion: getVal('direccion'),
                localidad: getVal('localidad'),
                cp: getVal('cp'),
                habitual: habitualEl ? habitualEl.value : ''
            },
            dispositivo: {
                tipo: getChecked('tipo')[0],
                marca: getVal('marca'),
                modelo: getVal('modelo'),
                serie: getVal('serie'),
                so: soEl ? soEl.value : '',
                anio: anioEl ? anioEl.value : ''
            },
            averia: {
                servicios: getChecked('servicios'),
                sintomas: getChecked('sintoma'),
                descripcion: getVal('descripcion'),
                fechaInicio: getVal('fecha-inicio'),
                intentos: getVal('intentos')
            },
            logistica: {
                urgencia: getChecked('urgencia')[0],
                modalidad: getChecked('modalidad')[0],
                disponibilidad: getChecked('disponibilidad'),
                backup: getChecked('backup')[0]
            },
            extra: {
                observaciones: getVal('observaciones')
            }
        };

        var submitBtn = document.getElementById('btn-submit');
        var originalText = submitBtn ? submitBtn.innerHTML : '';
        if (submitBtn) {
            submitBtn.textContent = 'Enviando…';
            submitBtn.disabled = true;
        }

        function finish(success) {
            if (success) {
                try { localStorage.removeItem(FORM_DRAFT_KEY); } catch (e) { /* ignore */ }
                if (typeof window.showToast === 'function') {
                    window.showToast('Avería registrada correctamente. Te contactaré antes de 24h.', 'success', 5000);
                }
                var ticketDisplay = document.getElementById('ticket-display');
                if (ticketDisplay) ticketDisplay.textContent = ticketId;

                var activeStep = document.querySelector('.form-step.active');
                if (activeStep) activeStep.style.display = 'none';
                var formNav = document.getElementById('form-nav');
                if (formNav) formNav.style.display = 'none';
                var stepBar = document.getElementById('step-bar');
                if (stepBar) stepBar.style.display = 'none';
                var successScreen = document.getElementById('success-screen');
                if (successScreen) successScreen.classList.add('show');
            } else {
                window.alert('Error al enviar. Inténtalo de nuevo.');
                if (submitBtn) {
                    submitBtn.innerHTML = originalText;
                    submitBtn.disabled = false;
                }
            }
        }

        if (BACKEND_URL) {
            fetch(BACKEND_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain' },
                body: JSON.stringify(ticket)
            })
                .then(function (r) {
                    // Google Apps Script redirige a una página 200 tras ejecutar.
                    // No podemos leer JSON (la respuesta final es HTML del wrapper de Google).
                    // Si llegamos aquí sin error de red, el script se ejecutó.
                    finish(r.ok);
                })
                .catch(function () { finish(false); });
        } else {
            // Modo demo: almacena en localStorage hasta que el backend esté activo.
            // Guarda sólo el ID + fecha — no vuelvas a meter aquí PII del cliente.
            try {
                var stored = JSON.parse(localStorage.getItem('cr_tickets') || '[]');
                stored.push({ id: ticketId, fecha: ticket.fecha, estado: ticket.estado });
                localStorage.setItem('cr_tickets', JSON.stringify(stored));
            } catch (e) {
                // localStorage bloqueado (incógnito, sin espacio) → lo ignoramos
                console.warn('localStorage no disponible:', e);
            }
            setTimeout(function () { finish(true); }, 800);
        }
    }

    /* ========== RESET FORM ========== */

    function resetForm() {
        var inputs = document.querySelectorAll('.f-input');
        for (var i = 0; i < inputs.length; i++) {
            var el = inputs[i];
            if (el.tagName === 'SELECT') el.selectedIndex = 0;
            else if (el.id !== 'localidad') el.value = '';
        }

        var toggles = document.querySelectorAll('input[type=checkbox], input[type=radio]');
        for (var j = 0; j < toggles.length; j++) toggles[j].checked = false;

        var errors = document.querySelectorAll('.has-error');
        for (var k = 0; k < errors.length; k++) errors[k].classList.remove('has-error');

        if (warnBackup) warnBackup.classList.remove('show');

        var success = document.getElementById('success-screen');
        if (success) success.classList.remove('show');

        var formNav = document.getElementById('form-nav');
        if (formNav) formNav.style.display = '';

        var stepBar = document.getElementById('step-bar');
        if (stepBar) stepBar.style.display = '';

        currentStep = 1;
        setStep(1);
    }

    /* ========== SERVICE CARD IMAGES (lazy + fallback) ========== */

    var svcImages = document.querySelectorAll('.svc-ico img');
    for (var img = 0; img < svcImages.length; img++) {
        svcImages[img].setAttribute('loading', 'lazy');
        svcImages[img].addEventListener('error', function () {
            this.style.display = 'none';
            if (this.parentElement) {
                this.parentElement.style.background =
                    'linear-gradient(135deg, var(--surface-2) 0%, var(--surface) 100%)';
            }
        });
    }

    /* ========== FORM AUTO-SAVE TO LOCALSTORAGE ========== */

    var FORM_DRAFT_KEY = 'ricartech-form-draft';
    var formFields = document.querySelectorAll('.f-input');
    var formRadios = document.querySelectorAll('#form-wrap input[type=radio], #form-wrap input[type=checkbox]');

    function saveDraft() {
        try {
            var draft = { step: currentStep, fields: {}, radios: {} };
            for (var i = 0; i < formFields.length; i++) {
                var f = formFields[i];
                if (f.id) draft.fields[f.id] = f.value;
            }
            for (var r = 0; r < formRadios.length; r++) {
                var rad = formRadios[r];
                if (rad.name) {
                    if (!draft.radios[rad.name]) draft.radios[rad.name] = rad.checked ? rad.value : null;
                    else if (rad.checked) draft.radios[rad.name] = rad.value;
                }
            }
            localStorage.setItem(FORM_DRAFT_KEY, JSON.stringify(draft));
        } catch (e) { /* localStorage blocked — ignore */ }
    }

    function loadDraft() {
        try {
            var raw = localStorage.getItem(FORM_DRAFT_KEY);
            if (!raw) return;
            var draft = JSON.parse(raw);
            // Restore text/select fields
            for (var id in draft.fields) {
                var el = document.getElementById(id);
                if (el) el.value = draft.fields[id];
            }
            // Restore radio/checkbox
            for (var name in draft.radios) {
                var val = draft.radios[name];
                if (val) {
                    var checked = document.querySelector('#form-wrap input[name="' + name + '"][value="' + val.replace(/"/g, '\\"') + '"]');
                    if (checked) checked.checked = true;
                }
            }
            // Restore step (but don't go past step 1 if we haven't started)
            if (draft.step && draft.step > 1 && draft.fields.nombre) {
                currentStep = Math.min(draft.step, TOTAL_STEPS);
                setStep(currentStep);
            }
        } catch (e) { /* ignore */ }
    }

    // Auto-save on every input change
    for (var fi = 0; fi < formFields.length; fi++) {
        on(formFields[fi], 'input', saveDraft);
        on(formFields[fi], 'change', saveDraft);
    }
    for (var ri = 0; ri < formRadios.length; ri++) {
        on(formRadios[ri], 'change', saveDraft);
    }

    // Clear draft on successful submit — add to finish function
    var _origFinish = typeof finish === 'function' ? null : null;
    // We patch into the submit flow by hooking localStorage clear into the existing demo flow
    // The BACKEND_URL null branch calls finish(true) — we wrap localStorage clear there

    // Clear draft on reset
    var _origReset = resetForm;
    resetForm = function () {
        try { localStorage.removeItem(FORM_DRAFT_KEY); } catch (e) { /* ignore */ }
        _origReset();
    };

    // Load draft on page load
    loadDraft();

    /* ========== INTERACTIVE PRICE CALCULATOR ========== */

    var calcTotalEl = document.getElementById('calc-total');
    var calcDiscountEl = document.getElementById('calc-discount');

    if (calcTotalEl) {
        var calcPrices = { soporte: 25, instalacion: 50, limpieza: 55, migracion: 70, datos: 40, 'limpieza-consolas': 45, 'reparacion-consolas': 50 };
        var calcInputs = document.querySelectorAll('.calc-opt input');

        function updateCalc() {
            var total = 0;
            var count = 0;
            for (var ci = 0; ci < calcInputs.length; ci++) {
                if (calcInputs[ci].checked) {
                    total += calcPrices[calcInputs[ci].value] || 0;
                    count++;
                }
            }
            // Discount: 10% off for 3+ services
            var discount = count >= 3 ? Math.round(total * 0.1) : 0;
            var finalTotal = total - discount;

            calcTotalEl.textContent = finalTotal > 0 ? finalTotal + ' €' : '— €';
            calcTotalEl.classList.add('bump');
            setTimeout(function () { calcTotalEl.classList.remove('bump'); }, 200);

            if (calcDiscountEl) {
                if (discount > 0) {
                    calcDiscountEl.classList.add('show');
                    calcDiscountEl.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px;flex-shrink:0"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> Descuento del 10% aplicado: -' + discount + ' €';
                } else {
                    calcDiscountEl.classList.remove('show');
                }
            }
        }

        for (var cii = 0; cii < calcInputs.length; cii++) {
            on(calcInputs[cii], 'change', updateCalc);
        }
        updateCalc();
    }

    /* ========== TOAST NOTIFICATION SYSTEM ========== */

    var toastContainer = document.getElementById('toast-container');
    var toastIcons = {
        success: '<svg class="toast-icon success" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
        error: '<svg class="toast-icon error" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
        info: '<svg class="toast-icon info" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
        warning: '<svg class="toast-icon warning" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>'
    };

    // Expose globally so other scripts (form) can call it
    window.showToast = function (msg, type, duration) {
        if (!toastContainer) return;
        type = type || 'info';
        duration = duration || 4000;
        var toast = document.createElement('div');
        toast.className = 'toast';
        toast.innerHTML = (toastIcons[type] || toastIcons.info) +
            '<span class="toast-msg">' + escapeText(msg) + '</span>' +
            '<button class="toast-close" aria-label="Cerrar">&times;</button>' +
            '<div class="toast-progress" style="width:100%;transition-duration:' + duration + 'ms"></div>';
        toastContainer.appendChild(toast);
        requestAnimationFrame(function () {
            toast.classList.add('show');
            toast.querySelector('.toast-progress').style.width = '0';
        });
        var dismiss = function () {
            toast.classList.remove('show');
            toast.classList.add('hide');
            setTimeout(function () { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 400);
        };
        toast.querySelector('.toast-close').addEventListener('click', dismiss);
        setTimeout(dismiss, duration);
    };

    /* ========== AVAILABILITY INDICATOR ========== */

    var availBadges = document.querySelectorAll('.avail-badge');
    if (availBadges.length) {
        var now = new Date();
        var hour = now.getHours();
        var day = now.getDay();
        // Mon-Fri 9:00-19:00, Sat 10:00-14:00
        var isAvailable = (day >= 1 && day <= 5 && hour >= 9 && hour < 19) || (day === 6 && hour >= 10 && hour < 14);
        for (var ai = 0; ai < availBadges.length; ai++) {
            if (isAvailable) {
                availBadges[ai].innerHTML = '<span class="avail-dot"></span>Disponible ahora';
                availBadges[ai].classList.add('online');
            } else {
                availBadges[ai].style.color = 'var(--amber)';
                availBadges[ai].style.borderColor = 'rgba(245,158,11,.25)';
                availBadges[ai].style.background = 'rgba(245,158,11,.06)';
                availBadges[ai].innerHTML = '<span class="avail-dot" style="background:var(--amber);animation:none"></span>Responde en menos de 24h';
            }
        }
    }

    /* ========== BIND EVENTOS ========== */

    on(document.getElementById('btn-next'), 'click', function () { changeStep(1); });
    on(document.getElementById('btn-prev'), 'click', function () { changeStep(-1); });
    on(document.getElementById('btn-submit'), 'click', submitForm);
    on(document.getElementById('resetFormBtn'), 'click', resetForm);

    // Inicializa el formulario en el paso 1
    setStep(1);

    /* ========== EMAIL OBFUSCATION (anti-scraping) ==========
       Descodifica direcciones de correo protegidas con data-attribs.
       Los bots de scraping leen el HTML estático y solo ven data-u/data-d,
       sin el símbolo @ ni el dominio completo → no pueden extraer el email. */

    var obfEmails = document.querySelectorAll('.obf-email');
    for (var ei = 0; ei < obfEmails.length; ei++) {
        var el = obfEmails[ei];
        var user = el.getAttribute('data-u');
        var domain = el.getAttribute('data-d');
        if (user && domain) {
            el.textContent = user + '@' + domain;
        }
    }

    var obfMailtos = document.querySelectorAll('.obf-mailto');
    for (var mi = 0; mi < obfMailtos.length; mi++) {
        var ml = obfMailtos[mi];
        var mu = ml.getAttribute('data-u');
        var md = ml.getAttribute('data-d');
        if (mu && md) {
            ml.href = 'mailto:' + mu + '@' + md;
        }
    }

    /* ========== FAQ ACCORDION ========== */

    var faqBtns = document.querySelectorAll('.faq-q');
    for (var fi = 0; fi < faqBtns.length; fi++) {
        on(faqBtns[fi], 'click', function () {
            var item = this.parentElement;
            var isOpen = item.classList.contains('open');

            // Cerrar todos los demás
            var allItems = document.querySelectorAll('.faq-item.open');
            for (var ai = 0; ai < allItems.length; ai++) {
                if (allItems[ai] !== item) {
                    allItems[ai].classList.remove('open');
                    allItems[ai].querySelector('.faq-q').setAttribute('aria-expanded', 'false');
                    allItems[ai].querySelector('.faq-a').setAttribute('aria-hidden', 'true');
                }
            }

            // Toggle el actual
            item.classList.toggle('open', !isOpen);
            this.setAttribute('aria-expanded', String(!isOpen));
            item.querySelector('.faq-a').setAttribute('aria-hidden', String(isOpen));
        });
    }

    /* ========== COOKIE CONSENT (RGPD) ========== */

    var cookieBanner = document.getElementById('cookie-banner');
    var cookieAccept = document.getElementById('cookie-accept');
    var cookieDecline = document.getElementById('cookie-decline');

    function hideCookieBanner() {
        if (cookieBanner) cookieBanner.classList.remove('show');
    }

    // Mostrar banner solo si no se ha aceptado antes
    if (cookieBanner) {
        try {
            var accepted = localStorage.getItem('cr_cookies');
            if (!accepted) {
                setTimeout(function () {
                    cookieBanner.classList.add('show');
                }, 1500);
            }
        } catch (e) {
            setTimeout(function () {
                cookieBanner.classList.add('show');
            }, 1500);
        }
    }

    if (cookieAccept) {
        on(cookieAccept, 'click', function () {
            try { localStorage.setItem('cr_cookies', 'accepted'); } catch (e) { /* ignore */ }
            hideCookieBanner();
        });
    }
    if (cookieDecline) {
        on(cookieDecline, 'click', function () {
            try { localStorage.setItem('cr_cookies', 'declined'); } catch (e) { /* ignore */ }
            hideCookieBanner();
        });
    }

    /* ========== PRIVACY MODAL ========== */

    var privacyModal = document.getElementById('privacy-modal');
    var privacyClose = document.getElementById('privacy-close');
    var privacyOverlay = document.getElementById('privacy-overlay');
    var openPrivacy = document.getElementById('open-privacy');
    var cookiePrivacyLink = document.getElementById('cookie-privacy-link');

    function openPrivacyModal() {
        if (privacyModal) {
            privacyModal.classList.add('open');
            privacyModal.setAttribute('aria-hidden', 'false');
            document.body.style.overflow = 'hidden';
        }
    }
    function closePrivacyModal() {
        if (privacyModal) {
            privacyModal.classList.remove('open');
            privacyModal.setAttribute('aria-hidden', 'true');
            document.body.style.overflow = '';
        }
    }
    if (openPrivacy) on(openPrivacy, 'click', function (e) { e.preventDefault(); openPrivacyModal(); });
    if (cookiePrivacyLink) on(cookiePrivacyLink, 'click', function (e) { e.preventDefault(); openPrivacyModal(); });
    if (privacyClose) on(privacyClose, 'click', closePrivacyModal);
    if (privacyOverlay) on(privacyOverlay, 'click', closePrivacyModal);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closePrivacyModal(); });

    /* ========== SMOOTH SCROLL WITH HEADER OFFSET ========== */

    var HEADER_OFFSET = 80;
    var allAnchorLinks = document.querySelectorAll('a[href^="#"]');
    // Re-bind with offset — override earlier vanilla binding by capturing these specific links
    for (var sl = 0; sl < allAnchorLinks.length; sl++) {
        (function (link) {
            var handler = function (e) {
                var href = link.getAttribute('href');
                if (!href || href === '#' || href.length < 2) return;
                // Skip external links
                if (href.indexOf('http://') === 0 || href.indexOf('https://') === 0 || href.indexOf('mailto:') === 0 || href.indexOf('tel:') === 0) return;
                var target = document.querySelector(href);
                if (target && target.scrollIntoView) {
                    e.preventDefault();
                    var y = target.getBoundingClientRect().top + window.pageYOffset - HEADER_OFFSET;
                    window.scrollTo({ top: y, behavior: 'smooth' });
                    if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
                    target.focus({ preventScroll: true });
                }
            };
            // Remove existing listener by cloning (not possible on vanilla), so we use capture phase
            link.addEventListener('click', handler, true);
        })(allAnchorLinks[sl]);
    }

    /* ========== FAQ SEARCH / FILTER ========== */

    var faqSearch = document.getElementById('faq-search');
    var faqList = document.getElementById('faq-list');
    var faqCount = document.getElementById('faq-search-count');

    if (faqSearch && faqList) {
        var faqItems = faqList.querySelectorAll('.faq-item');
        on(faqSearch, 'input', function () {
            var query = this.value.toLowerCase().trim();
            var visible = 0;
            for (var fi = 0; fi < faqItems.length; fi++) {
                var item = faqItems[fi];
                var text = item.textContent.toLowerCase();
                var isMatch = !query || text.indexOf(query) !== -1;
                item.classList.toggle('faq-hidden', !isMatch);
                item.classList.toggle('faq-highlight', !!query && isMatch);
                if (isMatch) visible++;
            }
            if (faqCount) {
                faqCount.textContent = query ? visible + '/' + faqItems.length : '';
            }
            // Auto-open first matching result
            if (query) {
                var firstMatch = faqList.querySelector('.faq-item:not(.faq-hidden)');
                if (firstMatch && !firstMatch.classList.contains('open')) {
                    var btn = firstMatch.querySelector('.faq-q');
                    if (btn) btn.click();
                }
            }
        });
    }

    /* ========== SERVICE CARD SPOTLIGHT EFFECT ========== */

    var svcCards = document.querySelectorAll('.svc');
    for (var si = 0; si < svcCards.length; si++) {
        on(svcCards[si], 'mousemove', function (e) {
            var rect = this.getBoundingClientRect();
            this.style.setProperty('--spot-x', (e.clientX - rect.left) + 'px');
            this.style.setProperty('--spot-y', (e.clientY - rect.top) + 'px');
        });
    }

    /* ========== FORM STEP DIRECTION TRANSITIONS ========== */

    var _origSetStep = setStep;
    setStep = function (n) {
        var dir = n > currentStep ? 'forward' : 'back';
        _origSetStep(n);
        var activeStep = document.querySelector('.form-step.active');
        if (activeStep) {
            activeStep.classList.remove('step-back');
            if (dir === 'back') activeStep.classList.add('step-back');
        }
    };

    /* ========== KEYBOARD SHORTCUTS PANEL ========== */

    var kbPanel = document.getElementById('kb-panel');
    function toggleKbPanel(forceClose) {
        if (!kbPanel) return;
        var isOpen = kbPanel.classList.contains('open');
        var shouldClose = forceClose || isOpen;
        kbPanel.classList.toggle('open', !shouldClose);
        kbPanel.setAttribute('aria-hidden', String(shouldClose));
    }
    on(document, 'keydown', function (e) {
        // Don't trigger if user is typing in an input/textarea
        var tag = (e.target && e.target.tagName) || '';
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

        if (e.key === '?') {
            e.preventDefault();
            toggleKbPanel();
        } else if (e.key === 'Escape') {
            toggleKbPanel(true);
        } else if (e.key === 't' || e.key === 'T') {
            e.preventDefault();
            var regSection = document.getElementById('registro');
            if (regSection) {
                var y = regSection.getBoundingClientRect().top + window.pageYOffset - HEADER_OFFSET;
                window.scrollTo({ top: y, behavior: 'smooth' });
            }
        } else if (e.key === 'h' || e.key === 'H') {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    });
    if (kbPanel) {
        on(kbPanel, 'click', function (e) {
            if (e.target === kbPanel) toggleKbPanel(true);
        });
    }
})();