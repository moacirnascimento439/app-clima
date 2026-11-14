// ============================================================
// App de Clima — JavaScript puro (sem frameworks)
// APIs usadas (gratuitas e sem chave):
//   - Geocoding: transforma o nome da cidade em latitude/longitude
//   - Forecast:  devolve o clima atual e a previsão dos próximos dias
// ============================================================

const GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search";
const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";
const STORAGE_KEY = "app-clima:ultimo-local";
const SUGGESTIONS_LIMIT = 5;
const SUGGESTIONS_MIN_CHARS = 2;
const DEBOUNCE_MS = 300;
const FORECAST_DAYS = 5;

// ---------- Seleção de elementos do DOM ----------
const form = document.getElementById("search-form");
const cityInput = document.getElementById("city-input");
const searchButton = document.getElementById("search-button");
const locationButton = document.getElementById("location-button");
const statusEl = document.getElementById("status");
const suggestionsEl = document.getElementById("suggestions");
const weatherEl = document.getElementById("weather");

const cityEl = document.getElementById("weather-city");
const descriptionEl = document.getElementById("weather-description");
const iconEl = document.getElementById("weather-icon");
const tempEl = document.getElementById("weather-temp");
const feelsEl = document.getElementById("weather-feels");
const humidityEl = document.getElementById("weather-humidity");
const windEl = document.getElementById("weather-wind");
const forecastEl = document.getElementById("forecast");

// Cada busca recebe um número. Se o usuário fizer duas buscas seguidas,
// ignoramos a resposta da busca antiga (evita "condição de corrida").
let currentRequestId = 0;

// Estado do autocomplete
let suggestions = [];           // lugares exibidos na lista
let activeIndex = -1;           // item destacado pelo teclado (-1 = nenhum)
let debounceTimer = null;       // timer do debounce
let suggestionsController = null; // AbortController da busca de sugestões

// ---------- localStorage seguro ----------
// Guardamos o lugar inteiro (nome + coordenadas) como JSON.
// Em modo anônimo alguns navegadores bloqueiam o localStorage e lançam erro.
function saveLastPlace(place) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(place));
  } catch {
    // sem problema: o app funciona sem salvar
  }
}

function loadLastPlace() {
  try {
    const place = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return place && typeof place.latitude === "number" ? place : null;
  } catch {
    return null; // nada salvo, JSON inválido ou localStorage bloqueado
  }
}

// ---------- Funções de API ----------

/**
 * Busca cidades cujo nome combina com o texto digitado.
 * @param {string} query - texto digitado
 * @param {number} count - quantidade máxima de resultados
 * @param {AbortSignal} [signal] - permite cancelar a requisição
 * @returns {Promise<Array<{name, latitude, longitude, country, admin1}>>}
 */
async function fetchPlaces(query, count, signal) {
  const params = new URLSearchParams({
    name: query,
    count,
    language: "pt",
    format: "json",
  });

  const response = await fetch(`${GEOCODING_URL}?${params}`, { signal });
  if (!response.ok) {
    throw new Error("Não foi possível buscar a cidade. Tente novamente.");
  }

  const data = await response.json();
  return data.results || []; // a API omite "results" quando não acha nada
}

/** Busca a cidade mais relevante para o nome digitado. */
async function fetchCoordinates(city) {
  const [place] = await fetchPlaces(city, 1);
  if (!place) {
    throw new Error(`Cidade "${city}" não encontrada.`);
  }
  return place;
}

/**
 * Busca o clima atual e a previsão diária para uma coordenada.
 */
async function fetchWeather(latitude, longitude) {
  const params = new URLSearchParams({
    latitude,
    longitude,
    current: "temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code,is_day",
    daily: "weather_code,temperature_2m_max,temperature_2m_min",
    timezone: "auto",
    forecast_days: FORECAST_DAYS + 1, // +1 porque o primeiro dia é hoje
  });

  const response = await fetch(`${FORECAST_URL}?${params}`);
  if (!response.ok) {
    throw new Error("Não foi possível carregar o clima. Tente novamente.");
  }

  return response.json();
}

// ---------- Funções de interface (UI) ----------

function setLoading(isLoading) {
  searchButton.disabled = isLoading;
  locationButton.disabled = isLoading;
  if (isLoading) {
    showStatus("Carregando...");
  }
}

function showStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.classList.toggle("status--error", isError);
}

function clearStatus() {
  showStatus("");
}

/** Converte "2026-11-14" em "sáb." sem erro de fuso horário. */
function formatWeekday(isoDate) {
  const [year, month, day] = isoDate.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.toLocaleDateString("pt-BR", { weekday: "short", timeZone: "UTC" });
}

