import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import Package3DVisualizer from '../../components/Package3DVisualizer';
import {
  Package,
  MapPin,
  Scale,
  CreditCard,
  Building,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  Calculator
} from 'lucide-react';

export default function BookOrder({ onOrderCreated, isAdminMode = false }) {
  const { user } = useAuth();
  const { addToast } = useNotifications();

  // Zones & Areas
  const [areas, setAreas] = useState([]);
  const [loadingAreas, setLoadingAreas] = useState(true);

  // Form Fields
  const [pickupAreaId, setPickupAreaId] = useState('');
  const [pickupAddress, setPickupAddress] = useState('');
  const [dropAreaId, setDropAreaId] = useState('');
  const [dropAddress, setDropAddress] = useState('');

  const [lengthCm, setLengthCm] = useState(25);
  const [widthCm, setWidthCm] = useState(20);
  const [heightCm, setHeightCm] = useState(15);
  const [actualWeightKg, setActualWeightKg] = useState(1.5);

  const [orderType, setOrderType] = useState('B2C');
  const [paymentType, setPaymentType] = useState('PREPAID');

  // Admin on behalf fields
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');

  // Quote State
  const [quote, setQuote] = useState(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [successOrder, setSuccessOrder] = useState(null);

  // Fetch Areas on mount
  useEffect(() => {
    fetch('/api/areas')
      .then(res => res.json())
      .then(data => {
        if (data.areas && data.areas.length > 0) {
          setAreas(data.areas);
          // Set defaults
          setPickupAreaId(data.areas[0].id);
          setPickupAddress(`${data.areas[0].area_name}, Bengaluru - ${data.areas[0].pincode}`);
          if (data.areas.length > 3) {
            setDropAreaId(data.areas[3].id);
            setDropAddress(`${data.areas[3].area_name}, Bengaluru - ${data.areas[3].pincode}`);
          }
        }
      })
      .catch(e => console.error('Error fetching areas:', e))
      .finally(() => setLoadingAreas(false));
  }, []);

  // Sync address input when selecting area
  const handlePickupAreaChange = (id) => {
    setPickupAreaId(id);
    const selected = areas.find(a => a.id === id);
    if (selected) {
      setPickupAddress(`${selected.area_name}, Bengaluru - ${selected.pincode}`);
    }
  };

  const handleDropAreaChange = (id) => {
    setDropAreaId(id);
    const selected = areas.find(a => a.id === id);
    if (selected) {
      setDropAddress(`${selected.area_name}, Bengaluru - ${selected.pincode}`);
    }
  };

  // Recalculate Quote automatically whenever inputs change
  useEffect(() => {
    if (!pickupAreaId || !dropAreaId) return;

    setQuoteLoading(true);
    setQuoteError('');

    fetch('/api/orders/quote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        length_cm: lengthCm,
        width_cm: widthCm,
        height_cm: heightCm,
        actual_weight_kg: actualWeightKg,
        order_type: orderType,
        payment_type: paymentType,
        pickup_area_id: pickupAreaId,
        drop_area_id: dropAreaId
      })
    })
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          setQuoteError(data.error);
          setQuote(null);
        } else {
          setQuote(data.quote);
        }
      })
      .catch(err => {
        setQuoteError('Could not calculate pricing quote');
        setQuote(null);
      })
      .finally(() => setQuoteLoading(false));
  }, [pickupAreaId, dropAreaId, lengthCm, widthCm, heightCm, actualWeightKg, orderType, paymentType]);

  // Submit Order Creation
  const handleConfirmOrder = async (e) => {
    e.preventDefault();
    if (!quote) return;

    setSubmitting(true);
    try {
      const payload = {
        pickup_address: pickupAddress,
        pickup_area_id: pickupAreaId,
        drop_address: dropAddress,
        drop_area_id: dropAreaId,
        length_cm: lengthCm,
        width_cm: widthCm,
        height_cm: heightCm,
        actual_weight_kg: actualWeightKg,
        order_type: orderType,
        payment_type: paymentType,
        customer_name: isAdminMode ? customerName : user.name,
        customer_email: isAdminMode ? customerEmail : user.email,
        customer_phone: isAdminMode ? customerPhone : user.phone
      };

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-user-id': user.id
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to place order');

      setSuccessOrder(data.order);
      addToast({
        title: '🎉 Order Confirmed!',
        message: `Tracking code: ${data.order.tracking_code}`,
        type: 'success'
      });
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (successOrder) {
    return (
      <div className="card" style={{ maxWidth: '640px', margin: '40px auto', textAlign: 'center', padding: '40px 30px' }}>
        <div style={{
          width: 64, height: 64, borderRadius: '50%', background: 'rgba(16, 185, 129, 0.15)',
          color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px'
        }}>
          <CheckCircle size={36} />
        </div>
        <h2 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-light)', marginBottom: 8 }}>
          Shipment Booked Successfully!
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 20 }}>
          Your order has been registered in the logistics dispatch queue. Notifications have been dispatched.
        </p>

        <div style={{
          background: 'var(--bg-dark)', border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)', padding: 20, marginBottom: 28, textAlign: 'left'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ color: 'var(--text-muted)' }}>Tracking Code:</span>
            <span className="tracking-code-pill" style={{ fontSize: 14 }}>{successOrder.tracking_code}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ color: 'var(--text-muted)' }}>Billed Total:</span>
            <strong style={{ color: '#38bdf8' }}>₹{successOrder.total_charge.toFixed(2)} ({successOrder.payment_type})</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ color: 'var(--text-muted)' }}>Origin:</span>
            <span style={{ color: 'var(--text-main)', maxWidth: '60%', textAlign: 'right' }}>{successOrder.pickup_address}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-muted)' }}>Destination:</span>
            <span style={{ color: 'var(--text-main)', maxWidth: '60%', textAlign: 'right' }}>{successOrder.drop_address}</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <button
            className="btn btn-secondary"
            onClick={() => {
              setSuccessOrder(null);
            }}
          >
            Book Another Shipment
          </button>
          <button
            className="btn btn-primary"
            onClick={() => onOrderCreated && onOrderCreated(successOrder.tracking_code)}
          >
            Track Live Shipment <ArrowRight size={16} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">
            {isAdminMode ? 'Create Shipment on Behalf of Customer' : 'Book a New Shipment'}
          </h2>
          <p className="page-subtitle">
            Dynamic zone detection, volumetric weight pricing engine, and transparent rate card breakdown.
          </p>
        </div>
      </div>

      <div className="grid-cols-2" style={{ alignItems: 'start' }}>
        {/* Left Column: Form Inputs */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <Package size={18} color="#3b82f6" />
              <span>Shipment Parameters</span>
            </div>
            <span className="badge-pill" style={{ fontSize: 11, background: 'rgba(59, 130, 246, 0.1)', color: '#60a5fa', padding: '3px 8px', borderRadius: 12 }}>
              Dynamic Rate Engine
            </span>
          </div>

          <form onSubmit={handleConfirmOrder}>
            {/* If Admin Mode, show customer fields */}
            {isAdminMode && (
              <div style={{
                background: 'rgba(255,255,255,0.03)',
                padding: 16,
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-subtle)',
                marginBottom: 20
              }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#f59e0b', marginBottom: 10 }}>
                  👤 Customer Details (Admin Booking)
                </div>
                <div className="form-group">
                  <label className="form-label">Customer Name</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Ramesh Chandra"
                    value={customerName}
                    onChange={e => setCustomerName(e.target.value)}
                    required
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Customer Email</label>
                    <input
                      type="email"
                      className="form-input"
                      placeholder="client@company.com"
                      value={customerEmail}
                      onChange={e => setCustomerEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Customer Phone</label>
                    <input
                      type="tel"
                      className="form-input"
                      placeholder="+91 98765 43210"
                      value={customerPhone}
                      onChange={e => setCustomerPhone(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Order Type & Payment Selection */}
            <div className="form-row" style={{ marginBottom: 16 }}>
              <div className="form-group">
                <label className="form-label">
                  <Building size={13} style={{ display: 'inline', marginRight: 4 }} />
                  Order Classification
                </label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {['B2C', 'B2B'].map(type => (
                    <button
                      key={type}
                      type="button"
                      className={`btn btn-sm ${orderType === type ? 'btn-primary' : 'btn-outline'}`}
                      style={{ flex: 1 }}
                      onClick={() => setOrderType(type)}
                    >
                      {type === 'B2C' ? 'B2C (Retail)' : 'B2B (Enterprise)'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">
                  <CreditCard size={13} style={{ display: 'inline', marginRight: 4 }} />
                  Payment Mode
                </label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {['PREPAID', 'COD'].map(pay => (
                    <button
                      key={pay}
                      type="button"
                      className={`btn btn-sm ${paymentType === pay ? 'btn-primary' : 'btn-outline'}`}
                      style={{ flex: 1 }}
                      onClick={() => setPaymentType(pay)}
                    >
                      {pay === 'PREPAID' ? 'Prepaid (Online)' : 'Cash On Delivery'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Pickup Location */}
            <div className="form-group">
              <label className="form-label">
                <MapPin size={13} style={{ display: 'inline', marginRight: 4, color: '#10b981' }} />
                Pickup Locality & Zone
              </label>
              <select
                className="form-select"
                value={pickupAreaId}
                onChange={e => handlePickupAreaChange(e.target.value)}
              >
                {areas.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.area_name} &bull; {a.zone_name} ({a.pincode})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Full Pickup Address</label>
              <input
                type="text"
                className="form-input"
                placeholder="Door / Flat / Street address"
                value={pickupAddress}
                onChange={e => setPickupAddress(e.target.value)}
                required
              />
            </div>

            {/* Drop Location */}
            <div className="form-group">
              <label className="form-label">
                <MapPin size={13} style={{ display: 'inline', marginRight: 4, color: '#ef4444' }} />
                Destination Locality & Zone
              </label>
              <select
                className="form-select"
                value={dropAreaId}
                onChange={e => handleDropAreaChange(e.target.value)}
              >
                {areas.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.area_name} &bull; {a.zone_name} ({a.pincode})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Full Drop Address</label>
              <input
                type="text"
                className="form-input"
                placeholder="Recipient address, flat number, landmark"
                value={dropAddress}
                onChange={e => setDropAddress(e.target.value)}
                required
              />
            </div>

            {/* Package Dimensions & Actual Weight */}
            <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-main)', marginBottom: 12 }}>
                📦 Package Dimensions & Weight
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Length (cm)</label>
                  <input
                    type="number"
                    min="1"
                    step="0.5"
                    className="form-input"
                    value={lengthCm}
                    onChange={e => setLengthCm(Math.max(1, parseFloat(e.target.value) || 1))}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Width (cm)</label>
                  <input
                    type="number"
                    min="1"
                    step="0.5"
                    className="form-input"
                    value={widthCm}
                    onChange={e => setWidthCm(Math.max(1, parseFloat(e.target.value) || 1))}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Height (cm)</label>
                  <input
                    type="number"
                    min="1"
                    step="0.5"
                    className="form-input"
                    value={heightCm}
                    onChange={e => setHeightCm(Math.max(1, parseFloat(e.target.value) || 1))}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">
                    <Scale size={12} style={{ display: 'inline', marginRight: 3 }} />
                    Actual Wt (kg)
                  </label>
                  <input
                    type="number"
                    min="0.1"
                    step="0.1"
                    className="form-input"
                    value={actualWeightKg}
                    onChange={e => setActualWeightKg(Math.max(0.1, parseFloat(e.target.value) || 0.1))}
                    required
                  />
                </div>
              </div>
            </div>

            <div style={{ marginTop: 20 }}>
              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: '100%', padding: '14px' }}
                disabled={submitting || !quote}
              >
                {submitting ? 'Confirming Order...' : `Confirm & Book Shipment (₹${quote ? quote.pricing_breakdown.total_charge.toFixed(2) : '--'})`}
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: Dynamic Price Quote & 3D Package Visualizer */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* 3D Package Isometric Visualizer */}
          <Package3DVisualizer
            lengthCm={lengthCm}
            widthCm={widthCm}
            heightCm={heightCm}
            actualWeightKg={actualWeightKg}
            volumetricWeightKg={quote ? quote.volumetric_weight_kg : Math.round(((lengthCm * widthCm * heightCm) / 5000) * 100) / 100}
            billedOn={quote ? quote.billed_on : 'actual'}
          />

          {/* Pricing Breakdown Card */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">
                <Calculator size={18} color="#10b981" />
                <span>Auto-Calculated Pricing Breakdown</span>
              </div>
              {quote && (
                <span style={{
                  fontSize: 11,
                  padding: '2px 8px',
                  borderRadius: 20,
                  background: quote.is_intra_zone ? 'rgba(16, 185, 129, 0.15)' : 'rgba(14, 165, 233, 0.15)',
                  color: quote.is_intra_zone ? '#6ee7b7' : '#7dd3fc',
                  fontWeight: 700
                }}>
                  {quote.is_intra_zone ? 'INTRA-ZONE (Local)' : 'INTER-ZONE (Cross-Hub)'}
                </span>
              )}
            </div>

            {quoteLoading && (
              <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-muted)' }}>
                Recalculating charges...
              </div>
            )}

            {quoteError && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                color: '#fca5a5',
                padding: 12,
                borderRadius: 'var(--radius-sm)',
                fontSize: 13
              }}>
                {quoteError}
              </div>
            )}

            {quote && (
              <div>
                <div style={{
                  background: 'var(--bg-dark)',
                  padding: 14,
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-subtle)',
                  marginBottom: 16
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 8 }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Pickup Zone:</span>
                    <strong style={{ color: 'var(--text-main)' }}>{quote.pickup_zone.name}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 8 }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Destination Zone:</span>
                    <strong style={{ color: 'var(--text-main)' }}>{quote.drop_zone.name}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Chargeable Weight:</span>
                    <strong style={{ color: '#38bdf8' }}>
                      {quote.chargeable_weight_kg} kg ({quote.billed_on === 'volumetric' ? 'Volumetric higher' : 'Actual weight higher'})
                    </strong>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>
                      Base Freight (Up to {quote.pricing_breakdown.base_weight_limit_kg} kg):
                    </span>
                    <span style={{ fontFamily: 'var(--font-mono)' }}>
                      ₹{quote.pricing_breakdown.base_charge.toFixed(2)}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>
                      Excess Weight Surcharge:
                    </span>
                    <span style={{ fontFamily: 'var(--font-mono)' }}>
                      ₹{quote.pricing_breakdown.weight_surcharge.toFixed(2)}
                    </span>
                  </div>

                  {paymentType === 'COD' && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#f59e0b' }}>
                      <span>COD Collection Fee:</span>
                      <span style={{ fontFamily: 'var(--font-mono)' }}>
                        ₹{quote.pricing_breakdown.cod_surcharge.toFixed(2)}
                      </span>
                    </div>
                  )}

                  <div style={{
                    marginTop: 10,
                    paddingTop: 12,
                    borderTop: '1px solid var(--border-subtle)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-light)' }}>
                      Total Estimated Charge:
                    </span>
                    <span style={{ fontSize: 24, fontWeight: 800, color: '#38bdf8', fontFamily: 'var(--font-mono)' }}>
                      ₹{quote.pricing_breakdown.total_charge.toFixed(2)}
                    </span>
                  </div>
                </div>

                <div style={{
                  marginTop: 18,
                  padding: 10,
                  background: 'rgba(59, 130, 246, 0.05)',
                  border: '1px solid rgba(59, 130, 246, 0.15)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: 11,
                  color: '#94a3b8',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}>
                  <ShieldCheck size={14} color="#3b82f6" />
                  <span>
                    Rates derived strictly from active DB Rate Card ({quote.order_type}). No hardcoded values.
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
