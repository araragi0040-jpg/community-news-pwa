const test=require("node:test");
const assert=require("node:assert/strict");
const vm=require("node:vm");
const fs=require("node:fs");
const path=require("node:path");
const testedSource=process.env.ANALYTICS_APP_PATH || path.join(__dirname,"../app.js");
const storagePrefix=path.basename(path.dirname(testedSource)) === "demo" ? "community_news_demo_" : "community_news_";
const testUserKey=storagePrefix+"user_v1", testTokenKey=storagePrefix+"token_v1";

function client() {
  let now=new Date("2026-10-17T03:00:00Z").getTime();
  class Clock extends Date { constructor(...args){super(...(args.length?args:[now]));}static now(){return now;} }
  const storage=new Map([[testUserKey,JSON.stringify({id:"member-1",role:"member"})],[testTokenKey,"signed-token"]]);
  const requests=[],windowEvents={},documentEvents={},intervals=[];
  const context=vm.createContext({
    console,Date:Clock,Intl,URLSearchParams,URL,
    document:{hidden:false,readyState:"loading",addEventListener(type,fn){(documentEvents[type] ||= []).push(fn);},querySelector(){return null;},querySelectorAll(){return [];}},
    navigator:{onLine:true},
    window:{APP_CONFIG:{GAS_API_URL:"https://example.test/demo"},addEventListener(type,fn){(windowEvents[type] ||= []).push(fn);}},
    localStorage:{getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value),removeItem:key=>storage.delete(key)},
    setInterval(fn,ms){intervals.push({fn,ms});},setTimeout(){},clearTimeout(){},
    fetch:async(url,options)=>{requests.push(JSON.parse(options.body));return {ok:true,text:async()=>JSON.stringify({ok:true,date:context.analyticsTodayJST()})};}
  });
  const source=process.env.ANALYTICS_APP_PATH || path.join(__dirname,"../app.js");
  const thumbnailSource=path.join(path.dirname(source),"thumbnail.js");
  if(fs.existsSync(thumbnailSource)) vm.runInContext(fs.readFileSync(thumbnailSource,"utf8"),context,{filename:"thumbnail.js"});
  vm.runInContext(fs.readFileSync(source,"utf8"),context,{filename:"app.js"});
  return {context,requests,storage,windowEvents,documentEvents,intervals,setTime(value){now=new Date(value).getTime();}};
}
test("client acknowledges one visible online visit per JST day, including return across midnight",async()=>{
  const h=client(),c=h.context;
  await c.recordDailyAnalyticsVisit();await c.recordDailyAnalyticsVisit();
  assert.equal(h.requests.length,1);assert.equal(h.requests[0].action,"recordDailyVisit");assert.equal(h.requests[0].token,"signed-token");
  h.setTime("2026-10-17T15:00:01Z");await c.recordDailyAnalyticsVisit();
  assert.equal(h.requests.length,2);
  h.setTime("2026-10-18T15:00:01Z");c.navigator.onLine=false;await c.recordDailyAnalyticsVisit();assert.equal(h.requests.length,2);
  c.navigator.onLine=true;c.document.hidden=true;await c.recordDailyAnalyticsVisit();assert.equal(h.requests.length,2);
  c.document.hidden=false;await c.recordDailyAnalyticsVisit();assert.equal(h.requests.length,3);
});
test("failed visit recording is retried with a cooldown, with no offline queue",async()=>{
  const h=client(),c=h.context;
  c.fetch=async()=>{h.requests.push("failed");throw Error("offline");};
  await assert.rejects(c.recordDailyAnalyticsVisit(),/offline/);
  await c.recordDailyAnalyticsVisit();assert.equal(h.requests.length,1);
  h.setTime("2026-10-17T03:00:31Z");await assert.rejects(c.recordDailyAnalyticsVisit(),/offline/);assert.equal(h.requests.length,2);
  h.storage.delete(testTokenKey);h.setTime("2026-10-17T03:01:02Z");await c.recordDailyAnalyticsVisit();assert.equal(h.requests.length,2);
});

test("article rendering precedes a slow event request",async()=>{
  const h=client(),c=h.context,calls=[];
  let releaseEvents;
  c.refreshPostsOnly=async opts=>{assert.equal(opts.render,true);calls.push("posts rendered");};
  c.fetchEventsFromApi=()=>{calls.push("events requested");return new Promise(resolve=>{releaseEvents=resolve;});};
  c.saveCachedEvents=()=>{};
  const running=c.refreshFromCloud({silent:true});
  await new Promise(resolve=>setImmediate(resolve));
  assert.deepEqual(calls,["posts rendered","events requested"]);
  releaseEvents([]);await running;
});

test("article polling runs every 30 seconds and skips signed out users",async()=>{
  const h=client(),c=h.context,calls=[];
  c.refreshPostsOnly=async opts=>calls.push(opts);
  c.setupPostWatcher();
  const poll=h.intervals.find(timer=>timer.ms===30000);
  assert.ok(poll);poll.fn();assert.equal(calls.length,1);assert.equal(calls[0].render,true);
  h.storage.delete(testTokenKey);poll.fn();assert.equal(calls.length,1);
});

test("focus, pageshow and visibility return refresh posts with a shared throttle",()=>{
  const h=client(),c=h.context,calls=[];
  c.refreshPostsOnly=async opts=>calls.push(opts);
  c.forceCloseGachaConnectOverlay=()=>{};c.touchAnalyticsVisit=()=>{};
  h.windowEvents.focus.forEach(fn=>fn());h.windowEvents.pageshow.forEach(fn=>fn());
  assert.equal(calls.length,1);assert.equal(calls[0].skipNotify,true);
  h.setTime("2026-10-17T03:00:02Z");
  c.document.hidden=true;h.documentEvents.visibilitychange.forEach(fn=>fn());assert.equal(calls.length,1);
  c.document.hidden=false;h.documentEvents.visibilitychange.forEach(fn=>fn());assert.equal(calls.length,2);
});
