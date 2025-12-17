# Database Schema

The database uses a normalized design with four main tables:

1. **stocks** - Single source of truth for stock market data (one row per ticker)
   - Stores ticker, company name, current price, dividend info
   - Supports stocks, ETFs, and mutual funds via `security_type` field
   - Includes sector, country, market cap classification, and style
   - Optional allocations for ETFs/mutual funds (sector, country, style-market cap)

2. **positions** - Individual purchase lots (many rows per ticker)
   - Links to stocks via foreign key
   - Stores quantity, cost basis, purchase date
   - Optional account association

3. **accounts** - Brokerage account management
   - Stores account name and platform (Fidelity, Robinhood, etc.)
   - Positions and dividends can be associated with accounts

4. **dividends** - Dividend payment tracking
   - Links to stocks via foreign key
   - Stores date, amount, and reinvestment status
   - Optional account association
   - Indexed for efficient date and ticker queries
