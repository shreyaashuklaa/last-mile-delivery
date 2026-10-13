import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import {
  MapPin,
  PlusCircle,
  Trash2,
  Edit2,
  RefreshCw,
  Building,
  Navigation,
  CheckCircle,
  X
} from 'lucide-react';

export default function ZoneManager() {
  const { authFetch } = useAuth();
  const { addToast } = useNotifications();

  const [zones, setZones] = useState([]);
  const [areas, setAreas] = useState([]);
  const [loading, setLoading] = useState(true);

  // New Zone Form State
  const [isNewZoneModalOpen, setIsNewZoneModalOpen] = useState(false);
  const [zoneCode, setZoneCode] = useState('');
  const [zoneName, setZoneName] = useState('');
  const [zoneDescription, setZoneDescription] = useState('');

  // New Area Form State
  const [isNewAreaModalOpen, setIsNewAreaModalOpen] = useState(false);
  const [areaName, setAreaName] = useState('');
  const [pincode, setPincode] = useState('');
  const [selectedZoneId, setSelectedZoneId] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [zRes, aRes] = await Promise.all([
        authFetch('/api/zones'),
        authFetch('/api/areas')
      ]);
      const zData = await zRes.json();
      const aData = await aRes.json();
      if (zData.zones) setZones(zData.zones);
      if (aData.areas) setAreas(aData.areas);
    } catch (err) {
      console.error('Failed to load zones and areas:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Create Zone
  const handleCreateZone = async (e) => {
    e.preventDefault();
    try {
      const res = await authFetch('/api/zones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: zoneCode,
          name: zoneName,
          description: zoneDescription
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create zone');

      addToast({
        title: '📍 New Zone Created',
        message: `Zone ${data.zone.name} registered`,
        type: 'success'
      });
      setIsNewZoneModalOpen(false);
      setZoneCode('');
      setZoneName('');
      setZoneDescription('');
      loadData();
    } catch (err) {
      alert(err.message);
    }
  };

  // Create Area mapping
  const handleCreateArea = async (e) => {
    e.preventDefault();
    try {
      const res = await authFetch('/api/areas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          area_name: areaName,
          pincode: pincode,
          zone_id: selectedZoneId || zones[0]?.id
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create area mapping');

      addToast({
        title: '🏙️ Area Mapped to Zone',
        message: `${data.area.area_name} mapped to ${data.area.zone_name}`,
        type: 'success'
      });
      setIsNewAreaModalOpen(false);
      setAreaName('');
      setPincode('');
      loadData();
    } catch (err) {
      alert(err.message);
    }
  };

  // Delete Area
  const handleDeleteArea = async (areaId) => {
    if (!confirm('Are you sure you want to delete this locality mapping?')) return;
    try {
      const res = await authFetch(`/api/areas/${areaId}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Delete failed');
      }
      loadData();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">Logistics Hub Zones & Locality Mappings</h2>
          <p className="page-subtitle">
            Configure geographic dispatch clusters, assign municipal areas and pincodes to zones for intra- vs inter-zone pricing.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary" onClick={() => setIsNewAreaModalOpen(true)}>
            + Map New Locality / Pincode
          </button>
          <button className="btn btn-primary" onClick={() => setIsNewZoneModalOpen(true)}>
            + Create New Hub Zone
          </button>
        </div>
      </div>

      <div className="grid-cols-2" style={{ alignItems: 'start' }}>
        {/* Hub Zones Column */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <MapPin size={18} color="#3b82f6" />
              <span>Registered Hub Zones ({zones.length})</span>
            </div>
            <button className="btn btn-sm btn-outline" onClick={loadData}>
              <RefreshCw size={12} />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {zones.map(z => (
              <div
                key={z.id}
                style={{
                  background: 'var(--bg-dark)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  padding: 16,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="tracking-code-pill" style={{ fontSize: 12 }}>{z.code}</span>
                    <strong style={{ fontSize: 15, color: 'var(--text-main)' }}>{z.name}</strong>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
                    {z.description || 'Logistics operations node'}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6, display: 'flex', gap: 12 }}>
                    <span>🏙️ {z.area_count || 0} mapped localities</span>
                    <span>🛵 {z.agent_count || 0} active fleet riders</span>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <span style={{
                    fontSize: 11,
                    background: 'rgba(59, 130, 246, 0.1)',
                    color: '#60a5fa',
                    padding: '3px 8px',
                    borderRadius: 12,
                    fontWeight: 600
                  }}>
                    Lat: {z.center_lat?.toFixed(2)}, Lng: {z.center_lng?.toFixed(2)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Locality & Pincode Mappings Column */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <Building size={18} color="#10b981" />
              <span>Locality & Pincode Mappings ({areas.length})</span>
            </div>
            <button className="btn btn-sm btn-primary" onClick={() => setIsNewAreaModalOpen(true)}>
              + Add Locality
            </button>
          </div>

          <div className="table-responsive" style={{ maxHeight: 520, overflowY: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Area / Locality</th>
                  <th>Pincode</th>
                  <th>Assigned Zone</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {areas.map(a => (
                  <tr key={a.id}>
                    <td>
                      <strong style={{ color: 'var(--text-main)' }}>{a.area_name}</strong>
                    </td>
                    <td>
                      <span style={{ fontFamily: 'var(--font-mono)', color: '#38bdf8' }}>{a.pincode}</span>
                    </td>
                    <td>
                      <span className="persona-chip" style={{ fontSize: 11 }}>
                        {a.zone_name}
                      </span>
                    </td>
                    <td>
                      <button
                        className="icon-btn"
                        style={{ width: 28, height: 28, color: '#ef4444' }}
                        onClick={() => handleDeleteArea(a.id)}
                        title="Remove area mapping"
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* New Zone Modal */}
      {isNewZoneModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsNewZoneModalOpen(false)}>
          <div className="modal-window" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Create Logistics Zone</div>
              <button className="modal-close-btn" onClick={() => setIsNewZoneModalOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateZone}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Zone Code (Unique, e.g. BLR-CENTRAL)</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="BLR-AIRPORT"
                    value={zoneCode}
                    onChange={e => setZoneCode(e.target.value.toUpperCase())}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Zone Display Name</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Airport & Devanahalli Hub"
                    value={zoneName}
                    onChange={e => setZoneName(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Hub Coverage Description</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Covers North Outer Ring, Airport Road..."
                    value={zoneDescription}
                    onChange={e => setZoneDescription(e.target.value)}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsNewZoneModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Hub Zone
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Area Modal */}
      {isNewAreaModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsNewAreaModalOpen(false)}>
          <div className="modal-window" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Map Locality to Logistics Zone</div>
              <button className="modal-close-btn" onClick={() => setIsNewAreaModalOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateArea}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Locality / Area Name</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Bellandur Green Glen Layout"
                    value={areaName}
                    onChange={e => setAreaName(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Postal Pincode</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="560103"
                    value={pincode}
                    onChange={e => setPincode(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Map to Hub Zone</label>
                  <select
                    className="form-select"
                    value={selectedZoneId}
                    onChange={e => setSelectedZoneId(e.target.value)}
                    required
                  >
                    {zones.map(z => (
                      <option key={z.id} value={z.id}>{z.name} ({z.code})</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsNewAreaModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Locality Mapping
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
