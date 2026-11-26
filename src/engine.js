// Netto Ticino: motore di calcolo. Modello annuale ticinese, tabelle dell'imposta alla fonte 2026.
// Le aliquote sono in decimi di punto percentuale (73 = 7.3%), una colonna per tabella (A0, B0..B4, C0..C4, H1..H4,
// R0, S0..S4, T0..T4, U1..U4), 414 fasce: 1-3000, poi fasce da 600 franchi fino a 250'800.
const TAB = {year: 2026, first: 3000, step: 600, max: 250800, cols: __TABLES__};
const r05 = x => Math.round((x + (x >= 0 ? 1e-9 : -1e-9)) * 20) / 20;

function rateFor(code, inc) {
  const col = TAB.cols[code];
  if (!col) throw new Error('Tabella sconosciuta: ' + code);
  const x = Math.floor(inc);
  if (x <= 0) return {rate: 0, out: false};
  if (x <= TAB.first) return {rate: col[0] / 1000, out: false};
  const k = Math.ceil((x - TAB.first) / TAB.step);
  if (k >= col.length) return {rate: col[col.length - 1] / 1000, out: true};
  return {rate: col[k] / 1000, out: false};
}

// Tabella: A persona sola, B sposati con un reddito, C sposati con due redditi, H famiglia monoparentale.
// Nuovi frontalieri (dal 17.7.2023): R, S, T, U, cioè l'80% delle tabelle A, B, C, H.
const FRONT = {A: 'R', B: 'S', C: 'T', H: 'U'};
function tariffCode(status, kids, residence) {
  let L, n = Math.max(0, Math.min(4, kids | 0));
  if (status === 'married1') L = 'B';
  else if (status === 'married2') L = 'C';
  else if (status === 'parent') { L = 'H'; n = Math.max(1, n); }
  else { L = 'A'; n = 0; }
  if (residence === 'fr_new') L = FRONT[L];
  return L + n;
}

const CAP = 148200;         // salario massimo assicurato AD e LAINF 2026
const AVS_FREE = 1400;      // franchigia mensile AVS per chi lavora dopo l'età di riferimento
const BVG = {entry: 22680, coord: 26460, max: 90720, minCoord: 3780, risk: 0.02};
const BVG_CREDIT = {a18: 0, a25: 0.07, a35: 0.10, a45: 0.15, a55: 0.18};

// Stima del minimo LPP a carico del dipendente: metà di accrediti di vecchiaia + rischio e costi (2%).
function lppAuto(yearSalary, age) {
  if (!(age in BVG_CREDIT) || yearSalary <= BVG.entry) return 0;
  const coord = Math.max(BVG.minCoord, Math.min(yearSalary, BVG.max) - BVG.coord);
  return r05(coord * (BVG_CREDIT[age] + BVG.risk) / 2 / 12);
}

