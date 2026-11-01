(function () {
"use strict";

const state = {
    client: null,
    cup: null,
    pairs: [],
    matches: [],
    players: []
};

const $ = function (selector) {
    return document.querySelector(selector);
};

function escapeHtml(value) {
    return String(value == null ? "" : value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

async function getClient() {
    if (state.client) return state.client;

    if (!window.CCFVAuth || typeof window.CCFVAuth.getClient !== "function") {
        throw new Error("Sistema de conexão indisponível.");
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

function getPair(id) {
    return state.pairs.find(function (pair) {
        return String(pair.id) === String(id);
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

function matchHtml(match) {
    const home = getPair(match.home_pair_id);
    const away = getPair(match.away_pair_id);

    const isFinal = match.stage === "FINAL";
    const finished = match.status === "FINAL";

    const stage = isFinal
        ? "GRANDE FINAL"
        : ("SEMIFINAL " + String(match.match_number).padStart(2, "0"));

    const homeScore = match.home_score == null ? "—" : match.home_score;
    const awayScore = match.away_score == null ? "—" : match.away_score;

    const winner = getPair(match.winner_pair_id);

    const homeDelta = isFinal
        ? (match.winner_pair_id === match.home_pair_id ? "+8" : "-4")
        : (match.winner_pair_id === match.home_pair_id ? "+6" : "-2");

    const awayDelta = isFinal
        ? (match.winner_pair_id === match.away_pair_id ? "+8" : "-4")
        : (match.winner_pair_id === match.away_pair_id ? "+6" : "-2");

    let html =
        '<article class="coop-public-match">' +

            '<div class="coop-public-match__top">' +
                '<span>' + stage + '</span>' +
                '<span>' + (finished ? "FINALIZADA" : "AGUARDANDO") + '</span>' +
            '</div>' +

            '<div class="coop-public-match__teams">' +

                '<div class="coop-public-pair">' +
                    '<strong>' + escapeHtml(pairTitle(home)) + '</strong>' +
                    '<small>' + escapeHtml(pairMembers(home)) + '</small>' +
                '</div>' +

                '<div class="coop-public-score">' +
                    escapeHtml(homeScore) + ' × ' + escapeHtml(awayScore) +
                '</div>' +

                '<div class="coop-public-pair">' +
                    '<strong>' + escapeHtml(pairTitle(away)) + '</strong>' +
                    '<small>' + escapeHtml(pairMembers(away)) + '</small>' +
                '</div>' +

            '</div>';

    if (finished) {
        const penalties = match.home_penalties != null
            ? '<small>Pênaltis: ' +
                escapeHtml(match.home_penalties) + ' × ' +
                escapeHtml(match.away_penalties) +
              '</small>'
            : "";

        html +=
            '<div class="coop-public-match__result">' +
                'VENCEDOR: ' + escapeHtml(pairTitle(winner)) +
                '<small>' + escapeHtml(pairMembers(winner)) + '</small>' +
                penalties +
            '</div>' +

            '<div class="coop-public-match__elo">' +
                'ELO por jogador: <strong>' +
                homeDelta + '</strong> / <strong>' + awayDelta + '</strong>' +
            '</div>';
    } else {
        html +=
            '<div class="coop-public-empty">Resultado ainda não registrado.</div>';
    }

    html += '</article>';

    return html;
}

function render() {
    const cup = state.cup;

    if (!cup) {
        $("#coop-public-status").textContent = "SEM EDIÇÃO";
        $("#coop-public-edition").textContent = "NIGHT CUP CO-OP";
        $("#coop-public-edition-message").textContent =
            "A primeira edição oficial será divulgada em breve.";

        $("#coop-public-semifinals").innerHTML =
            '<div class="coop-public-empty">As semifinais aparecerão aqui após o sorteio oficial.</div>';

        $("#coop-public-final").innerHTML =
            '<div class="coop-public-empty">Aguardando os dois finalistas.</div>';

        $("#coop-public-podium").innerHTML =
            '<div class="coop-public-empty">O primeiro campeão da Night Cup Co-Op ainda será definido.</div>';

        return;
    }

    $("#coop-public-edition").textContent = cup.name || "NIGHT CUP CO-OP";
    $("#coop-public-status").textContent = cup.status === "FINISHED"
        ? "EDIÇÃO CONCLUÍDA"
        : "EM ANDAMENTO";

    $("#coop-public-edition-message").textContent =
        cup.status === "FINISHED"
            ? "Esta edição foi concluída. Confira os campeões e resultados."
            : "Acompanhe as semifinais e a classificação para a grande final.";

    const semifinals = state.matches.filter(function (match) {
        return match.stage === "SEMIFINAL";
    });

    const finalMatch = state.matches.find(function (match) {
        return match.stage === "FINAL";
    });

    $("#coop-public-semifinals").innerHTML = semifinals.length
        ? semifinals.map(matchHtml).join("")
        : '<div class="coop-public-empty">As semifinais ainda não foram sorteadas.</div>';

    $("#coop-public-final").innerHTML = finalMatch
        ? matchHtml(finalMatch)
        : '<div class="coop-public-empty">A final será criada automaticamente após as duas semifinais.</div>';

    const champion = getPair(cup.champion_pair_id);
    const runnerUp = getPair(cup.runner_up_pair_id);

    if (cup.status === "FINISHED" && champion && runnerUp) {
        $("#coop-public-podium").innerHTML =
            '<article class="coop-public-podium-card">' +
                '<small>CAMPEÕES DA EDIÇÃO</small>' +
                '<h3>' + escapeHtml(pairTitle(champion)) + '</h3>' +
                '<p>' + escapeHtml(pairMembers(champion)) + '</p>' +
                '<strong>+14 ELO PARA CADA JOGADOR</strong>' +
            '</article>' +

            '<article class="coop-public-podium-card">' +
                '<small>VICE-CAMPEÕES</small>' +
                '<h3>' + escapeHtml(pairTitle(runnerUp)) + '</h3>' +
                '<p>' + escapeHtml(pairMembers(runnerUp)) + '</p>' +
                '<strong>+2 ELO PARA CADA JOGADOR</strong>' +
            '</article>';
    } else {
        $("#coop-public-podium").innerHTML =
            '<div class="coop-public-empty">O campeão será conhecido após a grande final.</div>';
    }
}

async function loadCompetition() {
    const client = await getClient();

    const cupResponse = await client
        .from("night_cup_coop")
        .select("*")
        .order("edition_number", { ascending: false })
        .limit(1);

    if (cupResponse.error) throw cupResponse.error;

    state.cup = (cupResponse.data || [])[0] || null;

    if (!state.cup) {
        state.pairs = [];
        state.matches = [];
        state.players = [];
        render();
        return;
    }

    const pairResponse = await client
        .from("night_cup_coop_pairs")
        .select("*")
        .eq("cup_id", state.cup.id)
        .order("pair_number");

    if (pairResponse.error) throw pairResponse.error;

    state.pairs = pairResponse.data || [];

    const matchResponse = await client
        .from("night_cup_coop_matches")
        .select("*")
        .eq("cup_id", state.cup.id)
        .order("stage")
        .order("match_number");

    if (matchResponse.error) throw matchResponse.error;

    state.matches = matchResponse.data || [];

    const playerIds = [];

    state.pairs.forEach(function (pair) {
        playerIds.push(pair.player_one_id, pair.player_two_id);
    });

    const uniqueIds = Array.from(new Set(playerIds.filter(Boolean)));

    if (uniqueIds.length) {
        const playersResponse = await client
            .from("players")
            .select("id,name")
            .in("id", uniqueIds);

        if (playersResponse.error) throw playersResponse.error;

        state.players = playersResponse.data || [];
    } else {
        state.players = [];
    }

    render();
}

async function init() {
    try {
        await loadCompetition();
    } catch (error) {
        console.error("CCFV // NIGHT CUP CO-OP PUBLIC:", error);

        $("#coop-public-status").textContent = "INDISPONÍVEL";
        $("#coop-public-edition-message").textContent =
            "Não foi possível carregar a competição. Atualize a página.";
    }
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
} else {
    init();
}

})();