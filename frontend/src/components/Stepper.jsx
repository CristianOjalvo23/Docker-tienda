import { useState } from 'react'
import { HiMinus, HiPlus } from 'react-icons/hi2'

export default function Stepper({ value, onChange, max }) {
  const [editando, setEditando] = useState(false)
  const [draft, setDraft] = useState('')

  const set = (n) => {
    const v = Math.max(0, max !== undefined ? Math.min(n, max) : n)
    onChange(v)
  }

  if (editando) {
    const draftNum = parseFloat(draft)
    const excede = max !== undefined && !isNaN(draftNum) && draftNum > max
    return (
      <div className="flex flex-col items-center gap-0.5">
        <input
          type="number"
          className={`w-20 text-center text-lg font-bold border-b-2 bg-transparent outline-none py-1 ${
            excede ? 'border-red-400 text-red-500' : 'border-brand-500'
          }`}
          value={draft}
          autoFocus
          inputMode="decimal"
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => {
            const v = parseFloat(draft)
            if (!isNaN(v)) set(v)
            setEditando(false)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.target.blur()
          }}
        />
        {max !== undefined && (
          <span className={`text-[10px] font-medium ${excede ? 'text-red-400' : 'text-gray-400'}`}>
            {excede ? `máx ${max}` : `/ ${max}`}
          </span>
        )}
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => set(value - 1)}
        disabled={value <= 0}
        className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 active:bg-gray-200 disabled:opacity-30 transition-colors"
      >
        <HiMinus className="w-4 h-4" />
      </button>

      <button
        onClick={() => { setDraft(String(value)); setEditando(true) }}
        className="w-14 text-center text-xl font-bold text-gray-900 py-1 rounded-lg active:bg-gray-50"
      >
        {value % 1 === 0 ? value : value.toFixed(1)}
      </button>

      <button
        onClick={() => set(value + 1)}
        disabled={max !== undefined && value >= max}
        className="w-9 h-9 flex items-center justify-center rounded-full bg-brand-600 text-white active:bg-brand-700 disabled:opacity-30 transition-colors"
      >
        <HiPlus className="w-4 h-4" />
      </button>
    </div>
  )
}
