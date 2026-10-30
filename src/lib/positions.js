/* The portfolio math. Pure functions over the extrato rows, the added notas and
   the per-asset overrides the user typed. No React, no storage.

   An extrato row (src/data/negociacao.json) is one asset at one broker:
     c   ticker as traded ("ABEV3", "ABEV3F" for the fractional lot)
     d1  first trade date, d2 last trade date (DD/MM/AAAA)
     i   broker ("XP", "Clear")
     b   quantity bought, s quantity sold, n = b − s
     pb  average buy price, ps average sell price
     nm  asset name
   A nota row has the same shape (see linhasDasNotas). */

import { dataBR, lerNumero } from './format.js';

/** Trading end date of the B3 extrato the data was built from. */
export const EXTRATO_FIM = '2026-10-28';
export const EXTRATO_INICIO = '2019-11-01';

/** Asset class from the ticker. Renda fixa only appears through overrides, never in the extrato. */
export const classeDoAtivo = (t) =>
  /^(LCA|CDB)/.test(t) ? 'Renda fixa' : /3[2-5]$/.test(t) ? 'BDR' : /11$/.test(t) ? 'Fundos' : 'Ações';

/** Classes that get a filter and a slice of the allocation bar. */
export const CLASSES = ['Ações', 'Fundos', 'BDR'];

export const COR_DA_CLASSE = {
  Ações: 'var(--color-accent-800)',
  Fundos: 'var(--color-accent-500)',
  BDR: 'var(--color-accent-300)',
  'Renda fixa': 'var(--color-neutral-500)',
};

/** Fees of a nota are split across its trades in proportion to value; buys get
    more expensive, sells bring in less. 0 when the user unticked the option. */
export const precoEfetivo = (nota, t) => {
  const soma = nota.trades.reduce((a, x) => a + x.v, 0) || 1;
  const custo = nota.withFees ? (nota.fees * t.v) / soma : 0;
  return t.q ? (t.cv === 'C' ? t.v + custo : t.v - custo) / t.q : 0;
};

/** Each trade of each added nota as an extrato-shaped row. */
export const linhasDasNotas = (notas) =>
  notas.flatMap((n) =>
    n.trades.map((t) => {
      const pe = precoEfetivo(n, t);
      const compra = t.cv === 'C';
      return {
        c: t.tk,
        d1: dataBR(n.data),
        d2: dataBR(n.data),
        i: `Nota ${n.nota}`,
        b: compra ? t.q : 0,
        s: compra ? 0 : t.q,
        n: compra ? t.q : -t.q,
        pb: compra ? pe : 0,
        ps: compra ? 0 : pe,
        nm: t.spec,
      };
    }),
  );

/** One position per ticker, standard and fractional lots merged.

    overrides[ticker] = { price?: string, qty?: string, hidden?: boolean } as typed. */
export const posicoes = (linhas, overrides = {}) => {
  const porTicker = {};
  for (const r of linhas) {
    const t = r.c.replace(/F$/, '');
    const p = porTicker[t] || (porTicker[t] = { t, n: r.nm, q: 0, b: 0, s: 0, bv: 0, sv: 0, ops: [] });
    p.q += r.n;
    p.b += r.b;
    p.s += r.s;
    p.bv += r.b * r.pb;
    p.sv += r.s * r.ps;
    p.ops.push(r);
  }
  return Object.values(porTicker).map((p) => {
    const o = overrides[p.t] || {};
    const pm = p.b ? p.bv / p.b : 0;
    const realizado = p.s && p.b ? p.sv - p.s * pm : 0;
    const qtyDigitada = lerNumero(o.qty);
    const qty = qtyDigitada != null ? qtyDigitada : p.q;
    const price = lerNumero(o.price);
    const cost = pm * qty;
    const saldo = price != null ? price * qty : cost;
    const hidden = !!o.hidden || qty <= 0;
    return {
      ...p,
      o,
      pm,
      qty,
      price,
      cost,
      saldo,
      hidden,
      realizado,
      cls: classeDoAtivo(p.t),
      rent: price != null && pm ? price / pm - 1 : null,
    };
  });
};

/** The totals the summary cards and the allocation bar read. */
export const resumo = (todas) => {
  const ativas = todas.filter((p) => !p.hidden);
  const total = ativas.reduce((a, p) => a + p.saldo, 0);
  const comPreco = ativas.filter((p) => p.price != null);
  const saldoComPreco = comPreco.reduce((a, p) => a + p.saldo, 0);
  const custoComPreco = comPreco.reduce((a, p) => a + p.cost, 0);
  const compras = todas.reduce((a, p) => a + p.bv, 0);
  const vendas = todas.reduce((a, p) => a + p.sv, 0);
  const porClasse = CLASSES.map((c) => ({
    nome: c,
    valor: ativas.filter((p) => p.cls === c).reduce((a, p) => a + p.saldo, 0),
  })).filter((x) => x.valor > 0);
  return {
    total,
    ativas: ativas.length,
    zeradas: todas.length - ativas.length,
    comPreco: comPreco.length,
    saldoComPreco,
    custoComPreco,
    rent: custoComPreco ? saldoComPreco / custoComPreco - 1 : null,
    rentReais: saldoComPreco - custoComPreco,
    compras,
    vendas,
    investido: compras - vendas,
    realizado: todas.reduce((a, p) => a + p.realizado, 0),
    porClasse,
  };
};

/** Sort value per column; zeroed assets sink to the bottom of the money columns. */
const VALOR_DA_COLUNA = {
  nome: (p) => p.t,
  saldo: (p) => (p.hidden ? -1 : p.saldo),
  alloc: (p) => (p.hidden ? -1 : p.saldo),
  rent: (p) => p.rent ?? -Infinity,
  pm: (p) => p.pm,
};

/** The rows of the table: filtered by class and search, then sorted. */
export const filtrarOrdenar = (todas, { mostrarZerados, classe, busca, coluna, direcao }) => {
  const q = busca.trim().toUpperCase();
  const lista = todas.filter(
    (p) =>
      (mostrarZerados || !p.hidden) &&
      (classe === 'Todos' || p.cls === classe) &&
      (!q || p.t.includes(q) || p.n.toUpperCase().includes(q)),
  );
  const valor = VALOR_DA_COLUNA[coluna];
  lista.sort((a, b) => {
    const x = valor(a);
    const y = valor(b);
    return (x < y ? -1 : x > y ? 1 : 0) * direcao;
  });
  return lista;
};

/** Default direction when a column is first clicked: names ascending, numbers descending. */
export const direcaoInicial = (coluna) => (coluna === 'nome' ? 1 : -1);
