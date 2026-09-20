import { TrashRepository } from '../lib/repositories/trash.repository.ts'
import type { TrashCategory, TrashRecord, TrashSummary } from '../types/trash.types.ts'

export class TrashService {
  static async getTrashItems(companyId: string, category?: TrashCategory): Promise<TrashRecord[]> {
    return TrashRepository.getTrashItems(companyId, category)
  }

  static async getTrashSummary(companyId: string): Promise<TrashSummary> {
    return TrashRepository.getTrashSummary(companyId)
  }

  static async moveToTrash(params: {
    category: TrashCategory
    item: any
    companyId: string
    deletedByName?: string
  }): Promise<TrashRecord> {
    return TrashRepository.moveToTrash(params)
  }

  static async restoreFromTrash(trashId: string, companyId: string): Promise<any> {
    return TrashRepository.restoreFromTrash(trashId, companyId)
  }

  static async permanentDelete(trashId: string, companyId: string): Promise<boolean> {
    return TrashRepository.permanentDelete(trashId, companyId)
  }

  static async purgeExpiredTrash(companyId?: string, retentionDays?: number): Promise<{ purgedCount: number; purgedIds: string[] }> {
    return TrashRepository.purgeExpiredTrash(companyId, retentionDays)
  }

  static async emptyTrash(companyId: string, category?: TrashCategory): Promise<number> {
    return TrashRepository.emptyTrash(companyId, category)
  }
}
