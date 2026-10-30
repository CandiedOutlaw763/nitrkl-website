/**
 * Features With Panel — Incubations@NITR Interactive Controller
 * Features:
 * - 4.5s Auto-scroll loop (matching owlCarousel autoplay)
 * - Animated progress bar for active item
 * - Auto-scroll remains active continuously irrespective of mouse pointer
 * - Auto-scroll is ONLY paused if the button is pressed
 * - Click to switch active panel with smooth crossfade
 */
(function () {
  "use strict";

  function initFeaturesWithPanel() {
    const section = document.querySelector(".fwp-incubation-section");
    if (!section) return;

    const items = section.querySelectorAll(".fwp-item");
    const slides = section.querySelectorAll(".fwp-media-slide");
    const toggleBtn = section.querySelector("#fwp-toggle-autoplay");
    const toggleText = toggleBtn ? toggleBtn.querySelector(".fwp-toggle-text") : null;
    const toggleIcon = toggleBtn ? toggleBtn.querySelector("i") : null;

    if (!items.length || !slides.length) return;

    const INTERVAL_MS = 4500;
    const TICK_MS = 50;
    let activeIndex = 0;
    let isPlaying = true;
    let elapsedMs = 0;
    let timerId = null;

    function setActive(index) {
      if (index === activeIndex && items[index].classList.contains("active")) return;
      activeIndex = (index + items.length) % items.length;
      elapsedMs = 0;

      // Update items
      items.forEach((item, idx) => {
        const progressBar = item.querySelector(".fwp-progress-bar");
        if (idx === activeIndex) {
          item.classList.add("active");
          item.setAttribute("aria-selected", "true");
          if (progressBar) progressBar.style.width = "0%";
        } else {
          item.classList.remove("active");
          item.setAttribute("aria-selected", "false");
          if (progressBar) progressBar.style.width = "0%";
        }
      });

      // Update desktop slides
      slides.forEach((slide, idx) => {
        if (idx === activeIndex) {
          slide.classList.add("active");
        } else {
          slide.classList.remove("active");
        }
      });
    }

    function updateProgress() {
      // Auto-scroll stays active irrespective of mouse pointer; only pauses when isPlaying is false
      if (!isPlaying) return;

      elapsedMs += TICK_MS;
      const pct = Math.min(100, (elapsedMs / INTERVAL_MS) * 100);

      const activeBar = items[activeIndex]?.querySelector(".fwp-progress-bar");
      if (activeBar) {
        activeBar.style.width = pct + "%";
      }

      if (elapsedMs >= INTERVAL_MS) {
        setActive(activeIndex + 1);
      }
    }

    function startTimer() {
      if (timerId) clearInterval(timerId);
      timerId = setInterval(updateProgress, TICK_MS);
    }

    function updateToggleUI() {
      if (!toggleBtn) return;
      if (isPlaying) {
        toggleBtn.classList.remove("is-active");
        if (toggleText) toggleText.textContent = "Auto-scroll Active";
        if (toggleIcon) toggleIcon.className = "fa-solid fa-pause";
        toggleBtn.setAttribute("aria-label", "Pause auto-scroll");
      } else {
        toggleBtn.classList.add("is-active");
        if (toggleText) toggleText.textContent = "Resume Auto-scroll";
        if (toggleIcon) toggleIcon.className = "fa-solid fa-play";
        toggleBtn.setAttribute("aria-label", "Resume auto-scroll");
      }
    }

    // Item click listeners
    items.forEach((item, index) => {
      item.addEventListener("click", () => {
        setActive(index);
      });
    });

    // Toggle button click listener: Auto-scroll is ONLY paused if this button is pressed
    if (toggleBtn) {
      toggleBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        isPlaying = !isPlaying;
        updateToggleUI();
        if (isPlaying) {
          elapsedMs = 0;
        }
      });
    }

    // Initial state
    setActive(0);
    startTimer();
    updateToggleUI();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initFeaturesWithPanel);
  } else {
    initFeaturesWithPanel();
  }
})();
