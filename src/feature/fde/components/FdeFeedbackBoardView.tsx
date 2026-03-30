import { useMemo, useState } from "react";

import classNames from "classnames";
import { Button, Empty, message } from "antd";

import type { FdeFeedbackAgentItem } from "@/feature/fde/types";

import styles from "./FdeFeedbackBoardView.module.less";

interface FdeFeedbackBoardViewProps {
  items: FdeFeedbackAgentItem[];
  selectedAgentId: string;
  setSelectedAgentId: (agentId: string) => void;
  triggerEvolution: (agentId: string) => void;
}

/**
 * 数据回流看板视图。
 */
export const FdeFeedbackBoardView = ({
  items,
  selectedAgentId,
  setSelectedAgentId,
  triggerEvolution,
}: FdeFeedbackBoardViewProps): JSX.Element => {
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

  const customers = useMemo(() => {
    const customerMap = new Map<string, { id: string; name: string; agentCount: number }>();
    items.forEach(item => {
      if (!customerMap.has(item.customerId)) {
        customerMap.set(item.customerId, {
          id: item.customerId,
          name: item.customerName,
          agentCount: 0,
        });
      }
      const customer = customerMap.get(item.customerId)!;
      customer.agentCount += 1;
    });
    return Array.from(customerMap.values());
  }, [items]);

  const filteredAgents = useMemo(() => {
    if (!selectedCustomerId) return [];
    return items.filter(item => item.customerId === selectedCustomerId);
  }, [items, selectedCustomerId]);

  const selectedAgent = useMemo(
    () => items.find(item => item.id === selectedAgentId) ?? null,
    [items, selectedAgentId],
  );

  if (!items.length) {
    return <Empty description="当前视角下暂无回流数据" />;
  }

  return (
    <div className={styles.feedbackLayout}>
      <aside className={styles.customerList}>
        <div className={styles.sectionTitle}>客户列表</div>
        <div className={styles.customerListBody}>
          {customers.map(customer => (
            <button
              key={customer.id}
              type="button"
              className={classNames(
                styles.customerCard,
                selectedCustomerId === customer.id && styles.customerCardActive,
              )}
              onClick={() => {
                setSelectedCustomerId(customer.id);
                const firstAgent = items.find(item => item.customerId === customer.id);
                if (firstAgent) {
                  setSelectedAgentId(firstAgent.id);
                }
              }}
            >
              <div className={styles.customerName}>{customer.name}</div>
              <div className={styles.customerMeta}>{customer.agentCount} 个 Agent</div>
            </button>
          ))}
        </div>
      </aside>

      <aside className={styles.agentList}>
        <div className={styles.sectionTitle}>Agent 列表</div>
        <div className={styles.agentListBody}>
          {filteredAgents.length > 0 ? (
            filteredAgents.map(agent => (
              <button
                key={agent.id}
                type="button"
                className={classNames(
                  styles.agentCard,
                  selectedAgent?.id === agent.id && styles.agentCardActive,
                )}
                onClick={() => setSelectedAgentId(agent.id)}
              >
                <div className={styles.agentName}>{agent.agentName}</div>
                <div className={styles.agentMeta}>版本 {agent.currentVersion}</div>
                <div className={styles.agentMeta}>进化评分 {agent.evolutionScore}</div>
              </button>
            ))
          ) : (
            <Empty description="请先选择客户" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          )}
        </div>
      </aside>

      <article className={styles.detailPanel}>
        {selectedAgent ? (
          <>
            <div className={styles.detailHeader}>
              <div>
                <div className={styles.detailEyebrow}>数据回流看板</div>
                <h2 className={styles.detailTitle}>{selectedAgent.agentName}</h2>
                <p className={styles.detailDescription}>
                  {selectedAgent.customerName} · 当前版本 {selectedAgent.currentVersion}
                </p>
              </div>
              <Button
                type="primary"
                onClick={() => {
                  triggerEvolution(selectedAgent.id);
                  message.success("已触发进化任务");
                }}
              >
                手动触发进化
              </Button>
            </div>

            <section className={styles.card}>
              <div className={styles.cardTitle}>技能列表</div>
              <div className={styles.skillGrid}>
                {selectedAgent.skills.map((skill, idx) => (
                  <div key={idx} className={styles.skillItem}>
                    <div className={styles.skillName}>{skill.name}</div>
                    <div className={styles.skillVersion}>版本 {skill.version}</div>
                  </div>
                ))}
              </div>
            </section>

            <section className={styles.card}>
              <div className={styles.cardTitle}>回流数据情况（最近 7 天）</div>
              <div className={styles.feedbackTable}>
                <div className={styles.tableHeader}>
                  <div className={styles.tableCell}>日期</div>
                  <div className={styles.tableCell}>触发次数</div>
                  <div className={styles.tableCell}>成功次数</div>
                  <div className={styles.tableCell}>失败次数</div>
                  <div className={styles.tableCell}>平均响应时间</div>
                </div>
                {selectedAgent.feedbackData.map((data, idx) => (
                  <div key={idx} className={styles.tableRow}>
                    <div className={styles.tableCell}>{data.date}</div>
                    <div className={styles.tableCell}>{data.triggerCount}</div>
                    <div className={styles.tableCell}>{data.successCount}</div>
                    <div className={styles.tableCell}>{data.failCount}</div>
                    <div className={styles.tableCell}>{data.avgResponseTime}s</div>
                  </div>
                ))}
              </div>
            </section>
          </>
        ) : (
          <Empty description="请选择 Agent" />
        )}
      </article>
    </div>
  );
};
