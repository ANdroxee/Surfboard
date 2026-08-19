<script>
  import '../app.css';
  import { onMount } from 'svelte';
  onMount(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  });
</script>
<slot />
