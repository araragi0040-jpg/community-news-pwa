// Local demo review. All posts, uploads and authentication remain in memory.
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { createHarness } = require("./gas-harness.cjs");
const root = path.resolve(__dirname, "../..");
const h = createHarness(new Date().toISOString());
const token = "thumbnail-local-preview";
const user = { id: "thumbnail-preview-admin", name: "デモ確認用", role: "admin", status: "active", points: 0 };
const uploads = new Map();
const images = {
  landscape: '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800"><rect width="1200" height="800" fill="#dce9df"/><circle cx="200" cy="200" r="100" fill="#f2c779"/><path d="M0 800V580L400 240L850 800" fill="#779a7d"/><path d="M450 800L900 340L1200 630V800" fill="#41664d"/><circle cx="780" cy="400" r="65" fill="#f2cbad"/><path d="M660 670V560Q780 440 900 560V670" fill="#b56d43"/><text x="50" y="740" font-family="sans-serif" font-size="54" fill="white">COMMUNITY NEWS / DEMO</text></svg>',
  poster: '<svg xmlns="http://www.w3.org/2000/svg" width="720" height="1080" viewBox="0 0 720 1080"><rect width="720" height="1080" fill="#f5e8cd"/><rect x="25" y="25" width="670" height="1030" rx="18" fill="none" stroke="#4a674e" stroke-width="8"/><text x="360" y="160" text-anchor="middle" font-family="sans-serif" font-size="56" fill="#314f38">COMMUNITY</text><text x="360" y="240" text-anchor="middle" font-family="sans-serif" font-size="56" fill="#314f38">MEETUP</text><circle cx="360" cy="500" r="170" fill="#d68a55"/><text x="360" y="520" text-anchor="middle" font-family="sans-serif" font-size="56" fill="white">WELCOME</text><text x="360" y="810" text-anchor="middle" font-family="sans-serif" font-size="52" fill="#314f38">10 / 25 SUN</text><text x="360" y="940" text-anchor="middle" font-family="sans-serif" font-size="34" fill="#314f38">13:00 - 16:00 / DEMO</text></svg>'
};
h.addSheet("posts", [["id", "title", "status", "imageUrls", "body", "date", "channel"],
  ["preview-photo", "交流会の写真で、サムネイルの位置とズームを試せます", "public", "/__thumbnail/landscape.svg", "トップ画像は元のまま表示されます。管理画面の記事一覧から編集できます。", "2026-10-25", "article"],
  ["preview-poster", "縦長チラシは「画像全体を表示」で確認してください", "public", "/__thumbnail/poster.svg", "サムネイルだけを調整し、トップ画像と別々に確認できます。", "2026-10-24", "ops"]]);
h.context.getSheet();
function posts() {
  const sheet = h.sheets.get("posts");
  return sheet.rows.slice(1).map(row => h.json(h.context.normalizePostRow(h.context.rowToObj(sheet.rows[0], row), { includeMetrics: true })));
}
const mime = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".png": "image/png", ".webmanifest": "application/manifest+json" };
http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://127.0.0.1");
    res.setHeader("Cache-Control", "no-store");
    if (url.pathname === "/__thumbnail/config.js") {
      res.setHeader("Content-Type", mime[".js"]);
      res.end('window.APP_CONFIG={MODE:"demo",DATA_SOURCE:"api",GAS_API_URL:"/__thumbnail/api",READ_ONLY:false};'); return;
    }
    if (url.pathname === "/__thumbnail/api") {
      let body = ""; for await (const chunk of req) body += chunk;
      const data = req.method === "POST" ? JSON.parse(body) : Object.fromEntries(url.searchParams);
      const send = value => { res.setHeader("Content-Type", "application/json; charset=utf-8"); res.end(JSON.stringify(value)); };
      if (data.action === "ping") return send({ ok: true, thumbnailEditing: 1 });
      if (data.action === "login") return send({ ok: true, token, user });
      if (data.token !== token) return send({ ok: false, code: "AUTH_REQUIRED", message: "確認用ログインをしてください。" });
      if (["listPosts", "listAllPosts"].includes(data.action)) return send({ ok: true, posts: posts().filter(p => data.action === "listAllPosts" || p.status === "public") });
      if (["listEvents", "listAllEvents", "listEditableEvents"].includes(data.action)) return send({ ok: true, events: [] });
      if (data.action === "savePost") return send({ ok: true, post: h.json(h.context.savePost(data.post)) });
      if (data.action === "uploadImage") {
        const id = String(uploads.size + 1);
        uploads.set(id, Buffer.from(data.dataUrl.split(",")[1], "base64"));
        return send({ ok: true, url: "/__thumbnail/upload/" + id });
      }
      return send({ ok: true, user, totalViews: 0, uniqueViewCount: 0, date: "2026-10-25" });
    }
    if (url.pathname.startsWith("/__thumbnail/upload/")) {
      const bytes = uploads.get(url.pathname.split("/").pop());
      if (!bytes) { res.writeHead(404).end(); return; }
      res.setHeader("Content-Type", "image/jpeg"); res.end(bytes); return;
    }
    if (url.pathname === "/__thumbnail/landscape.svg" || url.pathname === "/__thumbnail/poster.svg") {
      res.setHeader("Content-Type", "image/svg+xml"); res.end(images[path.basename(url.pathname, ".svg")]); return;
    }
    let target = path.resolve(root, "." + decodeURIComponent(url.pathname));
    if (!target.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
    if (fs.existsSync(target) && fs.statSync(target).isDirectory()) target = path.join(target, "index.html");
    if (!fs.existsSync(target)) { res.writeHead(404).end(); return; }
    let content = fs.readFileSync(target);
    if (target === path.join(root, "demo/index.html")) content = content.toString()
      .replace('./config.js?v=scheduled-post-demo-1', '/__thumbnail/config.js')
      .replace('<body>', '<body><div style="background:#f9e5ba;padding:8px 14px;text-align:center;font-size:12px">サムネイル確認用のローカルデモです。任意のメール・パスワードでログインできます。データは公開されません。</div>');
    res.setHeader("Content-Type", mime[path.extname(target)] || "application/octet-stream"); res.end(content);
  } catch (err) { res.writeHead(500, { "Content-Type": "application/json" }); res.end(JSON.stringify({ ok: false, message: err.message })); }
}).listen(4175, "127.0.0.1", () => console.log("Thumbnail demo: http://127.0.0.1:4175/demo/"));
