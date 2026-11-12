// 2장 공정 입찰 (이야기형): 나라장터로 날아가 내린 뒤, 개찰대에 놓인 입찰서 5장 중 수상한 3장을 눌러 가려낸다.
// 규칙: 값이 서로 똑같은 짝(담합 의심) 2장 + 서류가 빠진 1장은 걸러내고, 남은 정상 2장 중 값이 더 알맞은(낮은) 곳이 낙찰.
// 흐름: fly(비행) → talk1(도착 컷신) → deal(카드가 놓임) → pick(클릭 판단) → win(낙찰 도장) → talk2(마무리 컷신) → end(이륙, 점수)
(function () {
  "use strict";
  var Q = window.Q, THREE = Q.THREE, Toon = window.Toon, World = window.World;
  window.Chapters = window.Chapters || {};

  var TOWER = { x: 100, z: 40 };
  var SPOT = { x: 100, z: 78 };                         // 개찰대 맨 앞줄 가운데 (타워 문 앞 평지)
  var CW = 6.4, CH = 8, GAPX = 1.4;                     // 입찰서 카드 크기와 사이 간격
  var BASE_H = 3, STEP_H = 7, STEP_D = 5;               // 개찰대 높이, 뒷줄 단 높이, 단 깊이
  var TILT = -0.16, PITCH = 0.38, FOV = 46;             // 카드가 뒤로 누운 각도, 카메라가 내려다보는 각도
  var NAVY = "#1b2a5c", YELLOW = "#ffd23f";
  var FONT = "'Jua','Malgun Gothic','Apple SD Gothic Neo','Noto Sans KR',sans-serif";
  var NAMES = ["가람기업", "누리산업", "다솜전자", "마루테크", "바다상사", "새별전자", "한울공업", "푸른솔산업", "미르기술", "온새미", "도담산업", "라온테크"];
  var PRICES = [9100, 9200, 9300, 9400, 9500, 9600, 9700, 9800, 9900];   // 만 원 (가상)
  var MSG = {
    goal: "수상한 입찰서 3장을 눌러 가려내세요",
    pairFirst: "둘의 값이 똑같아요! 미리 짜고 들어온 '담합' 같아요 · 반짝이는 짝도 눌러요",
    pair: "담합 적발! 값을 미리 짜면 경쟁이 사라져 세금이 새요",
    docs: "서류가 빠졌어요. 자격을 확인할 수 없으면 뽑을 수 없어요",
    ok: "이 기업은 정상이에요. 값도 다르고 서류도 다 있어요",
    win: "조건을 갖춘 기업 중 가장 알맞은 값을 낸 곳과 계약해요"
  };

  var tower = null, towerHalo = null;
  var stand = null, standKey = "", rows = [3, 2], standW = 0;
  var cards = [], items = [], banner = null, beam = null, stamp = null, winner = null;
  var phase = "fly", clock = 0, wrong = 0, found = 0, said = false;
  var botFrame = false, botClock = 0;
  var gy = 0, team = { x: 0, z: 0 }, camPos = [0, 0, 0], camLook = [0, 0, 0], lastAspect = 0, box = null;
  var theCtx = null;

  function fx(name) { var s = window.Sound && window.Sound.fx; if (s && s[name]) s[name](); }
  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function comma(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ","); }
  function won(n) { return comma(n) + "만 원"; }
  function easeOut(k) { k = Q.clamp(k, 0, 1); return 1 - (1 - k) * (1 - k) * (1 - k); }

  // ---------- 글자 그림 (CanvasTexture) ----------
  function roundRect(c, x, y, w, h, r) {
    c.beginPath(); c.moveTo(x + r, y); c.lineTo(x + w - r, y); c.quadraticCurveTo(x + w, y, x + w, y + r);
    c.lineTo(x + w, y + h - r); c.quadraticCurveTo(x + w, y + h, x + w - r, y + h); c.lineTo(x + r, y + h);
    c.quadraticCurveTo(x, y + h, x, y + h - r); c.lineTo(x, y + r); c.quadraticCurveTo(x, y, x + r, y); c.closePath();
  }
  function canvasOf(w, h) { var cv = document.createElement("canvas"); cv.width = w; cv.height = h; return cv; }
  function texOf(cv) { var tex = new THREE.CanvasTexture(cv); tex.encoding = THREE.sRGBEncoding; if (Q.renderer && Q.renderer.capabilities) tex.anisotropy = Math.min(8, Q.renderer.capabilities.getMaxAnisotropy()); return tex; }
  // 글자판: 내가 만든 재질에는 own 표시를 해 두고 치울 때 함께 버린다 (Toon.mat은 같이 쓰는 재질이라 버리지 않는다)
  function panel(cv, w, h, transparent) {
    var m = new THREE.MeshBasicMaterial({ map: texOf(cv), transparent: !!transparent, depthWrite: !transparent, fog: false });
    m.userData.own = true;
    var p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m); p.userData.noInk = true; return p;
  }
  function spriteOf(cv, w, h) {
    var sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: texOf(cv), transparent: true, depthWrite: false, fog: false }));
    sp.scale.set(w, h, 1); return sp;
  }
  function titleSign(text) {
    var cv = canvasOf(512, 128), c = cv.getContext("2d");
    c.textAlign = "center"; c.textBaseline = "middle"; c.lineJoin = "round"; c.font = "bold 92px " + FONT;
    c.lineWidth = 18; c.strokeStyle = NAVY; c.strokeText(text, 256, 66); c.fillStyle = YELLOW; c.fillText(text, 256, 66);
    return spriteOf(cv, 36, 9);
  }
  // 입찰서 앞면: 기업 이름 / 입찰가 / 서류 표시
  function faceCanvas(name, price, docs) {
    var cv = canvasOf(512, 640), c = cv.getContext("2d");
    c.fillStyle = "#fffaf0"; c.fillRect(0, 0, 512, 640);
    c.fillStyle = NAVY; c.fillRect(0, 0, 512, 104);
    c.textAlign = "center"; c.textBaseline = "middle"; c.lineJoin = "round";
    c.font = "bold 60px " + FONT; c.fillStyle = "#ffffff"; c.fillText("입 찰 서", 256, 56);
    c.font = "bold 76px " + FONT; c.fillStyle = NAVY; c.fillText(name, 256, 186, 470);
    c.strokeStyle = "#d8cdb8"; c.lineWidth = 5; c.setLineDash([14, 12]); c.beginPath(); c.moveTo(40, 250); c.lineTo(472, 250); c.stroke(); c.setLineDash([]);
    c.font = "bold 44px " + FONT; c.fillStyle = "#6b7693"; c.fillText("입찰가", 256, 296);
    roundRect(c, 26, 330, 460, 132, 30); c.fillStyle = YELLOW; c.fill(); c.lineWidth = 8; c.strokeStyle = NAVY; c.stroke();
    c.font = "bold 92px " + FONT; c.fillStyle = NAVY; c.fillText(won(price), 256, 400, 430);
    // 서류 줄: ✔ / ✖ 는 직접 그려 글꼴에 없는 기호 걱정을 없앤다
    var label = docs ? "서류 완비" : "서류 빠짐", col = docs ? "#1e8e3e" : "#d93025";
    roundRect(c, 46, 500, 420, 108, 54); c.fillStyle = docs ? "#dff7e3" : "#ffe3df"; c.fill(); c.lineWidth = 7; c.strokeStyle = col; c.stroke();
    c.font = "bold 62px " + FONT;
    var tw = c.measureText(label).width, icon = 52, x0 = 256 - (icon + 20 + tw) / 2, y0 = 556;
    c.strokeStyle = col; c.lineWidth = 13; c.lineCap = "round"; c.beginPath();
    if (docs) { c.moveTo(x0 + 2, y0 + 2); c.lineTo(x0 + 19, y0 + 19); c.lineTo(x0 + icon, y0 - 21); }
    else { c.moveTo(x0 + 5, y0 - 20); c.lineTo(x0 + icon - 5, y0 + 20); c.moveTo(x0 + icon - 5, y0 - 20); c.lineTo(x0 + 5, y0 + 20); }
    c.stroke();
    c.textAlign = "left"; c.fillStyle = col; c.fillText(label, x0 + icon + 20, y0 + 2);
    return cv;
  }
  // 걸러낸 표시 (빨간 딱지)
  function markCanvas(text) {
    var cv = canvasOf(512, 208), c = cv.getContext("2d");
    roundRect(c, 12, 12, 488, 184, 30); c.fillStyle = "rgba(255,244,240,0.93)"; c.fill(); c.lineWidth = 16; c.strokeStyle = "#e02b20"; c.stroke();
    c.textAlign = "center"; c.textBaseline = "middle"; c.font = "bold 104px " + FONT; c.fillStyle = "#e02b20"; c.fillText(text, 256, 110, 440);
    return cv;
  }
  // 낙찰 도장
  function stampCanvas() {
    var cv = canvasOf(384, 384), c = cv.getContext("2d"), red = "#e02b20";
    c.beginPath(); c.arc(192, 192, 176, 0, Math.PI * 2); c.fillStyle = "rgba(255,246,242,0.92)"; c.fill(); c.lineWidth = 20; c.strokeStyle = red; c.stroke();
    c.beginPath(); c.arc(192, 192, 146, 0, Math.PI * 2); c.lineWidth = 7; c.stroke();
    c.textAlign = "center"; c.textBaseline = "middle"; c.font = "bold 150px " + FONT; c.fillStyle = red; c.fillText("낙찰", 192, 200, 270);
    return cv;
  }
  // 안내 팻말 (컷신 구도에서는 화면 위 목표 글이 숨겨지므로 장면 안에 크게 세운다)
  function drawBanner(text, sub) {
    var cv = banner.userData.cv, c = cv.getContext("2d"), w = cv.width, h = cv.height, two = banner.userData.two;
    c.clearRect(0, 0, w, h);
    roundRect(c, 8, 8, w - 16, h - 16, 40); c.fillStyle = NAVY; c.fill(); c.lineWidth = 10; c.strokeStyle = YELLOW; c.stroke();
    c.textAlign = "center"; c.textBaseline = "middle"; c.fillStyle = YELLOW;
    if (two) {
      var sp = text.indexOf(" ", Math.floor(text.length / 2) - 1), a = sp > 0 ? text.slice(0, sp) : text, b = sp > 0 ? text.slice(sp + 1) : "";
      if (sub) b += (b ? " " : "") + sub;
      c.font = "bold 84px " + FONT; c.fillText(a, w / 2, h * 0.32, w - 60);
      c.fillStyle = "#ffffff"; c.fillText(b, w / 2, h * 0.70, w - 60);
    } else {
      c.font = "bold 78px " + FONT; c.fillText(text + (sub ? "  " + sub : ""), w / 2, h / 2 + 4, w - 70);
    }
    banner.material.map.needsUpdate = true;
  }

  function trash(obj) {
    if (!obj) return;
    if (obj.parent) obj.parent.remove(obj);
    obj.traverse(function (o) {
      if (o.geometry && !o.userData.isInk) o.geometry.dispose();
      var m = o.material;
      if (m && (o.isSprite || (m.userData && m.userData.own))) { if (m.map) m.map.dispose(); m.dispose(); }
    });
  }

  // ---------- 나라장터 타워 (풍경으로 남는다) ----------
  function buildTower() {
    var g = new THREE.Group(), y = Math.max(World.height(TOWER.x, TOWER.z), 0), i, k;
    var base = Toon.mesh(new THREE.CylinderGeometry(11, 13, 6, 8), 0x39507a); base.position.y = 3; g.add(base);
    var body = Toon.mesh(new THREE.CylinderGeometry(7, 9, 30, 8), 0xfff3dc); body.position.y = 21; g.add(body);
    var winMat = Toon.mat(0x7fd8ff, { emissive: 0x2a8fc0, emissiveIntensity: 0.45 });
    for (i = 0; i < 3; i++) {                                    // 층마다 창문 4개
      var wy = 13 + i * 8.5, wr = 9 - (wy - 6) / 30 * 2 + 0.05;
      for (k = 0; k < 4; k++) {
        var a = k * Math.PI / 2 + i * 0.4;
        var w = Toon.mesh(new THREE.BoxGeometry(2.4, 3.4, 0.6), winMat); w.position.set(Math.sin(a) * wr, wy, Math.cos(a) * wr); w.rotation.y = a; g.add(w);
      }
    }
    var door = Toon.mesh(new THREE.BoxGeometry(4, 5, 0.8), 0xffd23f); door.position.set(0, 2.5, 12.2); g.add(door);
    var flare = Toon.mesh(new THREE.CylinderGeometry(12, 7, 4, 8), 0x3ad1c5); flare.position.y = 38; g.add(flare);
    var deck = Toon.mesh(new THREE.CylinderGeometry(12, 12, 5, 8), 0xfff3dc); deck.position.y = 42.5; g.add(deck);
    var glass = Toon.mesh(new THREE.CylinderGeometry(12.3, 12.3, 2, 8), winMat); glass.position.y = 42.8; g.add(glass);
    var roof = Toon.mesh(new THREE.ConeGeometry(13.6, 9, 8), 0x2f6fd0); roof.position.y = 49.5; g.add(roof);
    var pole = Toon.mesh(new THREE.CylinderGeometry(0.5, 0.5, 9, 6), 0x39507a); pole.position.y = 58; g.add(pole);
    var tip = Toon.ball(1.5, Toon.mat(0xffd23f, { emissive: 0xffa800, emissiveIntensity: 0.6 })); tip.position.y = 63; g.add(tip);
    towerHalo = Toon.mesh(new THREE.TorusGeometry(5.2, 0.55, 8, 24), Toon.mat(0xffd23f, { emissive: 0xffa800, emissiveIntensity: 0.5 }));
    towerHalo.rotation.x = Math.PI / 2; towerHalo.position.y = 57; g.add(towerHalo);
    Toon.outline(g, 0.28);
    var sign = titleSign("나라장터"); sign.position.y = 73; g.add(sign);
    g.position.set(TOWER.x, y, TOWER.z); g.scale.setScalar(1.15);
    Q.scene.add(g); return g;
  }

  // ---------- 개찰대 (풍경으로 남는다) ----------
  // 화면 비율에 맞춰 줄 수를 고른다: 가로 화면은 한 줄, 세로 폰은 계단식 여러 줄 (카드가 작아지지 않게)
  function chooseRows() { var a = Q.camera.aspect || 1.6; return a >= 1.45 ? [5] : a >= 0.8 ? [3, 2] : [2, 2, 1]; }
  function rowWidth(n) { return n * CW + (n - 1) * GAPX; }
  function stepTop(r) { return BASE_H + r * STEP_H; }
  function buildStand() {
    var g = new THREE.Group(), r, maxN = 0;
    for (r = 0; r < rows.length; r++) maxN = Math.max(maxN, rows[r]);
    standW = rowWidth(maxN) + 3;
    for (r = 0; r < rows.length; r++) {
      var h = stepTop(r), z = -r * STEP_D;
      var blk = Toon.mesh(new THREE.BoxGeometry(standW, h, STEP_D), 0x39507a); blk.position.set(0, h / 2, z); g.add(blk);
      var top = Toon.mesh(new THREE.BoxGeometry(standW + 0.8, 0.5, STEP_D + (r === 0 ? 0.8 : 0.2)), 0xfff3dc); top.position.set(0, h + 0.25, z + (r === 0 ? 0 : 0.3)); g.add(top);
      var trim = Toon.mesh(new THREE.BoxGeometry(standW + 0.2, 0.5, 0.3), 0xffd23f); trim.position.set(0, h - 0.7, z + STEP_D / 2 + 0.1); g.add(trim);
    }
    [-1, 1].forEach(function (s) {                               // 양옆 기둥과 등
      var post = Toon.mesh(new THREE.CylinderGeometry(0.45, 0.55, BASE_H + 3.2, 8), 0x2f6fd0); post.position.set(s * (standW / 2 + 1.3), (BASE_H + 3.2) / 2, STEP_D / 2 - 0.4); g.add(post);
      var lamp = Toon.ball(0.95, Toon.mat(0xffd23f, { emissive: 0xffa800, emissiveIntensity: 0.6 })); lamp.position.set(s * (standW / 2 + 1.3), BASE_H + 3.9, STEP_D / 2 - 0.4); g.add(lamp);
    });
    Toon.outline(g, 0.14);
    // 앞면 이름판
    var cv = canvasOf(512, 128), c = cv.getContext("2d");
    roundRect(c, 6, 6, 500, 116, 26); c.fillStyle = "#fff3dc"; c.fill(); c.lineWidth = 9; c.strokeStyle = NAVY; c.stroke();
    c.textAlign = "center"; c.textBaseline = "middle"; c.font = "bold 78px " + FONT; c.fillStyle = NAVY; c.fillText("나라장터 개찰대", 256, 68, 470);
    var plate = panel(cv, 7.6, 1.9, false); plate.position.set(0, BASE_H / 2 - 0.25, STEP_D / 2 + 0.06); g.add(plate);
    // 둘레 꾸밈: 돌 광장, 세로 현수막 두 개, 화분
    var plaza = Toon.mesh(new THREE.BoxGeometry(standW + 16, 0.3, 24), 0xd9d3c3); plaza.position.set(0, 0.15, 4); plaza.userData.noInk = true; g.add(plaza);
    var edge = Toon.mesh(new THREE.BoxGeometry(standW + 16.4, 0.32, 0.6), 0xb9b1a0); edge.position.set(0, 0.16, 16); edge.userData.noInk = true; g.add(edge);
    ["공정한 경쟁", "같은 규칙"].forEach(function (txt, i) {
      var sx = (i ? 1 : -1) * (standW / 2 + 6.5), pole = Toon.mesh(new THREE.CylinderGeometry(0.22, 0.22, 11, 8), 0xdddddd); pole.position.set(sx, 5.5, 3); Toon.outline(pole, 0.08); g.add(pole);
      var bc = canvasOf(128, 384), b2 = bc.getContext("2d");
      b2.fillStyle = i ? "#2f6fd0" : "#1b2a5c"; b2.fillRect(0, 0, 128, 384); b2.fillStyle = "#ffd23f"; b2.textAlign = "center"; b2.textBaseline = "middle"; b2.font = "bold 62px " + FONT;
      txt.replace(" ", "").split("").forEach(function (ch, k, arr) { b2.fillText(ch, 64, 384 / (arr.length + 1) * (k + 1)); });
      var ban = panel(bc, 2.2, 6.6, false); ban.position.set(sx + 1.25, 7.2, 3); g.add(ban);
    });
    [[-1, 11], [1, 11]].forEach(function (q) {
      var pot = new THREE.Group(), bx = Toon.mesh(new THREE.BoxGeometry(2.4, 1.2, 2.4), 0x9a6a44); bx.position.y = 0.6; pot.add(bx);
      [[0, 0, 0.9], [0.6, 0.4, 0.6], [-0.5, 0.3, 0.65]].forEach(function (b) { var f = Toon.ball(b[2], b[2] > 0.8 ? 0x5fae4e : 0xff9ec1); f.position.set(b[0], 1.5 + b[1], b[1] - 0.2); pot.add(f); });
      Toon.outline(pot, 0.07); pot.position.set(q[0] * (standW / 2 + 3), 0, q[1]); g.add(pot);
    });
    g.position.set(SPOT.x, gy, SPOT.z);
    Q.scene.add(g); return g;
  }

  // ---------- 입찰서 카드 ----------
  function buildCard(info) {
    var g = new THREE.Group(), inner = new THREE.Group(); g.add(inner);   // g: 클릭 대상(위치), inner: 내 움직임(기울기·흔들기·크기)
    var board = Toon.mesh(new THREE.BoxGeometry(CW, CH, 0.4), 0xfffaf0); board.position.y = CH / 2 + 0.6; inner.add(board);
    var foot = Toon.mesh(new THREE.BoxGeometry(CW * 0.72, 0.6, 1.7), 0x2f6fd0); foot.position.y = 0.3; inner.add(foot);
    Toon.outline(inner, 0.11);
    var face = panel(faceCanvas(info.name, info.price, info.docs), CW - 0.45, (CW - 0.45) * 1.25, false); face.position.set(0, CH / 2 + 0.6, 0.215); inner.add(face);
    var glowMat = new THREE.MeshBasicMaterial({ color: 0xffd23f, transparent: true, opacity: 0.9, depthWrite: false, fog: false }); glowMat.userData.own = true;
    var glow = new THREE.Mesh(new THREE.PlaneGeometry(CW + 1.3, CH + 1.3), glowMat); glow.userData.noInk = true; glow.position.set(0, CH / 2 + 0.6, -0.3); glow.visible = false; inner.add(glow);
    inner.rotation.x = TILT; g.visible = false;
    return { g: g, inner: inner, board: board, face: face, glow: glow, mark: null, kind: info.kind, price: info.price, name: info.name,
      home: new THREE.Vector3(), state: "wait", t: 0, at: 0, shake: 0, hint: false, markT: 0, item: null };
  }
  // 매번 새로 뽑는다: 값이 같은 짝 2장 + 서류 빠진 1장 + 정상 2장(값이 서로 다름)
  function makeBids() {
    var n = shuffle(NAMES.slice()), p = shuffle(PRICES.slice());
    return shuffle([
      { name: n[0], price: p[0], docs: true, kind: "pair" },
      { name: n[1], price: p[0], docs: true, kind: "pair" },
      { name: n[2], price: p[1], docs: false, kind: "docs" },
      { name: n[3], price: p[2], docs: true, kind: "ok" },
      { name: n[4], price: p[3], docs: true, kind: "ok" }
    ]);
  }
  function layCards() {
    var bids = makeBids(), k = 0, r, i;
    cards = []; items = [];
    for (r = 0; r < rows.length; r++) {
      for (i = 0; i < rows[r]; i++) {
        var c = buildCard(bids[k]);
        c.home.set(SPOT.x + (i - (rows[r] - 1) / 2) * (CW + GAPX), gy + stepTop(r) + 0.5, SPOT.z - r * STEP_D + 0.4);
        c.g.position.copy(c.home); c.at = 0.25 + k * 0.42;
        c.item = { object: c.g, data: c, disabled: false };
        Q.scene.add(c.g); cards.push(c); items.push(c.item); k++;
      }
    }
  }
  function buildBanner() {
    var two = rows[0] < 3, bw = Math.min(standW - 3, 30), cv = two ? canvasOf(768, 320) : canvasOf(1280, 168);
    banner = panel(cv, bw, bw * cv.height / cv.width, true);
    banner.userData.cv = cv; banner.userData.two = two;
    var top = rows.length - 1;
    banner.userData.h = bw * cv.height / cv.width;
    banner.position.set(SPOT.x, gy + stepTop(top) + 0.5 + 0.6 + CH + (two ? 3.2 : 1.3) + banner.userData.h / 2, SPOT.z - top * STEP_D - 0.6);
    banner.rotation.x = TILT; banner.visible = false;
    Q.scene.add(banner);
  }

  // ---------- 카메라: 다섯 장과 안내 팻말이 화면 비율에 상관없이 다 들어오게 거리를 맞춘다 ----------
  function fitCamera(snap) {
    var top = rows.length - 1, hw = (standW - 3) / 2 + 0.9;        // 가로는 카드 줄에 딱 맞춘다 (개찰대 양 끝 기둥은 잘려도 된다)
    var y0 = gy + 0.4, y1 = banner ? banner.position.y + banner.userData.h / 2 + 0.4 : gy + stepTop(top) + CH + 3;
    var z0 = SPOT.z - top * STEP_D - STEP_D / 2, z1 = SPOT.z + STEP_D / 2 + 0.6;
    // 왼쪽에 선 나르미·달이도 화면에 다 들어오게 왼쪽을 넓혀 잡는다
    var hwL = (SPOT.x - team.x) + 3.2; if (!(hwL > hw) || hwL > 40) hwL = hw;
    z1 = Math.max(z1, team.z + 2.5);
    var cx = SPOT.x - (hwL - hw) / 2, cy = (y0 + y1) / 2, cz = (z0 + z1) / 2; hw = (hwL + hw) / 2;
    var fy = -Math.sin(PITCH), fz = -Math.cos(PITCH), uy = Math.cos(PITCH), uz = -Math.sin(PITCH);   // 카메라 앞·위 방향 (옆은 +x)
    var tanV = Math.tan(Q.effFov(FOV) * Math.PI / 360), tanH = tanV * (Q.camera.aspect || 1.6);
    function fits(d) {
      var px = cx, py = cy - fy * d, pz = cz - fz * d, ok = true;
      [-hw, hw].forEach(function (x) { [y0, y1].forEach(function (y) { [z0, z1].forEach(function (z) {
        var dx = cx + x - px, dy = y - py, dz = z - pz, depth = dy * fy + dz * fz, v = dy * uy + dz * uz;
        if (depth < 1 || Math.abs(dx) > depth * tanH * 0.93 || Math.abs(v) > depth * tanV * 0.86) ok = false;
      }); }); });
      return ok;
    }
    var lo = 8, hi = 260, i;
    for (i = 0; i < 22; i++) { var mid = (lo + hi) / 2; if (fits(mid)) hi = mid; else lo = mid; }
    camPos = [cx, cy - fy * hi, cz - fz * hi]; camLook = [cx, cy, cz]; lastAspect = Q.camera.aspect;
    window.Story.shot(camPos, camLook, FOV, !!snap, true);
  }

  // ---------- 판단 ----------
  function reject(c, text) {
    c.state = "out"; c.t = 0; c.hint = false; c.glow.visible = false; c.item.disabled = true;
    c.mark = panel(markCanvas(text), CW * 0.96, CW * 0.96 * 208 / 512, true);
    c.mark.position.set(0, CH / 2 + 0.6, 0.34); c.mark.rotation.z = 0.2; c.markT = 0; c.inner.add(c.mark);
    c.board.material = Toon.mat(0xb9bec9);
    found++; fx("good");
    if (theCtx) theCtx.burst(new THREE.Vector3(c.home.x, c.home.y + CH / 2 + 0.6, c.home.z + 1), 0xff8a66);
  }
  // 클릭 처리 (자동 풀이도 이 함수를 그대로 탄다)
  function onPick(item) {
    var c = item && item.data, ctx = theCtx;
    if (phase !== "pick" || !c || c.state !== "idle") return;
    if (c.kind === "ok") {
      wrong++; c.shake = 0.7; fx("bad");
      ctx.toast(MSG.ok, 2600);
      return;
    }
    if (c.kind === "docs") { reject(c, "서류 빠짐"); ctx.toast(MSG.docs, 2200); }
    else {
      var mate = cards.filter(function (o) { return o.kind === "pair" && o !== c; })[0];
      reject(c, "담합 의심");
      if (mate && mate.state === "idle") { mate.hint = true; ctx.toast(MSG.pairFirst, 3000); }
      else ctx.toast(MSG.pair, 2200);
    }
    if (found >= 3) {
      phase = "win"; clock = 0; window.Story.pick(null);
      drawBanner("공정하게 가려냈어요!", "");
      ctx.objective("남은 기업 중에서 낙찰 기업을 뽑아요");
    } else {
      drawBanner(MSG.goal, "(" + found + "/3)");
      ctx.objective(MSG.goal + " (" + found + "/3)");
    }
  }

  function updateCards(dt, t) {
    for (var i = 0; i < cards.length; i++) {
      var c = cards[i], e;
      if (c.state === "wait") {                                  // 차례가 되면 위에서 "착" 하고 내려앉는다
        if (phase === "deal" && clock >= c.at) { c.state = "drop"; c.t = 0; c.g.visible = true; }
      } else if (c.state === "drop") {
        c.t += dt; e = Q.clamp(c.t / 0.3, 0, 1);
        c.g.position.set(c.home.x, c.home.y + (1 - e * e) * 15, c.home.z);
        c.inner.rotation.z = (1 - e) * (i % 2 ? 0.5 : -0.5);
        if (e >= 1) { c.state = "idle"; c.t = 0; fx("flap"); if (theCtx) theCtx.burst(new THREE.Vector3(c.home.x, c.home.y + 0.4, c.home.z + 1.2), 0xffffff); }
      } else if (c.state === "idle") {
        c.t += dt;
        var sq = c.t < 0.25 ? Math.sin(c.t / 0.25 * Math.PI) * 0.12 : 0;   // 내려앉을 때 살짝 눌렸다 펴짐
        c.inner.scale.set(1 + sq, 1 - sq, 1);
        if (c.shake > 0) { c.shake -= dt; c.inner.rotation.y = Math.sin(c.shake * 26) * 0.42 * Math.max(0, c.shake / 0.7); if (c.shake <= 0) c.inner.rotation.y = 0; }
        if (c.hint) {                                            // 값이 같은 짝: 노란 테두리가 반짝인다
          c.glow.visible = true; c.glow.material.opacity = 0.55 + Math.sin(t * 11) * 0.4;
          c.g.position.y = c.home.y + Math.abs(Math.sin(t * 5.5)) * 0.45;
        }
      } else if (c.state === "out") {                            // 걸러낸 카드: 빨간 표시가 붙고 뒤로 물러난다
        c.t += dt; e = easeOut(c.t / 0.45);
        // 한 줄(가로 화면)은 뒤로 눕고, 계단식 여러 줄(세로 폰)은 뒷줄 계단 벽에 파묻히지 않게 그 자리에서 살짝 앞으로 나와 작아진다
        var stacked = rows.length > 1;
        c.g.position.set(c.home.x, c.home.y, c.home.z + (stacked ? 0.5 : -1.5) * e);
        c.inner.rotation.x = TILT - (stacked ? 0.06 : 0.42) * e; c.inner.rotation.y = 0; c.inner.scale.setScalar(1 - (stacked ? 0.1 : 0.14) * e);
        c.face.material.color.setScalar(1 - 0.42 * e);
        if (c.mark) { c.markT += dt; var mk = Q.clamp(c.markT / 0.16, 0, 1); c.mark.scale.setScalar(2.4 - 1.4 * mk + (mk >= 1 ? Math.max(0, 0.18 - (c.markT - 0.16)) : 0)); }
      } else if (c.state === "win") {                            // 낙찰 기업: 앞으로 나온다
        c.t += dt; e = easeOut(c.t / 0.7);
        c.g.position.lerpVectors(c.home, c.goal, e);
        c.inner.rotation.x = Q.lerp(TILT, -PITCH, e); c.inner.scale.setScalar(1 + 0.12 * e + Math.sin(t * 3) * 0.01);
      }
    }
    if (stamp) {                                                 // 도장: 크게 떠 있다가 쿵
      var s = stamp.userData; s.t += dt;
      var k = Q.clamp(s.t / 0.2, 0, 1);
      stamp.scale.setScalar(3.2 - 2.2 * k * k + (k >= 1 ? Math.max(0, 0.22 - (s.t - 0.2) * 1.4) : 0));
      stamp.material.opacity = Q.clamp(s.t / 0.1, 0, 1);
      if (k >= 1 && !s.hit) {
        s.hit = true; fx("stamp"); theCtx.team.cheer();
        var p = new THREE.Vector3(); stamp.getWorldPosition(p); theCtx.burst(p, 0xffd23f); theCtx.burst(p.clone().setY(p.y + 0.01), 0xff8a66);
        
        drawBanner("낙찰! " + winner.name, won(winner.price));
      }
    }
  }

  function cutCams() {
    // 세로 폰: 가로용 구도는 카메라가 읍내 건물 속이나 뒤로 가 버리므로, 건물 앞에서 탑·개찰대·나르미 팀을 함께 담는 자리를 따로 쓴다
    if (rows.length > 1) return {
      wide: { pos: [team.x - 2.7, gy + 6.3, SPOT.z + 22], look: [SPOT.x + 3, gy + 13, SPOT.z - 22], fov: 58, exact: true },
      team: { pos: [team.x - 5, gy + 7, team.z + 17], look: [team.x + 2.5, gy + 4, team.z - 2], fov: 50, exact: true }
    };
    return {
      wide: { pos: [team.x - 9, gy + 6.5, SPOT.z + 36], look: [SPOT.x + 3, gy + 15, SPOT.z - 22], fov: 58 },
      team: { pos: [team.x + 8.5, gy + 4.8, team.z + 9.5], look: [team.x, gy + 3.5, team.z], fov: 40 }
    };
  }
  function arrive(ctx) {
    phase = "talk1"; ctx.setTarget(null);
    if (beam) { ctx.remove(beam); beam.geometry.dispose(); beam.material.dispose(); beam = null; }
    ctx.flight.park(team.x, team.z, Math.PI / 2);                // 개찰대 옆에 서서 개찰대를 바라본다
    var cams = cutCams();
    window.Story.shot(cams.wide.pos, cams.wide.look, cams.wide.fov, true, cams.wide.exact);
    window.Story.play([
      { who: "narmi", cam: cams.wide, text: "전국의 학교·병원·소방서가 필요한 걸 여기 나라장터에서 사.\n기업은 누구나 같은 규칙으로 겨루고." },
      { who: "dari", cam: cams.team, text: "어? 수상한 입찰서가 섞여 있는 것 같아.\n값과 서류를 잘 보고 가려내자!" }
    ], function () {
      layCards(); buildBanner(); fitCamera(false);
      banner.visible = true; drawBanner(MSG.goal, "(0/3)");
      phase = "deal"; clock = 0;
      ctx.objective(MSG.goal);
    });
  }
  function startWin(ctx) {
    var oks = cards.filter(function (c) { return c.kind === "ok"; });
    winner = oks[0].price <= oks[1].price ? oks[0] : oks[1];
    // 카메라 쪽으로 35%쯤 다가온 자리 (화면 가운데보다 조금 아래)
    var k = 0.36;
    winner.goal = new THREE.Vector3(Q.lerp(camLook[0], camPos[0], k), Q.lerp(camLook[1], camPos[1], k) - (CH / 2 + 0.6) * 0.9, Q.lerp(camLook[2], camPos[2], k));
    winner.state = "win"; winner.t = 0; winner.glow.visible = true; winner.glow.material.opacity = 0.95;
    fx("star");
  }
  function dropStamp() {
    stamp = panel(stampCanvas(), 5.2, 5.2, true);
    stamp.material.depthTest = false; stamp.renderOrder = 5;
    stamp.position.set(1.1, CH / 2 + 0.2, 0.5); stamp.rotation.z = -0.22; stamp.userData.t = 0; stamp.userData.hit = false;
    winner.inner.add(stamp);
  }
  function ending(ctx) {
    phase = "talk2";
    var cams = cutCams();
    window.Story.play([
      { who: "narmi", text: "공정하게 뽑았으니 누구도 억울하지 않아.\n이게 나라장터의 약속이야." },
    ], function () {
      window.Story.pick(null); window.Story.free();
      ctx.flight.takeoff(Math.atan2(-110 - team.x, 150 - team.z), 28);     // 서쪽 공장·비축기지 쪽을 보고 날아오른다
      phase = "end";
    });
  }

  function clearScene() {
    cards.forEach(function (c) { trash(c.g); });
    cards = []; items = []; winner = null; stamp = null;
    trash(banner); banner = null;
    if (beam) { Q.scene.remove(beam); beam.geometry.dispose(); beam.material.dispose(); beam = null; }
  }

  window.Chapters.bid = {
    start: function (ctx) {
      theCtx = ctx; clearScene();
      phase = "fly"; clock = 0; wrong = 0; found = 0; said = false; botFrame = false; botClock = 0;
      gy = Math.max(World.height(SPOT.x, SPOT.z), 0);
      if (!tower) tower = buildTower();
      rows = chooseRows();
      if (!stand || standKey !== rows.join("")) { trash(stand); stand = buildStand(); standKey = rows.join(""); }
      else { var mx = 0; rows.forEach(function (n) { mx = Math.max(mx, n); }); standW = rowWidth(mx) + 3; }
      team.x = SPOT.x - standW / 2 - 4; team.z = SPOT.z + 2;
      if (rows.length > 1) { team.x -= 1.5; team.z += 3; }       // 세로 폰(계단식): 개찰대 기둥 뒤에 가려지지 않게 조금 바깥·앞으로
      if (ctx.flight.parked && ctx.flight.parked()) ctx.flight.takeoff(undefined, 28);   // 앞 장이 땅에서 끝났더라도 비행으로 시작
      ctx.setTarget(SPOT.x, gy + 30, SPOT.z + 6);
      beam = ctx.beam(SPOT.x, SPOT.z + 6, 0x7fd8ff);
      ctx.objective("나라장터로 가세요");
    },
    update: function (dt, t, ctx) {
      theCtx = ctx;
      var bot = botFrame; botFrame = false;
      if (towerHalo) { towerHalo.rotation.z += dt * 1.2; towerHalo.position.y = 57 + Math.sin(t * 2) * 0.8; }
      if (phase === "fly") {
        clock += dt;
        var pos = ctx.flight.pos, d = Math.hypot(pos.x - SPOT.x, pos.z - (SPOT.z + 6));
        if (!said && (clock > 7 || d < 150)) { said = true; ctx.say("narmi", "저기 파란 지붕이 나라장터야. 드론을 많이 만들 기업은 저기서 공정하게 뽑아."); }
        if (d < 35) arrive(ctx);
        return;
      }
      if (phase === "talk1" || phase === "talk2") return;
      if (phase === "end") return Q.clamp(100 - wrong * 15, 40, 100);

      if (Math.abs(Q.camera.aspect - lastAspect) > 0.01) fitCamera(false);   // 창 크기가 바뀌면 구도를 다시 맞춘다
      clock += dt;
      if (phase === "deal") {
        updateCards(dt, t);
        if (cards.every(function (c) { return c.state === "idle"; }) && clock > cards[cards.length - 1].at + 0.6) {
          phase = "pick"; clock = 0; botClock = 0;
          window.Story.pick(items, onPick);
          
        }
      } else if (phase === "pick") {
        updateCards(dt, t);
        if (bot) {                                               // 자동 풀이: 0.6초에 한 장씩, 실제 클릭과 같은 함수로
          botClock += dt;
          if (botClock >= 0.6) {
            botClock = 0;
            var next = cards.filter(function (c) { return c.kind !== "ok" && c.state === "idle"; })[0];
            if (next) onPick(next.item);
          }
        }
      } else if (phase === "win") {
        if (!winner && clock > 0.9) startWin(ctx);
        if (winner && !stamp && clock > 1.9) dropStamp();
        updateCards(dt, t);
        if (clock > 6.2) ending(ctx);
      }
    },
    cleanup: function () {
      clearScene();
      window.Story.pick(null); window.Story.free();
      document.body.style.cursor = "";
      /* 나라장터 타워와 개찰대는 마을 풍경으로 남긴다 */
    },
    auto: function () { botFrame = true; }
  };
})();
