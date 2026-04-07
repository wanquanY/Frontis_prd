import { useCallback, useEffect, useRef, useState } from "react";

import classNames from "classnames";

import type { MessageAttachment } from "@/types/block";
import { formatFileSize, getFileExtension } from "@/utils/file";
import { resolveFileLogo } from "@/utils/fileLogo";

import styles from "./BlockItem.module.less";
import turnLeftIcon from "@/assets/images/turn-left.png";
import turnRightIcon from "@/assets/images/turn-right.png";

/**
 * 用户消息附件横向列表。
 */
export interface AttachmentRowProps {
  attachments: MessageAttachment[];
}

/**
 * 渲染用户消息里的附件横向滚动条带。
 */
export const AttachmentRow = ({ attachments }: AttachmentRowProps) => {
  const listRef = useRef<HTMLDivElement | null>(null);
  const [scrollState, setScrollState] = useState({ canLeft: false, canRight: false });

  const normalized = attachments.slice(0, 10).map(att => {
    const url = att.url || att.thumb_url || "";
    const name = att.name || url || "附件";
    const mime = att.mime_type || "";
    const ext = getFileExtension(name).toUpperCase();
    const isImage =
      mime.startsWith("image/") ||
      /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(url) ||
      /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(name);

    return { ...att, url, name, mime, ext, isImage };
  });

  const updateScrollState = useCallback(() => {
    const element = listRef.current;
    if (!element) {
      return;
    }

    const { scrollLeft, scrollWidth, clientWidth } = element;
    const maxScroll = scrollWidth - clientWidth;

    setScrollState({
      canLeft: scrollLeft > 0,
      canRight: scrollLeft < maxScroll - 1,
    });
  }, []);

  useEffect(() => {
    updateScrollState();
  }, [updateScrollState, normalized.length]);

  useEffect(() => {
    const element = listRef.current;
    if (!element) {
      return;
    }

    const handleScroll = () => updateScrollState();
    element.addEventListener("scroll", handleScroll);

    return () => element.removeEventListener("scroll", handleScroll);
  }, [updateScrollState]);

  return (
    <div className={styles.userAttachmentListWrapper}>
      {scrollState.canLeft ? (
        <img
          src={turnLeftIcon}
          alt="向左滑动附件"
          className={classNames(styles.userAttachmentScrollBtn, styles.userAttachmentScrollLeft)}
          onClick={() => {
            const element = listRef.current;
            if (!element) {
              return;
            }

            element.scrollTo({ left: 0, behavior: "smooth" });
          }}
        />
      ) : null}

      <div
        className={classNames(styles.userAttachmentList, {
          [styles.userAttachmentMaskLeft]: scrollState.canLeft,
          [styles.userAttachmentMaskRight]: scrollState.canRight,
        })}
        ref={listRef}
        role="list"
        aria-label="用户附件"
      >
        {normalized.map(att =>
          att.isImage ? (
            <div
              key={att.id}
              className={styles.userAttachmentThumb}
              role="listitem"
              title={att.name}
            >
              {att.url ? (
                <img className={styles.userAttachmentThumbImage} src={att.url} alt={att.name} />
              ) : (
                <span className={styles.userAttachmentThumbPlaceholder} aria-hidden="true">
                  <span className={styles.userAttachmentThumbExt}>{att.ext || "IMG"}</span>
                </span>
              )}
            </div>
          ) : (
            <div
              key={att.id}
              className={styles.userAttachmentItem}
              role="listitem"
              title={att.name}
            >
              <span className={styles.userAttachmentIcon} aria-hidden="true">
                <img
                  className={styles.userAttachmentIconImage}
                  src={resolveFileLogo(att.name).src}
                  alt={resolveFileLogo(att.name).alt}
                />
              </span>
              <span className={styles.userAttachmentInfo}>
                <span className={styles.userAttachmentName}>{att.name}</span>
                {typeof att.size === "number" ? (
                  <span className={styles.userAttachmentMeta}>{formatFileSize(att.size)}</span>
                ) : null}
              </span>
            </div>
          ),
        )}
      </div>

      {scrollState.canRight ? (
        <img
          src={turnRightIcon}
          alt="向右滑动附件"
          className={classNames(styles.userAttachmentScrollBtn, styles.userAttachmentScrollRight)}
          onClick={() => {
            const element = listRef.current;
            if (!element) {
              return;
            }

            element.scrollTo({ left: element.scrollWidth, behavior: "smooth" });
          }}
        />
      ) : null}
    </div>
  );
};
