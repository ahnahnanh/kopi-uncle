// Game flow: state, the drink station UI, customer queue, serving, the timer loop,
// the tutorial, start/end screens and button wiring.
import { $, pick } from './utils.js';
import { BASES, MILKS, CUPS, blankCup, FIELDS, nameOf, englishOf, randomOrder, same, gripe, price } from './drink.js';
import { PEOPLE, P, HAPPY, LEAVE, LESSONS, RANKS, dictHTML } from './content.js';
import { sfx, toggleMute } from './sound.js';

const GAME_LEN = 150, MAX_WALKOUTS = 3;

// Pacing: the shift starts slow (one customer at a time, lots of patience) and ramps up.
// until = seconds into the shift; maxQ = max customers waiting; gap = seconds between arrivals;
// pat = base patience in seconds (scaled per customer type).
const STAGES = [
  { until: 40,       maxQ: 1, gap: [2, 3],   pat: 60, msg: null },
  { until: 75,       maxQ: 2, gap: [9, 11],  pat: 40, msg: '🕗 More customers coming in… a bit faster now!' },
  { until: 110,      maxQ: 3, gap: [6, 8],   pat: 30, msg: '🏢 Office crowd! Faster!' },
  { until: Infinity, maxQ: 4, gap: [4, 5.5], pat: 22, msg: '🔥 Peak rush! Chiong ah!' },
];

/* ---------- state ---------- */
let G = null, cup = blankCup(), last = 0;

