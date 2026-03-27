import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { createPortal } from "react-dom";

import classNames from "classnames";
import { ArrowRightOutlined, CloseOutlined } from "@ant-design/icons";
import { message } from "antd";

import { PORTAL_AGENTS } from "@/feature/marketingPortal/portalData";
import type { MarketingSceneConsultFormState } from "@/feature/marketingPortal/types";
import { isValidMarketingPhone } from "@/feature/marketingPortal/utils";

import layoutStyles from "./MarketingPortalLayout.module.less";
import styles from "./MarketingPortalConsultationDrawer.module.less";

interface MarketingPortalConsultationDrawerProps {
  open: boolean;
  initialAgentNames: string[];
  onClose: () => void;
}

const createInitialConsultationFormState = (
  interestedAgents: string[],
): MarketingSceneConsultFormState => ({
  name: "",
  company: "",
  phone: "",
  interestedAgents,
  remark: "",
});

/**
 * 营销门户 FDE 免费咨询抽屉。
 */
export const MarketingPortalConsultationDrawer = ({
  open,
  initialAgentNames,
  onClose,
}: MarketingPortalConsultationDrawerProps): JSX.Element | null => {
  const normalizedAgentNames = useMemo(
    () => Array.from(new Set(initialAgentNames)).filter(Boolean),
    [initialAgentNames],
  );
  const [formState, setFormState] = useState<MarketingSceneConsultFormState>(
    createInitialConsultationFormState(normalizedAgentNames),
  );

  useEffect(() => {
    if (!open) {
      return;
    }

    setFormState(createInitialConsultationFormState(normalizedAgentNames));
  }, [open, normalizedAgentNames]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  const handleFieldChange = useCallback(
    <TField extends keyof MarketingSceneConsultFormState>(
      field: TField,
      value: MarketingSceneConsultFormState[TField],
    ): void => {
      setFormState(previous => ({
        ...previous,
        [field]: value,
      }));
    },
    [],
  );

  const handleAgentToggle = useCallback((agentName: string): void => {
    setFormState(previous => {
      const nextInterestedAgents = previous.interestedAgents.includes(agentName)
        ? previous.interestedAgents.filter(item => item !== agentName)
        : [...previous.interestedAgents, agentName];

      return {
        ...previous,
        interestedAgents: nextInterestedAgents,
      };
    });
  }, []);

  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>): void => {
      event.preventDefault();

      if (!formState.name.trim() || !formState.company.trim() || !formState.phone.trim()) {
        message.warning("请补全姓名、公司名和手机号后再提交。");
        return;
      }

      if (!isValidMarketingPhone(formState.phone)) {
        message.warning("请输入正确的 11 位手机号。");
        return;
      }

      message.success("需求已提交，FDE 顾问将在 24 小时内与您联系。");
      onClose();
    },
    [formState, onClose],
  );

  if (!open) {
    return null;
  }

  return createPortal(
    <div className={styles.overlay}>
      <button
        className={styles.backdrop}
        type="button"
        onClick={onClose}
        aria-label="关闭免费咨询抽屉"
      />

      <aside className={styles.panel} aria-modal="true" role="dialog">
        <button className={styles.closeButton} type="button" onClick={onClose} aria-label="关闭">
          <CloseOutlined />
        </button>

        <div className={styles.header}>
          <p className={styles.eyebrow}>FDE 免费咨询</p>
          <h2 className={styles.title}>填写需求，FDE 顾问 24 小时内联系</h2>
          <p className={styles.description}>
            先告诉我们你的业务场景、最想先跑通的环节，以及你感兴趣的 AI
            专家，我们会按企业现状给出更贴近落地的咨询建议。
          </p>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>姓名</span>
            <input
              className={styles.input}
              value={formState.name}
              onChange={event => handleFieldChange("name", event.target.value)}
              placeholder="您的姓名"
            />
          </label>

          <label className={styles.field}>
            <span className={styles.fieldLabel}>公司名</span>
            <input
              className={styles.input}
              value={formState.company}
              onChange={event => handleFieldChange("company", event.target.value)}
              placeholder="公司名称"
            />
          </label>

          <label className={styles.field}>
            <span className={styles.fieldLabel}>手机号</span>
            <input
              className={styles.input}
              inputMode="numeric"
              value={formState.phone}
              onChange={event => handleFieldChange("phone", event.target.value)}
              placeholder="手机号"
            />
          </label>

          <div className={styles.field}>
            <span className={styles.fieldLabel}>感兴趣的 AI 专家</span>
            <div className={styles.optionGrid}>
              {PORTAL_AGENTS.map(item => (
                <button
                  key={item.id}
                  type="button"
                  className={classNames(
                    styles.optionButton,
                    formState.interestedAgents.includes(item.name) && styles.isActiveOptionButton,
                  )}
                  onClick={() => handleAgentToggle(item.name)}
                >
                  {item.name}
                </button>
              ))}
            </div>
          </div>

          <label className={styles.field}>
            <span className={styles.fieldLabel}>备注</span>
            <textarea
              className={styles.textarea}
              value={formState.remark}
              onChange={event => handleFieldChange("remark", event.target.value)}
              placeholder="例如你最想先跑通哪个场景、预计什么时候开始试点"
            />
          </label>

          <button
            className={classNames(layoutStyles.primaryButton, styles.submitButton)}
            type="submit"
          >
            提交需求
            <ArrowRightOutlined />
          </button>
        </form>
      </aside>
    </div>,
    document.body,
  );
};
