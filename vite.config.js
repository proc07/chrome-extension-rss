import { defineConfig } from 'vite'
import path from "path";
import vue from '@vitejs/plugin-vue'
import tailwindcss from "@tailwindcss/vite";
import ui from '@nuxt/ui/vite';
import icons from '@nuxt/icon';
import fs from 'fs';

function pathReplacer() {
  return {
    name: 'path-replacer',
    load(id) {
      // 去掉?后面的查询参数
      const cleanId = id.split('?')[0];

      if (cleanId.includes('jiti/dist/jiti.cjs') || cleanId.includes('jiti/dist/babel.cjs')) {
        const content = fs.readFileSync(cleanId.replace('.cjs', '.mjs'), 'utf-8');
          return content
      }

      // if (cleanId.includes('fdir/dist/index.js')) {
      //   const content = fs.readFileSync(cleanId.replace('.js', '.mjs'), 'utf-8');
      //   return content
      // }
      return null
    }
  }
}

export default defineConfig({
  plugins: [
    vue(),
    ui({
      icons: {
        autoInstall: true,
        collections: ['simple-icons']
      }
    }),
    icons(),
    tailwindcss()
  ],
  resolve: {
    alias: {
      "~": path.resolve(__dirname, "src"),
    }
  },
  optimizeDeps: {
    include: [
      '@nuxt/ui',
      // "@nuxt/fonts",
      // "@nuxt/icon",
      // "@nuxt/image",
    ],
    // 排除原生模块优化
    exclude: ['lightningcss', '@tailwindcss/oxide-darwin-arm64']
  },
  build: {
    rollupOptions: {
      // 告诉 Rollup 忽略原生模块
      external: ['lightningcss', '@tailwindcss/oxide-darwin-arm64']
    }
  }
})