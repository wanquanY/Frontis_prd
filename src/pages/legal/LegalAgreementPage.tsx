import { useEffect } from "react";

import { Link, useParams } from "react-router-dom";

import { PRODUCT_NAME } from "@/constants/brand";
import { getLegalAgreementBySlug } from "@/feature/auth/mockLegalAgreements";

import styles from "./LegalAgreementPage.module.less";

/**
 * 登录注册协议独立查看页。
 */
export const LegalAgreementPage = (): JSX.Element => {
  const { agreementSlug } = useParams<{ agreementSlug: string }>();
  const agreement = getLegalAgreementBySlug(agreementSlug);

  useEffect(() => {
    document.title = agreement ? `${agreement.title} - ${PRODUCT_NAME}` : PRODUCT_NAME;
  }, [agreement]);

  return (
    <div className={styles.root}>
      <main className={styles.main}>
        {agreement ? (
          <article className={styles.document}>
            <h1 className={styles.title}>{agreement.title}</h1>
            {agreement.sections.map(section => (
              <section key={section.title} className={styles.section}>
                <h2 className={styles.sectionTitle}>{section.title}</h2>
                {section.paragraphs.map(paragraph => (
                  <p key={paragraph} className={styles.paragraph}>
                    {paragraph}
                  </p>
                ))}
              </section>
            ))}
          </article>
        ) : (
          <section className={styles.notFound}>
            <h1>协议不存在</h1>
            <p>当前链接没有匹配到可查看的协议内容。</p>
            <Link className={styles.backLink} to="/login">
              返回登录
            </Link>
          </section>
        )}
      </main>
    </div>
  );
};

export default LegalAgreementPage;
