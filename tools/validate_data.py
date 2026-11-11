#!/usr/bin/env python3
"""데이터 검증.  실행:  python tools/validate_data.py

확인하는 것
  - 카드 78장(메이저 22 + 수트별 14), id·이름 중복 없음, 이미지 파일 존재
  - 스프레드: 카드 수와 자리 수 일치, 자리 id 중복 없음, 프롬프트 틀·배치 종류 존재
  - 프롬프트 틀: 카드 수만큼 순서 표현이 있는지, 켜고 끄는 조건 이름이 올바른지
문제가 있으면 목록을 출력하고 종료 코드 1로 끝난다.
"""
import json
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DECK_DIR = ROOT / "assets" / "decks" / "rws"
LAYOUTS = {"row", "relationship7", "celtic10"}
LAYOUT_COUNTS = {"relationship7": 7, "celtic10": 10}
FLAGS = {"hasSupportCards", "adviceOnRequestOnly"}


def load(name):
    return json.loads((ROOT / "data" / name).read_text(encoding="utf-8"))


def main():
    errors = []
    cards, spreads, templates = load("cards.json"), load("spreads.json"), load("prompt_templates.json")

    # 카드
    if len(cards) != 78:
        errors.append("카드가 78장이 아님: %d장" % len(cards))
    for key in ("id", "nameKo", "image"):
        for value, n in Counter(c.get(key) for c in cards).items():
            if n > 1 or not value:
                errors.append("카드 %s 중복 또는 빈 값: %r" % (key, value))
    groups = Counter(c["suit"] or "major" for c in cards)
    expected = {"major": 22, "wands": 14, "cups": 14, "swords": 14, "pentacles": 14}
    if dict(groups) != expected:
        errors.append("카드 구성이 다름: %s" % dict(groups))
    for c in cards:
        if not (DECK_DIR / c["image"]).is_file():
            errors.append("이미지 없음: %s" % c["image"])

    # 스프레드 · 프롬프트 틀
    ids = [s["id"] for s in spreads]
    if len(ids) != len(set(ids)):
        errors.append("스프레드 id 중복")
    for s in spreads:
        tag = "스프레드 %s" % s["id"]
        if s["cardCount"] != len(s["positions"]):
            errors.append("%s: cardCount(%d)와 자리 수(%d)가 다름" % (tag, s["cardCount"], len(s["positions"])))
        pos_ids = [p["id"] for p in s["positions"]]
        if len(pos_ids) != len(set(pos_ids)):
            errors.append("%s: 자리 id 중복" % tag)
        for p in s["positions"]:
            if not p.get("nameKo") or not p.get("promptMeaning"):
                errors.append("%s: 자리 %s 의 이름 또는 의미가 비어 있음" % (tag, p.get("id")))
        if s["layout"] not in LAYOUTS:
            errors.append("%s: 알 수 없는 배치 %r" % (tag, s["layout"]))
        elif s["layout"] in LAYOUT_COUNTS and LAYOUT_COUNTS[s["layout"]] != s["cardCount"]:
            errors.append("%s: 배치 %s 는 %d장용" % (tag, s["layout"], LAYOUT_COUNTS[s["layout"]]))
        tpl = templates.get(s["promptTemplateId"])
        if not tpl:
            errors.append("%s: 프롬프트 틀 %r 없음" % (tag, s["promptTemplateId"]))
        elif s["cardCount"] > len(tpl["ordinals"]):
            errors.append("%s: 틀의 순서 표현이 %d개뿐" % (tag, len(tpl["ordinals"])))
        for flag in FLAGS:
            if not isinstance(s.get(flag), bool):
                errors.append("%s: %s 는 true/false 여야 함" % (tag, flag))
    for tid, tpl in templates.items():
        for item in tpl["thinkingSteps"] + tpl["styleRules"]:
            if item.get("when") and item["when"] not in FLAGS:
                errors.append("틀 %s: 알 수 없는 조건 %r" % (tid, item["when"]))

    if errors:
        print("문제 %d건" % len(errors))
        for e in errors:
            print(" -", e)
        return 1
    print("이상 없음 — 카드 %d장, 스프레드 %d종(%s), 프롬프트 틀 %d개"
          % (len(cards), len(spreads), ", ".join("%s %d장" % (s["id"], s["cardCount"]) for s in spreads), len(templates)))
    return 0


if __name__ == "__main__":
    sys.exit(main())
