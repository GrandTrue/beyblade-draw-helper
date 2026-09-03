import { useMemo, useRef, useState } from 'react'
import { Box, Check, ChevronDown, ChevronUp, Clock3, Copy, Download, ExternalLink, Flame, RotateCcw, Search, Settings, Store as StoreIcon, Upload } from 'lucide-react'
import storesData from './data/stores.json'
import productsData from './data/products.json'
import lotteriesData from './data/lotteries.json'
import roundsData from './data/rounds.json'
import { useDrawStatus } from './hooks/useDrawStatus'
import type { DrawStateMap, Lottery, Product, ProductPriority, Round, Store } from './types'
import { PRIORITY_ORDER, PRIORITY_WEIGHT, STORE_PRIORITY_WEIGHT } from './utils/constants'

const stores = storesData as Store[]
const products = productsData as Product[]
const lotteries = lotteriesData as Lottery[]
const storeMap = new Map(stores.map(store => [store.id, store]))
const isEntered = (states: DrawStateMap, id: string) => {
  const status = states[id]?.status ?? Object.entries(states).find(([legacyId]) => legacyId.startsWith(`${id}-`))?.[1].status
  return status === 'entered'
}

type View = 'products' | 'stores' | 'pending' | 'settings'
type StatusFilter = 'pending' | 'entered' | 'all'

function PriorityBadge({ priority }: { priority: ProductPriority }) { return <span className={`priority priority-${priority.replace('+', 'plus')}`}>{priority}</span> }

