import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import AgentStatusUpdateModal from '../../components/AgentStatusUpdateModal';
import {
  Truck,
  Package,
  MapPin,
  Phone,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Power,
  Navigation,
  DollarSign
} from 'lucide-react';

export default function AgentDashboard({ onTrackOrder }) {
  const { user, authFetch } = useAuth();
  const [orders, setOrders] = useState([]);
  const [agentInfo, setAgentInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [statusFilter, setStatusFilter] = useState('ACTIVE');

  const fetchAgentOrders = async () => {
    setLoading(true);
    try {
      const res = await authFetch('/api/agents/assigned-orders');
      const data = await res.json();
      if (data.orders) {
        setOrders(data.orders);
        setAgentInfo(data.agent);
      }
    } catch (err) {
      console.error('Failed to load agent orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgentOrders();
  }, [user]);

  // Toggle shift duty status
  const handleToggleDuty = async (nextDuty) => {
    if (!agentInfo) return;
    try {
      const res = await fetch(`/api/agents/${agentInfo.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-user-id': user.id
        },
        body: JSON.stringify({ status: nextDuty })
      });
      const data = await res.json();
      if (data.agent) {
        setAgentInfo(data.agent);
      }
    } catch (err) {
      alert('Could not update status: ' + err.message);
    }
  };

  const filteredOrders = orders.filter(o => {
    if (statusFilter === 'ACTIVE') {
      return ['ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY'].includes(o.status);
    }
    if (statusFilter === 'COMPLETED') {
      return o.status === 'DELIVERED';
    }
    if (statusFilter === 'FAILED') {
      return o.status === 'FAILED';
    }
    return true;
  });

  const activeCount = orders.filter(o => ['ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY'].includes(o.status)).length;
  const completedCount = orders.filter(o => o.status === 'DELIVERED').length;
  const failedCount = orders.filter(o => o.status === 'FAILED').length;

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">Delivery Agent Portal &bull; Shift Tasks</h2>
          <p className="page-subtitle">
            Manage parcel pickups, navigate active drop-offs, and report delivery milestone updates.
          </p>
        </div>

        {/* Agent Duty Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: 'var(--bg-card)',
            padding: '8px 16px',
            borderRadius: 'var(--radius-pill)',
            border: '1px solid var(--border-subtle)'
          }}>
            <span style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: agentInfo?.status === 'available' ? '#10b981' : agentInfo?.status === 'on_duty' ? '#3b82f6' : '#ef4444',
              boxShadow: `0 0 8px ${agentInfo?.status === 'available' ? '#10b981' : '#3b82f6'}`
            }} />
            <span style={{ fontSize: 13, fontWeight: 700, textTransform: 'capitalize' }}>
              Duty: {agentInfo?.status || 'available'}
            </span>
          </div>

          <button
            className={`btn btn-sm ${agentInfo?.status === 'offline' ? 'btn-success' : 'btn-outline'}`}
            onClick={() => handleToggleDuty(agentInfo?.status === 'offline' ? 'available' : 'offline')}
          >
            <Power size={14} />
            {agentInfo?.status === 'offline' ? 'Go Online' : 'Go Offline'}
          </button>
        </div>
      </div>

      {/* Stats KPI Row */}
      <div className="grid-cols-4" style={{ marginBottom: 28 }}>
        <div className="stat-card">
          <div className="stat-icon-wrap" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa' }}>
            <Navigation size={22} />
          </div>
          <div>
            <div className="stat-value">{activeCount}</div>
            <div className="stat-label">Active To Deliver</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrap" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399' }}>
            <CheckCircle size={22} />
          </div>
          <div>
            <div className="stat-value">{completedCount}</div>
            <div className="stat-label">Delivered Today</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrap" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#f87171' }}>
            <AlertTriangle size={22} />
          </div>
          <div>
            <div className="stat-value">{failedCount}</div>
            <div className="stat-label">Failed / Exceptions</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrap" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24' }}>
            <Truck size={22} />
          </div>
          <div>
            <div className="stat-value" style={{ fontSize: 20 }}>
              {agentInfo?.vehicle_type || 'EV Bike'}
            </div>
            <div className="stat-label">Vehicle Assigned</div>
          </div>
        </div>
      </div>

      {/* Orders Filter Tabs */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          {[
            { id: 'ACTIVE', label: 'Active Shipments', count: activeCount },
            { id: 'COMPLETED', label: 'Delivered', count: completedCount },
            { id: 'FAILED', label: 'Failed Attempts', count: failedCount },
            { id: 'ALL', label: 'All Shift Orders', count: orders.length }
          ].map(t => (
            <button
              key={t.id}
              className={`btn btn-sm ${statusFilter === t.id ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setStatusFilter(t.id)}
            >
              {t.label} ({t.count})
            </button>
          ))}
        </div>

        <button className="btn btn-sm btn-outline" onClick={fetchAgentOrders}>
          <RefreshCw size={13} /> Refresh Shift Tasks
        </button>
      </div>

      {/* Orders Cards Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '50px 0', color: 'var(--text-muted)' }}>
          Loading your assigned shift manifest...
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <Truck size={48} color="var(--text-muted)" style={{ margin: '0 auto 12px' }} />
          <h3 style={{ fontSize: 18, color: 'var(--text-main)' }}>No orders in this category</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 4 }}>
            New delivery assignments will appear here automatically when dispatched by Operations.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {filteredOrders.map(order => {
            const isTerminal = ['DELIVERED'].includes(order.status);
            const isFailed = order.status === 'FAILED';

            return (
              <div
                key={order.id}
                className="card"
                style={{
                  borderLeft: `4px solid ${
                    isFailed ? '#ef4444' :
                    order.status === 'DELIVERED' ? '#10b981' :
                    order.status === 'OUT_FOR_DELIVERY' ? '#f59e0b' : '#3b82f6'
                  }`
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span className="tracking-code-pill" style={{ fontSize: 15 }}>
                        {order.tracking_code}
                      </span>
                      <span className={`status-badge status-${order.status}`}>
                        <span className="pulse-indicator" />
                        {order.status.replace(/_/g, ' ')}
                      </span>
                    </div>

                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
                      Customer: <strong style={{ color: 'var(--text-main)' }}>{order.customer_name}</strong> &bull; {order.order_type}
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 18, fontWeight: 800, color: '#38bdf8', fontFamily: 'var(--font-mono)' }}>
                      ₹{order.total_charge.toFixed(2)}
                    </div>
                    <span style={{
                      fontSize: 11,
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: 10,
                      background: order.payment_type === 'COD' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                      color: order.payment_type === 'COD' ? '#fbbf24' : '#6ee7b7'
                    }}>
                      {order.payment_type === 'COD' ? '💵 COLLECT CASH (COD)' : '✓ PREPAID ONLINE'}
                    </span>
                  </div>
                </div>

                {/* Route Information */}
                <div className="grid-cols-2" style={{ background: 'var(--bg-dark)', padding: 14, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', marginBottom: 16 }}>
                  <div>
                    <div style={{ fontSize: 11, color: '#34d399', fontWeight: 700, marginBottom: 2 }}>
                      PICKUP ORIGIN
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-main)', fontWeight: 600 }}>
                      {order.pickup_zone_name || 'Zone'}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                      {order.pickup_address}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: 11, color: '#f87171', fontWeight: 700, marginBottom: 2 }}>
                      DROP DESTINATION
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-main)', fontWeight: 600 }}>
                      {order.drop_zone_name || 'Zone'}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                      {order.drop_address}
                    </div>
                  </div>
                </div>

                {/* Weight and Failure notices */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    Weight: <strong>{order.chargeable_weight_kg} kg</strong> &bull; Package: {order.length_cm}×{order.width_cm}×{order.height_cm} cm
                    {order.customer_phone && (
                      <span style={{ marginLeft: 12 }}>
                        <a href={`tel:${order.customer_phone}`} style={{ color: '#38bdf8', textDecoration: 'none' }}>
                          <Phone size={11} style={{ display: 'inline', marginRight: 3 }} /> {order.customer_phone}
                        </a>
                      </span>
                    )}
                  </div>

                  {/* Action Controls for Agent */}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      className="btn btn-sm btn-outline"
                      onClick={() => onTrackOrder && onTrackOrder(order.tracking_code)}
                    >
                      Map Route
                    </button>

                    {!isTerminal && (
                      <button
                        className="btn btn-sm btn-primary"
                        onClick={() => setSelectedOrder(order)}
                      >
                        Update Status Milestone
                      </button>
                    )}
                  </div>
                </div>

                {/* If Failed, show reason notes */}
                {isFailed && order.failure_reason && (
                  <div style={{
                    marginTop: 12,
                    padding: '8px 12px',
                    background: 'rgba(239, 68, 68, 0.1)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: 12,
                    color: '#fca5a5'
                  }}>
                    <strong>Failed Attempt Notice:</strong> {order.failure_reason}
                    {order.failure_notes && <span> &mdash; "{order.failure_notes}"</span>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Agent Status Update Modal */}
      <AgentStatusUpdateModal
        order={selectedOrder}
        isOpen={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
        onUpdated={() => {
          setSelectedOrder(null);
          fetchAgentOrders();
        }}
      />
    </div>
  );
}
