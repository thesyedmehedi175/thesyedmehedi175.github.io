# Syed Md Mehedi Hasan — Mechanical Engineering Portfolio

A production-ready, static single-page portfolio for **Syed Md Mehedi Hasan**, Mechanical
Engineer (Sonargaon University, Dhaka) working across renewable energy modeling, FEA
simulation, and embedded systems research.

The design language is *engineering blueprint*: a graphite-dark canvas, an amber accent,
a technical drawing grid, and large **meshing SVG gears** that rotate smoothly — one hero
gear train (opposite rotations, tooth-synchronized) plus subtle ambient gears that keep
turning quietly behind every section.

All personal content lives in **one file** (`content.js`) — there is no build step, no
framework, and no backend. Everything is readable straight from `index.html`.

---

## 1. Overview

### Sections

| # | Section    | Contents (all sourced from the original content package) |
|---|------------|----------------------------------------------------------|
| 00 | Hero      | Name, role, affiliation, tagline, CTAs, spec list, meshing gear train |
| 01 | About     | Bio paragraphs, portrait, fact list, focus areas, affiliations (ASME / IEEE / BSME) |
| 02 | Education | B.Sc. Mechanical Engineering + Diploma (Naval Architecture & Marine Engineering) timeline |
| 03 | Skills    | Toolset cards — simulation & analysis, design & CAD, programming & data, energy & embedded |
| 04 | Experience| Industrial placement (Digital Power and Associates Ltd. — Orion Group) with impact stats |
| 05 | Research  | Hybrid off-grid energy system thesis — metadata, abstract, results metrics, conclusion |
| 06 | Projects  | Two flagship projects with snapshot panel, objectives, methodology, figures, challenges/lessons/future |
| 07 | Contact   | Email, phone, addresses, social links |

Sections such as certifications, achievements, and publications were **intentionally
omitted** because the source content package contains none — nothing on this site is
invented.

### Feature checklist

- ✅ Pure static: `index.html` + `style.css` + `script.js` + `content.js` + `assets/`
- ✅ Works by **double-clicking `index.html`** (`file://`) *or* from any static server
- ✅ Relative paths only → deploys to GitHub Pages, Netlify, Vercel, or any host untouched
- ✅ Single source of truth: edit `content.js` once, everything re-renders
- ✅ Animated meshing gears (SVG generated in JS, tooth-grid phase-locked, opposite spins)
- ✅ Gears stay subtle and readable — contrast-tuned strokes, clipped overflow, never causes horizontal scrolling (verified 320 px → 1440 px)
- ✅ Scroll-reveal animations, scroll-spy navigation, blueprint grid parallax
- ✅ Figure lightbox (`<dialog>`) with keyboard support: Enter opens, Esc closes, focus returns to the trigger
- ✅ Mobile nav (≤ 900 px) with `aria-expanded`, Esc-to-close
- ✅ Skip link, semantic landmarks/headings, `aria-current` scroll-spy, visible `:focus-visible` rings
- ✅ `prefers-reduced-motion` honored (gears stop, reveals shown instantly, smooth scroll off)
- ✅ SEO: title, meta description, Open Graph + Twitter card, favicon, apple-touch-icon, semantic headings, image alt text
- ✅ **Lighthouse: Accessibility 100 · Best Practices 100 · SEO 100**
- ✅ No-JS fallback: content stays visible without JavaScript (`<noscript>` note included)

---

## 2. Technologies

| Layer | Choice | Why |
|-------|--------|-----|
| Markup | HTML5 (semantic) | Landmarks, headings, `aria-*`, native `<dialog>` |
| Styling | CSS3 (custom properties, grid, clamp, container queries not required) | No preprocessor needed; tokenized design system |
| Logic | Vanilla JavaScript (ES5-compatible, classic `<script>` tags) | No bundler, no modules → works on `file://` |
| Gears | Procedurally generated SVG | Crisp at any DPI, animated with CSS `transform-box: fill-box` |
| Fonts | Google Fonts CDN — Barlow Semi Condensed (display), Inter (body), IBM Plex Mono (labels) | Degrade gracefully to system fonts offline |
| Icons | Inline SVG | Zero extra requests, themeable |

No npm, no build tools, no dependencies to install.

---

## 3. Run locally

### Option A — just open it (simplest)

Double-click `index.html` (or open it in any browser). That's it.

### Option B — local web server (recommended, matches production)

```bash
cd portfolio
python3 -m http.server 8000
# then open http://127.0.0.1:8000/
```

Any equivalent works:

```bash
npx serve .          # Node
php -S 127.0.0.1:8000 # PHP
```

---

## 4. Create the GitHub repository

