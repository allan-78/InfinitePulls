// backend/utils/emailTemplates.js

const generateOrderEmailTemplate = (order, user, status) => {
  const baseTemplate = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #4F46E5; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
        .order-info { background: white; padding: 15px; border-radius: 5px; margin: 15px 0; }
        .status-badge { 
          display: inline-block; 
          padding: 5px 15px; 
          border-radius: 20px; 
          font-weight: bold; 
          margin: 10px 0; 
        }
        .processing { background: #FFF3CD; color: #856404; }
        .accepted { background: #D1ECF1; color: #0C5460; }
        .cancelled { background: #F8D7DA; color: #721C24; }
        .out-for-delivery { background: #D4EDDA; color: #155724; }
        .delivered { background: #D1E7DD; color: #0F5132; }
        .product-table { width: 100%; border-collapse: collapse; margin: 15px 0; }
        .product-table th, .product-table td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
        .product-table th { background: #f5f5f5; }
        .total-section { background: white; padding: 15px; border-radius: 5px; margin-top: 15px; }
        .footer { text-align: center; margin-top: 20px; padding: 20px; color: #666; font-size: 12px; }
        .pdf-notice { background: #e7f3ff; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #4F46E5; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>HarmoniaHub</h1>
          <h2>Order Update</h2>
        </div>
        <div class="content">
          <p>Hello <strong>${user.name}</strong>,</p>
  `;

  let statusSpecificContent = '';
  const statusClass = status.toLowerCase().replace(' ', '-');

  switch (status) {
    case 'Processing':
      statusSpecificContent = `
        <div class="order-info">
          <div class="status-badge processing">${status}</div>
          <p>Your order <strong>#${order._id}</strong> is now being processed.</p>
          <p>We'll notify you when your order status changes.</p>
        </div>
      `;
      break;

    case 'Accepted':
      statusSpecificContent = `
        <div class="order-info">
          <div class="status-badge accepted">${status}</div>
          <p>Your order <strong>#${order._id}</strong> has been accepted and is being prepared for shipment.</p>
          
          <h3>Order Details:</h3>
          <table class="product-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Quantity</th>
                <th>Price</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              ${order.orderItems.map(item => `
                <tr>
                  <td>${item.name}</td>
                  <td>${item.quantity}</td>
                  <td>$${item.price.toFixed(2)}</td>
                  <td>$${(item.quantity * item.price).toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div class="total-section">
            <p><strong>Items Price:</strong> $${order.itemsPrice.toFixed(2)}</p>
            <p><strong>Tax Price:</strong> $${order.taxPrice.toFixed(2)}</p>
            <p><strong>Shipping Price:</strong> $${order.shippingPrice.toFixed(2)}</p>
            <p><strong>Total Price:</strong> $${order.totalPrice.toFixed(2)}</p>
          </div>
        </div>
      `;
      break;

    case 'Out for Delivery':
      statusSpecificContent = `
        <div class="order-info">
          <div class="status-badge out-for-delivery">${status}</div>
          <p>Great news! Your order <strong>#${order._id}</strong> is out for delivery.</p>
          <p>Expected delivery: Today</p>
          
          <h3>Shipping Information:</h3>
          <p><strong>Address:</strong> ${order.shippingInfo.address}, ${order.shippingInfo.city}, ${order.shippingInfo.country} ${order.shippingInfo.postalCode}</p>
          <p><strong>Phone:</strong> ${order.shippingInfo.phoneNo}</p>
          
          <h3>Order Summary:</h3>
          <table class="product-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Quantity</th>
                <th>Price</th>
              </tr>
            </thead>
            <tbody>
              ${order.orderItems.map(item => `
                <tr>
                  <td>${item.name}</td>
                  <td>${item.quantity}</td>
                  <td>$${item.price.toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div class="total-section">
            <p><strong>Items Price:</strong> $${order.itemsPrice.toFixed(2)}</p>
            <p><strong>Tax Price:</strong> $${order.taxPrice.toFixed(2)}</p>
            <p><strong>Shipping Price:</strong> $${order.shippingPrice.toFixed(2)}</p>
            <p><strong>Total Price:</strong> $${order.totalPrice.toFixed(2)}</p>
          </div>
        </div>
      `;
      break;

    case 'Cancelled':
      statusSpecificContent = `
        <div class="order-info">
          <div class="status-badge cancelled">${status}</div>
          <p>We're sorry to inform you that your order <strong>#${order._id}</strong> has been cancelled.</p>
          <p>If this was a mistake or if you have any questions, please contact our customer support team immediately.</p>
          <p>If you were charged for this order, the refund will be processed within 5-7 business days.</p>
          <p>We apologize for any inconvenience this may have caused.</p>
        </div>
      `;
      break;

    case 'Delivered':
      statusSpecificContent = `
        <div class="order-info">
          <div class="status-badge delivered">${status}</div>
          <p>Congratulations! Your order <strong>#${order._id}</strong> has been successfully delivered.</p>
          <p>We hope you enjoy your products! Thank you for shopping with HarmoniaHub.</p>
          
          <div class="pdf-notice">
            <p><strong>📎 Your order receipt is attached as a PDF file!</strong></p>
            <p>Look for the download button or paperclip icon in your email client to download the receipt.</p>
            <p><strong>In Mailtrap:</strong> Check the "Attachments" section below this email to download the PDF receipt.</p>
          </div>
          
          <h3>Order Summary:</h3>
          <table class="product-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Quantity</th>
                <th>Price</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              ${order.orderItems.map(item => `
                <tr>
                  <td>${item.name}</td>
                  <td>${item.quantity}</td>
                  <td>$${item.price.toFixed(2)}</td>
                  <td>$${(item.quantity * item.price).toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div class="total-section">
            <p><strong>Items Price:</strong> $${order.itemsPrice.toFixed(2)}</p>
            <p><strong>Tax Price:</strong> $${order.taxPrice.toFixed(2)}</p>
            <p><strong>Shipping Price:</strong> $${order.shippingPrice.toFixed(2)}</p>
            <p><strong>Total Price:</strong> $${order.totalPrice.toFixed(2)}</p>
          </div>
          
          <p><strong>Delivered at:</strong> ${new Date(order.deliveredAt).toLocaleString()}</p>
        </div>
      `;
      break;
  }

  const footer = `
          <p>If you have any questions, please contact our support team.</p>
          <div class="footer">
            <p>Thank you for choosing HarmoniaHub!</p>
            <p>© 2024 HarmoniaHub. All rights reserved.</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  return baseTemplate + statusSpecificContent + footer;
};

module.exports = { generateOrderEmailTemplate };