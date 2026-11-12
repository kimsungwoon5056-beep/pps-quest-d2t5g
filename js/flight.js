// 비행: 나르미는 스스로 앞으로 날고, 플레이어는 방향과 속도만 잡는다.
// 조작: 마우스를 움직이면 카메라(조준 방향)가 돌고 나르미가 그쪽으로 따라 난다. 좌우는 360도 제한 없음.
//       A/D·W/S(방향키)로도 조종. Space/Shift/왼쪽 버튼 = 부스트. Q/E·오른쪽 버튼 = 한 바퀴 구르기(배럴 롤).
// park(): 날아와 내려앉아 서 있는 상태 (컷신·판단 장면용). 이때 카메라는 story.js가 맡는다.
(function () {
  "use strict";
  var Q = window.Q, THREE = Q.THREE, World = window.World;
  var CRUISE = 30, BOOST = 54, CEIL = 150, EDGE = 440, STAND = 2.95, S = 1.5, ZERO = { x: 0, y: 0, boost: false };
  function ang(a, b) { return Math.atan2(Math.sin(a - b), Math.cos(a - b)); }

  function create(team) {
    var pos = new THREE.Vector3(-20, 46, -330), yaw = 0.15, pitch = 0, roll = 0, speed = CRUISE;
    var aimYaw = yaw, aimPitch = 0, camPitch = 0, mouseT = 0;          // 조준 방향 (마우스·키가 움직이고, 나르미가 따라간다)
    var energy = 1, tired = false, enabled = false, flapClock = 0, wasBoost = false, shake = 0, parked = false;
    var fwd = new THREE.Vector3(), aim = new THREE.Vector3(), camPos = new THREE.Vector3(), look = new THREE.Vector3(), tmp = new THREE.Vector3();
    var orbit = 0;                                    // 타이틀 화면에서 천천히 도는 각도
    var land = null, mount = null, dariWant = 0, climbTo = null, settle = 0;   // 내려앉기 · 다시 타고 날아오르기
    var squash = 0, leap = null, spin = null, spinCool = 0;                     // 착지 눌림 · 도약 · 구르기
    team.root.rotation.order = "YXZ"; team.root.scale.setScalar(S); Q.scene.add(team.root);

    function forward(out) { return out.set(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch)); }
    function groundAt(x, z) { return Math.max(World.height(x, z), 0); }
    function setScale(sq) { team.root.scale.set(S * (1 + 0.16 * sq), S * (1 - 0.22 * sq), S * (1 + 0.16 * sq)); }

    // 먼지 구름: 내려앉거나 박차고 오를 때 발밑에서 퍼진다
    var puffs = [];
    function dust(x, y, z, n) {
      for (var i = 0; i < (n || 7); i++) {
        var a = i / (n || 7) * 6.283 + Math.random() * 0.5;
        var m = new THREE.Mesh(new THREE.SphereGeometry(0.7, 8, 6), new THREE.MeshBasicMaterial({ color: 0xfff6dc, transparent: true, opacity: 0.85, depthWrite: false }));
        m.position.set(x, y + 0.4, z); Q.scene.add(m);
        puffs.push({ m: m, t: 0, vx: Math.cos(a) * (5 + Math.random() * 3), vz: Math.sin(a) * (5 + Math.random() * 3) });
      }
    }
    function updatePuffs(dt) {
      for (var i = puffs.length - 1; i >= 0; i--) {
        var p = puffs[i]; p.t += dt; var k = p.t / 0.7;
        p.m.position.x += p.vx * dt * (1 - k); p.m.position.z += p.vz * dt * (1 - k); p.m.position.y += dt * 1.4;
        p.m.scale.setScalar(0.6 + k * 1.6); p.m.material.opacity = 0.85 * (1 - k);
        if (k >= 1) { Q.scene.remove(p.m); p.m.geometry.dispose(); p.m.material.dispose(); puffs.splice(i, 1); }
      }
    }
    // 달이가 내려설 자리: 카메라가 있는 쪽, 나르미 앞 옆
    function dariSpot() {
      var rx = Math.cos(yaw), rz = -Math.sin(yaw), side = ((Q.camera.position.x - pos.x) * rx + (Q.camera.position.z - pos.z) * rz) >= 0 ? 1 : -1;
      var lx = side * 1.7 * S, lz = 3.3 * S, bx = land ? land.to.x : pos.x, bz = land ? land.to.z : pos.z;
      return { side: side, dy: (groundAt(bx + lx * rx + lz * Math.sin(yaw), bz + lx * rz + lz * Math.cos(yaw)) - (groundAt(bx, bz) + STAND)) / S + 0.12 };
    }
    // 내려앉는 길에 건물이 있는지: 실제 활공 곡선(가로·세로 속도가 다름)을 여러 점으로 나눠 사이사이를 광선으로 검사한다
    var probe = new THREE.Raycaster(), pSphere = new THREE.Sphere(), pA = new THREE.Vector3(), pB = new THREE.Vector3(), pD = new THREE.Vector3(), pP = new THREE.Vector3();
    function solids() {
      var list = [];
      Q.scene.traverse(function (o) {
        if (!o.isMesh || o.isInstancedMesh || !o.visible || !o.geometry || !o.geometry.attributes.position) return;
        var m = o.material; if (!m || Array.isArray(m) || m.transparent) return;
        for (var p = o; p; p = p.parent) if (p === team.root) return;          // 나르미·달이 자신은 빼고
        if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere();
        pSphere.copy(o.geometry.boundingSphere).applyMatrix4(o.matrixWorld);
        if (pSphere.radius < 1.5 || pSphere.radius > 400) return;              // 작은 소품과 땅 전체는 빼고
        list.push(o);
      });
      return list;
    }
    function landPathClear(from, to, list) {
      var N = 12;
      for (var i = 0; i < N; i++) {
        var a = i / N, b = (i + 1) / N;
        curvePoint(from, to, a, pA); curvePoint(from, to, b, pB);
        var len = pD.subVectors(pB, pA).length(); if (len < 0.01) continue;
        pD.normalize();
        // 몸통 한 줄 + 양쪽 날개 끝 두 줄 + 발 쪽 한 줄 (날개 폭만큼 옆으로 띄워서)
        var sx = -pD.z, sz = pD.x, sl = Math.hypot(sx, sz) || 1; sx /= sl; sz /= sl;
        var offs = [[0, 0], [sx * 3.4, sz * 3.4], [-sx * 3.4, -sz * 3.4], [0, 0, -1.6]];
        for (var q = 0; q < offs.length; q++) {
          probe.set(pP.set(pA.x + offs[q][0], pA.y + (offs[q][2] || 0), pA.z + offs[q][1]), pD); probe.near = 0; probe.far = len + 2.2;   // +2.2: 몸 두께만큼 여유
          if (probe.intersectObjects(list, false).length) return false;
        }
        if (pA.y < groundAt(pA.x, pA.z) + 1) return false;                     // 언덕 속으로 파고드는 길도 안 됨
      }
      return true;
    }
    function curvePoint(from, to, lk, out) {
      var eh = 1 - Math.pow(1 - lk, 2.4), ev = 1 - Math.pow(1 - lk, 1.5);
      return out.set(Q.lerp(from.x, to.x, eh), Q.lerp(from.y, to.y, ev) + Math.sin(Q.smooth(0.55, 1, lk) * Math.PI) * 0.9 + 2, Q.lerp(from.z, to.z, eh));
    }
    function shadowAt(scale, op) { team.shadow.position.set(pos.x, groundAt(pos.x, pos.z) + 0.25, pos.z); team.shadow.scale.setScalar(scale); team.shadow.material.opacity = op; }

    function update(dt, t) {
      updatePuffs(dt);
      var lookIn = Q.takeLook ? Q.takeLook() : ZERO, trick = Q.takeTrick ? Q.takeTrick() : 0;

      // ---------- 내려앉는 중: 활공 → 몸을 세워 날갯짓으로 속도를 줄임 → 발로 착지 ----------
      if (parked && land) {
        land.t += dt; var lk = Math.min(1, land.t / land.dur);
        var eh = 1 - Math.pow(1 - lk, 2.4), ev = 1 - Math.pow(1 - lk, 1.5);
        pos.x = Q.lerp(land.from.x, land.to.x, eh); pos.z = Q.lerp(land.from.z, land.to.z, eh);
        pos.y = Q.lerp(land.from.y, land.to.y, ev) + Math.sin(Q.smooth(0.55, 1, lk) * Math.PI) * 0.9;     // 내려앉기 직전 살짝 떠오른다
        yaw = land.yaw0 + ang(land.yaw1, land.yaw0) * Q.smooth(0.25, 0.85, lk);
        var flare = Q.smooth(0.45, 0.8, lk), glide = 1 - Q.smooth(0, 0.45, lk);
        team.root.position.copy(pos); team.root.rotation.set(0.3 * glide, yaw, Math.sin(lk * Math.PI) * ang(land.yaw1, land.yaw0) * -0.25);
        setScale(0);
        var sp = dariSpot();
        team.update(dt, t, { speed: 14 * (1 - lk), boost: false, turn: 0, climb: 0, flare: flare, glide: glide, off: lk > 0.86 ? 1 : 0, side: sp.side, dariY: sp.dy });
        shadowAt(Q.lerp(0.8, 1.2, lk), Q.lerp(0.2, 0.34, lk));
        if (lk >= 1) {
          land = null; squash = 1; settle = 0.3; dariWant = 1; pos.copy(tmp.copy(pos).setY(groundAt(pos.x, pos.z) + STAND));
          dust(pos.x, groundAt(pos.x, pos.z), pos.z, 8); window.Sound.fx.stamp && window.Sound.fx.stamp();
        }
        aimYaw = yaw; aimPitch = 0;
        return;
      }

      // ---------- 땅에 서 있음 ----------
      if (parked) {
        if (squash > 0) squash = Math.max(0, squash - dt * 3.2);
        var sq = Math.sin(squash * Math.PI) * 0.9;
        if (settle > 0) { settle -= dt; if (settle <= 0 && !mount) dariWant = 1; }
        if (mount) {                                  // 달이가 올라탐 → 몸을 웅크림 → 박차고 오름
          mount.t += dt; dariWant = 0;
          yaw += ang(mount.yaw, yaw) * Math.min(1, dt * 4);
          if (!(window.Story && window.Story.camera())) {     // 카메라가 나르미 뒤쪽으로 돌아와 타는 모습을 보여 준다
            camPos.set(pos.x - Math.sin(mount.yaw) * 16 - Math.cos(mount.yaw) * 6, pos.y + 4.5, pos.z - Math.cos(mount.yaw) * 16 + Math.sin(mount.yaw) * 6);
            Q.camera.position.lerp(camPos, Math.min(1, dt * 3));
            look.copy(pos); look.y += 0.4; Q.camera.lookAt(look);
            if (Math.abs(Q.camera.fov - 55) > 0.1) { Q.camera.fov = Q.lerp(Q.camera.fov, 55, Math.min(1, dt * 4)); Q.camera.updateProjectionMatrix(); }
          }
          if (team.offK() <= 0 && mount.t > 0.95) {
            if (mount.crouch === undefined) mount.crouch = 0;
            mount.crouch += dt; sq = Math.sin(Math.min(1, mount.crouch / 0.3) * Math.PI * 0.5);       // 웅크리기
            if (mount.crouch >= 0.3) {
              parked = false; yaw = aimYaw = mount.yaw; aimPitch = 0; pitch = 0.35; speed = CRUISE * 0.35;
              climbTo = groundAt(pos.x, pos.z) + mount.h; leap = { t: 0 }; mount = null; squash = 0;
              dust(pos.x, groundAt(pos.x, pos.z), pos.z, 9); window.Sound.fx.boost();
              return;
            }
          }
        }
        setScale(sq);
        team.root.position.copy(pos); team.root.position.y -= sq * 0.45; team.root.rotation.set(0, yaw, 0);
        var sp2 = dariSpot(), gz = window.Story && window.Story.gaze, ln = null, ld = null, tg;
        if (gz) {                                     // 대화 중에는 서로 얼굴을 본다
          tg = gz("narmi"); if (tg) ln = ang(Math.atan2(tg.x - pos.x, tg.z - pos.z), yaw);
          tg = gz("dari"); if (tg) { var tx0 = tg.x, tz0 = tg.z; team.dari.getWorldPosition(tmp); ld = ang(Math.atan2(tx0 - tmp.x, tz0 - tmp.z), yaw); }
        }
        team.update(dt, t, { speed: 0, boost: false, turn: 0, climb: 0, ground: true, off: dariWant, side: sp2.side, dariY: sp2.dy, lookN: ln, lookD: ld });
        shadowAt(1.2, 0.34);
        window.Sound.setWind(0.05);
        return;
      }

      // ---------- 비행 ----------
      var story = window.Story && window.Story.active();
      var inp = (enabled && !story) ? Q.input : ZERO;
      // 부스트: 힘이 바닥나면 조금 찰 때까지 쉬었다가 다시 켜진다 (켜졌다 꺼졌다 떨리지 않게)
      if (!inp.boost) tired = false; else if (energy <= 0.02) tired = true; else if (tired && energy > 0.35) tired = false;
      var boosting = inp.boost && !tired;
      energy = Q.clamp(energy + (boosting ? -0.26 : 0.22) * dt, 0, 1);
      if (boosting && !wasBoost) window.Sound.fx.boost();
      wasBoost = boosting;
      var top = boosting ? BOOST : CRUISE;
      if (spin) top += 10;
      speed = Q.lerp(speed, top, Math.min(1, dt * 2.5));

      // 조준: 마우스는 그대로 돌리고(360도), 키는 일정한 빠르기로 돌린다
      if (enabled && !story) {
        if (lookIn.x || lookIn.y) mouseT = 4;
        aimYaw -= lookIn.x * 0.0028; aimPitch = Q.clamp(aimPitch - lookIn.y * 0.0024, -1.0, 1.0);
        aimYaw -= inp.x * 1.55 * dt;
      }
      if (mouseT > 0) mouseT -= dt; else aimPitch = Q.lerp(aimPitch, 0, Math.min(1, dt * 1.2));     // 마우스를 안 쓰면 수평으로 돌아온다
      // 세상 끝에 가까워지면 부드럽게 안쪽으로 돌려 준다
      var r = Math.hypot(pos.x, pos.z), edge = Q.smooth(EDGE - 70, EDGE + 30, r);
      if (edge > 0) aimYaw += ang(Math.atan2(-pos.x, -pos.z), aimYaw) * edge * dt * 1.8;
      if (!enabled) aimYaw += dt * 0.12;              // 타이틀: 크게 원을 그리며 비행
      var yawRate = Q.clamp(ang(aimYaw, yaw) * 4, -2.3, 2.3);
      yaw += yawRate * dt;
      var turn = Q.clamp(-yawRate / 1.5, -1, 1), climb = Q.clamp(inp.y + aimPitch, -1, 1);

      // 땅과 천장: 가까워지면 자동으로 고도를 맞춰 준다 (부딪혀도 게임이 끝나지 않음)
      forward(fwd);
      var ahead = World.height(pos.x + fwd.x * 28, pos.z + fwd.z * 28);
      var floor = Math.max(World.height(pos.x, pos.z), ahead, 0) + 7;
      var wantPitch = Q.clamp(aimPitch + inp.y * 0.62, -1.0, 1.0);
      if (pos.y < floor + 10) wantPitch = Math.max(wantPitch, Q.smooth(floor + 10, floor, pos.y) * 0.7);
      if (pos.y > CEIL - 20) wantPitch = Math.min(wantPitch, -Q.smooth(CEIL - 20, CEIL, pos.y) * 0.5);
      if (climbTo !== null) {                         // 막 날아오르는 중: 정해진 높이까지 올라간다
        wantPitch = Math.max(wantPitch, 0.6); speed = Math.min(speed, CRUISE * 0.8);
        if (pos.y >= climbTo - 2) climbTo = null;
      }
      pitch = Q.lerp(pitch, wantPitch, Math.min(1, dt * 3.4));
      roll = Q.lerp(roll, turn * 0.8, Math.min(1, dt * 5));

      // 한 바퀴 구르기: 옆으로 휙 비키며 360도 돈다
      spinCool -= dt;
      if (trick && !spin && spinCool <= 0 && enabled && !story && climbTo === null) {
        spin = { t: 0, dir: trick === 2 ? (turn < -0.1 ? -1 : 1) : trick }; window.Sound.fx.boost(); team.cheer();
      }
      var spinRoll = 0, flareK = 0;
      if (spin) {
        spin.t += dt; var sk = Math.min(1, spin.t / 0.75), se = sk * sk * (3 - 2 * sk);
        spinRoll = spin.dir * 6.2832 * se;
        var dash = Math.sin(sk * Math.PI) * 20 * dt * spin.dir;          // 오른쪽(+) = (-cos, sin)
        pos.x += -Math.cos(yaw) * dash; pos.z += Math.sin(yaw) * dash;
        if (sk >= 1) { spin = null; spinCool = 0.35; }
      }

      forward(fwd); pos.addScaledVector(fwd, speed * dt);
      if (leap) {                                     // 박차고 오르는 첫 순간: 위로 솟구치며 세차게 날갯짓
        leap.t += dt; var lp = Math.min(1, leap.t / 0.7);
        pos.y += 15 * (1 - lp) * dt; flareK = 1 - Q.smooth(0.1, 1, lp);
        var st2 = Math.sin(Math.min(1, lp * 2.5) * Math.PI) * 0.6; team.root.scale.set(S * (1 - 0.1 * st2), S * (1 + 0.16 * st2), S * (1 - 0.1 * st2));
        if (lp >= 1) { leap = null; setScale(0); }
      }
      if (pos.y < floor) pos.y = Q.lerp(pos.y, floor, Math.min(1, dt * (climbTo !== null ? 1.6 : 6)));

      team.root.position.copy(pos);
      team.root.rotation.set(-pitch * 0.9, yaw, roll + spinRoll);
      team.update(dt, t, { speed: speed, boost: boosting, turn: turn, climb: climb, flare: flareK, spin: !!spin });

      var gy = groundAt(pos.x, pos.z), hgt = pos.y - gy;
      shadowAt(Q.clamp(1.3 - hgt / 90, 0.35, 1.3), Q.clamp(0.34 - hgt / 400, 0.08, 0.34));

      // 카메라: 조준 방향 뒤에서 따라간다. 마우스를 돌리면 카메라가 먼저 돌고 나르미가 몸을 기울여 따라온다.
      if (!(window.Story && window.Story.camera())) {
        if (enabled) {
          camPitch = Q.lerp(camPitch, pitch * 0.55 + aimPitch * 0.35, Math.min(1, dt * 4));
          aim.set(Math.sin(aimYaw) * Math.cos(camPitch), Math.sin(camPitch), Math.cos(aimYaw) * Math.cos(camPitch));
          var back = 15 + (speed - CRUISE) / (BOOST - CRUISE) * 2.5;
          camPos.copy(pos).addScaledVector(aim, -back); camPos.y += 5.2;
          camPos.y = Math.max(camPos.y, groundAt(camPos.x, camPos.z) + 2);
          Q.camera.position.lerp(camPos, Math.min(1, dt * 6));
          look.copy(pos).addScaledVector(aim, 10); look.y += 1.6;
        } else {
          // 타이틀: 나르미가 화면 오른쪽 아래에 작게 보이고, 위쪽은 제목 자리로 비워 둔다
          // 타이틀: 나르미와 달이가 화면 오른쪽 아래에 크게 보이고, 위쪽 가운데는 제목 자리로 비워 둔다
          camPos.set(pos.x - Math.sin(yaw) * 9.5, pos.y + 1.6 - pitch * 4, pos.z - Math.cos(yaw) * 9.5);
          orbit += dt * 0.25; camPos.x += Math.cos(yaw) * (6.5 + Math.sin(orbit) * 1.2); camPos.z -= Math.sin(yaw) * (6.5 + Math.sin(orbit) * 1.2);
          Q.camera.position.lerp(camPos, Math.min(1, dt * 2.2));
          look.copy(pos).addScaledVector(fwd, 9); look.y += 3.4; look.x += Math.cos(yaw) * 4.2; look.z -= Math.sin(yaw) * 4.2;
        }
        if (shake > 0) { shake -= dt; Q.camera.position.x += (Math.random() - 0.5) * shake * 1.6; Q.camera.position.y += (Math.random() - 0.5) * shake * 1.6; }
        Q.camera.lookAt(look);
        Q.camera.rotation.z += (roll * 0.12 + Math.sin(spinRoll) * 0.1);          // 기울기를 살짝 따라가 속도감을 준다
        var fov = 62 + (speed - CRUISE) / (BOOST - CRUISE) * 16;
        if (Math.abs(Q.camera.fov - fov) > 0.1) { Q.camera.fov = Q.lerp(Q.camera.fov, fov, Math.min(1, dt * 4)); Q.camera.updateProjectionMatrix(); }
      }

      window.Sound.setWind((speed - CRUISE) / (BOOST - CRUISE) * 0.8 + 0.2);
      flapClock += dt * (boosting ? 10 : 7); if (flapClock > 6.283) { flapClock -= 6.283; window.Sound.fx.flap(); }
      var fill = document.getElementById("speedfill"); if (fill) { fill.style.transform = "scaleX(" + energy.toFixed(3) + ")"; fill.parentNode.style.opacity = energy > 0.985 ? "0" : "1"; }
    }
    Q.add(update);

    return {
      pos: pos, forward: function () { return forward(tmp).clone(); },
      enable: function (on) { enabled = on; aimYaw = yaw; aimPitch = 0; }, enabled: function () { return enabled; },
      speed: function () { return speed; }, yaw: function () { return yaw; },
      shake: function (s) { shake = Math.max(shake, s || 0.4); },
      kick: function () { energy = 1; tired = false; speed = Math.min(BOOST + 14, speed + 18); },      // 링을 통과하면 힘이 차고 속도가 붙는다
      boosting: function () { return wasBoost; },
      bump: function () { speed *= 0.45; shake = Math.max(shake, 0.55); },
      // 공중의 한 지점에 놓기
      place: function (x, y, z, ny) { parked = false; land = null; mount = null; climbTo = null; leap = null; spin = null; dariWant = 0; setScale(0); pos.set(x, y, z); yaw = aimYaw = ny; pitch = aimPitch = 0; roll = 0; speed = CRUISE; Q.camera.position.set(x - Math.sin(ny) * 15, y + 5.2, z - Math.cos(ny) * 15); },
      // 날아와 내려앉은 뒤 달이가 폴짝 내린다. 이미 그 자리에 서 있으면 방향만 바꾼다.
      park: function (x, z, ny) {
        var to = new THREE.Vector3(x, groundAt(x, z) + STAND, z);
        mount = null; climbTo = null; leap = null; spin = null; pitch = 0; roll = 0; setScale(0);
        if (parked && !land && Math.hypot(pos.x - x, pos.z - z) < 4) { pos.copy(to); yaw = ny; dariWant = 1; return; }
        var dx = pos.x - x, dz = pos.z - z, len = Math.hypot(dx, dz);
        if (len < 1) { dx = -Math.sin(ny); dz = -Math.cos(ny); len = 1; }
        dx /= len; dz /= len;
        // 가까이 날아와 있었으면 그 자리에서 그대로 내려앉고(화면이 끊기지 않음), 멀리 있었으면 조금 떨어진 곳에서 날아든다
        var near = !parked && len < 70 && len > 3;
        var from = near ? pos.clone() : new THREE.Vector3(x + dx * 34, to.y + 14, z + dz * 34);
        if (!near) {
          // 멀리서 날아드는 경우: 그 방향에 건물(소방서 등)이 있으면 막히지 않는 방향·높이를 찾는다
          var list = solids(), base = Math.atan2(dx, dz), OFF = [0, 0.6, -0.6, 1.2, -1.2, 1.8, -1.8, 2.5, -2.5, Math.PI], found = false;
          for (var hi = 0; hi < 2 && !found; hi++) for (var oi = 0; oi < OFF.length && !found; oi++) {
            var a2 = base + OFF[oi], cand = new THREE.Vector3(x + Math.sin(a2) * 34, to.y + (hi ? 22 : 14), z + Math.cos(a2) * 34);
            if (landPathClear(cand, to, list)) { from = cand; dx = Math.sin(a2); dz = Math.cos(a2); found = true; }
          }
        }
        land = { t: 0, dur: near ? Q.clamp(from.distanceTo(to) / 17, 1.9, 3.0) : 2.2, from: from, to: to, yaw0: near ? yaw : Math.atan2(-dx, -dz), yaw1: ny, cut: !near };
        parked = true; dariWant = 0; settle = 0; squash = 0; team.snapOff(0); pos.copy(from); yaw = land.yaw0;
      },
      // 달이가 다시 올라탄 뒤 그 자리에서 박차고 날아오른다
      takeoff: function (ny, height) {
        if (!parked) { if (ny !== undefined) yaw = aimYaw = ny; return; }
        if (land) { pos.copy(land.to); land = null; }
        mount = { yaw: ny === undefined ? yaw : ny, h: height || 26, t: 0 };
      },
      gliding: function () { return !!land && !land.cut; },      // 화면을 끊지 않고 내려앉는 중
      // 내려앉기와 달이 내리기가 끝났는지 (컷신 대사는 이게 끝난 뒤 시작)
      busy: function () { return !!land || (parked && !mount && (settle > 0 || (dariWant === 1 && team.offK() < 1))); },
      settle: function () { if (land) { pos.copy(land.to); yaw = land.yaw1; land = null; } squash = 0; settle = 0; if (parked && !mount) { dariWant = 1; team.snapOff(1); } },
      parked: function () { return parked; }
    };
  }
  window.Flight = { create: create };
})();
