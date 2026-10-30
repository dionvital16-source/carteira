/* The "Carteira" tab: the notice, four summary cards, allocation by class and
   the positions table with its filters, search, sorting, editable price and
   quantity, zeroing and the expandable trade detail. */

import { useState } from 'react';
import { ChevronRight, Info, RotateCcw, X } from 'lucide-react';

import Blueprint from '../components/Blueprint.jsx';
import { inteiro, lerNumero, pct, pctSinal, preco, precoCurto, reais, reaisSinal } from '../lib/format.js';
import { CLASSES, COR_DA_CLASSE, direcaoInicial, filtrarOrdenar } from '../lib/positions.js';

const ORDENACAO_PADRAO = 'saldo';
const MOSTRAR_ZERADOS_PADRAO = false;

const COLUNAS = [
  { id: 'nome', rotulo: 'Nome do Ativo', direita: false },
  { id: 'saldo', rotulo: 'Saldo', direita: true },
  { id: 'alloc', rotulo: '% Alocação', direita: true },
  { id: 'rent', rotulo: 'Rentabilidade', direita: true },
  { id: 'pm', rotulo: 'Preço médio', direita: true },
];

const NOME_DA_CORRETORA = { XP: 'XP Investimentos', Clear: 'Clear Corretora' };

const estiloValorCard = {
  fontFamily: 'var(--font-heading)',
  fontWeight: 600,
  fontSize: 34,
  lineHeight: 1.1,
  fontVariantNumeric: 'tabular-nums',
};

const estiloCampo = { minHeight: 30, padding: '4px 8px', textAlign: 'right' };

function Card({ kicker, valor, meta }) {
  return (
    <Blueprint className="card" style={{ padding: 'var(--space-4)' }}>
      <span className="card-kicker" style={{ color: 'var(--color-accent-700)' }}>
        {kicker}
      </span>
      <span style={estiloValorCard}>{valor}</span>
      <span className="card-meta">{meta}</span>
    </Blueprint>
  );
}

