// 背包组件 - 展示用户拥有的道具
import { useState } from 'react'
import type { InventoryItem } from '../types'

interface InventoryProps {
  items: InventoryItem[]
  activeEffects: string[]
  onUse: (userItemId: string) => void
  onEquip: (userItemId: string, equip: boolean) => void
}

type TabType = 'food' | 'equipment' | 'decoration' | 'consumable'

export default function Inventory({ items, activeEffects, onUse, onEquip }: InventoryProps) {
  const [tab, setTab] = useState<TabType>('food')

  const tabs: { key: TabType; label: string; icon: string }[] = [
    { key: 'food', label: '食物', icon: '🍎' },
    { key: 'consumable', label: '消耗品', icon: '⚡' },
    { key: 'equipment', label: '装备', icon: '🛡️' },
    { key: 'decoration', label: '装饰', icon: '👑' },
  ]

  const filteredItems = items.filter(i => i.type === tab)

  return (
    <div className="inventory">
      <div className="inventory-tabs">
        {tabs.map(t => (
          <button
            key={t.key}
            className={`inv-tab ${tab === t.key ? 'active' : ''}`}
            onClick={() => setTab(t.key)}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {activeEffects.length > 0 && (
        <div className="active-effects">
          <span className="effects-label">生效中：</span>
          {activeEffects.map((e, i) => (
            <span key={i} className="effect-chip">{e}</span>
          ))}
        </div>
      )}

      {filteredItems.length === 0 ? (
        <div className="inv-empty">暂无此类道具</div>
      ) : (
        <div className="inv-list">
          {filteredItems.map(item => (
            <div key={item.id} className={`card inv-item ${item.equipped ? 'equipped' : ''}`}>
              <span className="inv-icon">{item.icon}</span>
              <div className="inv-info">
                <span className="inv-name">{item.name}</span>
                <span className="inv-desc">{item.description}</span>
                {item.quantity > 1 && <span className="inv-qty">x{item.quantity}</span>}
              </div>
              <div className="inv-actions">
                {(item.type === 'food' || item.type === 'consumable') && (
                  <button className="btn btn-primary btn-sm" onClick={() => onUse(item.id)}>
                    使用
                  </button>
                )}
                {(item.type === 'equipment' || item.type === 'decoration') && (
                  <button
                    className={`btn btn-sm ${item.equipped ? 'btn-secondary' : 'btn-primary'}`}
                    onClick={() => onEquip(item.id, !item.equipped)}
                  >
                    {item.equipped ? '卸下' : '装备'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <style>{`
        .inventory {}
        .inventory-tabs { display: flex; gap: 6px; margin-bottom: 16px; flex-wrap: wrap; }
        .inv-tab {
          padding: 6px 14px; border-radius: var(--radius-full);
          font-size: 13px; font-weight: 500;
          border: 1px solid var(--border); background: var(--bg-card);
          color: var(--text-secondary); cursor: pointer; transition: all 0.15s;
        }
        .inv-tab.active {
          background: var(--primary); color: var(--text-on-primary);
          border-color: var(--primary);
        }
        .active-effects {
          display: flex; align-items: center; gap: 6px;
          padding: 8px 12px; margin-bottom: 12px;
          background: var(--success-light); border-radius: var(--radius);
          font-size: 12px; flex-wrap: wrap;
        }
        .effects-label { color: var(--text-secondary); font-weight: 500; }
        .effect-chip {
          padding: 2px 8px; background: var(--success);
          color: white; border-radius: var(--radius-full); font-size: 11px;
        }
        .inv-empty {
          text-align: center; padding: 32px;
          color: var(--text-muted); font-size: 14px;
        }
        .inv-list { display: flex; flex-direction: column; gap: 8px; }
        .inv-item {
          display: flex; align-items: center; gap: 12px;
          padding: 12px 16px;
        }
        .inv-item.equipped {
          border-color: var(--primary);
          box-shadow: 0 0 0 1px var(--primary);
        }
        .inv-icon { font-size: 28px; flex-shrink: 0; }
        .inv-info {
          flex: 1; display: flex; flex-direction: column; gap: 2px;
        }
        .inv-name { font-size: 14px; font-weight: 600; color: var(--text-primary); }
        .inv-desc { font-size: 12px; color: var(--text-secondary); }
        .inv-qty {
          font-size: 11px; color: var(--primary);
          font-weight: 600; margin-top: 2px;
        }
        .inv-actions { flex-shrink: 0; }
        .btn-sm { padding: 4px 12px; font-size: 12px; }
      `}</style>
    </div>
  )
}
