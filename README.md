# 달빛 아르카나 (Tarot)

스프레드를 고르고 상황을 적은 뒤 카드를 직접 뽑으면, **사용하는 AI(ChatGPT·Gemini 등)에 붙여 넣을 해석 프롬프트**를 만들어 주는 타로 사이트.

- 사이트 안에서는 해석을 만들지 않습니다. 뽑은 카드와 프롬프트 복사 기능만 제공합니다.
- 백엔드 없이 브라우저에서만 동작하는 정적 사이트입니다.
- 쿠키·세션·브라우저 저장소를 쓰지 않으며, 입력한 글과 뽑은 카드는 어디에도 저장·전송되지 않습니다.

## 메뉴

| 메뉴 | 장수 | 자리 |
|---|---|---|
| 오늘의 운세 | 3 | 상황 · 과제 · 결과 |
| 원 카드 | 1 | 핵심 메시지 |
| 쓰리 카드 | 3 | 과거 · 현재 · 미래 |
| 관계 스프레드 | 7 | 나 · 상대 · 두 사람의 관계 · 내가 원하는 것 · 상대가 원하는 것 · 관계의 과제 · 관계의 가능성과 흐름 |
| 켈틱 크로스 | 10 | 현재 상황 · 장애물 · 가까운 과거 · 가까운 미래 · 내가 바라는 미래 · 나의 내면 · 나의 시선 · 외부의 시선 · 두려움 · 최종 결과 |

## 구성

```
index.html                 # 화면 틀
css/tokens.css             # 색·글꼴·모양 변수
css/style.css              # 화면 스타일 (반응형)
js/engine/index.js         # 프롬프트 엔진 (window.TarotEngine)
js/app.js                  # 화면 흐름: 홈 → 상황 입력 → 카드 선택 → 결과
data/cards.json            # 카드 78장 (이름, 이미지 파일명)
data/spreads.json          # 메뉴(스프레드) 정의: 자리, 배치, 프롬프트 설정
data/prompt_templates.json # 프롬프트 공통 틀
assets/decks/rws/          # 카드 이미지 78장 (라이더–웨이트–스미스, 퍼블릭 도메인) + CREDITS.md
assets/ui/                 # UI 참고 이미지
tools/build_data.py        # cards.json 생성
tools/validate_data.py     # 데이터 검증
docs/                      # 개발 문서, 역할별 작업 문서, 화면 설계안
```

`js/engine/index.js` 는 `js/app.js` 보다 먼저 로드되어야 합니다.

## 로컬에서 보기

데이터를 `fetch` 로 읽기 때문에 `index.html` 을 더블클릭하면 동작하지 않습니다. 폴더에서 정적 서버를 띄워 주세요.

```
python -m http.server
```

그다음 `http://localhost:8000` 으로 접속합니다.

## 데이터를 고친 뒤

```
python tools/validate_data.py
```

## 메뉴(스프레드) 추가하기

1. `data/spreads.json` 에 항목 추가 — 이름, 카드 수, 자리별 의미(`promptMeaning`), 보조 카드 유무(`hasSupportCards`), 조언 금지 규칙(`adviceOnRequestOnly`), 필요하면 전용 해석 지침(`readingGuide`)
2. 배치(`layout`)가 `row` / `relationship7` / `celtic10` 중에 없으면 `css/style.css` 와 `js/app.js` 의 `layoutHTML` 에 배치를 하나 추가
3. `python tools/validate_data.py` 실행

## 배포 (GitHub Pages)

저장소 Settings → Pages → Source: `Deploy from a branch` → `main` / `/ (root)`.

## 문서

- [`docs/DEVELOPMENT.md`](docs/DEVELOPMENT.md) — 전체 개발 문서
- [`docs/TASKS_A_DATA_PIPELINE.md`](docs/TASKS_A_DATA_PIPELINE.md) · [`docs/TASKS_B_UIUX.md`](docs/TASKS_B_UIUX.md) — 역할별 작업
- [`docs/UI_DESIGN_SPREADS.md`](docs/UI_DESIGN_SPREADS.md) — 스프레드별 화면 설계
