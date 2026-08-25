/* 一隅 · Gitalk OAuth 代理（Cloudflare Worker）
 *
 * 作用：
 * 1. CORS：浏览器无法直接调用 github.com 的 OAuth token 端点（被 CORS 拦截），
 *    由这个 Worker 当中间人转发。
 * 2. 安全：clientSecret 只存在于 Worker 的环境变量里，前端永远看不到真实密钥。
 *    前端 Gitalk 发来的 client_secret 会被覆盖成 env 里的真实值，再转发给 GitHub。
 *
 * 部署：Cloudflare Workers → 创建一个 Service，把下面的代码贴进去，
 *       在 Settings → Variables 里设环境变量 GITALK_CLIENT_SECRET=你的真实 clientSecret。
 *       拿到分配的 URL（形如 https://xxx.workers.dev），填到 config.js 的 gitalk.proxy。
 */

export default {
  async fetch(request, env, ctx) {
    // CORS 预检
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(),
      });
    }
    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405, headers: corsHeaders() });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return new Response("Bad JSON", { status: 400, headers: corsHeaders() });
    }

    // 用 Worker 里保存的真实 clientSecret 覆盖前端发来的（前端发的是占位值）
    if (env.GITALK_CLIENT_SECRET) {
      body.client_secret = env.GITALK_CLIENT_SECRET;
    }

    // 转发到 GitHub OAuth token 端点
    const ghRes = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    });

    const text = await ghRes.text();
    return new Response(text, {
      status: ghRes.status,
      headers: { "Content-Type": "application/json", ...corsHeaders() },
    });
  },
};

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}