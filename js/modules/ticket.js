/**
 * 工单绑定管理模块
 * 记录工单场景与 Skill 的绑定关系、预测验证状态
 */
import { showModal, closeModal } from '../modal.js';

/* ── 工单聚类数据 ── */
const TICKET_CLUSTERS = [
  {
    id: 'chargeback-dispute',
    name: '信用保障-拒付争议',
    desc: '信保订单拒付结果不认可、拒付费用分担异议、拒付申诉',
    pending: 832,
    dailyNew: 156,
    aiProcessed: 312,
    boundSkill: { name: '信保拒付争议处理 v1.2', version: 'v1.2', updatedAt: '2026-06-07', status: 'running' },
  },
  {
    id: 'shipping-compliance',
    name: '信用保障-发货履约',
    desc: '贸易术语审核不通过、物流关联错误、发货超时、异常履约率豁免',
    pending: 1247,
    dailyNew: 283,
    aiProcessed: 578,
    boundSkill: { name: '发货履约异常处理 v2.0', version: 'v2.0', updatedAt: '2026-06-05', status: 'running' },
  },
  {
    id: 'fund-verification',
    name: '资金管理-收汇核查',
    desc: '银行外汇核查延迟入账、TT支付异常、收汇状态查询',
    pending: 456,
    dailyNew: 89,
    aiProcessed: 0,
    boundSkill: null,
  },
  {
    id: 'account-access',
    name: '账户安全与准入',
    desc: '账号黑名单核实、ACP准入失败、账号权限异常',
    pending: 623,
    dailyNew: 134,
    aiProcessed: 0,
    boundSkill: null,
  },
  {
    id: 'ip-regulation',
    name: '知识产权与网规',
    desc: '侵权扣分申诉、知识产权规则解析、误判处罚撤销',
    pending: 389,
    dailyNew: 67,
    aiProcessed: 0,
    boundSkill: null,
  },
  {
    id: 'marketing-promotion',
    name: '网站营销与推广',
    desc: '全站推广暂停原因、广告投放异常、营销活动规则咨询',
    pending: 278,
    dailyNew: 52,
    aiProcessed: 145,
    boundSkill: { name: '营销推广咨询处理 v1.0', version: 'v1.0', updatedAt: '2026-06-02', status: 'running' },
  },
];

/* ── 绑定历史记录 ── */
const BINDING_HISTORY = [
  { time: '2026-06-07 18:30', cluster: '信用保障-拒付争议', skill: '信保拒付争议处理 v1.2', action: 'bind', operator: 'admin' },
  { time: '2026-06-05 14:22', cluster: '信用保障-发货履约', skill: '发货履约异常处理 v2.0', action: 'bind', operator: 'admin' },
  { time: '2026-06-02 10:15', cluster: '网站营销与推广', skill: '营销推广咨询处理 v1.0', action: 'bind', operator: 'ops-lee' },
  { time: '2026-05-28 09:40', cluster: '信用保障-拒付争议', skill: '信保拒付争议处理 v1.1', action: 'unbind', operator: 'admin' },
  { time: '2026-05-20 16:00', cluster: '资金管理-收汇核查', skill: '收汇核查辅助 v0.9', action: 'unbind', operator: 'admin' },
];

/* ── 渲染入口 ── */
export function renderTicket() {
  const container = document.getElementById('sec-ticket');
  if (!container) return;

  const totalPending = TICKET_CLUSTERS.reduce((s, c) => s + c.pending, 0);
  const totalAI = TICKET_CLUSTERS.reduce((s, c) => s + c.aiProcessed, 0);
  const boundCount = TICKET_CLUSTERS.filter(c => c.boundSkill).length;

  container.innerHTML = `
    <div class="x-page-header">
      <h1 class="x-page-title">工单场景与 Skill 绑定</h1>
      <p class="x-page-desc">管理工单聚类场景与自动化 Skill 的绑定关系，追踪处理效果</p>
    </div>

    <!-- 概览卡片 -->
    <div class="ticket-stats">
      <div class="ticket-stat-card">
        <div class="ticket-stat-label">工单聚类</div>
        <div class="ticket-stat-value">${TICKET_CLUSTERS.length}</div>
        <div class="ticket-stat-sub">类场景</div>
      </div>
      <div class="ticket-stat-card">
        <div class="ticket-stat-label">待处理总量</div>
        <div class="ticket-stat-value">${totalPending.toLocaleString()}</div>
        <div class="ticket-stat-sub">条工单</div>
      </div>
      <div class="ticket-stat-card">
        <div class="ticket-stat-label">已绑定 Skill</div>
        <div class="ticket-stat-value">${boundCount} / ${TICKET_CLUSTERS.length}</div>
        <div class="ticket-stat-sub">自动化覆盖</div>
      </div>
      <div class="ticket-stat-card">
        <div class="ticket-stat-label">AI 处理量</div>
        <div class="ticket-stat-value">${totalAI.toLocaleString()}</div>
        <div class="ticket-stat-sub">累计处理</div>
      </div>
    </div>

    <!-- 内部 Tab 切换 -->
    <div class="ticket-tab-bar">
      <button class="ticket-tab active" data-view="clusters">工单场景</button>
      <button class="ticket-tab" data-view="history">绑定记录</button>
    </div>

    <!-- 工单场景列表 -->
    <div class="ticket-view active" id="ticket-view-clusters">
      <div class="ticket-list-wrap">
        <table class="ticket-list-table">
          <thead>
            <tr>
              <th>工单类型</th>
              <th>归类标问</th>
              <th style="text-align:center">待处理</th>
              <th style="text-align:center">昨日新增</th>
              <th style="text-align:center">AI处理</th>
              <th style="text-align:center">覆盖率</th>
              <th>绑定 Skill</th>
              <th style="text-align:center">操作</th>
            </tr>
          </thead>
          <tbody>
            ${TICKET_CLUSTERS.map(c => renderClusterRow(c)).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <!-- 绑定历史 -->
    <div class="ticket-view" id="ticket-view-history">
      <div class="ticket-history-table-wrap">
        <table class="ticket-history-table">
          <thead>
            <tr>
              <th>时间</th>
              <th>工单场景</th>
              <th>Skill</th>
              <th>操作</th>
              <th>操作人</th>
            </tr>
          </thead>
          <tbody>
            ${BINDING_HISTORY.map(h => `
              <tr>
                <td class="ticket-h-time">${h.time}</td>
                <td>${h.cluster}</td>
                <td class="ticket-h-skill">${h.skill}</td>
                <td><span class="ticket-badge ${h.action === 'bind' ? 'badge-bind' : 'badge-unbind'}">${h.action === 'bind' ? '绑定' : '解绑'}</span></td>
                <td class="ticket-h-op">${h.operator}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;

  // Tab 切换事件
  container.querySelectorAll('.ticket-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.ticket-tab').forEach(t => t.classList.remove('active'));
      container.querySelectorAll('.ticket-view').forEach(v => v.classList.remove('active'));
      btn.classList.add('active');
      const view = container.querySelector(`#ticket-view-${btn.dataset.view}`);
      if (view) view.classList.add('active');
    });
  });

  // 绑定/解绑按钮事件
  container.querySelectorAll('.ticket-bind-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const clusterId = btn.dataset.cluster;
      const cluster = TICKET_CLUSTERS.find(c => c.id === clusterId);
      if (!cluster) return;
      if (cluster.boundSkill) {
        if (confirm(`确认解绑「${cluster.name}」的 Skill「${cluster.boundSkill.name}」？`)) {
          cluster.boundSkill = null;
          cluster.aiProcessed = 0;
          renderTicket();
        }
      } else {
        openBindSkillModal(cluster);
      }
    });
  });
}