function renderWeather(placeName, data) {
  const current = data.current;
  const isDay = current.is_day === 1;
  const info = getWeatherInfo(current.weather_code, isDay);

  // textContent (e não innerHTML) evita injeção de HTML vindo de dados externos
  cityEl.textContent = placeName;
  descriptionEl.textContent = info.text;
  iconEl.textContent = info.icon;
  tempEl.textContent = Math.round(current.temperature_2m);
  feelsEl.textContent = `${Math.round(current.apparent_temperature)}°C`;
  humidityEl.textContent = `${current.relative_humidity_2m}%`;
  windEl.textContent = `${Math.round(current.wind_speed_10m)} km/h`;

  document.body.classList.toggle("night", !isDay);

  renderForecast(data.daily);
  weatherEl.classList.remove("hidden");
}

function renderForecast(daily) {
  forecastEl.innerHTML = ""; // limpa a previsão anterior (conteúdo nosso, seguro)

  // Começa no índice 1 para pular o dia de hoje
  for (let i = 1; i < daily.time.length; i++) {
    const info = getWeatherInfo(daily.weather_code[i]);

    const li = document.createElement("li");
    li.className = "forecast__day";
    li.title = info.text;

    const day = document.createElement("span");
    day.textContent = formatWeekday(daily.time[i]);

    const icon = document.createElement("span");
    icon.className = "forecast__icon";
    icon.textContent = info.icon;

    const max = document.createElement("span");
    max.className = "forecast__max";
    max.textContent = `${Math.round(daily.temperature_2m_max[i])}°`;

    const min = document.createElement("span");
    min.className = "forecast__min";
    min.textContent = ` ${Math.round(daily.temperature_2m_min[i])}°`;

    li.append(day, icon, max, min);
    forecastEl.appendChild(li);
  }
}

/** Monta "São Paulo, SP, Brasil" sem repetir partes vazias ou iguais. */
function formatPlaceName(place) {
  const parts = [place.name, place.admin1, place.country].filter(Boolean);
  return [...new Set(parts)].join(", ");
}

// ---------- Autocomplete (sugestões enquanto digita) ----------

function hideSuggestions() {
  clearTimeout(debounceTimer);
  if (suggestionsController) suggestionsController.abort();
  suggestions = [];
  activeIndex = -1;
  suggestionsEl.innerHTML = "";
  suggestionsEl.classList.add("hidden");
  cityInput.setAttribute("aria-expanded", "false");
  cityInput.removeAttribute("aria-activedescendant");
}

function renderSuggestions(places) {
  suggestions = places;
  activeIndex = -1;
  suggestionsEl.innerHTML = "";

  if (places.length === 0) {
    hideSuggestions();
    return;
  }

  places.forEach((place, index) => {
    const li = document.createElement("li");
    li.id = `suggestion-${index}`;
    li.className = "suggestions__item";
    li.setAttribute("role", "option");
    li.setAttribute("aria-selected", "false");

    const name = document.createElement("span");
    name.className = "suggestions__name";
    name.textContent = place.name;

    const region = document.createElement("span");
    region.className = "suggestions__region";
    region.textContent = [place.admin1, place.country].filter(Boolean).join(", ");

    li.append(name, region);

    // mousedown (e não click) dispara ANTES de o input perder o foco
    li.addEventListener("mousedown", (event) => {
      event.preventDefault();
      selectSuggestion(index);
    });

    suggestionsEl.appendChild(li);
  });

  suggestionsEl.classList.remove("hidden");
  cityInput.setAttribute("aria-expanded", "true");
}

/** Destaca um item da lista (navegação com as setas). */
function highlightSuggestion(index) {
  const items = suggestionsEl.children;
  if (items.length === 0) return;

  // Faz a seleção "dar a volta": depois do último vem o primeiro
  activeIndex = (index + items.length) % items.length;

  [...items].forEach((item, i) => {
    const isActive = i === activeIndex;
    item.classList.toggle("suggestions__item--active", isActive);
    item.setAttribute("aria-selected", String(isActive));
  });
  cityInput.setAttribute("aria-activedescendant", items[activeIndex].id);
}

function selectSuggestion(index) {
  const place = suggestions[index];
  if (!place) return;
  cityInput.value = place.name;
  hideSuggestions();
  showPlace(place);
}

