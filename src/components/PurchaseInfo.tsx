import type { Lottery } from '../types'

export function PurchaseInfo({ entry }: { entry?: Lottery }) {
  if (!entry?.purchaseNote) return null
  return <details className="purchase-info">
    <summary>購買地點與資格券有效期間</summary>
    <p>{entry.purchaseNote}</p>
    <small>以上為購買資格券使用時間，非抽選登記截止時間。</small>
  </details>
}
