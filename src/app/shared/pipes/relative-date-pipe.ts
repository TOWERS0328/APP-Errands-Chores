import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'relativeDate', standalone: true })
export class RelativeDatePipe implements PipeTransform {
  transform(value: string | Date | null | undefined): string {
    if (!value) return '';

    const date = typeof value === 'string'
      ? (() => {
          const [y, m, d] = value.split('-').map(Number);
          return new Date(y, m - 1, d); // hora local, no UTC
        })()
      : value;

    const now  = new Date();

    const startOfDay = (d: Date) =>
      new Date(d.getFullYear(), d.getMonth(), d.getDate());

    const diffDays = Math.round(
      (startOfDay(date).getTime() - startOfDay(now).getTime()) / 86_400_000
    );

    if (diffDays === 0)  return 'Today';
    if (diffDays === 1)  return 'Tomorrow';
    if (diffDays === -1) return 'Yesterday';
    if (diffDays > 1 && diffDays < 7)  return `In ${diffDays} days`;
    if (diffDays < -1 && diffDays > -7) return `${Math.abs(diffDays)} days ago`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day:   'numeric',
      year:  date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  }
}
