// 站点配置。部署后按需修改。
// 说明：读取文章用的是相对路径（posts.json + posts/*.md），所以 owner/repo 只在「后台发布」时才需要，
// 博客本身在没有任何配置的情况下也能正常阅读。
const SITE = {
  title: "一隅", // 站点标题
  tagline: "记录一些值得记住的东西", // 站点标语
  owner: "iswine", // GitHub 用户名（后台发布时用到）
  repo: "blog", // 仓库名（后台发布时用到）
  branch: "main", // 分支
  postsDir: "posts", // 文章目录
  aboutFile: "about.md", // 关于页文件
  // giscus 评论（替代 Gitalk）。基于 GitHub Discussions，无需 OAuth 代理。
  // 配置：仓库开启 Discussions → 去 giscus.app 安装 giscus GitHub App →
  // 将生成的 repoId / categoryId 填入下方。
  giscus: {
    repo: "ISWINE/blog",
    repoId: "",        // 由 giscus.app 生成
    category: "Announcements",
    categoryId: "",    // 由 giscus.app 生成
  },
};