export default function App() {
  const [view, setView] = useState<View>('products')
  const [profile, setProfile] = useState<'line1' | 'line2'>('line1')
  const [query, setQuery] = useState('')
  const [priority, setPriority] = useState<ProductPriority | '全部'>('全部')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [queueOpen, setQueueOpen] = useState(false)
  const { states, setStatus, clear, importStates } = useDrawStatus(profile)
  const inputRef = useRef<HTMLInputElement>(null)
  const round = (roundsData as Round[]).find(item => item.active)

  const productRows = useMemo(() => products.map(product => {
    const entries = lotteries.filter(lottery => lottery.productId === product.id)
    const entered = entries.filter(entry => isEntered(states, entry.id)).length
    return { product, entries, entered, pending: entries.length - entered }
  }).filter(row => row.entries.length > 0).sort((a, b) => PRIORITY_WEIGHT[b.product.priority] - PRIORITY_WEIGHT[a.product.priority] || (a.product.sortOrder ?? 999999) - (b.product.sortOrder ?? 999999) || a.product.id.localeCompare(b.product.id)), [states])

  const matchingRows = productRows.filter(({ product, entries, pending, entered }) => {
    const q = query.trim().toLowerCase()
    const searchable = [product.code, product.name, ...(product.aliases || []), ...entries.map(entry => storeMap.get(entry.storeId)?.name)].join(' ').toLowerCase()
    return (!q || searchable.includes(q)) && (priority === '全部' || product.priority === priority) && (statusFilter === 'all' || (statusFilter === 'pending' ? pending > 0 : entered > 0))
  })
  const totalEntered = lotteries.filter(entry => isEntered(states, entry.id)).length
  const pendingCount = stores.filter(store => store.announcementStatus === 'pending').length
  const highQueue = productRows.flatMap(row => ['S+', 'S'].includes(row.product.priority) ? row.entries.filter(entry => !isEntered(states, entry.id)).map(entry => ({ ...row, entry })) : [])
  const currentQueue = highQueue[0]

  const exportData = () => {
    const blob = new Blob([JSON.stringify({ version: 1, statuses: states }, null, 2)], { type: 'application/json' })
    const href = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = href; anchor.download = 'beyblade-draw-status.json'; anchor.click(); URL.revokeObjectURL(href)
  }
  const importData = async (file?: File) => {
    if (!file) return
    try { const parsed = JSON.parse(await file.text()) as { statuses?: DrawStateMap }; if (!parsed.statuses) throw new Error(); importStates(parsed.statuses) } catch { alert('匯入失敗：檔案格式不正確') }
  }

  return <div className="app-shell">
    <header className="topbar"><div className="brand-mark"><span className="spinner-mark" /><div><h1>陀螺抽選助手</h1><p>{round?.name || '等待新一輪資料'}</p></div></div><div className="line-switch"><button className={profile === 'line1' ? 'active' : ''} onClick={() => setProfile('line1')}>LINE 1</button><button className={profile === 'line2' ? 'active' : ''} onClick={() => setProfile('line2')}>LINE 2</button></div></header>
    <main>
      {view === 'products' && <>
        <section className="summary">
          <div className="arena-lines" aria-hidden="true" />
          <div className="summary-title"><div><p>目前進度</p><h2>{round?.name || '等待新一輪資料'}</h2></div><span>{totalEntered} / {lotteries.length}</span></div>
          <div className="metrics">
            {(['S+', 'S'] as ProductPriority[]).map(level => <div className="metric" key={level}><strong>{productRows.filter(row => row.product.priority === level).reduce((sum, row) => sum + row.pending, 0)}</strong><span>{level} 待抽</span></div>)}
            <div className="metric success"><strong>{totalEntered}</strong><span>已完成</span></div>
            <button className="metric metric-button" onClick={() => setView('pending')}><strong>{pendingCount}</strong><span>待公布</span></button>
          </div>
          <button className="queue-button" disabled={!currentQueue} onClick={() => setQueueOpen(true)}><Flame size={20} />開始處理高優先<span>{highQueue.length} 筆</span></button>
        </section>
        <section className="tools" aria-label="篩選與搜尋">
          <label className="search"><Search size={18} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="搜尋型號、商品或店家" /></label>
          <div className="filter-scroll">{(['全部', ...PRIORITY_ORDER] as const).map(item => <button className={priority === item ? 'active' : ''} onClick={() => setPriority(item)} key={item}>{item}</button>)}</div>
          <div className="segmented">{([['pending', '尚未抽'], ['entered', '已抽'], ['all', '全部']] as const).map(([key, label]) => <button className={statusFilter === key ? 'active' : ''} onClick={() => setStatusFilter(key)} key={key}>{label}</button>)}</div>
        </section>
        <section className="product-list" aria-label="商品清單">
          <div className="section-heading"><h2>依商品處理</h2><span>{matchingRows.length} 項商品</span></div>
          {matchingRows.map(({ product, entries, entered, pending }) => {
            const open = expanded === product.id
            const sortedEntries = [...entries].sort((a, b) => (isEntered(states, a.id) ? 1 : 0) - (isEntered(states, b.id) ? 1 : 0) || STORE_PRIORITY_WEIGHT[storeMap.get(b.storeId)?.priority || '未分類'] - STORE_PRIORITY_WEIGHT[storeMap.get(a.storeId)?.priority || '未分類'])
            return <article className={`product-item ${open ? 'open' : ''}`} key={product.id}>
              <button className="product-summary" onClick={() => setExpanded(open ? null : product.id)} aria-expanded={open}>
                <PriorityBadge priority={product.priority} /><span className="product-copy"><strong>{product.code || product.id}</strong><span>{product.name.replace(product.code || '', '').trim() || product.name}</span><small className={pending ? 'urgent' : ''}>{pending ? `${pending} 間未抽` : '全部完成 ✓'}</small></span><span className="progress-copy">已抽 {entered} / {entries.length}</span>{open ? <ChevronUp /> : <ChevronDown />}
              </button>
              {open && <div className="store-entries">{sortedEntries.map(entry => {
                const store = storeMap.get(entry.storeId)!; const done = isEntered(states, entry.id)
                return <div className={`draw-row ${done ? 'done' : ''}`} key={entry.id}><div className="store-name"><span>{done ? <Check size={17} /> : <StoreIcon size={17} />}</span><div><strong>{store.name}</strong><small>{store.priority} · {store.city} · {profile === 'line1' ? 'LINE 1' : 'LINE 2'}</small></div></div><div className="draw-actions">{done ? <button className="undo" onClick={() => setStatus(entry.id, 'not-entered')}>取消已抽</button> : <><button className="copy-link" onClick={() => navigator.clipboard.writeText(entry.lotteryUrl)}><Copy size={16} />複製</button><a href={entry.lotteryUrl} target="_blank" rel="noreferrer" onClick={() => setStatus(entry.id, 'entered')}><ExternalLink size={16} />前往抽選</a><button onClick={() => setStatus(entry.id, 'entered')}><Check size={16} />標記已抽</button></>}</div></div>
              })}</div>}
            </article>
          })}
          {!matchingRows.length && <div className="empty"><Box /><strong>{lotteries.length ? '找不到符合條件的商品' : '等待新一輪抽選資料'}</strong><span>{lotteries.length ? '試著清除搜尋或更換篩選條件。' : '上一輪抽選連結已清空，店家名單與優先順序已保留。'}</span></div>}
        </section>
      </>}
      {view === 'stores' && <StoreView states={states} setStatus={setStatus} />}
      {view === 'pending' && <PendingView />}
      {view === 'settings' && <section className="page"><h2>設定</h2><p>目前操作：{profile === 'line1' ? 'LINE 1' : 'LINE 2'}。兩個帳號的進度分開保存。</p><div className="settings-list"><button onClick={exportData}><Download />匯出目前 LINE 紀錄</button><button onClick={() => inputRef.current?.click()}><Upload />匯入目前 LINE 紀錄</button><input ref={inputRef} hidden type="file" accept="application/json" onChange={event => importData(event.target.files?.[0])} /><button className="danger" onClick={() => confirm(`確定清除 ${profile === 'line1' ? 'LINE 1' : 'LINE 2'} 的全部已抽紀錄？`) && clear()}><RotateCcw />重置目前 LINE 的抽選狀態</button></div></section>}
    </main>
    <nav className="bottom-nav" aria-label="主要導覽">{([['products', Box, '商品'], ['stores', StoreIcon, '店家'], ['pending', Clock3, '待公布'], ['settings', Settings, '設定']] as const).map(([key, Icon, label]) => <button className={view === key ? 'active' : ''} onClick={() => setView(key)} key={key}><Icon /><span>{label}</span>{key === 'pending' && pendingCount > 0 && <b>{pendingCount}</b>}</button>)}</nav>
    {queueOpen && currentQueue && <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="高優先抽選佇列"><div className="queue-modal"><button className="modal-close" onClick={() => setQueueOpen(false)}>關閉</button><PriorityBadge priority={currentQueue.product.priority} /><p>下一筆 · 尚有 {highQueue.length} 筆</p><h2>{currentQueue.product.name}</h2><div className="queue-store"><StoreIcon /><div><strong>{storeMap.get(currentQueue.entry.storeId)?.name}</strong><span>{storeMap.get(currentQueue.entry.storeId)?.priority}</span></div></div><a className="modal-primary" href={currentQueue.entry.lotteryUrl} target="_blank" rel="noreferrer" onClick={() => setStatus(currentQueue.entry.id, 'entered')}><ExternalLink />前往 LINE 抽選</a><div className="modal-actions"><button onClick={() => setQueueOpen(false)}>稍後</button><button onClick={() => setStatus(currentQueue.entry.id, 'entered')}><Check />已抽，下一筆</button></div></div></div>}
  </div>
}

