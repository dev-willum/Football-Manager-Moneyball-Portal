// src/App.jsx — FULL FILE — PART 1/2 (PATCH)
import React, { useEffect, useCallback,useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import Papa from "papaparse";

/* ===================== Search Input ===================== */
const SearchInput = React.memo(({ className, placeholder, initialValue = "", onSearch }) => {
  const [value, setValue] = useState(initialValue);
  const inputRef = useRef(null);

  const handleChange = (e) => {
    setValue(e.target.value);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      onSearch(value);
    } else if (e.key === "Escape") {
      setValue("");
      onSearch("");
    }
  };

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  return (
    <input
      ref={inputRef}
      className={className}
      placeholder={placeholder}
      value={value}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      autoComplete="off"
    />
  );
});

/* ===================== Error Boundary ===================== */
class ErrorBoundary extends React.Component {
  constructor(props){ super(props); this.state = { err: null, info: null }; }
  componentDidCatch(err, info){ console.error(err, info); this.setState({ err, info }); }
  render(){
    if (this.state.err) {
      return (
        <div style={{padding:16}}>
          <div style={{
            background:"#2a0f12", border:"1px solid #742c34", color:"#ffd7db",
            borderRadius:12, padding:16, fontFamily:"ui-monospace, SFMono-Regular, Menlo, Consolas"
          }}>
            <div style={{fontWeight:700, marginBottom:8}}>Runtime error</div>
            <pre style={{whiteSpace:"pre-wrap"}}>{String(this.state.err?.message || this.state.err)}</pre>
            {this.state.info && <pre style={{whiteSpace:"pre-wrap", opacity:.8}}>{String(this.state.info?.componentStack || "")}</pre>}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}


const THEMES = {
  sleek: { bg:"#0b1220", ink:"#e8eaed", muted:"#9aa7c2", card:"rgba(12,18,32,0.72)", cardBorder:"#1e2a45", chip:"#0f1a2f", chipActive:"#4ea1ff", accent:"#7aa2ff", accent2:"#00c2a8", axisInk:"#c7d2fe", quadFill:"rgba(122,162,255,0.10)", ring:"#32406b" },
  dusk:  { bg:"#0e1224", ink:"#f1f4f9", muted:"#a9b5cf", card:"rgba(18,22,40,0.74)", cardBorder:"#263154", chip:"#141b33", chipActive:"#7aa2ff", accent:"#9bb6ff", accent2:"#ff7d8a", axisInk:"#d6e0ff", quadFill:"rgba(155,182,255,0.10)", ring:"#3a4a7d" },
  light: { bg:"#f6f8ff", ink:"#0f172a", muted:"#5b6b8c", card:"#ffffffd6", cardBorder:"#e4ecff", chip:"#eef3ff", chipActive:"#4ea1ff", accent:"#4ea1ff", accent2:"#ff3b5c", axisInk:"#1d2a4b", quadFill:"rgba(78,161,255,0.08)", ring:"#cdd8ff" },
};

const POS14 = ["GK","D (R)","D (C)","D (L)","WB (R)","WB (L)","DM","M (R)","M (C)","M (L)","AM (R)","AM (C)","AM (L)","ST (C)"];
const POS_COLORS = {
  "GK":"#a3e1ff","D (R)":"#86b4ff","D (C)":"#5b8dff","D (L)":"#86b4ff",
  "WB (R)":"#8ed1b3","WB (L)":"#8ed1b3","DM":"#f0b86e",
  "M (R)":"#b7a8ff","M (C)":"#9e84ff","M (L)":"#b7a8ff",
  "AM (R)":"#ffb3cf","AM (C)":"#ff83ad","AM (L)":"#ffb3cf","ST (C)":"#ff8d7a"
};
const POS_BASE_TO_CENTER = { ST:"ST (C)", M:"M (C)", AM:"AM (C)", D:"D (C)" };

function CSS(theme, themeName){
  return `
@import url('https://fonts.googleapis.com/css2?family=Gabarito:wght@600;800&family=Inter:wght@400;600;700;800&display=swap');
:root{
  --bg:${theme.bg}; --ink:${theme.ink}; --muted:${theme.muted};
  --card:${theme.card}; --cardBorder:${theme.cardBorder};
  --chip:${theme.chip}; --chipActive:${theme.chipActive};
  --accent:${theme.accent}; --accent2:${theme.accent2};
  --axisInk:${theme.axisInk}; --quadFill:${theme.quadFill}; --ring:${theme.ring};
}
*{ box-sizing:border-box; }
html,body,#root{ height:100%; }
body{
  margin:0; color:var(--ink);
  background: radial-gradient(1200px 800px at 20% -20%, ${themeName==="sleek"?"#141d2b": themeName==="dusk" ? "#141833" : "#ffffff"} 0%, var(--bg) 60%, var(--bg) 100%);
  font-family: Gabarito, Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial;
  font-size: 15px;
}
.app{ display:flex; flex-direction:column; min-height:100vh; }
.topbar{
  position:sticky; top:0; z-index:10;
  display:flex; align-items:center; gap:12px; padding:10px 16px;
  background:color-mix(in oklab, var(--bg) 88%, black 0%); border-bottom:1px solid var(--cardBorder); backdrop-filter: blur(8px);
}
.brand{ font-weight:800; letter-spacing:0.2px; }
.spacer{ flex:1; }
.tabs{ display:flex; gap:8px; margin-left:16px; overflow:auto; padding:6px 0; }
.tab{
  border:1px solid var(--cardBorder); background:color-mix(in oklab, var(--bg), white 4%); color:var(--ink);
  border-radius:999px; padding:9px 14px; cursor:pointer; white-space:nowrap; font-size:14px;
}
.tab:hover{ box-shadow: inset 0 0 0 1px var(--ring); }
.tab.active{ border-color:var(--accent); box-shadow: inset 0 0 0 1px var(--accent); }
.seg{ display:flex; gap:8px; }
.segBtn{
  border:1px solid var(--cardBorder); background:color-mix(in oklab, var(--bg), white 4%); color:var(--ink);
  border-radius:999px; padding:8px 12px; cursor:pointer;
}
.segBtn.active{ border-color:var(--accent); box-shadow: inset 0 0 0 1px var(--accent); }
.btn{ padding:10px 14px; border-radius:12px; border:1px solid var(--accent); background:var(--accent); color:white; cursor:pointer; font-weight:700; }
.btn.ghost{ background:transparent; color:var(--accent); border-color:var(--accent); }
.btn.ghost.tight{ padding:6px 10px; }
.btn.ghost.alt{ color:var(--accent2); border-color:var(--accent2); }
.input{ width:100%; padding:11px 12px; border-radius:12px; border:1px solid var(--cardBorder); background:color-mix(in oklab, var(--bg), white 4%); color:var(--ink); outline:none; font-size:14px; box-sizing:border-box; position:relative; z-index:10; }
.input:focus{ box-shadow:0 0 0 3px color-mix(in oklab, var(--accent) 24%, transparent); border-color:var(--accent); z-index:15; }
select.input{ min-width:0; max-width:100%; }
.sectionBody .input{ width:100%; min-width:0; }
.lbl{ font-size:12px; color:var(--muted); margin-bottom:4px; display:block; }

.playerBar{ position:sticky; top:54px; z-index:9; background:var(--card); border-bottom:1px solid var(--cardBorder); max-height:200px; overflow:visible; }
.playerHeader{
  display:grid; grid-template-columns: 1fr; gap:6px;
  padding:6px 8px; overflow:hidden;
  white-space:normal;
}
.playerHeaderTop{ display:flex; gap:6px; align-items:center; flex-wrap:wrap; margin-left:2px; overflow:hidden; }
.phName{
  font-weight:800; padding:4px 8px; border-radius:6px; font-size:14px;
  background:color-mix(in oklab, var(--bg), white 6%); border:1px solid var(--cardBorder);
  overflow:hidden; text-overflow:ellipsis; white-space:nowrap; 
  max-width:200px; min-width:0; flex-shrink:1;
}
.badge{ font-size:10px; padding:2px 5px; border-radius:999px; border:1px solid var(--cardBorder); background:color-mix(in oklab, var(--bg), white 6%); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:100px; }
.phKpis{
  display:grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap:4px; padding:0 4px 4px 4px;
}
.phKpi{
  display:flex; align-items:center; justify-content:space-between; gap:3px;
  background:color-mix(in oklab, var(--bg), white 6%); border:1px solid var(--cardBorder);
  border-radius:6px; padding:4px 6px; min-height:28px; position:relative; font-size:11px;
  overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
}
.phKpi div:first-child{ color:var(--muted); }
.phKpi b{ font-weight:700; }

.statRow{
  display:flex; justify-content:space-between; align-items:center; padding:8px 0; 
  border-bottom:1px solid color-mix(in oklab, var(--border), transparent 50%);
}
.statRow:last-child{ border-bottom:none; }

.wrap{ display:grid; grid-template-columns: 400px 1fr; gap:0; max-width:2000px; margin:0 auto; width:100%; min-height:100vh; }
@media(max-width:1200px){ .wrap{ grid-template-columns:1fr; } }
.side{ 
  display:flex; 
  flex-direction:column; 
  gap:16px; 
  min-width:0; 
  align-items:stretch; 
  position:sticky; 
  top:0; 
  height:100vh; 
  overflow-y:auto; 
  background:var(--card); 
  border-right:1px solid var(--cardBorder); 
  padding:16px 20px;
  box-sizing:border-box;
  z-index: 100;
}
.main{ display:flex; flex-direction:column; gap:12px; min-width:0; padding:12px 16px; overflow:visible; min-height:100vh; }

.section{
  background:var(--card); border:1px solid var(--cardBorder); border-radius:16px; overflow:visible; box-shadow:0 12px 24px rgba(0,0,0,0.25);
  margin: 16px 0;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  position: relative;
  z-index: 1;
}
.sectionHead{ padding:12px 16px; font-weight:800; border-bottom:1px solid var(--cardBorder); background:linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0)); width:100%; box-sizing:border-box; font-size:14px; }
.sectionBody{ padding:16px 20px 32px 20px; display:flex; flex-direction:column; gap:16px; overflow:visible; width:100%; box-sizing:border-box; }

.card{
  background:var(--card); border:1px solid var(--cardBorder); border-radius:18px; overflow:hidden; box-shadow:0 16px 32px rgba(0,0,0,0.3);
}
.cardHead{ display:flex; align-items:center; justify-content:space-between; padding:14px 16px; border-bottom:1px solid var(--cardBorder); background:linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0)); font-size:16px; }
.cardBody{ padding:16px; }
.row{ display:flex; gap:12px; align-items:center; }
.col{ flex:1; min-width:0; }

.table{ width:100%; border-collapse:collapse; font-size:14px; table-layout:fixed; }
.table th, .table td{ padding:8px 10px; border-bottom:1px solid var(--cardBorder); text-align:left; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:0; }
.table th:first-child, .table td:first-child{ min-width:120px; max-width:180px; }
.scroll{ overflow:auto; border:1px solid var(--cardBorder); border-radius:12px; max-height:400px; }

.chipRow{ display:flex; flex-wrap:wrap; gap:6px; align-items:center; max-width:100%; overflow:hidden; }
.chip{ border:1px solid var(--cardBorder); background:var(--chip); color:var(--ink); border-radius:999px; padding:6px 10px; cursor:pointer; font-size:12px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:200px; }
.chip.active{ background:var(--chipActive); color:white; border-color:transparent; }

.chartWrap{ width:100%; max-width:100%; overflow:hidden; }
.d3tip{
  max-width: 300px; background: color-mix(in oklab, var(--bg) 92%, black 0%);
  border:1px solid var(--cardBorder); border-radius: 12px; padding: 10px 12px; color: var(--ink);
  filter: drop-shadow(0 12px 18px rgba(0,0,0,0.35)); backdrop-filter: blur(6px); z-index: 1000; font-size:12px;
  word-wrap:break-word; overflow-wrap:break-word;
}
.d3tip .t-title{ font-weight:800; margin-bottom:6px; display:flex; gap:8px; align-items:center; }
.d3tip .t-badge{ margin-left:8px; font-size:10px; font-weight:700; color:var(--accent); background:rgba(78,161,255,0.12); border:1px solid rgba(78,161,255,0.35); padding:2px 6px; border-radius:999px; }
.d3tip .t-row{ display:flex; justify-content:space-between; gap:12px; font-size:11px; padding:2px 0; }

.status{ font-size:12px; color:var(--muted); }
.legendRow{ display:flex; flex-wrap:wrap; gap:10px; margin:8px 0 2px; }
.legendItem{ display:inline-flex; align-items:center; gap:6px; font-size:13px; color:var(--muted); }
.legendSwatch{ width:12px; height:12px; border-radius:3px; border:1px solid color-mix(in oklab, black 18%, transparent); }
.deltaUp{ color:#18c27a; } .deltaDown{ color:#ff7d8a; }
`;
}



/* ===================== Header rename (exact) ===================== */
const RENAME_MAP = new Map(Object.entries({
  "Name":"Name","Position":"Pos","Age":"Age","Weight":"Weight","Height":"Height",
  "Inf":"Info","Club":"Club","Division":"League","Nat":"Nat","2nd Nat":"2nd Nat",
  "Home-Grown Status":"Home-Grown Status","Personality":"Personality","Media Handling":"Media Handling",
  "Wage":"Wage","Transfer Value":"Transfer Value","Asking Price":"Asking Price","Preferred Foot":"Preferred Foot",
  "Yel":"Yellow Cards","xG":"Expected Goals","Starts":"Starts","Red":"Red Cards","PoM":"Player of the Match",
  "Pen/R":"Pens Scored Ratio","Pens S":"Pens Scored","Pens Saved Ratio":"Pens Saved Ratio","Pens Saved":"Pens Saved",
  "Pens Faced":"Pens Faced","Pens":"Pens","Mins":"Minutes","Gls/90":"Goals / 90","Conc":"Conceded","Gls":"Goals",
  "Fls":"Fouls","FA":"Fouled","xG/90":"xG/90","xA/90":"Expected Assists/90","xA":"Expected Assists",
  "Con/90":"Conceded/90","Clean Sheets":"Clean Sheets","Cln/90":"Clean Sheets/90","Av Rat":"Avg Rating",
  "Mins/Gl":"Minutes / Goal","Ast":"Assist","Hdrs A":"Headers Attempted","Apps":"Appearances",
  "Tck/90":"Tackles/90","Tck W":"Tackles Won","Tck A":"Tackles Attempted","Tck R":"Tackle Ratio",
  "Shot/90":"Shots/90","Shot %":"Shot on Target Ratio","ShT/90":"SoT/90","ShT":"Shots on Target",
  "Shots Outside Box/90":"Shots Outside Box/90","Shts Blckd/90":"Shots Blocked/90","Shts Blckd":"Shots Blocked",
  "Shots":"Shots","Svt":"Saves Tipped","Svp":"Saves Parried","Svh":"Saves Held","Sv %":"Save Ratio",
  "Pr passes/90":"Progressive Passes/90","Pr Passes":"Progressive Passes",
  "Pres C/90":"Pressures Completed/90","Pres C":"Pressures Completed","Pres A/90":"Pressures Attempted/90","Pres A":"Pressures Attempted",
  "Poss Won/90":"Possession Won/90","Poss Lost/90":"Possession Lost/90","Ps C/90":"Passes Completed/90","Ps C":"Passes Completed",
  "Ps A/90":"Passes Attempted/90","Pas A":"Passes Attempted","Pas %":"Pass Completion%",
  "OP-KP/90":"Open Play Key Passes/90","OP-KP":"Open Play Key Passes",
  "OP-Crs C/90":"Open Play Crosses Completed/90","OP-Crs C":"Open Play Crosses Completed",
  "OP-Crs A/90":"Open Play Crosses Attempted/90","OP-Crs A":"Open Play Crosses Attempted","OP-Cr %":"Open Play Cross Completion Ratio",
  "Off":"Offsides","Gl Mst":"Mistakes Leading to Goal","K Tck/90":"Key Tackles/90","K Tck":"Key Tackles",
  "K Ps/90":"Key Passes/90","K Pas":"Key Passes","K Hdrs/90":"Key Headers/90","Int/90":"Interceptions/90","Itc":"Interceptions",
  "Sprints/90":"Sprint/90","Hdr %":"Header Win Rate","Hdrs W/90":"Headers won/90","Hdrs":"Headers","Hdrs L/90":"Headers Lost/90",
  "Goals Outside Box":"Goals Outside Box","xGP/90":"Expected Goals Prevented/90","xGP":"Expected Goals Prevented",
  "Drb/90":"Dribbles/90","Drb":"Dribbles","Distance":"Distance Covered (KM)","Cr C/90":"Crosses Completed/90","Cr C":"Crosses Completed",
  "Crs A/90":"Crosses Attempted/90","Cr A":"Crosses Attempted","Cr C/A":"Cross Completion Ratio","Conv %":"Conversion Rate",
  "Clr/90":"Clearances/90","Clear":"Clearances","CCC":"Chances Created","Ch C/90":"Chances Created/90",
  "Blk/90":"Blocks/90","Blk":"Blocks","Aer A/90":"Aerial Duels Attempted/90"
}));

/* ===================== Display labels ===================== */
const LABELS = new Map([
  ["Pass Completion%","Pass %"],
  ["SoT/90","Shots on Target/90"],
  ["xGP/90","Expected Goals Prevented/90"],
  ["xG/90","xG/90"],["xA/90","xA/90"],["Goals / 90","Goals/90"],
  ["OP-KP/90","Open Play Key Passes/90"],["K Ps/90","Key Passes/90"],["Ch C/90","Chances Created/90"],
  ["Pr passes/90","Progressive Passes/90"],["Ps A/90","Passes Attempted/90"],["Ps C/90","Passes Completed/90"],
  ["Cr C/90","Crosses Completed/90"],["Crs A/90","Crosses Attempted/90"],["OP-Crs C/90","Open Play Crosses Completed/90"],["OP-Crs A/90","Open Play Crosses Attempted/90"]
]);

/* ===================== Helpers ===================== */
const strip = (s) => String(s||"").trim();
const keyNorm = (s) => strip(s).toLowerCase().replace(/[^a-z0-9]+/g,"");
const LESS_IS_BETTER = new Set(["Conceded/90","Goals Allowed/90","G/Sh","G/SoT"]);
const tf = (v, n = 1) => (Number.isFinite(v) ? Number(v).toFixed(n) : "—");
const clamp100 = (x) => Math.max(0, Math.min(100, x));
const decileBadge = (pct)=> pct>=90?"Top 10%": pct>=75?"Top 25%": pct>=50?"Top 50%": pct>=25?"Below Median":"Bottom 25%";
const money = (n) => {
  if (!Number.isFinite(n)) return "—";
  const sgn = n<0? "-" : "";
  const x = Math.abs(n);
  if (x >= 1e9) return `${sgn}£${(x/1e9).toFixed(2)}b`;
  if (x >= 1e6) return `${sgn}£${(x/1e6).toFixed(2)}m`;
  if (x >= 1e3) return `${sgn}£${(x/1e3).toFixed(0)}k`;
  return `${sgn}£${x.toFixed(2)}`;
};

/* parse numeric-ish */
const numerify = (v) => {
  if (v === null || v === undefined) return NaN;
  let s = String(v).trim();
  if (!s || /^[-–—\s]+$/.test(s)) return NaN;
  s = s.replace(/[$£€]/g,"").replace(/,/g,"").trim();
  const mult = /m\b/i.test(s) ? 1e6 : /k\b/i.test(s) ? 1e3 : 1;
  s = s.replace(/[mk]\b/i,"").replace(/%/,"");
  const num = Number(s);
  return Number.isFinite(num) ? num * mult : NaN;
};

/* Money parsing */
const MONEY_RE = /([£$€])?\s*([\d.,]+)\s*([KkMm])?/;
function parseOneMoney(s) {
  if (!s) return NaN;
  const m = String(s).replace(/\s/g,'').match(MONEY_RE);
  if (!m) return NaN;
  const cleaned = String(m[2]).includes(",")
    ? String(m[2]).replace(/,/g,"")
    : String(m[2]).replace(/\.(?=\d{3}\b)/g,"");
  const raw = Number(cleaned);
  if (!isFinite(raw)) return NaN;
  const unit = (m[3]||'').toUpperCase();
  let v = raw; if (unit==='K') v *= 1_000; if (unit==='M') v *= 1_000_000;
  return v;
}
function parseMoneyRange(str) {
  if (!str) return { lower: NaN, upper: NaN, mid: NaN, raw: "" };
  const raw = String(str).trim();
  const parts = raw.split(/[-–—]/).map(s => s.trim()).filter(Boolean);
  if (parts.length < 2) {
    const v = parseOneMoney(raw);
    return { lower: v, upper: v, mid: v, raw };
  }
  const a = parseOneMoney(parts[0]);
  const b = parseOneMoney(parts[1]);
  const lower = isFinite(a)&&isFinite(b) ? Math.min(a,b) : (isFinite(a)?a:(isFinite(b)?b:NaN));
  const upper = isFinite(a)&&isFinite(b) ? Math.max(a,b) : (isFinite(a)?a:(isFinite(b)?b:NaN));
  const mid = isFinite(lower)&&isFinite(upper) ? (lower+upper)/2 : (isFinite(lower)?lower:upper);
  return { lower, upper, mid, raw };
}

/* ===================== Table utils ===================== */
function findColFuzzy(columns, candidates) {
  const map = new Map(columns.map(c => [keyNorm(c), c]));
  for (const name of candidates) {
    const kn = keyNorm(name);
    if (map.has(kn)) return map.get(kn);
    if (RENAME_MAP.has(name)) {
      const mapped = RENAME_MAP.get(name);
      if (map.has(keyNorm(mapped))) return map.get(keyNorm(mapped));
    }
  }
  for (const c of columns) {
    const knc = keyNorm(c);
    for (const name of candidates) if (knc.includes(keyNorm(name))) return c;
  }
  return null;
}
function normalizeHeadersRowObjects(rows) {
  if (!rows || !rows.length) return [];
  const cols = Array.from(new Set(rows.flatMap(r => Object.keys(r))));
  const resolved = new Map(); for (const c of cols) resolved.set(c, RENAME_MAP.get(c) || c);
  return rows.map(r => {
    const o = {};
    for (const [k, v] of Object.entries(r)) o[resolved.get(k) || k] = typeof v === "string" ? v.trim() : v;
    return o;
  });
}

/* ===================== HTML table reader ===================== */
async function parseHtmlTable(file) {
  const text = await file.text();
  const doc = new DOMParser().parseFromString(text, "text/html");
  const tables = Array.from(doc.querySelectorAll("table"));
  if (!tables.length) return [];
  const score = (tbl) => {
    const trs = Array.from(tbl.querySelectorAll("tr"));
    const cols = Math.max(...trs.map(tr => tr.children.length), 0);
    let numericish = 0; let cells = 0;
    trs.forEach(tr => { Array.from(tr.children).forEach(td => { cells++; if (Number.isFinite(numerify(td.textContent))) numericish++; }); });
    return cols * 1000 + numericish - cells * 0.05;
  };
  const best = tables.sort((a,b)=>score(b)-score(a))[0];
  const trs = Array.from(best.querySelectorAll("tr"));
  if (!trs.length) return [];
  let headerRowIndex = trs.findIndex(tr => tr.querySelector("th"));
  if (headerRowIndex === -1) headerRowIndex = 0;
  const headerCells = Array.from(trs[headerRowIndex].children).map(td => td.textContent.trim());
  const dataRows = trs.slice(headerRowIndex + 1);
  const out = dataRows.map(tr => {
    const cells = Array.from(tr.children).map(td => td.textContent.trim());
    const obj = {}; headerCells.forEach((h, i) => { const key = (RENAME_MAP.get(h) || h).trim(); obj[key] = cells[i]; });
    return obj;
  });
  return out;
}

/* ===================== Position parsing ===================== */
function expandFMPositions(posStr) {
  if (!posStr) return [];
  const parts = String(posStr).split(",").map(p => p.trim()).filter(Boolean);
  const out = new Set();
  for (const p of parts) {
    const m = p.match(/^([A-Za-z]{1,3})\s*\(([^)]+)\)$/);
    if (m) {
      const base = m[1].toUpperCase();
      const ins = (m[2] || "").toUpperCase().replace(/[^A-Z]/g, "");
      if (ins) [...ins].forEach(ch => out.add(`${base} (${ch})`));
      else out.add(base);
    } else {
      out.add(p.toUpperCase());
    }
  }
  return Array.from(out);
}
const normToken = (t) => {
  const s = String(t||"").trim().toUpperCase();
  const m = s.match(/^([A-Z]{1,3})\s*\(([RLC])\)$/);
  if (m) return `${m[1]} (${m[2]})`;
  return POS_BASE_TO_CENTER[s] || s;
};
function sharesAny(list, allowed){ const set = new Set(list.map(normToken)); for (const a of allowed) if (set.has(normToken(a))) return true; return false; }

/* ===================== Role Book (expanded) ===================== */
const ROLE_BOOK = {
  // ---- Goalkeepers ----
  "GK — Shot Stopper": {
    baseline: ["GK"],
    weights: {
      "Expected Goals Prevented/90": 1.7,
      "Saves Held": 1.2, "Saves Parried": 0.8, "Saves Tipped": 0.6,
      "Conceded/90": 1.2, "Clean Sheets/90": 0.9
    }
  },
  "GK — Sweeper Keeper": {
    baseline: ["GK"],
    weights: {
      "Passes Attempted/90": 1.2, "Passes Completed/90": 0.9, "Pass Completion%": 0.9,
      "Progressive Passes/90": 1.6, "Expected Goals Prevented/90": 1.1,
      "Saves Held": 0.7, "Saves Parried": 0.5
    }
  },

  // ---- Centre-backs ----
  "CB — Stopper": {
    baseline: ["D (C)"],
    weights: {
      "Tackles/90": 1.5, "Tackle Ratio": 1.2,
      "Interceptions/90": 1.3, "Blocks/90": 1.1, "Shots Blocked/90": 1.0,
      "Clearances/90": 1.0, "Headers won/90": 1.1, "Header Win Rate": 1.1
    }
  },
  "CB — Ball Playing": {
    baseline: ["D (C)"],
    weights: {
      "Passes Attempted/90": 1.4, "Passes Completed/90": 1.2, "Pass Completion%": 1.1,
      "Progressive Passes/90": 1.7, "Key Passes/90": 1.2, "Interceptions/90": 1.0,
      "Tackles/90": 0.9, "Chances Created/90": 1.0
    }
  },

  // ---- Full-backs / Wing-backs ----
  "FB — Overlapping": {
    baseline: ["D (R)","D (L)","WB (R)","WB (L)"],
    weights: {
      "Crosses Attempted/90": 1.4, "Crosses Completed/90": 1.6, "Cross Completion Ratio": 1.2,
      "Open Play Crosses Attempted/90": 1.5, "Open Play Crosses Completed/90": 1.6,
      "Open Play Key Passes/90": 1.4, "Key Passes/90": 1.2, "Dribbles/90": 1.2,
      "Tackles/90": 1.0, "Interceptions/90": 1.0
    }
  },
  "FB — Inverted": {
    baseline: ["D (R)","D (L)","WB (R)","WB (L)"],
    weights: {
      "Passes Attempted/90": 1.3, "Passes Completed/90": 1.3, "Pass Completion%": 1.4,
      "Progressive Passes/90": 1.7, "Open Play Key Passes/90": 1.4,
      "Interceptions/90": 1.1, "Tackles/90": 1.0, "Chances Created/90": 1.1
    }
  },

  // ---- Defensive Midfield ----
  "DM — Ball Winner": {
    baseline: ["DM"],
    weights: {
      "Tackles/90": 1.6, "Tackle Ratio": 1.3,
      "Interceptions/90": 1.6, "Blocks/90": 1.2, "Shots Blocked/90": 1.2,
      "Possession Won/90": 1.5, "Pressures Completed/90": 1.2
    }
  },
  "DM — Deep-Lying Playmaker": {
    baseline: ["DM"],
    weights: {
      "Passes Attempted/90": 1.6, "Passes Completed/90": 1.3, "Pass Completion%": 1.3,
      "Progressive Passes/90": 1.7, "Open Play Key Passes/90": 1.3,
      "Key Passes/90": 1.1, "Interceptions/90": 1.0
    }
  },

  // ---- Central Midfield ----
  "CM — Box to Box": {
    baseline: ["M (C)"],
    weights: {
      "Progressive Passes/90": 1.4, "Open Play Key Passes/90": 1.2, "Dribbles/90": 1.2,
      "Pressures Completed/90": 1.1, "Tackles/90": 1.2, "Interceptions/90": 1.2,
      "Shots/90": 1.1, "SoT/90": 1.1
    }
  },
  "CM — Progresser": {
    baseline: ["M (C)"],
    weights: {
      "Progressive Passes/90": 1.7, "Passes Completed/90": 1.3, "Passes Attempted/90": 1.4,
      "Open Play Key Passes/90": 1.5, "Key Passes/90": 1.3, "Dribbles/90": 1.2,
      "Chances Created/90": 1.5
    }
  },

  // ---- Attacking Midfield ----
  "AM — Classic 10": {
    baseline: ["AM (C)"],
    weights: {
      "Open Play Key Passes/90": 1.7, "Key Passes/90": 1.6, "Chances Created/90": 1.7,
      "Assist": 1.5, "Progressive Passes/90": 1.3, "Dribbles/90": 1.2,
      "Shots/90": 1.0
    }
  },
  "AM — Shadow Striker": {
    baseline: ["AM (C)"],
    weights: {
      "Shots/90": 1.5, "SoT/90": 1.5, "Dribbles/90": 1.1,
      "Chances Created/90": 1.1, "Key Passes/90": 1.1,
      "Conversion Rate": 1.6, "Goals / 90": 1.8
    }
  },

  // ---- Wingers ----
  "Winger — Classic": {
    baseline: ["AM (R)","AM (L)","M (R)","M (L)"],
    weights: {
      "Crosses Attempted/90": 1.4, "Crosses Completed/90": 1.6, "Cross Completion Ratio": 1.3,
      "Open Play Crosses Attempted/90": 1.5, "Open Play Crosses Completed/90": 1.7,
      "Open Play Key Passes/90": 1.4, "Dribbles/90": 1.6, "Assist": 1.5
    }
  },
  "Winger — Inverted": {
    baseline: ["AM (R)","AM (L)","M (R)","M (L)"],
    weights: {
      "Shots/90": 1.6, "SoT/90": 1.6, "Dribbles/90": 1.6,
      "Open Play Key Passes/90": 1.3, "Chances Created/90": 1.4,
      "Conversion Rate": 1.6, "Progressive Passes/90": 1.2
    }
  },

  // ---- Strikers ----
  "ST — Poacher": {
    baseline: ["ST","ST (C)"],
    weights: {
      "Shots/90": 1.6, "SoT/90": 1.7, "Conversion Rate": 1.7,
      "Goals / 90": 1.9, "xG/90": 1.7
    }
  },
  "ST — Target Man": {
    baseline: ["ST","ST (C)"],
    weights: {
      "Headers won/90": 1.8, "Header Win Rate": 1.7, "Aerial Duels Attempted/90": 1.6,
      "Shots/90": 1.2, "SoT/90": 1.1, "Key Passes/90": 1.0
    }
  }
};

const ROLE_STATS = Object.fromEntries(Object.entries(ROLE_BOOK).map(([r,e]) => [r, Object.keys(e.weights)]));
const ROLE_WEIGHTS = Object.fromEntries(Object.entries(ROLE_BOOK).map(([r,e]) => [r, e.weights]));
const ROLE_BASELINES = Object.fromEntries(Object.entries(ROLE_BOOK).map(([r,e]) => [r, e.baseline || []]));
const ALL_ROLE_STATS = Array.from(new Set(Object.values(ROLE_BOOK).flatMap(r => Object.keys(r.weights))));

/* ===================== Percentiles ===================== */
function getCell(obj, name) {
  if (!obj) return undefined;
  if (name in obj) return obj[name];
  if (RENAME_MAP.has(name)) {
    const mapped = RENAME_MAP.get(name);
    if (mapped in obj) return obj[mapped];
  }
  const kn = keyNorm(name);
  for (const k of Object.keys(obj)) if (keyNorm(k) === kn) return obj[k];
  return undefined;
}
function numCell(obj, name) {
  const raw = getCell(obj, name);
  const n = numerify(raw);
  return Number.isFinite(n) ? n : NaN;
}
function buildPercentileIndex(rows, statList) {
  const out = new Map();
  const list = statList || ALL_ROLE_STATS;
  for (const stat of list) {
    const vals = rows.map(r => numCell(r, stat)).filter(Number.isFinite).sort((a,b)=>a-b);
    out.set(stat, vals);
  }
  return out;
}
function percentileFor(pctIndex, stat, value) {
  const arrAsc = pctIndex.get(stat) || [];
  if (!arrAsc.length || !Number.isFinite(value)) return NaN;
  const less = LESS_IS_BETTER.has(stat);
  let l = 0, r = arrAsc.length;
  while (l < r) { const m = (l + r) >> 1; if (arrAsc[m] < value) l = m + 1; else r = m; }
  const lo = l; l = 0; r = arrAsc.length;
  while (l < r) { const m = (l + r) >> 1; if (arrAsc[m] <= value) l = m + 1; else r = m; }
  const hi = l; const midrank = (lo + hi) / 2;
  let pct = (midrank / arrAsc.length) * 100;
  if (less) pct = 100 - pct;
  return clamp100(pct);
}

/* ===================== Role scoring ===================== */
function roleScoreFor(row, roleName, pctIndex) {
  const weights = typeof roleName === "string" ? ROLE_WEIGHTS[roleName] : (roleName?.weights||null);
  if (!weights) return 0;
  let sumW = 0, sum = 0;
  for (const [stat, w] of Object.entries(weights)) {
    const v = numCell(row, stat);
    const pct = percentileFor(pctIndex, stat, v);
    if (Number.isFinite(pct)) { sum += pct * w; sumW += w; }
  }
  return sumW > 0 ? sum / sumW : 0;
}
function bestNearRole(row, pctIndex) {
  const tokens = expandFMPositions(getCell(row, "Pos"));
  let best = null, bestScore = -1;
  for (const role of Object.keys(ROLE_BOOK)) {
    const baseline = ROLE_BASELINES[role] || [];
    if (!sharesAny(tokens, baseline)) continue;
    const sc = roleScoreFor(row, role, pctIndex);
    if (sc > bestScore) { bestScore = sc; best = role; }
  }
  return { role: best, score: clamp100(bestScore) };
}

/* ===================== Big-metric families ===================== */
const BIG_METRICS = {
  GK: ["Expected Goals Prevented/90","Save Ratio","Saves Held","Conceded/90"],
  DF: ["Tackles/90","Interceptions/90","Blocks/90","Shots Blocked/90","Clearances/90","Header Win Rate"],
  MF: ["Progressive Passes/90","Open Play Key Passes/90","Key Passes/90","Dribbles/90","Chances Created/90"],
  FW: ["Goals / 90","xG/90","SoT/90","Conversion Rate","Open Play Key Passes/90"]
};
const famFromTokens = (toks=[]) => {
  const t = new Set(toks);
  if (t.has("GK")) return "GK";
  if (t.has("D (R)")||t.has("D (L)")||t.has("D (C)")||t.has("WB (R)")||t.has("WB (L)")) return "DF";
  if (t.has("ST (C)")||t.has("AM (R)")||t.has("AM (L)")) return "FW";
  return "MF";
};

/* ============== Expanded League grouping with 'growth' + explicit downgrades ===
   Order (best ➜ worst): elite → strong → solid → growth → develop
   Explicit DOWNGRADE list forces tiny European top tiers into 'develop'.
=============================================================================== */
const ESC = (s)=>s.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
function makeUnion(list){ return new RegExp("\\b(" + list.map(ESC).join("|") + ")\\b","i"); }

const GROUP_PATTERNS = {
  elite: [
    "Premier League","LALIGA EA SPORTS","LaLiga EA SPORTS","Bundesliga","Serie A","Serie A TIM","Ligue 1 Uber Eats",
    "Eredivisie","Brasileirão Assaí Série A","Brasileirao Assai Serie A","Liga MX"
  ],
  strong: [
    "Sky Bet Championship","Championship","2. Bundesliga","LaLiga Hypermotion","Serie BKT","Ligue 2 BKT","Keuken Kampioen Divisie",
    "Liga Portugal Betclic","Jupiler Pro League","cinch Premiership","Admiral Bundesliga","Super League (Greece)","Super League Greece",
    "Spor Toto Süper Lig","Süper Lig","3F Superliga","Eliteserien","Superligaen","PKO Ekstraklasa","Allsvenskan","Raiffeisen Super League",
    "Fortuna liga","Fortuna Liga","OTP Bank Liga","SuperSport HNL","Mozzart Bet SuperLiga","Cyta Championship",
    "MLS","Major League Soccer","Meiji Yasuda J1 League","J1 League","Hana 1Q K League 1","K League 1",
    "QNB Stars League","Iran Pro League","ADNOC Pro League",
    "Botola Pro 1","DSTV Premiership","Egyptian Premier League","Ligue Professionnelle 1"
  ],
  solid: [
    "Sky Bet League One","Sky Bet League Two","Vanarama National League","Liga Portugal 2 SABSEG",
    "3. Liga","OBOS-ligaen","PostNord-ligaen","Challenge League","Admiral 2. Liga","Challenger Pro League",
    "Veikkausliiga","Prva Liga Telemach","I liga","Fortuna 1 Liga","II liga",
    "Serie C NOW","Serie C","Championnat National","Segunda Federación","Primera Federación",
    "Eerste Divisie","Liga 2 BKT","Liga Profesional de Fútbol","Liga Profesional de Futbol",
    "Liga BetPlay Dimayor","Primera División (Uruguay)","Primera División (Paraguay)","Primera División (Chile)",
    "Campeonato AFP PlanVital","Liga Promerica","Liga Panameña de Fútbol","New Zealand National League"
  ],
  growth: [
    "USL Championship","Canadian Premier League","Liga BBVA Expansión MX","Expansion MX",
    "Chinese Super League","Ping An Chinese Football Association Super League",
    "Thai League 1","V.League 1","Vietnam V League 1","A-League","Isuzu UTE A-League",
    "K League 2","J2 League","Meiji Yasuda J2 League",
    "Jordan Pro League","Kuwaiti Premier League","Bahrain Premier League","Uzbekistan Superliga","Lebanese Premier League",
    "Malaysia Super League","Astro Liga Super Malaysia",
    "Ligue 1 (Algeria)","Liga 1 Mobilis","Nigeria Professional Football League","NPFL",
    "Vodacom Tanzania Premier League","Zambia Super League","MTN/FAZ Super Division","Ghana Premier League"
  ],
  develop: [
    "National League North","National League South","Regionalliga","Segunda Federación RFEF","Tercera Federación",
    "Serie D","Primera C/Torneo Argentino","Primera B Metropolitana","Torneo Federal A",
    "Primera B Nacional (Paraguay)","Primera División B (Paraguay)","Primera División B (Chile)","Segunda División (Chile)",
    "USL League One","USL League Two","MLS Next Pro","NISA",
    "Roshn Saudi League","Saudi Pro League","Roshin Saudi League","Roshn Saudi Pro League",
    "Qatar Second Division","Oman Professional League","Iraq Stars League","Turkmenistan Ýokary Liga","Turkmenistan Yokary Liga",
    "Philippines Football League","Kyrgyz Premier League","Afghan Premier League","Pakistan Premier League","Sri Lanka Super League",
    "Bangladesh Premier League","Hong Kong First Division League","Hong Kong Premier League","J3 League","K League 3",
    "Liga 2 Indonesia","JD Cymru North","JD Cymru South"
  ]
};

// Force the smallest European top tiers to DEVELOP (explicit)
const DOWNGRADE_TO_DEVELOP = makeUnion([
  "Gibraltar Football League","Gibraltar National League",
  "Betri deildin","Betri deildin menn","Faroe",
  "BGL Ligue","Luxembourg National Division",
  "NIFL Premiership","Sports Direct Premiership",
  "JD Cymru Premier","Cymru Premier","Welsh Premier",
  "A Lyga","Virsliga","Optibet Virsliga","Optibet A lyga",
  "Abissnet Superiore",             // Albania
  "Meridianbet 1.CFL","Prva crnogorska liga", // Montenegro
  "Prva Makedonska Fudbalska Liga", // North Macedonia
  "Crystalbet Erovnuli Liga","Erovnuli Liga", // Georgia
  "Maltese Premier League","Campionato Sammarinese","Andorran Primera Divisió","Primera Divisió" // Malta, San Marino, Andorra
]);

const LMAP = Object.entries(GROUP_PATTERNS).map(([g,list])=>({ g, re: makeUnion(list) }));

function leagueGroupOf(txt){
  const s=String(txt||"");
  if (DOWNGRADE_TO_DEVELOP.test(s)) return "develop";       // explicit small top tiers down
  if (/saudi|roshn/i.test(s)) return "develop";              // explicit override: Saudi
  for(const {re,g} of LMAP){ if(re.test(s)) return g; }
  // Heuristics
  if(/expansi[oó]n mx|usl|canadian premier|j2|k league 2|china|thai|v\.?league|malaysia|uzbek|lebanon|tanzania|zambia/i.test(s))
    return "growth";
  if(/premier|first div|1st division|pro liga|liga 1|liga i|championship/i.test(s)) return "solid";
  if(/second|2nd|liga 2|division 2|liga ii|league two/i.test(s)) return "develop";
  return "solid";
}

/* ============== Value & Wage config (scaled up wages + floors) =============== */
/* ============== Value & Wage config (scaled + elite floors + rank boosts) =============== */
/* ============== Value & Wage config (scaled + elite floors + rank boosts) =============== */
const DEFAULT_VALUE_CONFIG = {
  // league weighting + base scales (millions)
  leagueWeights: { elite:1.35, strong:1.00, solid:0.85, growth:0.75, develop:0.65 },
  baseScales:    { elite:85.0, strong:15.0, solid:8.0,  growth:5.5,  develop:4.0 },

  // score shaping - decrease power to boost high performers
  scorePower: 0.88,

  // minutes & age shaping (softer older drop for stars)
  minMinutesRef: 1800,
  minMinutesFloor: 0.55,
  ageCurve: { 17:0.90, 20:0.97, 23:1.00, 26:1.00, 29:0.97, 31:0.94, 34:0.90, 38:0.84 },

  // big-metric boost - increased for elite impact
  bigMetricBoostTopPct: 88,
  bigMetricBoostPerHit: 0.045,

  // anchoring & buy price
  buyDiscount: 0.95, // max fee we’d pay stays close to model value

  // wages — higher per-£1m and stronger elite multiplier
  wagePerM: 4800, // £/week per £1m true value
  wageLeagueFactor: { elite:1.55, strong:1.25, solid:1.05, growth:0.95, develop:0.88 },
  wageAgeBoost: { 18:0.92, 21:0.96, 24:1.00, 28:1.08, 31:1.12, 34:1.08 },
  wageGroupFloor: { elite: 1200, strong: 700, solid: 300, growth: 160, develop: 100 }, // £/week
  wageMinAbsolute: 100,
  wageMaxMult: 1.60,

  // market uplift knobs so elite top scorers don’t look cheap
  topRankPremiumMax: 0.85,                       // up to +85% for #1 in role baseline (scaled by rank share)
  eliteFwPremium: 0.40,                          // extra +40% if elite tier & FW family
  eliteTopFloorM: { FW: 120, MF: 90, DF: 70, GK: 50 }, // much higher floors (in £m) if elite & bestScore≥90
  eliteTopAgeFloor: 0.96,                        // minimum age factor for elite top scorers (prevents heavy age penalty)
  wageRespectCurrentMult: 1.10                   // never cap below ~110% of current
};


/* ============== Value & Wage model ========================================== */
function interpAge(age, curve) {
  if (!Number.isFinite(age)) return 1;
  const pts = Object.entries(curve).map(([k,v])=>[+k, v]).sort((a,b)=>a[0]-b[0]);
  if (!pts.length) return 1;
  if (age <= pts[0][0]) return pts[0][1];
  if (age >= pts[pts.length-1][0]) return pts[pts.length-1][1];
  for (let i=1;i<pts.length;i++){
    const [x1,y1] = pts[i-1], [x2,y2] = pts[i];
    if (age >= x1 && age <= x2){
      const t = (age - x1) / (x2 - x1);
      return y1 + t*(y2 - y1);
    }
  }
  return 1;
}
function minutesTrust(mins, ref, floor) {
  if (!Number.isFinite(mins)) return floor;
  if (mins <= 0) return floor;
  const t = Math.sqrt(Math.min(mins, ref)) / Math.sqrt(ref);
  return Math.max(floor, Math.min(1, t));
}

function trueValueOf(row, pctIndex, cfg = DEFAULT_VALUE_CONFIG) {
  const age = numCell(row, "Age");
  const mins = numCell(row, "Minutes");
  const league = String(getCell(row, "League") || "");
  const group = leagueGroupOf(league);

  // DEFENSIVE: handle partial cfg blobs
  const lw = (cfg.leagueWeights && cfg.leagueWeights[group]) ?? 0.65;
  const scaleM = (cfg.baseScales && cfg.baseScales[group]) ?? 3.0;

  const { role, score } = bestNearRole(row, pctIndex);
  const scoreAdj = Math.pow((score || 0) / 100, cfg.scorePower ?? 1.1);

  const fam = famFromTokens(expandFMPositions(getCell(row, "Pos")));
  const famStats = BIG_METRICS[fam] || [];
  let hits = 0;
  for (const st of famStats) {
    const v = numCell(row, st);
    const pct = percentileFor(pctIndex, st, v);
    if (pct >= (cfg.bigMetricBoostTopPct ?? 90)) hits++;
  }
  const bigBoost = 1 + hits * (cfg.bigMetricBoostPerHit ?? 0.025);

  const mt = minutesTrust(mins, cfg.minMinutesRef ?? 1800, cfg.minMinutesFloor ?? 0.55);
  const am = interpAge(age, cfg.ageCurve || { 17:0.9, 23:1, 29:0.96, 34:0.86 });

  const baseM = scaleM * scoreAdj * lw * mt * am * bigBoost;

  // do not anchor to reported transfer value by default; use model baseM
  return { valueM: baseM, bestRole: role, bestScore: score, group };
}
function buyAtOf(row, pctIndex, cfg = DEFAULT_VALUE_CONFIG) {
  const { valueM } = trueValueOf(row, pctIndex, cfg);
  return valueM * (cfg.buyDiscount ?? 0.72);
}
function weeklyWageOf(row, pctIndex, cfg = DEFAULT_VALUE_CONFIG) {
  const age = numCell(row, "Age");
  const { valueM, group } = trueValueOf(row, pctIndex, cfg);
  const lfac = (cfg.wageLeagueFactor && cfg.wageLeagueFactor[group]) ?? 0.9;
  // piecewise linear age boost
  const ageBoost = (()=>{
    const pts = Object.entries(cfg.wageAgeBoost || {}).map(([k,v])=>[+k, v]).sort((a,b)=>a[0]-b[0]);
    if (!Number.isFinite(age) || !pts.length) return 1;
    if (age <= pts[0][0]) return pts[0][1];
    if (age >= pts[pts.length-1][0]) return pts[pts.length-1][1];
    for (let i=1;i<pts.length;i++){
      const [x1,y1] = pts[i-1], [x2,y2] = pts[i];
      if (age >= x1 && age <= x2) return y1 + (y2-y1) * ((age-x1)/(x2-x1));
    }
    return 1;
  })();
  const raw = (cfg.wagePerM ?? 4200) * valueM * lfac * ageBoost; // £/week
  const floor = Math.max(cfg.wageMinAbsolute || 0, (cfg.wageGroupFloor && cfg.wageGroupFloor[group]) || 0);
  return Math.max(floor, raw);
}
function weeklyWageMaxOf(row, pctIndex, cfg = DEFAULT_VALUE_CONFIG) {
  return weeklyWageOf(row, pctIndex, cfg) * (cfg.wageMaxMult || 1.35);
}

/* ===================== Tooltip util ===================== */
function attachTooltip(hostEl) {
  const tip = document.createElement("div");
  tip.className = "d3tip";
  tip.style.position = "absolute";
  tip.style.opacity = "0";
  tip.style.pointerEvents = "none";
  tip.style.transition = "opacity 120ms ease, transform 120ms ease";
  hostEl.style.position = (getComputedStyle(hostEl).position === "static") ? "relative" : getComputedStyle(hostEl).position;
  hostEl.appendChild(tip);
  let pinned = false;

  function place(clientX, clientY) {
    const hostRect = hostEl.getBoundingClientRect();
    const pad = 12; const lw = tip.offsetWidth || 260; const lh = tip.offsetHeight || 100;
    const x = Math.max(pad, Math.min(clientX - hostRect.left + 14, hostRect.width - lw - pad));
    const y = Math.max(pad, Math.min(clientY - hostRect.top - lh - 10, hostRect.height - lh - pad));
    tip.style.left = x + "px"; tip.style.top = y + "px";
  }
  function show(evt, html) {
    if (!pinned) {
      tip.innerHTML = html; tip.style.opacity = "1"; tip.style.pointerEvents = "none"; tip.style.transform = "translateY(-2px)";
      requestAnimationFrame(()=>place(evt.clientX, evt.clientY));
    }
  }
  function hide(force = false) { if (pinned && !force) return; tip.style.opacity = "0"; tip.style.pointerEvents = "none"; tip.style.transform = "translateY(0)"; }
  function pin(evt, html) {
    pinned = true;
    tip.innerHTML = html + `<div style="margin-top:6px;font-size:11px;color:var(--muted)">click elsewhere to close</div>`;
    tip.style.opacity = "1"; tip.style.pointerEvents = "auto"; tip.style.transform = "translateY(-2px)";
    place(evt.clientX, evt.clientY);
  }
  function unpin(){ pinned = false; tip.style.pointerEvents="none"; tip.style.opacity="0"; tip.style.transform="translateY(0)"; }
  function destroy(){ tip.remove(); }
  return { show, hide, pin, unpin, destroy };
}
function useResizeObserver(ref) {
  const [rect, setRect] = useState({ width: 0, height: 0 });
  useEffect(() => {
    if (!ref.current) return;
    const RO = window.ResizeObserver;
    if (!RO) { setRect({ width: ref.current.offsetWidth || 800, height: ref.current.offsetHeight || 600 }); return; }
    const ro = new RO((entries) => { for (const e of entries) setRect({ width: e.contentRect.width, height: e.contentRect.height }); });
    ro.observe(ref.current); return () => ro.disconnect();
  }, [ref]);
  return rect;
}

/* ===================== Charts ===================== */

/* ============== Pizza Chart Component (FastAPI) =============== */
const Pizza = ({ playerName, playerData, roleStats, compScope, pctIndex }) => {
  const [pizzaImageSrc, setPizzaImageSrc] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!playerName || !playerData || !roleStats || roleStats.length === 0) return;

    const generatePizza = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Prepare the data for the API
        const stats = {};
        const percentiles = {};
        const statLabels = [];

        roleStats.forEach(stat => {
          const raw = numCell(playerData, stat);
          const pct = percentileFor(pctIndex, stat, raw);
          
          stats[stat] = raw;
          percentiles[stat] = pct;
          statLabels.push(stat);
        });

  const requestData = {
          player: {
            name: playerName,
            club: getCell(playerData, "Club") || "",
            position: getCell(playerData, "Pos") || "",
            age: numCell(playerData, "Age") || null,
            minutes: numCell(playerData, "Minutes") || null,
            appearances: numCell(playerData, "Appearances") || null,
            league: getCell(playerData, "League") || "",
            stats: stats,
            percentiles: percentiles,
            stat_labels: statLabels
          },
          title: `vs ${compScope}`,
          light_theme: (typeof window !== 'undefined') ? (document.documentElement?.style?.getPropertyValue('--bg') ? (['light'].includes((localStorage.getItem('ui:theme')||'sleek'))) : true) : true,
          theme: localStorage.getItem('ui:theme') || 'sleek'
        };
        
        // Dev vs Prod routing (never call localhost in prod)
        const isProd = (
          (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.PROD === true) ||
          (typeof window !== 'undefined' && !/localhost|127\.0\.0\.1/i.test(window.location.hostname))
        );
        const endpoint = isProd ? '/api/pizza' : 'http://localhost:8000/pizza/base64';

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestData)
        });

        if (!response.ok) {
          throw new Error(`API request failed: ${response.status}`);
        }

        const result = await response.json();
        setPizzaImageSrc(result.image);
      } catch (err) {
        console.error('Pizza chart generation failed:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    generatePizza();
  }, [playerName, playerData, roleStats, compScope, pctIndex]);

  if (loading) {
    return (
      <div style={{
        width: "100%", 
        height: "450px", 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "center",
        color: "var(--muted)"
      }}>
        Generating pizza chart...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        width: "100%", 
        height: "450px", 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "center",
        color: "var(--error)",
        fontSize: "12px",
        textAlign: "center"
      }}>
        Failed to generate pizza chart<br/>
        <small>{error}</small>
      </div>
    );
  }

  if (!pizzaImageSrc) {
    return (
      <div style={{
        width: "100%", 
        height: "450px", 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "center",
        color: "var(--muted)"
      }}>
        No pizza chart available
      </div>
    );
  }

  return (
    <div style={{width: "100%", height: "450px", display: "flex", justifyContent: "center", alignItems: "center"}}>
      <img 
        src={pizzaImageSrc} 
        alt={`Pizza chart for ${playerName}`}
        style={{
          maxWidth: "100%",
          maxHeight: "100%",
          objectFit: "contain"
        }}
      />
    </div>
  );
};

