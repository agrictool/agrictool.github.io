import { } from 'react'
import type { Question, QuestionnaireSchema } from '../../types'
import type { UserProfile } from '../../types'

interface FormEngineProps {
  schema: QuestionnaireSchema
  answers: Record<string, unknown>
  onChange: (questionId: string, value: unknown) => void
  profile: UserProfile
  readonly?: boolean
}

// ── Individual question renderers ─────────────────────────────────────────────

function ReadonlyField({ question, profile }: { question: Question; profile: UserProfile }) {
  const value = question.prefillFrom ? String(profile[question.prefillFrom] ?? '') : ''
  return (
    <div className="bg-[#F9FBF9] border border-[#DDE3E7] rounded-lg px-4 py-3">
      <p className="text-xs text-[#5A6472] mb-1">{question.text}</p>
      <p className="text-sm font-medium text-[#12304A]">{value || '—'}</p>
    </div>
  )
}

function SingleSelect({ question, value, onChange, readonly }: {
  question: Question; value: string; onChange: (v: string) => void; readonly?: boolean
}) {
  return (
    <div className="space-y-2" role="radiogroup" aria-labelledby={`q-${question.id}-label`}>
      {question.options?.map(opt => (
        <label
          key={opt.value}
          className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors
            ${value === opt.value
              ? 'bg-[#E8F5E9] border-[#2E7D32]'
              : 'bg-white border-[#DDE3E7] hover:border-[#2E7D32]/50'}
            ${readonly ? 'cursor-default pointer-events-none' : ''}`}
        >
          <input
            type="radio"
            name={question.id}
            value={opt.value}
            checked={value === opt.value}
            onChange={() => onChange(opt.value)}
            disabled={readonly}
            className="mt-0.5 w-4 h-4 text-[#2E7D32] border-gray-300 focus:ring-[#2E7D32]"
          />
          <span className="text-sm text-[#374151]">{opt.label}</span>
        </label>
      ))}
    </div>
  )
}

function MultiSelect({ question, value, onChange, readonly }: {
  question: Question; value: string[]; onChange: (v: string[]) => void; readonly?: boolean
}) {
  const handleToggle = (optValue: string) => {
    if (readonly) return
    if (value.includes(optValue)) {
      onChange(value.filter(v => v !== optValue))
    } else {
      if (question.maxSelections && value.length >= question.maxSelections) return
      onChange([...value, optValue])
    }
  }
  const atMax = question.maxSelections ? value.length >= question.maxSelections : false

  return (
    <div className="space-y-2">
      {question.maxSelections && (
        <p className="text-xs text-[#5A6472]">
          Select up to {question.maxSelections}.{' '}
          {value.length > 0 && <span className="text-[#2E7D32]">{value.length} selected.</span>}
        </p>
      )}
      {question.options?.map(opt => {
        const checked = value.includes(opt.value)
        const disabled = readonly || (atMax && !checked)
        return (
          <label
            key={opt.value}
            className={`flex items-start gap-3 p-3 rounded-lg border transition-colors
              ${checked ? 'bg-[#E8F5E9] border-[#2E7D32]' : 'bg-white border-[#DDE3E7]'}
              ${disabled ? 'opacity-50 cursor-default' : 'cursor-pointer hover:border-[#2E7D32]/50'}`}
          >
            <input
              type="checkbox"
              value={opt.value}
              checked={checked}
              onChange={() => handleToggle(opt.value)}
              disabled={disabled}
              className="mt-0.5 w-4 h-4 rounded text-[#2E7D32] border-gray-300 focus:ring-[#2E7D32]"
            />
            <span className="text-sm text-[#374151]">{opt.label}</span>
          </label>
        )
      })}
    </div>
  )
}

function MatrixQuestion({ question, value, onChange, readonly }: {
  question: Question
  value: Record<string, string>
  onChange: (v: Record<string, string>) => void
  readonly?: boolean
}) {
  const rows = question.matrixRows ?? []
  const scale = question.matrixScale ?? []

  const handleCell = (rowId: string, scaleValue: string) => {
    if (readonly) return
    onChange({ ...value, [rowId]: scaleValue })
  }

  return (
    <div className="overflow-x-auto -mx-1">
      <table className="min-w-full text-sm border-collapse">
        <thead>
          <tr>
            <th className="text-left py-2 px-3 text-xs font-semibold text-[#12304A] min-w-[160px]">Tool</th>
            {scale.map(s => (
              <th key={s.value} className="px-2 py-2 text-center text-xs font-medium text-[#5A6472] min-w-[90px] leading-tight">
                {s.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.id} className={i % 2 === 0 ? 'bg-white' : 'bg-[#F9FBF9]'}>
              <td className="py-2.5 px-3 text-sm text-[#374151] font-medium">{row.label}</td>
              {scale.map(s => (
                <td key={s.value} className="py-2.5 px-2 text-center">
                  <input
                    type="radio"
                    name={`${question.id}_${row.id}`}
                    value={s.value}
                    checked={value[row.id] === s.value}
                    onChange={() => handleCell(row.id, s.value)}
                    disabled={readonly}
                    aria-label={`${row.label}: ${s.label}`}
                    className="w-4 h-4 text-[#2E7D32] border-gray-300 focus:ring-[#2E7D32]"
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function TextInput({ question, value, onChange, readonly }: {
  question: Question; value: string; onChange: (v: string) => void; readonly?: boolean
}) {
  const len = value.length
  const limit = question.charLimit
  return (
    <div>
      {question.type === 'paragraph' ? (
        <textarea
          value={value}
          onChange={e => onChange(e.target.value.slice(0, limit))}
          disabled={readonly}
          rows={4}
          maxLength={limit}
          className="w-full border border-[#DDE3E7] rounded-lg px-3 py-2 text-sm resize-y
            focus:outline-none focus:ring-1 focus:ring-[#2E7D32] focus:border-[#2E7D32]
            disabled:bg-[#F9FBF9] disabled:cursor-default"
          placeholder="Type your response here…"
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value.slice(0, limit))}
          disabled={readonly}
          maxLength={limit}
          className="w-full border border-[#DDE3E7] rounded-lg px-3 py-2 text-sm
            focus:outline-none focus:ring-1 focus:ring-[#2E7D32] focus:border-[#2E7D32]
            disabled:bg-[#F9FBF9] disabled:cursor-default"
          placeholder="Type your response here…"
        />
      )}
      {limit && (
        <p className="text-right text-xs text-[#5A6472] mt-1">{len} / {limit}</p>
      )}
    </div>
  )
}

// ── Question wrapper ──────────────────────────────────────────────────────────

function QuestionBlock({ question, answers, onChange, profile, readonly }: {
  question: Question
  answers: Record<string, unknown>
  onChange: (id: string, val: unknown) => void
  profile: UserProfile
  readonly?: boolean
}) {
  if (question.type === 'readonly') {
    return <ReadonlyField question={question} profile={profile} />
  }

  const raw = answers[question.id]

  return (
    <div>
      <p id={`q-${question.id}-label`} className="text-sm font-medium text-[#12304A] mb-3 leading-relaxed">
        {question.text}
        {question.required && <span className="text-[#C62828] ml-1" aria-hidden="true">*</span>}
      </p>

      {question.adminReviewNote && (
        <div className="mb-3 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded p-2">
          {question.adminReviewNote}
        </div>
      )}

      {question.type === 'single-select' && (
        <SingleSelect
          question={question}
          value={typeof raw === 'string' ? raw : ''}
          onChange={v => onChange(question.id, v)}
          readonly={readonly}
        />
      )}
      {question.type === 'multi-select' && (
        <MultiSelect
          question={question}
          value={Array.isArray(raw) ? (raw as string[]) : []}
          onChange={v => onChange(question.id, v)}
          readonly={readonly}
        />
      )}
      {question.type === 'matrix' && (
        <MatrixQuestion
          question={question}
          value={typeof raw === 'object' && raw !== null && !Array.isArray(raw)
            ? (raw as Record<string, string>) : {}}
          onChange={v => onChange(question.id, v)}
          readonly={readonly}
        />
      )}
      {(question.type === 'text' || question.type === 'paragraph') && (
        <TextInput
          question={question}
          value={typeof raw === 'string' ? raw : ''}
          onChange={v => onChange(question.id, v)}
          readonly={readonly}
        />
      )}
    </div>
  )
}

// ── Main Form Engine ──────────────────────────────────────────────────────────

export default function FormEngine({ schema, answers, onChange, profile, readonly }: FormEngineProps) {
  // Group questions by section
  const sections: { key: string; title: string; questions: Question[] }[] = []
  for (const q of schema.questions) {
    const existing = sections.find(s => s.key === q.section)
    if (existing) {
      existing.questions.push(q)
    } else {
      sections.push({ key: q.section, title: q.sectionTitle, questions: [q] })
    }
  }

  return (
    <div className="space-y-10">
      {sections.map(section => (
        <section key={section.key} aria-labelledby={`section-${section.key}`}>
          <div className="border-b-2 border-[#2E7D32] pb-2 mb-6">
            <h2 id={`section-${section.key}`} className="text-base font-bold text-[#12304A]">
              {section.title}
            </h2>
          </div>
          <div className="space-y-8">
            {section.questions.map(q => (
              <QuestionBlock
                key={q.id}
                question={q}
                answers={answers}
                onChange={onChange}
                profile={profile}
                readonly={readonly}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
