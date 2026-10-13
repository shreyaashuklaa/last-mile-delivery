import React, { useState } from 'react';
import { useNotifications } from '../context/NotificationContext';
import { Mail, MessageSquare, ExternalLink, X, CheckCircle, AlertTriangle } from 'lucide-react';

export default function NotificationCenterModal() {
  const { isModalOpen, closeNotificationModal, notifications } = useNotifications();
  const [selectedNotif, setSelectedNotif] = useState(null);
  const [filterChannel, setFilterChannel] = useState('ALL');

  if (!isModalOpen) return null;

  const filtered = notifications.filter(n => {
    if (filterChannel === 'ALL') return true;
    return n.channel === filterChannel;
  });

  return (
    <div className="modal-backdrop" onClick={closeNotificationModal}>
      <div className="modal-window" style={{ maxWidth: '820px' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: 36, height: 36, borderRadius: 8, background: 'rgba(59, 130, 246, 0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#60a5fa'
            }}>
              <Mail size={18} />
            </div>
            <div>
              <div className="modal-title">Live Dispatch Notifications Center</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                Real-time multi-channel audit trail (Customer Email & SMS)
              </div>
            </div>
          </div>
          <button className="modal-close-btn" onClick={closeNotificationModal}>
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', gap: '8px' }}>
          {['ALL', 'EMAIL', 'SMS'].map(ch => (
            <button
              key={ch}
              className={`btn btn-sm ${filterChannel === ch ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setFilterChannel(ch)}
            >
              {ch === 'ALL' && 'All Dispatches'}
              {ch === 'EMAIL' && 'Emails Only'}
              {ch === 'SMS' && 'SMS Text Only'}
              <span style={{
                background: 'rgba(255,255,255,0.15)',
                padding: '1px 6px',
                borderRadius: 10,
                fontSize: 11,
                marginLeft: 4
              }}>
                {ch === 'ALL' ? notifications.length : notifications.filter(n => n.channel === ch).length}
              </span>
            </button>
          ))}
        </div>

        <div className="modal-body" style={{ display: 'grid', gridTemplateColumns: selectedNotif ? '1fr 1.2fr' : '1fr', gap: '20px' }}>
          {/* Notification List */}
          <div style={{ maxHeight: '480px', overflowY: 'auto', paddingRight: '6px' }}>
            {filtered.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
                No notifications logged yet.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {filtered.map(notif => {
                  const isSelected = selectedNotif?.id === notif.id;
                  const isEmail = notif.channel === 'EMAIL';

                  return (
                    <div
                      key={notif.id}
                      onClick={() => setSelectedNotif(notif)}
                      style={{
                        padding: '12px 14px',
                        borderRadius: 'var(--radius-sm)',
                        background: isSelected ? 'var(--bg-card-hover)' : 'var(--bg-dark)',
                        border: `1px solid ${isSelected ? 'var(--primary)' : 'var(--border-subtle)'}`,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          {isEmail ? (
                            <span style={{ color: '#60a5fa', fontSize: 11, display: 'flex', alignItems: 'center', gap: 3 }}>
                              <Mail size={12} /> EMAIL
                            </span>
                          ) : (
                            <span style={{ color: '#34d399', fontSize: 11, display: 'flex', alignItems: 'center', gap: 3 }}>
                              <MessageSquare size={12} /> SMS
                            </span>
                          )}
                          <span className="tracking-code-pill" style={{ fontSize: 11 }}>
                            {notif.tracking_code || 'General'}
                          </span>
                        </div>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                          {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-main)', marginBottom: 4 }}>
                        {notif.subject || `SMS to ${notif.recipient_phone || 'Customer'}`}
                      </div>

                      <div style={{ fontSize: 12, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {notif.content_text}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Detailed Preview Column */}
          {selectedNotif && (
            <div style={{
              background: 'var(--bg-dark)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              maxHeight: '480px',
              overflowY: 'auto'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, borderBottom: '1px solid var(--border-subtle)', paddingBottom: 8 }}>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>RECIPIENT</div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>
                    {selectedNotif.recipient_email || selectedNotif.recipient_phone}
                  </div>
                </div>
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: 11,
                  color: '#34d399',
                  background: 'rgba(16, 185, 129, 0.1)',
                  padding: '3px 8px',
                  borderRadius: 20
                }}>
                  <CheckCircle size={12} /> DELIVERED
                </div>
              </div>

              {selectedNotif.channel === 'EMAIL' && selectedNotif.content_html ? (
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8 }}>
                    <strong>Subject:</strong> {selectedNotif.subject}
                  </div>
                  <iframe
                    title="Rendered Email Preview"
                    srcDoc={selectedNotif.content_html}
                    style={{
                      width: '100%',
                      height: '340px',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 8,
                      background: '#0f172a'
                    }}
                  />
                </div>
              ) : (
                <div style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 8,
                  padding: 16,
                  marginTop: 10
                }}>
                  <div style={{ fontSize: 11, color: '#38bdf8', marginBottom: 6, fontWeight: 600 }}>
                    📱 TRANSACTIONAL SMS TEXT
                  </div>
                  <div style={{ fontSize: 14, color: 'var(--text-main)', lineHeight: 1.5, fontFamily: 'var(--font-mono)' }}>
                    {selectedNotif.content_text}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={closeNotificationModal}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
