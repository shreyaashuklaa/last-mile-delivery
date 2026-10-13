const db = require('./database');
const bcrypt = require('bcryptjs');

function seed() {
  console.log('🌱 Seeding database...');

  // Clear existing data in correct foreign key order
  db.exec(`
    DELETE FROM notifications;
    DELETE FROM order_events;
    DELETE FROM orders;
    DELETE FROM agents;
    DELETE FROM areas;
    DELETE FROM rate_cards;
    DELETE FROM zones;
    DELETE FROM users;
  `);

  const hashedPasswordUser = bcrypt.hashSync('password123', 10);
  const hashedPasswordAdmin = bcrypt.hashSync('admin123', 10);

  // 1. Users
  const insertUser = db.prepare(`
    INSERT INTO users (id, name, email, password, phone, role)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const users = [
    ['usr_cust_1', 'Rahul Sharma', 'customer@delivery.com', hashedPasswordUser, '+91 98765 43210', 'customer'],
    ['usr_cust_2', 'Sarah Jenkins', 'sarah@techcorp.in', hashedPasswordUser, '+91 98111 22334', 'customer'],
    ['usr_agent_1', 'Vikram Singh', 'agent.vikram@delivery.com', hashedPasswordUser, '+91 91234 56789', 'agent'],
    ['usr_agent_2', 'Ramesh Patel', 'agent.ramesh@delivery.com', hashedPasswordUser, '+91 92345 67890', 'agent'],
    ['usr_agent_3', 'Amit Verma', 'agent.amit@delivery.com', hashedPasswordUser, '+91 93456 78901', 'agent'],
    ['usr_admin_1', 'Priya Nair', 'admin@delivery.com', hashedPasswordAdmin, '+91 99999 88888', 'admin']
  ];

  for (const u of users) {
    insertUser.run(...u);
  }

  // 2. Zones (Bengaluru Hubs)
  const insertZone = db.prepare(`
    INSERT INTO zones (id, code, name, description, center_lat, center_lng)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const zones = [
    ['zone_central', 'BLR-CENTRAL', 'Central Hub', 'CBD, MG Road, Indiranagar, Koramangala', 12.9716, 77.5946],
    ['zone_south', 'BLR-SOUTH', 'South Hub', 'Jayanagar, BTM, JP Nagar, Electronic City', 12.9165, 77.6101],
    ['zone_north', 'BLR-NORTH', 'North Hub', 'Hebbal, Yelahanka, Manyata Tech Park', 13.0358, 77.5970],
    ['zone_east', 'BLR-EAST', 'East Hub', 'Whitefield, Marathahalli, Bellandur, Outer Ring Road', 12.9698, 77.7499],
    ['zone_west', 'BLR-WEST', 'West Hub', 'Rajajinagar, Malleshwaram, Vijayanagar', 12.9915, 77.5562]
  ];

  for (const z of zones) {
    insertZone.run(...z);
  }

  // 3. Areas / Pincodes mapped to Zones
  const insertArea = db.prepare(`
    INSERT INTO areas (id, area_name, pincode, zone_id, city, lat, lng)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const areas = [
    // Central
    ['area_indiranagar', 'Indiranagar 100ft Rd', '560038', 'zone_central', 'Bengaluru', 12.9784, 77.6408],
    ['area_koramangala', 'Koramangala 4th Block', '560034', 'zone_central', 'Bengaluru', 12.9352, 77.6245],
    ['area_mg_road', 'MG Road Metro Station', '560001', 'zone_central', 'Bengaluru', 12.9756, 77.6066],

    // South
    ['area_jayanagar', 'Jayanagar 4th T Block', '560041', 'zone_south', 'Bengaluru', 12.9250, 77.5938],
    ['area_btm', 'BTM Layout 2nd Stage', '560076', 'zone_south', 'Bengaluru', 12.9166, 77.6101],
    ['area_jp_nagar', 'JP Nagar Phase 3', '560078', 'zone_south', 'Bengaluru', 12.9063, 77.5857],
    ['area_ecity', 'Electronic City Phase 1', '560100', 'zone_south', 'Bengaluru', 12.8452, 77.6602],

    // North
    ['area_hebbal', 'Hebbal Flyover', '560024', 'zone_north', 'Bengaluru', 13.0358, 77.5970],
    ['area_manyata', 'Manyata Tech Park Nagawara', '560045', 'zone_north', 'Bengaluru', 13.0478, 77.6200],
    ['area_yelahanka', 'Yelahanka New Town', '560064', 'zone_north', 'Bengaluru', 13.1007, 77.5963],

    // East
    ['area_whitefield', 'Whitefield ITPL Main Rd', '560066', 'zone_east', 'Bengaluru', 12.9868, 77.7380],
    ['area_marathahalli', 'Marathahalli Bridge', '560037', 'zone_east', 'Bengaluru', 12.9569, 77.7011],
    ['area_hsr', 'HSR Layout Sector 1', '560102', 'zone_east', 'Bengaluru', 12.9121, 77.6446],

    // West
    ['area_rajajinagar', 'Rajajinagar 1st Block', '560010', 'zone_west', 'Bengaluru', 12.9982, 77.5530],
    ['area_malleshwaram', 'Malleshwaram 8th Cross', '560003', 'zone_west', 'Bengaluru', 13.0031, 77.5702]
  ];

  for (const a of areas) {
    insertArea.run(...a);
  }

  // 4. Rate Cards (B2C and B2B)
  const insertRateCard = db.prepare(`
    INSERT INTO rate_cards (id, order_type, intra_zone_base_rate, intra_zone_per_kg, inter_zone_base_rate, inter_zone_per_kg, cod_surcharge_flat, cod_surcharge_percent, base_weight_limit_kg)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertRateCard.run(
    'rc_b2c',
    'B2C',
    50.0, // intra base
    20.0, // intra per kg
    90.0, // inter base
    35.0, // inter per kg
    30.0, // COD flat
    1.5,  // COD %
    1.0   // 1kg base limit
  );

  insertRateCard.run(
    'rc_b2b',
    'B2B',
    40.0, // intra base
    15.0, // intra per kg
    75.0, // inter base
    25.0, // inter per kg
    20.0, // COD flat
    1.0,  // COD %
    2.0   // 2kg base limit
  );

  // 5. Agents
  const insertAgent = db.prepare(`
    INSERT INTO agents (id, user_id, name, phone, vehicle_type, current_zone_id, current_lat, current_lng, status, active_orders_count, rating)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const agents = [
    ['agent_vikram', 'usr_agent_1', 'Vikram Singh', '+91 91234 56789', 'Electric Bike', 'zone_south', 12.9165, 77.6101, 'available', 1, 4.9],
    ['agent_ramesh', 'usr_agent_2', 'Ramesh Patel', '+91 92345 67890', 'Delivery Van', 'zone_central', 12.9716, 77.5946, 'available', 0, 4.8],
    ['agent_amit', 'usr_agent_3', 'Amit Verma', '+91 93456 78901', 'Scooter', 'zone_north', 13.0358, 77.5970, 'available', 0, 4.7]
  ];

  for (const ag of agents) {
    insertAgent.run(...ag);
  }

  // 6. Sample Orders with realistic lifecycle states
  const insertOrder = db.prepare(`
    INSERT INTO orders (
      id, tracking_code, customer_id, customer_name, customer_email, customer_phone,
      pickup_address, pickup_area_id, pickup_zone_id, pickup_lat, pickup_lng,
      drop_address, drop_area_id, drop_zone_id, drop_lat, drop_lng,
      length_cm, width_cm, height_cm, actual_weight_kg, volumetric_weight_kg, chargeable_weight_kg,
      order_type, payment_type, is_intra_zone,
      base_charge, weight_surcharge, cod_surcharge, total_charge,
      status, failure_reason, failure_notes, reschedule_date, reschedule_time_slot,
      assigned_agent_id, created_at, updated_at, delivered_at
    ) VALUES (
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?
    )
  `);

  const insertEvent = db.prepare(`
    INSERT INTO order_events (id, order_id, status, actor_id, actor_name, actor_role, notes, location_lat, location_lng, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertNotification = db.prepare(`
    INSERT INTO notifications (id, order_id, recipient_email, recipient_phone, channel, subject, content_text, content_html, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Order 1: OUT_FOR_DELIVERY (Active live tracking demo)
  insertOrder.run(
    'ord_demo_1',
    'LMD-2026-9041',
    'usr_cust_1',
    'Rahul Sharma',
    'customer@delivery.com',
    '+91 98765 43210',
    'Indiranagar 100ft Rd, Bangalore',
    'area_indiranagar',
    'zone_central',
    12.9784,
    77.6408,
    'Jayanagar 4th T Block, Bangalore',
    'area_jayanagar',
    'zone_south',
    12.9250,
    77.5938,
    25.0, 20.0, 15.0, // 25x20x15 = 7500 / 5000 = 1.5kg volumetric
    1.2, // actual weight 1.2kg -> chargeable = 1.5kg
    1.5,
    1.5,
    'B2C',
    'PREPAID',
    0, // Inter-zone (Central -> South)
    90.0, // Inter base: 90
    17.5, // 0.5kg extra * 35 = 17.5
    0.0,
    107.5,
    'OUT_FOR_DELIVERY',
    null, null, null, null,
    'agent_vikram',
    '2026-10-13 14:00:00',
    '2026-10-13 17:30:00',
    null
  );

  // Events for Order 1
  insertEvent.run('evt_1_1', 'ord_demo_1', 'CREATED', 'usr_cust_1', 'Rahul Sharma', 'customer', 'Order placed with online payment confirmation', 12.9784, 77.6408, '2026-10-13 14:00:00');
  insertEvent.run('evt_1_2', 'ord_demo_1', 'ASSIGNED', 'usr_admin_1', 'System Auto-Assigner', 'system', 'Smart assignment based on proximity and agent availability', 12.9716, 77.5946, '2026-10-13 14:10:00');
  insertEvent.run('evt_1_3', 'ord_demo_1', 'PICKED_UP', 'agent_vikram', 'Vikram Singh', 'agent', 'Package collected from merchant, barcode scanned', 12.9784, 77.6408, '2026-10-13 15:20:00');
  insertEvent.run('evt_1_4', 'ord_demo_1', 'IN_TRANSIT', 'agent_vikram', 'Vikram Singh', 'agent', 'Departed Central sorting facility heading to South delivery node', 12.9450, 77.6180, '2026-10-13 16:15:00');
  insertEvent.run('evt_1_5', 'ord_demo_1', 'OUT_FOR_DELIVERY', 'agent_vikram', 'Vikram Singh', 'agent', 'Rider is on the way to destination. Expected arrival in 25 mins', 12.9200, 77.6050, '2026-10-13 17:30:00');

  // Notifications for Order 1
  insertNotification.run('notif_1_1', 'ord_demo_1', 'customer@delivery.com', '+91 98765 43210', 'EMAIL', 'Order Confirmed - LMD-2026-9041', 'Your delivery order #LMD-2026-9041 has been placed successfully.', '<p>Hello Rahul, your shipment <strong>#LMD-2026-9041</strong> is confirmed!</p>', 'SENT', '2026-10-13 14:00:05');
  insertNotification.run('notif_1_2', 'ord_demo_1', 'customer@delivery.com', '+91 98765 43210', 'SMS', null, 'LMD Alert: Order LMD-2026-9041 is Out For Delivery by Vikram Singh (Call: +91 91234 56789).', null, 'SENT', '2026-10-13 17:30:05');

  // Order 2: FAILED (Ready for Customer Reschedule test flow!)
  insertOrder.run(
    'ord_demo_2',
    'LMD-2026-7812',
    'usr_cust_1',
    'Rahul Sharma',
    'customer@delivery.com',
    '+91 98765 43210',
    'Koramangala 4th Block, Bangalore',
    'area_koramangala',
    'zone_central',
    12.9352,
    77.6245,
    'HSR Layout Sector 1, Bangalore',
    'area_hsr',
    'zone_east',
    12.9121,
    77.6446,
    30.0, 20.0, 10.0, // 30x20x10 = 6000 / 5000 = 1.2kg
    2.5, // actual weight 2.5kg -> chargeable = 2.5kg
    1.2,
    2.5,
    'B2C',
    'COD',
    0, // Inter-zone
    90.0,
    52.5, // 1.5kg extra * 35 = 52.5
    32.14, // 30 flat + 1.5% of ~142.5
    174.64,
    'FAILED',
    'Customer Unavailable',
    'Customer phone was unanswered and residence main gate was locked.',
    null, null,
    'agent_vikram',
    '2026-10-13 10:00:00',
    '2026-10-13 16:45:00',
    null
  );

  insertEvent.run('evt_2_1', 'ord_demo_2', 'CREATED', 'usr_cust_1', 'Rahul Sharma', 'customer', 'Order booked with Cash on Delivery', 12.9352, 77.6245, '2026-10-13 10:00:00');
  insertEvent.run('evt_2_2', 'ord_demo_2', 'ASSIGNED', 'usr_admin_1', 'Admin Priya Nair', 'admin', 'Manual assignment to Vikram Singh', 12.9716, 77.5946, '2026-10-13 10:30:00');
  insertEvent.run('evt_2_3', 'ord_demo_2', 'PICKED_UP', 'agent_vikram', 'Vikram Singh', 'agent', 'Item received at Koramangala Hub', 12.9352, 77.6245, '2026-10-13 11:45:00');
  insertEvent.run('evt_2_4', 'ord_demo_2', 'OUT_FOR_DELIVERY', 'agent_vikram', 'Vikram Singh', 'agent', 'Rider arrived at destination sector', 12.9121, 77.6446, '2026-10-13 16:10:00');
  insertEvent.run('evt_2_5', 'ord_demo_2', 'FAILED', 'agent_vikram', 'Vikram Singh', 'agent', 'Delivery attempt failed: Customer phone unanswered, door locked', 12.9121, 77.6446, '2026-10-13 16:45:00');

  insertNotification.run('notif_2_1', 'ord_demo_2', 'customer@delivery.com', '+91 98765 43210', 'EMAIL', 'Delivery Attempt Failed - LMD-2026-7812', 'Delivery attempt for order LMD-2026-7812 was unsuccessful. Reason: Customer Unavailable. Please reschedule at your earliest convenience.', '<p>Hello Rahul, we missed you! Reason: <strong>Customer Unavailable</strong>. Please visit your tracker to reschedule your delivery date.</p>', 'SENT', '2026-10-13 16:45:05');
  insertNotification.run('notif_2_2', 'ord_demo_2', 'customer@delivery.com', '+91 98765 43210', 'SMS', null, 'LMD Alert: Delivery for LMD-2026-7812 failed (Customer Unavailable). Click tracker to reschedule delivery date.', null, 'SENT', '2026-10-13 16:45:05');

  // Order 3: DELIVERED (Completed order for history verification)
  insertOrder.run(
    'ord_demo_3',
    'LMD-2026-6219',
    'usr_cust_2',
    'Sarah Jenkins',
    'sarah@techcorp.in',
    '+91 98111 22334',
    'Whitefield ITPL Main Rd, Bangalore',
    'area_whitefield',
    'zone_east',
    12.9868,
    77.7380,
    'Marathahalli Bridge, Bangalore',
    'area_marathahalli',
    'zone_east',
    12.9569,
    77.7011,
    40.0, 30.0, 20.0, // 40x30x20 = 24000 / 5000 = 4.8kg
    5.0, // actual weight 5.0kg -> chargeable = 5.0kg
    4.8,
    5.0,
    'B2B',
    'PREPAID',
    1, // Intra-zone (East -> East)
    40.0, // B2B Intra base (up to 2kg)
    45.0, // 3kg extra * 15 = 45.0
    0.0,
    85.0,
    'DELIVERED',
    null, null, null, null,
    'agent_ramesh',
    '2026-10-12 09:15:00',
    '2026-10-12 13:40:00',
    '2026-10-12 13:40:00'
  );

  insertEvent.run('evt_3_1', 'ord_demo_3', 'CREATED', 'usr_cust_2', 'Sarah Jenkins', 'customer', 'B2B shipment booked with corporate invoice', 12.9868, 77.7380, '2026-10-12 09:15:00');
  insertEvent.run('evt_3_2', 'ord_demo_3', 'ASSIGNED', 'usr_admin_1', 'Admin Priya Nair', 'admin', 'Assigned to Ramesh Patel (Delivery Van)', 12.9716, 77.5946, '2026-10-12 09:30:00');
  insertEvent.run('evt_3_3', 'ord_demo_3', 'PICKED_UP', 'agent_ramesh', 'Ramesh Patel', 'agent', 'Bulk freight picked up from TechCorp warehouse', 12.9868, 77.7380, '2026-10-12 10:45:00');
  insertEvent.run('evt_3_4', 'ord_demo_3', 'IN_TRANSIT', 'agent_ramesh', 'Ramesh Patel', 'agent', 'En route on Outer Ring Road', 12.9700, 77.7200, '2026-10-12 11:50:00');
  insertEvent.run('evt_3_5', 'ord_demo_3', 'OUT_FOR_DELIVERY', 'agent_ramesh', 'Ramesh Patel', 'agent', 'Delivery vehicle at recipient premises', 12.9569, 77.7011, '2026-10-12 13:10:00');
  insertEvent.run('evt_3_6', 'ord_demo_3', 'DELIVERED', 'agent_ramesh', 'Ramesh Patel', 'agent', 'Package signed for by Security Reception Desk', 12.9569, 77.7011, '2026-10-12 13:40:00');

  // Order 4: CREATED (Unassigned, ready for auto-assignment or manual assignment test)
  insertOrder.run(
    'ord_demo_4',
    'LMD-2026-5540',
    'usr_cust_1',
    'Rahul Sharma',
    'customer@delivery.com',
    '+91 98765 43210',
    'Hebbal Flyover, Bangalore',
    'area_hebbal',
    'zone_north',
    13.0358,
    77.5970,
    'Manyata Tech Park Nagawara, Bangalore',
    'area_manyata',
    'zone_north',
    13.0478,
    77.6200,
    15.0, 15.0, 10.0,
    0.8,
    0.45,
    1.0,
    'B2C',
    'PREPAID',
    1, // Intra-zone
    50.0,
    0.0,
    0.0,
    50.0,
    'CREATED',
    null, null, null, null,
    null, // Unassigned
    '2026-10-13 18:00:00',
    '2026-10-13 18:00:00',
    null
  );

  insertEvent.run('evt_4_1', 'ord_demo_4', 'CREATED', 'usr_cust_1', 'Rahul Sharma', 'customer', 'New express booking created. Awaiting dispatch assignment.', 13.0358, 77.5970, '2026-10-13 18:00:00');

  console.log('✅ Seed completed successfully!');
}

if (require.main === module) {
  seed();
}

module.exports = seed;
