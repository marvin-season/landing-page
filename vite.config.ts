import { lingui } from "@lingui/vite-plugin";
import react from "@vitejs/plugin-react";
import vinext from "vinext";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: ["@lingui/babel-plugin-lingui-macro"],
      },
    }),
    lingui(),
    vinext(),
  ],
});
