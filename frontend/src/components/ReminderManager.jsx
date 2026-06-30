import React, { useEffect, useState } from 'react';
import api from '../utils/api';

const ReminderManager = () => {
  const [schedule, setSchedule] = useState(null);

  useEffect(() => {
    // Request notification permission from browser on mount
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    const fetchTodaySchedule = async () => {
      try {
        const todayStr = new Date().toISOString().slice(0, 10);
        const res = await api.get(`/schedule?date=${todayStr}`);
        if (res.data.success && res.data.schedule) {
          setSchedule(res.data.schedule);
        }
      } catch (err) {
        console.error('Failed to load schedule for reminders', err);
      }
    };

    fetchTodaySchedule();
    // Re-fetch today's schedule blocks every 10 minutes to reflect changes
    const fetchInterval = setInterval(fetchTodaySchedule, 10 * 60 * 1000);

    return () => clearInterval(fetchInterval);
  }, []);

  useEffect(() => {
    if (!schedule || !schedule.blocks || schedule.blocks.length === 0) return;

    const sentKey = 'taskping_sent_reminders';
    let sentList = JSON.parse(localStorage.getItem(sentKey) || '[]');

    const checkReminders = () => {
      const now = new Date();
      
      schedule.blocks.forEach(block => {
        if (!block.taskId || !block.startTime) return;
        
        const taskTitle = block.taskId.title;
        const taskId = block.taskId._id || block.taskId;

        // Parse schedule start time (HH:MM)
        const [hours, minutes] = block.startTime.split(':').map(Number);
        const blockTime = new Date();
        blockTime.setHours(hours, minutes, 0, 0);

        // Difference in minutes
        const diffMs = blockTime.getTime() - now.getTime();
        const diffMinutes = Math.round(diffMs / 60000);

        // Skip completed or past tasks
        if (block.taskId.status === 'completed' || diffMinutes <= 0) return;

        // Trigger helper
        const triggerNotification = (threshold, title, body) => {
          const notificationId = `${taskId}-${threshold}`;
          if (sentList.includes(notificationId)) return;

          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(title, {
              body,
              icon: '/favicon.png',
              tag: notificationId
            });
            
            // Persist notification ID to prevent duplicates
            sentList.push(notificationId);
            localStorage.setItem(sentKey, JSON.stringify(sentList));
          }
        };

        // 1. Concerned Tone - 2 Hours Before (120 minutes)
        if (diffMinutes === 120) {
          triggerNotification(
            120,
            `📅 Task Coming Up: ${taskTitle}`,
            `Just checking in. You have "${taskTitle}" scheduled in 2 hours. Are you ready to tackle it?`
          );
        }

        // 2. Concerned Tone - 1 Hour Before (60 minutes)
        if (diffMinutes === 60) {
          triggerNotification(
            60,
            `⏰ 1 Hour Reminder: ${taskTitle}`,
            `Friendly check-in: "${taskTitle}" starts in 1 hour. Make sure to wrap up your current work!`
          );
        }

        // 3. Urgent Action Label - 30 Minutes Before (30 minutes)
        if (diffMinutes === 30) {
          triggerNotification(
            30,
            `🚨 URGENT ACTION: ${taskTitle} Starts Soon`,
            `Action Required: "${taskTitle}" begins in 30 minutes. Clear your workspace and get ready!`
          );
        }
      });
    };

    // Run every 30 seconds
    checkReminders();
    const reminderInterval = setInterval(checkReminders, 30 * 1000);

    return () => clearInterval(reminderInterval);
  }, [schedule]);

  return null; // Logic-only helper component
};

export default ReminderManager;
