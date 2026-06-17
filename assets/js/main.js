/* =============================================================
   Uzthaz Rasheed Hajjul Akbar — site behavior
   ============================================================= */
(function () {
  "use strict";

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------------------------------------------------------
     1. GEOMETRIC STAR — generated as pure SVG (never an image)
        12-point star rosette (Rub el Hizb derivative)
     --------------------------------------------------------- */
  function starPath(points, outer, inner, rotate) {
    const step = Math.PI / points;
    rotate = rotate || 0;
    let d = "";
    for (let i = 0; i < points * 2; i++) {
      const r = i % 2 === 0 ? outer : inner;
      const a = i * step + rotate - Math.PI / 2;
      const x = (r * Math.cos(a)).toFixed(2);
      const y = (r * Math.sin(a)).toFixed(2);
      d += (i === 0 ? "M" : "L") + x + " " + y + " ";
    }
    return d + "Z";
  }

  function circle(r, thin) {
    return '<circle class="geo-stroke' + (thin ? " geo-stroke--thin" : "") + '" cx="0" cy="0" r="' + r + '"></circle>';
  }
  function path(d, thin) {
    return '<path class="geo-stroke' + (thin ? " geo-stroke--thin" : "") + '" d="' + d + '"></path>';
  }

  // Full living rosette for backgrounds
  function rosetteSVG() {
    const deg15 = Math.PI / 12;
    return (
      '<svg viewBox="-110 -110 220 220" aria-hidden="true" focusable="false">' +
        "<g>" +
          circle(100, true) +
          circle(70, true) +
          path(starPath(12, 100, 58)) +
        "</g>" +
        '<g class="geo-inner">' +
          path(starPath(12, 84, 44, deg15)) +
          circle(40, true) +
          path(starPath(12, 40, 22)) +
        "</g>" +
      "</svg>"
    );
  }

  // Compact mark for the brand / motifs
  function markSVG() {
    const deg15 = Math.PI / 12;
    return (
      '<svg viewBox="-110 -110 220 220" aria-hidden="true" focusable="false">' +
        path(starPath(12, 100, 56)) +
        path(starPath(8, 78, 40, deg15), true) +
        circle(34, true) +
      "</svg>"
    );
  }

  function injectGeometry() {
    document.querySelectorAll(".geo-layer").forEach(function (el) {
      el.innerHTML = rosetteSVG();
    });
    document.querySelectorAll(".brand__mark, .thumb__motif, .js-mark").forEach(function (el) {
      el.innerHTML = markSVG();
    });
  }

  /* ---------------------------------------------------------
     2. NAVBAR — transparent over hero, solid on scroll
     --------------------------------------------------------- */
  function initNav() {
    const nav = document.querySelector(".nav");
    const toggle = document.querySelector(".nav__toggle");
    const links = document.querySelector(".nav__links");
    if (!nav) return;

    const onScroll = function () {
      nav.classList.toggle("is-scrolled", window.scrollY > 40);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    if (toggle && links) {
      toggle.addEventListener("click", function () {
        const open = links.classList.toggle("is-open");
        toggle.setAttribute("aria-expanded", String(open));
        document.body.style.overflow = open ? "hidden" : "";
      });
      links.querySelectorAll("a").forEach(function (a) {
        a.addEventListener("click", function () {
          links.classList.remove("is-open");
          toggle.setAttribute("aria-expanded", "false");
          document.body.style.overflow = "";
        });
      });
    }
  }

  /* ---------------------------------------------------------
     3. SCROLL REVEAL
     --------------------------------------------------------- */
  function initReveal() {
    const items = document.querySelectorAll(".reveal");
    if (!items.length) return;
    if (prefersReducedMotion || !("IntersectionObserver" in window)) {
      items.forEach(function (el) { el.classList.add("is-visible"); });
      return;
    }
    const io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.style.transitionDelay = (entry.target.dataset.delay || "0") + "ms";
          entry.target.classList.add("is-visible");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    items.forEach(function (el) { io.observe(el); });
  }

  /* ---------------------------------------------------------
     4. FILTERS (speeches / articles)
     --------------------------------------------------------- */
  function initFilters() {
    document.querySelectorAll("[data-filter-group]").forEach(function (group) {
      const targetSel = group.getAttribute("data-filter-target");
      const items = document.querySelectorAll(targetSel + " [data-category]");
      const empty = document.querySelector(group.getAttribute("data-filter-empty") || "___none");
      group.querySelectorAll("button").forEach(function (btn) {
        btn.addEventListener("click", function () {
          group.querySelectorAll("button").forEach(function (b) { b.setAttribute("aria-pressed", "false"); });
          btn.setAttribute("aria-pressed", "true");
          const cat = btn.getAttribute("data-filter");
          let shown = 0;
          items.forEach(function (item) {
            const match = cat === "all" || item.getAttribute("data-category") === cat;
            item.classList.toggle("is-hidden", !match);
            if (match) shown++;
          });
          if (empty) empty.classList.toggle("is-hidden", shown !== 0);
        });
      });
    });
  }

  /* ---------------------------------------------------------
     5. ACCORDION (past events / FAQ)
     --------------------------------------------------------- */
  function initAccordion() {
    document.querySelectorAll(".accordion").forEach(function (acc) {
      acc.querySelectorAll(".accordion__trigger").forEach(function (trigger) {
        const item = trigger.closest(".accordion__item");
        trigger.addEventListener("click", function () {
          const open = item.classList.toggle("is-open");
          trigger.setAttribute("aria-expanded", String(open));
        });
      });
    });
  }

  /* ---------------------------------------------------------
     6. SHOP CART + simulated checkout
     --------------------------------------------------------- */
  const CART_KEY = "urha_cart";
  const fmt = function (n) { return "Rs " + n.toLocaleString("en-LK"); };

  function readCart() {
    try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; }
    catch (e) { return []; }
  }
  function writeCart(cart) { localStorage.setItem(CART_KEY, JSON.stringify(cart)); }

  function initCart() {
    const drawer = document.querySelector("[data-cart-drawer]");
    const backdrop = document.querySelector("[data-cart-backdrop]");
    const openers = document.querySelectorAll("[data-cart-open]");
    const counts = document.querySelectorAll("[data-cart-count]");
    if (!counts.length) return; // cart UI only exists on pages with the drawer markup

    const itemsEl = drawer ? drawer.querySelector("[data-cart-items]") : null;
    const totalEl = drawer ? drawer.querySelector("[data-cart-total]") : null;
    const footEl = drawer ? drawer.querySelector("[data-cart-foot]") : null;
    let lastFocus = null;

    function total(cart) { return cart.reduce(function (s, i) { return s + i.price; }, 0); }

    function renderCount() {
      const n = readCart().length;
      counts.forEach(function (c) { c.textContent = n ? String(n) : ""; });
    }

    function renderDrawer() {
      if (!itemsEl) return;
      const cart = readCart();
      if (!cart.length) {
        itemsEl.innerHTML = '<p class="drawer__empty">Your collection is empty.<br>Explore the materials below.</p>';
        if (footEl) footEl.classList.add("is-hidden");
      } else {
        itemsEl.innerHTML = cart.map(function (i, idx) {
          return (
            '<div class="cart-row">' +
              '<div><div class="cart-row__title">' + i.title + "</div>" +
              '<div class="cart-row__type">' + i.type + "</div>" +
              '<button class="cart-row__remove" data-cart-remove="' + idx + '">Remove</button></div>' +
              '<div class="cart-row__price">' + fmt(i.price) + "</div>" +
            "</div>"
          );
        }).join("");
        if (footEl) {
          footEl.classList.remove("is-hidden");
          footEl.innerHTML = checkoutFootHTML(total(cart));
        }
      }
      renderCount();
    }

    function checkoutFootHTML(sum) {
      return (
        '<div class="drawer__total"><span>Total</span><span>' + fmt(sum) + "</span></div>" +
        '<button class="btn btn--primary btn--block" data-checkout-start>Proceed to Checkout</button>' +
        '<p class="drawer__note">' + lockIcon() + "Secure checkout · instant download after purchase</p>"
      );
    }

    function openDrawer() {
      if (!drawer) return;
      lastFocus = document.activeElement;
      renderDrawer();
      drawer.classList.add("is-open");
      if (backdrop) backdrop.classList.add("is-open");
      drawer.setAttribute("aria-hidden", "false");
      document.body.style.overflow = "hidden";
      const close = drawer.querySelector(".drawer__close");
      if (close) close.focus();
    }
    function closeDrawer() {
      if (!drawer) return;
      drawer.classList.remove("is-open");
      if (backdrop) backdrop.classList.remove("is-open");
      drawer.setAttribute("aria-hidden", "true");
      document.body.style.overflow = "";
      if (lastFocus) lastFocus.focus();
    }

    // add to cart
    document.querySelectorAll("[data-add]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        const cart = readCart();
        cart.push({
          id: btn.getAttribute("data-id"),
          title: btn.getAttribute("data-title"),
          type: btn.getAttribute("data-type"),
          price: parseInt(btn.getAttribute("data-price"), 10)
        });
        writeCart(cart);
        renderCount();
        const label = btn.querySelector("[data-add-label]") || btn;
        const prev = label.textContent;
        label.textContent = "Added ✓";
        btn.disabled = true;
        setTimeout(function () { label.textContent = prev; btn.disabled = false; }, 1200);
        openDrawer();
      });
    });

    openers.forEach(function (o) { o.addEventListener("click", openDrawer); });
    if (backdrop) backdrop.addEventListener("click", closeDrawer);
    if (drawer) {
      drawer.addEventListener("click", function (e) {
        const closeBtn = e.target.closest("[data-cart-close]");
        if (closeBtn) { closeDrawer(); return; }

        const rm = e.target.closest("[data-cart-remove]");
        if (rm) {
          const cart = readCart();
          cart.splice(parseInt(rm.getAttribute("data-cart-remove"), 10), 1);
          writeCart(cart);
          renderDrawer();
          return;
        }
        if (e.target.closest("[data-checkout-start]")) { showCheckout(); return; }
        if (e.target.closest("[data-checkout-back]")) { renderDrawer(); return; }
      });
      drawer.addEventListener("submit", function (e) {
        if (e.target.matches("[data-checkout-form]")) { e.preventDefault(); completeCheckout(); }
      });
    }
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeDrawer();
    });

    function showCheckout() {
      const cart = readCart();
      if (!cart.length) return;
      itemsEl.innerHTML =
        '<button class="cart-row__remove" data-checkout-back style="margin-bottom:1rem">← Back to cart</button>' +
        '<form data-checkout-form novalidate>' +
          field("Full name", "text", "co-name", "Your name", "name") +
          field("Email (for delivery)", "email", "co-email", "you@example.com", "email") +
          '<div class="field"><label for="co-card">Card number <span class="req">*</span></label>' +
            '<input id="co-card" inputmode="numeric" placeholder="4242 4242 4242 4242" required></div>' +
          '<div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem">' +
            '<div class="field"><label for="co-exp">Expiry</label><input id="co-exp" placeholder="MM/YY" required></div>' +
            '<div class="field"><label for="co-cvc">CVC</label><input id="co-cvc" inputmode="numeric" placeholder="123" required></div>' +
          "</div>" +
          '<button type="submit" class="btn btn--primary btn--block">Pay ' + fmt(total(cart)) + "</button>" +
          '<p class="drawer__note">' + lockIcon() + "Demo checkout — no real payment is processed</p>" +
        "</form>";
      if (footEl) footEl.classList.add("is-hidden");
      const first = itemsEl.querySelector("input");
      if (first) first.focus();
    }

    function completeCheckout() {
      const cart = readCart();
      itemsEl.innerHTML =
        '<div style="text-align:center;padding:1.5rem 0">' +
          '<div style="width:64px;height:64px;border-radius:50%;border:1px solid var(--gold);display:grid;place-items:center;margin:0 auto 1.2rem">' +
            checkIcon() + "</div>" +
          '<h3 style="font-family:var(--font-display);font-size:1.6rem">Jazak Allahu Khairan</h3>' +
          '<p style="color:var(--muted);margin:0.6rem auto 1.4rem;max-width:30ch">Your purchase is confirmed. A receipt and download links have been sent to your email.</p>' +
          '<div style="text-align:left">' +
            cart.map(function (i) {
              return '<a class="btn btn--ghost btn--block" href="#download" style="margin-bottom:0.6rem" download>' +
                downloadIcon() + " Download — " + i.title + "</a>";
            }).join("") +
          "</div>" +
        "</div>";
      if (footEl) footEl.classList.add("is-hidden");
      writeCart([]);
      renderCount();
    }

    function field(label, type, id, ph, ac) {
      return '<div class="field"><label for="' + id + '">' + label + ' <span class="req">*</span></label>' +
        '<input id="' + id + '" type="' + type + '" placeholder="' + ph + '" autocomplete="' + ac + '" required></div>';
    }

    renderCount();
  }

  /* ---------------------------------------------------------
     7. CONTACT FORM (client-side validation, simulated send)
     --------------------------------------------------------- */
  function initContactForm() {
    const form = document.querySelector("[data-contact-form]");
    if (!form) return;
    const status = form.querySelector("[data-form-status]");

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      let valid = true;
      form.querySelectorAll("[required]").forEach(function (input) {
        const fieldEl = input.closest(".field");
        let ok = input.value.trim() !== "";
        if (ok && input.type === "email") {
          ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value.trim());
        }
        if (fieldEl) fieldEl.classList.toggle("has-error", !ok);
        if (!ok && valid) { input.focus(); }
        if (!ok) valid = false;
      });
      if (!valid) {
        if (status) { status.textContent = "Please complete the highlighted fields."; status.style.color = "#E2A0A0"; }
        return;
      }
      const btn = form.querySelector('[type="submit"]');
      if (btn) { btn.disabled = true; btn.dataset.prev = btn.textContent; btn.textContent = "Sending…"; }
      setTimeout(function () {
        form.reset();
        if (btn) { btn.disabled = false; btn.textContent = btn.dataset.prev; }
        if (status) {
          status.innerHTML = checkIcon() + " Thank you. Your message has been received — we will respond, in shā’ Allah.";
          status.style.color = "var(--sage)";
        }
      }, 900);
    });

    form.querySelectorAll("[required]").forEach(function (input) {
      input.addEventListener("blur", function () {
        const fieldEl = input.closest(".field");
        if (!fieldEl) return;
        let ok = input.value.trim() !== "";
        if (ok && input.type === "email") ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value.trim());
        fieldEl.classList.toggle("has-error", !ok);
      });
    });
  }

  /* ---------------------------------------------------------
     8. SPEECH / MEDIA — lazy load embeds on click (no autoplay)
     --------------------------------------------------------- */
  function initMediaEmbeds() {
    document.querySelectorAll("[data-embed]").forEach(function (el) {
      el.addEventListener("click", function () {
        const src = el.getAttribute("data-embed");
        if (!src) return;
        const wrap = document.createElement("div");
        wrap.className = "thumb";
        wrap.innerHTML = '<iframe width="100%" height="100%" src="' + src + '?rel=0" title="Video player" ' +
          'style="border:0;position:absolute;inset:0" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>';
        el.replaceWith(wrap);
      });
    });
  }

  /* ---------------------------------------------------------
     Inline SVG icons (consistent stroke language)
     --------------------------------------------------------- */
  function lockIcon() {
    return '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>';
  }
  function checkIcon() {
    return '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="var(--sage)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>';
  }
  function downloadIcon() {
    return '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12m0 0 4-4m-4 4-4-4M5 21h14"/></svg>';
  }

  /* ---------------------------------------------------------
     INIT
     --------------------------------------------------------- */
  // Static pieces that don't depend on fetched content.
  function initStatic() {
    injectGeometry();
    initNav();
    initContactForm();
    document.body.classList.add("page-fade");
  }
  // Wired up AFTER the content layer has rendered cards/lists into the DOM.
  function initDynamic() {
    initReveal();
    initFilters();
    initAccordion();
    initCart();
    initMediaEmbeds();
  }

  // Exposed so content.js can orchestrate ordering around its async fetches.
  window.URHA = { initStatic: initStatic, initDynamic: initDynamic, injectGeometry: injectGeometry };

  // Fallback: if the content layer isn't present, run everything ourselves.
  function fallback() {
    if (window.__CONTENT_DRIVEN) return;
    initStatic();
    initDynamic();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fallback);
  else fallback();
})();
