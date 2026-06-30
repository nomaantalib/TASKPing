import React, { useEffect, useState } from 'react';
import api from '../utils/api';

const ReminderManager = () => {
  const [schedule, setSchedule] = useState(null);

  useEffect(() => {
    // Request permission from the browser
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    const fetchTodaySchedule = async () => {
      try {
        const d = new Date();
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const date = String(d.getDate()).padStart(2, '0');
        const todayStr = `${year}-${month}-${date}`;
        
        const res = await api.get(`/schedule?date=${todayStr}`);
        if (res.data.success && res.data.schedule) {
          setSchedule(res.data.schedule);
        }
      } catch (err) {
        console.error('Failed to load schedule for reminders', err);
      }
    };

    fetchTodaySchedule();
    // Re-fetch today's schedule every 5 minutes to catch modifications
    const fetchInterval = setInterval(fetchTodaySchedule, 5 * 60 * 1000);

    // Garbage collect outdated reminder timestamps older than 24 hours
    try {
      const keys = Object.keys(localStorage);
      const now = Date.now();
      keys.forEach(k => {
        if (k.startsWith('taskping_last_remind_')) {
          const timestamp = Number(localStorage.getItem(k));
          if (now - timestamp > 24 * 60 * 60 * 1000) {
            localStorage.removeItem(k);
          }
        }
      });
    } catch (e) {
      console.error('Failed to clean up localStorage keys', e);
    }

    return () => clearInterval(fetchInterval);
  }, []);

  useEffect(() => {
    if (!schedule || !schedule.blocks || schedule.blocks.length === 0) return;

    const checkReminders = () => {
      const now = new Date();
      const currentTimestamp = now.getTime();

      schedule.blocks.forEach(block => {
        if (!block.taskId || !block.startTime) return;

        const taskTitle = block.taskId.title;
        const taskId = block.taskId._id || block.taskId;
        const taskStatus = block.taskId.status;

        // Skip completed tasks
        if (taskStatus === 'completed') return;

        // Parse schedule start time (HH:MM)
        const [hours, minutes] = block.startTime.split(':').map(Number);
        const blockTime = new Date();
        blockTime.setHours(hours, minutes, 0, 0);

        // Difference in minutes
        const diffMs = blockTime.getTime() - currentTimestamp;
        const diffMinutes = Math.round(diffMs / 60000);

        // Stop notifying if a task is overdue by more than 3 hours
        if (diffMinutes < -180) return;

        let shouldNotify = false;
        let notificationTitle = '';
        let notificationBody = '';
        let storageKey = '';
        let intervalMs = 0;

        if (diffMinutes <= 10) {
          // Imminent / Overdue / Due Now -> Notify every 2 minutes
          shouldNotify = true;
          intervalMs = 2 * 60 * 1000;
          storageKey = `taskping_last_remind_${taskId}_imminent`;
          notificationTitle = `🚨 URGENT: Start ${taskTitle}`;
          notificationBody = diffMinutes <= 0 
            ? `Scheduled for ${block.startTime} and still pending. Please begin immediately!`
            : `Starts in ${diffMinutes} minutes! Get ready to begin.`;
        } else if (diffMinutes <= 60) {
          // Less than 1 hour remaining -> Notify every 20 minutes
          shouldNotify = true;
          intervalMs = 20 * 60 * 1000;
          storageKey = `taskping_last_remind_${taskId}_1h`;
          notificationTitle = `⏰ 20-Min Check: ${taskTitle}`;
          notificationBody = `Reminder: "${taskTitle}" starts in ${diffMinutes} minutes. Wrap up your current activity.`;
        } else if (diffMinutes <= 300) {
          // 2 to 5 hours remaining -> Notify every 1 hour (60 minutes)
          shouldNotify = true;
          intervalMs = 60 * 60 * 1000;
          storageKey = `taskping_last_remind_${taskId}_5h`;
          const hoursLeft = Math.round(diffMinutes / 60 * 10) / 10;
          notificationTitle = `📅 Upcoming: ${taskTitle}`;
          notificationBody = `Schedule Notice: "${taskTitle}" starts in ${hoursLeft} hours.`;
        }

        if (shouldNotify && 'Notification' in window && Notification.permission === 'granted') {
          const lastSentStr = localStorage.getItem(storageKey);
          const lastSent = lastSentStr ? Number(lastSentStr) : 0;

          if (currentTimestamp - lastSent >= intervalMs) {
            try {
              new Notification(notificationTitle, {
                body: notificationBody,
                icon: '/favicon.png',
                tag: `${taskId}-${storageKey}`
              });
              localStorage.setItem(storageKey, String(currentTimestamp));
            } catch (err) {
              console.warn('Failed to trigger standard browser notification, trying Service Worker:', err);
              if ('serviceWorker' in navigator) {
                navigator.serviceWorker.ready.then(registration => {
                  registration.showNotification(notificationTitle, {
                    body: notificationBody,
                    icon: '/favicon.png',
                    tag: `${taskId}-${storageKey}`
                  });
                  localStorage.setItem(storageKey, String(currentTimestamp));
                }).catch(swErr => {
                  console.error('Service Worker notification fallback failed:', swErr);
                });
              }
            }
          }
        }
      });
    };

    // Run check immediately and then every 15 seconds
    checkReminders();
    const reminderInterval = setInterval(checkReminders, 15 * 1000);

    return () => clearInterval(reminderInterval);
  }, [schedule]);

  return null;
};

export default ReminderManager;