function Radar({ series }) {
  const wrapRef = useRef(null); 
  const svgRef = useRef(null); 
  const tipRef = useRef(null);
  const { width } = useResizeObserver(wrapRef);
  const categories = series[0]?.slices?.map(s=>s.label) || [];
  
  useEffect(()=>{ 
    if(!wrapRef.current) return; 
    tipRef.current?.destroy?.(); 
    tipRef.current = attachTooltip(wrapRef.current); 
    return ()=>tipRef.current?.destroy?.(); 
  },[wrapRef]);
  
  useEffect(()=>{
    if (!categories.length) return;
    
    // Bigger but still constrained dimensions
    const containerW = width || 400;
    const w = Math.min(containerW, 400);
    const h = Math.min(w, 320);
    
    const root = d3.select(svgRef.current)
      .attr("viewBox", `0 0 ${w} ${h}`)
      .attr("width", "100%")
      .attr("height", "100%")
      .style("max-width", `${w}px`)
      .style("max-height", `${h}px`);
    
    root.selectAll("*").remove();
    
    // Centered positioning with proper margins
    const margin = 50;
    const centerX = w / 2;
    const centerY = h / 2;
    const radius = Math.min(w, h) / 2 - margin;
    
    const g = root.append("g").attr("transform", `translate(${centerX},${centerY})`);
    
    // Grid circles - smaller and cleaner
    [20, 40, 60, 80, 100].forEach(v => {
      g.append("circle")
        .attr("r", radius * (v / 100))
        .attr("fill", "none")
        .attr("stroke", "var(--axisInk)")
        .attr("stroke-dasharray", "1,2")
        .attr("opacity", 0.3);
    });
    
    // Angle calculation
    const angle = d3.scaleLinear()
      .domain([0, categories.length])
      .range([0, Math.PI * 2]);
    
    // Grid lines
    for (let i = 0; i < categories.length; i++) {
      const a = angle(i) - Math.PI / 2; // Start from top
      g.append("line")
        .attr("x1", 0)
        .attr("y1", 0)
        .attr("x2", Math.cos(a) * radius)
        .attr("y2", Math.sin(a) * radius)
        .attr("stroke", "var(--axisInk)")
        .attr("opacity", 0.2);
    }
    
    // Labels - positioned better
    categories.forEach((label, i) => {
      const a = angle(i) - Math.PI / 2;
      const labelRadius = radius + 20;
      const x = Math.cos(a) * labelRadius;
      const y = Math.sin(a) * labelRadius;
      
      const anchor = x > 5 ? "start" : x < -5 ? "end" : "middle";
      
      g.append("text")
        .attr("x", x)
        .attr("y", y)
        .attr("text-anchor", anchor)
        .attr("dominant-baseline", "middle")
        .attr("fill", "var(--axisInk)")
        .style("font-size", "11px")
        .style("font-weight", "600")
        .text(label.length > 15 ? label.substring(0, 15) + "..." : label);
    });
    
    const tip = tipRef.current;
    
    // Draw series
    series.forEach((s, idx) => {
      const color = s.color || "var(--accent)";
      
      // Calculate points
      const pts = s.slices.map((slc, i) => {
        const a = angle(i) - Math.PI / 2;
        const r = radius * (clamp100(slc.pct || 0) / 100);
        return [Math.cos(a) * r, Math.sin(a) * r];
      });
      
      // Draw filled area
      const pathD = d3.line().curve(d3.curveCardinalClosed.tension(0.5))(pts);
      g.append("path")
        .attr("d", pathD)
        .attr("fill", color)
        .attr("opacity", 0.15);
      
      // Draw outline
      g.append("path")
        .attr("d", pathD)
        .attr("stroke", color)
        .attr("stroke-width", 2)
        .attr("fill", "none");
      
      // Draw points with tooltips
      s.slices.forEach((slc, i) => {
        const [x, y] = pts[i];
        
        const html = `
          <div class="t-card">
            <div class="t-title">${slc.label}</div>
            <div class="t-row"><span>Percentile</span><b>${tf(slc.pct, 1)}%</b></div>
            ${Number.isFinite(slc.raw) ? `<div class="t-row"><span>Raw</span><b>${tf(slc.raw, 2)}</b></div>` : ""}
          </div>`;
        
        g.append("circle")
          .attr("cx", x)
          .attr("cy", y)
          .attr("r", 5)
          .attr("fill", color)
          .attr("stroke", "var(--bg)")
          .attr("stroke-width", 2)
          .style("cursor", "pointer")
          .on("mousemove", (e) => tip?.show(e, html))
          .on("mouseleave", () => tip?.hide());
      });
    });
    
  }, [series, width, categories]);
  
  return (
    <div className="chartWrap" ref={wrapRef} style={{width: "100%", height: "100%"}}>
      <svg ref={svgRef} style={{display: "block"}} />
    </div>
  );
}



