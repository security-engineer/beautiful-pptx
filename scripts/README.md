# scripts/ — 외부도구 래퍼

모든 스크립트는 **있으면 쓰고 없으면 우아하게 건너뛴다**(안내 + exit 0). `.pptx` 자체는 pptxgenjs만으로 항상 만들어지며, 아래 도구들은 보조 QA·검증용이다.

| 스크립트 | 용도 | 의존성 | 없을 때 |
|---|---|---|---|
| `office-detect.sh` | 설치된 Anthropic pptx `office/` 스크립트 디렉토리 경로를 stdout에 출력 | `find` (없을 일 없음) | 빈 문자열 출력 + exit 0 |
| `preview.sh <deck.pptx>` | pptx → PDF → 슬라이드 JPG(150dpi) 렌더, 시각 QA용 | Anthropic `soffice.py`(1순위) 또는 시스템 `soffice`/`libreoffice`, `pdftoppm` | "미리보기 도구 없음(.pptx는 정상)" 안내 + exit 0 |
| `validate.sh <deck.pptx>` | Anthropic `validate.py`로 OOXML(ISO-29500) 스키마 검증 | `office-detect.sh`가 찾은 `validate.py` + `python3` | "검증기 없음" 안내 + exit 0 (스키마 오류 발견 시에만 exit 1) |

## 메모
- Anthropic 공식 스크립트(`soffice.py`·`validate.py`)는 **복사하지 않고 호출만** 한다. `soffice.py`는 샌드박스 우회를 포함하므로 시스템 `soffice`보다 우선 사용한다.
- `preview.sh`/`validate.sh`는 모두 `office-detect.sh`를 통해 Anthropic `office/` 경로를 찾는다.
- graceful 경로는 항상 exit 0을 유지한다. 인자 누락·파일 없음 같은 사용자 실수만 exit 2, 실제 스키마 오류만 exit 1.
