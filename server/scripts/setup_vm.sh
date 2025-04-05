#!/bin/bash

# Update system
sudo apt update && sudo apt upgrade -y

# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt-get install -y nodejs

# Create database user and database
sudo -u postgres psql -c "CREATE USER vincenttrung WITH SUPERUSER PASSWORD 'vincenttrung';"
sudo -u postgres psql -c "CREATE DATABASE StockApp;"

# Import database schema
psql -U vincenttrung -d StockApp -f database.sql

# Install Node.js dependencies
npm install pg csv-parse

# Import stock data
node importStockData.js complete_SP500History.csv

# Configure PostgreSQL for remote access
PG_VERSION=$(ls /etc/postgresql/)
sudo sed -i "s/#listen_addresses = 'localhost'/listen_addresses = '*'/" /etc/postgresql/$PG_VERSION/main/postgresql.conf

# Add this to pg_hba.conf (replace YOUR_APP_IP with your actual application server IP)
echo "host    all             all             0.0.0.0/0               md5" | sudo tee -a /etc/postgresql/$PG_VERSION/main/pg_hba.conf

# Restart PostgreSQL
sudo systemctl restart postgresql

echo "Setup completed!" 