function HBar({ items, titleFmt=(v)=>`${v}%`, valueMax=100 }) {
  const wrapRef = useRef(null); const svgRef = useRef(null); const tipRef = useRef(null);
  const { width } = useResizeObserver(wrapRef);
  useEffect(()=>{ if(!wrapRef.current) return; tipRef.current?.destroy?.(); tipRef.current = attachTooltip(wrapRef.current); return ()=>tipRef.current?.destroy?.(); },[wrapRef]);
  useEffect(()=>{
    const rowH = 40;
    const data = Array.isArray(items) ? items : [];
    const h = Math.max(280, 54 + rowH * data.length);
    const w = Math.max(900, width || 1200);
    const margin = { top: 30, right: 30, bottom: 44, left: 220 };
    const root = d3.select(svgRef.current).attr("viewBox", `0 0 ${w} ${h}`).attr("width", w).attr("height", h);
    root.selectAll("*").remove();
    const g = root.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
    const innerW = w - margin.left - margin.right;
    const innerH = h - margin.top - margin.bottom;
    const y = d3.scaleBand().domain(data.map(d=>d.label)).range([0, innerH]).padding(0.22);
    const x = d3.scaleLinear().domain([0, valueMax]).range([0, innerW]);
    g.append("g").call(d3.axisLeft(y).tickSize(0)).selectAll("text").style("font-size","14px").attr("fill","var(--axisInk)");
    g.append("g").attr("transform", `translate(0,${innerH})`).call(d3.axisBottom(x).ticks(6).tickFormat((d)=>titleFmt(d))).selectAll("text").style("font-size","13px").attr("fill","var(--axisInk)");
    const tip = tipRef.current;
    const bars = g.append("g").selectAll("rect").data(data).enter().append("rect")
      .attr("x", 0).attr("y", d=>y(d.label)).attr("height", y.bandwidth()).attr("width", 0).attr("fill", "var(--accent)")
      .on("mousemove",(e,d)=> tip?.show(e, `<div class="t-card"><div class="t-title">${d.label}${d.extra?` — ${d.extra}`:""}</div><div class="t-row"><span>Value</span><b>${titleFmt(d.value)}</b></div></div>`))
      .on("mouseleave",()=>tip?.hide());
    bars.transition().duration(650).attr("width", d=>x(d.value)).attr("rx", 9);
    g.selectAll("text.value").data(data).enter().append("text")
      .attr("class","value").attr("x", d=>x(d.value)+8).attr("y", d=>y(d.label)+y.bandwidth()/2)
      .attr("text-anchor","start").attr("dominant-baseline","middle").attr("fill","var(--ink)").style("font-size","14px")
      .text(d=>titleFmt(d.value));
  },[items, width, valueMax, titleFmt]);
  return <div className="chartWrap" ref={wrapRef}><svg ref={svgRef}/></div>;
}



