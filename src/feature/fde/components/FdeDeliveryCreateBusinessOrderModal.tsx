import type { JSX } from "react";

import { DeleteOutlined } from "@ant-design/icons";
import { Button, Input, InputNumber, Modal, Select } from "antd";

import type {
  FdeOrderDeviceLineItem,
  FdeOrderDeviceType,
  FdeOrderTokensLineItem,
} from "@/feature/fde/types";

import {
  BUSINESS_DEVICE_TYPE_OPTIONS,
  type CreateBusinessOrderFormState,
  formatAmount,
  formatTokenCount,
  isAgentGroupOrderLineItem,
  isAgentOrderLineItem,
  isDeviceOrderLineItem,
} from "./fdeDeliveryWorkbenchUtils";
import styles from "./FdeDeliveryWorkbench.module.less";

interface FdeDeliveryCreateBusinessOrderModalProps {
  open: boolean;
  tenantName?: string;
  form: CreateBusinessOrderFormState;
  totalAmount: number;
  onClose: () => void;
  onSubmit: () => void;
  onUpdateRemark: (value: string) => void;
  onAddDeviceLine: () => void;
  onOpenExpertGroupModal: () => void;
  onOpenAgentModal: () => void;
  onAddTokensLine: () => void;
  onRemoveLineItem: (lineItemId: string) => void;
  onUpdateDeviceLine: <TKey extends keyof FdeOrderDeviceLineItem>(
    lineItemId: string,
    key: TKey,
    value: FdeOrderDeviceLineItem[TKey],
  ) => void;
  onUpdateAgentLinePrice: (lineItemId: string, value: number | null) => void;
  onUpdateAgentLineValidity: (lineItemId: string, value: number | null) => void;
  onUpdateAgentGroupLinePrice: (lineItemId: string, value: number | null) => void;
  onUpdateAgentGroupLineValidity: (lineItemId: string, value: number | null) => void;
  onUpdateTokensLine: <TKey extends keyof FdeOrderTokensLineItem>(
    lineItemId: string,
    key: TKey,
    value: FdeOrderTokensLineItem[TKey],
  ) => void;
}

/**
 * FDE 配置交付详情中的订单创建弹窗。
 */