/* ── 单行聚类行 ── */
function renderClusterRow(cluster) {
  const hasBind = !!cluster.boundSkill;
  const coverRate = cluster.pending > 0 ? Math.round((cluster.aiProcessed / (cluster.pending + cluster.aiProcessed)) * 100) : 0;

  return `
    <tr class="ticket-row ${hasBind ? 'row-bound' : 'row-unbound'}">
      <td class="ticket-row-name">${cluster.name}</td>
      <td class="ticket-row-desc">${cluster.desc}</td>
      <td class="ticket-row-num ${cluster.pending > 500 ? 'val-warn' : ''}" style="text-align:center">${cluster.pending.toLocaleString()}</td>
      <td class="ticket-row-num" style="text-align:center">${cluster.dailyNew}</td>
      <td class="ticket-row-num val-good" style="text-align:center">${cluster.aiProcessed}</td>
      <td style="text-align:center"><span class="ticket-cover-bar"><span class="ticket-cover-fill" style="width:${coverRate}%"></span></span><span class="ticket-cover-text">${coverRate}%</span></td>
      <td>${hasBind
        ? `<span class="ticket-skill-tag">⚡ ${cluster.boundSkill.name}</span>`
        : `<span class="ticket-no-skill">—</span>`
      }</td>
      <td style="text-align:center">${hasBind
        ? `<button class="ticket-bind-btn btn-unbind" data-cluster="${cluster.id}">解绑</button>`
        : `<button class="ticket-bind-btn btn-bindnew" data-cluster="${cluster.id}">+ 绑定</button>`
      }</td>
    </tr>
  `;
}

/* ══════════════════════════════════════════════════
   绑定 Skill 弹窗
   ══════════════════════════════════════════════════ */

function openBindSkillModal(cluster) {
  const publishedSkills = TICKET_SKILLS.filter(s => s.status === 'published' || s.status === 'compiled');

  showModal(`
    <div class="modal-header">
      <span class="modal-title">绑定 Skill 到「${cluster.name}」</span>
      <button class="btn-icon" id="modalClose">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <line x1="1" y1="1" x2="13" y2="13" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
          <line x1="13" y1="1" x2="1" y2="13" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
        </svg>
      </button>
    </div>
    <div class="modal-body">
      <p style="font-size:13px;color:var(--text-2,#a1a7b8);margin:0 0 16px">选择一个已发布的 Skill 绑定到该工单场景：</p>
      <div class="bind-skill-list">
        ${publishedSkills.map(s => `
          <div class="bind-skill-option" data-skill-id="${s.id}">
            <div class="bind-skill-info">
              <span class="bind-skill-name">⚡ ${s.name}</span>
              <span class="bind-skill-ver">${s.version} · ${s.scene}</span>
            </div>
            <button class="ticket-bind-btn btn-bindnew bind-confirm-btn" data-skill-id="${s.id}">选择</button>
          </div>
        `).join('')}
        ${publishedSkills.length === 0 ? '<div class="drawer-empty">暂无可绑定的已发布 Skill</div>' : ''}
        <div class="bind-skill-option bind-skill-add-new" id="bindModalAddSkill">
          <div class="bind-skill-info">
            <span class="bind-skill-name" style="color:var(--accent,#6c8cff)">＋ 添加新 Skill</span>
            <span class="bind-skill-ver">前往 Skill 管理上传新的 Skill</span>
          </div>
        </div>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" id="modalCancel">取消</button>
    </div>
  `);

  document.getElementById('modalClose')?.addEventListener('click', closeModal);
  document.getElementById('modalCancel')?.addEventListener('click', closeModal);

  // 添加新 Skill 兜底入口
  document.getElementById('bindModalAddSkill')?.addEventListener('click', () => {
    closeModal();
    // 切换到 Skill 管理页
    if (window.sscSwitchTab) window.sscSwitchTab('ticket-skill');
    // 延迟弹出上传弹窗，等待页面渲染
    setTimeout(() => openUploadSkillModal(), 200);
  });

  document.querySelectorAll('.bind-confirm-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const skillId = btn.dataset.skillId;
      const skill = TICKET_SKILLS.find(s => s.id === skillId);
      if (!skill) return;

      cluster.boundSkill = { name: `${skill.name} ${skill.version}`, version: skill.version, updatedAt: new Date().toISOString().slice(0, 10), status: 'running' };
      cluster.aiProcessed = Math.floor(Math.random() * 100) + 50;

      BINDING_HISTORY.unshift({
        time: new Date().toLocaleString('zh-CN', { year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit' }).replace(/\//g, '-'),
        cluster: cluster.name,
        skill: `${skill.name} ${skill.version}`,
        action: 'bind',
        operator: 'admin'
      });

      closeModal();
      renderTicket();
    });
  });
}

