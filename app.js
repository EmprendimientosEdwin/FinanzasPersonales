/* =========================================================
   FINANZASPERSONALES
   app.js
   ========================================================= */

/* =========================================================
   1. CONFIGURACIÓN SUPABASE
   ========================================================= */

const SUPABASE_URL = "https://xwkxgrktsdejoaqnbiwk.supabase.co";

const SUPABASE_ANON_KEY =
    "sb_publishable_DYl24WF6mNud6QsS4nhhYA_53ohH191";

let supabaseClient = null;


/* =========================================================
   INICIALIZAR SUPABASE
========================================================= */

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

    if (!window.supabase) {
        console.error(
            "❌ La librería Supabase no fue cargada."
        );
    }

    if (!SUPABASE_URL) {
        console.error(
            "❌ SUPABASE_URL está vacío."
        );
    }

    if (!SUPABASE_ANON_KEY) {
        console.error(
            "❌ SUPABASE_ANON_KEY está vacío."
        );
    }
}

/* =========================================================
   2. VARIABLES GLOBALES
   ========================================================= */

let currentUser = null;
let currentProfile = null;

let flowChart = null;
let expenseChart = null;

let allUsers = [];


/* =========================================================
   3. ELEMENTOS DEL DOM
   ========================================================= */

const loginScreen = document.getElementById("loginScreen");
const appContainer = document.getElementById("appContainer");

const loginForm = document.getElementById("loginForm");
const loginEmail = document.getElementById("loginEmail");
const loginPassword = document.getElementById("loginPassword");

const passwordToggle = document.getElementById("passwordToggle");

const logoutButton = document.getElementById("logoutBtn");

const sidebar = document.getElementById("sidebar");
const sidebarOverlay = document.getElementById("sidebarOverlay");

const mobileMenuButton = document.getElementById("mobileMenuBtn");
const sidebarCloseButton = document.getElementById("sidebarClose");

const navItems = document.querySelectorAll("[data-section]");
const pageSections = document.querySelectorAll(".page-section");

/* =========================================================
   4. INICIALIZACIÓN
   ========================================================= */

document.addEventListener("DOMContentLoaded", async () => {
    console.log("🚀 FinanzasPersonales - JavaScript cargado correctamente");

    initializeUI();

    if (!supabaseClient) {
        console.error("❌ Supabase no está disponible.");
        showToast(
            "No se pudo conectar con la base de datos.",
            "error"
        );
        return;
    }

    await checkSession();
});


/* =========================================================
   5. CONFIGURACIÓN GENERAL DE LA INTERFAZ
   ========================================================= */

function initializeUI() {
    setupLogin();
    setupNavigation();
    setupSidebar();
    setupPasswordToggle();
    setupLogout();
    setupThemeToggle();
    setupModalEvents();
    setupQuickActions();
    setupUserSearch();
    setupUserFilters();
    setupPasswordGenerator();
    setupEscapeKey();

    console.log("✅ Interfaz inicializada");
}


/* =========================================================
   6. AUTENTICACIÓN
   ========================================================= */

async function checkSession() {
    try {
        const {
            data: { session },
            error
        } = await supabaseClient.auth.getSession();

        if (error) {
            console.error("❌ Error obteniendo sesión:", error);
            showLogin();
            return;
        }

        if (session?.user) {
            currentUser = session.user;

            console.log("👤 Sesión encontrada:", currentUser.email);

            await initializeAuthenticatedApp();
        } else {
            showLogin();
        }
    } catch (error) {
        console.error("❌ Error verificando sesión:", error);
        showLogin();
    }
}


/* =========================================================
   7. LISTENER DE CAMBIOS DE AUTENTICACIÓN
   ========================================================= */

if (supabaseClient) {
    supabaseClient.auth.onAuthStateChange(
        async (event, session) => {
            console.log(
                "🔐 Cambio de autenticación:",
                event
            );

            if (
                event === "SIGNED_IN" &&
                session?.user
            ) {
                currentUser = session.user;

                await initializeAuthenticatedApp();
            }

            if (event === "SIGNED_OUT") {
                currentUser = null;
                currentProfile = null;

                showLogin();
            }
        }
    );
}

/* =========================================================
   8. LOGIN
   ========================================================= */

function setupLogin() {
    if (!loginForm) {
        console.warn("⚠️ No se encontró #login-form");
        return;
    }

    loginForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const email = loginEmail?.value.trim();
        const password = loginPassword?.value;

        if (!email || !password) {
            showToast(
                "Ingresa tu correo y contraseña.",
                "warning"
            );
            return;
        }

        setLoginLoading(true);

        try {
            const {
                data,
                error
            } = await supabaseClient.auth.signInWithPassword({
                email,
                password
            });

            if (error) {
                console.error("❌ Error de login:", error);

                showToast(
                    getFriendlyAuthError(error),
                    "error"
                );

                return;
            }

            currentUser = data.user;

            console.log(
                "✅ Inicio de sesión exitoso:",
                currentUser.email
            );

            await initializeAuthenticatedApp();

        } catch (error) {
            console.error("❌ Error inesperado:", error);

            showToast(
                "Ocurrió un error al iniciar sesión.",
                "error"
            );
        } finally {
            setLoginLoading(false);
        }
    });
}


/* =========================================================
   9. INICIALIZAR APLICACIÓN AUTENTICADA
   ========================================================= */

