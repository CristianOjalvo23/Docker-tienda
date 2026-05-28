import { useState } from 'react'

export default function ListaProductos({ grupos = [], valores, onChange, readOnly = false }) {
  const [busqueda, setBusqueda] = useState('')
  const [marcaFiltro, setMarcaFiltro] = useState('')

  const marcas = grupos.map((g) => g.nombre)

  const gruposFiltrados = grupos
    .filter((g) => !marcaFiltro || g.nombre === marcaFiltro)
    .map((g) => ({
      ...g,
      productos: g.productos.filter((p) =>
        p.nombre.toLowerCase().includes(busqueda.toLowerCase())
      ),
    }))
    .filter((g) => g.productos.length > 0)

  return (
    <div>
      {/* Buscador */}
      <div className="px-4 py-3 sticky top-[56px] bg-gray-50 z-10 space-y-2">
        <input
          type="search"
          placeholder="Buscar producto…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="w-full border border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
        />
        {marcas.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            <button
              onClick={() => setMarcaFiltro('')}
              className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                marcaFiltro === '' ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-gray-600 border-gray-300'
              }`}
            >
              Todas
            </button>
            {marcas.map((m) => (
              <button
                key={m}
                onClick={() => setMarcaFiltro(m === marcaFiltro ? '' : m)}
                className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                  marcaFiltro === m ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-gray-600 border-gray-300'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Lista */}
      {gruposFiltrados.map((grupo) => (
        <div key={grupo.id} className="mb-2">
          <p className="section-title">{grupo.nombre}</p>
          <div className="card mx-4 divide-y divide-gray-100">
            {grupo.productos.map((p) => (
              <div key={p.id} className="flex items-center px-4 py-3 gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{p.nombre}</p>
                  <p className="text-xs text-gray-400">Bs {p.precio.toFixed(2)}</p>
                </div>
                {readOnly ? (
                  <span className="text-sm text-gray-600 font-medium w-20 text-right">
                    {valores[p.id] ?? 0}
                  </span>
                ) : (
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={valores[p.id] ?? ''}
                    onChange={(e) => onChange(p.id, e.target.value)}
                    placeholder="0"
                    className="input-qty"
                    inputMode="decimal"
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      {gruposFiltrados.length === 0 && (
        <p className="text-center text-gray-400 text-sm py-12">Sin resultados</p>
      )}
    </div>
  )
}
