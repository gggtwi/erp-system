import request from '@/utils/request'
import type { Product, Category, PaginateResponse } from '@/types'

export interface ProductQuery {
  page?: number
  pageSize?: number
  keyword?: string
  categoryId?: number
  active?: boolean
}

// 商品列表
export function getProducts(params: ProductQuery) {
  return request.get<PaginateResponse<Product>>('/products', { params })
}

// 商品详情
export function getProduct(id: number) {
  return request.get<Product>(`/products/${id}`)
}

// 创建商品
export function createProduct(data: Partial<Product>) {
  return request.post<Product>('/products', data)
}

// 更新商品
export function updateProduct(id: number, data: Partial<Product>) {
  return request.put<Product>(`/products/${id}`, data)
}

// 删除商品
export function deleteProduct(id: number) {
  return request.delete(`/products/${id}`)
}

// 分类列表
export function getCategories() {
  return request.get<Category[]>('/categories')
}

// 创建分类
export function createCategory(data: Partial<Category>) {
  return request.post<Category>('/categories', data)
}

// 更新分类
export function updateCategory(id: number, data: Partial<Category>) {
  return request.put<Category>(`/categories/${id}`, data)
}

// 删除分类
export function deleteCategory(id: number) {
  return request.delete(`/categories/${id}`)
}
