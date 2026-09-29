/* =========================================================
   CCFV // INSCRIÇÃO PÚBLICA
   - Cadastro sem login
   - Upload de foto em bucket dedicado
   - RPC segura para criação do jogador
   - Reuso do Player Card do Ranking existente
   ========================================================= */

(() => {
    "use strict";

    const RPC_NAME = "ccfv_public_register_player";
    const PHOTO_BUCKET = "ccfv-public-player-photos";
    const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

    const $ = (selector) => document.querySelector(selector);

    const dom = {
        form: $("#ccfv-registration-form"),
        name: $("#registration-name"),
        whatsapp: $("#registration-whatsapp"),
        instagram: $("#registration-instagram"),
        platform: $("#registration-platform"),
        team: $("#registration-team"),
        photo: $("#registration-photo"),
        photoPreview: $("#registration-photo-preview"),
        photoStatus: $("#registration-photo-status"),
        photoClear: $("#registration-photo-clear"),
        message: $("#registration-message"),
        submit: $("#registration-submit"),
        success: $("#registration-success"),
        successText: $("#registration-success-text"),
        successCode: $("#success-player-code"),
        card: $("#registration-card"),
        newButton: $("#registration-new"),
        cardSource: $("#ccfv-card-source")
    };

    let selectedPhoto = null;
    let objectUrl = null;

    function escapeHTML(value) {
        return String(value ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }

    function normalizeInstagram(value) {
        return String(value || "")
            .trim()
            .replace(/^@+/, "")
            .replace(/\s+/g, "");
    }

    function normalizeWhatsApp(value) {
        return String(value || "").replace(/\D/g, "");
    }

    function formatWhatsApp(value) {
        const digits = normalizeWhatsApp(value).slice(0, 13);
        if (digits.length <= 2) return digits;
        if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
        if (digits.length <= 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
        return `+${digits.slice(0, 2)} (${digits.slice(2, 4)}) ${digits.slice(4, 9)}-${digits.slice(9)}`;
    }

    function setMessage(message, type = "error") {
        if (!dom.message) return;
        dom.message.textContent = message || "";
        dom.message.classList.toggle("is-success", type === "success");
    }

    function setBusy(busy) {
        document.body.setAttribute("aria-busy", busy ? "true" : "false");
        if (dom.submit) {
            dom.submit.disabled = busy;
            dom.submit.innerHTML = busy
                ? "<span>REGISTRANDO...</span><span>…</span>"
                : "<span>FINALIZAR INSCRIÇÃO</span><span>→</span>";
        }
    }

    function clearPhoto() {
        selectedPhoto = null;
        if (objectUrl) {
            URL.revokeObjectURL(objectUrl);
            objectUrl = null;
        }
        if (dom.photo) dom.photo.value = "";
        if (dom.photoPreview) dom.photoPreview.textContent = "FOTO";
        if (dom.photoStatus) dom.photoStatus.textContent = "AGUARDANDO FOTO";
    }

    function showPhoto(file) {
        if (!file) {
            clearPhoto();
            return;
        }

        if (!/^image\/(png|jpeg|webp)$/i.test(file.type)) {
            setMessage("Selecione JPG, PNG ou WEBP.");
            clearPhoto();
            return;
        }

        if (file.size > MAX_PHOTO_BYTES) {
            setMessage("A foto ultrapassa 5 MB.");
            clearPhoto();
            return;
        }

        selectedPhoto = file;

        if (objectUrl) URL.revokeObjectURL(objectUrl);
        objectUrl = URL.createObjectURL(file);

        if (dom.photoPreview) {
            dom.photoPreview.innerHTML = `<img src="${escapeHTML(objectUrl)}" alt="Prévia da foto">`;
        }
        if (dom.photoStatus) dom.photoStatus.textContent = "FOTO PRONTA";
    }

    async function getSupabase() {
        if (window.CCFVAuth?.getClient) {
            return window.CCFVAuth.getClient();
        }
        throw new Error("O serviço de registro ainda está carregando. Recarregue a página e tente novamente.");
    }

    async function uploadPhoto(client, playerId, file) {
        if (!file) return null;

        const extMap = {
            "image/jpeg": "jpg",
            "image/png": "png",
            "image/webp": "webp"
        };
        const extension = extMap[file.type] || "jpg";
        const path = `${playerId}/${Date.now()}-${crypto.randomUUID()}.${extension}`;

        const { error } = await client.storage
            .from(PHOTO_BUCKET)
            .upload(path, file, {
                cacheControl: "3600",
                upsert: false,
                contentType: file.type
            });

        if (error) throw error;

        const { data } = client.storage
            .from(PHOTO_BUCKET)
            .getPublicUrl(path);

        if (!data?.publicUrl) {
            throw new Error("A foto foi enviada, mas não foi possível obter o endereço público.");
        }

        return data.publicUrl;
    }

    function validate() {
        const name = dom.name?.value.trim() || "";
        const whatsapp = normalizeWhatsApp(dom.whatsapp?.value);
        const instagram = normalizeInstagram(dom.instagram?.value);
        const platform = dom.platform?.value || "";
        const team = dom.team?.value.trim() || "";

        if (name.length < 3) throw new Error("Informe seu nome completo.");
        if (whatsapp.length < 10 || whatsapp.length > 13) throw new Error("Informe um WhatsApp válido.");
        if (!instagram || instagram.length < 2) throw new Error("Informe seu Instagram.");
        if (!["PC", "CONSOLE", "MOBILE"].includes(platform)) throw new Error("Selecione sua plataforma.");
        if (team.length < 2) throw new Error("Informe o nome do seu time.");
        if (!selectedPhoto) throw new Error("Selecione sua foto.");

        return { name, whatsapp, instagram, platform, team };
    }

    function resetSuccess() {
        if (dom.success) dom.success.hidden = true;
        if (dom.card) dom.card.innerHTML = "";
        if (dom.successCode) dom.successCode.textContent = "CCFV-000";
    }

    async function waitForCardEngine() {
        const iframe = dom.cardSource;
        if (!iframe) throw new Error("Motor de Player Card indisponível.");

        const start = Date.now();

        while (Date.now() - start < 20000) {
            try {
                const win = iframe.contentWindow;
                if (win?.CCFVRanking?.players && win?.CCFVRankingUIAPI) {
                    return win;
                }
            } catch (_) {
                // iframe ainda não pronto
            }
            await new Promise(resolve => setTimeout(resolve, 200));
        }

        throw new Error("O Player Card ainda está carregando. Tente novamente em alguns segundos.");
    }

    async function renderOfficialCard(player) {
        if (!dom.card) return;

        dom.card.innerHTML = `<div class="ccfv-registration-card-loading">GERANDO PLAYER CARD...</div>`;

        if (dom.cardSource) {
            dom.cardSource.src = "ranking.html?card-engine=1";
        }

        const win = await waitForCardEngine();

        // O Ranking existente trabalha com um array mutável exposto em CCFVRanking.players.
        // Mantemos todos os jogadores reais e adicionamos o novo jogador para que a posição
        // do card seja calculada pelo mesmo motor existente.
        const liveState = win.CCFVLiveAPI?.getState?.();
        const existing = Array.isArray(liveState?.ranking)
            ? liveState.ranking.slice()
            : [];

        const normalized = existing.filter(item => String(item?.id) !== String(player.id));
        normalized.push(player);

        if (Array.isArray(win.CCFVRanking.players)) {
            win.CCFVRanking.players.splice(0, win.CCFVRanking.players.length, ...normalized);
        }

        win.CCFVRanking.refresh();

        const start = Date.now();
        let sourceCard = null;

        while (Date.now() - start < 12000) {
            sourceCard = win.document.querySelector(
                `.ccfv-player-card-item[data-player-id="${CSS.escape(String(player.id))}"]`
            );
            if (sourceCard) break;
            await new Promise(resolve => setTimeout(resolve, 150));
        }

        if (!sourceCard) {
            throw new Error("Não foi possível montar o Player Card oficial agora.");
        }

        const clone = sourceCard.cloneNode(true);
        clone.dataset.playerId = String(player.id);
        dom.card.innerHTML = "";
        dom.card.appendChild(clone);

        const downloadButton = clone.querySelector("[data-download-card]");
        if (!downloadButton) return;

        downloadButton.addEventListener("click", async () => {
            await downloadCard(clone.querySelector("[data-card-player-id]"), downloadButton, player);
        });

        requestAnimationFrame(() => {
            document.querySelector("#registration-success")?.scrollIntoView({ behavior: "smooth", block: "start" });
        });
    }

    async function downloadCard(card, button, player) {
        if (!card || !button) return;

        const exporter = window.htmlToImage;
        const legacyExporter = window.html2canvas;

        if (!exporter && typeof legacyExporter !== "function") {
            alert("O gerador do card ainda está carregando.");
            return;
        }

        const original = button.innerHTML;
        button.disabled = true;
        button.innerHTML = "<span>GERANDO...</span><span>…</span>";

        try {
            await document.fonts.ready;

            const options = {
                cacheBust: true,
                pixelRatio: 3,
                backgroundColor: "transparent",
                imagePlaceholder: "",
                skipFonts: false,
                style: { transform: "none" },
                filter: (node) => !(node instanceof Element && node.matches(".ccfv-player-card-download"))
            };

            let dataUrl;

            if (exporter?.toPng) {
                dataUrl = await exporter.toPng(card, options);
            } else {
                const canvas = await legacyExporter(card, {
                    backgroundColor: null,
                    scale: 3,
                    useCORS: true,
                    allowTaint: false,
                    imageTimeout: 15000,
                    logging: false
                });
                dataUrl = canvas.toDataURL("image/png");
            }

            if (!dataUrl?.startsWith("data:image/png")) {
                throw new Error("PNG inválido.");
            }

            const safeName = String(player?.name || "jogador")
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .replace(/[^a-zA-Z0-9]+/g, "-")
                .replace(/^-+|-+$/g, "")
                .toLowerCase();

            const anchor = document.createElement("a");
            anchor.download = `ccfv-card-${safeName || "jogador"}.png`;
            anchor.href = dataUrl;
            anchor.style.display = "none";
            document.body.appendChild(anchor);
            anchor.click();
            anchor.remove();
        } catch (error) {
            console.error("CCFV // CARD:", error);
            alert("Não foi possível gerar o card agora. Verifique se a foto foi cadastrada em uma URL pública com CORS habilitado.");
        } finally {
            button.disabled = false;
            button.innerHTML = original;
        }
    }

    async function submitRegistration(event) {
        event.preventDefault();
        setMessage("");

        let formData;
        try {
            formData = validate();
        } catch (error) {
            setMessage(error.message || "Confira os campos da inscrição.");
            return;
        }

        setBusy(true);

        try {
            const client = await getSupabase();
            const playerId = crypto.randomUUID();
            const photoUrl = await uploadPhoto(client, playerId, selectedPhoto);

            const { data, error } = await client.rpc(RPC_NAME, {
                p_player_id: playerId,
                p_name: formData.name,
                p_whatsapp: formData.whatsapp,
                p_instagram: formData.instagram,
                p_platform: formData.platform,
                p_team_name: formData.team,
                p_photo_url: photoUrl
            });

            if (error) throw error;

            const player = {
                ...(data?.player || {}),
                id: data?.player?.id || data?.id || playerId,
                player_code: data?.player?.player_code || data?.player_code || "CCFV-000",
                name: formData.name,
                whatsapp: formData.whatsapp,
                instagram: formData.instagram,
                platform: formData.platform,
                team_name: formData.team,
                photo_url: photoUrl,
                elo: 0,
                wins: 0,
                draws: 0,
                losses: 0,
                titles: 0
            };

            dom.successCode.textContent = player.player_code;
            dom.successText.textContent = `${formData.name}, seu cadastro foi concluído. Seu Player Card oficial já está disponível para baixar.`;
            dom.success.hidden = false;

            await renderOfficialCard(player);

            if (dom.form) dom.form.reset();
            clearPhoto();
        } catch (error) {
            console.error("CCFV // REGISTRATION:", error);
            setMessage(error?.message || "Não foi possível concluir sua inscrição agora.");
        } finally {
            setBusy(false);
        }
    }

    function newRegistration() {
        resetSuccess();
        dom.form?.reset();
        clearPhoto();
        setMessage("");
        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    function bind() {
        dom.form?.addEventListener("submit", submitRegistration);
        dom.photo?.addEventListener("change", () => showPhoto(dom.photo.files?.[0] || null));
        dom.photoClear?.addEventListener("click", clearPhoto);
        dom.whatsapp?.addEventListener("input", () => {
            dom.whatsapp.value = formatWhatsApp(dom.whatsapp.value);
        });
        dom.instagram?.addEventListener("blur", () => {
            const value = normalizeInstagram(dom.instagram.value);
            dom.instagram.value = value ? `@${value}` : "";
        });
        dom.newButton?.addEventListener("click", newRegistration);
    }

    bind();
})();
