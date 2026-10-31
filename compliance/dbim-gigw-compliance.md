# NIT Rourkela website: DBIM 3.0 and GIGW 3.0 compliance matrix

Checked on 30 October 2026 against:

- the **Digital Brand Identity Manual (DBIM) 3.0**, Annexure F, checklist F.1 (43 items, generic, applicable to all government organisations);
- the **GIGW 3.0 Compliance and Certification Handbook**, section 6.1 (Quality, Accessibility, Security and Lifecycle Management).

The files are `nitrdesign_km/nitrkl/` (homepage `index.html`; pages built by `nitrdesign_km/tools/build_pages.py`).

Status key:

- **Done:** met by the website as built.
- **Partial:** met except for a point noted.
- **Institute:** needs a decision, a document, an account or an audit that only NIT Rourkela can provide.

Checklist F.2 is written for Ministry and Department websites. NIT Rourkela is an institute under the Ministry of Education, so F.2 and Annexure A were used as guidance, not as a checklist.

## DBIM 3.0, checklist F.1

| # | Requirement | Status | How |
|---|---|---|---|
| **A** | **Colours** | | |
| 1 | One colour group from the primary palette | Done | Cinnamon Red only: `#771D1D`, `#A72626`, `#D75151`, `#FAAAAA`, `#FCDADA`. The old terracotta, teal, plum, gold, amber and paper colours are removed from every stylesheet and script (`assets/site/site.css` tokens). |
| 2 | Other colours from the functional palette | Done | Linen `#EBEAEA`, White, Deep Earthy Brown `#150202`, greys `#C6C6C6`, `#8E8E8E` and `#606060`, and the status colours. The social media panel's blue and slate gradient and its brand colours now use the Cinnamon group. |
| 3 | Icons in the key colour or white | Done | Inline SVG icons use `currentColor`: Cinnamon on light fields, white on dark ones. |
| 4 | Footer in the key colour (darkest shade) | Done | `#771D1D`. |
| **B** | **Iconography** | | |
| 5 | One consistent icon style | Done | Material Symbols Outlined, the set the DBIM Toolkit itself uses. Bootstrap Icons and Font Awesome are no longer loaded. |
| 6 | Icons from the DBIM Toolkit set | Done | Same family as the Toolkit. The social brand marks (X, Facebook, Instagram, YouTube, LinkedIn) are not in the Toolkit, so they come from Font Awesome Free (CC BY 4.0). |
| 7 | PNG, SVG or WEBP | Done | One inline SVG sprite (`<svg class="icon-sprite">` at the top of `<body>`). |
| 8 | Sizes 24, 32, 48 or 64 px | Done | `.ic { width: 24px; height: 24px }`. |
| 9 | Proportions kept | Done | The symbols keep their own `viewBox`. |
| 10 | Contrast for icons on images | Done | The hero's play and pause icons sit on a dark rail. |
| **C** | **Typography** | | |
| 11 | Noto Sans | Done | Noto Sans, Noto Sans Devanagari and Noto Sans Oriya. Headings use the same family at a condensed width. |
| 12 | Left-aligned text; tables with text left, numbers right, column names centred | Done | `.doc-table thead th { text-align: center }` and `td.num` right-aligned. |
| 13 | No capital case for long sentences | Done | News headlines, story titles, notice titles and achievement headings are now in sentence case. Capitals remain only on short section titles. |
| 14 | DBIM type scale | Done | Desktop 36/24/20/16/14/12 px; mobile (767 px and below) 24/20/16/14/12/10 px; line height 1.2 to 1.5; headings in Bold. Measured in the browser: no visible text is off the scale. The one-screen sections step down the scale on short laptop screens rather than using in-between sizes. |
| 15 | Text colour and contrast | Done | axe (WCAG 2.2 AA): 0 failures on all five pages at 1440 and 390 px. |
| 16 | Consistent buttons, uniform padding | Done | One `.btn` (48 px high, 12 × 22 px padding) with `--ink`, `--light` and `--line` variants. |
| 17 | Distinct enabled, hover, focus and disabled states | Done | Hover changes the fill, focus shows a 3 px ring, and `:disabled` turns the button grey. |
| 18 | Noticeable hover on clickable items | Done | |
| **D** | **Header and footer** | | |
| 19–20 | State Emblem | Not applicable | NIT Rourkela uses Lockup 3B (logo and name). If the institute is authorised to use the State Emblem, switch to Lockup 3A. |
| 21 | Website naming | Done | "National Institute of Technology Rourkela", with the name in Hindi and Odia. |
| 22 | Lockup black on white | Done | Logo and name in ink on white. The Hindi and Odia lines were Cinnamon and are now ink. |
| 23 | Header components for the organisation type | Done | Header 3 (Figure 31): lockup, highlighted search bar, user controls and global navigation. The header and navigation are sticky. |
| 24 | All header subcomponents enabled | Done | User controls in the top bar: **Skip to main content**, **Screen Reader Access**, **अ \| A** language selection and **Accessibility controls** (opens the same panel as the floating button). |
| 25 | Footer elements and lineage | Done | Useful links (Website Policies, Sitemap, Related Links, Help, FAQs, Feedback, Contact Us), Related links (including the National Portal of India), social media, Last updated on, the lineage line and the policies row. Archives: see Institute items. |
| **E** | **Logo** | | |
| 26–29 | Accurate logos, proportions, format, under 100 KB | Done | `seal.svg` is 87 KB; the government logos are 7 to 17 KB. |
| **F** | **Imagery** | | |
| 29–30 | Background and banner images under 500 KB | Done | The largest banner is 376 KB. |
| 31 | Thumbnails under 100 KB | Done | `gallery9.webp` (186 to 82 KB) and `Companypic.webp` (180 to 41 KB) were recompressed. The originals are kept outside the site. |
| 32 | High-resolution images under 5 MB | Done | |
| 33 | JPG, PNG or WEBP | Done | |
| 34 | Thumbnails with a view option | Done | The footer gallery opens each picture full size. |
| 35 | Permissions; no third-party watermarks | Institute | Confirm the rights to every photograph. |
| 36 | Headshots as defined (1:1, white background) | Institute | The Director's photograph needs a DBIM-style headshot from the institute. This was set aside on 20 October 2026. |
| **G** | **Content** | | |
| 37 | No spelling or grammatical errors | Partial | Text added in this pass is in British English. The institute's own content was not rewritten (the brief keeps content unchanged) and needs an editorial review. |
| 38 | Central Content Publishing System (CCPS) integrated | Institute | CCPS needs an API subscription by the designated official on the DBIM Toolkit. Once the feed exists, the CCPS banner goes in as the hero carousel's first slide (one more `.hero-slide` and thumbnail button). |
| 39 | Consent in the user's preferred language | Done | The cookie banner is in English and Hindi. |
| 40 | Cookie banner at the bottom with accept, reject and customise | Done | Choices are stored in `localStorage` (`nitrkl-consent`). Google Translate, the only non-essential cookie, loads only after consent. **Cookie settings** in the footer reopens the banner. A cookie policy is on `website-policies.html#cookies`. |
| **H** | **Search** | | |
| 41 | Search is working | Done | The header search goes to `search.html`, which queries the site index (`/api/search`, the same index as the chatbot). The live site's `/Search` did not respond. |
| 42 | Results across HTML, PDF and image metadata | Partial | HTML pages and PDFs are indexed; image metadata is not. Empty queries get help and common searches; queries with no matching page say so and list related pages. |
| **I** | **Performance** | | |
| 43 | Responsive | Done | Checked at 1920, 1536, 1440, 1366, 1280, 768 and 390 px wide. The one-screen sections fit at 1366 × 657, 1280 × 720, 1366 × 768, 1536 × 730, 1536 × 864, 1440 × 900 and 1920 × 1080. The hero film went from 33.8 MB to 8.9 MB (1600 px wide, no audio track). Images are lazy-loaded. |

