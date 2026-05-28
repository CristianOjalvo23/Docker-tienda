import { useEffect, useState } from 'react'
import {
  HiBuildingStorefront,
  HiOutlineArrowPath,
  HiOutlineClipboardDocumentCheck,
  HiOutlineChevronRight,
  HiOutlineExclamationTriangle,
} from 'react-icons/hi2'

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
function formatFecha(fecha) {
  const [y, m, d] = fecha.split('-')
  return `${d} ${MESES[parseInt(m, 10) - 1]} ${y}`
}
import { api } from '../api/client'
import Spinner from '../components/Spinner'
import ErrorMsg from '../components/ErrorMsg'
import Apertura from './Apertura'
import Cierre from './Cierre'
import Reposicion from './Reposicion'

export default function Hoy() {
  const [estado, setEstado] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [vista, setVista] = useState(null) // null | 'cierre' | 'reposicion'

  const cargar = () => {
    setLoading(true)
    setError(null)
    setVista(null)
    api.getEstadoHoy()
      .then(setEstado)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(cargar, [])

  if (loading) return <Spinner />
  if (error) return <ErrorMsg mensaje={error} onRetry={cargar} />

  // Día anterior sin cerrar → hay que cerrarlo antes de abrir el nuevo
  if (estado.dia_pendiente && !estado.tiene_apertura) {
    if (vista === 'cierre-pendiente') {
      return <Cierre fecha={estado.dia_pendiente} esPasado onGuardado={cargar} />
    }
    return (
      <div className="flex flex-col items-center justify-center px-6 py-16 text-center gap-5">
        <div className="w-20 h-20 rounded-full bg-orange-50 flex items-center justify-center">
          <HiOutlineExclamationTriangle className="w-10 h-10 text-orange-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-1">Día sin cerrar</h2>
          <p className="text-gray-400 text-sm">El día <span className="font-semibold text-gray-600">{formatFecha(estado.dia_pendiente)}</span> quedó abierto.</p>
          <p className="text-gray-400 text-sm mt-1">Cerralo para poder abrir el día de hoy.</p>
        </div>
        <button
          onClick={() => setVista('cierre-pendiente')}
          className="btn-primary mt-2"
        >
          Cerrar día {formatFecha(estado.dia_pendiente)}
        </button>
      </div>
    )
  }

  // Sin apertura → formulario de apertura
  if (!estado.tiene_apertura) {
    return <Apertura fecha={estado.fecha} onGuardado={cargar} />
  }

  // Subvistas dentro del hub
  if (vista === 'cierre') return <Cierre fecha={estado.fecha} onGuardado={cargar} />
  if (vista === 'reposicion') return <Reposicion fecha={estado.fecha} onGuardado={cargar} />

  // Día completado
  if (estado.tiene_cierre) {
    return (
      <div className="flex flex-col items-center justify-center px-6 py-16 text-center gap-4">
        <div className="w-20 h-20 rounded-full bg-brand-100 flex items-center justify-center">
          <HiBuildingStorefront className="w-10 h-10 text-brand-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-1">Día completado</h2>
          <p className="text-gray-400 text-sm">Apertura y cierre registrados</p>
        </div>
        <p className="text-xs text-gray-300 font-mono">{estado.fecha}</p>
      </div>
    )
  }

  // Hub — apertura hecha, esperando cierre
  return (
    <div className="pb-20">
      <div className="bg-white border-b border-gray-100 px-4 pt-5 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center">
            <HiBuildingStorefront className="w-5 h-5 text-brand-600" />
          </div>
          <div>
            <h1 className="font-bold text-gray-900 text-lg leading-tight">Día en curso</h1>
            <p className="text-xs text-gray-400 font-mono">{estado.fecha}</p>
          </div>
        </div>
      </div>

      <div className="mx-4 mt-5 space-y-3">
        {/* Reponer stock */}
        <button
          onClick={() => setVista('reposicion')}
          className="w-full card px-4 py-4 flex items-center gap-4 active:bg-gray-50 transition-colors text-left"
        >
          <div className="w-11 h-11 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
            <HiOutlineArrowPath className="w-6 h-6 text-amber-500" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-gray-900">Reponer stock</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {estado.n_reposiciones > 0
                ? `${estado.n_reposiciones} reposición${estado.n_reposiciones > 1 ? 'es' : ''} hoy`
                : 'Registrar mercadería que llegó durante el día'}
            </p>
          </div>
          <HiOutlineChevronRight className="w-5 h-5 text-gray-300 flex-shrink-0" />
        </button>

        {/* Cerrar el día */}
        <button
          onClick={() => setVista('cierre')}
          className="w-full card px-4 py-4 flex items-center gap-4 active:bg-gray-50 transition-colors text-left border-brand-100"
        >
          <div className="w-11 h-11 rounded-xl bg-orange-50 flex items-center justify-center flex-shrink-0">
            <HiOutlineClipboardDocumentCheck className="w-6 h-6 text-orange-500" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-gray-900">Cerrar el día</p>
            <p className="text-xs text-gray-400 mt-0.5">Registrar el stock que quedó al final</p>
          </div>
          <HiOutlineChevronRight className="w-5 h-5 text-gray-300 flex-shrink-0" />
        </button>
      </div>

      {estado.n_reposiciones > 0 && (
        <p className="text-center text-xs text-gray-300 mt-8">
          Las reposiciones ya están sumadas al stock del día
        </p>
      )}
    </div>
  )
}
