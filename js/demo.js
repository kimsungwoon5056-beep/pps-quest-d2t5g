// 자동 시연 모드: 주소에 ?demo=1 을 붙이면 게임이 처음부터 끝까지 스스로 진행된다 (행사 부스 전시·시연영상 촬영용).
// 화면을 누르거나 키를 누르면 바로 직접 플레이로 바뀐다. 엔딩 뒤에는 처음으로 돌아가 반복한다.
(function () {
  "use strict";
  if (!/[?&]demo=1/.test(location.search)) return;
  var Q = window.Q, $ = function (id) { return document.getElementById(id); };
  var on = true, clock = 0, lineT = 0, endT = 0, introT = 0, started = false;
  var badge = document.createElement("div"); badge.id = "demoBadge"; badge.textContent = "자동 시연 중 · 화면을 누르면 직접 플레이";
  ($("ui") || document.body).appendChild(badge);

  function pilot() {
    var M = window.Missions, tg = M.target(); if (!on || !tg || M.state() !== "play") return on ? { x: 0, y: 0, boost: false } : null;
    var f = window.Game.flight, p = f.pos, dx = tg.x - p.x, dz = tg.z - p.z, dist = Math.hypot(dx, dz);
    var want = Math.atan2(dx, dz); var cd = window.Chapters[window.Missions.chapter()]; if (cd && cd.dodge) want = cd.dodge(p, f.yaw(), want);
    var diff = Math.atan2(Math.sin(want - f.yaw()), Math.cos(want - f.yaw()));
    return { x: Q.clamp(-diff * 2.2, -1, 1), y: Q.clamp(((cd && cd.dodge && dist > 60 ? Math.max(window.World.height(p.x, p.z), 0) + 15 : tg.y) - p.y) / 25, -1, 1), boost: dist > 170 && Math.abs(diff) < 0.3 };
  }
  function stop() {
    if (!on) return; on = false; Q.autopilot = null; badge.style.display = "none";
  }
  // 사람이 조작하면 시연을 멈춘다 (프로그램이 보낸 가짜 입력은 무시)
  window.addEventListener("pointerdown", function (e) { if (e.isTrusted) stop(); }, true);
  window.addEventListener("keydown", function (e) { if (e.isTrusted) stop(); }, true);

  Q.autopilot = pilot;
  Q.add(function (dt) {
    if (!on) return;
    clock += dt;
    var M = window.Missions, S = window.Story, st = M.state();
    // 타이틀과 소개 화면을 차례로 넘긴다
    if (!started) {
      if (!$("title").classList.contains("hidden")) { if (clock > 3.5) $("startBtn").click(); return; }
      if (!$("intro").classList.contains("hidden")) { introT += dt; if (introT > 4.5) { introT = 0; $("introBtn").click(); } return; }
      started = true;
    }
    // 대화: 글이 다 나오면 잠깐 읽을 시간을 준 뒤 넘긴다
    if (S.active()) {
      if ($("dlgNext").style.visibility === "visible") { lineT += dt; if (lineT > 1.7) { lineT = 0; if (Q.clickHandler) Q.clickHandler(0, 0); } }
      else lineT = 0;
    } else if (st === "play") {
      var ch = window.Chapters[M.chapter()]; if (ch && ch.auto) ch.auto();     // 고르기 장면은 장이 스스로 풀이를 보여 준다
    }
    if (st === "ending") { endT += dt; if (endT > 16) location.reload(); }
  });
})();
