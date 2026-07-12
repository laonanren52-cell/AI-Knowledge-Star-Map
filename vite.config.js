import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig(function (_a) {
    var mode = _a.mode;
    var env = loadEnv(mode, ".", "VITE_");
    var buildInfo = {
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
                generateBundle: function () {
                    this.emitFile({
                        type: "asset",
                        fileName: "build-info.json",
                        source: "".concat(JSON.stringify(buildInfo, null, 2), "\n"),
                    });
                },
            },
        ],
    };
});
