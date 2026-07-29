const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

export function getNextSessionDates(startDate: Date, preferredDays: string[], count: number): Date[] {
  const preferredIndexes = preferredDays.map((d) => WEEKDAYS.indexOf(d.toLowerCase()));
  const dates: Date[] = [];
  const cursor = new Date(startDate);

  while (dates.length < count) {
    if (preferredIndexes.includes(cursor.getDay())) {
      dates.push(new Date(cursor));
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return dates;
}