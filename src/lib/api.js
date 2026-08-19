export const SPOTS = [
  { name: 'Lacanau', lat: 44.98, lon: -1.12, webcam: true },
  { name: 'Le Porge', lat: 44.89, lon: -1.10, webcam: false },
  { name: 'Hourtin', lat: 45.13, lon: -1.15, webcam: false },
  { name: 'Montalivet', lat: 45.38, lon: -1.15, webcam: false },
  { name: 'Cap Ferret', lat: 44.63, lon: -1.25, webcam: false },
];

const W = 'https://api.open-meteo.com/v1/forecast';
const M = 'https://marine-api.open-meteo.com/v1/marine';

export async function fetchConditions(spot) {
  const [w, m] = await Promise.all([
    fetch(`${W}?latitude=${spot.lat}&longitude=${spot.lon}&current=temperature_2m,apparent_temperature,relative_humidity_2m,pressure_msl,wind_speed_10m,wind_direction_10m,wind_gusts_10m,uv_index,weather_code&hourly=temperature_2m,weather_code,wind_speed_10m,wind_direction_10m&daily=sunrise,sunset&wind_speed_unit=kn&timezone=Europe/Paris`).then(r => r.json()),
    fetch(`${M}?latitude=${spot.lat}&longitude=${spot.lon}&current=wave_height,wave_direction,wave_period,swell_wave_height,swell_wave_direction,swell_wave_period&hourly=wave_height,wave_period,wave_direction&timezone=Europe/Paris`).then(r => r.json()),
  ]);
  return {
    temp: Math.round(w.current.temperature_2m),
    felt: Math.round(w.current.apparent_temperature),
    humidity: Math.round(w.current.relative_humidity_2m),
    pressure: Math.round(w.current.pressure_msl),
    wind: Math.round(w.current.wind_speed_10m),
    windDir: Math.round(w.current.wind_direction_10m),
    gusts: Math.round(w.current.wind_gusts_10m),
    uv: Math.round(w.current.uv_index),
    code: w.current.weather_code,
    sunrise: w.daily?.sunrise?.[0]?.split('T')[1]?.slice(0,5) ?? '--:--',
    sunset: w.daily?.sunset?.[0]?.split('T')[1]?.slice(0,5) ?? '--:--',
    swellH: m.current.swell_wave_height ?? m.current.wave_height ?? 0,
    swellPeriod: m.current.swell_wave_period ?? m.current.wave_period ?? 0,
    swellDir: m.current.swell_wave_direction ?? m.current.wave_direction ?? 0,
    waveH: m.current.wave_height ?? 0,
    wavePeriod: m.current.wave_period ?? 0,
    hourlyWaves: m.hourly?.wave_height?.slice(0, 24) ?? [],
    hourlyPeriod: m.hourly?.wave_period?.slice(0, 24) ?? [],
    hourlyWaveDir: m.hourly?.wave_direction?.slice(0, 24) ?? [],
    hourlyTemp: w.hourly?.temperature_2m?.slice(0, 24) ?? [],
    hourlyCode: w.hourly?.weather_code?.slice(0, 24) ?? [],
    hourlyWind: w.hourly?.wind_speed_10m?.slice(0, 24) ?? [],
    hourlyWindDir: w.hourly?.wind_direction_10m?.slice(0, 24) ?? [],
  };
}
export function windLabel(deg) {
  const d = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSO','SO','OSO','O','ONO','NO','NNO'];
  return d[Math.round(deg / 22.5) % 16];
}
export function windLabelFull(deg) {
  if (deg >= 337 || deg < 23) return 'Nord';
  if (deg < 68) return 'Nord-Est';
  if (deg < 113) return 'Est';
  if (deg < 158) return 'Sud-Est';
  if (deg < 203) return 'Sud';
  if (deg < 248) return 'Sud-Ouest';
  if (deg < 293) return 'Ouest';
  return 'Nord-Ouest';
}
export function windType(deg) {
  if (deg >= 45 && deg <= 135) return 'offshore';
  if (deg >= 225 && deg <= 315) return 'onshore';
  return 'cross';
}
export function surfScore(d) {
  let s = 5;
  if (d.swellH >= 0.5 && d.swellH <= 1.5) s += 2;
  else if (d.swellH > 1.5 && d.swellH <= 2.5) s += 1;
  else if (d.swellH > 3) s -= 2;
  else if (d.swellH < 0.3) s -= 2;
  if (d.swellPeriod >= 12) s += 1.5;
  else if (d.swellPeriod >= 9) s += 0.5;
  else if (d.swellPeriod < 6) s -= 1;
  if (d.windDir >= 45 && d.windDir <= 135) s += 1.5;
  else if (d.windDir >= 225 && d.windDir <= 315 && d.wind > 15) s -= 2;
  if (d.gusts > 30) s -= 1.5;
  else if (d.wind < 8) s += 0.5;
  return Math.round(Math.max(0, Math.min(10, s)) * 10) / 10;
}
export function qualityStars(s) {
  if (s >= 8) return 5; if (s >= 7) return 4; if (s >= 5) return 3; if (s >= 3) return 2; return 1;
}
export function ratingLabel(s) {
  if (s >= 7) return { text: 'BON', color: '#1D9E75' };
  if (s >= 5) return { text: 'MOYEN', color: '#E5A820' };
  return { text: 'FAIBLE', color: '#E24B4A' };
}
export function uvLabel(v) {
  if (v >= 8) return 'Très élevé'; if (v >= 6) return 'Élevé'; if (v >= 3) return 'Modéré'; return 'Faible';
}
export const WEATHER = { 0:'☀️',1:'🌤',2:'⛅',3:'☁️',45:'🌫',51:'🌦',53:'🌦',61:'🌧',63:'🌧',80:'🌦',95:'⛈' };
export const NIGHT = { 0:'🌙',1:'🌙',2:'☁️',3:'☁️',45:'🌫',51:'🌦',61:'🌧',80:'🌦',95:'⛈' };
export const WEATHER_LABEL = { 0:'Ciel dégagé',1:'Peu nuageux',2:'Partiellement nuageux',3:'Couvert',45:'Brouillard',51:'Bruine',61:'Pluie légère',63:'Pluie',80:'Averses',95:'Orage' };
