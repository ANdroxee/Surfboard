<script>
  import { onMount } from 'svelte';
  import { SPOTS, fetchConditions, windLabel, windLabelFull, windType, surfScore, qualityStars, ratingLabel, uvLabel, WEATHER, NIGHT, WEATHER_LABEL } from '$lib/api.js';
  import WindCompass from '$lib/components/WindCompass.svelte';
  import WaveChart from '$lib/components/WaveChart.svelte';

  let spotIdx = $state(0);
  let data = $state(null);
  let loading = $state(true);
  let activeNav = $state(0);
  let webcamTs = $state(Date.now());
  let allSpotsData = $state({});

  let spot = $derived(SPOTS[spotIdx]);
  let score = $derived(data ? surfScore(data) : 0);
  let stars = $derived(qualityStars(score));
  let wt = $derived(data ? windType(data.windDir) : 'cross');
  let currentHour = $derived(new Date().getHours());

  let nearby = $derived(SPOTS.map((s, idx) => {
    const d = allSpotsData[s.name];
    if (d) {
      const sc = surfScore(d);
      const rl = ratingLabel(sc);
      return { ...s, idx, wv: d.swellH.toFixed(1), per: Math.round(d.swellPeriod), score: sc, ...rl, wind: d.wind, windDir: d.windDir, gusts: d.gusts, temp: d.temp, uv: d.uv };
    }
    return { ...s, idx, wv: '—', per: '—', score: 0, text: '...', color: '#4A5568', wind: 0, windDir: 0, gusts: 0, temp: 0, uv: 0 };
  }));

  let hourlySlots = $derived.by(() => {
    if (!data) return [];
    const slots = [];
    for (let i = currentHour; i < Math.min(currentHour + 7, 24); i += 2) {
      const isN = i < 7 || i >= 21;
      const code = data.hourlyCode?.[i] ?? 0;
      slots.push({
        h: String(i).padStart(2, '0') + ':00',
        icon: isN ? (NIGHT[code] ?? '🌙') : (WEATHER[code] ?? '🌤'),
        t: Math.round(data.hourlyTemp?.[i] ?? 0),
        w: Math.round(data.hourlyWind?.[i] ?? 0),
        wd: Math.round(data.hourlyWindDir?.[i] ?? 0),
        wv: (data.hourlyWaves?.[i] ?? 0).toFixed(1),
        per: Math.round(data.hourlyPeriod?.[i] ?? 0),
      });
    }
    return slots;
  });

  let forecastFull = $derived.by(() => {
    if (!data) return [];
    const slots = [];
    for (let i = 0; i < 24; i++) {
      const isN = i < 7 || i >= 21;
      const code = data.hourlyCode?.[i] ?? 0;
      slots.push({
        h: String(i).padStart(2, '0') + 'h',
        icon: isN ? (NIGHT[code] ?? '🌙') : (WEATHER[code] ?? '🌤'),
        t: Math.round(data.hourlyTemp?.[i] ?? 0),
        w: Math.round(data.hourlyWind?.[i] ?? 0),
        wd: Math.round(data.hourlyWindDir?.[i] ?? 0),
        wv: (data.hourlyWaves?.[i] ?? 0).toFixed(1),
        per: Math.round(data.hourlyPeriod?.[i] ?? 0),
        isCurrent: i === currentHour,
      });
    }
    return slots;
  });

  const today = new Date();
  const dayNames = ['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'];
  const monthNames = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
  let dateStr = dayNames[today.getDay()] + ' ' + today.getDate() + ' ' + monthNames[today.getMonth()] + ' ' + today.getFullYear();
  const windBars = [0, 10, 20, 30, 40, 50];

  async function load() {
    loading = true;
    try { data = await fetchConditions(spot); allSpotsData[spot.name] = data; } catch (e) { console.error(e); }
    loading = false;
  }

  async function loadAllSpots() {
    for (const s of SPOTS) {
      if (!allSpotsData[s.name]) {
        try {
          const d = await fetchConditions(s);
          allSpotsData[s.name] = d;
          allSpotsData = allSpotsData;
        } catch {}
      }
    }
  }

  $effect(() => { const s = spot; load(); });
  onMount(() => {
    const t = setInterval(() => { webcamTs = Date.now(); }, 30000);
    loadAllSpots();
    return () => clearInterval(t);
  });

  function selectSpot(idx) {
    spotIdx = idx;
    activeNav = 0;
  }

  const navItems = [
    { icon: '🏠', label: "Vue d'ensemble" },
    { icon: '🏖️', label: 'Plages' },
    { icon: '📊', label: 'Prévisions' },
    { icon: '💨', label: 'Cartes vent' },
    { icon: '📷', label: 'Webcams' },
    { icon: '🌊', label: 'Marées' },
    { icon: '⭐', label: 'Favoris' },
  ];
