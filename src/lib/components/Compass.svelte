<script>
  let { direction = 0 } = $props();
  const r = 38, cx = 50, cy = 50;
  let rad = $derived((direction - 90) * Math.PI / 180);
  let ax = $derived(cx + r * 0.7 * Math.cos(rad));
  let ay = $derived(cy + r * 0.7 * Math.sin(rad));
</script>
<svg viewBox="0 0 100 100" width="80" height="80">
  <circle {cx} {cy} r={r} fill="none" stroke="var(--border)" stroke-width="0.75" />
  {#each ['N','E','S','O'] as label, i}
    {@const a = (i * 90 - 90) * Math.PI / 180}
    <text x={cx+(r+9)*Math.cos(a)} y={cy+(r+9)*Math.sin(a)} text-anchor="middle" dominant-baseline="central" fill="var(--text-3)" font-size="9">{label}</text>
  {/each}
  <line x1={cx} y1={cy} x2={ax} y2={ay} stroke="var(--ocean)" stroke-width="2" stroke-linecap="round" />
  <circle cx={ax} cy={ay} r="3" fill="var(--ocean)" />
  <circle {cx} {cy} r="2" fill="var(--text-3)" />
</svg>
