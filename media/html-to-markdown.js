"use strict";
var NoteMD = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if ((from && typeof from === "object") || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, {
            get: () => from[key],
            enumerable:
              !(desc = __getOwnPropDesc(from, key)) || desc.enumerable,
          });
    }
    return to;
  };
  var __toCommonJS = (mod) =>
    __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // lib/note/htmlToMarkdown.client.ts
  var htmlToMarkdown_client_exports = {};
  __export(htmlToMarkdown_client_exports, {
    htmlToMarkdown: () => htmlToMarkdown,
  });
  function htmlToMarkdown(html) {
    if (!html || typeof html !== "string") return "";
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    const body = doc.body;
    function processNode(node) {
      if (node.nodeType === Node.TEXT_NODE) {
        return node.textContent ?? "";
      }
      if (node.nodeType !== Node.ELEMENT_NODE) return "";
      const el = node;
      const tag = el.tagName.toLowerCase();
      const children = () =>
        Array.from(el.childNodes).map(processNode).join("");
      if (["script", "style", "header", "button", "svg"].includes(tag)) {
        return "";
      }
      const dataType = el.getAttribute("data-type");
      if (dataType === "block-math") {
        const latex = el.getAttribute("data-latex") ?? "";
        return `

$$${latex}$$

`;
      }
      if (dataType === "inline-math") {
        const latex = el.getAttribute("data-latex") ?? "";
        return `$${latex}$`;
      }
      const headingMatch = tag.match(/^h([1-6])$/);
      if (headingMatch) {
        const level = parseInt(headingMatch[1], 10);
        const text = children().trim();
        return `

${"#".repeat(level)} ${text}

`;
      }
      if (tag === "img") {
        const src = el.getAttribute("src") ?? "";
        const alt = el.getAttribute("alt") ?? "";
        return src
          ? `

![${alt}](${src})

`
          : "";
      }
      if (tag === "hr") return "\n\n---\n\n";
      if (tag === "strong" || tag === "b") {
        return `**${children().trim()}**`;
      }
      if (tag === "em" || tag === "i") {
        return `*${children().trim()}*`;
      }
      if (tag === "table") {
        const rows = Array.from(el.querySelectorAll("tr"));
        if (!rows.length) return "";
        const lines = [];
        rows.forEach((row, i) => {
          const cells = Array.from(row.querySelectorAll("th, td")).map((cell) =>
            (cell.textContent?.trim() ?? "").replace(/\|/g, "\\|"),
          );
          if (!cells.length) return;
          lines.push(`| ${cells.join(" | ")} |`);
          if (i === 0) {
            lines.push(`| ${cells.map(() => "---").join(" | ")} |`);
          }
        });
        return lines.length
          ? `

${lines.join("\n")}

`
          : "";
      }
      if (tag === "pre") {
        const codeEl = el.querySelector("code");
        const code = (codeEl ?? el).textContent ?? "";
        const cls =
          codeEl?.getAttribute("class") ?? el.getAttribute("class") ?? "";
        const langMatch = cls.match(/language-(\w+)/);
        const lang = langMatch ? langMatch[1] : "";
        return `

\`\`\`${lang}
${code.trim()}
\`\`\`

`;
      }
      if (tag === "code") {
        if (el.closest("pre")) return el.textContent ?? "";
        return `\`${el.textContent}\``;
      }
      if (tag === "ul") {
        const items = Array.from(el.querySelectorAll(":scope > li"))
          .map((li) => `* ${li.textContent?.trim()}`)
          .join("\n");
        return `

${items}

`;
      }
      if (tag === "ol") {
        const items = Array.from(el.querySelectorAll(":scope > li"))
          .map((li, i) => `${i + 1}. ${li.textContent?.trim()}`)
          .join("\n");
        return `

${items}

`;
      }
      if (tag === "blockquote") {
        const inner = children().trim();
        const lines = inner
          .split("\n")
          .map((l) => `> ${l}`)
          .join("\n");
        return `

${lines}

`;
      }
      if (tag === "a") {
        const href = el.getAttribute("href") ?? "";
        const text = el.textContent?.trim() ?? "";
        return href ? `[${text}](${href})` : text;
      }
      if (tag === "p") {
        const inner = children().trim();
        return inner
          ? `

${inner}

`
          : "";
      }
      if (tag === "br") return "\n";
      return children();
    }
    let md = processNode(body);
    md = md.replace(/\n{3,}/g, "\n\n").trim();
    return md;
  }
  return __toCommonJS(htmlToMarkdown_client_exports);
})();
