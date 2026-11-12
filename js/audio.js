// 소리: 파일 없이 코드로 만드는 바람 소리, 날갯짓, 효과음, 음악
(function () {
  "use strict";
  var ac = null, master = null, wind = null, windGain = null, muted = false, musicTimer = null, mood = "calm", step = 0;

  function unlock() {
    if (ac) { if (ac.state === "suspended") ac.resume(); return; }
    try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
    master = ac.createGain(); master.gain.value = 0.9; master.connect(ac.destination);
    // 바람: 걸러낸 잡음
    var len = ac.sampleRate * 2, buf = ac.createBuffer(1, len, ac.sampleRate), d = buf.getChannelData(0), b = 0;
    for (var i = 0; i < len; i++) { b = b * 0.97 + (Math.random() * 2 - 1) * 0.03; d[i] = b * 6; }
    wind = ac.createBufferSource(); wind.buffer = buf; wind.loop = true;
    var f = ac.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = 500; f.Q.value = 0.6;
    windGain = ac.createGain(); windGain.gain.value = 0;
    wind.connect(f); f.connect(windGain); windGain.connect(master); wind.start();
    wind.filter = f;
    startMusic();
  }
  function tone(freq, dur, type, vol, when, slideTo) {
    if (!ac || muted) return;
    var t = ac.currentTime + (when || 0), o = ac.createOscillator(), g = ac.createGain();
    o.type = type || "triangle"; o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol || 0.08, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.03);
  }
  // 5음계 선율: 분위기에 따라 빠르기와 음이 바뀐다
  var scales = { calm: [392, 440, 523, 587, 659, 784], tense: [330, 392, 440, 494, 587, 659], win: [523, 587, 659, 784, 880, 1047] };
  var CHORDS = [[262, 330, 392], [220, 262, 330], [175, 220, 262], [196, 247, 294]], CHORDS_T = [[220, 262, 330], [175, 220, 262], [147, 175, 220], [165, 208, 247]];
  var pattern = [0, 2, 4, 2, 3, 5, 4, 2, 0, 2, 3, 2, 4, 3, 2, -1];
  function startMusic() {
    if (musicTimer) clearInterval(musicTimer);
    musicTimer = setInterval(function () {
      if (!ac || muted) return;
      var sc = scales[mood], p = pattern[step % pattern.length], fast = mood !== "calm";
      var duck = window.Story && window.Story.active() ? 0.45 : 1;          // 대화 중에는 음악을 줄여 목소리가 잘 들리게
      if (p >= 0 && (fast || step % 2 === 0)) tone(sc[p], fast ? 0.22 : 0.5, "triangle", 0.045 * duck);
      if (step % 8 === 0) { tone(sc[0] / 4, 1.4, "sine", 0.07 * duck); tone(sc[2] / 2, 1.4, "sine", 0.035 * duck); }
      if (step % 16 === 0) {                       // 네 마디마다 바뀌는 화음 (도-라-파-솔 / 긴장할 때는 단조)
        var prog = mood === "tense" ? CHORDS_T : CHORDS, chd = prog[Math.floor(step / 16) % prog.length];
        for (var ci = 0; ci < chd.length; ci++) tone(chd[ci], 3.6, "sine", 0.02 * duck, ci * 0.03);
      }
      if (mood === "tense" && step % 2 === 0) tone(110, 0.08, "square", 0.03 * duck);
      step++;
    }, 240);
  }
  var fx = {
    flap:  function () { tone(180, 0.12, "sine", 0.05, 0, 90); },
    boost: function () { tone(300, 0.35, "sawtooth", 0.035, 0, 900); },
    good:  function () { tone(784, 0.1, "triangle", 0.09); tone(1047, 0.18, "triangle", 0.09, 0.09); },
    bad:   function () { tone(220, 0.25, "sawtooth", 0.06, 0, 110); },
    star:  function () { tone(988, 0.07, "square", 0.05); tone(1319, 0.16, "square", 0.05, 0.07); },
    stamp: function () { tone(140, 0.2, "square", 0.09, 0, 60); tone(660, 0.3, "triangle", 0.07, 0.12); },
    win:   function () { [523, 659, 784, 1047, 1319].forEach(function (f, i) { tone(f, 0.25, "triangle", 0.08, i * 0.11); }); }
  };
  // 옹알이 목소리(동물 말투 느낌): 글자 하나하나를 아주 짧은 음절 소리로 빠르게 읊는다.
  // 한글을 초성·모음으로 나눠, 모음마다 다른 입 모양 소리(공명 두 개)를 내고 ㅅ·ㅊ·ㅋ 같은 초성에는 바람 소리를 살짝 섞는다.
  var VOICES = {
    dari:    { f: 520, form: 1.28, vol: 0.20, dur: 0.075 },
    narmi:   { f: 300, form: 1.12, vol: 0.22, dur: 0.085 },
    chief:   { f: 150, form: 0.92, vol: 0.26, dur: 0.095 },
    jiwoo:   { f: 400, form: 1.18, vol: 0.20, dur: 0.08 },
    manager: { f: 185, form: 0.96, vol: 0.24, dur: 0.09 },
    officer: { f: 340, form: 1.12, vol: 0.20, dur: 0.08 }
  };
  // 모음 21개(ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ)의 공명 주파수
  var FORM = [[800,1200],[600,1900],[800,1300],[600,1900],[600,1000],[500,2000],[600,1100],[500,2000],[450,800],[700,1100],[600,1800],[500,1900],[450,850],[350,800],[550,950],[500,1900],[320,2100],[350,900],[400,1400],[380,1900],[300,2300]];
  var HISS = { 9: 1, 10: 1, 12: 0.7, 13: 0.7, 14: 1, 15: 0.8, 16: 0.8, 17: 0.8, 18: 0.6 }, TUNE = [1, 1.06, 0.94, 1.12, 1, 0.9, 1.05, 0.97], noiseBuf = null, sayN = 0;
  function babble(who, code, mood, last) {
    if (!ac || muted) return;
    var v = VOICES[who] || VOICES.narmi, vowel = 4, ini = -1;
    if (code >= 0xAC00 && code <= 0xD7A3) { var c = code - 0xAC00; ini = Math.floor(c / 588); vowel = Math.floor((c % 588) / 28); }
    else if (code < 48) return;                                   // 띄어쓰기·문장부호는 쉰다
    else vowel = code % 21;
    var fm = FORM[vowel], t = ac.currentTime, dur = v.dur, f = v.f * TUNE[(sayN++ + code) % TUNE.length] * (0.97 + Math.random() * 0.06), end = f;
    if (mood === "sad") { f *= 0.86; end = f * 0.9; dur *= 1.25; }
    else if (mood === "cheer" || mood === "wave") { f *= 1.14; end = f * 1.08; }
    if (last) { dur *= 1.9; end = mood === "sad" ? f * 0.72 : f * 1.22; }          // 문장 끝은 길게 꼬리를 올리거나 내린다
    var o = ac.createOscillator(), g = ac.createGain();
    o.type = "sawtooth"; o.frequency.setValueAtTime(f, t); o.frequency.linearRampToValueAtTime(end, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v.vol, t + 0.012); g.gain.setValueAtTime(v.vol, t + dur * 0.55); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    [0, 1].forEach(function (i) {
      var b = ac.createBiquadFilter(), bg = ac.createGain(); b.type = "bandpass"; b.frequency.value = fm[i] * v.form; b.Q.value = 5;
      bg.gain.value = i ? 0.55 : 1; o.connect(b); b.connect(bg); bg.connect(g);
    });
    var low = ac.createBiquadFilter(), lg = ac.createGain(); low.type = "lowpass"; low.frequency.value = v.f * 2.2; lg.gain.value = 0.25; o.connect(low); low.connect(lg); lg.connect(g);
    g.connect(master); o.start(t); o.stop(t + dur + 0.03);
    if (ini >= 0 && HISS[ini]) {                                   // 바람 섞인 초성
      if (!noiseBuf) { noiseBuf = ac.createBuffer(1, ac.sampleRate * 0.05, ac.sampleRate); var d = noiseBuf.getChannelData(0); for (var k = 0; k < d.length; k++) d[k] = Math.random() * 2 - 1; }
      var n = ac.createBufferSource(), hp = ac.createBiquadFilter(), ng = ac.createGain(); n.buffer = noiseBuf; hp.type = "highpass"; hp.frequency.value = 3200;
      ng.gain.setValueAtTime(0.035 * HISS[ini], t); ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.03);
      n.connect(hp); hp.connect(ng); ng.connect(master); n.start(t); n.stop(t + 0.04);
    }
  }
  window.Sound = {
    babble: babble,
    unlock: unlock, fx: fx,
    setWind: function (k) { if (windGain) { windGain.gain.value = muted ? 0 : 0.05 + k * 0.16; wind.filter.frequency.value = 420 + k * 700; } },
    setMood: function (m) { mood = m; },
    toggle: function () { muted = !muted; if (windGain && muted) windGain.gain.value = 0; return muted; }
  };
})();
