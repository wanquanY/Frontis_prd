import { InboxOutlined } from "@ant-design/icons";
import { App as AntdApp, Form, Input, Modal } from "antd";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent } from "react";

import type { SkillVersionModalProps } from "@/feature/skill/types";
import { formatFileSize, isSkillPackageFile, SKILL_PACKAGE_ACCEPT_ATTR } from "@/utils/file";

import styles from "./SkillVersionModal.module.less";

interface SkillVersionFormValues {
  version: string;
}

const SKILL_VERSION_PATTERN =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;

const resolveNextVersion = (currentVersion: string | null): string => {
  if (!currentVersion) {
    return "1.0.0";
  }

  const matched = currentVersion.match(SKILL_VERSION_PATTERN);
  if (!matched) {
    return currentVersion;
  }

  const major = Number(matched[1]);
  const minor = Number(matched[2]);
  const patch = Number(matched[3]) + 1;
  return `${major}.${minor}.${patch}`;
};

/**
 * SkillVersionModal
 *
 * 为自己上传的 Skill 导入新版本，并在提交前完成版本号与压缩包校验。
 */
export const SkillVersionModal = ({
  open,
  skill,
  submitting,
  onCancel,
  onSubmit,
}: SkillVersionModalProps): JSX.Element => {
  const { message } = AntdApp.useApp();
  const [form] = Form.useForm<SkillVersionFormValues>();
  const packageInputRef = useRef<HTMLInputElement | null>(null);
  const [packageFile, setPackageFile] = useState<File | null>(null);

  const defaultVersion = useMemo(() => resolveNextVersion(skill?.latest_version ?? null), [skill]);

  useEffect(() => {
    if (!open) {
      form.resetFields();
      setPackageFile(null);
      return;
    }

    form.setFieldsValue({
      version: defaultVersion,
    });
  }, [defaultVersion, form, open]);

  const handlePackageSelect = (event: ChangeEvent<HTMLInputElement>): void => {
    const nextFile = event.target.files?.[0] ?? null;
    event.target.value = "";
    if (!nextFile) {
      return;
    }

    if (!isSkillPackageFile(nextFile)) {
      message.error("当前仅支持上传 .zip 或 .skill 技能包");
      return;
    }

    setPackageFile(nextFile);
  };

  const handleSubmit = async (): Promise<void> => {
    if (!skill) {
      return;
    }

    const values = await form.validateFields();
    if (!packageFile) {
      message.error("请先选择 Skill 包文件");
      return;
    }

    await onSubmit({
      skillId: skill.skill_id,
      version: values.version.trim(),
      packageFile,
    });
  };

  return (
    <Modal
      open={open}
      centered
      destroyOnHidden
      forceRender
      width={560}
      title="更新 Skill"
      okText="提交新版本"
      cancelText="取消"
      confirmLoading={submitting}
      onCancel={onCancel}
      onOk={() => void handleSubmit()}
    >
      <div className={styles.modalBody}>
        <Form<SkillVersionFormValues> form={form} layout="vertical" requiredMark>
          <div className={styles.currentVersion}>当前版本：{skill?.latest_version || "未发布"}</div>

          <Form.Item
            label="新版本号"
            name="version"
            rules={[
              { required: true, whitespace: true, message: "请输入版本号" },
              {
                pattern: SKILL_VERSION_PATTERN,
                message: "版本号需符合 semver，例如 1.0.0",
              },
            ]}
          >
            <Input maxLength={64} placeholder="1.0.1" />
          </Form.Item>

          <div
            role="button"
            tabIndex={0}
            className={styles.packageCard}
            onClick={() => packageInputRef.current?.click()}
            onKeyDown={event => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                packageInputRef.current?.click();
              }
            }}
          >
            <input
              ref={packageInputRef}
              hidden
              accept={SKILL_PACKAGE_ACCEPT_ATTR}
              type="file"
              onChange={handlePackageSelect}
            />
            <div className={styles.packageIcon}>
              <InboxOutlined />
            </div>
            <div className={styles.packagePrimary}>
              {packageFile ? packageFile.name : "点击上传新版本 Skill 包"}
            </div>
            <div className={styles.packageSecondary}>
              {packageFile
                ? formatFileSize(packageFile.size)
                : "支持 .zip/.skill 压缩包，替换为新的可发布版本"}
            </div>
          </div>
        </Form>
      </div>
    </Modal>
  );
};