async function initializeAuthenticatedApp() {
    if (!currentUser) {
        showLogin();
        return;
    }

    showLoadingApp();

    try {
        const profileLoaded = await loadCurrentProfile();

        if (!profileLoaded) {
            await supabaseClient.auth.signOut();

            showToast(
                "No se encontró tu perfil de usuario.",
                "error"
            );

            showLogin();

            return;
        }

        if (
            currentProfile.estado &&
            String(currentProfile.estado).toLowerCase() === "inactivo"
        ) {
            showToast(
                "Tu cuenta está desactivada.",
                "error"
            );

            await supabaseClient.auth.signOut();

            return;
        }

        updateUserInterface();
        showApp();

        await loadDashboard();

        if (isAdmin()) {
            await loadUsers();
        }

        console.log("✅ Aplicación autenticada correctamente");

    } catch (error) {
        console.error(
            "❌ Error inicializando aplicación:",
            error
        );

        showToast(
            "No se pudo cargar tu información.",
            "error"
        );
    }
}


/* =========================================================
   10. CARGAR PERFIL
   ========================================================= */

async function loadCurrentProfile() {
    try {
        const {
            data,
            error
        } = await supabaseClient
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
                avatar_url
            `)
            .eq("id", currentUser.id)
            .maybeSingle();

        if (error) {
            console.error(
                "❌ Error cargando perfil:",
                error
            );

            return false;
        }

        if (!data) {
            console.warn(
                "⚠️ No existe perfil para:",
                currentUser.id
            );

            return false;
        }

        currentProfile = data;

        console.log(
            "✅ Perfil cargado:",
            currentProfile
        );

        return true;

    } catch (error) {
        console.error(
            "❌ Error inesperado cargando perfil:",
            error
        );

        return false;
    }
}


/* =========================================================
   11. ACTUALIZAR INTERFAZ DEL USUARIO
   ========================================================= */

function updateUserInterface() {
    if (!currentProfile) return;

    const fullName = [
        currentProfile.nombre,
        currentProfile.apellido
    ]
        .filter(Boolean)
        .join(" ");

    const displayName =
        fullName ||
        currentProfile.usuario ||
        currentProfile.email ||
        "Usuario";

    const role = currentProfile.rol || "usuario";

    const initials = getInitials(displayName);

    document.querySelectorAll("[data-user-name]")
        .forEach((element) => {
            element.textContent = displayName;
        });

    document.querySelectorAll("[data-user-role]")
        .forEach((element) => {
            element.textContent = formatRole(role);
        });

    document.querySelectorAll("[data-user-email]")
        .forEach((element) => {
            element.textContent =
                currentProfile.email || currentUser.email || "";
        });

    document.querySelectorAll("[data-user-initials]")
        .forEach((element) => {
            element.textContent = initials;
        });

    document.querySelectorAll("[data-welcome-name]")
        .forEach((element) => {
            element.textContent =
                currentProfile.nombre ||
                currentProfile.usuario ||
                "Usuario";
        });

    document.querySelectorAll("[data-account-role]")
        .forEach((element) => {
            element.textContent = formatRole(role);
        });

    document.querySelectorAll("[data-user-avatar]")
        .forEach((element) => {
            if (currentProfile.avatar_url) {
                element.src = currentProfile.avatar_url;
                element.style.display = "block";
            }
        });

    const adminItems = document.querySelectorAll(
        '[data-admin-only], .admin-only'
    );

    adminItems.forEach((element) => {
        element.style.display = isAdmin()
            ? ""
            : "none";
    });
}


/* =========================================================
   12. MOSTRAR / OCULTAR PANTALLAS
   ========================================================= */

function showLogin() {
    if (loginScreen) {
        loginScreen.style.display = "";
        loginScreen.classList.remove("hidden");
    }

    if (appContainer) {
        appContainer.style.display = "none";
        appContainer.classList.add("hidden");
    }
}


function showLoadingApp() {
    if (loginScreen) {
        loginScreen.style.display = "none";
        loginScreen.classList.add("hidden");
    }

    if (appContainer) {
        appContainer.style.display = "";
        appContainer.classList.remove("hidden");
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


/* =========================================================
   13. LOADING LOGIN
   ========================================================= */

function setLoginLoading(loading) {
    if (!loginForm) return;

    const button =
        loginForm.querySelector(
            'button[type="submit"]'
        );

    if (!button) return;

    if (loading) {
        button.disabled = true;

        if (!button.dataset.originalText) {
            button.dataset.originalText =
                button.innerHTML;
        }

        button.innerHTML = `
            <span class="spinner"></span>
            Iniciando sesión...
        `;
    } else {
        button.disabled = false;

        if (button.dataset.originalText) {
            button.innerHTML =
                button.dataset.originalText;
        }
    }
}


/* =========================================================
   14. VISIBILIDAD DE CONTRASEÑA
   ========================================================= */

function setupPasswordToggle() {
    if (!passwordToggle || !loginPassword) return;

    passwordToggle.addEventListener(
        "click",
        () => {
            const isPassword =
                loginPassword.type === "password";

            loginPassword.type =
                isPassword ? "text" : "password";

            const icon =
                passwordToggle.querySelector("i");

            if (icon) {
                icon.classList.toggle(
                    "fa-eye",
                    !isPassword
                );

                icon.classList.toggle(
                    "fa-eye-slash",
                    isPassword
                );
            }

            passwordToggle.setAttribute(
                "aria-label",
                isPassword
                    ? "Ocultar contraseña"
                    : "Mostrar contraseña"
            );
        }
    );
}


/* =========================================================
   15. NAVEGACIÓN
   ========================================================= */
function setupNavigation() {
    navItems.forEach((item) => {
        item.addEventListener(
            "click",
            (event) => {
                event.preventDefault();

                const section =
                    item.dataset.section;

                if (!section) return;

                showSection(section);

                closeSidebar();
            }
        );
    });

    document
        .querySelectorAll("[data-navigate]")
        .forEach((element) => {
            element.addEventListener(
                "click",
                (event) => {
                    event.preventDefault();

                    const section =
                        element.dataset.navigate;

                    if (section) {
                        showSection(section);
                    }
                }
            );
        });
}


async function showSection(sectionName) {
    if (!sectionName) return;

    pageSections.forEach((section) => {
        section.classList.remove("active");

        if (
            section.id === sectionName ||
            section.dataset.section === sectionName
        ) {
            section.classList.add("active");
        }
    });

    navItems.forEach((item) => {
        item.classList.toggle(
            "active",
            item.dataset.section === sectionName
        );
    });

    updatePageTitle(sectionName);

    try {
        switch (sectionName) {
            case "dashboard":
            case "inicio":
                await loadDashboard();
                break;

            case "metas":
                await loadGoalsPage();
                break;

            case "reportes":
                await loadReports();
                break;

            case "usuarios":
                if (isAdmin()) {
                    await loadUsers();
                }
                break;

            default:
                break;
        }
    } catch (error) {
        console.error(
            "Error cargando sección:",
            error
        );
    }
}


function updatePageTitle(sectionName) {
    const titles = {
        dashboard: "Dashboard",
        inicio: "Dashboard",
        ingresos: "Ingresos",
        salidas: "Salidas",
        aportes: "Aportes",
        otros: "Otros movimientos",
        metas: "Metas financieras",
        reportes: "Reportes",
        usuarios: "Usuarios",
        configuracion: "Configuración"
    };

    const title =
        titles[sectionName] ||
        "FinanzasPersonales";

    document
        .querySelectorAll("[data-page-title]")
        .forEach((element) => {
            element.textContent = title;
        });
}


/* =========================================================
   16. SIDEBAR
   ========================================================= */

function setupSidebar() {
    if (mobileMenuButton) {
        mobileMenuButton.addEventListener(
            "click",
            openSidebar
        );
    }

    if (sidebarCloseButton) {
        sidebarCloseButton.addEventListener(
            "click",
            closeSidebar
        );
    }

    if (sidebarOverlay) {
        sidebarOverlay.addEventListener(
            "click",
            closeSidebar
        );
    }
}


function openSidebar() {
    sidebar?.classList.add("open");
    sidebarOverlay?.classList.add("active");
    document.body.classList.add("sidebar-open");
}


function closeSidebar() {
    sidebar?.classList.remove("open");
    sidebarOverlay?.classList.remove("active");
    document.body.classList.remove("sidebar-open");
}


/* =========================================================
   17. LOGOUT
   ========================================================= */

function setupLogout() {
    if (!logoutButton) return;

    logoutButton.addEventListener(
        "click",
        async (event) => {
            event.preventDefault();

            try {
                const {
                    error
                } = await supabaseClient.auth.signOut();

                if (error) {
                    throw error;
                }

                currentUser = null;
                currentProfile = null;

                closeSidebar();

                showToast(
                    "Sesión cerrada correctamente.",
                    "success"
                );

                showLogin();

            } catch (error) {
                console.error(
                    "❌ Error cerrando sesión:",
                    error
                );

                showToast(
                    "No se pudo cerrar la sesión.",
                    "error"
                );
            }
        }
    );
}


/* =========================================================
   18. DASHBOARD
   ========================================================= */

async function loadDashboard() {
    if (!currentUser) return;

    try {
        const [
            ingresos,
            salidas,
            aportes
        ] = await Promise.all([
            getTransactions("ingresos"),
            getTransactions("salidas"),
            getTransactions("aportes")
        ]);

        const totalIngresos =
            sumAmounts(ingresos);

        const totalSalidas =
            sumAmounts(salidas);

        const totalAportes =
            sumAmounts(aportes);

        const balance =
            totalIngresos -
            totalSalidas -
            totalAportes;

        updateDashboardNumbers({
            totalIngresos,
            totalSalidas,
            totalAportes,
            balance
        });

        await loadFlowChart(
            ingresos,
            salidas,
            aportes
        );

        await loadRecentActivity(
            ingresos,
            salidas,
            aportes
        );

        await loadGoalsPreview();

    } catch (error) {
        console.error(
            "❌ Error cargando dashboard:",
            error
        );

        showToast(
            "No se pudo cargar el dashboard.",
            "error"
        );
    }
}


/* =========================================================
   19. OBTENER TRANSACCIONES
   ========================================================= */

async function getTransactions(tableName) {
    const {
        data,
        error
    } = await supabaseClient
        .from(tableName)
        .select("*")
        .eq("usuario_id", currentUser.id)
        .order("created_at", {
            ascending: false
        });

    if (error) {
        console.error(
            `Error cargando ${tableName}:`,
            error
        );

        return [];
    }

    return data || [];
}


/* =========================================================
   20. ACTUALIZAR NÚMEROS DASHBOARD
   ========================================================= */

function updateDashboardNumbers({
    totalIngresos,
    totalSalidas,
    totalAportes,
    balance
}) {
    setText(
        "[data-total-income]",
        formatMoney(totalIngresos)
    );

    setText(
        "[data-total-expenses]",
        formatMoney(totalSalidas)
    );

    setText(
        "[data-total-contributions]",
        formatMoney(totalAportes)
    );

    setText(
        "[data-balance]",
        formatMoney(balance)
    );

    setText(
        "#total-ingresos",
        formatMoney(totalIngresos)
    );

    setText(
        "#total-salidas",
        formatMoney(totalSalidas)
    );

    setText(
        "#total-aportes",
        formatMoney(totalAportes)
    );

    setText(
        "#balance",
        formatMoney(balance)
    );
}


/* =========================================================
   21. GRÁFICO DE FLUJO
   ========================================================= */

async function loadFlowChart(
    ingresos,
    salidas,
    aportes
) {
    const canvas =
        document.getElementById("flowChart");

    if (!canvas || !window.Chart) return;

    const labels = [
        "Ingresos",
        "Salidas",
        "Aportes"
    ];

    const values = [
        sumAmounts(ingresos),
        sumAmounts(salidas),
        sumAmounts(aportes)
    ];

    if (flowChart) {
        flowChart.destroy();
    }

    flowChart = new Chart(canvas, {
        type: "doughnut",

        data: {
            labels,

            datasets: [
                {
                    data: values
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
                        label: function (context) {
                            const value =
                                context.raw || 0;

                            return ` ${context.label}: ${formatMoney(value)}`;
                        }
                    }
                }
            }
        }
    });
}


/* =========================================================
   22. ACTIVIDAD RECIENTE
   ========================================================= */

async function loadRecentActivity(
    ingresos,
    salidas,
    aportes
) {
    const container =
        document.querySelector(
            "[data-recent-activity]"
        ) ||
        document.getElementById(
            "recent-activity"
        );

    if (!container) return;

    const activities = [
        ...ingresos.map((item) => ({
            ...item,
            type: "Ingreso"
        })),

        ...salidas.map((item) => ({
            ...item,
            type: "Salida"
        })),

        ...aportes.map((item) => ({
            ...item,
            type: "Aporte"
        }))
    ]
        .sort(
            (a, b) =>
                new Date(
                    b.created_at ||
                    b.fecha ||
                    0
                ) -
                new Date(
                    a.created_at ||
                    a.fecha ||
                    0
                )
        )
        .slice(0, 8);

    if (!activities.length) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-receipt"></i>
                <p>Aún no tienes movimientos registrados.</p>
            </div>
        `;

        return;
    }

    container.innerHTML = activities
        .map((item) => {
            const amount =
                Number(
                    item.monto ??
                    item.amount ??
                    item.valor ??
                    0
                );

            const description =
                item.descripcion ||
                item.nombre ||
                item.concepto ||
                item.categoria ||
                "Movimiento";

            return `
                <div class="activity-item">
                    <div class="activity-icon">
                        <i class="fas ${
                            item.type === "Ingreso"
                                ? "fa-arrow-down"
                                : item.type === "Salida"
                                    ? "fa-arrow-up"
                                    : "fa-piggy-bank"
                        }"></i>
                    </div>

                    <div class="activity-info">
                        <strong>
                            ${escapeHTML(description)}
                        </strong>

                        <span>
                            ${escapeHTML(item.type)}
                            ·
                            ${formatDate(
                                item.created_at ||
                                item.fecha
                            )}
                        </span>
                    </div>

                    <div class="activity-amount">
                        ${formatMoney(amount)}
                    </div>
                </div>
            `;
        })
        .join("");
}


