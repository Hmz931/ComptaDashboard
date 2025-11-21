# ComptaDashboard

ComptaDashboard is an app that converts general ledger data extracted from F11 (Abacus) into an interactive dashboard, offering clear visualizations of financial flows, balances, and key indicators to deliver actionable accounting insights.

## Features

- **Excel GL Import**: Upload Abacus F11 general ledger files in Excel format
- **Interactive Dashboard**: Real-time account tracking and visualization
- **Financial Analysis**: Year-over-year comparisons, ratio analysis, and trend analysis
- **Multi-year Support**: Analyze data across multiple fiscal years
- **Export Capabilities**: Download clean GL data, financial statements, and charts
- **Account Filtering**: Search and filter by category, account number, or time period
- **Financial Statements**: Auto-generated income statements and balance sheets
- **Chart Export**: Export visualization as PNG images

## Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS, Shadcn UI
- **Charts**: Recharts for interactive visualizations
- **File Processing**: XLSX for Excel file parsing
- **Backend**: Express.js (Node.js)
- **Styling**: Tailwind CSS with Radix UI components

## Installation

1. Clone the repository:
```bash
git clone https://github.com/Hmz931/ComptaDashboard.git
cd ComptaDashboard
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

The app will be available at http://localhost:5000

## Usage

1. **Upload GL File**: Click "Importer" and select your Abacus F11 Excel file
2. **Analyze Data**: Use the dashboard to view:
   - Account evolution over time
   - Comparative analysis across years
   - Detailed transaction history
   - Financial summaries and ratios
3. **Export Results**: Download processed data and visualizations using the Export menu

## Project Structure

```
├── client/
│   ├── src/
│   │   ├── pages/          # React pages (dashboard, comparison, ratios, etc.)
│   │   ├── lib/            # Utilities (Excel processor, data context)
│   │   ├── components/     # Reusable UI components
│   │   └── main.tsx        # App entry point
│   └── index.html          # HTML template
├── server/                 # Backend API (Express)
├── shared/                 # Shared types and schemas
└── package.json
```

## Features in Detail

### Dashboard
- Real-time account balance tracking
- Multi-account comparison
- Category-based filtering
- Date range selection

### Comparison Tab
- Year-over-year analysis
- Category grouping (Swiss accounting 2-digit structure)
- Cumulative balance calculations for balance sheet accounts
- Category selection and filtering

### Financial Reports
- Balance sheet (Assets, Liabilities, Equity)
- Income statement (Revenues, Expenses)
- Key financial ratios (Profitability, Liquidity, Solvency)

### Data Export
- Clean General Ledger (XLSX)
- Financial Statements (XLSX)
- Chart of Accounts (XLSX)
- Chart visualizations (PNG)

## License

MIT

## Author

Hamza Bouguerra
