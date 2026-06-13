#!/usr/bin/env bash
# preview.sh <deck.pptx> — pptx를 PDF로 변환하고 각 슬라이드를 150dpi JPG로 렌더한다.
#
# 의존(있으면 쓰고 없으면 우아하게 건너뜀):
#   - 변환: Anthropic office/soffice.py (샌드박스 우회 포함, 1순위) → 없으면 시스템 soffice/libreoffice (2순위)
#   - 래스터화: pdftoppm (poppler-utils)
# 변환 도구가 하나도 없으면 "미리보기 도구 없음(.pptx는 정상)"을 안내하고 exit 0.
# 즉 .pptx 자체는 이미 정상 산출물이며, 미리보기는 어디까지나 보조 QA다.
#
# 산출:
#   <deck>.pdf            (PDF)
#   <deck>-slides/slide-NN.jpg  (슬라이드별 150dpi JPG)

set -u  # 미설정 변수 사용은 잡되, 변환 실패 경로는 아래에서 직접 exit 0 처리.

SELF_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

PPTX="${1:-}"
if [ -z "$PPTX" ]; then
  echo "사용법: preview.sh <deck.pptx>" >&2
  exit 2
fi
if [ ! -f "$PPTX" ]; then
  echo "파일을 찾을 수 없음: $PPTX" >&2
  exit 2
fi

PPTX_ABS="$(cd "$(dirname "$PPTX")" && pwd)/$(basename "$PPTX")"
OUTDIR="$(dirname "$PPTX_ABS")"
STEM="$(basename "$PPTX_ABS")"; STEM="${STEM%.*}"
PDF="$OUTDIR/$STEM.pdf"
SLIDES_DIR="$OUTDIR/$STEM-slides"

# --- 1) pptx → PDF -----------------------------------------------------------
converted=""

# 1순위: Anthropic soffice.py (있으면 샌드박스 우회까지 처리해 주므로 우선).
OFFICE_DIR="$("$SELF_DIR/office-detect.sh" 2>/dev/null || true)"
if [ -n "$OFFICE_DIR" ] && [ -f "$OFFICE_DIR/soffice.py" ]; then
  PYBIN="$(command -v python3 || command -v python || true)"
  if [ -n "$PYBIN" ]; then
    echo "변환 시도: Anthropic soffice.py ($OFFICE_DIR/soffice.py)"
    if "$PYBIN" "$OFFICE_DIR/soffice.py" --headless --convert-to pdf --outdir "$OUTDIR" "$PPTX_ABS" >/dev/null 2>&1; then
      [ -f "$PDF" ] && converted="soffice.py"
    fi
  fi
fi

# 2순위: 시스템 soffice/libreoffice.
if [ -z "$converted" ]; then
  SOFFICE="$(command -v soffice || command -v libreoffice || true)"
  if [ -n "$SOFFICE" ]; then
    echo "변환 시도: 시스템 soffice ($SOFFICE)"
    if "$SOFFICE" --headless --convert-to pdf --outdir "$OUTDIR" "$PPTX_ABS" >/dev/null 2>&1; then
      [ -f "$PDF" ] && converted="system-soffice"
    fi
  fi
fi

if [ -z "$converted" ]; then
  echo "미리보기 도구 없음(.pptx는 정상) — soffice/libreoffice가 없어 PDF·JPG 미리보기를 건너뜁니다."
  echo "  .pptx 파일 자체는 정상 산출물입니다: $PPTX_ABS"
  exit 0
fi
echo "PDF 생성($converted): $PDF"

# --- 2) PDF → 슬라이드 JPG (150dpi) ------------------------------------------
PDFTOPPM="$(command -v pdftoppm || true)"
if [ -z "$PDFTOPPM" ]; then
  echo "미리보기 도구 없음(.pptx는 정상) — pdftoppm(poppler-utils)이 없어 슬라이드 JPG를 건너뜁니다."
  echo "  PDF는 생성됐습니다: $PDF"
  exit 0
fi

mkdir -p "$SLIDES_DIR"
if "$PDFTOPPM" -jpeg -r 150 "$PDF" "$SLIDES_DIR/slide" >/dev/null 2>&1; then
  count="$(find "$SLIDES_DIR" -name 'slide*.jpg' 2>/dev/null | wc -l | tr -d ' ')"
  echo "슬라이드 JPG ${count}장 생성: $SLIDES_DIR/"
else
  echo "슬라이드 JPG 생성 실패 — PDF는 정상입니다: $PDF"
fi
exit 0
