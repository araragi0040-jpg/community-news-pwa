const test=require("node:test");
const assert=require("node:assert/strict");
const {createHarness}=require("./gas-harness.cjs");
const path=require("node:path");
const U=require(process.env.ANALYTICS_UI_PATH || path.join(__dirname,"../news_records-main/analytics-ui.js"));

function seeded() {
  const h=createHarness();
  h.addSheet("users",[["id","status","role","analyticsExcluded"],["a","active","admin",""],["b","active","event_editor",""],["c","inactive","member",""],["test","active","member",true]]);
  h.addSheet("posts",[["id","title","status","tags","totalViews","uniqueViewCount","viewerUserIdsJson","date","publishedAt"],["p1","お知らせ","public","重要,運営",10,1,'["a"]',"2026-04-08","2026-04-08T10:12:57+09:00"],["p2","イベント","public","イベント",0,0,"[]","2026-09-30",""],["draft","下書き","draft","",0,0,"[]","",""]]);
  return h;
}
test("repeat visits and repeated views count differently; roles included and test users excluded",()=>{
  const h=seeded(), c=h.context;
  c.recordAnalyticsVisit({id:"a"});c.recordAnalyticsVisit({id:"a"});c.recordAnalyticsVisit({id:"b"});
  c.recordAnalyticsVisit({id:"test",analyticsExcluded:true});
  c.recordPostView("p1",{id:"a"},"open-1");c.recordPostView("p1",{id:"a"},"open-2");c.recordPostView("p1",{id:"b"},"open-3");
  const stats=c.recordPostView("p1",{id:"b"},"open-3");
  assert.equal(stats.totalViews,13);assert.equal(stats.uniqueViewCount,2);
  const r=h.report();
  assert.equal(r.summary.users,2);assert.equal(r.summary.views,3);assert.equal(r.summary.readers,2);
  const article=r.articles.find(p=>p.id==="p1");
  assert.equal(article.totalViews,13);assert.equal(article.uniqueViewCount,2);
  assert.equal(article.views,3);assert.equal(article.readers,2);assert.equal(article.publishedDate,"2026-04-08");
  assert.equal(r.summary.registeredMembers,3);assert.equal(r.summary.eligibleMembers,2);
  assert.equal(r.summary.averageDailyRate,100);
  assert.equal(r.filters.posts.some(p=>p.id==="draft"),false);
  assert.equal(JSON.stringify(r).includes('"userKey"'),false);
  assert.equal(JSON.stringify(r).includes("test-only-auth-secret"),false);
  assert.throws(()=>c.recordPostView("draft",{id:"a"},"draft-open"),/not public/);
});
test("period and weekly unique users are not the sum of daily users; missing denominator is not guessed",()=>{
  const h=seeded(),c=h.context;
  c.recordPostView("p1",{id:"a"},"day1-a");
  h.setTime("2026-10-18T03:00:00Z");
  c.recordPostView("p2",{id:"a"},"day2-a");c.recordPostView("p1",{id:"b"},"day2-b");
  h.setTime("2026-10-20T03:00:00Z");
  const r=h.report({start:"2026-10-01",end:"2026-10-20",granularity:"week"});
  assert.equal(r.start,"2026-10-17");assert.equal(r.summary.users,2);assert.equal(r.summary.readers,2);
  assert.equal(r.series[0].date,"2026-10-12");assert.equal(r.series[0].users,2);assert.equal(r.series[0].readers,2);
  assert.equal(r.series[0].views,3);assert.equal(r.daily[2].rate,null);assert.equal(r.missingMemberDays,1);
  assert.equal(r.daily[3].users,0);assert.equal(r.daily[3].rate,0);
  assert.equal(r.summary.averageDailyRate,50);
});
test("article and historical tag filters affect views only; deleted article history survives",()=>{
  const h=seeded(),c=h.context;
  c.recordPostView("p1",{id:"a"},"a");c.recordPostView("p2",{id:"b"},"b");
  h.sheets.get("posts").rows=h.sheets.get("posts").rows.filter(r=>r[0]!=="p1");
  const r=h.report({tag:"重要"});
  assert.equal(r.summary.users,2);assert.equal(r.summary.views,1);assert.equal(r.summary.readers,1);
  assert.equal(r.articles[0].title,"お知らせ");assert.equal(r.filters.tags.includes("重要"),true);
  assert.equal(r.articles[0].publishedDate,"2026-04-08");assert.equal(r.articles[0].totalViews,null);
  const empty=h.report({postId:"missing"});assert.equal(empty.summary.views,0);assert.equal(empty.summary.users,2);
});
test("historical member counts survive later growth and JST midnight starts a new day",()=>{
  const h=seeded(),c=h.context;
  h.setTime("2026-10-17T14:59:59Z");c.recordAnalyticsVisit({id:"a"});
  h.sheets.get("users").appendRow(["new","active","member",""]);
  h.setTime("2026-10-17T15:00:01Z");c.recordAnalyticsVisit({id:"a"});
  const r=h.report({start:"2026-10-17",end:"2026-10-18",granularity:"month"});
  assert.equal(r.daily[0].eligibleMembers,2);assert.equal(r.daily[1].eligibleMembers,3);
  assert.equal(r.daily[0].rate,50);assert.ok(Math.abs(r.daily[1].rate-100/3)<1e-10);
  assert.equal(r.summary.users,1);assert.equal(r.series[0].users,1);
});
test("setup is repeatable; dates and granularity validated; no artificial pre-tracking zeros",()=>{
  const h=seeded(),c=h.context;c.setupNewsAnalytics();c.setupNewsAnalytics();
  assert.equal(h.triggers.length,1);
  assert.throws(()=>h.report({start:"2026-02-30"}),/日付/);
  assert.throws(()=>h.report({start:"2026-10-18",end:"2026-10-17"}),/日付/);
  assert.throws(()=>h.report({granularity:"hour"}),/集計/);
  const r=h.report({start:"2026-01-01",end:"2026-01-02"});assert.equal(r.daily.length,0);assert.equal(r.summary.averageDailyRate,null);
});
test("analytics API rejects unauthenticated and ordinary members on the server",()=>{
  const h=seeded(),c=h.context;
  const read=token=>JSON.parse(c.doGet({parameter:{action:"analyticsReport",token}}).text);
  assert.equal(read("").code,"AUTH_REQUIRED");
  assert.equal(read("forged.token").code,"AUTH_REQUIRED");
  assert.equal(read(c.createToken("b","event_editor")).code,"FORBIDDEN");
  assert.equal(read(c.createToken("c","admin")).code,"AUTH_REQUIRED");
  // Role is resolved from the users sheet, not a forged claim in an otherwise valid token.
  assert.equal(read(c.createToken("b","admin")).code,"FORBIDDEN");
  const allowed=read(c.createToken("a","admin"));assert.equal(allowed.ok,true);assert.equal(allowed.report.summary.goal,100);
});
test("SVG and CSV safely escape user content and handle missing or single-point series",()=>{
  assert.equal(U.escape('<img onerror="alert(1)">'),"&lt;img onerror=&quot;alert(1)&quot;&gt;");
  const csv=U.csv([["=HYPERLINK(\"bad\")","\t@SUM(1)","普通のタイトル",null]]);
  assert.equal(csv.startsWith("\uFEFF"),true);assert.match(csv,/'=HYPERLINK/);assert.match(csv,/'\t@SUM/);
  const svg=U.chart([{date:"2026-10-17",start:"2026-10-17",end:"2026-10-17",users:1}], ["users"]);
  assert.match(svg,/<circle/);assert.equal(/NaN|Infinity/.test(svg),false);
  assert.match(U.chart([{rate:null}],["rate"],true),/算出できません/);
  assert.match(U.chart([], ["users"]),/計測データはありません/);
  assert.equal(U.dayOffset("2026-03-01",-1),"2026-02-28");
});

