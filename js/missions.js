// 미션 틀: 장(chapter)을 차례로 진행하고, 목표 화살표·정책 카드·엔딩 화면을 보여 준다.
// 각 장은 window.Chapters[id] = { start(ctx), update(dt, t, ctx) → 끝나면 점수(0~100) 반환, cleanup() } 로 등록한다.
(function () {
  "use strict";
  var Q = window.Q, THREE = Q.THREE, Toon = window.Toon, World = window.World;
  window.Chapters = window.Chapters || {};

  // 장 정보. 정책 문구는 2026년 조달청 업무계획 표현에 맞춘다.
  var INFO = [
    { id: "find", no: 1, name: "숨은 혁신 찾기", policy: "혁신제품 발굴·시범구매",
      talk: [],
      card: "조달청은 새 기술 제품의 첫 번째 손님이 되어 줘요.",
      more: "좋은 기술도 처음 사 주는 곳이 없으면 자라기 어려워요. 조달청은 혁신제품을 찾아 먼저 사서 공공기관이 써 보게 해요." },
    { id: "bid", no: 2, name: "공정 입찰 관문", policy: "나라장터 · 공정 조달",
      talk: [],
      card: "나라장터에서는 누구나 같은 규칙으로 공정하게 경쟁해요.",
      more: "가격을 미리 짜고 들어오는 담합이나 서류가 빠진 입찰은 걸러내요. 그래야 좋은 기업이 정당하게 뽑혀요." },
    { id: "stock", no: 3, name: "비축물자 긴급 방출", policy: "공공비축",
      talk: [],
      card: "조달청은 원자재를 미리 쌓아 두고, 위기 때 풀어 공장을 지켜요.",
      more: "알루미늄·구리·니켈 같은 금속을 비축해 두었다가 값이 뛰거나 구하기 어려울 때 기업에 공급해요." },
    { id: "check", no: 4, name: "품질 검사 비행", policy: "조달물자 품질점검",
      talk: [["narmi", "드론이 다 만들어졌어. 보내기 전에 검사장에 들르자."]],
      card: "세금으로 사는 물건은 꼼꼼히 검사한 뒤 보내요.",
      more: "국민 안전과 이어진 물건일수록 더 자주, 더 엄격하게 품질을 점검해요." },
    { id: "deliver", no: 5, name: "나르미 긴급 배송", policy: "수요기관 공급 · 국민 안전",
      talk: [["dari", "저기 산에 연기가 보여! 서둘러 소방서로 가자."]],
      card: "이렇게 닿은 혁신이 국민의 하루를 지켜요.",
      more: "조달청이 이어 준 제품은 학교, 소방서, 병원처럼 우리 곁의 공공기관에서 쓰여요." }
  ];
  var GRADES = [
    { min: 0, name: "조달 새싹", line: "첫걸음을 뗐어요. 한 번 더 도전!" },
    { min: 45, name: "조달 지킴이", line: "조달의 흐름을 이해했어요." },
    { min: 68, name: "조달 해결사", line: "믿고 맡길 수 있는 실력이에요." },
    { min: 86, name: "조달 마스터", line: "혁신을 국민 곁으로 완벽하게 이었어요!" }
  ];

  var $ = function (id) { return document.getElementById(id); };
  var order = [], index = -1, current = null, scores = {}, state = "idle", wait = 0, ctx = null, target = null;

  // ---------- 3D 도우미: 빛기둥, 별, 드론 ----------
  function beam(x, z, color) {
    var y = Math.max(World.height(x, z), 0);
    var m = new THREE.Mesh(new THREE.CylinderGeometry(4, 4, 220, 16, 1, true),
      new THREE.MeshBasicMaterial({ color: color || 0xffe066, transparent: true, opacity: 0.38, depthWrite: false, fog: false, side: THREE.DoubleSide }));
    m.position.set(x, y + 110, z); Q.scene.add(m); return m;
  }
  function star() {
    var g = new THREE.Group();
    var s = Toon.mesh(new THREE.OctahedronGeometry(2.2), Toon.mat(0xffd23f, { emissive: 0xffa800, emissiveIntensity: 0.5 })); s.scale.y = 1.25; g.add(s);
    Toon.outline(g, 0.16); return g;
  }
  function drone() {
    var g = new THREE.Group();
    g.add(Toon.mesh(new THREE.BoxGeometry(0.9, 0.35, 0.9), 0xffffff));
    var cam = Toon.ball(0.18, 0x3ad1c5); cam.position.set(0, -0.22, 0.3); g.add(cam);
    g.userData.rotors = [];
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (p) {
      var arm = Toon.mesh(new THREE.BoxGeometry(0.12, 0.08, 0.7), 0x39507a); arm.position.set(p[0] * 0.45, 0.05, p[1] * 0.45); arm.rotation.y = Math.atan2(p[0], p[1]); g.add(arm);
      var r = Toon.mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.04, 12), Toon.mat(0xbfe3f5, { transparent: true, opacity: 0.7 })); r.position.set(p[0] * 0.72, 0.16, p[1] * 0.72); r.userData.noInk = true; g.add(r);
      g.userData.rotors.push(r);
    });
    Toon.outline(g, 0.05); return g;
  }
  // 반짝 터지는 고리
  var bursts = [];
  function burst(pos, color) {
    var m = new THREE.Mesh(new THREE.TorusGeometry(1, 0.22, 8, 28), new THREE.MeshBasicMaterial({ color: color || 0xffe066, transparent: true, opacity: 0.9, depthWrite: false }));
    m.position.copy(pos); m.lookAt(Q.camera.position); Q.scene.add(m); bursts.push({ m: m, t: 0 });
  }

  // ---------- 화면 표시 ----------
  function objective(msg) { $("objective").textContent = msg || ""; }
  function toast(msg, ms) { window.Game.toast(msg, ms); }
  function showChapterTitle(info) {
    var el = $("chapterTitle");
    el.innerHTML = '<div class="ch-no">퀘스트 ' + info.no + '</div><div class="ch-name">' + info.name + '</div>';
    el.classList.add("show"); document.body.classList.add("titling"); setTimeout(function () { el.classList.remove("show"); document.body.classList.remove("titling"); }, 2600);
  }
  function showCard(info, score) {
    var el = $("card");
    el.innerHTML = '<div class="card-head">정책 카드 ' + info.no + ' · ' + info.policy + '<span class="card-score">' + score + '점</span></div>' +
      '<div class="card-main">' + info.card + '</div><div class="card-more">' + info.more + '</div>' + (window.Extras ? window.Extras.cardTerms(info.id) : '');
    el.classList.add("show"); document.body.classList.add("carding"); talkQ = []; window.Sound.fx.stamp();
  }
  function hideCard() { $("card").classList.remove("show"); document.body.classList.remove("carding"); }

  // 목표 화살표: 화면 안이면 목표 위에, 밖이면 가장자리에
  var v = new THREE.Vector3();
  function updateMarker() {
    var el = $("marker");
    if (!target || state !== "play") { el.style.display = "none"; return; }
    v.set(target.x, target.y, target.z);
    var dist = v.distanceTo(window.Game.flight.pos);
    v.project(Q.camera);
    var behind = v.z > 1, w = window.innerWidth, h = window.innerHeight;
    var x = (v.x * 0.5 + 0.5) * w, y = (-v.y * 0.5 + 0.5) * h;
    if (behind) { x = w - x; y = h - 40; }
    var m = 70, cx = Q.clamp(x, m, w - m), cy = Q.clamp(y, m + 40, h - m - 40), off = behind || cx !== x || cy !== y;
    el.style.display = "block"; el.style.left = cx + "px"; el.style.top = cy + "px";
    el.classList.toggle("off", off);
    $("markerArrow").style.transform = off ? "rotate(" + (Math.atan2(y - h / 2, x - w / 2) * 180 / Math.PI + 90) + "deg)" : "rotate(180deg)";
    $("markerDist").textContent = Math.round(dist) + "m";
  }

  // 말풍선: 줄을 세워 차례로 보여 준다 (게임은 멈추지 않는다)
  var talkQ = [], talkT = 0, pendingTitle = null, storyGap = 0;
  function say(who, text) { talkQ.push({ who: who, text: text }); }
  function updateTalk(dt) {
    var el = $("talk");
    var busy = !!pendingTitle || document.body.classList.contains("titling") || document.body.classList.contains("carding");
    if (talkT > 0) { talkT -= dt; if (talkT <= 0) el.classList.remove("show"); return; }
    if (window.Story && window.Story.active()) storyGap = 0.7; else if (storyGap > 0) storyGap -= dt;
    if (busy || storyGap > 0) return;                                         // 퀘스트 제목이나 정책 카드가 떠 있으면 다음 말을 기다린다
    if (talkT > -0.35) { talkT -= dt; return; }                 // 다음 말 사이 잠깐 쉼
    var n = talkQ.shift(); if (!n) return;
    $("talkFace").className = n.who; $("talkName").textContent = n.who === "dari" ? "달이" : "나르미"; $("talkText").textContent = n.text;
    el.classList.add("show"); talkT = 2.2 + n.text.length * 0.07;
    if (window.Portraits) window.Portraits.apply($("talkFace"), n.who);
    for (var bi = 0; bi < Math.min(14, n.text.length); bi++) (function (i) { setTimeout(function () { window.Sound.babble(n.who, n.text.charCodeAt(i), "talk", i === Math.min(14, n.text.length) - 1); }, i * 58); })(bi);
  }

  // ---------- 진행 ----------
  function startChapter(i) {
    index = i; var info = order[i]; current = window.Chapters[info.id]; state = "play";
    hideCard(); pendingTitle = info;                 // 퀘스트 제목은 날아오른 뒤에 띄운다 (땅에서 타는 장면과 겹치지 않게)
    talkQ = []; (info.talk || []).forEach(function (l) { say(l[0], l[1]); });
    World.setDusk(order.length > 1 ? i / (order.length - 1) * 0.85 : 0);
    window.Sound.setMood(info.id === "deliver" || info.id === "stock" ? "tense" : "calm");
    current.start(ctx);
  }
  function finishChapter(score) {
    var info = order[index]; scores[info.id] = Math.round(Q.clamp(score, 0, 100));
    if (current.cleanup) current.cleanup();
    target = null; objective(""); showCard(info, scores[info.id]); window.Game.team.cheer();
    state = "card";
    var chars = ($("card").textContent || "").replace(/\s/g, "").length;
    wait = Q.clamp(1.5 + chars / 12, 5.5, 9);          // 글자 수에 맞춰 읽을 시간을 준다
  }
  // 오프닝 컷신: 소방대장의 부탁 (상황과 이유를 먼저 보여 준다)
  function opening(next) {
    var S = window.Sets, f = window.Game.flight, yd = S.yard, gy = Math.max(World.height(yd.x, yd.z), 0);
    var cx = yd.x - 5, cz = yd.z - 4, tx = yd.x + 6, tz = yd.z + 3;
    S.chief.rotation.y = Math.atan2(tx - cx, tz - cz);
    f.park(tx, tz, Math.atan2(cx - tx, cz - tz));
    var mx = (cx + tx) / 2, mz = (cz + tz) / 2, dl = Math.hypot(tx - cx, tz - cz), dx = (tx - cx) / dl, dz = (tz - cz) / dl, nx = -dz, nz = dx;   // n: 두 사람을 잇는 선의 옆 방향
    var two = { pos: [mx + nx * 21, gy + 6.5, mz + nz * 21], look: [mx, gy + 4, mz], fov: 44 };
    var chiefCam = { pos: [cx + nx * 17 + dx * 7, gy + 6.5, cz + nz * 17 + dz * 7], look: [cx, gy + 3.8, cz], fov: 44 };
    var hills = { pos: [yd.x - 30, gy + 16, yd.z + 26], look: [S.STATION.x + 120, gy + 45, S.STATION.z + 40], fov: 52 };
    var team = { pos: [tx + nx * 23 - dx * 2, gy + 8, tz + nz * 23 - dz * 2], look: [tx + dx * 1.5, gy + 3, tz + dz * 1.5], fov: 48 };
    window.Story.shot(two.pos, two.look, two.fov, true);
    window.Story.play([
      { who: S.chief, mood: "wave", cam: two, text: "나르미, 달이! 솔바람 마을 소방대장이에요.\n불씨를 더 빨리 찾을 방법이 없을까요?" },
      { who: S.chief, mood: "sad", cam: hills, text: "지난봄, 저 산불을 늦게 발견해서\n마을이 큰일 날 뻔했어요." },
      { who: "dari", cam: team, text: "필요한 걸 찾아 대신 사 주는 게 조달청의 일이에요.\n공방에 좋은 기술이 있나 보러 갈게요!", on: function () { window.Game.team.cheer(); } }
    ], function () {
      window.People.setMood(S.chief, "wave"); window.Story.free();
      f.takeoff(Math.PI - 1.05, 30); next();          // 망루(서쪽) 반대편으로 비스듬히 날아올라 건물을 넘는다
    });
  }

  function begin() {
    order = INFO.filter(function (c) { return !!window.Chapters[c.id]; });
    scores = {}; $("ending").classList.add("hidden");
    opening(function () { startChapter(0); });
  }
  function showEnding() {
    state = "ending"; hideCard(); window.Sound.setMood("win"); window.Sound.fx.win();
    var total = Math.round(order.reduce(function (a, c) { return a + scores[c.id]; }, 0) / order.length);
    var g = GRADES.filter(function (x) { return total >= x.min; }).pop();
    var rows = order.map(function (c) { return '<div class="end-row"><span>' + c.no + '. ' + c.policy + '</span><b>' + scores[c.id] + '점</b></div><div class="end-card">' + c.card + '</div>'; }).join("");
    $("endingBody").innerHTML = '<div class="end-label">나의 조달 등급</div><div class="end-grade">' + g.name + '</div><div class="end-line">' + g.line + '</div>' +
      '<div class="end-total">총점 ' + total + '점</div>' + rows + (window.Extras ? window.Extras.termsHtml() : '') + '<div class="end-flow">조달청이 한 일: 혁신을 찾고 → 공정하게 계약하고 → 비축으로 지키고 → 꼼꼼히 검사해서 → 국민 곁에 전달!</div><div class="end-closing">한 해 225조 원의 공공조달, 그 길을 조달청이 잇습니다.</div>';
    $("ending").classList.remove("hidden");
  }

  Q.add(function (dt, t) {
    for (var i = bursts.length - 1; i >= 0; i--) {
      var b = bursts[i]; b.t += dt; b.m.scale.setScalar(1 + b.t * 26); b.m.material.opacity = Math.max(0, 0.9 - b.t * 1.6);
      if (b.t > 0.6) { Q.scene.remove(b.m); bursts.splice(i, 1); }
    }
    if (state === "play" && current) {
      var res = current.update(dt, t, ctx);
      if (typeof res === "number") finishChapter(res);
    } else if (state === "card") {
      wait -= dt;
      if (wait <= 0) { if (index + 1 < order.length) startChapter(index + 1); else showEnding(); }
    }
    if (pendingTitle && !(window.Game.flight.parked && window.Game.flight.parked())) { showChapterTitle(pendingTitle); pendingTitle = null; }
    updateTalk(dt); updateMarker();
  });

  ctx = {
    get flight() { return window.Game.flight; }, get team() { return window.Game.team; },
    objective: objective, toast: toast, say: say, beam: beam, star: star, drone: drone, burst: burst,
    setTarget: function (x, y, z) { target = x === null ? null : { x: x, y: y, z: z }; },
    remove: function (o) { if (o) Q.scene.remove(o); }
  };

  window.Missions = {
    clearTalk: function () { talkQ = []; talkT = 0; $("talk").classList.remove("show"); },
    drone: drone,
    begin: begin, state: function () { return state; }, target: function () { return target; }, chapter: function () { return order[index] && order[index].id; }, scores: function () { return scores; }, info: INFO,
    freeFly: function () { state = "free"; $("ending").classList.add("hidden"); objective("자유 비행 · 마을을 마음껏 구경하세요"); window.Sound.setMood("calm"); }
  };
})();
