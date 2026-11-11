#!/usr/bin/env python3
"""data/cards.json 생성기.

카드 이름 표기 규칙(메이저: 이름 그대로 / 마이너: 수트 + 랭크)을 한곳에서 관리한다.
실행:  python tools/build_data.py
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

MAJORS = [
    ("바보", "The Fool"), ("마법사", "The Magician"), ("여사제", "The High Priestess"),
    ("여황제", "The Empress"), ("황제", "The Emperor"), ("교황", "The Hierophant"),
    ("연인", "The Lovers"), ("전차", "The Chariot"), ("힘", "Strength"),
    ("은둔자", "The Hermit"), ("운명의 수레바퀴", "Wheel of Fortune"), ("정의", "Justice"),
    ("매달린 사람", "The Hanged Man"), ("죽음", "Death"), ("절제", "Temperance"),
    ("악마", "The Devil"), ("탑", "The Tower"), ("별", "The Star"),
    ("달", "The Moon"), ("태양", "The Sun"), ("심판", "Judgement"), ("세계", "The World"),
]
# (파일명 접두어, 수트 id, 한글, 영문)
SUITS = [
    ("wands", "wands", "완드", "Wands"),
    ("cups", "cups", "컵", "Cups"),
    ("swords", "swords", "소드", "Swords"),
    ("pents", "pentacles", "펜타클", "Pentacles"),
]
RANKS_KO = ["에이스", "2", "3", "4", "5", "6", "7", "8", "9", "10", "페이지", "나이트", "퀸", "킹"]
RANKS_EN = ["Ace", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
            "Page", "Knight", "Queen", "King"]


def build():
    cards = []
    for i, (ko, en) in enumerate(MAJORS):
        cid = "major-%02d" % i
        cards.append({"id": cid, "arcana": "major", "suit": None, "number": i,
                      "nameKo": ko, "nameEn": en, "image": cid + ".jpg"})
    for prefix, suit, suit_ko, suit_en in SUITS:
        for r in range(14):
            cid = "%s-%02d" % (prefix, r + 1)
            cards.append({"id": cid, "arcana": "minor", "suit": suit, "number": r + 1,
                          "nameKo": "%s %s" % (suit_ko, RANKS_KO[r]),
                          "nameEn": "%s of %s" % (RANKS_EN[r], suit_en),
                          "image": cid + ".jpg"})
    return cards


if __name__ == "__main__":
    cards = build()
    out = ROOT / "data" / "cards.json"
    out.parent.mkdir(exist_ok=True)
    lines = ",\n".join("  " + json.dumps(c, ensure_ascii=False) for c in cards)
    out.write_text("[\n" + lines + "\n]\n", encoding="utf-8", newline="\n")
    print("cards.json: %d장" % len(cards))
