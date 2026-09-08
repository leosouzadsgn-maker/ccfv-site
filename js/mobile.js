/* =========================================================
   PLAYER CARD
   MESMO MODELO DO PC / CONSOLE
   ========================================================= */

function cardHTML(player, pos) {

    const key =
        rankKey(
            player?.elo
        );

    const rank =
        ELOS.find(
            item =>
                item.key === key
        ) || ELOS[0];


    const photo =
        playerPhoto(
            player
        );


    const games =
        num(
            player?.matches_played ??
            player?.matches ??
            (
                num(player?.wins) +
                num(player?.draws) +
                num(player?.losses)
            )
        );


    const wins =
        num(
            player?.wins
        );


    const win =
        games
            ? Math.round(
                (
                    wins /
                    games
                ) * 100
            )
            : 0;


    const playerId =
        player?.player_id ||
        player?.id ||
        `mobile-${pos}`;


    const instagram =
        player?.instagram
            ? `@${String(
                player.instagram
            ).replace(
                /^@/,
                ""
            )}`
            : "@ccfv.oficial";


    const photoHTML =
        photo

            ? `
                <img
                    src="${esc(photo)}"
                    alt="${esc(
                        player?.name ||
                        "JOGADOR"
                    )}"
                    loading="lazy"
                    crossorigin="anonymous"
                >
            `

            : `
                <span
                    class="
                        ccfv-player-card-real__initials
                    "
                >
                    ${esc(
                        initials(
                            player?.name
                        )
                    )}
                </span>
            `;


    return `

        <div
            class="ccfv-player-card-item"
            data-player-id="${esc(
                playerId
            )}"
        >

            <article
                class="
                    ccfv-player-card-preview
                    ccfv-player-card-preview--${key}
                    ccfv-player-card-preview--animated
                    ccfv-player-card-real
                "

                data-card-player-id="${esc(
                    playerId
                )}"

                data-mobile-card-id="${esc(
                    playerId
                )}"
            >


                <!-- =========================================
                     EFEITOS
                     ========================================= -->

                <div
                    class="
                        ccfv-player-card-preview__holo
                    "
                ></div>


                <div
                    class="
                        ccfv-player-card-preview__noise
                    "
                ></div>


                <div
                    class="
                        ccfv-player-card-preview__energy
                    "
                ></div>


                <div
                    class="
                        ccfv-player-card-preview__grid
                    "
                ></div>


                <div
                    class="
                        ccfv-player-card-preview__corner
                        ccfv-player-card-preview__corner--tl
                    "
                ></div>


                <div
                    class="
                        ccfv-player-card-preview__corner
                        ccfv-player-card-preview__corner--tr
                    "
                ></div>


                <div
                    class="
                        ccfv-player-card-preview__corner
                        ccfv-player-card-preview__corner--bl
                    "
                ></div>


                <div
                    class="
                        ccfv-player-card-preview__corner
                        ccfv-player-card-preview__corner--br
                    "
                ></div>


                <!-- =========================================
                     TOPO
                     ========================================= -->

                <div
                    class="
                        ccfv-player-card-preview__top
                    "
                >

                    <div>

                        <span>
                            CCFV MOBILE
                        </span>

                        <strong>
                            #${String(
                                pos
                            ).padStart(
                                3,
                                "0"
                            )}
                        </strong>

                    </div>


                    <div
                        class="
                            ccfv-player-card-preview__mini-badge
                        "
                    >

                        ${renderBadge(
                            rank,
                            "small"
                        )}

                    </div>

                </div>


                <div
                    class="
                        ccfv-player-card-preview__scanline
                    "
                ></div>


                <!-- =========================================
                     FOTO
                     ========================================= -->

                <div
                    class="
                        ccfv-player-card-preview__photo
                    "
                >

                    <div
                        class="
                            ccfv-player-card-preview__photo-frame
                            ccfv-player-card-real__photo-frame
                        "
                    >

                        ${photoHTML}

                    </div>

                </div>


                <!-- =========================================
                     INSÍGNIA
                     ========================================= -->

                <div
                    class="
                        ccfv-player-card-preview__badge-floating
                    "
                >

                    ${renderBadge(
                        rank,
                        "medium"
                    )}

                </div>


                <!-- =========================================
                     IDENTIDADE
                     ========================================= -->

                <div
                    class="
                        ccfv-player-card-preview__identity
                    "
                >

                    <span>
                        ${esc(
                            rank.name
                        )}
                    </span>


                    <strong>
                        ${esc(
                            player?.name ||
                            "JOGADOR"
                        )}
                    </strong>


                    <small>
                        ${esc(
                            instagram
                        )}
                    </small>

                </div>


                <!-- =========================================
                     MÉTRICAS
                     ========================================= -->

                <div
                    class="
                        ccfv-player-card-preview__metrics
                    "
                >

                    <div>

                        <span>
                            ELO
                        </span>

                        <strong>
                            ${num(
                                player?.elo
                            )}
                        </strong>

                    </div>


                    <div>

                        <span>
                            POS
                        </span>

                        <strong>
                            #${String(
                                pos
                            ).padStart(
                                2,
                                "0"
                            )}
                        </strong>

                    </div>


                    <div>

                        <span>
                            WIN
                        </span>

                        <strong>
                            ${String(
                                win
                            ).padStart(
                                2,
                                "0"
                            )}%
                        </strong>

                    </div>

                </div>


                <!-- =========================================
                     RODAPÉ
                     ========================================= -->

                <div
                    class="
                        ccfv-player-card-preview__footer
                    "
                >

                    <span>
                        @ccfv.oficial
                    </span>

                    <strong>
                        ${esc(
                            rank.name
                        )}
                    </strong>

                </div>


                <!-- =========================================
                     PARTÍCULAS
                     ========================================= -->

                <div
                    class="
                        ccfv-player-card-preview__particles
                    "
                >

                    <i></i>
                    <i></i>
                    <i></i>
                    <i></i>
                    <i></i>
                    <i></i>
                    <i></i>
                    <i></i>

                </div>

            </article>


            <!-- =============================================
                 DOWNLOAD
                 MESMO PADRÃO DO PC / CONSOLE
                 ============================================= -->

            <button
                type="button"

                class="
                    ccfv-player-card-download
                "

                data-download-card="${esc(
                    playerId
                )}"

                data-mobile-download-card="${esc(
                    playerId
                )}"
            >

                <span>
                    BAIXAR CARD
                </span>

                <span>
                    ↓
                </span>

            </button>

        </div>

    `;
}



