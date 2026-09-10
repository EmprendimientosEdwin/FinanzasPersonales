/* ============================================================
   FINANZASPERSONALES
   APP.JS — PRO MAX
   ============================================================ */

"use strict";


/* ============================================================
   1. SUPABASE
   ============================================================ */

const SUPABASE_URL =
    "https://xwkxgrktsdejoaqnbiwk.supabase.co";

const SUPABASE_ANON_KEY =
    "sb_publishable_DYl24WF6mNud6QsS4nhhYA_53ohH191";

let supabaseClient = null;

if (
    window.supabase &&
    SUPABASE_URL &&
    SUPABASE_ANON_KEY
) {
    try {
        supabaseClient =
            window.supabase.createClient(
                SUPABASE_URL,
                SUPABASE_ANON_KEY
            );

        console.log(
            "✅ Supabase conectado correctamente"
        );
    } catch (error) {
        console.error(
            "❌ Error inicializando Supabase:",
            error
        );
    }
} else {
    console.error(
        "❌ Supabase no está disponible."
    );
}


/* ============================================================
   2. ESTADO GLOBAL
   ============================================================ */

let currentUser = null;
let currentProfile = null;

let currentSection = "dashboard";

let allUsers = [];

let charts = {
    flow: null,
    expenses: null
};

let financeData = {
    ingresos: [],
    salidas: [],
    metas: []
};

let isInitializing = false;


/* ============================================================
   3. DOM PRINCIPAL
   ============================================================ */

const loginScreen =
    document.getElementById(
        "loginScreen"
    );

const appContainer =
    document.getElementById(
        "appContainer"
    );

const loginForm =
    document.getElementById(
        "loginForm"
    );

const loginEmail =
    document.getElementById(
        "loginEmail"
    );

const loginPassword =
    document.getElementById(
        "loginPassword"
    );

const passwordToggle =
    document.getElementById(
        "passwordToggle"
    );

const logoutButton =
    document.getElementById(
        "logoutBtn"
    );

const changePasswordButton =
    document.getElementById(
        "changePasswordBtn"
    );

const sidebar =
    document.getElementById(
        "sidebar"
    );

const sidebarOverlay =
    document.getElementById(
        "sidebarOverlay"
    );

const mobileMenuButton =
    document.getElementById(
        "mobileMenuBtn"
    );

const sidebarCloseButton =
    document.getElementById(
        "sidebarClose"
    );


/* ============================================================
   4. UTILIDADES
   ============================================================ */

function $(selector) {
    return document.querySelector(
        selector
    );
}


function getElement(...selectors) {
    for (
        const selector of selectors
    ) {
        if (!selector) continue;

        const element =
            typeof selector ===
            "string"
                ? document.querySelector(
                      selector
                  )
                : selector;

        if (element) {
            return element;
        }
    }

    return null;
}


function setText(
    value,
    ...selectors
) {
    const element =
        getElement(...selectors);

    if (!element) return;

    element.textContent =
        value ??
        "";
}


function escapeHTML(value) {
    if (
        value === null ||
        value === undefined
    ) {
        return "";
    }

    return String(value)
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );
}


function debounce(
    callback,
    delay = 300
) {
    let timeout;

    return (...args) => {
        clearTimeout(timeout);

        timeout =
            setTimeout(
                () =>
                    callback(
                        ...args
                    ),
                delay
            );
    };
}


/* ============================================================
   5. MONEDA
   ============================================================ */

function getCurrency() {
    return (
        currentProfile?.moneda ||
        "PEN"
    );
}


function formatMoney(value) {
    const amount =
        Number(value) || 0;

    try {
        return new Intl.NumberFormat(
            "es-PE",
            {
                style: "currency",
                currency:
                    getCurrency(),
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }
        ).format(amount);
    } catch {
        return `S/ ${amount.toFixed(
            2
        )}`;
    }
}


function formatDate(date) {
    if (!date) return "—";

    try {
        const value = String(date);
        const normalized =
            /^\d{4}-\d{2}-\d{2}$/.test(value)
                ? `${value}T00:00:00`
                : date;

        return new Intl.DateTimeFormat(
            "es-PE",
            {
                day: "2-digit",
                month: "short",
                year: "numeric"
            }
        ).format(
            new Date(normalized)
        );
    } catch {
        return String(date);
    }
}


function formatDateInput(date) {
    if (!date) return "";

    const value = String(date);

    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return value;
    }

    const d =
        new Date(date);

    if (Number.isNaN(d.getTime())) {
        return "";
    }

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}


/* ============================================================
   6. TOAST SYSTEM
   ============================================================ */

function showToast(
    message,
    type = "info",
    duration = 4000
) {
    let container =
        document.getElementById(
            "toast-container"
        );

    if (!container) {
        container =
            document.createElement(
                "div"
            );

        container.id =
            "toast-container";

        container.style.cssText = `
            position:fixed;
            top:20px;
            right:20px;
            z-index:999999;
            display:flex;
            flex-direction:column;
            gap:10px;
            width:min(380px,calc(100vw - 30px));
        `;

        document.body.appendChild(
            container
        );
    }

    const icons = {
        success:
            "fa-circle-check",
        error:
            "fa-circle-xmark",
        warning:
            "fa-triangle-exclamation",
        info:
            "fa-circle-info"
    };

    const colors = {
        success:
            "#16a34a",
        error:
            "#dc2626",
        warning:
            "#d97706",
        info:
            "#2563eb"
    };

    const toast =
        document.createElement(
            "div"
        );

    toast.style.cssText = `
        background:${colors[type] || colors.info};
        color:#fff;
        padding:14px 16px;
        border-radius:16px;
        box-shadow:0 18px 50px rgba(0,0,0,.20);
        font-size:14px;
        animation:finanzasToastIn .3s ease;
    `;

    toast.innerHTML = `
        <div style="
            display:flex;
            align-items:center;
            gap:12px;
        ">
            <i class="
                fa-solid
                ${
                    icons[type] ||
                    icons.info
                }
            "></i>

            <span style="
                flex:1;
                line-height:1.45;
            ">
                ${escapeHTML(
                    message
                )}
            </span>

            <button
                type="button"
                aria-label="Cerrar"
                style="
                    border:0;
                    background:transparent;
                    color:inherit;
                    font-size:20px;
                    cursor:pointer;
                    opacity:.8;
                "
            >
                ×
            </button>
        </div>
    `;

    const close =
        toast.querySelector(
            "button"
        );

    close?.addEventListener(
        "click",
        () => toast.remove()
    );

    container.appendChild(
        toast
    );

    setTimeout(() => {
        if (!toast.isConnected) {
            return;
        }

        toast.style.opacity =
            "0";

        toast.style.transform =
            "translateX(30px)";

        toast.style.transition =
            ".3s ease";

        setTimeout(
            () => toast.remove(),
            300
        );
    }, duration);
}


/* ============================================================
   7. ESTILOS RUNTIME
   ============================================================ */

function injectRuntimeStyles() {
    if (
        document.getElementById(
            "finanzas-pro-runtime"
        )
    ) {
        return;
    }

    const style =
        document.createElement(
            "style"
        );

    style.id =
        "finanzas-pro-runtime";

    style.textContent = `
        @keyframes finanzasToastIn {
            from {
                opacity:0;
                transform:translateX(30px);
            }
            to {
                opacity:1;
                transform:translateX(0);
            }
        }

        @keyframes finanzasSpin {
            to {
                transform:rotate(360deg);
            }
        }

        .finanzas-loading {
            display:flex;
            justify-content:center;
            align-items:center;
            gap:10px;
            padding:35px;
            opacity:.7;
        }

        .finanzas-spinner {
            width:18px;
            height:18px;
            border:2px solid currentColor;
            border-right-color:transparent;
            border-radius:50%;
            animation:finanzasSpin .7s linear infinite;
        }

        .finanzas-empty {
            text-align:center;
            padding:45px 20px;
            opacity:.65;
        }

        .finance-positive {
            color:#16a34a;
            font-weight:800;
        }

        .finance-negative {
            color:#dc2626;
            font-weight:800;
        }

        .finance-actions {
            display:flex;
            align-items:center;
            gap:6px;
        }

        .finance-action {
            width:34px;
            height:34px;
            border:0;
            border-radius:10px;
            cursor:pointer;
            display:flex;
            align-items:center;
            justify-content:center;
            transition:.2s ease;
        }

        .finance-action:hover {
            transform:translateY(-2px);
        }

        .finance-edit {
            background:rgba(37,99,235,.10);
            color:#2563eb;
        }

        .finance-delete {
            background:rgba(220,38,38,.10);
            color:#dc2626;
        }

        .finance-modal-backdrop {
            position:fixed;
            inset:0;
            z-index:99990;
            background:rgba(15,23,42,.55);
            backdrop-filter:blur(8px);
            display:flex;
            align-items:center;
            justify-content:center;
            padding:20px;
        }

        .finance-modal {
            width:min(560px,100%);
            max-height:90vh;
            overflow:auto;
            background:var(--card-bg,#fff);
            color:var(--text-color,#111827);
            border-radius:24px;
            box-shadow:0 30px 100px rgba(0,0,0,.25);
            padding:25px;
        }

        .finance-modal-header {
            display:flex;
            justify-content:space-between;
            align-items:center;
            gap:15px;
            margin-bottom:20px;
        }

        .finance-modal-close {
            width:38px;
            height:38px;
            border:0;
            border-radius:12px;
            cursor:pointer;
            background:rgba(100,116,139,.10);
            font-size:20px;
        }

        .finance-form-grid {
            display:grid;
            grid-template-columns:repeat(2,minmax(0,1fr));
            gap:15px;
        }

        .finance-form-group {
            display:flex;
            flex-direction:column;
            gap:7px;
        }

        .finance-form-group.full {
            grid-column:1/-1;
        }

        .finance-form-group label {
            font-size:13px;
            font-weight:700;
        }

        .finance-form-group input,
        .finance-form-group select,
        .finance-form-group textarea {
            width:100%;
            padding:12px 14px;
            border:1px solid rgba(148,163,184,.35);
            border-radius:12px;
            background:transparent;
            color:inherit;
            outline:none;
        }

        .finance-form-group textarea {
            min-height:100px;
            resize:vertical;
        }

        .finance-modal-footer {
            display:flex;
            justify-content:flex-end;
            gap:10px;
            margin-top:22px;
        }

        .finance-modal-footer button {
            padding:11px 18px;
            border:0;
            border-radius:12px;
            cursor:pointer;
            font-weight:700;
        }

        .finance-btn-primary {
            background:#2563eb;
            color:#fff;
        }

        .finance-btn-secondary {
            background:rgba(100,116,139,.12);
            color:inherit;
        }

        @media(max-width:600px) {
            .finance-modal-backdrop {
                align-items:flex-end;
                padding:0;
            }

            .finance-form-grid {
                grid-template-columns:1fr;
            }

            .finance-form-group.full {
                grid-column:auto;
            }

            .finance-modal {
                width:100%;
                max-height:92dvh;
                padding:20px 16px calc(20px + env(safe-area-inset-bottom));
                border-radius:22px 22px 0 0;
            }

            .finance-modal-header {
                align-items:flex-start;
            }

            .finance-modal-footer {
                flex-direction:column-reverse;
                gap:10px;
            }

            .finance-modal-footer button {
                width:100%;
                min-height:48px;
            }
        }
    `;

    document.head.appendChild(
        style
    );
}


