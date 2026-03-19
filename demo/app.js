/* Community News Wire Sample
   + Schedule Tab
   + Admin: Create/Edit/Delete posts (localStorage)
   + Export / Import JSON
*/

const $ = (sel, root=document) => root.querySelector(sel);
const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));

const LS_KEY_SAVED = "community_news_saved_v1";
const LS_KEY_ONLY_IMPORTANT = "community_news_only_important_v1";
const LS_KEY_ONLY_UPCOMING = "community_news_only_upcoming_v1";
const LS_KEY_POSTS = "community_news_posts_v1"; // admin-created posts
const LS_KEY_USER = "community_news_user_v1";

const CHANNELS = [
  { key:"all", label:"All", tone:"accent" },
  { key:"announce", label:"告知", tone:"accent" },
  { key:"event", label:"イベント", tone:"good" },
  { key:"ops", label:"運営", tone:"warn" },
  { key:"tips", label:"Tips", tone:"accent" },
];

const BASE_ARTICLES = [
  {
    id:"a1",
    channel:"announce",
    tone:"accent",
    badge:"告知",
    date:"2026-02-12",
    title:"コミュニティ限定：ニュースアプリ運用を開始します",
    desc:"このアプリはコミュニティ内の告知・イベント・重要連絡をまとめます。",
    tags:["運営","固定"],
    summary:[
      "このアプリはコミュ内限定で運用",
      "重要な投稿は通知タブにも反映",
      "保存であとで読むが可能"
    ],
    body:[
      "ここに本文サンプルが入ります。運営からの重要な告知や、イベントの案内、締切のリマインドなどを集約します。",
      "投稿のテンプレ化や、チャンネル分けも可能です。"
    ],
    cta:{ text:"案内ドキュメントを見る", url:"https://example.com" }
  },
  {
    id:"a2",
    channel:"event",
    tone:"good",
    badge:"イベント",
    date:"2026-02-18",
    title:"次回集まり：オンライン交流（テスト）",
    desc:"試験的に30分の短い交流を実施します。参加方法は本文へ。",
    tags:["Zoom","30分"],
    summary:["日時：2/18 20:00","参加URLは当日掲示","途中入退室OK"],
    body:["イベントの詳細です。ここにZoomリンクや参加方法など。"],
    cta:{ text:"参加フォームへ", url:"https://example.com" }
  },
  {
    id:"a3",
    channel:"ops",
    tone:"warn",
    badge:"運営",
    date:"2026-02-15",
    title:"投稿ルール：個人情報の取り扱いについて",
    desc:"招待制の場でも、個人情報は最小限に。守ってほしいポイントをまとめました。",
    tags:["ルール"],
    summary:["個人情報は原則書かない","外部リンクは確認","困ったら運営へ"],
    body:["ここに本文。投稿のガイドラインなど。"],
  }
];

// ==== Contact data ====
const OWNERS = [
  {
    name: "東",
    instagram: "https://x.gd/tLcAs",
  },
  {
    name: "しゅう",
    instagram: "https://x.gd/2a58h",
  },
  {
    name: "◯◯",
    instagram: "https://instagram.com/yyyy",
  },
  {
    name: "◯◯",
    instagram: "https://instagram.com/yyyy",
  },
  {
    name: "◯◯",
    instagram: "https://instagram.com/yyyy",
  },
  {
    name: "◯◯",
    instagram: "https://instagram.com/yyyy",
  },
  {
    name: "◯◯",
    instagram: "https://instagram.com/yyyy",
  },
  {
    name: "◯◯",
    instagram: "https://instagram.com/yyyy",
  },
  {
    name: "◯◯",
    instagram: "https://instagram.com/yyyy",
  },
];

// ==== Schedule data (sample) ====
const SCHEDULE = [
  { id:"s1", title:"オンライン交流（テスト）", date:"2026-02-18", time:"20:00", tone:"good", label:"イベント", desc:"30分だけ。近況共有＋次の動き確認。" },
  { id:"s2", title:"募集締切：参加フォーム", date:"2026-02-16", time:"23:59", tone:"warn", label:"締切", desc:"参加人数把握のため、期限までに入力お願いします。" },
  { id:"s3", title:"運営投稿：次月の方針共有", date:"2026-03-02", time:"21:00", tone:"accent", label:"運営", desc:"来月の動きと、改善点の共有（15分）。" },
  { id:"s4", title:"重要：規約更新告知", date:"2026-03-05", time:"12:00", tone:"danger", label:"重要", desc:"投稿ルールの追加。必読。" }
];

// ==== Notifications (sample) ====
const NOTIFS = [
  { id:"n1", title:"重要：明日の締切", time:"2026-02-15 19:30", important:true, text:"参加フォームの締切は 2/16 23:59 です。" },
  { id:"n2", title:"運営：新機能", time:"2026-02-12 10:05", important:false, text:"Schedule / Admin を追加しました（UIサンプル）。" }
];

// ===== State =====
let state = {
  channel: "all",
  query: "",
  drawerOpen: false,
  activeArticleId: null,

  // schedule
  calYear: null,
  calMonth: null, // 0-11
  selectedDate: null, // YYYY-MM-DD
  scheduleView: "month", // "month" | "2w" | "1w"
  scheduleCursor: null,  // Date

  // admin
  editingId: null, // post id
};

let cloudPosts = [];

// ===== Helpers =====
function safeJsonParse(s, fallback){
  try { return JSON.parse(s); } catch { return fallback; }
}

function loadSaved(){
  return safeJsonParse(localStorage.getItem(LS_KEY_SAVED) || "[]", []);
}
function saveSaved(arr){
  localStorage.setItem(LS_KEY_SAVED, JSON.stringify(arr));
}
function isSaved(id){
  return loadSaved().includes(id);
}

function loadPosts(){
  return safeJsonParse(localStorage.getItem(LS_KEY_POSTS) || "[]", []);
}
function savePosts(posts){
  localStorage.setItem(LS_KEY_POSTS, JSON.stringify(posts));
}

