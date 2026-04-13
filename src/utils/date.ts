export function formatDate(date: string | Date | undefined | null): string {
  if (!date) return '';
  try {
    return new Date(date).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  } catch (error) {
    return '';
  }
}

export function formatDateTime(date: string | Date | undefined | null): string {
  if (!date) return '';
  try {
    return new Date(date).toLocaleString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  } catch (error) {
    return '';
  }
}

export function isFollowUpDue(followUpDate: string): boolean {
  const today = new Date();
  const followUp = new Date(followUpDate);
  today.setHours(0, 0, 0, 0);
  followUp.setHours(0, 0, 0, 0);
  return followUp <= today;
}

export function isFollowUpOverdue(followUpDate: string): boolean {
  const today = new Date();
  const followUp = new Date(followUpDate);
  today.setHours(0, 0, 0, 0);
  followUp.setHours(0, 0, 0, 0);
  return followUp < today;
}