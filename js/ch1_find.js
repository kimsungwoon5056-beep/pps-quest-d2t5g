// 1장 숨은 혁신 찾기 (이야기형): 발명가 지우를 만나 → 드론을 숲으로 데려가 시험해 보고 → 혁신제품으로 지정한다.
// 전하려는 것: 좋은 새 기술도 "써 본 곳"이 없으면 팔기 어렵다. 그래서 조달청이 먼저 써 보고 첫 번째 손님이 되어 준다.
// 흐름: go(공방으로 비행) → meet(착륙 컷신) → test(시험 비행: 드론이 스스로 연기 3곳을 찾음) → back(공방으로) → award(도장 컷신) → end(이륙)
(function () {
  "use strict";
  var Q = window.Q, THREE = Q.THREE, Toon = window.Toon, World = window.World;
  var NAVY = "#1b2a5c", YELLOW = "#ffd23f", TEAL = 0x3ad1c5;
  var SPOTS = [[-190, -10], [-272, -100], [-200, -188]];        // 시험용 연기를 피울 숲 속 세 곳
  var SEEK_R = 45, ARRIVE_R = 30;

  // 풍경으로 남는 것 (한 번만 만든다)
  var shop = null, jiwoo = null, W = null, bench = null, plaque = null;
  // 장이 도는 동안만 있는 것
  var temps = [], spots = [], beam = null, proto = null, cone = null, tag = null, stamp = null, carried = null;
  var phase = "go", found = 0, testTime = 0, endWait = 0, said = 0;
  var mode = "bench", seek = null, seekT = 0, tagT = 0, stampT = -1, stampHit = false, plaqueK = 0;
  var from = new THREE.Vector3(), to = new THREE.Vector3(), tmp = new THREE.Vector3();

  function ground(x, z) { return Math.max(World.height(x, z), 0); }
  function keep(o) { Q.scene.add(o); temps.push(o); return o; }
  function drop(o) { if (o && o.parent) o.parent.remove(o); }

  // ---------- 글자 (굵은 글씨, 남색 테두리, 노랑) ----------
  function textCanvas(w, h, draw) {
    var c = document.createElement("canvas"); c.width = w; c.height = h;
    var g = c.getContext("2d"); g.textAlign = "center"; g.textBaseline = "middle"; g.lineJoin = "round"; draw(g);
    var tex = new THREE.CanvasTexture(c); tex.encoding = THREE.sRGBEncoding; return tex;
  }
  function fat(g, text, x, y, size, fill, edge) {
    g.font = "900 " + size + "px 'Malgun Gothic','Apple SD Gothic Neo','Noto Sans KR',sans-serif";
    if (edge) { g.lineWidth = size * 0.26; g.strokeStyle = edge; g.strokeText(text, x, y); }
    g.fillStyle = fill; g.fillText(text, x, y);
  }
  function label(text, width) {
    var tex = textCanvas(512, 160, function (g) { fat(g, text, 256, 84, 92, YELLOW, NAVY); });
    var s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, fog: false }));
    s.scale.set(width, width * 160 / 512, 1); return s;
  }

  // ---------- 지우의 공방: 톱니 간판과 굴뚝이 있는 큰 집 + 앞마당 작업대 ----------
  function gearSign() {
    var g = new THREE.Group();
    g.add(Toon.mesh(new THREE.TorusGeometry(0.62, 0.2, 8, 16), 0xffd23f));
    for (var i = 0; i < 8; i++) {
      var a = i / 8 * Math.PI * 2, tooth = Toon.mesh(new THREE.BoxGeometry(0.3, 0.34, 0.3), 0xffd23f);
      tooth.position.set(Math.cos(a) * 0.88, Math.sin(a) * 0.88, 0); tooth.rotation.z = a + Math.PI / 2; g.add(tooth);
    }
    var hub = Toon.mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.3, 10), 0xf08a3c); hub.rotation.x = Math.PI / 2; g.add(hub);
    return g;
  }
  function buildShop() {
    var wx = World.riverX(-60) - 80, wz = -60, gy = ground(wx, wz);
    W = { x: wx, z: wz, y: gy };
    shop = new THREE.Group();
    var h = World.house(1);                                       // 벽 9 x 3.4 x 5.5, 문은 +z 쪽
    var ch = Toon.mesh(new THREE.BoxGeometry(1, 3.2, 1), 0xb5563f); ch.position.set(2.7, 5.2, -1); h.add(ch);           // 굴뚝
    var chTop = Toon.mesh(new THREE.BoxGeometry(1.3, 0.35, 1.3), 0x8f3f2e); chTop.position.set(2.7, 6.9, -1); h.add(chTop);
    var shed = Toon.mesh(new THREE.BoxGeometry(3.2, 2.4, 4.2), 0xe6d2a8); shed.position.set(-6.1, 1.2, -0.3); h.add(shed); // 옆 창고
    var shedRoof = Toon.mesh(new THREE.BoxGeometry(3.7, 0.35, 4.8), 0x2f6f8f); shedRoof.position.set(-6.1, 2.55, -0.3); shedRoof.rotation.z = 0.08; h.add(shedRoof);
    var shedDoor = Toon.mesh(new THREE.BoxGeometry(1.7, 1.7, 0.15), 0x7a8aa0); shedDoor.position.set(-6.1, 0.85, 1.85); h.add(shedDoor);
    var gear = gearSign(); gear.position.set(0.15, 2.25, 2.95); h.add(gear); shop.userData.gear = gear;                  // 톱니 간판
    var board = Toon.mesh(new THREE.BoxGeometry(5.2, 1.25, 0.25), 0xfff3dc); board.position.set(0, 5.35, 3.3); board.rotation.x = 0;        // 지붕 위에 기둥으로 세워서 지붕에 묻히지 않게
    [-2.1, 2.1].forEach(function (px) { var post = Toon.mesh(new THREE.BoxGeometry(0.18, 1.4, 0.18), 0x8a5a3a); post.position.set(px, 4.3, 3.2); Toon.outline(post, 0.1); h.add(post); }); h.add(board);
    [ch, chTop, shed, shedRoof, shedDoor, gear, board].forEach(function (o) { Toon.outline(o, 0.1); });
    var name = new THREE.Mesh(new THREE.PlaneGeometry(4.9, 1.05), new THREE.MeshBasicMaterial({
      map: textCanvas(512, 110, function (g) { g.fillStyle = "#fff3dc"; g.fillRect(0, 0, 512, 110); fat(g, "지우 공방", 256, 58, 78, NAVY, null); }) }));
    name.position.set(0, 0, 0.14); board.add(name);
    h.scale.setScalar(2.6); shop.add(h);
    // 굴뚝 연기 (작업 중인 공방 느낌)
    shop.userData.puffs = [];
    for (var i = 0; i < 3; i++) {
      var p = Toon.ball(1.1, Toon.mat(0xf4f4f4, { transparent: true, opacity: 0.8 })); p.userData.k = i / 3;
      shop.add(p); shop.userData.puffs.push(p);
    }
    // 앞마당 작업대
    bench = new THREE.Group();
    var top = Toon.mesh(new THREE.BoxGeometry(7, 0.4, 3), 0xc79a63); top.position.y = 2; bench.add(top);
    [[-3, -1.1], [3, -1.1], [-3, 1.1], [3, 1.1]].forEach(function (q) { var leg = Toon.mesh(new THREE.BoxGeometry(0.4, 2, 0.4), 0x8a5a3a); leg.position.set(q[0], 1, q[1]); bench.add(leg); });
    var box = Toon.mesh(new THREE.BoxGeometry(1.5, 0.9, 1), 0xd83a3a); box.position.set(-2.4, 2.65, -0.5); bench.add(box);                      // 공구 상자
    var grip = Toon.mesh(new THREE.TorusGeometry(0.35, 0.09, 6, 10, Math.PI), 0x39507a); grip.position.set(-2.4, 3.1, -0.5); bench.add(grip);
    var plan = Toon.mesh(new THREE.CylinderGeometry(0.22, 0.22, 2.1, 10), 0xa9dcf5); plan.rotation.z = Math.PI / 2; plan.rotation.y = 0.4; plan.position.set(2.3, 2.42, -0.6); bench.add(plan); // 설계도
    var crate = Toon.mesh(new THREE.BoxGeometry(2, 2, 2), 0xb98a55); crate.position.set(5.6, 1, -1.2); crate.rotation.y = 0.3; bench.add(crate);
    var crate2 = Toon.mesh(new THREE.BoxGeometry(1.4, 1.4, 1.4), 0xc79a63); crate2.position.set(5.9, 2.7, -1.3); crate2.rotation.y = -0.2; bench.add(crate2);
    Toon.outline(bench, 0.09);
    bench.position.set(0, 0, 14.5); shop.add(bench);
    shop.position.set(wx, gy, wz); Q.scene.add(shop);
    W.bench = new THREE.Vector3(wx, gy + 2.2, wz + 14.5);          // 작업대 윗면 가운데
    // 사람 자리: 지우(c)와 나르미 팀(t)이 마주 본다
    W.c = { x: wx - 6.5, z: wz + 20 }; W.t = { x: wx + 6.5, z: wz + 21 };
    jiwoo = window.People.stand(window.People.make("jiwoo"), W.c.x, W.c.z, Math.atan2(W.t.x - W.c.x, W.t.z - W.c.z), 1.25);
  }
  // 컷신 구도 (오프닝과 같은 요령: 두 사람을 잇는 선의 옆에서 본다)
  function cams() {
    var c = W.c, t = W.t, gy = W.y, mx = (c.x + t.x) / 2, mz = (c.z + t.z) / 2, dl = Math.hypot(t.x - c.x, t.z - c.z);
    var dx = (t.x - c.x) / dl, dz = (t.z - c.z) / dl, nx = -dz, nz = dx, b = W.bench;
    return {
      two: { pos: [mx + nx * 22, gy + 7, mz + nz * 22], look: [mx, gy + 4.4, mz - 2], fov: 46 },
      jiwoo: { pos: [c.x + nx * 16 + dx * 7, gy + 6.4, c.z + nz * 16 + dz * 7], look: [c.x, gy + 3.9, c.z], fov: 44 },
      team: { pos: [t.x + nx * 11 - dx * 6, gy + 5.5, t.z + nz * 11 - dz * 6], look: [t.x, gy + 4.2, t.z], fov: 42 },
      drone: { pos: [b.x + 3.5, b.y + 3.2, b.z + 9], look: [b.x, b.y + 1.2, b.z], fov: 38 },
      stamp: { pos: [b.x - 1.5, b.y + 4.5, b.z + 17], look: [b.x, b.y + 3.6, b.z], fov: 44 }
    };
  }

  // ---------- 드론 시제품 ----------
  function makeProto(ctx) {
    proto = ctx.drone(); proto.scale.setScalar(1.9);
    cone = new THREE.Mesh(new THREE.ConeGeometry(1.5, 4.2, 16, 1, true),                        // 아래를 살피는 청록 빛
      new THREE.MeshBasicMaterial({ color: TEAL, transparent: true, opacity: 0.35, depthWrite: false, side: THREE.DoubleSide }));
    cone.position.y = -2.3; cone.visible = false; proto.add(cone);
    tag = label("연기 발견!", 11); tag.visible = false; keep(tag);
    keep(proto); sitOnBench();
  }
  function sitOnBench() { mode = "bench"; proto.position.copy(W.bench).setY(W.bench.y + 0.55); proto.rotation.set(0, 0.5, 0); cone.visible = false; }
  function spin(o, dt, rate) { if (o) o.userData.rotors.forEach(function (r) { r.rotation.y += dt * rate; }); }

  // ---------- 시험용 연기 (작은 연기통에서 피어오르는 회색 구슬 기둥) ----------
  function makeSpot(p) {
    var x = p[0], z = p[1], y = ground(x, z), g = new THREE.Group(), puffs = [];
    var can = Toon.mesh(new THREE.CylinderGeometry(1, 1.15, 1.8, 12), 0xf08a3c); can.position.y = 0.9; g.add(can);
    var lid = Toon.mesh(new THREE.CylinderGeometry(0.7, 0.9, 0.4, 12), 0x555b66); lid.position.y = 2; g.add(lid);
    var pole = Toon.mesh(new THREE.CylinderGeometry(0.1, 0.1, 5, 6), 0xffffff); pole.position.set(1.6, 2.5, 0); g.add(pole);
    var flag = Toon.mesh(new THREE.BoxGeometry(2, 1.2, 0.1), 0xffd23f); flag.position.set(2.6, 4.3, 0); g.add(flag);
    Toon.outline(g, 0.1);
    for (var i = 0; i < 6; i++) {
      var m = new THREE.Mesh(new THREE.SphereGeometry(1.5, 12, 9), new THREE.MeshToonMaterial({ color: 0x9a9ca6, gradientMap: Toon.ramp, transparent: true, opacity: 0.8 }));
      m.userData.k = i / 6; g.add(m); puffs.push(m);
    }
    var ring = new THREE.Mesh(new THREE.TorusGeometry(5, 0.35, 8, 28), new THREE.MeshBasicMaterial({ color: TEAL, transparent: true, opacity: 0.85, depthWrite: false }));
    ring.rotation.x = Math.PI / 2; ring.position.y = 1.2; ring.visible = false; g.add(ring);
    var mark = label("발견!", 9); mark.position.y = 13; mark.visible = false; g.add(mark);
    g.position.set(x, y, z); keep(g);
    return { x: x, y: y, z: z, g: g, puffs: puffs, ring: ring, mark: mark, found: false, fade: 1 };
  }
  function nearestSpot(pos) {
    var best = null, bd = 1e9;
    spots.forEach(function (s) { if (s.found) return; var d = Math.hypot(pos.x - s.x, pos.z - s.z); if (d < bd) { bd = d; best = s; } });
    return best;
  }
  function aimNext(ctx) {
    var s = nearestSpot(ctx.flight.pos);
    if (s) ctx.setTarget(s.x, s.y + 26, s.z);
  }

  // ---------- "혁신제품" 도장 ----------
  function makeStamp() {
    var g = new THREE.Group();
    var coin = Toon.mesh(new THREE.CylinderGeometry(3.3, 3.3, 0.5, 36), 0xffd23f); coin.rotation.x = Math.PI / 2; g.add(coin);
    var grip = Toon.mesh(new THREE.CylinderGeometry(0.7, 1.1, 1.6, 14), 0xd83a3a); grip.position.y = 4; g.add(grip);
    var knob = Toon.ball(1.05, 0xd83a3a); knob.position.y = 5.2; g.add(knob);
    Toon.outline(g, 0.12);
    var tex = textCanvas(512, 512, function (c) {
      c.fillStyle = YELLOW; c.beginPath(); c.arc(256, 256, 250, 0, Math.PI * 2); c.fill();
      c.strokeStyle = NAVY; c.lineWidth = 22; c.beginPath(); c.arc(256, 256, 232, 0, Math.PI * 2); c.stroke();
      c.lineWidth = 6; c.beginPath(); c.arc(256, 256, 204, 0, Math.PI * 2); c.stroke();
      fat(c, "★ 조달청 지정 ★", 256, 140, 44, NAVY, null);
      fat(c, "혁신제품", 256, 262, 112, NAVY, null);
      fat(c, "첫 번째 손님", 256, 378, 46, "#d83a3a", null);
    });
    [1, -1].forEach(function (side) {
      var face = new THREE.Mesh(new THREE.CircleGeometry(3.12, 40), new THREE.MeshBasicMaterial({ map: tex }));
      face.position.z = side * 0.27; if (side < 0) face.rotation.y = Math.PI; face.userData.noInk = true; g.add(face);
    });
    g.userData.grip = [grip, knob];
    return g;
  }
  function stampHome() { return tmp.set(W.bench.x, W.bench.y + 5.1, W.bench.z - 0.5); }       // 드론 바로 위에 내려앉은 자리
  function landStamp(ctx, quiet) {
    if (stampHit) return; stampHit = true;
    stamp.position.copy(stampHome()); stamp.scale.set(1.25, 0.7, 1);
    if (quiet) return;
    window.Sound.fx.stamp(); ctx.flight.shake(0.5); ctx.team.cheer();
    ctx.burst(stamp.position.clone(), 0xffd23f); ctx.toast("혁신제품 지정!", 2000);
  }

  // ---------- 컷신 ----------
  function meet(ctx) {
    phase = "meet"; ctx.setTarget(null); beam.visible = false; ctx.objective("");
    var P = window.People, C = cams(), f = ctx.flight;
    f.park(W.t.x, W.t.z, Math.atan2(W.c.x - W.t.x, W.c.z - W.t.z));
    jiwoo.userData.restMood = "sad"; P.setMood(jiwoo, "sad");
    window.Story.shot(C.two.pos, C.two.look, C.two.fov, true);
    window.Story.play([
      { who: jiwoo, mood: "sad", cam: C.drone, text: "연기를 스스로 찾아내는 드론을 만들었어요.\n산불을 일찍 알려 줄 수 있는데…" },
      { who: jiwoo, mood: "sad", cam: C.jiwoo, text: "다들 \"써 본 곳이 있나요?\" 하고 물어요.\n써 본 곳이 없다고 아무도 안 사 줘요." },
      { who: "narmi", cam: C.team, text: "그럼 조달청이 먼저 써 볼게요.\n좋은 제품이면 첫 번째 손님이 되어 줄게요!" },
      { who: jiwoo, mood: "cheer", cam: C.two, text: "정말요? 숲 세 곳에 시험용 연기를 피워 둘게요.\n드론을 데리고 가 주세요!", on: function () { jiwoo.userData.restMood = "idle"; mode = "lift"; } }
    ], function () {
      jiwoo.userData.restMood = "wave"; P.setMood(jiwoo, "wave");
      window.Story.free();
      spots = SPOTS.map(makeSpot);
      var s = nearestSpot(f.pos);
      f.takeoff(Math.atan2(s.x - f.pos.x, s.z - f.pos.z), 24);
      phase = "test"; mode = "follow"; testTime = 0; found = 0; said = 0;
      proto.position.set(f.pos.x, f.pos.y, f.pos.z);
      aimNext(ctx);
      ctx.objective("드론을 시험용 연기 가까이 데려가세요 (0/3)");
      
      ctx.say("narmi", "우리는 드론을 연기 근처까지만 데려가면 돼. 찾는 건 드론이 스스로 할 거야.");
    });
  }
  function award(ctx) {
    phase = "award"; ctx.setTarget(null); beam.visible = false; ctx.objective("");
    var P = window.People, C = cams(), f = ctx.flight;
    f.park(W.t.x, W.t.z, Math.atan2(W.c.x - W.t.x, W.c.z - W.t.z));
    sitOnBench(); tag.visible = false;
    jiwoo.userData.restMood = "idle"; P.setMood(jiwoo, "idle");
    stamp = makeStamp(); stamp.visible = false; Q.scene.add(stamp); stampT = -1; stampHit = false; plaqueK = 0;
    window.Story.shot(C.two.pos, C.two.look, C.two.fov, true);
    window.Story.play([
      { who: "narmi", cam: C.stamp, text: "시험 통과! 조달청이 '혁신제품'으로 지정하고,\n먼저 사서 소방서가 써 보게 할게.", on: function () { stampT = 0; stamp.visible = true; stamp.position.copy(stampHome()).y += 34; } },
      { who: jiwoo, mood: "cheer", cam: C.jiwoo, text: "우아, 첫 손님이 생겼어요!\n이제 \"써 본 곳\"이 생겼으니 더 널리 알릴 수 있어요!", on: function () { jiwoo.userData.restMood = "cheer"; } },
    ], function () {
      stamp.visible = true; landStamp(ctx, true); stamp.scale.set(1, 1, 1);
      jiwoo.userData.restMood = "wave"; P.setMood(jiwoo, "wave");
      window.Story.free();
      drop(proto);                                                 // 시제품은 나르미가 싣고 간다
      if (!carried) { carried = ctx.drone(); carried.scale.setScalar(1.1); carried.position.set(0, -1.2, -0.75); ctx.team.narmi.add(carried); }
      f.takeoff(Math.atan2(100 - f.pos.x, 40 - f.pos.z), 26);      // 다음 장(나라장터) 쪽으로
      plaque = stamp; stamp = null;                                // 도장은 공방 벽의 인증 마크로 남는다
      phase = "end"; endWait = 3;
      ctx.objective("AI 산불감시 드론, 혁신제품 지정! 조달청이 첫 번째 손님이에요");
    });
  }

  // ---------- 매 프레임 움직임 ----------
  function moveDrone(dt, t, ctx) {
    if (!proto || !proto.parent) return;
    var f = ctx.flight, pos = f.pos;
    if (mode === "bench") return;
    spin(proto, dt, 40);
    if (mode === "lift") {                                         // 작업대에서 살짝 떠오른다
      proto.position.y = Q.lerp(proto.position.y, W.bench.y + 2.6 + Math.sin(t * 4) * 0.15, Math.min(1, dt * 3)); return;
    }
    if (mode === "follow") {                                       // 나르미 오른쪽 앞에서 따라 난다
      var yaw = f.yaw(), sx = Math.sin(yaw), cz = Math.cos(yaw), ahead = 4 + f.speed() / 5;
      to.set(pos.x - cz * 6.5 + sx * ahead, pos.y + 1.2 + Math.sin(t * 3) * 0.4, pos.z + sx * 6.5 + cz * ahead);
      proto.position.lerp(to, Math.min(1, dt * 5)); proto.rotation.set(0, yaw, 0);
      var s = phase === "test" ? nearestSpot(pos) : null;
      if (s && Math.hypot(pos.x - s.x, pos.z - s.z) < SEEK_R) {     // 연기를 느낀 드론이 스스로 날아간다
        mode = "seek"; seek = s; seekT = 0; from.copy(proto.position);
        
      }
      return;
    }
    if (mode === "seek") {
      seekT += dt; var k = Math.min(1, seekT / 1.1), e = k * k;       // 점점 빨라지며 빨려 가듯
      to.set(seek.x, seek.y + 14, seek.z);
      proto.position.lerpVectors(from, to, e); proto.position.y += Math.sin(k * Math.PI) * 3;
      proto.rotation.y = Math.atan2(seek.x - from.x, seek.z - from.z);
      if (k >= 1) {
        mode = "hover"; seekT = 0; cone.visible = true;
        seek.found = true; found++;
        ctx.burst(new THREE.Vector3(seek.x, seek.y + 9, seek.z), TEAL);
        window.Sound.fx.star(); ctx.team.cheer();
        tag.visible = true; tagT = 1.8;
        seek.ring.visible = true; seek.mark.visible = true;
        ctx.objective("드론을 시험용 연기 가까이 데려가세요 (" + found + "/3)");
        if (found >= spots.length) {
          phase = "back"; beam.visible = true; ctx.setTarget(W.x, W.y + 28, W.z);
          ctx.objective("시험 성공! 공방으로 돌아가 지우에게 알려 주세요");
          ctx.say("dari", "세 곳 모두 성공! 어서 지우한테 알려 주자.");
        } else aimNext(ctx);
      }
      return;
    }
    if (mode === "hover") {                                        // 연기 위를 한 바퀴 돌며 살핀다
      seekT += dt; var a = seekT * 5;
      proto.position.set(seek.x + Math.sin(a) * 3, seek.y + 14 + Math.sin(seekT * 6) * 0.4, seek.z + Math.cos(a) * 3);
      proto.rotation.y = a + Math.PI / 2; cone.material.opacity = 0.3 + Math.sin(seekT * 18) * 0.12;
      if (seekT > 0.9) { mode = "follow"; cone.visible = false; }
    }
  }
  function moveSmoke(dt, t) {
    spots.forEach(function (s) {
      if (s.found) { s.fade = Math.max(0, s.fade - dt * 0.9); s.ring.scale.setScalar(1 + Math.sin(t * 5) * 0.08); s.mark.position.y = 13 + Math.sin(t * 3) * 0.5; }
      s.puffs.forEach(function (p) {
        p.userData.k = (p.userData.k + dt * 0.22) % 1; var k = p.userData.k;
        p.position.set(Math.sin(k * 7 + t + s.x) * 1.6 * k, 2.4 + k * 20, Math.cos(k * 5 + t) * 1.2 * k);
        p.scale.setScalar(0.6 + k * 1.3); p.material.opacity = 0.8 * (1 - k * 0.75) * s.fade; p.visible = s.fade > 0.02;
      });
    });
  }
  function moveShop(dt, t) {
    if (!shop) return;
    shop.userData.gear.rotation.z += dt * 0.6;
    shop.userData.puffs.forEach(function (p) {
      p.userData.k = (p.userData.k + dt * 0.16) % 1; var k = p.userData.k;
      p.position.set(2.7 * 2.6 + Math.sin(k * 6 + t) * 1.2 * k, 7.4 * 2.6 + k * 11, -2.6 + k * 2); p.scale.setScalar(0.5 + k * 1.1);
    });
    if (beam && beam.visible) beam.material.opacity = 0.3 + Math.sin(t * 4) * 0.1;
    if (tag && tag.visible) { tagT -= dt; tag.position.copy(proto.position); tag.position.y += 4.2; if (tagT <= 0) tag.visible = false; }
  }
  function moveStamp(dt, ctx) {
    if (stamp && stampT >= 0) {                                    // 쿵! 떨어져 내려앉는다
      stampT += dt;
      if (!stampHit) {
        var k = Math.min(1, stampT / 0.5); stamp.position.copy(stampHome()); stamp.position.y += 34 * (1 - k * k); stamp.rotation.z = (1 - k) * 0.5;
        if (k >= 1) { stamp.rotation.z = 0; landStamp(ctx); }
      } else {
        stamp.scale.x = Q.lerp(stamp.scale.x, 1, Math.min(1, dt * 9)); stamp.scale.y = Q.lerp(stamp.scale.y, 1, Math.min(1, dt * 9));
      }
    }
    if (plaque && plaqueK < 1) {                                   // 공방 벽에 인증 마크로 걸린다
      plaqueK = Math.min(1, plaqueK + dt * 1.2); var e = plaqueK * plaqueK * (3 - 2 * plaqueK);
      to.set(W.x + 9.4, W.y + 5.3, W.z + 7.75); plaque.position.lerp(to, e); plaque.rotation.z = 0;
      plaque.scale.setScalar(Q.lerp(1, 0.56, e));
      plaque.userData.grip.forEach(function (o) { o.visible = plaqueK < 0.5; });
    }
  }

  window.Chapters.find = {
    start: function (ctx) {
      if (!shop) buildShop();
      temps.forEach(drop); temps = []; spots = [];
      drop(stamp); stamp = null; drop(plaque); plaque = null; drop(carried); carried = null;
      phase = "go"; found = 0; testTime = 0; endWait = 0; said = 0; stampT = -1; stampHit = false; plaqueK = 0; seek = null;
      jiwoo.userData.restMood = "sad"; window.People.setMood(jiwoo, "sad");
      makeProto(ctx);
      beam = keep(ctx.beam(W.x, W.z, 0xffe066));
      ctx.setTarget(W.x, W.y + 28, W.z);
      ctx.objective("지우의 공방으로 가세요");
    },
    update: function (dt, t, ctx) {
      var pos = ctx.flight.pos;
      moveShop(dt, t); moveDrone(dt, t, ctx); moveSmoke(dt, t); moveStamp(dt, ctx);
      if (phase === "go") {
        if (!said && Math.hypot(pos.x - W.x, pos.z - W.z) < 230) { said = 1; ctx.say("dari", "저기 톱니 간판이 달린 집! 발명가 지우의 공방이야."); }
        if (Math.hypot(pos.x - W.x, pos.z - W.z) < ARRIVE_R) meet(ctx);
      } else if (phase === "test") {
        testTime += dt;
      } else if (phase === "back") {
        if (mode === "follow" && Math.hypot(pos.x - W.x, pos.z - W.z) < ARRIVE_R) award(ctx);
      } else if (phase === "end") {
        spin(carried, dt, 40); endWait -= dt;
        // 시험 비행이 60초를 넘으면 초당 1점씩 깎인다 (최저 50)
        if (endWait <= 0) return Q.clamp(100 - Math.max(0, testTime - 60), 50, 100);
      }
    },
    cleanup: function () {
      temps.forEach(drop); temps = []; spots = []; beam = null; proto = null; cone = null; tag = null;
      drop(stamp); stamp = null;
      if (plaque && shop) { plaqueK = 1; plaque.position.set(W.x + 9.4, W.y + 5.3, W.z + 7.75); plaque.scale.setScalar(0.56); plaque.userData.grip.forEach(function (o) { o.visible = false; }); }
      window.Story.pick(null); window.Story.free();
      // 공방, 지우, 벽의 혁신제품 마크는 풍경으로 남긴다
    },
    auto: function () { /* 클릭 장면 없음: 컷신은 봇이 넘기고, 비행은 setTarget을 따라간다 */ },
    carried: function () { return carried; },     // 5장이 쓴다: 나르미가 싣고 가는 드론
    jiwoo: function () { return jiwoo; },         // 에필로그용: 지우 모델
    workshop: function () { return W ? { x: W.x, z: W.z, yard: W.t } : null; }
  };
})();
