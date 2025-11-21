import * as XLSX from 'xlsx';
import { Account, Transaction, FinancialStatementItem } from './mockData';
import { parse } from 'date-fns';

// Types for the processing logic
interface RawSheetRow {
  A?: string; // Date usually
  B?: string; // Text/Description
  C?: string;
  D?: string; // Contre ecriture
  E?: string; // Code
  F?: string; // Document
  G?: number | string; // Debit
  H?: number | string; // Credit
  I?: number | string; // Solde
  [key: string]: any;
}

// Constants from Python script
const ORIGIN_MAPPING: Record<string, string> = {
    'F': 'Comptabilité financière',
    'CF': 'Comptabilité financière ecriture multiple',
    'SF': 'Comptabilité financière ecriture multiple',
    'S': 'TVA',
    'K': 'Saisie facture d’achat',
    'k': 'Paiement facture d’achat',
    'D': 'Saisie facture de vente',
    'd': 'Paiement facture de vente',
    'Y': 'EBICS (Electronic Banking)',
    'L': 'Salaire (Lohn)',
    '': 'Écriture manuelle ou inconnue'
};

const NATURE_MAPPING: Record<string, string> = {
    '1': 'Actif',
    '2': 'Passif',
    '3': 'Produit',
    '4': 'Charge directe',
    '5': 'Charges de personnel',
    '6': 'Autres charges d’exploitation',
    '7': 'Charges/produits annexes',
    '8': 'Charges/produits extraordinaires',
    '9': 'Comptes auxiliaires/clôtures'
};

// Helper functions
const parseSheetName = (sheetName: string): { number: string, name: string } | null => {
    const match = sheetName.match(/_(\d+)_(.+)/) || sheetName.match(/(\d+)\s+(.+)/);
    if (match) {
        return {
            number: match[1],
            name: match[2].replace(/___/g, ' ').replace(/_/g, ' ')
        };
    }
    return null;
};

const isTvaRow = (row: RawSheetRow, lastDate: string | null): boolean => {
    // Python: is_no_date = pd.isna(row['A']) or not re.match(r'\\d{2}\\.\\d{2}\\.\\d{4}', str(row['A']))
    const dateVal = row['A'] ? String(row['A']) : '';
    // Check if empty or not a date
    const isNoDate = !dateVal || !/^\d{2}\.\d{2}\.\d{4}/.test(dateVal);
    
    // Python: has_amount = pd.notnull(row['G']) or pd.notnull(row['H']) or pd.notnull(row['I'])
    // Check if any amount column has a value (not undefined/null/empty string)
    const hasAmount = (row['G'] !== undefined && row['G'] !== '') || 
                      (row['H'] !== undefined && row['H'] !== '') || 
                      (row['I'] !== undefined && row['I'] !== '');
                      
    // Python: is_tva = str(row['D']).startswith(('117', '2200')) or re.search(r'TVA|VAT', str(row['B']), re.IGNORECASE)
    const contreEcr = row['D'] ? String(row['D']) : '';
    const text = row['B'] ? String(row['B']) : '';
    const isTva = contreEcr.startsWith('117') || contreEcr.startsWith('2200') || /TVA|VAT/i.test(text);

    return isNoDate && hasAmount && isTva && lastDate !== null;
};

const isChangeRow = (row: RawSheetRow): boolean => {
    const text = row['B'] ? String(row['B']).toLowerCase() : '';
    return text.startsWith('compensation de change');
};

