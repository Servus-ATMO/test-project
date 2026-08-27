import { unified } from 'unified'
import remarkParse from 'remark-parse'
import { toString as mdastToString } from 'mdast-util-to-string'
import type { Root, RootContent, PhrasingContent, ListItem, List } from 'mdast'

// Nutzt einen echten Markdown-Parser (remark/unified, siehe PROJ-3 Tech
// Design), um den Quelltext zuverlaessig in Bloecke/Inline-Knoten zu zerlegen
// - robuster gegen kleinere Formatabweichungen im KI-generierten Text als
// reine Regex-Auswertung (z. B. andere Aufzaehlungszeichen, zusaetzliche
// Leerzeichen, Soft-Breaks). Das Ergebnis wird zurueck in das kanonische
// Zeilenformat serialisiert, das parse-utils.ts erwartet - die dortige,
// bereits getestete Feld-/Abschnitts-Logik bleibt dadurch unveraendert
// wiederverwendbar, nur die Tokenisierung wird durch die AST ersetzt.

function inlineToText(nodes: PhrasingContent[]): string {
  return nodes.map(inlineNodeToText).join('')
}

function inlineNodeToText(node: PhrasingContent): string {
  switch (node.type) {
    case 'strong':
      return `**${inlineToText(node.children)}**`
    case 'emphasis':
      return `*${inlineToText(node.children)}*`
    case 'inlineCode':
      return `\`${node.value}\``
    case 'break':
      return '\n'
    case 'text':
      return node.value
    default:
      return mdastToString(node)
  }
}

function listItemText(item: ListItem): string {
  return item.children
    .map((child) => (child.type === 'paragraph' ? inlineToText(child.children) : mdastToString(child)))
    .join(' ')
}

function listToLines(node: List): string[] {
  return node.children.map((item, i) => {
    const prefix = node.ordered ? `${(node.start ?? 1) + i}. ` : '- '
    return prefix + listItemText(item)
  })
}

function blockToLines(node: RootContent): string[] {
  switch (node.type) {
    case 'heading':
      return ['#'.repeat(node.depth) + ' ' + mdastToString(node)]
    case 'paragraph':
      return inlineToText(node.children).split('\n')
    case 'thematicBreak':
      return ['---']
    case 'list':
      return listToLines(node)
    default:
      return [mdastToString(node)]
  }
}

export function normalizeMarkdown(text: string): string {
  const tree = unified().use(remarkParse).parse(text) as Root
  const lines: string[] = []
  for (const node of tree.children) {
    lines.push(...blockToLines(node))
    lines.push('')
  }
  return lines.join('\n')
}
