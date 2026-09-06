// ============================================================
// Ricartech Dashboard — Autenticación
// ============================================================

(function () {
    'use strict';

    var loginScreen = document.getElementById('login-screen');
    var loginForm = document.getElementById('login-form');
    var loginEmail = document.getElementById('login-email');
    var loginPassword = document.getElementById('login-password');
    var loginError = document.getElementById('login-error');
    var loginBtn = document.getElementById('login-btn');
    var app = document.getElementById('app');
    var logoutBtn = document.getElementById('logout-btn');

    // Inicializar Supabase
    var db = null;
    if (typeof SUPABASE_URL !== 'undefined' && typeof SUPABASE_ANON_KEY !== 'undefined' &&
        SUPABASE_URL !== 'https://TU-PROYECTO.supabase.co' && SUPABASE_ANON_KEY !== 'TU-ANON-KEY-AQUI') {
        db = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        window._db = db;
    }

    function showError(msg) {
        loginError.textContent = msg;
        loginError.classList.add('show');
    }

    function hideError() {
        loginError.classList.remove('show');
        loginError.textContent = '';
    }

    function showDashboard() {
        loginScreen.classList.add('hidden');
        app.classList.remove('hidden');
        // Disparar evento para que dashboard.js se inicialice
        window.dispatchEvent(new Event('auth-ready'));
    }

    function showLogin() {
        loginScreen.classList.remove('hidden');
        app.classList.add('hidden');
    }

    // Login
    if (loginForm) {
        loginForm.addEventListener('submit', async function (e) {
            e.preventDefault();
            hideError();

            if (!db) {
                showError('Supabase no configurado. Edita dashboard/js/config.js');
                return;
            }

            var email = loginEmail.value.trim();
            var password = loginPassword.value;

            if (!email || !password) {
                showError('Introduce email y contraseña.');
                return;
            }

            loginBtn.disabled = true;
            loginBtn.textContent = 'Entrando…';

            try {
                var { data, error } = await db.auth.signInWithPassword({
                    email: email,
                    password: password
                });

                if (error) {
                    showError('Credenciales incorrectas.');
                    loginBtn.disabled = false;
                    loginBtn.textContent = 'Iniciar sesión';
                    return;
                }

                showDashboard();
            } catch (err) {
                showError('Error de conexión. Inténtalo de nuevo.');
                loginBtn.disabled = false;
                loginBtn.textContent = 'Iniciar sesión';
            }
        });
    }

    // Logout
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async function () {
            if (db) {
                await db.auth.signOut({ scope: 'local' });
            }
            showLogin();
            loginEmail.value = '';
            loginPassword.value = '';
        });
    }

    // Verificar sesión existente al cargar
    if (db) {
        db.auth.getSession().then(function (result) {
            var session = result.data.session;
            if (session) {
                showDashboard();
            }
        });
    }

    // Escuchar cambios de auth
    if (db) {
        db.auth.onAuthStateChange(function (event, session) {
            if (event === 'SIGNED_OUT') {
                showLogin();
            }
        });
    }
})();
