// 하늘 놀거리: 목표로 가는 길목의 바람 고리(통과하면 힘이 차고 속도가 붙음)와 빠르게 날 때의 속도선
// 점수에는 영향을 주지 않는다. 통과한 고리 수만 세어 둔다 (window.SkyFun.rings()).
(function () {
  "use strict";
  var Q = window.Q, THREE = Q.THREE, World = window.World;
  var rings = [], builtKey = "", passed = 0, combo = 0, comboT = 0;
  var ringGeo = new THREE.TorusGeometry(7.5, 0.55, 8, 32), glowGeo = new THREE.TorusGeometry(7.5, 1.3, 6, 32);

  function clear() { rings.forEach(function (r) { Q.scene.remove(r.g); }); rings = []; }
  function makeRing(p, dir) {
    var g = new THREE.Group();
    var m = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: 0xffe066, fog: false }));
    var glow = new THREE.Mesh(glowGeo, new THREE.MeshBasicMaterial({ color: 0xfff3a8, transparent: true, opacity: 0.28, depthWrite: false, fog: false }));
    g.add(m); g.add(glow);
    g.position.copy(p); g.lookAt(p.x + dir.x, p.y + dir.y, p.z + dir.z);
    Q.scene.add(g); rings.push({ g: g, m: m, glow: glow, done: 0, ph: rings.length * 1.3 });
  }
  function build(from, tg) {
    var d = new THREE.Vector3(tg.x - from.x, 0, tg.z - from.z), len = d.length(); if (len < 110) return;
    d.normalize(); var nx = -d.z, nz = d.x, n = Math.max(2, Math.min(6, Math.floor(len / 75)));
    for (var i = 1; i <= n; i++) {
      var k = i / (n + 1), off = Math.sin(i * 1.9 + len) * 16;
      var x = from.x + (tg.x - from.x) * k + nx * off, z = from.z + (tg.z - from.z) * k + nz * off;
      var y = Math.max(Math.max(World.height(x, z), 0) + 20, from.y + (tg.y - from.y) * k + Math.cos(i * 1.3) * 7);
      makeRing(new THREE.Vector3(x, y, z), d);
    }
  }

  // ---------- 속도선 ----------
  var streaks = [], SN = 26, fwd = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0), side = new THREE.Vector3(), tmp = new THREE.Vector3();
  var streakGeo = new THREE.BoxGeometry(0.07, 0.07, 1);
  for (var i = 0; i < SN; i++) {
    var s = new THREE.Mesh(streakGeo, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, fog: false }));
    s.visible = false; Q.scene.add(s);
    streaks.push({ m: s, a: Math.random() * 6.283, r: 5 + Math.random() * 11, z: Math.random() * 70 - 10, len: 4 + Math.random() * 6 });
  }

  Q.add(function (dt, t) {
    var G = window.Game, M = window.Missions; if (!G || !G.flight || !M) return;
    var f = G.flight, pos = f.pos, flying = f.enabled() && !f.parked();
    // 고리: 목표가 바뀌면 길목에 새로 놓는다
    var tg = M.state() === "play" ? M.target() : null, key = tg ? Math.round(tg.x / 8) + "," + Math.round(tg.z / 8) : "";
    if (key !== builtKey && (flying || !tg)) { clear(); builtKey = key; if (tg && false) build(pos, tg); }      // 바람 고리는 쓰지 않음 (할 일이 너무 많다는 의견, 11/12)
    comboT -= dt; if (comboT <= 0) combo = 0;
    for (var i = rings.length - 1; i >= 0; i--) {
      var r = rings[i];
      if (r.done > 0) {                            // 통과한 고리는 커지며 사라진다
        r.done += dt; r.g.scale.setScalar(1 + r.done * 3); r.glow.material.opacity = Math.max(0, 0.5 - r.done * 1.2); r.m.material.transparent = true; r.m.material.opacity = Math.max(0, 1 - r.done * 2.4);
        if (r.done > 0.45) { Q.scene.remove(r.g); rings.splice(i, 1); }
        continue;
      }
      r.g.rotation.z += dt * 0.6; r.g.scale.setScalar(1 + Math.sin(t * 3 + r.ph) * 0.05);
      if (flying && pos.distanceTo(r.g.position) < 9) {
        r.done = 0.001; passed++; combo++; comboT = 6; f.kick(); window.Sound.fx.star(); G.team.cheer();
        G.toast(combo > 1 ? "바람 고리 " + combo + "연속! 속도 업" : "바람 고리! 속도 업", 900);
      }
    }
    // 속도선: 빠를수록 진하게, 나르미 둘레를 스쳐 뒤로 흐른다
    var k = flying ? Q.clamp((f.speed() - 36) / 18, 0, 1) : 0;
    if (k <= 0.01) { if (streaks[0].m.visible) streaks.forEach(function (s) { s.m.visible = false; }); return; }
    fwd.copy(f.forward()); side.crossVectors(up, fwd).normalize(); tmp.crossVectors(fwd, side);
    for (var j = 0; j < SN; j++) {
      var s = streaks[j]; s.z -= f.speed() * 1.6 * dt;
      if (s.z < -18) { s.z = 55 + Math.random() * 20; s.a = Math.random() * 6.283; s.r = 5 + Math.random() * 11; }
      s.m.visible = true; s.m.material.opacity = 0.55 * k;
      s.m.position.copy(pos).addScaledVector(fwd, s.z).addScaledVector(side, Math.cos(s.a) * s.r).addScaledVector(tmp, Math.sin(s.a) * s.r);
      s.m.scale.set(1, 1, s.len * (0.6 + k)); s.m.lookAt(s.m.position.x + fwd.x, s.m.position.y + fwd.y, s.m.position.z + fwd.z);
    }
  });

  // ---------- 강물 반짝임: 햇빛이 물결에 부서지는 작은 빛 조각 ----------
  var glints = [], GN = 150, glintGeo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
  var glintMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8, depthWrite: false });
  var glintMesh = new THREE.InstancedMesh(glintGeo, glintMat, GN), gm = new THREE.Matrix4(), gq = new THREE.Quaternion(), gs = new THREE.Vector3(), gp = new THREE.Vector3();
  for (var gi = 0; gi < GN; gi++) {
    var gz0 = -420 + Math.random() * 840;
    glints.push({ x: World.riverX(gz0) + (Math.random() - 0.5) * 30, z: gz0, ph: Math.random() * 6.283, sp: 1.5 + Math.random() * 2.5, w: 1.2 + Math.random() * 2.6 });
  }
  glintMesh.frustumCulled = false; Q.scene.add(glintMesh);
  Q.add(function (dt, t) {
    for (var i = 0; i < GN; i++) {
      var g = glints[i], k = Math.max(0, Math.sin(t * g.sp + g.ph));
      gp.set(g.x + Math.sin(t * 0.4 + g.ph) * 1.5, 0.12, g.z + ((t * 2 + g.ph * 9) % 14) - 7);
      gs.set(g.w * k, 1, 0.35 * k + 0.001);
      gm.compose(gp, gq, gs); glintMesh.setMatrixAt(i, gm);
    }
    glintMesh.instanceMatrix.needsUpdate = true;
  });

  window.SkyFun = { rings: function () { return passed; }, reset: function () { passed = 0; clear(); builtKey = ""; } };
})();
