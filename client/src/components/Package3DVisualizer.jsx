import React from 'react';
import { Box, Scale, ArrowUpRight } from 'lucide-react';

export default function Package3DVisualizer({
  lengthCm = 20,
  widthCm = 15,
  heightCm = 10,
  actualWeightKg = 1.0,
  volumetricWeightKg = 0.6,
  billedOn = 'actual'
}) {
  const l = parseFloat(lengthCm) || 10;
  const w = parseFloat(widthCm) || 10;
  const h = parseFloat(heightCm) || 10;

  // Scaling factor for CSS isometric cube rendering
  const maxDim = Math.max(l, w, h, 20);
  const scaleRatio = Math.min(1.4, Math.max(0.6, 70 / maxDim));

  const boxWidth = Math.round(w * scaleRatio * 2.2);
  const boxHeight = Math.round(h * scaleRatio * 2.2);
  const boxDepth = Math.round(l * scaleRatio * 2.2);

  return (
    <div className="package-3d-box">
      <div style={{ position: 'absolute', top: 14, left: 16, display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)' }}>
        <Box size={14} color="#38bdf8" />
        <span style={{ fontWeight: 600 }}>Package Dimension Visualizer</span>
      </div>

      <div style={{ margin: '30px 0 20px', height: 110, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{
          width: Math.max(60, Math.min(140, boxWidth)),
          height: Math.max(50, Math.min(110, boxHeight)),
          background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.3) 0%, rgba(99, 102, 241, 0.4) 100%)',
          border: '2px solid #60a5fa',
          borderRadius: 8,
          boxShadow: '0 8px 24px rgba(59, 130, 246, 0.25)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative'
        }}>
          <span style={{ fontSize: 11, color: '#e2e8f0', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
            {l} × {w} × {h} cm
          </span>
          <span style={{ fontSize: 10, color: '#93c5fd' }}>
            Vol: {Math.round(l * w * h)} cm³
          </span>
        </div>
      </div>

      {/* Metric comparison pills */}
      <div className="package-metric-pills">
        <div className="metric-pill" style={{ borderColor: billedOn === 'actual' ? '#10b981' : 'var(--border-subtle)' }}>
          <Scale size={12} style={{ display: 'inline', marginRight: 4 }} />
          Actual: <strong>{actualWeightKg} kg</strong>
          {billedOn === 'actual' && <span style={{ color: '#10b981', marginLeft: 4, fontWeight: 700 }}>✓ Billed</span>}
        </div>

        <div className="metric-pill" style={{ borderColor: billedOn === 'volumetric' ? '#f59e0b' : 'var(--border-subtle)' }}>
          <Box size={12} style={{ display: 'inline', marginRight: 4 }} />
          Volumetric: <strong>{volumetricWeightKg} kg</strong>
          {billedOn === 'volumetric' && <span style={{ color: '#f59e0b', marginLeft: 4, fontWeight: 700 }}>✓ Billed</span>}
        </div>
      </div>

      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 10, textAlign: 'center' }}>
        Formula: (L × W × H ÷ 5000) &bull; Billed on higher weight metric
      </div>
    </div>
  );
}
