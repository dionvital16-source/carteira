/* The two page tabs: "Carteira" and "Importar notas". The second carries a
   badge with the number of notas already added, hidden at zero. */

const ABAS = [
  { id: 'carteira', rotulo: 'Carteira' },
  { id: 'notas', rotulo: 'Importar notas' },
];

export default function Abas({ aba, onAba, notas }) {
  return (
    <div
      role="tablist"
      style={{
        display: 'flex',
        gap: 'var(--space-6)',
        borderBottom: '1px solid var(--color-divider)',
        marginTop: 'calc(-1 * var(--space-4))',
      }}
    >
      {ABAS.map((a) => {
        const badge = a.id === 'notas' && notas > 0 ? String(notas) : '';
        return (
          <button
            key={a.id}
            type="button"
            role="tab"
            className="aba"
            aria-selected={aba === a.id}
            onClick={() => onAba(a.id)}
          >
            {a.rotulo}
            {badge && (
              <span className="tag tag-neutral" style={{ padding: '1px 6px', fontSize: 10 }}>
                {badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
