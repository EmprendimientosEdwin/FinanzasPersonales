/* =========================================================
   FINANZASPERSONALES - APP.JS PRO MAX
   ========================================================= */

"use strict";

/* =========================================================
   1. CONFIGURACIÓN SUPABASE
   ========================================================= */

const SUPABASE_URL = "https://xwkxgrktsdejoaqnbiwk.supabase.co";

const SUPABASE_ANON_KEY =
    "sb_publishable_DYl24WF6mNud6QsS4nhhYA_53ohH191";

let supabaseClient = null;

if (
    window.supabase &&
    SUPABASE_URL &&
    SUPABASE_ANON_KEY
) {
    try {
        supabaseClient = window.supabase.createClient(
            SUPABASE_URL,
            SUPABASE_ANON_KEY
        );

        console.log("✅ Supabase conectado correctamente");
    } catch (error) {
        console.error(
            "❌ Error inicializando Supabase:",
            error
        );
    }
} else {
    console.error(
        "❌ Supabase no está disponible. Revisa la librería y configuración."
    );
}


/* =========================================================
   2. ESTADO GLOBAL
   ========================================================= */

let currentUser = null;
let currentProfile = null;

let allUsers = [];
let currentSection = "dashboard";

let flowChartInstance = null;
let expenseChartInstance = null;

let dashboardCache = {
    ingresos: [],
    salidas: [],
    aportes: [],
    metas: []
};


/* =========================================================
   3. DOM
   ========================================================= */

const loginScreen =
    document.getElementById("loginScreen");

const appContainer =
    document.getElementById("appContainer");

const loginForm =
    document.getElementById("loginForm");

const loginEmail =
    document.getElementById("loginEmail");

const loginPassword =
    document.getElementById("loginPassword");

const passwordToggle =
    document.getElementById("passwordToggle");

const logoutButton =
    document.getElementById("logoutBtn");

const sidebar =
    document.getElementById("sidebar");

const sidebarOverlay =
    document.getElementById("sidebarOverlay");

const mobileMenuButton =
    document.getElementById("mobileMenuBtn");

const sidebarCloseButton =
    document.getElementById("sidebarClose");

const navItems =
    document.querySelectorAll("[data-section]");

const pageSections =
    document.querySelectorAll(".page-section");


/* =========================================================
   4. UTILIDADES DOM
   ========================================================= */

function getElement(...selectors) {
    for (const selector of selectors) {
        if (!selector) continue;

        const element =
            typeof selector === "string"
                ? document.querySelector(selector)
                : selector;

        if (element) return element;
    }

    return null;
}


function setText(value, ...selectors) {
    const element = getElement(...selectors);

    if (!element) return;

    element.textContent =
        value === null ||
        value === undefined ||
        value === ""
            ? "—"
            : value;
}


function setHTML(html, ...selectors) {
    const element = getElement(...selectors);

    if (!element) return;

    element.innerHTML = html;
}


