/* =========================================================
   CCFV — HERO EXPERIENCE ENGINE 2.0
   ========================================================= */

(() => {
    "use strict";

    const hero =
        document.querySelector(".ccfv-hero");

    if (!hero) {
        return;
    }


    /* =====================================================
       CONFIG
       ===================================================== */

    const CONFIG = {
        strength: 10,
        ease: 0.055,
        mobileBreakpoint: 900
    };


    const reducedMotion =
        window.matchMedia(
            "(prefers-reduced-motion: reduce)"
        ).matches;


    /* =====================================================
       CURSOR
       ===================================================== */

    let targetX = 0;
    let targetY = 0;

    let currentX = 0;
    let currentY = 0;

    let cursorVisible = false;

    let animationFrame = null;


    /* =====================================================
       CURSOR POSITION
       ===================================================== */

    const handlePointerMove = (event) => {

        if (
            window.innerWidth <=
            CONFIG.mobileBreakpoint
        ) {
            return;
        }


        const rect =
            hero.getBoundingClientRect();


        const x =
            event.clientX -
            rect.left;


        const y =
            event.clientY -
            rect.top;


        const normalizedX =
            (x / rect.width) * 2 - 1;


        const normalizedY =
            (y / rect.height) * 2 - 1;


        targetX =
            Math.max(
                -1,
                Math.min(
                    1,
                    normalizedX
                )
            );


        targetY =
            Math.max(
                -1,
                Math.min(
                    1,
                    normalizedY
                )
            );


        hero.style.setProperty(
            "--cursor-x",
            `${x}px`
        );


        hero.style.setProperty(
            "--cursor-y",
            `${y}px`
        );


        if (!cursorVisible) {

            cursorVisible = true;

            hero.style.setProperty(
                "--cursor-opacity",
                "1"
            );
        }
    };


    /* =====================================================
       POINTER LEAVE
       ===================================================== */

    const handlePointerLeave = () => {

        targetX = 0;
        targetY = 0;

        cursorVisible = false;

        hero.style.setProperty(
            "--cursor-opacity",
            "0"
        );
    };


    /* =====================================================
       PARALLAX LOOP
       ===================================================== */

    const animate = () => {

        currentX +=
            (targetX - currentX) *
            CONFIG.ease;


        currentY +=
            (targetY - currentY) *
            CONFIG.ease;


        const moveX =
            currentX *
            CONFIG.strength;


        const moveY =
            currentY *
            CONFIG.strength;


        hero.style.setProperty(
            "--hero-move-x",
            `${moveX}px`
        );


        hero.style.setProperty(
            "--hero-move-y",
            `${moveY}px`
        );


        animationFrame =
            requestAnimationFrame(
                animate
            );
    };


    /* =====================================================
       PARTICLES
       ===================================================== */

    const particles =
        hero.querySelectorAll(
            ".ccfv-particle"
        );


    const updateParticles =
        () => {

            if (
                window.innerWidth <=
                CONFIG.mobileBreakpoint
            ) {
                return;
            }


            particles.forEach(
                (particle, index) => {

                    const factor =
                        2 +
                        (index % 4);


                    const x =
                        currentX *
                        factor;


                    const y =
                        currentY *
                        factor;


                    particle.style.transform =
                        `translate3d(${x}px, ${y}px, 0)`;
                }
            );
        };


    /* =====================================================
       MOUSE MOVE THROTTLING
       ===================================================== */

    let particleFrame = null;


    const handleParticleMove = () => {

        if (particleFrame) {
            return;
        }


        particleFrame =
            requestAnimationFrame(
                () => {

                    updateParticles();

                    particleFrame = null;

                }
            );
    };


    /* =====================================================
       VISIBILITY
       ===================================================== */

    document.addEventListener(
        "visibilitychange",
        () => {

            if (
                document.hidden &&
                animationFrame
            ) {

                cancelAnimationFrame(
                    animationFrame
                );

                animationFrame = null;

                return;
            }


            if (
                !document.hidden &&
                !animationFrame &&
                !reducedMotion
            ) {

                animate();
            }

        }
    );


    /* =====================================================
       EVENTS
       ===================================================== */

    hero.addEventListener(
        "pointermove",
        handlePointerMove,
        {
            passive: true
        }
    );


    hero.addEventListener(
        "pointermove",
        handleParticleMove,
        {
            passive: true
        }
    );


    hero.addEventListener(
        "pointerleave",
        handlePointerLeave,
        {
            passive: true
        }
    );


    /* =====================================================
       INITIAL STATE
       ===================================================== */

    hero.style.setProperty(
        "--cursor-opacity",
        "0"
    );


    /* =====================================================
       START
       ===================================================== */

    if (!reducedMotion) {
        animate();
    }

})();