import React from 'react';
import {
  LayoutDashboard,
  Users,
  BookOpen,
  MessageSquare,
  Settings,
  LogOut,
  TrendingUp,
} from 'lucide-react';
import './SidebarAdmin.css';

interface SidebarAdminProps {
  collapsed: boolean;
  mobileOpen: boolean;
  onMobileClose: () => void;
  activePage: string;
  onNavigate: (page: string) => void;
  onLogout: () => void;
}

const navItems = [
  { id: 'dashboard', label: 'Dashboard',           icon: LayoutDashboard },
  { id: 'farmers',   label: 'Farmer Management',   icon: Users },
  { id: 'education', label: 'Educational Content', icon: BookOpen },
  { id: 'market',    label: 'Market Trends',       icon: TrendingUp },
  { id: 'feedback',  label: 'Feedback Management', icon: MessageSquare },
  { id: 'settings',  label: 'Settings',            icon: Settings },
];

const SidebarAdmin: React.FC<SidebarAdminProps> = ({
  collapsed,
  mobileOpen,
  onMobileClose,
  activePage,
  onNavigate,
  onLogout,
}) => {
  return (
    <>
      <div
        className={`sidebar-overlay ${mobileOpen ? 'visible' : ''}`}
        onClick={onMobileClose}
      />
      <aside className={`sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-logo">
          {!collapsed && <span className="sidebar-top-label">Main Menu</span>}
        </div>

        <nav className="sidebar-nav">
          {navItems.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={`nav-item ${activePage === id ? 'active' : ''}`}
              onClick={() => {
                onNavigate(id);
                if (window.innerWidth <= 1024) onMobileClose();
              }}
              data-label={label}
            >
              <Icon />
              {!collapsed && <span className="nav-label-text">{label}</span>}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button
            className="nav-item logout-btn"
            onClick={onLogout}
            data-label="Logout"
          >
            <LogOut />
            {!collapsed && <span className="nav-label-text">Logout</span>}
          </button>
        </div>
      </aside>
    </>
  );
};

export default SidebarAdmin;