/* 달빛 아르카나 — 화면 흐름 및 리딩 로직
 * data.js(window.TAROT) 가 먼저 로드되어 있어야 한다.
 */
(function () {
  "use strict";

  var T = window.TAROT;
  var SUITS = T.SUITS;
  var SPREADS = T.SPREADS;
  var SPREAD_ORDER = T.SPREAD_ORDER;

  /* ============ 상태 ============ */
  var state = { key: null, spread: null, topic: "", deck: [], picks: [] };
  var revealTimers = [];
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var $ = function (id) { return document.getElementById(id); };

  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  function showScreen(name) {
    ["spread", "topic", "pick", "reading"].forEach(function (n) {
      $("screen-" + n).classList.toggle("active", n === name);
    });
    $("homeBtn").hidden = (name === "spread");
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
  }

  /* ---- 카드 조각 렌더 ---- */
  function cardFaceHTML(pick) {
    var c = pick.card;
    return '<div class="tcard' + (pick.orient === "reversed" ? " reversed" : "") + '">' +
      '<img class="tcard-photo" src="' + c.img + '" alt="' + esc(c.name) + '" draggable="false">' +
      '</div>';
  }
  function backHTML() { return '<div class="cardback"><span>✦</span></div>'; }

  function preloadImages(picks) {
    picks.forEach(function (p) { var im = new Image(); im.src = p.card.img; });
  }

  /* ============ 1. 스프레드 선택 ============ */
  function renderSpreads() {
    var grid = $("spreadGrid");
    grid.innerHTML = "";
    SPREAD_ORDER.forEach(function (key) {
      var s = SPREADS[key];
      var b = document.createElement("button");
      b.className = "spread-card";
      b.innerHTML =
        '<span class="count">' + s.count + '장</span>' +
        '<div class="glyphs">' + s.glyphs + '</div>' +
        '<h3>' + esc(s.name) + '</h3>' +
        '<div class="tag">' + esc(s.tag) + '</div>' +
        '<p>' + esc(s.desc) + '</p>';
      b.addEventListener("click", function () { chooseSpread(key); });
      grid.appendChild(b);
    });
  }

  function chooseSpread(key) {
    state.key = key;
    state.spread = SPREADS[key];
    $("topicTag").textContent = state.spread.tag;
    $("topicName").textContent = state.spread.name;
    $("topicDesc").textContent = state.spread.desc;
    var ul = $("topicPositions");
    ul.innerHTML = "";
    state.spread.positions.forEach(function (p, i) {
      var li = document.createElement("li");
      li.textContent = (i + 1) + ". " + p.name;
      ul.appendChild(li);
    });
    showScreen("topic");
  }

  /* ============ 2 → 3 ============ */
  function startReading() {
    state.topic = $("topicInput").value.trim();
    var deck = shuffle(T.buildDeck());
    state.deck = deck.map(function (c) {
      return { card: c, orient: Math.random() < 0.3 ? "reversed" : "upright" };
    });
    state.picks = [];
    $("pickTag").textContent = state.spread.tag;
    $("pickName").textContent = state.spread.name + " · " + state.spread.count + "장";
    buildSlots();
    updateProgress();
    showScreen("pick");
    runShuffle();
  }

  function buildSlots() {
    var row = $("slotRow");
    row.innerHTML = "";
    state.spread.positions.forEach(function (p, i) {
      var d = document.createElement("div");
      d.className = "slot";
      d.dataset.i = i;
      d.innerHTML = '<div class="slot-frame"></div><div class="slot-label">' + (i + 1) + '. ' + esc(p.name) + '</div>';
      row.appendChild(d);
    });
  }

  function runShuffle() {
    $("fanBox").hidden = true;
    $("shuffleBox").hidden = false;
    var stage = $("shuffleStage");
    $("shuffleNote").textContent = "카드를 섞는 중…";
    var wait = reduceMotion ? 150 : 1650;
    if (!reduceMotion) {
      stage.classList.remove("go");
      void stage.offsetWidth;
      stage.classList.add("go");
    }
    setTimeout(function () {
      $("shuffleBox").hidden = true;
      $("fanBox").hidden = false;
      renderFan();
    }, wait);
  }

  function renderFan() {
    var fan = $("fan");
    fan.innerHTML = "";
    var n = state.deck.length;
    for (var i = 0; i < n; i++) {
      var mid = (n - 1) / 2;
      var rot = ((i - mid) / mid) * 13;
      var ty = Math.pow(Math.abs(i - mid) / mid, 2) * 30;
      var b = document.createElement("button");
      b.className = "fan-card";
      b.type = "button";
      b.style.setProperty("--r", rot.toFixed(2) + "deg");
      b.style.setProperty("--ty", ty.toFixed(1) + "px");
      b.setAttribute("aria-label", "카드 선택");
      b.innerHTML = '<div class="tcard">' + backHTML() + '</div>';
      if (!reduceMotion) {
        b.style.animation = "pop .4s ease backwards";
        b.style.animationDelay = (i * 9) + "ms";
      }
      b.addEventListener("click", onPick);
      fan.appendChild(b);
    }
    $("revealBtn").disabled = state.picks.length < state.spread.count;
    updateFanHint();
  }

  function onPick(e) {
    var btn = e.currentTarget;
    if (btn.classList.contains("taken")) return;
    if (state.picks.length >= state.spread.count) return;
    var idx = state.picks.length;
    state.picks.push(state.deck[idx]);
    btn.classList.add("taken");
    btn.removeEventListener("click", onPick);

    var slot = $("slotRow").querySelector('.slot[data-i="' + idx + '"]');
    slot.classList.add("filled");
    slot.querySelector(".slot-frame").innerHTML = backHTML();

    updateProgress();
    updateFanHint();

    if (state.picks.length >= state.spread.count) {
      $("revealBtn").disabled = false;
      Array.prototype.forEach.call($("fan").children, function (c) {
        if (!c.classList.contains("taken")) { c.style.opacity = ".35"; c.style.pointerEvents = "none"; }
      });
    }
  }

  function updateProgress() {
    $("pickProgress").textContent = state.picks.length + " / " + state.spread.count + " 선택";
  }
  function updateFanHint() {
    var left = state.spread.count - state.picks.length;
    $("fanHint").textContent = left > 0
      ? ("마음이 가는 카드를 " + left + "장 더 고르세요.")
      : "모두 골랐습니다. ‘해석 보기’를 눌러 주세요.";
  }

  /* ============ 4. 해석 ============ */
  function orientLabel(o) { return o === "upright" ? "정방향" : "역방향"; }

  function interpretCard(pick, pos) {
    var meaning = pick.orient === "upright" ? pick.card.up : pick.card.rev;
    var t = pos.desc + " 이 자리에는 「" + pick.card.name + "」 카드가 " + orientLabel(pick.orient) + "으로 놓였습니다. " + meaning;
    if (state.topic) {
      t += pick.orient === "upright"
        ? " 「" + state.topic + "」에 관해서는, 이 카드가 흐름을 여는 힘으로 작용하니 그 방향을 신뢰해도 좋습니다."
        : " 「" + state.topic + "」에 관해서는, 이 카드가 먼저 살펴야 할 걸림돌을 가리킵니다. 그 부분을 인정하는 데서 풀립니다.";
    }
    return t;
  }

  function summarize() {
    var n = state.picks.length;
    var ups = state.picks.filter(function (p) { return p.orient === "upright"; }).length;
    var revs = n - ups;
    var majors = state.picks.filter(function (p) { return p.card.kind === "major"; }).length;
    var sc = { wands: 0, cups: 0, swords: 0, pentacles: 0 };
    state.picks.forEach(function (p) { if (p.card.suit && sc[p.card.suit] != null) sc[p.card.suit]++; });
    var dom = null, max = 0;
    Object.keys(sc).forEach(function (s) { if (sc[s] > max) { max = sc[s]; dom = s; } });

    var parts = [];
    parts.push(state.spread.name + " 리딩에서 모두 " + n + "장이 펼쳐졌고, 정방향이 " + ups + "장, 역방향이 " + revs + "장입니다.");

    if (revs > ups) {
      parts.push("역방향이 우세한 만큼, 지금은 밖으로 밀어붙이기보다 안을 정리하고 속도를 늦춰야 할 시기입니다. 막힌 지점을 인정하는 데서 실마리가 열립니다.");
    } else if (ups > revs) {
      parts.push("정방향이 우세해 전반적인 흐름은 순조롭습니다. 방향을 믿고 한 걸음씩 실행하면 원하는 결과에 가까워집니다.");
    } else {
      parts.push("정방향과 역방향이 팽팽합니다. 나아갈 부분과 멈춰 살필 부분이 함께 있으니, 서두르지 말고 균형을 잡으세요.");
    }

    if (n > 1 && majors >= Math.ceil(n / 2)) {
      parts.push("메이저 아르카나가 절반 이상 나왔습니다. 사소한 선택이 아니라 삶의 큰 방향을 다루는 국면에 서 있습니다.");
    } else if (dom && max >= 2) {
      var theme = { wands: "열정과 일, 도전", cups: "감정과 관계, 사랑", swords: "생각과 판단, 갈등과 소통", pentacles: "현실과 물질, 안정" }[dom];
      parts.push(SUITS[dom].ko + " 카드가 많이 나와, 이번 고민의 무게중심은 ‘" + theme + "’에 있습니다.");
    }

    var last = state.picks[n - 1];
    var lastMeaning = last.orient === "upright" ? last.card.up : last.card.rev;
    parts.push("마지막 「" + state.spread.positions[n - 1].name + "」 자리의 " + last.card.name + "(" + orientLabel(last.orient) + ")는 이 질문의 종착점을 보여줍니다. " + lastMeaning);

    if (state.topic) {
      parts.push("「" + state.topic + "」에 대한 답으로 이 카드들을 이어 보면, 이미 가진 실마리를 어떻게 다루느냐에 따라 결과가 갈립니다. 카드는 정해진 미래가 아니라 지금의 흐름을 비추는 거울이며, 마지막 선택은 언제나 당신의 몫입니다.");
    } else {
      parts.push("카드는 정해진 미래가 아니라 지금의 흐름을 비추는 거울입니다. 마지막 선택은 언제나 당신의 몫입니다.");
    }
    return parts;
  }

  function goReading() {
    revealTimers.forEach(clearTimeout);
    revealTimers = [];
    preloadImages(state.picks);
    $("readTag").textContent = state.spread.tag;
    $("readName").textContent = state.spread.name + " 해석";
    $("readTopic").textContent = state.topic ? ("“" + state.topic + "”") : "";
    var list = $("readingList");
    list.innerHTML = "";
    $("summaryBox").classList.remove("shown");
    $("summaryText").innerHTML = "";

    state.picks.forEach(function (pick, i) {
      var pos = state.spread.positions[i];
      var row = document.createElement("div");
      row.className = "reading-row";
      row.innerHTML =
        '<div class="reading-card"><div class="flip"><div class="flip-inner">' +
          '<div class="flip-face flip-back">' + backHTML() + '</div>' +
          '<div class="flip-face flip-front">' + cardFaceHTML(pick) + '</div>' +
        '</div></div></div>' +
        '<div class="reading-text">' +
          '<div class="reading-pos">' + (i + 1) + '. ' + esc(pos.name) + '</div>' +
          '<div class="reading-meta">' +
            '<span class="pill ' + pick.orient + '">' + orientLabel(pick.orient) + '</span>' +
            '<span class="reading-cardname">' + esc(pick.card.name) + '</span>' +
            '<span class="reading-en">' + esc(pick.card.en) + '</span>' +
          '</div>' +
          '<p class="reading-body">' + esc(interpretCard(pick, pos)) + '</p>' +
        '</div>';
      list.appendChild(row);

      var flip = row.querySelector(".flip");
      if (reduceMotion) {
        row.classList.add("shown"); flip.classList.add("revealed");
      } else {
        var delay = 350 + i * 1150;
        revealTimers.push(setTimeout(function () {
          row.classList.add("shown");
          flip.classList.add("revealed");
        }, delay));
      }
    });

    var totalDelay = reduceMotion ? 60 : (350 + state.picks.length * 1150 + 500);
    revealTimers.push(setTimeout(revealSummary, totalDelay));
    showScreen("reading");
  }

  function revealSummary() {
    var box = $("summaryText");
    box.innerHTML = "";
    summarize().forEach(function (p) {
      var el = document.createElement("p");
      el.textContent = p;
      box.appendChild(el);
    });
    $("summaryBox").classList.add("shown");
  }

  function skipToAll() {
    revealTimers.forEach(clearTimeout);
    revealTimers = [];
    Array.prototype.forEach.call($("readingList").children, function (row) {
      row.classList.add("shown");
      row.querySelector(".flip").classList.add("revealed");
    });
    revealSummary();
    $("summaryBox").scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
  }

  function reset() {
    state = { key: null, spread: null, topic: "", deck: [], picks: [] };
    revealTimers.forEach(clearTimeout); revealTimers = [];
    $("topicInput").value = "";
    showScreen("spread");
  }

  /* ============ 이벤트 ============ */
  $("startBtn").addEventListener("click", startReading);
  $("backToSpread").addEventListener("click", function () { showScreen("spread"); });
  $("reshuffleBtn").addEventListener("click", function () {
    state.picks = [];
    buildSlots();
    updateProgress();
    $("revealBtn").disabled = true;
    runShuffle();
  });
  $("revealBtn").addEventListener("click", function () {
    if (state.picks.length >= state.spread.count) goReading();
  });
  $("skipBtn").addEventListener("click", skipToAll);
  $("againBtn").addEventListener("click", reset);
  $("homeBtn").addEventListener("click", reset);

  renderSpreads();
})();
