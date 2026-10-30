/**
 * ACHIEVEMENTS Showcase Controller
 * Design: Inspired by Screen Recording fasa (Dark Luxury Split Editorial)
 * Brand Color Palette: Cinnamon Red (#771D1D, #A72626, #D75151, #FAAAAA, #FCDADA)
 * Features:
 * - Unified Faculty & Student achievements in one showcase
 * - Interactive Toolbar filter: [ ALL | FACULTY | STUDENT ]
 * - Rock-solid zero-shaking layout with strict 4:3 ratio media cards
 * - Signature red circular outline ring arrow buttons & counter
 */

(function () {
  'use strict';

  const achievementsData = [
    // Faculty Achievements (600x450 - 4:3 Aspect Ratio)
    {
      id: "fac-1",
      category: "faculty",
      categoryLabel: "RESEARCH & ADVANCED GRANTS",
      name: "NIT Rourkela Secures Over ₹8.50 Crore in ANRF Advanced Research Grants",
      description:
        "Faculty members have secured over ₹8.50 Crore in prestigious Advanced Research Grants from the Anusandhan National Research Foundation (ANRF), driving cutting-edge translational investigations across engineering and physical sciences.",
      image: "docs/AwardsAchievements/fac-ANRF.webp",
      badge: "ANRF Excellence",
      knowMoreUrl: "/Home/FacultyAwards/?id=31",
      allUrl: "/Home/FacultyAwards/?id=0",
    },
    {
      id: "fac-2",
      category: "faculty",
      categoryLabel: "GLOBAL SCHOLARLY DISTINCTION",
      name: "69 Faculty Members from NIT Rourkela Featured in SciRank Global's Top 5% Scientists List",
      description:
        "69 distinguished faculty members from NIT Rourkela have been recognized and featured in the SciRank Global World's Top 5% Scientists List, affirming the institute's prolific research productivity and global citation impact.",
      image: "docs/AwardsAchievements/fa-SciRank.webp",
      badge: "Top 5% Scientists",
      knowMoreUrl: "/Home/FacultyAwards/?id=29",
      allUrl: "/Home/FacultyAwards/?id=0",
    },
    {
      id: "fac-3",
      category: "faculty",
      categoryLabel: "NATIONAL ACADEMY FELLOWSHIP",
      name: "NIT Rourkela Scientist Honoured with INSA Associate Fellowship!",
      description:
        "Distinguished scientist and faculty member from NIT Rourkela has been conferred the prestigious Indian National Science Academy (INSA) Associate Fellowship for pioneering scientific innovations and leadership in fundamental research.",
      image: "docs/AwardsAchievements/fac-award-insa.webp",
      badge: "INSA Fellowship",
      knowMoreUrl: "/Home/FacultyAwards/?id=27",
      allUrl: "/Home/FacultyAwards/?id=0",
    },
    {
      id: "fac-4",
      category: "faculty",
      categoryLabel: "EARLY CAREER RESEARCH HONORS",
      name: "PMECRG Awarded to Early-Career Faculty Members of NIT Rourkela!",
      description:
        "Prime Minister's Early Career Research Grants (PMECRG) awarded to faculty members of NIT Rourkela, providing vital national support to spearhead high-priority technology missions and foundational research.",
      image: "docs/AwardsAchievements/fac-PMECRG.webp",
      badge: "PMECRG Award",
      knowMoreUrl: "/Home/FacultyAwards/?id=26",
      allUrl: "/Home/FacultyAwards/?id=0",
    },

    // Student Achievements (600x450 - 4:3 Aspect Ratio)
    {
      id: "std-1",
      category: "student",
      categoryLabel: "INTERNATIONAL SCHOLAR AWARD",
      name: "Ph.D. Scholar Receives Prestigious IEEE IAS Student Travel Award",
      description:
        "A doctoral researcher from NIT Rourkela was selected for the globally prestigious IEEE Industry Applications Society (IAS) Student Travel Award, enabling international presentation of novel high-efficiency power systems research.",
      image: "docs/AwardsAchievements/std-award12.webp",
      badge: "IEEE IAS Award",
      knowMoreUrl: "/Home/StudentAchievements/?id=32",
      allUrl: "/Home/StudentAchievements/?id=0",
    },
    {
      id: "std-2",
      category: "student",
      categoryLabel: "NATIONAL DESIGN CHAMPIONSHIP",
      name: "NIT Rourkela Students Win Multiple Awards at BTTD-2026",
      description:
        "Student innovators and engineers from NIT Rourkela demonstrated extraordinary technical prowess by sweeping multiple accolades and top podium finishes at the BTTD-2026 technological design convention.",
      image: "docs/AwardsAchievements/std-BTTD-2026.webp",
      badge: "BTTD-2026 Champions",
      knowMoreUrl: "/Home/StudentAchievements/?id=30",
      allUrl: "/Home/StudentAchievements/?id=0",
    },
    {
      id: "std-3",
      category: "student",
      categoryLabel: "GLOBAL AEROSPACE DELEGATION",
      name: "MTech Students Selected as 'Delegates' under IEEE SPACE 2026!",
      description:
        "Postgraduate MTech scholars from NIT Rourkela were chosen as official institute delegates under the IEEE SPACE 2026 program, recognizing their technical publications and contributions in signal processing and communications.",
      image: "docs/AwardsAchievements/std-award210426.webp",
      badge: "IEEE SPACE 2026",
      knowMoreUrl: "/Home/StudentAchievements/?id=24",
      allUrl: "/Home/StudentAchievements/?id=0",
    },
    {
      id: "std-4",
      category: "student",
      categoryLabel: "NATIONAL ROBOTICS CHAMPIONSHIP",
      name: "NIT Rourkela Team Wins First Prize at 'Robofest Gujarat 5.0'",
      description:
        "The student robotics club of NIT Rourkela clinched the First Prize trophy at the prestigious national-level 'Robofest Gujarat 5.0' robotics competition, showcasing exceptional autonomous engineering and precision design.",
      image: "docs/AwardsAchievements/RobofestGujarat5.0.webp",
      badge: "1st Prize Robofest",
      knowMoreUrl: "/Home/StudentAchievements/?id=23",
      allUrl: "/Home/StudentAchievements/?id=0",
    },
  ];

  function pad(num) {
    return num < 10 ? '0' + num : '' + num;
  }

  function initAchievementsShowcase() {
    const section = document.getElementById('achievements-section');
    if (!section) return;

    const cardsTrack = document.getElementById('fasa-cards-track');
    const headlineEl = document.getElementById('fasa-headline');
    const descEl = document.getElementById('fasa-description');
    const storyWrap = section.querySelector('.fasa-story-wrap');
    const knowmoreBtn = document.getElementById('fasa-knowmore-btn');
    const allLink = document.getElementById('fasa-all-link');
    const categoryTag = document.getElementById('fasa-category-tag');
    const prevBtn = document.getElementById('fasa-prev-btn');
    const nextBtn = document.getElementById('fasa-next-btn');
    const countCurrent = document.getElementById('fasa-counter-current');
    const countTotal = document.getElementById('fasa-counter-total');
    const playpauseBtn = document.getElementById('fasa-playpause-btn');
    const toolbarBtns = section.querySelectorAll('.fasa-toolbar-btn');

    let currentCategory = 'all';
    let currentIndex = 0;
    let filteredList = achievementsData;
    let autoTimer = null;
    let isPlaying = true;
    const INTERVAL = 5000;

    function getFiltered() {
      if (currentCategory === 'all') return achievementsData;
      return achievementsData.filter(item => item.category === currentCategory);
    }

    // Populate the horizontal 4:3 cards track
    function buildTrackCards() {
      if (!cardsTrack) return;
      filteredList = getFiltered();
      cardsTrack.innerHTML = filteredList.map((item, idx) => `
        <div class="fasa-card-item ${idx === currentIndex ? 'is-active' : ''}" data-index="${idx}" aria-label="${item.name}">
          <img src="${item.image}" alt="${item.name}" loading="lazy" />
          <div class="fasa-card-overlay"></div>
          <div class="fasa-card-tag">${item.badge}</div>
        </div>
      `).join('');

      cardsTrack.querySelectorAll('.fasa-card-item').forEach(card => {
        card.addEventListener('click', () => {
          const idx = parseInt(card.getAttribute('data-index'), 10);
          goToSlide(idx);
          resetAutoTimer();
        });
      });
    }

    // Slide track with zero jumping/shaking
    function updateTrackPosition() {
      if (!cardsTrack) return;
      const cards = cardsTrack.querySelectorAll('.fasa-card-item');
      if (!cards.length) return;

      const cardW = cards[0].offsetWidth || 560;
      const gap = 24;
      const offset = currentIndex * (cardW + gap);

      cardsTrack.style.transform = `translate3d(-${offset}px, 0, 0)`;

      cards.forEach((c, idx) => {
        if (idx === currentIndex) {
          c.classList.add('is-active');
        } else {
          c.classList.remove('is-active');
        }
      });
    }

    // Smoothly update editorial content without height/layout reflow
    function updateEditorialText(item, immediate) {
      if (!item) return;

      function applyText() {
        if (headlineEl) headlineEl.textContent = item.name;
        if (descEl) descEl.textContent = item.description;
        if (categoryTag) categoryTag.textContent = item.categoryLabel;
        if (knowmoreBtn) knowmoreBtn.setAttribute('href', item.knowMoreUrl);
        if (allLink) {
          allLink.setAttribute('href', item.allUrl);
          allLink.textContent = item.category === 'faculty' ? 'View All Faculty Awards →' : 'View All Student Honors →';
        }
      }

      if (immediate || !storyWrap) {
        applyText();
      } else {
        storyWrap.classList.add('is-animating');
        setTimeout(() => {
          applyText();
          storyWrap.classList.remove('is-animating');
        }, 160);
      }

      if (countCurrent) countCurrent.textContent = pad(currentIndex + 1);
      if (countTotal) countTotal.textContent = pad(filteredList.length);
    }

    function goToSlide(idx, immediate = false) {
      if (idx < 0) idx = filteredList.length - 1;
      if (idx >= filteredList.length) idx = 0;
      currentIndex = idx;

      updateTrackPosition();
      updateEditorialText(filteredList[currentIndex], immediate);
    }

    function nextSlide() {
      goToSlide(currentIndex + 1);
    }

    function prevSlide() {
      goToSlide(currentIndex - 1);
    }

    // Auto Playback Timer
    function startAutoTimer() {
      if (autoTimer) clearInterval(autoTimer);
      if (isPlaying) {
        autoTimer = setInterval(nextSlide, INTERVAL);
      }
    }

    function resetAutoTimer() {
      startAutoTimer();
    }

    // Navigation Controls
    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        prevSlide();
        resetAutoTimer();
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        nextSlide();
        resetAutoTimer();
      });
    }

    if (playpauseBtn) {
      playpauseBtn.addEventListener('click', () => {
        isPlaying = !isPlaying;
        if (isPlaying) {
          playpauseBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1"></rect><rect x="14" y="4" width="4" height="16" rx="1"></rect></svg>';
          playpauseBtn.setAttribute('title', 'Pause auto-scroll');
          startAutoTimer();
        } else {
          playpauseBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style="margin-left: 2px;"><polygon points="6 3 20 12 6 21 6 3"></polygon></svg>';
          playpauseBtn.setAttribute('title', 'Play auto-scroll');
          if (autoTimer) clearInterval(autoTimer);
        }
      });
    }

    // Toolbar Filter Selection: All, Faculty, Student
    toolbarBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const cat = btn.getAttribute('data-category');
        if (cat === currentCategory) return;

        toolbarBtns.forEach(b => b.classList.remove('is-active'));
        btn.classList.add('is-active');

        currentCategory = cat;
        currentIndex = 0;
        buildTrackCards();
        goToSlide(0, true);
        resetAutoTimer();
      });
    });

    // Window resize handler
    window.addEventListener('resize', () => {
      updateTrackPosition();
    });

    // Initial setup (immediate = true so text is 100% visible immediately)
    buildTrackCards();
    goToSlide(0, true);
    startAutoTimer();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAchievementsShowcase);
  } else {
    initAchievementsShowcase();
  }
})();
