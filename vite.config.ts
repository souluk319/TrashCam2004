import { defineConfig } from "vite";

const tunnelAllowedHosts = [".trycloudflare.com"];
const base = process.env.VITE_BASE_PATH ?? "/";

export default defineConfig({
  base,
  server: {
    allowedHosts: tunnelAllowedHosts,
  },
  preview: {
    allowedHosts: tunnelAllowedHosts,
  },
});
