// 시작: 세상과 캐릭터를 만들고, 타이틀 → 비행으로 넘어간다
(function () {
  "use strict";
  var Q = window.Q;
  window.World.build();
  var team = window.Characters.buildTeam();
  var flight = window.Flight.create(team);

  var title = document.getElementById("title"), hud = document.getElementById("hud"), toastEl = document.getElementById("toast");
  var objective = document.getElementById("objective"), muteBtn = document.getElementById("muteBtn"), toastTimer = null;

  function toast(msg, ms) {
    toastEl.textContent = msg; toastEl.classList.add("show");
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { toastEl.classList.remove("show"); }, ms || 1800);
  }
  function setObjective(msg) { objective.textContent = msg || ""; }

  function begin() {
    window.Sound.unlock();
    // 폰: 주소창이 화면을 가리지 않게 전체 화면으로 (막히면 그냥 넘어간다)
    if (Q.isTouch && !document.fullscreenElement) {
      var d = document.documentElement, fs = d.requestFullscreen || d.webkitRequestFullscreen;
      if (fs) { try { var p = fs.call(d); if (p && p.catch) p.catch(function () {}); } catch (e) {} }
    }
    title.classList.add("hidden"); window.Sound.fx.good();
    if (skipIntro) return launch();
    intro.classList.remove("hidden");
  }
  var intro = document.getElementById("intro"), introBtn = document.getElementById("introBtn"), introStep = 0, skipIntro = false;
  function launch() {
    intro.classList.add("hidden"); hud.classList.remove("hidden");
    flight.enable(true); team.cheer(); window.Sound.fx.good();
    window.Missions.begin();
  }
  introBtn.addEventListener("click", function () {
    window.Sound.fx.star();
    var steps = intro.querySelectorAll(".intro-step");
    if (++introStep >= steps.length) return launch();
    for (var i = 0; i < steps.length; i++) steps[i].classList.toggle("hidden", i !== introStep);
    if (introStep === steps.length - 1) introBtn.textContent = "출발!";
  });
  document.getElementById("startBtn").addEventListener("click", begin);
  window.addEventListener("keydown", function (e) { if ((e.key === "Enter" || e.key === " ") && !title.classList.contains("hidden")) begin(); });
  muteBtn.addEventListener("click", function () { window.Sound.unlock(); muteBtn.classList.toggle("off", window.Sound.toggle()); });

  if (/[?&]mute=1/.test(location.search)) { muteBtn.classList.toggle("off", window.Sound.toggle()); }
  document.getElementById("againBtn").addEventListener("click", function () { location.reload(); });
  document.getElementById("freeBtn").addEventListener("click", function () { window.Missions.freeFly(); });

  window.Game = { team: team, flight: flight, toast: toast, setObjective: setObjective, begin: function () { skipIntro = true; begin(); } };
  Q.start();
})();
