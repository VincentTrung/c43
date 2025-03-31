# Stock Portfolio Manager

A full-stack web application for managing stock portfolios, tracking investments, and sharing stock lists with friends.

## Features

- User authentication (login/register)
- Portfolio management
  - Create and manage multiple portfolios
  - Track stock holdings
  - View portfolio performance
- Stock Lists
  - Create custom stock lists
  - Add/remove stocks from lists
  - View stock statistics and historical data
- Social Features
  - Add friends
  - Send and accept friend requests
  - View friends' portfolios
- Stock Analysis
  - Historical price charts
  - Statistical analysis (Coefficient of Variation, Beta Coefficient)
  - Stock search functionality

## Tech Stack

### Backend

- Node.js with Express.js
- PostgreSQL database
- RESTful API architecture

### Frontend

- React.js
- Material-UI for components
- Recharts for data visualization
- React Router for navigation
- Axios for API communication

## Prerequisites

- Node.js (v14 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn package manager

## Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd stock-portfolio-manager
```

2. Install backend dependencies:

```bash
cd server
npm install
```

3. Install frontend dependencies:

```bash
cd ../client
npm install
```

4. Set up the database:

```bash
# Start PostgreSQL service
# Create database and tables using the provided SQL scripts
```

5. Configure environment variables:

```bash
# Create .env file in server directory with:
DB_HOST=localhost
DB_PORT=5432
DB_NAME=stock_portfolio
DB_USER=your_username
DB_PASSWORD=your_password
JWT_SECRET=your_jwt_secret
```

## Running the Application

1. Start the backend server:

```bash
cd server
npm start
```

2. Start the frontend development server:

```bash
cd client
npm start
```

3. Open your browser and navigate to `http://localhost:3000`

## API Endpoints

### Authentication

- POST /api/auth/register - Register a new user
- POST /api/auth/login - Login user
- POST /api/auth/logout - Logout user
- GET /api/auth/check - Check authentication status

### Portfolios

- GET /api/portfolios - Get all portfolios
- POST /api/portfolios - Create a new portfolio
- GET /api/portfolios/:id - Get portfolio by ID
- PUT /api/portfolios/:id - Update portfolio
- DELETE /api/portfolios/:id - Delete portfolio
- POST /api/portfolios/:id/stocks - Add stock to portfolio
- DELETE /api/portfolios/:id/stocks/:symbol - Remove stock from portfolio
- PUT /api/portfolios/:id/stocks/:symbol - Update stock shares

### Stock Lists

- GET /api/stock-lists - Get all stock lists
- POST /api/stock-lists - Create a new stock list
- GET /api/stock-lists/:id - Get stock list by ID
- PUT /api/stock-lists/:id - Update stock list
- DELETE /api/stock-lists/:id - Delete stock list
- POST /api/stock-lists/:id/stocks - Add stock to list
- DELETE /api/stock-lists/:id/stocks/:symbol - Remove stock from list

### Stocks

- GET /api/stocks/:symbol/history - Get stock price history
- GET /api/stocks/:symbol/statistics - Get stock statistics
- GET /api/stocks/search - Search stocks

### Social

- GET /api/friends - Get all friends
- DELETE /api/friends/:id - Remove friend
- GET /api/friends/:id/portfolios - Get friend's portfolios
- GET /api/friend-requests/pending - Get pending friend requests
- GET /api/friend-requests/sent - Get sent friend requests
- POST /api/friend-requests - Send friend request
- POST /api/friend-requests/:id/accept - Accept friend request
- POST /api/friend-requests/:id/reject - Reject friend request

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
