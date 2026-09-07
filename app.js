/* =========================================================
   FINANZASPERSONALES
   app.js
   ========================================================= */


/* =========================================================
   1. CONFIGURACIÓN SUPABASE
========================================================= */

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
   4. INICIALIZACIÓN
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        console.log(
            "🚀 FinanzasPersonales - JavaScript cargado correctamente"
        );

        initializeUI();

        if (!supabaseClient) {
            showToast(
                "No se pudo conectar con la base de datos.",
                "error"
            );
            return;
        }

        await checkSession();
    }
);


/* =========================================================
   5. INICIALIZAR INTERFAZ
========================================================= */

function initializeUI() {

    setupLogin();

    setupNavigation();

    setupSidebar();

    setupPasswordToggle();

    setupLogout();

    setupThemeToggle();

    setupUserSearch();

    setupUserFilters();

    setupPasswordGenerator();

    setupCreateUserModal();

    setupQuickActions();

    setupForgotPassword();

    setupNotificationButton();

    setupProfileButton();

    setupEscapeKey();

    console.log(
        "✅ Interfaz inicializada"
    );
}


/* =========================================================
   6. SESIÓN
========================================================= */

async function checkSession() {

    try {

        const {
            data,
            error
        } = await supabaseClient.auth.getSession();

        if (error) {
            throw error;
        }

        const session =
            data?.session;

        if (session?.user) {

            currentUser =
                session.user;

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


/* =========================================================
   7. CAMBIOS DE AUTENTICACIÓN
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

                currentUser =
                    session.user;

                await initializeAuthenticatedApp();
            }

            if (
                event === "SIGNED_OUT"
            ) {

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

    if (!loginForm) return;

    loginForm.addEventListener(
        "submit",
        async (event) => {

            event.preventDefault();

            const email =
                loginEmail?.value
                    .trim();

            const password =
                loginPassword?.value;

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
                } =
                    await supabaseClient.auth
                        .signInWithPassword({
                            email,
                            password
                        });

                if (error) {
                    throw error;
                }

                currentUser =
                    data.user;

                console.log(
                    "✅ Inicio de sesión exitoso:",
                    currentUser.email
                );

                await initializeAuthenticatedApp();

            } catch (error) {

                console.error(
                    "❌ Error de login:",
                    error
                );

                showToast(
                    getFriendlyAuthError(error),
                    "error"
                );

            } finally {

                setLoginLoading(false);
            }
        }
    );
}


/* =========================================================
   9. APLICACIÓN AUTENTICADA
========================================================= */

async function initializeAuthenticatedApp() {

    if (!currentUser) {
        showLogin();
        return;
    }

    showLoadingApp();

    try {

        const profileLoaded =
            await loadCurrentProfile();

        if (!profileLoaded) {

            showToast(
                "No se encontró tu perfil de usuario.",
                "error"
            );

            await supabaseClient.auth.signOut();

            return;
        }

        if (
            String(
                currentProfile.estado || ""
            ).toLowerCase() ===
            "inactivo"
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

        console.log(
            "✅ Aplicación autenticada correctamente"
        );

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
   10. PERFIL
========================================================= */

async function loadCurrentProfile() {

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
                    avatar_url
                `)
                .eq(
                    "id",
                    currentUser.id
                )
                .maybeSingle();

        if (error) {
            throw error;
        }

        if (!data) {
            return false;
        }

        currentProfile =
            data;

        console.log(
            "✅ Perfil cargado:",
            currentProfile
        );

        return true;

    } catch (error) {

        console.error(
            "❌ Error cargando perfil:",
            error
        );

        return false;
    }
}


/* =========================================================
   11. ACTUALIZAR INTERFAZ USUARIO
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

    const firstName =
        currentProfile.nombre ||
        currentProfile.usuario ||
        "Usuario";

    const role =
        currentProfile.rol ||
        "usuario";

    const initials =
        getInitials(displayName);


    /* Nombre */

    setText(
        "[data-user-name]",
        displayName
    );

    setText(
        "#profileName",
        displayName
    );

    setText(
        "#welcomeName",
        firstName
    );

    setText(
        "#dashboardUserName",
        firstName
    );


    /* Rol */

    setText(
        "[data-user-role]",
        formatRole(role)
    );

    setText(
        "[data-account-role]",
        formatRole(role)
    );

    setText(
        "#accountRole",
        formatRole(role)
    );


    /* Iniciales */

    setText(
        "[data-user-initials]",
        initials
    );

    setText(
        "#profileInitials",
        initials
    );

    setText(
        "#topbarInitials",
        initials
    );


    /* Mostrar administración */

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


/* =========================================================
   12. PANTALLAS
========================================================= */

function showLogin() {

    if (loginScreen) {
        loginScreen.classList.remove(
            "hidden"
        );

        loginScreen.style.display =
            "";
    }

    if (appContainer) {
        appContainer.classList.add(
            "hidden"
        );

        appContainer.style.display =
            "none";
    }
}


function showLoadingApp() {

    if (loginScreen) {
        loginScreen.style.display =
            "none";
    }

    if (appContainer) {
        appContainer.classList.remove(
            "hidden"
        );

        appContainer.style.display =
            "";
    }
}


function showApp() {

    if (loginScreen) {
        loginScreen.style.display =
            "none";
    }

    if (appContainer) {
        appContainer.classList.remove(
            "hidden"
        );

        appContainer.style.display =
            "";
    }
}


/* =========================================================
   13. LOGIN LOADING
========================================================= */

function setLoginLoading(loading) {

    const button =
        document.getElementById(
            "loginSubmit"
        );

    if (!button) return;

    if (loading) {

        button.disabled = true;

        button.dataset.originalText =
            button.innerHTML;

        button.innerHTML = `
            <span class="button-content">
                <i class="fa-solid fa-circle-notch fa-spin"></i>
                Iniciando sesión...
            </span>
        `;

    } else {

        button.disabled = false;

        if (
            button.dataset.originalText
        ) {
            button.innerHTML =
                button.dataset.originalText;
        }
    }
}


/* =========================================================
   14. PASSWORD
========================================================= */

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

                icon.classList.toggle(
                    "fa-eye",
                    !isPassword
                );

                icon.classList.toggle(
                    "fa-eye-slash",
                    isPassword
                );
            }
        }
    );
}


/* =========================================================
   15. NAVEGACIÓN
========================================================= */

function setupNavigation() {

    document
        .querySelectorAll(
            "[data-section]"
        )
        .forEach((item) => {

            item.addEventListener(
                "click",
                async (event) => {

                    event.preventDefault();

                    const section =
                        item.dataset.section;

                    if (!section) return;

                    await showSection(
                        section
                    );

                    closeSidebar();
                }
            );
        });
}


async function showSection(
    sectionName
) {

    if (!sectionName) return;

    const target =
        document.getElementById(
            sectionName
        );

    if (!target) {

        console.warn(
            "⚠️ Sección no encontrada:",
            sectionName
        );

        return;
    }


    /* Ocultar */

    pageSections.forEach(
        (section) => {
            section.classList.remove(
                "active"
            );
        }
    );


    /* Mostrar */

    target.classList.add(
        "active"
    );


    /* Sidebar */

    document
        .querySelectorAll(
            ".sidebar .nav-item[data-section]"
        )
        .forEach((item) => {

            item.classList.toggle(
                "active",
                item.dataset.section ===
                sectionName
            );
        });


    updatePageTitle(
        sectionName
    );


    /* Cargar datos */

    try {

        switch (sectionName) {

            case "dashboard":
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
        }

    } catch (error) {

        console.error(
            "❌ Error cargando sección:",
            error
        );
    }
}


/* =========================================================
   16. TÍTULO
========================================================= */

function updatePageTitle(
    sectionName
) {

    const titles = {

        dashboard: [
            "RESUMEN",
            "Dashboard"
        ],

        ingresos: [
            "FINANZAS",
            "Ingresos"
        ],

        salidas: [
            "FINANZAS",
            "Salidas"
        ],

        aportes: [
            "AHORRO",
            "Aportes"
        ],

        metas: [
            "OBJETIVOS",
            "Mis metas"
        ],

        reportes: [
            "ANÁLISIS",
            "Reportes"
        ],

        usuarios: [
            "ADMINISTRACIÓN",
            "Usuarios"
        ]
    };

    const info =
        titles[sectionName] ||
        [
            "FINANZAS",
            "FinanzasPersonales"
        ];

    setText(
        "#pageEyebrow",
        info[0]
    );

    setText(
        "#pageTitle",
        info[1]
    );

    setText(
        "[data-page-title]",
        info[1]
    );
}


/* =========================================================
   17. SIDEBAR
========================================================= */

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


/* =========================================================
   18. LOGOUT
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
                } =
                    await supabaseClient
                        .auth
                        .signOut();

                if (error) {
                    throw error;
                }

                currentUser = null;
                currentProfile = null;

                closeSidebar();

                showLogin();

                showToast(
                    "Sesión cerrada correctamente.",
                    "success"
                );

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
   19. DASHBOARD
========================================================= */

async function loadDashboard() {

    if (!currentUser) return;

    try {

        const [
            ingresos,
            salidas,
            aportes
        ] = await Promise.all([

            getTransactions(
                "ingresos"
            ),

            getTransactions(
                "salidas"
            ),

            getTransactions(
                "aportes"
            )
        ]);


        const totalIngresos =
            sumAmounts(
                ingresos
            );

        const totalSalidas =
            sumAmounts(
                salidas
            );

        const totalAportes =
            sumAmounts(
                aportes
            );

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
    }
}


/* =========================================================
   20. TRANSACCIONES
========================================================= */

async function getTransactions(
    tableName
) {

    if (!currentUser?.id) {
        return [];
    }

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
}


/* =========================================================
   21. NÚMEROS
========================================================= */

function updateDashboardNumbers({
    totalIngresos,
    totalSalidas,
    totalAportes,
    balance
}) {

    setText(
        "#incomeValue",
        formatMoney(
            totalIngresos
        )
    );

    setText(
        "#expenseValue",
        formatMoney(
            totalSalidas
        )
    );

    setText(
        "#contributionValue",
        formatMoney(
            totalAportes
        )
    );

    setText(
        "#balanceValue",
        formatMoney(
            balance
        )
    );
}


/* =========================================================
   22. GRÁFICO
========================================================= */

async function loadFlowChart(
    ingresos,
    salidas,
    aportes
) {

    const canvas =
        document.getElementById(
            "flowChart"
        );

    if (
        !canvas ||
        !window.Chart
    ) {
        return;
    }

    if (flowChart) {
        flowChart.destroy();
    }

    flowChart =
        new Chart(
            canvas,
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
                                sumAmounts(
                                    ingresos
                                ),

                                sumAmounts(
                                    salidas
                                ),

                                sumAmounts(
                                    aportes
                                )
                            ]
                        }
                    ]
                },

                options: {

                    responsive: true,

                    maintainAspectRatio:
                        false,

                    plugins: {

                        legend: {
                            position:
                                "bottom"
                        },

                        tooltip: {

                            callbacks: {

                                label:
                                    function (
                                        context
                                    ) {

                                        return (
                                            " " +
                                            context.label +
                                            ": " +
                                            formatMoney(
                                                context.raw
                                            )
                                        );
                                    }
                            }
                        }
                    }
                }
            }
        );
}


/* =========================================================
   23. ACTIVIDAD
========================================================= */

async function loadRecentActivity(
    ingresos,
    salidas,
    aportes
) {

    const container =
        document.getElementById(
            "recentActivity"
        );

    if (!container) return;

    const activities = [

        ...ingresos.map(
            item => ({
                ...item,
                type: "Ingreso"
            })
        ),

        ...salidas.map(
            item => ({
                ...item,
                type: "Salida"
            })
        ),

        ...aportes.map(
            item => ({
                ...item,
                type: "Aporte"
            })
        )

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
        .slice(
            0,
            8
        );


    if (!activities.length) {

        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">
                    <i class="fa-solid fa-receipt"></i>
                </div>

                <p>
                    No hay movimientos recientes.
                </p>
            </div>
        `;

        return;
    }


    container.innerHTML =
        activities
            .map(
                item => {

                    const amount =
                        Number(
                            item.monto ??
                            0
                        );

                    const description =
                        item.concepto ||
                        item.descripcion ||
                        item.categoria ||
                        "Movimiento";


                    return `
                        <div class="activity-item">

                            <div class="activity-icon">

                                <i class="fa-solid ${
                                    item.type === "Ingreso"
                                        ? "fa-arrow-down"
                                        : item.type === "Salida"
                                            ? "fa-arrow-up"
                                            : "fa-piggy-bank"
                                }"></i>

                            </div>

                            <div class="activity-info">

                                <strong>
                                    ${escapeHTML(
                                        description
                                    )}
                                </strong>

                                <span>
                                    ${item.type}
                                    ·
                                    ${formatDate(
                                        item.fecha ||
                                        item.created_at
                                    )}
                                </span>

                            </div>

                            <div class="activity-amount">

                                ${formatMoney(
                                    amount
                                )}

                            </div>

                        </div>
                    `;
                }
            )
            .join("");
}


/* =========================================================
   24. METAS PREVIEW
========================================================= */

async function loadGoalsPreview() {

    const container =
        document.getElementById(
            "goalsPreview"
        );

    if (
        !container ||
        !currentUser
    ) {
        return;
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
                )
                .limit(3);

        if (error) {
            throw error;
        }

        const goals =
            data || [];


        if (!goals.length) {

            container.innerHTML = `
                <div class="empty-state">

                    <div class="empty-icon">
                        <i class="fa-solid fa-bullseye"></i>
                    </div>

                    <p>
                        Todavía no tienes metas registradas.
                    </p>

                </div>
            `;

            return;
        }


        container.innerHTML =
            goals
                .map(
                    renderGoalCard
                )
                .join("");

    } catch (error) {

        console.error(
            "❌ Error cargando metas:",
            error
        );
    }
}


/* =========================================================
   25. METAS
========================================================= */

async function loadGoalsPage() {

    const container =
        document.getElementById(
            "goalsPageContainer"
        );

    if (
        !container ||
        !currentUser
    ) {
        return;
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
            throw error;
        }

        const goals =
            data || [];


        if (!goals.length) {

            container.innerHTML = `
                <div class="empty-state large">

                    <div class="empty-icon">
                        <i class="fa-solid fa-bullseye"></i>
                    </div>

                    <h3>
                        Sin metas todavía
                    </h3>

                    <p>
                        Crea tu primera meta financiera.
                    </p>

                </div>
            `;

            return;
        }


        container.innerHTML =
            goals
                .map(
                    renderGoalCard
                )
                .join("");

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
   26. TARJETA META
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
                    (current /
                        target) *
                    100
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
                        ${escapeHTML(
                            name
                        )}
                    </h3>

                    ${
                        goal.descripcion
                            ? `
                                <p>
                                    ${escapeHTML(
                                        goal.descripcion
                                    )}
                                </p>
                            `
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
                    style="width:${percentage}%"
                ></div>

            </div>


            <div class="goal-values">

                <span>
                    ${formatMoney(
                        current
                    )}
                </span>

                <span>
                    ${formatMoney(
                        target
                    )}
                </span>

            </div>

        </div>
    `;
}


/* =========================================================
   27. REPORTES
========================================================= */

async function loadReports() {

    if (!currentUser) return;

    const [
        ingresos,
        salidas,
        aportes
    ] = await Promise.all([

        getTransactions(
            "ingresos"
        ),

        getTransactions(
            "salidas"
        ),

        getTransactions(
            "aportes"
        )
    ]);


    const totalIngresos =
        sumAmounts(
            ingresos
        );

    const totalSalidas =
        sumAmounts(
            salidas
        );

    const totalAportes =
        sumAmounts(
            aportes
        );

    const balance =
        totalIngresos -
        totalSalidas -
        totalAportes;


    setText(
        "#reportIncome",
        formatMoney(
            totalIngresos
        )
    );

    setText(
        "#reportExpense",
        formatMoney(
            totalSalidas
        )
    );

    setText(
        "#reportContribution",
        formatMoney(
            totalAportes
        )
    );

    setText(
        "#reportBalance",
        formatMoney(
            balance
        )
    );

    loadExpenseChart(
        salidas
    );
}


/* =========================================================
   28. GRÁFICO GASTOS
========================================================= */

function loadExpenseChart(
    salidas
) {

    const canvas =
        document.getElementById(
            "expenseChart"
        );

    if (
        !canvas ||
        !window.Chart
    ) {
        return;
    }

    const grouped = {};

    salidas.forEach(
        item => {

            const category =
                item.categoria ||
                "Otros";

            const amount =
                Number(
                    item.monto || 0
                );

            grouped[category] =
                (
                    grouped[category] ||
                    0
                ) +
                amount;
        }
    );


    if (expenseChart) {
        expenseChart.destroy();
    }


    expenseChart =
        new Chart(
            canvas,
            {
                type: "bar",

                data: {

                    labels:
                        Object.keys(
                            grouped
                        ),

                    datasets: [
                        {
                            label:
                                "Gastos",

                            data:
                                Object.values(
                                    grouped
                                )
                        }
                    ]
                },

                options: {
                    responsive: true,

                    maintainAspectRatio:
                        false
                }
            }
        );
}


/* =========================================================
   29. ADMIN
========================================================= */

function isAdmin() {

    if (!currentProfile) {
        return false;
    }

    const role =
        String(
            currentProfile.rol ||
            ""
        ).toLowerCase();

    return [
        "admin",
        "administrador",
        "superadmin"
    ].includes(
        role
    );
}


/* =========================================================
   30. CARGAR USUARIOS
========================================================= */

async function loadUsers() {

    if (!isAdmin()) return;

    const container =
        document.getElementById(
            "usersTableBody"
        );

    if (!container) return;

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
            throw error;
        }

        allUsers =
            data || [];

        renderUsers(
            allUsers
        );

        updateUserCount(
            allUsers
        );

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
   31. RENDER USUARIOS
========================================================= */

function renderUsers(
    users
) {

    const container =
        document.getElementById(
            "usersTableBody"
        );

    if (!container) return;


    if (!users.length) {

        container.innerHTML = `
            <tr>

                <td colspan="6">

                    <div class="table-empty">

                        <i class="fa-solid fa-users"></i>

                        <span>
                            No se encontraron usuarios.
                        </span>

                    </div>

                </td>

            </tr>
        `;

        return;
    }


    container.innerHTML =
        users
            .map(
                user => {

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
                            user.estado ||
                            "activo"
                        ).toLowerCase();


                    const role =
                        String(
                            user.rol ||
                            "usuario"
                        ).toLowerCase();


                    return `
                        <tr>

                            <td>

                                <div class="user-info">

                                    <div class="user-avatar">
                                        ${escapeHTML(
                                            getInitials(
                                                name
                                            )
                                        )}
                                    </div>

                                    <div>

                                        <strong>
                                            ${escapeHTML(
                                                name
                                            )}
                                        </strong>

                                        <span>
                                            @${escapeHTML(
                                                user.usuario ||
                                                ""
                                            )}
                                        </span>

                                    </div>

                                </div>

                            </td>


                            <td>
                                ${escapeHTML(
                                    user.email ||
                                    ""
                                )}
                            </td>


                            <td>

                                <span class="badge role-${escapeHTML(
                                    role
                                )}">
                                    ${escapeHTML(
                                        formatRole(
                                            role
                                        )
                                    )}
                                </span>

                            </td>


                            <td>

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

                            </td>


                            <td>
                                ${escapeHTML(
                                    user.moneda ||
                                    "PEN"
                                )}
                            </td>


                            <td>

                                ${
                                    user.id !==
                                    currentUser?.id

                                        ? `
                                            <button
                                                type="button"
                                                class="btn-toggle-user"
                                                data-toggle-user="${escapeHTML(
                                                    user.id
                                                )}"
                                            >
                                                ${
                                                    status ===
                                                    "activo"
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

                            </td>

                        </tr>
                    `;
                }
            )
            .join("");


    container
        .querySelectorAll(
            "[data-toggle-user]"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    async () => {

                        await toggleUserStatus(
                            button.dataset
                                .toggleUser
                        );
                    }
                );
            }
        );
}


