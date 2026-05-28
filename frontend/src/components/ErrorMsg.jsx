import { HiOutlineExclamationCircle } from 'react-icons/hi2'

export default function ErrorMsg({ mensaje, onRetry }) {
  return (
    <div className="mx-4 mt-6 p-4 bg-red-50 border border-red-200 rounded-xl">
      <div className="flex gap-3 items-start">
        <HiOutlineExclamationCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-red-600 text-sm">{mensaje}</p>
          {onRetry && (
            <button onClick={onRetry} className="text-sm text-red-600 font-semibold underline mt-2">
              Reintentar
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
