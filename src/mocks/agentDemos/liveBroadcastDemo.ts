/**
 * 直播运营 Demo 可复用图标类型。
 */
export type LiveBroadcastDemoIconKey =
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
 * 直播运营 Demo 的工具步骤定义。
 */
export interface LiveBroadcastDemoToolStep {
  id: string;
  name: string;
  displayName: string;
  purpose: string;
  output: string;
}

/**
 * 直播运营 Demo 的单个 skill 示例定义。
 */
export interface LiveBroadcastDemoSkillDefinition {
  id: string;
  name: string;
  iconKey: LiveBroadcastDemoIconKey;
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
  toolSteps: LiveBroadcastDemoToolStep[];
}

/**
 * 直播运营 Agent 基础信息。
 *
 * 数据来源：`/Users/yangwanquan/Downloads/要做成demo的skill素材-直播.docx`
 */
export const LIVE_BROADCAST_AGENT_DEMO = {
  id: "employee-live-ops",
  name: "直播运营",
  avatarSeed: "employee-live-ops",
  role: "面向直播运营团队，处理脚本编导、达人搜索、热点选题、选品分析和直播前舆情预审",
  summary:
    "面向直播运营团队，提供直播脚本编导、抖音热点选题、达人搜索及爆品热度分析，适合做选题、投放与直播执行演示。",
  welcomeMessage:
    "你可以直接把产品信息、投放诉求、热点方向、选品品类或直播 brief 发给我，我会按直播运营视角给你可直接执行的方案。",
  systemPrompt:
    "你是一名直播运营 Agent，负责处理直播脚本生成、抖音达人投放筛选、热点选题、爆品热度分析、直播前舆情调研和直播编导方案输出。",
  intro:
    "我是直播运营 Agent，可以直接帮你做讲品脚本、达人投放、热点选题、爆品热度、微博舆情和整场直播编导方案。",
  boundMembers: ["杨万泉", "陈雪梅", "王晨", "李婷", "赵立", "周可"],
  documentNames: ["直播运营说明.md", "抖音投放流程.md", "直播编导清单.md"],
} as const;

/**
 * 直播运营 Agent 的内置 skill 与场景示例。
 */