## GIGW 3.0 compliance matrix (Handbook 6.1)

### Quality

| # | Requirement | Status | Notes |
|---|---|---|---|
| 1 | Association with the government shown | Done | Lineage line and Ministry of Education links. |
| 2 | Ownership on the homepage and every page | Done | Same header and footer on every page (`build_pages.py`). |
| 3–4 | Sources and copyright permissions | Institute | |
| 5 | Last updated date on the homepage | Done | Footer, from the page's own modification date. |
| 6 | Title, size and format for downloads | Done | PDF links show "(PDF, size)". |
| 7 | Title, language, purpose and validity for notices | Partial | Titles and dates are shown. Validity has to come from the institute's data. |
| 8 | Outdated items archived | Institute | Needs the Content Archival Policy (draft in `gigw-policy-drafts.md`) and an archive section. |
| 9 | About Us | Done | |
| 10 | Contact Us linked from the homepage | Done | |
| 11 | Online feedback with timely responses | Partial | The Feedback link goes to Contact Us, as on the live site. An online form with a response process is an institute decision. |
| 12 | Prominent link to the National Portal | Done | Footer, Related links: National Portal of India. |
| 13 | Tested on browsers; Hindi and regional fonts | Done | Chromium-based browsers tested; Devanagari and Odia render in Noto Sans. Test Firefox and Safari before launch. |
| 14 (Help) | Help section linked from every page | Done | New `help.html`, linked in every footer. |
| 14 (CSS) | Layout in CSS; responsive | Done | |
| 16 | Readable without style sheets | Done | Content order is the reading order, and icons have zero size without CSS. |
| 17 | Page title, language, metadata | Done | `lang="en"`, a descriptive `<title>` per page, and a description. |
| 18 | Minimum homepage content | Done | |
| 19 | Data tables marked up | Done | `<caption>`, `<th scope>`. |
| 20 | Prints on A4 | Done | New `@media print` stylesheet. |
| 21 | Integration with government platforms (India Portal, DigiLocker, MyGov) | Partial | Links to MyGov, Digital India, data.gov.in and india.gov.in. API integrations are institute decisions. |
| 22 | Consistent identity across the institute's websites | Institute | Department and centre sites should adopt the same tokens. |
| 23 | Social media integration | Done | X, Facebook, Instagram, YouTube and LinkedIn in the header, footer and Social Media section. |
| 24 | gov.in, nic.in or ac.in domain | Done | nitrkl.ac.in. |
| 25 | No spelling or grammar errors | Partial | See DBIM item 37. |

