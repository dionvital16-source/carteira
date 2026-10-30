# Carteira B3 — meus investimentos

Posição consolidada dos investimentos na B3, calculada a partir do **Extrato de
Negociação** (01/11/2019 – 28/10/2026) e das **notas de negociação** que você
adiciona depois. Mostra, por ativo: Nome do Ativo, Saldo, % Alocação,
Rentabilidade, Preço médio, Último preço (R$) e Qtd. total; em cima, os totais e
a alocação por classe. Clique num ativo para ver as linhas do extrato e o
resultado das vendas.

É uma página de desktop, publicada no GitHub Pages. Não tem servidor: tudo o
que você digita fica salvo só no navegador em que digitou.

Implementado a partir do pacote de handoff do Claude Design, preservado em
[`design/`](design/) — veja [`design/HANDOFF.md`](design/HANDOFF.md) e a
conversa em [`design/chats/chat1.md`](design/chats/chat1.md).

## Como rodar

```bash
npm install
npm run dev        # desenvolvimento em http://localhost:5173
npm run build      # gera dist/
npm run preview    # serve o dist/ em http://localhost:4173
```

### Publicar

A cada push na branch `main`, a action em
[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) roda os testes,
gera o `dist/` e o envia para a branch `gh-pages`. O GitHub ativa o Pages
sozinho quando essa branch aparece; o endereço fica em
`https://<usuário>.github.io/<repositório>/`.

### Testes

```bash
npm test                   # regras de cálculo e leitura da nota (node:test)

npm run build
npx vite preview --port 4173 &
npm run smoke              # percorre a tela num Chromium; --shots grava as telas
```

O teste de fumaça usa o Playwright. Se o Chromium dele não estiver instalado,
aponte `PW_CHROMIUM` para um executável do Chrome/Chromium.

## Como a posição é calculada

As regras ficam em [`src/lib/positions.js`](src/lib/positions.js), sem React.

- **Quantidade** = compras − vendas, somando o lote padrão e o fracionário
  (`ABEV3` + `ABEV3F`). Ativo com quantidade zero sai do cálculo e da lista
  ("Mostrar zerados" os exibe).
- **Preço médio** = preço médio ponderado das compras. O resultado realizado de
  uma venda é `vendido × (preço de venda − preço médio)`.
- **Saldo** = último preço × quantidade. Sem último preço, usa o preço médio e
  a rentabilidade fica em "—".
- **Total investido** = soma de tudo que foi comprado menos tudo que foi
  vendido, segundo o extrato e as notas, **inclusive** os ativos zerados na tela.
- **Rentabilidade** (card) considera só os ativos que têm último preço.
- **Classe** vem do código: `…11` é Fundos, `…32` a `…35` é BDR, o resto é
  Ações.

### O que você precisa ajustar à mão

O extrato só tem o que passou pelo pregão. Fusões, OPAs, fechamentos de
capital, vencimentos de renda fixa e grupamentos não aparecem — por isso
BRML3, CESP6 e CIEL3, por exemplo, ainda constam com quantidade. Use o **✕**
para zerar o ativo ou digite a quantidade certa em **Qtd. total**. O extrato
também não traz cotações: digite o **Último preço** de cada ativo.

## Importar notas

A aba **Importar notas** lê o PDF da nota de negociação (testado com o formato
da XP; a Clear usa o mesmo leiaute da B3), mostra compras e vendas com
quantidade, preço e valor, e os custos da nota, que podem entrar no preço médio
(rateados pelo valor de cada operação). Ao clicar em **Adicionar à carteira**,
quantidade, preço médio e Total investido mudam na hora, e a nota fica listada
em "Notas adicionadas", de onde pode ser removida.

Notas de pregão **até 28/10/2026** já estão no extrato: a tela avisa que
adicionar vai duplicar as quantidades. Notas a partir de 29/10/2026 entram sem
aviso. Uma nota com o mesmo número não entra duas vezes.

O leitor de PDF (pdf.js) só é baixado quando a primeira nota é enviada.

## Atualizar o extrato

Os dados do extrato estão em
[`src/data/negociacao.json`](src/data/negociacao.json): uma linha por ativo e
corretora, com `c` (código, `F` no fim para o fracionário), `d1`/`d2` (primeira
e última negociação), `i` (corretora), `b`/`s` (quantidade comprada e vendida),
`n` (líquida), `pb`/`ps` (preço médio de compra e de venda) e `nm` (nome). Ao
trocar o arquivo por um extrato mais recente, ajuste `EXTRATO_FIM` em
`positions.js` para a nova data final, para que o aviso das notas acompanhe.

## Limites desta versão

- **Os dados ficam só no navegador** (localStorage): preços, quantidades,
  ativos zerados e notas adicionadas. Outro navegador ou aparelho começa do
  zero, e limpar os dados do site apaga tudo. Não há backup.
- **Sem cotações automáticas.** O último preço é digitado.
- **Leitura de nota testada só com o formato da XP.** Se uma nota não for
  reconhecida, aparece "nenhuma negociação encontrada".

## Estrutura

```
src/
  lib/            regras puras, sem React
    positions.js    posições, totais, filtro e ordenação; data final do extrato
    nota.js         leitura do texto de uma nota de negociação
    pdf.js          pdf.js no navegador (carregado sob demanda)
    format.js       R$, %, datas e a leitura do que o usuário digita
    storage.js      localStorage
  data/
    negociacao.json o extrato de negociação consolidado
  screens/        Carteira (totais, alocação, posições) e ImportarNotas
  components/     Blueprint (a moldura do design system) e Abas
  styles/
    industry.css    o design system, copiado do bundle (sem o @import do Google Fonts)
    app.css         regras da página
tests/
  unit/           node:test — cálculo e leitura da nota de exemplo
  smoke.mjs       Playwright — percorre a tela
```
