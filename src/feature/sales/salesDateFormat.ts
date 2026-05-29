const padDatePart = (value: number): string => String(value).padStart(2, "0");

export const formatSalesDateTime = (date: Date = new Date()): string =>
  [
    `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}`,
    `${padDatePart(date.getHours())}:${padDatePart(date.getMinutes())}:${padDatePart(
      date.getSeconds(),
    )}`,
  ].join(" ");
