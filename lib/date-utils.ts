export function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function parseDateInputValue(value: string) {
  const [year, month, day] = value.split("-").map((segment) => Number(segment));

  if (!year || !month || !day) {
    return new Date(Number.NaN);
  }

  return new Date(year, month - 1, day);
}

export function getLeaveRequestDateWindow(referenceDate = new Date()) {
  const startDate = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1);
  const endDate = new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 3, 0);

  return {
    startDate,
    endDate,
    startValue: toDateInputValue(startDate),
    endValue: toDateInputValue(endDate)
  };
}
