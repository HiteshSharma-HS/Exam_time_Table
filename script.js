const $ = s => document.querySelector(s);
const COLORS = ['#1f4fd8','#d9363e','#17805d','#d98a00','#8e44c9','#0b8fa3','#e0568a','#6d5a48','#5f8f1d','#3f51b5'];
const TIMES = ['10:00 AM - 1:00 PM', '2:00 PM - 5:00 PM', '5:30 PM - 8:30 PM'];
const SAMPLE = {
  subjects: ['Maths', 'Physics', 'Chemistry', 'English', 'DSA', 'DBMS', 'OS', 'Python'],
  edges: [[0,1],[0,2],[1,2],[0,4],[4,5],[5,6],[4,6],[3,7],[7,4],[2,3],[6,7]]
};
let subjects = [], edges = [], result = null;

/* ---------- Graph coloring with backtracking ---------- */
function buildAdj() {
  const adj = subjects.map(() => []);
  edges.forEach(([a, b]) => { adj[a].push(b); adj[b].push(a); });
  return adj;
}

// Try to colour the graph with at most k colours. Returns {col, bt}.
function colorWithK(adj, order, k) {
  const n = adj.length, col = Array(n).fill(-1);
  let bt = 0;
  const safe = (v, c) => adj[v].every(u => col[u] !== c);
  function rec(i, used) {
    if (i === n) return true;
    const v = order[i];
    for (let c = 0; c < Math.min(k, used + 1); c++) {   // symmetry breaking
      if (safe(v, c)) {
        col[v] = c;
        if (rec(i + 1, Math.max(used, c + 1))) return true;
        col[v] = -1; bt++;                                // backtrack
      }
    }
    return false;
  }
  return { col: rec(0, 0) ? col : null, bt };
}

function generate() {
  if (!subjects.length) { alert('Add at least one subject first.'); return; }
  const adj = buildAdj();
  const order = subjects.map((_, i) => i).sort((a, b) => adj[b].length - adj[a].length); // high degree first
  const t0 = performance.now(), log = [];
  let total = 0, found = null;
  for (let k = 1; k <= subjects.length; k++) {
    const r = colorWithK(adj, order, k);
    total += r.bt;
    log.push(`Tried ${k} slot${k > 1 ? 's' : ''}: ${r.col ? 'success' : 'failed'} (${r.bt} backtracks)`);
    if (r.col) { found = { col: r.col, k }; break; }
  }
  const ms = performance.now() - t0;
  const valid = edges.every(([a, b]) => found.col[a] !== found.col[b]);
  result = { col: found.col, k: found.k, bt: total, ms, valid, log };
  render();
}

/* ---------- Rendering ---------- */
const esc = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const colorOf = i => result ? COLORS[result.col[i] % COLORS.length] : '#8a94a6';

function slotLabel(s) {
  const perDay = +$('#perDay').value;
  const d = new Date($('#startDate').value || Date.now());
  let days = Math.floor(s / perDay);
  while (days > 0) { d.setDate(d.getDate() + 1); if (d.getDay() !== 0) days--; } // skip Sundays
  if (d.getDay() === 0) d.setDate(d.getDate() + 1);
  return { date: d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }), time: TIMES[s % perDay] };
}

function render() {
  save();
  $('#sSub').textContent = subjects.length;
  $('#sEdge').textContent = edges.length;
  $('#sSlot').textContent = result ? result.k : '-';
  $('#sBt').textContent = result ? result.bt : '-';
  $('#sTime').textContent = result ? result.ms.toFixed(2) : '-';
  $('#sValid').textContent = result ? (result.valid ? 'Valid' : 'Invalid') : '-';

  const opts = subjects.map((s, i) => `<option value="${i}">${esc(s)}</option>`).join('');
  $('#cA').innerHTML = opts; $('#cB').innerHTML = opts;
  if (subjects.length > 1) $('#cB').selectedIndex = 1;

  $('#subList').innerHTML = subjects.length ? subjects.map((s, i) =>
    `<span class="chip"><i style="background:${colorOf(i)}"></i>${esc(s)}<button data-s="${i}" aria-label="Remove ${esc(s)}">&times;</button></span>`).join('')
    : '<span class="empty">No subjects yet. Add one or load the sample.</span>';
  $('#edgeList').innerHTML = edges.length ? edges.map(([a, b], i) =>
    `<span class="chip">${esc(subjects[a])} - ${esc(subjects[b])}<button data-e="${i}" aria-label="Remove conflict">&times;</button></span>`).join('')
    : '<span class="empty">No conflicts added.</span>';

  drawGraph(); drawTable();
  $('#log').innerHTML = result ? result.log.map(l => `<li>${l}</li>`).join('') : '<li>Press "Generate timetable" to run the algorithm.</li>';
}