/* ============================================================
   8. AUTH
   ============================================================ */

function showLogin() {
    currentUser = null;
    currentProfile = null;

    if (loginScreen) {
        loginScreen.style.display =
            "";

        loginScreen.classList.remove(
            "hidden"
        );
    }

    if (appContainer) {
        appContainer.style.display =
            "none";

        appContainer.classList.add(
            "hidden"
        );
    }
}


function showApp() {
    if (loginScreen) {
        loginScreen.style.display =
            "none";

        loginScreen.classList.add(
            "hidden"
        );
    }

    if (appContainer) {
        appContainer.style.display =
            "";

        appContainer.classList.remove(
            "hidden"
        );
    }
}


async function checkSession() {
    if (!supabaseClient) {
        showLogin();

        return;
    }

    try {
        const {
            data,
            error
        } =
            await supabaseClient.auth.getSession();

        if (error) {
            console.error(
                "❌ Error sesión:",
                error
            );

            showLogin();

            return;
        }

        if (
            data?.session?.user
        ) {
            currentUser =
                data.session.user;

            console.log(
                "👤 Sesión encontrada:",
                currentUser.email
            );

            await initializeAuthenticatedApp();
        } else {
            showLogin();
        }
    } catch (error) {
        console.error(
            "❌ Error verificando sesión:",
            error
        );

        showLogin();
    }
}


async function handleLogin(
    event
) {
    event.preventDefault();

    if (!supabaseClient) {
        showToast(
            "Supabase no está disponible.",
            "error"
        );

        return;
    }

    const email =
        loginEmail?.value
            ?.trim();

    const password =
        loginPassword?.value;

    if (!email || !password) {
        showToast(
            "Ingresa tu correo y contraseña.",
            "warning"
        );

        return;
    }

    const button =
        loginForm?.querySelector(
            'button[type="submit"]'
        );

    const originalHTML =
        button?.innerHTML;

    if (button) {
        button.disabled =
            true;

        button.innerHTML =
            "Iniciando sesión...";
    }

    try {
        const {
            data,
            error
        } =
            await supabaseClient.auth.signInWithPassword(
                {
                    email,
                    password
                }
            );

        if (error) {
            console.error(
                "❌ Login:",
                error
            );

            showToast(
                getAuthErrorMessage(
                    error
                ),
                "error"
            );

            return;
        }

        currentUser =
            data.user;

        showToast(
            "Bienvenido a FinanzasPersonales.",
            "success"
        );

        await initializeAuthenticatedApp();
    } catch (error) {
        console.error(
            "❌ Login inesperado:",
            error
        );

        showToast(
            "Ocurrió un error al iniciar sesión.",
            "error"
        );
    } finally {
        if (button) {
            button.disabled =
                false;

            button.innerHTML =
                originalHTML ||
                "Iniciar sesión";
        }
    }
}


function getAuthErrorMessage(
    error
) {
    const message =
        String(
            error?.message || ""
        ).toLowerCase();

    if (
        message.includes(
            "invalid login credentials"
        )
    ) {
        return "Correo o contraseña incorrectos.";
    }

    if (
        message.includes(
            "email not confirmed"
        )
    ) {
        return "Tu correo todavía no ha sido confirmado.";
    }

    if (
        message.includes(
            "too many requests"
        )
    ) {
        return "Demasiados intentos. Espera unos minutos.";
    }

    return (
        error?.message ||
        "No se pudo iniciar sesión."
    );
}


async function logout() {
    if (!supabaseClient) return;

    try {
        const {
            error
        } =
            await supabaseClient.auth.signOut();

        if (error) {
            console.error(
                "❌ Logout:",
                error
            );

            showToast(
                "No se pudo cerrar sesión.",
                "error"
            );

            return;
        }

        currentUser = null;
        currentProfile = null;

        showLogin();

        showToast(
            "Sesión cerrada correctamente.",
            "success"
        );
    } catch (error) {
        console.error(
            "❌ Logout:",
            error
        );
    }
}


/* ============================================================
   9. PASSWORD LOGIN
   ============================================================ */

function setupPasswordToggle() {
    if (
        !passwordToggle ||
        !loginPassword
    ) {
        return;
    }

    passwordToggle.addEventListener(
        "click",
        () => {
            const visible =
                loginPassword.type ===
                "text";

            loginPassword.type =
                visible
                    ? "password"
                    : "text";

            const icon =
                passwordToggle.querySelector(
                    "i"
                );

            if (icon) {
                icon.className =
                    visible
                        ? "fa-solid fa-eye"
                        : "fa-solid fa-eye-slash";
            }
        }
    );
}


/* ============================================================
   10. PERFIL
   ============================================================ */

async function loadCurrentProfile() {
    if (!currentUser?.id) {
        return null;
    }

    try {
        const {
            data,
            error
        } =
            await supabaseClient
                .from("profiles")
                .select("*")
                .eq(
                    "id",
                    currentUser.id
                )
                .maybeSingle();

        if (error) {
            console.error(
                "❌ Perfil:",
                error
            );

            return null;
        }

        currentProfile =
            data;

        console.log(
            "✅ Perfil cargado:",
            currentProfile
        );

        return data;
    } catch (error) {
        console.error(
            "❌ Perfil inesperado:",
            error
        );

        return null;
    }
}


function isAdmin() {
    const role =
        String(
            currentProfile?.rol ||
                ""
        )
            .trim()
            .toLowerCase();

    return [
        "admin",
        "administrador",
        "superadmin"
    ].includes(role);
}


function isActiveProfile() {
    const status =
        String(
            currentProfile?.estado ||
                "activo"
        )
            .trim()
            .toLowerCase();

    return ![
        "inactivo",
        "bloqueado",
        "suspendido",
        "disabled"
    ].includes(status);
}


/* ============================================================
   11. APP AUTHENTICATED
   ============================================================ */

async function initializeAuthenticatedApp() {
    if (
        isInitializing ||
        !currentUser
    ) {
        return;
    }

    isInitializing = true;

    try {
        const profile =
            await loadCurrentProfile();

        if (!profile) {
            showToast(
                "No existe un perfil asociado a tu cuenta.",
                "error"
            );

            await supabaseClient.auth.signOut();

            showLogin();

            return;
        }

        if (
            !isActiveProfile()
        ) {
            showToast(
                "Tu cuenta está desactivada.",
                "error"
            );

            await supabaseClient.auth.signOut();

            showLogin();

            return;
        }

        showApp();

        updateUserInterface();

        setupAdminVisibility();

        await loadDashboard();

        if (isAdmin()) {
            await loadUsers();
        }

        console.log(
            "🚀 FinanzasPersonales PRO MAX iniciado"
        );
    } finally {
        isInitializing =
            false;
    }
}


/* ============================================================
   12. UI PERFIL
   ============================================================ */

function getUserFullName() {
    const nombre =
        currentProfile?.nombre ||
        currentProfile?.usuario ||
        currentUser?.email?.split(
            "@"
        )[0] ||
        "Usuario";

    const apellido =
        currentProfile?.apellido ||
        "";

    return `${nombre} ${apellido}`.trim();
}


function getUserFirstName() {
    return (
        currentProfile?.nombre ||
        currentProfile?.usuario ||
        "Usuario"
    );
}


function getInitials() {
    const nombre =
        currentProfile?.nombre ||
        "";

    const apellido =
        currentProfile?.apellido ||
        "";

    const initials =
        `${nombre.charAt(
            0
        )}${apellido.charAt(
            0
        )}`.toUpperCase();

    return (
        initials ||
        currentUser?.email
            ?.charAt(0)
            .toUpperCase() ||
        "U"
    );
}


