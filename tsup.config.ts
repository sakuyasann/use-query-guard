// tsup.config.ts
import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  // peerDependencies を自動 external 化するが、明示してもOK
  external: ['react', 'react-dom', 'zod'],
})
