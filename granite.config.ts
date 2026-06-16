import { defineConfig } from "@apps-in-toss/web-framework/config";

export default defineConfig({
  appName: "jun-running-plan",
  brand: {
    displayName: "달려",
    primaryColor: "#0088FF",
    icon: "https://static.toss.im/appsintoss/38317/67e8d00a-5176-40e9-8ed3-a49b22b554a6.png",
  },
  web: {
    host: "172.30.1.11",
    port: 5173,
    commands: {
      dev: "vite --host",
      build: "vite build",
    },
  },
  permissions: [],
  outdir: "dist",
});