function allArticles(){
  const localAdmin = loadPosts();   // いままで通り localStorage の記事
  const merged = [...localAdmin, ...cloudPosts, ...BASE_ARTICLES];

  // 同じidがあれば後勝ちで上書き
  const map = new Map();
  for(const a of merged){
    map.set(a.id, a);
  }

  return Array.from(map.values());
}
/**
function formatDateJP(iso){
  if(!iso) return "-";
  const [y,m,d] = iso.split("-").map(Number);
  return `${y}/${String(m).padStart(2,"0")}/${String(d).padStart(2,"0")}`;
}
**/
function formatDateJP(value){
  if(!value) return "-";

  // すでに YYYY-MM-DD 形式
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split("-");
    return `${y}/${m}/${d}`;
  }

  // YYYY/MM/DD 形式
  if (typeof value === "string" && /^\d{4}\/\d{1,2}\/\d{1,2}$/.test(value)) {
    const [y, m, d] = value.split("/");
    return `${y}/${String(m).padStart(2,"0")}/${String(d).padStart(2,"0")}`;
  }

  // Dateとして解釈して整形
  const dt = new Date(value);
  if (!isNaN(dt.getTime())) {
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, "0");
    const d = String(dt.getDate()).padStart(2, "0");
    return `${y}/${m}/${d}`;
  }

  return String(value);
}

function ymd(d){
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,"0");
  const dd = String(d.getDate()).padStart(2,"0");
  return `${y}-${m}-${dd}`;
}
function todayYMD(){ return ymd(new Date()); }

function toneColor(tone){
  const css = getComputedStyle(document.documentElement);
  const map = {
    accent: css.getPropertyValue("--accent").trim() || "#b07d4f",
    good: css.getPropertyValue("--good").trim() || "#7aa67a",
    warn: css.getPropertyValue("--warn").trim() || "#c48a4a",
    danger: css.getPropertyValue("--danger").trim() || "#c56a5c",
  };
  return map[tone] || (css.getPropertyValue("--accent2").trim() || "#d9b38c");
}

function channelLabel(key){
  return CHANNELS.find(c=>c.key===key)?.label || key;
}

function badgeTextFromChannel(ch){
  const map = { announce:"告知", event:"イベント", ops:"運営", tips:"Tips" };
  return map[ch] || "Info";
}

function normalizePost(input){
  const a = { ...input };
  a.id = a.id || `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,7)}`;
  a.channel = a.channel || "announce";
  a.tone = a.tone || "accent";
  a.badge = a.badge || badgeTextFromChannel(a.channel);
  a.date = a.date || todayYMD();
  a.title = a.title || "(no title)";
  a.desc = a.desc || "";
  a.tags = Array.isArray(a.tags) ? a.tags : [];
  a.summary = Array.isArray(a.summary) ? a.summary : [];
  a.body = Array.isArray(a.body) ? a.body : [];
  if(a.cta && (!a.cta.url || String(a.cta.url).trim()==="")) a.cta = null;
  a.media = a.media || {};
  a.media.images = Array.isArray(a.media.images) ? a.media.images : [];
  a.media.video = a.media.video || "";
  return a;
}

async function fetchPostsFromApi() {
  const base = window.APP_CONFIG?.GAS_API_URL;
  if (!base) {
    console.warn("GAS_API_URL is not set");
    return [];
  }

  const url = `${base}?action=listPosts`;
  const res = await fetch(url);
  const data = await res.json();

  if (!data.ok) {
    throw new Error(data.message || "Failed to fetch posts");
  }

  return (data.posts || []).map(post => ({
    id: post.id,
    channel: post.channel,
    tone: post.tone,
    badge: post.badge,
    date: post.date,
    title: post.title,
    desc: post.desc,
    tags: post.tags || [],
    summary: post.summary || [],
    body: post.body || [],
    cta: post.ctaUrl ? {
      text: post.ctaText || "開く",
      url: post.ctaUrl
    } : null,
    media: {
      images: post.images || [],
      video: post.video || ""
    }
  }));
}

async function savePostToApi(post) {
  const base = window.APP_CONFIG?.GAS_API_URL;
  if (!base) {
    throw new Error("GAS_API_URL is not set");
  }

  const res = await fetch(base, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain;charset=utf-8"
    },
    body: JSON.stringify({
      action: "savePost",
      post: {
        id: post.id || "",
        date: post.date || "",
        channel: post.channel || "announce",
        tone: post.tone || "accent",
        badge: post.badge || "",
        title: post.title || "",
        desc: post.desc || "",
        tags: post.tags || [],
        summary: post.summary || [],
        body: post.body || [],
        ctaText: post.cta?.text || "",
        ctaUrl: post.cta?.url || "",
        images: post.media?.images || [],
        video: post.media?.video || "",
        status: "public"
      }
    })
  });

  const data = await res.json();

  if (!data.ok) {
    throw new Error(data.message || "Failed to save post");
  }

  return data.post;
}

async function saveContactToApi(contact) {
  const base = window.APP_CONFIG?.GAS_API_URL;
  if (!base) {
    throw new Error("GAS_API_URL is not set");
  }

  const res = await fetch(base, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain;charset=utf-8"
    },
    body: JSON.stringify({
      action: "saveContact",
      contact: {
        name: contact.name || "",
        email: contact.email || "",
        message: contact.message || ""
      }
    })
  });

  const data = await res.json();

  if (!data.ok) {
    throw new Error(data.message || "Failed to save contact");
  }

  return data.contact;
}

async function uploadImageToApi(file) {
  const base = window.APP_CONFIG?.GAS_API_URL;
  if (!base) throw new Error("GAS_API_URL is not set");

  const dataUrl = await fileToDataUrl(file);

  const res = await fetch(base, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain;charset=utf-8"
    },
    body: JSON.stringify({
      action: "uploadImage",
      fileName: file.name,
      mimeType: file.type,
      dataUrl
    })
  });

  const data = await res.json();
  if (!data.ok) {
    throw new Error(data.message || "Image upload failed");
  }

  return data.url;
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/* ログイン関数 */
async function loginToApi(email, password) {
  const base = window.APP_CONFIG?.GAS_API_URL;
  if (!base) {
    throw new Error("GAS_API_URL is not set");
  }

  const res = await fetch(base, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain;charset=utf-8"
    },
    body: JSON.stringify({
      action: "login",
      email,
      password
    })
  });

  const data = await res.json();

  if (!data.ok) {
    throw new Error(data.message || "Login failed");
  }

  return data.user;
}

async function registerToApi(name, email, password) {
  const base = window.APP_CONFIG?.GAS_API_URL;
  if (!base) {
    throw new Error("GAS_API_URL is not set");
  }

  const res = await fetch(base, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain;charset=utf-8"
    },
    body: JSON.stringify({
      action: "register",
      user: {
        name,
        email,
        password
      }
    })
  });

  const data = await res.json();

  if (!data.ok) {
    throw new Error(data.message || "Register failed");
  }

  return data.user;
}

