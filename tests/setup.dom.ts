import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";

// Component tests opt in to jsdom with `// @vitest-environment jsdom`; the
// DB tests stay on node, where there is nothing to clean up.
if (typeof document !== "undefined") {
  const { cleanup } = await import("@testing-library/react");
  afterEach(cleanup);
}
