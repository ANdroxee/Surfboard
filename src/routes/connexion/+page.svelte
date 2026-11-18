<script>
  import { enhance } from '$app/forms';
  import { page } from '$app/state';
  import OceanBackground from '$lib/components/OceanBackground.svelte';

  let { form } = $props();
  let busy = $state(false);
  let redirectQs = $derived(page.url.searchParams.get('redirect') ? `?redirect=${encodeURIComponent(page.url.searchParams.get('redirect'))}` : '');
</script>

<svelte:head><title>Connexion — Surfboard</title></svelte:head>

<div class="auth-page">
  <OceanBackground />
  <main class="auth-wrap">
    <a class="auth-brand" href="/">SURFBOARD</a>
    <section class="card">
      <div>
        <span class="eyebrow">CONNEXION</span>
        <h1>Content de te revoir</h1>
        <p class="lead">Connecte-toi pour retrouver tes spots et tes réglages.</p>
      </div>

      {#if form?.error}<p class="alert alert-error" role="alert">{form.error}</p>{/if}

      <form class="form" method="POST" use:enhance={() => { busy = true; return async ({ update }) => { await update({ reset: false }); busy = false; }; }}>
        <div class="field">
          <label for="email">EMAIL</label>
          <input class="input" id="email" name="email" type="email" autocomplete="email" required value={form?.email ?? ''} aria-invalid={!!form?.error} />
        </div>
        <div class="field">
          <label for="password">MOT DE PASSE</label>
          <input class="input" id="password" name="password" type="password" autocomplete="current-password" required aria-invalid={!!form?.error} />
        </div>
        <button class="btn btn-primary" disabled={busy}>{busy ? 'CONNEXION…' : 'SE CONNECTER'}</button>
      </form>

      <p class="switch-link">Pas encore de compte ? <a href="/inscription{redirectQs}">Créer un compte</a></p>
    </section>
  </main>
</div>