function Alocacao({ totais }) {
  const classes = totais.porClasse.map((c) => ({
    ...c,
    fracao: totais.total ? c.valor / totais.total : 0,
    cor: COR_DA_CLASSE[c.nome],
  }));
  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      <h4 style={{ margin: 0 }}>Alocação por classe</h4>
      <div style={{ display: 'flex', height: 28, border: '1px solid var(--color-divider)', background: 'var(--color-bg)' }}>
        {classes.map((c) => (
          <div key={c.nome} title={c.nome} style={{ height: '100%', width: `${c.fracao * 100}%`, background: c.cor }} />
        ))}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-3) var(--space-8)' }}>
        {classes.map((c) => (
          <div key={c.nome} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 13 }}>
            <span style={{ width: 10, height: 10, background: c.cor }} />
            <span style={{ fontWeight: 500 }}>{c.nome}</span>
            <span style={{ color: 'var(--color-neutral-700)', fontVariantNumeric: 'tabular-nums' }}>
              {pct(c.fracao)} · {reais(c.valor)}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

/** The trade rows (extrato rows and nota trades) of one expanded position. */
function Operacoes({ p }) {
  return (
    <tr>
      <td colSpan={8} style={{ background: 'var(--color-neutral-100)', padding: 'var(--space-3) var(--space-4) var(--space-4) 40px' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '70px 170px minmax(0,1fr) 70px 70px 70px 100px 100px',
            gap: '4px var(--space-4)',
            fontSize: 12,
            maxWidth: 960,
          }}
        >
          <span className="op-cab">Código</span>
          <span className="op-cab">Período</span>
          <span className="op-cab">Instituição</span>
          <span className="op-cab" style={{ textAlign: 'right' }}>Compra</span>
          <span className="op-cab" style={{ textAlign: 'right' }}>Venda</span>
          <span className="op-cab" style={{ textAlign: 'right' }}>Líquida</span>
          <span className="op-cab" style={{ textAlign: 'right' }}>PM compra</span>
          <span className="op-cab" style={{ textAlign: 'right' }}>PM venda</span>
          {p.ops.map((o, i) => (
            // A position has at most one row per code and broker, so this key is stable.
            <OperacaoLinha key={`${o.c}|${o.i}|${i}`} o={o} />
          ))}
        </div>
        {p.s > 0 && (
          <span style={{ display: 'block', marginTop: 'var(--space-2)', fontSize: 12, color: 'var(--color-accent-700)' }}>
            Resultado realizado nas vendas: {reaisSinal(p.realizado)}
          </span>
        )}
      </td>
    </tr>
  );
}

function OperacaoLinha({ o }) {
  return (
    <>
      <span style={{ fontWeight: 500 }}>{o.c}</span>
      <span>{o.d1 === o.d2 ? o.d1 : `${o.d1} – ${o.d2}`}</span>
      <span>{NOME_DA_CORRETORA[o.i] || o.i}</span>
      <span style={{ textAlign: 'right' }}>{inteiro(o.b)}</span>
      <span style={{ textAlign: 'right' }}>{inteiro(o.s)}</span>
      <span style={{ textAlign: 'right' }}>{inteiro(o.n)}</span>
      <span style={{ textAlign: 'right' }}>{o.b ? preco(o.pb) : '—'}</span>
      <span style={{ textAlign: 'right' }}>{o.s ? preco(o.ps) : '—'}</span>
    </>
  );
}

function Posicao({ p, total, aberta, onAbrir, onPreco, onQtd, onZerar }) {
  const corRent =
    p.rent == null ? 'var(--color-neutral-600)' : p.rent >= 0 ? 'var(--color-accent-700)' : 'var(--color-text)';
  const largura = p.hidden || !total ? 0 : Math.min(100, (p.saldo / total) * 100 * 4);
  return (
    <>
      <tr style={{ opacity: p.hidden ? 0.5 : 1 }} data-ticker={p.t}>
        <td style={{ cursor: 'pointer' }} onClick={onAbrir}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <ChevronRight
              size={14}
              strokeWidth={1.5}
              style={{ flex: 'none', color: 'var(--color-neutral-600)', transform: aberta ? 'rotate(90deg)' : 'none' }}
            />
            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <strong style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 16, letterSpacing: '0.01em' }}>
                  {p.t.replace(/^(LCA|CDB) /, '$1 · ')}
                </strong>
                <span className="tag tag-accent" style={{ padding: '1px 6px', fontSize: 10 }}>
                  {p.cls}
                </span>
              </span>
              <span
                style={{
                  fontSize: 12,
                  color: 'var(--color-neutral-700)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: 300,
                }}
              >
                {p.n}
              </span>
            </div>
          </div>
        </td>
        <td style={{ textAlign: 'right', fontWeight: 500 }}>{p.hidden ? '—' : reais(p.saldo)}</td>
        <td style={{ textAlign: 'right' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3 }}>
            <span>{p.hidden ? '—' : pct(total ? p.saldo / total : 0)}</span>
            <span style={{ width: 64, height: 3, background: 'var(--color-neutral-200)', display: 'block' }}>
              <span style={{ display: 'block', height: '100%', width: `${largura}%`, background: 'var(--color-accent)' }} />
            </span>
          </div>
        </td>
        <td style={{ textAlign: 'right', fontWeight: 500, color: corRent }}>{p.rent == null ? '—' : pctSinal(p.rent)}</td>
        <td style={{ textAlign: 'right' }}>{preco(p.pm)}</td>
        <td style={{ textAlign: 'right' }}>
          <input
            className="input"
            type="text"
            inputMode="decimal"
            aria-label={`Último preço de ${p.t}`}
            placeholder={precoCurto(p.pm)}
            value={p.o.price ?? ''}
            onChange={(e) => onPreco(e.target.value)}
            style={{ ...estiloCampo, width: 104 }}
          />
        </td>
        <td style={{ textAlign: 'right' }}>
          <input
            className="input"
            type="text"
            inputMode="numeric"
            aria-label={`Quantidade de ${p.t}`}
            placeholder={inteiro(p.q)}
            value={p.o.qty ?? ''}
            onChange={(e) => onQtd(e.target.value)}
            style={{ ...estiloCampo, width: 96 }}
          />
        </td>
        <td style={{ textAlign: 'right' }}>
          <button
            type="button"
            className="btn btn-ghost btn-icon"
            title={p.hidden ? 'Restaurar' : 'Zerar posição'}
            aria-label={`${p.hidden ? 'Restaurar' : 'Zerar posição'} ${p.t}`}
            onClick={onZerar}
            style={{ width: 30, height: 30, color: 'var(--color-neutral-700)' }}
          >
            {p.hidden ? <RotateCcw size={15} strokeWidth={1.5} /> : <X size={15} strokeWidth={1.5} />}
          </button>
        </td>
      </tr>
      {aberta && <Operacoes p={p} />}
    </>
  );
}

