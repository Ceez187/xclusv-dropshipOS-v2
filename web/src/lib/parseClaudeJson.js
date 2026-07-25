// Claude sometimes wraps requested JSON in ```json fences despite
// instructions not to — strip them before parsing, and fall back to the raw
// text if parsing still fails so the UI can show something instead of
// crashing. Shared by every module that asks Claude for structured output.
export function parseClaudeJson(contentBlocks) {
  const text = (contentBlocks ?? [])
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('\n')
    .trim()

  const stripped = text.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim()

  try {
    return { data: JSON.parse(stripped), raw: text }
  } catch {
    return { data: null, raw: text }
  }
}
