# 카드 이미지 출처

이 폴더의 78장 이미지는 **라이더–웨이트–스미스 타로(Rider–Waite–Smith Tarot, 1909)** 입니다.

- 그림: Pamela Colman Smith
- 기획: Arthur Edward Waite
- 최초 발행: 1909년, William Rider & Son (London)
- 저작권 상태: **퍼블릭 도메인** (Pamela Colman Smith 1951년 사망, 저작자 사후 70년 경과)
- 파일 출처: [Wikimedia Commons](https://commons.wikimedia.org/wiki/Category:Rider-Waite_tarot_deck) — `Special:FilePath` 로 폭 500px 스케일 다운

## 파일명 규칙

| 구분 | 파일 | 매핑 |
|---|---|---|
| 메이저 아르카나 | `major-00.jpg` ~ `major-21.jpg` | 0 바보 … 21 세계 |
| 완드 | `wands-01.jpg` ~ `wands-14.jpg` | 에이스 … 킹 |
| 컵 | `cups-01.jpg` ~ `cups-14.jpg` | 에이스 … 킹 |
| 소드 | `swords-01.jpg` ~ `swords-14.jpg` | 에이스 … 킹 |
| 펜타클 | `pents-01.jpg` ~ `pents-14.jpg` | 에이스 … 킹 |

`data/cards.json` 의 `image` 값이 이 파일명을 가리키고, 폴더 위치는 `js/engine/index.js` 의 `DECK_PATH` 로 정합니다. 뽑힌 방향이 역방향이면 화면에서 그림을 180° 돌려 보여줍니다.
