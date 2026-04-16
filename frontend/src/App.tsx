import { Routes, Route, Navigate, NavLink, Outlet } from 'react-router-dom'
import PartnersPage from './pages/PartnersPage'
import PartnerFormPage from './pages/PartnerFormPage'
import PartnerPackagesPage from './pages/PartnerPackagesPage'

// ── Nav structure ─────────────────────────────────────────────────────────────

const navSections = [
  {
    label: 'Partner Management',
    items: [
      { to: '/partners', label: 'Partners' },
    ],
  },
]

const navLinkStyle = ({ isActive }: { isActive: boolean }) => ({
  display: 'block',
  padding: '8px 12px',
  borderRadius: 6,
  textDecoration: 'none',
  fontSize: 14,
  color: isActive ? '#0ecdc2' : '#8a8d94',
  background: isActive ? 'rgba(14,205,194,0.1)' : 'transparent',
  marginBottom: 2,
})

function AppLayout() {
  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      <aside style={{ width: 220, background: '#1a1d24', borderRight: '1px solid #2e3138', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ padding: '16px 24px', borderBottom: '1px solid #2e3138' }}>
          <span style={{ fontWeight: 600, color: '#fff' }}>RoaminRabbit <span style={{ color: '#0ecdc2' }}>ERP</span></span>
        </div>
        <nav style={{ flex: 1, padding: '12px 8px', overflowY: 'auto' }}>
          {navSections.map((section) => (
            <div key={section.label}>
              <div style={{ padding: '12px 12px 4px', fontSize: 11, fontWeight: 600, color: '#555', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                {section.label}
              </div>
              {section.items.map((item) => (
                <NavLink key={item.to} to={item.to} style={navLinkStyle}>
                  {item.label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <div style={{ padding: '12px 16px', borderTop: '1px solid #2e3138' }}>
          <span style={{ fontSize: 12, color: '#555' }}>Prototype v0.1</span>
        </div>
      </aside>
      <main style={{ flex: 1, overflow: 'auto' }}>
        <Outlet />
      </main>
    </div>
  )
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<AppLayout />}>
        <Route index element={<Navigate to="/partners" replace />} />
        {/* Partner Management */}
        <Route path="partners" element={<PartnersPage />} />
        <Route path="partners/add" element={<PartnerFormPage />} />
        <Route path="partners/:id/edit" element={<PartnerFormPage />} />
        <Route path="partners/:id/packages" element={<PartnerPackagesPage />} />
      </Route>
    </Routes>
  )
}

export default App
