import { useMemo, useState } from "react";
import {
  CalendarOutlined,
  CloseOutlined,
  FileTextOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import { DatePicker } from "antd";
import dayjs, { type Dayjs } from "dayjs";
import classNames from "classnames";

import type { Block } from "@/types/block";

import type { ChatMessage, DialogueSessionItem } from "../types";
import styles from "./DialogueHistoryPanel.module.less";

interface DialogueDailySummarySource {
  anchorBlockId: string;
  message: ChatMessage;
  occurredAt: Dayjs;
  preview: string;
  sessionId: string;
}

interface DialogueDailySummaryDraft {
  date: Dayjs;
  files: Set<string>;
  messages: DialogueDailySummarySource[];
  taskTitles: Set<string>;
}

interface DialogueDailySummaryItem {
  anchorBlockId: string;
  date: Dayjs;
  fileNames: string[];
  highlights: string[];
  id: string;
  interactionCount: number;
  searchableText: string;
  sessionId: string;
  summary: string;
  title: string;
}

interface DialogueHistoryPanelProps {
  sessions: DialogueSessionItem[];
  onClose: () => void;
  onLocateMessage: (sessionId: string, anchorBlockId: string) => void;
}

const SUMMARY_TEXT_LIMIT = 86;
const SUMMARY_HIGHLIGHT_LIMIT = 82;

const normalizeSearchValue = (value: string): string => value.trim().toLowerCase();

const normalizePreviewText = (value: string): string => value.replace(/\s+/g, " ").trim();

const truncateText = (value: string, maxLength: number): string => {
  const normalizedValue = normalizePreviewText(value);

  if (normalizedValue.length <= maxLength) {
    return normalizedValue;
  }

  return `${normalizedValue.slice(0, maxLength - 1)}...`;
};

const getStringField = (data: Record<string, unknown>, keys: string[]): string => {
  for (const key of keys) {
    const value = data[key];

    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return "";
};

const collectBlockTitles = (blocks: Block[] | undefined): string[] => {
  if (!blocks?.length) {
    return [];
  }

  return blocks.flatMap(block => {
    const ownTitle = getStringField(block.data, [
      "title",
      "display_name",
      "displayName",
      "task_title",
      "taskTitle",
      "purpose",
      "fileName",
      "file_name",
    ]);
    const childTitles = collectBlockTitles(block.children);

    return ownTitle ? [ownTitle, ...childTitles] : childTitles;
  });
};

const resolveMessagePreview = (message: ChatMessage): string => {
  const normalizedContent = normalizePreviewText(message.content);

  if (normalizedContent) {
    return normalizedContent;
  }

  if (message.attachments?.length) {
    return `附件：${message.attachments.map(item => item.name).join("、")}`;
  }

  if (message.blocks?.length) {
    const blockTitles = collectBlockTitles(message.blocks);

    return blockTitles.length ? blockTitles.slice(0, 3).join("、") : "过程与成果记录";
  }

  return "";
};

const resolveMessageAnchorBlockId = (message: ChatMessage): string => {
  const firstBlockId = message.blocks?.find(block => block.id)?.id.trim();

  return firstBlockId || message.id;
};

const resolveSessionBaseDate = (session: DialogueSessionItem, sessionIndex: number): Dayjs => {
  const updatedAt = session.updatedAt.trim();
  const parsedDate = dayjs(updatedAt);

  if (parsedDate.isValid() && /\d{4}[-/]\d{1,2}[-/]\d{1,2}/.test(updatedAt)) {
    return parsedDate;
  }

  if (updatedAt === "昨天") {
    return dayjs().subtract(1, "day");
  }

  const dayOffsetMatch = /^(\d+)天前$/.exec(updatedAt);
  if (dayOffsetMatch) {
    return dayjs().subtract(Number(dayOffsetMatch[1]), "day");
  }

  return dayjs().subtract(sessionIndex, "day");
};

const resolveMessageOccurredAt = (
  sessionBaseDate: Dayjs,
  message: ChatMessage,
  messageIndex: number,
): Dayjs => {
  const timeLabel = message.timeLabel.trim();

  if (timeLabel === "刚刚") {
    return dayjs();
  }

  const timeMatch = /^(\d{1,2}):(\d{2})$/.exec(timeLabel);
  if (timeMatch) {
    return sessionBaseDate
      .hour(Number(timeMatch[1]))
      .minute(Number(timeMatch[2]))
      .second(0)
      .millisecond(0);
  }

  const parsedDate = dayjs(timeLabel);
  if (parsedDate.isValid() && /\d{4}[-/]\d{1,2}[-/]\d{1,2}/.test(timeLabel)) {
    return parsedDate;
  }

  return sessionBaseDate.add(messageIndex, "minute");
};

const buildSummaryHighlights = (
  messages: DialogueDailySummarySource[],
  taskTitles: string[],
  fileNames: string[],
): string[] => {
  const requestText = messages.find(item => item.message.role === "user" && item.preview)?.preview;
  const conclusionText = [...messages]
    .reverse()
    .find(item => item.message.role === "assistant" && item.preview)?.preview;
  const highlights: string[] = [];

  if (requestText) {
    highlights.push(`主要需求：${truncateText(requestText, SUMMARY_HIGHLIGHT_LIMIT)}`);
  }

  if (taskTitles.length) {
    highlights.push(
      `推进事项：${truncateText(taskTitles.slice(0, 3).join("、"), SUMMARY_HIGHLIGHT_LIMIT)}`,
    );
  }

  if (conclusionText) {
    highlights.push(`阶段结论：${truncateText(conclusionText, SUMMARY_HIGHLIGHT_LIMIT)}`);
  }

  if (fileNames.length) {
    highlights.push(
      `沉淀成果：${truncateText(fileNames.slice(0, 4).join("、"), SUMMARY_HIGHLIGHT_LIMIT)}`,
    );
  }

  return highlights.length ? highlights.slice(0, 4) : ["当天完成需求沟通、方案推演与结果沉淀。"];
};

const buildDailySummaries = (sessions: DialogueSessionItem[]): DialogueDailySummaryItem[] => {
  const summaryDrafts = sessions.reduce<Map<string, DialogueDailySummaryDraft>>(
    (draftMap, session, sessionIndex) => {
      const sessionBaseDate = resolveSessionBaseDate(session, sessionIndex);

      session.messages.forEach((message, messageIndex) => {
        const occurredAt = resolveMessageOccurredAt(sessionBaseDate, message, messageIndex);
        const dateKey = occurredAt.format("YYYY-MM-DD");
        const existingDraft = draftMap.get(dateKey);
        const draft =
          existingDraft ??
          ({
            date: occurredAt.startOf("day"),
            files: new Set<string>(),
            messages: [],
            taskTitles: new Set<string>(),
          } satisfies DialogueDailySummaryDraft);
        const preview = resolveMessagePreview(message);

        message.attachments?.forEach(item => {
          if (item.name.trim()) {
            draft.files.add(item.name.trim());
          }
        });
        collectBlockTitles(message.blocks).forEach(title => draft.taskTitles.add(title));
        draft.messages.push({
          anchorBlockId: resolveMessageAnchorBlockId(message),
          message,
          occurredAt,
          preview,
          sessionId: session.id,
        });

        draftMap.set(dateKey, draft);
      });

      return draftMap;
    },
    new Map(),
  );

  return Array.from(summaryDrafts.entries())
    .map(([dateKey, draft]) => {
      const messages = draft.messages.sort(
        (left, right) => left.occurredAt.valueOf() - right.occurredAt.valueOf(),
      );
      const latestMessage = messages[messages.length - 1];
      const fileNames = Array.from(draft.files);
      const taskTitles = Array.from(draft.taskTitles);
      const highlights = buildSummaryHighlights(messages, taskTitles, fileNames);
      const mainTopic =
        messages.find(item => item.message.role === "user" && item.preview)?.preview ??
        taskTitles[0] ??
        messages.find(item => item.preview)?.preview ??
        "当天工作";
      const summary = `当天围绕“${truncateText(mainTopic, SUMMARY_TEXT_LIMIT)}”推进，共形成 ${messages.length} 条协作记录${
        fileNames.length ? `，沉淀 ${fileNames.length} 个成果文件` : ""
      }。`;
      const searchableText = normalizeSearchValue(
        [
          dateKey,
          draft.date.format("YYYY年M月D日"),
          draft.date.format("M月D日"),
          summary,
          ...highlights,
          ...fileNames,
          ...taskTitles,
        ].join(" "),
      );

      return {
        anchorBlockId: latestMessage?.anchorBlockId ?? "",
        date: draft.date,
        fileNames,
        highlights,
        id: dateKey,
        interactionCount: messages.length,
        searchableText,
        sessionId: latestMessage?.sessionId ?? "",
        summary,
        title: `${draft.date.format("M月D日")}工作记录`,
      };
    })
    .sort((left, right) => right.date.valueOf() - left.date.valueOf());
};

const isDateWithinRange = (
  date: Dayjs,
  startDate: Dayjs | null,
  endDate: Dayjs | null,
): boolean => {
  const currentDate = date.startOf("day");

  if (startDate && currentDate.isBefore(startDate.startOf("day"))) {
    return false;
  }

  if (endDate && currentDate.isAfter(endDate.startOf("day"))) {
    return false;
  }

  return true;
};

/**
 * ME 单会话历史弹窗，按天展示自动沉淀的工作记录。
 */
export const DialogueHistoryPanel = ({
  sessions,
  onClose,
  onLocateMessage,
}: DialogueHistoryPanelProps): JSX.Element => {
  const [searchValue, setSearchValue] = useState<string>("");
  const [startDate, setStartDate] = useState<Dayjs | null>(null);
  const [endDate, setEndDate] = useState<Dayjs | null>(null);
  const normalizedSearchValue = normalizeSearchValue(searchValue);
  const dailySummaries = useMemo(() => buildDailySummaries(sessions), [sessions]);
  const visibleSummaries = useMemo(
    () =>
      dailySummaries.filter(summary => {
        if (!isDateWithinRange(summary.date, startDate, endDate)) {
          return false;
        }

        return !normalizedSearchValue || summary.searchableText.includes(normalizedSearchValue);
      }),
    [dailySummaries, endDate, normalizedSearchValue, startDate],
  );
  const activeDateKey =
    startDate && endDate && startDate.isSame(endDate, "day") ? startDate.format("YYYY-MM-DD") : "";
  const dateRangeLabel =
    startDate || endDate
      ? `${startDate?.format("YYYY.MM.DD") ?? "不限"} - ${endDate?.format("YYYY.MM.DD") ?? "不限"}`
      : "全部时间";

  const handleSelectDate = (date: Dayjs | null): void => {
    setStartDate(date);
    setEndDate(date);
  };

  const handleClearDateRange = (): void => {
    setStartDate(null);
    setEndDate(null);
  };

  return (
    <section className={styles.panel} aria-label="工作记录">
      <header className={styles.header}>
        <div className={styles.titleGroup}>
          <h2 className={styles.title}>工作记录</h2>
        </div>
        <button
          type="button"
          className={styles.closeButton}
          aria-label="关闭工作记录"
          onClick={onClose}
        >
          <CloseOutlined />
        </button>
      </header>

      <label className={styles.searchBox}>
        <SearchOutlined className={styles.searchIcon} />
        <input
          value={searchValue}
          placeholder="搜索工作记录、成果或日期"
          onChange={event => setSearchValue(event.currentTarget.value)}
        />
      </label>

      <div className={styles.filterRow}>
        <div className={styles.dateRangeGroup} aria-label="按时间筛选工作记录">
          <DatePicker
            allowClear
            value={startDate}
            format="YYYY-MM-DD"
            placeholder="开始日期"
            suffixIcon={<CalendarOutlined />}
            className={styles.datePicker}
            disabledDate={current => Boolean(endDate && current.isAfter(endDate, "day"))}
            onChange={value => setStartDate(value)}
          />
          <span className={styles.dateRangeSeparator}>至</span>
          <DatePicker
            allowClear
            value={endDate}
            format="YYYY-MM-DD"
            placeholder="结束日期"
            suffixIcon={<CalendarOutlined />}
            className={styles.datePicker}
            disabledDate={current => Boolean(startDate && current.isBefore(startDate, "day"))}
            onChange={value => setEndDate(value)}
          />
          {startDate || endDate ? (
            <button type="button" className={styles.clearDateButton} onClick={handleClearDateRange}>
              清除
            </button>
          ) : null}
        </div>
      </div>

      <div className={styles.content}>
        <aside className={styles.dateRail} aria-label="记录日期">
          <button
            type="button"
            className={classNames(styles.dateRailItem, {
              [styles.dateRailItemActive]: !startDate && !endDate,
            })}
            onClick={() => handleSelectDate(null)}
          >
            <span>全部时间</span>
            <strong>{dailySummaries.length}</strong>
          </button>
          {dailySummaries.map(summary => (
            <button
              key={summary.id}
              type="button"
              className={classNames(styles.dateRailItem, {
                [styles.dateRailItemActive]: activeDateKey === summary.id,
              })}
              onClick={() => handleSelectDate(summary.date)}
            >
              <span>{summary.date.format("M月D日")}</span>
              <strong>1</strong>
            </button>
          ))}
        </aside>

        <div className={styles.summaryPane}>
          <div className={styles.summaryPaneMeta}>
            <span>
              {normalizedSearchValue
                ? `搜索结果 ${visibleSummaries.length} 条`
                : `共 ${visibleSummaries.length} 条工作记录`}
            </span>
            <span>{dateRangeLabel}</span>
          </div>
          {visibleSummaries.length ? (
            <div className={styles.summaryList}>
              {visibleSummaries.map(summary => (
                <button
                  key={summary.id}
                  type="button"
                  className={styles.summaryCard}
                  onClick={() => {
                    if (summary.sessionId && summary.anchorBlockId) {
                      onLocateMessage(summary.sessionId, summary.anchorBlockId);
                    }
                    onClose();
                  }}
                >
                  <span className={styles.summaryHeader}>
                    <span className={styles.summaryDate}>
                      {summary.date.format("YYYY年M月D日")}
                    </span>
                    <span className={styles.summaryCount}>
                      {summary.interactionCount} 条协作记录
                    </span>
                  </span>
                  <span className={styles.summaryTitle}>{summary.title}</span>
                  <span className={styles.summaryText}>{summary.summary}</span>
                  <span className={styles.highlightList}>
                    {summary.highlights.map(highlight => (
                      <span key={highlight} className={styles.highlightItem}>
                        {highlight}
                      </span>
                    ))}
                  </span>
                  {summary.fileNames.length ? (
                    <span className={styles.fileList}>
                      {summary.fileNames.slice(0, 4).map(fileName => (
                        <span key={fileName} className={styles.fileItem}>
                          <FileTextOutlined />
                          <span>{fileName}</span>
                        </span>
                      ))}
                    </span>
                  ) : null}
                </button>
              ))}
            </div>
          ) : (
            <div className={styles.emptyState}>
              <FileTextOutlined />
              <span>没有匹配的工作记录</span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