function updateUserInterface() {
    const fullName =
        getUserFullName();

    const firstName =
        getUserFirstName();

    const role =
        currentProfile?.rol ||
        "Usuario";

    const email =
        currentProfile?.email ||
        currentUser?.email ||
        "";

    const initials =
        getInitials();

    document
        .querySelectorAll(
            "[data-user-name]"
        )
        .forEach(
            element =>
                (element.textContent =
                    fullName)
        );

    document
        .querySelectorAll(
            "[data-user-role]"
        )
        .forEach(
            element =>
                (element.textContent =
                    role)
        );

    document
        .querySelectorAll(
            "[data-user-email]"
        )
        .forEach(
            element =>
                (element.textContent =
                    email)
        );

    document
        .querySelectorAll(
            "[data-user-initials]"
        )
        .forEach(
            element =>
                (element.textContent =
                    initials)
        );

    document
        .querySelectorAll(
            "[data-welcome-name]"
        )
        .forEach(
            element =>
                (element.textContent =
                    firstName)
        );

    document
        .querySelectorAll(
            "[data-account-role]"
        )
        .forEach(
            element =>
                (element.textContent =
                    role)
        );

    setText(
        fullName,
        "#profileName"
    );

    setText(
        role,
        "#accountRole"
    );

    setText(
        firstName,
        "#welcomeName"
    );

    setText(
        fullName,
        "#dashboardUserName"
    );

    setText(
        initials,
        "#profileInitials",
        "#topbarInitials"
    );

    setText(
        email,
        "#profileEmail"
    );
}


/* ============================================================
   13. ADMIN VISIBILITY
   ============================================================ */

function setupAdminVisibility() {
    document
        .querySelectorAll(
            "[data-admin-only]"
        )
        .forEach(element => {
            element.style.display =
                isAdmin()
                    ? ""
                    : "none";
        });

    const adminMenu =
        document.getElementById(
            "adminMenu"
        );

    if (adminMenu) {
        adminMenu.style.display =
            isAdmin()
                ? ""
                : "none";
    }
}


/* ============================================================
   14. ELIMINAR REPORTES
   ============================================================ */

function removeReportsFromUI() {
    const reportSections = [
        "reportes",
        "reports",
        "reportesSection",
        "reportsSection"
    ];

    reportSections.forEach(
        id => {
            const element =
                document.getElementById(
                    id
                );

            if (element) {
                element.remove();
            }
        }
    );

    document
        .querySelectorAll(
            '[data-section="reportes"], [data-section="reports"]'
        )
        .forEach(element =>
            element.remove()
        );
}


/* ============================================================
   15. NAVEGACIÓN
   ============================================================ */

function setupNavigation() {
    document
        .querySelectorAll(
            "[data-section]"
        )
        .forEach(item => {
            if (
                item.dataset
                    .navigationBound
            ) {
                return;
            }

            item.dataset.navigationBound =
                "true";

            item.addEventListener(
                "click",
                event => {
                    event.preventDefault();

                    const section =
                        item.dataset
                            .section;

                    if (
                        section ===
                            "reportes" ||
                        section ===
                            "reports"
                    ) {
                        showToast(
                            "Los reportes ahora están integrados en el Dashboard.",
                            "info"
                        );

                        showSection(
                            "dashboard"
                        );

                        return;
                    }

                    showSection(
                        section
                    );

                    closeSidebar();
                }
            );
        });
}


async function showSection(
    section
) {
    if (
        !section ||
        section ===
            "reportes" ||
        section ===
            "reports"
    ) {
        section =
            "dashboard";
    }

    currentSection =
        section;

    document
        .querySelectorAll(
            ".page-section"
        )
        .forEach(page => {
            const pageId =
                page.id;

            const normalized =
                pageId
                    .replace(
                        "Section",
                        ""
                    )
                    .toLowerCase();

            const target =
                section.toLowerCase();

            const active =
                normalized ===
                    target ||
                pageId ===
                    section;

            page.classList.toggle(
                "active",
                active
            );

            page.style.display =
                active
                    ? ""
                    : "none";
        });

    document
        .querySelectorAll(
            "[data-section]"
        )
        .forEach(item => {
            item.classList.toggle(
                "active",
                item.dataset
                    .section ===
                    section
            );
        });

    updatePageHeader(
        section
    );

    if (
        section ===
        "dashboard"
    ) {
        await loadDashboard();
    }

    if (
        section ===
            "metas" ||
        section ===
            "goals"
    ) {
        await loadGoalsPage();
    }

    if (
        section ===
            "usuarios" ||
        section ===
            "users" ||
        section ===
            "admin"
    ) {
        if (isAdmin()) {
            await loadUsers();
        }
    }
}


function updatePageHeader(
    section
) {
    const pages = {
        dashboard: {
            eyebrow:
                "Resumen financiero",
            title:
                "Dashboard"
        },

        ingresos: {
            eyebrow:
                "Gestión financiera",
            title:
                "Ingresos"
        },

        salidas: {
            eyebrow:
                "Gestión financiera",
            title:
                "Salidas"
        },

        metas: {
            eyebrow:
                "Planificación",
            title:
                "Metas"
        },

        usuarios: {
            eyebrow:
                "Administración",
            title:
                "Usuarios"
        },

        users: {
            eyebrow:
                "Administración",
            title:
                "Usuarios"
        },

        admin: {
            eyebrow:
                "Administración",
            title:
                "Usuarios"
        }
    };

    const data =
        pages[section] ||
        pages.dashboard;

    setText(
        data.title,
        "[data-page-title]",
        "#pageTitle"
    );

    setText(
        data.eyebrow,
        "#pageEyebrow"
    );
}


/* ============================================================
   16. SIDEBAR
   ============================================================ */

function openSidebar() {
    sidebar?.classList.add(
        "open"
    );

    sidebarOverlay?.classList.add(
        "active"
    );

    document.body.classList.add(
        "sidebar-open"
    );
}


function closeSidebar() {
    sidebar?.classList.remove(
        "open"
    );

    sidebarOverlay?.classList.remove(
        "active"
    );

    document.body.classList.remove(
        "sidebar-open"
    );
}


function setupSidebar() {
    mobileMenuButton?.addEventListener(
        "click",
        openSidebar
    );

    sidebarCloseButton?.addEventListener(
        "click",
        closeSidebar
    );

    sidebarOverlay?.addEventListener(
        "click",
        closeSidebar
    );
}


/* ============================================================
   17. TEMA
   ============================================================ */

function setupTheme() {
    const button =
        getElement(
            "[data-theme-toggle]",
            "#themeToggle"
        );

    if (!button) return;

    const saved =
        localStorage.getItem(
            "finanzas-theme"
        );

    const dark = saved !== "light";

    document.documentElement.classList.toggle(
        "dark",
        dark
    );

    document.body.classList.toggle(
        "dark",
        dark
    );

    updateThemeIcon();

    button.addEventListener(
        "click",
        () => {
            const dark =
                document.documentElement.classList.toggle(
                    "dark"
                );

            document.body.classList.toggle(
                "dark",
                dark
            );

            localStorage.setItem(
                "finanzas-theme",
                dark
                    ? "dark"
                    : "light"
            );

            updateThemeIcon();
        }
    );
}


function updateThemeIcon() {
    const dark =
        document.documentElement.classList.contains(
            "dark"
        );

    document
        .querySelectorAll(
            "[data-theme-icon]"
        )
        .forEach(icon => {
            icon.className =
                dark
                    ? "fa-solid fa-sun"
                    : "fa-solid fa-moon";
        });

    document
        .querySelectorAll(
            "[data-theme-label]"
        )
        .forEach(label => {
            label.textContent = dark
                ? "Modo claro"
                : "Modo oscuro";
        });

    getElement(
        "[data-theme-toggle]",
        "#themeToggle"
    )?.setAttribute("aria-pressed", String(dark));
}


function setupPasswordRecovery() {
    const forgotPassword =
        document.getElementById(
            "forgotPassword"
        );

    forgotPassword?.addEventListener(
        "click",
        async event => {
            event.preventDefault();

            const email = loginEmail?.value?.trim();

            if (!email) {
                showToast(
                    "Ingresa tu correo para enviarte el enlace de recuperación.",
                    "warning"
                );
                loginEmail?.focus();
                return;
            }

            try {
                const { error } =
                    await supabaseClient.auth.resetPasswordForEmail(
                        email,
                        {
                            redirectTo:
                                window.location.origin
                        }
                    );

                if (error) {
                    throw error;
                }

                showToast(
                    "Te enviamos un enlace para restablecer tu contraseña.",
                    "success"
                );
            } catch (error) {
                console.error(
                    "❌ Recuperar contraseña:",
                    error
                );

                showToast(
                    error?.message ||
                        "No se pudo enviar el correo de recuperación.",
                    "error"
                );
            }
        }
    );
}


function openChangePasswordModal() {
    if (!currentUser?.email) {
        showToast(
            "No hay una sesión activa.",
            "error"
        );
        return;
    }

    document
        .getElementById("changePasswordModal")
        ?.remove();

    const modal = document.createElement("div");
    modal.id = "changePasswordModal";
    modal.className = "finance-modal-backdrop";
    modal.innerHTML = `
        <div class="finance-modal">
            <div class="finance-modal-header">
                <div>
                    <small>Seguridad</small>
                    <h2>Cambiar contraseña</h2>
                </div>
                <button type="button" class="finance-modal-close" data-close-modal>×</button>
            </div>
            <form id="changePasswordForm">
                <div class="finance-form-grid">
                    <div class="finance-form-group full">
                        <label>Contraseña actual</label>
                        <input type="password" name="currentPassword" autocomplete="current-password" required>
                    </div>
                    <div class="finance-form-group">
                        <label>Nueva contraseña</label>
                        <input type="password" name="newPassword" autocomplete="new-password" minlength="6" required>
                    </div>
                    <div class="finance-form-group">
                        <label>Confirmar nueva contraseña</label>
                        <input type="password" name="confirmPassword" autocomplete="new-password" minlength="6" required>
                    </div>
                </div>
                <div class="finance-modal-footer">
                    <button type="button" class="finance-btn-secondary" data-close-modal>Cancelar</button>
                    <button type="submit" class="finance-btn-primary">Cambiar contraseña</button>
                </div>
            </form>
        </div>
    `;

    document.body.appendChild(modal);

    const close = () => modal.remove();
    modal.querySelectorAll("[data-close-modal]")
        .forEach(button => button.addEventListener("click", close));

    modal.addEventListener("click", event => {
        if (event.target === modal) close();
    });

    modal.querySelector("#changePasswordForm")
        ?.addEventListener("submit", async event => {
            event.preventDefault();

            const form = event.currentTarget;
            const values = Object.fromEntries(
                new FormData(form).entries()
            );

            if (values.newPassword !== values.confirmPassword) {
                showToast(
                    "La nueva contraseña y su confirmación no coinciden.",
                    "warning"
                );
                return;
            }

            const submit = form.querySelector('button[type="submit"]');
            submit.disabled = true;

            try {
                const { error: verificationError } =
                    await supabaseClient.auth.signInWithPassword({
                        email: currentUser.email,
                        password: values.currentPassword
                    });

                if (verificationError) {
                    throw new Error("La contraseña actual no es correcta.");
                }

                const { error } =
                    await supabaseClient.auth.updateUser({
                        password: values.newPassword
                    });

                if (error) {
                    throw error;
                }

                close();
                showToast(
                    "Contraseña actualizada correctamente.",
                    "success"
                );
            } catch (error) {
                console.error("❌ Cambiar contraseña:", error);
                showToast(
                    error?.message ||
                        "No se pudo cambiar la contraseña.",
                    "error"
                );
            } finally {
                submit.disabled = false;
            }
        });
}


