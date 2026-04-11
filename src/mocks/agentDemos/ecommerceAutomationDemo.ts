/**
 * 电商自动化托管 Demo 可复用图标类型。
 */
export type EcommerceAutomationDemoIconKey =
  | "overview"
  | "employee"
  | "risk"
  | "document"
  | "process"
  | "database"
  | "task"
  | "benchmark"
  | "ranking"
  | "chat";

/**
 * 电商自动化托管 Demo 的工具步骤定义。
 */
export interface EcommerceAutomationDemoToolStep {
  id: string;
  name: string;
  displayName: string;
  purpose: string;
  output: string;
}

/**
 * 电商自动化托管 Demo 的单个 skill 示例定义。
 */
export interface EcommerceAutomationDemoSkillDefinition {
  id: string;
  name: string;
  iconKey: EcommerceAutomationDemoIconKey;
  category: string;
  summary: string;
  description: string;
  emoji: string;
  prompt: string;
  title: string;
  updatedAt: string;
  thinking: string;
  preview: string;
  responseMarkdown: string;
  artifactFileName: string;
  artifactTaskName: string;
  artifactSize: string;
  toolSteps: EcommerceAutomationDemoToolStep[];
}

/**
 * 电商自动化托管 Agent 基础信息。
 *
 * 数据来源：`/Users/yangwanquan/Downloads/电商自动化托管拆解 3.31.docx`
 */
export const ECOMMERCE_AUTOMATION_AGENT_DEMO = {
  id: "employee-ecom-ops",
  name: "电商自动化托管",
  avatarSeed: "employee-ecom-ops",
  role: "面向电商店铺运营团队，处理货盘定价、商品质检、订单异常监控和运营播报",
  summary:
    "面向电商店铺运营团队，提供全网比价、商品链接质检、发货/退款/差评监控和异常播报，适合做电商自动化托管演示。",
  welcomeMessage:
    "你可以直接把货盘 Excel、微店商品、退款单或差评异常发给我，我会按电商托管流程给出质检、监控和处置建议。",
  systemPrompt:
    "你是一名电商自动化托管 Agent，负责货盘比价、商品上架质检、发货超时监控、退款风险预警、差评聚类和运营播报输出。",
  intro: "我是电商自动化托管 Agent，可以直接帮你做货盘比价、商品质检、订单异常监控和运营播报。",
  boundMembers: ["杨万泉", "陈雪梅", "王晨", "李婷", "赵立", "周可"],
  documentNames: ["电商托管说明.md", "商品质检规则.md", "订单异常监控SOP.md"],
} as const;

/**
 * 电商自动化托管 Agent 的内置 skill 与场景示例。
 */
