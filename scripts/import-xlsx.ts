import fs from 'node:fs'
import path from 'node:path'
import XLSX from 'xlsx'
import type { Lottery, Product, ProductPriority, Round, Store, StorePriority } from '../src/types'

const source = process.argv[2]
const roundId = process.argv[3]
if (!source || !roundId || !/^[a-zA-Z0-9-]+$/.test(roundId)) throw new Error('請指定 Excel 路徑與本輪唯一代號，例如 source.xlsx 2026-09-round-1 "9月新一輪抽選"')
const datedRound = /^\d{4}-\d{2}-\d{2}$/.test(roundId)
if (datedRound && (!Number.isFinite(Date.parse(roundId)) || new Date(roundId).toISOString().slice(0, 10) !== roundId)) throw new Error('輪次日期無效')
const roundName = process.argv[4] || (datedRound ? `${Number(roundId.slice(5, 7))}/${Number(roundId.slice(8, 10))} 本輪抽選` : '新一輪抽選')
const workbook = XLSX.readFile(source)
for (const sheet of ['雙北20店', '店家商品', '商品優先級']) {
  if (!workbook.Sheets[sheet]) throw new Error(`缺少必要工作表：${sheet}`)
}
const rows = <T>(name: string) => XLSX.utils.sheet_to_json<T>(workbook.Sheets[name], { defval: '' })
const trim = (value: unknown) => String(value ?? '').trim()
const slug = (value: string) => value.normalize('NFKC').replace(/臺/g, '台').replace(/[－—–]/g, '-').replace(/[^a-zA-Z0-9\u4e00-\u9fff]+/g, '-').replace(/^-|-$/g, '').toLowerCase()
const normalizeStoreName = (value: unknown) => trim(value).normalize('NFKC').replace(/臺/g, '台').replace(/[－—–]/g, '－')
const codeFrom = (value: string) => value.toUpperCase().match(/\b(BXG|BX|UX|CX)\s*-?\s*(\d{2})\b/)?.slice(1).join('-')
const codesFrom = (value: string) => [...value.toUpperCase().matchAll(/\b(BXG|BX|UX|CX)\s*-?\s*(\d{2})\b/g)].map(match => `${match[1]}-${match[2]}`)
// BX-00 is shared by distinct products; never share their priority or draw state.
const productIdFrom = (value: string) => {
  const code = codeFrom(value)
  if (code === 'BX-00') {
    const variant = ['蒼龍神劍', '暴風天馬'].find(name => value.includes(name))
    return variant ? `${code}-${variant}` : `unknown-${slug(value)}`
  }
  return code || `unknown-${slug(value)}`
}
const normalizePriority = (value: unknown): ProductPriority => {
  const text = trim(value)
  if (text === 'C / 低優先') return 'C'
  return ['S+', 'S', 'A+', 'A', 'A-', 'B+', 'B', 'B-', 'C', '低優先'].includes(text) ? text as ProductPriority : '未分類'
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
const priorityById = new Map<string, { priority: ProductPriority; sortOrder: number; note?: string }>()
for (const [priorityIndex, row] of priorityRows.entries()) {
  const rawName = trim(row['商品'] || row['商品／類別'])
  if (!rawName) continue
  const codes = codesFrom(rawName)
  const priority = normalizePriority(row['優先級'])
  const note = trim(row['備註']) || undefined
  for (const [codeIndex, itemCode] of codes.entries()) priorityById.set(itemCode === 'BX-00' ? productIdFrom(rawName) : itemCode, { priority, sortOrder: priorityIndex * 100 + codeIndex, note })
  if (codes.length > 1) continue
  const code = codes[0]
  const id = productIdFrom(rawName)
  const product: Product = { id, code, name: rawName, priority, sortOrder: priorityIndex * 100, note, aliases: [] }
  products.push(product); productById.set(id, product)
}
const lotteries: Lottery[] = []
for (const row of lotteryRows) {
  const storeName = normalizeStoreName(row['店家'])
  const rawName = trim(row['商品名字'])
  const url = trim(row['網頁'])
  const store = storeByName.get(storeName)
  if (!store) { warnings.push(`未知店家：${storeName}`); continue }
  if (!validUrl(url)) { warnings.push(`無效 URL：${storeName} / ${rawName}`); continue }
  const code = codeFrom(rawName)
  const id = productIdFrom(rawName)
  let product = productById.get(id)
  if (!product) {
    const configured = priorityById.get(id)
    product = { id, code, name: rawName, priority: configured?.priority || '未分類', sortOrder: configured?.sortOrder ?? 999999, note: configured?.note, aliases: [] }
    products.push(product); productById.set(id, product)
    if (!configured) warnings.push(`未設定優先級商品：${rawName}`)
  }
  if (rawName !== product.name && !product.aliases?.includes(rawName)) product.aliases?.push(rawName)
  lotteries.push({ id: `${store.id}-${product.id}-${roundId}`, roundId, storeId: store.id, productId: product.id, productRawName: rawName, lotteryUrl: url })
}
for (const [kind, entries] of Object.entries({ stores, products, lotteries })) {
  const ids = new Set<string>()
  for (const entry of entries) {
    if (ids.has(entry.id)) throw new Error(`${kind} 出現重複 ID：${entry.id}；未寫入資料，請先檢查來源。`)
    ids.add(entry.id)
  }
}
const rounds: Round[] = [{ id: roundId, name: roundName, startDate: datedRound ? roundId : '', active: true }]
fs.mkdirSync(path.join('src', 'data'), { recursive: true })
for (const [name, data] of Object.entries({ stores, products, lotteries, rounds })) fs.writeFileSync(path.join('src', 'data', `${name}.json`), `${JSON.stringify(data, null, 2)}\n`)
console.log(`Imported:\n${stores.filter(s => s.type === 'FUNBOX').length} Funbox stores\n${stores.filter(s => s.type === 'NON_FUNBOX').length} Non-Funbox stores\n${lotteries.length} lottery entries\n${products.length} products`)
console.log(`\nWarnings (${warnings.length}):\n${[...new Set(warnings)].join('\n') || 'None'}`)