1. Create a new repository on GitHub (https://github.com/new)
   - Repository name: e.g. `portfolio` (or `syed-mehedi-portfolio`)
   - Visibility: **Public** (required for free GitHub Pages) or private with Pages on a supported plan
   - **Do not** initialize with README — you already have files.
2. Push the project from your machine:

```bash
cd portfolio
git init
git add .
git commit -m "Initial portfolio commit"
git branch -M main
git remote add origin https://github.com/<your-username>/<repo-name>.git
git push -u origin main
```

`.gitignore` is already included (keeps editor/OS junk and tooling artifacts out).

---

## 5. Deploy to GitHub Pages

1. On GitHub, open your repository → **Settings → Pages**.
2. Under **Build and deployment**:
   - *Source*: **Deploy from a branch**
   - *Branch*: `main`
   - *Folder*: **/ (root)**
3. Click **Save**. Wait ~30 s for the build badge to go green.
4. Your site is live at:
   `https://<your-username>.github.io/<repo-name>/`

   (If the repo is named `<your-username>.github.io`, the URL is just the domain root.)

### Post-deploy touch-up

Because the site uses **relative paths only**, no path rewriting is needed — but update
the Open Graph image URL in `index.html` to an absolute URL so link previews work:

```html
<meta property="og:image" content="https://<your-username>.github.io/<repo-name>/assets/images/og-cover.png">
```

Custom domain? Add a `CNAME` file and configure DNS — nothing else changes.

---

## 6. Update the content

**Everything personal lives in `content.js` — never edit rendered text in `index.html`.**

`index.html` contains only the section shells; `script.js` renders the real content from
`window.PORTFOLIO` at load. Edit the matching key in `content.js`, refresh, done.

Common edits:

| Want to change… | Edit this key in `content.js` |
|-----------------|-------------------------------|
| Name, role, tagline, bio, addresses, phone, email | `profile` |
| Affiliations (ASME / IEEE / BSME) | `profile.memberships` (array) |
| Social links | `socials` (array of `{label, handle, url}`) |
| Education entries | `education` |
| Skill cards | `skills` |
| Job / placement details, stats | `experience` |
| Thesis abstract, metrics, metadata | `research` |
| Projects (objectives, figures, notes…) | `projects` |
| Focus-area chips | `focusAreas` |

Tips:

- Keep the same quotes/commas — `content.js` is plain JSON assigned to `window.PORTFOLIO`.
- Section order and numbering (`00`–`07`) are derived automatically from the DOM order in
  `index.html`; the nav, scroll-spy, and reveal logic pick them up automatically.
- Missing entries are omitted gracefully — you never need placeholder text.

---

## 7. Replace the photo / add assets

### Profile photo

**Current setup:** `content.js` points `profile.photo` at the hosted imgbb URL, with the
repo copy as an automatic fallback if that link ever dies:

```js
"photo": "https://i.ibb.co.com/4RFjFsz3/1786455589728.jpg",
"photoBackup": "assets/images/profile.jpg",
```

To use **only** a local file instead (recommended for long-term reliability), set:

```js
"photo": "assets/images/profile.jpg",
```

- Recommended image shape: **portrait 4:5** (e.g. 800×1000 or 512×640), JPEG, < 300 KB.
- The `profile-plate` CSS already applies `aspect-ratio: 4/5` + `object-fit: cover`, so
  any near-portrait crop will look right.
- Leave `photo` out (or set it to `""`) to fall back to the built-in engineering monogram
  nameplate — no broken images either way.

### Project figures

1. Drop files into `assets/images/` (keep names URL-friendly: lowercase, hyphens).
2. Reference them inside the relevant project's `figures` array:

```js
{ "src": "assets/images/my-figure.png", "alt": "Descriptive alt text",
  "caption": "Figure N — what it shows", "width": 800, "height": 600 }
```

Always provide `width`/`height` (prevents layout shift) and meaningful `alt` (accessibility).

### Favicon / social card

- Favicon: `assets/icons/favicon.svg` (+ `favicon.png` 32×32 fallback), `apple-touch-icon.png` 180×180.
- Social share image: `assets/images/og-cover.png` (1200×630 recommended).

Replace the files in place — the `<link>`/`<meta>` tags in `index.html` already point to
them.

---

## Project structure

```
portfolio/
├── index.html          # Entry point (section shells, SEO/OG meta, favicon links)
├── style.css           # Design system, layout, animations, responsive, a11y, print
├── script.js           # Gear engine + content renderers + interactions
├── content.js          # ★ Single source of truth for all personal content
├── README.md
├── .gitignore
└── assets/
    ├── icons/          # favicon.svg, favicon.png, apple-touch-icon.png
    └── images/         # profile.jpg, og-cover.png, project figures
```

## License / attribution

Content and images © Syed Md Mehedi Hasan. Replace the sample figures and copy with your
own before publishing if you fork this as a template.
