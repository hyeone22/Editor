# Editor Project

## TinyMCE Widgets Demo

이 저장소는 Vite + React + TypeScript 기반의 TinyMCE 위젯 데모 애플리케이션을 제공합니다. `/widgets` 라우트에서 아래 기능을 실험할 수 있습니다.

- TinyMCE 에디터에 텍스트/테이블/그래프 placeholder 위젯을 `data-widget-*` 속성으로 삽입 및 수정
- `div[data-page-break="true"]` 요소를 활용한 페이지 나눔 및 A4 사이즈 미리보기
- 초안 단계의 HTML → PDF 내보내기 유틸리티 (`src/utils/htmlToPdf.ts`)

## 주요 파일 구조

```
├── index.html
├── package.json
├── src
│   ├── App.tsx
│   ├── main.tsx
│   ├── components
│   │   ├── PagePreview.tsx
│   │   └── pagePreview.css
│   ├── routes
│   │   ├── Home.tsx
│   │   └── WidgetDemo.tsx
│   ├── widgets
│   │   ├── PlaceholderToolbar.tsx
│   │   ├── WidgetEditor.tsx
│   │   └── widgetStyles.css
│   └── utils
│       └── htmlToPdf.ts
├── tsconfig.json
├── tsconfig.node.json
└── vite.config.ts
```

## 실행 방법

1. 의존성 설치

   ```bash
   npm install
   ```

2. 개발 서버 실행

   ```bash
   npm run dev
   ```

3. 브라우저에서 `http://localhost:5173/widgets` 로 이동하여 TinyMCE 위젯 데모 페이지를 확인합니다.

> 참고: TinyMCE는 CDN(`https://cdn.tiny.cloud/1/no-api-key/tinymce/6/tinymce.min.js`) 스크립트를 사용합니다. 네트워크가 제한된 환경에서는 TinyMCE 로더 스크립트를 직접 호스팅해야 합니다.