function escapeHTML(value) {
    if (value === null || value === undefined) {
        return "";
    }

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


function debounce(callback, delay = 300) {
    let timeout;

    return (...args) => {
        clearTimeout(timeout);

        timeout = setTimeout(() => {
            callback(...args);
        }, delay);
    };
}


/* =========================================================
   5. FORMATO DE MONEDA
   ========================================================= */

function getCurrency() {
    return currentProfile?.moneda || "PEN";
}


function formatMoney(value) {
    const amount = Number(value) || 0;

    try {
        return new Intl.NumberFormat("es-PE", {
            style: "currency",
            currency: getCurrency(),
            minimumFractionDigits: 2
        }).format(amount);
    } catch {
        return `S/ ${amount.toFixed(2)}`;
    }
}


function formatNumber(value) {
    const amount = Number(value) || 0;

    return new Intl.NumberFormat("es-PE", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(amount);
}


function formatDate(date) {
    if (!date) return "—";

    try {
        return new Intl.DateTimeFormat("es-PE", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric"
        }).format(new Date(date));
    } catch {
        return date;
    }
}


function getInitials(nombre, apellido) {
    const first =
        String(nombre || "")
            .trim()
            .charAt(0)
            .toUpperCase();

    const last =
        String(apellido || "")
            .trim()
            .charAt(0)
            .toUpperCase();

    return (
        `${first}${last}` ||
        String(currentUser?.email || "U")
            .charAt(0)
            .toUpperCase()
    );
}


/* =========================================================
   6. TOASTS
   ========================================================= */

function showToast(
    message,
    type = "info",
    duration = 4000
) {
    let container =
        document.getElementById("toast-container");

    if (!container) {
        container = document.createElement("div");

        container.id = "toast-container";

        container.style.position = "fixed";
        container.style.top = "20px";
        container.style.right = "20px";
        container.style.zIndex = "99999";
        container.style.display = "flex";
        container.style.flexDirection = "column";
        container.style.gap = "10px";
        container.style.maxWidth = "380px";

        document.body.appendChild(container);
    }

    const toast =
        document.createElement("div");

    const icons = {
        success: "✓",
        error: "✕",
        warning: "!",
        info: "i"
    };

    toast.innerHTML = `
        <div style="
            display:flex;
            align-items:center;
            gap:12px;
        ">
            <span style="
                width:30px;
                height:30px;
                border-radius:50%;
                display:flex;
                align-items:center;
                justify-content:center;
                background:rgba(255,255,255,.15);
                font-weight:800;
            ">
                ${icons[type] || "i"}
            </span>

            <span style="
                flex:1;
                line-height:1.4;
            ">
                ${escapeHTML(message)}
            </span>

            <button
                type="button"
                style="
                    border:0;
                    background:none;
                    color:inherit;
                    cursor:pointer;
                    font-size:18px;
                    opacity:.7;
                "
            >×</button>
        </div>
    `;

    const backgrounds = {
        success: "#15803d",
        error: "#b91c1c",
        warning: "#b45309",
        info: "#1d4ed8"
    };

    toast.style.background =
        backgrounds[type] || backgrounds.info;

    toast.style.color = "#fff";
    toast.style.padding = "14px 16px";
    toast.style.borderRadius = "14px";
    toast.style.boxShadow =
        "0 15px 40px rgba(0,0,0,.22)";
    toast.style.fontSize = "14px";
    toast.style.animation =
        "finanzasToastIn .3s ease";

    const closeButton =
        toast.querySelector("button");

    closeButton?.addEventListener(
        "click",
        () => toast.remove()
    );

    container.appendChild(toast);

    setTimeout(() => {
        if (toast.isConnected) {
            toast.style.opacity = "0";
            toast.style.transform =
                "translateX(30px)";

            toast.style.transition =
                "all .3s ease";

            setTimeout(
                () => toast.remove(),
                300
            );
        }
    }, duration);
}


/* =========================================================
   7. LOADING
   ========================================================= */

function setLoading(
    loading,
    ...selectors
) {
    const element =
        getElement(...selectors);

    if (!element) return;

    if (loading) {
        element.dataset.previousHtml =
            element.innerHTML;

        element.innerHTML = `
            <div style="
                display:flex;
                align-items:center;
                justify-content:center;
                gap:10px;
                padding:30px;
                opacity:.7;
            ">
                <span style="
                    width:18px;
                    height:18px;
                    border:2px solid currentColor;
                    border-right-color:transparent;
                    border-radius:50%;
                    animation:finanzasSpin .7s linear infinite;
                "></span>
                <span>Cargando...</span>
            </div>
        `;
    } else if (
        element.dataset.previousHtml
    ) {
        element.innerHTML =
            element.dataset.previousHtml;

        delete element.dataset.previousHtml;
    }
}


/* =========================================================
   8. ESTILOS DINÁMICOS NECESARIOS
   ========================================================= */

function injectRuntimeStyles() {
    if (
        document.getElementById(
            "finanzas-runtime-styles"
        )
    ) {
        return;
    }

    const style =
        document.createElement("style");

    style.id =
        "finanzas-runtime-styles";

    style.textContent = `
        @keyframes finanzasSpin {
            to {
                transform:rotate(360deg);
            }
        }

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

        .finanzas-empty {
            padding:40px 20px;
            text-align:center;
            opacity:.65;
        }

        .finanzas-error {
            padding:25px;
            text-align:center;
            color:#b91c1c;
        }

        .status-badge {
            display:inline-flex;
            align-items:center;
            gap:6px;
            padding:5px 10px;
            border-radius:999px;
            font-size:12px;
            font-weight:700;
        }

        .status-active {
            background:rgba(34,197,94,.12);
            color:#16a34a;
        }

        .status-inactive {
            background:rgba(239,68,68,.12);
            color:#dc2626;
        }

        .role-badge {
            display:inline-flex;
            padding:5px 10px;
            border-radius:999px;
            font-size:12px;
            font-weight:700;
            background:rgba(99,102,241,.12);
            color:#6366f1;
        }

        .amount-positive {
            color:#16a34a;
            font-weight:800;
        }

        .amount-negative {
            color:#dc2626;
            font-weight:800;
        }

        .amount-contribution {
            color:#7c3aed;
            font-weight:800;
        }
    `;

    document.head.appendChild(style);
}


/* =========================================================
   9. AUTENTICACIÓN
   ========================================================= */

async function checkSession() {
    if (!supabaseClient) {
        showToast(
            "Supabase no está configurado correctamente.",
            "error"
        );

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
                "❌ Error obteniendo sesión:",
                error
            );

            showLogin();

            return;
        }

        if (data?.session?.user) {
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


function showLogin() {
    currentUser = null;
    currentProfile = null;

    if (loginScreen) {
        loginScreen.style.display = "";
        loginScreen.classList.remove(
            "hidden"
        );
    }

    if (appContainer) {
        appContainer.style.display = "none";
        appContainer.classList.add("hidden");
    }
}


function showApp() {
    if (loginScreen) {
        loginScreen.style.display = "none";
        loginScreen.classList.add("hidden");
    }

    if (appContainer) {
        appContainer.style.display = "";
        appContainer.classList.remove("hidden");
    }
}


async function handleLogin(event) {
    event.preventDefault();

    if (!supabaseClient) {
        showToast(
            "Supabase no está disponible.",
            "error"
        );

        return;
    }

    const email =
        loginEmail?.value?.trim();

    const password =
        loginPassword?.value;

    if (!email || !password) {
        showToast(
            "Ingresa tu correo y contraseña.",
            "warning"
        );

        return;
    }

    const submitButton =
        loginForm?.querySelector(
            'button[type="submit"]'
        );

    const originalText =
        submitButton?.innerHTML;

    if (submitButton) {
        submitButton.disabled = true;

        submitButton.innerHTML =
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
                "❌ Error de login:",
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
            data?.user || null;

        if (!currentUser) {
            showToast(
                "No se pudo obtener el usuario.",
                "error"
            );

            return;
        }

        showToast(
            "Bienvenido a FinanzasPersonales.",
            "success"
        );

        await initializeAuthenticatedApp();
    } catch (error) {
        console.error(
            "❌ Error inesperado en login:",
            error
        );

        showToast(
            "Ocurrió un error al iniciar sesión.",
            "error"
        );
    } finally {
        if (submitButton) {
            submitButton.disabled = false;

            submitButton.innerHTML =
                originalText ||
                "Iniciar sesión";
        }
    }
}


function getAuthErrorMessage(error) {
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
        "No fue posible iniciar sesión."
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
                "❌ Error cerrando sesión:",
                error
            );

            showToast(
                "No se pudo cerrar la sesión.",
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
            "❌ Error logout:",
            error
        );
    }
}


/* =========================================================
   10. CAMBIO DE CONTRASEÑA VISUAL
   ========================================================= */

