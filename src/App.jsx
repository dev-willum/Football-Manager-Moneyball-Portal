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

.wrap{ display:grid; grid-template-columns: 400px 1fr; gap:0; max-width:2000px; margin:0 auto; width:100%; min-height:100vh; transition: grid-template-columns 0.3s ease; }
.wrap.collapsed{ grid-template-columns: 60px 1fr; }
@media(max-width:1200px){ .wrap{ grid-template-columns:1fr; } .wrap.collapsed{ grid-template-columns:1fr; } }
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
  transition: padding 0.3s ease, width 0.3s ease;
}
.side.collapsed{ 
  padding:16px 8px; 
  overflow:hidden; 
  width:60px;
}
.side.collapsed .sectionHead,
.side.collapsed .sectionBody,
.side.collapsed .status { 
  display:none; 
}
.toggle-sidebar {
  position: fixed;
  bottom: 20px;
  left: 20px;
  z-index: 200;
  background: var(--cardBg);
  color: var(--text);
  border: 1px solid var(--cardBorder);
  border-radius: 50%;
  width: 40px;
  height: 40px;
  cursor: pointer;
  font-size: 16px;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  backdrop-filter: blur(10px);
}
.toggle-sidebar:hover {
  background: var(--accent);
  color: white;
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0,0,0,0.25);
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
  "Expires":"Expires","Contract Expiry":"Expires","Contract Expires":"Expires","Expiry":"Expires",
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
  "OP-KP/90":"OP Key Passes/90","OP-KP":"OP Key Passes",
  "OP-Crs C/90":"OP Crosses Completed/90","OP-Crs C":"OP Crosses Completed",
  "OP-Crs A/90":"OP Crosses Attempted/90","OP-Crs A":"OP Crosses Attempted","OP-Cr %":"OP Cross Completion Ratio",
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
  ["OP-KP/90","OP Key Passes/90"],["K Ps/90","Key Passes/90"],["Ch C/90","Chances Created/90"],
  ["Pr passes/90","Progressive Passes/90"],["Ps A/90","Passes Attempted/90"],["Ps C/90","Passes Completed/90"],
  ["Cr C/90","Crosses Completed/90"],["Crs A/90","Crosses Attempted/90"],["OP-Crs C/90","OP Crosses Completed/90"],["OP-Crs A/90","OP Crosses Attempted/90"]
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

/* ===================== Contract Expiry ===================== */
function parseContractExpiry(expiryStr) {
  if (!expiryStr || typeof expiryStr !== 'string') return null;
  
  // Try to parse formats like "dd/mm/yyyy", "Jun 2025", "2025", "June 2025", "6/2025", "06/25"
  const clean = expiryStr.trim();
  
  // Try "dd/mm/yyyy" format (primary format for FM)
  const ddmmyyyyMatch = clean.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (ddmmyyyyMatch) {
    const day = parseInt(ddmmyyyyMatch[1]);
    const month = parseInt(ddmmyyyyMatch[2]);
    const year = parseInt(ddmmyyyyMatch[3]);
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12 && year >= 2020 && year <= 2035) {
      return { month, year };
    }
  }
  
  // Try "dd/mm/yy" format
  const ddmmyyMatch = clean.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2})$/);
  if (ddmmyyMatch) {
    const day = parseInt(ddmmyyMatch[1]);
    const month = parseInt(ddmmyyMatch[2]);
    const yearShort = parseInt(ddmmyyMatch[3]);
    const year = yearShort < 50 ? 2000 + yearShort : 1900 + yearShort;
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12 && year >= 2020 && year <= 2035) {
      return { month, year };
    }
  }
  
  // Try "MMM YYYY" or "Month YYYY" format
  const monthYearMatch = clean.match(/^([A-Za-z]+)\s+(\d{4})$/);
  if (monthYearMatch) {
    const monthName = monthYearMatch[1].toLowerCase();
    const year = parseInt(monthYearMatch[2]);
    const monthMap = {
      'jan': 1, 'january': 1, 'feb': 2, 'february': 2, 'mar': 3, 'march': 3,
      'apr': 4, 'april': 4, 'may': 5, 'jun': 6, 'june': 6,
      'jul': 7, 'july': 7, 'aug': 8, 'august': 8, 'sep': 9, 'september': 9,
      'oct': 10, 'october': 10, 'nov': 11, 'november': 11, 'dec': 12, 'december': 12
    };
    const month = monthMap[monthName];
    if (month && year >= 2020 && year <= 2035) return { month, year };
  }
  
  // Try "M/YYYY" or "MM/YYYY" format (month/year only)
  const monthYearSlashMatch = clean.match(/^(\d{1,2})\/(\d{4})$/);
  if (monthYearSlashMatch) {
    const month = parseInt(monthYearSlashMatch[1]);
    const year = parseInt(monthYearSlashMatch[2]);
    if (month >= 1 && month <= 12 && year >= 2020 && year <= 2035) return { month, year };
  }
  
  // Try "MM/YY" format (month/short year)
  const monthYearShortMatch = clean.match(/^(\d{1,2})\/(\d{2})$/);
  if (monthYearShortMatch) {
    const month = parseInt(monthYearShortMatch[1]);
    const yearShort = parseInt(monthYearShortMatch[2]);
    const year = yearShort < 50 ? 2000 + yearShort : 1900 + yearShort;
    if (month >= 1 && month <= 12 && year >= 2020 && year <= 2035) return { month, year };
  }
  
  // Try just year
  const yearMatch = clean.match(/^(\d{4})$/);
  if (yearMatch) {
    const year = parseInt(yearMatch[1]);
    if (year >= 2020 && year <= 2035) return { month: 6, year }; // Default to June
  }
  
  return null;
}

function contractExpiryMultiplier(expiryStr, currentMonth, currentYear) {
  const expiry = parseContractExpiry(expiryStr);
  if (!expiry) return 1.0; // No contract info, no adjustment
  
  // Calculate months until expiry
  const currentMonths = currentYear * 12 + currentMonth;
  const expiryMonths = expiry.year * 12 + expiry.month;
  const monthsUntilExpiry = expiryMonths - currentMonths;
  
  // Contract expiry effect on transfer value
  if (monthsUntilExpiry <= 0) {
    // Contract expired - major discount
    return 0.15;
  } else if (monthsUntilExpiry <= 6) {
    // 6 months or less - significant discount
    return 0.3 + (monthsUntilExpiry / 6) * 0.4; // 0.3 to 0.7
  } else if (monthsUntilExpiry <= 12) {
    // 6-12 months - moderate discount
    return 0.7 + (monthsUntilExpiry - 6) / 6 * 0.2; // 0.7 to 0.9
  } else if (monthsUntilExpiry <= 24) {
    // 1-2 years - slight discount
    return 0.9 + (monthsUntilExpiry - 12) / 12 * 0.08; // 0.9 to 0.98
  } else {
    // 2+ years - full value
    return 1.0;
  }
}

