import path from "path"
import { fileURLToPath } from "url"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// Fabricamos __dirname para que funcione en Módulos ES
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export default defineConfig({
  plugins: [react(), tailwindcss()],
  optimizeDeps: { include: ["@base-ui/react/button"] },
  server: {
    proxy: {
      // Preservar /api y las respuestas de error de Express; sin rewrite.
      "/api": { target: "http://127.0.0.1:3000", changeOrigin: true },
    },
  },
  resolve: {
    dedupe: ["react", "react-dom"],
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
