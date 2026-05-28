import { NavLink } from 'react-router-dom'
import { HiOutlineSun, HiOutlineChartBarSquare, HiOutlineRectangleStack } from 'react-icons/hi2'

const tabs = [
  { to: '/',          label: 'Hoy',      Icon: HiOutlineSun },
  { to: '/historial', label: 'Historial', Icon: HiOutlineChartBarSquare },
  { to: '/productos', label: 'Productos', Icon: HiOutlineRectangleStack },
]

export default function NavBar() {
  return (
    <nav className="fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 flex z-50">
      {tabs.map(({ to, label, Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center justify-center py-2.5 gap-1 transition-colors ${
              isActive ? 'text-brand-600' : 'text-gray-400'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <Icon className={`w-6 h-6 ${isActive ? 'stroke-[2]' : 'stroke-[1.5]'}`} />
              <span className={`text-[11px] ${isActive ? 'font-semibold' : 'font-normal'}`}>{label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}
