'use strict';
// beautiful-pptx 장르 프리셋 데이터 (CONTRACT §5, _research/presets.md D-3 표)
//
// 각 프리셋 = { logic, titleStyle, density, backup, maxSlides, emphasize, sequence }
//   logic      : 'inductive'(귀납·결론 끝) | 'deductive'(연역·답 먼저)
//   titleStyle : 'assertion'(완결 문장 주장) | 'action'(so-what 동사 제목) | 'message'(임팩트 메시지)
//   density    : 'low' | 'mid' | 'high'        (한 슬라이드당 정보량)
//   backup     : false | true | 'many'          (백업 슬라이드 비중)
//   maxSlides  : 본문 권장 상한
//   emphasize  : 강조 포인트 토큰 배열
//   sequence   : 슬라이드 토큰 배열 (build.js DISPATCH 키와 동일)
//                cover|section|keymsg|kpi|chart|compare|timeline|process|quote|closing|backup
//
// 토큰 매핑 메모(presets.md D-2 → DISPATCH):
//   title  → cover,  bullets → keymsg(불릿 전용 부품이 없어 핵심메시지로 수렴)

module.exports = {
  // 연구/학회 구두발표 (12~15장). 귀납 — 근거 누적 후 마지막에 결론.
  'research-talk': {
    logic: 'inductive',
    titleStyle: 'assertion',
    density: 'mid',
    backup: true,
    maxSlides: 15,
    emphasize: ['assertion-evidence', 'context-first'],
    // 표지→동기→연구질문→기여→방법→결과(그림=주장)→한계→결론→백업
    sequence: [
      'cover',    // 표지
      'keymsg',   // 동기/문제 "왜 신경 써야 하나"
      'keymsg',   // 연구 질문/가설 (한 문장)
      'keymsg',   // 기여 요약 3개
      'section',  // 방법 섹션
      'chart',    // 방법 (그림 중심)
      'chart',    // 결과 1 (그림=주장 1개)
      'chart',    // 결과 2
      'keymsg',   // 한계
      'closing',  // 결론 + take-home
      'backup'    // 추가 그림·데이터셋·하이퍼파라미터
    ]
  },

  // 박사 디펜스/심사 (25~35장). 귀납 + Swath & Dive. 정밀·방어적.
  'defense': {
    logic: 'inductive',
    titleStyle: 'assertion',
    density: 'high',
    backup: 'many',
    maxSlides: 35,
    emphasize: ['validation', 'contributions', 'limitations-first'],
    // 문제→선행연구→질문→한계(스코프,먼저)→기여×N(방법·결과·검증)→결론→향후→백업多
    sequence: [
      'cover',     // 표지
      'keymsg',    // 문제·동기
      'section',   // 선행연구 섹션
      'keymsg',    // 선행연구 요약
      'keymsg',    // 연구질문
      'keymsg',    // 한계/스코프 (먼저 못박기)
      'section',   // 기여 1
      'chart',     // 기여1 방법
      'chart',     // 기여1 결과
      'keymsg',    // 기여1 검증(validation)
      'section',   // 기여 2
      'chart',     // 기여2 결과
      'keymsg',    // 기여2 검증
      'section',   // 기여 3
      'chart',     // 기여3 결과
      'keymsg',    // 기여3 검증
      'closing',   // 종합 결론·기여 재진술
      'keymsg',    // 향후연구
      'backup',    // 증명
      'backup',    // 데이터셋·하이퍼파라미터
      'backup'     // 추가 실험
    ]
  },

  // 경영/임원 보고 (8~15장). 연역 — 답 먼저(BLUF). action title, 저밀도.
  'exec': {
    logic: 'deductive',
    titleStyle: 'action',
    density: 'low',
    backup: true,
    maxSlides: 15,
    emphasize: ['narrative-spine', 'vertical-proof'],
    // ExecSummary(BLUF)→SCR→근거×N(action title)→권고→다음단계→백업
    sequence: [
      'cover',     // 표지
      'keymsg',    // Executive Summary / BLUF (답·권고)
      'compare',   // SCR 한 장 (상황·문제·해결)
      'chart',     // 근거 1
      'kpi',       // 근거 2 (정량 지표)
      'chart',     // 근거 3
      'keymsg',    // 권고 + 필요 자원
      'keymsg',    // 다음 단계·책임자·기한
      'backup'     // 상세 데이터·민감도
    ]
  },

  // 투자 피치덱 (10~12장). 연역·내러티브. 메시지/임팩트, 저밀도, 백업 없음.
  'pitch': {
    logic: 'deductive',
    titleStyle: 'message',
    density: 'low',
    backup: false,
    maxSlides: 12,
    emphasize: ['problem-first', 'clear-ask'],
    // 목적→문제→해결→WhyNow→시장→제품→BM→트랙션→경쟁→팀→재무→Ask
    sequence: [
      'cover',     // 1. Company Purpose (한 문장 정의)
      'keymsg',    // 2. Problem (문제 먼저)
      'keymsg',    // 3. Solution (가치제안)
      'keymsg',    // 4. Why Now
      'chart',     // 5. Market Size (TAM/SAM/SOM)
      'section',   // 6. Product / 데모
      'compare',   // 7. Business Model
      'kpi',       // 8. Traction
      'compare',   // 9. Competition
      'keymsg',    // 10. Team
      'chart',     // 11. Financials
      'closing'    // 12. The Ask (금액·용도 명확)
    ]
  }
};
