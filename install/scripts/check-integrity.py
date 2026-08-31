# native-output — 장부 무결성 검사 (manifest vs 실물, 중복, holdout 누출)
# 실행: PYTHONIOENCODING=utf-8 python install/scripts/check-integrity.py
import hashlib, re, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PERSONAL = ROOT / "personal"
CORPUS = PERSONAL / "corpus"
MANIFEST = PERSONAL / "manifest.md"
HOLDOUT = PERSONAL / "holdout.md"
PACKS = PERSONAL / "packs"


def main():
    if not CORPUS.exists():
        print(f"코퍼스가 없다: {CORPUS} — 개인화를 쓰지 않으면 이 검사는 필요하지 않다.")
        return 0

    problems = []
    disk = {p.relative_to(PERSONAL).as_posix(): p for p in CORPUS.rglob("*.txt")}

    # 1) 장부 등재 vs 실물 — 파일명(basename) 기준으로 대조한다
    listed = set()
    if MANIFEST.exists():
        text = MANIFEST.read_text(encoding="utf-8", errors="replace")
        for m in re.finditer(r"[\w가-힣.\-]+\.txt", text):
            if "*" not in m.group(0):
                listed.add(m.group(0))
    disk_names = {Path(rel).name: rel for rel in disk}
    for name in sorted(listed):
        if name not in disk_names:
            problems.append(f"[장부-실물] manifest 에 있는데 파일 없음: {name}")
    unlisted = sorted(rel for name, rel in disk_names.items() if name not in listed)

    # 2) 내용 중복 (해시)
    seen = {}
    for rel, p in sorted(disk.items()):
        h = hashlib.sha256(p.read_bytes()).hexdigest()[:16]
        if h in seen:
            problems.append(f"[중복] {rel} == {seen[h]}")
        else:
            seen[h] = rel

    # 3) holdout 누출: 봉인 파일명이 팩 본문에 인용되면 안 된다
    if HOLDOUT.exists() and PACKS.exists():
        holdout_names = re.findall(r"corpus/[^/\s]+/(\S+?\.txt)", HOLDOUT.read_text(encoding="utf-8"))
        packs_text = "\n".join(p.read_text(encoding="utf-8", errors="replace") for p in PACKS.glob("*.md"))
        for name in sorted(set(holdout_names)):
            if name in packs_text:
                problems.append(f"[holdout 누출] 봉인 파일이 팩에 인용됨: {name}")

    print(f"corpus 실물 {len(disk)}건 / manifest 등재 {len(listed)}건 / 미등재 {len(unlisted)}건")
    if unlisted:
        print("미등재(장부 추가 필요) 상위 10:", unlisted[:10])
    if problems:
        print(f"\n문제 {len(problems)}건:")
        for p in problems:
            print(" ", p)
        return 1
    print("무결성 이상 없음")
    return 0


if __name__ == "__main__":
    sys.exit(main())
