// 이야기 장치: 컷신 대화(카메라 구도 + 대사 상자)와 땅 장면에서의 클릭 고르기
// Story.play(lines, done)  — lines: [{ who, text, cam, mood, on }] 를 차례로 보여 주고 끝나면 done()
//   who: "narmi" | "dari" | 인물 모델(People.make 결과) | { name, color }   cam: { pos:[x,y,z], look:[x,y,z] } (생략하면 이전 구도 유지)
//   mood: 말하는 인물의 기분 ("talk" 기본)   on: 이 줄이 뜰 때 한 번 실행할 함수
// Story.shot(pos, look, fov) — 카메라 구도만 잡기 (땅 장면용)   Story.free() — 카메라를 비행에 돌려주기
// Story.pick(items, onPick) — 3D 물체 클릭 고르기. items: [{ object, data }]. 끄려면 Story.pick(null)
(function () {
  "use strict";
  var Q = window.Q, THREE = Q.THREE;
  var $ = function (id) { return document.getElementById(id); };
  var sceneNpc = null, lastTeam = "narmi";
  var voice = "narmi", voiceMood = "talk", lastBab = -1;
  var pending = false, active = false, lines = [], idx = -1, done = null, shown = 0, full = "", speaker = null;
  var camOn = false, camPos = new THREE.Vector3(), camLook = new THREE.Vector3(), curLook = new THREE.Vector3(), camFov = 50, drift = 0;
  var picks = null, onPick = null, hover = null, ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  var FACE = { narmi: { name: "나르미", color: "#ffffff", cls: "narmi" }, dari: { name: "달이", color: "#f29a45", cls: "dari" } };

  function shot(pos, look, fov, snap) {
    var f = window.Game && window.Game.flight;
    if (snap && f && f.gliding && f.gliding()) snap = false;      // 날아와 내려앉는 중이면 화면을 끊지 않고 부드럽게 옮긴다
    if (!camOn && !snap) { Q.camera.getWorldDirection(curLook); curLook.multiplyScalar(20).add(Q.camera.position); }
    camOn = true; camPos.set(pos[0], pos[1], pos[2]); camLook.set(look[0], look[1], look[2]); camFov = fov || 50;
    if (snap) { Q.camera.position.copy(camPos); curLook.copy(camLook); }
  }
  function free() { camOn = false; }

  function info(who) {
    if (typeof who === "string") return FACE[who] || { name: who, color: "#ffe9a8", cls: "npc" };
    if (who && who.userData && who.userData.name) { var L = window.People.LOOKS[who.userData.kind]; return { name: who.userData.name, color: "#" + ("000000" + L.body.toString(16)).slice(-6), cls: "npc" }; }
    return { name: (who && who.name) || "", color: (who && who.color) || "#ffe9a8", cls: "npc" };
  }
  function show(i) {
    idx = i; var l = lines[i];
    if (l.who && l.who.userData) sceneNpc = l.who; else if (typeof l.who === "string") lastTeam = l.who;
    if (speaker && speaker.userData) window.People.setMood(speaker, speaker.userData.restMood || "idle");
    speaker = (l.who && l.who.userData) ? l.who : null;
    if (speaker) window.People.setMood(speaker, l.mood || "talk");
    if (l.cam) shot(l.cam.pos, l.cam.look, l.cam.fov);
    if (l.on) l.on();
    var f = info(l.who);
    $("dlgName").textContent = f.name; $("dlgFace").className = f.cls; $("dlgFace").style.background = f.color;
    voice = typeof l.who === "string" ? l.who : (l.who && l.who.userData && l.who.userData.kind) || "narmi"; voiceMood = l.mood || "talk"; lastBab = -1;
    if (window.Portraits) window.Portraits.apply($("dlgFace"), voice);
    full = l.text; shown = 0; $("dlgText").textContent = ""; $("dlgNext").style.visibility = "hidden";
    $("dialog").classList.add("show");
  }
  function flightBusy() { var f = window.Game && window.Game.flight; return !!(f && f.busy && f.busy()); }
  function advance() {
    if (!active) return;
    if (pending) { pending = false; window.Game.flight.settle(); return show(0); }   // 내려앉는 중에 누르면 바로 대화로
    if (shown < full.length) { shown = full.length; $("dlgText").textContent = full; $("dlgNext").style.visibility = "visible"; return; }
    if (idx + 1 < lines.length) return show(idx + 1);
    window.Sound.fx.star();
    active = false; $("dialog").classList.remove("show");
    if (speaker) window.People.setMood(speaker, speaker.userData.restMood || "idle"); speaker = null;
    Q.clickHandler = picks ? clickPick : null;
    var d = done; done = null; if (d) d();
  }
  function play(ls, cb) {
    lines = ls; done = cb || null; active = true;
    sceneNpc = null; for (var q = 0; q < ls.length; q++) if (ls[q].who && ls[q].who.userData) { sceneNpc = ls[q].who; break; } Q.clickHandler = advance;
    document.body.classList.add("cine");
    if (flightBusy()) { pending = true; idx = -1; full = ""; shown = 0; $("dialog").classList.remove("show"); }   // 내려앉고 달이가 내릴 때까지 기다린다
    else { pending = false; show(0); }
  }

  // ---------- 클릭 고르기 ----------
  function hit(cx, cy) {
    if (!picks) return null;
    ndc.set(cx / window.innerWidth * 2 - 1, -(cy / window.innerHeight) * 2 + 1); ray.setFromCamera(ndc, Q.camera);
    var best = null, bd = 1e9;
    for (var i = 0; i < picks.length; i++) {
      if (picks[i].disabled) continue;
      var h = ray.intersectObject(picks[i].object, true);
      if (h.length && h[0].distance < bd) { bd = h[0].distance; best = picks[i]; }
    }
    return best;
  }
  function clickPick(cx, cy) { var p = hit(cx, cy); if (p && onPick) { window.Sound.fx.star(); onPick(p); } }
  function pick(items, cb) {
    if (hover) { hover.object.scale.copy(hover.base); hover = null; }
    picks = items || null; onPick = cb || null;
    document.body.classList.toggle("picking", !!picks);
    if (!active) Q.clickHandler = picks ? clickPick : null;
  }
  window.addEventListener("pointermove", function (e) {
    if (!picks || active) return;
    var p = hit(e.clientX, e.clientY);
    if (p === hover) return;
    if (hover) hover.object.scale.copy(hover.base);
    hover = p; if (hover) { if (!hover.base) hover.base = hover.object.scale.clone(); hover.object.scale.copy(hover.base).multiplyScalar(1.08); }
    document.body.style.cursor = hover ? "pointer" : "";
  });
  window.addEventListener("keydown", function (e) { if (active && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); advance(); } });

  Q.add(function (dt) {
    if (active && pending) { if (!flightBusy()) { pending = false; show(0); } }
    else if (active && shown < full.length) {
      shown = Math.min(full.length, shown + dt * 19); $("dlgText").textContent = full.slice(0, Math.floor(shown));
      var bi = Math.floor(shown) - 1, ch = full.charAt(bi);
      if (bi > lastBab && ch.trim()) { lastBab = bi; window.Sound.babble(voice, full.charCodeAt(bi), voiceMood, /[.!?…]/.test(full.charAt(bi + 1)) || bi >= full.length - 2); }
      if (shown >= full.length) $("dlgNext").style.visibility = "visible";
    }
    if (camOn) {
      drift += dt;
      Q.camera.position.lerp(camPos, Math.min(1, dt * 2.6));
      Q.camera.position.y += Math.sin(drift * 0.8) * 0.004;
      curLook.lerp(camLook, Math.min(1, dt * 3)); Q.camera.lookAt(curLook);
      if (Math.abs(Q.camera.fov - camFov) > 0.1) { Q.camera.fov = Q.lerp(Q.camera.fov, camFov, Math.min(1, dt * 3)); Q.camera.updateProjectionMatrix(); }
    }
    if (!active && !camOn) document.body.classList.remove("cine");
  });

  // 누가 누구를 바라볼지: 말하는 사람은 듣는 쪽을, 나머지는 말하는 사람을 본다
  var gv = new THREE.Vector3();
  function posOf(who) {
    var G = window.Game; if (!who || !G) return null;
    if (who === "narmi") return gv.copy(G.flight.pos);
    if (who === "dari") return G.team.dari.getWorldPosition(gv);
    if (who.userData && who.position) return gv.copy(who.position).setY(who.position.y + 4.2 * who.scale.x);
    return null;
  }
  function gaze(me) {                                // me: "narmi" | "dari" | 인물 모델
    if (!active || pending || idx < 0) return null;
    var w = lines[idx].who;
    if (w !== me) return posOf(w);
    if (typeof me === "string") return posOf(sceneNpc) || posOf(me === "narmi" ? "dari" : "narmi");
    return posOf(lastTeam || "narmi");
  }
  window.Story = { gaze: gaze, play: play, shot: shot, free: free, pick: pick, active: function () { return active; }, camera: function () { return camOn; }, skip: function () { while (active) advance(); } };
})();