/* =========================================================
   23. METAS - VISTA PREVIA
   ========================================================= */

async function loadGoalsPreview() {
    const container =
        document.querySelector(
            "[data-goals-preview]"
        ) ||
        document.getElementById(
            "goals-preview"
        );

    if (!container) return;

    try {
        const {
            data,
            error
        } = await supabaseClient
            .from("metas")
            .select("*")
            .eq("usuario_id", currentUser.id)
            .order("created_at", {
                ascending: false
            })
            .limit(3);

        if (error) {
            console.error(
                "Error cargando metas:",
                error
            );

            return;
        }

        const goals = data || [];

        if (!goals.length) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-bullseye"></i>
                    <p>No tienes metas creadas todavía.</p>
                </div>
            `;

            return;
        }

        container.innerHTML = goals
            .map(renderGoalCard)
            .join("");

    } catch (error) {
        console.error(
            "Error cargando vista previa de metas:",
            error
        );
    }
}


/* =========================================================
   24. PÁGINA DE METAS
   ========================================================= */

async function loadGoalsPage() {
    const container =
        document.querySelector(
            "[data-goals-list]"
        ) ||
        document.getElementById(
            "goals-list"
        );

    if (!container) return;

    try {
        const {
            data,
            error
        } = await supabaseClient
            .from("metas")
            .select("*")
            .eq("usuario_id", currentUser.id)
            .order("created_at", {
                ascending: false
            });

        if (error) {
            throw error;
        }

        const goals = data || [];

        if (!goals.length) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-bullseye"></i>
                    <h3>Sin metas todavía</h3>
                    <p>Crea tu primera meta financiera.</p>
                </div>
            `;

            return;
        }

        container.innerHTML =
            goals.map(renderGoalCard).join("");

    } catch (error) {
        console.error(
            "❌ Error cargando metas:",
            error
        );

        showToast(
            "No se pudieron cargar las metas.",
            "error"
        );
    }
}