/* ---------- controls ---------- */
function buildControls(){
  const c = $('#controls');
  const btn = (attr, v, l, e) => `<button class="opt" data-${attr}="${v}"><span class="e">${e}</span>${l}</button>`;
  c.innerHTML = '<div class="grp"><h3>1 · Cup first</h3><div class="opts">' + CUPS.map(([v,l,e]) => btn('cup', v, l, e)).join('') + '</div></div>' +
    '<div class="grp"><h3>2 · Ingredients</h3><div class="opts">' +
    BASES.map(([v,l,e]) => `<button class="opt" data-base="${v}"><span class="e">${e}</span>${l}<span class="shots"></span></button>`).join('') +
    MILKS.map(([v,l,e]) => btn('milk', v, l, e)).join('') +
    '<button class="opt" id="sugarBtn"><span class="e">🥄</span>Sugar<span id="spoons"></span></button>' +
    btn('water', '1', 'Water', '💧') + btn('ice', '1', 'Ice', '🧊') + '</div></div>';
  c.onclick = e => {
    const b = e.target.closest('.opt'); if(!b) return;
    const d = b.dataset;
    const no = msg => { sfx.bad(); toast(msg, 'bad'); b.classList.remove('nope'); void b.offsetWidth; b.classList.add('nope'); setTimeout(() => b.classList.remove('nope'), 400); };
    if(d.cup){
      if(!cup.cup){ cup.cup = d.cup; sfx.click(); renderCup(); }
      else no(cup.cup === d.cup ? 'Already got cup lah.' : 'Cup already out. Pour away first if wrong!');
      return;
    }
    if(!cup.cup) return no('Cup first lah! 🥤');
    const what = { kopi:'coffee', teh:'tea', milo:'Milo' };
    if(b.id === 'sugarBtn'){
      if(cup.sugar >= 3) return no('3 spoons already! Want diabetes ah?');
      cup.sugar++;
    }
    else if(d.base){
      if(cup.base && cup.base !== d.base) return no(`Already got ${what[cup.base]} inside! Pour away first.`);
      if(cup.shots >= 2) return no('Double shot already, cannot more!');
      cup.base = d.base; cup.shots++;
    }
    else if(d.milk){
      if(cup.milk) return no(cup.milk === d.milk ? 'Milk already inside.' : 'Already got other milk inside! Pour away first.');
      cup.milk = d.milk;
    }
    else if(d.water){ if(cup.water) return no('Water already inside.'); cup.water = true; }
    else if(d.ice){ if(cup.ice) return no('Ice already inside.'); cup.ice = true; }
    sfx.click();
    renderCup();
  };
}
const COLORS = {
  kopi:{ null:'#3a2213', evap:'#7a4f2c', condensed:'#9a6a3f' },
  teh: { null:'#8c3a12', evap:'#b8743f', condensed:'#cf9460' },
  milo:{ null:'#4a2e1c', evap:'#6b4630', condensed:'#6b4630' },
};
function renderCup(){
  for(const k of ['base','milk','cup']) document.querySelectorAll(`.opt[data-${k}]`).forEach(b => b.classList.toggle('on', cup[k] === b.dataset[k]));
  document.querySelector('.opt[data-ice]').classList.toggle('on', cup.ice);
  document.querySelector('.opt[data-water]').classList.toggle('on', cup.water);
  document.querySelectorAll('.opt[data-base] .shots').forEach(x => x.textContent = (x.parentNode.dataset.base === cup.base && cup.shots === 2) ? ' ×2' : '');
  $('#sugarBtn').classList.toggle('on', cup.sugar > 0);
  $('#spoons').textContent = cup.sugar ? ' ×' + cup.sugar : '';
  const el = $('#cup'), liq = $('#liquid');
  el.className = 'cup' + (cup.cup === 'takeaway' ? ' bag' : cup.cup === 'normal' ? '' : ' nocup');
  if(cup.base){ liq.style.height = '78%'; liq.style.background = COLORS[cup.base][cup.milk];
    liq.style.filter = cup.shots === 2 ? 'brightness(.75)' : cup.water ? 'brightness(1.25) saturate(.7)' : ''; }
  else if(cup.milk){ liq.style.height = '30%'; liq.style.background = '#f3ead8'; }
  else liq.style.height = '0';
  $('#ice').style.display = cup.ice ? 'block' : 'none';
  const parts = [];
  if(cup.cup) parts.push(CUPS.find(x => x[0] === cup.cup)[1]);
  if(cup.base) parts.push(BASES.find(x => x[0] === cup.base)[1] + (cup.shots === 2 ? ' ×2' : ''));
  if(cup.milk) parts.push(MILKS.find(x => x[0] === cup.milk)[1]);
  if(cup.water) parts.push('Water');
  if(cup.sugar) parts.push(`${cup.sugar} sugar`);
  if(cup.ice) parts.push('Ice');
  const r = $('#readout');
  r.textContent = parts.length ? parts.join(' · ') : 'Empty. Start making something';
  r.classList.toggle('hidden', !parts.length);
}

/* ---------- queue ---------- */
function level(){ return STAGES.findIndex(s => G.t < s.until); }
function spawn(){
  const lvl = level();
  const pool = PEOPLE.filter(p => (p.minLvl || 0) <= lvl);
  const person = pick(pool);
  const order = randomOrder(lvl, person.dabao);
  const pat = STAGES[lvl].pat * person.pat + (order.base === 'milo' ? 2 : 0);
  const say = pick(person.lines).replace('{o}', person.english ? englishOf(order) : `<b>${nameOf(order)}</b>`);
  const c = { id: ++G.id, person, order, max: pat, left: pat, say, mad: null };
  G.queue.push(c);
  if(!G.sel) G.sel = c.id;
  renderQueue();
}
function renderQueue(){
  const q = $('#queue');
  if(!G.queue.length){ q.innerHTML = '<div class="empty-q">No customers right now. Catch your breath…</div>'; return; }
  q.innerHTML = '';
  for(const c of G.queue){
    const b = document.createElement('button');
    b.className = 'cust' + (c.id === G.sel ? ' sel' : '') + (isFinite(c.max) ? '' : ' tutc');
    b.dataset.id = c.id;
    b.innerHTML = `<div class="who"><span class="face">${c.mad ? (c.person.english ? '😬' : '😑') : c.person.face}</span><span class="nm">${c.person.name}</span></div>
      <div class="bubble${c.mad ? ' mad' : ''}">${c.mad || c.say}</div><div class="pbar"><i></i></div>`;
    b.onclick = () => { G.sel = c.id; sfx.click(); renderQueue(); };
    c.el = b; c.bar = b.querySelector('.pbar i');
    q.appendChild(b);
  }
  updateBars();
}
function updateBars(){
  for(const c of G.queue){
    if(!c.bar) continue;
    const f = isFinite(c.max) ? Math.max(0, c.left / c.max) : 1;
    c.bar.style.width = (f * 100) + '%';
    c.bar.style.background = f > .5 ? 'var(--ok)' : f > .25 ? 'var(--warn)' : 'var(--bad)';
  }
}
function removeCust(c){
  G.queue = G.queue.filter(x => x !== c);
  if(G.sel === c.id) G.sel = G.queue[0] ? G.queue[0].id : null;
  if(!G.tutorial && !G.queue.length) G.nextSpawn = Math.max(G.nextSpawn, 1.5); // tiny breather
  renderQueue();
}

