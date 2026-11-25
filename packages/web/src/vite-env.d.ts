/// <reference types="vite/client" />

declare module '*.ogg' {
  const src: string;
  export default src;
}

declare module '*.mp3' {
  const src: string;
  export default src;
}

interface ImportMetaEnv {
  readonly VITE_BUILD_HASH?: string;
  readonly VITE_ANALYTICS_DEFAULT_ON?: string;
}
