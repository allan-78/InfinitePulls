// backend/utils/pdfGenerator.js
const PDFDocument = require('pdfkit');

/**
 * Generate PDF receipt for delivered orders using PDFKit
 * @param {Object} order - Order object
 * @param {Object} user - User object
 * @returns {Promise<Buffer>} - PDF buffer
 */
const generateReceiptPDF = (order, user) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ 
        margin: 40, 
        size: 'A4'
      });
      const buffers = [];

      // Collect PDF data
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        resolve(pdfData);
      });
      doc.on('error', reject);

      // ===== HEADER SECTION =====
      // Company Header with background
      doc.rect(0, 0, doc.page.width, 100)
         .fill('#4F46E5');
      
      doc.fillColor('#FFFFFF')
         .fontSize(24)
         .font('Helvetica-Bold')
         .text('HarmoniaHub', 50, 35);
      
      doc.fontSize(14)
         .text('Official Order Receipt', 50, 65);

      // Receipt ID and Date
      doc.fontSize(10)
         .fillColor('#E5E7EB')
         .text(`Receipt #: ${order._id}`, 400, 40, { align: 'right' })
         .text(`Issue Date: ${new Date().toLocaleDateString()}`, 400, 55, { align: 'right' })
         .text(`Order Date: ${new Date(order.createdAt).toLocaleDateString()}`, 400, 70, { align: 'right' });

      // ===== CUSTOMER & SHIPPING INFO SECTION =====
      let yPosition = 120;
      
      // Customer Information
      doc.fillColor('#1E293B')
         .fontSize(12)
         .font('Helvetica-Bold')
         .text('BILLED TO', 50, yPosition);
      
      doc.fillColor('#475569')
         .font('Helvetica')
         .fontSize(10)
         .text(user.name, 50, yPosition + 20)
         .text(user.email, 50, yPosition + 35)
         .text(order.shippingInfo.phoneNo, 50, yPosition + 50);

      // Shipping Information
      doc.fillColor('#1E293B')
         .font('Helvetica-Bold')
         .text('SHIPPED TO', 300, yPosition);
      
      doc.fillColor('#475569')
         .font('Helvetica')
         .text(order.shippingInfo.address, 300, yPosition + 20)
         .text(`${order.shippingInfo.city}, ${order.shippingInfo.country}`, 300, yPosition + 35)
         .text(order.shippingInfo.postalCode, 300, yPosition + 50);

      // ===== ORDER ITEMS TABLE =====
      yPosition += 80;
      
      // Table Header
      doc.fillColor('#FFFFFF')
         .rect(50, yPosition, 500, 25)
         .fill('#4F46E5');
      
      doc.font('Helvetica-Bold')
         .fontSize(11)
         .text('PRODUCT', 65, yPosition + 8)
         .text('QTY', 350, yPosition + 8, { width: 40, align: 'center' })
         .text('UNIT PRICE', 400, yPosition + 8, { width: 70, align: 'right' })
         .text('TOTAL', 480, yPosition + 8, { width: 60, align: 'right' });

      yPosition += 25;

      // Order Items
      order.orderItems.forEach((item, index) => {
        const rowY = yPosition + (index * 25);
        
        // Alternate row colors
        if (index % 2 === 0) {
          doc.rect(50, rowY, 500, 25)
             .fill('#F8FAFC');
        }

        doc.fillColor('#1E293B')
           .font('Helvetica')
           .fontSize(10)
           .text(item.name, 65, rowY + 8, { width: 270 })
           .text(item.quantity.toString(), 350, rowY + 8, { width: 40, align: 'center' })
           .text(`$${item.price.toFixed(2)}`, 400, rowY + 8, { width: 70, align: 'right' })
           .text(`$${(item.quantity * item.price).toFixed(2)}`, 480, rowY + 8, { width: 60, align: 'right' });
      });

      // ===== TOTALS SECTION =====
      const itemsEndY = yPosition + (order.orderItems.length * 25) + 30;
      
      // Subtotal
      doc.fillColor('#475569')
         .font('Helvetica')
         .fontSize(11)
         .text('Subtotal:', 400, itemsEndY)
         .text(`$${order.itemsPrice.toFixed(2)}`, 480, itemsEndY, { align: 'right' });

      // Tax
      doc.text('Tax:', 400, itemsEndY + 15)
         .text(`$${order.taxPrice.toFixed(2)}`, 480, itemsEndY + 15, { align: 'right' });

      // Shipping
      doc.text('Shipping:', 400, itemsEndY + 30)
         .text(`$${order.shippingPrice.toFixed(2)}`, 480, itemsEndY + 30, { align: 'right' });

      // Total with separator line
      doc.moveTo(400, itemsEndY + 45)
         .lineTo(540, itemsEndY + 45)
         .strokeColor('#E2E8F0')
         .stroke();

      doc.fillColor('#1E293B')
         .font('Helvetica-Bold')
         .fontSize(14)
         .text('TOTAL:', 400, itemsEndY + 55)
         .fillColor('#4F46E5')
         .text(`$${order.totalPrice.toFixed(2)}`, 480, itemsEndY + 55, { align: 'right' });

      // ===== DELIVERY INFORMATION =====
      const deliveryY = itemsEndY + 90;
      
      doc.fillColor('#1E293B')
         .font('Helvetica-Bold')
         .fontSize(12)
         .text('DELIVERY INFORMATION', 50, deliveryY);

      doc.rect(50, deliveryY + 15, 500, 30)
         .fill('#F0F9FF')
         .stroke('#E0F2FE');

      doc.fillColor('#475569')
         .font('Helvetica')
         .fontSize(10)
         .text(`Order Status: ${order.orderStatus}`, 65, deliveryY + 25);
      
      if (order.deliveredAt) {
        doc.text(`Delivered On: ${new Date(order.deliveredAt).toLocaleString()}`, 300, deliveryY + 25);
      }

      // ===== FOOTER SECTION =====
      const footerY = doc.page.height - 60;
      
      // Thank you message
      doc.fillColor('#4F46E5')
         .fontSize(12)
         .font('Helvetica-Bold')
         .text('Thank you for your purchase!', 50, footerY, { align: 'center' });

      doc.fillColor('#64748B')
         .fontSize(9)
         .text('This is an computer-generated receipt. No signature required.', 50, footerY + 15, { align: 'center' })
         .text('For questions, contact: support@harmoniahub.com', 50, footerY + 30, { align: 'center' });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

module.exports = { generateReceiptPDF };