function getCurrentUser() {
  return safeJsonParse(localStorage.getItem(LS_KEY_USER) || "null", null);
}

function saveCurrentUser(user) {
  localStorage.setItem(LS_KEY_USER, JSON.stringify(user));
}

function clearCurrentUser() {
  localStorage.removeItem(LS_KEY_USER);
}

/* 画面切り替え関数 */
function applyAuthUI() {
  const user = getCurrentUser();

  const authGate = document.getElementById("authGate");
  const appRoot = document.getElementById("appRoot");
  const btnLogout = document.getElementById("btnLogout");
  const adminNav = document.querySelector('.navitem[data-nav="admin"]');
  const adminPage = document.querySelector('.page[data-page="admin"]');

  if (!authGate || !appRoot) return;

  if (!user) {
    authGate.hidden = false;
    authGate.style.display = "flex";

    appRoot.hidden = true;
    appRoot.style.display = "none";

    if (btnLogout) btnLogout.style.display = "none";
    if (adminNav) adminNav.style.display = "none";
    if (adminPage) adminPage.style.display = "none";
    return;
  }

  authGate.hidden = true;
  authGate.style.display = "none";

  appRoot.hidden = false;
  appRoot.style.display = "block";

  if (btnLogout) btnLogout.style.display = "grid";

  const isAdmin = user.role === "admin";

  if (adminNav) adminNav.style.display = isAdmin ? "flex" : "none";
  if (adminPage) adminPage.style.display = isAdmin ? "" : "none";
}

// ===== Rendering: Chips =====
function renderChips(){
  const row = $("#chipRow");
  row.innerHTML = CHANNELS.map(ch => {
    const active = (state.channel === ch.key) ? " chip--active" : "";
    return `
      <button class="chip${active}" data-chip="${ch.key}" data-tone="${ch.tone}">
        <span class="chip__dot"></span>
        <span>${ch.label}</span>
      </button>
    `;
  }).join("");

  $$(".chip", row).forEach(btn => {
    btn.addEventListener("click", () => {
      state.channel = btn.dataset.chip;
      renderChips();
      renderFeed();
    });
  });
}

// ===== Feed =====
function filteredArticles(){
  const q = state.query.trim().toLowerCase();
  return allArticles()
    .filter(a => state.channel === "all" ? true : a.channel === state.channel)
    .filter(a => {
      if(!q) return true;
      return (
        (a.title||"").toLowerCase().includes(q) ||
        (a.desc||"").toLowerCase().includes(q) ||
        (a.tags||[]).join(" ").toLowerCase().includes(q) ||
        (a.badge||"").toLowerCase().includes(q)
      );
    })
    .sort((a,b) => (a.date < b.date ? 1 : -1));
}

function renderFeed(){
  const items = filteredArticles();
  const hint = $("#feedHint");
  const title = $("#feedTitle");
  if(hint) hint.textContent = `${items.length}件`;
  if(title){
    title.textContent = state.channel === "all"
      ? "Latest"
      : (CHANNELS.find(c=>c.key===state.channel)?.label || "Latest");
  }

  const cards = $("#cards");
  if(!cards) return;

cards.innerHTML = items.map(a => {
  const pills = (a.tags||[]).map(t => `<span class="pill">${escapeHtml(t)}</span>`).join("");

const thumb = (a.media?.images && a.media.images.length) ? a.media.images[0] : "";
const mediaHtml = thumb
  ? `<div class="card__media"><img src="${escapeAttr(thumb)}" alt="" loading="lazy"></div>`
  : `<div class="card__media card__media--placeholder" aria-hidden="true"></div>`;

  return `
    <article class="card" data-article="${escapeAttr(a.id)}">
      ${mediaHtml}
      <div class="card__content">
        <div class="card__top">
          <span class="badge" data-tone="${escapeAttr(a.tone||"accent")}">
            <span class="badge__dot"></span>
            <span>${escapeHtml(a.badge||"Info")}</span>
          </span>
          <div class="card__date">${formatDateJP(a.date)}</div>
        </div>

        <div class="card__title">${escapeHtml(a.title||"")}</div>
        <div class="card__desc">${escapeHtml(a.desc||"")}</div>
        <div class="card__meta">${pills}</div>
      </div>
    </article>
  `;
}).join("");

  $$(".card", cards).forEach(el => {
    el.addEventListener("click", () => openDrawer(el.dataset.article));
  });
}

function escapeHtml(s){
  return String(s ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}
function escapeAttr(s){
  return escapeHtml(s).replaceAll("`","&#096;");
}

// ===== Drawer =====
function openDrawer(articleId){
  const a = allArticles().find(x => x.id === articleId);
  if(!a) return;

  state.drawerOpen = true;
  state.activeArticleId = a.id;

  $("#drawer").classList.add("drawer--open");
  $("#drawer").setAttribute("aria-hidden", "false");

  // badge
  const badge = $("#drawerBadge");
  badge.setAttribute("data-tone", a.tone || "accent");
  $("#drawerBadgeText").textContent = a.badge || "Info";
  $("#drawerDate").textContent = formatDateJP(a.date);

  $("#aTitle").textContent = a.title || "";
  $("#aMeta").textContent = `#${a.channel}  /  ${(a.tags||[]).join("・") || "-"}`;

  const stats = $("#aStats");
  stats.innerHTML = (a.tags||[]).map(t => `<span class="pill">${escapeHtml(t)}</span>`).join("");

  const sum = $("#aSummaryList");
  sum.innerHTML = (a.summary||[]).map(x => `<li>${escapeHtml(x)}</li>`).join("");
  $("#aSummary").style.display = (a.summary && a.summary.length) ? "block" : "none";

const body = $("#aBody");
body.innerHTML =
  mediaHtml(a) +
  (a.body||[]).map(p => `<p>${escapeHtml(p)}</p>`).join("");

   function mediaHtml(a){
  const imgs = (a.media?.images || [])
    .map(url => `
      <div class="media__img">
        <img src="${escapeAttr(url)}" alt="" loading="lazy" />
      </div>
    `).join("");

  const videoUrl = a.media?.video || "";
  const video = videoUrl ? renderVideoEmbed(videoUrl) : "";

  if(!imgs && !video) return "";
  return `<div class="media">${imgs}${video}</div>`;
}

function renderVideoEmbed(url){
  // YouTube
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]{6,})/);
  if(yt){
    const id = yt[1];
    return `
      <div class="media__video">
        <iframe
          src="https://www.youtube-nocookie.com/embed/${id}"
          title="YouTube video"
          frameborder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowfullscreen></iframe>
      </div>`;
  }

  // mp4直リンク
  if(url.toLowerCase().endsWith(".mp4")){
    return `
      <div class="media__video">
        <video controls playsinline preload="metadata" src="${escapeAttr(url)}"></video>
      </div>`;
  }

  // それ以外はリンク表示
  return `<div class="media__link"><a href="${escapeAttr(url)}" target="_blank" rel="noopener">動画を開く</a></div>`;
}

  const cta = $("#cta");
  if(a.cta && a.cta.url){
    cta.style.display = "flex";
    $("#ctaText").textContent = a.cta.text || "リンク";
    $("#ctaBtn").href = a.cta.url;
  }else{
    cta.style.display = "none";
  }
  renderSaveBtn();
}

