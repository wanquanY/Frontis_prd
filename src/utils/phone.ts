/**
 * 校验中国大陆手机号格式。
 */
export const isValidMainlandPhone = (phone: string): boolean => /^1\d{10}$/.test(phone.trim());
