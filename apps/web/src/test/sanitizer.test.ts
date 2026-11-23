import { describe, it, expect } from "vitest";
import { sanitizeFatturaHtml } from "../services/sanitizer";

describe("FatturaPA HTML Sanitizer (SECURITY.md §2)", () => {
  it("strips script tags and their content from fatturapa_xss_attack payload", () => {
    const rawAttackHtml = `
      <div class="dati-beni-servizi">
        <span class="descrizione">Consulenza <script>alert(1)</script><img src=x onerror=alert(2)></span>
      </div>
    `;

    const sanitized = sanitizeFatturaHtml(rawAttackHtml);

    expect(sanitized).not.toContain("<script>");
    expect(sanitized).not.toContain("alert(1)");
    expect(sanitized).not.toContain("onerror");
    expect(sanitized).not.toContain("alert(2)");
    expect(sanitized).toContain("Consulenza");
  });

  it("strips malicious iframes, objects, embeds, and javascript: URLs", () => {
    const maliciousHtml = `
      <div>
        <iframe src="https://evil.com"></iframe>
        <object data="evil.swf"></object>
        <embed src="evil.swf">
        <a href="javascript:alert('pwned')">Link</a>
        <a href="   javascript:alert('spaces')">Link 2</a>
        <form formaction="javascript:alert(3)"><button>Click</button></form>
        <img src="valid.png" onload="alert('loaded')" />
        <button onclick="stealTokens()">Button</button>
      </div>
    `;

    const sanitized = sanitizeFatturaHtml(maliciousHtml);

    expect(sanitized).not.toContain("<iframe");
    expect(sanitized).not.toContain("<object");
    expect(sanitized).not.toContain("<embed");
    expect(sanitized).not.toContain("javascript:");
    expect(sanitized).not.toContain("stealTokens");
    expect(sanitized).not.toContain("onload");
    expect(sanitized).not.toContain("onclick");
  });
});