/* ============================================================
   18. DATOS FINANCIEROS
   ============================================================ */

async function getTransactions(
    table
) {
    if (!currentUser?.id) {
        return [];
    }

    try {
        const {
            data,
            error
        } =
            await supabaseClient
                .from(table)
                .select("*")
                .eq(
                    "user_id",
                    currentUser.id
                )
                .order(
                    "created_at",
                    {
                        ascending: false
                    }
                );

        if (error) {
            console.error(
                `❌ ${table}:`,
                error
            );

            return [];
        }

        return data || [];
    } catch (error) {
        console.error(
            `❌ ${table}:`,
            error
        );

        return [];
    }
}


async function getGoals() {
    if (!currentUser?.id) {
        return [];
    }

    try {
        const {
            data,
            error
        } =
            await supabaseClient
                .from("metas")
                .select("*")
                .eq(
                    "user_id",
                    currentUser.id
                )
                .order(
                    "created_at",
                    {
                        ascending: false
                    }
                );

        if (error) {
            console.error(
                "❌ metas:",
                error
            );

            return [];
        }

        return data || [];
    } catch (error) {
        console.error(
            "❌ metas:",
            error
        );

        return [];
    }
}


/* ============================================================
   19. DASHBOARD
   ============================================================ */

async function loadDashboard() {
    if (!currentUser) {
        return;
    }

    try {
        const [
            ingresos,
            salidas,
            metas
        ] =
            await Promise.all([
                getTransactions(
                    "ingresos"
                ),

                getTransactions(
                    "salidas"
                ),

                getGoals()
            ]);

        financeData = {
            ingresos,
            salidas,
            metas
        };

        updateDashboardNumbers();

        renderRecentActivity();

        renderGoalsPreview();

        renderFlowChart();

        renderExpenseChart();

        renderTransactionLists();

        console.log(
            "📊 Dashboard actualizado"
        );
    } catch (error) {
        console.error(
            "❌ Dashboard:",
            error
        );

        showToast(
            "No se pudo actualizar el dashboard.",
            "error"
        );
    }
}


/* ============================================================
   20. CÁLCULOS
   ============================================================ */

function total(rows) {
    return rows.reduce(
        (
            sum,
            row
        ) =>
            sum +
            Number(
                row.monto || 0
            ),
        0
    );
}


function getFinancialTotals() {
    const ingresos =
        total(
            financeData.ingresos
        );

    const salidas =
        total(
            financeData.salidas
        );

    const balance =
        ingresos -
        salidas;

    return {
        ingresos,
        salidas,
        balance
    };
}


/* ============================================================
   21. DASHBOARD NUMBERS
   ============================================================ */

function updateDashboardNumbers() {
    const {
        ingresos,
        salidas,
        balance
    } =
        getFinancialTotals();

    setText(
        formatMoney(
            ingresos
        ),
        "[data-total-income]",
        "#incomeValue"
    );

    setText(
        formatMoney(
            salidas
        ),
        "[data-total-expenses]",
        "#expenseValue"
    );

    setText(
        formatMoney(
            balance
        ),
        "[data-balance]",
        "#balanceValue"
    );

    /* Variación */

    const movement =
        ingresos +
        salidas;

    if (movement > 0) {
        setText(
            `${(
                (ingresos /
                    movement) *
                100
            ).toFixed(1)}%`,
            "#incomePercentage",
            "[data-income-percentage]"
        );

        setText(
            `${(
                (salidas /
                    movement) *
                100
            ).toFixed(1)}%`,
            "#expensePercentage",
            "[data-expense-percentage]"
        );
    }
}


/* ============================================================
   22. ACTIVIDAD
   ============================================================ */

function getConcept(item) {
    return (
        item.concepto ||
        item.nombre ||
        item.titulo ||
        item.categoria ||
        item.descripcion ||
        "Movimiento"
    );
}


function getDate(item) {
    return (
        item.fecha ||
        item.created_at
    );
}


function renderRecentActivity() {
    const container =
        getElement(
            "[data-recent-activity]",
            "#recentActivity",
            "#recent-activity"
        );

    if (!container) {
        return;
    }

    const data = [
        ...financeData.ingresos.map(
            item => ({
                ...item,
                type:
                    "income"
            })
        ),

        ...financeData.salidas.map(
            item => ({
                ...item,
                type:
                    "expense"
            })
        ),

    ]
        .sort(
            (
                a,
                b
            ) =>
                new Date(
                    getDate(
                        b
                    )
                ) -
                new Date(
                    getDate(
                        a
                    )
                )
        )
        .slice(
            0,
            10
        );

    if (!data.length) {
        container.innerHTML = `
            <div class="finanzas-empty">
                <div style="
                    font-size:38px;
                    margin-bottom:10px;
                ">
                    📊
                </div>

                <strong>
                    Sin movimientos todavía
                </strong>

                <p>
                    Tus movimientos aparecerán aquí.
                </p>
            </div>
        `;

        return;
    }

    container.innerHTML =
        data
            .map(item => {
                const amount =
                    Number(
                        item.monto ||
                            0
                    );

                const income =
                    item.type ===
                    "income";

                const css =
                    income
                        ? "finance-positive"
                        : "finance-negative";

                const sign =
                    income
                        ? "+"
                        : "-";

                const icon =
                    income
                        ? "fa-arrow-trend-up"
                        : "fa-arrow-trend-down";

                const label =
                    income
                        ? "Ingreso"
                        : "Salida";

                return `
                    <div class="activity-item">

                        <div class="activity-icon">
                            <i class="
                                fa-solid
                                ${icon}
                            "></i>
                        </div>

                        <div class="activity-content">
                            <strong>
                                ${escapeHTML(
                                    getConcept(
                                        item
                                    )
                                )}
                            </strong>

                            <small>
                                ${label}
                                ·
                                ${formatDate(
                                    getDate(
                                        item
                                    )
                                )}
                            </small>
                        </div>

                        <div class="${css}">
                            ${sign}
                            ${formatMoney(
                                amount
                            )}
                        </div>

                    </div>
                `;
            })
            .join("");
}


/* ============================================================
   23. METAS PREVIEW
   ============================================================ */

function getGoalName(
    goal
) {
    return (
        goal.nombre ||
        goal.titulo ||
        goal.meta ||
        "Meta"
    );
}


function getGoalTarget(
    goal
) {
    return Number(
        goal.objetivo ??
            goal.monto_objetivo ??
            0
    );
}


function getGoalCurrent(
    goal
) {
    return Number(
        goal.actual ??
            goal.monto_actual ??
            goal.ahorrado ??
            0
    );
}


function getGoalProgress(
    goal
) {
    const target =
        getGoalTarget(
            goal
        );

    const current =
        getGoalCurrent(
            goal
        );

    if (!target) {
        return 0;
    }

    return Math.min(
        100,
        Math.max(
            0,
            (current /
                target) *
                100
        )
    );
}


function renderGoalsPreview() {
    const container =
        getElement(
            "[data-goals-preview]",
            "#goalsPreview",
            "#goals-preview"
        );

    if (!container) {
        return;
    }

    const goals =
        financeData.metas.slice(
            0,
            3
        );

    if (!goals.length) {
        container.innerHTML = `
            <div class="finanzas-empty">
                <div style="
                    font-size:38px;
                ">
                    🎯
                </div>

                <strong>
                    No tienes metas
                </strong>

                <p>
                    Crea una meta financiera para comenzar.
                </p>
            </div>
        `;

        return;
    }

    container.innerHTML =
        goals
            .map(goal => {
                const progress =
                    getGoalProgress(
                        goal
                    );

                return `
                    <div class="goal-card">

                        <div class="goal-header">

                            <strong>
                                ${escapeHTML(
                                    getGoalName(
                                        goal
                                    )
                                )}
                            </strong>

                            <span>
                                ${progress.toFixed(
                                    0
                                )}%
                            </span>

                        </div>

                        <div class="goal-progress">
                            <div
                                class="goal-progress-bar"
                                style="
                                    width:${progress}%;
                                "
                            ></div>
                        </div>

                        <div class="goal-footer">

                            <span>
                                ${formatMoney(
                                    getGoalCurrent(
                                        goal
                                    )
                                )}
                            </span>

                            <span>
                                de
                                ${formatMoney(
                                    getGoalTarget(
                                        goal
                                    )
                                )}
                            </span>

                        </div>

                        <button
                            type="button"
                            class="finance-btn-secondary"
                            data-edit-id="${escapeHTML(
                                goal.id
                            )}"
                            data-edit-type="metas"
                        >
                            <i class="fa-solid fa-pen"></i>
                            Actualizar meta
                        </button>

                    </div>
                `;
            })
            .join("");

    setupTransactionActionButtons();
}


/* ============================================================
   24. METAS PÁGINA
   ============================================================ */