test("legacy counters include private articles before any daily views, even for a pre-tracking date range",()=>{
  const h=seeded();
  h.sheets.get("posts").appendRow(["archive","以前公開した記事","private","重要",6,6,'["a"]',"2026-07-07",""]);
  const r=h.report({start:"2026-01-01",end:"2026-01-02"});
  assert.equal(r.articleMetricsVersion,2);assert.equal(r.daily.length,0);
  assert.equal(r.summary.views,0);assert.equal(r.summary.readers,0);
  assert.deepEqual(r.articles.map(p=>[p.id,p.totalViews,p.uniqueViewCount,p.views,p.readers]),[["p1",10,1,0,0],["archive",6,6,0,0],["p2",0,0,0,0]]);
  assert.equal(r.articles.find(p=>p.id==="archive").publishedDate,"2026-07-07");
});

test("legacy unique counts are preserved when a historic viewer list is incomplete",()=>{
  const h=seeded(),c=h.context;
  h.sheets.get("posts").rows[1][5]=9;
  const known=c.recordPostView("p1",{id:"a"},"known");
  assert.equal(known.uniqueViewCount,9);
  const fresh=c.recordPostView("p1",{id:"b"},"new");
  assert.equal(fresh.uniqueViewCount,10);
  const r=h.report(),article=r.articles.find(p=>p.id==="p1");
  assert.equal(article.totalViews,12);assert.equal(article.uniqueViewCount,10);
  assert.equal(article.views,2);assert.equal(article.readers,2);
});

