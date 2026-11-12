// 3장 비축물자 긴급 방출: 비축기지에서 금속(알루미늄·구리·니켈·아연·주석)을 2개씩 싣고, 멈춘 공장 5곳 위를 지나가며 떨어뜨린다
// 정책: 공공비축 — 조달청은 비철금속을 비축해 두었다가 값이 뛰거나 구하기 어려울 때 기업에 공급한다
(function () {
  "use strict";
  var Q = window.Q, THREE = Q.THREE, Toon = window.Toon, World = window.World;
  window.Chapters = window.Chapters || {};

  var DEPOT = { x: -116, z: 130 };                                  // 비축기지 (안내의 (-110,120)에서 소나무를 피해 12쯤 옮김)
  var SITES = [[-50, -20], [-60, 40], [-52, 170], [-50, 249], [-35, 320]];   // 공장 5곳: 강 서쪽 평지를 따라 남북으로 (서로 60 이상)
  var ROOFS = [0xf2a33c, 0xe2574c, 0x2f8fd0, 0x3fae6a, 0x8a63d2];                       // 가동 중 지붕 색
  var METALS = [{ name: "알루미늄", color: 0xdfe7ee }, { name: "구리", color: 0xe0854a }, { name: "니켈", color: 0xd8d2b0 }, { name: "아연", color: 0xa9bfd6 }, { name: "주석", color: 0xf0ead8 }];
  var LIMIT = 55, LOAD_R = 30, DROP_R = 28, FALL_T = 1.6, F_SCALE = 1.35;
  var PER_TRIP = 5;                                                 // 한 번에 다 싣고 공장 다섯 곳을 차례로 지나간다
  var N = SITES.length;
  var FONT = "'Jua','Noto Sans KR','Malgun Gothic','Apple SD Gothic Neo',sans-serif";

  // 풍경으로 남는 것 (한 번만 만든다)
  var built = false, depot = null, factories = [];
  // 장이 도는 동안만 있는 것
  var temp = [], falling = [], carry = null, carryPop = 0, depotBeam = null;
  var loaded = false, held = 0, nSent = 0, nAlive = 0, time = 0, done = false, doneWait = 0, hintCool = 0, lateSaid = false;
  var gaugeCv = null, gaugeTex = null, gaugeClock = 0;

  // ---------- 만들기 도우미 ----------
  function own(color) { return new THREE.MeshToonMaterial({ color: color, gradientMap: Toon.ramp }); }   // 색을 바꿀 재질은 따로 만든다
  function rod(ax, ay, az, bx, by, bz, r, color) {
    var a = new THREE.Vector3(ax, ay, az), d = new THREE.Vector3(bx, by, bz).sub(a), len = d.length();
    var m = Toon.mesh(new THREE.CylinderGeometry(r, r, len, 6), color);
    m.position.copy(a).addScaledVector(d, 0.5);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
    return m;
  }
  function rr(c, x, y, w, h, r) {
    c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
  }
  // 글자 팻말 (Sprite): 굵은 글씨 + 남색 테두리
  function label(text, bg, fg, width) {
    var cv = document.createElement("canvas"); cv.width = 256; cv.height = 128;
    var c = cv.getContext("2d"), size = 72;
    rr(c, 8, 8, 240, 112, 30); c.fillStyle = bg; c.fill(); c.lineWidth = 10; c.strokeStyle = "#1b2a5c"; c.stroke();
    c.textAlign = "center"; c.textBaseline = "middle"; c.lineJoin = "round";
    do { c.font = "900 " + size + "px " + FONT; size -= 4; } while (size > 24 && c.measureText(text).width > 204);
    c.lineWidth = 12; c.strokeStyle = "#1b2a5c"; c.strokeText(text, 128, 68); c.fillStyle = fg; c.fillText(text, 128, 68);
    var tex = new THREE.CanvasTexture(cv); tex.encoding = THREE.sRGBEncoding;
    var s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
    s.scale.set(width, width / 2, 1); return s;
  }
  // 남은 시간 막대 (공장들이 같은 그림을 함께 쓴다)
  function drawGauge(rem, blink) {
    var c = gaugeCv.getContext("2d"); c.clearRect(0, 0, 256, 48);
    rr(c, 3, 3, 250, 42, 20); c.fillStyle = "#1b2a5c"; c.fill();
    rr(c, 12, 12, 232, 24, 12); c.fillStyle = blink ? "#ff9a8a" : "#ffffff"; c.fill();
    if (rem > 0.01) {
      rr(c, 12, 12, Math.max(26, 232 * rem), 24, 12);
      c.fillStyle = rem > 0.5 ? "#4cd964" : rem > 0.25 ? "#ffd23f" : "#ff6b4a"; c.fill();
    }
    gaugeTex.needsUpdate = true;
  }
  // 땅이 기울어도 건물이 반듯하게 서도록 받치는 단
  function baseTop(pts, mix) {
    var hi = -1e9, lo = 1e9;
    pts.forEach(function (p) { var h = World.height(p[0], p[1]); if (h > hi) hi = h; if (h < lo) lo = h; });
    return { top: Q.lerp(lo, hi, mix) + 0.4, bottom: lo - 1.5 };   // 높은 쪽은 언덕에 살짝 묻힌다
  }
  // 비축기지 받침: 앞마당(동쪽 절반) 높이에 맞추고, 창고 뒤쪽은 언덕에 기대게 둔다
  function slab(cx, cz, w, d) {
    var pts = [], i, j;
    for (i = 0; i <= 2; i++) for (j = -1; j <= 1; j++) pts.push([cx - 2 + i * (w / 4 + 1), cz + j * d / 2]);
    var b = baseTop(pts, 0.85), m = Toon.mesh(new THREE.BoxGeometry(w, b.top - b.bottom, d), 0xcfc8b8);
    m.position.set(cx, (b.top + b.bottom) / 2, cz); Toon.outline(m, 0.2); Q.scene.add(m); return b.top;
  }
  function pad(cx, cz, r) {
    var pts = [[cx, cz]], i;
    for (i = 0; i < 10; i++) pts.push([cx + Math.cos(i * 0.628) * r, cz + Math.sin(i * 0.628) * r]);
    var b = baseTop(pts, 0.6), m = Toon.mesh(new THREE.CylinderGeometry(r, r + 1.2, b.top - b.bottom, 24), 0xcfc8b8);
    m.position.set(cx, (b.top + b.bottom) / 2, cz); Toon.outline(m, 0.2); Q.scene.add(m); return b.top;
  }
  // 금속 상자: 금속 빛 몸통 + 남색 띠
  function crate(color, s) {
    var g = new THREE.Group();
    g.add(Toon.mesh(new THREE.BoxGeometry(s, s, s), color));
    g.add(Toon.mesh(new THREE.BoxGeometry(s * 1.05, s * 0.16, s * 1.05), 0x39507a));
    g.add(Toon.mesh(new THREE.BoxGeometry(s * 0.16, s * 1.05, s * 1.05), 0x39507a));
    return g;
  }
  // 금속 덩이(잉곳) 더미: 3 · 2 · 1 로 쌓는다
  function pile(color) {
    var g = new THREE.Group(), l, j, n, bar;
    for (l = 0; l < 3; l++) for (n = 3 - l, j = 0; j < n; j++) {
      bar = Toon.mesh(new THREE.BoxGeometry(3.4, 0.9, 1.25), color);
      bar.position.set(0, 0.45 + l * 0.9, (j - (n - 1) / 2) * 1.4); g.add(bar);
    }
    return g;
  }

  // ---------- 비축기지 ----------
  function buildDepot() {
    var top = slab(DEPOT.x, DEPOT.z, 28, 40), g = new THREE.Group();
    var body = Toon.mesh(new THREE.BoxGeometry(28, 8, 14), 0xf6f1e4); body.position.set(-3, 4, -5); g.add(body);
    var band = Toon.mesh(new THREE.BoxGeometry(28.3, 1.3, 14.3), 0xffd23f); band.position.set(-3, 6.9, -5); g.add(band);
    // 둥근 지붕 (반원통을 눕혀서 납작하게)
    var roof = Toon.mesh(new THREE.CylinderGeometry(7.5, 7.5, 29, 18, 1, false, 0, Math.PI), 0x2f6fb5);
    roof.rotation.z = Math.PI / 2; roof.scale.x = 0.6; roof.position.set(-3, 8, -5); g.add(roof);
    [-10, -3, 4].forEach(function (x) {
      var door = Toon.mesh(new THREE.BoxGeometry(5, 5.4, 0.4), 0x39507a); door.position.set(x, 2.7, 2.1); g.add(door);
      var bar = Toon.mesh(new THREE.BoxGeometry(4.2, 0.35, 0.2), 0x8fb4e0); bar.position.set(x, 3.6, 2.35); bar.userData.noInk = true; g.add(bar);
    });
    // 앞마당: 금속 덩이 더미 셋 + 상자
    METALS.forEach(function (m, i) { var p = pile(m.color); p.position.set(-13.5 + i * 5, 0, 8.5); g.add(p); });
    var c1 = crate(0xdfe7ee, 2.6); c1.position.set(13.5, 1.3, 2.5); g.add(c1);
    var c2 = crate(0xe0854a, 2.2); c2.position.set(14, 1.1, 5.6); c2.rotation.y = 0.4; g.add(c2);
    // 깃발
    g.add(rod(16.5, 0, 9, 16.5, 14, 9, 0.22, 0xf2f2f2));
    var knob = Toon.ball(0.45, 0xffd23f); knob.position.set(16.5, 14.2, 9); g.add(knob);
    var flag = new THREE.Group(); flag.position.set(16.5, 12, 9); g.add(flag);
    var cloth = Toon.mesh(new THREE.BoxGeometry(5, 3, 0.16), 0x2f6fb5); cloth.position.x = 2.5; flag.add(cloth);
    var dot = Toon.mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.24, 16), 0xffffff); dot.rotation.x = Math.PI / 2; dot.position.x = 2.5; dot.userData.noInk = true; flag.add(dot);
    Toon.outline(g, 0.2);
    var sign = label("비축기지", "#2f6fb5", "#ffd23f", 15); sign.position.set(-3, 18, -5); g.add(sign);
    g.position.set(DEPOT.x, top, DEPOT.z + 2); g.rotation.y = Math.PI / 2;       // 문과 앞마당이 강 쪽(동쪽)을 보게
    Q.scene.add(g);
    return { g: g, y: top, flag: flag };
  }

  // ---------- 공장 ----------
  function buildFactory(x, z, i) {
    var top = pad(x, z, 14), g = new THREE.Group(), mats = [];
    function M(dead, live, glow) { var m = own(dead); mats.push({ m: m, dead: new THREE.Color(dead), live: new THREE.Color(live), glow: !!glow }); return m; }
    var wallM = M(0xbfc3c9, 0xfff0d2), roofM = M(0x8d929b, ROOFS[i]), chimM = M(0x9da1a8, 0xd9623c),
        winM = M(0x5e636e, 0xffe27a, true), trimM = M(0x7c8089, 0x39507a), bandM = M(0xd0d3d8, 0xffffff), gearM = M(0xa3a7ae, 0xffd23f);
    var hall = Toon.mesh(new THREE.BoxGeometry(12, 6.5, 9), wallM); hall.position.set(-2, 3.25, 0); g.add(hall);
    [-6, -2, 2].forEach(function (px) {                                       // 톱니 지붕
      var p = Toon.mesh(new THREE.CylinderGeometry(2.31, 2.31, 9.4, 3), roofM); p.rotation.x = -Math.PI / 2; p.position.set(px, 6.5 + 1.155, 0); g.add(p);
    });
    var annex = Toon.mesh(new THREE.BoxGeometry(5, 4.5, 7), wallM); annex.position.set(6.5, 2.25, 0); g.add(annex);
    var aroof = Toon.mesh(new THREE.BoxGeometry(5.6, 0.6, 7.6), trimM); aroof.position.set(6.5, 4.8, 0); g.add(aroof);
    var chim = Toon.mesh(new THREE.CylinderGeometry(1.0, 1.35, 9, 12), chimM); chim.position.set(6.5, 9.6, 0); g.add(chim);
    var ringB = Toon.mesh(new THREE.CylinderGeometry(1.2, 1.25, 0.9, 12), bandM); ringB.position.set(6.5, 12.7, 0); g.add(ringB);
    var door = Toon.mesh(new THREE.BoxGeometry(2.8, 3.6, 0.3), trimM); door.position.set(-2, 1.8, 4.6); g.add(door);
    [[-6, 3.6, 4.6], [2, 3.6, 4.6], [6.5, 2.6, 3.6]].forEach(function (p) {
      var w = Toon.mesh(new THREE.BoxGeometry(1.9, 1.6, 0.3), winM); w.position.set(p[0], p[1], p[2]); g.add(w);
    });
    var gear = Toon.mesh(new THREE.TorusGeometry(0.85, 0.3, 6, 8), gearM); gear.position.set(-2, 5.1, 4.65); g.add(gear);
    Toon.outline(g, 0.16);
    g.position.set(x, top, z); g.rotation.y = 0.3 + i * 0.9; g.scale.setScalar(F_SCALE);
    Q.scene.add(g); g.updateMatrixWorld(true);
    var smokeAt = g.localToWorld(new THREE.Vector3(6.5, 14.4, 0));
    // 굴뚝 연기 구슬 (가동 중일 때만 보인다)
    var puffs = [], j, p;
    for (j = 0; j < 5; j++) {
      p = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 9), new THREE.MeshToonMaterial({ color: 0xffffff, gradientMap: Toon.ramp, transparent: true, opacity: 0.9, emissive: 0x9aa6bb, emissiveIntensity: 0.3 }));
      p.userData.k = j / 5; p.visible = false; Q.scene.add(p); puffs.push(p);
    }
    return { x: x, z: z, y: top, g: g, mats: mats, k: 0, alive: false, sent: false, hop: 0, metal: null, smokeAt: smokeAt, puffs: puffs, gear: gear,
             ring: null, sign: null, gauge: null, beam: null, ok: null };
  }
  function paint(f) {
    f.mats.forEach(function (o) {
      o.m.color.copy(o.dead).lerp(o.live, f.k);
      if (o.glow) o.m.emissive.copy(o.live).multiplyScalar(0.45 * f.k);
    });
  }
  // 풍경 움직임: 장이 끝난 뒤에도 깃발이 날리고 살아난 공장은 연기를 낸다
  function ambient(dt, t) {
    depot.flag.rotation.y = Math.sin(t * 5) * 0.28;
    factories.forEach(function (f, i) {
      var want = f.alive ? 1 : 0;
      if (f.k !== want) { f.k = want > f.k ? Math.min(want, f.k + dt * 1.6) : Math.max(want, f.k - dt * 4); paint(f); }
      if (f.hop > 0) { f.hop = Math.max(0, f.hop - dt); f.g.scale.setScalar(F_SCALE * (1 + Math.sin(f.hop * 13) * 0.09 * f.hop)); }
      if (f.alive) f.gear.rotation.z -= dt * 1.5;
      f.puffs.forEach(function (p, j) {
        p.visible = f.alive; if (!f.alive) return;
        p.userData.k = (p.userData.k + dt * 0.22) % 1; var k = p.userData.k;
        p.position.set(f.smokeAt.x + Math.sin(k * 5 + t + j + i) * 1.6 * k, f.smokeAt.y + k * 20, f.smokeAt.z + Math.cos(k * 4 + j) * 1.6 * k);
        p.scale.setScalar(0.9 + k * 2.4); p.material.opacity = 0.92 * (1 - k * k);
      });
    });
  }

  // ---------- 나르미가 싣고 가는 상자 ----------
  function buildCarry(first, count) {
    var g = new THREE.Group(), list = [];
    var plank = Toon.mesh(new THREE.BoxGeometry(2.15, 0.1, 0.74), 0x9a6a44); plank.position.set(0, -1.95, -0.95); g.add(plank);
    [-1, 1].forEach(function (s) { g.add(rod(s * 0.35, -0.85, -0.9, s * 0.98, -1.92, -0.95, 0.035, 0x7a4a2a)); });
    METALS.forEach(function (m, i) {
      if (i < first || i >= first + count) return;
      var c = crate(m.color, 0.52); c.position.set((i - first - (count - 1) / 2) * 0.68, -1.64, -0.95); g.add(c); list[i] = c;
    });
    Toon.outline(g, 0.05); g.userData.crates = list; return g;
  }
  // 낙하산 달린 상자
  function chuteBox(color) {
    var g = new THREE.Group(), chute = new THREE.Group();
    g.add(crate(color, 2.4));
    var can = Toon.mesh(new THREE.SphereGeometry(3, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), Toon.mat(0xff8a3c, { side: THREE.DoubleSide }));
    can.scale.y = 0.8; can.position.y = 3.8; chute.add(can);
    var tip = Toon.ball(0.45, 0xffffff); tip.position.y = 6.3; chute.add(tip);
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (p) { chute.add(rod(p[0] * 1.1, 1.2, p[1] * 1.1, p[0] * 2.1, 3.8, p[1] * 2.1, 0.06, 0xffffff)); });
    g.add(chute); Toon.outline(g, 0.12); g.userData.chute = chute; return g;
  }

  // ---------- 진행 ----------
  function keep(o) { Q.scene.add(o); temp.push(o); return o; }
  function gone(o) { if (o) Q.scene.remove(o); }
  function clearTemp() {
    temp.forEach(function (o) { Q.scene.remove(o); if (o.isSprite && o.material.map) { o.material.map.dispose(); o.material.dispose(); } });
    falling.forEach(function (o) { Q.scene.remove(o.g); });
    if (carry && carry.parent) carry.parent.remove(carry);
    temp = []; falling = []; carry = null; depotBeam = null;
    factories.forEach(function (f) { f.ring = f.sign = f.gauge = f.beam = f.ok = null; });
  }
  function aim(ctx) {
    if (!loaded) { ctx.setTarget(DEPOT.x, depot.y + 30, DEPOT.z); return; }
    var pos = ctx.flight.pos, best = null, bd = 1e9;
    factories.forEach(function (f) { if (!f.sent) { var d = Math.hypot(pos.x - f.x, pos.z - f.z); if (d < bd) { bd = d; best = f; } } });
    if (best) ctx.setTarget(best.x, best.y + 36, best.z); else ctx.setTarget(null);
  }
  function drop(f, ctx) {
    var metal = METALS[nSent], c = carry.userData.crates[nSent], pos = ctx.flight.pos;
    if (c && c.parent) c.parent.remove(c);
    f.sent = true; f.metal = metal; nSent++; held--;
    gone(f.beam);
    var g = chuteBox(metal.color); g.position.set(pos.x, pos.y - 3, pos.z); g.scale.setScalar(0.3); Q.scene.add(g);
    falling.push({ g: g, f: f, t: 0, from: g.position.clone(), to: new THREE.Vector3(f.x, f.y + 10.5, f.z) });
    window.Sound.fx.star();
    if (held <= 0) {                                                 // 다 내렸으면 받침도 치운다
      if (carry.parent) carry.parent.remove(carry);
      carry = null;
      if (nSent < METALS.length) {                                   // 아직 남았으면 기지로 돌아가 더 싣는다
        loaded = false; depotBeam = ctx.beam(DEPOT.x, DEPOT.z, 0x66d9ff); temp.push(depotBeam);
        ctx.objective("비축기지로 돌아가 금속을 더 실어요 (" + nAlive + "/" + N + ")");
      }
    }
    aim(ctx);
  }
  function land(o, ctx) {
    var f = o.f; Q.scene.remove(o.g);
    f.alive = true; f.hop = 1; nAlive++;
    gone(f.ring); gone(f.sign); gone(f.gauge);
    f.ok = keep(label("가동!", "#3fae6a", "#ffffff", 12)); f.ok.position.set(f.x, f.y + 27, f.z); f.ok.userData.born = 0;
    ctx.burst(o.to.clone(), 0x9cf0a8); ctx.burst(new THREE.Vector3(f.x, f.y + 20, f.z), 0xffffff);
    window.Sound.fx.good(); ctx.team.cheer();
    ctx.toast(f.metal.name + " 도착! 공장 가동 " + nAlive + "/" + N, 1600);
    if (nAlive >= factories.length) {
      done = true; doneWait = 2; ctx.setTarget(null);
      if (manager) { manager.userData.restMood = "cheer"; window.People.setMood(manager, "cheer"); }
      if (ctx.say) ctx.say("dari", "공장이 다시 돌아가! 공장장님이 손을 흔들어.");
      ctx.objective("공장 " + N + "곳 모두 가동! 비축해 둔 금속이 위기를 막았어요");
    } else if (loaded) ctx.objective("멈춘 공장 위를 지나가면 금속이 떨어져요 (" + nAlive + "/" + N + ")");
  }

  // 시작 컷신: 멈춘 공장 앞에서 공장장이 사정을 말한다 (왜 비축이 필요한지 먼저 보여 준다)
  var manager = null, intro = false;
  function introScene(ctx) {
    // 내려앉지 않고 날면서 사정을 듣는다 (2장이 땅에서 끝난 바로 뒤라 또 내리면 흐름이 끊긴다)
    if (window.People) {
      var P = window.People, fa = factories[1], cx = fa.x + 19, cz = fa.z + 3;
      if (!manager) manager = P.stand(P.make("manager"), cx, cz, -0.6, 1.25);
      manager.userData.restMood = "sad"; P.setMood(manager, "sad");
    }
    intro = false;
    if (ctx.say) {
      ctx.say("dari", "공장장님 연락이야! 알루미늄 값이 두 배로 뛰어서 공장 다섯 곳이 멈췄대.");
      ctx.say("narmi", "이럴 때를 위해 조달청이 금속을 미리 쌓아 뒀어. 그게 '비축'이야!");
    }
  }

  window.Chapters.stock = {
    auto: function () { /* 클릭 장면 없음 */ },
    start: function (ctx) {
      if (!built) {
        depot = buildDepot();
        factories = SITES.map(function (p, i) { return buildFactory(p[0], p[1], i); });
        Q.add(ambient); built = true;
      }
      clearTemp();
      loaded = false; held = 0; nSent = 0; nAlive = 0; time = 0; done = false; doneWait = 0; hintCool = 0; lateSaid = false; carryPop = 0; gaugeClock = 0;
      gaugeCv = document.createElement("canvas"); gaugeCv.width = 256; gaugeCv.height = 48;
      gaugeTex = new THREE.CanvasTexture(gaugeCv); gaugeTex.encoding = THREE.sRGBEncoding; drawGauge(1, false);
      depotBeam = ctx.beam(DEPOT.x, DEPOT.z, 0x66d9ff); temp.push(depotBeam);
      factories.forEach(function (f) {
        f.alive = false; f.sent = false; f.k = 0; f.hop = 0; f.metal = null; paint(f); f.g.scale.setScalar(F_SCALE);
        f.puffs.forEach(function (p) { p.visible = false; });
        // 경고 고리, "멈춤" 팻말, 남은 시간 막대, 빛기둥
        f.ring = keep(new THREE.Mesh(new THREE.TorusGeometry(16, 0.6, 8, 44), new THREE.MeshBasicMaterial({ color: 0xff5a3c, transparent: true, opacity: 0.8, depthWrite: false })));
        f.ring.rotation.x = Math.PI / 2; f.ring.position.set(f.x, f.y + 1.4, f.z);
        f.sign = keep(label("! 멈춤", "#e5432f", "#ffffff", 13)); f.sign.position.set(f.x, f.y + 29, f.z);
        f.gauge = keep(new THREE.Sprite(new THREE.SpriteMaterial({ map: gaugeTex, transparent: true, depthWrite: false })));
        f.gauge.scale.set(12, 2.25, 1); f.gauge.position.set(f.x, f.y + 23, f.z);
        f.beam = ctx.beam(f.x, f.z, 0xff9a4a); temp.push(f.beam);
      });
      ctx.objective("비축기지에서 금속을 싣고 공장 " + N + "곳에 떨어뜨리세요");
      aim(ctx);
      introScene(ctx);
    },

    update: function (dt, t, ctx) {
      var pos = ctx.flight.pos, i, o, k, h;
      if (intro) return;
      // --- 연출 ---
      if (depotBeam) depotBeam.material.opacity = 0.32 + Math.sin(t * 4) * 0.1;
      factories.forEach(function (f, n) {
        if (!f.alive) {
          var p = Math.sin(t * 5 + n * 2);
          if (f.ring) { f.ring.scale.setScalar(1 + p * 0.07); f.ring.material.opacity = 0.5 + p * 0.3; }
          if (f.sign) {
            f.sign.position.y = f.y + 29 + Math.sin(t * 3 + n) * 0.8;
            var cd = Q.camera.position.distanceTo(f.sign.position), fade = Q.clamp((cd - 14) / 22, 0.12, 1);
            f.sign.material.opacity = fade; if (f.gauge) f.gauge.material.opacity = fade;
          }
          if (f.beam) f.beam.material.opacity = 0.3 + p * 0.08;
        } else if (f.ok) {
          f.ok.userData.born += dt; var b = Math.min(1, f.ok.userData.born * 3.5), s = 12 * (b + Math.sin(b * Math.PI) * 0.35);
          f.ok.scale.set(s, s / 2, 1); f.ok.position.y = f.y + 27 + Math.sin(t * 3 + n) * 0.6;
        }
      });
      gaugeClock -= dt;
      if (gaugeClock <= 0) { gaugeClock = 0.2; drawGauge(Math.max(0, 1 - time / LIMIT), time >= LIMIT && Math.sin(t * 9) > 0); }
      if (carry) {
        carryPop = Math.min(1, carryPop + dt * 4);
        carry.scale.setScalar(Math.max(0.01, carryPop + Math.sin(carryPop * Math.PI) * 0.25));
        carry.rotation.z = Math.sin(t * 3.1) * 0.06;
      }
      // --- 떨어지는 상자: 낙하산을 펴고 포물선으로 내려간다 ---
      for (i = falling.length - 1; i >= 0; i--) {
        o = falling[i]; o.t += dt; k = Math.min(1, o.t / FALL_T); h = 1 - (1 - k) * (1 - k);
        o.g.position.set(Q.lerp(o.from.x, o.to.x, h), Q.lerp(o.from.y, o.to.y, Math.pow(k, 1.5)), Q.lerp(o.from.z, o.to.z, h));
        o.g.scale.setScalar(Q.lerp(0.3, 1, Q.smooth(0, 0.3, k)));
        o.g.userData.chute.scale.setScalar(Math.max(0.05, Q.smooth(0.05, 0.3, k)));
        o.g.rotation.z = Math.sin(o.t * 7) * 0.22 * (1 - k); o.g.rotation.y += dt * 1.2;
        if (k >= 1) { falling.splice(i, 1); land(o, ctx); }
      }
      if (done) {
        doneWait -= dt;
        return doneWait <= 0 ? Q.clamp(100 - Math.max(0, time - 40) * 1.5, 40, 100) : undefined;
      }
      // --- 판정 ---
      time += dt; hintCool -= dt;
      if (time >= LIMIT && !lateSaid) { lateSaid = true; ctx.toast("서둘러요! 공장이 기다려요", 1600); }
      if (!loaded) {
        if (Math.hypot(pos.x - DEPOT.x, pos.z - DEPOT.z) < LOAD_R) {
          if (pos.y < depot.y + 75) {
            loaded = true; gone(depotBeam); depotBeam = null;
            held = Math.min(PER_TRIP, METALS.length - nSent);
            carry = buildCarry(nSent, held); carry.scale.setScalar(0.01); carryPop = 0; ctx.team.narmi.add(carry);
            ctx.burst(pos.clone(), 0x66d9ff); window.Sound.fx.star(); ctx.team.cheer();
            ctx.toast("금속 " + held + "가지 싣기 완료!", 1500);
            ctx.objective("멈춘 공장 위를 지나가면 금속이 떨어져요 (" + nAlive + "/" + N + ")");
            aim(ctx);
          } else if (hintCool <= 0) { hintCool = 3; ctx.toast("조금 더 낮게 날아요", 1200); }
        } else if (hintCool <= 0) {
          for (i = 0; i < factories.length; i++) {
            if (!factories[i].sent && Math.hypot(pos.x - factories[i].x, pos.z - factories[i].z) < DROP_R) { hintCool = 4; ctx.toast("먼저 비축기지에서 금속을 실어요", 1500); break; }
          }
        }
      } else {
        for (i = 0; i < factories.length; i++) {
          o = factories[i];
          if (loaded && !o.sent && held > 0 && Math.hypot(pos.x - o.x, pos.z - o.z) < DROP_R) drop(o, ctx);
        }
      }
    },

    // 비축기지와 공장은 풍경으로 남기고, 임시 물체(상자·막대·경고 표시·빛기둥)만 치운다
    cleanup: function () {
      clearTemp();
      if (gaugeTex) { gaugeTex.dispose(); gaugeTex = null; }
    }
  };
})();
