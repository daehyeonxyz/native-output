# native-output — holdout 평가: 봉인 글이 지문 범위 안에 드는지 검사한다.
# 통과 의미: 지문이 "본 적 없는 본인 글"에도 맞는다 = 과적합이 아니라 일반화된 지문이다.
# 의존성: pip install kiwipiepy
# 실행: PYTHONIOENCODING=utf-8 python install/scripts/eval-holdout.py
import json, re, sys, statistics
from pathlib import Path

try:
    from kiwipiepy import Kiwi
except ImportError:
    sys.exit("kiwipiepy 가 필요하다. 설치: pip install kiwipiepy")

PERSONAL = Path(__file__).resolve().parents[2] / "personal"
FP = PERSONAL / "fingerprint"
HOLDOUT_FILE = PERSONAL / "holdout.md"

TOL = {"sent_len_median": 0.5, "comma_median_abs": 1.0, "register_top_abs": 0.25}

def _prose_only(text):
    # build-fingerprint.py 와 동일한 산문 필터 (계측 기준 일치)
    keep=[]
    for line in text.splitlines():
        s=line.strip()
        if not s: keep.append(""); continue
        if re.match(r"^(#{1,6}\s|>\s?|[-*+]\s|\d+[.)]\s|\||```|---+$|\[.*\]\(.*\)$)", s): continue
        if len(s)<10 and not re.search(r"[.!?다요죠지]$", s): continue
        keep.append(s)
    return "\n".join(keep)

def main():
    if not HOLDOUT_FILE.exists():
        print("holdout 미선정 — select-holdout.py 먼저"); return 1
    kiwi = Kiwi()
    entries = re.findall(r"corpus/([\w-]+)/(\S+?\.txt)", HOLDOUT_FILE.read_text(encoding="utf-8"))
    by_genre = {}
    for g, name in entries:
        by_genre.setdefault(g, []).append(name)

    failures, checked = [], 0
    for genre, names in sorted(by_genre.items()):
        fp_file = FP / f"{genre}.json"
        if not fp_file.exists():
            print(f"[skip] {genre}: 지문 없음"); continue
        fp = json.loads(fp_file.read_text(encoding="utf-8"))
        texts = []
        for n in names:
            p = PERSONAL / "corpus" / genre / n
            if p.exists():
                raw = p.read_text(encoding="utf-8", errors="replace")
                texts.append(_prose_only(raw))
        if not texts:
            continue
        checked += 1
        sent_lens, commas, reg = [], [], {"합쇼체": 0, "해요체": 0, "기타": 0}
        n_sent = 0
        for text in texts:
            for sent in kiwi.split_into_sents(text):
                s = sent.text.strip()
                if not s: continue
                n_sent += 1
                sent_lens.append(len(s)); commas.append(s.count(","))
                efs = [t for t in kiwi.tokenize(s) if t.tag == "EF"]
                f = efs[-1].form if efs else ""
                if f.endswith(("습니다", "ᆸ니다", "습니까", "십시오")): reg["합쇼체"] += 1
                elif f.endswith("요"): reg["해요체"] += 1
                else: reg["기타"] += 1
        if not n_sent: continue

        med = statistics.median(sent_lens)
        ref = fp["sent_len"]["median"]
        if ref and abs(med - ref) / ref > TOL["sent_len_median"]:
            failures.append(f"{genre}: 문장길이 중앙값 {med} vs 지문 {ref} (허용 ±{int(TOL['sent_len_median']*100)}%)")
        cmed = statistics.median(commas)
        cref = fp["comma_per_sent"]["median"]
        if abs(cmed - cref) > TOL["comma_median_abs"]:
            failures.append(f"{genre}: 쉼표 중앙값 {cmed} vs 지문 {cref}")
        top_reg = max(fp["register_ratio"], key=fp["register_ratio"].get)
        key = top_reg if top_reg in ("합쇼체", "해요체") else "기타"
        ho_ratio = reg[key] / n_sent
        fp_ratio = fp["register_ratio"][top_reg]
        if abs(ho_ratio - fp_ratio) > TOL["register_top_abs"]:
            failures.append(f"{genre}: 지배 화계({top_reg}) 비율 {round(ho_ratio,2)} vs 지문 {fp_ratio}")
        print(f"[{genre}] holdout {len(texts)}편 {n_sent}문장 — 길이 {med}(지문 {ref}), 쉼표 {cmed}(지문 {cref}), {top_reg} {round(ho_ratio,2)}(지문 {fp_ratio})")

    print(f"\n장르 {checked}개 평가, 이탈 {len(failures)}건")
    for f in failures: print("  FAIL", f)
    return 1 if failures else 0

if __name__ == "__main__":
    sys.exit(main())