async function loadGoalsPage() {
    const container =
        getElement(
            "[data-goals-list]",
            "#goalsPageContainer",
            "#goals-list"
        );

    if (!container) {
        return;
    }

    const goals =
        await getGoals();

    financeData.metas =
        goals;

    if (!goals.length) {
        container.innerHTML = `
            <div class="finanzas-empty">
                <div style="
                    font-size:42px;
                ">
                    🎯
                </div>

                <h3>
                    No tienes metas creadas
                </h3>

                <p>
                    Crea objetivos para organizar tus finanzas.
                </p>
            </div>
        `;

        return;
    }

    container.innerHTML =
        goals
            .map(goal => {
                const target =
                    getGoalTarget(
                        goal
                    );

                const current =
                    getGoalCurrent(
                        goal
                    );

                const progress =
                    getGoalProgress(
                        goal
                    );

                const remaining =
                    Math.max(
                        0,
                        target -
                            current
                    );

                return `
                    <div class="goal-card">

                        <div class="goal-header">

                            <div>
                                <h3>
                                    ${escapeHTML(
                                        getGoalName(
                                            goal
                                        )
                                    )}
                                </h3>

                                <small>
                                    ${escapeHTML(
                                        goal.descripcion ||
                                            ""
                                    )}
                                </small>
                            </div>

                            <strong>
                                ${progress.toFixed(
                                    0
                                )}%
                            </strong>

                        </div>

                        <div class="goal-progress">
                            <div
                                class="goal-progress-bar"
                                style="
                                    width:${progress}%;
                                "
                            ></div>
                        </div>

                        <div class="goal-footer">

                            <span>
                                Ahorrado:
                                <strong>
                                    ${formatMoney(
                                        current
                                    )}
                                </strong>
                            </span>

                            <span>
                                Falta:
                                <strong>
                                    ${formatMoney(
                                        remaining
                                    )}
                                </strong>
                            </span>

                            <span>
                                Objetivo:
                                <strong>
                                    ${formatMoney(
                                        target
                                    )}
                                </strong>
                            </span>

                        </div>

                        <button
                            type="button"
                            class="finance-btn-secondary"
                            data-edit-id="${escapeHTML(
                                goal.id
                            )}"
                            data-edit-type="metas"
                        >
                            <i class="fa-solid fa-pen"></i>
                            Actualizar avance
                        </button>

                    </div>
                `;
            })
            .join("");

    setupTransactionActionButtons();
}


/* ============================================================
   25. GRÁFICO PRINCIPAL
   ============================================================ */

function renderFlowChart() {
    const canvas =
        document.getElementById(
            "flowChart"
        );

    if (
        !canvas ||
        typeof Chart ===
            "undefined"
    ) {
        return;
    }

    const {
        ingresos,
        salidas
    } =
        getFinancialTotals();

    charts.flow?.destroy();

    charts.flow =
        new Chart(
            canvas.getContext(
                "2d"
            ),
            {
                type:
                    "doughnut",

                data: {
                    labels: [
                        "Ingresos",
                        "Salidas"
                    ],

                    datasets: [
                        {
                            data: [
                                ingresos,
                                salidas
                            ]
                        }
                    ]
                },

                options: {
                    responsive:
                        true,

                    maintainAspectRatio:
                        false,

                    cutout:
                        "68%",

                    plugins: {
                        legend: {
                            position:
                                "bottom"
                        },

                        tooltip: {
                            callbacks: {
                                label:
                                    context =>
                                        `${
                                            context.label
                                        }: ${
                                            formatMoney(
                                                context.raw
                                            )
                                        }`
                            }
                        }
                    }
                }
            }
        );
}


/* ============================================================
   26. GRÁFICO DE GASTOS
   ============================================================ */

function renderExpenseChart() {
    const canvas =
        document.getElementById(
            "expenseChart"
        );

    if (
        !canvas ||
        typeof Chart ===
            "undefined"
    ) {
        return;
    }

    const categories =
        {};

    financeData.salidas.forEach(
        item => {
            const category =
                item.categoria ||
                item.tipo ||
                "Otros";

            categories[
                category
            ] =
                (categories[
                    category
                ] || 0) +
                Number(
                    item.monto ||
                        0
                );
        }
    );

    charts.expenses?.destroy();

    charts.expenses =
        new Chart(
            canvas.getContext(
                "2d"
            ),
            {
                type:
                    "bar",

                data: {
                    labels:
                        Object.keys(
                            categories
                        ),

                    datasets: [
                        {
                            label:
                                "Gastos",

                            data:
                                Object.values(
                                    categories
                                ),

                            borderWidth:
                                1
                        }
                    ]
                },

                options: {
                    responsive:
                        true,

                    maintainAspectRatio:
                        false,

                    scales: {
                        y: {
                            beginAtZero:
                                true,

                            ticks: {
                                callback:
                                    value =>
                                        formatMoney(
                                            value
                                        )
                            }
                        }
                    }
                }
            }
        );
}


/* ============================================================
   27. LISTAS DE MOVIMIENTOS
   ============================================================ */

function renderTransactionLists() {
    renderTransactionList(
        "ingresos",
        [
            "[data-income-list]",
            "#incomeList",
            "#ingresosList"
        ]
    );

    renderTransactionList(
        "salidas",
        [
            "[data-expense-list]",
            "#expenseList",
            "#salidasList"
        ]
    );

}


function renderTransactionList(
    type,
    selectors
) {
    const container =
        getElement(
            ...selectors
        );

    if (!container) {
        return;
    }

    const rows =
        financeData[type] ||
        [];

    if (!rows.length) {
        container.innerHTML = `
            <div class="finanzas-empty">
                No hay registros.
            </div>
        `;

        return;
    }

    container.innerHTML =
        rows
            .slice(0, 20)
            .map(row =>
                renderTransactionRow(
                    row,
                    type
                )
            )
            .join("");

    setupTransactionActionButtons();
}


function renderTransactionRow(
    row,
    type
) {
    const amount =
        Number(
            row.monto || 0
        );

    const date =
        row.fecha ||
        row.created_at;

    const concept =
        row.concepto ||
        row.nombre ||
        row.descripcion ||
        "Movimiento";

    const css =
        type ===
        "ingresos"
            ? "finance-positive"
            : "finance-negative";

    return `
        <div
            class="transaction-row"
            data-transaction-id="${escapeHTML(
                row.id
            )}"
            data-transaction-type="${type}"
        >

            <div>
                <strong>
                    ${escapeHTML(
                        concept
                    )}
                </strong>

                <small>
                    ${
                        row.categoria
                            ? escapeHTML(
                                  row.categoria
                              ) +
                              " · "
                            : ""
                    }

                    ${formatDate(
                        date
                    )}
                </small>
            </div>

            <div class="${css}">
                ${formatMoney(
                    amount
                )}
            </div>

            <div class="finance-actions">

                <button
                    type="button"
                    class="
                        finance-action
                        finance-edit
                    "
                    data-edit-id="${escapeHTML(
                        row.id
                    )}"
                    data-edit-type="${type}"
                    title="Editar"
                    aria-label="Editar movimiento"
                >
                    <i class="
                        fa-solid
                        fa-pen
                    "></i>
                </button>

                <button
                    type="button"
                    class="
                        finance-action
                        finance-delete
                    "
                    data-delete-id="${escapeHTML(
                        row.id
                    )}"
                    data-delete-type="${type}"
                    title="Eliminar"
                    aria-label="Eliminar movimiento"
                >
                    <i class="
                        fa-solid
                        fa-trash
                    "></i>
                </button>

            </div>

        </div>
    `;
}


/* ============================================================
   28. MODAL MOVIMIENTOS
   ============================================================ */

function openTransactionModal(
    type,
    existing = null
) {
    const labels = {
        ingresos:
            "Nuevo ingreso",

        salidas:
            "Nueva salida",

        metas:
            "Nueva meta"
    };

    const title =
        existing
            ? `Editar ${
                  type ===
                  "ingresos"
                      ? "ingreso"
                      : type ===
                        "salidas"
                      ? "salida"
                      : "meta"
              }`
            : labels[type] ||
              "Nuevo registro";

    const modal =
        document.createElement(
            "div"
        );

    modal.className =
        "finance-modal-backdrop";

    modal.id =
        "financeDynamicModal";

    if (type === "metas") {
        modal.innerHTML =
            getGoalModalHTML(
                title,
                existing
            );
    } else {
        modal.innerHTML =
            getTransactionModalHTML(
                title,
                type,
                existing
            );
    }

    document.body.appendChild(
        modal
    );

    setupDynamicModal(
        modal,
        type,
        existing
    );
}


function getTransactionModalHTML(
    title,
    type,
    existing
) {
    const concept =
        existing?.concepto ||
        "";

    const amount =
        existing?.monto ||
        "";

    const category =
        existing?.categoria ||
        "";

    const date =
        existing?.fecha ||
        formatDateInput(
            new Date()
        );

    const description =
        existing?.descripcion ||
        "";

    return `
        <div class="finance-modal">

            <div class="finance-modal-header">

                <div>
                    <small>
                        FinanzasPersonales
                    </small>

                    <h2>
                        ${title}
                    </h2>
                </div>

                <button
                    type="button"
                    class="finance-modal-close"
                    data-close-modal
                >
                    ×
                </button>

            </div>

            <form
                id="financeDynamicForm"
            >

                <div class="finance-form-grid">

                    <div class="finance-form-group full">

                        <label>
                            Concepto
                        </label>

                        <input
                            type="text"
                            name="concepto"
                            value="${escapeHTML(
                                concept
                            )}"
                            placeholder="Ej. Sueldo, supermercado..."
                            required
                        >

                    </div>

                    <div class="finance-form-group">

                        <label>
                            Monto
                        </label>

                        <input
                            type="number"
                            name="monto"
                            value="${escapeHTML(
                                amount
                            )}"
                            min="0.01"
                            step="0.01"
                            placeholder="0.00"
                            required
                        >

                    </div>

                    <div class="finance-form-group">

                        <label>
                            Fecha
                        </label>

                        <input
                            type="date"
                            name="fecha"
                            value="${escapeHTML(
                                date
                            )}"
                            required
                        >

                    </div>

                    <div class="finance-form-group">

                        <label>
                            Categoría
                        </label>

                        <input
                            type="text"
                            name="categoria"
                            value="${escapeHTML(
                                category
                            )}"
                            placeholder="Ej. Alimentación"
                        >

                    </div>

                    <div class="finance-form-group full">

                        <label>
                            Descripción
                        </label>

                        <textarea
                            name="descripcion"
                            placeholder="Información adicional..."
                        >${escapeHTML(
                            description
                        )}</textarea>

                    </div>

                </div>

                <div class="finance-modal-footer">

                    <button
                        type="button"
                        class="finance-btn-secondary"
                        data-close-modal
                    >
                        Cancelar
                    </button>

                    <button
                        type="submit"
                        class="finance-btn-primary"
                    >
                        ${
                            existing
                                ? "Guardar cambios"
                                : "Registrar"
                        }
                    </button>

                </div>

            </form>

        </div>
    `;
}


