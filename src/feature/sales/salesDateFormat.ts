const padDatePart = (value: number): string => String(value).padStart(2, "0");

export const formatSalesDateTime = (date: Date = new Date()): string =>
  [
    `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}`,
    `${padDatePart(date.getHours())}:${padDatePart(date.getMinutes())}:${padDatePart(
      date.getSeconds(),
    )}`,
  ].join(" ");

export const parseSalesDateTime = (value: string | undefined): Date | null => {
  if (!value) {
    return null;
  }

  const matched = value.match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2}):(\d{2})$/);

  if (!matched) {
    return null;
  }

  const [, year, month, day, hour, minute, second] = matched;
  const parsedDate = new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second),
  );

  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
};

export const addSalesMinutes = (value: string, minutes: number): string => {
  const parsedDate = parseSalesDateTime(value) ?? new Date();

  return formatSalesDateTime(new Date(parsedDate.getTime() + minutes * 60 * 1000));
};
