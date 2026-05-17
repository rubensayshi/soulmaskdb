import { useEffect } from 'react'
import { Roster } from './pages/Roster'
import { CapturePanel } from './components/CapturePanel'
import { useRosterStore } from './lib/store'
import type { Tribesman } from './lib/types'
import './styles.css'

const MOCK_TRIBESMEN: Tribesman[] = [
  {
    name: 'Kira Steelclaw', level: 45, class: 'Warrior', clan: 'Iron Fang', title: 'Vanguard',
    location: null, captured_at: '2026-05-17T10:00:00Z',
    traits: [
      { icon_name: 'tianfu_gongjilitisheng', confidence: 0.95 },
      { icon_name: 'tianfu_fangyutisheng', confidence: 0.91 },
      { icon_name: 'tianfu_shenqianglizhuang', confidence: 0.72 },
      { icon_name: 'Icon_NG_BuLuo_xingcunzhe', confidence: 0.88 },
    ],
  },
  {
    name: 'Zhen Windwalker', level: 50, class: 'Archer', clan: 'Iron Fang', title: 'Sharpshooter',
    location: null, captured_at: '2026-05-17T10:00:00Z',
    traits: [
      { icon_name: 'tianfu_yidongsudutisheng', confidence: 0.98 },
      { icon_name: 'tianfu_jimin', confidence: 0.93 },
      { icon_name: 'tianfu_bulvqingying', confidence: 0.89 },
    ],
  },
  {
    name: 'Bao Ironfist', level: 38, class: 'Fighter', clan: 'Stone Bear', title: null,
    location: null, captured_at: '2026-05-17T10:01:00Z',
    traits: [
      { icon_name: 'tianfu_gongjisudutisheng', confidence: 0.97 },
      { icon_name: 'tianfu_weijifanying', confidence: 0.85 },
      { icon_name: 'tianfu_fanjishike', confidence: 0.67 },
      { icon_name: 'chushen_kuli', confidence: 0.82 },
    ],
  },
  {
    name: 'Mei Shadowstep', level: 42, class: 'Scout', clan: 'Stone Bear', title: 'Pathfinder',
    location: null, captured_at: '2026-05-17T10:01:00Z',
    traits: [
      { icon_name: 'tianfu_qiaowushengxi', confidence: 0.94 },
      { icon_name: 'tianfu_shanyuweizhuang', confidence: 0.90 },
      { icon_name: 'tianfu_tuijiaolinghuo', confidence: 0.76 },
      { icon_name: 'Icon_NG_XiHao_WuQi', confidence: 0.88 },
    ],
  },
  {
    name: 'Taro Bonecrusher', level: 50, class: 'Warrior', clan: 'Iron Fang', title: 'Champion',
    location: null, captured_at: '2026-05-17T10:02:00Z',
    traits: [
      { icon_name: 'tianfu_gongjilitisheng', confidence: 0.99 },
      { icon_name: 'tianfu_shanghaijianmiantisheng', confidence: 0.92 },
      { icon_name: 'tianfu_chuisizhengzha', confidence: 0.86 },
      { icon_name: 'tianfu_shengmingzhitisheng', confidence: 0.94 },
      { icon_name: 'Icon_NG_BuLuo_LiZhua', confidence: 0.78 },
    ],
  },
  {
    name: 'Lin Swiftblade', level: 33, class: 'Assassin', clan: 'Night Owl', title: null,
    location: null, captured_at: '2026-05-17T10:02:00Z',
    traits: [
      { icon_name: 'tianfu_gongjisudutisheng', confidence: 0.91 },
      { icon_name: 'tianfu_taotuosuming', confidence: 0.63 },
    ],
  },
  {
    name: 'Hou Mountainheart', level: 48, class: 'Guardian', clan: 'Stone Bear', title: 'Bulwark',
    location: null, captured_at: '2026-05-17T10:03:00Z',
    traits: [
      { icon_name: 'tianfu_fangyutisheng', confidence: 0.96 },
      { icon_name: 'tianfu_shanghaijianmiantisheng', confidence: 0.93 },
      { icon_name: 'tianfu_shenqianglizhuang', confidence: 0.97 },
      { icon_name: 'tianfu_kangjie', confidence: 0.88 },
      { icon_name: 'tianfu_kangkouke', confidence: 0.90 },
    ],
  },
  {
    name: 'Yuki Stormcaller', level: 41, class: 'Mage', clan: 'Night Owl', title: 'Invoker',
    location: null, captured_at: '2026-05-17T10:03:00Z',
    traits: [
      { icon_name: 'tianfu_jimin', confidence: 0.92 },
      { icon_name: 'tianfu_weijifanying', confidence: 0.55 },
      { icon_name: 'chushen_zagong', confidence: 0.84 },
    ],
  },
]

function App() {
  const { loadRoster, tribesmen } = useRosterStore()

  useEffect(() => {
    import('@tauri-apps/api/core')
      .then(({ invoke }) =>
        invoke<{ last_updated: string; tribesmen: never[] } | null>('load_roster')
      )
      .then(roster => { if (roster) loadRoster(roster) })
      .catch(() => {
        if (tribesmen.length === 0) {
          loadRoster({ last_updated: new Date().toISOString(), tribesmen: MOCK_TRIBESMEN })
        }
      })
  }, [loadRoster, tribesmen.length])

  return (
    <div className="min-h-screen bg-bg text-text">
      <header className="border-b border-green/20 px-6 py-3 flex items-center justify-between">
        <h1 className="text-xl font-bold text-green">Soulmask Codex</h1>
        <span className="text-text-dim text-sm">Tribesman roster scanner</span>
      </header>
      <div className="p-6">
        <CapturePanel />
        <Roster />
      </div>
    </div>
  )
}

export default App
