const test = require("node:test");
const assert = require("node:assert/strict");
const { collectionHarness } = require("./collection-harness.cjs");

test("manual setup is repeatable, checks DEMO identity, and leaves existing tables intact", () => {
  const h = collectionHarness();
  h.addSheet("posts", [["id", "title"], ["p", "元の記事"]]);
  h.addSheet("GachaInventory", [["userId", "quantity"], ["member", 5]]);
  const before = JSON.stringify([...h.sheets].filter(([name]) => !name.startsWith("Collection")));
  h.context.setupEventCollection(); h.context.setupEventCollection();
  assert.equal(JSON.stringify([...h.sheets].filter(([name]) => !name.startsWith("Collection"))), before);
  const secret = h.props.get("COLLECTION_QR_SECRET");
  h.context.setupEventCollection(); assert.equal(h.props.get("COLLECTION_QR_SECRET"), secret);
  h.props.set("COLLECTION_SPREADSHEET_ID", "production");
  assert.equal(h.request("collectionList", {}, "member").code, "COLLECTION_NOT_CONFIGURED");
  assert.throws(() => h.context.setupEventCollection(), /DEMO/);
});
test("unacquired images and other members' claims are never disclosed; retries grant once", () => {
  const h = collectionHarness(), s = h.seed();
  assert.equal(h.request("collectionList", {}, "member").cards[0].imagePath, "");
  const info = h.request("collectionQrInfo", { qrToken: s.qrToken }, null);
  assert.equal(info.ok, true); assert.equal(JSON.stringify(info).includes("sake-2026"), false);
  const first = h.request("collectionClaim", { qrToken: s.qrToken, userId: "other" }, "member");
  assert.equal(first.ok, true); assert.equal(first.alreadyAcquired, false);
  assert.equal(first.card.imagePath, "collection-images/sake-2026.png");
  const repeat = h.request("collectionClaim", { qrToken: s.qrToken }, "member");
  assert.equal(repeat.alreadyAcquired, true); assert.equal(first.card.acquiredAt, repeat.card.acquiredAt);
  assert.equal(h.sheets.get("CollectionClaims").rows.length, 2);
  assert.equal(h.request("collectionList", {}, "other").cards[0].acquired, false);
  assert.equal(h.request("collectionList", {}, "member").cards[0].acquired, true);
});
test("only admin can manage collection; inactive, unauthenticated and forged tokens cannot claim", () => {
  const h = collectionHarness(), s = h.seed();
  const operations = ["collectionAdminList", "collectionSaveEvent", "collectionSaveCard", "collectionCreateQr", "collectionSetQrEnabled"];
  for (const who of ["member", "editor"]) for (const op of operations) assert.equal(h.request(op, {}, who).code, "FORBIDDEN");
  for (const who of [null, "forged-token", "inactive"]) assert.equal(h.request("collectionClaim", { qrToken: s.qrToken }, who).code, "AUTH_REQUIRED");
  assert.equal(h.sheets.get("CollectionClaims").rows.length, 1);
});
test("calendar-year uniqueness, multiple occurrences, later-year cards, and historical visibility", () => {
  const h = collectionHarness(), s = h.seed();
  const duplicate = h.request("collectionSaveCard", { card: { ...s.card, id: "", imagePath: "collection-images/other.png" } });
  assert.equal(duplicate.ok, false);
  h.request("collectionClaim", { qrToken: s.qrToken }, "member");
  const qr2 = h.request("collectionCreateQr", { qr: { cardId: s.card.id, heldOn: "2026-11-09", startsAt: "2026-11-08T00:00:00+09:00", endsAt: "2026-11-10T00:00:00+09:00" } });
  assert.equal(qr2.ok, true);
  const token2 = decodeURIComponent(qr2.url.split("#collection-claim=")[1]);
  assert.equal(h.request("collectionClaim", { qrToken: token2 }, "member").alreadyAcquired, true);
  assert.equal(h.sheets.get("CollectionClaims").rows[1][4], "2026-11-08");
  const next = h.request("collectionSaveCard", { card: { ...s.card, id: "", year: 2027, imagePath: "collection-images/sake-2027.png" } });
  const nextQr = h.request("collectionCreateQr", { qr: { cardId: next.card.id, heldOn: "2027-11-08", startsAt: "2027-11-08T00:00:00+09:00", endsAt: "2027-11-09T00:00:00+09:00" } });
  h.setTime("2027-11-08T03:00:00Z");
  // Tokens expire after seven days. Re-authenticate as a real user would.
  h.tokens.member = h.context.createToken("member", "member");
  assert.equal(h.request("collectionClaim", { qrToken: decodeURIComponent(nextQr.url.split("#collection-claim=")[1]) }, "member").alreadyAcquired, false);
  h.tokens.admin = h.context.createToken("admin", "admin");
  h.request("collectionSaveCard", { card: { ...s.card, published: false, distributionEnabled: false } });
  h.request("collectionSaveEvent", { event: { ...s.event, active: false } });
  const list = h.request("collectionList", {}, "member").cards;
  assert.equal(list.length, 2); assert.equal(list.every(c => c.acquired), true);
});
test("forged, expired, future, disabled, and unpublished QRs cannot grant cards", () => {
  const h = collectionHarness(), s = h.seed();
  const claim = value => h.request("collectionClaim", { qrToken: value }, "member");
  for (const token of ["", "invalid", s.qrToken + "x"]) assert.equal(claim(token).code, "COLLECTION_QR_INVALID");
  h.setTime("2026-11-07T12:00:00Z"); assert.equal(claim(s.qrToken).code, "COLLECTION_QR_INVALID");
  h.setTime("2026-11-08T15:00:00Z"); assert.equal(claim(s.qrToken).code, "COLLECTION_QR_INVALID");
  h.setTime("2026-11-08T03:00:00Z");
  h.request("collectionSetQrEnabled", { qr: { id: s.qr.id, enabled: false } }); assert.equal(claim(s.qrToken).code, "COLLECTION_QR_INVALID");
  h.request("collectionSetQrEnabled", { qr: { id: s.qr.id, enabled: true } });
  h.request("collectionSaveCard", { card: { ...s.card, distributionEnabled: false } }); assert.equal(claim(s.qrToken).code, "COLLECTION_QR_INVALID");
  h.request("collectionSaveCard", { card: { ...s.card, published: false } }); assert.equal(claim(s.qrToken).code, "COLLECTION_QR_INVALID");
  assert.equal(h.sheets.get("CollectionClaims").rows.length, 1);
});
test("acquired card identity is immutable; input, image paths, QR dates and periods are validated", () => {
  const h = collectionHarness(), s = h.seed();
  for (const path of ["https://example.test/x.png", "../prod.png", "collection-images/../x.png", "collection-images/x.svg", "=IMPORTXML(1)"]) {
    assert.equal(h.request("collectionSaveCard", { card: { ...s.card, imagePath: path } }).ok, false);
  }
  h.request("collectionClaim", { qrToken: s.qrToken }, "member");
  for (const changes of [{ imagePath: "collection-images/replaced.png" }, { year: 2027 }]) assert.equal(h.request("collectionSaveCard", { card: { ...s.card, ...changes } }).code, "COLLECTION_CARD_LOCKED");
  assert.equal(h.request("collectionSaveCard", { card: { ...s.card, distributionEnabled: false } }).ok, true);
  const qr = { cardId: s.card.id, heldOn: "2026-02-30", startsAt: "2026-11-08T00:00:00+09:00", endsAt: "2026-11-09T00:00:00+09:00" };
  assert.equal(h.request("collectionCreateQr", { qr }).ok, false);
  assert.equal(h.request("collectionCreateQr", { qr: { ...qr, heldOn: "2027-11-08" } }).ok, false);
  assert.equal(h.request("collectionCreateQr", { qr: { ...qr, heldOn: "2026-11-08", endsAt: qr.startsAt } }).ok, false);
  assert.equal(h.request("collectionSaveEvent", { event: { name: "=HYPERLINK(1)", active: true } }).ok, false);
});
test("all acquisition writes run under a script lock; failed locking grants nothing", () => {
  const h = collectionHarness(), s = h.seed();
  let locked = false, writes = 0;
  h.context.LockService.getScriptLock = () => ({ waitLock() { assert.equal(locked, false); locked = true; }, releaseLock() { locked = false; } });
  const sheet = h.sheets.get("CollectionClaims"), append = sheet.appendRow.bind(sheet);
  sheet.appendRow = row => { assert.equal(locked, true); writes++; return append(row); };
  for (let i = 0; i < 10; i++) assert.equal(h.request("collectionClaim", { qrToken: s.qrToken }, "member").ok, true);
  assert.equal(writes, 1); assert.equal(locked, false);
  h.context.LockService.getScriptLock = () => ({ waitLock() { throw Error("lock timeout"); }, releaseLock() { assert.fail(); } });
  assert.equal(h.request("collectionClaim", { qrToken: s.qrToken }, "other").ok, false);
  assert.equal(writes, 1);
});
test("collection operations never alter point balances or gacha inventory", () => {
  const h = collectionHarness();
  h.context.getUsersSheet();
  h.addSheet("GachaInventory", [["userId", "figureId", "quantity"], ["member", "f1", 3]]);
  h.addSheet("PtLogs", [["id", "userId", "delta"], ["log", "member", -1]]);
  const snapshot = () => JSON.stringify(["users", "GachaInventory", "PtLogs"].map(n => h.sheets.get(n).rows));
  const before = snapshot(), s = h.seed();
  h.request("collectionClaim", { qrToken: s.qrToken }, "member");
  h.request("collectionList", {}, "member"); h.request("collectionAdminList");
  assert.equal(snapshot(), before);
});
