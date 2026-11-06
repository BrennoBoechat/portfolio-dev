/* Som de clique de mouse, sintetizado com Web Audio (sem arquivo de áudio).
   Toca um "click" ao apertar o botão e um "clack" mais leve ao soltar. */
(function(){
  const VOLUME = 0.6; // 0 a 1
  let ctx = null, noise = null;

  function setup(){
    if(ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if(!AC) return null;
    ctx = new AC();
    // ruído branco curto, reaproveitado em todo clique
    const len = Math.floor(ctx.sampleRate * 0.03);
    noise = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = noise.getChannelData(0);
    for(let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return ctx;
  }

  function click(freq, gain, dur){
    const c = setup();
    if(!c) return;
    if(c.state === "suspended") c.resume();
    const t = c.currentTime;

    const src = c.createBufferSource();
    src.buffer = noise;
    src.playbackRate.value = 0.9 + Math.random() * 0.2; // pequena variação, soa menos robótico

    const bp = c.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = freq;
    bp.Q.value = 1.2;

    const g = c.createGain();
    g.gain.setValueAtTime(gain * VOLUME, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);

    src.connect(bp).connect(g).connect(c.destination);
    src.start(t);
    src.stop(t + dur + 0.01);
  }

  // fase de captura: toca mesmo se algum elemento chamar stopPropagation()
  addEventListener("pointerdown", e => { if(e.button === 0 || e.button === 2) click(3200, 0.9, 0.025); }, true);
  addEventListener("pointerup",   e => { if(e.button === 0 || e.button === 2) click(4200, 0.45, 0.018); }, true);
})();
