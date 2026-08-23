import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // GitHub Pages serves the site under /<repo-name>/; the deploy workflow sets VITE_BASE accordingly.
  base: process.env.VITE_BASE ?? '/',
  build: {
    rolldownOptions: {
      output: {
        // Split vendor libraries into separately cacheable chunks so app changes don't re-download them.
        codeSplitting: {
          groups: [
            { name: 'vendor-editor', test: /node_modules[\\/](@tiptap|prosemirror-|@remirror|orderedmap|w3c-keyname|rope-sequence|linkifyjs|crelt)/ },
            { name: 'vendor-react', test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/ },
            { name: 'vendor-data', test: /node_modules[\\/](dexie|dexie-react-hooks|minisearch)[\\/]/ },
          ],
        },
      },
    },
  },
})
