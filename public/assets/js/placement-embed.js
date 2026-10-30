/**
 * NIT Rourkela - Interactive Placement Report In-Banner Embed Handler
 * Enables opening and interacting with placement-report.html directly within
 * the homepage banner section without navigating to a new tab.
 */
document.addEventListener('DOMContentLoaded', function () {
  const container = document.getElementById('placementBannerContainer');
  const bannerCard = document.getElementById('placementBannerCard');
  const embedWrap = document.getElementById('placementEmbedFrameWrap');
  const toggleBtn = document.getElementById('placementToggleBtn');
  const iframe = document.getElementById('placementIframe');
  const loader = document.getElementById('placementIframeLoader');
  const reloadBtn = document.getElementById('embedReloadBtn');
  const fullscreenBtn = document.getElementById('embedFullscreenBtn');
  const collapseBtn = document.getElementById('embedCollapseBtn');

  if (!bannerCard || !embedWrap) return;

  let isLoaded = false;
  let isOpening = false;

  function loadIframeSource(callback) {
    if (isLoaded) {
      if (typeof callback === 'function') callback();
      return;
    }

    if (iframe && iframe.dataset.src) {
      iframe.src = iframe.dataset.src;
      isLoaded = true;

      iframe.onload = function () {
        if (loader) {
          loader.classList.add('hidden');
        }
        if (typeof callback === 'function') callback();
      };
    }
  }

  function openDashboard(smoothScroll) {
    if (isOpening) return;
    isOpening = true;

    // Load iframe content
    loadIframeSource();

    // Switch view
    bannerCard.style.display = 'none';
    embedWrap.style.display = 'flex';
    embedWrap.setAttribute('aria-hidden', 'false');

    if (toggleBtn) {
      toggleBtn.classList.add('active');
      toggleBtn.setAttribute('aria-expanded', 'true');
      const textSpan = toggleBtn.querySelector('.btn-state-text');
      if (textSpan) textSpan.textContent = 'Close Dashboard';
      const icon = toggleBtn.querySelector('i');
      if (icon) icon.className = 'fa-solid fa-xmark';
    }

    if (smoothScroll) {
      setTimeout(function () {
        const targetElement = document.getElementById('placementSection') || embedWrap;
        const rect = targetElement.getBoundingClientRect();
        const topOffset = rect.top + window.pageYOffset - 90;
        window.scrollTo({ top: Math.max(0, topOffset), behavior: 'smooth' });
      }, 50);
    }

    setTimeout(function () {
      isOpening = false;
    }, 400);
  }

  function closeDashboard() {
    embedWrap.style.display = 'none';
    embedWrap.setAttribute('aria-hidden', 'true');
    bannerCard.style.display = 'block';

    if (toggleBtn) {
      toggleBtn.classList.remove('active');
      toggleBtn.setAttribute('aria-expanded', 'false');
      const textSpan = toggleBtn.querySelector('.btn-state-text');
      if (textSpan) textSpan.textContent = 'View Details / Dashboard';
      const icon = toggleBtn.querySelector('i');
      if (icon) icon.className = 'fa-solid fa-chart-column';
    }
  }

  // Click on the banner preview card opens dashboard
  bannerCard.addEventListener('click', function (e) {
    e.preventDefault();
    openDashboard(true);
  });

  // Keyboard accessibility on banner preview card
  bannerCard.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openDashboard(true);
    }
  });

  // Header toggle button
  if (toggleBtn) {
    toggleBtn.addEventListener('click', function (e) {
      e.preventDefault();
      if (embedWrap.style.display === 'none') {
        openDashboard(true);
      } else {
        closeDashboard();
      }
    });
  }

  // In-embed close button
  if (collapseBtn) {
    collapseBtn.addEventListener('click', function (e) {
      e.preventDefault();
      closeDashboard();
    });
  }

  // Reload iframe button
  if (reloadBtn) {
    reloadBtn.addEventListener('click', function (e) {
      e.preventDefault();
      if (loader) loader.classList.remove('hidden');
      if (iframe) {
        iframe.src = iframe.dataset.src || iframe.src;
      }
    });
  }

  // Fullscreen toggle button
  if (fullscreenBtn) {
    fullscreenBtn.addEventListener('click', function (e) {
      e.preventDefault();
      if (!document.fullscreenElement) {
        if (embedWrap.requestFullscreen) {
          embedWrap.requestFullscreen().catch(function (err) {
            console.warn('Fullscreen request failed:', err);
          });
        }
      } else {
        if (document.exitFullscreen) {
          document.exitFullscreen().catch(function (err) {
            console.warn('Exit fullscreen failed:', err);
          });
        }
      }
    });
  }

  // Listen for fullscreen change to update icon/label
  document.addEventListener('fullscreenchange', function () {
    if (!fullscreenBtn) return;
    const icon = fullscreenBtn.querySelector('i');
    const label = fullscreenBtn.querySelector('.action-label');
    if (document.fullscreenElement) {
      if (icon) icon.className = 'fa-solid fa-compress';
      if (label) label.textContent = 'Exit Fullscreen';
    } else {
      if (icon) icon.className = 'fa-solid fa-expand';
      if (label) label.textContent = 'Fullscreen';
    }
  });

  // Preload iframe in the background on mouse hover or after idle delay for instantaneous feel
  let preloaded = false;
  function preload() {
    if (preloaded || isLoaded) return;
    preloaded = true;
    loadIframeSource();
  }

  bannerCard.addEventListener('mouseenter', preload, { once: true });
  setTimeout(preload, 2500);

  // Check URL hash: e.g. #placement-report or #placements automatically opens it
  if (window.location.hash === '#placement-report' || window.location.hash === '#placements') {
    setTimeout(function () {
      openDashboard(true);
    }, 300);
  }
});
