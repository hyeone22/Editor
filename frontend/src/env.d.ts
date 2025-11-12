/// <reference types="vite/client" />

declare module '*.css?inline' {
  const content: string;
  export default content;
}

interface ImportMetaEnv {
  readonly VITE_TINYMCE_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
