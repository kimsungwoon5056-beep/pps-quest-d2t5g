// 등장인물: 둥글둥글한 카툰 사람 모델 (코드로 만듦). 키는 약 4.6. 앞쪽은 +z.
// People.make("chief" | "jiwoo" | "manager" | "officer") → THREE.Group (userData.parts 로 팔·머리 움직임)
(function () {
  "use strict";
  var Q = window.Q, THREE = Q.THREE, Toon = window.Toon;
  var SKIN = 0xffd9b3, INK = 0x23232e;
  var LOOKS = {
    chief:   { name: "한 대장", body: 0x2f4a7a, legs: 0x23365c, hair: 0x3a3a44, hat: "helmet", hatColor: 0xd83a3a, accent: 0xffd23f },   // 소방대장
    jiwoo:   { name: "지우", body: 0xf08a3c, legs: 0x4a6fa5, hair: 0x4a2f1f, hat: "goggles", hatColor: 0xa9dcf5, accent: 0xffffff },      // 청년 발명가
    manager: { name: "공장장", body: 0x5b8f6a, legs: 0x3d4a5c, hair: 0x555555, hat: "hardhat", hatColor: 0xffd23f, accent: 0xffffff },   // 드론 공장장
    officer: { name: "검사관", body: 0xffffff, legs: 0x39507a, hair: 0x2a2a33, hat: "none", hatColor: 0, accent: 0x3ad1c5 },             // 품질 검사관
    // 마을 사람들 (풍경): 나르미가 가까이 날면 손을 흔든다
    villA: { name: "마을 사람", body: 0xe2574c, legs: 0x4a5a7a, hair: 0x3a2a22, hat: "none", hatColor: 0, accent: 0xffffff },
    villB: { name: "마을 사람", body: 0x3fae8a, legs: 0x6a5a4a, hair: 0x8a8a92, hat: "none", hatColor: 0, accent: 0xffd23f },
    villC: { name: "마을 사람", body: 0x7a8fe0, legs: 0x3d4a5c, hair: 0x5a3a22, hat: "none", hatColor: 0, accent: 0xffffff },
    villD: { name: "마을 사람", body: 0xffc94a, legs: 0x8a5a3a, hair: 0x23232e, hat: "none", hatColor: 0, accent: 0xe2574c }
  };
  var all = [];

  function make(kind) {
    var L = LOOKS[kind] || LOOKS.chief, g = new THREE.Group(), parts = { arms: [] };
    function flat(m) { m.userData.noInk = true; return m; }
    function box(w, h, d, c) { return Toon.mesh(new THREE.BoxGeometry(w, h, d), c); }
    // 다리·신발 (밑창이 있는 둥근 신발)
    [-0.42, 0.42].forEach(function (x) {
      var leg = Toon.ball(0.4, L.legs, 1, 1.9, 1); leg.position.set(x, 0.85, 0); g.add(leg);
      var shoe = Toon.ball(0.42, L.shoe || 0x3a3340, 1.05, 0.55, 1.55); shoe.position.set(x, 0.26, 0.2); g.add(shoe);
      var sole = Toon.ball(0.43, 0xf2ead8, 1.08, 0.2, 1.6); sole.position.set(x, 0.09, 0.2); g.add(flat(sole));
    });
    // 몸통: 배가 살짝 나온 둥근 몸 + 허리띠 + 깃
    var body = Toon.ball(1, L.body, 1.0, 1.22, 0.84); body.position.y = 2.3; g.add(body);
    var belt = Toon.mesh(new THREE.CylinderGeometry(0.93, 0.9, 0.2, 18), L.belt || 0x2a2a33); belt.scale.z = 0.84; belt.position.y = 1.6; g.add(flat(belt));
    var buckle = box(0.3, 0.24, 0.1, L.accent); buckle.position.set(0, 1.6, 0.78); g.add(flat(buckle));
    var neck = Toon.ball(0.34, SKIN, 1, 0.9, 1); neck.position.y = 3.3; g.add(flat(neck));
    [-1, 1].forEach(function (s) { var col = Toon.ball(0.3, L.collar || L.accent, 1.2, 0.45, 0.8); col.position.set(s * 0.3, 3.22, 0.42); col.rotation.z = s * -0.5; g.add(flat(col)); });
    // 직업별 옷 꾸밈
    if (kind === "chief") {                       // 방화복: 노란 반사 띠 두 줄 + 가슴 이름표
      [2.55, 2.0].forEach(function (y, i) { var b = Toon.mesh(new THREE.CylinderGeometry(i ? 1.0 : 0.96, i ? 1.0 : 0.99, 0.16, 18), 0xffd23f); b.scale.z = 0.85; b.position.y = y; g.add(flat(b)); var w = Toon.mesh(new THREE.CylinderGeometry(i ? 1.005 : 0.965, i ? 1.005 : 0.995, 0.06, 18), 0xf2f2f2); w.scale.z = 0.85; w.position.y = y; g.add(flat(w)); });
      var tag = box(0.42, 0.2, 0.08, 0xffffff); tag.position.set(0.42, 2.95, 0.66); tag.rotation.y = 0.35; g.add(flat(tag));
    } else if (kind === "jiwoo") {                // 작업 멜빵바지: 가슴판 + 멜빵 + 주머니 + 허리의 렌치
      var bib = box(0.95, 0.85, 0.1, L.legs); bib.position.set(0, 2.25, 0.8); g.add(flat(bib));
      [-0.36, 0.36].forEach(function (x) { var st = box(0.16, 1.0, 0.1, L.legs); st.position.set(x, 2.95, 0.66); st.rotation.x = -0.5; g.add(flat(st)); var bt = Toon.ball(0.08, 0xffd23f); bt.position.set(x, 2.62, 0.84); g.add(flat(bt)); });
      var pk = box(0.42, 0.3, 0.06, 0x3d5c8c); pk.position.set(0, 2.15, 0.87); g.add(flat(pk));
      var wr = new THREE.Group(); wr.add(box(0.12, 0.7, 0.1, 0xc9d1d9)); var wj = Toon.mesh(new THREE.TorusGeometry(0.16, 0.06, 6, 10, 4.4), 0xc9d1d9); wj.position.y = 0.45; wj.rotation.z = 0.9; wr.add(wj); wr.position.set(-0.85, 1.45, 0.4); wr.rotation.z = 0.3; g.add(wr);
    } else if (kind === "manager") {              // 작업 조끼 + 넥타이 + 가슴 주머니의 펜
      var shirt = box(0.5, 1.2, 0.1, 0xffffff); shirt.position.set(0, 2.55, 0.78); g.add(flat(shirt));
      var tie = Toon.ball(0.13, 0xd8463a, 1, 3.2, 0.5); tie.position.set(0, 2.5, 0.85); g.add(flat(tie));
      var knot = Toon.ball(0.13, 0xd8463a); knot.position.set(0, 3.0, 0.8); g.add(flat(knot));
      var pk2 = box(0.36, 0.3, 0.06, 0x4a7a58); pk2.position.set(0.55, 2.6, 0.72); pk2.rotation.y = 0.4; g.add(flat(pk2));
      var pen = box(0.07, 0.3, 0.07, 0xffd23f); pen.position.set(0.58, 2.8, 0.74); g.add(flat(pen));
    } else if (kind === "officer") {              // 흰 검사복: 길게 내려오는 자락 + 단추 + 청록 사원증
      var coat = Toon.mesh(new THREE.CylinderGeometry(0.9, 1.08, 1.0, 18), L.body); coat.scale.z = 0.84; coat.position.y = 1.35; g.add(coat);
      [2.8, 2.35, 1.9, 1.45].forEach(function (y) { var bt = Toon.ball(0.07, 0x39507a); bt.position.set(0, y, y > 2 ? 0.83 : 0.9); g.add(flat(bt)); });
      var lan = Toon.mesh(new THREE.TorusGeometry(0.5, 0.035, 5, 16), L.accent); lan.position.set(0, 2.95, 0.5); lan.rotation.x = 0.9; g.add(flat(lan));
      var idc = box(0.34, 0.42, 0.06, L.accent); idc.position.set(0, 2.35, 0.86); g.add(flat(idc)); var idp = box(0.2, 0.16, 0.07, 0xffffff); idp.position.set(0, 2.42, 0.87); g.add(flat(idp));
    }
    // 팔: 어깨에서 돌아가는 축. 소매 끝 + 손(엄지 포함)
    [-1, 1].forEach(function (side) {
      var pivot = new THREE.Group(); pivot.position.set(side * 1.02, 2.95, 0); g.add(pivot);
      var sh = Toon.ball(0.36, L.body); pivot.add(sh);
      var arm = Toon.ball(0.3, L.body, 1, 2.3, 1); arm.position.y = -0.65; pivot.add(arm);
      var cuff = Toon.mesh(new THREE.CylinderGeometry(0.31, 0.33, 0.2, 12), kind === "chief" ? 0xffd23f : (L.collar || L.accent)); cuff.position.y = -1.15; pivot.add(flat(cuff));
      var hand = Toon.ball(0.31, kind === "jiwoo" || kind === "manager" ? 0xf2ead8 : SKIN); hand.position.y = -1.45; pivot.add(hand);
      var thumb = Toon.ball(0.13, hand.material.color.getHex(), 1, 1.3, 1); thumb.position.set(0, -1.38, 0.28); pivot.add(flat(thumb));
      if (kind === "officer" && side === -1) {    // 검사관의 검사표
        var cb = box(0.75, 0.95, 0.08, 0x9a6a44); cb.position.set(0.1, -1.5, 0.42); cb.rotation.x = -0.5; pivot.add(cb);
        var pp = box(0.6, 0.76, 0.04, 0xffffff); pp.position.set(0.1, -1.47, 0.48); pp.rotation.x = -0.5; pivot.add(flat(pp));
        var ck = box(0.3, 0.07, 0.03, L.accent); ck.position.set(0.1, -1.38, 0.53); ck.rotation.x = -0.5; pivot.add(flat(ck));
      }
      pivot.rotation.z = side * 0.18; parts.arms.push(pivot);
    });
    // 머리: 귀·눈(반짝임)·눈썹·코·볼·입
    var head = new THREE.Group(); head.position.y = 4.2; g.add(head); parts.head = head;
    head.add(Toon.ball(1.02, SKIN, 1, 0.94, 0.95));
    [-1, 1].forEach(function (s) { var ear = Toon.ball(0.2, SKIN, 0.6, 1, 0.8); ear.position.set(s * 0.98, -0.05, 0); head.add(ear); });
    parts.eyes = []; parts.brows = [];
    [-0.36, 0.36].forEach(function (x, i) {
      var eye = new THREE.Group(); eye.position.set(x, 0.02, 0.9); head.add(eye); parts.eyes.push(eye);
      eye.add(flat(Toon.ball(0.14, INK, 1, 1.15, 0.5)));
      var hl = Toon.ball(0.05, 0xffffff); hl.position.set(-0.04, 0.06, 0.06); eye.add(flat(hl));
      var brow = box(0.3, 0.07, 0.06, L.hair); brow.position.set(x, 0.32, 0.9); head.add(flat(brow)); parts.brows.push(brow); brow.userData.side = i ? 1 : -1;
    });
    var nose = Toon.ball(0.1, 0xf5bd94, 1, 0.8, 1); nose.position.set(0, -0.12, 1.0); head.add(flat(nose));
    var mouth = Toon.mesh(new THREE.TorusGeometry(0.2, 0.05, 6, 12, Math.PI), INK); mouth.rotation.z = Math.PI; mouth.position.set(0, -0.36, 0.9); head.add(flat(mouth)); parts.mouth = mouth;
    var open = Toon.ball(0.13, 0x8a3b3b, 1.2, 1, 0.4); open.position.set(0, -0.45, 0.9); open.visible = false; head.add(flat(open)); parts.open = open;
    [-0.6, 0.6].forEach(function (x) { var c = Toon.ball(0.17, 0xffb0a0, 1, 0.6, 0.3); c.position.set(x, -0.24, 0.8); head.add(flat(c)); });
    // 머리 모양
    var hair = Toon.mesh(new THREE.SphereGeometry(1.07, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.5), L.hair); hair.position.y = 0.04; hair.rotation.x = -0.3; head.add(hair);
    if (kind === "jiwoo") {                       // 앞머리 + 묶은 머리
      [-0.45, 0, 0.45].forEach(function (x, i) { var f = Toon.ball(0.34, L.hair, 1, 0.8, 0.6); f.position.set(x, 0.55 - Math.abs(x) * 0.2, 0.78); f.rotation.z = (i - 1) * -0.4; head.add(f); });
      var pony = Toon.ball(0.36, L.hair, 0.9, 1.5, 0.9); pony.position.set(0, 0.1, -1.15); pony.rotation.x = 0.5; head.add(pony);
      var tie2 = Toon.ball(0.16, 0xffd23f); tie2.position.set(0, 0.5, -0.98); head.add(flat(tie2));
    } else if (kind === "chief") {                // 희끗한 콧수염
      [-1, 1].forEach(function (s) { var mu = Toon.ball(0.2, 0x6a6a74, 1.5, 0.6, 0.6); mu.position.set(s * 0.2, -0.26, 0.96); mu.rotation.z = s * -0.3; head.add(flat(mu)); });
    } else if (kind === "manager") {              // 옆머리
      [-1, 1].forEach(function (s) { var sb = Toon.ball(0.2, L.hair, 0.5, 1.4, 0.9); sb.position.set(s * 0.95, 0.0, 0.25); head.add(flat(sb)); });
    } else if (kind === "officer") {              // 단정한 단발 + 동그란 안경
      [-1, 1].forEach(function (s) { var bob = Toon.ball(0.42, L.hair, 0.7, 1.5, 1.1); bob.position.set(s * 0.86, -0.15, -0.1); head.add(bob); });
      var fr = Toon.ball(0.5, L.hair, 2.0, 0.5, 0.5); fr.position.set(0, 0.62, 0.72); head.add(flat(fr));
      [-0.36, 0.36].forEach(function (x) { var gl = Toon.mesh(new THREE.TorusGeometry(0.24, 0.035, 6, 18), 0x39507a); gl.position.set(x, 0.02, 0.98); head.add(flat(gl)); });
      var br = box(0.26, 0.04, 0.04, 0x39507a); br.position.set(0, 0.04, 1.0); head.add(flat(br));
    }
    // 모자·소품
    if (L.hat === "helmet" || L.hat === "hardhat") {
      var dome = Toon.mesh(new THREE.SphereGeometry(1.13, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.5), L.hatColor); dome.position.y = 0.56; head.add(dome);
      var brim = Toon.mesh(new THREE.CylinderGeometry(1.34, 1.38, 0.12, 20), L.hatColor); brim.position.set(0, L.hat === "hardhat" ? 0.7 : 0.6, L.hat === "hardhat" ? 0.06 : -0.1); if (L.hat === "hardhat") { brim.scale.set(0.9, 1, 0.9); dome.position.y = 0.64; } head.add(brim);
      var ridge = Toon.ball(0.2, L.hat === "helmet" ? 0xb02a2a : 0xf2b90f, 0.7, 1, 3.2); ridge.position.set(0, 1.56, 0); head.add(ridge);
      if (L.hat === "helmet") { var badge = Toon.ball(0.26, L.accent, 1, 1.25, 0.4); badge.position.set(0, 1.04, 1.0); head.add(badge); }
    } else if (L.hat === "goggles") {
      var band = Toon.mesh(new THREE.TorusGeometry(1.06, 0.1, 6, 20), 0x7a4a2a); band.rotation.x = Math.PI / 2 - 0.35; band.position.y = 0.5; head.add(band);
      [-0.36, 0.36].forEach(function (x) {
        var rimG = Toon.mesh(new THREE.CylinderGeometry(0.33, 0.33, 0.14, 14), 0x7a4a2a); rimG.rotation.x = Math.PI / 2 - 0.35; rimG.position.set(x, 0.86, 0.72); head.add(rimG);
        var lens = Toon.mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.18, 14), L.hatColor); lens.rotation.x = Math.PI / 2 - 0.35; lens.position.set(x, 0.87, 0.74); head.add(flat(lens));
      });
    }
    Toon.outline(g, 0.07);
    // 그리기 횟수 줄이기: 움직이는 부품(눈·눈썹·입·팔·머리)은 남기고 나머지는 한 덩어리로 합친다
    parts.eyes.forEach(function (e) { e.userData.keep = true; }); parts.brows.forEach(function (b) { b.userData.keep = true; });
    parts.mouth.userData.keep = true; parts.open.userData.keep = true;
    parts.arms.forEach(function (a) { Toon.bake(a); a.userData.keep = true; });
    Toon.bake(head); head.userData.keep = true;
    Toon.bake(g);
    g.userData.parts = parts; g.userData.name = L.name; g.userData.kind = kind; g.userData.mood = "idle"; g.userData.seed = all.length * 1.7;
    all.push(g);
    return g;
  }
  // 기분: "idle"(숨쉬기) | "talk"(고개 끄덕) | "sad"(고개 숙임) | "cheer"(두 팔 번쩍) | "wave"(한 손 흔들기)
  function setMood(g, mood) { if (g) g.userData.mood = mood; }
  // 땅 위에 세우기
  function stand(g, x, z, faceYaw, scale) {
    g.position.set(x, Math.max(window.World.height(x, z), 0), z); g.rotation.y = faceYaw || 0; g.scale.setScalar(scale || 1);
    if (!g.parent) Q.scene.add(g);
    if (!g.userData.shadow) {
      var sh = new THREE.Mesh(new THREE.CircleGeometry(1.5, 18).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x15233f, transparent: true, opacity: 0.26, depthWrite: false }));
      sh.userData.noInk = true; Q.scene.add(sh); g.userData.shadow = sh;
    }
    g.userData.shadow.position.set(x, g.position.y + 0.12, z); g.userData.shadow.scale.setScalar(scale || 1);
    return g;
  }

  Q.add(function (dt, t) {
    for (var i = 0; i < all.length; i++) {
      var g = all[i]; if (!g.parent) continue;
      var p = g.userData.parts, m = g.userData.mood, s = t * 2 + g.userData.seed;
      var headX = Math.sin(s) * 0.05, armL = 0.18, armR = 0.18, hop = 0;
      if (m === "talk") headX = Math.sin(t * 7) * 0.1;
      else if (m === "sad") { headX = 0.45; armL = armR = 0.05; }
      else if (m === "cheer") { armL = armR = 2.6 + Math.sin(t * 14) * 0.25; hop = Math.abs(Math.sin(t * 8)) * 0.5; }
      else if (m === "wave") { armR = 2.5 + Math.sin(t * 10) * 0.4; }
      p.head.rotation.x = Q.lerp(p.head.rotation.x, headX, Math.min(1, dt * 8));
      p.arms[0].rotation.z = Q.lerp(p.arms[0].rotation.z, -armL, Math.min(1, dt * 8));
      p.arms[1].rotation.z = Q.lerp(p.arms[1].rotation.z, armR, Math.min(1, dt * 8));
      // 눈 깜빡임, 말할 때 입, 기분에 따른 눈썹, 몸 흔들림
      var bl = (t * 0.9 + g.userData.seed) % 3.4, shut = bl < 0.12 ? 0.12 : 1;
      if (p.eyes) p.eyes.forEach(function (e) { e.scale.y = m === "cheer" ? 0.45 : shut; });
      if (p.open) { var talking = m === "talk" && Math.sin(t * 13) > -0.2; p.open.visible = talking || m === "cheer"; p.mouth.visible = !p.open.visible; p.mouth.rotation.z = m === "sad" ? 0 : Math.PI; p.mouth.position.y = m === "sad" ? -0.5 : -0.36; }
      if (p.brows) p.brows.forEach(function (b) { b.rotation.z = b.userData.side * (m === "sad" ? 0.4 : m === "cheer" ? -0.15 : 0); b.position.y = m === "cheer" ? 0.4 : 0.32; });
      // 대화 중에는 말하는 상대 쪽으로 고개를 돌린다
      var near = !window.Game || window.Game.flight.pos.distanceTo(g.position) < 70;
      var gz = near && window.Story && window.Story.gaze && window.Story.gaze(g), hy = 0;
      if (gz) { var ga = Math.atan2(gz.x - g.position.x, gz.z - g.position.z) - g.rotation.y; hy = Q.clamp(Math.atan2(Math.sin(ga), Math.cos(ga)), -1.0, 1.0); }
      p.head.rotation.y = Q.lerp(p.head.rotation.y, hy, Math.min(1, dt * 5));
      p.head.rotation.z = Math.sin(s * 0.7) * 0.04 + (m === "talk" ? Math.sin(t * 3.5) * 0.06 : 0);
      g.userData.hop = hop; g.scale.y = g.scale.x * (1 + Math.sin(s * 1.3) * 0.012);
      if (g.userData.baseY === undefined) g.userData.baseY = g.position.y;
      g.position.y = g.userData.baseY + hop;
    }
  });

  window.People = { make: make, setMood: setMood, stand: function (g, x, z, yaw, sc) { stand(g, x, z, yaw, sc); g.userData.baseY = g.position.y; return g; }, LOOKS: LOOKS };
})();