function compute(p) {
  const code = p.code || 'A0';
  const start = p.start || 1, end = Math.max(start, p.end || 12);
  const age = p.age || 'a25';
  const lppMode = p.lppMode || (p.lpp ? 'manual' : 'none');
  const annualAt = m => (p.raise && p.raise.month && p.raise.annual > 0 && m >= p.raise.month) ? p.raise.annual : p.annual;
  const baseOf = m => r05(annualAt(m) / p.pays);
  const fixed = r05(p.fixed || 0), bik = r05(p.bik || 0), fam = r05(p.fam || 0), exp = r05(p.exp || 0), other = r05(p.other || 0);
  const lppOf = m => lppMode === 'manual' ? r05(p.lpp || 0) : lppMode === 'auto' ? lppAuto(annualAt(m) + fixed * 12, age) : 0;

  // Tredicesima: matura 1/12 del salario base di ogni mese lavorato.
  const t13 = Array(13).fill(0);
  if (p.pays === 13) {
    const worked = [];
    for (let m = start; m <= end; m++) worked.push(m);
    const acc = ms => ms.reduce((s, m) => s + baseOf(m), 0) / 12;
    const total = r05(acc(worked));
    const mode = p.mode || 'dec';
    if (mode === 'monthly') worked.forEach(m => { t13[m] = r05(baseOf(m) / 12); });
    else if (mode === 'nov') t13[end >= 11 ? Math.max(11, start) : end] = total;
    else if (mode === 'nov_dec') {
      if (end <= 11 || start === 12) t13[end] = total;
      else { const nov = r05(acc(worked.filter(m => m <= 11))); t13[11] = nov; t13[12] = r05(total - nov); }
    } else if (mode === 'jun_dec') {
      if (start <= 6 && end > 6) { const half = r05(total / 2); t13[6] = half; t13[end] = r05(total - half); }
      else t13[end] = total;
    } else t13[end] = total;
  }

  const months = [];
  let n = 0, ytd = 0, ytdBonus = 0, ifPaid = 0, capBase = 0, out = false;
  for (let m = 1; m <= 12; m++) {
    if (m < start || m > end) { months.push(null); continue; }
    n++;
    const base = baseOf(m);
    const bonus = r05((p.bonuses || []).filter(b => b.month === m).reduce((s, b) => s + b.amount, 0));
    const salary = r05(base + t13[m] + bonus + fixed);      // salario in contanti
    const gross = r05(salary + bik);                         // lordo AVS (comprende il salario in natura)
    const capped = Math.max(0, Math.min(gross, CAP * n / 12 - capBase));
    capBase += capped;
    let avs = 0, ad = 0;
    if (age === 'retired') avs = r05(Math.max(0, gross - AVS_FREE) * p.avs);
    else if (age !== 'minor') { avs = r05(gross * p.avs); ad = r05(capped * p.ad); }
    const ainp = r05(capped * (p.ainp || 0)), igm = r05(capped * (p.igm || 0));
    const lpp = lppOf(m);
    const taxable = r05(gross + fam);                        // gli assegni familiari pagano l'imposta, non l'AVS
    ytd += taxable; ytdBonus += bonus;
    const det = p.projectBonus ? ytd * 12 / n : (ytd - ytdBonus) * 12 / n + ytdBonus;
    const rf = rateFor(code, det); out = out || rf.out;
    const tax = r05(r05(rf.rate * ytd) - ifPaid);
    ifPaid = r05(ifPaid + tax);
    const recalc = r05(tax - r05(rf.rate * taxable));
    const social = r05(avs + ad + ainp + igm);
    const net = r05(salary + fam + exp - social - lpp - tax - other);
    months.push({m, base, t13: t13[m], bonus, fixed, bik, fam, exp, other, salary, gross, taxable,
      avs, ad, ainp, igm, social, lpp, tax, rate: rf.rate, det, recalc, net, cash: r05(salary + fam + exp)});
  }

  const live = months.filter(Boolean);
  const sum = k => r05(live.reduce((s, x) => s + x[k], 0));
  const mode = p.mode || 'dec';
  let regular = live.filter(x => !x.bonus && (mode === 'monthly' || p.pays !== 13 || !x.t13));
  if (p.raise && p.raise.month && p.raise.annual > 0) {
    const after = regular.filter(x => x.m >= p.raise.month);
    if (after.length) regular = after;
  }
  const pool = regular.length ? regular : live;
  const nets = pool.map(x => x.net).sort((a, b) => a - b);
  const mid = nets.length >> 1;
  const typical = nets.length % 2 ? nets[mid] : r05((nets[mid - 1] + nets[mid]) / 2);
  const typicalGross = pool.length ? pool[pool.length - 1].gross : 0;
  const last = live[live.length - 1];
  return {code, months, typical, typicalGross, out, lppMonthly: lppOf(end),
    tot: {gross: sum('gross'), taxable: sum('taxable'), fam: sum('fam'), social: sum('social'), lpp: sum('lpp'), tax: sum('tax'),
      exp: sum('exp'), other: sum('other'), bik: sum('bik'), net: sum('net'), cash: sum('cash')},
    finalRate: last ? last.rate : 0, finalDet: last ? last.det : 0};
}
if (typeof module !== 'undefined') module.exports = {compute, rateFor, tariffCode, lppAuto, r05, TAB};
