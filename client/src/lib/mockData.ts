import { addDays, subDays, format } from "date-fns";

export type Account = {
  id: string;
  number: string;
  name: string;
  category: string; // "10xx", "20xx", etc.
};

export type Transaction = {
  id: string;
  date: string;
  accountId: string;
  description: string;
  debit: number;
  credit: number;
  balance?: number; // Calculated
};

export type FinancialStatementItem = {
  accountNumber: string;
  accountName: string;
  amount: number;
};

// Generate Accounts
const generateAccounts = (): Account[] => {
  return [
    { id: "1", number: "1000", name: "Caisse", category: "10xx" },
    { id: "2", number: "1020", name: "Banque Cantonale", category: "102x" },
    { id: "3", number: "1100", name: "Créances Clients", category: "11xx" },
    { id: "4", number: "2000", name: "Dettes Fournisseurs", category: "20xx" },
    { id: "5", number: "3000", name: "Ventes de marchandises", category: "3xxx" },
    { id: "6", number: "3200", name: "Prestations de services", category: "3xxx" },
    { id: "7", number: "4000", name: "Achats de marchandises", category: "4-6xxx" },
    { id: "8", number: "5000", name: "Salaires", category: "4-6xxx" },
    { id: "9", number: "6000", name: "Loyer", category: "4-6xxx" },
    { id: "10", number: "6200", name: "Électricité", category: "4-6xxx" },
    { id: "11", number: "6500", name: "Frais administratifs", category: "4-6xxx" },
    { id: "12", number: "9000", name: "Résultat de l'exercice", category: "9xxx" },
  ];
};

export const ACCOUNTS = generateAccounts();

// Generate Transactions
const generateTransactions = (): Transaction[] => {
  const transactions: Transaction[] = [];
  const startDate = subDays(new Date(), 365);
  
  let idCounter = 1;

  ACCOUNTS.forEach((account) => {
    let currentBalance = 0;
    // Initial balance
    const initialBalance = Math.random() * 10000;
    if (account.category.startsWith("1") || account.category.startsWith("6") || account.category.startsWith("4") || account.category.startsWith("5")) {
       // Assets/Expenses usually debit
    }

    // Generate ~50 transactions per account
    for (let i = 0; i < 50; i++) {
      const date = addDays(startDate, Math.floor(Math.random() * 365));
      const isDebit = Math.random() > 0.5;
      const amount = Math.floor(Math.random() * 1000) + 50;
      
      const debit = isDebit ? amount : 0;
      const credit = !isDebit ? amount : 0;

      transactions.push({
        id: `txn-${idCounter++}`,
        date: date.toISOString(),
        accountId: account.id,
        description: `Transaction ${i + 1} - ${account.name}`,
        debit,
        credit,
      });
    }
  });

  return transactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
};

export const TRANSACTIONS = generateTransactions();

export const BALANCE_SHEET: FinancialStatementItem[] = [
    { accountNumber: "1000", accountName: "Caisse", amount: 15420.50 },
    { accountNumber: "1020", accountName: "Banque Cantonale", amount: 125600.00 },
    { accountNumber: "1100", accountName: "Créances Clients", amount: 45300.20 },
    { accountNumber: "1200", accountName: "Stock Marchandises", amount: 89000.00 },
    { accountNumber: "1500", accountName: "Machines", amount: 250000.00 },
    { accountNumber: "2000", accountName: "Dettes Fournisseurs", amount: 35600.10 },
    { accountNumber: "2400", accountName: "Dettes Bancaires", amount: 100000.00 },
    { accountNumber: "2800", accountName: "Capital Social", amount: 20000.00 },
];

export const INCOME_STATEMENT: FinancialStatementItem[] = [
    { accountNumber: "3000", accountName: "Ventes de marchandises", amount: 450000.00 },
    { accountNumber: "3200", accountName: "Prestations de services", amount: 120000.00 },
    { accountNumber: "4000", accountName: "Achats de marchandises", amount: -200000.00 },
    { accountNumber: "5000", accountName: "Charges de personnel", amount: -180000.00 },
    { accountNumber: "6000", accountName: "Loyer", amount: -36000.00 },
    { accountNumber: "6200", accountName: "Énergie & Eau", amount: -12000.00 },
    { accountNumber: "6500", accountName: "Frais administratifs", amount: -15000.00 },
    { accountNumber: "6800", accountName: "Amortissements", amount: -25000.00 },
];

export const CATEGORIES = {
  "Tous les comptes": ".*",
  "Liquidités (10xx)": "^10",
  "Banques (102x)": "^102",
  "Clients (11xx)": "^11",
  "Fournisseurs (20xx)": "^20",
  "Charges (4-6xxx)": "^[456]",
  "Produits (3xxx)": "^3",
  "Résultat (9xxx)": "^9",
};
