const db = require('../db/database');
const nodemailer = require('nodemailer');

let transporter = null;

// Initialize optional Nodemailer ethereal transport for development sandbox
nodemailer.createTestAccount().then(account => {
  transporter = nodemailer.createTransport({
    host: account.smtp.host,
    port: account.smtp.port,
    secure: account.smtp.secure,
    auth: {
      user: account.user,
      pass: account.pass
    }
  });
  console.log('✉️  Ethereal Sandbox Email Transport Ready:', account.user);
}).catch(err => {
  console.log('✉️  Using In-Memory Email Dispatcher:', err.message);
});

class NotificationService {
  /**
   * Send both Email and SMS for an order status change
   */
  static async notifyStatusChange(order, status, extraData = {}) {
    try {
      const { emailSubject, emailHtml, smsText } = NotificationService.generateTemplates(order, status, extraData);

      // 1. Dispatch Email
      const emailId = `notif_em_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      db.prepare(`
        INSERT INTO notifications (id, order_id, recipient_email, recipient_phone, channel, subject, content_text, content_html, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        emailId,
        order.id,
        order.customer_email,
        order.customer_phone,
        'EMAIL',
        emailSubject,
        smsText,
        emailHtml,
        'SENT'
      );

      // Attempt background transport delivery if available
      if (transporter && order.customer_email) {
        transporter.sendMail({
          from: '"SwiftTrack Logistics" <dispatch@swifttrack.io>',
          to: order.customer_email,
          subject: emailSubject,
          html: emailHtml
        }).catch(e => console.warn('SMTP sandbox dispatch warning:', e.message));
      }

      // 2. Dispatch SMS
      const smsId = `notif_sms_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      db.prepare(`
        INSERT INTO notifications (id, order_id, recipient_email, recipient_phone, channel, subject, content_text, content_html, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        smsId,
        order.id,
        order.customer_email,
        order.customer_phone,
        'SMS',
        null,
        smsText,
        null,
        'SENT'
      );

      console.log(`🔔 Notifications dispatched for Order ${order.tracking_code} [${status}] to ${order.customer_email}`);

      return {
        emailId,
        smsId,
        subject: emailSubject
      };
    } catch (err) {
      console.error('Notification dispatch failed:', err.message);
    }
  }

