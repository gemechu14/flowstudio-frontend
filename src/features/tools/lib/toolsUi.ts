import type { ToolStatus } from '../api/tools.api'

export const ANTHROPIC_MODELS = [
  { id: 'claude-sonnet-5', label: 'Claude Sonnet 5' },
  { id: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6' },
  { id: 'claude-opus-4-8', label: 'Claude Opus 4.8' },
  { id: 'claude-haiku-4-5', label: 'Claude Haiku 4.5' },
  { id: 'claude-fable-5', label: 'Claude Fable 5' },
]

export const OPENAI_MODELS = [
  { id: 'gpt-4.1', label: 'GPT-4.1' },
  { id: 'gpt-4.1-mini', label: 'GPT-4.1 mini' },
  { id: 'gpt-4o', label: 'GPT-4o' },
  { id: 'gpt-4o-mini', label: 'GPT-4o mini' },
]

export const MONO = { fontFamily: 'var(--font-mono)' } as const
export const SANS = { fontFamily: 'var(--font-sans)' } as const

export const STATUS_COLOR: Record<ToolStatus, string> = {
  pending: 'var(--text-tertiary)',
  approved: 'var(--accent)',
  rejected: 'var(--text-tertiary)',
}

export const TAB_LABELS: { key: ToolStatus | 'all'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending Review' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
]

export const fmt = (iso: string) => {
  try {
    return new Date(iso).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return '—'
  }
}

export const IDE = {
  bg: '#282a36',
  gutter: '#21222c',
  lineNum: '#6272a4',
  text: '#f8f8f2',
  border: '#44475a',
  cursor: '#f8f8f2',
  inputBg: '#21222c',
  inputBdr: '#6272a4',
} as const

export const TOOL_TEMPLATE = "from agentcore.object_model.tool import Tool, Parameter\n\n\nclass MyTool(Tool):\n    def __init__(self):\n        super().__init__(\n            # 'name' is how agents call this tool — use snake_case, no spaces\n            name=\"my_tool\",\n            # 'description' is shown to the LLM — be specific so it knows when to use this tool\n            description=\"Describe exactly what this tool does and when to use it\",\n            parameters=[\n                # Required parameter — type can be \"string\", \"integer\", \"number\", \"boolean\"\n                Parameter(name=\"input\", type=\"string\", description=\"The input text to process\"),\n                # Optional parameter example (not listed in 'required' below)\n                # Parameter(name=\"max_results\", type=\"integer\", description=\"Max items to return (default: 10)\"),\n            ],\n            # List only the parameter names that are mandatory\n            required={\"input\"},\n        )\n\n    def run(self, **kwargs) -> str:\n        input_text = kwargs.get(\"input\", \"\")\n        # max_results = int(kwargs.get(\"max_results\", 10))\n\n        # Your logic here — return a plain string the LLM can read\n        return f\"Result: {input_text}\"\n"

export interface EditMode {
  tool_id: string
  display_name: string
  initial_code: string
  initial_requirements: string
}
