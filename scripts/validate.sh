#!/usr/bin/env bash
# validate.sh <deck.pptx> — Anthropic validate.py로 OOXML 스키마(ISO-29500) 검증을 돌린다.
#
# 의존(있으면 쓰고 없으면 우아하게 건너뜀):
#   - Anthropic office/validate.py (office-detect.sh로 위치 탐색)
# 검증기가 없으면 "검증기 없음"을 안내하고 exit 0 — .pptx 자체는 정상 산출물로 본다.
#
# 종료코드:
#   0  검증 통과, 또는 검증기 없음(graceful skip)
#   1  검증기가 스키마 오류를 보고함

set -u

SELF_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

PPTX="${1:-}"
if [ -z "$PPTX" ]; then
  echo "사용법: validate.sh <deck.pptx>" >&2
  exit 2
fi
if [ ! -f "$PPTX" ]; then
  echo "파일을 찾을 수 없음: $PPTX" >&2
  exit 2
fi
PPTX_ABS="$(cd "$(dirname "$PPTX")" && pwd)/$(basename "$PPTX")"

# Anthropic office 디렉토리 탐색 → validate.py 위치 확인.
OFFICE_DIR="$("$SELF_DIR/office-detect.sh" 2>/dev/null || true)"
VALIDATOR=""
if [ -n "$OFFICE_DIR" ]; then
  if [ -f "$OFFICE_DIR/validate.py" ]; then
    VALIDATOR="$OFFICE_DIR/validate.py"
  elif [ -f "$OFFICE_DIR/../validate.py" ]; then
    VALIDATOR="$OFFICE_DIR/../validate.py"   # scripts/validate.py (office의 상위)에 둔 배치 대비
  fi
fi

if [ -z "$VALIDATOR" ]; then
  echo "검증기 없음 — Anthropic validate.py를 찾지 못해 스키마 검증을 건너뜁니다(.pptx는 정상)."
  echo "  대상: $PPTX_ABS"
  exit 0
fi

PYBIN="$(command -v python3 || command -v python || true)"
if [ -z "$PYBIN" ]; then
  echo "검증기 없음 — python이 없어 validate.py를 실행할 수 없습니다(.pptx는 정상)."
  exit 0
fi

echo "검증: $VALIDATOR 사용"
if "$PYBIN" "$VALIDATOR" "$PPTX_ABS"; then
  echo "스키마 검증 통과: $PPTX_ABS"
  exit 0
else
  echo "스키마 검증 실패 — 위 validate.py 출력에서 오류를 확인하세요." >&2
  exit 1
fi
