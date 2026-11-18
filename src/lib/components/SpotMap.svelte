<script>
  import { onMount, untrack } from 'svelte';
  import { Tween, prefersReducedMotion } from 'svelte/motion';
  import { cubicInOut, cubicOut } from 'svelte/easing';
  import { LAND, SPOT_POS, LABELS, WATER, WATER_LABELS } from '$lib/geo/southwest.js';

  /**
   * spots   : [{ name, score, color, verdict }]
   * target  : nom du spot vers lequel zoomer (piloté par le parent), ou null
   * from    : nom du spot d'où l'on revient (la carte démarre zoomée dessus puis dézoome)
   * onpick  : appelé une fois l'animation de zoom terminée
   * onhover : survol d'un spot (pour surligner la liste)
   */
  let { spots = [], target = null, from = null, highlight = null, onpick = () => {}, onhover = () => {} } = $props();

  let cw = $state(800);
  let ch = $state(560);
  let aspect = $derived(cw / Math.max(ch, 1));
  let zooming = $state(null);

  // Cadrage d'ensemble : toute la côte des spots, de Royan au bassin d'Arcachon
  const ys = Object.values(SPOT_POS).map((p) => p.y);
  const xs = Object.values(SPOT_POS).map((p) => p.x);
  const CENTER = { cx: (Math.min(...xs) + Math.max(...xs)) / 2 + 120, cy: (Math.min(...ys) + Math.max(...ys)) / 2 };
  const SPAN = Math.max(...ys) - Math.min(...ys);
  const baseH = () => Math.max(SPAN + 450, 1000 / aspect); // assez haut pour tous les spots, assez large pour voir la terre
  const ZOOM_H = 230;

  // Caméra animée : centre + hauteur visible (la largeur suit le format du cadre)
  const cam = new Tween({ cx: CENTER.cx, cy: CENTER.cy, h: SPAN + 450 }, { easing: cubicInOut });
  let vb = $derived.by(() => {
    const { cx, cy, h } = cam.current;
    const w = h * aspect;
    return { x: cx - w / 2, y: cy - h / 2, w, h };
  });
  // Unités de carte par pixel : garde marqueurs et textes à taille constante pendant le zoom
  let u = $derived(vb.h / Math.max(ch, 1));
  let zoomed = $derived(cam.current.h < 700);

  const dur = (ms) => (prefersReducedMotion.current ? 0 : ms);

  // Animation d'arrivée : dézoom depuis le spot quitté, ou survol d'ensemble au premier affichage
  let introDone = $state(false);
  onMount(() => {
    if (from && SPOT_POS[from]) {
      const p = SPOT_POS[from];
      cam.set({ cx: p.x + 40, cy: p.y, h: ZOOM_H }, { duration: 0 });
    } else {
      cam.set({ cx: CENTER.cx + 300, cy: CENTER.cy - 200, h: (SPAN + 450) * 1.4 }, { duration: 0 });
    }
    // une frame plus tard, le cadre est mesuré : on part vers le cadrage d'ensemble
    requestAnimationFrame(async () => {
      await cam.set({ ...CENTER, h: baseH() }, from ? { duration: dur(1300), easing: cubicInOut } : { duration: dur(1600), easing: cubicOut });
      introDone = true;
    });
  });

  // Réajuste le cadrage d'ensemble si la fenêtre change de format (jamais pendant une animation)
  $effect(() => {
    aspect;
    if (!introDone) return;
    untrack(() => {
      if (!zooming) cam.set({ ...CENTER, h: baseH() }, { duration: 0 });
    });
  });

  async function zoomTo(name) {
    const p = SPOT_POS[name];
    if (!p || zooming) return;
    zooming = name;
    introDone = true;
    // léger recul puis plongée vers la plage (décalée pour laisser voir l'océan)
    await cam.set({ cx: p.x + 40, cy: p.y, h: ZOOM_H }, { duration: dur(1500), easing: cubicInOut });
    onpick(name);
  }

  $effect(() => {
    const t = target;
    if (t) untrack(() => zoomTo(t));
  });

  // Houle stylisée au large (lignes qui ondulent, parallèles à la côte)
  const swells = Array.from({ length: 11 }, (_, i) => {
    const x = 230 + i * 55;
    let d = `M${x} 400`;
    for (let y = 400; y < 2400; y += 160) d += ` q 14 40 0 80 t 0 80`;
    return { d, i };
  });
