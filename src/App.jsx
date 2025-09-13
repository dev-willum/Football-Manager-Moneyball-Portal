// src/App.jsx — PART 1/2
import React, { useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import Papa from "papaparse";

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

/* ===================== Theme (Gabarito everywhere) ===================== */
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
@font-face{
  font-family:'GabaritoLocal';
  src:url('/Gabarito-VariableFont_wght.ttf') format('truetype');
  font-weight:600 800;
  font-style:normal;
  font-display:swap;
}
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
  font-family: GabaritoLocal, Gabarito, Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial;
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
  border-radius:999px; padding:8px 12px; cursor:pointer; white-space:nowrap;
}
.tab:hover{ box-shadow: inset 0 0 0 1px var(--ring); }
.tab.active{ border-color:var(--accent); box-shadow: inset 0 0 0 1px var(--accent); }
.seg{ display:flex; gap:8px; }
.segBtn{
  border:1px solid var(--cardBorder); background:color-mix(in oklab, var(--bg), white 4%); color:var(--ink);
  border-radius:999px; padding:8px 12px; cursor:pointer;
}
.segBtn.active{ border-color:var(--accent); box-shadow: inset 0 0 0 1px var(--accent); }
.btn{ padding:9px 12px; border-radius:12px; border:1px solid var(--accent); background:var(--accent); color:white; cursor:pointer; font-weight:700; }
.btn.ghost{ background:transparent; color:var(--accent); border-color:var(--accent); }
.btn.ghost.tight{ padding:6px 10px; }
.btn.ghost.alt{ color:var(--accent2); border-color:var(--accent2); }
.input{ width:100%; padding:10px 12px; border-radius:12px; border:1px solid var(--cardBorder); background:color-mix(in oklab, var(--bg), white 4%); color:var(--ink); outline:none; }
.input:focus{ box-shadow:0 0 0 3px color-mix(in oklab, var(--accent) 24%, transparent); border-color:var(--accent); }
.lbl{ font-size:12px; color:var(--muted); margin-bottom:4px; display:block; }
.playerBar{ position:sticky; top:54px; z-index:9; background:var(--card); border-bottom:1px solid var(--cardBorder); }
.playerHeader{ display:flex; align-items:center; gap:10px; margin-left:16px; padding:8px 8px; overflow:auto; white-space:nowrap; padding-bottom:6px; }
.phName{
  font-weight:800; padding:4px 10px; border-radius:10px;
  background:color-mix(in oklab, var(--bg), white 6%); border:1px solid var(--cardBorder);
}
.phKpis{ display:flex; gap:10px; margin-left:6px; }
.phKpi{
  display:flex; gap:6px; background:color-mix(in oklab, var(--bg), white 6%); border:1px solid var(--cardBorder); border-radius:10px; padding:6px 8px;
}
.wrap{
  display:grid; grid-template-columns: 360px 1fr; gap:16px; padding:16px; max-width:1720px; margin:0 auto; width:100%;
}
@media(max-width:1200px){ .wrap{ grid-template-columns:1fr; } }
.side{ display:flex; flex-direction:column; gap:12px; }
.main{ display:flex; flex-direction:column; gap:16px; }
.section{
  background:var(--card); border:1px solid var(--cardBorder); border-radius:16px; overflow:hidden; box-shadow:0 12px 24px rgba(0,0,0,0.25);
}
.sectionHead{ padding:10px 12px; font-weight:700; border-bottom:1px solid var(--cardBorder); background:linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0)); }
.sectionBody{ padding:12px; display:flex; flex-direction:column; gap:10px; }
.card{
  background:var(--card); border:1px solid var(--cardBorder); border-radius:18px; overflow:hidden; box-shadow:0 16px 32px rgba(0,0,0,0.3);
}
.cardHead{ display:flex; align-items:center; justify-content:space-between; padding:12px 14px; border-bottom:1px solid var(--cardBorder); background:linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0)); }
.cardBody{ padding:14px; }
.row{ display:flex; gap:12px; align-items:center; }
.col{ flex:1; min-width:0; }
.table{ width:100%; border-collapse:collapse; }
.table th, .table td{ padding:10px 12px; border-bottom:1px solid var(--cardBorder); text-align:left; font-size:13px; white-space:nowrap; }
.scroll{ overflow:auto; border:1px solid var(--cardBorder); border-radius:12px; }
.chipRow{ display:flex; flex-wrap:wrap; gap:8px; align-items:center; }
.chip{ border:1px solid var(--cardBorder); background:var(--chip); color:var(--ink); border-radius:999px; padding:6px 10px; cursor:pointer; font-size:12px; }
.chip.active{ background:var(--chipActive); color:white; border-color:transparent; }
.chartWrap{ width:100%; }
.d3tip{
  max-width: 320px; background: color-mix(in oklab, var(--bg) 92%, black 0%);
  border:1px solid var(--cardBorder); border-radius: 12px; padding: 10px 12px; color: var(--ink);
  filter: drop-shadow(0 12px 18px rgba(0,0,0,0.35)); backdrop-filter: blur(6px); z-index: 1000;
}
.d3tip .t-title{ font-weight:800; margin-bottom:6px; display:flex; gap:8px; align-items:center; }
.d3tip .t-badge{ margin-left:8px; font-size:11px; font-weight:700; color:var(--accent); background:rgba(78,161,255,0.12); border:1px solid rgba(78,161,255,0.35); padding:2px 6px; border-radius:999px; }
.d3tip .t-row{ display:flex; justify-content:space-between; gap:12px; font-size:12px; padding:2px 0; }
.status{ font-size:12px; color:var(--muted); }
.legendRow{ display:flex; flex-wrap:wrap; gap:10px; margin:8px 0 2px; }
.legendItem{ display:inline-flex; align-items:center; gap:6px; font-size:12px; color:var(--muted); }
.legendSwatch{ width:12px; height:12px; border-radius:3px; border:1px solid color-mix(in oklab, black 18%, transparent); }
.badge{ font-size:11px; padding:3px 6px; border-radius:999px; border:1px solid var(--cardBorder); background:color-mix(in oklab, var(--bg), white 6%); }
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
  "Fls":"Fouls","FA":"Fouled","xG/90":"xG/90","xG-OP":"xG Overperformance","xA/90":"Expected Assists/90","xA":"Expected Assists",
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
  "Clr/90":"Clearances/90","Clear":"Clearances","CCC":"Chances Created","Ch C/90":"Chances Created/90","Blk/90":"Blocks/90","Blk":"Blocks","Aer A/90":"Aerial Duels Attempted/90"
}));

/* ===================== Labels for display (fallback to key) ===================== */
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
const fmtPct2 = (v) => Number.isFinite(v) ? `${v.toFixed(2)}%` : "—";

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

