# ☁️ App de Clima

Aplicação web que mostra o **clima atual** e a **previsão para os próximos 5 dias** de qualquer cidade do mundo. Feita com **HTML, CSS e JavaScript puro** (sem frameworks), consumindo a API pública [Open-Meteo](https://open-meteo.com/).

🔗 **Acesse online:** https://moacirnascimento439.github.io/app-clima/

![Tela do app no desktop](assets/screenshot-desktop.png)

<p align="center">
  <img src="assets/screenshot-mobile.png" alt="Tela do app no celular" width="260">
  &nbsp;
  <img src="assets/screenshot-night.png" alt="Tema noturno" width="420">
</p>

## ✨ Funcionalidades

- 🔎 Busca de clima por nome da cidade (com acentos, em qualquer idioma)
- 📍 Clima da localização atual (Geolocation API do navegador)
- 🌡️ Temperatura, sensação térmica, umidade e velocidade do vento
- 📅 Previsão de 5 dias com máxima e mínima
- 🌙 Tema noturno automático quando é noite na cidade pesquisada
- 💾 Lembra a última cidade pesquisada (`localStorage`)
- ⚠️ Mensagens de erro claras: cidade inexistente, falha na API, sem internet
- 📱 Layout responsivo (celular e desktop)
- ♿ Acessibilidade: `label` no campo, `aria-live` nas mensagens, foco visível

## 🛠️ Tecnologias

| Tecnologia | Uso |
|---|---|
| HTML5 semântico | Estrutura (`main`, `header`, `section`, `form`) |
| CSS3 | Variáveis, Flexbox, Grid, media queries, animação |
| JavaScript (ES6+) | `fetch`, `async/await`, manipulação do DOM, eventos |
| Open-Meteo API | Dados de geocodificação e previsão do tempo (gratuita, sem chave) |
| Playwright + `node:test` | Testes automatizados de ponta a ponta (E2E) |
| GitHub Actions | Roda os testes automaticamente a cada push |

## 🚀 Como rodar localmente

Não é necessário instalar nada para **usar** o app: basta abrir o `index.html` no navegador.

Para rodar com um servidor local (recomendado):

```bash
git clone https://github.com/moacirnascimento439/app-clima.git
cd app-clima
npx serve .
```

Depois acesse `http://localhost:3000`.

## 🧪 Testes

O projeto tem **11 testes automatizados** que abrem o app num navegador real e simulam o uso. As respostas da API são simuladas (*mocks*), então os testes funcionam sem internet e sempre dão o mesmo resultado.

```bash
npm install
npx playwright install chromium
npm test
```

O que é testado: carregamento inicial, busca, previsão de 5 dias, cidade inexistente, campo vazio, erro 500 da API, falta de internet, memória da última cidade, tema noturno, geolocalização e ausência de rolagem horizontal no celular.

## 📁 Estrutura

```
app-clima/
├── index.html            # Estrutura da página
├── css/style.css         # Estilos
├── js/
│   ├── weatherCodes.js   # Tradução dos códigos de clima em texto/ícone
│   └── script.js         # Lógica: API, DOM e eventos
├── tests/app.test.js     # Testes E2E
├── assets/               # Favicon e screenshots
└── .github/workflows/    # CI com GitHub Actions
```

## 📚 Aprendizados

- Consumir APIs REST com `fetch` e `async/await`, encadeando duas chamadas (cidade → coordenadas → clima)
- Tratar erros de rede e de resposta (`response.ok`) com `try/catch/finally`
- Evitar *race conditions* quando o usuário faz várias buscas seguidas
- Usar `textContent` em vez de `innerHTML` para evitar injeção de HTML (XSS)
- Escrever testes E2E com mocks de rede

## 🔮 Próximos passos

- [ ] Sugestões de cidades enquanto digita (autocomplete)
- [ ] Alternar entre °C e °F
- [ ] Gráfico de temperatura por hora

## 👤 Autor

Feito por **Moacir de Jesus Nascimento** — [LinkedIn](https://www.linkedin.com/in/moacir-nascimento2003/) · [GitHub](https://github.com/moacirnascimento439)

## 📄 Licença

[MIT](LICENSE)
