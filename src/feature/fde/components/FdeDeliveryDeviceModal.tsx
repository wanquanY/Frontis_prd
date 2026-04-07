import type { JSX } from "react";

import { Button, Input, InputNumber, Modal } from "antd";

import type { DeviceAllocationFormState } from "./fdeDeliveryWorkbenchUtils";
import styles from "./FdeDeliveryWorkbench.module.less";

interface FdeDeliveryDeviceModalProps {
  open: boolean;
  form: DeviceAllocationFormState;
  onClose: () => void;
  onSave: () => void;
  onChange: <TKey extends keyof DeviceAllocationFormState>(
    key: TKey,
    value: DeviceAllocationFormState[TKey],
  ) => void;
}

/**
 * FDE 交付设备额度配置弹窗。
 */
export const FdeDeliveryDeviceModal = ({
  open,
  form,
  onClose,
  onSave,
  onChange,
}: FdeDeliveryDeviceModalProps): JSX.Element => (
  <Modal
    title="配置设备额度"
    open={open}
    width={420}
    onCancel={onClose}
    footer={null}
    destroyOnClose
  >
    <div className={styles.drawerForm}>
      <div className={styles.drawerField}>
        <div className={styles.drawerLabel}>云端工作站额度</div>
        <InputNumber
          className={styles.fullWidthNumberInput}
          value={form.cloudWorkbenchQuota}
          min={0}
          placeholder="请输入云端工作站额度"
          onChange={value => onChange("cloudWorkbenchQuota", value)}
        />
      </div>
      <div className={styles.drawerField}>
        <div className={styles.drawerLabel}>本地工作站额度</div>
        <InputNumber
          className={styles.fullWidthNumberInput}
          value={form.localWorkbenchQuota}
          min={0}
          placeholder="请输入本地工作站额度"
          onChange={value => onChange("localWorkbenchQuota", value)}
        />
      </div>
      <div className={styles.drawerField}>
        <div className={styles.drawerLabel}>本地客户端额度</div>
        <InputNumber
          className={styles.fullWidthNumberInput}
          value={form.localClientQuota}
          min={0}
          placeholder="请输入本地客户端额度"
          onChange={value => onChange("localClientQuota", value)}
        />
      </div>
      <div className={styles.drawerField}>
        <div className={styles.drawerLabel}>生效时间</div>
        <Input
          value={form.effectiveAt}
          placeholder="例如 2026-04-20 10:00"
          onChange={event => onChange("effectiveAt", event.target.value)}
        />
      </div>
      <div className={styles.drawerActions}>
        <Button onClick={onClose}>取消</Button>
        <Button type="primary" onClick={onSave}>
          保存设备额度
        </Button>
      </div>
    </div>
  </Modal>
);
