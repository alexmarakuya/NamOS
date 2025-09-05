# Financial Dashboard

A comprehensive financial dashboard application to track income and expenses across multiple business units and personal finances.

## Features

- **Multi-Business Unit Support**: Track finances across different businesses and personal accounts
- **Interactive Dashboard**: Real-time overview with key financial metrics
- **Transaction Management**: Detailed transaction tracking with categories and tags
- **Visual Analytics**: Charts and graphs for financial insights
- **Modern UI**: Clean, responsive design built with React and Tailwind CSS

## Tech Stack

- **Frontend**: React 18 with TypeScript
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **Icons**: Lucide React
- **Date Handling**: date-fns

## Getting Started

### Prerequisites

- Node.js (version 16 or higher)
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm start
```

3. Open [http://localhost:3001](http://localhost:3001) to view the app in your browser.

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── StatCard.tsx    # Dashboard statistics cards
│   ├── TransactionTable.tsx  # Transaction data table
│   └── FinancialChart.tsx     # Financial charts
├── data/               # Mock data and data utilities
│   └── mockData.ts     # Sample transactions and categories
├── types/              # TypeScript type definitions
│   └── index.ts        # Core data types
└── App.tsx             # Main application component
```

## Available Scripts

- `npm start` - Runs the app in development mode
- `npm build` - Builds the app for production
- `npm test` - Launches the test runner
- `npm eject` - Ejects from Create React App (one-way operation)

## Customization

### Adding Business Units

Edit `src/data/mockData.ts` to add your business units:

```typescript
export const businessUnits: BusinessUnit[] = [
  { id: '1', name: 'Your Business Name', type: 'business', color: '#3b82f6' },
  // Add more business units
];
```

### Adding Categories

Customize income and expense categories in `src/data/mockData.ts`:

```typescript
export const categories: Category[] = [
  { id: '1', name: 'Your Category', type: 'income', color: '#10b981' },
  // Add more categories
];
```

## Future Enhancements

- Database integration (PostgreSQL/MongoDB)
- User authentication and multi-user support
- Export functionality (PDF/CSV)
- Budget planning and forecasting
- Mobile app version
- Integration with banking APIs
- Advanced reporting and analytics

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

This project is licensed under the MIT License.