export const ECOMMERCE_AUTOMATION_SKILL_DEMOS: EcommerceAutomationDemoSkillDefinition[] = [
  {
    id: "market-price-compare",
    name: "全网比价",
    iconKey: "ranking",
    category: "商品运营",
    summary: "读取货盘和商品图片，校验毛利率，再按公开平台价格给出竞争力评级。",
    description: "适合在商品定价前快速做一轮市场比价、毛利率校验和建议定价区间输出。",
    emoji: "💹",
    prompt: "把这批坚果礼盒货盘做一轮全网比价，看看定价和毛利率有没有问题。",
    title: "坚果礼盒货盘比价总览",
    updatedAt: "今天 21:24",
    thinking:
      "先识别货盘里的商品名、规格、售价和供货价，优先排除低于供货价或毛利异常的 SKU，再按什么值得买、淘宝商品库和 1688 的公开价格做来源与时效对比，最后给竞争力评级和建议定价区间。",
    preview: "已完成坚果礼盒货盘比价，标出 1 个倒挂风险 SKU 和 3 个建议调价项。",
    responseMarkdown: `# 坚果礼盒货盘比价总览

## 结论
- 本批次共识别 12 个 SKU，其中 1 个存在售价低于建议毛利线风险，3 个定价高于市场低价超过 8%
- 当前最需要调整的是“每日坚果 750g”，继续按 59.9 元售卖会压缩毛利空间
- 其余大部分 SKU 仍具备可卖性，但建议把差异点明确到“礼包装 / 赠品 / 发货时效”

## 重点 SKU 对比
| SKU | 供货价 | 当前售价 | 市场最低到手价 | 数据时效 | 竞争力 | 建议 |
| --- | --- | --- | --- | --- | --- | --- |
| 每日坚果 750g | 46.0 | 59.9 | 56.8（淘宝活动） | 近 30 天 | 🔴 | 建议调整到 62.9-65.9 |
| 夏威夷果礼盒 1kg | 72.0 | 98.0 | 95.0（1688 分销） | 1-4 个月 | 🟡 | 维持售价，补“送礼场景”卖点 |
| 混合果干礼盒 600g | 21.5 | 39.9 | 42.8（什么值得买） | 近 30 天 | 🟢 | 当前价格具备竞争力 |
| 开心果桶装 500g | 29.0 | 49.9 | 45.6（淘宝店铺） | 近 30 天 | 🟡 | 若不降价，需强化“净含量 + 现货” |

## 毛利率与建议定价区间
- 毛利率低于 20%：每日坚果 750g，建议暂停确认
- 毛利率 20%-30%：开心果桶装 500g，可根据赠品策略微调
- 毛利率 30% 以上：混合果干礼盒 600g，适合做引流款

## 批量处理建议
1. 先把红色风险 SKU 单独列出，避免直接同步到店铺
2. 对黄色 SKU 优先补“包装升级 / 现货直发 / 赠品”卖点
3. 输出汇总表给运营和采购，确认哪些 SKU 走活动价、哪些 SKU 维持日常价`,
    artifactFileName: "坚果礼盒-全网比价报告.md",
    artifactTaskName: "全网比价分析",
    artifactSize: "15 KB",
    toolSteps: [
      {
        id: "sheet-parse",
        name: "price_sheet_parse",
        displayName: "货盘字段识别",
        purpose: "自动识别商品名、规格、售价和供货价字段",
        output: "已识别 12 个 SKU，并统一了售价、供货价和规格字段。",
      },
      {
        id: "margin-check",
        name: "margin_guard_check",
        displayName: "毛利率校验",
        purpose: "优先拦截低于供货价或毛利异常的 SKU",
        output: "已标出 1 个倒挂风险 SKU 和 3 个毛利边缘 SKU。",
      },
      {
        id: "price-scan",
        name: "public_price_scan",
        displayName: "公开平台比价",
        purpose: "按平台来源和时效抓取市场公开价格",
        output: "已完成什么值得买、淘宝商品库和 1688 的价格抓取与时效标注。",
      },
      {
        id: "pricing-band",
        name: "pricing_band_generate",
        displayName: "定价区间生成",
        purpose: "输出竞争力评级和建议定价区间",
        output: "已生成红黄绿竞争力评级和各 SKU 建议定价区间。",
      },
    ],
  },
  {
    id: "product-link-quality-check",
    name: "商品链接质检",
    iconKey: "process",
    category: "商品运营",
    summary: "把货盘和微店全量在售商品对齐，识别漏上架、未备案和六维异常。",
    description: "适合在商品上架后做批量质检，快速拉出漏上架清单和逐 SKU 异常明细。",
    emoji: "🧪",
    prompt: "帮我把微店在售商品做一轮链接质检，重点看漏上架和 SKU 异常。",
    title: "微店 SKU 质检报告",
    updatedAt: "今天 21:31",
    thinking:
      "先把货盘里的 SKU 编码和微店在售商品拉平，以货号做双向比对找出漏上架和未备案，再按售价误差、规格匹配、运费险、标题、描述和备案状态六个维度输出异常等级。",
    preview: "已完成微店 SKU 质检，识别 3 个漏上架商品、2 个未备案商品和 14 条异常。",
    responseMarkdown: `# 微店 SKU 质检报告

## 汇总
- 共核验 86 个 SKU
- 漏上架 3 个，未备案 2 个，六维异常 14 条
- 当前最优先处理的是售价偏差大于 5% 和规格名称不一致的商品

## 漏上架清单
| SKU | 商品名 | 货盘售价 | 建议动作 |
| --- | --- | --- | --- |
| SNK-23018 | 每日坚果 30 包礼盒 | 79.9 | 立即补上架，避免活动流量承接失败 |
| SNK-23027 | 原味夏威夷果大桶装 | 52.0 | 今天内补链，关联直播间商品卡 |
| SNK-23041 | 红枣核桃礼盒 | 45.9 | 与采购确认库存后补上架 |

## 重点异常 SKU
| SKU | 异常项 | 当前状态 | 建议 |
| --- | --- | --- | --- |
| SNK-23006 | 售价误差 9.2% | 店铺价高于货盘价 | 优先校准售价，避免客服解释成本上升 |
| SNK-23012 | 规格名称不一致 | 货盘 750g / 店铺 700g | 核对包装图，防止售后纠纷 |
| SNK-23022 | 运费险未开启 | 店铺未配置 | 今日内补齐，降低退款拉扯 |
| SNK-23037 | 标题评分 2 星 | 标题堆词，转化弱 | 重新整理卖点和核心规格 |

## 六维质检结论
1. 售价误差异常：5 条
2. 规格名称不一致：3 条
3. 运费险未开启：2 条
4. 标题与描述低分：4 条

## 推送摘要建议
> 今日共质检 86 个 SKU，异常 14 个，漏上架 3 个。请先处理售价误差和规格不一致问题，附件为逐 SKU 质检表。`,
    artifactFileName: "微店-SKU质检报告.md",
    artifactTaskName: "商品链接质检",
    artifactSize: "19 KB",
    toolSteps: [
      {
        id: "sku-parse",
        name: "sku_sheet_parse",
        displayName: "货盘 SKU 解析",
        purpose: "读取货盘中的 SKU 编码、商品名和价格字段",
        output: "已解析货盘中的 86 个 SKU，并统一 SKU 编码格式。",
      },
      {
        id: "weidian-sync",
        name: "weidian_catalog_sync",
        displayName: "微店在售拉取",
        purpose: "拉取微店全量在售商品和 SKU 详情",
        output: "已同步当前微店在售商品列表与 SKU 详情。",
      },
      {
        id: "compare",
        name: "sku_quality_compare",
        displayName: "六维质检比对",
        purpose: "按售价、规格、运费险、标题、描述和备案状态做双向校验",
        output: "已识别 3 个漏上架、2 个未备案和 14 条质检异常。",
      },
      {
        id: "push",
        name: "quality_summary_push",
        displayName: "质检摘要推送",
        purpose: "生成企微群摘要和附件说明",
        output: "已生成质检摘要文案和逐 SKU 质检表附件说明。",
      },
    ],
  },
  {
    id: "shipping-timeout-watch",
    name: "发货超时监控",
    iconKey: "task",
    category: "风险监控",
    summary: "自动筛出付款后 48h 未出单和填单后 72h 未揽收的订单，并按供应商路由告警。",
    description: "适合做 7×24 小时履约监控，优先把高风险订单推送到供应商企微群和对接人。",
    emoji: "🚚",
    prompt: "把最近 48 小时付款未发货和 72 小时未揽收的订单拉出来，按供应商分级告警。",
    title: "发货超时告警汇总",
    updatedAt: "今天 21:38",
    thinking:
      "先按付款后 48 小时和填单后 72 小时两个规则过滤订单，再按供应商聚合并结合订单金额、催单次数和平台扣分风险拆成 P1/P2/P3，最后输出给供应商群和运营跟进人。",
    preview: "已拉出发货超时订单并完成供应商分级告警，P1 订单 4 单需要立即处理。",
    responseMarkdown: `# 发货超时告警汇总

## 风险概览
- P1 高风险 4 单：金额高、催单次数多或平台扣分风险高
- P2 中风险 7 单：已超过承诺时效，需要供应商当天反馈
- P3 低风险 5 单：建议继续跟踪，暂不升级

## P1 订单
| 订单号 | 触发规则 | 供应商 | 金额 | 当前状态 | 建议动作 |
| --- | --- | --- | --- | --- | --- |
| WD240331-018 | 付款后 56h 无单号 | 华南零食仓 | 468 | 用户已二次催单 | 立即 @ 供应商负责人，当天补发 |
| WD240331-024 | 填单后 79h 未揽收 | 北方礼盒仓 | 326 | 快递揽收停滞 | 追物流并给运营回传结果 |
| WD240331-029 | 付款后 61h 无单号 | 华东代发仓 | 512 | 平台临近扣分 | 升级到主管群处理 |
| WD240331-033 | 填单后 74h 未揽收 | 华南零食仓 | 389 | 用户申请投诉 | 先安抚用户，再催仓库补件 |

## 供应商路由建议
1. 华南零食仓：2 单 P1、1 单 P2，建议直接 @ 对接人和仓配主管
2. 北方礼盒仓：1 单 P1、3 单 P2，建议先确认爆仓原因
3. 华东代发仓：1 单 P1、3 单 P2，建议拉一轮当日缺货清单

## 运营跟进动作
- 对 P1 订单统一生成客服解释口径
- 对重复触发超时的供应商记录处理时效
- 晚上 18:00 再追一轮，未关闭的继续升级`,
    artifactFileName: "发货超时-告警汇总.md",
    artifactTaskName: "发货超时监控",
    artifactSize: "14 KB",
    toolSteps: [
      {
        id: "poll",
        name: "order_status_poll",
        displayName: "订单状态轮询",
        purpose: "持续轮询付款、出单和揽收状态",
        output: "已同步最近 72 小时订单的付款、单号和揽收状态。",
      },
      {
        id: "timeout",
        name: "shipping_timeout_detect",
        displayName: "超时规则识别",
        purpose: "筛出付款 48h 未发货和填单 72h 未揽收订单",
        output: "已识别 16 单异常订单，并按时效规则归类。",
      },
      {
        id: "route",
        name: "supplier_routing_alert",
        displayName: "供应商路由告警",
        purpose: "按供应商和严重等级生成告警路由",
        output: "已完成 P1/P2/P3 分级，并生成供应商群 @ 提醒建议。",
      },
    ],
  },
  {
    id: "refund-reject-watch",
    name: "退款拒绝监控",
    iconKey: "risk",
    category: "风险监控",
    summary: "监控退款拒绝订单，结合金额和拒绝次数做风险分级并推送运营群。",
    description: "适合用在售后风险预警场景，优先把高风险退款单标红并安排人工介入。",
    emoji: "💸",
    prompt: "帮我看一下最近退款拒绝里哪些单子风险最高，先标红给运营群。",
    title: "退款拒绝风险分级",
    updatedAt: "今天 21:45",
    thinking:
      "先拉出最近退款拒绝订单，再结合退款金额、拒绝次数、商品客诉类型和平台介入概率做风险评级，最后把红色高风险订单整理成运营群处理清单。",
    preview: "已完成退款拒绝风险分级，红色高风险订单 3 单，建议今晚优先复核。",
    responseMarkdown: `# 退款拒绝风险分级

## 风险结论
- 红色高风险 3 单：拒绝次数 >= 2 且金额高，平台介入概率高
- 黄色中风险 5 单：金额不高，但投诉情绪明显
- 绿色低风险 4 单：证据充分，可继续跟进

## 红色高风险订单
| 订单号 | 金额 | 拒绝次数 | 主诉原因 | 风险等级 | 建议 |
| --- | --- | --- | --- | --- | --- |
| WD-RF-1024 | 699 | 2 | 包装破损 + 延迟发货 | 红色 | 立即复核证据，必要时转同意退款 |
| WD-RF-1031 | 458 | 3 | 规格与详情页不符 | 红色 | 先停拒绝动作，补客服解释和赔付方案 |
| WD-RF-1042 | 326 | 2 | 食品临期争议 | 红色 | 拉质检同事一起复盘，避免平台介入败诉 |

## 中风险共性
- 主要集中在“描述不符”和“物流时效”两类
- 如果继续拒绝，容易放大成差评或二次客诉

## 建议运营群推送口径
> 今日退款拒绝监控共识别高风险 3 单、中风险 5 单。请先处理规格不符和临期争议订单，避免平台介入升级。高风险订单已标红。`,
    artifactFileName: "退款拒绝-风险分级.md",
    artifactTaskName: "退款拒绝监控",
    artifactSize: "13 KB",
    toolSteps: [
      {
        id: "refund-scan",
        name: "refund_case_scan",
        displayName: "退款拒绝扫描",
        purpose: "拉取最近退款拒绝订单和主诉原因",
        output: "已扫描最近 12 单退款拒绝订单，并提取拒绝原因。",
      },
      {
        id: "refund-score",
        name: "refund_risk_score",
        displayName: "退款风险评级",
        purpose: "根据金额、拒绝次数和平台介入概率做风险分层",
        output: "已完成红黄绿三级风险分层，并识别 3 单高风险订单。",
      },
      {
        id: "ops-alert",
        name: "ops_group_alert",
        displayName: "运营群告警",
        purpose: "生成运营群重点处理清单",
        output: "已生成高风险退款单清单和运营群播报文案。",
      },
    ],
  },
  {
    id: "negative-review-watch",
    name: "差评监控",
    iconKey: "document",
    category: "风险监控",
    summary: "监控新增差评和中评，聚合高频问题关键词并回推商品改进方向。",
    description: "适合自动归纳近期中差评内容，识别高频问题、关联 SKU 和后续改进动作。",
    emoji: "⭐",
    prompt: "把最近新增的差评和中评整理一下，帮我归纳高频问题关键词。",
    title: "差评高频问题聚合",
    updatedAt: "今天 21:52",
    thinking:
      "先汇总近 24 小时新增差评和中评，再做问题关键词聚类，识别哪些问题集中在包装、口感、物流或客服环节，最后给出优先级和对应 SKU 的整改建议。",
    preview: "已整理中差评高频问题关键词，包装破损和口感不一致是当前两大问题。",
    responseMarkdown: `# 差评高频问题聚合

## 近 24 小时评价摘要
- 新增差评 7 条，中评 11 条
- 涉及 5 个 SKU，其中 2 个 SKU 的问题高度集中
- 当前最高频的问题是“包装破损”“口感偏硬”“物流慢”

## 高频关键词
| 关键词 | 次数 | 涉及 SKU | 判断 |
| --- | --- | --- | --- |
| 包装破损 | 6 | 每日坚果 30 包礼盒、红枣核桃礼盒 | 优先排查仓库打包 |
| 口感偏硬 | 4 | 夏威夷果大桶装 | 可能与批次或仓储时长有关 |
| 物流太慢 | 4 | 混合果干礼盒、开心果桶装 | 与发货超时问题存在联动 |
| 规格不符 | 2 | 每日坚果 750g | 需回查详情页文案 |

## 重点 SKU 建议
1. 每日坚果 30 包礼盒
   - 先排查包装箱和缓冲材料
   - 评价回复统一走补发 / 补偿方案
2. 夏威夷果大桶装
   - 回看最近批次是否受潮或炒制偏硬
   - 下次直播提前解释口感差异

## 运营动作建议
- 差评和发货超时数据需要一起看，避免把履约问题误判成商品问题
- 对包装破损类差评统一拉仓配负责人复盘
- 对高频口感问题补一版商品详情页说明和客服话术`,
    artifactFileName: "差评监控-高频问题聚合.md",
    artifactTaskName: "差评监控",
    artifactSize: "12 KB",
    toolSteps: [
      {
        id: "review-collect",
        name: "review_stream_collect",
        displayName: "评价流采集",
        purpose: "汇总新增差评和中评内容",
        output: "已采集近 24 小时 18 条中差评并去重归档。",
      },
      {
        id: "review-cluster",
        name: "review_keyword_cluster",
        displayName: "高频问题聚类",
        purpose: "识别评价里的高频问题关键词和关联 SKU",
        output: "已聚类出包装破损、口感偏硬、物流慢等高频问题。",
      },
      {
        id: "review-push",
        name: "review_digest_push",
        displayName: "差评摘要推送",
        purpose: "生成运营群摘要和整改建议",
        output: "已生成差评摘要和分责任方的整改建议。",
      },
    ],
  },
  {
    id: "ops-hourly-briefing",
    name: "运营响应播报",
    iconKey: "overview",
    category: "风险监控",
    summary: "把发货、退款和差评监控结果合并成每小时播报和当日处理重点。",
    description:
      "来源于文档第四阶段的响应层能力，适合把多个监控 skill 的异常合并成运营团队可直接处理的播报。",
    emoji: "📣",
    prompt: "给我汇总一版最近一小时订单异常播报，再附上今天的处理重点。",
    title: "订单异常每小时播报",
    updatedAt: "今天 21:58",
    thinking:
      "把发货超时、退款拒绝和差评监控三路异常合并，先给过去一小时的实时播报，再补今天截至目前的处理优先级和责任方路由，让运营只需要响应例外。",
    preview: "已生成最近一小时订单异常播报，并附上今日处理重点和责任方路由。",
    responseMarkdown: `# 每小时订单异常播报

## 过去 1 小时异常总览
- 发货超时新增 9 单，其中 P1 2 单
- 退款拒绝高风险新增 1 单，中风险 2 单
- 中差评新增 6 条，包装破损相关占 3 条

## 今日处理重点
1. 华南零食仓的发货超时问题今天必须清零，避免继续放大差评
2. 退款拒绝里的“规格不符”订单优先复核，避免平台介入
3. 包装破损问题需要仓配负责人今天内给整改结论

## 责任方路由
- 供应商企微群：同步所有发货超时 P1/P2 订单
- 运营群：接收退款高风险和差评聚合摘要
- 客服负责人：补统一解释话术，承接用户情绪

## 每日数据大盘摘要
- 今日订单履约及时率：91.4%
- 今日退款高风险占比：2.8%
- 今日中差评率：1.7%
- 当前最需要持续盯的异常主题：发货时效、包装破损

## 建议动作
- 18:00 再跑一轮播报，验证 P1 订单是否关闭
- 明早晨会直接复盘三项核心异常，不需要运营再手动查后台`,
    artifactFileName: "订单异常-每小时播报.md",
    artifactTaskName: "运营响应播报",
    artifactSize: "11 KB",
    toolSteps: [
      {
        id: "merge",
        name: "exception_merge",
        displayName: "异常结果合并",
        purpose: "合并发货、退款和差评三路监控结果",
        output: "已合并最近一小时的发货、退款和差评异常数据。",
      },
      {
        id: "briefing",
        name: "ops_brief_generate",
        displayName: "播报生成",
        purpose: "输出每小时订单异常播报和日内大盘摘要",
        output: "已生成过去一小时播报和今日处理重点摘要。",
      },
      {
        id: "route",
        name: "action_route_generate",
        displayName: "责任方路由",
        purpose: "把异常处理动作路由到供应商、运营和客服负责人",
        output: "已整理责任方路由和下一轮跟进动作。",
      },
    ],
  },
];

/**
 * 电商自动化托管首页预置问题。
 */
export const ECOMMERCE_AUTOMATION_HOME_PROMPTS = ECOMMERCE_AUTOMATION_SKILL_DEMOS.map(
  item => item.prompt,
);
