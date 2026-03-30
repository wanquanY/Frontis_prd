import { useMemo, useState } from "react";

import classNames from "classnames";
import { Empty, Progress, Button, Input, Select, Modal, message } from "antd";

import { FDE_DELIVERY_STEPS } from "@/feature/fde/mockData";
import type { FdeDeliveryOrderItem, FdeDeliveryStepKey, FdeTeamMemberItem } from "@/feature/fde/types";
import { getFdeDeliveryStepIndex, getFdeMemberName } from "@/feature/fde/utils";

import styles from "./FdeDeliveryWorkbench.module.less";

interface FdeDeliveryWorkbenchProps {
  items: FdeDeliveryOrderItem[];
  members: FdeTeamMemberItem[];
  selectedOrderId: string;
  setSelectedOrderId: (orderId: string) => void;
}

/**
 * 配置交付视图。
 */
export const FdeDeliveryWorkbench = ({
  items,
  members,
  selectedOrderId,
  setSelectedOrderId,
}: FdeDeliveryWorkbenchProps): JSX.Element => {
  const selectedOrder = useMemo(
    () => items.find(item => item.id === selectedOrderId) ?? items[0] ?? null,
    [items, selectedOrderId],
  );

  const [activeStep, setActiveStep] = useState<FdeDeliveryStepKey>("customerConfirm");
  const [isCloudDeviceModalOpen, setIsCloudDeviceModalOpen] = useState(false);
  const [isLocalDeviceModalOpen, setIsLocalDeviceModalOpen] = useState(false);
  const [isAgentMarketModalOpen, setIsAgentMarketModalOpen] = useState(false);
  const [selectedDeviceForAgent, setSelectedDeviceForAgent] = useState<string | null>(null);
  const [cloudDeviceConfig, setCloudDeviceConfig] = useState({ spec: "8C 16G", region: "北京机房" });
  const [localDeviceName, setLocalDeviceName] = useState("");
  const [localDeviceLocation, setLocalDeviceLocation] = useState("");
  const [devices, setDevices] = useState<any[]>([]);
  const [memberInitDone, setMemberInitDone] = useState(false);
  const [apiTestDone, setApiTestDone] = useState(false);
  const [agentTestDone, setAgentTestDone] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState("");
  const [tenantForm, setTenantForm] = useState({
    industry: "",
    customerName: "",
    experts: "",
    amount: "",
    contactName: "",
    contactPhone: "",
  });

  const canAccessStep = (stepKey: FdeDeliveryStepKey): boolean => {
    if (!selectedOrder) return false;
    const stepIndex = getFdeDeliveryStepIndex(stepKey);
    const completedSteps = selectedOrder.completedSteps;

    if (completedSteps.includes(stepKey)) return true;

    if (stepIndex === 0) return true;

    const previousStep = FDE_DELIVERY_STEPS[stepIndex - 1];
    return completedSteps.includes(previousStep.key);
  };

  const handleStepClick = (stepKey: FdeDeliveryStepKey): void => {
    if (canAccessStep(stepKey)) {
      setActiveStep(stepKey);
    }
  };

  const handleNextStep = (): void => {
    const currentIndex = getFdeDeliveryStepIndex(activeStep);
    if (currentIndex < FDE_DELIVERY_STEPS.length - 1) {
      const nextStep = FDE_DELIVERY_STEPS[currentIndex + 1];
      setActiveStep(nextStep.key);
    }
  };

  const handlePrevStep = (): void => {
    const currentIndex = getFdeDeliveryStepIndex(activeStep);
    if (currentIndex > 0) {
      const prevStep = FDE_DELIVERY_STEPS[currentIndex - 1];
      setActiveStep(prevStep.key);
    }
  };

  if (!items.length) {
    return <Empty description="当前视角下暂无配置交付工单" />;
  }

  return (
    <div className={styles.workbench}>
      <aside className={styles.orderList}>
        <div className={styles.sectionTitle}>配置交付订单</div>
        <div className={styles.orderListBody}>
          {items.map(item => (
            <button
              key={item.id}
              type="button"
              className={classNames(
                styles.orderItem,
                item.id === selectedOrder?.id && styles.orderItemActive,
              )}
              onClick={() => setSelectedOrderId(item.id)}
            >
              <div className={styles.orderItemHeader}>
                <strong>{item.customerName}</strong>
                <div className={styles.orderMeta}>
                  <span className={styles.orderProgress}>{item.stepProgress}%</span>
                  <span className={classNames(
                    styles.orderStatus,
                    item.deliveryStatus === "已交付" && styles.orderStatusDelivered
                  )}>
                    {item.deliveryStatus}
                  </span>
                </div>
              </div>
              <div className={styles.orderItemMeta}>{item.orderNo}</div>
              <div className={styles.orderItemMeta}>{item.scenarioName}</div>
              <Progress
                percent={item.stepProgress}
                showInfo={false}
                strokeColor="var(--fdeAccent)"
              />
            </button>
          ))}
        </div>
      </aside>

      <article className={styles.detailPanel}>
        {selectedOrder ? (
          <>
            <div className={styles.detailHeader}>
              <div>
                <div className={styles.detailEyebrow}>配置交付</div>
                <h2 className={styles.detailTitle}>{selectedOrder.customerName}</h2>
                <p className={styles.detailDescription}>
                  {selectedOrder.scenarioName} · 当前FDE：
                  {getFdeMemberName(members, selectedOrder.assignedToId)}
                </p>
              </div>
              <div className={styles.detailMeta}>
                <span>{selectedOrder.orderNo}</span>
                <span>目标上线：{selectedOrder.launchTargetDate}</span>
              </div>
            </div>

            <div className={styles.orderSummary}>
              <div className={styles.summaryTitle}>配置交付说明</div>
              <div className={styles.summaryGrid}>
                <div className={styles.summaryItem}>
                  <span className={styles.summaryLabel}>订单金额</span>
                  <span className={styles.summaryValue}>{selectedOrder.orderAmount}</span>
                </div>
                <div className={styles.summaryItem}>
                  <span className={styles.summaryLabel}>云端设备</span>
                  <span className={styles.summaryValue}>{selectedOrder.deviceConfig.cloudDeviceCount} 台</span>
                </div>
                <div className={styles.summaryItem}>
                  <span className={styles.summaryLabel}>本地设备</span>
                  <span className={styles.summaryValue}>{selectedOrder.deviceConfig.localDeviceCount} 台</span>
                </div>
                <div className={styles.summaryItem}>
                  <span className={styles.summaryLabel}>AI 专家团</span>
                  <span className={styles.summaryValue}>{selectedOrder.expertNames.length} 个</span>
                </div>
              </div>
              <div className={styles.summaryNote}>
                <div className={styles.summaryLabel}>其他说明</div>
                <p>{selectedOrder.deliveryNote}</p>
              </div>
            </div>

            <div className={styles.stepRail}>
              {FDE_DELIVERY_STEPS.map((step, index) => {
                const activeIndex = getFdeDeliveryStepIndex(selectedOrder.currentStep);
                const isCompleted = selectedOrder.completedSteps.includes(step.key);
                const isCurrent = step.key === activeStep;
                const isAccessible = canAccessStep(step.key);

                return (
                  <div key={step.key} className={styles.stepItem}>
                    <button
                      type="button"
                      className={classNames(
                        styles.stepBadge,
                        isCompleted && styles.stepBadgeDone,
                        isCurrent && styles.stepBadgeCurrent,
                        !isAccessible && styles.stepBadgeDisabled,
                      )}
                      onClick={() => handleStepClick(step.key)}
                      disabled={!isAccessible}
                    >
                      {index + 1}
                    </button>
                    <div className={styles.stepLabel}>{step.label}</div>
                  </div>
                );
              })}
            </div>

            {activeStep === "customerConfirm" && (
              <div className={styles.stepContent}>
                <section className={styles.card}>
                  <div className={styles.cardTitle}>客户租户创建</div>
                  <div className={styles.configForm}>
                    <div className={styles.formItem}>
                      <label>行业</label>
                      <Input
                        placeholder="请输入行业"
                        value={tenantForm.industry}
                        onChange={e => setTenantForm({ ...tenantForm, industry: e.target.value })}
                      />
                    </div>
                    <div className={styles.formItem}>
                      <label>客户名称</label>
                      <Input
                        placeholder="请输入客户名称"
                        value={tenantForm.customerName}
                        onChange={e => setTenantForm({ ...tenantForm, customerName: e.target.value })}
                      />
                    </div>
                    <div className={styles.formItem}>
                      <label>AI 专家团</label>
                      <Input
                        placeholder="请输入AI专家团"
                        value={tenantForm.experts}
                        onChange={e => setTenantForm({ ...tenantForm, experts: e.target.value })}
                      />
                    </div>
                    <div className={styles.formItem}>
                      <label>订单金额</label>
                      <Input
                        placeholder="请输入订单金额"
                        value={tenantForm.amount}
                        onChange={e => setTenantForm({ ...tenantForm, amount: e.target.value })}
                      />
                    </div>
                    <div className={styles.formItem}>
                      <label>联系人</label>
                      <Input
                        placeholder="请输入联系人"
                        value={tenantForm.contactName}
                        onChange={e => setTenantForm({ ...tenantForm, contactName: e.target.value })}
                      />
                    </div>
                    <div className={styles.formItem}>
                      <label>联系电话</label>
                      <Input
                        placeholder="请输入联系电话"
                        value={tenantForm.contactPhone}
                        onChange={e => setTenantForm({ ...tenantForm, contactPhone: e.target.value })}
                      />
                    </div>
                  </div>
                </section>
                <div className={styles.stepActions}>
                  <Button
                    type="primary"
                    onClick={() => {
                      message.loading("正在创建租户...", 1.5).then(() => {
                        message.success("租户已创建");
                        handleNextStep();
                      });
                    }}
                  >
                    创建
                  </Button>
                </div>
              </div>
            )}

            {activeStep === "deviceConfig" && (
              <div className={styles.stepContent}>
                <section className={styles.card}>
                  <div className={styles.cardTitle}>设备配置</div>
                  <div className={styles.deviceActions}>
                    <Button type="primary" onClick={() => setIsCloudDeviceModalOpen(true)}>
                      添加云端设备
                    </Button>
                    <Button onClick={() => setIsLocalDeviceModalOpen(true)}>添加本地设备</Button>
                  </div>
                  <div className={styles.deviceList}>
                    {devices.map((device, idx) => (
                      <div key={idx} className={styles.deviceItem}>
                        <div className={styles.deviceIcon}>
                          {device.type === "cloud" ? "☁️" : "💻"}
                        </div>
                        <div className={styles.deviceInfo}>
                          <div className={styles.deviceName}>{device.name}</div>
                          <div className={styles.deviceMeta}>{device.meta}</div>
                          {device.activationCode && (
                            <div className={styles.activationCode}>
                              激活码: {device.activationCode}
                              <Button size="small" type="link">
                                复制
                              </Button>
                            </div>
                          )}
                        </div>
                        <div className={styles.deviceStatus}>
                          <span
                            className={classNames(
                              styles.statusBadge,
                              device.status === "active" && styles.statusBadgeActive,
                            )}
                          >
                            {device.status === "active" ? "已激活" : "待激活"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
                <div className={styles.stepActions}>
                  <Button onClick={handlePrevStep}>上一步</Button>
                  <Button type="primary" onClick={handleNextStep}>
                    下一步
                  </Button>
                </div>
              </div>
            )}

            {activeStep === "agentConfig" && (
              <div className={styles.stepContent}>
                <div className={styles.agentConfigLayout}>
                  <section className={styles.card}>
                    <div className={styles.cardTitle}>设备列表</div>
                    <div className={styles.deviceListCompact}>
                      {devices.map((device, idx) => (
                        <button
                          key={idx}
                          type="button"
                          className={classNames(
                            styles.deviceItemCompact,
                            selectedDeviceForAgent === device.id && styles.deviceItemCompactActive,
                          )}
                          onClick={() => setSelectedDeviceForAgent(device.id)}
                        >
                          <span>{device.type === "cloud" ? "☁️" : "💻"}</span>
                          <span>{device.name}</span>
                        </button>
                      ))}
                    </div>
                  </section>

                  <section className={styles.card}>
                    <div className={styles.cardTitleRow}>
                      <div className={styles.cardTitle}>Agent 配置</div>
                      <Button
                        type="primary"
                        size="small"
                        onClick={() => setIsAgentMarketModalOpen(true)}
                        disabled={!selectedDeviceForAgent}
                      >
                        添加 Agent
                      </Button>
                    </div>
                    <div className={styles.agentList}>
                      {selectedDeviceForAgent ? (
                        devices
                          .find(d => d.id === selectedDeviceForAgent)
                          ?.agents?.map((agent: any, idx: number) => (
                            <div key={idx} className={styles.agentItem}>
                              <div className={styles.agentName}>{agent}</div>
                              <div className={styles.agentActions}>
                                <Button size="small">重新下发</Button>
                                <Button size="small" danger>
                                  下线
                                </Button>
                              </div>
                            </div>
                          )) || <Empty description="暂无 Agent" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                      ) : (
                        <Empty description="请先选择设备" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                      )}
                    </div>
                  </section>
                </div>
                <div className={styles.stepActions}>
                  <Button onClick={handlePrevStep}>上一步</Button>
                  <Button type="primary" onClick={handleNextStep}>
                    下一步
                  </Button>
                </div>
              </div>
            )}

            {activeStep === "apiTest" && (
              <div className={styles.stepContent}>
                <section className={styles.card}>
                  <div className={styles.cardTitle}>初始化测试</div>
                  <div className={styles.testList}>
                    <div className={styles.testItem}>
                      <div className={styles.testInfo}>
                        <div className={styles.testName}>成员初始化</div>
                        <div className={styles.testStatus}>
                          {memberInitDone ? "✓ 已完成" : "待完成"}
                        </div>
                      </div>
                      <div className={styles.testActions}>
                        <Button
                          size="small"
                          onClick={() => window.open("/web/admin", "_blank")}
                        >
                          去设置
                        </Button>
                        <Button
                          size="small"
                          type={memberInitDone ? "default" : "primary"}
                          onClick={() => setMemberInitDone(true)}
                        >
                          已完成
                        </Button>
                      </div>
                    </div>

                    <div className={styles.testItem}>
                      <div className={styles.testInfo}>
                        <div className={styles.testName}>API 测试</div>
                        <div className={styles.testStatus}>
                          {apiTestDone ? "✓ 已完成" : "待完成"}
                        </div>
                      </div>
                      <div className={styles.testActions}>
                        <Button
                          size="small"
                          onClick={() => window.open("/web/admin", "_blank")}
                        >
                          去设置
                        </Button>
                        <Button
                          size="small"
                          type={apiTestDone ? "default" : "primary"}
                          onClick={() => setApiTestDone(true)}
                        >
                          已完成
                        </Button>
                      </div>
                    </div>

                    <div className={styles.testItem}>
                      <div className={styles.testInfo}>
                        <div className={styles.testName}>Agent 测试</div>
                        <div className={styles.testStatus}>
                          {agentTestDone ? "✓ 已完成" : "待完成"}
                        </div>
                      </div>
                      <div className={styles.testActions}>
                        <Button
                          size="small"
                          onClick={() => window.open("/web/admin", "_blank")}
                        >
                          去设置
                        </Button>
                        <Button
                          size="small"
                          type={agentTestDone ? "default" : "primary"}
                          onClick={() => setAgentTestDone(true)}
                        >
                          已完成
                        </Button>
                      </div>
                    </div>
                  </div>
                </section>
                <div className={styles.stepActions}>
                  <Button onClick={handlePrevStep}>上一步</Button>
                  <Button type="primary" onClick={handleNextStep}>
                    下一步
                  </Button>
                </div>
              </div>
            )}

            {activeStep === "preflight" && (
              <div className={styles.stepContent}>
                <section className={styles.card}>
                  <div className={styles.cardTitle}>发货前检查</div>
                  <div className={styles.checkList}>
                    {selectedOrder.preflightChecks.map(item => (
                      <div key={item} className={styles.checkItem}>
                        <span className={styles.checkDot} />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                  <div className={styles.formItem} style={{ marginTop: "20px" }}>
                    <label>物流单号（有本地设备必填）</label>
                    <Input
                      placeholder="请输入物流单号"
                      value={trackingNumber}
                      onChange={e => setTrackingNumber(e.target.value)}
                    />
                  </div>
                </section>
                <div className={styles.stepActions}>
                  <Button onClick={handlePrevStep}>上一步</Button>
                  <Button
                    type="primary"
                    size="large"
                    onClick={() => {
                      const hasLocalDevice = devices.some(d => d.type === "local");
                      if (hasLocalDevice && !trackingNumber) {
                        message.warning("请填写物流单号");
                        return;
                      }
                      message.success("交付完成");
                    }}
                  >
                    完成并交付
                  </Button>
                </div>
              </div>
            )}
          </>
        ) : (
          <Empty description="请选择交付工单" />
        )}
      </article>

      <Modal
        title="添加云端设备"
        open={isCloudDeviceModalOpen}
        onCancel={() => setIsCloudDeviceModalOpen(false)}
        onOk={() => {
          message.loading("正在创建云端设备...", 1).then(() => {
            const newDevice = {
              id: `cloud-${Date.now()}`,
              type: "cloud",
              name: `云端设备 ${devices.filter(d => d.type === "cloud").length + 1}`,
              meta: `${cloudDeviceConfig.spec} · ${cloudDeviceConfig.region}`,
              status: "active",
              agents: [],
            };
            setDevices([...devices, newDevice]);
            message.success("云端设备创建成功");
            setIsCloudDeviceModalOpen(false);
          });
        }}
      >
        <div className={styles.configForm}>
          <div className={styles.formItem}>
            <label>设备配置</label>
            <Select
              style={{ width: "100%" }}
              value={cloudDeviceConfig.spec}
              onChange={value => setCloudDeviceConfig({ ...cloudDeviceConfig, spec: value })}
              options={[
                { label: "8C 16G", value: "8C 16G" },
                { label: "16C 32G", value: "16C 32G" },
                { label: "32C 64G", value: "32C 64G" },
              ]}
            />
          </div>
          <div className={styles.formItem}>
            <label>运行机房</label>
            <Select
              style={{ width: "100%" }}
              value={cloudDeviceConfig.region}
              onChange={value => setCloudDeviceConfig({ ...cloudDeviceConfig, region: value })}
              options={[
                { label: "北京机房", value: "北京机房" },
                { label: "上海机房", value: "上海机房" },
              ]}
            />
          </div>
        </div>
      </Modal>

      <Modal
        title="添加本地设备"
        open={isLocalDeviceModalOpen}
        onCancel={() => setIsLocalDeviceModalOpen(false)}
        onOk={() => {
          message.loading("正在创建本地设备...", 1).then(() => {
            const activationCode = `CW-${Math.random().toString(36).substring(2, 15).toUpperCase()}`;
            const newDevice = {
              id: `local-${Date.now()}`,
              type: "local",
              name: localDeviceName || `本地设备 ${devices.filter(d => d.type === "local").length + 1}`,
              meta: localDeviceLocation || "待部署",
              status: "pending",
              activationCode,
              agents: [],
            };
            setDevices([...devices, newDevice]);
            message.success("本地设备添加成功，请使用激活码激活设备");
            setIsLocalDeviceModalOpen(false);
            setLocalDeviceName("");
            setLocalDeviceLocation("");
          });
        }}
      >
        <div className={styles.configForm}>
          <div className={styles.formItem}>
            <label>设备名称</label>
            <Input
              placeholder="如：hw-sz-001"
              value={localDeviceName}
              onChange={e => setLocalDeviceName(e.target.value)}
            />
          </div>
          <div className={styles.formItem}>
            <label>部署位置</label>
            <Input
              placeholder="如：深圳数据中心"
              value={localDeviceLocation}
              onChange={e => setLocalDeviceLocation(e.target.value)}
            />
          </div>
        </div>
      </Modal>

      <Modal
        title="Agent 市场"
        open={isAgentMarketModalOpen}
        onCancel={() => setIsAgentMarketModalOpen(false)}
        onOk={() => {
          const agentOptions = ["AI CEO 教练", "经营收入师", "对账核验师", "招聘助手", "内容生产官"];
          const selectedAgent = agentOptions[Math.floor(Math.random() * agentOptions.length)];
          setDevices(
            devices.map(d =>
              d.id === selectedDeviceForAgent
                ? { ...d, agents: [...(d.agents || []), selectedAgent] }
                : d,
            ),
          );
          message.success(`已添加 ${selectedAgent}`);
          setIsAgentMarketModalOpen(false);
        }}
      >
        <div className={styles.agentMarket}>
          <div className={styles.agentMarketItem}>AI CEO 教练</div>
          <div className={styles.agentMarketItem}>经营收入师</div>
          <div className={styles.agentMarketItem}>对账核验师</div>
          <div className={styles.agentMarketItem}>招聘助手</div>
          <div className={styles.agentMarketItem}>内容生产官</div>
        </div>
      </Modal>
    </div>
  );
};
