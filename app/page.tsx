"use client"

import React, { useState, useEffect, useCallback } from 'react';
import { Clock, MessageCircle } from 'lucide-react';

interface Message {
  id: number;
  content: string;
  isVisible: boolean;
  createdAt: string;
  updatedAt: string;
}

type TimerStatus = 'active' | 'break' | 'extended' | 'paused';

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

export default function ClassTimerDashboard() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeTimer, setActiveTimer] = useState<Timer | null>(null);
  const [showAnimation, setShowAnimation] = useState(false);
  const [lastMessageId, setLastMessageId] = useState<number | null>(null);


  const loadMessages = useCallback(async () => {
    try {
      const response = await fetch('/api/messages');
      const data = await response.json();
      setMessages(data);
      
      // Check if there's a new message
      if (data.length > 0 && data[0].id !== lastMessageId) {
        setLastMessageId(data[0].id);
        setShowAnimation(true);
        
        // Hide animation after 5 seconds
        setTimeout(() => {
          setShowAnimation(false);
        }, 5000);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  }, [lastMessageId]);
  
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    loadMessages();
    loadActiveTimer();
    const messageInterval = setInterval(loadMessages, 5000);
    const timerInterval = setInterval(loadActiveTimer, 2000);

    return () => {
      clearInterval(timer);
      clearInterval(messageInterval);
      clearInterval(timerInterval);
    };
  }, [loadMessages]);

  const loadActiveTimer = async () => {
    try {
      const response = await fetch('/api/timers');
      const data = await response.json();
      const active = data.find((timer: Timer) => timer.isActive);
      setActiveTimer(active || null);
    } catch (error) {
      console.error('Error loading active timer:', error);
    }
  };


  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
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

  const getProgress = () => {
    if (!activeTimer) return 0;
    
    const now = new Date();
    const [startHours, startMinutes] = activeTimer.startTime.split(':').map(Number);
    const [endHours, endMinutes] = activeTimer.endTime.split(':').map(Number);
    
    const startDate = new Date();
    startDate.setHours(startHours, startMinutes, 0, 0);
    const endDate = new Date();
    endDate.setHours(endHours, endMinutes, 0, 0);
    
    const totalDuration = endDate.getTime() - startDate.getTime();
    const elapsed = now.getTime() - startDate.getTime();
    
    return Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));
  };

  const timeRemaining = getTimeRemaining();
  const progress = getProgress();
  const activeStatus = activeTimer?.status || 'active';
  const isClassActive = activeTimer?.isActive && timeRemaining.totalSeconds > 0;
  const isClassEnded = activeTimer && timeRemaining.totalSeconds === 0;
  const statusLabel = isClassEnded
    ? '已完成'
    : activeStatus === 'break'
      ? '休息中'
      : activeStatus === 'extended'
        ? '延長中'
        : isClassActive
          ? '進行中'
          : '未開始';

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="h-full">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 h-full flex flex-col">
          <div className="text-center mb-6">
            <h1 className="text-6xl font-bold text-gray-900 mb-2">
              {activeTimer && activeTimer.title ? activeTimer.title : '課堂計時器'}
            </h1>
            <p className="text-gray-500">追蹤課堂時間進度</p>
          </div>

          {/* Admin Panel Link */}
          {!activeTimer && (
            <div className="text-center mb-8">
              <p className="text-gray-600 mb-4">目前沒有進行中的課程</p>
              <a
                href="/admin"
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                前往管理員面板
              </a>
            </div>
          )}

          {/* Status Display */}
          {activeTimer && (
            <div className="flex-1 flex flex-col">
              <div className="grid md:grid-cols-3 gap-6 mb-8">
                {/* Current Time */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
                  <div className="flex items-center justify-center gap-2 mb-4">
                    <Clock size={32} className="text-gray-600" />
                    <h3 className="text-2xl font-medium text-gray-900">目前時間</h3>
                  </div>
                  <p className="text-6xl font-semibold text-gray-900">{formatTime(currentTime)}</p>
                </div>

                {/* Time Remaining */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
                  <h3 className="text-2xl font-medium text-gray-900 mb-4">剩餘時間</h3>
                  <div className="text-6xl font-semibold text-gray-900">
                    {isClassEnded ? (
                      '課程結束'
                    ) : (
                      <div className="flex justify-center items-baseline gap-2">
                        <div className="flex flex-col items-center">
                          <span>{timeRemaining.hours.toString().padStart(2, '0')}</span>
                          <span className="text-lg text-gray-600">時</span>
                        </div>
                        <span className="text-4xl">:</span>
                        <div className="flex flex-col items-center">
                          <span>{timeRemaining.minutes.toString().padStart(2, '0')}</span>
                          <span className="text-lg text-gray-600">分</span>
                        </div>
                        <span className="text-4xl">:</span>
                        <div className="flex flex-col items-center">
                          <span>{timeRemaining.seconds.toString().padStart(2, '0')}</span>
                          <span className="text-lg text-gray-600">秒</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Class Status */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
                  <h3 className="text-2xl font-medium text-gray-900 mb-4">狀態</h3>
                  <p className="text-4xl font-semibold text-gray-900">
                    {statusLabel}
                  </p>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mb-6">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-lg font-medium text-gray-700">課程進度</span>
                  <span className="text-lg font-medium text-gray-700">{Math.round(progress)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-4">
                  <div 
                    className="bg-gray-900 h-4 rounded-full transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
              </div>

              {/* Class Duration Info */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
                <p className="text-lg text-gray-600">
                  {activeTimer.title && <span className="font-medium text-gray-900 block mb-2">{activeTimer.title}</span>}
                  課程時間從 <span className="font-medium text-gray-900">{activeTimer.startTime}</span> 到 <span className="font-medium text-gray-900">{activeTimer.endTime}</span>
                </p>
              </div>
            </div>
          )}

          {/* Messages Section */}
          {messages.length > 0 && (
            <div className="mt-8">
              <div className="flex items-center gap-2 mb-4">
                <MessageCircle size={24} className={`text-gray-600 ${showAnimation ? 'animate-pulse' : ''}`} />
                <h2 className="text-2xl font-medium text-gray-900">訊息</h2>
              </div>
              <div className={`${showAnimation ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-300 shadow-lg animate-pulse' : 'bg-blue-50 border border-blue-200'} rounded-lg p-6`}>
                <div className={`text-gray-900 text-center whitespace-pre-wrap ${showAnimation ? 'text-3xl font-bold animate-bounce' : 'text-2xl font-medium'}`}>
                  {messages[0].content}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
