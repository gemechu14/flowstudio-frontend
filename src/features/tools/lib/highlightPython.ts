const PY_KEYWORDS = new Set(['def','class','return','import','from','if','else','elif','for','while','in','not','and','or','True','False','None','with','as','try','except','finally','raise','pass','break','continue','lambda','yield','async','await','is','global','nonlocal','del','assert'])
const PY_BUILTINS = new Set(['str','int','float','bool','list','dict','set','tuple','print','len','range','type','object','isinstance','hasattr','getattr','setattr','enumerate','zip','map','filter','sorted','reversed','any','all','min','max','sum','abs','round','open','super'])

function esc(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export function highlightPython(code: string): string {
  let out = ''
  let i = 0
  const n = code.length

  while (i < n) {
    // Comment — bright enough to read, muted enough to not distract
    if (code[i] === '#') {
      const end = code.indexOf('\n', i)
      const seg = end === -1 ? code.slice(i) : code.slice(i, end)
      out += `<span style="color:#6272a4;font-style:italic">${esc(seg)}</span>`
      i += seg.length
      continue
    }
    // Triple-quoted string
    if ((code[i] === '"' || code[i] === "'") && code.slice(i, i + 3) === code[i].repeat(3)) {
      const q = code[i].repeat(3)
      const end = code.indexOf(q, i + 3)
      const seg = end === -1 ? code.slice(i) : code.slice(i, end + 3)
      out += `<span style="color:#f1fa8c">${esc(seg)}</span>`
      i += seg.length
      continue
    }
    // Single-quoted string
    if (code[i] === '"' || code[i] === "'") {
      const q = code[i]; let j = i + 1
      while (j < n && code[j] !== q && code[j] !== '\n') { if (code[j] === '\\') j++; j++ }
      const seg = code.slice(i, Math.min(j + 1, n))
      out += `<span style="color:#f1fa8c">${esc(seg)}</span>`
      i = Math.min(j + 1, n)
      continue
    }
    // Decorator
    if (code[i] === '@') {
      let j = i + 1
      while (j < n && /[\w.]/.test(code[j])) j++
      out += `<span style="color:#ff79c6">${esc(code.slice(i, j))}</span>`
      i = j; continue
    }
    // Number
    if (/\d/.test(code[i]) && (i === 0 || !/\w/.test(code[i - 1]))) {
      let j = i
      while (j < n && /[\d._xXbBoOeEaAbBcCdDfF]/.test(code[j])) j++
      out += `<span style="color:#ffb86c">${esc(code.slice(i, j))}</span>`
      i = j; continue
    }
    // Word
    if (/[a-zA-Z_]/.test(code[i])) {
      let j = i
      while (j < n && /\w/.test(code[j])) j++
      const word = code.slice(i, j)
      const after = code[j]
      if (word === 'self' || word === 'cls') {
        out += `<span style="color:#ff79c6;font-style:italic">${word}</span>`
      } else if (PY_KEYWORDS.has(word)) {
        out += `<span style="color:#bd93f9;font-weight:700">${word}</span>`
      } else if (PY_BUILTINS.has(word)) {
        out += `<span style="color:#8be9fd">${word}</span>`
      } else if (after === '(') {
        out += `<span style="color:#50fa7b">${esc(word)}</span>`
      } else if (/^[A-Z]/.test(word)) {
        out += `<span style="color:#ffb86c">${esc(word)}</span>`
      } else {
        out += esc(word)
      }
      i = j; continue
    }
    // Operators
    if (/[+\-*/%=<>!&|^~]/.test(code[i])) {
      out += `<span style="color:#ff79c6">${esc(code[i])}</span>`
      i++; continue
    }
    // Brackets
    if (/[()[\]{}]/.test(code[i])) {
      const depth = '([{'.includes(code[i]) ? 0 : 1
      const colors = ['#f8f8f2', '#ff79c6', '#50fa7b']
      out += `<span style="color:${colors[depth % 3]}">${esc(code[i])}</span>`
      i++; continue
    }
    // Colon
    if (code[i] === ':') {
      out += `<span style="color:#ff79c6">:</span>`
      i++; continue
    }
    out += esc(code[i]); i++
  }
  return out
}
