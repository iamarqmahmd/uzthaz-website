# Content Management — Setup & Handoff Guide

This website is a fast, static site (plain HTML/CSS/JS) with an editor-friendly
**CMS** bolted on so the client can manage everything without touching code.

```
  Editor opens  yourdomain.com/admin
        │  (logs in, edits Speeches / Articles / Events / Materials / text)
        ▼
  Sveltia CMS  ──saves──▶  GitHub repo  (the content/*.json files)
                                  │  push to main
                                  ▼
                        GitHub Action  ──FTP──▶  cPanel  (the live site updates)
```

Nothing is hard‑coded any more. All editable content lives in **`/content/*.json`**
and is rendered by `assets/js/content.js`. The CMS just gives the client a friendly
screen to edit those files.

---

## What the client can edit (no code)

| Section in `/admin` | Controls | File |
|---|---|---|
| **Site & Identity** | Name, tagline, hero Arabic, contact email, location, footer text, social links | `content/site.json` |
| **Home Page** | Intro paragraph, pull quote, section titles | `content/home.json` |
| **About Page** | Bio paragraphs, portrait photo, timeline, expertise tags | `content/about.json` |
| **Speeches** | Lecture cards (title, topic, date, YouTube link, thumbnail) | `content/speeches.json` |
| **Events** | Upcoming + past events | `content/events.json` |
| **Articles** | Blog posts with rich text + cover image | `content/articles.json` |
| **Materials (Shop)** | Books / PDFs / courses (title, price, cover) | `content/products.json` |

> The home page updates itself: "Latest Speech", "Upcoming Event" and "Featured
> Article" are pulled automatically from the newest items (mark an article
> **Featured** to pin it). Page *intro headings* (e.g. the Arabic banner on the
> Speeches page) are left in the HTML by design — tell me if the client should be
> able to edit those too and I'll add them to the CMS.

---

## Part A — One‑time setup (you, the developer)

### 1. Put the project on GitHub
```bash
cd "this-project-folder"
git init
git add .
git commit -m "Initial site + CMS"
git branch -M main
git remote add origin https://github.com/<you>/<repo>.git
git push -u origin main
```

### 2. Point the CMS at your repo
Open **`admin/config.yml`** and change the two lines marked `← CHANGE`:
```yaml
backend:
  repo: <you>/<repo>          # e.g. rasheed-office/uzthaz-website
  base_url: https://<your-auth-worker>.workers.dev   # from step 3
```

### 3. Editor login (so the client can sign in at /admin)
The `/admin` screen offers three ways in. Pick **one**:

**Option 1 — Access Token (simplest for cPanel, no extra services).**
The editor signs in by pasting a GitHub **Personal Access Token**:
1. On GitHub: *Settings → Developer settings → Personal access tokens → Fine‑grained
   tokens → Generate*. Give it **Read/Write** access to *Contents* on this repo only.
2. At `/admin`, click **Sign In Using Access Token** and paste it.
   - You can leave `base_url` out of `config.yml` for this method.
   - Tokens can expire — when one does, generate a new one and paste it again.
   This is ideal when one or two trusted people manage the site.

**Option 2 — Sign in with GitHub (one click for the editor, ~10 min for you).**
Nicer for non‑technical editors. Set up the free, open‑source
[`sveltia/sveltia-cms-auth`](https://github.com/sveltia/sveltia-cms-auth) Cloudflare
Worker once:
1. **Create a GitHub OAuth App** — GitHub → *Settings → Developer settings → OAuth Apps → New*.
   - Homepage URL: `https://yourdomain.com`
   - Authorization callback URL: `https://<your-auth-worker>.workers.dev/callback`
2. **Deploy the worker** (one‑click *Deploy to Cloudflare* button on that repo) with
   variables `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, and `ALLOWED_DOMAINS=yourdomain.com`.
3. Put the worker URL into `base_url` in `admin/config.yml` and commit. Editors then
   click **Sign In with GitHub**.

> **Add the client to the repo** (either option): repo → *Settings → Collaborators* →
> invite their GitHub account, so they have write access.

> **Want to try the CMS right now, before any hosting?** Run a local web server in the
> project folder (`python3 -m http.server`), open `http://localhost:8000/admin/`, and
> click **Work with Local Repository** — Sveltia edits the files on your disk directly.

### 4. Auto‑deploy to cPanel
The included GitHub Action (`.github/workflows/deploy.yml`) uploads the site to cPanel
over FTPS on every change.

1. In **cPanel → FTP Accounts**, create (or reuse) an FTP account that points at your
   web root.
2. In **GitHub → repo → Settings → Secrets and variables → Actions**, add:
   - `FTP_SERVER` — e.g. `ftp.yourdomain.com`
   - `FTP_USERNAME` — the FTP account user
   - `FTP_PASSWORD` — the FTP account password
3. In `deploy.yml`, set `server-dir:` to your web root — usually `./public_html/`
   (or `./public_html/subfolder/` if the site lives in a subdirectory).
4. Push to `main` (or run the workflow from the **Actions** tab). The site deploys in
   ~1 minute. From then on, every CMS save redeploys automatically.

That's it. Hand the client the URL **`https://yourdomain.com/admin`**.

---

## Part B — Daily editing (the client)

1. Go to **`https://yourdomain.com/admin`** and click **Login with GitHub**.
2. Pick a section on the left (e.g. **Speeches**).
3. Add / edit / reorder / delete items, then click **Save** (and **Publish**).
4. Wait ~1 minute and refresh the website — the change is live.

Tips for the editor:
- **Speeches**: paste the YouTube link in the **embed** form, e.g.
  `https://www.youtube.com/embed/VIDEO_ID` (not the normal watch URL).
- **Articles**: write in the rich‑text box; tick **Feature on the home page** to pin one.
- **Events**: set **Status** to *upcoming* or *past* — the site files them automatically.
- **Materials**: **Price** is a plain number (e.g. `2400`), shown as `Rs 2,400`.
- **Images** are optional everywhere — leave blank to use the elegant geometric
  placeholder.

---

## Part C — Editing without GitHub (manual fallback)

The content files are plain text. If you'd rather not use the CMS at all, edit the
JSON files in **`/content/`** directly and upload them to cPanel via FTP / the cPanel
File Manager. The structure mirrors the CMS fields exactly. (Validate JSON at
<https://jsonlint.com> before uploading to avoid breaking a page.)

---

## Part D — Easiest alternative: Netlify (optional)

If you ever move off cPanel, Netlify makes the CMS effortless: editors log in by
**email** (no GitHub account, no auth worker). To switch, change `admin/config.yml`
backend to `name: git-gateway`, enable **Identity + Git Gateway** in Netlify, and
drop the GitHub Action. Everything else stays the same.

---

## Good to know

- **Shop checkout is a front‑end demo** — it collects details and "delivers" download
  links but does **not** process real payments. To take real money, connect a gateway
  (Stripe, or **PayHere**/**FriMi** for Sri Lanka). The cart/checkout UI is built so
  that's a clean drop‑in; ask me when you're ready.
- **The site needs to be served over http(s)** (cPanel does this). Opening the `.html`
  files directly from disk (`file://`) won't load content, because browsers block
  `fetch()` of local files.
- **Uploaded images** are committed into `assets/img/uploads/` and deployed with the
  site — no separate media host required.
- Everything is plain HTML/CSS/JS: no build step, no framework, nothing to "compile".
