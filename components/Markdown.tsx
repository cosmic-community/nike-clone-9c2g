'use client'

import React from 'react'

/**
 * Minimal, dependency-free markdown renderer scoped to chat bubbles.
 *
 * Supports: headings, bold, italic, inline code, fenced code blocks, links,
 * images, ordered/unordered lists, blockquotes, tables and horizontal rules.
 *
 * It never injects raw HTML (no dangerouslySetInnerHTML) and only allows
 * http(s), mailto, relative and hash hrefs, so agent output cannot smuggle
 * script URLs into the page.
 */

function safeHref(raw: string): string | null {
  const href = raw.trim()
  if (/^(https?:\/\/|mailto:|\/|#)/i.test(href)) return href
  return null
}

/**
 * Image sources are stricter than link hrefs: no mailto, no hash. Only remote
 * http(s), protocol-relative and site-relative paths are allowed, which keeps
 * `javascript:` and `data:` payloads out of the DOM.
 */
function safeSrc(raw: string): string | null {
  const src = raw.trim()
  if (/^(https?:\/\/|\/\/|\/)/i.test(src)) return src
  return null
}

const IMAGE_LINE_RE = /^\s*!\[[^\]\n]*\]\([^)\s]+\)\s*$/
const IMAGE_TOKEN_RE = /!\[([^\]\n]*)\]\(([^)\s]+)\)/

/**
 * Renders a single markdown image. Agent replies can reference media that has
 * moved or 404s, so a failed load collapses the element rather than leaving a
 * broken-image icon in the middle of the conversation.
 */
function MarkdownImage({
  src,
  alt,
  block,
}: {
  src: string
  alt: string
  block?: boolean
}) {
  const [failed, setFailed] = React.useState(false)

  if (failed) return null

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      className={
        block
          ? 'h-auto w-full rounded-lg border border-black/10 bg-black/5 object-cover'
          : 'my-1 inline-block h-auto max-w-full rounded-md border border-black/10 align-middle'
      }
    />
  )
}

const INLINE_RE =
  /(!\[[^\]\n]*\]\([^)\s]+\))|(`[^`\n]+`)|(\*\*[^*\n]+\*\*)|(__[^_\n]+__)|(\*[^*\n]+\*)|(\[[^\]\n]*\]\([^)\s]+\))/g

function renderInline(text: string, keyPrefix: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = []
  let lastIndex = 0
  let counter = 0
  let match: RegExpExecArray | null

  INLINE_RE.lastIndex = 0

  while ((match = INLINE_RE.exec(text)) !== null) {
    const token = match[0]

    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index))
    }

    const key = `${keyPrefix}-i${counter++}`

    if (token.startsWith('![')) {
      const parts = IMAGE_TOKEN_RE.exec(token)
      const alt = parts?.[1] ?? ''
      const src = safeSrc(parts?.[2] ?? '')

      if (src) {
        nodes.push(<MarkdownImage key={key} src={src} alt={alt} />)
      } else if (alt) {
        nodes.push(alt)
      }
    } else if (token.startsWith('`')) {
      nodes.push(
        <code
          key={key}
          className="rounded bg-black/10 px-1 py-0.5 font-mono text-[0.85em]"
        >
          {token.slice(1, -1)}
        </code>
      )
    } else if (token.startsWith('**') || token.startsWith('__')) {
      nodes.push(
        <strong key={key} className="font-semibold">
          {token.slice(2, -2)}
        </strong>
      )
    } else if (token.startsWith('*')) {
      nodes.push(<em key={key}>{token.slice(1, -1)}</em>)
    } else {
      const split = token.indexOf('](')
      const label = token.slice(1, split)
      const href = safeHref(token.slice(split + 2, -1))

      if (href) {
        nodes.push(
          <a
            key={key}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium underline underline-offset-2 hover:no-underline"
          >
            {label || href}
          </a>
        )
      } else {
        nodes.push(label)
      }
    }

    lastIndex = match.index + token.length
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex))
  }

  return nodes
}

function isTableSeparator(line: string): boolean {
  return line.includes('|') && line.includes('-') && /^[\s|:-]+$/.test(line)
}

function splitRow(row: string): string[] {
  return row
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim())
}