/* =========================================================
   25. RENDER META
   ========================================================= */

function renderGoalCard(goal) {
    const target =
        Number(
            goal.monto_objetivo ??
            goal.objetivo ??
            goal.meta ??
            0
        );

    const current =
        Number(
            goal.monto_actual ??
            goal.actual ??
            goal.ahorrado ??
            0
        );

    const percentage =
        target > 0
            ? Math.min(
                100,
                Math.max(
                    0,
                    (current / target) * 100
                )
            )
            : 0;

    const name =
        goal.nombre ||
        goal.titulo ||
        "Meta financiera";

    return `
        <div class="goal-card">

            <div class="goal-header">
                <div>
                    <h3>
                        ${escapeHTML(name)}
                    </h3>

                    ${
                        goal.descripcion
                            ? `<p>${escapeHTML(goal.descripcion)}</p>`
                            : ""
                    }
                </div>

                <span class="goal-percentage">
                    ${percentage.toFixed(0)}%
                </span>
            </div>

            <div class="goal-progress">
                <div
                    class="goal-progress-bar"
                    style="width: ${percentage}%"
                ></div>
            </div>

            <div class="goal-values">
                <span>
                    ${formatMoney(current)}
                </span>

                <span>
                    ${formatMoney(target)}
                </span>
            </div>

        </div>
    `;
}


