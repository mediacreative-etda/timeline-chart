import { addYears, format, parseISO } from 'date-fns';
import { th } from 'date-fns/locale';

const BUDDHIST_YEAR_OFFSET = 543;

export const formatThaiDate = (date: Date, pattern: string) =>
  format(date, pattern, { locale: th });

export const formatBuddhistDate = (date: Date, pattern: string = 'dd/MM/yyyy') =>
  format(addYears(date, BUDDHIST_YEAR_OFFSET), pattern, { locale: th });

export const formatBuddhistDateFromISO = (value: string, pattern: string = 'dd/MM/yyyy') =>
  formatBuddhistDate(parseISO(value), pattern);
