import { useEffect, useState } from 'react'
import {
  HiOutlinePencilSquare,
  HiOutlineArchiveBoxXMark,
  HiOutlineXMark,
  HiOutlineRectangleStack,
  HiOutlineCheckCircle,
  HiPlus,
} from 'react-icons/hi2'
import { api } from '../api/client'
import Spinner from '../components/Spinner'
import ErrorMsg from '../components/ErrorMsg'

export default function Productos() {
  const [grupos, setGrupos] = useState([])
  const [marcas, setMarcas] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [modal, setModal] = useState(null)

  const cargar = () => {
    setLoading(true)
    Promise.all([api.getProductos(), api.getMarcas()])
      .then(([g, m]) => { setGrupos(g ?? []); setMarcas(m ?? []) })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(cargar, [])

  return (
    <div className="pb-28">
      <div className="sticky top-0 bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-2.5 z-20">
        <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center">
          <HiOutlineRectangleStack className="w-4.5 h-4.5 text-slate-500" />
        </div>
        <h1 className="font-bold text-gray-900 flex-1">Productos</h1>
        <button
          onClick={() => setModal('nueva-marca')}
          className="flex items-center gap-1 text-xs bg-gray-100 text-gray-600 px-3 py-1.5 rounded-lg font-medium active:bg-gray-200"
        >
          <HiPlus className="w-3.5 h-3.5" /> Marca
        </button>
        <button
          onClick={() => setModal('nuevo-producto')}
          className="flex items-center gap-1 text-xs bg-brand-600 text-white px-3 py-1.5 rounded-lg font-medium active:bg-brand-700"
        >
          <HiPlus className="w-3.5 h-3.5" /> Producto
        </button>
      </div>

      {error && <ErrorMsg mensaje={error} onRetry={cargar} />}

      {loading ? <Spinner /> : (
        <>
          {grupos.length === 0 && (
            <div className="flex flex-col items-center py-20 gap-3 text-gray-300">
              <HiOutlineRectangleStack className="w-12 h-12" />
              <p className="text-sm text-gray-400">Agrega una marca y luego un producto.</p>
            </div>
          )}
          {grupos.map((grupo) => (
            <div key={grupo.id} className="mb-2">
              <p className="section-title">{grupo.nombre}</p>
              <div className="card mx-4 divide-y divide-gray-100">
                {grupo.productos.map((p) => (
                  <FilaProducto key={p.id} producto={p} onActualizado={cargar} />
                ))}
              </div>
            </div>
          ))}
        </>
      )}

      {modal === 'nuevo-producto' && (
        <ModalNuevoProducto marcas={marcas} onClose={() => setModal(null)} onCreado={cargar} />
      )}
      {modal === 'nueva-marca' && (
        <ModalNuevaMarca onClose={() => setModal(null)} onCreada={cargar} />
      )}
    </div>
  )
}

function FilaProducto({ producto, onActualizado }) {
  const [editando, setEditando] = useState(false)
  const [precio, setPrecio] = useState(producto.precio)
  const [precioCompra, setPrecioCompra] = useState(producto.precio_compra ?? 0)
  const [stock, setStock] = useState(producto.stock ?? 0)
  const [nombre, setNombre] = useState(producto.nombre)
  const [tipo, setTipo] = useState(producto.tipo || 'externo')
  const [guardando, setGuardando] = useState(false)

  const guardar = async () => {
    setGuardando(true)
    try {
      await api.editarProducto(producto.id, {
        nombre,
        precio: Number(precio),
        precio_compra: Number(precioCompra),
        stock: Number(stock),
        tipo,
      })
      onActualizado()
      setEditando(false)
    } catch {
      setNombre(producto.nombre)
      setPrecio(producto.precio)
      setPrecioCompra(producto.precio_compra ?? 0)
      setStock(producto.stock ?? 0)
      setTipo(producto.tipo || 'externo')
    } finally {
      setGuardando(false)
    }
  }

  const desactivar = async () => {
    if (!confirm(`¿Desactivar "${producto.nombre}"?`)) return
    await api.desactivarProducto(producto.id)
    onActualizado()
  }

  return (
    <div className="px-4 py-3">
      {editando ? (
        <div className="space-y-2">
          <input
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            autoFocus
          />
          {/* Toggle tipo */}
          <div className="flex rounded-lg overflow-hidden border border-gray-200 text-xs font-medium">
            <button
              onClick={() => setTipo('externo')}
              className={`flex-1 py-2 transition-colors ${tipo === 'externo' ? 'bg-blue-50 text-blue-600' : 'text-gray-400'}`}
            >Externo</button>
            <button
              onClick={() => setTipo('interno')}
              className={`flex-1 py-2 transition-colors ${tipo === 'interno' ? 'bg-violet-50 text-violet-600' : 'text-gray-400'}`}
            >Hecho por mí</button>
          </div>
          <div className="flex gap-2 items-center">
            <span className="text-xs text-gray-400 whitespace-nowrap">
              {tipo === 'externo' ? 'Costo Bs' : 'Fab. Bs'}
            </span>
            <input
              type="number" min="0" step="0.5" inputMode="decimal"
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500"
              value={precioCompra}
              onChange={(e) => setPrecioCompra(e.target.value)}
            />
          </div>
          <div className="flex gap-2 items-center">
            <span className="text-xs text-gray-400 whitespace-nowrap">Venta Bs</span>
            <input
              type="number" min="0" step="0.5" inputMode="decimal"
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500"
              value={precio}
              onChange={(e) => setPrecio(e.target.value)}
            />
          </div>
          <div className="flex gap-2 items-center">
            <span className="text-xs text-gray-400 whitespace-nowrap">Stock</span>
            <input
              type="number" min="0" step="1" inputMode="numeric"
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500"
              value={stock}
              onChange={(e) => setStock(e.target.value)}
            />
            <button
              onClick={guardar}
              disabled={guardando}
              className="flex items-center gap-1 bg-brand-600 text-white text-sm px-3 py-2 rounded-lg font-medium"
            >
              <HiOutlineCheckCircle className="w-4 h-4" />
              {guardando ? '…' : 'OK'}
            </button>
            <button onClick={() => setEditando(false)} className="p-2 text-gray-400">
              <HiOutlineXMark className="w-5 h-5" />
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <p className="text-sm font-medium text-gray-800 truncate">{producto.nombre}</p>
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium flex-shrink-0 ${
                producto.tipo === 'interno'
                  ? 'bg-violet-50 text-violet-500'
                  : 'bg-blue-50 text-blue-500'
              }`}>
                {producto.tipo === 'interno' ? 'Hecho por mí' : 'Externo'}
              </span>
            </div>
            <p className="text-xs text-gray-400">
              {producto.tipo === 'externo' ? 'Costo' : 'Fab.'} Bs {(producto.precio_compra ?? 0).toFixed(2)} · Venta Bs {producto.precio.toFixed(2)}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-xs text-gray-400">Stock</span>
              <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${
                (producto.stock ?? 0) < 10
                  ? 'bg-red-50 text-red-500'
                  : 'bg-green-50 text-green-600'
              }`}>
                {producto.stock ?? 0} unid.{(producto.stock ?? 0) < 10 ? ' ⚠' : ''}
              </span>
            </div>
          </div>
          <button
            onClick={() => setEditando(true)}
            className="p-2 text-gray-400 active:text-brand-600 transition-colors"
            title="Editar"
          >
            <HiOutlinePencilSquare className="w-4.5 h-4.5" />
          </button>
          <button
            onClick={desactivar}
            className="p-2 text-gray-400 active:text-red-500 transition-colors"
            title="Desactivar"
          >
            <HiOutlineArchiveBoxXMark className="w-4.5 h-4.5" />
          </button>
        </div>
      )}
    </div>
  )
}