</script>

<div class="map" bind:clientWidth={cw} bind:clientHeight={ch} class:zooming>
  <svg class="map-svg" viewBox="{vb.x} {vb.y} {vb.w} {vb.h}" role="img" aria-label="Carte de la côte Sud-Ouest avec les spots de surf">
    <defs>
      <radialGradient id="sea-glow" gradientUnits="userSpaceOnUse" cx="-200" cy="1150" r="4500">
        <stop offset="0" stop-color="#0B2A40" />
        <stop offset="1" stop-color="#061521" />
      </radialGradient>
    </defs>
    <rect x="-2000" y="-2000" width="6000" height="7000" fill="url(#sea-glow)" />

    <g class="swells" aria-hidden="true">
      {#each swells as s}
        <path d={s.d} style:--i={s.i} vector-effect="non-scaling-stroke" />
      {/each}
    </g>

    <g class="land">
      <!-- terre au-delà des départements dessinés (cadre large) -->
      <rect class="inland" x="1700" y="-2000" width="6000" height="7000" />
      {#each LAND as dep}
        <path d={dep.d} vector-effect="non-scaling-stroke" />
      {/each}
    </g>

    <!-- Eau : estuaire de la Gironde, lacs du littoral, rivières -->
    <g class="water" aria-hidden="true">
      <path class="estuary" d={WATER.estuary} />
      {#each WATER.islands as d}<path class="island" {d} />{/each}
      {#each WATER.lakes as d}<path class="lake" {d} vector-effect="non-scaling-stroke" />{/each}
      {#each WATER.rivers as r}
        <path class="river" d={r.d} style:stroke-width="{r.w}px" vector-effect="non-scaling-stroke" />
      {/each}
      {#each WATER_LABELS as l}
        <text class="wlabel" transform="translate({l.x} {l.y}) rotate({l.rot})" font-size={10.5 * u}>{l.name}</text>
      {/each}
    </g>

    <g class="labels" aria-hidden="true" style:opacity={zoomed ? 0 : 1}>
      {#each LABELS as l}
        <circle cx={l.x} cy={l.y} r={2.5 * u} />
        <text x={l.x + 8 * u} y={l.y + 4 * u} font-size={(l.kind === 'city' ? 12 : 11) * u}>{l.name}</text>
      {/each}
      <text class="ocean" x="420" y="1250" font-size={13 * u} letter-spacing={6 * u}>OCÉAN</text>
      <text class="ocean" x="400" y={1250 + 22 * u} font-size={13 * u} letter-spacing={6 * u}>ATLANTIQUE</text>
    </g>

    {#each spots as s}
      {@const p = SPOT_POS[s.name]}
      {#if p}
        <g
          class="spot"
          class:dim={zooming && zooming !== s.name}
          class:hl={highlight === s.name || zooming === s.name}
          role="button"
          tabindex="0"
          aria-label="{s.name}, score {s.score} sur 10. Zoomer sur ce spot"
          onclick={() => zoomTo(s.name)}
          onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), zoomTo(s.name))}
          onpointerenter={() => onhover(s.name)}
          onpointerleave={() => onhover(null)}
          onfocus={() => onhover(s.name)}
          onblur={() => onhover(null)}
        >
          <circle class="hit" cx={p.x} cy={p.y} r={22 * u} />
          <circle class="ping" cx={p.x} cy={p.y} r={9 * u} style:stroke={s.color} />
          <circle class="dot" cx={p.x} cy={p.y} r={7 * u} style:fill={s.color} />
          <g class="tag">
            <rect x={p.x - 132 * u} y={p.y - 15 * u} width={116 * u} height={30 * u} rx={8 * u} />
            <text class="nm" x={p.x - 124 * u} y={p.y + 5 * u} font-size={13 * u}>{s.name}</text>
            <text class="sc" x={p.x - 24 * u} y={p.y + 5 * u} font-size={12 * u} style:fill={s.color} text-anchor="end">{s.score}</text>
          </g>
        </g>
      {/if}
    {/each}
  </svg>

  <div class="overlay">
    <span class="mono hint">{zooming ? `CAP SUR ${zooming.toUpperCase()}…` : 'CLIQUE SUR UN SPOT'}</span>
    <div class="legend mono" aria-hidden="true">
      <span><i style="background:var(--accent)"></i>GO</span>
      <span><i style="background:var(--warm)"></i>BOF</span>
      <span><i style="background:var(--muted)"></i>NON</span>
    </div>
  </div>
  <span class="attrib mono">© contributeurs OpenStreetMap · IGN/Etalab</span>
  <svg class="compass" viewBox="0 0 40 40" aria-hidden="true">
    <circle cx="20" cy="20" r="18" />
    <path d="M20 6 L24 20 L20 18 L16 20 Z" />
    <text x="20" y="36" text-anchor="middle">N</text>
  </svg>
</div>

<style>
  .map{position:relative;width:100%;height:100%;min-height:360px;overflow:hidden;border-radius:20px;border:1px solid var(--border);background:#061521}
  .map-svg{display:block;width:100%;height:100%}
  .mono{font-family:var(--mono)}

  .land .inland{fill:#0F2A3C}
  .estuary{fill:url(#sea-glow)}
  .island{fill:#0F2A3C}
  .lake{fill:#0A2536;stroke:#2B6584;stroke-width:1}
  .river{fill:none;stroke:#3A8CB0;stroke-linecap:round;stroke-linejoin:round;opacity:.9}
  .wlabel{fill:#5FA9C8;font-family:var(--font);font-style:italic;letter-spacing:.02em}
  .land path{fill:#0F2A3C;stroke:#245170;stroke-width:1.2;stroke-linejoin:round}
  .swells path{fill:none;stroke:rgba(79,224,208,.08);stroke-width:1.2;animation:swell 9s ease-in-out infinite;animation-delay:calc(var(--i) * -.8s)}
  @keyframes swell{0%,100%{transform:translateX(0)}50%{transform:translateX(18px)}}

  .labels{transition:opacity .4s}
  .labels circle{fill:#5F8296}
  .labels text{fill:#8FB0C4;font-family:var(--font)}
  .labels .ocean{fill:rgba(143,176,196,.35);font-family:var(--mono)}

  .spot{cursor:pointer;outline:none;transition:opacity .4s}
  .spot.dim{opacity:.15}
  .hit{fill:transparent}
  .dot{stroke:#061521;stroke-width:2;transition:transform .25s;transform-box:fill-box;transform-origin:center}
  .ping{fill:none;stroke-width:2;vector-effect:non-scaling-stroke;transform-box:fill-box;transform-origin:center;animation:ping 2.4s ease-out infinite}
  @keyframes ping{0%{transform:scale(1);opacity:.8}100%{transform:scale(3);opacity:0}}
  .tag rect{fill:rgba(6,21,33,.82);stroke:var(--border);vector-effect:non-scaling-stroke;transition:stroke .2s}
  .nm{fill:var(--text);font-family:var(--font);font-weight:600}
  .sc{font-family:var(--mono);font-weight:700}
  .spot:hover .dot,.spot.hl .dot,.spot:focus-visible .dot{transform:scale(1.35)}
  .spot:hover .tag rect,.spot.hl .tag rect,.spot:focus-visible .tag rect{stroke:var(--accent)}

  .overlay{position:absolute;top:14px;left:14px;right:14px;display:flex;justify-content:space-between;align-items:flex-start;gap:10px;pointer-events:none}
  .hint{font-size:11px;letter-spacing:.08em;color:var(--text);background:rgba(5,10,14,.75);padding:6px 10px;border-radius:6px}
  .zooming .hint{color:var(--accent)}
  .legend{display:flex;gap:10px;font-size:10px;color:var(--soft);background:rgba(5,10,14,.75);padding:6px 10px;border-radius:6px}
  .legend span{display:flex;align-items:center;gap:5px}
  .legend i{width:8px;height:8px;border-radius:4px}
  .attrib{position:absolute;left:12px;bottom:10px;font-size:9px;color:rgba(143,176,196,.6);pointer-events:none}
  .compass{position:absolute;right:14px;bottom:14px;width:40px;height:40px}
  .compass circle{fill:rgba(5,10,14,.6);stroke:var(--border)}
  .compass path{fill:var(--accent)}
  .compass text{fill:var(--muted);font-size:7px;font-family:var(--mono)}

  @media (prefers-reduced-motion:reduce){
    .swells path,.ping{animation:none}
  }
</style>