export const LIVE_BROADCAST_SKILL_DEMOS: LiveBroadcastDemoSkillDefinition[] = [
  {
    id: "live-script",
    name: "万能直播脚本",
    iconKey: "document",
    category: "直播策划",
    summary: "接收商品资料，自动整理为可直接上播的讲品脚本和逼单话术。",
    description:
      "直播讲品脚本生成器。适合输入商品卖点、买点和补贴信息后，直接产出完整的 8 模块直播讲品脚本。",
    emoji: "📝",
    prompt: "把惠普星Book Pro 16 2026 这款产品整理成一版直播讲品脚本，按 8 大模块输出。",
    title: "惠普 AI 本直播脚本",
    updatedAt: "今天 20:36",
    thinking:
      "先把商品基础信息、卖点、买点和价格占位收口，再按开场钩子、互动破冰、产品全景、核心卖点、逼单推进、辅助增值、售后兜底和情感收尾 8 个模块组织脚本。",
    preview: "已按 8 大模块生成惠普星Book Pro 16 的直播讲品脚本，并预留国补价占位。",
    responseMarkdown: `# 惠普 星Book Pro 16 直播脚本

## 核心卖点
- 酷睿 Ultra X7 358H 旗舰 AI 处理器
- 32G LPDDR5X + 1TB PCIe 4.0
- 16 英寸 2.5K + 240Hz
- 1.9kg 金属轻薄机身
- 支持国家消费补贴

## 模块 1：开场钩子
家人们，买笔记本是不是总在纠结：要性能，就怕太重；要轻薄，又担心配置缩水；想要高清大屏，又怕只有 60Hz。今天这台惠普星Book Pro 16，直接把这三个问题一次性解决。

## 模块 2：互动破冰
- 打开多个软件就卡顿的，评论区扣 \`1\`
- 经常背电脑通勤、出差的，评论区扣 \`2\`
- 平时要修图、剪视频、做 PPT 的，评论区扣 \`3\`

## 模块 3：产品全景
1. 旗舰 AI 处理器：Ultra X7 358H，修图剪辑和本地 AI 运算都更快
2. 32G 高速内存：多任务并行更稳，不容易掉帧卡顿
3. 2.5K + 240Hz：高清和高刷同时兼顾
4. 16 英寸大屏 + 1.9kg：出差、上课、见客户都不累
5. 国家补贴窗口：当前到手价具备明显竞争力

## 模块 4：核心卖点深讲
### 卖点一：顶级 AI 处理器
很多同价位只给 Ultra 5 / Ultra 7 低频版，这台直接上 X7，性能天花板明显更高。

### 卖点二：高清和高刷一起给
同价位常见取舍是“高刷不高清”或“高清不高刷”，这台 2.5K + 240Hz 是少数一次配齐的组合。

### 卖点三：大屏还轻
16 寸常见重量往往会到 2kg 往上，这台做到了 1.9kg，更适合直播间强调“效率 + 通勤”的双场景。

## 模块 5：逼单推进
1. 国补窗口期：今天下单就是用政策帮你省钱
2. 同价位竞品对比：处理器、内存、屏幕、重量四个维度一起打
3. 一线品牌背书：惠普全球联保，适合做“放心买”收口

## 模块 6：辅助增值
- 本地 AI 提效：周报、PPT、字幕和修图都更快
- 1TB 高速固态：视频素材和大文件传输更省时间
- 全球联保：商务和学生场景都更安心

## 模块 7：售后兜底
7 天无理由退换，整机官方质保，直播间可重点强调品牌体系保障。

## 模块 8：情感收尾
一台好电脑不是单纯的工具，而是每天工作和学习的效率乘数。现在有国补、有旗舰处理器、有大屏轻薄，这个窗口期值得抓住。

## 待补充字段
- \`{国补价}\`
- \`{价格差额}\`
- \`{补贴金额}\`
- 上市销量或用户好评数`,
    artifactFileName: "惠普星Book-Pro16-直播脚本.md",
    artifactTaskName: "直播脚本生成",
    artifactSize: "28 KB",
    toolSteps: [
      {
        id: "ingest",
        name: "live_brief_ingest",
        displayName: "商品资料整理",
        purpose: "解析商品基础信息、卖点与买点",
        output: "已识别品牌、处理器、屏幕、重量、补贴政策和 6 条核心买点。",
      },
      {
        id: "outline",
        name: "live_script_outline",
        displayName: "脚本框架生成",
        purpose: "按 8 大模块搭建讲品脚本骨架",
        output: "已完成开场、卖点深讲、逼单推进和情感收尾结构编排。",
      },
      {
        id: "polish",
        name: "live_script_polish",
        displayName: "讲品话术润色",
        purpose: "补齐互动口播、占位字段和收尾动作",
        output: "已补充评论区互动、价格占位和直播口播节奏。",
      },
    ],
  },
  {
    id: "douyin-kol-search",
    name: "抖音星图搜索达人",
    iconKey: "employee",
    category: "直播预热",
    summary: "按品类、粉丝量和带货能力筛选达人，输出可直接投放的候选名单。",
    description: "抖音星图达人投放筛选工具。适合直播前快速圈选腰尾部达人，补齐投放建议和预算组合。",
    emoji: "🔎",
    prompt: "我要做小米冲牙器的投放，你帮我推荐一下达人。",
    title: "小米冲牙器达人推荐",
    updatedAt: "今天 20:44",
    thinking:
      "先把品类判断为“口腔护理 + 科技数码”交叉赛道，再按口腔护理垂类、数码测评和专业背书三条路线分别筛一轮，最后给预算组合建议。",
    preview: "已整理小米冲牙器达人推荐报告，包含 3 条投放路线和预算组合建议。",
    responseMarkdown: `# 小米冲牙器投放达人推荐报告

## 路线一：口腔护理垂类
| 达人 | 粉丝 | 评分 | 报价/条 | 推荐理由 |
| --- | --- | --- | --- | --- |
| 爱护牙齿的小酷 | 58.7 万 | 73.6 | 6650-8100 | 互动率高，口腔护理标签精准 |
| 参半口腔护理色修官方直播间 | 56.1 万 | 69.0 | 4900-8900 | 电商等级高，适合做转化补位 |
| 兔头妈妈口腔护理专场 | 41.8 万 | 59.9 | 9900-12000 | 母婴 + 口腔场景兼容，适合家庭用户 |

## 路线二：科技数码测评
| 达人 | 粉丝 | 评分 | 报价/条 | 推荐理由 |
| --- | --- | --- | --- | --- |
| 李公子玩数码 | 44.2 万 | 61.5 | 3600-9000 | 爆款能力强，适合讲功能卖点 |
| 数码悦悦酱 | 24.2 万 | 68.0 | 1000-2000 | 性价比最高，适合多条测款 |
| Ryan玩数码 | 62.9 万 | 64.8 | 4950-9000 | 数码测评受众稳定，适合科技品牌调性 |

## 路线三：牙医专业背书
| 达人 | 粉丝 | 接单 | 推荐理由 |
| --- | --- | --- | --- |
| 牙医茹楠 | 16.1 万 | 可接单 | 专业身份强，信任感最好 |
| 牙齿正畸刘医生 | 42.0 万 | 待私联 | 专业内容穿透力强 |

## 组合投放建议
- 预算 5-8 万时，优先“精准口腔流量 + 数码测评 + 牙医背书”
- 第一轮建议：爱护牙齿的小酷 × 2、数码悦悦酱 × 3、牙医茹楠 × 1
- 适合直播前做口碑种草，再把直播间商品卡和短视频矩阵打通

## 内容方向建议
1. 牙医推荐：强调“口腔医生每天用什么”
2. 对比测评：冲牙器 vs 传统牙线
3. 正畸场景：牙套党、牙缝清洁痛点
4. 小米品牌势能：科技感 + 性价比`,
    artifactFileName: "小米冲牙器-达人投放推荐.md",
    artifactTaskName: "达人投放筛选",
    artifactSize: "18 KB",
    toolSteps: [
      {
        id: "category",
        name: "category_match",
        displayName: "投放赛道归类",
        purpose: "识别商品所属赛道与达人搜索关键词",
        output: "已将商品归到“口腔护理 + 科技数码”交叉赛道。",
      },
      {
        id: "search",
        name: "tikhub_xingtu_search",
        displayName: "星图达人搜索",
        purpose: "分批搜索口腔护理、数码测评和牙医背书达人",
        output: "已完成 4 批达人抓取和基础字段清洗。",
      },
      {
        id: "score",
        name: "creator_scoring",
        displayName: "投放评分",
        purpose: "根据粉丝量、互动率和报价形成投放建议",
        output: "已输出 3 条投放路线与预算组合。",
      },
    ],
  },
  {
    id: "douyin-topic-radar",
    name: "抖音热点选题雷达",
    iconKey: "ranking",
    category: "直播策划",
    summary: "拉取抖音热榜并结合品类生成短视频选题和直播开场话术。",
    description: "抖音热点选题雷达。适合直播前半小时快速找热点切入点，补齐视频标题和口播方向。",
    emoji: "🔥",
    prompt: "帮我做一下小米冲牙器的抖音热点选题。",
    title: "小米冲牙器热点选题",
    updatedAt: "今天 20:49",
    thinking:
      "先抓当日抖音热搜，再判断哪些热点能与“口腔护理 / 科技品牌 / 生活方式”建立关系，最后给短视频标题和直播开场口播。",
    preview: "已输出小米冲牙器当日热点选题，包含可蹭方向和直播开场话术。",
    responseMarkdown: `# 抖音热点选题雷达 · 小米冲牙器

## 今日热榜可用方向
1. **春日妆容公式**
   - 切口：妆前口腔仪式感
   - 标题：\`春日妆容公式里，牙齿状态也是一环\`
2. **一个视频彻底搞懂 Token**
   - 切口：套用“一个视频搞懂 XX”的科普爆款句式
   - 标题：\`一个视频彻底搞懂冲牙器，原来我以前都没冲对\`
3. **中国机器狼群巷战画面首次公开**
   - 切口：科技热点借势小米科技品牌感
   - 标题：\`机器狼都上热搜了，小米的黑科技其实也在口腔里\`
4. **周杰伦新专辑从夯到拉**
   - 切口：卡点 routine，适合年轻受众
   - 标题：\`跟着周杰伦的节奏做今天的口腔护理\`

## 今日优先级建议
- ⭐⭐⭐ 优先做“一个视频彻底搞懂冲牙器”
- ⭐⭐⭐ 次选“春日妆容公式 × 口腔 routine”
- ⭐⭐ 补一条“小米科技 × 热点科技”内容

## 直播开场话术
### 话术 A：生活方式
今天全网都在讲春日公式，妆容、穿搭、香味都有了，但很多人忽略了笑起来第一眼能看到的口腔状态。

### 话术 B：科技品牌
今天科技热点刷屏，我突然想到，其实小米很多黑科技不只在手机上，连冲牙器都已经卷到“参数党”会心动的程度。

### 话术 C：科普模板
今天我不卖关子，直接用 3 分钟带你搞懂冲牙器到底值不值得买，以及为什么小米这款最近热度这么高。

## 执行动作
- 先上 1 条科普爆款句式视频
- 再补 1 条美妆 / routine 场景化视频
- 直播开场直接接“科技热点”或“科普爆款句式”`,
    artifactFileName: "小米冲牙器-抖音热点选题.md",
    artifactTaskName: "热点选题雷达",
    artifactSize: "14 KB",
    toolSteps: [
      {
        id: "hotlist",
        name: "tikhub_billboard",
        displayName: "抖音热榜抓取",
        purpose: "拉取当日抖音实时热搜榜",
        output: "已抓取今日实时热榜并完成热度排序。",
      },
      {
        id: "match",
        name: "topic_match",
        displayName: "热点匹配",
        purpose: "筛选可与冲牙器建立关联的热点方向",
        output: "已识别科普、美妆、科技和娱乐四类可用切口。",
      },
      {
        id: "hook",
        name: "opening_hook_generate",
        displayName: "口播建议生成",
        purpose: "补齐短视频标题与直播开场话术",
        output: "已生成 3 套直播开场口播和 4 个标题模板。",
      },
    ],
  },
  {
    id: "product-heat-analysis",
    name: "抖音爆品热度分析",
    iconKey: "overview",
    category: "直播预热",
    summary: "抓取近 7 天热视频，输出爆品榜单、热度得分和选品建议。",
    description:
      "抖音爆品热度分析。适合直播运营在选品前快速判断一个品类的热门内容方向和头部品牌线索。",
    emoji: "📈",
    prompt: "我是做猫粮品类的，帮我查一下爆品热度。",
    title: "猫粮爆品热度榜",
    updatedAt: "今天 20:57",
    thinking:
      "先按“猫粮推荐 / 毒猫粮 / 新手养猫 / 猫粮测评”抓最近热视频，再用互动和传播维度做热度排序，最后总结内容方向和品牌机会。",
    preview: "已输出猫粮近 7 天爆品热度榜，附带内容方向和品牌关注建议。",
    responseMarkdown: `# 抖音爆品热度榜 · 猫粮

## TOP 5 爆品内容
| 排名 | 热度分 | 主题 | 核心标签 |
| --- | --- | --- | --- |
| 1 | 49 | 我就说上网还是能学到真东西的 | 毒猫粮 / 科学养宠 |
| 2 | 26 | 一秒鉴别垃圾粮 | 猫粮测评 / 新手养猫 |
| 3 | 21 | 20 款网红热门猫粮怎么选 | 性价比 / 榜单内容 |
| 4 | 20 | 真心建议少给猫咪喂劣质粮 | 雷区避坑 |
| 5 | 19 | 官方旗舰店品牌内容 | 品牌心智 / 官方投流 |

## 热门方向结论
1. **避坑型内容最强势**
   - “毒猫粮”“垃圾粮”比单纯推荐更容易拉互动
2. **榜单 / 对比型内容稳定**
   - 用户更愿意看“20 款怎么选”“第一名是谁”
3. **品牌官方号也在加码**
   - ORIJEN 渴望、皇家都已经有官方投流和内容动作

## 直播选品建议
- 先做“避坑教育”，再带自家主推猫粮
- 准备一张“成分对比表”做直播视觉物料
- 如果预算有限，优先押“毒猫粮避坑 + 性价比榜单”两条线

## 后续动作
- 继续追踪 7 天内是否有新的品牌号加大投流
- 补一个“新手养猫口粮选择”专题脚本
- 结合直播间 SKU 做一版猫粮对比清单`,
    artifactFileName: "猫粮-抖音爆品热度榜.md",
    artifactTaskName: "爆品热度分析",
    artifactSize: "12 KB",
    toolSteps: [
      {
        id: "crawl",
        name: "douyin_video_scan",
        displayName: "抖音视频抓取",
        purpose: "抓取猫粮相关近 7 天热视频",
        output: "已抓取 35 条相关视频并完成基础去重。",
      },
      {
        id: "heat",
        name: "heat_score",
        displayName: "热度评分",
        purpose: "按点赞、评论、收藏和转发计算热度得分",
        output: "已生成 TOP 榜单和热视频代表样本。",
      },
      {
        id: "suggestion",
        name: "product_pick_suggestion",
        displayName: "选品建议",
        purpose: "结合热视频方向输出直播选品建议",
        output: "已总结避坑教育、榜单对比和品牌投流三条机会线。",
      },
    ],
  },
  {
    id: "weibo-risk-scan",
    name: "微博搜索明星黑点",
    iconKey: "risk",
    category: "直播预热",
    summary: "直播前搜索明星或品牌舆情，输出黑点、亮点和违禁词建议。",
    description:
      "明星/品牌直播前置舆情调研工具。适合邀约明星前快速做风险评估、直播话题筛查和活动建议。",
    emoji: "🛡️",
    prompt: "虞书欣这个明星如果要上直播，先帮我做一版微博舆情和违禁词调研。",
    title: "虞书欣直播前舆情调研",
    updatedAt: "今天 21:05",
    thinking:
      "先把近 7 天动态和历史黑点分开，再提炼当前适合直播利用的正向记忆点，最后给违禁词和直播避雷建议。",
    preview: "已整理虞书欣直播前舆情报告，包含历史黑点、亮点记忆点和违禁词建议。",
    responseMarkdown: `# 直播前置调研报告 · 虞书欣

## 近期动态速报
- 黑粉公开道歉：整体偏正向，可作为“内核强大”人设补强
- 新剧开机：正常营业，适合直播间做轻度提及
- 粉圈内部争议：仍需避免延展到 CP 和站队话题

## 主要风险点
1. 张昊玥霸凌指控
2. 家族财富争议
3. 小卡售价过高引发的“割韭菜”讨论
4. CP 粉互撕和“圈内关系”类延展提问

## 可用亮点
- 小兰花 / 永夜星河等代表角色
- “内核强大”类语录，适合直播暖场
- 横店日常和时尚感内容，路人缘相对友好

## 必屏蔽违禁词
\`\`\`
张昊玥 / 霸凌 / 抑郁 / 家族黑钱 / 老潘财商 / 综艺黑幕 / 内定
\`\`\`

## 需人工判断词
\`\`\`
棣欣 / 丁禹兮 / CP / 脱粉 / 小卡 / 割韭菜 / 抢 C 位 / 圈内孤立 / 翻车
\`\`\`

## 直播建议
- 推荐聊作品、横店日常、时尚和音乐
- 不主动提家庭、CP、周边定价和圈内关系
- 如果需要做互动，优先走“感谢支持”“分享角色成长”路线`,
    artifactFileName: "虞书欣-直播前舆情调研.md",
    artifactTaskName: "微博舆情扫描",
    artifactSize: "16 KB",
    toolSteps: [
      {
        id: "weibo",
        name: "weibo_search",
        displayName: "微博检索",
        purpose: "抓取近期热搜、黑点和亮点记忆点",
        output: "已完成 7 天动态、历史黑点和高传播内容的聚合。",
      },
      {
        id: "risk",
        name: "risk_cluster",
        displayName: "舆情聚类",
        purpose: "按高风险、中风险和低风险整理话题",
        output: "已拆出历史黑点、粉圈余震和可用亮点。",
      },
      {
        id: "forbidden",
        name: "forbidden_words_generate",
        displayName: "违禁词建议",
        purpose: "生成直播间屏蔽词与活动避雷提示",
        output: "已输出 tier1 / tier2 违禁词清单和直播建议。",
      },
    ],
  },
  {
    id: "live-rundown-director",
    name: "直播脚本编导",
    iconKey: "task",
    category: "直播策划",
    summary: "从 brief 出发，生成完整 Rundown、模块深化和主持串场方案。",
    description:
      "直播 Rundown 生成器。适合品牌直播、明星直播和电商场景的整场流程设计与逐字稿编排。",
    emoji: "🎬",
    prompt:
      "给雀巢咖啡做一场品牌 + 明星直播，明星是李现，福利买 3 送 1，先帮我出完整 Rundown 和福利炸场方案。",
    title: "雀巢咖啡直播编导方案",
    updatedAt: "今天 21:16",
    thinking:
      "先校准为“品牌 + 明星直播 / 食品饮料 / 生活方式”三重标签，再搭整场 120 分钟的 Rundown，重点把李现出场和买 3 送 1 的福利炸场模块做深。",
    preview: "已生成雀巢咖啡的 Rundown 框架，并深化了李现出场的福利炸场转化模块。",
    responseMarkdown: `# 雀巢咖啡抖音直播全案

## Step 1：整场 Rundown
| 时间段 | 模块 | 目标 |
| --- | --- | --- |
| 0:00-0:10 | 开场预热 | 用打工人 / 学生党 / 健身党痛点破冰 |
| 0:10-0:25 | 品牌溯源 | 建立“国民咖啡 + 放心喝”认知 |
| 0:25-0:55 | 产品轮播试喝 | 4 款产品按场景做沉浸式种草 |
| 0:55-1:15 | 健康干货 + 达人连麦 | 做生活方式内容补强 |
| 1:15-1:40 | 福利炸场 + 李现出场 | 直播峰值转化 |
| 1:40-2:00 | 收尾返场 | 复盘爆款和复购引导 |

## Step 2：福利炸场模块
### 明星预热（3 分钟）
- 用“很多人的现男友”做暗示，不提前说名字
- 副屏倒计时，把流失观众拉回直播间

### 李现出场（10 分钟）
- 不让他念广告词，只聊真实喝咖啡场景
- 主播提问方向：
  - 拍戏或运动后什么时候最需要咖啡
  - 日常更喜欢黑咖还是奶咖
  - 有没有自己的快速冲泡习惯

### 福利释放（8 分钟）
- 讲清楚买 3 送 1 规则
- 主播直接帮用户配单：
  - 2 件 1+2 + 1 件黑咖
  - 3 件黑咖做囤货
  - 原味 + 特浓 + 果咖做家庭组合

### 弹幕炸场（3 分钟）
- 口令：\`雀巢全天元气\`
- 已下单用户刷口令参与抽奖
- 助播同步报库存和已售件数

## Step 3：执行提醒
- 李现只做真实互动，不做硬广朗读
- 福利板、赠品板和库存上屏要提前准备
- 连线前必须过一轮音视频和背景测试
- 若李现临时无法出场，准备录制版备选素材`,
    artifactFileName: "雀巢咖啡-直播编导方案.md",
    artifactTaskName: "直播编导输出",
    artifactSize: "20 KB",
    toolSteps: [
      {
        id: "brief",
        name: "brief_align",
        displayName: "直播类型校准",
        purpose: "识别直播类型、品类基调和核心卖点",
        output: "已校准为品牌 + 明星直播 / 食品饮料 / 生活方式型。",
      },
      {
        id: "rundown",
        name: "rundown_generate",
        displayName: "Rundown 框架生成",
        purpose: "输出整场 120 分钟直播流程",
        output: "已生成 6 大环节的时间分段和目标。",
      },
      {
        id: "conversion",
        name: "conversion_module_deepen",
        displayName: "转化环节深化",
        purpose: "重点深化李现出场和买 3 送 1 福利模块",
        output: "已补齐预热、出场、福利释放和弹幕炸场设计。",
      },
    ],
  },
];

/**
 * 直播运营首页预置问题。
 */
export const LIVE_BROADCAST_HOME_PROMPTS = LIVE_BROADCAST_SKILL_DEMOS.map(item => item.prompt);
