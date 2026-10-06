// Tiny helpers shared by every module
export const $ = s => document.querySelector(s);
export const pick = a => a[Math.floor(Math.random() * a.length)];
export const cap = s => s[0].toUpperCase() + s.slice(1);