### Accessibility (WCAG 2.1 AA; checked with axe at WCAG 2.2 AA)

| # | Requirement | Status | Notes |
|---|---|---|---|
| 1 | Text alternatives | Done | Alt text is at most 140 characters and no longer says "Photo" or "Website Photo". Decorative images use `alt=""`. |
| 2–6 | Media alternatives and captions | Partial | The hero film is silent and decorative (the audio track was removed) and has a text label. Captions or transcripts are needed for any future video with speech. |
| 7–11 | Structure, reading order, orientation, input purpose | Done | |
| 12–19 | Colour, contrast, resize, reflow, text spacing | Done | axe reports 0 failures. The accessibility panel changes text size, line height and letter spacing. |
| 20 | Hover and focus content | Done | Menus close with Esc and stay open while hovered. |
| 21–23 | Keyboard, no keyboard trap, shortcuts | Done | |
| 24–25 | Timing; pause, stop or hide | Done | The hero carousel and achievements track have pause controls. The social panel's pulsing dot now stops after 3 cycles (under 6 seconds). |
| 26 | No flashing | Done | |
| 27 | Bypass blocks | Done | A skip link is the first tab stop and a visible **Skip to main content** is in the header. |
| 28–33 | Titles, focus order, link purpose, multiple ways, headings, visible focus | Done | Multiple ways: menu, search, sitemap and breadcrumbs on the inner pages. |
| 34–37 | Pointer and motion | Done | |
| 38–39 | Language of page and parts | Done | `lang="hi"` and `lang="or"` on Hindi and Odia text. |
| 40–43 | Predictable | Done | |
| 44–47 | Input assistance | Done | Search and cookie forms have labels; the chat has a label. |
| 48–50 | Parsing, name, role, value, status messages | Done | Search results use `role="status"`; the chat log is `aria-live`. |

### Security

