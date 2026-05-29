/**
 * MCP Server 数据层
 * 管理 MCP Server 列表、Tools、Skill 绑定关系
 */

const STORAGE_KEY = 'scd_mcp_servers';

/* ── 预置 MCP Server ── */
const PRESET_SERVERS = [
  {
    id: 'aone-data',
    name: 'Aone 数据平台',
    icon: '📊',
    endpoint: 'https://mcp.alibaba-inc.com/aone-data/mcp',
    command: 'npx',
    args: ['mcp-remote', 'https://mcp.alibaba-inc.com/aone-data/mcp'],
    description: 'Aone 平台离线数据查询服务，支持 ODPS SQL 语法查询开放数据表',
    status: 'online',
    tags: ['数据查询', '内部服务'],
    tools: [
      { name: 'execute_odps_sql',       description: '使用 ODPS SQL 语法执行查询，返回前 100 条记录',      category: '数据查询' },
      { name: 'get_aone_data',          description: '带权限校验的 ODPS SQL 查询，自动检查用户表权限',      category: '数据查询' },
      { name: 'get_aone_domain_list',   description: '获取 Aone 所有域列表，按域筛选离线表',               category: '数据查询' },
      { name: 'get_aone_tables_by_domain', description: '通过 domain 获取对应域的离线表列表',              category: '数据查询' },
      { name: 'get_table_meta',         description: '获取指定离线表的元数据（字段定义、分区信息）',         category: '数据查询' },
    ],
    skillBindings: [
      { skillId: 'logistics',    toolNames: ['get_aone_data', 'execute_odps_sql'], purpose: '物流运输数据分析增强' },
      { skillId: 'ta-order',     toolNames: ['get_aone_data'],                     purpose: '信保订单数据查询' },
      { skillId: 'payment-fund', toolNames: ['execute_odps_sql'],                  purpose: '支付资金流水分析' },
    ],
  },
  {
    id: 'yuque',
    name: '语雀知识库',
    icon: '📝',
    endpoint: 'https://mcp.alibaba-inc.com/yuque/mcp',
    command: 'npx',
    args: ['mcp-remote', 'https://mcp.alibaba-inc.com/yuque/mcp'],
    description: '语雀文档与知识库接入，支持文档检索、目录获取和用户信息查询',
    status: 'online',
    tags: ['内容管理', '知识库'],
    tools: [
      { name: 'yuque_get_doc_detail', description: '根据语雀链接获取文档详情内容',                category: '内容管理' },
      { name: 'yuque_get_repo_toc',   description: '获取知识库目录结构（需 group_login/book_slug）', category: '内容管理' },
      { name: 'yuque_whoami',         description: '展示当前语雀用户信息',                         category: '平台工具' },
    ],
    skillBindings: [
      { skillId: 'knowledge-search', toolNames: ['yuque_get_doc_detail', 'yuque_get_repo_toc'], purpose: '知识检索能力增强' },
    ],
  },
  {
    id: 'cco-merchant',
    name: 'CCO 商家服务',
    icon: '🏪',
    endpoint: 'https://xp-mcp.pre-mw-mcp.alibaba-inc.com/mcp',
    command: 'npx',
    args: ['mcp-remote', 'https://xp-mcp.pre-mw-mcp.alibaba-inc.com/mcp'],
    description: 'CCO 商家侧 MCP 服务，提供商家客服场景的业务操作与数据查询',
    status: 'offline',
    tags: ['业务操作', '商家服务'],
    tools: [
      { name: 'merchant_query',  description: '商家信息与店铺数据查询',   category: '业务操作' },
      { name: 'order_operation', description: '订单状态查询与操作',       category: '业务操作' },
      { name: 'dispute_handler', description: '纠纷工单处理与流转',       category: '业务操作' },
    ],
    skillBindings: [
      { skillId: 'xinbao-dispute', toolNames: ['dispute_handler', 'order_operation'], purpose: '信保纠纷处理自动化' },
      { skillId: 'refund-return',  toolNames: ['order_operation'],                    purpose: '退款退货流程辅助' },
      { skillId: 'store-operation', toolNames: ['merchant_query'],                    purpose: '店铺运营数据查询' },
    ],
  },
];

