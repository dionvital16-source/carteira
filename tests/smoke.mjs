/* Teste de fumaça: abre a carteira num Chromium de 1366 x 900 e percorre o que
   o design promete — totais, ordenação, busca, filtro por classe, último preço,
   zerar/restaurar, detalhe das operações, persistência e a importação de uma
   nota de negociação em PDF. Falha se qualquer erro de console aparecer.

   Como rodar:
     npm run build && npx vite preview --port 4173 &
     npm run smoke              # --shots grava as telas em SHOT_DIR

   BASE_URL aponta para outro endereço; PW_CHROMIUM para outro executável. */

import { chromium } from 'playwright';

const ENDERECO = process.env.BASE_URL || 'http://127.0.0.1:4173/';
const NOTA = new URL('../design/project/uploads/4495937_2026-10-26_2026-10-26.pdf', import.meta.url).pathname;
const erros = [];
const shots = process.argv.includes('--shots');
const dir = process.env.SHOT_DIR || '/tmp';

const browser = await chromium.launch(
  process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {},
);
const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 } });
const page = await ctx.newPage();
page.on('console', (m) => m.type() === 'error' && erros.push(`console: ${m.text()}`));
page.on('pageerror', (e) => erros.push(`pageerror: ${e.message}`));

const shot = async (nome) => {
  if (shots) await page.screenshot({ path: `${dir}/${nome}.png`, fullPage: true });
};
const ok = (cond, msg) => {
  if (!cond) erros.push(`FALHA: ${msg}`);
};
const primeiroTicker = () => page.locator('tbody tr[data-ticker]').first().getAttribute('data-ticker');
const linha = (t) => page.locator(`tr[data-ticker="${t}"]`);

await page.goto(ENDERECO, { waitUntil: 'networkidle' });

/* — carteira — */
await page.waitForSelector('text=Meus investimentos');
ok(await page.locator('text=0 de 93 ativos com último preço').count() === 1, '93 ativos com posição em aberto');
ok(await page.locator('text=em compras −').count() === 1, 'card Total investido mostra compras − vendas');
ok(await page.locator('text=Alocação por classe').count() === 1, 'seção de alocação');
ok(await page.locator('tbody tr[data-ticker]').count() === 93, 'tabela lista as 93 posições');
ok((await page.locator('button', { hasText: 'Mostrar zerados' }).innerText()).includes('('), 'botão de zerados com contagem');
await shot('01-carteira');

// ordenação: padrão é saldo decrescente; clicar em Nome ordena A→Z; de novo inverte
const maior = await primeiroTicker();
await page.getByRole('columnheader', { name: /Nome do Ativo/ }).click();
ok((await primeiroTicker()) === 'ABEV3', 'ordenar por nome começa em ABEV3');
await page.getByRole('columnheader', { name: /Nome do Ativo/ }).click();
ok((await primeiroTicker()) !== 'ABEV3', 'segundo clique inverte a ordem');
await page.getByRole('columnheader', { name: /^Saldo/ }).click();
ok((await primeiroTicker()) === maior, 'voltar a Saldo recupera a ordem inicial');

// busca e filtro
await page.getByLabel('Buscar ativo').fill('xpie');
ok(await page.locator('tbody tr[data-ticker]').count() === 1, 'busca "xpie" deixa uma linha');
ok(await linha('XPIE11').count() === 1, 'a linha é XPIE11');
await page.getByLabel('Buscar ativo').fill('zzzz');
ok(await page.locator('text=Nenhum ativo encontrado.').count() === 1, 'mensagem de lista vazia');
await page.getByLabel('Buscar ativo').fill('');
await page.locator('.seg-opt', { hasText: 'Fundos' }).click();
const fundos = await page.locator('tbody tr[data-ticker]').count();
ok(fundos > 0 && fundos < 93, `filtro Fundos reduz a lista (${fundos})`);
ok(await page.locator('tbody tr[data-ticker] .tag', { hasText: 'Ações' }).count() === 0, 'nenhuma ação com o filtro Fundos');
await page.locator('.seg-opt', { hasText: 'Todos' }).click();
await shot('02-filtros');

