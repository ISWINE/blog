/* 一隅 · 后台管理（GitHub API）
 * 写操作走 GitHub Contents API，需要 fine-grained PAT（仅该仓库，Contents: Read & Write）。
 * Token 只存浏览器 localStorage，绝不提交到仓库。
 */
(function () {
  "use strict";
  const $ = (sel) => document.querySelector(sel);
  const postsDir = (typeof SITE !== "undefined" && SITE.postsDir) || "posts";

  const LS = {
    owner: "gh_owner", repo: "gh_repo", branch: "gh_branch", token: "gh_token",
  };
  const els = {
    login: $("#login-card"),
    list: $("#list-panel"),
    editor: $("#editor-panel"),
    postList: $("#post-list"),
    userHint: $("#user-hint"),
    fOwner: $("#f-owner"), fRepo: $("#f-repo"), fBranch: $("#f-branch"), fToken: $("#f-token"),
    eTitle: $("#e-title"), eSlug: $("#e-slug"), eDate: $("#e-date"), eTags: $("#e-tags"),
    editorEl: $("#e-editor"),
    edBack: $("#ed-back"), metaBall: $("#meta-ball"), metaPop: $("#meta-pop"), metaClose: $("#meta-close"),
    loginBtn: $("#login-btn"), pasteLoginBtn: $("#paste-login-btn"), linkHint: $("#link-hint"),
    newBtn: $("#new-btn"), syncBtn: $("#sync-btn"),
    logoutBtn: $("#logout-btn"), publishBtn: $("#publish-btn"),
    toast: $("#toast"), backTop: $("#back-top"),
  };

  let cfg = { owner: "", repo: "", branch: "main", token: "" };
  let editingSlug = null; // null = 新建
  let slugManual = false;

  /* ---- toast ---- */
  function toast(msg, kind) {
    els.toast.textContent = msg;
    els.toast.className = "toast show " + (kind || "");
    clearTimeout(toast._t);
    toast._t = setTimeout(() => (els.toast.className = "toast"), 2200);
  }

  /* ---- 工具 ---- */
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
  function slugify(s) {
    return (s || "").trim().toLowerCase().replace(/\s+/g, "-")
      .replace(/[^\w\u4e00-\u9fff-]/g, "").replace(/-+/g, "-").replace(/^-|-$/g, "") || "post";
  }
  function today() {
    const d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }
  function cleanToken(t) {
    // GitHub Token 只含字母、数字、下划线；清除复制时混入的不可见 Unicode、换行等，
    // 否则浏览器会拒绝含非 ISO-8859-1 字符的 fetch header。
    return (t || "").replace(/[^a-zA-Z0-9_]/g, "");
  }

  /* ---- frontmatter ---- */
  function parseFrontmatter(md) {
    const m = md.match(/^---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)$/);
    if (!m) return { meta: {}, body: md };
    const meta = {};
    let listKey = null;
    for (const line of m[1].split("\n")) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      if (/^-\s/.test(t) && listKey) { meta[listKey] = meta[listKey] || []; meta[listKey].push(t.replace(/^-\s*/, "").trim()); continue; }
      const idx = t.indexOf(":");
      if (idx === -1) continue;
      const k = t.slice(0, idx).trim();
      let v = t.slice(idx + 1).trim();
      if (v.startsWith("[") && v.endsWith("]")) { v = v.slice(1, -1); meta[k] = v.split(",").map((s) => s.trim().replace(/^["']+/, "").replace(/["']+$/, "")).filter(Boolean); listKey = k; }
      else { meta[k] = v; listKey = null; }
    }
    return { meta, body: m[2] };
  }

/* ---- GitHub API ---- */
  function authHeaders() {
    return cfg.token
      ? { "Authorization": "Bearer " + cfg.token, "Accept": "application/vnd.github+json" }
      : { "Accept": "application/vnd.github+json" };
  }
  function encPath(...segs) {
    return "/repos/" + cfg.owner + "/" + cfg.repo + "/" + segs.map((s) => encodeURIComponent(String(s))).join("/");
  }
  function contentsApi(rel) { return encPath("contents", ...rel.split("/")); }
  function rawUrl(rel) {
    return "https://raw.githubusercontent.com/" + cfg.owner + "/" + cfg.repo + "/" + cfg.branch + "/"
      + rel.split("/").map((s) => encodeURIComponent(s)).join("/");
  }
  async function ghGet(path) {
    const res = await fetch("https://api.github.com" + path, { headers: authHeaders() });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error("GET 失败 (" + res.status + ")");
    return await res.json();
  }
  async function ghPut(path, body) {
    const res = await fetch("https://api.github.com" + path, {
      method: "PUT", headers: { ...authHeaders(), "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    if (!res.ok) { const t = await res.text(); throw new Error("PUT 失败 (" + res.status + ") " + t.slice(0, 200)); }
    return await res.json();
  }
  async function ghDel(path, body) {
    const res = await fetch("https://api.github.com" + path, {
      method: "DELETE", headers: authHeaders(), body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok && res.status !== 204) { const t = await res.text(); throw new Error("DELETE 失败 (" + res.status + ") " + t.slice(0, 200)); }
    return true;
  }
  function b64(str) { return btoa(unescape(encodeURIComponent(str))); }

  async function fileSha(rel) { const d = await ghGet(contentsApi(rel)); return d ? d.sha : null; }
  async function putFile(rel, content, message) {
    const sha = await fileSha(rel);
    return ghPut(contentsApi(rel), { message, content: b64(content), branch: cfg.branch, sha });
  }
  async function deleteFile(rel) {
    const d = await ghGet(contentsApi(rel));
    if (!d) return;
    await ghDel(contentsApi(rel), { message: "删除 " + rel, sha: d.sha, branch: cfg.branch });
  }
  async function readPostsJson() {
    const d = await ghGet(contentsApi("posts.json"));
    if (!d) return [];
    try { return JSON.parse(decodeURIComponent(escape(atob(d.content)))).posts || []; }
    catch { return []; }
  }
  async function writePostsJson(posts) {
    await putFile("posts.json", JSON.stringify({ posts }, null, 2), "更新文章索引");
  }

  /* ---- 登录 ---- */
  function readFragmentCreds() {
    try {
      const hash = location.hash.replace(/^#/, "");
      if (!hash) return null;
      const p = new URLSearchParams(hash);
      const token = p.get("token");
      if (!token) return null;
      return {
        owner: p.get("owner") || "",
        repo: p.get("repo") || "",
        branch: p.get("branch") || "main",
        token,
      };
    } catch (e) { return null; }
  }

  function detectRepoFromUrl() {
    try {
      const host = location.hostname;
      const owner = host.endsWith(".github.io") ? host.slice(0, -".github.io".length) : "";
      const segs = location.pathname.split("/").filter(Boolean);
      let repo;
      if (!segs.length) {
        repo = owner; // 根目录：用户/组织站点，仓库就是用户名
      } else if (/\./.test(segs[0])) {
        // 第一段是个文件（如 /admin.html）→ 用户/组织站点，仓库就是用户名
        repo = owner;
      } else {
        // 第一段是目录名 → 项目站点，仓库就是它
        repo = segs[0];
      }
      return { owner, repo };
    } catch (e) { return { owner: "", repo: "" }; }
  }

  function renderLinkHint() {
    const d = detectRepoFromUrl();
    const owner = (els.fOwner.value && els.fOwner.value !== "your-github-username") ? els.fOwner.value : (d.owner || (typeof SITE !== "undefined" && SITE.owner) || "OWNER");
    const repo = (els.fRepo.value && els.fRepo.value !== "blog") ? els.fRepo.value : (d.repo || (typeof SITE !== "undefined" && SITE.repo) || "REPO");
    const branch = els.fBranch.value || (typeof SITE !== "undefined" && SITE.branch) || "main";
    const url = "https://" + owner + ".github.io/" + repo + "/admin.html#token=TOKEN&owner=" + owner + "&repo=" + repo + "&branch=" + branch;
    els.linkHint.textContent = "或者用登录链接（不用填表）：复制下面这行，把 TOKEN 换成你的 Token，直接打开即可。Token 只经过浏览器，不会发给任何服务器。\n" + url;
  }

  function applyDefaults() {
    const d = detectRepoFromUrl();
    if (!els.fOwner.value) els.fOwner.value = d.owner || (typeof SITE !== "undefined" && SITE.owner) || "";
    if (!els.fRepo.value) els.fRepo.value = d.repo || (typeof SITE !== "undefined" && SITE.repo) || "";
    if (!els.fBranch.value) els.fBranch.value = (typeof SITE !== "undefined" && SITE.branch) || "main";
  }

  function loadAuth() {
    renderLinkHint();
    const frag = readFragmentCreds();
    if (frag && frag.token) {
      els.fOwner.value = frag.owner || "";
      els.fRepo.value = frag.repo || "";
      els.fBranch.value = frag.branch || "";
      els.fToken.value = frag.token;
      applyDefaults();
      doLogin(true).finally(() => {
        try { history.replaceState(null, "", location.pathname + location.search); } catch (e) {}
      });
      return;
    }
    els.fOwner.value = localStorage.getItem(LS.owner) || "";
    els.fRepo.value = localStorage.getItem(LS.repo) || "";
    els.fBranch.value = localStorage.getItem(LS.branch) || "";
    els.fToken.value = localStorage.getItem(LS.token) || "";
    applyDefaults();
    if (els.fToken.value) doLogin(true);
  }
  els.loginBtn.addEventListener("click", () => doLogin(false));
  els.pasteLoginBtn.addEventListener("click", pasteLogin);

  async function pasteLogin() {
    let token = "";
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        token = await navigator.clipboard.readText();
      }
    } catch (e) { /* 剪贴板不可读，改用手动填写 */ }
    token = cleanToken(token);
    if (!token) {
      toast("读取剪贴板失败，请改用「手动填写」", "error");
      return;
    }
    els.fToken.value = token;
    applyDefaults();
    await doLogin(false);
  }
  async function doLogin(silent) {
    const owner = els.fOwner.value.trim(), repo = els.fRepo.value.trim(),
      branch = els.fBranch.value.trim() || "main", token = cleanToken(els.fToken.value);
    if (!owner || !repo || !token) { toast("请填写用户名、仓库名和 Token", "error"); return; }
    cfg = { owner, repo, branch, token };
    els.loginBtn.disabled = true;
    try {
      const user = await ghGet("/user");
      if (!user || !user.login) throw new Error("Token 无效或权限不足");
      localStorage.setItem(LS.owner, owner); localStorage.setItem(LS.repo, repo);
      localStorage.setItem(LS.branch, branch); localStorage.setItem(LS.token, token);
      els.login.style.display = "none";
      els.list.style.display = "block";
      els.userHint.innerHTML = "已登录 · <b>" + escapeHtml(user.login) + "</b> · 仓库 <b>" + escapeHtml(owner + "/" + repo) + "</b>";
      await loadPostList();
    } catch (e) {
      const msg = /401|403/.test(e.message)
        ? "Token 无效、已过期或权限不足。请到 GitHub 重新生成一个：Settings → Developer settings → Personal access tokens，选 fine-grained（仅 ISWINE/blog 仓库，Contents: Read & write）或 classic（repo 权限），复制完整 Token 后再试。"
        : e.message;
      toast("登录失败：" + msg, "error");
      localStorage.removeItem(LS.token);
    } finally { els.loginBtn.disabled = false; }
  }

  /* ---- 文章列表 ---- */
  els.logoutBtn.addEventListener("click", () => {
    localStorage.removeItem(LS.token); localStorage.removeItem(LS.owner);
    localStorage.removeItem(LS.repo); localStorage.removeItem(LS.branch);
    location.reload();
  });
  els.newBtn.addEventListener("click", () => openEditor(null));
  els.syncBtn.addEventListener("click", syncIndex);

  async function loadPostList() {
    els.postList.innerHTML = `<div class="loading">加载中…</div>`;
    try {
      const posts = await readPostsJson();
      if (!posts.length) {
        els.postList.innerHTML = `<div class="empty">还没有文章，点击「新建文章」开始。</div>`;
        return;
      }
      els.postList.innerHTML = posts.map((p) => `
        <div class="post-row">
          <div class="info">
            <div class="ptitle">${escapeHtml(p.title || p.slug)}</div>
            <div class="pmeta">${escapeHtml(p.date || "")} ${(p.tags || []).map((t) => `<span class="tag">${escapeHtml(t)}</span>`).join("")}</div>
          </div>
          <div class="actions">
            <button class="btn ghost edit-btn" data-slug="${escapeHtml(p.slug)}">编辑</button>
            <button class="btn danger del-btn" data-slug="${escapeHtml(p.slug)}">删除</button>
          </div>
        </div>`).join("");
      els.postList.querySelectorAll(".edit-btn").forEach((b) => b.addEventListener("click", () => openEdit(b.dataset.slug)));
      els.postList.querySelectorAll(".del-btn").forEach((b) => b.addEventListener("click", () => deletePost(b.dataset.slug)));
    } catch (e) { els.postList.innerHTML = `<div class="error">加载失败：${escapeHtml(e.message)}</div>`; }
  }

  async function openEdit(slug) {
    try {
      const md = await (await fetch(rawUrl(postsDir + "/" + slug + ".md"))).text();
      const { meta, body } = parseFrontmatter(md);
      openEditor({ slug, title: meta.title || slug, date: meta.date || today(), tags: (meta.tags || []).join(", "), body });
    } catch (e) { toast("读取文章失败：" + e.message, "error"); }
  }
  function openEditor(post) {
    editingSlug = post ? post.slug : null;
    slugManual = !!post;
    els.publishBtn.textContent = post ? "更新" : "发布";
    els.eTitle.value = post ? post.title : "";
    els.eSlug.value = post ? post.slug : "";
    els.eDate.value = post ? (post.date || today()) : today();
    els.eTags.value = post ? post.tags : "";
    curValue = post ? post.body : ""; // 先保证内容缓存正确，编辑器未就绪时发布也不会丢内容
    if (mdEditor) mdEditor.$set({ value: curValue });
    els.metaPop.classList.remove("open");
    els.editor.classList.add("editor-open");
    els.editor.style.display = "flex"; // 覆盖模板上的内联 display:none
    window.scrollTo({ top: 0 });
  }
  function closeEditor() {
    els.editor.classList.remove("editor-open");
    els.metaPop.classList.remove("open");
    els.editor.style.display = "none";
  }

  /* ---- 编辑器交互 ---- */
  els.eTitle.addEventListener("input", () => { if (!slugManual) els.eSlug.value = slugify(els.eTitle.value); });
  els.eSlug.addEventListener("focus", () => { slugManual = true; });

  /* ---- ByteMD 编辑器 ---- */
  let mdEditor = null;      // ByteMD 实例
  let curValue = "";        // 编辑器当前内容缓存
  // 常用编程语言（highlight.js 支持的标识符）
  const CODE_LANGS = [
    ["Text", ""], ["Bash", "bash"], ["C", "c"], ["C++", "cpp"], ["C#", "csharp"],
    ["Java", "java"], ["JavaScript", "javascript"], ["TypeScript", "typescript"],
    ["Python", "python"], ["Go", "go"], ["Rust", "rust"], ["PHP", "php"],
    ["Ruby", "ruby"], ["Swift", "swift"], ["Kotlin", "kotlin"],
    ["Objective-C", "objectivec"], ["CSS", "css"], ["HTML/XML", "xml"],
    ["SQL", "sql"], ["JSON", "json"], ["YAML", "yaml"], ["Shell", "shell"],
    ["Lua", "lua"], ["Markdown", "markdown"],
  ];
  // 自定义「代码块」下拉（掘金同款交互：点按钮弹出语言菜单）
  function codeBlockPlugin() {
    return {
      actions: [{
        title: "插入代码块",
        icon: '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M5.28 3.72a.75.75 0 0 1 0 1.06L2.06 8l3.22 3.22a.75.75 0 1 1-1.06 1.06L-.47 8l4.53-4.53a.75.75 0 0 1 1.06 0zm5.44 0a.75.75 0 0 0 0 1.06L13.94 8l-3.22 3.22a.75.75 0 1 0 1.06 1.06L16.47 8l-4.69-4.53a.75.75 0 0 0-1.06 0z"/><path d="M9.4 1.6a.7.7 0 0 1 .5.86L8.36 13.1a.7.7 0 0 1-1.36-.35L8.54 2.1a.7.7 0 0 1 .86-.5z"/></svg>',
        handler: {
          type: "dropdown",
          actions: CODE_LANGS.map(([label, v]) => ({
            title: label,
            icon: "",
            handler: { type: "action", click: (ctx) => ctx.appendBlock("```" + v + "\n\n```") },
          })),
        },
      }],
    };
  }

  function initEditor(done) {
    // 懒加载：首次打开编辑面板时才创建，保证 CodeMirror 在可见容器中初始化
    if (mdEditor) { done && done(); return; }
    if (typeof bytemd === "undefined" || typeof bytemdPluginGfm === "undefined") {
      toast("编辑器脚本加载失败，请刷新页面", "error");
      return;
    }
    fetch("assets/vendor/bytemd/locales/zh_Hans.json")
      .then((r) => (r.ok ? r.json() : {}))
      .catch(() => ({}))
      .then((zh) => {
        mdEditor = new bytemd.Editor({
          target: els.editorEl,
          props: {
            value: "",
            placeholder: "# 标题\n正文…",
            locale: zh,
            plugins: [bytemdPluginGfm(), bytemdPluginHighlight(), codeBlockPlugin()],
            uploadImages,
          },
        });
        mdEditor.$on("change", (e) => {
          curValue = e.detail.value;
          mdEditor.$set({ value: curValue }); // 受控回环：驱动右侧预览与字数统计
        });
        done && done();
      });
  }

  /* ---- 图片上传（工具栏 / 拖拽 / 粘贴图片均触发）---- */
  async function uploadImages(files) {
    if (!cfg.token) { toast("请先登录后再上传图片", "error"); return []; }
    const base = els.eSlug.value || slugify(els.eTitle.value) || "img";
    const out = [];
    for (const file of files) {
      const name = base + "-" + Date.now() + "-" + file.name.replace(/[^\w.\u4e00-\u9fff-]/g, "_");
      const rel = "assets/img/" + name;
      try {
        const data = await new Promise((res, rej) => {
          const reader = new FileReader();
          reader.onload = () => res(String(reader.result).split(",")[1]);
          reader.onerror = () => rej(new Error("读取图片失败"));
          reader.readAsDataURL(file);
        });
        await putFile(rel, data, "上传图片 " + name);
        out.push({ url: rel });
      } catch (err) {
        toast("上传失败：" + err.message, "error");
      }
    }
    return out;
  }

  /* ---- 发布 / 删除 / 同步 ---- */
  els.edBack.addEventListener("click", (e) => { e.preventDefault(); closeEditor(); loadPostList(); });
  els.publishBtn.addEventListener("click", publishPost);

  // 文章设置弹窗（圆球）
  els.metaBall.addEventListener("click", () => els.metaPop.classList.toggle("open"));
  els.metaClose.addEventListener("click", () => els.metaPop.classList.remove("open"));
  document.addEventListener("mousedown", (ev) => {
    if (!els.metaPop.classList.contains("open")) return;
    if (els.metaPop.contains(ev.target) || els.metaBall.contains(ev.target)) return;
    els.metaPop.classList.remove("open");
  });

  async function publishPost() {
    const title = els.eTitle.value.trim();
    const slug = (els.eSlug.value || slugify(title)).trim();
    const date = els.eDate.value || today();
    const tags = els.eTags.value;
    const body = mdEditor ? curValue : "";
    if (!title) { toast("请填写标题", "error"); return; }
    if (!slug) { toast("请填写 slug", "error"); return; }
    if (!body.trim()) { toast("正文不能为空", "error"); return; }
    setBusy(true);
    try {
      const md = buildMd({ title, slug, date, tags, body });
      await putFile(postsDir + "/" + slug + ".md", md, editingSlug ? "更新文章：" + slug : "发布文章：" + slug);
      let entries = await readPostsJson();
      const entry = buildEntry({ slug, title, date, tags, body });
      entries = entries.filter((e) => e.slug !== slug);
      entries.unshift(entry);
      entries.sort((a, b) => (a.date < b.date ? 1 : -1));
      await writePostsJson(entries);
      toast((editingSlug ? "已更新" : "已发布") + "，页面几分钟后生效", "ok");
      closeEditor();
      await loadPostList();
    } catch (e) { toast("发布失败：" + e.message, "error"); }
    finally { setBusy(false); }
  }

  async function deletePost(slug) {
    if (!confirm("确定删除《" + slug + "》？此操作不可撤销。")) return;
    setBusy(true);
    try {
      await deleteFile(postsDir + "/" + slug + ".md");
      let entries = await readPostsJson();
      entries = entries.filter((e) => e.slug !== slug);
      await writePostsJson(entries);
      toast("已删除", "ok");
      await loadPostList();
    } catch (e) { toast("删除失败：" + e.message, "error"); }
    finally { setBusy(false); }
  }

  async function syncIndex() {
    setBusy(true);
    try {
      const listing = await ghGet(contentsApi(postsDir));
      const files = (listing || []).filter((f) => f.name.endsWith(".md"));
      const entries = [];
      for (const f of files) {
        const slug = f.name.replace(/\.md$/, "");
        const md = await (await fetch(rawUrl(postsDir + "/" + f.name))).text();
        const { meta, body } = parseFrontmatter(md);
        entries.push({
          slug, title: meta.title || slug, date: meta.date || "",
          tags: Array.isArray(meta.tags) ? meta.tags : (meta.tags ? [meta.tags] : []),
          excerpt: excerptFrom(body), readTime: readingTime(body),
        });
      }
      entries.sort((a, b) => (a.date < b.date ? 1 : -1));
      await writePostsJson(entries);
      toast("已从仓库同步索引", "ok");
      await loadPostList();
    } catch (e) { toast("同步失败：" + e.message, "error"); }
    finally { setBusy(false); }
  }

  function buildEntry(f) {
    const tagsArr = (f.tags || "").split(",").map((s) => s.trim()).filter(Boolean);
    return { slug: f.slug, title: f.title, date: f.date, tags: tagsArr, excerpt: excerptFrom(f.body), readTime: readingTime(f.body) };
  }
  function buildMd(f) {
    const tagsArr = (f.tags || "").split(",").map((s) => s.trim()).filter(Boolean);
    return "---\ntitle: " + f.title + "\ndate: " + f.date + "\ntags: " + JSON.stringify(tagsArr) + "\n---\n" + (f.body || "");
  }

  function setBusy(v) {
    [els.loginBtn, els.newBtn, els.syncBtn, els.publishBtn].forEach((b) => (b.disabled = v));
  }

  /* ---- 返回顶部 ---- */
  window.addEventListener("scroll", () => els.backTop.classList.toggle("show", window.scrollY > 400));
  els.backTop.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));

  initEditor();
  loadAuth();

  /* ---- 明暗模式（与前台同一 localStorage key，自动同步） ---- */
  function applyTheme(t) {
    document.documentElement.setAttribute("data-theme", t);
    try { localStorage.setItem("theme", t); } catch (e) {}
    var btns = [document.getElementById("theme-toggle"), document.getElementById("theme-toggle-ed")];
    btns.forEach(function (b) { if (b) b.textContent = t === "dark" ? "☀️" : "🌙"; });
  }
  [document.getElementById("theme-toggle"), document.getElementById("theme-toggle-ed")]
    .forEach(function (b) {
      if (!b) return;
      b.addEventListener("click", function () {
        applyTheme(document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark");
      });
    });
  applyTheme(document.documentElement.getAttribute("data-theme") || "light");
})();