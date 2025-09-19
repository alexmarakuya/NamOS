import type { Meta, StoryObj } from '@storybook/react';
import { LoadingSpinner, LoadingOverlay, LoadingState } from './LoadingSpinner';

const meta = {
  title: 'Components/LoadingSpinner',
  component: LoadingSpinner,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: { type: 'select' },
      options: ['sm', 'md', 'lg'],
    },
  },
} satisfies Meta<typeof LoadingSpinner>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Small: Story = {
  args: {
    size: 'sm',
  },
};

export const Medium: Story = {
  args: {
    size: 'md',
  },
};

export const Large: Story = {
  args: {
    size: 'lg',
  },
};

export const WithText: Story = {
  args: {
    size: 'md',
    text: 'Loading data...',
  },
};

// LoadingOverlay stories
const overlayMeta = {
  title: 'Components/LoadingOverlay',
  component: LoadingOverlay,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof LoadingOverlay>;

export const OverlayActive: StoryObj<typeof overlayMeta> = {
  args: {
    isLoading: true,
    text: 'Processing...',
    children: (
      <div className="w-64 h-32 bg-gray-100 rounded-lg flex items-center justify-center">
        <p className="text-gray-600">Content behind overlay</p>
      </div>
    ),
  },
};

export const OverlayInactive: StoryObj<typeof overlayMeta> = {
  args: {
    isLoading: false,
    children: (
      <div className="w-64 h-32 bg-gray-100 rounded-lg flex items-center justify-center">
        <p className="text-gray-600">Content visible</p>
      </div>
    ),
  },
};

// LoadingState stories
const stateMeta = {
  title: 'Components/LoadingState',
  component: LoadingState,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof LoadingState>;

export const StateLoading: StoryObj<typeof stateMeta> = {
  args: {
    isLoading: true,
    loadingText: 'Fetching data...',
    children: <div>Content</div>,
  },
};

export const StateError: StoryObj<typeof stateMeta> = {
  args: {
    isLoading: false,
    error: 'Failed to load data. Please try again.',
    children: <div>Content</div>,
  },
};

export const StateEmpty: StoryObj<typeof stateMeta> = {
  args: {
    isLoading: false,
    isEmpty: true,
    emptyText: 'No items found',
    children: <div>Content</div>,
  },
};

export const StateWithContent: StoryObj<typeof stateMeta> = {
  args: {
    isLoading: false,
    children: (
      <div className="w-64 h-32 bg-blue-100 rounded-lg flex items-center justify-center">
        <p className="text-blue-800">Loaded content</p>
      </div>
    ),
  },
};
