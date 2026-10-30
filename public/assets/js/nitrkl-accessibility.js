/**
 * NIT Rourkela - Accessibility Tools Widget Engine
 * Standard WCAG 2.1 AA / AAA & GIGW 3.0 Compliant
 * Standalone Drop-in Engine for https://nitrkl.ac.in
 */

(function (window, document) {
  'use strict';

  // Prevent multiple initializations if script is included twice
  if (window.NITRKLAccessibilityWidget) {
    return;
  }

  const STORAGE_KEY = 'nitrkl_acc_tools_prefs';

  // Default state configuration
  const defaultState = {
    textScale: 1.0,        // Range: 0.9, 1.0, 1.1, 1.2, 1.3, 1.4
    lineHeightLevel: 0,    // 0: Normal, 1: 1.8x, 2: 2.1x
    letterSpacingLevel: 0, // 0: Normal, 1: 0.12em, 2: 0.20em
    dyslexicFont: false,
    invertColors: false,
    highContrast: false,
    saturation: 0,         // -1: Decreased, 0: Normal, 1: Increased
    checkImages: false,
    highlightLinks: false,
    bigCursor: false,
    hideImages: false
  };

  let state = Object.assign({}, defaultState);

  // SVG Icons for floating trigger and all accessibility tools
  const ICONS = {
    trigger: `<svg class="nitrkl-acc-trigger-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="4" r="2"/><path d="M15.89 8.11C15.5 7.72 14.83 7 13.53 7h-3.06c-1.3 0-1.97.72-2.36 1.11L4 12.25l1.41 1.41L9 10.08V22h2v-6h2v6h2V10.08l3.59 3.58L20 12.25l-4.11-4.14z"/></svg>`,
    increaseText: `<svg class="nitrkl-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M3 19l4.5-12h3L15 19"/><path d="M5.5 13.5h7"/><path d="M19 10v6"/><path d="M16 13h6"/></svg>`,
    decreaseText: `<svg class="nitrkl-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M3 19l4.5-12h3L15 19"/><path d="M5.5 13.5h7"/><path d="M16 13h6"/></svg>`,
    lineHeight: `<svg class="nitrkl-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/><path d="M12 9v6"/><polyline points="9 11 12 8 15 11"/><polyline points="9 13 12 16 15 13"/></svg>`,
    letterSpacing: `<svg class="nitrkl-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M6 6v12"/><path d="M18 6v12"/><path d="M6 12h12"/><polyline points="9 9 6 12 9 15"/><polyline points="15 9 18 12 15 15"/></svg>`,
    dyslexicFont: `<svg class="nitrkl-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>`,
    invertColors: `<svg class="nitrkl-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="10"/><path d="M12 2a10 10 0 0 1 0 20z" fill="currentColor"/></svg>`,
    highContrast: `<svg class="nitrkl-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><rect x="3" y="3" width="18" height="18" rx="4"/><path d="M3 3h9v18H3z" fill="currentColor"/></svg>`,
    increaseSat: `<svg class="nitrkl-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/><line x1="12" y1="11" x2="12" y2="17"/><line x1="9" y1="14" x2="15" y2="14"/></svg>`,
    decreaseSat: `<svg class="nitrkl-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/><line x1="9" y1="14" x2="15" y2="14"/></svg>`,
    checkImages: `<svg class="nitrkl-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/><polyline points="13 17 15.5 19.5 20 15" stroke-width="2.5"/></svg>`,
    highlightLinks: `<svg class="nitrkl-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>`,
    bigCursor: `<svg class="nitrkl-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M4 4l7.07 17 2.51-7.39L21 11.07z"/></svg>`,
    toggleImages: `<svg class="nitrkl-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/><line x1="2" y1="2" x2="22" y2="22" stroke-width="2"/></svg>`,
    reset: `<svg class="nitrkl-reset-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/></svg>`
  };

  // Internal DOM references
  let elements = {};

  /**
   * Load saved preferences from localStorage
   */
  function loadPreferences() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        state = Object.assign({}, defaultState, JSON.parse(saved));
      }
    } catch (e) {
      console.warn('NITRKL Accessibility: Unable to access localStorage', e);
    }
  }

  /**
   * Save current preferences to localStorage
   */
  function savePreferences() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn('NITRKL Accessibility: Unable to save to localStorage', e);
    }
  }

  /**
   * Screen Reader Announcer & Visual Toast notification
   */
  function announce(message) {
    // 1. ARIA Live region for screen readers
    let announcer = document.getElementById('aria-live-announcer');
    if (!announcer) {
      announcer = document.createElement('div');
      announcer.id = 'aria-live-announcer';
      announcer.setAttribute('aria-live', 'polite');
      announcer.setAttribute('aria-atomic', 'true');
      announcer.className = 'sr-only';
      document.body.appendChild(announcer);
    }
    announcer.textContent = '';
    setTimeout(() => {
      announcer.textContent = message;
    }, 50);

    // 2. Visual Toast notification
    if (elements.toast) {
      elements.toast.textContent = message;
      elements.toast.classList.add('show');
      clearTimeout(elements.toastTimeout);
      elements.toastTimeout = setTimeout(() => {
        elements.toast.classList.remove('show');
      }, 2500);
    }
  }

  /**
   * Count how many non-default adjustments are active
   */
  function getActiveFeatureCount() {
    let count = 0;
    if (Math.abs(state.textScale - 1.0) > 0.01) count++;
    if (state.lineHeightLevel > 0) count++;
    if (state.letterSpacingLevel > 0) count++;
    if (state.dyslexicFont) count++;
    if (state.invertColors) count++;
    if (state.highContrast) count++;
    if (state.saturation !== 0) count++;
    if (state.checkImages) count++;
    if (state.highlightLinks) count++;
    if (state.bigCursor) count++;
    if (state.hideImages) count++;
    return count;
  }

  /**
   * Update active badge on floating launcher button
   */
  function updateBadge() {
    if (!elements.badge) return;
    const count = getActiveFeatureCount();
    if (count > 0) {
      elements.badge.textContent = count;
      elements.badge.classList.add('visible');
    } else {
      elements.badge.classList.remove('visible');
    }
  }

  /**
   * Render the accessibility widget DOM into the page
   */
  function buildWidgetDOM() {
    // Floating Trigger Button
    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'nitrkl-acc-trigger';
    trigger.setAttribute('aria-label', 'Accessibility Tools Menu');
    trigger.setAttribute('aria-expanded', 'false');
    trigger.setAttribute('aria-haspopup', 'dialog');
    trigger.setAttribute('aria-controls', 'nitrkl-accessibility-card');
    trigger.innerHTML = `
      ${ICONS.trigger}
      <span class="nitrkl-acc-count-badge" aria-hidden="true">0</span>
    `;

    // Modal / Card
    const card = document.createElement('div');
    card.id = 'nitrkl-accessibility-card';
    card.className = 'nitrkl-acc-card';
    card.setAttribute('role', 'dialog');
    card.setAttribute('aria-modal', 'false');
    card.setAttribute('aria-labelledby', 'nitrkl-acc-title');

    card.innerHTML = `
      <div class="nitrkl-acc-header">
        <h2 class="nitrkl-acc-title" id="nitrkl-acc-title">Accessibility Tools</h2>
        <button type="button" class="nitrkl-acc-close-btn" aria-label="Close Accessibility Tools">✕</button>
      </div>

      <div class="nitrkl-acc-body">
        <!-- 1. TEXT ADJUSTMENTS -->
        <div class="nitrkl-acc-group">
          <div class="nitrkl-acc-label">TEXT ADJUSTMENTS</div>
          <div class="nitrkl-acc-grid">
            <button type="button" class="nitrkl-acc-btn nitrkl-btn-blue" data-action="increase-text">
              ${ICONS.increaseText}
              <span>Increase Text</span>
            </button>
            <button type="button" class="nitrkl-acc-btn nitrkl-btn-blue" data-action="decrease-text">
              ${ICONS.decreaseText}
              <span>Decrease Text</span>
            </button>
            <button type="button" class="nitrkl-acc-btn nitrkl-btn-blue" data-action="line-height">
              ${ICONS.lineHeight}
              <span>Line Height</span>
            </button>
            <button type="button" class="nitrkl-acc-btn nitrkl-btn-blue" data-action="letter-spacing">
              ${ICONS.letterSpacing}
              <span>Letter Spacing</span>
            </button>
            <button type="button" class="nitrkl-acc-btn nitrkl-btn-blue" data-action="dyslexic-font">
              ${ICONS.dyslexicFont}
              <span>Dyslexic Font</span>
            </button>
          </div>
        </div>

        <!-- 2. VISUAL PREFERENCES -->
        <div class="nitrkl-acc-group">
          <div class="nitrkl-acc-label">VISUAL PREFERENCES</div>
          <div class="nitrkl-acc-grid">
            <button type="button" class="nitrkl-acc-btn nitrkl-btn-green" data-action="invert-colors">
              ${ICONS.invertColors}
              <span>Invert Colors</span>
            </button>
            <button type="button" class="nitrkl-acc-btn nitrkl-btn-green" data-action="high-contrast">
              ${ICONS.highContrast}
              <span>High Contrast</span>
            </button>
            <button type="button" class="nitrkl-acc-btn nitrkl-btn-green" data-action="increase-sat">
              ${ICONS.increaseSat}
              <span>Increase Saturation</span>
            </button>
            <button type="button" class="nitrkl-acc-btn nitrkl-btn-green" data-action="decrease-sat">
              ${ICONS.decreaseSat}
              <span>Decrease Saturation</span>
            </button>
          </div>
        </div>

        <!-- 3. READING ASSISTANCE -->
        <div class="nitrkl-acc-group">
          <div class="nitrkl-acc-label">READING ASSISTANCE</div>
          <div class="nitrkl-acc-grid">
            <button type="button" class="nitrkl-acc-btn nitrkl-btn-peach" data-action="check-images">
              ${ICONS.checkImages}
              <span>Check Images</span>
            </button>
          </div>
        </div>

        <!-- 4. NAVIGATION -->
        <div class="nitrkl-acc-group">
          <div class="nitrkl-acc-label">NAVIGATION</div>
          <div class="nitrkl-acc-grid">
            <button type="button" class="nitrkl-acc-btn nitrkl-btn-blue" data-action="highlight-links">
              ${ICONS.highlightLinks}
              <span>Highlight Links</span>
            </button>
            <button type="button" class="nitrkl-acc-btn nitrkl-btn-blue" data-action="big-cursor">
              ${ICONS.bigCursor}
              <span>Big Cursor</span>
            </button>
            <button type="button" class="nitrkl-acc-btn nitrkl-btn-blue" data-action="toggle-images">
              ${ICONS.toggleImages}
              <span>Toggle Images</span>
            </button>
          </div>
        </div>

        <!-- 5. RESET -->
        <button type="button" class="nitrkl-btn-reset" data-action="reset-all">
          ${ICONS.reset}
          <span>Reset All Settings</span>
        </button>
      </div>
    `;

    // Click-outside Backdrop
    const backdrop = document.createElement('div');
    backdrop.className = 'nitrkl-acc-backdrop';
    backdrop.setAttribute('aria-hidden', 'true');

    // Visual Toast notification
    const toast = document.createElement('div');
    toast.className = 'nitrkl-acc-toast';
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');

    // Append to document body
    document.body.appendChild(backdrop);
    document.body.appendChild(trigger);
    document.body.appendChild(card);
    document.body.appendChild(toast);

    elements = {
      trigger: trigger,
      card: card,
      backdrop: backdrop,
      toast: toast,
      badge: trigger.querySelector('.nitrkl-acc-count-badge'),
      closeBtn: card.querySelector('.nitrkl-acc-close-btn'),
      buttons: card.querySelectorAll('[data-action]')
    };

    attachEventListeners();
  }

  /**
   * Apply all active features from state to the document
   */
  function applyState() {
    const html = document.documentElement;
    const body = document.body;

    // 1. Text Scale
    if (Math.abs(state.textScale - 1.0) < 0.01) {
      html.style.removeProperty('font-size');
    } else {
      html.style.fontSize = Math.round(state.textScale * 100) + '%';
    }

    // 2. Line Height
    body.classList.remove('nitrkl-mode-line-height-1', 'nitrkl-mode-line-height-2');
    if (state.lineHeightLevel === 1) body.classList.add('nitrkl-mode-line-height-1');
    else if (state.lineHeightLevel === 2) body.classList.add('nitrkl-mode-line-height-2');

    // 3. Letter Spacing
    body.classList.remove('nitrkl-mode-letter-spacing-1', 'nitrkl-mode-letter-spacing-2');
    if (state.letterSpacingLevel === 1) body.classList.add('nitrkl-mode-letter-spacing-1');
    else if (state.letterSpacingLevel === 2) body.classList.add('nitrkl-mode-letter-spacing-2');

    // 4. Dyslexic Font
    body.classList.toggle('nitrkl-mode-dyslexic', !!state.dyslexicFont);

    // 5. Invert Colors
    html.classList.toggle('nitrkl-mode-invert', !!state.invertColors);

    // 6. High Contrast
    html.classList.toggle('nitrkl-mode-high-contrast', !!state.highContrast);

    // 7. Saturation
    html.classList.remove('nitrkl-mode-sat-increase', 'nitrkl-mode-sat-decrease');
    if (state.saturation === 1) html.classList.add('nitrkl-mode-sat-increase');
    else if (state.saturation === -1) html.classList.add('nitrkl-mode-sat-decrease');

    // 8. Highlight Links
    body.classList.toggle('nitrkl-mode-highlight-links', !!state.highlightLinks);

    // 9. Big Cursor
    body.classList.toggle('nitrkl-mode-big-cursor', !!state.bigCursor);

    // 10. Hide Images
    body.classList.toggle('nitrkl-mode-hide-images', !!state.hideImages);

    // 11. Check Images (Alt attribute scanner)
    updateImageAuditBadges(state.checkImages);

    // Update UI button active states
    updateButtonStates();
    updateBadge();
    savePreferences();
  }

  /**
   * Update visual .active states and aria-pressed attributes on buttons
   */
  function updateButtonStates() {
    if (!elements.buttons) return;

    elements.buttons.forEach((btn) => {
      const action = btn.getAttribute('data-action');
      let isActive = false;

      switch (action) {
        case 'increase-text':
          isActive = state.textScale > 1.0;
          btn.title = `Text Scale: ${Math.round(state.textScale * 100)}%`;
          break;
        case 'decrease-text':
          isActive = state.textScale < 1.0;
          btn.title = `Text Scale: ${Math.round(state.textScale * 100)}%`;
          break;
        case 'line-height':
          isActive = state.lineHeightLevel > 0;
          btn.title = state.lineHeightLevel === 2 ? 'Line Height: 2.1x' : state.lineHeightLevel === 1 ? 'Line Height: 1.8x' : 'Line Height: Default';
          break;
        case 'letter-spacing':
          isActive = state.letterSpacingLevel > 0;
          btn.title = state.letterSpacingLevel === 2 ? 'Letter Spacing: Extra Wide' : state.letterSpacingLevel === 1 ? 'Letter Spacing: Wide' : 'Letter Spacing: Default';
          break;
        case 'dyslexic-font':
          isActive = !!state.dyslexicFont;
          break;
        case 'invert-colors':
          isActive = !!state.invertColors;
          break;
        case 'high-contrast':
          isActive = !!state.highContrast;
          break;
        case 'increase-sat':
          isActive = state.saturation === 1;
          break;
        case 'decrease-sat':
          isActive = state.saturation === -1;
          break;
        case 'check-images':
          isActive = !!state.checkImages;
          break;
        case 'highlight-links':
          isActive = !!state.highlightLinks;
          break;
        case 'big-cursor':
          isActive = !!state.bigCursor;
          break;
        case 'toggle-images':
          isActive = !!state.hideImages;
          break;
        default:
          isActive = false;
      }

      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });
  }

  /**
   * Image Alt attribute scanner & visual badges
   */
  function updateImageAuditBadges(enabled) {
    // First remove any existing badges & classes
    document.querySelectorAll('.nitrkl-img-check-badge').forEach(b => b.remove());
    document.querySelectorAll('.nitrkl-img-check-missing, .nitrkl-img-check-ok').forEach(img => {
      img.classList.remove('nitrkl-img-check-missing', 'nitrkl-img-check-ok');
    });

    if (!enabled) return;

    const images = Array.from(document.querySelectorAll('img:not(.nitrkl-acc-icon):not([src*="data:image"])'));
    let total = images.length;
    let missingCount = 0;

    images.forEach(img => {
      const alt = (img.getAttribute('alt') || '').trim();
      const parent = img.parentElement;

      // Wrap if needed for relative badge positioning
      if (parent && getComputedStyle(parent).position === 'static') {
        parent.style.position = 'relative';
      }

      const badge = document.createElement('span');
      badge.className = 'nitrkl-img-check-badge';

      if (!alt) {
        missingCount++;
        img.classList.add('nitrkl-img-check-missing');
        badge.classList.add('missing');
        badge.textContent = '⚠️ Missing Alt';
      } else {
        img.classList.add('nitrkl-img-check-ok');
        badge.classList.add('ok');
        badge.textContent = `Alt: "${alt.length > 25 ? alt.substring(0, 22) + '...' : alt}"`;
      }

      img.insertAdjacentElement('beforebegin', badge);
    });

    return { total, missingCount, withAltCount: total - missingCount };
  }

  /**
   * Toggle Drawer / Modal
   */
  function toggleCard(open) {
    const willOpen = (typeof open === 'boolean') ? open : !elements.card.classList.contains('open');

    if (willOpen) {
      elements.card.classList.add('open');
      elements.backdrop.classList.add('open');
      elements.trigger.classList.add('active');
      elements.trigger.setAttribute('aria-expanded', 'true');
      announce('Accessibility Tools menu opened');
      // Set focus to the first button inside the card for keyboard users
      const firstBtn = elements.card.querySelector('.nitrkl-acc-btn');
      if (firstBtn) firstBtn.focus();
    } else {
      elements.card.classList.remove('open');
      elements.backdrop.classList.remove('open');
      elements.trigger.classList.remove('active');
      elements.trigger.setAttribute('aria-expanded', 'false');
      announce('Accessibility Tools menu closed');
    }
  }

  /**
   * Action handler
   */
  function handleAction(action) {
    switch (action) {
      case 'increase-text':
        if (state.textScale < 1.4) {
          state.textScale = +(state.textScale + 0.1).toFixed(1);
          announce(`Font size increased to ${Math.round(state.textScale * 100)}%`);
        } else {
          announce(`Maximum font size reached (${Math.round(state.textScale * 100)}%)`);
        }
        break;

      case 'decrease-text':
        if (state.textScale > 0.9) {
          state.textScale = +(state.textScale - 0.1).toFixed(1);
          announce(`Font size decreased to ${Math.round(state.textScale * 100)}%`);
        } else {
          announce(`Minimum font size reached (${Math.round(state.textScale * 100)}%)`);
        }
        break;

      case 'line-height':
        state.lineHeightLevel = (state.lineHeightLevel + 1) % 3;
        announce(state.lineHeightLevel === 0 ? 'Line height reset to normal' : state.lineHeightLevel === 1 ? 'Line height set to 1.8x' : 'Line height set to 2.1x');
        break;

      case 'letter-spacing':
        state.letterSpacingLevel = (state.letterSpacingLevel + 1) % 3;
        announce(state.letterSpacingLevel === 0 ? 'Letter spacing reset to normal' : state.letterSpacingLevel === 1 ? 'Letter spacing set to wide' : 'Letter spacing set to extra wide');
        break;

      case 'dyslexic-font':
        state.dyslexicFont = !state.dyslexicFont;
        announce(state.dyslexicFont ? 'Dyslexic-friendly font activated' : 'Standard font restored');
        break;

      case 'invert-colors':
        state.invertColors = !state.invertColors;
        if (state.invertColors) state.highContrast = false;
        announce(state.invertColors ? 'Color inversion activated' : 'Color inversion deactivated');
        break;

      case 'high-contrast':
        state.highContrast = !state.highContrast;
        if (state.highContrast) state.invertColors = false;
        announce(state.highContrast ? 'High contrast theme activated' : 'Standard contrast restored');
        break;

      case 'increase-sat':
        state.saturation = state.saturation === 1 ? 0 : 1;
        announce(state.saturation === 1 ? 'Color saturation boosted' : 'Normal color saturation restored');
        break;

      case 'decrease-sat':
        state.saturation = state.saturation === -1 ? 0 : -1;
        announce(state.saturation === -1 ? 'Low saturation / grayscale mode activated' : 'Normal color saturation restored');
        break;

      case 'check-images':
        state.checkImages = !state.checkImages;
        if (state.checkImages) {
          const stats = updateImageAuditBadges(true) || { total: 0, missingCount: 0 };
          announce(`Image check complete: ${stats.total} images scanned, ${stats.missingCount} missing alt descriptions`);
        } else {
          updateImageAuditBadges(false);
          announce('Image check badges hidden');
        }
        break;

      case 'highlight-links':
        state.highlightLinks = !state.highlightLinks;
        announce(state.highlightLinks ? 'All hyperlinks highlighted' : 'Link highlight removed');
        break;

      case 'big-cursor':
        state.bigCursor = !state.bigCursor;
        announce(state.bigCursor ? 'Large high-visibility cursor activated' : 'Standard cursor restored');
        break;

      case 'toggle-images':
        state.hideImages = !state.hideImages;
        announce(state.hideImages ? 'Images hidden for reduced distraction' : 'Images restored');
        break;

      case 'reset-all':
        state = Object.assign({}, defaultState);
        announce('All accessibility settings have been reset to default');
        break;
    }

    applyState();
  }

  /**
   * Bind DOM Events & Keyboard Shortcuts
   */
  function attachEventListeners() {
    // Trigger button click
    elements.trigger.addEventListener('click', () => {
      toggleCard();
    });

    // Close button click
    elements.closeBtn.addEventListener('click', () => {
      toggleCard(false);
    });

    // Click outside on backdrop
    elements.backdrop.addEventListener('click', () => {
      toggleCard(false);
    });

    // Action button clicks
    elements.buttons.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const action = e.currentTarget.getAttribute('data-action');
        if (action) handleAction(action);
      });
    });

    // Keyboard ESC key to dismiss
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && elements.card.classList.contains('open')) {
        toggleCard(false);
        elements.trigger.focus();
      }
    });
  }

  /**
   * Initialize module
   */
  function init() {
    loadPreferences();
    buildWidgetDOM();
    applyState();
  }

  // Auto-boot on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Public API
  window.NITRKLAccessibilityWidget = {
    open: () => toggleCard(true),
    close: () => toggleCard(false),
    toggle: () => toggleCard(),
    getState: () => Object.assign({}, state),
    reset: () => handleAction('reset-all'),
    triggerAction: handleAction
  };

})(window, document);
