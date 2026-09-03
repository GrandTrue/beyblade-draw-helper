export type ProductPriority = 'S+' | 'S' | 'A+' | 'A' | 'A-' | 'B+' | 'B' | 'B-' | 'C' | '低優先' | '未分類'
export type StorePriority = '優先抽' | '可以抽' | '稀有商品再抽' | '非 FUNBOX' | '未分類'
export type AnnouncementStatus = 'published' | 'pending' | 'no-draw' | 'unknown'
export type DrawStatus = 'not-entered' | 'entered' | 'skip'

export interface Store {
  id: string
  name: string
  city: string
  type: 'FUNBOX' | 'NON_FUNBOX'
  priority: StorePriority
  lineOfficialId?: string
  facebookUrl?: string
  announcementStatus: AnnouncementStatus
}

export interface Product {
  id: string
  code?: string
  name: string
  priority: ProductPriority
  sortOrder?: number
  note?: string
  aliases?: string[]
}

export interface Lottery {
  id: string
  roundId: string
  storeId: string
  productId: string
  productRawName: string
  lotteryUrl: string
  purchaseNote?: string
}

export interface Round { id: string; name: string; startDate: string; active: boolean }
export interface DrawState { status: DrawStatus; updatedAt?: string }
export type DrawStateMap = Record<string, DrawState>
