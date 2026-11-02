function reviewDayKey(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function startOfToday(): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

/** Most recent day that has reviews, starting from today and walking backward. */
export function latestReviewDay(reviews: any[]): string {
  const days = new Set(
    (reviews || [])
      .map((review) => reviewDayKey(review?.created_on))
      .filter((day) => day)
  );
  if (days.size === 0) {
    return '';
  }

  const oldest = [...days].sort()[0];
  const cursor = startOfToday();

  for (let i = 0; i < 400; i++) {
    const key = reviewDayKey(cursor);
    if (days.has(key)) {
      return key;
    }
    if (key <= oldest) {
      break;
    }
    cursor.setDate(cursor.getDate() - 1);
  }

  return [...days].sort().reverse()[0];
}

export function reviewsForDashboard(reviews: any[]): any[] {
  const day = latestReviewDay(reviews);
  if (!day) {
    return [];
  }
  return (reviews || []).filter((review) => reviewDayKey(review?.created_on) === day);
}
