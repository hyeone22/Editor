# Editor Project

## Monorepo Overview

이 저장소는 TinyMCE 기반 위젯 에디터 데모를 구현하기 위한 **프론트엔드(Vite + React)** 와 **백엔드(Express)** 를 포함하는 모노레포입니다.
`checklist.md` 1번 항목인 "프로젝트 초기 설정 및 환경 구축"을 충족하도록 기본 실행 환경과 공통 개발 도구를 구성했습니다.

```
├── README.md
├── plan.md
├── checklist.md
├── package.json          # 루트 워크스페이스 및 공통 스크립트
├── tsconfig.json         # 공유 TypeScript 설정
├── .eslintrc.cjs         # ESLint + @typescript-eslint 구성
├── .prettierrc           # Prettier 규칙
├── frontend/             # Vite + React 애플리케이션
│   ├── index.html
│   ├── package.json
│   ├── tsconfig*.json
│   └── src/
│       ├── App.tsx       # 백엔드 헬스 체크 UI
│       ├── api/health.ts
│       ├── main.tsx
│       └── styles.css
└── backend/              # Express API 서버
    ├── package.json
    ├── tsconfig.json
    └── src/
        ├── index.ts      # 서버 진입점
        ├── server.ts     # Express 설정
        └── routes/health.ts
```

## 개발 시작하기

### 1. 의존성 설치

루트에서 한 번만 설치하면 워크스페이스가 함께 설치됩니다.

```bash
npm install
```

### 2. 개발 서버 실행

두 개의 터미널을 열어 각각 실행합니다.

```bash
npm run dev:backend
npm run dev:frontend
```

- 백엔드: <http://localhost:4000/api/health> 에서 상태 확인 JSON을 제공합니다.
- 프론트엔드: <http://localhost:5173> 에서 상태 카드가 렌더링되며 백엔드 헬스 체크 결과를 표시합니다.

### 3. 코드 품질 도구

루트에서 아래 명령으로 Lint/Format 검사를 실행할 수 있습니다.

```bash
npm run lint    # ESLint 검사
npm run format  # Prettier 형식 검사
```

## 다음 단계

- TinyMCE 에디터 연동 및 커스텀 위젯 구현 (checklist 2~13번)
- PDF 변환 백엔드 및 내보내기 플로우 구축 (checklist 14~18번)
- 데이터 바인더/AI Narrative UI 목업 추가 (checklist 19~20번)
