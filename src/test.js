const assert = require('assert');
const {compute, rateFor, tariffCode, lppAuto, r05, TAB} = require('./engine.built.js');
const STD = {avs: 0.053, ad: 0.011};
let fails = 0;
const check = (cond, msg) => { if (!cond) { fails++; console.log('FALLITO:', msg); } };

// 2) Codici tabella
check(tariffCode('single', 3, 'res') === 'A0', 'single -> A0');
check(tariffCode('married1', 2, 'res') === 'B2', 'B2');
check(tariffCode('married2', 7, 'res') === 'C4', 'C max 4');
check(tariffCode('parent', 0, 'res') === 'H1', 'H almeno 1');
check(tariffCode('single', 0, 'fr_new') === 'R0', 'R0');
check(tariffCode('married1', 1, 'fr_new') === 'S1', 'S1');
check(tariffCode('married2', 0, 'fr_new') === 'T0', 'T0');
check(tariffCode('parent', 2, 'fr_new') === 'U2', 'U2');
check(tariffCode('married1', 2, 'fr_old') === 'B2', 'vecchi frontalieri: tabelle normali');

// 3) Fasce: confini e frontalieri all'80%
check(rateFor('A0', 3000).rate === TAB.cols.A0[0] / 1000, 'fascia 1-3000');
check(rateFor('A0', 3001).rate === TAB.cols.A0[1] / 1000, 'fascia 3001');
check(rateFor('A0', 250800).out === false && rateFor('A0', 250801).out === true, 'limite tabella');
for (const [b, f] of [['A0', 'R0'], ['B2', 'S2'], ['C1', 'T1'], ['H3', 'U3']])
  for (const inc of [25000, 65000, 98765, 180000])
    check(Math.round(rateFor(f, inc).rate * 1000) === Math.floor(Math.round(rateFor(b, inc).rate * 1000) * 8 / 10), `${f} = 80% di ${b} a ${inc}`);

// 4) Anno pieno, 12 mensilità costanti: ogni mese stessa aliquota, nessun ricalcolo
for (const code of ['A0', 'B2', 'C1', 'H1', 'R0', 'S0', 'T3', 'U4']) {
  const r = compute({...STD, code, annual: 90000, pays: 12, start: 1, lppMode: 'none', ainp: 0.01, bonuses: []});
  const rate = rateFor(code, 90000).rate;
  check(r.months.every(x => x.rate === rate && Math.abs(x.recalc) < 0.06), `${code}: aliquota costante`);
  check(Math.abs(r.tot.tax - r05(rate * 90000)) < 0.06, `${code}: imposta annua = aliquota x lordo`);
}

// 5) Assegni familiari: nel lordo per l'imposta, non nell'AVS
const fam = compute({...STD, code: 'B2', annual: 100000, pays: 12, start: 1, lppMode: 'none', ainp: 0, fam: 430, bonuses: []});
const nofam = compute({...STD, code: 'B2', annual: 100000, pays: 12, start: 1, lppMode: 'none', ainp: 0, fam: 0, bonuses: []});
check(fam.months[0].avs === nofam.months[0].avs, 'assegni senza AVS');
check(Math.abs(fam.months[0].det - r05(r05(100000 / 12) + 430) * 12) < 1e-6, 'assegni nel reddito determinante');
check(fam.months[0].net > nofam.months[0].net, 'assegni aumentano il netto');

// 6) Pensionato che lavora: franchigia 1400, niente AD; minorenne: niente AVS
const ret = compute({...STD, code: 'A0', annual: 60000, pays: 12, start: 1, age: 'retired', lppMode: 'auto', ainp: 0, bonuses: []});
check(ret.months[0].avs === r05((5000 - 1400) * 0.053) && ret.months[0].ad === 0 && ret.months[0].lpp === 0, 'pensionato');
const minor = compute({...STD, code: 'A0', annual: 20000, pays: 12, start: 1, age: 'minor', lppMode: 'auto', ainp: 0.01, bonuses: []});
check(minor.months[0].avs === 0 && minor.months[0].ad === 0 && minor.months[0].lpp === 0 && minor.months[0].ainp > 0, 'minorenne');

