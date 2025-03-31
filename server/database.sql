CREATE DATABASE StockApp;

-- Drop existing tables if they exist
DROP TABLE IF EXISTS Review CASCADE;
DROP TABLE IF EXISTS SharedStockList CASCADE;
DROP TABLE IF EXISTS FriendRequest CASCADE;
DROP TABLE IF EXISTS StockListItem CASCADE;
DROP TABLE IF EXISTS StockList CASCADE;
DROP TABLE IF EXISTS StockData CASCADE;
DROP TABLE IF EXISTS StockHolding CASCADE;
DROP TABLE IF EXISTS Stock CASCADE;
DROP TABLE IF EXISTS Portfolio CASCADE;
DROP TABLE IF EXISTS Users CASCADE;
DROP TABLE IF EXISTS StockTransaction CASCADE; 

-- Users table
CREATE TABLE Users (
    userid SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Portfolio table
CREATE TABLE Portfolio (
    portfolioid SERIAL PRIMARY KEY,
    userid INTEGER REFERENCES Users(userid),
    name VARCHAR(100) NOT NULL,
    cashBalance DECIMAL(15, 2) DEFAULT 0.00
);

-- Stock table
CREATE TABLE Stock (
    symbol VARCHAR(10) PRIMARY KEY,
    company_name VARCHAR(100) NOT NULL
);

-- Daily price data
CREATE TABLE StockData (
    symbol VARCHAR(10) REFERENCES Stock(symbol),
    date DATE NOT NULL,
    open_price DECIMAL(10, 2),
    high_price DECIMAL(10, 2),
    low_price DECIMAL(10, 2),
    close_price DECIMAL(10, 2),
    volume BIGINT,
    PRIMARY KEY (symbol, date)
);

-- Stock holdings (fixed table name to match)
CREATE TABLE StockHolding (
    holdingid SERIAL PRIMARY KEY,
    portfolioid INTEGER REFERENCES Portfolio(portfolioid),
    symbol VARCHAR(10) REFERENCES Stock(symbol), 
    quantity INTEGER NOT NULL
);

-- StockList table
CREATE TABLE StockList (
    listid SERIAL PRIMARY KEY,
    userid INTEGER REFERENCES Users(userid),
    name VARCHAR(100) NOT NULL,
    visibility VARCHAR(10) NOT NULL CHECK (visibility IN ('private', 'shared', 'public')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- StockList items
CREATE TABLE StockListItem (
    itemid SERIAL PRIMARY KEY,
    listid INTEGER REFERENCES StockList(listid),
    symbol VARCHAR(10) REFERENCES Stock(symbol), 
    quantity INTEGER NOT NULL
);

-- FriendRequest table (fixed syntax)
CREATE TABLE FriendRequest (
    requestid SERIAL PRIMARY KEY,
    sender_userid INTEGER REFERENCES Users(userid),
    receiver_userid INTEGER REFERENCES Users(userid),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    rejected_time TIMESTAMP, -- Added comma
    CHECK (
        (status = 'rejected' AND rejected_time IS NOT NULL) OR
        (status <> 'rejected' AND rejected_time IS NULL)
    )
);

-- Review table
CREATE TABLE Review (
    reviewid SERIAL PRIMARY KEY,
    userid INTEGER REFERENCES Users(userid),
    listid INTEGER REFERENCES StockList(listid),
    content TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    edited_at TIMESTAMP,
    UNIQUE (userid, listid) -- One review per user per list
);

-- Shared stock lists
CREATE TABLE SharedStockList (
    listid INTEGER REFERENCES StockList(listid),
    shared_with_userid INTEGER REFERENCES Users(userid),
    PRIMARY KEY (listid, shared_with_userid)
);

-- Mutual friendships
CREATE TABLE Friend (
    user1_id INTEGER REFERENCES Users(userid),
    user2_id INTEGER REFERENCES Users(userid),
    friends_since TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user1_id, user2_id),
    CHECK (user1_id < user2_id) -- Prevent duplicates
);

-- StockTransaction table 
CREATE TABLE StockTransaction (
    transactionid SERIAL PRIMARY KEY,
    portfolioid INTEGER REFERENCES Portfolio(portfolioid),
    symbol VARCHAR(10) REFERENCES Stock(symbol),
    quantity INTEGER NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    type VARCHAR(4) CHECK (type IN ('BUY', 'SELL')),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_portfolio_userid ON Portfolio(userid);
CREATE INDEX idx_stockdata_symbol ON StockData(symbol);