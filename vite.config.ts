import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "VITE_");
  const buildInfo = {
    commit: env.VITE_BUILD_SHA || "unknown",
    builtAt: new Date().toISOString(),
  };

  return {
    define: {
      "import.meta.env.VITE_BUILD_SHA": JSON.stringify(buildInfo.commit),
    },
    plugins: [
      react(),
      {
        name: "zhimai-build-info",
        generateBundle() {
          this.emitFile({
            type: "asset",
            fileName: "build-info.json",
            source: `${JSON.stringify(buildInfo, null, 2)}\n`,
          });
        },
      },
    ],
  };
});
