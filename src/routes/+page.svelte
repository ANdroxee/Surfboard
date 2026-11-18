<script>
  import Dashboard from '$lib/components/Dashboard.svelte';
  import Landing from '$lib/components/Landing.svelte';

  let { data } = $props();
</script>

<!-- Connecté : tableau de bord. Sinon : page de présentation qui invite à se connecter. -->
{#if data.user}
  <Dashboard {data} />
{:else}
  <Landing />
{/if}
