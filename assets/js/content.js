/* =============================================================
   Uzthaz Rasheed Hajjul Akbar — content layer
   Loads editable content from /content/*.json and renders the
   pages. Edited through the CMS at /admin (or by hand).
   ============================================================= */
(function () {
  "use strict";
  window.__CONTENT_DRIVEN = true;

  /* ---------- helpers ---------- */
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.prototype.slice.call((r || document).querySelectorAll(s));

  async function getJSON(path) {
    const res = await fetch(path, { cache: "no-cache" });
    if (!res.ok) throw new Error(path + " → " + res.status);
    return res.json();
  }

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function fmtDate(iso) {
    if (!iso) return "";
    const d = new Date(iso + (iso.length === 10 ? "T00:00:00" : ""));
    if (isNaN(d)) return iso;
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  }
  function dayOf(iso) { const d = new Date(iso + "T00:00:00"); return isNaN(d) ? "" : String(d.getDate()).padStart(2, "0"); }
  function monYear(iso) {
    const d = new Date(iso + "T00:00:00");
    if (isNaN(d)) return "";
    return d.toLocaleDateString("en-GB", { month: "short", year: "numeric" });
  }
  function money(n) { return "Rs " + Number(n).toLocaleString("en-LK"); }

  /* ---------- inline SVG icons (shared visual language) ---------- */
  const ICON = {
    arrow: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14m-6-6 6 6-6 6"/></svg>',
    play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>',
    pin: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke-width="1.6" stroke-linecap="round"><path d="M12 21s-7-5-7-11a7 7 0 0 1 14 0c0 6-7 11-7 11Z"/><circle cx="12" cy="10" r="2.5"/></svg>',
    clock: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke-width="1.6" stroke-linecap="round"><circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/></svg>'
  };

  /* ---------- minimal, safe markdown → HTML (article bodies) ---------- */
  function md(src) {
    const inline = (s) => esc(s)
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/\*([^*]+)\*/g, "<em>$1</em>")
      .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2">$1</a>');
    const lines = String(src || "").split(/\r?\n/);
    let html = "", i = 0;
    while (i < lines.length) {
      const line = lines[i];
      if (/^\s*$/.test(line)) { i++; continue; }
      if (/^###\s+/.test(line)) { html += "<h3>" + inline(line.replace(/^###\s+/, "")) + "</h3>"; i++; continue; }
      if (/^##\s+/.test(line)) { html += "<h2>" + inline(line.replace(/^##\s+/, "")) + "</h2>"; i++; continue; }
      if (/^#\s+/.test(line)) { html += "<h2>" + inline(line.replace(/^#\s+/, "")) + "</h2>"; i++; continue; }
      if (/^>\s?/.test(line)) { html += "<blockquote>" + inline(line.replace(/^>\s?/, "")) + "</blockquote>"; i++; continue; }
      if (/^[-*]\s+/.test(line)) {
        let items = "";
        while (i < lines.length && /^[-*]\s+/.test(lines[i])) { items += "<li>" + inline(lines[i].replace(/^[-*]\s+/, "")) + "</li>"; i++; }
        html += "<ul>" + items + "</ul>"; continue;
      }
      let para = line; i++;
      while (i < lines.length && !/^\s*$/.test(lines[i]) && !/^(#{1,3}\s|>\s?|[-*]\s)/.test(lines[i])) { para += " " + lines[i]; i++; }
      html += "<p>" + inline(para) + "</p>";
    }
    return html;
  }

  /* ---------- site-wide fields ---------- */
  function fill(obj, attr) {
    $$("[" + attr + "]").forEach(function (el) {
      const key = el.getAttribute(attr);
      if (obj[key] != null) el.textContent = obj[key];
    });
  }
  function applySite(site) {
    fill(site, "data-site");
    $$("[data-site-email]").forEach(function (el) {
      el.setAttribute("href", "mailto:" + site.email);
      if (el.hasAttribute("data-fill-text")) el.textContent = site.email;
    });
    // match social links by their existing aria-label (youtube / facebook / instagram)
    (site.socials || []).forEach(function (s) {
      $$(".socials a[aria-label]").forEach(function (a) {
        if (a.getAttribute("aria-label").toLowerCase() === String(s.platform).toLowerCase()) {
          a.setAttribute("href", s.url || "#");
        }
      });
    });
  }

  /* ---------- shared footer partial ---------- */
  const SOCIAL_PATH = {
    youtube: 'M23 7.5a3 3 0 0 0-2.1-2.1C19 4.9 12 4.9 12 4.9s-7 0-8.9.5A3 3 0 0 0 1 7.5 31 31 0 0 0 .6 12 31 31 0 0 0 1 16.5a3 3 0 0 0 2.1 2.1c1.9.5 8.9.5 8.9.5s7 0 8.9-.5A3 3 0 0 0 23 16.5 31 31 0 0 0 23.4 12 31 31 0 0 0 23 7.5ZM9.8 15.3V8.7l5.7 3.3Z',
    facebook: 'M14 9h2.5V6H14c-2 0-3.5 1.5-3.5 3.5V11H8v3h2.5v7h3v-7H16l.5-3h-3V9.7c0-.4.3-.7.7-.7Z',
    instagram: 'M12 8.5A3.5 3.5 0 1 0 15.5 12 3.5 3.5 0 0 0 12 8.5Zm0 5.7A2.2 2.2 0 1 1 14.2 12 2.2 2.2 0 0 1 12 14.2Zm4.5-6.9a.82.82 0 1 0 .82.82.82.82 0 0 0-.82-.82ZM12 5.8c1.95 0 2.2 0 3 .05a4 4 0 0 1 1.36.25 2.4 2.4 0 0 1 1.38 1.38A4 4 0 0 1 18 8.84c0 .77.05 1 .05 3s0 2.2-.05 3a4 4 0 0 1-.25 1.36 2.4 2.4 0 0 1-1.38 1.38 4 4 0 0 1-1.36.25c-.77 0-1 .05-3 .05s-2.2 0-3-.05a4 4 0 0 1-1.36-.25 2.4 2.4 0 0 1-1.38-1.38A4 4 0 0 1 6 14.84c0-.77-.05-1-.05-3s0-2.2.05-3a4 4 0 0 1 .25-1.36 2.4 2.4 0 0 1 1.38-1.38A4 4 0 0 1 9 5.85c.77 0 1-.05 3-.05M12 4.5c-2 0-2.27 0-3.06.05a5.3 5.3 0 0 0-1.78.34 3.7 3.7 0 0 0-2.12 2.12 5.3 5.3 0 0 0-.34 1.78C4.5 9.73 4.5 10 4.5 12s0 2.27.05 3.06a5.3 5.3 0 0 0 .34 1.78 3.7 3.7 0 0 0 2.12 2.12 5.3 5.3 0 0 0 1.78.34c.79.05 1.06.05 3.06.05s2.27 0 3.06-.05a5.3 5.3 0 0 0 1.78-.34 3.7 3.7 0 0 0 2.12-2.12 5.3 5.3 0 0 0 .34-1.78c.05-.79.05-1.06.05-3.06s0-2.27-.05-3.06a5.3 5.3 0 0 0-.34-1.78 3.7 3.7 0 0 0-2.12-2.12 5.3 5.3 0 0 0-1.78-.34C14.27 4.5 14 4.5 12 4.5Z'
  };
  function socialLink(platform, label) {
    return '<a href="#" aria-label="' + label + '"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="' + SOCIAL_PATH[platform] + '"/></svg></a>';
  }
  function footerHTML() {
    return '<div class="geo-layer geo-watermark" aria-hidden="true"></div>' +
      '<div class="container"><div class="footer__grid">' +
        '<div class="footer__brand"><a class="brand" href="index.html">' +
          '<span class="brand__mark" aria-hidden="true"></span>' +
          "<span>Uzthaz <strong>Rasheed</strong></span></a>" +
          '<p class="footer__about" data-site="footerAbout"></p></div>' +
        '<div class="footer__col"><h4>Explore</h4>' +
          '<a href="about.html">About</a><a href="speeches.html">Speeches</a>' +
          '<a href="articles.html">Articles</a><a href="events.html">Events</a></div>' +
        '<div class="footer__col"><h4>Connect</h4>' +
          '<a href="shop.html">Materials</a><a href="contact.html">Contact</a>' +
          '<a data-site-email data-fill-text href="mailto:#"></a></div>' +
      "</div>" +
      '<div class="footer__bottom">' +
        '<p>© 2026 <span data-site="copyrightName"></span>. All rights reserved.</p>' +
        '<div class="socials" aria-label="Social media">' +
          socialLink("youtube", "YouTube") + socialLink("facebook", "Facebook") + socialLink("instagram", "Instagram") +
        "</div></div></div>";
  }
  function injectPartials() {
    $$('[data-partial="footer"]').forEach(function (el) {
      el.className = "footer";
      el.setAttribute("role", "contentinfo");
      el.innerHTML = footerHTML();
    });
  }

  /* ---------- card builders ---------- */
  function speechCard(s, idx) {
    return '<article class="card reveal" data-delay="' + (idx % 3) * 80 + '" data-category="' + esc(s.category) + '">' +
      '<button class="thumb" data-embed="' + esc(s.youtube) + '" aria-label="Play: ' + esc(s.title) + '">' +
        (s.image ? '<img src="' + esc(s.image) + '" alt="">' : '<div class="thumb__motif js-mark"></div>') +
        '<span class="thumb__play"><span>' + ICON.play + "</span></span>" +
      "</button>" +
      '<div class="product__body">' +
        '<span class="card__tag">' + esc(s.category) + "</span>" +
        '<h3 class="card__title">' + esc(s.title) + "</h3>" +
        '<p class="card__meta">' + fmtDate(s.date) + (s.duration ? " · " + esc(s.duration) : "") + "</p>" +
        '<p class="card__text">' + esc(s.description) + "</p>" +
      "</div></article>";
  }

  function articleCard(a, idx) {
    return '<a class="card reveal" data-delay="' + (idx % 3) * 80 + '" href="article.html?slug=' + encodeURIComponent(a.slug) + '" data-category="' + esc(a.category) + '">' +
      (a.image ? '<div class="thumb" style="margin-bottom:var(--space-2)"><img src="' + esc(a.image) + '" alt=""></div>' : "") +
      '<span class="card__tag">' + esc(a.category) + "</span>" +
      '<h3 class="card__title">' + esc(a.title) + "</h3>" +
      '<p class="card__meta">' + fmtDate(a.date) + " · " + esc(a.readTime) + "</p>" +
      '<p class="card__text">' + esc(a.excerpt) + "</p>" +
      '<span class="card__link">Read article ' + ICON.arrow + "</span></a>";
  }

  function productCard(p, idx) {
    return '<article class="card reveal" data-delay="' + (idx % 3) * 80 + '" data-category="' + esc(p.category) + '">' +
      '<div class="thumb thumb--portrait">' + (p.image ? '<img src="' + esc(p.image) + '" alt="">' : '<div class="thumb__motif js-mark"></div>') + "</div>" +
      '<div class="product__body">' +
        '<span class="product__type">' + esc(p.type) + "</span>" +
        '<h3 class="product__title">' + esc(p.title) + "</h3>" +
        '<p class="card__text">' + esc(p.description) + "</p>" +
        '<p class="product__price"><span class="cur">Rs</span> ' + Number(p.price).toLocaleString("en-LK") + "</p>" +
        '<div class="product__foot">' +
          '<button class="btn btn--primary" data-add data-id="' + esc(p.id) + '" data-title="' + esc(p.title) + '" data-type="' + esc(p.type) + '" data-price="' + esc(p.price) + '">' +
            "<span data-add-label>Add to Cart</span></button>" +
        "</div></div></article>";
  }

  /* ---------- page renderers (run only if their target exists) ---------- */
  function renderHome(data) {
    const grid = $("#home-highlights");
    if (grid) {
      const speeches = (data.speeches.speeches || []).slice().sort((a, b) => (a.date < b.date ? 1 : -1));
      const upcoming = (data.events.events || []).filter((e) => e.status === "upcoming").sort((a, b) => (a.date > b.date ? 1 : -1));
      const articles = (data.articles.articles || []);
      const latest = speeches[0];
      const event = upcoming[0];
      const featured = articles.find((a) => a.featured) || articles[0];
      const cards = [];
      if (latest) cards.push(highlight("Latest Speech", latest.title, fmtDate(latest.date) + " · Lecture", latest.description, "speeches.html", "Watch the lecture"));
      if (event) cards.push(highlight("Upcoming Event", event.title, fmtDate(event.date) + " · " + esc(event.location), "A forthcoming gathering — see full details and how to register.", "events.html", "View details"));
      if (featured) cards.push(highlight("Featured Article", featured.title, "Reflections · " + esc(featured.readTime), featured.excerpt, "article.html?slug=" + encodeURIComponent(featured.slug), "Read the article"));
      grid.innerHTML = cards.join("");
    }
    fill(data.home, "data-home");
    const mat = $("#home-materials");
    if (mat) mat.innerHTML = (data.products.products || []).slice(0, 3).map(function (p, i) {
      return '<a class="card reveal" data-delay="' + i * 80 + '" href="shop.html">' +
        '<div class="thumb thumb--portrait">' + (p.image ? '<img src="' + esc(p.image) + '" alt="">' : '<div class="thumb__motif js-mark"></div>') + "</div>" +
        '<div class="product__body"><span class="product__type">' + esc(p.type) + "</span>" +
        '<h3 class="product__title">' + esc(p.title) + "</h3>" +
        '<p class="card__text">' + esc(p.description) + "</p>" +
        '<p class="product__price"><span class="cur">Rs</span> ' + Number(p.price).toLocaleString("en-LK") + "</p></div></a>";
    }).join("");
  }
  function highlight(tag, title, meta, text, href, cta) {
    return '<a class="card reveal" href="' + href + '">' +
      '<p class="card__tag">' + esc(tag) + "</p>" +
      '<h3 class="card__title">' + esc(title) + "</h3>" +
      '<p class="card__meta">' + meta + "</p>" +
      '<p class="card__text">' + esc(text) + "</p>" +
      '<span class="card__link">' + esc(cta) + " " + ICON.arrow + "</span></a>";
  }

  function renderAbout(about) {
    fill(about, "data-about");
    const portrait = $("#about-portrait");
    if (portrait && about.portrait) portrait.innerHTML = '<img src="' + esc(about.portrait) + '" alt="Portrait of Uzthaz Rasheed Hajjul Akbar">';
    const bio = $("#about-bio");
    if (bio) bio.innerHTML = (about.bio || []).map(function (p, i) {
      return '<p' + (i < about.bio.length - 1 ? ' style="margin-bottom:var(--space-2)"' : "") + ">" + esc(p) + "</p>";
    }).join("");
    const hc = $("#about-highlight-chips");
    if (hc) hc.innerHTML = (about.highlightChips || []).map((c) => '<span class="chip chip--static">' + esc(c) + "</span>").join("");
    const tl = $("#about-timeline");
    if (tl) tl.innerHTML = (about.timeline || []).map(function (t, i) {
      return '<div class="timeline__item reveal" data-delay="' + Math.min(i * 60, 240) + '">' +
        '<p class="timeline__year">' + esc(t.year) + "</p>" +
        '<p class="timeline__role">' + esc(t.role) + "</p>" +
        '<p class="timeline__desc">' + esc(t.desc) + "</p></div>";
    }).join("");
    const ex = $("#about-expertise");
    if (ex) ex.innerHTML = (about.expertise || []).map((c) => '<span class="chip">' + esc(c) + "</span>").join("");
  }

  function renderSpeeches(data) {
    const grid = $("#speech-grid");
    if (!grid) return;
    const list = (data.speeches || []).slice().sort((a, b) => (a.date < b.date ? 1 : -1));
    grid.innerHTML = list.map(speechCard).join("");
  }

  function renderEvents(data) {
    const up = $("#events-upcoming");
    const past = $("#events-past");
    const events = data.events || [];
    if (up) {
      up.innerHTML = events.filter((e) => e.status === "upcoming").sort((a, b) => (a.date > b.date ? 1 : -1)).map(function (e, i) {
        return '<article class="event reveal" data-delay="' + Math.min(i * 80, 200) + '">' +
          '<div class="event__date"><div class="event__day">' + dayOf(e.date) + '</div><div class="event__mon">' + monYear(e.date) + "</div></div>" +
          "<div><h3 class=\"event__title\">" + esc(e.title) + "</h3>" +
          '<div class="event__meta"><span>' + ICON.pin + esc(e.location) + "</span>" +
          (e.time ? "<span>" + ICON.clock + esc(e.time) + "</span>" : "") + "</div></div>" +
          '<a class="btn btn--primary" href="' + esc(e.registerUrl || "contact.html") + '">Register</a></article>';
      }).join("");
    }
    if (past) {
      past.innerHTML = events.filter((e) => e.status === "past").sort((a, b) => (a.date < b.date ? 1 : -1)).map(function (e) {
        return '<div class="accordion__item"><h3>' +
          '<button class="accordion__trigger" aria-expanded="false">' + esc(e.title) +
          '<span class="plus" aria-hidden="true"></span></button></h3>' +
          '<div class="accordion__panel"><div><div class="accordion__panel-inner">' +
          '<p class="accordion__meta">' + fmtDate(e.date) + " · " + esc(e.location) + "</p>" +
          esc(e.description) + "</div></div></div></div>";
      }).join("");
    }
  }

  function renderArticlesList(data) {
    const grid = $("#article-grid");
    if (!grid) return;
    const list = (data.articles || []).slice().sort((a, b) => (a.date < b.date ? 1 : -1));
    grid.innerHTML = list.map(articleCard).join("");
  }

  function renderArticleDetail(data) {
    const host = $("#article-detail");
    if (!host) return;
    const slug = new URLSearchParams(location.search).get("slug");
    const articles = data.articles || [];
    const a = (slug && articles.find((x) => x.slug === slug)) || articles.find((x) => x.featured) || articles[0];
    if (!a) { host.innerHTML = '<div class="section"><div class="container"><p class="lead text-center">Article not found.</p></div></div>'; return; }
    document.title = a.title + " — Uzthaz Rasheed Hajjul Akbar";
    host.innerHTML =
      '<header class="page-hero"><div class="geo-layer" aria-hidden="true"></div>' +
        '<div class="container" style="max-width:760px">' +
          '<p class="eyebrow reveal">' + esc(a.category) + "</p>" +
          '<h1 class="reveal" data-delay="80">' + esc(a.title) + "</h1>" +
          '<div class="article-meta reveal" data-delay="140"><span>By Uzthaz Rasheed Hajjul Akbar</span>' +
            "<span>" + fmtDate(a.date) + "</span><span>" + esc(a.readTime) + "</span></div>" +
        "</div></header>" +
      '<div class="section"><div class="container"><div class="prose reveal">' +
        (a.arabicOpening ? '<p class="arabic">' + esc(a.arabicOpening) + "</p>" : "") +
        md(a.body) +
      "</div>" +
      '<div class="prose mt-4" style="display:flex;justify-content:space-between;gap:var(--space-2);flex-wrap:wrap">' +
        '<a class="btn btn--ghost" href="articles.html"><svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5m6 6-6-6 6-6"/></svg> All Articles</a>' +
        '<a class="btn btn--primary" href="shop.html">Explore Written Works</a>' +
      "</div></div></div>";
  }

  function renderProducts(data) {
    const grid = $("#product-grid");
    if (!grid) return;
    grid.innerHTML = (data.products || []).map(productCard).join("");
  }

  /* ---------- orchestration ---------- */
  async function boot() {
    injectPartials();                          // shared footer into every page
    if (window.URHA) window.URHA.initStatic();

    const needs = {
      site: true,
      home: !!$("#home-highlights") || !!$("[data-home]"),
      about: !!$("#about-timeline") || !!$("[data-about]"),
      speeches: !!$("#speech-grid") || !!$("#home-highlights"),
      events: !!$("#events-upcoming") || !!$("#home-highlights"),
      articles: !!$("#article-grid") || !!$("#article-detail") || !!$("#home-highlights"),
      products: !!$("#product-grid") || !!$("#home-materials")
    };

    try {
      const [site, home, about, speeches, events, articles, products] = await Promise.all([
        getJSON("content/site.json"),
        needs.home ? getJSON("content/home.json") : null,
        needs.about ? getJSON("content/about.json") : null,
        needs.speeches ? getJSON("content/speeches.json") : null,
        needs.events ? getJSON("content/events.json") : null,
        needs.articles ? getJSON("content/articles.json") : null,
        needs.products ? getJSON("content/products.json") : null
      ]);

      applySite(site);
      if (needs.home && home) renderHome({ home: home, speeches: speeches || { speeches: [] }, events: events || { events: [] }, articles: articles || { articles: [] }, products: products || { products: [] } });
      if (needs.about && about) renderAbout(about);
      if (speeches) renderSpeeches(speeches);
      if (events) renderEvents(events);
      if (articles) { renderArticlesList(articles); renderArticleDetail(articles); }
      if (products) renderProducts(products);
    } catch (err) {
      console.error("[content] failed to load:", err);
    }

    if (window.URHA) {
      window.URHA.injectGeometry();   // fill motifs in freshly rendered cards
      window.URHA.initDynamic();      // reveal / filters / accordion / cart / embeds
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