function setupPasswordToggle() {
    if (!passwordToggle || !loginPassword) {
        return;
    }

    passwordToggle.addEventListener(
        "click",
        () => {
            const isPassword =
                loginPassword.type ===
                "password";

            loginPassword.type =
                isPassword
                    ? "text"
                    : "password";

            const icon =
                passwordToggle.querySelector(
                    "i"
                );

            if (icon) {
                icon.className =
                    isPassword
                        ? "fa-solid fa-eye-slash"
                        : "fa-solid fa-eye";
            }
        }
    );
}


/* =========================================================
   11. PERFIL
   ========================================================= */

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
                "❌ Error cargando perfil:",
                error
            );

            return null;
        }

        if (!data) {
            console.warn(
                "⚠️ No existe perfil para:",
                currentUser.email
            );

            return null;
        }

        currentProfile = data;

        console.log(
            "✅ Perfil cargado:",
            currentProfile
        );

        return data;
    } catch (error) {
        console.error(
            "❌ Error perfil:",
            error
        );

        return null;
    }
}


function isAdmin() {
    const role =
        String(
            currentProfile?.rol || ""
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
    const estado =
        String(
            currentProfile?.estado ??
                "activo"
        )
            .trim()
            .toLowerCase();

    return ![
        "inactivo",
        "disabled",
        "suspendido",
        "bloqueado"
    ].includes(estado);
}


/* =========================================================
   12. INICIALIZACIÓN APP
   ========================================================= */

async function initializeAuthenticatedApp() {
    if (!currentUser) return;

    const profile =
        await loadCurrentProfile();

    if (!profile) {
        showToast(
            "No encontramos tu perfil en el sistema.",
            "error"
        );

        await supabaseClient.auth.signOut();

        showLogin();

        return;
    }

    if (!isActiveProfile()) {
        showToast(
            "Tu cuenta está desactivada. Contacta al administrador.",
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
        "🚀 FinanzasPersonales - JavaScript cargado correctamente"
    );
}


/* =========================================================
   13. INTERFAZ DEL USUARIO
   ========================================================= */

function updateUserInterface() {
    if (!currentProfile) return;

    const nombre =
        currentProfile.nombre ||
        currentProfile.usuario ||
        currentUser?.email?.split("@")[0] ||
        "Usuario";

    const apellido =
        currentProfile.apellido || "";

    const fullName =
        `${nombre} ${apellido}`.trim();

    const role =
        currentProfile.rol ||
        "Usuario";

    const email =
        currentProfile.email ||
        currentUser?.email ||
        "";

    const initials =
        getInitials(
            nombre,
            apellido
        );

    /* Data attributes */

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
                    nombre)
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

    /* IDs reales del HTML */

    setText(
        fullName,
        "#profileName"
    );

    setText(
        role,
        "#accountRole"
    );

    setText(
        nombre,
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

    /* Avatar */

    const avatarUrl =
        currentProfile.avatar_url;

    document
        .querySelectorAll(
            "[data-user-avatar], #profileAvatar, #topbarAvatar"
        )
        .forEach(element => {
            if (
                element.tagName ===
                "IMG"
            ) {
                if (avatarUrl) {
                    element.src =
                        avatarUrl;
                } else {
                    element.style.display =
                        "none";
                }
            }
        });
}


/* =========================================================
   14. ADMIN
   ========================================================= */

function setupAdminVisibility() {
    const adminElements =
        document.querySelectorAll(
            "[data-admin-only], #adminMenu"
        );

    adminElements.forEach(
        element => {
            element.style.display =
                isAdmin()
                    ? ""
                    : "none";
        }
    );
}


/* =========================================================
   15. NAVEGACIÓN
   ========================================================= */

function setupNavigation() {
    document
        .querySelectorAll("[data-section]")
        .forEach(item => {
            item.addEventListener(
                "click",
                event => {
                    event.preventDefault();

                    const section =
                        item.dataset.section;

                    if (section) {
                        showSection(
                            section
                        );
                    }

                    closeSidebar();
                }
            );
        });
}


async function showSection(section) {
    if (!section) return;

    currentSection = section;

    document
        .querySelectorAll(".page-section")
        .forEach(page => {
            const pageId =
                page.id;

            const matches =
                pageId === section ||
                pageId ===
                    `${section}Section`;

            page.classList.toggle(
                "active",
                matches
            );

            page.style.display =
                matches
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
                item.dataset.section ===
                    section
            );
        });

    updatePageHeader(
        section
    );

    if (section === "dashboard") {
        await loadDashboard();
    }

    if (
        section === "reportes" ||
        section === "reports"
    ) {
        await loadReports();
    }

    if (
        section === "metas" ||
        section === "goals"
    ) {
        await loadGoalsPage();
    }

    if (
        section === "usuarios" ||
        section === "users" ||
        section === "admin"
    ) {
        if (isAdmin()) {
            await loadUsers();
        }
    }
}


function updatePageHeader(section) {
    const pages = {
        dashboard: {
            eyebrow: "Resumen financiero",
            title: "Dashboard"
        },

        ingresos: {
            eyebrow: "Movimientos",
            title: "Ingresos"
        },

        salidas: {
            eyebrow: "Movimientos",
            title: "Salidas"
        },

        aportes: {
            eyebrow: "Movimientos",
            title: "Aportes"
        },

        metas: {
            eyebrow: "Planificación",
            title: "Metas"
        },

        reportes: {
            eyebrow: "Análisis",
            title: "Reportes"
        },

        reports: {
            eyebrow: "Análisis",
            title: "Reportes"
        },

        usuarios: {
            eyebrow: "Administración",
            title: "Usuarios"
        },

        users: {
            eyebrow: "Administración",
            title: "Usuarios"
        },

        admin: {
            eyebrow: "Administración",
            title: "Usuarios"
        }
    };

    const page =
        pages[section] ||
        pages.dashboard;

    setText(
        page.title,
        "[data-page-title]",
        "#pageTitle"
    );

    setText(
        page.eyebrow,
        "#pageEyebrow"
    );
}


/* =========================================================
   16. SIDEBAR
   ========================================================= */

function openSidebar() {
    sidebar?.classList.add("open");

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


/* =========================================================
   17. TEMA
   ========================================================= */

function setupTheme() {
    const button =
        getElement(
            "[data-theme-toggle]",
            "#themeToggle"
        );

    if (!button) return;

    const savedTheme =
        localStorage.getItem(
            "finanzas-theme"
        );

    if (savedTheme === "dark") {
        document.documentElement.classList.add(
            "dark"
        );

        document.body.classList.add(
            "dark"
        );
    }

    updateThemeIcon();

    button.addEventListener(
        "click",
        () => {
            const isDark =
                document.documentElement.classList.toggle(
                    "dark"
                );

            document.body.classList.toggle(
                "dark",
                isDark
            );

            localStorage.setItem(
                "finanzas-theme",
                isDark
                    ? "dark"
                    : "light"
            );

            updateThemeIcon();
        }
    );
}


function updateThemeIcon() {
    const isDark =
        document.documentElement.classList.contains(
            "dark"
        );

    document
        .querySelectorAll(
            "[data-theme-icon]"
        )
        .forEach(icon => {
            icon.className =
                isDark
                    ? "fa-solid fa-sun"
                    : "fa-solid fa-moon";
        });
}


/* =========================================================
   18. CONSULTAS DE MOVIMIENTOS
   ========================================================= */

async function getTransactions(
    tableName
) {
    if (!currentUser?.id) {
        console.warn(
            `⚠️ No hay usuario autenticado para cargar ${tableName}`
        );

        return [];
    }

    try {
        const {
            data,
            error
        } =
            await supabaseClient
                .from(tableName)
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
                `❌ Error cargando ${tableName}:`,
                error
            );

            return [];
        }

        return data || [];
    } catch (error) {
        console.error(
            `❌ Error inesperado cargando ${tableName}:`,
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
                "❌ Error cargando metas:",
                error
            );

            return [];
        }

        return data || [];
    } catch (error) {
        console.error(
            "❌ Error metas:",
            error
        );

        return [];
    }
}


