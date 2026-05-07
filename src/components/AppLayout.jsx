import Sidebar from './Sidebar'
import BottomNav from './BottomNav'
import './AppLayout.css'

export default function AppLayout({ children }) {
  return (
    <div className="app-layout">
      <Sidebar />
      <main className="app-content">
        {children}
      </main>
      <BottomNav />
    </div>
  )
}
