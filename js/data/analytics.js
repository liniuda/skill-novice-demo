/**
 * 效果分析 — 数据层
 *
 * 职责：
 *  - 提供 mock 数据（默认）
 *  - 预留真实数据透传适配层（aone-data MCP / ODPS）
 *
 * 切换数据源：在浏览器控制台执行 window.__USE_REAL_DATA__ = true
 *   然后刷新页面即可走真实数据通道（当前为占位）
 */

/* ─────────────────────────────────────────────
   时间窗口枚举
───────────────────────────────────────────── */
export const TIME_RANGES = [
  { id: '7d',  label: '最近 7 天'  },
  { id: '30d', label: '最近 30 天' },
  { id: '90d', label: '最近 90 天' },
];

/* ─────────────────────────────────────────────
   Mock 数据
───────────────────────────────────────────── */
const MOCK = {
  '7d': {
    kpi: {
      resolveRate: 86.2,    resolveDelta: +3.1,
      callRate:    13.8,    callDelta:    -0.9,
      satisfaction: 4.5,    satisfactionDelta: +0.2,
      callVolume:  4382,    callVolumeDelta:   +6.2,
    },
    trend: genTrend(7,  82, 90),
    funnel: { intent: 4382, matched: 4123, executed: 3781, satisfied: 3258 },
  },
  '30d': {
    kpi: {
      resolveRate: 87.4,    resolveDelta: +5.2,
      callRate:    12.8,    callDelta:    -1.6,
      satisfaction: 4.6,    satisfactionDelta: +0.3,
      callVolume:  18732,   callVolumeDelta:   +12.4,
    },
    trend: genTrend(30, 81, 91),
    funnel: { intent: 18732, matched: 17654, executed: 16210, satisfied: 14180 },
  },
  '90d': {
    kpi: {
      resolveRate: 84.9,    resolveDelta: +7.8,
      callRate:    14.1,    callDelta:    -2.3,
      satisfaction: 4.4,    satisfactionDelta: +0.5,
      callVolume:  56120,   callVolumeDelta:   +21.8,
    },
    trend: genTrend(90, 78, 90),
    funnel: { intent: 56120, matched: 52400, executed: 47120, satisfied: 40918 },
  },
};

const SKILL_ATTRIB = [
  { id: 'sk-logistics',  name: '物流运输',   icon: '🚚', calls: 4231, resolveRate: 91.2, delta: +6.4, callRate: 8.4,  satisfaction: 4.7, contribution: 24.3 },
  { id: 'sk-trust',      name: '信保订单',   icon: '🔐', calls: 3892, resolveRate: 89.7, delta: +3.1, callRate: 9.8,  satisfaction: 4.6, contribution: 22.1 },
  { id: 'sk-refund',     name: '退款售后',   icon: '🔄', calls: 2188, resolveRate: 78.9, delta: -2.4, callRate: 18.2, satisfaction: 4.2, contribution: 13.4 },
  { id: 'sk-product',    name: '商品管理',   icon: '📦', calls: 1876, resolveRate: 72.4, delta: -1.8, callRate: 21.6, satisfaction: 4.0, contribution: 9.7  },
  { id: 'sk-knowledge',  name: '知识检索',   icon: '🔍', calls: 1654, resolveRate: 88.3, delta: +4.5, callRate: 10.1, satisfaction: 4.5, contribution: 11.6 },
  { id: 'sk-shop',       name: '店铺运营',   icon: '🏪', calls: 1432, resolveRate: 81.5, delta: +1.2, callRate: 14.7, satisfaction: 4.3, contribution: 8.2  },
  { id: 'sk-ip',         name: 'IP 合规',    icon: '⚖️', calls: 987,  resolveRate: 76.4, delta: -3.2, callRate: 19.3, satisfaction: 4.1, contribution: 5.6  },
  { id: 'sk-fund',       name: '资金风控',   icon: '💰', calls: 472,  resolveRate: 85.2, delta: +2.7, callRate: 11.4, satisfaction: 4.4, contribution: 5.1  },
];

