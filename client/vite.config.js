import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Serve the same static marketing URLs locally and on Vercel.
const publicFeaturePaths = new Set(["/study-planner","/focus-timer","/study-groups","/notes","/progress","/start"]);
function featurePages() {
  const rewrite = (req, _res, next) => {
    const [pathname, query] = (req.url || "").split(/\?(.*)/s);
    if (publicFeaturePaths.has(pathname)) {
      req.url = "/seo" + pathname + ".html" + (query ? "?" + query : "");
    }
    next();
  };
  return {
    name: "studyos-public-features",
    configureServer(server) { server.middlewares.use(rewrite); },
    configurePreviewServer(server) { server.middlewares.use(rewrite); },
  };
}

export default defineConfig({
  plugins: [
    react(),
    featurePages(),
  ],

  server: {
    port: 5173,
    strictPort: true,
  },

  preview: {
    port: 4173,
    strictPort: true,
  },
});