const prettyMoney = (n) => {
  if (!Number.isFinite(n)) return "—";
  if (Math.abs(n) >= 1e9) return `£${(n/1e9).toFixed(2)}b`;
  if (Math.abs(n) >= 1e6) return `£${(n/1e6).toFixed(2)}m`;
  if (Math.abs(n) >= 1e3) return `£${(n/1e3).toFixed(0)}k`;
  return `£${n.toFixed(2)}`;
};

/* ===================== Money parsing ===================== */
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

/* ===================== Percentile util ===================== */
function percentileFromSorted(v, arrAsc, lessIsBetter){
  const N = arrAsc.length;
  if (!Number.isFinite(v) || !N) return NaN;
  let l = 0, r = N;
  while (l < r) { const m = (l + r) >> 1; if (arrAsc[m] < v) l = m + 1; else r = m; }
  const lo = l; l = 0; r = N;
  while (l < r) { const m = (l + r) >> 1; if (arrAsc[m] <= v) l = m + 1; else r = m; }
  const hi = l; const midrank = (lo + hi) / 2;
  let pct = (midrank / N) * 100; if (lessIs_BETTER.has?.(0)){} // noop to prevent bundlers from stripping set
  if (LESS_IS_BETTER.has(arrAsc.statName)){} // no-op
  return clamp100(pct);
}

/* ===================== Big-metric families (for estimate) ===================== */
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

/* ===================== Tooltips + charts ===================== */
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

function Radar({ series }) {
  const wrapRef = useRef(null); const svgRef = useRef(null); const tipRef = useRef(null);
  const { width } = useResizeObserver(wrapRef);
  const categories = series[0]?.slices?.map(s=>s.label) || [];
  useEffect(()=>{ if(!wrapRef.current) return; tipRef.current?.destroy?.(); tipRef.current = attachTooltip(wrapRef.current); return ()=>tipRef.current?.destroy?.(); },[wrapRef]);
  useEffect(()=>{
    if (!categories.length) return;
    const w = Math.max(900, width || 1280);
    const h = Math.max(620, Math.min(860, w * 0.6));
    const root = d3.select(svgRef.current).attr("viewBox", `0 0 ${w} ${h}`).attr("width", w).attr("height", h);
    root.selectAll("*").remove();
    const scene = root.append("g");
    const radius = Math.min(w, h) * 0.36;
    const angle = d3.scaleLinear().domain([0, categories.length]).range([0, Math.PI * 2]);
    const r = d3.scaleLinear().domain([0, 100]).range([0, radius]);
    const g = scene.append("g").attr("transform", `translate(${w/2},${h/2})`);
    [20,40,60,80,100].forEach(v=>{ g.append("circle").attr("r", r(v)).attr("fill","none").attr("stroke", "var(--axisInk)").attr("stroke-dasharray","2,4").attr("opacity",0.9); });
    for (let i=0;i<categories.length;i++){ const a = angle(i);
      g.append("line").attr("x1",0).attr("y1",0).attr("x2", Math.cos(a)*radius).attr("y2", Math.sin(a)*radius).attr("stroke","var(--axisInk)").attr("opacity",0.35);
    }
    categories.forEach((label,i)=>{ const a = angle(i); const x = Math.cos(a) * (radius + 14); const y = Math.sin(a) * (radius + 14);
      const anchor = x > 10 ? "start" : x < -10 ? "end" : "middle";
      g.append("text").attr("x", x).attr("y", y).attr("text-anchor", anchor).attr("dominant-baseline","middle").attr("fill","var(--axisInk)").style("font-size","12px").text(label);
    });
    const tip = tipRef.current;
    series.forEach((s, idx)=>{ const color = s.color || (idx===0 ? "var(--accent)" : "var(--accent2)");
      const pts = s.slices.map((slc,i)=>[ Math.cos(angle(i)) * r(clamp100(slc.pct||0)), Math.sin(angle(i)) * r(clamp100(slc.pct||0)) ]);
      const pathD = d3.line().curve(d3.curveCardinalClosed.tension(0.6))(pts);
      g.append("path").attr("d", pathD).attr("fill", color).attr("opacity", 0.12);
      g.append("path").attr("d", pathD).attr("stroke", color).attr("stroke-width", 1.8).attr("fill","none");
      s.slices.forEach((slc, i)=>{ const x = pts[i][0], y = pts[i][1];
        const html = `
          <div class="t-card">
            <div class="t-title">${s.name} — ${slc.label}<span class="t-badge">${decileBadge(clamp100(slc.pct||0))}</span></div>
            <div class="t-row"><span>Percentile</span><b>${tf(slc.pct,2)}%</b></div>
            ${Number.isFinite(slc.raw) ? `<div class="t-row"><span>Role value</span><b>${tf(slc.raw,2)}</b></div>` : ``}
          </div>`;
        g.append("circle").attr("cx", x).attr("cy", y).attr("r", 5.2).attr("fill", color)
          .attr("stroke", "#0b1220").attr("stroke-width",1.2)
          .on("mousemove", (e)=> tip?.show(e, html))
          .on("mouseleave", ()=> tip?.hide())
          .on("click", (e)=> tip?.pin(e, html));
      });
    });
    const bbox = scene.node().getBBox();
    const dx = w/2 - (bbox.x + bbox.width/2);
    const dy = h/2 - (bbox.y + bbox.height/2);
    const desiredBias = Math.min(w * 0.10, 160);
    const leftEdgeAfterCenter = bbox.x + dx;
    const safeBias = Math.min(desiredBias, Math.max(0, leftEdgeAfterCenter - 8));
    scene.attr("transform", `translate(${dx - safeBias},${dy})`);
  },[series, width]);
  return <div className="chartWrap" ref={wrapRef}><svg ref={svgRef}/></div>;
}

