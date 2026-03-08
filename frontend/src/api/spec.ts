import request from '@/utils/request'

// 规格类型
export interface SpecType {
  id: number
  name: string
  sort: number
  active: boolean
  createdAt: string
}

// 获取启用的规格类型列表（用于 SKU 创建）
export function getActiveSpecTypes() {
  return request.get<SpecType[]>('/specs/active')
}

// 获取所有规格类型
export function getSpecTypes(includeInactive = false) {
  return request.get<SpecType[]>('/specs', { params: { includeInactive } })
}

// 创建规格类型
export function createSpecType(data: { name: string; sort?: number }) {
  return request.post<SpecType>('/specs', data)
}

// 更新规格类型
export function updateSpecType(id: number, data: Partial<SpecType>) {
  return request.put<SpecType>(`/specs/${id}`, data)
}

// 删除规格类型
export function deleteSpecType(id: number) {
  return request.delete(`/specs/${id}`)
}

// 批量更新排序
export function reorderSpecs(ids: number[]) {
  return request.put('/specs/reorder', { ids })
}
