# 📘 Guia de Estudo — App de Clima

> Este documento explica **tudo** o que foi feito no projeto, **por que** foi feito assim, e traz **perguntas de entrevista** com respostas. Leia com o código aberto ao lado.

---

## Sumário

1. [Visão geral: como o app funciona](#1-visão-geral-como-o-app-funciona)
2. [HTML: estrutura e acessibilidade](#2-html-estrutura-e-acessibilidade)
3. [CSS: estilo e responsividade](#3-css-estilo-e-responsividade)
4. [JavaScript: a lógica, passo a passo](#4-javascript-a-lógica-passo-a-passo)
5. [A API Open-Meteo](#5-a-api-open-meteo)
5.1 [Autocomplete: sugestões enquanto digita](#51-autocomplete-sugestões-enquanto-digita)
6. [Tratamento de erros](#6-tratamento-de-erros)
7. [Segurança](#7-segurança)
8. [Testes automatizados](#8-testes-automatizados)
9. [Git, GitHub, GitHub Pages e GitHub Actions](#9-git-github-github-pages-e-github-actions)
10. [Bugs que encontramos e corrigimos](#10-bugs-que-encontramos-e-corrigimos)
11. [Perguntas de entrevista (com respostas)](#11-perguntas-de-entrevista-com-respostas)
12. [Como apresentar o projeto em 1 minuto](#12-como-apresentar-o-projeto-em-1-minuto)
13. [Glossário](#13-glossário)
14. [Exercícios para evoluir](#14-exercícios-para-evoluir)

---

## 1. Visão geral: como o app funciona

```
Usuário digita "Recife" e clica em Buscar
        │
        ▼
[1] API de Geocoding: "Recife" ──► { latitude: -8.05, longitude: -34.9 }
        │
        ▼
[2] API de Forecast: (lat, lon) ──► { clima atual + previsão diária }
        │
        ▼
[3] JavaScript coloca os dados na tela (manipulação do DOM)
        │
        ▼
[4] Salva "Recife" no localStorage para a próxima visita
```

**Por que duas chamadas?** A API de previsão só entende coordenadas (latitude/longitude), não nomes de cidades. Por isso primeiro convertemos o nome em coordenadas (*geocodificação*).

**Arquivos e responsabilidades** (isso se chama *separação de responsabilidades*):

| Arquivo | Responsabilidade |
|---|---|
| `index.html` | O **que** existe na página (estrutura) |
| `css/style.css` | **Como** a página aparece (visual) |
| `js/weatherCodes.js` | Dicionário: código numérico do clima → texto e emoji |
| `js/script.js` | **Comportamento**: buscar dados, reagir a cliques, atualizar a tela |

---

## 2. HTML: estrutura e acessibilidade

### HTML semântico
Usamos tags com significado: `<main>`, `<header>`, `<section>`, `<form>`, `<footer>`, `<ul>/<li>`. Em vez de `<div>` para tudo.

**Por quê?** Leitores de tela (usados por pessoas cegas), mecanismos de busca (SEO) e outros desenvolvedores entendem melhor a página.

### Pontos importantes do `index.html`

- **`<meta name="viewport" ...>`** — sem isso, o celular "finge" ser uma tela de computador e o site fica minúsculo. É obrigatório para responsividade.
- **`<html lang="pt-BR">`** — informa o idioma ao leitor de tela (pronúncia correta) e ao tradutor do navegador.
- **`<form>` com `submit`** — usar formulário (e não só um botão com `click`) faz a tecla **Enter** funcionar automaticamente.
- **`<label for="city-input">`** com a classe `visually-hidden` — o rótulo fica invisível na tela, mas o leitor de tela lê "Nome da cidade". O `placeholder` **não** substitui o label.
- **`aria-label` no botão 📍** — o botão só tem um emoji; o `aria-label` diz o que ele faz.
- **`role="status"` e `aria-live="polite"`** — quando o texto de "Carregando..." ou de erro muda, o leitor de tela anuncia sozinho.
- **`rel="noopener noreferrer"`** no link externo com `target="_blank"` — impede que a página aberta controle a nossa aba (segurança).
- **Scripts no final do `<body>`** — garantem que o HTML já existe quando o JavaScript procura os elementos. (Alternativa: `<script defer>` no `<head>`.)
- **Ordem dos scripts** — `weatherCodes.js` vem antes de `script.js` porque este usa a função `getWeatherInfo` definida naquele.

---

## 3. CSS: estilo e responsividade

### Variáveis CSS (custom properties)
```css
:root {
  --color-primary: #2563eb;
}
.search__button { background: var(--color-primary); }
```
Mudamos uma cor num lugar só. E o **tema noturno** é só redefinir variáveis:
```css
body.night {
  --color-bg-start: #0f172a;
  --color-bg-end: #334155;
}
```
O JavaScript apenas adiciona/remove a classe `night` no `<body>`.

### Reset e `box-sizing: border-box`
Por padrão, `width` não inclui `padding` e `border`, o que causa contas confusas. Com `border-box`, uma caixa de `width: 100%` com padding continua cabendo no pai.

### Flexbox vs Grid — quando usei cada um
- **Flexbox** (uma dimensão — linha *ou* coluna): barra de busca (input cresce com `flex: 1`, botões ficam do tamanho do conteúdo) e centralização do card no `body`.
- **Grid** (duas dimensões / colunas iguais): os 3 cartões de detalhes (`repeat(3, 1fr)`) e os 5 dias de previsão (`repeat(5, 1fr)`).

`1fr` = "uma fração do espaço disponível".

### Responsividade
- `max-width: 420px` + `width: 100%` no card: no celular ocupa a tela toda; no desktop não fica esticado.
- `@media (max-width: 380px)`: em telas muito pequenas, a temperatura máxima e mínima ficam uma embaixo da outra.
- `min-width: 0` no input: sem isso, um input dentro de flex pode se recusar a encolher e causar rolagem horizontal (bug clássico!).

### Nomenclatura BEM
As classes seguem o padrão **B**loco**__**Elemento**--**Modificador:
`.search` (bloco), `.search__input` (elemento), `.search__button--icon` (modificador).
Deixa claro a que parte cada classe pertence e evita conflitos.

### Outros detalhes
- `:focus-visible` — mostra o contorno de foco para quem navega com teclado, sem incomodar quem usa mouse.
- `.status:empty` — quando não há mensagem, a área de status não ocupa espaço.
- `@keyframes fadeIn` — animação suave ao mostrar os dados.

---

## 4. JavaScript: a lógica, passo a passo

### 4.1 Selecionar elementos
```js
const form = document.getElementById("search-form");
```
Guardamos as referências em constantes no início para não procurar no DOM toda vez.

### 4.2 `async`/`await` e `fetch`
```js
async function fetchCoordinates(city) {
  const response = await fetch(`${GEOCODING_URL}?${params}`);
  if (!response.ok) throw new Error("...");
  const data = await response.json();
  ...
}
```
- `fetch` faz uma requisição HTTP e devolve uma **Promise** (uma "promessa" de valor futuro).
- `await` pausa a função até a Promise terminar, sem travar a página.
- Uma função `async` **sempre** devolve uma Promise.
- ⚠️ **Pegadinha clássica:** `fetch` **não** lança erro para status 404 ou 500! Ele só falha se não houver rede. Por isso verificamos `response.ok` (que é `true` para status 200–299).

### 4.3 `URLSearchParams`
```js
const params = new URLSearchParams({ name: city, count: 1 });
```
Monta a *query string* (`?name=S%C3%A3o+Paulo&count=1`) **codificando** caracteres especiais. Se concatenássemos o texto direto, "São Paulo" ou "Rio & Cia" quebrariam a URL.

### 4.4 Template literals
```js
`${Math.round(current.wind_speed_10m)} km/h`
```
Crases permitem inserir variáveis com `${}` — mais legível que concatenar com `+`.

### 4.5 Desestruturação
```js
const { latitude, longitude } = position.coords;
```
Extrai propriedades de um objeto direto para variáveis.

### 4.6 Eventos e `preventDefault`
```js
form.addEventListener("submit", (event) => {
  event.preventDefault();
  ...
});
```
O comportamento padrão de um formulário é **recarregar a página**. `preventDefault()` impede isso, para tratarmos a busca com JavaScript.

### 4.7 Validação do campo
`cityInput.value.trim()` remove espaços nas pontas. Se sobrar string vazia, mostramos erro. O atributo HTML `required` já bloqueia campo vazio, mas **não** bloqueia "   " (só espaços) — por isso a validação em JS também.

### 4.8 Atualizar a tela (DOM)
- Para textos: `elemento.textContent = valor`.
- Para a lista de previsão: criamos elementos com `document.createElement("li")`, preenchemos e usamos `append`.
- `classList.toggle("night", !isDay)` adiciona a classe se a condição for verdadeira e remove se for falsa.

### 4.9 Estado de carregamento
`setLoading(true)` desabilita os botões e mostra "Carregando...". O `finally` garante que `setLoading(false)` roda **com sucesso ou com erro** — senão os botões poderiam ficar travados para sempre.

### 4.10 Condição de corrida (race condition) ⭐
**Problema:** o usuário busca "Manaus" (internet lenta) e logo depois "Recife" (rápida). A resposta de Recife chega primeiro e aparece; depois chega a de Manaus e **sobrescreve** — a tela mostra Manaus, mas o usuário pediu Recife.

**Solução:** um contador.
```js
let currentRequestId = 0;

async function searchCity(city) {
  const requestId = ++currentRequestId;   // esta busca é a nº X
  ...
  if (requestId !== currentRequestId) return; // chegou uma busca mais nova: ignora
}
```
> 💡 Esse é um ótimo ponto para citar em entrevista — mostra maturidade.

### 4.11 `localStorage`
Armazena texto no navegador, que **sobrevive** ao fechar a aba. Usamos para lembrar a última cidade. Envolvemos em `try/catch` porque alguns navegadores em modo anônimo bloqueiam o acesso e lançariam erro.

`localStorage` × `sessionStorage` × cookies:
- `localStorage`: persiste até ser apagado; ~5 MB; não vai para o servidor.
- `sessionStorage`: some ao fechar a aba.
- Cookies: pequenos (~4 KB) e são enviados ao servidor em toda requisição.

### 4.12 Geolocalização
`navigator.geolocation.getCurrentPosition(sucesso, erro, opções)` pede permissão ao usuário. Usa **callbacks** (funções passadas como argumento) em vez de Promise. Só funciona em **HTTPS** ou `localhost` — por isso funciona no GitHub Pages.

### 4.13 Datas sem erro de fuso horário
A API devolve datas como `"2026-11-15"`. `new Date("2026-11-15")` é interpretado como **meia-noite UTC**; no Brasil (UTC−3) isso vira **dia 14 às 21h** — o dia da semana sairia errado! A função `formatWeekday` cria a data em UTC e formata também em UTC, evitando o problema.

### 4.14 Remover duplicados com `Set`
```js
[...new Set(["Brasília", "Distrito Federal", "Brasil"])]
```
Um `Set` só guarda valores únicos. Usamos para não exibir "São Paulo, São Paulo, Brasil".

---

## 5. A API Open-Meteo

- **Por que essa API?** É gratuita e **não exige chave (API key)**. Assim não há segredo exposto no código do front-end (qualquer pessoa vê o JS de um site).
- **Geocoding:** `https://geocoding-api.open-meteo.com/v1/search?name=Recife&count=1&language=pt`
- **Forecast:** `https://api.open-meteo.com/v1/forecast?latitude=...&longitude=...&current=...&daily=...&timezone=auto`
- **`timezone=auto`**: os horários/dias vêm no fuso da cidade pesquisada, não no do usuário.
- **Códigos WMO:** o clima vem como número (0 = céu limpo, 61 = chuva leve, 95 = trovoada...). O arquivo `weatherCodes.js` traduz. Códigos desconhecidos mostram "❔ Desconhecido" em vez de quebrar.
- **`is_day`**: 1 = dia, 0 = noite. Usamos para o tema noturno e para trocar ☀️ por 🌙.

**Teste você mesmo:** cole a URL do Forecast no navegador e veja o JSON.

### O que é REST/JSON (resposta curta para entrevista)
**REST** é um estilo de API em que acessamos recursos por URLs usando métodos HTTP (GET para ler, POST para criar...). **JSON** é o formato de texto em que os dados vêm — parecido com objetos JavaScript.

---

## 5.1 Autocomplete: sugestões enquanto digita

**O que faz:** ao digitar "Rio", aparece uma lista com Rio de Janeiro, Rio Branco, Rio Grande... sem precisar terminar o nome nem clicar em Buscar.

### Como funciona
```
Usuário digita "R" ─► menos de 2 letras: não faz nada
Usuário digita "Ri" ─► inicia um timer de 300 ms
Usuário digita "Rio" (antes dos 300 ms) ─► cancela o timer e começa outro
...para de digitar 300 ms ─► busca "Rio" na API (count=5) ─► mostra a lista
Usuário escolhe "Rio Branco" ─► usa as coordenadas DESSA sugestão ─► clima
```

### Conceito 1: Debounce ⭐
Sem debounce, digitar "Florianópolis" faria **13 requisições** (uma por letra). Com debounce, faz **1**: só busca quando o usuário para de digitar.
```js
function handleInput() {
  clearTimeout(debounceTimer);                     // cancela o timer anterior
  debounceTimer = setTimeout(() => updateSuggestions(query), 300);
}
```
- `setTimeout(fn, ms)` agenda uma função para daqui a `ms` milissegundos e devolve um id.
- `clearTimeout(id)` cancela o agendamento.

> **Debounce × Throttle** (pergunta comum!): *debounce* espera o usuário **parar** (bom para busca). *Throttle* executa **no máximo uma vez a cada X ms**, mesmo se o evento continuar (bom para scroll e redimensionamento de tela).

### Conceito 2: AbortController
Mesmo com debounce, uma busca lenta pode chegar depois de uma mais nova. O `AbortController` **cancela de verdade** a requisição anterior:
```js
if (suggestionsController) suggestionsController.abort();   // cancela a antiga
suggestionsController = new AbortController();
fetch(url, { signal: suggestionsController.signal });
```
Uma requisição cancelada lança um erro com `name === "AbortError"`, que ignoramos de propósito.

> Repare: para o clima usamos um **contador** (seção 4.10) e aqui usamos o **AbortController**. Os dois resolvem *race conditions*; o AbortController ainda economiza rede, porque cancela a requisição.

### Conceito 3: usar a sugestão exata
Ao clicar em "Santa Maria – Rio Grande do Sul", usamos a latitude/longitude **daquela** sugestão (`showPlace(place)`), em vez de buscar o nome de novo (que poderia trazer outra Santa Maria). Pelo mesmo motivo, o `localStorage` agora guarda o **lugar inteiro** como JSON:
```js
localStorage.setItem(STORAGE_KEY, JSON.stringify(place)); // objeto → texto
const place = JSON.parse(localStorage.getItem(STORAGE_KEY)); // texto → objeto
```
O `localStorage` só guarda **texto**, por isso convertemos com `JSON.stringify`/`JSON.parse`.

### Conceito 4: teclado e acessibilidade
- **↑ / ↓** destacam itens (e "dão a volta" com o operador `%`), **Enter** escolhe, **Esc** fecha.
- `event.preventDefault()` no Enter impede que o formulário seja enviado quando uma sugestão está destacada.
- Usamos **`mousedown`** (e não `click`) nas sugestões: o `click` só dispara depois que o campo perde o foco (`blur`), e o `blur` fecharia a lista antes do clique contar.
- Padrão ARIA **combobox**: `role="combobox"`, `aria-expanded`, `aria-controls`, `aria-activedescendant` no input e `role="listbox"`/`role="option"` na lista. Assim o leitor de tela anuncia as sugestões.

### Conceito 5: refatoração
Antes, `searchCity` fazia tudo. Agora há uma função comum `loadWeather(getPlace)` que recebe **uma função** que devolve o lugar:
```js
const searchCity = (city) => loadWeather(() => fetchCoordinates(city)); // pelo nome
const showPlace = (place) => loadWeather(async () => place);            // lugar já conhecido
```
Isso evita duplicar o tratamento de erros, o "Carregando..." e o contador de requisições. Esse princípio se chama **DRY** (*Don't Repeat Yourself*, "não se repita").

---

## 6. Tratamento de erros

| Situação | O que acontece | Mensagem |
|---|---|---|
| Campo vazio / só espaços | Validação no submit | "Digite o nome de uma cidade." |
| Cidade não existe | API devolve sem `results` | `Cidade "X" não encontrada.` |
| API com erro (500) | `response.ok` é `false` | "Não foi possível..." |
| Sem internet | `fetch` lança `TypeError` | "Sem conexão com a internet..." |
| Localização negada | Callback de erro | "Permissão de localização negada..." |
| Código de clima desconhecido | Fallback no dicionário | "❔ Desconhecido" |

Princípio: **o usuário nunca deve ver o app quebrado ou travado** — sempre recebe uma mensagem e pode tentar de novo. O `console.error` guarda o detalhe técnico para o desenvolvedor.

---

## 7. Segurança

- **XSS (Cross-Site Scripting):** se usássemos `innerHTML` com dados externos (ex.: nome da cidade vindo da API ou do usuário), um texto como `<img src=x onerror=alert(1)>` executaria código. Usamos **`textContent`**, que trata tudo como texto puro.
- **Sem chaves no front-end:** nada no código JavaScript é secreto. Se um dia usar uma API que exige chave, ela deve ficar num back-end (servidor) ou numa função serverless.
- **`rel="noopener noreferrer"`** em links externos.
- **`maxlength="80"`** no input: limita entradas absurdas.

---

## 8. Testes automatizados

### Tipos de teste
- **Unitário:** testa uma função isolada (ex.: `formatWeekday("2026-11-15") === "dom."`).
- **Integração:** testa partes trabalhando juntas.
- **E2E (ponta a ponta):** abre o app num navegador real e age como usuário. ← **é o que fizemos**.

### Ferramentas
- **Playwright:** controla o navegador Chromium (clica, digita, lê a tela).
- **`node:test`:** executor de testes que já vem no Node.js (sem instalar Jest, por exemplo).

### Mocks (simulações)
```js
await page.route("**/api.open-meteo.com/**", (route) =>
  route.fulfill({ json: dadosFalsos })
);
```
Interceptamos as requisições e respondemos com dados falsos. Vantagens:
1. Os testes não dependem da internet nem da API estar no ar.
2. O resultado é sempre o mesmo (testes **determinísticos**).
3. Conseguimos simular erros difíceis de reproduzir (500, sem internet, noite).

### Os 18 testes
1. Carrega São Paulo ao abrir
2. Mostra 5 dias sem incluir hoje (e o dia da semana certo)
3. Pesquisa outra cidade
4. Cidade inexistente → erro
5. Só espaços → erro
6. API com erro 500 → mensagem amigável e botão volta a funcionar
7. Sem internet → mensagem específica
8. Lembra a última cidade após recarregar
9. Tema noturno
10. Geolocalização
11. Sem rolagem horizontal no celular
12. Autocomplete mostra sugestões ao digitar
13. Não busca sugestões com menos de 2 letras
14. Debounce: digitar "Recife" letra por letra faz **só 1** requisição
15. Clicar numa sugestão carrega o clima daquele lugar
16. Setas ↑ ↓ e Enter escolhem a sugestão
17. Esc fecha a lista
18. Lembra o lugar exato após recarregar, sem buscar a cidade de novo

Além disso, **todo teste falha se aparecer qualquer erro de JavaScript na página** (`pageerror`).

### Rodando
```bash
npm install
npx playwright install chromium
npm test
```

---

## 9. Git, GitHub, GitHub Pages e GitHub Actions

### Comandos Git essenciais
```bash
git status              # o que mudou?
git add .               # prepara as mudanças
git commit -m "mensagem" # salva um "ponto na história"
git push                # envia para o GitHub
git log --oneline       # histórico
git pull                # traz mudanças do GitHub
git checkout -b nova-feature  # cria uma branch
```

**Git** é o sistema de controle de versão (roda no seu PC). **GitHub** é o site que hospeda repositórios Git na nuvem.

### Mensagens de commit
Usamos o padrão **Conventional Commits**: `feat:` (funcionalidade), `fix:` (correção), `docs:` (documentação), `test:` (testes), `style:`, `refactor:`, `ci:`.

### GitHub Pages
Hospedagem gratuita de sites estáticos (HTML/CSS/JS) direto do repositório. Ativado em **Settings → Pages → Branch: main / root**. É o seu "ambiente" para acessar e testar o app online.

### GitHub Actions (CI — Integração Contínua)
O arquivo `.github/workflows/tests.yml` faz o GitHub rodar os 18 testes **automaticamente a cada push**. Se algo quebrar, aparece um ❌ no commit. Isso se chama **CI (Continuous Integration)** e é muito valorizado em vagas.

---

## 10. Bugs que encontramos e corrigimos

Contar bugs reais que você resolveu impressiona em entrevistas:

1. **Recursão infinita:** ao refatorar o `localStorage` para funções seguras, uma substituição automática fez `saveLastCity` chamar a si mesma. Corrigido e coberto pelo teste "lembra a última cidade".
2. **Capitalização errada:** `text-transform: capitalize` gerava "Parcialmente Nublado" — em português não se capitaliza cada palavra. Removido.
3. **Layout no celular:** a previsão quebrava em 3 + 2 cartões. Mudamos para 5 colunas com máxima/mínima empilhadas.
4. **Espaço vazio:** a área de mensagens ocupava espaço mesmo vazia. Resolvido com `.status:empty`.
5. **Script de teste:** `node --test tests/` não funciona no Node 22; trocamos para `tests/*.test.js`.

---

## 11. Perguntas de entrevista (com respostas)

### Sobre o projeto
**"Me fale sobre esse projeto."**
> Veja a seção 12.

**"Qual foi a maior dificuldade?"**
> Lidar com o assíncrono: encadear duas chamadas de API, tratar os vários tipos de erro e evitar que uma resposta antiga sobrescrevesse uma nova (race condition), que resolvi com um contador de requisições.

**"Por que não usou React?"**
> Quis dominar os fundamentos primeiro: DOM, eventos e fetch. Frameworks abstraem isso, e entender a base me ajuda a usar React melhor. O próximo projeto será com React.

**"O que você melhoraria?"**
> Troca °C/°F, cache das respostas para não repetir chamadas, e transformar em PWA para funcionar offline.

**"Como você implementou o autocomplete?"**
> Ao digitar, uso *debounce* de 300 ms para só chamar a API quando o usuário para de digitar, e com no mínimo 2 letras. Cancelo a requisição anterior com `AbortController` para uma resposta antiga não sobrescrever a nova. A lista funciona com mouse e teclado e segue o padrão ARIA combobox. Ao escolher, uso as coordenadas exatas da sugestão. Tudo isso está coberto por testes, incluindo um que garante que digitar "Recife" letra por letra gera só uma requisição.

### JavaScript
**"O que é debounce? E throttle?"**
> Debounce adia a execução até o evento parar de acontecer por um tempo (ex.: busca ao digitar). Throttle limita a execução a no máximo uma vez a cada intervalo (ex.: evento de scroll).

**"Diferença entre `let`, `const` e `var`?"**
> `const` não pode ser reatribuída; `let` pode. Ambas têm escopo de bloco. `var` tem escopo de função e sofre *hoisting* de forma confusa — evito usar.

**"O que é uma Promise?"**
> Um objeto que representa um valor que estará disponível no futuro. Tem três estados: *pending*, *fulfilled* e *rejected*. Usamos `.then/.catch` ou `async/await`.

**"`async/await` × `.then()`?"**
> Fazem a mesma coisa; `async/await` é uma sintaxe mais legível, parecida com código síncrono, e permite usar `try/catch`.

**"O `fetch` lança erro para 404?"**
> Não! Só para falhas de rede. Para 404/500 é preciso checar `response.ok` ou `response.status`. No meu projeto faço isso.

**"Diferença entre `==` e `===`?"**
> `===` compara valor **e** tipo, sem conversão. `==` converte tipos (`"1" == 1` é `true`). Uso sempre `===`.

**"`textContent` × `innerHTML`?"**
> `innerHTML` interpreta HTML — perigoso com dados externos (XSS). `textContent` insere texto puro. Uso `textContent` para dados da API.

**"O que é o DOM?"**
> Document Object Model: a representação da página HTML como uma árvore de objetos que o JavaScript pode ler e modificar.

**"O que é `event.preventDefault()`?"**
> Cancela o comportamento padrão do navegador. No formulário, evita o recarregamento da página.

**"O que é *event bubbling*?"**
> Um evento disparado num elemento "sobe" para os pais. Permite *event delegation*: um único listener no pai tratando vários filhos.

**"O que é callback?"**
> Uma função passada como argumento para ser chamada depois. Ex.: `getCurrentPosition(sucesso, erro)`.

### HTML/CSS
**"Por que HTML semântico?"**
> Acessibilidade, SEO e legibilidade do código.

**"Flexbox ou Grid?"**
> Flexbox para uma dimensão (barra de busca); Grid para layouts em colunas/linhas (cartões de previsão).

**"Como deixou responsivo?"**
> Meta viewport, `max-width` com `width: 100%`, unidades relativas, Grid com `fr` e media query para telas pequenas. Tenho um teste automatizado que garante que não há rolagem horizontal em 375px.

**"O que é `box-sizing: border-box`?"**
> Faz `width` incluir padding e borda, facilitando o cálculo de tamanhos.

### Web em geral
**"O que é uma API?"**
> Uma interface para sistemas conversarem. No meu caso, envio uma requisição HTTP com a cidade e recebo os dados do clima em JSON.

**"O que é CORS?"**
> Uma regra de segurança do navegador que bloqueia requisições a outro domínio, a menos que o servidor permita (com o cabeçalho `Access-Control-Allow-Origin`). A Open-Meteo permite, por isso funciona direto do front-end.

**"Códigos HTTP comuns?"**
> 200 OK, 201 Created, 400 Bad Request, 401 Não autenticado, 403 Proibido, 404 Não encontrado, 500 Erro no servidor.

**"Por que escreveu testes?"**
> Para ter segurança ao mudar o código: se algo quebrar, o teste avisa. Usei mocks para os testes serem rápidos, não dependerem da internet e simularem erros.

---

## 12. Como apresentar o projeto em 1 minuto

> "Desenvolvi um app de clima com HTML, CSS e JavaScript puro, sem frameworks, para dominar os fundamentos. Ele consome a API Open-Meteo: primeiro converte o nome da cidade em coordenadas e depois busca o clima atual e a previsão de 5 dias. Enquanto o usuário digita, aparecem sugestões de cidades, com debounce para não sobrecarregar a API. Também tem geolocalização, tema noturno automático e guarda o último lugar no localStorage.
>
> Me preocupei com a experiência em caso de erro — cidade inexistente, falha da API e falta de internet têm mensagens próprias — e com detalhes como evitar race conditions entre buscas e usar textContent para prevenir XSS. É responsivo e acessível.
>
> Por fim, escrevi 18 testes end-to-end com Playwright, simulando a API com mocks, e configurei o GitHub Actions para rodá-los a cada push. O app está publicado no GitHub Pages."

**Dica:** abra o app e o código durante a entrevista. Mostre o teste rodando (`npm test`).

---

## 13. Glossário

| Termo | Significado |
|---|---|
| API | Interface para um programa usar serviços de outro |
| AbortController | Objeto que permite cancelar um `fetch` em andamento |
| Assíncrono | Código que não bloqueia enquanto espera algo (ex.: rede) |
| Autocomplete | Sugestões que aparecem enquanto o usuário digita |
| Debounce | Esperar o evento parar por um tempo antes de executar |
| CI | Integração Contínua: testes automáticos a cada mudança |
| DOM | Árvore de objetos que representa a página |
| E2E | Teste ponta a ponta, simulando o usuário |
| Endpoint | URL específica de uma API |
| JSON | Formato de dados em texto, parecido com objetos JS |
| Mock | Simulação de uma dependência (ex.: API falsa) nos testes |
| Promise | Objeto que representa um valor futuro |
| Query string | Parte da URL após `?` com parâmetros |
| Race condition | Bug quando a ordem de eventos assíncronos muda o resultado |
| Responsivo | Layout que se adapta a vários tamanhos de tela |
| XSS | Ataque que injeta script malicioso na página |

---

## 14. Exercícios para evoluir

Faça você mesmo (e faça commits!) — isso mostra evolução no GitHub:

1. ⭐ **Botão °C/°F** — dica: parâmetro `temperature_unit=fahrenheit` na API.
2. ⭐ **Mostrar horário do nascer/pôr do sol** — parâmetros `sunrise,sunset` em `daily`.
3. ⭐⭐ **Histórico das últimas 5 cidades** clicáveis — dica: salvar um array com `JSON.stringify` no `localStorage`.
4. ✅ ~~**Autocomplete**~~ — feito! Desafio extra: destacar em negrito a parte do nome que combina com o texto digitado.
5. ⭐⭐⭐ **Escreva um teste** para cada nova funcionalidade em `tests/app.test.js`.
