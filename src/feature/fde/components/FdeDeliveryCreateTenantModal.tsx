import type { JSX } from "react";

import { Button, DatePicker, Input, InputNumber, Modal } from "antd";

import type { CreateOrderFormState } from "./fdeDeliveryWorkbenchUtils";
import styles from "./FdeDeliveryWorkbench.module.less";

interface FdeDeliveryCreateTenantModalProps {
  open: boolean;
  form: CreateOrderFormState;
  onClose: () => void;
  onSubmit: () => void;
  onChange: <TKey extends keyof CreateOrderFormState>(
    key: TKey,
    value: CreateOrderFormState[TKey],
  ) => void;
}

/**
 * FDE 配置交付中的租户创建弹窗。
 */
export const FdeDeliveryCreateTenantModal = ({
  open,
  form,
  onClose,
  onSubmit,
  onChange,
}: FdeDeliveryCreateTenantModalProps): JSX.Element => (
  <Modal
    title="创建租户"
    open={open}
    width={460}
    rootClassName={styles.createTenantModal}
    onCancel={onClose}
    footer={null}
    destroyOnClose
  >
    <div className={styles.createTenantBody}>
      <div className={styles.drawerForm}>
        <div className={styles.drawerField}>
          <div className={styles.drawerLabel}>租户名称</div>
          <Input
            value={form.customerName}
            placeholder="请输入租户名称"
            onChange={event => onChange("customerName", event.target.value)}
          />
        </div>
        <div className={styles.drawerField}>
          <div className={styles.drawerLabel}>租户编码</div>
          <Input
            value={form.tenantCode}
            placeholder="请输入租户编码（可选）"
            onChange={event => onChange("tenantCode", event.target.value)}
          />
        </div>
        <div className={styles.drawerField}>
          <div className={styles.drawerLabel}>租户席位</div>
          <InputNumber
            className={styles.fullWidthNumberInput}
            value={form.tenantSeatCount}
            min={0}
            placeholder="请输入租户席位数量"
            onChange={value => onChange("tenantSeatCount", value)}
          />
        </div>
        {/* <div className={styles.drawerField}>
          <div className={styles.drawerLabel}>交付时间</div>
          <DatePicker
            showTime
            format="YYYY-MM-DD HH:mm"
            className={styles.fullWidthDatePicker}
            value={form.launchTargetDate}
            placeholder="请选择交付时间"
            onChange={value => onChange("launchTargetDate", value)}
          />
        </div> */}
        <div className={styles.drawerField}>
          <div className={styles.drawerLabel}>交付备注</div>
          <Input.TextArea
            value={form.deliveryNote}
            rows={4}
            placeholder="补充交付要求"
            onChange={event => onChange("deliveryNote", event.target.value)}
          />
        </div>
        <div className={styles.drawerActions}>
          <Button onClick={onClose}>取消</Button>
          <Button type="primary" onClick={onSubmit}>
            创建租户并进入配置详情
          </Button>
        </div>
      </div>
    </div>
  </Modal>
);