function getGoalModalHTML(
    title,
    existing
) {
    const name =
        existing?.nombre ||
        "";

    const target =
        existing?.objetivo ??
        existing?.monto_objetivo ??
        "";

    const current =
        existing?.actual ??
        existing?.monto_actual ??
        existing?.ahorrado ??
        0;

    const description =
        existing?.descripcion ||
        "";

    return `
        <div class="finance-modal">

            <div class="finance-modal-header">

                <div>
                    <small>
                        FinanzasPersonales
                    </small>

                    <h2>
                        ${title}
                    </h2>
                </div>

                <button
                    type="button"
                    class="finance-modal-close"
                    data-close-modal
                >
                    ×
                </button>

            </div>

            <form
                id="financeDynamicForm"
            >

                <div class="finance-form-grid">

                    <div class="finance-form-group full">

                        <label>
                            Nombre de la meta
                        </label>

                        <input
                            type="text"
                            name="nombre"
                            value="${escapeHTML(
                                name
                            )}"
                            placeholder="Ej. Comprar laptop"
                            required
                        >

                    </div>

                    <div class="finance-form-group">

                        <label>
                            Monto objetivo
                        </label>

                        <input
                            type="number"
                            name="monto_objetivo"
                            value="${escapeHTML(
                                target
                            )}"
                            min="0.01"
                            step="0.01"
                            required
                        >

                    </div>

                    <div class="finance-form-group">

                        <label>
                            Monto actual
                        </label>

                        <input
                            type="number"
                            name="monto_actual"
                            value="${escapeHTML(
                                current
                            )}"
                            min="0"
                            step="0.01"
                        >

                    </div>

                    <div class="finance-form-group full">

                        <label>
                            Descripción
                        </label>

                        <textarea
                            name="descripcion"
                            placeholder="Describe tu objetivo..."
                        >${escapeHTML(
                            description
                        )}</textarea>

                    </div>

                </div>

                <div class="finance-modal-footer">

                    <button
                        type="button"
                        class="finance-btn-secondary"
                        data-close-modal
                    >
                        Cancelar
                    </button>

                    <button
                        type="submit"
                        class="finance-btn-primary"
                    >
                        ${
                            existing
                                ? "Guardar cambios"
                                : "Crear meta"
                        }
                    </button>

                </div>

            </form>

        </div>
    `;
}


/* ============================================================
   29. MODAL EVENTS
   ============================================================ */

function setupDynamicModal(
    modal,
    type,
    existing
) {
    modal
        .querySelectorAll(
            "[data-close-modal]"
        )
        .forEach(button => {
            button.addEventListener(
                "click",
                closeDynamicModal
            );
        });

    modal.addEventListener(
        "click",
        event => {
            if (
                event.target ===
                modal
            ) {
                closeDynamicModal();
            }
        }
    );

    const form =
        modal.querySelector(
            "#financeDynamicForm"
        );

    form?.addEventListener(
        "submit",
        async event => {
            event.preventDefault();

            const submit =
                form.querySelector(
                    'button[type="submit"]'
                );

            if (submit) {
                submit.disabled =
                    true;

                submit.textContent =
                    "Guardando...";
            }

            try {
                const formData =
                    new FormData(
                        form
                    );

                const values =
                    Object.fromEntries(
                        formData.entries()
                    );

                if (
                    type ===
                    "metas"
                ) {
                    await saveGoal(
                        values,
                        existing
                    );
                } else {
                    await saveTransaction(
                        type,
                        values,
                        existing
                    );
                }

                closeDynamicModal();

                await loadDashboard();

                if (
                    currentSection ===
                    "metas"
                ) {
                    await loadGoalsPage();
                }

                showToast(
                    existing
                        ? "Cambios guardados correctamente."
                        : "Registro creado correctamente.",
                    "success"
                );
            } catch (error) {
                console.error(
                    "❌ Guardado:",
                    error
                );

                showToast(
                    error?.message ||
                        "No se pudo guardar.",
                    "error"
                );
            } finally {
                if (submit) {
                    submit.disabled =
                        false;
                }
            }
        }
    );
}


function closeDynamicModal() {
    const modal =
        document.getElementById(
            "financeDynamicModal"
        );

    modal?.remove();
}


/* ============================================================
   30. GUARDAR MOVIMIENTO
   ============================================================ */

async function saveTransaction(
    type,
    values,
    existing
) {
    if (!currentUser?.id) {
        throw new Error(
            "No hay una sesión activa."
        );
    }

    const table =
        type;

    const payload = {
        user_id:
            currentUser.id,

        concepto:
            values.concepto
                ?.trim(),

        monto:
            Number(
                values.monto
            ),

        categoria:
            values.categoria
                ?.trim() ||
            null,

        fecha:
            values.fecha,

        descripcion:
            values.descripcion
                ?.trim() ||
            null
    };

    if (
        !payload.concepto
    ) {
        throw new Error(
            "El concepto es obligatorio."
        );
    }

    if (
        !payload.monto ||
        payload.monto <= 0
    ) {
        throw new Error(
            "El monto debe ser mayor a 0."
        );
    }

    if (existing) {
        const {
            error
        } =
            await supabaseClient
                .from(table)
                .update(
                    payload
                )
                .eq(
                    "id",
                    existing.id
                )
                .eq(
                    "user_id",
                    currentUser.id
                );

        if (error) {
            throw error;
        }
    } else {
        const {
            error
        } =
            await supabaseClient
                .from(table)
                .insert(
                    payload
                );

        if (error) {
            throw error;
        }
    }
}


/* ============================================================
   31. GUARDAR META
   ============================================================ */

async function saveGoal(
    values,
    existing
) {
    if (!currentUser?.id) {
        throw new Error(
            "No hay una sesión activa."
        );
    }

    const payload = {
        user_id:
            currentUser.id,

        nombre:
            values.nombre
                ?.trim(),

        objetivo:
            Number(
                values.monto_objetivo
            ),

        actual:
            Number(
                values.monto_actual ||
                    0
            ),

        descripcion:
            values.descripcion
                ?.trim() ||
            null
    };

    if (
        !payload.nombre
    ) {
        throw new Error(
            "El nombre de la meta es obligatorio."
        );
    }

    if (
        !payload.objetivo ||
        payload.objetivo <= 0
    ) {
        throw new Error(
            "El monto objetivo debe ser mayor a 0."
        );
    }

    if (existing) {
        const {
            error
        } =
            await supabaseClient
                .from("metas")
                .update(
                    payload
                )
                .eq(
                    "id",
                    existing.id
                )
                .eq(
                    "user_id",
                    currentUser.id
                );

        if (error) {
            throw error;
        }
    } else {
        const {
            error
        } =
            await supabaseClient
                .from("metas")
                .insert(
                    payload
                );

        if (error) {
            throw error;
        }
    }
}


/* ============================================================
   32. EDITAR / ELIMINAR
   ============================================================ */

function setupTransactionActionButtons() {
    document
        .querySelectorAll(
            "[data-edit-id]"
        )
        .forEach(button => {
            if (
                button.dataset.bound
            ) {
                return;
            }

            button.dataset.bound =
                "true";

            button.addEventListener(
                "click",
                () => {
                    const id =
                        button.dataset
                            .editId;

                    const type =
                        button.dataset
                            .editType;

                    const item =
                        (
                            financeData[
                                type
                            ] || []
                        ).find(
                            row =>
                                String(
                                    row.id
                                ) ===
                                String(
                                    id
                                )
                        );

                    if (item) {
                        openTransactionModal(
                            type,
                            item
                        );
                    }
                }
            );
        });

    document
        .querySelectorAll(
            "[data-delete-id]"
        )
        .forEach(button => {
            if (
                button.dataset.bound
            ) {
                return;
            }

            button.dataset.bound =
                "true";

            button.addEventListener(
                "click",
                async () => {
                    const id =
                        button.dataset
                            .deleteId;

                    const type =
                        button.dataset
                            .deleteType;

                    await deleteTransaction(
                        type,
                        id
                    );
                }
            );
        });
}


async function deleteTransaction(
    type,
    id
) {
    const labels = {
        ingresos:
            "ingreso",

        salidas:
            "salida",

    };

    const confirmed =
        confirm(
            `¿Seguro que deseas eliminar este ${
                labels[type] ||
                "registro"
            }?\n\nEsta acción no se puede deshacer.`
        );

    if (!confirmed) {
        return;
    }

    try {
        const {
            error
        } =
            await supabaseClient
                .from(type)
                .delete()
                .eq(
                    "id",
                    id
                )
                .eq(
                    "user_id",
                    currentUser.id
                );

        if (error) {
            throw error;
        }

        showToast(
            "Registro eliminado correctamente.",
            "success"
        );

        await loadDashboard();
    } catch (error) {
        console.error(
            "❌ Eliminar:",
            error
        );

        showToast(
            "No se pudo eliminar el registro.",
            "error"
        );
    }
}