const parseAmount = (val: any): number => {
    if (typeof val === 'number') return val;
    if (!val) return 0.0;
    // Handle Swiss formatting: 1'234.56 or 1,234.56
    // Replace apostrophes and handle commas
    const str = String(val).replace(/'/g, '').replace(/,/g, '.'); 
    const num = parseFloat(str);
    return isNaN(num) ? 0.0 : num;
};

export const processGLFile = async (file: File): Promise<{
    accounts: Account[],
    transactions: Transaction[],
    balanceSheet: FinancialStatementItem[],
    incomeStatement: FinancialStatementItem[],
    rawProcessedData: any
}> => {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    
    const allAccounts: Account[] = [];
    const allTransactions: Transaction[] = [];
    const rawCleanData: any[] = [];
    
    // --- STEP 1: Process Sheets (GL Cleaning) ---
    workbook.SheetNames.forEach((sheetName) => {
        const accountInfo = parseSheetName(sheetName);
        if (!accountInfo) return;

        const { number: accountNumber, name: accountName } = accountInfo;
        
        // Create Account
        const categoryPrefix = accountNumber.substring(0, 1);
        const categoryMap: Record<string, string> = {
            '1': '1xxx', '2': '2xxx', '3': '3xxx', '4': '4xxx', 
            '5': '5xxx', '6': '6xxx', '9': '9xxx'
        };
        
        // More specific category mapping for the dashboard logic
        let dashboardCategory = categoryMap[categoryPrefix] || 'Other';
        if (accountNumber.startsWith('10')) dashboardCategory = '10xx';
        if (accountNumber.startsWith('102')) dashboardCategory = '102x';
        if (accountNumber.startsWith('11')) dashboardCategory = '11xx';
        if (accountNumber.startsWith('20')) dashboardCategory = '20xx';
        if (/^[456]/.test(accountNumber)) dashboardCategory = '4-6xxx';
        if (accountNumber.startsWith('3')) dashboardCategory = '3xxx';
        if (accountNumber.startsWith('9')) dashboardCategory = '9xxx';

        const account: Account = {
            id: accountNumber,
            number: accountNumber,
            name: accountName,
            category: dashboardCategory
        };
        allAccounts.push(account);

        // Process Rows
        const sheet = workbook.Sheets[sheetName];
        // Convert to JSON with header mapping A, B, C...
        const jsonData = XLSX.utils.sheet_to_json<RawSheetRow>(sheet, { header: "A", range: 0 });
        
        // Need to find start date and initial balance logic similar to Python
        // Python looked for "Solde dd.mm.yyyy - dd.mm.yyyy"
        let startDate = '01.01.2023'; // Default
        let initialBalance = 0.0;

        // Find metadata rows first (usually at top)
        for (const row of jsonData) {
            const colA = row['A'] ? String(row['A']) : '';
            if (colA.includes('Solde') && colA.includes('-')) {
                const match = colA.match(/(\d{2}\.\d{2}\.\d{4})/);
                if (match) startDate = match[1];
            }
            if (colA === 'Report de solde') {
                initialBalance = parseAmount(row['I']);
            }
        }

        // Logic to process transactions
        let lastDate = startDate;
        let i = 0;
        
        // Add initial balance transaction
        allTransactions.push({
            id: `${accountNumber}-init`,
            date: parse(startDate, 'dd.MM.yyyy', new Date()).toISOString(),
            accountId: accountNumber,
            description: 'Report de solde',
            debit: initialBalance >= 0 ? initialBalance : 0,
            credit: initialBalance < 0 ? Math.abs(initialBalance) : 0,
            balance: initialBalance
        });

        while (i < jsonData.length) {
            const row = jsonData[i];
            const colA = row['A'];
            const colB = row['B'] ? String(row['B']) : '';

            // Skip URL rows
            if (!colA && colB.startsWith('http')) {
                i++; continue;
            }

            // Skip change rows
            if (isChangeRow(row)) {
                i++; continue;
            }

            // Main transaction row with date
            const dateStr = colA ? String(colA) : '';
            if (dateStr && /^\d{2}\.\d{2}\.\d{4}/.test(dateStr)) {
                lastDate = dateStr;
                let debit = parseAmount(row['G']);
                let credit = parseAmount(row['H']);
                let solde = parseAmount(row['I']);
                let code = row['E'] ? String(row['E']) : '';
                let doc = row['F'] ? String(row['F']) : '';
                let contre = row['D'] ? String(row['D']) : '';
                
                // Check next rows for TVA aggregation (Python logic)
                let j = i + 1;
                while (j < jsonData.length) {
                    const nextRow = jsonData[j];
                    if (isChangeRow(nextRow)) {
                        j++; continue;
                    }
                    if (isTvaRow(nextRow, lastDate)) {
                        debit += parseAmount(nextRow['G']);
                        credit += parseAmount(nextRow['H']);
                        // Solde is taken from the last TVA row in Python script logic, 
                        // but usually we want the running balance. 
                        if (nextRow['I']) solde = parseAmount(nextRow['I']);
                        j++;
                    } else {
                        break;
                    }
                }

                const origin = ORIGIN_MAPPING[code] || 'Écriture manuelle ou inconnue';
                
                // Add to transactions list
                // Use a random ID or compose one
                const txnDate = parse(dateStr, 'dd.MM.yyyy', new Date());
                
                if (debit !== 0 || credit !== 0) {
                    allTransactions.push({
                        id: `${accountNumber}-${i}`,
                        date: txnDate.toISOString(),
                        accountId: accountNumber,
                        description: colB,
                        debit: debit,
                        credit: credit,
                        balance: solde
                    });
                    
                    // Also keep raw clean data for export
                    rawCleanData.push({
                        Date: dateStr,
                        Texte: colB,
                        Compte: accountNumber,
                        'Contre écr': contre,
                        Code: code,
                        Origine: origin,
                        Document: doc,
                        'Débit': debit || '',
                        'Crédit': credit || '',
                        'Solde': solde
                    });
                }

                i = j; // Skip processed TVA rows
            } else {
                 // Handle TVA rows that might appear without a main row (edge case) or just skip
                 if (isTvaRow(row, lastDate)) {
                    // Should have been caught by the loop above, but if it's standalone:
                     let debit = parseAmount(row['G']);
                     let credit = parseAmount(row['H']);
                     let solde = parseAmount(row['I']);
                     const code = row['E'] ? String(row['E']) : '';
                     const origin = ORIGIN_MAPPING[code] || 'Écriture manuelle ou inconnue';

                     allTransactions.push({
                        id: `${accountNumber}-${i}-orphan-tva`,
                        date: parse(lastDate, 'dd.MM.yyyy', new Date()).toISOString(),
                        accountId: accountNumber,
                        description: colB,
                        debit: debit,
                        credit: credit,
                        balance: solde
                    });
                     rawCleanData.push({
                        Date: lastDate,
                        Texte: colB,
                        Compte: accountNumber,
                        'Contre écr': row['D'],
                        Code: code,
                        Origine: origin,
                        Document: row['F'],
                        'Débit': debit || '',
                        'Crédit': credit || '',
                        'Solde': solde
                    });
                 }
                 i++;
            }
        }
    });

    // --- STEP 2: Generate Financial Statements ---
    // Aggregating by year/account type
    const balanceSheetItems: FinancialStatementItem[] = [];
    const incomeStatementItems: FinancialStatementItem[] = [];

    // We need to group transactions by account and year to get Net
    // For the dashboard we usually just show the current state or total, 
    // but let's follow the python logic "yearly net"
    
    const accountYearlyNet: Record<string, number> = {}; // accountId -> net
    
    // Initialize with 0
    allAccounts.forEach(a => accountYearlyNet[a.id] = 0);

    allTransactions.forEach(t => {
        accountYearlyNet[t.accountId] += (t.debit - t.credit);
    });

    // Classify and Populate
    allAccounts.forEach(acc => {
        const firstDigit = acc.number[0];
        const net = accountYearlyNet[acc.id];
        
        if (['1', '2'].includes(firstDigit)) {
             // Balance Sheet
             // Assets (1) usually Debit +, Liabilities (2) Credit + (so Net is negative usually? depends on convention)
             // In the python script: Net = Debit - Credit.
             // Usually Assets are positive Net. Liabilities are Negative Net.
             // But for display we often show absolute values or follow accounting sign.
             // Let's keep Net as is (Debit - Credit).
             balanceSheetItems.push({
                 accountNumber: acc.number,
                 accountName: acc.name,
                 amount: net // Cumulative for Balance Sheet? Python script uses yearly net sum. For BS it should be cumulative from start of time ideally, or just the imported period.
             });
        } else if (['3', '4', '5', '6', '7', '8'].includes(firstDigit)) {
            // Income Statement
            incomeStatementItems.push({
                accountNumber: acc.number,
                accountName: acc.name,
                amount: net
            });
        }
    });

    // Calculate Net Result (Profit/Loss)
    // Revenue (3) is usually Credit (Negative Net). Expenses (4-8) are Debit (Positive Net).
    // Profit = Revenue - Expenses. 
    // If we sum Net (Debit - Credit) for all IS accounts:
    // Expenses (Pos) + Revenue (Neg). 
    // If result is Positive -> Loss. If Negative -> Profit (more credits).
    // Or vice versa depending on sign convention. 
    
    // Python script logic check:
    // income_sum = sum(Income Statement column)
    // Add 2979 to Balance Sheet with income_sum.
    
    const incomeSum = incomeStatementItems.reduce((sum, item) => sum + item.amount, 0);
    
    // Add Result to Balance Sheet (Account 2979)
    balanceSheetItems.push({
        accountNumber: '2979',
        accountName: 'Résultat de l’exercice',
        amount: -incomeSum // Balancing entry?
    });

    return {
        accounts: allAccounts,
        transactions: allTransactions,
        balanceSheet: balanceSheetItems,
        incomeStatement: incomeStatementItems,
        rawProcessedData: {
            cleanGL: rawCleanData,
            planComptable: allAccounts.map(a => ({ 'Numéro de compte': a.number, 'Nom de compte': a.name, 'Nature': NATURE_MAPPING[a.number[0]] || 'Inconnue' })),
            financialStatements: {
                balanceSheet: balanceSheetItems,
                incomeStatement: incomeStatementItems
            }
        }
    };
};