  /**
   * Generate branded HTML and SMS notifications for each lifecycle event
   */
  static generateTemplates(order, status, extraData = {}) {
    const trackingCode = order.tracking_code || order.id;
    const recipient = order.customer_name || 'Valued Customer';
    const amount = `₹${parseFloat(order.total_charge || 0).toFixed(2)}`;

    let statusTitle = 'Order Update';
    let statusColor = '#3b82f6';
    let messageBody = '';
    let actionButton = `<a href="/track/${trackingCode}" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">Track Live Shipment</a>`;

    switch (status) {
      case 'CREATED':
        statusTitle = 'Shipment Booking Confirmed';
        statusColor = '#6366f1';
        messageBody = `Your order <strong>${trackingCode}</strong> has been successfully registered. Pickup address: <em>${order.pickup_address}</em>. Payment method: <strong>${order.payment_type}</strong> (${amount}).`;
        break;
      case 'ASSIGNED':
        statusTitle = 'Delivery Agent Assigned';
        statusColor = '#0ea5e9';
        messageBody = `A delivery partner has been assigned to your shipment. Pickup is scheduled shortly.`;
        break;
      case 'PICKED_UP':
        statusTitle = 'Package Picked Up';
        statusColor = '#8b5cf6';
        messageBody = `Our delivery agent has picked up your package from the origin. It is now safely in transit.`;
        break;
      case 'IN_TRANSIT':
        statusTitle = 'In Transit Between Hubs';
        statusColor = '#3b82f6';
        messageBody = `Your package is moving towards the nearest delivery hub for expedited routing.`;
        break;
      case 'OUT_FOR_DELIVERY':
        statusTitle = 'Out For Delivery Today!';
        statusColor = '#eab308';
        messageBody = `Exciting news! Your package is currently out for delivery to <em>${order.drop_address}</em>. Please keep your phone accessible.`;
        break;
      case 'DELIVERED':
        statusTitle = 'Delivered Successfully! 🎉';
        statusColor = '#10b981';
        messageBody = `Your shipment has been successfully delivered. Thank you for choosing SwiftTrack Logistics!`;
        break;
      case 'FAILED':
        statusTitle = 'Delivery Attempt Unsuccessful ⚠️';
        statusColor = '#ef4444';
        const reason = extraData.failure_reason || order.failure_reason || 'Customer Unavailable';
        messageBody = `We attempted delivery but could not complete it.<br><br><strong>Reason:</strong> ${reason}.<br><br>Please click below to reschedule your delivery date and preferred time slot.`;
        actionButton = `<a href="/track/${trackingCode}?reschedule=true" style="background-color: #ef4444; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">Reschedule Delivery Now</a>`;
        break;
      case 'RESCHEDULED':
        statusTitle = 'Delivery Rescheduled Confirmed 📅';
        statusColor = '#8b5cf6';
        messageBody = `Your delivery has been rescheduled for <strong>${extraData.reschedule_date || order.reschedule_date || 'Upcoming date'}</strong> (${extraData.reschedule_time_slot || order.reschedule_time_slot || 'Standard slot'}). A rider has been re-queued for your shipment.`;
        break;
      default:
        messageBody = `Your order status changed to <strong>${status}</strong>.`;
    }

    const emailSubject = `[SwiftTrack] ${statusTitle} - ${trackingCode}`;

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #0f172a; color: #f8fafc; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background: #1e293b; border-radius: 12px; border: 1px solid #334155; overflow: hidden; }
          .header { background: linear-gradient(135deg, #1e1b4b, #312e81); padding: 24px; text-align: center; border-bottom: 2px solid ${statusColor}; }
          .header h1 { margin: 0; font-size: 20px; color: #ffffff; letter-spacing: 0.5px; }
          .content { padding: 28px; line-height: 1.6; }
          .badge { display: inline-block; padding: 6px 14px; background: ${statusColor}22; color: ${statusColor}; border: 1px solid ${statusColor}; border-radius: 20px; font-weight: 700; font-size: 13px; margin-bottom: 16px; }
          .card { background: #0f172a; padding: 16px; border-radius: 8px; margin: 20px 0; border: 1px solid #334155; }
          .row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; }
          .label { color: #94a3b8; }
          .value { font-weight: 600; color: #f1f5f9; }
          .cta { text-align: center; margin-top: 28px; }
          .footer { text-align: center; padding: 18px; font-size: 12px; color: #64748b; background: #111827; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📦 SwiftTrack Logistics</h1>
          </div>
          <div class="content">
            <span class="badge">${status}</span>
            <h2 style="margin: 0 0 12px 0; color: #ffffff;">Hello ${recipient},</h2>
            <p style="color: #cbd5e1; font-size: 15px;">${messageBody}</p>
            <div class="card">
              <div class="row"><span class="label">Tracking Number</span><span class="value">${trackingCode}</span></div>
              <div class="row"><span class="label">Amount</span><span class="value">${amount} (${order.payment_type})</span></div>
              <div class="row"><span class="label">Destination</span><span class="value">${order.drop_address}</span></div>
            </div>
            <div class="cta">
              ${actionButton}
            </div>
          </div>
          <div class="footer">
            Automated notification from SwiftTrack Logistics platform &bull; 24/7 Support
          </div>
        </div>
      </body>
      </html>
    `;

    const smsText = `[SwiftTrack] Alert: Order ${trackingCode} is ${status}. ${status === 'FAILED' ? 'Please reschedule delivery date via your tracker link.' : 'Track live at http://localhost:5173/track/' + trackingCode}`;

    return { emailSubject, emailHtml, smsText };
  }
}

module.exports = NotificationService;
