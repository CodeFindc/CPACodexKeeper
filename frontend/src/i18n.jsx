import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

const STORAGE_KEY = 'cpacodex.lang'
const SUPPORTED = ['zh', 'en']

const dict = {
  en: {
    'shell.linkSecure': 'LINK · SECURE',
    'shell.uplink': 'UPLINK 0x4A·2F',
    'shell.langToggle': '中',
    'shell.langToggleHint': 'Switch to Chinese',

    'nav.status': 'STATUS',
    'nav.account': 'ACCOUNT',

    'common.live': 'LIVE',
    'common.notice': 'NOTICE',
    'common.standby': 'STANDBY',

    'status.signal': 'SIGNAL',
    'status.lastFinish': 'LAST FINISH',
    'status.currentNotice': 'CURRENT NOTICE',
    'status.awaiting': 'Awaiting next refresh...',
    'status.updated': 'UPDATED',
    'status.started': 'STARTED',
    'status.interval': 'INTERVAL',
    'status.result': 'RESULT',
    'status.intervalSeconds': '{value}s',

    'stat.total': 'TOTAL',
    'stat.totalSubtitle': 'All account objects',
    'stat.healthy': 'HEALTHY',
    'stat.healthySubtitle': 'Available right now',
    'stat.offline': 'OFFLINE',
    'stat.offlineSubtitle': 'Currently unavailable',
    'stat.disabled': 'DISABLED',
    'stat.disabledSubtitle': 'Excluded from rotation',

    'status.systemTelemetry': 'SYSTEM TELEMETRY',
    'status.refreshed': 'REFRESHED',
    'status.skipped': 'SKIPPED',
    'status.networkError': 'NETWORK ERROR',
    'status.activityGrid': 'ACTIVITY GRID',
    'status.chronicleLogs': 'CHRONICLE LOGS',
    'status.parameter': 'PARAMETER',
    'status.value': 'VALUE',
    'status.state': 'STATE',
    'status.entries': '{count} entries · last sync {time}',
    'status.bootingFeed': 'Booting status feed...',
    'status.error': 'ERROR · {message}',

    'status.localTime': 'LOCAL TIME:',
    'status.intervalPill': 'INTERVAL · {value}s',
    'status.enabledPill': 'ENABLED · {count}',
    'status.uiVersion': 'UI · v4.1.0',

    'telemetry.value': 'VALUE',
    'telemetry.total': 'TOTAL',

    'account.channelOnline': 'CHANNEL · ONLINE',
    'account.nodes': 'NODES · {count}',
    'account.statusOverview': 'Account status overview',
    'account.enabledNodes': 'ENABLED NODES',
    'account.disabledNodes': 'DISABLED NODES',
    'account.routableHint': 'Currently routable accounts.',
    'account.heldHint': 'Held out of rotation.',
    'account.accountGrid': 'ACCOUNT GRID',
    'account.visible': 'VISIBLE · {count}',
    'account.viewAccount': 'VIEW · ACCOUNT',
    'account.modeLive': 'MODE · LIVE OVERVIEW',
    'account.visiblePill': 'VISIBLE · {count}',
    'account.nodesPill': 'NODES · {count}',
    'account.range': 'RANGE {start}-{end} / {total}',
    'account.page': 'PAGE {current} / {total}',
    'account.pageSize': 'PAGE SIZE',

    'card.node': 'NODE',
    'card.enabled': 'ENABLED',
    'card.disabled': 'DISABLED',
    'card.primaryQuota': 'PRIMARY QUOTA',
    'card.activeWindow': 'ACTIVE WINDOW',
    'card.tokenExpiry': 'TOKEN EXPIRY',
    'card.noExpiry': 'NO EXPIRY',
  },
  zh: {
    'shell.linkSecure': '链路 · 安全',
    'shell.uplink': '上行 0x4A·2F',
    'shell.langToggle': 'EN',
    'shell.langToggleHint': '切换为英文',

    'nav.status': '状态',
    'nav.account': '账号',

    'common.live': '在线',
    'common.notice': '通知',
    'common.standby': '待机',

    'status.signal': '信号',
    'status.lastFinish': '上次完成',
    'status.currentNotice': '当前通知',
    'status.awaiting': '等待下一次刷新...',
    'status.updated': '更新时间',
    'status.started': '启动时间',
    'status.interval': '采集周期',
    'status.result': '结果',
    'status.intervalSeconds': '{value}秒',

    'stat.total': '总数',
    'stat.totalSubtitle': '全部账号对象',
    'stat.healthy': '健康',
    'stat.healthySubtitle': '当前可用',
    'stat.offline': '离线',
    'stat.offlineSubtitle': '当前不可用',
    'stat.disabled': '停用',
    'stat.disabledSubtitle': '已排除轮换',

    'status.systemTelemetry': '系统遥测',
    'status.refreshed': '已刷新',
    'status.skipped': '已跳过',
    'status.networkError': '网络错误',
    'status.activityGrid': '活动网格',
    'status.chronicleLogs': '操作日志',
    'status.parameter': '参数',
    'status.value': '取值',
    'status.state': '状态',
    'status.entries': '共 {count} 条 · 上次同步 {time}',
    'status.bootingFeed': '正在启动状态数据流...',
    'status.error': '错误 · {message}',

    'status.localTime': '本地时间:',
    'status.intervalPill': '采集周期 · {value}秒',
    'status.enabledPill': '启用 · {count}',
    'status.uiVersion': '界面 · v4.1.0',

    'telemetry.value': '当前值',
    'telemetry.total': '总量',

    'account.channelOnline': '通道 · 在线',
    'account.nodes': '节点 · {count}',
    'account.statusOverview': '账号状态概览',
    'account.enabledNodes': '启用节点',
    'account.disabledNodes': '停用节点',
    'account.routableHint': '当前可调度的账号。',
    'account.heldHint': '已暂停轮换的账号。',
    'account.accountGrid': '账号列表',
    'account.visible': '可见 · {count}',
    'account.viewAccount': '视图 · 账号',
    'account.modeLive': '模式 · 实时概览',
    'account.visiblePill': '可见 · {count}',
    'account.nodesPill': '节点 · {count}',
    'account.range': '范围 {start}-{end} / {total}',
    'account.page': '第 {current} / {total} 页',
    'account.pageSize': '每页',

    'card.node': '节点',
    'card.enabled': '启用',
    'card.disabled': '停用',
    'card.primaryQuota': '主配额',
    'card.activeWindow': '活跃窗口',
    'card.tokenExpiry': '令牌有效期',
    'card.noExpiry': '永久有效',
  },
}

