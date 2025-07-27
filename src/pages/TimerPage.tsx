import React, { useState, useEffect, useRef } from 'react';
import { TimerDisplay, ControlPanel, ReflectionModal } from '../components';
import { useTimer } from '../contexts/TimerContext';
import { TimerState } from '../types';
import './TimerPage.css';

export const TimerPage: React.FC = () => {
  const { state, getCurrentSessionId, updateReflectionSummary, getSessionHistory, startRest, cancel } = useTimer();
  const [reflectionContent, setReflectionContent] = useState('');
  const [isReflectionModalOpen, setIsReflectionModalOpen] = useState(false);
  const [userClosedModal, setUserClosedModal] = useState(false);
  
  // 监听反思状态变化
  useEffect(() => {

    if (state.currentState === TimerState.REFLECTION) {
      // 只在用户未手动关闭时自动打开
      if (!userClosedModal) {
        setIsReflectionModalOpen(true);
      }
    } else {
      // 非反思状态时重置状态
      setIsReflectionModalOpen(false);
      setUserClosedModal(false);
    }
  }, [state.currentState, userClosedModal]);



  // 只在进入反思状态时加载内容，避免覆盖用户输入
  useEffect(() => {
    if (state.currentState === TimerState.REFLECTION) {
      const sessionId = getCurrentSessionId();
      if (sessionId) {
        const history = getSessionHistory();
        const focusSession = history.find(record => record.id === sessionId);
        const content = focusSession?.reflectionSummary?.content || '';
        // 只在内容为空时设置，避免覆盖用户正在编辑的内容
        if (reflectionContent === '') {
          setReflectionContent(content);
        }
      }
    } else {
      // 离开反思状态时清空内容
      setReflectionContent('');
    }
  }, [state.currentState, getCurrentSessionId]); // 移除 getSessionHistory 依赖
  
  const handleReflectionSave = (content: string) => {
    const sessionId = getCurrentSessionId();

    if (sessionId) {
      try {
        updateReflectionSummary(sessionId, content);

      } catch (error) {
        console.error('保存反思总结失败:', error);
      }
    } else {

    }
  };

  const handleCloseReflectionModal = () => {
    setIsReflectionModalOpen(false);
    setUserClosedModal(true);
  };

  const handleOpenReflectionModal = () => {
    if (state.currentState === TimerState.REFLECTION) {
      setIsReflectionModalOpen(true);
      setUserClosedModal(false);
    }
  };

  // 自定义状态切换方法，传递反思内容
  const handleStartRest = () => {

    startRest(reflectionContent);
  };

  const handleCancel = () => {

    cancel(reflectionContent);
  };

  return (
    <div className="timer-page">
      <div className="timer-container">
        <TimerDisplay />
        <ControlPanel 
          customStartRest={handleStartRest}
          customCancel={handleCancel}
          onOpenReflection={handleOpenReflectionModal}
        />
      </div>
      
      {/* 反思模态框 */}
      <ReflectionModal
        isOpen={isReflectionModalOpen}
        onClose={handleCloseReflectionModal}
        value={reflectionContent}
        onChange={setReflectionContent}
        onSave={handleReflectionSave}
        placeholder="记录你的专注成果和反思..."
      />
    </div>
  );
};