/* ══════════════════════════════════════════════════
   工单空间：Skill 管理（含发布 Drawer）
   ══════════════════════════════════════════════════ */

/* ── Skill 列表 Mock 数据 ── */
const TICKET_SKILLS = [
  { id: 'ts-1', name: '信保拒付争议处理', version: 'v1.2', compiled: true, status: 'published', scene: '信用保障-拒付争议', updatedAt: '2026-06-07',
    predictSamples: [
      { ticketId: '2508057134223961', type: '拒付争议', summary: '信保订单拒付结果不认可，定制产品被作废', aiResult: '建议按SOP告知商家拒付规则，标记"重复工单"' },
      { ticketId: '2508057134223982', type: '拒付争议', summary: '拒付费用分担异议，要求退还多扣金额', aiResult: '按信保规则，告知买家费用分担比例及申诉路径' },
      { ticketId: '2508057134224011', type: '拒付争议', summary: '拒付申诉被驳回，不理解驳回理由', aiResult: '查询驳回记录，告知具体原因及二次申诉条件' },
      { ticketId: '2508057134224035', type: '拒付争议', summary: '信保拒付后货物已签收，商家要求重新发货补偿', aiResult: '确认物流状态，告知拒付与物流状态无关，引导走拒付申诉流程' },
      { ticketId: '2508057134224048', type: '拒付争议', summary: '买家拒付后商家未收到通知，质疑平台流程', aiResult: '核实通知记录，确认通知已发送至商家邮箱，提醒检查垃圾箱' },
      { ticketId: '2508057134224062', type: '拒付争议', summary: '多笔订单同时被拒付，商家认为恶意拒付', aiResult: '查询买家历史拒付率，属正常范围，告知商家可逐笔申诉' },
      { ticketId: '2508057134224075', type: '拒付争议', summary: '拒付金额与订单金额不一致，差额说明不清', aiResult: '调取账单明细，告知差额为汇率波动及手续费，提供计算公式' },
      { ticketId: '2508057134224089', type: '拒付争议', summary: '商家申诉超时未处理，投诉平台响应慢', aiResult: '核实工单队列，确认在处理中，告知预计48H内给出结果' },
      { ticketId: '2508057134224096', type: '拒付争议', summary: '拒付申诉需补充材料，商家不知道提交什么', aiResult: '列出所需材料清单（订单截图、物流凭证、沟通记录），提供上传入口链接' },
      { ticketId: '2508057134224103', type: '拒付争议', summary: '拒付成功但资金未退回，商家着急催促', aiResult: '确认拒付成功状态，告知资金退回周期为3-5个工作日，当前在处理中' },
    ],
    verified: 10, verifiedCorrect: 10 },
  { id: 'ts-2', name: '发货履约异常处理', version: 'v2.0', compiled: true, status: 'published', scene: '信用保障-发货履约', updatedAt: '2026-06-05',
    predictSamples: [
      { ticketId: '2508057134224063', type: '发货超时', summary: '贸易术语审核不通过，物流关联错误', aiResult: '系统已知Bug，告知客户等待系统更新后重试' },
      { ticketId: '2508057134224078', type: '履约豁免', summary: '异常履约率豁免申请被拒', aiResult: '核实近30天发货数据，符合条件可重新提交' },
      { ticketId: '2508057134224085', type: '发货超时', summary: '发货时效显示72H，实际已超过但未处罚', aiResult: '确认属于新政策过渡期，告知新规则生效时间及影响' },
      { ticketId: '2508057134224091', type: '物流关联', summary: '物流单号关联失败，显示“无效单号”', aiResult: '核实物流商接口状态，建议重新提交或换用手动关联' },
      { ticketId: '2508057134224098', type: '发货超时', summary: '发货超时被扣分，商家认为是物流商延误', aiResult: '核实物流揽收时间，确认属物流商延误，建议提交申诉并附物流凭证' },
      { ticketId: '2508057134224105', type: '贸易术语', summary: '贸易术语从 CIF 改 FOB 后系统未同步', aiResult: '引导商家在订单设置中重新选择术语并保存，48H后生效' },
      { ticketId: '2508057134224112', type: '履约豁免', summary: '新店铺尚无订单但履约率显示异常', aiResult: '新店铺数据初始化延迟，告知等待T+1日刷新即可恢复正常' },
      { ticketId: '2508057134224119', type: '发货超时', summary: '单号已揽收但系统仍显示“未发货”', aiResult: '系统同步延迟，已触发手动刷新，预计2H内更新状态' },
      { ticketId: '2508057134224126', type: '物流关联', summary: '多个包裹分批发货，系统只识别第一个单号', aiResult: '引导商家使用“多包裹关联”功能选10追加剩余单号' },
      { ticketId: '2508057134224133', type: '履约豁免', summary: '不可抗力导致延迟发货，申请豁免被拒', aiResult: '要求提供不可抗力证明材料（政府公告/物流停运通知），重新提交申诉' },
    ],
    verified: 10, verifiedCorrect: 9 },
  { id: 'ts-3', name: '营销推广咨询处理', version: 'v1.0', compiled: true, status: 'published', scene: '网站营销与推广', updatedAt: '2026-06-02',
    predictSamples: [
      { ticketId: '2058057134223956', type: '推广暂停', summary: '全站推广暂停原因不明，联系客服', aiResult: '核实账户状态，告知暂停原因为余额不足' },
      { ticketId: '2058057134223970', type: '广告异常', summary: '广告投放效果突然下降，费用未变化', aiResult: '检查广告竞价策略，告知近期行业竞价上涨导致曝光下降' },
      { ticketId: '2058057134223984', type: '活动规则', summary: '参加平台活动后价格被锁定，无法修改', aiResult: '告知活动期间价格保护机制，活动结束后自动解锁' },
      { ticketId: '2058057134223998', type: '推广暂停', summary: '店铺被屏蔽后推广费是否退还', aiResult: '核实屏蔽原因，告知屏蔽期间推广自动暂停不扣费，已消耗费用不退' },
      { ticketId: '2058057134224012', type: '广告异常', summary: '广告素材审核不通过，原因模糊', aiResult: '查询审核记录，告知具体违规点（图片文字占比超标），提供修改建议' },
      { ticketId: '2058057134224026', type: '活动规则', summary: '报名平台活动后未获得流量加权', aiResult: '核实活动参与状态，告知加权生效有T+2延迟，建议等待' },
      { ticketId: '2058057134224040', type: '推广暂停', summary: '推广账户余额充足但显示“已暂停”', aiResult: '核实账户状态，发现存在异常登录触发风控，引导修改密码后解锁' },
      { ticketId: '2058057134224054', type: '广告异常', summary: 'P4P广告点击费用异常高，怀疑被恶意点击', aiResult: '提交恶意点击核查工单，告知48H内给出核查结果，确认后退费' },
      { ticketId: '2058057134224068', type: '活动规则', summary: '活动报名成功但商品未被收录到活动页', aiResult: '核实商品是否满足活动门槛（价格/评分），告知不符合具体哪条规则' },
      { ticketId: '2058057134224082', type: '推广暂停', summary: '切换店铺后推广计划消失，无法恢复', aiResult: '推广计划绑定店铺维度，切换后需重新创建，原计划数据可导出' },
    ],
    verified: 10, verifiedCorrect: 8 },
  { id: 'ts-4', name: '收汇核查辅助', version: 'v0.9', compiled: true, status: 'offline', scene: '资金管理-收汇核查', updatedAt: '2026-05-20',
    predictSamples: [
      { ticketId: '2508057134225001', type: 'TT支付', summary: 'TT支付已汇出但平台未到账', aiResult: '查询银行汇款状态，确认在途，告知T+3工作日到账' },
      { ticketId: '2508057134225002', type: '外汇核查', summary: '银行外汇核查延迟导致入账晚', aiResult: '告知外汇管理局核查周期为5-7工作日，当前状态正常' },
    ],
    verified: 2, verifiedCorrect: 2 },
  { id: 'ts-5', name: '账户安全与准入处理', version: 'v1.0', compiled: true, status: 'published', scene: '账户安全与准入', updatedAt: '2026-06-01',
    predictSamples: [
      { ticketId: '2508057134225101', type: 'ACP准入', summary: 'ACP准入失败，显示资质不符', aiResult: '核实资质材料，告知具体不符合项及补充路径' },
      { ticketId: '2508057134225102', type: '黑名单', summary: '账号被拉入黑名单，不知道原因', aiResult: '查询黑名单原因为多次违规，告知申诉流程及解除条件' },
      { ticketId: '2508057134225103', type: '权限异常', summary: '子账号无法查看订单详情', aiResult: '核实权限配置，引导主账号在后台授权订单查看权限' },
    ],
    verified: 3, verifiedCorrect: 3 },
  { id: 'ts-6', name: '知识产权申诉处理', version: 'v0.8', compiled: false, compileErrors: [
      '线上环境校验失败：缺少必要的知识库依赖「ip-rules-base」，该知识库尚未上线生产环境',
      '引用的 SOP 节点「侵权申诉三级判定」未通过合规审核，需先在合规中心完成审批',
      '调用链路异常：外部接口「IP-Risk-Score-API」在线上环境无授权白名单配置'
    ], status: 'offline', scene: '知识产权与网规', updatedAt: '2026-05-15',
    predictSamples: [
      { ticketId: '2508057134225201', type: '侵权申诉', summary: '侵权扣分申诉，商家认为误判', aiResult: '查询扣分记录及举报凭证，告知申诉条件' },
      { ticketId: '2508057134225202', type: '规则解析', summary: '不理解为什么产品被判定侵权', aiResult: '解析具体触发规则（图片相似度>90%），建议更换主图' },
    ],
    verified: 2, verifiedCorrect: 1 },
];

