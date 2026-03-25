export const cleanParams = (params?: Record<string, unknown>) => {
  if (!params) return params;
  const cleaned: Record<string, unknown> = {};
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    cleaned[key] = value;
  });
  return cleaned;
};

export const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
