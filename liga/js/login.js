
/* =========================================================
   CCFV LIGA — SISTEMA DE AUTENTICAÇÃO
   Login, cadastro, sessão e recuperação de senha
   Supabase Auth v2
   ========================================================= */

(() => {

    "use strict";


    /* =====================================================
       CONFIGURAÇÃO SUPABASE
       Mesmas credenciais públicas utilizadas pelo CCFV
       Nunca inserir service_role ou chave secreta aqui.
       ===================================================== */

    const SUPABASE_URL =
        "https://msqvkcnywokhakmqgiso.supabase.co";

    const SUPABASE_PUBLISHABLE_KEY =
        "sb_publishable_sanJ5WpLoquv4JH2ryYR6w_LxdaS2Q2";


    /* =====================================================
       ESTADO DA APLICAÇÃO
       ===================================================== */

    let supabaseClient = null;
    let supabasePromise = null;
    let authSubscription = null;

    let passwordRecoveryMode =
        new URLSearchParams(
            window.location.hash.replace(/^#/, "")
        ).get("type") === "recovery";


    /* =====================================================
       ELEMENTOS E UTILITÁRIOS
       ===================================================== */

    const allowedViews = [
        "login",
        "register",
        "forgot",
        "new-password",
        "session"
    ];


    function getElement(selector) {

        return document.querySelector(selector);

    }


    function getRedirectUrl() {

        return new URL(
            "/liga/login.html",
            window.location.origin
        ).href;

    }


    function normalizeEmail(value) {

        return String(value || "")
            .trim()
            .toLowerCase();

    }


    /* =====================================================
       CARREGAMENTO DO SUPABASE JS
       ===================================================== */

    function loadSupabaseLibrary() {

        if (
            window.supabase &&
            typeof window.supabase.createClient === "function"
        ) {

            return Promise.resolve(window.supabase);

        }


        return new Promise((resolve, reject) => {

            const existingScript =
                document.querySelector(
                    "script[data-ccfv-supabase]"
                );


            if (existingScript) {

                existingScript.addEventListener(
                    "load",
                    () => {

                        if (
                            window.supabase &&
                            typeof window.supabase.createClient === "function"
                        ) {

                            resolve(window.supabase);

                        } else {

                            reject(
                                new Error(
                                    "A biblioteca Supabase não disponibilizou createClient."
                                )
                            );

                        }

                    },
                    { once: true }
                );


                existingScript.addEventListener(
                    "error",
                    () => {

                        reject(
                            new Error(
                                "Não foi possível carregar o Supabase."
                            )
                        );

                    },
                    { once: true }
                );

                return;

            }


            const script =
                document.createElement("script");


            script.src =
                "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";

            script.async = true;

            script.dataset.ccfvSupabase = "true";


            script.onload = () => {

                if (
                    window.supabase &&
                    typeof window.supabase.createClient === "function"
                ) {

                    resolve(window.supabase);

                    return;

                }


                reject(
                    new Error(
                        "Supabase carregou, mas createClient não está disponível."
                    )
                );

            };


            script.onerror = () => {

                reject(
                    new Error(
                        "Falha ao carregar a biblioteca de autenticação."
                    )
                );

            };


            document.head.appendChild(script);

        });

    }


    /* =====================================================
       CRIAÇÃO DO CLIENTE
       ===================================================== */

    async function getSupabaseClient() {

        if (supabaseClient) {

            return supabaseClient;

        }


        if (supabasePromise) {

            return supabasePromise;

        }


        supabasePromise = (async () => {

            if (
                !SUPABASE_URL ||
                !SUPABASE_PUBLISHABLE_KEY
            ) {

                throw new Error(
                    "A configuração do Supabase está incompleta."
                );

            }


            const library =
                await loadSupabaseLibrary();


            supabaseClient =
                library.createClient(
                    SUPABASE_URL,
                    SUPABASE_PUBLISHABLE_KEY,
                    {
                        auth: {
                            persistSession: true,
                            autoRefreshToken: true,
                            detectSessionInUrl: true
                        }
                    }
                );


            // Identificador próprio para a Liga.
            // Não sobrescreve o cliente utilizado pelo Admin CCFV.

            window.CCFVLigaSupabase =
                supabaseClient;


            return supabaseClient;

        })();


        try {

            return await supabasePromise;

        } catch (error) {

            supabasePromise = null;

            throw error;

        }

    }


    /* =====================================================
       MENSAGENS
       ===================================================== */

    function clearMessages() {

        document
            .querySelectorAll(".auth-message")
            .forEach(element => {

                element.textContent = "";

                element.className = "auth-message";

            });

    }


    function showMessage(elementId, message, type = "info") {

        const element =
            document.getElementById(elementId);


        if (!element) return;


        const allowedTypes = [
            "success",
            "error",
            "info"
        ];


        const safeType =
            allowedTypes.includes(type)
                ? type
                : "info";


        element.textContent = message;

        element.className =
            `auth-message is-visible is-${safeType}`;

    }


    /* =====================================================
       TRADUÇÃO DE ERROS
       ===================================================== */

    function friendlyError(error) {

        const message =
            String(error?.message || error || "")
                .toLowerCase();


        if (
            message.includes("invalid login credentials")
        ) {

            return "E-mail ou senha incorretos. Confira seus dados e tente novamente.";

        }


        if (
            message.includes("email not confirmed")
        ) {

            return "Seu e-mail ainda não foi confirmado. Verifique sua caixa de entrada.";

        }


        if (
            message.includes("user already registered") ||
            message.includes("already registered") ||
            message.includes("user already exists")
        ) {

            return "Já existe uma conta cadastrada com esse e-mail.";

        }


        if (
            message.includes("password should be at least")
        ) {

            return "A senha não atende aos requisitos mínimos de segurança.";

        }


        if (
            message.includes("new password should be different")
        ) {

            return "Sua nova senha precisa ser diferente da senha atual.";

        }


        if (
            message.includes("rate limit") ||
            error?.status === 429
        ) {

            return "Muitas tentativas foram realizadas. Aguarde um pouco e tente novamente.";

        }


        if (
            message.includes("failed to fetch") ||
            message.includes("networkerror") ||
            message.includes("fetch")
        ) {

            return "Não foi possível conectar ao servidor. Verifique sua internet.";

        }


        if (
            message.includes("invalid email")
        ) {

            return "Informe um endereço de e-mail válido.";

        }


        if (
            message.includes("session")
        ) {

            return "Sua sessão não está disponível ou expirou. Entre novamente.";

        }


        return error?.message ||
            "Ocorreu um problema inesperado. Tente novamente.";

    }


    /* =====================================================
       CONTROLE DAS TELAS
       ===================================================== */

    function showView(viewName, options = {}) {

        const updateUrl =
            options.updateUrl === true;


        const target =
            allowedViews.includes(viewName)
                ? viewName
                : "login";


        const views =
            document.querySelectorAll("[data-view]");


        views.forEach(view => {

            const active =
                view.dataset.view === target;

            view.hidden = !active;

        });


        clearMessages();


        if (updateUrl) {

            const url =
                new URL(window.location.href);


            if (
                target === "login" ||
                target === "register" ||
                target === "forgot"
            ) {

                url.searchParams.set("view", target);

            } else {

                url.searchParams.delete("view");

            }


            url.hash = "";


            window.history.replaceState(
                {},
                "",
                url.pathname + url.search
            );

        }


        const panel =
            document.querySelector(".auth-panel");


        if (panel) {

            panel.dataset.activeView = target;

        }

    }


    /* =====================================================
       IDENTIFICA A TELA PELO ENDEREÇO
       ===================================================== */

    function getRequestedView() {

        const params =
            new URLSearchParams(window.location.search);


        const requested =
            params.get("view");


        if (
            requested === "register" ||
            requested === "login" ||
            requested === "forgot"
        ) {

            return requested;

        }


        return "login";

    }


    /* =====================================================
       ATUALIZAÇÃO DE BOTÕES
       ===================================================== */

    function setButtonLoading(
        button,
        loading,
        loadingText = "PROCESSANDO..."
    ) {

        if (!button) return;


        const label =
            button.querySelector("span");


        if (!label) {

            button.disabled = loading;

            return;

        }


        if (!button.dataset.originalLabel) {

            button.dataset.originalLabel =
                label.textContent.trim();

        }


        button.disabled = loading;

        button.setAttribute(
            "aria-busy",
            loading ? "true" : "false"
        );


        label.textContent =
            loading
                ? loadingText
                : button.dataset.originalLabel;

    }


    /* =====================================================
       MOSTRAR DADOS DA SESSÃO
       ===================================================== */

    function showSession(session) {

        const emailElement =
            document.getElementById("session-email");


        if (emailElement) {

            emailElement.textContent =
                session?.user?.email || "Conta autenticada";

        }


        showView("session");

    }


    /* =====================================================
       FORMULÁRIO DE LOGIN
       ===================================================== */

    function bindLoginForm() {

        const form =
            getElement("#login-form");


        if (!form) return;


        const emailInput =
            getElement("#login-email");

        const passwordInput =
            getElement("#login-password");

        const button =
            getElement("#login-submit");


        form.addEventListener("submit", async event => {

            event.preventDefault();


            clearMessages();


            const email =
                normalizeEmail(emailInput?.value);

            const password =
                passwordInput?.value || "";


            if (!email || !password) {

                showMessage(
                    "login-message",
                    "Preencha seu e-mail e sua senha.",
                    "error"
                );

                return;

            }


            setButtonLoading(
                button,
                true,
                "AUTENTICANDO..."
            );


            try {

                const client =
                    await getSupabaseClient();


                const { data, error } =
                    await client.auth.signInWithPassword({

                        email,
                        password

                    });


                if (error) {

                    throw error;

                }


                if (!data?.session) {

                    throw new Error(
                        "O acesso não gerou uma sessão válida."
                    );

                }


                passwordRecoveryMode = false;

                showSession(data.session);


            } catch (error) {

                console.error(
                    "CCFV LIGA // ERRO LOGIN",
                    error
                );


                showMessage(
                    "login-message",
                    friendlyError(error),
                    "error"
                );

            } finally {

                setButtonLoading(
                    button,
                    false
                );

            }

        });

    }


    /* =====================================================
       FORMULÁRIO DE CADASTRO
       ===================================================== */

    function bindRegisterForm() {

        const form =
            getElement("#register-form");


        if (!form) return;


        const nameInput =
            getElement("#register-name");

        const emailInput =
            getElement("#register-email");

        const passwordInput =
            getElement("#register-password");

        const confirmInput =
            getElement("#register-confirm");

        const button =
            getElement("#register-submit");


        form.addEventListener("submit", async event => {

            event.preventDefault();


            clearMessages();


            const name =
                String(nameInput?.value || "").trim();

            const email =
                normalizeEmail(emailInput?.value);

            const password =
                passwordInput?.value || "";

            const confirmation =
                confirmInput?.value || "";


            if (name.length < 3) {

                showMessage(
                    "register-message",
                    "Informe seu nome completo.",
                    "error"
                );

                return;

            }


            if (!email) {

                showMessage(
                    "register-message",
                    "Informe um e-mail válido.",
                    "error"
                );

                return;

            }


            if (password.length < 8) {

                showMessage(
                    "register-message",
                    "Sua senha precisa ter pelo menos 8 caracteres.",
                    "error"
                );

                return;

            }


            if (password !== confirmation) {

                showMessage(
                    "register-message",
                    "As senhas informadas não são iguais.",
                    "error"
                );

                confirmInput?.focus();

                return;

            }


            setButtonLoading(
                button,
                true,
                "CRIANDO CONTA..."
            );


            try {

                const client =
                    await getSupabaseClient();


                const { data, error } =
                    await client.auth.signUp({

                        email,
                        password,

                        options: {

                            data: {
                                name,
                                account_origin: "ccfv_liga"
                            },

                            emailRedirectTo:
                                getRedirectUrl()

                        }

                    });


                if (error) {

                    throw error;

                }


                if (data?.session) {

                    showSession(data.session);

                    return;

                }


                showMessage(
                    "register-message",
                    "Cadastro iniciado! Enviamos um link de confirmação para seu e-mail. Confirme o endereço para ativar sua conta e depois entre na Liga.",
                    "success"
                );


                form.reset();


            } catch (error) {

                console.error(
                    "CCFV LIGA // ERRO CADASTRO",
                    error
                );


                showMessage(
                    "register-message",
                    friendlyError(error),
                    "error"
                );

            } finally {

                setButtonLoading(
                    button,
                    false
                );

            }

        });

    }


    /* =====================================================
       RECUPERAÇÃO DE SENHA
       ===================================================== */

    function bindForgotForm() {

        const form =
            getElement("#forgot-form");


        if (!form) return;


        const emailInput =
            getElement("#forgot-email");

        const button =
            getElement("#forgot-submit");


        form.addEventListener("submit", async event => {

            event.preventDefault();


            clearMessages();


            const email =
                normalizeEmail(emailInput?.value);


            if (!email) {

                showMessage(
                    "forgot-message",
                    "Informe o e-mail cadastrado.",
                    "error"
                );

                return;

            }


            setButtonLoading(
                button,
                true,
                "ENVIANDO..."
            );


            try {

                const client =
                    await getSupabaseClient();


                const { error } =
                    await client.auth.resetPasswordForEmail(
                        email,
                        {
                            redirectTo: getRedirectUrl()
                        }
                    );


                if (error) {

                    throw error;

                }


                showMessage(
                    "forgot-message",
                    "Se houver uma conta vinculada a esse endereço, você receberá um e-mail com as instruções para redefinir sua senha.",
                    "success"
                );

            } catch (error) {

                console.error(
                    "CCFV LIGA // ERRO RECUPERAÇÃO",
                    error
                );


                showMessage(
                    "forgot-message",
                    friendlyError(error),
                    "error"
                );

            } finally {

                setButtonLoading(
                    button,
                    false
                );

            }

        });

    }


    /* =====================================================
       ATUALIZAÇÃO DE SENHA
       ===================================================== */

    function bindNewPasswordForm() {

        const form =
            getElement("#new-password-form");


        if (!form) return;


        const passwordInput =
            getElement("#new-password");

        const confirmInput =
            getElement("#new-password-confirm");

        const button =
            getElement("#new-password-submit");


        form.addEventListener("submit", async event => {

            event.preventDefault();


            clearMessages();


            const password =
                passwordInput?.value || "";

            const confirmation =
                confirmInput?.value || "";


            if (password.length < 8) {

                showMessage(
                    "new-password-message",
                    "A nova senha precisa ter pelo menos 8 caracteres.",
                    "error"
                );

                return;

            }


            if (password !== confirmation) {

                showMessage(
                    "new-password-message",
                    "As senhas informadas não são iguais.",
                    "error"
                );

                confirmInput?.focus();

                return;

            }


            setButtonLoading(
                button,
                true,
                "ATUALIZANDO..."
            );


            try {

                const client =
                    await getSupabaseClient();


                const { error } =
                    await client.auth.updateUser({

                        password

                    });


                if (error) {

                    throw error;

                }


                form.reset();

                passwordRecoveryMode = false;


                showView(
                    "login",
                    { updateUrl: true }
                );


                showMessage(
                    "login-message",
                    "Sua senha foi atualizada com sucesso. Você já pode entrar na Liga.",
                    "success"
                );


            } catch (error) {

                console.error(
                    "CCFV LIGA // ERRO NOVA SENHA",
                    error
                );


                showMessage(
                    "new-password-message",
                    friendlyError(error),
                    "error"
                );

            } finally {

                setButtonLoading(
                    button,
                    false
                );

            }

        });

    }


    /* =====================================================
       ENCERRAR SESSÃO
       ===================================================== */

    function bindLogoutButton() {

        const button =
            getElement("#logout-button");


        if (!button) return;


        button.addEventListener("click", async () => {

            setButtonLoading(
                button,
                true,
                "SAINDO..."
            );


            try {

                const client =
                    await getSupabaseClient();


                const { error } =
                    await client.auth.signOut();


                if (error) {

                    throw error;

                }


                passwordRecoveryMode = false;

                showView(
                    "login",
                    { updateUrl: true }
                );


                showMessage(
                    "login-message",
                    "Você saiu da sua conta com segurança.",
                    "success"
                );


            } catch (error) {

                console.error(
                    "CCFV LIGA // ERRO AO SAIR",
                    error
                );


                showMessage(
                    "login-message",
                    friendlyError(error),
                    "error"
                );

            } finally {

                setButtonLoading(
                    button,
                    false
                );

            }

        });

    }


    /* =====================================================
       TROCA ENTRE AS TELAS
       ===================================================== */

    function bindViewNavigation() {

        document
            .querySelectorAll("[data-go]")
            .forEach(button => {

                button.addEventListener("click", () => {

                    const destination =
                        button.dataset.go;


                    if (
                        allowedViews.includes(destination) &&
                        destination !== "session"
                    ) {

                        passwordRecoveryMode = false;

                        showView(
                            destination,
                            { updateUrl: true }
                        );

                    }

                });

            });

    }


    /* =====================================================
       MOSTRAR / OCULTAR SENHA
       ===================================================== */

    function bindPasswordToggles() {

        document
            .querySelectorAll("[data-toggle-password]")
            .forEach(button => {

                button.addEventListener("click", () => {

                    const inputId =
                        button.dataset.togglePassword;

                    const input =
                        document.getElementById(inputId);


                    if (!input) return;


                    const showing =
                        input.type === "text";


                    input.type =
                        showing ? "password" : "text";


                    button.setAttribute(
                        "aria-label",
                        showing ? "Mostrar senha" : "Ocultar senha"
                    );

                });

            });

    }


    /* =====================================================
       OBSERVAR ALTERAÇÕES DA AUTENTICAÇÃO
       ===================================================== */

    function bindAuthState(client) {

        if (authSubscription) return;


        const { data, error } =
            client.auth.onAuthStateChange(
                (event, session) => {

                    if (event === "PASSWORD_RECOVERY") {

                        passwordRecoveryMode = true;

                        showView("new-password");

                        return;

                    }


                    if (
                        event === "SIGNED_IN" &&
                        session &&
                        !passwordRecoveryMode
                    ) {

                        showSession(session);

                        return;

                    }


                    if (event === "SIGNED_OUT") {

                        passwordRecoveryMode = false;

                        showView(
                            "login",
                            { updateUrl: true }
                        );

                    }

                }
            );


        if (error) {

            console.error(
                "CCFV LIGA // ERRO OBSERVADOR DE SESSÃO",
                error
            );

            return;

        }


        authSubscription =
            data?.subscription || null;

    }


    /* =====================================================
       INICIALIZAÇÃO
       ===================================================== */

    async function init() {

        console.log(
            "%cCCFV LIGA // AUTH SYSTEM",
            "color:#35d995;font-weight:900;font-size:15px;"
        );


        // Liga primeiro apresenta a tela solicitada pelo endereço.

        showView(
            getRequestedView()
        );


        bindLoginForm();

        bindRegisterForm();

        bindForgotForm();

        bindNewPasswordForm();

        bindLogoutButton();

        bindViewNavigation();

        bindPasswordToggles();


        try {

            const client =
                await getSupabaseClient();


            bindAuthState(client);


            const { data, error } =
                await client.auth.getSession();


            if (error) {

                throw error;

            }


            if (passwordRecoveryMode) {

                showView("new-password");

                return;

            }


            if (data?.session) {

                showSession(data.session);

                return;

            }


            showView(
                getRequestedView()
            );


            console.log(
                "CCFV LIGA // SUPABASE CONECTADO"
            );


        } catch (error) {

            console.error(
                "CCFV LIGA // FALHA NA INICIALIZAÇÃO",
                error
            );


            showMessage(
                "login-message",
                "Não foi possível conectar ao sistema de autenticação. Atualize a página e tente novamente. Detalhe: " + friendlyError(error),
                "error"
            );

        }

    }


    /* =====================================================
       DOM READY
       ===================================================== */

    if (document.readyState === "loading") {

        document.addEventListener(
            "DOMContentLoaded",
            init,
            { once: true }
        );

    } else {

        init();

    }


})();