/* ── Skill 管理页 ── */
export function renderTicketSkill() {
  const container = document.getElementById('sec-ticket-skill');
  if (!container) return;

  container.innerHTML = `
    <div class="x-page-header">
      <h1 class="x-page-title">Skill 管理</h1>
      <p class="x-page-desc">上传、编译、管理工单处理类 Skill，点击「发布」进入验证与上线流程</p>
    </div>

    <div class="ticket-section-card">
      <div class="ticket-section-title">
        <span>已上传 Skill</span>
        <button class="ticket-bind-btn btn-bindnew" id="ticketUploadSkillBtn">+ 上传新 Skill</button>
      </div>
      <table class="ticket-history-table">
        <thead>
          <tr>
            <th>Skill 名称</th>
            <th>版本</th>
            <th>编译状态</th>
            <th>绑定场景</th>
            <th>更新时间</th>
            <th>发布状态</th>
            <th style="text-align:center">操作</th>
          </tr>
        </thead>
        <tbody>
          ${TICKET_SKILLS.map(s => {
            const compiledTag = s.compiled
              ? '<span class="skill-status-tag tag-compiled-pass">✓ 通过</span>'
              : `<span class="skill-status-tag tag-compiled-fail tag-clickable" data-skill-id="${s.id}" title="点击查看原因">✗ 未通过</span>`;
            const statusTag = s.status === 'published'
              ? '<span class="skill-status-tag tag-published">已发布</span>'
              : '<span class="skill-status-tag tag-offline">已下线</span>';
            const actionBtns = s.status === 'published'
              ? `<button class="ticket-test-trigger" data-skill-id="${s.id}">✏️ 编辑</button><button class="ticket-offline-trigger" data-skill-id="${s.id}">⏸ 下线</button>`
              : `<button class="ticket-test-trigger" data-skill-id="${s.id}">✏️ 编辑</button><button class="ticket-publish-trigger" data-skill-id="${s.id}">🚀 发布</button>`;
            return `
            <tr>
              <td style="font-weight:600">${s.name}</td>
              <td>${s.version}</td>
              <td>${compiledTag}</td>
              <td>${s.scene}</td>
              <td class="ticket-h-time">${s.updatedAt}</td>
              <td>${statusTag}</td>
              <td style="text-align:center">${actionBtns}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>

    <!-- 右侧 Drawer 容器 -->
    <div class="ticket-drawer-overlay" id="ticketDrawerOverlay"></div>
    <aside class="ticket-drawer" id="ticketDrawer">
      <div class="ticket-drawer-header">
        <h2 class="ticket-drawer-title"></h2>
        <button class="ticket-drawer-close" id="ticketDrawerClose">✕</button>
      </div>
      <div class="ticket-drawer-body" id="ticketDrawerBody"></div>
    </aside>
  `;

  // 绑定发布按钮
  container.querySelectorAll('.ticket-publish-trigger').forEach(btn => {
    btn.addEventListener('click', () => {
      const skillId = btn.dataset.skillId;
      const skill = TICKET_SKILLS.find(s => s.id === skillId);
      if (skill) openPublishDrawer(skill);
    });
  });

  // 绑定测试按钮
  container.querySelectorAll('.ticket-test-trigger').forEach(btn => {
    btn.addEventListener('click', () => {
      const skillId = btn.dataset.skillId;
      const skill = TICKET_SKILLS.find(s => s.id === skillId);
      if (skill) renderTestEnvironment(skill);
    });
  });

  // 绑定下线按钮
  container.querySelectorAll('.ticket-offline-trigger').forEach(btn => {
    btn.addEventListener('click', () => {
      const skillId = btn.dataset.skillId;
      const skill = TICKET_SKILLS.find(s => s.id === skillId);
      if (!skill) return;
      if (confirm(`确认将「${skill.name} ${skill.version}」下线？\n下线后该 Skill 将停止自动化处理工单。`)) {
        skill.status = 'offline';
        // 同步解绑场景
        const cluster = TICKET_CLUSTERS.find(c => c.boundSkill && c.boundSkill.name.includes(skill.name));
        if (cluster) {
          cluster.boundSkill = null;
          cluster.aiProcessed = 0;
        }
        renderTicketSkill();
      }
    });
  });

  // 关闭 Drawer
  container.querySelector('#ticketDrawerClose')?.addEventListener('click', closeDrawer);
  container.querySelector('#ticketDrawerOverlay')?.addEventListener('click', closeDrawer);

  // 编译未通过点击查看原因
  container.querySelectorAll('.tag-compiled-fail.tag-clickable').forEach(tag => {
    tag.addEventListener('click', () => {
      const skillId = tag.dataset.skillId;
      const skill = TICKET_SKILLS.find(s => s.id === skillId);
      if (skill && skill.compileErrors) showCompileErrorModal(skill);
    });
  });

  // 上传新 Skill 按钮
  container.querySelector('#ticketUploadSkillBtn')?.addEventListener('click', openUploadSkillModal);
}

/* ══════════════════════════════════════════════════
   编译失败原因弹窗
   ══════════════════════════════════════════════════ */

function showCompileErrorModal(skill) {
  showModal(`
    <div class="modal-header">
      <span class="modal-title">编译未通过 — ${skill.name} ${skill.version}</span>
      <button class="btn-icon" id="modalClose">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <line x1="1" y1="1" x2="13" y2="13" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
          <line x1="13" y1="1" x2="1" y2="13" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
        </svg>
      </button>
    </div>
    <div class="modal-body">
      <p style="font-size:13px;color:var(--text-2,#a1a7b8);margin:0 0 12px">线上工作环境校验未通过，以下问题需要修复后重新编译：</p>
      <div class="compile-error-list">
        ${skill.compileErrors.map((err, i) => `
          <div class="compile-error-item">
            <span class="compile-error-idx">${i + 1}</span>
            <span class="compile-error-msg">${err}</span>
          </div>
        `).join('')}
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" id="modalCancel">关闭</button>
    </div>
  `);

  document.getElementById('modalClose')?.addEventListener('click', closeModal);
  document.getElementById('modalCancel')?.addEventListener('click', closeModal);
}

/* ══════════════════════════════════════════════════
   Skill 编辑环境
   ══════════════════════════════════════════════════ */

/* ── Mock 规则配置 ── */
const SKILL_RULES = {
  'ts-1': `WHEN user.request.type == "chargeback"
  AND case.dispute_status IN ["rejected", "pending_appeal"]
  AND order.payment_method == "credit_insurance"
THEN
  action: "guide_appeal"
  notify: true
  priority: "high"
  sla: "48h"`,
  'ts-2': `WHEN user.request.type == "shipment"
  AND order.shipped_amount < 0.8
THEN
  action: "auto_correct"
  notify: true
  priority: "high"`,
  'ts-3': `WHEN user.request.type == "marketing"
  AND campaign.status IN ["paused", "error"]
THEN
  action: "diagnose_campaign"
  notify: false
  priority: "medium"`,
  'ts-4': `WHEN user.request.type == "fund_check"
  AND payment.status == "pending_verification"
THEN
  action: "verify_receipt"
  notify: true
  priority: "low"`,
  'ts-5': `WHEN user.request.type == "account_access"
  AND (account.status == "blacklisted" OR acp.result == "failed")
THEN
  action: "verify_identity"
  notify: true
  priority: "high"
  sla: "24h"`,
  'ts-6': `WHEN user.request.type == "ip_dispute"
  AND item.infringement_score > 0.9
THEN
  action: "guide_appeal"
  notify: false
  priority: "medium"`,
};

/* ── Mock 测试结果生成 ── */
function generateMockTestResult(skill, ticketId) {
  const results = {
    'ts-1': { rule: '拒付争议处理', confidence: '94.7%', action: '引导申诉', time: '< 2s' },
    'ts-2': { rule: '发货金额不足80%申请订正', confidence: '92.3%', action: '自动订正', time: '< 3s' },
    'ts-3': { rule: '推广暂停诊断', confidence: '88.1%', action: '诊断活动状态', time: '< 2s' },
    'ts-4': { rule: '收汇核查辅助', confidence: '76.5%', action: '核查到账状态', time: '< 4s' },
    'ts-5': { rule: '账户安全与准入验证', confidence: '91.2%', action: '身份核实+权限修复', time: '< 2s' },
    'ts-6': { rule: '知识产权侵权判定', confidence: '82.6%', action: '引导申诉流程', time: '< 3s' },
  };
  const r = results[skill.id] || { rule: '通用匹配', confidence: '85.0%', action: '转人工', time: '< 5s' };
  return `工单 ${ticketId} 测试完成：\n- 命中规则：${r.rule}\n- 匹配信度：${r.confidence}\n- 建议动作：${r.action}\n- 预计处理耗时：${r.time}`;
}

/* ── 渲染编辑环境页面 ── */
function renderTestEnvironment(skill) {
  const container = document.getElementById('sec-ticket-skill');
  if (!container) return;

  const ruleCode = SKILL_RULES[skill.id] || 'WHEN true\nTHEN\n  action: "fallback"';
  const ruleLines = ruleCode.split('\n');

  container.innerHTML = `
    <div class="test-env">
      <!-- 顶部导航 -->
      <div class="test-env-topbar">
        <button class="test-env-back" id="testEnvBack">← 返回 Skill 列表</button>
        <span class="test-env-breadcrumb">Skill 管理 / <strong>${skill.name} ${skill.version}</strong> / 编辑环境</span>
        <button class="test-env-save-btn" id="testEnvSaveBtn">💾 保存</button>
      </div>

      <!-- 双栏布局 -->
      <div class="test-env-layout">
        <!-- 左侧：配置编辑 -->
        <div class="test-env-left">
          <div class="test-env-field">
            <label class="test-env-label">SKILL 名称</label>
            <div class="test-env-input-wrap">
              <input class="test-env-input test-env-editable" id="testSkillName" value="${skill.name}">
              <span class="test-env-edit-icon">✏️</span>
            </div>
          </div>
          <div class="test-env-field">
            <label class="test-env-label">SKILL 备注</label>
            <div class="test-env-input-wrap">
              <input class="test-env-input test-env-editable" id="testSkillDesc" value="${skill.scene !== '—' ? skill.scene + ' 场景自动化处理' : '待配置'}">
              <span class="test-env-edit-icon">✏️</span>
            </div>
          </div>
          <div class="test-env-field">
            <label class="test-env-label">规则配置</label>
            <div class="test-env-code test-env-code-tall">
              <textarea class="test-env-code-editor" id="testRuleEditor" spellcheck="false">${ruleCode}</textarea>
            </div>
          </div>

        </div>

        <!-- 右侧：信息与测试 -->
        <div class="test-env-right">
          <!-- 基本信息卡片 -->
          <div class="test-env-card">
            <h3 class="test-env-card-title">ℹ️ 基本信息</h3>
            <div class="test-env-info-row"><span>SKILL ID</span><code>${skill.id}</code></div>
            <div class="test-env-info-row"><span>状态</span><span class="test-env-status ${skill.status === 'compiled' ? 'status-tuning' : skill.status === 'published' ? 'status-online' : 'status-off'}"> ${skill.status === 'compiled' ? '调优中' : skill.status === 'published' ? '已上线' : '已下线'}</span></div>
            <div class="test-env-info-row"><span>创建时间</span><span>2026-05-20 09:15</span></div>
            <div class="test-env-info-row"><span>更新时间</span><span>${skill.updatedAt} 14:20</span></div>
          </div>

          <!-- 测试运行 -->
          <div class="test-env-card">
            <h3 class="test-env-card-title">🧪 测试运行</h3>
            <label class="test-env-label">工单号码</label>
            <input class="test-env-input test-env-ticket-input" id="testTicketId" placeholder="输入工单号码...">
            <p class="test-env-hint">输入工单号码后方可运行测试，验证 SKILL 执行效果</p>
            <button class="test-env-run-btn" id="testRunBtn">▶ 运行测试</button>

            <!-- 运行结果区 -->
            <div class="test-env-result" id="testResultArea" style="display:none">
              <h4 class="test-env-result-title">📝 运行结论</h4>
              <pre class="test-env-result-body" id="testResultBody"></pre>
            </div>

            <!-- 执行按钮 -->
            <button class="test-env-execute-btn" id="testExecuteBtn" style="display:none">⚡ 执行自动化工单操作</button>
          </div>

          <!-- 操作记录 -->
          <div class="test-env-card">
            <h3 class="test-env-card-title">🕙 操作记录</h3>
            <div class="test-env-timeline" id="testTimeline">
              <div class="test-env-timeline-item">
                <span class="timeline-dot"></span>
                <div class="timeline-content">
                  <span class="timeline-action">修改规则配置</span>
                  <span class="timeline-time">2分钟前</span>
                </div>
              </div>
              <div class="test-env-timeline-item">
                <span class="timeline-dot"></span>
                <div class="timeline-content">
                  <span class="timeline-action">运行测试通过</span>
                  <span class="timeline-time">30分钟前</span>
                </div>
              </div>
              <div class="test-env-timeline-item">
                <span class="timeline-dot"></span>
                <div class="timeline-content">
                  <span class="timeline-action">创建 SKILL</span>
                  <span class="timeline-time">2026-05-20</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  // 返回按钮
  container.querySelector('#testEnvBack')?.addEventListener('click', () => {
    renderTicketSkill();
  });

  // 保存按钮
  container.querySelector('#testEnvSaveBtn')?.addEventListener('click', () => {
    const newName = document.getElementById('testSkillName')?.value?.trim();
    const newDesc = document.getElementById('testSkillDesc')?.value?.trim();
    const newRule = document.getElementById('testRuleEditor')?.value;
    if (newName) skill.name = newName;
    if (newRule) SKILL_RULES[skill.id] = newRule;
    skill.updatedAt = new Date().toISOString().slice(0, 10);

    // 更新操作记录时间线
    const timeline = document.getElementById('testTimeline');
    if (timeline) {
      const newItem = document.createElement('div');
      newItem.className = 'test-env-timeline-item new';
      newItem.innerHTML = `
        <span class="timeline-dot active"></span>
        <div class="timeline-content">
          <span class="timeline-action">保存编辑 - ${newName || skill.name}</span>
          <span class="timeline-time">刚刚</span>
        </div>
      `;
      timeline.insertBefore(newItem, timeline.firstChild);
    }

    const btn = container.querySelector('#testEnvSaveBtn');
    btn.textContent = '✅ 已保存';
    setTimeout(() => { btn.textContent = '💾 保存'; }, 1500);
  });



  // 运行测试按钮
  container.querySelector('#testRunBtn')?.addEventListener('click', () => {
    const ticketId = document.getElementById('testTicketId')?.value?.trim();
    if (!ticketId) { alert('请输入工单号码'); return; }

    const btn = container.querySelector('#testRunBtn');
    btn.textContent = '⏳ 运行中...';
    btn.disabled = true;

    // 模拟异步运行
    setTimeout(() => {
      const result = generateMockTestResult(skill, ticketId);
      const resultArea = document.getElementById('testResultArea');
      const resultBody = document.getElementById('testResultBody');
      const execBtn = document.getElementById('testExecuteBtn');

      resultBody.textContent = result;
      resultArea.style.display = 'block';
      execBtn.style.display = 'block';

      btn.textContent = '▶ 运行测试';
      btn.disabled = false;

      // 添加时间线记录
      const timeline = document.getElementById('testTimeline');
      const newItem = document.createElement('div');
      newItem.className = 'test-env-timeline-item new';
      newItem.innerHTML = `
        <span class="timeline-dot active"></span>
        <div class="timeline-content">
          <span class="timeline-action">运行测试 - 工单 ${ticketId}</span>
          <span class="timeline-time">刚刚</span>
        </div>
      `;
      timeline.insertBefore(newItem, timeline.firstChild);
    }, 1200);
  });

  // 执行自动化按钮
  container.querySelector('#testExecuteBtn')?.addEventListener('click', function() {
    this.textContent = '✅ 执行成功！工单已自动处理';
    this.classList.add('executed');
    this.disabled = true;

    const timeline = document.getElementById('testTimeline');
    const newItem = document.createElement('div');
    newItem.className = 'test-env-timeline-item new';
    newItem.innerHTML = `
      <span class="timeline-dot active"></span>
      <div class="timeline-content">
        <span class="timeline-action">执行自动化操作</span>
        <span class="timeline-time">刚刚</span>
      </div>
    `;
    timeline.insertBefore(newItem, timeline.firstChild);
  });
}

