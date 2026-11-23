/**
 * Sanitizes transformed FatturaPA HTML to prevent XSS / code execution.
 * Enforces SECURITY.md §2:
 * Strips <script>, <iframe>, <object>, <embed>, <meta http-equiv>, on* attributes, and javascript: URLs.
 */
export function sanitizeFatturaHtml(rawHtml: string): string {
  if (!rawHtml) return "";

  // 1. Regex pre-strip for dangerous tags and unclosed tags
  let cleaned = rawHtml
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<script\b[^>]*>/gi, "")
    .replace(/<\/script>/gi, "")
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "")
    .replace(/<iframe\b[^>]*>/gi, "")
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, "")
    .replace(/<embed\b[^>]*>/gi, "")
    .replace(/<meta\b[^>]*http-equiv[^>]*>/gi, "");

  // 2. DOM-based deep sanitization
  if (typeof DOMParser !== "undefined") {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(cleaned, "text/html");

      const dangerousTags = ["script", "iframe", "object", "embed", "meta", "base", "applet"];
      for (const tag of dangerousTags) {
        const elements = doc.querySelectorAll(tag);
        elements.forEach((el) => el.remove());
      }

      // Clean all elements and attributes
      const allElements = doc.querySelectorAll("*");
      allElements.forEach((el) => {
        // Inspect attributes
        const attrsToRemove: string[] = [];
        for (let i = 0; i < el.attributes.length; i++) {
          const attr = el.attributes[i];
          if (!attr) continue;
          const name = attr.name.toLowerCase();
          const value = attr.value.trim().toLowerCase();

          // Strip event handlers (e.g. onerror, onclick, onload, onmouseover)
          if (name.startsWith("on")) {
            attrsToRemove.push(attr.name);
            continue;
          }

          // Strip javascript: / data:text/html URIs in href, src, formaction, etc.
          if (["href", "src", "action", "formaction", "data", "poster"].includes(name)) {
            const normalizedVal = value.replace(/[\s\x00-\x1F]/g, "");
            if (
              normalizedVal.startsWith("javascript:") ||
              normalizedVal.startsWith("data:text/html") ||
              normalizedVal.startsWith("vbscript:")
            ) {
              attrsToRemove.push(attr.name);
            }
          }
        }

        for (const attrName of attrsToRemove) {
          el.removeAttribute(attrName);
        }
      });

      return doc.documentElement ? doc.documentElement.outerHTML : doc.body.innerHTML;
    } catch {
      // Fallback regex if DOMParser fails
    }
  }

  // 3. Fallback regex post-strip
  cleaned = cleaned
    .replace(/\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/\s+(?:href|src)\s*=\s*(?:"javascript:[^"]*"|'javascript:[^']*'|javascript:[^\s>]+)/gi, "");

  return cleaned;
}