function HBar({ items, titleFmt=(v)=>`${v}%`, valueMax=100 }) {
  const wrapRef = useRef(null); const svgRef = useRef(null); const tipRef = useRef(null);
  const { width } = useResizeObserver(wrapRef);
  useEffect(()=>{ if(!wrapRef.current) return; tipRef.current?.destroy?.(); tipRef.current = attachTooltip(wrapRef.current); return ()=>tipRef.current?.destroy?.(); },[wrapRef]);
  useEffect(()=>{
    const rowH = 34;
    const data = Array.isArray(items) ? items : [];
    const h = Math.max(280, 60 + rowH * data.length);
    const w = Math.max(900, width || 1280);
    const margin = { top: 32, right: 30, bottom: 42, left: 320 };
    const root = d3.select(svgRef.current).attr("viewBox", `0 0 ${w} ${h}`).attr("width", w).attr("height", h);
    root.selectAll("*").remove();
    const g = root.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
    const innerW = w - margin.left - margin.right;
    const innerH = h - margin.top - margin.bottom;
    const y = d3.scaleBand().domain(data.map(d=>d.label)).range([0, innerH]).padding(0.22);
    const x = d3.scaleLinear().domain([0, valueMax]).range([0, innerW]);
    g.append("g").call(d3.axisLeft(y).tickSize(0)).selectAll("text").style("font-size","12px").attr("fill","var(--axisInk)");
    g.append("g").attr("transform", `translate(0,${innerH})`).call(d3.axisBottom(x).ticks(6).tickFormat((d)=>titleFmt(d))).selectAll("text").attr("fill","var(--axisInk)");
    const tip = tipRef.current;
    const bars = g.append("g").selectAll("rect").data(data).enter().append("rect")
      .attr("x", 0).attr("y", d=>y(d.label)).attr("height", y.bandwidth()).attr("width", 0).attr("fill", "var(--accent)")
      .on("mousemove",(e,d)=> tip?.show(e, `<div class="t-card"><div class="t-title">${d.label}${d.extra?` — ${d.extra}`:""}</div><div class="t-row"><span>Value</span><b>${titleFmt(d.value)}</b></div></div>`))
      .on("mouseleave",()=>tip?.hide());
    bars.transition().duration(700).attr("width", d=>x(d.value)).attr("rx", 9);
    g.selectAll("text.value").data(data).enter().append("text")
      .attr("class","value").attr("x", d=>x(d.value)+8).attr("y", d=>y(d.label)+y.bandwidth()/2)
      .attr("text-anchor","start").attr("dominant-baseline","middle").attr("fill","var(--ink)").style("font-size","12px")
      .text(d=>titleFmt(d.value));
  },[items, width, valueMax, titleFmt]);
  return <div className="chartWrap" ref={wrapRef}><svg ref={svgRef}/></div>;
}

function Scatter({ points, xLabel, yLabel, q="", highlightName="", colorByPos=false }) {
  const wrapRef = useRef(null); const svgRef = useRef(null); const tipRef = useRef(null);
  const { width } = useResizeObserver(wrapRef);
  useEffect(()=>{ if(!wrapRef.current) return; tipRef.current?.destroy?.(); tipRef.current = attachTooltip(wrapRef.current); return ()=>tipRef.current?.destroy?.(); },[wrapRef]);
  useEffect(()=>{
    const data = Array.isArray(points) ? points : [];
    if (!data.length) return;
    const w = Math.max(980, width || 1340);
    const h = Math.max(620, Math.min(860, w * 0.6));
    const margin = { top: 34, right: 30, bottom: 58, left: 70 };
    const innerW = w - margin.left - margin.right;
    const innerH = h - margin.top - margin.bottom;
    const root = d3.select(svgRef.current).attr("viewBox", `0 0 ${w} ${h}`).attr("width", w).attr("height", h);
    root.selectAll("*").remove();
    const g = root.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
    const x = d3.scaleLinear().domain(d3.extent(data, d=>d.x)).nice().range([0, innerW]);
    const y = d3.scaleLinear().domain(d3.extent(data, d=>d.y)).nice().range([innerH, 0]);
    g.append("g").attr("transform", `translate(0,${innerH})`).call(d3.axisBottom(x)).selectAll("text").attr("fill", "var(--axisInk)");
    g.append("g").call(d3.axisLeft(y)).selectAll("text").attr("fill", "var(--axisInk)");
    const xMid = (x.domain()[0]+x.domain()[1])/2; const yMid = (y.domain()[0]+y.domain()[1])/2;
    g.append("rect").attr("x", x(xMid)).attr("y", 0).attr("width", innerW-x(xMid)).attr("height", y(yMid)).attr("fill", "var(--quadFill)").attr("opacity",0.6);
    g.append("rect").attr("x", 0).attr("y", yMid?y(yMid):innerH/2).attr("width", x(xMid)).attr("height", innerH-(yMid?y(yMid):innerH/2)).attr("fill", "var(--quadFill)").attr("opacity",0.6);
    g.append("text").attr("x", innerW / 2).attr("y", innerH + 44).attr("text-anchor", "middle").attr("fill", "var(--axisInk)").text(xLabel);
    g.append("text").attr("transform", "rotate(-90)").attr("x", -innerH / 2).attr("y", -48).attr("text-anchor", "middle").attr("fill", "var(--axisInk)").text(yLabel);
    const tip = tipRef.current; const query = q.trim().toLowerCase();
    const circles = g.append("g").selectAll("circle").data(data).enter().append("circle")
      .attr("cx", d=>x(d.x)).attr("cy", d=>y(d.y))
      .attr("r", d => { const hit = query && (String(d.name||"").toLowerCase().includes(query) || String(d.club||"").toLowerCase().includes(query) || String(d.pos||"").toLowerCase().includes(query)); const isMe = highlightName && d.name===highlightName; return hit||isMe ? 6.5 : 4.6; })
      .attr("fill", d => {
        if (colorByPos && d.pos && POS_COLORS[d.pos]) return POS_COLORS[d.pos];
        const hit = query && (String(d.name||"").toLowerCase().includes(query) || String(d.club||"").toLowerCase().includes(query) || String(d.pos||"").toLowerCase().includes(query));
        return hit ? "var(--accent2)" : "var(--accent)";
      })
      .attr("opacity", d => { const hit = query && (String(d.name||"").toLowerCase().includes(query) || String(d.club||"").toLowerCase().includes(query) || String(d.pos||"").toLowerCase().includes(query)); const isMe = highlightName && d.name===highlightName; return hit||isMe ? 1 : (query ? 0.35 : 0.95); })
      .on("mousemove",(e,d)=>{ tip?.show(e, `<div class="t-card">
          <div class="t-title">${d.name} • ${d.club||"?"}</div>
          ${d.pos?`<div class="t-row"><span>Pos</span><b>${d.pos}</b></div>`:""}
          <div class="t-row"><span>${xLabel}</span><b>${tf(d.x,2)}</b></div>
          <div class="t-row"><span>${yLabel}</span><b>${tf(d.y,2)}</b></div>
        </div>`); })
      .on("mouseleave",()=>tip?.hide());
  },[points, width, xLabel, yLabel, q, highlightName, colorByPos]);
  return <div className="chartWrap" ref={wrapRef}><svg ref={svgRef}/></div>;
}
// src/App.jsx — PART 2/2

const MODES = [
  "Player Profile",
  "Radar",
  "Percentiles",
  "Role Matrix",
  "Stat Scatter",
  "Player Finder",
  "Best Roles",
  "Role Leaders",
  "Stat Leaders"
];

