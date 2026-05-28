import { Routes, Route } from 'react-router-dom'
import NavBar from './components/NavBar'
import Hoy from './pages/Hoy'
import Historial from './pages/Historial'
import Productos from './pages/Productos'

export default function App() {
  return (
    <div className="min-h-screen bg-gray-50 max-w-md mx-auto relative">
      <main className="pb-16">
        <Routes>
          <Route path="/" element={<Hoy />} />
          <Route path="/historial" element={<Historial />} />
          <Route path="/productos" element={<Productos />} />
        </Routes>
      </main>
      <NavBar />
    </div>
  )
}
