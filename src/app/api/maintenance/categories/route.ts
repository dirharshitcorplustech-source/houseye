import { MAINTENANCE_CATEGORIES } from '@/models/MaintenanceRequest';
import { successResponse } from '@/lib/utils/response';

export async function GET() {
  return successResponse({ categories: MAINTENANCE_CATEGORIES });
}