/* =========================================================
   19. DASHBOARD
   ========================================================= */

async function loadDashboard() {
    if (!currentUser) return;

    try {
        const [
            ingresos,
            salidas,
            aportes,
            metas
        ] = await Promise.all([
            getTransactions("ingresos"),
            getTransactions("salidas"),
            getTransactions("aportes"),
            getGoals()
        ]);

        dashboardCache = {
            ingresos,
            salidas,
            aportes,
            metas
        };

        updateDashboardNumbers();

        renderGoalsPreview();

        renderRecentActivity();

        renderFlowChart();

        renderExpenseChart();

        console.log(
            "📊 Dashboard actualizado"
        );
    } catch (error) {
        console.error(
            "❌ Error dashboard:",
            error
        );

        showToast(
            "No se pudo actualizar el dashboard.",
            "error"
        );
    }
}


/* =========================================================
   20. NÚMEROS DASHBOARD
   ========================================================= */

function calculateTotal(
    rows
) {
    return rows.reduce(
        (total, item) =>
            total +
            Number(
                item.monto ??
                    item.amount ??
                    0
            ),
        0
    );
}


function updateDashboardNumbers() {
    const income =
        calculateTotal(
            dashboardCache.ingresos
        );

    const expenses =
        calculateTotal(
            dashboardCache.salidas
        );

    const contributions =
        calculateTotal(
            dashboardCache.aportes
        );

    const balance =
        income -
        expenses -
        contributions;

    setText(
        formatMoney(income),
        "[data-total-income]",
        "#incomeValue"
    );

    setText(
        formatMoney(expenses),
        "[data-total-expenses]",
        "#expenseValue"
    );

    setText(
        formatMoney(contributions),
        "[data-total-contributions]",
        "#contributionValue"
    );

    setText(
        formatMoney(balance),
        "[data-balance]",
        "#balanceValue"
    );

    /* Porcentajes */

    const totalMovement =
        income +
        expenses +
        contributions;

    const expensePercentage =
        totalMovement
            ? (expenses /
                  totalMovement) *
              100
            : 0;

    const incomePercentage =
        totalMovement
            ? (income /
                  totalMovement) *
              100
            : 0;

    setText(
        `${expensePercentage.toFixed(1)}%`,
        "#expensePercentage",
        "[data-expense-percentage]"
    );

    setText(
        `${incomePercentage.toFixed(1)}%`,
        "#incomePercentage",
        "[data-income-percentage]"
    );
}


/* =========================================================
   21. ACTIVIDAD RECIENTE
   ========================================================= */

function getTransactionConcept(
    item
) {
    return (
        item.concepto ||
        item.nombre ||
        item.titulo ||
        item.descripcion ||
        item.categoria ||
        "Movimiento"
    );
}


function getTransactionDate(
    item
) {
    return (
        item.fecha ||
        item.fecha_cita ||
        item.created_at ||
        null
    );
}