/* ---------- serve ---------- */
function serve(){
  if(!G || G.over) return;
  if(!cup.base && !cup.milk){ toast('Serve air ah? 🤨', 'bad'); sfx.bad(); return; }
  const c = G.queue.find(x => x.id === G.sel);
  if(!c){ toast('Nobody waiting leh. Drink it yourself lor. ☕'); cup = blankCup(); renderCup(); return; }
  if(same(c.order, cup) && G.tutorial){
    sfx.good(); toast(pick(HAPPY), 'good');
    removeCust(c); cup = blankCup(); renderCup();
    setTimeout(nextLesson, 700);
    return;
  }
  if(same(c.order, cup)){
    G.streak++; G.best = Math.max(G.best, G.streak); G.served++;
    const frac = c.left / c.max;
    let amt = price(c.order) + Math.round(frac * 6) / 10 + (G.streak >= 3 ? 0.2 * Math.min(G.streak - 2, 5) : 0);
    if(G.sifu) amt *= 1.5;
    G.money += amt;
    sfx.good();
    toast(`${pick(HAPPY)} +$${amt.toFixed(2)}${G.streak >= 3 ? ` · 🔥${G.streak} streak` : ''}`, 'good');
    removeCust(c);
  } else {
    G.wrong++; G.streak = 0;
    c.mad = gripe(c.order, cup, c.person, G.tutorial);
    c.left = Math.max(1, c.left - 4);
    sfx.bad();
    renderQueue();
    const el = $(`.cust[data-id="${c.id}"]`);
    if(el){ el.classList.add('shake'); }
    clearTimeout(c.madT);
    c.madT = setTimeout(() => { c.mad = null; if(G.queue.includes(c)) renderQueue(); }, 2600);
  }
  cup = blankCup(); renderCup(); updateHUD();
}

/* ---------- loop ---------- */
function loop(now){
  if(!G || G.over) return;
  const dt = Math.min(0.1, (now - last) / 1000); last = now;
  G.t += dt;
  const lvl = level(), stage = STAGES[lvl];
  if(lvl !== G.lvl){ G.lvl = lvl; if(stage.msg) toast(stage.msg); }
  G.nextSpawn -= dt;
  if(G.nextSpawn <= 0 && G.queue.length < stage.maxQ){
    spawn();
    const [a, b] = stage.gap;
    G.nextSpawn = a + Math.random() * (b - a);
  }
  if(!G.queue.length && G.nextSpawn > 2) G.nextSpawn = 2;
  for(const c of [...G.queue]){
    c.left -= dt;
    if(c.left <= 0){
      G.walkouts++; G.streak = 0;
      sfx.leave();
      toast(`${c.person.face} ${c.person.name}: "${pick(LEAVE)}"`, 'bad');
      removeCust(c);
    }
  }
  updateBars(); updateHUD();
  if(G.t >= GAME_LEN || G.walkouts >= MAX_WALKOUTS) return end();
  requestAnimationFrame(loop);
}
function updateHUD(){
  if(!G) return;
  if(G.tutorial){ $('#hTime').textContent = `📘 ${Math.min(G.step + 1, LESSONS.length)}/${LESSONS.length}`; }
  const rem = Math.max(0, Math.ceil(GAME_LEN - G.t));
  if(!G.tutorial) $('#hTime').textContent = `⏱ ${Math.floor(rem / 60)}:${String(rem % 60).padStart(2, '0')}`;
  $('#hMoney').textContent = `💰 $${G.money.toFixed(2)}`;
  $('#hStreak').textContent = `🔥 ${G.streak}`;
  $('#hLives').textContent = '❤️'.repeat(MAX_WALKOUTS - G.walkouts) + '🖤'.repeat(G.walkouts);
}
function toast(msg, cls = ''){
  const t = document.createElement('div');
  t.className = 'toast ' + cls; t.textContent = msg;
  $('#toasts').appendChild(t);
  setTimeout(() => t.remove(), 2000);
}

