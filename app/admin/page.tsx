"use client"

import React, { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, Clock, MessageCircle, Send, Trash2, Plus } from 'lucide-react';


interface Message {
  id: number;
  content: string;
  isVisible: boolean;
  createdAt: string;
  updatedAt: string;
}

type TimerStatus = 'active' | 'break' | 'extended' | 'paused' | 'scheduled';

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

export default function AdminPanel() {
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [title, setTitle] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isConfigured, setIsConfigured] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeTimer, setActiveTimer] = useState<Timer | null>(null);
  const [scheduledTimer, setScheduledTimer] = useState<Timer | null>(null);
  const [extendMinutes, setExtendMinutes] = useState('10');
  const [nextTitle, setNextTitle] = useState('');
  const [nextStartTime, setNextStartTime] = useState('');
  const [nextEndTime, setNextEndTime] = useState('');

  const inputClassName = "w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg bg-white text-gray-900 placeholder:text-gray-500";

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    loadMessages();
    loadActiveTimer();
    const activeTimerInterval = setInterval(loadActiveTimer, 5000);
    return () => {
      clearInterval(timer);
      clearInterval(activeTimerInterval);
    };
  }, []);

  const loadMessages = async () => {
    try {
      const response = await fetch('/api/messages');
      const data = await response.json();
      setMessages(data);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const loadActiveTimer = async () => {
    try {
      const response = await fetch('/api/timers');
      const data: Timer[] = await response.json();
      const active = data.find((timer) => timer.isActive) || null;
      const scheduled = data.find((timer) => !timer.isActive && timer.status === 'scheduled') || null;
      setActiveTimer(active);
      setScheduledTimer(scheduled);
      setIsConfigured(Boolean(active));
      setIsRunning(Boolean(active));

      if (active) {
        setTitle(active.title);
        setStartTime(active.startTime);
        setEndTime(active.endTime);
      }
    } catch (error) {
      console.error('Error loading active timer:', error);
    }
  };

  const isValidTimeRange = (rangeStartTime: string, rangeEndTime: string) => {
    if (!rangeStartTime || !rangeEndTime) {
      alert('請設定開始和結束時間');
      return false;
    }

    const start = new Date();
    const [startHours, startMinutes] = rangeStartTime.split(':').map(Number);
    const [endHours, endMinutes] = rangeEndTime.split(':').map(Number);
    
    start.setHours(startHours, startMinutes, 0, 0);
    const end = new Date(start);
    end.setHours(endHours, endMinutes, 0, 0);
    
    if (end <= start) {
      alert('結束時間必須在開始時間之後');
      return false;
    }

    return true;
  };

  const handleStart = async () => {
    if (!isValidTimeRange(startTime, endTime)) return;
    
    try {
      const response = await fetch('/api/timers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          startTime,
          endTime,
          isActive: true,
          status: 'active',
        }),
      });
      
      if (response.ok) {
        const timer = await response.json();
        setActiveTimer(timer);
        setIsConfigured(true);
        setIsRunning(true);
      }
    } catch (error) {
      console.error('Error creating timer:', error);
    }
  };

  const handleScheduleNext = async () => {
    if (!isValidTimeRange(nextStartTime, nextEndTime)) return;

    try {
      const response = await fetch('/api/timers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: nextTitle,
          startTime: nextStartTime,
          endTime: nextEndTime,
          isActive: false,
          status: 'scheduled',
        }),
      });
      
      if (response.ok) {
        const timer = await response.json();
        setScheduledTimer(timer);
        setNextTitle('');
        setNextStartTime('');
        setNextEndTime('');
      }
    } catch (error) {
      console.error('Error scheduling next timer:', error);
    }
  };

  const handleStartScheduledTimer = async () => {
    if (!scheduledTimer) return;

    try {
      const response = await fetch('/api/timers', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: scheduledTimer.id,
          title: scheduledTimer.title,
          startTime: scheduledTimer.startTime,
          endTime: scheduledTimer.endTime,
          isActive: true,
          status: 'active',
        }),
      });
      
      if (response.ok) {
        const timer = await response.json();
        setActiveTimer(timer);
        setScheduledTimer(null);
        setIsConfigured(true);
        setIsRunning(true);
        setTitle(timer.title);
        setStartTime(timer.startTime);
        setEndTime(timer.endTime);
      }
    } catch (error) {
      console.error('Error starting scheduled timer:', error);
    }
  };

  const handleClearScheduledTimer = async () => {
    if (!scheduledTimer) return;

    try {
      const response = await fetch('/api/timers', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: scheduledTimer.id,
        }),
      });
      
      if (response.ok) {
        setScheduledTimer(null);
      }
    } catch (error) {
      console.error('Error clearing scheduled timer:', error);
    }
  };

  const deactivateActiveTimer = async () => {
    if (!activeTimer) return false;

    try {
      const response = await fetch('/api/timers', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: activeTimer.id,
          title: activeTimer.title,
          startTime: activeTimer.startTime,
          endTime: activeTimer.endTime,
          isActive: false,
          status: 'paused',
        }),
      });

      return response.ok;
    } catch (error) {
      console.error('Error deactivating timer:', error);
      return false;
    }
  };

  const handlePause = async () => {
    const didPause = await deactivateActiveTimer();
    if (!didPause) return;

    setActiveTimer(null);
    setIsRunning(false);
    setIsConfigured(false);
  };

  const handleReset = async () => {
    if (activeTimer) {
      const didReset = await deactivateActiveTimer();
      if (!didReset) return;
    }

    setActiveTimer(null);
    setIsRunning(false);
    setIsConfigured(false);
    setStartTime('');
    setEndTime('');
    setTitle('');
  };

  const getDateFromTime = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date;
  };

  const formatTimeInputValue = (date: Date) => {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const handleExtendTimer = async (minutes: number) => {
    if (!activeTimer) return;
    if (!Number.isFinite(minutes) || minutes <= 0) {
      alert('請輸入大於 0 的延長分鐘數');
      return;
    }

    const now = new Date();
    const currentEnd = getDateFromTime(activeTimer.endTime);
    const base = currentEnd > now ? currentEnd : now;
    const nextEnd = new Date(base.getTime() + minutes * 60 * 1000);

    if (nextEnd.getDate() !== base.getDate()) {
      alert('目前版本不支援跨日課程，請設定今天 23:59 以前的結束時間');
      return;
    }

    const nextEndTime = formatTimeInputValue(nextEnd);

    try {
      const response = await fetch('/api/timers', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: activeTimer.id,
          title: activeTimer.title,
          startTime: activeTimer.startTime,
          endTime: nextEndTime,
          isActive: activeTimer.isActive,
          status: 'extended',
        }),
      });

      if (response.ok) {
        const updatedTimer = await response.json();
        setActiveTimer(updatedTimer);
        setEndTime(updatedTimer.endTime);
        setIsConfigured(true);
        setIsRunning(updatedTimer.isActive);
      }
    } catch (error) {
      console.error('Error extending timer:', error);
    }
  };

  const handleSetTimerStatus = async (status: TimerStatus) => {
    if (!activeTimer) return;

    try {
      const response = await fetch('/api/timers', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: activeTimer.id,
          title: activeTimer.title,
          startTime: activeTimer.startTime,
          endTime: activeTimer.endTime,
          isActive: true,
          status,
        }),
      });

      if (response.ok) {
        const updatedTimer = await response.json();
        setActiveTimer(updatedTimer);
        setIsConfigured(true);
        setIsRunning(true);
      }
    } catch (error) {
      console.error('Error updating timer status:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!message.trim()) return;
    
    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: message,
        }),
      });
      
      if (response.ok) {
        setMessage('');
        loadMessages();
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleDeleteMessage = async (id: number) => {
    try {
      const response = await fetch(`/api/messages/${id}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        loadMessages();
      }
    } catch (error) {
      console.error('Error deleting message:', error);
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  };

  const getTimeRemaining = () => {
    const timerEndTime = activeTimer?.endTime || endTime;
    if (!timerEndTime) return { hours: 0, minutes: 0, seconds: 0, totalSeconds: 0 };
    
    const now = new Date();
    const [endHours, endMinutes] = timerEndTime.split(':').map(Number);
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
  const activeStatus = activeTimer?.status || 'active';
  const isClassActive = isRunning && timeRemaining.totalSeconds > 0 && activeStatus === 'active';
  const isClassEnded = isConfigured && timeRemaining.totalSeconds === 0;
  const statusLabel = isClassEnded
    ? '已完成'
    : activeStatus === 'break'
      ? '休息中'
      : activeStatus === 'extended'
        ? '延長中'
        : activeStatus === 'scheduled'
          ? '預排中'
          : isClassActive
            ? '進行中'
            : '未開始';
  const displayTitle = activeTimer?.title || title || '未命名課程';
  const displayStartTime = activeTimer?.startTime || startTime;
  const displayEndTime = activeTimer?.endTime || endTime;

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="text-center mb-6">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">管理員面板</h1>
            <p className="text-gray-500">管理計時器和訊息</p>
            <a
              href="/instructor"
              className="inline-flex items-center gap-2 mt-4 rounded-lg border border-gray-300 bg-white px-4 py-2 font-semibold text-gray-900 hover:bg-gray-100 transition-colors"
            >
              <Clock size={18} />
              講師頁
            </a>
          </div>

          {/* Timer Section */}
          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">計時器設定</h2>
            
            {!isRunning && (
              <div className="grid md:grid-cols-3 gap-6 mb-6">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">課程標題</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="例如：數學課、團隊會議"
                    className={inputClassName}
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">開始時間</label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className={inputClassName}
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">結束時間</label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className={inputClassName}
                  />
                </div>
              </div>
            )}

            <div className="flex justify-center gap-4 mb-6">
              {!isRunning ? (
                <button
                  onClick={handleStart}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                >
                  <Play size={20} />
                  開始課程
                </button>
              ) : (
                <button
                  onClick={handlePause}
                  className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                >
                  <Pause size={20} />
                  暫停
                </button>
              )}
              <button
                onClick={handleReset}
                className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-900 border border-gray-300 px-6 py-3 rounded-lg font-medium transition-colors"
              >
                <RotateCcw size={20} />
                重置
              </button>
            </div>

            {isConfigured && (
              <div className="space-y-6 mb-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                  <p className="text-sm font-medium text-blue-700 mb-2">目前課程</p>
                  <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
                    <div>
                      <h3 className="text-3xl font-bold text-gray-950">{displayTitle}</h3>
                      <p className="text-gray-700 mt-2">
                        課程時間從 <span className="font-semibold text-gray-950">{displayStartTime}</span> 到 <span className="font-semibold text-gray-950">{displayEndTime}</span>
                      </p>
                    </div>
                    <span className="inline-flex w-fit items-center rounded-full bg-white px-4 py-2 text-sm font-semibold text-gray-900 border border-blue-200">
                      {statusLabel}
                    </span>
                  </div>

                  <div className="mt-6 border-t border-blue-200 pt-5">
                    <p className="text-sm font-semibold text-gray-900 mb-3">課程狀態</p>
                    <div className="flex flex-wrap gap-2 mb-5">
                      <button
                        onClick={() => handleSetTimerStatus('active')}
                        className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 font-semibold transition-colors ${
                          activeStatus === 'active'
                            ? 'bg-gray-900 text-white'
                            : 'border border-gray-300 bg-white text-gray-900 hover:bg-gray-100'
                        }`}
                      >
                        <Play size={16} />
                        進行中
                      </button>
                      <button
                        onClick={() => handleSetTimerStatus('break')}
                        className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 font-semibold transition-colors ${
                          activeStatus === 'break'
                            ? 'bg-amber-600 text-white'
                            : 'border border-amber-300 bg-white text-amber-800 hover:bg-amber-50'
                        }`}
                      >
                        <Pause size={16} />
                        休息中
                      </button>
                    </div>

                    <p className="text-sm font-semibold text-gray-900 mb-3">延長時間</p>
                    <div className="flex flex-col lg:flex-row gap-3">
                      <div className="flex flex-wrap gap-2">
                        {[5, 10, 15].map((minutes) => (
                          <button
                            key={minutes}
                            onClick={() => handleExtendTimer(minutes)}
                            className="inline-flex items-center gap-2 rounded-lg border border-blue-300 bg-white px-4 py-2 font-semibold text-blue-800 hover:bg-blue-100 transition-colors"
                          >
                            <Plus size={16} />
                            {minutes} 分鐘
                          </button>
                        ))}
                      </div>
                      <div className="flex gap-2 lg:ml-auto">
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={extendMinutes}
                          onChange={(e) => setExtendMinutes(e.target.value)}
                          className="w-28 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900 placeholder:text-gray-500"
                          aria-label="自訂延長分鐘數"
                        />
                        <button
                          onClick={() => handleExtendTimer(Number(extendMinutes))}
                          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 transition-colors"
                        >
                          <Plus size={16} />
                          延長
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-6">
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <Clock size={24} className="text-gray-600" />
                      <h3 className="text-lg font-medium text-gray-900">目前時間</h3>
                    </div>
                    <p className="text-3xl font-semibold text-gray-950">{formatTime(currentTime)}</p>
                  </div>

                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">剩餘時間</h3>
                    <div className="text-3xl font-semibold text-gray-950">
                      {isClassEnded ? (
                        '課程結束'
                      ) : (
                        `${timeRemaining.hours.toString().padStart(2, '0')}:${timeRemaining.minutes.toString().padStart(2, '0')}:${timeRemaining.seconds.toString().padStart(2, '0')}`
                      )}
                    </div>
                  </div>

                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">狀態</h3>
                    <p className="text-2xl font-semibold text-gray-950">
                      {statusLabel}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-6 mb-8">
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-5">
                <div>
                  <h3 className="text-xl font-semibold text-gray-950">預排下一堂</h3>
                  <p className="text-gray-700 mt-1">提前填好下一堂課，不會影響目前正在跑的倒數。</p>
                </div>
                {scheduledTimer && (
                  <div className="rounded-lg border border-emerald-300 bg-white px-4 py-3">
                    <p className="text-sm font-semibold text-emerald-700 mb-1">下一堂</p>
                    <p className="text-lg font-bold text-gray-950">{scheduledTimer.title || '未命名課程'}</p>
                    <p className="text-gray-700">
                      {scheduledTimer.startTime} - {scheduledTimer.endTime}
                    </p>
                  </div>
                )}
              </div>

              <div className="grid md:grid-cols-3 gap-6 mb-5">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">下一堂標題</label>
                  <input
                    type="text"
                    value={nextTitle}
                    onChange={(e) => setNextTitle(e.target.value)}
                    placeholder="例如：第二堂、Q&A"
                    className={inputClassName}
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">下一堂開始</label>
                  <input
                    type="time"
                    value={nextStartTime}
                    onChange={(e) => setNextStartTime(e.target.value)}
                    className={inputClassName}
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">下一堂結束</label>
                  <input
                    type="time"
                    value={nextEndTime}
                    onChange={(e) => setNextEndTime(e.target.value)}
                    className={inputClassName}
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={handleScheduleNext}
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-3 font-semibold text-white hover:bg-emerald-700 transition-colors"
                >
                  <Plus size={18} />
                  預排下一堂
                </button>
                {scheduledTimer && (
                  <>
                    <button
                      onClick={handleStartScheduledTimer}
                      className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700 transition-colors"
                    >
                      <Play size={18} />
                      開始下一堂
                    </button>
                    <button
                      onClick={handleClearScheduledTimer}
                      className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-5 py-3 font-semibold text-gray-900 hover:bg-gray-100 transition-colors"
                    >
                      <Trash2 size={18} />
                      清除下一堂
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Message Section */}
          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">訊息管理</h2>
            
            <div className="flex gap-4 mb-6">
              <div className="flex-1">
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="輸入要發送的訊息..."
                  className={inputClassName}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                />
              </div>
              <button
                onClick={handleSendMessage}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                <Send size={20} />
                發送
              </button>
            </div>

            <div className="space-y-4">
              {messages.map((msg) => (
                <div key={msg.id} className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <MessageCircle size={20} className="text-gray-600" />
                    <span className="text-gray-900">{msg.content}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">
                      {new Date(msg.createdAt).toLocaleString('zh-TW')}
                    </span>
                    <button
                      onClick={() => handleDeleteMessage(msg.id)}
                      className="text-red-600 hover:text-red-700 p-2 rounded-lg hover:bg-red-50 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
