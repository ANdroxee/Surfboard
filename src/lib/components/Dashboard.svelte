<script>
  import { onMount } from 'svelte';
  import { Tween, prefersReducedMotion } from 'svelte/motion';
  import { cubicOut } from 'svelte/easing';
  import OceanBackground from '$lib/components/OceanBackground.svelte';
  import SpotMap from '$lib/components/SpotMap.svelte';
  import { SPOT_POS } from '$lib/geo/southwest.js';
  import { SPOTS, fetchConditions, surfScore, hourScore, windLabel, windType, knToKmh, wetsuit, scoreFactors, wavePower, uvLabel, WEATHER_LABEL } from '$lib/api.js';

  // Données serveur : compte connecté (ou null) et ses préférences
  let { data: pageData } = $props();
  let user = $derived(pageData.user);
  const startPrefs = pageData.user?.prefs;

  let spotIdx = $state(Math.max(0, SPOTS.findIndex((s) => s.name === startPrefs?.defaultSpot)));
  let mode = $state(startPrefs?.mode ?? 'simple');
  let favorites = $state(startPrefs?.favorites ?? []);

  function savePrefs(patch) {
    if (!user) return;
    fetch('/api/preferences', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(patch) })
      .catch(() => {});
  }
  function toggleFavorite(name) {
    favorites = favorites.includes(name) ? favorites.filter((f) => f !== name) : [...favorites, name];
    savePrefs({ favorites });
  }
  let isExpert = $derived(mode === 'expert');
  function setMode(m) {
    mode = m;
    if (user) savePrefs({ mode: m });
    else try { localStorage.setItem('surfboard-mode', m); } catch {}
  }
  let allSpotsData = $state({});
  let loading = $state(true);
  let error = $state(false);
  let now = $state(new Date());
  let camEl = $state();

  let spot = $derived(SPOTS[spotIdx]);
  let camIdx = $state(0);
  let camList = $derived(spot.webcams);
  let cam = $derived(camList[camIdx] ?? camList[0] ?? null);

  // Flux à jour résolu par le serveur (les clips Viewsurf changent d'adresse à chaque nouveau clip).
  // Rafraîchi toutes les 3 min pour suivre les nouveaux clips.
  let camInfo = $state(null); // { ok, src, live, capturedAt, panorama, reason }
  $effect(() => {
    const name = spot.name, i = camIdx, has = !!cam;
    camInfo = null;
    if (!has) return;
    let alive = true;
    const load = async () => {
      try {
        const r = await fetch(`/api/webcam?spot=${encodeURIComponent(name)}&i=${i}`);
        const j = r.ok ? await r.json() : { ok: false, reason: 'Webcam indisponible' };
        if (alive && (j.src !== camInfo?.src || j.ok !== camInfo?.ok)) camInfo = j;
        else if (alive && camInfo) camInfo = { ...camInfo, capturedAt: j.capturedAt };
      } catch {
        if (alive) camInfo = { ok: false, reason: 'Webcam injoignable' };
      }
    };
    load();
    const t = setInterval(load, 3 * 60_000);
    return () => { alive = false; clearInterval(t); };
  });

  const toMin = (hm) => { const [h, m] = String(hm).split(':').map(Number); return h * 60 + (m || 0); };
  let camAge = $derived(camInfo?.capturedAt ? Math.round((now - new Date(camInfo.capturedAt)) / 60000) : null);
  let camNight = $derived.by(() => {
    if (!camInfo?.capturedAt || !data) return false;
    const d = new Date(camInfo.capturedAt), m = d.getHours() * 60 + d.getMinutes();
    return m < toMin(data.sunrise) || m > toMin(data.sunset);
  });
  let camStale = $derived(!!camInfo?.capturedAt && (camNight || camAge > 120));
  let camStatus = $derived.by(() => {
    if (!camInfo) return 'CHARGEMENT…';
    if (!camInfo.ok) return 'HORS LIGNE';
    if (camInfo.live) return 'LIVE';
    if (camInfo.panorama) return 'PANORAMA';
    if (!camInfo.capturedAt) return 'CLIP RÉCENT';
    let txt = `CLIP DE ${hhmm(new Date(camInfo.capturedAt))}`;
    if (camAge > 24 * 60) txt += ' · PLUS DE 24 H';
    else if (camNight) txt += ' · DE NUIT';
    else if (camAge > 120) txt += ` · IL Y A ${Math.floor(camAge / 60)} H`;
    return txt;
  });
  let data = $derived(allSpotsData[spot.name] ?? null);
  let score = $derived(data ? surfScore(data) : 0);
  // Score animé : compte jusqu'à la valeur à l'arrivée et lors d'un changement de spot
  const scoreT = new Tween(0, { duration: 1100, easing: cubicOut });
  $effect(() => { scoreT.set(score, { duration: prefersReducedMotion.current ? 0 : 1100 }); });
  let camLoaded = $state(false);
  $effect(() => { camInfo?.src; camLoaded = false; });
  let nowH = $derived(now.getHours() + now.getMinutes() / 60);

  // ─── Formatage ───
  const pad = (n) => String(n).padStart(2, '0');
  const hhmm = (d) => pad(d.getHours()) + ':' + pad(d.getMinutes());
  const fmtH = (h) => pad(Math.floor(h) % 24) + ':' + pad(Math.round((h % 1) * 60) % 60);
  const DAYS = ['DIM.', 'LUN.', 'MAR.', 'MER.', 'JEU.', 'VEN.', 'SAM.'];
  const MONTHS = ['JANV', 'FÉVR', 'MARS', 'AVR', 'MAI', 'JUIN', 'JUIL', 'AOÛT', 'SEPT', 'OCT', 'NOV', 'DÉC'];
  let dateLabel = $derived(`${DAYS[now.getDay()]} ${now.getDate()} ${MONTHS[now.getMonth()]} · ${hhmm(now)}`);

  const tone = (v) => (v >= 7 ? 'var(--accent)' : v >= 5.5 ? 'var(--warm)' : 'var(--muted)');

  // ─── Verdict ───
  let verdict = $derived(
    score >= 7 ? { text: 'GO', bg: 'var(--accent)', fg: 'var(--on-accent)' }
    : score >= 5 ? { text: 'BOF', bg: 'var(--warm)', fg: 'var(--on-accent)' }
    : { text: 'NON', bg: 'var(--track)', fg: 'var(--text)' }
  );

  // ─── Ta journée : heures de jour ───
  let dayHours = $derived.by(() => {
    if (!data) return [];
    const start = Math.max(6, parseInt(data.sunrise) || 8);
    const end = Math.min(21, parseInt(data.sunset) || 18);
    const out = [];
    for (let h = start; h <= end; h++) {
      const s = hourScore(data, h);
      out.push({
        h, s,
        color: s >= 7 ? 'var(--accent)' : s >= 5.5 ? 'var(--warm)' : 'var(--dim)',
        label: s >= 7 ? 'var(--text)' : 'var(--muted)',
        px: Math.max(4, Math.round((s / 10) * 70)),
      });
    }
    return out;
  });

  // Meilleure plage horaire contiguë restante
  function bestRun(hours, min) {
    let best = null, cur = null;
    for (const x of hours) {
      if (x.s >= min) {
        cur = cur ? { ...cur, end: x.h } : { start: x.h, end: x.h };
        if (!best || cur.end - cur.start > best.end - best.start) best = cur;
      } else cur = null;
    }
    return best;
  }

  let windowInfo = $derived.by(() => {
    const upcoming = dayHours.filter((x) => x.h >= Math.floor(nowH));
    if (!upcoming.length) return { title: 'Journée terminée — à demain', run: null };
    const good = bestRun(upcoming, 7);
    if (good) return { title: `Fenêtre idéale ${pad(good.start)}:00 → ${pad(good.end + 1)}:00`, run: good };
    const ok = bestRun(upcoming, 5.5);
    if (ok) return { title: `Créneau correct ${pad(ok.start)}:00 → ${pad(ok.end + 1)}:00`, run: ok };
    return { title: 'Pas de vraie fenêtre aujourd’hui', run: null };
  });

  const WIND_FX = { offshore: 'OFFSHORE', onshore: 'ONSHORE', cross: 'SIDE-SHORE' };
  let windKmh = $derived(data ? knToKmh(data.wind) : 0);
  let wt = $derived(data ? windType(data.windDir) : 'cross');

  let summary = $derived.by(() => {
    if (!data) return '';
    const strength = windKmh < 10 ? 'léger' : windKmh < 20 ? 'modéré' : 'fort';
    const clean = data.swellPeriod >= 10 ? 'propre' : data.swellPeriod >= 7 ? 'correct' : 'court';
    let txt = `Swell ${clean} ${windLabel(data.swellDir)}, ${wt === 'cross' ? 'side-shore' : wt} ${strength}.`;
    const run = windowInfo.run;
    if (run) {
      const drop = dayHours.find((x) => x.h > run.end && x.s < 5.5);
      if (drop) {
        const dir = windType(data.hourlyWindDir[drop.h] ?? data.windDir);
        txt += ` Ça se dégrade après ${pad(drop.h)}:00${dir !== wt ? ` quand le vent passe ${dir === 'cross' ? 'side-shore' : dir}` : ''}.`;
      }
    }
    return txt;
  });

  // ─── Marée (niveau Open-Meteo, référence NM) ───
  function levelAt(a, h) {
    const i = Math.floor(h), f = h - i;
    const p = (k) => a[Math.min(a.length - 1, Math.max(0, k))];
    const p0 = p(i - 1), p1 = p(i), p2 = p(i + 1), p3 = p(i + 2);
    return 0.5 * (2 * p1 + (-p0 + p2) * f + (2 * p0 - 5 * p1 + 4 * p2 - p3) * f * f + (-p0 + 3 * p1 - 3 * p2 + p3) * f * f * f);
  }

  let tide = $derived.by(() => {
    const a = data?.hourlySeaLevel ?? [];
    if (a.length < 26) return null;
    const ext = [];
    for (let i = 1; i < a.length - 1; i++) {
      const isMax = a[i] >= a[i - 1] && a[i] > a[i + 1];
      const isMin = a[i] <= a[i - 1] && a[i] < a[i + 1];
      if (!isMax && !isMin) continue;
      const den = a[i - 1] - 2 * a[i] + a[i + 1];
      const off = den ? (a[i - 1] - a[i + 1]) / (2 * den) : 0;
      ext.push({ t: i + off, v: levelAt(a, i + off), high: isMax });
    }
    const level = levelAt(a, nowH);
    const rate = Math.round((levelAt(a, nowH + 0.5) - levelAt(a, nowH - 0.5)) * 100);
    const next = ext.find((e) => e.t > nowH);
    const shown = ext.filter((e) => e.t >= nowH - 7).slice(0, 3);

    // Courbe 0–24h
    const W = 360, H = 70, min = Math.min(...a.slice(0, 25)), max = Math.max(...a.slice(0, 25));
    const x = (h) => (h / 24) * W;
    const y = (v) => 6 + ((max - v) / (max - min || 1)) * (H - 12);
    const path = (from, to) => {
      let d = '';
      for (let h = from; h <= to + 1e-6; h += 0.25) d += (d ? ' L' : 'M') + x(h).toFixed(1) + ' ' + y(levelAt(a, h)).toFixed(1);
      return d;
    };
    const until = Math.min(24, next ? next.t : 24);
    let inH = Math.floor(((next?.t ?? nowH) - nowH) * 60);
    return {
      level, rate, rising: rate >= 0,
      next, nextIn: `${Math.floor(inH / 60)} h ${pad(inH % 60)}`,
      shown,
      full: path(0, 24),
      ahead: nowH < until ? path(nowH, until) : '',
      nx: x(Math.min(nowH, 24)), ny: y(level),
    };
  });

  // ─── Mode Expert ───
  // Position dans le marnage du jour : 0 = basse mer, 1 = pleine mer
  function tidePosAt(h) {
    const a = data?.hourlySeaLevel ?? [];
    if (a.length < 25) return null;
    const min = Math.min(...a.slice(0, 25)), max = Math.max(...a.slice(0, 25));
    return (levelAt(a, h) - min) / (max - min || 1);
  }

  let factors = $derived(data ? scoreFactors(data, tidePosAt(nowH)).map((f) => ({ ...f, color: f.v >= 7 ? 'var(--accent)' : f.v >= 5 ? 'var(--warm)' : 'var(--muted)' })) : []);

  let gustsKmh = $derived(data ? knToKmh(data.gusts) : 0);

  // Flèche orientée vers où souffle le vent (provenance + 180°)
  const toDeg = (from) => (from + 180) % 360;

  let windSteps = $derived.by(() => {
    if (!data) return [];
    const base = Math.floor(nowH);
    return [0, 3, 6, 9].map((o) => base + o).filter((h) => h < 24).map((h) => {
      const dir = data.hourlyWindDir[h] ?? data.windDir;
      const type = windType(dir);
      return {
        t: pad(h) + 'h', v: knToKmh(data.hourlyWind[h] ?? data.wind), deg: toDeg(dir),
        d: type === 'offshore' ? 'OFF' : type === 'onshore' ? 'ON' : 'SIDE',
        color: type === 'offshore' ? 'var(--accent)' : type === 'onshore' ? 'var(--warm)' : 'var(--soft)',
      };
    });
  });

  let table = $derived.by(() => {
    if (!data) return [];
    const a = data.hourlySeaLevel ?? [];
    const rows = [];
    for (let h = Math.floor(nowH); h < 24; h++) {
      const s = hourScore(data, h);
      const dir = data.hourlyWindDir[h] ?? data.windDir;
      const type = windType(dir);
      const lvl = a.length > h + 1 ? levelAt(a, h) : null;
      const up = a.length > h + 1 ? a[h + 1] >= a[h] : true;
      rows.push({
        t: pad(h) + 'h', s: s.toFixed(1), scoreColor: tone(s), hi: s >= 7,
        h: (data.hourlyWaves[h] ?? 0).toFixed(1) + ' m',
        p: Math.round(data.hourlyPeriod[h] ?? 0) + ' s',
        sd: Math.round(data.hourlyWaveDir[h] ?? 0) + '° ' + windLabel(data.hourlyWaveDir[h] ?? 0),
        w: knToKmh(data.hourlyWind[h] ?? 0), g: knToKmh(data.hourlyGusts[h] ?? 0),
        deg: toDeg(dir), windColor: type === 'offshore' ? 'var(--accent)' : type === 'onshore' ? 'var(--warm)' : 'var(--soft)',
        tide: lvl == null ? '—' : `${lvl >= 0 ? '+' : ''}${lvl.toFixed(1)} m ${up ? '↑' : '↓'}`,
      });
    }
    return rows;
  });

  let meteo = $derived(data ? [
    { k: 'AIR', v: `${data.temp} °C`, sub: `ressenti ${data.felt} °C` },
    { k: 'EAU', v: data.waterTemp != null ? `${Math.round(data.waterTemp)} °C` : '—', sub: wetsuit(data.waterTemp) },
    { k: 'CIEL', v: WEATHER_LABEL[data.code] ?? '—' },
    { k: 'UV', v: `${data.uv} · ${uvLabel(data.uv).toLowerCase()}` },
    { k: 'LEVER', v: data.sunrise },
    { k: 'COUCHER', v: data.sunset },
    { k: 'HUMIDITÉ', v: `${data.humidity} %` },
    { k: 'PRESSION', v: `${data.pressure} hPa` },
  ] : []);

  // ─── Navigation spots ───
  let spotsNav = $derived(SPOTS.map((s, i) => {
    const d = allSpotsData[s.name];
    const sc = d ? surfScore(d) : null;
    return { ...s, i, fav: favorites.includes(s.name), score: sc == null ? '—' : sc.toFixed(1), color: sc == null ? 'var(--muted)' : tone(sc) };
  }).sort((a, b) => (b.fav - a.fav) || (a.i - b.i))); // favoris en premier
  let isFav = $derived(favorites.includes(spot.name));

  // ─── Vue carte : on choisit un spot sur la carte, zoom animé, puis les infos ───
  // Avec un spot par défaut dans les préférences, on ouvre directement ce spot.
  let view = $state(startPrefs?.defaultSpot ? 'spot' : 'map');
  let mapTarget = $state(null);
  let mapFrom = $state(null);
  let mapHover = $state(null);

  function pickFromMap(name) {
    const i = SPOTS.findIndex((s) => s.name === name);
    if (i >= 0) { spotIdx = i; camIdx = 0; }
    mapTarget = null;
    view = 'spot';
    try { window.scrollTo({ top: 0 }); } catch {}
  }
  function backToMap() {
    mapFrom = spot.name;
    mapTarget = null;
    view = 'map';
  }

  let mapSpots = $derived(spotsNav.map((s) => ({ name: s.name, score: s.score, color: s.color })));
  let mapList = $derived(SPOTS.map((s) => {
    const d = allSpotsData[s.name];
    const sc = d ? surfScore(d) : null;
    const type = d ? windType(d.windDir) : null;
    return {
      name: s.name,
      y: SPOT_POS[s.name]?.y ?? 0,
      score: sc == null ? '—' : sc.toFixed(1),
      color: sc == null ? 'var(--muted)' : tone(sc),
      verdict: sc == null ? '…' : sc >= 7 ? 'GO' : sc >= 5 ? 'BOF' : 'NON',
      swell: d ? `${d.swellH.toFixed(1)} m · ${Math.round(d.swellPeriod)} s` : '—',
      wind: d ? `${knToKmh(d.wind)} km/h ${type === 'offshore' ? 'offshore' : type === 'onshore' ? 'onshore' : 'side'}` : '—',
      windColor: type === 'offshore' ? 'var(--accent)' : type === 'onshore' ? 'var(--warm)' : 'var(--soft)',
      fav: favorites.includes(s.name),
      cams: s.webcams.length,
    };
  }).sort((a, b) => a.y - b.y));

  // ─── Chargement ───
  async function loadSpot(s, force = false) {
    if (allSpotsData[s.name] && !force) return;
    try {
      allSpotsData[s.name] = await fetchConditions(s);
    } catch (e) {
      console.error(e);
      if (s === spot) error = true;
    }
  }

  async function refreshAll() {
    error = false;
    loading = true;
    await loadSpot(spot, true);
    loading = false;
    for (const s of SPOTS) if (s !== spot) await loadSpot(s, true);
  }

  $effect(() => {
    const s = spot;
    if (!allSpotsData[s.name]) {
      loading = true;
      loadSpot(s).then(() => (loading = false));
    }
  });

  onMount(() => {
    if (!user) try { if (localStorage.getItem('surfboard-mode') === 'expert') mode = 'expert'; } catch {}
    refreshAll();
    const clock = setInterval(() => (now = new Date()), 30_000);
    const refresh = setInterval(refreshAll, 15 * 60_000);
    return () => { clearInterval(clock); clearInterval(refresh); };
  });

  function fullscreen() {
    camEl?.requestFullscreen?.();
  }
