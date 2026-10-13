const db = require('../db/database');

class AssignmentService {
  /**
   * Calculate Haversine distance between two coordinates in kilometers
   */
  static haversineDistance(lat1, lon1, lat2, lon2) {
    if (!lat1 || !lon1 || !lat2 || !lon2) return 999.0;
    const R = 6371; // Earth radius in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) *
        Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c * 100) / 100;
  }

  /**
   * Find candidate agents ranked by proximity, zone affinity, and workload
   */
  static findNearestAgentForOrder(order) {
    const agents = db.prepare(`
      SELECT a.*, z.name as zone_name
      FROM agents a
      LEFT JOIN zones z ON a.current_zone_id = z.id
      WHERE a.status IN ('available', 'on_duty')
    `).all();

    if (!agents.length) {
      return null;
    }

    const pickupLat = order.pickup_lat || 12.9716;
    const pickupLng = order.pickup_lng || 77.5946;

    const ranked = agents.map(agent => {
      const distanceKm = AssignmentService.haversineDistance(
        agent.current_lat || 12.9716,
        agent.current_lng || 77.5946,
        pickupLat,
        pickupLng
      );

      // Score heuristic:
      // - Lower is better
      // - Direct zone match gives 4km bonus reduction
      // - Each active order adds 2.5km penalty
      const isZoneMatch = agent.current_zone_id === order.pickup_zone_id;
      const zoneBonus = isZoneMatch ? -4.0 : 0.0;
      const loadPenalty = (agent.active_orders_count || 0) * 2.5;

      const score = Math.max(0.1, distanceKm + zoneBonus + loadPenalty);

      return {
        ...agent,
        distance_km: distanceKm,
        is_zone_match: isZoneMatch,
        assignment_score: Math.round(score * 100) / 100
      };
    });

    ranked.sort((a, b) => a.assignment_score - b.assignment_score);
    return ranked[0] || null;
  }

  /**
   * Auto-assign nearest agent to an order
   */
  static autoAssign(orderId, actor = { id: 'sys_auto', name: 'System Auto-Assigner', role: 'system' }) {
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
    if (!order) {
      throw new Error(`Order ${orderId} not found`);
    }

    const candidate = AssignmentService.findNearestAgentForOrder(order);
    if (!candidate) {
      throw new Error('No available delivery agents found currently in service.');
    }

    return AssignmentService.assignAgentToOrder(orderId, candidate.id, actor, {
      method: 'AUTO',
      distance_km: candidate.distance_km,
      zone_name: candidate.zone_name
    });
  }

  /**
   * Explicitly assign a delivery agent to an order
   */
  static assignAgentToOrder(orderId, agentId, actor, meta = {}) {
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
    if (!order) {
      throw new Error(`Order ${orderId} not found`);
    }

    const agent = db.prepare('SELECT * FROM agents WHERE id = ?').get(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }

    // Decrement previous agent active count if reassigned
    if (order.assigned_agent_id && order.assigned_agent_id !== agentId) {
      db.prepare(`
        UPDATE agents SET active_orders_count = MAX(0, active_orders_count - 1)
        WHERE id = ?
      `).run(order.assigned_agent_id);
    }

    // Update order
    const nextStatus = (order.status === 'CREATED' || order.status === 'RESCHEDULED') ? 'ASSIGNED' : order.status;
    db.prepare(`
      UPDATE orders
      SET assigned_agent_id = ?, status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(agentId, nextStatus, orderId);

    // Increment assigned agent's active load
    db.prepare(`
      UPDATE agents
      SET active_orders_count = active_orders_count + 1
      WHERE id = ?
    `).run(agentId);

    // Log immutable event
    const eventId = `evt_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const methodDesc = meta.method === 'AUTO' 
      ? `Intelligently auto-assigned to ${agent.name} (${agent.vehicle_type}, ~${meta.distance_km || 1.2} km away)`
      : `Manually dispatched to ${agent.name} (${agent.vehicle_type})`;

    db.prepare(`
      INSERT INTO order_events (id, order_id, status, actor_id, actor_name, actor_role, notes, location_lat, location_lng)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      eventId,
      orderId,
      nextStatus,
      actor.id,
      actor.name,
      actor.role,
      methodDesc,
      agent.current_lat || order.pickup_lat,
      agent.current_lng || order.pickup_lng
    );

    return {
      orderId,
      assigned_agent: agent,
      status: nextStatus,
      message: methodDesc
    };
  }
}

module.exports = AssignmentService;
