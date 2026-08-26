/* ==========================================================================
   on2cook — Case studies listing page
   ========================================================================== */

(async function () {
  const heroTitle = document.getElementById("heroTitle");
  const heroSub = document.getElementById("heroSub");
  const list = document.getElementById("caseStudyList");
  const ctaSlot = document.getElementById("ctaSlot");

  syncNavHeightVar();

  try {
    const data = await loadCaseStudyData();
    const meta = data.meta || {};
    const items = data.caseStudies || [];

    renderHero(meta);
    renderList(items);
    ctaSlot.innerHTML = renderCtaBand(meta);
    renderChrome(meta);

    setYear();
    initScrollReveal(".card, .reveal");
  } catch (err) {
    console.error(err);
    list.innerHTML = `
      <div class="state-msg">
        <h2>Couldn't load case studies</h2>
        <p>Check that <code>data/case-studies.json</code> is reachable, then refresh the page.</p>
      </div>`;
  }

  function renderHero(meta) {
    const title = meta.pageTitle || "Case studies";
    const hl = meta.pageTitleHighlight;
    heroTitle.innerHTML = hl && title.includes(hl)
      ? title.replace(hl, `<em>${escapeHtml(hl)}</em>`)
      : escapeHtml(title);

    const sub = (meta.pageSubtitle || "").replace("{brand}", `<span class="accent">${escapeHtml(meta.brand || "on2cook")}</span>`);
    heroSub.innerHTML = sub;
  }

  function renderList(items) {
    if (!items.length) {
      list.innerHTML = `
        <div class="state-msg">
          <h2>No case studies yet</h2>
          <p>Add a row to the Google Sheet (or an entry to <code>data/case-studies.json</code>) and it'll show up here.</p>
        </div>`;
      return;
    }

    list.innerHTML = items.map((cs) => cardMarkup(cs)).join("");
  }

  function cardMarkup(cs) {
    const media = mediaMarkup(cs.cardImage, cs.cardTitlePlain, cs.category);
    const side = cs.imageSide === "left" ? "card--img-left" : "card--img-right";
    const titleHtml = `${escapeHtml(cs.cardTitlePlain || "")} <em>${escapeHtml(cs.cardTitleHighlight || "")}</em>`;
    return `
      <article class="card ${media ? side : "card--full"}">
        <div class="card__content">
          <span class="card__tag">${escapeHtml(cs.category || "")}</span>
          <h2 class="card__title">${titleHtml}</h2>
          <p class="card__excerpt">${escapeHtml(cs.cardExcerpt || "")}</p>
          <a class="btn btn--red card__link" href="case-study.html?slug=${encodeURIComponent(cs.slug)}">
            Read the full story ${iconArrow()}
          </a>
        </div>
        ${media ? `<div class="card__media">${media}</div>` : ""}
      </article>`;
  }
})();
