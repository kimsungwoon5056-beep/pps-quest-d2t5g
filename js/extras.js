// 더하기 요소: ① 조달 용어 8개(장이 끝날 때 정책 카드에서 배우고 엔딩에 정리) ② 엔딩의 인증서 그림 저장 ③ 결말 뒤 산을 지키는 순찰 드론
(function () {
  "use strict";
  var Q = window.Q, THREE = Q.THREE, Toon = window.Toon, World = window.World;
  var $ = function (id) { return document.getElementById(id); };

  // ---------- ① 조달 용어: 그 장에서 직접 해 본 일의 이름을 정책 카드에서 알려 준다 ----------
  var TERMS = [
    { t: "조달", d: "나라에 필요한 것을 대신 골라 사 주는 일", ch: "find" },
    { t: "혁신제품", d: "공공 서비스를 더 좋게 만드는 새 기술 제품", ch: "find" },
    { t: "나라장터", d: "공공기관과 기업이 만나는 온라인 장터", ch: "bid" },
    { t: "입찰", d: "기업들이 값과 조건을 내고 겨루는 것", ch: "bid" },
    { t: "담합", d: "기업끼리 값을 미리 짜는 반칙", ch: "bid" },
    { t: "비축", d: "위기에 대비해 원자재를 미리 쌓아 두는 것", ch: "stock" },
    { t: "품질점검", d: "약속한 품질인지 꼼꼼히 확인하는 일", ch: "check" },
    { t: "수요기관", d: "물건이 실제로 필요한 학교·소방서 같은 곳", ch: "deliver" }
  ];
  var learned = {}, got = 0;
  function cardTerms(ch) {                        // 정책 카드 아래에 붙일 "이번에 배운 말"
    var list = TERMS.filter(function (x) { return x.ch === ch; });
    list.forEach(function (x) { if (!learned[x.t]) { learned[x.t] = true; got++; } });
    if (!list.length) return "";
    return '<div class="card-terms"><span class="card-terms-head">배운 말</span>' + list.map(function (x) { return '<span class="card-term"><b>' + x.t + '</b> ' + x.d + '</span>'; }).join("") + '</div>';
  }
  function termsHtml() {
    var rows = TERMS.filter(function (x) { return learned[x.t]; }).map(function (x) { return '<span class="term-chip on" title="' + x.d + '">' + x.t + '</span>'; }).join("");
    return rows ? '<div class="end-terms"><span class="end-terms-head">배운 조달 용어</span>' + rows + '</div>' : "";
  }

  // ---------- ③ 순찰 드론: 이야기가 끝나면 산과 마을 위를 돈다 ----------
  var patrol = [], patrolOn = false;
  function startPatrol() {
    if (patrolOn || !window.Missions.drone) return; patrolOn = true;
    [[240, 340, 46, 78], [240, 340, 70, 92], [120, 300, 34, 46], [-40, 120, 60, 70]].forEach(function (p, i) {
      var d = window.Missions.drone(); d.scale.setScalar(3); Q.scene.add(d);
      patrol.push({ d: d, cx: p[0], cz: p[1], r: p[2], y: Math.max(World.height(p[0], p[1]), 0) + p[3] * 0.6, a: i * 1.7, sp: 0.28 + i * 0.05 });
    });
  }

  Q.add(function (dt, t) {
    var G = window.Game, M = window.Missions; if (!G || !G.flight || !M) return;
    var st = M.state();
    if (st === "ending" || st === "free") startPatrol();
    for (var j = 0; j < patrol.length; j++) {
      var p = patrol[j]; p.a += dt * p.sp;
      p.d.position.set(p.cx + Math.cos(p.a) * p.r, p.y + Math.sin(t * 1.3 + j) * 1.5, p.cz + Math.sin(p.a) * p.r);
      p.d.rotation.y = -p.a; p.d.userData.rotors.forEach(function (r) { r.rotation.y += dt * 40; });
    }
  });

  // ---------- ② 인증서 그림 저장 ----------
  function saveCert() {
    var M = window.Missions, sc = M.scores(), ids = Object.keys(sc), total = ids.length ? Math.round(ids.reduce(function (a, k) { return a + sc[k]; }, 0) / ids.length) : 0;
    var grade = ($("endingBody").querySelector(".end-grade") || {}).textContent || "";
    var W = 1200, H = 630, cv = document.createElement("canvas"); cv.width = W; cv.height = H; var c = cv.getContext("2d");
    var src = Q.renderer.domElement, k = Math.max(W / src.width, H / src.height);
    try { c.drawImage(src, (W - src.width * k) / 2, (H - src.height * k) / 2, src.width * k, src.height * k); } catch (e) { c.fillStyle = "#8fd3ff"; c.fillRect(0, 0, W, H); }
    var gr = c.createLinearGradient(0, 0, W, 0); gr.addColorStop(0, "rgba(27,42,92,0.92)"); gr.addColorStop(0.62, "rgba(27,42,92,0.55)"); gr.addColorStop(1, "rgba(27,42,92,0.05)");
    c.fillStyle = gr; c.fillRect(0, 0, W, H);
    c.lineWidth = 10; c.strokeStyle = "#ffd23f"; c.strokeRect(18, 18, W - 36, H - 36);
    var F = "'Jua','Noto Sans KR','Malgun Gothic',sans-serif"; c.textBaseline = "alphabetic";
    c.fillStyle = "#ffffff"; c.font = "700 34px " + F; c.fillText("나르미와 달이의 조달 퀘스트", 70, 110);
    c.fillStyle = "#ffd23f"; c.font = "900 104px " + F; c.fillText(grade || "조달 지킴이", 66, 240);
    c.fillStyle = "#ffffff"; c.font = "800 44px " + F; c.fillText("총점 " + total + "점", 70, 318);
    c.font = "600 30px " + F; c.fillStyle = "#e8eefc";
    ["혁신을 찾고 → 공정하게 계약하고 → 비축으로 지키고", "→ 꼼꼼히 검사해서 → 국민 곁에 전달했어요!"].forEach(function (s, i) { c.fillText(s, 70, 400 + i * 44); });
    c.fillStyle = "#ffd23f"; c.font = "700 28px " + F; c.fillText("한 해 225조 원의 공공조달, 그 길을 조달청이 잇습니다", 70, 560);
    cv.toBlob(function (b) {
      var a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = "조달퀘스트_인증서.png"; document.body.appendChild(a); a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 800);
    }, "image/png");
    return cv;
  }
  window.addEventListener("DOMContentLoaded", function () { var b = $("certBtn"); if (b) b.addEventListener("click", saveCert); });
  if (document.readyState !== "loading") { var b0 = $("certBtn"); if (b0) b0.addEventListener("click", saveCert); }

  window.Extras = { termsHtml: termsHtml, cardTerms: cardTerms, got: function () { return got; }, total: TERMS.length, saveCert: saveCert };
})();

