/**
 * Telegram and our web chat render replies as PLAIN text, but LLMs love Markdown ("**Active**", "# Title", "`code`").
 * Instead of trusting the prompt alone, strip the markup in code so the user never sees stray symbols.
 * Keeps content, line breaks and links; turns list markers into "•".
 */
export function plainText(input: string): string {
  let s = input.replace(/\r\n/g, "\n");

  // fenced code blocks: keep the content, drop the fences and language tag
  s = s.replace(/```[a-zA-Z0-9_-]*\n?([\s\S]*?)```/g, "$1");
  // markdown links [label](url) -> label (url)
  s = s.replace(/\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)/g, "$1 ($2)");
  // headings and blockquotes at line start
  s = s.replace(/^[ \t]{0,3}#{1,6}[ \t]+/gm, "").replace(/^[ \t]{0,3}>[ \t]?/gm, "");
  // list markers: "* item" / "- item" / "+ item" -> "• item"
  s = s.replace(/^([ \t]*)[*+-][ \t]+/gm, "$1• ");
  // horizontal rules
  s = s.replace(/^[ \t]*([-*_])([ \t]*\1){2,}[ \t]*$/gm, "");
  // bold / italic / strike / inline code (content kept). Order matters: longest markers first.
  s = s.replace(/\*\*\*([^\n*]+?)\*\*\*/g, "$1").replace(/\*\*([^\n]+?)\*\*/g, "$1").replace(/__([^\n]+?)__/g, "$1");
  s = s.replace(/(^|[\s(])\*([^\s*][^\n*]*?)\*(?=$|[\s).,!?:;])/g, "$1$2");
  s = s.replace(/(^|[\s(])_([^\s_][^\n_]*?)_(?=$|[\s).,!?:;])/g, "$1$2");
  s = s.replace(/~~([^\n]+?)~~/g, "$1").replace(/`([^`\n]+)`/g, "$1");
  // any leftover stray double markers from broken formatting
  s = s.replace(/\*\*|__/g, "");

  return s.replace(/\n{3,}/g, "\n\n").trim();
}
