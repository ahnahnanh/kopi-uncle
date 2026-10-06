// All the words: customers, their lines, complaints, tutorial lessons, ranks, cheat sheet.
// Edit this file to add Singlish without touching game logic.

/* ---------- customers ---------- */
export const PEOPLE = [
  { id:'uncle', face:'👴', name:'Uncle Lim', lines:['Boss, {o}.','{o}. One.','Ah boy, {o} ah.'], pat:1.1 },
  { id:'auntie', face:'👵', name:'Auntie Mei', lines:['{o}, faster hor!','Eh, {o}. Don\'t anyhow make ah.'], pat:0.95 },
  { id:'office', face:'🧑‍💼', name:'Office guy', lines:['{o}, quick quick, got meeting!','{o}. Can PayNow right?'], pat:0.8 },
  { id:'student', face:'🧑‍🎓', name:'Poly student', lines:['Uncle, {o} please.','{o}… exam later, need power.'], pat:1 },
  { id:'nsf', face:'🪖', name:'NSF', lines:['{o}! Book out liao, shiok.','{o}. Sergeant waiting, chop chop.'], pat:0.85 },
  { id:'rider', face:'🛵', name:'Delivery rider', lines:['{o}. Order for Block 123!','{o}, rush ah, rain coming.'], pat:0.75, tapau:true },
  { id:'tourist', face:'📸', name:'Tourist', lines:['Hi! Could I get {o}, please?','Um, hello! {o}? Thank you!'], pat:1.45, english:true, minLvl:1 },
];
export const HAPPY = ['Shiok! 😋','Steady lah! 👍','Power! 💪','Wah, nice! 🤤','Ho seh liao!'];
export const LEAVE = ['Wah lau, so slow!','Forget it lah, go next shop.','Aiyo, I late already!','Walk off liao. 😤'];

/* ---------- complaints when a drink is wrong (keyed by field, then by what they wanted) ---------- */
export const GRIPE = {
  milk:{ condensed:'Where my condensed milk?', evap:'C means evaporated milk lah!', null:'O means NO milk lah!' },
  sugar:{ 0:'Kosong means NO sugar!', 1:'Siew dai = less sweet. Doctor say cut sugar!', 2:'Normal sweet can already, why anyhow?', 3:'Ga dai! I want MORE sweet!' },
  shots:{ 2:'So weak! Gao means double lah!', 1:'Wah so thick! I never say gao.' },
  water:{ true:'So thick! Po means add water lah!', false:'Why so watery? I never say po!' },
  ice:{ true:'Peng means ICE leh!', false:'Who ask for ice? I want hot!' },
  cup:{ normal:'I drink here leh, why give me takeaway cup?', takeaway:'Tapau lah! I bringing go one!' },
};

/* ---------- tutorial lessons ---------- */
export const mk = o => Object.assign({ base:'kopi', shots:1, milk:'condensed', sugar:2, water:false, ice:false, cup:'normal' }, o);
export const P = id => PEOPLE.find(p => p.id === id);
export const LESSONS = [
  { t:'Plain "Kopi"', tip:'Plain Kopi = coffee + condensed milk + normal sweet (2 spoons of sugar) in a normal cup. When nobody says anything else, that\'s the default. Rules of the counter: cup goes out FIRST, and nothing comes back out. Mess up? Pour away.', o:mk({}), who:'uncle' },
  { t:'"Teh" is tea', tip:'Teh = tea. Same defaults as Kopi: condensed milk, 2 spoons, normal cup.', o:mk({ base:'teh' }), who:'auntie' },
  { t:'"O" = no milk', tip:'O means NO milk at all. Just the drink + sugar. Leave the milk buttons alone.', o:mk({ milk:null }), who:'uncle' },
  { t:'"C" = evaporated milk', tip:'C means evaporated milk instead of condensed.', o:mk({ base:'teh', milk:'evap' }), who:'student' },
  { t:'"Siew dai" = less sweet', tip:'Sugar is counted in spoons. Siew dai = 1 spoon. Tap Sugar once per spoon.', o:mk({ sugar:1 }), who:'auntie' },
  { t:'"Kosong" = no sugar', tip:'Kosong = zero sugar. Don\'t touch the Sugar button. (Kopi O Kosong = black coffee, no sugar.)', o:mk({ milk:null, sugar:0 }), who:'office' },
  { t:'"Ga dai" = extra sweet', tip:'Ga dai = 3 spoons. Tap Sugar three times. (Too many? No take-backs: pour away and start again.)', o:mk({ base:'teh', sugar:3 }), who:'nsf' },
  { t:'"Peng" = ice', tip:'Peng means iced. Add Ice.', o:mk({ ice:true }), who:'student' },
  { t:'"Tapau" = takeaway', tip:'Tapau means takeaway. Use the Takeaway cup instead of the normal cup.', o:mk({ base:'teh', milk:'evap', cup:'takeaway' }), who:'rider' },
  { t:'"Gao" = strong', tip:'Gao = double shot. Tap the drink button twice (you\'ll see ×2).', o:mk({ shots:2 }), who:'office' },
  { t:'"Po" = weak', tip:'Po = weaker. Add Water.', o:mk({ base:'teh', water:true }), who:'auntie' },
  { t:'Milo Dinosaur 🦖', tip:'The legend: Milo ×2 (tap twice) + condensed milk + 2 spoons + Ice.', o:mk({ base:'milo', shots:2, ice:true }), who:'nsf' },
  { t:'Final test: the tourist', tip:'Tourists order in English. Translate it yourself. No more spoilers!', o:mk({ milk:null, sugar:1, cup:'takeaway' }), who:'tourist', noHint:true },
];

/* ---------- end-of-shift ranks: [min drinks served, title, blurb] ---------- */
export const RANKS = [
  [0, 'Blur Sotong 🦑', 'You and the kopi sock are not on speaking terms yet.'],
  [4, 'Kopitiam Newbie 🐣', 'The aunties are already gossiping about you. Could be worse.'],
  [8, 'Cookhouse NSF 🪖', 'Steady. You can survive a morning rush, mostly.'],
  [13, 'Kopi Auntie Apprentice 👵', 'The regulars nod at you now. High praise.'],
  [18, 'Kopi Sifu 🏆', 'Uncle Lim smiled. Nobody has seen this since 1987.'],
];

/* ---------- Kopi 101 cheat sheet ---------- */
export function dictHTML(){
  return `<b>Kopi / Teh / Milo</b><span>coffee / tea / Milo, with condensed milk</span>
  <b>O</b><span>no milk at all</span>
  <b>C</b><span>evaporated milk instead</span>
  <b>Kosong</b><span>no sugar</span>
  <b>Siew dai</b><span>less sweet (1 spoon)</span>
  <b><i>(nothing said)</i></b><span>normal sweet (2 spoons)</span>
  <b>Ga dai</b><span>extra sweet (3 spoons)</span>
  <b>Gao</b><span>strong: double shot (tap the drink twice)</span>
  <b>Po</b><span>weak: add water</span>
  <b>Peng</b><span>with ice</span>
  <b>Tapau</b><span>takeaway cup (otherwise a normal cup)</span>
  <b>Milo Dinosaur</b><span>Milo, double shot, condensed milk, normal sweet, ice</span>
  <span class="ex"><b>Kopi O Kosong Peng</b> = coffee, no milk, no sugar, ice, normal cup. Tourists order in English, so you have to translate!</span>`;
}