const SCENE_ATTRIB = [
  { id: 'sc-cross-refund',  tag: '物流',   name: '跨境退款-海关扣件',     volume: 4231, coverage: 100,  resolveRate: 91.2, delta: +6.4, marginalGain: 8.2,  ownerSkill: '物流运输' },
  { id: 'sc-logistics-late',tag: '物流',   name: '物流时效异常补偿',       volume: 3892, coverage: 92,   resolveRate: 85.7, delta: +3.1, marginalGain: 5.3,  ownerSkill: '物流运输' },
  { id: 'sc-presale-sku',   tag: '订单',   name: '预售多 SKU 改尺码',     volume: 2188, coverage: 78,   resolveRate: 72.9, delta: -2.4, marginalGain: -1.2, ownerSkill: '商品管理' },
  { id: 'sc-trust-dispute', tag: '资金',   name: '信保纠纷-货不对版',     volume: 1654, coverage: 95,   resolveRate: 88.3, delta: +4.5, marginalGain: 4.7,  ownerSkill: '信保订单' },
  { id: 'sc-ip-claim',      tag: 'IP合规', name: 'IP 申诉-非授权品牌',     volume: 1576, coverage: 88,   resolveRate: 79.4, delta: +1.2, marginalGain: 2.1,  ownerSkill: 'IP 合规' },
  { id: 'sc-uncov-1',       tag: '物流',   name: '海外仓直发延误',         volume: 1342, coverage: 0,    resolveRate: 0,    delta: 0,    marginalGain: 0,    ownerSkill: '— 未覆盖' },
  { id: 'sc-shop-comp',     tag: '店铺',   name: '店铺评分申诉',           volume: 1124, coverage: 65,   resolveRate: 74.8, delta: +0.8, marginalGain: 0.9,  ownerSkill: '店铺运营' },
  { id: 'sc-fund-frozen',   tag: '资金',   name: '资金冻结申诉',           volume: 985,  coverage: 0,    resolveRate: 0,    delta: 0,    marginalGain: 0,    ownerSkill: '— 未覆盖' },
  { id: 'sc-uncov-2',       tag: '订单',   name: '组合套装拆单退款',       volume: 768,  coverage: 0,    resolveRate: 0,    delta: 0,    marginalGain: 0,    ownerSkill: '— 未覆盖' },
];

/* 趋势数据生成器 */
function genTrend(days, low, high) {
  const arr = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const noise = Math.sin(i * 0.6) * 2 + (Math.random() - 0.5) * 2;
    const base = low + (high - low) * (1 - i / days);
    arr.push({
      date: d.toISOString().slice(5, 10),  // MM-DD
      resolveRate: +(base + noise).toFixed(1),
      callRate:    +(20 - (base - low) * 0.5 + noise * 0.3).toFixed(1),
    });
  }
  return arr;
}

/* ─────────────────────────────────────────────
   公开 API
───────────────────────────────────────────── */
export function getOverview(timeRange = '30d') {
  if (window.__USE_REAL_DATA__) {
    // TODO: aone-data MCP execute_odps_sql
    console.log('[analytics] real data placeholder for getOverview', timeRange);
  }
  return MOCK[timeRange] || MOCK['30d'];
}

export function getSkillAttribution(timeRange = '30d') {
  if (window.__USE_REAL_DATA__) {
    console.log('[analytics] real data placeholder for getSkillAttribution', timeRange);
  }
  // 不同时间窗用同一基础数据 + 微调（mock 简化）
  const factor = timeRange === '7d' ? 0.25 : timeRange === '90d' ? 3 : 1;
  return SKILL_ATTRIB.map(s => ({
    ...s,
    calls: Math.round(s.calls * factor),
  }));
}

export function getSceneAttribution(timeRange = '30d') {
  if (window.__USE_REAL_DATA__) {
    console.log('[analytics] real data placeholder for getSceneAttribution', timeRange);
  }
  const factor = timeRange === '7d' ? 0.25 : timeRange === '90d' ? 3 : 1;
  return SCENE_ATTRIB.map(s => ({
    ...s,
    volume: Math.round(s.volume * factor),
  }));
}
