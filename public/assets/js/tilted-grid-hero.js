/**
 * TiltedGridHero - 3D Curved Cylindrical Photo Carousel
 * Supports Full-Width Showcase Hero Mode and Compact Footer Widget Mode
 */
(function () {
  "use strict";

  const SLICES = 16;
  const CAMERA = 1.6;
  const MAX_WIDTH = 55;

  function arc(bend) {
    return (CAMERA - 1 + Math.cos(bend)) / (2 * CAMERA * Math.sin(bend));
  }

  function measure(width, height, tileHeight, aspectRatio, gap, bend) {
    const h = Math.min(
      (tileHeight / 100) * height,
      ((MAX_WIDTH / 100) * width) / aspectRatio
    );
    const radius = width * arc(bend);
    if (!(h > 0) || !(radius > 0)) {
      return { columns: 2, sweep: 0, unit: 0, limit: 0, radius: 100, h: 50 };
    }
    const deg = (rad) => (rad * 180) / Math.PI;
    const unit = deg(h / radius);
    const pitch = (aspectRatio + gap / 100) * unit;
    const limit = deg(bend) + (aspectRatio * unit) / 2;
    const columns = Math.min(60, Math.max(2, Math.ceil((2 * limit) / pitch)));
    const round = (n) => +n.toFixed(4);
    const sweep = round((columns * pitch) / 2);
    return {
      columns,
      sweep,
      unit: round(unit),
      limit: round(Math.min(sweep, limit)),
      radius: round(radius),
      h: round(h),
    };
  }

  const DEFAULT_IMAGES = [
    { src: "assets/images/gallery1.webp", alt: "NIT Rourkela Insignia - Central Heritage Plaza" },
    { src: "assets/images/gallery2.webp", alt: "NIT Rourkela Main Entrance Arch Gateway" },
    { src: "assets/images/gallery3.webp", alt: "Departmental Complex and Academic Quadrangle" },
    { src: "assets/images/gallery4.webp", alt: "Tree-lined campus road with morning mist" },
    { src: "assets/images/gallery5.webp", alt: "Student residences bordering the campus lake" },
    { src: "assets/images/gallery6.webp", alt: "Bhubaneswar Behera Auditorium (BBA) hall" },
    { src: "assets/images/gallery7.webp", alt: "Lecture Hall Complex & Academic Precinct" },
    { src: "assets/images/gallery8.webp", alt: "Tropical flora and academic buildings" },
    { src: "assets/images/gallery9.webp", alt: "Golden Jubilee Technology Precinct" },
  ];

  function initTiltedGridHero(container, customOptions = {}) {
    if (!container) return;

    const isFullMode = container.classList.contains("full-hero-mode");
    const tileHeight = parseFloat(container.dataset.tileHeight) || (isFullMode ? 32 : 55);
    const curve = parseFloat(container.dataset.curve) || 78;
    let speed = parseFloat(container.dataset.speed) || 4; // seconds per tile
    const aspectRatio = parseFloat(container.dataset.aspectRatio) || (16 / 9);
    const gap = parseFloat(container.dataset.gap) || 6;
    const axis = parseFloat(container.dataset.axis) || 56;
    const fade = parseFloat(container.dataset.fade) || 12;

    const images = customOptions.images || DEFAULT_IMAGES;
    const id = "tgh-" + Math.random().toString(36).substring(2, 9);
    const orbit = "tgh-o-" + id;
    const tileClass = "tgh-t-" + id;
    const bend = (Math.min(85, Math.max(5, curve)) * Math.PI) / 180;

    // Preload images
    images.forEach((img) => {
      const i = new Image();
      i.src = img.src;
    });

    const styleEl = document.createElement("style");
    container.appendChild(styleEl);

    const viewport = document.createElement("div");
    viewport.className = "tgh-band-viewport";
    viewport.setAttribute("aria-hidden", "true");
    container.appendChild(viewport);

    let shown = {};
    let isPaused = false;
    let currentDuration = 20;

    function renderBand() {
      const width = container.clientWidth || (isFullMode ? 1200 : 337);
      const height = container.clientHeight || (isFullMode ? 560 : 220);

      const layout = measure(width, height, tileHeight, aspectRatio, gap, bend);
      const { columns, sweep, unit, limit, radius } = layout;

      const u = (n) =>
        `calc(${+n.toFixed(4)} * min(${tileHeight}cqh, ${+(
          MAX_WIDTH / aspectRatio
        ).toFixed(4)}cqw))`;

      const r = 100 * arc(bend);
      const radiusCqw = `${+r.toFixed(3)}cqw`;

      const turn = (deg) =>
        `translateZ(${radiusCqw}) rotateY(${+deg.toFixed(4)}deg) translateZ(-${radiusCqw})`;

      const hide = +(((sweep - limit) / (2 * sweep || 1)) * 100).toFixed(4);
      currentDuration = columns * speed;
      const mask = `linear-gradient(90deg, transparent, #000 ${fade}%, #000 ${
        100 - fade
      }%, transparent)`;

      styleEl.textContent = `
        @keyframes ${orbit} {
          from { transform: ${turn(-sweep)}; }
          to { transform: ${turn(sweep)}; }
          0%, ${hide}%, ${100 - hide}%, 100% { visibility: hidden; }
          ${hide + 0.001}%, ${100 - hide - 0.001}% { visibility: visible; }
        }
        @media (prefers-reduced-motion: reduce) {
          .${tileClass} { animation-play-state: paused !important; }
        }
      `;

      viewport.style.opacity = "1";
      viewport.style.perspective = `${+(r * CAMERA).toFixed(3)}cqw`;
      viewport.style.perspectiveOrigin = `50% ${axis}%`;
      viewport.style.maskImage = mask;
      viewport.style.webkitMaskImage = mask;

      viewport.innerHTML = "";
      const share = aspectRatio / SLICES;

      for (let t = 0; t < columns; t++) {
        const first = columns - 1 - t;
        const currentIdx = (shown[t] !== undefined ? shown[t] : first) % images.length;
        const imgData = images[currentIdx < 0 ? currentIdx + images.length : currentIdx];

        const tileEl = document.createElement("div");
        tileEl.className = `${tileClass} tgh-tile`;
        tileEl.setAttribute("data-tile-index", t);
        tileEl.setAttribute("title", imgData.alt || "NIT Rourkela Photo");
        tileEl.style.left = `calc(50% - ${u(aspectRatio / 2)})`;
        tileEl.style.top = `calc(${axis}% - ${u(0.5)})`;
        tileEl.style.width = u(aspectRatio);
        tileEl.style.height = u(1);
        tileEl.style.transformStyle = "preserve-3d";
        tileEl.style.animation = `${orbit} ${currentDuration}s linear ${-t * speed}s infinite`;

        if (isPaused) {
          tileEl.style.animationPlayState = "paused";
        }

        // On iteration, wrap and swap to next image
        tileEl.addEventListener("animationiteration", (e) => {
          const lap = Math.round(e.elapsedTime / currentDuration);
          const next = lap * columns + first;
          shown[t] = next;
          const nextImg = images[((next % images.length) + images.length) % images.length];
          const imgElements = tileEl.querySelectorAll("img");
          imgElements.forEach((im) => {
            im.src = nextImg.src;
            im.alt = nextImg.alt;
          });
        });

        // Click handler to open fancybox / preview
        tileEl.addEventListener("click", () => {
          const activeSrc = tileEl.querySelector("img")?.src || imgData.src;
          if (window.jQuery && window.jQuery.fancybox) {
            window.jQuery.fancybox.open({
              src: activeSrc,
              type: "image",
              opts: { caption: imgData.alt }
            });
          } else {
            window.open(activeSrc, "_blank");
          }
        });

        // Create 16 vertical strips per tile
        for (let k = 0; k < SLICES; k++) {
          const slice = document.createElement("div");
          slice.className = "tgh-slice";
          if (k === 0) slice.classList.add("first-slice");
          if (k === SLICES - 1) slice.classList.add("last-slice");

          slice.style.left = u((aspectRatio - share) / 2);
          slice.style.width = k === SLICES - 1 ? u(share) : `calc(${u(share)} + 1px)`;
          slice.style.height = u(1);
          slice.style.transform = turn((aspectRatio / 2 - (k + 0.5) * share) * unit);

          const img = document.createElement("img");
          img.src = imgData.src;
          img.alt = k === 0 ? (imgData.alt || "") : "";
          img.draggable = false;
          img.style.left = u(-k * share);
          img.style.width = u(aspectRatio);
          img.style.height = u(1);

          slice.appendChild(img);
          tileEl.appendChild(slice);
        }

        viewport.appendChild(tileEl);
      }
    }

    renderBand();

    const ro = new ResizeObserver(() => {
      renderBand();
    });
    ro.observe(container);

    // Full Mode Toggle Play/Pause
    const fullToggle = document.getElementById("tgh-full-toggle");
    if (fullToggle && isFullMode) {
      fullToggle.addEventListener("click", () => {
        isPaused = !isPaused;
        container.classList.toggle("is-paused", isPaused);
        const icon = fullToggle.querySelector("i");
        const span = fullToggle.querySelector("span");
        if (icon) icon.className = isPaused ? "fa-solid fa-play" : "fa-solid fa-pause";
        if (span) span.textContent = isPaused ? "Play" : "Pause";
        fullToggle.setAttribute("aria-label", isPaused ? "Resume orbit" : "Pause orbit");
      });
    }

    // Speed selector buttons in Full Mode
    if (isFullMode) {
      const speedButtons = container.querySelectorAll(".speed-btn");
      speedButtons.forEach((btn) => {
        btn.addEventListener("click", () => {
          speedButtons.forEach((b) => b.classList.remove("active"));
          btn.classList.add("active");
          speed = parseFloat(btn.dataset.speed) || 4;
          renderBand();
        });
      });
    }

    // Footer Mode Toggle Play/Pause
    const footerPause = document.getElementById("tgh-footer-pause");
    if (footerPause && !isFullMode) {
      footerPause.addEventListener("click", () => {
        isPaused = !isPaused;
        container.classList.toggle("is-paused", isPaused);
        const icon = footerPause.querySelector("i");
        if (icon) icon.className = isPaused ? "fa-solid fa-play" : "fa-solid fa-pause";
        footerPause.setAttribute("aria-label", isPaused ? "Play orbit animation" : "Pause orbit animation");
      });
    }
  }

  // Initialize both full hero and footer widgets on DOM load
  function initAll() {
    const fullContainer = document.getElementById("full-tilted-hero");
    if (fullContainer) initTiltedGridHero(fullContainer);

    const footerContainer = document.getElementById("footer-tilted-hero");
    if (footerContainer) initTiltedGridHero(footerContainer);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAll);
  } else {
    initAll();
  }

  window.initTiltedGridHero = initTiltedGridHero;
})();