/* ── 打开发布 Drawer ── */
function openPublishDrawer(skill) {
  const drawer = document.getElementById('ticketDrawer');
  const overlay = document.getElementById('ticketDrawerOverlay');
  const title = drawer?.querySelector('.ticket-drawer-title');
  const body = document.getElementById('ticketDrawerBody');
  if (!drawer || !body) return;

  title.textContent = `${skill.name} ${skill.version}`;
  overlay.classList.add('open');
  drawer.classList.add('open');

  // 默认展示 Step 1
  renderDrawerStep1(skill, body);
}

/* ── Step 1: 预测验证页 ── */
function renderDrawerStep1(skill, body) {
  // 先展示 loading 态
  body.innerHTML = `
    <div class="drawer-page">
      <!-- 步骤指示器 -->
      <div class="drawer-steps-indicator">
        <span class="drawer-step-dot active">1</span>
        <span class="drawer-step-line"></span>
        <span class="drawer-step-dot">2</span>
      </div>

      <div class="drawer-step-header">
        <span class="drawer-step-num">1</span>
        <span class="drawer-step-label">预测验证</span>
        <span class="ticket-badge badge-unbind">执行中</span>
      </div>
      <p class="drawer-step-desc">正在拉取采样工单并执行批量预测验证，请稍候…</p>

      <div class="drawer-loading-container">
        <div class="drawer-loading-spinner"></div>
        <p class="drawer-loading-text">Skill 批量预测中…</p>
        <p class="drawer-loading-sub">正在对采样工单执行 AI 预处理，预计需要数秒</p>
      </div>
    </div>
  `;

  // 5 秒后切换为验证结果
  setTimeout(() => {
    renderDrawerStep1Content(skill, body);
  }, 5000);
}

