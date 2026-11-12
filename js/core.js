// 핵심: 화면(렌더러), 입력, 매 프레임 돌리기
(function () {
  "use strict";
  var THREE = window.THREE;
  var canvas = document.getElementById("view");
  var isTouch = /[?&]touch=1/.test(location.search) || !!(window.matchMedia && window.matchMedia("(pointer: coarse)").matches);
  if (isTouch) document.body.classList.add("is-touch");

  var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, powerPreference: "high-performance", preserveDrawingBuffer: true });
  renderer.outputEncoding = THREE.sRGBEncoding;
  var quality = isTouch ? 0.8 : 1;            // 폰에서는 해상도를 낮춰 부드럽게
  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(62, 1, 0.5, 2400);
  // 폰 세로 화면: 장면마다 정한 시야(fov)는 가로 화면 기준이라 세로에서는 양옆이 잘린다.
  // 화면이 정사각형보다 좁으면 위아래 시야를 넓혀, 옆으로 보이는 폭을 정사각형 화면과 같게 맞춘다.
  function effFov(f) {
    var a = camera.aspect || 1;
    if (a >= 1) return f;
    return Math.min(100, Math.atan(Math.tan(f * Math.PI / 360) / a) * 360 / Math.PI);
  }
  camera.updateProjectionMatrix = function () {
    var f = this.fov; this.fov = effFov(f);
    THREE.PerspectiveCamera.prototype.updateProjectionMatrix.call(this);
    this.fov = f;
  };

  function resize() {
    var w = window.innerWidth, h = window.innerHeight;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2) * quality);
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  window.addEventListener("resize", resize); resize();

  // ---------- 입력: x(오른쪽 +), y(위 +), boost ----------
  var input = { x: 0, y: 0, boost: false, any: false };
  var keys = {};
  var drag = null;                              // 손가락 끌기 = 조이스틱
  var lookX = 0, lookY = 0, mouseDrag = false, mouseBoost = false, trick = 0;   // 마우스 = 카메라 돌리기, 구르기 요청(-1 왼쪽, 1 오른쪽, 2 도는 쪽)
  var stick = document.getElementById("stick"), knob = document.getElementById("knob");
  var boostBtn = document.getElementById("boostBtn");
  var listeners = [], lastTap = 0;
  function fireAny() { if (!input.any) { input.any = true; } listeners.forEach(function (f) { f(); }); }

  window.addEventListener("keydown", function (e) {
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].indexOf(e.key) >= 0) e.preventDefault();
    var kk = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (!e.repeat) { if (kk === "q" || kk === "ㅂ") trick = -1; else if (kk === "e" || kk === "ㄷ") trick = 1; }
    keys[kk] = true; fireAny();
  });
  window.addEventListener("keyup", function (e) { keys[e.key.length === 1 ? e.key.toLowerCase() : e.key] = false; });
  window.addEventListener("blur", function () { keys = {}; drag = null; });

  canvas.addEventListener("pointerdown", function (e) {
    e.preventDefault(); fireAny();
    if (window.Q.clickHandler) { window.Q.clickHandler(e.clientX, e.clientY); return; }   // 컷신·판단 장면에서는 클릭이 우선
    if (e.pointerType === "mouse") {              // 마우스: 화면을 잡아(포인터 잠금) 움직임으로 카메라를 돌린다
      var flying = window.Game && window.Game.flight && window.Game.flight.enabled() && !window.Game.flight.parked();
      if (e.button === 2) { if (flying) trick = 2; return; }
      if (document.pointerLockElement === canvas) { mouseBoost = true; return; }
      mouseDrag = true;
      if (flying && canvas.requestPointerLock) { try { var pr = canvas.requestPointerLock(); if (pr && pr.catch) pr.catch(function () {}); } catch (err) {} }
      return;
    }
    if (drag) return;
    // 손가락: 빠르게 두 번 톡 = 한 바퀴 구르기 (마우스 오른쪽 클릭과 같음)
    var now = performance.now();
    if (now - lastTap < 300) { var fl = window.Game && window.Game.flight; if (fl && fl.enabled() && !fl.parked()) trick = 2; lastTap = 0; } else lastTap = now;
    drag = { id: e.pointerId, x0: e.clientX, y0: e.clientY, x: 0, y: 0 };
    if (isTouch) { stick.style.display = "block"; stick.style.left = e.clientX + "px"; stick.style.top = e.clientY + "px"; knob.style.transform = ""; }
  });
  window.addEventListener("mousemove", function (e) {
    if (document.pointerLockElement === canvas || mouseDrag) { lookX += e.movementX || 0; lookY += e.movementY || 0; }
  });
  window.addEventListener("mouseup", function () { mouseDrag = false; mouseBoost = false; });
  document.addEventListener("pointerlockchange", function () { if (document.pointerLockElement !== canvas) mouseBoost = false; document.body.classList.toggle("locked", document.pointerLockElement === canvas); });
  window.addEventListener("pointermove", function (e) {
    if (!drag || e.pointerId !== drag.id) return;
    var R = 60, dx = (e.clientX - drag.x0) / R, dy = (e.clientY - drag.y0) / R, m = Math.hypot(dx, dy);
    if (m > 1) { dx /= m; dy /= m; }
    drag.x = dx; drag.y = -dy;
    knob.style.transform = "translate(" + dx * 38 + "px," + dy * 38 + "px)";
  });
  function endDrag(e) { if (drag && e.pointerId === drag.id) { drag = null; stick.style.display = "none"; } }
  window.addEventListener("pointerup", endDrag); window.addEventListener("pointercancel", endDrag);
  canvas.addEventListener("contextmenu", function (e) { e.preventDefault(); });

  var boostHeld = false;
  boostBtn.addEventListener("pointerdown", function (e) { e.preventDefault(); boostHeld = true; boostBtn.classList.add("on"); fireAny(); });
  ["pointerup", "pointercancel", "pointerleave"].forEach(function (n) {
    boostBtn.addEventListener(n, function () { boostHeld = false; boostBtn.classList.remove("on"); });
  });

  function readInput(dt) {
    var kx = (keys.ArrowRight || keys.d ? 1 : 0) - (keys.ArrowLeft || keys.a ? 1 : 0);
    var ky = (keys.ArrowUp || keys.w ? 1 : 0) - (keys.ArrowDown || keys.s ? 1 : 0);
    var tx = drag ? drag.x : kx, ty = drag ? drag.y : ky;
    var ap = window.Q.autopilot && window.Q.autopilot();          // 자동 테스트용 조종
    if (ap) { tx = ap.x; ty = ap.y; }
    var k = Math.min(1, dt * 8);                // 부드럽게 따라가기
    input.x += (tx - input.x) * k; input.y += (ty - input.y) * k;
    input.boost = !!(keys[" "] || keys.Shift || boostHeld || mouseBoost || (ap && ap.boost));
    // 컷신·고르기 장면이나 땅에 서 있을 때는 마우스 잠금을 풀어 커서를 돌려준다
    if (document.pointerLockElement === canvas) {
      var f = window.Game && window.Game.flight;
      if (window.Q.clickHandler || (f && (f.parked() || !f.enabled())) || (window.Missions && window.Missions.state() === "ending")) document.exitPointerLock();
    }
  }

  // ---------- 매 프레임 ----------
  var systems = [], last = 0, time = 0, running = true;
  function frame(t) {
    var dt = Math.min(0.05, (t - last) / 1000 || 0.016); last = t;
    if (running) {
      time += dt; readInput(dt);
      for (var i = 0; i < systems.length; i++) systems[i](dt, time);
      renderer.render(scene, camera);
    }
    requestAnimationFrame(frame);
  }

  window.Q = {
    THREE: THREE, renderer: renderer, scene: scene, camera: camera, input: input, isTouch: isTouch, effFov: effFov,
    add: function (fn) { systems.push(fn); },
    onAnyInput: function (fn) { listeners.push(fn); },
    takeLook: function () { var o = { x: lookX, y: lookY }; lookX = 0; lookY = 0; return o; },
    takeTrick: function () { var v = trick; trick = 0; return v; },
    start: function () { requestAnimationFrame(frame); },
    time: function () { return time; },
    // 자동 테스트용: 프레임을 손으로 돌린다 (화면이 가려져 있어도 확인 가능)
    step: function (dt, n, noRender) { for (var j = 0; j < (n || 1); j++) { time += dt; readInput(dt); for (var i = 0; i < systems.length; i++) systems[i](dt, time); } if (!noRender) renderer.render(scene, camera); },
    pause: function (p) { running = !p; },
    clamp: function (v, a, b) { return Math.max(a, Math.min(b, v)); },
    lerp: function (a, b, k) { return a + (b - a) * k; },
    smooth: function (a, b, v) { var t = Math.max(0, Math.min(1, (v - a) / (b - a))); return t * t * (3 - 2 * t); }
  };
})();
