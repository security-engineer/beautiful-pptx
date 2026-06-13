#!/usr/bin/env bash
# office-detect.sh — 설치된 Anthropic pptx office 스크립트 디렉토리를 찾아 경로를 stdout에 출력한다.
#
# 동작:
#   - 찾으면: 해당 office/ 디렉토리의 절대경로를 한 줄로 출력하고 exit 0.
#   - 못 찾으면: 아무것도(빈 문자열) 출력하지 않고 exit 0.
# 항상 exit 0 — 호출 측은 출력이 비어 있는지로 존재 여부를 판단한다(graceful).
#
# 사용:
#   OFFICE_DIR=$(scripts/office-detect.sh)
#   [ -n "$OFFICE_DIR" ] && echo "found: $OFFICE_DIR" || echo "office 스크립트 없음 — 건너뜀"

# graceful 보장: 탐색 실패가 스크립트를 죽이지 않도록 set -e 미사용.

found=""

# 1순위: Anthropic 공식 pptx 스킬의 office 디렉토리(플러그인 설치 경로).
found=$(find "$HOME/.claude/plugins" -ipath '*skills/pptx/scripts/office' -type d 2>/dev/null | head -1)

# 2순위: 플러그인 외 다른 위치에 설치된 경우(스킬 디렉토리 전반).
if [ -z "$found" ]; then
  found=$(find "$HOME/.claude" -ipath '*skills/pptx/scripts/office' -type d 2>/dev/null | head -1)
fi

# 출력(없으면 빈 문자열). 항상 성공 종료.
printf '%s' "$found"
exit 0