// último preço: rentabilidade da linha e o card passam a ter valor
ok((await linha('XPIE11').locator('td').nth(3).innerText()) === '—', 'sem preço, rentabilidade é —');
await page.getByLabel('Último preço de XPIE11').fill('44,10');
ok(/%$/.test(await linha('XPIE11').locator('td').nth(3).innerText()), 'com preço, rentabilidade em %');
ok(await page.locator('text=1 de 93 ativos com último preço').count() === 1, 'card conta o ativo com preço');
ok(!(await page.locator('.card-kicker', { hasText: 'Rentabilidade' }).locator('..').innerText()).includes('—\n'), 'card Rentabilidade com valor');

// detalhe da posição
await linha('XPIE11').locator('td').first().click();
ok(await page.locator('.op-cab', { hasText: 'Instituição' }).count() === 1, 'detalhe abre com as colunas das operações');
ok(await page.locator('text=XP Investimentos').count() >= 1, 'corretora por extenso');
await shot('03-detalhe');
await linha('XPIE11').locator('td').first().click();
ok(await page.locator('.op-cab', { hasText: 'Instituição' }).count() === 0, 'detalhe fecha');

// zerar e restaurar
await page.getByLabel('Zerar posição XPIE11').click();
ok(await linha('XPIE11').count() === 0, 'ativo zerado sai da lista');
ok(await page.locator('text=0 de 92 ativos com último preço').count() === 1, 'zerado sai do cálculo');
await page.locator('button', { hasText: 'Mostrar zerados' }).click();
ok(await linha('XPIE11').count() === 1, 'com "Mostrar zerados" o ativo reaparece');
await page.getByLabel('Restaurar XPIE11').click();
await page.locator('button', { hasText: 'Ocultar zerados' }).click();
ok(await page.locator('text=1 de 93 ativos com último preço').count() === 1, 'restaurado volta ao cálculo');

// persistência
await page.reload({ waitUntil: 'networkidle' });
await page.waitForSelector('text=Meus investimentos');
ok((await page.getByLabel('Último preço de XPIE11').inputValue()) === '44,10', 'preço digitado sobrevive ao reload');

/* — importar notas — */
const qtdAntes = Number((await page.getByLabel('Quantidade de ECOR3').getAttribute('placeholder')).replace(/\./g, ''));
await page.getByRole('tab', { name: 'Importar notas' }).click();
await page.waitForSelector('text=Importar nota de negociação');
await page.getByLabel('Escolher PDF da nota de negociação').setInputFiles(NOTA);
await page.waitForSelector('text=Nota 147253623 · pregão 26/10/2026', { timeout: 30000 });
ok(await page.locator('text=ECOR3').count() >= 1, 'nota lista ECOR3');
ok(await page.locator('text=Custos da nota: R$ 6,03').count() === 1, 'custos da nota somados');
ok(await page.locator('role=alert').count() === 1, 'aviso: pregão já coberto pelo extrato');
await shot('04-nota-lida');
await page.getByRole('button', { name: 'Adicionar mesmo assim' }).click();
await page.waitForSelector('text=Notas adicionadas');
ok(await page.locator('text=C 200 ECOR3 · C 1 XPIE11').count() === 1, 'resumo da nota adicionada');
ok((await page.getByRole('tab', { name: /Importar notas/ }).innerText()).includes('1'), 'aba mostra 1 nota');
await shot('05-nota-adicionada');

// a nota entra na carteira
await page.getByRole('tab', { name: 'Carteira' }).click();
const qtdDepois = Number((await page.getByLabel('Quantidade de ECOR3').getAttribute('placeholder')).replace(/\./g, ''));
ok(qtdDepois === qtdAntes + 200, `ECOR3 ganha 200 unidades (${qtdAntes} → ${qtdDepois})`);
await linha('ECOR3').locator('td').first().click();
ok(await page.locator('text=Nota 147253623').count() === 1, 'operação da nota aparece no detalhe');

// mesma nota de novo: bloqueada; remover a nota
await page.getByRole('tab', { name: /Importar notas/ }).click();
await page.getByLabel('Escolher PDF da nota de negociação').setInputFiles(NOTA);
await page.waitForSelector('text=Esta nota já foi adicionada.', { timeout: 30000 });
ok(await page.getByRole('button', { name: 'Adicionar à carteira' }).isDisabled(), 'nota repetida não pode ser adicionada');
await page.getByRole('button', { name: 'Descartar' }).click();
await page.getByLabel('Remover nota 147253623').click();
ok(await page.locator('text=Notas adicionadas').count() === 0, 'nota removida');

await browser.close();

if (erros.length) {
  console.error(erros.join('\n'));
  process.exit(1);
}
console.log('smoke ok');
