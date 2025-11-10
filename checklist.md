- [x] (1) 프로젝트 초기 설정 및 환경 구축 — 서버/클라이언트가 모두 실행되고 기본 API·화면이 동작함을 확인
- 파일/폴더 영향: /backend, /frontend, package.json, ESLint/Prettier 설정 파일
- 예상 테스트: 로컬 서버·클라이언트 실행, 기본 API 호출 및 화면 렌더링 수동 검증

- [x] (2) TinyMCE 에디터 기본 연동 — TinyMCE 에디터가 렌더링되고 기본 편집 기능이 정상 동작함을 확인
- 파일/폴더 영향: /frontend/src/components/Editor, 환경 변수 설정 파일
- 예상 테스트: 브라우저에서 TinyMCE 로딩 및 텍스트 편집 수동 검증

- [x] (3) 커스텀 위젯 데이터 스키마 정의 — 모든 위젯 타입에 대한 타입 정의가 존재하고 컴파일 오류가 없음
- 파일/폴더 영향: /frontend/src/types/Widget.ts, 관련 목업 데이터 파일
- 예상 테스트: TypeScript 타입 검사 및 목업 데이터 컴파일 확인

- [x] (4) 커스텀 위젯 플러그인 아키텍처 설계 — 위젯이 비편집 블록으로 렌더링되고 직렬화/역직렬화가 정상 동작
- 파일/폴더 영향: /frontend/src/plugins/widgetPlugin.ts, TinyMCE 설정 파일
- 예상 테스트: 샘플 위젯 HTML 삽입 후 렌더링·시리얼라이즈 결과 수동 확인

- [ ] (5) 텍스트 위젯 구현 — 텍스트 위젯을 삽입·편집·저장할 수 있으며 변경 사항이 에디터에 반영됨
- 파일/폴더 영향: /frontend/src/plugins/widgetPlugin.ts, /frontend/src/components/widgets/TextWidget.tsx
- 예상 테스트: 텍스트 위젯 삽입 및 편집 흐름 수동 검증

- [x] (6) 테이블 위젯 구현 — JSON 데이터가 올바른 HTML 테이블로 렌더링되고 스타일 옵션이 적용됨
- 파일/폴더 영향: /frontend/src/components/widgets/TableWidget.tsx, 위젯 플러그인
- 예상 테스트: 테이블 위젯 삽입과 스타일 적용 수동 검증

- [ ] (7) 차트 라이브러리 연동 — 샘플 데이터를 이용한 Bar/Line 차트가 정상적으로 표시됨
- 파일/폴더 영향: /frontend/package.json, /frontend/src/components/charts/
- 예상 테스트: Storybook 또는 개발 서버에서 차트 렌더링 수동 확인

- [ ] (8) 그래프 위젯 구현 — 그래프 위젯이 지정된 차트 유형으로 렌더링되고 편집 모드에서도 유지됨
- 파일/폴더 영향: /frontend/src/components/widgets/GraphWidget.tsx, 차트 래퍼 컴포넌트
- 예상 테스트: 그래프 위젯 삽입 및 데이터 변경 수동 검증

- [ ] (9) 데이터 매핑 UI 설계 — 위젯 선택에 따라 데이터 바인더 패널이 갱신되는 UI 목업 완성
- 파일/폴더 영향: /frontend/src/components/panels/DataBinderPanel.tsx, 전역 상태 관리 파일
- 예상 테스트: 패널 렌더링과 상호작용 수동 검증

- [ ] (10) 데이터 매핑 엔진 기본 구조 — 샘플 SQL로 API가 응답하고 위젯에 데이터가 반영됨
- 파일/폴더 영향: /backend/src/services/sqlExecutor.ts, /backend/src/routes/widgets.ts, 프론트엔드 데이터 훅
- 예상 테스트: 서비스·API 단위 테스트 및 위젯 데이터 반영 수동 검증

- [ ] (11) 템플릿 저장/불러오기 기능 — 템플릿 저장 후 재로드 시 위젯 상태가 유지됨
- 파일/폴더 영향: /backend/src/routes/templates.ts, /frontend/src/store/templates.ts
- 예상 테스트: 템플릿 저장·불러오기 API 테스트와 UI 수동 검증

- [ ] (12) 협업 및 버전 관리 UI — 버전 리스트와 비교 화면이 렌더링되고 기본 상호작용이 가능함
- 파일/폴더 영향: /frontend/src/components/panels/VersionHistory.tsx
- 예상 테스트: UI 렌더링 및 상호작용 수동 확인

- [ ] (13) 사용자 권한 관리 기초 — 역할에 따라 API와 UI 접근이 제한됨
- 파일/폴더 영향: /backend/src/models/Role.ts, /backend/src/middleware/auth.ts, 프론트엔드 권한 훅
- 예상 테스트: 미들웨어 단위 테스트, 보호된 라우트 통합 테스트, UI 수동 검증

- [ ] (14) 백엔드 PDF 변환 서비스 설정 — 샘플 HTML을 PDF 버퍼로 변환하는 서비스가 동작
- 파일/폴더 영향: /backend/src/services/pdf/generatePdf.ts
- 예상 테스트: PDF 생성 단위 테스트

- [ ] (15) PDF 변환 API 엔드포인트 — POST 요청 시 200 응답과 함께 PDF 다운로드가 가능
- 파일/폴더 영향: /backend/src/routes/export.ts
- 예상 테스트: API 통합 테스트 또는 도구를 이용한 수동 검증

- [ ] (16) PDF 변환 시 위젯 처리 — 캔버스 위젯이 PDF에서 이미지로 정확히 표시됨
- 파일/폴더 영향: /frontend/src/utils/pdfPreparation.ts, 백엔드 변환 파이프라인
- 예상 테스트: 그래프 포함 문서 PDF 변환 시각적 확인

- [ ] (17) PDF 레이아웃 일치성 — PDF 여백과 페이지 나누기가 에디터와 일치함
- 파일/폴더 영향: /frontend/src/styles/pdf.css, /backend/src/services/pdf/generatePdf.ts
- 예상 테스트: 샘플 문서 PDF 출력 비교 수동 검증

- [ ] (18) 'PDF로 내보내기' 기능 — 버튼 클릭 시 PDF 다운로드가 시작되고 내용이 일치함
- 파일/폴더 영향: /frontend/src/components/EditorToolbar.tsx, API 유틸리티
- 예상 테스트: 브라우저에서 버튼 클릭 흐름 수동 검증

- [ ] (19) SQL 데이터 바인더 UI 목업 — 패널이 표시되고 입력 필드·텍스트 영역이 상호작용 가능
- 파일/폴더 영향: /frontend/src/components/panels/DataBinderMock.tsx
- 예상 테스트: UI 수동 확인

- [ ] (20) AI Narrative Engine UI 목업 — 해당 위젯 선택 시 'AI 코멘트 생성' 버튼과 안내 메시지가 동작
- 파일/폴더 영향: /frontend/src/components/panels/AiNarrativePanel.tsx, 위젯 툴바 로직
- 예상 테스트: 버튼 노출 및 메시지 수동 확인
