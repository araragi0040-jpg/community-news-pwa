/* Community News Wire Sample + Schedule Tab (Calendar)
   - single-file vanilla JS
   - localStorage for saved
*/

const $ = (sel, root=document) => root.querySelector(sel);
const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));

const LS_KEY_SAVED = "community_news_saved_v1";
const LS_KEY_ONLY_IMPORTANT = "community_news_only_important_v1";
const LS_KEY_ONLY_UPCOMING = "community_news_only_upcoming_v1";

const CHANNELS = [
  { key:"all", label:"All", tone:"accent" },
  { key:"announce", label:"告知", tone:"accent" },
  { key:"event", label:"イベント", tone:"good" },
  { key:"ops", label:"運営", tone:"warn" },
  { key:"tips", label:"Tips", tone:"accent" },
];

const ARTICLES = [
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

// ==== Schedule data (sample) ====
const SCHEDULE = [
  {
    id:"s1",
    title:"オンライン交流（テスト）",
    date:"2026-02-18",
    time:"20:00",
    tone:"good",
    label:"イベント",
    desc:"30分だけ。近況共有＋次の動き確認。"
  },
  {
    id:"s2",
    title:"募集締切：参加フォーム",
    date:"2026-02-16",
    time:"23:59",
    tone:"warn",
    label:"締切",
    desc:"参加人数把握のため、期限までに入力お願いします。"
  },
  {
    id:"s3",
    title:"運営投稿：次月の方針共有",
    date:"2026-03-02",
    time:"21:00",
    tone:"accent",
    label:"運営",
    desc:"来月の動きと、改善点の共有（15分）。"
  },
  {
    id:"s4",
    title:"重要：規約更新告知",
    date:"2026-03-05",
    time:"12:00",
    tone:"danger",
    label:"重要",
    desc:"投稿ルールの追加。必読。"
  }
];

// ==== Notifications (sample) ====
const NOTIFS = [
  { id:"n1", title:"重要：明日の締切", time:"2026-02-15 19:30", important:true, text:"参加フォームの締切は 2/16 23:59 です。" },
  { id:"n2", title:"運営：新機能", time:"2026-02-12 10:05", important:false, text:"Scheduleタブを追加しました（UIサンプル）。" }
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
};

// ===== Helpers =====
function loadSaved(){
  try { return JSON.parse(localStorage.getItem(LS_KEY_SAVED) || "[]"); }
  catch { return []; }
}
function saveSaved(arr){
  localStorage.setItem(LS_KEY_SAVED, JSON.stringify(arr));
}
function isSaved(id){
  return loadSaved().includes(id);
}
function formatDateJP(iso){
  // iso: YYYY-MM-DD
  const [y,m,d] = iso.split("-").map(Number);
  return `${y}/${String(m).padStart(2,"0")}/${String(d).padStart(2,"0")}`;
}
function clamp(n, a, b){ return Math.max(a, Math.min(b, n)); }
function ymd(d){
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,"0");
  const dd = String(d.getDate()).padStart(2,"0");
  return `${y}-${m}-${dd}`;
}
function sameYMD(a,b){ return a === b; }
function todayYMD(){ return ymd(new Date()); }

function toneDot(tone){
  return `<span class="badge__dot" style="background:${toneColor(tone)}"></span>`;
}
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
  return ARTICLES
    .filter(a => state.channel === "all" ? true : a.channel === state.channel)
    .filter(a => {
      if(!q) return true;
      return (
        a.title.toLowerCase().includes(q) ||
        a.desc.toLowerCase().includes(q) ||
        (a.tags||[]).join(" ").toLowerCase().includes(q) ||
        (a.badge||"").toLowerCase().includes(q)
      );
    })
    .sort((a,b) => (a.date < b.date ? 1 : -1));
}

function renderFeed(){
  const items = filteredArticles();
  $("#feedHint").textContent = `${items.length}件`;
  $("#feedTitle").textContent = state.channel === "all"
    ? "Latest"
    : (CHANNELS.find(c=>c.key===state.channel)?.label || "Latest");

  const cards = $("#cards");
  cards.innerHTML = items.map(a => {
    const pills = (a.tags||[]).map(t => `<span class="pill">${t}</span>`).join("");
    return `
      <article class="card" data-article="${a.id}">
        <div class="card__row">
          <div class="card__thumb" aria-hidden="true"></div>
          <div class="card__body">
            <div class="card__top">
              <span class="badge" data-tone="${a.tone}">
                <span class="badge__dot"></span>
                <span>${a.badge}</span>
              </span>
              <div class="card__date">${formatDateJP(a.date)}</div>
            </div>
            <div class="card__title">${a.title}</div>
            <div class="card__desc">${a.desc}</div>
            <div class="card__meta">${pills}</div>
          </div>
        </div>
      </article>
    `;
  }).join("");

  $$(".card", cards).forEach(el => {
    el.addEventListener("click", () => openDrawer(el.dataset.article));
  });
}

