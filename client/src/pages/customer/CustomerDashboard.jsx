import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import RescheduleModal from '../../components/RescheduleModal';
import {
  Package,
  Truck,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  PlusCircle,
  Search,
  RefreshCw,
  Clock
} from 'lucide-react';

export default function CustomerDashboard({ onNavigateToBook, onTrackOrder }) {
  const { user, authFetch } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchCode, setSearchCode] = useState('');
  const [selectedOrderToReschedule, setSelectedOrderToReschedule] = useState(null);

  const fetchCustomerOrders = async () => {
    setLoading(true);
    try {
      const res = await authFetch('/api/orders');
      const data = await res.json();
      if (data.orders) {
        setOrders(data.orders);
      }
    } catch (err) {
      console.error('Failed to fetch orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomerOrders();
  }, [user]);

  // Statistics
  const totalCount = orders.length;
  const inTransitCount = orders.filter(o => ['ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY'].includes(o.status)).length;
  const deliveredCount = orders.filter(o => o.status === 'DELIVERED').length;
  const failedCount = orders.filter(o => o.status === 'FAILED').length;

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchCode.trim()) {
      onTrackOrder(searchCode.trim());
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">Welcome back, {user?.name || 'Customer'}</h2>
          <p className="page-subtitle">
            Manage your retail and enterprise shipments, monitor live journeys, and handle delivery exceptions.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-primary" onClick={onNavigateToBook}>
            <PlusCircle size={16} /> Book Shipment
          </button>
        </div>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid-cols-4" style={{ marginBottom: 28 }}>
        <div className="stat-card">
          <div className="stat-icon-wrap" style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8' }}>
            <Package size={24} />
          </div>
          <div>
            <div className="stat-value">{totalCount}</div>
            <div className="stat-label">Total Shipments</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrap" style={{ background: 'rgba(14, 165, 233, 0.15)', color: '#38bdf8' }}>
            <Truck size={24} />
          </div>
          <div>
            <div className="stat-value">{inTransitCount}</div>
            <div className="stat-label">Active In Transit</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrap" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399' }}>
            <CheckCircle size={24} />
          </div>
          <div>
            <div className="stat-value">{deliveredCount}</div>
            <div className="stat-label">Delivered Successfully</div>
          </div>
        </div>

        <div className="stat-card" style={{ borderColor: failedCount > 0 ? 'rgba(239, 68, 68, 0.4)' : 'var(--border-subtle)' }}>
          <div className="stat-icon-wrap" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#f87171' }}>
            <AlertTriangle size={24} />
          </div>
          <div>
            <div className="stat-value" style={{ color: failedCount > 0 ? '#f87171' : 'var(--text-light)' }}>
              {failedCount}
            </div>
            <div className="stat-label">Action: Reschedule Needed</div>
          </div>
        </div>
      </div>

      {/* Quick Search Bar */}
      <div className="card" style={{ marginBottom: 24, padding: '16px 20px' }}>
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <Search size={18} color="var(--text-muted)" />
          <input
            type="text"
            className="form-input"
            style={{ flex: 1, border: 'none', background: 'transparent' }}
            placeholder="Enter tracking code (e.g. LMD-2026-9041) to track instant live location..."
            value={searchCode}
            onChange={e => setSearchCode(e.target.value)}
          />
          <button type="submit" className="btn btn-secondary btn-sm">
            Track Order
          </button>
        </form>
      </div>

      {/* Orders Table */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <Package size={18} color="#3b82f6" />
            <span>My Delivery Orders</span>
          </div>
          <button className="btn btn-sm btn-outline" onClick={fetchCustomerOrders}>
            <RefreshCw size={13} /> Refresh
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
            Loading your shipments...
          </div>
        ) : orders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '50px 0' }}>
            <Package size={40} color="var(--text-muted)" style={{ margin: '0 auto 12px' }} />
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-main)' }}>
              No shipments placed yet
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4, marginBottom: 16 }}>
              Book your first delivery to experience auto-calculated pricing and live tracking.
            </p>
            <button className="btn btn-primary" onClick={onNavigateToBook}>
              Book First Shipment
            </button>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Tracking Code</th>
                  <th>Status</th>
                  <th>Route (Origin &bull; Destination)</th>
                  <th>Chargeable Wt</th>
                  <th>Total Fee</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map(order => {
                  const isFailed = order.status === 'FAILED';

                  return (
                    <tr key={order.id}>
                      <td>
                        <span className="tracking-code-pill">{order.tracking_code}</span>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                          {order.order_type} &bull; {order.payment_type}
                        </div>
                      </td>

                      <td>
                        <span className={`status-badge status-${order.status}`}>
                          {['OUT_FOR_DELIVERY', 'IN_TRANSIT', 'PICKED_UP'].includes(order.status) && (
                            <span className="pulse-indicator" />
                          )}
                          {order.status.replace(/_/g, ' ')}
                        </span>
                        {isFailed && order.failure_reason && (
                          <div style={{ fontSize: 11, color: '#f87171', marginTop: 4 }}>
                            {order.failure_reason}
                          </div>
                        )}
                        {order.status === 'RESCHEDULED' && (
                          <div style={{ fontSize: 11, color: '#f472b6', marginTop: 4 }}>
                            Set for: {order.reschedule_date}
                          </div>
                        )}
                      </td>

                      <td style={{ maxWidth: 260 }}>
                        <div style={{ fontSize: 12, color: '#94a3b8' }}>
                          From: <strong style={{ color: '#e2e8f0' }}>{order.pickup_zone_name || 'Zone'}</strong> ({order.pickup_address})
                        </div>
                        <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
                          To: <strong style={{ color: '#e2e8f0' }}>{order.drop_zone_name || 'Zone'}</strong> ({order.drop_address})
                        </div>
                      </td>

                      <td>
                        <span style={{ fontWeight: 600 }}>{order.chargeable_weight_kg} kg</span>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                          Vol: {order.volumetric_weight_kg} kg
                        </div>
                      </td>

                      <td>
                        <span style={{ fontWeight: 700, color: '#38bdf8', fontFamily: 'var(--font-mono)' }}>
                          ₹{order.total_charge.toFixed(2)}
                        </span>
                      </td>

                      <td>
                        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                          {new Date(order.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                        </span>
                      </td>

                      <td>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          <button
                            className="btn btn-sm btn-secondary"
                            onClick={() => onTrackOrder(order.tracking_code)}
                          >
                            Track <ArrowRight size={12} />
                          </button>

                          {isFailed && (
                            <button
                              className="btn btn-sm btn-danger"
                              onClick={() => setSelectedOrderToReschedule(order)}
                            >
                              <RefreshCw size={12} /> Reschedule
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Reschedule Modal */}
      <RescheduleModal
        order={selectedOrderToReschedule}
        isOpen={!!selectedOrderToReschedule}
        onClose={() => setSelectedOrderToReschedule(null)}
        onRescheduled={() => {
          setSelectedOrderToReschedule(null);
          fetchCustomerOrders();
        }}
      />
    </div>
  );
}
