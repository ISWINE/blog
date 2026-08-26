# 一隅

一个干净、简洁、可托管在 GitHub Pages 的**纯静态单页博客**。文章用 Markdown 写，带一个**网页内置后台**，登录后可以直接在浏览器里写、实时预览、一键发布。

## 特点

- **纯静态**：HTML / CSS / JS，无构建工具，无后端，无数据库。
- **零依赖读取**：博客用相对路径读取 `posts.json` + `posts/*.md`，本地和线上都能跑，不依赖 GitHub API，没有限流问题。
- **在线后台**：`admin.html` 通过 GitHub Contents API 把文章提交进仓库，自动触发 Pages 重建。
- **自托管依赖**：`marked`（Markdown 解析）与 `DOMPurify`（防 XSS）已下载到 `assets/vendor/`，站点完全自包含，不依赖第三方 CDN。
- **精美简洁**：明暗模式、搜索、阅读时长、卡片列表、响应式布局。

## 文件结构

```
.
├── index.html          # 单页博客（列表 / 文章 / 关于 / 搜索 / 明暗切换）
├── admin.html          # 在线后台（GitHub API 发布文章）
├── config.js           # 站点标题与仓库配置
├── assets/
│   ├── css/style.css
│   ├── js/blog.js      # 博客前端
│   ├── js/admin.js     # 后台逻辑
│   └── vendor/         # marked.min.js + purify.min.js（自托管）
├── posts/
│   └── welcome.md      # 示例文章
├── about.md            # 关于页
├── posts.json          # 文章索引（后台自动维护）
└── README.md
```

## 本地预览

```bash
python -m http.server 8000
```

然后浏览器打开 `http://localhost:8000`。本地预览下**阅读**功能正常（文章是相对路径抓取）；**后台发布**需要真实的 GitHub 仓库与 Token，见下方部署步骤。

## 部署到 GitHub Pages

1. 在 GitHub 新建一个仓库（公开，因为 GitHub Pages 免费版需要公开仓库）。
2. 把本项目文件夹的内容推送到仓库根目录。
3. 进入仓库 **Settings → Pages**，Source 选择 `main / root`，保存。
4. 几分钟后，你的站点就上线了，地址形如 `https://你的用户名.github.io/仓库名/`。

> 仓库根目录必须有至少一个 commit（示例文章 `posts/welcome.md` 与 `posts.json` 已经提供），否则 Contents API 无法使用。

## 后台使用（在线修改文章）

纯静态站点没有服务端，所以需要一个 Token 来证明你是仓库的主人。**只需设置一次**，之后自动保存在你的浏览器里，不会上传到仓库。

### 一键登录（推荐，不用手输）

