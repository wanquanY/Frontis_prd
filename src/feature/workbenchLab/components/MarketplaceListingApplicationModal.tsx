import { Empty, Input, Modal } from "antd";

import type {
  MarketplaceListingApplicationForm,
  StoreAgentItem,
} from "./ExpertPlazaView";
import styles from "./ExpertPlazaView.module.less";

interface MarketplaceListingApplicationModalProps {
  open: boolean;
  agent: StoreAgentItem | null;
  agentAvatarSrc: string;
  form: MarketplaceListingApplicationForm;
  sceneTags: string[];
  usageGuide: string;
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
  agentAvatarSrc,
  form,
  sceneTags,
  usageGuide,
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
        {agent.commodityApplication?.status === "rejected" ? (
          <div className={styles.listingApplicationAlert}>
            驳回原因：{agent.commodityApplication.rejectReason}
          </div>
        ) : null}

        <section className={styles.listingApplicationSnapshot}>
          <h3 className={styles.listingApplicationSectionTitle}>基础信息</h3>
          <div className={styles.listingApplicationHero}>
            <div className={styles.listingApplicationAvatar}>
              <img alt={agent.name} src={agentAvatarSrc} />
            </div>
            <div className={styles.listingApplicationHeroText}>
              <strong>{agent.name}</strong>
            </div>
          </div>
          <div className={styles.listingApplicationMetaGrid}>
            <div>
              <span>名称</span>
              <strong>{agent.name}</strong>
            </div>
            <div>
              <span>版本号</span>
              <strong>{agent.versionLabel}</strong>
            </div>
          </div>
          <div className={styles.listingApplicationInfoBlock}>
            <span>描述</span>
            <p>{agent.summary}</p>
          </div>
          <div className={styles.listingApplicationInfoBlock}>
            <span>使用指南</span>
            <p>{usageGuide || "暂未填写使用指南。"}</p>
          </div>
          <div className={styles.listingApplicationInfoBlock}>
            <span>场景标签（1-5个）</span>
            {sceneTags.length ? (
              <div className={styles.listingApplicationTagRow}>
                {sceneTags.map(tag => (
                  <span key={tag}>{tag}</span>
                ))}
              </div>
            ) : (
              <p>暂未填写场景标签，需先补齐后再申请上架。</p>
            )}
          </div>
        </section>

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
