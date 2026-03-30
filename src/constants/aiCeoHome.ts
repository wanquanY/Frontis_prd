import { AI_CEO_AGENT_SCENARIO_QUESTIONS } from "@/constants/aiCeoScenarioPrompts";

/**
 * AI CEO 首页快捷问题定义。
 *
 * 数据来源：`/Users/yangwanquan/Downloads/AI-CEO系统-CEO分身Agent场景.md`
 */
export interface AiCeoHomePromptItem {
  id: string;
  question: string;
}

/**
 * AI CEO 首页 Skill 图标类型。
 */
export type AiCeoSkillIconKey =
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
 * AI CEO 首页 Skill 定义。
 */
export interface AiCeoHomeSkillItem {
  id: string;
  name: string;
  iconKey: AiCeoSkillIconKey;
}

/**
 * AI CEO 单个 Agent 的首页配置。
 */
export interface AiCeoAgentHomeConfig {
  intro: string;
  skillItems: AiCeoHomeSkillItem[];
  promptItems: AiCeoHomePromptItem[];
}

/**
 * AI CEO 各 Agent 的首页快捷问题与 Skill 配置。
 */
export const AI_CEO_AGENT_HOME_CONFIGS: Record<string, AiCeoAgentHomeConfig> = {
  "employee-pm": {
    intro: "我会直接把公司各序列的均分、预警、趋势和重点收口成一版老板晨会可直接复述的经营快照。",
    skillItems: [
      { id: "sequence_overview", name: "序列总览", iconKey: "overview" },
      { id: "alert_digest", name: "预警摘要", iconKey: "risk" },
      { id: "trend_compare", name: "趋势对比", iconKey: "ranking" },
      { id: "business_summary", name: "经营摘要", iconKey: "document" },
    ],
    promptItems: [
      { id: "pm-1", question: AI_CEO_AGENT_SCENARIO_QUESTIONS["employee-pm"] },
      { id: "pm-2", question: "按最近 30 天趋势，帮我挑出正在回升的两个序列。" },
      { id: "pm-3", question: "把管理序列和销售序列的预警拆成一句话让我能直接汇报。" },
      { id: "pm-4", question: "如果今天只盯两个序列，你会建议我盯哪两个？" },
      { id: "pm-5", question: "帮我把公司整体经营盘面压缩成一段晨会口径。" },
      { id: "pm-6", question: "哪些序列均分不算低，但隐性风险已经开始抬头？" },
    ],
  },
  "employee-designer": {
    intro: "我会从表现、证据、趋势和风险四个角度看人，先给判断，再给你可执行建议。",
    skillItems: [
      { id: "employee_assess", name: "员工评估", iconKey: "employee" },
      { id: "evidence_trace", name: "证据追踪", iconKey: "document" },
      { id: "erp_query", name: "ERP 校验", iconKey: "database" },
      { id: "risk_scan", name: "风险识别", iconKey: "risk" },
    ],
    promptItems: [
      { id: "designer-1", question: AI_CEO_AGENT_SCENARIO_QUESTIONS["employee-designer"] },
      { id: "designer-2", question: "帮我评估一下李婷最近的工作表现和风险点。" },
      { id: "designer-3", question: "给我看一下销售序列最近需要重点关注的员工。" },
      { id: "designer-4", question: "王晨最近的成绩和主要问题分别是什么？" },
      { id: "designer-5", question: "帮我判断一下赵立最近是不是处于下滑状态。" },
      { id: "designer-6", question: "按最近一个月表现，列出三个值得重点培养的人。" },
    ],
  },
  "employee-research": {
    intro: "我专门盯三条底线，会把触发证据、严重程度和处理建议直接拆给你，不跟你绕弯。",
    skillItems: [
      { id: "redline_detect", name: "红线检测", iconKey: "risk" },
      { id: "quality_redline", name: "品质安全", iconKey: "benchmark" },
      { id: "integrity_watch", name: "诚信担当", iconKey: "document" },
      { id: "craft_watch", name: "匠心传承", iconKey: "task" },
    ],
    promptItems: [
      { id: "research-1", question: AI_CEO_AGENT_SCENARIO_QUESTIONS["employee-research"] },
      { id: "research-2", question: "帮我筛一下最近一周最值得老板过问的红线苗头。" },
      { id: "research-3", question: "把品质安全底线最危险的 2 个案例先列给我。" },
      { id: "research-4", question: "哪些人还没触碰红线，但已经处在注意区了？" },
      { id: "research-5", question: "如果今天要安排约谈，先约哪几个人最合适？" },
      { id: "research-6", question: "帮我把最近的红黄灯事件压缩成一页管理口径。" },
    ],
  },
  "employee-ops": {
    intro: "我会把高分员工里真正值得表扬、值得培养、值得放大使用的人直接挑出来，不只给名单。",
    skillItems: [
      { id: "benchmark_find", name: "标杆识别", iconKey: "benchmark" },
      { id: "evidence_trace", name: "典型事迹", iconKey: "document" },
      { id: "talent_recommend", name: "培养建议", iconKey: "employee" },
      { id: "promotion_watch", name: "晋升储备", iconKey: "ranking" },
    ],
    promptItems: [
      { id: "ops-1", question: AI_CEO_AGENT_SCENARIO_QUESTIONS["employee-ops"] },
      { id: "ops-2", question: "把生产序列最像储备干部的人先挑出来给我。" },
      { id: "ops-3", question: "帮我找出本月最值得全员复盘的正向案例。" },
      { id: "ops-4", question: "如果我要做一轮表彰，先表扬哪 3 个人最有效？" },
      { id: "ops-5", question: "哪些高分员工不只是能打，还能带人？" },
      { id: "ops-6", question: "帮我把标杆员工的培养动作也一起列出来。" },
    ],
  },
  "employee-sales": {
    intro: "我会把序列内的标杆区、中间区、关注区和名次变化一次性拆开给你看，重点人不会埋在名单里。",
    skillItems: [
      { id: "score_rank", name: "评分排名", iconKey: "ranking" },
      { id: "zone_split", name: "区间分布", iconKey: "overview" },
      { id: "attention_watch", name: "关注区", iconKey: "risk" },
      { id: "rank_trend", name: "排名变化", iconKey: "employee" },
    ],
    promptItems: [
      { id: "sales-1", question: AI_CEO_AGENT_SCENARIO_QUESTIONS["employee-sales"] },
      { id: "sales-2", question: "把销售序列最近连续下滑的人先列出来。" },
      { id: "sales-3", question: "我只想看关注区，帮我把原因和动作都带上。" },
      { id: "sales-4", question: "哪些人虽然还在中间区，但已经有掉进关注区的风险？" },
      { id: "sales-5", question: "帮我看一下销售序列第一梯队最近的变化。" },
      { id: "sales-6", question: "把销售序列的排名结构压成一段老板口径。" },
    ],
  },
  "employee-writer": {
    intro: "我是 CEO 分身，你可以直接问我经营判断、人员状态、制度流程和协作安排，我会给你一句到位的建议。",
    skillItems: [
      { id: "sequence_overview", name: "经营总览", iconKey: "overview" },
      { id: "employee_assess", name: "员工评估", iconKey: "employee" },
      { id: "redline_detect", name: "风险识别", iconKey: "risk" },
      { id: "benchmark_find", name: "标杆识别", iconKey: "benchmark" },
      { id: "score_rank", name: "评分排名", iconKey: "ranking" },
      { id: "chat_send", name: "制度问答", iconKey: "chat" },
    ],
    promptItems: [
      { id: "writer-1", question: AI_CEO_AGENT_SCENARIO_QUESTIONS["employee-writer"] },
      { id: "writer-2", question: "生产部的王建国最近怎么样？" },
      { id: "writer-3", question: "小张最近有没有触碰红线？" },
      { id: "writer-4", question: "生产序列最近有哪些表现突出的标杆？我想了解一下。" },
      { id: "writer-5", question: "销售序列这季度的人员排名怎么样？有没有需要关注的？" },
      { id: "writer-6", question: "我想了解一下公司的考勤制度。" },
    ],
  },
};

/**
 * AI CEO 首页默认配置。
 */
export const AI_CEO_DEFAULT_HOME_CONFIG: AiCeoAgentHomeConfig =
  AI_CEO_AGENT_HOME_CONFIGS["employee-writer"];