1. 部署后打开 `admin.html`——**用户名、仓库名会从当前网址自动识别**（形如 `你的用户名.github.io/仓库名/`），不用你填；分支默认 `main`。
2. 在 GitHub 创建一个 Token：
   - [点这里打开建 Token 页面](https://github.com/settings/tokens/new?scopes=repo&description=%E4%B8%80%E9%9A%85%E5%8D%9A%E5%8D%88%E5%90%8E%E5%8F%B0)（经典 PAT，`repo` 权限）。
   - 建议选 **fine-grained**（更安全），权限只给 Contents: Read & Write；公开仓库用 `public_repo` 也够。
3. 创建后点 **Copy** 复制到剪贴板（不要关掉 GitHub 那个页面）。
4. 回到 `admin.html`，点 **「📋 从剪贴板粘贴 Token 并登录」**，自动粘贴并登录。

> 如果按钮报错（某些浏览器禁用了剪贴板读取），改用下方「手动填写」。

### 手动填写（备用）

自动识别失败时（比如本地预览）才需要填。直接填 **GitHub 用户名 / 仓库名 / 分支 / Token**，点「手动登录」。

### 或者用登录链接（不用填表）

`admin.html` 页面下方有一行链接模板，形如：

```
https://你的用户名.github.io/仓库名/admin.html#token=TOKEN&owner=用户名&repo=仓库名&branch=main
```

复制它，把 `TOKEN` 换成你的 Token，直接打开即可——Token 只经过浏览器，不会发给任何服务器，打开后会自动登录并存好。

### 如何创建 Token（推荐 fine-grained）

- 进入 GitHub 右上角头像 → **Settings → Developer settings → Fine-grained tokens → Generate new token**。
- 选择 **Only select repositories**，勾选你的博客仓库。
- Repository permissions → **Contents**：`Read and write`（其余权限按需，最小化即可）。
- 生成后**立刻复制**，点「从剪贴板粘贴」或粘贴到登录链接里。
- Token 只存在你浏览器的 `localStorage` 里，**不会**被提交到仓库，也不会出现在任何日志中。建议在无痕窗口使用，或定期轮换。

> 如果你更习惯经典 PAT，也可以用 classic token（仓库级 `repo` 权限），但 fine-grained 更安全。

### 写文章

- 登录后看到文章列表，点「新建文章」或某篇文章的「编辑」。
- 填写标题、slug（留空会从标题自动生成）、日期、标签（逗号分隔）。
- 左侧写 Markdown，右侧实时预览。支持 GFM 表格、任务列表、代码块、引用、图片等。
- **上传图片**：选文件会自动上传到 `assets/img/`，并把 `![](assets/img/xxx)` 插入到光标处。
- 点「发布」或「更新」，文章会以 `posts/<slug>.md` 的形式提交，索引 `posts.json` 同步更新。
- GitHub Pages 重建通常需要几分钟，之后刷新博客即可看到新文章。

### 从仓库同步索引

如果直接用 GitHub 网页编辑器改过 `.md` 文件（没走后台），点「从仓库同步索引」，后台会重新读取仓库里所有文章并重建 `posts.json`。

## 文章格式

文章是带 frontmatter 的 Markdown 文件，位于 `posts/` 目录：

```md
---
title: 文章标题
date: 2026-08-25
tags: [标签1, 标签2]
---

正文 Markdown……
```

- `title` / `date` / `tags` 会同步到 `posts.json`，用于列表展示与搜索。
- `excerpt`（摘要）与 `readTime`（阅读时长）由后台在发布时自动从正文生成。

## 评论功能（giscus）

每篇文章底部有一个评论区。评论基于 **GitHub Discussions**，读者用 GitHub 账号登录即可评论，完全不需要后端服务器——评论存在你仓库的 Discussion 里，不需要自建 OAuth 代理。

### 开通步骤

1. **开启 Discussions**：GitHub 仓库 → **Settings** → **Features** → 勾选 **Discussions**（需先在仓库里创建一个 Discussion 或按提示完成初始化）。
2. **安装 giscus App 并获取配置**：打开 [giscus.app](https://giscus.app)，填入仓库名 `ISWINE/blog`，按页面提示完成配置：
   - 选择评论区使用的 Discussion **分类**（建议新建一个专门给评论用的分类，如 `Announcements` 或 `General`）。
   - 页面会自动生成一段 `<script>` 嵌入代码。
3. **填入 config.js**：从生成的代码里把 `data-repo-id` 和 `data-category-id` 复制到 `config.js` 的 `giscus.repoId` / `giscus.categoryId`，`giscus.repo` 与 `giscus.category` 按实际情况填写。提交后刷新页面即可。

> 每篇文章的评论区由 slug 唯一标识，文章的评论与 Issues 无关，开启 Discussions 后老评论不会自动迁移。

## 备注

- 每次发布/更新会生成两个 commit：`posts/<slug>.md` 与 `posts.json`。这是有意的——索引必须和正文同步。
- 明暗模式会记住你的选择（`localStorage`），首次访问跟随系统偏好。
- v1 暂不含：代码语法高亮（目前是干净的等宽样式）。