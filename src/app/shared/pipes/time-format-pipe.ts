import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'timeFormat', standalone: true })
export class TimeFormatPipe implements PipeTransform {
  transform(value: string | null | undefined, format: '12h' | '24h' = '12h'): string {
    if (!value) return '';

    const [hourStr, minuteStr] = value.split(':');
    const hour   = parseInt(hourStr, 10);
    const minute = minuteStr ?? '00';

    if (format === '24h') {
      return `${hour.toString().padStart(2, '0')}:${minute}`;
    }

    const period = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minute} ${period}`;
  }
}
