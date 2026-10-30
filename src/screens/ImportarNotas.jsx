/* The "Importar notas" tab: a drop zone for nota PDFs, one review card per
   nota read (trades, fees, the duplicate / already-in-extrato warning) and the
   list of notas already added to the portfolio. */

import { useRef, useState } from 'react';
import { FileUp, Trash, TriangleAlert } from 'lucide-react';

import Blueprint from '../components/Blueprint.jsx';
import { dataBR, inteiro, preco, reais } from '../lib/format.js';
import { EXTRATO_FIM, precoEfetivo } from '../lib/positions.js';

const ehPdf = (f) => /pdf$/i.test(f.name) || f.type === 'application/pdf';

function NotaPendente({ n, jaAdicionada, onCustos, onAdicionar, onDescartar }) {
  const coberta = !jaAdicionada && n.data && n.data <= EXTRATO_FIM;
  const aviso = jaAdicionada
    ? 'Esta nota já foi adicionada.'
    : coberta
      ? `Pregão de ${dataBR(n.data)}: já está no Extrato de Negociação da B3 (até ${dataBR(EXTRATO_FIM)}). Adicionar vai duplicar as quantidades.`
      : '';
  return (
    <Blueprint className="card" style={{ padding: 'var(--space-4)', gap: 'var(--space-3)' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: 'var(--space-2) var(--space-4)' }}>
        <span className="card-title" style={{ fontSize: 20 }}>
          Nota {n.nota || 's/ nº'} · pregão {n.data ? dataBR(n.data) : '—'}
        </span>
        <span className="card-meta">{n.file}</span>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table className="table" style={{ minWidth: 640, fontVariantNumeric: 'tabular-nums' }}>
          <thead>
            <tr>
              <th>C/V</th>
              <th>Ativo</th>
              <th style={{ textAlign: 'right' }}>Quantidade</th>
              <th style={{ textAlign: 'right' }}>Preço</th>
              <th style={{ textAlign: 'right' }}>Valor</th>
              <th style={{ textAlign: 'right' }}>Preço c/ custos</th>
            </tr>
          </thead>
          <tbody>
            {n.trades.map((t, i) => (
              <tr key={i}>
                <td>
                  <span className="tag tag-accent">{t.cv === 'C' ? 'Compra' : 'Venda'}</span>
                </td>
                <td>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <strong style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 16 }}>{t.tk}</strong>
                    <span style={{ fontSize: 12, color: 'var(--color-neutral-700)' }}>{t.spec}</span>
                  </div>
                </td>
                <td style={{ textAlign: 'right' }}>{inteiro(t.q)}</td>
                <td style={{ textAlign: 'right' }}>{preco(t.p)}</td>
                <td style={{ textAlign: 'right' }}>{reais(t.v)}</td>
                <td style={{ textAlign: 'right', fontWeight: 500 }}>{preco(precoEfetivo(n, t))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 'var(--space-3) var(--space-6)' }}>
        <span style={{ fontSize: 13 }}>Custos da nota: {reais(n.fees)}</span>
        <label className="radio" style={{ fontSize: 13 }}>
          <input type="checkbox" checked={n.withFees} onChange={onCustos} />
          <span className="dot" style={{ borderRadius: 0 }} />
          Incluir custos no preço médio
        </label>
      </div>
      {aviso && (
        <div
          role="alert"
          style={{
            display: 'flex',
            gap: 'var(--space-2)',
            alignItems: 'flex-start',
            padding: 'var(--space-2) var(--space-3)',
            background: 'var(--color-accent-100)',
            fontSize: 13,
            color: 'var(--color-accent-900)',
          }}
        >
          <TriangleAlert size={16} strokeWidth={1.5} style={{ flex: 'none', marginTop: 2 }} />
          <span>{aviso}</span>
        </div>
      )}
      <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'flex-end' }}>
        <button type="button" className="btn btn-secondary" onClick={onDescartar}>
          Descartar
        </button>
        <Blueprint as="button" type="button" className="btn btn-primary" disabled={jaAdicionada} onClick={onAdicionar}>
          {coberta ? 'Adicionar mesmo assim' : 'Adicionar à carteira'}
        </Blueprint>
      </div>
    </Blueprint>
  );
}