</script>

<div class="layout">
  <aside class="sidebar">
    <div class="logo">
      <span style="font-size:22px">🌊</span>
      <div>
        <div class="logo-title">SURF</div>
        <div class="logo-sub">DASHBOARD</div>
      </div>
    </div>
    <nav class="nav">
      {#each navItems as item, i}
        <button class="nav-btn" class:act={i === activeNav} onclick={() => activeNav = i}>
          <span class="nav-icon">{item.icon}</span>{item.label}
        </button>
      {/each}
    </nav>
    {#if data}
    <div class="tide-box">
      <div style="font-size:10px;font-weight:500;letter-spacing:.08em;text-transform:uppercase;color:var(--t3)">Marée</div>
      <div style="display:flex;align-items:center;gap:6px;margin:8px 0">
        <span style="color:var(--accent);font-size:16px">↗</span>
        <span style="font-size:13px;font-weight:500">Montante</span>
      </div>
      <svg viewBox="0 0 160 40" width="100%">
        <path d="M0,30 C20,10 40,10 60,20 C80,30 100,30 120,15 C140,5 155,20 160,25" fill="none" stroke="var(--accent)" stroke-width="1.5" stroke-linecap="round"/>
        <circle cx="100" cy="22" r="3" fill="var(--accent)"/>
      </svg>
      <div style="font-size:9px;color:var(--t3);margin-top:8px">MAJ {today.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</div>
    </div>
    {/if}
  </aside>

  <main class="main">
    <div class="topbar">
      <div>
        <div class="topbar-date">{dateStr}</div>
        <div class="topbar-loc">
          <span style="color:var(--coral);font-size:12px">📍</span>
          {spot.name}, France
        </div>
      </div>
      <div class="topbar-actions">
        <button class="topbar-btn">🔔</button>
        <button class="topbar-btn">⚙️</button>
      </div>
    </div>

    {#if loading && !data}
      <div style="text-align:center;padding:100px 20px;color:var(--t3)">
        <p style="font-size:28px;margin-bottom:8px">🌊</p>
        <p>Chargement...</p>
      </div>

    <!-- ═══ VUE D'ENSEMBLE ═══ -->
    {:else if activeNav === 0 && data}
    <div class="grid">
      <div class="card">
        <div class="card-title">Météo actuelle</div>
        <div style="display:flex;align-items:center;gap:14px;margin-bottom:14px">
          <span style="font-size:44px">{WEATHER[data.code] ?? '🌤'}</span>
          <div>
            <div style="font-size:36px;font-weight:500;line-height:1">{data.temp}<span style="font-size:18px;color:var(--t2)">°C</span></div>
            <div style="font-size:12px;color:var(--t2)">{WEATHER_LABEL[data.code] ?? 'N/A'}</div>
            <div style="font-size:11px;color:var(--t3)">Ressenti {data.felt}°C</div>
          </div>
        </div>
        <div style="display:flex;gap:16px;font-size:11px;color:var(--t2);margin-bottom:10px">
          <div><span style="color:var(--t3)">Humidité</span><br/><strong style="color:var(--t1)">{data.humidity}%</strong></div>
          <div><span style="color:var(--t3)">Pression</span><br/><strong style="color:var(--t1)">{data.pressure} hPa</strong></div>
          <div><span style="color:var(--t3)">UV</span><br/><strong style="color:var(--t1)">{data.uv} {uvLabel(data.uv)}</strong></div>
        </div>
        <div style="display:flex;gap:16px;font-size:11px;color:var(--t2);padding-top:8px;border-top:0.5px solid var(--border)">
          <span>🌅 Lever <strong style="color:var(--t1)">{data.sunrise}</strong></span>
          <span>🌇 Coucher <strong style="color:var(--t1)">{data.sunset}</strong></span>
        </div>
      </div>

      <div class="card">
        <div class="card-title">Conditions de surf</div>
        <div style="display:flex;flex-direction:column;gap:12px">
          <div style="display:flex;align-items:center;gap:12px">
            <div class="icon-box" style="background:var(--accent-soft)">🌊</div>
            <div style="flex:1">
              <div style="font-size:11px;color:var(--t3)">Taille des vagues</div>
              <div style="font-size:28px;font-weight:500;line-height:1">{data.swellH.toFixed(1)} <span style="font-size:14px">m</span></div>
            </div>
            <div style="text-align:right">
              <div style="font-size:14px;font-weight:500">{Math.round(data.swellPeriod)}s</div>
              <span class="stars">{'★'.repeat(stars)}{'☆'.repeat(5 - stars)}</span>
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:12px">
            <div class="icon-box" style="background:rgba(59,130,246,.1)">💨</div>
            <div style="flex:1">
              <div style="font-size:11px;color:var(--t3)">Vent</div>
              <div style="font-size:20px;font-weight:500">{data.wind} <span style="font-size:12px;color:var(--t2)">kn</span></div>
            </div>
            <div style="text-align:right">
              <div style="font-size:11px;color:var(--t3)">Rafales</div>
              <div style="font-size:14px;font-weight:500">{data.gusts} kn</div>
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:12px">
            <div class="icon-box" style="background:rgba(239,159,39,.1)">🧭</div>
            <div>
              <div style="font-size:11px;color:var(--t3)">Direction houle</div>
              <div style="font-size:20px;font-weight:500">{windLabel(data.swellDir)} <span style="font-size:12px;color:var(--t2)">{Math.round(data.swellDir)}°</span></div>
            </div>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-title">Vent en temps réel</div>
        <div style="display:flex;align-items:center;gap:16px">
          <WindCompass direction={data.windDir} />
          <div>
            <div style="font-size:13px;font-weight:500;margin-bottom:4px">{windLabelFull(data.windDir)}</div>
            <div style="font-size:24px;font-weight:500;line-height:1">{data.wind} <span style="font-size:12px;color:var(--t2)">kn</span></div>
            <div style="font-size:11px;color:var(--t2);margin-top:4px">Rafales {data.gusts} kn</div>
          </div>
        </div>
        <div class="wind-bar">
          {#each windBars as v, i}
            <div class="wind-bar-seg">
              <div class="wind-bar-fill" style="background:{i < 2 ? 'var(--accent)' : i < 4 ? 'var(--amber)' : 'var(--coral)'};opacity:{data.wind >= v ? 1 : 0.15}"></div>
              <span class="wind-bar-label">{v}</span>
            </div>
          {/each}
        </div>
      </div>

      <div class="card">
        <div class="card-title">Plages à proximité</div>
        {#each nearby as beach}
          <button class="beach-item" onclick={() => selectSpot(beach.idx)} style="width:100%;background:none;border:none;cursor:pointer;font-family:inherit;color:inherit;text-align:left">
            <div style="width:36px;height:36px;border-radius:8px;background:rgba(255,255,255,.04);display:flex;align-items:center;justify-content:center;font-size:16px">🏖️</div>
            <div style="flex:1">
              <div style="font-size:12px;font-weight:500">{beach.name}</div>
              <span class="tag" style="background:{beach.color}20;color:{beach.color};margin-top:2px">{beach.text}</span>
            </div>
            <div style="text-align:right">
              <div style="font-size:14px;font-weight:500">{beach.wv} m</div>
              <div style="font-size:10px;color:var(--t3)">{beach.per}s</div>
            </div>
          </button>
        {/each}
      </div>

      <div class="card">
        <div class="card-title">Météo heure par heure</div>
        {#if hourlySlots.length > 0}
        <table class="meteo-table">
          <thead><tr>{#each hourlySlots as s}<th>{s.h}</th>{/each}</tr></thead>
          <tbody>
            <tr>{#each hourlySlots as s}<td style="font-size:18px">{s.icon}</td>{/each}</tr>
            <tr>{#each hourlySlots as s}<td style="font-weight:500;color:var(--accent)">{s.t}°C</td>{/each}</tr>
            <tr><td colspan="{hourlySlots.length}" class="section-label">VENT (kn)</td></tr>
            <tr>{#each hourlySlots as s}<td><svg width="12" height="12" viewBox="0 0 12 12" style="transform:rotate({s.wd + 180}deg)"><path d="M6 1L9 10L6 7.5L3 10Z" fill="var(--accent)"/></svg><span style="display:block;font-size:10px;color:var(--t2)">{s.w}</span></td>{/each}</tr>
            <tr><td colspan="{hourlySlots.length}" class="section-label">VAGUES (m)</td></tr>
            <tr>{#each hourlySlots as s}<td style="font-weight:500">{s.wv}</td>{/each}</tr>
            <tr><td colspan="{hourlySlots.length}" class="section-label">PÉRIODE (s)</td></tr>
            <tr>{#each hourlySlots as s}<td style="color:var(--t2)">{s.per}s</td>{/each}</tr>
          </tbody>
        </table>
        {/if}
      </div>

      <div class="card cam-card">
        <div class="cam-header">
          <span class="card-title" style="margin:0">Webcam — {spot.name}</span>
          <span class="cam-live"><span class="cam-dot"></span>EN DIRECT</span>
        </div>
        <div class="cam-body">
          {#if spot.webcam}<img src="/api/webcam?id={spot.name.toLowerCase()}&t={webcamTs}" alt="Webcam {spot.name}" onerror={(e) => e.target.style.display = 'none'} />{/if}
          <span style="font-size:28px;opacity:.15;position:relative">📷</span>
        </div>
        <div class="cam-footer"><button class="cam-fullbtn" onclick={() => activeNav = 4}>Voir en plein écran ↗</button></div>
      </div>

      <div class="card" style="grid-column:span 3">
        <div class="card-title">Vagues — 24h</div>
        <WaveChart data={data.hourlyWaves} />
      </div>
    </div>

    <!-- ═══ PLAGES ═══ -->
    {:else if activeNav === 1}
    <div class="page-content">
      <h2 class="page-title">Plages à proximité</h2>
      <p class="page-sub">Conditions en temps réel sur les spots de la côte girondine</p>
      <div class="beach-grid">
        {#each nearby as beach}
          <button class="card beach-card" onclick={() => selectSpot(beach.idx)}>
            <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px">
              <div>
                <div style="font-size:15px;font-weight:500">{beach.name}</div>
                <div style="font-size:11px;color:var(--t3);margin-top:2px">{beach.sub}</div>
              </div>
              <span class="tag" style="background:{beach.color}20;color:{beach.color}">{beach.text}</span>
            </div>
            <div style="display:flex;gap:16px;margin-bottom:12px">
              <div><div style="font-size:24px;font-weight:500">{beach.wv}<span style="font-size:12px;color:var(--t2)">m</span></div><div style="font-size:10px;color:var(--t3)">Houle</div></div>
              <div><div style="font-size:24px;font-weight:500">{beach.per}<span style="font-size:12px;color:var(--t2)">s</span></div><div style="font-size:10px;color:var(--t3)">Période</div></div>
              <div><div style="font-size:24px;font-weight:500">{beach.wind}<span style="font-size:12px;color:var(--t2)">kn</span></div><div style="font-size:10px;color:var(--t3)">Vent</div></div>
              <div><div style="font-size:24px;font-weight:500">{beach.temp}<span style="font-size:12px;color:var(--t2)">°</span></div><div style="font-size:10px;color:var(--t3)">Temp</div></div>
            </div>
            <div style="font-size:11px;color:var(--accent)">Voir les détails →</div>
          </button>
        {/each}
      </div>
    </div>

    <!-- ═══ PRÉVISIONS ═══ -->
    {:else if activeNav === 2 && data}
    <div class="page-content">
      <h2 class="page-title">Prévisions — {spot.name}</h2>
      <p class="page-sub">Données heure par heure sur 24h</p>

      <div class="card" style="margin-bottom:16px">
        <div class="card-title">Vagues — 24h</div>
        <WaveChart data={data.hourlyWaves} />
      </div>

      <div class="card" style="overflow-x:auto">
        <div class="card-title">Tableau détaillé</div>
        <table class="meteo-table" style="min-width:800px">
          <thead><tr><th></th>{#each forecastFull as s}<th style={s.isCurrent ? 'color:var(--accent);font-weight:500' : ''}>{s.h}</th>{/each}</tr></thead>
          <tbody>
            <tr><td class="section-label">Météo</td>{#each forecastFull as s}<td style="font-size:16px">{s.icon}</td>{/each}</tr>
            <tr><td class="section-label">Temp (°C)</td>{#each forecastFull as s}<td style="font-weight:500;{s.isCurrent ? 'color:var(--accent)' : ''}">{s.t}°</td>{/each}</tr>
            <tr><td class="section-label">Vagues (m)</td>{#each forecastFull as s}<td style="font-weight:500">{s.wv}</td>{/each}</tr>
            <tr><td class="section-label">Période (s)</td>{#each forecastFull as s}<td style="color:var(--t2)">{s.per}</td>{/each}</tr>
            <tr><td class="section-label">Vent (kn)</td>{#each forecastFull as s}<td><svg width="12" height="12" viewBox="0 0 12 12" style="transform:rotate({s.wd+180}deg)"><path d="M6 1L9 10L6 7.5L3 10Z" fill="var(--accent)"/></svg><br/><span style="font-size:10px;color:var(--t2)">{s.w}</span></td>{/each}</tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ═══ CARTES VENT ═══ -->
    {:else if activeNav === 3}
    <div class="page-content">
      <h2 class="page-title">Carte des vents</h2>
      <p class="page-sub">Conditions de vent en temps réel — Windy.com</p>
      <div class="card" style="padding:0;overflow:hidden;height:calc(100vh - 160px)">
        <iframe src="https://embed.windy.com/embed.html?type=map&location=coordinates&metricRain=mm&metricTemp=°C&metricWind=kn&zoom=9&overlay=wind&product=ecmwf&level=surface&lat={spot.lat}&lon={spot.lon}" width="100%" height="100%" style="border:none;display:block" loading="lazy" title="Carte des vents"></iframe>
      </div>
    </div>

    <!-- ═══ WEBCAMS ═══ -->
    {:else if activeNav === 4}
    <div class="page-content">
      <h2 class="page-title">Webcams</h2>
      <p class="page-sub">Flux en direct des plages</p>
      <div class="webcam-grid">
        {#each SPOTS.filter(s => s.webcam) as cam}
          <div class="card" style="padding:0;overflow:hidden">
            <div style="padding:12px 16px;display:flex;justify-content:space-between;align-items:center">
              <span style="font-size:13px;font-weight:500">{cam.name}</span>
              <span class="cam-live"><span class="cam-dot"></span>LIVE</span>
            </div>
            <div style="height:300px;background:linear-gradient(135deg,#0A2A35,#0D3B3A);position:relative;overflow:hidden">
              <img src="/api/webcam?id={cam.name.toLowerCase()}&t={webcamTs}" alt="Webcam {cam.name}" style="width:100%;height:100%;object-fit:cover;position:absolute;inset:0" onerror={(e) => e.target.style.display = 'none'} />
              <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center">
                <span style="font-size:32px;opacity:.1">📷</span>
              </div>
            </div>
          </div>
        {/each}
        {#if SPOTS.filter(s => s.webcam).length === 0}
          <div class="card" style="text-align:center;padding:60px;color:var(--t3)">Aucune webcam configurée</div>
        {/if}
      </div>
    </div>

    <!-- ═══ MARÉES ═══ -->
    {:else if activeNav === 5}
    <div class="page-content">
      <h2 class="page-title">Marées — {spot.name}</h2>
      <p class="page-sub">Horaires et coefficients du jour</p>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">
        <div class="card" style="text-align:center">
          <div style="font-size:32px;margin-bottom:8px">🌊</div>
          <div style="font-size:10px;color:var(--t3);text-transform:uppercase;letter-spacing:.08em">État actuel</div>
          <div style="display:flex;align-items:center;justify-content:center;gap:6px;margin:8px 0">
            <span style="color:var(--accent);font-size:20px">↗</span>
            <span style="font-size:18px;font-weight:500">Montante</span>
          </div>
        </div>
        <div class="card">
          <div style="display:flex;justify-content:space-between;margin-bottom:16px">
            <div style="text-align:center;flex:1">
              <div style="font-size:10px;color:var(--t3);text-transform:uppercase;letter-spacing:.08em;margin-bottom:4px">Pleine mer</div>
              <div style="font-size:24px;font-weight:500;color:var(--accent)">17:32</div>
              <div style="font-size:12px;color:var(--t2)">4.1 m</div>
            </div>
            <div style="width:1px;background:var(--border)"></div>
            <div style="text-align:center;flex:1">
              <div style="font-size:10px;color:var(--t3);text-transform:uppercase;letter-spacing:.08em;margin-bottom:4px">Basse mer</div>
              <div style="font-size:24px;font-weight:500">11:15</div>
              <div style="font-size:12px;color:var(--t2)">0.9 m</div>
            </div>
          </div>
        </div>
      </div>
      <div class="card">
        <div class="card-title">Courbe de marée</div>
        <svg viewBox="0 0 600 120" width="100%" style="display:block">
          <defs><linearGradient id="tg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="var(--accent)" stop-opacity=".12"/><stop offset="100%" stop-color="var(--accent)" stop-opacity=".01"/></linearGradient></defs>
          <line x1="30" y1="30" x2="570" y2="30" stroke="var(--border)" stroke-width=".5" stroke-dasharray="2 4"/>
          <line x1="30" y1="60" x2="570" y2="60" stroke="var(--border)" stroke-width=".5" stroke-dasharray="2 4"/>
          <line x1="30" y1="90" x2="570" y2="90" stroke="var(--border)" stroke-width=".5" stroke-dasharray="2 4"/>
          <path d="M30,50 C80,85 130,95 180,90 C230,85 280,30 330,25 C380,20 430,75 480,85 C530,95 560,60 570,50 L570,100 L30,100 Z" fill="url(#tg)"/>
          <path d="M30,50 C80,85 130,95 180,90 C230,85 280,30 330,25 C380,20 430,75 480,85 C530,95 560,60 570,50" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linecap="round"/>
          <circle cx="330" cy="25" r="4" fill="var(--accent)"/>
          <text x="330" y="16" text-anchor="middle" fill="var(--accent)" font-size="9">PM 17:32</text>
          <circle cx="180" cy="90" r="4" fill="var(--t3)"/>
          <text x="180" y="105" text-anchor="middle" fill="var(--t3)" font-size="9">BM 11:15</text>
          {#each ['00h','04h','08h','12h','16h','20h','24h'] as label, i}
            <text x={30 + i * 90} y="115" text-anchor="middle" fill="var(--t3)" font-size="8">{label}</text>
          {/each}
        </svg>
      </div>
      <div style="margin-top:12px;text-align:center">
        <a href="https://maree.info/82" target="_blank" rel="noopener noreferrer" class="link-pill">Voir sur Marée.info ↗</a>
      </div>
    </div>

    <!-- ═══ FAVORIS ═══ -->
    {:else if activeNav === 6}
    <div class="page-content">
      <h2 class="page-title">Favoris</h2>
      <p class="page-sub">Tes spots préférés en un coup d'œil</p>
      <div class="beach-grid">
        {#each nearby as beach}
          <button class="card beach-card" onclick={() => selectSpot(beach.idx)}>
            <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">
              <div style="font-size:15px;font-weight:500">{beach.name}</div>
              <span style="font-size:16px;cursor:pointer">⭐</span>
            </div>
            <div style="display:flex;gap:14px">
              <div><div style="font-size:20px;font-weight:500">{beach.wv}<span style="font-size:11px;color:var(--t2)">m</span></div><div style="font-size:9px;color:var(--t3)">Houle</div></div>
              <div><div style="font-size:20px;font-weight:500">{beach.per}<span style="font-size:11px;color:var(--t2)">s</span></div><div style="font-size:9px;color:var(--t3)">Période</div></div>
              <div><div style="font-size:20px;font-weight:500">{beach.wind}<span style="font-size:11px;color:var(--t2)">kn</span></div><div style="font-size:9px;color:var(--t3)">Vent</div></div>
            </div>
            <div style="margin-top:8px"><span class="tag" style="background:{beach.color}20;color:{beach.color}">{beach.text}</span></div>
          </button>
        {/each}
      </div>
    </div>
    {/if}
  </main>
</div>

<style>
  .page-content{padding:24px 20px}
  .page-title{font-size:20px;font-weight:600;margin-bottom:4px}
  .page-sub{font-size:12px;color:var(--t2);margin-bottom:20px}
  .beach-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
  .beach-card{cursor:pointer;border:none;font-family:inherit;color:inherit;text-align:left;transition:border-color .2s}
  .beach-card:hover{border-color:var(--accent)}
  .webcam-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
  @media(max-width:700px){.beach-grid,.webcam-grid{grid-template-columns:1fr}}
</style>