/* =========================================================
   32. CAMBIAR ESTADO
========================================================= */

async function toggleUserStatus(
    userId
) {

    if (!isAdmin()) return;

    const user =
        allUsers.find(
            item =>
                item.id ===
                userId
        );

    if (!user) return;


    const currentStatus =
        String(
            user.estado ||
            "activo"
        ).toLowerCase();


    const newStatus =
        currentStatus ===
        "activo"
            ? "inactivo"
            : "activo";


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
            error
        );

        showToast(
            "No se pudo actualizar el usuario.",
            "error"
        );
    }
}


/* =========================================================
   33. BÚSQUEDA
========================================================= */

function setupUserSearch() {

    const input =
        document.getElementById(
            "userSearch"
        );

    input?.addEventListener(
        "input",
        applyUserFilters
    );
}


function setupUserFilters() {

    document
        .getElementById(
            "userRoleFilter"
        )
        ?.addEventListener(
            "change",
            applyUserFilters
        );

    document
        .getElementById(
            "userStatusFilter"
        )
        ?.addEventListener(
            "change",
            applyUserFilters
        );
}


function applyUserFilters() {

    const search =
        (
            document.getElementById(
                "userSearch"
            )?.value ||
            ""
        )
            .trim()
            .toLowerCase();


    const roleFilter =
        document.getElementById(
            "userRoleFilter"
        )?.value ||
        "all";


    const statusFilter =
        document.getElementById(
            "userStatusFilter"
        )?.value ||
        "all";


    const filtered =
        allUsers.filter(
            user => {

                const text = [
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
                        user.rol ||
                        ""
                    ).toLowerCase();


                const status =
                    String(
                        user.estado ||
                        ""
                    ).toLowerCase();


                return (
                    (!search ||
                        text.includes(
                            search
                        )) &&

                    (
                        roleFilter ===
                        "all" ||
                        role ===
                        roleFilter
                    ) &&

                    (
                        statusFilter ===
                        "all" ||
                        status ===
                        statusFilter
                    )
                );
            }
        );


    renderUsers(
        filtered
    );

    updateUserCount(
        filtered
    );
}


