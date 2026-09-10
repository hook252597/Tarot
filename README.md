# 달빛 아르카나 (Tarot)

스프레드를 고르고 고민을 입력한 뒤, 카드를 직접 뽑아 한 장씩 해석과 총평을 받아보는 타로 리딩 사이트.
백엔드 없이 브라우저에서만 동작하는 정적 사이트입니다.

## 구성

```
index.html      # 마크업
css/style.css   # 스타일 (다크/라이트 테마)
js/data.js      # 78장 덱 데이터 + 스프레드 정의 (window.TAROT)
js/app.js       # 화면 흐름 및 리딩 로직
cards/          # 카드 이미지 78장 (라이더-웨이트-스미스, 퍼블릭 도메인) + CREDITS.md
.nojekyll       # GitHub Pages 빌드 건너뛰기
```

카드 이미지 출처와 파일명 규칙은 [`cards/CREDITS.md`](cards/CREDITS.md) 참고.

`js/data.js` 는 반드시 `js/app.js` 보다 먼저 로드되어야 합니다 (`index.html` 에 순서대로 배치됨).

## 로컬에서 보기

- `index.html` 더블클릭 (서버 불필요), 또는
- 간단한 정적 서버: `python -m http.server` 후 `http://localhost:8000`

## 기능

1. 스프레드 4종 선택 — 원 카드(1) · 쓰리 카드(3) · 관계 스프레드(5) · 켈틱 크로스(10)
2. 주제·고민 텍스트 입력
3. 카드 섞기 → 78장 부채꼴 펼침 → 직접 선택 (애니메이션)
4. 선택한 카드가 실제 라이더-웨이트-스미스 그림으로 한 장씩 뒤집히며 자리별 해석 서술 (역방향은 180° 회전)
5. 맨 아래 총평 (정/역방향 비율, 우세 수트·메이저 분석, 결과 카드 요약)

## 배포 (GitHub Pages)

저장소 Settings → Pages → Source: `Deploy from a branch` → `main` / `/ (root)`.
