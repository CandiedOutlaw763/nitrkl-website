/**
 * 3D Parallax & Physics Tilt Engine for About & Director Cards
 * Provides buttery-smooth 60fps/120fps cursor tracking, dynamic specular glare, and layered Z-depth
 */
(function () {
  "use strict";

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduceMotion) return;

  function init3DCard(card) {
    let bounds = null;
    let mouseX = 0;
    let mouseY = 0;
    let currentRotateX = 0;
    let currentRotateY = 0;
    let targetRotateX = 0;
    let targetRotateY = 0;
    let rafId = null;
    let isHovered = false;

    const maxTilt = 8.5; // Maximum tilt degrees

    function updateBounds() {
      bounds = card.getBoundingClientRect();
    }

    function onMouseEnter() {
      updateBounds();
      isHovered = true;
      card.style.transition = "transform 0.1s ease-out, box-shadow 0.3s ease";
      if (!rafId) {
        rafId = requestAnimationFrame(animate);
      }
    }

    function onMouseMove(e) {
      if (!bounds) updateBounds();
      mouseX = e.clientX - bounds.left;
      mouseY = e.clientY - bounds.top;

      // Normalize coordinates (-1 to 1)
      const normX = (mouseX / bounds.width) * 2 - 1;
      const normY = (mouseY / bounds.height) * 2 - 1;

      targetRotateY = normX * maxTilt;
      targetRotateX = -normY * maxTilt;

      // Update glare position
      const glareX = (mouseX / bounds.width) * 100;
      const glareY = (mouseY / bounds.height) * 100;
      card.style.setProperty("--mouse-x", `${glareX}%`);
      card.style.setProperty("--mouse-y", `${glareY}%`);
    }

    function onMouseLeave() {
      isHovered = false;
      targetRotateX = 0;
      targetRotateY = 0;
      card.style.transition = "transform 0.6s cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 0.6s ease";
    }

    function animate() {
      // Linear interpolation (lerp) for smooth damping
      currentRotateX += (targetRotateX - currentRotateX) * 0.15;
      currentRotateY += (targetRotateY - currentRotateY) * 0.15;

      card.style.transform = `perspective(1200px) rotateX(${currentRotateX.toFixed(3)}deg) rotateY(${currentRotateY.toFixed(3)}deg) ${
        isHovered ? "scale3d(1.018, 1.018, 1.018)" : "scale3d(1, 1, 1)"
      }`;

      // Continue animating until settled
      if (
        isHovered ||
        Math.abs(targetRotateX - currentRotateX) > 0.01 ||
        Math.abs(targetRotateY - currentRotateY) > 0.01
      ) {
        rafId = requestAnimationFrame(animate);
      } else {
        rafId = null;
        card.style.transform = "perspective(1200px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)";
      }
    }

    card.addEventListener("mouseenter", onMouseEnter);
    card.addEventListener("mousemove", onMouseMove);
    card.addEventListener("mouseleave", onMouseLeave);

    window.addEventListener("resize", () => {
      bounds = null;
    });
  }

  function initAll3DCards() {
    const cards = document.querySelectorAll(".card-3d");
    cards.forEach(init3DCard);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAll3DCards);
  } else {
    initAll3DCards();
  }

  window.initAll3DCards = initAll3DCards;

  // Global card view switcher (21st.dev Demo vs NIT Rourkela Legacy)
  window.switchCardView = function(mode) {
    const gridDemo = document.getElementById("grid-demo-view");
    const gridInst = document.getElementById("grid-institute-view");
    const btnDemo = document.getElementById("btn-view-demo");
    const btnInst = document.getElementById("btn-view-institute");
    const kicker = document.getElementById("kicker-text");
    const title = document.getElementById("section-title-text");
    const subtitle = document.getElementById("section-subtitle-text");

    if (mode === "institute") {
      if (gridDemo) gridDemo.style.display = "none";
      if (gridInst) gridInst.style.display = "grid";
      if (btnDemo) btnDemo.classList.remove("active");
      if (btnInst) btnInst.classList.add("active");
      if (kicker) kicker.textContent = "Institute of National Importance • Estd. 1961";
      if (title) title.innerHTML = 'Legacy, Vision & <span class="text-accent">Mission</span>';
      if (subtitle) subtitle.textContent = "Empowering generations of engineers, researchers, and global leaders through academic excellence, Industry 4.0 innovation, and dedicated service to the nation.";
    } else {
      if (gridDemo) gridDemo.style.display = "grid";
      if (gridInst) gridInst.style.display = "none";
      if (btnDemo) btnDemo.classList.add("active");
      if (btnInst) btnInst.classList.remove("active");
      if (kicker) kicker.textContent = "21st.dev Component Showcase • Maud Benaddi";
      if (title) title.innerHTML = 'Notched Project <span class="text-accent">Cards</span>';
      if (subtitle) subtitle.textContent = "Three cards, one per device (desktop, phone, tablet), and three confessions from a designer who would rather not build her own cards.";
    }
  };

  // Preview toolbar interactive controls
  function initPreviewToolbar() {
    const themeBtn = document.getElementById("btn-theme-toggle");
    const fullBtn = document.getElementById("btn-fullscreen-toggle");
    const resetBtn = document.getElementById("btn-reset-view");
    const section = document.getElementById("about-section-3d");
    const container = document.getElementById("notched-preview-container");

    if (themeBtn && section) {
      themeBtn.addEventListener("click", () => {
        section.classList.toggle("dark");
      });
    }

    if (fullBtn && container) {
      fullBtn.addEventListener("click", () => {
        if (container.style.maxWidth === "100%") {
          container.style.maxWidth = "1380px";
          fullBtn.style.background = "";
        } else {
          container.style.maxWidth = "100%";
          fullBtn.style.background = "#f3f4f6";
        }
      });
    }

    if (resetBtn && section) {
      resetBtn.addEventListener("click", () => {
        section.style.opacity = "0.7";
        setTimeout(() => {
          section.style.opacity = "1";
        }, 150);
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initPreviewToolbar);
  } else {
    initPreviewToolbar();
  }
})();