/* =========================================================
   26. REPORTES
   ========================================================= */

async function loadReports() {
    if (!currentUser) return;

    try {
        const [
            ingresos,
            salidas,
            aportes
        ] = await Promise.all([
            getTransactions("ingresos"),
            getTransactions("salidas"),
            getTransactions("aportes")
        ]);

        const totalIngresos =
            sumAmounts(ingresos);

        const totalSalidas =
            sumAmounts(salidas);

        const totalAportes =
            sumAmounts(aportes);

        const balance =
            totalIngresos -
            totalSalidas -
            totalAportes;

        setText(
            "[data-report-income]",
            formatMoney(totalIngresos)
        );

        setText(
            "[data-report-expenses]",
            formatMoney(totalSalidas)
        );

        setText(
            "[data-report-contributions]",
            formatMoney(totalAportes)
        );

        setText(
            "[data-report-balance]",
            formatMoney(balance)
        );

        loadExpenseChart(salidas);

    } catch (error) {
        console.error(
            "❌ Error cargando reportes:",
            error
        );
    }
}


/* =========================================================
   27. GRÁFICO DE GASTOS
   ========================================================= */

function loadExpenseChart(salidas) {
    const canvas =
        document.getElementById(
            "expenseChart"
        );

    if (!canvas || !window.Chart) return;

    const grouped = {};

    salidas.forEach((item) => {
        const category =
            item.categoria ||
            item.tipo ||
            item.descripcion ||
            "Otros";

        const amount =
            Number(
                item.monto ??
                item.amount ??
                0
            );

        grouped[category] =
            (grouped[category] || 0) +
            amount;
    });

    const labels =
        Object.keys(grouped);

    const values =
        Object.values(grouped);

    if (expenseChart) {
        expenseChart.destroy();
    }

    expenseChart = new Chart(canvas, {
        type: "bar",

        data: {
            labels,

            datasets: [
                {
                    label: "Gastos",
                    data: values
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
                        callback: function (value) {
                            return formatMoney(value);
                        }
                    }
                }
            }
        }
    });
}


/* =========================================================
   28. ADMINISTRACIÓN DE USUARIOS
   ========================================================= */

function isAdmin() {
    if (!currentProfile) return false;

    const role =
        String(
            currentProfile.rol || ""
        ).toLowerCase();

    return [
        "admin",
        "administrador",
        "superadmin"
    ].includes(role);
}


async function loadUsers() {
    if (!isAdmin()) return;

    const container =
        document.querySelector(
            "[data-users-list]"
        ) ||
        document.getElementById(
            "users-list"
        );

    if (!container) return;

    try {
        const {
            data,
            error
        } = await supabaseClient
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
            .order("created_at", {
                ascending: false
            });

        if (error) {
            throw error;
        }

        allUsers = data || [];

        renderUsers(allUsers);

        updateUserCount(allUsers);

    } catch (error) {
        console.error(
            "❌ Error cargando usuarios:",
            error
        );

        showToast(
            "No se pudieron cargar los usuarios.",
            "error"
        );
    }
}


/* =========================================================
   29. RENDER USUARIOS
   ========================================================= */

