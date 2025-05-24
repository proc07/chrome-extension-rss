import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    minify: false,
    outDir: 'dist/background',
    rollupOptions: {
      input: {
        background: './src/background.ts'
      },
      output: {
        entryFileNames: `main.js`,
      }
    }
  }
})