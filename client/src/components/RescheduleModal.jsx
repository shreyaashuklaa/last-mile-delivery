import React, { useState } from 'react';
import { Calendar, Clock, AlertTriangle, X, CheckCircle, RefreshCw } from 'lucide-react';

export default function RescheduleModal({ order, isOpen, onClose, onRescheduled }) {
  if (!isOpen || !order) return null;

  // Calculate default tomorrow date
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split('T')[0];

  const [date, setDate] = useState(minDate);
  const [timeSlot, setTimeSlot] = useState('Morning (09:00 AM - 01:00 PM)');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const timeSlots = [
    'Morning (09:00 AM - 01:00 PM)',
    'Afternoon (01:00 PM - 05:00 PM)',
    'Evening (05:00 PM - 08:30 PM)'
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!date) {
      setError('Please select a delivery date.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch(`/api/orders/${order.id}/reschedule`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-user-id': order.customer_id
        },
        body: JSON.stringify({
          reschedule_date: date,
          reschedule_time_slot: timeSlot,
          reschedule_notes: notes || 'Customer requested reschedule'
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reschedule');

      if (onRescheduled) onRescheduled(data.order);
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
              width: 36, height: 36, borderRadius: 8, background: 'rgba(239, 68, 68, 0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444'
            }}>
              <RefreshCw size={18} />
            </div>
            <div>
              <div className="modal-title">Reschedule Delivery Attempt</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                Shipment #{order.tracking_code}
              </div>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {/* Failure Reason Notice */}
            <div style={{
              background: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              borderRadius: 'var(--radius-sm)',
              padding: 14,
              marginBottom: 18,
              display: 'flex',
              gap: 10
            }}>
              <AlertTriangle size={18} color="#ef4444" style={{ flexShrink: 0, marginTop: 2 }} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#fca5a5' }}>
                  Previous Attempt Unsuccessful
                </div>
                <div style={{ fontSize: 12, color: '#e2e8f0', marginTop: 2 }}>
                  <strong>Reason:</strong> {order.failure_reason || 'Customer Unavailable'}
                </div>
                {order.failure_notes && (
                  <div style={{ fontSize: 11, color: '#cbd5e1', marginTop: 2 }}>
                    <em>"{order.failure_notes}"</em>
                  </div>
                )}
              </div>
            </div>

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
              <label className="form-label">
                <Calendar size={13} style={{ display: 'inline', marginRight: 4 }} />
                Select Preferred Date
              </label>
              <input
                type="date"
                className="form-input"
                min={minDate}
                value={date}
                onChange={e => setDate(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                <Clock size={13} style={{ display: 'inline', marginRight: 4 }} />
                Preferred Delivery Slot
              </label>
              <select
                className="form-select"
                value={timeSlot}
                onChange={e => setTimeSlot(e.target.value)}
              >
                {timeSlots.map(slot => (
                  <option key={slot} value={slot}>{slot}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">
                Special Delivery Instructions (Optional)
              </label>
              <textarea
                className="form-textarea"
                rows="3"
                placeholder="e.g., Leave package at front desk security, or call 5 mins prior to arrival..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
              />
            </div>

            <div style={{
              background: 'rgba(59, 130, 246, 0.08)',
              border: '1px solid rgba(59, 130, 246, 0.2)',
              borderRadius: 'var(--radius-sm)',
              padding: 12,
              fontSize: 12,
              color: '#93c5fd',
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}>
              <CheckCircle size={16} color="#60a5fa" style={{ flexShrink: 0 }} />
              <span>
                Once submitted, a delivery partner will be automatically reassigned for your new chosen delivery window.
              </span>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Rescheduling...' : 'Confirm New Delivery Date'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
