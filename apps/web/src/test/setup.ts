import { vi } from "vitest";

// Enable React 19 act environment
(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// Mock ObjectURL methods in jsdom if missing
if (typeof URL.createObjectURL === "undefined") {
  URL.createObjectURL = vi.fn((_blob: Blob) => "blob:mock-uuid-" + Math.random().toString(36).substring(2, 9));
}

if (typeof URL.revokeObjectURL === "undefined") {
  URL.revokeObjectURL = vi.fn();
}