async function updateSuggestions(query) {
  // Cancela a busca anterior: só a mais recente importa
  if (suggestionsController) suggestionsController.abort();
  suggestionsController = new AbortController();

  try {
    const places = await fetchPlaces(query, SUGGESTIONS_LIMIT, suggestionsController.signal);
    // O usuário pode ter apagado o texto enquanto a resposta chegava
    if (cityInput.value.trim() !== query) return;
    renderSuggestions(places);
  } catch (error) {
    // AbortError é esperado (busca cancelada). Outros erros: só escondemos a
    // lista — o usuário ainda pode buscar normalmente pelo botão.
    if (error.name !== "AbortError") hideSuggestions();
  }
}

function handleInput() {
  const query = cityInput.value.trim();
  clearTimeout(debounceTimer);

  if (query.length < SUGGESTIONS_MIN_CHARS) {
    hideSuggestions();
    return;
  }

  // Debounce: só busca quando o usuário para de digitar por DEBOUNCE_MS
  debounceTimer = setTimeout(() => updateSuggestions(query), DEBOUNCE_MS);
}

function handleKeydown(event) {
  const isOpen = suggestions.length > 0;

  if (event.key === "ArrowDown" && isOpen) {
    event.preventDefault(); // evita mover o cursor do texto
    highlightSuggestion(activeIndex + 1);
  } else if (event.key === "ArrowUp" && isOpen) {
    event.preventDefault();
    highlightSuggestion(activeIndex - 1);
  } else if (event.key === "Enter" && isOpen && activeIndex >= 0) {
    event.preventDefault(); // não envia o formulário: escolhe a sugestão
    selectSuggestion(activeIndex);
  } else if (event.key === "Escape") {
    hideSuggestions();
  }
}

// ---------- Fluxos principais ----------

/**
 * Fluxo comum: obtém o lugar, busca o clima e mostra na tela.
 * @param {() => Promise<object>} getPlace - função que devolve o lugar
 */
async function loadWeather(getPlace) {
  const requestId = ++currentRequestId;
  setLoading(true);

  try {
    const place = await getPlace();
    const weather = await fetchWeather(place.latitude, place.longitude);

    if (requestId !== currentRequestId) return; // resposta antiga: ignora

    renderWeather(formatPlaceName(place), weather);
    clearStatus();
    saveLastPlace(place);
  } catch (error) {
    if (requestId !== currentRequestId) return;
    console.error(error);
    weatherEl.classList.add("hidden");
    // TypeError em fetch normalmente significa falta de internet
    const message = error instanceof TypeError
      ? "Sem conexão com a internet. Verifique sua rede."
      : error.message;
    showStatus(message, true);
  } finally {
    if (requestId === currentRequestId) setLoading(false);
  }
}

/** Busca pelo nome digitado (usa o resultado mais relevante). */
function searchCity(city) {
  return loadWeather(() => fetchCoordinates(city));
}

/** Mostra um lugar já conhecido (sugestão escolhida ou último salvo). */
function showPlace(place) {
  return loadWeather(async () => place);
}

async function searchByCoordinates(latitude, longitude) {
  const requestId = ++currentRequestId;
  setLoading(true);

  try {
    const weather = await fetchWeather(latitude, longitude);
    if (requestId !== currentRequestId) return;
    renderWeather("Sua localização", weather);
    clearStatus();
  } catch (error) {
    if (requestId !== currentRequestId) return;
    console.error(error);
    showStatus("Não foi possível carregar o clima da sua localização.", true);
  } finally {
    if (requestId === currentRequestId) setLoading(false);
  }
}

function useMyLocation() {
  if (!("geolocation" in navigator)) {
    showStatus("Seu navegador não suporta geolocalização.", true);
    return;
  }

  showStatus("Obtendo sua localização...");
  navigator.geolocation.getCurrentPosition(
    (position) => {
      const { latitude, longitude } = position.coords;
      searchByCoordinates(latitude, longitude);
    },
    () => {
      showStatus("Permissão de localização negada ou indisponível.", true);
    },
    { timeout: 10000 }
  );
}

// ---------- Eventos ----------

form.addEventListener("submit", (event) => {
  event.preventDefault(); // impede o recarregamento da página
  hideSuggestions();
  const city = cityInput.value.trim();

  if (!city) {
    showStatus("Digite o nome de uma cidade.", true);
    return;
  }

  searchCity(city);
});

locationButton.addEventListener("click", useMyLocation);
cityInput.addEventListener("input", handleInput);
cityInput.addEventListener("keydown", handleKeydown);
cityInput.addEventListener("blur", hideSuggestions);

// Ao abrir o app, carrega o último lugar pesquisado (ou São Paulo)
const lastPlace = loadLastPlace();
if (lastPlace) {
  cityInput.value = lastPlace.name;
  showPlace(lastPlace);
} else {
  cityInput.value = "São Paulo";
  searchCity("São Paulo");
}
