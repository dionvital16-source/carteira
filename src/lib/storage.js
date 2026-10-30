/* Persistence: everything the user types stays in this browser's localStorage.

   Two records, same keys the design prototype used:
     overrides  { [ticker]: { price?, qty?, hidden? } }  typed prices, quantities, zeroed assets
     notas      [ { nota, data, trades, fees, withFees } ] added brokerage notes

   Nothing syncs anywhere. Clearing the site data erases both. */

const CHAVE_OVERRIDES = 'carteira-b3-ov-v1';
const CHAVE_NOTAS = 'carteira-b3-notas-v1';

const ler = (chave, padrao) => {
  try {
    const cru = localStorage.getItem(chave);
    return cru ? JSON.parse(cru) : padrao;
  } catch {
    // Private mode, blocked storage or a corrupt payload: start clean.
    return padrao;
  }
};

const gravar = (chave, valor) => {
  try {
    localStorage.setItem(chave, JSON.stringify(valor));
    return true;
  } catch {
    return false;
  }
};

export const carregarOverrides = () => {
  const v = ler(CHAVE_OVERRIDES, {});
  return v && typeof v === 'object' && !Array.isArray(v) ? v : {};
};
export const gravarOverrides = (ov) => gravar(CHAVE_OVERRIDES, ov);

export const carregarNotas = () => {
  const v = ler(CHAVE_NOTAS, []);
  return Array.isArray(v) ? v : [];
};
export const gravarNotas = (notas) => gravar(CHAVE_NOTAS, notas);