function Scatter({ points, xLabel, yLabel, q="", highlightName="", colorByPos=false, onPick, isProfileMode=false }) {
  const wrapRef = useRef(null); const svgRef = useRef(null); const tipRef = useRef(null);
  const { width } = useResizeObserver(wrapRef);
  useEffect(()=>{ if(!wrapRef.current) return; tipRef.current?.destroy?.(); tipRef.current = attachTooltip(wrapRef.current); return ()=>tipRef.current?.destroy?.(); },[wrapRef]);
  useEffect(()=>{
    const data = Array.isArray(points) ? points : [];
    if (!data.length) return;
    const w = Math.max(800, width || 1200);
    const h = Math.max(600, Math.min(750, w * 0.6));
    const margin = { top: 60, right: 60, bottom: 100, left: 120 };
    const innerW = w - margin.left - margin.right;
    const innerH = h - margin.top - margin.bottom;
    const root = d3.select(svgRef.current).attr("viewBox", `0 0 ${w} ${h}`).attr("width", "100%").attr("height", "100%").style("max-width", `${w}px`).style("max-height", `${h}px`);
    root.selectAll("*").remove();
    const g = root.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
    const x = d3.scaleLinear().domain(d3.extent(data, d=>d.x)).nice().range([0, innerW]);
    const y = d3.scaleLinear().domain(d3.extent(data, d=>d.y)).nice().range([innerH, 0]);
    g.append("g").attr("transform", `translate(0,${innerH})`).call(d3.axisBottom(x)).selectAll("text").style("font-size","13px").attr("fill", "var(--axisInk)");
    g.append("g").call(d3.axisLeft(y)).selectAll("text").style("font-size","13px").attr("fill", "var(--axisInk)");
    const xMid = (x.domain()[0]+x.domain()[1])/2; const yMid = (y.domain()[0]+y.domain()[1])/2;
    g.append("rect").attr("x", x(xMid)).attr("y", 0).attr("width, height", null)
      .attr("width", innerW-x(xMid)).attr("height", y(yMid)).attr("fill", "var(--quadFill)").attr("opacity",0.6);
    g.append("rect").attr("x", 0).attr("y", yMid?y(yMid):innerH/2)
      .attr("width", x(xMid)).attr("height", innerH-(yMid?y(yMid):innerH/2)).attr("fill", "var(--quadFill)").attr("opacity",0.6);
    g.append("text").attr("x", innerW / 2).attr("y", innerH + 70).attr("text-anchor", "middle").attr("fill", "var(--axisInk)").style("font-size","14px").text(xLabel);
    g.append("text").attr("transform", "rotate(-90)").attr("x", -innerH / 2).attr("y", -80).attr("text-anchor", "middle").attr("fill", "var(--axisInk)").style("font-size","14px").text(yLabel);
    const tip = tipRef.current; const query = q.trim().toLowerCase();
    g.append("g").selectAll("circle").data(data).enter().append("circle")
      .attr("cx", d=>x(d.x)).attr("cy", d=>y(d.y))
      .attr("r", d => {
        const hit = query && (String(d.name||"").toLowerCase().includes(query) || String(d.club||"").toLowerCase().includes(query) || String(d.pos||"").toLowerCase().includes(query));
        const isMe = highlightName && d.name===highlightName;
        return hit||isMe ? 7.0 : 5.0;
      })
      .attr("fill", d => {
        const isHighlighted = highlightName && d.name === highlightName;
        return isHighlighted ? "#FFD700" : "#ff4040";
      })
      .attr("opacity", d => {
        const isHighlighted = highlightName && d.name === highlightName;
        return isHighlighted ? 1 : 0.7;
      })
      .style("cursor", "pointer")
      .attr("class", "player-dot")
      .on("mousemove",(e,d)=> tip?.show(e, `<div class="t-card">
          <div class="t-title">${d.name} • ${d.club||"?"}</div>
          ${d.pos?`<div class="t-row"><span>Pos</span><b>${d.pos}</b></div>`:""}
          <div class="t-row"><span>${xLabel}</span><b>${tf(d.x,2)}</b></div>
          <div class="t-row"><span>${yLabel}</span><b>${tf(d.y,2)}</b></div>
          <div style="margin-top:8px; font-size:12px; color:var(--muted)">Click to view profile</div>
        </div>`))
      .on("mouseleave",()=>tip?.hide())
      .on("click", (e,d) => {
        e.preventDefault();
        onPick && onPick(d);
        d3.selectAll(".player-dot").attr("fill", d => {
          const isHighlighted = highlightName && d.name === highlightName;
          return isHighlighted ? "#FFD700" : "#ff4040";
        });
      });
  },[points, width, xLabel, yLabel, q, highlightName, colorByPos, onPick]);
  return <div className="chartWrap" ref={wrapRef}><svg ref={svgRef}/></div>;
}



