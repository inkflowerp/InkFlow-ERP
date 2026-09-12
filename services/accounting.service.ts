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
  static async getExpenses(companyId: string = 'c-01'): Promise<ExpenseRecord[]> {
    const expenses = PrintERPDataStore.get<ExpenseRecord[]>(STORAGE_KEYS.EXPENSES) || []
    return expenses.filter((e) => !e.company_id || e.company_id === companyId)
  }

  static async createExpense(data: Partial<ExpenseRecord>): Promise<ExpenseRecord> {
    const id = data.id || `exp-${Date.now()}`
    const num = data.expense_number || `EXP-2024-${Math.floor(Math.random() * 900) + 100}`
    const newExpense: ExpenseRecord = {
      id,
      company_id: data.company_id || 'c-01',
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
    PrintERPDataStore.addItem(STORAGE_KEYS.EXPENSES, newExpense)

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
    PrintERPDataStore.addItem(STORAGE_KEYS.CASH_BOOK, cashEntry)

    return newExpense
  }

  static async deleteExpense(id: string): Promise<boolean> {
    return PrintERPDataStore.removeItem(STORAGE_KEYS.EXPENSES, id)
  }

  static async getBankAccounts(companyId: string = 'c-01'): Promise<BankAccountRecord[]> {
    const accounts = PrintERPDataStore.get<BankAccountRecord[]>(STORAGE_KEYS.BANK_ACCOUNTS) || []
    return accounts.filter((a) => !a.company_id || a.company_id === companyId)
  }

  static async updateBankAccount(id: string, data: Partial<BankAccountRecord>): Promise<BankAccountRecord | null> {
    return PrintERPDataStore.updateItem<BankAccountRecord>(STORAGE_KEYS.BANK_ACCOUNTS, id, data)
  }

  static async getCashBook(companyId: string = 'c-01'): Promise<CashBookEntryRecord[]> {
    const entries = PrintERPDataStore.get<CashBookEntryRecord[]>(STORAGE_KEYS.CASH_BOOK) || []
    return entries.filter((e) => !e.company_id || e.company_id === companyId)
  }

  static async addCashBookEntry(entry: Partial<CashBookEntryRecord>): Promise<CashBookEntryRecord> {
    const id = entry.id || `cbe-${Date.now()}`
    const newEntry: CashBookEntryRecord = {
      id,
      company_id: entry.company_id || 'c-01',
      entry_date: entry.entry_date || new Date().toISOString().split('T')[0],
      entry_type: entry.entry_type || 'cash_in',
      amount: entry.amount || 0,
      category: entry.category || 'General',
      description: entry.description || '',
      reference_id: entry.reference_id,
      performed_by_name: entry.performed_by_name || 'Cashier',
      created_at: new Date().toISOString(),
    }
    PrintERPDataStore.addItem(STORAGE_KEYS.CASH_BOOK, newEntry)
    return newEntry
  }
}