function StoreView({ states, setStatus }: { states: DrawStateMap; setStatus: (id: string, status: 'entered' | 'not-entered') => void }) {
  const published = stores.filter(store => store.announcementStatus === 'published').sort((a, b) => STORE_PRIORITY_WEIGHT[b.priority] - STORE_PRIORITY_WEIGHT[a.priority])
  const [open, setOpen] = useState<string | null>(published[0]?.id || null)
  return <section className="page"><h2>依店家查看</h2><p>先看店家的本輪商品，再逐筆前往抽選。</p><div className="store-list">{published.map(store => { const entries = lotteries.filter(entry => entry.storeId === store.id); const done = entries.filter(entry => isEntered(states, entry.id)).length; return <article key={store.id}><button className="store-summary" onClick={() => setOpen(open === store.id ? null : store.id)}><span><strong>{store.name}</strong><small>{store.priority} · {store.city}</small></span><span>{done} / {entries.length} 已抽</span>{open === store.id ? <ChevronUp /> : <ChevronDown />}</button>{open === store.id && <div className="store-products">{entries.sort((a, b) => { const productA = products.find(p => p.id === a.productId); const productB = products.find(p => p.id === b.productId); return PRIORITY_WEIGHT[productB?.priority || '未分類'] - PRIORITY_WEIGHT[productA?.priority || '未分類'] || (productA?.sortOrder ?? 999999) - (productB?.sortOrder ?? 999999) }).map(entry => { const product = products.find(item => item.id === entry.productId)!; const done = isEntered(states, entry.id); return <div className="store-product" key={entry.id}><PriorityBadge priority={product.priority} /><span><strong>{product.name}</strong><small>{done ? '已抽 ✓' : '尚未抽'}</small></span>{done ? <button onClick={() => setStatus(entry.id, 'not-entered')}>取消</button> : <a href={entry.lotteryUrl} target="_blank" rel="noreferrer" onClick={() => setStatus(entry.id, 'entered')}>抽選</a>}</div>})}</div>}</article>})}</div></section>
}

function PendingView() {
  const pending = stores.filter(store => store.announcementStatus === 'pending').sort((a, b) => STORE_PRIORITY_WEIGHT[b.priority] - STORE_PRIORITY_WEIGHT[a.priority])
  return <section className="page"><h2>待公布店家</h2><p>以下店家在商品資料表中尚未出現本輪抽選商品。</p><div className="pending-list">{pending.map(store => <article key={store.id}><div><strong>{store.name}</strong><span>{store.priority} · {store.city}</span></div><div>{store.facebookUrl && <a href={store.facebookUrl} target="_blank" rel="noreferrer" aria-label={`開啟 ${store.name} Facebook`}><ExternalLink /></a>}{store.lineOfficialId && <span className="line-id">LINE {store.lineOfficialId}</span>}</div></article>)}</div></section>
}
