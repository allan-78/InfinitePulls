// backend/utils/pushNotification.js
const { Expo } = require('expo-server-sdk');

// Create a new Expo SDK client
const expo = new Expo();

/**
 * Send push notification to a single device
 * @param {string} pushToken - Expo push token
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {object} data - Additional data to send
 * @returns {Promise} - Promise that resolves when notification is sent
 */
exports.sendPushNotification = async (pushToken, title, body, data = {}) => {
  try {
    console.log('📱 Preparing push notification...');
    console.log('Token:', pushToken ? pushToken.substring(0, 20) + '...' : 'none');
    console.log('Title:', title);
    console.log('Body:', body);

    // Check if the push token is valid
    if (!Expo.isExpoPushToken(pushToken)) {
      console.error(`❌ Invalid Expo push token: ${pushToken}`);
      throw new Error(`Invalid Expo push token: ${pushToken}`);
    }

    // Create the notification message
    const message = {
      to: pushToken,
      sound: 'default',
      title: title,
      body: body,
      data: data,
      priority: 'high',
      channelId: 'order-updates', // For Android
    };

    console.log('📨 Sending push message:', JSON.stringify(message, null, 2));

    // Send the notification
    const ticket = await expo.sendPushNotificationsAsync([message]);
    
    console.log('✅ Push notification ticket:', JSON.stringify(ticket, null, 2));
    
    // Check for errors in the ticket
    if (ticket[0].status === 'error') {
      console.error('❌ Push notification error:', ticket[0].message);
      throw new Error(ticket[0].message);
    }

    return ticket;
  } catch (error) {
    console.error('❌ Error in sendPushNotification:', error);
    throw error;
  }
};

/**
 * Send push notifications to multiple devices
 * @param {Array} messages - Array of message objects
 * @returns {Promise} - Promise that resolves when all notifications are sent
 */
exports.sendMultiplePushNotifications = async (messages) => {
  try {
    // Validate all tokens first
    const validMessages = messages.filter(msg => Expo.isExpoPushToken(msg.to));
    
    if (validMessages.length === 0) {
      console.log('No valid push tokens found');
      return { tickets: [], okCount: 0, errorCount: 0, errors: [] };
    }

    // Send notifications in chunks (Expo recommends chunks of 100)
    const chunks = expo.chunkPushNotifications(validMessages);
    const tickets = [];
    const errors = [];

    for (const chunk of chunks) {
      try {
        const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
        tickets.push(...ticketChunk);

        ticketChunk.forEach((ticket, index) => {
          if (ticket.status === 'error') {
            errors.push({
              index,
              details: ticket.details || null,
              message: ticket.message || 'Unknown Expo push error',
            });
          }
        });
      } catch (error) {
        console.error('Error sending chunk:', error);
        errors.push({ message: error.message || 'Chunk send failed' });
      }
    }

    const okCount = tickets.filter((ticket) => ticket.status === 'ok').length;
    const errorCount = errors.length;

    if (errorCount > 0) {
      console.error('Expo push ticket errors:', JSON.stringify(errors, null, 2));
    }

    return { tickets, okCount, errorCount, errors };
  } catch (error) {
    console.error('Error sending multiple push notifications:', error);
    throw error;
  }
};
