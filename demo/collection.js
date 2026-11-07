/* Event Collection v001 — static card images, existing login, DEMO-only API. */
(() => {
  "use strict";
  const byId = id => document.getElementById(id);
  const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const yearNow = () => Number(new Intl.DateTimeFormat("en", { year: "numeric", timeZone: "Asia/Tokyo" }).format(new Date()));
  const today = () => new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Tokyo" }).format(new Date());
  const lockIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 10V7a6 6 0 0 1 12 0v3h1a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h1zm3 0h6V7a3 3 0 0 0-6 0v3zm2 5v4h2v-4h-2z"/></svg>';
  const st = { cards: [], year: yearNow(), event: "", tab: "all", owner: "", listSeq: 0, claimSeq: 0, adminSeq: 0, detail: "", loginRequested: false, claiming: false, admin: null, images: null, imageError: "", imageSeq: 0, imageLoading: false, imageVersions: new Map(), imageRefresh: 0 };
  function tokenFromHash() {
    const match = window.location.hash.match(/^#collection-claim=([^&]+)$/);
    if (!match) return "";
    try { return decodeURIComponent(match[1]); } catch (_) { return "invalid"; }
  }
  function active(key) { return document.querySelector(`.page[data-page="${key}"]`)?.classList.contains("page--active") === true; }
  function image(path) {
    if (typeof path !== "string" || !/^collection-images\/[A-Za-z0-9_\/-]+\.(png|jpe?g|webp|gif)$/i.test(path)) return "";
    const params = new URLSearchParams({ "ec-image": st.imageVersions.get(path) || "collection-demo-3" });
    if (st.imageRefresh) params.set("ec-refresh", String(st.imageRefresh));
    return "./" + path + "?" + params.toString();
  }
  function dateText(value, withTime = false) {
    if (!value) return "—";
    const date = new Date(String(value).length === 10 ? value + "T00:00:00+09:00" : value);
    if (isNaN(date.getTime())) return "—";
    return new Intl.DateTimeFormat("ja-JP", { timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit", ...(withTime ? { hour: "2-digit", minute: "2-digit", hourCycle: "h23" } : {}) }).format(date);
  }
  async function api(action, payload = {}, publicRequest = false) {
    if (window.APP_CONFIG?.MODE !== "demo") throw new Error("DEMO用の設定を確認してください。");
    if (window.APP_CONFIG?.READ_ONLY) throw new Error("現在は閲覧専用です。");
    if (navigator.onLine === false) throw new Error("通信できません。接続後にもう一度お試しください。");
    // Collection permissions errors must not log out a valid member.
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    let data;
    try {
      const response = await fetch(window.APP_CONFIG.GAS_API_URL, { method: "POST", cache: "no-store", credentials: "omit", signal: controller.signal, headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ action, ...payload, ...(publicRequest ? {} : { token: getAuthToken() }) }) });
      data = await parseApiJson(response, action);
    } catch (err) {
      if (err.name === "AbortError") throw new Error("通信に時間がかかっています。もう一度お試しください。取得済みの場合は重複付与されません。");
      throw err;
    } finally { clearTimeout(timeout); }
    if (!data.ok) {
      const err = new Error(data.message || "処理に失敗しました。"); err.code = data.code;
      if (!publicRequest && data.code === "AUTH_REQUIRED") handleAuthFailure("ログインし直して続きをお試しください。");
      throw err;
    }
    return data;
  }
  function message(root, title, description, actions = "") {
    root.innerHTML = `<div class="ec-state"><div class="ec-state__symbol" aria-hidden="true">${lockIcon}</div><h1>${esc(title)}</h1><p>${esc(description)}</p><div class="ec-actions">${actions}</div></div>`;
  }
  function button(label, destination, secondary = false) {
    return `<button type="button" class="ec-button${secondary ? " ec-button--secondary" : ""}" data-ec-go="${destination}">${esc(label)}</button>`;
  }
  function busy(root, text) { root.innerHTML = `<div class="ec-empty" role="status"><span class="ec-spinner"></span>${esc(text)}</div>`; }
  function showError(root, err, retry) {
    if (err.code === "AUTH_REQUIRED") return;
    message(root, err.code === "COLLECTION_QR_INVALID" ? "このQRコードは現在利用できません" : "読み込めませんでした", err.message,
      (retry ? `<button type="button" class="ec-button" data-ec-retry="${retry}">もう一度試す</button>` : "") + button("トップページに戻る", "home", true));
    root.querySelector(".ec-state").classList.add("ec-invalid");
    root.querySelector(".ec-state__symbol").textContent = "!";
  }
  function clearClaimHash() {
    if (tokenFromHash()) window.history.replaceState({}, "", window.location.pathname + window.location.search);
  }
  async function go(key) {
    if (getCurrentUser() && !(await confirmArticleChangesBeforeLeave())) return;
    clearClaimHash();
    st.loginRequested = false;
    if (!getCurrentUser()) {
      byId("collectionPublic").hidden = true;
      byId("authGate").hidden = false;
      return;
    }
    setActivePage(key);
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  async function loadList() {
    const root = byId("collectionRoot"), seq = ++st.listSeq, owner = st.owner;
    busy(root, "コレクションを読み込んでいます…");
    try {
      const data = await api("collectionList");
      if (seq !== st.listSeq || owner !== st.owner || !getCurrentUser()) return;
      st.cards = data.cards;
      renderList();
    } catch (err) { if (seq === st.listSeq && active("collection")) showError(root, err, "list"); }
  }
  function renderList() {
    const years = [...new Set([yearNow(), ...st.cards.map(c => c.year)])].sort((a, b) => b - a);
    const selected = st.cards.filter(c => c.year === st.year);
    const events = [...new Map(selected.map(c => [c.eventId, c.eventName])).entries()];
    if (st.event && !events.some(([id]) => id === st.event)) st.event = "";
    const filtered = selected.filter(c => !st.event || c.eventId === st.event);
    byId("collectionRoot").innerHTML = `
      <div class="ec-tabs" aria-label="コレクションの表示">${[["all", "すべて"], ["event", "イベント別"], ["year", "年別"]].map(([value, label]) => `<button type="button" data-ec-tab="${value}" aria-pressed="${st.tab === value}">${label}</button>`).join("")}</div>
      <header class="ec-heading"><div class="ec-heading__icon" aria-hidden="true">▧</div><div><h1>語り場コレクション</h1><p>参加した思い出を、1枚ずつ。</p></div><div class="ec-count"><span>${st.year}年の獲得枚数</span><strong>${selected.filter(c => c.acquired).length}<small>枚</small></strong><span>／ ${selected.length}枚</span></div></header>
      <div class="ec-scan-entry"><button type="button" class="ec-button" data-ec-scan>▣　QRを読み取る</button><p>会場のQRコードをカメラで読み取って、カードを獲得できます。</p></div>
      <div class="ec-filters"><label>表示する年<select id="ecYear">${years.map(y => `<option value="${y}" ${y === st.year ? "selected" : ""}>${y}年</option>`).join("")}</select></label><label ${st.tab !== "event" ? "hidden" : ""}>イベント<select id="ecEvent"><option value="">すべてのイベント</option>${events.map(([id, name]) => `<option value="${esc(id)}" ${st.event === id ? "selected" : ""}>${esc(name)}</option>`).join("")}</select></label></div>
      <div class="ec-grid">${filtered.map(c => `<button type="button" class="ec-card${c.acquired ? "" : " ec-card--locked"}" data-ec-card="${esc(c.id)}" aria-label="${esc(c.eventName)} ${c.year} ${c.acquired ? "獲得済み・詳細を見る" : "未獲得"}"><div class="ec-card__art">${c.acquired ? `<img src="${esc(image(c.imagePath))}" alt="${esc(c.eventName)}の記念カード" loading="lazy">` : `<div class="ec-silhouette" aria-hidden="true"><i></i><i></i><i></i>${lockIcon}</div>`}<span class="ec-year">${c.year}</span></div><div class="ec-card__name">${esc(c.eventName)} ${c.year}</div><span class="ec-badge${c.acquired ? "" : " ec-badge--muted"}">${c.acquired ? "獲得済み" : "未獲得"}</span></button>`).join("")}</div>
      ${filtered.length ? "" : `<div class="ec-empty">${st.year}年のカードはまだ公開されていません。</div>`}
      <p class="ec-footnote">未獲得のカードは、イベント会場のQRコードから獲得できます。</p>`;
  }
  function renderDetail(card) {
    st.detail = card.id;
    byId("collectionDetail").innerHTML = `<button type="button" class="ec-back" data-ec-go="collection">〈 コレクションに戻る</button><div class="ec-detail-art"><img src="${esc(image(card.imagePath))}" alt="${esc(card.eventName)} ${card.year}"><span class="ec-year">${card.year}</span></div><div class="ec-detail-title"><h1>${esc(card.eventName)} ${card.year}</h1><span class="ec-badge">獲得済み</span></div><dl class="ec-facts"><div><dt>開催日</dt><dd>${dateText(card.heldOn)}</dd></div><div><dt>獲得日時</dt><dd>${dateText(card.acquiredAt, true)}</dd></div><div><dt>イベント紹介</dt><dd class="ec-description">${esc(card.description || "イベントの思い出をお楽しみください。")}</dd></div></dl>`;
  }
  async function showClaim() {
    if (st.claiming) {
      // init() may finish its Home setup while a QR request is already pending.
      if (tokenFromHash() && getCurrentUser()) setActivePage("collection-claim");
      return;
    }
    const qrToken = tokenFromHash();
    if (!qrToken) return;
    const seq = ++st.claimSeq;
    const user = getCurrentUser();
    const root = user ? byId("collectionClaim") : byId("collectionPublic");
    if (user) setActivePage("collection-claim");
    else {
      byId("authGate").hidden = true;
      root.hidden = false;
    }
    busy(root, "イベントのQRコードを確認しています…");
    try {
      const info = await api("collectionQrInfo", { qrToken }, true);
      if (seq !== st.claimSeq || qrToken !== tokenFromHash()) return;
      if (!user || !getAuthToken()) {
        message(root, "ログインが必要です", `${info.eventName} ${info.year}のカードを獲得するには、ログインしてください。`, '<button type="button" class="ec-button" data-ec-login>ログインする</button>' + button("トップページに戻る", "home", true));
        return;
      }
      await claim(qrToken, seq);
    } catch (err) { if (seq === st.claimSeq && qrToken === tokenFromHash()) showError(root, err, err.code === "COLLECTION_QR_INVALID" ? "" : "claim"); }
  }
  async function claim(qrToken, seq) {
    if (st.claiming) return;
    st.claiming = true;
    const owner = st.owner;
    try {
      busy(byId("collectionClaim"), "カードを獲得しています…");
      const result = await api("collectionClaim", { qrToken });
      if (seq !== st.claimSeq || owner !== st.owner || qrToken !== tokenFromHash()) return;
      const card = result.card;
      st.cards = st.cards.filter(c => c.id !== card.id).concat(card);
      st.year = card.year;
      byId("collectionClaim").innerHTML = `<div class="ec-state ec-success"><div class="ec-celebrate${result.alreadyAcquired ? " ec-celebrate--quiet" : ""}"><span aria-hidden="true">✦</span><img src="${esc(image(card.imagePath))}" alt="${esc(card.eventName)} ${card.year}"><span aria-hidden="true">✧</span></div><h1>${result.alreadyAcquired ? "すでに獲得済みです" : "カードを獲得しました！"}</h1><h2>${esc(card.eventName)} ${card.year}</h2><p>${dateText(card.heldOn)} 開催</p><p class="ec-success__note">${result.alreadyAcquired ? "このカードはすでにコレクションに保存されています。" : "参加した思い出をコレクションに追加しました！"}</p><div class="ec-actions">${button("コレクションを見る", "collection")}${button("トップページに戻る", "home", true)}</div></div>`;
    } finally {
      st.claiming = false;
      if (tokenFromHash() && tokenFromHash() !== qrToken) resume();
    }
  }
  async function loadAdmin(options = {}) {
    if (!isAdminUser()) return false;
    const root = byId("collectionAdmin"), seq = ++st.adminSeq, owner = st.owner;
    if (!options.preserveForm) busy(root, "管理情報を読み込んでいます…");
    try {
      const data = await api("collectionAdminList");
      if (seq !== st.adminSeq || owner !== st.owner || !isAdminUser()) return false;
      st.admin = data;
      renderAdmin();
      return true;
    } catch (err) {
      if (options.preserveForm) throw err;
      if (seq === st.adminSeq && active("collection-admin")) showError(root, err, "admin");
      return false;
    }
  }
  const check = (name, label, value) => `<label class="ec-check"><input name="${name}" type="checkbox" ${value ? "checked" : ""}>${label}</label>`;
  function renderAdmin() {
    const { events, cards, qrs } = st.admin;
    byId("collectionAdmin").innerHTML = `<button type="button" class="ec-back" data-ec-go="admin">〈 管理に戻る</button><h1>コレクション管理</h1><p class="ec-intro">画像を手動で配置し、イベント・カード・配布QRを登録します。</p><div id="ecAdminMsg" class="ec-notice" role="status" hidden></div>
      <div class="ec-admin-list">${cards.map(c => {
        const event = events.find(e => e.id === c.eventId);
        return `<article class="ec-admin-card"><img src="${esc(image(c.imagePath))}" alt="${esc(event?.name)}のカード"><div><strong>${esc(event?.name)} ${c.year}</strong><p><span class="ec-badge">${c.published ? "公開中" : "非公開"}</span> <span class="ec-badge${c.distributionEnabled && event?.active ? "" : " ec-badge--muted"}">${c.distributionEnabled && event?.active ? "配布有効" : "配布停止"}</span></p><button class="btn" type="button" data-ec-edit-card="${esc(c.id)}">編集</button> <button class="btn" type="button" data-ec-select-qr="${esc(c.id)}">QR発行・確認</button></div></article>`;
      }).join("") || '<p class="ec-empty">カードを登録すると、ここに表示されます。</p>'}</div>
      <details class="ec-admin-section" open><summary>1. イベント登録・編集</summary><form id="ecEventForm" class="ec-form"><input type="hidden" name="recordId"><label>登録済みイベント<select id="ecEditEvent"><option value="">新規イベント</option>${events.map(e => `<option value="${esc(e.id)}">${esc(e.name)}</option>`).join("")}</select></label><label>イベント名<input name="name" required maxlength="100" placeholder="日本酒会"></label><label>紹介文<textarea name="description" maxlength="2000" rows="3"></textarea></label>${check("active", "有効", true)}<button class="ec-button" type="submit">イベントを保存</button></form></details>
      <details class="ec-admin-section" open><summary>2. 年ごとのカード登録・編集</summary><form id="ecCardForm" class="ec-form"><input type="hidden" name="recordId"><label>イベント<select name="eventId" required><option value="">選択してください</option>${events.map(e => `<option value="${esc(e.id)}">${esc(e.name)}</option>`).join("")}</select></label><label>対象年<input name="year" type="number" min="2000" max="2200" value="${yearNow()}" required></label><input type="hidden" name="imagePath"><fieldset class="ec-image-picker"><legend>カード画像を選択</legend><div class="ec-image-toolbar"><p class="ec-help">保管済みの画像を押して選択してください。</p><button type="button" class="btn" data-ec-reload-images>画像一覧を更新</button></div><div id="ecImageChoices" class="ec-image-choices" aria-label="保管済みカード画像"></div><p id="ecSelectedImage" class="ec-help" role="status">画像が選択されていません。</p></fieldset><img id="ecImagePreview" class="ec-image-preview" alt="選択したカード画像" hidden><p id="ecImageStatus" class="ec-help" role="status"></p>${check("published", "一覧に公開する", true)}${check("distributionEnabled", "QRからの配布を有効にする", true)}<p class="ec-help">獲得されたカードのイベント・年・画像は変更できません。配布停止後も獲得履歴は残ります。</p><div class="ec-inline"><button class="ec-button" type="submit">カードを保存</button><button class="btn" type="button" data-ec-new-card>新規登録に戻す</button></div></form></details>
      <details class="ec-admin-section" open><summary>3. 開催回ごとのQR発行</summary><form id="ecQrForm" class="ec-form"><label>対象カード<select name="cardId" required><option value="">選択してください</option>${cards.map(c => `<option value="${esc(c.id)}">${esc(events.find(e => e.id === c.eventId)?.name)} ${c.year}</option>`).join("")}</select></label><label>開催日（日本時間）<input name="heldOn" type="date" required value="${today()}"></label><label>配布開始（日本時間）<input name="startsAt" type="datetime-local" required value="${today()}T00:00"></label><label>配布終了（日本時間）<input name="endsAt" type="datetime-local" required value="${today()}T23:59"></label><button class="ec-button" type="submit">新しいQRを発行</button></form><p class="ec-help">再発行するときは新しいQRを作成し、以前のQRを停止してください。</p><div id="ecQrList">${qrs.map(qr => {
        const card = cards.find(c => c.id === qr.cardId);
        return `<article class="ec-qr-row"><strong>${esc(events.find(e => e.id === card?.eventId)?.name)} ${card?.year || ""}</strong><p>${dateText(qr.heldOn)} 開催 ／ ${qr.enabled ? "有効" : "停止中"}</p><p>${dateText(qr.startsAt, true)} 〜 ${dateText(qr.endsAt, true)}</p><button type="button" class="btn" data-ec-show-qr="${esc(qr.id)}">QR表示・保存</button> <button type="button" class="btn" data-ec-toggle-qr="${esc(qr.id)}" data-enabled="${!qr.enabled}">${qr.enabled ? "停止する" : "有効にする"}</button></article>`;
      }).join("")}</div></details><dialog id="ecQrDialog" class="ec-qr-dialog"><button type="button" class="ec-back" data-ec-close-qr>閉じる ×</button><h2 id="ecQrTitle"></h2><canvas id="ecQrCanvas" aria-label="イベント配布用QRコード"></canvas><p id="ecQrPeriod"></p><label class="ec-form">共有用URL<input id="ecQrUrl" readonly></label><div class="ec-actions"><button type="button" class="ec-button" data-ec-download-qr>QRをPNG保存</button><button type="button" class="ec-button ec-button--secondary" data-ec-copy-qr>URLをコピー</button></div><p class="ec-help">担当者へQR画像を共有してください。保存・URL共有による代理取得を完全には防止できません。</p></dialog>`;
    if (st.images === null) loadImages(); else renderImageChoices();
  }
  function selectEvent(id) {
    const event = st.admin.events.find(v => v.id === id), form = byId("ecEventForm");
    form.elements.recordId.value = event?.id || "";
    byId("ecEditEvent").value = event?.id || "";
    for (const key of ["name", "description"]) form.elements[key].value = event?.[key] || "";
    form.elements.active.checked = event ? !!event.active : true;
  }
  function editCard(id) {
    const c = st.admin.cards.find(c => c.id === id), f = byId("ecCardForm");
    f.elements.recordId.value = c.id;
    for (const key of ["eventId", "year", "imagePath"]) f.elements[key].value = c[key] || "";
    f.elements.published.checked = !!c.published; f.elements.distributionEnabled.checked = !!c.distributionEnabled;
    selectImage(c.imagePath); f.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  function githubImageListUrl() {
    const base = new URL(".", window.location.href);
    const owner = base.hostname.match(/^([A-Za-z0-9-]+)\.github\.io$/)?.[1];
    const parts = base.pathname.split("/").filter(Boolean);
    if (!owner || parts.length !== 2 || parts[1] !== "demo") return "";
    const url = new URL(`https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(parts[0])}/contents/demo/collection-images`);
    if (window.APP_CONFIG?.COLLECTION_IMAGES_REF) url.searchParams.set("ref", window.APP_CONFIG.COLLECTION_IMAGES_REF);
    return url.toString();
  }
  async function imageListJson(url) {
    const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 12000);
    try {
      const response = await fetch(url, { cache: "no-store", credentials: "omit", signal: controller.signal, headers: { Accept: "application/json" } });
      if (!response.ok) throw new Error("画像一覧を取得できませんでした。");
      return JSON.parse(await response.text());
    } finally { clearTimeout(timer); }
  }
  async function loadImages(force = false) {
    if (!isAdminUser() || st.imageLoading) return;
    if (st.images !== null && !force) { renderImageChoices(); return; }
    const owner = st.owner, seq = ++st.imageSeq;
    if (force) st.imageRefresh++;
    st.imageLoading = true;
    const root = byId("ecImageChoices");
    if (root) root.innerHTML = '<p class="ec-help" role="status">保管済みの画像を読み込んでいます…</p>';
    try {
      let items, githubFailed = false;
      const githubUrl = githubImageListUrl();
      if (githubUrl) {
        try {
          const files = await imageListJson(githubUrl);
          if (!Array.isArray(files)) throw new Error("画像一覧の形式を確認してください。");
          items = files.filter(f => f.type === "file" && image("collection-images/" + f.name))
            .map(f => ({ path: "collection-images/" + f.name, invalid: Number.isFinite(f.size) && f.size < 20, revision: f.sha }));
        } catch (_) { githubFailed = true; }
      }
      if (!items) {
        const catalog = await imageListJson(new URL("./collection-images/catalog.json", window.location.href).toString());
        const entries = Array.isArray(catalog) ? catalog : catalog.images;
        if (!Array.isArray(entries)) throw new Error("画像一覧の形式を確認してください。");
        items = entries.map(entry => ({ path: typeof entry === "string" ? entry : entry?.path, invalid: false, revision: entry?.revision })).filter(entry => image(entry.path));
      }
      if (seq !== st.imageSeq || owner !== st.owner || !isAdminUser()) return;
      st.images = [...new Map(items.map(item => [item.path, item])).values()];
      st.imageVersions = new Map(items.filter(item => typeof item.revision === "string" && /^[a-f0-9]{40,64}$/i.test(item.revision)).map(item => [item.path, item.revision]));
      st.imageError = githubFailed && !items.length ? "画像一覧を取得できませんでした。時間をおいて「画像一覧を更新」を押してください。" : "";
    } catch (_) {
      if (seq !== st.imageSeq || owner !== st.owner) return;
      st.images = [];
      st.imageError = "画像一覧を取得できませんでした。公開ファイルを確認し、「画像一覧を更新」を押してください。";
    } finally {
      if (seq === st.imageSeq) {
        st.imageLoading = false; renderImageChoices();
        if (byId("ecCardForm")?.elements.imagePath.value) updateImagePreview();
      }
    }
  }
  function renderImageChoices() {
    const root = byId("ecImageChoices"), form = byId("ecCardForm");
    if (!root || !form || !isAdminUser()) return;
    const selected = form.elements.imagePath.value;
    const paths = new Map((st.images || []).map(item => [item.path, item]));
    for (const card of st.admin?.cards || []) if (image(card.imagePath) && !paths.has(card.imagePath)) paths.set(card.imagePath, { path: card.imagePath, invalid: false });
    root.innerHTML = (st.imageError ? `<p class="ec-help ec-image-warning" role="status">${esc(st.imageError)}</p>` : "") +
      [...paths.values()].sort((a, b) => a.path.localeCompare(b.path)).map(item => `<button type="button" class="ec-image-choice" data-ec-image="${esc(item.path)}" aria-pressed="${selected === item.path}" ${item.invalid ? "disabled" : ""}>${item.invalid ? '<span class="ec-image-unavailable">画像データがありません</span>' : `<img src="${esc(image(item.path))}" alt="${esc(item.path.split("/").pop())}" loading="lazy">`}<span>${esc(item.path.split("/").pop())}</span><small>${item.invalid ? "画像ファイルを再アップロードしてください" : selected === item.path ? "選択中" : "この画像を選ぶ"}</small></button>`).join("") +
      (!paths.size && !st.imageError ? '<p class="ec-help">保管済みの画像がありません。collection-imagesフォルダへ画像をアップロードし、「画像一覧を更新」を押してください。</p>' : "");
  }
  function selectImage(path) {
    const clean = path.replace(/^\.\//, ""), form = byId("ecCardForm");
    form.elements.imagePath.value = image(clean) ? clean : "";
    byId("ecSelectedImage").textContent = form.elements.imagePath.value ? "選択中：" + clean.split("/").pop() : "画像が選択されていません。";
    renderImageChoices();
    updateImagePreview();
  }
  function updateImagePreview() {
    const path = image(byId("ecCardForm").elements.imagePath.value.replace(/^\.\//, ""));
    const img = byId("ecImagePreview"), status = byId("ecImageStatus");
    img.hidden = true; status.textContent = "";
    if (!path) { img.removeAttribute("src"); return; }
    img.onload = () => { img.hidden = false; status.textContent = "画像を確認できました。"; };
    img.onerror = () => { img.hidden = true; status.textContent = "画像を読み込めません。「画像一覧を更新」で読み直してください。公開直後の場合は少し待ってからお試しください。"; };
    img.src = path;
  }
  function showQr(id) {
    const qr = st.admin.qrs.find(q => q.id === id), card = st.admin.cards.find(c => c.id === qr.cardId);
    const event = st.admin.events.find(e => e.id === card.eventId);
    const code = qrcode(0, "M"); code.addData(qr.url); code.make();
    const count = code.getModuleCount(), unit = 8, margin = 4, canvas = byId("ecQrCanvas");
    canvas.width = canvas.height = (count + margin * 2) * unit;
    const ctx = canvas.getContext("2d"); ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.fillStyle = "#111";
    for (let y = 0; y < count; y++) for (let x = 0; x < count; x++) if (code.isDark(y, x)) ctx.fillRect((x + margin) * unit, (y + margin) * unit, unit, unit);
    byId("ecQrTitle").textContent = `${event.name} ${card.year}`;
    byId("ecQrPeriod").textContent = `${qr.enabled ? "有効" : "停止中"} ／ ${dateText(qr.startsAt, true)} 〜 ${dateText(qr.endsAt, true)}`;
    byId("ecQrUrl").value = qr.url;
    byId("ecQrDialog").showModal();
  }
  function adminNotice(text) { const el = byId("ecAdminMsg"); if (el) { el.hidden = false; el.textContent = text; el.scrollIntoView({ behavior: "smooth", block: "nearest" }); } }
  async function submitAdmin(form) {
    if (form.dataset.ecSubmitting) return;
    const submit = form.querySelector('[type="submit"]'), formId = form.getAttribute("id"), owner = st.owner;
    form.dataset.ecSubmitting = "true"; submit.disabled = true;
    let saved = false, result;
    try {
      const values = Object.fromEntries(new FormData(form));
      if (formId === "ecEventForm") result = await api("collectionSaveEvent", { event: { ...values, id: values.recordId, active: form.elements.active.checked } });
      if (formId === "ecCardForm") {
        const preview = byId("ecImagePreview");
        if (!image(values.imagePath) || preview.hidden || !preview.complete || !preview.naturalWidth) throw new Error("画像を選び、プレビューが表示されてから保存してください。");
        result = await api("collectionSaveCard", { card: { ...values, id: values.recordId, year: Number(values.year), published: form.elements.published.checked, distributionEnabled: form.elements.distributionEnabled.checked } });
      }
      if (formId === "ecQrForm") result = await api("collectionCreateQr", { qr: { ...values, startsAt: values.startsAt + ":00+09:00", endsAt: values.endsAt + ":00+09:00" } });
      saved = true;
      if (owner !== st.owner || !active("collection-admin")) return;
      if (result.event || result.card) form.elements.recordId.value = (result.event || result.card).id;
      if (!(await loadAdmin({ preserveForm: true }))) return;
      if (result.event) {
        selectEvent(result.event.id);
        byId("ecCardForm").elements.eventId.value = result.event.id;
        adminNotice(`イベント「${result.event.name}」を保存しました。続いて「2. 年ごとのカード登録・編集」で画像を選択できます。`);
      } else if (result.card) {
        editCard(result.card.id);
        byId("ecQrForm").elements.cardId.value = result.card.id;
        adminNotice("カードを保存しました。続いて「3. 開催回ごとのQR発行」で配布期間を設定できます。");
      } else {
        adminNotice("QRを発行しました。");
        if (st.admin?.qrs.some(q => q.id === result.qr.id)) showQr(result.qr.id);
      }
    } catch (err) {
      if (owner === st.owner && active("collection-admin")) adminNotice(saved ? "保存は完了しましたが、一覧の再読み込みに失敗しました。入力内容は残っています。時間をおいて管理画面を開き直してください。" : err.message);
    } finally { delete form.dataset.ecSubmitting; submit.disabled = false; }
  }
  function authChanged() {
    const owner = String(getCurrentUser()?.id || "");
    if (owner) st.loginRequested = false;
    if (owner !== st.owner) {
      window.CollectionScanner?.close();
      st.owner = owner; st.cards = []; st.admin = null; st.detail = ""; st.year = yearNow(); st.event = ""; st.tab = "all";
      st.images = null; st.imageError = ""; st.imageLoading = false;
      st.imageVersions = new Map(); st.imageRefresh = 0;
      st.listSeq++; st.claimSeq++; st.adminSeq++; st.imageSeq++;
      ["collectionRoot", "collectionDetail", "collectionAdmin", "collectionClaim"].forEach(id => { if (byId(id)) byId(id).replaceChildren(); });
    }
    if (owner || !tokenFromHash() || st.loginRequested) byId("collectionPublic").hidden = true;
  }
  function pageChanged(key) {
    if (key !== "collection") window.CollectionScanner?.close();
    document.querySelector('.navitem[data-nav="collection"]')?.classList.toggle("navitem--active", ["collection", "collection-detail", "collection-claim"].includes(key));
    if (key === "collection") loadList();
    if (key === "collection-admin") loadAdmin();
  }
  function resume() { if (tokenFromHash() && !st.loginRequested) showClaim(); }
  function bind() {
    document.addEventListener("click", async e => {
      const target = e.target.closest("button"); if (!target) return;
      try {
        if (target.dataset.ecGo) await go(target.dataset.ecGo);
        if (target.hasAttribute("data-ec-scan")) {
          if (!getCurrentUser() || !getAuthToken() || !active("collection")) return;
          if (!window.CollectionScanner) { showToast("読み取り機能を読み込めません。アプリを開き直してください。"); return; }
          window.CollectionScanner.open(qrToken => {
            window.history.replaceState({}, "", window.location.pathname + window.location.search + "#collection-claim=" + encodeURIComponent(qrToken));
            st.loginRequested = false;
            resume();
          });
        }
        if (target.hasAttribute("data-ec-login")) { st.loginRequested = true; byId("collectionPublic").hidden = true; byId("authGate").hidden = false; byId("loginEmail").focus(); }
        if (target.dataset.ecRetry === "list") loadList();
        if (target.dataset.ecRetry === "claim") showClaim();
        if (target.dataset.ecRetry === "admin") loadAdmin();
        if (target.dataset.ecTab) { st.tab = target.dataset.ecTab; if (st.tab !== "event") st.event = ""; renderList(); if (st.tab === "year") byId("ecYear").focus(); }
        if (target.dataset.ecCard) {
          const card = st.cards.find(c => c.id === target.dataset.ecCard);
          if (!card?.acquired) { showToast("イベント会場のQRコードから獲得できます。"); return; }
          setActivePage("collection-detail"); renderDetail(card); window.scrollTo(0, 0);
        }
        if (target.dataset.ecEditCard) editCard(target.dataset.ecEditCard);
        if (target.hasAttribute("data-ec-new-card")) { byId("ecCardForm").reset(); byId("ecCardForm").elements.recordId.value = ""; selectImage(""); }
        if (target.dataset.ecImage) selectImage(target.dataset.ecImage);
        if (target.hasAttribute("data-ec-reload-images")) loadImages(true);
        if (target.dataset.ecSelectQr) { byId("ecQrForm").elements.cardId.value = target.dataset.ecSelectQr; byId("ecQrForm").scrollIntoView({ behavior: "smooth" }); }
        if (target.dataset.ecShowQr) showQr(target.dataset.ecShowQr);
        if (target.dataset.ecToggleQr) {
          target.disabled = true;
          try { await api("collectionSetQrEnabled", { qr: { id: target.dataset.ecToggleQr, enabled: target.dataset.enabled === "true" } }); await loadAdmin(); }
          finally { target.disabled = false; }
        }
        if (target.hasAttribute("data-ec-close-qr")) byId("ecQrDialog").close();
        if (target.hasAttribute("data-ec-download-qr")) { const a = document.createElement("a"); a.download = "event-collection-qr.png"; a.href = byId("ecQrCanvas").toDataURL("image/png"); a.click(); }
        if (target.hasAttribute("data-ec-copy-qr")) { try { await navigator.clipboard.writeText(byId("ecQrUrl").value); target.textContent = "コピーしました"; } catch (_) { byId("ecQrUrl").select(); } }
      } catch (err) { adminNotice(err.message); showToast(err.message); }
    });
    document.addEventListener("submit", e => {
      const form = e.target;
      // HTMLFormElement named controls can override .id in real browsers.
      if (form.matches?.("form#ecEventForm,form#ecCardForm,form#ecQrForm")) {
        e.preventDefault(); e.stopPropagation(); submitAdmin(form);
      }
    }, true);
    document.addEventListener("change", e => {
      if (e.target.id === "ecYear") { st.year = Number(e.target.value); renderList(); }
      if (e.target.id === "ecEvent") { st.event = e.target.value; renderList(); }
      if (e.target.id === "ecEditEvent") {
        selectEvent(e.target.value);
      }
      if (e.target.name === "imagePath") updateImagePreview();
    });
    // Leaving a completed QR screen through the existing navigation must not re-claim on refresh.
    document.querySelector(".bottomnav")?.addEventListener("click", e => { if (e.target.closest(".navitem")) { clearClaimHash(); st.claimSeq++; } });
    window.addEventListener("hashchange", () => { st.loginRequested = false; resume(); });
    document.addEventListener("keydown", e => { if (e.key === "Escape" && active("collection-detail")) go("collection"); });
    document.addEventListener("error", e => {
      if (e.target.matches?.(".ec-image-choice img")) {
        const choice = e.target.closest("button");
        choice.disabled = true;
        choice.querySelector("small").textContent = "画像を読み込めません。「画像一覧を更新」で再試行してください。";
        e.target.alt = "画像を表示できません";
      }
      if (e.target.matches?.(".ec-card img,.ec-detail-art img,.ec-celebrate img,.ec-admin-card img")) { e.target.classList.add("ec-image-missing"); e.target.alt = "画像が見つかりません。公開ファイルを確認してください。"; }
    }, true);
    authChanged();
    resume();
  }
  window.EventCollection = { authChanged, pageChanged, resume };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bind); else bind();
})();
