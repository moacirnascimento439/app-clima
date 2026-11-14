// Testes end-to-end (E2E): abrem o app num navegador de verdade (Chromium)
// e simulam o que um usuário faria. As respostas da API são "mockadas"
// (simuladas), então os testes não dependem da internet e são previsíveis.
//
// Rodar: npm test

const { test, before, after, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("playwright");

const ROOT = path.join(__dirname, "..");
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css",
  ".js": "text/javascript",
  ".svg": "image/svg+xml",
};

// ---------- Dados falsos (mocks) ----------
const CITIES = {
  "são paulo": { name: "São Paulo", admin1: "São Paulo", country: "Brasil", latitude: -23.55, longitude: -46.63 },
  "rio de janeiro": { name: "Rio de Janeiro", admin1: "Rio de Janeiro", country: "Brasil", latitude: -22.9, longitude: -43.2 },
};

function forecastFor(lat, { isDay = 1 } = {}) {
  const temp = lat < -23 ? 22.4 : 31.6; // SP mais frio que o Rio
  return {
    current: {
      temperature_2m: temp,
      apparent_temperature: temp + 1,
      relative_humidity_2m: 70,
      wind_speed_10m: 12.3,
      weather_code: 2,
      is_day: isDay,
    },
    daily: {
      time: ["2026-11-14", "2026-11-15", "2026-11-16", "2026-11-17", "2026-11-18", "2026-11-19"],
      weather_code: [2, 0, 61, 95, 3, 999],
      temperature_2m_max: [25, 27, 21, 23, 24, 26],
      temperature_2m_min: [15, 16, 14, 15, 16, 17],
    },
  };
}

// ---------- Infra de teste ----------
let server, baseURL, browser, context, page, consoleErrors;
let apiMode; // "ok" | "fail" | "offline" | "night"

before(async () => {
  server = http.createServer((req, res) => {
    const urlPath = req.url.split("?")[0];
    const file = path.join(ROOT, urlPath === "/" ? "index.html" : urlPath);
    if (!file.startsWith(ROOT) || !fs.existsSync(file)) {
      res.writeHead(404).end();
      return;
    }
    res.writeHead(200, { "Content-Type": MIME[path.extname(file)] || "text/plain" });
    fs.createReadStream(file).pipe(res);
  });
  await new Promise((resolve) => server.listen(0, resolve));
  baseURL = `http://localhost:${server.address().port}`;
  browser = await chromium.launch();
});

after(async () => {
  await browser.close();
  server.close();
});

beforeEach(async () => {
  apiMode = "ok";
  consoleErrors = [];
  context = await browser.newContext({ locale: "pt-BR" });
  page = await context.newPage();
  page.on("pageerror", (err) => consoleErrors.push(err.message));

  await page.route("**/geocoding-api.open-meteo.com/**", (route) => {
    if (apiMode === "offline") return route.abort();
    if (apiMode === "fail") return route.fulfill({ status: 500, body: "erro" });
    const name = new URL(route.request().url()).searchParams.get("name").toLowerCase();
    const city = CITIES[name];
    return route.fulfill({ json: city ? { results: [city] } : {} });
  });

  await page.route("**/api.open-meteo.com/**", (route) => {
    if (apiMode === "offline") return route.abort();
    if (apiMode === "fail") return route.fulfill({ status: 500, body: "erro" });
    const lat = Number(new URL(route.request().url()).searchParams.get("latitude"));
    return route.fulfill({ json: forecastFor(lat, { isDay: apiMode === "night" ? 0 : 1 }) });
  });
});

afterEach(async () => {
  assert.deepEqual(consoleErrors, [], "não deve haver erros de JavaScript na página");
  await context.close();
});

async function search(city) {
  await page.fill("#city-input", city);
  await page.click("#search-button");
}

// ---------- Testes ----------

