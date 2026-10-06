// The drink model: what's in a cup, how to name it (Singlish / English),
// random orders, checking a cup against an order, complaints and prices.
import { pick, cap } from './utils.js';
import { GRIPE } from './content.js';

export const BASES = [['kopi','Coffee','☕'],['teh','Tea','🍵'],['milo','Milo','🍫']];
export const MILKS = [['condensed','Condensed milk','🥫'],['evap','Evaporated milk','🥛']];
export const CUPS = [['normal','Normal cup','☕'],['takeaway','Takeaway cup','🥤']];
export const blankCup = () => ({ base:null, shots:0, milk:null, sugar:0, water:false, ice:false, cup:null });
export const FIELDS = ['base','cup','shots','milk','water','sugar','ice'];
export const isDino = d => d.base === 'milo' && d.shots === 2 && d.ice && !d.water && d.milk === 'condensed' && d.sugar === 2;
export const SUGAR_WORD = { 0:'Kosong', 1:'Siew Dai', 2:'', 3:'Ga Dai' };

export function nameOf(d){
  if(isDino(d)) return 'Milo Dinosaur' + (d.cup === 'takeaway' ? ' Dabao' : '');
  const p = [cap(d.base)];
  if(d.milk === null) p.push('O');
  if(d.milk === 'evap') p.push('C');
  if(d.shots === 2) p.push('Gao');
  if(d.water) p.push('Po');
  if(SUGAR_WORD[d.sugar]) p.push(SUGAR_WORD[d.sugar]);
  if(d.ice) p.push('Peng');
  if(d.cup === 'takeaway') p.push('Dabao');
  return p.join(' ');
}
export function englishOf(d){
  const noun = { kopi:'coffee', teh:'tea', milo:'Milo' }[d.base];
  if(isDino(d)) return 'an iced Milo with a double scoop of Milo, regular sugar' + (d.cup === 'takeaway' ? ', to go' : '');
  let s = (d.shots === 2 ? 'a strong ' : d.water ? 'a weak ' : d.ice ? 'an ' : 'a ') + (d.ice ? 'iced ' : 'hot ') + (d.milk === null && d.base !== 'milo' ? 'black ' : '') + noun;
  const tail = [];
  if(d.milk === 'condensed') tail.push('with condensed milk');
  if(d.milk === 'evap') tail.push('with evaporated milk');
  if(d.milk === null && d.base === 'milo') tail.push('no milk');
  tail.push(['no sugar','less sweet','regular sugar','extra sweet'][d.sugar]);
  if(d.cup === 'takeaway') tail.push('to go');
  return s + ', ' + tail.join(', ');
}
export function randomOrder(lvl, forceDabao){
  const r = Math.random, d = blankCup();
  d.base = r() < 0.18 ? 'milo' : (r() < 0.6 ? 'kopi' : 'teh');
  d.shots = 1;
  if(d.base === 'milo' && lvl >= 2 && r() < 0.45){
    Object.assign(d, { shots:2, milk:'condensed', sugar:2, ice:true });
    d.cup = (forceDabao || r() < 0.3) ? 'takeaway' : 'normal';
    return d;
  }
  d.milk = d.base === 'milo' ? pick(['condensed','condensed',null]) : pick(['condensed','evap',null]);
  d.sugar = lvl >= 1 ? pick([0,1,1,2,3]) : 2;
  if(d.milk === 'condensed' && d.sugar === 0) d.sugar = 1;
  d.ice = lvl >= 1 && r() < (lvl >= 2 ? 0.45 : 0.25);
  if(lvl >= 2 && r() < 0.35){ if(r() < 0.55) d.shots = 2; else d.water = true; }
  d.cup = (forceDabao || (lvl >= 2 && r() < 0.35)) ? 'takeaway' : 'normal';
  return d;
}
export const same = (a,b) => FIELDS.every(f => a[f] === b[f]);
export function gripe(want, got, person, tutorial = false){
  if(!got.cup) return 'No cup?! You want me drink with my hands ah?';
  if(person.english && !tutorial) return pick(['Oh… sorry, this isn\'t quite what I ordered? 😅','Hmm, I don\'t think this is right… 😬','Is this… what I asked for?']);
  if(person.id === 'uncle' && !tutorial && Math.random() < 0.4) return '…… (stares at you in silence)';
  if(want.base !== got.base) return `Eh, I order ${cap(want.base)} leh, this one ${got.base ? cap(got.base) : 'got no drink inside'}!`;
  if(isDino(want) && got.shots !== 2) return 'Dinosaur must got double Milo leh!';
  for(const f of FIELDS.slice(1)) if(want[f] !== got[f]) return GRIPE[f][want[f]];
  return 'Wrong lah!';
}
export function price(d){
  if(isDino(d)) return 3.2 + (d.cup === 'takeaway' ? 0.2 : 0);
  return ({ kopi:1.4, teh:1.5, milo:1.9 })[d.base] + (d.shots === 2 ? 0.3 : 0) + (d.ice ? 0.3 : 0) + (d.cup === 'takeaway' ? 0.2 : 0);
}
