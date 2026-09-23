import { messaging } from './firebaseAdmin';

export async function sendNotificationToUser(fcmToken: string, title: string, body: string) {
  const message = {
    token: fcmToken,
    notification: {
      title,
      body,
    },
    android: {
      notification: {
        sound: 'default',
      },
    },
    apns: {
      payload: {
        aps: {
          sound: 'default',
        },
      },
    },
  };

  try {
    const response = await messaging.send(message);
    console.log('Notification sent:', response);
    return response;
  } catch (error) {
    console.error('Error sending notification:', error);
    throw error;
  }
}
