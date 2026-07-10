"use client"

import React, { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';

type TimerStatus = 'active' | 'break' | 'extended' | 'paused' | 'scheduled';

interface Message {
  id: number;
  content: string;
  isVisible: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Timer {
  id: number;
  title: string;
  startTime: string;
  endTime: string;
  isActive: boolean;
  status: TimerStatus;
  createdAt: string;
  updatedAt: string;
}

export default function InstructorTimerPage() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeTimer, setActiveTimer] = useState<Timer | null>(null);
  const [scheduledTimer, setScheduledTimer] = useState<Timer | null>(null);
  const [latestMessage, setLatestMessage] = useState<Message | null>(null);

  useEffect(() => {
    const clockInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    loadActiveTimer();
    loadLatestMessage();
    const timerInterval = setInterval(loadActiveTimer, 2000);
    const messageInterval = setInterval(loadLatestMessage, 5000);

    return () => {
      clearInterval(clockInterval);
      clearInterval(timerInterval);
      clearInterval(messageInterval);
    };
  }, []);

  const loadActiveTimer = async () => {
    try {
      const response = await fetch('/api/timers');
      const data: Timer[] = await response.json();
      const active = data.find((timer) => timer.isActive) || null;
      const scheduled = data.find((timer) => !timer.isActive && timer.status === 'scheduled') || null;
      setActiveTimer(active);
      setScheduledTimer(scheduled);
    } catch (error) {
      console.error('Error loading active timer:', error);
    }
  };

  const loadLatestMessage = async () => {
    try {
      const response = await fetch('/api/messages');
      const data: Message[] = await response.json();
      setLatestMessage(data[0] || null);
    } catch (error) {
      console.error('Error loading latest message:', error);
    }
  };

  const formatCurrentTime = (date: Date) => {
    return date.toLocaleTimeString('zh-TW', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  };

  const getTimeRemaining = () => {
    if (!activeTimer) return { hours: 0, minutes: 0, seconds: 0, totalSeconds: 0 };

    const now = new Date();
    const [endHours, endMinutes] = activeTimer.endTime.split(':').map(Number);
    const endDate = new Date();
    endDate.setHours(endHours, endMinutes, 0, 0);

    const diff = endDate.getTime() - now.getTime();
    const totalSeconds = Math.max(0, Math.floor(diff / 1000));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return { hours, minutes, seconds, totalSeconds };
  };

  const timeRemaining = getTimeRemaining();
  const isEnded = Boolean(activeTimer) && timeRemaining.totalSeconds === 0;
  const isTenMinuteWarning = timeRemaining.totalSeconds > 0 && timeRemaining.totalSeconds <= 600;
  const activeStatus = activeTimer?.status || 'active';
  const statusLabel = isEnded
    ? '已完成'
    : activeStatus === 'break'
      ? '休息中'
      : activeStatus === 'extended'
        ? '延長中'
        : activeTimer
          ? '進行中'
          : '未開始';
  const statusClassName = isTenMinuteWarning
    ? 'bg-amber-400 text-gray-950 border-amber-500'
    : activeStatus === 'break'
      ? 'bg-amber-100 text-amber-900 border-amber-300'
      : activeStatus === 'extended'
        ? 'bg-blue-100 text-blue-900 border-blue-300'
        : 'bg-emerald-100 text-emerald-900 border-emerald-300';
  const remainingDisplay = `${timeRemaining.hours.toString().padStart(2, '0')}:${timeRemaining.minutes.toString().padStart(2, '0')}:${timeRemaining.seconds.toString().padStart(2, '0')}`;

  if (!activeTimer) {
    return (
      <main className="min-h-screen bg-gray-950 text-white flex flex-col justify-center p-8">
        <section className="text-center">
          <p className="text-3xl font-semibold text-gray-300 mb-6">目前沒有進行中的課程</p>
          <h1 className="text-7xl font-bold text-white">尚未開始</h1>
        </section>
        {latestMessage && (
          <section className="mt-12 rounded-lg border border-gray-700 bg-gray-900 px-10 py-7">
            <p className="text-5xl font-bold text-white whitespace-pre-wrap leading-tight">{latestMessage.content}</p>
          </section>
        )}
        {scheduledTimer && (
          <section className="mt-6 rounded-lg border border-emerald-700 bg-emerald-950 px-10 py-6">
            <p className="text-2xl font-semibold text-emerald-300 mb-2">下一堂</p>
            <p className="text-4xl font-bold text-white">{scheduledTimer.title || '未命名課程'}</p>
            <p className="text-3xl font-semibold text-emerald-100 mt-2">
              {scheduledTimer.startTime} - {scheduledTimer.endTime}
            </p>
          </section>
        )}
      </main>
    );
  }

  return (
    <main className={`min-h-screen p-8 flex flex-col ${isTenMinuteWarning ? 'bg-amber-50 text-gray-950' : 'bg-gray-950 text-white'}`}>
      <header className="flex items-start justify-between gap-6">
        <div>
          <p className={`${isTenMinuteWarning ? 'text-amber-800' : 'text-gray-400'} text-2xl font-semibold mb-3`}>
            {activeTimer.startTime} - {activeTimer.endTime}
          </p>
          <h1 className="text-5xl md:text-6xl font-bold leading-tight">{activeTimer.title || '課堂計時器'}</h1>
        </div>
        <div className="text-right">
          <div className={`inline-flex items-center gap-3 rounded-full border px-5 py-3 text-2xl font-bold ${statusClassName}`}>
            <Clock size={28} />
            {statusLabel}
          </div>
          <p className={`${isTenMinuteWarning ? 'text-gray-700' : 'text-gray-400'} text-2xl font-semibold mt-4`}>
            {formatCurrentTime(currentTime)}
          </p>
        </div>
      </header>

      <section className="flex-1 flex flex-col items-center justify-center text-center">
        {isTenMinuteWarning && (
          <div className="mb-8 rounded-lg border-2 border-amber-500 bg-amber-300 px-10 py-5 text-4xl font-bold text-gray-950 shadow-lg">
            倒數 10 分鐘
          </div>
        )}

        <p className={`${isTenMinuteWarning ? 'text-amber-800' : 'text-gray-400'} text-3xl font-semibold mb-6`}>
          剩餘時間
        </p>
        <div className={`font-bold tabular-nums leading-none ${isTenMinuteWarning ? 'text-gray-950' : 'text-white'} text-8xl md:text-9xl lg:text-[10rem]`}>
          {isEnded ? '00:00:00' : remainingDisplay}
        </div>
      </section>

      {latestMessage && (
        <section className={`rounded-lg border px-10 py-7 ${isTenMinuteWarning ? 'border-amber-300 bg-white/80' : 'border-gray-700 bg-gray-900'}`}>
          <p className={`text-5xl font-bold whitespace-pre-wrap leading-tight ${isTenMinuteWarning ? 'text-gray-950' : 'text-white'}`}>
            {latestMessage.content}
          </p>
        </section>
      )}

      {scheduledTimer && (
        <section className={`mt-4 rounded-lg border px-8 py-4 ${isTenMinuteWarning ? 'border-emerald-300 bg-emerald-50' : 'border-emerald-800 bg-emerald-950'}`}>
          <p className={`${isTenMinuteWarning ? 'text-emerald-800' : 'text-emerald-300'} text-xl font-semibold mb-1`}>
            下一堂
          </p>
          <p className={`text-3xl font-bold ${isTenMinuteWarning ? 'text-gray-950' : 'text-white'}`}>
            {scheduledTimer.title || '未命名課程'} <span className="font-semibold">{scheduledTimer.startTime} - {scheduledTimer.endTime}</span>
          </p>
        </section>
      )}
    </main>
  );
}
