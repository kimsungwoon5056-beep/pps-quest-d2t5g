// 대사 상자 얼굴 그림: 게임 속 3D 모델을 작은 화면에 따로 찍어 그림으로 쓴다 (화풍이 게임과 똑같다)
// Portraits.apply(el, key) — key: "narmi" | "dari" | "chief" | "jiwoo" | "manager" | "officer"
(function () {
  "use strict";
  var Q = window.Q, THREE = Q.THREE, Toon = window.Toon;
  var cache = {}, r = null, scene = null, cam = null, SIZE = 192;
  // 얼굴 중심(모델 좌표)과 카메라 거리
  var SHOTS = {
    narmi: { at: [0, 0.38, 1.2], from: [1.6, 0.9, 7.4] },
    dari: { at: [0, 1.6, 0.1], from: [1.1, 1.9, 5.6] },
    person: { at: [0, 4.35, 0], from: [1.3, 4.6, 6.6] }
  };
  function setup() {
    r = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    r.setSize(SIZE, SIZE, false); r.setPixelRatio(1); r.outputEncoding = THREE.sRGBEncoding; r.setClearColor(0x000000, 0);
    scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight(0xffffff, 0xbfd3e6, 0.75));
    var sun = new THREE.DirectionalLight(0xffffff, 0.6); sun.position.set(3, 6, 6); scene.add(sun);
    cam = new THREE.PerspectiveCamera(26, 1, 0.1, 50);
  }
  function build(key) {
    var m;
    if (key === "narmi") { m = window.Characters.buildNarmi(); Toon.outline(m, 0.07); }
    else if (key === "dari") { m = window.Characters.buildDari(); Toon.outline(m, 0.07); }
    else m = window.People.make(key);
    return m;
  }
  function get(key) {
    if (cache[key] !== undefined) return cache[key];
    cache[key] = null;
    try {
      if (!r) setup();
      var m = build(key), s = SHOTS[key] || SHOTS.person;
      scene.add(m);
      cam.position.set(s.from[0], s.from[1], s.from[2]); cam.lookAt(s.at[0], s.at[1], s.at[2]);
      r.render(scene, cam);
      cache[key] = r.domElement.toDataURL("image/png");
      scene.remove(m);
    } catch (e) { cache[key] = null; }
    return cache[key];
  }
  function apply(el, key) {
    if (!el) return;
    var url = key && (key === "narmi" || key === "dari" || (window.People.LOOKS && window.People.LOOKS[key])) ? get(key) : null;
    if (url) { el.style.backgroundImage = "url(" + url + ")"; el.style.backgroundSize = "cover"; el.style.backgroundPosition = "center"; el.classList.add("pic"); }
    else { el.style.backgroundImage = ""; el.classList.remove("pic"); }
  }
  window.Portraits = { apply: apply, get: get };
})();
