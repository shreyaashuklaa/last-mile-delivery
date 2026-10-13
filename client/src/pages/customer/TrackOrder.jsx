import React, { useState, useEffect } from 'react';
import DeliveryMap from '../../components/DeliveryMap';
import TrackingTimeline from '../../components/TrackingTimeline';
import RescheduleModal from '../../components/RescheduleModal';
import {
  Search,
  Truck,
  Package,
  MapPin,
  Clock,
  Phone,
  Star,
  AlertTriangle,
  RefreshCw,
  CheckCircle,
  Copy
} from 'lucide-react';

export default function TrackOrder({ initialTrackingCode = 'LMD-2026-9041' }) {
  const [code, setCode] = useState(initialTrackingCode);
  const [searchInput, setSearchInput] = useState(initialTrackingCode);
  const [orderData, setOrderData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isRescheduleOpen, setIsRescheduleOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchTrackingDetails = async (trackingCodeToFetch) => {
    if (!trackingCodeToFetch) return;
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`/api/orders/track/${encodeURIComponent(trackingCodeToFetch.trim())}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Tracking details not found');

      setOrderData(data);
      setCode(data.order.tracking_code);
      setSearchInput(data.order.tracking_code);
    } catch (err) {
      setError(err.message);
      setOrderData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialTrackingCode) {
      fetchTrackingDetails(initialTrackingCode);
    }
  }, [initialTrackingCode]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchInput.trim()) {
      fetchTrackingDetails(searchInput.trim());
    }
  };

  const copyToClipboard = () => {
    if (orderData?.order?.tracking_code) {
      navigator.clipboard.writeText(orderData.order.tracking_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">Live Shipment Tracker</h2>
          <p className="page-subtitle">
            Real-time GPS routing, immutable delivery event timeline, and agent dispatch details.
          </p>
        </div>
      </div>

      {/* Tracking Input Bar */}
      <div className="card" style={{ marginBottom: 24, padding: 18 }}>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <Search size={20} color="#3b82f6" />
          <input
            type="text"
            className="form-input"
            style={{ flex: 1 }}
            placeholder="Enter tracking code (e.g. LMD-2026-9041, LMD-2026-7812)..."
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
          />
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Locating...' : 'Track Package'}
          </button>
        </form>

        {/* Quick demo links */}
        <div style={{ display: 'flex', gap: 8, marginTop: 12, alignItems: 'center', fontSize: 12, color: 'var(--text-muted)' }}>
          <span>Try quick demo codes:</span>
          {['LMD-2026-9041', 'LMD-2026-7812', 'LMD-2026-6219', 'LMD-2026-5540'].map(sampleCode => (
            <button
              key={sampleCode}
              type="button"
              className="persona-chip"
              style={{ padding: '2px 8px', fontSize: 11 }}
              onClick={() => {
                setSearchInput(sampleCode);
                fetchTrackingDetails(sampleCode);
              }}
            >
              {sampleCode}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.12)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          color: '#fca5a5',
          padding: 16,
          borderRadius: 'var(--radius-md)',
          marginBottom: 24,
          display: 'flex',
          gap: 10,
          alignItems: 'center'
        }}>
          <AlertTriangle size={20} color="#ef4444" />
          <span>{error}</span>
        </div>
      )}

      {orderData && orderData.order && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Failed Notice with Reschedule Banner */}
          {orderData.order.status === 'FAILED' && (
            <div style={{
              background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.2) 0%, rgba(185, 28, 28, 0.2) 100%)',
              border: '1px solid rgba(239, 68, 68, 0.5)',
              borderRadius: 'var(--radius-lg)',
              padding: '20px 24px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 16
            }}>
              <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                <div style={{
                  width: 44, height: 44, borderRadius: '50%', background: '#ef4444',
                  color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <AlertTriangle size={24} />
                </div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#fee2e2' }}>
                    Delivery Attempt Failed: {orderData.order.failure_reason || 'Customer Unavailable'}
                  </div>
                  <div style={{ fontSize: 13, color: '#fca5a5', marginTop: 2 }}>
                    {orderData.order.failure_notes || 'Our agent was unable to deliver. You can reschedule for a new date.'}
                  </div>
                </div>
              </div>

              <button
                className="btn btn-danger"
                style={{ padding: '10px 20px', fontWeight: 700 }}
                onClick={() => setIsRescheduleOpen(true)}
              >
                <RefreshCw size={16} /> Reschedule Delivery Now
              </button>
            </div>
          )}

          {/* Rescheduled Notice Banner */}
          {orderData.order.status === 'RESCHEDULED' && (
            <div style={{
              background: 'rgba(236, 72, 153, 0.15)',
              border: '1px solid rgba(236, 72, 153, 0.4)',
              borderRadius: 'var(--radius-lg)',
              padding: '16px 24px',
              display: 'flex',
              alignItems: 'center',
              gap: 12
            }}>
              <CheckCircle size={22} color="#f472b6" />
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#fbcfe8' }}>
                  Delivery Successfully Rescheduled
                </div>
                <div style={{ fontSize: 13, color: '#f472b6' }}>
                  Scheduled Date: <strong>{orderData.order.reschedule_date}</strong> &bull; Slot: <strong>{orderData.order.reschedule_time_slot}</strong>
                </div>
              </div>
            </div>
          )}

          {/* Order Snapshot Card */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, marginBottom: 20 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span className="tracking-code-pill" style={{ fontSize: 18, padding: '4px 12px' }}>
                    {orderData.order.tracking_code}
                  </span>
                  <button
                    className="icon-btn"
                    style={{ width: 30, height: 30 }}
                    onClick={copyToClipboard}
                    title="Copy Tracking Code"
                  >
                    <Copy size={14} />
                  </button>
                  {copied && <span style={{ fontSize: 12, color: '#34d399' }}>Copied!</span>}
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 6 }}>
                  Booked on {new Date(orderData.order.created_at).toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' })}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span className={`status-badge status-${orderData.order.status}`} style={{ fontSize: 13, padding: '6px 14px' }}>
                  <span className="pulse-indicator" />
                  {orderData.order.status.replace(/_/g, ' ')}
                </span>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#38bdf8', fontFamily: 'var(--font-mono)' }}>
                    ₹{orderData.order.total_charge.toFixed(2)}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {orderData.order.payment_type} &bull; {orderData.order.order_type}
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Addresses */}
            <div className="grid-cols-2" style={{ background: 'var(--bg-dark)', padding: 18, borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#34d399', fontWeight: 700, marginBottom: 4 }}>
                  <MapPin size={14} /> ORIGIN / PICKUP
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-main)' }}>
                  {orderData.order.pickup_zone_name || 'Pickup Zone'}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                  {orderData.order.pickup_address}
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#f87171', fontWeight: 700, marginBottom: 4 }}>
                  <MapPin size={14} /> DESTINATION / DROPOFF
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-main)' }}>
                  {orderData.order.drop_zone_name || 'Drop Zone'}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                  {orderData.order.drop_address}
                </div>
              </div>
            </div>
          </div>

          {/* Map & Agent Grid */}
          <div className="grid-cols-2" style={{ alignItems: 'start' }}>
            {/* Live Map */}
            <div className="card">
              <div className="card-header">
                <div className="card-title">
                  <MapPin size={18} color="#3b82f6" />
                  <span>Interactive Route & GPS Location</span>
                </div>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                  Live Leaflet Map
                </span>
              </div>

              <DeliveryMap
                pickupLat={orderData.order.pickup_lat}
                pickupLng={orderData.order.pickup_lng}
                pickupLabel={orderData.order.pickup_address}
                dropLat={orderData.order.drop_lat}
                dropLng={orderData.order.drop_lng}
                dropLabel={orderData.order.drop_address}
                agentLat={orderData.order.agent_lat}
                agentLng={orderData.order.agent_lng}
                agentName={orderData.order.agent_name || 'Assigned Partner'}
                status={orderData.order.status}
              />

              {/* Delivery Agent Information Card */}
              {orderData.order.agent_name ? (
                <div style={{
                  marginTop: 18,
                  padding: 14,
                  background: 'var(--bg-dark)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: '50%', background: 'rgba(59, 130, 246, 0.2)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18
                    }}>
                      🛵
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-main)' }}>
                        {orderData.order.agent_name}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span>{orderData.order.agent_vehicle || 'Delivery Bike'}</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 2, color: '#f59e0b' }}>
                          <Star size={11} fill="#f59e0b" /> {orderData.order.agent_rating || 4.8}
                        </span>
                      </div>
                    </div>
                  </div>

                  <a
                    href={`tel:${orderData.order.agent_phone || ''}`}
                    className="btn btn-sm btn-outline"
                    style={{ gap: 4 }}
                  >
                    <Phone size={12} /> {orderData.order.agent_phone || 'Contact Rider'}
                  </a>
                </div>
              ) : (
                <div style={{ marginTop: 14, fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>
                  Delivery agent will be assigned shortly by logistics dispatch.
                </div>
              )}
            </div>

            {/* Event Timeline */}
            <div className="card">
              <div className="card-header">
                <div className="card-title">
                  <Clock size={18} color="#8b5cf6" />
                  <span>Immutable Audit Journey Timeline</span>
                </div>
                <button
                  className="btn btn-sm btn-outline"
                  onClick={() => fetchTrackingDetails(code)}
                >
                  <RefreshCw size={12} /> Sync
                </button>
              </div>

              <TrackingTimeline
                events={orderData.events}
                currentStatus={orderData.order.status}
                onRescheduleClick={() => setIsRescheduleOpen(true)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Reschedule Modal */}
      <RescheduleModal
        order={orderData?.order}
        isOpen={isRescheduleOpen}
        onClose={() => setIsRescheduleOpen(false)}
        onRescheduled={() => {
          setIsRescheduleOpen(false);
          fetchTrackingDetails(code);
        }}
      />
    </div>
  );
}
