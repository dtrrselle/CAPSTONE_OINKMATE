import React, { useState, useRef, useEffect } from 'react';
import { Bell, UserPlus, BookOpen, MessageSquare, Users, Menu } from 'lucide-react';
import './HeaderAdmin.css';

interface HeaderAdminProps {
  pageTitle: string;
  onMenuClick: () => void;
}

const dummyNotifs = [
  {
    id: 1,
    title: 'New farmer registered',
    desc: 'Juan Dela Cruz has been added as a new farmer.',
    time: '2 hours ago',
    icon: UserPlus,
    unread: true,
  },
  {
    id: 2,
    title: 'Educational content uploaded',
    desc: 'New feeding guide: "Proper Nutrition for Grower Pigs"',
    time: '5 hours ago',
    icon: BookOpen,
    unread: true,
  },
  {
    id: 3,
    title: 'Feedback submitted',
    desc: 'Maria Santos submitted a feedback report.',
    time: '1 day ago',
    icon: MessageSquare,
    unread: true,
  },
  {
    id: 4,
    title: 'Farmer information updated',
    desc: 'Green Valley Farm records were updated.',
    time: '2 days ago',
    icon: Users,
    unread: false,
  },
];

const HeaderAdmin: React.FC<HeaderAdminProps> = ({ pageTitle, onMenuClick }) => {
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifs, setNotifs]       = useState(dummyNotifs);
  const notifRef                  = useRef<HTMLDivElement>(null);

  const unreadCount = notifs.filter((n) => n.unread).length;

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const markAllRead = () => {
    setNotifs((prev) => prev.map((n) => ({ ...n, unread: false })));
  };

  const markOneRead = (id: number) => {
    setNotifs((prev) =>
      prev.map((n) => (n.id === id ? { ...n, unread: false } : n))
    );
  };

  return (
    <header className="header">
      {/* Left — hamburger + title */}
      <div className="header-left">
        <button
          className="hamburger-btn"
          onClick={onMenuClick}
          aria-label="Toggle sidebar"
        >
          <Menu size={20} />
        </button>
        <h1 className="header-title">{pageTitle}</h1>
      </div>

      {/* Right — notif + logo */}
      <div className="header-right">
        <div className="notif-wrap" ref={notifRef}>
          <button
            className={`notif-btn ${notifOpen ? 'active' : ''}`}
            onClick={() => setNotifOpen((prev) => !prev)}
            aria-label="Notifications"
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="notif-badge">{unreadCount}</span>
            )}
          </button>

          {notifOpen && (
            <div className="notif-dropdown">
              <div className="notif-dropdown-header">
                <span className="notif-dropdown-title">
                  Notifications {unreadCount > 0 && `(${unreadCount})`}
                </span>
                {unreadCount > 0 && (
                  <button className="notif-mark-read" onClick={markAllRead}>
                    Mark all as read
                  </button>
                )}
              </div>

              <div className="notif-list">
                {notifs.map(({ id, title, desc, time, icon: Icon, unread }) => (
                  <div
                    key={id}
                    className={`notif-item ${unread ? 'unread' : ''}`}
                    onClick={() => markOneRead(id)}
                  >
                    <div className={`notif-dot ${unread ? '' : 'read'}`} />
                    <div className="notif-item-icon">
                      <Icon size={15} />
                    </div>
                    <div className="notif-item-body">
                      <div className="notif-item-title">{title}</div>
                      <div className="notif-item-desc">{desc}</div>
                      <div className="notif-item-time">{time}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="notif-dropdown-footer">
                <button className="notif-view-all">View all notifications</button>
              </div>
            </div>
          )}
        </div>

        {/* Logo — pinaka-right */}
        <div className="header-divider" />
        <img
          src="/src/assets/images/systemlogo.png"
          alt="OinkMate"
          className="header-logo"
        />
      </div>
    </header>
  );
};

export default HeaderAdmin;