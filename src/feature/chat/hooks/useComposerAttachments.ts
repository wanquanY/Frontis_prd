import { useCallback, useState, type ChangeEvent } from "react";
import { message } from "antd";
import { createAttachment, getStorageSTS } from "@/apis/FileApi";
import { uploadToTencentCloud } from "@/utils/tencentUpload";
import type { WorkspaceComposerAttachmentItem } from "@/feature/workspace/types";

interface UseComposerAttachmentsOptions {
  /** 是否禁用上传（如流式中） */
  disabled?: boolean;
  /** 附件数量上限 */
  attachmentLimit?: number;
}

/**
 * 管理聊天输入区的附件选择与上传流程，输出可直接绑定到输入控件的状态与事件。
 */
export const useComposerAttachments = (
  options?: UseComposerAttachmentsOptions,
): {
  composerAttachments: WorkspaceComposerAttachmentItem[];
  handleRemoveComposerAttachment: (uid: string) => void;
  handleComposerAttachmentsSelected: (fileList?: FileList | File[] | null) => void;
  handleFileInputChange: (event: ChangeEvent<HTMLInputElement>) => void;
  resetComposerAttachments: () => void;
} => {
  const { disabled = false, attachmentLimit = 10 } = options ?? {};
  const [composerAttachments, setComposerAttachments] = useState<WorkspaceComposerAttachmentItem[]>(
    [],
  );

  const createComposerAttachmentUid = useCallback((): string => {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }, []);

  const updateComposerAttachment = useCallback(
    (uid: string, patch: Partial<WorkspaceComposerAttachmentItem>): void => {
      setComposerAttachments(prev =>
        prev.map(item => (item.uid === uid ? { ...item, ...patch } : item)),
      );
    },
    [],
  );

  const handleRemoveComposerAttachment = useCallback((uid: string): void => {
    setComposerAttachments(prev => prev.filter(item => item.uid !== uid));
  }, []);

  const uploadComposerAttachment = useCallback(
    async (file: File, uid: string): Promise<void> => {
      try {
        const sts = await getStorageSTS();
        const uploadResult = await uploadToTencentCloud(
          file,
          sts,
          percent => {
            updateComposerAttachment(uid, { percent });
          },
          "attachments",
        );
        // COS 上传完成即可用于图片缩略图（即便后续创建附件记录失败，也便于用户识别）。
        updateComposerAttachment(uid, { url: uploadResult.location });

        const attachment = await createAttachment({
          name: file.name,
          storage_path: uploadResult.location,
          size: file.size,
          mime_type: file.type || "application/octet-stream",
        });

        updateComposerAttachment(uid, {
          status: "done",
          percent: 100,
          id: attachment.id,
          url: attachment.url || uploadResult.location,
          error: undefined,
        });
      } catch (error) {
        const msg = error instanceof Error ? error.message : "上传失败";
        updateComposerAttachment(uid, { status: "error", error: msg, percent: 0 });
        message.error(`文件【${file.name}】上传失败`);
      }
    },
    [updateComposerAttachment],
  );

  const handleComposerAttachmentsSelected = useCallback(
    (fileList?: FileList | File[] | null): void => {
      if (disabled) return;
      const files = Array.from(fileList ?? []);
      if (!files.length) return;

      const existKeySet = new Set(composerAttachments.map(item => `${item.name}-${item.size}`));
      let remaining = Math.max(0, attachmentLimit - composerAttachments.length);

      for (const file of files) {
        if (remaining <= 0) {
          message.info(`最多上传 ${attachmentLimit} 个附件`);
          break;
        }

        const key = `${file.name}-${file.size}`;
        if (existKeySet.has(key)) {
          message.info(`文件【${file.name}】已添加，无需重复选择`);
          continue;
        }
        existKeySet.add(key);

        remaining -= 1;
        const uid = createComposerAttachmentUid();
        setComposerAttachments(prev => [
          ...prev,
          {
            uid,
            name: file.name,
            size: file.size,
            mimeType: file.type || "application/octet-stream",
            percent: 0,
            status: "uploading",
          },
        ]);

        void uploadComposerAttachment(file, uid);
      }
    },
    [
      attachmentLimit,
      composerAttachments,
      createComposerAttachmentUid,
      disabled,
      uploadComposerAttachment,
    ],
  );

  const handleFileInputChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => {
      handleComposerAttachmentsSelected(event.currentTarget.files);
      // 清空 value，保证重复选择同一文件也能触发 change
      event.currentTarget.value = "";
    },
    [handleComposerAttachmentsSelected],
  );

  const resetComposerAttachments = useCallback((): void => {
    setComposerAttachments([]);
  }, []);

  return {
    composerAttachments,
    handleRemoveComposerAttachment,
    handleComposerAttachmentsSelected,
    handleFileInputChange,
    resetComposerAttachments,
  };
};