/* =========================================================
   34. CONTADOR
========================================================= */

function updateUserCount(
    users
) {

    const count =
        document.getElementById(
            "userCount"
        );

    if (!count) return;

    count.textContent =
        `${users.length} ${
            users.length === 1
                ? "usuario"
                : "usuarios"
        }`;
}


/* =========================================================
   35. MODAL CREAR USUARIO
========================================================= */

function setupCreateUserModal() {

    const openButton =
        document.getElementById(
            "openCreateUserModal"
        );

    const closeButton =
        document.getElementById(
            "closeCreateUserModal"
        );

    const cancelButton =
        document.getElementById(
            "cancelCreateUser"
        );

    const form =
        document.getElementById(
            "createUserForm"
        );


    openButton?.addEventListener(
        "click",
        () => {

            if (!isAdmin()) {

                showToast(
                    "No tienes permisos para crear usuarios.",
                    "error"
                );

                return;
            }

            openModal(
                "createUserModal"
            );
        }
    );


    closeButton?.addEventListener(
        "click",
        () => {
            closeModal(
                "createUserModal"
            );
        }
    );


    cancelButton?.addEventListener(
        "click",
        () => {
            closeModal(
                "createUserModal"
            );
        }
    );


    form?.addEventListener(
        "submit",
        handleCreateUser
    );
}


