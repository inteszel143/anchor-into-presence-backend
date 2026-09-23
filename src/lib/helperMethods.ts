export function buildWeeklyCronExpression(
  weekdays: number[],
  time: string
): string {
  const [hour, minute] = time.split(":").map(Number);
  const days = weekdays.join(",");
  return `${minute} ${hour} * * ${days}`;
}

export function buildDateCronExpression(date: Date): string {
  const minute = date.getMinutes();
  const hour = date.getHours();
  const day = date.getDate();
  const month = date.getMonth() + 1;

  return `${minute} ${hour} ${day} ${month} *`;
}
