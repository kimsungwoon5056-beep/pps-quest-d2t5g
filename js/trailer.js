// 1분 예고편 모드: 주소에 ?trailer=1 을 붙이면 게임의 핵심 장면을 약 60초 동안 자동으로 보여 준다 (시연영상 녹화용).
// 장면 사이는 화면을 가린 채 빨리 감고, 보여 줄 장면만 실제 속도로 재생한다. 화면을 한 번 누르면 시작한다(소리 켜기·전체 화면).
(function () {
  "use strict";
  if (!/[?&]trailer=1/.test(location.search)) return;
  var Q = window.Q, $ = function (id) { return document.getElementById(id); };
  document.body.classList.add("trailer");

  // ---------- 화면 장치: 시작 안내, 장면 제목(가림막) ----------
  var ui = $("ui") || document.body;
  var start = document.createElement("div"); start.id = "trStart";
  start.innerHTML = '<div class="tr-box">녹화를 켠 뒤 화면을 누르세요<br><small>약 60초 예고편이 자동으로 재생됩니다</small></div>';
  ui.appendChild(start);
  var cap = document.createElement("div"); cap.id = "trCap"; ui.appendChild(cap);
  function showCap(big, small) { cap.innerHTML = '<div class="tr-no">' + (small || "") + '</div><div class="tr-big">' + big + '</div>'; cap.classList.add("show"); }
  function hideCap() { cap.classList.remove("show"); }

  // ---------- 조종: 목표 쪽으로 난다 (봇과 같은 방식) ----------
  function pilot() {
    var M = window.Missions, tg = M.target(); if (!tg || M.state() !== "play") return { x: 0, y: 0, boost: false };
    var f = window.Game.flight, p = f.pos, dx = tg.x - p.x, dz = tg.z - p.z, dist = Math.hypot(dx, dz);
    var want = Math.atan2(dx, dz), cd = window.Chapters[M.chapter()]; if (cd && cd.dodge) want = cd.dodge(p, f.yaw(), want);
    var diff = Math.atan2(Math.sin(want - f.yaw()), Math.cos(want - f.yaw()));
    var ty = cd && cd.dodge && dist > 60 ? Math.max(window.World.height(p.x, p.z), 0) + 15 : tg.y;
    return { x: Q.clamp(-diff * 2.2, -1, 1), y: Q.clamp((ty - p.y) / 25, -1, 1), boost: dist > 170 && Math.abs(diff) < 0.3 };
  }

  // ---------- 빨리 감기: 그리지 않고 게임 시간만 돌린다 ----------
  var lines = [];
  var playOrig = window.Story.play;
  window.Story.play = function (ls, cb) { lines = ls.map(function (l) { return l.text; }); return playOrig(ls, cb); };
  function dlg() { return $("dlgText").textContent || ""; }
  function ff(pred, opt) {
    opt = opt || {}; var n = 0;
    while (n < 30 * 400 && !pred()) {
      if (window.Story.active() && !(opt.keepStory && opt.keepStory())) window.Story.skip();
      var M = window.Missions, c = window.Chapters[M.chapter()];
      if (c && c.auto && M.state() === "play" && !opt.noAuto) c.auto();
      Q.step(1 / 30, 1, true); n++;
    }
    Q.step(1 / 30, 1);
  }
  // 실제 속도로 sec초 재생: 대사는 다 나오면 잠깐 뒤 넘기고, 고르기 장면은 장이 스스로 고른다
  function live(sec, opt) {
    opt = opt || {};
    return new Promise(function (res) {
      var t0 = performance.now(), seen = 0, last = performance.now();
      Q.pause(false);
      (function tick() {
        var now = performance.now(), el = (now - t0) / 1000; last = now;
        if (window.Story.active() && !opt.holdStory) {
          if ($("dlgNext").style.visibility === "visible") { seen += 1 / 60; if (seen > (opt.read || 0.9) && window.Q.clickHandler) { seen = 0; window.Q.clickHandler(0, 0); } }
        }
        var M = window.Missions, c = window.Chapters[M.chapter()];
        if (opt.auto && c && c.auto && M.state() === "play" && !window.Story.active()) c.auto();
        if (el >= sec) { Q.pause(true); return res(); }
        requestAnimationFrame(tick);
      })();
    });
  }
  function wait(sec) { return new Promise(function (r) { setTimeout(r, sec * 1000); }); }
  async function chapterCut(big, small, pred, opt) {
    showCap(big, small); await wait(0.15); ff(pred, opt); if (window.Missions.clearTalk) window.Missions.clearTalk(); await wait(0.75); hideCap(); await wait(0.25);
  }

  async function run() {
    Q.autopilot = pilot;
    // 0. 타이틀 (3.5초)
    await wait(3.5);
    window.Game.begin(); Q.pause(true);
    // 1. 오프닝: 소방대장의 부탁 (6초)
    ff(function () { return window.Story.active() && dlg().length > 0; }, { keepStory: function () { return true; } });
    await live(5.6, { read: 0.55 });
    // 2. 1장: 지우의 드론 시험 비행 (6초)
    await chapterCut("혁신을 찾고", "1", function () { return window.Missions.chapter() === "find" && lines.some(function (t) { return /연기를 스스로/.test(t); }) && !window.Story.active() && !window.Game.flight.parked(); });
    ff(function () { return /\(1\/3\)/.test($("objective").textContent); });
    await live(5.5);
    // 혁신제품 도장 (3.5초)
    ff(function () { return window.Story.active() && /시험 통과/.test(dlg()); }, { keepStory: function () { return lines.some(function (t) { return /시험 통과/.test(t); }); } });
    await live(3.4, { holdStory: true });
    // 3. 2장: 수상한 입찰서 가려내기 (6.5초)
    await chapterCut("공정하게 계약하고", "2", function () { return document.body.classList.contains("picking") && window.Missions.chapter() === "bid"; }, { noAuto: true });
    await live(6.5, { auto: true, read: 0.6 });
    // 4. 3장: 비축 금속 내려 주기 (6초)
    await chapterCut("비축으로 지키고", "3", function () { return window.Missions.chapter() === "stock" && /\(1\/5\)/.test($("objective").textContent); });
    await live(6);
    // 5. 4장: 불량 드론 골라내기 (5.5초)
    await chapterCut("꼼꼼히 검사해서", "4", function () { return document.body.classList.contains("picking") && window.Missions.chapter() === "check"; }, { noAuto: true });
    await live(5.5, { auto: true, read: 0.6 });
    // 6. 5장: 드론이 불씨를 찾는다 (9초)
    await chapterCut("국민 곁에 전달!", "5", function () { return window.Missions.chapter() === "deliver" && document.body.classList.contains("cine") && window.Game.flight.parked() && !window.Story.active(); });
    await live(8.9, { read: 0.6 });
    // 7. 에필로그: 읍내로 퍼지는 드론 (4.5초)
    ff(function () { return window.Story.active() && /읍내 학교/.test(lines.join("|")) && /읍내 학교/.test(dlg()); }, { keepStory: function () { return lines.some(function (t) { return /읍내 학교/.test(t); }); } });
    // 읍내 줄이 나올 때까지 대사를 넘긴다
    for (var k = 0; k < 12 && !/읍내 학교/.test(dlg()); k++) { if (window.Q.clickHandler) { window.Q.clickHandler(0, 0); window.Q.clickHandler(0, 0); } Q.step(1 / 30, 30, true); }
    Q.step(1 / 30, 1);
    await live(4.6, { holdStory: true });
    // 8. 엔딩: 등급 (5초)
    showCap("한 해 225조 원의 공공조달", "조달청이 잇습니다"); await wait(0.15);
    ff(function () { return window.Missions.state() === "ending"; });
    await wait(0.6); hideCap();
    await live(4.2);
    showCap("나르미와 달이의 조달 퀘스트", "2026 조달청 AI 게임·콘텐츠 공모전 출품작");
    cap.insertAdjacentHTML("beforeend", '<div class="tr-logo"><img src="img/pps-logo.png" alt="조달청"></div>');
  }

  start.addEventListener("click", function () {
    start.remove();
    try { window.Sound.unlock(); } catch (e) {}
    var d = document.documentElement; if (d.requestFullscreen) { try { var p = d.requestFullscreen(); if (p && p.catch) p.catch(function () {}); } catch (e) {} }
    setTimeout(run, 400);
  });
})();
