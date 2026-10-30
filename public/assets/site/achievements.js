/* NIT Rourkela homepage: Achievements (faculty and student), one story at a time.
   The story column and the photograph track move together; the filter shows all,
   faculty or student achievements. Advances every few seconds only while the
   section is on screen, never with reduced motion, and has a visible pause (WCAG 2.2.2). */
(function () {
  'use strict';

  var DATA = [
    { category: 'faculty', label: 'Research & advanced grants', badge: 'ANRF Excellence',
      name: 'NIT Rourkela Secures Over ₹8.50 Crore in ANRF Advanced Research Grants',
      description: 'Faculty members have secured over ₹8.50 Crore in prestigious Advanced Research Grants from the Anusandhan National Research Foundation (ANRF), driving cutting-edge translational investigations across engineering and physical sciences.',
      image: 'docs/AwardsAchievements/fac-ANRF.webp', url: '/Home/FacultyAwards/?id=31' },
    { category: 'faculty', label: 'Global scholarly distinction', badge: 'Top 5% Scientists',
      name: "69 Faculty Members from NIT Rourkela Featured in SciRank Global's Top 5% Scientists List",
      description: "69 distinguished faculty members from NIT Rourkela have been recognized and featured in the SciRank Global World's Top 5% Scientists List, affirming the institute's prolific research productivity and global citation impact.",
      image: 'docs/AwardsAchievements/fa-SciRank.webp', url: '/Home/FacultyAwards/?id=29' },
    { category: 'faculty', label: 'National academy fellowship', badge: 'INSA Fellowship',
      name: 'NIT Rourkela Scientist Honoured with INSA Associate Fellowship!',
      description: 'Distinguished scientist and faculty member from NIT Rourkela has been conferred the prestigious Indian National Science Academy (INSA) Associate Fellowship for pioneering scientific innovations and leadership in fundamental research.',
      image: 'docs/AwardsAchievements/fac-award-insa.webp', url: '/Home/FacultyAwards/?id=27' },
    { category: 'faculty', label: 'Early career research honors', badge: 'PMECRG Award',
      name: 'PMECRG Awarded to Early-Career Faculty Members of NIT Rourkela!',
      description: "Prime Minister's Early Career Research Grants (PMECRG) awarded to faculty members of NIT Rourkela, providing vital national support to spearhead high-priority technology missions and foundational research.",
      image: 'docs/AwardsAchievements/fac-PMECRG.webp', url: '/Home/FacultyAwards/?id=26' },
    { category: 'student', label: 'International scholar award', badge: 'IEEE IAS Award',
      name: 'Ph.D. Scholar Receives Prestigious IEEE IAS Student Travel Award',
      description: 'A doctoral researcher from NIT Rourkela was selected for the globally prestigious IEEE Industry Applications Society (IAS) Student Travel Award, enabling international presentation of novel high-efficiency power systems research.',
      image: 'docs/AwardsAchievements/std-award12.webp', url: '/Home/StudentAchievements/?id=32' },
    { category: 'student', label: 'National design championship', badge: 'BTTD-2026 Champions',
      name: 'NIT Rourkela Students Win Multiple Awards at BTTD-2026',
      description: 'Student innovators and engineers from NIT Rourkela demonstrated extraordinary technical prowess by sweeping multiple accolades and top podium finishes at the BTTD-2026 technological design convention.',
      image: 'docs/AwardsAchievements/std-BTTD-2026.webp', url: '/Home/StudentAchievements/?id=30' },
    { category: 'student', label: 'Global aerospace delegation', badge: 'IEEE SPACE 2026',
      name: "MTech Students Selected as 'Delegates' under IEEE SPACE 2026!",
      description: 'Postgraduate MTech scholars from NIT Rourkela were chosen as official institute delegates under the IEEE SPACE 2026 program, recognizing their technical publications and contributions in signal processing and communications.',
      image: 'docs/AwardsAchievements/std-award210426.webp', url: '/Home/StudentAchievements/?id=24' },
    { category: 'student', label: 'National robotics championship', badge: '1st Prize Robofest',
      name: "NIT Rourkela Team Wins First Prize at 'Robofest Gujarat 5.0'",
      description: "The student robotics club of NIT Rourkela clinched the First Prize trophy at the prestigious national-level 'Robofest Gujarat 5.0' robotics competition, showcasing exceptional autonomous engineering and precision design.",
      image: 'docs/AwardsAchievements/RobofestGujarat5.0.webp', url: '/Home/StudentAchievements/?id=23' }
  ];
  var ALL = { faculty: { href: '/Home/FacultyAwards/?id=0', text: 'View All Faculty Awards' },
              student: { href: '/Home/StudentAchievements/?id=0', text: 'View All Student Honors' } };
  var INTERVAL = 6000;

  var section = document.getElementById('achievements-section');
  if (!section) return;
  var $ = function (id) { return document.getElementById(id); };
  var track = $('achTrack'), copy = $('achCopy'), head = $('achHeadline'), desc = $('achDesc'), kicker = $('achKicker');
  var more = $('achMore'), all = $('achAll'), cur = $('achCurrent'), tot = $('achTotal'), pauseBtn = $('achPause');
  var filters = Array.prototype.slice.call(section.querySelectorAll('[data-category]'));
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var list = DATA, index = 0, timer = null, playing = !reduced, visible = false, held = false;

  function build() {
    track.innerHTML = list.map(function (d, i) {
      return '<li data-i="' + i + '"><img src="' + d.image + '" alt="' + d.name.replace(/"/g, '&quot;') + '" loading="lazy" width="600" height="450"/><span>' + d.badge + '</span></li>';
    }).join('');
    tot.textContent = list.length;
  }
  function render(instant) {
    var d = list[index];
    function apply() {
      head.textContent = d.name; desc.textContent = d.description; kicker.textContent = d.label;
      more.href = d.url; all.href = ALL[d.category].href; all.textContent = ALL[d.category].text;
      cur.textContent = index + 1;
    }
    if (instant || reduced) apply();
    else { copy.classList.add('is-switching'); setTimeout(function () { apply(); copy.classList.remove('is-switching'); }, 220); }
    var items = track.children;
    for (var i = 0; i < items.length; i++) items[i].classList.toggle('is-active', i === index);
    var first = items[0];
    var step = first ? first.getBoundingClientRect().width + 20 : 0;
    track.style.transform = 'translate3d(' + (-index * step) + 'px,0,0)';
  }
  function go(i, instant) { index = (i + list.length) % list.length; render(instant); restart(); }
  function restart() {
    clearTimeout(timer);
    if (playing && visible && !held) timer = setTimeout(function () { go(index + 1); }, INTERVAL);
  }
  function setPlaying(on) {
    playing = on;
    pauseBtn.setAttribute('aria-pressed', String(!on));
    pauseBtn.setAttribute('aria-label', on ? 'Pause automatic advance' : 'Play automatic advance');
    pauseBtn.querySelector('use').setAttribute('href', on ? '#i-pause' : '#i-play-arrow');
    restart();
  }

  $('achPrev').addEventListener('click', function () { go(index - 1); });
  $('achNext').addEventListener('click', function () { go(index + 1); });
  pauseBtn.addEventListener('click', function () { setPlaying(!playing); });
  track.addEventListener('click', function (e) { var li = e.target.closest('li'); if (li) go(parseInt(li.dataset.i, 10)); });
  filters.forEach(function (b) {
    b.addEventListener('click', function () {
      var c = b.dataset.category;
      filters.forEach(function (x) { var on = x === b; x.classList.toggle('is-on', on); x.setAttribute('aria-pressed', String(on)); });
      list = c === 'all' ? DATA : DATA.filter(function (d) { return d.category === c; });
      index = 0; build(); render(true); restart();
    });
  });
  section.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') { held = true; restart(); } });
  section.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse') { held = false; restart(); } });
  section.addEventListener('focusin', function () { held = true; restart(); });
  section.addEventListener('focusout', function (e) { if (!section.contains(e.relatedTarget)) { held = false; restart(); } });
  window.addEventListener('resize', function () { render(true); });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (en) { visible = en[0].isIntersecting; restart(); }, { threshold: .3 }).observe(section);
  } else visible = true;

  build();
  render(true);
  setPlaying(playing);
})();
