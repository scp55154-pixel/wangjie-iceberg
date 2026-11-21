/* 戒网瘾学校兔子洞 · 前端交互
   无外部依赖；所有词条、解释与来源都在本地 data/ 目录。 */
(function () {
  "use strict";

  const DATA = window.ICEBERG;
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const SITE_TITLE = "戒网瘾学校兔子洞 · THE CAMP ICEBERG";
  const STORAGE_KEY = "wangjie-iceberg-visited";

  if (!DATA || !Array.isArray(DATA.entries) || !DATA.entries.length) {
    document.body.insertAdjacentHTML("beforeend", '<div class="fatal">数据没有加载成功。请通过本地服务器打开，或检查 data/ 目录。</div>');
    return;
  }

  const byId = new Map(DATA.entries.map((entry) => [entry.id, entry]));
  const byTier = new Map(DATA.tiers.map((tier) => [tier.id, tier]));
  const entryNo = new Map(DATA.entries.map((entry, index) => [entry.id, String(index + 1).padStart(3, "0")]));

  const TYPE_LABELS = {
    primary: "一手档案",
    report: "调查报道",
    academic: "学术研究",
    culture: "文化文本",
    reference: "参考条目",
    unverified: "未证实"
  };

  const STATUS_CLASS = {
    "已证实": "verified",
    "已判决": "convicted",
    "媒体调查": "report",
    "当事人陈述": "testimony",
    "官方回应": "official",
    "争议": "disputed",
    "未证实": "unconfirmed",
    "文化": "culture"
  };

  const state = {
    category: "全部",
    query: "",
    unreadOnly: false,
    visited: loadVisited(),
    current: null,
    lastFocus: null,
    toastTimer: null
  };

  for (const id of Array.from(state.visited)) {
    if (!byId.has(id)) state.visited.delete(id);
  }

  function loadVisited() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return new Set(Array.isArray(parsed) ? parsed.filter((id) => typeof id === "string") : []);
    } catch (error) {
      return new Set();
    }
  }

  function saveVisited() {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(state.visited)));
    } catch (error) {
      /* 隐私模式下静默失败，阅读不受影响。 */
    }
  }

  function escapeHTML(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function highlight(value, query) {
    const safe = escapeHTML(value);
    if (!query) return safe;
    try {
      return safe.replace(new RegExp("(" + escapeRegExp(escapeHTML(query)) + ")", "gi"), "<mark>$1</mark>");
    } catch (error) {
      return safe;
    }
  }

  function formatDepth(depth) {
    return "−" + Number(depth).toLocaleString("en-US") + " M";
  }

  function sourceCount(entry) {
    return (entry.sources || []).filter((key) => DATA.sources[key]).length;
  }

  function tierFor(entry) {
    return byTier.get(entry.tier);
  }

  function sourceBadge(type) {
    const label = TYPE_LABELS[type] || "来源";
    return '<span class="badge type-' + escapeHTML(type || "reference") + '">' + label + "</span>";
  }

  function statusClass(status) {
    return STATUS_CLASS[status] || "report";
  }

  function statusBadge(status, extraClass) {
    if (!status) return "";
    return '<span class="' + (extraClass || "entry-status") + " status-" + statusClass(status) + '">' + escapeHTML(status) + "</span>";
  }

  function displayStatus(entry) {
    return entry.status && entry.status !== entry.category ? entry.status : "";
  }

  /* ——— 静态结构渲染 ——— */

  function renderBerg() {
    const host = $("#berg-map");
    if (!host) return;
    const rows = DATA.tiers.map((tier, index) => {
      const half = 170 - index * 5.8;
      const x = 210 - half;
      const width = half * 2;
      const y = 76 + index * 54;
      const height = 50;
      return '<g class="berg-band" data-tier="' + tier.id + '" role="button" tabindex="0" aria-label="前往第' + tier.id + '层：' + escapeHTML(tier.name) + '">' +
        '<rect class="berg-hit" x="' + x.toFixed(1) + '" y="' + y + '" width="' + width.toFixed(1) + '" height="' + height + '" fill="' + tier.accent + '" fill-opacity=".07" stroke="rgba(159,232,255,.13)" stroke-width="1"/>' +
        '<text class="berg-label" x="' + (x + 13).toFixed(1) + '" y="' + (y + 18) + '">' + String(tier.num).padStart(2, "0") + " / " + tier.start.toLocaleString("en-US") + "–" + tier.end.toLocaleString("en-US") + " M</text>" +
        '<text class="berg-chinese" x="' + (x + 13).toFixed(1) + '" y="' + (y + 36) + '">' + escapeHTML(tier.name) + "</text>" +
        '<text class="berg-depth" x="' + (x + width - 13).toFixed(1) + '" y="' + (y + 32) + '" text-anchor="end">' + escapeHTML(tier.en) + "</text>" +
        "</g>";
    }).join("");

    host.innerHTML =
      '<svg viewBox="0 0 420 548" role="img" aria-labelledby="berg-title berg-desc">' +
        '<title id="berg-title">戒网瘾学校冰山剖面</title>' +
        '<desc id="berg-desc">从水面 0 米到海床 11000 米，共 8 个层级。点击任意层下潜。</desc>' +
        '<defs>' +
          '<linearGradient id="iceAbove" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d8f9ff" stop-opacity=".22"/><stop offset="1" stop-color="#7ed8ed" stop-opacity=".03"/></linearGradient>' +
          '<linearGradient id="iceBody" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8ad9e9" stop-opacity=".13"/><stop offset="1" stop-color="#0a2330" stop-opacity=".02"/></linearGradient>' +
          '<filter id="bergGlow"><feGaussianBlur stdDeviation="3"/></filter>' +
        "</defs>" +
        '<path d="M210 4 302 28 352 58 68 58 118 28Z" fill="url(#iceAbove)" stroke="rgba(201,246,255,.35)" stroke-width="1"/>' +
        '<path d="M68 58H352L318 520 210 542 102 520Z" fill="url(#iceBody)" stroke="rgba(159,232,255,.12)" stroke-width="1"/>' +
        '<path d="M44 58H376" class="berg-water"/>' +
        '<text class="berg-water-label" x="44" y="50">SEA LEVEL / 0 M</text>' +
        '<text class="berg-water-label" x="376" y="50" text-anchor="end">8 TIERS / 120 ENTRIES</text>' +
        rows +
        '<path d="M102 520 210 542 318 520" fill="none" stroke="rgba(212,127,143,.38)" stroke-width="1"/>' +
        '<text class="berg-depth" x="210" y="538" text-anchor="middle" fill="rgba(224,90,90,.72)">THE 86 RULES / −11000 M</text>' +
      "</svg>";

    host.addEventListener("click", (event) => {
      const band = event.target.closest(".berg-band");
      if (band) scrollToTier(Number(band.dataset.tier));
    });
    host.addEventListener("keydown", (event) => {
      const band = event.target.closest(".berg-band");
      if (band && (event.key === "Enter" || event.key === " ")) {
        event.preventDefault();
        scrollToTier(Number(band.dataset.tier));
      }
    });
  }

  function renderTiers() {
    const host = $("#tiers");
    if (!host) return;
    const fragment = document.createDocumentFragment();

    for (const tier of DATA.tiers) {
      const entries = DATA.entries.filter((entry) => entry.tier === tier.id);
      const section = document.createElement("section");
      section.className = "tier reveal";
      section.id = "tier-" + tier.id;
      section.dataset.num = tier.num;
      section.dataset.tier = tier.id;
      section.style.setProperty("--accent", tier.accent);
      section.innerHTML =
        '<div class="tier-head">' +
          '<div class="tier-index">' + tier.num + "</div>" +
          "<div>" +
            '<p class="tier-kicker">TIER ' + tier.num + " · " + tier.start.toLocaleString("en-US") + "–" + tier.end.toLocaleString("en-US") + " M <span>" + escapeHTML(tier.en) + "</span></p>" +
            "<h2>" + escapeHTML(tier.name) + "</h2>" +
            '<p class="tier-desc">' + escapeHTML(tier.desc) + "</p>" +
          "</div>" +
          '<div class="tier-side"><span class="tier-count"><b>' + entries.length + "</b> ENTRIES</span><span class=\"tier-rule\"></span></div>" +
        "</div>" +
        '<div class="entry-grid" role="list"></div>';

      const grid = $(".entry-grid", section);
      for (const entry of entries) grid.appendChild(renderEntry(entry));
      fragment.appendChild(section);
    }

    host.replaceChildren(fragment);
    const noResults = document.createElement("div");
    noResults.className = "no-results";
    noResults.id = "no-results";
    noResults.hidden = true;
    noResults.innerHTML = '<span>NO SIGNAL</span><p>没有匹配的词条。试试更短的关键词，或回到“全部”。</p>';
    host.after(noResults);
  }

  function renderEntry(entry) {
    const node = document.createElement("article");
    node.className = "entry" + (state.visited.has(entry.id) ? " is-visited" : "");
    node.dataset.id = entry.id;
    node.tabIndex = 0;
    node.setAttribute("role", "button");
    node.setAttribute("aria-haspopup", "dialog");
    node.setAttribute("aria-label", "打开词条：" + entry.title);
    node.innerHTML =
      '<div class="entry-top"><span class="entry-id">#' + entryNo.get(entry.id) + '</span><span class="entry-depth">' + formatDepth(entry.depth) + "</span></div>" +
      "<h3>" + highlight(entry.title, state.query) + '<span class="entry-en">' + escapeHTML(entry.en) + "</span></h3>" +
      "<p>" + highlight(entry.teaser, state.query) + "</p>" +
      '<div class="entry-meta"><span class="entry-cat">' + escapeHTML(entry.category) + "</span>" + statusBadge(displayStatus(entry), "entry-status") + '<span class="entry-arrow">OPEN ↗</span></div>';
    return node;
  }

  function renderFilters() {
    const host = $("#category-filters");
    if (!host) return;
    const counts = new Map();
    for (const entry of DATA.entries) counts.set(entry.category, (counts.get(entry.category) || 0) + 1);
    host.innerHTML = DATA.categories.map((category) => {
      const count = category === "全部" ? DATA.entries.length : counts.get(category) || 0;
      const active = state.category === category;
      return '<button class="chip' + (active ? " is-active" : "") + '" type="button" data-category="' + escapeHTML(category) + '" aria-pressed="' + active + '" title="' + count + ' 个词条">' + escapeHTML(category) + "</button>";
    }).join("");
    host.onclick = (event) => {
      const chip = event.target.closest("[data-category]");
      if (!chip) return;
      state.category = chip.dataset.category;
      renderFilters();
      applyFilters();
    };
  }

  function renderRail() {
    const host = $("#rail-dots");
    if (!host) return;
    host.innerHTML = DATA.tiers.map((tier) =>
      '<button class="rail-dot" type="button" data-tier="' + tier.id + '" aria-label="第' + tier.id + '层：' + escapeHTML(tier.name) + '"><em>' + tier.num + " · " + escapeHTML(tier.name) + "</em></button>"
    ).join("");
    host.addEventListener("click", (event) => {
      const dot = event.target.closest("[data-tier]");
      if (dot) scrollToTier(Number(dot.dataset.tier));
    });
  }

  /* ——— 搜索与筛选 ——— */

  function haystack(entry) {
    return [entry.title, entry.en, entry.teaser, entry.category, entry.status, entry.why, entry.evidenceNote, ...(entry.tags || []), ...(entry.body || [])].join(" ").toLowerCase();
  }

  function applyFilters() {
    const query = state.query.trim().toLowerCase();
    const cards = $$(".entry");
    let visible = 0;

    for (const card of cards) {
      const entry = byId.get(card.dataset.id);
      if (!entry) continue;
      const matchesQuery = !query || haystack(entry).includes(query);
      const matchesCategory = state.category === "全部" || entry.category === state.category;
      const matchesUnread = !state.unreadOnly || !state.visited.has(entry.id);
      const show = matchesQuery && matchesCategory && matchesUnread;
      card.classList.toggle("is-hidden", !show);
      if (show) {
        visible += 1;
        const title = $("h3", card);
        const teaser = $("p", card);
        if (title) title.innerHTML = highlight(entry.title, state.query) + '<span class="entry-en">' + escapeHTML(entry.en) + "</span>";
        if (teaser) teaser.innerHTML = highlight(entry.teaser, state.query);
      }
    }

    for (const tier of $$(".tier")) {
      const any = $$(".entry:not(.is-hidden)", tier).length > 0;
      tier.classList.toggle("is-empty", !any);
    }

    const resultCount = $("#result-count");
    if (resultCount) resultCount.textContent = visible + " 个词条";
    updateVisitedCount();
    const noResults = $("#no-results");
    if (noResults) noResults.hidden = visible !== 0;
    const hint = $(".result-hint");
    if (hint) hint.textContent = query || state.category !== "全部" || state.unreadOnly ? "已按条件筛选 · 点击词条查看证据" : "点击词条展开解释与证据链";
  }

  function updateVisitedCount() {
    const el = $("#visited-count");
    if (el) el.textContent = "已下潜 " + state.visited.size + " / " + DATA.entries.length;
  }

  function resetFilters() {
    state.category = "全部";
    state.query = "";
    state.unreadOnly = false;
    const search = $("#search");
    if (search) search.value = "";
    const unread = $("#unread-toggle");
    if (unread) {
      unread.setAttribute("aria-pressed", "false");
      unread.textContent = "只看未读";
    }
    renderFilters();
    applyFilters();
    showToast("筛选已重置");
  }

  function readURLState() {
    try {
      const params = new URLSearchParams(window.location.search);
      const q = params.get("q");
      if (q) {
        state.query = q;
        const search = $("#search");
        if (search) search.value = q;
      }
      const cat = params.get("cat");
      if (cat && DATA.categories.includes(cat)) state.category = cat;
    } catch (error) {
      /* 旧浏览器或异常 URL 不影响阅读。 */
    }
  }

  /* ——— 词条弹窗 ——— */

  function openEntry(id) {
    const entry = byId.get(id);
    if (!entry) return;
    const tier = tierFor(entry);
    state.current = entry;
    const modal = $("#modal");
    const wasOpen = modal?.classList.contains("is-open");
    if (!wasOpen) state.lastFocus = document.activeElement;
    markVisited(entry.id);

    const body = $("#modal-body");
    if (!modal || !body) return;
    modal.style.setProperty("--accent", tier.accent);
    $("#modal-tier").textContent = "TIER " + tier.num + " / " + tier.name;
    $("#modal-depth").textContent = formatDepth(entry.depth) + " · " + entry.en;

    const evidence = (entry.sources || []).map((key) => {
      const source = DATA.sources[key];
      if (!source) return "";
      let url = "";
      try {
        const parsed = new URL(source.url);
        if (parsed.protocol === "http:" || parsed.protocol === "https:") url = parsed.href;
      } catch (error) {
        return "";
      }
      if (!url) return "";
      return '<a class="evidence-item" href="' + escapeHTML(url) + '" target="_blank" rel="noopener noreferrer">' +
        sourceBadge(source.type) +
        '<span class="evidence-copy"><b>' + escapeHTML(source.label) + "</b><small>" + escapeHTML(source.publisher) + " · " + escapeHTML(source.year) + "</small></span>" +
        '<span class="evidence-arrow" aria-hidden="true">↗</span>' +
      "</a>";
    }).join("");

    const tags = (entry.tags || []).map((tag) => '<span class="modal-tag">#' + escapeHTML(tag) + "</span>").join("");
    const statusHTML = displayStatus(entry) ? '<span class="dot"></span>' + statusBadge(displayStatus(entry), "badge modal-status") : "";
    body.innerHTML =
      '<div class="modal-eyebrow"><span>ENTRY ' + entryNo.get(entry.id) + '</span><span class="dot"></span><span>' + escapeHTML(entry.category) + "</span>" + statusHTML + '<span class="dot"></span><span>' + sourceCount(entry) + " 条证据</span></div>" +
      '<h2 id="modal-title">' + escapeHTML(entry.title) + "</h2>" +
      '<p class="modal-en">' + escapeHTML(entry.en) + "</p>" +
      '<p class="modal-teaser">' + escapeHTML(entry.teaser) + "</p>" +
      '<div class="modal-text">' + (entry.body || []).map((paragraph) => "<p>" + escapeHTML(paragraph) + "</p>").join("") + "</div>" +
      '<div class="modal-why"><span>WHY IT IS HERE / 为什么它在图里</span><p>' + escapeHTML(entry.why) + "</p></div>" +
      (entry.fictional ? '<p class="modal-fictional">' + escapeHTML(entry.fictionNote || "本词条为虚构文本。") + "</p>" : "") +
      '<section class="evidence" aria-labelledby="evidence-title">' +
        '<div class="evidence-head"><h3 id="evidence-title">EVIDENCE / 证据与延伸阅读</h3><span>' + sourceCount(entry) + " 条 · 外部链接</span></div>" +
        (entry.evidenceNote ? '<p class="evidence-note">' + escapeHTML(entry.evidenceNote) + "</p>" : "") +
        '<div class="evidence-list">' + (evidence || '<p class="evidence-empty">此条目暂无可用链接。</p>') + "</div>" +
      "</section>" +
      '<div class="modal-foot"><div class="modal-tags">' + tags + "</div>" +
        '<div class="modal-actions"><button class="modal-action" type="button" data-action="copy">复制链接</button><button class="modal-action" type="button" data-action="random">随机再坠</button></div>' +
      "</div>" +
      '<p class="modal-source-note">来源不等于结论。请区分法院判决、官方通报、调查报道、当事人陈述与争议材料。若外部链接无法打开，可能是站点改版、删除或地区网络限制。</p>';

    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
    $(".modal-scroll", modal).scrollTop = 0;
    document.title = entry.title + " · " + SITE_TITLE;

    const hash = "#entry=" + encodeURIComponent(entry.id);
    if (window.location.hash !== hash) window.history.replaceState(null, "", hash);

    const close = $(".modal-close", modal);
    if (close) window.setTimeout(() => close.focus({ preventScroll: true }), 40);
  }

  function closeModal() {
    const modal = $("#modal");
    if (!modal || !modal.classList.contains("is-open")) return;
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");
    document.title = SITE_TITLE;
    state.current = null;
    if (window.location.hash.startsWith("#entry=")) {
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
    }
    if (state.lastFocus && typeof state.lastFocus.focus === "function") state.lastFocus.focus({ preventScroll: true });
    if (state.unreadOnly) applyFilters();
  }

  function markVisited(id) {
    if (state.visited.has(id)) return;
    state.visited.add(id);
    saveVisited();
    const card = document.querySelector('.entry[data-id="' + CSS.escape(id) + '"]');
    if (card) card.classList.add("is-visited");
    updateVisitedCount();
  }

  function randomEntry() {
    const pool = DATA.entries.filter((entry) => {
      const card = document.querySelector('.entry[data-id="' + CSS.escape(entry.id) + '"]');
      return card && !card.classList.contains("is-hidden");
    });
    const list = pool.length ? pool : DATA.entries;
    const entry = list[Math.floor(Math.random() * list.length)];
    openEntry(entry.id);
  }

  function copyCurrentLink() {
    if (!state.current) return;
    const url = window.location.origin + window.location.pathname + "#entry=" + encodeURIComponent(state.current.id);
    const done = () => showToast("链接已复制到剪贴板");
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(url).then(done).catch(() => fallbackCopy(url, done));
    } else {
      fallbackCopy(url, done);
    }
  }

  function fallbackCopy(text, done) {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    try {
      document.execCommand("copy");
      done();
    } catch (error) {
      showToast("复制失败，请从地址栏复制");
    }
    area.remove();
  }

  function showToast(message) {
    const toast = $("#toast");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("show");
    window.clearTimeout(state.toastTimer);
    state.toastTimer = window.setTimeout(() => toast.classList.remove("show"), 2200);
  }

  /* ——— 深度、滚动与导航 ——— */

  function scrollToTier(id) {
    const target = document.getElementById("tier-" + id);
    if (!target) return;
    target.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
    window.setTimeout(() => target.querySelector(".entry")?.focus({ preventScroll: true }), reduceMotion ? 0 : 650);
  }

  let scrollFrame = 0;
  function updateDepth() {
    scrollFrame = 0;
    const doc = document.documentElement;
    const max = Math.max(1, doc.scrollHeight - window.innerHeight);
    const progress = Math.min(1, Math.max(0, window.scrollY / max));
    const fill = $("#rail-fill");
    if (fill) fill.style.height = (progress * 100).toFixed(2) + "%";
    const bar = $("#scroll-progress");
    if (bar) bar.style.width = (progress * 100).toFixed(2) + "%";

    let activeTier = null;
    let depth = 0;
    const anchor = window.innerHeight * 0.42;
    for (const section of $$(".tier")) {
      const rect = section.getBoundingClientRect();
      if (rect.top <= anchor) {
        const tier = byTier.get(Number(section.dataset.tier));
        if (!tier) continue;
        activeTier = tier;
        const local = Math.min(1, Math.max(0, (anchor - rect.top) / Math.max(1, rect.height)));
        depth = tier.start + (tier.end - tier.start) * local;
      }
    }
    const readout = $("#depth-readout");
    if (readout) readout.textContent = String(Math.round(depth)).padStart(4, "0");
    for (const dot of $$(".rail-dot")) {
      const isActive = activeTier && Number(dot.dataset.tier) === activeTier.id;
      dot.classList.toggle("is-active", Boolean(isActive));
      if (isActive) dot.setAttribute("aria-current", "true");
      else dot.removeAttribute("aria-current");
    }
    for (const band of $$(".berg-band")) {
      band.classList.toggle("is-active", Boolean(activeTier && Number(band.dataset.tier) === activeTier.id));
    }
  }

  function onScroll() {
    if (!scrollFrame) scrollFrame = window.requestAnimationFrame(updateDepth);
  }

  /* ——— 雪花 ——— */

  function initSnow() {
    const canvas = $("#snow");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let width = 0;
    let height = 0;
    let flakes = [];
    let running = true;

    function resize() {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = width + "px";
      canvas.style.height = height + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = reduceMotion ? 0 : Math.max(22, Math.min(70, Math.round(width / 26)));
      flakes = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        r: 0.5 + Math.random() * 1.7,
        speed: 0.12 + Math.random() * 0.42,
        drift: -0.12 + Math.random() * 0.24,
        alpha: 0.12 + Math.random() * 0.42
      }));
      ctx.clearRect(0, 0, width, height);
      if (reduceMotion) drawStatic();
    }

    function drawStatic() {
      for (const flake of flakes) {
        ctx.beginPath();
        ctx.fillStyle = "rgba(210,246,255," + flake.alpha + ")";
        ctx.arc(flake.x, flake.y, flake.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    let last = 0;
    function frame(time) {
      if (!running) return;
      if (time - last > 32) {
        last = time;
        ctx.clearRect(0, 0, width, height);
        for (const flake of flakes) {
          flake.y += flake.speed;
          flake.x += flake.drift;
          if (flake.y > height + 4) {
            flake.y = -4;
            flake.x = Math.random() * width;
          }
          if (flake.x < -4) flake.x = width + 4;
          if (flake.x > width + 4) flake.x = -4;
          ctx.beginPath();
          ctx.fillStyle = "rgba(210,246,255," + flake.alpha + ")";
          ctx.arc(flake.x, flake.y, flake.r, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      window.requestAnimationFrame(frame);
    }

    resize();
    window.addEventListener("resize", resize, { passive: true });
    document.addEventListener("visibilitychange", () => {
      running = !document.hidden;
      if (running && !reduceMotion) window.requestAnimationFrame(frame);
    });
    if (!reduceMotion) window.requestAnimationFrame(frame);
  }

  /* ——— 事件绑定 ——— */

  function bindEvents() {
    const search = $("#search");
    if (search) {
      search.addEventListener("input", () => {
        state.query = search.value;
        applyFilters();
      });
      search.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
          search.value = "";
          state.query = "";
          applyFilters();
          search.blur();
        }
      });
    }

    const unread = $("#unread-toggle");
    if (unread) {
      unread.addEventListener("click", () => {
        state.unreadOnly = !state.unreadOnly;
        unread.setAttribute("aria-pressed", String(state.unreadOnly));
        unread.textContent = state.unreadOnly ? "显示全部" : "只看未读";
        applyFilters();
      });
    }

    const reset = $("#reset-filters");
    if (reset) reset.addEventListener("click", resetFilters);
    for (const button of [$("#random-top"), $("#random-hero")]) {
      if (button) button.addEventListener("click", randomEntry);
    }

    const tiers = $("#tiers");
    if (tiers) {
      tiers.addEventListener("click", (event) => {
        const card = event.target.closest(".entry");
        if (card) openEntry(card.dataset.id);
      });
      tiers.addEventListener("keydown", (event) => {
        const card = event.target.closest(".entry");
        if (card && (event.key === "Enter" || event.key === " ")) {
          event.preventDefault();
          openEntry(card.dataset.id);
        }
      });
    }

    const modal = $("#modal");
    if (modal) {
      modal.addEventListener("click", (event) => {
        if (event.target.closest("[data-close]")) {
          closeModal();
          return;
        }
        const action = event.target.closest("[data-action]");
        if (!action) return;
        if (action.dataset.action === "copy") copyCurrentLink();
        if (action.dataset.action === "random") randomEntry();
      });
    }
    const close = $("#modal-close");
    if (close) close.addEventListener("click", closeModal);

    document.addEventListener("keydown", (event) => {
      if (event.key === "/" && !modal?.classList.contains("is-open") && !/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName || "")) {
        event.preventDefault();
        search?.focus();
      }
      if (event.key === "Escape") {
        if (modal?.classList.contains("is-open")) closeModal();
        else if (state.query && document.activeElement === search) {
          search.value = "";
          state.query = "";
          applyFilters();
        }
      }
      if (event.key === "Tab" && modal?.classList.contains("is-open")) {
        const focusable = $$('a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])', modal).filter((el) => el.offsetParent !== null);
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    });

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    window.addEventListener("hashchange", openHashEntry);
  }

  function initReveal() {
    const elements = $$(".reveal");
    if (reduceMotion || !("IntersectionObserver" in window)) {
      for (const el of elements) el.classList.add("is-in");
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-in");
          observer.unobserve(entry.target);
        }
      }
    }, { threshold: 0.04, rootMargin: "0px 0px -4% 0px" });
    for (const el of elements) observer.observe(el);
  }

  function openHashEntry() {
    if (!window.location.hash.startsWith("#entry=")) return;
    const id = decodeURIComponent(window.location.hash.slice(7));
    if (!byId.has(id)) return;
    const modal = $("#modal");
    if (modal && modal.classList.contains("is-open") && state.current && state.current.id === id) return;
    window.setTimeout(() => {
      const currentModal = $("#modal");
      if (currentModal && currentModal.classList.contains("is-open") && state.current && state.current.id === id) return;
      openEntry(id);
    }, 80);
  }

  function init() {
    readURLState();
    renderBerg();
    renderTiers();
    renderFilters();
    renderRail();
    bindEvents();
    initSnow();
    initReveal();
    applyFilters();
    updateDepth();
    openHashEntry();
    window.setTimeout(() => {
      const modal = $("#modal");
      if (modal && !modal.classList.contains("is-open")) openHashEntry();
    }, 260);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
