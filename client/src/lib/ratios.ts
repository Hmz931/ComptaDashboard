import { Account, Transaction, FinancialStatementItem } from "./mockData";

export interface Ratio {
  name: string;
  value: number;
  unit: string; // "%", "x", "CHF"
  interpretation?: string;
  status?: "good" | "warning" | "bad" | "neutral";
  category: "liquidity" | "profitability" | "structure";
}

export const calculateRatios = (
  accounts: Account[],
  transactions: Transaction[],
  balanceSheet: FinancialStatementItem[],
  incomeStatement: FinancialStatementItem[]
): Ratio[] => {
  // Helper to get balance of a specific account pattern
  const getBalance = (pattern: RegExp): number => {
    // Filter accounts matching pattern
    const matchingAccountIds = new Set(
      accounts.filter((a) => pattern.test(a.number)).map((a) => a.id)
    );

    // Sum net movement for these accounts from transactions
    // Note: This calculates the CURRENT cumulative balance (end of period)
    // We assume transactions cover the full history or we are looking at the current state
    let total = 0;
    const processedAccounts = new Set<string>();

    // Method 1: Sum from Balance Sheet/Income Statement if available (pre-calculated)
    // This is safer if we have the BS/IS items populated correctly
    const bsItem = balanceSheet
      .filter((i) => pattern.test(i.accountNumber))
      .reduce((sum, i) => sum + i.amount, 0);
    const isItem = incomeStatement
      .filter((i) => pattern.test(i.accountNumber))
      .reduce((sum, i) => sum + i.amount, 0);
      
    // If we found data in BS/IS, use it. Otherwise fall back to transactions?
    // The Excel processor populates BS/IS.
    if (bsItem !== 0 || isItem !== 0) return bsItem + isItem;

    // Fallback: Sum transactions
    transactions.forEach((t) => {
      if (matchingAccountIds.has(t.accountId)) {
        total += (t.debit - t.credit);
      }
    });
    return total;
  };

  // --- Definitions from PDF ---
  
  // 1. Liquidités (10x)
  const liquidites = getBalance(/^10/);
  
  // 2. Créances (11x)
  const creances = getBalance(/^11/);
  
  // 3. Stocks (12x)
  const stocks = getBalance(/^12/);
  
  // 4. Autres actifs circulants (13x)
  const autresActifsCirculants = getBalance(/^13/);
  
  // Actifs Circulants (10x-13x)
  const actifsCirculants = liquidites + creances + stocks + autresActifsCirculants;
  
  // Passifs à court terme (20x-23x)
  const passifsCourtTerme = getBalance(/^[2][0-3]/); // 20, 21, 22, 23
  
  // Capitaux Propres (28x, 29x)
  const capitauxPropres = getBalance(/^[2][89]/);

  // Total Actif (1xx)
  const totalActif = getBalance(/^1/);
  
  // Chiffre d'affaires (3xx) - Usually Credit, so negative in our net calc?
  // Let's use absolute value for ratios usually, but check sign convention.
  // In our Excel processor: Revenue (3) is usually Credit. 
  // getBalance returns (Debit - Credit). So Revenue will be negative.
  const chiffreAffaires = Math.abs(getBalance(/^3/)); 
  
  // Résultat Net (Profit)
  // In Excel processor, we added it to BS as 2979. 
  // Or calculate from Income Statement items.
  const resultatNet = incomeStatement.reduce((acc, item) => acc + item.amount, 0);
  // Resultat Net: (Debit - Credit). 
  // Expenses (Pos) + Revenue (Neg). 
  // If Result < 0 => Profit (Credits > Debits).
  // If Result > 0 => Loss.
  // Let's invert sign for "Profit" display.
  const netProfit = -resultatNet;

  // EBITDA
  // CA - Coûts directs (4xx) - Charges personnel (5xx) - Autres charges (6xx-7xx)
  // All expenses are Debit (Positive). CA is Credit (Negative).
  // EBITDA = |CA| - Expenses.
  const coutsDirects = getBalance(/^4/);
  const chargesPersonnel = getBalance(/^5/);
  const autresCharges = getBalance(/^[67]/);
  const ebitda = chiffreAffaires - coutsDirects - chargesPersonnel - autresCharges;

  // Dettes Totales
  const dettesTotales = getBalance(/^2[0-7]/); // 20-27
  
  const ratios: Ratio[] = [];

  // --- 3.1 Liquidity Ratios ---
  
  // Liquidité courante (Current Ratio) = AC / PCT
  // > 1.5 Good, < 1 Risky
  if (passifsCourtTerme !== 0) {
      // Passifs are usually Credit (Negative). Actifs Debit (Positive).
      // We need magnitudes.
      const val = Math.abs(actifsCirculants / passifsCourtTerme);
      ratios.push({
          name: "Liquidité courante",
          value: val,
          unit: "x",
          status: val > 1.5 ? "good" : val < 1 ? "bad" : "neutral",
          category: "liquidity",
          interpretation: "Capacité à couvrir les dettes CT (> 1.5)"
      });
  }

  // Liquidité immédiate (Quick Ratio) = (AC - Stocks) / PCT
  if (passifsCourtTerme !== 0) {
      const val = Math.abs((actifsCirculants - stocks) / passifsCourtTerme);
      ratios.push({
          name: "Liquidité immédiate",
          value: val,
          unit: "x",
          status: val >= 1 ? "good" : val < 0.8 ? "bad" : "neutral",
          category: "liquidity",
          interpretation: "Liquidité sans les stocks (≥ 1)"
      });
  }

  // Ratio de trésorerie (Cash Ratio) = Liquidités / PCT
  if (passifsCourtTerme !== 0) {
      const val = Math.abs(liquidites / passifsCourtTerme);
      ratios.push({
          name: "Ratio de trésorerie",
          value: val,
          unit: "x",
          status: val > 0.2 ? "good" : val < 0.1 ? "bad" : "neutral",
          category: "liquidity",
          interpretation: "Cash disponible vs dettes CT (> 0.2)"
      });
  }

  // --- 3.2 Profitability Ratios ---

  // Marge nette = (Net Profit / CA) * 100
  if (chiffreAffaires !== 0) {
      const val = (netProfit / chiffreAffaires) * 100;
      ratios.push({
          name: "Marge nette",
          value: val,
          unit: "%",
          status: val > 10 ? "good" : val < 5 ? "bad" : "neutral",
          category: "profitability",
          interpretation: "% de CA converti en profit (> 10%)"
      });
  }

  // ROA = (Net Profit / Total Actif) * 100
  if (totalActif !== 0) {
      const val = (netProfit / totalActif) * 100;
      ratios.push({
          name: "ROA",
          value: val,
          unit: "%",
          status: val > 5 ? "good" : val < 2 ? "bad" : "neutral",
          category: "profitability",
          interpretation: "Rentabilité des actifs (> 5%)"
      });
  }

  // ROE = (Net Profit / Capitaux Propres) * 100
  // CP usually Credit (negative). Use Abs.
  if (capitauxPropres !== 0) {
      const val = (netProfit / Math.abs(capitauxPropres)) * 100;
      ratios.push({
          name: "ROE",
          value: val,
          unit: "%",
          status: val > 10 ? "good" : val < 5 ? "bad" : "neutral",
          category: "profitability",
          interpretation: "Rentabilité des capitaux propres (> 10%)"
      });
  }

  // Marge EBITDA = (EBITDA / CA) * 100
  if (chiffreAffaires !== 0) {
      const val = (ebitda / chiffreAffaires) * 100;
      ratios.push({
          name: "Marge EBITDA",
          value: val,
          unit: "%",
          status: val > 15 ? "good" : val < 10 ? "bad" : "neutral",
          category: "profitability",
          interpretation: "Rentabilité opérationnelle (> 15%)"
      });
  }

  // --- 3.3 Structure Ratios ---

  // Ratio des capitaux propres (Equity Ratio) = CP / Total Actif
  if (totalActif !== 0) {
      const val = Math.abs(capitauxPropres / totalActif);
      ratios.push({
          name: "Ratio fonds propres",
          value: val,
          unit: "%", // actually ratio 0-1 usually displayed as %
          status: (val >= 0.3 && val <= 0.6) ? "good" : "bad",
          category: "structure",
          interpretation: "Indépendance financière (30-60%)"
      });
  }
  
  return ratios;
};