function closeDrawer(){
  state.drawerOpen = false;
  state.activeArticleId = null;
  $("#drawer").classList.remove("drawer--open");
  $("#drawer").setAttribute("aria-hidden","true");
}

function renderSaveBtn(){
  const id = state.activeArticleId;
  const btn = $("#btnSave");
  if(!id) return;
  const saved = isSaved(id);
  btn.style.opacity = saved ? "1" : "0.8";
  btn.title = saved ? "Saved" : "Save";
}

// ===== Saved =====
function renderSaved(){
  const saved = loadSaved();
  const list = saved
    .map(id => allArticles().find(a => a.id === id))
    .filter(Boolean)
    .sort((a,b)=> (a.date < b.date ? 1 : -1));

  const cards = $("#savedCards");
  const empty = $("#savedEmpty");

  if(list.length === 0){
    cards.innerHTML = "";
    empty.style.display = "block";
    return;
  }
  empty.style.display = "none";

cards.innerHTML = list.map(a => {
  const pills = (a.tags||[]).map(t => `<span class="pill">${escapeHtml(t)}</span>`).join("");

  const thumb = (a.media?.images && a.media.images.length) ? a.media.images[0] : "";
  const mediaHtml = thumb
    ? `<div class="card__media"><img src="${escapeAttr(thumb)}" alt="" loading="lazy"></div>`
    : ``;

  return `
    <article class="card" data-article="${escapeAttr(a.id)}">
      ${mediaHtml}
      <div class="card__content">
        <div class="card__top">
          <span class="badge" data-tone="${escapeAttr(a.tone||"accent")}">
            <span class="badge__dot"></span>
            <span>${escapeHtml(a.badge||"Info")}</span>
          </span>
          <div class="card__date">${formatDateJP(a.date)}</div>
        </div>

        <div class="card__title">${escapeHtml(a.title||"")}</div>
        <div class="card__desc">${escapeHtml(a.desc||"")}</div>
        <div class="card__meta">${pills}</div>
      </div>
    </article>
  `;
}).join("");

  $$(".card", cards).forEach(el => {
    el.addEventListener("click", () => openDrawer(el.dataset.article));
  });
}

// ===== Contact =====
function renderContact(){
  const root = document.getElementById("ownerList");
  if(!root) return;

  root.innerHTML = OWNERS.map(o => `
    <div class="owner-card">
      <div class="owner-name">${o.name}</div>
      <div class="owner-links">
        ${o.instagram ? `<a href="${o.instagram}" target="_blank">Instagram</a>` : ""}
        ${o.x ? `<a href="${o.x}" target="_blank">X</a>` : ""}
      </div>
    </div>
  `).join("");
}

// ===== Navigation =====
function setActivePage(key){
  const user = getCurrentUser();

  if (key === "admin" && (!user || user.role !== "admin")) {
    key = "home";
  }

  $$(".page").forEach(p => p.classList.remove("page--active"));
  const page = $(`.page[data-page="${key}"]`);
  if(page) page.classList.add("page--active");

  $$(".navitem").forEach(b => b.classList.remove("navitem--active"));
  const nav = $(`.navitem[data-nav="${key}"]`);
  if(nav) nav.classList.add("navitem--active");

  if(key === "saved") renderSaved();
  if(key === "contact") renderContact();
  if(key === "schedule") renderCalendar();
  if(key === "admin") renderAdmin();
}

// ===== Schedule =====
function scheduleItems(){
  return allArticles()
    .filter(a => a.channel === "event")
    .map(a => ({
      id: a.id,
      title: a.title || "",
      date: normalizeDateForCalendar(a.date),
      time: "",
      tone: a.tone || "good",
      label: a.badge || "イベント",
      desc: a.desc || ""
    }))
    .filter(it => !!it.date)
    .sort((a,b) => (a.date < b.date ? -1 : 1));
}