export default function Carteira({ todas, totais, overrides, onOverrides }) {
  const [coluna, setColuna] = useState(ORDENACAO_PADRAO);
  const [direcao, setDirecao] = useState(direcaoInicial(ORDENACAO_PADRAO));
  const [classe, setClasse] = useState('Todos');
  const [busca, setBusca] = useState('');
  const [abertas, setAbertas] = useState({});
  const [mostrarZerados, setMostrarZerados] = useState(MOSTRAR_ZERADOS_PADRAO);

  const linhas = filtrarOrdenar(todas, { mostrarZerados, classe, busca, coluna, direcao });

  const ordenarPor = (id) => {
    if (id === coluna) setDirecao(-direcao);
    else {
      setColuna(id);
      setDirecao(direcaoInicial(id));
    }
  };
  const seta = (id) => (coluna === id ? (direcao > 0 ? '↑' : '↓') : '');

  const definir = (t, campo, valor) =>
    onOverrides({ ...overrides, [t]: { ...(overrides[t] || {}), [campo]: valor } });

  // "Restaurar" on an asset the user zeroed by typing 0 clears that quantity;
  // otherwise the button flips the hidden flag.
  const zerar = (p) => {
    if (p.hidden && lerNumero(p.o.qty) === 0) onOverrides({ ...overrides, [p.t]: { ...p.o, qty: '', hidden: false } });
    else definir(p.t, 'hidden', !p.hidden);
  };

  return (
    <>
      <Blueprint
        style={{
          padding: 'var(--space-3) var(--space-4)',
          display: 'flex',
          gap: 'var(--space-3)',
          alignItems: 'flex-start',
          maxWidth: 900,
        }}
      >
        <Info size={18} strokeWidth={1.5} color="var(--color-accent-700)" style={{ flex: 'none', marginTop: 2 }} />
        <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, color: 'var(--color-neutral-800)', textWrap: 'pretty' }}>
          Posições calculadas pelo Extrato de Negociação da B3 (compras − vendas, lote padrão e fracionário somados).
          Eventos fora do pregão, como fusões, OPAs, fechamentos de capital e vencimentos de renda fixa, não aparecem
          no extrato: ajuste a <strong>Qtd. total</strong> ou zere esses ativos. Informe o <strong>Último preço</strong>{' '}
          para calcular saldo e rentabilidade; sem ele, o saldo usa o preço médio. Resultado realizado nas vendas:{' '}
          {reaisSinal(totais.realizado)}. Tudo fica salvo neste navegador.
        </p>
      </Blueprint>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 'var(--space-6)' }}>
        <Card
          kicker="Saldo total"
          valor={reais(totais.total)}
          meta={`${totais.comPreco} de ${totais.ativas} ativos com último preço`}
        />
        <Card
          kicker="Total investido"
          valor={reais(totais.investido)}
          meta={`${reais(totais.compras)} em compras − ${reais(totais.vendas)} em vendas`}
        />
        <Card
          kicker="Rentabilidade"
          valor={totais.rent == null ? '—' : pctSinal(totais.rent)}
          meta={`${reaisSinal(totais.rentReais)} sobre os ativos com preço`}
        />
        <Card
          kicker="Ativos"
          valor={totais.ativas}
          meta={totais.zeradas ? `${totais.zeradas} zerados fora do cálculo` : 'Nenhum ativo zerado'}
        />
      </div>

      <Alocacao totais={totais} />

      <section style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 'var(--space-3)' }}>
          <h4 style={{ margin: 0, marginRight: 'auto' }}>Posições</h4>
          <div className="seg">
            {['Todos', ...CLASSES].map((c) => (
              <label key={c} className="seg-opt">
                <input type="radio" name="cls" checked={classe === c} onChange={() => setClasse(c)} />
                {c}
              </label>
            ))}
          </div>
          <input
            className="input"
            type="text"
            placeholder="Buscar ativo"
            aria-label="Buscar ativo"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            style={{ width: 200 }}
          />
          <button type="button" className="btn btn-ghost" onClick={() => setMostrarZerados(!mostrarZerados)}>
            {mostrarZerados ? 'Ocultar zerados' : `Mostrar zerados (${totais.zeradas})`}
          </button>
        </div>

        <div style={{ overflowX: 'auto', borderTop: '1px solid var(--color-divider)' }}>
          <table className="table" style={{ minWidth: 1040, fontVariantNumeric: 'tabular-nums' }}>
            <thead>
              <tr>
                {COLUNAS.map((c) => (
                  <th
                    key={c.id}
                    className="th-ordena"
                    onClick={() => ordenarPor(c.id)}
                    style={c.direita ? { textAlign: 'right' } : undefined}
                    aria-sort={coluna === c.id ? (direcao > 0 ? 'ascending' : 'descending') : 'none'}
                  >
                    {c.rotulo} {seta(c.id)}
                  </th>
                ))}
                <th style={{ textAlign: 'right' }}>Último preço (R$)</th>
                <th style={{ textAlign: 'right' }}>Qtd. total</th>
                <th style={{ width: 40 }} />
              </tr>
            </thead>
            <tbody>
              {linhas.map((p) => (
                <Posicao
                  key={p.t}
                  p={p}
                  total={totais.total}
                  aberta={!!abertas[p.t]}
                  onAbrir={() => setAbertas((a) => ({ ...a, [p.t]: !a[p.t] }))}
                  onPreco={(v) => definir(p.t, 'price', v)}
                  onQtd={(v) => definir(p.t, 'qty', v)}
                  onZerar={() => zerar(p)}
                />
              ))}
            </tbody>
          </table>
        </div>
        {linhas.length === 0 && <p style={{ color: 'var(--color-neutral-700)', fontSize: 14 }}>Nenhum ativo encontrado.</p>}
      </section>
    </>
  );
}