export default function ImportarNotas({ notas, onNotas }) {
  const [pendentes, setPendentes] = useState([]);
  const [lendo, setLendo] = useState(false);
  const [erro, setErro] = useState('');
  const [arrastando, setArrastando] = useState(false);
  const entrada = useRef(null);

  const receber = async (lista) => {
    const arquivos = [...(lista || [])].filter(ehPdf);
    if (!arquivos.length) return;
    setLendo(true);
    setErro('');
    const { lerNotaDoArquivo } = await import('../lib/pdf.js');
    const novas = [];
    const erros = [];
    for (const f of arquivos) {
      try {
        const n = await lerNotaDoArquivo(f);
        if (!n.trades.length) erros.push(`${f.name}: nenhuma negociação encontrada`);
        else novas.push(n);
      } catch {
        erros.push(`${f.name}: não foi possível ler o PDF`);
      }
    }
    setPendentes((atuais) => {
      const lista = [...atuais];
      for (const n of novas) if (!lista.some((p) => p.nota === n.nota)) lista.push(n);
      return lista;
    });
    setLendo(false);
    setErro(erros.join(' · '));
  };

  const tirar = (i) => setPendentes((p) => p.filter((_, j) => j !== i));

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <div>
        <h4 style={{ margin: '0 0 var(--space-1)' }}>Importar nota de negociação</h4>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--color-neutral-700)' }}>
          Leia o PDF da nota da corretora, confira as operações e adicione à carteira. Quantidade e preço médio são
          atualizados na hora.
        </p>
      </div>

      <Blueprint
        as="label"
        onDragOver={(e) => {
          e.preventDefault();
          if (!arrastando) setArrastando(true);
        }}
        onDragLeave={() => setArrastando(false)}
        onDrop={(e) => {
          e.preventDefault();
          setArrastando(false);
          receber(e.dataTransfer.files);
        }}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 'var(--space-3)',
          padding: 'var(--space-8) var(--space-4)',
          cursor: 'pointer',
          border: `1px dashed ${arrastando ? 'var(--color-accent)' : 'var(--color-divider)'}`,
          background: arrastando ? 'var(--color-accent-100)' : 'transparent',
        }}
      >
        <input
          ref={entrada}
          type="file"
          accept="application/pdf,.pdf"
          multiple
          aria-label="Escolher PDF da nota de negociação"
          onChange={(e) => {
            receber(e.target.files);
            e.target.value = '';
          }}
          style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }}
        />
        <FileUp size={22} strokeWidth={1.5} color="var(--color-accent-700)" />
        <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-accent-800)' }}>
          {lendo ? 'Lendo nota…' : 'Arraste o PDF da nota de negociação ou clique para escolher'}
        </span>
      </Blueprint>
      {erro && <span style={{ fontSize: 12, color: 'var(--color-text)' }}>{erro}</span>}

      {pendentes.map((n, i) => (
        <NotaPendente
          key={n.nota || n.file}
          n={n}
          jaAdicionada={notas.some((x) => x.nota === n.nota)}
          onCustos={() => setPendentes((p) => p.map((x, j) => (j === i ? { ...x, withFees: !x.withFees } : x)))}
          onAdicionar={() => {
            const { file, ...nota } = n;
            onNotas([...notas, nota]);
            tirar(i);
          }}
          onDescartar={() => tirar(i)}
        />
      ))}

      {notas.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          <h6 style={{ margin: 0, color: 'var(--color-neutral-700)' }}>Notas adicionadas</h6>
          <table className="table" style={{ fontVariantNumeric: 'tabular-nums' }}>
            <tbody>
              {notas.map((n) => (
                <tr key={n.nota}>
                  <td style={{ fontWeight: 500, whiteSpace: 'nowrap' }}>Nota {n.nota}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>{dataBR(n.data)}</td>
                  <td style={{ fontSize: 13, color: 'var(--color-neutral-800)' }}>
                    {n.trades.map((t) => `${t.cv} ${inteiro(t.q)} ${t.tk}`).join(' · ')}
                  </td>
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>{reais(n.trades.reduce((a, t) => a + t.v, 0))}</td>
                  <td style={{ width: 40, textAlign: 'right' }}>
                    <button
                      type="button"
                      className="btn btn-ghost btn-icon"
                      title="Remover nota"
                      aria-label={`Remover nota ${n.nota}`}
                      onClick={() => onNotas(notas.filter((x) => x.nota !== n.nota))}
                      style={{ width: 30, height: 30, color: 'var(--color-neutral-700)' }}
                    >
                      <Trash size={15} strokeWidth={1.5} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
