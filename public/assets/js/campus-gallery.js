/**
 * NIT Rourkela - Campus Gallery
 * Featured photo + index of places. Advances on its own while the section is
 * on screen, holds while the visitor hovers or focuses it, and opens the
 * current photo full size (Fancybox when available).
 */
(function () {
  'use strict';

  function initCampusGallery(section) {
    var feature = section.querySelector('.cg-feature');
    var link = section.querySelector('.cg-feature-link');
    var wipe = section.querySelector('.cg-wipe');
    var nameEl = section.querySelector('.cg-caption-name');
    var countEl = section.querySelector('.cg-count');
    var tabs = Array.prototype.slice.call(section.querySelectorAll('.cg-tab'));
    if (!feature || !link || !tabs.length) return;

    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var interval = parseFloat(section.getAttribute('data-interval')) || 6000;
    section.style.setProperty('--cg-interval', interval + 'ms');

    var items = tabs.map(function (tab) {
      return { src: tab.getAttribute('data-src'), name: tab.querySelector('.cg-tab-name').textContent.trim() };
    });

    var current = 0;
    var timer = null;
    var visible = false;
    var held = false;

    // Warm the cache so the wipe never reveals a half-loaded photo
    items.forEach(function (item) { var i = new Image(); i.src = item.src; });

    function show(index, fromUser) {
      index = (index + items.length) % items.length;
      if (index === current && fromUser !== 'init') return;
      var item = items[index];
      var previous = link.querySelector('.cg-layer:not(.is-leaving)');

      tabs.forEach(function (tab, i) {
        var on = i === index;
        tab.setAttribute('aria-selected', on ? 'true' : 'false');
        tab.tabIndex = on ? 0 : -1;
      });

      if (fromUser !== 'init') {
        var next = document.createElement('img');
        next.className = 'cg-layer';
        next.alt = item.name + ', NIT Rourkela';
        next.src = item.src;
        if (!reduceMotion) {
          next.classList.add('is-entering');
          wipe.classList.remove('is-running');
          void wipe.offsetWidth; // restart the sweep
          wipe.classList.add('is-running');
        }
        link.appendChild(next);
        if (previous) previous.classList.add('is-leaving');

        var cleanup = function () {
          next.classList.remove('is-entering');
          link.querySelectorAll('.cg-layer.is-leaving').forEach(function (el) { el.remove(); });
        };
        if (reduceMotion) cleanup(); else setTimeout(cleanup, 1000);
      }

      link.href = item.src;
      link.setAttribute('aria-label', 'Open full-size photo: ' + item.name);
      nameEl.textContent = item.name;
      countEl.textContent = (index + 1) + ' / ' + items.length;
      current = index;

      // Keep the active place in view on the horizontal mobile strip
      var activeTab = tabs[index];
      var list = activeTab.closest('.cg-index');
      if (list && list.scrollWidth > list.clientWidth) {
        list.scrollTo({ left: activeTab.parentNode.offsetLeft - 16, behavior: reduceMotion ? 'auto' : 'smooth' });
      }

      restart();
    }

    function canPlay() {
      return !reduceMotion && visible && !held;
    }

    function restart() {
      clearTimeout(timer);
      section.classList.remove('is-playing');
      if (reduceMotion || !visible) return;
      void section.offsetWidth; // restart the progress rule
      section.classList.add('is-playing');
      if (canPlay()) timer = setTimeout(function () { show(current + 1); }, interval);
    }

    function hold(on) {
      held = on;
      section.classList.toggle('is-held', on);
      if (on) {
        clearTimeout(timer);
      } else if (canPlay()) {
        // Resume with a fresh full interval
        restart();
      }
    }

    tabs.forEach(function (tab, i) {
      tab.addEventListener('click', function () { show(i, true); });
      tab.addEventListener('keydown', function (e) {
        var key = e.key;
        var target = null;
        if (key === 'ArrowDown' || key === 'ArrowRight') target = current + 1;
        else if (key === 'ArrowUp' || key === 'ArrowLeft') target = current - 1;
        else if (key === 'Home') target = 0;
        else if (key === 'End') target = items.length - 1;
        if (target === null) return;
        e.preventDefault();
        show(target, true);
        tabs[current].focus();
      });
    });

    var stage = section.querySelector('.cg-stage');
    stage.addEventListener('mouseenter', function () { hold(true); });
    stage.addEventListener('mouseleave', function () { hold(false); });
    stage.addEventListener('focusin', function () { hold(true); });
    stage.addEventListener('focusout', function (e) {
      if (!stage.contains(e.relatedTarget)) hold(false);
    });

    link.addEventListener('click', function (e) {
      if (!window.jQuery || !window.jQuery.fancybox) return; // plain link to the image
      e.preventDefault();
      window.jQuery.fancybox.open(
        items.map(function (item) { return { src: item.src, opts: { caption: item.name } }; }),
        { loop: true, buttons: ['zoom', 'slideShow', 'fullScreen', 'thumbs', 'close'] },
        current
      );
    });

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        visible = entries[0].isIntersecting;
        restart();
      }, { threshold: 0.35 }).observe(stage);
    } else {
      visible = true;
    }

    show(0, 'init');
  }

  function initAll() {
    document.querySelectorAll('.cg-section').forEach(initCampusGallery);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAll);
  } else {
    initAll();
  }
})();
