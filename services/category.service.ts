import type {
  ProductCategoryRecord,
  CreateCategoryInput,
  UpdateCategoryInput,
  CategoryTreeItem,
} from '../types/category.types.ts'
import { CategoryRepository } from '../lib/repositories/category.repository.ts'

export class CategoryService {
  static async getCategories(
    companyId: string,
    activeOnly: boolean = false,
    productType?: string,
    search?: string
  ): Promise<ProductCategoryRecord[]> {
    if (!companyId) {
      throw new Error('Tenant Company ID is required to fetch categories.')
    }
    return CategoryRepository.getCategories(companyId, activeOnly, productType, search)
  }

  static async getCategoryById(id: string, companyId: string): Promise<ProductCategoryRecord | null> {
    if (!companyId) {
      throw new Error('Tenant Company ID is required.')
    }
    return CategoryRepository.getCategoryById(id, companyId)
  }

  static async getCategoryTree(companyId: string, activeOnly: boolean = false): Promise<CategoryTreeItem[]> {
    if (!companyId) {
      throw new Error('Tenant Company ID is required.')
    }
    return CategoryRepository.getCategoryTree(companyId, activeOnly)
  }

  static async createCategory(input: CreateCategoryInput, companyId: string): Promise<ProductCategoryRecord> {
    if (!companyId) {
      throw new Error('Tenant Company ID is required to create a category.')
    }
    return CategoryRepository.createCategory(input, companyId)
  }

  static async updateCategory(input: UpdateCategoryInput, companyId: string): Promise<ProductCategoryRecord> {
    if (!companyId) {
      throw new Error('Tenant Company ID is required to update a category.')
    }
    return CategoryRepository.updateCategory(input, companyId)
  }

  static async deleteCategory(id: string, companyId: string): Promise<boolean> {
    if (!companyId) {
      throw new Error('Tenant Company ID is required to delete a category.')
    }
    return CategoryRepository.deleteCategory(id, companyId)
  }

  static async seedDefaultCategories(companyId: string): Promise<ProductCategoryRecord[]> {
    if (!companyId) {
      throw new Error('Tenant Company ID is required.')
    }
    return CategoryRepository.seedDefaultCategories(companyId)
  }
}
