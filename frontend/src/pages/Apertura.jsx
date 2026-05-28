import { useEffect, useState } from 'react'
import { HiOutlineArchiveBoxArrowDown, HiOutlineCloudArrowUp } from 'react-icons/hi2'
import { api } from '../api/client'
import Spinner from '../components/Spinner'
import ErrorMsg from '../components/ErrorMsg'
import Stepper from '../components/Stepper'

export default function Apertura({ fecha, onGuardado }) {
  const [grupos, setGrupos] = useState([])
  const [cantidades, setCantidades] = useState({})
  const [loading, setLoading] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    api.getProductos()
      .then((g) => setGrupos(g ?? []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const totalProductos = grupos.reduce((acc, g) => acc + g.productos.length, 0)
  const completados = Object.values(cantidades).filter((v) => v > 0).length

  const handleGuardar = async () => {
    setGuardando(true)
    setError(null)
    try {
      const items = grupos.flatMap((g) =>
        g.productos.map((p) => ({ producto_id: p.id, cantidad: cantidades[p.id] ?? 0 }))
      )
      await api.guardarApertura(items)
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
      <div className="bg-white border-b border-gray-100 px-4 pt-5 pb-4">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
            <HiOutlineArchiveBoxArrowDown className="w-5 h-5 text-blue-500" />
          </div>
          <div>
            <h1 className="font-bold text-gray-900 text-lg leading-tight">Apertura del día</h1>
            <p className="text-xs text-gray-400 font-mono">{fecha}</p>
          </div>
        </div>
        <p className="text-sm text-gray-500 mt-2">
          Anotá <strong>cuánto tenés</strong> de cada producto ahora mismo.
        </p>

        {totalProductos > 0 && (
          <div className="mt-3">
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>{completados} de {totalProductos} cargados</span>
              <span>{Math.round((completados / totalProductos) * 100)}%</span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-400 rounded-full transition-all duration-300"
                style={{ width: `${(completados / totalProductos) * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {error && <ErrorMsg mensaje={error} />}

      {grupos.length === 0 && (
        <p className="text-center text-gray-400 text-sm py-16">No hay productos activos.</p>
      )}

      {grupos.map((grupo) => (
        <div key={grupo.id} className="mt-4">
          <p className="section-title">{grupo.nombre}</p>
          <div className="mx-4 space-y-2">
            {grupo.productos.map((p) => {
              const qty = cantidades[p.id] ?? 0
              return (
                <div
                  id={`producto-${p.id}`}
                  key={p.id}
                  className={`card px-4 py-4 transition-all ${
                    qty > 0 ? 'border-blue-100 bg-blue-50/30' : ''
                  }`}
                >
                  <div className="flex items-center gap-4 mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 text-sm truncate">{p.nombre}</p>
                      <p className="text-xs text-gray-400">Bs {p.precio.toFixed(2)} c/u</p>
                    </div>
                    <Stepper
                      value={qty}
                      max={p.stock ?? undefined}
                      onChange={(v) => setCantidades((prev) => ({ ...prev, [p.id]: v }))}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">Stock disponible</span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      (p.stock ?? 0) < 10
                        ? 'bg-red-50 text-red-500'
                        : 'bg-green-50 text-green-600'
                    }`}>
                      {p.stock ?? 0} unid.
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}

      <div className="fixed bottom-16 inset-x-0 px-4 py-3 bg-white border-t border-gray-100">
        <button
          className="btn-primary flex items-center justify-center gap-2"
          onClick={handleGuardar}
          disabled={guardando}
        >
          {guardando
            ? <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Guardando…</>
            : <><HiOutlineCloudArrowUp className="w-5 h-5" /> Guardar apertura</>
          }
        </button>
      </div>
    </div>
  )
}
