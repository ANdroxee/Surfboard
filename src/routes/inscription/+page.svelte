<script>
  import { enhance } from '$app/forms';
  import { page } from '$app/state';
  import OceanBackground from '$lib/components/OceanBackground.svelte';

  let { form } = $props();
  let busy = $state(false);
  let redirectQs = $derived(page.url.searchParams.get('redirect') ? `?redirect=${encodeURIComponent(page.url.searchParams.get('redirect'))}` : '');
</script>

<svelte:head><title>Créer un compte — Surfboard</title></svelte:head>

<div class="auth-page">
  <OceanBackground />
  <main class="auth-wrap">
    <a class="auth-brand" href="/">SURFBOARD</a>
    <section class="card">
      <div>
        <span class="eyebrow">NOUVEAU COMPTE</span>
        <h1>Créer ton compte</h1>
        <p class="lead">Garde tes spots favoris, ton spot par défaut et ton mode d'affichage sur tous tes appareils.</p>
      </div>

      {#if form?.error}<p class="alert alert-error" role="alert">{form.error}</p>{/if}

      <form class="form" method="POST" use:enhance={() => { busy = true; return async ({ update }) => { await update({ reset: false }); busy = false; }; }}>
        <div class="field">
          <label for="name">PRÉNOM OU PSEUDO</label>
          <input class="input" id="name" name="name" autocomplete="nickname" required maxlength="60" value={form?.name ?? ''} aria-invalid={form?.field === 'name'} />
        </div>
        <div class="field">
          <label for="email">EMAIL</label>
          <input class="input" id="email" name="email" type="email" autocomplete="email" required value={form?.email ?? ''} aria-invalid={form?.field === 'email'} />
        </div>
        <div class="field">
          <label for="password">MOT DE PASSE</label>
          <input class="input" id="password" name="password" type="password" autocomplete="new-password" required minlength="8" aria-invalid={form?.field === 'password'} aria-describedby="pw-hint" />
          <span class="hint" id="pw-hint">8 caractères minimum.</span>
        </div>
        <div class="field">
          <label for="confirm">CONFIRMER LE MOT DE PASSE</label>
          <input class="input" id="confirm" name="confirm" type="password" autocomplete="new-password" required minlength="8" aria-invalid={form?.field === 'confirm'} />
        </div>
        <button class="btn btn-primary" disabled={busy}>{busy ? 'CRÉATION…' : 'CRÉER MON COMPTE'}</button>
      </form>

      <p class="switch-link">Déjà un compte ? <a href="/connexion{redirectQs}">Se connecter</a></p>
    </section>
  </main>
</div>