// ===== Drawer =====
function openDrawer(articleId){
  const a = ARTICLES.find(x => x.id === articleId);
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

  $("#aTitle").textContent = a.title;
  $("#aMeta").textContent = `#${a.channel}  /  ${a.tags?.join("・") || "-"}`;

  const stats = $("#aStats");
  stats.innerHTML = (a.tags||[]).map(t => `<span class="pill">${t}</span>`).join("");

  const sum = $("#aSummaryList");
  sum.innerHTML = (a.summary||[]).map(x => `<li>${x}</li>`).join("");
  $("#aSummary").style.display = (a.summary && a.summary.length) ? "block" : "none";

  const body = $("#aBody");
  body.innerHTML = (a.body||[]).map(p => `<p>${p}</p>`).join("");

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
    .map(id => ARTICLES.find(a => a.id === id))
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
    const pills = (a.tags||[]).map(t => `<span class="pill">${t}</span>`).join("");
    return `
      <article class="card" data-article="${a.id}">
        <div class="card__row">
          <div class="card__thumb" aria-hidden="true"></div>
          <div class="card__body">
            <div class="card__top">
              <span class="badge" data-tone="${a.tone}">
                <span class="badge__dot"></span>
                <span>${a.badge}</span>
              </span>
              <div class="card__date">${formatDateJP(a.date)}</div>
            </div>
            <div class="card__title">${a.title}</div>
            <div class="card__desc">${a.desc}</div>
            <div class="card__meta">${pills}</div>
          </div>
        </div>
      </article>
    `;
  }).join("");

  $$(".card", cards).forEach(el => {
    el.addEventListener("click", () => openDrawer(el.dataset.article));
  });
}

// ===== Alerts =====
function renderNotifs(){
  const onlyImp = $("#onlyImportant").checked;
  const list = onlyImp ? NOTIFS.filter(n => n.important) : NOTIFS;
  const root = $("#notifs");
  root.innerHTML = list.map(n => `
    <div class="notif ${n.important ? "notif--important":""}">
      <div class="notif__top">
        <div class="notif__title">${n.title}</div>
        <div class="notif__time">${n.time}</div>
      </div>
      <div class="notif__text">${n.text}</div>
    </div>
  `).join("");
}

// ===== Navigation =====
function setActivePage(key){
  $$(".page").forEach(p => p.classList.remove("page--active"));
  const page = $(`.page[data-page="${key}"]`);
  if(page) page.classList.add("page--active");

  $$(".navitem").forEach(b => b.classList.remove("navitem--active"));
  const nav = $(`.navitem[data-nav="${key}"]`);
  if(nav) nav.classList.add("navitem--active");

  // per page refresh
  if(key === "saved") renderSaved();
  if(key === "alerts") renderNotifs();
  if(key === "schedule") renderScheduleUI();
}

