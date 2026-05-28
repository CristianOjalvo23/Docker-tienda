const BASE = '/api'

async function request(method, path, body) {
  const opts = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'ngrok-skip-browser-warning': 'true',
    },
  }
  if (body !== undefined) opts.body = JSON.stringify(body)

  const res = await fetch(BASE + path, opts)
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || `Error ${res.status}`)
  return data
}

export const api = {
  // Productos
  getProductos: () => request('GET', '/productos'),
  crearProducto: (body) => request('POST', '/productos', body),
  editarProducto: (id, body) => request('PUT', `/productos/${id}`, body),
  desactivarProducto: (id) => request('DELETE', `/productos/${id}`),

  // Marcas
  getMarcas: () => request('GET', '/marcas'),
  crearMarca: (body) => request('POST', '/marcas', body),

  // Registros
  getEstadoHoy: () => request('GET', '/registro/hoy'),
  guardarApertura: (items) => request('POST', '/registro/apertura', { items }),
  guardarCierre: (items) => request('POST', '/registro/cierre', { items }),
  guardarCierreFecha: (fecha, items) => request('POST', `/registro/cierre/${fecha}`, { items }),
  guardarReposicion: (items) => request('POST', '/registro/reposicion', { items }),
  getApertura: (fecha) => request('GET', `/registro/${fecha}/apertura`),
  getReposiciones: (fecha) => request('GET', `/registro/${fecha}/reposiciones`),
  getResumen: (fecha) => request('GET', `/registro/${fecha}`),
  getHistorial: () => request('GET', '/historial'),
}
