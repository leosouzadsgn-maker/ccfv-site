/* =========================================================
   CCFV — AUTHENTICATION
   SUPABASE LOGIN + PROTEÇÃO DO ADMIN
   ========================================================= */

(() => {

    "use strict";


    /* =====================================================
       SUPABASE
       ===================================================== */

    const SUPABASE_URL =
        "https://hfiwndvshzorikfzkiiw.supabase.co";


    /*
     * COLE AQUI A SUA CHAVE:
     *
     * sb_publishable_...
     *
     * NÃO USE sb_secret_...
     */

    const SUPABASE_PUBLISHABLE_KEY =
        "sb_publishable_VykAaaP_0PfIW_n4HYHbTA_VlvrkjMu";


    let supabaseClient = null;

    let clientPromise = null;


    /* =====================================================
       PÁGINAS
       ===================================================== */

    function isLoginPage() {

        return window.location.pathname.endsWith(
            "/admin/login.html"
        );

    }


    function isAdminPage() {

        const path =
            window.location.pathname;


        return (
            path.endsWith("/admin/") ||
            path.endsWith("/admin/index.html")
        );

    }


    /* =====================================================
       VISIBILIDADE
       ===================================================== */

    function hidePage() {

        document.documentElement.style.visibility =
            "hidden";

    }


    function showPage() {

        document.documentElement.style.visibility =
            "visible";

    }


    /* =====================================================
       CARREGAR SUPABASE
       ===================================================== */

    function loadSupabase() {

        return new Promise(
            (
                resolve,
                reject
            ) => {

                if (
                    window.supabase &&
                    typeof window.supabase.createClient ===
                        "function"
                ) {

                    resolve(
                        window.supabase
                    );

                    return;

                }


                const existing =
                    document.querySelector(
                        'script[data-ccfv-supabase]'
                    );


                if (
                    existing
                ) {

                    existing.addEventListener(
                        "load",
                        () => {

                            resolve(
                                window.supabase
                            );

                        }
                    );


                    existing.addEventListener(
                        "error",
                        () => {

                            reject(
                                new Error(
                                    "Falha ao carregar o Supabase."
                                )
                            );

                        }
                    );


                    return;

                }


                const script =
                    document.createElement(
                        "script"
                    );


                script.src =
                    "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";


                script.async =
                    true;


                script.dataset.ccfvSupabase =
                    "true";


                script.onload =
                    () => {

                        if (
                            window.supabase &&
                            typeof window.supabase.createClient ===
                                "function"
                        ) {

                            resolve(
                                window.supabase
                            );

                            return;

                        }


                        reject(
                            new Error(
                                "Supabase carregou, mas createClient não está disponível."
                            )
                        );

                    };


                script.onerror =
                    () => {

                        reject(
                            new Error(
                                "Não foi possível carregar a biblioteca do Supabase."
                            )
                        );

                    };


                document.head.appendChild(
                    script
                );

            }
        );

    }


    /* =====================================================
       CLIENTE
       ===================================================== */

    async function getClient() {

        if (
            supabaseClient
        ) {

            return supabaseClient;

        }


        if (
            clientPromise
        ) {

            return clientPromise;

        }


        clientPromise =
            (async () => {

                const supabase =
                    await loadSupabase();


                if (
                    !SUPABASE_PUBLISHABLE_KEY ||
                    SUPABASE_PUBLISHABLE_KEY ===
                        "COLE_AQUI_SUA_SB_PUBLISHABLE"
                ) {

                    throw new Error(
                        "A Publishable Key não foi colocada no auth.js."
                    );

                }


                supabaseClient =
                    supabase.createClient(
                        SUPABASE_URL,
                        SUPABASE_PUBLISHABLE_KEY
                    );


                window.CCFVSupabase =
                    supabaseClient;


                return supabaseClient;

            })();


        return clientPromise;

    }


    /* =====================================================
       LOGIN
       ===================================================== */

    async function login(
        email,
        password
    ) {

        const client =
            await getClient();


        console.log(
            "CCFV // TENTANDO LOGIN:",
            email
        );


        const {
            data,
            error
        } =
            await client.auth.signInWithPassword({

                email:
                    email,

                password:
                    password

            });


        console.log(
            "CCFV // LOGIN DATA:",
            data
        );


        console.log(
            "CCFV // LOGIN ERROR:",
            error
        );


        if (
            error
        ) {

            throw error;

        }


        return data;

    }


    /* =====================================================
       SESSION
       ===================================================== */

    async function getSession() {

        const client =
            await getClient();


        const {
            data,
            error
        } =
            await client.auth.getSession();


        if (
            error
        ) {

            throw error;

        }


        return data?.session || null;

    }


    /* =====================================================
       LOGOUT
       ===================================================== */

    async function logout() {

        const client =
            await getClient();


        const {
            error
        } =
            await client.auth.signOut();


        if (
            error
        ) {

            throw error;

        }


        window.location.href =
            "/admin/login.html";

    }


    /* =====================================================
       REDIRECT
       ===================================================== */

    function redirectToLogin() {

        if (
            isLoginPage()
        ) {

            return;

        }


        window.location.replace(
            "/admin/login.html"
        );

    }


    function redirectToAdmin() {

        window.location.replace(
            "/admin/"
        );

    }


    /* =====================================================
       ERRO AMIGÁVEL
       ===================================================== */

    function getFriendlyError(
        error
    ) {

        const message =
            String(
                error?.message ||
                ""
            );


        const lower =
            message.toLowerCase();


        if (
            lower.includes(
                "invalid login credentials"
            )
        ) {

            return (
                "SUPABASE: EMAIL OU SENHA INCORRETOS."
            );

        }


        if (
            lower.includes(
                "email not confirmed"
            )
        ) {

            return (
                "SUPABASE: O EMAIL DO USUÁRIO NÃO ESTÁ CONFIRMADO."
            );

        }


        if (
            lower.includes(
                "invalid api key"
            )
        ) {

            return (
                "SUPABASE: PUBLISHABLE KEY INVÁLIDA."
            );

        }


        if (
            lower.includes(
                "failed to fetch"
            )
        ) {

            return (
                "SUPABASE: NÃO FOI POSSÍVEL CONECTAR AO SERVIDOR."
            );

        }


        return (
            "SUPABASE: " +
            (
                message ||
                "ERRO DESCONHECIDO."
            )
        );

    }


    /* =====================================================
       ERRO LOGIN
       ===================================================== */

    function showLoginError(
        error
    ) {

        const element =
            document.querySelector(
                "#ccfv-login-error"
            );


        if (
            !element
        ) {

            return;

        }


        element.textContent =
            getFriendlyError(
                error
            );


        element.classList.add(
            "is-visible"
        );

    }


    function clearLoginError() {

        const element =
            document.querySelector(
                "#ccfv-login-error"
            );


        if (
            !element
        ) {

            return;

        }


        element.textContent =
            "";


        element.classList.remove(
            "is-visible"
        );

    }


    /* =====================================================
       FORM LOGIN
       ===================================================== */

    function bindLoginForm() {

        const form =
            document.querySelector(
                "#ccfv-login-form"
            );


        if (
            !form
        ) {

            return;

        }


        const email =
            document.querySelector(
                "#ccfv-login-email"
            );


        const password =
            document.querySelector(
                "#ccfv-login-password"
            );


        const button =
            document.querySelector(
                "#ccfv-login-button"
            );


        form.addEventListener(
            "submit",
            async event => {

                event.preventDefault();


                clearLoginError();


                const emailValue =
                    email?.value.trim() ||
                    "";


                const passwordValue =
                    password?.value ||
                    "";


                if (
                    !emailValue ||
                    !passwordValue
                ) {

                    showLoginError(
                        new Error(
                            "PREENCHA EMAIL E SENHA."
                        )
                    );

                    return;

                }


                button.disabled =
                    true;


                button.textContent =
                    "AUTENTICANDO...";


                try {

                    await login(
                        emailValue,
                        passwordValue
                    );


                    button.textContent =
                        "ACESSO LIBERADO...";


                    window.location.replace(
                        "/admin/"
                    );

                }

                catch (
                    error
                ) {

                    console.error(
                        "CCFV // LOGIN ERROR",
                        error
                    );


                    showLoginError(
                        error
                    );


                    button.disabled =
                        false;


                    button.textContent =
                        "ENTRAR NO PAINEL";

                }

            }
        );

    }


    /* =====================================================
       PROTEGER ADMIN
       ===================================================== */

    async function protectAdmin() {

        if (
            !isAdminPage()
        ) {

            return;

        }


        hidePage();


        try {

            const session =
                await getSession();


            if (
                !session
            ) {

                redirectToLogin();

                return;

            }


            showPage();

        }

        catch (
            error
        ) {

            console.error(
                "CCFV // PROTECTION ERROR",
                error
            );


            redirectToLogin();

        }

    }


    /* =====================================================
       PROTEGER LOGIN
       ===================================================== */

    async function protectLogin() {

        if (
            !isLoginPage()
        ) {

            return;

        }


        hidePage();


        try {

            const session =
                await getSession();


            if (
                session
            ) {

                redirectToAdmin();

                return;

            }


            showPage();

        }

        catch (
            error
        ) {

            console.error(
                "CCFV // LOGIN PAGE ERROR",
                error
            );


            showPage();

        }

    }


    /* =====================================================
       AUTH STATE
       ===================================================== */

    async function bindAuthState() {

        const client =
            await getClient();


        client.auth.onAuthStateChange(
            (
                event,
                session
            ) => {

                console.log(
                    "CCFV // AUTH EVENT:",
                    event
                );


                if (
                    event ===
                    "SIGNED_OUT"
                ) {

                    redirectToLogin();

                }

            }
        );

    }


    /* =====================================================
       API GLOBAL
       ===================================================== */

    window.CCFVAuth = {

        login,

        logout,

        getSession,

        getClient

    };


    /* =====================================================
       INIT
       ===================================================== */

    async function init() {

        console.log(
            "%cCCFV // AUTH SYSTEM",
            "color:#43df91;font-weight:900;font-size:18px;"
        );


        bindLoginForm();


        try {

            await getClient();

            await protectAdmin();

            await protectLogin();

            await bindAuthState();


            console.log(
                "CCFV // SUPABASE CONECTADO"
            );

        }

        catch (
            error
        ) {

            console.error(
                "CCFV // AUTH INIT ERROR",
                error
            );


            if (
                isAdminPage()
            ) {

                redirectToLogin();

                return;

            }


            showPage();

        }

    }


    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            init
        );

    }

    else {

        init();

    }

})();