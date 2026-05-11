import { Button, Input, Modal, Select } from "antd";
import type { MeOnboardingProfileValues } from "@/feature/workspace/types";

import styles from "./MeOnboardingProfileModal.module.less";

interface MeOnboardingProfileModalProps {
  open: boolean;
  value: MeOnboardingProfileValues;
  onChange: (nextValue: MeOnboardingProfileValues) => void;
  onSubmit: () => void;
  onSkip: () => void;
}

const INDUSTRY_OPTIONS = [
  { label: "电商零售", value: "电商零售" },
  { label: "企业服务", value: "企业服务" },
  { label: "教育培训", value: "教育培训" },
  { label: "制造业", value: "制造业" },
  { label: "金融服务", value: "金融服务" },
  { label: "餐饮本地生活", value: "餐饮本地生活" },
  { label: "其他", value: "其他" },
];

const ROLE_OPTIONS = [
  { label: "创始人 / 负责人", value: "创始人 / 负责人" },
  { label: "管理者", value: "管理者" },
  { label: "市场", value: "市场" },
  { label: "销售", value: "销售" },
  { label: "运营", value: "运营" },
  { label: "产品", value: "产品" },
  { label: "其他", value: "其他" },
];

/**
 * 新用户首次进入 ME 时的轻量资料补充弹窗。
 */
export const MeOnboardingProfileModal = ({
  open,
  value,
  onChange,
  onSubmit,
  onSkip,
}: MeOnboardingProfileModalProps): JSX.Element => {
  const handleFieldChange = (field: keyof MeOnboardingProfileValues, nextValue?: string): void => {
    onChange({
      ...value,
      [field]: nextValue ?? "",
    });
  };

  return (
    <Modal
      centered
      width={560}
      open={open}
      footer={null}
      className={styles.modal}
      onCancel={onSkip}
      destroyOnHidden
    >
      <section className={styles.panel} aria-label="ME 初始化资料">
        <header className={styles.header}>
          <span className={styles.eyebrow}>ME 初始化</span>
          <h2 className={styles.title}>让 ME 先认识你</h2>
          <p className={styles.description}>
            这些信息会帮助 ME 更快理解你的业务背景，后续也可以在对话里继续补充。
          </p>
        </header>

        <div className={styles.formGrid}>
          <div className={styles.field}>
            <label className={styles.fieldLabel} htmlFor="me-onboarding-profile-nickname">
              用户称呼
            </label>
            <Input
              id="me-onboarding-profile-nickname"
              className={styles.input}
              value={value.nickname}
              placeholder="例如：一新"
              onChange={event => handleFieldChange("nickname", event.currentTarget.value)}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.fieldLabel} htmlFor="me-onboarding-profile-company">
              公司名称
            </label>
            <Input
              id="me-onboarding-profile-company"
              className={styles.input}
              value={value.companyName}
              placeholder="例如：一新智能"
              onChange={event => handleFieldChange("companyName", event.currentTarget.value)}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.fieldLabel} htmlFor="me-onboarding-profile-industry">
              所属行业
            </label>
            <Select
              id="me-onboarding-profile-industry"
              className={styles.input}
              value={value.industry || undefined}
              placeholder="请选择行业"
              options={INDUSTRY_OPTIONS}
              allowClear
              onChange={nextValue => handleFieldChange("industry", nextValue)}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.fieldLabel} htmlFor="me-onboarding-profile-role">
              你的角色
            </label>
            <Select
              id="me-onboarding-profile-role"
              className={styles.input}
              value={value.role || undefined}
              placeholder="请选择你主要负责的方向"
              options={ROLE_OPTIONS}
              allowClear
              onChange={nextValue => handleFieldChange("role", nextValue)}
            />
          </div>

          <div className={`${styles.field} ${styles.fieldWide}`}>
            <label className={styles.fieldLabel} htmlFor="me-onboarding-profile-description">
              公司是做什么的
            </label>
            <Input.TextArea
              id="me-onboarding-profile-description"
              className={styles.textarea}
              value={value.companyDescription}
              placeholder="例如：为本地生活商家提供会员运营和私域增长服务"
              rows={3}
              showCount
              maxLength={120}
              onChange={event => handleFieldChange("companyDescription", event.currentTarget.value)}
            />
          </div>
        </div>

        <footer className={styles.footer}>
          <Button type="text" onClick={onSkip}>
            跳过
          </Button>
          <Button type="primary" onClick={onSubmit}>
            保存并开始使用
          </Button>
        </footer>
      </section>
    </Modal>
  );
};
