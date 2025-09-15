import React, { useState, useRef, useEffect } from 'react';
import { ProjectSpirit, Project, Task, TimeEntry } from '../types';
import { useSpiritOperations, useSpiritConversations } from '../hooks/useSupabase';
import { spiritAI } from '../lib/ai';

interface SpiritChatProps {
  spirit: ProjectSpirit;
  project: Project;
  tasks: Task[];
  timeEntries: TimeEntry[];
  isOpen: boolean;
  onClose: () => void;
}

const SpiritChat: React.FC<SpiritChatProps> = ({ 
  spirit, 
  project, 
  tasks, 
  timeEntries, 
  isOpen, 
  onClose 
}) => {
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const { conversations, refetch: refetchConversations } = useSpiritConversations(spirit.id);
  const { addConversation } = useSpiritOperations();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [conversations]);

  const handleSendMessage = async () => {
    if (!message.trim() || isLoading) return;

    const userMessage = message.trim();
    setMessage('');
    setIsLoading(true);

    try {
      // Generate AI response
      const response = await spiritAI.generateSpiritResponse(
        spirit,
        project,
        userMessage,
        {
          tasks,
          timeEntries,
          recentInsights: [], // TODO: Add insights when available
        }
      );

      if (response) {
        // Save conversation
        await addConversation({
          spirit_id: spirit.id,
          user_id: 'current_user', // TODO: Get actual user ID
          user_name: 'You', // TODO: Get actual user name
          message: userMessage,
          response: response,
          context: {
            project_id: project.id,
            tasks_count: tasks.length,
            recent_hours: timeEntries.slice(-7).reduce((sum, entry) => sum + entry.hours, 0),
          },
        });

        // Refresh conversations
        await refetchConversations();
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getSpiritAvatar = () => {
    const initials = spirit.name
      .split(' ')
      .map(word => word.charAt(0).toUpperCase())
      .slice(0, 2)
      .join('');
    
    const toneColors = {
      professional: 'bg-blue-500',
      casual: 'bg-green-500',
      creative: 'bg-purple-500',
      technical: 'bg-gray-500',
      consultative: 'bg-indigo-500',
    };
    
    return {
      initials,
      colorClass: toneColors[spirit.personality.tone] || 'bg-blue-500',
    };
  };

  const avatar = getSpiritAvatar();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl h-[600px] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-neutral-200">
          <div className="flex items-center space-x-3">
            <div className={`w-10 h-10 rounded-lg ${avatar.colorClass} flex items-center justify-center`}>
              <span className="text-white font-bold text-sm font-epilogue">
                {avatar.initials}
              </span>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-neutral-900 font-epilogue">
                {spirit.name}
              </h3>
              <p className="text-sm text-neutral-500 font-epilogue">
                {spirit.personality.communication_style}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {conversations.length === 0 ? (
            <div className="text-center py-8">
              <div className={`w-16 h-16 rounded-full ${avatar.colorClass} flex items-center justify-center mx-auto mb-4`}>
                <span className="text-white font-bold text-xl font-epilogue">
                  {avatar.initials}
                </span>
              </div>
              <h4 className="text-lg font-semibold text-neutral-900 font-epilogue mb-2">
                Hello! I'm {spirit.name}
              </h4>
              <p className="text-neutral-600 font-epilogue mb-4">
                I'm here to help you manage "{project.name}". I can assist with:
              </p>
              <div className="text-sm text-neutral-500 font-epilogue space-y-1">
                {spirit.personality.focus_areas.map((area, index) => (
                  <div key={index}>• {area.replace('_', ' ')}</div>
                ))}
              </div>
            </div>
          ) : (
            conversations.map((conversation) => (
              <div key={conversation.id} className="space-y-3">
                {/* User Message */}
                <div className="flex justify-end">
                  <div className="bg-blue-500 text-white rounded-2xl rounded-br-md px-4 py-2 max-w-xs">
                    <p className="text-sm font-epilogue">{conversation.message}</p>
                  </div>
                </div>
                
                {/* Spirit Response */}
                <div className="flex items-start space-x-3">
                  <div className={`w-8 h-8 rounded-lg ${avatar.colorClass} flex items-center justify-center flex-shrink-0`}>
                    <span className="text-white font-bold text-xs font-epilogue">
                      {avatar.initials}
                    </span>
                  </div>
                  <div className="bg-neutral-100 rounded-2xl rounded-bl-md px-4 py-2 max-w-xs">
                    <p className="text-sm text-neutral-900 font-epilogue whitespace-pre-wrap">
                      {conversation.response}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
          
          {isLoading && (
            <div className="flex items-start space-x-3">
              <div className={`w-8 h-8 rounded-lg ${avatar.colorClass} flex items-center justify-center flex-shrink-0`}>
                <span className="text-white font-bold text-xs font-epilogue">
                  {avatar.initials}
                </span>
              </div>
              <div className="bg-neutral-100 rounded-2xl rounded-bl-md px-4 py-2">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-6 border-t border-neutral-200">
          <div className="flex items-end space-x-3">
            <div className="flex-1">
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder={`Ask ${spirit.name} about the project...`}
                className="w-full resize-none border border-neutral-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-epilogue text-sm"
                rows={2}
                disabled={isLoading}
              />
            </div>
            <button
              onClick={handleSendMessage}
              disabled={!message.trim() || isLoading}
              className="bg-blue-500 hover:bg-blue-600 disabled:bg-neutral-300 text-white rounded-xl px-4 py-3 transition-colors flex items-center justify-center"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              )}
            </button>
          </div>
          <p className="text-xs text-neutral-500 font-epilogue mt-2">
            Press Enter to send, Shift+Enter for new line
          </p>
        </div>
      </div>
    </div>
  );
};

export default SpiritChat;
