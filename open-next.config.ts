import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// Defaults are right for this site: every page is static, so no incremental cache or queue is needed.
export default defineCloudflareConfig();
