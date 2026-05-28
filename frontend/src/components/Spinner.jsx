export default function Spinner({ text = 'Cargando…' }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-400">
      <div className="w-8 h-8 border-4 border-gray-200 border-t-brand-500 rounded-full animate-spin" />
      <p className="text-sm">{text}</p>
    </div>
  )
}
