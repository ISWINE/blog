/* 一隅 · 博客前端
 * 纯静态单页：hash 路由 + 相对路径读取 posts.json / posts/*.md / about.md。
 * 读取零 API 依赖，本地与线上都能跑。
 */
(function () {
  "use strict";

  const $ = (sel) => document.querySelector(sel);
  const appEl = $("#app");
  const searchInput = $("#search");
  const themeToggle = $("#theme-toggle");
  const backTop = $("#back-top");
  const toastEl = $("#toast");
  const countEl = $("#post-count");

  let postsIndex = [];      // posts.json 里的文章列表
  let postCache = {};       // slug -> { meta, body }
  let currentSlug = null;

  /* ===================== 主题 ===================== */
  function getTheme() {
    return localStorage.getItem("theme") ||
      (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  }
  function applyTheme(t) {
    document.documentElement.setAttribute("data-theme", t);
    themeToggle.textContent = t === "dark" ? "☀️" : "🌙";
  }
  themeToggle.addEventListener("click", () => {
    const t = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
    localStorage.setItem("theme", t);
    applyTheme(t);
  });

  /* ===================== 工具 ===================== */
  function toast(msg, kind) {
    toastEl.textContent = msg;
    toastEl.className = "toast show " + (kind || "");
    clearTimeout(toast._t);
    toast._t = setTimeout(() => (toastEl.className = "toast"), 2200);
  }
  function escapeHtml(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }
  function readingTime(body) {
    const cn = (body.match(/[\u4e00-\u9fff]/g) || []).length;
    const en = body.replace(/[\u4e00-\u9fff]/g, " ").split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.round((cn + en) / 250));
  }
  function excerptFrom(body, n = 90) {
    const text = body.replace(/[#>*_`~\-|]/g, " ").replace(/\s+/g, " ").trim();
    return text.length > n ? text.slice(0, n) + "…" : text;
  }

  /* ===================== frontmatter 解析 ===================== */
  function parseFrontmatter(md) {
    const m = md.match(/^---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)$/);
    if (!m) return { meta: {}, body: md };
    const meta = {};
    let listKey = null;
    for (const line of m[1].split("\n")) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      if (/^-\s/.test(t) && listKey) {
        meta[listKey] = meta[listKey] || [];
        meta[listKey].push(t.replace(/^-\s*/, "").trim());
        continue;
      }
      const idx = t.indexOf(":");
      if (idx === -1) continue;
      const k = t.slice(0, idx).trim();
      let v = t.slice(idx + 1).trim();
      if (v.startsWith("[") && v.endsWith("]")) {
        v = v.slice(1, -1);
        meta[k] = v.split(",").map((s) => s.trim().replace(/^["']+/, "").replace(/["']+$/, "")).filter(Boolean);
        listKey = k;
      } else {
        meta[k] = v;
        listKey = null;
      }
    }
    return { meta, body: m[2] };
  }

  /* ===================== markdown 渲染 ===================== */
  function renderMarkdown(md) {
    const html = marked.parse(md, { gfm: true, breaks: true });
    return DOMPurify.sanitize(html, { ADD_ATTR: ["target", "rel"] });
  }

  /* ===================== 抓取 ===================== */
  async function fetchText(url) {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error("HTTP " + res.status);
    return res.text();
  }
  async function loadIndex() {
    try {
      const data = JSON.parse(await fetchText("posts.json"));
      postsIndex = Array.isArray(data.posts) ? data.posts : [];
    } catch (e) {
      postsIndex = [];
      console.warn("posts.json 加载失败", e);
    }
  }
  async function loadPost(slug) {
    if (postCache[slug]) return postCache[slug];
    const md = await fetchText("posts/" + slug + ".md");
    const { meta, body } = parseFrontmatter(md);
    postCache[slug] = { meta, body };
    return postCache[slug];
  }

  /* ===================== 视图 ===================== */
  function viewHome() {
    currentSlug = null;
    const q = (searchInput.value || "").trim().toLowerCase();
    let list = postsIndex;
    if (q) {
      list = postsIndex.filter((p) =>
        (p.title + " " + (p.tags || []).join(" ")).toLowerCase().includes(q));
    }
    if (!list.length) {
      appEl.innerHTML = `<div class="empty">还没有文章。<br>去 <a href="admin.html">后台</a> 写第一篇吧。</div>`;
      return;
    }

    appEl.innerHTML = `
      <div class="section-head"><h2>最新文章</h2><span class="count" id="post-count">共 ${list.length} 篇</span></div>
      <div class="post-list">
        ${list.map((p) => `
          <article class="card">
            <div class="date">${escapeHtml(p.date || "")}</div>
            <h3><a href="#/post/${encodeURIComponent(p.slug)}">${escapeHtml(p.title)}</a></h3>
            <div class="excerpt">${escapeHtml(p.excerpt || "")}</div>
            <div class="tags">${(p.tags || []).map((t) => `<span class="tag">${escapeHtml(t)}</span>`).join("")}</div>
            <div class="read-time">${p.readTime || "—"} 分钟阅读</div>
          </article>`).join("")}
      </div>`;
  }

  async function viewPost(slug) {
    currentSlug = slug;
    appEl.innerHTML = `<div class="loading">正在加载…</div>`;
    try {
      const { meta, body } = await loadPost(slug);
      const rt = readingTime(body);
      document.title = (meta.title || slug) + " · 一隅";
      appEl.innerHTML = `
        <div class="breadcrumb"><a href="#/">← 返回</a></div>
        <article class="post">
          <div class="meta">
            <span>${escapeHtml(meta.date || "")}</span>
            ${(meta.tags || []).map((t) => `<span class="tag">${escapeHtml(t)}</span>`).join("")}
            <span>·</span><span>${rt} 分钟阅读</span>
          </div>
          <h1>${escapeHtml(meta.title || slug)}</h1>
          <div class="post-body">${renderMarkdown(body)}</div>
        </article>
        <div id="gitalk-container"><div class="loading">加载评论…</div></div>`;
      loadComments();
    } catch (e) {
      appEl.innerHTML = `<div class="error">加载失败：${escapeHtml(e.message)}<br><a href="#/">返回列表</a></div>`;
      toast("加载失败", "error");
    }
  }

  /* ---- 评论（Gitalk）---- */
  function postId() {
    const hash = location.hash.replace(/^#/, "");
    const m = hash.match(/^\/post\/(.+)$/);
    return m ? m[1] : location.href;
  }
  function loadComments() {
    const container = document.getElementById("gitalk-container");
    if (!container || container.dataset.gitalkInited) return;
    container.dataset.gitalkInited = "1";
    if (typeof Gitalk === "function") { initGitalk(container); return; }
    const s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/gitalk@1/dist/gitalk.min.js";
    s.onload = () => initGitalk(container);
    s.onerror = () => { container.innerHTML = '<div class="error">评论组件加载失败，请刷新重试。</div>'; };
    document.head.appendChild(s);
    if (!document.querySelector('link[href*="gitalk.css"]')) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "https://cdn.jsdelivr.net/npm/gitalk@1/dist/gitalk.css";
      document.head.appendChild(link);
    }
  }
  function initGitalk(container) {
    const g = (window.SITE && SITE.gitalk) || {};
    const owner = (window.SITE && SITE.owner) || "ISWINE";
    const repo = (window.SITE && SITE.repo) || "blog";
    try {
      const gitalk = new Gitalk({
        clientID: g.clientID || "",
        clientSecret: "not-used", // 真实密钥由 worker-proxy 注入，前端不持有
        proxy: g.proxy || "",
        owner: owner,
        repo: repo,
        admin: [owner],
        id: postId(),
        distractionFreeMode: false,
      });
      gitalk.render(container);
    } catch (e) {
      container.innerHTML = '<div class="error">评论初始化失败：' + escapeHtml(e.message) + '</div>';
    }
  }

  async function viewAbout() {
    currentSlug = null;
    appEl.innerHTML = `<div class="loading">正在加载…</div>`;
    try {
      const md = await fetchText("about.md");
      document.title = "关于 · 一隅";
      appEl.innerHTML = `<article class="about post"><div class="post-body">${renderMarkdown(md)}</div></article>`;
    } catch (e) {
      appEl.innerHTML = `<div class="error">关于页加载失败。</div>`;
    }
  }

  /* ===================== 路由 ===================== */
  function route() {
    const hash = location.hash.replace(/^#/, "");
    if (hash.startsWith("/post/")) {
      viewPost(decodeURIComponent(hash.slice(6)));
    } else if (hash === "/about") {
      viewAbout();
    } else if (hash === "/admin") {
      window.location.href = "admin.html";
    } else {
      viewHome();
    }
  }

  /* ===================== 搜索 ===================== */
  searchInput.addEventListener("input", () => {
    if (currentSlug === null) viewHome();
  });

  /* ===================== 返回顶部 ===================== */
  window.addEventListener("scroll", () => {
    backTop.classList.toggle("show", window.scrollY > 400);
  });
  backTop.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));

  /* ===================== 启动 ===================== */
  document.addEventListener("DOMContentLoaded", () => {
    applyTheme(getTheme());
    loadIndex().then(route);
  });
  window.addEventListener("hashchange", route);
})();