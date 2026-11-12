// 카툰 표현: 단계가 딱딱 나뉘는 음영 + 굵은 테두리선
(function () {
  "use strict";
  var Q = window.Q, THREE = Q.THREE;

  // 3단계 음영 (어두움 / 중간 / 밝음)
  var ramp = new THREE.DataTexture(new Uint8Array([120, 120, 120, 255, 200, 200, 200, 255, 255, 255, 255, 255]), 3, 1, THREE.RGBAFormat);
  ramp.minFilter = ramp.magFilter = THREE.NearestFilter; ramp.needsUpdate = true;

  var cache = {};
  function mat(color, opts) {
    var key = color + JSON.stringify(opts || {});
    if (cache[key]) return cache[key];
    var m = new THREE.MeshToonMaterial(Object.assign({ color: color, gradientMap: ramp }, opts || {}));
    cache[key] = m; return m;
  }

  // 테두리선: 뒤집은 껍데기를 조금 부풀려 검게 칠한다
  var inkMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    uniforms: { w: { value: 0.06 }, ink: { value: new THREE.Color(0x1b1b2e) } },
    vertexShader: "uniform float w; void main(){ vec3 p = position + normalize(normal) * w; gl_Position = projectionMatrix * modelViewMatrix * vec4(p,1.0); }",
    fragmentShader: "uniform vec3 ink; void main(){ gl_FragColor = vec4(ink,1.0); }"
  });
  function inkOf(width) { var m = inkMat.clone(); m.uniforms.w.value = width; return m; }
  var inks = {};
  // 물체(mesh 또는 group)에 테두리를 붙인다. width는 물체 크기 단위.
  function outline(obj, width) {
    width = width || 0.06;
    var im = inks[width] || (inks[width] = inkOf(width));
    var add = [];
    obj.traverse(function (o) { if (o.isMesh && !o.userData.noInk) add.push(o); });
    add.forEach(function (o) {
      var shell = new THREE.Mesh(o.geometry, im);
      shell.userData.noInk = true; shell.userData.isInk = true;
      o.add(shell);
    });
    return obj;
  }

  function mesh(geo, color, opts) { return new THREE.Mesh(geo, typeof color === "number" ? mat(color, opts) : color); }
  function ball(r, color, sx, sy, sz) {
    var m = mesh(new THREE.SphereGeometry(r, 20, 14), color);
    m.scale.set(sx || 1, sy || 1, sz || 1); return m;
  }

  // 묶음 합치기: group 안의 메시(테두리 포함)를 재질별로 하나로 합친다. 움직이는 부품(userData.keep)은 그대로 둔다.
  var tmpM = new THREE.Matrix4(), inv = new THREE.Matrix4();
  function bake(group) {
    group.updateMatrixWorld(true); inv.copy(group.matrixWorld).invert();
    var buckets = new Map(), drop = [];
    group.traverse(function (o) {
      if (!o.isMesh || o.isInstancedMesh || o === group) return;
      var p = o; while (p && p !== group) { if (p.userData.keep) return; p = p.parent; }
      if (Array.isArray(o.material) || o.material.transparent && !o.userData.isInk && o.material.opacity < 1) return;
      var g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
      ["uv", "uv2", "color"].forEach(function (a) { if (g.attributes[a]) g.deleteAttribute(a); });
      if (!g.attributes.normal) g.computeVertexNormals();
      tmpM.multiplyMatrices(inv, o.matrixWorld); g.applyMatrix4(tmpM);
      if (o.userData.isInk) {                                   // 테두리는 부모의 크기만큼 두께가 달라지므로, 크기를 재질에 넣는다
        var sc = new THREE.Vector3(); tmpM.decompose(new THREE.Vector3(), new THREE.Quaternion(), sc);
        var key = o.material.uniforms.w.value * (sc.x + sc.y + sc.z) / 3;
        key = Math.round(key * 200) / 200;
        var mk = "ink" + key;
        if (!buckets.has(mk)) { var im = o.material.clone(); im.uniforms.w.value = key; buckets.set(mk, { m: im, list: [] }); }
        buckets.get(mk).list.push(g);
      } else {
        if (!buckets.has(o.material)) buckets.set(o.material, { m: o.material, list: [] });
        buckets.get(o.material).list.push(g);
      }
      drop.push(o);
    });
    drop.forEach(function (o) { if (o.parent) o.parent.remove(o); });
    // 비어 버린 하위 묶음 정리
    var empty = []; group.traverse(function (o) { if (o !== group && o.isGroup && !o.userData.keep && o.children.length === 0) empty.push(o); });
    empty.forEach(function (o) { if (o.parent) o.parent.remove(o); });
    buckets.forEach(function (b) {
      var n = 0; b.list.forEach(function (g) { n += g.attributes.position.count; });
      var pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), k = 0;
      b.list.forEach(function (g) { pos.set(g.attributes.position.array, k * 3); nor.set(g.attributes.normal.array, k * 3); k += g.attributes.position.count; g.dispose(); });
      var mg = new THREE.BufferGeometry(); mg.setAttribute("position", new THREE.BufferAttribute(pos, 3)); mg.setAttribute("normal", new THREE.BufferAttribute(nor, 3));
      mg.computeBoundingSphere();
      var mesh = new THREE.Mesh(mg, b.m); mesh.userData.noInk = true; mesh.userData.baked = true; group.add(mesh);
    });
    return group;
  }

  window.Toon = { mat: mat, outline: outline, mesh: mesh, ball: ball, ramp: ramp, bake: bake };
})();
