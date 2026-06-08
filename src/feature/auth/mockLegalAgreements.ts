export type LegalAgreementKey = "userAgreement" | "privacyPolicy";

export interface LegalAgreementSection {
  title: string;
  paragraphs: string[];
}

export interface LegalAgreementMockData {
  key: LegalAgreementKey;
  slug: string;
  title: string;
  sections: LegalAgreementSection[];
}

export const LEGAL_AGREEMENT_PATHS: Record<LegalAgreementKey, string> = {
  userAgreement: "/legal/user-agreement",
  privacyPolicy: "/legal/privacy-policy",
};

export const LEGAL_AGREEMENT_MOCK_DATA: Record<LegalAgreementKey, LegalAgreementMockData> = {
  userAgreement: {
    key: "userAgreement",
    slug: "user-agreement",
    title: "FrontisAI 用户协议",
    sections: [
      {
        title: "一、协议范围",
        paragraphs: [
          "本协议用于约定用户在访问、注册、登录和使用 FrontisAI 产品及相关服务时的基本权利义务。",
          "FrontisAI 服务包括但不限于 AI 专家工作台、企业专区、专家广场、技能中心、企业管理后台、运营管理后台以及后续上线的相关功能。",
        ],
      },
      {
        title: "二、账号与身份",
        paragraphs: [
          "用户应使用真实、准确、合法有效的手机号或平台支持的其他方式完成登录和身份校验。",
          "同一用户可能关联个人版、团队版或多个企业租户身份。用户进入不同租户后，应遵守对应组织的权限、数据范围和管理要求。",
          "用户不得转让、出租、出借账号，不得以他人身份使用 FrontisAI 服务。",
        ],
      },
      {
        title: "三、服务使用规则",
        paragraphs: [
          "用户应在合法、合规、真实业务场景下使用 AI 专家、ME、Skill、MCP、知识库、文件上传和结果生成等能力。",
          "用户不得利用 FrontisAI 生成、传播违法违规、侵犯他人权益、泄露商业秘密或违反组织内部制度的内容。",
          "AI 生成结果仅作为辅助决策和工作效率提升工具。涉及法律、财务、人事、合同、医疗、投资等高风险事项时，用户应自行复核并取得专业确认。",
        ],
      },
      {
        title: "四、企业数据与协作",
        paragraphs: [
          "企业租户管理员可根据组织管理需要配置成员、角色、权限、AI 专家可见范围、积分或订阅权益。",
          "用户在企业租户内产生的会话、任务、文件、成果和使用记录，可能根据企业配置沉淀为组织资产，并受企业数据治理规则约束。",
          "用户离开企业或权限变更后，平台将根据企业管理策略调整其可访问的数据和功能范围。",
        ],
      },
      {
        title: "五、服务变更与终止",
        paragraphs: [
          "FrontisAI 可根据产品迭代、合规要求、运营策略或安全风险处理需要，对部分功能、入口、计费方式和服务规则进行调整。",
          "如用户违反本协议或相关法律法规，FrontisAI 有权限制、暂停或终止相关账号或租户的服务使用，并保留追究责任的权利。",
        ],
      },
      {
        title: "六、联系方式",
        paragraphs: [
          "如用户对本协议或 FrontisAI 服务规则有疑问，可通过平台客服、企业管理员或官方支持渠道联系 FrontisAI。",
        ],
      },
    ],
  },
  privacyPolicy: {
    key: "privacyPolicy",
    slug: "privacy-policy",
    title: "FrontisAI 隐私协议",
    sections: [
      {
        title: "一、我们收集的信息",
        paragraphs: [
          "为完成账号注册、登录、身份识别和租户进入，我们可能收集手机号、验证码校验结果、账号名称、头像、所属租户、角色和权限信息。",
          "为支持企业协作和 AI 专家使用，我们可能处理用户提交的文本、文件、会话指令、任务过程、生成结果、反馈记录和操作日志。",
          "为保障服务安全和稳定运行，我们可能收集设备、浏览器、访问时间、登录状态、异常错误和安全审计相关信息。",
        ],
      },
      {
        title: "二、信息使用目的",
        paragraphs: [
          "我们使用相关信息用于账号认证、租户与身份切换、权限控制、服务开通、积分或订阅权益校验、AI 专家调用和任务结果生成。",
          "我们会基于必要的使用记录进行服务质量分析、安全风控、异常排查、客户支持和产品体验优化。",
          "在企业租户场景下，部分使用记录可能用于企业管理员查看组织使用情况、进行权限治理和业务复盘。",
        ],
      },
      {
        title: "三、信息共享与委托处理",
        paragraphs: [
          "未经用户或企业授权，我们不会将个人信息出售给第三方。",
          "为提供大模型、云存储、短信验证、安全审计等基础能力，我们可能在必要范围内委托合作服务方处理相关信息，并要求其按照约定履行安全保护义务。",
          "当法律法规、监管要求、司法机关或行政机关依法提出要求时，我们可能按照法定程序提供相关信息。",
        ],
      },
      {
        title: "四、信息保护",
        paragraphs: [
          "我们会采用访问控制、权限隔离、日志审计、传输加密、数据备份和异常监控等措施保护用户信息安全。",
          "企业租户内的数据可见范围由组织角色、权限点、租户配置和业务对象归属共同决定。",
          "用户也应妥善保管账号、验证码和登录设备，避免将敏感信息提交到无关任务或共享给无权限人员。",
        ],
      },
      {
        title: "五、用户权利",
        paragraphs: [
          "用户可在产品支持范围内查看、更新账号信息，或通过企业管理员处理组织内身份、角色和权限问题。",
          "如用户需要访问、更正、删除个人信息，或撤回部分授权，可通过平台客服或官方支持渠道提出请求。我们将在核验身份和法律法规允许范围内处理。",
        ],
      },
      {
        title: "六、未成年人保护",
        paragraphs: [
          "FrontisAI 主要面向企业和成年人工作场景。未成年人使用相关服务前，应取得监护人同意，并在监护人指导下使用。",
        ],
      },
      {
        title: "七、联系方式",
        paragraphs: [
          "如用户对本隐私协议或个人信息处理方式有疑问、投诉或建议，可通过平台客服、企业管理员或官方支持渠道联系 FrontisAI。",
        ],
      },
    ],
  },
};

export const getLegalAgreementBySlug = (slug?: string): LegalAgreementMockData | undefined =>
  Object.values(LEGAL_AGREEMENT_MOCK_DATA).find(item => item.slug === slug);
