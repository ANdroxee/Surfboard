// Webcams : on décrit seulement la source. L'adresse du flux le plus récent et l'heure de capture
// sont résolues côté serveur (src/lib/server/webcams.js → /api/webcam), car les caméras Viewsurf
// en « clips » changent d'identifiant à chaque nouveau clip.
// - viewsurf : `page` = page publique de la caméra sur viewsurf.com
// - skaping  : `path` + `mode` ('video' = dernier clip HD, 'live' = direct, 'pano' = photo 360°)
export const SPOTS = [
  { name: 'Lacanau', lat: 44.98, lon: -1.12, webcams: [
    { label: 'SUD DU POSTE', provider: 'viewsurf', page: 'https://www.viewsurf.com/univers/surf/vue/654-france-aquitaine-lacanau-sud-du-poste-de-secours-nord' },
    { label: 'PANORAMIQUE', provider: 'viewsurf', page: 'https://www.viewsurf.com/univers/surf/vue/7168-france-aquitaine-lacanau-panoramique-video-live' },
  ] },
  { name: 'Le Porge', lat: 44.89, lon: -1.10, webcams: [
    // le clip HD (`video`) est le plus net ; le direct est souvent voilé par les embruns
    { label: 'PLAGE NORD', provider: 'skaping', path: 'medoc-plein-sud/le-porge-ocean', mode: 'video', page: 'https://www.skaping.com/medoc-plein-sud/le-porge-ocean/video' },
    { label: 'GRESSIER', provider: 'skaping', path: 'medoc-plein-sud/le-porge-ocean', mode: 'live', page: 'https://www.skaping.com/medoc-plein-sud/le-porge-ocean/live' },
    { label: 'PANO 360', provider: 'skaping', path: 'medoc-plein-sud/le-porge-ocean', mode: 'pano', page: 'https://www.skaping.com/medoc-plein-sud/le-porge-ocean' },
  ] },
  { name: 'Hourtin', lat: 45.13, lon: -1.15, webcams: [] },
  { name: 'Montalivet', lat: 45.38, lon: -1.15, webcams: [
    { label: 'PLAGE NORD', provider: 'viewsurf', page: 'https://www.viewsurf.com/univers/surf/vue/13900-france-aquitaine-vendays-montalivet-plage-nord' },
  ] },
  { name: 'Cap Ferret', lat: 44.63, lon: -1.25, webcams: [] },
  { name: 'Hossegor', lat: 43.665, lon: -1.45, webcams: [
    { label: 'PLAGE', provider: 'viewsurf', page: 'https://www.viewsurf.com/univers/surf/vue/2058-france-aquitaine-soorts-hossegor-plage' },
  ] },
];

/** Distance à vol d'oiseau en km entre deux spots. */
export function distanceKm(a, b) {
  const R = 6371, rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad, dLon = (b.lon - a.lon) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)));
}

const W = 'https://api.open-meteo.com/v1/forecast';
const M = 'https://marine-api.open-meteo.com/v1/marine';

export async function fetchConditions(spot) {
  const [w, m] = await Promise.all([
    fetch(`${W}?latitude=${spot.lat}&longitude=${spot.lon}&current=temperature_2m,apparent_temperature,relative_humidity_2m,pressure_msl,wind_speed_10m,wind_direction_10m,wind_gusts_10m,uv_index,weather_code&hourly=temperature_2m,weather_code,wind_speed_10m,wind_direction_10m,wind_gusts_10m&daily=sunrise,sunset&wind_speed_unit=kn&timezone=Europe/Paris`).then(r => r.json()),
    fetch(`${M}?latitude=${spot.lat}&longitude=${spot.lon}&current=wave_height,wave_direction,wave_period,swell_wave_height,swell_wave_direction,swell_wave_period,sea_surface_temperature,wind_wave_height,wind_wave_period,wind_wave_direction&hourly=wave_height,wave_period,wave_direction,sea_level_height_msl&timezone=Europe/Paris&forecast_days=2`).then(r => r.json()),
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
    hourlyGusts: w.hourly?.wind_gusts_10m?.slice(0, 24) ?? [],
    waterTemp: m.current.sea_surface_temperature ?? null,
    windWaveH: m.current.wind_wave_height ?? null,
    windWavePeriod: m.current.wind_wave_period ?? null,
    windWaveDir: m.current.wind_wave_direction ?? null,
    hourlySeaLevel: m.hourly?.sea_level_height_msl?.slice(0, 48) ?? [],
    fetchedAt: new Date(),
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

/** Score de surf pour une heure donnée (index = heure du jour, 0–23). */
export function hourScore(d, i) {
  return surfScore({
    swellH: d.hourlyWaves[i] ?? d.swellH,
    swellPeriod: d.hourlyPeriod[i] ?? d.swellPeriod,
    windDir: d.hourlyWindDir[i] ?? d.windDir,
    wind: d.hourlyWind[i] ?? d.wind,
    gusts: d.hourlyGusts[i] ?? d.gusts,
  });
}
export const knToKmh = (kn) => Math.round(kn * 1.852);
export function wetsuit(t) {
  if (t == null) return '—';
  if (t >= 22) return 'Lycra / shorty';
  if (t >= 18) return 'Combi 3/2';
  if (t >= 14) return 'Combi 4/3';
  if (t >= 11) return '4/3 + chaussons';
  return '5/4 + cagoule';
}

/** Détail du score : note /10 par facteur (mêmes seuils que surfScore). */
export function scoreFactors(d, tidePos = null) {
  const h = d.swellH, p = d.swellPeriod, wkn = d.wind, g = d.gusts, wt = windType(d.windDir);
  const houle = h >= 0.5 && h <= 1.5 ? 9 : h > 1.5 && h <= 2.5 ? 7 : h > 3 ? 2 : h < 0.3 ? 2 : 5;
  const periode = p >= 12 ? 9 : p >= 9 ? 7 : p >= 6 ? 5 : 3;
  const vent = wt === 'offshore' ? (wkn > 20 ? 6 : 9) : wt === 'onshore' ? (wkn > 15 ? 2 : 4) : (wkn < 8 ? 7 : 5);
  const rafales = g < 15 ? 9 : g < 22 ? 7 : g <= 30 ? 5 : 2;
  const out = [['Houle', houle], ['Période', periode], ['Vent', vent], ['Rafales', rafales]];
  // Marée : mi-marée = idéal sur les beach breaks girondins (0 = basse, 1 = haute)
  if (tidePos != null) out.push(['Marée', Math.round((4 + 5 * (1 - Math.abs(tidePos - 0.5) * 2)) * 2) / 2]);
  return out.map(([label, v]) => ({ label, v }));
}
/** Puissance de houle en eau profonde (kW par mètre de crête) ≈ 0,49 · H² · T. */
export const wavePower = (h, t) => Math.round(0.49 * h * h * t);
