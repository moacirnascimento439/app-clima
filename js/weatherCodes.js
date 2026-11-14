// Tabela que traduz os códigos WMO (usados pela Open-Meteo) em texto e ícone.
// Referência: https://open-meteo.com/en/docs (seção "WMO Weather interpretation codes")
const WEATHER_CODES = {
  0: { text: "Céu limpo", icon: "☀️", nightIcon: "🌙" },
  1: { text: "Predominantemente limpo", icon: "🌤️", nightIcon: "🌙" },
  2: { text: "Parcialmente nublado", icon: "⛅", nightIcon: "☁️" },
  3: { text: "Nublado", icon: "☁️" },
  45: { text: "Neblina", icon: "🌫️" },
  48: { text: "Neblina com geada", icon: "🌫️" },
  51: { text: "Garoa leve", icon: "🌦️" },
  53: { text: "Garoa moderada", icon: "🌦️" },
  55: { text: "Garoa intensa", icon: "🌧️" },
  56: { text: "Garoa congelante leve", icon: "🌧️" },
  57: { text: "Garoa congelante intensa", icon: "🌧️" },
  61: { text: "Chuva leve", icon: "🌧️" },
  63: { text: "Chuva moderada", icon: "🌧️" },
  65: { text: "Chuva forte", icon: "🌧️" },
  66: { text: "Chuva congelante leve", icon: "🌧️" },
  67: { text: "Chuva congelante forte", icon: "🌧️" },
  71: { text: "Neve leve", icon: "🌨️" },
  73: { text: "Neve moderada", icon: "🌨️" },
  75: { text: "Neve forte", icon: "❄️" },
  77: { text: "Grãos de neve", icon: "🌨️" },
  80: { text: "Pancadas de chuva leves", icon: "🌦️" },
  81: { text: "Pancadas de chuva moderadas", icon: "🌧️" },
  82: { text: "Pancadas de chuva violentas", icon: "⛈️" },
  85: { text: "Pancadas de neve leves", icon: "🌨️" },
  86: { text: "Pancadas de neve fortes", icon: "❄️" },
  95: { text: "Trovoada", icon: "⛈️" },
  96: { text: "Trovoada com granizo leve", icon: "⛈️" },
  99: { text: "Trovoada com granizo forte", icon: "⛈️" },
};

/**
 * Devolve a descrição e o ícone de um código de clima.
 * @param {number} code - código WMO
 * @param {boolean} isDay - true se for dia
 */
function getWeatherInfo(code, isDay = true) {
  const info = WEATHER_CODES[code] || { text: "Desconhecido", icon: "❔" };
  const icon = !isDay && info.nightIcon ? info.nightIcon : info.icon;
  return { text: info.text, icon };
}
