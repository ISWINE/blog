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
  // Gitalk 评论（可选）。clientID 在 GitHub OAuth App 里拿到；proxy 是 Cloudflare Worker 地址。
  // clientSecret 不写在这里——由 worker-proxy.js 在服务端注入，前端永远看不到真实密钥。
  gitalk: {
    clientID: "your-oauth-app-client-id", // 去 GitHub 建 OAuth App 后填入
    proxy: "https://你的worker.workers.dev", // 部署 worker-proxy.js 后的地址
  },
};