// Synthetic local preview: never calls Google or the public application APIs.
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { collectionHarness } = require("./collection-harness.cjs");
const root = path.resolve(__dirname, "../..");
const h = collectionHarness(new Date().toISOString());
const now = new Date();
const year = Number(new Intl.DateTimeFormat("en", { year: "numeric", timeZone: "Asia/Tokyo" }).format(now));
const day = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Tokyo" }).format(now);
h.props.set("COLLECTION_APP_BASE_URL", "https://localhost/demo/");
const samples = [];
for (const [i, name, stem] of [[1, "日本酒会", "sake"], [2, "BBQ", "bbq"], [3, "ボードゲーム会", "board"], [4, "語り場スナック", "snack"]]) {
  const event = h.request("collectionSaveEvent", { event: { name, description: "みんなで集まって、語り合った特別な時間。\n今回もたくさんの出会いと笑顔がありました！", active: true } }).event;
  const card = h.request("collectionSaveCard", { card: { eventId: event.id, year, imagePath: `collection-images/preview-${stem}.png`, published: true, distributionEnabled: true, relatedPostId: "preview-news" } }).card;
  const qr = h.request("collectionCreateQr", { qr: { cardId: card.id, heldOn: day, startsAt: `${day}T00:00:00+09:00`, endsAt: `${year + 1}-01-01T00:00:00+09:00` } });
  const qrToken = decodeURIComponent(qr.url.split("#collection-claim=")[1]);
  samples.push({ name, card, qrToken });
  if (i === 1 || i === 3) for (const who of ["admin", "member"]) h.request("collectionClaim", { qrToken }, who);
  if (i === 1) {
    const previous = h.request("collectionSaveCard", { card: { eventId: event.id, year: year - 1, imagePath: "collection-images/preview-sake.png", published: true, distributionEnabled: false } }).card;
    h.sheets.get("CollectionClaims").appendRow(["member", previous.id, `${year - 1}-11-08T03:00:00Z`, "historical-preview", `${year - 1}-11-08`]);
  }
}
const users = { admin: { id: "admin", name: "デモ管理者", role: "admin", points: 100 }, member: { id: "member", name: "デモ会員", role: "member", points: 20 }, editor: { id: "editor", name: "イベント担当者", role: "event_editor", points: 40 } };
const posts = [{ id: "preview-news", title: "みんなで語り合う、秋の交流会", channel: "article", status: "public", date: day, publishedAt: now.toISOString(), body: "これはローカル確認用の架空記事です。公開データへの通信・保存は行いません。", imageUrls: ["./collection-images/preview-bbq.png"] }];
const mime = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".png": "image/png", ".webmanifest": "application/manifest+json" };
const port = Number(process.env.COLLECTION_PREVIEW_PORT || 4176);
http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://127.0.0.1:${port}`);
    res.setHeader("Cache-Control", "no-store");
    const json = value => { res.setHeader("Content-Type", "application/json; charset=utf-8"); res.end(JSON.stringify(value)); };
    if (url.pathname === "/__collection/config.js") {
      res.setHeader("Content-Type", mime[".js"]); res.end('window.APP_CONFIG={MODE:"demo",DATA_SOURCE:"api",GAS_API_URL:"/__collection/api",READ_ONLY:false};'); return;
    }
    // Browser tokens and local preview links never point at the public API.
    if (url.pathname === "/__collection/samples") return json(samples.map(s => ({ name: s.name, url: `http://127.0.0.1:${port}/demo/#collection-claim=${encodeURIComponent(s.qrToken)}` })));
    if (url.pathname === "/__collection/api") {
      let raw = ""; for await (const chunk of req) raw += chunk;
      const data = req.method === "POST" ? JSON.parse(raw) : Object.fromEntries(url.searchParams);
      if (data.action === "ping") return json({ ok: true, thumbnailEditing: 1, eventCollection: 1 });
      if (data.action === "login") {
        const role = data.email?.startsWith("member") ? "member" : data.email?.startsWith("editor") ? "editor" : "admin";
        return json({ ok: true, user: users[role], token: h.tokens[role] });
      }
      if (data.action?.startsWith("collection")) {
        const result = JSON.parse(h.context.doPost({ postData: { contents: JSON.stringify(data) } }).text);
        if (result.qrs) result.qrs.forEach(q => { q.url = q.url.replace("https://localhost/demo/", `http://127.0.0.1:${port}/demo/`); });
        if (result.url) result.url = result.url.replace("https://localhost/demo/", `http://127.0.0.1:${port}/demo/`);
        return json(result);
      }
      const who = Object.keys(h.tokens).find(id => h.tokens[id] === data.token);
      if (!who) return json({ ok: false, code: "AUTH_REQUIRED", message: "確認用ログインをしてください。" });
      if (["listPosts", "listAllPosts"].includes(data.action)) return json({ ok: true, posts });
      if (["listEvents", "listAllEvents", "listEditableEvents"].includes(data.action)) return json({ ok: true, events: [] });
      if (data.action === "getProfile") return json({ ok: true, profile: { ...users[who], nickname: users[who].name } });
      if (data.action === "touchDailyPoint") return json({ ok: true, points: users[who].points });
      if (["recordDailyVisit", "recordPostView", "savePushSubscription"].includes(data.action)) return json({ ok: true, date: day, totalViews: 0, uniqueViewCount: 0 });
      return json({ ok: false, code: "PREVIEW_ONLY", message: "このローカルデモではコレクション機能を確認できます。" });
    }
    if (url.pathname === "/demo/sw.js") { res.setHeader("Content-Type", mime[".js"]); res.end('self.addEventListener("install",()=>self.skipWaiting());self.addEventListener("activate",e=>e.waitUntil(self.clients.claim()));'); return; }
    let target = path.resolve(root, "." + decodeURIComponent(url.pathname));
    if (!target.startsWith(root + path.sep) || !url.pathname.startsWith("/demo/")) { res.writeHead(403).end(); return; }
    if (/^\/demo\/collection-images\/preview-(sake|bbq|board|snack)\.png$/.test(url.pathname)) target = path.join(__dirname, "fixtures", path.basename(url.pathname));
    if (fs.existsSync(target) && fs.statSync(target).isDirectory()) target = path.join(target, "index.html");
    if (!fs.existsSync(target)) { res.writeHead(404).end(); return; }
    let content = fs.readFileSync(target);
    if (target === path.join(root, "demo/index.html")) content = content.toString()
      .replace('./config.js?v=scheduled-post-demo-1', '/__collection/config.js')
      .replace('<script src="./thumbnail.js', '<script>delete window.Notification;</script><script src="./thumbnail.js')
      .replace('<body>', '<body><div class="ec-preview-banner" style="background:#faf0df;padding:7px 12px;text-align:center;font-size:11px">ローカルDEMO・架空データ ／ admin@example.test または member@example.test・任意のパスワード</div>');
    res.setHeader("Content-Type", mime[path.extname(target)] || "application/octet-stream"); res.end(content);
  } catch (err) { res.writeHead(500, { "Content-Type": "application/json" }); res.end(JSON.stringify({ ok: false, message: err.message })); }
}).listen(port, "127.0.0.1", () => console.log(`Collection preview: http://127.0.0.1:${port}/demo/\nSample QR links: http://127.0.0.1:${port}/__collection/samples`));
