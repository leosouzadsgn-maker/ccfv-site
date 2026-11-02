
/* =========================================================
   CCFV LIGA — AUTENTICAÇÃO E VÍNCULO DO JOGADOR
   Supabase Auth v2
   ========================================================= */

(() => {

    "use strict";


    /* =====================================================
       CONFIGURAÇÃO
       ===================================================== */

    const SUPABASE_URL =
        "https://msqvkcnywokhakmqgiso.supabase.co";

    const SUPABASE_PUBLISHABLE_KEY =
        "sb_publishable_sanJ5WpLoquv4JH2ryYR6w_LxdaS2Q2";


    let supabaseClient = null;
    let supabasePromise = null;
    let authSubscription = null;

    let passwordRecoveryMode =
        new URLSearchParams(
            window.location.hash.replace(/^#/, "")
        ).get("type") === "recovery";


    const allowedViews = [
        "login",
        "register",
        "forgot",
        "new-password",
        "session"
    ];


    /* =====================================================
       UTILITÁRIOS
       ===================================================== */

    function getElement(selector) {

        return document.querySelector(selector);

    }


    function normalizeEmail(value) {

        return String(value || "")
            .trim()
            .toLowerCase();

    }


    function getRedirectUrl() {

        return new URL(
            "/liga/login.html",
            window.location.origin
        ).href;

    }


    /* =====================================================
       CARREGAMENTO DO SUPABASE
       ===================================================== */

    function loadSupabaseLibrary() {

        if (
            window.supabase &&
            typeof window.supabase.createClient === "function"
        ) {

            return Promise.resolve(window.supabase);

        }


        return new Promise((resolve, reject) => {

            const existing =
                document.querySelector(
                    "script[data-ccfv-supabase]"
                );


            if (existing) {

                existing.addEventListener(
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
                                    "Biblioteca Supabase indisponível."
                                )
                            );

                        }

                    },
                    { once: true }
                );


                existing.addEventListener(
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

                } else {

                    reject(
                        new Error(
                            "Supabase carregou sem disponibilizar createClient."
                        )
                    );

                }

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
       CLIENTE SUPABASE
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
                    "Configuração do Supabase incompleta."
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


            // Cliente exclusivo da Liga.
            // Não substitui o cliente do Admin CCFV.

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


    function showMessage(
        elementId,
        message,
        type = "info"
    ) {

        const element =
            document.getElementById(elementId);


        if (!element) return;


        const safeType = [
            "success",
            "error",
            "info"
        ].includes(type)
            ? type
            : "info";


        element.textContent = message;

        element.className =
            `auth-message is-visible is-${safeType}`;

        element.hidden = false;

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

            return "E-mail ou senha incorretos.";

        }


        if (
            message.includes("email not confirmed")
        ) {

            return "O e-mail da conta ainda não está confirmado.";

        }


        if (
            message.includes("user already registered") ||
            message.includes("already registered") ||
            message.includes("user already exists")
        ) {

            return "Já existe uma conta cadastrada com esse e-mail.";

        }


        if (
            message.includes("invalid email")
        ) {

            return "Informe um endereço de e-mail válido.";

        }


        if (
            message.includes("rate limit") ||
            error?.status === 429
        ) {

            return "Muitas tentativas. Aguarde um pouco e tente novamente.";

        }


        if (
            message.includes("failed to fetch") ||
            message.includes("networkerror")
        ) {

            return "Falha de conexão. Verifique sua internet.";

        }


        if (
            message.includes("código não encontrado")
        ) {

            return "Não encontramos um jogador ativo com esse código. Confira os dados.";

        }


        if (
            message.includes("já possui um jogador vinculado")
        ) {

            return "Esta conta já possui um jogador CCFV vinculado.";

        }


        if (
            message.includes("solicitação pendente")
        ) {

            return "Você já possui uma solicitação aguardando análise.";

        }


        if (
            message.includes("já está associado")
        ) {

            return "Este cadastro já possui uma solicitação ou associação com outra conta.";

        }


        if (
            message.includes("bloqueada")
        ) {

            return "Esta conta está bloqueada para novas solicitações.";

        }


        return error?.message ||
            "Ocorreu um erro inesperado. Tente novamente.";

    }


    /* =====================================================
       NAVEGAÇÃO ENTRE TELAS
       ===================================================== */

    function showView(
        viewName,
        options = {}
    ) {

        const target =
            allowedViews.includes(viewName)
                ? viewName
                : "login";


        document
            .querySelectorAll("[data-view]")
            .forEach(view => {

                view.hidden =
                    view.dataset.view !== target;

            });


        clearMessages();


        if (options.updateUrl === true) {

            const url =
                new URL(window.location.href);


            if (
                ["login", "register", "forgot"]
                    .includes(target)
            ) {

                url.searchParams.set(
                    "view",
                    target
                );

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

    }


    function getRequestedView() {

        const params =
            new URLSearchParams(
                window.location.search
            );


        const requested =
            params.get("view");


        if (
            ["login", "register", "forgot"]
                .includes(requested)
        ) {

            return requested;

        }


        return "login";

    }


    /* =====================================================
       BOTÕES DE PROCESSAMENTO
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
       INTERFACE DO VÍNCULO
       ===================================================== */

    function buildPlayerLinkInterface() {

        const container =
            document.querySelector(
                ".auth-session-next"
            );


        if (!container) {

            console.warn(
                "CCFV LIGA // ÁREA DE VÍNCULO NÃO ENCONTRADA."
            );

            return;

        }


        if (
            container.dataset.linkReady === "true"
        ) {

            return;

        }


        container.dataset.linkReady = "true";


        container.innerHTML = `

            <span>VÍNCULO COM JOGADOR CCFV</span>

            <strong id="player-link-title">
                Vincule seu cadastro esportivo
            </strong>

            <p id="player-link-description">
                Informe seu código oficial de jogador CCFV.
                A administração verificará sua solicitação.
            </p>

            <form
                class="auth-form"
                id="player-link-form"
                novalidate
            >

                <label class="auth-field">

                    <span>CÓDIGO DO JOGADOR CCFV</span>

                    <div class="auth-input">

                        <span class="auth-input__icon">#</span>

                        <input
                            type="text"
                            id="player-link-code"
                            name="player_code"
                            placeholder="Ex.: CCFV-001"
                            minlength="3"
                            maxlength="40"
                            autocomplete="off"
                            spellcheck="false"
                            required
                        >

                    </div>

                </label>

                <div
                    class="auth-message"
                    id="player-link-message"
                    role="alert"
                    aria-live="polite"
                ></div>

                <button
                    type="submit"
                    class="auth-submit auth-submit--secondary"
                    id="player-link-submit"
                >

                    <span>SOLICITAR VÍNCULO</span>

                    <strong>↗</strong>

                </button>

            </form>

            <div
                class="auth-message"
                id="player-link-status"
                role="status"
                aria-live="polite"
                hidden
            ></div>

            <button
                type="button"
                id="player-link-refresh"
                class="auth-link-refresh"
            >
                ATUALIZAR SITUAÇÃO DO VÍNCULO ↻
            </button>

        `;


        bindPlayerLinkForm();

        bindPlayerLinkRefresh();

    }


    /* =====================================================
       RENDERIZAR SITUAÇÃO DO VÍNCULO
       ===================================================== */

    function renderPlayerLinkStatus(record) {

        const form =
            getElement("#player-link-form");

        const title =
            getElement("#player-link-title");

        const description =
            getElement("#player-link-description");

        const statusBox =
            getElement("#player-link-status");

        const refreshButton =
            getElement("#player-link-refresh");


        if (
            !form ||
            !title ||
            !description ||
            !statusBox
        ) {

            return;

        }


        form.hidden = false;

        statusBox.hidden = true;

        refreshButton.hidden = false;


        const status =
            String(record?.link_status || "NOT_LINKED")
                .toUpperCase();


        const playerName =
            record?.player?.name || "";


        if (
            status === "NOT_LINKED"
        ) {

            title.textContent =
                "Vincule seu cadastro esportivo";

            description.textContent =
                "Informe seu código oficial de jogador CCFV. " +
                "A administração verificará sua solicitação.";

            form.hidden = false;

            refreshButton.hidden = true;

            return;

        }


        if (
            status === "PENDING"
        ) {

            title.textContent =
                "Solicitação em análise";

            description.textContent =
                playerName
                    ? `Cadastro identificado: ${playerName}. Aguarde a análise da administração.`
                    : "Sua solicitação foi recebida. Aguarde a análise da administração da Liga.";

            form.hidden = true;

            statusBox.hidden = false;

            statusBox.className =
                "auth-message is-visible is-info";

            statusBox.textContent =
                "VÍNCULO PENDENTE — AGUARDANDO APROVAÇÃO.";

            refreshButton.hidden = false;

            return;

        }


        if (
            status === "ACTIVE"
        ) {

            title.textContent =
                "Jogador vinculado com sucesso";

            description.textContent =
                playerName
                    ? `Seu cadastro esportivo ${playerName} foi aprovado e está associado à sua conta.`
                    : "Seu cadastro esportivo foi aprovado e está associado à sua conta.";

            form.hidden = true;

            statusBox.hidden = false;

            statusBox.className =
                "auth-message is-visible is-success";

            statusBox.textContent =
                "VÍNCULO APROVADO. VOCÊ JÁ PODE AVANÇAR PARA A CRIAÇÃO DO SEU CLUBE.";

            refreshButton.hidden = true;

            return;

        }


        if (
            status === "REJECTED"
        ) {

            title.textContent =
                "Solicitação não aprovada";

            description.textContent =
                "A solicitação anterior foi rejeitada. " +
                "Confira seu código e poderá enviar uma nova solicitação.";

            form.hidden = false;

            statusBox.hidden = false;

            statusBox.className =
                "auth-message is-visible is-error";

            statusBox.textContent =
                "VÍNCULO REJEITADO — UMA NOVA SOLICITAÇÃO PODE SER ENVIADA.";

            refreshButton.hidden = true;

            return;

        }


        if (
            status === "BLOCKED"
        ) {

            title.textContent =
                "Vínculo bloqueado";

            description.textContent =
                "Sua conta está bloqueada para novas solicitações. " +
                "Entre em contato com a administração da CCFV.";

            form.hidden = true;

            statusBox.hidden = false;

            statusBox.className =
                "auth-message is-visible is-error";

            statusBox.textContent =
                "ACESSO AO VÍNCULO BLOQUEADO.";

            refreshButton.hidden = true;

            return;

        }


        title.textContent =
            "Situação do vínculo";

        description.textContent =
            "Não foi possível identificar a situação atual.";

        form.hidden = true;

        statusBox.hidden = false;

        statusBox.className =
            "auth-message is-visible is-error";

        statusBox.textContent =
            "STATUS NÃO RECONHECIDO.";

    }


    /* =====================================================
       CONSULTAR VÍNCULO PELA RPC SEGURA
       Não consultar a tabela diretamente.
       ===================================================== */

    async function loadPlayerLinkStatus() {

        const client =
            await getSupabaseClient();


        const { data, error } =
            await client.rpc(
                "ccfv_league_get_my_player_link"
            );


        if (error) {

            throw error;

        }


        if (
            data?.success !== true
        ) {

            throw new Error(
                "Não foi possível consultar a situação do vínculo."
            );

        }


        renderPlayerLinkStatus(data);

        return data;

    }


    /* =====================================================
       SOLICITAR VÍNCULO
       RPC:
       ccfv_league_request_player_link(p_player_code text)
       ===================================================== */

    function bindPlayerLinkForm() {

        const form =
            getElement("#player-link-form");


        if (!form) return;


        const input =
            getElement("#player-link-code");

        const button =
            getElement("#player-link-submit");


        form.addEventListener(
            "submit",
            async event => {

                event.preventDefault();


                const playerCode =
                    String(input?.value || "")
                        .trim()
                        .toUpperCase();


                if (playerCode.length < 3) {

                    showMessage(
                        "player-link-message",
                        "Informe seu código de jogador CCFV.",
                        "error"
                    );

                    input?.focus();

                    return;

                }


                clearMessages();


                setButtonLoading(
                    button,
                    true,
                    "ENVIANDO SOLICITAÇÃO..."
                );


                try {

                    const client =
                        await getSupabaseClient();


                    const { data, error } =
                        await client.rpc(
                            "ccfv_league_request_player_link",
                            {
                                p_player_code: playerCode
                            }
                        );


                    if (error) {

                        throw error;

                    }


                    if (
                        data?.success !== true
                    ) {

                        throw new Error(
                            data?.message ||
                            "Não foi possível concluir a solicitação."
                        );

                    }


                    input.value = "";


                    // A solicitação pode ter sido gravada.
                    // Agora consultamos o status pela RPC segura.

                    try {

                        await loadPlayerLinkStatus();


                    } catch (statusError) {

                        console.error(
                            "CCFV LIGA // ERRO AO ATUALIZAR STATUS",
                            statusError
                        );


                        showMessage(
                            "player-link-status",
                            "Sua solicitação foi enviada, mas não conseguimos atualizar o status agora. Use o botão de atualização.",
                            "info"
                        );

                    }


                    console.log(
                        "CCFV LIGA // SOLICITAÇÃO DE VÍNCULO:",
                        data
                    );


                } catch (error) {

                    console.error(
                        "CCFV LIGA // ERRO AO SOLICITAR VÍNCULO",
                        error
                    );


                    showMessage(
                        "player-link-message",
                        friendlyError(error),
                        "error"
                    );

                } finally {

                    setButtonLoading(
                        button,
                        false
                    );

                }

            }
        );

    }


    /* =====================================================
       ATUALIZAR SITUAÇÃO DO VÍNCULO
       ===================================================== */

    function bindPlayerLinkRefresh() {

        const button =
            getElement("#player-link-refresh");


        if (!button) return;


        button.addEventListener(
            "click",
            async () => {

                setButtonLoading(
                    button,
                    true,
                    "CONSULTANDO..."
                );


                try {

                    const client =
                        await getSupabaseClient();


                    const { data, error } =
                        await client.auth.getSession();


                    if (error) {

                        throw error;

                    }


                    if (!data?.session) {

                        throw new Error(
                            "Sua sessão expirou. Entre novamente."
                        );

                    }


                    await loadPlayerLinkStatus();


                } catch (error) {

                    console.error(
                        "CCFV LIGA // ERRO AO ATUALIZAR VÍNCULO",
                        error
                    );


                    showMessage(
                        "player-link-status",
                        friendlyError(error),
                        "error"
                    );

                } finally {

                    setButtonLoading(
                        button,
                        false
                    );

                }

            }
        );

    }


    /* =====================================================
       SESSÃO AUTENTICADA
       ===================================================== */

    function showSession(session) {

        const emailElement =
            getElement("#session-email");


        if (emailElement) {

            emailElement.textContent =
                session?.user?.email ||
                "Conta autenticada";

        }


        showView("session");


        if (session?.user?.id) {

            // Fora do callback de onAuthStateChange.

            window.setTimeout(async () => {

                try {

                    await loadPlayerLinkStatus();

                } catch (error) {

                    console.error(
                        "CCFV LIGA // ERRO AO CONSULTAR VÍNCULO",
                        error
                    );


                    showMessage(
                        "player-link-status",
                        "Não foi possível consultar seu vínculo. " +
                        friendlyError(error),
                        "error"
                    );

                }

            }, 0);

        }

    }


    /* =====================================================
       LOGIN
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


        form.addEventListener(
            "submit",
            async event => {

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

            }
        );

    }


    /* =====================================================
       CADASTRO
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


        form.addEventListener(
            "submit",
            async event => {

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
                        "A senha precisa ter pelo menos 8 caracteres.",
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


                    form.reset();


                    if (data?.session) {

                        showSession(data.session);

                        return;

                    }


                    showMessage(
                        "register-message",
                        "A conta foi criada, mas não recebemos uma sessão. Confira se a confirmação de e-mail continua desativada no Supabase.",
                        "info"
                    );


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

            }
        );

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


        form.addEventListener(
            "submit",
            async event => {

                event.preventDefault();

                clearMessages();


                const email =
                    normalizeEmail(emailInput?.value);


                if (!email) {

                    showMessage(
                        "forgot-message",
                        "Informe seu e-mail.",
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
                        "Se houver uma conta vinculada a esse endereço, você receberá as instruções de recuperação.",
                        "success"
                    );


                } catch (error) {

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

            }
        );

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


        form.addEventListener(
            "submit",
            async event => {

                event.preventDefault();

                clearMessages();


                const password =
                    passwordInput?.value || "";

                const confirmation =
                    confirmInput?.value || "";


                if (password.length < 8) {

                    showMessage(
                        "new-password-message",
                        "A senha precisa ter pelo menos 8 caracteres.",
                        "error"
                    );

                    return;

                }


                if (password !== confirmation) {

                    showMessage(
                        "new-password-message",
                        "As senhas não são iguais.",
                        "error"
                    );

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


                    passwordRecoveryMode = false;

                    form.reset();


                    showView(
                        "login",
                        { updateUrl: true }
                    );


                    showMessage(
                        "login-message",
                        "Sua senha foi atualizada com sucesso.",
                        "success"
                    );


                } catch (error) {

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

            }
        );

    }


    /* =====================================================
       SAIR DA CONTA
       ===================================================== */

    function bindLogoutButton() {

        const button =
            getElement("#logout-button");


        if (!button) return;


        button.addEventListener(
            "click",
            async () => {

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

            }
        );

    }


    /* =====================================================
       NAVEGAÇÃO DOS BOTÕES
       ===================================================== */

    function bindViewNavigation() {

        document
            .querySelectorAll("[data-go]")
            .forEach(button => {

                button.addEventListener(
                    "click",
                    () => {

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

                    }
                );

            });

    }


    /* =====================================================
       MOSTRAR / OCULTAR SENHA
       ===================================================== */

    function bindPasswordToggles() {

        document
            .querySelectorAll("[data-toggle-password]")
            .forEach(button => {

                button.addEventListener(
                    "click",
                    () => {

                        const input =
                            document.getElementById(
                                button.dataset.togglePassword
                            );


                        if (!input) return;


                        const showing =
                            input.type === "text";


                        input.type =
                            showing ? "password" : "text";


                        button.setAttribute(
                            "aria-label",
                            showing
                                ? "Mostrar senha"
                                : "Ocultar senha"
                        );

                    }
                );

            });

    }


    /* =====================================================
       OBSERVAR AUTENTICAÇÃO
       ===================================================== */

    function bindAuthState(client) {

        if (authSubscription) return;


        const result =
            client.auth.onAuthStateChange(
                (event, session) => {

                    if (
                        event === "PASSWORD_RECOVERY"
                    ) {

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


                    if (
                        event === "SIGNED_OUT"
                    ) {

                        passwordRecoveryMode = false;

                        showView(
                            "login",
                            { updateUrl: true }
                        );

                    }

                }
            );


        authSubscription =
            result?.data?.subscription || null;

    }


    /* =====================================================
       INICIALIZAÇÃO
       ===================================================== */

    async function init() {

        console.log(
            "%cCCFV LIGA // AUTH SYSTEM",
            "color:#35d995;font-weight:900;font-size:15px;"
        );


        buildPlayerLinkInterface();

        bindLoginForm();

        bindRegisterForm();

        bindForgotForm();

        bindNewPasswordForm();

        bindLogoutButton();

        bindViewNavigation();

        bindPasswordToggles();


        showView(
            getRequestedView()
        );


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
                "CCFV LIGA // ERRO NA INICIALIZAÇÃO",
                error
            );


            showMessage(
                "login-message",
                "Não foi possível conectar ao sistema: " +
                friendlyError(error),
                "error"
            );

        }

    }


    /* =====================================================
       DOM READY
       ===================================================== */

    if (
        document.readyState === "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            init,
            { once: true }
        );

    } else {

        init();

    }


})();