/* =========================================================
   36. CREAR USUARIO
========================================================= */

async function handleCreateUser(
    event
) {

    event.preventDefault();

    if (!isAdmin()) {
        return;
    }


    const nombre =
        document.getElementById(
            "newUserNombre"
        )?.value.trim();


    const apellido =
        document.getElementById(
            "newUserApellido"
        )?.value.trim();


    const usuario =
        document.getElementById(
            "newUserUsuario"
        )?.value.trim();


    const moneda =
        document.getElementById(
            "newUserMoneda"
        )?.value ||
        "PEN";


    const email =
        document.getElementById(
            "newUserEmail"
        )?.value.trim();


    const password =
        document.getElementById(
            "newUserPassword"
        )?.value;


    if (
        !nombre ||
        !email ||
        !password
    ) {

        showToast(
            "Completa los campos obligatorios.",
            "warning"
        );

        return;
    }


    const submit =
        document.getElementById(
            "createUserSubmit"
        );

    if (submit) {
        submit.disabled =
            true;
    }


    try {

        const {
            data,
            error
        } =
            await supabaseClient
                .functions
                .invoke(
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


        closeModal(
            "createUserModal"
        );


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

    } finally {

        if (submit) {
            submit.disabled =
                false;
        }
    }
}


/* =========================================================
   37. GENERADOR CONTRASEÑA
========================================================= */

function setupPasswordGenerator() {

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

            input.value =
                generatePassword(
                    12
                );

            input.focus();

            showToast(
                "Contraseña generada.",
                "success"
            );
        }
    );
}