// 7) LPP automatica: 80'000 a 30 anni -> (80000-26460) x 9% / 2 / 12
check(lppAuto(80000, 'a25') === r05(53540 * 0.09 / 2 / 12), 'LPP 25-34');
check(lppAuto(150000, 'a55') === r05(64260 * 0.20 / 2 / 12), 'LPP salario massimo');
check(lppAuto(22680, 'a35') === 0 && lppAuto(24000, 'a35') === r05(3780 * 0.12 / 2 / 12), 'LPP soglia e minimo coordinato');

// 8) Bonus non proiettato (regola AFC): reddito determinante = periodico annualizzato + bonus
const nb = compute({...STD, code: 'A0', annual: 78000, pays: 12, start: 1, lppMode: 'none', ainp: 0, bonuses: [{month: 3, amount: 6000}], projectBonus: false});
check(Math.abs(nb.months[2].det - (6500 * 3 * 12 / 3 + 6000)) < 1e-6, 'bonus non annualizzato');
const pb = compute({...STD, code: 'A0', annual: 78000, pays: 12, start: 1, lppMode: 'none', ainp: 0, bonuses: [{month: 3, amount: 6000}], projectBonus: true});
check(Math.abs(pb.months[2].det - (6500 * 3 + 6000) * 4) < 1e-6, 'bonus annualizzato');
check(Math.abs(nb.tot.tax - pb.tot.tax) < 1, 'a fine anno la differenza tra i due metodi si annulla');

// 9) Tredicesima: tutte le modalità pagano lo stesso totale; uscita anticipata
for (const mode of ['dec', 'nov', 'nov_dec', 'jun_dec', 'monthly']) {
  const r = compute({...STD, code: 'A0', annual: 78000, pays: 13, start: 1, mode, lppMode: 'none', ainp: 0, bonuses: []});
  const t = r.months.reduce((s, x) => s + x.t13, 0);
  check(Math.abs(t - 6000) < 0.6, `13a ${mode}: totale ${t}`);
}
const early = compute({...STD, code: 'A0', annual: 78000, pays: 13, start: 1, end: 6, mode: 'nov_dec', lppMode: 'none', ainp: 0, bonuses: []});
check(early.months[5].t13 === 3000 && early.months.slice(6).every(x => x === null), 'uscita a giugno: 13a pro rata pagata a giugno');

// 10) Aumento da luglio: 13a matura sui due salari
const up = compute({...STD, code: 'A0', annual: 78000, pays: 13, start: 1, mode: 'dec', raise: {month: 7, annual: 91000}, lppMode: 'none', ainp: 0, bonuses: []});
check(up.months[0].base === 6000 && up.months[6].base === 7000, 'aumento');
check(up.months[11].t13 === r05((6 * 6000 + 6 * 7000) / 12), '13a con aumento');
{ const after = up.months.slice(6, 11).map(x => x.net); check(up.typical >= Math.min(...after) && up.typical <= Math.max(...after), 'netto tipico dopo aumento'); }

// 11) Altre voci: salario in natura tassato ma non pagato, rimborsi spese nel netto
const ov = compute({...STD, code: 'A0', annual: 72000, pays: 12, start: 1, lppMode: 'none', ainp: 0, bik: 500, exp: 300, other: 100, bonuses: []});
const x0 = ov.months[0];
check(x0.gross === 6500 && x0.salary === 6000 && x0.avs === r05(6500 * 0.053), 'natura nel lordo AVS');
check(Math.abs(x0.net - (6000 + 300 - x0.social - x0.tax - 100)) < 0.001, 'netto con rimborsi e trattenute');

console.log(fails ? `${fails} test falliti` : 'TUTTI I TEST OK');
process.exit(fails ? 1 : 0);