</script>

<svelte:head>
  <title>Surfboard — {spot.name}</title>
</svelte:head>

<div class="page">
  <OceanBackground />
  {#if view === 'spot'}
    <button class="map-fab mono" onclick={backToMap} aria-label="Revenir à la carte">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2-6-2zM9 4v14M15 6v14" /></svg>
      CARTE
    </button>
  {/if}

  <div class="wrap">
    <header class="top rv" style="--i:0">
      <span class="wordmark">SURFBOARD</span>
      <div class="mob-title">
        {#if view === 'map'}
          <span class="mono label">SUD-OUEST · {hhmm(now)}</span>
          <span class="mob-name">Choisis ton spot</span>
        {:else}
          <span class="mono label">SPOT {pad(spotIdx + 1)} · {hhmm(now)}</span>
          <span class="mob-name">{spot.name}</span>
        {/if}
      </div>
      {#if view === 'spot'}
        <button class="map-btn mono" onclick={backToMap} aria-label="Revenir à la carte">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2-6-2zM9 4v14M15 6v14" /></svg>
          <span class="map-btn-txt">CARTE</span>
        </button>
      {/if}
      <nav class="spots" aria-label="Spots">
        {#each spotsNav as s}
          <button class="spot" class:cur={view === 'spot' && s.i === spotIdx} aria-current={view === 'spot' && s.i === spotIdx ? 'page' : undefined} onclick={() => { if (view === 'map') mapTarget = s.name; else { spotIdx = s.i; camIdx = 0; } }}>
            {#if s.fav}<svg class="fav-mini" width="11" height="11" viewBox="0 0 24 24" aria-label="Favori"><path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" /></svg>{/if}{s.name}<span class="mono spot-score" style:color={s.color}>{s.score}</span>
          </button>
        {/each}
        {#if user && view === 'spot'}
          <button class="fav-btn" class:on={isFav} aria-pressed={isFav} onclick={() => toggleFavorite(spot.name)}
            aria-label={isFav ? `Retirer ${spot.name} des favoris` : `Ajouter ${spot.name} aux favoris`} title={isFav ? 'Retirer des favoris' : 'Ajouter aux favoris'}>
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" /></svg>
          </button>
        {/if}
      </nav>
      <span class="mono date">{dateLabel}</span>
      <div class="mode" role="group" aria-label="Mode d'affichage">
        <span class="mode-pill" class:right={isExpert} aria-hidden="true"></span>
        <button class="mono" class:on={!isExpert} aria-pressed={!isExpert} onclick={() => setMode('simple')}>SIMPLE</button>
        <button class="mono" class:on={isExpert} aria-pressed={isExpert} onclick={() => setMode('expert')}>EXPERT</button>
      </div>
      {#if user}
        <a class="acct" href="/compte" aria-label="Mon compte ({user.name})" title="Mon compte">{user.name.slice(0, 1).toUpperCase()}</a>
      {:else}
        <a class="acct-login mono" href="/connexion">CONNEXION</a>
      {/if}
    </header>

    {#if view === 'map'}
      <div class="map-view" class:diving={mapTarget}>
        <div class="map-box rv" style="--i:1">
          <SpotMap spots={mapSpots} target={mapTarget} from={mapFrom} highlight={mapHover}
            onpick={pickFromMap} onhover={(n) => (mapHover = n)} />
        </div>
        <aside class="map-list" aria-label="Liste des spots">
          <span class="mono label rv" style="--i:2">LES SPOTS · DU NORD AU SUD</span>
          {#each mapList as m, i}
            <button class="ml-item panel rv" style="--i:{3 + i}" class:hl={mapHover === m.name} class:going={mapTarget === m.name}
              onclick={() => (mapTarget = m.name)}
              onpointerenter={() => (mapHover = m.name)} onpointerleave={() => (mapHover = null)}
              onfocus={() => (mapHover = m.name)} onblur={() => (mapHover = null)}>
              <span class="ml-score mono" style:color={m.color} style:border-color={m.color}>{m.score}</span>
              <span class="ml-main">
                <span class="ml-name">
                  {m.name}
                  {#if m.fav}<svg class="fav-mini" width="11" height="11" viewBox="0 0 24 24" aria-label="Favori"><path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" /></svg>{/if}
                  {#if m.cams}<span class="ml-cam mono">CAM</span>{/if}
                </span>
                <span class="ml-sub mono">{m.swell} · <span style:color={m.windColor}>{m.wind}</span></span>
              </span>
              <span class="ml-verdict mono" style:color={m.color}>{m.verdict}</span>
              <svg class="ml-go" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
            </button>
          {/each}
        </aside>
      </div>
    {:else if !data}
      <section class="panel empty">
        {#if error && !loading}
          <p>Impossible de charger les conditions.</p>
          <button class="retry mono" onclick={refreshAll}>RÉESSAYER</button>
        {:else}
          <p class="mono label">CHARGEMENT DES CONDITIONS…</p>
        {/if}
      </section>
    {:else}
    {#key spot.name}
      <div class="hero">
        <!-- Webcam -->
        <section class="cam rv" style="--i:1" bind:this={camEl}>
          {#if cam && camInfo?.ok}
            {#key camInfo.src}
              {#if camInfo.kind === 'video'}
                <video src={camInfo.src} autoplay muted loop playsinline controls preload="auto"
                  class:loaded={camLoaded} onloadeddata={() => (camLoaded = true)} onerror={() => (camLoaded = true)}
                  aria-label="Webcam {spot.name} — {cam.label}"></video>
              {:else}
                <iframe src={camInfo.src} title="Webcam {spot.name} — {cam.label}" allow="autoplay; fullscreen" allowfullscreen referrerpolicy="no-referrer" class:loaded={camLoaded} onload={() => (camLoaded = true)}></iframe>
              {/if}
            {/key}
          {:else}
            <svg viewBox="0 0 800 470" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Pas de webcam pour ce spot">
              <rect width="800" height="180" fill="#3B5566" />
              <rect y="180" width="800" height="210" fill="#1F3D4E" />
              <rect y="390" width="800" height="80" fill="#5A5140" />
              <path d="M0 230 C90 220 180 240 270 230 S450 220 540 230 S720 240 800 230" stroke="#7D98A7" stroke-width="3" fill="none" />
              <path d="M0 290 C100 276 200 302 310 288 S520 276 630 290 S760 298 800 292" stroke="#A9BFCA" stroke-width="6" fill="none" />
              <path d="M0 350 C120 338 240 362 380 348 S640 336 800 350" stroke="#D3DFE5" stroke-width="9" fill="none" />
              <path d="M0 386 C140 378 280 394 440 384 S700 376 800 386" stroke="#F0F5F7" stroke-width="10" fill="none" />
            </svg>
          {/if}
          {#if cam && camInfo?.ok !== false && !camLoaded}<div class="cam-loading" aria-hidden="true"><span class="spinner"></span></div>{/if}
          {#if cam && camInfo && !camInfo.ok}
            <div class="cam-off"><span class="mono">WEBCAM HORS LIGNE</span><span>{camInfo.reason}</span></div>
          {:else if !cam}
            <div class="cam-off"><span class="mono">PAS DE WEBCAM CÔTÉ OCÉAN</span><span>Aucune caméra publique ne filme ce spot.</span></div>
          {/if}
          <div class="cam-ui mono">
            <div class="cam-row">
              {#if cam}
                <span class="chip" class:warn={camStale} title={camInfo?.capturedAt ? `Image capturée le ${new Date(camInfo.capturedAt).toLocaleString('fr-FR')}` : undefined}><span class="dot" class:blink={camInfo?.live} style:background={camInfo?.live ? 'var(--live)' : camStale ? 'var(--warm)' : 'var(--muted)'}></span>CAM-{pad(camIdx + 1)} · {cam.label} · {camStatus}</span>
              {:else}
                <span class="chip">{spot.name.toUpperCase()}</span>
              {/if}
              <span class="chip">MAJ {hhmm(data.fetchedAt)}</span>
            </div>
            <div class="cam-row end">
              <span class="chip">Houle ≈ {data.waveH.toFixed(1)} m · {Math.round(data.wavePeriod)} s</span>
              {#if cam}
                <div class="cam-actions">
                  {#if camList.length > 1}
                    {#each camList as c, i}
                      <button class="cam-tab" class:on={i === camIdx} aria-pressed={i === camIdx} onclick={() => (camIdx = i)}>
                        CAM-{pad(i + 1)}<span class="cam-tab-label"> · {c.label}</span>
                      </button>
                    {/each}
                  {/if}
                  <a class="cam-btn" href={cam.page} target="_blank" rel="noopener noreferrer" aria-label="Ouvrir la webcam sur le site source" title="Ouvrir sur le site source">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" /></svg>
                  </a>
                  <button class="cam-btn" aria-label="Plein écran" onclick={fullscreen}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" /></svg>
                  </button>
                </div>
              {/if}
            </div>
          </div>
        </section>

        <!-- Score -->
        <section class="panel score rv" style="--i:2">
          <div class="ring">
            <svg viewBox="0 0 120 120" role="img" aria-label="Score {score.toFixed(1).replace('.', ',')} sur 10">
              <circle cx="60" cy="60" r="50" fill="none" stroke="var(--track)" stroke-width="10" />
              <circle cx="60" cy="60" r="50" fill="none" stroke={tone(score)} stroke-width="10" stroke-linecap="round"
                stroke-dasharray="{(scoreT.current / 10) * 314.16} 314.16" transform="rotate(-90 60 60)" />
            </svg>
            <div class="ring-txt">
              <span class="mono ring-val">{scoreT.current.toFixed(1)}</span>
              <span class="mono ring-sub">SCORE /10</span>
            </div>
          </div>
          <div class="score-body">
            <span class="mono badge pop" style:background={verdict.bg} style:color={verdict.fg}>{verdict.text}</span>
            <span class="score-title">{windowInfo.title}</span>
            <span class="score-desc">{summary}</span>
          </div>
        </section>

        <!-- Marée -->
        <section class="panel tide rv" style="--i:3">
          <div class="tide-head">
            <span class="mono label">MARÉE EN DIRECT</span>
            <span class="mono live"><span class="dot blink" style:background="var(--warm)"></span>LIVE</span>
          </div>
          {#if tide}
            <div class="tide-now">
              <span class="mono big">{tide.level >= 0 ? '+' : ''}{tide.level.toFixed(2)}<small> m</small></span>
              <span class="soft">
                {tide.rising ? 'Montante' : 'Descendante'} · {tide.rate >= 0 ? '+' : ''}{tide.rate} cm/h{#if tide.next}{` · ${tide.next.high ? 'PM' : 'BM'} dans ${tide.nextIn}`}{/if}
              </span>
            </div>
            <svg viewBox="0 0 360 70" class="tide-svg" role="img" aria-label="Courbe de marée sur 24 h, position actuelle {hhmm(now)}">
              <path class="draw" pathLength="1" d={tide.full} fill="none" stroke="var(--track)" stroke-width="2" />
              {#if tide.ahead}<path class="draw late" pathLength="1" d={tide.ahead} fill="none" stroke="var(--accent)" stroke-width="3" />{/if}
              <line x1={tide.nx} y1="0" x2={tide.nx} y2="70" stroke="var(--warm)" stroke-width="1.5" stroke-dasharray="3 3" />
              <circle class="pulse" cx={tide.nx} cy={tide.ny} r="5" fill="none" stroke="var(--warm)" stroke-width="2" />
              <circle cx={tide.nx} cy={tide.ny} r="5" fill="var(--warm)" />
            </svg>
            <div class="mono tide-ext">
              {#each tide.shown as e}
                <span>{e.high ? 'PM' : 'BM'} {fmtH(e.t)} · {e.v >= 0 ? '+' : ''}{e.v.toFixed(1)} m</span>
              {/each}
            </div>
          {:else}
            <p class="soft">Données de marée indisponibles.</p>
          {/if}
        </section>
      </div>

      {#if isExpert}
      <div class="expert">
        <div class="ex-row">
          <!-- Pourquoi ce score -->
          <section class="panel ex-card factors rv" style="--i:4">
            <span class="mono label">POURQUOI {score.toFixed(1)} ?</span>
            {#each factors as f, i}
              <div class="factor">
                <span class="f-label">{f.label}</span>
                <div class="f-track"><div class="f-fill" style:--i={i} style:width="{f.v * 10}%" style:background={f.color}></div></div>
                <span class="mono f-val">{f.v.toFixed(1)}</span>
              </div>
            {/each}
          </section>

          <!-- Houle détaillée -->
          <section class="panel ex-card rv" style="--i:5">
            <span class="mono label">HOULE DÉTAILLÉE</span>
            <div class="kv-grid">
              <div class="kv">
                <span class="k">Houle (swell)</span>
                <span class="mono v">{data.swellH.toFixed(1)} m</span>
                <span class="mono s">{Math.round(data.swellPeriod)} s · {Math.round(data.swellDir)}° {windLabel(data.swellDir)}</span>
              </div>
              <div class="kv">
                <span class="k">Mer du vent</span>
                <span class="mono v">{data.windWaveH != null ? data.windWaveH.toFixed(1) + ' m' : '—'}</span>
                {#if data.windWaveH != null}<span class="mono s">{Math.round(data.windWavePeriod)} s · {Math.round(data.windWaveDir)}° {windLabel(data.windWaveDir)}</span>{/if}
              </div>
              <div class="kv">
                <span class="k">Max des sets (est.)</span>
                <span class="mono v">{(data.waveH * 1.6).toFixed(1)} m</span>
                <span class="mono s">mer totale {data.waveH.toFixed(1)} m</span>
              </div>
              <div class="kv">
                <span class="k">Puissance</span>
                <span class="mono v">{wavePower(data.swellH, data.swellPeriod)} kW/m</span>
                <span class="mono s">par mètre de crête</span>
              </div>
            </div>
          </section>

          <!-- Vent -->
          <section class="panel ex-card wind rv" style="--i:6">
            <span class="mono label">VENT</span>
            <div class="wind-top">
              <svg class="compass" viewBox="0 0 84 84" role="img" aria-label="Vent de {windLabel(data.windDir)}, {WIND_FX[wt].toLowerCase()}, {windKmh} km/h">
                <circle cx="42" cy="42" r="38" fill="none" stroke="var(--track)" stroke-width="2" />
                <text x="42" y="14" text-anchor="middle" font-size="9" fill="var(--muted)" font-family="JetBrains Mono">N</text>
                <text x="74" y="45" text-anchor="middle" font-size="9" fill="var(--muted)" font-family="JetBrains Mono">E</text>
                <text x="42" y="78" text-anchor="middle" font-size="9" fill="var(--muted)" font-family="JetBrains Mono">S</text>
                <text x="10" y="45" text-anchor="middle" font-size="9" fill="var(--muted)" font-family="JetBrains Mono">O</text>
                <g transform="rotate({toDeg(data.windDir)} 42 42)"><path d="M42 18 L48 44 L42 38 L36 44 Z" fill="var(--accent)" /></g>
              </svg>
              <div class="kv-grid tight">
                <div class="kv"><span class="k">Moyen</span><span class="mono v sm">{windKmh} km/h</span></div>
                <div class="kv"><span class="k">Rafales</span><span class="mono v sm">{gustsKmh} km/h</span></div>
                <div class="kv"><span class="k">Direction</span><span class="mono v sm">{windLabel(data.windDir)} {data.windDir}°</span></div>
                <div class="kv"><span class="k">Effet</span><span class="mono v sm" style:color={wt === 'offshore' ? 'var(--accent)' : wt === 'onshore' ? 'var(--warm)' : 'var(--soft)'}>{wt === 'cross' ? 'Side-shore' : wt === 'offshore' ? 'Offshore' : 'Onshore'}</span></div>
              </div>
            </div>
            <div class="steps">
              {#each windSteps as w}
                <div class="step">
                  <span class="mono st-t">{w.t}</span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={w.color} stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" style:transform="rotate({w.deg}deg)" aria-hidden="true"><path d="M12 20V4M6 10l6-6 6 6" /></svg>
                  <span class="mono st-v">{w.v}</span>
                  <span class="mono st-d" style:color={w.color}>{w.d}</span>
                </div>
              {/each}
            </div>
          </section>
        </div>

        <div class="ex-row">
          <!-- Heure par heure -->
          <section class="panel ex-card hourly rv" style="--i:7">
            <span class="mono label">HEURE PAR HEURE</span>
            <div class="table-scroll">
              <table class="mono">
                <thead>
                  <tr><th>H</th><th>SCORE</th><th>HOULE</th><th>PÉRIODE</th><th class="opt">DIR. HOULE</th><th>VENT</th><th class="opt">RAFALES</th><th class="opt">MARÉE</th></tr>
                </thead>
                <tbody>
                  {#each table as r, i}
                    <tr class:hi={r.hi} style:--i={Math.min(i, 14)}>
                      <td class="muted">{r.t}</td>
                      <td><span class="sc" style:color={r.scoreColor}><span class="dot" style:background={r.scoreColor}></span>{r.s}</span></td>
                      <td>{r.h}</td>
                      <td>{r.p}</td>
                      <td class="opt">{r.sd}</td>
                      <td><span class="wcell"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={r.windColor} stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" style:transform="rotate({r.deg}deg)" aria-hidden="true"><path d="M12 20V4M6 10l6-6 6 6" /></svg>{r.w}<span class="unit"> km/h</span></span></td>
                      <td class="opt">{r.g} km/h</td>
                      <td class="opt">{r.tide}</td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>
          </section>

          <!-- Météo -->
          <section class="meteo rv" style="--i:8">
            {#each meteo as m}
              <div class="panel m-card">
                <span class="mono label">{m.k}</span>
                <span class="mono m-v">{m.v}</span>
                {#if m.sub}<span class="mono m-s">{m.sub}</span>{/if}
              </div>
            {/each}
          </section>
        </div>
      </div>
      {:else}
      <div class="bottom">
        <section class="stats">
          <div class="panel stat rv" style="--i:4">
            <span class="mono label">HOULE</span>
            <span class="mono val">{data.swellH.toFixed(1)}<small> m</small></span>
            <span class="mono sub">{Math.round(data.swellPeriod)} s · {windLabel(data.swellDir)}</span>
          </div>
          <div class="panel stat rv" style="--i:5">
            <span class="mono label">VENT</span>
            <span class="mono val">{windKmh}<small> km/h</small></span>
            <span class="mono sub" style:color={wt === 'offshore' ? 'var(--accent)' : wt === 'onshore' ? 'var(--warm)' : 'var(--soft)'}>{windLabel(data.windDir)} · {WIND_FX[wt]}</span>
          </div>
          <div class="panel stat rv" style="--i:6">
            <span class="mono label">EAU</span>
            <span class="mono val">{data.waterTemp != null ? Math.round(data.waterTemp) : '—'}<small> °C</small></span>
            <span class="mono sub">{wetsuit(data.waterTemp)}</span>
          </div>
        </section>

        <section class="panel day rv" style="--i:7">
          <span class="mono label">TA JOURNÉE</span>
          <div class="bars">
            {#each dayHours as h, i}
              <div class="bar-col" title="{h.h}h · {h.s.toFixed(1)}/10">
                <span class="mono bar-val" style:color={h.label}>{h.s.toFixed(1)}</span>
                <div class="bar" style:--i={i} style:--h="{h.px}px" style:background={h.color}></div>
                <span class="mono bar-t">{h.h}h</span>
              </div>
            {/each}
          </div>
        </section>
      </div>
      {/if}
    {/key}
    {/if}
  </div>
</div>

<style>
  .page{position:relative;min-height:100vh;overflow:hidden;background:var(--bg)}

  .wrap{position:relative;z-index:1;max-width:1360px;margin:0 auto;padding:24px 32px 40px;display:flex;flex-direction:column;gap:20px}

  .mono{font-family:var(--mono)}
  .label{font-size:12px;color:var(--muted);letter-spacing:.06em}
  .soft{color:var(--soft)}
  .dot{width:8px;height:8px;border-radius:4px;display:inline-block}
  .panel{background:var(--panel);border:1px solid var(--border);border-radius:20px;backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px)}

  /* Header */
  .top{display:flex;flex-wrap:wrap;align-items:center;gap:16px 24px}
  .wordmark{font-family:var(--mono);font-size:15px;font-weight:700;letter-spacing:.12em}
  .mob-title{display:none}
  .spots{display:flex;flex-wrap:wrap;gap:6px;order:10;flex-basis:100%}
  .map-fab{display:none;position:fixed;left:50%;bottom:max(16px, env(safe-area-inset-bottom));z-index:30;transform:translateX(-50%);height:48px;padding:0 20px;border-radius:999px;background:var(--accent);color:var(--on-accent);border:none;box-shadow:0 10px 30px rgba(0,0,0,.45);align-items:center;gap:8px;font-size:12px;font-weight:700;letter-spacing:.05em;cursor:pointer}
  .spot{height:40px;padding:0 14px;border-radius:10px;display:flex;align-items:center;gap:8px;font-size:14px;font-weight:600;color:var(--soft);background:transparent;border:1px solid transparent;cursor:pointer;white-space:nowrap;transition:background .15s,color .15s}
  .spot:hover{color:var(--text)}
  .spot.cur{color:var(--text);background:var(--panel);border-color:var(--border)}
  .spot-score{font-size:12px}
  .date{margin-left:auto;font-size:12px;color:var(--muted)}
  .acct{width:44px;height:44px;border-radius:50%;background:var(--accent);color:var(--on-accent);display:flex;align-items:center;justify-content:center;font-family:var(--mono);font-size:17px;font-weight:700;text-decoration:none;flex-shrink:0;transition:transform .2s,box-shadow .2s}
  .acct:hover{color:var(--on-accent);transform:scale(1.06);box-shadow:0 0 0 4px rgba(79,224,208,.2)}
  .acct-login{height:44px;padding:0 16px;border-radius:999px;border:1px solid var(--border);background:var(--panel);color:var(--text);font-size:12px;font-weight:700;letter-spacing:.05em;display:flex;align-items:center;text-decoration:none;transition:border-color .2s}
  .acct-login:hover{border-color:var(--accent);color:var(--text)}
  .fav-mini{fill:var(--warm);margin-right:-2px}
  .fav-btn{width:40px;height:40px;border-radius:10px;border:1px solid var(--border);background:transparent;color:var(--muted);display:flex;align-items:center;justify-content:center;cursor:pointer;transition:color .2s,border-color .2s,transform .2s}
  .fav-btn svg{fill:none;stroke:currentColor;stroke-width:2;stroke-linejoin:round;transition:fill .25s,transform .35s cubic-bezier(.3,1.4,.5,1)}
  .fav-btn:hover{color:var(--warm);border-color:var(--warm)}
  .fav-btn.on{color:var(--warm);border-color:rgba(255,181,71,.5)}
  .fav-btn.on svg{fill:var(--warm);transform:rotate(72deg) scale(1.1)}
  .mode{position:relative;display:grid;grid-template-columns:1fr 1fr;padding:3px;border-radius:999px;background:var(--panel);border:1px solid var(--border)}
  .mode button{height:38px;padding:0 16px;border:none;border-radius:999px;font-size:12px;font-weight:700;letter-spacing:.04em;cursor:pointer;background:transparent;color:var(--muted);transition:color .25s;position:relative;z-index:1}
  .mode button:hover{color:var(--text)}
  .mode button.on{color:var(--on-accent)}
  .mode-pill{position:absolute;top:3px;bottom:3px;left:3px;width:calc(50% - 3px);border-radius:999px;background:var(--accent);transition:transform .45s cubic-bezier(.3,1.35,.5,1)}
  .mode-pill.right{transform:translateX(100%)}

  /* Expert */
  .expert{display:flex;flex-direction:column;gap:20px}
  .ex-row{display:flex;flex-wrap:wrap;gap:20px}
  .ex-card{flex:1 1 300px;min-width:0;border-radius:18px;padding:18px;display:flex;flex-direction:column;gap:12px}
  .wind{flex-basis:360px}
  .factor{display:flex;align-items:center;gap:12px}
  .f-label{width:90px;font-size:14px;color:var(--soft)}
  .f-track{flex:1;height:7px;border-radius:4px;background:var(--track);overflow:hidden}
  .f-fill{height:100%;border-radius:4px}
  .f-val{width:36px;text-align:right;font-size:13px}
  .kv-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}
  .kv-grid.tight{gap:10px 18px;flex:1}
  .kv{display:flex;flex-direction:column;gap:3px;min-width:0}
  .k{font-size:13px;color:var(--muted)}
  .v{font-size:24px;font-weight:700}
  .v.sm{font-size:18px}
  .s{font-size:12px;color:var(--soft)}
  .wind-top{display:flex;gap:16px;align-items:center}
  .compass{width:92px;height:92px;flex-shrink:0}
  .steps{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}
  .step{border:1px solid var(--border);border-radius:10px;padding:8px 6px;display:flex;flex-direction:column;align-items:center;gap:3px}
  .st-t{font-size:11px;color:var(--muted)}
  .st-v{font-size:13px;font-weight:700}
  .st-d{font-size:10px}

  .hourly{flex:999 1 640px;gap:6px}
  .table-scroll{overflow-x:auto}
  table{width:100%;min-width:640px;border-collapse:collapse;font-size:13px}
  th{font-size:11px;font-weight:400;color:var(--muted);text-align:left;padding:8px 6px;border-bottom:1px solid var(--border)}
  td{padding:7px 6px;border-bottom:1px solid var(--border);white-space:nowrap}
  tr.hi td{background:rgba(79,224,208,.07)}
  .muted{color:var(--muted)}
  .sc{display:flex;align-items:center;gap:8px;font-weight:700}
  .wcell{display:flex;align-items:center;gap:6px}
  .meteo{flex:1 1 300px;min-width:0;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;align-content:start}
  .m-card{border-radius:14px;padding:14px;display:flex;flex-direction:column;gap:4px;backdrop-filter:none}
  .m-card .label{font-size:11px}
  .m-v{font-size:18px;font-weight:700}
  .m-s{font-size:11px;color:var(--soft)}
  a.cam-btn{pointer-events:auto;text-decoration:none}

  /* Hero */
  .hero{display:grid;grid-template-columns:minmax(0,1fr) minmax(380px,440px);grid-template-areas:"cam score" "cam tide";gap:20px}
  .cam{grid-area:cam;position:relative;min-height:470px;border-radius:20px;overflow:hidden;border:1px solid var(--border);background:#1F3D4E}
  .cam > svg,.cam iframe,.cam video{position:absolute;inset:0;width:100%;height:100%;border:0;display:block}
  .cam-ui{position:absolute;inset:16px;display:flex;flex-direction:column;justify-content:space-between;font-size:12px;pointer-events:none}
  .cam-row{display:flex;justify-content:space-between;align-items:flex-start;gap:8px;flex-wrap:wrap}
  .cam-row.end{align-items:flex-end}
  .chip{background:rgba(5,10,14,.8);padding:6px 10px;border-radius:6px;color:#fff;display:flex;align-items:center;gap:8px}
  .cam-btn{pointer-events:auto;width:36px;height:36px;border-radius:6px;border:1px solid rgba(255,255,255,.4);background:rgba(5,10,14,.8);color:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer}
  .cam:fullscreen{border-radius:0}
  .chip.warn{color:var(--warm)}
  .cam-off{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;text-align:center;padding:0 24px;background:rgba(6,21,33,.55);font-size:13px;color:var(--soft)}
  .cam-off .mono{font-size:12px;letter-spacing:.08em;color:var(--text)}
  .cam-actions{display:flex;gap:6px;pointer-events:auto}
  .cam-tab{font-family:var(--mono);font-size:12px;height:36px;padding:0 12px;border-radius:6px;cursor:pointer;color:#fff;background:rgba(5,10,14,.8);border:1px solid rgba(255,255,255,.4);white-space:nowrap}
  .cam-tab.on{color:#05090C;background:#fff;border-color:#fff}

  .score{grid-area:score;padding:20px;display:flex;gap:20px;align-items:center}
  .ring{position:relative;width:136px;height:136px;flex-shrink:0}
  .ring svg{width:100%;height:100%}
  .ring-txt{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center}
  .ring-val{font-size:34px;font-weight:700}
  .ring-sub{font-size:11px;color:var(--muted)}
  .score-body{display:flex;flex-direction:column;gap:8px;min-width:0}
  .badge{align-self:flex-start;font-size:13px;font-weight:700;padding:4px 12px;border-radius:4px;letter-spacing:.08em}
  .score-title{font-size:22px;font-weight:600;line-height:1.2}
  .score-desc{font-size:14px;line-height:1.5;color:var(--soft)}

  .tide{grid-area:tide;padding:18px 20px;display:flex;flex-direction:column;gap:10px}
  .tide-head{display:flex;justify-content:space-between;align-items:baseline}
  .live{font-size:12px;color:var(--warm);display:flex;align-items:center;gap:6px}
  .tide-now{display:flex;align-items:baseline;gap:12px;flex-wrap:wrap}
  .tide-now .soft{font-size:14px}
  .big{font-size:30px;font-weight:700}
  .big small,.val small{font-size:14px;color:var(--muted);font-weight:400}
  .tide-svg{width:100%;height:auto;display:block}
  .tide-ext{display:flex;justify-content:space-between;gap:8px;font-size:12px;color:var(--muted)}

  /* Bas */
  .bottom{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:20px}
  .stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}
  .stat{border-radius:16px;padding:16px;display:flex;flex-direction:column;gap:6px;backdrop-filter:none}
  .stat .label{font-size:11px}
  .val{font-size:28px;font-weight:700}
  .sub{font-size:13px;color:var(--soft)}

  .day{border-radius:16px;padding:16px;display:flex;flex-direction:column;gap:10px;backdrop-filter:none}
  .day .label{font-size:11px}
  .bars{display:flex;gap:6px;flex:1;align-items:flex-end}
  .bar-col{flex:1;display:flex;flex-direction:column;align-items:center;gap:6px;min-width:0}
  .bar{width:100%;height:var(--h);border-radius:4px}
  .bar-val,.bar-t{font-size:11px}
  .bar-t{color:var(--muted)}

  .empty{padding:60px 20px;text-align:center;display:flex;flex-direction:column;align-items:center;gap:16px}
  .retry{height:40px;padding:0 18px;border-radius:999px;border:none;background:var(--accent);color:var(--on-accent);font-weight:700;font-size:12px;letter-spacing:.04em;cursor:pointer}


  /* ─── Animations ─── */
  @keyframes rise{from{opacity:0;transform:translateY(16px) scale(.985)}to{opacity:1;transform:none}}
  @keyframes fade{from{opacity:0}to{opacity:1}}
  @keyframes grow-y{from{transform:scaleY(0)}to{transform:scaleY(1)}}
  @keyframes grow-x{from{transform:scaleX(0)}to{transform:scaleX(1)}}
  @keyframes draw{from{stroke-dashoffset:1}to{stroke-dashoffset:0}}
  @keyframes pulse{0%{transform:scale(1);opacity:.9}100%{transform:scale(3.2);opacity:0}}
  @keyframes pop{0%{transform:scale(.6);opacity:0}60%{transform:scale(1.12);opacity:1}100%{transform:scale(1)}}
  @keyframes blink{0%,100%{opacity:1}50%{opacity:.25}}
  @keyframes spin{to{transform:rotate(360deg)}}
  @keyframes shimmer{from{background-position:-200% 0}to{background-position:200% 0}}

  .rv{animation:rise .7s cubic-bezier(.2,.75,.25,1) both;animation-delay:calc(var(--i,0) * 75ms)}


  .blink{animation:blink 1.6s ease-in-out infinite}
  .badge.pop{animation:pop .5s cubic-bezier(.3,1.4,.5,1) both;animation-delay:.9s}

  .draw{stroke-dasharray:1;animation:draw 1.4s cubic-bezier(.4,0,.2,1) both;animation-delay:.35s}
  .draw.late{animation-delay:1.1s;animation-duration:.9s}
  .pulse{transform-box:fill-box;transform-origin:center;animation:pulse 2.2s ease-out infinite;animation-delay:1.6s}

  .bar{transform-origin:bottom;animation:grow-y .6s cubic-bezier(.2,.8,.2,1) both;animation-delay:calc(.5s + var(--i,0) * 45ms)}
  .f-fill{transform-origin:left;animation:grow-x .8s cubic-bezier(.2,.8,.2,1) both;animation-delay:calc(.45s + var(--i,0) * 90ms)}
  tbody tr{animation:fade .45s ease both;animation-delay:calc(.55s + var(--i,0) * 35ms)}

  .cam iframe,.cam video{opacity:0;transition:opacity .6s ease}
  .cam iframe.loaded,.cam video.loaded{opacity:1}
  .cam video{object-fit:cover;background:#1F3D4E}
  .cam-loading{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:linear-gradient(100deg,#1F3D4E 30%,#2A5063 50%,#1F3D4E 70%);background-size:200% 100%;animation:shimmer 1.8s linear infinite}
  .spinner{width:28px;height:28px;border-radius:50%;border:3px solid rgba(255,255,255,.2);border-top-color:var(--accent);animation:spin .8s linear infinite}

  .panel{transition:border-color .25s ease}
  .stat:hover,.ex-card:hover,.m-card:hover,.day:hover{border-color:rgba(120,200,235,.34)}
  .spot{transition:background .2s,color .2s,transform .2s}
  .spot:active,.cam-tab:active,.cam-btn:active,.mode button:active{transform:scale(.96)}

  @media (prefers-reduced-motion:reduce){
    .page :global(*),.page :global(*::before),.page :global(*::after){animation:none !important;transition:none !important}
    .cam iframe,.cam video{opacity:1}
  }

  /* ─── Vue carte ─── */
  .map-btn{height:40px;padding:0 14px;border-radius:10px;border:1px solid var(--border);background:var(--panel);color:var(--text);display:flex;align-items:center;gap:8px;font-size:12px;font-weight:700;letter-spacing:.05em;cursor:pointer;transition:border-color .2s,transform .2s}
  .map-btn:hover{border-color:var(--accent)}
  .map-view{display:grid;grid-template-columns:minmax(0,1fr) 360px;gap:20px;align-items:start}
  .map-box{height:clamp(440px,74vh,780px)}
  .map-list{display:flex;flex-direction:column;gap:10px;transition:opacity .5s,transform .5s}
  .map-view.diving .map-list{opacity:.35;transform:translateX(12px);pointer-events:none}
  .ml-item{display:flex;align-items:center;gap:14px;padding:14px;border-radius:16px;cursor:pointer;text-align:left;color:var(--text);transition:border-color .2s,transform .25s,background .2s}
  .ml-item:hover,.ml-item.hl{border-color:rgba(79,224,208,.45);transform:translateX(-4px)}
  .ml-item.going{border-color:var(--accent);background:rgba(79,224,208,.1)}
  .ml-score{width:48px;height:48px;border-radius:50%;border:2px solid;display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:700;flex-shrink:0}
  .ml-main{flex:1;min-width:0;display:flex;flex-direction:column;gap:4px}
  .ml-name{font-size:16px;font-weight:600;display:flex;align-items:center;gap:6px}
  .ml-cam{font-size:9px;letter-spacing:.06em;color:var(--muted);border:1px solid var(--border);border-radius:4px;padding:1px 4px}
  .ml-sub{font-size:11px;color:var(--soft);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .ml-verdict{font-size:11px;font-weight:700;letter-spacing:.08em}
  .ml-go{color:var(--muted);flex-shrink:0;transition:transform .2s,color .2s}
  .ml-item:hover .ml-go,.ml-item.hl .ml-go{transform:translateX(3px);color:var(--accent)}

  @media (max-width:1000px){
    .map-view{grid-template-columns:1fr}
    .map-box{height:clamp(380px,62vh,620px)}
    .bottom{grid-template-columns:1fr}
  }

  /* Mobile — Cockpit */
  @media (max-width:720px){
    .wrap{padding:20px 18px 28px;gap:14px}
    .panel{border-radius:18px}

    .top{gap:12px}
    .wordmark,.date{display:none}
    .mob-title{display:flex;flex-direction:column;gap:2px;flex:1;min-width:0}
    .mob-name{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .mob-title .label{font-size:11px}
    .mob-name{font-size:20px;font-weight:700}
    .mode{margin-left:auto}
    .acct{width:40px;height:40px;font-size:15px}
    .acct-login{height:40px;padding:0 12px;font-size:11px}
    .fav-btn{height:44px;flex-shrink:0}
    .map-btn{display:none}
    .map-fab{display:flex}
    .wrap{padding-bottom:88px}
    .mode button{padding:0 10px;font-size:11px}
    .spots{order:3}

    .expert,.ex-row{gap:14px}
    .ex-card{padding:14px;border-radius:16px;gap:10px}
    .ex-card > .label{font-size:11px}
    .f-label{width:86px;font-size:13px}
    .f-track{height:6px}
    .f-val{font-size:12px}
    .kv-grid{gap:12px}
    .k{font-size:12px}
    .v{font-size:20px}
    .v.sm{font-size:17px}
    .compass{width:84px;height:84px}
    .steps{gap:6px}
    .st-t{font-size:10px}
    .st-v{font-size:12px}
    .meteo{grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;order:-1}
    .m-card{padding:10px;border-radius:12px;gap:3px}
    .m-card .label{font-size:10px}
    .m-v{font-size:15px}
    .m-s{font-size:10px}
    table{min-width:0;font-size:12px}
    th{font-size:10px;padding:4px 3px}
    td{padding:6px 3px}
    .opt,.unit{display:none}
    .sc{gap:0}
    .sc .dot{display:none}
    .spots{flex-wrap:nowrap;overflow-x:auto;margin:0 -18px;padding:0 18px;width:calc(100% + 36px);scrollbar-width:none}
    .spots::-webkit-scrollbar{display:none}
    .spot{height:44px;font-size:13px}

    .hero{grid-template-columns:1fr;grid-template-areas:"score" "cam" "tide";gap:14px}
    .cam{min-height:172px;height:172px;border-radius:18px}
    .cam-ui{inset:10px;font-size:11px}
    .chip{padding:4px 7px;border-radius:4px;gap:6px}
    .cam-btn{width:32px;height:32px;border-radius:4px}
    .cam-tab{height:32px;padding:0 10px;font-size:11px;border-radius:4px}
    .cam-tab-label{display:none}

    .score{padding:16px;gap:16px}
    .ring{width:120px;height:120px}
    .ring-val{font-size:30px}
    .ring-sub{font-size:10px}
    .badge{font-size:12px;padding:4px 10px}
    .score-title{font-size:18px;line-height:1.25}
    .score-desc{font-size:13px;line-height:1.45}

    .tide{padding:14px;border-radius:16px;gap:8px}
    .tide .label,.live,.tide-ext{font-size:11px}
    .big{font-size:26px}
    .tide-now .soft{font-size:13px}
    .tide-ext span:nth-child(3){display:none}

    .bottom{gap:14px}
    .stats{gap:8px}
    .stat{border-radius:14px;padding:12px 10px;gap:4px}
    .stat .label{font-size:10px}
    .val{font-size:20px}
    .val small{font-size:12px}
    .sub{font-size:11px}

    .day{border-radius:14px;padding:12px;gap:8px}
    .bars{gap:4px}
    .bar-col{gap:4px}
    .bar-val{display:none}
    .bar{height:10px;border-radius:3px}
    .bar-t{font-size:10px}
  }
</style>
