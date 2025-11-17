import path from "path"
import tailwindcss from "@tailwindcss/vite"
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import { visualizer } from "rollup-plugin-visualizer"


export default defineConfig({
  plugins: [
    visualizer({
      filename: "dist/stats.html",
      gzipSize: true,
      brotliSize: true,
      template: "treemap",
    }),
    react(),
    tailwindcss()
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (id.includes("@tanstack")) return "tanstack"
            if (id.includes("@dagrejs")) return "dagre"
            if (id.includes("@radix-ui")) return "radix"
            if (id.includes("d3")) return "d3"
            if (id.includes("@milkdown")) return "milkdown"
            if (id.includes("@lezer")) return "lezer"
            if (id.includes("@codemirror")) return "codemirror"
            if (id.includes("framer-motion")) return "framer-motion"
            if (id.includes("recharts")) return "recharts"
            if (
              id.includes("/node_modules/prosemirror-") ||
              id.includes("/node_modules/@prosemirror/") ||
              id.includes("/node_modules/prosemirror/")
            ) return "prosemirror"
            if (id.includes("roughjs")) return "roughjs"
            if (id.includes("katex")) return "katex"
            if (id.includes("@xyflow/react")) return "reactflow"
            if (id.includes("chevrotain")) return "chevrotain"
            if (id.includes("cytoscape-fcose")) return "cytoscape-fcose"
            if (id.includes("/node_modules/mermaid/")) return "mermaid"
            if (id.includes("/node_modules/cytoscape/")) return "cytoscape"
            if (/\/node_modules\/(react|react-dom|scheduler)\//.test(id)) return "react"
          }
        },
      },
    },
  },
  server: {
    port: Number(process.env.APP_PORT) || 5173,
  },
})