function ModalNuevoProducto({ marcas, onClose, onCreado }) {
  const [nombre, setNombre] = useState('')
  const [marcaId, setMarcaId] = useState(marcas[0]?.id ?? '')
  const [precio, setPrecio] = useState('')
  const [precioCompra, setPrecioCompra] = useState('')
  const [stock, setStock] = useState('')
  const [tipo, setTipo] = useState('externo')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState(null)

  if (marcas.length === 0) {
    return (
      <ModalBase titulo="Nuevo producto" onClose={onClose}>
        <div className="flex flex-col items-center py-4 gap-3 text-center">
          <HiOutlineRectangleStack className="w-10 h-10 text-gray-300" />
          <p className="text-sm text-gray-500">
            Primero crea al menos una <strong>marca</strong> usando el botón + Marca.
          </p>
        </div>
      </ModalBase>
    )
  }

  const crear = async () => {
    if (!nombre.trim() || !marcaId || !precio) return
    setGuardando(true)
    setError(null)
    try {
      await api.crearProducto({
        nombre: nombre.trim(),
        marca_id: marcaId,
        precio: Number(precio),
        precio_compra: Number(precioCompra),
        stock: Number(stock),
        tipo,
      })
      onCreado()
      onClose()
    } catch (e) {
      setError(e.message)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <ModalBase titulo="Nuevo producto" onClose={onClose}>
      <div className="space-y-3">
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <div>
          <label className="text-xs text-gray-500 font-medium">Nombre</label>
          <input
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:border-brand-500"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Nombre del producto"
            autoFocus
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 font-medium">Marca</label>
          <select
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1 bg-white focus:outline-none focus:border-brand-500"
            value={marcaId}
            onChange={(e) => setMarcaId(e.target.value)}
          >
            {marcas.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500 font-medium mb-1 block">Tipo</label>
          <div className="flex rounded-lg overflow-hidden border border-gray-200 text-sm font-medium">
            <button
              onClick={() => setTipo('externo')}
              className={`flex-1 py-2.5 transition-colors ${tipo === 'externo' ? 'bg-blue-50 text-blue-600' : 'text-gray-400'}`}
            >Externo (comprado)</button>
            <button
              onClick={() => setTipo('interno')}
              className={`flex-1 py-2.5 transition-colors ${tipo === 'interno' ? 'bg-violet-50 text-violet-600' : 'text-gray-400'}`}
            >Hecho por mí</button>
          </div>
        </div>
        <div>
          <label className="text-xs text-gray-500 font-medium">
            {tipo === 'externo' ? 'Precio de compra (Bs)' : 'Costo de fabricación (Bs)'}
          </label>
          <input
            type="number" min="0" step="0.5" inputMode="decimal"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:border-brand-500"
            value={precioCompra}
            onChange={(e) => setPrecioCompra(e.target.value)}
            placeholder="0.00"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 font-medium">Precio de venta (Bs)</label>
          <input
            type="number" min="0" step="0.5" inputMode="decimal"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:border-brand-500"
            value={precio}
            onChange={(e) => setPrecio(e.target.value)}
            placeholder="0.00"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 font-medium">Stock actual</label>
          <input
            type="number" min="0" step="1" inputMode="numeric"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:border-brand-500"
            value={stock}
            onChange={(e) => setStock(e.target.value)}
            placeholder="0"
          />
        </div>
        <button className="btn-primary mt-2 flex items-center justify-center gap-2" onClick={crear} disabled={guardando}>
          {guardando
            ? <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Creando…</>
            : <><HiPlus className="w-4 h-4" /> Crear producto</>
          }
        </button>
      </div>
    </ModalBase>
  )
}

function ModalNuevaMarca({ onClose, onCreada }) {
  const [nombre, setNombre] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState(null)

  const crear = async () => {
    if (!nombre.trim()) return
    setGuardando(true)
    try {
      await api.crearMarca({ nombre: nombre.trim() })
      onCreada()
      onClose()
    } catch (e) {
      setError(e.message)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <ModalBase titulo="Nueva marca" onClose={onClose}>
      <div className="space-y-3">
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <div>
          <label className="text-xs text-gray-500 font-medium">Nombre</label>
          <input
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:border-brand-500"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej: Coca-Cola"
            autoFocus
          />
        </div>
        <button className="btn-primary flex items-center justify-center gap-2" onClick={crear} disabled={guardando}>
          {guardando
            ? <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Creando…</>
            : <><HiPlus className="w-4 h-4" /> Crear marca</>
          }
        </button>
      </div>
    </ModalBase>
  )
}

function ModalBase({ titulo, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end" onClick={onClose}>
      <div
        className="bg-white w-full rounded-t-2xl p-5 pb-24 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-gray-900">{titulo}</h2>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 active:bg-gray-200"
          >
            <HiOutlineXMark className="w-4 h-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
