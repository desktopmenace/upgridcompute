/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Lambda Function URL the browser POSTs decisions to. Unset → Emulated mode. Not a secret. */
  readonly VITE_INFERENCE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