/* =========================================================
   MOVIMENTO DOS CARDS
   ========================================================= */

function bindCardMotion(
    root = document
) {

    root
        .querySelectorAll(
            ".ccfv-player-card-preview--animated"
        )
        .forEach(
            card => {

                if (
                    card.dataset.motionBound ===
                    "true"
                ) {
                    return;
                }


                card.dataset.motionBound =
                    "true";


                card.addEventListener(
                    "pointermove",
                    event => {

                        const rect =
                            card.getBoundingClientRect();


                        if (
                            !rect.width ||
                            !rect.height
                        ) {
                            return;
                        }


                        const x =
                            (
                                event.clientX -
                                rect.left
                            ) /
                            rect.width;


                        const y =
                            (
                                event.clientY -
                                rect.top
                            ) /
                            rect.height;


                        card.style.setProperty(
                            "--mouse-x",
                            `${x * 100}%`
                        );


                        card.style.setProperty(
                            "--mouse-y",
                            `${y * 100}%`
                        );


                        card.style.setProperty(
                            "--rotate-x",
                            `${(
                                0.5 - y
                            ) * 12}deg`
                        );


                        card.style.setProperty(
                            "--rotate-y",
                            `${(
                                x - 0.5
                            ) * 14}deg`
                        );

                    }
                );


                card.addEventListener(
                    "pointerleave",
                    () => {

                        card.style.setProperty(
                            "--rotate-x",
                            "0deg"
                        );


                        card.style.setProperty(
                            "--rotate-y",
                            "0deg"
                        );


                        card.style.setProperty(
                            "--mouse-x",
                            "50%"
                        );


                        card.style.setProperty(
                            "--mouse-y",
                            "50%"
                        );

                    }
                );

            }
        );

}



/* =========================================================
   DOWNLOAD CARD
   MESMA MECÂNICA DO PC / CONSOLE
   ========================================================= */

