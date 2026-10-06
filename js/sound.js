// Little beeps made with the Web Audio API (no audio files)
let ac, muted = false;
function beep(f, d = 0.12, type = 'sine', v = 0.07, delay = 0){
  if(muted) return;
  try{
    ac = ac || new (window.AudioContext || window.webkitAudioContext)();
    const t = ac.currentTime + delay, o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.value = f;
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g).connect(ac.destination); o.start(t); o.stop(t + d);
  }catch(e){}
}
export const sfx = {
  click: () => beep(520, .05, 'triangle', .04),
  good: () => { beep(880, .1); beep(1320, .18, 'sine', .07, .09); },
  bad: () => beep(140, .3, 'square', .04),
  leave: () => { beep(330, .15, 'sawtooth', .04); beep(220, .25, 'sawtooth', .04, .14); },
};
export function toggleMute(){ muted = !muted; return muted; }
