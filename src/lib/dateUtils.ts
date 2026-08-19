/**
 * Date and Time Utilities for Indonesian Timezone (WIB/WITA/WIT)
 * Safe from UTC midnight shifts.
 */

// Helper to pad number with leading zeros
const pad = (num: number, digits = 2): string => String(num).padStart(digits, '0');

/**
 * Returns current local date as "YYYY-MM-DD"
 */
export function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  return `${year}-${month}-${day}`;
}

/**
 * Returns current local datetime as "YYYY-MM-DDTHH:mm" for datetime-local inputs
 */
export function getLocalDateTimeString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

/**
 * Returns current local month as "YYYY-MM"
 */
export function getLocalMonthString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  return `${year}-${month}`;
}

/**
 * Parses date string (either "YYYY-MM-DD" or ISO timestamp) to a safe local Date object
 */
export function parseToLocalDate(dateInput: string | Date | null | undefined): Date | null {
  if (!dateInput) return null;
  if (dateInput instanceof Date) return dateInput;

  // Pure YYYY-MM-DD string
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
    const [year, month, day] = dateInput.split('-').map(Number);
    return new Date(year, month - 1, day);
  }

  // Pure YYYY-MM-DDTHH:mm
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(dateInput)) {
    const [datePart, timePart] = dateInput.split('T');
    const [year, month, day] = datePart.split('-').map(Number);
    const [hours, minutes] = timePart.split(':').map(Number);
    return new Date(year, month - 1, day, hours, minutes);
  }

  const parsed = new Date(dateInput);
  return isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Formats a date into Indonesian readable format (e.g., "19 Agustus 2026" or "Rabu, 19 Agustus 2026")
 */
export function formatDateIndo(
  dateInput: string | Date | null | undefined,
  options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' }
): string {
  const d = parseToLocalDate(dateInput);
  if (!d) return '-';
  return d.toLocaleDateString('id-ID', options);
}

/**
 * Formats a date and time into Indonesian readable format (e.g., "19 Agu 2026, 17:10")
 */
export function formatDateTimeIndo(
  dateInput: string | Date | null | undefined,
  options?: Intl.DateTimeFormatOptions
): string {
  const d = parseToLocalDate(dateInput);
  if (!d) return '-';
  return d.toLocaleDateString('id-ID', options || {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}
