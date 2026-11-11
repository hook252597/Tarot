/* 달빛 아르카나 — 프롬프트 엔진
 *
 * 화면(js/app.js)이 쓰는 함수는 아래뿐이다.
 *   TarotEngine.load()               data/*.json 불러오기 (시작할 때 한 번)
 *   TarotEngine.getSpreads()         메뉴에 보일 스프레드 목록
 *   TarotEngine.getSpread(id)        스프레드 하나
 *   TarotEngine.getCard(id)          카드 하나 (이름, 이미지 경로)
 *   TarotEngine.createDeck()         섞인 78장 [{ cardId, orientation }]
 *   TarotEngine.buildPrompt(request) AI에 붙여 넣을 프롬프트 { text, length }
 *
 * 쿠키·세션·브라우저 저장소를 쓰지 않으며, data/*.json 외에는 어떤 요청도 보내지 않는다.
 */
(function (root) {
  "use strict";

  var CONFIG = {
    DATA_PATH: "data/",
    DECK_PATH: "assets/decks/rws/", // 덱을 바꾸려면 이 폴더만 교체
    REVERSED_RATE: 0.5,             // 역방향 확률
    MAX_INPUT_LENGTH: 2000          // 입력 글 한도(오작동 방지용)
  };

  var cards = [], cardById = {}, spreads = [], spreadById = {}, templates = {};

  /* ---- 데이터 ---- */
  function init(cardList, spreadList, templateMap) {
    cards = cardList; spreads = spreadList; templates = templateMap;
    cardById = {}; spreadById = {};
    cards.forEach(function (c) { cardById[c.id] = c; });
    spreads.forEach(function (s) { spreadById[s.id] = s; });
    return api;
  }

  function load() {
    var names = ["cards", "spreads", "prompt_templates"];
    return Promise.all(names.map(function (n) {
      return fetch(CONFIG.DATA_PATH + n + ".json").then(function (r) {
        if (!r.ok) throw new Error(n + ".json 을 불러오지 못했습니다 (" + r.status + ")");
        return r.json();
      });
    })).then(function (a) { return init(a[0], a[1], a[2]); });
  }

  function getSpreads() {
    return spreads.filter(function (s) { return s.enabled !== false; });
  }
  function getSpread(id) { return spreadById[id] || null; }

  function getCard(id) {
    var c = cardById[id];
    if (!c) return null;
    return {
      id: c.id, arcana: c.arcana, suit: c.suit, number: c.number,
      nameKo: c.nameKo, nameEn: c.nameEn,
      image: CONFIG.DECK_PATH + c.image
    };
  }

  /* ---- 카드 뽑기 ---- */
  function createDeck() {
    var deck = cards.map(function (c) {
      return { cardId: c.id, orientation: Math.random() < CONFIG.REVERSED_RATE ? "reversed" : "upright" };
    });
    for (var i = deck.length - 1; i > 0; i--) {           // Fisher–Yates
      var j = Math.floor(Math.random() * (i + 1));
      var t = deck[i]; deck[i] = deck[j]; deck[j] = t;
    }
    return deck;
  }

  /* ---- 프롬프트 ---- */
  function normalizeText(text) {
    return String(text == null ? "" : text).replace(/\s+/g, " ").trim().slice(0, CONFIG.MAX_INPUT_LENGTH);
  }

  // "{key}" 를 값으로 바꾼다. 값에 특수문자가 있어도 그대로 들어가도록 split/join 사용.
  function fill(str, values) {
    Object.keys(values).forEach(function (k) { str = str.split("{" + k + "}").join(values[k]); });
    return str;
  }

  function enabledItems(items, spread) {
    return items.filter(function (it) { return !it.when || spread[it.when] === true; });
  }

  function buildPrompt(request) {
    if (!request) throw new Error("요청이 비어 있습니다.");
    var spread = spreadById[request.spreadId];
    if (!spread) throw new Error("알 수 없는 스프레드: " + request.spreadId);
    var tpl = templates[spread.promptTemplateId];
    if (!tpl) throw new Error("프롬프트 틀이 없습니다: " + spread.promptTemplateId);

    var picks = request.picks || [];
    if (picks.length !== spread.cardCount) {
      throw new Error("카드 수가 맞지 않습니다: " + picks.length + "장 (필요 " + spread.cardCount + "장)");
    }
    if (spread.cardCount > tpl.ordinals.length) throw new Error("프롬프트 틀이 지원하는 카드 수를 넘었습니다.");

    // 자리 순서대로 정렬 (positionId 가 있으면 그것으로, 없으면 받은 순서)
    var ordered = spread.positions.map(function (pos, i) {
      var pick = null;
      picks.forEach(function (p) { if (p.positionId === pos.id) pick = p; });
      pick = pick || picks[i];
      var card = pick && cardById[pick.cardId];
      if (!card) throw new Error("알 수 없는 카드: " + (pick && pick.cardId));
      if (pick.orientation !== "upright" && pick.orientation !== "reversed") {
        throw new Error("카드 방향이 올바르지 않습니다: " + pick.orientation);
      }
      return { pos: pos, card: card, reversed: pick.orientation === "reversed" };
    });

    var lines = [];
    lines.push(fill(tpl.header, { spreadName: spread.promptName }));
    lines.push("");
    lines.push(fill(tpl.topicLine, { userText: normalizeText(request.userText) }).replace(/\s+$/, ""));
    lines.push("");
    ordered.forEach(function (o, i) {
      var line = fill(tpl.cardLine, {
        ordinal: tpl.ordinals[i],
        card: o.card.nameKo + (o.reversed ? tpl.reversedSuffix : ""),
        meaning: o.pos.promptMeaning
      });
      lines.push((i === 0 ? tpl.cardsIntro : "") + line);
    });
    lines.push("", "");
    lines.push(tpl.thinkingTitle);
    enabledItems(tpl.thinkingSteps, spread).forEach(function (step, i) {
      lines.push((i + 1) + ". " + step.text);
      if (step.appendReadingGuide && spread.readingGuide) {
        spread.readingGuide.forEach(function (g) { lines.push(tpl.readingGuidePrefix + g); });
      }
    });
    lines.push("");
    tpl.outputFormat.forEach(function (l) { lines.push(l); });
    lines.push("");
    lines.push(tpl.styleRulesTitle + enabledItems(tpl.styleRules, spread).map(function (r) { return r.text; }).join(" "));

    var text = lines.join("\n");
    return { text: text, length: text.length };
  }

  var api = {
    CONFIG: CONFIG,
    load: load,
    getSpreads: getSpreads,
    getSpread: getSpread,
    getCard: getCard,
    createDeck: createDeck,
    buildPrompt: buildPrompt,
    normalizeText: normalizeText,
    _init: init // 검증 도구(tools/)에서 파일을 직접 읽어 넣을 때 사용
  };

  root.TarotEngine = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
