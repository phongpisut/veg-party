/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GAME_TAG?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
