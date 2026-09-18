import React, { useEffect, useState } from 'react';
import {
  Users, Home, BookOpen, MessageSquare,
  ArrowRight, ArrowUpRight, UserPlus,
  FileText, Eye, Settings, Calendar,
  Activity, LayoutDashboard, TrendingUp,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, LineChart, Line, CartesianGrid,
} from 'recharts';
import './DashboardAdmin.css';

interface DashboardAdminProps {
  onNavigate: (page: string) => void;
}

interface Stats {
  totalFarmers: number;
  totalFarms: number;
  totalMaterials: number;
  totalFeedbacks: number;
  farmerGrowth: { month: string; farmers: number }[];
  feedbackVolume: { month: string; count: number }[];
  recentActivity: {
    title: string;
    description: string;
    time_ago: string;
    type: 'farmer' | 'feedback' | 'material';
  }[];
}

const today = new Date().toLocaleDateString('en-US', {
  weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
});

const quickActions = [
  { label: 'Manage Farmers',          icon: Users,    page: 'farmers'   },
  { label: 'Add Educational Content', icon: FileText, page: 'education' },
  { label: 'View Feedback',           icon: Eye,      page: 'feedback'  },
  { label: 'System Settings',         icon: Settings, page: 'settings'  },
];

const activityIcon = (type: string) => {
  if (type === 'farmer')   return UserPlus;
  if (type === 'feedback') return MessageSquare;
  return BookOpen;
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: '#fff', border: '1px solid #e8e0d8',
        borderRadius: 8, padding: '8px 14px',
        fontSize: 12, fontWeight: 600, color: '#344C3D',
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      }}>
        <div style={{ color: '#9ca3af', marginBottom: 2 }}>{label}</div>
        <div>{payload[0].value}</div>
      </div>
    );
  }
  return null;
};

const DashboardAdmin: React.FC<DashboardAdminProps> = ({ onNavigate }) => {
  const [stats, setStats] = useState<Stats>({
    totalFarmers: 0, totalFarms: 0,
    totalMaterials: 0, totalFeedbacks: 0,
    farmerGrowth: [], feedbackVolume: [],
    recentActivity: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('http://localhost/oinkmate-api/stats/dashboard-stats.php')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setStats(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const statCards = [
    { label: 'Total Farmers',          value: stats.totalFarmers,   icon: Users,        page: 'farmers'   },
    { label: 'Total Farms',            value: stats.totalFarms,     icon: Home,         page: 'farmers'   },
    { label: 'Educational Materials',  value: stats.totalMaterials, icon: BookOpen,     page: 'education' },
    { label: 'Feedback Submissions',   value: stats.totalFeedbacks, icon: MessageSquare,page: 'feedback'  },
  ];

  return (
    <div className="dashboard-wrap">

      {/* ===== HERO ===== */}
      <div
  className="welcome-banner"
  style={{
    backgroundImage: `url("/src/assets/images/header.jpg")`,
  }}
>
  <div className="welcome-overlay"></div>

  <div className="welcome-text">
    <div className="welcome-eyebrow">
      <LayoutDashboard size={12} />
      System Overview
    </div>

    <h2>Welcome back, Admin</h2>

    <p>
      Real-time overview of the OinkMate piggery management system.
      Track farmers, monitor activity, and manage content all in one place.
    </p>

    <div className="welcome-date">
      <Calendar size={13} />
      {today}
    </div>
  </div>
</div>

      {/* ===== STATS ===== */}
      <div className="stats-grid">
        {statCards.map(({ label, value, icon: Icon, page }) => (
          <div
            className="stat-card"
            key={label}
            onClick={() => onNavigate(page)}
          >
            <div className="stat-top">
              <div className="stat-icon-wrap">
                <Icon size={18} />
              </div>
              <div className="stat-trend">
                <ArrowUpRight size={11} />
                Live
              </div>
            </div>
            <div className="stat-label">{label}</div>
            <div className="stat-value">
              {loading ? '—' : value.toLocaleString()}
            </div>
            <div className="stat-footer">
              <span>View details</span>
              <ArrowRight size={12} />
            </div>
          </div>
        ))}
      </div>

      {/* ===== CHARTS ===== */}
      <div className="charts-grid">
        <div className="chart-card">
          <div className="chart-header">
            <div className="section-title-group">
              <TrendingUp size={14} className="section-title-icon" />
              <span className="section-title">Farmer Growth</span>
            </div>
            <span className="chart-sub">Last 6 months</span>
          </div>
          {stats.farmerGrowth.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={stats.farmerGrowth} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="#ece6df" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af', fontWeight: 600 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="farmers" stroke="#e9839d" strokeWidth={2.5}
                  dot={{ fill: '#e9839d', r: 3, strokeWidth: 0 }}
                  activeDot={{ r: 5, fill: '#344C3D' }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="chart-empty">No data yet</div>
          )}
        </div>

        <div className="chart-card">
          <div className="chart-header">
            <div className="section-title-group">
              <MessageSquare size={14} className="section-title-icon" />
              <span className="section-title">Feedback Volume</span>
            </div>
            <span className="chart-sub">Last 6 months</span>
          </div>
          {stats.feedbackVolume.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={stats.feedbackVolume} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="#ece6df" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af', fontWeight: 600 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" fill="#829672" radius={[4, 4, 0, 0]} maxBarSize={36} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="chart-empty">No data yet</div>
          )}
        </div>
      </div>

      {/* ===== BOTTOM ===== */}
      <div className="bottom-grid">

        {/* Recent Activity */}
        <div className="section-card">
          <div className="section-header">
            <div className="section-title-group">
              <Activity size={14} className="section-title-icon" />
              <span className="section-title">Recent Activity</span>
            </div>
            <button className="view-all-btn" onClick={() => onNavigate('farmers')}>
              View all <ArrowRight size={12} />
            </button>
          </div>
          <div className="activity-list">
            {loading ? (
              <div className="chart-empty">Loading...</div>
            ) : stats.recentActivity.length === 0 ? (
              <div className="chart-empty">No recent activity</div>
            ) : (
              stats.recentActivity.map((item, i) => {
                const Icon = activityIcon(item.type);
                return (
                  <div className="activity-item" key={i}>
                    <div className="activity-icon">
                      <Icon size={15} />
                    </div>
                    <div className="activity-body">
                      <div className="activity-info">
                        <div className="activity-title">{item.title}</div>
                        <div className="activity-desc">{item.description}</div>
                      </div>
                      <div className="activity-time">{item.time_ago}</div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="section-card">
          <div className="section-header">
            <div className="section-title-group">
              <Settings size={14} className="section-title-icon" />
              <span className="section-title">Quick Actions</span>
            </div>
          </div>
          <div className="quick-actions-list">
            {quickActions.map(({ label, icon: Icon, page }) => (
              <button
                className="quick-action-btn"
                key={label}
                onClick={() => onNavigate(page)}
              >
                <span className="action-left">
                  <span className="action-icon"><Icon size={16} /></span>
                  {label}
                </span>
                <ArrowRight size={15} className="arrow-icon" />
              </button>
            ))}
          </div>
        </div>

      </div>

      <div className="dashboard-footer">
        © 2025 OinkMate Admin Portal. All rights reserved.
      </div>
    </div>
  );
};

export default DashboardAdmin;