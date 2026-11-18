<!-- Fond « Abysse » : lignes de fond qui dérivent, une série de vagues de temps en temps, reflet de lumière. -->
<svg class="bg bg-desk" viewBox="0 0 1440 1400" preserveAspectRatio="xMidYMin slice" aria-hidden="true">
  <g class="drift-a">
    <circle cx="1240" cy="80" r="520" fill="#0B2A40" opacity="0.7" />
    <ellipse class="contour" cx="1240" cy="80" rx="160" ry="120" stroke="#14476A" />
    <ellipse class="contour" cx="1240" cy="80" rx="270" ry="210" stroke="#123F5E" />
    <ellipse class="contour" cx="1240" cy="80" rx="390" ry="300" stroke="#103852" />
    <ellipse class="contour" cx="1240" cy="80" rx="520" ry="400" stroke="#0E3148" />
    <ellipse class="contour" cx="1240" cy="80" rx="660" ry="510" stroke="#0D2B40" />
  </g>
  <g class="drift-b">
    <ellipse class="contour" cx="80" cy="1150" rx="180" ry="130" stroke="#123F5E" />
    <ellipse class="contour" cx="80" cy="1150" rx="310" ry="230" stroke="#103852" />
    <ellipse class="contour" cx="80" cy="1150" rx="460" ry="340" stroke="#0E3148" />
    <ellipse class="contour" cx="80" cy="1150" rx="620" ry="460" stroke="#0D2B40" />
  </g>
  <circle class="dot-bg" cx="120" cy="260" r="2" fill="#4FE0D0" opacity="0.4" />
  <circle class="dot-bg" cx="640" cy="520" r="2" fill="#4FE0D0" opacity="0.4" />
  <circle class="dot-bg" cx="980" cy="900" r="2" fill="#4FE0D0" opacity="0.4" />
  <circle class="dot-bg" cx="360" cy="780" r="1.5" fill="#4FE0D0" opacity="0.4" />
  <circle class="dot-bg" cx="1180" cy="620" r="1.5" fill="#4FE0D0" opacity="0.4" />
</svg>
<svg class="bg bg-mob" viewBox="0 0 390 1000" preserveAspectRatio="xMaxYMin slice" aria-hidden="true">
  <g class="drift-a">
    <circle cx="330" cy="40" r="260" fill="#0B2A40" opacity="0.7" />
    <ellipse class="contour" cx="320" cy="60" rx="90" ry="70" stroke="#14476A" />
    <ellipse class="contour" cx="320" cy="60" rx="150" ry="120" stroke="#123F5E" />
    <ellipse class="contour" cx="320" cy="60" rx="215" ry="175" stroke="#103852" />
    <ellipse class="contour" cx="320" cy="60" rx="285" ry="235" stroke="#0E3148" />
    <ellipse class="contour" cx="320" cy="60" rx="360" ry="300" stroke="#0D2B40" />
  </g>
  <g class="drift-b">
    <ellipse class="contour" cx="40" cy="900" rx="110" ry="80" stroke="#123F5E" />
    <ellipse class="contour" cx="40" cy="900" rx="190" ry="140" stroke="#103852" />
    <ellipse class="contour" cx="40" cy="900" rx="280" ry="210" stroke="#0E3148" />
  </g>
  <circle class="dot-bg" cx="60" cy="300" r="1.5" fill="#4FE0D0" opacity="0.4" />
  <circle class="dot-bg" cx="210" cy="520" r="1.5" fill="#4FE0D0" opacity="0.4" />
  <circle class="dot-bg" cx="350" cy="860" r="1.5" fill="#4FE0D0" opacity="0.4" />
  <circle class="dot-bg" cx="140" cy="720" r="1.2" fill="#4FE0D0" opacity="0.4" />
</svg>
<div class="sweep" aria-hidden="true"></div>

<style>
  .bg{position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none}
  .bg :global(ellipse){fill:none;stroke-width:1.4}
  .bg-mob{display:none}
  /* Dérive lente permanente */
  .drift-a,.drift-b,.contour{transform-box:fill-box;transform-origin:center}
  .drift-a{animation:drift-a 46s ease-in-out infinite}
  .drift-b{animation:drift-b 58s ease-in-out infinite}
  @keyframes drift-a{0%,100%{transform:translate(0,0) rotate(0)}30%{transform:translate(-28px,18px) rotate(-2deg)}65%{transform:translate(14px,-10px) rotate(1.5deg)}}
  @keyframes drift-b{0%,100%{transform:translate(0,0) rotate(0)}40%{transform:translate(24px,-20px) rotate(2deg)}75%{transform:translate(-10px,12px) rotate(-1deg)}}

  /* De temps en temps : une série passe — les lignes gonflent l'une après l'autre, puis tout redevient calme */
  .contour{animation:set 16s ease-in-out infinite;animation-delay:calc(5s + var(--n, 0) * .35s)}
  .contour:nth-child(1){--n:0}
  .contour:nth-child(2){--n:1}
  .contour:nth-child(3){--n:2}
  .contour:nth-child(4){--n:3}
  .contour:nth-child(5){--n:4}
  .contour:nth-child(6){--n:5}
  @keyframes set{0%,22%,100%{transform:scale(1)}8%{transform:scale(1.035)}15%{transform:scale(.995)}}

  /* Reflet de lumière qui traverse l'écran de temps en temps */
  .sweep{position:absolute;inset:-20% -60%;pointer-events:none;background:linear-gradient(105deg,transparent 42%,rgba(79,224,208,.06) 48%,rgba(157,239,230,.09) 50%,rgba(79,224,208,.06) 52%,transparent 58%);transform:translateX(-70%);animation:sweep 28s ease-in-out infinite;animation-delay:4s}
  @keyframes sweep{0%,72%{transform:translateX(-70%)}100%{transform:translateX(70%)}}

  @media (max-width:720px){
    .bg-desk{display:none}
    .bg-mob{display:block}
    .bg :global(ellipse){stroke-width:1.2}
  }
  @media (prefers-reduced-motion:reduce){
    .drift-a,.drift-b,.contour,.sweep{animation:none !important}
  }
</style>