/* ── 持久化（内存中维护数组引用，无需 localStorage，按需可扩展） ── */
let _servers = null;

function loadServers() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function saveServers(servers) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(servers)); } catch { /* ignore */ }
}

export function getServers() {
  if (_servers) return _servers;
  const stored = loadServers();
  _servers = stored && stored.length > 0 ? stored : PRESET_SERVERS.map(s => ({ ...s, skillBindings: [...s.skillBindings] }));
  if (!stored || stored.length === 0) saveServers(_servers);
  return _servers;
}

export function getServerById(id) {
  return getServers().find(s => s.id === id) || null;
}

export function addServer(config) {
  const servers = getServers();
  const id = config.id || config.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const server = {
    id,
    name: config.name || id,
    icon: config.icon || '🔌',
    endpoint: config.endpoint || '',
    command: config.command || 'npx',
    args: config.args || (config.endpoint ? ['mcp-remote', config.endpoint] : []),
    description: config.description || '',
    status: config.status || 'unknown',
    tags: config.tags || [],
    tools: config.tools || [],
    skillBindings: [],
  };
  servers.push(server);
  saveServers(servers);
  return server;
}

export function updateServer(id, updates) {
  const servers = getServers();
  const idx = servers.findIndex(s => s.id === id);
  if (idx === -1) return null;
  servers[idx] = { ...servers[idx], ...updates, id };
  saveServers(servers);
  return servers[idx];
}

export function removeServer(id) {
  const servers = getServers();
  const idx = servers.findIndex(s => s.id === id);
  if (idx === -1) return false;
  servers.splice(idx, 1);
  saveServers(servers);
  return true;
}

/* ── 绑定 CRUD ── */
export function bindSkillToServer(serverId, skillId, toolNames, purpose) {
  const server = getServerById(serverId);
  if (!server) return { success: false, error: 'Server 不存在' };

  const existing = server.skillBindings.find(b => b.skillId === skillId);
  if (existing) {
    existing.toolNames = [...new Set([...existing.toolNames, ...toolNames])];
    if (purpose) existing.purpose = purpose;
  } else {
    server.skillBindings.push({ skillId, toolNames, purpose: purpose || '' });
  }
  saveServers(getServers());
  return { success: true };
}

export function unbindSkillFromServer(serverId, skillId) {
  const server = getServerById(serverId);
  if (!server) return false;
  const idx = server.skillBindings.findIndex(b => b.skillId === skillId);
  if (idx === -1) return false;
  server.skillBindings.splice(idx, 1);
  saveServers(getServers());
  return true;
}

export function overwriteSkillBindings(serverId, skillId, toolNames, purpose) {
  const server = getServerById(serverId);
  if (!server) return;
  server.skillBindings = server.skillBindings.filter(b => b.skillId !== skillId);
  if (toolNames.length > 0) {
    server.skillBindings.push({ skillId, toolNames, purpose: purpose || '' });
  }
  saveServers(getServers());
}

export function getBindingsForSkill(skillId) {
  const result = [];
  getServers().forEach(s => {
    s.skillBindings.forEach(b => {
      if (b.skillId === skillId) {
        result.push({ serverId: s.id, serverName: s.name, serverIcon: s.icon, serverStatus: s.status, toolNames: b.toolNames, purpose: b.purpose });
      }
    });
  });
  return result;
}

export function generateMcpJson() {
  const mcpServers = {};
  getServers().forEach(s => {
    mcpServers[s.id] = { command: s.command, args: [...s.args] };
  });
  return { mcpServers };
}

export const STATUS_LABELS = { online: '在线', offline: '离线', unknown: '未知' };
export const STATUS_COLORS = { online: '#059669', offline: '#DC2626', unknown: '#9CA3AF' };