function renderRecentActivity() {
    const container =
        getElement(
            "[data-recent-activity]",
            "#recentActivity",
            "#recent-activity"
        );

    if (!container) return;

    const income =
        dashboardCache.ingresos.map(
            item => ({
                ...item,
                _type: "income"
            })
        );

    const expenses =
        dashboardCache.salidas.map(
            item => ({
                ...item,
                _type: "expense"
            })
        );

    const contributions =
        dashboardCache.aportes.map(
            item => ({
                ...item,
                _type: "contribution"
            })
        );

    const activities = [
        ...income,
        ...expenses,
        ...contributions
    ]
        .sort(
            (a, b) =>
                new Date(
                    getTransactionDate(
                        b
                    )
                ) -
                new Date(
                    getTransactionDate(
                        a
                    )
                )
        )
        .slice(0, 8);

    if (!activities.length) {
        container.innerHTML = `
            <div class="finanzas-empty">
                <div style="font-size:32px;margin-bottom:10px;">
                    📊
                </div>
                <strong>Aún no hay movimientos</strong>
                <p>Cuando registres movimientos aparecerán aquí.</p>
            </div>
        `;

        return;
    }

    container.innerHTML =
        activities
            .map(item => {
                const amount =
                    Number(
                        item.monto || 0
                    );

                const type =
                    item._type;

                const isIncome =
                    type === "income";

                const isContribution =
                    type ===
                    "contribution";

                const amountClass =
                    isIncome
                        ? "amount-positive"
                        : isContribution
                        ? "amount-contribution"
                        : "amount-negative";

                const prefix =
                    isIncome
                        ? "+"
                        : "-";

                const label =
                    isIncome
                        ? "Ingreso"
                        : isContribution
                        ? "Aporte"
                        : "Salida";

                const icon =
                    isIncome
                        ? "fa-arrow-down"
                        : isContribution
                        ? "fa-piggy-bank"
                        : "fa-arrow-up";

                return `
                    <div class="activity-item">
                        <div class="activity-icon">
                            <i class="fa-solid ${icon}"></i>
                        </div>

                        <div class="activity-content">
                            <strong>
                                ${escapeHTML(
                                    getTransactionConcept(
                                        item
                                    )
                                )}
                            </strong>

                            <small>
                                ${label} ·
                                ${formatDate(
                                    getTransactionDate(
                                        item
                                    )
                                )}
                            </small>
                        </div>

                        <div class="${amountClass}">
                            ${prefix}
                            ${formatMoney(
                                amount
                            )}
                        </div>
                    </div>
                `;
            })
            .join("");
}


/* =========================================================
   22. METAS - PREVIEW
   ========================================================= */

function getGoalName(goal) {
    return (
        goal.nombre ||
        goal.titulo ||
        goal.meta ||
        "Meta financiera"
    );
}


function getGoalTarget(goal) {
    return Number(
        goal.monto_objetivo ??
            goal.objetivo ??
            goal.meta ??
            0
    );
}


function getGoalCurrent(goal) {
    return Number(
        goal.monto_actual ??
            goal.actual ??
            goal.ahorrado ??
            0
    );
}