/* ============================================================
   33. BOTONES NUEVO MOVIMIENTO
   ============================================================ */

function setupQuickActions() {
    document
        .querySelectorAll(
            "[data-quick-action]"
        )
        .forEach(button => {
            if (
                button.dataset
                    .quickBound
            ) {
                return;
            }

            button.dataset.quickBound =
                "true";

            button.addEventListener(
                "click",
                () => {
                    const action =
                        String(
                            button
                                .dataset
                                .quickAction ||
                                ""
                        ).toLowerCase();

                    openAction(
                        action
                    );
                }
            );
        });

    document
        .querySelectorAll(
            "[data-action]"
        )
        .forEach(button => {
            if (
                button.dataset
                    .actionBound
            ) {
                return;
            }

            const action =
                String(
                    button
                        .dataset
                        .action ||
                        ""
                ).toLowerCase();

            if (
                ![
                    "nuevo-ingreso",
                    "nuevo-salida",
                    "nueva-meta"
                ].includes(
                    action
                )
            ) {
                return;
            }

            button.dataset.actionBound =
                "true";

            button.addEventListener(
                "click",
                () =>
                    openAction(
                        action
                    )
            );
        });

    /*
     * Los botones principales de las secciones no llevan atributos
     * data-action en el HTML. Los enlazamos por la sección a la que
     * pertenecen para que siempre abran el formulario correspondiente.
     */
    const sectionActions = {
        ingresos: "nuevo-ingreso",
        salidas: "nuevo-salida",
        metas: "nueva-meta"
    };

    Object.entries(sectionActions)
        .forEach(([section, action]) => {
            document
                .querySelectorAll(
                    `#${section} .primary-action`
                )
                .forEach(button => {
                    if (button.dataset.actionBound) {
                        return;
                    }

                    button.dataset.actionBound = "true";

                    button.addEventListener(
                        "click",
                        () => openAction(action)
                    );
                });
        });
}


function openAction(
    action
) {
    const map = {
        ingreso:
            "ingresos",

        "nuevo-ingreso":
            "ingresos",

        salida:
            "salidas",

        "nuevo-salida":
            "salidas",

        meta:
            "metas",

        "nueva-meta":
            "metas"
    };

    const type =
        map[action];

    if (!type) {
        return;
    }

    openTransactionModal(
        type
    );
}


/* ============================================================
   34. ADMIN USUARIOS
   ============================================================ */

async function loadUsers() {
    if (!isAdmin()) {
        return;
    }

    try {
        const {
            data,
            error
        } =
            await supabaseClient
                .from("profiles")
                .select(`
                    id,
                    nombre,
                    apellido,
                    email,
                    usuario,
                    rol,
                    estado,
                    moneda,
                    avatar_url,
                    created_at
                `)
                .order(
                    "created_at",
                    {
                        ascending:
                            false
                    }
                );

        if (error) {
            throw error;
        }

        allUsers =
            data || [];

        renderUsers(
            applyUserFilters()
        );

        updateUserCount(
            allUsers
        );
    } catch (error) {
        console.error(
            "❌ Usuarios:",
            error
        );

        showToast(
            "No se pudieron cargar los usuarios.",
            "error"
        );
    }
}


function renderUsers(
    users
) {
    const container =
        getElement(
            "[data-users-list]",
            "#usersTableBody",
            "#users-list"
        );

    if (!container) {
        return;
    }

    if (
        container.tagName ===
        "TBODY"
    ) {
        if (!users.length) {
            container.innerHTML = `
                <tr>
                    <td
                        colspan="7"
                        style="
                            text-align:center;
                            padding:40px;
                        "
                    >
                        No se encontraron usuarios.
                    </td>
                </tr>
            `;

            return;
        }

        container.innerHTML =
            users
                .map(user => {
                    const name =
                        `${user.nombre || ""} ${
                            user.apellido || ""
                        }`.trim() ||
                        user.usuario ||
                        "Sin nombre";

                    const active =
                        String(
                            user.estado ||
                                "activo"
                        ).toLowerCase() ===
                        "activo";

                    return `
                        <tr>

                            <td>
                                <div style="
                                    display:flex;
                                    align-items:center;
                                    gap:10px;
                                ">

                                    <div style="
                                        width:40px;
                                        height:40px;
                                        border-radius:50%;
                                        display:flex;
                                        align-items:center;
                                        justify-content:center;
                                        font-weight:800;
                                        background:rgba(99,102,241,.12);
                                    ">
                                        ${escapeHTML(
                                            getUserInitials(
                                                user
                                            )
                                        )}
                                    </div>

                                    <div>
                                        <strong>
                                            ${escapeHTML(
                                                name
                                            )}
                                        </strong>

                                        <small style="
                                            display:block;
                                            opacity:.6;
                                        ">
                                            ${escapeHTML(
                                                user.email ||
                                                    ""
                                            )}
                                        </small>
                                    </div>

                                </div>
                            </td>

                            <td>
                                ${escapeHTML(
                                    user.usuario ||
                                        "—"
                                )}
                            </td>

                            <td>
                                <span class="role-badge">
                                    ${escapeHTML(
                                        user.rol ||
                                            "usuario"
                                    )}
                                </span>
                            </td>

                            <td>
                                <span class="
                                    status-badge
                                    ${
                                        active
                                            ? "status-active"
                                            : "status-inactive"
                                    }
                                ">
                                    ●
                                    ${
                                        active
                                            ? "Activo"
                                            : "Inactivo"
                                    }
                                </span>
                            </td>

                            <td>
                                ${escapeHTML(
                                    user.moneda ||
                                        "PEN"
                                )}
                            </td>

                            <td>
                                ${formatDate(
                                    user.created_at
                                )}
                            </td>

                            <td>
                                ${
                                    user.id ===
                                    currentUser?.id
                                        ? `
                                            <span style="
                                                opacity:.5;
                                                font-size:12px;
                                            ">
                                                Tú
                                            </span>
                                        `
                                        : `
                                            <button
                                                type="button"
                                                class="finance-action ${
                                                    active
                                                        ? "finance-delete"
                                                        : "finance-edit"
                                                } user-status-btn"
                                                data-user-id="${escapeHTML(
                                                    user.id
                                                )}"
                                                title="${
                                                    active
                                                        ? "Desactivar"
                                                        : "Activar"
                                                }"
                                            >
                                                <i class="
                                                    fa-solid
                                                    ${
                                                        active
                                                            ? "fa-user-slash"
                                                            : "fa-user-check"
                                                    }
                                                "></i>
                                            </button>
                                        `
                                }
                            </td>

                        </tr>
                    `;
                })
                .join("");

        setupUserActionButtons();

        return;
    }

    container.innerHTML =
        users
            .map(user => {
                return `
                    <div class="user-row">
                        <strong>
                            ${escapeHTML(
                                `${user.nombre || ""} ${
                                    user.apellido || ""
                                }`
                            )}
                        </strong>

                        <span>
                            ${escapeHTML(
                                user.email ||
                                    ""
                            )}
                        </span>
                    </div>
                `;
            })
            .join("");
}


function getUserInitials(
    user
) {
    const initials =
        `${user.nombre || ""}${user.apellido || ""}`
            .replace(
                /\s/g,
                ""
            )
            .slice(0, 2)
            .toUpperCase();

    return (
        initials ||
        "U"
    );
}


function setupUserActionButtons() {
    document
        .querySelectorAll(
            ".user-status-btn"
        )
        .forEach(button => {
            button.addEventListener(
                "click",
                async () => {
                    await toggleUserStatus(
                        button.dataset
                            .userId
                    );
                }
            );
        });
}


function updateUserCount(
    users
) {
    const total =
        users.length;

    const active =
        users.filter(
            user =>
                String(
                    user.estado ||
                        "activo"
                ).toLowerCase() ===
                "activo"
        ).length;

    setText(
        total,
        "[data-user-count]",
        "#userCount"
    );

    setText(
        active,
        "[data-active-user-count]",
        "#activeUserCount"
    );
}


async function toggleUserStatus(
    userId
) {
    const user =
        allUsers.find(
            item =>
                String(
                    item.id
                ) ===
                String(
                    userId
                )
        );

    if (!user) {
        return;
    }

    const active =
        String(
            user.estado ||
                "activo"
        ).toLowerCase() ===
        "activo";

    const next =
        active
            ? "inactivo"
            : "activo";

    const confirmed =
        confirm(
            `¿Deseas ${
                active
                    ? "desactivar"
                    : "activar"
            } este usuario?`
        );

    if (!confirmed) {
        return;
    }

    try {
        const {
            error
        } =
            await supabaseClient
                .from("profiles")
                .update({
                    estado:
                        next
                })
                .eq(
                    "id",
                    userId
                );

        if (error) {
            throw error;
        }

        user.estado =
            next;

        renderUsers(
            applyUserFilters()
        );

        updateUserCount(
            allUsers
        );

        showToast(
            `Usuario ${
                next ===
                "activo"
                    ? "activado"
                    : "desactivado"
            }.`,
            "success"
        );
    } catch (error) {
        console.error(
            "❌ Estado usuario:",
            error
        );

        showToast(
            "No se pudo actualizar el usuario.",
            "error"
        );
    }
}


/* ============================================================
   35. FILTROS USUARIOS
   ============================================================ */

function setupUserFilters() {
    const search =
        getElement(
            "[data-user-search]",
            "#userSearch",
            "#user-search"
        );

    const role =
        getElement(
            "[data-user-role-filter]",
            "#userRoleFilter"
        );

    const status =
        getElement(
            "[data-user-status-filter]",
            "#userStatusFilter"
        );

    const apply =
        debounce(
            () => {
                const result =
                    applyUserFilters();

                renderUsers(
                    result
                );

                updateUserCount(
                    result
                );
            },
            200
        );

    search?.addEventListener(
        "input",
        apply
    );

    role?.addEventListener(
        "change",
        apply
    );

    status?.addEventListener(
        "change",
        apply
    );
}


