/* =========================================================
   CCFV — AUTENTICAÇÃO GLOBAL DA ÁREA ADMINISTRATIVA
   Substitui: /admin/js/auth.js

   AUTORIDADE GLOBAL: public.ccfv_is_admin()
   Essa é a mesma RPC utilizada pelo painel /liga/admin/.

   - Jogadores mantêm contas Supabase normais para acessar a Liga.
   - Somente contas autorizadas no cadastro administrativo global
     conseguem abrir qualquer rota dentro de /admin/.
   - O banco decide; o navegador não mantém uma segunda allowlist.
   - Falha fechada: se não for possível validar o acesso, o Admin
     não é exibido.
   ========================================================= */

(() => {
    "use strict";

    const SUPABASE_URL = "https://msqvkcnywokhakmqgiso.supabase.co";
    const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_sanJ5WpLoquv4JH2ryYR6w_LxdaS2Q2";
    const ADMIN_CHECK_RPC = "ccfv_is_admin";
    const ADMIN_HOME = "/admin/";
    const ADMIN_LOGIN = "/admin/login.html";
    const LEAGUE_HOME = "/liga/index.html";

    let supabaseClient = null;
    let clientPromise = null;

    function currentPath() {
        return window.location.pathname.replace(/\/+$/, "") || "/";
    }

    function isLoginPage() {
        return currentPath() === ADMIN_LOGIN;
    }

    // Protege todas as competições e páginas centrais em /admin/.
    function isAdminPage() {
        const path = currentPath();
        return path === "/admin" || path.startsWith("/admin/");
    }

    function hidePage() {
        document.documentElement.style.visibility = "hidden";
    }

    function showPage() {
        document.documentElement.style.visibility = "visible";
    }

    function loadSupabase() {
        return new Promise((resolve, reject) => {
            if (window.supabase?.createClient) {
                resolve(window.supabase);
                return;
            }

            const existing = document.querySelector("script[data-ccfv-supabase]");
            if (existing) {
                existing.addEventListener("load", () => {
                    if (window.supabase?.createClient) resolve(window.supabase);
                    else reject(new Error("Biblioteca Supabase não ficou disponível."));
                }, { once: true });
                existing.addEventListener("error", () => reject(new Error("Falha ao carregar o Supabase.")), { once: true });
                return;
            }

            const script = document.createElement("script");
            script.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
            script.async = true;
            script.dataset.ccfvSupabase = "true";
            script.onload = () => window.supabase?.createClient
                ? resolve(window.supabase)
                : reject(new Error("Supabase carregou sem createClient."));
            script.onerror = () => reject(new Error("Não foi possível carregar a biblioteca do Supabase."));
            document.head.appendChild(script);
        });
    }

    async function getClient() {
        if (supabaseClient) return supabaseClient;
        if (clientPromise) return clientPromise;

        clientPromise = (async () => {
            const supabase = await loadSupabase();
            if (!SUPABASE_PUBLISHABLE_KEY) throw new Error("Publishable Key do Supabase ausente.");
            supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
            window.CCFVSupabase = supabaseClient;
            return supabaseClient;
        })();

        try {
            return await clientPromise;
        } catch (error) {
            clientPromise = null;
            throw error;
        }
    }

    async function login(email, password) {
        const client = await getClient();
        const { data, error } = await client.auth.signInWithPassword({ email, password });
        if (error) throw error;
        return data;
    }

    async function getSession() {
        const client = await getClient();
        const { data, error } = await client.auth.getSession();
        if (error) throw error;
        return data?.session || null;
    }

    // Usa exatamente o mesmo verificador global do Admin da Liga CCFV.
    async function isAdmin() {
        const session = await getSession();
        if (!session?.user?.id) return false;

        const client = await getClient();
        const { data, error } = await client.rpc(ADMIN_CHECK_RPC);
        if (error) throw new Error(`Falha ao validar administrador: ${error.message}`);
        return data === true || data?.is_admin === true;
    }

    async function logout() {
        const client = await getClient();
        const { error } = await client.auth.signOut();
        if (error) throw error;
        window.location.replace(ADMIN_LOGIN);
    }

    function redirectToLogin() {
        if (!isLoginPage()) window.location.replace(ADMIN_LOGIN);
    }

    function redirectNonAdminToLeague() {
        // Não apaga nem encerra a conta do jogador; apenas sai da área Admin.
        window.location.replace(`${LEAGUE_HOME}?access=admin-denied`);
    }

    function getFriendlyError(error) {
        const message = String(error?.message || "");
        const lower = message.toLowerCase();
        if (lower.includes("invalid login credentials")) return "EMAIL OU SENHA INCORRETOS.";
        if (lower.includes("email not confirmed")) return "O EMAIL AINDA NÃO FOI CONFIRMADO.";
        if (lower.includes("invalid api key")) return "CHAVE DE CONEXÃO DO SUPABASE INVÁLIDA.";
        if (lower.includes("failed to fetch")) return "NÃO FOI POSSÍVEL CONECTAR AO SERVIDOR.";
        if (lower.includes("ccfv_is_admin") || lower.includes("validar administrador")) {
            return "NÃO FOI POSSÍVEL VALIDAR SUA PERMISSÃO ADMINISTRATIVA. CONFIRA A FUNÇÃO GLOBAL CCFV_IS_ADMIN().";
        }
        return message || "ERRO DESCONHECIDO.";
    }

    function showLoginError(error) {
        const element = document.querySelector("#ccfv-login-error");
        if (!element) return;
        element.textContent = getFriendlyError(error);
        element.classList.add("is-visible");
    }

    function clearLoginError() {
        const element = document.querySelector("#ccfv-login-error");
        if (!element) return;
        element.textContent = "";
        element.classList.remove("is-visible");
    }

    function bindLoginForm() {
        const form = document.querySelector("#ccfv-login-form");
        if (!form) return;

        const email = document.querySelector("#ccfv-login-email");
        const password = document.querySelector("#ccfv-login-password");
        const button = document.querySelector("#ccfv-login-button");

        form.addEventListener("submit", async event => {
            event.preventDefault();
            clearLoginError();

            const emailValue = email?.value.trim() || "";
            const passwordValue = password?.value || "";
            if (!emailValue || !passwordValue) {
                showLoginError(new Error("PREENCHA EMAIL E SENHA."));
                return;
            }

            if (button) {
                button.disabled = true;
                button.textContent = "AUTENTICANDO...";
            }

            try {
                await login(emailValue, passwordValue);
                const allowed = await isAdmin();
                if (!allowed) {
                    redirectNonAdminToLeague();
                    return;
                }
                if (button) button.textContent = "ACESSO LIBERADO...";
                window.location.replace(ADMIN_HOME);
            } catch (error) {
                console.error("CCFV // ADMIN LOGIN:", error);
                showLoginError(error);
                if (button) {
                    button.disabled = false;
                    button.textContent = "ENTRAR NO PAINEL";
                }
            }
        });
    }

    async function protectAdmin() {
        if (!isAdminPage()) return;
        hidePage();

        try {
            const session = await getSession();
            if (!session) {
                redirectToLogin();
                return;
            }

            if (!(await isAdmin())) {
                redirectNonAdminToLeague();
                return;
            }

            showPage();
        } catch (error) {
            console.error("CCFV // ADMIN ACCESS DENIED:", error);
            window.location.replace(`${ADMIN_LOGIN}?error=admin-check`);
        }
    }

    async function protectLogin() {
        if (!isLoginPage()) return;
        hidePage();

        try {
            const session = await getSession();
            if (!session) {
                showPage();
                return;
            }

            if (await isAdmin()) {
                window.location.replace(ADMIN_HOME);
                return;
            }

            redirectNonAdminToLeague();
        } catch (error) {
            console.error("CCFV // ADMIN LOGIN CHECK:", error);
            showPage();
        }
    }

    async function bindAuthState() {
        const client = await getClient();
        client.auth.onAuthStateChange(event => {
            if (event === "SIGNED_OUT" && isAdminPage()) redirectToLogin();
        });
    }

    window.CCFVAuth = { login, logout, getSession, getClient, isAdmin };

    async function init() {
        bindLoginForm();
        try {
            await getClient();
            await protectAdmin();
            await protectLogin();
            await bindAuthState();
            console.info("CCFV // AUTH GLOBAL // PRONTO");
        } catch (error) {
            console.error("CCFV // AUTH INIT ERROR:", error);
            if (isAdminPage()) window.location.replace(ADMIN_LOGIN);
            else showPage();
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init, { once: true });
    } else {
        init();
    }
})();