// ---------- ④ 조달 여정 표시줄 · ⑤ 도움말(멈춤) · ⑥ 최고 기록 ----------
(function () {
  "use strict";
  var Q = window.Q, $ = function (id) { return document.getElementById(id); };
  var STEPS = [["find", "찾기"], ["bid", "계약"], ["stock", "비축"], ["check", "검사"], ["deliver", "전달"]];
  var hud = $("hud"), bar = document.createElement("div"); bar.id = "steps";
  bar.innerHTML = STEPS.map(function (s, i) { return (i ? '<span class="step-line"></span>' : '') + '<span class="step" data-id="' + s[0] + '"><b>' + (i + 1) + '</b>' + s[1] + '</span>'; }).join("");
  var top = document.createElement("div"); top.id = "topbar";
  if (hud) { hud.appendChild(top); var ob0 = $("objective"); if (ob0) top.appendChild(ob0); top.appendChild(bar); }
  var lastKey = "";

  // 도움말: 게임을 멈추고 조작과 할 일을 보여 준다
  var help = document.createElement("div"); help.id = "help"; help.className = "hidden";
  help.innerHTML = '<div class="help-box"><div class="help-title">잠깐 멈춤</div>' +
    '<div class="help-row pc"><b>마우스</b> 화면을 클릭한 뒤 움직이면 방향이 바뀌어요 (Esc로 풀기)</div>' +
    '<div class="help-row pc"><b>WASD·방향키</b> 방향 잡기</div>' +
    '<div class="help-row pc"><b>Space·Shift·클릭</b> 부스트 &nbsp; <b>Q·E·우클릭</b> 한 바퀴 구르기</div>' +
    '<div class="help-row touch"><b>화면 끌기</b> 방향 잡기 &nbsp; <b>부스트 버튼</b> 빠르게</div>' +
    '<div class="help-row touch"><b>두 번 톡</b> 한 바퀴 구르기 &nbsp; <b>폰 가로로 돌리기</b> 더 넓게 보기</div>' +
    '<div class="help-row"><b>대화·고르기</b> 화면을 누르면 넘어가요</div>' +
    '<button id="helpClose" class="btn">계속하기</button></div>';
  var ui = $("ui") || document.body; ui.appendChild(help);
  var helpBtn = document.createElement("button"); helpBtn.id = "helpBtn"; helpBtn.textContent = "?"; helpBtn.setAttribute("aria-label", "도움말");
  ui.appendChild(helpBtn);
  var open = false;
  function setHelp(on) {
    if (on === open) return; open = on; help.classList.toggle("hidden", !on);
    if (on && document.pointerLockElement) document.exitPointerLock();
    Q.pause(on);
  }
  helpBtn.addEventListener("click", function (e) { e.stopPropagation(); setHelp(!open); });
  help.addEventListener("click", function (e) { if (e.target === help || e.target.id === "helpClose") setHelp(false); });
  window.addEventListener("keydown", function (e) { var k = e.key.toLowerCase(); if (k === "h" || k === "ㅗ" || k === "p" || k === "ㅔ") setHelp(!open); else if (open && (k === "escape" || k === "enter")) setHelp(false); });

  // 최고 기록: 이 기기에만 저장 (개인정보 없음)
  var saved = false;
  function best() { try { return JSON.parse(localStorage.getItem("ppsQuestBest") || "null"); } catch (e) { return null; } }
  function showBest() {
    var b = best(), t = $("title"); if (!b || !t || $("bestLine")) return;
    var d = document.createElement("div"); d.id = "bestLine"; d.textContent = "최고 기록: " + b.grade + " " + b.total + "점";
    var btn = t.querySelector("button"); if (btn && btn.parentNode) btn.parentNode.insertBefore(d, btn.nextSibling); else t.appendChild(d);
  }
  showBest();

  Q.add(function () {
    var M = window.Missions; if (!M) return;
    var st = M.state(), id = M.chapter(), key = st + ":" + id;
    helpBtn.style.display = st === "ending" ? "none" : "";
    // 부스트 버튼은 날고 있을 때만 (땅에 서 있거나 엔딩이면 숨김)
    var fl = window.Game && window.Game.flight;
    document.body.classList.toggle("grounded", st === "ending" || !fl || !fl.enabled() || fl.parked());
    document.body.classList.toggle("ending", st === "ending");
    if (key !== lastKey) {
      lastKey = key;
      var idx = -1; STEPS.forEach(function (s, i) { if (s[0] === id) idx = i; });
      bar.style.display = st === "card" ? "flex" : "none";            // 여정줄은 장이 끝나 정책 카드가 뜰 때만 보여 준다
      top.classList.toggle("journey", st === "card");
      [].forEach.call(bar.querySelectorAll(".step"), function (el, i) {
        el.classList.toggle("done", i < idx || (i === idx && st === "card")); el.classList.toggle("now", i === idx && st === "play");
      });
      [].forEach.call(bar.querySelectorAll(".step-line"), function (el, i) { el.classList.toggle("done", i < idx); });
    }
    if (st === "ending" && !saved) {
      saved = true;
      // 축하 색종이
      var box = document.createElement("div"); box.id = "confetti"; var cols = ["#ffd23f", "#e23b3b", "#3ad1c5", "#2f8fd0", "#f29a45", "#ffffff"];
      for (var ci = 0; ci < 70; ci++) { var p = document.createElement("i"); p.style.left = (Math.random() * 100) + "%"; p.style.background = cols[ci % cols.length]; p.style.animationDelay = (Math.random() * 2.2) + "s"; p.style.animationDuration = (2.6 + Math.random() * 2.4) + "s"; p.style.transform = "rotate(" + (Math.random() * 360) + "deg)"; box.appendChild(p); }
      (document.getElementById("ui") || document.body).appendChild(box); setTimeout(function () { box.remove(); }, 7000);
      var sc = M.scores(), ids = Object.keys(sc), total = ids.length ? Math.round(ids.reduce(function (a, k) { return a + sc[k]; }, 0) / ids.length) : 0;
      var grade = (($("endingBody") || document).querySelector(".end-grade") || {}).textContent || "", terms = window.Extras ? window.Extras.got() : 0, b = best();
      if (!b || total > b.total || (total === b.total && terms > b.terms)) { try { localStorage.setItem("ppsQuestBest", JSON.stringify({ total: total, grade: grade, terms: terms })); } catch (e) {} }
    }
  });
})();