function applyUserFilters() {
    const search =
        getElement(
            "[data-user-search]",
            "#userSearch",
            "#user-search"
        );

    const role =
        getElement(
            "[data-user-role-filter]",
            "#userRoleFilter"
        );

    const status =
        getElement(
            "[data-user-status-filter]",
            "#userStatusFilter"
        );

    const searchValue =
        String(
            search?.value || ""
        )
            .trim()
            .toLowerCase();

    const roleValue =
        String(
            role?.value || ""
        )
            .trim()
            .toLowerCase();

    const statusValue =
        String(
            status?.value || ""
        )
            .trim()
            .toLowerCase();

    const selectedRole =
        roleValue === "all"
            ? ""
            : roleValue;

    const selectedStatus =
        statusValue === "all"
            ? ""
            : statusValue;

    return allUsers.filter(
        user => {
            const text =
                `
                    ${user.nombre || ""}
                    ${user.apellido || ""}
                    ${user.email || ""}
                    ${user.usuario || ""}
                `.toLowerCase();

            const userRole =
                String(
                    user.rol || ""
                ).toLowerCase();

            const userStatus =
                String(
                    user.estado ||
                        "activo"
                ).toLowerCase();

            return (
                (!searchValue ||
                    text.includes(
                        searchValue
                    )) &&
                (!selectedRole ||
                    userRole ===
                        selectedRole) &&
                (!selectedStatus ||
                    userStatus ===
                        selectedStatus)
            );
        }
    );
}


/* ============================================================
   36. CREAR USUARIO
   ============================================================ */

function openCreateUserModal() {
    const modal =
        document.getElementById(
            "createUserModal"
        );

    if (!modal) {
        return;
    }

    modal.style.display =
        "";

    modal.classList.add(
        "active",
        "open",
        "show"
    );

    document.body.classList.add(
        "modal-open"
    );
}


function closeCreateUserModal() {
    const modal =
        document.getElementById(
            "createUserModal"
        );

    if (!modal) {
        return;
    }

    modal.style.display =
        "none";

    modal.classList.remove(
        "active",
        "open",
        "show"
    );

    document.body.classList.remove(
        "modal-open"
    );
}


function setupCreateUserModal() {
    document
        .querySelectorAll(
            "#createUserBtn, #openCreateUserModal, [data-create-user-open]"
        )
        .forEach(button => {
            button.addEventListener(
                "click",
                openCreateUserModal
            );
        });

    document
        .querySelectorAll(
            "#cancelCreateUser, #closeCreateUserModal"
        )
        .forEach(button => {
            button.addEventListener(
                "click",
                closeCreateUserModal
            );
        });

    const form =
        document.getElementById(
            "createUserForm"
        );

    form?.addEventListener(
        "submit",
        handleCreateUser
    );
}


async function handleCreateUser(
    event
) {
    event.preventDefault();

    if (!isAdmin()) {
        showToast(
            "No tienes permisos para crear usuarios.",
            "error"
        );

        return;
    }

    const getValue =
        id =>
            document.getElementById(
                id
            )?.value?.trim();

    const nombre =
        getValue(
            "newUserNombre"
        );

    const apellido =
        getValue(
            "newUserApellido"
        );

    const usuario =
        getValue(
            "newUserUsuario"
        );

    const moneda =
        document.getElementById(
            "newUserMoneda"
        )?.value ||
        "PEN";

    const email =
        getValue(
            "newUserEmail"
        );

    const password =
        document.getElementById(
            "newUserPassword"
        )?.value;

    if (
        !nombre ||
        !apellido ||
        !usuario ||
        !email ||
        !password
    ) {
        showToast(
            "Completa todos los campos.",
            "warning"
        );

        return;
    }

    if (
        password.length <
        6
    ) {
        showToast(
            "La contraseña debe tener al menos 6 caracteres.",
            "warning"
        );

        return;
    }

    const submit =
        document.getElementById(
            "createUserSubmit"
        );

    try {
        if (submit) {
            submit.disabled =
                true;

            submit.textContent =
                "Creando...";
        }

        const {
            data,
            error
        } =
            await supabaseClient.functions.invoke(
                "smooth-processor",
                {
                    body: {
                        nombre,
                        apellido,
                        usuario,
                        moneda,
                        email,
                        password
                    }
                }
            );

        if (error) {
            throw error;
        }

        console.log(
            "✅ Usuario creado:",
            data
        );

        showToast(
            "Usuario creado correctamente.",
            "success"
        );

        document
            .getElementById(
                "createUserForm"
            )
            ?.reset();

        closeCreateUserModal();

        await loadUsers();
    } catch (error) {
        console.error(
            "❌ Crear usuario:",
            error
        );

        showToast(
            error?.message ||
                "No se pudo crear el usuario.",
            "error"
        );
    } finally {
        if (submit) {
            submit.disabled =
                false;

            submit.textContent =
                "Crear usuario";
        }
    }
}


/* ============================================================
   37. GENERADOR PASSWORD
   ============================================================ */

function generatePassword(
    length = 12
) {
    const upper =
        "ABCDEFGHJKLMNPQRSTUVWXYZ";

    const lower =
        "abcdefghijkmnopqrstuvwxyz";

    const numbers =
        "23456789";

    const symbols =
        "!@#$%&*";

    const all =
        upper +
        lower +
        numbers +
        symbols;

    let password =
        "";

    password +=
        upper[
            Math.floor(
                Math.random() *
                    upper.length
            )
        ];

    password +=
        lower[
            Math.floor(
                Math.random() *
                    lower.length
            )
        ];

    password +=
        numbers[
            Math.floor(
                Math.random() *
                    numbers.length
            )
        ];

    password +=
        symbols[
            Math.floor(
                Math.random() *
                    symbols.length
            )
        ];

    while (
        password.length <
        length
    ) {
        password +=
            all[
                Math.floor(
                    Math.random() *
                        all.length
                )
            ];
    }

    return password
        .split("")
        .sort(
            () =>
                Math.random() -
                0.5
        )
        .join("");
}


function setupPasswordGenerator() {
    const button =
        getElement(
            "[data-generate-password]",
            "#generatePassword"
        );

    const input =
        document.getElementById(
            "newUserPassword"
        );

    if (
        !button ||
        !input
    ) {
        return;
    }

    button.addEventListener(
        "click",
        () => {
            input.value =
                generatePassword(
                    12
                );

            input.type =
                "text";

            setTimeout(
                () => {
                    input.type =
                        "password";
                },
                2500
            );

            showToast(
                "Contraseña segura generada.",
                "success"
            );
        }
    );
}


/* ============================================================
   38. KEYBOARD
   ============================================================ */

function setupKeyboard() {
    document.addEventListener(
        "keydown",
        event => {
            if (
                event.key ===
                "Escape"
            ) {
                closeSidebar();

                closeDynamicModal();

                closeCreateUserModal();
            }
        }
    );
}


/* ============================================================
   39. AUTH LISTENER
   ============================================================ */

function setupAuthListener() {
    if (!supabaseClient) {
        return;
    }

    supabaseClient.auth.onAuthStateChange(
        async (
            event,
            session
        ) => {
            console.log(
                "🔐 Cambio de autenticación:",
                event
            );

            if (
                session?.user
            ) {
                currentUser =
                    session.user;

                if (
                    event ===
                        "SIGNED_IN" ||
                    event ===
                        "INITIAL_SESSION"
                ) {
                    await initializeAuthenticatedApp();
                }
            }

            if (
                event ===
                    "SIGNED_OUT" ||
                event ===
                    "USER_DELETED"
            ) {
                currentUser =
                    null;

                currentProfile =
                    null;

                showLogin();
            }
        }
    );
}


/* ============================================================
   40. EVENTOS PRINCIPALES
   ============================================================ */

function setupMainEvents() {
    loginForm?.addEventListener(
        "submit",
        handleLogin
    );

    logoutButton?.addEventListener(
        "click",
        logout
    );

    changePasswordButton?.addEventListener(
        "click",
        openChangePasswordModal
    );
}


function setupResponsive() {
    window.addEventListener(
        "resize",
        debounce(
            () => {
                if (
                    window.innerWidth >
                    1024
                ) {
                    closeSidebar();
                }
            },
            150
        )
    );
}


/* ============================================================
   41. INICIO
   ============================================================ */

async function init() {
    console.log(
        "💰 FinanzasPersonales PRO MAX listo."
    );

    injectRuntimeStyles();

    /*
     * Reportes desaparece.
     */
    removeReportsFromUI();

    setupMainEvents();

    setupPasswordToggle();

    setupPasswordRecovery();

    setupNavigation();

    setupSidebar();

    setupTheme();

    setupQuickActions();

    setupPasswordGenerator();

    setupCreateUserModal();

    setupUserFilters();

    setupKeyboard();

    setupResponsive();

    setupAuthListener();

    /*
     * Dashboard por defecto.
     */
    updatePageHeader(
        "dashboard"
    );

    await checkSession();
}


/* ============================================================
   42. API GLOBAL
   ============================================================ */

window.FinanzasApp = {

    getCurrentUser:
        () => currentUser,

    getCurrentProfile:
        () => currentProfile,

    isAdmin,

    formatMoney,

    formatDate,

    showToast,

    showSection,

    loadDashboard,

    loadUsers,

    loadGoalsPage,

    openTransactionModal,

    closeDynamicModal,

    logout
};


/* ============================================================
   43. ARRANQUE
   ============================================================ */

if (
    document.readyState ===
    "loading"
) {
    document.addEventListener(
        "DOMContentLoaded",
        init,
        {
            once: true
        }
    );
} else {
    init();
}