/* ===================== Sticky state ===================== */
function useStickyState(key, initial) {
  const [v, setV] = React.useState(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw != null ? JSON.parse(raw) : initial;
    } catch { return initial; }
  });
  React.useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(v)); } catch {}
  }, [key, v]);
  return [v, setV];
}


/* ---- HOTFIX: normalize value config from older localStorage blobs ---- */
function normalizeValueCfg(cfg){
  const FALLBACK = {
    leagueWeights: { elite:1.00, strong:0.83, solid:0.70, growth:0.60, develop:0.52 },
    baseScales:    { elite:6.2,  strong:4.8,  solid:3.5,  growth:2.6,  develop:2.0 },
    // wage knobs (scaled up a bit)
    wagePerM: 1600,                   // £/week per £1m True Value
    wageMaxMult: 1.45,                // cap multiplier
    wageFloor: 250,                   // never below this
    wageLeagueMults: { elite:1.00, strong:0.85, solid:0.70, growth:0.60, develop:0.50 },
  };
  const d = DEFAULT_VALUE_CONFIG || {};
  const out = { ...FALLBACK, ...d, ...(cfg||{}) };

  // Deep merge tiers so all five exist even if missing in saved cfg
  out.leagueWeights = {
    ...FALLBACK.leagueWeights,
    ...(d.leagueWeights||{}),
    ...((cfg && cfg.leagueWeights) || {})
  };
  out.baseScales = {
    ...FALLBACK.baseScales,
    ...(d.baseScales||{}),
    ...((cfg && cfg.baseScales) || {})
  };
  out.wageLeagueMults = {
    ...FALLBACK.wageLeagueMults,
    ...(d.wageLeagueMults||{}),
    ...((cfg && cfg.wageLeagueMults) || {})
  };

  // Ensure scalar fields exist
  out.wagePerM    = out.wagePerM    ?? FALLBACK.wagePerM;
  out.wageMaxMult = out.wageMaxMult ?? FALLBACK.wageMaxMult;
  out.wageFloor   = out.wageFloor   ?? FALLBACK.wageFloor;

  return out;
}

/* ===================== APP — PART 2/2 (FULL REPLACEMENT) ===================== */


/* NOTE:
   This file assumes PART 1/2 changes (CSS, Radar/HBar/Scatter, DEFAULT_VALUE_CONFIG) have been applied.
*/

/* ===================== Error Boundary ===================== */

/* Reuse helpers from PART 1 (assumed present in file): POS14, ROLE_BOOK, ROLE_STATS, ROLE_WEIGHTS,
   ROLE_BASELINES, ALL_ROLE_STATS, LABELS, numerify, parseMoneyRange, parseOneMoney, money, tf, clamp100,
   normalizeValueCfg, buildPercentileIndex, percentileFor, roleScoreFor, bestNearRole, expandFMPositions,
   famFromTokens, attachTooltip, useResizeObserver, Radar, HBar, Scatter, etc.
   (These are defined in PART 1/2 as you applied.)
*/