/* ---------- tutorial ---------- */
function startTutorial(){
  $('#startScreen').classList.add('hide'); $('#endScreen').classList.add('hide'); $('#tutDone').classList.add('hide');
  G = { t:0, money:0, served:0, wrong:0, streak:0, best:0, walkouts:0, queue:[], sel:null, id:0, over:false, sifu:false, tutorial:true, step:-1 };
  cup = blankCup(); renderCup();
  $('#dictBtn').style.display = ''; $('#tutBox').classList.remove('hide');
  ['hMoney','hStreak','hLives'].forEach(id => $('#' + id).style.display = 'none');
  nextLesson();
}
function nextLesson(){
  if(!G || !G.tutorial) return;
  G.step++; clearHints();
  if(G.step >= LESSONS.length) return finishTutorial();
  const L = LESSONS[G.step], person = P(L.who);
  const say = pick(person.lines).replace('{o}', person.english ? englishOf(L.o) : `<b>${nameOf(L.o)}</b>`);
  G.queue = [{ id: ++G.id, person, order: L.o, max: Infinity, left: Infinity, say, mad: null }];
  G.sel = G.id;
  $('#tutStep').textContent = `Lesson ${G.step + 1} of ${LESSONS.length}`;
  $('#tutTitle').textContent = L.t;
  $('#tutTip').textContent = L.tip;
  $('#hintBtn').style.display = L.noHint ? 'none' : '';
  renderQueue();
  updateHUD();
}
function clearHints(){ document.querySelectorAll('.opt.hint').forEach(b => b.classList.remove('hint')); }
function showHints(){
  const L = LESSONS[G.step]; if(!L) return;
  const o = L.o, sel = [`.opt[data-base="${o.base}"]`, `.opt[data-cup="${o.cup}"]`];
  if(o.milk) sel.push(`.opt[data-milk="${o.milk}"]`);
  if(o.sugar) sel.push('#sugarBtn');
  if(o.water) sel.push('.opt[data-water]');
  if(o.ice) sel.push('.opt[data-ice]');
  clearHints();
  sel.forEach(q => { const b = document.querySelector(q); if(b) b.classList.add('hint'); });
  const extra = [];
  if(o.shots === 2) extra.push('tap the drink twice');
  if(o.sugar) extra.push(`Sugar ×${o.sugar}`);
  toast('Cup first, then the glowing ones' + (extra.length ? ': ' + extra.join(', ') : ''));
}
function finishTutorial(){
  G.over = true; G.tutorial = false;
  $('#tutBox').classList.add('hide'); clearHints();
  ['hMoney','hStreak','hLives'].forEach(id => $('#' + id).style.display = '');
  $('#tutDone').classList.remove('hide');
}