/* ── Step 1 内容（loading 结束后渲染） ── */
function renderDrawerStep1Content(skill, body) {
  const allVerified = skill.predictSamples.length > 0 && skill.verified === skill.predictSamples.length;
  const allCorrect = skill.verifiedCorrect === skill.predictSamples.length;

  body.innerHTML = `
    <div class="drawer-page">
      <!-- 步骤指示器 -->
      <div class="drawer-steps-indicator">
        <span class="drawer-step-dot active">1</span>
        <span class="drawer-step-line"></span>
        <span class="drawer-step-dot">2</span>
      </div>

      <div class="drawer-step-header">
        <span class="drawer-step-num">1</span>
        <span class="drawer-step-label">预测验证</span>
        <span class="ticket-badge ${allVerified && allCorrect ? 'badge-bind' : 'badge-unbind'}">${allVerified ? `${skill.verifiedCorrect}/${skill.predictSamples.length} 通过` : '待验证'}</span>
      </div>
      <p class="drawer-step-desc">使用该 Skill 对采样工单进行 AI 预处理，人工确认结果准确性</p>

      ${skill.predictSamples.length === 0
        ? `<div class="drawer-empty">暂无采样工单可验证</div>`
        : `<div class="drawer-predict-list">
            ${skill.predictSamples.map((sample, idx) => `
              <div class="drawer-predict-item">
                <div class="drawer-predict-meta">
                  <span class="ticket-badge badge-unbind">${sample.type}</span>
                  <span class="drawer-predict-id">${sample.ticketId}</span>
                </div>
                <div class="drawer-predict-summary">${sample.summary}</div>
                <div class="drawer-predict-ai">
                  <span class="drawer-ai-label">AI 结果：</span>${sample.aiResult}
                </div>
                <div class="drawer-predict-actions" data-idx="${idx}">
                  <button class="ticket-bind-btn btn-bindnew drawer-verify-btn" data-result="correct">✓ 正确</button>
                  <button class="ticket-bind-btn btn-unbind drawer-verify-btn" data-result="wrong">✗ 错误</button>
                </div>
              </div>
            `).join('')}
          </div>`
      }

      <!-- 底部操作栏 -->
      <div class="drawer-page-footer">
        <button class="drawer-next-btn" id="drawerNextBtn">下一步：发布上线 →</button>
      </div>
    </div>
  `;

  // 验证按钮事件
  body.querySelectorAll('.drawer-verify-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      const item = this.closest('.drawer-predict-actions');
      item.innerHTML = this.dataset.result === 'correct'
        ? '<span class="drawer-verified-ok">✅ 已标记正确</span>'
        : '<span class="drawer-verified-fail">❌ 已标记错误</span>';
    });
  });

  // 下一步按钮
  body.querySelector('#drawerNextBtn')?.addEventListener('click', () => {
    renderDrawerStep2(skill, body);
  });
}

