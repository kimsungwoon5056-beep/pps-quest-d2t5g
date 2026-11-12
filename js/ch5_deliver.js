// 5장 나르미 긴급 배송: 먹구름을 피해(또는 부스트로 빠져나가) 산 너머 소방서에 드론을 전달한다
(function () {
  "use strict";
  var Q = window.Q, THREE = Q.THREE, Toon = window.Toon, World = window.World;
  var STATION = { x: 120, z: 300 };
  var things = [], storms = [], stars = [], smoke = [], hits = 0, got = 0, phase = "fly", clock = 0, flyDrone = null, firePos = null;

  function fireStation(x, z) {
    var g = new THREE.Group(), y = World.height(x, z);
    var base = Toon.mesh(new THREE.BoxGeometry(22, 9, 13), 0xfff3dc); base.position.y = 4.5; g.add(base);
    var roof = Toon.mesh(new THREE.BoxGeometry(24, 1.6, 15), 0xd83a3a); roof.position.y = 9.8; g.add(roof);
    var tower = Toon.mesh(new THREE.BoxGeometry(5, 20, 5), 0xfff3dc); tower.position.set(-12, 10, 0); g.add(tower);
    var cap = Toon.mesh(new THREE.ConeGeometry(4.6, 4, 4), 0xd83a3a); cap.rotation.y = Math.PI / 4; cap.position.set(-12, 22, 0); g.add(cap);
    [-5, 2, 9].forEach(function (dx) { var d = Toon.mesh(new THREE.BoxGeometry(5, 6, 0.4), 0xb02a2a); d.position.set(dx - 2, 3, 6.6); g.add(d); });
    var pad = Toon.mesh(new THREE.CylinderGeometry(5, 5, 0.5, 20), 0xffd23f); pad.position.set(4, 10.9, 0); g.add(pad);
    Toon.outline(g, 0.22); g.position.set(x, y, z); g.scale.setScalar(1.25);
    Q.scene.add(g); things.push(g); return g;
  }
  function storm(x, y, z, s) {
    var g = new THREE.Group(), m = Toon.mat(0x555b78, { emissive: 0x20243a, emissiveIntensity: 0.4 });
    [[0, 0, 0, 1], [-1.2, -0.2, 0.2, 0.78], [1.2, -0.15, -0.1, 0.82], [0.3, 0.4, 0.2, 0.7]].forEach(function (b) {
      var o = Toon.mesh(new THREE.SphereGeometry(b[3], 12, 9), m); o.position.set(b[0], b[1], b[2]); o.scale.y = 0.75; g.add(o);
    });
    var bolt = Toon.mesh(new THREE.ConeGeometry(0.22, 1.5, 4), Toon.mat(0xffe14a, { emissive: 0xffc400, emissiveIntensity: 0.8 })); bolt.rotation.z = Math.PI; bolt.position.y = -1.2; g.add(bolt);
    g.userData.bolt = bolt;
    Toon.outline(g, 0.05); g.position.set(x, y, z); g.scale.setScalar(s);
    Q.scene.add(g); things.push(g); storms.push({ g: g, r: s * 1.5, cool: 0 });
  }

  // 결말 컷신: 소방대장의 인사 → 에필로그(지우 공방에 다른 마을 주문)
  function thanks(ctx) {
    var S = window.Sets, P = window.People, f = ctx.flight;
    if (!S || !window.Story) { phase = "done"; return; }
    var yd = S.yard, gy = Math.max(World.height(yd.x, yd.z), 0);
    var cx = S.chief.position.x, cz = S.chief.position.z, tx = yd.x + 6, tz = yd.z + 3;
    S.chief.rotation.y = Math.atan2(tx - cx, tz - cz);
    f.park(tx, tz, Math.atan2(cx - tx, cz - tz));
    var mx = (cx + tx) / 2, mz = (cz + tz) / 2, dl = Math.hypot(tx - cx, tz - cz), dx = (tx - cx) / dl, dz = (tz - cz) / dl, nx = -dz, nz = dx;
    var two = { pos: [mx + nx * 21, gy + 6.5, mz + nz * 21], look: [mx, gy + 4, mz], fov: 44 };
    var chiefCam = { pos: [cx + nx * 17 + dx * 7, gy + 6.5, cz + nz * 17 + dz * 7], look: [cx, gy + 3.8, cz], fov: 44 };
    var hills = { pos: [yd.x - 30, gy + 16, yd.z + 26], look: [firePos.x, firePos.y + 30, firePos.z], fov: 52 };
    var team = { pos: [tx + nx * 23 - dx * 2, gy + 8, tz + nz * 23 - dz * 2], look: [tx + dx * 1.5, gy + 3, tz + dz * 1.5], fov: 48 };
    var lines = [
      { who: S.chief, mood: "cheer", cam: two, text: "드론이 알려 준 곳으로 바로 출동했어요!\n불이 번지기 전에 껐답니다." },
      { who: "dari", cam: team, text: "좋은 기술을 찾고, 공정하게 뽑고, 재료를 지키고,\n꼼꼼히 검사해서 여기까지 왔어요!", on: function () { ctx.team.cheer(); } },
      { who: S.chief, mood: "wave", cam: chiefCam, text: "그게 조달청이 하는 일이군요.\n나르미, 달이, 정말 고마워요!" }
    ];
    // 에필로그: 첫 손님이 생긴 지우의 공방에 다른 마을 주문이 들어온다
    var find = window.Chapters.find, jw = find && find.jiwoo && find.jiwoo(), ws = find && find.workshop && find.workshop();
    if (jw && ws && ws.yard) {
      var jx = jw.position.x, jz = jw.position.z, jy = Math.max(World.height(jx, jz), 0);
      var ex = ws.yard.x - jx, ez = ws.yard.z - jz, el = Math.hypot(ex, ez) || 1; ex /= el; ez /= el;
      var jwCam = { pos: [jx + ex * 17 - ez * 6, jy + 7, jz + ez * 17 + ex * 6], look: [jx, jy + 4, jz], fov: 46 };
      lines.push({ who: jw, mood: "cheer", cam: jwCam, text: "며칠 뒤, 지우의 공방.\n\"옆 마을 소방서 세 곳에서도 주문이 왔어요!\"", on: function () { jw.userData.restMood = "cheer"; } });
      var T = World.town, tc = T && T.school, hc = T && T.hospital;
      if (tc && hc) {
        var mxT = (tc.x + hc.x) / 2, mzT = (tc.z + hc.z) / 2, gyT = Math.max(World.height(mxT, mzT), 0);
        var townCam = Q.camera.aspect < 1
          ? { pos: [mxT + 55, gyT + 70, mzT - 80], look: [mxT, gyT + 8, mzT], fov: 56, exact: true }    // 세로 폰: 나라장터 탑이 앞을 막지 않는 동남쪽에서
          : { pos: [mxT + 6, gyT + 62, mzT - 92], look: [mxT, gyT + 10, mzT], fov: 56, exact: true };   // 먼 풍경: 세로에서도 뒤로 빼지 않음 (나라장터 탑 글씨가 잘리지 않게)
        lines.push({ who: "narmi", cam: townCam, text: "읍내 학교와 병원도 나라장터에서 같은 드론을 샀대.\n산불만이 아니라 건물 안전도 지켜.", on: townDrones });
        lines.push({ who: "dari", cam: townCam, text: "조달청이 첫 손님이 되어 주니까\n좋은 기술이 온 나라로 퍼져 나가는구나!", on: function () { ctx.team.cheer(); } });
      } else lines.push({ who: "narmi", cam: jwCam, text: "조달청이 첫 손님이 되어 주면,\n좋은 기술이 온 나라로 퍼져 나가." });
    }
    window.Story.shot(two.pos, two.look, two.fov, true);
    window.Story.play(lines, function () {
      P.setMood(S.chief, "wave"); window.Story.free();
      f.takeoff(Math.PI - 1.05, 30); phase = "done";
    });
  }

  // 에필로그: 읍내 학교·병원·군청 위를 도는 드론 (이후 자유 비행에서도 계속 돈다)
  var townFleet = [];
  function townDrones() {
    if (townFleet.length || !window.Missions.drone || !World.town) return;
    ["school", "hospital", "mid"].forEach(function (k, i) {
      var p = k === "mid" ? { x: (World.town.school.x + World.town.hospital.x) / 2, z: (World.town.school.z + World.town.hospital.z) / 2 - 8 } : World.town[k], d = window.Missions.drone(); d.scale.setScalar(2.4); Q.scene.add(d);
      townFleet.push({ d: d, x: p.x, z: p.z, y: Math.max(World.height(p.x, p.z), 0) + 17 + i * 2, r: 12 + i * 2, a: i * 2.1 });
    });
  }
  Q.add(function (dt, t) {
    for (var i = 0; i < townFleet.length; i++) {
      var f = townFleet[i]; f.a += dt * 0.6;
      f.d.position.set(f.x + Math.cos(f.a) * f.r, f.y + Math.sin(t * 1.7 + i) * 0.8, f.z + Math.sin(f.a) * f.r); f.d.rotation.y = -f.a;
      f.d.userData.rotors.forEach(function (r) { r.rotation.y += dt * 40; });
    }
  });
  var route = [], leg = 0, ember = null, scanCone = null, seq = null;
  // 연기 속 작은 불씨: 주황 불꽃 세 개 + 빛나는 알갱이 (드론이 찾기 전에는 숨겨 둔다)
  function buildEmber() {
    var g = new THREE.Group();
    [[0, 0, 1.5, 3.2], [1.3, 0.4, 1.0, 2.2], [-1.1, -0.6, 0.9, 1.9]].forEach(function (f, i) {
      var c = Toon.mesh(new THREE.ConeGeometry(f[2], f[3], 7), Toon.mat(i ? 0xffb43a : 0xff6a2a, { emissive: i ? 0xff9a00 : 0xff4a10, emissiveIntensity: 0.8 }));
      c.position.set(f[0], f[3] / 2, f[1]); c.userData.ph = i * 1.7; c.userData.noInk = i > 0; g.add(c);
    });
    var glow = new THREE.Mesh(new THREE.SphereGeometry(3.2, 12, 9), new THREE.MeshBasicMaterial({ color: 0xff7a2a, transparent: true, opacity: 0.35, depthWrite: false }));
    glow.position.y = 1.2; glow.userData.noInk = true; g.add(glow); g.userData.glow = glow;
    var ring = new THREE.Mesh(new THREE.TorusGeometry(5, 0.45, 8, 32), new THREE.MeshBasicMaterial({ color: 0xff3b3b, transparent: true, opacity: 0.9, depthWrite: false, fog: false }));
    ring.rotation.x = Math.PI / 2; ring.position.y = 0.6; ring.userData.noInk = true; g.add(ring); g.userData.ring = ring;
    Toon.outline(g, 0.08); g.visible = false; g.scale.setScalar(1.8);
    return g;
  }
  // 드론 아래로 퍼지는 탐지 빛 (원뿔)
  function buildCone() {
    var m = new THREE.Mesh(new THREE.ConeGeometry(9, 26, 24, 1, true), new THREE.MeshBasicMaterial({ color: 0x7fe9ff, transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false, fog: false }));
    m.geometry.translate(0, -13, 0); m.visible = false; m.userData.noInk = true; return m;
  }
  function v3(a) { return new THREE.Vector3(a[0], a[1], a[2]); }

  function aimLeg(ctx) { var w = route[leg]; ctx.setTarget(w.x, Math.max(World.height(w.x, w.z), 0) + 34, w.z); }

  window.Chapters.deliver = {
    start: function (ctx) {
      things = []; storms = []; stars = []; smoke = []; hits = 0; got = 0; phase = "fly"; clock = 0;
      var sx = STATION.x, sz = STATION.z, sy = World.height(sx, sz);
      if (!window.Sets) fireStation(sx, sz); things.push(ctx.beam(sx, sz, 0xff8a66));
      // 산에서 피어오르는 연기 (소방서 뒤쪽 산)
      firePos = new THREE.Vector3(sx + 120, World.height(sx + 120, sz + 40) + 2, sz + 40);
      ember = buildEmber(); ember.position.set(firePos.x, firePos.y - 1.5, firePos.z); Q.scene.add(ember); things.push(ember);
      scanCone = buildCone(); Q.scene.add(scanCone); things.push(scanCone); seq = null;
      for (var i = 0; i < 9; i++) {
        var p = Toon.mesh(new THREE.SphereGeometry(4 + i * 0.8, 10, 8), Toon.mat(0x8d8f99, { transparent: true, opacity: 0.85 }));
        p.userData.k = i / 9; Q.scene.add(p); things.push(p); smoke.push(p);
      }
      // 길: 출발점 → 산 고개 → 연기 나는 산자락 → 소방서. 길을 따라 먹구름과 별을 지그재그로 놓는다.
      // 먹구름은 높이 떠 있어서 낮게 날면 안전하지만, 별은 구름 사이 높은 곳에 있다 (안전 대 가산점).
      var a = ctx.flight.pos.clone(), idx = 0;
      route = [{ x: 250, z: 200 }, { x: 218, z: 322 }, { x: sx, z: sz }]; leg = 0;
      var from = { x: a.x, z: a.z };
      route.forEach(function (to, li) {
        var dx = to.x - from.x, dz = to.z - from.z, len = Math.hypot(dx, dz), nx = -dz / len, nz = dx / len;
        var n = Math.max(3, Math.round(len / 38));
        for (var j = 1; j < n; j++) {
          var k = j / n; if (li === 0 && k * len < 45) continue;            // 막 날아오른 자리에는 놓지 않는다
          idx++;
          var cx = from.x + dx * k, cz = from.z + dz * k, side = (idx % 2 ? 1 : -1) * (8 + (idx * 37 % 13));
          var gy = Math.max(World.height(cx, cz), 0) + 46 + (idx * 53 % 16);
          storm(cx + nx * side, gy, cz + nz * side, 10 + (idx * 29 % 4));
          var st = ctx.star(); st.position.set(cx - nx * side * 1.3, gy + 2, cz - nz * side * 1.3); Q.scene.add(st); things.push(st); stars.push({ m: st, got: false });
        }
        from = to;
      });
      aimLeg(ctx);
      ctx.objective("산에서 연기가! 먹구름을 피해 소방서로 · 별을 모으면 가산점");
      if (ctx.say) ctx.say("narmi", "먹구름 아래로 낮게 날면 안전해. 별은 구름 사이 높은 곳에 있어!");
      
    },
    update: function (dt, t, ctx) {
      var pos = ctx.flight.pos;
      smoke.forEach(function (p) {
        p.userData.k = (p.userData.k + dt * 0.08) % 1; var k = p.userData.k;
        p.position.set(firePos.x + Math.sin(k * 9 + t) * 6 * k, firePos.y + k * 120, firePos.z + k * 30);
        p.scale.setScalar(0.5 + k * 2.2); p.material.opacity = phase === "safe" ? Math.max(0, p.material.opacity - dt * 0.6) : 0.85 * (1 - k * 0.7);
      });
      storms.forEach(function (s) {
        s.cool -= dt; s.g.userData.bolt.visible = Math.sin(t * 9 + s.r) > 0.2; s.g.rotation.y += dt * 0.15;
        if (phase === "fly" && s.cool <= 0 && pos.distanceTo(s.g.position) < s.r) {
          s.cool = 2; hits++; ctx.flight.bump(); window.Sound.fx.bad(); ctx.toast("먹구름! 속도가 줄었어요", 1100);
        }
      });
      stars.forEach(function (s) {
        if (s.got) return; s.m.rotation.y += dt * 3;
        if (pos.distanceTo(s.m.position) < 9) { s.got = true; got++; Q.scene.remove(s.m); ctx.burst(s.m.position.clone()); window.Sound.fx.star(); }
      });
      if (phase === "fly") {
        if (leg < route.length - 1 && Math.hypot(pos.x - route[leg].x, pos.z - route[leg].z) < 40) {
          leg++; aimLeg(ctx); window.Sound.fx.star();
          ctx.toast(leg === 1 ? "산 고개 통과! 연기 쪽으로" : "소방서가 보여요!", 1400);
        }
        if (leg >= route.length - 1 && Math.hypot(pos.x - STATION.x, pos.z - STATION.z) < 34) {
          phase = "drop"; clock = 0; ctx.setTarget(null); ctx.objective("");
          window.Sound.fx.good(); ctx.team.cheer();
          var c = window.Chapters.find && window.Chapters.find.carried && window.Chapters.find.carried();
          if (c && c.parent) c.parent.remove(c);
          flyDrone = ctx.drone(); flyDrone.scale.setScalar(2.6); flyDrone.position.copy(pos); Q.scene.add(flyDrone); things.push(flyDrone);
          // 나르미는 소방서 마당에 내려앉고, 카메라는 드론을 따라간다
          var S0 = window.Sets;
          if (S0) { var yd0 = S0.yard, tx0 = yd0.x + 6, tz0 = yd0.z + 3; ctx.flight.park(tx0, tz0, Math.atan2(S0.chief.position.x - tx0, S0.chief.position.z - tz0)); }
          seq = { from: pos.clone(), up: pos.clone().setY(pos.y + 16), over: new THREE.Vector3(firePos.x - 8, firePos.y + 30, firePos.z - 6), found: false };
          document.body.classList.add("cine");
          window.Story.shot([pos.x - 26, pos.y + 8, pos.z - 22], [pos.x, pos.y + 6, pos.z], 50, true, true);
        }
      } else if (phase === "drop") {
        // 드론 출동: 떠오르기(0~1.6초) → 산으로 날아가기(~5.4초) → 연기 속 훑기(~8초) → 불씨 발견
        clock += dt;
        var d = flyDrone.position, k;
        flyDrone.userData.rotors.forEach(function (r) { r.rotation.y += dt * 46; });
        if (clock < 1.6) {
          k = Q.smooth(0, 1.6, clock); d.lerpVectors(seq.from, seq.up, k);
          window.Story.shot([seq.from.x - 26, seq.from.y + 8, seq.from.z - 22], [d.x, d.y, d.z], 50, false, true);
        } else if (clock < 5.4) {
          k = Q.smooth(1.6, 5.4, clock); d.lerpVectors(seq.up, seq.over, k); d.y += Math.sin(k * Math.PI) * 10;
          var dir = new THREE.Vector3().subVectors(seq.over, seq.up).setY(0).normalize();
          flyDrone.rotation.y = Math.atan2(dir.x, dir.z);
          window.Story.shot([d.x - dir.x * 22 + dir.z * 8, d.y + 7, d.z - dir.z * 22 - dir.x * 8], [d.x + dir.x * 10, d.y - 2, d.z + dir.z * 10], 52, false, true);
        } else if (!seq.found) {
          // 연기 위를 천천히 돌며 탐지 빛으로 훑는다
          var a = (clock - 5.4) * 1.3;
          d.set(firePos.x + Math.cos(a) * 9, firePos.y + 26 + Math.sin(clock * 3) * 0.6, firePos.z + Math.sin(a) * 9);
          scanCone.visible = true; scanCone.position.copy(d); scanCone.rotation.set(Math.sin(clock * 2.2) * 0.35, 0, Math.cos(clock * 1.7) * 0.35);
          scanCone.material.opacity = 0.16 + Math.abs(Math.sin(clock * 6)) * 0.14;
          window.Story.shot([firePos.x - 30, firePos.y + 46, firePos.z - 52], [firePos.x, firePos.y + 16, firePos.z], 50, false, true);
          if (clock > 8) {
            seq.found = true; ember.visible = true; ember.userData.t = 0;
            ctx.burst(firePos.clone().setY(firePos.y + 2), 0xff5a3c); window.Sound.fx.stamp(); window.Sound.fx.good();
            scanCone.material.color.setHex(0xff6a5a);
            var emCam = { pos: [firePos.x - 18, firePos.y + 24, firePos.z - 30], look: [firePos.x, firePos.y + 4, firePos.z], fov: 46, exact: true };   // 드론 장면은 원래 구도 그대로
            window.Story.play([
              { who: "dari", cam: emCam, text: "삐빅! 연기 속에서 작은 불씨를 찾았어!\n드론이 소방서에 위치를 바로 보냈대." },
              { who: "narmi", cam: emCam, text: "사람 눈으로는 못 찾았을 거야.\n번지기 전에 잡을 수 있어!" }
            ], function () { phase = "safe"; clock = 0; scanCone.visible = false; window.Story.shot(emCam.pos, emCam.look, emCam.fov, false, true); window.Sound.fx.win(); });
          }
        }
        if (ember.visible) {                                  // 발견된 불씨: 깜빡이며 빨간 고리가 퍼진다
          ember.userData.t += dt;
          ember.children.forEach(function (c) { if (c.userData.ph !== undefined) c.scale.y = 0.8 + Math.sin(t * 11 + c.userData.ph) * 0.25; });
          var rk = (ember.userData.t % 1.2) / 1.2; ember.userData.ring.scale.setScalar(0.6 + rk * 1.6); ember.userData.ring.material.opacity = 0.9 * (1 - rk);
        }
      } else {
        clock += dt;
        if (flyDrone) flyDrone.userData.rotors.forEach(function (r) { r.rotation.y += dt * 40; });
        if (phase === "safe" && ember && ember.visible) {
          var ek = Math.max(0, 1 - clock / 2); ember.scale.setScalar(1.8 * Math.max(0.01, ek)); ember.userData.glow.material.opacity = 0.35 * ek;
          if (ek <= 0) ember.visible = false;
        }
        if (phase === "safe" && clock > 2.6) { phase = "thanks"; thanks(ctx); }
        if (phase === "done") return Q.clamp(72 + got * 4 - hits * 12, 30, 100);
      }
    },
    auto: function () { /* 클릭 장면 없음 */ },
    // 자동 조종용: 앞쪽 가까운 먹구름을 비켜 가도록 가고 싶은 방향(want)을 조금 틀어 준다
    dodge: function (pos, yaw, want) {
      for (var i = 0; i < storms.length; i++) {
        var s = storms[i], dx = s.g.position.x - pos.x, dz = s.g.position.z - pos.z, d = Math.hypot(dx, dz), reach = s.r + 48;
        if (d > reach || Math.abs(s.g.position.y - pos.y) > s.r + 14) continue;
        var ahead = dx * Math.sin(yaw) + dz * Math.cos(yaw); if (ahead < -4) continue;
        var left = dx * Math.cos(yaw) - dz * Math.sin(yaw);
        want += (left > 0 ? -1 : 1) * 1.9 * (1 - d / reach);
      }
      return want;
    },
    cleanup: function () {
      storms.forEach(function (s) { Q.scene.remove(s.g); });
      stars.forEach(function (s) { Q.scene.remove(s.m); });
      smoke.forEach(function (p) { Q.scene.remove(p); });
    }
  };
})();
