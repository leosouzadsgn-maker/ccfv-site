/* =========================================================
   CCFV // INSCRIÇÃO PÚBLICA
   - Cadastro sem login
   - Upload em bucket dedicado
   - RPC segura
   - Depois do cadastro, o jogador aparece no Ranking CCFV
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
        newButton: $("#registration-new")
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

        if (digits.length <= 11) {
            return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
        }

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

        if (dom.photo) {
            dom.photo.value = "";
        }

        if (dom.photoPreview) {
            dom.photoPreview.textContent = "FOTO";
        }

        if (dom.photoStatus) {
            dom.photoStatus.textContent = "AGUARDANDO FOTO";
        }
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

        if (objectUrl) {
            URL.revokeObjectURL(objectUrl);
        }

        objectUrl = URL.createObjectURL(file);

        if (dom.photoPreview) {
            dom.photoPreview.innerHTML =
                `<img src="${escapeHTML(objectUrl)}" alt="Prévia da foto">`;
        }

        if (dom.photoStatus) {
            dom.photoStatus.textContent = "FOTO PRONTA";
        }
    }

    async function getSupabase() {
        if (window.CCFVAuth?.getClient) {
            return window.CCFVAuth.getClient();
        }

        throw new Error(
            "O serviço de registro ainda está carregando. Recarregue a página e tente novamente."
        );
    }

    async function uploadPhoto(client, playerId, file) {
        if (!file) return null;

        const extMap = {
            "image/jpeg": "jpg",
            "image/png": "png",
            "image/webp": "webp"
        };

        const extension = extMap[file.type] || "jpg";

        const path =
            `${playerId}/${Date.now()}-${crypto.randomUUID()}.${extension}`;

        const { error } = await client.storage
            .from(PHOTO_BUCKET)
            .upload(path, file, {
                cacheControl: "3600",
                upsert: false,
                contentType: file.type
            });

        if (error) {
            throw error;
        }

        const { data } = client.storage
            .from(PHOTO_BUCKET)
            .getPublicUrl(path);

        if (!data?.publicUrl) {
            throw new Error(
                "A foto foi enviada, mas não foi possível obter o endereço público."
            );
        }

        return data.publicUrl;
    }

    function validate() {
        const name = dom.name?.value.trim() || "";
        const whatsapp = normalizeWhatsApp(dom.whatsapp?.value);
        const instagram = normalizeInstagram(dom.instagram?.value);
        const platform = dom.platform?.value || "";
        const team = dom.team?.value.trim() || "";

        if (name.length < 3) {
            throw new Error("Informe seu nome completo.");
        }

        if (whatsapp.length < 10 || whatsapp.length > 13) {
            throw new Error("Informe um WhatsApp válido.");
        }

        if (!instagram || instagram.length < 2) {
            throw new Error("Informe seu Instagram.");
        }

        if (!["PC", "CONSOLE", "MOBILE"].includes(platform)) {
            throw new Error("Selecione sua plataforma.");
        }

        if (team.length < 2) {
            throw new Error("Informe o nome do seu time.");
        }

        if (!selectedPhoto) {
            throw new Error("Selecione sua foto.");
        }

        return {
            name,
            whatsapp,
            instagram,
            platform,
            team
        };
    }

    function resetSuccess() {
        if (dom.success) {
            dom.success.hidden = true;
        }

        if (dom.successCode) {
            dom.successCode.textContent = "CCFV-000";
        }
    }

    async function submitRegistration(event) {
        event.preventDefault();
        setMessage("");

        let formData;

        try {
            formData = validate();
        } catch (error) {
            setMessage(
                error.message || "Confira os campos da inscrição."
            );
            return;
        }

        setBusy(true);

        try {
            const client = await getSupabase();
            const playerId = crypto.randomUUID();

            const photoUrl =
                await uploadPhoto(
                    client,
                    playerId,
                    selectedPhoto
                );

            const { data, error } = await client.rpc(
                RPC_NAME,
                {
                    p_player_id: playerId,
                    p_name: formData.name,
                    p_whatsapp: formData.whatsapp,
                    p_instagram: formData.instagram,
                    p_platform: formData.platform,
                    p_team_name: formData.team,
                    p_photo_url: photoUrl
                }
            );

            if (error) {
                throw error;
            }

            const playerCode =
                data?.player?.player_code ||
                data?.player_code ||
                "CCFV-000";

            if (dom.successCode) {
                dom.successCode.textContent = playerCode;
            }

            if (dom.successText) {
                dom.successText.textContent =
                    `${formData.name}, seu cadastro foi concluído. ` +
                    `Seu jogador já está disponível no Ranking CCFV.`;
            }

            if (dom.success) {
                dom.success.hidden = false;
                dom.success.scrollIntoView({
                    behavior: "smooth",
                    block: "start"
                });
            }

            if (dom.form) {
                dom.form.reset();
            }

            clearPhoto();

            setMessage(
                "Cadastro concluído com sucesso.",
                "success"
            );
        } catch (error) {
            console.error(
                "CCFV // REGISTRATION:",
                error
            );

            setMessage(
                error?.message ||
                "Não foi possível concluir sua inscrição agora."
            );
        } finally {
            setBusy(false);
        }
    }

    function newRegistration() {
        resetSuccess();

        if (dom.form) {
            dom.form.reset();
        }

        clearPhoto();
        setMessage("");

        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });
    }

    function bind() {
        dom.form?.addEventListener(
            "submit",
            submitRegistration
        );

        dom.photo?.addEventListener(
            "change",
            () => showPhoto(
                dom.photo.files?.[0] || null
            )
        );

        dom.photoClear?.addEventListener(
            "click",
            clearPhoto
        );

        dom.whatsapp?.addEventListener(
            "input",
            () => {
                dom.whatsapp.value =
                    formatWhatsApp(
                        dom.whatsapp.value
                    );
            }
        );

        dom.instagram?.addEventListener(
            "blur",
            () => {
                const value =
                    normalizeInstagram(
                        dom.instagram.value
                    );

                dom.instagram.value =
                    value
                        ? `@${value}`
                        : "";
            }
        );

        dom.newButton?.addEventListener(
            "click",
            newRegistration
        );
    }

    bind();
})();