function generatePassword(
    length = 12
) {

    const characters =
        "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";

    let result = "";

    for (
        let i = 0;
        i < length;
        i++
    ) {

        result +=
            characters.charAt(
                Math.floor(
                    Math.random() *
                    characters.length
                )
            );
    }

    return result;
}


/* =========================================================
   38. TEMA
========================================================= */

function setupThemeToggle() {

    const button =
        document.getElementById(
            "themeToggle"
        );

    const saved =
        localStorage.getItem(
            "finanzas-theme"
        );


    if (saved) {

        applyTheme(
            saved
        );

    } else {

        const dark =
            window.matchMedia?.(
                "(prefers-color-scheme: dark)"
            ).matches;

        applyTheme(
            dark
                ? "dark"
                : "light"
        );
    }


    button?.addEventListener(
        "click",
        () => {

            const current =
                document.documentElement
                    .dataset.theme ||
                "light";


            applyTheme(
                current === "dark"
                    ? "light"
                    : "dark"
            );
        }
    );
}


function applyTheme(
    theme
) {

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


    const button =
        document.getElementById(
            "themeToggle"
        );


    if (button) {

        const icon =
            button.querySelector(
                "i"
            );

        const text =
            button.querySelector(
                "span"
            );


        if (icon) {

            icon.className =
                theme === "dark"
                    ? "fa-solid fa-sun"
                    : "fa-solid fa-moon";
        }


        if (text) {

            const iconHTML =
                theme === "dark"
                    ? `<i class="fa-solid fa-sun"></i>`
                    : `<i class="fa-solid fa-moon"></i>`;

            text.innerHTML =
                `${iconHTML} ${
                    theme === "dark"
                        ? "Modo claro"
                        : "Modo oscuro"
                }`;
        }
    }
}


/* =========================================================
   39. ACCIONES RÁPIDAS
========================================================= */

function setupQuickActions() {

    /* Registrar movimiento */

    document
        .querySelectorAll(
            ".primary-action[data-section]"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    async () => {

                        const section =
                            button.dataset
                                .section;

                        if (section) {

                            await showSection(
                                section
                            );
                        }
                    }
                );
            }
        );


    /* Ver todos */

    document
        .querySelectorAll(
            ".text-button[data-section]"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    async () => {

                        await showSection(
                            button.dataset
                                .section
                        );
                    }
                );
            }
        );


    /* Nuevos movimientos */

    const incomeButton =
        findSectionAction(
            "ingresos"
        );

    const expenseButton =
        findSectionAction(
            "salidas"
        );

    const contributionButton =
        findSectionAction(
            "aportes"
        );

    const goalButton =
        findSectionAction(
            "metas"
        );


    incomeButton?.addEventListener(
        "click",
        () => {
            openTransactionModal(
                "ingresos"
            );
        }
    );


    expenseButton?.addEventListener(
        "click",
        () => {
            openTransactionModal(
                "salidas"
            );
        }
    );


    contributionButton?.addEventListener(
        "click",
        () => {
            openTransactionModal(
                "aportes"
            );
        }
    );


    goalButton?.addEventListener(
        "click",
        () => {
            openGoalModal();
        }
    );
}


