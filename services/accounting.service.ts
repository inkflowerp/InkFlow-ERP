import {
  ExpenseRecord,
  BankAccountRecord,
  CashBookEntryRecord,
  ProfitWaterfallData,
  ExpenseCategory,
} from '@/types/accounting.types'

export function maskAccountNumber(accNo: string): string {
  if (!accNo || accNo.length < 4) return '••••'
  const lastFour = accNo.slice(-4)
  return `•••• •••• ${lastFour}`
}



import { PrintERPDataStore, STORAGE_KEYS } from '@/lib/db/data-store'

export class AccountingService {
  static async getExpenses(companyId: string = ''): Promise<ExpenseRecord[]> {
    const expenses = (companyId ? PrintERPDataStore.getAll<ExpenseRecord>(STORAGE_KEYS.EXPENSES, companyId) : []) ||
      PrintERPDataStore.get<ExpenseRecord[]>(STORAGE_KEYS.EXPENSES, companyId) || []
    return expenses.filter((e) => !companyId || e.company_id === companyId)
  }

  static async createExpense(data: Partial<ExpenseRecord>): Promise<ExpenseRecord> {
    const id = data.id || `exp-${Date.now()}`
    const num = data.expense_number || `EXP-2024-${Math.floor(Math.random() * 900) + 100}`
    const company_id = data.company_id || ''
    const newExpense: ExpenseRecord = {
      id,
      company_id,
      expense_number: num,
      expense_date: data.expense_date || new Date().toISOString().split('T')[0],
      category: data.category || 'office',
      amount: data.amount || 0,
      payment_method: data.payment_method || 'cash',
      vendor_name: data.vendor_name || 'General Vendor',
      description: data.description || 'General business expense',
      branch_name: data.branch_name || 'Head Office',
      recorded_by_name: data.recorded_by_name || 'Accounts Officer',
      created_at: new Date().toISOString(),
    }
    PrintERPDataStore.addItem(STORAGE_KEYS.EXPENSES, newExpense, company_id)

    // Also record cash book outflow
    const cashEntry: CashBookEntryRecord = {
      id: `cbe-${Date.now()}`,
      company_id: newExpense.company_id,
      entry_date: newExpense.expense_date,
      entry_type: 'cash_out',
      amount: newExpense.amount,
      category: String(newExpense.category),
      description: `Voucher ${newExpense.expense_number}: ${newExpense.description}`,
      reference_id: newExpense.expense_number,
      performed_by_name: newExpense.recorded_by_name,
      created_at: new Date().toISOString(),
    }
    PrintERPDataStore.addItem(STORAGE_KEYS.CASH_BOOK, cashEntry, company_id)

    return newExpense
  }

  static async deleteExpense(id: string, companyId?: string): Promise<boolean> {
    return PrintERPDataStore.removeItem(STORAGE_KEYS.EXPENSES, id, companyId)
  }

  static async getBankAccounts(companyId: string = ''): Promise<BankAccountRecord[]> {
    const accounts = (companyId ? PrintERPDataStore.getAll<BankAccountRecord>(STORAGE_KEYS.BANK_ACCOUNTS, companyId) : []) ||
      PrintERPDataStore.get<BankAccountRecord[]>(STORAGE_KEYS.BANK_ACCOUNTS, companyId) || []
    return accounts.filter((a) => !companyId || a.company_id === companyId)
  }

  static async updateBankAccount(id: string, data: Partial<BankAccountRecord>, companyId?: string): Promise<BankAccountRecord | null> {
    return PrintERPDataStore.updateItem<BankAccountRecord>(STORAGE_KEYS.BANK_ACCOUNTS, id, data, companyId)
  }

  static async getCashBook(companyId: string = ''): Promise<CashBookEntryRecord[]> {
    const entries = (companyId ? PrintERPDataStore.getAll<CashBookEntryRecord>(STORAGE_KEYS.CASH_BOOK, companyId) : []) ||
      PrintERPDataStore.get<CashBookEntryRecord[]>(STORAGE_KEYS.CASH_BOOK, companyId) || []
    return entries.filter((e) => !companyId || e.company_id === companyId)
  }

  static async addCashBookEntry(entry: Partial<CashBookEntryRecord>): Promise<CashBookEntryRecord> {
    const id = entry.id || `cbe-${Date.now()}`
    const company_id = entry.company_id || ''
    const newEntry: CashBookEntryRecord = {
      id,
      company_id,
      entry_date: entry.entry_date || new Date().toISOString().split('T')[0],
      entry_type: entry.entry_type || 'cash_in',
      amount: entry.amount || 0,
      category: entry.category || 'General',
      description: entry.description || '',
      reference_id: entry.reference_id,
      performed_by_name: entry.performed_by_name || 'Cashier',
      created_at: new Date().toISOString(),
    }
    PrintERPDataStore.addItem(STORAGE_KEYS.CASH_BOOK, newEntry, company_id)
    return newEntry
  }
}

