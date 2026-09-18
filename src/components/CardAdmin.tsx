import React from 'react';
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import './CardAdmin.css';

/* ============================================================
   Panel — flat bordered container, no floating shadow-card look.
   Use to group any section content (charts, tables, forms).
============================================================ */
interface PanelProps {
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export const Panel: React.FC<PanelProps> = ({
  title,
  subtitle,
  action,
  children,
  className = '',
}) => {
  return (
    <section className={`panel ${className}`}>
      {(title || action) && (
        <div className="panel-head">
          <div>
            {title && <h3 className="panel-title">{title}</h3>}
            {subtitle && <p className="panel-subtitle">{subtitle}</p>}
          </div>
          {action && <div className="panel-action">{action}</div>}
        </div>
      )}
      <div className="panel-body">{children}</div>
    </section>
  );
};

/* ============================================================
   StatCard — single metric with optional trend delta.
   trend: 'up' | 'down' | 'flat'
============================================================ */
interface StatCardProps {
  label: string;
  value: string;
  delta?: string;
  trend?: 'up' | 'down' | 'flat';
  icon?: LucideIcon;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  delta,
  trend = 'flat',
  icon: Icon,
}) => {
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;

  return (
    <div className="stat-card">
      <div className="stat-card-top">
        <span className="stat-card-label">{label}</span>
        {Icon && (
          <span className="stat-card-icon">
            <Icon size={16} />
          </span>
        )}
      </div>
      <div className="stat-card-value">{value}</div>
      {delta && (
        <div className={`stat-card-delta trend-${trend}`}>
          <TrendIcon size={13} />
          <span>{delta}</span>
        </div>
      )}
    </div>
  );
};

export default Panel;