export const FdeDeliveryCreateBusinessOrderModal = ({
  open,
  tenantName,
  form,
  totalAmount,
  onClose,
  onSubmit,
  onUpdateRemark,
  onAddDeviceLine,
  onOpenExpertGroupModal,
  onOpenAgentModal,
  onAddTokensLine,
  onRemoveLineItem,
  onUpdateDeviceLine,
  onUpdateAgentLinePrice,
  onUpdateAgentLineValidity,
  onUpdateAgentGroupLinePrice,
  onUpdateAgentGroupLineValidity,
  onUpdateTokensLine,
}: FdeDeliveryCreateBusinessOrderModalProps): JSX.Element => (
  <Modal
    title="新建订单"
    open={open}
    width={820}
    rootClassName={styles.createTenantModal}
    onCancel={onClose}
    footer={null}
    destroyOnClose
  >
    <div className={styles.createTenantBody}>
      <div className={styles.drawerForm}>
        <div className={styles.infoRows}>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>租户名称</span>
            <span className={styles.infoValue}>{tenantName ?? "-"}</span>
          </div>
        </div>
        <div className={styles.drawerField}>
          <div className={styles.drawerLabel}>订单备注</div>
          <Input.TextArea
            value={form.remark}
            rows={3}
            placeholder="补充订单说明、交付背景或客户要求"
            onChange={event => onUpdateRemark(event.target.value)}
          />
        </div>
        <div className={styles.drawerField}>
          <div className={styles.sectionHeader}>
            <div className={styles.drawerLabel}>商品明细</div>
            <div className={styles.inlineActions}>
              <Button onClick={onAddDeviceLine}>添加设备</Button>
              <Button onClick={onOpenExpertGroupModal}>添加 AI 专家团</Button>
              <Button onClick={onOpenAgentModal}>直接添加单个 AI 专家</Button>
              <Button onClick={onAddTokensLine}>添加 tokens</Button>
            </div>
          </div>
        </div>
        {form.lineItems.length ? (
          <div className={styles.lineItemList}>
            {form.lineItems.map(item => {
              if (isDeviceOrderLineItem(item)) {
                return (
                  <div key={item.id} className={styles.lineItemCard}>
                    <div className={styles.lineItemHeader}>
                      <div className={styles.lineItemTitle}>{item.deviceType}</div>
                      <Button
                        type="text"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => onRemoveLineItem(item.id)}
                      />
                    </div>
                    <div className={styles.lineItemGrid}>
                      <div className={styles.formField}>
                        <div className={styles.fieldLabel}>设备类型</div>
                        <Select
                          className={styles.fullWidthControl}
                          value={item.deviceType}
                          options={BUSINESS_DEVICE_TYPE_OPTIONS}
                          onChange={value =>
                            onUpdateDeviceLine(
                              item.id,
                              "deviceType",
                              value as FdeOrderDeviceType,
                            )
                          }
                        />
                      </div>
                      <div className={styles.formField}>
                        <div className={styles.fieldLabel}>数量</div>
                        <InputNumber
                          className={styles.fullWidthControl}
                          min={1}
                          value={item.quantity}
                          onChange={value => onUpdateDeviceLine(item.id, "quantity", value ?? 0)}
                        />
                      </div>
                      <div className={styles.formField}>
                        <div className={styles.fieldLabel}>单价</div>
                        <InputNumber
                          className={styles.fullWidthControl}
                          min={0}
                          value={item.unitPrice}
                          formatter={value => `${value ?? ""}`}
                          onChange={value => onUpdateDeviceLine(item.id, "unitPrice", value ?? 0)}
                        />
                      </div>
                      <div className={styles.formField}>
                        <div className={styles.fieldLabel}>有效时长（月）</div>
                        <InputNumber
                          className={styles.fullWidthControl}
                          min={1}
                          value={item.validityMonths}
                          onChange={value =>
                            onUpdateDeviceLine(item.id, "validityMonths", value ?? 0)
                          }
                        />
                      </div>
                      <div className={styles.formField}>
                        <div className={styles.fieldLabel}>小计</div>
                        <div className={styles.amountValue}>{formatAmount(item.totalAmount)}</div>
                      </div>
                    </div>
                  </div>
                );
              }

              if (isAgentOrderLineItem(item)) {
                return (
                  <div key={item.id} className={styles.lineItemCard}>
                    <div className={styles.lineItemHeader}>
                      <div>
                        <div className={styles.lineItemTitle}>{item.agentName}</div>
                        <div className={styles.lineItemHint}>
                          {item.releaseVersion} · {item.sourceLabel}
                        </div>
                      </div>
                      <Button
                        type="text"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => onRemoveLineItem(item.id)}
                      />
                    </div>
                    <div className={styles.lineItemGrid}>
                      <div className={styles.formField}>
                        <div className={styles.fieldLabel}>商品单价</div>
                        <InputNumber
                          className={styles.fullWidthControl}
                          min={0}
                          value={item.unitPrice}
                          formatter={value => `${value ?? ""}`}
                          onChange={value => onUpdateAgentLinePrice(item.id, value)}
                        />
                      </div>
                      <div className={styles.formField}>
                        <div className={styles.fieldLabel}>数量</div>
                        <div className={styles.amountValue}>1</div>
                      </div>
                      <div className={styles.formField}>
                        <div className={styles.fieldLabel}>有效时长（月）</div>
                        <InputNumber
                          className={styles.fullWidthControl}
                          min={1}
                          value={item.validityMonths}
                          onChange={value => onUpdateAgentLineValidity(item.id, value)}
                        />
                      </div>
                      <div className={styles.formField}>
                        <div className={styles.fieldLabel}>小计</div>
                        <div className={styles.amountValue}>{formatAmount(item.totalAmount)}</div>
                      </div>
                    </div>
                  </div>
                );
              }

              if (isAgentGroupOrderLineItem(item)) {
                return (
                  <div key={item.id} className={styles.lineItemCard}>
                    <div className={styles.lineItemHeader}>
                      <div>
                        <div className={styles.lineItemTitle}>{item.groupName}</div>
                        <div className={styles.lineItemHint}>
                          {item.sourceLabel} · {item.agents.length} 个 AI 专家
                        </div>
                      </div>
                      <Button
                        type="text"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => onRemoveLineItem(item.id)}
                      />
                    </div>
                    <div className={styles.lineItemGrid}>
                      <div className={styles.formField}>
                        <div className={styles.fieldLabel}>商品单价</div>
                        <InputNumber
                          className={styles.fullWidthControl}
                          min={0}
                          value={item.unitPrice}
                          formatter={value => `${value ?? ""}`}
                          onChange={value => onUpdateAgentGroupLinePrice(item.id, value)}
                        />
                      </div>
                      <div className={styles.formField}>
                        <div className={styles.fieldLabel}>数量</div>
                        <div className={styles.amountValue}>1</div>
                      </div>
                      <div className={styles.formField}>
                        <div className={styles.fieldLabel}>有效时长（月）</div>
                        <InputNumber
                          className={styles.fullWidthControl}
                          min={1}
                          value={item.validityMonths}
                          onChange={value => onUpdateAgentGroupLineValidity(item.id, value)}
                        />
                      </div>
                      <div className={styles.formField}>
                        <div className={styles.fieldLabel}>小计</div>
                        <div className={styles.amountValue}>{formatAmount(item.totalAmount)}</div>
                      </div>
                    </div>
                    <div className={styles.lineItemHint}>
                      包含：{item.agents.map(agent => agent.name).join("、")}
                    </div>
                  </div>
                );
              }

              return (
                <div key={item.id} className={styles.lineItemCard}>
                  <div className={styles.lineItemHeader}>
                    <div>
                      <div className={styles.lineItemTitle}>tokens 资源包</div>
                      <div className={styles.lineItemHint}>独立记录数量与金额</div>
                    </div>
                    <Button
                      type="text"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => onRemoveLineItem(item.id)}
                    />
                  </div>
                  <div className={styles.lineItemGrid}>
                    <div className={styles.formField}>
                      <div className={styles.fieldLabel}>tokens 数量</div>
                      <InputNumber
                        className={styles.fullWidthControl}
                        min={0}
                        value={item.tokenCount}
                        onChange={value => onUpdateTokensLine(item.id, "tokenCount", value ?? 0)}
                      />
                    </div>
                    <div className={styles.formField}>
                      <div className={styles.fieldLabel}>金额</div>
                      <InputNumber
                        className={styles.fullWidthControl}
                        min={0}
                        value={item.totalAmount}
                        formatter={value => `${value ?? ""}`}
                        onChange={value => onUpdateTokensLine(item.id, "totalAmount", value ?? 0)}
                      />
                    </div>
                    <div className={styles.formField}>
                      <div className={styles.fieldLabel}>数量展示</div>
                      <div className={styles.amountValue}>{formatTokenCount(item.tokenCount)}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className={styles.emptyHint}>先添加设备、AI 专家团、AI 专家或 tokens 商品。</div>
        )}
        <div className={styles.summaryBar}>
          <div className={styles.summaryLabel}>订单总金额</div>
          <div className={styles.summaryValue}>{formatAmount(totalAmount)}</div>
        </div>
        <div className={styles.drawerActions}>
          <Button onClick={onClose}>取消</Button>
          <Button type="primary" onClick={onSubmit}>
            创建订单
          </Button>
        </div>
      </div>
    </div>
  </Modal>
);
