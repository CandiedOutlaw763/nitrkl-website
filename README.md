# NIT Rourkela website (redesign) with the Ask NIT Rourkela assistant

A redesign of the National Institute of Technology Rourkela homepage. It follows the Digital Brand Identity Manual (DBIM) 3.0 and the Guidelines for Indian Government Websites (GIGW) 3.0. It also includes an assistant that answers questions from the public pages and documents of nitrkl.ac.in.

This repository is the deployable build, made by `deploy/assemble.py` in the working project. Do not edit it by hand; rebuild it.

| Path | What it is |
|---|---|
| `public/` | The website: static HTML, CSS and JavaScript, served by Vercel's CDN. |
| `app.py`, `nitbot/` | The assistant and search API (FastAPI), one Vercel Python function serving `/api/...`. |
| `vercel.json` | Function settings and security headers. |

## How the assistant works

- **Retrieval:** questions are answered by retrieval over an index of the public nitrkl.ac.in pages and PDFs. No login-only content and no previous years' question papers are included.
- **The index:** the index pack (`nitbot-pack.tar.gz`, about 197 MB) is attached to this repository's GitHub release. On a cold start, the function downloads it from `NITBOT_PACK_URL`.
- **Answers:** written by a language model on Groq.
- **Search:** the same index powers the website's search page (`/search.html`, `POST /api/search`).

## Environment variables (Vercel project settings)

| Name | Value |
|---|---|
| `NITBOT_PACK_URL` | The release download URL of `nitbot-pack.tar.gz`. |
| `GROQ_API_KEY` | A Groq API key. Set it in Vercel only; never commit it. |

## Compliance

The full DBIM 3.0 and GIGW 3.0 matrix, including the items only the institute can complete, is in [`compliance/dbim-gigw-compliance.md`](compliance/dbim-gigw-compliance.md). Draft website policies for the institute to approve are in `compliance/gigw-policy-drafts.md`.
