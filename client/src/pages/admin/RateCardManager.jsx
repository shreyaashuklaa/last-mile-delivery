import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import {
  Sliders,
  DollarSign,
  Building,
  CheckCircle,
  Save,
  RefreshCw,
  Calculator,
  ShieldCheck,
  Scale
} from 'lucide-react';

export default function RateCardManager() {
  const { authFetch } = useAuth();
  const { addToast } = useNotifications();

  const [rateCards, setRateCards] = useState([]);
  const [activeTab, setActiveTab] = useState('B2C'); // 'B2C' | 'B2B'
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form fields for active rate card
  const [intraBase, setIntraBase] = useState(50);
  const [intraPerKg, setIntraPerKg] = useState(20);
  const [interBase, setInterBase] = useState(90);
  const [interPerKg, setInterPerKg] = useState(35);
  const [baseLimit, setBaseLimit] = useState(1.0);
  const [codFlat, setCodFlat] = useState(30);
  const [codPercent, setCodPercent] = useState(1.5);

  const fetchRateCards = async () => {
    setLoading(true);
    try {
      const res = await authFetch('/api/rate-cards');
      const data = await res.json();
      if (data.rateCards) {
        setRateCards(data.rateCards);
        populateActiveCard(data.rateCards, activeTab);
      }
    } catch (err) {
      console.error('Error fetching rate cards:', err);
    } finally {
      setLoading(false);
    }
  };

  const populateActiveCard = (cards, tab) => {
    const card = cards.find(c => c.order_type === tab);
    if (card) {
      setIntraBase(card.intra_zone_base_rate);
      setIntraPerKg(card.intra_zone_per_kg);
      setInterBase(card.inter_zone_base_rate);
      setInterPerKg(card.inter_zone_per_kg);
      setBaseLimit(card.base_weight_limit_kg);
      setCodFlat(card.cod_surcharge_flat);
      setCodPercent(card.cod_surcharge_percent);
    }
  };

  useEffect(() => {
    fetchRateCards();
  }, []);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    populateActiveCard(rateCards, tab);
  };

  const handleSaveRateCard = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await authFetch(`/api/rate-cards/${activeTab}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          intra_zone_base_rate: parseFloat(intraBase),
          intra_zone_per_kg: parseFloat(intraPerKg),
          inter_zone_base_rate: parseFloat(interBase),
          inter_zone_per_kg: parseFloat(interPerKg),
          base_weight_limit_kg: parseFloat(baseLimit),
          cod_surcharge_flat: parseFloat(codFlat),
          cod_surcharge_percent: parseFloat(codPercent)
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update rate card');

      addToast({
        title: `💾 Rate Card Saved (${activeTab})`,
        message: `Pricing formula updated dynamically in SQLite database`,
        type: 'success'
      });
      fetchRateCards();
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">Dynamic Rate Card Configurator</h2>
          <p className="page-subtitle">
            Configure intra-zone and inter-zone tariffs, weight tiers, and COD surcharge rules per order type without code changes.
          </p>
        </div>

        <button className="btn btn-outline" onClick={fetchRateCards}>
          <RefreshCw size={14} /> Reload Cards
        </button>
      </div>

      {/* Order Type Tabs */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
        {['B2C', 'B2B'].map(tab => (
          <button
            key={tab}
            className={`btn ${activeTab === tab ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '12px 24px', fontSize: 15 }}
            onClick={() => handleTabChange(tab)}
          >
            <Building size={16} />
            {tab === 'B2C' ? 'B2C Retail Rate Card' : 'B2B Enterprise Rate Card'}
          </button>
        ))}
      </div>

      <div className="grid-cols-2" style={{ alignItems: 'start' }}>
        {/* Rate Card Form */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <Sliders size={18} color="#3b82f6" />
              <span>Configure {activeTab} Tariffs & Surcharges</span>
            </div>
            <span className="tracking-code-pill" style={{ fontSize: 11 }}>
              Active in DB: {activeTab}
            </span>
          </div>

          <form onSubmit={handleSaveRateCard}>
            {/* Base Weight Limit */}
            <div className="form-group">
              <label className="form-label">
                <Scale size={13} style={{ display: 'inline', marginRight: 4 }} />
                Base Weight Limit Included (kg)
              </label>
              <input
                type="number"
                step="0.5"
                min="0.5"
                className="form-input"
                value={baseLimit}
                onChange={e => setBaseLimit(e.target.value)}
                required
              />
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                Shipments up to this chargeable weight are billed at the base tariff. Excess weight triggers per-kg surcharge.
              </div>
            </div>

            {/* Intra-Zone Rates */}
            <div style={{
              background: 'rgba(16, 185, 129, 0.05)',
              border: '1px solid rgba(16, 185, 129, 0.2)',
              borderRadius: 'var(--radius-sm)',
              padding: 16,
              marginBottom: 16
            }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#34d399', marginBottom: 10 }}>
                🏙️ Intra-Zone Rates (Origin & Drop in Same Hub)
              </div>
              <div className="form-row">
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Base Rate (₹)</label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    className="form-input"
                    value={intraBase}
                    onChange={e => setIntraBase(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Per Additional Kg (₹)</label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    className="form-input"
                    value={intraPerKg}
                    onChange={e => setIntraPerKg(e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Inter-Zone Rates */}
            <div style={{
              background: 'rgba(59, 130, 246, 0.05)',
              border: '1px solid rgba(59, 130, 246, 0.2)',
              borderRadius: 'var(--radius-sm)',
              padding: 16,
              marginBottom: 16
            }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#60a5fa', marginBottom: 10 }}>
                🛣️ Inter-Zone Rates (Cross-Hub Long Haul)
              </div>
              <div className="form-row">
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Base Rate (₹)</label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    className="form-input"
                    value={interBase}
                    onChange={e => setInterBase(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Per Additional Kg (₹)</label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    className="form-input"
                    value={interPerKg}
                    onChange={e => setInterPerKg(e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Cash on Delivery Surcharges */}
            <div style={{
              background: 'rgba(245, 158, 11, 0.05)',
              border: '1px solid rgba(245, 158, 11, 0.2)',
              borderRadius: 'var(--radius-sm)',
              padding: 16,
              marginBottom: 20
            }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#fbbf24', marginBottom: 10 }}>
                💵 Cash on Delivery (COD) Surcharge Rules
              </div>
              <div className="form-row">
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Flat Handling Fee (₹)</label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    className="form-input"
                    value={codFlat}
                    onChange={e => setCodFlat(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Percentage Fee (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    className="form-input"
                    value={codPercent}
                    onChange={e => setCodPercent(e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', padding: '12px' }}
              disabled={saving}
            >
              <Save size={16} />
              {saving ? 'Updating Database...' : `Save ${activeTab} Rate Card`}
            </button>
          </form>
        </div>

        {/* Live Formula Preview & Simulator */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="card">
            <div className="card-header">
              <div className="card-title">
                <Calculator size={18} color="#34d399" />
                <span>Live Tariff Simulator ({activeTab})</span>
              </div>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                Real-Time Preview
              </span>
            </div>

            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 14 }}>
              Sample scenarios under the current <strong>{activeTab}</strong> parameters:
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Scenario 1: Intra-zone 0.8kg prepaid */}
              <div style={{
                background: 'var(--bg-dark)',
                padding: 14,
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-subtle)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong>Local Document (0.8 kg &bull; Prepaid)</strong>
                  <span style={{ color: '#34d399', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>
                    ₹{parseFloat(intraBase).toFixed(2)}
                  </span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                  Intra-zone &le; {baseLimit}kg: Base flat rate applied.
                </div>
              </div>

              {/* Scenario 2: Intra-zone 3.5kg COD */}
              {(() => {
                const chargeable = 3.5;
                const extra = Math.max(0, chargeable - parseFloat(baseLimit));
                const weightSur = extra * parseFloat(intraPerKg);
                const sub = parseFloat(intraBase) + weightSur;
                const cod = parseFloat(codFlat) + (sub * (parseFloat(codPercent) / 100));
                const total = sub + cod;

                return (
                  <div style={{
                    background: 'var(--bg-dark)',
                    padding: 14,
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-subtle)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong>Heavy Local Parcel (3.5 kg &bull; COD)</strong>
                      <span style={{ color: '#fbbf24', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>
                        ₹{total.toFixed(2)}
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                      Base: ₹{intraBase} + Extra Wt ({extra}kg × ₹{intraPerKg}): ₹{weightSur.toFixed(2)} + COD: ₹{cod.toFixed(2)}
                    </div>
                  </div>
                );
              })()}

              {/* Scenario 3: Inter-zone 5.0kg Prepaid */}
              {(() => {
                const chargeable = 5.0;
                const extra = Math.max(0, chargeable - parseFloat(baseLimit));
                const weightSur = extra * parseFloat(interPerKg);
                const total = parseFloat(interBase) + weightSur;

                return (
                  <div style={{
                    background: 'var(--bg-dark)',
                    padding: 14,
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-subtle)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong>Cross-Hub Freight (5.0 kg &bull; Prepaid)</strong>
                      <span style={{ color: '#60a5fa', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>
                        ₹{total.toFixed(2)}
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                      Inter base: ₹{interBase} + ({extra}kg × ₹{interPerKg}): ₹{weightSur.toFixed(2)}
                    </div>
                  </div>
                );
              })()}
            </div>

            <div style={{
              marginTop: 18,
              padding: 12,
              background: 'rgba(59, 130, 246, 0.05)',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid rgba(59, 130, 246, 0.15)',
              fontSize: 12,
              color: '#93c5fd',
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}>
              <ShieldCheck size={16} />
              <span>
                Zero hardcoded rates. All customer quotations and bookings update instantly when saved.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