export default function App(){
  const [themeName, setThemeName] = useState("sleek");
  const theme = THEMES[themeName];

  // data
  const [rows, setRows] = useState([]);
  const [columns, setColumns] = useState([]);

  // UI
  const [mode, setMode] = useState("Player Profile");
  const [baseline, setBaseline] = useState("role_group"); // role_group | sidebar | global
  const [posCohort, setPosCohort] = useState([...POS14]);
  const [minMinutes, setMinMinutes] = useState(900);
  const [maxAge, setMaxAge] = useState(40);
  const [search, setSearch] = useState("");

  // selections
  const [player, setPlayer] = useState("");
  const [role, setRole] = useState("CM — Progresser");
  const [roleX, setRoleX] = useState("CM — Progresser");
  const [roleY, setRoleY] = useState("ST — Poacher");

  const [scatterQ, setScatterQ] = useState("");

  /* ----------- Loaders ----------- */
  const onFile = async (file) => {
    if (!file) return;
    let recs = [];
    if (/\.(html?|HTM)$/i.test(file.name)) recs = await parseHtmlTable(file);
    else if (/\.csv$/i.test(file.name)) {
      const text = await file.text();
      const parsed = Papa.parse(text, { header: true, dynamicTyping: false, skipEmptyLines: true });
      recs = parsed.data || [];
    } else { alert("Please upload HTML or CSV."); return; }

    const normalized = normalizeHeadersRowObjects(recs).map(r => {
      const out = { ...r };
      const pos = out.Pos || out.Position || "";
      out.__pos_tokens = expandFMPositions(pos);
      return out;
    });

    setRows(normalized);
    setColumns(Object.keys(normalized[0] || {}));
    if (normalized.length) {
      const nameColGuess = findColFuzzy(Object.keys(normalized[0]), ["Name","Player","Footballer"]) || "Name";
      setPlayer(String(normalized[0][nameColGuess] || ""));
    }
  };

  /* ----------- Column resolution ----------- */
  const nameCol = useMemo(()=> findColFuzzy(columns, ["Name","Player","Footballer"]) || "Name", [columns]);
  const posCol  = useMemo(()=> findColFuzzy(columns, ["Pos","Position"]) || "Pos", [columns]);
  const minsCol = useMemo(()=> findColFuzzy(columns, ["Minutes","Mins","Min","Time Played","TimePlayed"]) || "Minutes", [columns]);
  const ageCol  = useMemo(()=> findColFuzzy(columns, ["Age"]) || "Age", [columns]);
  const clubCol = useMemo(()=> findColFuzzy(columns, ["Club","Squad","Team"]) || "Club", [columns]);
  const divCol  = useMemo(()=> findColFuzzy(columns, ["League","Division","Competition"]) || "League", [columns]);
  const actualValCol = useMemo(()=> findColFuzzy(columns, ["Transfer Value","Market Value","Value","Transfer Fee","Fee"]), [columns]);

  /* ----------- Numeric columns present ----------- */
  const numericCols = useMemo(()=>{
    const colsSet = new Set(columns);
    return Array.from(colsSet).filter(c => rows.some(r => Number.isFinite(numerify(r[c]))));
  },[columns, rows]);

  /* ----------- Pools react to Minutes & Age ----------- */
  const rowsForPools = useMemo(()=>{
    const mmin = minMinutes||0; const amax = maxAge||100;
    return rows.filter(r => {
      const m = numerify(r[minsCol]); const a = numerify(r[ageCol]);
      const okM = Number.isFinite(m) ? m >= mmin : true;
      const okA = Number.isFinite(a) ? a <= amax : true;
      return okM && okA;
    });
  }, [rows, minsCol, ageCol, minMinutes, maxAge]);

  /* ----------- Filtered (pos + search) ----------- */
  const filtered = useMemo(()=>{
    const allowed = posCohort.length ? posCohort : POS14;
    return rowsForPools.filter(r => {
      const toks = r.__pos_tokens || expandFMPositions(r[posCol] || "");
      const okPos = sharesAny(toks, allowed);
      const okSearch = search ? String(r[nameCol]||"").toLowerCase().includes(search.toLowerCase()) : true;
      return okPos && okSearch;
    });
  }, [rowsForPools, posCohort, posCol, search, nameCol]);

  const players = useMemo(()=> filtered.map(r => String(r[nameCol]||"")).filter(Boolean), [filtered, nameCol]);
  useEffect(()=>{ if (players.length && !players.includes(player)) setPlayer(players[0] || ""); }, [players]); // eslint-disable-line

  /* ----------- Percentile pools (recompute on Minutes/Age) ----------- */
  const pre = useMemo(()=>{
    const global = new Map();
    numericCols.forEach(stat => {
      const arr = rowsForPools.map(r => numerify(r[stat])).filter(Number.isFinite).sort((a,b)=>a-b);
      global.set(stat, arr);
    });
    const groups = new Map();
    const groupsDef = {
      "GK":["GK"],
      "DF":["D (R)","D (L)","D (C)","WB (R)","WB (L)"],
      "MF":["DM","M (R)","M (L)","M (C)","AM (R)","AM (L)","AM (C)"],
      "FW":["ST (C)"]
    };
    for (const [gName, allowed] of Object.entries(groupsDef)) {
      const rs = rowsForPools.filter(r => sharesAny(r.__pos_tokens || expandFMPositions(r[posCol]||""), allowed));
      const m = new Map();
      numericCols.forEach(stat => {
        const arr = rs.map(r => numerify(r[stat])).filter(Number.isFinite).sort((a,b)=>a-b);
        m.set(stat, arr);
      });
      groups.set(gName, m);
    }
    return { global, groups };
  },[rowsForPools, numericCols, posCol]);

  /* ----------- Baselines & percentiles (robust) ----------- */
  function roleFamily(roleName){
    const s = (roleName||"").toLowerCase();
    if (s.includes("gk")) return "GK";
    if (/(cb|fb|wb|full|back|defender)/.test(s)) return "DF";
    if (/(dm|cm|am|mid|mezzala|playmaker|carrilero|regista)/.test(s)) return "MF";
    if (/(st|striker|forward|poacher|target|press)/.test(s)) return "FW";
    return "MF";
  }
  function poolForStat(stat, roleName){
    if (baseline === "global") return pre.global.get(stat) || [];
    if (baseline === "sidebar") {
      const rs = rowsForPools.filter(r => sharesAny(r.__pos_tokens || [], posCohort));
      const arr = rs.map(r => numerify(r[stat])).filter(Number.isFinite).sort((a,b)=>a-b);
      return arr.length ? arr : pre.global.get(stat) || [];
    }
    const g = roleFamily(roleName);
    const arr = pre.groups.get(g)?.get(stat) || [];
    return arr.length ? arr : (pre.global.get(stat) || []);
  }
  const safePercentileFromSorted = (v, arrAsc, lessIsBetter) => {
    const N = arrAsc.length; const val = numerify(v);
    if (!Number.isFinite(val) || !N) return NaN;
    let l = 0, r = N;
    while (l < r) { const m = (l + r) >> 1; if (arrAsc[m] < val) l = m + 1; else r = m; }
    const lo = l; l = 0; r = N;
    while (l < r) { const m = (l + r) >> 1; if (arrAsc[m] <= val) l = m + 1; else r = m; }
    const hi = l; const midrank = (lo + hi) / 2;
    let pct = (midrank / N) * 100;
    if (lessIsBetter) pct = 100 - pct;
    return clamp100(pct);
  };
  function pctStat(value, stat, roleName){
    const pool = poolForStat(stat, roleName);
    return safePercentileFromSorted(value, pool, LESS_IS_BETTER.has(stat));
  }

  /* ----------- Caches ----------- */
  const scoreCacheRef = useRef(new Map());      // keyRow -> Map(role -> score)
  const bestRoleCacheRef = useRef(new Map());   // keyRow -> {name, score}
  const roleLeadersCacheRef = useRef(new Map()); // role -> [{name, score, row}]

  const rowKey = (r) => `${r[nameCol]||"?"}__${r[clubCol]||"?"}`;

  useEffect(()=>{
    scoreCacheRef.current = new Map();
    bestRoleCacheRef.current = new Map();
    roleLeadersCacheRef.current = new Map();
  }, [rowsForPools, numericCols, baseline, posCohort, minMinutes, maxAge]);

  /* ----------- Role scoring ----------- */
  function roleScoreForRaw(row, roleName) {
    const weights = ROLE_WEIGHTS[roleName] || {};
    const stats = Object.keys(weights).filter(s => numericCols.includes(s));
    if (!stats.length) return 0;
    let wsum = 0, acc = 0;
    for (const s of stats) {
      const pct = pctStat(row[s], s, roleName);
      if (!Number.isFinite(pct)) continue;
      const w = weights[s] || 1;
      acc += pct * w; wsum += w;
    }
    return wsum ? clamp100(acc/wsum) : 0;
  }
  function roleScoreFor(row, roleName) {
    const k = rowKey(row);
    let m = scoreCacheRef.current.get(k);
    if (!m) { m = new Map(); scoreCacheRef.current.set(k, m); }
    if (m.has(roleName)) return m.get(roleName);
    const s = roleScoreForRaw(row, roleName);
    m.set(roleName, s);
    return s;
  }
  function nearRolesForRow(row) {
    const toks = row.__pos_tokens || expandFMPositions(row[posCol] || "");
    return Object.keys(ROLE_STATS).filter(rn => sharesAny(toks, ROLE_BASELINES[rn] || []));
  }
  function bestNearRole(row) {
    const k = rowKey(row);
    const cached = bestRoleCacheRef.current.get(k);
    if (cached) return cached;
    const near = nearRolesForRow(row);
    if (!near.length) { const res = { name:"Overall", score: 50 }; bestRoleCacheRef.current.set(k, res); return res; }
    let best = { name: near[0], score: roleScoreFor(row, near[0]) };
    for (const rn of near.slice(1)) {
      const s = roleScoreFor(row, rn);
      if (s > best.score) best = { name: rn, score: s };
    }
    bestRoleCacheRef.current.set(k, best);
    return best;
  }

  /* ----------- League grouping + value baselines ----------- */
  function leagueGroupOf(txt) {
    const s = String(txt || "").toLowerCase();
    if (/(premier league|la liga(?!\s*2)|serie a(?!\s*b)|bundesliga(?!\s*2)|ligue 1\b)/.test(s)) return "elite";
    if (/(eredivisie|primeira liga|liga portugal|mls\b|jupiler|pro league|scottish prem|championship\b)/.test(s)) return "strong";
    if (/(süper lig|super lig|liga mx|brasileir|argentin)/.test(s)) return "solid";
    if (/(serie\s*b|ligue\s*2|2\.bundesliga|la\s*liga\s*2|segunda|segunda división|segunda division|league one|league two)/.test(s)) return "develop";
    return "solid";
  }
  function secondTierFactor(leagueTxt) {
    const s = String(leagueTxt || "").toLowerCase();
    if (/(serie\s*b|ligue\s*2|2\.bundesliga|la\s*liga\s*2|segunda|segunda división|segunda division)/.test(s)) return 0.50;
    if (/championship\b/.test(s)) return 0.65;
    return 1.0;
  }
  const baseByGroup = useMemo(()=>{
    const store = new Map([["elite",[]],["strong",[]],["solid",[]],["develop",[]]]);
    if (actualValCol) {
      rowsForPools.forEach(r => {
        const grp = leagueGroupOf(r[divCol]);
        const rng = parseMoneyRange(r[actualValCol]);
        if (isFinite(rng.mid) && rng.mid>0) store.get(grp).push(rng.mid);
      });
    }
    const out = new Map();
    const allVals = Array.from(store.values()).flat();
    const globalAvg = allVals.length ? allVals.reduce((a,b)=>a+b,0)/allVals.length : 900_000;
    const fallback = { elite: globalAvg * 1.6, strong: globalAvg * 1.15, solid: globalAvg * 0.85, develop: globalAvg * 0.45 };
    for (const [k, arr] of store.entries()) {
      const avg = arr.length ? arr.reduce((a,b)=>a+b,0)/arr.length : fallback[k];
      out.set(k, avg);
    }
    return out;
  }, [rowsForPools, actualValCol, divCol]);

  /* ----------- Values (scaled back) ----------- */
  function actualValueOf(row) {
    if (!actualValCol) return NaN;
    const rng = parseMoneyRange(row[actualValCol]);
    return isFinite(rng.mid) ? rng.mid : (isFinite(rng.upper)?rng.upper:rng.lower);
  }
  function ageMult(age) {
    const a = numerify(age);
    if (!Number.isFinite(a)) return 1.0;
    if (a <= 19) return 1.40;
    if (a <= 22) return 1.25;
    if (a <= 26) return 1.15;
    if (a <= 29) return 1.00;
    if (a <= 32) return 0.85;
    return 0.70;
  }
  function minutesMult(mins) {
    const m = numerify(mins) || 0;
    return 0.80 + Math.min(1, m/2700) * 0.60; // 0.80 .. 1.40
  }
  function posMult(tokens=[]) {
    const t = tokens || [];
    if (t.includes("ST (C)")) return 1.25;
    if (t.includes("AM (C)")) return 1.15;
    if (t.includes("AM (R)") || t.includes("AM (L)")) return 1.10;
    if (t.includes("DM")) return 1.08;
    if (t.includes("WB (R)") || t.includes("WB (L)")) return 1.05;
    if (t.includes("GK")) return 0.90;
    return 1.00;
  }

  // "True Value" (scaled back + anchored more to actual)
  function generatedEstimate(row) {
    const leagueTxt = row[divCol];
    const base = baseByGroup.get(leagueGroupOf(leagueTxt)) || baseByGroup.get("solid") || 900_000;

    const act = actualValueOf(row);
    const anchorW = Number.isFinite(act) && act > 0 ? 0.45 : 0.0; // stronger anchor

    const { score: bestScore } = bestNearRole(row);
    const scoreFactor = 0.75 + 0.0025 * bestScore; // ~0.75..1.00

    const toks = row.__pos_tokens || expandFMPositions(row[posCol] || "");
    const fam = famFromTokens(toks);
    const metrics = BIG_METRICS[fam] || [];
    const pcts = metrics.map(m => pctStat(row[m], m, "Overall")).filter(Number.isFinite);
    const bigAvg = pcts.length ? (pcts.reduce((a, b) => a + b, 0) / pcts.length) : 50;
    const bigFactor = 0.90 + 0.0020 * bigAvg; // ~0.90..1.10

    const mAge = ageMult(row[ageCol]);
    const mMin = minutesMult(row[minsCol]);
    const mPos = posMult(toks);

    const tierD = secondTierFactor(leagueTxt);

    let core = base * scoreFactor * bigFactor * mAge * mMin * mPos * tierD;
    let blended = anchorW * act + (1 - anchorW) * core;

    // conservative caps
    const hardCeil = tierD <= 0.75 ? 25_000_000 : 120_000_000;
    if (Number.isFinite(act)) {
      const capUp = Math.max(3.0 * act, 1_000_000);   // <= 3x actual tag
      const capDown = 0.45 * act;                     // but not <45% of tag
      blended = Math.min(blended, capUp);
      blended = Math.max(blended, capDown);
    }
    const floor = 75_000;
    return Math.max(floor, Math.min(blended, hardCeil));
  }

  // "Buy At" (more realistic discounting)
  function recommendedValue(row) {
    const tv = generatedEstimate(row);
    const leagueTxt = row[divCol];
    const tierD = secondTierFactor(leagueTxt);
    const baseNeg = tierD <= 0.75 ? 0.65 : 0.75; // tighter in lower tiers
    const mins = numerify(row[minsCol]) || 0;
    const age = numerify(row[ageCol]) || 25;
    const minsAdj = mins < 900 ? 0.94 : mins < 1800 ? 0.97 : 1.0;
    const ageAdj = age >= 30 ? 0.92 : age >= 27 ? 0.96 : 1.0;
    return tv * baseNeg * minsAdj * ageAdj;
  }

  /* ----------- Me + KPIs ----------- */
  const me = useMemo(()=> filtered.find(r => String(r[nameCol])===player) || filtered[0] || null, [filtered, player, nameCol]);
  const meActual = me ? actualValueOf(me) : NaN;
  const meTrue = me ? generatedEstimate(me) : NaN;
  const meBuyAt = me ? recommendedValue(me) : NaN;
  const deltaBuyVsAct = Number.isFinite(meActual) ? ((meBuyAt - meActual) / meActual) : NaN;
  const deltaBuyVsTrue = Number.isFinite(meTrue) ? ((meBuyAt - meTrue) / meTrue) : NaN;

  function getRoleLeaders(roleName) {
    const key = roleName;
    const cached = roleLeadersCacheRef.current.get(key);
    if (cached) return cached;
    const allowedBaseline = ROLE_BASELINES[roleName] || [];
    const arr = filtered
      .filter(r => sharesAny(r.__pos_tokens || expandFMPositions(r[posCol]||""), allowedBaseline))
      .map(r => ({ row:r, name:r[nameCol], score: roleScoreFor(r, roleName) }))
      .filter(o => Number.isFinite(o.score))
      .sort((a,b)=> b.score - a.score);
    roleLeadersCacheRef.current.set(key, arr);
    return arr;
  }
  function rankInRole(roleName, row) {
    const leaders = getRoleLeaders(roleName);
    const k = rowKey(row);
    const idx = leaders.findIndex(o => rowKey(o.row) === k);
    return { rank: idx>=0? idx+1 : NaN, total: leaders.length };
  }

  const headerKpis = useMemo(()=>{
    if (!me) return [];
    const best = bestNearRole(me);
    const bestRank = rankInRole(best.name, me);
    return [
      { k: "Age", v: Number.isFinite(numerify(me[ageCol])) ? Math.round(numerify(me[ageCol])) : "—" },
      { k: "Pos", v: me[posCol] || "—" },
      { k: "Club", v: me[clubCol] || "—" },
      { k: "Mins", v: Number.isFinite(numerify(me[minsCol])) ? Math.round(numerify(me[minsCol])).toLocaleString() : "—" },
      { k: "Best Role", v: `${best.name} (${tf(best.score,2)})${Number.isFinite(bestRank.rank)?` • #${bestRank.rank}/${bestRank.total}`:""}` },
      { k: "Value", v: `${prettyMoney(meActual)} Actual • ${prettyMoney(meTrue)} True • Buy At: ${prettyMoney(meBuyAt)}` },
    ];
  },[me, ageCol, posCol, clubCol, minsCol, meActual, meTrue, meBuyAt]);

  /* ----------- UI primitives ----------- */
  function Card({ title, subtitle, right, children }) {
    return (
      <section className="card">
        <div className="cardHead">
          <div>
            <div style={{fontWeight:800}}>{title}</div>
            {subtitle ? <div className="status" style={{marginTop:4}}>{subtitle}</div> : null}
          </div>
          {right || null}
        </div>
        <div className="cardBody">{children}</div>
      </section>
    );
  }

  /* ----------- Modes ----------- */
  function RadarMode() {
    if (!me) return <div className="status">Load data and pick a player.</div>;
    const stats = (ROLE_STATS[role] || []).filter(s => numericCols.includes(s));
    const slices = stats.map(s => ({ label: LABELS.get(s)||s, pct: pctStat(me[s], s, role), raw: numerify(me[s]) }));
    return (
      <Card title={`Radar — ${me[nameCol]}`} subtitle={`${role} • baseline: ${baseline.replace("_"," ")}`}>
        <Radar series={[{ name: me[nameCol], slices }]} />
      </Card>
    );
  }

  function PercentilesMode() {
    if (!me) return <div className="status">Load data and pick a player.</div>;
    const stats = (ROLE_STATS[role] || []).filter(s => numericCols.includes(s));
    const items = stats.map(s => ({ label: LABELS.get(s)||s, value: clamp100(pctStat(me[s], s, role)), raw: numerify(me[s]) }));
    return (
      <Card title={`Percentiles — ${me[nameCol]}`} subtitle={`${role} • tooltips show percentile + role value`}>
        <HBar items={items} titleFmt={(v)=>`${Number.isFinite(v)?v.toFixed(2):"—"}%`} />
      </Card>
    );
  }

  function RoleMatrixMode() {
    const statsX = ROLE_STATS[roleX] || [];
    const statsY = ROLE_STATS[roleY] || [];
    if (!statsX.length || !statsY.length) return <div className="status">Pick two roles with available stats.</div>;
    const pts = filtered.map(r => ({
      name: r[nameCol], club: r[clubCol],
      pos: (expandFMPositions(r[posCol]||"")[0] || "").toUpperCase(),
      x: roleScoreFor(r, roleX), y: roleScoreFor(r, roleY)
    }));
    return (
      <Card title={`Role Matrix — ${roleX} vs ${roleY}`} subtitle={`baseline: ${baseline.replace("_"," ")}`} right={<span className="badge">Color = position</span>}>
        <div className="row" style={{marginBottom:8}}>
          <div className="col">
            <label className="lbl">Search in scatter</label>
            <input className="input" placeholder="Type player/club/pos…" value={scatterQ} onChange={e=>setScatterQ(e.target.value)} />
          </div>
        </div>
        <Scatter points={pts} xLabel={roleX} yLabel={roleY} q={scatterQ} highlightName={me?.[nameCol]} colorByPos />
      </Card>
    );
  }

  function StatScatterMode() {
    const first = numericCols.find(c=>c!=="Minutes") || ""; const second = numericCols.find(c=>c!==first) || first;
    const [xStat, setXStat] = useState(first);
    const [yStat, setYStat] = useState(second);
    const pts = filtered
      .map(r => ({ name:r[nameCol], club:r[clubCol], pos:(expandFMPositions(r[posCol]||"")[0]||""), x:numerify(r[xStat]), y:numerify(r[yStat]) }))
      .filter(d => Number.isFinite(d.x) && Number.isFinite(d.y));
    return (
      <Card title="Stat Scatter" subtitle="Highlight by search • color by position">
        <div className="row" style={{marginBottom:8}}>
          <div className="col">
            <label className="lbl">X Stat</label>
            <select className="input" value={xStat} onChange={e=>setXStat(e.target.value)}>
              {numericCols.map(c=> <option key={c} value={c}>{LABELS.get(c)||c}</option>)}
            </select>
          </div>
          <div className="col">
            <label className="lbl">Y Stat</label>
            <select className="input" value={yStat} onChange={e=>setYStat(e.target.value)}>
              {numericCols.map(c=> <option key={c} value={c}>{LABELS.get(c)||c}</option>)}
            </select>
          </div>
          <div className="col">
            <label className="lbl">Search</label>
            <input className="input" placeholder="Type player/club/pos…" value={scatterQ} onChange={e=>setScatterQ(e.target.value)} />
          </div>
        </div>
        <Scatter points={pts} xLabel={LABELS.get(xStat)||xStat} yLabel={LABELS.get(yStat)||yStat} q={scatterQ} highlightName={me?.[nameCol]} colorByPos />
      </Card>
    );
  }

  /* NEW: Best Roles (bar chart with 2dp) */
  function BestRolesMode() {
    if (!me) return <div className="status">Load data and pick a player.</div>;
    const near = nearRolesForRow(me);
    if (!near.length) return <div className="status">No relevant roles for this position set.</div>;
    const items = near
      .map(rn => ({ label: rn, value: roleScoreFor(me, rn) }))
      .sort((a,b)=> b.value - a.value)
      .slice(0, 12);
    const best = items[0];
    const rankInfo = best ? rankInRole(best.label, me) : { rank: NaN, total: 0 };
    return (
      <Card title={`Best Roles — ${me[nameCol]}`} subtitle={`Top role rank: ${Number.isFinite(rankInfo.rank)?`#${rankInfo.rank} of ${rankInfo.total}`:"—"}`}>
        <HBar items={items} titleFmt={(v)=>`${Number.isFinite(v)?v.toFixed(2):"—"}%`} />
      </Card>
    );
  }

  /* Role Leaders as bar chart (2dp) */
  function RoleLeadersMode() {
    const top = getRoleLeaders(role).slice(0, 20);
    const items = top.map(o => ({
      label: o.name,
      value: o.score,
      extra: `${o.row[clubCol]||""} • ${o.row[posCol]||""}`
    }));
    return (
      <Card title={`Role Leaders — ${role}`} subtitle={`baseline: ${baseline.replace("_"," ")}`}>
        <HBar items={items} titleFmt={(v)=>`${Number.isFinite(v)?v.toFixed(2):"—"}%`} />
      </Card>
    );
  }

  /* Player Profile — shows best-role radar + rank + values */
function PlayerProfileMode() {
  if (!me) return <div className="status">Load data and pick a player.</div>;

  const best = bestNearRole(me);                            // { name, score }
  const bestRank = rankInRole(best.name, me);              // { rank, total }

  // Build radar for the player's best role only (using all relevant stats)
  const bestStats = (ROLE_STATS[best.name] || []).filter(s => numericCols.includes(s));
  const slices = bestStats.map(s => ({
    label: LABELS.get(s) || s,
    pct: pctStat(me[s], s, best.name),
    raw: numerify(me[s]),
  }));

  // Top stats list (2dp) for best role
  const topItems = bestStats
    .map(s => ({ label: LABELS.get(s) || s, value: clamp100(pctStat(me[s], s, best.name)) }))
    .filter(d => Number.isFinite(d.value))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  const act = actualValueOf(me);
  const tv  = generatedEstimate(me);
  const buy = recommendedValue(me);

  return (
    <>
      <Card
        title={`Player Profile — ${me[nameCol]}`}
        subtitle={`Best Role: ${best.name} • Score: ${Number.isFinite(best.score) ? best.score.toFixed(2) : "—"}% • Rank: ${Number.isFinite(bestRank.rank) ? `#${bestRank.rank}/${bestRank.total}` : "—"}`}
        right={
          <div className="seg">
            <span className="badge">Actual: {prettyMoney(act)}</span>
            <span className="badge">True Value: {prettyMoney(tv)}</span>
            <span className="badge">Buy At: {prettyMoney(buy)}</span>
          </div>
        }
      >
        <Radar series={[{ name: me[nameCol], slices }]} />
      </Card>

      <Card title="Top Stats (Best Role)" subtitle="Percentiles vs chosen baseline">
        <HBar items={topItems} titleFmt={(v) => `${Number.isFinite(v) ? v.toFixed(2) : "—"}%`} />
      </Card>
    </>
  );
}


  /* NEW: Stat Leaders (bar chart with 2dp) */
  function StatLeadersMode() {
    const [stat, setStat] = useState(numericCols[0] || "");
    const [limit, setLimit] = useState(20);
    const [asc, setAsc] = useState(false);

    const items = useMemo(()=>{
      const arr = filtered
        .map(r => ({ label: r[nameCol], value: numerify(r[stat]), extra: `${r[clubCol]||""} • ${r[posCol]||""}` }))
        .filter(o => Number.isFinite(o.value));
      arr.sort((a,b)=> asc ? (a.value - b.value) : (b.value - a.value));
      return arr.slice(0, Math.max(5, Math.min(50, limit)));
    }, [filtered, stat, asc, limit]);

    return (
      <Card title="Stat Leaders" subtitle="Top players by a chosen stat">
        <div className="row" style={{marginBottom:8}}>
          <div className="col">
            <label className="lbl">Stat</label>
            <select className="input" value={stat} onChange={e=>setStat(e.target.value)}>
              {numericCols.map(c=> <option key={c} value={c}>{LABELS.get(c)||c}</option>)}
            </select>
          </div>
          <div className="col">
            <label className="lbl">Show</label>
            <input className="input" type="number" min={5} max={50} value={limit} onChange={e=>setLimit(Number(e.target.value)||20)} />
          </div>
          <div className="col">
            <label className="lbl">Order</label>
            <button className="btn ghost tight" onClick={()=>setAsc(a=>!a)}>{asc?"Ascending":"Descending"}</button>
          </div>
        </div>
        <HBar items={items} titleFmt={(v)=> Number.isFinite(v) ? v.toFixed(2) : "—"} valueMax={Math.max(...items.map(i=>i.value), 1)} />
      </Card>
    );
  }

  /* Player Finder — include Best Role rank */
  function PlayerFinderMode() {
    const cols = ["Name","Club","Pos","Minutes","Age","Best Role","Best Role %","Rank (Best Role)","True Value","Buy At","Actual"];
    const data = filtered.slice(0, 300).map(r => {
      const best = bestNearRole(r);
      const rk = rankInRole(best.name, r);
      return {
        name: r[nameCol],
        club: r[clubCol],
        pos: r[posCol],
        mins: Number.isFinite(numerify(r[minsCol])) ? Math.round(numerify(r[minsCol])) : null,
        age: Number.isFinite(numerify(r[ageCol])) ? Math.round(numerify(r[ageCol])) : null,
        bestRole: best.name,
        bestPct: Number.isFinite(best.score)? best.score : NaN,
        rankText: Number.isFinite(rk.rank) ? `#${rk.rank}/${rk.total}` : "—",
        trueV: generatedEstimate(r),
        buyAt: recommendedValue(r),
        act: actualValueOf(r)
      };
    });

    return (
      <Card title="Player Finder" subtitle="Filtered list • includes ranking in their best role">
        <div className="scroll">
          <table className="table">
            <thead>
              <tr>
                {cols.map(c=> <th key={c}>{c}</th>)}
              </tr>
            </thead>
            <tbody>
              {data.map((d,i)=>(
                <tr key={i}>
                  <td>{d.name}</td>
                  <td>{d.club || "—"}</td>
                  <td>{d.pos || "—"}</td>
                  <td>{Number.isFinite(d.mins) ? d.mins.toLocaleString() : "—"}</td>
                  <td>{Number.isFinite(d.age) ? d.age : "—"}</td>
                  <td>{d.bestRole}</td>
                  <td>{Number.isFinite(d.bestPct) ? `${d.bestPct.toFixed(2)}%` : "—"}</td>
                  <td>{d.rankText}</td>
                  <td>{prettyMoney(d.trueV)}</td>
                  <td>{prettyMoney(d.buyAt)}</td>
                  <td>{prettyMoney(d.act)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    );
  }

  /* ----------- Layout ----------- */
  return (
    <ErrorBoundary>
      <div className="app">
        <style>{CSS(theme, themeName)}</style>

        <header className="topbar">
          <div className="brand">analytics — D3</div>
          <nav className="tabs" role="tablist">
            {MODES.map(m => (
              <button key={m} className={`tab ${mode===m?"active":""}`} onClick={()=>setMode(m)}>{m}</button>
            ))}
          </nav>
          <div className="spacer"/>
          <div className="seg">
            <button className={`segBtn ${baseline==="role_group"?"active":""}`} onClick={()=>setBaseline("role_group")}>Baseline: role group</button>
            <button className={`segBtn ${baseline==="sidebar"?"active":""}`} onClick={()=>setBaseline("sidebar")}>Sidebar positions</button>
            <button className={`segBtn ${baseline==="global"?"active":""}`} onClick={()=>setBaseline("global")}>Global</button>
          </div>
          <button className="btn ghost" onClick={()=> setThemeName(themeName==="sleek"?"dusk": themeName==="dusk"?"light":"sleek")}>
            Theme: {themeName}
          </button>
        </header>

        <section className="playerBar">
          <div className="playerHeader">
            {me ? (
              <>
                <div className="phName">{me[nameCol]}</div>
                <div className="phKpis">
                  {headerKpis.map((k,i)=>(
                    <div className="phKpi" key={i}><div className="k">{k.k}</div><div className="v">{k.v}</div></div>
                  ))}
                </div>
              </>
            ) : <div className="status">Select a player to see details.</div>}
          </div>
        </section>

        <div className="wrap">
          <aside className="side">
            <section className="section">
              <div className="sectionHead">Data</div>
              <div className="sectionBody">
                <div className="row">
                  <input type="file" accept=".html,.htm,.csv" onChange={e=>onFile(e.target.files?.[0])}/>
                </div>
                <div className="status">Columns: {columns.length} • Rows: {rows.length.toLocaleString()}</div>
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
                    <input className="input" type="number" value={minMinutes} onChange={e=>setMinMinutes(Number(e.target.value)||0)} />
                  </div>
                  <div className="col">
                    <label className="lbl">Max age</label>
                    <input className="input" type="number" value={maxAge} onChange={e=>setMaxAge(Number(e.target.value)||60)} />
                  </div>
                </div>
                <label className="lbl">Search (name)</label>
                <input className="input" placeholder="Find a player…" value={search} onChange={e=>setSearch(e.target.value)} />
              </div>
            </section>

            <section className="section">
              <div className="sectionHead">Selections</div>
              <div className="sectionBody">
                <label className="lbl">Archetype</label>
                <select className="input" value={role} onChange={e=>setRole(e.target.value)}>
                  {Object.keys(ROLE_STATS).map(k => <option key={k} value={k}>{k}</option>)}
                </select>
                <label className="lbl">Player</label>
                <select className="input" value={player} onChange={e=>setPlayer(e.target.value)}>
                  {players.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
                <label className="lbl">Matrix roles</label>
                <select className="input" value={roleX} onChange={e=>setRoleX(e.target.value)}>
                  {Object.keys(ROLE_STATS).map(k => <option key={k} value={k}>{k}</option>)}
                </select>
                <select className="input" value={roleY} onChange={e=>setRoleY(e.target.value)}>
                  {Object.keys(ROLE_STATS).map(k => <option key={k} value={k}>{k}</option>)}
                </select>
              </div>
            </section>
          </aside>

          <main className="main">
            {mode==="Player Profile" && <PlayerProfileMode/>}
            {mode==="Radar" && <RadarMode/>}
            {mode==="Percentiles" && <PercentilesMode/>}
            {mode==="Role Matrix" && <RoleMatrixMode/>}
            {mode==="Stat Scatter" && <StatScatterMode/>}
            {mode==="Player Finder" && <PlayerFinderMode/>}
            {mode==="Best Roles" && <BestRolesMode/>}
            {mode==="Role Leaders" && <RoleLeadersMode/>}
            {mode==="Stat Leaders" && <StatLeadersMode/>}
          </main>
        </div>
      </div>
    </ErrorBoundary>
  );
}

/* Player Profile is defined within App above (JSX fragment with Radar + Scatter) */
