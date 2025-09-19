import type { Meta, StoryObj } from '@storybook/react';
import StatCard from './StatCard';

const meta = {
  title: 'Components/StatCard',
  component: StatCard,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    changeType: {
      control: { type: 'select' },
      options: ['positive', 'negative', 'neutral'],
    },
  },
} satisfies Meta<typeof StatCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    title: 'Total Revenue',
    value: '$24,500',
  },
};

export const WithPositiveChange: Story = {
  args: {
    title: 'Active Projects',
    value: '12',
    change: '+15%',
    changeType: 'positive',
  },
};

export const WithNegativeChange: Story = {
  args: {
    title: 'Pending Tasks',
    value: '8',
    change: '-5%',
    changeType: 'negative',
  },
};

export const WithNeutralChange: Story = {
  args: {
    title: 'Team Members',
    value: '6',
    change: '0%',
    changeType: 'neutral',
  },
};

export const LargeNumbers: Story = {
  args: {
    title: 'Total Transactions',
    value: '1,234,567',
    change: '+12.5%',
    changeType: 'positive',
  },
};
