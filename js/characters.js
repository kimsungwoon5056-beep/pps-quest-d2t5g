// 캐릭터: 나르미(고글·빨간 스카프의 흰 새)와 등에 탄 달이(배낭 멘 주황 다람쥐)
// 조달청 공식 3D 그림의 인상(둥글둥글한 몸, 색, 소품)을 따라 코드로 만든 모델. 앞쪽은 +z.
(function () {
  "use strict";
  var Q = window.Q, THREE = Q.THREE, Toon = window.Toon;
  var WHITE = 0xffffff, INKY = 0x23232e, ORANGE = 0xf6a23c, RED = 0xe23b3b, GOGGLE = 0xa9dcf5, GRAY = 0x4a4a55;
  var SQ = 0xf29a45, SQD = 0xd9742a, BROWN = 0x7a4a2a;

  function buildNarmi() {
    var g = new THREE.Group(), parts = {};
    // 공식 그림 비율: 아주 큰 달걀 머리 + 작은 몸. 날 때는 머리가 앞(+z), 몸이 뒤로 눕고, 설 때는 몸이 머리 아래로 온다.
    var body = Toon.ball(0.78, WHITE, 1.0, 0.92, 1.25); body.position.set(0, -0.15, -0.75); g.add(body);
    // 꼬리깃 (끝이 회색)
    var tail = Toon.ball(0.4, WHITE, 1.1, 0.35, 1.3); tail.position.set(0, 0.5, -1.4); tail.rotation.x = 0.5; g.add(tail);
    var tailTip = Toon.ball(0.32, GRAY, 1.15, 0.3, 1.0); tailTip.position.set(0, 0.72, -1.8); tailTip.rotation.x = 0.5; g.add(tailTip);
    // 머리
    var head = new THREE.Group(); head.position.set(0, 0.3, 1.2); g.add(head); parts.head = head;
    head.add(Toon.ball(1.28, WHITE, 1.06, 0.96, 1.0));
    // 뒤로 넘긴 깃 세 겹
    [[0.98, -0.55, 0.62], [0.72, -0.92, 0.52], [0.42, -1.16, 0.42]].forEach(function (c) {
      var lobe = Toon.ball(c[2], WHITE, 1.25, 0.5, 1.25); lobe.position.set(0, c[0], c[1]); lobe.rotation.x = -0.55; head.add(lobe);
    });
    // 고글: 얼굴을 감싸는 한 장짜리 하늘색 창. 눈이 비쳐 보인다.
    var gog = new THREE.Mesh(new THREE.SphereGeometry(1.0, 28, 10, Math.PI / 2 - 1.12, 2.24, Math.PI * 0.4, Math.PI * 0.17),
      new THREE.MeshBasicMaterial({ color: 0x8fcdea, transparent: true, opacity: 0.74, depthWrite: false }));
    gog.scale.set(1.4, 1.3, 1.34); gog.position.set(0, 0.02, 0); gog.userData.noInk = true; head.add(gog);
    [-0.46, 0.46].forEach(function (x) {
      var e = Toon.ball(0.2, INKY, 1, 1.1, 0.6); e.position.set(x, 0.0, 1.19); e.userData.noInk = true; head.add(e); (parts.eyes = parts.eyes || []).push(e);
      var hl = Toon.ball(0.07, WHITE); hl.position.set(x - 0.06, 0.08, 1.31); hl.userData.noInk = true; head.add(hl); (parts.shine = parts.shine || []).push(hl);
    });
    var beak = Toon.ball(0.2, ORANGE, 1.0, 0.75, 1.3); beak.position.set(0, -0.3, 1.28); head.add(beak);
    // 스카프: 목에 두르고 옆에 매듭
    var scarf = Toon.mesh(new THREE.TorusGeometry(0.62, 0.17, 8, 18), RED); scarf.position.set(0, -0.1, 0.02); scarf.scale.set(1.05, 1.0, 1); g.add(scarf);
    var knot = Toon.ball(0.2, RED); knot.position.set(-0.62, -0.2, 0.05); g.add(knot);
    var flag = new THREE.Group(); flag.position.set(-0.62, -0.18, 0.0); g.add(flag); parts.flag = flag;
    var f1 = Toon.mesh(new THREE.BoxGeometry(0.4, 0.08, 1.0), RED); f1.position.z = -0.5; flag.add(f1);
    var f2 = new THREE.Group(); f2.position.z = -1.0; flag.add(f2); parts.flag2 = f2;
    var f2m = Toon.mesh(new THREE.BoxGeometry(0.34, 0.08, 0.7), RED); f2m.position.z = -0.35; f2.add(f2m);
    // 날개: 어깨에서 접히는 두 마디, 끝은 회색 깃
    parts.wings = [];
    [-1, 1].forEach(function (side) {
      var root = new THREE.Group(); root.position.set(side * 0.6, 0.1, -0.6); g.add(root);
      var inner = Toon.ball(1, WHITE, 1.1, 0.16, 0.72); inner.position.x = side * 1.0; root.add(inner);
      var tipPivot = new THREE.Group(); tipPivot.position.x = side * 1.9; root.add(tipPivot);
      var tip = Toon.ball(1, GRAY, 0.85, 0.13, 0.58); tip.position.x = side * 0.65; tip.position.z = -0.1; tipPivot.add(tip);
      [-0.3, 0.05].forEach(function (z, i) { var fe = Toon.ball(0.3, GRAY, 1.2, 0.3, 0.7); fe.position.set(side * (1.25 - i * 0.2), 0, z - 0.25); tipPivot.add(fe); });
      parts.wings.push({ root: root, tip: tipPivot, side: side });
    });
    // 다리와 발 (날 때는 뒤로 뻗고, 서면 아래로 온다)
    [-0.3, 0.3].forEach(function (x) {
      var leg = Toon.ball(0.13, ORANGE, 1, 1, 2.2); leg.position.set(x, -0.5, -1.62); g.add(leg);
      var ft = Toon.ball(0.24, ORANGE, 1.1, 1.5, 0.6); ft.position.set(x, -0.62, -1.92); g.add(ft);
    });
    g.userData.parts = parts;
    return g;
  }

  function buildDari() {
    var g = new THREE.Group(), parts = {};
    // 공식 그림 비율: 큰 머리(위는 주황·줄무늬, 아래는 흰 얼굴), 작은 몸, 흰 배, 갈색 배낭, 끝이 흰 꼬리
    var body = Toon.ball(0.5, SQ, 1, 1.12, 0.92); body.position.y = 0.6; g.add(body);
    var belly = Toon.ball(0.34, WHITE, 0.9, 1.0, 0.5); belly.position.set(0, 0.55, 0.3); belly.userData.noInk = true; g.add(belly);
    [-0.22, 0.22].forEach(function (x) { var ft = Toon.ball(0.2, SQ, 1, 0.75, 1.25); ft.position.set(x, 0.12, 0.08); g.add(ft); });
    var pack = Toon.mesh(new THREE.BoxGeometry(0.62, 0.62, 0.3), BROWN); pack.position.set(0, 0.68, -0.5); g.add(pack);
    [-0.3, 0.3].forEach(function (x) { var st = Toon.mesh(new THREE.BoxGeometry(0.1, 0.6, 0.86), BROWN); st.position.set(x, 0.7, -0.05); st.userData.noInk = true; g.add(st); });
    var tail = Toon.ball(0.4, SQ, 0.8, 1.4, 0.8); tail.position.set(0, 0.62, -0.95); tail.rotation.x = -0.6; g.add(tail); parts.tail = tail;
    var tailTip = Toon.ball(0.3, WHITE, 0.85, 0.9, 0.85); tailTip.position.set(0, 1.08, -1.25); g.add(tailTip);
    var head = new THREE.Group(); head.position.set(0, 1.62, 0.08); g.add(head); parts.head = head;
    head.add(Toon.ball(0.95, SQ, 1.06, 0.9, 0.95));
    var face = Toon.ball(0.86, WHITE, 1.08, 0.6, 0.9); face.position.set(0, -0.3, 0.14); face.userData.noInk = true; head.add(face);
    [-0.72, 0.72].forEach(function (x) {
      var ear = Toon.ball(0.32, SQ, 1, 1, 0.6); ear.position.set(x, 0.66, -0.05); head.add(ear);
      var inner = Toon.ball(0.2, WHITE, 1, 1, 0.5); inner.position.set(x, 0.66, 0.08); inner.userData.noInk = true; head.add(inner);
    });
    [-0.26, 0, 0.26].forEach(function (x, i) { var s = Toon.ball(0.1, SQD, 0.7, 0.5, i === 1 ? 2.6 : 2.0); s.position.set(x, 0.74 - Math.abs(x) * 0.25, 0.42); s.rotation.x = 0.62; s.userData.noInk = true; head.add(s); });
    [-0.38, 0.38].forEach(function (x) {
      var e = Toon.ball(0.14, INKY, 1, 1.1, 0.6); e.position.set(x, -0.12, 0.88); e.userData.noInk = true; head.add(e); (parts.eyes = parts.eyes || []).push(e);
      var hl = Toon.ball(0.05, WHITE); hl.position.set(x - 0.04, -0.06, 0.97); hl.userData.noInk = true; head.add(hl); (parts.shine = parts.shine || []).push(hl);
    });
    var nose = Toon.ball(0.07, 0xf5823a, 1.2, 0.8, 1); nose.position.set(0, -0.27, 0.95); nose.userData.noInk = true; head.add(nose);
    [-0.09, 0.09].forEach(function (x) { var m = Toon.mesh(new THREE.TorusGeometry(0.09, 0.025, 5, 10, Math.PI), INKY); m.rotation.z = Math.PI; m.position.set(x, -0.38, 0.9); m.userData.noInk = true; head.add(m); });
    parts.arms = [];
    [-1, 1].forEach(function (side) { var a = Toon.ball(0.16, SQ, 1, 1.6, 1); a.position.set(side * 0.48, 0.7, 0.26); a.rotation.x = -0.9; g.add(a); parts.arms.push(a); });
    g.userData.parts = parts;
    return g;
  }

  // 나르미 + 달이 한 팀. update(dt, t, state)로 움직임을 준다.
  function buildTeam() {
    var root = new THREE.Group(), narmi = buildNarmi(), dari = buildDari();
    dari.position.set(0, 0.42, -0.8); dari.scale.setScalar(0.62);
    narmi.add(dari); root.add(narmi);
    Toon.outline(root, 0.07);
    // 땅에 드리우는 동그란 그림자 (높이 감각을 준다)
    var shadow = new THREE.Mesh(new THREE.CircleGeometry(2.6, 20).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x15233f, transparent: true, opacity: 0.28, depthWrite: false }));
    Q.scene.add(shadow);
    var dShadow = new THREE.Mesh(new THREE.CircleGeometry(1.0, 16).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x15233f, transparent: true, opacity: 0, depthWrite: false }));
    Q.scene.add(dShadow); var dsp = new THREE.Vector3();
    var np = narmi.userData.parts, dp = dari.userData.parts, flap = 0, joy = 0;
    // 달이 내리기·타기: offK 0 = 나르미 등에 탐, 1 = 옆 땅에 내려 섬. 그 사이는 폴짝 뛰는 동작.
    var offK = 0, hopSide = 1, seat = new THREE.Vector3(), SEAT = new THREE.Vector3(0, 0.5, -0.85), headX = 0, bk = 0, dariFace = 0, headY = 0;
    function placeDari(t, st) {
      if (offK <= 0) {
        if (dari.parent !== narmi) { narmi.add(dari); dari.rotation.y = 0; }
        dari.position.copy(SEAT); dari.scale.setScalar(0.62); dShadow.material.opacity = 0; return;
      }
      dari.scale.setScalar(Q.lerp(0.62, 0.86, offK));        // 내리면 공식 그림 비율(나르미의 절반 남짓)로 보인다
      if (dari.parent !== root) root.add(dari);
      narmi.updateMatrix(); seat.copy(SEAT).applyMatrix4(narmi.matrix);
      // 나르미 몸을 뚫지 않게: 먼저 옆으로 크게 벌어지며 높이 뛰어오른 다음 앞쪽 땅으로 내려온다
      var e = offK * offK * (3 - 2 * offK), ez = offK * offK, bul = Math.sin(offK * Math.PI), gy = (st && st.dariY !== undefined) ? st.dariY : -1.1;
      dari.position.set(Q.lerp(seat.x, hopSide * 1.7, e) + hopSide * 1.9 * bul, Q.lerp(seat.y, gy, e) + bul * 2.9 + (offK >= 1 ? Math.abs(Math.sin(t * 3)) * 0.04 : 0), Q.lerp(seat.z, 3.3, ez));
      var landK = offK > 0.85 ? Math.sin((offK - 0.85) / 0.15 * Math.PI) : 0, sc = Q.lerp(0.62, 0.86, offK);
      dari.scale.set(sc * (1 + landK * 0.12), sc * (1 - landK * 0.16), sc * (1 + landK * 0.12));
      // 서 있을 때는 말하는 상대를 바라본다 (lookD: 나르미가 보는 방향 기준 각도)
      var face = (st && st.lookD !== undefined && st.lookD !== null) ? st.lookD : hopSide * 0.45;
      dariFace += Math.atan2(Math.sin(face - dariFace), Math.cos(face - dariFace)) * Math.min(1, ((st && st.dt) || 0.016) * 6);
      dari.rotation.x = Q.lerp(0.6, 0, e) - bul * 0.5; dari.rotation.y = dariFace * e + hopSide * bul * 1.2;
      root.updateMatrixWorld(); dsp.set(dari.position.x, gy - 0.02, dari.position.z).applyMatrix4(root.matrixWorld);
      dShadow.position.copy(dsp); dShadow.material.opacity = 0.26 * e; dShadow.scale.setScalar(1.5 * (0.6 + 0.4 * (1 - bul)));
      if (offK < 1) dp.arms.forEach(function (a) { a.rotation.x = -2.5; a.position.y = 1.05; });
    }

    function update(dt, t, st) {            // st: {speed, boost, turn, climb}
      st.dt = dt;
      // 눈 깜빡임 (둘이 서로 다른 박자로). 기쁠 때는 눈웃음
      [[np, t * 0.8], [dp, t * 0.8 + 1.3]].forEach(function (q) {
        var shut = (q[1] % 3.6) < 0.13, k = shut ? 0.1 : (q[0] === dp && joy > 0 ? 0.45 : 1);
        if (q[0].eyes) q[0].eyes.forEach(function (e) { e.scale.y = 1.1 * k; });
        if (q[0].shine) q[0].shine.forEach(function (h) { h.visible = k > 0.5; });
      });
      var want = st.off ? 1 : 0;             // 달이 내리기·타기 (내려앉는 마지막 순간부터 뛰어내린다)
      if (offK !== want && (st.ground || st.flare)) {
        if (offK === 0 && want === 1 && st.side) hopSide = st.side;
        offK = want > offK ? Math.min(1, offK + dt / 0.75) : Math.max(0, offK - dt / 0.75);
        if (offK === want) window.Sound.fx.flap();
      }
      if (st.ground) {                       // 땅에 서 있는 자세: 몸을 세우고 날개를 살짝 벌려 내린다
        narmi.rotation.x = Q.lerp(narmi.rotation.x, -1.45, Math.min(1, dt * 6)); narmi.position.y = Math.sin(t * 2.2) * 0.04;
        np.wings.forEach(function (w) { w.root.rotation.z = Q.lerp(w.root.rotation.z, w.side * -0.35, Math.min(1, dt * 6)); w.tip.rotation.z = Q.lerp(w.tip.rotation.z, w.side * -0.25, Math.min(1, dt * 6)); w.root.rotation.y = Q.lerp(w.root.rotation.y, w.side * 0.92, Math.min(1, dt * 6)); w.root.scale.setScalar(Q.lerp(w.root.scale.x, 0.6, Math.min(1, dt * 6))); });
        headX = Q.lerp(headX, 1.45, Math.min(1, dt * 6)); np.head.rotation.x = headX;
        // 말하는 상대를 바라본다. 대화가 없으면 천천히 둘러본다
        headY = Q.lerp(headY, (st.lookN !== undefined && st.lookN !== null) ? Q.clamp(st.lookN, -1.1, 1.1) : Math.sin(t * 0.9) * 0.25, Math.min(1, dt * 5)); np.head.rotation.y = headY;
        np.flag.rotation.y = Math.sin(t * 2) * 0.1; np.flag.rotation.x = -0.6; np.flag2.rotation.y = 0;
        joy = Math.max(0, joy - dt);
        dari.rotation.x = 0.6; dp.head.rotation.y = Math.sin(t * 1.1 + 1) * 0.3; dp.head.rotation.z = 0; dp.tail.rotation.x = -0.5 + Math.sin(t * 3) * 0.1;
        dp.arms.forEach(function (a, i) { a.rotation.x = joy > 0 ? -2.6 + Math.sin(t * 20 + i) * 0.3 : -0.9; a.position.y = joy > 0 ? 1.05 : 0.7; });
        placeDari(t, st);
        return;
      }
      if (offK > 0) { if (!st.flare) offK = 0; placeDari(t, st); }
      headY = Q.lerp(headY, 0, Math.min(1, dt * 6));
      // flare: 내려앉기 직전·박차고 오를 때 몸을 세우고 세차게 날갯짓 / glide: 날개를 펴고 미끄러지듯 활공
      var fl = st.flare || 0, gl = st.glide || 0;
      bk = Q.lerp(bk, st.boost ? 1 : 0, Math.min(1, dt * 4));           // 부스트는 서서히 켜지고 꺼진다 (덜덜 떨리지 않게)
      narmi.rotation.x = Q.lerp(narmi.rotation.x, -1.05 * fl, Math.min(1, dt * 7)); headX = Q.lerp(headX, 1.0 * fl, Math.min(1, dt * 7));
      var rate = 7 + Math.abs(st.climb) * 3 + bk * 2 + fl * 9 - gl * 5;
      flap += dt * rate;
      var beat = Math.sin(flap), amp = (0.55 - bk * 0.3) * (1 - gl * 0.75) + fl * 0.4, sweep = bk * 0.55 - 0.12;
      np.wings.forEach(function (w) {
        w.root.scale.setScalar(Q.lerp(w.root.scale.x, 1, Math.min(1, dt * 8)));
        w.root.rotation.z = w.side * (beat * amp + 0.12 + gl * 0.1);
        w.tip.rotation.z = w.side * (Math.sin(flap - 0.7) * amp * 0.9 - bk * 0.25);
        w.root.rotation.y = Q.lerp(w.root.rotation.y, w.side * sweep, Math.min(1, dt * 6));
      });
      narmi.position.y = -beat * (0.12 - bk * 0.09) * (1 - gl * 0.7);
      np.head.rotation.y = headY - st.turn * 0.35; np.head.rotation.x = headX - st.climb * 0.2;
      np.flag.rotation.y = Math.sin(t * 9) * 0.25 + st.turn * 0.5; np.flag.rotation.x = Math.sin(t * 7) * 0.12;
      np.flag2.rotation.y = Math.sin(t * 9 - 1) * 0.5;
      // 달이: 몸을 숙이고 꼭 붙잡기, 기쁠 때 두 팔 번쩍
      joy = Math.max(0, joy - dt);
      dp.head.rotation.y = -st.turn * 0.5 + Math.sin(t * 1.3) * 0.15;
      dp.head.rotation.z = st.turn * 0.2;
      dp.tail.rotation.x = -0.5 + Math.sin(t * 8) * 0.12 - bk * 0.35;
      var up = joy > 0 || st.spin;
      dp.arms.forEach(function (a, i) { a.rotation.x = up ? -2.6 + Math.sin(t * 20 + i) * 0.3 : -0.9; a.position.y = up ? 1.05 : 0.7; });
      dari.rotation.x = 0.08 + bk * 0.25 + fl * 0.5;
    }
    function cheer() { joy = 1.4; }
    return { root: root, narmi: narmi, dari: dari, shadow: shadow, update: update, cheer: cheer,
      offK: function () { return offK; }, snapOff: function (v) { offK = v ? 1 : 0; } };
  }

  window.Characters = { buildTeam: buildTeam, buildNarmi: buildNarmi, buildDari: buildDari };
})();
