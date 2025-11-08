# 태스크-PRD 정합성 분석

## 누락 또는 보완 제안

- **Field/Section/AI Rule/Design Asset 위젯 부재:** PRD 4장에 명시된 Field, AI Rule, Section, Design Asset 위젯이 현재 태스크(5~13번) 목록에서 제외되어 있습니다. 추후 실제 보고서 시나리오를 완성하려면 해당 위젯 정의 및 렌더링, 데이터 매핑 로직에 대한 별도 태스크가 필요합니다.
- **스타일 패널 및 테마 관리:** PRD의 공통 위젯 기능과 UX 요구사항에서는 Style Panel, Theme Manager, Style Copy 기능을 요구하나 태스크에는 포함되지 않았습니다. TinyMCE 사이드바 패널 설계 및 글로벌 테마 스키마 정의 태스크 추가를 권장합니다.
- **Undo/Redo 및 버전 관리:** UX 요구사항(8장)의 Undo/Redo, Versioning 항목이 태스크에 없습니다. 최소한 에디터 히스토리 관리(Undo/Redo)와 템플릿 버전 저장 전략 수립 태스크가 필요합니다.
- **다중 Export 포맷:** PRD 7장에서 PPTX, DOCX 출력도 요구되지만 현재 태스크는 PDF에만 집중합니다. 향후 일정에 PPTX/DOCX 변환 모듈 설계 및 API 연동 태스크를 추가해야 합니다.
- **AI Narrative/SQL Binder 실기능 구현:** 19, 20번 태스크는 UI Mockup까지만 다루고 있습니다. PRD 목표를 충족하려면 실제 SQL 실행/파라미터 바인딩, AI 프롬프트 호출 및 후처리 로직 구현 태스크가 필요합니다.

# 개발 플랜

## 1. 프로젝트 초기 설정 및 환경 구축

- **목적:** 프론트엔드(React)와 백엔드(Express) 기본 골격을 마련하고 공통 개발 도구(ESLint, Prettier, TypeScript) 설정.
- **예상 구현 파일/폴더:** `apps/frontend/` (Vite+React), `apps/backend/` (Express), 루트 `package.json`, `tsconfig.json`, `.eslintrc.js`, `.prettierrc`.
- **예상 테스트 방법:** `npm run lint`, `npm run test`(기본 테스트), 프론트/백엔드 `npm run dev` 실행 확인.
- **의존 관계:** 선행 없음.
- **Definition of Done:** 프론트/백엔드가 로컬에서 각각 실행되고 Lint/Format 스크립트가 동작하며 기본 Health Check API와 React Welcome 화면이 노출.

## 2. TinyMCE 에디터 기본 연동

- **목적:** React 앱에 TinyMCE를 통합해 위젯 작업의 기반 에디터 환경 마련.
- **예상 구현 파일/폴더:** `apps/frontend/src/components/Editor.tsx`, `apps/frontend/src/env.d.ts`, TinyMCE API 키를 담은 `.env`.
- **예상 테스트 방법:** 로컬에서 `npm run dev` 실행 후 TinyMCE 로딩 및 기본 서식 기능 수동 확인.
- **의존 관계:** 1번.
- **Definition of Done:** TinyMCE 에디터가 렌더링되고 텍스트 입력/기본 서식 적용이 가능하며 콘솔 경고 없이 구동.

## 3. 커스텀 위젯 데이터 스키마 정의

- **목적:** PRD 공통 JSON 스키마를 TypeScript 타입으로 정리해 위젯 데이터 일관성 확보.
- **예상 구현 파일/폴더:** `apps/frontend/src/types/widgets.ts`, `apps/frontend/src/mocks/widgetSamples.ts`.
- **예상 테스트 방법:** TypeScript 컴파일 체크, 샘플 데이터를 이용한 유닛 테스트(`vitest`)로 타입 검증.
- **의존 관계:** 1번.
- **Definition of Done:** 모든 위젯 타입에 대한 인터페이스/타입이 정의되고 샘플 객체 생성 시 타입 오류가 없으며 JSDoc 문서화 완료.

