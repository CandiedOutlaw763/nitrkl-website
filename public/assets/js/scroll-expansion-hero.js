/**
 * NIT Rourkela - Cinematic Scroll-Expansion Hero & Banner Slides Controller
 * Brand Color Palette: Cinnamon Red (#771D1D, #A72626, #D75151, #FAAAAA, #FCDADA)
 * 
 * Mechanics:
 * 1. Initial State (scroll = 0): Card 0 is centered directly in view with adjacent cards teasing on the right.
 * 2. Phase 1 (0.0 to 0.65): Banners scroll smoothly left-to-right from Card 0 to the LAST BANNER (Card 5 - 4K Drone Video).
 * 3. At 0.65: The LAST BANNER reaches the exact center of the screen.
 * 4. Phase 2 (0.65 to 0.88): The LAST BANNER expands symmetrically to 100vw × 100vh fullscreen.
 *    Previous banners smoothly fade out.
 * 5. Phase 3 (0.88 to 1.0): Fullscreen video unpins and naturally flows into the main website (#about-section-3d).
 * 
 * Pure Photo & Video Presentation - Zero Overlaid Texts or Icons.
 */

(function () {
  'use strict';

  function initScrollExpansionHero() {
    const heroSection = document.getElementById('seh-hero-section');
    const cardsTrack = document.getElementById('seh-cards-track');
    const focalCard = document.getElementById('seh-focal-card');
    const focalVideo = document.getElementById('seh-focal-video');
    const allCards = heroSection ? Array.from(heroSection.querySelectorAll('.seh-card')) : [];

    if (!heroSection || !cardsTrack || !focalCard || allCards.length === 0) {
      return;
    }

    const FOCAL_INDEX = allCards.length - 1; // THE LAST BANNER (Card 5 - 4K Drone Aerial Video)

    // Robust Video Autoplay & Playback Handling
    if (focalVideo) {
      focalVideo.muted = true;
      focalVideo.defaultMuted = true;
      focalVideo.playsInline = true;
      focalVideo.setAttribute('muted', '');
      focalVideo.setAttribute('playsinline', '');
      focalVideo.setAttribute('autoplay', '');
      focalVideo.setAttribute('loop', '');

      function tryPlayVideo() {
        if (focalVideo.paused) {
          focalVideo.play().catch(function () {});
        }
      }

      tryPlayVideo();
      focalVideo.addEventListener('loadeddata', tryPlayVideo, { passive: true });
      focalVideo.addEventListener('canplay', tryPlayVideo, { passive: true });
      window.addEventListener('scroll', tryPlayVideo, { passive: true, once: true });
      window.addEventListener('click', tryPlayVideo, { passive: true, once: true });
      window.addEventListener('touchstart', tryPlayVideo, { passive: true, once: true });
    }

    // Geometry & Layout State
    let baseCardW = 680;
    let baseCardH = 420;
    let cardGap = 40;
    let baseRadius = 22;

    let trackXStart = 0;
    let trackXEnd = 0;

    let targetProgress = 0;
    let smoothProgress = 0;
    let rafId = null;

    // Measure and recalculate responsive metrics
    function measureMetrics() {
      const winW = window.innerWidth;
      const winH = window.innerHeight;

      if (winW <= 768) {
        baseCardW = Math.round(winW * 0.86);
        baseCardH = Math.round(baseCardW * 0.62);
        cardGap = 20;
        baseRadius = 18;
      } else if (winW <= 1200) {
        baseCardW = 540;
        baseCardH = 340;
        cardGap = 32;
        baseRadius = 20;
      } else if (winW >= 1400) {
        baseCardW = 720;
        baseCardH = 440;
        cardGap = 48;
        baseRadius = 24;
      } else {
        baseCardW = 680;
        baseCardH = 420;
        cardGap = 40;
        baseRadius = 22;
      }

      // Update CSS variables for default card sizing
      heroSection.style.setProperty('--card-w', `${baseCardW}px`);
      heroSection.style.setProperty('--card-h', `${baseCardH}px`);
      heroSection.style.setProperty('--card-gap', `${cardGap}px`);
      heroSection.style.setProperty('--card-radius', `${baseRadius}px`);

      // Calculate track translation for Card 0 (Start) and Card 5 (The Last Banner)
      // Track has left: 0, top: 50%, transform: translateY(-50%).
      // Card i center relative to track left = i * (baseCardW + cardGap) + baseCardW / 2.
      // Therefore, track translateX = (winW / 2) - cardCenter aligns Card i with the viewport center!
      const cardCenter0 = baseCardW / 2;
      const cardCenterLast = FOCAL_INDEX * (baseCardW + cardGap) + baseCardW / 2;

      trackXStart = (winW / 2) - cardCenter0;
      trackXEnd = (winW / 2) - cardCenterLast;

      renderFrame(smoothProgress);
    }

    // Smooth Easing
    function easeInOutQuad(t) {
      return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    }

    // Render Animation Frame according to Scroll Progress p [0.0 - 1.0]
    function renderFrame(p) {
      p = Math.max(0, Math.min(1, p));
      const winW = window.innerWidth;
      const winH = window.innerHeight;

      // Phase 1: Scroll left-to-right through banners to the LAST banner (0.0 to 0.65)
      // Phase 2: Maximise the size of the LAST banner to fullscreen (0.65 to 0.88)
      // Phase 3: Transition to main website (0.88 to 1.0)
      const p1End = 0.65;
      const p2End = 0.88;

      if (p <= p1End) {
        // --- PHASE 1: Scroll through all banners from Card 0 to the LAST banner ---
        const t1 = p / p1End;
        const currentTrackX = trackXStart + (trackXEnd - trackXStart) * t1;

        cardsTrack.style.transform = `translate3d(${currentTrackX.toFixed(2)}px, -50%, 0)`;

        // Focal card (Last Banner) stays in card size
        focalCard.style.width = `${baseCardW}px`;
        focalCard.style.height = `${baseCardH}px`;
        focalCard.style.borderRadius = `${baseRadius}px`;
        focalCard.style.borderColor = 'rgba(250, 170, 170, 0.55)';
        focalCard.style.boxShadow = '0 35px 95px -15px rgba(18, 2, 2, 0.98), 0 0 60px rgba(215, 81, 81, 0.55)';

        // All preceding cards are visible and aligned
        allCards.forEach((card, idx) => {
          if (idx !== FOCAL_INDEX) {
            card.style.opacity = '1';
            card.style.transform = 'translate3d(0, 0, 0)';
          }
        });
      } else if (p <= p2End) {
        // --- PHASE 2: Maximise the size of the LAST banner symmetrically to Fullscreen ---
        const t2 = (p - p1End) / (p2End - p1End);
        const ease = easeInOutQuad(t2);

        // Calculate expanding dimensions
        const currentW = baseCardW + (winW - baseCardW) * ease;
        const currentH = baseCardH + (winH - baseCardH) * ease;
        const currentRadius = baseRadius * (1 - ease);
        const borderAlpha = 0.55 * (1 - ease);
        const glowAlpha = 0.55 * (1 - ease);

        // Dynamically compensate trackX so Card 5's center remains precisely at winW / 2
        // As currentW reaches winW, Card 5's left reaches 0 and right reaches winW!
        const currentTrackX = (winW / 2) - FOCAL_INDEX * (baseCardW + cardGap) - currentW / 2;
        cardsTrack.style.transform = `translate3d(${currentTrackX.toFixed(2)}px, -50%, 0)`;

        focalCard.style.width = `${Math.round(currentW)}px`;
        focalCard.style.height = `${Math.round(currentH)}px`;
        focalCard.style.borderRadius = `${Math.round(currentRadius)}px`;
        focalCard.style.borderColor = `rgba(250, 170, 170, ${borderAlpha.toFixed(3)})`;
        focalCard.style.boxShadow = `0 35px 95px -15px rgba(18, 2, 2, 0.98), 0 0 ${Math.round(glowAlpha * 80)}px rgba(215, 81, 81, ${glowAlpha.toFixed(3)})`;

        // Preceding cards fade out and drift slightly leftward
        const otherOpacity = Math.max(0, 1 - ease * 1.6);
        const driftOffset = ease * 180;

        allCards.forEach((card, idx) => {
          if (idx < FOCAL_INDEX) {
            card.style.opacity = otherOpacity.toFixed(3);
            card.style.transform = `translate3d(-${driftOffset.toFixed(1)}px, 0, 0)`;
          }
        });
      } else {
        // --- PHASE 3: Maximised Fullscreen - Transition to website ---
        const currentTrackX = (winW / 2) - FOCAL_INDEX * (baseCardW + cardGap) - winW / 2;
        cardsTrack.style.transform = `translate3d(${currentTrackX.toFixed(2)}px, -50%, 0)`;

        focalCard.style.width = `${winW}px`;
        focalCard.style.height = `${winH}px`;
        focalCard.style.borderRadius = '0px';
        focalCard.style.borderColor = 'transparent';
        focalCard.style.boxShadow = 'none';

        allCards.forEach((card, idx) => {
          if (idx !== FOCAL_INDEX) {
            card.style.opacity = '0';
          }
        });
      }
    }

    // Scroll calculation
    function updateScrollProgress() {
      const rect = heroSection.getBoundingClientRect();
      const scrollableHeight = heroSection.offsetHeight - window.innerHeight;

      if (scrollableHeight <= 0) return;

      const scrolled = -rect.top;
      targetProgress = Math.max(0, Math.min(1, scrolled / scrollableHeight));

      if (!rafId) {
        rafId = requestAnimationFrame(tickAnimation);
      }
    }

    // Lerp animation loop for 60/120fps motion
    function tickAnimation() {
      const diff = targetProgress - smoothProgress;

      if (Math.abs(diff) > 0.0003) {
        smoothProgress += diff * 0.16;
        renderFrame(smoothProgress);
        rafId = requestAnimationFrame(tickAnimation);
      } else {
        smoothProgress = targetProgress;
        renderFrame(smoothProgress);
        rafId = null;
      }
    }

    // Event Listeners
    window.addEventListener('scroll', updateScrollProgress, { passive: true });
    window.addEventListener('resize', measureMetrics);
    window.addEventListener('orientationchange', function () {
      setTimeout(measureMetrics, 150);
    });

    // Initial setup
    measureMetrics();
    updateScrollProgress();

    // GSAP ScrollTrigger Integration if present
    if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
      try {
        ScrollTrigger.create({
          trigger: heroSection,
          start: 'top top',
          end: 'bottom bottom',
          onUpdate: function (self) {
            targetProgress = self.progress;
            if (!rafId) {
              rafId = requestAnimationFrame(tickAnimation);
            }
          }
        });
      } catch (err) {}
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initScrollExpansionHero);
  } else {
    initScrollExpansionHero();
  }
})();
