import React from 'react';
import { Check, Clock, Truck, Package, MapPin, AlertCircle, Calendar, RefreshCw, User } from 'lucide-react';

const STATUS_ICONS = {
  CREATED: Package,
  ASSIGNED: User,
  PICKED_UP: Package,
  IN_TRANSIT: Truck,
  OUT_FOR_DELIVERY: MapPin,
  DELIVERED: Check,
  FAILED: AlertCircle,
  RESCHEDULED: Calendar
};

export default function TrackingTimeline({ events = [], currentStatus = 'CREATED', onRescheduleClick = null }) {
  if (!events || events.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-muted)' }}>
        No tracking events recorded yet.
      </div>
    );
  }

  return (
    <div className="timeline-container">
      {events.map((evt, idx) => {
        const IconComponent = STATUS_ICONS[evt.status] || Clock;
        const isLatest = idx === events.length - 1;
        const isFailed = evt.status === 'FAILED';
        const isDelivered = evt.status === 'DELIVERED';

        let nodeClass = 'completed';
        if (isLatest) nodeClass = isFailed ? 'failed' : 'active';

        return (
          <div key={evt.id || idx} className={`timeline-step ${nodeClass}`}>
            {idx < events.length - 1 && <div className="timeline-line" />}

            <div className="timeline-node">
              <IconComponent size={16} />
            </div>

            <div className="timeline-content">
              <div className="timeline-heading">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="timeline-status">
                    {evt.status.replace(/_/g, ' ')}
                  </span>
                  {isLatest && (
                    <span className={`status-badge status-${evt.status}`} style={{ fontSize: 10, padding: '2px 8px' }}>
                      <span className="pulse-indicator" /> Current Status
                    </span>
                  )}
                </div>
                <span className="timeline-time">
                  {new Date(evt.created_at).toLocaleString([], {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>

              <div className="timeline-desc">
                {evt.notes}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 6, flexWrap: 'wrap', gap: 6 }}>
                <span className="timeline-actor">
                  <User size={11} />
                  <span>{evt.actor_name} ({evt.actor_role})</span>
                </span>

                {isFailed && isLatest && onRescheduleClick && (
                  <button
                    className="btn btn-sm btn-danger"
                    onClick={onRescheduleClick}
                    style={{ marginTop: 4 }}
                  >
                    <RefreshCw size={12} /> Reschedule Delivery
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