| # | Requirement | Status | Notes |
|---|---|---|---|
| 1 | Security audit by NIC, STQC or a CERT-In empanelled auditor before hosting | Institute | Required before launch. |
| 2 | Secure hosting (confidentiality, integrity, availability) in a data centre in India | **Not met** | The Vercel deployment in `deploy/` is served over HTTPS with `nosniff`, `Referrer-Policy` and `X-Frame-Options` headers, but its function runs in the USA. GIGW 3.0's checklist (8.2.1) requires hosting in a data centre in India, with disaster recovery and 24x7 support. Before an official launch, host on NIC or another data centre in India. |
| 3 | Security Policy, Privacy Policy, Contingency Management Plan | Institute | Drafts are in `gigw-policy-drafts.md`; the Privacy Policy already exists. |

### Lifecycle management

| # | Requirement | Status | Notes |
|---|---|---|---|
| 1 | Web Information Manager nominated | Institute | Draft in `gigw-policy-drafts.md`. |
| 2 | URL on stationery and advertisements | Institute | |
| 3 | Policies approved by the WIM (copyright, CMAP, archival, review, hyperlinking, privacy, terms, monitoring, contingency, security) | Partial | Copyright, Hyperlinking, Privacy and Terms exist on nitrkl.ac.in. The new `website-policies.html` lists them and adds the Disclaimer and Cookie Policy. The rest are drafts in `gigw-policy-drafts.md`. |
| 4 | Hyperlink checks; exits to non-government sites marked | Done | 48 outside links say "external website, opens in a new tab" and ask before leaving. Three dead footer links (`/Sitemap/`, `/Help/`, `/Feedback/`, all 404 on the live site) were replaced. |
| 5 | Moderated content | Institute | |
| 6 | Language versions updated together | Partial | Hindi and Odia are machine translations by Google Translate. A maintained Hindi version is an institute task. |
| 7–8 | No broken links; no "under construction" pages | Partial | Footer links checked against the live site. Run a full link check before launch. |
| 9 | Documents in HTML or accessible formats | Institute | Existing PDFs need an accessibility check. |
| 10 | Bilingual with a prominent language link; Unicode | Partial | The **अ \| A** switch is in the header, and the text is Unicode. See item 6. |

## What changed in this pass

- **Palette:** Cinnamon Red and the functional palette only, across `site.css`, `social-hub.css`, `chat.css`, `accessibility.css`, `intro.css`, `site.js` (navigation colours, charts) and `intro.js`.
- **Icons:** one inline SVG sprite of Material Symbols Outlined plus brand marks; the two icon fonts are no longer loaded.
- **Type:** the DBIM scale as six tokens (`--t-h1` to `--t-small`) with a mobile set. Headings are Bold, line heights are 1.2 to 1.5, sentence-length headings are in sentence case, and the navigation is in sentence case at 16 px. The oversized footer wordmark is removed.
- **Header:**
  - user controls (skip to main content, Screen Reader Access, language, Accessibility controls);
  - search goes to the new `search.html`;
  - lockup in ink.
- **Footer:** rebuilt to DBIM 5.6:
  - Useful links, Important links, Related links (with the National Portal of India), social media in the DBIM order and Last updated on;
  - the policies row now has the Disclaimer, Cookie Policy and Cookie settings.
- **Cookie consent banner:** English and Hindi. Google Translate loads only after consent.
- **New pages:** `website-policies.html` (with the Disclaimer and Cookie Policy), `help.html` and `search.html`. All inner pages now have breadcrumbs.
- **Other fixes:**
  - alt text cleaned up;
  - two thumbnails recompressed and the hero film re-encoded;
  - print stylesheet;
  - button states;
  - table alignment;
  - limited the pulsing animation;
  - fixed a low-contrast menu heading.

## Institute items (cannot be done in code)

1. Security audit and Audit Clearance Certificate (NIC, STQC or a CERT-In empanelled auditor).
2. Approve and publish the CMAP, archival, review, monitoring, contingency and security policies, and nominate the Web Information Manager (drafts in `gigw-policy-drafts.md`).
3. CCPS: the designated official subscribes to the API on the DBIM Toolkit; the first hero banner then becomes the CCPS banner.
4. A maintained Hindi version of the website (Google Translate is a stopgap).
5. An archive section for expired announcements, tenders and news.
6. An online feedback form with a response process.
7. A DBIM-style headshot of the Director (1:1, white background).
8. An editorial review of existing content for spelling and British English, and an accessibility check of the PDFs.
9. Confirm rights for all photographs.
10. Host the official website in a data centre in India (the demonstration deployment on Vercel runs in the USA).
