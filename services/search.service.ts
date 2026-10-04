import { searchLocalStore, getQuickCommands, QUICK_COMMANDS } from '../lib/search/client-search.ts'
import type { GroupedSearchResults, QuickCommand } from '../types/search.types.ts'
import type { PrimaryRole } from '../types/rbac.types.ts'

export { QUICK_COMMANDS }

export class SearchService {
  static search(
    companyId: string,
    query: string,
    userRole: PrimaryRole = 'business_owner',
    userPermissions: string[] = []
  ): GroupedSearchResults {
    return searchLocalStore(companyId, query, userRole, userPermissions)
  }

  static getQuickCommands(userRole: PrimaryRole = 'business_owner'): QuickCommand[] {
    return getQuickCommands(userRole)
  }
}