test("carrega São Paulo por padrão ao abrir o app", async () => {
  await page.goto(baseURL);
  await page.waitForSelector("#weather:not(.hidden)");
  assert.equal(await page.textContent("#weather-city"), "São Paulo, Brasil");
  assert.equal(await page.textContent("#weather-temp"), "22");
  assert.equal(await page.textContent("#weather-description"), "Parcialmente nublado");
  assert.equal(await page.textContent("#weather-feels"), "23°C");
  assert.equal(await page.textContent("#weather-humidity"), "70%");
  assert.equal(await page.textContent("#weather-wind"), "12 km/h");
});

test("mostra 5 dias de previsão, sem incluir hoje", async () => {
  await page.goto(baseURL);
  await page.waitForSelector("#weather:not(.hidden)");
  const days = await page.locator(".forecast__day").allTextContents();
  assert.equal(days.length, 5);
  assert.match(days[0], /^dom\./); // 15/11/2026 é domingo
  assert.match(days[0], /27°/);
  assert.match(days[4], /❔/); // código desconhecido não quebra o app
});

test("pesquisa outra cidade e atualiza os dados", async () => {
  await page.goto(baseURL);
  await page.waitForSelector("#weather:not(.hidden)");
  await search("Rio de Janeiro");
  await page.waitForFunction(() => document.querySelector("#weather-city").textContent.startsWith("Rio"));
  assert.equal(await page.textContent("#weather-temp"), "32");
});

test("mostra erro quando a cidade não existe", async () => {
  await page.goto(baseURL);
  await page.waitForSelector("#weather:not(.hidden)");
  await search("Cidadeinexistente");
  await page.waitForSelector(".status--error");
  assert.equal(await page.textContent("#status"), 'Cidade "Cidadeinexistente" não encontrada.');
  assert.equal(await page.isVisible("#weather"), false);
});

test("mostra erro quando o campo contém só espaços", async () => {
  await page.goto(baseURL);
  await page.waitForSelector("#weather:not(.hidden)");
  await search("   ");
  assert.equal(await page.textContent("#status"), "Digite o nome de uma cidade.");
});

test("mostra erro amigável quando a API falha (500)", async () => {
  apiMode = "fail";
  await page.goto(baseURL);
  await page.waitForSelector(".status--error");
  assert.match(await page.textContent("#status"), /Não foi possível/);
  assert.equal(await page.isDisabled("#search-button"), false, "botão volta a ficar ativo");
});

test("mostra mensagem de falta de internet", async () => {
  apiMode = "offline";
  await page.goto(baseURL);
  await page.waitForSelector(".status--error");
  assert.equal(await page.textContent("#status"), "Sem conexão com a internet. Verifique sua rede.");
});

test("lembra a última cidade pesquisada após recarregar", async () => {
  await page.goto(baseURL);
  await page.waitForSelector("#weather:not(.hidden)");
  await search("Rio de Janeiro");
  await page.waitForFunction(() => document.querySelector("#weather-city").textContent.startsWith("Rio"));
  await page.reload();
  await page.waitForSelector("#weather:not(.hidden)");
  assert.equal(await page.inputValue("#city-input"), "Rio de Janeiro");
  assert.match(await page.textContent("#weather-city"), /^Rio de Janeiro/);
});

test("aplica tema noturno quando é noite", async () => {
  apiMode = "night";
  await page.goto(baseURL);
  await page.waitForSelector("#weather:not(.hidden)");
  assert.equal(await page.evaluate(() => document.body.classList.contains("night")), true);
  assert.equal(await page.textContent("#weather-icon"), "☁️");
});

test("usa a geolocalização do navegador", async () => {
  await context.grantPermissions(["geolocation"]);
  await context.setGeolocation({ latitude: -22.9, longitude: -43.2 });
  await page.goto(baseURL);
  await page.waitForSelector("#weather:not(.hidden)");
  await page.click("#location-button");
  await page.waitForFunction(() => document.querySelector("#weather-city").textContent === "Sua localização");
  assert.equal(await page.textContent("#weather-temp"), "32");
});

test("não tem rolagem horizontal no celular (375px)", async () => {
  await page.setViewportSize({ width: 375, height: 700 });
  await page.goto(baseURL);
  await page.waitForSelector("#weather:not(.hidden)");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  assert.equal(overflow, false);
});
