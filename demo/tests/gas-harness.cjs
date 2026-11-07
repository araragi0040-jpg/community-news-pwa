// In-memory Apps Script services for analytics integration tests. No network access.
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const crypto = require("node:crypto");

function createHarness(initialTime = "2026-10-17T03:00:00Z") {
  let now = new Date(initialTime).getTime();
  class Clock extends Date {
    constructor(...args) { super(...(args.length ? args : [now])); }
    static now() { return now; }
  }
  class Range {
    constructor(sheet, row, col, height=1, width=1) { Object.assign(this,{sheet,row,col,height,width}); }
    getValues() { return Array.from({length:this.height},(_,r) => Array.from({length:this.width},(_,c) => this.sheet.rows[this.row-1+r]?.[this.col-1+c] ?? "")); }
    setValues(values) { values.forEach((row,r) => row.forEach((value,c) => { this.sheet.rows[this.row-1+r] ||= []; this.sheet.rows[this.row-1+r][this.col-1+c] = value; })); return this; }
    setValue(value) { return this.setValues([[value]]); }
    setNumberFormat() { return this; }
  }
  class Sheet {
    constructor(name,rows=[]) { this.name=name; this.rows=rows.map(r=>r.slice()); }
    getLastRow() { return this.rows.length; }
    getLastColumn() { return Math.max(0,...this.rows.map(r=>r.length)); }
    getMaxRows() { return Math.max(1000,this.rows.length); }
    appendRow(row) { this.rows.push(row.slice()); return this; }
    getRange(...args) { return new Range(this,...args); }
    getDataRange() { return this.getRange(1,1,Math.max(1,this.getLastRow()),Math.max(1,this.getLastColumn())); }
    insertColumnAfter() { return this; }
    setFrozenRows() { return this; }
  }
  const sheets = new Map();
  const props = new Map([["AUTH_SECRET","test-only-auth-secret"]]);
  const triggers = [];
  let locked = false;
  const ss = {getSheetByName:name=>sheets.get(name)||null,insertSheet:name=>{ const s=new Sheet(name); sheets.set(name,s);return s; }};
  function formatDate(date, tz, format) {
    const parts=new Intl.DateTimeFormat("en-CA",{timeZone:tz,year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",second:"2-digit",hourCycle:"h23"}).formatToParts(date);
    const get=k=>parts.find(p=>p.type===k).value;
    const day=["year","month","day"].map(get).join("-");
    return format === "yyyy-MM-dd" ? day : day+" "+["hour","minute","second"].map(get).join(":");
  }
  const context = vm.createContext({
    console,Date:Clock,
    SpreadsheetApp:{getActiveSpreadsheet:()=>ss},
    Session:{getScriptTimeZone:()=>"Asia/Tokyo"},
    LockService:{getScriptLock:()=>({waitLock(){if(locked) throw Error("nested lock");locked=true;},releaseLock(){locked=false;}})},
    PropertiesService:{getScriptProperties:()=>({getProperty:k=>props.get(k)||null,setProperty:(k,v)=>{props.set(k,String(v));}})},
    Utilities:{formatDate,getUuid:()=>crypto.randomUUID(),computeHmacSha256Signature:(data,key)=>[...crypto.createHmac("sha256",key).update(data).digest()],base64EncodeWebSafe:bytes=>Buffer.from(bytes).toString("base64url"),base64DecodeWebSafe:value=>[...Buffer.from(value,"base64url")],newBlob:value=>({getBytes:()=>[...Buffer.from(value)],getDataAsString:()=>Buffer.from(value).toString("utf8")})},
    ScriptApp:{getProjectTriggers:()=>triggers,newTrigger:handler=>{const b={timeBased:()=>b,atHour:()=>b,nearMinute:()=>b,everyDays:()=>b,inTimezone:()=>b,create:()=>{triggers.push({getHandlerFunction:()=>handler});}};return b;}},
    ContentService:{MimeType:{JSON:"json"},createTextOutput:text=>({text,setMimeType(){return this;}})}
  });
  const source = process.env.ANALYTICS_GAS_PATH || path.join(__dirname,"../Code.gs");
  vm.runInContext(fs.readFileSync(source,"utf8"),context,{filename:"Code.gs"});
  return {
    context,sheets,props,triggers,
    setTime(value){now=new Date(value).getTime();},
    addSheet(name,rows){const s=new Sheet(name,rows);sheets.set(name,s);return s;},
    report(params={}){return JSON.parse(JSON.stringify(context.getAnalyticsReport(params)));},
    json(value){return JSON.parse(JSON.stringify(value));}
  };
}
module.exports={createHarness};