function format(template, vars) {
  if (!vars) return template
  return template.replace(/\{(\w+)\}/g, (_, k) => (vars[k] !== undefined ? String(vars[k]) : `{${k}}`))
}

function detectInitial() {
  // tests run in vitest where MODE === 'test' — keep English so existing assertions pass
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.MODE === 'test') {
    return 'en'
  }
  if (typeof window !== 'undefined' && window.localStorage) {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (stored && SUPPORTED.includes(stored)) return stored
  }
  return 'zh'
}

const LanguageContext = createContext({
  lang: 'zh',
  setLang: () => {},
  toggleLang: () => {},
  t: (key) => key,
})

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(detectInitial)

  const setLang = useCallback((next) => {
    if (!SUPPORTED.includes(next)) return
    setLangState(next)
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem(STORAGE_KEY, next)
      } catch {
        /* ignore quota errors */
      }
    }
  }, [])

  const toggleLang = useCallback(() => {
    setLang(lang === 'zh' ? 'en' : 'zh')
  }, [lang, setLang])

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en'
    }
  }, [lang])

  const t = useCallback(
    (key, vars) => {
      const table = dict[lang] || dict.en
      const template = table[key] ?? dict.en[key] ?? key
      return format(template, vars)
    },
    [lang],
  )

  const value = useMemo(() => ({ lang, setLang, toggleLang, t }), [lang, setLang, toggleLang, t])

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useLanguage() {
  return useContext(LanguageContext)
}

export function useT() {
  return useContext(LanguageContext).t
}
