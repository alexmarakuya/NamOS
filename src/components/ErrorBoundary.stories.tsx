import type { Meta, StoryObj } from '@storybook/react';
import { ErrorBoundary } from './ErrorBoundary';
import React from 'react';

// Component that throws an error for demonstration
const ErrorThrowingComponent = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('This is a test error for Storybook');
  }
  return <div className="p-4 bg-green-100 text-green-800 rounded">Component working normally</div>;
};

const meta = {
  title: 'Components/ErrorBoundary',
  component: ErrorBoundary,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof ErrorBoundary>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Normal: Story = {
  args: {
    children: <ErrorThrowingComponent shouldThrow={false} />,
  },
};

export const WithError: Story = {
  args: {
    children: <ErrorThrowingComponent shouldThrow={true} />,
  },
};

export const WithCustomFallback: Story = {
  args: {
    children: <ErrorThrowingComponent shouldThrow={true} />,
    fallback: (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg text-center">
        <div className="w-12 h-12 mx-auto bg-red-100 rounded-full flex items-center justify-center mb-4">
          <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-red-900 mb-2">Custom Error Fallback</h3>
        <p className="text-red-700">Something went wrong with this component.</p>
      </div>
    ),
  },
};
