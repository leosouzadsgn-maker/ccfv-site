/* =========================================================
   CCFV — AUTHENTICATION
   SUPABASE LOGIN
   ========================================================= */

(() => {

    "use strict";


    /* =====================================================
       CONFIGURAÇÃO SUPABASE
       ===================================================== */

    const SUPABASE_URL =
        "https://hfiwndvshzorifkziiw.supabase.co";


    /*
     * COLE A SUA CHAVE "sb_publishable_..."
     * AQUI.
     *
     * NÃO USE a sb_secret_...
     */

    const SUPABASE_PUBLISHABLE_KEY =
        "sb_publishable_VykAaaP_0PfIW_n4HYHbTA_VlvrkjMu";


    /* =====================================================
       ESTADO
       ===================================================== */

    let supabaseClient =
        null;


    let authReadyPromise =
        null;


    /* =====================================================
       CARREGAR SUPABASE JS
       ===================================================== */

    function loadSupabase() {

        return new Promise(
            (
                resolve,
                reject
            ) => {

                /*
                 * Se já estiver carregado,
                 * não cria outro script.
                 */

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


                const existingScript =
                    document.querySelector(
                        'script[data-ccfv-supabase]'
                    );


                if (
                    existingScript
                ) {

                    existingScript.addEventListener(
                        "load",
                        () => {

                            resolve(
                                window.supabase
                            );

                        }
                    );


                    existingScript.addEventListener(
                        "error",
                        () => {

                            reject(
                                new Error(
                                    "Não foi possível carregar o Supabase."
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

                        }

                        else {

                            reject(
                                new Error(
                                    "Biblioteca do Supabase carregou, mas não está disponível."
                                )
                            );

                        }

                    };


                script.onerror =
                    () => {

                        reject(
                            new Error(
                                "Falha ao carregar a biblioteca do Supabase."
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
       INICIALIZAR CLIENTE
       ===================================================== */

    async function initializeSupabase() {

        if (
            supabaseClient
        ) {

            return supabaseClient;

        }


        if (
            authReadyPromise
        ) {

            return authReadyPromise;

        }


        authReadyPromise =
            (
                async () => {

                    const supabase =
                        await loadSupabase();


                    /*
                     * Se a chave ainda estiver no placeholder,
                     * interrompe com mensagem clara.
                     */

                    if (
                        !SUPABASE_PUBLISHABLE_KEY ||
                        SUPABASE_PUBLISHABLE_KEY ===
                            "COLE_AQUI_SUA_SB_PUBLISHABLE"
                    ) {

                        throw new Error(
                            "A Publishable Key do Supabase ainda não foi inserida no auth.js."
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

                }
            )();


        return authReadyPromise;

    }


    /* =====================================================
       GET CLIENT
       ===================================================== */

    async function getClient() {

        return initializeSupabase();

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


        if (
            error
        ) {

            throw error;

        }


        return data;

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


        redirectToLogin();

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


        return data.session;

    }


    /* =====================================================
       REDIRECIONAR PARA LOGIN
       ===================================================== */

    function redirectToLogin() {

        const path =
            window.location.pathname;


        if (
            path.endsWith(
                "/admin/login.html"
            )
        ) {

            return;

        }


        window.location.href =
            "/admin/login.html";

    }


    /* =====================================================
       REDIRECIONAR PARA ADMIN
       ===================================================== */

    function redirectToAdmin() {

        const path =
            window.location.pathname;


        if (
            path.endsWith(
                "/admin/"
            ) ||
            path.endsWith(
                "/admin/index.html"
            )
        ) {

            return;

        }


        window.location.href =
            "/admin/";

    }


    /* =====================================================
       VERIFICAR SE ESTÁ AUTENTICADO
       ===================================================== */

    async function requireAuth() {

        try {

            const session =
                await getSession();


            if (
                !session
            ) {

                redirectToLogin();

                return null;

            }


            return session;

        }

        catch (
            error
        ) {

            console.error(
                "CCFV // AUTH CHECK ERROR",
                error
            );


            redirectToLogin();

            return null;

        }

    }


    /* =====================================================
       TRADUZIR ERROS
       ===================================================== */

    function translateAuthError(
        error
    ) {

        const message =
            String(
                error?.message || ""
            )
            .toLowerCase();


        if (
            message.includes(
                "invalid login credentials"
            )
        ) {

            return "EMAIL OU SENHA INCORRETOS.";

        }


        if (
            message.includes(
                "email not confirmed"
            )
        ) {

            return "ESTE EMAIL AINDA NÃO FOI CONFIRMADO.";

        }


        if (
            message.includes(
                "too many requests"
            )
        ) {

            return "MUITAS TENTATIVAS. AGUARDE UM POUCO.";

        }


        if (
            message.includes(
                "network"
            )
        ) {

            return "ERRO DE CONEXÃO COM O SERVIDOR.";

        }


        return "NÃO FOI POSSÍVEL REALIZAR O LOGIN.";

    }


    /* =====================================================
       LOGIN FORM
       ===================================================== */

    function setupLoginForm() {

        const form =
            document.querySelector(
                "#ccfv-login-form"
            );


        /*
         * Se não estamos na página de login,
         * não há formulário para configurar.
         */

        if (
            !form
        ) {

            return;

        }


        const emailInput =
            document.querySelector(
                "#ccfv-login-email"
            );


        const passwordInput =
            document.querySelector(
                "#ccfv-login-password"
            );


        const errorElement =
            document.querySelector(
                "#ccfv-login-error"
            );


        const button =
            document.querySelector(
                "#ccfv-login-button"
            );


        form.addEventListener(
            "submit",
            async (
                event
            ) => {

                event.preventDefault();


                const email =
                    emailInput
                        ?.value
                        .trim() ||
                    "";


                const password =
                    passwordInput
                        ?.value ||
                    "";


                clearLoginError();


                if (
                    !email ||
                    !password
                ) {

                    showLoginError(
                        "PREENCHA EMAIL E SENHA."
                    );

                    return;

                }


                if (
                    button
                ) {

                    button.disabled =
                        true;


                    button.textContent =
                        "AUTENTICANDO...";

                }


                try {

                    await login(
                        email,
                        password
                    );


                    if (
                        button
                    ) {

                        button.textContent =
                            "ACESSO LIBERADO...";

                    }


                    window.location.href =
                        "/admin/";

                }

                catch (
                    error
                ) {

                    console.error(
                        "CCFV // LOGIN ERROR",
                        error
                    );


                    showLoginError(
                        translateAuthError(
                            error
                        )
                    );


                    if (
                        button
                    ) {

                        button.disabled =
                            false;


                        button.textContent =
                            "ENTRAR";

                    }

                }

            }
        );


        function showLoginError(
            message
        ) {

            if (
                !errorElement
            ) {

                return;

            }


            errorElement.textContent =
                message;


            errorElement.classList.add(
                "is-visible"
            );

        }


        function clearLoginError() {

            if (
                !errorElement
            ) {

                return;

            }


            errorElement.textContent =
                "";


            errorElement.classList.remove(
                "is-visible"
            );

        }

    }


    /* =====================================================
       PROTEGER LOGIN
       =====================================================

       Se alguém já estiver autenticado e abrir
       login.html, vai direto para o Admin.
       ===================================================== */

    async function checkAlreadyAuthenticated() {

        const path =
            window.location.pathname;


        const isLoginPage =
            path.endsWith(
                "/admin/login.html"
            );


        if (
            !isLoginPage
        ) {

            return;

        }


        try {

            const session =
                await getSession();


            if (
                session
            ) {

                redirectToAdmin();

            }

        }

        catch (
            error
        ) {

            console.warn(
                "CCFV // SESSION CHECK",
                error
            );

        }

    }


    /* =====================================================
       OBSERVAR AUTH
       ===================================================== */

    async function bindAuthState() {

        try {

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


                    /*
                     * Login concluído.
                     */

                    if (
                        event ===
                        "SIGNED_IN" &&
                        session
                    ) {

                        const path =
                            window.location.pathname;


                        if (
                            path.endsWith(
                                "/admin/login.html"
                            )
                        ) {

                            window.location.href =
                                "/admin/";

                        }

                    }


                    /*
                     * Logout.
                     */

                    if (
                        event ===
                        "SIGNED_OUT"
                    ) {

                        const path =
                            window.location.pathname;


                        if (
                            path.includes(
                                "/admin/"
                            ) &&
                            !path.endsWith(
                                "/admin/login.html"
                            )
                        ) {

                            redirectToLogin();

                        }

                    }

                }
            );

        }

        catch (
            error
        ) {

            console.error(
                "CCFV // AUTH LISTENER ERROR",
                error
            );

        }

    }


    /* =====================================================
       API PÚBLICA
       ===================================================== */

    window.CCFVAuth = {

        login,

        logout,

        getSession,

        requireAuth,

        getClient,

        translateAuthError

    };


    /* =====================================================
       INIT
       ===================================================== */

    async function init() {

        console.log(
            "%cCCFV // AUTH SYSTEM",
            "color:#43df91;font-weight:900;font-size:18px;"
        );


        setupLoginForm();


        try {

            await initializeSupabase();


            await checkAlreadyAuthenticated();


            await bindAuthState();


            console.log(
                "CCFV // Supabase conectado."
            );

        }

        catch (
            error
        ) {

            console.error(
                "CCFV // AUTH INIT ERROR:",
                error
            );


            /*
             * Se estamos na página de login,
             * mostra erro no console.
             *
             * Não redireciona infinitamente.
             */

            const errorElement =
                document.querySelector(
                    "#ccfv-login-error"
                );


            if (
                errorElement
            ) {

                errorElement.textContent =
                    "NÃO FOI POSSÍVEL CONECTAR AO SISTEMA DE AUTENTICAÇÃO.";

                errorElement.classList.add(
                    "is-visible"
                );

            }

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