/* ==========================================================
   FINANZASPERSONALES
   APP.JS
========================================================== */


/* ==========================================================
   SUPABASE
========================================================== */

const SUPABASE_URL = "TU_SUPABASE_URL";

const SUPABASE_ANON_KEY = "TU_SUPABASE_ANON_KEY";

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
);


/* ==========================================================
   ESTADO
========================================================== */

let currentUser = null;
let currentProfile = null;

let financeChart = null;
let expenseChart = null;


/* ==========================================================
   DOM
========================================================== */

const sidebar = document.getElementById("sidebar");

const menuToggle =
    document.getElementById("menuToggle");

const logoutBtn =
    document.getElementById("logoutBtn");

const pageTitle =
    document.getElementById("pageTitle");

const userName =
    document.getElementById("userName");

const userRole =
    document.getElementById("userRole");

const userAvatar =
    document.getElementById("userAvatar");

const welcomeName =
    document.getElementById("welcomeName");

const adminMenu =
    document.getElementById("adminMenu");

const userModal =
    document.getElementById("userModal");

const newUserBtn =
    document.getElementById("newUserBtn");

const closeUserModal =
    document.getElementById("closeUserModal");

const cancelUserModal =
    document.getElementById("cancelUserModal");

const createUserForm =
    document.getElementById("createUserForm");

const togglePassword =
    document.getElementById("togglePassword");

const newPassword =
    document.getElementById("newPassword");

const userFormMessage =
    document.getElementById("userFormMessage");

const toast =
    document.getElementById("toast");

const toastMessage =
    document.getElementById("toastMessage");


/* ==========================================================
   INICIO
========================================================== */

document.addEventListener(
    "DOMContentLoaded",
    initializeApp
);


async function initializeApp() {

    console.log(
        "🚀 FinanzasPersonales iniciando..."
    );

    setupNavigation();

    setupMobileMenu();

    setupUserModal();

    setupPasswordToggle();

    setupLogout();

    setupTheme();

    await checkSession();
}


/* ==========================================================
   SESIÓN
========================================================== */

async function checkSession() {

    const {
        data,
        error
    } = await supabaseClient.auth.getSession();

    if (error) {

        console.error(
            "Error obteniendo sesión:",
            error
        );

        return;
    }

    if (!data.session) {

        console.log(
            "No existe una sesión activa."
        );

        /*
         * Posteriormente aquí redirigiremos
         * al login.
         */

        return;
    }

    currentUser =
        data.session.user;

    await loadUserProfile();

}


/* ==========================================================
   PERFIL
========================================================== */

async function loadUserProfile() {

    const {
        data,
        error
    } = await supabaseClient
        .from("profiles")
        .select("*")
        .eq("id", currentUser.id)
        .single();


    if (error) {

        console.error(
            "Error cargando perfil:",
            error
        );

        showToast(
            "No se pudo cargar tu perfil."
        );

        return;
    }


    currentProfile = data;

    updateInterface();

    await loadDashboard();

    if (
        currentProfile.rol === "admin"
    ) {

        await loadUsers();

    }

}


/* ==========================================================
   ACTUALIZAR INTERFAZ
========================================================== */

function updateInterface() {

    const nombre =
        currentProfile.nombre ||
        "Usuario";


    userName.textContent =
        `${nombre} ${currentProfile.apellido || ""}`
            .trim();


    welcomeName.textContent =
        nombre;


    userRole.textContent =
        currentProfile.rol === "admin"
            ? "Administrador"
            : "Usuario";


    userAvatar.textContent =
        nombre
            .charAt(0)
            .toUpperCase();


    /*
     * Mostrar administración
     */

    if (
        currentProfile.rol === "admin"
    ) {

        adminMenu.style.display =
            "block";

    } else {

        adminMenu.style.display =
            "none";
    }

}


/* ==========================================================
   NAVEGACIÓN
========================================================== */

function setupNavigation() {

    document.addEventListener(
        "click",
        event => {

            const button =
                event.target.closest(
                    "[data-section]"
                );

            if (!button) return;

            const section =
                button.dataset.section;

            navigateTo(section);
        }
    );

}


