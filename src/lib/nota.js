/* Reading a nota de negociação (brokerage note) PDF.

   Two steps, kept apart so the parser can be tested on plain text:
     textoDoPdf(pdfjs, bytes)  — pdf.js text items laid out as lines
     lerNota(texto, nome)      — the trades, fees, number and date of a nota

   Tested against the XP format (B3 standard "1-BOVESPA C VISTA ..." lines).
   Clear uses the same B3 layout. */

import { lerNumero } from './format.js';

/** All pages of a PDF as text, one line per visual row, items in x order.
    `pdfjs` is the pdfjs-dist module (browser build or node legacy build). */
export async function textoDoPdf(pdfjs, bytes) {
  const doc = await pdfjs.getDocument({ data: bytes }).promise;
  const paginas = [];
  try {
    for (let n = 1; n <= doc.numPages; n++) {
      const pagina = await doc.getPage(n);
      const { items } = await pagina.getTextContent();
      paginas.push(linhasDoConteudo(items));
    }
  } finally {
    await doc.destroy();
  }
  return paginas.join('\n');
}

/** Groups text items that share a baseline (within 2pt) into one line. */
export function linhasDoConteudo(items) {
  const itens = items
    .filter((it) => typeof it.str === 'string' && it.str.trim())
    .map((it) => ({ x: it.transform[4], y: it.transform[5], s: it.str }))
    .sort((a, b) => b.y - a.y || a.x - b.x);
  const linhas = [];
  for (const it of itens) {
    const ultima = linhas[linhas.length - 1];
    if (ultima && Math.abs(ultima.y - it.y) < 2) ultima.itens.push(it);
    else linhas.push({ y: it.y, itens: [it] });
  }
  return linhas
    .map((l) =>
      l.itens
        .sort((a, b) => a.x - b.x)
        .map((i) => i.s)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim(),
    )
    .join('\n');
}

const RE_NEGOCIO =
  /\d-BOVESPA\s+([CV])\s+(VISTA|FRACIONARIO|FRACIONÁRIO)\s+(?:\d{2}\/\d{2}\s+)?(.+?)\s+(\d[\d.]*)\s+(\d[\d.]*,\d+)\s+(\d[\d.]*,\d{2})\s+([DC])/g;

/** The nota's number and trading date, whichever way the PDF lays the header out:
    labels and values on one line ("Data pregão 26/10/2026 Nº Nota 147253623")
    or labels on one line and values on the next. */
function cabecalho(texto) {
  let nota = (texto.match(/N[ºo°]\s*Nota\s+(\d{5,})/) || [])[1] || '';
  let dm = texto.match(/Data preg[ãa]o\s+(\d{2})\/(\d{2})\/(\d{4})/);
  const linhas = texto.split('\n');
  for (let i = 0; i < linhas.length && (!nota || !dm); i++) {
    if (!/Data preg[ãa]o/.test(linhas[i]) || !/N[ºo°]\s*Nota/.test(linhas[i])) continue;
    const prox = linhas[i + 1] || '';
    const m = prox.match(/(\d{2})\/(\d{2})\/(\d{4})\s+(\d{5,})/);
    if (m) {
      dm = dm || m;
      nota = nota || m[4];
    }
  }
  return { nota, data: dm ? `${dm[3]}-${dm[2]}-${dm[1]}` : '' };
}

/** Net amount of the nota and whether it is a debit (D) or credit (C). */
function liquido(texto) {
  const depois = texto.match(/L[íi]quido para\s+\d{2}\/\d{2}\/\d{4}\s+(\d[\d.]*,\d{2})\s+([DC])/);
  const antes = texto.match(/(\d[\d.]*,\d{2})\s+L[íi]quido para\s+\d{2}\/\d{2}\/\d{4}\s+([DC])/);
  const m = depois || antes;
  return m ? { valor: lerNumero(m[1]), dc: m[2] } : null;
}

/** Parses the text of one nota. Returns null-safe fields; trades may be empty. */
export function lerNota(texto, nomeArquivo = '') {
  const t = texto.replace(/[ \t]+/g, ' ');
  const { nota, data } = cabecalho(t);
  const trades = [];
  let m;
  RE_NEGOCIO.lastIndex = 0;
  while ((m = RE_NEGOCIO.exec(t))) {
    // The spec ends with the Obs. flags ("@", "#", "#2", "D", ...) that are not part of
    // the name. Type words such as "ON NM", "PN N2" or "CI" are two letters and stay.
    const spec = m[3].replace(/(\s+(?:[@#][@#2DFBTACPHXYLI8]*|[2DFBTACPHXYLI8]))+$/, '').trim();
    const tk = (spec.match(/\b([A-Z]{4}\d{1,2})F?\b/) || [])[1];
    if (!tk) continue;
    trades.push({
      cv: m[1],
      tk,
      spec,
      q: lerNumero(m[4].replace(/\./g, '')),
      p: lerNumero(m[5]),
      v: lerNumero(m[6]),
    });
  }
  const compras = trades.filter((x) => x.cv === 'C').reduce((a, x) => a + x.v, 0);
  const vendas = trades.filter((x) => x.cv === 'V').reduce((a, x) => a + x.v, 0);
  const liq = liquido(t);
  let fees = 0;
  if (liq) fees = Math.max(0, liq.dc === 'D' ? liq.valor - (compras - vendas) : vendas - compras - liq.valor);
  return {
    nota,
    data,
    trades,
    fees: Math.round(fees * 100) / 100,
    withFees: true,
    file: nomeArquivo,
  };
}