/* ---------- start / end ---------- */
function start(){
  $('#startScreen').classList.add('hide');
  $('#endScreen').classList.add('hide');
  G = { t:0, money:0, served:0, wrong:0, streak:0, best:0, walkouts:0, queue:[], sel:null, nextSpawn:0.6, id:0, lvl:0, over:false, sifu: $('#sifu').checked };
  cup = blankCup(); renderCup(); renderQueue(); updateHUD();
  $('#dictBtn').style.display = G.sifu ? 'none' : ''; $('#drawer').classList.remove('open');
  $('#tutBox').classList.add('hide'); $('#tutDone').classList.add('hide'); clearHints();
  last = performance.now();
  requestAnimationFrame(loop);
}
function goHome(){
  if(G){ G.over = true; G.tutorial = false; G.queue = []; }
  ['endScreen','tutDone','tutBox'].forEach(id => $('#' + id).classList.add('hide'));
  ['hMoney','hStreak','hLives','dictBtn'].forEach(id => $('#' + id).style.display = '');
  $('#drawer').classList.remove('open');
  clearHints();
  cup = blankCup(); renderCup();
  $('#queue').innerHTML = '<div class="empty-q">Shop is closed. Open it when you\'re ready.</div>';
  $('#hTime').textContent = `⏱ ${Math.floor(GAME_LEN / 60)}:${String(GAME_LEN % 60).padStart(2, '0')}`;
  $('#startScreen').classList.remove('hide');
}
function end(){
  G.over = true;
  const fired = G.walkouts >= MAX_WALKOUTS;
  const r = [...RANKS].reverse().find(x => G.served >= x[0]);
  $('#endTitle').textContent = fired ? 'You\'re fired! 😱' : 'Shop closed! 🎉';
  $('#endReason').textContent = fired
    ? 'Three customers walked off. The real uncle is back from the toilet and he is NOT happy.'
    : 'You survived the morning rush. ' + r[2];
  $('#endRank').textContent = r[1];
  $('#sServed').textContent = G.served;
  $('#sMoney').textContent = '$' + G.money.toFixed(2);
  $('#sStreak').textContent = G.best;
  $('#sWrong').textContent = G.wrong;
  $('#endScreen').classList.remove('hide');
}

/* ---------- wire up ---------- */
buildControls(); renderCup();
$('#dictStart').innerHTML = dictHTML();
if(matchMedia('(max-width:720px)').matches) $('#dictWrap').open = false; // keep the start screen short on phones
$('#drawer').innerHTML = `<div class="dict">${dictHTML()}</div>`;
$('#startBtn').onclick = start;
$('#tutBtn').onclick = startTutorial;
$('#hintBtn').onclick = showHints;
$('#skipTut').onclick = () => { G.step = LESSONS.length - 1; nextLesson(); };
$('#tutGo').onclick = start;
$('#tutAgain').onclick = startTutorial;
$('#againBtn').onclick = start;
$('#homeBtn').onclick = goHome;
$('#tutHome').onclick = goHome;
$('#serveBtn').onclick = serve;
$('#trashBtn').onclick = () => { cup = blankCup(); renderCup(); sfx.click(); };
$('#dictBtn').onclick = () => $('#drawer').classList.toggle('open');
$('#drawer').onclick = () => $('#drawer').classList.remove('open');
$('#muteBtn').onclick = () => { $('#muteBtn').textContent = toggleMute() ? '🔇' : '🔊'; };
$('#shareBtn').onclick = () => {
  const r = [...RANKS].reverse().find(x => G.served >= x[0]);
  const txt = `☕ I served ${G.served} kopi and made $${G.money.toFixed(2)} in Kopi Order Master. Rank: ${r[1]}. Can you beat me? ${location.href}`;
  (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(
    () => toast('Copied! Go and brag. 😎', 'good'),
    () => prompt('Copy this:', txt));
};
document.addEventListener('keydown', e => {
  if(!G || G.over) { if(e.key === 'Enter' && !$('#startScreen').classList.contains('hide')) start(); return; }
  if(e.key === 'Enter'){ e.preventDefault(); serve(); }
  if(e.key === 'Escape'){ cup = blankCup(); renderCup(); }
});