function getGoalPercentage(goal) {
    const target =
        getGoalTarget(goal);

    const current =
        getGoalCurrent(goal);

    if (!target) return 0;

    return Math.min(
        100,
        Math.max(
            0,
            (current / target) *
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

    if (!container) return;

    const goals =
        dashboardCache.metas.slice(
            0,
            3
        );

    if (!goals.length) {
        container.innerHTML = `
            <div class="finanzas-empty">
                <div style="font-size:32px;margin-bottom:10px;">
                    🎯
                </div>

                <strong>No tienes metas todavía</strong>

                <p>
                    Crea una meta para comenzar a planificar.
                </p>
            </div>
        `;

        return;
    }

    container.innerHTML =
        goals
            .map(renderGoalCard)
            .join("");
}


function renderGoalCard(goal) {
    const target =
        getGoalTarget(goal);

    const current =
        getGoalCurrent(goal);

    const percentage =
        getGoalPercentage(goal);

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
                    ${percentage.toFixed(
                        0
                    )}%
                </span>
            </div>

            <div class="goal-progress">
                <div
                    class="goal-progress-bar"
                    style="
                        width:${percentage}%;
                    "
                ></div>
            </div>

            <div class="goal-footer">
                <span>
                    ${formatMoney(
                        current
                    )}
                </span>

                <span>
                    de
                    ${formatMoney(
                        target
                    )}
                </span>
            </div>

        </div>
    `;
}


/* =========================================================
   23. METAS - PÁGINA
   ========================================================= */

async function loadGoalsPage() {
    const container =
        getElement(
            "[data-goals-list]",
            "#goalsPageContainer",
            "#goals-list"
        );

    if (!container) return;

    const goals =
        await getGoals();

    if (!goals.length) {
        container.innerHTML = `
            <div class="finanzas-empty">
                <div style="font-size:42px;">
                    🎯
                </div>

                <h3>No tienes metas creadas</h3>

                <p>
                    Tus objetivos financieros aparecerán aquí.
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

                const percentage =
                    getGoalPercentage(
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
                                ${percentage.toFixed(
                                    0
                                )}%
                            </strong>
                        </div>

                        <div class="goal-progress">
                            <div
                                class="goal-progress-bar"
                                style="
                                    width:${percentage}%;
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
                                Faltan:
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

                    </div>
                `;
            })
            .join("");
}


/* =========================================================
   24. GRÁFICO FLUJO
   ========================================================= */

function renderFlowChart() {
    const canvas =
        document.getElementById(
            "flowChart"
        );

    if (!canvas) return;

    if (
        typeof Chart ===
        "undefined"
    ) {
        console.warn(
            "⚠️ Chart.js no está cargado."
        );

        return;
    }

    const income =
        calculateTotal(
            dashboardCache.ingresos
        );

    const expenses =
        calculateTotal(
            dashboardCache.salidas
        );

    const contributions =
        calculateTotal(
            dashboardCache.aportes
        );

    if (flowChartInstance) {
        flowChartInstance.destroy();
    }

    flowChartInstance =
        new Chart(
            canvas.getContext("2d"),
            {
                type: "doughnut",

                data: {
                    labels: [
                        "Ingresos",
                        "Salidas",
                        "Aportes"
                    ],

                    datasets: [
                        {
                            data: [
                                income,
                                expenses,
                                contributions
                            ]
                        }
                    ]
                },

                options: {
                    responsive: true,

                    maintainAspectRatio: false,

                    plugins: {
                        legend: {
                            position: "bottom"
                        },

                        tooltip: {
                            callbacks: {
                                label:
                                    context => {
                                        return `${
                                            context.label
                                        }: ${
                                            formatMoney(
                                                context.raw
                                            )
                                        }`;
                                    }
                            }
                        }
                    }
                }
            }
        );
}


/* =========================================================
   25. GRÁFICO GASTOS
   ========================================================= */

function renderExpenseChart() {
    const canvas =
        document.getElementById(
            "expenseChart"
        );

    if (!canvas) return;

    if (
        typeof Chart ===
        "undefined"
    ) {
        return;
    }

    const groups = {};

    dashboardCache.salidas.forEach(
        item => {
            const category =
                item.categoria ||
                item.tipo ||
                "Otros";

            groups[category] =
                (groups[category] || 0) +
                Number(
                    item.monto || 0
                );
        }
    );

    const labels =
        Object.keys(groups);

    const values =
        Object.values(groups);

    if (expenseChartInstance) {
        expenseChartInstance.destroy();
    }

    expenseChartInstance =
        new Chart(
            canvas.getContext("2d"),
            {
                type: "bar",

                data: {
                    labels,

                    datasets: [
                        {
                            label: "Gastos",
                            data: values,
                            borderWidth: 1
                        }
                    ]
                },

                options: {
                    responsive: true,

                    maintainAspectRatio: false,

                    scales: {
                        y: {
                            beginAtZero: true,

                            ticks: {
                                callback:
                                    value =>
                                        formatMoney(
                                            value
                                        )
                            }
                        }
                    },

                    plugins: {
                        tooltip: {
                            callbacks: {
                                label:
                                    context =>
                                        formatMoney(
                                            context.raw
                                        )
                            }
                        }
                    }
                }
            }
        );
}


/* =========================================================
   26. REPORTES
   ========================================================= */

async function loadReports() {
    const [
        ingresos,
        salidas,
        aportes
    ] = await Promise.all([
        getTransactions("ingresos"),
        getTransactions("salidas"),
        getTransactions("aportes")
    ]);

    const income =
        calculateTotal(
            ingresos
        );

    const expenses =
        calculateTotal(
            salidas
        );

    const contributions =
        calculateTotal(
            aportes
        );

    const balance =
        income -
        expenses -
        contributions;

    setText(
        formatMoney(income),
        "[data-report-income]",
        "#reportIncome"
    );

    setText(
        formatMoney(expenses),
        "[data-report-expenses]",
        "#reportExpense"
    );

    setText(
        formatMoney(contributions),
        "[data-report-contributions]",
        "#reportContribution"
    );

    setText(
        formatMoney(balance),
        "[data-report-balance]",
        "#reportBalance"
    );
}


/* =========================================================
   27. ADMINISTRACIÓN DE USUARIOS
   ========================================================= */

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
                        ascending: false
                    }
                );

        if (error) {
            console.error(
                "❌ Error cargando usuarios:",
                error
            );

            showToast(
                "No se pudieron cargar los usuarios.",
                "error"
            );

            return;
        }

        allUsers = data || [];

        renderUsers(
            allUsers
        );

        updateUserCount(
            allUsers
        );
    } catch (error) {
        console.error(
            "❌ Error usuarios:",
            error
        );
    }
}


function renderUsers(users) {
    const container =
        getElement(
            "[data-users-list]",
            "#usersTableBody",
            "#users-list"
        );

    if (!container) return;

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

    /* Si es tbody */

    if (
        container.tagName ===
        "TBODY"
    ) {
        container.innerHTML =
            users
                .map(user => {
                    const fullName =
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
                                        width:38px;
                                        height:38px;
                                        border-radius:50%;
                                        display:flex;
                                        align-items:center;
                                        justify-content:center;
                                        font-weight:800;
                                        background:rgba(99,102,241,.12);
                                    ">
                                        ${escapeHTML(
                                            getInitials(
                                                user.nombre,
                                                user.apellido
                                            )
                                        )}
                                    </div>

                                    <div>
                                        <strong>
                                            ${escapeHTML(
                                                fullName
                                            )}
                                        </strong>

                                        <small style="
                                            display:block;
                                            opacity:.65;
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
                                    user.id !==
                                    currentUser?.id
                                        ? `
                                            <button
                                                type="button"
                                                class="user-status-btn"
                                                data-user-id="${escapeHTML(
                                                    user.id
                                                )}"
                                                title="${
                                                    active
                                                        ? "Desactivar"
                                                        : "Activar"
                                                } usuario"
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
                                        : `
                                            <span
                                                style="
                                                    opacity:.5;
                                                    font-size:12px;
                                                "
                                            >
                                                Tú
                                            </span>
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

    /* Fallback para contenedores DIV */

    container.innerHTML =
        users
            .map(user => {
                const fullName =
                    `${user.nombre || ""} ${
                        user.apellido || ""
                    }`.trim() ||
                    user.usuario ||
                    "Sin nombre";

                return `
                    <div class="user-row">
                        <strong>
                            ${escapeHTML(
                                fullName
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


function setupUserActionButtons() {
    document
        .querySelectorAll(
            ".user-status-btn"
        )
        .forEach(button => {
            button.addEventListener(
                "click",
                async () => {
                    const userId =
                        button.dataset
                            .userId;

                    if (userId) {
                        await toggleUserStatus(
                            userId
                        );
                    }
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
                item.id ===
                userId
        );

    if (!user) return;

    const currentlyActive =
        String(
            user.estado ||
                "activo"
        ).toLowerCase() ===
        "activo";

    const newStatus =
        currentlyActive
            ? "inactivo"
            : "activo";

    const confirmed =
        confirm(
            `¿Deseas ${
                currentlyActive
                    ? "desactivar"
                    : "activar"
            } a ${user.nombre || user.usuario}?`
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
                        newStatus
                })
                .eq(
                    "id",
                    userId
                );

        if (error) {
            console.error(
                "❌ Error cambiando estado:",
                error
            );

            showToast(
                "No se pudo actualizar el estado.",
                "error"
            );

            return;
        }

        user.estado =
            newStatus;

        renderUsers(
            applyUserFilters()
        );

        updateUserCount(
            allUsers
        );

        showToast(
            `Usuario ${
                newStatus ===
                "activo"
                    ? "activado"
                    : "desactivado"
            } correctamente.`,
            "success"
        );
    } catch (error) {
        console.error(
            "❌ Error estado usuario:",
            error
        );
    }
}


/* =========================================================
   28. BUSCAR Y FILTRAR USUARIOS
   ========================================================= */

function setupUserFilters() {
    const searchInput =
        getElement(
            "[data-user-search]",
            "#userSearch",
            "#user-search"
        );

    const roleFilter =
        getElement(
            "[data-user-role-filter]",
            "#userRoleFilter"
        );

    const statusFilter =
        getElement(
            "[data-user-status-filter]",
            "#userStatusFilter"
        );

    const apply =
        debounce(
            () => {
                const filtered =
                    applyUserFilters();

                renderUsers(
                    filtered
                );

                updateUserCount(
                    filtered
                );
            },
            200
        );

    searchInput?.addEventListener(
        "input",
        apply
    );

    roleFilter?.addEventListener(
        "change",
        apply
    );

    statusFilter?.addEventListener(
        "change",
        apply
    );
}


function applyUserFilters() {
    const searchInput =
        getElement(
            "[data-user-search]",
            "#userSearch",
            "#user-search"
        );

    const roleFilter =
        getElement(
            "[data-user-role-filter]",
            "#userRoleFilter"
        );

    const statusFilter =
        getElement(
            "[data-user-status-filter]",
            "#userStatusFilter"
        );

    const search =
        String(
            searchInput?.value || ""
        )
            .trim()
            .toLowerCase();

    const role =
        String(
            roleFilter?.value || ""
        )
            .trim()
            .toLowerCase();

    const status =
        String(
            statusFilter?.value || ""
        )
            .trim()
            .toLowerCase();

    return allUsers.filter(
        user => {
            const searchable = `
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

            const matchesSearch =
                !search ||
                searchable.includes(
                    search
                );

            const matchesRole =
                !role ||
                userRole ===
                    role;

            const matchesStatus =
                !status ||
                userStatus ===
                    status;

            return (
                matchesSearch &&
                matchesRole &&
                matchesStatus
            );
        }
    );
}


/* =========================================================
   29. MODAL CREAR USUARIO
   ========================================================= */

function openCreateUserModal() {
    const modal =
        document.getElementById(
            "createUserModal"
        );

    if (!modal) return;

    modal.classList.add(
        "active",
        "open",
        "show"
    );

    modal.style.display = "";

    document.body.classList.add(
        "modal-open"
    );
}


function closeCreateUserModal() {
    const modal =
        document.getElementById(
            "createUserModal"
        );

    if (!modal) return;

    modal.classList.remove(
        "active",
        "open",
        "show"
    );

    modal.style.display =
        "none";

    document.body.classList.remove(
        "modal-open"
    );
}


function setupModalEvents() {
    /* Abrir por data attribute */

    document
        .querySelectorAll(
            "[data-modal-open]"
        )
        .forEach(button => {
            button.addEventListener(
                "click",
                () => {
                    const modalId =
                        button.dataset
                            .modalOpen;

                    const modal =
                        document.getElementById(
                            modalId
                        );

                    if (modal) {
                        modal.classList.add(
                            "active",
                            "open",
                            "show"
                        );

                        modal.style.display =
                            "";
                    }
                }
            );
        });

    /* Crear usuario */

    document
        .querySelectorAll(
            "#createUserBtn, [data-create-user-open]"
        )
        .forEach(button => {
            button.addEventListener(
                "click",
                openCreateUserModal
            );
        });

    /* Cerrar */

    document
        .querySelectorAll(
            "[data-modal-close], #cancelCreateUser, #closeCreateUserModal"
        )
        .forEach(button => {
            button.addEventListener(
                "click",
                closeCreateUserModal
            );
        });

    const modal =
        document.getElementById(
            "createUserModal"
        );

    modal?.addEventListener(
        "click",
        event => {
            if (
                event.target ===
                modal
            ) {
                closeCreateUserModal();
            }
        }
    );

    const form =
        document.getElementById(
            "createUserForm"
        );

    form?.addEventListener(
        "submit",
        handleCreateUser
    );
}


/* =========================================================
   30. CREAR USUARIO
   ========================================================= */

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

    const nombre =
        document.getElementById(
            "newUserNombre"
        )?.value?.trim();

    const apellido =
        document.getElementById(
            "newUserApellido"
        )?.value?.trim();

    const usuario =
        document.getElementById(
            "newUserUsuario"
        )?.value?.trim();

    const moneda =
        document.getElementById(
            "newUserMoneda"
        )?.value ||
        "PEN";

    const email =
        document.getElementById(
            "newUserEmail"
        )?.value?.trim();

    const password =
        document.getElementById(
            "newUserPassword"
        )?.value;

    const message =
        document.getElementById(
            "createUserMessage"
        );

    const submitButton =
        document.getElementById(
            "createUserSubmit"
        );

    if (
        !nombre ||
        !apellido ||
        !usuario ||
        !email ||
        !password
    ) {
        showToast(
            "Completa todos los campos obligatorios.",
            "warning"
        );

        return;
    }

    if (password.length < 6) {
        showToast(
            "La contraseña debe tener al menos 6 caracteres.",
            "warning"
        );

        return;
    }

    const userData = {
        nombre,
        apellido,
        usuario,
        moneda,
        email,
        password
    };

    try {
        if (submitButton) {
            submitButton.disabled =
                true;

            submitButton.innerHTML =
                "Creando usuario...";
        }

        if (message) {
            message.textContent =
                "Creando usuario...";
        }

        const {
            data,
            error
        } =
            await supabaseClient.functions.invoke(
                "crear-usuario",
                {
                    body: userData
                }
            );

        if (error) {
            console.error(
                "❌ Error Edge Function:",
                error
            );

            throw error;
        }

        console.log(
            "✅ Usuario creado:",
            data
        );

        if (message) {
            message.textContent =
                "Usuario creado correctamente.";
        }

        showToast(
            "Usuario creado correctamente.",
            "success"
        );

        document
            .getElementById(
                "createUserForm"
            )
            ?.reset();

        setTimeout(
            closeCreateUserModal,
            700
        );

        await loadUsers();
    } catch (error) {
        console.error(
            "❌ Error creando usuario:",
            error
        );

        const errorMessage =
            error?.message ||
            "No se pudo crear el usuario.";

        if (message) {
            message.textContent =
                errorMessage;
        }

        showToast(
            errorMessage,
            "error"
        );
    } finally {
        if (submitButton) {
            submitButton.disabled =
                false;

            submitButton.innerHTML =
                "Crear usuario";
        }
    }
}


/* =========================================================
   31. GENERADOR DE CONTRASEÑAS
   ========================================================= */

function generateSecurePassword(
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

    for (
        let i = password.length;
        i < length;
        i++
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

    if (!button || !input) {
        return;
    }

    button.addEventListener(
        "click",
        () => {
            input.value =
                generateSecurePassword(
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


/* =========================================================
   32. ACCIONES RÁPIDAS
   ========================================================= */

function setupQuickActions() {
    document
        .querySelectorAll(
            "[data-quick-action]"
        )
        .forEach(button => {
            button.addEventListener(
                "click",
                () => {
                    const action =
                        button.dataset
                            .quickAction;

                    handleQuickAction(
                        action
                    );
                }
            );
        });
}


function handleQuickAction(
    action
) {
    switch (
        String(action || "")
            .toLowerCase()
    ) {
        case "ingreso":
        case "nuevo-ingreso":
            showSection(
                "ingresos"
            );

            showToast(
                "Sección de ingresos abierta.",
                "info"
            );

            break;

        case "salida":
        case "nuevo-salida":
            showSection(
                "salidas"
            );

            showToast(
                "Sección de salidas abierta.",
                "info"
            );

            break;

        case "aporte":
        case "nuevo-aporte":
            showSection(
                "aportes"
            );

            showToast(
                "Sección de aportes abierta.",
                "info"
            );

            break;

        case "meta":
        case "nueva-meta":
            showSection(
                "metas"
            );

            showToast(
                "Sección de metas abierta.",
                "info"
            );

            break;

        default:
            console.warn(
                "⚠️ Acción desconocida:",
                action
            );
    }
}


/* =========================================================
   33. BOTONES GENÉRICOS DE MOVIMIENTOS
   ========================================================= */

function setupTransactionButtons() {
    document
        .querySelectorAll(
            "[data-action]"
        )
        .forEach(button => {
            if (
                button.dataset
                    .transactionBound
            ) {
                return;
            }

            const action =
                String(
                    button.dataset
                        .action || ""
                ).toLowerCase();

            const validActions = [
                "nuevo-ingreso",
                "nuevo-salida",
                "nuevo-aporte",
                "nueva-meta"
            ];

            if (
                !validActions.includes(
                    action
                )
            ) {
                return;
            }

            button.dataset.transactionBound =
                "true";

            button.addEventListener(
                "click",
                () => {
                    const sectionMap = {
                        "nuevo-ingreso":
                            "ingresos",

                        "nuevo-salida":
                            "salidas",

                        "nuevo-aporte":
                            "aportes",

                        "nueva-meta":
                            "metas"
                    };

                    showSection(
                        sectionMap[
                            action
                        ]
                    );
                }
            );
        });
}


/* =========================================================
   34. TECLADO / UX
   ========================================================= */

function setupKeyboardUX() {
    document.addEventListener(
        "keydown",
        event => {
            if (
                event.key ===
                "Escape"
            ) {
                closeSidebar();
                closeCreateUserModal();
            }
        }
    );
}


/* =========================================================
   35. AUTH STATE
   ========================================================= */

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

                /*
                 * INITIAL_SESSION y SIGNED_IN
                 * son suficientes para inicializar.
                 */
                if (
                    event ===
                        "SIGNED_IN" ||
                    event ===
                        "INITIAL_SESSION"
                ) {
                    /*
                     * Evitamos trabajo duplicado
                     * cuando Supabase dispara
                     * ambos eventos.
                     */
                    await initializeAuthenticatedApp();
                }
            } else if (
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


/* =========================================================
   36. EVENTOS PRINCIPALES
   ========================================================= */

function setupMainEvents() {
    loginForm?.addEventListener(
        "submit",
        handleLogin
    );

    logoutButton?.addEventListener(
        "click",
        logout
    );
}


/* =========================================================
   37. DETECTAR CAMBIO DE TAMAÑO
   ========================================================= */

function setupResponsiveUX() {
    window.addEventListener(
        "resize",
        debounce(() => {
            if (
                window.innerWidth >
                1024
            ) {
                closeSidebar();
            }
        }, 150)
    );
}


/* =========================================================
   38. INICIALIZACIÓN
   ========================================================= */

async function init() {
    console.log(
        "💰 FinanzasPersonales listo."
    );

    injectRuntimeStyles();

    setupMainEvents();

    setupPasswordToggle();

    setupNavigation();

    setupSidebar();

    setupTheme();

    setupModalEvents();

    setupPasswordGenerator();

    setupUserFilters();

    setupQuickActions();

    setupTransactionButtons();

    setupKeyboardUX();

    setupResponsiveUX();

    setupAuthListener();

    await checkSession();
}


/* =========================================================
   39. API GLOBAL
   ========================================================= */

window.FinanzasApp = {
    getCurrentUser: () =>
        currentUser,

    getCurrentProfile: () =>
        currentProfile,

    isAdmin,

    formatMoney,

    formatDate,

    showToast,

    showSection,

    loadDashboard,

    loadUsers,

    loadGoalsPage,

    loadReports,

    logout,

    openCreateUserModal,

    closeCreateUserModal
};


/* =========================================================
   40. ARRANQUE
   ========================================================= */

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
