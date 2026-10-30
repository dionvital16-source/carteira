import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  posicoes,
  resumo,
  filtrarOrdenar,
  linhasDasNotas,
  precoEfetivo,
  classeDoAtivo,
} from '../../src/lib/positions.js';
import { lerNumero, pctSinal, reaisSinal } from '../../src/lib/format.js';

const extrato = JSON.parse(readFileSync(new URL('../../src/data/negociacao.json', import.meta.url)));
const perto = (a, b, msg) => assert.ok(Math.abs(a - b) < 0.005, `${msg}: ${a} ≠ ${b}`);

test('classe pelo ticker', () => {
  assert.equal(classeDoAtivo('PETR4'), 'Ações');
  assert.equal(classeDoAtivo('XPIE11'), 'Fundos');
  assert.equal(classeDoAtivo('AAPL34'), 'BDR');
  assert.equal(classeDoAtivo('LCA XP'), 'Renda fixa');
});

test('lerNumero aceita vírgula, ponto e R$', () => {
  assert.equal(lerNumero('1.234,56'), 1234.56);
  assert.equal(lerNumero('R$ 12,3'), 12.3);
  assert.equal(lerNumero('44.10'), 44.1);
  assert.equal(lerNumero(''), null);
  assert.equal(lerNumero('abc'), null);
});

test('sinais', () => {
  assert.equal(pctSinal(0.1), '+10,00%');
  assert.equal(pctSinal(-0.1), '−10,00%');
  assert.equal(reaisSinal(0), 'R$ 0,00');
});

test('extrato: lotes padrão e fracionário somam, vendas descontam', () => {
  const todas = posicoes(extrato);
  const por = Object.fromEntries(todas.map((p) => [p.t, p]));
  // BRPR3 500 bought on the standard lot, 12 sold on the fractional lot.
  assert.equal(por.BRPR3.qty, 488);
  assert.equal(por.BRPR3.ops.length, 2);
  // Fully sold assets have no quantity and are hidden.
  assert.equal(por.AALR3.qty, 0);
  assert.equal(por.AALR3.hidden, true);
  perto(por.AALR3.realizado, 100 * (18.22 - 11.04), 'resultado realizado AALR3');
  // 93 open positions, as the design chat states.
  assert.equal(todas.filter((p) => !p.hidden).length, 93);
});

test('preço médio é o das compras; sem último preço o saldo usa o PM', () => {
  const por = Object.fromEntries(posicoes(extrato).map((p) => [p.t, p]));
  const p = por.BRPR3;
  perto(p.pm, 8.56, 'PM BRPR3');
  perto(p.saldo, 8.56 * 488, 'saldo BRPR3');
  assert.equal(p.rent, null);
  assert.equal(p.price, null);
});

test('overrides: preço, quantidade e zerar', () => {
  const ov = { BRPR3: { price: '10,00' }, BRML3: { hidden: true }, ABEV3: { qty: '0' } };
  const por = Object.fromEntries(posicoes(extrato, ov).map((p) => [p.t, p]));
  perto(por.BRPR3.saldo, 4880, 'saldo com preço');
  perto(por.BRPR3.rent, 10 / 8.56 - 1, 'rentabilidade');
  assert.equal(por.BRML3.hidden, true);
  assert.equal(por.ABEV3.hidden, true);
  assert.equal(por.ABEV3.qty, 0);
});

test('resumo: total investido = compras − vendas, contando ativos zerados', () => {
  const todas = posicoes(extrato, { BRML3: { hidden: true } });
  const r = resumo(todas);
  const compras = extrato.reduce((a, x) => a + x.b * x.pb, 0);
  const vendas = extrato.reduce((a, x) => a + x.s * x.ps, 0);
  perto(r.compras, compras, 'compras');
  perto(r.vendas, vendas, 'vendas');
  perto(r.investido, compras - vendas, 'investido');
  assert.equal(r.ativas, 92);
  assert.equal(r.zeradas, todas.length - 92);
  assert.equal(r.comPreco, 0);
  assert.equal(r.rent, null);
  assert.ok(r.porClasse.every((c) => c.valor > 0));
  perto(
    r.porClasse.reduce((a, c) => a + c.valor, 0),
    r.total,
    'classes somam o total',
  );
});

test('rentabilidade só sobre os ativos com preço', () => {
  const r = resumo(posicoes(extrato, { BRPR3: { price: '10' } }));
  assert.equal(r.comPreco, 1);
  perto(r.rentReais, (10 - 8.56) * 488, 'ganho em reais');
  perto(r.rent, 10 / 8.56 - 1, 'ganho em %');
});

test('filtro, busca e ordenação', () => {
  const todas = posicoes(extrato);
  const base = { mostrarZerados: false, classe: 'Todos', busca: '', coluna: 'saldo', direcao: -1 };
  const l = filtrarOrdenar(todas, base);
  assert.equal(l.length, 93);
  assert.ok(l[0].saldo >= l[1].saldo);
  const fundos = filtrarOrdenar(todas, { ...base, classe: 'Fundos' });
  assert.ok(fundos.length > 0 && fundos.every((p) => p.cls === 'Fundos'));
  const busca = filtrarOrdenar(todas, { ...base, busca: 'ambev' });
  assert.deepEqual(busca.map((p) => p.t), ['ABEV3']);
  const nomes = filtrarOrdenar(todas, { ...base, coluna: 'nome', direcao: 1 }).map((p) => p.t);
  assert.deepEqual(nomes, [...nomes].sort());
  const comZerados = filtrarOrdenar(todas, { ...base, mostrarZerados: true });
  assert.equal(comZerados.length, todas.length);
  assert.equal(comZerados[comZerados.length - 1].hidden, true);
});

test('notas viram linhas e entram na posição', () => {
  const nota = {
    nota: '147253623',
    data: '2026-10-26',
    fees: 6.03,
    withFees: true,
    trades: [
      { cv: 'C', tk: 'ECOR3', spec: 'ECORODOVIAS ECOR3 ON NM', q: 200, p: 5.22, v: 1044 },
      { cv: 'C', tk: 'XPIE11', spec: 'FIP XP INFRA XPIE11 CI', q: 1, p: 43.08, v: 43.08 },
    ],
  };
  const linhas = linhasDasNotas([nota]);
  assert.equal(linhas.length, 2);
  assert.equal(linhas[0].i, 'Nota 147253623');
  assert.equal(linhas[0].d1, '26/10/2026');
  perto(precoEfetivo(nota, nota.trades[0]), (1044 + (6.03 * 1044) / 1087.08) / 200, 'preço com custos');
  perto(precoEfetivo({ ...nota, withFees: false }, nota.trades[0]), 5.22, 'preço sem custos');

  const antes = Object.fromEntries(posicoes(extrato).map((p) => [p.t, p]));
  const depois = Object.fromEntries(posicoes([...extrato, ...linhas]).map((p) => [p.t, p]));
  assert.equal(depois.ECOR3.qty, antes.ECOR3.qty + 200);
  assert.equal(depois.ECOR3.ops.length, antes.ECOR3.ops.length + 1);
  const venda = { ...nota, nota: '1', trades: [{ cv: 'V', tk: 'ECOR3', spec: 'x', q: 100, p: 6, v: 600 }] };
  const vendido = Object.fromEntries(posicoes([...extrato, ...linhasDasNotas([venda])]).map((p) => [p.t, p]));
  assert.equal(vendido.ECOR3.qty, antes.ECOR3.qty - 100);
  assert.ok(vendido.ECOR3.realizado > 0);
});