function navigateTo(section) {

    /*
     * Seguridad visual.
     * Un usuario normal no debe ver
     * el módulo administrativo.
     */

    if (
        section === "usuarios" ||
        section === "configuracion"
    ) {

        if (
            !currentProfile ||
            currentProfile.rol !== "admin"
        ) {

            showToast(
                "No tienes permisos para acceder."
            );

            return;
        }
    }


    document
        .querySelectorAll(".page-section")
        .forEach(sectionElement => {

            sectionElement.classList.remove(
                "active"
            );

        });


    const target =
        document.getElementById(
            `${section}Section`
        );


    if (!target) return;


    target.classList.add("active");


    document
        .querySelectorAll(".nav-item")
        .forEach(item => {

            item.classList.toggle(
                "active",
                item.dataset.section === section
            );

        });


    const titles = {

        dashboard:
            "Dashboard",

        ingresos:
            "Ingresos",

        salidas:
            "Salidas",

        aportes:
            "Aportes",

        otros:
            "Otros",

        metas:
            "Metas",

        reportes:
            "Reportes",

        usuarios:
            "Usuarios",

        configuracion:
            "Configuración"
    };


    pageTitle.textContent =
        titles[section] || "Dashboard";


    sidebar.classList.remove("open");


    if (section === "reportes") {

        setTimeout(
            initializeExpenseChart,
            100
        );

    }

}


/* ==========================================================
   MOBILE
========================================================== */

function setupMobileMenu() {

    menuToggle.addEventListener(
        "click",
        () => {

            sidebar.classList.toggle(
                "open"
            );

        }
    );

}


/* ==========================================================
   DASHBOARD
========================================================== */

async function loadDashboard() {

    if (!currentUser) return;


    try {

        const [
            incomes,
            expenses,
            savings
        ] = await Promise.all([

            getUserData("ingresos"),

            getUserData("salidas"),

            getUserData("aportes")

        ]);


        const incomeTotal =
            sumAmounts(incomes);


        const expenseTotal =
            sumAmounts(expenses);


        const savingTotal =
            sumAmounts(savings);


        const balance =
            incomeTotal -
            expenseTotal -
            savingTotal;


        document
            .getElementById("incomeValue")
            .textContent =
            formatMoney(incomeTotal);


        document
            .getElementById("expenseValue")
            .textContent =
            formatMoney(expenseTotal);


        document
            .getElementById("savingValue")
            .textContent =
            formatMoney(savingTotal);


        document
            .getElementById("balanceValue")
            .textContent =
            formatMoney(balance);


        initializeFinanceChart(
            incomes,
            expenses
        );


        renderRecentActivity(
            incomes,
            expenses,
            savings
        );

    } catch (error) {

        console.error(
            "Error dashboard:",
            error
        );

    }

}


/* ==========================================================
   OBTENER DATOS
========================================================== */

async function getUserData(
    table
) {

    const {
        data,
        error
    } = await supabaseClient
        .from(table)
        .select("*")
        .eq(
            "user_id",
            currentUser.id
        )
        .order(
            "fecha",
            {
                ascending: false
            }
        );


    if (error) {

        console.error(
            `Error ${table}:`,
            error
        );

        return [];
    }


    return data || [];

}


/* ==========================================================
   SUMA
========================================================== */

function sumAmounts(data) {

    return data.reduce(
        (total, item) => {

            return total +
                Number(item.monto || 0);

        },
        0
    );

}


/* ==========================================================
   FORMATO DINERO
========================================================== */

function formatMoney(amount) {

    return Number(amount || 0)
        .toLocaleString(
            "es-PE",
            {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }
        );

}


/* ==========================================================
   GRÁFICO
========================================================== */

