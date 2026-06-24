import { Injectable } from '@angular/core';
import { LocalNotifications, ScheduleOptions } from '@capacitor/local-notifications';
import { Task } from '../models/task';

@Injectable({ providedIn: 'root' })
export class TaskReminderService {

  async requestPermission(): Promise<boolean> {
    const { display } = await LocalNotifications.requestPermissions();
    return display === 'granted';
  }

  async scheduleReminder(task: Task): Promise<void> {
    if (!task.reminder_minutes || !task.due_date || !task.due_time) return;

    const granted = await this.requestPermission();
    if (!granted) return;

    // Cancelar notificación previa si existe
    await this.cancelReminder(task.id);

    const [year, month, day] = task.due_date.split('-').map(Number);
    const [hour, minute]     = task.due_time.split(':').map(Number);

    const dueDateTime = new Date(year, month - 1, day, hour, minute, 0);
    const notifyAt    = new Date(dueDateTime.getTime() - task.reminder_minutes * 60 * 1000);

    if (notifyAt <= new Date()) return; // Ya pasó

    const notificationId = this.taskIdToNumber(task.id);

    const options: ScheduleOptions = {
      notifications: [
        {
          id: notificationId,
          title: '📋 Pending Task',
          body: `"${task.title}" is due soon. Open the app to complete or snooze it.`,
          schedule: { at: notifyAt },
          actionTypeId: 'TASK_REMINDER',
          extra: { taskId: task.id }
        }
      ]
    };

    await LocalNotifications.schedule(options);
  }

  async cancelReminder(taskId: string): Promise<void> {
    try {
      const notificationId = this.taskIdToNumber(taskId);
      await LocalNotifications.cancel({ notifications: [{ id: notificationId }] });
    } catch {}
  }

  async cancelAllReminders(taskIds: string[]): Promise<void> {
    try {
      const notifications = taskIds.map(id => ({ id: this.taskIdToNumber(id) }));
      await LocalNotifications.cancel({ notifications });
    } catch {}
  }

  // Convierte UUID a número para el ID de notificación
  private taskIdToNumber(taskId: string): number {
    let hash = 0;
    for (let i = 0; i < taskId.length; i++) {
      hash = ((hash << 5) - hash) + taskId.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  }
}
