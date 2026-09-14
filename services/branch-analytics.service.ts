import { BranchAnalyticsRepository } from '../lib/repositories/branch-analytics.repository.ts'
import type {
  BranchKPIs,
  BranchComparisonData,
  ConsolidatedCompanyDashboardData,
} from '../types/branch.types.ts'

export class BranchAnalyticsService {
  /**
   * Get operational KPIs for a branch
   */
  static async getBranchKPIs(
    companyId: string,
    branchId: string
  ): Promise<BranchKPIs | null> {
    return BranchAnalyticsRepository.getBranchKPIs(companyId, branchId)
  }

  /**
   * Get multi-branch comparison report
   */
  static async getBranchComparison(
    companyId: string,
    period: string = 'this_month'
  ): Promise<BranchComparisonData> {
    return BranchAnalyticsRepository.getBranchComparison(companyId, period)
  }

  /**
   * Get executive consolidated company dashboard
   */
  static async getConsolidatedDashboard(
    companyId: string,
    period: string = 'this_month'
  ): Promise<ConsolidatedCompanyDashboardData> {
    return BranchAnalyticsRepository.getConsolidatedDashboard(companyId, period)
  }
}
