import { bindings, defineConfig, defineWorker } from "cf/config";
import { createWorkersCacheConfig } from "@vinext/cloudflare/cache/config";

const cache = await createWorkersCacheConfig();

export default defineConfig({
  worker: defineWorker({
    ...cache,
    // Deve coincidere con il nome del Worker su Cloudflare, altrimenti la build da GitHub fallisce.
    name: "sito-universit",
    entrypoint: "vinext/server/fetch-handler",
    compatibilityDate: "2026-10-29",
    compatibilityFlags: ["nodejs_compat"],
    assets: {
      htmlHandling: "none",
      notFoundHandling: "none",
      runWorkerFirst: ["/*", "!/_next/static/*", "!/*/_next/static/*"],
    },
    env: {
      ...cache.env,
      ASSETS: bindings.assets(),
    },
  }),
});
