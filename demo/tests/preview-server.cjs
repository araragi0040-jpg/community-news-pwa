// Local browser QA only. Synthetic data and credentials never contact Google.
// node demo/tests/preview-server.cjs
const http=require("node:http");
const fs=require("node:fs");
const path=require("node:path");
const {createHarness}=require("./gas-harness.cjs");
const U=require("../news_records-main/analytics-ui.js");
const root=path.resolve(__dirname,"../..");
const today=U.todayJST();
const h=createHarness(today+"T03:00:00Z");
const start=U.dayOffset(today,-27);
const users=[["id","status","role","analyticsExcluded"],...Array.from({length:20},(_,i)=>["synthetic-"+i,"active",i===0?"admin":"member",""])];
const postHeaders=["id","title","status","tags","totalViews","uniqueViewCount","viewerUserIdsJson","date","publishedAt"];
const historicViewers=JSON.stringify(Array.from({length:9},(_,i)=>"synthetic-"+i));
const posts=[postHeaders,["p1","10月の語り場だより：新しい仲間が増えました","public","お知らせ,コミュニティ",14,9,historicViewers,U.dayOffset(start,-7),""],["p2","今週末の交流会、気軽に参加しませんか？","public","イベント",0,0,"[]",start,""],["p3","運営ミーティングで話したこと","public","運営",0,0,"[]",U.dayOffset(start,-2),""],["p4","みんなのおすすめを集めました","public","コミュニティ",0,0,"[]",U.dayOffset(start,-1),""],["archive","以前公開したお知らせ","private","お知らせ",6,6,'["synthetic-0"]',"2026-07-07",""]];
h.addSheet("users",users);h.addSheet("posts",posts);
h.context.setupNewsAnalytics();
h.props.set("NEWS_ANALYTICS_STARTED_ON",start);
for(let d=0;d<28;d++){
  const day=U.dayOffset(start,d);h.setTime(day+"T03:00:00Z");
  h.context.snapshotAnalyticsMembers();
  const count=4+((d*7)%13);
  for(let i=0;i<count;i++)h.context.recordAnalyticsVisit({id:"synthetic-"+i});
  for(let i=0;i<8+(d*5)%22;i++)h.context.recordPostView("p"+(1+i%4),{id:"synthetic-"+(i%count)},`preview-${day}-${i}`);
}
h.setTime(today+"T03:00:00Z");
const mime={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".png":"image/png",".json":"application/json; charset=utf-8"};
const server=http.createServer(async(req,res)=>{
  const url=new URL(req.url,"http://127.0.0.1:4173");
  if(url.pathname==="/__test/config.js"){
    res.writeHead(200,{"Content-Type":mime[".js"]});res.end('window.APP_CONFIG={MODE:"demo",GAS_API_URL:"/__test/api"};');return;
  }
  if(url.pathname==="/__test/api"){
    res.setHeader("Content-Type","application/json; charset=utf-8");res.setHeader("Cache-Control","no-store");
    if(req.method==="POST"){
      let body="";for await(const chunk of req)body+=chunk;
      const data=JSON.parse(body);
      res.end(JSON.stringify(data.action==="login"&&data.email==="preview@example.test"&&data.password==="preview"?{ok:true,user:{role:"admin"},token:"local-test-admin"}:{ok:false,code:"AUTH_REQUIRED",message:"画面確認用：preview@example.test / preview"}));return;
    }
    if(url.searchParams.get("token")!=="local-test-admin"){res.end(JSON.stringify({ok:false,code:"AUTH_REQUIRED",message:"ログインしてください。"}));return;}
    try{res.end(JSON.stringify({ok:true,report:h.report(Object.fromEntries(url.searchParams))}));}catch(err){res.end(JSON.stringify({ok:false,code:err.code,message:err.message}));}return;
  }
  let decoded;try{decoded=decodeURIComponent(url.pathname);}catch(_){res.writeHead(400).end();return;}
  let target=path.resolve(root,"."+decoded);
  if(target!==root&&!target.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  if(fs.existsSync(target)&&fs.statSync(target).isDirectory())target=path.join(target,"index.html");
  if(!fs.existsSync(target)){res.writeHead(404).end("Not found");return;}
  let body=fs.readFileSync(target);
  if(target===path.join(root,"demo/news_records-main/index.html")){
    body=body.toString().replace('../config.js?v=analytics-demo-1','/__test/config.js').replace('<body>','<body><div style="background:#ffe8b9;text-align:center;padding:8px;font-size:12px">画面確認用の架空データです。実際の利用状況ではありません。</div>').replace('demoニュースの管理者アカウントでログインしてください。','画面確認用：preview@example.test ／ パスワード preview');
  }
  res.writeHead(200,{"Content-Type":mime[path.extname(target)]||"application/octet-stream","Cache-Control":"no-store"});res.end(body);
});
server.listen(Number(process.env.ANALYTICS_PREVIEW_PORT || 4173),"127.0.0.1",()=>console.log("Synthetic preview: http://127.0.0.1:"+(process.env.ANALYTICS_PREVIEW_PORT || 4173)+"/demo/news_records-main/"));
