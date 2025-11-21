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

export const CATEGORIE_LABELS: Record<string, string> = {
  "10": "Disponibilités",
  "11": "Créances clients",
  "12": "Stocks",
  "13": "Régularisation actif",
  "14": "Placements financiers",
  "15": "Immobilisations meubles",
  "16": "Immobilisations immeubles",
  "17": "Immobilisations incorporelles",
  "18": "Participations et prêts LT",
  "20": "Dettes fournisseurs",
  "21": "Dettes financières CT",
  "22": "Dettes fiscales et sociales",
  "23": "Régularisation passif",
  "24": "Dettes financières LT",
  "25": "Autres dettes LT",
  "26": "Provisions LT",
  "27": "Prêts postposés",
  "28": "Capital social",
  "29": "Réserves et bénéfices",
  "30": "Ventes produits fabriqués",
  "32": "Ventes marchandises",
  "34": "Ventes services",
  "36": "Produits accessoires",
  "37": "Production interne",
  "38": "Ajustements ventes",
  "39": "Variations stocks produits",
  "40": "Charges matières premières",
  "42": "Achats marchandises",
  "44": "Prestations services",
  "45": "Charges énergie",
  "46": "Autres charges matières",
  "47": "Frais achat et transport",
  "48": "Variations stocks matières",
  "49": "Ajustements achats",
  "52": "Salaires et rémunérations",
  "58": "Frais personnel divers",
  "59": "Personnel temporaire",
  "60": "Charges locaux",
  "61": "Entretien immobilisations",
  "62": "Charges véhicules",
  "63": "Assurances et droits",
  "64": "Énergie et services",
  "65": "Charges administratives",
  "66": "Publicité et marketing",
  "67": "Recherche et développement",
  "68": "Amortissements",
  "69": "Charges financières",
  "70": "Activités annexes",
  "75": "Résultat immobilier",
  "80": "Charges hors exploitation",
  "81": "Produits hors exploitation",
  "85": "Exceptionnels",
  "86": "Éléments uniques",
  "87": "Hors période",
  "89": "Impôts",
  "90": "Comptes de clôture"
};
