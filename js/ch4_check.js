// 4장 품질 검사: 검사장에 내려 검사대 위 드론 6대 중 불량 3대를 눌러 골라낸다 (이야기형 v3)
// 정책: 조달물자 품질점검 — 세금으로 사는 물건, 특히 국민 안전과 이어진 물건은 보내기 전에 꼼꼼히 검사한다.
//       불량은 돌려보내고 합격한 것만 보낸다.
// 흐름: 비행(검사장으로) → 착륙·검사관 컷신 → 검사대 클릭 판단 → 합격 도장 → 마무리 컷신 → 이륙
(function () {
  "use strict";
  var Q = window.Q, THREE = Q.THREE, Toon = window.Toon, World = window.World;
  window.Chapters = window.Chapters || {};

  var WANT = { x: 106, z: 170 };                 // 검사장 자리 (안내의 (110,170) 부근, 터 전체가 평지에 들어가게 4쯤 옮김)
  var N = 6, BAD = 3, PENALTY = 12, MIN_SCORE = 40;
  var SIZE = 3, PITCH = 9.6, LEG = 0.62;         // 드론 크기(배), 드론 사이 간격, 다리 길이(드론 단위)
  var FY = 0.15, BELT_TOP = 1.53;                // 바닥 판 윗면, 벨트 윗면 (터 기준 높이)
  var ARRIVE = 35, ROLL_SPEED = 34, FOV = 40;
  var FONT = "'Jua','Noto Sans KR','Malgun Gothic','Apple SD Gothic Neo',sans-serif";
  var OBJ = "불량 드론 3대를 눌러 골라내세요";
  var KINDS = ["prop", "crack", "cam", "bent"];  // 불량 단서 4가지 가운데 매번 3가지
  var WHY = {
    prop: "프로펠러가 하나 없어요. 이대로는 제대로 날 수 없어요.",
    crack: "몸통에 금이 가서 연기가 나요. 날다가 멈출 수 있어요.",
    cam: "카메라가 덜렁거려요. 이러면 산불을 찾지 못해요.",
    bent: "한쪽 팔이 휘어서 기울어진 채 돌아요."
  };
  var HINT = {
    prop: "프로펠러가 4개인지 하나씩 세어 봐요.",
    crack: "연기가 나는 드론은 없는지 살펴봐요.",
    cam: "빨간 불이 깜빡이는 드론이 있어요.",
    bent: "혼자 기울어져 도는 드론이 있어요."
  };
  var NORMAL = "이 드론은 정상이에요. 프로펠러 4개, 반듯한 몸, 초록 불! 멀쩡한 건 돌려보내면 안 돼요.";

  // 풍경으로 남는 것 (한 번만 만든다)
  var site = null, S = { x: WANT.x, z: WANT.z, y: 0 }, L = null, officer = null, belts = [], beltMap = null, tex = {};
  // 장이 도는 동안만 있는 것
  var drones = [], puffs = [], mats = [], items = null, beam = null, banner = null, bubble = null, bubbleText = null;
  var C = null, phase = "idle", clock = 0, phaseT = 0, found = 0, misses = 0, stamped = 0, lastFind = 0, hinted = false;
  var autoT = 0, bubbleT = 0, exitT = 0;

  // ---------- 그림 (canvas) ----------
  function canvas(w, h) { var c = document.createElement("canvas"); c.width = w; c.height = h; return c; }
  function asTex(c) { var t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; return t; }
  // 동그란 표식: "x"(불량), "ok"(정상), "pass"(합격 도장)
  function markTex(kind) {
    if (tex[kind]) return tex[kind];
    var c = canvas(256, 256), g = c.getContext("2d");
    g.beginPath(); g.arc(128, 128, 108, 0, Math.PI * 2);
    g.fillStyle = kind === "x" ? "#ff4d4d" : kind === "ok" ? "#3ecf6e" : "#ffffff"; g.fill();
    g.lineWidth = 18; g.strokeStyle = kind === "pass" ? "#1fa35a" : "#1b2a5c"; g.stroke();
    g.strokeStyle = "#ffffff"; g.lineCap = "round"; g.lineJoin = "round"; g.lineWidth = 34;
    if (kind === "x") {
      g.beginPath(); g.moveTo(78, 78); g.lineTo(178, 178); g.moveTo(178, 78); g.lineTo(78, 178); g.stroke();
    } else if (kind === "ok") {
      g.beginPath(); g.moveTo(70, 132); g.lineTo(112, 174); g.lineTo(188, 86); g.stroke();
    } else {                                     // 합격 도장: 흰 바탕, 초록 두 겹 테두리와 글자
      g.beginPath(); g.arc(128, 128, 86, 0, Math.PI * 2); g.lineWidth = 7; g.strokeStyle = "#1fa35a"; g.stroke();
      g.font = "900 84px " + FONT; g.textAlign = "center"; g.textBaseline = "middle"; g.fillStyle = "#1fa35a";
      g.save(); g.translate(128, 134); g.rotate(-0.16); g.fillText("합격", 0, 0); g.restore();
    }
    return (tex[kind] = asTex(c));
  }
  function glowTex() {
    if (tex.glow) return tex.glow;
    var c = canvas(64, 64), g = c.getContext("2d"), r = g.createRadialGradient(32, 32, 2, 32, 32, 30);
    r.addColorStop(0, "rgba(255,255,255,1)"); r.addColorStop(0.35, "rgba(255,255,255,0.55)"); r.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = r; g.fillRect(0, 0, 64, 64);
    return (tex.glow = new THREE.CanvasTexture(c));
  }
  // 글자 그림: 굵은 글씨 + 남색 테두리 (간판, 상자 이름표)
  function textTex(text, fg, bg) {
    var c = canvas(512, 128), g = c.getContext("2d"), size = 92;
    if (bg) { g.fillStyle = bg; g.fillRect(0, 0, 512, 128); }
    g.textAlign = "center"; g.textBaseline = "middle"; g.lineJoin = "round";
    do { g.font = "900 " + size + "px " + FONT; size -= 4; } while (size > 30 && g.measureText(text).width > 440);
    g.lineWidth = 16; g.strokeStyle = "#1b2a5c"; g.strokeText(text, 256, 68);
    g.fillStyle = fg; g.fillText(text, 256, 68);
    return asTex(c);
  }
  // 벨트 무늬: 오른쪽을 가리키는 화살 무늬가 흘러간다
  function beltTex() {
    var c = canvas(64, 64), g = c.getContext("2d");
    g.fillStyle = "#4a5568"; g.fillRect(0, 0, 64, 64);
    g.strokeStyle = "#66748c"; g.lineWidth = 7; g.lineJoin = "round"; g.lineCap = "round";
    g.beginPath(); g.moveTo(20, 10); g.lineTo(42, 32); g.lineTo(20, 54); g.stroke();
    g.fillStyle = "#3a4353"; g.fillRect(0, 0, 3, 64);
    var t = asTex(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
  }
  function sprite(map, opts) {                   // 장이 끝나면 지울 표시용 (재질을 따로 만든다)
    var o = { map: map, transparent: true, depthWrite: false }, k;
    for (k in (opts || {})) o[k] = opts[k];
    var m = new THREE.SpriteMaterial(o); mats.push(m);
    return new THREE.Sprite(m);
  }

  // ---------- 화면 글자: 컷신 화면(body.cine)에서는 공통 목표 칸이 숨겨지므로 이 장이 직접 띄운다 ----------
  function buildUi() {
    if (banner) return;
    var host = document.getElementById("ui"); if (!host) return;
    banner = document.createElement("div"); banner.id = "chkBanner";
    banner.style.cssText = "position:absolute;top:14px;left:50%;transform:translateX(-50%);max-width:92vw;background:#fffdf4;" +
      "border:4px solid #1b2a5c;border-radius:18px;padding:8px 22px;font-weight:900;font-size:clamp(15px,2.2vw,24px);" +
      "box-shadow:0 5px 0 #1b2a5c;text-align:center;color:#1b2a5c;display:none;";
    bubble = document.createElement("div"); bubble.id = "chkBubble";
    bubble.style.cssText = "position:absolute;left:50%;bottom:16px;transform:translateX(-50%);width:min(780px,92vw);background:#fffdf4;" +
      "border:4px solid #1b2a5c;border-radius:20px 20px 20px 6px;padding:9px 20px 12px;box-shadow:0 6px 0 #1b2a5c;" +
      "font-weight:800;font-size:clamp(15px,2vw,23px);line-height:1.4;color:#1b2a5c;display:none;";
    var name = document.createElement("span");
    name.style.cssText = "display:inline-block;background:#1b2a5c;color:#ffd23f;font-weight:900;border-radius:999px;padding:2px 14px;margin-right:10px;font-size:.85em;";
    name.textContent = "검사관";
    bubbleText = document.createElement("span");
    bubble.appendChild(name); bubble.appendChild(bubbleText);
    host.appendChild(banner); host.appendChild(bubble);
  }
  var bigSign = null, signPos = new THREE.Vector3();
  function setBanner(msg) { if (!banner) return; banner.textContent = msg || ""; banner.style.display = msg ? "block" : "none"; }
  function tell(msg, seconds) {                   // 검사관의 한마디 (아래 말 상자)
    if (window.People && officer) window.People.setMood(officer, msg ? "talk" : "idle");
    bubbleT = msg ? (seconds || 3.4) : 0;
    if (!bubble) return;
    bubbleText.textContent = msg || ""; bubble.style.display = msg ? "block" : "none";
  }

  // ---------- 검사장 자리와 배치 ----------
  function fits(x, z) {
    return World.isFlat(x, z) && World.isFlat(x - 36, z) && World.isFlat(x + 34, z) && World.isFlat(x, z - 46) && World.isFlat(x, z + 10);
  }
  function findSpot() {
    if (fits(WANT.x, WANT.z)) return { x: WANT.x, z: WANT.z };
    for (var r = 6; r <= 72; r += 6) for (var a = 0; a < 12; a++) {
      var x = WANT.x + Math.cos(a * 0.5236) * r, z = WANT.z + Math.sin(a * 0.5236) * r;
      if (fits(x, z)) return { x: x, z: z };
    }
    return { x: WANT.x, z: WANT.z };
  }
  // 가로 화면은 6대 한 줄, 세로 화면(폰을 세워 든 경우)은 3대씩 두 줄로 놓아 크게 보이게 한다
  function plan() {
    var wide = window.innerWidth >= window.innerHeight * 1.05, o = {};
    o.cols = wide ? N : N / 2; o.rowsZ = wide ? [0] : [7, -7];
    o.len = o.cols * PITCH + 4;                   // 벨트 길이
    o.frontZ = o.rowsZ[0] + 4.5;
    o.binZ = o.rowsZ[o.rowsZ.length - 1] - 8.8;   // 돌려보냄 상자
    o.charZ = o.binZ - 9;                         // 검사관과 나르미 팀이 서는 줄
    o.boothZ = o.charZ - 13;
    o.officer = { x: -7, z: o.charZ }; o.team = { x: 8, z: o.charZ };
    return o;
  }
  function slot(i) { var col = i % L.cols, row = Math.floor(i / L.cols); return { x: (col - (L.cols - 1) / 2) * PITCH, z: L.rowsZ[row], col: col, row: row }; }

  function buildBelt(z) {
    var g = new THREE.Group(), len = L.len, i, x;
    for (i = 0; i < 5; i++) {
      x = -len / 2 + 2 + i * (len - 4) / 4;
      var leg = Toon.mesh(new THREE.BoxGeometry(0.8, 1.0, 6.4), 0x39507a); leg.position.set(x, 0.5, 0); g.add(leg);
    }
    var frame = Toon.mesh(new THREE.BoxGeometry(len, 0.6, 7.6), 0x39507a); frame.position.y = 1.2; g.add(frame);
    [-3.65, 3.65].forEach(function (rz) { var rail = Toon.mesh(new THREE.BoxGeometry(len, 0.4, 0.4), 0xffd23f); rail.position.set(0, 1.62, rz); g.add(rail); });
    var roller = Toon.mesh(new THREE.CylinderGeometry(0.75, 0.75, 7.6, 14), 0x9aa3ad); roller.rotation.x = Math.PI / 2; roller.position.set(len / 2, 1.2, 0); g.add(roller);
    // 드론이 나오는 문 (벨트 왼쪽 끝을 덮는 작은 집)
    var hx = -len / 2 - 2;
    var house = Toon.mesh(new THREE.BoxGeometry(8, 6.6, 8.4), 0x2f6f8f); house.position.set(hx, 3.3, 0); g.add(house);
    var top = Toon.mesh(new THREE.BoxGeometry(8.8, 0.7, 9.2), 0xfff3dc); top.position.set(hx, 6.9, 0); g.add(top);
    var lamp = Toon.mesh(new THREE.SphereGeometry(0.7, 12, 8), Toon.mat(0xffd23f, { emissive: 0xffa800, emissiveIntensity: 0.6 })); lamp.position.set(hx, 7.6, 0); g.add(lamp);
    Toon.outline(g, 0.16);
    var door = Toon.mesh(new THREE.BoxGeometry(0.16, 4.3, 7), 0x1b2a5c); door.position.set(hx + 4.02, BELT_TOP + 2.15, 0); door.userData.noInk = true; g.add(door);
    // 움직이는 벨트 윗면
    if (!beltMap) beltMap = beltTex();
    var m = new THREE.MeshToonMaterial({ map: beltMap, gradientMap: Toon.ramp });
    var surf = new THREE.Mesh(new THREE.PlaneGeometry(len - 0.4, 6.9).rotateX(-Math.PI / 2), m); surf.position.y = BELT_TOP; g.add(surf);
    beltMap.repeat.set(len / 4, 2);
    g.position.set(0, FY, z); site.add(g); belts.push(g);
  }
  function buildBin() {
    var g = new THREE.Group(), len = L.len - 2, w = 8, h = 2.5, t = 0.36, red = 0xe2574c;
    var floor = Toon.mesh(new THREE.BoxGeometry(len, 0.3, w), 0xb9423a); floor.position.y = 0.15; g.add(floor);
    [-1, 1].forEach(function (s) {
      var a = Toon.mesh(new THREE.BoxGeometry(len, h, t), red); a.position.set(0, h / 2, s * (w - t) / 2); g.add(a);
      var b = Toon.mesh(new THREE.BoxGeometry(t, h, w), red); b.position.set(s * (len - t) / 2, h / 2, 0); g.add(b);
    });
    var rim = Toon.mesh(new THREE.BoxGeometry(len + 0.5, 0.3, 0.7), 0xffd23f); rim.position.set(0, h, w / 2 - 0.1); g.add(rim);
    Toon.outline(g, 0.16);
    var tag = new THREE.Mesh(new THREE.PlaneGeometry(13, 3.25), new THREE.MeshBasicMaterial({ map: textTex("돌려보냄", "#ffffff"), transparent: true, depthWrite: false }));
    tag.position.set(0, 1.25, w / 2 + 0.06); g.add(tag);
    g.position.set(0, FY, L.binZ); site.add(g);
  }
  function buildBooth() {                         // 검사실 건물, 돋보기 간판
    var g = new THREE.Group();
    var booth = Toon.mesh(new THREE.BoxGeometry(6, 4.4, 4.4), 0xfff3dc); booth.position.set(0, 2.2, 0); g.add(booth);
    var roof = Toon.mesh(new THREE.BoxGeometry(7.2, 0.9, 5.4), 0x2f6f8f); roof.position.set(0, 4.85, 0); g.add(roof);
    var win = Toon.mesh(new THREE.BoxGeometry(3.2, 1.6, 0.3), 0x9be4ff); win.position.set(0.9, 2.7, 2.25); g.add(win);
    var door = Toon.mesh(new THREE.BoxGeometry(1.1, 2.6, 0.3), 0x9a6a44); door.position.set(-1.9, 1.3, 2.25); g.add(door);
    var pole = Toon.mesh(new THREE.CylinderGeometry(0.2, 0.2, 6.4, 8), 0x39507a); pole.position.set(4.6, 3.2, 1.6); g.add(pole);
    var lens = Toon.mesh(new THREE.TorusGeometry(1.25, 0.3, 8, 20), 0xffd23f); lens.position.set(4.6, 7.4, 1.6); g.add(lens);
    var glass = Toon.mesh(new THREE.CylinderGeometry(1.1, 1.1, 0.12, 18), Toon.mat(0xbfefff, { transparent: true, opacity: 0.75 }));
    glass.rotation.x = Math.PI / 2; glass.position.set(4.6, 7.4, 1.6); glass.userData.noInk = true; g.add(glass);
    Toon.outline(g, 0.09);
    g.scale.setScalar(2.3); g.position.set(-L.len / 4, FY, L.boothZ); site.add(g);
    var sign = new THREE.Sprite(new THREE.SpriteMaterial({ map: textTex("품질 검사장", "#ffd23f"), transparent: true, depthWrite: false }));
    sign.scale.set(30, 7.5, 1); sign.position.set(-L.len / 4, FY + 17, L.boothZ); site.add(sign); bigSign = sign;
  }
  function buildSite() {
    if (site) return;
    var p = findSpot(), hi = -1e9; S.x = p.x; S.z = p.z; L = plan();
    [[0, 0], [-L.len / 2 - 8, L.frontZ], [L.len / 2 + 8, L.frontZ], [-L.len / 2 - 8, L.boothZ - 8], [L.len / 2 + 8, L.boothZ - 8], [0, L.charZ]].forEach(function (q) {
      hi = Math.max(hi, World.height(S.x + q[0], S.z + q[1]), 0);
    });
    S.y = hi;
    site = new THREE.Group(); site.position.set(S.x, S.y, S.z);
    var w = L.len + 18, front = L.frontZ + 4, back = L.boothZ - 8;
    var slab = Toon.mesh(new THREE.BoxGeometry(w, 3, front - back), 0xece6d2); slab.position.set(-1, FY - 1.5, (front + back) / 2); Toon.outline(slab, 0.2); site.add(slab);
    var lane = Toon.mesh(new THREE.BoxGeometry(w - 4, 0.06, 0.6), 0xffd23f); lane.position.set(-1, FY + 0.03, L.frontZ + 1.6); lane.userData.noInk = true; site.add(lane);
    L.rowsZ.forEach(buildBelt); buildBin(); buildBooth();
    // 둘레 꾸밈: 모서리 안전 고깔, 출고 상자 더미, 화분
    var props = new THREE.Group();
    [[-w / 2 + 2, front - 2], [w / 2 - 4, front - 2], [-w / 2 + 2, back + 2], [w / 2 - 4, back + 2]].forEach(function (q) {
      var cone = Toon.mesh(new THREE.ConeGeometry(0.8, 2.2, 10), 0xff7a2a); cone.position.set(q[0], FY + 1.1, q[1]); props.add(cone);
      var ring = Toon.mesh(new THREE.CylinderGeometry(0.55, 0.62, 0.35, 10), 0xffffff); ring.position.set(q[0], FY + 1.2, q[1]); props.add(ring);
      var foot = Toon.mesh(new THREE.BoxGeometry(1.8, 0.2, 1.8), 0x39507a); foot.position.set(q[0], FY + 0.1, q[1]); props.add(foot);
    });
    [[w / 2 - 6, back + 6], [w / 2 - 6, back + 9.2]].forEach(function (q, i) {
      for (var k = 0; k < 3 - i; k++) { var cr = Toon.mesh(new THREE.BoxGeometry(2.8, 2.2, 2.8), k % 2 ? 0xc79a63 : 0xb98a55); cr.position.set(q[0] - k * 0.2, FY + 1.1 + k * 2.2, q[1]); cr.rotation.y = k * 0.2; props.add(cr); }
    });
    var tag = Toon.mesh(new THREE.BoxGeometry(2.4, 0.9, 0.15), 0x3fae6a); tag.position.set(w / 2 - 6, FY + 3.4, back + 7.6); props.add(tag);
    [[-w / 2 + 5, back + 2], [-L.len / 4 + 9, L.boothZ + 4]].forEach(function (q) {
      var bx = Toon.mesh(new THREE.BoxGeometry(2, 1, 2), 0x9a6a44); bx.position.set(q[0], FY + 0.5, q[1]); props.add(bx);
      var bu = Toon.ball(1.0, 0x5fae4e); bu.position.set(q[0], FY + 1.7, q[1]); props.add(bu);
    });
    Toon.outline(props, 0.08); Toon.bake(props); site.add(props);
    Q.scene.add(site);
    if (window.People) {
      officer = window.People.make("officer");
      window.People.stand(officer, S.x + L.officer.x, S.z + L.officer.z, 0, 1.25);
      officer.position.y = S.y + FY; officer.userData.baseY = officer.position.y;
    }
  }

  // ---------- 카메라 구도 ----------
  function aspect() { return Math.max(0.3, window.innerWidth / Math.max(1, window.innerHeight)); }
  // 검사대를 비스듬히 내려다보는 구도: 6대가 화면 너비 안에 다 들어오도록 거리를 화면 비율에 맞춘다
  function beltCam() {
    var th = Math.tan(Q.effFov(FOV) * Math.PI / 360), e = 0.74, depth = L.frontZ - L.charZ;
    var dw = (L.len + 9) / 2 / (th * aspect()), dv = (depth * 0.5 * Math.sin(e) + 7) / th, d = Math.max(dw, dv, 36);
    var lx = S.x - 1.5, ly = S.y + 2.2, lz = S.z + (L.frontZ + L.charZ) / 2 + 1.5;
    return { pos: [lx, ly + Math.sin(e) * d, lz + Math.cos(e) * d], look: [lx, ly, lz], fov: FOV };
  }
  function meetCams() {
    var gy = S.y + FY, ox = S.x + L.officer.x, tx = S.x + L.team.x, z = S.z + L.charZ, mx = (ox + tx) / 2;
    var d = Math.max(18, 11 / (Math.tan(Q.effFov(46) * Math.PI / 360) * aspect()));
    return {
      two: { pos: [mx, gy + 15, z + d], look: [mx, gy + 2.6, z], fov: 46 },
      officer: { pos: [ox + 4.5, gy + 11, z + 12], look: [ox, gy + 3.6, z], fov: 40 },
      team: { pos: [tx - 5, gy + 12, z + 14], look: [tx + 1, gy + 2.8, z + 1], fov: 44 }
    };
  }

  // ---------- 드론 한 대 ----------
  function seg(parent, ax, ay, az, bx, by, bz, mat) {   // 금 한 토막 (가는 막대)
    var a = new THREE.Vector3(ax, ay, az), d = new THREE.Vector3(bx, by, bz).sub(a), len = d.length();
    var m = new THREE.Mesh(new THREE.BoxGeometry(0.065, len + 0.03, 0.065), mat);
    m.position.copy(a).addScaledVector(d, 0.5); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
    m.userData.noInk = true; parent.add(m);
  }
  function makeDrone(i, kind) {
    var holder = new THREE.Group(), g = C.drone(), k, extra = new THREE.Group();
    var camBall = g.children[1], arms = [], rotors = g.userData.rotors;
    for (k = 0; k < 4; k++) arms.push(g.children[2 + k * 2]);
    g.scale.setScalar(SIZE); g.rotation.order = "YXZ"; g.position.y = LEG * SIZE; holder.add(g);
    // 착륙 다리
    [-0.3, 0.3].forEach(function (x) {
      [-0.28, 0.28].forEach(function (z) { var leg = Toon.mesh(new THREE.BoxGeometry(0.07, 0.45, 0.07), 0x39507a); leg.position.set(x, -0.4, z); extra.add(leg); });
      var skid = Toon.mesh(new THREE.BoxGeometry(0.08, 0.07, 0.86), 0x39507a); skid.position.set(x, -0.585, 0); extra.add(skid);
    });
    var d = { i: i, holder: holder, g: g, kind: kind, bad: !!kind, state: "wait", rotors: rotors, ph: i * 1.7, spin: 0, emit: 0, t: 0, delay: 0,
              from: new THREE.Vector3(), to: new THREE.Vector3(), mark: null, markT: 0, ok: null, okT: 0, stamp: null, stampT: 0, cool: 0, pivot: null, item: null, tilt: 0, rotorSpeed: 30 };

    if (kind === "prop") {                        // 프로펠러 하나가 없다: 앞쪽(카메라에 가까운 쪽) 하나를 뗀다
      k = 2 + (Math.random() < 0.5 ? 0 : 1);
      rotors[k].visible = false;
      var nub = Toon.mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.16, 10), 0x23232e); nub.position.copy(rotors[k].position); nub.position.y = 0.14; extra.add(nub);
      var shard = Toon.mesh(new THREE.BoxGeometry(0.26, 0.04, 0.09), 0xbfe3f5); shard.position.copy(nub.position); shard.position.y += 0.1; shard.position.x += 0.08; shard.rotation.set(0.2, 0.7, 0.35); extra.add(shard);
      d.tilt = rotors[k].position.x > 0 ? -1 : 1;
    } else if (kind === "crack") {                // 몸통에 금: 윗면을 가로질러 앞면까지 지그재그
      var ink = new THREE.MeshBasicMaterial({ color: 0x23232e }); mats.push(ink);
      var top = [[-0.3, -0.42], [0.04, -0.2], [-0.2, 0.0], [0.16, 0.2], [-0.04, 0.455]], y = 0.185;
      for (k = 0; k < top.length - 1; k++) seg(g, top[k][0], y, top[k][1], top[k + 1][0], y, top[k + 1][1], ink);
      seg(g, -0.04, 0.185, 0.46, 0.1, 0.02, 0.46, ink); seg(g, 0.1, 0.02, 0.46, -0.06, -0.175, 0.46, ink);
      seg(g, 0.04, y, -0.2, 0.3, y, -0.3, ink); seg(g, -0.2, y, 0.0, -0.42, y, 0.12, ink);
      var soot = Toon.ball(0.2, 0x4a4a55, 1, 0.12, 1); soot.position.set(-0.05, 0.19, 0.05); soot.userData.noInk = true; g.add(soot);
    } else if (kind === "cam") {                  // 카메라가 떨어져 앞에서 덜렁거린다
      g.remove(camBall);
      var pivot = new THREE.Group(); pivot.position.set(0, -0.1, 0.47); g.add(pivot);
      var wire = Toon.mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.3, 6), 0x23232e); wire.position.y = -0.15; wire.userData.noInk = true; pivot.add(wire);
      camBall.position.set(0, -0.32, 0); pivot.add(camBall); d.pivot = pivot;
      var socket = Toon.ball(0.12, 0x23232e, 1, 0.5, 1); socket.position.set(0, -0.19, 0.3); socket.userData.noInk = true; g.add(socket);
    } else if (kind === "bent") {                 // 팔 하나가 아래로 휘었다
      k = Math.floor(Math.random() * 4);
      arms[k].rotation.order = "YXZ"; arms[k].rotation.x = 0.62; arms[k].position.y -= 0.1;
      rotors[k].position.y -= 0.3; rotors[k].position.x *= 0.93; rotors[k].position.z *= 0.93; rotors[k].rotation.x = rotors[k].position.z > 0 ? 0.6 : -0.6;
      d.tilt = 1;
    }
    Toon.outline(extra, 0.05); g.add(extra);

    // 상태 불: 정상은 초록
    var lm = new THREE.MeshBasicMaterial({ color: 0x3dff7a }); mats.push(lm);
    var light = new THREE.Mesh(new THREE.SphereGeometry(0.15, 12, 8), lm); light.position.set(0, 0.3, 0); g.add(light);
    var glow = sprite(glowTex(), { color: 0x3dff7a, blending: THREE.AdditiveBlending }); glow.scale.setScalar(1.3); glow.position.set(0, 0.34, 0); g.add(glow);
    d.light = lm; d.glow = glow;
    // 손가락으로도 누르기 쉽게 보이지 않는 넉넉한 누름 상자를 씌운다
    var hm = new THREE.MeshBasicMaterial({ visible: false }); mats.push(hm);
    var hit = new THREE.Mesh(new THREE.BoxGeometry(PITCH - 1.4, 5.2, 8), hm); hit.position.y = 2.6; holder.add(hit);

    var s = slot(i);
    d.to.set(S.x + s.x, S.y + FY + BELT_TOP, S.z + s.z);
    d.from.set(S.x - L.len / 2 - 2, d.to.y, d.to.z);          // 문 안쪽에서 출발
    d.delay = (L.cols - 1 - s.col) * 0.3;                     // 오른쪽 자리 드론부터 나온다
    holder.position.copy(d.from); Q.scene.add(holder);
    return d;
  }
  function spawnDrones() {
    var kinds = KINDS.slice(), order = [], i, j, sw;
    for (i = kinds.length - 1; i > 0; i--) { j = Math.floor(Math.random() * (i + 1)); sw = kinds[i]; kinds[i] = kinds[j]; kinds[j] = sw; }
    for (i = 0; i < N; i++) order.push(i < BAD ? kinds[i] : "");
    for (i = N - 1; i > 0; i--) { j = Math.floor(Math.random() * (i + 1)); sw = order[i]; order[i] = order[j]; order[j] = sw; }
    for (i = 0; i < N; i++) drones.push(makeDrone(i, order[i]));
  }

  function puff(x, y, z) {
    var p = null, i;
    for (i = 0; i < puffs.length; i++) if (puffs[i].t >= puffs[i].life) { p = puffs[i]; break; }
    if (!p) {
      if (puffs.length >= 14) return;
      var m = Toon.mesh(new THREE.SphereGeometry(1, 10, 8), puffs.length % 2 ? 0x8d8f99 : 0x6f7280);
      Toon.outline(m, 0.07); Q.scene.add(m);
      p = { m: m, t: 0, life: 1.5 }; puffs.push(p);
    }
    p.t = 0; p.m.visible = true; p.m.position.set(x + (Math.random() - 0.5) * 0.8, y, z + (Math.random() - 0.5) * 0.8); p.m.scale.setScalar(0.01);
  }
  function pop(k) { return k < 1 ? k * (1.9 - 0.9 * k) * 1.15 : 1; }

  // ---------- 판단: 실제 클릭과 자동 풀이가 같은 길을 지난다 ----------
  function choose(d) {
    if (phase !== "pick" || !d || d.state !== "belt") return;
    var here = d.holder.position.clone(); here.y += 3;
    if (!d.bad) {                                 // 정상을 눌렀다: 감점하고 정상의 기준을 알려 준다
      if (d.cool > 0) return;
      d.cool = 1; misses++; d.okT = 1.5;
      if (!d.ok) { d.ok = sprite(markTex("ok")); d.ok.position.set(0, 7, 0); d.holder.add(d.ok); }
      window.Sound.fx.bad(); C.burst(here, 0x7dffa0); C.toast("정상이에요! -" + PENALTY + "점", 1300);
      tell(NORMAL, 4.6);
      return;
    }
    d.state = "out"; d.t = 0; if (d.item) d.item.disabled = true;
    d.from.copy(d.holder.position);
    var half = (L.len - 2) / 2 - 4.2;
    d.to.set(S.x + Q.clamp(d.from.x - S.x, -half, half), S.y + FY + 0.32, S.z + L.binZ);
    d.mark = sprite(markTex("x")); d.mark.position.set(0, 7, 0); d.mark.scale.setScalar(0.01); d.holder.add(d.mark); d.markT = 0;
    found++; lastFind = clock;
    window.Sound.fx.good(); C.burst(here, 0xff7a6a); C.team.cheer();
    C.toast("불량 발견! " + found + "/" + BAD, 1300);
    tell(WHY[d.kind], 4);
    setBanner(OBJ + " (" + found + "/" + BAD + ")"); C.objective(OBJ + " (" + found + "/" + BAD + ")");
    if (found >= BAD) { phase = "stamp"; phaseT = 0; stamped = 0; window.Story.pick(null); }
  }
  function nextBad() { for (var i = 0; i < drones.length; i++) if (drones[i].bad && drones[i].state === "belt") return drones[i]; return null; }

  function moveDrone(d, dt, t) {
    var g = d.g, h = d.holder, k, yaw = 0, rx = 0, rz = 0, calm = 1, i;
    d.t += dt; if (d.cool > 0) d.cool -= dt;
    if (d.state === "wait") { if (phase === "roll" && phaseT >= d.delay) d.state = "in"; }
    else if (d.state === "in") {
      h.position.x = Math.min(d.to.x, h.position.x + ROLL_SPEED * dt);
      if (h.position.x >= d.to.x) { d.state = "belt"; d.t = 0; }
    } else if (d.state === "out") {               // 돌려보냄 상자로 미끄러져 들어간다
      k = Q.smooth(0, 0.9, d.t); calm = 1 - k;
      h.position.lerpVectors(d.from, d.to, k);
      h.position.y += Math.sin(k * Math.PI) * (0.5 + Math.abs(d.from.z - d.to.z) * 0.3);    // 상자 턱(과 뒷줄 드론)을 넘을 만큼만 뜬다
      d.rotorSpeed = Math.max(0, d.rotorSpeed - dt * 30);
      if (k >= 1 && d.state === "out") { d.state = "bin"; d.light.color.setHex(0x55303a); d.glow.visible = false; }
    } else if (d.state === "bin") { calm = 0; d.rotorSpeed = 0; }
    else if (d.state === "go") {                  // 합격한 드론은 나르미를 따라 떠오른다
      d.rotorSpeed = 46;
      var fp = C.flight.pos;
      h.position.x = Q.lerp(h.position.x, fp.x + (d.i - 2.5) * 2.4, Math.min(1, dt * 1.6));
      h.position.z = Q.lerp(h.position.z, fp.z - 6, Math.min(1, dt * 1.6));
      h.position.y = Q.lerp(h.position.y, fp.y - 5, Math.min(1, dt * 1.3));
    }
    for (i = 0; i < d.rotors.length; i++) d.rotors[i].rotation.y += dt * d.rotorSpeed;

    // 자세: 정상은 반듯하게 서서 천천히 좌우를 둘러본다
    if (d.state === "bin") { yaw = d.spin; rz = 0.3; rx = -0.12; }
    else {
      yaw = Math.sin(t * 0.7 + d.ph) * 0.4;
      if (d.kind === "bent") { d.spin += dt * 1.5 * calm; yaw = d.spin; rz = 0.27 * calm + 0.3 * (1 - calm); rx = Math.sin(t * 5.2) * 0.06 * calm; }
      else if (d.kind === "prop") { rz = d.tilt * (0.07 + 0.05 * Math.sin(t * 2.6)) * calm; d.spin = yaw; }
      else if (d.kind === "crack") {
        rx = Math.sin(t * 23 + d.ph) * 0.03 * calm; d.spin = yaw;
        if (d.state === "belt" || d.state === "in") { d.emit -= dt; if (d.emit <= 0) { d.emit = 0.17; puff(h.position.x, h.position.y + g.position.y + 1.2, h.position.z); } }
      } else d.spin = yaw;
      if (d.state === "out") { rz += 0.3 * (1 - calm); rx += -0.12 * (1 - calm); }
    }
    g.rotation.set(rx, yaw, rz);
    if (d.pivot) { d.pivot.rotation.z = Math.sin(t * 5.3 + d.ph) * 0.75 * (0.25 + 0.75 * calm); d.pivot.rotation.x = Math.sin(t * 3.1) * 0.3 * calm; }

    // 불빛
    if (d.state !== "bin") {
      var on = 1, big = 1.3 + Math.sin(t * 3 + d.ph) * 0.12;
      if (d.kind === "cam") { on = Math.sin(t * 9 + d.ph) > 0 ? 1 : 0; d.light.color.setHex(on ? 0xff3b3b : 0x5a1616); d.glow.material.color.setHex(0xff3b3b); big = on ? 2.9 : 0.4; }
      else if (d.kind === "crack") { on = Math.sin(t * 17 + d.ph) > -0.3 ? 1 : 0; d.light.color.setHex(on ? 0xffa02a : 0x5a3a16); d.glow.material.color.setHex(0xffa02a); big = on ? 1.7 : 0.4; }
      d.glow.scale.setScalar(big);
    }

    // 표시들
    if (d.mark) { d.markT += dt; d.mark.scale.setScalar((d.state === "bin" ? 3.6 : 5) * pop(Math.min(1, d.markT * 4))); d.mark.position.y = d.state === "bin" ? 6 : 7; }
    if (d.ok) { d.okT -= dt; d.ok.visible = d.okT > 0; if (d.okT > 0) d.ok.scale.setScalar(5 * pop(Math.min(1, (1.5 - d.okT) * 4)) * Math.min(1, d.okT * 4)); }
    if (d.stamp) {                                // 도장: 위에서 크게 내려와 쿵
      d.stampT += dt; k = Math.min(1, d.stampT / 0.16);
      d.stamp.scale.setScalar(5.6 * (2.4 - 1.4 * k) * (k >= 1 ? 1 + Math.sin(Math.min(d.stampT - 0.16, 0.3) * 10.5) * 0.12 : 1));
      d.stamp.material.opacity = k;
      if (d.state === "belt") g.position.y = LEG * SIZE - Math.sin(Q.clamp((d.stampT - 0.16) / 0.3, 0, 1) * Math.PI) * 0.35;
    }
  }
  function stampNext() {
    for (var i = 0; i < drones.length; i++) {
      var d = drones[i]; if (d.bad || d.stamp) continue;
      d.stamp = sprite(markTex("pass"), { opacity: 0 }); d.stamp.position.set(0, 7, 0); d.holder.add(d.stamp); d.stampT = 0;
      var p = d.holder.position.clone(); p.y += 3; C.burst(p, 0x7dffa0); window.Sound.fx.stamp();
      return true;
    }
    return false;
  }

  // ---------- 장면 넘기기 ----------
  function land(ctx) {                            // 도착: 내려서 검사관을 만난다
    phase = "meet"; ctx.setTarget(null); if (beam) { Q.scene.remove(beam); beam = null; }
    var cams = meetCams(), People = window.People;
    ctx.flight.park(S.x + L.team.x, S.z + L.team.z, -0.6);
    if (officer) officer.rotation.y = 0.6;
    ctx.objective("");
    window.Story.shot(cams.two.pos, cams.two.look, cams.two.fov, true);
    window.Story.play([
      { who: officer || { name: "검사관" }, mood: "wave", cam: cams.two, text: "어서 와요! 여기는 품질 검사장이에요.\n다 만든 드론을 보내기 전에 살펴보는 곳이죠." },
      { who: "dari", cam: cams.team, text: "세금으로 사는 물건이니까 꼼꼼하게!\n불량은 돌려보내고, 합격한 것만 보내자.", on: function () { ctx.team.cheer(); } }
    ], function () {
      phase = "roll"; phaseT = 0; if (bigSign) { bigSign.visible = false; bigSign.userData.on = false; }       // 검사대 화면에서는 큰 간판이 안내 글씨와 겹치므로 숨긴다
      ctx.flight.park(S.x + L.team.x, S.z + L.team.z, 0);
      if (officer) { officer.rotation.y = 0; People.setMood(officer, "idle"); }
      spawnDrones();
      var c = beltCam(); window.Story.shot(c.pos, c.look, c.fov);
      setBanner("검사대에 드론 6대가 올라와요");
    });
  }
  function startPick(ctx) {
    phase = "pick"; phaseT = 0; lastFind = clock; autoT = clock;
    items = drones.map(function (d) { var it = { object: d.holder, data: d, disabled: false }; d.item = it; return it; });
    window.Story.pick(items, function (it) { choose(it.data); });
    setBanner(OBJ + " (0/" + BAD + ")"); ctx.objective(OBJ + " (0/" + BAD + ")");
    tell("프로펠러 4개, 반듯한 몸, 초록 불이면 정상이에요. 이상한 드론을 눌러 주세요!", 6);
  }
  function closing(ctx) {
    phase = "end"; setBanner(""); tell("");                  // 큰 간판은 다시 띄우지 않는다 (에필로그 읍내 장면을 가리지 않게)
    var cams = meetCams(), c = beltCam();
    window.Story.play([
      { who: officer || { name: "검사관" }, mood: "cheer", cam: c, text: "합격한 드론만 보내요.\n이게 국민과의 약속이에요." }
    ], function () {
      window.Story.pick(null); window.Story.free();
      if (officer) window.People.setMood(officer, "wave");
      var st = (window.Sets && window.Sets.STATION) || { x: 120, z: 300 }, p = ctx.flight.pos;
      ctx.flight.takeoff(Math.atan2(250 - p.x, 200 - p.z), 26);      // 5장 첫 길목(산 고개) 쪽으로
      drones.forEach(function (d) { if (!d.bad) d.state = "go"; });
      window.Sound.fx.good();
      phase = "out"; exitT = 1.5;
    });
  }
  function score() { return Q.clamp(100 - misses * PENALTY, MIN_SCORE, 100); }

  window.Chapters.check = {
    start: function (ctx) {
      this.cleanup();
      C = ctx; clock = 0; phaseT = 0; found = 0; misses = 0; stamped = 0; hinted = false; bubbleT = 0;
      buildSite(); buildUi();
      phase = "fly";
      beam = ctx.beam(S.x, S.z, 0x7fe0ff);
      ctx.setTarget(S.x, S.y + 20, S.z);
      ctx.objective("검사장으로 가세요");
    },
    update: function (dt, t, ctx) {
      var i, p, k, c;
      clock += dt; phaseT += dt;
      // 내려앉을 때 카메라가 큰 간판 바로 앞을 지나면 간판이 화면을 다 가린다 → 가까우면 잠깐 숨긴다
      if (bigSign && phase !== "roll" && bigSign.userData.on !== false) {
        bigSign.getWorldPosition(signPos); bigSign.visible = signPos.distanceTo(Q.camera.position) > 48;
      }
      for (i = 0; i < drones.length; i++) moveDrone(drones[i], dt, t);
      for (i = 0; i < puffs.length; i++) {
        p = puffs[i]; if (p.t >= p.life) continue;
        p.t += dt; k = p.t / p.life;
        if (k >= 1) { p.m.visible = false; continue; }
        p.m.position.y += dt * 3.2; p.m.scale.setScalar(k < 0.7 ? 0.5 + k * 1.5 : 1.55 * (1 - k) / 0.3 + 0.01);
      }
      if (bubbleT > 0) { bubbleT -= dt; if (bubbleT <= 0) tell(""); }

      if (phase === "fly") {
        if (Math.hypot(ctx.flight.pos.x - S.x, ctx.flight.pos.z - S.z) < ARRIVE) land(ctx);
        return;
      }
      if (phase === "roll" || phase === "pick" || phase === "stamp") {   // 화면 크기가 바뀌어도 6대가 다 보이게 구도를 다시 잡는다
        c = beltCam(); window.Story.shot(c.pos, c.look, c.fov);
      }
      if (phase === "roll") {
        if (beltMap) beltMap.offset.x -= dt * ROLL_SPEED / 4;
        for (i = 0; i < drones.length; i++) if (drones[i].state !== "belt") return;
        if (drones.length) startPick(ctx);
      } else if (phase === "pick") {
        if (!hinted && clock - lastFind > 14) {     // 오래 못 찾으면 한 번 귀띔
          var b = nextBad(); hinted = true; if (b) tell("힌트! " + HINT[b.kind], 5);
        }
      } else if (phase === "stamp") {               // 남은 3대에 합격 도장을 차례로
        if (stamped < N - BAD) { if (phaseT > 1.1 + stamped * 0.55) { stampNext(); stamped++; } }
        else if (stamped === N - BAD && phaseT > 1.1 + stamped * 0.55) {
          stamped++; ctx.team.cheer(); if (officer) window.People.setMood(officer, "cheer"); bubbleT = 0;
          if (bubble) { bubbleText.textContent = "검사 끝! 합격 3대, 돌려보냄 3대."; bubble.style.display = "block"; }
          setBanner("검사 완료!"); window.Sound.fx.good();
        } else if (phaseT > 1.1 + (N - BAD) * 0.55 + 1.6) closing(ctx);
      } else if (phase === "out") {
        exitT -= dt; if (exitT <= 0) { phase = "done"; return score(); }
      }
    },
    // 테스트 봇용: 검사대 장면에서 0.6초에 하나씩 불량 드론을 정답 처리한다 (클릭과 같은 choose를 지난다)
    auto: function () {
      if (phase !== "pick" || clock - autoT < 0.6) return;
      autoT = clock; choose(nextBad());
    },
    // 확인용: 지금 장면과 드론 상태
    peek: function () {
      return { phase: phase, found: found, misses: misses, site: { x: S.x, y: S.y, z: S.z },
               drones: drones.map(function (d) { return { kind: d.kind, bad: d.bad, state: d.state, holder: d.holder }; }) };
    },
    cleanup: function () {
      drones.forEach(function (d) { Q.scene.remove(d.holder); });
      puffs.forEach(function (p) { Q.scene.remove(p.m); });
      if (beam) Q.scene.remove(beam);
      mats.forEach(function (m) { m.dispose(); });
      drones = []; puffs = []; mats = []; items = null; beam = null;
      setBanner(""); if (bubble) bubble.style.display = "none"; bubbleT = 0;
      if (window.Story) { window.Story.pick(null); window.Story.free(); }
      if (officer && phase !== "done" && phase !== "out") window.People.setMood(officer, "idle");
      phase = "idle";
    }
  };
})();
