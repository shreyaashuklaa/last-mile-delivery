import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import Navbar from './components/Navbar';
import NotificationCenterModal from './components/NotificationCenterModal';

// Customer Pages
import CustomerDashboard from './pages/customer/CustomerDashboard';
import BookOrder from './pages/customer/BookOrder';
import TrackOrder from './pages/customer/TrackOrder';

// Agent Pages
import AgentDashboard from './pages/agent/AgentDashboard';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import ZoneManager from './pages/admin/ZoneManager';
import RateCardManager from './pages/admin/RateCardManager';
import AgentFleetManager from './pages/admin/AgentFleetManager';

function AppContent() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('customer-dashboard');
  const [currentTrackingCode, setCurrentTrackingCode] = useState('LMD-2026-9041');

  const role = user?.role || 'customer';

  // Automatically adjust default view when persona / role changes
  useEffect(() => {
    if (role === 'admin') {
      setActiveTab('admin-dashboard');
    } else if (role === 'agent') {
      setActiveTab('agent-dashboard');
    } else {
      setActiveTab('customer-dashboard');
    }
  }, [role, user?.id]);

  const handleTrackOrder = (trackingCode) => {
    setCurrentTrackingCode(trackingCode);
    setActiveTab('track-order');
  };

  return (
    <div className="app-container">
      {/* Navigation Header */}
      <Navbar activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Main Content Area */}
      <main className="main-content">
        {/* Customer Views */}
        {activeTab === 'customer-dashboard' && (
          <CustomerDashboard
            onNavigateToBook={() => setActiveTab('book-order')}
            onTrackOrder={handleTrackOrder}
          />
        )}

        {activeTab === 'book-order' && (
          <BookOrder
            onOrderCreated={(code) => handleTrackOrder(code)}
          />
        )}

        {/* Agent Views */}
        {activeTab === 'agent-dashboard' && (
          <AgentDashboard
            onTrackOrder={handleTrackOrder}
          />
        )}

        {/* Admin Views */}
        {activeTab === 'admin-dashboard' && (
          <AdminDashboard
            onTrackOrder={handleTrackOrder}
            onNavigateToBook={() => setActiveTab('admin-book')}
          />
        )}

        {activeTab === 'admin-book' && (
          <BookOrder
            isAdminMode={true}
            onOrderCreated={(code) => handleTrackOrder(code)}
          />
        )}

        {activeTab === 'zone-manager' && <ZoneManager />}

        {activeTab === 'rate-card-manager' && <RateCardManager />}

        {activeTab === 'agent-manager' && <AgentFleetManager />}

        {/* Universal Track Order View */}
        {activeTab === 'track-order' && (
          <TrackOrder initialTrackingCode={currentTrackingCode} />
        )}
      </main>

      {/* Notification Center Modal */}
      <NotificationCenterModal />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <AppContent />
      </NotificationProvider>
    </AuthProvider>
  );
}