/* ── Step 2: 发布上线页 ── */
function renderDrawerStep2(skill, body) {
  const allVerified = skill.predictSamples.length > 0 && skill.verified === skill.predictSamples.length;
  const allCorrect = skill.verifiedCorrect === skill.predictSamples.length;

  body.innerHTML = `
    <div class="drawer-page">
      <!-- 步骤指示器 -->
      <div class="drawer-steps-indicator">
        <span class="drawer-step-dot done">✓</span>
        <span class="drawer-step-line done"></span>
        <span class="drawer-step-dot active">2</span>
      </div>

      <div class="drawer-step-header">
        <span class="drawer-step-num">2</span>
        <span class="drawer-step-label">发布上线</span>
      </div>
      <p class="drawer-step-desc">确认各项检查通过后，将 Skill 部署到正式沙箱环境</p>

      <div class="ticket-publish-checklist">
        <div class="ticket-publish-check ${skill.status === 'compiled' ? 'check-pass' : ''}">${skill.status === 'compiled' ? '✅' : '⬜'} 编译验证通过</div>
        <div class="ticket-publish-check ${allVerified && allCorrect ? 'check-pass' : ''}">${allVerified && allCorrect ? '✅' : '⬜'} 预测验证 ${skill.verifiedCorrect}/${skill.predictSamples.length} 正确</div>
        <div class="ticket-publish-check ${skill.scene !== '—' ? 'check-pass' : ''}">${skill.scene !== '—' ? '✅' : '⬜'} 已绑定工单场景：${skill.scene}</div>
      </div>

      <!-- 底部操作栏 -->
      <div class="drawer-page-footer">
        <button class="drawer-back-btn" id="drawerBackBtn">← 返回验证</button>
        <button class="ticket-drawer-publish-btn ${allVerified && allCorrect ? '' : 'disabled'}" id="drawerPublishBtn">
          🚀 确认发布上线
        </button>
      </div>
      ${!(allVerified && allCorrect) ? '<p class="drawer-publish-hint">请先完成预测验证后方可发布</p>' : ''}
    </div>
  `;

  // 返回按钮
  body.querySelector('#drawerBackBtn')?.addEventListener('click', () => {
    renderDrawerStep1(skill, body);
  });

  // 发布按钮事件
  body.querySelector('#drawerPublishBtn')?.addEventListener('click', function() {
    if (this.classList.contains('disabled')) return;
    this.textContent = '✅ 发布成功！';
    this.classList.add('published');

    // 更新 Skill 状态为已发布
    skill.status = 'published';

    setTimeout(() => {
      closeDrawer();
      renderTicketSkill(); // 重新渲染列表反映新状态
    }, 1500);
  });
}

