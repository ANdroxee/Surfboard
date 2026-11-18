<script>
  import { enhance } from '$app/forms';
  import OceanBackground from '$lib/components/OceanBackground.svelte';

  let { data, form } = $props();

  let busy = $state('');
  // Formulaire amélioré : garde les champs saisis et indique quelle section est en cours d'envoi
  const submit = (section, reset = false) => () => {
    busy = section;
    return async ({ update }) => { await update({ reset }); busy = ''; };
  };

  let email = $state(data.account.email);
  let emailChanged = $derived(email.trim().toLowerCase() !== data.account.email);
  let favs = $state(new Set(data.prefs.favorites));

  const since = new Date(data.account.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  const msg = (section) => (form?.section === section ? form : null);
</script>

<svelte:head><title>Mon compte — Surfboard</title></svelte:head>

<div class="auth-page">
  <OceanBackground />
  <main class="account">
    <header class="acc-top">
      <a class="auth-brand" href="/">SURFBOARD</a>
      <a class="btn btn-ghost back" href="/">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6" /></svg>
        TABLEAU DE BORD
      </a>
    </header>

    <section class="card wide hello" style="--d:0">
      <div class="avatar" aria-hidden="true">{data.account.name.slice(0, 1).toUpperCase()}</div>
      <div class="hello-txt">
        <span class="eyebrow">MON COMPTE</span>
        <h1>Salut {data.account.name}</h1>
        <p class="lead">Membre depuis le {since}.</p>
      </div>
      <form method="POST" action="/deconnexion">
        <button class="btn btn-ghost">SE DÉCONNECTER</button>
      </form>
    </section>

    <!-- Préférences -->
    <section class="card wide" style="--d:1" aria-labelledby="prefs-title">
      <div>
        <span class="eyebrow">RÉGLAGES</span>
        <h2 id="prefs-title">Mes préférences</h2>
      </div>
      {#if msg('preferences')?.ok}<p class="alert alert-ok" role="status">{form.ok}</p>{/if}
      <form class="form" method="POST" action="?/preferences" use:enhance={submit('preferences')}>
        <div class="row2">
          <div class="field">
            <label for="defaultSpot">SPOT À L'OUVERTURE</label>
            <select class="select" id="defaultSpot" name="defaultSpot" value={data.prefs.defaultSpot ?? ''}>
              <option value="">La carte — je choisis à chaque fois</option>
              {#each data.spots as s}<option value={s}>{s}</option>{/each}
            </select>
          </div>
          <div class="field">
            <label for="mode">MODE D'AFFICHAGE</label>
            <select class="select" id="mode" name="mode" value={data.prefs.mode}>
              <option value="simple">Simple — l'essentiel</option>
              <option value="expert">Expert — tous les détails</option>
            </select>
          </div>
        </div>
        <fieldset class="field">
          <legend>SPOTS FAVORIS</legend>
          <span class="hint">Ils s'affichent en premier dans la barre des spots.</span>
          <div class="chips">
            {#each data.spots as s}
              <label class="chip-check">
                <input type="checkbox" name="favorites" value={s} checked={favs.has(s)}
                  onchange={(e) => { const n = new Set(favs); e.currentTarget.checked ? n.add(s) : n.delete(s); favs = n; }} />
                <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" /></svg>
                {s}
              </label>
            {/each}
          </div>
        </fieldset>
        <button class="btn btn-primary self-start" disabled={busy === 'preferences'}>{busy === 'preferences' ? 'ENREGISTREMENT…' : 'ENREGISTRER'}</button>
      </form>
    </section>

    <!-- Profil -->
    <section class="card wide" style="--d:2" aria-labelledby="profile-title">
      <div>
        <span class="eyebrow">PROFIL</span>
        <h2 id="profile-title">Mes informations</h2>
      </div>
      {#if msg('profile')?.error}<p class="alert alert-error" role="alert">{form.error}</p>{/if}
      {#if msg('profile')?.ok}<p class="alert alert-ok" role="status">{form.ok}</p>{/if}
      <form class="form" method="POST" action="?/profile" use:enhance={submit('profile')}>
        <div class="row2">
          <div class="field">
            <label for="name">PRÉNOM OU PSEUDO</label>
            <input class="input" id="name" name="name" required maxlength="60" value={data.account.name} aria-invalid={msg('profile')?.field === 'name'} />
          </div>
          <div class="field">
            <label for="email">EMAIL</label>
            <input class="input" id="email" name="email" type="email" required bind:value={email} aria-invalid={msg('profile')?.field === 'email'} />
          </div>
        </div>
        {#if emailChanged}
          <div class="field">
            <label for="profile-current">MOT DE PASSE ACTUEL</label>
            <input class="input" id="profile-current" name="current" type="password" autocomplete="current-password" required aria-invalid={msg('profile')?.field === 'current'} />
            <span class="hint">Nécessaire pour changer d'email.</span>
          </div>
        {/if}
        <button class="btn btn-primary self-start" disabled={busy === 'profile'}>{busy === 'profile' ? 'ENREGISTREMENT…' : 'METTRE À JOUR'}</button>
      </form>
    </section>

    <!-- Mot de passe -->
    <section class="card wide" style="--d:3" aria-labelledby="pw-title">
      <div>
        <span class="eyebrow">SÉCURITÉ</span>
        <h2 id="pw-title">Changer de mot de passe</h2>
      </div>
      {#if msg('password')?.error}<p class="alert alert-error" role="alert">{form.error}</p>{/if}
      {#if msg('password')?.ok}<p class="alert alert-ok" role="status">{form.ok}</p>{/if}
      <form class="form" method="POST" action="?/password" use:enhance={submit('password', true)}>
        <div class="field">
          <label for="pw-current">MOT DE PASSE ACTUEL</label>
          <input class="input" id="pw-current" name="current" type="password" autocomplete="current-password" required aria-invalid={msg('password')?.field === 'current'} />
        </div>
        <div class="row2">
          <div class="field">
            <label for="pw-new">NOUVEAU MOT DE PASSE</label>
            <input class="input" id="pw-new" name="password" type="password" autocomplete="new-password" required minlength="8" aria-invalid={msg('password')?.field === 'password'} />
          </div>
          <div class="field">
            <label for="pw-confirm">CONFIRMER</label>
            <input class="input" id="pw-confirm" name="confirm" type="password" autocomplete="new-password" required minlength="8" aria-invalid={msg('password')?.field === 'confirm'} />
          </div>
        </div>
        <button class="btn btn-primary self-start" disabled={busy === 'password'}>{busy === 'password' ? 'MODIFICATION…' : 'MODIFIER'}</button>
      </form>
    </section>

    <!-- Appareils -->
    <section class="card wide" style="--d:4" aria-labelledby="dev-title">
      <div>
        <span class="eyebrow">APPAREILS</span>
        <h2 id="dev-title">Sessions ouvertes</h2>
        <p class="lead">Tu es connecté sur {data.sessions} appareil{data.sessions > 1 ? 's' : ''} (y compris celui-ci).</p>
      </div>
      {#if msg('sessions')?.ok}<p class="alert alert-ok" role="status">{form.ok}</p>{/if}
      <form method="POST" action="?/logoutOthers" use:enhance={submit('sessions')}>
        <button class="btn btn-ghost" disabled={busy === 'sessions' || data.sessions <= 1}>DÉCONNECTER LES AUTRES APPAREILS</button>
      </form>
    </section>

    <!-- Suppression -->
    <section class="card wide danger" style="--d:5" aria-labelledby="del-title">
      <div>
        <span class="eyebrow">ZONE SENSIBLE</span>
        <h2 id="del-title">Supprimer mon compte</h2>
        <p class="lead">Ton compte, tes préférences et tes sessions seront effacés définitivement.</p>
      </div>
      {#if msg('delete')?.error}<p class="alert alert-error" role="alert">{form.error}</p>{/if}
      <details>
        <summary class="btn btn-danger">JE VEUX SUPPRIMER MON COMPTE</summary>
        <form class="form confirm-del" method="POST" action="?/delete" use:enhance={submit('delete')}>
          <div class="row2">
            <div class="field">
              <label for="del-current">MOT DE PASSE</label>
              <input class="input" id="del-current" name="current" type="password" autocomplete="current-password" required aria-invalid={msg('delete')?.field === 'current'} />
            </div>
            <div class="field">
              <label for="del-confirm">TAPE « SUPPRIMER »</label>
              <input class="input" id="del-confirm" name="confirmText" required autocomplete="off" aria-invalid={msg('delete')?.field === 'confirmText'} />
            </div>
          </div>
          <button class="btn btn-danger self-start" disabled={busy === 'delete'}>SUPPRIMER DÉFINITIVEMENT</button>
        </form>
      </details>
    </section>
  </main>
</div>

<style>
  .account{position:relative;z-index:1;width:100%;max-width:680px;margin:0 auto;padding:24px 16px 56px;display:flex;flex-direction:column;gap:16px}
  .acc-top{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:4px}
  .back{height:40px;padding:0 14px;font-size:12px}
  .card.wide{max-width:none;animation-delay:calc(var(--d, 0) * 70ms)}
  .hello{flex-direction:row;align-items:center;flex-wrap:wrap}
  .hello-txt{flex:1;min-width:180px}
  .avatar{width:56px;height:56px;border-radius:50%;background:var(--accent);color:var(--on-accent);display:flex;align-items:center;justify-content:center;font-family:var(--mono);font-size:24px;font-weight:700;flex-shrink:0}
  .row2{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}
  .self-start{align-self:flex-start}
  fieldset{border:none;padding:0;margin:0;min-width:0}
  legend{font-family:var(--mono);font-size:11px;letter-spacing:.06em;color:var(--muted);margin-bottom:6px;padding:0}
  .chips{display:flex;flex-wrap:wrap;gap:8px;margin-top:4px}
  .chip-check{position:relative;display:inline-flex;align-items:center;gap:8px;height:42px;padding:0 14px;border-radius:999px;border:1px solid var(--border);color:var(--soft);font-size:14px;font-weight:600;cursor:pointer;transition:background .2s,border-color .2s,color .2s}
  .chip-check input{position:absolute;opacity:0;pointer-events:none}
  .chip-check svg{fill:none;stroke:currentColor;stroke-width:2;stroke-linejoin:round;transition:fill .2s,transform .3s}
  .chip-check:has(input:checked){background:rgba(79,224,208,.12);border-color:var(--accent);color:var(--text)}
  .chip-check:has(input:checked) svg{fill:var(--warm);stroke:var(--warm);transform:rotate(72deg)}
  .chip-check:has(input:focus-visible){outline:2px solid var(--accent);outline-offset:2px}
  .danger{border-color:rgba(255,122,122,.28)}
  details summary{list-style:none;width:fit-content}
  details summary::-webkit-details-marker{display:none}
  details[open] summary{display:none}
  .confirm-del{animation:card-in .35s ease both}
  @media (max-width:560px){
    .row2{grid-template-columns:1fr}
    .card{padding:20px}
  }
</style>
