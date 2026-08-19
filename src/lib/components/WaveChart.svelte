<script>
  let { data = [] } = $props();
  const w = 500, h = 70, px = 20, py = 6;
  let max = $derived(Math.max(...data, 0.5));
  let min = $derived(Math.min(...data, 0));
  let range = $derived(max - min || 1);
  let pts = $derived(data.map((v, i) => ({
    x: px + (i/(data.length-1))*(w-2*px),
    y: h - py - ((v-min)/range)*(h-2*py),
  })));
  let line = $derived(pts.map((p,i) => {
    if (!i) return 'M' + p.x + ',' + p.y;
    const prev = pts[i-1];
    const cpx = (prev.x+p.x)/2;
    return 'C' + cpx + ',' + prev.y + ' ' + cpx + ',' + p.y + ' ' + p.x + ',' + p.y;
  }).join(' '));
  let area = $derived(pts.length ? line + ' L' + pts.at(-1).x + ',' + (h-py) + ' L' + pts[0].x + ',' + (h-py) + ' Z' : '');
  let peakIdx = $derived(data.indexOf(Math.max(...data)));
  let peak = $derived(pts[peakIdx] || {x:0,y:0});
</script>
{#if data.length > 0}
<svg viewBox="0 0 {w} {h+14}" width="100%" style="display:block">
  <defs><linearGradient id="wf" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stop-color="var(--accent)" stop-opacity=".15"/>
    <stop offset="100%" stop-color="var(--accent)" stop-opacity=".01"/>
  </linearGradient></defs>
  {#each [0,0.5,1] as f}
    <line x1={px} y1={h-py-f*(h-2*py)} x2={w-px} y2={h-py-f*(h-2*py)} stroke="var(--border)" stroke-width="0.5" stroke-dasharray="2 4"/>
  {/each}
  <path d={area} fill="url(#wf)"/>
  <path d={line} fill="none" stroke="var(--accent)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx={peak.x} cy={peak.y} r="3" fill="var(--accent)"/>
  <text x={peak.x} y={peak.y-8} text-anchor="middle" fill="var(--accent)" font-size="8">{max.toFixed(1)}m</text>
  {#each [0,6,12,18,23] as hr}
    <text x={px+(hr/23)*(w-2*px)} y={h+10} text-anchor="middle" fill="var(--t3)" font-size="8">{String(hr).padStart(2,'0')}h</text>
  {/each}
</svg>
{/if}
