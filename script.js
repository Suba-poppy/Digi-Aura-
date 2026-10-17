/* Digi Aura — navigation, mobile menu, page interactions, site configuration, enquiry form
   ------------------------------------------------------------------------
   SITE_CONFIG is the single place to set business details that were not yet
   confirmed. Leave a value empty ("") and the site falls back safely:
   - social links: icons are shown; they become clickable once a URL is provided
   - overseasAnswer: the FAQ keeps its neutral default answer
   ------------------------------------------------------------------------ */
const SITE_CONFIG = {
  social: {
    instagram: "https://www.instagram.com/digiaura5/",
    linkedin: "https://www.linkedin.com/company/digiaura5/home/",
    facebook: "https://www.facebook.com/profile.php?id=61574080693279"
  },
  // Answer to "Do you work with businesses outside India?" Leave empty until confirmed.
  overseasAnswer: ""
};

(function () {
  "use strict";

  /* ----- Mobile navigation ----- */
  const toggle = document.querySelector(".nav-toggle");
  const nav = document.getElementById("primary-nav");

  function setNav(open) {
    if (!toggle || !nav) return;
    nav.classList.toggle("is-open", open);
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  }

  if (toggle && nav) {
    toggle.addEventListener("click", () => setNav(toggle.getAttribute("aria-expanded") !== "true"));
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && nav.classList.contains("is-open")) { setNav(false); toggle.focus(); }
    });
    nav.addEventListener("click", (e) => { if (e.target.closest("a")) setNav(false); });
    document.addEventListener("click", (e) => {
      if (nav.classList.contains("is-open") && !e.target.closest(".site-header")) setNav(false);
    });
    window.matchMedia("(min-width: 961px)").addEventListener("change", (m) => { if (m.matches) setNav(false); });
  }

  /* ----- Sticky header shadow ----- */
  const header = document.querySelector(".site-header");
  function onScroll() { if (header) header.classList.toggle("is-scrolled", window.scrollY > 8); }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ----- Apply SITE_CONFIG ----- */
  ["instagram", "linkedin", "facebook"].forEach((name) => {
    const url = SITE_CONFIG.social[name];
    document.querySelectorAll('[data-site="social-' + name + '"]').forEach((a) => {
      if (url && /^https?:\/\//i.test(url)) {
        a.href = url;
      } else {
        /* No URL configured yet: the icon is shown but does nothing until a link is added in SITE_CONFIG */
        a.addEventListener("click", (e) => e.preventDefault());
      }
    });
  });

  if (SITE_CONFIG.overseasAnswer) {
    document.querySelectorAll('[data-site="overseas-answer"]').forEach((el) => {
      el.textContent = SITE_CONFIG.overseasAnswer;
    });
  }
  /* ----- Scroll reveal (fade + slide up). Skipped for reduced-motion users or without IntersectionObserver. ----- */
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!reduceMotion && "IntersectionObserver" in window) {
    const SEL = ".section-head, .media-frame:not(.hero-art), .about-points li, .reason, .belief, .mv, .value, .step, .svc-card, .ind-item, .plain-point, .quote, .cta-strip, .benefits li, .contact-card, .form-card, .faq-wrap";
    const items = Array.from(document.querySelectorAll(SEL));
    items.forEach((el) => {
      const idx = Array.from(el.parentElement.children).filter((c) => c.matches(SEL)).indexOf(el);
      el.style.setProperty("--d", Math.min(idx, 5) * 90 + "ms");
      el.classList.add("reveal");
    });
    document.documentElement.classList.add("js");
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        el.classList.add("is-visible");
        io.unobserve(el);
        /* Once revealed, drop the reveal classes so card hover transitions are not delayed */
        setTimeout(() => { el.classList.remove("reveal", "is-visible"); el.style.removeProperty("--d"); }, 1500);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
    items.forEach((el) => io.observe(el));
  }

  /* ----- Highlight the nav link of the section in view ----- */
  const links = Array.from(document.querySelectorAll('.nav a[href^="#"]:not(.btn)'));
  const targets = links.map((a) => document.querySelector(a.getAttribute("href"))).filter(Boolean);
  function spy() {
    const y = window.scrollY + (header ? header.offsetHeight : 0) + 120;
    let current = null;
    targets.forEach((t) => { if (t.offsetTop <= y) current = t.id; });
    if (window.innerHeight + window.scrollY >= document.body.scrollHeight - 4 && targets.length) current = targets[targets.length - 1].id;
    links.forEach((a) => {
      if (a.getAttribute("href") === "#" + current) a.setAttribute("aria-current", "true"); else a.removeAttribute("aria-current");
    });
  }
  window.addEventListener("scroll", spy, { passive: true });
  spy();

  /* ----- Service buttons pre-select that service in the enquiry form ----- */
  document.querySelectorAll("[data-service]").forEach((el) => {
    el.addEventListener("click", () => {
      const select = document.getElementById("service_interested_in");
      const option = select && Array.from(select.options).find((o) => o.dataset.slug === el.dataset.service);
      if (option) select.value = option.value;
    });
  });
})();