/* ── 关闭 Drawer ── */
function closeDrawer() {
  document.getElementById('ticketDrawer')?.classList.remove('open');
  document.getElementById('ticketDrawerOverlay')?.classList.remove('open');
}

/* ── 上传新 Skill Modal ── */
function openUploadSkillModal() {
  showModal(`
    <div class="modal-header">
      <span class="modal-title">上传新 Skill</span>
      <button class="btn-icon" id="modalClose">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <line x1="1" y1="1" x2="13" y2="13" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
          <line x1="13" y1="1" x2="1" y2="13" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
        </svg>
      </button>
    </div>
    <div class="modal-body">
      <div class="form-group">
        <label class="form-label">导入 SKILL.md</label>
        <div class="dropzone" id="ticketDropzone">拖入 SKILL.md 文件，或点击选择</div>
        <input type="file" id="ticketFileInput" accept=".md" style="display:none">
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Skill 名称<span class="req">*</span></label>
          <input class="form-input" id="fTicketSkillName" placeholder="如：资金核查辅助">
        </div>
        <div class="form-group">
          <label class="form-label">版本<span class="req">*</span></label>
          <input class="form-input" id="fTicketSkillVer" value="v1.0" placeholder="v1.0">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">绑定场景</label>
        <select class="form-select" id="fTicketSkillScene">
          <option value="—">不指定</option>
          ${TICKET_CLUSTERS.map(c => `<option value="${c.name}">${c.name}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">描述</label>
        <textarea class="form-textarea" id="fTicketSkillDesc" rows="3" placeholder="简要描述该 Skill 的处理能力和适用场景"></textarea>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" id="modalCancel">取消</button>
      <button class="btn btn-primary" id="modalSave">上传并编译</button>
    </div>
  `);

  document.getElementById('modalClose')?.addEventListener('click', closeModal);
  document.getElementById('modalCancel')?.addEventListener('click', closeModal);

  // Dropzone 交互
  const dz = document.getElementById('ticketDropzone');
  const fi = document.getElementById('ticketFileInput');
  dz?.addEventListener('click', () => fi?.click());
  dz?.addEventListener('dragover', e => { e.preventDefault(); dz.classList.add('dragover'); });
  dz?.addEventListener('dragleave', () => dz.classList.remove('dragover'));
  dz?.addEventListener('drop', e => {
    e.preventDefault(); dz.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (file) { dz.textContent = `✅ 已选择：${file.name}`; dz.classList.add('has-file'); }
  });
  fi?.addEventListener('change', () => {
    if (fi.files[0]) { dz.textContent = `✅ 已选择：${fi.files[0].name}`; dz.classList.add('has-file'); }
  });

  // 上传保存
  document.getElementById('modalSave')?.addEventListener('click', () => {
    const name = document.getElementById('fTicketSkillName')?.value?.trim();
    const ver = document.getElementById('fTicketSkillVer')?.value?.trim() || 'v1.0';
    const scene = document.getElementById('fTicketSkillScene')?.value || '—';
    if (!name) { alert('请填写 Skill 名称'); return; }

    // 添加到 TICKET_SKILLS
    TICKET_SKILLS.push({
      id: `ts-${Date.now()}`,
      name,
      version: ver,
      status: 'compiled',
      scene,
      updatedAt: new Date().toISOString().slice(0, 10),
      predictSamples: [],
      verified: 0,
      verifiedCorrect: 0
    });

    closeModal();
    renderTicketSkill();
  });
}

