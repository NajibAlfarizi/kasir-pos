/**
 * Profit calculation utility
 * Centralized profit calculation logic to avoid duplication and ensure consistency
 */

interface ItemForProfit {
  price?: number | null
  quantity: number
  product?: {
    price: number
    cost: number
  } | null
}

interface TransactionForProfit {
  items: ItemForProfit[]
}

/**
 * Calculate profit for a single transaction item
 */
export function calculateItemProfit(item: ItemForProfit): number {
  const itemPrice = item.price || item.product?.price || 0
  const itemCost = item.product?.cost || 0
  return (itemPrice - itemCost) * item.quantity
}

/**
 * Calculate total profit for a transaction
 */
export function calculateTransactionProfit(transaction: TransactionForProfit): number {
  return transaction.items.reduce((total, item) => {
    return total + calculateItemProfit(item)
  }, 0)
}

/**
 * Calculate profit for multiple transaction items
 */
export function calculateItemsProfit(items: ItemForProfit[]): number {
  return items.reduce((total, item) => {
    return total + calculateItemProfit(item)
  }, 0)
}
