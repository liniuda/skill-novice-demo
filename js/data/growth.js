/**
 * 运营成长地图 — 数据层
 *
 * localStorage key: novice_growth
 * 等级体系：
 *   Lv.1 萌新   0 ~ 99
 *   Lv.2 入门  100 ~ 299
 *   Lv.3 熟练  300 ~ 699
 *   Lv.4 专家  700 ~ 1499
 *   Lv.5 大师 1500+
 */
const KEY = 'novice_growth';

const LEVELS = [
  { lv: 1, label: 'Lv.1 萌新',   min: 0,    next: 100  },
  { lv: 2, label: 'Lv.2 入门',   min: 100,  next: 300  },
  { lv: 3, label: 'Lv.3 熟练',   min: 300,  next: 700  },
  { lv: 4, label: 'Lv.4 专家',   min: 700,  next: 1500 },
  { lv: 5, label: 'Lv.5 大师',   min: 1500, next: 9999 },
];

export const QUESTS = [
  { id: 'q-first-skill',  label: '配第一个 Skill',         points: 50,  hint: '从首页「配第一个 AI 技能」开始' },
  { id: 'q-publish',      label: '把 Skill 发布上线',      points: 50,  hint: '在「发布管理」中点上线' },
  { id: 'q-analytics',    label: '查看一次效果分析',       points: 30,  hint: '看看你的 Skill 表现如何' },
  { id: 'q-resolve-80',   label: '让 Skill 解决率破 80%',  points: 100, hint: '持续优化拟人化和规则' },
  { id: 'q-cover-scene',  label: '补齐 1 个未覆盖场景',    points: 80,  hint: '在效果分析-场景归因中找' },
  { id: 'q-market-clone', label: '从市场抄一份作业',       points: 30,  hint: 'Market 广场 → 一键复用' },
  { id: 'q-persona',      label: '调一次拟人化设置',       points: 40,  hint: '让 AI 说话更像你的店' },
];

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return { points: 30, completed: ['q-first-skill'] };  // 默认给点初始进度，避免冷启动
}

function write(data) {
  localStorage.setItem(KEY, JSON.stringify(data));
}

export function getGrowth() {
  const data = read();
  const lv = LEVELS.slice().reverse().find(L => data.points >= L.min) || LEVELS[0];
  const undone = QUESTS.find(q => !data.completed.includes(q.id));
  return {
    points: data.points,
    nextPoints: lv.next,
    levelLabel: lv.label,
    completed: data.completed,
    tip: undone ? `下一关：${undone.label}（+${undone.points} 经验）` : '🎉 全部任务完成！',
  };
}

export function getQuests() {
  const data = read();
  return QUESTS.map(q => ({ ...q, done: data.completed.includes(q.id) }));
}

export function completeQuest(id) {
  const data = read();
  if (data.completed.includes(id)) return false;
  const q = QUESTS.find(x => x.id === id);
  if (!q) return false;
  data.completed.push(id);
  data.points += q.points;
  write(data);
  window.dispatchEvent(new CustomEvent('growth:updated', { detail: { questId: id, points: q.points } }));
  return true;
}

export function resetGrowth() {
  localStorage.removeItem(KEY);
}