/* ===================== Contract Helper ===================== */
function getContractInfo(row, gameMonth, gameYear) {
  const contractExpiry = getCell(row, "Expires") || "";
  const multiplier = contractExpiryMultiplier(contractExpiry, gameMonth, gameYear);
  const expiry = parseContractExpiry(contractExpiry);
  
  let status = "Unknown";
  let monthsUntil = 0;
  
  if (contractExpiry && expiry) {
    const currentMonths = gameYear * 12 + gameMonth;
    const expiryMonths = expiry.year * 12 + expiry.month;
    monthsUntil = expiryMonths - currentMonths;
    
    if (monthsUntil <= 0) status = "EXPIRED";
    else if (monthsUntil <= 6) status = `${monthsUntil}mo left`;
    else if (monthsUntil <= 12) status = `${monthsUntil}mo left`;
    else if (monthsUntil <= 24) status = `${Math.floor(monthsUntil/12)}yr ${monthsUntil%12}mo`;
    else status = `${Math.floor(monthsUntil/12)}+ years`;
  }
  
  return { contractExpiry, multiplier, status, monthsUntil, expiry };
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

/* ===================== Name normalization ===================== */
function normalizePlayerName(name) {
  if (typeof name !== 'string') return name;
  
  // Remove accents and diacritics using Unicode normalization
  const normalized = name
    .normalize('NFD') // Decompose characters with diacritics
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritical marks
    .trim();
  
  return normalized;
}

function normalizeHeadersRowObjects(rows) {
  if (!rows || !rows.length) return [];
  const cols = Array.from(new Set(rows.flatMap(r => Object.keys(r))));
  const resolved = new Map(); for (const c of cols) resolved.set(c, RENAME_MAP.get(c) || c);
  return rows.map(r => {
    const o = {};
    for (const [k, v] of Object.entries(r)) {
      const normalizedKey = resolved.get(k) || k;
      let normalizedValue = typeof v === "string" ? v.trim() : v;
      
      // Apply name normalization to Name field
      if (normalizedKey === "Name" && typeof normalizedValue === "string") {
        normalizedValue = normalizePlayerName(normalizedValue);
      }
      
      o[normalizedKey] = normalizedValue;
    }
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
      "Progressive Passes/90": 1.6, "Expected Goals Prevented/90": 1.8,
      "Saves Held": 1.0, "Saves Parried": 1.0    }
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
      "OP Crosses Attempted/90": 1.5, "OP Crosses Completed/90": 1.6,
      "OP Key Passes/90": 1.4, "Key Passes/90": 1.2, "Dribbles/90": 1.2,
      "Tackles/90": 1.0, "Interceptions/90": 1.0
    }
  },
  "FB — Inverted": {
    baseline: ["D (R)","D (L)","WB (R)","WB (L)"],
    weights: {
      "Passes Attempted/90": 1.3, "Passes Completed/90": 1.3, "Pass Completion%": 1.4,
      "Progressive Passes/90": 1.7, "OP Key Passes/90": 1.4,
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
      "Progressive Passes/90": 1.7, "OP Key Passes/90": 1.3,
      "Key Passes/90": 1.1, "Interceptions/90": 1.0
    }
  },

  // ---- Central Midfield ----
  "CM — Box to Box": {
    baseline: ["M (C)"],
    weights: {
      "Progressive Passes/90": 1.4, "OP Key Passes/90": 1.2, "Dribbles/90": 1.2,
      "Pressures Completed/90": 1.1, "Tackles/90": 1.2, "Interceptions/90": 1.2,
      "Shots/90": 1.1, "SoT/90": 1.1
    }
  },
  "CM — Progresser": {
    baseline: ["M (C)"],
    weights: {
      "Progressive Passes/90": 1.7, "Passes Completed/90": 1.3, "Passes Attempted/90": 1.4,
      "OP Key Passes/90": 1.5, "Key Passes/90": 1.3, "Dribbles/90": 1.2,
      "Chances Created/90": 1.5
    }
  },

  // ---- Attacking Midfield ----
  "AM — Classic 10": {
    baseline: ["AM (C)"],
    weights: {
      "OP Key Passes/90": 1.7, "Key Passes/90": 1.6, "Chances Created/90": 1.7,
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
      "OP Crosses Attempted/90": 1.5, "OP Crosses Completed/90": 1.7,
      "OP Key Passes/90": 1.4, "Dribbles/90": 1.6, "Assist": 1.5
    }
  },
  "Winger — Inverted": {
    baseline: ["AM (R)","AM (L)","M (R)","M (L)"],
    weights: {
      "Shots/90": 1.6, "SoT/90": 1.6, "Dribbles/90": 1.6,
      "OP Key Passes/90": 1.3, "Chances Created/90": 1.4,
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
  MF: ["Progressive Passes/90","OP Key Passes/90","Key Passes/90","Dribbles/90","Chances Created/90"],
  FW: ["Goals / 90","xG/90","SoT/90","Conversion Rate","OP Key Passes/90"]
};

// Enhanced positional family detection (replaces famFromTokens)
const famFromTokens = (toks=[]) => {
  const t = new Set(toks.map(normToken));
  if (t.has("GK")) return "GK";
  if (t.has("D (C)") || t.has("D (R)") || t.has("D (L)") || t.has("WB (R)") || t.has("WB (L)")) return "DF";
  if (t.has("ST") || t.has("ST (C)")) return "FW";
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
/* ============== Enhanced Value & Wage config with advanced modeling =============== */
const DEFAULT_VALUE_CONFIG = {
  // Enhanced league weighting with more granular scaling
  leagueWeights: { elite:1.45, strong:1.00, solid:0.82, growth:0.72, develop:0.62 },
  baseScales:    { elite:95.0, strong:12.0, solid:7.5,  growth:5.0,  develop:3.5 },

  // More refined score shaping with position-specific curves
  scorePower: { GK: 1.08, DF: 1.06, MF: 1.04, FW: 1.02 },
  scoreFloor: 0.15, // Minimum score multiplier to prevent zero values

  // Enhanced minutes reliability with position-specific requirements
  minMinutesRef: { GK: 2500, DF: 2200, MF: 2000, FW: 1800 },
  minMinutesFloor: 0.40,
  minutesBoostCurve: 1.2, // How much extra minutes beyond ref boost value

  // Sophisticated age curves by position with peak years
  ageCurve: {
    GK: { 16:0.75, 20:0.85, 24:0.95, 28:1.00, 32:1.02, 35:0.98, 38:0.90, 42:0.75 },
    DF: { 16:0.80, 19:0.90, 22:0.98, 26:1.00, 29:0.98, 32:0.94, 35:0.87, 38:0.78 },
    MF: { 16:0.82, 18:0.92, 21:0.98, 25:1.00, 28:0.98, 31:0.93, 34:0.85, 37:0.75 },
    FW: { 16:0.78, 18:0.88, 21:0.96, 24:1.00, 27:0.98, 30:0.92, 33:0.83, 36:0.70 }
  },

  // Enhanced performance metrics weighting
  bigMetricBoostTopPct: 90,
  bigMetricBoostPerHit: 0.035,
  excellenceThreshold: 95, // Extra boost for truly elite performers
  excellenceBonus: 0.08,

  // Role compatibility scoring (how well player fits their best role)
  roleCompatibilityWeight: 0.25,
  roleVersatilityBonus: 0.15, // Bonus for players who can play multiple roles well

  // Contract expiry enhanced modeling
  contractPremium: { 
    "6+ years": 1.15, "4-5 years": 1.08, "3-4 years": 1.02, 
    "2-3 years": 0.95, "1-2 years": 0.82, "< 1 year": 0.65, "Free": 0.45 
  },

  // League performance context (how player performs vs league average)
  leaguePerformanceWeight: 0.20,
  crossLeagueComparison: true,

  // Positional scarcity multipliers (rare positions worth more)
  positionScarcity: { 
    GK: 1.05, "D (C)": 1.00, "D (L)": 1.08, "D (R)": 1.08, 
    DM: 1.12, "M (C)": 1.00, "M (L)": 1.06, "M (R)": 1.06,
    "AM (C)": 1.15, "AM (L)": 1.10, "AM (R)": 1.10, ST: 1.08
  },

  // Enhanced buy price modeling with market dynamics
  buyDiscount: 0.87,
  sellerMotivation: { // Additional factors affecting transfer price
    contractExpiring: 0.75, // Club desperate to sell
    youngProspect: 1.25,    // Premium for potential
    starPlayer: 1.35,       // Premium for established stars
    rivalClub: 1.15         // Premium when buying from rivals
  },

  // Sophisticated wage modeling
  wagePerM: 2800, // £/week per £1m true value
  wageLeagueFactor: { elite:1.40, strong:1.15, solid:1.00, growth:0.88, develop:0.82 },
  
  // Enhanced age-based wage curves (experience premium)
  wageAgeBoost: {
    GK: { 17:0.85, 21:0.92, 25:0.98, 29:1.00, 33:1.05, 37:1.02, 40:0.95 },
    DF: { 17:0.88, 20:0.94, 24:0.99, 28:1.00, 31:1.03, 34:0.98, 37:0.90 },
    MF: { 17:0.87, 19:0.93, 23:0.98, 27:1.00, 30:1.02, 33:0.96, 36:0.88 },
    FW: { 17:0.85, 19:0.91, 23:0.97, 26:1.00, 29:0.98, 32:0.92, 35:0.82 }
  },

  // Performance-based wage premiums
  wagePerformanceBonus: {
    elite: 1.25,      // Top 5% performers
    excellent: 1.15,  // Top 10% performers  
    good: 1.05,       // Top 25% performers
    average: 1.00     // Everyone else
  },

  // Enhanced wage floors with league context
  wageGroupFloor: { elite: 1200, strong: 700, solid: 400, growth: 200, develop: 120 },
  wageMinAbsolute: 100,
  wageMaxMult: 1.50,

  // Market dynamics and external factors
  inflationRate: 1.03, // Annual transfer market inflation
  economicFactors: {
    elite: 1.10,    // Rich leagues can afford more
    strong: 1.05,
    solid: 1.00,
    growth: 0.95,
    develop: 0.90
  },

  // Reputation and marketing value
  reputationBonus: {
    worldClass: 1.30,     // 90+ overall rating equivalent
    international: 1.20,  // 80-89 overall rating
    national: 1.10,       // 70-79 overall rating
    regional: 1.00        // Below 70 overall rating
  }
};


/* ============== Enhanced Value & Wage model with advanced analytics ========================================== */

// Enhanced age interpolation with position-specific curves
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

// Enhanced minutes trust with position-specific requirements and bonus curve
function minutesTrust(mins, posFamily, cfg) {
  if (!Number.isFinite(mins)) return cfg.minMinutesFloor;
  if (mins <= 0) return cfg.minMinutesFloor;
  
  const ref = typeof cfg.minMinutesRef === 'object' ? 
    (cfg.minMinutesRef[posFamily] || 2000) : cfg.minMinutesRef;
  
  if (mins <= ref) {
    // Standard curve up to reference
    const t = Math.sqrt(mins / ref);
    return Math.max(cfg.minMinutesFloor, Math.min(1, t));
  } else {
    // Bonus for extra minutes beyond reference
    const excess = mins - ref;
    const bonusRef = ref * 0.5; // 50% more minutes for max bonus
    const bonusCurve = Math.min(1, excess / bonusRef);
    const bonus = bonusCurve * (cfg.minutesBoostCurve - 1);
    return Math.min(cfg.minutesBoostCurve, 1 + bonus);
  }
}

// Enhanced role versatility calculation
function calculateRoleVersatility(row, pctIndex, posFamily) {
  const tokens = expandFMPositions(getCell(row, "Pos"));
  const applicableRoles = Object.keys(ROLE_BOOK).filter(role => {
    const baseline = ROLE_BASELINES[role] || [];
    return sharesAny(tokens, baseline);
  });
  
  if (applicableRoles.length <= 1) return { versatility: 1.0, topRoles: [] };
  
  const roleScores = applicableRoles.map(role => ({
    role,
    score: roleScoreFor(row, role, pctIndex)
  })).sort((a, b) => b.score - a.score);
  
  // Versatility bonus based on how many roles they can play well (70%+)
  const goodRoles = roleScores.filter(r => r.score >= 70).length;
  const versatilityMultiplier = 1 + Math.min(goodRoles - 1, 3) * 0.05; // Up to 15% bonus
  
  return {
    versatility: versatilityMultiplier,
    topRoles: roleScores.slice(0, 3),
    applicableRolesCount: applicableRoles.length
  };
}

// Enhanced performance tier calculation
function getPerformanceTier(bestScore) {
  if (bestScore >= 95) return 'elite';
  if (bestScore >= 90) return 'excellent';
  if (bestScore >= 75) return 'good';
  return 'average';
}

// Enhanced positional family detection with more granular categories
function getPositionalFamily(tokens) {
  return famFromTokens(tokens);
}

// Enhanced league performance context
function calculateLeagueContext(row, pctIndex, allRows, cfg) {
  const playerLeague = String(getCell(row, "League") || "");
  const playerGroup = leagueGroupOf(playerLeague);
  
  // Find players in same league group for comparison
  const leaguePeers = allRows.filter(r => {
    const league = String(getCell(r, "League") || "");
    return leagueGroupOf(league) === playerGroup;
  });
  
  if (leaguePeers.length < 10) return 1.0; // Not enough data for comparison
  
  // Calculate player's rank within their league group
  const { role: playerRole, score: playerScore } = bestNearRole(row, pctIndex);
  const peerScores = leaguePeers.map(peer => {
    const { score } = bestNearRole(peer, pctIndex);
    return score;
  }).filter(s => Number.isFinite(s)).sort((a, b) => b - a);
  
  if (peerScores.length === 0) return 1.0;
  
  // Calculate percentile within league
  const rank = peerScores.findIndex(s => s <= playerScore);
  const percentileInLeague = (1 - rank / peerScores.length) * 100;
  
  // Bonus for being top performer in their league
  if (percentileInLeague >= 90) return 1.20;
  if (percentileInLeague >= 75) return 1.10;
  if (percentileInLeague >= 50) return 1.05;
  if (percentileInLeague >= 25) return 1.00;
  return 0.95;
}

// Main enhanced value calculation
function trueValueOf(row, pctIndex, cfg = DEFAULT_VALUE_CONFIG, gameMonth = 7, gameYear = 2024, allRows = []) {
  const age = numCell(row, "Age");
  const mins = numCell(row, "Minutes");
  const league = String(getCell(row, "League") || "");
  const group = leagueGroupOf(league);
  const pos = getCell(row, "Pos") || "";
  const tokens = expandFMPositions(pos);
  const posFamily = getPositionalFamily(tokens);

  // Enhanced config handling with fallbacks
  const lw = (cfg.leagueWeights && cfg.leagueWeights[group]) ?? 0.70;
  const scaleM = (cfg.baseScales && cfg.baseScales[group]) ?? 4.0;

  // Role analysis with enhanced scoring
  const { role, score } = bestNearRole(row, pctIndex);
  const performanceTier = getPerformanceTier(score);
  
  // Position-specific score power adjustment
  const scorePowerVal = typeof cfg.scorePower === 'object' ? 
    (cfg.scorePower[posFamily] || 1.05) : cfg.scorePower;
  const scoreAdj = Math.max(cfg.scoreFloor || 0.15, 
    Math.pow((score || 0) / 100, scorePowerVal));

  // Enhanced versatility analysis
  const versatilityData = calculateRoleVersatility(row, pctIndex, posFamily);
  const versatilityBonus = cfg.roleVersatilityBonus ? 
    1 + (versatilityData.versatility - 1) * cfg.roleVersatilityBonus : 1;

  // Enhanced big metrics analysis with position-specific focus
  const famStats = BIG_METRICS[posFamily] || [];
  let standardHits = 0;
  let eliteHits = 0;
  
  for (const st of famStats) {
    const v = numCell(row, st);
    const pct = percentileFor(pctIndex, st, v);
    if (pct >= (cfg.bigMetricBoostTopPct ?? 90)) standardHits++;
    if (pct >= (cfg.excellenceThreshold ?? 95)) eliteHits++;
  }
  
  const bigBoost = 1 + standardHits * (cfg.bigMetricBoostPerHit ?? 0.035);
  const excellenceBonus = 1 + eliteHits * (cfg.excellenceBonus ?? 0.08);

  // Enhanced minutes trust with position-specific requirements
  const mt = minutesTrust(mins, posFamily, cfg);

  // Enhanced age modeling with position-specific curves
  const ageCurveData = typeof cfg.ageCurve === 'object' && cfg.ageCurve[posFamily] ? 
    cfg.ageCurve[posFamily] : (cfg.ageCurve || { 17:0.9, 23:1, 29:0.96, 34:0.86 });
  const am = interpAge(age, ageCurveData);

  // Enhanced contract expiry impact
  const contractExpiry = getCell(row, "Expires") || "";
  const contractMultiplier = contractExpiryMultiplier(contractExpiry, gameMonth, gameYear);

  // Positional scarcity bonus
  const mainPos = tokens[0] || pos;
  const scarcityBonus = (cfg.positionScarcity && cfg.positionScarcity[mainPos]) ?? 1.0;

  // League performance context (if we have comparison data)
  const leagueContextBonus = allRows.length > 100 ? 
    calculateLeagueContext(row, pctIndex, allRows, cfg) : 1.0;

  // Economic factors and market dynamics
  const economicFactor = (cfg.economicFactors && cfg.economicFactors[group]) ?? 1.0;
  const inflationFactor = cfg.inflationRate ?? 1.0;

  // Reputation/marketing value estimation (based on overall performance)
  let reputationLevel = 'regional';
  if (score >= 90) reputationLevel = 'worldClass';
  else if (score >= 80) reputationLevel = 'international';
  else if (score >= 70) reputationLevel = 'national';
  
  const reputationBonus = (cfg.reputationBonus && cfg.reputationBonus[reputationLevel]) ?? 1.0;

  // Combine all factors
  const baseM = scaleM * scoreAdj * lw * mt * am * bigBoost * excellenceBonus * 
                contractMultiplier * versatilityBonus * scarcityBonus * 
                leagueContextBonus * economicFactor * inflationFactor * reputationBonus;

  return { 
    valueM: baseM, 
    bestRole: role, 
    bestScore: score,
    group,
    contractMultiplier,
    posFamily,
    performanceTier,
    versatilityData,
    leagueContextBonus,
    components: {
      base: scaleM,
      score: scoreAdj,
      league: lw,
      minutes: mt,
      age: am,
      bigMetrics: bigBoost,
      excellence: excellenceBonus,
      contract: contractMultiplier,
      versatility: versatilityBonus,
      scarcity: scarcityBonus,
      leagueContext: leagueContextBonus,
      economic: economicFactor,
      reputation: reputationBonus
    }
  };
}

// Enhanced buy price with market dynamics
function buyAtOf(row, pctIndex, cfg = DEFAULT_VALUE_CONFIG, gameMonth = 7, gameYear = 2024, allRows = []) {
  const { valueM, bestScore, posFamily, contractMultiplier } = trueValueOf(row, pctIndex, cfg, gameMonth, gameYear, allRows);
  const age = numCell(row, "Age");
  
  let buyMultiplier = cfg.buyDiscount ?? 0.87;
  
  // Additional market dynamics
  if (contractMultiplier < 0.8) {
    // Contract expiring - seller motivated
    buyMultiplier *= (cfg.sellerMotivation?.contractExpiring ?? 0.85);
  }
  
  if (age <= 21 && bestScore >= 70) {
    // Young prospect premium
    buyMultiplier *= (cfg.sellerMotivation?.youngProspect ?? 1.15);
  }
  
  if (bestScore >= 90) {
    // Star player premium
    buyMultiplier *= (cfg.sellerMotivation?.starPlayer ?? 1.25);
  }
  
  return valueM * buyMultiplier;
}

// Enhanced weekly wage calculation
function weeklyWageOf(row, pctIndex, cfg = DEFAULT_VALUE_CONFIG, gameMonth = 7, gameYear = 2024, allRows = []) {
  const age = numCell(row, "Age");
  const { valueM, group, posFamily, performanceTier, bestScore } = trueValueOf(row, pctIndex, cfg, gameMonth, gameYear, allRows);
  
  // League factor
  const lfac = (cfg.wageLeagueFactor && cfg.wageLeagueFactor[group]) ?? 1.0;
  
  // Enhanced age-based wage curves by position
  const wageAgeData = typeof cfg.wageAgeBoost === 'object' && cfg.wageAgeBoost[posFamily] ? 
    cfg.wageAgeBoost[posFamily] : (cfg.wageAgeBoost || { 18:0.90, 24:1.00, 28:1.04, 31:1.08, 34:1.04 });
  
  const ageBoost = (() => {
    if (typeof wageAgeData === 'object') {
      return interpAge(age, wageAgeData);
    }
    return 1; // Fallback
  })();
  
  // Performance-based wage premium
  const performanceBonus = (cfg.wagePerformanceBonus && cfg.wagePerformanceBonus[performanceTier]) ?? 1.0;
  
  // Base wage calculation
  const raw = (cfg.wagePerM ?? 2800) * valueM * lfac * ageBoost * performanceBonus;
  
  // Enhanced wage floors
  const floor = Math.max(
    cfg.wageMinAbsolute || 100, 
    (cfg.wageGroupFloor && cfg.wageGroupFloor[group]) || 120
  );
  
  return Math.max(floor, raw);
}

// Enhanced maximum wage calculation
function weeklyWageMaxOf(row, pctIndex, cfg = DEFAULT_VALUE_CONFIG, gameMonth = 7, gameYear = 2024, allRows = []) {
  const baseWage = weeklyWageOf(row, pctIndex, cfg, gameMonth, gameYear, allRows);
  const { bestScore } = trueValueOf(row, pctIndex, cfg, gameMonth, gameYear, allRows);
  
  // Higher multiplier for elite performers
  let maxMult = cfg.wageMaxMult || 1.50;
  if (bestScore >= 95) maxMult *= 1.15; // Extra room for elite negotiations
  else if (bestScore >= 90) maxMult *= 1.10;
  
  return baseWage * maxMult;
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

/* ============== Pizza Chart Component (JavaScript SVG) =============== */
const Pizza = ({ playerName, playerData, roleStats, compScope, pctIndex }) => {
  const [chartData, setChartData] = useState(null);
  const [hoveredSegment, setHoveredSegment] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (!playerName || !playerData || !roleStats || roleStats.length === 0) return;

    // Prepare the data
    const stats = [];
    roleStats.forEach(stat => {
      const raw = numCell(playerData, stat);
      const pct = percentileFor(pctIndex, stat, raw);
      stats.push({
        label: stat,
        value: pct,
        raw: raw
      });
    });

    setChartData({
      playerName,
      club: getCell(playerData, "Club") || "",
      position: getCell(playerData, "Pos") || "",
      age: numCell(playerData, "Age") || null,
      stats
    });
  }, [playerName, playerData, roleStats, compScope, pctIndex]);

  const createPizzaChart = () => {
    if (!chartData || !chartData.stats) return null;

    const size = 600;
    const center = size / 2;
    const centerY = center - 40; // Move pizza up by 40px
    const radius = 240;
    const stats = chartData.stats;
    const numStats = stats.length;

    // Colors for each stat segment
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57',
      '#FF9FF3', '#54A0FF', '#5F27CD', '#00D2D3', '#FF9F43',
      '#1DD1A1', '#FD79A8', '#6C5CE7', '#A29BFE', '#FD79A8'
    ];

    // Function to determine if a color is light or dark
    const getTextColor = (hexColor) => {
      // Convert hex to RGB
      const r = parseInt(hexColor.slice(1, 3), 16);
      const g = parseInt(hexColor.slice(3, 5), 16);
      const b = parseInt(hexColor.slice(5, 7), 16);
      
      // Calculate relative luminance
      const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      
      // Return white for dark colors, black for light colors
      return luminance > 0.5 ? '#000000' : '#FFFFFF';
    };

    const segments = stats.map((stat, index) => {
      const startAngle = (index * 2 * Math.PI) / numStats - Math.PI / 2;
      const endAngle = ((index + 1) * 2 * Math.PI) / numStats - Math.PI / 2;
      const value = Math.max(0, Math.min(100, stat.value)) / 100; // Normalize to 0-1
      const segmentRadius = radius * value;

      const x1 = center + Math.cos(startAngle) * segmentRadius;
      const y1 = centerY + Math.sin(startAngle) * segmentRadius;
      const x2 = center + Math.cos(endAngle) * segmentRadius;
      const y2 = centerY + Math.sin(endAngle) * segmentRadius;

      const largeArcFlag = (endAngle - startAngle) > Math.PI ? 1 : 0;

      const pathData = [
        `M ${center} ${centerY}`,
        `L ${x1} ${y1}`,
        `A ${segmentRadius} ${segmentRadius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
        'Z'
      ].join(' ');

      return {
        path: pathData,
        color: colors[index % colors.length],
        label: stat.label,
        value: stat.value,
        raw: stat.raw
      };
    });

    return (
      <div style={{ textAlign: 'center', padding: '16px' }}>
        <div style={{ marginBottom: '12px' }}>
          <div style={{ fontSize: '16px', fontWeight: 'bold' }}>{chartData.playerName}</div>
          <div style={{ fontSize: '11px', color: 'var(--muted)' }}>
            {chartData.club} • {chartData.position} • Age {chartData.age} • vs {compScope}
          </div>
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
          <svg width={size} height={size} style={{ maxWidth: '100%' }}>
            {/* Background circles */}
            {[0.2, 0.4, 0.6, 0.8, 1.0].map(scale => (
              <circle
                key={scale}
                cx={center}
                cy={centerY}
                r={radius * scale}
                fill="none"
                stroke="var(--cardBorder)"
                strokeWidth="1"
                opacity="0.3"
              />
            ))}
            
            {/* Pizza segments */}
            {segments.map((segment, index) => (
              <g key={index}>
                <path
                  d={segment.path}
                  fill={segment.color}
                  stroke="var(--cardBg)"
                  strokeWidth="2"
                  opacity={hoveredSegment === index ? "1.0" : "0.8"}
                  style={{ 
                    cursor: 'pointer',
                    filter: hoveredSegment === index ? 'brightness(1.1)' : 'none',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    setHoveredSegment(index);
                    const rect = e.currentTarget.getBoundingClientRect();
                    setTooltipPosition({
                      x: e.clientX,
                      y: e.clientY
                    });
                  }}
                  onMouseMove={(e) => {
                    setTooltipPosition({
                      x: e.clientX,
                      y: e.clientY
                    });
                  }}
                  onMouseLeave={() => {
                    setHoveredSegment(null);
                  }}
                />
              </g>
            ))}
          
          {/* Stat labels inside slices */}
          {stats.map((stat, index) => {
            const angle = (index * 2 * Math.PI) / numStats - Math.PI / 2;
            const midAngle = angle + (Math.PI / numStats); // Middle of the slice
            const value = Math.max(0, Math.min(100, stat.value)) / 100;
            const labelRadius = (radius * value * 0.65); // Position labels at 65% of the slice radius
            const x = center + Math.cos(midAngle) * labelRadius;
            const y = centerY + Math.sin(midAngle) * labelRadius;
            
            const sliceColor = colors[index % colors.length];
            const textColor = getTextColor(sliceColor);
            const shadowColor = textColor === '#FFFFFF' ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.8)';
            
            // Dynamic font sizing based on number of slices and slice size
            let labelFontSize, valueFontSize, verticalSpacing, threshold;
            const sliceAngle = (2 * Math.PI) / numStats; // Angle of each slice in radians
            const minSliceWidth = radius * sliceAngle * 0.8; // Approximate text width available
            
            if (numStats <= 4) {
              labelFontSize = Math.min(11, Math.max(8, minSliceWidth / 8));
              valueFontSize = Math.min(9, Math.max(6, minSliceWidth / 10));
              verticalSpacing = 8;
              threshold = 5;
            } else if (numStats <= 6) {
              labelFontSize = Math.min(9, Math.max(7, minSliceWidth / 10));
              valueFontSize = Math.min(7, Math.max(5, minSliceWidth / 12));
              verticalSpacing = 6;
              threshold = 10;
            } else if (numStats <= 8) {
              labelFontSize = Math.min(7, Math.max(5, minSliceWidth / 12));
              valueFontSize = Math.min(6, Math.max(4, minSliceWidth / 14));
              verticalSpacing = 5;
              threshold = 15;
            } else if (numStats <= 12) {
              labelFontSize = Math.min(6, Math.max(4, minSliceWidth / 15));
              valueFontSize = Math.min(5, Math.max(3, minSliceWidth / 18));
              verticalSpacing = 4;
              threshold = 20;
            } else {
              labelFontSize = Math.min(5, Math.max(3, minSliceWidth / 20));
              valueFontSize = Math.min(4, Math.max(2, minSliceWidth / 25));
              verticalSpacing = 3;
              threshold = 25;
            }
            
            // Only show labels if the slice is big enough (threshold varies by slice count)
            if (stat.value < threshold) return null;
            
            return (
              <g key={index}>
                <text
                  x={x}
                  y={y - verticalSpacing}
                  textAnchor="middle"
                  fontSize={labelFontSize}
                  fill={textColor}
                  fontWeight="bold"
                  style={{ textShadow: `1px 1px 2px ${shadowColor}` }}
                >
                  {stat.label}
                </text>
                <text
                  x={x}
                  y={y + verticalSpacing}
                  textAnchor="middle"
                  fontSize={valueFontSize}
                  fill={textColor}
                  fontWeight="500"
                  style={{ textShadow: `1px 1px 2px ${shadowColor}` }}
                >
                  {stat.raw} | {stat.value.toFixed(0)}%
                </text>
              </g>
            );
          })}
          
            {/* Center dot */}
            <circle
              cx={center}
              cy={centerY}
              r="3"
              fill="var(--text)"
            />
          </svg>
        </div>
        
        {/* Interactive Tooltip */}
        {hoveredSegment !== null && (
          <div
            style={{
              position: 'fixed',
              left: tooltipPosition.x + 10,
              top: tooltipPosition.y - 10,
              background: 'var(--cardBg)',
              backgroundColor: 'rgba(var(--cardBg-rgb, 255, 255, 255), 0.45)',
              backdropFilter: 'blur(8px)',
              border: '1px solid var(--cardBorder)',
              borderRadius: '6px',
              padding: '8px 12px',
              fontSize: '11px',
              zIndex: 1000,
              pointerEvents: 'none',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              maxWidth: '200px'
            }}
          >
            <div style={{ fontWeight: 'bold', marginBottom: '4px', color: 'var(--accent)' }}>
              {chartData.stats[hoveredSegment].label}
            </div>
            <div style={{ marginBottom: '2px' }}>
              <strong>Raw Value:</strong> {chartData.stats[hoveredSegment].raw.toFixed(2)}
            </div>
            <div style={{ marginBottom: '2px' }}>
              <strong>Percentile:</strong> {chartData.stats[hoveredSegment].value.toFixed(1)}%
            </div>
            <div style={{ fontSize: '10px', color: 'var(--muted)', marginTop: '4px' }}>
              vs {compScope} • {chartData.stats[hoveredSegment].value >= 90 ? '🔥 Elite' : 
                chartData.stats[hoveredSegment].value >= 75 ? '✨ Excellent' :
                chartData.stats[hoveredSegment].value >= 60 ? '👍 Good' :
                chartData.stats[hoveredSegment].value >= 40 ? '📊 Average' : '📉 Below Average'}
            </div>
          </div>
        )}
        
        {/* Legend */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', 
          gap: '8px', 
          marginTop: '16px',
          fontSize: '11px'
        }}>
          {segments.map((segment, index) => (
            <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div
                style={{
                  width: '12px',
                  height: '12px',
                  backgroundColor: segment.color,
                  borderRadius: '2px'
                }}
              />
              <span>{segment.label}: {segment.value.toFixed(0)}%</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (!chartData) {
    return (
      <div style={{
        width: "100%", 
        height: "450px", 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "center",
        color: "var(--muted)"
      }}>
        Loading pizza chart...
      </div>
    );
  }

  return createPizzaChart();
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
    // Measure longest label to size left margin dynamically
    const measureText = (text, font = "14px Inter, sans-serif") => {
      try {
        const canvas = measureText.__c || (measureText.__c = document.createElement("canvas"));
        const ctx = canvas.getContext("2d");
        ctx.font = font;
        return ctx.measureText(String(text||"")).width;
      } catch { return (String(text||"").length * 7); }
    };
    const maxLabelPx = Math.max(0, ...data.map(d => measureText(d.label)));
    const leftMargin = Math.min(Math.max(160, Math.ceil(maxLabelPx) + 24), 520);
    // Ensure enough drawing width even if container is small; allow horizontal scroll
    const w = Math.max((width || 0), leftMargin + 600, 900);
    const margin = { top: 30, right: 30, bottom: 44, left: leftMargin };
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
  return <div className="chartWrap" ref={wrapRef} style={{ overflowX: "auto", overflowY: "hidden" }}><svg ref={svgRef}/></div>;
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
/* ===================== Club Context Analysis ===================== */
function analyzeClubContext(managedClub, rows, pctIndex) {
  if (!managedClub) return null;
  
  // Get all players from the managed club
  const clubPlayers = rows.filter(r => getCell(r, "Club") === managedClub);
  if (clubPlayers.length === 0) return null;
  
  // Analyze club's league and quality
  const clubLeague = getCell(clubPlayers[0], "League") || "";
  const clubGroup = leagueGroupOf(clubLeague);
  
  // Calculate position-specific AND role-specific quality analysis
  const positionAnalysis = {
    GK: { players: [], bestScore: 0, avgScore: 0, needsUpgrade: false },
    DF: { players: [], bestScore: 0, avgScore: 0, needsUpgrade: false },
    MF: { players: [], bestScore: 0, avgScore: 0, needsUpgrade: false },
    FW: { players: [], bestScore: 0, avgScore: 0, needsUpgrade: false }
  };

  // Role-specific analysis with flexible coverage consideration
  const roleAnalysis = {};
  const roleCoverage = {}; // Track who can play each role competently
  
  // Analyze each player and categorize by position AND role
  clubPlayers.forEach(player => {
    const { role, score } = bestNearRole(player, pctIndex);
    const tokens = expandFMPositions(getCell(player, "Pos"));
    const posFamily = famFromTokens(tokens);
    
    const playerData = {
      name: getCell(player, "Name"),
      score: score || 0,
      role: role,
      age: numCell(player, "Age"),
      position: getCell(player, "Pos"),
      allRoleScores: {} // Store all role scores for flexibility analysis
    };

    // Calculate scores for ALL roles this player can play
    Object.keys(ROLE_BOOK).forEach(roleName => {
      const baseline = ROLE_BASELINES[roleName] || [];
      if (sharesAny(tokens, baseline)) {
        const roleScore = roleScoreFor(player, roleName, pctIndex) || 0;
        playerData.allRoleScores[roleName] = roleScore;
        
        // Consider "competent" coverage if score is within reasonable threshold of best role
        const competencyThreshold = 10; // Can adjust this threshold
        if (roleScore >= (score - competencyThreshold) && roleScore >= 60) {
          if (!roleCoverage[roleName]) {
            roleCoverage[roleName] = [];
          }
          roleCoverage[roleName].push({
            name: playerData.name,
            score: roleScore,
            isPrimary: roleName === role,
            bestRole: role  // Add the player's actual best role
          });
        }
      }
    });
    
    // Add to position analysis
    if (positionAnalysis[posFamily]) {
      positionAnalysis[posFamily].players.push(playerData);
    }
    
    // Add to role analysis - this is the crucial part for your request
    if (!roleAnalysis[role]) {
      roleAnalysis[role] = {
        players: [],
        bestScore: 0,
        avgScore: 0,
        count: 0
      };
    }
    roleAnalysis[role].players.push(playerData);
  });
  
  // Calculate best and average scores for each position
  Object.keys(positionAnalysis).forEach(pos => {
    const players = positionAnalysis[pos].players;
    if (players.length > 0) {
      const scores = players.map(p => p.score).filter(Number.isFinite);
      positionAnalysis[pos].bestScore = Math.max(...scores);
      positionAnalysis[pos].avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
      
      // Determine if position needs upgrade based on league tier expectations
      const leagueExpectations = {
        elite: { min: 75, good: 85 },      // Premier League level
        strong: { min: 65, good: 75 },     // Championship level  
        solid: { min: 55, good: 65 },      // League 1/2 level
        growth: { min: 45, good: 55 },     // Lower professional
        develop: { min: 35, good: 45 }     // Semi-pro/amateur
      };
      
      const expectations = leagueExpectations[clubGroup] || leagueExpectations.solid;
      positionAnalysis[pos].needsUpgrade = positionAnalysis[pos].bestScore < expectations.good;
      positionAnalysis[pos].isWeak = positionAnalysis[pos].bestScore < expectations.min;
      positionAnalysis[pos].expectations = expectations;
    } else {
      // No players in this position - critical need
      positionAnalysis[pos].needsUpgrade = true;
      positionAnalysis[pos].isWeak = true;
      positionAnalysis[pos].isCritical = true;
    }
  });

  // Calculate role-specific scores - this enables role-vs-role comparison
  Object.keys(roleAnalysis).forEach(role => {
    const players = roleAnalysis[role].players;
    const scores = players.map(p => p.score).filter(Number.isFinite);
    if (scores.length > 0) {
      const bestScore = Math.max(...scores);
      const bestPlayer = players.find(p => p.score === bestScore);
      
      roleAnalysis[role].bestScore = bestScore;
      roleAnalysis[role].avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
      roleAnalysis[role].count = players.length;
      roleAnalysis[role].bestPlayerName = bestPlayer ? bestPlayer.name : null;
    }
  });
  
  // Overall squad analysis
  const allScores = clubPlayers.map(player => {
    const { score } = bestNearRole(player, pctIndex);
    return score || 0;
  }).filter(Number.isFinite);
  
  const avgSquadScore = allScores.length > 0 ? 
    allScores.reduce((a, b) => a + b, 0) / allScores.length : 0;
  const topSquadScore = allScores.length > 0 ? Math.max(...allScores) : 0;
  
  // Determine club tier based on league and squad quality
  let clubTier = 'amateur';
  const leagueExpectations = {
    elite: { min: 75, good: 85 },
    strong: { min: 65, good: 75 },
    solid: { min: 55, good: 65 },
    growth: { min: 45, good: 55 },
    develop: { min: 35, good: 45 }
  };
  
  const expectations = leagueExpectations[clubGroup] || leagueExpectations.solid;
  
  if (clubGroup === 'elite' && avgSquadScore >= expectations.good) clubTier = 'worldClass';
  else if (clubGroup === 'elite' && avgSquadScore >= expectations.min) clubTier = 'topTier';
  else if ((clubGroup === 'elite' || clubGroup === 'strong') && avgSquadScore >= expectations.min) clubTier = 'professional';
  else if (avgSquadScore >= expectations.min * 0.8) clubTier = 'semiPro';
  
  return {
    clubName: managedClub,
    league: clubLeague,
    leagueGroup: clubGroup,
    squadSize: clubPlayers.length,
    avgSquadScore,
    topSquadScore,
    positionAnalysis,
    roleAnalysis,
    roleCoverage, // Add flexible role coverage data
    clubTier,
    expectations,
    criticalNeeds: Object.entries(positionAnalysis)
      .filter(([pos, data]) => data.isCritical)
      .map(([pos]) => pos),
    weakPositions: Object.entries(positionAnalysis)
      .filter(([pos, data]) => data.isWeak)
      .map(([pos]) => pos),
    upgradeNeeds: Object.entries(positionAnalysis)
      .filter(([pos, data]) => data.needsUpgrade)
      .map(([pos]) => pos)
  };
}

function getContextualRecommendation(playerData, clubContext, totalValue, performanceTier, contractMultiplier, versatilityData) {
  if (!clubContext) {
    // Default recommendations without club context
    if (performanceTier === 'elite') return { recommendation: '🔥 Exceptional talent - premium investment', priority: 'HIGH' };
    if (performanceTier === 'excellent') return { recommendation: '⭐ High-quality player - solid investment', priority: 'MEDIUM' };
    if (performanceTier === 'good') return { recommendation: '✅ Good squad player - fair value', priority: 'LOW' };
    return { recommendation: '📊 Squad depth option - budget-friendly', priority: 'LOW' };
  }
  
  const { clubTier, positionAnalysis, roleAnalysis, roleCoverage, leagueGroup, expectations, criticalNeeds, weakPositions, upgradeNeeds } = clubContext;
  const playerScore = playerData.bestScore;
  const playerPos = famFromTokens(expandFMPositions(playerData.position));
  const playerRole = playerData.bestRole;  // Get player's best role
  const playerLeague = playerData.leagueGroup;
  
  // Get current position strength at the club
  const currentPosData = positionAnalysis[playerPos];
  const currentBestScore = currentPosData?.bestScore || 0;
  const currentAvgScore = currentPosData?.avgScore || 0;
  const currentPlayerCount = currentPosData?.players?.length || 0;

  // KEY CHANGE: Get role-specific comparison data
  const currentRoleData = roleAnalysis[playerRole];
  const currentRoleBestScore = currentRoleData?.bestScore || 0;
  const currentRoleAvgScore = currentRoleData?.avgScore || 0;
  const currentRolePlayerCount = currentRoleData?.count || 0;
  const currentRoleBestPlayerName = currentRoleData?.bestPlayerName || null;

  // NEW: Check flexible role coverage
  const roleCoverageData = roleCoverage[playerRole] || [];
  const hasFlexibleCoverage = roleCoverageData.length > 0;
  const bestFlexibleScore = hasFlexibleCoverage ? Math.max(...roleCoverageData.map(p => p.score)) : 0;
  const flexibleCoverageCount = roleCoverageData.length;
  
  // League tier adjustment - players from higher leagues get bonus consideration
  let leagueTierBonus = 0;
  const leagueTiers = { elite: 5, strong: 4, solid: 3, growth: 2, develop: 1 };
  const playerLeagueTier = leagueTiers[playerLeague] || 2;
  const clubLeagueTier = leagueTiers[leagueGroup] || 2;
  
  if (playerLeagueTier > clubLeagueTier) {
    leagueTierBonus = (playerLeagueTier - clubLeagueTier) * 5; // 5 point bonus per tier
  } else if (playerLeagueTier < clubLeagueTier) {
    leagueTierBonus = (playerLeagueTier - clubLeagueTier) * 3; // 3 point penalty per tier down
  }
  
  const adjustedPlayerScore = playerScore + leagueTierBonus;
  
  // KEY CHANGE: Compare against role-specific players, not all position players
  const isSignificantRoleUpgrade = adjustedPlayerScore > currentRoleBestScore + 10;
  const isRoleUpgrade = adjustedPlayerScore > currentRoleBestScore + 3;
  const isSimilarRoleLevel = Math.abs(adjustedPlayerScore - currentRoleBestScore) <= 3;
  const isRoleDowngrade = adjustedPlayerScore < currentRoleBestScore - 3;
  
  // Position-specific need analysis (keep this for general position needs)
  const isCriticalNeed = criticalNeeds.includes(playerPos);
  const isWeakPosition = weakPositions.includes(playerPos);
  const needsUpgrade = upgradeNeeds.includes(playerPos);
  const hasGoodDepth = currentPlayerCount >= 3;
  
  // Role-specific need analysis (updated with flexible coverage)
  const hasNoRolePlayers = currentRolePlayerCount === 0;
  const hasWeakRolePlayers = currentRoleBestScore < expectations.min;
  const needsRoleUpgrade = currentRoleBestScore < expectations.good;
  
  // Consider flexible coverage in critical need assessment
  const hasCriticalNeed = hasNoRolePlayers && !hasFlexibleCoverage;
  const hasAdequateCoverage = hasFlexibleCoverage && bestFlexibleScore >= expectations.min;
  
  // Value considerations relative to league
  const leagueValueThresholds = {
    elite: { high: 100000000, medium: 50000000, low: 20000000 },
    strong: { high: 30000000, medium: 15000000, low: 5000000 },
    solid: { high: 10000000, medium: 3000000, low: 1000000 },
    growth: { high: 3000000, medium: 1000000, low: 300000 },
    develop: { high: 1000000, medium: 300000, low: 100000 }
  };
  
  const thresholds = leagueValueThresholds[leagueGroup] || leagueValueThresholds.solid;
  const isExpensive = totalValue > thresholds.high;
  const isAffordable = totalValue < thresholds.low;
  
  // Contract opportunity
  const contractOpportunity = contractMultiplier < 0.8;
  
  // Generate contextual recommendation
  let recommendation = '';
  let priority = 'LOW';
  let clubFit = 'SIMILAR';
  
  // Critical position needs with flexible coverage consideration
  if (isCriticalNeed || hasCriticalNeed) {
    if (adjustedPlayerScore >= expectations.min) {
      if (hasCriticalNeed) {
        recommendation = `🚨 CRITICAL ROLE NEED - No ${playerRole} specialist or capable coverage! Essential signing`;
      } else {
        recommendation = `🚨 CRITICAL NEED - No ${playerPos} coverage! Essential signing`;
      }
      priority = 'CRITICAL';
      clubFit = 'ESSENTIAL';
    } else {
      recommendation = `⚠️ Position need but player may struggle at ${leagueGroup} level`;
      priority = 'MEDIUM';
      clubFit = 'RISKY';
    }
  }
  // Consider flexible coverage in recommendations
  else if (hasNoRolePlayers && hasFlexibleCoverage && !isSignificantRoleUpgrade) {
    const coveragePlayers = roleCoverageData.map(p => p.name).join(", ");
    recommendation = `✅ Role covered by flexible players (${coveragePlayers} at ${bestFlexibleScore.toFixed(1)}) - not critical need`;
    priority = isRoleUpgrade ? 'MEDIUM' : 'LOW';
    clubFit = isRoleUpgrade ? 'UPGRADE' : 'DEPTH';
  }
  // Major signing when no specialists exist but player would be excellent
  else if (hasNoRolePlayers && isSignificantRoleUpgrade) {
    const flexCoverage = hasFlexibleCoverage ? ` (flexible coverage: ${bestFlexibleScore.toFixed(1)})` : '';
    recommendation = `🌟 Major ${playerRole} signing - establishes specialist quality${flexCoverage}`;
    priority = 'HIGH';
    clubFit = 'ESSENTIAL';
    
    if (playerLeagueTier > clubLeagueTier) {
      recommendation += `\n✨ Higher league experience - proven at ${playerLeague} level`;
    }
  }
  // Role-specific significant upgrades (when specialists exist)
  else if ((hasWeakRolePlayers || needsRoleUpgrade) && isSignificantRoleUpgrade && !hasNoRolePlayers) {
    recommendation = `🔥 Major ${playerRole} upgrade - transforms role quality (current best: ${currentRoleBestScore.toFixed(1)}${currentRoleBestPlayerName ? ` by ${currentRoleBestPlayerName}` : ''})`;
    priority = 'HIGH';
    clubFit = 'UPGRADE';
    
    if (playerLeagueTier > clubLeagueTier) {
      recommendation += `\n✨ Higher league experience - proven at ${playerLeague} level`;
    }
  }
  // Role-specific regular upgrades
  else if (needsRoleUpgrade && isRoleUpgrade) {
    if (playerLeagueTier > clubLeagueTier) {
      recommendation = `⭐ Step-up ${playerRole} - ${playerLeague} quality improves role (current: ${currentRoleBestScore.toFixed(1)}${currentRoleBestPlayerName ? ` by ${currentRoleBestPlayerName}` : ''})`;
      priority = 'HIGH';
    } else if (playerLeagueTier === clubLeagueTier) {
      recommendation = `📈 Solid ${playerRole} upgrade - improves role quality (current: ${currentRoleBestScore.toFixed(1)}${currentRoleBestPlayerName ? ` by ${currentRoleBestPlayerName}` : ''})`;
      priority = 'MEDIUM';
    } else {
      recommendation = `⚠️ Lower league ${playerRole} - may need time to adapt to ${leagueGroup}`;
      priority = 'LOW';
    }
    clubFit = 'UPGRADE';
  }
  // Role comparison for already strong roles
  else if (currentRoleBestScore >= expectations.good) {
    if (isSignificantRoleUpgrade && playerLeagueTier >= clubLeagueTier) {
      recommendation = `🌟 Elite ${playerRole} upgrade - but role already strong (current: ${currentRoleBestScore.toFixed(1)}${currentRoleBestPlayerName ? ` by ${currentRoleBestPlayerName}` : ''})`;
      priority = isAffordable ? 'MEDIUM' : 'LOW';
      clubFit = 'LUXURY';
    } else if (currentRolePlayerCount >= 2) {
      recommendation = `❌ ${playerRole} already covered - good depth in role (${currentRolePlayerCount} players)`;
      priority = 'LOW';
      clubFit = 'SURPLUS';
    } else if (currentRolePlayerCount < 2 && isSimilarRoleLevel) {
      recommendation = `✅ ${playerRole} depth - adds rotation option (current: ${currentRoleBestScore.toFixed(1)}${currentRoleBestPlayerName ? ` by ${currentRoleBestPlayerName}` : ''})`;
      priority = 'LOW';
      clubFit = 'DEPTH';
    } else {
      recommendation = `❌ Below current ${playerRole} standard (current best: ${currentRoleBestScore.toFixed(1)}${currentRoleBestPlayerName ? ` by ${currentRoleBestPlayerName}` : ''})`;
      priority = 'LOW';
      clubFit = 'DOWNGRADE';
    }
  }
  // Standard analysis for other cases (using role comparison)
  else {
    if (isSignificantRoleUpgrade) {
      recommendation = `🚀 Major ${playerRole} upgrade - significant improvement (current: ${currentRoleBestScore.toFixed(1)}${currentRoleBestPlayerName ? ` by ${currentRoleBestPlayerName}` : ''})`;
      priority = 'HIGH';
      clubFit = 'UPGRADE';
    } else if (isRoleUpgrade) {
      recommendation = `📈 Good ${playerRole} improvement - steady enhancement (current: ${currentRoleBestScore.toFixed(1)}${currentRoleBestPlayerName ? ` by ${currentRoleBestPlayerName}` : ''})`;
      priority = 'MEDIUM';  
      clubFit = 'UPGRADE';
    } else if (isSimilarRoleLevel) {
      recommendation = currentRolePlayerCount >= 2 ? 
        `✅ ${playerRole} depth - similar level to current best (${currentRoleBestScore.toFixed(1)}${currentRoleBestPlayerName ? ` by ${currentRoleBestPlayerName}` : ''})` :
        `🔧 ${playerRole} cover - fills role gap (current: ${currentRoleBestScore.toFixed(1)}${currentRoleBestPlayerName ? ` by ${currentRoleBestPlayerName}` : ''})`;
      priority = 'LOW';
      clubFit = 'SIMILAR';
    } else {
      recommendation = `❌ Below ${playerRole} standard - current players stronger (best: ${currentRoleBestScore.toFixed(1)}${currentRoleBestPlayerName ? ` by ${currentRoleBestPlayerName}` : ''})`;
      priority = 'LOW';
      clubFit = 'DOWNGRADE';
    }
  }
  
  // Add league tier context
  if (playerLeagueTier > clubLeagueTier && priority !== 'LOW') {
    recommendation += `\n🏆 Higher league pedigree (+${leagueTierBonus} adjusted rating)`;
  } else if (playerLeagueTier < clubLeagueTier) {
    recommendation += `\n⚠️ Lower league background (${leagueTierBonus} rating adjustment)`;
  }
  
  // Add contract considerations
  if (contractOpportunity && priority !== 'LOW') {
    recommendation += '\n💰 Contract expiring - opportunity for discount';
  }
  
  // Add versatility note for relevant signings
  if (versatilityData.versatility > 1.1 && priority !== 'LOW') {
    recommendation += '\n🔄 Versatile player - covers multiple positions';
  }
  
  // Add value context
  if (isExpensive && priority === 'HIGH') {
    recommendation += '\n💸 Premium investment - stretch budget for quality';
  } else if (isAffordable && priority === 'MEDIUM') {
    recommendation += '\n💚 Good value - affordable improvement';
  }
  
  return { 
    recommendation, 
    priority: priority === 'CRITICAL' ? 'CRITICAL' : priority, 
    clubFit,
    positionContext: {
      currentBest: currentBestScore,
      currentCount: currentPlayerCount,
      needLevel: isCriticalNeed ? 'CRITICAL' : isWeakPosition ? 'WEAK' : needsUpgrade ? 'UPGRADE' : 'STRONG',
      leagueTierBonus
    },
    roleContext: {
      role: playerRole,
      currentRoleBest: currentRoleBestScore,
      currentRoleCount: currentRolePlayerCount,
      currentRoleBestPlayerName: currentRoleBestPlayerName,
      isRoleUpgrade: isRoleUpgrade,
      isSignificantRoleUpgrade: isSignificantRoleUpgrade,
      hasNoRolePlayers,
      needsRoleUpgrade
    }
  };
}

/* ===================== Enhanced Value Breakdown Component ===================== */
const ValueBreakdown = ({ playerName, getValueBreakdown, managedClub, rows, filteredRows, pctIndex }) => {
  if (!playerName) return <div style={{color: "var(--muted)"}}>Select a player to see value analysis</div>;
  
  const breakdown = getValueBreakdown(playerName);
  if (!breakdown) return <div style={{color: "var(--error)"}}>Unable to analyze value for this player</div>;

  const {
    totalValue, gameValue, bestRole, bestScore, league, leagueGroup, position, posFamily,
    age, minutes, contractExpiry, contractMultiplier, performanceTier,
    versatilityData, leagueContextBonus, components, recommendations
  } = breakdown;

  // Market valuation analysis
  const getMarketValuation = (trueValue, gameValue) => {
    if (!Number.isFinite(gameValue) || gameValue === 0) return { status: 'Unknown', color: 'var(--muted)', ratio: null };
    
    const ratio = trueValue / gameValue;
    
    if (ratio >= 1.3) return { status: 'Significantly Undervalued', color: 'var(--accent)', ratio };
    if (ratio >= 1.15) return { status: 'Undervalued', color: '#7ED321', ratio };
    if (ratio >= 0.85) return { status: 'Fairly Valued', color: 'var(--ink)', ratio };
    if (ratio >= 0.7) return { status: 'Overvalued', color: '#F7931E', ratio };
    return { status: 'Significantly Overvalued', color: 'var(--accent2)', ratio };
  };

  const marketValuation = getMarketValuation(totalValue, gameValue);

  // Analyze club context for tailored recommendations
  const clubContext = analyzeClubContext(managedClub, filteredRows, pctIndex);
  const contextualRec = getContextualRecommendation(
    breakdown, clubContext, totalValue, performanceTier, contractMultiplier, versatilityData
  );

  const formatMoney = (val) => {
    if (!Number.isFinite(val)) return "—";
    if (val >= 1e6) return `£${(val/1e6).toFixed(1)}M`;
    if (val >= 1e3) return `£${(val/1e3).toFixed(0)}K`;
    return `£${val.toFixed(0)}`;
  };

  const formatPercent = (val) => `${(val * 100).toFixed(0)}%`;
  const formatMultiplier = (val) => `${val.toFixed(2)}x`;

  const getTierColor = (tier) => {
    switch(tier) {
      case 'elite': return '#FF6B35';
      case 'excellent': return '#F7931E'; 
      case 'good': return '#4A90E2';
      case 'average': return '#7ED321';
      default: return 'var(--muted)';
    }
  };

  const getTierLabel = (tier) => {
    switch(tier) {
      case 'elite': return '🌟 Elite (95%+)';
      case 'excellent': return '⭐ Excellent (90%+)';
      case 'good': return '✨ Good (75%+)';
      case 'average': return '📊 Average';
      default: return tier;
    }
  };

  return (
    <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', fontSize: '12px'}}>
      {/* Column 1: Player Overview */}
      <div>
        <h4 style={{margin: '0 0 12px 0', color: 'var(--accent)', fontSize: '14px'}}>📊 Player Overview</h4>
        
        <div style={{marginBottom: '8px'}}>
          <strong>Performance Tier:</strong>
          <div style={{color: getTierColor(performanceTier), fontWeight: 'bold', marginTop: '2px'}}>
            {getTierLabel(performanceTier)}
          </div>
        </div>

        <div style={{marginBottom: '8px'}}>
          <strong>Best Role:</strong> {bestRole}
          <div style={{color: 'var(--muted)', fontSize: '11px'}}>Score: {bestScore.toFixed(1)}/100</div>
        </div>

        <div style={{marginBottom: '8px'}}>
          <strong>League Context:</strong> {leagueGroup}
          <div style={{color: 'var(--muted)', fontSize: '11px'}}>
            Performance vs peers: {formatMultiplier(leagueContextBonus)}
          </div>
        </div>

        <div style={{marginBottom: '8px'}}>
          <strong>Versatility:</strong>
          <div style={{color: 'var(--muted)', fontSize: '11px'}}>
            Can play {versatilityData.applicableRolesCount} roles well
            {versatilityData.topRoles.length > 1 && (
              <div>Top alternatives: {versatilityData.topRoles.slice(1, 3).map(r => r.role).join(", ")}</div>
            )}
          </div>
        </div>

        <div style={{marginBottom: '8px'}}>
          <strong>Contract Status:</strong>
          <div style={{color: contractMultiplier < 0.8 ? 'var(--accent2)' : 'var(--muted)', fontSize: '11px'}}>
            Expires: {contractExpiry || "Unknown"}
            <div>Value impact: {formatPercent(contractMultiplier)}</div>
          </div>
        </div>
      </div>

      {/* Column 2: Value Components */}
      <div>
        <h4 style={{margin: '0 0 12px 0', color: 'var(--accent)', fontSize: '14px'}}>⚙️ Value Components</h4>
        
        {Object.entries(components).map(([key, value]) => {
          if (key === 'base') return null; // Skip base as it's just the starting scale
          
          const getComponentLabel = (k) => {
            switch(k) {
              case 'score': return 'Role Performance';
              case 'league': return 'League Quality';
              case 'minutes': return 'Playing Time';
              case 'age': return 'Age Curve';
              case 'bigMetrics': return 'Key Stats Bonus';
              case 'excellence': return 'Elite Performance';
              case 'contract': return 'Contract Length';
              case 'versatility': return 'Versatility Bonus';
              case 'scarcity': return 'Position Scarcity';
              case 'leagueContext': return 'League Standing';
              case 'economic': return 'Economic Factor';
              case 'reputation': return 'Reputation Value';
              default: return k;
            }
          };

          const isBonus = value > 1.05;
          const isPenalty = value < 0.95;
          
          return (
            <div key={key} style={{
              display: 'flex', 
              justifyContent: 'space-between', 
              marginBottom: '4px',
              color: isBonus ? 'var(--accent)' : isPenalty ? 'var(--accent2)' : 'inherit'
            }}>
              <span>{getComponentLabel(key)}:</span>
              <span style={{fontWeight: 'bold'}}>
                {formatMultiplier(value)}
                {isBonus && ' 📈'}
                {isPenalty && ' 📉'}
              </span>
            </div>
          );
        })}
      </div>

      {/* Column 3: Recommendations */}
      <div>
        <h4 style={{margin: '0 0 12px 0', color: 'var(--accent)', fontSize: '14px'}}>💰 Recommendations</h4>
        
        <div style={{marginBottom: '12px'}}>
          <div style={{fontWeight: 'bold', fontSize: '14px', color: 'var(--accent)'}}>
            True Value: {formatMoney(totalValue)}
          </div>
          <div style={{color: 'var(--muted)', fontSize: '11px', marginTop: '2px'}}>
            Market value estimate
          </div>
        </div>

        {gameValue && (
          <div style={{marginBottom: '12px'}}>
            <div style={{fontSize: '12px'}}>
              <strong>Game Value:</strong> {formatMoney(gameValue)}
            </div>
            <div style={{
              color: marketValuation.color, 
              fontWeight: 'bold', 
              fontSize: '11px',
              marginTop: '2px'
            }}>
              {marketValuation.status}
              {marketValuation.ratio && (
                <span style={{color: 'var(--muted)', fontWeight: 'normal'}}>
                  {' '}({marketValuation.ratio.toFixed(2)}x)
                </span>
              )}
            </div>
          </div>
        )}

        <div style={{marginBottom: '8px'}}>
          <strong>Fair Wage:</strong>
          <div style={{color: 'var(--ink)', fontWeight: 'bold'}}>
            {formatMoney(recommendations.fairWage)}/week
          </div>
        </div>

        <div style={{marginBottom: '8px'}}>
          <strong>Max Wage:</strong>
          <div style={{color: 'var(--muted)', fontWeight: 'bold'}}>
            {formatMoney(recommendations.maxWage)}/week
          </div>
          <div style={{color: 'var(--muted)', fontSize: '11px'}}>
            Negotiation ceiling
          </div>
        </div>

        <div style={{
          marginTop: '12px', 
          padding: '8px', 
          backgroundColor: 'var(--cardBg)', 
          border: '1px solid var(--cardBorder)',
          borderRadius: '4px'
        }}>
          <div style={{fontSize: '11px', color: 'var(--muted)', marginBottom: '4px'}}>
            {managedClub ? `Recommendation for ${managedClub}:` : 'Quick Assessment:'}
          </div>
          
          {clubContext && (
            <div style={{fontSize: '10px', color: 'var(--muted)', marginBottom: '6px'}}>
              Your squad: {clubContext.leagueGroup} level • {clubContext.league}
              <div>
                {bestRole}: {clubContext.roleAnalysis[bestRole]?.count || 0} specialists • 
                Best: {(clubContext.roleAnalysis[bestRole]?.bestScore || 0).toFixed(1)} 
                {clubContext.roleAnalysis[bestRole]?.bestPlayerName && 
                  ` (${clubContext.roleAnalysis[bestRole].bestPlayerName})`
                } • 
                Status: {
                  !clubContext.roleAnalysis[bestRole] && (!clubContext.roleCoverage?.[bestRole] || clubContext.roleCoverage[bestRole].length === 0) ? '🚨 NO COVERAGE' :
                  !clubContext.roleAnalysis[bestRole] && clubContext.roleCoverage?.[bestRole]?.length > 0 ? '🔄 FLEXIBLE ONLY' :
                  (clubContext.roleAnalysis[bestRole]?.bestScore || 0) < clubContext.expectations.min ? '🚨 WEAK' :
                  (clubContext.roleAnalysis[bestRole]?.bestScore || 0) < clubContext.expectations.good ? '⚠️ NEEDS UPGRADE' :
                  '✅ STRONG'
                }
                {clubContext.roleCoverage?.[bestRole]?.length > 0 && (
                  <div style={{fontSize: '9px', color: 'var(--muted)', marginTop: '2px'}}>
                    Flexible coverage: {clubContext.roleCoverage[bestRole].map(p => 
                      `${p.name} (${p.score.toFixed(0)}, best: ${p.bestRole})`
                    ).join(', ')}
                  </div>
                )}
              </div>
              <div style={{fontSize: '9px', opacity: '0.8'}}>
                Position ({posFamily}): {clubContext.positionAnalysis[posFamily]?.players?.length || 0} total • 
                Best: {(clubContext.positionAnalysis[posFamily]?.bestScore || 0).toFixed(1)}
              </div>
              {contextualRec?.positionContext?.leagueTierBonus && (
                <div>League adjustment: {contextualRec.positionContext.leagueTierBonus > 0 ? '+' : ''}{contextualRec.positionContext.leagueTierBonus} rating points</div>
              )}
            </div>
          )}
          
          <div style={{fontSize: '11px', whiteSpace: 'pre-line'}}>
            {contextualRec ? contextualRec.recommendation : (
              performanceTier === 'elite' ? '🔥 Exceptional talent - premium investment' :
              performanceTier === 'excellent' ? '⭐ High-quality player - solid investment' :
              performanceTier === 'good' ? '✅ Good squad player - fair value' :
              '📊 Squad depth option - budget-friendly'
            )}
          </div>
          
          {contextualRec && (
            <div style={{
              marginTop: '4px', 
              fontSize: '10px', 
              padding: '2px 6px',
              borderRadius: '3px',
              display: 'inline-block',
              backgroundColor: 
                contextualRec.priority === 'CRITICAL' ? 'rgba(220, 38, 38, 0.2)' :
                contextualRec.priority === 'HIGH' ? 'rgba(255, 107, 53, 0.2)' :
                contextualRec.priority === 'MEDIUM' ? 'rgba(74, 144, 226, 0.2)' :
                'rgba(126, 211, 33, 0.2)',
              color:
                contextualRec.priority === 'CRITICAL' ? '#DC2626' :
                contextualRec.priority === 'HIGH' ? '#FF6B35' :
                contextualRec.priority === 'MEDIUM' ? '#4A90E2' :
                '#7ED321'
            }}>
              {contextualRec.priority} PRIORITY • {contextualRec.clubFit} FIT
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default function App(){
  /* ---------- UI Theme / Mode ---------- */
  const [themeName, setThemeName] = useStickyState("ui:theme","sleek");
  const theme = THEMES[themeName] || THEMES.sleek;
  const [mode, setMode] = useStickyState("ui:mode","Player Profile");
  const [sidebarCollapsed, setSidebarCollapsed] = useStickyState("ui:sidebarCollapsed", false);

  /* ---------- Data ---------- */
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState("Load a CSV or HTML table exported from your data source.");

  /* ---------- Filters ---------- */
  const [posCohort, setPosCohort] = useStickyState("flt:posCohort", POS14);
  const [minMinutes, setMinMinutes] = useStickyState("flt:minMinutes", 600);
  const [maxAge, setMaxAge] = useStickyState("flt:maxAge", 33);

  /* ---------- Current Game Date ---------- */
  const [gameMonth, setGameMonth] = useStickyState("game:month", 7); // July start of season
  const [gameYear, setGameYear] = useStickyState("game:year", 2024);

  /* ---------- Managed Club ---------- */
  const [managedClub, setManagedClub] = useStickyState("manager:club", "");

  /* ---------- Transfer Planner Settings ---------- */
  const [transferBudget, setTransferBudget] = useStickyState("transfer:budget", 50); // £50M default for Premier League
  const [transferMinAge, setTransferMinAge] = useStickyState("transfer:minAge", 18);
  const [transferMaxAge, setTransferMaxAge] = useStickyState("transfer:maxAge", 28);
  const [transferMinRating, setTransferMinRating] = useStickyState("transfer:minRating", 70);
  const [onlyShowNeeds, setOnlyShowNeeds] = useStickyState("transfer:onlyNeeds", false);
  const [transferSearchActive, setTransferSearchActive] = useStickyState("transfer:searchActive", false);
  const [transferSearching, setTransferSearching] = useState(false);
  const [findUnderrated, setFindUnderrated] = useStickyState("transfer:findUnderrated", false);
  const [transferMaxResults, setTransferMaxResults] = useStickyState("transfer:maxResults", 30);
  const [targetSpecificRole, setTargetSpecificRole] = useStickyState("transfer:targetRole", "");

  /* ---------- Search (buffered + applied) ---------- */
  const [searchQuery, setSearchQuery] = useStickyState("flt:q:query", "");
  const [searchApplied, setSearchApplied] = useStickyState("flt:applied", false);

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

  /* ---------- Dynamic value anchoring ---------- */
  const tierAverages = useMemo(() => {
    const tierGroups = { elite: [], strong: [], solid: [], growth: [], develop: [] };
    
    // Group rows by league tier and collect game values
    for (const r of rows) {
      const league = String(getCell(r, "League") || "");
      const group = leagueGroupOf(league);
      const gameVal = parseMoneyRange(getCell(r, "Transfer Value") || "").mid;
      
      // Only include finite, positive values with reasonable contract scenarios
      if (Number.isFinite(gameVal) && gameVal > 0) {
        const contractExpiry = getCell(r, "Expires") || "";
        const contractMult = contractExpiryMultiplier(contractExpiry, gameMonth, gameYear);
        
        // Adjust for contract expiry to get "full value" for anchoring
        const adjustedVal = gameVal / Math.max(contractMult, 0.15); // Avoid division by very small numbers
        tierGroups[group].push(adjustedVal);
      }
    }
    
    // Calculate robust statistics for each tier (using median and IQR)
    const averages = {};
    const adjustments = {};
    const expectedAverages = { 
      elite: 50_000_000, 
      strong: 8_000_000, 
      solid: 3_000_000, 
      growth: 1_500_000, 
      develop: 800_000 
    };
    
    for (const [tier, values] of Object.entries(tierGroups)) {
      if (values.length >= 3) {
        // Use median instead of mean for better robustness against outliers
        const sorted = [...values].sort((a, b) => a - b);
        const median = sorted[Math.floor(sorted.length / 2)];
        
        // Calculate interquartile range for outlier filtering
        const q1 = sorted[Math.floor(sorted.length * 0.25)];
        const q3 = sorted[Math.floor(sorted.length * 0.75)];
        const iqr = q3 - q1;
        
        // Filter outliers and recalculate
        const filtered = values.filter(v => v >= (q1 - 1.5 * iqr) && v <= (q3 + 1.5 * iqr));
        
        if (filtered.length > 0) {
          averages[tier] = filtered.reduce((a, b) => a + b, 0) / filtered.length;
        } else {
          averages[tier] = median;
        }
      } else if (values.length > 0) {
        // Small sample size, use simple average
        averages[tier] = values.reduce((a, b) => a + b, 0) / values.length;
      } else {
        // No data, use fallback
        averages[tier] = expectedAverages[tier];
      }
      
      // Calculate adjustment factor with progressive dampening
      const actual = averages[tier];
      const expected = expectedAverages[tier];
      const ratio = actual / expected;
      
      // Apply progressive dampening based on sample size and ratio magnitude
      const sampleWeight = Math.min(values.length / 20, 1.0); // Full weight at 20+ samples
      const dampingFactor = tier === 'elite' ? 0.4 : 0.5; // More conservative for elite
      
      // Limit extreme adjustments more aggressively
      const clampedRatio = Math.min(Math.max(ratio, 0.4), 2.5);
      const dampedAdjustment = Math.pow(clampedRatio, dampingFactor);
      
      // Blend with default based on sample size
      adjustments[tier] = 1.0 + sampleWeight * (dampedAdjustment - 1.0);
    }
    
    return { averages, adjustments, sampleSizes: Object.fromEntries(Object.entries(tierGroups).map(([k, v]) => [k, v.length])) };
  }, [rows, gameMonth, gameYear]);

  /* ---------- Value model config with dynamic anchoring ---------- */
  const dynamicValueCfg = useMemo(() => {
    const base = { ...safeValueCfg };
    
    // Apply dynamic scaling to base scales based on loaded data
    base.baseScales = {};
    for (const [tier, scale] of Object.entries(safeValueCfg.baseScales || {})) {
      const adjustment = tierAverages.adjustments[tier] || 1.0;
      base.baseScales[tier] = scale * adjustment;
    }
    
    // Also store the anchoring info for debugging/display
    base._anchoringInfo = {
      averages: tierAverages.averages,
      adjustments: tierAverages.adjustments,
      sampleSizes: tierAverages.sampleSizes
    };
    
    return base;
  }, [safeValueCfg, tierAverages]);

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
              setStatus(`Loaded ${rowsN.length} rows. Player names normalized (accents removed).`);
              resolve();
            },
            error: (err) => reject(err),
          });
        });
      } else if (ext === "html" || ext === "htm") {
        const rowsN = await parseHtmlTable(file);
        setRows(normalizeHeadersRowObjects(rowsN));
        setStatus(`Loaded ${rowsN.length} rows from HTML table. Player names normalized (accents removed).`);
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
      
      // Normalize search query and fields for better matching
      const q = normalizePlayerName((searchQuery || "").trim().toLowerCase());
      const name = normalizePlayerName(String(r["Name"]||"").toLowerCase());
      const club = normalizePlayerName(String(r["Club"]||"").toLowerCase());
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

  // Base percentile index - now defaults to filtered cohort for consistency
  const pctIndex = useMemo(() => buildPercentileIndex(filteredRows, allStats), [filteredRows, allStats]);
  
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
  const uniqueClubs = useMemo(() => {
    const clubs = rows.map(r => getCell(r, "Club")).filter(Boolean);
    return Array.from(new Set(clubs)).sort();
  }, [rows]);
  
  const handleSearch = useCallback((value) => {
    setSearchQuery(value);
    setSearchApplied(!!value);
    // Auto-select player if exact match and clear search for better UX
    if (value && players.includes(value)) {
      setPlayer(value);
      // Clear search after selection to show full scatter plots
      setTimeout(() => {
        setSearchQuery("");
        setSearchApplied(false);
      }, 100);
    }
  }, [setSearchQuery, setSearchApplied, players, setPlayer]);
  
  const clearSearch = useCallback(()=>{
    handleSearch("");
  }, [handleSearch]);
  
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

  /* ---------- Enhanced value breakdown for detailed analysis ---------- */
  const getValueBreakdown = useCallback((name) => {
    const r = rowByName.get(name);
    if (!r) return null;
    
    const result = trueValueOf(r, pctIndex, dynamicValueCfg, gameMonth, gameYear, filteredRows);
    const { valueM, bestRole, bestScore, group, contractMultiplier, posFamily, 
            performanceTier, versatilityData, leagueContextBonus, components } = result;
    
    // Get game value for market comparison
    const gameValueRaw = getCell(r, "Transfer Value");
    const gameValue = parseMoneyRange(gameValueRaw).mid || 0;
    
    return {
      player: name,
      totalValue: valueM * 1e6,
      gameValue: gameValue,
      bestRole,
      bestScore,
      league: String(getCell(r, "League") || ""),
      leagueGroup: group,
      position: getCell(r, "Pos") || "",
      posFamily,
      age: numCell(r, "Age"),
      minutes: numCell(r, "Minutes"),
      contractExpiry: getCell(r, "Expires") || "",
      contractMultiplier,
      performanceTier,
      versatilityData,
      leagueContextBonus,
      components,
      recommendations: {
        buyPrice: buyAtOf(r, pctIndex, dynamicValueCfg, gameMonth, gameYear, filteredRows),
        fairWage: weeklyWageOf(r, pctIndex, dynamicValueCfg, gameMonth, gameYear, filteredRows),
        maxWage: weeklyWageMaxOf(r, pctIndex, dynamicValueCfg, gameMonth, gameYear, filteredRows)
      }
    };
  }, [rowByName, pctIndex, dynamicValueCfg, gameMonth, gameYear, filteredRows]);

  /* ---------- Market-adjusted value wrapper with enhanced modeling ---------- */
  const marketAdjustedValueM = useCallback((name)=>{
    const r = rowByName.get(name); if (!r) return NaN;
    const base = trueValueOf(r, pctIndex, dynamicValueCfg, gameMonth, gameYear, filteredRows); // Enhanced with comparative data
    let { valueM, bestRole, bestScore, group, components } = base;

    // rank uplift (scaled by rank share)
    const rk = bestRoleRank(name);
    const rankShare = Number.isFinite(rk.rank) && rk.of>0 ? (rk.of - rk.rank + 1) / rk.of : 0;
    const rankFactor = 1 + (dynamicValueCfg.topRankPremiumMax || 0.60) * rankShare * (group === "elite" ? 1 : 0.45);
    valueM *= rankFactor;

    // slight extra for elite forwards (kept conservative)
    if (group === "elite" && getPositionalFamily(expandFMPositions(getCell(r,"Pos"))) === "FW") {
      const fwPrem = dynamicValueCfg.eliteFwPremium || 0.25;
      valueM *= (1 + fwPrem * 0.7);
    }

    // enforce elite floors for very top scorers
    if (group === "elite" && bestScore >= 90) {
      const floors = dynamicValueCfg.eliteTopFloorM || {};
      const famKey = getPositionalFamily(expandFMPositions(getCell(r,"Pos"))) || "MF";
      const floorM = floors[famKey] || 0;
      if (valueM < floorM) valueM = floorM;
    }

    // damping (log-space compression) to reduce extreme tails (stronger)
    try {
      const safe = Math.max(0.1, valueM);
      const dampFactor = (group === "elite") ? 0.90 : 0.95;
      valueM = Math.exp(Math.log(safe) * dampFactor);
    } catch (err) { /* ignore */ }

    return valueM;
  }, [rowByName, pctIndex, dynamicValueCfg, gameMonth, gameYear, filteredRows]);

  /* ---------- True value, buyAt (enhanced) ---------- */
  const trueValue = useCallback((name)=>{ const m = marketAdjustedValueM(name); return Number.isFinite(m) ? m*1e6 : NaN; }, [marketAdjustedValueM]);
  const buyAt = useCallback((name)=>{ 
    const r = rowByName.get(name); 
    if (!r) return NaN;
    return buyAtOf(r, pctIndex, dynamicValueCfg, gameMonth, gameYear, filteredRows);
  }, [rowByName, pctIndex, dynamicValueCfg, gameMonth, gameYear, filteredRows]);

  /* ---------- Enhanced wage calculations ---------- */
  const fairWage = useCallback((name)=>{ 
    const r = rowByName.get(name); 
    if (!r) return NaN;
    return weeklyWageOf(r, pctIndex, dynamicValueCfg, gameMonth, gameYear, filteredRows);
  }, [rowByName, pctIndex, dynamicValueCfg, gameMonth, gameYear, filteredRows]);

  const maxWage = useCallback((name)=>{ 
    const r = rowByName.get(name); 
    if (!r) return NaN;
    const modelMax = weeklyWageMaxOf(r, pctIndex, dynamicValueCfg, gameMonth, gameYear, filteredRows);
    const current = wageWeeklyOf(r);
    const respect = Number.isFinite(current) ? current * (dynamicValueCfg.wageRespectCurrentMult || 1.10) : 0;
    return Math.max(modelMax, respect);
  }, [rowByName, pctIndex, dynamicValueCfg, gameMonth, gameYear, filteredRows, wageWeeklyOf]);  /* ---------- Scatter datasets ---------- */
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
    const cachedRole = br.role || Object.keys(ROLE_STATS)[0] || "";
    
    // Calculate role scores fresh to ensure consistency with role matrix
    const roleScores = Object.keys(ROLE_BOOK).map(roleName => {
      const baseline = ROLE_BASELINES[roleName] || [];
      if (!sharesAny(expandFMPositions(getCell(r,"Pos")), baseline)) return null;
      return { roleName, score: roleScoreFor(r, roleName, pctIndex) || 0 };
    }).filter(Boolean).sort((a,b)=>b.score-a.score);
    
    // Use the fresh calculation for consistency
    const bestRole = roleScores.length > 0 ? roleScores[0].roleName : cachedRole;
    const bestScore = roleScores.length > 0 ? roleScores[0].score : Number(br.score || 0);

    // Calculate enhanced true value to match the ValueBreakdown component
    const enhancedValueResult = trueValueOf(r, pctIndex, dynamicValueCfg, gameMonth, gameYear, filteredRows);
    const enhancedTrueValue = enhancedValueResult.valueM * 1000000; // Convert back to pounds

    // Use calculated roleScores for top roles
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
  // Apply -10% display adjustment as requested
  const tv = trueValue(player) * 0.9;
  const ba = buyAt(player) * 0.9;

    const currentW = wageWeeklyOf(r);
    const fw = fairWage(player);
    const mw = maxWage(player);

    // Contract expiry information
    const contractInfo = getContractInfo(r, gameMonth, gameYear);

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
      
      // Get relevant positions for both roles
      const rxPositions = ROLE_BOOK[rx]?.baseline || [];
      const ryPositions = ROLE_BOOK[ry]?.baseline || [];
      const relevantPositions = new Set([...rxPositions, ...ryPositions]);
      
      const pts = filteredRows.map(rr => ({
        name: rr["Name"],
        club: rr["Club"],
        pos: expandFMPositions(rr["Pos"])[0]||"",
        x: roleScoreOfRow(rr, rx),
        y: roleScoreOfRow(rr, ry)
      })).filter(p => {
        // Only include players with finite scores and relevant positions
        if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) return false;
        
        // Check if player's position is relevant for either role
        const playerPositions = expandFMPositions(filteredRows.find(r => r["Name"] === p.name)?.["Pos"] || "");
        return playerPositions.some(pos => relevantPositions.has(pos));
      });
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
              <div className="phKpi"><div>True Value</div><b>{money(enhancedTrueValue)}</b></div>
              <div className="phKpi" style={{fontSize: "10px"}}><div>Best Role</div><b>{bestRole}</b></div>
              <div className="phKpi"><div>Best Score</div><b>{Number.isFinite(bestScore)?bestScore.toFixed(2):"—"}</b></div>
              
              <div className="phKpi" style={{color: contractInfo.multiplier < 0.7 ? "var(--accent2)" : "var(--ink)"}}>
                <div>Contract</div><b>{contractInfo.status}</b>
              </div>
              {contractInfo.multiplier !== 1.0 && (
                <div className="phKpi" style={{fontSize: "10px", color: "var(--muted)"}}>
                  <div>Value Impact</div><b>{(contractInfo.multiplier * 100).toFixed(0)}%</b>
                </div>
              )}

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

        {/* Enhanced Value Breakdown Section */}
        <div className="card" style={{margin: "0 12px 12px 12px"}}>
          <div className="cardHead">
            <div style={{fontWeight:800}}>🎯 Enhanced Value Analysis</div>
            <div className="badge">Advanced Algorithm</div>
          </div>
          <div className="cardBody">
            <ValueBreakdown 
              playerName={player} 
              getValueBreakdown={getValueBreakdown} 
              managedClub={managedClub}
              rows={rows}
              filteredRows={filteredRows}
              pctIndex={pctIndex}
            />
          </div>
        </div>

        <div style={{display: "flex", flexDirection: "column", gap: "12px", padding: "0 12px"}}>
          {/* Pizza Chart - Full Width Centered */}
          <div className="card">
            <div className="cardHead" style={{padding: "12px 16px"}}>
              <div style={{fontWeight:800, fontSize: "16px"}}>Role Pizza — {bestRole}</div>
              <div className="badge">vs {compScope}</div>
            </div>
            <div className="cardBody" style={{padding: "16px", display: "flex", flexDirection: "column", alignItems: "center"}}>
              <div style={{fontSize: "12px", color: "var(--muted)", marginBottom: "16px"}}>
                {player} — {bestRole}
              </div>
              <div style={{width: "600px", height: "600px"}}>
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

          {/* Key Statistics - Full Width */}
          <div className="card">
            <div className="cardHead" style={{padding: "12px 16px"}}>
              <div style={{fontWeight:800, fontSize: "16px"}}>Key Statistics</div>
              <div className="badge">Top 12 Percentiles</div>
            </div>
            <div className="cardBody" ref={bestBoxRef} style={{padding:"16px"}}>
              <div style={{display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "8px"}}>
                {bestPairs.map((pair,i)=>(
                  <div key={i} style={{
                    display: "flex", 
                    justifyContent: "space-between", 
                    alignItems: "center", 
                    padding: "8px 12px",
                    borderRadius: "4px",
                    backgroundColor: pair.pct >= 90 ? "rgba(var(--accent-rgb), 0.1)" : "rgba(128, 128, 128, 0.05)",
                    border: pair.pct >= 90 ? "1px solid var(--accent)" : "1px solid var(--cardBorder)",
                    fontSize: "13px"
                  }}>
                    <div style={{fontWeight:600, overflow: "hidden", textOverflow: "ellipsis"}}>{pair.label}</div>
                    <div style={{display: "flex", alignItems: "center", gap: "8px", flexShrink: 0}}>
                      <div style={{color: "var(--muted)", fontSize: "12px"}}>{tf(pair.raw,2)}</div>
                      <div style={{fontWeight:800, fontSize: "14px", color: pair.pct >= 90 ? "var(--accent)" : "inherit", minWidth: "45px", textAlign: "right"}}>
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
        <div className="cardHead" style={{gap:12}}>
          <div style={{fontWeight:800, fontSize: "1.1em"}}>Radar Chart — {player}</div>
          <select className="input" style={{minWidth:200}} value={role} onChange={e=>setRole(e.target.value)}>
            {Object.keys(ROLE_STATS).map(k => <option key={k} value={k}>{k}</option>)}
          </select>
          <div className="badge">Percentiles vs {compScope}</div>
        </div>
        <div className="cardBody" style={{display:"flex", justifyContent:"center", minHeight:"600px"}}>
          <div style={{width:"100%", maxWidth:"800px"}}>
            <Radar series={series}/>
          </div>
        </div>
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
        <div className="cardHead" style={{gap:12}}>
          <div style={{fontWeight:800, fontSize: "1.1em"}}>Role Matrix — {roleX} vs {roleY}</div>
          <div style={{display:"flex", gap:8, alignItems:"center"}}>
            <select className="input" style={{minWidth:200}} value={roleX} onChange={e=>setRoleX(e.target.value)}>
              {Object.keys(ROLE_STATS).map(k => <option key={k} value={k}>{k}</option>)}
            </select>
            <span style={{color:"var(--muted)"}}>vs</span>
            <select className="input" style={{minWidth:200}} value={roleY} onChange={e=>setRoleY(e.target.value)}>
              {Object.keys(ROLE_STATS).map(k => <option key={k} value={k}>{k}</option>)}
            </select>
          </div>
        </div>
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
        <div className="cardHead" style={{gap:12}}>
          <div style={{fontWeight:800, fontSize: "1.1em"}}>Stat Scatter — {LABELS.get(statX)||statX} vs {LABELS.get(statY)||statY}</div>
          <div style={{display:"flex", gap:8, alignItems:"center"}}>
            <select className="input" style={{minWidth:200}} value={statX} onChange={e=>setStatX(e.target.value)}>
              {allStats.map(k => <option key={k} value={k}>{LABELS.get(k)||k}</option>)}
            </select>
            <span style={{color:"var(--muted)"}}>vs</span>
            <select className="input" style={{minWidth:200}} value={statY} onChange={e=>setStatY(e.target.value)}>
              {allStats.map(k => <option key={k} value={k}>{LABELS.get(k)||k}</option>)}
            </select>
          </div>
        </div>
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
    // Get relevant positions for this role
    const rolePositions = ROLE_BOOK[roleName]?.baseline || [];
    const relevantPositions = new Set(rolePositions);
    
    const arr = filteredRows
      .map(r => ({ name:r["Name"], club: r["Club"], pos: (expandFMPositions(r["Pos"])[0]||""), score: roleScoreOfRow(r, roleName) }))
      .filter(x => {
        if (!Number.isFinite(x.score)) return false;
        // Only include players whose positions are relevant for this role
        const playerPositions = expandFMPositions(filteredRows.find(row => row["Name"] === x.name)?.["Pos"] || "");
        return playerPositions.some(pos => relevantPositions.has(pos));
      })
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
    const r = rowByName.get(player);
    if (!r) return <div className="card"><div className="cardBody">Select a player</div></div>;
    
    // Get current player's top roles instead of everyone's best roles
    const playerRoles = Object.keys(ROLE_BOOK).map(roleName => {
      const baseline = ROLE_BASELINES[roleName] || [];
      if (!sharesAny(expandFMPositions(getCell(r,"Pos")), baseline)) return null;
      return { roleName, score: roleScoreFor(r, roleName, pctIndex) || 0 };
    }).filter(Boolean).sort((a,b)=>b.score-a.score).slice(0, 10);
    
    const items = playerRoles.map(x => ({ 
      label: `${x.roleName}`, 
      value: Number(x.score.toFixed(2)),
      extra: `${tf(x.score, 1)}% fit`
    }));
    
    return (
      <div className="card">
        <div className="cardHead"><div style={{fontWeight:800}}>Best Roles — {player}</div></div>
        <div className="cardBody"><HBar items={items} titleFmt={(v)=>v.toFixed(1)} valueMax={100}/></div>
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

    // Import/Export functionality
    const exportArchetype = () => {
      const archetype = {
        name: customName,
        baseline: customBaseline,
        weights: customWeights,
        version: "1.0"
      };
      const blob = new Blob([JSON.stringify(archetype, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${customName.replace(/[^a-zA-Z0-9]/g, '_')}_archetype.json`;
      a.click();
      URL.revokeObjectURL(url);
    };

    const importArchetype = (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = JSON.parse(event.target?.result);
          if (data.name) setCustomName(data.name);
          if (data.baseline) setCustomBaseline(data.baseline);
          if (data.weights) setCustomWeights(data.weights);
        } catch (err) {
          alert('Invalid archetype file format');
        }
      };
      reader.readAsText(file);
      e.target.value = ''; // Reset file input
    };

    const addToRoleBook = () => {
      if (!customName.trim()) {
        alert('Please enter a name for the archetype');
        return;
      }
      // Add to existing role options (this would persist in localStorage via useStickyState)
      const newRoleKey = `Custom: ${customName}`;
      // Note: This would require modifying ROLE_BOOK, but for now we'll just show it works
      alert(`"${customName}" would be added to role selection (implementation depends on how you want to persist custom roles)`);
    };

    return (
      <>
        <div className="card">
          <div className="cardHead" style={{gap:12}}>
            <div style={{fontWeight:800}}>Custom Archetype — Editor</div>
            <div style={{display:"flex", gap:8}}>
              <button className="btn ghost tight" onClick={exportArchetype}>Export</button>
              <label className="btn ghost tight" style={{cursor:"pointer"}}>
                Import
                <input type="file" accept=".json" onChange={importArchetype} style={{display:"none"}} />
              </label>
              <button className="btn ghost tight" onClick={addToRoleBook}>Add to Roles</button>
            </div>
          </div>
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

  /* ---------- Transfer Planner Mode ---------- */
  function TransferPlannerMode(){
    if (!managedClub) {
      return (
        <div className="card">
          <div className="cardHeader">Transfer Planner</div>
          <div className="cardBody">
            <div style={{padding: '24px', textAlign: 'center'}}>
              <div style={{fontSize: '16px', fontWeight: '700', marginBottom: '8px'}}>
                Select Your Club
              </div>
              <div className="status" style={{marginBottom: '12px'}}>
                Choose the club you manage in the sidebar to analyze your squad and get transfer recommendations.
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Get club context with caching
    const clubContext = useMemo(() => {
      if (!managedClub) return null;
      return analyzeClubContext(managedClub, filteredRows, pctIndex);
    }, [managedClub, filteredRows, pctIndex]);
    if (!clubContext) {
      return (
        <div className="card">
          <div className="cardHeader">Transfer Planner</div>
          <div className="cardBody">
            <div style={{padding: '24px', textAlign: 'center'}}>
              <div className="status">Unable to analyze squad for {managedClub}</div>
            </div>
          </div>
        </div>
      );
    }

    // Analyze squad needs and generate recommendations
    const squadAnalysis = useMemo(() => {
      const needs = [];
      const currentSquad = [];
      
      // Analyze each role
      Object.entries(clubContext.roleAnalysis).forEach(([role, data]) => {
        const { count, bestScore, bestPlayerName } = data;
        const minExpected = clubContext.expectations.min;
        const goodExpected = clubContext.expectations.good;
        
        const needLevel = 
          count === 0 ? 'CRITICAL' :
          bestScore < minExpected ? 'HIGH' :
          bestScore < goodExpected ? 'MEDIUM' :
          'LOW';
        
        const flexibleCoverage = clubContext.roleCoverage?.[role] || [];
        const hasCoverage = flexibleCoverage.length > 0;
        
        currentSquad.push({
          role,
          specialists: count,
          bestScore,
          bestPlayer: bestPlayerName,
          needLevel,
          flexibleCoverage,
          hasCoverage
        });
        
        if (needLevel === 'CRITICAL' || (needLevel === 'HIGH' && !hasCoverage)) {
          needs.push({
            role,
            priority: needLevel,
            reason: count === 0 ? 'No specialists' : `Weak quality (${bestScore.toFixed(1)})`,
            flexibleCoverage
          });
        }
      });
      
      return { needs, currentSquad };
    }, [clubContext]);

    // Calculate all possible transfer targets (expensive operation - only when requested)
    const allTransferTargets = useMemo(() => {
      if (!transferSearchActive) return [];
      
      // Performance optimizations
      const maxCandidatesPerRole = 10; // Increased to show more candidates per role
      const earlyExitThreshold = 15; // Stop checking other roles if improvement is this good
      
      console.log('Computing transfer targets...', { 
        filteredRowsCount: filteredRows.length,
        willProcess: filteredRows.length,
        budget: transferBudget,
        ageRange: [transferMinAge, transferMaxAge],
        minRating: transferMinRating,
        managedClub,
        roleBookSize: Object.keys(ROLE_BOOK).length,
        pctIndexSize: pctIndex.size,
        clubContextExists: !!clubContext
      });
      
      // Determine target roles based on mode and specific role filter
      let targetRoles;
      if (targetSpecificRole) {
        // User selected a specific role - only search for that role
        targetRoles = [targetSpecificRole];
        console.log('Target roles (specific role selected):', targetRoles);
      } else if (findUnderrated) {
        // Include ALL possible roles from the role book, not just current squad roles
        targetRoles = Object.keys(ROLE_BOOK);
        console.log('Target roles (all roles from ROLE_BOOK - underrated mode):', targetRoles.length, 'roles');
        console.log('First 10 roles:', targetRoles.slice(0, 10));
      } else {
        // Focus on roles that actually need improvement
        const priorityRoles = squadAnalysis.needs.map(n => n.role);
        const weakRoles = Object.entries(clubContext.roleAnalysis)
          .filter(([role, data]) => data.bestScore < clubContext.expectations.good)
          .map(([role]) => role);
        
        targetRoles = [...new Set([...priorityRoles, ...weakRoles])];
        console.log('Target roles (focused):', targetRoles);
        console.log('Priority needs:', priorityRoles);
        console.log('Weak roles:', weakRoles);
        console.log('Club expectations:', clubContext.expectations);
        
        if (targetRoles.length === 0) {
          console.log('No roles need improvement - switching to underrated mode for this search');
          targetRoles = Object.keys(ROLE_BOOK);
        }
      }
      
      // Get club league tier for realistic transfers with English system specificity
      const getLeagueTier = (league) => {
        if (!league) return 6;
        const l = league.toLowerCase();
        
        // English system (most expensive in world)
        if (l.includes('premier league')) return 1; // Top tier
        if (l.includes('championship')) return 2; // Second tier
        if (l.includes('league one') || l.includes('efl league one')) return 3; // Third tier
        if (l.includes('league two') || l.includes('efl league two')) return 4; // Fourth tier
        if (l.includes('national league') && !l.includes('north') && !l.includes('south')) return 5; // Fifth tier
        if (l.includes('national league north') || l.includes('national league south')) return 6; // Sixth tier
        
        // Other top leagues (slightly less expensive than Premier League)
        if (l.includes('la liga') || l.includes('serie a') || l.includes('bundesliga') || l.includes('ligue 1')) return 1;
        if (l.includes('liga 2') || l.includes('serie b') || l.includes('2. bundesliga') || l.includes('ligue 2')) return 2;
        if (l.includes('3. liga')) return 3;
        
        return 6; // Lower tiers
      };
      
      // Real-world transfer fee limits based on English system data
      const getTransferFeeLimits = (clubTier, playerTier) => {
        // Incoming transfer limits (what clubs at each tier can realistically pay)
        const incomingLimits = {
          1: 140, // Premier League - Paulo to Man City for £140M
          2: 35,  // Championship - highest was £35M
          3: 3,   // League One - highest was £3M
          4: 0.3, // League Two - £300k
          5: 0.03, // National League - £30k
          6: 0.015 // National League North/South - £15k
        };
        
        // Outgoing sale potentials (what players can realistically sell for from each tier)
        const outgoingPotentials = {
          1: { domestic: 113, international: 71 }, // Prem: £113M domestic, £71M to La Liga
          2: { domestic: 50, international: 84 },  // Championship: £30-50M to Prem, £84M to Juventus
          3: { domestic: 10.75, international: 7.75 }, // League One: £10.75M to Championship, £7.75M to Prem
          4: { domestic: 0.325, international: 0.325 }, // League Two: £325k
          5: { domestic: 0.7, international: 0.275 },   // National League: £700k max, £275k typical
          6: { domestic: 0.035, international: 0.035 }  // NL North/South: £35k (£220k outlier ignored)
        };
        
        const maxIncoming = incomingLimits[clubTier] || 0.01;
        const maxOutgoing = outgoingPotentials[playerTier] || { domestic: 0.01, international: 0.01 };
        
        // For realistic transfers, the limit should be primarily based on what the buying club can afford
        // Only limit by the selling club's tier if the player is from a much higher tier (unrealistic step down)
        let effectiveMax;
        
        if (clubTier <= playerTier) {
          // Club is same tier or lower - use club's spending power (normal/step-up move)
          effectiveMax = maxIncoming;
        } else {
          // Club is higher tier than player - still use club's power but consider player's tier potential
          // Players from lower tiers can still command good fees when moving up
          const tierDiff = clubTier - playerTier;
          if (tierDiff <= 2) {
            effectiveMax = maxIncoming; // Normal step-up move
          } else {
            // Very big step up - use a blend but favor club's spending power
            effectiveMax = Math.max(maxIncoming * 0.7, maxOutgoing.international * 2);
          }
        }
        
        return {
          maxRealistic: effectiveMax,
          absoluteMax: Math.max(effectiveMax * 1.5, maxIncoming), // Always allow club's full spending power
          clubCanAfford: maxIncoming
        };
      };
      
      const clubLeagueTier = getLeagueTier(clubContext.league);
      
      const candidates = [];
      const candidatesPerRole = {};
      let processedCount = 0;
      let skippedReasons = { ownPlayer: 0, age: 0, rating: 0, noImprovement: 0, overBudget: 0, tooMany: 0 };
      
      // Initialize counters
      targetRoles.forEach(role => candidatesPerRole[role] = 0);
      
      // Pre-filter players to reduce iterations with realistic transfer logic
      let filterStats = { total: filteredRows.length, ownPlayer: 0, age: 0, rating: 0, realistic: 0, passed: 0 };
      
      const preFilteredPlayers = filteredRows.filter(player => {
        const playerClub = getCell(player, "Club");
        if (playerClub === managedClub) {
          filterStats.ownPlayer++;
          return false;
        }
        
        const age = numCell(player, "Age");
        if (age < transferMinAge || age > transferMaxAge) {
          filterStats.age++;
          return false;
        }
        
        const { score: bestScore } = bestNearRole(player, pctIndex);
        // Be more lenient with rating filter - allow 15 points below minimum
        if (bestScore < (transferMinRating - 15)) {
          filterStats.rating++;
          return false;
        }
        
        // Realistic transfer logic - check if player would realistically move
        const playerLeague = getCell(player, "Div");
        const playerLeagueTier = getLeagueTier(playerLeague);
        
        // Elite players (85+ rating) in top leagues unlikely to move to much lower tiers
        if (bestScore >= 85 && playerLeagueTier === 1 && clubLeagueTier >= 3) {
          filterStats.realistic++;
          return false; // Elite player won't drop 2+ tiers
        }
        
        // Very good players (80+ rating) unlikely to drop more than 1 tier
        if (bestScore >= 80 && playerLeagueTier <= 2 && clubLeagueTier >= playerLeagueTier + 2) {
          filterStats.realistic++;
          return false;
        }
        
        filterStats.passed++;
        return true;
      });
      
      console.log('Pre-filter stats:', filterStats);
      console.log('Your club league:', clubContext.league, 'tier:', clubLeagueTier);
      console.log('Search criteria:', { budget: transferBudget, ageRange: [transferMinAge, transferMaxAge], minRating: transferMinRating });
      
      console.log(`Pre-filtered ${filteredRows.length} → ${preFilteredPlayers.length} players`);
      
      preFilteredPlayers.forEach(player => {
        processedCount++;
        const { role: bestRole, score: bestScore } = bestNearRole(player, pctIndex);
        
        // Cache expensive calls
        const playerClub = getCell(player, "Club");
        const age = numCell(player, "Age");
        const playerName = getCell(player, "Name");
        const league = getCell(player, "Div");
        const position = getCell(player, "Pos");
        
        // Find the best role for this player from target roles
        let bestTargetRole = null;
        let bestTargetScore = 0;
        let bestImprovement = -999;
        
        // Debug first few players in detail - increased to 10
        if (processedCount <= 10) {
          console.log(`\nDetailed check for player ${processedCount}: ${playerName}`);
          console.log(`Best role: ${bestRole} (${bestScore.toFixed(1)})`);
          console.log(`Evaluating all target roles for best fit...`);
        }
        
        // Define goalkeeper roles (including all variants and abbreviations)
        const goalkeepingRoles = ["GK", "Sweeper Keeper", "SK", "Goalkeeper", "Sweeper-Keeper"];
        const isPlayerGK = position === "GK" || 
                         goalkeepingRoles.some(gkRole => 
                           (bestRole && bestRole.toLowerCase().includes(gkRole.toLowerCase())) ||
                           (position && position.toLowerCase().includes('keeper')) ||
                           (bestRole && bestRole.toLowerCase().includes('keeper'))
                         );

        // Evaluate all target roles to find the best one for this player
        for (const targetRole of targetRoles) {
          // Check positional compatibility using ROLE_BOOK baseline positions
          const rolePositions = ROLE_BOOK[targetRole]?.baseline || [];
          const playerPositions = expandFMPositions(position || "");
          
          // Skip if player can't play this role (no position overlap)
          const canPlayRole = playerPositions.some(pos => rolePositions.includes(pos));
          if (!canPlayRole) {
            continue;
          }
          
          const roleScore = roleScoreFor(player, targetRole, pctIndex) || 0;
          if (roleScore < transferMinRating) continue;
          
          const currentRoleData = clubContext.roleAnalysis[targetRole];
          const currentBest = currentRoleData?.bestScore || 0;
          const improvement = roleScore - currentBest;
          
          // If there's no current coverage for this role, treat as major improvement opportunity
          const effectiveImprovement = currentRoleData ? improvement : Math.max(5, roleScore - 50);
          
          // Different improvement thresholds based on mode - extremely lenient
          const improvementThreshold = findUnderrated ? 
            (currentBest >= clubContext.expectations.good ? 0.5 : -1) : // Accept even minimal improvements 
            -1; // Accept any improvement for needs-based search, even slight downgrades
          
          if (effectiveImprovement > improvementThreshold && effectiveImprovement > bestImprovement) {
            bestTargetRole = targetRole;
            bestTargetScore = roleScore;
            bestImprovement = effectiveImprovement;
            
            if (processedCount <= 10) {
              console.log(`  ${targetRole}: NEW BEST - score=${roleScore.toFixed(1)}, improvement=${effectiveImprovement.toFixed(1)}`);
            }
          }
        }
        
        // Only add player if we found a suitable role
        if (bestTargetRole && candidatesPerRole[bestTargetRole] < maxCandidatesPerRole) {
          // Use game's transfer value midpoint (same as Player Profile)
          const gameValueRaw = getCell(player, "Transfer Value");
          const gameValue = parseMoneyRange(gameValueRaw).mid;
          
          // Skip players without transfer values or with unrealistic values
          if (!Number.isFinite(gameValue) || gameValue <= 0) {
            if (processedCount <= 10) {
              console.log(`  ${bestTargetRole}: REJECTED - invalid transfer value: ${gameValue}`);
            }
            return; // Skip this player entirely
          }
          
          const valueInM = gameValue / 1000000; // Convert from raw value to millions
          const playerLeagueTier = getLeagueTier(league);
          
          // Apply real-world transfer fee limits
          const feeLimits = getTransferFeeLimits(clubLeagueTier, playerLeagueTier);
          
          // Check against realistic market limits first
          if (valueInM > feeLimits.absoluteMax) {
            if (processedCount <= 10) {
              console.log(`  ${bestTargetRole}: REJECTED - exceeds market reality: ${valueInM}M > ${feeLimits.absoluteMax}M`);
            }
            skippedReasons.overBudget++;
            return; // Skip entirely if beyond market reality
          }
          
          // Budget filtering with real-world constraints
          const effectiveBudgetLimit = Math.min(
            transferBudget * (bestImprovement > 5 ? 1.5 : 1.2), // Original budget flexibility
            feeLimits.clubCanAfford * 1.1 // Real-world affordability with 10% stretch
          );
            
          if (processedCount <= 10) {
            console.log(`  ${bestTargetRole}: value=${valueInM}M, budgetLimit=${effectiveBudgetLimit}M, marketLimit=${feeLimits.absoluteMax}M, withinBudget=${valueInM <= effectiveBudgetLimit}`);
          }
          
          if (valueInM <= effectiveBudgetLimit) {
            const needData = squadAnalysis.needs.find(n => n.role === bestTargetRole);
            const playerLeagueTier = getLeagueTier(league);
            // Calculate value efficiency (improvement per million spent)
            const valueEfficiency = bestImprovement / Math.max(valueInM, 0.1);
            
            // Enhanced realism check with granular club performance levels
            const getClubPerformanceLevel = () => {
              const leagueGroup = clubContext.leagueGroup?.toLowerCase() || '';
              const avgRating = clubContext.avgSquadScore || 60;
              
              // Elite clubs (Champions League level)
              if (leagueGroup.includes('premier league') && avgRating >= 75) return 'elite';
              if (leagueGroup.includes('la liga') && avgRating >= 75) return 'elite';
              if (leagueGroup.includes('bundesliga') && avgRating >= 75) return 'elite';
              if (leagueGroup.includes('serie a') && avgRating >= 75) return 'elite';
              if (leagueGroup.includes('ligue 1') && avgRating >= 75) return 'elite';
              
              // Top club (Europa League level)
              if (leagueGroup.includes('premier league') && avgRating >= 70) return 'top';
              if (leagueGroup.includes('la liga') && avgRating >= 70) return 'top';
              if (leagueGroup.includes('bundesliga') && avgRating >= 70) return 'top';
              if (leagueGroup.includes('serie a') && avgRating >= 70) return 'top';
              if (leagueGroup.includes('ligue 1') && avgRating >= 70) return 'top';
              
              // Mid-table in top leagues or strong in lower leagues
              if (clubLeagueTier <= 1 && avgRating >= 65) return 'decent';
              if (clubLeagueTier === 2 && avgRating >= 70) return 'decent';
              
              // Relegation battlers or lower league clubs
              return 'struggling';
            };
            
            const clubLevel = getClubPerformanceLevel();
            
            // More sophisticated realism check
            const isRealisticTransfer = () => {
              // If same club, always unrealistic
              if (playerClub === managedClub) return false;
              
              // League tier difference - more restrictive than before
              const tierDiff = playerLeagueTier - clubLeagueTier;
              
              // Players from significantly better leagues are usually unrealistic
              if (tierDiff < -2) return false; // More than 2 tiers above us
              
              // Elite players from top clubs - very granular approach
              const isEliteClub = playerClub && (
                playerClub.includes('Liverpool') || playerClub.includes('Manchester City') || 
                playerClub.includes('Arsenal') || playerClub.includes('Chelsea') ||
                playerClub.includes('Real Madrid') || playerClub.includes('Barcelona') ||
                playerClub.includes('Bayern') || playerClub.includes('Juventus') ||
                playerClub.includes('PSG') || playerClub.includes('Milan')
              );
              
              const isTopClub = playerClub && (
                playerClub.includes('Manchester') || playerClub.includes('Tottenham') ||
                playerClub.includes('Newcastle') || playerClub.includes('West Ham') ||
                playerClub.includes('Atletico') || playerClub.includes('Sevilla') ||
                playerClub.includes('Dortmund') || playerClub.includes('Leipzig') ||
                playerClub.includes('Inter') || playerClub.includes('Napoli') ||
                playerClub.includes('Monaco') || playerClub.includes('Lyon')
              );
              
              const isTopLeague = league && (
                league.includes('Premier League') || league.includes('La Liga') ||
                league.includes('Bundesliga') || league.includes('Serie A') ||
                league.includes('Ligue 1')
              );
              
              // Enhanced realism based on real-world transfer data and club performance
              // First check: Does this exceed what the player's current tier can realistically command?
              if (valueInM > feeLimits.maxRealistic * 1.2) {
                return false; // Player's value exceeds what their current league tier can command
              }
              
              // Second check: Club-specific realism based on performance level and tier
              const tierBasedLimits = {
                'elite': clubLeagueTier === 1 ? 140 : 35,   // Premier League elite vs Championship elite
                'top': clubLeagueTier === 1 ? 100 : 25,     // Top PL vs top Championship
                'decent': clubLeagueTier === 1 ? 60 : 15,   // Mid-table PL vs decent Championship
                'struggling': clubLeagueTier === 1 ? 30 : (clubLeagueTier === 2 ? 10 : 3) // Based on tier
              };
              
              const clubSpecificLimit = tierBasedLimits[clubLevel] || 1;
              
              if (valueInM > clubSpecificLimit) {
                return false; // Exceeds what this specific club type can realistically afford
              }
              
              // Third check: Cross-tier movement realism
              if (tierDiff < -2) return false; // Can't attract from 2+ tiers above
              
              // Fourth check: Elite player movement patterns
              if (isEliteClub && valueInM > 80 && age < 28) {
                // Young elite players rarely move to significantly weaker clubs
                if (clubLevel !== 'elite' && tierDiff >= 0) return false;
              }
              
              // Fifth check: Age-based realism
              if (age < 25 && bestTargetScore > 80 && clubLevel === 'struggling') {
                return false; // Young stars don't drop to struggling clubs
              }
              
              // Older players (30+) are more flexible
              if (age >= 30) {
                return tierDiff >= -1; // Can drop one tier maximum
              }
              
              return true; // Passed all realism checks
            };
            
            candidates.push({
              name: playerName,
              club: playerClub,
              age,
              bestRole,
              bestScore,
              targetRole: bestTargetRole,
              roleScore: bestTargetScore,
              improvement: bestImprovement,
              value: valueInM,
              valueEfficiency,
              league,
              leagueTier: playerLeagueTier,
              position,
              priority: needData?.priority || 'LOW',
              isPriorityNeed: !!needData,
              isRealistic: isRealisticTransfer(),
              isOverBudget: valueInM > transferBudget,
              isRecordTransfer: valueInM > feeLimits.clubCanAfford * 0.8, // Within top 20% of club's record
              marketReality: {
                playerTierMax: feeLimits.maxRealistic,
                clubAffordability: feeLimits.clubCanAfford,
                isStretchTransfer: valueInM > feeLimits.clubCanAfford * 0.5
              }
            });
            candidatesPerRole[bestTargetRole]++;
            
            if (processedCount <= 10) {
              console.log(`  ✅ ADDED CANDIDATE: ${playerName} for ${bestTargetRole} (${bestImprovement.toFixed(1)} improvement, ${valueInM}M)`);
            }
          } else {
            skippedReasons.overBudget++;
            if (processedCount <= 10) {
              console.log(`  ${bestTargetRole}: REJECTED - over budget: ${valueInM}M > ${effectiveBudgetLimit}M`);
            }
          }
        } else {
          if (processedCount <= 10) {
            console.log(`  No suitable role found for ${playerName} (best improvement: ${bestImprovement.toFixed(1)})`);
          }
        }
      });
      
      console.log('Transfer search results:', {
        processed: processedCount,
        candidates: candidates.length,
        candidatesPerRole,
        skipped: skippedReasons
      });
      
      return candidates;
    }, [transferSearchActive, findUnderrated, targetSpecificRole, squadAnalysis.needs, clubContext.roleAnalysis, clubContext.expectations, clubContext.league, filteredRows, transferBudget, transferMinAge, transferMaxAge, transferMinRating, managedClub]);

    // Filter and sort targets based on checkbox (fast operation)
    const transferTargets = useMemo(() => {
      let filtered = allTransferTargets;
      
      // Apply priority filter
      if (onlyShowNeeds) {
        filtered = allTransferTargets.filter(target => target.isPriorityNeed);
      }
      
      // Debug info for empty results
      if (filtered.length === 0 && allTransferTargets.length > 0) {
        console.log('No targets after filtering:', { 
          allTargets: allTransferTargets.length,
          onlyShowNeeds,
          priorityNeedsCount: allTransferTargets.filter(t => t.isPriorityNeed).length
        });
      }
      
      // Sort by multiple criteria for better target identification
      return filtered.sort((a, b) => {
        // 1. Priority first (CRITICAL, HIGH, MEDIUM, LOW)
        const priorityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
        const aPriority = priorityOrder[a.priority] || 3;
        const bPriority = priorityOrder[b.priority] || 3;
        if (aPriority !== bPriority) return aPriority - bPriority;
        
        // 2. Within same priority, favor realistic transfers
        if (a.isRealistic !== b.isRealistic) return b.isRealistic - a.isRealistic;
        
        // 3. Then by value efficiency (improvement per £M) for budget-conscious targets
        if (Math.abs(a.valueEfficiency - b.valueEfficiency) > 0.5) {
          return b.valueEfficiency - a.valueEfficiency;
        }
        
        // 4. Finally by raw improvement
        return b.improvement - a.improvement;
      });
    }, [allTransferTargets, onlyShowNeeds]);

    const formatMoney = (val) => {
      if (val >= 1) return `£${val.toFixed(1)}M`;
      return `£${(val * 1000).toFixed(0)}K`;
    };

    return (
      <>
        {/* Transfer Planner Settings */}
        <div className="card">
          <div className="cardHeader" style={{paddingLeft: '20px'}}>Transfer Settings</div>
          <div className="cardBody" style={{display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '16px', padding: '16px 20px'}}>
            <div>
              <label className="lbl" style={{paddingLeft: '4px'}}>Budget (£M)</label>
              <input 
                className="input" 
                type="number" 
                value={transferBudget}
                onChange={e => {
                  const val = e.target.value;
                  setTransferBudget(val === '' ? 0 : Number(val) || 0);
                }}
                onBlur={e => {
                  if (e.target.value === '') setTransferBudget(0);
                }}
              />
            </div>
            <div>
              <label className="lbl" style={{paddingLeft: '4px'}}>Min Age</label>
              <input 
                className="input" 
                type="number" 
                value={transferMinAge}
                onChange={e => {
                  const val = e.target.value;
                  setTransferMinAge(val === '' ? 18 : Number(val) || 18);
                }}
                onBlur={e => {
                  if (e.target.value === '') setTransferMinAge(18);
                }}
              />
            </div>
            <div>
              <label className="lbl" style={{paddingLeft: '4px'}}>Max Age</label>
              <input 
                className="input" 
                type="number" 
                value={transferMaxAge}
                onChange={e => {
                  const val = e.target.value;
                  setTransferMaxAge(val === '' ? 35 : Number(val) || 35);
                }}
                onBlur={e => {
                  if (e.target.value === '') setTransferMaxAge(35);
                }}
              />
            </div>
            <div>
              <label className="lbl" style={{paddingLeft: '4px'}}>Min Rating</label>
              <input 
                className="input" 
                type="number" 
                value={transferMinRating}
                onChange={e => {
                  const val = e.target.value;
                  setTransferMinRating(val === '' ? 60 : Number(val) || 60);
                }}
                onBlur={e => {
                  if (e.target.value === '') setTransferMinRating(60);
                }}
              />
            </div>
          </div>
          
          {/* Additional Settings Row */}
          <div style={{padding: '0 20px 16px', borderTop: '1px solid var(--cardBorder)', paddingTop: '16px'}}>
            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '16px'}}>
              <div>
                <label className="lbl" style={{paddingLeft: '4px'}}>Max Results</label>
                <select 
                  className="input"
                  value={transferMaxResults}
                  onChange={e => setTransferMaxResults(Number(e.target.value))}
                >
                  <option value={10}>10 players</option>
                  <option value={20}>20 players</option>
                  <option value={30}>30 players</option>
                  <option value={50}>50 players</option>
                  <option value={100}>100 players</option>
                </select>
              </div>
              <div>
                <label className="lbl" style={{paddingLeft: '4px'}}>Target Specific Role</label>
                <select 
                  className="input"
                  value={targetSpecificRole}
                  onChange={e => setTargetSpecificRole(e.target.value)}
                >
                  <option value="">All suitable roles</option>
                  {Object.keys(ROLE_BOOK).sort().map(role => (
                    <option key={role} value={role}>{role}</option>
                  ))}
                </select>
                {targetSpecificRole && (
                  <div style={{fontSize: '10px', color: 'var(--muted)', marginTop: '4px'}}>
                    Searching only for {targetSpecificRole} players
                  </div>
                )}
              </div>
              <div style={{display: 'flex', alignItems: 'end'}}>
                {targetSpecificRole && (
                  <button 
                    className="btn ghost tight" 
                    onClick={() => setTargetSpecificRole("")}
                    style={{fontSize: '11px', height: '32px'}}
                  >
                    Clear Role Filter
                  </button>
                )}
              </div>
            </div>
            
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
              <div style={{display: 'flex', flexDirection: 'column', gap: '4px'}}>
                <label style={{display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px'}}>
                  <input 
                    type="checkbox" 
                    checked={onlyShowNeeds}
                    onChange={e => setOnlyShowNeeds(e.target.checked)}
                  />
                  Only show priority needs ({squadAnalysis.needs.length} roles)
                </label>
                <label style={{display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px'}}>
                  <input 
                    type="checkbox" 
                    checked={findUnderrated}
                    onChange={e => setFindUnderrated(e.target.checked)}
                  />
                  Find underrated players (squad upgrades)
                </label>
              </div>
              <div style={{display: 'flex', gap: '8px'}}>
                <button 
                  className="btn" 
                  onClick={() => {
                    setTransferSearchActive(true);
                  }}
                  style={{fontSize: '11px'}}
                  disabled={transferSearching}
                >
                  {transferSearching ? '⏳ Searching...' : transferSearchActive ? '🔄 Search Again' : '🔍 Search Targets'}
                </button>
                {transferSearchActive && (
                  <button 
                    className="btn ghost tight" 
                    onClick={() => {
                      setTransferSearchActive(false);
                    }}
                    style={{fontSize: '11px'}}
                  >
                    ❌ Clear
                  </button>
                )}
              </div>  
            </div>
          </div>
        </div>

        {/* Squad Analysis */}
        <div className="card">
          <div className="cardHeader" style={{paddingLeft: '20px'}}>Squad Analysis: {managedClub}</div>
          <div className="cardBody" style={{padding: '16px 20px'}}>
            <div style={{marginBottom: '16px', fontSize: '12px', color: 'var(--muted)'}}>
              League: {clubContext.league} • Level: {clubContext.leagueGroup} • 
              Squad Size: {clubContext.squadSize} • Avg Rating: {clubContext.avgSquadScore.toFixed(1)}
            </div>
            
            {squadAnalysis.needs.length > 0 && (
              <div style={{marginBottom: '16px'}}>
                <h4 style={{margin: '0 0 8px 0', color: 'var(--accent)'}}>Priority Needs</h4>
                {squadAnalysis.needs.map(need => (
                  <div key={need.role} style={{
                    padding: '8px 12px',
                    marginBottom: '4px',
                    borderRadius: '4px',
                    backgroundColor: need.priority === 'CRITICAL' ? 'rgba(220, 38, 38, 0.1)' : 'rgba(255, 107, 53, 0.1)',
                    border: `1px solid ${need.priority === 'CRITICAL' ? '#DC2626' : '#FF6B35'}`
                  }}>
                    <div style={{fontWeight: 'bold'}}>{need.role}</div>
                    <div style={{fontSize: '11px', color: 'var(--muted)'}}>
                      {need.reason}
                      {need.flexibleCoverage.length > 0 && (
                        <span> • Flexible coverage: {need.flexibleCoverage.map(p => `${p.name} (${p.score.toFixed(0)})`).join(', ')}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px', fontSize: '11px'}}>
              {squadAnalysis.currentSquad.map(role => (
                <div key={role.role} style={{
                  padding: '6px 8px',
                  borderRadius: '3px',
                  backgroundColor: 'var(--cardBg)',
                  border: '1px solid var(--cardBorder)'
                }}>
                  <div style={{fontWeight: 'bold', fontSize: '10px'}}>{role.role}</div>
                  <div>{role.specialists} specialists</div>
                  <div>Best: {role.bestScore.toFixed(1)} {role.bestPlayer && `(${role.bestPlayer})`}</div>
                  {role.hasCoverage && (
                    <div style={{color: 'var(--muted)', fontSize: '9px'}}>
                      +{role.flexibleCoverage.length} flexible
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Transfer Targets */}
        <div className="card">
          <div className="cardHeader" style={{paddingLeft: '20px'}}>
            Transfer Targets {transferSearchActive ? `(${transferTargets.length} found, showing ${Math.min(transferTargets.length, transferMaxResults)})` : ''}
            {transferSearchActive && (
              <span style={{fontSize: '12px', fontWeight: 'normal', marginLeft: '8px'}}>
                Budget: {formatMoney(transferBudget)} • Ages {transferMinAge}-{transferMaxAge} • Min Rating: {transferMinRating}
                {targetSpecificRole && ` • Role: ${targetSpecificRole}`}
              </span>
            )}
          </div>
          <div className="cardBody" style={{padding: '16px 20px'}}>
            {!transferSearchActive ? (
              <div style={{textAlign: 'center', padding: '24px', color: 'var(--muted)'}}>
                <div style={{marginBottom: '12px', fontSize: '16px'}}>
                  🔍 Ready to Search
                </div>
                <div style={{marginBottom: '8px'}}>
                  Click "Search Targets" to find transfer recommendations within your criteria.
                </div>
                <div style={{fontSize: '11px', opacity: '0.8'}}>
                  Current settings: £{transferBudget}M budget • Ages {transferMinAge}-{transferMaxAge} • Min rating {transferMinRating}
                </div>
              </div>
            ) : transferTargets.length === 0 ? (
              <div style={{textAlign: 'center', padding: '24px', color: 'var(--muted)'}}>
                <div style={{marginBottom: '8px'}}>
                  No suitable targets found within your criteria.
                </div>
                <div style={{fontSize: '11px', opacity: '0.8'}}>
                  Try: Increasing budget (currently £{transferBudget}M) • 
                  Expanding age range ({transferMinAge}-{transferMaxAge}) • 
                  Lowering min rating ({transferMinRating}) • 
                  {onlyShowNeeds && 'Unchecking "only priority needs"'}
                </div>
                <div style={{fontSize: '10px', marginTop: '8px', opacity: '0.6'}}>
                  Check browser console for detailed search info
                </div>
              </div>
            ) : (
              <>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Player</th>
                      <th>Age</th>
                      <th>Club</th>
                      <th>Best Role</th>
                      <th>Target Role</th>
                      <th>Rating</th>
                      <th>Improvement</th>
                      <th>Value</th>
                      <th>Efficiency</th>
                      <th>Realistic</th>
                      <th>Priority</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transferTargets.slice(0, transferMaxResults).map((target, idx) => (
                      <tr key={idx}>
                        <td style={{fontWeight: 'bold', fontSize: '10px'}}>
                          <button 
                            style={{
                              background: 'none',
                              border: 'none',
                              color: 'var(--accent)',
                              cursor: 'pointer',
                              textDecoration: 'underline',
                              fontSize: '9px',
                              fontWeight: 'bold',
                              padding: 0
                            }}
                            onClick={() => {
                              setPlayer(target.name);
                              setMode("Player Profile");
                            }}
                            title={`View ${target.name}'s player profile`}
                          >
                            {target.name}
                          </button>
                        </td>
                        <td style={{fontSize: '9px'}}>{target.age}</td>
                        <td style={{fontSize: '9px', color: 'var(--muted)'}}>{target.club}</td>
                        <td style={{fontSize: '8px'}}>{target.bestRole} ({target.bestScore.toFixed(1)})</td>
                        <td style={{fontSize: '8px', color: target.targetRole === target.bestRole ? 'var(--accent)' : 'inherit'}}>
                          {target.targetRole} ({target.roleScore.toFixed(1)})
                        </td>
                        <td>{target.roleScore.toFixed(1)}</td>
                        <td style={{color: target.improvement > 15 ? 'var(--accent)' : target.improvement > 10 ? '#7ED321' : 'inherit'}}>
                          +{target.improvement.toFixed(1)}
                        </td>
                        <td style={{color: target.isOverBudget ? 'var(--accent2)' : 'inherit'}}>
                          {formatMoney(target.value)}
                          {target.isOverBudget && <span style={{fontSize: '10px', marginLeft: '4px'}}>⚠️</span>}
                          {target.isRecordTransfer && (
                            <div style={{fontSize: '8px', color: 'var(--accent)', marginTop: '2px'}}>
                              Record transfer
                            </div>
                          )}
                          {target.marketReality?.isStretchTransfer && !target.isRecordTransfer && (
                            <div style={{fontSize: '8px', color: '#7ED321', marginTop: '2px'}}>
                              Significant fee
                            </div>
                          )}
                        </td>
                        <td style={{fontSize: '11px', color: target.valueEfficiency > 2 ? 'var(--accent)' : 'inherit'}}>
                          {target.valueEfficiency.toFixed(1)}/£M
                        </td>
                        <td style={{textAlign: 'center'}}>
                          {target.isRealistic ? (
                            <span 
                              style={{color: 'var(--accent)', fontSize: '14px'}} 
                              title={`Realistic transfer. Max for their tier: £${target.marketReality?.playerTierMax}M, Your affordability: £${target.marketReality?.clubAffordability}M`}
                            >
                              ✅
                            </span>
                          ) : (
                            <span 
                              style={{color: 'var(--accent2)', fontSize: '14px'}} 
                              title={`May be unrealistic. Fee: £${target.value}M vs tier max £${target.marketReality?.playerTierMax}M or club limit £${target.marketReality?.clubAffordability}M`}
                            >
                              ⚠️
                            </span>
                          )}
                        </td>
                        <td>
                          <span style={{
                            fontSize: '10px',
                            padding: '2px 6px',
                            borderRadius: '3px',
                            backgroundColor: 
                              target.priority === 'CRITICAL' ? 'rgba(220, 38, 38, 0.2)' :
                              target.priority === 'HIGH' ? 'rgba(255, 107, 53, 0.2)' :
                              target.priority === 'MEDIUM' ? 'rgba(74, 144, 226, 0.2)' :
                              'rgba(126, 211, 33, 0.2)',
                            color:
                              target.priority === 'CRITICAL' ? '#DC2626' :
                              target.priority === 'HIGH' ? '#FF6B35' :
                              target.priority === 'MEDIUM' ? '#4A90E2' :
                              '#7ED321'
                          }}>
                            {target.priority}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                
                {/* Show More Button */}
                {transferTargets.length > transferMaxResults && (
                  <div style={{textAlign: 'center', marginTop: '16px', padding: '16px', borderTop: '1px solid var(--cardBorder)'}}>
                    <div style={{fontSize: '12px', color: 'var(--muted)', marginBottom: '8px'}}>
                      Showing {transferMaxResults} of {transferTargets.length} results
                    </div>
                    <div style={{display: 'flex', gap: '8px', justifyContent: 'center'}}>
                      <button 
                        className="btn ghost" 
                        onClick={() => setTransferMaxResults(Math.min(transferMaxResults + 20, transferTargets.length))}
                        style={{fontSize: '11px'}}
                      >
                        Show 20 More
                      </button>
                      <button 
                        className="btn ghost" 
                        onClick={() => setTransferMaxResults(transferTargets.length)}
                        style={{fontSize: '11px'}}
                      >
                        Show All ({transferTargets.length})
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
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
      <>
        <button 
          className="toggle-sidebar" 
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {sidebarCollapsed ? "→" : "←"}
        </button>
        <aside className={`side ${sidebarCollapsed ? 'collapsed' : ''}`}>
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

            <label className="lbl">Current Save Date (for contract expiry)</label>
            <div className="row">
              <div className="col">
                <label className="lbl">Month</label>
                <select className="input" value={gameMonth} onChange={e=>setGameMonth(Number(e.target.value))}>
                  <option value={1}>January</option>
                  <option value={2}>February</option>
                  <option value={3}>March</option>
                  <option value={4}>April</option>
                  <option value={5}>May</option>
                  <option value={6}>June</option>
                  <option value={7}>July</option>
                  <option value={8}>August</option>
                  <option value={9}>September</option>
                  <option value={10}>October</option>
                  <option value={11}>November</option>
                  <option value={12}>December</option>
                </select>
              </div>
              <div className="col">
                <label className="lbl">Year</label>
                <input className="input" type="number" value={gameYear} min="2020" max="2035"
                  onChange={e=>setGameYear(Number(e.target.value)||2024)} />
              </div>
            </div>

            <label className="lbl">Your Club (for tailored recommendations)</label>
            <select className="input" value={managedClub} onChange={e=>setManagedClub(e.target.value)}>
              <option value="">Select your club...</option>
              {uniqueClubs.map(club => <option key={club} value={club}>{club}</option>)}
            </select>

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
            <div style={{fontSize: '11px', color: 'var(--muted)', marginTop: '4px', marginBottom: '8px'}}>
              All calculations normalized to: {compScope} ({compScope === "Filtered Cohort" ? filteredRows.length : 
                                                              compScope === "All Loaded" ? rows.length : 
                                                              scopeRows.length} players)
            </div>

            <label className="lbl">Player</label>
            <select className="input" value={player} onChange={e=>setPlayer(e.target.value)} style={{whiteSpace: "nowrap", textOverflow: "ellipsis"}}>
              {players.map((p, idx) => <option key={`${p}-${idx}`} value={p} title={p}>{p}</option>)}
            </select>
            
            <button className="btn" onClick={()=>setMode("Config")} style={{marginTop:"16px", width:"100%"}}>
              Advanced Configuration →
            </button>
          </div>
        </section>
      </aside>
      </>
    );
  }

  /* ---------- Topbar ---------- */
  function Topbar(){
    const modes = ["Player Profile","Radar","Percentiles","Role Matrix","Stat Scatter","Role Leaders","Best Roles","Stat Leaders","Custom Archetype","Transfer Planner","Config"];
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
        <div className={`wrap ${sidebarCollapsed ? 'collapsed' : ''}`}>
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
            {mode==="Transfer Planner" && <TransferPlannerMode/>}
            {mode==="Config" && <ConfigMode/>}
          </main>
        </div>
      </div>
    </ErrorBoundary>
  );
}

/* ===================== (end PART 2/2) ===================== */
