const db = require('../db/database');

class PricingService {
  /**
   * Calculate shipment price quotation dynamically using DB rate cards
   */
  static calculateQuote({
    length_cm,
    width_cm,
    height_cm,
    actual_weight_kg,
    order_type,       // 'B2B' | 'B2C'
    payment_type,     // 'PREPAID' | 'COD'
    pickup_area_id,
    drop_area_id,
    pickup_zone_id,
    drop_zone_id
  }) {
    const l = parseFloat(length_cm) || 0;
    const w = parseFloat(width_cm) || 0;
    const h = parseFloat(height_cm) || 0;
    const actualWeight = parseFloat(actual_weight_kg) || 0;

    if (l <= 0 || w <= 0 || h <= 0) {
      throw new Error('Package dimensions (L, W, H) must be greater than zero.');
    }
    if (actualWeight <= 0) {
      throw new Error('Actual weight must be greater than zero.');
    }

    const type = (order_type || 'B2C').toUpperCase();
    if (!['B2B', 'B2C'].includes(type)) {
      throw new Error('Order type must be either B2B or B2C.');
    }

    const payment = (payment_type || 'PREPAID').toUpperCase();
    if (!['PREPAID', 'COD'].includes(payment)) {
      throw new Error('Payment type must be either PREPAID or COD.');
    }

    // Resolve Zones
    let pZoneId = pickup_zone_id;
    let dZoneId = drop_zone_id;

    if (!pZoneId && pickup_area_id) {
      const area = db.prepare('SELECT zone_id FROM areas WHERE id = ?').get(pickup_area_id);
      if (area) pZoneId = area.zone_id;
    }
    if (!dZoneId && drop_area_id) {
      const area = db.prepare('SELECT zone_id FROM areas WHERE id = ?').get(drop_area_id);
      if (area) dZoneId = area.zone_id;
    }

    if (!pZoneId || !dZoneId) {
      throw new Error('Pickup zone and Drop zone could not be resolved from selected areas.');
    }

    const pickupZone = db.prepare('SELECT id, code, name FROM zones WHERE id = ?').get(pZoneId);
    const dropZone = db.prepare('SELECT id, code, name FROM zones WHERE id = ?').get(dZoneId);

    if (!pickupZone || !dropZone) {
      throw new Error('Invalid zone specified.');
    }

    const isIntraZone = (pickupZone.id === dropZone.id);

    // Volumetric weight: (L × B × H) / 5000 in kg
    const volumetricWeight = Math.round(((l * w * h) / 5000) * 100) / 100;
    const chargeableWeight = Math.round(Math.max(actualWeight, volumetricWeight) * 100) / 100;
    const billedOn = (volumetricWeight > actualWeight) ? 'volumetric' : 'actual';

    // Fetch dynamic rate card from DB
    const rateCard = db.prepare('SELECT * FROM rate_cards WHERE order_type = ?').get(type);
    if (!rateCard) {
      throw new Error(`Rate card not configured for order type: ${type}`);
    }

    const baseWeightLimit = rateCard.base_weight_limit_kg || 1.0;
    let baseCharge = 0;
    let weightSurcharge = 0;

    if (isIntraZone) {
      baseCharge = rateCard.intra_zone_base_rate;
      if (chargeableWeight > baseWeightLimit) {
        const extraWeight = chargeableWeight - baseWeightLimit;
        weightSurcharge = Math.round(extraWeight * rateCard.intra_zone_per_kg * 100) / 100;
      }
    } else {
      baseCharge = rateCard.inter_zone_base_rate;
      if (chargeableWeight > baseWeightLimit) {
        const extraWeight = chargeableWeight - baseWeightLimit;
        weightSurcharge = Math.round(extraWeight * rateCard.inter_zone_per_kg * 100) / 100;
      }
    }

    // COD Surcharge calculation
    let codSurcharge = 0;
    if (payment === 'COD') {
      const subtotal = baseCharge + weightSurcharge;
      const percentFee = (subtotal * (rateCard.cod_surcharge_percent / 100));
      codSurcharge = Math.round((rateCard.cod_surcharge_flat + percentFee) * 100) / 100;
    }

    const totalCharge = Math.round((baseCharge + weightSurcharge + codSurcharge) * 100) / 100;

    return {
      dimensions: { length_cm: l, width_cm: w, height_cm: h },
      actual_weight_kg: actualWeight,
      volumetric_weight_kg: volumetricWeight,
      chargeable_weight_kg: chargeableWeight,
      billed_on: billedOn,
      is_intra_zone: isIntraZone,
      pickup_zone: pickupZone,
      drop_zone: dropZone,
      order_type: type,
      payment_type: payment,
      pricing_breakdown: {
        base_weight_limit_kg: baseWeightLimit,
        base_charge: baseCharge,
        weight_surcharge: weightSurcharge,
        cod_surcharge: codSurcharge,
        total_charge: totalCharge
      },
      rate_card_snapshot: {
        id: rateCard.id,
        order_type: rateCard.order_type,
        intra_zone_base_rate: rateCard.intra_zone_base_rate,
        intra_zone_per_kg: rateCard.intra_zone_per_kg,
        inter_zone_base_rate: rateCard.inter_zone_base_rate,
        inter_zone_per_kg: rateCard.inter_zone_per_kg,
        cod_surcharge_flat: rateCard.cod_surcharge_flat,
        cod_surcharge_percent: rateCard.cod_surcharge_percent
      }
    };
  }
}

module.exports = PricingService;