// ---------- ⑦ 마을 주민 · ⑧ 새 떼 · ⑨ 엔딩 OX 퀴즈 ----------
(function () {
  "use strict";
  var Q = window.Q, THREE = Q.THREE, Toon = window.Toon, World = window.World, $ = function (id) { return document.getElementById(id); };

  // 마을 주민: 세 마을과 소방서 근처에 서 있다가, 나르미가 가까이 날면 올려다보며 손을 흔든다
  var SPOTS = [[-88, -160, "villA", 1.1], [-103, -180, "villD", 0.85], [130, 46, "villB", 1.1], [116, 112, "villC", 0.85], [-63, 243, "villC", 1.1], [-79, 259, "villA", 0.85], [141, 317, "villB", 1.05], [150, 322, "villD", 0.8]];
  var folk = [], made = false, greeted = 0, freeLine = "";
  function makeFolk() {
    made = true; if (!window.People) return;
    SPOTS.forEach(function (s, i) {
      var x = s[0], z = s[1], tries = 0;
      while (!World.isFlat(x, z) && tries < 8) { x += 5; z += 3; tries++; }        // 물이나 비탈이면 조금 옮긴다
      var g = window.People.stand(window.People.make(s[2]), x, z, i * 1.3, s[3]);
      folk.push({ g: g, mood: "idle", hi: false });
    });
  }

  // 새 떼: 작은 새 다섯 마리가 V자로 하늘을 돈다
  var flocks = [];
  function makeFlocks() {
    [[-40, -120, 150, 95, 0.09], [60, 220, 120, 110, -0.075]].forEach(function (f, fi) {
      var grp = new THREE.Group(), birds = [];
      for (var i = 0; i < 5; i++) {
        var b = new THREE.Group(), body = Toon.ball(0.5, 0xffffff, 0.7, 0.6, 1.6); b.add(body);
        var wl = Toon.mesh(new THREE.BoxGeometry(1.6, 0.08, 0.6), 0xeef2f7), wr = wl.clone(); wl.position.x = -0.8; wr.position.x = 0.8;
        var pl = new THREE.Group(), pr = new THREE.Group(); pl.add(wl); pr.add(wr); b.add(pl); b.add(pr);
        var row = Math.ceil(i / 2), side = i % 2 ? 1 : -1;
        b.position.set(i ? side * row * 2.6 : 0, 0, -row * 2.4); grp.add(b); birds.push({ pl: pl, pr: pr, ph: i * 0.8 });
      }
      Q.scene.add(grp); flocks.push({ g: grp, birds: birds, cx: f[0], cz: f[1], r: f[2], y: f[3], sp: f[4], a: fi * 2 });
    });
  }
  makeFlocks();

  Q.add(function (dt, t) {
    var G = window.Game, M = window.Missions; if (!G || !G.flight || !M) return;
    if (!made) makeFolk();
    var p = G.flight.pos, st = M.state();
    for (var i = 0; i < folk.length; i++) {
      var f = folk[i], g = f.g, d = Math.hypot(p.x - g.position.x, p.z - g.position.z);
      var mood = (st === "ending" || st === "free") && d < 140 ? "cheer" : d < 75 ? "wave" : "idle";
      if (mood !== f.mood) { f.mood = mood; window.People.setMood(g, mood); }
    }
    for (var j = 0; j < flocks.length; j++) {
      var fl = flocks[j]; fl.a += dt * fl.sp;
      fl.g.position.set(fl.cx + Math.cos(fl.a) * fl.r, fl.y + Math.sin(t * 0.5 + j) * 6, fl.cz + Math.sin(fl.a) * fl.r);
      fl.g.rotation.y = -fl.a + (fl.sp > 0 ? 0 : Math.PI);
      fl.birds.forEach(function (b) { var w = Math.sin(t * 9 + b.ph) * 0.7; b.pl.rotation.z = -w; b.pr.rotation.z = w; });
    }
  });

  // 엔딩 OX 퀴즈: 게임에서 본 내용을 세 문제로 다시 짚는다 (점수와는 별개)
  var QUIZ = [
    ["조달청은 나라에 필요한 물건과 서비스를 대신 골라 사 주는 곳이다.", true, "맞아요! 그래서 '나라의 장보기 담당'이라고 할 수 있어요."],
    ["나라장터는 공공기관과 기업이 만나는 온라인 조달 장터다.", true, "맞아요! 누구나 같은 규칙으로 입찰에 참여해요."],
    ["기업끼리 입찰 값을 미리 짜고 들어와도 괜찮다.", false, "아니에요. 그건 '담합'이라는 반칙이라 걸러내요."],
    ["조달청은 값이 뛸 때를 대비해 금속 같은 원자재를 미리 쌓아 둔다.", true, "맞아요! 이걸 '비축'이라고 해요."],
    ["새 기술 제품은 써 본 곳이 없으면 조달청도 살 수 없다.", false, "아니에요. 혁신제품은 조달청이 먼저 사서 써 보게 해요."],
    ["세금으로 산 물건은 검사 없이 바로 보낸다.", false, "아니에요. 꼼꼼히 품질을 점검한 뒤 보내요."],
    ["우리나라 공공조달 규모는 한 해 약 225조 원이다.", true, "맞아요! 그만큼 큰 살림이라 공정함이 중요해요."],
    ["수요기관은 물건이 실제로 필요한 학교·소방서 같은 공공기관이다.", true, "맞아요! 조달청이 수요기관과 기업을 이어 줘요."]
  ];
  var box = document.createElement("div"); box.id = "quiz"; box.className = "hidden";
  box.innerHTML = '<div class="quiz-box"><div class="quiz-head" id="quizHead"></div><div class="quiz-q" id="quizQ"></div>' +
    '<div class="quiz-btns" id="quizBtns"><button class="btn quiz-o" data-a="1">O 맞아요</button><button class="btn alt quiz-x" data-a="0">X 아니에요</button></div>' +
    '<div class="quiz-why" id="quizWhy"></div><button class="btn hidden" id="quizNext">다음</button></div>';
  ($("ui") || document.body).appendChild(box);
  var set = [], qi = 0, right = 0;
  function ask() {
    var q = set[qi]; $("quizHead").textContent = "조달 OX 퀴즈 " + (qi + 1) + "/" + set.length; $("quizQ").textContent = q[0];
    $("quizWhy").textContent = ""; $("quizBtns").classList.remove("hidden"); $("quizNext").classList.add("hidden");
  }
  function start() {
    var pool = QUIZ.slice(); set = []; for (var i = 0; i < 3; i++) set.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
    qi = 0; right = 0; box.classList.remove("hidden"); ask();
  }
  box.addEventListener("click", function (e) {
    var a = e.target.getAttribute && e.target.getAttribute("data-a");
    if (a !== null && a !== undefined) {
      var q = set[qi], ok = (a === "1") === q[1]; if (ok) right++;
      window.Sound.fx[ok ? "good" : "bad"]();
      $("quizWhy").textContent = (ok ? "정답! " : "아쉬워요. ") + q[2];
      $("quizBtns").classList.add("hidden"); $("quizNext").classList.remove("hidden"); $("quizNext").textContent = qi + 1 < set.length ? "다음" : "결과 보기";
    } else if (e.target.id === "quizNext") {
      if (++qi < set.length) return ask();
      if (qi === set.length) {
        $("quizHead").textContent = "퀴즈 결과"; $("quizQ").textContent = set.length + "문제 중 " + right + "문제 정답!";
        $("quizWhy").textContent = right === set.length ? "완벽해요! 진짜 조달 마스터네요." : "게임을 한 번 더 하면 다 맞힐 수 있어요.";
        $("quizNext").textContent = "닫기"; if (right === set.length) window.Sound.fx.win();
      } else box.classList.add("hidden");
    } else if (e.target === box) box.classList.add("hidden");
  });
  var qb = document.createElement("button"); qb.id = "quizBtn"; qb.className = "btn alt"; qb.textContent = "조달 퀴즈";
  var row = document.querySelector(".end-buttons"); if (row) row.appendChild(qb);
  qb.addEventListener("click", start);
  window.Extras.quiz = start;
})();
