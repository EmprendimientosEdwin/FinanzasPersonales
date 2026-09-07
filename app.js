/* =========================================================
FINANZASPERSONALES
APP.JS
Login + Supabase + Roles + Dashboard + Admin
========================================================= */

/* =========================================================

1. CONFIGURACIÓN SUPABASE
   ========================================================= */

const SUPABASE_URL = "https://xwkxgrktsdejoaqnbiwk.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_DYl24WF6mNud6QsS4nhhYA_53ohH191";

let supabaseClient = null;

if (
window.supabase &&
SUPABASE_URL !== "https://xwkxgrktsdejoaqnbiwk.supabase.co" &&
SUPABASE_ANON_KEY !== "sb_publishable_DYl24WF6mNud6QsS4nhhYA_53ohH191"
) {
supabaseClient = window.supabase.createClient(
SUPABASE_URL,
SUPABASE_ANON_KEY
);

```
console.log("✅ Supabase conectado correctamente");
```

} else {
console.error(
"❌ Configura SUPABASE_URL y SUPABASE_ANON_KEY en app.js"
);
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
3. ELEMENTOS DOM
========================================================= */

const loginScreen = document.getElementById("loginScreen");
const appContainer = document.getElementById("appContainer");

const loginForm = document.getElementById("loginForm");
const loginEmail = document.getElementById("loginEmail");
const loginPassword = document.getElementById("loginPassword");

const passwordToggle = document.getElementById("passwordToggle");

const logoutBtn = document.getElementById("logoutBtn");

const sidebar = document.getElementById("sidebar");
const sidebarOverlay = document.getElementById("sidebarOverlay");
const mobileMenuBtn = document.getElementById("mobileMenuBtn");
const sidebarClose = document.getElementById("sidebarClose");

const navItems = document.querySelectorAll(".nav-item");
const pageSections = document.querySelectorAll(".page-section");

const toastContainer = document.getElementById("toastContainer");

/* =========================================================
4. INICIO
========================================================= */

document.addEventListener("DOMContentLoaded", async () => {

```
console.log(
    "🚀 FinanzasPersonales - JavaScript cargado correctamente"
);

initializeUI();

if (!supabaseClient) {
    showToast(
        "error",
        "Configuración pendiente",
        "Debes configurar las credenciales de Supabase en app.js."
    );

    return;
}

await checkSession();
```

});

/* =========================================================
5. INICIALIZAR UI
========================================================= */

function initializeUI() {

```
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
```

}

/* =========================================================
6. SESIÓN
========================================================= */

async function checkSession() {

```
if (!supabaseClient) {
    showLogin();
    return;
}

try {

    const {
        data,
        error
    } = await supabaseClient.auth.getSession();

    if (error) {
        console.error(
            "Error obteniendo sesión:",
            error
        );

        showLogin();
        return;
    }

    if (!data.session) {

        console.log(
            "ℹ️ No existe una sesión activa."
        );

        showLogin();
        return;
    }

    currentUser = data.session.user;

    console.log(
        "✅ Sesión encontrada:",
        currentUser.email
    );

    await initializeAuthenticatedApp();

} catch (error) {

    console.error(
        "❌ Error verificando sesión:",
        error
    );

    showLogin();
}
```

}

/* =========================================================
7. CAMBIOS DE AUTENTICACIÓN
========================================================= */

if (supabaseClient) {

```
supabaseClient.auth.onAuthStateChange(
    async (event, session) => {

        console.log(
            "🔐 Auth event:",
            event
        );

        if (
            event === "SIGNED_IN" &&
            session
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
```

}

/* =========================================================
8. LOGIN
========================================================= */

function setupLogin() {

```
if (!loginForm) return;

loginForm.addEventListener(
    "submit",
    async (event) => {

        event.preventDefault();

        if (!supabaseClient) {

            showToast(
                "error",
                "Supabase no configurado",
                "Configura las credenciales en app.js."
            );

            return;
        }

        const email =
            loginEmail.value.trim();

        const password =
            loginPassword.value;

        if (!email || !password) {

            showToast(
                "warning",
                "Campos incompletos",
                "Ingresa tu correo y contraseña."
            );

            return;
        }

        setLoginLoading(true);

        try {

            console.log(
                "🔐 Intentando iniciar sesión..."
            );

            const {
                data,
                error
            } = await supabaseClient.auth.signInWithPassword({
                email,
                password
            });

            if (error) {

                console.error(
                    "Error login:",
                    error
                );

                showToast(
                    "error",
                    "No se pudo iniciar sesión",
                    getFriendlyAuthError(error)
                );

                return;
            }

            if (!data.user) {

                showToast(
                    "error",
                    "Error",
                    "No se pudo obtener el usuario."
                );

                return;
            }

            currentUser =
                data.user;

            console.log(
                "✅ Login correcto:",
                currentUser.email
            );

            await initializeAuthenticatedApp();

        } catch (error) {

            console.error(
                "❌ Error inesperado:",
                error
            );

            showToast(
                "error",
                "Error inesperado",
                "Ocurrió un problema al iniciar sesión."
            );

        } finally {

            setLoginLoading(false);
        }

    }
);
```

}

/* =========================================================
9. INICIALIZAR APP AUTENTICADA
========================================================= */

async function initializeAuthenticatedApp() {

```
if (!currentUser) return;

try {

    showLoadingApp();

    const profile =
        await loadCurrentProfile();

    if (!profile) {

        console.error(
            "❌ No existe perfil para el usuario."
        );

        await supabaseClient.auth.signOut();

        showToast(
            "error",
            "Perfil no encontrado",
            "Tu usuario existe, pero no tiene un perfil registrado."
        );

        showLogin();

        return;
    }

    currentProfile =
        profile;

    console.log(
        "👤 Perfil:",
        currentProfile
    );

    if (
        currentProfile.estado &&
        currentProfile.estado !== "activo"
    ) {

        await supabaseClient.auth.signOut();

        showToast(
            "error",
            "Cuenta inactiva",
            "Tu cuenta se encuentra desactivada."
        );

        showLogin();

        return;
    }

    updateUserInterface();

    showApp();

    await loadDashboard();

    if (currentProfile.rol === "admin") {

        console.log(
            "👑 Usuario administrador"
        );

        await loadUsers();

    } else {

        console.log(
            "👤 Usuario normal"
        );
    }

    showSection("dashboard");

} catch (error) {

    console.error(
        "❌ Error inicializando aplicación:",
        error
    );

    showToast(
        "error",
        "Error de inicialización",
        error.message ||
        "No se pudo cargar la aplicación."
    );
}
```

}

/* =========================================================
10. CARGAR PERFIL
========================================================= */

async function loadCurrentProfile() {

```
if (!currentUser) return null;

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
    .single();

if (error) {

    console.error(
        "❌ Error cargando perfil:",
        error
    );

    return null;
}

return data;
```

}

/* =========================================================
11. ACTUALIZAR INTERFAZ SEGÚN USUARIO
========================================================= */

function updateUserInterface() {

```
if (!currentProfile) return;

const nombre =
    currentProfile.nombre ||
    currentProfile.usuario ||
    "Usuario";

const apellido =
    currentProfile.apellido ||
    "";

const fullName =
    `${nombre} ${apellido}`.trim();

const initials =
    getInitials(
        nombre,
        apellido
    );

const role =
    currentProfile.rol === "admin"
        ? "Administrador"
        : "Usuario";

document
    .querySelectorAll("[data-user-name]")
    .forEach(element => {

        element.textContent =
            fullName;
    });

document
    .querySelectorAll("[data-user-role]")
    .forEach(element => {

        element.textContent =
            role;
    });

document
    .querySelectorAll("[data-user-email]")
    .forEach(element => {

        element.textContent =
            currentProfile.email ||
            currentUser?.email ||
            "";
    });

document
    .querySelectorAll("[data-user-initials]")
    .forEach(element => {

        element.textContent =
            initials;
    });

const adminMenu =
    document.getElementById(
        "adminMenu"
    );

if (adminMenu) {

    adminMenu.hidden =
        currentProfile.rol !== "admin";
}

const welcomeName =
    document.getElementById(
        "welcomeName"
    );

if (welcomeName) {

    welcomeName.textContent =
        nombre;
}

const accountRole =
    document.getElementById(
        "accountRole"
    );

if (accountRole) {

    accountRole.textContent =
        role;
}
```

}

/* =========================================================
12. MOSTRAR / OCULTAR LOGIN
========================================================= */

function showLogin() {

```
if (loginScreen) {

    loginScreen.hidden = false;
}

if (appContainer) {

    appContainer.hidden = true;
}

document.body.classList.remove(
    "app-loaded"
);
```

}

function showApp() {

```
if (loginScreen) {

    loginScreen.hidden = true;
}

if (appContainer) {

    appContainer.hidden = false;
}

document.body.classList.add(
    "app-loaded"
);
```

}

function showLoadingApp() {

```
if (loginScreen) {

    loginScreen.hidden = true;
}

if (appContainer) {

    appContainer.hidden = false;
}
```

}

/* =========================================================
13. LOGIN LOADING
========================================================= */

function setLoginLoading(loading) {

```
const button =
    document.getElementById(
        "loginSubmit"
    );

if (!button) return;

const normalText =
    button.querySelector(
        ".login-submit-text"
    );

const loadingText =
    button.querySelector(
        ".login-submit-loading"
    );

button.disabled =
    loading;

if (normalText) {

    normalText.hidden =
        loading;
}

if (loadingText) {

    loadingText.hidden =
        !loading;
}
```

}

/* =========================================================
14. PASSWORD
========================================================= */

function setupPasswordToggle() {

```
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
```

}

/* =========================================================
15. NAVEGACIÓN
========================================================= */

function setupNavigation() {

```
navItems.forEach(item => {

    item.addEventListener(
        "click",
        () => {

            const section =
                item.dataset.section;

            if (!section) return;

            showSection(section);

            closeSidebar();
        }
    );
});

document
    .querySelectorAll("[data-go-section]")
    .forEach(button => {

        button.addEventListener(
            "click",
            () => {

                const section =
                    button.dataset.goSection;

                if (section) {

                    showSection(section);
                }
            }
        );
    });
```

}

function showSection(sectionName) {

```
if (!sectionName) {
    sectionName = "dashboard";
}

if (
    sectionName === "usuarios" &&
    currentProfile?.rol !== "admin"
) {

    showToast(
        "error",
        "Acceso denegado",
        "No tienes permisos para acceder a esta sección."
    );

    return;
}

pageSections.forEach(section => {

    section.hidden =
        section.dataset.section !==
        sectionName;
});

navItems.forEach(item => {

    item.classList.toggle(
        "active",
        item.dataset.section ===
        sectionName
    );
});

updatePageTitle(
    sectionName
);

if (
    sectionName === "usuarios" &&
    currentProfile?.rol === "admin"
) {

    loadUsers();
}

if (sectionName === "reportes") {

    loadReports();
}

if (sectionName === "metas") {

    loadGoals();
}

window.scrollTo({
    top: 0,
    behavior: "smooth"
});
```

}

/* =========================================================
16. TÍTULO DE PÁGINA
========================================================= */

function updatePageTitle(section) {

```
const title =
    document.getElementById(
        "pageTitle"
    );

const eyebrow =
    document.getElementById(
        "pageEyebrow"
    );

if (!title) return;

const titles = {

    dashboard: {
        title: "Dashboard",
        eyebrow: "RESUMEN FINANCIERO"
    },

    ingresos: {
        title: "Ingresos",
        eyebrow: "GESTIÓN FINANCIERA"
    },

    salidas: {
        title: "Salidas",
        eyebrow: "GESTIÓN FINANCIERA"
    },

    aportes: {
        title: "Aportes",
        eyebrow: "GESTIÓN FINANCIERA"
    },

    otros: {
        title: "Otros movimientos",
        eyebrow: "GESTIÓN FINANCIERA"
    },

    metas: {
        title: "Metas",
        eyebrow: "OBJETIVOS FINANCIEROS"
    },

    reportes: {
        title: "Reportes",
        eyebrow: "ANÁLISIS FINANCIERO"
    },

    usuarios: {
        title: "Usuarios",
        eyebrow: "ADMINISTRACIÓN"
    },

    configuracion: {
        title: "Configuración",
        eyebrow: "CONFIGURACIÓN"
    }

};

const data =
    titles[section] ||
    titles.dashboard;

title.textContent =
    data.title;

if (eyebrow) {

    eyebrow.textContent =
        data.eyebrow;
}
```

}

/* =========================================================
17. SIDEBAR
========================================================= */

function setupSidebar() {

```
if (mobileMenuBtn) {

    mobileMenuBtn.addEventListener(
        "click",
        openSidebar
    );
}

if (sidebarClose) {

    sidebarClose.addEventListener(
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
```

}

function openSidebar() {

```
if (!sidebar) return;

sidebar.classList.add(
    "open"
);

if (sidebarOverlay) {

    sidebarOverlay.hidden =
        false;
}
```

}

function closeSidebar() {

```
if (!sidebar) return;

sidebar.classList.remove(
    "open"
);

if (sidebarOverlay) {

    sidebarOverlay.hidden =
        true;
}
```

}

/* =========================================================
18. LOGOUT
========================================================= */

function setupLogout() {

```
if (!logoutBtn) return;

logoutBtn.addEventListener(
    "click",
    async () => {

        if (!supabaseClient) return;

        const confirmed =
            confirm(
                "¿Seguro que deseas cerrar sesión?"
            );

        if (!confirmed) return;

        try {

            const {
                error
            } =
                await supabaseClient.auth.signOut();

            if (error) {

                console.error(
                    error
                );

                showToast(
                    "error",
                    "Error",
                    "No se pudo cerrar la sesión."
                );

                return;
            }

            showToast(
                "success",
                "Sesión cerrada",
                "Hasta pronto."
            );

            currentUser =
                null;

            currentProfile =
                null;

            showLogin();

        } catch (error) {

            console.error(
                error
            );
        }
    }
);
```

}

/* =========================================================
19. DASHBOARD
========================================================= */

async function loadDashboard() {

```
if (!currentUser) return;

try {

    const [
        ingresosResult,
        salidasResult,
        aportesResult
    ] = await Promise.all([

        supabaseClient
            .from("ingresos")
            .select("monto, fecha, concepto, categoria")
            .eq("user_id", currentUser.id)
            .order("fecha", {
                ascending: false
            }),

        supabaseClient
            .from("salidas")
            .select("monto, fecha, concepto, categoria")
            .eq("user_id", currentUser.id)
            .order("fecha", {
                ascending: false
            }),

        supabaseClient
            .from("aportes")
            .select("monto, fecha, concepto, tipo")
            .eq("user_id", currentUser.id)
            .order("fecha", {
                ascending: false
            })
    ]);

    if (ingresosResult.error) {
        console.error(
            "Error ingresos:",
            ingresosResult.error
        );
    }

    if (salidasResult.error) {
        console.error(
            "Error salidas:",
            salidasResult.error
        );
    }

    if (aportesResult.error) {
        console.error(
            "Error aportes:",
            aportesResult.error
        );
    }

    const ingresos =
        ingresosResult.data || [];

    const salidas =
        salidasResult.data || [];

    const aportes =
        aportesResult.data || [];

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
        balance,
        ingresos: totalIngresos,
        salidas: totalSalidas,
        aportes: totalAportes
    });

    renderFlowChart(
        ingresos,
        salidas,
        aportes
    );

    renderRecentActivity(
        ingresos,
        salidas,
        aportes
    );

    await loadGoalsPreview();

} catch (error) {

    console.error(
        "❌ Error dashboard:",
        error
    );
}
```

}

/* =========================================================
20. NÚMEROS DASHBOARD
========================================================= */

function updateDashboardNumbers(data) {

```
setText(
    "balanceValue",
    formatMoney(data.balance)
);

setText(
    "incomeValue",
    formatMoney(data.ingresos)
);

setText(
    "expenseValue",
    formatMoney(data.salidas)
);

setText(
    "contributionValue",
    formatMoney(data.aportes)
);
```

}

/* =========================================================
21. GRÁFICO FLUJO
========================================================= */

function renderFlowChart(
ingresos,
salidas,
aportes
) {

```
const canvas =
    document.getElementById(
        "flowChart"
    );

if (!canvas) return;

if (flowChart) {

    flowChart.destroy();
}

const labels =
    getLastSixMonths();

const incomeData =
    getMonthlyTotals(
        ingresos,
        labels
    );

const expenseData =
    getMonthlyTotals(
        salidas,
        labels
    );

const contributionData =
    getMonthlyTotals(
        aportes,
        labels
    );

if (!window.Chart) {

    console.warn(
        "Chart.js no está disponible."
    );

    return;
}

flowChart =
    new Chart(
        canvas.getContext("2d"),
        {
            type: "line",

            data: {

                labels,

                datasets: [

                    {
                        label: "Ingresos",
                        data: incomeData,
                        tension: 0.4,
                        borderWidth: 2,
                        fill: false
                    },

                    {
                        label: "Salidas",
                        data: expenseData,
                        tension: 0.4,
                        borderWidth: 2,
                        fill: false
                    },

                    {
                        label: "Aportes",
                        data: contributionData,
                        tension: 0.4,
                        borderWidth: 2,
                        fill: false
                    }

                ]
            },

            options: {

                responsive: true,

                maintainAspectRatio: false,

                interaction: {
                    mode: "index",
                    intersect: false
                },

                plugins: {

                    legend: {
                        display: true
                    }

                },

                scales: {

                    y: {

                        beginAtZero: true,

                        ticks: {

                            callback: value => {

                                return formatMoney(
                                    value
                                );
                            }

                        }

                    }

                }
            }
        }
    );
```

}

/* =========================================================
22. ACTIVIDAD RECIENTE
========================================================= */

function renderRecentActivity(
ingresos,
salidas,
aportes
) {

```
const container =
    document.getElementById(
        "recentActivity"
    );

if (!container) return;

const activity = [

    ...ingresos.map(item => ({
        ...item,
        type: "income"
    })),

    ...salidas.map(item => ({
        ...item,
        type: "expense"
    })),

    ...aportes.map(item => ({
        ...item,
        type: "contribution"
    }))

]
    .sort(
        (a, b) =>
            new Date(b.fecha) -
            new Date(a.fecha)
    )
    .slice(0, 6);

if (!activity.length) {

    container.innerHTML = `
        <div class="empty-state small">
            <div class="empty-icon">
                <i class="fa-solid fa-receipt"></i>
            </div>

            <h4>Sin movimientos</h4>

            <p>
                Todavía no tienes movimientos registrados.
            </p>
        </div>
    `;

    return;
}

container.innerHTML =
    activity
        .map(item => {

            const typeData =
                getActivityTypeData(
                    item.type
                );

            const sign =
                item.type === "income"
                    ? "+"
                    : "-";

            return `
                <div class="activity-item">

                    <div class="activity-icon ${typeData.class}">
                        <i class="${typeData.icon}"></i>
                    </div>

                    <div class="activity-info">

                        <strong>
                            ${escapeHTML(
                                item.concepto ||
                                "Movimiento"
                            )}
                        </strong>

                        <span>
                            ${formatDate(
                                item.fecha
                            )}
                        </span>

                    </div>

                    <div class="activity-amount ${typeData.class}">
                        ${sign}${formatMoney(
                            item.monto
                        )}
                    </div>

                </div>
            `;
        })
        .join("");
```

}

/* =========================================================
23. METAS
========================================================= */

async function loadGoalsPreview() {

```
if (!currentUser) return;

const container =
    document.getElementById(
        "goalsPreview"
    );

if (!container) return;

const {
    data,
    error
} = await supabaseClient
    .from("metas")
    .select(`
        id,
        nombre,
        objetivo,
        monto_actual,
        fecha_objetivo
    `)
    .eq(
        "user_id",
        currentUser.id
    )
    .order(
        "created_at",
        {
            ascending: false
        }
    )
    .limit(4);

if (error) {

    console.error(
        "Error metas:",
        error
    );

    return;
}

const goals =
    data || [];

if (!goals.length) {

    container.innerHTML = `
        <div class="empty-state small">

            <div class="empty-icon">
                <i class="fa-solid fa-bullseye"></i>
            </div>

            <h4>No tienes metas todavía</h4>

            <p>
                Crea una meta para empezar a planificar tu futuro financiero.
            </p>

        </div>
    `;

    return;
}

container.innerHTML =
    goals
        .map(goal => {

            const percentage =
                goal.objetivo > 0
                    ? Math.min(
                        100,
                        (
                            Number(
                                goal.monto_actual
                            ) /
                            Number(
                                goal.objetivo
                            )
                        ) * 100
                    )
                    : 0;

            return `
                <div class="goal-item">

                    <div class="goal-top">

                        <span class="goal-name">
                            ${escapeHTML(
                                goal.nombre
                            )}
                        </span>

                        <span class="goal-percentage">
                            ${percentage.toFixed(0)}%
                        </span>

                    </div>

                    <div class="goal-progress">

                        <div
                            class="goal-progress-bar"
                            style="width:${percentage}%"
                        ></div>

                    </div>

                    <div class="goal-bottom">

                        <span>
                            ${formatMoney(
                                goal.monto_actual
                            )}
                        </span>

                        <span>
                            Meta:
                            ${formatMoney(
                                goal.objetivo
                            )}
                        </span>

                    </div>

                </div>
            `;
        })
        .join("");
```

}

/* =========================================================
24. CARGAR METAS
========================================================= */

async function loadGoals() {

```
if (!currentUser) return;

const container =
    document.getElementById(
        "goalsPageContainer"
    );

if (!container) return;

const {
    data,
    error
} = await supabaseClient
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
        "Error cargando metas:",
        error
    );

    return;
}

const goals =
    data || [];

if (!goals.length) {

    container.innerHTML = `
        <div class="empty-state">

            <div class="empty-icon">
                <i class="fa-solid fa-bullseye"></i>
            </div>

            <h4>Aún no tienes metas</h4>

            <p>
                Cuando agreguemos el formulario de metas podrás crear tus objetivos financieros aquí.
            </p>

        </div>
    `;

    return;
}

container.innerHTML =
    goals
        .map(goal => {

            const percentage =
                goal.objetivo > 0
                    ? Math.min(
                        100,
                        (
                            Number(
                                goal.monto_actual
                            ) /
                            Number(
                                goal.objetivo
                            )
                        ) * 100
                    )
                    : 0;

            return `
                <div class="goal-page-card">

                    <div class="goal-page-card-header">

                        <div class="goal-page-icon">
                            <i class="fa-solid fa-bullseye"></i>
                        </div>

                        <div>

                            <h4>
                                ${escapeHTML(
                                    goal.nombre
                                )}
                            </h4>

                            <p>
                                ${
                                    goal.fecha_objetivo
                                        ? `Objetivo: ${formatDate(goal.fecha_objetivo)}`
                                        : "Sin fecha objetivo"
                                }
                            </p>

                        </div>

                    </div>

                    <div class="goal-page-amount">

                        <strong>
                            ${formatMoney(
                                goal.monto_actual
                            )}
                        </strong>

                        <span>
                            de ${formatMoney(
                                goal.objetivo
                            )}
                        </span>

                    </div>

                    <div class="goal-progress">

                        <div
                            class="goal-progress-bar"
                            style="width:${percentage}%"
                        ></div>

                    </div>

                    <div class="goal-bottom">

                        <span>
                            Progreso
                        </span>

                        <span>
                            ${percentage.toFixed(0)}%
                        </span>

                    </div>

                </div>
            `;
        })
        .join("");
```

}

/* =========================================================
25. REPORTES
========================================================= */

async function loadReports() {

```
if (!currentUser) return;

try {

    const [
        ingresosResult,
        salidasResult,
        aportesResult
    ] = await Promise.all([

        supabaseClient
            .from("ingresos")
            .select("monto"),

        supabaseClient
            .from("salidas")
            .select("monto"),

        supabaseClient
            .from("aportes")
            .select("monto")

    ]);

    const ingresos =
        sumAmounts(
            ingresosResult.data || []
        );

    const salidas =
        sumAmounts(
            salidasResult.data || []
        );

    const aportes =
        sumAmounts(
            aportesResult.data || []
        );

    const balance =
        ingresos -
        salidas -
        aportes;

    setText(
        "reportIncome",
        formatMoney(ingresos)
    );

    setText(
        "reportExpense",
        formatMoney(salidas)
    );

    setText(
        "reportContribution",
        formatMoney(aportes)
    );

    setText(
        "reportBalance",
        formatMoney(balance)
    );

} catch (error) {

    console.error(
        "Error reportes:",
        error
    );
}
```

}

/* =========================================================
26. ADMIN — CARGAR USUARIOS
========================================================= */

async function loadUsers() {

```
if (
    !currentUser ||
    currentProfile?.rol !== "admin"
) {
    return;
}

const tbody =
    document.getElementById(
        "usersTableBody"
    );

if (!tbody) return;

tbody.innerHTML = `
    <tr>
        <td colspan="6">
            <div class="loading-state">
                <i class="fa-solid fa-spinner fa-spin"></i>
                Cargando usuarios...
            </div>
        </td>
    </tr>
`;

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
            "Error usuarios:",
            error
        );

        tbody.innerHTML = `
            <tr>
                <td colspan="6">
                    <div class="empty-state small">
                        <div class="empty-icon">
                            <i class="fa-solid fa-triangle-exclamation"></i>
                        </div>
                        <h4>No se pudieron cargar los usuarios</h4>
                        <p>
                            ${escapeHTML(
                                error.message
                            )}
                        </p>
                    </div>
                </td>
            </tr>
        `;

        return;
    }

    allUsers =
        data || [];

    renderUsers(
        allUsers
    );

    updateUserCount(
        allUsers.length
    );

} catch (error) {

    console.error(
        "❌ Error:",
        error
    );
}
```

}

/* =========================================================
27. RENDER USUARIOS
========================================================= */

function renderUsers(users) {

```
const tbody =
    document.getElementById(
        "usersTableBody"
    );

if (!tbody) return;

if (!users.length) {

    tbody.innerHTML = `
        <tr class="empty-table-row">

            <td colspan="6">

                <div class="empty-state small">

                    <div class="empty-icon">
                        <i class="fa-solid fa-users"></i>
                    </div>

                    <h4>No hay usuarios</h4>

                    <p>
                        No se encontraron usuarios con los filtros actuales.
                    </p>

                </div>

            </td>

        </tr>
    `;

    return;
}

tbody.innerHTML =
    users
        .map(user => {

            const name =
                `${user.nombre || ""} ${user.apellido || ""}`
                    .trim() ||
                user.usuario ||
                "Usuario";

            const initials =
                getInitials(
                    user.nombre,
                    user.apellido
                );

            const isCurrent =
                user.id ===
                currentUser?.id;

            return `
                <tr>

                    <td>

                        <div class="table-user">

                            <div class="table-avatar">
                                ${escapeHTML(
                                    initials
                                )}
                            </div>

                            <div>

                                <strong>
                                    ${escapeHTML(
                                        name
                                    )}
                                </strong>

                                <span>
                                    ${escapeHTML(
                                        user.usuario ||
                                        "Sin usuario"
                                    )}
                                </span>

                            </div>

                        </div>

                    </td>

                    <td>
                        ${escapeHTML(
                            user.email ||
                            "-"
                        )}
                    </td>

                    <td>

                        <span class="role-badge ${user.rol === "admin" ? "admin" : "user"}">

                            ${
                                user.rol === "admin"
                                    ? "Administrador"
                                    : "Usuario"
                            }

                        </span>

                    </td>

                    <td>

                        <span class="status-badge ${user.estado === "activo" ? "active" : "inactive"}">

                            ${
                                user.estado === "activo"
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

                        <div class="table-actions">

                            ${
                                isCurrent
                                    ? `
                                        <button
                                            class="table-action"
                                            title="Tu cuenta"
                                            disabled
                                        >
                                            <i class="fa-solid fa-user"></i>
                                        </button>
                                    `
                                    : `
                                        <button
                                            class="table-action toggle-user-btn"
                                            data-id="${user.id}"
                                            data-status="${user.estado}"
                                            title="${
                                                user.estado === "activo"
                                                    ? "Desactivar"
                                                    : "Activar"
                                            }"
                                        >

                                            <i class="fa-solid ${
                                                user.estado === "activo"
                                                    ? "fa-user-slash"
                                                    : "fa-user-check"
                                            }"></i>

                                        </button>
                                    `
                            }

                        </div>

                    </td>

                </tr>
            `;
        })
        .join("");

document
    .querySelectorAll(
        ".toggle-user-btn"
    )
    .forEach(button => {

        button.addEventListener(
            "click",
            () => {

                toggleUserStatus(
                    button.dataset.id,
                    button.dataset.status
                );
            }
        );
    });
```

}

/* =========================================================
28. CAMBIAR ESTADO USUARIO
========================================================= */

async function toggleUserStatus(
userId,
currentStatus
) {

```
if (
    !currentUser ||
    currentProfile?.rol !== "admin"
) {
    return;
}

const newStatus =
    currentStatus === "activo"
        ? "inactivo"
        : "activo";

const action =
    newStatus === "activo"
        ? "activar"
        : "desactivar";

const confirmed =
    confirm(
        `¿Deseas ${action} este usuario?`
    );

if (!confirmed) return;

try {

    const {
        error
    } = await supabaseClient
        .from("profiles")
        .update({
            estado: newStatus,
            updated_at:
                new Date().toISOString()
        })
        .eq(
            "id",
            userId
        );

    if (error) {

        console.error(
            error
        );

        showToast(
            "error",
            "No se pudo actualizar",
            error.message
        );

        return;
    }

    showToast(
        "success",
        "Usuario actualizado",
        `El usuario ahora está ${newStatus}.`
    );

    await loadUsers();

} catch (error) {

    console.error(
        error
    );

    showToast(
        "error",
        "Error",
        "No se pudo actualizar el usuario."
    );
}
```

}

/* =========================================================
29. BUSCADOR USUARIOS
========================================================= */

function setupUserSearch() {

```
const search =
    document.getElementById(
        "userSearch"
    );

if (!search) return;

search.addEventListener(
    "input",
    filterUsers
);
```

}

function setupUserFilters() {

```
const roleFilter =
    document.getElementById(
        "userRoleFilter"
    );

const statusFilter =
    document.getElementById(
        "userStatusFilter"
    );

if (roleFilter) {

    roleFilter.addEventListener(
        "change",
        filterUsers
    );
}

if (statusFilter) {

    statusFilter.addEventListener(
        "change",
        filterUsers
    );
}
```

}

function filterUsers() {

```
const search =
    document.getElementById(
        "userSearch"
    )?.value
        .trim()
        .toLowerCase() || "";

const role =
    document.getElementById(
        "userRoleFilter"
    )?.value || "all";

const status =
    document.getElementById(
        "userStatusFilter"
    )?.value || "all";

const filtered =
    allUsers.filter(
        user => {

            const text =
                [
                    user.nombre,
                    user.apellido,
                    user.email,
                    user.usuario
                ]
                    .filter(Boolean)
                    .join(" ")
                    .toLowerCase();

            const matchesSearch =
                !search ||
                text.includes(search);

            const matchesRole =
                role === "all" ||
                user.rol === role;

            const matchesStatus =
                status === "all" ||
                user.estado === status;

            return (
                matchesSearch &&
                matchesRole &&
                matchesStatus
            );
        }
    );

renderUsers(
    filtered
);
```

}

/* =========================================================
30. MODAL CREAR USUARIO
========================================================= */

function setupModalEvents() {

```
const openButton =
    document.getElementById(
        "openCreateUserModal"
    );

const modal =
    document.getElementById(
        "createUserModal"
    );

const closeButton =
    document.getElementById(
        "closeCreateUserModal"
    );

const cancelButton =
    document.getElementById(
        "cancelCreateUser"
    );

if (openButton) {

    openButton.addEventListener(
        "click",
        () => {

            if (
                currentProfile?.rol !==
                "admin"
            ) {

                showToast(
                    "error",
                    "Acceso denegado",
                    "Solo un administrador puede crear usuarios."
                );

                return;
            }

            openModal(
                modal
            );
        }
    );
}

if (closeButton) {

    closeButton.addEventListener(
        "click",
        () => closeModal(modal)
    );
}

if (cancelButton) {

    cancelButton.addEventListener(
        "click",
        () => closeModal(modal)
    );
}

if (modal) {

    modal.addEventListener(
        "click",
        event => {

            if (
                event.target ===
                modal
            ) {

                closeModal(
                    modal
                );
            }
        }
    );
}

const createForm =
    document.getElementById(
        "createUserForm"
    );

if (createForm) {

    createForm.addEventListener(
        "submit",
        handleCreateUser
    );
}
```

}

async function handleCreateUser(
event
) {

```
event.preventDefault();

if (
    currentProfile?.rol !==
    "admin"
) {

    showToast(
        "error",
        "Acceso denegado",
        "Solo un administrador puede crear usuarios."
    );

    return;
}

const nombre =
    document
        .getElementById(
            "newUserNombre"
        )
        ?.value
        .trim();

const apellido =
    document
        .getElementById(
            "newUserApellido"
        )
        ?.value
        .trim();

const usuario =
    document
        .getElementById(
            "newUserUsuario"
        )
        ?.value
        .trim();

const email =
    document
        .getElementById(
            "newUserEmail"
        )
        ?.value
        .trim();

const password =
    document
        .getElementById(
            "newUserPassword"
        )
        ?.value;

const moneda =
    document
        .getElementById(
            "newUserMoneda"
        )
        ?.value || "PEN";

if (
    !nombre ||
    !email ||
    !password
) {

    showToast(
        "warning",
        "Campos obligatorios",
        "Completa nombre, email y contraseña."
    );

    return;
}

if (password.length < 6) {

    showToast(
        "warning",
        "Contraseña demasiado corta",
        "La contraseña debe tener al menos 6 caracteres."
    );

    return;
}

const submitButton =
    document.getElementById(
        "createUserSubmit"
    );

if (submitButton) {

    submitButton.disabled =
        true;

    submitButton.innerHTML = `
        <i class="fa-solid fa-spinner fa-spin"></i>
        Creando usuario...
    `;
}

try {

    console.log(
        "👤 Creando usuario:",
        email
    );

    const {
        data,
        error
    } =
        await supabaseClient.functions.invoke(
            "crear-usuario",
            {
                body: {
                    nombre,
                    apellido,
                    usuario,
                    email,
                    password,
                    moneda
                }
            }
        );

    if (error) {

        console.error(
            "Error Edge Function:",
            error
        );

        throw error;
    }

    if (
        data &&
        data.error
    ) {

        throw new Error(
            data.error
        );
    }

    console.log(
        "✅ Usuario creado:",
        data
    );

    showToast(
        "success",
        "Usuario creado",
        `La cuenta ${email} fue creada correctamente.`
    );

    const form =
        document.getElementById(
            "createUserForm"
        );

    if (form) {

        form.reset();
    }

    const modal =
        document.getElementById(
            "createUserModal"
        );

    closeModal(
        modal
    );

    await loadUsers();

} catch (error) {

    console.error(
        "❌ Error creando usuario:",
        error
    );

    showToast(
        "error",
        "No se pudo crear el usuario",
        error.message ||
        "Revisa la Edge Function crear-usuario."
    );

} finally {

    if (submitButton) {

        submitButton.disabled =
            false;

        submitButton.innerHTML = `
            <i class="fa-solid fa-user-plus"></i>
            Crear usuario
        `;
    }
}
```

}

/* =========================================================
31. GENERADOR DE CONTRASEÑA
========================================================= */

function setupPasswordGenerator() {

```
const button =
    document.getElementById(
        "generatePassword"
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

        const password =
            generatePassword();

        input.value =
            password;

        input.type =
            "text";

        showToast(
            "info",
            "Contraseña generada",
            "Guarda esta contraseña antes de crear la cuenta."
        );
    }
);
```

}

function generatePassword() {

```
const chars =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

let result = "";

for (
    let i = 0;
    i < 10;
    i++
) {

    result +=
        chars.charAt(
            Math.floor(
                Math.random() *
                chars.length
            )
        );
}

return result;
```

}

/* =========================================================
32. MODAL
========================================================= */

function openModal(modal) {

```
if (!modal) return;

modal.hidden =
    false;

document.body.style.overflow =
    "hidden";
```

}

function closeModal(modal) {

```
if (!modal) return;

modal.hidden =
    true;

document.body.style.overflow =
    "";
```

}

/* =========================================================
33. ACCIONES RÁPIDAS
========================================================= */

function setupQuickActions() {

```
document
    .querySelectorAll(
        "[data-quick-action]"
    )
    .forEach(button => {

        button.addEventListener(
            "click",
            () => {

                const action =
                    button.dataset.quickAction;

                if (
                    action === "income"
                ) {

                    showSection(
                        "ingresos"
                    );
                }

                if (
                    action === "expense"
                ) {

                    showSection(
                        "salidas"
                    );
                }

                if (
                    action === "contribution"
                ) {

                    showSection(
                        "aportes"
                    );
                }

                if (
                    action === "other"
                ) {

                    showSection(
                        "otros"
                    );
                }
            }
        );
    });
```

}

/* =========================================================
34. TEMA
========================================================= */

function setupThemeToggle() {

```
const toggle =
    document.getElementById(
        "themeToggle"
    );

if (!toggle) return;

toggle.addEventListener(
    "click",
    () => {

        document.body.classList.toggle(
            "dark-mode"
        );

        const enabled =
            document.body.classList.contains(
                "dark-mode"
            );

        localStorage.setItem(
            "financeTheme",
            enabled
                ? "dark"
                : "light"
        );

        const switchDot =
            toggle.querySelector(
                "span"
            );

        if (switchDot) {

            switchDot.style.transform =
                enabled
                    ? "translateX(13px)"
                    : "translateX(0)";
        }
    }
);

const savedTheme =
    localStorage.getItem(
        "financeTheme"
    );

if (
    savedTheme ===
    "dark"
) {

    document.body.classList.add(
        "dark-mode"
    );

    const switchDot =
        toggle.querySelector(
            "span"
        );

    if (switchDot) {

        switchDot.style.transform =
            "translateX(13px)";
    }
}
```

}

/* =========================================================
35. UTILIDADES
========================================================= */

function sumAmounts(items) {

```
return items.reduce(
    (
        total,
        item
    ) => {

        return (
            total +
            Number(
                item.monto || 0
            )
        );
    },
    0
);
```

}

function formatMoney(
amount
) {

```
const currency =
    currentProfile?.moneda ||
    "PEN";

return new Intl.NumberFormat(
    "es-PE",
    {
        style: "currency",
        currency,
        minimumFractionDigits: 2
    }
).format(
    Number(amount) || 0
);
```

}

function formatDate(
date
) {

```
if (!date) return "-";

try {

    return new Intl.DateTimeFormat(
        "es-PE",
        {
            day: "2-digit",
            month: "short",
            year: "numeric"
        }
    ).format(
        new Date(
            `${date}T00:00:00`
        )
    );

} catch {

    return date;
}
```

}

function getInitials(
nombre,
apellido
) {

```
const first =
    nombre
        ?.trim()
        ?.charAt(0)
        ?.toUpperCase() || "";

const second =
    apellido
        ?.trim()
        ?.charAt(0)
        ?.toUpperCase() || "";

if (first && second) {

    return first + second;
}

if (first) {

    return first;
}

return "U";
```

}

function setText(
id,
value
) {

```
const element =
    document.getElementById(id);

if (element) {

    element.textContent =
        value;
}
```

}

function getFriendlyAuthError(
error
) {

```
const message =
    error?.message ||
    "";

const lower =
    message.toLowerCase();

if (
    lower.includes(
        "invalid login credentials"
    )
) {

    return "Correo o contraseña incorrectos.";
}

if (
    lower.includes(
        "email not confirmed"
    )
) {

    return "El correo electrónico todavía no ha sido confirmado.";
}

if (
    lower.includes(
        "too many requests"
    )
) {

    return "Demasiados intentos. Espera unos minutos e inténtalo nuevamente.";
}

return message ||
    "No se pudo iniciar sesión.";
```

}

function escapeHTML(
value
) {

```
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
```

}

/* =========================================================
36. DATOS GRÁFICOS
========================================================= */

function getLastSixMonths() {

```
const result = [];

const now =
    new Date();

for (
    let i = 5;
    i >= 0;
    i--
) {

    const date =
        new Date(
            now.getFullYear(),
            now.getMonth() - i,
            1
        );

    result.push(
        date.toLocaleDateString(
            "es-PE",
            {
                month: "short"
            }
        )
    );
}

return result;
```

}

function getMonthlyTotals(
items,
labels
) {

```
const now =
    new Date();

const totals =
    [];

for (
    let i = 5;
    i >= 0;
    i--
) {

    const target =
        new Date(
            now.getFullYear(),
            now.getMonth() - i,
            1
        );

    const year =
        target.getFullYear();

    const month =
        target.getMonth();

    const total =
        items.reduce(
            (
                sum,
                item
            ) => {

                const date =
                    new Date(
                        `${item.fecha}T00:00:00`
                    );

                if (
                    date.getFullYear() ===
                        year &&
                    date.getMonth() ===
                        month
                ) {

                    return (
                        sum +
                        Number(
                            item.monto || 0
                        )
                    );
                }

                return sum;
            },
            0
        );

    totals.push(
        total
    );
}

return totals;
```

}

function getActivityTypeData(
type
) {

```
const data = {

    income: {
        icon:
            "fa-solid fa-arrow-trend-up",
        class:
            "income"
    },

    expense: {
        icon:
            "fa-solid fa-arrow-trend-down",
        class:
            "expense"
    },

    contribution: {
        icon:
            "fa-solid fa-piggy-bank",
        class:
            "contribution"
    }

};

return (
    data[type] ||
    data.income
);
```

}

/* =========================================================
37. CONTADOR USUARIOS
========================================================= */

function updateUserCount(
count
) {

```
const element =
    document.getElementById(
        "userCount"
    );

if (!element) return;

element.textContent =
    count;
```

}

/* =========================================================
38. TECLA ESC
========================================================= */

document.addEventListener(
"keydown",
event => {

```
    if (
        event.key !==
        "Escape"
    ) {
        return;
    }

    const modal =
        document.getElementById(
            "createUserModal"
        );

    if (
        modal &&
        !modal.hidden
    ) {

        closeModal(
            modal
        );
    }

    closeSidebar();
}
```

);

/* =========================================================
39. EXPORTAR DEBUG
========================================================= */

window.FinanzasApp = {

```
getCurrentUser: () =>
    currentUser,

getCurrentProfile: () =>
    currentProfile,

reloadDashboard:
    loadDashboard,

reloadUsers:
    loadUsers,

showSection:
    showSection
```

};

console.log(
"💰 FinanzasPersonales listo."
);
