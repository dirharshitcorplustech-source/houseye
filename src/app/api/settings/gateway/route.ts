/**
 * HOUSEYE.COM — Owner gateway settings
 * Owner's keys for tenant collections only.
 */

import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth/get-session';
import {
  getOwnerGatewayPublic,
  saveOwnerGateway,
} from '@/services/payments/owner-gateway';
import { successResponse, Errors } from '@/lib/utils/response';
import { isOwner, isSuperAdmin } from '@/services/authorization';
import { writeAuditLog } from '@/services/audit/write';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return Errors.unauthorized();
    if (!user.accountId) return Errors.forbidden();
    if (!isOwner(user) && !isSuperAdmin(user)) {
      return Errors.forbidden('Only Owner can view gateway settings');
    }

    const gateway = await getOwnerGatewayPublic(user.accountId);
    return successResponse({
      gateway,
      architecture: {
        subscriptionPayments: 'Houseye platform gateway (Owner pays Houseye)',
        tenantCollections: 'Your gateway keys (Tenant pays you)',
        notifications: 'Houseye platform providers (central)',
      },
    });
  } catch (err) {
    console.error('[Houseye] GET gateway:', err);
    return Errors.server();
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return Errors.unauthorized();

    const body = await req.json();
    const result = await saveOwnerGateway(user, {
      provider: body.provider || 'NONE',
      keyId: body.keyId,
      keySecret: body.keySecret,
      webhookSecret: body.webhookSecret,
      mode: body.mode,
      enabled: body.enabled,
      allowOnlineRent: body.allowOnlineRent,
      allowPartialOnline: body.allowPartialOnline,
    });

    if (!result.success) {
      const status = result.code === 'FORBIDDEN' ? 403 : 422;
      return new Response(
        JSON.stringify({
          success: false,
          error: { code: result.code, message: result.message },
        }),
        { status, headers: { 'Content-Type': 'application/json' } }
      );
    }

    await writeAuditLog({
      accountId: user.accountId || undefined,
      actorUserId: user.id,
      actorRole: user.role,
      action: 'gateway.settings_updated',
      entityType: 'AccountGateway',
      metadata: {
        provider: body.provider,
        enabled: body.enabled !== false,
        // never log secrets
      },
    });

    return successResponse({ gateway: result.gateway }, 'Gateway settings saved');
  } catch (err) {
    console.error('[Houseye] PUT gateway:', err);
    return Errors.server();
  }
}