function findSectionAction(
    section
) {

    const page =
        document.getElementById(
            section
        );

    if (!page) return null;

    return page.querySelector(
        ".section-header .primary-action"
    );
}


/* =========================================================
   40. MODAL MOVIMIENTOS
========================================================= */

function openTransactionModal(
    type
) {

    const names = {

        ingresos:
            "Nuevo ingreso",

        salidas:
            "Nueva salida",

        aportes:
            "Nuevo aporte"
    };


    const modal =
        createDynamicModal(
            "transactionModal"
        );


    modal.innerHTML = `

        <div class="modal-card">

            <div class="modal-header">

                <div>

                    <span class="modal-eyebrow">
                        FINANZAS
                    </span>

                    <h2>
                        ${names[type]}
                    </h2>

                    <p>
                        Registra un nuevo movimiento.
                    </p>

                </div>

                <button
                    type="button"
                    class="modal-close"
                    data-close-dynamic
                >
                    <i class="fa-solid fa-xmark"></i>
                </button>

            </div>


            <form id="transactionForm">

                <div class="form-group">

                    <label>
                        Concepto
                    </label>

                    <input
                        id="transactionConcept"
                        type="text"
                        placeholder="Ej. Sueldo"
                        required
                    >

                </div>


                <div class="form-row">

                    <div class="form-group">

                        <label>
                            Monto
                        </label>

                        <input
                            id="transactionAmount"
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="0.00"
                            required
                        >

                    </div>


                    <div class="form-group">

                        <label>
                            Fecha
                        </label>

                        <input
                            id="transactionDate"
                            type="date"
                            value="${getToday()}"
                            required
                        >

                    </div>

                </div>


                <div class="form-group">

                    <label>
                        Categoría
                    </label>

                    <input
                        id="transactionCategory"
                        type="text"
                        placeholder="Ej. Trabajo, alimentación..."
                    >

                </div>


                <div class="form-group">

                    <label>
                        Descripción
                    </label>

                    <textarea
                        id="transactionDescription"
                        rows="3"
                        placeholder="Descripción opcional..."
                    ></textarea>

                </div>


                <div class="modal-actions">

                    <button
                        type="button"
                        class="secondary-action"
                        data-close-dynamic
                    >
                        Cancelar
                    </button>

                    <button
                        type="submit"
                        class="primary-action"
                    >
                        <i class="fa-solid fa-check"></i>
                        Guardar
                    </button>

                </div>

            </form>

        </div>
    `;


    document.body.appendChild(
        modal
    );


    activateDynamicModal(
        modal
    );


    document
        .getElementById(
            "transactionForm"
        )
        .addEventListener(
            "submit",
            async event => {

                event.preventDefault();

                await saveTransaction(
                    type,
                    modal
                );
            }
        );
}


/* =========================================================
   41. GUARDAR MOVIMIENTO
========================================================= */

async function saveTransaction(
    type,
    modal
) {

    const table =
        type;


    const concepto =
        document.getElementById(
            "transactionConcept"
        ).value.trim();


    const monto =
        Number(
            document.getElementById(
                "transactionAmount"
            ).value
        );


    const fecha =
        document.getElementById(
            "transactionDate"
        ).value;


    const categoria =
        document.getElementById(
            "transactionCategory"
        ).value.trim();


    const descripcion =
        document.getElementById(
            "transactionDescription"
        ).value.trim();


    if (
        !concepto ||
        !monto ||
        !fecha
    ) {

        showToast(
            "Completa los campos obligatorios.",
            "warning"
        );

        return;
    }


    try {

        const {
            error
        } =
            await supabaseClient
                .from(table)
                .insert({

                    user_id:
                        currentUser.id,

                    concepto,

                    monto,

                    categoria:
                        categoria ||
                        null,

                    fecha,

                    descripcion:
                        descripcion ||
                        null
                });


        if (error) {
            throw error;
        }


        showToast(
            `${
                type === "ingresos"
                    ? "Ingreso"
                    : type === "salidas"
                        ? "Salida"
                        : "Aporte"
            } registrado correctamente.`,
            "success"
        );


        modal.remove();

        await loadDashboard();

        if (
            document
                .getElementById(
                    "reportes"
                )
                ?.classList.contains(
                    "active"
                )
        ) {
            await loadReports();
        }

    } catch (error) {

        console.error(
            "❌ Error guardando movimiento:",
            error
        );

        showToast(
            error?.message ||
            "No se pudo guardar el movimiento.",
            "error"
        );
    }
}


/* =========================================================
   42. MODAL META
========================================================= */

