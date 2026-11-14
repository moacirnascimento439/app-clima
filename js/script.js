// ============================================================
// App de Clima — JavaScript puro (sem frameworks)
// APIs usadas (gratuitas e sem chave):
//   - Geocoding: transforma o nome da cidade em latitude/longitude
//   - Forecast:  devolve o clima atual e a previsão dos próximos dias
// ============================================================

const GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search";
const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";
const STORAGE_KEY = "app-clima:ultima-cidade";
const FORECAST_DAYS = 5;

// ---------- Seleção de elementos do DOM ----------
const form = document.getElementById("search-form");
const cityInput = document.getElementById("city-input");
const searchButton = document.getElementById("search-button");
const locationButton = document.getElementById("location-button");
const statusEl = document.getElementById("status");
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

// ---------- localStorage seguro ----------
// Em modo anônimo alguns navegadores bloqueiam o localStorage e lançam erro.
function saveLastCity(city) {
  try {
    localStorage.setItem(STORAGE_KEY, city);
  } catch {
    // sem problema: o app funciona sem salvar
  }
}

function loadLastCity() {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

// ---------- Funções de API ----------

/**
 * Busca as coordenadas de uma cidade pelo nome.
 * @returns {Promise<{name, latitude, longitude, country, admin1}>}
 */
async function fetchCoordinates(city) {
  const params = new URLSearchParams({
    name: city,
    count: 1,
    language: "pt",
    format: "json",
  });

  const response = await fetch(`${GEOCODING_URL}?${params}`);
  if (!response.ok) {
    throw new Error("Não foi possível buscar a cidade. Tente novamente.");
  }

  const data = await response.json();
  if (!data.results || data.results.length === 0) {
    throw new Error(`Cidade "${city}" não encontrada.`);
  }

  return data.results[0];
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

// ---------- Fluxos principais ----------

async function searchCity(city) {
  const requestId = ++currentRequestId;
  setLoading(true);

  try {
    const place = await fetchCoordinates(city);
    const weather = await fetchWeather(place.latitude, place.longitude);

    if (requestId !== currentRequestId) return; // resposta antiga: ignora

    renderWeather(formatPlaceName(place), weather);
    clearStatus();
    saveLastCity(city);
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
  const city = cityInput.value.trim();

  if (!city) {
    showStatus("Digite o nome de uma cidade.", true);
    return;
  }

  searchCity(city);
});

locationButton.addEventListener("click", useMyLocation);

// Ao abrir o app, carrega a última cidade pesquisada (ou uma padrão)
const lastCity = loadLastCity() || "São Paulo";
cityInput.value = lastCity;
searchCity(lastCity);
