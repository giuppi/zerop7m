import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("Content Security Policy (SECURITY.md §2)", () => {
  it("enforces strict connect-src 'none' in index.html to guarantee zero data exfiltration", () => {
    const indexPath = path.resolve(__dirname, "../../index.html");
    const html = fs.readFileSync(indexPath, "utf-8");

    const cspMatch = html.match(/<meta\s+http-equiv=["']Content-Security-Policy["']\s+content="([^"]*)"/i);
    expect(cspMatch).not.toBeNull();
    const csp = cspMatch![1];

    expect(csp).toContain("connect-src 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("frame-src 'self' blob:");
  });
});
