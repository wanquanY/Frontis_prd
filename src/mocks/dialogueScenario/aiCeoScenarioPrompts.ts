/**
 * AI CEO 各 Agent 场景化模拟的首个触发问题。
 */
export const PRODUCT_MANAGER_PRD_QUESTION =
  "基于 Frontis AI 当前原型，帮我先生成一版《Frontis AI · 正式 PRD》草案。";

export const PRODUCT_MANAGER_BACKLOG_QUESTION =
  "继续把这版需求拆成《Frontis AI · Product Backlog》，按 Epic / Feature / User Story 输出。";

export const AI_CEO_AGENT_SCENARIO_QUESTIONS: Record<string, string> = {
  "employee-pm": "给我看一下各序列的整体情况，按平均分排序，并标出预警最高的两个序列。",
  "employee-designer": "生产部的王建国最近怎么样？请把评分、证据、ERP 指标和风险一起给我。",
  "employee-research": "帮我查一下张伟最近有没有触碰红线，把证据、严重程度和处理建议一起列出来。",
  "employee-ops": "生产序列最近有哪些表现突出的标杆？挑 3 个最值得表扬的人给我看。",
  "employee-sales": "销售序列这季度的人员排名怎么样？把关注区、排名变化和底线预警一起给我。",
  "employee-product-manager": PRODUCT_MANAGER_PRD_QUESTION,
  "employee-ecom-ops": "把这批坚果礼盒货盘做一轮全网比价，看看定价和毛利率有没有问题。",
  "employee-live-ops": "把惠普星Book Pro 16 2026 这款产品整理成一版直播讲品脚本，按 8 大模块输出。",
  "employee-xiaocanmama-ip":
    "我拿到一批童装库存，打算下周一开团。按小蚕妈妈 IP 风格，写一篇童装清仓开团种草文。",
  "employee-writer":
    "先给我看一下各序列的整体情况，再重点分析生产部王建国和最近的红线风险，最后给我下一步管理建议。",
};
