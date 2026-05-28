import { useEffect, useState } from 'react'
import {
  HiOutlineClipboardDocumentCheck,
  HiOutlineCloudArrowUp,
  HiOutlineBanknotes,
  HiOutlineCube,
  HiOutlineArrowSmallRight,
  HiOutlineExclamationTriangle,
} from 'react-icons/hi2'
import { api } from '../api/client'
import Spinner from '../components/Spinner'
import ErrorMsg from '../components/ErrorMsg'
import Stepper from '../components/Stepper'

export default function Cierre({ fecha, onGuardado, esPasado }) {
  const [aperturaItems, setAperturaItems] = useState([]) // [{producto_id, nombre, marca, precio, cantidad}]
  const [restantes, setRestantes] = useState({})         // cuánto queda de cada uno
  const [loading, setLoading] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [confirmando, setConfirmando] = useState(false)
  const [error, setError] = useState(null)
  const [resumen, setResumen] = useState(null)

  useEffect(() => {
    api.getApertura(fecha)
      .then((data) => {
        const items = data.items ?? []
        setAperturaItems(items)
        // Stepper arranca en cantidad_total (apertura + reposiciones)
        const init = {}
        items.forEach((it) => { init[it.producto_id] = it.cantidad_total })
        setRestantes(init)
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [fecha])

  const gananciaTotal = aperturaItems.reduce((acc, it) => {
    const vendido = Math.max(0, it.cantidad_total - (restantes[it.producto_id] ?? 0))
    const subtotal = vendido * it.precio
    const costo = it.tipo === 'externo' ? vendido * (it.precio_compra ?? 0) : 0
    return acc + subtotal - costo
  }, 0)

  const costoTotal = aperturaItems.reduce((acc, it) => {
    const vendido = Math.max(0, it.cantidad_total - (restantes[it.producto_id] ?? 0))
    return acc + vendido * (it.precio_compra ?? 0)
  }, 0)

  const vendidoTotal = aperturaItems.reduce((acc, it) => {
    return acc + Math.max(0, it.cantidad_total - (restantes[it.producto_id] ?? 0))
  }, 0)

  const handleGuardar = async () => {
    setGuardando(true)
    setError(null)
    try {
      const items = aperturaItems.map((it) => ({
        producto_id: it.producto_id,
        cantidad: restantes[it.producto_id] ?? 0,
      }))
      const data = esPasado
        ? await api.guardarCierreFecha(fecha, items)
        : await api.guardarCierre(items)
      setResumen(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setGuardando(false)
    }
  }

  if (loading) return <Spinner />
  if (resumen) return <ResumenCierre resumen={resumen} onDone={onGuardado} />

  // Agrupar por marca para mostrar
  const porMarca = {}
  aperturaItems.forEach((it) => {
    if (!porMarca[it.marca]) porMarca[it.marca] = []
    porMarca[it.marca].push(it)
  })

  return (
    <div className="pb-40">
      {/* Header con ganancia en tiempo real */}
      <div className="bg-white border-b border-gray-100 px-4 pt-5 pb-4">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center flex-shrink-0">
            <HiOutlineClipboardDocumentCheck className="w-5 h-5 text-orange-500" />
          </div>
          <div>
            <h1 className="font-bold text-gray-900 text-lg leading-tight">Cierre del día</h1>
            <p className="text-xs text-gray-400 font-mono">{fecha}</p>
          </div>
        </div>
        <p className="text-sm text-gray-500 mt-2">
          Anotá <strong>cuánto te quedó</strong> de cada producto.
        </p>

        {/* Totales en tiempo real */}
        {aperturaItems.length > 0 && (
          <div className="mt-3 bg-gray-50 rounded-xl px-4 py-3 space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-gray-400">
                <HiOutlineCube className="w-4 h-4" />
                <span className="text-sm">{vendidoTotal} vendidos</span>
              </div>
              <span className="text-sm font-bold text-brand-600">Ganancia Bs {gananciaTotal.toFixed(2)}</span>
            </div>
            {costoTotal > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">Costos</span>
                <span className="text-xs text-red-400 font-medium">- Bs {costoTotal.toFixed(2)}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {error && <ErrorMsg mensaje={error} />}


      {aperturaItems.length === 0 && !loading && (
        <p className="text-center text-gray-400 text-sm py-16">No hay productos en la apertura.</p>
      )}

      {/* Lista por marca */}
      {Object.entries(porMarca).map(([marca, items]) => (
        <div key={marca} className="mt-4">
          <p className="section-title">{marca}</p>
          <div className="mx-4 space-y-2">
            {items.map((it) => {
              const restante = restantes[it.producto_id] ?? 0
              const vendido = Math.max(0, it.cantidad_total - restante)
              const subtotal = vendido * it.precio
              const hayVenta = vendido > 0
              const hayRepo = (it.cantidad_reposicion ?? 0) > 0

              return (
                <div
                  id={`producto-${it.producto_id}`}
                  key={it.producto_id}
                  className={`card px-4 py-4 transition-all ${
                    hayVenta ? 'border-green-100 bg-green-50/30' : ''
                  }`}
                >
                  {/* Fila nombre + stock disponible */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0 mr-2">
                      <p className="font-medium text-gray-900 text-sm truncate">{it.nombre}</p>
                      <p className="text-xs text-gray-400">Bs {it.precio.toFixed(2)} c/u</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      {hayRepo ? (
                        <>
                          <p className="text-[11px] text-gray-400">
                            {it.cantidad_apertura} + <span className="text-amber-500">{it.cantidad_reposicion} repuesto</span>
                          </p>
                          <p className="text-sm font-semibold text-gray-700">= {it.cantidad_total} disp.</p>
                        </>
                      ) : (
                        <>
                          <p className="text-[11px] text-gray-400">Disponible</p>
                          <p className="text-sm font-semibold text-gray-600">{it.cantidad_total}</p>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Fila stepper + resultado */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[11px] text-gray-400 mb-1">¿Cuánto queda?</p>
                      <Stepper
                        value={restante}
                        max={it.cantidad_total}
                        onChange={(v) =>
                          setRestantes((prev) => ({ ...prev, [it.producto_id]: v }))
                        }
                      />
                    </div>

                    {/* Resultado */}
                    <div className={`text-right transition-opacity ${hayVenta ? 'opacity-100' : 'opacity-0'}`}>
                      <p className="text-[11px] text-gray-400">Vendiste</p>
                      <p className="text-sm font-bold text-gray-800">{vendido} unid.</p>
                      <p className="text-sm font-bold text-brand-600">Bs {subtotal.toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}

      {/* Botón guardar */}
      <div className="fixed bottom-16 inset-x-0 px-4 py-3 bg-white border-t border-gray-100">
        <div className="flex items-center justify-between mb-2 px-1">
          <span className="text-xs text-gray-400">Ganancia del día</span>
          <span className="text-base font-bold text-brand-600">Bs {gananciaTotal.toFixed(2)}</span>
        </div>
        <button
          className="btn-primary flex items-center justify-center gap-2"
          onClick={() => setConfirmando(true)}
          disabled={guardando}
        >
          {guardando
            ? <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Calculando…</>
            : <><HiOutlineCloudArrowUp className="w-5 h-5" /> Guardar cierre</>
          }
        </button>
      </div>

      {/* Modal de confirmación */}
      {confirmando && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end" onClick={() => setConfirmando(false)}>
          <div className="bg-white w-full rounded-t-2xl p-5 pb-24" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center flex-shrink-0">
                <HiOutlineExclamationTriangle className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <p className="font-bold text-gray-900">¿Cerrar el día?</p>
                <p className="text-xs text-gray-400 mt-0.5">Esta acción no se puede deshacer</p>
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl px-4 py-3 mb-5 flex justify-between items-center">
              <span className="text-sm text-gray-500">Ganancia calculada</span>
              <span className="text-lg font-bold text-brand-600">Bs {gananciaTotal.toFixed(2)}</span>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setConfirmando(false)}
                className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-semibold text-sm active:bg-gray-50"
              >
                Revisar
              </button>
              <button
                onClick={() => { setConfirmando(false); handleGuardar() }}
                className="flex-1 py-3 rounded-xl bg-brand-600 text-white font-semibold text-sm active:bg-brand-700"
              >
                Sí, cerrar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

function ResumenCierre({ resumen, onDone }) {
  const itemsConVenta = resumen.items.filter((i) => i.vendido > 0)

  return (
    <div className="pb-28">
      <div className="sticky top-0 bg-white border-b border-gray-100 px-4 py-3 z-20">
        <h1 className="font-bold text-gray-900">Resumen del día</h1>
        <p className="text-[11px] text-gray-400 font-mono">{resumen.fecha}</p>
      </div>

      <div className="mx-4 mt-4 card divide-y divide-gray-100">
        <div className="flex items-center gap-3 px-4 py-3">
          <HiOutlineCube className="w-5 h-5 text-gray-300 flex-shrink-0" />
          <span className="text-sm text-gray-500 flex-1">Total vendido</span>
          <span className="font-bold text-gray-900">{resumen.total_vendido} unid.</span>
        </div>
        {resumen.costo_total > 0 && (
          <>
            <div className="flex items-center gap-3 px-4 py-3">
              <HiOutlineBanknotes className="w-5 h-5 text-gray-300 flex-shrink-0" />
              <span className="text-sm text-gray-500 flex-1">Ingresos por ventas</span>
              <span className="font-bold text-gray-700">Bs {resumen.ingresos.toFixed(2)}</span>
            </div>
            <div className="flex items-center gap-3 px-4 py-3">
              <HiOutlineBanknotes className="w-5 h-5 text-red-300 flex-shrink-0" />
              <span className="text-sm text-gray-500 flex-1">Costos</span>
              <span className="font-bold text-red-400">- Bs {resumen.costo_total.toFixed(2)}</span>
            </div>
          </>
        )}
        <div className="flex items-center gap-3 px-4 py-3">
          <HiOutlineBanknotes className="w-5 h-5 text-brand-400 flex-shrink-0" />
          <span className="text-sm text-gray-500 flex-1">Ganancia neta</span>
          <span className="text-lg font-bold text-brand-600">Bs {resumen.ganancia_total.toFixed(2)}</span>
        </div>
      </div>

      {itemsConVenta.length > 0 && (
        <>
          <p className="section-title">Detalle</p>
          <div className="card mx-4 divide-y divide-gray-100">
            {itemsConVenta.map((item) => (
              <div key={item.producto_id} className="px-4 py-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{item.nombre}</p>
                  <p className="text-xs text-gray-400">{item.marca}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold text-gray-900">Bs {item.subtotal.toFixed(2)}</p>
                  <p className="text-xs text-gray-400">{item.vendido} vendidos</p>
                </div>
              </div>
            ))}
          </div>

          <p className="section-title">Apertura → Cierre</p>
          <div className="card mx-4 divide-y divide-gray-100 mb-4">
            {resumen.items.map((item) => (
              <div key={item.producto_id} className="px-4 py-2.5 flex items-center gap-2">
                <p className="text-sm text-gray-700 flex-1 truncate">{item.nombre}</p>
                <div className="flex items-center gap-1.5 text-xs flex-shrink-0">
                  <span className="bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-medium">{item.apertura}</span>
                  <HiOutlineArrowSmallRight className="w-3 h-3 text-gray-300" />
                  <span className="bg-orange-50 text-orange-600 px-1.5 py-0.5 rounded font-medium">{item.cierre}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="fixed bottom-16 inset-x-0 px-4 py-3 bg-white border-t border-gray-100">
        <button className="btn-secondary" onClick={onDone}>Listo</button>
      </div>
    </div>
  )
}