function openGoalModal() {

    const modal =
        createDynamicModal(
            "goalModal"
        );


    modal.innerHTML = `

        <div class="modal-card">

            <div class="modal-header">

                <div>

                    <span class="modal-eyebrow">
                        OBJETIVOS
                    </span>

                    <h2>
                        Nueva meta
                    </h2>

                    <p>
                        Define un nuevo objetivo financiero.
                    </p>

                </div>

                <button
                    type="button"
                    class="modal-close"
                    data-close-dynamic
                >
                    <i class="fa-solid fa-xmark"></i>
                </button>

            </div>


            <form id="goalForm">

                <div class="form-group">

                    <label>
                        Nombre de la meta
                    </label>

                    <input
                        id="goalName"
                        type="text"
                        placeholder="Ej. Viaje, laptop, emergencia..."
                        required
                    >

                </div>


                <div class="form-row">

                    <div class="form-group">

                        <label>
                            Monto objetivo
                        </label>

                        <input
                            id="goalTarget"
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="0.00"
                            required
                        >

                    </div>


                    <div class="form-group">

                        <label>
                            Monto actual
                        </label>

                        <input
                            id="goalCurrent"
                            type="number"
                            min="0"
                            step="0.01"
                            value="0"
                        >

                    </div>

                </div>


                <div class="form-group">

                    <label>
                        Descripción
                    </label>

                    <textarea
                        id="goalDescription"
                        rows="3"
                        placeholder="Describe tu objetivo..."
                    ></textarea>

                </div>


                <div class="modal-actions">

                    <button
                        type="button"
                        class="secondary-action"
                        data-close-dynamic
                    >
                        Cancelar
                    </button>

                    <button
                        type="submit"
                        class="primary-action"
                    >
                        <i class="fa-solid fa-bullseye"></i>
                        Crear meta
                    </button>

                </div>

            </form>

        </div>
    `;


    document.body.appendChild(
        modal
    );


    activateDynamicModal(
        modal
    );


    document
        .getElementById(
            "goalForm"
        )
        .addEventListener(
            "submit",
            async event => {

                event.preventDefault();

                await saveGoal(
                    modal
                );
            }
        );
}


/* =========================================================
   43. GUARDAR META
========================================================= */

async function saveGoal(
    modal
) {

    const nombre =
        document
            .getElementById(
                "goalName"
            )
            .value
            .trim();


    const monto_objetivo =
        Number(
            document
                .getElementById(
                    "goalTarget"
                )
                .value
        );


    const monto_actual =
        Number(
            document
                .getElementById(
                    "goalCurrent"
                )
                .value ||
            0
        );


    const descripcion =
        document
            .getElementById(
                "goalDescription"
            )
            .value
            .trim();


    if (
        !nombre ||
        !monto_objetivo
    ) {

        showToast(
            "Completa los campos obligatorios.",
            "warning"
        );

        return;
    }


    try {

        const {
            error
        } =
            await supabaseClient
                .from("metas")
                .insert({

                    user_id:
                        currentUser.id,

                    nombre,

                    monto_objetivo,

                    monto_actual,

                    descripcion:
                        descripcion ||
                        null
                });


        if (error) {
            throw error;
        }


        showToast(
            "Meta creada correctamente.",
            "success"
        );


        modal.remove();

        await loadGoalsPage();

        await loadGoalsPreview();

        await loadDashboard();

    } catch (error) {

        console.error(
            "❌ Error creando meta:",
            error
        );

        showToast(
            error?.message ||
            "No se pudo crear la meta.",
            "error"
        );
    }
}


/* =========================================================
   44. MODALES DINÁMICOS
========================================================= */

function createDynamicModal(
    id
) {

    const existing =
        document.getElementById(
            id
        );

    if (existing) {
        existing.remove();
    }


    const modal =
        document.createElement(
            "div"
        );

    modal.id =
        id;

    modal.className =
        "modal-overlay active";

    modal.setAttribute(
        "aria-hidden",
        "false"
    );


    return modal;
}


function activateDynamicModal(
    modal
) {

    document.body.appendChild(
        modal
    );

    document.body.classList.add(
        "modal-open"
    );


    modal
        .querySelectorAll(
            "[data-close-dynamic]"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {
                        modal.remove();

                        if (
                            !document
                                .querySelector(
                                    ".modal-overlay"
                                )
                        ) {
                            document.body.classList.remove(
                                "modal-open"
                            );
                        }
                    }
                );
            }
        );


    modal.addEventListener(
        "click",
        event => {

            if (
                event.target ===
                modal
            ) {
                modal.remove();

                document.body.classList.remove(
                    "modal-open"
                );
            }
        }
    );
}


/* =========================================================
   45. MODAL ESTÁTICO
========================================================= */

function openModal(
    id
) {

    const modal =
        document.getElementById(
            id
        );

    if (!modal) return;

    modal.classList.add(
        "active"
    );

    modal.setAttribute(
        "aria-hidden",
        "false"
    );

    document.body.classList.add(
        "modal-open"
    );
}


function closeModal(
    id
) {

    const modal =
        document.getElementById(
            id
        );

    if (!modal) return;

    modal.classList.remove(
        "active"
    );

    modal.setAttribute(
        "aria-hidden",
        "true"
    );

    document.body.classList.remove(
        "modal-open"
    );
}


function closeAllModals() {

    document
        .querySelectorAll(
            ".modal-overlay"
        )
        .forEach(
            modal => {

                modal.classList.remove(
                    "active"
                );

                if (
                    modal.id !==
                    "createUserModal"
                ) {
                    modal.remove();
                }
            }
        );

    document.body.classList.remove(
        "modal-open"
    );
}


/* =========================================================
   46. OLVIDÉ CONTRASEÑA
========================================================= */

