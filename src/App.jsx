import { useMemo, useState } from 'react';

import Abas from './components/Abas.jsx';
import Carteira from './screens/Carteira.jsx';
import ImportarNotas from './screens/ImportarNotas.jsx';
import extrato from './data/negociacao.json';
import { dataBR } from './lib/format.js';
import { EXTRATO_FIM, EXTRATO_INICIO, linhasDasNotas, posicoes, resumo } from './lib/positions.js';
import { carregarNotas, carregarOverrides, gravarNotas, gravarOverrides } from './lib/storage.js';

const TITULAR = 'Dion Luciano Vital Filho';

export default function App() {
  const [aba, setAba] = useState('carteira');
  const [overrides, setOverrides] = useState(carregarOverrides);
  const [notas, setNotas] = useState(carregarNotas);

  const salvarOverrides = (ov) => {
    setOverrides(ov);
    gravarOverrides(ov);
  };
  const salvarNotas = (lista) => {
    setNotas(lista);
    gravarNotas(lista);
  };

  // Every position comes from the extrato rows plus the trades of the added
  // notas; the user's typed prices, quantities and zeroed assets sit on top.
  const todas = useMemo(
    () => posicoes([...extrato, ...linhasDasNotas(notas)], overrides),
    [notas, overrides],
  );
  const totais = useMemo(() => resumo(todas), [todas]);

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--color-bg)',
        color: 'var(--color-text)',
        fontFamily: 'var(--font-body)',
      }}
    >
      <nav className="nav" style={{ maxWidth: 1320, margin: '0 auto', padding: 'var(--space-4) var(--space-6)' }}>
        <span className="nav-brand">Carteira B3</span>
        <span style={{ fontSize: 13, color: 'var(--color-neutral-700)' }}>{TITULAR}</span>
        <span className="tag tag-neutral">
          Extrato {dataBR(EXTRATO_INICIO)} – {dataBR(EXTRATO_FIM)}
        </span>
      </nav>

      <main
        style={{
          maxWidth: 1320,
          margin: '0 auto',
          padding: 'var(--space-4) var(--space-6) 64px',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-8)',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            gap: 'var(--space-4)',
          }}
        >
          <div>
            <h6 style={{ color: 'var(--color-accent-700)', marginBottom: 'var(--space-1)' }}>Posição consolidada</h6>
            <h1 style={{ margin: 0, fontSize: 48 }}>Meus investimentos</h1>
          </div>
        </div>

        <Abas aba={aba} onAba={setAba} notas={notas.length} />

        {aba === 'carteira' && (
          <Carteira todas={todas} totais={totais} overrides={overrides} onOverrides={salvarOverrides} />
        )}
        {aba === 'notas' && <ImportarNotas notas={notas} onNotas={salvarNotas} />}
      </main>
    </div>
  );
}
