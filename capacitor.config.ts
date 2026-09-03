import type { CapacitorConfig } from "@capacitor/cli";

// Only the resident + collector apps ship native. The authority dashboard
// stays web-only (see CLAUDE.md → Mobile packaging).
// `webDir` MUST match the Next static-export output dir or the app is blank.
const config: CapacitorConfig = {
  appId: "com.dementa.nomowaste",
  appName: "Nomo Waste",
  webDir: "out",
};

export default config;
