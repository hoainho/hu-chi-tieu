# Personal Finance Dashboard - Development Context

## Project Overview

The Personal Finance Dashboard is a comprehensive React-based personal finance management application built with TypeScript, Firebase, and Redux Toolkit. It provides users with tools to track transactions, manage assets, set savings goals, and handle couple's finances with multi-currency support.

### Key Features
- **Multi-currency transactions** (VND, USD, EUR, JPY) with exchange rates
- **Asset management** with support for stocks, crypto, real estate, and other investments
- **Envelope budgeting** system for visual budget management
- **Savings goals** tracking with deadlines and progress
- **Couple's finance** support for shared financial management
- **Offline support** using Firestore's persistent cache
- **Investment tracking** with market data integration
- **Spending source management** (bank accounts, cash, e-wallets)

### Technology Stack
- **Frontend**: React 19, TypeScript
- **State Management**: Redux Toolkit with React-Redux
- **Backend**: Firebase (Authentication, Firestore, Cloud Functions)
- **Build Tool**: Vite
- **Styling**: Tailwind CSS (implied from component classes)
- **Charts**: Recharts for data visualization
- **AI Integration**: Qwen AI agent for coding assistance

### Architecture

#### Directory Structure
```
├── components/           # React components organized by feature
│   ├── accounts/        # Account management
│   ├── assets/          # Asset tracking
│   ├── auth/            # Authentication components
│   ├── dashboard/       # Dashboard components
│   ├── envelopes/       # Envelope budgeting
│   ├── management/      # Transaction/income management
│   ├── savings/         # Savings goals
│   ├── transactions/    # Transaction forms and management
│   └── ui/              # Reusable UI components
├── context/             # React Context providers
├── hooks/               # Custom React hooks
├── services/            # Firebase and external API services
├── store/               # Redux store and slices
├── types/               # TypeScript type definitions
├── utils/               # Utility functions
├── functions/           # Firebase Cloud Functions
├── public/              # Static assets
├── styles/              # CSS styles
└── scripts/             # Build/deployment scripts
```

#### State Management (Redux Store)
The application uses Redux Toolkit with the following slices:
- `userSlice` - User profile and authentication state
- `accountSlice` - Account management
- `transactionSlice` - Transaction handling
- `incomeSlice` - Income source tracking
- `investmentSlice` - Investment data
- `budgetSlice` - Budget management
- `availableBalanceSlice` - Balance calculations
- `spendingSourceSlice` - Spending source tracking
- `savingsGoalSlice` - Savings goal management

#### Data Models
Key interfaces defined in `types/index.ts`:
- `Transaction` - Financial transactions with multi-currency support
- `Asset` - Investment assets (union type for fixed vs market assets)
- `SpendingSource` - Different money sources (banks, cash, etc.)
- `SavingsGoal` - Financial goals with deadlines
- `Envelope` - Budgeting envelopes
- `UserProfile` - User account information

## Building and Running

### Prerequisites
- Node.js 18+
- Firebase CLI
- Firebase project with Firestore, Auth, Functions enabled

### Development Setup
1. Install dependencies: `npm install`
2. Set up Firebase project and update `services/firebase.ts` with your config
3. Run development server: `npm run dev`
4. For Firebase emulators: `npm run firebase:emulators`

### Key Commands
- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally
- `npm run test` - Run unit tests with Vitest
- `npm run lint` - Run ESLint linter
- `npm run lint:fix` - Fix lint issues automatically
- `npm run type-check` - Run TypeScript type checking
- `npm run firebase:emulators` - Start Firebase local emulators
- `npm run firebase:deploy` - Deploy to Firebase

### AI Agent Integration
The project includes Qwen AI agent integration for coding assistance:
- `run_agent.py` - Command-line interface for code assistance
- `gui.py` - GUI interface for the AI agent
- Uses Ollama with Qwen3-coder:30b model via OpenAI-compatible API

## Development Conventions

### Code Style
- TypeScript with strict typing
- Functional React components with hooks
- Redux Toolkit for state management
- Firebase for backend services
- Component organization by feature in the components directory

### Security
- Firebase security rules for data protection
- User authentication with Firebase Auth
- Data validation and sanitization
- Note: Current Firebase config in code should be replaced with environment variables in production

### Testing
- Unit tests using Vitest (configured in package.json)
- Testing setup exists but test files need to be reviewed (tests/ directory)

## Key Integration Points

### Firebase Integration
- Authentication with email/password
- Firestore for data persistence with offline support
- Cloud Functions for server-side logic
- Security rules for data access control

### Currency Management
- Multi-currency support with VND as base currency
- Exchange rate handling for transactions
- Currency conversion utilities

### Market Data
- Asset tracking with market prices for stocks/crypto
- Portfolio summary calculations
- Gain/loss calculations for investments

## Future Enhancement Areas

1. **Security**: Move Firebase config to environment variables
2. **Testing**: Add comprehensive unit and integration tests
3. **Performance**: Implement pagination for large data sets
4. **Accessibility**: Enhance ARIA attributes and keyboard navigation
5. **Documentation**: Add API documentation and contribution guidelines
6. **CI/CD**: Set up automated testing and deployment pipeline

This project provides a solid foundation for personal financial management with advanced features for investment tracking and couple's finance management.