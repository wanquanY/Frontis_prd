import type { JSX } from "react";

import { Button, Input, Modal } from "antd";

import type { ExpertGroupFormState } from "./fdeDeliveryWorkbenchUtils";
import styles from "./FdeDeliveryWorkbench.module.less";

interface FdeDeliveryExpertGroupModalProps {
  open: boolean;
  form: ExpertGroupFormState;
  onClose: () => void;
  onNext: () => void;
  onChange: <TKey extends keyof ExpertGroupFormState>(
    key: TKey,
    value: ExpertGroupFormState[TKey],
  ) => void;
}

/**
 * FDE 交付专家团创建弹窗。
 */
export const FdeDeliveryExpertGroupModal = ({
  open,
  form,
  onClose,
  onNext,
  onChange,
}: FdeDeliveryExpertGroupModalProps): JSX.Element => (
  <Modal
    title="创建 AI 专家团"
    open={open}
    width={520}
    onCancel={onClose}
    footer={null}
    destroyOnClose
  >
    <div className={styles.drawerForm}>
      <div className={styles.drawerField}>
        <div className={styles.drawerLabel}>专家团名称</div>
        <Input
          value={form.name}
          placeholder="请输入专家团名称"
          onChange={event => onChange("name", event.target.value)}
        />
      </div>
      <div className={styles.drawerField}>
        <div className={styles.drawerLabel}>专家团介绍</div>
        <Input.TextArea
          value={form.description}
          rows={4}
          placeholder="请输入专家团介绍"
          onChange={event => onChange("description", event.target.value)}
        />
      </div>
      <div className={styles.drawerActions}>
        <Button onClick={onClose}>取消</Button>
        <Button type="primary" onClick={onNext}>
          下一步选择 AI 专家
        </Button>
      </div>
    </div>
  </Modal>
);