function setupForgotPassword() {

    const button =
        document.getElementById(
            "forgotPassword"
        );

    button?.addEventListener(
        "click",
        async event => {

            event.preventDefault();

            const email =
                loginEmail?.value.trim();


            if (!email) {

                showToast(
                    "Escribe primero tu correo electrónico.",
                    "warning"
                );

                loginEmail?.focus();

                return;
            }


            try {

                const {
                    error
                } =
                    await supabaseClient
                        .auth
                        .resetPasswordForEmail(
                            email,
                            {
                                redirectTo:
                                    window.location
                                        .origin
                            }
                        );


                if (error) {
                    throw error;
                }


                showToast(
                    "Revisa tu correo para restablecer tu contraseña.",
                    "success"
                );

            } catch (error) {

                console.error(
                    error
                );

                showToast(
                    error?.message ||
                    "No se pudo enviar el correo.",
                    "error"
                );
            }
        }
    );
}


/* =========================================================
   47. NOTIFICACIONES
========================================================= */

function setupNotificationButton() {

    const button =
        document.querySelector(
            ".topbar-icon"
        );

    button?.addEventListener(
        "click",
        () => {

            showToast(
                "No tienes nuevas notificaciones.",
                "info"
            );
        }
    );
}


/* =========================================================
   48. PERFIL
========================================================= */

function setupProfileButton() {

    const button =
        document.querySelector(
            ".profile-menu"
        );

    button?.addEventListener(
        "click",
        () => {

            showToast(
                "El menú de perfil estará disponible próximamente.",
                "info"
            );
        }
    );
}


/* =========================================================
   49. ESCAPE
========================================================= */

function setupEscapeKey() {

    document.addEventListener(
        "keydown",
        event => {

            if (
                event.key ===
                "Escape"
            ) {

                closeAllModals();

                closeSidebar();
            }
        }
    );
}


/* =========================================================
   50. TOAST
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
            document.createElement(
                "div"
            );

        container.id =
            "toast-container";

        document.body.appendChild(
            container
        );
    }


    const toast =
        document.createElement(
            "div"
        );

    toast.className =
        `toast toast-${type}`;


    const icons = {

        success:
            "fa-check-circle",

        error:
            "fa-times-circle",

        warning:
            "fa-exclamation-triangle",

        info:
            "fa-info-circle"
    };


    toast.innerHTML = `

        <i class="fas ${
            icons[type] ||
            icons.info
        }"></i>

        <span>
            ${escapeHTML(
                message
            )}
        </span>

        <button
            type="button"
            class="toast-close"
        >
            &times;
        </button>

    `;


    container.appendChild(
        toast
    );


    toast
        .querySelector(
            ".toast-close"
        )
        ?.addEventListener(
            "click",
            () => {
                removeToast(
                    toast
                );
            }
        );


    requestAnimationFrame(
        () => {
            toast.classList.add(
                "show"
            );
        }
    );


    setTimeout(
        () => {
            removeToast(
                toast
            );
        },
        5000
    );
}


function removeToast(
    toast
) {

    if (!toast) return;

    toast.classList.remove(
        "show"
    );

    setTimeout(
        () => {
            toast.remove();
        },
        300
    );
}


/* =========================================================
   51. UTILIDADES
========================================================= */

function sumAmounts(
    items = []
) {

    return items.reduce(
        (
            total,
            item
        ) => {

            const amount =
                Number(
                    item.monto ??
                    0
                );

            return (
                total +
                (
                    Number.isFinite(
                        amount
                    )
                        ? amount
                        : 0
                )
            );
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


    try {

        return new Intl.NumberFormat(
            "es-PE",
            {
                style:
                    "currency",

                currency,

                minimumFractionDigits:
                    2
            }
        ).format(
            Number(amount) || 0
        );

    } catch {

        return `S/ ${
            Number(
                amount
            ).toFixed(2)
        }`;
    }
}


function formatDate(
    date
) {

    if (!date) {
        return "Sin fecha";
    }

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
            day:
                "2-digit",

            month:
                "2-digit",

            year:
                "numeric"
        }
    ).format(
        parsed
    );
}


function getToday() {

    const date =
        new Date();

    const year =
        date.getFullYear();

    const month =
        String(
            date.getMonth() + 1
        ).padStart(
            2,
            "0"
        );

    const day =
        String(
            date.getDate()
        ).padStart(
            2,
            "0"
        );

    return `${year}-${month}-${day}`;
}


function getInitials(
    name = ""
) {

    const parts =
        String(name)
            .trim()
            .split(/\s+/)
            .filter(Boolean);


    if (!parts.length) {
        return "U";
    }


    if (
        parts.length === 1
    ) {

        return parts[0]
            .substring(
                0,
                2
            )
            .toUpperCase();
    }


    return (
        parts[0][0] +
        parts[
            parts.length - 1
        ][0]
    ).toUpperCase();
}


function formatRole(
    role
) {

    const roles = {

        admin:
            "Administrador",

        administrador:
            "Administrador",

        superadmin:
            "Super administrador",

        usuario:
            "Usuario",

        user:
            "Usuario"
    };


    return (
        roles[
            String(
                role
            ).toLowerCase()
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
        .querySelectorAll(
            selector
        )
        .forEach(
            element => {

                element.textContent =
                    value ??
                    "";
            }
        );
}


/* =========================================================
   52. ERRORES LOGIN
========================================================= */

function getFriendlyAuthError(
    error
) {

    const message =
        String(
            error?.message ||
            ""
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


/* =========================================================
   53. SEGURIDAD HTML
========================================================= */

function escapeHTML(
    value
) {

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
   54. DEBUG
========================================================= */

window.FinanzasApp = {

    getCurrentUser:
        () => currentUser,

    getCurrentProfile:
        () => currentProfile,

    showSection,

    loadDashboard,

    loadUsers,

    loadGoalsPage,

    loadReports,

    openModal,

    closeModal,

    showToast,

    formatMoney,

    formatDate,

    openTransactionModal,

    openGoalModal
};


console.log(
    "💰 FinanzasPersonales listo."
);