function renderUsers(users) {
    const container =
        document.querySelector(
            "[data-users-list]"
        ) ||
        document.getElementById(
            "users-list"
        );

    if (!container) return;

    if (!users.length) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-users"></i>
                <h3>No se encontraron usuarios</h3>
                <p>Prueba con otro criterio de búsqueda.</p>
            </div>
        `;

        return;
    }

    container.innerHTML = users
        .map((user) => {
            const name = [
                user.nombre,
                user.apellido
            ]
                .filter(Boolean)
                .join(" ") ||
                user.usuario ||
                "Usuario";

            const status =
                String(
                    user.estado || "activo"
                ).toLowerCase();

            const role =
                String(
                    user.rol || "usuario"
                ).toLowerCase();

            return `
                <div
                    class="user-row"
                    data-user-id="${escapeHTML(user.id)}"
                >

                    <div class="user-avatar">
                        ${escapeHTML(
                            getInitials(name)
                        )}
                    </div>

                    <div class="user-info">
                        <strong>
                            ${escapeHTML(name)}
                        </strong>

                        <span>
                            ${escapeHTML(
                                user.email || ""
                            )}
                        </span>
                    </div>

                    <div class="user-role">
                        <span class="badge role-${escapeHTML(role)}">
                            ${escapeHTML(
                                formatRole(role)
                            )}
                        </span>
                    </div>

                    <div class="user-status">
                        <span class="badge ${
                            status === "activo"
                                ? "badge-success"
                                : "badge-danger"
                        }">
                            ${
                                status === "activo"
                                    ? "Activo"
                                    : "Inactivo"
                            }
                        </span>
                    </div>

                    <div class="user-actions">
                        ${
                            user.id !== currentUser.id
                                ? `
                                    <button
                                        type="button"
                                        class="btn-toggle-user"
                                        data-toggle-user="${escapeHTML(
                                            user.id
                                        )}"
                                    >
                                        ${
                                            status === "activo"
                                                ? "Desactivar"
                                                : "Activar"
                                        }
                                    </button>
                                `
                                : `
                                    <span class="current-user-label">
                                        Tú
                                    </span>
                                `
                        }
                    </div>

                </div>
            `;
        })
        .join("");

    container
        .querySelectorAll(
            "[data-toggle-user]"
        )
        .forEach((button) => {
            button.addEventListener(
                "click",
                async () => {
                    await toggleUserStatus(
                        button.dataset.toggleUser
                    );
                }
            );
        });
}


/* =========================================================
   30. CAMBIAR ESTADO USUARIO
   ========================================================= */

async function toggleUserStatus(userId) {
    if (!isAdmin()) return;

    const user =
        allUsers.find(
            (item) =>
                item.id === userId
        );

    if (!user) return;

    const currentStatus =
        String(
            user.estado || "activo"
        ).toLowerCase();

    const newStatus =
        currentStatus === "activo"
            ? "inactivo"
            : "activo";

    try {
        const {
            error
        } = await supabaseClient
            .from("profiles")
            .update({
                estado: newStatus
            })
            .eq("id", userId);

        if (error) {
            throw error;
        }

        showToast(
            newStatus === "activo"
                ? "Usuario activado."
                : "Usuario desactivado.",
            "success"
        );

        await loadUsers();

    } catch (error) {
        console.error(
            "❌ Error actualizando usuario:",
            error
        );

        showToast(
            "No se pudo actualizar el usuario.",
            "error"
        );
    }
}


/* =========================================================
   31. BÚSQUEDA DE USUARIOS
   ========================================================= */

function setupUserSearch() {
    const searchInput =
        document.querySelector(
            "[data-user-search]"
        ) ||
        document.getElementById(
            "user-search"
        );

    if (!searchInput) return;

    searchInput.addEventListener(
        "input",
        applyUserFilters
    );
}


/* =========================================================
   32. FILTROS USUARIOS
   ========================================================= */

function setupUserFilters() {
    document
        .querySelectorAll(
            "[data-user-filter]"
        )
        .forEach((filter) => {
            filter.addEventListener(
                "change",
                applyUserFilters
            );
        });
}


function applyUserFilters() {
    const searchInput =
        document.querySelector(
            "[data-user-search]"
        ) ||
        document.getElementById(
            "user-search"
        );

    const search =
        searchInput?.value
            .trim()
            .toLowerCase() || "";

    const roleFilter =
        document.querySelector(
            "[data-user-filter='role']"
        )?.value || "all";

    const statusFilter =
        document.querySelector(
            "[data-user-filter='status']"
        )?.value || "all";

    const filtered =
        allUsers.filter((user) => {
            const name = [
                user.nombre,
                user.apellido,
                user.usuario,
                user.email
            ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();

            const role =
                String(
                    user.rol || ""
                ).toLowerCase();

            const status =
                String(
                    user.estado || ""
                ).toLowerCase();

            const matchesSearch =
                !search ||
                name.includes(search);

            const matchesRole =
                roleFilter === "all" ||
                role === roleFilter;

            const matchesStatus =
                statusFilter === "all" ||
                status === statusFilter;

            return (
                matchesSearch &&
                matchesRole &&
                matchesStatus
            );
        });

    renderUsers(filtered);
}


/* =========================================================
   33. CONTADOR DE USUARIOS
   ========================================================= */

function updateUserCount(users) {
    const active =
        users.filter(
            (user) =>
                String(
                    user.estado || "activo"
                ).toLowerCase() === "activo"
        ).length;

    const total =
        users.length;

    setText(
        "[data-user-count]",
        total
    );

    setText(
        "[data-active-user-count]",
        active
    );
}


/* =========================================================
   34. CREAR USUARIO
   ========================================================= */

async function handleCreateUser(event) {
    event.preventDefault();

    if (!isAdmin()) {
        showToast(
            "No tienes permisos para crear usuarios.",
            "error"
        );

        return;
    }

    const form =
        event.currentTarget;

    const formData =
        new FormData(form);

    const userData = {
        nombre:
            formData.get("nombre")?.trim(),

        apellido:
            formData.get("apellido")?.trim(),

        usuario:
            formData.get("usuario")?.trim(),

        email:
            formData.get("email")?.trim(),

        password:
            formData.get("password"),

        moneda:
            formData.get("moneda") || "PEN"
    };

    if (
        !userData.nombre ||
        !userData.email ||
        !userData.password
    ) {
        showToast(
            "Completa los campos obligatorios.",
            "warning"
        );

        return;
    }

    try {
        const {
            data,
            error
        } = await supabaseClient.functions.invoke(
            "crear-usuario",
            {
                body: userData
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

        form.reset();

        closeAllModals();

        await loadUsers();

    } catch (error) {
        console.error(
            "❌ Error creando usuario:",
            error
        );

        showToast(
            error?.message ||
            "No se pudo crear el usuario.",
            "error"
        );
    }
}


/* =========================================================
   35. GENERADOR DE CONTRASEÑAS
   ========================================================= */

function setupPasswordGenerator() {
    document
        .querySelectorAll(
            "[data-generate-password]"
        )
        .forEach((button) => {
            button.addEventListener(
                "click",
                () => {
                    const password =
                        generatePassword(12);

                    const input =
                        document.querySelector(
                            "[data-password-input]"
                        ) ||
                        document.getElementById(
                            "new-password"
                        );

                    if (input) {
                        input.value =
                            password;

                        input.dispatchEvent(
                            new Event(
                                "input",
                                {
                                    bubbles: true
                                }
                            )
                        );
                    }
                }
            );
        });
}


function generatePassword(length = 12) {
    const characters =
        "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";

    let result = "";

    for (let i = 0; i < length; i++) {
        result += characters.charAt(
            Math.floor(
                Math.random() *
                characters.length
            )
        );
    }

    return result;
}


/* =========================================================
   36. MODALES
   ========================================================= */

function setupModalEvents() {
    document
        .querySelectorAll(
            "[data-modal-open]"
        )
        .forEach((button) => {
            button.addEventListener(
                "click",
                () => {
                    openModal(
                        button.dataset.modalOpen
                    );
                }
            );
        });

    document
        .querySelectorAll(
            "[data-modal-close]"
        )
        .forEach((button) => {
            button.addEventListener(
                "click",
                () => {
                    closeModal(
                        button.dataset.modalClose
                    );
                }
            );
        });

    document
        .querySelectorAll(".modal-overlay")
        .forEach((overlay) => {
            overlay.addEventListener(
                "click",
                (event) => {
                    if (
                        event.target ===
                        overlay
                    ) {
                        overlay.classList.remove(
                            "active"
                        );
                    }
                }
            );
        });

    document
        .querySelectorAll("form[data-create-user]")
        .forEach((form) => {
            form.addEventListener(
                "submit",
                handleCreateUser
            );
        });
}


function openModal(modalId) {
    const modal =
        document.getElementById(
            modalId
        );

    if (!modal) return;

    modal.classList.add("active");

    document.body.classList.add(
        "modal-open"
    );
}


function closeModal(modalId) {
    const modal =
        document.getElementById(
            modalId
        );

    if (!modal) return;

    modal.classList.remove(
        "active"
    );

    document.body.classList.remove(
        "modal-open"
    );
}


function closeAllModals() {
    document
        .querySelectorAll(
            ".modal-overlay.active"
        )
        .forEach((modal) => {
            modal.classList.remove(
                "active"
            );
        });

    document.body.classList.remove(
        "modal-open"
    );
}


/* =========================================================
   37. ACCIONES RÁPIDAS
   ========================================================= */

function setupQuickActions() {
    document
        .querySelectorAll(
            "[data-quick-action]"
        )
        .forEach((button) => {
            button.addEventListener(
                "click",
                () => {
                    const action =
                        button.dataset.quickAction;

                    handleQuickAction(action);
                }
            );
        });
}


function handleQuickAction(action) {
    const actions = {
        ingreso: "ingresos",
        ingresos: "ingresos",

        salida: "salidas",
        salidas: "salidas",

        aporte: "aportes",
        aportes: "aportes",

        meta: "metas",
        metas: "metas",

        reporte: "reportes",
        reportes: "reportes",

        usuario: "usuarios",
        usuarios: "usuarios"
    };

    const section =
        actions[action];

    if (section) {
        showSection(section);
    }
}


/* =========================================================
   38. TEMA
   ========================================================= */

function setupThemeToggle() {
    const buttons =
        document.querySelectorAll(
            "[data-theme-toggle]"
        );

    if (!buttons.length) return;

    const savedTheme =
        localStorage.getItem(
            "finanzas-theme"
        );

    if (savedTheme) {
        applyTheme(savedTheme);
    } else {
        const systemDark =
            window.matchMedia &&
            window.matchMedia(
                "(prefers-color-scheme: dark)"
            ).matches;

        applyTheme(
            systemDark
                ? "dark"
                : "light"
        );
    }

    buttons.forEach((button) => {
        button.addEventListener(
            "click",
            () => {
                const current =
                    document.documentElement
                        .dataset.theme ||
                    "light";

                const next =
                    current === "dark"
                        ? "light"
                        : "dark";

                applyTheme(next);
            }
        );
    });
}


function applyTheme(theme) {
    document.documentElement.dataset.theme =
        theme;

    document.documentElement.classList.toggle(
        "dark",
        theme === "dark"
    );

    localStorage.setItem(
        "finanzas-theme",
        theme
    );

    document
        .querySelectorAll(
            "[data-theme-icon]"
        )
        .forEach((icon) => {
            icon.className =
                theme === "dark"
                    ? "fas fa-sun"
                    : "fas fa-moon";
        });
}


/* =========================================================
   39. TOASTS
   ========================================================= */

function showToast(
    message,
    type = "info"
) {
    let container =
        document.getElementById(
            "toast-container"
        );

    if (!container) {
        container =
            document.createElement("div");

        container.id =
            "toast-container";

        document.body.appendChild(
            container
        );
    }

    const toast =
        document.createElement("div");

    toast.className =
        `toast toast-${type}`;

    const icons = {
        success: "fa-check-circle",
        error: "fa-times-circle",
        warning: "fa-exclamation-triangle",
        info: "fa-info-circle"
    };

    toast.innerHTML = `
        <i class="fas ${
            icons[type] || icons.info
        }"></i>

        <span>
            ${escapeHTML(message)}
        </span>

        <button
            type="button"
            class="toast-close"
            aria-label="Cerrar"
        >
            &times;
        </button>
    `;

    container.appendChild(toast);

    const closeButton =
        toast.querySelector(
            ".toast-close"
        );

    closeButton?.addEventListener(
        "click",
        () => {
            removeToast(toast);
        }
    );

    requestAnimationFrame(() => {
        toast.classList.add("show");
    });

    setTimeout(() => {
        removeToast(toast);
    }, 5000);
}


function removeToast(toast) {
    if (!toast) return;

    toast.classList.remove(
        "show"
    );

    setTimeout(() => {
        toast.remove();
    }, 300);
}


/* =========================================================
   40. UTILIDADES
   ========================================================= */

function sumAmounts(items = []) {
    return items.reduce(
        (total, item) => {
            const amount =
                Number(
                    item.monto ??
                    item.amount ??
                    item.valor ??
                    0
                );

            return total +
                (Number.isFinite(amount)
                    ? amount
                    : 0);
        },
        0
    );
}


function formatMoney(
    amount = 0
) {
    const currency =
        currentProfile?.moneda ||
        "PEN";

    const numericAmount =
        Number(amount) || 0;

    try {
        return new Intl.NumberFormat(
            "es-PE",
            {
                style: "currency",
                currency,
                minimumFractionDigits: 2
            }
        ).format(
            numericAmount
        );
    } catch {
        return `S/ ${numericAmount.toFixed(2)}`;
    }
}


function formatDate(date) {
    if (!date) return "Sin fecha";

    const parsed =
        new Date(date);

    if (
        Number.isNaN(
            parsed.getTime()
        )
    ) {
        return "Sin fecha";
    }

    return new Intl.DateTimeFormat(
        "es-PE",
        {
            day: "2-digit",
            month: "2-digit",
            year: "numeric"
        }
    ).format(parsed);
}


function getInitials(name = "") {
    const parts =
        String(name)
            .trim()
            .split(/\s+/)
            .filter(Boolean);

    if (!parts.length) {
        return "U";
    }

    if (parts.length === 1) {
        return parts[0]
            .substring(0, 2)
            .toUpperCase();
    }

    return (
        parts[0][0] +
        parts[parts.length - 1][0]
    ).toUpperCase();
}


function formatRole(role) {
    const roles = {
        admin: "Administrador",
        administrador: "Administrador",
        superadmin: "Super administrador",
        usuario: "Usuario",
        user: "Usuario"
    };

    return (
        roles[
            String(role)
                .toLowerCase()
        ] ||
        role ||
        "Usuario"
    );
}


function setText(
    selector,
    value
) {
    document
        .querySelectorAll(selector)
        .forEach((element) => {
            element.textContent =
                value ?? "";
        });
}


/* =========================================================
   41. ERRORES DE AUTENTICACIÓN
   ========================================================= */

function getFriendlyAuthError(error) {
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
        return "Tu correo electrónico todavía no ha sido confirmado.";
    }

    if (
        message.includes(
            "too many requests"
        )
    ) {
        return "Demasiados intentos. Espera unos minutos e inténtalo nuevamente.";
    }

    if (
        message.includes(
            "user not found"
        )
    ) {
        return "No existe una cuenta con ese correo.";
    }

    return (
        error?.message ||
        "No se pudo iniciar sesión."
    );
}


/* =========================================================
   42. SEGURIDAD HTML
   ========================================================= */

function escapeHTML(value) {
    return String(
        value ?? ""
    )
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


/* =========================================================
   43. ESCAPE PARA MODALES / TECLADO
   ========================================================= */

function setupEscapeKey() {
    document.addEventListener(
        "keydown",
        (event) => {
            if (
                event.key === "Escape"
            ) {
                closeAllModals();
                closeSidebar();
            }
        }
    );
}


/* =========================================================
   44. EVENTOS DE FORMULARIOS
   ========================================================= */

document.addEventListener(
    "submit",
    (event) => {
        const form =
            event.target;

        if (
            form.matches(
                "[data-create-user]"
            )
        ) {
            handleCreateUser(
                event
            );
        }
    }
);


/* =========================================================
   45. EXPONER FUNCIONES PARA DEBUG
   ========================================================= */

window.FinanzasApp = {
    getCurrentUser: () =>
        currentUser,

    getCurrentProfile: () =>
        currentProfile,

    showSection,

    loadDashboard,

    loadUsers,

    loadGoalsPage,

    loadReports,

    openModal,

    closeModal,

    showToast,

    formatMoney,

    formatDate
};


/* =========================================================
   46. FINAL
   ========================================================= */

console.log(
    "💰 FinanzasPersonales listo."
);
