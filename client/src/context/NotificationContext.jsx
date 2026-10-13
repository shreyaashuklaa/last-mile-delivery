import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const addToast = useCallback((toast) => {
    const id = `toast_${Date.now()}_${Math.random()}`;
    const newToast = { id, ...toast };
    setToasts(prev => [...prev.slice(-3), newToast]); // keep last 4 toasts
    setUnreadCount(prev => prev + 1);

    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Fetch initial notifications
  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications');
      const data = await res.json();
      if (data.notifications) {
        setNotifications(data.notifications);
      }
    } catch (err) {
      console.error('Failed to load notifications:', err);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();

    // Subscribe to real-time Server-Sent Events (SSE)
    const eventSource = new EventSource('/api/events');

    eventSource.addEventListener('CONNECTED', (e) => {
      console.log('⚡ SSE Connected to Live Delivery Tracker stream');
    });

    eventSource.addEventListener('ORDER_CREATED', (e) => {
      const data = JSON.parse(e.data);
      addToast({
        title: '📦 Order Booked',
        message: `Order #${data.order.tracking_code} confirmed (${data.order.order_type})`,
        type: 'info'
      });
      fetchNotifications();
    });

    eventSource.addEventListener('ORDER_STATUS_CHANGED', (e) => {
      const data = JSON.parse(e.data);
      const isFailed = data.status === 'FAILED';
      addToast({
        title: isFailed ? '⚠️ Delivery Failed' : `🚀 Status: ${data.status}`,
        message: `Shipment #${data.tracking_code} transitioned to ${data.status}`,
        type: isFailed ? 'danger' : 'success'
      });
      fetchNotifications();
    });

    eventSource.addEventListener('ORDER_ASSIGNED', (e) => {
      const data = JSON.parse(e.data);
      addToast({
        title: '🛵 Agent Assigned',
        message: `Delivery agent dispatched for shipment #${data.orderId}`,
        type: 'info'
      });
      fetchNotifications();
    });

    eventSource.addEventListener('ORDER_RESCHEDULED', (e) => {
      const data = JSON.parse(e.data);
      addToast({
        title: '📅 Delivery Rescheduled',
        message: `Shipment #${data.tracking_code} set for ${data.reschedule_date}`,
        type: 'info'
      });
      fetchNotifications();
    });

    return () => {
      eventSource.close();
    };
  }, [addToast, fetchNotifications]);

  const openNotificationModal = () => {
    setIsModalOpen(true);
    setUnreadCount(0);
    fetchNotifications();
  };

  const closeNotificationModal = () => {
    setIsModalOpen(false);
  };

  return (
    <NotificationContext.Provider
      value={{
        toasts,
        addToast,
        removeToast,
        notifications,
        unreadCount,
        isModalOpen,
        openNotificationModal,
        closeNotificationModal,
        refreshNotifications: fetchNotifications
      }}
    >
      {children}
      {/* Toast Notification Container */}
      <div className="toast-container">
        {toasts.map(toast => (
          <div key={toast.id} className="toast" onClick={() => removeToast(toast.id)}>
            <div style={{ flex: 1 }}>
              <div className="toast-title">{toast.title}</div>
              <div className="toast-message">{toast.message}</div>
            </div>
            <button
              style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              onClick={(e) => { e.stopPropagation(); removeToast(toast.id); }}
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('useNotifications must be used within NotificationProvider');
  return context;
}