/* ===================== APP ===================== */
export default function App(){
  /* ---------- UI Theme / Mode ---------- */
  const [themeName, setThemeName] = useStickyState("ui:theme","sleek");
  const theme = THEMES[themeName] || THEMES.sleek;
  const [mode, setMode] = useStickyState("ui:mode","Player Profile");

  /* ---------- Data ---------- */
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState("Load a CSV or HTML table exported from your data source.");

  /* ---------- Filters ---------- */
  const [posCohort, setPosCohort] = useStickyState("flt:posCohort", POS14);
  const [minMinutes, setMinMinutes] = useStickyState("flt:minMinutes", 600);
  const [maxAge, setMaxAge] = useStickyState("flt:maxAge", 33);

  /* ---------- Search (buffered + applied) ---------- */
  const [searchQuery, setSearchQuery] = useStickyState("flt:q:query", "");
  const [searchApplied, setSearchApplied] = useStickyState("flt:applied", false);
  
  const handleSearch = useCallback((value) => {
    setSearchQuery(value);
    setSearchApplied(!!value);
  }, [setSearchQuery, setSearchApplied]);  const clearSearch = useCallback(()=>{
    handleSearch("");
  }, [handleSearch]);

  /* ---------- Selections ---------- */
  const [player, setPlayer] = useStickyState("sel:player", "");
  const [role, setRole] = useStickyState("sel:role", Object.keys(ROLE_STATS)[0] || "");

  /* ---------- Scatter & stat selects ---------- */
  const [roleX, setRoleX] = useStickyState("scatter:roleX", Object.keys(ROLE_STATS)[0] || "");
  const [roleY, setRoleY] = useStickyState("scatter:roleY", Object.keys(ROLE_STATS)[1] || Object.keys(ROLE_STATS)[0] || "");

  const allStats = useMemo(()=> Array.from(new Set([ ...Object.values(ROLE_BOOK).flatMap(r => Object.keys(r.weights)) ])), []);
  const [statX, setStatX] = useStickyState("scatter:statX", allStats[0] || "Shots/90");
  const [statY, setStatY] = useStickyState("scatter:statY", allStats[1] || "SoT/90");

  /* ---------- Value model config ---------- */
  const [valueCfg, setValueCfg] = useStickyState("value:cfg", DEFAULT_VALUE_CONFIG);
  const safeValueCfg = useMemo(() => normalizeValueCfg(valueCfg), [valueCfg]);

  /* ---------- Computation scope ---------- */
  const SCOPE_OPTIONS = ["Filtered Cohort","All Loaded","Role Baseline"];
  const [compScope, setCompScope] = useStickyState("comp:scope", "Filtered Cohort");

  /* ---------- Custom archetype ---------- */
  const [customName, setCustomName] = useStickyState("custom:name", "Custom Archetype");
  const [customBaseline, setCustomBaseline] = useStickyState("custom:baseline", ["M (C)"]);
  const [customWeights, setCustomWeights] = useStickyState("custom:weights", { "Progressive Passes/90": 1.4, "Key Passes/90": 1.2, "Dribbles/90": 1.2 });

  /* ---------- Inject theme CSS ---------- */
  useEffect(()=>{
    const style = document.createElement("style");
    style.setAttribute("data-app-css","1");
    style.innerHTML = CSS(theme, themeName);
    document.head.appendChild(style);
    return ()=>{ try{ document.head.removeChild(style);}catch{} };
  }, [themeName]);

  /* ---------- File loading ---------- */
  async function handleFile(e){
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setStatus(`Loading ${file.name}…`);
      const ext = file.name.toLowerCase().split(".").pop();
      if (ext === "csv") {
        await new Promise((resolve, reject) => {
          Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (res) => {
              const rowsN = normalizeHeadersRowObjects(res.data || []);
              setRows(rowsN);
              setStatus(`Loaded ${rowsN.length} rows.`);
              resolve();
            },
            error: (err) => reject(err),
          });
        });
      } else if (ext === "html" || ext === "htm") {
        const rowsN = await parseHtmlTable(file);
        setRows(normalizeHeadersRowObjects(rowsN));
        setStatus(`Loaded ${rowsN.length} rows from HTML table.`);
      } else {
        setStatus("Unsupported file. Please load CSV or HTML.");
      }
    } catch (err) {
      console.error(err);
      setStatus(`Failed: ${String(err?.message || err)}`);
    }
  }

  /* ---------- Filtered rows (uses only applied searchQuery) ---------- */
  const filteredRows = useMemo(() => {
    const cohort = new Set(posCohort.map(normToken));
    return rows.filter(r => {
      const mins = numerify(r["Minutes"]);
      const age = numerify(r["Age"]);
      const tokens = expandFMPositions(r["Pos"]);
      const hasPos = tokens.some(t => cohort.has(normToken(t)));
      const minutesOk = !Number.isFinite(minMinutes) ? true : (Number.isFinite(mins) ? mins >= minMinutes : false);
      const ageOk = !Number.isFinite(maxAge) ? true : (!Number.isFinite(age) ? true : age <= maxAge);
      const q = (searchQuery || "").trim().toLowerCase();
      const name = String(r["Name"]||"").toLowerCase();
      const club = String(r["Club"]||"").toLowerCase();
      const pos = String(r["Pos"]||"").toLowerCase();
      const qOk = !q || name.includes(q) || club.includes(q) || pos.includes(q);
      return hasPos && minutesOk && ageOk && qOk;
    });
  }, [rows, posCohort, minMinutes, maxAge, searchQuery]);

  /* ---------- Percentile scope rows & index ---------- */
  const scopeRows = useMemo(() => {
    if (compScope === "All Loaded") return rows;
    if (compScope === "Role Baseline") {
      const base = new Set((ROLE_BASELINES[role]||[]).map(normToken));
      return rows.filter(r => {
        const toks = expandFMPositions(r["Pos"]);
        return toks.some(t => base.has(normToken(t)));
      });
    }
    return filteredRows;
  }, [compScope, rows, filteredRows, role]);

  // Base percentile index on all rows for consistent stats
  const pctIndex = useMemo(() => buildPercentileIndex(rows, allStats), [rows, allStats]);
  
  // Scope-specific percentile index for display
  // If the scope reduces to <=1 rows (e.g. user filtered to a single player), fall back
  // to the full `rows` so percentiles are meaningful instead of defaulting to 50%.
  const displayScopeRows = useMemo(() => {
    try {
      return (Array.isArray(scopeRows) && scopeRows.length > 1) ? scopeRows : rows;
    } catch { return rows; }
  }, [scopeRows, rows]);

  const scopePctIndex = useMemo(() => buildPercentileIndex(displayScopeRows, allStats), [displayScopeRows, allStats]);

  /* ---------- Players list & selection sanity ---------- */
  const players = useMemo(() => filteredRows.map(r => r["Name"]).filter(Boolean), [filteredRows]);
  useEffect(() => {
    if (!player && players.length) setPlayer(players[0]);
    if (player && !players.includes(player) && players.length) setPlayer(players[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [players]);

  /* ---------- Helpers ---------- */
  const rowByName = useMemo(() => {
    const m = new Map();
    for (const r of filteredRows) m.set(r["Name"], r);
    return m;
  }, [filteredRows]);

  const roleScoreOfRow = useCallback((r, roleName) => Number(roleScoreFor(r, roleName, scopePctIndex) || 0), [scopePctIndex]);

  const bestRoleCache = useMemo(() => {
    const map = new Map();
    for (const r of filteredRows) map.set(r["Name"], bestNearRole(r, pctIndex)); // {role, score}
    return map;
  }, [filteredRows, pctIndex]);

  function bestRoleRank(name){
    const r = rowByName.get(name);
    if (!r) return { rank: NaN, of: 0, role: null, score: 0 };
    const br = bestRoleCache.get(name) || { role:null, score:0 };
    if (!br.role) return { rank: NaN, of: 0, role: null, score: 0 };
    const base = new Set((ROLE_BASELINES[br.role]||[]).map(normToken));
    const cohort = filteredRows.filter(row => {
      const toks = expandFMPositions(row["Pos"]);
      return toks.some(t=>base.has(normToken(t)));
    });
    const ranked = cohort
      .map(rr => ({ n: rr["Name"], s: roleScoreOfRow(rr, br.role) }))
      .sort((a,b)=>b.s - a.s);
    const idx = ranked.findIndex(x => x.n === name);
    return { rank: idx>=0? idx+1 : NaN, of: ranked.length, role: br.role, score: br.score };
  }

  /* ---------- Wage parsing (current wage from dataset) ---------- */
  const wageWeeklyOf = useCallback((row)=>{
    const raw = getCell(row, "Wage");
    const v = parseOneMoney(raw);
    return Number.isFinite(v) ? v : NaN;
  },[]);

  /* ---------- Market-adjusted value wrapper (damped extremes + rank uplift) ---------- */
  const marketAdjustedValueM = useCallback((name)=>{
    const r = rowByName.get(name); if (!r) return NaN;
    const base = trueValueOf(r, pctIndex, safeValueCfg); // { valueM, bestRole, bestScore, group }
    let { valueM, bestRole, bestScore, group } = base;

    // rank uplift (scaled by rank share)
    const rk = bestRoleRank(name);
    const rankShare = Number.isFinite(rk.rank) && rk.of>0 ? (rk.of - rk.rank + 1) / rk.of : 0;
    const rankFactor = 1 + (safeValueCfg.topRankPremiumMax || 0.60) * rankShare * (group === "elite" ? 1 : 0.45);
    valueM *= rankFactor;

    // slight extra for elite forwards (kept conservative)
    if (group === "elite" && famFromTokens(expandFMPositions(getCell(r,"Pos"))) === "FW") {
      const fwPrem = safeValueCfg.eliteFwPremium || 0.25;
      valueM *= (1 + fwPrem * 0.7);
    }

    // enforce elite floors for very top scorers
    if (group === "elite" && bestScore >= 90) {
      const floors = safeValueCfg.eliteTopFloorM || {};
      const famKey = famFromTokens(expandFMPositions(getCell(r,"Pos"))) || "MF";
      const floorM = floors[famKey] || 0;
      if (valueM < floorM) valueM = floorM;
    }

    // damping (log-space compression) to reduce extreme tails
    try {
      const safe = Math.max(0.1, valueM);
      const dampFactor = (group === "elite") ? 0.94 : 0.97;
      valueM = Math.exp(Math.log(safe) * dampFactor);
    } catch (err) { /* ignore */ }

    return valueM;
  }, [rowByName, pctIndex, safeValueCfg]);

  /* ---------- True value, buyAt (wrapped) ---------- */
  const trueValue = useCallback((name)=>{ const m = marketAdjustedValueM(name); return Number.isFinite(m) ? m*1e6 : NaN; }, [marketAdjustedValueM]);
  const buyAt = useCallback((name)=>{ const m = marketAdjustedValueM(name); if (!Number.isFinite(m)) return NaN; return m * (safeValueCfg.buyDiscount || 0.95) * 1e6; }, [marketAdjustedValueM, safeValueCfg]);

  /* ---------- Fair wage + max wage (with elite clamp and respect current) ---------- */
  const fairWage = useCallback((name)=>{ // £/week
    const r = rowByName.get(name); if (!r) return NaN;
    const valM = marketAdjustedValueM(name);
    if (!Number.isFinite(valM)) return NaN;

    const age = numerify(getCell(r,"Age"));
    const pts = Object.entries(safeValueCfg.wageAgeBoost||{}).map(([k,v])=>[+k, v]).sort((a,b)=>a[0]-b[0]);
    const ageBoost = (()=> {
      if (!Number.isFinite(age) || !pts.length) return 1;
      if (age <= pts[0][0]) return pts[0][1];
      if (age >= pts[pts.length-1][0]) return pts[pts.length-1][1];
      for (let i=1;i<pts.length;i++){
        const [x1,y1] = pts[i-1], [x2,y2] = pts[i];
        if (age >= x1 && age <= x2) return y1 + (y2-y1) * ((age-x1)/(x2-x1));
      }
      return 1;
    })();

    const league = String(getCell(r,"League")||"");
    const group = leagueGroupOf(league);
    let lfac = (safeValueCfg.wageLeagueFactor||{})[group] ?? 1;

    // clamp elite multiplier to avoid runaway wages from model extremes
    if (group === "elite") lfac = Math.min(lfac, 1.45);

    const floor = Math.max(safeValueCfg.wageMinAbsolute||0, (safeValueCfg.wageGroupFloor||{})[group] || 0);
    const raw = (safeValueCfg.wagePerM||4800) * valM * lfac * ageBoost;
    return Math.max(floor, raw);
  }, [rowByName, marketAdjustedValueM, safeValueCfg]);

  const maxWage = useCallback((name)=>{ // £/week
    const r = rowByName.get(name); if (!r) return NaN;
    const modelMax = (fairWage(name) || 0) * (safeValueCfg.wageMaxMult || 1.6);
    const current = wageWeeklyOf(r);
    const respect = Number.isFinite(current) ? current * (safeValueCfg.wageRespectCurrentMult || 1.10) : 0;
    return Math.max(modelMax, respect);
  }, [rowByName, fairWage, wageWeeklyOf, safeValueCfg]);

  /* ---------- Scatter datasets ---------- */
  const roleMatrixPoints = useMemo(()=>{
    return filteredRows.map(r => ({
      name: r["Name"],
      pos: (expandFMPositions(r["Pos"])[0]||""),
      club: r["Club"],
      x: roleScoreOfRow(r, roleX),
      y: roleScoreOfRow(r, roleY),
    })).filter(p => Number.isFinite(p.x) && Number.isFinite(p.y));
  }, [filteredRows, roleX, roleY, roleScoreOfRow]);

  const statScatterPoints = useMemo(()=>{
    return filteredRows.map(r => ({
      name: r["Name"],
      pos: (expandFMPositions(r["Pos"])[0]||""),
      club: r["Club"],
      x: numerify(getCell(r, statX)),
      y: numerify(getCell(r, statY)),
    })).filter(p => Number.isFinite(p.x) && Number.isFinite(p.y));
  }, [filteredRows, statX, statY]);

  /* ===================== Modes ===================== */

  function PlayerProfileMode(){
    const r = rowByName.get(player);
    const headerRef = useRef(null);
    const bestBoxRef = useRef(null);
    const wageRef = useRef(null);

    useEffect(()=>{ if (!headerRef.current) return; const t=attachTooltip(headerRef.current); headerRef.current.__tip=t; return ()=>t?.destroy?.(); },[]);
    useEffect(()=>{ if (!bestBoxRef.current) return; const t=attachTooltip(bestBoxRef.current); bestBoxRef.current.__tip=t; return ()=>t?.destroy?.(); },[]);
    useEffect(()=>{ if (!wageRef.current) return; const t=attachTooltip(wageRef.current); wageRef.current.__tip=t; return ()=>t?.destroy?.(); },[]);

    if (!r) return <div className="card"><div className="cardBody">Select a player</div></div>;

    const br = bestRoleCache.get(player) || { role:null, score:0 };
    const bestRole = br.role || Object.keys(ROLE_STATS)[0] || "";
    const bestScore = Number(br.score || 0);

    // compute player's top two roles using main pctIndex for consistency
    const roleScores = Object.keys(ROLE_BOOK).map(roleName => {
      const baseline = ROLE_BASELINES[roleName] || [];
      if (!sharesAny(expandFMPositions(getCell(r,"Pos")), baseline)) return null;
      return { roleName, score: roleScoreFor(r, roleName, pctIndex) || 0 };
    }).filter(Boolean).sort((a,b)=>b.score-a.score);
    const topRoles = roleScores.slice(0,2).map(x => x.roleName);
    const topRoleA = topRoles[0] || bestRole;
    const topRoleB = topRoles[1] || Object.keys(ROLE_STATS)[0] || "";

    const statsBestRole = ROLE_STATS[bestRole] || [];
    const radarSeries = [{
      name: `${player} — ${bestRole}`,
      color: "var(--accent)",
      slices: statsBestRole.map(st => {
        const raw = numerify(getCell(r, st));
        // Use the main pctIndex for core calculations and scopePctIndex for display
        const corePct = percentileFor(pctIndex, st, raw);
        const displayPct = percentileFor(scopePctIndex, st, raw);
        return { label: LABELS.get(st)||st, raw, pct: displayPct, corePct };
      })
    }];

    const mins = numerify(r["Minutes"]);
    const age  = numerify(r["Age"]);
    const pos  = r["Pos"] || "—";
    const club = r["Club"] || "—";
    const league = r["League"] || "—";

    const goals   = Number.isFinite(numerify(r["Goals"])) ? numerify(r["Goals"]) : numerify(r["Gls"]);
    const assists = Number.isFinite(numerify(r["Assist"])) ? numerify(r["Assist"]) : numerify(r["Assists"]);

    const gameValRaw = getCell(r,"Transfer Value");
    const gameValMid = parseMoneyRange(gameValRaw).mid;
    const tv = trueValue(player);
    const ba = buyAt(player);

    const currentW = wageWeeklyOf(r);
    const fw = fairWage(player);
    const mw = maxWage(player);

    const bestPairs = allStats.map(st => {
      const raw = numerify(getCell(r, st));
      const pct = percentileFor(scopePctIndex, st, raw);
      return { st, label: LABELS.get(st)||st, raw, pct };
    }).filter(x=>Number.isFinite(x.pct))
      .sort((a,b)=>b.pct-a.pct)
      .slice(0, 12);

    // role matrix dataset for top roles
    const roleMatrixForTop = useMemo(()=> {
      const rx = topRoleA; const ry = topRoleB;
      const pts = filteredRows.map(rr => ({
        name: rr["Name"],
        club: rr["Club"],
        pos: expandFMPositions(rr["Pos"])[0]||"",
        x: roleScoreOfRow(rr, rx),
        y: roleScoreOfRow(rr, ry)
      })).filter(p => Number.isFinite(p.x) && Number.isFinite(p.y));
      return { pts, rx, ry };
    }, [filteredRows, topRoleA, topRoleB, roleScoreOfRow]);

    return (
      <>
        <div className="playerBar" ref={headerRef}>
          <div className="playerHeader">
            <div className="playerHeaderTop">
              <div className="phName">{player}</div>
              <div className="badge">{pos}</div>
              <div className="badge">{club}</div>
              {league && <div className="badge">{league}</div>}
            </div>

            <div className="phKpis">
              <div className="phKpi"><div>Age</div><b>{Number.isFinite(age)?tf(age,0):"—"}</b></div>
              <div className="phKpi"><div>Minutes</div><b>{Number.isFinite(mins)?tf(mins,0):"—"}</b></div>
              <div className="phKpi"><div>Goals</div><b>{Number.isFinite(goals)?tf(goals,0):"—"}</b></div>
              <div className="phKpi"><div>Assists</div><b>{Number.isFinite(assists)?tf(assists,0):"—"}</b></div>

              <div className="phKpi"><div>Game Value</div><b>{ Number.isFinite(gameValMid) ? money(gameValMid) : (gameValRaw || "—") }</b></div>
              <div className="phKpi"><div>True Value</div><b>{money(tv)}</b></div>
              <div className="phKpi"><div>Buy At</div><b>{money(ba)}</b></div>
              <div className="phKpi" style={{fontSize: "10px"}}><div>Best Role</div><b>{bestRole}</b></div>
              <div className="phKpi"><div>Best Score</div><b>{Number.isFinite(bestScore)?bestScore.toFixed(2):"—"}</b></div>

              <div className="phKpi" ref={wageRef}>
                <div>Current Wage</div><b>{Number.isFinite(currentW)? money(currentW)+"/wk" : "—"}</b>
              </div>
              <div className="phKpi">
                <div>Fair Wage</div><b>{money(fw)}/wk</b>
              </div>
              <div className="phKpi">
                <div>Max Wage</div><b>{money(mw)}/wk</b>
              </div>
            </div>
          </div>
        </div>

        <div style={{display: "flex", flexDirection: "column", gap: "12px", padding: "0 12px"}}>
          {/* Compact Row: Radar and Stats side by side */}
          <div style={{display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", alignItems: "stretch"}}>
            
            {/* Pizza Chart - Compact */}
            <div className="card">
              <div className="cardHead" style={{padding: "8px 12px"}}>
                <div style={{fontWeight:800, fontSize: "14px"}}>Role Pizza — {bestRole}</div>
                <div className="badge" style={{fontSize: "10px"}}>vs {compScope}</div>
              </div>
              <div className="cardBody" style={{padding: "8px"}}>
                <div style={{fontSize: "11px", color: "var(--muted)", marginBottom: "4px"}}>
                  {player} — {bestRole}
                </div>
                <div style={{width: "100%", height: "450px"}}>
                  <Pizza 
                    playerName={player}
                    playerData={r}
                    roleStats={statsBestRole}
                    compScope={compScope}
                    pctIndex={pctIndex}
                  />
                </div>
              </div>
            </div>

            {/* Key Statistics - Compact */}
            <div className="card">
              <div className="cardHead" style={{padding: "8px 12px"}}>
                <div style={{fontWeight:800, fontSize: "14px"}}>Key Statistics</div>
                <div className="badge" style={{fontSize: "10px"}}>Top 12</div>
              </div>
              <div className="cardBody" ref={bestBoxRef} style={{padding:"8px", maxHeight: "300px", overflowY: "auto"}}>
                {bestPairs.map((pair,i)=>(
                  <div key={i} style={{
                    display: "flex", 
                    justifyContent: "space-between", 
                    alignItems: "center", 
                    padding: "4px 0",
                    borderBottom: i < bestPairs.length - 1 ? "1px solid var(--cardBorder)" : "none",
                    fontSize: "12px"
                  }}>
                    <div style={{fontWeight:600, overflow: "hidden", textOverflow: "ellipsis"}}>{pair.label}</div>
                    <div style={{display: "flex", alignItems: "center", gap: "6px", flexShrink: 0}}>
                      <div style={{color: "var(--muted)", fontSize: "11px"}}>{tf(pair.raw,2)}</div>
                      <div style={{fontWeight:800, fontSize: "13px", color: pair.pct >= 90 ? "var(--accent)" : "inherit", minWidth: "40px", textAlign: "right"}}>
                        {tf(pair.pct,1)}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Role Matrix - Full Width but Compact */}
          <div className="card">
            <div className="cardHead" style={{padding: "8px 12px"}}>
              <div style={{fontWeight:800, fontSize: "14px"}}>Role Matrix — {topRoleA} vs {topRoleB}</div>
              <div className="badge" style={{fontSize: "10px"}}>Comparison</div>
            </div>
            <div className="cardBody" style={{padding: "12px"}}>
              <div style={{width: "100%", height: "750px", overflow: "hidden"}}>
                <Scatter
                  points={roleMatrixForTop.pts}
                  xLabel={`${roleMatrixForTop.rx} score`}
                  yLabel={`${roleMatrixForTop.ry} score`}
                  q=""
                  highlightName={player}
                  isProfileMode={true}
                  onPick={name => setPlayer(name && name.name ? name.name : (name || ""))}
                />
              </div>
              <div style={{marginTop: "8px", fontSize: "11px", color: "var(--muted)"}}>
                Highlighted: <strong>{player}</strong> • Roles: <strong>{topRoleA}</strong>{topRoleB ? `, ${topRoleB}` : ""}
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  function RadarMode(){
    const r = rowByName.get(player);
    if (!r) return <div className="card"><div className="cardBody">Select a player</div></div>;
    const stats = ROLE_STATS[role] || [];
    const series = [{
      name: `${player} — ${role}`,
      color: "var(--accent)",
      slices: stats.map(st => {
        const raw = numerify(getCell(r, st));
        const pct = percentileFor(scopePctIndex, st, raw);
        return { label: LABELS.get(st)||st, raw, pct };
      })
    }];
    return (
      <div className="card">
        <div className="cardHead">
          <div style={{fontWeight:800, fontSize: "1.1em"}}>Radar Chart — {player} ({role})</div>
          <div className="badge">Percentiles vs {compScope}</div>
        </div>
        <div className="cardBody"><Radar series={series}/></div>
      </div>
    );
  }

  function PercentilesMode(){
    const r = rowByName.get(player);
    if (!r) return <div className="card"><div className="cardBody">Select a player</div></div>;
    const pairs = ALL_ROLE_STATS.map(st => {
      const raw = numerify(getCell(r, st));
      const pct = percentileFor(scopePctIndex, st, raw);
      return { stat: st, pct, raw };
    }).filter(x => Number.isFinite(x.pct));
    pairs.sort((a,b)=>b.pct-a.pct);
    return (
      <div className="card">
        <div className="cardHead">
          <div style={{fontWeight:800, fontSize: "1.1em"}}>Percentiles — {player}</div>
          <div className="badge">vs {compScope}</div>
        </div>
        <div className="cardBody scroll">
          <table className="table">
            <thead><tr><th>Stat</th><th>Value</th><th>Percentile</th></tr></thead>
            <tbody>
              {pairs.map((p,i)=>(
                <tr key={i}>
                  <td>{LABELS.get(p.stat)||p.stat}</td>
                  <td>{Number.isFinite(p.raw) ? tf(p.raw,2) : "—"}</td>
                  <td>{tf(p.pct,2)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  function RoleMatrixMode(){
    return (
      <div className="card">
        <div className="cardHead"><div style={{fontWeight:800, fontSize: "1.1em"}}>Role Matrix — {roleX} vs {roleY}</div></div>
        <div className="cardBody">
          <Scatter
            points={roleMatrixPoints}
            xLabel={`${roleX} score`}
            yLabel={`${roleY} score`}
            q={searchQuery}
            highlightName={player}
            onPick={name => setPlayer(name && name.name ? name.name : (name || ""))}
          />
        </div>
      </div>
    );
  }

  function StatScatterMode(){
    return (
      <div className="card">
        <div className="cardHead"><div style={{fontWeight:800, fontSize: "1.1em"}}>Stat Scatter — {LABELS.get(statX)||statX} vs {LABELS.get(statY)||statY}</div></div>
        <div className="cardBody">
          <Scatter
            points={statScatterPoints}
            xLabel={LABELS.get(statX)||statX}
            yLabel={LABELS.get(statY)||statY}
            q={searchQuery}
            colorByPos
            highlightName={player}
            onPick={name => setPlayer(name && name.name ? name.name : (name || ""))}
          />
        </div>
      </div>
    );
  }

  /* ---------- Leaders / Best Roles / Stat Leaders ---------- */
  function roleLeadersData(roleName, limit=30){
    const arr = filteredRows
      .map(r => ({ name:r["Name"], club: r["Club"], pos: (expandFMPositions(r["Pos"])[0]||""), score: roleScoreOfRow(r, roleName) }))
      .filter(x => Number.isFinite(x.score))
      .sort((a,b)=>b.score-a.score)
      .slice(0, limit);
    return arr;
  }
  function bestRolesData(limit=30){
    const arr = filteredRows
      .map(r => {
        const br = bestRoleCache.get(r["Name"]) || { role:null, score:0 };
        return { name:r["Name"], club:r["Club"], pos:(expandFMPositions(r["Pos"])[0]||""), role: br.role, score: br.score };
      })
      .filter(x => x.role && Number.isFinite(x.score))
      .sort((a,b)=>b.score-a.score)
      .slice(0, limit);
    return arr;
  }
  function statLeadersData(stat, limit=30){
    const arr = filteredRows
      .map(r => ({ name:r["Name"], club:r["Club"], pos:(expandFMPositions(r["Pos"])[0]||""), v: numerify(getCell(r, stat)) }))
      .filter(x => Number.isFinite(x.v))
      .sort((a,b)=>b.v-a.v)
      .slice(0, limit);
    return arr;
  }

  function RoleLeadersMode(){
    const leaders = roleLeadersData(role, 30);
    const items = leaders.map(l => ({ label: `${l.name} — ${l.pos} • ${l.club||"—"}`, value: Number(l.score.toFixed(2)) }));
    return (
      <div className="card">
        <div className="cardHead"><div style={{fontWeight:800}}>Role Leaders — {role}</div></div>
        <div className="cardBody">
          <HBar items={items} titleFmt={(v)=>v.toFixed(2)} valueMax={100}/>
        </div>
      </div>
    );
  }

  function BestRolesMode(){
    const bests = bestRolesData(30);
    const items = bests.map(l => ({ label: `${l.name} — ${l.role}`, value: Number(l.score.toFixed(2)) }));
    return (
      <div className="card">
        <div className="cardHead"><div style={{fontWeight:800}}>Best Roles — Top Scores</div></div>
        <div className="cardBody"><HBar items={items} titleFmt={(v)=>v.toFixed(2)} valueMax={100}/></div>
      </div>
    );
  }

  function StatLeadersMode(){
    const [localStat, setLocalStat] = useState(statX);
    useEffect(()=>setLocalStat(statX),[statX]);
    const leaders = statLeadersData(localStat, 30);
    const items = leaders.map(l => ({ label: `${l.name} — ${l.pos} • ${l.club||"—"}`, value: Number(l.v.toFixed(2)) }));
    return (
      <div className="card">
        <div className="cardHead" style={{gap:12}}>
          <div style={{fontWeight:800}}>Stat Leaders</div>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            <select className="input" value={localStat} onChange={(e)=>{ setLocalStat(e.target.value); setStatX(e.target.value); }}>
              {allStats.map(s => <option key={s} value={s}>{LABELS.get(s)||s}</option>)}
            </select>
          </div>
        </div>
        <div className="cardBody">
          <HBar items={items} titleFmt={(v)=>v.toFixed(2)} valueMax={Math.max(10, ...items.map(i=>i.value))}/>
        </div>
      </div>
    );
  }

  /* ---------- Custom Archetype Mode ---------- */
  function CustomArchetypeMode(){
    const label = customName || "Custom Archetype";
    const weights = customWeights;
    const baseline = customBaseline;

    const leaders = filteredRows
      .filter(r => sharesAny(expandFMPositions(r["Pos"]), baseline))
      .map(r => ({ r, score: roleScoreFor(r, { weights, baseline }, pctIndex) }))
      .map(x => ({ name:x.r["Name"], club:x.r["Club"], pos:(expandFMPositions(x.r["Pos"])[0]||""), score:x.score }))
      .filter(x => Number.isFinite(x.score))
      .sort((a,b)=>b.score-a.score)
      .slice(0, 30);

    const items = leaders.map(l => ({ label: `${l.name} — ${l.pos} • ${l.club||"—"}`, value: Number(l.score.toFixed(2)) }));

    const toggleBaseline = (p) => {
      setCustomBaseline(prev => prev.includes(p) ? prev.filter(x=>x!==p) : [...prev, p]);
    };
    const addStat = () => {
      const pick = allStats.find(s => !(s in customWeights));
      if (pick) setCustomWeights({...customWeights, [pick]: 1.0});
    };
    const removeStat = (s) => {
      const next = {...customWeights}; delete next[s]; setCustomWeights(next);
    };

    return (
      <>
        <div className="card">
          <div className="cardHead"><div style={{fontWeight:800}}>Custom Archetype — Editor</div></div>
          <div className="cardBody">
            <div className="row" style={{gap:12, alignItems:"flex-start"}}>
              <div className="col">
                <label className="lbl">Name</label>
                <input className="input" value={customName} onChange={e=>setCustomName(e.target.value)} />
              </div>
              <div className="col">
                <label className="lbl">Baseline positions</label>
                <div className="chipRow">
                  {POS14.map(p => (
                    <button key={p} className={`chip ${customBaseline.includes(p)?"active":""}`} onClick={()=>toggleBaseline(p)}>{p}</button>
                  ))}
                </div>
              </div>
            </div>

            <div style={{marginTop:10}}>
              <div className="row" style={{alignItems:"center"}}>
                <div style={{fontWeight:700}}>Stats & weights</div>
                <button className="btn ghost tight" style={{marginLeft:"auto"}} onClick={addStat}>+ Add stat</button>
              </div>
              {Object.keys(customWeights).map(s => (
                <div key={s} className="row">
                  <div className="col">
                    <select className="input" value={s} onChange={(e)=>{
                      const val = e.target.value;
                      const w = customWeights[s];
                      const next = {...customWeights}; delete next[s]; next[val] = w; setCustomWeights(next);
                    }}>
                      {allStats.map(st => <option key={st} value={st}>{LABELS.get(st)||st}</option>)}
                    </select>
                  </div>
                  <div style={{width:120}}>
                    <input className="input" type="number" step="0.1" value={customWeights[s]}
                      onChange={(e)=> setCustomWeights({...customWeights, [s]: Number(e.target.value)||0})}/>
                  </div>
                  <button className="btn ghost alt tight" onClick={()=>removeStat(s)}>Remove</button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="cardHead"><div style={{fontWeight:800}}>Custom Archetype — Leaders ({label})</div></div>
          <div className="cardBody">
            <HBar items={items} titleFmt={(v)=>v.toFixed(2)} valueMax={100}/>
          </div>
        </div>
      </>
    );
  }

  /* ---------- Config Mode ---------- */
  function ConfigMode(){
    return (
      <>
        <div className="card">
          <div className="cardHead"><div style={{fontWeight:800}}>Configuration Center</div></div>
          <div className="cardBody">
            <div className="row" style={{gap:24, alignItems:"flex-start"}}>
              <div className="col">
                <h3 style={{margin:"0 0 16px 0", color:"var(--accent)"}}>Selection Controls</h3>
                
                <label className="lbl">Archetype</label>
                <select className="input" value={role} onChange={e=>setRole(e.target.value)}>
                  {Object.keys(ROLE_STATS).map(k => <option key={k} value={k}>{k}</option>)}
                </select>

                <label className="lbl">Matrix roles</label>
                <select className="input" value={roleX} onChange={e=>setRoleX(e.target.value)}>
                  {Object.keys(ROLE_STATS).map(k => <option key={k} value={k}>{k}</option>)}
                </select>
                <select className="input" value={roleY} onChange={e=>setRoleY(e.target.value)}>
                  {Object.keys(ROLE_STATS).map(k => <option key={k} value={k}>{k}</option>)}
                </select>

                <label className="lbl">Scatter stats</label>
                <select className="input" value={statX} onChange={e=>setStatX(e.target.value)}>
                  {allStats.map(k => <option key={k} value={k}>{LABELS.get(k)||k}</option>)}
                </select>
                <select className="input" value={statY} onChange={e=>setStatY(e.target.value)}>
                  {allStats.map(k => <option key={k} value={k}>{LABELS.get(k)||k}</option>)}
                </select>
              </div>

              <div className="col">
                <h3 style={{margin:"0 0 16px 0", color:"var(--accent)"}}>Value Model Configuration</h3>
                
                <div className="row">
                  <div className="col">
                    <label className="lbl">Buy Discount (0–1)</label>
                    <input className="input" type="number" step="0.01" min="0" max="1"
                      value={safeValueCfg.buyDiscount}
                      onChange={e => setValueCfg({...valueCfg, buyDiscount: Math.max(0, Math.min(1, Number(e.target.value)||0.95))})}/>
                  </div>
                </div>

                <div className="row">
                  <div className="col">
                    <label className="lbl">Score Power (dampen)</label>
                    <input className="input" type="number" step="0.05" min="0.5" max="2"
                      value={safeValueCfg.scorePower}
                      onChange={e => setValueCfg({...valueCfg, scorePower: Number(e.target.value)||1.00})}/>
                  </div>
                  <div className="col">
                    <label className="lbl">Min Minutes Ref</label>
                    <input className="input" type="number" step="60"
                      value={safeValueCfg.minMinutesRef}
                      onChange={e => setValueCfg({...valueCfg, minMinutesRef: Math.max(60, Number(e.target.value)||1800)})}/>
                  </div>
                </div>

                <label className="lbl">League Weights</label>
                <div className="row">
                  {["elite","strong","solid","growth","develop"].map(k=>(
                    <div className="col" key={k}>
                      <div className="lbl" style={{marginBottom:6}}>{k}</div>
                      <input className="input" type="number" step="0.05" min="0.2" max="1.6"
                        value={safeValueCfg.leagueWeights[k]}
                        onChange={e => setValueCfg({
                          ...valueCfg,
                          leagueWeights: { ...(valueCfg.leagueWeights||{}), [k]: Number(e.target.value)||safeValueCfg.leagueWeights[k] }
                        })}
                      />
                    </div>
                  ))}
                </div>

                <label className="lbl" style={{marginTop:8}}>Wage Settings</label>
                <div className="row">
                  <div className="col">
                    <div className="lbl">£/wk per £1m TV</div>
                    <input className="input" type="number" step="50" min="1000" max="10000"
                      value={safeValueCfg.wagePerM}
                      onChange={e=>setValueCfg({...valueCfg, wagePerM: Number(e.target.value)||safeValueCfg.wagePerM})}/>
                  </div>
                  <div className="col">
                    <div className="lbl">Max Wage Mult</div>
                    <input className="input" type="number" step="0.01" min="1" max="2"
                      value={safeValueCfg.wageMaxMult}
                      onChange={e=>setValueCfg({...valueCfg, wageMaxMult: Math.max(1, Number(e.target.value)||safeValueCfg.wageMaxMult)})}/>
                  </div>
                </div>
              </div>
            </div>
            
            <div style={{marginTop:24, padding:16, background:"var(--cardBg)", borderRadius:8, border:"1px solid var(--cardBorder)"}}>
              <div style={{fontSize:14, color:"var(--muted)"}}>
                Configuration changes are applied immediately. Use the sidebar for quick filters and player selection, 
                then return to other modes to see your data visualizations.
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  /* ---------- Player Finder (no results until Apply) ---------- */
  function PlayerFinderMode(){
    const [pfRole, setPfRole] = useStickyState("pf:role", role);
    const [pfMinScore, setPfMinScore] = useStickyState("pf:minScore", 70);
    const [pfUseStat, setPfUseStat] = useStickyState("pf:useStat", statX || allStats[0] || "");
    const [pfMinStat, setPfMinStat] = useStickyState("pf:minStat", 0);
    const [pfUnderratedOnly, setPfUnderratedOnly] = useStickyState("pf:underratedOnly", false);
    const [pfUnderratedMargin, setPfUnderratedMargin] = useStickyState("pf:underratedMargin", 0.15);

    // If user hasn't applied search/filters, show prompt (and avoid heavy computation)
    if (!searchApplied) {
      return (
        <div className="card">
          <div className="cardHead" style={{gap:12, flexWrap:"wrap"}}>
            <div style={{fontWeight:800}}>Player Finder</div>
          </div>
          <div className="cardBody">
            <div style={{padding:24, textAlign:"center"}}>
              <div style={{fontSize:16, fontWeight:700, marginBottom:8}}>No results yet</div>
              <div className="status" style={{marginBottom:12}}>Adjust your filters (role / thresholds) and apply a search to run the finder.</div>
              <div style={{display:"flex", justifyContent:"center", gap:8}}>
                <button className="btn ghost tight" onClick={clearSearch}>Clear</button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // computed rows (only when searchApplied)
    const rowsPF = useMemo(() => {
      return filteredRows.map(r => {
        const name = r["Name"];
        const br = bestRoleCache.get(name) || { role:null, score:0 };
        const rk = bestRoleRank(name);
        const tv = trueValue(name);
        const ba = buyAt(name);
        const fw = fairWage(name);
        const mw = maxWage(name);
        const currW = wageWeeklyOf(r);
        const gameMid = parseMoneyRange(getCell(r,"Transfer Value")||"").mid;
        const scoreInRole = roleScoreOfRow(r, pfRole);
        const statVal = numerify(getCell(r, pfUseStat));
        const undervalued = Number.isFinite(gameMid) ? (tv > gameMid * (1 + pfUnderratedMargin)) : false;

        return {
          name, club: r["Club"], pos: r["Pos"], mins: numerify(r["Minutes"]),
          age: numerify(r["Age"]), bestRole: br.role, bestScore: br.score,
          scoreInRole, statVal, rankText: (Number.isFinite(rk.rank)? `#${rk.rank}/${rk.of}` : "—"),
          tv, ba, fw, mw, currW, gameMid, undervalued
        };
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filteredRows, bestRoleCache, pfRole, pfUseStat, pfUnderratedMargin, trueValue, buyAt, fairWage, maxWage, roleScoreOfRow, wageWeeklyOf]);

    const rowsFiltered = useMemo(() => {
      return rowsPF.filter(p => {
        const scoreOk = !Number.isFinite(pfMinScore) ? true : (Number.isFinite(p.scoreInRole) ? p.scoreInRole >= pfMinScore : false);
        const statOk  = !Number.isFinite(pfMinStat)  ? true : (Number.isFinite(p.statVal)  ? p.statVal >= pfMinStat  : false);
        const uvOk = pfUnderratedOnly ? (p.undervalued && Number.isFinite(p.gameMid)) : true;
        return scoreOk && statOk && uvOk;
      }).sort((a,b)=>{
        if (pfUnderratedOnly) {
          const aDelta = Number.isFinite(a.gameMid)? (a.tv - a.gameMid) : -Infinity;
          const bDelta = Number.isFinite(b.gameMid)? (b.tv - b.gameMid) : -Infinity;
          return bDelta - aDelta;
        }
        return (b.scoreInRole - a.scoreInRole) || (b.bestScore - a.bestScore);
      });
    }, [rowsPF, pfMinScore, pfMinStat, pfUnderratedOnly]);

    return (
      <div className="card">
        <div className="cardHead" style={{gap:12, flexWrap:"wrap"}}>
          <div style={{fontWeight:800}}>Player Finder</div>
          <div className="row" style={{gap:8, flexWrap:"wrap"}}>
            <div style={{width:220}}>
              <label className="lbl">Filter by role score</label>
              <select className="input" value={pfRole} onChange={e=>setPfRole(e.target.value)}>
                {Object.keys(ROLE_STATS).map(k => <option key={k} value={k}>{k}</option>)}
              </select>
            </div>
            <div style={{width:160}}>
              <label className="lbl">Min role score</label>
              <input className="input" type="number" step="1" min="0" max="100"
                value={pfMinScore} onChange={(e)=>setPfMinScore(Number(e.target.value)||0)} />
            </div>
            <div style={{width:260}}>
              <label className="lbl">Stat threshold</label>
              <div className="row" style={{gap:8}}>
                <select className="input" value={pfUseStat} onChange={e=>setPfUseStat(e.target.value)}>
                  {allStats.map(k => <option key={k} value={k}>{LABELS.get(k)||k}</option>)}
                </select>
                <input className="input" style={{width:120}} type="number" step="0.01"
                  value={pfMinStat} onChange={(e)=>setPfMinStat(Number(e.target.value)||0)} />
              </div>
            </div>
            <div style={{display:"flex", alignItems:"center", gap:8}}>
              <label className="lbl" style={{margin:0}}>Only Underrated</label>
              <input type="checkbox" checked={pfUnderratedOnly} onChange={(e)=>setPfUnderratedOnly(e.target.checked)} />
            </div>
            <div style={{width:160}}>
              <label className="lbl">Underrated margin</label>
              <input className="input" type="number" step="0.01" min="0" max="1"
                value={pfUnderratedMargin} onChange={(e)=>setPfUnderratedMargin(Math.max(0, Math.min(1, Number(e.target.value)||0.15)))} />
            </div>
          </div>
        </div>

        <div className="cardBody scroll">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th><th>Club</th><th>Pos</th><th>Age</th><th>Minutes</th>
                <th>Best Role</th><th>Best Score</th><th>{pfRole} Score</th><th>{LABELS.get(pfUseStat)||pfUseStat}</th>
                <th>Game Value</th><th>True Value</th><th>Delta</th><th>Buy At</th>
                <th>Curr Wage</th><th>Fair Wage</th><th>Max Wage</th>
              </tr>
            </thead>
            <tbody>
              {rowsFiltered.map((p,i)=>(
                <tr key={i} style={{cursor:"default"}}>
                  <td>{p.name}</td>
                  <td>{p.club||"—"}</td>
                  <td>{p.pos||"—"}</td>
                  <td>{Number.isFinite(p.age)? tf(p.age,0):"—"}</td>
                  <td>{Number.isFinite(p.mins)? tf(p.mins,0):"—"}</td>
                  <td>{p.bestRole||"—"}</td>
                  <td>{Number.isFinite(p.bestScore)? tf(p.bestScore,2) : "—"}</td>
                  <td>{Number.isFinite(p.scoreInRole)? tf(p.scoreInRole,2) : "—"}</td>
                  <td>{Number.isFinite(p.statVal)? tf(p.statVal,2) : "—"}</td>
                  <td>{Number.isFinite(p.gameMid)? money(p.gameMid) : "—"}</td>
                  <td>{money(p.tv)}</td>
                  <td style={{color: Number.isFinite(p.gameMid) && (p.tv - p.gameMid) > 0 ? "var(--accent2)" : "var(--ink)"}}>
                    {Number.isFinite(p.gameMid)? money(p.tv - p.gameMid) : "—"}
                  </td>
                  <td>{money(p.ba)}</td>
                  <td>{Number.isFinite(p.currW)? money(p.currW)+"/wk" : "—"}</td>
                  <td>{money(p.fw)}/wk</td>
                  <td>{money(p.mw)}/wk</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{display:"flex", gap:8, marginTop:10, alignItems:"center"}}>
            <div style={{flex:1}}>
              <div className="status">Search only applies on Enter or Apply — it will not filter while you type.</div>
            </div>
            <div style={{display:"flex", gap:8}}>
              <button className="btn ghost tight" onClick={() => document.activeElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }))}>Apply</button>
              <button className="btn ghost tight" onClick={clearSearch}>Clear</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ---------- Sidebar ---------- */
  function Sidebar(){
    return (
      <aside className="side">
        <section className="section">
          <div className="sectionHead">Data</div>
          <div className="sectionBody">
            <input type="file" accept=".csv,.html,.htm" onChange={handleFile}/>
            <div className="status">{status}</div>
          </div>
        </section>

        <section className="section">
          <div className="sectionHead">Filters</div>
          <div className="sectionBody">
            <label className="lbl">Positions (14 treated individually)</label>
            <div className="chipRow">
              {POS14.map(p => (
                <button key={p} className={`chip ${posCohort.includes(p)?"active":""}`}
                  onClick={()=> setPosCohort(posCohort.includes(p) ? posCohort.filter(x=>x!==p) : [...posCohort, p]) }>
                  {p}
                </button>
              ))}
            </div>
            <div className="row">
              <div className="col">
                <label className="lbl">Min minutes</label>
                <input className="input" type="number" value={minMinutes}
                  onChange={e=>setMinMinutes(Number(e.target.value)||0)} />
              </div>
              <div className="col">
                <label className="lbl">Max age</label>
                <input className="input" type="number" value={maxAge}
                  onChange={e=>setMaxAge(Number(e.target.value)||60)} />
              </div>
            </div>

            <label className="lbl">Search (name / club / pos) — press Enter to apply</label>
            <div className="row">
              <SearchInput
                className="input"
                placeholder="Type name, club or pos…"
                initialValue={searchQuery}
                onSearch={handleSearch}
              />
              <button className="btn ghost tight" onClick={clearSearch}>Clear</button>
            </div>
          </div>
        </section>

        <section className="section">
          <div className="sectionHead">Quick Settings</div>
          <div className="sectionBody">
            <label className="lbl">Computation scope (percentiles)</label>
            <select className="input" value={compScope} onChange={e=>setCompScope(e.target.value)}>
              {SCOPE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>

            <label className="lbl">Player</label>
            <select className="input" value={player} onChange={e=>setPlayer(e.target.value)} style={{whiteSpace: "nowrap", textOverflow: "ellipsis"}}>
              {players.map(p => <option key={p} value={p} title={p}>{p}</option>)}
            </select>
            
            <button className="btn" onClick={()=>setMode("Config")} style={{marginTop:"16px", width:"100%"}}>
              Advanced Configuration →
            </button>
          </div>
        </section>
      </aside>
    );
  }

  /* ---------- Topbar ---------- */
  function Topbar(){
    const modes = ["Player Profile","Radar","Percentiles","Role Matrix","Stat Scatter","Role Leaders","Best Roles","Stat Leaders","Custom Archetype","Config"];
    return (
      <div className="topbar">
        <div className="brand">ScoutView</div>
        <div className="tabs">
          {modes.map(m => (
            <button key={m} className={`tab ${mode===m?"active":""}`} onClick={()=>setMode(m)}>{m}</button>
          ))}
        </div>
        <div className="spacer"/>
        <div className="seg">
          {Object.keys(THEMES).map(t => (
            <button key={t} className={`segBtn ${themeName===t?"active":""}`} onClick={()=>setThemeName(t)}>{t}</button>
          ))}
        </div>
      </div>
    );
  }

  /* ---------- Layout ---------- */
  return (
    <ErrorBoundary>
      <div className="app">
        <Topbar/>
        <div className="wrap">
          <Sidebar/>
          <main className="main">
            {mode==="Player Profile" && <PlayerProfileMode/>}
            {mode==="Radar" && <RadarMode/>}
            {mode==="Percentiles" && <PercentilesMode/>}
            {mode==="Role Matrix" && <RoleMatrixMode/>}
            {mode==="Stat Scatter" && <StatScatterMode/>}
            {mode==="Role Leaders" && <RoleLeadersMode/>}
            {mode==="Best Roles" && <BestRolesMode/>}
            {mode==="Stat Leaders" && <StatLeadersMode/>}
            {mode==="Custom Archetype" && <CustomArchetypeMode/>}
            {mode==="Config" && <ConfigMode/>}
          </main>
        </div>
      </div>
    </ErrorBoundary>
  );
}

/* ===================== (end PART 2/2) ===================== */