## 4. 커스텀 위젯 렌더링을 위한 TinyMCE 플러그인 아키텍처 설계

- **목적:** TinyMCE 내부에서 커스텀 `<div data-widget-type>`을 비편집 영역으로 처리하고 렌더링 훅 구성.
- **예상 구현 파일/폴더:** `apps/frontend/src/plugins/widgetPlugin.ts`, `apps/frontend/src/utils/widgetRenderer.ts`.
- **예상 테스트 방법:** Storybook 또는 개발 서버에서 목업 HTML 삽입 후 렌더링 결과 수동 확인.
- **의존 관계:** 2번, 3번.
- **Definition of Done:** 커스텀 위젯 노드가 파서/시리얼라이저를 통해 안전하게 왕복되고 비편집 처리 및 기본 렌더링 구조가 동작.

## 5. 텍스트 위젯(Text Widget) 구현

- **목적:** 정적 HTML 텍스트를 렌더링하고 편집할 수 있는 위젯 기능 제공.
- **예상 구현 파일/폴더:** `apps/frontend/src/widgets/TextWidget.tsx`, `apps/frontend/src/plugins/widgetHandlers/text.ts`.
- **예상 테스트 방법:** TinyMCE 내 삽입 → 더블클릭 편집 → 저장 동작 수동 확인, Vitest로 HTML 파서 함수 테스트.
- **의존 관계:** 4번.
- **Definition of Done:** 텍스트 위젯 삽입/편집/삭제가 가능하고 `data-widget-config` 갱신이 정상 반영.

## 6. 테이블 위젯(Table Widget) 구현

- **목적:** 재무 데이터 테이블을 JSON 기반으로 렌더링.
- **예상 구현 파일/폴더:** `apps/frontend/src/widgets/TableWidget.tsx`, `apps/frontend/src/plugins/widgetHandlers/table.ts`.
- **예상 테스트 방법:** 다양한 목업 데이터로 렌더링 수동 확인, 행/열 생성 로직에 대한 단위 테스트.
- **의존 관계:** 4번.
- **Definition of Done:** 테이블 위젯이 JSON 데이터를 기반으로 렌더링되고 스타일 옵션(폭, 정렬)이 적용.

## 7. 차트 라이브러리(Chart.js) 연동

- **목적:** 그래프 위젯 구현을 위한 Chart.js + react-chartjs-2 환경 구성.
- **예상 구현 파일/폴더:** `apps/frontend/package.json` 의존성 추가, `apps/frontend/src/components/charts/BaseChart.tsx`.
- **예상 테스트 방법:** 샘플 Chart 컴포넌트를 Storybook/개발서버에서 렌더링 확인.
- **의존 관계:** 1번.
- **Definition of Done:** Bar/Line 차트 샘플이 오류 없이 렌더링되고 Chart.js 전역 설정이 구성.

## 8. 그래프 위젯(Graph Widget) 구현

- **목적:** 위젯 플러그인과 Chart.js를 이용해 그래프를 TinyMCE 내에서 렌더링.
- **예상 구현 파일/폴더:** `apps/frontend/src/widgets/GraphWidget.tsx`, `apps/frontend/src/plugins/widgetHandlers/graph.ts`.
- **예상 테스트 방법:** TinyMCE에서 그래프 위젯 삽입 후 데이터 시각화 확인, 캔버스 크기/반응성 수동 점검.
- **의존 관계:** 4번, 7번.
- **Definition of Done:** 그래프 위젯이 Chart.js를 사용해 지정된 유형(Bar/Line)으로 렌더링되고 `data-widget-config`와 동기화.

## 9. 페이지 나누기(Page Break) 위젯 구현

