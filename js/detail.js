/* ==========================================================================
   on2cook — Case study detail page
   Reads ?slug=<id> from the URL and renders the matching entry from
   data/case-studies.json. One HTML file serves every case study.
   ========================================================================== */

(async function () {
  const root = document.getElementById("detailRoot");
  const ctaSlot = document.getElementById("ctaSlot");
  const crumbCurrent = document.getElementById("crumbCurrent");

  const params = new URLSearchParams(window.location.search);
  const slug = params.get("slug");

  try {
    const data = await loadCaseStudyData();
    const meta = data.meta || {};
    const items = data.caseStudies || [];
    const index = items.findIndex((cs) => cs.slug === slug);
    const cs = index >= 0 ? items[index] : items[0];

    if (!cs) throw new Error("No case studies in dataset");

    document.title = `${cs.category ? cs.category + " · " : ""}${stripTags(cs.cardTitlePlain)} ${stripTags(cs.cardTitleHighlight)} — on2cook Case Studies`;
    crumbCurrent.textContent = `${cs.cardTitlePlain} ${cs.cardTitleHighlight}`.trim();

    root.innerHTML = detailMarkup(cs);
    ctaSlot.innerHTML = renderCtaBand(meta);
    renderPageNav(items, index);
    renderChrome(meta);

    setYear();
    initScrollReveal(".reveal");
  } catch (err) {
    console.error(err);
    root.innerHTML = `
      <div class="state-msg">
        <h2>Couldn't load this case study</h2>
        <p>Check that <code>data/case-studies.json</code> is reachable, or <a href="index.html">go back to all case studies</a>.</p>
      </div>`;
  }

  function detailMarkup(cs) {
    const snap = cs.snapshot || {};
    const ch = cs.challenge || {};
    const sol = cs.solution || {};
    const imp = cs.impact || {};
    const res = cs.results || {};
    const quote = cs.quote || {};
    const flip = cs.imageSide === "left"; // alternate section direction to mirror the listing card

    // Each block below is only rendered if it actually has content — leave
    // every field for a section blank in the sheet/JSON and it's skipped
    // entirely (see README "Skipping a section" for the exact convention).
    const heroMedia = mediaMarkup(cs.heroImage, cs.title, cs.category);
    const hasSnapshot = hasAny(snap.description, snap.facts);
    const hasChallenge = hasAny(ch.title, ch.description, ch.points);
    const hasSolution = hasAny(sol.description, sol.points, sol.title);
    const hasImpact = hasAny(imp.stats);
    const hasResults = hasAny(res.title, res.description, res.points);
    const hasQuote = hasAny(quote.text);

    const solMedia = mediaMarkup(sol.image, sol.title, "Solution");
    const resMedia = mediaMarkup(res.image, res.title, "Results");

    return `
      <section class="d-hero">
        <span class="pill">${escapeHtml(cs.category || "")}</span>
        <h1 class="reveal is-visible">${escapeHtml(`${cs.cardTitlePlain || ""} ${cs.cardTitleHighlight || ""}`.trim())}</h1>
        <p class="d-hero__sub">${escapeHtml(cs.title || "")}</p>
      </section>

      ${heroMedia ? `<div class="d-hero__media reveal">${heroMedia}</div>` : ""}

      ${hasSnapshot ? `
      <section class="snapshot reveal">
        <h2>Client Snapshot</h2>
        ${snap.description ? `<p>${escapeHtml(snap.description)}</p>` : ""}
        ${(snap.facts || []).some((f) => !isBlank(f.value)) ? `
        <div class="facts">
          ${(snap.facts || []).filter((f) => !isBlank(f.value)).map((f) => `
            <div class="fact">
              <div class="fact__label">${escapeHtml(f.label)}</div>
              <div class="fact__value">${escapeHtml(f.value)}</div>
            </div>`).join("")}
        </div>` : ""}
      </section>` : ""}

      ${hasChallenge ? `
      <section class="section ${ch.points && ch.points.length ? "section--split" : "section--full"} reveal">
        <div class="section-text">
          <span class="eyebrow">The Challenge</span>
          <h3>${escapeHtml(ch.title || "")}</h3>
          <p>${escapeHtml(ch.description || "")}</p>
        </div>
        ${(ch.points && ch.points.length) ? `
        <div class="media-box media-box--list">
          <ul class="check-list bad">
            ${ch.points.map((pt) => `<li><span class="ico">${iconCross()}</span>${escapeHtml(pt)}</li>`).join("")}
          </ul>
        </div>` : ""}
      </section>` : ""}

      ${hasSolution ? `
      <section class="section ${solMedia ? "section--split" : "section--full"} ${(solMedia && !flip) ? "flip" : ""} reveal">
        ${solMedia ? `<div class="media-box">${solMedia}</div>` : ""}
        <div class="section-text">
          <span class="eyebrow">The Solution</span>
          <h3>${escapeHtml(sol.title || "Switching to")} <span class="hl">${escapeHtml(sol.titleHighlight || "on2cook")}</span></h3>
          <p>${escapeHtml(sol.description || "")}</p>
          <ul class="check-list good">
            ${(sol.points || []).map((pt) => `<li><span class="ico">${iconCheck()}</span>${escapeHtml(pt)}</li>`).join("")}
          </ul>
        </div>
      </section>` : ""}

      ${hasImpact ? `
      <section class="impact reveal">
        <span class="eyebrow">The Impact</span>
        <h3>The impact after switching</h3>
        <p style="color:var(--ink-60);font-size:15.5px;max-width:60ch;margin-top:10px;">The transformation led to measurable improvements across key operations and customer metrics.</p>
        <div class="impact-grid">
          ${imp.stats.map((s) => `
            <div class="stat">
              <div class="stat__value">${escapeHtml(s.value)}</div>
              <div class="stat__label">${escapeHtml(s.label)}</div>
            </div>`).join("")}
        </div>
      </section>` : ""}

      ${hasResults ? `
      <section class="section ${resMedia ? "section--split" : "section--full"} ${(resMedia && flip) ? "flip" : ""} reveal">
        <div class="section-text">
          <span class="eyebrow">The Results</span>
          <h3>${escapeHtml(res.title || "The Results")}</h3>
          <p>${escapeHtml(res.description || "")}</p>
          <ul class="check-list good">
            ${(res.points || []).map((pt) => `<li><span class="ico">${iconCheck()}</span>${escapeHtml(pt)}</li>`).join("")}
          </ul>
        </div>
        ${resMedia ? `<div class="media-box">${resMedia}</div>` : ""}
      </section>` : ""}

      ${hasQuote ? `
      <section class="quote reveal">
        <blockquote>${escapeHtml(quote.text)}</blockquote>
        ${quote.author ? `<cite>${escapeHtml(quote.author)}</cite>` : ""}
      </section>` : ""}
    `;
  }

  function renderPageNav(items, index) {
    const nav = document.getElementById("pageNav");
    if (!nav || items.length < 2) { if (nav) nav.remove(); return; }
    const prev = items[(index - 1 + items.length) % items.length];
    const next = items[(index + 1) % items.length];
    nav.innerHTML = `
      <a class="prev" href="case-study.html?slug=${encodeURIComponent(prev.slug)}">
        <span class="dir">&larr; Previous</span>
        <span class="ttl">${escapeHtml(`${prev.cardTitlePlain} ${prev.cardTitleHighlight}`.trim())}</span>
      </a>
      <a class="next" href="case-study.html?slug=${encodeURIComponent(next.slug)}">
        <span class="dir">Next &rarr;</span>
        <span class="ttl">${escapeHtml(`${next.cardTitlePlain} ${next.cardTitleHighlight}`.trim())}</span>
      </a>`;
  }

  function stripTags(str) { return String(str || "").replace(/<[^>]*>/g, ""); }
})();
