/* ==========================================================================
   NIT Rourkela - Latest News "Newsroom"
   Ticker loop, quick-view modal, card tilt and scroll animations.
   ========================================================================== */
(function () {
    var root = document.getElementById('newsroom');
    var modal = document.getElementById('nr-modal');
    if (!root || !modal) return;

    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    var cards = Array.prototype.slice.call(root.querySelectorAll('.nr-card'));

    // Keep the modal out of any transformed ancestor so position: fixed works.
    document.body.appendChild(modal);

    /* Ticker: duplicate the headlines so the loop is seamless */
    var tickerList = root.querySelector('.nr-ticker-list');
    if (tickerList) {
        Array.prototype.forEach.call(tickerList.children, function (li) {
            var copy = li.cloneNode(true);
            copy.setAttribute('aria-hidden', 'true');
            copy.querySelector('button').setAttribute('tabindex', '-1');
            tickerList.appendChild(copy);
        });
    }

    /* Quick-view modal */
    var stories = cards.map(function (card) {
        return {
            title: card.querySelector('h3').textContent.trim(),
            tag: card.getAttribute('data-nr-tag'),
            img: card.getAttribute('data-nr-img'),
            link: card.getAttribute('data-nr-link'),
            summary: card.getAttribute('data-nr-summary')
        };
    });

    var els = {
        img: document.getElementById('nr-modal-img'),
        tag: document.getElementById('nr-modal-tag'),
        count: document.getElementById('nr-modal-count'),
        title: document.getElementById('nr-modal-title'),
        summary: document.getElementById('nr-modal-summary'),
        link: document.getElementById('nr-modal-link'),
        panel: modal.querySelector('.nr-modal-panel')
    };
    var current = 0;
    var lastFocus = null;

    function fill(i) {
        var s = stories[i];
        els.img.src = s.img;
        els.img.alt = s.title;
        els.tag.textContent = s.tag;
        els.count.textContent = (i + 1) + ' / ' + stories.length;
        els.title.textContent = s.title;
        els.summary.textContent = s.summary;
        els.link.href = s.link;
    }

    function show(i) {
        current = (i + stories.length) % stories.length;
        if (modal.hidden || reduceMotion) {
            fill(current);
            return;
        }
        modal.classList.add('is-switching');
        setTimeout(function () {
            fill(current);
            modal.classList.remove('is-switching');
        }, 220);
    }

    function open(i) {
        lastFocus = document.activeElement;
        fill((current = i));
        modal.hidden = false;
        document.body.classList.add('nr-lock');
        requestAnimationFrame(function () {
            modal.classList.add('is-open');
            els.panel.focus();
        });
    }

    function close() {
        modal.classList.remove('is-open');
        document.body.classList.remove('nr-lock');
        setTimeout(function () { modal.hidden = true; }, reduceMotion ? 0 : 350);
        if (lastFocus) lastFocus.focus();
    }

    root.addEventListener('click', function (e) {
        var trigger = e.target.closest('[data-nr-open]');
        if (!trigger) return;
        e.preventDefault();
        open(parseInt(trigger.getAttribute('data-nr-open'), 10));
    });

    modal.addEventListener('click', function (e) {
        if (e.target.closest('[data-nr-close]')) close();
        var step = e.target.closest('[data-nr-step]');
        if (step) show(current + parseInt(step.getAttribute('data-nr-step'), 10));
    });

    document.addEventListener('keydown', function (e) {
        if (modal.hidden) return;
        if (e.key === 'Escape') close();
        else if (e.key === 'ArrowRight') show(current + 1);
        else if (e.key === 'ArrowLeft') show(current - 1);
        else if (e.key === 'Tab') {
            // Keep focus inside the dialog
            var f = modal.querySelectorAll('button, a[href]');
            var first = f[0], last = f[f.length - 1];
            if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
            else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
        }
    });

    /* 3D tilt + glare on hover */
    if (finePointer && !reduceMotion) {
        cards.forEach(function (card) {
            var max = card.classList.contains('nr-featured') ? 4 : 8;
            card.addEventListener('pointermove', function (e) {
                var r = card.getBoundingClientRect();
                var x = (e.clientX - r.left) / r.width;
                var y = (e.clientY - r.top) / r.height;
                card.style.transform = 'translateY(-6px) rotateX(' + ((0.5 - y) * max) + 'deg) rotateY(' + ((x - 0.5) * max) + 'deg)';
                card.style.setProperty('--nr-gx', (x * 100) + '%');
                card.style.setProperty('--nr-gy', (y * 100) + '%');
            });
            card.addEventListener('pointerleave', function () {
                card.style.transition = 'transform 0.6s cubic-bezier(.2,.8,.2,1), box-shadow 0.4s ease, border-color 0.4s ease';
                card.style.transform = '';
                setTimeout(function () { card.style.transition = ''; }, 600);
            });
        });
    }

    /* Scroll animations */
    if (reduceMotion || !window.gsap || !window.ScrollTrigger) return;
    gsap.registerPlugin(ScrollTrigger);

    var head = gsap.timeline({ scrollTrigger: { trigger: root, start: 'top 80%', once: true } });
    head.from(root.querySelector('.nr-eyebrow'), { y: 20, opacity: 0, duration: 0.5, ease: 'power2.out' })
        .from(root.querySelector('.nr-title'), { y: 40, opacity: 0, duration: 0.7, ease: 'power3.out' }, '-=0.25')
        .fromTo(root.querySelector('.nr-title'), { '--nr-underline': 0 }, { '--nr-underline': 1, duration: 0.8, ease: 'power2.inOut' }, '-=0.3')
        .from(root.querySelector('.nr-viewall'), { x: 30, opacity: 0, duration: 0.5, ease: 'power2.out' }, '-=0.7')
        .fromTo(root.querySelector('.nr-ticker'), { clipPath: 'inset(0 100% 0 0 round 0px)' }, { clipPath: 'inset(0 0% 0 0 round 0px)', duration: 0.9, ease: 'power3.inOut' }, '-=0.4');

    // Featured story: image wipes in, text follows
    var featured = root.querySelector('.nr-featured');
    if (featured) {
        gsap.timeline({ scrollTrigger: { trigger: featured, start: 'top 82%', once: true } })
            .from(featured, { y: 60, opacity: 0, duration: 0.8, ease: 'power3.out', clearProps: 'transform,opacity' })
            .fromTo(featured.querySelector('.nr-media'), { clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0% 0)', duration: 1, ease: 'power3.inOut' }, '-=0.6')
            .from(featured.querySelectorAll('.nr-body > *'), { y: 24, opacity: 0, duration: 0.5, stagger: 0.1, ease: 'power2.out', clearProps: 'transform,opacity' }, '-=0.6');
    }

    // Remaining cards rise in with a staggered 3D flip
    gsap.set(root.querySelectorAll('.nr-card:not(.nr-featured)'), { opacity: 0 });
    ScrollTrigger.batch(root.querySelectorAll('.nr-card:not(.nr-featured)'), {
        start: 'top 88%',
        once: true,
        onEnter: function (batch) {
            gsap.fromTo(batch,
                { y: 70, opacity: 0, rotateX: 14, transformOrigin: '50% 100%' },
                { y: 0, opacity: 1, rotateX: 0, duration: 0.9, stagger: 0.14, ease: 'power3.out', clearProps: 'transform,opacity' });
        }
    });
    // Gentle parallax drift on the featured image while scrolling
    if (featured) {
        gsap.fromTo(featured.querySelector('.nr-media'), { '--nr-drift': '-18px' }, {
            '--nr-drift': '18px',
            ease: 'none',
            scrollTrigger: { trigger: featured, start: 'top bottom', end: 'bottom top', scrub: true }
        });
    }
})();
