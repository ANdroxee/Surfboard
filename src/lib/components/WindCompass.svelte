<script>
  let { direction = 0 } = $props();
  const r = 58, cx = 70, cy = 70;
  let rad = $derived((direction - 90) * Math.PI / 180);
  let ax = $derived(cx + r * 0.62 * Math.cos(rad));
  let ay = $derived(cy + r * 0.62 * Math.sin(rad));
  let tx = $derived(ax - 6 * Math.cos(rad + 2.5));
  let ty = $derived(ay - 6 * Math.sin(rad + 2.5));
  let tx2 = $derived(ax - 6 * Math.cos(rad - 2.5));
  let ty2 = $derived(ay - 6 * Math.sin(rad - 2.5));
</script>
<svg viewBox="0 0 140 140" width="130" height="130">
  <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--border)" stroke-width="0.75"/>
  <circle cx={cx} cy={cy} r={r*0.42} fill="none" stroke="var(--border)" stroke-width="0.5" stroke-dasharray="2 3"/>
  {#each ['N','E','S','O'] as label, i}
    {@const a = (i*90-90)*Math.PI/180}
    <text x={cx+(r+10)*Math.cos(a)} y={cy+(r+10)*Math.sin(a)} text-anchor="middle" dominant-baseline="central" fill="var(--t2)" font-size="11" font-weight="500">{label}</text>
  {/each}
  <line x1={cx} y1={cy} x2={ax} y2={ay} stroke="var(--accent)" stroke-width="2.5" stroke-linecap="round"/>
  <polygon points="{ax},{ay} {tx},{ty} {tx2},{ty2}" fill="var(--accent)"/>
  <circle cx={cx} cy={cy} r="4" fill="var(--t3)"/>
</svg>
