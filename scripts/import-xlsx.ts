import fs from 'node:fs'
import path from 'node:path'
import XLSX from 'xlsx'
import type { Lottery, Product, ProductPriority, Round, Store, StorePriority } from '../src/types'

const source = process.argv[2] || 'Funbox_雙北20店整理_含來玩聚_v4_fixed.xlsx'
const roundId = process.argv[3] || '2026-08-28'
const workbook = XLSX.readFile(source)
const rows = <T>(name: string) => XLSX.utils.sheet_to_json<T>(workbook.Sheets[name], { defval: '' })
const trim = (value: unknown) => String(value ?? '').trim()
const slug = (value: string) => value.normalize('NFKC').replace(/臺/g, '台').replace(/[－—–]/g, '-').replace(/[^a-zA-Z0-9\u4e00-\u9fff]+/g, '-').replace(/^-|-$/g, '').toLowerCase()
const normalizeStoreName = (value: unknown) => trim(value).normalize('NFKC').replace(/臺/g, '台').replace(/[－—–]/g, '－')
const codeFrom = (value: string) => value.toUpperCase().match(/\b(BXG|BX|UX|CX)\s*-?\s*(\d{2})\b/)?.slice(1).join('-')
const normalizePriority = (value: unknown): ProductPriority => {
  const text = trim(value)
  if (text === 'C / 低優先') return 'C'
  return ['S+', 'S', 'A+', 'A', 'B+', 'B', 'C', '低優先'].includes(text) ? text as ProductPriority : '未分類'
}
const storePriority = (value: unknown, type: Store['type']): StorePriority => type === 'NON_FUNBOX' ? '非 FUNBOX' : (['優先抽', '可以抽', '稀有商品再抽'].includes(trim(value)) ? trim(value) as StorePriority : '未分類')
const validUrl = (value: string) => { try { return ['http:', 'https:'].includes(new URL(value).protocol) } catch { return false } }

const storeRows = rows<Record<string, unknown>>('雙北20店')
const nonFunboxRows = rows<Record<string, unknown>>('非FUNBOX店家')
const lotteryRows = rows<Record<string, unknown>>('店家商品')
const priorityRows = rows<Record<string, unknown>>('商品優先級')
const warnings: string[] = []
const lotteryStoreNames = new Set(lotteryRows.map(row => normalizeStoreName(row['店家'])))

const stores: Store[] = storeRows.map(row => {
  const name = normalizeStoreName(row['店名'])
  const facebookUrl = trim(row['粉專網址'])
  return {
    id: slug(name), name, city: trim(row['城市']), type: 'FUNBOX', priority: storePriority(row['抽選建議分級'], 'FUNBOX'),
    lineOfficialId: trim(row['LINE官方帳號ID']) || undefined,
    facebookUrl: validUrl(facebookUrl) ? facebookUrl : undefined,
    announcementStatus: lotteryStoreNames.has(name) ? 'published' : 'pending',
  }
})
for (const row of nonFunboxRows) {
  const name = normalizeStoreName(row['店家'])
  stores.push({ id: slug(name), name, city: '非 Funbox', type: 'NON_FUNBOX', priority: '非 FUNBOX', announcementStatus: lotteryStoreNames.has(name) ? 'published' : 'pending' })
}
const storeByName = new Map(stores.map(store => [store.name, store]))

const products: Product[] = []
const productById = new Map<string, Product>()
for (const row of priorityRows) {
  const rawName = trim(row['商品'])
  const code = codeFrom(rawName)
  const id = code || slug(rawName)
  const product: Product = { id, code, name: rawName, priority: normalizePriority(row['優先級']), note: trim(row['備註']) || undefined, aliases: [] }
  products.push(product); productById.set(id, product)
}
const lotteries: Lottery[] = []
for (const [index, row] of lotteryRows.entries()) {
  const storeName = normalizeStoreName(row['店家'])
  const rawName = trim(row['商品名字'])
  const url = trim(row['網頁'])
  const store = storeByName.get(storeName)
  if (!store) { warnings.push(`未知店家：${storeName}`); continue }
  if (!validUrl(url)) { warnings.push(`無效 URL：${storeName} / ${rawName}`); continue }
  const code = codeFrom(rawName)
  let product = code ? productById.get(code) : undefined
  if (!product) {
    const id = code || `unknown-${slug(rawName)}`
    product = { id, code, name: rawName, priority: '未分類', aliases: [] }
    products.push(product); productById.set(id, product)
    warnings.push(`未設定優先級商品：${rawName}`)
  }
  if (rawName !== product.name && !product.aliases?.includes(rawName)) product.aliases?.push(rawName)
  lotteries.push({ id: `${store.id}-${product.id}-${roundId}-${index + 1}`, roundId, storeId: store.id, productId: product.id, productRawName: rawName, lotteryUrl: url })
}
const rounds: Round[] = [{ id: roundId, name: '8/28 本輪抽選', startDate: roundId, active: true }]
fs.mkdirSync(path.join('src', 'data'), { recursive: true })
for (const [name, data] of Object.entries({ stores, products, lotteries, rounds })) fs.writeFileSync(path.join('src', 'data', `${name}.json`), `${JSON.stringify(data, null, 2)}\n`)
console.log(`Imported:\n${stores.filter(s => s.type === 'FUNBOX').length} Funbox stores\n${stores.filter(s => s.type === 'NON_FUNBOX').length} Non-Funbox stores\n${lotteries.length} lottery entries\n${products.length} products`)
console.log(`\nWarnings (${warnings.length}):\n${[...new Set(warnings)].join('\n') || 'None'}`)