// ===== Schedule: Calendar + list =====
function scheduleItems(){
  const onlyUpcoming = $("#onlyUpcoming")?.checked;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let list = [...SCHEDULE].sort((a,b)=> (a.date < b.date ? -1 : 1));
  if(onlyUpcoming){
    list = list.filter(it => {
      const d = new Date(it.date + "T00:00:00");
      return d >= today;
    });
  }
  return list;
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

function buildMonthMatrix(year, month){
  // month: 0-11
  const first = new Date(year, month, 1);
  const startDow = first.getDay(); // 0 Sun
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

function renderCalendar(){
  const calRoot = $("#cal");
  if(!calRoot) return;

  const now = new Date();
  if(state.calYear == null){
    state.calYear = now.getFullYear();
    state.calMonth = now.getMonth();
    state.selectedDate = todayYMD();
  }

  const y = state.calYear;
  const m = state.calMonth;

  const monthName = `${y}年 ${String(m+1).padStart(2,"0")}月`;

  const dows = ["日","月","火","水","木","金","土"];
  const matrix = buildMonthMatrix(y, m);
  const map = eventsByDate();

  const head = `
    <div class="cal__head">
      <div class="cal__month">${monthName}</div>
      <div class="cal__ctrl">
        <button class="cal__btn" id="calPrev" aria-label="Prev month">←</button>
        <button class="cal__btn" id="calToday" aria-label="Today">今日</button>
        <button class="cal__btn" id="calNext" aria-label="Next month">→</button>
      </div>
    </div>
  `;

  const dowRow = dows.map(d => `<div class="cal__dow">${d}</div>`).join("");

  const cells = matrix.map(d => {
    const dateStr = ymd(d);
    const inMonth = (d.getMonth() === m);
    const isToday = (dateStr === todayYMD());
    const muted = inMonth ? "" : " cal__day--muted";
    const todayCls = isToday ? " cal__day--today" : "";
    const evs = map.get(dateStr) || [];
    const dots = evs.slice(0,4).map(ev => `<span class="cal__dot" data-tone="${ev.tone}"></span>`).join("");
    return `
      <div class="cal__day${muted}${todayCls}" data-date="${dateStr}">
        <div class="cal__daynum">${d.getDate()}</div>
        <div class="cal__dots">${dots}</div>
      </div>
    `;
  }).join("");

  calRoot.innerHTML = `
    ${head}
    <div class="cal__grid">
      ${dowRow}
      ${cells}
    </div>
  `;

  $("#calPrev").onclick = () => {
    state.calMonth -= 1;
    if(state.calMonth < 0){ state.calMonth = 11; state.calYear -= 1; }
    renderCalendar();
    renderScheduleList();
  };
  $("#calNext").onclick = () => {
    state.calMonth += 1;
    if(state.calMonth > 11){ state.calMonth = 0; state.calYear += 1; }
    renderCalendar();
    renderScheduleList();
  };
  $("#calToday").onclick = () => {
    const n = new Date();
    state.calYear = n.getFullYear();
    state.calMonth = n.getMonth();
    state.selectedDate = todayYMD();
    renderCalendar();
    renderScheduleList();
  };

  $$(".cal__day", calRoot).forEach(el => {
    el.addEventListener("click", () => {
      state.selectedDate = el.dataset.date;
      renderScheduleList();
    });
  });
}

function renderScheduleList(){
  const listRoot = $("#schedList");
  if(!listRoot) return;

  const items = scheduleItems();
  const selected = state.selectedDate;

  // If selected date has events, show those first; else show upcoming list for the month
  const todays = items.filter(it => it.date === selected);
  let show = [];
  if(todays.length){
    show = todays;
  }else{
    // show month items (or upcoming)
    const y = state.calYear, m = state.calMonth;
    show = items.filter(it => {
      const d = new Date(it.date+"T00:00:00");
      return d.getFullYear() === y && d.getMonth() === m;
    });
    if(show.length === 0) show = items.slice(0, 10);
  }

  if(show.length === 0){
    listRoot.innerHTML = `
      <div class="empty">
        <div class="empty__icon">📅</div>
        <div class="empty__title">予定がありません</div>
        <div class="empty__text">この月の予定がまだ登録されていません。</div>
      </div>
    `;
    return;
  }

  listRoot.innerHTML = show.map(it => `
    <div class="sitem" data-sid="${it.id}">
      <div class="sitem__left">
        <div class="sitem__title">${it.title}</div>
        <div class="sitem__meta">${formatDateJP(it.date)} ${it.time || ""}</div>
        <div class="sitem__desc">${it.desc || ""}</div>
      </div>
      <div class="sitem__tag">
        <span class="sitem__dot" data-tone="${it.tone}"></span>
        <span>${it.label || "予定"}</span>
      </div>
    </div>
  `).join("");
}

function renderScheduleUI(){
  renderLegend();
  renderCalendar();
  renderScheduleList();
}

// ===== Bindings =====
function bind(){
  // search
  $("#q").addEventListener("input", (e) => {
    state.query = e.target.value;
    renderFeed();
  });
  $("#btnClear").addEventListener("click", () => {
    $("#q").value = "";
    state.query = "";
    renderFeed();
  });

  // nav
  $$(".navitem").forEach(btn => {
    btn.addEventListener("click", () => setActivePage(btn.dataset.nav));
  });

  // drawer controls
  $("#drawerScrim").addEventListener("click", closeDrawer);
  $("#btnClose").addEventListener("click", closeDrawer);

  $("#btnSave").addEventListener("click", () => {
    const id = state.activeArticleId;
    if(!id) return;
    const arr = loadSaved();
    const idx = arr.indexOf(id);
    if(idx >= 0) arr.splice(idx, 1);
    else arr.push(id);
    saveSaved(arr);
    renderSaveBtn();
  });

  // alerts toggle
  const imp = $("#onlyImportant");
  imp.checked = (localStorage.getItem(LS_KEY_ONLY_IMPORTANT) === "1");
  imp.addEventListener("change", () => {
    localStorage.setItem(LS_KEY_ONLY_IMPORTANT, imp.checked ? "1" : "0");
    renderNotifs();
  });

  // schedule toggle
  const upcoming = $("#onlyUpcoming");
  upcoming.checked = (localStorage.getItem(LS_KEY_ONLY_UPCOMING) === "1");
  upcoming.addEventListener("change", () => {
    localStorage.setItem(LS_KEY_ONLY_UPCOMING, upcoming.checked ? "1" : "0");
    renderScheduleUI();
  });

  // help
  $("#btnHelp").addEventListener("click", () => {
    alert("UIサンプルです。次の段階で「コミュ限定ログイン」「投稿CMS連携（スプレッドシート等）」を追加できます。");
  });
}

// ===== Init =====
function init(){
  renderChips();
  renderFeed();
  renderNotifs();
  bind();
}

init();
