import { startTransition, useCallback, useMemo, useState } from "react";

import classNames from "classnames";
import {
  CaretRightOutlined,
  ClockCircleOutlined,
  CloseOutlined,
  PlayCircleFilled,
} from "@ant-design/icons";

import { PORTAL_CASE_STUDIES } from "@/feature/marketingPortal/portalData";
import type { MarketingCaseStudyItem } from "@/feature/marketingPortal/types";

import layoutStyles from "./MarketingPortalLayout.module.less";
import styles from "./MarketingPortalCasesView.module.less";

/**
 * 视频卡片组件。
 */
const VideoCaseCard = ({
  item,
  isSpotlight,
}: {
  item: MarketingCaseStudyItem;
  isSpotlight?: boolean;
}): JSX.Element => {
  const [playing, setPlaying] = useState(false);

  const handlePlay = useCallback(() => {
    setPlaying(true);
  }, []);

  const handleStop = useCallback(() => {
    setPlaying(false);
  }, []);

  const coverUrl = item.videoCoverUrl || item.coverImageUrl;
  const bvid = item.bvid;

  return (
    <article className={classNames(styles.videoCard, isSpotlight && styles.videoCardSpotlight)}>
      <div className={styles.videoFrame}>
        {playing && bvid ? (
          <div className={styles.iframeWrap}>
            <iframe
              className={styles.videoIframe}
              src={`//player.bilibili.com/player.html?bvid=${bvid}&high_quality=1&autoplay=1&danmaku=0`}
              allowFullScreen
              allow="autoplay; fullscreen"
              sandbox="allow-top-navigation allow-same-origin allow-forms allow-scripts allow-popups"
            />
            <button
              type="button"
              className={styles.videoCloseBtn}
              onClick={handleStop}
              aria-label="关闭视频"
            >
              <CloseOutlined />
            </button>
          </div>
        ) : (
          <button type="button" className={styles.videoCover} onClick={handlePlay}>
            <img
              className={styles.videoCoverImage}
              src={coverUrl}
              alt={item.title}
              loading="lazy"
            />
            <div className={styles.videoOverlay}>
              <PlayCircleFilled className={styles.videoPlayIcon} />
            </div>
            {item.videoDuration && (
              <span className={styles.videoDuration}>
                <ClockCircleOutlined /> {item.videoDuration}
              </span>
            )}
          </button>
        )}
      </div>

      <div className={styles.videoMeta}>
        <div className={styles.videoMetaTop}>
          <span className={styles.videoIndustryChip}>{item.industry}</span>
          <span className={styles.videoCustomer}>{item.customerName}</span>
        </div>
        <h3 className={styles.videoTitle}>{item.title}</h3>
        <p className={styles.videoSummary}>{item.summary}</p>
        {isSpotlight && item.metrics.length > 0 && (
          <div className={styles.videoMetrics}>
            {item.metrics.map(m => (
              <div key={m.label} className={styles.metricChip}>
                <span className={styles.metricChipValue}>{m.value}</span>
                <span className={styles.metricChipLabel}>{m.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </article>
  );
};

/**
 * 营销门户案例列表视图 — 视频画廊。
 */
export const MarketingPortalCasesView = (): JSX.Element => {
  const industryFilters = useMemo(
    () => ["全部", ...Array.from(new Set(PORTAL_CASE_STUDIES.map(item => item.industry)))],
    [],
  );
  const [activeIndustry, setActiveIndustry] = useState<string>("全部");

  const visibleCases = useMemo(
    () =>
      activeIndustry === "全部"
        ? PORTAL_CASE_STUDIES
        : PORTAL_CASE_STUDIES.filter(item => item.industry === activeIndustry),
    [activeIndustry],
  );

  const spotlightCase = visibleCases[0] ?? null;
  const gridCases = visibleCases.slice(1);

  return (
    <div className={styles.page}>
      {/* Hero */}
      <section className={classNames(layoutStyles.darkSection, styles.heroSection)}>
        <p className={styles.heroEyebrow}>Client Stories</p>
        <h1 className={styles.heroTitle}>看看这些企业如何用 AI 专家团跑业务</h1>
        <p className={styles.heroDescription}>
          不是 PPT 里的概念，是真实企业、真实场景、真实数据。
          <br />
          点击播放，用 3 分钟了解一个案例。
        </p>

        <div className={styles.filterRow}>
          {industryFilters.map(item => (
            <button
              key={item}
              type="button"
              aria-pressed={item === activeIndustry}
              className={classNames(
                styles.filterBtn,
                item === activeIndustry && styles.filterBtnActive,
              )}
              onClick={() =>
                startTransition(() => {
                  setActiveIndustry(item);
                })
              }
            >
              {item}
            </button>
          ))}
        </div>
      </section>

      {/* Spotlight */}
      {spotlightCase && (
        <section className={styles.spotlightSection}>
          <VideoCaseCard item={spotlightCase} isSpotlight />
        </section>
      )}

      {/* Grid */}
      {gridCases.length > 0 && (
        <section className={styles.gridSection}>
          <div className={styles.videoGrid}>
            {gridCases.map(item => (
              <VideoCaseCard key={item.id} item={item} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
