/**
 * HOUSEYE.COM — List in-app notifications for current user
 */

import { getCurrentUser } from '@/lib/auth/get-session';
import { connectDB } from '@/lib/db/connect';
import { Notification } from '@/models';
import { successResponse, Errors } from '@/lib/utils/response';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return Errors.unauthorized();

    await connectDB();

    const notifications = await Notification.find({
      recipientUserId: user.id,
      channel: 'IN_APP',
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    return successResponse({
      notifications: notifications.map((n) => ({
        id: n._id.toString(),
        type: n.notificationType,
        subject: n.subject,
        message: n.message,
        link: n.link,
        status: n.status,
        createdAt: n.createdAt,
      })),
    });
  } catch (err) {
    console.error('[Houseye] GET notifications:', err);
    return Errors.server();
  }
}