function isBlockStart(line: string): boolean {
  return (
    line.trim() === '' ||
    /^\s*(#{1,6}\s|>|[-*+]\s|\d+[.)]\s|```)/.test(line) ||
    IMAGE_LINE_RE.test(line) ||
    line.trim().startsWith('|')
  )
}

function parseBlocks(source: string): React.ReactNode[] {
  const lines = source.replace(/\r\n/g, '\n').split('\n')
  const out: React.ReactNode[] = []
  let i = 0
  let key = 0

  while (i < lines.length) {
    const line = lines[i] ?? ''

    // Fenced code block
    if (line.trim().startsWith('```')) {
      const code: string[] = []
      i++
      while (i < lines.length && !(lines[i] ?? '').trim().startsWith('```')) {
        code.push(lines[i] ?? '')
        i++
      }
      i++ // consume closing fence
      out.push(
        <pre
          key={`b${key++}`}
          className="my-2 overflow-x-auto rounded-lg bg-black/85 p-3 text-[0.75rem] leading-relaxed text-white"
        >
          <code>{code.join('\n')}</code>
        </pre>
      )
      continue
    }

    // Blank line
    if (line.trim() === '') {
      i++
      continue
    }

    // Standalone image(s). Consecutive image-only lines are grouped so a
    // product carousel from the agent reads as a gallery, not a stack.
    if (IMAGE_LINE_RE.test(line)) {
      const images: { src: string; alt: string }[] = []

      while (i < lines.length && IMAGE_LINE_RE.test(lines[i] ?? '')) {
        const parts = IMAGE_TOKEN_RE.exec(lines[i] ?? '')
        const src = safeSrc(parts?.[2] ?? '')
        if (src) images.push({ src, alt: parts?.[1] ?? '' })
        i++
      }

      if (images.length > 0) {
        const k = key++
        out.push(
          <div
            key={`b${k}`}
            className={
              images.length > 1
                ? 'my-2 grid grid-cols-2 gap-2'
                : 'my-2 block'
            }
          >
            {images.map((image, index) => (
              <MarkdownImage
                key={index}
                src={image.src}
                alt={image.alt}
                block
              />
            ))}
          </div>
        )
      }
      continue
    }

    // Horizontal rule
    if (/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
      out.push(<hr key={`b${key++}`} className="my-3 border-black/10" />)
      i++
      continue
    }

    // Heading
    const heading = /^(#{1,6})\s+(.*)$/.exec(line)
    if (heading) {
      const level = (heading[1] ?? '#').length
      const text = heading[2] ?? ''
      const k = key++
      const className =
        level <= 2
          ? 'mt-3 mb-1 text-sm font-bold uppercase tracking-wide first:mt-0'
          : 'mt-2 mb-1 text-[0.8rem] font-bold first:mt-0'

      if (level <= 2) {
        out.push(
          <h4 key={`b${k}`} className={className}>
            {renderInline(text, `b${k}`)}
          </h4>
        )
      } else {
        out.push(
          <h5 key={`b${k}`} className={className}>
            {renderInline(text, `b${k}`)}
          </h5>
        )
      }
      i++
      continue
    }

    // Table
    if (line.trim().startsWith('|') && isTableSeparator(lines[i + 1] ?? '')) {
      const header = splitRow(line)
      i += 2
      const rows: string[][] = []
      while (i < lines.length && (lines[i] ?? '').trim().startsWith('|')) {
        rows.push(splitRow(lines[i] ?? ''))
        i++
      }
      const k = key++
      out.push(
        <div key={`b${k}`} className="my-2 overflow-x-auto">
          <table className="w-full border-collapse text-left text-[0.75rem]">
            <thead>
              <tr>
                {header.map((cell, index) => (
                  <th
                    key={index}
                    className="border-b border-black/20 px-2 py-1 font-semibold"
                  >
                    {renderInline(cell, `b${k}-h${index}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {row.map((cell, cellIndex) => (
                    <td
                      key={cellIndex}
                      className="border-b border-black/10 px-2 py-1 align-top"
                    >
                      {renderInline(cell, `b${k}-r${rowIndex}c${cellIndex}`)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
      continue
    }

    // Blockquote
    if (/^\s*>/.test(line)) {
      const quoted: string[] = []
      while (i < lines.length && /^\s*>/.test(lines[i] ?? '')) {
        quoted.push((lines[i] ?? '').replace(/^\s*>\s?/, ''))
        i++
      }
      const k = key++
      out.push(
        <blockquote
          key={`b${k}`}
          className="my-2 border-l-2 border-black/25 pl-3 italic text-black/70"
        >
          {renderInline(quoted.join(' '), `b${k}`)}
        </blockquote>
      )
      continue
    }

    // Unordered list
    if (/^\s*[-*+]\s+/.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i] ?? '')) {
        items.push((lines[i] ?? '').replace(/^\s*[-*+]\s+/, ''))
        i++
      }
      const k = key++
      out.push(
        <ul key={`b${k}`} className="my-2 list-disc space-y-1 pl-5">
          {items.map((item, index) => (
            <li key={index}>{renderInline(item, `b${k}-l${index}`)}</li>
          ))}
        </ul>
      )
      continue
    }

    // Ordered list
    if (/^\s*\d+[.)]\s+/.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i] ?? '')) {
        items.push((lines[i] ?? '').replace(/^\s*\d+[.)]\s+/, ''))
        i++
      }
      const k = key++
      out.push(
        <ol key={`b${k}`} className="my-2 list-decimal space-y-1 pl-5">
          {items.map((item, index) => (
            <li key={index}>{renderInline(item, `b${k}-o${index}`)}</li>
          ))}
        </ol>
      )
      continue
    }

    // Paragraph
    const paragraph: string[] = [line]
    i++
    while (i < lines.length && !isBlockStart(lines[i] ?? '')) {
      paragraph.push(lines[i] ?? '')
      i++
    }
    const k = key++
    out.push(
      <p key={`b${k}`} className="my-1.5 first:mt-0 last:mb-0">
        {renderInline(paragraph.join(' '), `b${k}`)}
      </p>
    )
  }

  return out
}

export interface MarkdownProps {
  content: string
  className?: string
}

export default function Markdown({ content, className }: MarkdownProps) {
  return <div className={className}>{parseBlocks(content)}</div>
}
