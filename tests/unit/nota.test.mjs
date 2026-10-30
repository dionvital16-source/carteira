import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import { lerNota, textoDoPdf } from '../../src/lib/nota.js';

const perto = (a, b, msg) => assert.ok(Math.abs(a - b) < 0.005, `${msg}: ${a} ≠ ${b}`);
const NOTA_XP = new URL('../../design/project/uploads/4495937_2026-10-26_2026-10-26.pdf', import.meta.url);

test('nota da XP (pregão 26/10/2026): número, data, negócios e custos', async () => {
  const texto = await textoDoPdf(pdfjs, new Uint8Array(readFileSync(NOTA_XP)));
  const n = lerNota(texto, 'nota.pdf');
  assert.equal(n.nota, '147253623');
  assert.equal(n.data, '2026-10-26');
  assert.equal(n.file, 'nota.pdf');
  assert.equal(n.trades.length, 2);
  assert.deepEqual(n.trades[0], { cv: 'C', tk: 'ECOR3', spec: 'ECORODOVIAS ECOR3 ON NM', q: 200, p: 5.22, v: 1044 });
  assert.deepEqual(n.trades[1], { cv: 'C', tk: 'XPIE11', spec: 'FIP XP INFRA XPIE11 CI', q: 1, p: 43.08, v: 43.08 });
  // Líquido 1.093,11 D against 1.087,08 of purchases: taxa de liquidação, emolumentos,
  // transferência, corretagem, ISS and "outras" add up to 6,03.
  perto(n.fees, 6.03, 'custos');
  assert.equal(n.withFees, true);
});

test('cabeçalho com rótulos e valores na mesma linha', () => {
  const texto = [
    'Data pregão 26/10/2026 Nº Nota 147253623',
    '1-BOVESPA V VISTA PETROBRAS PETR4 PN N2 # 100 38,50 3.850,00 C',
    '1-BOVESPA C FRACIONARIO 05/11 ITAUSA ITSA4F PN 10 9,10 91,00 D',
    '3.750,00 Líquido para 28/10/2026 C',
  ].join('\n');
  const n = lerNota(texto);
  assert.equal(n.nota, '147253623');
  assert.equal(n.data, '2026-10-26');
  assert.equal(n.trades.length, 2);
  assert.equal(n.trades[0].cv, 'V');
  assert.equal(n.trades[0].tk, 'PETR4');
  assert.equal(n.trades[0].spec, 'PETROBRAS PETR4 PN N2');
  assert.equal(n.trades[1].tk, 'ITSA4');
  assert.equal(n.trades[1].q, 10);
  // vendas 3850 − compras 91 = 3759 gross; 3750 credited → 9,00 in fees.
  perto(n.fees, 9, 'custos numa nota credora');
});

test('texto sem negócios devolve lista vazia', () => {
  const n = lerNota('Nota de Negociação\nnada aqui');
  assert.deepEqual(n.trades, []);
  assert.equal(n.nota, '');
  assert.equal(n.data, '');
  assert.equal(n.fees, 0);
});