function initializeFinanceChart(
    incomes,
    expenses
) {

    const canvas =
        document.getElementById(
            "financeChart"
        );


    if (!canvas) return;


    if (financeChart) {

        financeChart.destroy();

    }


    const months =
        getLastMonths(6);


    const incomeValues =
        months.map(month => {

            return incomes
                .filter(item =>
                    item.fecha?.startsWith(month.key)
                )
                .reduce(
                    (sum, item) =>
                        sum +
                        Number(item.monto || 0),
                    0
                );

        });


    const expenseValues =
        months.map(month => {

            return expenses
                .filter(item =>
                    item.fecha?.startsWith(month.key)
                )
                .reduce(
                    (sum, item) =>
                        sum +
                        Number(item.monto || 0),
                    0
                );

        });


    financeChart =
        new Chart(
            canvas,
            {

                type: "line",

                data: {

                    labels:
                        months.map(
                            month => month.label
                        ),

                    datasets: [

                        {
                            label:
                                "Ingresos",

                            data:
                                incomeValues,

                            borderWidth: 2,

                            tension: .4,

                            fill: false,

                            pointRadius: 3
                        },

                        {
                            label:
                                "Salidas",

                            data:
                                expenseValues,

                            borderWidth: 2,

                            tension: .4,

                            fill: false,

                            pointRadius: 3
                        }

                    ]

                },

                options: {

                    responsive: true,

                    maintainAspectRatio: false,

                    plugins: {

                        legend: {

                            position:
                                "bottom",

                            labels: {

                                usePointStyle:
                                    true,

                                boxWidth: 7,

                                font: {

                                    size: 10

                                }

                            }

                        }

                    },

                    scales: {

                        y: {

                            beginAtZero: true,

                            grid: {

                                drawBorder:
                                    false

                            }

                        },

                        x: {

                            grid: {

                                display: false

                            }

                        }

                    }

                }

            }
        );

}


/* ==========================================================
   MESES
========================================================== */

function getLastMonths(count) {

    const result = [];

    const now =
        new Date();


    for (
        let i = count - 1;
        i >= 0;
        i--
    ) {

        const date =
            new Date(
                now.getFullYear(),
                now.getMonth() - i,
                1
            );


        const year =
            date.getFullYear();


        const month =
            String(
                date.getMonth() + 1
            ).padStart(2, "0");


        const label =
            date.toLocaleDateString(
                "es-PE",
                {
                    month: "short"
                }
            );


        result.push({

            key:
                `${year}-${month}`,

            label:
                label.charAt(0)
                    .toUpperCase() +
                label.slice(1)

        });

    }


    return result;

}


/* ==========================================================
   ACTIVIDAD
========================================================== */

function renderRecentActivity(
    incomes,
    expenses,
    savings
) {

    const container =
        document.getElementById(
            "recentActivity"
        );


    const activities = [

        ...incomes.map(item => ({

            ...item,

            type: "income"

        })),

        ...expenses.map(item => ({

            ...item,

            type: "expense"

        })),

        ...savings.map(item => ({

            ...item,

            type: "saving"

        }))

    ];


    activities.sort(
        (a, b) =>
            new Date(b.fecha) -
            new Date(a.fecha)
    );


    const latest =
        activities.slice(0, 6);


    if (!latest.length) {

        return;
    }


    container.innerHTML =
        latest.map(item => {

            const income =
                item.type === "income";

            const saving =
                item.type === "saving";


            const icon =
                income
                    ? "fa-arrow-trend-up"
                    : saving
                        ? "fa-piggy-bank"
                        : "fa-arrow-trend-down";


            const amountPrefix =
                income
                    ? "+"
                    : "-";


            return `

                <div class="activity-item">

                    <div
                        class="activity-icon"
                        style="
                            background:
                            ${
                                income
                                    ? "var(--success-soft)"
                                    : "var(--danger-soft)"
                            };
                            color:
                            ${
                                income
                                    ? "var(--success)"
                                    : "var(--danger)"
                            };
                        "
                    >

                        <i class="fa-solid ${icon}"></i>

                    </div>

                    <div class="activity-info">

                        <strong>
                            ${escapeHTML(
                                item.concepto
                            )}
                        </strong>

                        <span>
                            ${item.fecha || ""}
                        </span>

                    </div>

                    <div class="activity-amount">

                        ${amountPrefix}
                        S/
                        ${formatMoney(item.monto)}

                    </div>

                </div>

            `;

        }).join("");

}


/* ==========================================================
   USUARIOS
========================================================== */

async function loadUsers() {

    if (
        !currentProfile ||
        currentProfile.rol !== "admin"
    ) return;


    const {
        data,
        error
    } = await supabaseClient
        .from("profiles")
        .select("*")
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

        return;
    }


    renderUsers(data || []);

}


/* ==========================================================
   RENDER USERS
========================================================== */