/* ===== Enquiry form: validation, sanitising, and Supabase submission ===== */
(function () {
  "use strict";

  const LIMITS = { full_name: 100, company_name: 120, email: 254, phone: 20, service: 100, message: 2000 };
  const MIN_MESSAGE = 10;
  const SUBMIT_TIMEOUT_MS = 15000;
  const COOLDOWN_MS = 30000;

  /* Remove control characters, normalise whitespace. Newlines kept for the message only. */
  function clean(value, keepNewlines) {
    let v = String(value == null ? "" : value).normalize("NFC");
    v = v.replace(keepNewlines ? /[\u0000-\u0009\u000B\u000C\u000E-\u001F\u007F]/g : /[\u0000-\u001F\u007F]/g, " ");
    v = keepNewlines ? v.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n") : v.replace(/\s+/g, " ");
    return v.trim();
  }

  function validate(raw) {
    const data = {
      full_name: clean(raw.full_name),
      company_name: clean(raw.company_name),
      email: clean(raw.email).toLowerCase(),
      phone: clean(raw.phone),
      service_interested_in: clean(raw.service_interested_in) || "General enquiry",
      message: clean(raw.message, true)
    };
    const errors = {};

    if (data.full_name.length < 2) errors.full_name = "Enter your full name.";
    else if (data.full_name.length > LIMITS.full_name) errors.full_name = "Name must be 100 characters or fewer.";

    if (data.company_name.length > LIMITS.company_name) errors.company_name = "Company name must be 120 characters or fewer.";

    if (!data.email) errors.email = "Enter your email address.";
    else if (data.email.length > LIMITS.email || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(data.email)) errors.email = "Enter a valid email address, like name@company.com.";

    const digits = data.phone.replace(/\D/g, "");
    if (!data.phone) errors.phone = "Enter your phone number.";
    else if (!/^[0-9+() -]+$/.test(data.phone) || digits.length < 7 || digits.length > 15 || data.phone.length > LIMITS.phone)
      errors.phone = "Enter a valid phone number (7–15 digits; you can include +, spaces, - and brackets).";

    if (data.service_interested_in.length > LIMITS.service) errors.service_interested_in = "Choose a service from the list.";

    if (!data.message) errors.message = "Tell us a little about what you need.";
    else if (data.message.length < MIN_MESSAGE) errors.message = "Add a few more details (at least 10 characters).";
    else if (data.message.length > LIMITS.message) errors.message = "Message must be 2000 characters or fewer.";

    return { data, errors, valid: Object.keys(errors).length === 0 };
  }

  /* Export pure helpers for tests (Node) and stop if there is no form (other pages). */
  if (typeof module !== "undefined" && module.exports) module.exports = { clean, validate };
  if (typeof document === "undefined") return;
  const form = document.getElementById("enquiry-form");
  if (!form) return;

  const statusBox = document.getElementById("form-status");
  const submitBtn = document.getElementById("submit-btn");
  const btnLabel = submitBtn.querySelector(".btn-label");
  const serviceSelect = document.getElementById("service_interested_in");
  const fields = ["full_name", "company_name", "email", "phone", "service_interested_in", "message"];
  let isSubmitting = false;
  let cooldownTimer = null;

  /* Pre-select the service when arriving from a service page: contact.html?service=seo-google-ranking */
  const requested = new URLSearchParams(window.location.search).get("service");
  if (requested) {
    const match = Array.from(serviceSelect.options).find((o) => o.dataset.slug === requested);
    if (match) serviceSelect.value = match.value;
  }

  function showStatus(type, html, moveFocus) {
    statusBox.className = "form-status is-visible " + (type === "success" ? "is-success" : "is-error");
    statusBox.innerHTML = html;
    if (moveFocus !== false) {
      statusBox.setAttribute("tabindex", "-1");
      statusBox.focus();
    }
  }
  function clearStatus() { statusBox.className = "form-status"; statusBox.innerHTML = ""; }

  function setFieldError(name, message) {
    const input = document.getElementById(name);
    const holder = input.closest(".field");
    const err = document.getElementById(name + "-error");
    holder.classList.toggle("has-error", Boolean(message));
    err.textContent = message || "";
    if (message) input.setAttribute("aria-invalid", "true"); else input.removeAttribute("aria-invalid");
  }

  function setLoading(on) {
    isSubmitting = on;
    submitBtn.disabled = on;
    submitBtn.classList.toggle("is-loading", on);
    submitBtn.setAttribute("aria-busy", String(on));
    btnLabel.textContent = on ? "Sending…" : "Send Enquiry";
  }

  function startCooldown() {
    submitBtn.disabled = true;
    clearTimeout(cooldownTimer);
    cooldownTimer = setTimeout(() => { if (!isSubmitting) submitBtn.disabled = false; }, COOLDOWN_MS);
  }

  function readForm() {
    const out = {};
    fields.forEach((n) => { out[n] = document.getElementById(n).value; });
    return out;
  }

  /* Live feedback once a field has been touched */
  fields.forEach((name) => {
    const el = document.getElementById(name);
    el.addEventListener("blur", () => {
      const { errors } = validate(readForm());
      setFieldError(name, errors[name]);
    });
    el.addEventListener("input", () => {
      if (el.closest(".field").classList.contains("has-error")) {
        const { errors } = validate(readForm());
        setFieldError(name, errors[name]);
      }
    });
  });

  function withTimeout(promise, ms) {
    let t;
    const timeout = new Promise((_, reject) => { t = setTimeout(() => reject(new Error("timeout")), ms); });
    return Promise.race([promise, timeout]).finally(() => clearTimeout(t));
  }

  function fingerprint(d) { return [d.email, d.phone, d.service_interested_in, d.message].join("|"); }

  const FALLBACK = 'Please try again, or email us at <a href="mailto:info@digiaura.tech">info@digiaura.tech</a>.';

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (isSubmitting) return;                           // duplicate-submission guard
    clearStatus();

    const { data, errors, valid } = validate(readForm());
    fields.forEach((n) => setFieldError(n, errors[n]));
    if (!valid) {
      const first = fields.find((n) => errors[n]);
      document.getElementById(first).focus();
      showStatus("error", "Please fix the highlighted fields and send again.", false);
      return;
    }

    /* Honeypot: real visitors never see or fill this field. Bots get no request sent. */
    if (document.getElementById("website").value) { form.reset(); return; }

    /* Block an identical enquiry that was already delivered in this browser session */
    try {
      if (sessionStorage.getItem("digiaura:last") === fingerprint(data)) {
        showStatus("error", "This enquiry has already been sent. Change the details if you want to send another.");
        return;
      }
    } catch (_) { /* sessionStorage unavailable: continue */ }

    const client = DigiAuraSupabase.getClient();
    if (!client) {
      const why = DigiAuraSupabase.isConfigured()
        ? "The form could not load its connection library. Check your internet connection and reload the page."
        : "This form is not connected to its database yet, so your enquiry was not sent.";
      showStatus("error", why + " " + FALLBACK);
      return;
    }

    setLoading(true);
    try {
      const payload = {
        full_name: data.full_name,
        company_name: data.company_name || null,
        email: data.email,
        phone: data.phone,
        service_interested_in: data.service_interested_in,
        message: data.message
      };
      /* No .select(): anonymous visitors are not allowed to read rows back. */
      const { error } = await withTimeout(client.from("enquiries").insert([payload]), SUBMIT_TIMEOUT_MS);

      if (error) {
        console.error("Supabase insert failed:", error);
        const msg = error.code === "42501" || /row-level security/i.test(error.message || "")
          ? "The server rejected this enquiry. Check that the details are valid. "
          : "We couldn't save your enquiry. ";
        showStatus("error", msg + FALLBACK);
      } else {
        try { sessionStorage.setItem("digiaura:last", fingerprint(data)); } catch (_) {}
        form.reset();
        fields.forEach((n) => setFieldError(n, ""));
        showStatus("success", "<strong>Thank you, " + escapeHtml(data.full_name.split(" ")[0]) + ".</strong> Your enquiry has been received. We'll review it and get back to you by email or phone.");
        startCooldown();
      }
    } catch (err) {
      console.error("Enquiry submission error:", err);
      const msg = err && err.message === "timeout"
        ? "The request took too long, so we can't confirm it was received. "
        : "We couldn't reach the server. Check your connection. ";
      showStatus("error", msg + FALLBACK);
    } finally {
      setLoading(false);
      if (statusBox.classList.contains("is-success")) submitBtn.disabled = true;
    }
  });

  function escapeHtml(s) {
    return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }
})();
