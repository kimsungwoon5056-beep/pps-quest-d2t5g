// 무대: 이야기 내내 그 자리에 있는 건물과 인물 (소방서, 소방대장)
(function () {
  "use strict";
  var Q = window.Q, THREE = Q.THREE, Toon = window.Toon, World = window.World, People = window.People;
  var STATION = { x: 120, z: 300 };

  function label(text, w, bg, fg) {
    var cv = document.createElement("canvas"); cv.width = 1024; cv.height = 256; var c = cv.getContext("2d");
    c.fillStyle = bg; c.fillRect(0, 0, 1024, 256); c.fillStyle = fg; c.textAlign = "center"; c.textBaseline = "middle";
    var size = 170; do { c.font = "900 " + size + "px 'Jua','Noto Sans KR','Malgun Gothic',sans-serif"; size -= 4; } while (size > 30 && c.measureText(text).width > 960); c.fillText(text, 512, 136);
    var t = new THREE.CanvasTexture(cv); t.encoding = THREE.sRGBEncoding;
    var m = new THREE.Mesh(new THREE.PlaneGeometry(w, w / 4), new THREE.MeshBasicMaterial({ map: t })); m.userData.noInk = true; m.userData.keep = true; return m;
  }
  // 소방서: 빨간 띠를 두른 2층 건물, 차고 문 셋, 망루, 간판, 앞마당의 소방차
  function fireStation(x, z) {
    var g = new THREE.Group(), y = World.height(x, z), W = 0xfff3dc, R = 0xd83a3a, DR = 0xa82a2a;
    var base = Toon.mesh(new THREE.BoxGeometry(22, 9, 13), W); base.position.y = 4.5; g.add(base);
    var band = Toon.mesh(new THREE.BoxGeometry(22.2, 1.2, 13.2), R); band.position.y = 6.6; g.add(band);
    var roof = Toon.mesh(new THREE.BoxGeometry(24, 1.4, 15), R); roof.position.y = 9.7; g.add(roof);
    var rim = Toon.mesh(new THREE.BoxGeometry(24.2, 0.5, 15.2), 0xffffff); rim.position.y = 9.0; g.add(rim);
    [-7, 0, 7].forEach(function (dx) {                                  // 차고 문: 흰 틀 + 가로 줄무늬 셔터
      var fr = Toon.mesh(new THREE.BoxGeometry(5.6, 5.8, 0.3), 0xffffff); fr.position.set(dx + 2, 2.9, 6.55); g.add(fr);
      var dr = Toon.mesh(new THREE.BoxGeometry(4.8, 5.2, 0.4), DR); dr.position.set(dx + 2, 2.6, 6.65); g.add(dr);
      for (var k = 0; k < 4; k++) { var ln = Toon.mesh(new THREE.BoxGeometry(4.8, 0.14, 0.45), 0x7e1f1f); ln.position.set(dx + 2, 1.0 + k * 1.2, 6.68); ln.userData.noInk = true; g.add(ln); }
    });
    [-7, -2, 3, 8].forEach(function (dx) { var wn = Toon.mesh(new THREE.BoxGeometry(2.6, 1.4, 0.3), 0xbfe3f5); wn.position.set(dx + 2, 7.95, 6.6); wn.userData.noInk = true; g.add(wn); });
    var tower = Toon.mesh(new THREE.BoxGeometry(5, 20, 5), W); tower.position.set(-12, 10, 0); g.add(tower);
    [6, 11, 16].forEach(function (ty) { var tw = Toon.mesh(new THREE.BoxGeometry(1.6, 2, 0.3), 0xbfe3f5); tw.position.set(-12, ty, 2.6); tw.userData.noInk = true; g.add(tw); });
    var deck = Toon.mesh(new THREE.BoxGeometry(6.4, 0.6, 6.4), R); deck.position.set(-12, 19.8, 0); g.add(deck);
    var cap = Toon.mesh(new THREE.ConeGeometry(4.6, 4, 4), R); cap.rotation.y = Math.PI / 4; cap.position.set(-12, 22.3, 0); g.add(cap);
    var siren = Toon.ball(0.7, 0xffd23f); siren.position.set(-12, 24.6, 0); g.add(siren);
    var pad = Toon.mesh(new THREE.CylinderGeometry(5, 5, 0.5, 20), 0xffd23f); pad.position.set(4, 10.6, 0); g.add(pad);
    var H = Toon.mesh(new THREE.BoxGeometry(3.4, 0.2, 0.7), 0x23232e); H.position.set(4, 10.9, 0); H.rotation.y = Math.PI / 2; H.userData.noInk = true; g.add(H);
    // 소방차
    var truck = new THREE.Group();
    var tb = Toon.mesh(new THREE.BoxGeometry(3.2, 2.4, 7.5), R); tb.position.y = 1.9; truck.add(tb);
    var tc = Toon.mesh(new THREE.BoxGeometry(3.2, 1.6, 2.4), R); tc.position.set(0, 3.6, 2.4); truck.add(tc);
    var tw2 = Toon.mesh(new THREE.BoxGeometry(2.9, 1.0, 0.2), 0xbfe3f5); tw2.position.set(0, 3.7, 3.65); tw2.userData.noInk = true; truck.add(tw2);
    var stripe = Toon.mesh(new THREE.BoxGeometry(3.3, 0.35, 7.6), 0xffffff); stripe.position.y = 2.0; stripe.userData.noInk = true; truck.add(stripe);
    var lad = Toon.mesh(new THREE.BoxGeometry(1.2, 0.3, 6.5), 0xdddddd); lad.position.set(0, 3.3, -0.9); truck.add(lad);
    var lt = Toon.mesh(new THREE.BoxGeometry(1.6, 0.4, 0.6), 0x3a8cff); lt.position.set(0, 4.6, 2.4); truck.add(lt);
    [[-1.5, -2.4], [1.5, -2.4], [-1.5, 2.2], [1.5, 2.2]].forEach(function (p) { var wh = Toon.mesh(new THREE.CylinderGeometry(0.75, 0.75, 0.5, 12), 0x2a2a33); wh.rotation.z = Math.PI / 2; wh.position.set(p[0], 0.75, p[1]); truck.add(wh); });
    truck.position.set(-17, 0, 11); truck.rotation.y = -0.25; g.add(truck);          // 망루 옆 (대화하는 마당을 가리지 않게)
    var apron = Toon.mesh(new THREE.BoxGeometry(30, 0.25, 22), 0xbdb9ad); apron.position.set(1, 0.12, 17); apron.userData.noInk = true; g.add(apron);          // 앞마당 바닥
    var lineY = Toon.mesh(new THREE.BoxGeometry(30, 0.27, 0.5), 0xffd23f); lineY.position.set(1, 0.13, 7.6); lineY.userData.noInk = true; g.add(lineY);
    Toon.outline(g, 0.22);
    var sign = label("솔바람 119 소방서", 14, "#ffffff", "#d83a3a"); sign.position.set(0, 9.7, 7.56); g.add(sign);
    g.position.set(x, y, z); g.scale.setScalar(1.25);
    Toon.bake(g); Q.scene.add(g); return g;
  }

  var station = fireStation(STATION.x, STATION.z);
  // 소방서 앞마당 (건물 문은 +z 쪽)
  var yard = { x: STATION.x + 2, z: STATION.z + 22 };
  var chief = People.stand(People.make("chief"), yard.x - 5, yard.z - 4, 0.5, 1.25);

  window.Sets = { STATION: STATION, station: station, yard: yard, chief: chief };
})();
