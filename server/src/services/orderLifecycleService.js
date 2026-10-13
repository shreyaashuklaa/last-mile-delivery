const db = require('../db/database');
const AssignmentService = require('./assignmentService');
const NotificationService = require('./notificationService');
const sseService = require('./sseService');

class OrderLifecycleService {
  /**
   * Transition order status with immutable event logging and multi-channel notification
   */
  static async updateStatus({
    orderId,
    newStatus,
    actor, // { id, name, role }
    notes = '',
    location_lat = null,
    location_lng = null,
    failure_reason = null,
    failure_notes = null
  }) {
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
    if (!order) {
      throw new Error(`Order ${orderId} not found`);
    }

    const validStatuses = [
      'CREATED',
      'ASSIGNED',
      'PICKED_UP',
      'IN_TRANSIT',
      'OUT_FOR_DELIVERY',
      'DELIVERED',
      'FAILED',
      'RESCHEDULED'
    ];

    if (!validStatuses.includes(newStatus)) {
      throw new Error(`Invalid order status: ${newStatus}`);
    }

    // Role-based status transition checks (unless admin override)
    if (actor.role === 'agent') {
      const agentAllowed = ['PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'FAILED'];
      if (!agentAllowed.includes(newStatus)) {
        throw new Error(`Delivery agents cannot set status to ${newStatus}`);
      }
      if (newStatus === 'FAILED' && !failure_reason) {
        throw new Error('A failure reason is mandatory when marking delivery as failed.');
      }
    }

    let deliveredAt = order.delivered_at;
    if (newStatus === 'DELIVERED') {
      deliveredAt = new Date().toISOString();
      // Decrement agent active orders load
      if (order.assigned_agent_id) {
        db.prepare('UPDATE agents SET active_orders_count = MAX(0, active_orders_count - 1) WHERE id = ?').run(order.assigned_agent_id);
      }
    }

    // Update orders table
    db.prepare(`
      UPDATE orders
      SET status = ?,
          failure_reason = CASE WHEN ? IS NOT NULL THEN ? ELSE failure_reason END,
          failure_notes = CASE WHEN ? IS NOT NULL THEN ? ELSE failure_notes END,
          delivered_at = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      newStatus,
      failure_reason, failure_reason,
      failure_notes, failure_notes,
      deliveredAt,
      orderId
    );

    // Immutable Event Log
    const eventId = `evt_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const eventNotes = notes || (failure_reason ? `Delivery Failed: ${failure_reason}` : `Status updated to ${newStatus}`);

    db.prepare(`
      INSERT INTO order_events (id, order_id, status, actor_id, actor_name, actor_role, notes, location_lat, location_lng)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      eventId,
      orderId,
      newStatus,
      actor.id,
      actor.name,
      actor.role,
      eventNotes,
      location_lat || order.drop_lat,
      location_lng || order.drop_lng
    );

    const updatedOrder = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);

    // Send notifications to customer
    await NotificationService.notifyStatusChange(updatedOrder, newStatus, {
      failure_reason: failure_reason || updatedOrder.failure_reason,
      failure_notes: failure_notes || updatedOrder.failure_notes
    });

    // Broadcast real-time SSE event
    sseService.broadcast('ORDER_STATUS_CHANGED', {
      orderId,
      tracking_code: updatedOrder.tracking_code,
      status: newStatus,
      actor,
      timestamp: new Date().toISOString()
    });

    return updatedOrder;
  }

  /**
   * Customer reschedule failed delivery flow
   */
  static async rescheduleDelivery({
    orderId,
    reschedule_date,
    reschedule_time_slot,
    reschedule_notes,
    actor
  }) {
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
    if (!order) {
      throw new Error(`Order ${orderId} not found`);
    }

    if (order.status !== 'FAILED') {
      throw new Error('Only failed orders can be rescheduled.');
    }

    if (!reschedule_date || !reschedule_time_slot) {
      throw new Error('Reschedule date and preferred delivery window are required.');
    }

    // 1. Update order with reschedule details and set status to RESCHEDULED
    db.prepare(`
      UPDATE orders
      SET status = 'RESCHEDULED',
          reschedule_date = ?,
          reschedule_time_slot = ?,
          reschedule_notes = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      reschedule_date,
      reschedule_time_slot,
      reschedule_notes || 'Customer selected new delivery window',
      orderId
    );

    // 2. Log immutable event
    const eventId = `evt_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    db.prepare(`
      INSERT INTO order_events (id, order_id, status, actor_id, actor_name, actor_role, notes, location_lat, location_lng)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      eventId,
      orderId,
      'RESCHEDULED',
      actor.id,
      actor.name,
      actor.role,
      `Rescheduled by customer for ${reschedule_date} (${reschedule_time_slot}). Notes: ${reschedule_notes || 'None'}`,
      order.drop_lat,
      order.drop_lng
    );

    // 3. Reassign agent for the rescheduled attempt
    let reassignedAgent = null;
    try {
      const assignResult = AssignmentService.autoAssign(orderId, {
        id: 'sys_reschedule',
        name: 'Auto-Reassignment Engine',
        role: 'system'
      });
      reassignedAgent = assignResult.assigned_agent;
    } catch (err) {
      console.warn('Auto-reassignment pending on reschedule:', err.message);
    }

    const refreshedOrder = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);

    // 4. Notify customer
    await NotificationService.notifyStatusChange(refreshedOrder, 'RESCHEDULED', {
      reschedule_date,
      reschedule_time_slot
    });

    // 5. Broadcast real-time update
    sseService.broadcast('ORDER_RESCHEDULED', {
      orderId,
      tracking_code: refreshedOrder.tracking_code,
      status: refreshedOrder.status,
      reschedule_date,
      reschedule_time_slot,
      reassigned_agent: reassignedAgent
    });

    return refreshedOrder;
  }
}

module.exports = OrderLifecycleService;
