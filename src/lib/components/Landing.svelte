<script>
  import OceanBackground from '$lib/components/OceanBackground.svelte';
  import { SPOTS } from '$lib/api.js';

  // Données d'exemple pour l'aperçu (reprennent la maquette du design)
  const demoHours = [['8', 5.8], ['9', 6.5], ['10', 7.6], ['11', 8.1], ['12', 7.9], ['13', 7.2], ['14', 5.9], ['15', 4.8], ['16', 4.2], ['17', 3.9]]
    .map(([h, s], i) => ({ h, s, i, color: s >= 7 ? 'var(--accent)' : s >= 5.5 ? 'var(--warm)' : 'var(--dim)', px: Math.round((s / 10) * 56) }));

  const features = [
    { title: 'Un score sur 10', text: 'Houle, période, vent et rafales résumés en une note et un verdict : GO, BOF ou NON.', icon: 'M12 3a9 9 0 1 0 9 9M12 7v5l3 2' },
    { title: 'Le meilleur créneau', text: 'La fenêtre idéale de la journée, et l’heure où les conditions se dégradent.', icon: 'M4 19h16M7 16V9M12 16V5M17 16v-4' },
    { title: 'Webcams des spots', text: 'Lacanau, Le Porge, Montalivet : vois les séries avant de prendre la voiture.', icon: 'M3 7h13v10H3zM16 10l5-3v10l-5-3' },
    { title: 'Marée en direct', text: 'Niveau, sens, vitesse et prochaine pleine ou basse mer, sur une courbe claire.', icon: 'M2 12c3-4 6-4 9 0s6 4 9 0M2 18c3-4 6-4 9 0s6 4 9 0' },
    { title: 'Simple ou Expert', text: 'L’essentiel en un coup d’œil, ou tout le détail : houle, vent heure par heure, météo.', icon: 'M4 6h16M4 12h10M4 18h6' },
    { title: 'Tes spots, tes réglages', text: 'Favoris, spot par défaut et mode d’affichage retrouvés sur tous tes appareils.', icon: 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z' },
  ];
</script>

<svelte:head>
  <title>Surfboard — ça vaut le coup d'y aller ?</title>
  <meta name="description" content="Score de surf, meilleur créneau, webcams, marée et vent pour les spots du Sud-Ouest." />
</svelte:head>

<div class="land">
  <OceanBackground />

  <div class="wrap">
    <header class="top rv" style="--i:0">
      <span class="wordmark">SURFBOARD</span>
      <nav class="top-cta" aria-label="Compte">
        <a class="btn btn-ghost sm" href="/connexion">SE CONNECTER</a>
        <a class="btn btn-primary sm hide-xs" href="/inscription">CRÉER UN COMPTE</a>
      </nav>
    </header>

    <!-- Accroche -->
    <section class="hero">
      <div class="hero-txt">
        <span class="eyebrow rv" style="--i:1">SURF · SUD-OUEST · {SPOTS.length} SPOTS</span>
        <h1 class="rv" style="--i:2">Ça vaut le coup<br />d'y aller ?</h1>
        <p class="lead rv" style="--i:3">
          Score sur 10, meilleur créneau, webcams, marée et vent pour
          {SPOTS.map((s) => s.name).join(', ').replace(/, ([^,]*)$/, ' et $1')} — en un coup d'œil.
        </p>
        <div class="cta rv" style="--i:4">
          <a class="btn btn-primary" href="/inscription">CRÉER MON COMPTE</a>
          <a class="btn btn-ghost" href="/connexion">J'AI DÉJÀ UN COMPTE</a>
        </div>
        <p class="note rv" style="--i:5">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>
          Connecte-toi pour accéder au tableau de bord.
        </p>
      </div>

      <!-- Aperçu de l'app -->
      <figure class="preview rv" style="--i:3" aria-label="Aperçu du tableau de bord avec des données d'exemple">
        <div class="pv-bar">
          <span class="dots" aria-hidden="true"><i></i><i></i><i></i></span>
          <span class="mono pv-tag">APERÇU · DONNÉES D'EXEMPLE</span>
        </div>
        <div class="pv-body">
          <div class="pv-spots mono" aria-hidden="true">
            <span class="pv-spot cur">Lacanau <b style="color:var(--accent)">7.4</b></span>
            <span class="pv-spot">Le Porge <b style="color:var(--accent)">7.9</b></span>
            <span class="pv-spot hide-xs">Hourtin <b style="color:var(--warm)">6.1</b></span>
          </div>

          <div class="pv-grid">
            <div class="pv-card pv-score">
              <div class="ring">
                <svg viewBox="0 0 120 120" aria-hidden="true">
                  <circle cx="60" cy="60" r="50" fill="none" stroke="var(--track)" stroke-width="10" />
                  <circle class="ring-arc" cx="60" cy="60" r="50" fill="none" stroke="var(--accent)" stroke-width="10" stroke-linecap="round" pathLength="100" transform="rotate(-90 60 60)" />
                </svg>
                <div class="ring-txt"><span class="mono ring-val">7.4</span><span class="mono ring-sub">SCORE /10</span></div>
              </div>
              <div class="pv-score-txt">
                <span class="mono badge">GO</span>
                <span class="pv-title">Fenêtre idéale 10:00 → 13:00</span>
                <span class="pv-desc">Swell propre ONO, offshore léger.</span>
              </div>
            </div>

            <div class="pv-card pv-cam" aria-hidden="true">
              <svg viewBox="0 0 354 150" preserveAspectRatio="xMidYMid slice">
                <rect width="354" height="58" fill="#3B5566" />
                <rect y="58" width="354" height="70" fill="#1F3D4E" />
                <rect y="128" width="354" height="22" fill="#5A5140" />
                <path class="wave w1" d="M-40 82 C0 76 40 88 80 82 S160 76 200 82 S280 88 320 82 S380 76 400 82" stroke="#7D98A7" stroke-width="2" fill="none" />
                <path class="wave w2" d="M-40 104 C10 96 50 112 100 104 S190 96 240 104 S330 112 400 104" stroke="#A9BFCA" stroke-width="4" fill="none" />
                <path class="wave w3" d="M-40 124 C20 118 80 130 140 124 S250 118 310 124 S380 128 400 124" stroke="#D3DFE5" stroke-width="5" fill="none" />
              </svg>
              <span class="mono cam-chip"><i class="live"></i>CAM-01 · LIVE</span>
            </div>

            <div class="pv-stats">
              <div class="pv-card pv-stat"><span class="mono k">HOULE</span><span class="mono v">1.4<small> m</small></span><span class="mono s">11 s · ONO</span></div>
              <div class="pv-card pv-stat"><span class="mono k">VENT</span><span class="mono v">12<small> km/h</small></span><span class="mono s" style="color:var(--accent)">E · OFFSHORE</span></div>
              <div class="pv-card pv-stat"><span class="mono k">EAU</span><span class="mono v">15<small> °C</small></span><span class="mono s">Combi 4/3</span></div>
            </div>

            <div class="pv-card pv-day">
              <span class="mono k">TA JOURNÉE</span>
              <div class="bars" aria-hidden="true">
                {#each demoHours as h}
                  <div class="bar-col">
                    <div class="bar" style:height="{h.px}px" style:background={h.color} style:--i={h.i}></div>
                    <span class="mono bar-t">{h.h}h</span>
                  </div>
                {/each}
              </div>
            </div>
          </div>
        </div>
      </figure>
    </section>

    <!-- Fonctionnalités -->
    <section class="features" aria-labelledby="feat-title">
      <h2 id="feat-title" class="sec-title rv" style="--i:5">Tout ce qu'il faut pour décider en 10 secondes</h2>
      <div class="feat-grid">
        {#each features as f, i}
          <article class="feat rv" style="--i:{6 + i}">
            <span class="feat-ico" aria-hidden="true">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d={f.icon} /></svg>
            </span>
            <h3>{f.title}</h3>
            <p>{f.text}</p>
          </article>
        {/each}
      </div>
    </section>

    <!-- Appel final -->
    <section class="final rv" style="--i:8">
      <div>
        <h2>Prêt à checker le spot ?</h2>
        <p>Crée ton compte en 30 secondes et retrouve tes spots à chaque visite.</p>
      </div>
      <div class="cta">
        <a class="btn btn-primary" href="/inscription">CRÉER MON COMPTE</a>
        <a class="btn btn-ghost" href="/connexion">SE CONNECTER</a>
      </div>
    </section>

    <footer class="foot mono">
      Données Open-Meteo · Webcams Viewsurf &amp; Skaping
    </footer>
  </div>
</div>

<style>
  .land{position:relative;min-height:100vh;overflow:hidden;background:var(--bg)}
  .wrap{position:relative;z-index:1;max-width:1200px;margin:0 auto;padding:24px 32px 40px;display:flex;flex-direction:column;gap:56px}
  .mono{font-family:var(--mono)}

  .top{display:flex;justify-content:space-between;align-items:center;gap:12px}
  .wordmark{font-family:var(--mono);font-size:15px;font-weight:700;letter-spacing:.12em}
  .top-cta{display:flex;gap:8px}
  .btn.sm{height:40px;padding:0 14px;font-size:12px}

  /* Accroche */
  .hero{display:grid;grid-template-columns:minmax(0,5fr) minmax(0,6fr);gap:48px;align-items:center}
  .hero-txt{display:flex;flex-direction:column;gap:18px}
  h1{font-size:clamp(40px,5.2vw,64px);line-height:1.02;font-weight:700;letter-spacing:-.02em}
  .lead{font-size:17px;line-height:1.55;color:var(--soft);max-width:46ch}
  .cta{display:flex;flex-wrap:wrap;gap:10px}
  .note{display:flex;align-items:center;gap:8px;font-size:13px;color:var(--muted)}

  /* Aperçu */
  .preview{margin:0;border-radius:22px;border:1px solid var(--border);background:rgba(6,21,33,.82);box-shadow:0 30px 80px rgba(0,0,0,.45),0 0 0 1px rgba(79,224,208,.05);overflow:hidden;backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);transform:perspective(1400px) rotateY(-6deg) rotateX(2deg);transition:transform .6s cubic-bezier(.2,.8,.2,1)}
  .preview:hover{transform:perspective(1400px) rotateY(0) rotateX(0)}
  .pv-bar{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 14px;border-bottom:1px solid var(--border)}
  .dots{display:flex;gap:6px}
  .dots i{width:9px;height:9px;border-radius:50%;background:var(--track)}
  .pv-tag{font-size:10px;letter-spacing:.08em;color:var(--muted)}
  .pv-body{padding:14px;display:flex;flex-direction:column;gap:12px}
  .pv-spots{display:flex;gap:6px;font-size:12px}
  .pv-spot{padding:6px 10px;border-radius:8px;color:var(--soft);border:1px solid transparent;font-family:var(--font);font-weight:600}
  .pv-spot b{font-family:var(--mono);font-weight:500;margin-left:6px}
  .pv-spot.cur{color:var(--text);background:var(--panel);border-color:var(--border)}
  .pv-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
  .pv-card{background:var(--panel);border:1px solid var(--border);border-radius:14px}
  .pv-score{grid-column:1/-1;display:flex;gap:14px;align-items:center;padding:12px}
  .ring{position:relative;width:92px;height:92px;flex-shrink:0}
  .ring svg{width:100%;height:100%}
  .ring-arc{stroke-dasharray:74 100;animation:ring 1.4s cubic-bezier(.2,.8,.2,1) both;animation-delay:.6s}
  .ring-txt{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center}
  .ring-val{font-size:24px;font-weight:700}
  .ring-sub{font-size:8px;color:var(--muted)}
  .pv-score-txt{display:flex;flex-direction:column;gap:5px;min-width:0}
  .badge{align-self:flex-start;font-size:11px;font-weight:700;padding:3px 9px;border-radius:4px;letter-spacing:.08em;background:var(--accent);color:var(--on-accent);animation:pop .5s cubic-bezier(.3,1.4,.5,1) both;animation-delay:1.5s}
  .pv-title{font-size:16px;font-weight:600;line-height:1.2}
  .pv-desc{font-size:12px;color:var(--soft)}
  .pv-cam{position:relative;overflow:hidden;min-height:150px;grid-row:span 2}
  .pv-cam svg{position:absolute;inset:0;width:100%;height:100%}
  .wave{animation:roll 7s linear infinite}
  .w2{animation-duration:5.5s}
  .w3{animation-duration:4.2s}
  .cam-chip{position:absolute;top:8px;left:8px;font-size:10px;color:#fff;background:rgba(5,10,14,.8);padding:4px 7px;border-radius:4px;display:flex;align-items:center;gap:6px}
  .live{width:7px;height:7px;border-radius:4px;background:var(--live);animation:blink 1.6s ease-in-out infinite}
  .pv-stats{display:grid;grid-template-columns:1fr;gap:10px}
  .pv-stat{padding:9px 11px;display:flex;flex-direction:column;gap:2px}
  .k{font-size:9px;letter-spacing:.06em;color:var(--muted)}
  .v{font-size:17px;font-weight:700}
  .v small{font-size:10px;color:var(--muted);font-weight:400}
  .s{font-size:10px;color:var(--soft)}
  .pv-day{grid-column:1/-1;padding:10px 12px;display:flex;flex-direction:column;gap:8px}
  .bars{display:flex;gap:5px;align-items:flex-end;height:74px}
  .bar-col{flex:1;display:flex;flex-direction:column;align-items:center;gap:4px}
  .bar{width:100%;border-radius:3px;transform-origin:bottom;animation:grow .6s cubic-bezier(.2,.8,.2,1) both;animation-delay:calc(.9s + var(--i) * 50ms)}
  .bar-t{font-size:9px;color:var(--muted)}

  /* Fonctionnalités */
  .sec-title{font-size:clamp(24px,3vw,32px);font-weight:700;line-height:1.15;max-width:22ch;margin-bottom:20px}
  .feat-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}
  .feat{background:var(--panel);border:1px solid var(--border);border-radius:18px;padding:20px;display:flex;flex-direction:column;gap:8px;backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);transition:border-color .25s,transform .25s}
  .feat:hover{border-color:rgba(79,224,208,.4);transform:translateY(-3px)}
  .feat-ico{width:42px;height:42px;border-radius:12px;background:rgba(79,224,208,.1);color:var(--accent);display:flex;align-items:center;justify-content:center;margin-bottom:4px}
  .feat h3{font-size:17px;font-weight:600}
  .feat p{font-size:14px;line-height:1.5;color:var(--soft)}

  /* Appel final */
  .final{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:20px;padding:28px;border-radius:22px;border:1px solid rgba(79,224,208,.3);background:linear-gradient(120deg,rgba(79,224,208,.1),rgba(9,32,50,.78) 60%)}
  .final h2{font-size:24px;font-weight:700;margin-bottom:4px}
  .final p{font-size:15px;color:var(--soft)}

  .foot{font-size:11px;color:var(--muted);text-align:center;letter-spacing:.04em}

  /* Animations */
  .rv{animation:rise .7s cubic-bezier(.2,.75,.25,1) both;animation-delay:calc(var(--i,0) * 80ms)}
  @keyframes rise{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:none}}
  .preview.rv{animation-name:rise-pv}
  @keyframes rise-pv{from{opacity:0;transform:perspective(1400px) rotateY(-14deg) rotateX(4deg) translateY(30px)}to{opacity:1;transform:perspective(1400px) rotateY(-6deg) rotateX(2deg)}}
  @keyframes ring{from{stroke-dasharray:0 100}to{stroke-dasharray:74 100}}
  @keyframes grow{from{transform:scaleY(0)}to{transform:scaleY(1)}}
  @keyframes pop{0%{transform:scale(.6);opacity:0}60%{transform:scale(1.12);opacity:1}100%{transform:scale(1)}}
  @keyframes blink{0%,100%{opacity:1}50%{opacity:.25}}
  @keyframes roll{from{transform:translateX(0)}to{transform:translateX(-40px)}}

  @media (max-width:960px){
    .hero{grid-template-columns:1fr;gap:36px}
    .preview,.preview:hover{transform:none}
    @keyframes rise-pv{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:none}}
    .feat-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
  }
  @media (max-width:600px){
    .wrap{padding:20px 16px 32px;gap:40px}
    .hide-xs{display:none}
    .feat-grid{grid-template-columns:1fr}
    .lead{font-size:16px}
    .cta .btn{flex:1 1 100%}
    .pv-cam{grid-row:auto;grid-column:1/-1}
    .pv-stats{grid-column:1/-1;grid-template-columns:repeat(3,minmax(0,1fr))}
    .final{padding:22px}
  }
  @media (prefers-reduced-motion:reduce){
    .land :global(*){animation:none !important;transition:none !important}
  }
</style>