- **목적:** PDF 출력 시 수동 페이지 분할을 위한 전용 위젯 제공.
- **예상 구현 파일/폴더:** `apps/frontend/src/widgets/PageBreakWidget.tsx`, `apps/frontend/src/plugins/widgetHandlers/pageBreak.ts`.
- **예상 테스트 방법:** TinyMCE에서 삽입 시 시각적 분리선 확인, HTML 내 page-break 스타일 검사.
- **의존 관계:** 4번.
- **Definition of Done:** Page Break 위젯 삽입/삭제가 가능하고 HTML에 `data-page-break="true"` 속성이 유지.

## 10. 위젯 삽입 UI (툴바 메뉴) 구현

- **목적:** TinyMCE 툴바에서 각 위젯을 삽입할 수 있는 메뉴 제공.
- **예상 구현 파일/폴더:** `apps/frontend/src/plugins/widgetInsertMenu.ts`, `apps/frontend/src/components/EditorToolbar.tsx`.
- **예상 테스트 방법:** 수동 테스트로 각 메뉴 항목 클릭 시 대응 위젯이 삽입되는지 확인.
- **의존 관계:** 5번, 6번, 8번, 9번.
- **Definition of Done:** '위젯 삽입' 메뉴가 노출되고 모든 위젯 삽입 시 기본 설정이 반영.

## 11. 위젯 선택 및 컨텍스트 툴바 구현

- **목적:** 위젯 선택 상태 표시 및 삭제/정렬 조작을 제공.
- **예상 구현 파일/폴더:** `apps/frontend/src/plugins/widgetSelection.ts`, `apps/frontend/src/components/WidgetContextToolbar.tsx`.
- **예상 테스트 방법:** 수동 테스트로 선택 시 테두리/툴바 노출과 조작 버튼 동작 확인, DOM 이벤트 단위 테스트.
- **의존 관계:** 4번.
- **Definition of Done:** 위젯 선택 시 스타일이 적용되고 컨텍스트 툴바 버튼이 정상 동작.

## 12. 위젯 드래그 앤 드롭(Drag and Drop) 순서 변경 기능

- **목적:** 위젯 순서를 직관적으로 재배치.
- **예상 구현 파일/폴더:** `apps/frontend/src/plugins/widgetDragDrop.ts`, `apps/frontend/src/utils/dom/dragDrop.ts`.
- **예상 테스트 방법:** 브라우저 수동 테스트(드래그 후 위치 변경), DOM 변경에 대한 단위 테스트.
- **의존 관계:** 4번.
- **Definition of Done:** 드래그로 위젯 순서를 변경할 수 있고 `order` 속성이 업데이트되어 재로딩 시에도 순서가 유지.

## 13. 위젯 크기 조절(Resizing) 기능 구현

- **목적:** 위젯의 width/height 변경 기능 제공.
- **예상 구현 파일/폴더:** `apps/frontend/src/plugins/widgetResize.ts`, 관련 CSS `apps/frontend/src/styles/widgets.css`.
- **예상 테스트 방법:** 수동 테스트로 리사이즈 핸들 드래그 시 크기 변경 확인, 최소/최대 크기 제한 테스트.
- **의존 관계:** 11번.
- **Definition of Done:** 리사이즈 핸들이 표시되고 크기 변경이 스타일 및 `data-widget-config.style`에 저장.

## 14. 백엔드 PDF 변환 서비스(Puppeteer) 설정

- **목적:** Puppeteer 기반 HTML→PDF 변환 서비스 모듈 구축.
- **예상 구현 파일/폴더:** `apps/backend/src/services/pdf/generatePdf.ts`, 환경설정 `apps/backend/src/config/puppeteer.ts`.
- **예상 테스트 방법:** Jest/TS-Jest로 단위 테스트, 간단한 HTML을 넣어 PDF 생성 확인.
- **의존 관계:** 1번.
- **Definition of Done:** Puppeteer가 Headless 모드로 HTML을 받아 PDF 버퍼를 반환하며 에러 처리 로직 포함.

## 15. PDF 변환 API 엔드포인트 구현

