/**
 * Shared overdue inspection check.
 *
 * A hive inspection is considered overdue if more than 14 days have passed
 * since the last recorded inspection date.
 *
 * Centralised here so all pages (TodayPage, AlertsPage, HivesPage, HiveCard)
 * compute overdue status from a single source of truth. Any business-rule
 * change (e.g. threshold → 21 days) only needs updating in this file.
 */
export const isOverdue = (date?: string): boolean => {
  if (!date) return true;
  const diffDays = (Date.now() - new Date(date).getTime()) / (1000 * 3600 * 24);
  return diffDays > 14;
};
