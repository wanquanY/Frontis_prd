import { Empty, Input, Modal } from "antd";

import type {
  MarketplaceListingApplicationForm,
  StoreAgentItem,
} from "./ExpertPlazaView";
import styles from "./ExpertPlazaView.module.less";

interface MarketplaceListingApplicationModalProps {
  open: boolean;
  agent: StoreAgentItem | null;
  form: MarketplaceListingApplicationForm;
  onCancel: () => void;
  onChange: (field: keyof MarketplaceListingApplicationForm, value: string) => void;
  onSubmit: () => void;
}

const APPLICATION_FIELD_IDS = {
  submitReason: "marketplace-listing-submit-reason",
} as const;

export const MarketplaceListingApplicationModal = ({
  open,
  agent,
  form,
  onCancel,
  onChange,
  onSubmit,
}: MarketplaceListingApplicationModalProps): JSX.Element => (
  <Modal
    open={open}
    title={
      agent?.commodityApplication?.status === "approved" &&
      agent.commodityApplication.version !== agent.versionLabel
        ? `申请上架新版本「${agent.name}」`
        : agent
          ? `申请上架「${agent.name}」`
          : "申请上架"
    }
    width={720}
    okText={
      agent?.commodityApplication?.status === "approved" &&
      agent.commodityApplication.version !== agent.versionLabel
        ? "提交版本更新申请"
        : agent?.commodityApplication?.status === "rejected"
          ? "重新提交"
          : "提交申请"
    }
    cancelText="取消"
    destroyOnHidden
    onOk={onSubmit}
    onCancel={onCancel}
  >
    {agent ? (
      <div className={styles.listingApplicationBody}>
        <div className={styles.listingApplicationForm}>
          <label
            className={styles.listingApplicationField}
            htmlFor={APPLICATION_FIELD_IDS.submitReason}
          >
            <span>上架理由</span>
            <Input.TextArea
              id={APPLICATION_FIELD_IDS.submitReason}
              value={form.submitReason}
              rows={4}
              maxLength={200}
              showCount
              placeholder="说明为什么申请上架到专家广场"
              onChange={event => onChange("submitReason", event.target.value)}
            />
          </label>
        </div>
      </div>
    ) : (
      <Empty description="未找到可申请上架的 AI 专家。" />
    )}
  </Modal>
);
