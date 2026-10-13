import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import {
  Layers,
  Truck,
  Package,
  Users,
  Filter,
  Search,
  RefreshCw,
  Zap,
  UserCheck,
  ShieldAlert,
  ArrowRight,
  Sliders,
  DollarSign,
  AlertTriangle,
  X
} from 'lucide-react';

export default function AdminDashboard({ onTrackOrder, onNavigateToBook }) {
  const { authFetch } = useAuth();
  const { addToast } = useNotifications();

  const [orders, setOrders] = useState([]);
  const [agents, setAgents] = useState([]);
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [zoneFilter, setZoneFilter] = useState('');
  const [agentFilter, setAgentFilter] = useState('');
  const [orderTypeFilter, setOrderTypeFilter] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal states
  const [selectedOrderForAssign, setSelectedOrderForAssign] = useState(null);
  const [manualAgentId, setManualAgentId] = useState('');
  const [selectedOrderForOverride, setSelectedOrderForOverride] = useState(null);
  const [overrideStatus, setOverrideStatus] = useState('DELIVERED');
  const [overrideNotes, setOverrideNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Load orders, agents, zones
  const fetchData = async () => {
    setLoading(true);
    try {
      const [ordersRes, agentsRes, zonesRes] = await Promise.all([
        authFetch('/api/orders'),
        authFetch('/api/agents'),
        authFetch('/api/zones')
      ]);

      const ordersData = await ordersRes.json();
      const agentsData = await agentsRes.json();
      const zonesData = await zonesRes.json();

      if (ordersData.orders) setOrders(ordersData.orders);
      if (agentsData.agents) setAgents(agentsData.agents);
      if (zonesData.zones) setZones(zonesData.zones);
    } catch (err) {
      console.error('Error fetching admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filtered orders
  const filteredOrders = orders.filter(o => {
    if (statusFilter && o.status !== statusFilter) return false;
    if (zoneFilter && (o.pickup_zone_id !== zoneFilter && o.drop_zone_id !== zoneFilter)) return false;
    if (agentFilter && o.assigned_agent_id !== agentFilter) return false;
    if (orderTypeFilter && o.order_type !== orderTypeFilter) return false;
    if (paymentFilter && o.payment_type !== paymentFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        o.tracking_code?.toLowerCase().includes(q) ||
        o.customer_name?.toLowerCase().includes(q) ||
        o.drop_address?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // KPI calculations
  const totalOrders = orders.length;
  const inTransitCount = orders.filter(o => ['ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY'].includes(o.status)).length;
  const deliveredCount = orders.filter(o => o.status === 'DELIVERED').length;
  const failedCount = orders.filter(o => o.status === 'FAILED').length;
  const unassignedCount = orders.filter(o => !o.assigned_agent_id && ['CREATED', 'RESCHEDULED'].includes(o.status)).length;
  const totalRevenue = orders.reduce((sum, o) => sum + (parseFloat(o.total_charge) || 0), 0);

  // Auto-assign smart dispatcher
  const handleAutoAssign = async (orderId) => {
    setActionLoading(true);
    try {
      const res = await authFetch(`/api/orders/${orderId}/auto-assign`, {
        method: 'POST'
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Auto-assignment failed');

      addToast({
        title: '⚡ Smart Auto-Assign Completed',
        message: data.message || `Dispatched to nearest agent`,
        type: 'success'
      });
      fetchData();
    } catch (err) {
      alert('Auto-assign failed: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Manual assign agent
  const handleManualAssign = async (e) => {
    e.preventDefault();
    if (!selectedOrderForAssign || !manualAgentId) return;

    setActionLoading(true);
    try {
      const res = await authFetch(`/api/orders/${selectedOrderForAssign.id}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent_id: manualAgentId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Assignment failed');

      addToast({
        title: '🛵 Agent Manually Assigned',
        message: data.message || 'Agent assigned successfully',
        type: 'success'
      });
      setSelectedOrderForAssign(null);
      fetchData();
    } catch (err) {
      alert('Assignment error: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Admin override status
  const handleOverrideStatus = async (e) => {
    e.preventDefault();
    if (!selectedOrderForOverride) return;

    setActionLoading(true);
    try {
      const res = await authFetch(`/api/orders/${selectedOrderForOverride.id}/override`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: overrideStatus,
          notes: overrideNotes || 'Status forced via operations override'
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Status override failed');

      addToast({
        title: '🛡️ Admin Override Executed',
        message: `Shipment #${selectedOrderForOverride.tracking_code} overridden to ${overrideStatus}`,
        type: 'info'
      });
      setSelectedOrderForOverride(null);
      fetchData();
    } catch (err) {
      alert('Override error: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">Operations Control Center</h2>
          <p className="page-subtitle">
            Fleet dispatch, proximity-based auto-assignment, multi-filter logistics oversight, and emergency status overrides.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-outline" onClick={fetchData}>
            <RefreshCw size={14} /> Refresh Data
          </button>
          <button className="btn btn-primary" onClick={onNavigateToBook}>
            + Book on Behalf
          </button>
        </div>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid-cols-4" style={{ marginBottom: 28 }}>
        <div className="stat-card">
          <div className="stat-icon-wrap" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa' }}>
            <Package size={22} />
          </div>
          <div>
            <div className="stat-value">{totalOrders}</div>
            <div className="stat-label">Total Volume Handled</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrap" style={{ background: 'rgba(14, 165, 233, 0.15)', color: '#38bdf8' }}>
            <Truck size={22} />
          </div>
          <div>
            <div className="stat-value">{inTransitCount}</div>
            <div className="stat-label">In Transit &bull; Active</div>
          </div>
        </div>

        <div className="stat-card" style={{ borderColor: unassignedCount > 0 ? 'rgba(245, 158, 11, 0.4)' : 'var(--border-subtle)' }}>
          <div className="stat-icon-wrap" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24' }}>
            <Zap size={22} />
          </div>
          <div>
            <div className="stat-value" style={{ color: unassignedCount > 0 ? '#fbbf24' : 'var(--text-light)' }}>
              {unassignedCount}
            </div>
            <div className="stat-label">Unassigned / Pending Dispatch</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrap" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399' }}>
            <DollarSign size={22} />
          </div>
          <div>
            <div className="stat-value" style={{ color: '#34d399' }}>
              ₹{totalRevenue.toFixed(0)}
            </div>
            <div className="stat-label">Gross Billed Freight</div>
          </div>
        </div>
      </div>

      {/* Comprehensive Filter Panel */}
      <div className="card" style={{ marginBottom: 24, padding: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)' }}>
          <Filter size={14} />
          <span>Multi-Dimensional Logistics Filters</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
          {/* Status Filter */}
          <select
            className="form-select"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="CREATED">CREATED (Pending Dispatch)</option>
            <option value="ASSIGNED">ASSIGNED</option>
            <option value="PICKED_UP">PICKED UP</option>
            <option value="IN_TRANSIT">IN TRANSIT</option>
            <option value="OUT_FOR_DELIVERY">OUT FOR DELIVERY</option>
            <option value="DELIVERED">DELIVERED</option>
            <option value="FAILED">FAILED (Exception)</option>
            <option value="RESCHEDULED">RESCHEDULED</option>
          </select>

          {/* Zone Filter */}
          <select
            className="form-select"
            value={zoneFilter}
            onChange={e => setZoneFilter(e.target.value)}
          >
            <option value="">All Hub Zones</option>
            {zones.map(z => (
              <option key={z.id} value={z.id}>{z.name} ({z.code})</option>
            ))}
          </select>

          {/* Agent Filter */}
          <select
            className="form-select"
            value={agentFilter}
            onChange={e => setAgentFilter(e.target.value)}
          >
            <option value="">All Delivery Agents</option>
            {agents.map(a => (
              <option key={a.id} value={a.id}>{a.name} ({a.vehicle_type})</option>
            ))}
          </select>

          {/* Order Type Filter */}
          <select
            className="form-select"
            value={orderTypeFilter}
            onChange={e => setOrderTypeFilter(e.target.value)}
          >
            <option value="">All Order Types (B2B / B2C)</option>
            <option value="B2C">B2C Retail</option>
            <option value="B2B">B2B Enterprise</option>
          </select>

          {/* Payment Filter */}
          <select
            className="form-select"
            value={paymentFilter}
            onChange={e => setPaymentFilter(e.target.value)}
          >
            <option value="">All Payment Modes</option>
            <option value="PREPAID">PREPAID</option>
            <option value="COD">CASH ON DELIVERY (COD)</option>
          </select>

          {/* Search Query */}
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              className="form-input"
              placeholder="Search code, customer, drop..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                style={{ position: 'absolute', right: 10, top: 10, background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                onClick={() => setSearchQuery('')}
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {(statusFilter || zoneFilter || agentFilter || orderTypeFilter || paymentFilter || searchQuery) && (
          <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-secondary)' }}>
            <span>Showing {filteredOrders.length} of {orders.length} orders matching active filters</span>
            <button
              className="btn btn-sm btn-outline"
              onClick={() => {
                setStatusFilter('');
                setZoneFilter('');
                setAgentFilter('');
                setOrderTypeFilter('');
                setPaymentFilter('');
                setSearchQuery('');
              }}
            >
              Reset Filters
            </button>
          </div>
        )}
      </div>

      {/* Orders Grid Table */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <Layers size={18} color="#3b82f6" />
            <span>Master Logistics Orders Manifest</span>
          </div>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {filteredOrders.length} shipments found
          </span>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '50px 0', color: 'var(--text-muted)' }}>
            Loading operations orders manifest...
          </div>
        ) : filteredOrders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '50px 0', color: 'var(--text-muted)' }}>
            No orders match the selected filters.
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Tracking / Customer</th>
                  <th>Status</th>
                  <th>Route (Pickup &bull; Drop)</th>
                  <th>Charge Details</th>
                  <th>Assigned Agent</th>
                  <th>Dispatch Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map(order => {
                  const isUnassigned = !order.assigned_agent_id;
                  const isFailed = order.status === 'FAILED';

                  return (
                    <tr key={order.id}>
                      <td>
                        <span className="tracking-code-pill">{order.tracking_code}</span>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-main)', marginTop: 4 }}>
                          {order.customer_name}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
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
                            Date: {order.reschedule_date}
                          </div>
                        )}
                      </td>

                      <td style={{ maxWidth: 220 }}>
                        <div style={{ fontSize: 11, color: '#34d399' }}>
                          From: <strong>{order.pickup_zone_name || 'Zone'}</strong>
                        </div>
                        <div style={{ fontSize: 11, color: '#f87171', marginTop: 2 }}>
                          To: <strong>{order.drop_zone_name || 'Zone'}</strong>
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                          {order.is_intra_zone ? 'Intra-Zone' : 'Inter-Zone'} &bull; {order.chargeable_weight_kg} kg
                        </div>
                      </td>

                      <td>
                        <div style={{ fontSize: 14, fontWeight: 700, color: '#38bdf8', fontFamily: 'var(--font-mono)' }}>
                          ₹{order.total_charge.toFixed(2)}
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                          Base: ₹{order.base_charge} | Wt: ₹{order.weight_surcharge}
                          {order.cod_surcharge > 0 && ` | COD: ₹${order.cod_surcharge}`}
                        </div>
                      </td>

                      <td>
                        {order.agent_name ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: 15 }}>🛵</span>
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 600 }}>{order.agent_name}</div>
                              <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{order.agent_vehicle}</div>
                            </div>
                          </div>
                        ) : (
                          <span style={{
                            fontSize: 11,
                            color: '#fbbf24',
                            background: 'rgba(245, 158, 11, 0.1)',
                            padding: '3px 8px',
                            borderRadius: 12,
                            fontWeight: 600
                          }}>
                            ⚡ Unassigned
                          </span>
                        )}
                      </td>

                      <td>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {/* Nearest Auto Assign Button */}
                          <button
                            className="btn btn-sm btn-primary"
                            style={{ padding: '4px 8px', fontSize: 11 }}
                            onClick={() => handleAutoAssign(order.id)}
                            disabled={actionLoading}
                            title="Auto-assign nearest available agent using Haversine formula and zone affinity"
                          >
                            <Zap size={12} /> Auto
                          </button>

                          {/* Manual Assign Button */}
                          <button
                            className="btn btn-sm btn-secondary"
                            style={{ padding: '4px 8px', fontSize: 11 }}
                            onClick={() => {
                              setSelectedOrderForAssign(order);
                              setManualAgentId(order.assigned_agent_id || agents[0]?.id || '');
                            }}
                            title="Manually assign specific rider"
                          >
                            <UserCheck size={12} /> Assign
                          </button>

                          {/* Override Status Button */}
                          <button
                            className="btn btn-sm btn-outline"
                            style={{ padding: '4px 8px', fontSize: 11 }}
                            onClick={() => {
                              setSelectedOrderForOverride(order);
                              setOverrideStatus(order.status);
                              setOverrideNotes('');
                            }}
                            title="Admin override status"
                          >
                            <ShieldAlert size={12} /> Override
                          </button>

                          {/* Track Button */}
                          <button
                            className="btn btn-sm btn-outline"
                            style={{ padding: '4px 8px', fontSize: 11 }}
                            onClick={() => onTrackOrder && onTrackOrder(order.tracking_code)}
                            title="Open live tracking"
                          >
                            <ArrowRight size={12} />
                          </button>
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

      {/* Manual Agent Assignment Modal */}
      {selectedOrderForAssign && (
        <div className="modal-backdrop" onClick={() => setSelectedOrderForAssign(null)}>
          <div className="modal-window" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">
                Manual Agent Dispatch &bull; #{selectedOrderForAssign.tracking_code}
              </div>
              <button className="modal-close-btn" onClick={() => setSelectedOrderForAssign(null)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleManualAssign}>
              <div className="modal-body">
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 14 }}>
                  Select a delivery partner to dispatch for pickup in <strong>{selectedOrderForAssign.pickup_zone_name || 'Zone'}</strong>:
                </div>

                <div className="form-group">
                  <label className="form-label">Available Fleet Agents</label>
                  <select
                    className="form-select"
                    value={manualAgentId}
                    onChange={e => setManualAgentId(e.target.value)}
                    required
                  >
                    {agents.map(ag => (
                      <option key={ag.id} value={ag.id}>
                        {ag.name} &bull; {ag.vehicle_type} ({ag.zone_name || 'All Hubs'}) - Status: {ag.status} [Active: {ag.active_orders_count || 0}]
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setSelectedOrderForAssign(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={actionLoading}>
                  {actionLoading ? 'Assigning...' : 'Confirm Dispatch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin Override Modal */}
      {selectedOrderForOverride && (
        <div className="modal-backdrop" onClick={() => setSelectedOrderForOverride(null)}>
          <div className="modal-window" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <ShieldAlert size={20} color="#f59e0b" />
                <div className="modal-title">Admin Emergency Status Override</div>
              </div>
              <button className="modal-close-btn" onClick={() => setSelectedOrderForOverride(null)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleOverrideStatus}>
              <div className="modal-body">
                <div style={{
                  background: 'rgba(245, 158, 11, 0.1)',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                  padding: 12,
                  borderRadius: 'var(--radius-sm)',
                  fontSize: 12,
                  color: '#fbbf24',
                  marginBottom: 16
                }}>
                  ⚠️ Admin override forces an order state transition bypassing agent actions. This event will be permanently stamped in the immutable audit log with your admin identity.
                </div>

                <div className="form-group">
                  <label className="form-label">Target Status</label>
                  <select
                    className="form-select"
                    value={overrideStatus}
                    onChange={e => setOverrideStatus(e.target.value)}
                  >
                    <option value="CREATED">CREATED</option>
                    <option value="ASSIGNED">ASSIGNED</option>
                    <option value="PICKED_UP">PICKED UP</option>
                    <option value="IN_TRANSIT">IN TRANSIT</option>
                    <option value="OUT_FOR_DELIVERY">OUT FOR DELIVERY</option>
                    <option value="DELIVERED">DELIVERED</option>
                    <option value="FAILED">FAILED</option>
                    <option value="RESCHEDULED">RESCHEDULED</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Operational Justification / Override Reason</label>
                  <textarea
                    className="form-textarea"
                    rows="3"
                    placeholder="e.g., Manual confirmation by customer support; delivery verified by warehouse supervisor..."
                    value={overrideNotes}
                    onChange={e => setOverrideNotes(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setSelectedOrderForOverride(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-danger" disabled={actionLoading}>
                  {actionLoading ? 'Executing...' : 'Force Status Override'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