function drawGraph() {
  const n = subjects.length, cx = 310, cy = 190, r = Math.min(150, 40 + n * 14);
  const pos = subjects.map((_, i) => [cx + r * Math.cos(2 * Math.PI * i / n - Math.PI / 2), cy + r * Math.sin(2 * Math.PI * i / n - Math.PI / 2)]);
  let h = edges.map(([a, b]) => `<line x1="${pos[a][0]}" y1="${pos[a][1]}" x2="${pos[b][0]}" y2="${pos[b][1]}" stroke="#8a94a6" stroke-width="1.5" opacity=".7"/>`).join('');
  h += subjects.map((s, i) => `<circle cx="${pos[i][0]}" cy="${pos[i][1]}" r="22" fill="${colorOf(i)}"/>
    <text x="${pos[i][0]}" y="${pos[i][1] + 4}" text-anchor="middle" fill="#fff" font-size="11" font-weight="600">${result ? 'S' + (result.col[i] + 1) : ''}</text>
    <text x="${pos[i][0]}" y="${pos[i][1] + 38}" text-anchor="middle" fill="currentColor" font-size="12">${esc(s)}</text>`).join('');
  $('#graph').innerHTML = h;
  $('#legend').innerHTML = result ? Array.from({ length: result.k }, (_, s) => `<span><i style="background:${COLORS[s % COLORS.length]}"></i>Slot ${s + 1}</span>`).join('') : '';
}

function drawTable() {
  if (!result) { $('#tt').innerHTML = '<tr><td class="empty">Timetable will appear here after generation.</td></tr>'; return; }
  let h = '<tr><th>Slot</th><th>Date</th><th>Time</th><th>Subjects</th></tr>';
  for (let s = 0; s < result.k; s++) {
    const { date, time } = slotLabel(s);
    const tags = subjects.map((n, i) => result.col[i] === s ? `<span class="tag" style="background:${COLORS[s % COLORS.length]}">${esc(n)}</span>` : '').join('');
    h += `<tr><td>Slot ${s + 1}</td><td>${date}</td><td>${time}</td><td>${tags}</td></tr>`;
  }
  $('#tt').innerHTML = h;
}

/* ---------- Actions ---------- */
function resetResult() { result = null; }
function addSubject() {
  const v = $('#subName').value.trim();
  if (!v) return;
  if (subjects.some(s => s.toLowerCase() === v.toLowerCase())) { alert('Subject already exists.'); return; }
  subjects.push(v); $('#subName').value = ''; resetResult(); render();
}
function addEdge() {
  const a = +$('#cA').value, b = +$('#cB').value;
  if (subjects.length < 2 || a === b) { alert('Pick two different subjects.'); return; }
  if (edges.some(e => (e[0] === a && e[1] === b) || (e[0] === b && e[1] === a))) return;
  edges.push([a, b]); resetResult(); render();
}
function removeSubject(i) {
  subjects.splice(i, 1);
  edges = edges.filter(e => e[0] !== i && e[1] !== i).map(e => e.map(x => x > i ? x - 1 : x));
  resetResult(); render();
}
function randomData() {
  const n = 8 + Math.floor(Math.random() * 5);
  subjects = Array.from({ length: n }, (_, i) => 'Subject ' + (i + 1));
  edges = [];
  for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) if (Math.random() < 0.3) edges.push([a, b]);
  resetResult(); render();
}
function exportCsv() {
  if (!result) { alert('Generate the timetable first.'); return; }
  let csv = 'Slot,Date,Time,Subjects\n';
  for (let s = 0; s < result.k; s++) {
    const { date, time } = slotLabel(s);
    csv += `Slot ${s + 1},"${date}",${time},"${subjects.filter((_, i) => result.col[i] === s).join(' | ')}"\n`;
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  a.download = 'exam_timetable.csv'; a.click();
}
function save() { try { localStorage.setItem('examTT', JSON.stringify({ subjects, edges })); } catch (e) {} }
function load() {
  try { const d = JSON.parse(localStorage.getItem('examTT')); if (d) { subjects = d.subjects; edges = d.edges; return; } } catch (e) {}
  subjects = [...SAMPLE.subjects]; edges = SAMPLE.edges.map(e => [...e]);
}

$('#btnGen').onclick = generate;
$('#btnSub').onclick = addSubject;
$('#subName').onkeydown = e => { if (e.key === 'Enter') addSubject(); };
$('#btnEdge').onclick = addEdge;
$('#btnSample').onclick = () => { subjects = [...SAMPLE.subjects]; edges = SAMPLE.edges.map(e => [...e]); resetResult(); render(); };
$('#btnRandom').onclick = randomData;
$('#btnClear').onclick = () => { subjects = []; edges = []; resetResult(); render(); };
$('#btnCsv').onclick = exportCsv;
$('#perDay').onchange = $('#startDate').onchange = () => result && drawTable();
$('#subList').onclick = e => { const b = e.target.closest('[data-s]'); if (b) removeSubject(+b.dataset.s); };
$('#edgeList').onclick = e => { const b = e.target.closest('[data-e]'); if (b) { edges.splice(+b.dataset.e, 1); resetResult(); render(); } };

$('#startDate').value = new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10);
load(); render();
