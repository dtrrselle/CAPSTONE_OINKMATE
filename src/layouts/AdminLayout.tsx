import React, { useState } from 'react';
import SidebarAdmin from '../components/SidebarAdmin';
import HeaderAdmin from '../components/HeaderAdmin';
import './AdminLayout.css';

interface AdminLayoutProps {
  children: React.ReactNode;
  pageTitle: string;
  activePage: string;
  onNavigate: (page: string) => void;
  onLogout: () => void;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({
  children,
  pageTitle,
  activePage,
  onNavigate,
  onLogout,
}) => {
  const [collapsed, setCollapsed]   = useState(true); // collapsed by default
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="admin-layout">
      <SidebarAdmin
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
        activePage={activePage}
        onNavigate={onNavigate}
        onLogout={onLogout}
      />
      <main className={`admin-main ${collapsed ? 'sidebar-collapsed' : ''}`}>
        <HeaderAdmin
          pageTitle={pageTitle}
          onMenuClick={() => {
            if (window.innerWidth <= 1024) {
              setMobileOpen((prev) => !prev);
            } else {
              setCollapsed((prev) => !prev);
            }
          }}
        />
        <div className="admin-content">{children}</div>
      </main>
    </div>
  );
};

export default AdminLayout;