async function downloadMobileCard(
    button
) {

    const playerId =
        button?.dataset?.downloadCard ||
        button?.dataset?.mobileDownloadCard;


    if (!playerId) {

        console.error(
            "CCFV // ID DO JOGADOR NÃO ENCONTRADO."
        );

        return;
    }


    const selector =
        `[data-card-player-id="${CSS.escape(
            String(playerId)
        )}"]`;


    const card =
        document.querySelector(
            selector
        );


    if (!card) {

        console.error(
            "CCFV // CARD NÃO ENCONTRADO:",
            playerId
        );

        alert(
            "Não foi possível encontrar o card deste jogador."
        );

        return;
    }


    const exporter =
        window.htmlToImage;


    const legacyExporter =
        window.html2canvas;


    if (
        !exporter?.toPng &&
        typeof legacyExporter !==
            "function"
    ) {

        alert(
            "O gerador do card ainda está carregando. Aguarde alguns segundos e tente novamente."
        );

        return;
    }


    const original =
        button.innerHTML;


    button.disabled =
        true;


    button.innerHTML =
        `
        <span>
            GERANDO...
        </span>
        `;


    try {

        await document.fonts.ready;


        /*
         * Garante que as imagens terminaram
         * de carregar antes de gerar o PNG.
         */

        const images =
            Array.from(
                card.querySelectorAll(
                    "img"
                )
            );


        await Promise.all(
            images.map(
                image =>
                    new Promise(
                        resolve => {

                            if (
                                image.complete
                            ) {

                                resolve();
                                return;

                            }


                            image.addEventListener(
                                "load",
                                resolve,
                                {
                                    once: true
                                }
                            );


                            image.addEventListener(
                                "error",
                                resolve,
                                {
                                    once: true
                                }
                            );

                        }
                    )
            )
        );


        const options = {

            cacheBust: true,

            pixelRatio: 3,

            backgroundColor:
                "transparent",

            skipFonts: false,

            style: {

                transform:
                    "none",

                margin:
                    "0"

            },

            filter: node => {

                if (
                    !(node instanceof Element)
                ) {

                    return true;

                }


                return !node.matches(
                    ".ccfv-player-card-download"
                );

            }

        };


        let dataUrl =
            "";


        /*
         * PRIMEIRA OPÇÃO:
         * html-to-image
         */

        if (
            exporter &&
            typeof exporter.toPng ===
                "function"
        ) {

            dataUrl =
                await exporter.toPng(
                    card,
                    options
                );

        }


        /*
         * FALLBACK:
         * html2canvas
         */

        else if (
            typeof legacyExporter ===
                "function"
        ) {

            const canvas =
                await legacyExporter(
                    card,
                    {

                        backgroundColor:
                            null,

                        scale:
                            3,

                        useCORS:
                            true,

                        allowTaint:
                            false,

                        imageTimeout:
                            20000,

                        logging:
                            false

                    }
                );


            dataUrl =
                canvas.toDataURL(
                    "image/png"
                );

        }


        if (
            !dataUrl ||
            !dataUrl.startsWith(
                "data:image/png"
            )
        ) {

            throw new Error(
                "PNG inválido."
            );

        }


        /*
         * LOCALIZA O JOGADOR PELO ID
         */

        const player =
            ranking.find(
                item =>
                    String(
                        item?.player_id ||
                        item?.id
                    ) ===
                    String(
                        playerId
                    )
            );


        const safe =
            String(
                player?.name ||
                "jogador"
            )
                .normalize(
                    "NFD"
                )
                .replace(
                    /[\u0300-\u036f]/g,
                    ""
                )
                .replace(
                    /[^a-zA-Z0-9]+/g,
                    "-"
                )
                .replace(
                    /^-+|-+$/g,
                    ""
                )
                .toLowerCase();


        /*
         * DOWNLOAD
         */

        const anchor =
            document.createElement(
                "a"
            );


        anchor.download =
            `ccfv-mobile-card-${
                safe ||
                "jogador"
            }.png`;


        anchor.href =
            dataUrl;


        anchor.style.display =
            "none";


        document.body.appendChild(
            anchor
        );


        anchor.click();


        anchor.remove();

    }


    catch (
        error
    ) {

        console.error(
            "CCFV // ERRO AO GERAR CARD:",
            error
        );


        alert(
            "Não foi possível gerar o card. Se o erro mencionar CORS, a foto precisa permitir acesso público para geração da imagem."
        );

    }


    finally {

        button.disabled =
            false;


        button.innerHTML =
            original;

    }

}



/* =========================================================
   VINCULA DOWNLOADS
   ========================================================= */

function bindDownloads(
    root = document
) {

    root
        .querySelectorAll(
            "[data-download-card]"
        )
        .forEach(
            button => {

                if (
                    button.dataset.bound ===
                    "true"
                ) {

                    return;

                }


                button.dataset.bound =
                    "true";


                button.addEventListener(
                    "click",
                    () =>
                        downloadMobileCard(
                            button
                        )
                );

            }
        );

}