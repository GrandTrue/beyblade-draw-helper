import type { ProductPriority, StorePriority } from '../types'

export const PRIORITY_WEIGHT: Record<ProductPriority, number> = {
  'S+': 700, S: 600, 'A+': 500, A: 400, 'A-': 350, 'B+': 300, B: 200, 'B-': 150, C: 100, 低優先: 50, 未分類: 0,
}
export const STORE_PRIORITY_WEIGHT: Record<StorePriority, number> = {
  優先抽: 400, 可以抽: 300, 稀有商品再抽: 200, '非 FUNBOX': 100, 未分類: 0,
}
export const PRIORITY_ORDER = ['S+', 'S', 'A+', 'A', 'A-', 'B+', 'B', 'B-', 'C', '低優先', '未分類'] as const
export const STORAGE_KEY = 'funbox_draw_status_v1'
