// Test-only build of the real SPA, against the Firebase Auth Emulator.
// Never included by the normal Vite build or deployed to Vercel.
import { build, preview } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

if (process.env.STUDYOS_E2E !== "isolated-local-only") throw Error("Isolated E2E opt-in required");
const root = fileURLToPath(new URL("../", import.meta.url));
const outDir = await mkdtemp(join(tmpdir(), "studyos-e2e-client-"));
const values = {
  VITE_FIREBASE_API_KEY: "demo-studyos-e2e",
  VITE_FIREBASE_AUTH_DOMAIN: "demo-studyos-e2e.firebaseapp.invalid",
  VITE_FIREBASE_PROJECT_ID: "demo-studyos-e2e",
  VITE_FIREBASE_STORAGE_BUCKET: "demo-studyos-e2e.invalid",
  VITE_FIREBASE_MESSAGING_SENDER_ID: "123456789",
  VITE_FIREBASE_APP_ID: "1:123456789:web:e2e",
  VITE_FIREBASE_APP_CHECK_SITE_KEY: "",
  VITE_TURNSTILE_SITE_KEY: "",
  VITE_API_URL: "http://127.0.0.1:5500",
};
let transformed = false;
const emulator = {
  name: "isolated-firebase-auth-emulator",
  enforce: "pre",
  transform(code, id) {
    if (id !== fileURLToPath(new URL("../src/firebase.js", import.meta.url))) return;
    const marker = "export const xProvider =";
    if (!code.includes(marker)) throw Error("Firebase initialization changed; update the E2E harness");
    transformed = true;
    return 'import { connectAuthEmulator } from "firebase/auth";\n' +
      code.replace(marker, 'connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });\n' + marker);
  },
};
try {
  await build({
    root, configFile: false, envDir: false,
    plugins: [emulator, react()],
    define: Object.fromEntries(Object.entries(values).map(([key, value]) => ["import.meta.env." + key, JSON.stringify(value)])),
    build: { outDir, emptyOutDir: true },
  });
  if (!transformed) throw Error("Auth emulator was not wired into the test bundle");
  const server = await preview({ root, configFile: false, envDir: false, build: { outDir },
    preview: { host: "127.0.0.1", port: 5174, strictPort: true } });
  const stop = async () => {
    server.httpServer.closeAllConnections();
    await new Promise(resolve => server.httpServer.close(resolve));
    await rm(outDir, { recursive: true, force: true });
    process.exit(0);
  };
  process.once("SIGTERM", stop);
  process.once("SIGINT", stop);
  console.log("Isolated frontend ready");
} catch (error) {
  await rm(outDir, { recursive: true, force: true });
  throw error;
}
