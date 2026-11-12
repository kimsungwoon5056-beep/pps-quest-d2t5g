// 세상: 한국 산골 계곡 (산, 강, 논, 소나무, 기와집 마을, 구름, 하늘)
(function () {
  "use strict";
  var Q = window.Q, THREE = Q.THREE, Toon = window.Toon;
  var SIZE = 1100, WATER = 0;

  // ---------- 땅 높이 ----------
  function hash(x, z) { var s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453; return s - Math.floor(s); }
  function noise(x, z) {
    var xi = Math.floor(x), zi = Math.floor(z), xf = x - xi, zf = z - zi;
    var u = xf * xf * (3 - 2 * xf), v = zf * zf * (3 - 2 * zf);
    var a = hash(xi, zi), b = hash(xi + 1, zi), c = hash(xi, zi + 1), d = hash(xi + 1, zi + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }
  function fbm(x, z) { return noise(x, z) * 0.55 + noise(x * 2.1, z * 2.1) * 0.3 + noise(x * 4.3, z * 4.3) * 0.15; }
  function riverX(z) { return 70 * Math.sin(z * 0.0075) + 25 * Math.sin(z * 0.019 + 1.3); }
  function riverDist(x, z) { return Math.abs(x - riverX(z)); }
  function height(x, z) {
    var d = riverDist(x, z), r = Math.hypot(x, z);
    var bed = -5 + Q.smooth(4, 22, d) * 7.5;                         // 강바닥 → 강둑(2.5)
    var hills = Q.smooth(120, 330, d) * (38 + 60 * fbm(x * 0.006, z * 0.006));
    var bumps = Q.smooth(100, 200, d) * (fbm(x * 0.02 + 9, z * 0.02) - 0.5) * 16;
    var rim = Q.smooth(360, 520, r) * 95;                            // 바깥을 둘러싼 큰 산
    return bed + hills + bumps + rim;
  }
  function isFlat(x, z) { var d = riverDist(x, z); return d > 26 && d < 112 && Math.hypot(x, z) < 380; }

  // ---------- 흙길 ----------
  var PATHS = [[-95, -170, riverX(-170) - 24, -170], [-95, -170, riverX(-60) - 80, -60], [-70, 250, riverX(250) - 24, 250], [-95, -170, -60, -250]];
  function onRoad(x, z) {
    if (Math.abs(x - 122) < 4.2 && z > -14 && z < 122) return true;                 // 남북 큰길
    if (Math.abs(z - 95) < 4 && x > 70 && x < 166) return true;                     // 동서 길
    return false;
  }
  function onPath(x, z) {
    for (var i = 0; i < PATHS.length; i++) {
      var p = PATHS[i], dx = p[2] - p[0], dz = p[3] - p[1], L = dx * dx + dz * dz, t = Q.clamp(((x - p[0]) * dx + (z - p[1]) * dz) / L, 0, 1);
      var ex = p[0] + dx * t - x, ez = p[1] + dz * t - z, wob = Math.sin(t * 9 + i) * 3;
      if (Math.hypot(ex + wob * dz / Math.sqrt(L), ez - wob * dx / Math.sqrt(L)) < 3.2) return true;
    }
    return false;
  }

  // ---------- 땅 ----------
  function buildGround() {
    var seg = Q.isTouch ? 130 : 180;
    var g = new THREE.PlaneGeometry(SIZE, SIZE, seg, seg); g.rotateX(-Math.PI / 2);
    var p = g.attributes.position;
    for (var i = 0; i < p.count; i++) p.setY(i, height(p.getX(i), p.getZ(i)));
    g.computeVertexNormals();                                        // 부드러운 땅 (삼각형마다 색이 끊기던 톱니 무늬 없앰)
    var ground = new THREE.Mesh(g, new THREE.MeshToonMaterial({ map: paintGround(Q.isTouch ? 768 : 1024), gradientMap: softRamp }));
    Q.scene.add(ground);

    var wcv = document.createElement("canvas"); wcv.width = wcv.height = 256; var w2 = wcv.getContext("2d");
    w2.fillStyle = "#3aa7e6"; w2.fillRect(0, 0, 256, 256);
    for (var wi = 0; wi < 26; wi++) {                               // 물결: 가로로 긴 밝은 곡선
      var wx = hash(wi, 3.3) * 256, wy = hash(wi, 5.1) * 256, wl = 18 + hash(wi, 7.7) * 34;
      w2.strokeStyle = "rgba(215,242,255," + (0.16 + hash(wi, 9.1) * 0.2) + ")"; w2.lineWidth = 1.5 + hash(wi, 2.2) * 1.5; w2.lineCap = "round";
      for (var ox = -256; ox <= 256; ox += 256) for (var oy = -256; oy <= 256; oy += 256) { w2.beginPath(); w2.moveTo(wx - wl / 2 + ox, wy + oy); w2.quadraticCurveTo(wx + ox, wy - 4 + oy, wx + wl / 2 + ox, wy + oy); w2.stroke(); }
    }
    var wtex = new THREE.CanvasTexture(wcv); wtex.wrapS = wtex.wrapT = THREE.RepeatWrapping; wtex.repeat.set(55, 55); wtex.encoding = THREE.sRGBEncoding;
    var water = new THREE.Mesh(new THREE.PlaneGeometry(SIZE * 1.6, SIZE * 1.6).rotateX(-Math.PI / 2),
      new THREE.MeshToonMaterial({ color: 0xffffff, map: wtex, gradientMap: Toon.ramp, transparent: true, opacity: 0.92 }));
    water.position.y = WATER; Q.scene.add(water);
    Q.add(function (dt) { wtex.offset.x += dt * 0.012; wtex.offset.y += dt * 0.02; });
  }
  // 땅은 음영 단계를 부드럽게 (4단계)
  var softRamp = new THREE.DataTexture(new Uint8Array([150, 150, 150, 255, 195, 195, 195, 255, 230, 230, 230, 255, 255, 255, 255, 255]), 4, 1, THREE.RGBAFormat);
  softRamp.minFilter = softRamp.magFilter = THREE.NearestFilter; softRamp.needsUpdate = true;

  // 땅 그림: 위에서 내려다본 지도를 한 장 그려 땅에 입힌다 (논두렁이 있는 논, 얼룩진 풀밭, 강변 모래, 길, 바위, 눈)
  // ---------- 바닥 그늘: 나무·집 밑에 부드러운 그림자를 땅 그림에 칠한다 (진짜 그림자 계산 없이 땅에 붙어 보이게) ----------
  var groundPaint = null, spots = [], SUNX = 0.6, SUNZ = -0.35;
  function shadowSpot(x, z, r, a) { spots.push([x, z, r, a || 0.42]); }
  function paintShadows() {
    if (!groundPaint) return;
    var P = groundPaint, c = P.ctx;
    spots.forEach(function (s) {
      var px = (s[0] + s[2] * SUNX * 0.8 + P.half) / P.step, pz = (s[1] + s[2] * SUNZ * 0.8 + P.half) / P.step, pr = Math.max(1.5, s[2] / P.step);
      var gr = c.createRadialGradient(px, pz, 0, px, pz, pr);
      gr.addColorStop(0, "rgba(28,52,34," + s[3] + ")"); gr.addColorStop(0.6, "rgba(28,52,34," + (s[3] * 0.55) + ")"); gr.addColorStop(1, "rgba(28,52,34,0)");
      c.fillStyle = gr; c.beginPath(); c.arc(px, pz, pr, 0, 6.2832); c.fill();
    });
    P.tex.needsUpdate = true; spots = [];
  }
  function mixC(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
  function rgb(h) { return [(h >> 16) & 255, (h >> 8) & 255, h & 255]; }
  var C = {
    sand: rgb(0xe6d8ab), wetSand: rgb(0xcdc39a), grassA: rgb(0x86bd5f), grassB: rgb(0x6aa652), forest: rgb(0x4a8a4f), deep: rgb(0x3a7344),
    rock: rgb(0x9a9fa2), snow: rgb(0xe6ecee), lawn: rgb(0x93c169), road: rgb(0x9a9fa6), roadEdge: rgb(0xbdbab0), path: rgb(0xd3bc8a),
    bund: rgb(0xc4c690), paddy: [rgb(0x8cc25c), rgb(0x9dca60), rgb(0x7db656), rgb(0xadcd6c), rgb(0xcbbe5e)]
  };
  function paintGround(N) {
    var cv = document.createElement("canvas"); cv.width = cv.height = N;
    var ctx = cv.getContext("2d"), img = ctx.createImageData(N, N), d = img.data, step = SIZE / N, half = SIZE / 2;
    // 높이는 성긴 격자(257×257)로 미리 구해 두고 사이를 이어 쓴다 (땅 그물보다 촘촘해서 모양은 같고, 계산은 15배쯤 빠름)
    var G = 257, gs = SIZE / (G - 1), HG = new Float32Array(G * G);
    for (var gi = 0; gi < G; gi++) for (var gj = 0; gj < G; gj++) HG[gi * G + gj] = height(-half + gj * gs, -half + gi * gs);
    function hAt(x, z) {
      var fx = (x + half) / gs, fz = (z + half) / gs, ix = Math.min(G - 2, Math.max(0, Math.floor(fx))), iz = Math.min(G - 2, Math.max(0, Math.floor(fz)));
      var tx = fx - ix, tz = fz - iz, a0 = HG[iz * G + ix], a1 = HG[iz * G + ix + 1], b0 = HG[(iz + 1) * G + ix], b1 = HG[(iz + 1) * G + ix + 1];
      return (a0 + (a1 - a0) * tx) * (1 - tz) + (b0 + (b1 - b0) * tx) * tz;
    }
    for (var r = 0; r < N; r++) {
      var z = -half + (r + 0.5) * step;
      for (var c = 0; c < N; c++) {
        var x = -half + (c + 0.5) * step, h = hAt(x, z), col;
        var n1 = noise(x * 0.05, z * 0.05), n2 = noise(x * 0.21 + 7, z * 0.21);       // 얼룩 (큰 것 · 작은 것)
        if (h < 0.15) col = C.wetSand;
        else if (h < 0.9) col = mixC(C.sand, C.wetSand, n2 * 0.4);
        else if (h < 8 && onRoad(x, z)) col = mixC(C.road, C.roadEdge, n2 * 0.25);
        else if (h < 8 && onPath(x, z)) col = mixC(C.path, C.sand, n2 * 0.3);
        else if (h < 6 && x > 66 && x < 170 && z > -18 && z < 160) col = mixC(C.lawn, C.grassB, n1 * 0.35 + n2 * 0.15);
        else if (h < 6 && isFlat(x, z)) {
          // 논: 크기가 조금씩 다른 직사각형, 테두리는 밝은 논두렁
          var bw = 19 + (hash(Math.floor(z / 15), 3) * 6), bx = Math.floor(x / bw), bz = Math.floor(z / 15);
          var fx = x - bx * bw, fz = z - bz * 15;
          if (fx < 1.2 || fz < 1.2) col = C.bund;
          else {
            var k = Math.floor(hash(bx, bz) * 5);
            col = mixC(C.paddy[k], C.paddy[(k + 1) % 5], n2 * 0.25);
          }
        } else {
          var sl = (Math.abs(hAt(x + 4.3, z) - h) + Math.abs(hAt(x, z + 4.3) - h)) * 0.465;
          if (h > 30 && sl > 2.6) col = mixC(C.rock, C.forest, n2 * 0.3);
          else if (h > 108) col = mixC(C.snow, C.rock, n2 * 0.35);
          else if (h > 55) col = mixC(C.forest, C.deep, n1 * 0.6 + n2 * 0.2);
          else {
            var t = Q.smooth(20, 55, h);
            col = mixC(mixC(C.grassA, C.grassB, n1 * 0.7 + n2 * 0.3), C.forest, t);
          }
        }
        var o = (r * N + c) * 4; d[o] = col[0]; d[o + 1] = col[1]; d[o + 2] = col[2]; d[o + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    var tex = new THREE.CanvasTexture(cv); tex.encoding = THREE.sRGBEncoding; tex.anisotropy = 4;
    groundPaint = { cv: cv, ctx: ctx, tex: tex, N: N, step: step, half: half };
    return tex;
  }

  // ---------- 소나무 (한꺼번에 많이 그리기) ----------
  function buildTrees() {
    var count = Q.isTouch ? 700 : 1300;
    var trunkG = new THREE.CylinderGeometry(0.45, 0.6, 3, 6).translate(0, 1.5, 0);
    var leafG = new THREE.ConeGeometry(3.2, 6, 7).translate(0, 5.5, 0);
    var leafG2 = new THREE.ConeGeometry(2.4, 5, 7).translate(0, 8.6, 0);
    var trunks = new THREE.InstancedMesh(trunkG, Toon.mat(0x8a5a3a), count);
    var leaves = new THREE.InstancedMesh(leafG, Toon.mat(0x1f7d4c), count);
    var tops = new THREE.InstancedMesh(leafG2, Toon.mat(0x2f9a5c), count);
    var m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), pos = new THREE.Vector3(), i = 0, tries = 0;
    var UP = new THREE.Vector3(0, 1, 0);
    while (i < count && tries++ < count * 30) {
      var x = (hash(tries, 1.3) - 0.5) * SIZE * 0.95, z = (hash(tries, 7.7) - 0.5) * SIZE * 0.95, y = height(x, z);
      if (y < 5 || y > 100 || isFlat(x, z)) continue;
      if (fbm(x * 0.012 + 40, z * 0.012) < 0.42) continue;           // 숲은 뭉쳐서
      var sc = 0.8 + hash(tries, 3.1) * 0.9;
      pos.set(x, y - 0.3, z); s.set(sc, sc * (0.9 + hash(tries, 5.5) * 0.4), sc);
      q.setFromAxisAngle(UP,hash(tries, 9.9) * 6.28);
      m.compose(pos, q, s); trunks.setMatrixAt(i, m); leaves.setMatrixAt(i, m); tops.setMatrixAt(i, m); i++;
      shadowSpot(x, z, 4.4 * sc, 0.5);
    }
    trunks.count = leaves.count = tops.count = i;
    Q.scene.add(trunks, leaves, tops);
    // 둥근 활엽수: 마을과 논 가장자리, 낮은 산자락에 (색을 조금씩 다르게)
    var rc = Q.isTouch ? 220 : 420, rTrunk = new THREE.CylinderGeometry(0.4, 0.55, 3.2, 6).translate(0, 1.6, 0);
    var rLeaf = new THREE.IcosahedronGeometry(2.9, 0).translate(0, 5, 0), rLeaf2 = new THREE.IcosahedronGeometry(2.1, 0).translate(1.3, 6.4, 0.6);
    var rt = new THREE.InstancedMesh(rTrunk, Toon.mat(0x7a4f32), rc), rl = new THREE.InstancedMesh(rLeaf, Toon.mat(0xffffff), rc), rl2 = new THREE.InstancedMesh(rLeaf2, Toon.mat(0xffffff), rc);
    var LEAF = [0x5fb35a, 0x78c25a, 0x4f9e4f, 0x8fcf5f, 0x6aa84f], col = new THREE.Color(), j = 0; tries = 0;
    while (j < rc && tries++ < rc * 40) {
      var x2 = (hash(tries, 21.3) - 0.5) * SIZE * 0.8, z2 = (hash(tries, 27.7) - 0.5) * SIZE * 0.8, y2 = height(x2, z2), dr = riverDist(x2, z2);
      if (y2 < 3 || y2 > 45 || dr < 24 || (isFlat(x2, z2) && dr < 100 && hash(tries, 4.1) > 0.18)) continue;
      var sc2 = 0.75 + hash(tries, 13.1) * 0.7;
      pos.set(x2, y2 - 0.3, z2); s.set(sc2, sc2 * (0.85 + hash(tries, 15.5) * 0.35), sc2); q.setFromAxisAngle(UP, hash(tries, 19.9) * 6.28);
      m.compose(pos, q, s); rt.setMatrixAt(j, m); rl.setMatrixAt(j, m); rl2.setMatrixAt(j, m);
      shadowSpot(x2, z2, 4.6 * sc2, 0.52);
      col.setHex(LEAF[Math.floor(hash(tries, 31.7) * LEAF.length)]); rl.setColorAt(j, col); col.offsetHSL(0, 0, 0.05); rl2.setColorAt(j, col); j++;
    }
    rt.count = rl.count = rl2.count = j; Q.scene.add(rt, rl, rl2);
  }

  // ---------- 기와집: 돌 기단, 나무 기둥, 처마 끝이 살짝 들린 기와지붕 ----------
  var roofGeoCache = {};
  function roofGeo(w, d) {                        // 옆에서 본 지붕 모양(가운데 용마루, 양끝 처마가 들림)을 길이 방향으로 뽑는다
    var key = w + "x" + d; if (roofGeoCache[key]) return roofGeoCache[key];
    var D = d / 2 + 1.25, H = 2.7, T = 0.42, sh = new THREE.Shape();
    sh.moveTo(-D - 0.25, 0.55);                                   // 왼쪽 처마 끝 (들림)
    sh.quadraticCurveTo(-D * 0.45, 0.35, 0, H);                   // 오목하게 휘어 용마루로
    sh.quadraticCurveTo(D * 0.45, 0.35, D + 0.25, 0.55);          // 오른쪽 처마
    sh.lineTo(D + 0.05, 0.55 - T);
    sh.quadraticCurveTo(D * 0.45, 0.35 - T, 0, H - T * 1.4);
    sh.quadraticCurveTo(-D * 0.45, 0.35 - T, -D - 0.05, 0.55 - T);
    sh.closePath();
    var L = w + 2.2, g = new THREE.ExtrudeGeometry(sh, { depth: L, bevelEnabled: false, curveSegments: 8 });
    g.translate(0, 0, -L / 2); g.rotateY(Math.PI / 2);              // 길이 방향을 x로
    roofGeoCache[key] = g; return g;
  }
  var ROOFS = [0x46546e, 0x2f6f8f, 0xb5533f];
  function house(kind) {
    var g = new THREE.Group();
    var w = kind === 1 ? 9 : 6.5, d = 5.5, h = 3.4;
    var base = Toon.mesh(new THREE.BoxGeometry(w + 1.2, 0.6, d + 1.2), 0xbdb3a0); base.position.y = 0.3; g.add(base);
    var wall = Toon.mesh(new THREE.BoxGeometry(w, h - 0.6, d), kind === 2 ? 0xf7e6c8 : 0xfff6e6); wall.position.y = 0.6 + (h - 0.6) / 2; g.add(wall);
    [[-1, -1], [1, -1], [-1, 1], [1, 1], [0, 1]].forEach(function (p) {          // 나무 기둥
      if (p[0] === 0 && kind !== 1) return;
      var pil = Toon.mesh(new THREE.BoxGeometry(0.42, h - 0.6, 0.42), 0x8a5a3a); pil.position.set(p[0] * (w / 2 - 0.05), 0.6 + (h - 0.6) / 2, p[1] * (d / 2 - 0.05)); g.add(pil);
    });
    var beam = Toon.mesh(new THREE.BoxGeometry(w + 0.3, 0.38, d + 0.3), 0x8a5a3a); beam.position.y = h - 0.05; g.add(beam);
    var roof = Toon.mesh(roofGeo(w, d), ROOFS[kind % 3]); roof.position.y = h - 0.1; g.add(roof);
    var ridge = Toon.mesh(new THREE.BoxGeometry(w + 2.6, 0.45, 0.6), 0x2c3446); ridge.position.y = h + 2.45; g.add(ridge);
    [-1, 1].forEach(function (s) { var tip = Toon.mesh(new THREE.BoxGeometry(0.5, 0.75, 0.62), 0x2c3446); tip.position.set(s * (w / 2 + 1.25), h + 2.62, 0); tip.rotation.z = s * -0.35; g.add(tip); });
    var door = Toon.mesh(new THREE.BoxGeometry(1.5, 2.1, 0.2), 0x9a6a44); door.position.set(-w * 0.2, 0.6 + 1.05, d / 2 + 0.05); g.add(door);
    var win = Toon.mesh(new THREE.BoxGeometry(1.7, 1.15, 0.2), 0xfff0c4); win.position.set(w * 0.22, 2.05, d / 2 + 0.05); g.add(win);
    var bar = Toon.mesh(new THREE.BoxGeometry(0.12, 1.15, 0.24), 0x9a6a44); bar.position.set(w * 0.22, 2.05, d / 2 + 0.07); g.add(bar);
    var bar2 = Toon.mesh(new THREE.BoxGeometry(1.7, 0.12, 0.24), 0x9a6a44); bar2.position.set(w * 0.22, 2.05, d / 2 + 0.07); g.add(bar2);
    Toon.outline(g, 0.12);
    return g;
  }
  // 마을 소품: 낮은 돌담과 장독대
  function stoneWall(w, d) {
    var g = new THREE.Group(), seg = function (x, z, len, rot) {
      var m = Toon.mesh(new THREE.BoxGeometry(len, 1.0, 0.9), 0xa39a89); m.position.set(x, 0.5, z); m.rotation.y = rot; g.add(m);
      var cap = Toon.mesh(new THREE.BoxGeometry(len + 0.1, 0.3, 1.1), 0x7d7668); cap.position.set(x, 1.1, z); cap.rotation.y = rot; g.add(cap);
    };
    var hw = w / 2, hd = d / 2;
    seg(0, -hd, w, 0); seg(-hw, 0, d, Math.PI / 2); seg(hw, 0, d, Math.PI / 2);
    seg(-hw / 2 - 1, hd, hw - 2, 0); seg(hw / 2 + 1, hd, hw - 2, 0);          // 앞쪽은 가운데를 터서 대문 자리
    Toon.outline(g, 0.06); return g;
  }
  function jars() {
    var g = new THREE.Group();
    [[0, 0, 0.9], [1.5, 0.3, 0.7], [0.6, 1.4, 0.75], [-0.9, 1.0, 0.6]].forEach(function (j) {
      var b = Toon.ball(j[2], 0x6b3b22, 1, 1.15, 1); b.position.set(j[0], j[2] * 1.05, j[1]); g.add(b);
      var lid = Toon.mesh(new THREE.CylinderGeometry(j[2] * 0.55, j[2] * 0.62, 0.22, 10), 0x4e2a18); lid.position.set(j[0], j[2] * 2.2, j[1]); g.add(lid);
    });
    var stand = Toon.mesh(new THREE.BoxGeometry(4.2, 0.35, 3.4), 0xb3aa96); stand.position.set(0.3, 0.17, 0.7); g.add(stand);
    Toon.outline(g, 0.06); return g;
  }

  // ---------- 읍내: 학교·병원·군청과 상가가 있는 작은 도시 (조달청이 시골만이 아니라 전국 공공기관을 돕는다는 것을 보여 준다) ----------
  var town = { school: { x: 142, z: 112 }, hospital: { x: 80, z: 108 }, office: { x: 142, z: 58 } };
  function signTex(text, bg, fg) {
    var cv = document.createElement("canvas"); cv.width = 512; cv.height = 128; var c = cv.getContext("2d");
    c.fillStyle = bg; c.fillRect(0, 0, 512, 128); c.fillStyle = fg; c.textAlign = "center"; c.textBaseline = "middle";
    var size = 84; do { c.font = "900 " + size + "px 'Jua','Noto Sans KR','Malgun Gothic',sans-serif"; size -= 4; } while (size > 30 && c.measureText(text).width > 470);
    c.fillText(text, 256, 68);
    var t = new THREE.CanvasTexture(cv); t.encoding = THREE.sRGBEncoding; return t;
  }
  function signBoard(text, w, bg, fg) {
    var g = new THREE.Group(), board = Toon.mesh(new THREE.BoxGeometry(w, w / 4, 0.3), 0xffffff); g.add(board);
    var face = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.96, w / 4 * 0.9), new THREE.MeshBasicMaterial({ map: signTex(text, bg, fg) }));
    face.position.z = 0.16; face.userData.noInk = true; face.userData.keep = true; g.add(face);
    return g;
  }
  // 층마다 창문 띠를 두른 건물
  function block(w, d, floors, wallC, bandC, roofC) {
    var g = new THREE.Group(), fh = 3.4, h = floors * fh;
    var wall = Toon.mesh(new THREE.BoxGeometry(w, h, d), wallC); wall.position.y = h / 2; g.add(wall);
    for (var i = 0; i < floors; i++) {
      var band = Toon.mesh(new THREE.BoxGeometry(w + 0.12, 1.1, d + 0.12), bandC); band.position.y = i * fh + 2.0; g.add(band);
    }
    var roof = Toon.mesh(new THREE.BoxGeometry(w + 0.6, 0.6, d + 0.6), roofC); roof.position.y = h + 0.3; g.add(roof);
    g.userData.h = h; return g;
  }
  function car(color) {
    var g = new THREE.Group();
    var body = Toon.mesh(new THREE.BoxGeometry(2.0, 0.9, 4.0), color); body.position.y = 0.75; g.add(body);
    var cab = Toon.mesh(new THREE.BoxGeometry(1.8, 0.8, 2.1), 0xd8eefa); cab.position.set(0, 1.55, -0.2); g.add(cab);
    [[-1, -1.3], [1, -1.3], [-1, 1.3], [1, 1.3]].forEach(function (p) { var wh = Toon.mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.35, 10), 0x2a2a33); wh.rotation.z = Math.PI / 2; wh.position.set(p[0] * 0.95, 0.45, p[1]); g.add(wh); });
    Toon.outline(g, 0.06); return g;
  }
  function place(g, x, z, rot, sc) {
    g.position.set(x, height(x, z), z); g.rotation.y = rot || 0; if (sc) g.scale.setScalar(sc);
    Toon.bake(g); Q.scene.add(g);
    var bb = new THREE.Box3().setFromObject(g), sz = bb.getSize(new THREE.Vector3()); shadowSpot(x, z, Math.max(sz.x, sz.z) * 0.7 + 1, 0.55);
    return g;
  }
  function buildTown() {
    // 군청: 기둥이 있는 정문과 깃대
    var o = town.office, off = block(18, 11, 3, 0xf1e9dc, 0x9cc3df, 0x7a8796);
    [-6, -2, 2, 6].forEach(function (x) { var c = Toon.mesh(new THREE.CylinderGeometry(0.5, 0.5, 5.5, 10), 0xffffff); c.position.set(x, 2.75, 6.4); off.add(c); });
    var porch = Toon.mesh(new THREE.BoxGeometry(14.5, 0.6, 3.2), 0xd6cdbd); porch.position.set(0, 5.8, 6.3); off.add(porch);
    var pole = Toon.mesh(new THREE.CylinderGeometry(0.18, 0.18, 12, 8), 0xdddddd); pole.position.set(11, 6, 8); off.add(pole);
    var flag = Toon.mesh(new THREE.BoxGeometry(3.2, 2, 0.12), 0x2f6fb5); flag.position.set(12.7, 11, 8); off.add(flag);
    Toon.outline(off, 0.1);
    var s1 = signBoard("솔바람군청", 9, "#1b2a5c", "#ffd23f"); s1.position.set(0, off.userData.h + 1.5, 5.6); off.add(s1);
    place(off, o.x, o.z, -Math.PI / 2);
    // 학교: 긴 3층 건물, 시계, 운동장
    var sc = town.school, sch = block(26, 9, 3, 0xffe9b0, 0xa9dcf5, 0xc25b4a);
    var clock = Toon.mesh(new THREE.CylinderGeometry(1.4, 1.4, 0.3, 18), 0xffffff); clock.rotation.x = Math.PI / 2; clock.position.set(0, sch.userData.h - 1.4, 4.7); sch.add(clock);
    var hand = Toon.mesh(new THREE.BoxGeometry(0.15, 1.0, 0.1), 0x23232e); hand.position.set(0, sch.userData.h - 1.0, 4.9); sch.add(hand);
    Toon.outline(sch, 0.1);
    var s2 = signBoard("솔바람초등학교", 11, "#ffffff", "#c25b4a"); s2.position.set(-6, sch.userData.h + 1.4, 4.4); sch.add(s2);
    place(sch, sc.x, sc.z, -Math.PI / 2);
    var field = new THREE.Mesh(new THREE.BoxGeometry(16, 0.25, 24), Toon.mat(0xd9b77e)); field.userData.noInk = true;
    field.position.set(sc.x + 14, height(sc.x + 14, sc.z) + 0.1, sc.z); Q.scene.add(field);
    var goal = new THREE.Group(); [[-2, 0], [2, 0]].forEach(function (p) { var gp = Toon.mesh(new THREE.BoxGeometry(0.25, 2.4, 0.25), 0xffffff); gp.position.set(p[0], 1.2, 0); goal.add(gp); });
    var gb = Toon.mesh(new THREE.BoxGeometry(4.3, 0.25, 0.25), 0xffffff); gb.position.y = 2.4; goal.add(gb); Toon.outline(goal, 0.05);
    place(goal, sc.x + 14, sc.z - 11, 0);
    // 병원: 흰 건물에 빨간 십자
    var hp = town.hospital, hos = block(13, 12, 4, 0xffffff, 0xbfe3f5, 0x9aa7b5);
    var cv = Toon.mesh(new THREE.BoxGeometry(1.1, 3.6, 0.4), 0xe23b3b), ch = Toon.mesh(new THREE.BoxGeometry(3.6, 1.1, 0.4), 0xe23b3b);
    cv.position.set(0, hos.userData.h - 2.2, 6.2); ch.position.set(0, hos.userData.h - 2.2, 6.25); hos.add(cv); hos.add(ch);
    var canopy = Toon.mesh(new THREE.BoxGeometry(7, 0.4, 3), 0x2f8fd0); canopy.position.set(0, 3.2, 7.2); hos.add(canopy);
    Toon.outline(hos, 0.1);
    var s3 = signBoard("솔바람병원", 8, "#ffffff", "#e23b3b"); s3.position.set(0, hos.userData.h + 1.4, 5.8); hos.add(s3);
    place(hos, hp.x, hp.z, Math.PI / 2);
    // 상가와 아파트
    [[128, 18, 12, 9, 2, 0xf6d9c4], [150, 32, 10, 10, 5, 0xdfe8f0], [152, 86, 11, 10, 4, 0xf2e6d8], [144, 136, 12, 9, 2, 0xe9f0d8], [150, 142, 10, 10, 6, 0xf6e1d0], [138, -6, 11, 9, 3, 0xe6ecf5]].forEach(function (b, i) {
      var bl = block(b[2], b[3], b[4], b[5], i % 2 ? 0x9cc3df : 0xbfe3f5, 0x8a96a6);
      if (b[4] <= 2) { var aw = Toon.mesh(new THREE.BoxGeometry(b[2] - 1, 0.3, 2), [0xe2574c, 0x3fae6a, 0xffc94a][i % 3]); aw.position.set(0, 3.0, b[3] / 2 + 1); aw.rotation.x = 0.25; bl.add(aw); }
      Toon.outline(bl, 0.1); place(bl, b[0], b[1], b[0] > 122 ? -Math.PI / 2 : Math.PI / 2);
    });
    // 길가에 세운 차
    [[118, 30, 0xe2574c], [126, 62, 0x2f8fd0], [118, 104, 0xffc94a], [118, 76, 0xffffff]].forEach(function (c, i) { place(car(c[2]), c[0], c[1], i % 2 ? Math.PI : 0); });
  }
  var villages = [];
  function buildVillage(cx, cz, n, seed) {
    var placed = 0, t = 0;
    while (placed < n && t++ < 200) {
      var a = hash(seed + t, 2.2) * 6.28, r = 8 + hash(seed + t, 4.4) * 52;
      var x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r;
      if (!isFlat(x, z)) continue;
      var kind = (seed + t) % 3, hgt = house(kind); hgt.position.set(x, height(x, z), z); hgt.rotation.y = hash(seed + t, 8.8) * 6.28;
      var sc = 1.5 + hash(seed + t, 6.6) * 0.5; hgt.scale.setScalar(sc);
      if (hash(seed + t, 1.9) > 0.45) { var wl = stoneWall((kind === 1 ? 9 : 6.5) + 6, 5.5 + 7); hgt.add(wl); }
      if (hash(seed + t, 3.7) > 0.5) { var jr = jars(); jr.position.set((kind === 1 ? 9 : 6.5) / 2 + 1.2, 0, -1.5); hgt.add(jr); }
      Toon.bake(hgt); Q.scene.add(hgt); placed++;
      shadowSpot(x, z, 8.5 * sc, 0.55);
    }
    villages.push({ x: cx, z: cz });
  }

  // ---------- 구름 ----------
  var clouds = [];
  function cloud(x, y, z, s) {
    var g = new THREE.Group(), m = Toon.mat(0xffffff, { emissive: 0xc9c2d6, emissiveIntensity: 0.3 });       // 키아트처럼 크림색 구름, 그늘은 따뜻하게
    var blobs = [[0, 0, 0, 1], [-1.3, -0.25, 0.2, 0.75], [1.3, -0.2, -0.1, 0.8], [0.5, 0.45, 0.3, 0.7], [-0.5, 0.35, -0.3, 0.6]];
    blobs.forEach(function (b) { var o = Toon.mesh(new THREE.SphereGeometry(b[3], 12, 9), m); o.position.set(b[0], b[1], b[2]); o.scale.y = 0.72; g.add(o); });
    g.position.set(x, y, z); g.scale.setScalar(s); g.userData.speed = 1 + hash(x, z) * 2;
    Toon.bake(g); Q.scene.add(g); clouds.push(g); return g;
  }
  function buildClouds() {
    for (var i = 0; i < 46; i++) {
      var a = hash(i, 1) * 6.28, r = 60 + hash(i, 2) * 520;
      cloud(Math.cos(a) * r, 70 + hash(i, 3) * 90, Math.sin(a) * r, 9 + hash(i, 4) * 16);
    }
  }

  // ---------- 하늘과 빛 ----------
  var skyMat, sun, hemi, sunGlow;
  function buildSky() {
    skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: { top: { value: new THREE.Color(0x3d9cf0) }, mid: { value: new THREE.Color(0xb8e4ff) }, low: { value: new THREE.Color(0xfff0c8) } },
      vertexShader: "varying vec3 v; void main(){ v = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
      fragmentShader: "uniform vec3 top; uniform vec3 mid; uniform vec3 low; varying vec3 v; void main(){ float h = clamp(v.y,0.0,1.0); vec3 c = mix(low, mid, smoothstep(0.0,0.22,h)); c = mix(c, top, smoothstep(0.2,0.8,h)); gl_FragColor = vec4(c,1.0); }"
    });
    var sky = new THREE.Mesh(new THREE.SphereGeometry(1800, 24, 16), skyMat); sky.name = "sky"; Q.scene.add(sky);
    Q.add(function () { sky.position.copy(Q.camera.position); });
    Q.scene.fog = new THREE.Fog(0xd4e8f2, 520, 1600);
    hemi = new THREE.HemisphereLight(0xfff3e0, 0x6f9a6a, 0.42); Q.scene.add(hemi);
    sun = new THREE.DirectionalLight(0xffe4b8, 0.78); sun.position.set(-0.6, 1, 0.35); Q.scene.add(sun);
    // 해와 햇무리: 하늘에 따뜻한 빛 덩이를 둔다 (빛이 오는 쪽)
    var cv = document.createElement("canvas"); cv.width = cv.height = 256; var c2 = cv.getContext("2d");
    var gr = c2.createRadialGradient(128, 128, 0, 128, 128, 128);
    gr.addColorStop(0, "rgba(255,255,240,1)"); gr.addColorStop(0.12, "rgba(255,250,225,1)"); gr.addColorStop(0.2, "rgba(255,236,190,0.55)"); gr.addColorStop(0.5, "rgba(255,226,170,0.16)"); gr.addColorStop(1, "rgba(255,220,160,0)");
    c2.fillStyle = gr; c2.fillRect(0, 0, 256, 256);
    var sunTex = new THREE.CanvasTexture(cv); sunTex.encoding = THREE.sRGBEncoding;
    sunGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: sunTex, transparent: true, depthWrite: false, fog: false })); sunGlow.scale.setScalar(520); sunGlow.renderOrder = -1; Q.scene.add(sunGlow);
    var sd = new THREE.Vector3(-0.6, 0.55, 0.35).normalize();
    Q.add(function () { sunGlow.position.copy(Q.camera.position).addScaledVector(sd, 1500); });
  }
  // 시간대: 0 = 아침, 1 = 노을
  function setDusk(k) {
    skyMat.uniforms.top.value.set(0x3d9cf0).lerp(new THREE.Color(0x5d6fd6), k);
    skyMat.uniforms.mid.value.set(0xb8e4ff).lerp(new THREE.Color(0xffb38a), k);
    skyMat.uniforms.low.value.set(0xfff0c8).lerp(new THREE.Color(0xffd98a), k);
    Q.scene.fog.color.set(0xd4e8f2).lerp(new THREE.Color(0xffd0a8), k);
    sun.color.set(0xffe8c2).lerp(new THREE.Color(0xffb070), k);
    if (sunGlow) sunGlow.material.color.set(0xffffff).lerp(new THREE.Color(0xffb27a), k);
  }

  function buildMeadow() {
    var nT = Q.isTouch ? 900 : 1800, nF = Q.isTouch ? 350 : 700;
    var tuftG = new THREE.ConeGeometry(0.55, 1.4, 5).translate(0, 0.6, 0), flowerG = new THREE.IcosahedronGeometry(0.42, 0).translate(0, 0.55, 0);
    var tufts = new THREE.InstancedMesh(tuftG, Toon.mat(0xffffff), nT), flowers = new THREE.InstancedMesh(flowerG, Toon.mat(0xffffff, { emissive: 0x222222 }), nF);
    var m = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), p = new THREE.Vector3(), col = new THREE.Color(), UP = new THREE.Vector3(0, 1, 0);
    var TC = [0x4a8a3a, 0x569641, 0x3f7d34, 0x5f9c46], FC = [0xffffff, 0xffe066, 0xff9ec1, 0xffffff, 0xc9a8ff];
    function spot(seed) {
      for (var t = 0; t < 30; t++) {
        var x = (hash(seed, t + 0.5) - 0.5) * SIZE * 0.78, z = (hash(t + 0.3, seed) - 0.5) * SIZE * 0.78, y = height(x, z);
        if (y < 1.2 || y > 26 || onRoad(x, z) || onPath(x, z)) continue;
        if (isFlat(x, z) && y < 6 && !(x > 66 && x < 170 && z > -18 && z < 160)) continue;         // 논 안에는 두지 않는다
        return [x, y, z];
      }
      return null;
    }
    var i, k = 0;
    for (i = 0; i < nT * 2 && k < nT; i++) {
      var a = spot(i * 1.37 + 11); if (!a) continue;
      var s1 = 0.7 + hash(i, 4.4) * 0.9; p.set(a[0], a[1] - 0.1, a[2]); sc.set(s1, s1 * (0.8 + hash(i, 6.6) * 0.6), s1); q.setFromAxisAngle(UP, hash(i, 8.8) * 6.28);
      m.compose(p, q, sc); tufts.setMatrixAt(k, m); col.setHex(TC[k % TC.length]); tufts.setColorAt(k, col); k++;
    }
    tufts.count = k; k = 0;
    for (i = 0; i < nF * 2 && k < nF; i++) {
      var b = spot(i * 2.71 + 91); if (!b) continue;
      var s2 = 0.7 + hash(i, 1.4) * 0.6; p.set(b[0], b[1], b[2]); sc.setScalar(s2); q.identity();
      m.compose(p, q, sc); flowers.setMatrixAt(k, m); col.setHex(FC[k % FC.length]); flowers.setColorAt(k, col); k++;
    }
    flowers.count = k;
    Q.scene.add(tufts, flowers);
  }

  function build() {
    buildSky(); buildGround(); buildTrees(); buildClouds();
    buildVillage(-95, -170, 9, 11);      // 공방 마을
    buildTown();                         // 강 동쪽은 읍내 (나라장터·검사장이 있는 쪽)
    buildVillage(-70, 250, 6, 97);
    buildMeadow(); paintShadows();
    Q.add(function (dt) {
      clouds.forEach(function (c) { c.position.x += c.userData.speed * dt; if (c.position.x > 620) c.position.x = -620; });
    });
  }

  window.World = { town: town, build: build, height: height, riverX: riverX, isFlat: isFlat, setDusk: setDusk, cloud: cloud, house: house, SIZE: SIZE };
})();
