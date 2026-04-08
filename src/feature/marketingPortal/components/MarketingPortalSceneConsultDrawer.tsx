import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { createPortal } from "react-dom";

import classNames from "classnames";
import { ArrowRightOutlined, CloseOutlined } from "@ant-design/icons";
import { message } from "antd";

import type {
  MarketingSceneCatalogItem,
  MarketingSceneConsultFormState,
} from "@/feature/marketingPortal/types";
import { isValidMarketingPhone } from "@/feature/marketingPortal/utils";

import layoutStyles from "./MarketingPortalLayout.module.less";
import styles from "./MarketingPortalSceneConsultDrawer.module.less";

interface MarketingPortalSceneConsultDrawerProps {
  open: boolean;
  sceneItem: MarketingSceneCatalogItem | null;
  onClose: () => void;
}

const createInitialMarketingSceneConsultFormState = (
  agentNames: string[],
): MarketingSceneConsultFormState => ({
  name: "",
  company: "",
  phone: "",
  interestedAgents: agentNames,
  requirementDescription: "",
});

/**
 * AI 专家团咨询抽屉。
 */
export const MarketingPortalSceneConsultDrawer = ({
  open,
  sceneItem,
  onClose,
}: MarketingPortalSceneConsultDrawerProps): JSX.Element | null => {
  const selectedAgentNames = useMemo(
    () => sceneItem?.agents.map(item => item.name) ?? [],
    [sceneItem],
  );
  const [formState, setFormState] = useState<MarketingSceneConsultFormState>(
    createInitialMarketingSceneConsultFormState(selectedAgentNames),
  );

  useEffect(() => {
    if (!open) {
      return;
    }

    setFormState(createInitialMarketingSceneConsultFormState(selectedAgentNames));
  }, [open, selectedAgentNames]);

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

      if (
        !formState.name.trim() ||
        !formState.company.trim() ||
        !formState.phone.trim() ||
        !formState.requirementDescription.trim()
      ) {
        message.warning("请补全姓名、公司名、手机号和需求描述后再提交。");
        return;
      }

      if (!isValidMarketingPhone(formState.phone)) {
        message.warning("请输入正确的 11 位手机号。");
        return;
      }

      if (!formState.interestedAgents.length) {
        message.warning("请至少选择一个感兴趣的 AI 专家。");
        return;
      }

      message.success("需求已提交，FDE 顾问将在 24 小时内与您联系。");
      onClose();
    },
    [formState, onClose],
  );

  if (!open || !sceneItem) {
    return null;
  }

  return createPortal(
    <div className={styles.overlay}>
      <button
        className={styles.backdrop}
        type="button"
        onClick={onClose}
        aria-label="关闭咨询抽屉"
      />
      <aside className={styles.panel} aria-modal="true" role="dialog">
        <button className={styles.closeButton} type="button" onClick={onClose} aria-label="关闭">
          <CloseOutlined />
        </button>

        <div className={styles.header}>
          <p className={styles.eyebrow}>立即咨询</p>
          <h2 className={styles.title}>填写需求，FDE 顾问 24 小时内联系</h2>
          <p className={styles.description}>
            当前场景：{sceneItem.scene.title}。一个业务场景往往由多位 AI
            专家协同交付，这里直接勾选你最想先聊的专家。
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
              {sceneItem.agents.map(item => (
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
            <span className={styles.fieldLabel}>需求描述</span>
            <textarea
              className={styles.textarea}
              value={formState.requirementDescription}
              onChange={event =>
                handleFieldChange("requirementDescription", event.target.value)
              }
              placeholder="比如你最想先跑通哪个场景、当前最想优先验证哪组 AI 专家"
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
