import React, { useState } from 'react';
import { ProjectSpirit, SpiritInsight, Project, Task, TimeEntry } from '../types';
import { useSpiritInsights, useSpiritOperations } from '../hooks/useSupabase';
import { spiritAI } from '../lib/ai';

interface SpiritInsightsProps {
  spirit: ProjectSpirit;
  project: Project;
  tasks: Task[];
  timeEntries: TimeEntry[];
}

const SpiritInsights: React.FC<SpiritInsightsProps> = ({ 
  spirit, 
  project, 
  tasks, 
  timeEntries 
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const { insights, refetch: refetchInsights } = useSpiritInsights(spirit.id);
  const { addInsight, markInsightRead } = useSpiritOperations();

  const generateInsights = async () => {
    setIsGenerating(true);
    try {
      const newInsights = await spiritAI.generateProjectInsights(
        spirit,
        project,
        tasks,
        timeEntries
      );

      for (const insight of newInsights) {
        await addInsight({
          spirit_id: spirit.id,
          type: insight.type,
          title: insight.title,
          description: insight.description,
          confidence: insight.confidence,
          data: insight.data,
        });
      }

      await refetchInsights();
    } catch (error) {
      console.error('Error generating insights:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleMarkRead = async (insightId: string) => {
    try {
      await markInsightRead(insightId);
      await refetchInsights();
    } catch (error) {
      console.error('Error marking insight as read:', error);
    }
  };

  const getInsightIcon = (type: SpiritInsight['type']) => {
    switch (type) {
      case 'task_suggestion':
        return (
          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
        );
      case 'risk_alert':
        return (
          <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
        );
      case 'opportunity':
        return (
          <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
        );
      case 'pattern':
        return (
          <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
        );
      case 'client_update':
        return (
          <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
        );
      default:
        return (
          <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600 bg-green-100';
    if (confidence >= 0.6) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const unreadInsights = insights.filter(insight => !insight.is_read);
  const readInsights = insights.filter(insight => insight.is_read);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-neutral-900 font-epilogue">
          AI Insights
          {unreadInsights.length > 0 && (
            <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              {unreadInsights.length} new
            </span>
          )}
        </h3>
        <button
          onClick={generateInsights}
          disabled={isGenerating}
          className="text-xs text-blue-600 hover:text-blue-700 font-epilogue disabled:text-neutral-400"
        >
          {isGenerating ? 'Generating...' : 'Generate'}
        </button>
      </div>

      <div className="space-y-3">
        {insights.length === 0 ? (
          <div className="text-center py-6">
            <div className="w-12 h-12 bg-neutral-100 rounded-lg flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <p className="text-sm text-neutral-500 font-epilogue mb-2">No insights yet</p>
            <button
              onClick={generateInsights}
              disabled={isGenerating}
              className="text-xs text-blue-600 hover:text-blue-700 font-epilogue disabled:text-neutral-400"
            >
              {isGenerating ? 'Generating insights...' : 'Generate first insights'}
            </button>
          </div>
        ) : (
          <>
            {/* Unread Insights */}
            {unreadInsights.map((insight) => (
              <div
                key={insight.id}
                className="p-3 bg-blue-50 border border-blue-200 rounded-lg cursor-pointer hover:bg-blue-100 transition-colors"
                onClick={() => handleMarkRead(insight.id)}
              >
                <div className="flex items-start space-x-3">
                  {getInsightIcon(insight.type)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="text-sm font-medium text-neutral-900 font-epilogue">
                        {insight.title}
                      </h4>
                      <div className="flex items-center space-x-2">
                        <span className={`text-xs px-2 py-1 rounded-full ${getConfidenceColor(insight.confidence)}`}>
                          {Math.round(insight.confidence * 100)}%
                        </span>
                        <span className="text-xs text-neutral-500 font-epilogue">
                          {formatTimeAgo(insight.created_at)}
                        </span>
                      </div>
                    </div>
                    <p className="text-sm text-neutral-600 font-epilogue">
                      {insight.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}

            {/* Read Insights */}
            {readInsights.slice(0, 3).map((insight) => (
              <div
                key={insight.id}
                className="p-3 bg-white border border-neutral-200 rounded-lg opacity-60"
              >
                <div className="flex items-start space-x-3">
                  {getInsightIcon(insight.type)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="text-sm font-medium text-neutral-900 font-epilogue">
                        {insight.title}
                      </h4>
                      <div className="flex items-center space-x-2">
                        <span className={`text-xs px-2 py-1 rounded-full ${getConfidenceColor(insight.confidence)}`}>
                          {Math.round(insight.confidence * 100)}%
                        </span>
                        <span className="text-xs text-neutral-500 font-epilogue">
                          {formatTimeAgo(insight.created_at)}
                        </span>
                      </div>
                    </div>
                    <p className="text-sm text-neutral-600 font-epilogue">
                      {insight.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}

            {readInsights.length > 3 && (
              <p className="text-xs text-neutral-500 font-epilogue text-center">
                {readInsights.length - 3} more insights...
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default SpiritInsights;