function renderUsers(users) {

    const tbody =
        document.getElementById(
            "usersTableBody"
        );


    if (!users.length) {

        tbody.innerHTML = `

            <tr>

                <td
                    colspan="6"
                    style="
                        text-align:center;
                        padding:40px;
                        color:var(--text-light);
                    "
                >

                    No hay usuarios registrados.

                </td>

            </tr>

        `;

        return;
    }


    tbody.innerHTML =
        users.map(user => {

            const isActive =
                user.estado === "activo";


            const date =
                user.created_at
                    ? new Date(
                        user.created_at
                    ).toLocaleDateString(
                        "es-PE"
                    )
                    : "-";


            return `

                <tr>

                    <td>

                        <strong>
                            ${escapeHTML(
                                `${user.nombre || ""} ${user.apellido || ""}`
                            )}
                        </strong>

                        <div
                            style="
                                color:var(--text-light);
                                font-size:10px;
                                margin-top:3px;
                            "
                        >

                            @${escapeHTML(
                                user.usuario || "-"
                            )}

                        </div>

                    </td>

                    <td>
                        ${escapeHTML(
                            user.email || "-"
                        )}
                    </td>

                    <td>

                        ${
                            user.rol === "admin"
                                ? "Administrador"
                                : "Usuario"
                        }

                    </td>

                    <td>

                        <span
                            class="status ${
                                isActive
                                    ? "active"
                                    : "inactive"
                            }"
                        >

                            <i
                                class="fa-solid fa-circle"
                                style="font-size:5px"
                            ></i>

                            ${
                                isActive
                                    ? "Activo"
                                    : "Inactivo"
                            }

                        </span>

                    </td>

                    <td>
                        ${date}
                    </td>

                    <td>

                        <button
                            class="secondary-btn"
                            style="
                                padding:7px 10px;
                            "
                            onclick="
                                toggleUserStatus(
                                    '${user.id}',
                                    '${isActive
                                        ? "inactivo"
                                        : "activo"
                                    }'
                                )
                            "
                        >

                            ${
                                isActive
                                    ? "Desactivar"
                                    : "Activar"
                            }

                        </button>

                    </td>

                </tr>

            `;

        }).join("");

}


/* ==========================================================
   CREAR USUARIO
========================================================== */

function setupUserModal() {

    newUserBtn?.addEventListener(
        "click",
        openUserModal
    );


    closeUserModal?.addEventListener(
        "click",
        closeModal
    );


    cancelUserModal?.addEventListener(
        "click",
        closeModal
    );


    userModal?.addEventListener(
        "click",
        event => {

            if (
                event.target === userModal
            ) {

                closeModal();

            }

        }
    );


    createUserForm?.addEventListener(
        "submit",
        createUser
    );

}


function openUserModal() {

    if (
        !currentProfile ||
        currentProfile.rol !== "admin"
    ) {

        showToast(
            "Solo el administrador puede crear usuarios."
        );

        return;
    }


    createUserForm.reset();

    clearFormMessage();

    userModal.classList.add(
        "active"
    );

}


function closeModal() {

    userModal.classList.remove(
        "active"
    );

}


async function createUser(event) {

    event.preventDefault();


    const nombre =
        document.getElementById(
            "newNombre"
        ).value.trim();


    const apellido =
        document.getElementById(
            "newApellido"
        ).value.trim();


    const usuario =
        document.getElementById(
            "newUsuario"
        ).value.trim();


    const email =
        document.getElementById(
            "newEmail"
        ).value.trim();


    const password =
        document.getElementById(
            "newPassword"
        ).value;


    const moneda =
        document.getElementById(
            "newMoneda"
        ).value;


    if (
        password.length < 6
    ) {

        showFormMessage(
            "La contraseña debe tener al menos 6 caracteres.",
            "error"
        );

        return;
    }


    const button =
        document.getElementById(
            "createUserBtn"
        );


    button.disabled = true;

    button.innerHTML = `

        <i class="fa-solid fa-spinner fa-spin"></i>

        Creando...

    `;


    try {

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

            throw error;

        }


        if (
            data?.error
        ) {

            throw new Error(
                data.error
            );

        }


        showFormMessage(
            "Usuario creado correctamente.",
            "success"
        );


        showToast(
            "Usuario creado correctamente."
        );


        await loadUsers();


        setTimeout(
            closeModal,
            1000
        );


    } catch (error) {

        console.error(
            "Error creando usuario:",
            error
        );


        showFormMessage(
            error.message ||
            "No se pudo crear el usuario.",
            "error"
        );

    } finally {

        button.disabled = false;

        button.innerHTML = `

            <i class="fa-solid fa-user-plus"></i>

            Crear usuario

        `;

    }

}


