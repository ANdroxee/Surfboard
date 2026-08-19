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

  let spot = $derived(SPOTS[spotIdx]);
  let score = $derived(data ? surfScore(data) : 0);
  let stars = $derived(qualityStars(score));
  let wt = $derived(data ? windType(data.windDir) : 'cross');
  let currentHour = $derived(new Date().getHours());

  let nearby = $derived(SPOTS.map((s, idx) => {
    const isActive = idx === spotIdx;
    const sc = isActive && data ? score : 4 + idx * 1.2;
    const rl = ratingLabel(sc);
    const wv = isActive && data ? data.swellH : (0.5 + idx * 0.25);
    const per = isActive && data ? data.swellPeriod : (9 + idx);
    return { ...s, wv: wv.toFixed(1), per: Math.round(per), ...rl };
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

  const today = new Date();
  const dayNames = ['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'];
  const monthNames = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
  let dateStr = dayNames[today.getDay()] + ' ' + today.getDate() + ' ' + monthNames[today.getMonth()] + ' ' + today.getFullYear();
  const windBars = [0, 10, 20, 30, 40, 50];

  async function load() {
    loading = true;
    try { data = await fetchConditions(spot); } catch (e) { console.error(e); }
    loading = false;
  }

  $effect(() => {
    const s = spot;
    load();
  });

  onMount(() => {
    const t = setInterval(() => { webcamTs = Date.now(); }, 30000);
    return () => clearInterval(t);
  });
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
      {#each [
        { icon: '🏠', label: "Vue d'ensemble" },
        { icon: '🏖️', label: 'Plages' },
        { icon: '📊', label: 'Prévisions' },
        { icon: '💨', label: 'Cartes vent' },
        { icon: '📷', label: 'Webcams' },
        { icon: '🌊', label: 'Marées' },
        { icon: '⭐', label: 'Favoris' },
      ] as item, i}
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

    {#if loading}
      <div style="text-align:center;padding:100px 20px;color:var(--t3)">
        <p style="font-size:28px;margin-bottom:8px">🌊</p>
        <p>Chargement...</p>
      </div>
    {:else if data}
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
          <div class="beach-item">
            <div style="width:36px;height:36px;border-radius:8px;background:rgba(255,255,255,.04);display:flex;align-items:center;justify-content:center;font-size:16px">🏖️</div>
            <div style="flex:1">
              <div style="font-size:12px;font-weight:500">{beach.name}</div>
              <span class="tag" style="background:{beach.color}20;color:{beach.color};margin-top:2px">{beach.text}</span>
            </div>
            <div style="text-align:right">
              <div style="font-size:14px;font-weight:500">{beach.wv} m</div>
              <div style="font-size:10px;color:var(--t3)">{beach.per}s</div>
            </div>
          </div>
        {/each}
      </div>

      <div class="card">
        <div class="card-title">Météo heure par heure</div>
        {#if hourlySlots.length > 0}
        <table class="meteo-table">
          <thead>
            <tr>{#each hourlySlots as s}<th>{s.h}</th>{/each}</tr>
          </thead>
          <tbody>
            <tr>{#each hourlySlots as s}<td style="font-size:18px">{s.icon}</td>{/each}</tr>
            <tr>{#each hourlySlots as s}<td style="font-weight:500;color:var(--accent)">{s.t}°C</td>{/each}</tr>
            <tr><td colspan="{hourlySlots.length}" class="section-label">VENT (kn)</td></tr>
            <tr>{#each hourlySlots as s}<td>
              <svg width="12" height="12" viewBox="0 0 12 12" style="transform:rotate({s.wd + 180}deg)"><path d="M6 1L9 10L6 7.5L3 10Z" fill="var(--accent)"/></svg>
              <span style="display:block;font-size:10px;color:var(--t2)">{s.w}</span>
            </td>{/each}</tr>
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
          {#if spot.webcam}
            <img src="/api/webcam?id={spot.name.toLowerCase()}&t={webcamTs}" alt="Webcam {spot.name}" onerror={(e) => e.target.style.display = "none"} />
          {/if}
          <span style="font-size:28px;opacity:.15;position:relative">📷</span>
        </div>
        <div class="cam-footer">
          <button class="cam-fullbtn">Voir en plein écran ↗</button>
        </div>
      </div>

      <div class="card" style="grid-column:span 3">
        <div class="card-title">Vagues — 24h</div>
        <WaveChart data={data.hourlyWaves} />
      </div>

    </div>
    {/if}
  </main>
</div>
