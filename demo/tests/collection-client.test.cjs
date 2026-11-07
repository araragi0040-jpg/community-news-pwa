// DOM integration tests; no browser, network, Google services, or persistent data.
// npm install --prefix .tmp/collection-check --ignore-scripts --no-audit --no-fund jsdom@26.1.0 jsqr@1.4.0
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { JSDOM } = require("../../.tmp/collection-check/node_modules/jsdom");
const jsQR = require("../../.tmp/collection-check/node_modules/jsqr");
const qrcode = require("../vendor/qrcode.js");
const { collectionHarness } = require("./collection-harness.cjs");
const tick = () => new Promise(resolve => setImmediate(resolve));
async function settled() { for (let i = 0; i < 12; i++) await tick(); }

async function client(who = "member", hash = "", backend) {
  const h = backend || collectionHarness();
  const dom = new JSDOM(fs.readFileSync(path.join(__dirname, "../index.html"), "utf8"), {
    url: "https://example.test/community-news-pwa/demo/" + hash, runScripts: "outside-only", pretendToBeVisual: true
  });
  await new Promise(resolve => dom.window.addEventListener("DOMContentLoaded", resolve));
  const w = dom.window, requests = [], errors = [];
  w.addEventListener("error", e => errors.push(e.error));
  w.APP_CONFIG = { MODE: "demo", READ_ONLY: false, GAS_API_URL: "https://example.test/demo-api" };
  w.scrollTo = () => {}; w.HTMLElement.prototype.scrollIntoView = () => {};
  w.HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  w.HTMLDialogElement.prototype.close = function () { this.open = false; };
  w.HTMLCanvasElement.prototype.getContext = function () {
    const canvas = this;
    return { fillStyle: "#fff", fillRect(x, y, width, height) {
      if (!canvas.pixels) canvas.pixels = new Uint8ClampedArray(canvas.width * canvas.height * 4).fill(255);
      const color = this.fillStyle === "#111" ? 0 : 255;
      for (let row = y; row < y + height; row++) for (let col = x; col < x + width; col++) {
        const i = (row * canvas.width + col) * 4; canvas.pixels[i] = canvas.pixels[i + 1] = canvas.pixels[i + 2] = color;
      }
    } };
  };
  w.setInterval = () => 0; w.confirm = () => true;
  const users = { member: { id: "member", name: "会員", role: "member" }, admin: { id: "admin", name: "管理者", role: "admin" }, other: { id: "other", name: "別会員", role: "member" } };
  if (who) {
    w.localStorage.setItem("community_news_demo_user_v1", JSON.stringify(users[who]));
    w.localStorage.setItem("community_news_demo_token_v1", h.tokens[who]);
  }
  w.fetch = async (url, options = {}) => {
    const body = options.body ? JSON.parse(options.body) : Object.fromEntries(new URL(url).searchParams);
    requests.push(body);
    let data;
    if (body.action?.startsWith("collection")) data = JSON.parse(h.context.doPost({ postData: { contents: JSON.stringify(body) } }).text);
    else if (body.action === "login") { const id = body.email.startsWith("admin") ? "admin" : "member"; data = { ok: true, user: users[id], token: h.tokens[id] }; }
    else if (["listPosts", "listAllPosts"].includes(body.action)) data = { ok: true, posts: [] };
    else if (["listEvents", "listAllEvents", "listEditableEvents"].includes(body.action)) data = { ok: true, events: [] };
    else data = { ok: true, date: "2026-11-08", points: 20, totalViews: 0, uniqueViewCount: 0 };
    return { ok: true, status: 200, text: async () => JSON.stringify(data) };
  };
  for (const file of ["thumbnail.js", "vendor/qrcode.js", "app.js", "collection.js"]) w.eval(fs.readFileSync(path.join(__dirname, "..", file), "utf8"));
  await settled();
  return { dom, w, h, requests, errors, click(selector) { const el = w.document.querySelector(selector); assert.ok(el, selector); el.click(); }, close() { dom.window.close(); } };
}
test("Collection navigation, current-year silhouettes, acquisition detail, and historical-year selection", async () => {
  const h = collectionHarness(), first = h.seed(), locked = h.seed("BBQ", 2026, "collection-images/bbq.png");
  h.request("collectionClaim", { qrToken: first.qrToken }, "member");
  const prior = h.request("collectionSaveCard", { card: { ...first.card, id: "", year: 2025, imagePath: "collection-images/sake-2025.png" } }).card;
  h.sheets.get("CollectionClaims").appendRow(["member", prior.id, "2025-11-08T03:00:00Z", "past", "2025-11-08"]);
  const c = await client("member", "", h);
  try {
    c.click('[data-nav="collection"]'); await settled();
    assert.equal(c.w.document.querySelectorAll(".ec-card").length, 2);
    const unowned = c.w.document.querySelector(`[data-ec-card="${locked.card.id}"]`);
    assert.equal(unowned.querySelector("img"), null); assert.match(unowned.textContent, /未獲得/);
    c.click(`[data-ec-card="${first.card.id}"]`);
    assert.match(c.w.document.getElementById("collectionDetail").textContent, /日本酒会 2026/);
    assert.match(c.w.document.getElementById("collectionDetail").textContent, /2026\/11\/08/);
    c.click('[data-ec-go="collection"]'); await settled();
    const year = c.w.document.getElementById("ecYear"); year.value = "2025"; year.dispatchEvent(new c.w.Event("change", { bubbles: true }));
    assert.equal(c.w.document.querySelectorAll(".ec-card").length, 1);
    assert.match(c.w.document.getElementById("collectionRoot").textContent, /2025年の獲得枚数/);
    assert.equal(c.errors.length, 0);
  } finally { c.close(); }
});
test("camera QR opened while signed out survives login and grants exactly once; refresh shows acquired", async () => {
  const h = collectionHarness(), s = h.seed();
  const hash = "#collection-claim=" + encodeURIComponent(s.qrToken);
  const c = await client(null, hash, h);
  try {
    assert.equal(c.w.document.getElementById("collectionPublic").hidden, false);
    assert.match(c.w.document.getElementById("collectionPublic").textContent, /ログインが必要/);
    assert.equal(c.requests.filter(r => r.action === "collectionClaim").length, 0);
    c.click("[data-ec-login]");
    c.w.document.getElementById("loginEmail").value = "member@example.test";
    c.w.document.getElementById("loginPassword").value = "preview";
    c.w.document.getElementById("loginForm").dispatchEvent(new c.w.Event("submit", { bubbles: true, cancelable: true }));
    await settled();
    assert.match(c.w.document.getElementById("collectionClaim").textContent, /カードを獲得しました/);
    assert.equal(h.sheets.get("CollectionClaims").rows.length, 2);
    c.w.EventCollection.resume(); await settled();
    assert.match(c.w.document.getElementById("collectionClaim").textContent, /すでに獲得済み/);
    assert.equal(h.sheets.get("CollectionClaims").rows.length, 2);
    c.click('[data-ec-go="collection"]'); await settled();
    assert.equal(c.w.location.hash, ""); assert.match(c.w.document.getElementById("collectionRoot").textContent, /獲得済み/);
    assert.equal(c.errors.length, 0);
  } finally { c.close(); }
});
test("invalid guest QR, connection failure, retry, and account switch do not leak old cards", async () => {
  const invalid = await client(null, "#collection-claim=invalid");
  assert.match(invalid.w.document.getElementById("collectionPublic").textContent, /現在利用できません/); invalid.close();
  const h = collectionHarness(), s = h.seed(); h.request("collectionClaim", { qrToken: s.qrToken }, "member");
  const c = await client("member", "", h);
  try {
    const fetch = c.w.fetch;
    c.w.fetch = async () => { throw Error("接続テストエラー"); };
    c.click('[data-nav="collection"]'); await settled();
    assert.match(c.w.document.getElementById("collectionRoot").textContent, /接続テストエラー/);
    c.w.fetch = fetch; c.click('[data-ec-retry="list"]'); await settled();
    assert.ok(c.w.document.querySelector(".ec-card img"));
    c.w.localStorage.setItem("community_news_demo_user_v1", JSON.stringify({ id: "other", role: "member" }));
    c.w.localStorage.setItem("community_news_demo_token_v1", h.tokens.other);
    c.w.EventCollection.authChanged();
    assert.equal(c.w.document.querySelector(".ec-card img"), null);
    c.w.EventCollection.pageChanged("collection"); await settled();
    assert.equal(c.w.document.querySelector(".ec-card img"), null);
  } finally { c.close(); }
});
test("Admin integration creates event and QR, stops distribution, and renders settings only for admin", async () => {
  const h = collectionHarness(), s = h.seed();
  const c = await client("admin", "", h);
  try {
    c.click('[data-ec-go="collection-admin"]'); await settled();
    assert.ok(c.w.document.getElementById("ecEventForm"));
    const f = c.w.document.getElementById("ecEventForm"); f.elements.name.value = "新イベント";
    f.dispatchEvent(new c.w.Event("submit", { bubbles: true, cancelable: true })); await settled();
    assert.equal(h.sheets.get("CollectionEvents").rows.length, 3);
    const newEvent = h.sheets.get("CollectionEvents").rows[2][0];
    const cardForm = c.w.document.getElementById("ecCardForm");
    cardForm.elements.eventId.value = newEvent; cardForm.elements.imagePath.value = "collection-images/new-card.png";
    cardForm.elements.imagePath.dispatchEvent(new c.w.Event("change", { bubbles: true }));
    const preview = c.w.document.getElementById("ecImagePreview");
    Object.defineProperty(preview, "naturalWidth", { value: 400 }); Object.defineProperty(preview, "complete", { value: true });
    preview.dispatchEvent(new c.w.Event("load"));
    cardForm.dispatchEvent(new c.w.Event("submit", { bubbles: true, cancelable: true })); await settled();
    assert.equal(h.sheets.get("CollectionCards").rows.length, 3);
    const newCard = h.sheets.get("CollectionCards").rows[2][0];
    const qrForm = c.w.document.getElementById("ecQrForm"); qrForm.elements.cardId.value = newCard;
    qrForm.elements.heldOn.value = "2026-11-08"; qrForm.elements.startsAt.value = "2026-11-08T00:00"; qrForm.elements.endsAt.value = "2026-11-09T00:00";
    qrForm.dispatchEvent(new c.w.Event("submit", { bubbles: true, cancelable: true })); await settled();
    assert.equal(h.sheets.get("CollectionQrs").rows.length, 3);
    assert.equal(c.w.document.getElementById("ecQrDialog").open, true);
    const canvas = c.w.document.getElementById("ecQrCanvas");
    const decoded = jsQR(canvas.pixels, canvas.width, canvas.height);
    assert.ok(decoded); assert.equal(decoded.data, c.w.document.getElementById("ecQrUrl").value);
    c.click("[data-ec-close-qr]");
    c.click(`[data-ec-toggle-qr="${s.qr.id}"]`); await settled();
    assert.equal(h.request("collectionQrInfo", { qrToken: s.qrToken }, null).code, "COLLECTION_QR_INVALID");
    assert.match(c.w.document.getElementById("ecQrList").textContent, /停止中/);
    assert.equal(c.errors.length, 0);
  } finally { c.close(); }
  const member = await client("member", "", h);
  member.w.eval('setActivePage("collection-admin")');
  assert.equal(member.w.document.querySelector('[data-page="collection-admin"]').classList.contains("page--active"), false);
  member.close();
});
test("production localStorage remains untouched when signing into DEMO", async () => {
  const c = await client();
  try {
    c.w.localStorage.setItem("community_news_token_v1", "production-token");
    c.w.localStorage.setItem("community_news_saved_v1", '["production-post"]');
    c.w.eval("clearCurrentUser(); applyAuthUI();");
    assert.equal(c.w.localStorage.getItem("community_news_token_v1"), "production-token");
    assert.equal(c.w.localStorage.getItem("community_news_saved_v1"), '["production-post"]');
  } finally { c.close(); }
});
test("a stalled request becomes a retryable error instead of showing a false acquisition", async () => {
  const c = await client();
  try {
    const realTimeout = c.w.setTimeout.bind(c.w);
    c.w.setTimeout = (fn, delay) => delay === 30000 ? (queueMicrotask(fn), 0) : realTimeout(fn, delay);
    c.w.fetch = (_url, options) => new Promise((_resolve, reject) => options.signal.addEventListener("abort", () => reject(new c.w.DOMException("aborted", "AbortError"))));
    c.click('[data-nav="collection"]'); await settled();
    assert.match(c.w.document.getElementById("collectionRoot").textContent, /通信に時間がかかっています/);
    assert.ok(c.w.document.querySelector('[data-ec-retry="list"]'));
    assert.equal(c.h.sheets.get("CollectionClaims").rows.length, 1);
  } finally { c.close(); }
});
test("finishing Home initialization during a pending QR request keeps the acquisition screen visible", async () => {
  const h = collectionHarness(), s = h.seed(), c = await client("member", "", h);
  try {
    const original = c.w.fetch;
    let release;
    c.w.fetch = async (url, options) => {
      const response = await original(url, options);
      if (JSON.parse(options.body || "{}").action === "collectionClaim") return new Promise(resolve => { release = () => resolve(response); });
      return response;
    };
    c.w.location.hash = "collection-claim=" + encodeURIComponent(s.qrToken);
    c.w.EventCollection.resume(); await settled();
    assert.equal(typeof release, "function");
    c.w.eval('setActivePage("home")'); c.w.EventCollection.resume();
    assert.equal(c.w.document.querySelector('[data-page="collection-claim"]').classList.contains("page--active"), true);
    release(); await settled();
    assert.match(c.w.document.getElementById("collectionClaim").textContent, /カードを獲得しました/);
    assert.equal(h.sheets.get("CollectionClaims").rows.length, 2);
  } finally { c.close(); }
});
test("QR matrix round-trips an actual generated event URL including its signature", () => {
  const h = collectionHarness(), s = h.seed();
  const code = qrcode(0, "M"); code.addData(s.url); code.make();
  const n = code.getModuleCount(), scale = 6, width = (n + 8) * scale;
  const pixels = new Uint8ClampedArray(width * width * 4).fill(255);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (code.isDark(y, x)) {
    for (let dy = 0; dy < scale; dy++) for (let dx = 0; dx < scale; dx++) {
      const p = (((y + 4) * scale + dy) * width + (x + 4) * scale + dx) * 4;
      pixels[p] = pixels[p + 1] = pixels[p + 2] = 0;
    }
  }
  const decoded = jsQR(pixels, width, width);
  assert.ok(decoded); assert.equal(decoded.data, s.url);
  const token = decodeURIComponent(decoded.data.split("#collection-claim=")[1]);
  assert.equal(h.request("collectionClaim", { qrToken: token }, "member").ok, true);
});
