import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  Users,
  Truck,
  Star,
  MapPin,
  Phone,
  RefreshCw,
  CheckCircle,
  Navigation,
  Power
} from 'lucide-react';

export default function AgentFleetManager() {
  const { authFetch } = useAuth();
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAgents = async () => {
    setLoading(true);
    try {
      const res = await authFetch('/api/agents');
      const data = await res.json();
      if (data.agents) setAgents(data.agents);
    } catch (err) {
      console.error('Error fetching fleet agents:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgents();
  }, []);

  const handleToggleStatus = async (agentId, nextStatus) => {
    try {
      const res = await authFetch(`/api/agents/${agentId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus })
      });
      if (res.ok) fetchAgents();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">Delivery Fleet Operations & Riders</h2>
          <p className="page-subtitle">
            Monitor real-time agent availability, active assigned workload, GPS coordinates, and vehicle fleet composition.
          </p>
        </div>

        <button className="btn btn-outline" onClick={fetchAgents}>
          <RefreshCw size={14} /> Refresh Fleet
        </button>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <Users size={18} color="#3b82f6" />
            <span>Active Dispatch Agents ({agents.length})</span>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
            Loading fleet agents...
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Agent Name</th>
                  <th>Vehicle & Hub Zone</th>
                  <th>Duty Status</th>
                  <th>Active Workload</th>
                  <th>Rating</th>
                  <th>GPS Coordinates</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {agents.map(ag => (
                  <tr key={ag.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 36, height: 36, borderRadius: '50%', background: 'rgba(59, 130, 246, 0.2)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16
                        }}>
                          🛵
                        </div>
                        <div>
                          <strong style={{ color: 'var(--text-main)', fontSize: 14 }}>{ag.name}</strong>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                            <a href={`tel:${ag.phone}`} style={{ color: '#38bdf8' }}>
                              <Phone size={10} style={{ display: 'inline', marginRight: 3 }} />
                              {ag.phone}
                            </a>
                          </div>
                        </div>
                      </div>
                    </td>

                    <td>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{ag.vehicle_type || 'Bike'}</div>
                      <span className="persona-chip" style={{ fontSize: 11, marginTop: 4 }}>
                        <MapPin size={10} /> {ag.zone_name || 'All Bengaluru'}
                      </span>
                    </td>

                    <td>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '4px 10px',
                        borderRadius: 20,
                        fontSize: 11,
                        fontWeight: 700,
                        background: ag.status === 'available' ? 'rgba(16, 185, 129, 0.15)' :
                                   ag.status === 'on_duty' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                        color: ag.status === 'available' ? '#34d399' :
                               ag.status === 'on_duty' ? '#60a5fa' : '#f87171'
                      }}>
                        <span style={{
                          width: 6, height: 6, borderRadius: '50%',
                          background: 'currentColor'
                        }} />
                        {ag.status?.toUpperCase()}
                      </span>
                    </td>

                    <td>
                      <span style={{
                        fontWeight: 700,
                        fontFamily: 'var(--font-mono)',
                        color: (ag.active_orders_count || 0) > 2 ? '#f59e0b' : '#e2e8f0',
                        fontSize: 14
                      }}>
                        {ag.active_orders_count || 0} parcels
                      </span>
                    </td>

                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#f59e0b', fontWeight: 700 }}>
                        <Star size={13} fill="#f59e0b" />
                        <span>{ag.rating || 4.8}</span>
                      </div>
                    </td>

                    <td>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#94a3b8' }}>
                        {ag.current_lat?.toFixed(4)}, {ag.current_lng?.toFixed(4)}
                      </span>
                    </td>

                    <td>
                      <button
                        className={`btn btn-sm ${ag.status === 'offline' ? 'btn-success' : 'btn-outline'}`}
                        onClick={() => handleToggleStatus(ag.id, ag.status === 'offline' ? 'available' : 'offline')}
                      >
                        <Power size={11} /> {ag.status === 'offline' ? 'Set Active' : 'Set Offline'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
