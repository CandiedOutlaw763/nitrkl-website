# GIGW 3.0 website policies: drafts for the institute to approve

nitrkl.ac.in already publishes Copyright, Hyperlinking, Privacy, Terms and Conditions, Help, Feedback,
Sitemap and Contact pages. GIGW 3.0 also expects the policies below. None of them exists on the site yet.
These are drafts: every item in [brackets] is a decision or a name only the institute can supply. Once
approved, publish each as a page and link it from a "Website Policies" page in the footer.

The Accessibility Statement and Screen Reader Access pages are already built
(`nitrdesign_km/nitrkl/accessibility-statement.html`, `screen-reader-access.html`; sources in
`nitrdesign_km/tools/pages/`, rebuilt with `python tools/build_pages.py`). Review their wording too.

---

## 1. Web Information Manager

The Web Information Manager is responsible for the website's content and for answering queries about it.

- Name: [name]
- Designation: [designation], NIT Rourkela
- Email: [email]
- Phone: [phone]

Show this on the Contact page and in the footer of every page.

## 2. Content Contribution, Moderation and Approval Policy (CMAP)

- **Contributors.** Content is contributed by the institute's departments, centres, sections and offices,
  each through a nominated contributor: [list of contributing units, or "each Head of Department or Section"].
- **Moderation.** Each contribution is checked by [moderator role] for accuracy, currency, accessibility
  (text descriptions for images, accessible documents) and conformance with these policies.
- **Approval.** Content is published only after approval by [approver role, e.g. the Head of the
  contributing unit]. The Web Information Manager publishes approved content.
- **Content types and approvers:** [table: announcements, tenders, recruitment, events, news, academic
  documents, each with its contributor, moderator and approver].

## 3. Content Archival Policy

- Each item carries an expiry: announcements and events [n] days after their date; tenders and
  recruitment notices after closing; news after [n] months; [other types].
- Expired content moves to an archive section that remains available, rather than being deleted,
  for [period].
- Permanent content (institute information, policies, academic regulations) does not expire but is
  reviewed under the Content Review Policy.

## 4. Content Review Policy

- Each department reviews its pages every [n] months; the Web Information Manager reviews the whole
  website every [n] months.
- Time-bound content (fees, admissions, calendars) is reviewed whenever it changes.
- Each page shows its "Last Updated" date (already shown in the homepage footer).

## 5. Contingency Management Plan

- **Content contingency.** Wrong or unapproved content is removed within [n] hours of being reported.
- **Defacement or hacking.** The site is taken offline or replaced by a maintenance page, the incident is
  reported to CERT-In, and the site is restored from the last clean backup within [n] hours.
- **Data loss.** Backups of the site and its data are taken [daily/weekly] and kept for [period] at
  [location].
- **Natural disaster or hosting failure.** [Disaster recovery site or provider, and the target time to
  recover.]
- **Contacts.** [Web Information Manager, the CAT technical team, hosting provider.]

## 6. Website Security Policy

- The website is audited by a CERT-In empanelled auditor before launch and after every major change,
  and at least [once a year]. [Date of last audit and auditor.]
- Served only over HTTPS. (The Vercel deployment prepared in `deploy/` does this and sets basic
  security headers.)
- Software and dependencies are updated [monthly] and on security advisories.
- [Access control for content contributors; password policy; logging.]

## 7. Website Monitoring Plan

- Performance, availability and broken links are checked [weekly] by [role].
- Functional checks after every change: navigation, search, forms, the chatbot.
- Accessibility checks after every change (an automated WCAG check is part of the redesign's workflow).
- User feedback received through the Feedback page is reviewed every [n] days.

## 8. Disclaimer

> Though all efforts have been made to ensure the accuracy of the content on this website, it should not
> be construed as a statement of law or used for any legal purposes. NIT Rourkela accepts no
> responsibility for the accuracy, completeness, usefulness or otherwise of the contents. Users are
> advised to verify any information with the relevant department of the institute before acting on it.
> Links to other websites are provided for convenience; NIT Rourkela is not responsible for their
> content or reliability, and does not necessarily endorse the views expressed in them.

[Adapt to the institute's legal advice. Add a note on the chatbot: "Answers from the AI assistant are
generated from this website's pages and may contain errors; check important details on the linked pages."
The chat panel already shows this sentence.]
