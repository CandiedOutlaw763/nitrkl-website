/**
 * Study@NITR — Luxury Split Interactive Academic Component
 * Matches Casa Vicens Screen Recording interaction in NIT Rourkela brand palette
 * Displays full original text with supreme readability and zero box clutter
 */
(function () {
  'use strict';

  function initStudyAtNITR() {
    const navItems = document.querySelectorAll('.san-nav-item');
    const panes = document.querySelectorAll('.san-pane');

    if (!navItems.length || !panes.length) return;

    let currentIndex = 0;
    let hoverTimeout = null;

    function setActiveProgram(index) {
      if (index < 0 || index >= navItems.length) return;
      currentIndex = index;

      navItems.forEach((item, i) => {
        if (i === index) {
          item.classList.add('active');
          item.setAttribute('aria-selected', 'true');
        } else {
          item.classList.remove('active');
          item.setAttribute('aria-selected', 'false');
        }
      });

      panes.forEach((pane, i) => {
        if (i === index) {
          pane.classList.add('active');
          pane.scrollTop = 0; // reset scroll to top of reading card
        } else {
          pane.classList.remove('active');
        }
      });
    }

    // Attach hover and click interactions to left navigation items
    navItems.forEach((item, index) => {
      // Hover interaction (matching screen recording instant switch)
      item.addEventListener('mouseenter', function () {
        clearTimeout(hoverTimeout);
        hoverTimeout = setTimeout(() => {
          setActiveProgram(index);
        }, 40);
      });

      // Click interaction (locks selection)
      item.addEventListener('click', function (e) {
        e.preventDefault();
        clearTimeout(hoverTimeout);
        setActiveProgram(index);
      });

      // Keyboard accessibility
      item.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          setActiveProgram(index);
        } else if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
          e.preventDefault();
          const next = (currentIndex + 1) % navItems.length;
          navItems[next].focus();
          setActiveProgram(next);
        } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
          e.preventDefault();
          const prev = (currentIndex - 1 + navItems.length) % navItems.length;
          navItems[prev].focus();
          setActiveProgram(prev);
        }
      });
    });

    // Initialize with first programme active
    setActiveProgram(0);
  }

  // Safe DOMContentLoaded execution
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initStudyAtNITR);
  } else {
    initStudyAtNITR();
  }
})();
