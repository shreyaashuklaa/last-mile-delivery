import React, { useState } from 'react';
import { Truck, AlertTriangle, CheckCircle, MapPin, X } from 'lucide-react';

const FAILURE_REASONS = [
  'Customer Unavailable / Door Locked',
  'Incorrect Drop Address / Pincode',
  'Customer Refused Delivery',
  'Customer Requested Reschedule',
  'Access Restricted / Security Denial',
  'Payment Not Ready (COD)',
  'Severe Weather / Road Blockage'
];

export default function AgentStatusUpdateModal({ order, isOpen, onClose, onUpdated }) {
  if (!isOpen || !order) return null;

  const [status, setStatus] = useState(
    order.status === 'ASSIGNED' ? 'PICKED_UP' :
    order.status === 'PICKED_UP' ? 'IN_TRANSIT' :
    order.status === 'IN_TRANSIT' ? 'OUT_FOR_DELIVERY' :
    order.status === 'OUT_FOR_DELIVERY' ? 'DELIVERED' : 'DELIVERED'
  );
  const [failureReason, setFailureReason] = useState(FAILURE_REASONS[0]);
  const [failureNotes, setFailureNotes] = useState('');
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const allowedStatuses = [
    { value: 'PICKED_UP', label: 'Picked Up (Collected from origin)' },
    { value: 'IN_TRANSIT', label: 'In Transit (Moving towards delivery node)' },
    { value: 'OUT_FOR_DELIVERY', label: 'Out for Delivery (Rider in customer area)' },
    { value: 'DELIVERED', label: 'Delivered (Handed to recipient)' },
    { value: 'FAILED', label: 'Delivery Failed (Customer unavailable / issue)' }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (status === 'FAILED' && !failureReason) {
      setError('A failure reason is mandatory when marking as failed.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch(`/api/orders/${order.id}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-user-id': 'usr_agent_1' // agent ID
        },
        body: JSON.stringify({
          status,
          failure_reason: status === 'FAILED' ? failureReason : null,
          failure_notes: status === 'FAILED' ? failureNotes : null,
          notes: status === 'DELIVERED' ? (deliveryNotes || 'Successfully delivered to customer') :
                 status === 'FAILED' ? `Delivery failed: ${failureReason}. ${failureNotes}` :
                 `Package status updated to ${status}`
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update order status');

      if (onUpdated) onUpdated(data.order);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-window" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 8, background: 'rgba(59, 130, 246, 0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#60a5fa'
            }}>
              <Truck size={18} />
            </div>
            <div>
              <div className="modal-title">Update Delivery Status</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                Shipment #{order.tracking_code} &bull; Current: <strong>{order.status}</strong>
              </div>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.15)',
                color: '#fca5a5',
                padding: '10px 14px',
                borderRadius: 'var(--radius-sm)',
                marginBottom: 14,
                fontSize: 13
              }}>
                {error}
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Select Next Status Milestone</label>
              <select
                className="form-select"
                value={status}
                onChange={e => setStatus(e.target.value)}
              >
                {allowedStatuses.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>

            {/* If Failed is selected */}
            {status === 'FAILED' && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: 'var(--radius-sm)',
                padding: 16,
                marginBottom: 16
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#fca5a5', fontSize: 13, fontWeight: 700, marginBottom: 12 }}>
                  <AlertTriangle size={16} />
                  <span>Failure Information (Mandatory for Reschedule Flow)</span>
                </div>

                <div className="form-group">
                  <label className="form-label">Primary Failure Reason</label>
                  <select
                    className="form-select"
                    value={failureReason}
                    onChange={e => setFailureReason(e.target.value)}
                  >
                    {FAILURE_REASONS.map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Field Agent Notes</label>
                  <textarea
                    className="form-textarea"
                    rows="2"
                    placeholder="Details about the attempt (e.g. called twice at 4:15 PM, gate locked)..."
                    value={failureNotes}
                    onChange={e => setFailureNotes(e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* If Delivered is selected */}
            {status === 'DELIVERED' && (
              <div className="form-group">
                <label className="form-label">Proof of Delivery / Handover Note</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Received by Rahul, signed at door"
                  value={deliveryNotes}
                  onChange={e => setDeliveryNotes(e.target.value)}
                />
              </div>
            )}

            {/* Non-terminal status notes */}
            {status !== 'FAILED' && status !== 'DELIVERED' && (
              <div className="form-group">
                <label className="form-label">Dispatch Notes (Optional)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Scanned at Indiranagar hub sorting line"
                  value={deliveryNotes}
                  onChange={e => setDeliveryNotes(e.target.value)}
                />
              </div>
            )}

            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              ℹ️ Setting status will immediately log an immutable event in the audit timeline and dispatch notifications to the customer.
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button
              type="submit"
              className={`btn ${status === 'FAILED' ? 'btn-danger' : 'btn-primary'}`}
              disabled={loading}
            >
              {loading ? 'Submitting...' : `Submit Status: ${status}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
