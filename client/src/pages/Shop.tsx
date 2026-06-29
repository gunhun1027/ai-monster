// 商店页面 - 购买道具
import { useState, useEffect, useCallback } from 'react'
import { shopApi, itemApi } from '../services/api'
import Inventory from '../components/Inventory'
import type { ShopItem, InventoryItem } from '../types'

export default function Shop() {
  const [items, setItems] = useState<ShopItem[]>([])
  const [userCoins, setUserCoins] = useState(0)
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [activeEffects, setActiveEffects] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [buying, setBuying] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [tab, setTab] = useState<'shop' | 'inventory'>('shop')

  const fetchData = useCallback(async () => {
    try {
      const [shopData, invData] = await Promise.all([
        shopApi.items(),
        itemApi.inventory(),
      ])
      setItems(shopData.data.items)
      setUserCoins(shopData.data.userCoins)
      setInventory(invData.data.items)
      setActiveEffects(invData.data.activeEffects)
    } catch (err) {
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const handleBuy = async (item: ShopItem) => {
    if (buying) return
    if (userCoins < item.price) {
      setToast('金币不足，去答题赚取吧！')
      setTimeout(() => setToast(null), 2000)
      return
    }
    if (!item.unlocked) {
      setToast(`需要Lv.${item.unlockedAt}才能购买`)
      setTimeout(() => setToast(null), 2000)
      return
    }
    setBuying(item.id)
    try {
      const result = await shopApi.buy(item.id)
      setUserCoins(result.data.newCoins)
      setToast(`购买成功！${item.icon} ${item.name}`)
      setTimeout(() => setToast(null), 2000)
      await fetchData()
    } catch (err) {
      setToast(err instanceof Error ? err.message : '购买失败')
      setTimeout(() => setToast(null), 2000)
    } finally {
      setBuying(null)
    }
  }

  const handleUseItem = async (userItemId: string) => {
    try {
      await itemApi.use(userItemId)
      setToast('使用成功！')
      setTimeout(() => setToast(null), 2000)
      await fetchData()
    } catch (err) {
      setToast(err instanceof Error ? err.message : '使用失败')
      setTimeout(() => setToast(null), 2000)
    }
  }

  const handleEquip = async (userItemId: string, equip: boolean) => {
    try {
      await itemApi.equip(userItemId, equip)
      setToast(equip ? '已装备' : '已卸下')
      setTimeout(() => setToast(null), 2000)
      await fetchData()
    } catch (err) {
      setToast(err instanceof Error ? err.message : '操作失败')
      setTimeout(() => setToast(null), 2000)
    }
  }

  const typeLabels: Record<string, string> = { food: '食物', equipment: '装备', decoration: '装饰', consumable: '消耗品' }

  if (loading) return <div className="page-loader"><div className="loading-spinner"></div></div>

  return (
    <div className="shop-page">
      <div className="shop-header">
        <h1 className="shop-title">商店</h1>
        <div className="shop-coins">
          <span>💰</span>
          <span className="coins-amount">{userCoins}</span>
        </div>
      </div>

      <div className="shop-tabs">
        <button className={`shop-tab ${tab === 'shop' ? 'active' : ''}`} onClick={() => setTab('shop')}>
          🏪 商店
        </button>
        <button className={`shop-tab ${tab === 'inventory' ? 'active' : ''}`} onClick={() => setTab('inventory')}>
          🎒 背包
        </button>
      </div>

      {tab === 'shop' ? (
        <div className="shop-grid">
          {items.map(item => (
            <div key={item.id} className={`card shop-item ${!item.unlocked ? 'locked' : ''}`}>
              <div className="item-icon">{item.icon}</div>
              <h3 className="item-name">{item.name}</h3>
              <p className="item-desc">{item.description}</p>
              <span className="item-type-badge">{typeLabels[item.type]}</span>
              <div className="item-footer">
                <span className="item-price">💰 {item.price}</span>
                {!item.unlocked ? (
                  <span className="item-locked">Lv.{item.unlockedAt}解锁</span>
                ) : (
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => handleBuy(item)}
                    disabled={buying === item.id}
                  >
                    {buying === item.id ? '购买中...' : '购买'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <Inventory
          items={inventory}
          activeEffects={activeEffects}
          onUse={handleUseItem}
          onEquip={handleEquip}
        />
      )}

      {toast && <div className="shop-toast">{toast}</div>}

      <style>{`
        .shop-page { max-width: 900px; margin: 0 auto; }
        .shop-header {
          display: flex; align-items: center; justify-content: space-between;
          margin-bottom: 20px;
        }
        .shop-title { font-size: 22px; font-weight: 700; color: var(--text-primary); }
        .shop-coins {
          display: flex; align-items: center; gap: 6px;
          padding: 6px 14px; background: var(--warning-light);
          border-radius: var(--radius-full); font-size: 16px; font-weight: 600;
          color: var(--warning-text);
        }
        .coins-amount { font-variant-numeric: tabular-nums; }
        .shop-tabs {
          display: flex; gap: 8px; margin-bottom: 20px;
        }
        .shop-tab {
          padding: 8px 18px; border-radius: var(--radius-full);
          font-size: 14px; font-weight: 500;
          border: 1px solid var(--border); background: var(--bg-card);
          color: var(--text-secondary); cursor: pointer; transition: all 0.15s;
        }
        .shop-tab.active {
          background: var(--primary); color: var(--text-on-primary);
          border-color: var(--primary);
        }
        .shop-grid {
          display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px;
        }
        .shop-item {
          display: flex; flex-direction: column; align-items: center; gap: 6px;
          padding: 16px 12px; text-align: center; position: relative;
        }
        .shop-item.locked { opacity: 0.6; }
        .shop-item.locked::after {
          content: ''; position: absolute; inset: 0; border-radius: var(--radius);
          background: color-mix(in srgb, var(--text-primary) 15%, transparent); pointer-events: none;
        }
        .item-icon { font-size: 36px; }
        .item-name { font-size: 15px; font-weight: 600; color: var(--text-primary); }
        .item-desc { font-size: 12px; color: var(--text-secondary); line-height: 1.4; }
        .item-type-badge {
          font-size: 11px; padding: 2px 8px; border-radius: var(--radius-full);
          background: var(--bg-muted); color: var(--text-muted);
        }
        .item-footer {
          display: flex; align-items: center; justify-content: space-between;
          width: 100%; margin-top: 4px;
        }
        .item-price { font-size: 14px; font-weight: 600; color: var(--warning); }
        .item-locked { font-size: 12px; color: var(--text-muted); }
        .btn-sm { padding: 4px 12px; font-size: 12px; }
        .shop-toast {
          position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%);
          background: var(--primary); color: var(--text-on-primary);
          padding: 8px 20px; border-radius: var(--radius-full);
          font-size: 14px; font-weight: 500; z-index: 100;
          animation: toast-in 0.3s var(--ease-spring);
          box-shadow: var(--shadow);
        }
        @keyframes toast-in {
          from { opacity: 0; transform: translateX(-50%) translateY(8px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
    </div>
  )
}
