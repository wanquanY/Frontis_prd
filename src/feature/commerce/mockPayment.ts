export const MOCK_PAYMENT_QR_COUNTDOWN_SECONDS = 15 * 60;

/**
 * 格式化支付倒计时。
 */
export const formatMockPaymentCountdown = (remainingSeconds: number): string => {
  const safeSeconds = Math.max(remainingSeconds, 0);
  const minutes = Math.floor(safeSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (safeSeconds % 60).toString().padStart(2, "0");

  return `${minutes}:${seconds}`;
};

/**
 * 构造原型支付订单号。
 */
export const buildMockPaymentOrderId = (prefix: string): string =>
  `${prefix.toUpperCase()}-${Date.now().toString().slice(-8)}`;

/**
 * 构造原型支付二维码。
 */
export const buildMockPaymentQr = (seed: string): string => {
  const cellSize = 10;
  const quietZone = 4;
  const matrixSize = 25;
  const fullSize = (matrixSize + quietZone * 2) * cellSize;

  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 131 + seed.charCodeAt(index)) % 2147483647;
  }

  const isFinderArea = (row: number, column: number): boolean => {
    const finderPositions = [
      { row: 0, column: 0 },
      { row: 0, column: matrixSize - 7 },
      { row: matrixSize - 7, column: 0 },
    ];

    return finderPositions.some(position => {
      const rowOffset = row - position.row;
      const columnOffset = column - position.column;
      return rowOffset >= 0 && rowOffset < 7 && columnOffset >= 0 && columnOffset < 7;
    });
  };

  const renderFinder = (row: number, column: number): boolean => {
    const normalizedRow = row % 7;
    const normalizedColumn = column % 7;

    return (
      normalizedRow === 0 ||
      normalizedRow === 6 ||
      normalizedColumn === 0 ||
      normalizedColumn === 6 ||
      (normalizedRow >= 2 &&
        normalizedRow <= 4 &&
        normalizedColumn >= 2 &&
        normalizedColumn <= 4)
    );
  };

  const squares: string[] = [];

  for (let row = 0; row < matrixSize; row += 1) {
    for (let column = 0; column < matrixSize; column += 1) {
      const x = (column + quietZone) * cellSize;
      const y = (row + quietZone) * cellSize;

      if (isFinderArea(row, column)) {
        if (renderFinder(row, column)) {
          squares.push(
            `<rect x="${x}" y="${y}" width="${cellSize}" height="${cellSize}" fill="#111827" rx="1" />`,
          );
        }
        continue;
      }

      hash = (hash * 48271 + row * 97 + column * 53 + 17) % 2147483647;
      const isFilled = hash % 5 < 2;

      if (isFilled) {
        squares.push(
          `<rect x="${x}" y="${y}" width="${cellSize}" height="${cellSize}" fill="#111827" rx="1" />`,
        );
      }
    }
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${fullSize}" height="${fullSize}" viewBox="0 0 ${fullSize} ${fullSize}"><rect width="${fullSize}" height="${fullSize}" fill="#ffffff"/>${squares.join("")}</svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};
