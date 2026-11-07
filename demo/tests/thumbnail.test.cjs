const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");
const T = require("../thumbnail.js");
const { createHarness } = require("./gas-harness.cjs");

function client() {
  const requests = [];
  const context = vm.createContext({ console, URL, URLSearchParams, Intl,
    window: { NewsThumbnail: T, APP_CONFIG: { GAS_API_URL: "https://example.test/demo" }, addEventListener() {} },
    document: { readyState: "loading", addEventListener() {}, querySelector() { return null; }, querySelectorAll() { return []; } },
    navigator: {}, localStorage: { getItem() { return null; } }, setTimeout() {}, setInterval() {}, clearTimeout() {},
    fetch: async (url, options) => {
      if (!options.body) return { ok: true, text: async () => JSON.stringify({ ok: true, thumbnailEditing: 1 }) };
      const body = JSON.parse(options.body); requests.push(body);
      return { ok: true, text: async () => JSON.stringify({ ok: true, post: body.post }) };
    }
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname, "../app.js"), "utf8"), context);
  return { context, requests };
}

test("invalid and legacy settings fall back; frontend and backend normalize identically", () => {
  const h = createHarness();
  for (const config of [undefined, null, {}, { x: -3, y: 150, zoom: 100, fit: "wrong" },
    { x: "", y: null, zoom: Infinity, url: "  https://example.test/image.jpg  " },
    { x: 22.3456789, y: 0, zoom: 1.43, fit: "contain" }]) {
    assert.deepEqual(h.json(h.context.normalizePostThumbnail(config)), T.normalize(config));
  }
  assert.equal(T.source({ media: { images: ["hero.jpg"] } }), "hero.jpg");
  assert.equal(T.source({ thumbnail: { url: "thumb.jpg" }, media: { images: ["hero.jpg"] } }), "thumb.jpg");
  assert.equal(T.style({ fit: "contain", zoom: 3, x: 0 }), "object-fit:contain;object-position:50% 50%;transform:none");
});

test("drag geometry covers portrait, landscape and zoomed images without moving an axis that already fits", () => {
  assert.deepEqual(T.overflow(320, 180, 1600, 900, 1), { x: 0, y: 0 });
  assert.deepEqual(T.overflow(320, 180, 900, 1600, 1), { x: 0, y: 388.8888888888889 });
  assert.deepEqual(T.overflow(320, 180, 1600, 900, 2), { x: 320, y: 180 });
});

test("demo adds a column without losing old data, then persists thumbnail separately from article image order", () => {
  const h = createHarness();
  const sheet = h.addSheet("posts", [["id", "title", "imageUrls", "body", "status", "totalViews", "uniqueViewCount"],
    ["old", "以前の記事", "hero.jpg||body.jpg", "本文\n\n{{画像1}}", "draft", 17, 9]]);
  const config = { url: "https://example.test/thumb.jpg", fit: "cover", x: 22, y: 74, zoom: 1.7 };
  h.context.savePost({ id: "old", title: "編集済み", imageUrls: ["hero.jpg", "body.jpg"], body: ["本文", "{{画像1}}"], status: "draft", thumbnail: config });
  assert.equal(sheet.rows[0].filter(x => x === "thumbnailJson").length, 1);
  let row = h.context.rowToObj(sheet.rows[0], sheet.rows[1]);
  assert.equal(row.totalViews, 17); assert.equal(row.uniqueViewCount, 9);
  assert.equal(row.imageUrls, "hero.jpg||body.jpg");
  assert.equal(row.body, "本文\n\n{{画像1}}");
  assert.deepEqual(h.json(h.context.normalizePostRow(row).thumbnail), config);
  // A stale browser without the new field must not erase existing thumbnail settings.
  h.context.savePost({ id: "old", title: "旧画面から編集", imageUrls: ["hero.jpg", "body.jpg"], status: "draft" });
  row = h.context.rowToObj(sheet.rows[0], sheet.rows[1]);
  assert.deepEqual(JSON.parse(row.thumbnailJson), config);
  h.context.savePost({ id: "old", title: "トップ画像に戻す", imageUrls: ["hero.jpg"], status: "draft", thumbnail: {} });
  row = h.context.rowToObj(sheet.rows[0], sheet.rows[1]);
  assert.deepEqual(h.json(h.context.normalizePostRow(row).thumbnail), T.normalize());
});

test("client saves and reloads crop settings, renders them only on cards, and detects unsaved thumbnail changes", async () => {
  const { context: c, requests } = client();
  const t = { url: "https://example.test/thumb.jpg", x: 12, y: 80, zoom: 2, fit: "cover" };
  const post = c.normalizePost({ id: "a", title: "記事", thumbnail: t, media: { images: ["https://example.test/hero.jpg"] } });
  const saved = await c.savePostToApi(post);
  assert.deepEqual(requests[0].post.thumbnail, t);
  const reloaded = c.mapApiPost(saved);
  assert.deepEqual(JSON.parse(JSON.stringify(reloaded.thumbnail)), t);
  assert.match(c.renderCard(reloaded), /thumb\.jpg/);
  assert.match(c.renderCard(reloaded), /transform:scale\(2\)/);
  assert.doesNotMatch(c.mediaHtml(reloaded, true), /thumb\.jpg|transform/);
  assert.match(c.mediaHtml(reloaded, true), /hero\.jpg/);
  assert.notEqual(c.buildPostContentSignature(post), c.buildPostContentSignature({ ...post, thumbnail: { ...t, x: 75 } }));
});

test("frontend refuses to write any post against a backend without thumbnail support", async () => {
  const { context: c, requests } = client();
  c.fetch = async () => ({ ok: true, text: async () => '{"ok":true}' });
  await assert.rejects(c.savePostToApi({ title: "記事" }), /GASの更新が必要/);
  assert.equal(requests.length, 0);
});