- **목적:** 프론트엔드에서 HTML을 전송받아 PDF로 반환하는 API 제공.
- **예상 구현 파일/폴더:** `apps/backend/src/routes/exportPdf.ts`, `apps/backend/src/app.ts`.
- **예상 테스트 방법:** Supertest 기반 통합 테스트, Postman 수동 검증.
- **의존 관계:** 14번.
- **Definition of Done:** `/api/export/pdf` POST 요청에 대해 200 응답과 PDF 파일 스트림이 반환.

## 16. PDF 변환 시 커스텀 위젯 처리 로직

- **목적:** 그래프 등 동적 요소를 PDF에 맞게 정적 자산으로 변환.
- **예상 구현 파일/폴더:** `apps/frontend/src/utils/export/prepareHtml.ts`, `apps/frontend/src/utils/export/serializeWidgets.ts`.
- **예상 테스트 방법:** Jest/Vitest로 Canvas → DataURL 변환 함수 테스트, PDF 결과 수동 확인.
- **의존 관계:** 8번, 15번.
- **Definition of Done:** 그래프 위젯이 PDF 변환 전 이미지로 교체되고 결과 PDF에 시각적 손실이 없음.

## 17. PDF 페이지 레이아웃 및 스타일 일치성 보장

- **목적:** 화면과 PDF 출력 간 레이아웃 일치.
- **예상 구현 파일/폴더:** `apps/frontend/src/styles/print.css`, `apps/frontend/src/utils/export/pageLayout.ts`, `apps/backend/src/services/pdf/options.ts`.
- **예상 테스트 방법:** 다양한 문서를 PDF로 변환해 여백, 페이지 분할 수동 검증; 시각 diff 툴 활용.
- **의존 관계:** 9번, 15번.
- **Definition of Done:** 설정한 여백/페이지 나눔이 PDF에서 정확히 반영되고 회귀 테스트 기준을 충족.

## 18. 프론트엔드 'PDF로 내보내기' 기능 연동

- **목적:** 에디터 콘텐츠를 백엔드 PDF API에 연동하여 다운로드 제공.
- **예상 구현 파일/폴더:** `apps/frontend/src/components/ExportButton.tsx`, `apps/frontend/src/api/exportPdf.ts`.
- **예상 테스트 방법:** 브라우저에서 버튼 클릭 후 파일 다운로드 확인, 네트워크 모킹 기반 단위 테스트.
- **의존 관계:** 17번.
- **Definition of Done:** 버튼 클릭으로 PDF 다운로드가 시작되고 오류 시 사용자 알림이 제공.

## 19. SQL 데이터 바인더 UI 목업(Mockup) 구현

- **목적:** SQL 파라미터/쿼리 편집을 위한 UI 레이아웃 시연.
- **예상 구현 파일/폴더:** `apps/frontend/src/components/SqlBinderPanel.tsx`, `apps/frontend/src/styles/panels.css`.
- **예상 테스트 방법:** UI 렌더링 스냅샷 테스트, Storybook에서 UX 수동 확인.
- **의존 관계:** 2번.
- **Definition of Done:** 패널에 파라미터 입력 필드와 SQL 편집 영역이 표시되고 인터랙션(입력/초기화)이 동작.

## 20. AI Narrative Engine UI 목업(Mockup) 구현

- **목적:** AI 코멘트 생성 UI 요소를 제공하여 향후 기능 확장 기반 마련.
- **예상 구현 파일/폴더:** `apps/frontend/src/components/AiNarrativeToolbar.tsx`, `apps/frontend/src/hooks/useWidgetSelection.ts`.
- **예상 테스트 방법:** 위젯 선택 시 버튼 노출 및 알림 토스트 수동 확인, 컴포넌트 렌더링 테스트.
- **의존 관계:** 11번.
- **Definition of Done:** 선택된 위젯에 'AI 코멘트 생성' 버튼이 표시되고 클릭 시 안내 메시지가 출력.
