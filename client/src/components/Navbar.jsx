import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import {
  Truck,
  Package,
  PlusCircle,
  Search,
  MapPin,
  Sliders,
  Users,
  Bell,
  Layers,
  Shield,
  UserCheck
} from 'lucide-react';

export default function Navbar({ activeTab, onTabChange }) {
  const { user, personas, activePersonaId, switchPersona } = useAuth();
  const { openNotificationModal, unreadCount } = useNotifications();

  const role = user?.role || 'customer';

  return (
    <>
      {/* Demo Persona Switcher Banner for Evaluation */}
      <div className="demo-banner">
        <div className="demo-banner-title">
          <span className="demo-banner-badge">SDE Demo Persona</span>
          <span>Switch perspective to evaluate full multi-role experience:</span>
        </div>

        <div className="persona-selector">
          {personas.map(p => {
            const isActive = p.id === activePersonaId;
            return (
              <button
                key={p.id}
                className={`persona-chip ${isActive ? 'active' : ''}`}
                onClick={() => switchPersona(p.id)}
                title={p.description}
              >
                <span>{p.avatar}</span>
                <span>{p.name}</span>
                <span style={{ opacity: 0.7, fontSize: 11 }}>({p.role.toUpperCase()})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Navbar */}
      <header className="navbar">
        <div className="nav-brand" onClick={() => onTabChange(role === 'admin' ? 'admin-dashboard' : role === 'agent' ? 'agent-dashboard' : 'customer-dashboard')}>
          <div className="brand-icon">
            <Truck size={22} />
          </div>
          <div className="brand-text">
            <h1>SwiftTrack</h1>
            <div className="brand-tag">Last-Mile Operations</div>
          </div>
        </div>

        {/* Dynamic Navigation Tabs based on Role */}
        <nav className="nav-links">
          {role === 'customer' && (
            <>
              <button
                className={`nav-link ${activeTab === 'customer-dashboard' ? 'active' : ''}`}
                onClick={() => onTabChange('customer-dashboard')}
              >
                <Package size={16} /> My Shipments
              </button>
              <button
                className={`nav-link ${activeTab === 'book-order' ? 'active' : ''}`}
                onClick={() => onTabChange('book-order')}
              >
                <PlusCircle size={16} /> Book Shipment
              </button>
              <button
                className={`nav-link ${activeTab === 'track-order' ? 'active' : ''}`}
                onClick={() => onTabChange('track-order')}
              >
                <Search size={16} /> Live Tracker
              </button>
            </>
          )}

          {role === 'agent' && (
            <>
              <button
                className={`nav-link ${activeTab === 'agent-dashboard' ? 'active' : ''}`}
                onClick={() => onTabChange('agent-dashboard')}
              >
                <Truck size={16} /> Shift Deliveries
              </button>
              <button
                className={`nav-link ${activeTab === 'track-order' ? 'active' : ''}`}
                onClick={() => onTabChange('track-order')}
              >
                <Search size={16} /> Lookup Order
              </button>
            </>
          )}

          {role === 'admin' && (
            <>
              <button
                className={`nav-link ${activeTab === 'admin-dashboard' ? 'active' : ''}`}
                onClick={() => onTabChange('admin-dashboard')}
              >
                <Layers size={16} /> All Orders & Dispatch
              </button>
              <button
                className={`nav-link ${activeTab === 'admin-book' ? 'active' : ''}`}
                onClick={() => onTabChange('admin-book')}
              >
                <PlusCircle size={16} /> Create on Behalf
              </button>
              <button
                className={`nav-link ${activeTab === 'zone-manager' ? 'active' : ''}`}
                onClick={() => onTabChange('zone-manager')}
              >
                <MapPin size={16} /> Zones & Areas
              </button>
              <button
                className={`nav-link ${activeTab === 'rate-card-manager' ? 'active' : ''}`}
                onClick={() => onTabChange('rate-card-manager')}
              >
                <Sliders size={16} /> Rate Cards
              </button>
              <button
                className={`nav-link ${activeTab === 'agent-manager' ? 'active' : ''}`}
                onClick={() => onTabChange('agent-manager')}
              >
                <Users size={16} /> Agent Fleet
              </button>
              <button
                className={`nav-link ${activeTab === 'track-order' ? 'active' : ''}`}
                onClick={() => onTabChange('track-order')}
              >
                <Search size={16} /> Tracker
              </button>
            </>
          )}
        </nav>

        {/* Action Controls */}
        <div className="nav-actions">
          {/* Notification Center Bell */}
          <button
            className="icon-btn"
            onClick={openNotificationModal}
            title="Open Live Notifications Center (Emails & SMS)"
          >
            <Bell size={18} />
            {unreadCount > 0 && <span className="badge-dot" />}
          </button>

          {/* User Profile Badge */}
          <div className="user-profile-badge">
            <div className="user-avatar">
              {role === 'admin' ? '⚡' : role === 'agent' ? '🛵' : '👤'}
            </div>
            <div className="user-info">
              <div className="user-name">{user?.name || 'Active User'}</div>
              <div className="user-role-tag" style={{
                color: role === 'admin' ? '#f59e0b' : role === 'agent' ? '#38bdf8' : '#10b981'
              }}>
                {role.toUpperCase()}
              </div>
            </div>
          </div>
        </div>
      </header>
    </>
  );
}
