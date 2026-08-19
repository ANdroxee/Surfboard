import { a5 as ensure_array_like, a6 as attr_class, a3 as escape_html, Z as derived } from '../../chunks/index.js-CKNLfrqB.js';
import '../../chunks/utils.js-CeMGeI5Z.js';
import '../../chunks/utils2.js-BQzn9ikS.js';

const SPOTS = [
  { name: "Lacanau", lat: 44.98, lon: -1.12, webcam: true },
  { name: "Le Porge", lat: 44.89, lon: -1.1, webcam: false },
  { name: "Hourtin", lat: 45.13, lon: -1.15, webcam: false },
  { name: "Montalivet", lat: 45.38, lon: -1.15, webcam: false },
  { name: "Cap Ferret", lat: 44.63, lon: -1.25, webcam: false }
];
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let spotIdx = 0;
    let activeNav = 0;
    let spot = derived(() => SPOTS[spotIdx]);
    const today = /* @__PURE__ */ new Date();
    const dayNames = [
      "Dimanche",
      "Lundi",
      "Mardi",
      "Mercredi",
      "Jeudi",
      "Vendredi",
      "Samedi"
    ];
    const monthNames = [
      "janvier",
      "février",
      "mars",
      "avril",
      "mai",
      "juin",
      "juillet",
      "août",
      "septembre",
      "octobre",
      "novembre",
      "décembre"
    ];
    let dateStr = dayNames[today.getDay()] + " " + today.getDate() + " " + monthNames[today.getMonth()] + " " + today.getFullYear();
    $$renderer2.push(`<div class="layout"><aside class="sidebar"><div class="logo"><span style="font-size:22px">🌊</span> <div><div class="logo-title">SURF</div> <div class="logo-sub">DASHBOARD</div></div></div> <nav class="nav"><!--[-->`);
    const each_array = ensure_array_like([
      { icon: "🏠", label: "Vue d'ensemble" },
      { icon: "🏖️", label: "Plages" },
      { icon: "📊", label: "Prévisions" },
      { icon: "💨", label: "Cartes vent" },
      { icon: "📷", label: "Webcams" },
      { icon: "🌊", label: "Marées" },
      { icon: "⭐", label: "Favoris" }
    ]);
    for (let i = 0, $$length = each_array.length; i < $$length; i++) {
      let item = each_array[i];
      $$renderer2.push(`<button${attr_class("nav-btn", void 0, { "act": i === activeNav })}><span class="nav-icon">${escape_html(item.icon)}</span>${escape_html(item.label)}</button>`);
    }
    $$renderer2.push(`<!--]--></nav> `);
    {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--></aside> <main class="main"><div class="topbar"><div><div class="topbar-date">${escape_html(dateStr)}</div> <div class="topbar-loc"><span style="color:var(--coral);font-size:12px">📍</span> ${escape_html(spot().name)}, France</div></div> <div class="topbar-actions"><button class="topbar-btn">🔔</button> <button class="topbar-btn">⚙️</button></div></div> `);
    {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<div style="text-align:center;padding:100px 20px;color:var(--t3)"><p style="font-size:28px;margin-bottom:8px">🌊</p> <p>Chargement...</p></div>`);
    }
    $$renderer2.push(`<!--]--></main></div>`);
  });
}

export { _page as default };
//# sourceMappingURL=_page.svelte.js-BksNAP-r.js.map
