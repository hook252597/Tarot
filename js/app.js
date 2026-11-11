/* 달빛 아르카나 — 화면 흐름
 * 홈(S1) → 상황 입력(S2) → 카드 선택(S3) → 결과·프롬프트 복사(S4)
 *
 * 카드 데이터와 프롬프트는 TarotEngine(js/engine/index.js)에서만 가져온다.
 * 진행 상태는 이 파일의 state 변수(메모리)에만 있고, 쿠키·저장소를 쓰지 않는다.
 */
(function () {
  "use strict";

  var E = window.TarotEngine;
  var app = document.getElementById("app");
  var homeBtn = document.getElementById("homeBtn");
  var AI_LINKS = [
    { name: "ChatGPT", url: "https://chatgpt.com" },
    { name: "Gemini", url: "https://gemini.google.com" }
  ];

  var state = { screen: "home", spread: null, text: "", deck: [], picks: [], taken: [] };

  /* ============ 도구 ============ */
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function orientLabel(o) { return o === "reversed" ? "역방향" : "정방향"; }
  function num(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ","); }

  /* ============ 카드·배치 그리기 ============
   * ctx.mode: "slot"  자리 칸 (ctx.filled 장까지 뒷면, 그다음 칸은 강조)
   *           "face"  결과 (ctx.picks 의 카드 앞면)
   */
  function cardHTML(i, ctx, extra) {
    var cls = "c" + (extra ? " " + extra : "");
    var n = '<span class="n" aria-hidden="true">' + (i + 1) + "</span>";
    if (ctx.mode === "face") {
      var pick = ctx.picks[i], card = E.getCard(pick.cardId), rev = pick.orientation === "reversed";
      return '<div class="' + cls + " face reveal" + (rev ? " rev" : "") + '" style="animation-delay:' + (i * 140) + 'ms">' + n +
        '<img src="' + esc(card.image) + '" alt="' + esc(card.nameKo + " " + orientLabel(pick.orientation)) + '" draggable="false">' +
        (rev ? '<span class="revtag" aria-hidden="true">역</span>' : "") + "</div>";
    }
    if (i < ctx.filled) return '<div class="' + cls + ' back">' + n + "</div>";
    return '<div class="' + cls + " slot" + (i === ctx.filled ? " next" : "") + '">' + n + "</div>";
  }

  function posHTML(spread, i, ctx) {
    return '<div class="pos p' + (i + 1) + '">' + cardHTML(i, ctx) + '<div class="lb">' + esc(spread.positions[i].nameKo) + "</div></div>";
  }

  function layoutHTML(spread, ctx) {
    var h = "", i;
    if (spread.layout === "relationship7") {
      for (i = 0; i < 7; i++) h += posHTML(spread, i, ctx);
      return '<div class="lay-rel">' + h + "</div>";
    }
    if (spread.layout === "celtic10") {
      [4, 2, 3, 5].forEach(function (k) { h += posHTML(spread, k, ctx); });
      h += '<div class="pos p1"><div class="stack">' + cardHTML(0, ctx) + cardHTML(1, ctx, "over") + "</div>" +
        '<div class="lb">' + esc(spread.positions[0].nameKo + " · " + spread.positions[1].nameKo) + "</div></div>";
      var staff = "";
      for (i = 6; i < 10; i++) staff += posHTML(spread, i, ctx);
      return '<div class="lay-celtic"><div class="cross">' + h + '</div><div class="staff">' + staff + "</div></div>";
    }
    // row: 순서대로 한 줄. 결과에서는 자리 이름을 위, 카드 이름·방향을 아래에.
    spread.positions.forEach(function (p, k) {
      var lb = '<div class="lb">' + (k + 1) + ". " + esc(p.nameKo) + "</div>";
      if (ctx.mode === "face") {
        var pick = ctx.picks[k];
        h += '<div class="pos">' + lb + cardHTML(k, ctx) + '<div class="nm">' + esc(E.getCard(pick.cardId).nameKo) + " (" + orientLabel(pick.orientation) + ")</div></div>";
      } else {
        h += '<div class="pos">' + cardHTML(k, ctx) + lb + "</div>";
      }
    });
    return '<div class="lay-row">' + h + "</div>";
  }

  /* ============ 화면 이동 ============ */
  var SCREENS = { home: renderHome, input: renderInput, pick: renderPick, result: renderResult };

  function go(screen, push) {
    if (screen !== "home" && !state.spread) screen = "home";
    if (screen === "result" && state.picks.length < state.spread.cardCount) screen = "pick";
    state.screen = screen;
    SCREENS[screen]();
    homeBtn.hidden = screen === "home";
    if (push !== false) history.pushState({ screen: screen }, "");
    window.scrollTo(0, 0);
    var h = app.querySelector(".title");
    if (h) { h.setAttribute("tabindex", "-1"); h.focus({ preventScroll: true }); }
  }
  window.addEventListener("popstate", function (e) { go((e.state && e.state.screen) || "home", false); });
  homeBtn.addEventListener("click", function () { go("home"); });

  /* ============ S1 홈 ============ */
  function renderHome() {
    var list = E.getSpreads();
    var cards = list.map(function (s, i) {
      var wide = list.length % 3 === 2 && i >= list.length - 2; // 마지막 줄이 2개면 넓게
      return '<button type="button" class="menu-card' + (s.featured ? " featured" : "") + (wide ? " wide" : "") + '" data-id="' + esc(s.id) + '">' +
        '<span class="stars" aria-hidden="true">' + new Array(s.cardCount + 1).join("✦") + "</span>" +
        '<span class="count">' + s.cardCount + "장</span>" +
        "<h2>" + esc(s.menuName) + "</h2>" +
        '<span class="en">(' + esc(s.menuNameEn) + ")</span>" +
        "<p>" + esc(s.menuDesc) + "</p></button>";
    }).join("");
    app.innerHTML = '<section class="home"><h1 class="title">오늘의 타로</h1>' +
      '<p class="lede">마음속 질문을 하나 떠올리세요. 먼저 카드를 펼칠 방식을 고릅니다.' +
      "<small>카드를 뽑으면, 사용하는 AI에 붙여 넣어 해석을 받을 수 있는 프롬프트를 만들어 드립니다.</small></p>" +
      '<div class="menu">' + cards + "</div></section>";
    app.querySelectorAll(".menu-card").forEach(function (b) {
      b.addEventListener("click", function () {
        state.spread = E.getSpread(b.dataset.id);
        state.text = ""; state.picks = [];
        go("input");
      });
    });
  }

  /* ============ S2 상황 입력 ============ */
  function renderInput() {
    var sp = state.spread, max = E.CONFIG.MAX_INPUT_LENGTH;
    var chips = sp.positions.map(function (p, i) { return '<li class="chip"><b>' + (i + 1) + "</b>" + esc(p.nameKo) + "</li>"; }).join("");
    app.innerHTML = '<section class="panel"><h1 class="title">' + esc(sp.menuName) + "</h1>" +
      '<p class="hint">자리 미리보기</p><div class="preview" aria-hidden="true">' + layoutHTML(sp, { mode: "slot", filled: -1 }) + "</div>" +
      '<ul class="chips" aria-label="카드 자리">' + chips + "</ul>" +
      '<p class="lead"><label for="topic">지금 당신의 상황이나 고민을 들려주세요 (선택 사항)</label></p>' +
      '<p class="guide">질문이 구체적일수록 AI가 더 깊이 있는 해석을 해줍니다.<br>‘누구와’, ‘어떤 일로’, ‘무엇이’ 궁금한지 자세히 적어보세요.</p>' +
      '<div class="field"><textarea id="topic" maxlength="' + max + '" placeholder="' + esc(sp.inputExample || "") + '"></textarea>' +
      '<span class="counter" id="counter"></span></div>' +
      '<p class="priv">입력하신 글은 어디에도 저장되지 않으며, 오직 프롬프트 생성에만 사용됩니다.</p>' +
      '<p class="hint">내용을 적지 않고 바로 펼치셔도 괜찮습니다.</p>' +
      '<div class="btns"><button type="button" class="btn ghost" id="backBtn">다른 방식 고르기</button>' +
      '<button type="button" class="btn primary" id="startBtn">카드 펼치기</button></div></section>';
    var ta = document.getElementById("topic"), counter = document.getElementById("counter");
    ta.value = state.text; // 글자로만 넣는다
    function update() { counter.textContent = num(ta.value.length) + " / " + num(max) + "자"; }
    ta.addEventListener("input", update); update();
    document.getElementById("backBtn").addEventListener("click", function () { go("home"); });
    document.getElementById("startBtn").addEventListener("click", function () {
      state.text = ta.value;
      shuffle();
      go("pick");
    });
  }

  /* ============ S3 카드 선택 ============ */
  function shuffle() { state.deck = E.createDeck(); state.picks = []; state.taken = []; }

  function renderPick(keepFan) {
    var sp = state.spread, total = sp.cardCount, done = state.picks.length >= total;
    var hint = done ? "모두 골랐습니다. ‘결과 보기’를 눌러 주세요."
      : "빛나는 칸이 다음에 채워질 자리입니다 — " + (state.picks.length + 1) + ". " + sp.positions[state.picks.length].nameKo;
    if (keepFan) { // 덱은 그대로 두고 윗부분만 갱신
      app.querySelector("#progress").textContent = state.picks.length + " / " + total + " 선택";
      app.querySelector("#slots").innerHTML = layoutHTML(sp, { mode: "slot", filled: state.picks.length });
      app.querySelector("#pickHint").textContent = hint;
      app.querySelector("#resultBtn").disabled = !done;
      app.querySelector("#fan").classList.toggle("done", done);
      return;
    }
    var fan = state.deck.map(function (d, i) {
      var t = (i - (state.deck.length - 1) / 2) / ((state.deck.length - 1) / 2);
      var taken = state.taken.indexOf(i) >= 0;
      return '<button type="button" class="fan-card' + (taken ? " taken" : "") + '" data-i="' + i + '" style="--r:' + (t * 7).toFixed(2) + "deg;--i:" + i + '"' +
        (taken || done ? " disabled" : "") + ' aria-label="' + (i + 1) + '번째 카드 고르기"><span class="c back"></span></button>';
    }).join("");
    app.innerHTML = '<section class="panel"><h1 class="title">' + esc(sp.menuName) + "</h1>" +
      '<p class="sub" id="progress" role="status">' + state.picks.length + " / " + total + " 선택</p>" +
      '<div class="slots" id="slots">' + layoutHTML(sp, { mode: "slot", filled: state.picks.length }) + "</div>" +
      '<p class="hint" id="pickHint">' + esc(hint) + "</p>" +
      '<div class="fanwrap"><div class="fan dealing' + (done ? " done" : "") + '" id="fan">' + fan + "</div></div>" +
      '<p class="hint">마음이 가는 카드를 고르세요. 화면이 좁으면 카드를 좌우로 밀어 보세요.</p>' +
      '<div class="btns"><button type="button" class="btn ghost" id="reshuffleBtn">다시 섞기</button>' +
      '<button type="button" class="btn primary" id="resultBtn"' + (done ? "" : " disabled") + ">결과 보기</button></div></section>";
    app.querySelector("#fan").addEventListener("click", function (e) {
      var btn = e.target.closest(".fan-card");
      if (!btn || btn.disabled || state.picks.length >= total) return;
      var i = Number(btn.dataset.i), d = state.deck[i];
      state.taken.push(i);
      state.picks.push({ positionId: sp.positions[state.picks.length].id, cardId: d.cardId, orientation: d.orientation });
      btn.classList.add("taken"); btn.disabled = true;
      if (state.picks.length >= total) {
        app.querySelectorAll(".fan-card").forEach(function (b) { b.disabled = true; });
      }
      renderPick(true);
      if (state.picks.length >= total) app.querySelector("#resultBtn").focus();
    });
    document.getElementById("reshuffleBtn").addEventListener("click", function () { shuffle(); renderPick(); });
    document.getElementById("resultBtn").addEventListener("click", function () { go("result"); });
  }

  /* ============ S4 결과 ============ */
  function renderResult() {
    var sp = state.spread, picks = state.picks, isRow = sp.layout === "row";
    var prompt = E.buildPrompt({ spreadId: sp.id, userText: state.text, picks: picks });
    var board = layoutHTML(sp, { mode: "face", picks: picks });

    var copy = '<div class="g-copy"><p class="lead">아래 프롬프트를 복사해 사용하는 AI에 붙여 넣으면 해석을 받을 수 있어요</p>' +
      '<div class="copy"><div class="steps">1. 복사 → 2. AI 열기 → 3. 붙여넣기</div>' +
      '<button type="button" class="btn primary" id="copyBtn">프롬프트 복사</button>' +
      '<p class="copy-status" id="copyStatus" role="status"></p>' +
      '<div class="links">' + AI_LINKS.map(function (l) {
        return '<a href="' + l.url + '" target="_blank" rel="noopener noreferrer">' + l.name + "</a>";
      }).join(" | ") + "</div>" +
      '<details class="peek"><summary>프롬프트 미리보기 (' + num(prompt.length) + "자) ▾</summary>" +
      '<textarea id="promptText" readonly aria-label="복사할 프롬프트"></textarea></details>' +
      '<p class="notice">입력하신 글이 프롬프트에 포함됩니다. AI의 답변은 사용하는 서비스에 따라 달라질 수 있습니다.</p></div></div>';

    var body;
    if (isRow) {
      body = '<div class="result-grid"><div class="g-board">' + board + "</div>" + copy + "</div>";
    } else {
      var legend = picks.map(function (p, i) {
        return '<li><span class="n" aria-hidden="true">' + (i + 1) + '</span><span><span class="p">' + esc(sp.positions[i].nameKo) +
          '</span><span class="k">' + esc(E.getCard(p.cardId).nameKo) + "<em>" + orientLabel(p.orientation) + "</em></span></span></li>";
      }).join("");
      var groups = (sp.groups || []).map(function (g) { return "<li><b>" + esc(g.label) + "</b>" + esc(g.desc) + "</li>"; }).join("");
      body = '<div class="result-grid has-legend"><div class="g-board"><div class="board">' + board + "</div>" +
        (groups ? '<ul class="groups" aria-label="함께 읽는 카드">' + groups + "</ul>" : "") + "</div>" +
        '<ol class="legend g-legend" aria-label="뽑은 카드">' + legend + "</ol>" + copy + "</div>";
    }

    app.innerHTML = '<section class="panel"><h1 class="title">' + esc(sp.menuName) + "</h1>" + body +
      '<div class="btns"><button type="button" class="btn ghost" id="againBtn">다시 뽑기</button>' +
      '<button type="button" class="btn ghost" id="menuBtn">다른 메뉴 보기</button></div></section>';

    var ta = document.getElementById("promptText"), status = document.getElementById("copyStatus");
    ta.value = prompt.text; // 글자로만 넣는다
    document.getElementById("copyBtn").addEventListener("click", function () {
      copyText(prompt.text, ta).then(function (ok) {
        status.textContent = ok ? "복사됨 — 이제 AI에 붙여 넣으세요."
          : "자동 복사가 막혀 있습니다. 아래 미리보기를 열어 직접 복사해 주세요.";
        if (!ok) { app.querySelector(".peek").open = true; ta.focus(); ta.select(); }
      });
    });
    document.getElementById("againBtn").addEventListener("click", function () { shuffle(); go("pick"); });
    document.getElementById("menuBtn").addEventListener("click", function () { go("home"); });
  }

  // 클립보드 복사. 최신 방식이 막혀 있으면 예전 방식으로 한 번 더 시도한다.
  function copyText(text, fallbackEl) {
    function legacy() {
      var details = fallbackEl.closest("details"), wasOpen = details.open, ok = false;
      details.open = true; fallbackEl.focus(); fallbackEl.select();
      try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
      window.getSelection().removeAllRanges(); fallbackEl.blur();
      details.open = wasOpen;
      return ok;
    }
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text).then(function () { return true; }, function () { return legacy(); });
    }
    return Promise.resolve(legacy());
  }

  /* ============ 시작 ============ */
  history.replaceState({ screen: "home" }, "");
  E.load().then(function () { go("home", false); }).catch(function (err) {
    app.innerHTML = '<div class="error"><p>카드 데이터를 불러오지 못했습니다.</p>' +
      (location.protocol === "file:" ? "<p>파일을 직접 열면 데이터를 읽을 수 없습니다. 폴더에서 <code>python -m http.server</code> 를 실행한 뒤 <code>http://localhost:8000</code> 으로 접속해 주세요.</p>" : "") +
      '<p class="hint" id="errMsg"></p></div>';
    document.getElementById("errMsg").textContent = String(err && err.message || err);
  });
})();
