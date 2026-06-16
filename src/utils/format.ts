export function yearFromDate(date: string) {
  if (!date || date === 'Coming soon') return 'TBA';
  return date.slice(0, 4);
}

export function formatRuntime(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return hours ? `${hours}h ${mins}m` : `${mins}m`;
}

export function formatDate(date: string) {
  if (!date || date === 'Coming soon') return 'Coming soon';
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(date));
}
