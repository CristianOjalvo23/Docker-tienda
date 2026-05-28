import { useEffect, useState } from 'react'
import {
  HiOutlineChevronLeft,
  HiOutlineChevronRight,
  HiOutlineBanknotes,
  HiOutlineCube,
  HiOutlineArrowSmallRight,
  HiOutlineCalendarDays,
} from 'react-icons/hi2'
import { api } from '../api/client'
import Spinner from '../components/Spinner'
import ErrorMsg from '../components/ErrorMsg'

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

function formatFecha(fecha) {
  const [y, m, d] = fecha.split('-')
  return `${d} ${MESES[parseInt(m, 10) - 1]} ${y}`
}

export default function Historial() {
  const [historial, setHistorial] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [detalle, setDetalle] = useState(null)

  const cargar = () => {
    setLoading(true)
    api.getHistorial()
      .then((h) => setHistorial(h ?? []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(cargar, [])

  if (detalle) return <DetalleDia fecha={detalle} onBack={() => setDetalle(null)} />

  return (
    <div className="pb-20">
      <div className="sticky top-0 bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-2.5 z-20">
        <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center">
          <HiOutlineCalendarDays className="w-4.5 h-4.5 text-violet-500" />
        </div>
        <h1 className="font-bold text-gray-900">Historial</h1>
      </div>

      {loading && <Spinner />}
      {error && <ErrorMsg mensaje={error} onRetry={cargar} />}

      {!loading && historial.length === 0 && (
        <div className="flex flex-col items-center py-20 gap-3 text-gray-300">
          <HiOutlineCalendarDays className="w-12 h-12" />
          <p className="text-sm text-gray-400">Sin registros aún</p>
        </div>
      )}

      {!loading && historial.length > 0 && (
        <>
          <p className="section-title">{historial.length} {historial.length === 1 ? 'día registrado' : 'días registrados'}</p>
          <div className="card mx-4 divide-y divide-gray-100">
            {historial.map((entry) => (
              <button
                key={entry.fecha}
                onClick={() => setDetalle(entry.fecha)}
                className="w-full flex items-center px-4 py-4 gap-3 active:bg-gray-50 transition-colors text-left"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800">{formatFecha(entry.fecha)}</p>
                  <p className="text-xs text-gray-400">{entry.total_vendido} unidades vendidas</p>
                </div>
                <p className="text-base font-bold text-brand-600 flex-shrink-0">
                  Bs {entry.ganancia_total.toFixed(2)}
                </p>
                <HiOutlineChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function DetalleDia({ fecha, onBack }) {
  const [resumen, setResumen] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    api.getResumen(fecha)
      .then(setResumen)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [fecha])

  return (
    <div className="pb-20">
      <div className="sticky top-0 bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3 z-20">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-brand-600 font-medium text-sm -ml-1 py-1 pr-2"
        >
          <HiOutlineChevronLeft className="w-4 h-4" />
          Volver
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="font-bold text-gray-900 truncate">{formatFecha(fecha)}</h1>
        </div>
      </div>

      {loading && <Spinner />}
      {error && <ErrorMsg mensaje={error} />}

      {resumen && (
        <>
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
                  <span className="text-sm text-gray-500 flex-1">Ingresos</span>
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

          {resumen.items.filter((i) => i.vendido > 0).length > 0 && (
            <>
              <p className="section-title">Vendido</p>
              <div className="card mx-4 divide-y divide-gray-100">
                {resumen.items
                  .filter((i) => i.vendido > 0)
                  .map((item) => (
                    <div key={item.producto_id} className="px-4 py-3 flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{item.nombre}</p>
                        <p className="text-xs text-gray-400">{item.marca} · {item.vendido} vendidos</p>
                        {item.costo > 0 && (
                          <p className="text-xs text-red-400">Costo - Bs {item.costo.toFixed(2)}</p>
                        )}
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className="text-xs text-gray-400">Stock:</span>
                          <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${
                            (item.stock ?? 0) < 10 ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-600'
                          }`}>
                            {item.stock ?? 0} unid.{(item.stock ?? 0) < 10 ? ' ⚠' : ''}
                          </span>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-semibold text-brand-600">Bs {item.ganancia.toFixed(2)}</p>
                        {item.costo > 0 && (
                          <p className="text-xs text-gray-400">de Bs {item.subtotal.toFixed(2)}</p>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </>
          )}

          <p className="section-title">Detalle por producto</p>
          <div className="mx-4 space-y-2 mb-4">
            {resumen.items.map((item) => (
              <div key={item.producto_id} className="card px-4 py-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-gray-800 truncate flex-1 mr-2">{item.nombre}</p>
                  <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                    (item.stock ?? 0) < 10 ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-600'
                  }`}>Stock {item.stock ?? 0}{(item.stock ?? 0) < 10 ? ' ⚠' : ''}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-blue-50 rounded-lg py-1.5">
                    <p className="text-[10px] text-blue-400 font-medium">Disponible</p>
                    <p className="text-sm font-bold text-blue-600">{item.apertura}</p>
                  </div>
                  <div className="bg-orange-50 rounded-lg py-1.5">
                    <p className="text-[10px] text-orange-400 font-medium">Restante</p>
                    <p className="text-sm font-bold text-orange-500">{item.cierre}</p>
                  </div>
                  <div className={`rounded-lg py-1.5 ${item.vendido > 0 ? 'bg-brand-50' : 'bg-gray-50'}`}>
                    <p className={`text-[10px] font-medium ${item.vendido > 0 ? 'text-brand-400' : 'text-gray-400'}`}>Vendido</p>
                    <p className={`text-sm font-bold ${item.vendido > 0 ? 'text-brand-600' : 'text-gray-400'}`}>{item.vendido}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
