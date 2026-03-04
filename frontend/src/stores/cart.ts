import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { SKU, Customer } from '@/types'

export interface CartItem {
  sku: SKU
  quantity: number
  price: number
  serialNos: string[]
}

export const useCartStore = defineStore('cart', () => {
  const items = ref<CartItem[]>([])
  const selectedCustomer = ref<Customer | null>(null)
  const discountAmount = ref(0)
  const paidAmount = ref(0)

  // 计算总金额
  const totalAmount = computed(() => {
    return items.value.reduce((sum, item) => sum + item.price * item.quantity, 0)
  })

  // 实际金额（扣减优惠）
  const actualAmount = computed(() => {
    return totalAmount.value - discountAmount.value
  })

  // 欠款金额
  const debtAmount = computed(() => {
    return Math.max(0, actualAmount.value - paidAmount.value)
  })

  // 商品数量
  const itemCount = computed(() => {
    return items.value.reduce((sum, item) => sum + item.quantity, 0)
  })

  // 添加商品
  function addItem(sku: SKU, quantity: number = 1) {
    const existingItem = items.value.find(item => item.sku.id === sku.id)
    if (existingItem) {
      existingItem.quantity += quantity
    } else {
      items.value.push({
        sku,
        quantity,
        price: Number(sku.price),
        serialNos: [],
      })
    }
  }

  // 更新数量
  function updateQuantity(skuId: number, quantity: number) {
    const item = items.value.find(item => item.sku.id === skuId)
    if (item) {
      if (quantity <= 0) {
        removeItem(skuId)
      } else {
        item.quantity = quantity
      }
    }
  }

  // 更新价格
  function updatePrice(skuId: number, price: number) {
    const item = items.value.find(item => item.sku.id === skuId)
    if (item) {
      item.price = price
    }
  }

  // 移除商品
  function removeItem(skuId: number) {
    const index = items.value.findIndex(item => item.sku.id === skuId)
    if (index >= 0) {
      items.value.splice(index, 1)
    }
  }

  // 清空购物车
  function clearCart() {
    items.value = []
    selectedCustomer.value = null
    discountAmount.value = 0
    paidAmount.value = 0
  }

  // 设置客户
  function setCustomer(customer: Customer | null) {
    selectedCustomer.value = customer
  }

  // 设置优惠金额
  function setDiscount(amount: number) {
    discountAmount.value = amount
  }

  // 设置已付金额
  function setPaidAmount(amount: number) {
    paidAmount.value = amount
  }

  return {
    items,
    selectedCustomer,
    discountAmount,
    paidAmount,
    totalAmount,
    actualAmount,
    debtAmount,
    itemCount,
    addItem,
    updateQuantity,
    updatePrice,
    removeItem,
    clearCart,
    setCustomer,
    setDiscount,
    setPaidAmount,
  }
})
