const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { createHarness } = require("./gas-harness.cjs");

function collectionHarness(time = "2026-11-08T03:00:00Z") {
  const h = createHarness(time), c = h.context;
  c.SpreadsheetApp.getActiveSpreadsheet().getId = () => "collection-demo-test";
  h.props.set("COLLECTION_ENV", "demo");
  h.props.set("COLLECTION_SPREADSHEET_ID", "collection-demo-test");
  h.props.set("COLLECTION_APP_BASE_URL", "https://example.test/community-news-pwa/demo/");
  vm.runInContext(fs.readFileSync(path.join(__dirname, "../EventCollection.gs"), "utf8"), c, { filename: "EventCollection.gs" });
  h.addSheet("users", [["id", "name", "email", "role", "status", "points"],
    ["admin", "管理者", "admin@example.test", "admin", "active", 100],
    ["member", "会員", "member@example.test", "member", "active", 20],
    ["other", "別会員", "other@example.test", "member", "active", 30],
    ["editor", "担当者", "editor@example.test", "event_editor", "active", 40],
    ["inactive", "停止会員", "inactive@example.test", "member", "inactive", 0]]);
  c.setupEventCollection();
  const tokens = Object.fromEntries(["admin", "member", "other", "editor", "inactive"].map(id => [id, c.createToken(id, id === "admin" ? "admin" : "member")]));
  function request(action, payload = {}, who = "admin") {
    const body = { action, ...payload, ...(who ? { token: tokens[who] || who } : {}) };
    return JSON.parse(c.doPost({ postData: { contents: JSON.stringify(body) } }).text);
  }
  function seed(eventName = "日本酒会", year = 2026, imagePath = "collection-images/sake-2026.png") {
    const event = request("collectionSaveEvent", { event: { name: eventName, description: "みんなで楽しむ交流イベントです。", active: true } }).event;
    const card = request("collectionSaveCard", { card: { eventId: event.id, year, imagePath, published: true, distributionEnabled: true } }).card;
    const result = request("collectionCreateQr", { qr: { cardId: card.id, heldOn: `${year}-11-08`, startsAt: `${year}-11-08T00:00:00+09:00`, endsAt: `${year}-11-09T00:00:00+09:00` } });
    return { event, card, qr: result.qr, url: result.url, qrToken: decodeURIComponent(result.url.split("#collection-claim=")[1]) };
  }
  return Object.assign(h, { request, seed, tokens });
}
module.exports = { collectionHarness };
