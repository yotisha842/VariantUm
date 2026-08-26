import katex from 'katex';
import 'katex/dist/katex.min.css';

/** KaTeX output is safe HTML; failed formulas must stay escaped plain text. */
export function renderMathHtml(text: string, display = false): string {
  try { return katex.renderToString(text, { displayMode: display, throwOnError: false, strict: false }); }
  catch {
    return text.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);
  }
}
