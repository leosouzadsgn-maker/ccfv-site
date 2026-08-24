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
        "https://hfiwndvshzorifkziiw.supabase.co";


    /*
     * COLE A SUA CHAVE:
     *
     * sb_publishable_...
     *
     * NÃO use sb_secret_...
     */

    const SUPABASE_PUBLISHABLE_KEY =
        "sb_publishable_VykAaaP_0PfIW_n4HYHbTA_VlvrkjMu";


    let supabaseClient =
        null;


    let authReadyPromise =
        null;


    /* =====================================================
       DETECTAR PÁGINA
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
       ESCONDER INTERFACE ATÉ VALIDAR LOGIN
       ===================================================== */

    function hidePageUntilAuth() {

        document.documentElement.style.visibility =
            "hidden";

    }


    function showPageAfterAuth() {

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

                        }

                        else {

                            reject(
                                new Error(
                                    "Supabase não ficou disponível."
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
            (async () => {

                const supabase =
                    await loadSupabase();


                if (
                    !SUPABASE_PUBLISHABLE_KEY ||
                    SUPABASE_PUBLISHABLE_KEY ===
                        "COLE_AQUI_SUA_SB_PUBLISHABLE"
                ) {

                    throw new Error(
                        "A Publishable Key ainda não foi inserida."
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


        return authReadyPromise;

    }


    /* =====================================================
       SESSION
       ===================================================== */

    async function getSession() {

        const client =
            await initializeSupabase();


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
       LOGIN
       ===================================================== */

    async function login(
        email,
        password
    ) {

        const client =
            await initializeSupabase();


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
            await initializeSupabase();


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
       REDIRECIONAR LOGIN
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


    /* =====================================================
       REDIRECIONAR ADMIN
       ===================================================== */

    function redirectToAdmin() {

        window.location.replace(
            "/admin/"
        );

    }


    /* =====================================================
       PROTEGER ADMIN
       ===================================================== */

    async function protectAdminPage() {

        /*
         * Se não estamos no Admin,
         * não faz nada.
         */

        if (
            !isAdminPage()
        ) {

            return;

        }


        /*
         * Esconde a interface enquanto verifica
         * a sessão.
         *
         * Isso evita que alguém veja o painel
         * por um instante antes do redirect.
         */

        hidePageUntilAuth();


        try {

            const session =
                await getSession();


            /*
             * SEM SESSÃO
             */

            if (
                !session
            ) {

                redirectToLogin();

                return;

            }


            /*
             * SESSÃO VÁLIDA
             */

            console.log(
                "CCFV // ADMIN AUTHENTICATED"
            );


            showPageAfterAuth();

        }

        catch (
            error
        ) {

            console.error(
                "CCFV // ADMIN AUTH ERROR",
                error
            );


            redirectToLogin();

        }

    }


    /* =====================================================
       PROTEGER LOGIN
       ===================================================== */

    async function protectLoginPage() {

        if (
            !isLoginPage()
        ) {

            return;

        }


        hidePageUntilAuth();


        try {

            const session =
                await getSession();


            /*
             * Já está logado.
             * Não precisa ver o login.
             */

            if (
                session
            ) {

                redirectToAdmin();

                return;

            }


            /*
             * Não está logado.
             * Pode mostrar o login.
             */

            showPageAfterAuth();

        }

        catch (
            error
        ) {

            console.error(
                "CCFV // LOGIN AUTH ERROR",
                error
            );


            showPageAfterAuth();

        }

    }


    /* =====================================================
       ERROS DE LOGIN
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
       FORMULÁRIO LOGIN
       ===================================================== */

    function setupLoginForm() {

        const form =
            document.querySelector(
                "#ccfv-login-form"
            );


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
            async event => {

                event.preventDefault();


                const email =
                    emailInput?.value.trim() || "";


                const password =
                    passwordInput?.value || "";


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


                    redirectToAdmin();

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
                            "ENTRAR NO PAINEL";

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
       LISTENER DE AUTH
       ===================================================== */

    async function bindAuthState() {

        const client =
            await initializeSupabase();


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
       API PÚBLICA
       ===================================================== */

    window.CCFVAuth = {

        login,

        logout,

        getSession,

        translateAuthError,

        protectAdminPage

    };


    /* =====================================================
       INIT
       ===================================================== */

    async function init() {

        /*
         * Mostra no console para sabermos que
         * o arquivo realmente foi carregado.
         */

        console.log(
            "%cCCFV // AUTH SYSTEM",
            "color:#43df91;font-weight:900;font-size:18px;"
        );


        setupLoginForm();


        try {

            await initializeSupabase();


            /*
             * PRIMEIRO protege o Admin.
             */

            await protectAdminPage();


            /*
             * Depois protege a página de login.
             */

            await protectLoginPage();


            /*
             * Observa mudanças de sessão.
             */

            await bindAuthState();


            console.log(
                "CCFV // SUPABASE AUTH OK"
            );

        }

        catch (
            error
        ) {

            console.error(
                "CCFV // AUTH INIT ERROR",
                error
            );


            /*
             * Se o problema aconteceu no login,
             * mostramos o erro.
             */

            const loginError =
                document.querySelector(
                    "#ccfv-login-error"
                );


            if (
                loginError
            ) {

                loginError.textContent =
                    "NÃO FOI POSSÍVEL CONECTAR AO SISTEMA DE AUTENTICAÇÃO.";

                loginError.classList.add(
                    "is-visible"
                );

            }


            /*
             * Se estamos no Admin e deu erro,
             * não deixamos o painel aberto.
             */

            if (
                isAdminPage()
            ) {

                redirectToLogin();

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