function normalizeDateForCalendar(value){
  if(!value) return "";

  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  if (typeof value === "string" && /^\d{4}\/\d{1,2}\/\d{1,2}$/.test(value)) {
    const [y, m, d] = value.split("/");
    return `${y}-${String(m).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
  }

  const dt = new Date(value);
  if (!isNaN(dt.getTime())) {
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, "0");
    const d = String(dt.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  return "";
}

function renderLegend(){
  const legend = $("#calLegend");
  const tones = [
    { tone:"good", label:"イベント" },
    { tone:"warn", label:"締切" },
    { tone:"accent", label:"運営" },
    { tone:"danger", label:"重要" },
  ];
  legend.innerHTML = tones.map(t => `
    <div class="leg">
      <span class="leg__dot" style="background:${toneColor(t.tone)}"></span>
      <span>${t.label}</span>
    </div>
  `).join("");
}

function addDays(date, n){
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function startOfWeek(date){
  const d = new Date(date);
  const dow = d.getDay(); // 0=Sun
  d.setHours(0,0,0,0);
  d.setDate(d.getDate() - dow);
  return d;
}

function buildRangeDays(view, cursor){
  // cursor: Date
  const base = cursor ? new Date(cursor) : new Date();
  base.setHours(0,0,0,0);

  if(view === "month"){
    const y = base.getFullYear();
    const m = base.getMonth();
    // 月表示は “月の全日 + 前後埋め” を42マスで作る（見栄え安定）
    return buildMonthMatrix(y, m);
  }

  // 2w / 1w は週始まりから並べる
  const start = startOfWeek(base);
  const len = (view === "2w") ? 14 : 7;
  const days = [];
  for(let i=0;i<len;i++) days.push(addDays(start, i));
  return days;
}

function buildMonthMatrix(year, month){
  const first = new Date(year, month, 1);
  const startDow = first.getDay();
  const start = new Date(year, month, 1 - startDow);
  const days = [];
  for(let i=0;i<42;i++){
    const d = new Date(start);
    d.setDate(start.getDate()+i);
    days.push(d);
  }
  return days;
}

function eventsByDate(){
  const map = new Map();
  for(const it of scheduleItems()){
    if(!map.has(it.date)) map.set(it.date, []);
    map.get(it.date).push(it);
  }
  return map;
}

function openEventModal(dateStr, events){
  console.log("openEventModal fired", dateStr, events);

  const modal = $("#eventModal");
  const title = $("#eventModalTitle");
  const body = $("#eventModalBody");

  console.log("modal parts", modal, title, body);

  if(!modal || !title || !body) return;

  title.textContent = `${formatDateJP(dateStr)} のイベント`;

  body.innerHTML = events.map(ev => `
    <div class="eventdetail">
      <div class="eventdetail__date">${formatDateJP(ev.date)}</div>
      <div class="eventdetail__name">${escapeHtml(ev.title || "")}</div>
      <div class="eventdetail__desc">${escapeHtml(ev.desc || "")}</div>
      <div class="eventdetail__meta">${escapeHtml(ev.label || "イベント")}</div>
    </div>
  `).join("");

  modal.classList.add("eventmodal--open");
  modal.setAttribute("aria-hidden", "false");
}

function closeEventModal(){
  const modal = $("#eventModal");
  if(!modal) return;
  modal.classList.remove("eventmodal--open");
  modal.setAttribute("aria-hidden", "true");
}

function renderCalendar(){
  const calRoot = $("#cal");
  if(!calRoot) return;

  const now = new Date();
  if(!state.scheduleCursor){
    state.scheduleCursor = new Date(now);
    state.scheduleCursor.setHours(0,0,0,0);
  }
  if(!state.scheduleView) state.scheduleView = "month";

  const cursor = new Date(state.scheduleCursor);
  const map = eventsByDate();
  const days = buildRangeDays(state.scheduleView, cursor);

  let title = "";
  if(state.scheduleView === "month"){
    title = `${cursor.getFullYear()}年 ${String(cursor.getMonth()+1).padStart(2,"0")}月`;
  } else {
    const start = days[0];
    const end = days[days.length - 1];
    title = `${formatDateJP(ymd(start))} 〜 ${formatDateJP(ymd(end))}`;
  }

  const head = `
    <div class="cal__head">
      <div class="cal__left">
        <button class="cal__nav" id="calPrev" type="button" aria-label="前へ">‹</button>
        <button class="cal__nav" id="calToday" type="button">
          ${state.scheduleView === "month" ? "今月" : "今週"}
        </button>
        <button class="cal__nav" id="calNext" type="button" aria-label="次へ">›</button>
        <div class="cal__month" id="calMonth">${title}</div>
      </div>
    </div>
  `;

  let gridHtml = "";

  if(state.scheduleView === "month"){
    const dows = ["日","月","火","水","木","金","土"];
    const currentYear = cursor.getFullYear();
    const currentMonth = cursor.getMonth();

    const dowRow = dows.map(w => `<div class="cal__cell cal__dow">${w}</div>`).join("");

    const cells = days.map(d => {
      const dateStr = ymd(d);
      const inMonth = (d.getFullYear() === currentYear && d.getMonth() === currentMonth);
      const outCls = !inMonth ? " is-out" : "";
      const evs = (map.get(dateStr) || []).slice(0, 2);

      const evHtml = evs.map(ev => `
        <button class="cal__ev" type="button" data-event-date="${dateStr}">
          <span class="cal__evtitle">${escapeHtml(ev.title || "")}</span>
          <span class="cal__evdesc">${escapeHtml(ev.desc || "")}</span>
        </button>
      `).join("");

      return `
        <div class="cal__cell${outCls}">
          <div class="cal__daynum">${d.getDate()}</div>
          ${evHtml}
        </div>
      `;
    }).join("");

    gridHtml = `
      <div class="cal__grid" id="calGrid">
        ${dowRow}
        ${cells}
      </div>
    `;
  } else {
    gridHtml = `
      <div class="cal2w" id="calGrid">
        ${days.map(d => {
          const dateStr = ymd(d);
          const evs = map.get(dateStr) || [];
          const dow = ["日","月","火","水","木","金","土"][d.getDay()];

          return `
            <div class="cal2w__day">
              <div class="cal2w__head">
                <div class="cal2w__date">${formatDateJP(dateStr)}</div>
                <div class="cal2w__dow">${dow}</div>
              </div>
              <div class="cal2w__body">
                ${evs.length ? evs.map(ev => `
                  <button class="cal2w__event" type="button" data-event-date="${dateStr}">
                    <div class="cal2w__eventTitle">${escapeHtml(ev.title || "")}</div>
                    <div class="cal2w__eventDesc">${escapeHtml(ev.desc || "")}</div>
                  </button>
                `).join("") : `<div class="cal2w__empty">イベントなし</div>`}
              </div>
            </div>
          `;
        }).join("")}
      </div>
    `;
  }

  calRoot.innerHTML = `
    ${head}
    ${gridHtml}
  `;

  // イベント詳細ポップアップ
  $$(".cal__ev, .cal2w__event", calRoot).forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();

      const dateStr = btn.dataset.eventDate;
      const events = map.get(dateStr) || [];
      openEventModal(dateStr, events);
    });
  });

  // 前後移動
  const prevBtn = $("#calPrev", calRoot);
  const nextBtn = $("#calNext", calRoot);
  const todayBtn = $("#calToday", calRoot);

  if (prevBtn) {
    prevBtn.addEventListener("click", () => {
      const c = new Date(state.scheduleCursor || new Date());
      if (state.scheduleView === "month") {
        c.setMonth(c.getMonth() - 1);
      } else {
        c.setDate(c.getDate() - 14);
      }
      state.scheduleCursor = c;
      renderCalendar();
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener("click", () => {
      const c = new Date(state.scheduleCursor || new Date());
      if (state.scheduleView === "month") {
        c.setMonth(c.getMonth() + 1);
      } else {
        c.setDate(c.getDate() + 14);
      }
      state.scheduleCursor = c;
      renderCalendar();
    });
  }

  if (todayBtn) {
    todayBtn.addEventListener("click", () => {
      state.scheduleCursor = new Date();
      state.scheduleCursor.setHours(0,0,0,0);
      renderCalendar();
    });
  }

  // 表示切替ボタンの見た目更新（外側のsegを使う）
  const schedViewSeg = $("#schedViewSeg");
  if (schedViewSeg) {
    $$(".seg__btn", schedViewSeg).forEach(btn => {
      btn.classList.toggle("seg__btn--active", btn.dataset.view === state.scheduleView);
    });
  }
}
// ===== Admin: list / editor =====
function adminArticles(){
  return loadPosts().slice().sort((a,b)=> (a.date < b.date ? 1 : -1));
}

function renderAdmin(){
  const adminCount = $("#adminCount");
  const list = $("#adminItems");

  if(!adminCount || !list) return;

  const items = adminArticles();
  adminCount.textContent = `${items.length}件`;

  if(items.length === 0){
    list.innerHTML = `
      <div class="empty">
        <div class="empty__icon">✍️</div>
        <div class="empty__title">まだ記事がありません</div>
        <div class="empty__text">「＋ 新規記事」から作成できます。</div>
      </div>
    `;
  }else{
    list.innerHTML = items.map(a => `
      <div class="aitem" data-eid="${escapeAttr(a.id)}">
        <div class="aitem__top">
          <div class="aitem__title">${escapeHtml(a.title)}</div>
          <div class="aitem__date">${formatDateJP(a.date)}</div>
        </div>
        <div class="aitem__sub">#${escapeHtml(channelLabel(a.channel))} / ${escapeHtml(a.badge || "")}</div>
      </div>
    `).join("");

    $$(".aitem", list).forEach(el=>{
      el.addEventListener("click", ()=>{
        const id = el.dataset.eid;
        startEdit(id);
      });
    });
  }

  syncAdminButtons();
}

function clearEditor(){
  state.editingId = null;
  $("#postForm").reset();
  $("#pDate").value = todayYMD();
  $("#pChannel").value = "announce";
  $("#pTone").value = "accent";
  $("#pDesc").value = "";
  $("#pTags").value = "";
  $("#pSummary").value = "";
  $("#pBody").value = "";
  $("#pCtaText").value = "";
  $("#pCtaUrl").value = "";
  $("#pImages").value = "";
  $("#pVideo").value = "";
  syncAdminButtons();
}

function startEdit(id){
  const posts = loadPosts();
  const a = posts.find(x=>x.id===id);
  if(!a) return;

  state.editingId = a.id;

  $("#pTitle").value = a.title || "";
  $("#pDate").value = a.date || todayYMD();
  $("#pChannel").value = a.channel || "announce";
  $("#pTone").value = a.tone || "accent";
  $("#pDesc").value = a.desc || "";
  $("#pTags").value = (a.tags||[]).join(",");
  $("#pSummary").value = (a.summary||[]).join("\n");
  $("#pBody").value = (a.body||[]).join("\n\n");
  $("#pCtaText").value = a.cta?.text || "";
  $("#pCtaUrl").value = a.cta?.url || "";
  $("#pImages").value = (a.media?.images || []).join("\n");
  $("#pVideo").value = a.media?.video || "";
  syncAdminButtons();
}

function syncAdminButtons(){
  const btnSave = $("#btnSavePost");
  const btnDelete = $("#btnDeletePost");
  const titleInput = $("#pTitle");

  if(!btnSave || !btnDelete) return;

  const has = !!state.editingId || ((titleInput?.value || "").trim().length > 0);
  btnSave.disabled = !has;
  btnDelete.disabled = !state.editingId;
}

function collectForm(){
  const title = $("#pTitle").value.trim();
  const date = $("#pDate").value;
  const channel = $("#pChannel").value;
  const tone = $("#pTone").value;
  const desc = $("#pDesc").value.trim();
  const tags = $("#pTags").value.split(",").map(s=>s.trim()).filter(Boolean);
  const summary = $("#pSummary").value.split("\n").map(s=>s.trim()).filter(Boolean);
  const body = $("#pBody").value
    .split("\n\n")
    .map(s=>s.trim())
    .filter(Boolean);

  const ctaText = $("#pCtaText").value.trim();
  const ctaUrl = $("#pCtaUrl").value.trim();

  // ★ここを追加（画像URLと動画URLを読む）
  const images = ($("#pImages").value || "")
    .split("\n").map(s=>s.trim()).filter(Boolean);
  const video = ($("#pVideo").value || "").trim();

  const a = normalizePost({
    id: state.editingId || undefined,
    channel,
    tone,
    badge: badgeTextFromChannel(channel),
    date,
    title,
    desc,
    tags,
    summary,
    body,
    cta: ctaUrl ? { text: ctaText || "開く", url: ctaUrl } : null,

    // ★ここを追加（a の中に media を入れる）
    media: { images, video }
  });

  return a;
}

async function saveEditor(){
  const a = collectForm();
  if(!a.title || !a.date){
    alert("タイトルと日付は必須です。");
    return;
  }

  const btnSave = $("#btnSavePost");
  const oldText = btnSave ? btnSave.textContent : "";

  try {
    if (btnSave) {
      btnSave.disabled = true;
      btnSave.textContent = "保存中...";
    }

    const saved = await savePostToApi(a);

    const normalized = normalizePost({
      id: saved.id,
      channel: saved.channel,
      tone: saved.tone,
      badge: saved.badge,
      date: saved.date,
      title: saved.title,
      desc: saved.desc,
      tags: saved.tags || [],
      summary: saved.summary || [],
      body: saved.body || [],
      cta: saved.ctaUrl ? {
        text: saved.ctaText || "開く",
        url: saved.ctaUrl
      } : null,
      media: {
        images: saved.images || [],
        video: saved.video || ""
      }
    });

    // cloudPosts を即更新
    const cidx = cloudPosts.findIndex(x => x.id === normalized.id);
    if(cidx >= 0) cloudPosts[cidx] = normalized;
    else cloudPosts.unshift(normalized);

    // localStorage も更新
    const posts = loadPosts();
    const lidx = posts.findIndex(x => x.id === normalized.id);
    if(lidx >= 0) posts[lidx] = normalized;
    else posts.unshift(normalized);
    savePosts(posts);

    // 先に画面反映
    renderAdmin();
    renderFeed();
    renderSaved();
    if ($(`.page[data-page="schedule"]`)?.classList.contains("page--active")) {
      renderCalendar();
    }

    state.editingId = normalized.id;
    syncAdminButtons();

    if (btnSave) {
      btnSave.textContent = "保存済み";
    }

    setTimeout(() => {
      if (btnSave) btnSave.textContent = oldText || "保存";
    }, 1000);

    // 裏で再同期
    fetchPostsFromApi()
      .then(posts => {
        cloudPosts = posts;
        renderAdmin();
        renderFeed();
        renderSaved();
        if ($(`.page[data-page="schedule"]`)?.classList.contains("page--active")) {
          renderCalendar();
        }
      })
      .catch(err => {
        console.warn("Cloud resync failed:", err);
      });

  } catch (err) {
    console.error(err);
    alert("保存に失敗しました。\n" + (err.message || err));
  } finally {
    if (btnSave) {
      btnSave.disabled = false;
      if (btnSave.textContent === "保存中...") {
        btnSave.textContent = oldText || "保存";
      }
    }
  }
}

function deleteEditor(){
  if(!state.editingId) return;
  const ok = confirm("この記事を削除しますか？");
  if(!ok) return;

  const posts = loadPosts().filter(x=>x.id !== state.editingId);
  savePosts(posts);

  // remove from saved if saved
  const saved = loadSaved().filter(id => id !== state.editingId);
  saveSaved(saved);

  clearEditor();
  renderAdmin();
  renderFeed();
  renderSaved();

  alert("削除しました。");
}

// ===== Export / Import =====
function buildExportObject(){
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    posts: loadPosts(),
    schedule: SCHEDULE, // optional (sample only)
  };
}
function downloadJson(obj, filename="community-news-export.json"){
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type:"application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
function importJsonFile(file){
  return new Promise((resolve,reject)=>{
    const r = new FileReader();
    r.onload = () => {
      try {
        const data = JSON.parse(String(r.result||"{}"));
        resolve(data);
      } catch (e) { reject(e); }
    };
    r.onerror = reject;
    r.readAsText(file);
  });
}

// ===== Bindings =====
function bind(){
  // helper
  const on = (sel, ev, fn, root=document) => {
    const el = root.querySelector(sel);
    if(!el) return null;
    el.addEventListener(ev, fn);
    return el;
  };

  // Event modal
  on("#eventModalScrim", "click", closeEventModal);
  on("#eventModalClose", "click", closeEventModal);

  // search
  on("#q", "input", (e) => {
    state.query = e.target.value;
    renderFeed();
  });

  on("#btnClear", "click", () => {
    const q = $("#q");
    if(q) q.value = "";
    state.query = "";
    renderFeed();
  });

  // nav
  const navRoot = document.querySelector(".bottomnav");
  if(navRoot){
    navRoot.addEventListener("click", (e) => {
      const btn = e.target.closest(".navitem");
      if(!btn) return;
      const key = btn.dataset.nav;
      if(!key) return;
      setActivePage(key);
    });
  }

  // schedule view switch
  const schedViewSeg = $("#schedViewSeg");
  if (schedViewSeg) {
    schedViewSeg.addEventListener("click", (e) => {
      const btn = e.target.closest(".seg__btn");
      if (!btn) return;

      const view = btn.dataset.view;
      if (!view) return;

      state.scheduleView = view;

      if (view === "2w") {
        state.scheduleCursor = new Date();
        state.scheduleCursor.setHours(0,0,0,0);
      }

      if (view === "month" && !state.scheduleCursor) {
        state.scheduleCursor = new Date();
        state.scheduleCursor.setHours(0,0,0,0);
      }

      renderCalendar();
    });
  }

  // drawer
  on("#drawerScrim", "click", closeDrawer);
  on("#btnClose", "click", closeDrawer);

  on("#btnSave", "click", () => {
    const id = state.activeArticleId;
    if(!id) return;
    const arr = loadSaved();
    const idx = arr.indexOf(id);
    if(idx >= 0) arr.splice(idx, 1);
    else arr.push(id);
    saveSaved(arr);
    renderSaveBtn();
  });

  // admin
  on("#btnNewPost", "click", () => {
    clearEditor();
    const pDate = $("#pDate");
    if(pDate) pDate.value = todayYMD();
    syncAdminButtons();
  });

  on("#btnSavePost", "click", (e) => {
    e.preventDefault();
    saveEditor();
  });

  on("#btnDeletePost", "click", (e) => {
    e.preventDefault();
    deleteEditor();
  });

  ["pTitle","pDate","pChannel","pTone","pDesc","pTags","pSummary","pBody","pCtaText","pCtaUrl"].forEach(id=>{
    const el = document.getElementById(id);
    if(!el) return;
    el.addEventListener("input", syncAdminButtons);
    el.addEventListener("change", syncAdminButtons);
  });

  on("#btnExport", "click", () => {
    const obj = buildExportObject();
    downloadJson(obj, `community-news-export-${Date.now()}.json`);
  });

  // contact
  const contactForm = document.getElementById("contactForm");
  if(contactForm){
    contactForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const name = ($("#cName")?.value || "").trim();
      const email = ($("#cEmail")?.value || "").trim();
      const message = ($("#cMessage")?.value || "").trim();

      if (!name || !email || !message) {
        alert("お名前・メールアドレス・お問い合わせ内容を入力してください。");
        return;
      }

      try {
        await saveContactToApi({ name, email, message });
        alert("送信ありがとうございます。");
        contactForm.reset();
      } catch (err) {
        console.error(err);
        alert("送信に失敗しました。\n" + (err.message || err));
      }
    });
  }

  // login / register switch
  const showRegisterBtn = $("#showRegisterBtn");
  const showLoginBtn = $("#showLoginBtn");
  const loginForm = $("#loginForm");
  const registerForm = $("#registerForm");
  const loginMsg = $("#loginMsg");

  if (showRegisterBtn) {
    showRegisterBtn.addEventListener("click", () => {
      if (loginForm) loginForm.style.display = "none";
      if (registerForm) registerForm.style.display = "grid";
      showRegisterBtn.style.display = "none";
      if (showLoginBtn) showLoginBtn.style.display = "inline-block";
      if (loginMsg) loginMsg.textContent = "";
    });
  }

  if (showLoginBtn) {
    showLoginBtn.addEventListener("click", () => {
      if (loginForm) loginForm.style.display = "grid";
      if (registerForm) registerForm.style.display = "none";
      if (showRegisterBtn) showRegisterBtn.style.display = "inline-block";
      showLoginBtn.style.display = "none";
      if (loginMsg) loginMsg.textContent = "";
    });
  }

  // login
  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const email = ($("#loginEmail")?.value || "").trim();
      const password = ($("#loginPassword")?.value || "").trim();
      const msg = $("#loginMsg");
      const btn = $("#loginBtn");

      if (msg) msg.textContent = "";

      if (!email || !password) {
        if (msg) msg.textContent = "メールアドレスとパスワードを入力してください。";
        return;
      }

      const oldText = btn ? btn.textContent : "";

      try {
        if (btn) {
          btn.disabled = true;
          btn.textContent = "ログイン中...";
        }

const user = await loginToApi(email, password);
console.log("login success user =", user);

saveCurrentUser(user);
applyAuthUI();

// ここで hidden 切替後の状態確認
console.log("authGate hidden =", document.getElementById("authGate")?.hidden);
console.log("appRoot hidden =", document.getElementById("appRoot")?.hidden);

setActivePage("home");

try { renderChips(); } catch (e) { console.error("renderChips error:", e); }
try { renderFeed(); } catch (e) { console.error("renderFeed error:", e); }
try { renderContact(); } catch (e) { console.error("renderContact error:", e); }
try { renderAdmin(); } catch (e) { console.error("renderAdmin error:", e); }

fetchPostsFromApi()
  .then(posts => {
    cloudPosts = posts;
    renderFeed();
    renderSaved();
    renderAdmin();
  })
  .catch(err => {
    console.error("Failed to load posts from GAS:", err);
  });

if (msg) msg.textContent = "";
      } catch (err) {
        console.error(err);
        if (msg) msg.textContent = err.message || "ログインに失敗しました。";
      } finally {
        if (btn) {
          btn.disabled = false;
          btn.textContent = oldText || "ログイン";
        }
      }
    });
  }

  // register
  if (registerForm) {
    registerForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const name = ($("#registerName")?.value || "").trim();
      const email = ($("#registerEmail")?.value || "").trim();
      const password = ($("#registerPassword")?.value || "").trim();
      const msg = $("#loginMsg");
      const btn = $("#registerBtn");

      if (msg) msg.textContent = "";

      if (!name || !email || !password) {
        if (msg) msg.textContent = "お名前・メールアドレス・パスワードを入力してください。";
        return;
      }

      const oldText = btn ? btn.textContent : "";

      try {
        if (btn) {
          btn.disabled = true;
          btn.textContent = "登録中...";
        }

        await registerToApi(name, email, password);

        if (msg) msg.textContent = "登録が完了しました。ログインしてください。";
        registerForm.reset();

        if (loginForm) loginForm.style.display = "grid";
        registerForm.style.display = "none";
        if (showRegisterBtn) showRegisterBtn.style.display = "inline-block";
        if (showLoginBtn) showLoginBtn.style.display = "none";

        const loginEmail = $("#loginEmail");
        if (loginEmail) loginEmail.value = email;

      } catch (err) {
        console.error(err);
        if (msg) msg.textContent = err.message || "新規登録に失敗しました。";
      } finally {
        if (btn) {
          btn.disabled = false;
          btn.textContent = oldText || "新規登録";
        }
      }
    });
  }

   const pImageFiles = document.getElementById("pImageFiles");
if (pImageFiles) {
  pImageFiles.addEventListener("change", async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const textarea = document.getElementById("pImages");
    if (!textarea) return;

    try {
      const uploadedUrls = [];

      for (const file of files) {
        const url = await uploadImageToApi(file);
        uploadedUrls.push(url);
      }

      const current = textarea.value.trim();
      textarea.value = [current, ...uploadedUrls].filter(Boolean).join("\n");
    } catch (err) {
      console.error(err);
      alert("画像アップロードに失敗しました。\n" + (err.message || err));
    } finally {
      pImageFiles.value = "";
    }
  });
}

  // logout
  on("#btnLogout", "click", () => {
    clearCurrentUser();
    applyAuthUI();

    const loginEmail = $("#loginEmail");
    const loginPassword = $("#loginPassword");
    const loginMsg = $("#loginMsg");

    if (loginEmail) loginEmail.value = "";
    if (loginPassword) loginPassword.value = "";
    if (loginMsg) loginMsg.textContent = "";

    setTimeout(() => {
      if (loginEmail) loginEmail.focus();
    }, 50);
  });

  on("#btnHelp", "click", () => {
    alert(
`Adminタブで記事を投稿・編集できます。
次の段階：
・コミュ限定ログイン
・権限制御
・記事データをスプレッドシート/Firestoreに移行`
    );
  });
}

async function testLoginApi() {
  const base = window.APP_CONFIG?.GAS_API_URL;
  if (!base) {
    console.log("GAS_API_URL is not set");
    return;
  }

  const res = await fetch(base, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain;charset=utf-8"
    },
    body: JSON.stringify({
      action: "login",
      email: "yourmail@example.com",
      password: "1234"
    })
  });

  const data = await res.json();
  console.log("login result:", data);
}

// ===== Init =====
async function init(){
  bind();

  if($("#pDate")) $("#pDate").value = todayYMD();

  applyAuthUI();

  if (!getCurrentUser()) {
    return;
  }

  setActivePage("home");

  try { renderChips(); } catch (e) { console.error("renderChips error:", e); }
  try { renderFeed(); } catch (e) { console.error("renderFeed error:", e); }
  try { renderContact(); } catch (e) { console.error("renderContact error:", e); }
  try { renderAdmin(); } catch (e) { console.error("renderAdmin error:", e); }

  fetchPostsFromApi()
    .then(posts => {
      cloudPosts = posts;
      renderFeed();
      renderSaved();
      renderAdmin();

      if ($(`.page[data-page="schedule"]`)?.classList.contains("page--active")) {
        renderCalendar();
      }
    })
    .catch(err => {
      console.error("Failed to load posts from GAS:", err);
    });
}
init();