test("publication dates and legacy totals use headers, normalize JST, and never use updatedAt",()=>{
  const h=seeded();
  h.addSheet("posts",[["date","updatedAt","uniqueViewCount","id","publishedAt","title","totalViews","status","tags"],
    ["2026-04-08","2026-10-17 10:00:00",9,"qr","2026-04-08T10:12:57+09:00","Q/R existing totals",14,"public",""],
    ["2026-09-01","2026-10-17",0,"utc","2026-10-01T16:30:00Z","JST date",0,"public",""],
    ["2026/7/7","2026-10-17",0,"fallback","bad-date","Fallback date",0,"public",""],
    ["","2026-10-17",0,"unknown","","Unknown upload date",0,"public",""]]);
  const r=h.report();
  const qr=r.articles.find(p=>p.id==="qr");assert.equal(qr.totalViews,14);assert.equal(qr.uniqueViewCount,9);assert.equal(qr.publishedDate,"2026-04-08");
  assert.equal(r.articles.find(p=>p.id==="utc").publishedDate,"2026-10-02");
  assert.equal(r.articles.find(p=>p.id==="fallback").publishedDate,"2026-07-07");
  assert.equal(r.articles.find(p=>p.id==="unknown").publishedDate,"");
  assert.equal(h.context.analyticsPublishedDate_({publishedAt:new Date("2026-04-07T16:00:00Z")}),"2026-04-08");
});

test("view-log schema upgrade retains old history without inventing lifetime counts or upload dates",()=>{
  const h=seeded();
  const original=["old-event","2026-10-17T00:00:00Z","2026-10-17","historic-key","deleted","Deleted title",'["重要"]'];
  h.addSheet("AnalyticsViews",[["eventId","occurredAt","date","userKey","postId","title","tagsJson"],original]);
  const r=h.report({tag:"重要"});
  assert.deepEqual(h.sheets.get("AnalyticsViews").rows[1],original);
  assert.equal(h.sheets.get("AnalyticsViews").rows[0][7],"publishedDate");
  const deleted=r.articles.find(p=>p.id==="deleted");
  assert.equal(deleted.views,1);assert.equal(deleted.readers,1);
  assert.equal(deleted.totalViews,null);assert.equal(deleted.uniqueViewCount,null);assert.equal(deleted.publishedDate,"");
});

test("article sorting and CSV keep lifetime and period values separate, including unknown totals",()=>{
  const articles=[{id:"a",title:"A",publishedDate:"2026-04-08",totalViews:14,uniqueViewCount:9,views:2,readers:1},
    {id:"b",title:"B",publishedDate:"2026-07-07",totalViews:6,uniqueViewCount:6,views:3,readers:2},
    {id:"c",title:"C",publishedDate:"",totalViews:null,uniqueViewCount:null,views:5,readers:3}];
  assert.deepEqual(U.sortArticles(articles,{key:"totalViews",direction:-1}).map(p=>p.id),["a","b","c"]);
  assert.deepEqual(U.sortArticles(articles,{key:"totalViews",direction:1}).map(p=>p.id),["b","a","c"]);
  assert.deepEqual(U.sortArticles(articles,{key:"publishedDate",direction:-1}).map(p=>p.id),["b","a","c"]);
  const rows=U.articleCsvRows({start:"2026-10-17",end:"2026-10-17"},articles);
  assert.deepEqual(rows[1],["2026-10-17","2026-10-17","a","2026-04-08","A",14,9,2,1]);
  assert.equal(rows[0].length,9);assert.equal(rows[3][5],null);
  const historicRows=U.articleCsvRows({start:"2026-10-17",end:"2026-01-02",requestedStart:"2026-01-01",requestedEnd:"2026-01-02"},articles);
  assert.deepEqual(historicRows[1].slice(0,2),["2026-01-01","2026-01-02"]);
});
