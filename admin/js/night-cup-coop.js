(function () {
"use strict";

const state = {
    client: null,
    players: [],
    cups: [],
    currentCup: null,
    pairs: [],
    matches: [],
    busy: false
};

const $ = function (selector) {
    return document.querySelector(selector);
};

const dom = {
    message: $("#coop-message"),
    pairForm: $("#coop-pair-form"),
    counter: $("#coop-pair-counter"),
    create: $("#coop-create"),
    editionName: $("#coop-edition-name"),
    editionStatus: $("#coop-edition-status"),
    currentEdition: $("#coop-current-edition"),
    semifinals: $("#coop-semifinals"),
    final: $("#coop-final"),
    podium: $("#coop-podium"),
    history: $("#coop-history"),
    refresh: $("#coop-refresh"),
    toast: $("#coop-toast")
};

function escapeHtml(value) {
    return String(value == null ? "" : value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function notify(message, isError) {
    if (dom.message) {
        dom.message.textContent = message;
        dom.message.classList.toggle("error", Boolean(isError));
    }

    if (dom.toast) {
        dom.toast.textContent = message;
        dom.toast.classList.add("is-visible");

        window.clearTimeout(dom.toast._timer);

        dom.toast._timer = window.setTimeout(function () {
            dom.toast.classList.remove("is-visible");
        }, 3400);
    }
}

function setBusy(value, button, label) {
    state.busy = value;

    if (!button) return;

    if (value) {
        button.disabled = true;
        button.dataset.label = button.textContent;
        button.textContent = label || "PROCESSANDO...";
    } else {
        button.textContent = label || button.dataset.label || "SALVAR";
    }
}

async function getClient() {
    if (state.client) return state.client;

    if (!window.CCFVAuth || typeof window.CCFVAuth.getClient !== "function") {
        throw new Error("Sistema de autenticação indisponível. Atualize a página.");
    }

    state.client = await window.CCFVAuth.getClient();
    return state.client;
}

function playerName(id) {
    const player = state.players.find(function (item) {
        return String(item.id) === String(id);
    });

    return player ? player.name : "Jogador";
}

function pairById(id) {
    return state.pairs.find(function (item) {
        return String(item.id) === String(id);
    }) || null;
}

function pairTitle(pair) {
    if (!pair) return "A DEFINIR";

    return pair.pair_name ||
        ("DUPLA " + String(pair.pair_number).padStart(2, "0"));
}

function pairMembers(pair) {
    if (!pair) return "Aguardando classificação";

    return playerName(pair.player_one_id) +
        " + " +
        playerName(pair.player_two_id);
}

function renderPairForm() {
    if (!dom.pairForm) return;

    const options = ['<option value="">Selecione o jogador</option>']
        .concat(state.players.map(function (player) {
            const platform = String(player.platform || "").toUpperCase();

            return '<option value="' + escapeHtml(player.id) + '">' +
                escapeHtml(player.name) +
                ' · ' + escapeHtml(platform) +
                ' · ' + Number(player.elo || 0) + ' ELO</option>';
        }))
        .join("");

    dom.pairForm.innerHTML = "";

    for (let i = 1; i <= 4; i++) {
        const card = document.createElement("article");
        card.className = "coop-pair-card";

        card.innerHTML =
            '<div class="coop-pair-card__head">' +
                '<strong>DUPLA ' + String(i).padStart(2, "0") + '</strong>' +
                '<span>02 JOGADORES</span>' +
            '</div>' +
            '<div class="coop-edition-name">' +
                '<label for="coop-pair-name-' + i + '">NOME DA DUPLA</label>' +
                '<input id="coop-pair-name-' + i + '" type="text" maxlength="48" placeholder="Dupla ' + String(i).padStart(2, "0") + '">' +
            '</div>' +
            '<div class="coop-fields">' +
                '<div class="coop-field">' +
                    '<label for="coop-pair-' + i + '-one">JOGADOR 01</label>' +
                    '<select id="coop-pair-' + i + '-one" data-player-select>' + options + '</select>' +
                '</div>' +
                '<div class="coop-field">' +
                    '<label for="coop-pair-' + i + '-two">JOGADOR 02</label>' +
                    '<select id="coop-pair-' + i + '-two" data-player-select>' + options + '</select>' +
                '</div>' +
            '</div>';

        dom.pairForm.appendChild(card);
    }

    dom.pairForm.querySelectorAll("[data-player-select]").forEach(function (select) {
        select.addEventListener("change", validatePairs);
    });

    validatePairs();
}

function selectedPairs() {
    const result = [];

    for (let i = 1; i <= 4; i++) {
        result.push({
            pair_name: ($("#coop-pair-name-" + i).value || "").trim() ||
                ("DUPLA " + String(i).padStart(2, "0")),

            player_one_id: $("#coop-pair-" + i + "-one").value,
            player_two_id: $("#coop-pair-" + i + "-two").value
        });
    }

    return result;
}

function validatePairs() {
    if (!dom.pairForm) return false;

    const pairs = selectedPairs();

    const ids = pairs.flatMap(function (pair) {
        return [
            pair.player_one_id,
            pair.player_two_id
        ].filter(Boolean);
    });

    const unique = new Set(ids);

    const allSelected = ids.length === 8;

    const valid = allSelected &&
        unique.size === 8 &&
        pairs.every(function (pair) {
            return pair.player_one_id &&
                pair.player_two_id &&
                pair.player_one_id !== pair.player_two_id;
        });

    if (dom.counter) {
        dom.counter.textContent = ids.length + "/8 jogadores selecionados";
    }

    const activeCup = state.currentCup &&
        state.currentCup.status !== "FINISHED";

    if (dom.create) {
        dom.create.disabled = !valid || state.busy || Boolean(activeCup);
    }

    return valid;
}

async function loadPlayers() {
    const client = await getClient();

    const response = await client
        .from("players")
        .select("id,name,platform,elo,status")
        .eq("status", "ACTIVE")
        .order("name", { ascending: true });

    if (response.error) throw response.error;

    state.players = (response.data || []).filter(function (player) {
        return ["PC", "CONSOLE"].includes(
            String(player.platform || "").toUpperCase()
        );
    });

    renderPairForm();
}

async function loadCups() {
    const client = await getClient();

    const response = await client
        .from("night_cup_coop")
        .select("*")
        .order("edition_number", { ascending: false });

    if (response.error) throw response.error;

    state.cups = response.data || [];

    const active = state.cups.find(function (cup) {
        return cup.status === "IN_PROGRESS" || cup.status === "SETUP";
    });

    const target = active || state.cups[0] || null;

    if (target) {
        await loadCup(target.id);
    } else {
        state.currentCup = null;
        state.pairs = [];
        state.matches = [];
        renderCompetition();
    }

    renderHistory();
}

async function loadCup(cupId) {
    const client = await getClient();

    const cupResponse = await client
        .from("night_cup_coop")
        .select("*")
        .eq("id", cupId)
        .single();

    if (cupResponse.error) throw cupResponse.error;

    const responses = await Promise.all([
        client.from("night_cup_coop_pairs")
            .select("*")
            .eq("cup_id", cupId)
            .order("pair_number"),

        client.from("night_cup_coop_matches")
            .select("*")
            .eq("cup_id", cupId)
            .order("stage", { ascending: true })
            .order("match_number", { ascending: true })
    ]);

    if (responses[0].error) throw responses[0].error;
    if (responses[1].error) throw responses[1].error;

    state.currentCup = cupResponse.data;
    state.pairs = responses[0].data || [];
    state.matches = responses[1].data || [];

    renderCompetition();
    renderHistory();
}

function renderHistory() {
    if (!dom.history) return;

    if (!state.cups.length) {
        dom.history.innerHTML = '<div class="ccfv-empty">Nenhuma edição cadastrada ainda.</div>';
        return;
    }

    dom.history.innerHTML = state.cups.map(function (cup) {
        const active = state.currentCup &&
            state.currentCup.id === cup.id ? " is-active" : "";

        return '<button type="button" class="' + active +
            '" data-cup-id="' + escapeHtml(cup.id) + '">' +
            escapeHtml(cup.name) +
            ' · ' + escapeHtml(cup.status) +
            '</button>';
    }).join("");
}

function renderMatch(match) {
    const home = pairById(match.home_pair_id);
    const away = pairById(match.away_pair_id);

    const isFinal = match.stage === "FINAL";

    const stage = isFinal
        ? "GRANDE FINAL"
        : ("SEMIFINAL " + String(match.match_number).padStart(2, "0"));

    const ready = match.status === "READY";

    const homeScore = match.home_score == null ? "—" : match.home_score;
    const awayScore = match.away_score == null ? "—" : match.away_score;

    const winner = pairById(match.winner_pair_id);

    const homeDelta = isFinal
        ? (match.winner_pair_id === match.home_pair_id ? "+8" : "-4")
        : (match.winner_pair_id === match.home_pair_id ? "+6" : "-2");

    const awayDelta = isFinal
        ? (match.winner_pair_id === match.away_pair_id ? "+8" : "-4")
        : (match.winner_pair_id === match.away_pair_id ? "+6" : "-2");

    let html =
        '<article class="coop-match" data-match-id="' + escapeHtml(match.id) + '">' +
            '<div class="coop-match__top">' +
                '<span>' + stage + '</span>' +
                '<span>' + (ready ? "AGUARDANDO PLACAR" : "RESULTADO REGISTRADO") + '</span>' +
            '</div>' +

            '<div class="coop-match__teams">' +
                '<div class="coop-match__pair">' +
                    '<strong>' + escapeHtml(pairTitle(home)) + '</strong>' +
                    '<small>' + escapeHtml(pairMembers(home)) + '</small>' +
                '</div>' +

                '<div class="coop-match__score">' +
                    escapeHtml(homeScore) + ' × ' + escapeHtml(awayScore) +
                '</div>' +

                '<div class="coop-match__pair">' +
                    '<strong>' + escapeHtml(pairTitle(away)) + '</strong>' +
                    '<small>' + escapeHtml(pairMembers(away)) + '</small>' +
                '</div>' +
            '</div>';

    if (ready) {
        html +=
            '<form class="coop-score-form" data-match-id="' + escapeHtml(match.id) + '">' +

                '<label>PLACAR DUPLA A' +
                    '<input name="home-score" type="number" min="0" max="99" step="1" required inputmode="numeric" placeholder="0">' +
                '</label>' +

                '<span class="coop-score-form__vs">X</span>' +

                '<label>PLACAR DUPLA B' +
                    '<input name="away-score" type="number" min="0" max="99" step="1" required inputmode="numeric" placeholder="0">' +
                '</label>' +

                '<div class="coop-score-form__penalties">' +
                    '<label>PÊNALTIS A (SE EMPATAR)' +
                        '<input name="home-penalties" type="number" min="0" max="99" step="1" inputmode="numeric" placeholder="Opcional">' +
                    '</label>' +

                    '<label>PÊNALTIS B (SE EMPATAR)' +
                        '<input name="away-penalties" type="number" min="0" max="99" step="1" inputmode="numeric" placeholder="Opcional">' +
                    '</label>' +
                '</div>' +

                '<button type="submit">REGISTRAR RESULTADO</button>' +

            '</form>' +

            '<div class="coop-match__elo">' +
                'ELO por jogador: <strong>vencedor +' +
                (isFinal ? "8" : "6") +
                '</strong> · derrotado <strong>' +
                (isFinal ? "-4" : "-2") +
                '</strong>' +
            '</div>';
    } else {
        html +=
            '<div class="coop-match__winner">' +
                'VENCEDOR: ' + escapeHtml(pairTitle(winner)) +
                '<br><small>' + escapeHtml(pairMembers(winner)) + '</small>' +
            '</div>' +

            '<div class="coop-match__elo">' +
                'ELO aplicado por jogador: <strong>' +
                homeDelta + '</strong> / <strong>' + awayDelta + '</strong>' +
            '</div>';
    }

    html += '</article>';

    return html;
}

function renderCompetition() {
    const cup = state.currentCup;

    if (!cup) {
        if (dom.editionStatus) dom.editionStatus.textContent = "AGUARDANDO";
        if (dom.currentEdition) dom.currentEdition.textContent = "NENHUMA EDIÇÃO";

        if (dom.semifinals) {
            dom.semifinals.innerHTML =
                '<div class="ccfv-empty">Cadastre quatro duplas e realize o sorteio para abrir a competição.</div>';
        }

        if (dom.final) {
            dom.final.innerHTML =
                '<div class="ccfv-empty">A final será criada automaticamente após as duas semifinais.</div>';
        }

        if (dom.podium) dom.podium.hidden = true;
        if (dom.create) dom.create.disabled = true;

        return;
    }

    if (dom.editionName && !dom.editionName.value) {
        dom.editionName.value = cup.name || "";
    }

    if (dom.editionStatus) dom.editionStatus.textContent = cup.status;
    if (dom.currentEdition) dom.currentEdition.textContent = cup.name || "NIGHT CUP CO-OP";

    const semifinals = state.matches.filter(function (match) {
        return match.stage === "SEMIFINAL";
    });

    const finalMatch = state.matches.find(function (match) {
        return match.stage === "FINAL";
    });

    if (dom.semifinals) {
        dom.semifinals.innerHTML = semifinals.length
            ? semifinals.map(renderMatch).join("")
            : '<div class="ccfv-empty">As semifinais ainda não foram sorteadas.</div>';
    }

    if (dom.final) {
        dom.final.innerHTML = finalMatch
            ? renderMatch(finalMatch)
            : '<div class="ccfv-empty">A final será criada após as duas semifinais.</div>';
    }

    if (dom.podium) {
        const champion = pairById(cup.champion_pair_id);
        const runnerUp = pairById(cup.runner_up_pair_id);

        dom.podium.hidden = !(
            cup.status === "FINISHED" && champion && runnerUp
        );

        if (!dom.podium.hidden) {
            dom.podium.innerHTML =
                '<div class="coop-podium__item">' +
                    '<small>CAMPEÕES · +14 ELO CADA</small>' +
                    '<strong>' + escapeHtml(pairTitle(champion)) + '</strong>' +
                    '<span>' + escapeHtml(pairMembers(champion)) + '</span>' +
                '</div>' +

                '<div class="coop-podium__item">' +
                    '<small>VICE-CAMPEÕES · +2 ELO CADA</small>' +
                    '<strong>' + escapeHtml(pairTitle(runnerUp)) + '</strong>' +
                    '<span>' + escapeHtml(pairMembers(runnerUp)) + '</span>' +
                '</div>';
        }
    }

    const activeCup = cup.status !== "FINISHED";

    if (dom.create) {
        dom.create.disabled = activeCup || state.busy;
        dom.create.textContent = activeCup
            ? "EDIÇÃO EM ANDAMENTO"
            : "SORTEAR NOVA EDIÇÃO";
    }

    if (dom.pairForm) {
        dom.pairForm.querySelectorAll("select,input").forEach(function (input) {
            input.disabled = activeCup;
        });
    }

    if (dom.editionName) {
        dom.editionName.disabled = activeCup;
    }

    if (!activeCup) validatePairs();
}

async function createEdition() {
    if (state.busy || !validatePairs()) return;

    const button = dom.create;
    const payload = selectedPairs();
    const name = (dom.editionName.value || "").trim() || null;

    try {
        setBusy(true, button, "SORTEANDO DUPLAS...");
        notify("Validando os oito jogadores e sorteando as semifinais...", false);

        const client = await getClient();

        const result = await client.rpc("ccfv_night_cup_coop_create", {
            p_pairs: payload,
            p_name: name
        });

        if (result.error) throw result.error;

        const cupId = result.data;

        if (!cupId) {
            throw new Error("O banco não retornou o identificador da edição.");
        }

        notify("Sorteio concluído! As duas semifinais foram geradas.", false);

        await loadCups();
        await loadCup(cupId);

    } catch (error) {
        console.error("CCFV // NIGHT CUP CO-OP CREATE:", error);
        notify(error.message || "Não foi possível criar a edição.", true);
    } finally {
        setBusy(false, button, "SORTEAR E CRIAR CHAVE");
        validatePairs();
    }
}

async function registerResult(form) {
    if (state.busy) return;

    const matchId = form.dataset.matchId;

    const home = Number(form.elements["home-score"].value);
    const away = Number(form.elements["away-score"].value);

    const homePensRaw = form.elements["home-penalties"].value;
    const awayPensRaw = form.elements["away-penalties"].value;

    const homePens = homePensRaw === "" ? null : Number(homePensRaw);
    const awayPens = awayPensRaw === "" ? null : Number(awayPensRaw);

    if (!Number.isInteger(home) || !Number.isInteger(away) || home < 0 || away < 0) {
        notify("Informe um placar válido.", true);
        return;
    }

    if (home === away && (
        homePens === null ||
        awayPens === null ||
        homePens === awayPens
    )) {
        notify("Empate exige o placar dos pênaltis e um vencedor.", true);
        return;
    }

    if (home !== away && (
        homePens !== null || awayPens !== null
    )) {
        notify("Pênaltis só devem ser preenchidos quando o placar terminar empatado.", true);
        return;
    }

    const button = form.querySelector("button");

    try {
        setBusy(true, button, "SALVANDO...");

        const client = await getClient();

        const result = await client.rpc("ccfv_night_cup_coop_register_result", {
            p_match_id: matchId,
            p_home_score: home,
            p_away_score: away,
            p_home_penalties: homePens,
            p_away_penalties: awayPens
        });

        if (result.error) throw result.error;

        notify("Resultado salvo. ELO atualizado para os quatro jogadores.", false);

        await loadCups();

    } catch (error) {
        console.error("CCFV // NIGHT CUP CO-OP RESULT:", error);
        notify(error.message || "Erro ao registrar o resultado.", true);
    } finally {
        setBusy(false, button, "REGISTRAR RESULTADO");
    }
}

function bindEvents() {
    if (dom.create) {
        dom.create.addEventListener("click", createEdition);
    }

    if (dom.refresh) {
        dom.refresh.addEventListener("click", function () {
            loadPlayers()
                .then(loadCups)
                .catch(function (error) {
                    notify(error.message, true);
                });
        });
    }

    if (dom.history) {
        dom.history.addEventListener("click", function (event) {
            const button = event.target.closest("[data-cup-id]");

            if (!button) return;

            loadCup(button.dataset.cupId).catch(function (error) {
                notify(error.message, true);
            });
        });
    }

    document.addEventListener("submit", function (event) {
        const form = event.target.closest(".coop-score-form");

        if (!form) return;

        event.preventDefault();
        registerResult(form);
    });
}

async function init() {
    try {
        bindEvents();

        await getClient();
        await loadPlayers();
        await loadCups();

        notify("Painel Night Cup Co-Op conectado.", false);

    } catch (error) {
        console.error("CCFV // NIGHT CUP CO-OP INIT:", error);
        notify(error.message || "Não foi possível carregar o painel.", true);
    }
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
} else {
    init();
}

})();