import { useEffect, useState } from 'react'
import { HiOutlineArrowPath, HiOutlineCloudArrowUp, HiOutlineChevronLeft } from 'react-icons/hi2'
import { api } from '../api/client'
import Spinner from '../components/Spinner'
import ErrorMsg from '../components/ErrorMsg'
import Stepper from '../components/Stepper'

export default function Reposicion({ fecha, onGuardado }) {
  const [grupos, setGrupos] = useState([])
  const [agregados, setAgregados] = useState({})
  const [loading, setLoading] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    api.getProductos()
      .then((g) => setGrupos(g ?? []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const totalUnidades = Object.values(agregados).reduce((s, v) => s + v, 0)
  const hayAlgo = totalUnidades > 0

  const handleGuardar = async () => {
    if (!hayAlgo) return
    setGuardando(true)
    setError(null)
    try {
      const items = grupos.flatMap((g) =>
        g.productos.map((p) => ({
          producto_id: p.id,
          cantidad: agregados[p.id] ?? 0,
        }))
      )
      await api.guardarReposicion(items)
      onGuardado()
    } catch (e) {
      setError(e.message)
    } finally {
      setGuardando(false)
    }
  }

  if (loading) return <Spinner />

  return (
    <div className="pb-36">
      <div className="bg-white border-b border-gray-100 px-4 pt-4 pb-4">
        <button
          onClick={onGuardado}
          className="flex items-center gap-1 text-brand-600 text-sm font-medium mb-3 -ml-1"
        >
          <HiOutlineChevronLeft className="w-4 h-4" /> Volver
        </button>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
            <HiOutlineArrowPath className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <h1 className="font-bold text-gray-900 text-lg leading-tight">Reponer stock</h1>
            <p className="text-xs text-gray-400 font-mono">{fecha}</p>
          </div>
        </div>
        <p className="text-sm text-gray-500 mt-2">
          Anotá <strong>cuánto llegó</strong> de cada producto. Solo lo que entró ahora.
        </p>
      </div>

      {error && <ErrorMsg mensaje={error} />}

      {grupos.map((grupo) => (
        <div key={grupo.id} className="mt-4">
          <p className="section-title">{grupo.nombre}</p>
          <div className="mx-4 space-y-2">
            {grupo.productos.map((p) => {
              const qty = agregados[p.id] ?? 0
              return (
                <div
                  key={p.id}
                  className={`card px-4 py-4 flex items-center gap-4 transition-all ${
                    qty > 0 ? 'border-amber-100 bg-amber-50/30' : ''
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-sm truncate">{p.nombre}</p>
                    <p className="text-xs text-gray-400">Bs {p.precio.toFixed(2)} c/u</p>
                  </div>
                  <Stepper
                    value={qty}
                    onChange={(v) => setAgregados((prev) => ({ ...prev, [p.id]: v }))}
                  />
                </div>
              )
            })}
          </div>
        </div>
      ))}

      <div className="fixed bottom-16 inset-x-0 px-4 py-3 bg-white border-t border-gray-100">
        {hayAlgo && (
          <p className="text-center text-xs text-gray-400 mb-2">
            {totalUnidades} unidad{totalUnidades !== 1 ? 'es' : ''} a reponer
          </p>
        )}
        <button
          className="btn-primary flex items-center justify-center gap-2"
          onClick={handleGuardar}
          disabled={guardando || !hayAlgo}
        >
          {guardando
            ? <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Guardando…</>
            : <><HiOutlineCloudArrowUp className="w-5 h-5" /> Guardar reposición</>
          }
        </button>
      </div>
    </div>
  )
}
