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
      if(!cup.cup){ cup.cup = d.cup; sfx.click(); renderCup(); popIn($('#cup')); }
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
    bumpCup();
  };
}
// Unstirred kopi: the drink sits on top, the milk settles at the bottom of the cup.
const COLORS = { kopi:'#3b2314', teh:'#9a4a1c', milo:'#5b3a25' };
const MILK = { condensed:'#f1e1bf', evap:'#faf3e3' };
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const anim = (el, frames, opts) => (el && !reduced.matches && el.animate) ? el.animate(frames, opts) : null;
function bumpCup(){ anim($('#cup'), [{ scale: 1 }, { scale: 1.07 }, { scale: 1 }], { duration: 220, easing: 'ease-out' }); }
function popIn(el){ anim(el, [{ opacity: 0, scale: .85 }, { opacity: 1, scale: 1 }], { duration: 220, easing: 'ease-out' }); }
function renderCup(){
  for(const k of ['base','milk','cup']) document.querySelectorAll(`.opt[data-${k}]`).forEach(b => b.classList.toggle('on', cup[k] === b.dataset[k]));
  document.querySelector('.opt[data-ice]').classList.toggle('on', cup.ice);
  document.querySelector('.opt[data-water]').classList.toggle('on', cup.water);
  document.querySelectorAll('.opt[data-base] .shots').forEach(x => x.textContent = (x.parentNode.dataset.base === cup.base && cup.shots === 2) ? ' ×2' : '');
  $('#sugarBtn').classList.toggle('on', cup.sugar > 0);
  $('#spoons').textContent = cup.sugar ? ' ×' + cup.sugar : '';

  const el = $('#cup'), liq = $('#liquid'), milk = $('#milklayer');
  el.className = 'cup' + (cup.cup === 'takeaway' ? ' bag' : cup.cup === 'normal' ? '' : ' nocup');
  $('#saucer').classList.toggle('on', cup.cup === 'normal');
  // how full: milk alone ~25%, one shot ~68%, double ~76%, water tops it up
  let fill = 0;
  if(cup.base) fill = (cup.shots === 2 ? 76 : 68) + (cup.water ? 10 : 0);
  else if(cup.milk) fill = 24;
  else if(cup.water) fill = 30;
  liq.style.height = fill + '%';
  liq.style.backgroundColor = cup.base ? COLORS[cup.base] : cup.water ? '#d8ecf3' : 'transparent';
  liq.style.filter = cup.shots === 2 ? 'brightness(.8)' : (cup.water && cup.base) ? 'brightness(1.3) saturate(.75)' : '';
  milk.style.height = cup.milk ? (cup.base ? '22%' : '24%') : '0';
  milk.style.backgroundColor = cup.milk ? MILK[cup.milk] : 'transparent';
  $('#ice').classList.toggle('on', cup.ice);
  $('#steam').classList.toggle('on', !!cup.base && !cup.ice);
  const sug = $('#sugars');
  while(sug.children.length < cup.sugar) sug.appendChild(document.createElement('i'));
  while(sug.children.length > cup.sugar) sug.lastChild.remove();

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
// Send the current cup off with an animation (a copy flies away while the real cup resets underneath).
function sendCup(kind, amount){
  const stage = $('#cupstage'), tray = stage.querySelector('.tray');
  const ghost = tray.cloneNode(true);
  ghost.querySelectorAll('[id]').forEach(n => n.removeAttribute('id'));
  ghost.classList.add('ghostcup');
  // offsetLeft/Top are pre-transform layout coords, so the copy lines up even when the tray is scaled down on phones
  Object.assign(ghost.style, { left: tray.offsetLeft + 'px', top: tray.offsetTop + 'px', width: tray.offsetWidth + 'px', height: tray.offsetHeight + 'px' });
  stage.appendChild(ghost);
  const frames = {
    serve: [{ translate: '0 0', opacity: 1 }, { translate: '0 -80px', opacity: 0 }],
    pour:  [{ rotate: '0deg', opacity: 1 }, { rotate: '-40deg', opacity: 1, offset: .5 }, { rotate: '-70deg', translate: '-30px 10px', opacity: 0 }],
    wrong: [{ translate: '0 0' }, { translate: '-8px 0' }, { translate: '8px 0' }, { translate: '-5px 0' }, { translate: '0 20px', opacity: 0 }],
  }[kind];
  const a = anim(ghost, frames, { duration: kind === 'serve' ? 380 : 480, easing: 'ease-in' });
  if(a) a.finished.then(() => ghost.remove(), () => ghost.remove()); else ghost.remove();
  if(kind === 'wrong') anim(ghost, [{ filter: 'drop-shadow(0 0 0 #d64131)' }, { filter: 'drop-shadow(0 0 10px #d64131)' }], { duration: 300 });
  if(amount){
    const coin = document.createElement('div');
    coin.className = 'coinpop'; coin.textContent = `🪙 +$${amount.toFixed(2)}`;
    stage.appendChild(coin);
    const c = anim(coin, [{ opacity: 0, translate: '-50% 10px', scale: .7 }, { opacity: 1, translate: '-50% -10px', scale: 1.05, offset: .25 }, { opacity: 0, translate: '-50% -60px', scale: 1 }], { duration: 1100, easing: 'ease-out' });
    if(c) c.finished.then(() => coin.remove(), () => coin.remove()); else setTimeout(() => coin.remove(), 900);
  }
}
function banner(msg){
  const b = $('#banner');
  b.textContent = msg; b.classList.remove('show'); void b.offsetWidth; b.classList.add('show');
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
function custEl(c){
  const b = document.createElement('button');
  b.className = 'cust';
  b.dataset.id = c.id;
  b.innerHTML = `<div class="bubble"></div><div class="who"><span class="face"></span><span class="nm"></span></div><div class="pbar"><i></i></div>`;
  b.querySelector('.nm').textContent = c.person.name;
  b.onclick = () => { if(!G.queue.includes(c)) return; G.sel = c.id; sfx.click(); renderQueue(); };
  c.bar = b.querySelector('.pbar i');
  return b;
}
function renderQueue(){
  const q = $('#queue');
  let empty = q.querySelector('.empty-q');
  if(!G || !G.queue.length){
    if(!empty){ empty = document.createElement('div'); empty.className = 'empty-q'; q.appendChild(empty); }
    empty.textContent = G && !G.over ? 'No customers right now. Catch your breath…' : 'Shop is closed. Open it when you\'re ready.';
  } else if(empty) empty.remove();
  if(!G) return;
  for(const c of G.queue){
    if(!c.el){ c.el = custEl(c); q.appendChild(c.el); }
    const el = c.el;
    el.classList.toggle('sel', c.id === G.sel);
    el.classList.toggle('tutc', !isFinite(c.max));
    const face = c.mad ? (c.person.english ? '😬' : '😑') : c.person.face;
    const fe = el.querySelector('.face'); if(fe.textContent !== face) fe.textContent = face;
    const html = c.mad || c.say, bub = el.querySelector('.bubble');
    if(bub.dataset.html !== html){ bub.innerHTML = html; bub.dataset.html = html; }
    bub.classList.toggle('mad', !!c.mad);
  }
  updateBars();
}
// Animate a customer card out, then remove it.
function leave(c, how){
  const el = c.el; if(!el) return;
  c.el = null;
  el.classList.remove('sel', 'urgent');
  el.classList.add(how === 'mad' ? 'leave-mad' : 'leave-happy');
  setTimeout(() => el.remove(), reduced.matches ? 150 : 550);
}
function clearQueueDom(){ $('#queue').querySelectorAll('.cust').forEach(e => e.remove()); }
function updateBars(){
  for(const c of G.queue){
    if(!c.bar) continue;
    const f = isFinite(c.max) ? Math.max(0, c.left / c.max) : 1;
    c.bar.style.width = (f * 100) + '%';
    c.bar.style.backgroundColor = f > .5 ? 'var(--ok)' : f > .25 ? 'var(--warn)' : 'var(--bad)';
    if(c.el) c.el.classList.toggle('urgent', f <= .25);
  }
}
function removeCust(c, how = 'happy'){
  G.queue = G.queue.filter(x => x !== c);
  leave(c, how);
  if(G.sel === c.id) G.sel = G.queue[0] ? G.queue[0].id : null;
  if(!G.tutorial && !G.queue.length) G.nextSpawn = Math.max(G.nextSpawn, 1.5); // tiny breather
  renderQueue();
}

/* ---------- serve ---------- */
function serve(){
  if(!G || G.over) return;
  if(!cup.base && !cup.milk){ toast('Serve air ah? 🤨', 'bad'); sfx.bad(); return; }
  const c = G.queue.find(x => x.id === G.sel);
  if(!c){ toast('Nobody waiting leh. Drink it yourself lor. ☕'); sendCup('pour'); cup = blankCup(); renderCup(); return; }
  if(same(c.order, cup) && G.tutorial){
    sfx.good(); toast(pick(HAPPY), 'good'); sendCup('serve');
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
    sfx.good(); sendCup('serve', amt);
    toast(`${pick(HAPPY)} +$${amt.toFixed(2)}${G.streak >= 3 ? ` · 🔥${G.streak} streak` : ''}`, 'good');
    removeCust(c);
  } else {
    G.wrong++; G.streak = 0;
    c.mad = gripe(c.order, cup, c.person, G.tutorial);
    c.left = Math.max(1, c.left - 4);
    sfx.bad(); sendCup('wrong');
    renderQueue();
    const el = c.el;
    if(el){ el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); }
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
  if(lvl !== G.lvl){ G.lvl = lvl; if(stage.msg) banner(stage.msg); }
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
      const h = $('#hLives'); h.classList.remove('hurt'); void h.offsetWidth; h.classList.add('hurt');
      removeCust(c, 'mad');
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
  if(G.shown === undefined) G.shown = G.money;
  if(G.shown < G.money){
    G.shown = Math.min(G.money, G.shown + Math.max(0.03, (G.money - G.shown) * 0.12));
    if(G.money - G.shown < 0.005) G.shown = G.money;
    const m = $('#hMoney'); if(!m.classList.contains('bump')){ m.classList.add('bump'); setTimeout(() => m.classList.remove('bump'), 350); }
  } else G.shown = G.money;
  $('#hMoney').textContent = `💰 $${G.shown.toFixed(2)}`;
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
  clearQueueDom();
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
  G.queue.forEach(x => leave(x));
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
  clearQueueDom();
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
  clearQueueDom(); renderQueue();
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
function pourAway(){ if(cup.cup) sendCup('pour'); cup = blankCup(); renderCup(); sfx.click(); }
$('#trashBtn').onclick = pourAway;
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
  if(e.key === 'Escape') pourAway();
});