/* ==========================================================
   CAMBIAR ESTADO
========================================================== */

async function toggleUserStatus(
    userId,
    newStatus
) {

    if (
        !currentProfile ||
        currentProfile.rol !== "admin"
    ) return;


    const {
        error
    } = await supabaseClient
        .from("profiles")
        .update({
            estado: newStatus
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
            "No se pudo actualizar el usuario."
        );

        return;
    }


    showToast(
        `Usuario ${
            newStatus === "activo"
                ? "activado"
                : "desactivado"
        }.`
    );


    await loadUsers();

}


/* ==========================================================
   PASSWORD
========================================================== */

function setupPasswordToggle() {

    togglePassword?.addEventListener(
        "click",
        () => {

            const isPassword =
                newPassword.type ===
                "password";


            newPassword.type =
                isPassword
                    ? "text"
                    : "password";


            togglePassword.innerHTML =
                isPassword
                    ? `<i class="fa-regular fa-eye-slash"></i>`
                    : `<i class="fa-regular fa-eye"></i>`;

        }
    );

}


/* ==========================================================
   LOGOUT
========================================================== */

function setupLogout() {

    logoutBtn.addEventListener(
        "click",
        async () => {

            const {
                error
            } =
                await supabaseClient.auth.signOut();


            if (error) {

                console.error(
                    error
                );

                return;
            }


            window.location.reload();

        }
    );

}


/* ==========================================================
   THEME
========================================================== */

function setupTheme() {

    const button =
        document.getElementById(
            "themeToggle"
        );


    button?.addEventListener(
        "click",
        () => {

            document.body.classList.toggle(
                "dark-mode"
            );

            const dark =
                document.body.classList.contains(
                    "dark-mode"
                );


            localStorage.setItem(
                "finanzas_theme",
                dark
                    ? "dark"
                    : "light"
            );

        }
    );


    const saved =
        localStorage.getItem(
            "finanzas_theme"
        );


    if (
        saved === "dark"
    ) {

        document.body.classList.add(
            "dark-mode"
        );

    }

}


/* ==========================================================
   EXPENSE CHART
========================================================== */

function initializeExpenseChart() {

    const canvas =
        document.getElementById(
            "expenseChart"
        );


    if (!canvas) return;


    if (expenseChart) {

        expenseChart.destroy();

    }


    expenseChart =
        new Chart(
            canvas,
            {

                type: "doughnut",

                data: {

                    labels: [
                        "Alimentación",
                        "Transporte",
                        "Vivienda",
                        "Entretenimiento",
                        "Otros"
                    ],

                    datasets: [

                        {

                            data: [
                                30,
                                20,
                                25,
                                10,
                                15
                            ],

                            borderWidth: 0

                        }

                    ]

                },

                options: {

                    responsive: true,

                    maintainAspectRatio: false,

                    cutout: "72%",

                    plugins: {

                        legend: {

                            position: "bottom",

                            labels: {

                                usePointStyle: true,

                                font: {
                                    size: 10
                                }

                            }

                        }

                    }

                }

            }
        );

}


/* ==========================================================
   MENSAJES
========================================================== */

function showFormMessage(
    message,
    type
) {

    userFormMessage.textContent =
        message;


    userFormMessage.className =
        `form-message show ${type}`;

}


function clearFormMessage() {

    userFormMessage.textContent =
        "";

    userFormMessage.className =
        "form-message";

}


function showToast(message) {

    toastMessage.textContent =
        message;


    toast.classList.add(
        "show"
    );


    setTimeout(
        () => {

            toast.classList.remove(
                "show"
            );

        },
        3000
    );

}


/* ==========================================================
   SEGURIDAD HTML
========================================================== */

function escapeHTML(value) {

    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

}
