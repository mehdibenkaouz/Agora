(function () {
  "use strict";

  const STYLE_ID = "shared-censor-styles";

  const DEFAULTS = {
    profanityColor: "#8a8a8a",
    blasphemyColor: "#b30000",
    hateColor: "#008000",
    blurAmount: "0.22em",
    titleHidden: "Click to show",
    titleShown: "Click to hide",
  };

  function escapeHtml(str) {
    return String(str ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }

  function normalizeCategory(category) {
    const c = String(category || "").trim().toLowerCase();
    if (c === "racial") return "hate";
    if (c === "profanity" || c === "blasphemy" || c === "hate") return c;
    return null;
  }

  function ensureStyles(options = {}) {
    if (document.getElementById(STYLE_ID)) return;

    const cfg = { ...DEFAULTS, ...options };
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      .censor-root {
        white-space: pre-wrap;
        word-break: break-word;
      }

      .censor-token {
        position: relative;
        display: inline;
        cursor: pointer;
        user-select: none;
        border-radius: 0.28em;
        padding: 0 .08em;
        transition:
          filter .16s ease,
          background-color .16s ease,
          box-shadow .16s ease,
          color .16s ease,
          opacity .16s ease;
      }

      .censor-token:focus-visible {
        outline: 2px solid currentColor;
        outline-offset: 2px;
      }

      .censor-token.is-hidden {
        color: transparent !important;
        text-shadow: none !important;
        -webkit-text-fill-color: transparent;
      }

      .censor-token.is-hidden .censor-token-text {
        filter: blur(${cfg.blurAmount});
        -webkit-filter: blur(${cfg.blurAmount});
      }

      .censor-token.is-shown .censor-token-text {
        filter: none;
        -webkit-filter: none;
      }

      .censor-token--profanity {
        background: color-mix(in srgb, ${cfg.profanityColor} 18%, transparent);
        box-shadow: inset 0 -1px 0 color-mix(in srgb, ${cfg.profanityColor} 50%, transparent);
      }

      .censor-token--blasphemy {
        background: color-mix(in srgb, ${cfg.blasphemyColor} 18%, transparent);
        box-shadow: inset 0 -1px 0 color-mix(in srgb, ${cfg.blasphemyColor} 58%, transparent);
      }

      .censor-token--hate {
        background: color-mix(in srgb, ${cfg.hateColor} 18%, transparent);
        box-shadow: inset 0 -1px 0 color-mix(in srgb, ${cfg.hateColor} 58%, transparent);
      }

      .censor-token.is-shown {
        color: inherit !important;
        -webkit-text-fill-color: currentColor;
      }

      .censor-token.is-hidden::after {
        content: "";
        position: absolute;
        inset: 0;
        border-radius: 0.28em;
        pointer-events: none;
        opacity: .55;
      }

      .censor-token--profanity.is-hidden::after {
        background: color-mix(in srgb, ${cfg.profanityColor} 28%, transparent);
      }

      .censor-token--blasphemy.is-hidden::after {
        background: color-mix(in srgb, ${cfg.blasphemyColor} 34%, transparent);
      }

      .censor-token--hate.is-hidden::after {
        background: color-mix(in srgb, ${cfg.hateColor} 34%, transparent);
      }

      .censor-token-text {
        transition: filter .16s ease;
      }
    `;
    document.head.appendChild(style);
  }

  function setTokenState(el, shown, options = {}) {
    const cfg = { ...DEFAULTS, ...options };
    el.classList.toggle("is-shown", !!shown);
    el.classList.toggle("is-hidden", !shown);
    el.setAttribute("aria-pressed", shown ? "true" : "false");
    el.setAttribute("data-censor-shown", shown ? "1" : "0");
    el.title = shown ? cfg.titleShown : cfg.titleHidden;
  }

  function toggleToken(el, options = {}) {
    const shown = el.getAttribute("data-censor-shown") === "1";
    setTokenState(el, !shown, options);
  }

  function createTextNode(text) {
    return document.createTextNode(String(text || ""));
  }

  function createToken(text, category, options = {}) {
    const normalizedCategory = normalizeCategory(category);
    if (!normalizedCategory) return createTextNode(text);

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `censor-token censor-token--${normalizedCategory} is-hidden`;
    btn.setAttribute("data-censor-category", normalizedCategory);
    btn.setAttribute("data-censor-original", String(text || ""));
    btn.setAttribute("data-censor-shown", "0");
    btn.setAttribute("aria-pressed", "false");
    btn.setAttribute("aria-label", normalizedCategory);

    const span = document.createElement("span");
    span.className = "censor-token-text";
    span.textContent = String(text || "");
    btn.appendChild(span);

    setTokenState(btn, false, options);

    btn.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      toggleToken(btn, options);
    });

    return btn;
  }

  function clearContainer(container) {
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }
  }

  function renderSegments(container, segments, options = {}) {
    if (!container) return;
    ensureStyles(options);

    container.classList.add("censor-root");
    clearContainer(container);

    const frag = document.createDocumentFragment();

    for (const seg of Array.isArray(segments) ? segments : []) {
      const text = String(seg?.text || "");
      const category = normalizeCategory(seg?.category);

      if (!text) continue;

      if (!category) {
        frag.appendChild(createTextNode(text));
      } else {
        frag.appendChild(createToken(text, category, options));
      }
    }

    container.appendChild(frag);
  }

  function sanitizeRanges(text, ranges) {
    const src = String(text || "");
    const out = [];
    const list = Array.isArray(ranges) ? ranges : [];

    for (const r of list) {
      const start = clamp(Number(r?.start ?? -1), 0, src.length);
      const end = clamp(Number(r?.end ?? -1), 0, src.length);
      const category = normalizeCategory(r?.category);

      if (!category) continue;
      if (!Number.isFinite(start) || !Number.isFinite(end)) continue;
      if (end <= start) continue;

      out.push({ start, end, category });
    }

    out.sort((a, b) => a.start - b.start || a.end - b.end);

    const nonOverlapping = [];
    let lastEnd = 0;

    for (const r of out) {
      if (r.start < lastEnd) continue;
      nonOverlapping.push(r);
      lastEnd = r.end;
    }

    return nonOverlapping;
  }

  function buildSegmentsFromRanges(text, ranges) {
    const src = String(text || "");
    const safeRanges = sanitizeRanges(src, ranges);
    const segments = [];
    let cursor = 0;

    for (const r of safeRanges) {
      if (r.start > cursor) {
        segments.push({
          text: src.slice(cursor, r.start),
          category: null,
        });
      }

      segments.push({
        text: src.slice(r.start, r.end),
        category: r.category,
      });

      cursor = r.end;
    }

    if (cursor < src.length) {
      segments.push({
        text: src.slice(cursor),
        category: null,
      });
    }

    return segments;
  }

  function renderTextWithRanges(container, text, ranges, options = {}) {
    const segments = buildSegmentsFromRanges(text, ranges);
    renderSegments(container, segments, options);
  }

  function hydrate(root = document, options = {}) {
    ensureStyles(options);
    const nodes = root.querySelectorAll("[data-censor-text][data-censor-category]");

    for (const node of nodes) {
      const text = node.getAttribute("data-censor-text") || node.textContent || "";
      const category = normalizeCategory(node.getAttribute("data-censor-category"));

      if (!category) continue;

      const replacement = createToken(text, category, options);
      node.replaceWith(replacement);
    }
  }

  function revealAll(root = document, options = {}) {
    root.querySelectorAll(".censor-token").forEach((el) => {
      setTokenState(el, true, options);
    });
  }

  function hideAll(root = document, options = {}) {
    root.querySelectorAll(".censor-token").forEach((el) => {
      setTokenState(el, false, options);
    });
  }

  function renderToHtmlString(segments) {
    const parts = [];

    for (const seg of Array.isArray(segments) ? segments : []) {
      const text = String(seg?.text || "");
      const category = normalizeCategory(seg?.category);

      if (!text) continue;

      if (!category) {
        parts.push(escapeHtml(text));
      } else {
        parts.push(
          `<button type="button" class="censor-token censor-token--${category} is-hidden" ` +
          `data-censor-category="${category}" data-censor-original="${escapeHtml(text)}" ` +
          `data-censor-shown="0" aria-pressed="false" aria-label="${category}" title="${escapeHtml(DEFAULTS.titleHidden)}">` +
          `<span class="censor-token-text">${escapeHtml(text)}</span>` +
          `</button>`
        );
      }
    }

    return parts.join("");
  }

  window.SharedCensor = {
    ensureStyles,
    renderSegments,
    renderTextWithRanges,
    buildSegmentsFromRanges,
    sanitizeRanges,
    hydrate,
    revealAll,
    hideAll,
    renderToHtmlString,
    toggleToken,
    setTokenState,
  };
})();