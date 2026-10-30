/* Number and date formatting, pt-BR. Pure functions, no React. */

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const brlPequeno = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  maximumFractionDigits: 6,
});

/** R$ 1.234,56 */
export const reais = (n) => brl.format(n);

/** Prices under one cent (some fund quotas, leftovers) keep up to six decimals. */
export const preco = (n) => (n > 0 && n < 0.01 ? brlPequeno : brl).format(n);

/** 12,34% from a ratio (0.1234). */
export const pct = (n) =>
  `${(n * 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;

/** +12,34% / −12,34% / 0,00% */
export const pctSinal = (n) => (n > 0 ? '+' : n < 0 ? '−' : '') + pct(Math.abs(n));

/** +R$ 10,00 / −R$ 10,00 / R$ 0,00 */
export const reaisSinal = (n) => (n > 0 ? '+' : n < 0 ? '−' : '') + reais(Math.abs(n));

/** Whole quantities with pt-BR thousands separators. */
export const inteiro = (n) => n.toLocaleString('pt-BR');

/** What the price field shows as a placeholder: the average price, at its own precision. */
export const precoCurto = (n) =>
  n < 0.01
    ? n.toLocaleString('pt-BR', { maximumFractionDigits: 6 })
    : n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Reads what the user typed: "1.234,56", "1234.56", "R$ 12,3" or "" (null). */
export const lerNumero = (s) => {
  if (s == null) return null;
  let t = String(s).trim().replace(/R\$\s?/, '');
  if (!t) return null;
  if (t.includes(',')) t = t.replace(/\./g, '').replace(',', '.');
  const n = parseFloat(t);
  return Number.isFinite(n) ? n : null;
};

/** 'AAAA-MM-DD' to 'DD/MM/AAAA'. */
export const dataBR = (iso) => iso.split('-').reverse().join('/');
