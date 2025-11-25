import { useState, useMemo, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ACCOUNTS as MOCK_ACCOUNTS, TRANSACTIONS as MOCK_TRANSACTIONS, BALANCE_SHEET as MOCK_BALANCE_SHEET, INCOME_STATEMENT as MOCK_INCOME_STATEMENT, CATEGORIES, CATEGORIE_LABELS } from "@/lib/mockData";
import { format, parseISO, startOfYear, endOfYear, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter } from "date-fns";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell, BarChart, Bar } from "recharts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CalendarDateRangePicker } from "@/components/dashboard/date-range-picker";
import { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";
import { Upload, Download, Filter, TrendingUp, Wallet, FileText, FileSpreadsheet, Camera, BarChart3, PieChart as PieChartIcon, ArrowUpRight, ArrowDownRight, Minus, RotateCcw, ChevronDown, ChevronRight, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useData } from "@/lib/data-context";
import { useLocation } from "wouter";
import * as XLSX from "xlsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { calculateRatios, Ratio } from "@/lib/ratios";
import { toPng } from 'html-to-image';
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

export default function Dashboard() {
  const { data } = useData();
  const [, setLocation] = useLocation();
  const chartRef = useRef<HTMLDivElement>(null);

  // Fallback to mock data if no context data (e.g. direct access)
  const accounts = data?.accounts || MOCK_ACCOUNTS;
  const transactions = data?.transactions || MOCK_TRANSACTIONS;
  const balanceSheet = data?.balanceSheet || MOCK_BALANCE_SHEET;
  const incomeStatement = data?.incomeStatement || MOCK_INCOME_STATEMENT;
  
  const [selectedCategory, setSelectedCategory] = useState<string>("Tous les comptes");
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>(["1020"]);
  const [selectedYearsForCharts, setSelectedYearsForCharts] = useState<number[]>([]);
  const [accountSearchTerm, setAccountSearchTerm] = useState<string>("");
  const [detailsSearchTerm, setDetailsSearchTerm] = useState<string>("");
  const [selectedYearForPie, setSelectedYearForPie] = useState<string>("");
  const [selectedCategoriesComparison, setSelectedCategoriesComparison] = useState<string[]>([]);
  const [expandedCategoryComparison, setExpandedCategoryComparison] = useState<string | null>(null);
  const [selectedSubAccountsComparison, setSelectedSubAccountsComparison] = useState<string[]>([]);
  const [selectedYearForResume, setSelectedYearForResume] = useState<string>("");
  const [selectedPeriodComparison, setSelectedPeriodComparison] = useState<"Annuel" | "Semestriel" | "Trimestriel" | "Mensuel">("Annuel");
  const [comparisonMode, setComparisonMode] = useState<"general" | "liquidity">("general");
  const [selectedLiquidityAccounts, setSelectedLiquidityAccounts] = useState<string[]>([]);

  // Extract available years from transactions
  const availableYears = useMemo(() => {
    const years = new Set(transactions.map(t => new Date(parseISO(t.date)).getFullYear()));
    return Array.from(years).sort((a, b) => a - b);
  }, [transactions]);

  // Initialize selected years on first load - default to last year only
  useEffect(() => {
    if (selectedYearsForCharts.length === 0 && availableYears.length > 0) {
      setSelectedYearsForCharts([availableYears[availableYears.length - 1]]);
    }
    if (!selectedYearForPie && availableYears.length > 0) {
      setSelectedYearForPie(availableYears[availableYears.length - 1].toString());
    }
    if (!selectedYearForResume && availableYears.length > 0) {
      setSelectedYearForResume(availableYears[availableYears.length - 1].toString());
    }
  }, [availableYears, selectedYearForPie, selectedYearForResume]);

  // Calculate default date range from actual data
  const defaultDateRange = useMemo(() => {
    if (transactions.length === 0) {
      return { from: startOfYear(new Date()), to: endOfYear(new Date()) };
    }
    const dates = transactions.map(t => new Date(parseISO(t.date))).sort((a, b) => a.getTime() - b.getTime());
    return { from: dates[0], to: dates[dates.length - 1] };
  }, [transactions]);
  
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

  // Update dateRange when defaultDateRange changes (e.g., when new data is uploaded)
  useEffect(() => {
    if (!dateRange || dateRange.from === undefined || dateRange.to === undefined) {
      setDateRange(defaultDateRange);
    }
  }, [defaultDateRange]);  // eslint-disable-line react-hooks/exhaustive-deps

  // Helper to parse date for sorting (must be defined before useMemo that uses it)
  const parse = (dateString: string, formatString: string, referenceDate: Date) => {
      const parts = dateString.split('.');
      return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
  };

  const ratios = useMemo(() => calculateRatios(accounts, transactions, balanceSheet, incomeStatement), [accounts, transactions, balanceSheet, incomeStatement]);

  // Export Handlers
  const handleDownloadCleanGL = () => {
      if (!data?.processedFiles?.cleanGL) return;
      const ws = XLSX.utils.json_to_sheet(data.processedFiles.cleanGL);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Grand Livre Clean");
      XLSX.writeFile(wb, "Comptes_Cleans.xlsx");
  };

  const handleDownloadFinancialStatements = () => {
      if (!data?.processedFiles?.financialStatements) return;
      const wb = XLSX.utils.book_new();
      const wsBS = XLSX.utils.json_to_sheet(data.processedFiles.financialStatements.balanceSheet);
      XLSX.utils.book_append_sheet(wb, wsBS, "Balance Sheet");
      const wsIS = XLSX.utils.json_to_sheet(data.processedFiles.financialStatements.incomeStatement);
      XLSX.utils.book_append_sheet(wb, wsIS, "Income Statement");
      XLSX.writeFile(wb, "Financial_Statements.xlsx");
  };
  
  const handleDownloadPlanComptable = () => {
       if (!data?.processedFiles?.planComptable) return;
       const ws = XLSX.utils.json_to_sheet(data.processedFiles.planComptable);
       const wb = XLSX.utils.book_new();
       XLSX.utils.book_append_sheet(wb, ws, "Plan Comptable");
       XLSX.writeFile(wb, "Plan_Comptable.xlsx");
  };

  const handleDownloadChart = async () => {
    if (chartRef.current) {
      try {
        const dataUrl = await toPng(chartRef.current, { cacheBust: true, backgroundColor: '#ffffff' });
        const link = document.createElement('a');
        link.download = 'evolution-solde.png';
        link.href = dataUrl;
        link.click();
      } catch (err) {
        console.error('Could not generate image', err);
      }
    }
  };

  // Filter Logic
  const filteredData = useMemo(() => {
    const pattern = new RegExp(CATEGORIES[selectedCategory as keyof typeof CATEGORIES]);
    
    // 1. Filter Accounts
    const relevantAccounts = accounts.filter(acc => {
        // If specific accounts selected, ONLY use those
        if (selectedAccounts.length > 0) {
            return selectedAccounts.includes(acc.id);
        }
        // Otherwise use category
        if (acc.category && CATEGORIES[selectedCategory as keyof typeof CATEGORIES] !== ".*") {
             return acc.category === selectedCategory || pattern.test(acc.number);
        }
        return pattern.test(acc.number);
    });

    const relevantAccountIds = new Set(relevantAccounts.map(a => a.id));

    // 2. Filter Transactions
    let txns = transactions.filter(t => relevantAccountIds.has(t.accountId));
    
    if (dateRange?.from && dateRange?.to) {
        txns = txns.filter(t => {
            const d = parseISO(t.date);
            return d >= dateRange.from! && d <= dateRange.to!;
        });
    }

    // 3. Calculate Cumulative Balance
    txns.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Group by account to calculate cumulative balance per account
    const txnsWithBalance = [];
    const accountBalances: Record<string, number> = {};

    for (const txn of txns) {
        const account = accounts.find(a => a.id === txn.accountId);
        const isProductAccount = account?.number.startsWith('3');
        
        // For product accounts (3xxxx): Credit = increase, Debit = decrease
        // For other accounts: Debit = increase, Credit = decrease
        const movement = isProductAccount 
            ? txn.credit - txn.debit  
            : txn.debit - txn.credit;
        
        accountBalances[txn.accountId] = (accountBalances[txn.accountId] || 0) + movement;
        
        txnsWithBalance.push({
            ...txn,
            accountNumber: account?.number,
            accountName: account?.name,
            movement,
            cumulativeBalance: accountBalances[txn.accountId]
        });
    }

    return txnsWithBalance;
  }, [selectedCategory, selectedAccounts, dateRange, accounts, transactions]);

  // Chart Data Preparation (Sum vs Individual)
  const chartData = useMemo(() => {
    // If Specific Accounts are selected -> Show Individual Lines (Detail View)
    // If Category is selected (and no specific accounts) -> Show Aggregated Sum (Macro View)
    const isAggregated = selectedAccounts.length === 0 && selectedCategory !== "Tous les comptes";
    
    if (isAggregated) {
        // Aggregate by Date
        const dateMap: Record<string, { date: string, timestamp: number, balance: number }> = {};
        
        // Group by date first
        const dailyMovements: Record<string, number> = {};
        filteredData.forEach(t => {
            const d = format(parseISO(t.date), "dd.MM.yyyy");
            dailyMovements[d] = (dailyMovements[d] || 0) + t.movement;
        });

        // Create cumulative trend
        const dates = Object.keys(dailyMovements).sort((a, b) => {
             return parse(a, "dd.MM.yyyy", new Date()).getTime() - parse(b, "dd.MM.yyyy", new Date()).getTime();
        });
        
        const result = [];
        let cumulative = 0;
        
        for (const d of dates) {
            cumulative += dailyMovements[d];
            result.push({
                date: d,
                timestamp: parse(d, "dd.MM.yyyy", new Date()).getTime(),
                "Total Categorie": cumulative,
                account: "Total Categorie"
            });
        }
        return result;
    } else {
        // Individual Lines - Group by account and date to get unique points per account per day
        const accountDateMap: Record<string, Record<string, number>> = {};
        
        filteredData.forEach(t => {
            const d = format(parseISO(t.date), "dd.MM.yyyy");
            const accKey = t.accountNumber!;
            
            if (!accountDateMap[accKey]) {
                accountDateMap[accKey] = {};
            }
            // Keep the last value for each account on each day
            accountDateMap[accKey][d] = t.cumulativeBalance;
        });

        // Get all unique dates
        const allDates = Array.from(new Set(filteredData.map(t => format(parseISO(t.date), "dd.MM.yyyy"))))
            .sort((a, b) => parse(a, "dd.MM.yyyy", new Date()).getTime() - parse(b, "dd.MM.yyyy", new Date()).getTime());

        // Create chart data
        const result = allDates.map(d => {
            const row: Record<string, any> = {
                date: d,
                timestamp: parse(d, "dd.MM.yyyy", new Date()).getTime()
            };
            
            Object.entries(accountDateMap).forEach(([accNum, dateValues]) => {
                if (dateValues[d] !== undefined) {
                    row[accNum] = dateValues[d];
                }
            });
            
            return row;
        });

        return result;
    }
  }, [filteredData, selectedAccounts, selectedCategory]);

  // Calculate Summary Stats
  const summaryStats = useMemo(() => {
      const groupedByAccount: Record<string, { start: number, end: number, name: string }> = {};
      
      filteredData.forEach(t => {
          if (!groupedByAccount[t.accountNumber!]) {
              groupedByAccount[t.accountNumber!] = { start: t.cumulativeBalance! - t.movement, end: t.cumulativeBalance!, name: t.accountName! };
          } else {
              groupedByAccount[t.accountNumber!].end = t.cumulativeBalance!;
          }
      });

      return Object.entries(groupedByAccount).map(([accNum, stats]) => ({
          account: `${accNum} - ${stats.name}`,
          start: stats.start,
          end: stats.end,
          variation: stats.end - stats.start
      })).sort((a, b) => Math.abs(b.variation) - Math.abs(a.variation));
  }, [filteredData]);

  // Pie Chart Data (Charges per Category) - filtered by selected years, NO date range restriction
  const pieChartDataCharges = useMemo(() => {
      const data: Record<string, number> = {
          "Coûts directs (4xxx)": 0,
          "Charges de personnel (5xxx)": 0,
          "Autres charges (6xxx)": 0
      };

      // Filter transactions by selected years
      const selectedYearsSet = new Set(selectedYearsForCharts);
      const accountMap = new Map(accounts.map(a => [a.id, a.number]));
      
      transactions.forEach(txn => {
          const year = new Date(parseISO(txn.date)).getFullYear();
          if (!selectedYearsSet.has(year)) return;

          const accountNum = accountMap.get(txn.accountId);
          if (!accountNum) return;
          const firstDigit = accountNum[0];
          const isExpense = txn.debit > 0 ? txn.debit : -txn.credit;
          
          if (firstDigit === '4') data["Coûts directs (4xxx)"] += isExpense;
          if (firstDigit === '5') data["Charges de personnel (5xxx)"] += isExpense;
          if (firstDigit === '6') data["Autres charges (6xxx)"] += isExpense;
      });

      return Object.entries(data).map(([name, value]) => ({
          name,
          value: Math.abs(value)
      })).filter(i => i.value > 0);
  }, [transactions, selectedYearsForCharts, accounts]);

  // Pie Chart Data (Produits/Revenue per Account) - filtered by selected years, NO date range restriction
  const pieChartDataProduits = useMemo(() => {
      const data: Record<string, { number: string, name: string, value: number }> = {};

      // Filter transactions by selected years
      const selectedYearsSet = new Set(selectedYearsForCharts);
      const accountMap = new Map(accounts.map(a => [a.id, { number: a.number, name: a.name }]));
      
      transactions.forEach(txn => {
          const year = new Date(parseISO(txn.date)).getFullYear();
          if (!selectedYearsSet.has(year)) return;

          const accountNum = accountMap.get(txn.accountId);
          if (!accountNum) return;
          if (accountNum.number[0] !== '3') return;

          const revenue = txn.credit > 0 ? txn.credit : -txn.debit;
          const key = accountNum.number;
          if (!data[key]) {
              data[key] = { number: accountNum.number, name: accountNum.name, value: 0 };
          }
          data[key].value += revenue;
      });

      return Object.values(data)
          .map(item => ({
              name: `${item.number} - ${item.name}`,
              value: Math.abs(item.value)
          }))
          .filter(i => i.value > 0)
          .sort((a, b) => b.value - a.value);
  }, [transactions, selectedYearsForCharts, accounts]);

  const PIE_COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))'];
  const COLORS = [
    'hsl(var(--chart-1))',
    'hsl(var(--chart-2))',
    'hsl(var(--chart-3))',
    'hsl(var(--chart-4))',
    'hsl(var(--chart-5))',
  ];

  // Helper function to format period label based on type
  const getPeriodLabel = (date: Date, periodType: "Annuel" | "Semestriel" | "Trimestriel" | "Mensuel"): string => {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const quarter = Math.ceil(month / 3);
    const semester = Math.ceil(month / 6);

    switch (periodType) {
      case "Annuel":
        return year.toString();
      case "Semestriel":
        return `${year} - S${semester}`;
      case "Trimestriel":
        return `${year} - Q${quarter}`;
      case "Mensuel":
        return `${month.toString().padStart(2, '0')}/${year}`;
      default:
        return year.toString();
    }
  };

  // Comparison Data for Bar Chart - Grouped by Period
  const comparisonDataFull = useMemo(() => {
    const periodsSet = new Set<string>();
    const accountsMap = new Map(accounts.map(a => [a.id, { number: a.number, name: a.name }]));
    
    transactions.forEach(txn => {
      const date = new Date(parseISO(txn.date));
      const periodLabel = getPeriodLabel(date, selectedPeriodComparison);
      periodsSet.add(periodLabel);
    });

    // Sort periods
    const periods = Array.from(periodsSet).sort((a, b) => {
      if (selectedPeriodComparison === "Annuel") {
        return parseInt(a) - parseInt(b);
      } else {
        return a.localeCompare(b);
      }
    });
    
    const dataByCategory: Record<string, Record<string, number>> = {};
    const dataBySubAccount: Record<string, Record<string, number>> = {};
    
    // Initialize sub-account data for ALL accounts
    accounts.forEach(acc => {
      const subAccountKey = `${acc.number} - ${acc.name}`;
      dataBySubAccount[subAccountKey] = {};
      periods.forEach(period => {
        dataBySubAccount[subAccountKey][period] = 0;
      });
    });
    
    transactions.forEach(txn => {
      const date = new Date(parseISO(txn.date));
      const period = getPeriodLabel(date, selectedPeriodComparison);
      const accountInfo = accountsMap.get(txn.accountId);
      if (!accountInfo) return;
      
      const categoryCode = accountInfo.number.substring(0, 2);
      const categoryLabel = CATEGORIE_LABELS[categoryCode] || `Catégorie ${categoryCode}`;
      const categoryKey = `${categoryCode} - ${categoryLabel}`;
      const subAccountKey = `${accountInfo.number} - ${accountInfo.name}`;
      
      if (!dataByCategory[categoryKey]) {
        dataByCategory[categoryKey] = {};
      }
      
      const amount = txn.debit - txn.credit;
      dataByCategory[categoryKey][period] = (dataByCategory[categoryKey][period] || 0) + amount;
      dataBySubAccount[subAccountKey][period] = (dataBySubAccount[subAccountKey][period] || 0) + amount;
    });

    // For balance sheet accounts (1xxx, 2xxx), calculate cumulative balances
    const finalDataByCategory: Record<string, Record<string, number>> = {};
    const finalDataBySubAccount: Record<string, Record<string, number>> = {};
    
    Object.entries(dataByCategory).forEach(([category, periodData]) => {
      const categoryCode = category.substring(0, 2);
      finalDataByCategory[category] = {};
      
      if (categoryCode.startsWith('1') || categoryCode.startsWith('2')) {
        let cumulative = 0;
        periods.forEach(period => {
          cumulative += periodData[period] || 0;
          finalDataByCategory[category][period] = cumulative;
        });
      } else {
        finalDataByCategory[category] = periodData;
      }
    });
    
    Object.entries(dataBySubAccount).forEach(([subAccount, periodData]) => {
      const categoryCode = subAccount.substring(0, 2);
      finalDataBySubAccount[subAccount] = {};
      
      if (categoryCode.startsWith('1') || categoryCode.startsWith('2')) {
        let cumulative = 0;
        periods.forEach(period => {
          cumulative += periodData[period] || 0;
          finalDataBySubAccount[subAccount][period] = cumulative;
        });
      } else {
        finalDataBySubAccount[subAccount] = periodData;
      }
    });

    // Transform to recharts format - include both categories and sub-accounts
    const chartData = periods.map(period => ({
      period: period,
      ...Object.fromEntries(
        Object.entries(finalDataByCategory).map(([category, data]) => [
          category,
          Math.abs(data[period] || 0)
        ])
      ),
      ...Object.fromEntries(
        Object.entries(finalDataBySubAccount).map(([subAccount, data]) => [
          subAccount,
          Math.abs(data[period] || 0)
        ])
      )
    }));

    const allCategoriesFiltered = Object.entries(finalDataByCategory)
      .filter(([_, data]) => Object.values(data).some(val => Math.abs(val) > 0))
      .map(([category, _]) => category)
      .sort();

    // Build sub-accounts list for each category
    const subAccountsByCategory: Record<string, { id: string, number: string, name: string }[]> = {};
    accounts.forEach(acc => {
      const categoryCode = acc.number.substring(0, 2);
      const categoryLabel = CATEGORIE_LABELS[categoryCode] || `Catégorie ${categoryCode}`;
      const key = `${categoryCode} - ${categoryLabel}`;
      
      if (!subAccountsByCategory[key]) {
        subAccountsByCategory[key] = [];
      }
      subAccountsByCategory[key].push({ id: acc.id, number: acc.number, name: acc.name });
    });

    return { chartData, periods, allCategories: allCategoriesFiltered, subAccountsByCategory };
  }, [transactions, accounts, selectedPeriodComparison]);

  // Initialize default selections for comparison categories (10xx by default)
  useEffect(() => {
    if (selectedCategoriesComparison.length === 0 && comparisonDataFull.allCategories.length > 0) {
      const default10xxCategories = comparisonDataFull.allCategories
        .filter(category => category.substring(0, 2) === "10");
      if (default10xxCategories.length > 0) {
        setSelectedCategoriesComparison(default10xxCategories);
      }
    }
  }, [comparisonDataFull.allCategories, selectedCategoriesComparison]);

  // Display categories for comparison chart
  const displayCategoriesComparison = useMemo(() => {
    if (selectedSubAccountsComparison.length > 0) {
      return selectedSubAccountsComparison
        .map(id => {
          const acc = accounts.find(a => a.id === id);
          return acc ? `${acc.number} - ${acc.name}` : null;
        })
        .filter(Boolean) as string[];
    }
    return selectedCategoriesComparison.length > 0 ? selectedCategoriesComparison : comparisonDataFull.allCategories;
  }, [selectedSubAccountsComparison, selectedCategoriesComparison, comparisonDataFull.allCategories, accounts]);

  // All available liquidity accounts (1xxx, 2xxx) for the selector
  const allLiquidityAccounts = useMemo(() => {
    return accounts.filter(a => a.number.startsWith('1') || a.number.startsWith('2'));
  }, [accounts]);

  // Initialize default selections for liquidity accounts (10xx by default)
  useEffect(() => {
    if (selectedLiquidityAccounts.length === 0 && allLiquidityAccounts.length > 0) {
      const default10xxAccounts = allLiquidityAccounts
        .filter(acc => acc.number.startsWith('10'))
        .map(acc => acc.id);
      if (default10xxAccounts.length > 0) {
        setSelectedLiquidityAccounts(default10xxAccounts);
      }
    }
  }, [allLiquidityAccounts, selectedLiquidityAccounts]);

  // Liquidity tracking data (Débits green, Crédits red)
  const liquidityTrackingData = useMemo(() => {
    const periodsSet = new Set<string>();
    
    // Only trace accounts that are explicitly selected
    const accountsToTrace = accounts.filter(a => selectedLiquidityAccounts.includes(a.id));
    const accountsToTraceIds = new Set(accountsToTrace.map(a => a.id));

    transactions.forEach(txn => {
      if (!accountsToTraceIds.has(txn.accountId)) return;
      const date = new Date(parseISO(txn.date));
      const periodLabel = getPeriodLabel(date, selectedPeriodComparison);
      periodsSet.add(periodLabel);
    });

    const periods = Array.from(periodsSet).sort((a, b) => {
      if (selectedPeriodComparison === "Annuel") {
        return parseInt(a) - parseInt(b);
      } else {
        return a.localeCompare(b);
      }
    });

    const chartData = periods.map(period => {
      let debits = 0;
      let credits = 0;

      transactions.forEach(txn => {
        if (!accountsToTraceIds.has(txn.accountId)) return;
        // Exclude transactions with "Report" in description (opening balances)
        if (txn.description.toLowerCase().includes("report")) return;
        const date = new Date(parseISO(txn.date));
        const p = getPeriodLabel(date, selectedPeriodComparison);
        if (p === period) {
          debits += txn.debit;
          credits += txn.credit;
        }
      });

      return {
        period,
        "Encaissements": debits,
        "Décaissements": credits
      };
    });

    return { chartData, periods };
  }, [transactions, accounts, selectedLiquidityAccounts, selectedPeriodComparison, allLiquidityAccounts]);

  // Pie Chart Data by Categories (Actifs, Passifs, Produits, Charges)
  const pieChartCategories = useMemo(() => {
    if (!selectedYearForPie) return {};

    const year = parseInt(selectedYearForPie);
    const dateRange = { 
      start: startOfYear(new Date(year, 0, 1)), 
      end: endOfYear(new Date(year, 0, 1))
    };

    const categoryDefs = [
      { name: "Actifs", prefix: ["1"], label: "Classe 1" },
      { name: "Passifs", prefix: ["2"], label: "Classe 2" },
      { name: "Produits", prefix: ["3"], label: "Classe 3" },
      { name: "Charges", prefix: ["4", "5", "6", "7", "8"], label: "Classe 4-8" }
    ];

    const result: Record<string, Array<{ name: string; value: number }>> = {};

    categoryDefs.forEach((category) => {
      const categoryAccounts = accounts.filter(acc => {
        const firstChar = acc.number.substring(0, 1);
        return category.prefix.includes(firstChar);
      });

      const accountsMap = new Map(categoryAccounts.map(a => [a.id, a]));

      const categoryTransactions = transactions.filter(txn => {
        if (!accountsMap.has(txn.accountId)) return false;
        const txnDate = parseISO(txn.date);
        return txnDate >= dateRange.start && txnDate <= dateRange.end;
      });

      const accountData: Record<string, { name: string; debit: number; credit: number }> = {};

      categoryTransactions.forEach(txn => {
        const account = accountsMap.get(txn.accountId);
        if (!account) return;

        const key = account.id;
        if (!accountData[key]) {
          accountData[key] = { name: `${account.number} - ${account.name}`, debit: 0, credit: 0 };
        }
        accountData[key].debit += txn.debit;
        accountData[key].credit += txn.credit;
      });

      const pieData = Object.values(accountData)
        .map(item => ({
          name: item.name,
          value: Math.abs(item.debit - item.credit)
        }))
        .filter(item => item.value > 0)
        .sort((a, b) => b.value - a.value);

      result[category.name] = pieData.length > 0 ? pieData : [];
    });

    return result;
  }, [transactions, accounts, selectedYearForPie]);

  // Calculate Balance Sheet and Income Statement for selected year
  const resumeDataByYear = useMemo(() => {
    if (!selectedYearForResume) {
      return { balanceSheet: balanceSheet, incomeStatement: incomeStatement };
    }

    const year = parseInt(selectedYearForResume);
    const yearStart = startOfYear(new Date(year, 0, 1));
    const yearEnd = endOfYear(new Date(year, 0, 1));

    const accountsMap = new Map(accounts.map(a => [a.id, a]));
    
    // Filter transactions for the selected year
    const yearTransactions = transactions.filter(txn => {
      const txnDate = parseISO(txn.date);
      return txnDate >= yearStart && txnDate <= yearEnd;
    });

    // Calculate Balance Sheet (cumulative for asset/liability accounts)
    const bsData: Record<string, { name: string; amount: number; number: string }> = {};
    
    yearTransactions.forEach(txn => {
      const account = accountsMap.get(txn.accountId);
      if (!account || (!account.number.startsWith('1') && !account.number.startsWith('2'))) return;
      
      if (!bsData[account.id]) {
        bsData[account.id] = { name: account.name, number: account.number, amount: 0 };
      }
      bsData[account.id].amount += txn.debit - txn.credit;
    });

    const newBalanceSheet = Object.entries(bsData).map(([id, data]) => ({
      accountNumber: data.number,
      accountName: data.name,
      amount: data.amount
    }));

    // Calculate Income Statement (sum for P&L accounts)
    const isData: Record<string, { name: string; amount: number; number: string }> = {};
    
    yearTransactions.forEach(txn => {
      const account = accountsMap.get(txn.accountId);
      if (!account || (account.number.startsWith('1') || account.number.startsWith('2'))) return;
      
      if (!isData[account.id]) {
        isData[account.id] = { name: account.name, number: account.number, amount: 0 };
      }
      isData[account.id].amount += txn.debit - txn.credit;
    });

    const newIncomeStatement = Object.entries(isData).map(([id, data]) => ({
      accountNumber: data.number,
      accountName: data.name,
      amount: data.amount
    }));

    return { 
      balanceSheet: newBalanceSheet.length > 0 ? newBalanceSheet : balanceSheet,
      incomeStatement: newIncomeStatement.length > 0 ? newIncomeStatement : incomeStatement
    };
  }, [selectedYearForResume, transactions, accounts, balanceSheet, incomeStatement]);

  // Get Net Result from account 2979
  const netResultAmount = resumeDataByYear.balanceSheet.find(item => item.accountNumber === "2979")?.amount || 0;
  const netResult = netResultAmount;
  const isAggregatedView = selectedAccounts.length === 0 && selectedCategory !== "Tous les comptes";

  return (
    <div className="h-screen flex flex-col bg-background font-sans text-foreground overflow-hidden">
      {/* Header - Fixed */}
      <div className="flex-none p-6 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-10">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg text-primary">
                    <TrendingUp className="h-8 w-8" />
                </div>
                ComptaDashboard
              </h1>
              <p className="text-muted-foreground mt-1 text-sm">Suivi Évolution des Comptes • {filteredData.length} écritures</p>
            </div>
            <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => { setSelectedCategory("Tous les comptes"); setSelectedAccounts([]); setDateRange(defaultDateRange); }} data-testid="button-reset-filters">
                  <RotateCcw className="mr-2 h-4 w-4" /> Réinitialiser
                </Button>
                <Button variant="outline" size="sm" onClick={() => setLocation("/")} data-testid="button-load-new-file">
                   <Upload className="mr-2 h-4 w-4" /> Charger Données
                </Button>
                <Button variant="link" size="sm" onClick={() => setLocation("/ratios")}>
                  <FileText className="mr-2 h-4 w-4" /> Ratios
                </Button>
                <Button variant="link" size="sm" onClick={() => setLocation("/plan-comptable")}>
                  <FileSpreadsheet className="mr-2 h-4 w-4" /> Plan
                </Button>
                <Button variant="link" size="sm" onClick={() => setLocation("/comparison")}>
                  <BarChart3 className="mr-2 h-4 w-4" /> Comparaison
                </Button>
                <Button variant="link" size="sm" onClick={() => setLocation("/pie-charts")}>
                  <PieChartIcon className="mr-2 h-4 w-4" /> Graphiques
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="default" size="sm">
                        <Download className="mr-2 h-4 w-4" /> Exporter
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={handleDownloadCleanGL} disabled={!data}>
                        <FileSpreadsheet className="mr-2 h-4 w-4" /> Comptes_Cleans.xlsx
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleDownloadFinancialStatements} disabled={!data}>
                        <FileText className="mr-2 h-4 w-4" /> Financial_Statements.xlsx
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleDownloadPlanComptable} disabled={!data}>
                        <FileText className="mr-2 h-4 w-4" /> Plan_Comptable.xlsx
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleDownloadChart} disabled={filteredData.length === 0}>
                        <Camera className="mr-2 h-4 w-4" /> Graphique (PNG)
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
            </div>
          </div>
      </div>

      {/* Main Content - Scrollable */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Sidebar - Scrollable independently if needed, or fixed */}
        <div className="w-80 flex-none border-r border-border bg-sidebar/30 backdrop-blur-sm overflow-y-auto p-6 space-y-6">
            <div className="space-y-1">
                <h3 className="font-semibold flex items-center gap-2"><Filter className="h-4 w-4" /> Filtres</h3>
                <p className="text-xs text-muted-foreground">Affinez votre vue</p>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Catégorie</label>
                <Select value={selectedCategory} onValueChange={(val) => { setSelectedCategory(val); setSelectedAccounts([]); }}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.keys(CATEGORIES).map((cat) => {
                      const categoryPattern = CATEGORIES[cat as keyof typeof CATEGORIES];
                      const accountsInCategory = accounts.filter(acc => new RegExp(categoryPattern).test(acc.number));
                      return (
                        <div key={cat}>
                          <SelectItem value={cat}>
                            {cat}
                          </SelectItem>
                          {accountsInCategory.length > 0 && selectedCategory === cat && (
                            <div className="ml-6 text-xs space-y-1 mb-2 mt-1 border-l border-muted pl-2">
                              {accountsInCategory.map(acc => (
                                <div key={acc.id} className="flex items-center space-x-2 py-1">
                                  <Checkbox 
                                    id={`subcat-${acc.id}`}
                                    checked={selectedAccounts.includes(acc.id)}
                                    onCheckedChange={(checked) => {
                                      if (checked) {
                                        setSelectedAccounts([...selectedAccounts, acc.id]);
                                      } else {
                                        setSelectedAccounts(selectedAccounts.filter(id => id !== acc.id));
                                      }
                                    }}
                                  />
                                  <label 
                                    htmlFor={`subcat-${acc.id}`}
                                    className="text-xs leading-none cursor-pointer truncate"
                                    title={acc.name}
                                  >
                                    <span className="font-mono font-bold text-[10px]">{acc.number}</span> <span className="text-[10px]">{acc.name}</span>
                                  </label>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                 <label className="text-sm font-medium">Recherche Comptes</label>
                 <input 
                    type="text" 
                    placeholder="Chercher par #, nom..." 
                    value={accountSearchTerm}
                    onChange={(e) => setAccountSearchTerm(e.target.value)}
                    className="w-full px-2 py-1 text-xs border rounded-md bg-background"
                 />
                 <div className="max-h-[300px] overflow-y-auto border rounded-md p-2 space-y-1 bg-background">
                    {accounts
                        .filter(acc => 
                            accountSearchTerm === "" || 
                            acc.number.toLowerCase().includes(accountSearchTerm.toLowerCase()) ||
                            acc.name.toLowerCase().includes(accountSearchTerm.toLowerCase())
                        )
                        .map(acc => (
                        <div key={acc.id} className="flex items-center space-x-2">
                            <Checkbox 
                                id={`acc-${acc.id}`} 
                                checked={selectedAccounts.includes(acc.id)}
                                onCheckedChange={(checked) => {
                                    if (checked) {
                                        setSelectedAccounts([...selectedAccounts, acc.id]);
                                    } else {
                                        setSelectedAccounts(selectedAccounts.filter(id => id !== acc.id));
                                    }
                                }}
                            />
                            <label
                                htmlFor={`acc-${acc.id}`}
                                className="text-xs leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 truncate cursor-pointer"
                                title={acc.name}
                            >
                                <span className="font-mono font-bold text-[10px]">{acc.number}</span> <span className="text-[10px]">{acc.name}</span>
                            </label>
                        </div>
                    ))}
                 </div>
                 {selectedAccounts.length > 0 && (
                    <div className="mt-2 p-2 bg-muted rounded-md">
                        <p className="text-xs font-medium mb-1">Comptes sélectionnés ({selectedAccounts.length}):</p>
                        <div className="flex flex-wrap gap-1">
                            {selectedAccounts.map(id => {
                                const acc = accounts.find(a => a.id === id);
                                return acc ? (
                                    <span key={id} className="inline-flex items-center gap-1 bg-primary/20 text-primary text-[10px] px-2 py-1 rounded">
                                        {acc.number}
                                        <button onClick={() => setSelectedAccounts(selectedAccounts.filter(a => a !== id))} className="ml-1 hover:opacity-70">×</button>
                                    </span>
                                ) : null;
                            })}
                        </div>
                    </div>
                 )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Période</label>
                <p className="text-[10px] text-muted-foreground">
                  {dateRange?.from && dateRange?.to ? (
                    <>Affichage: {format(dateRange.from, "dd.MM.yyyy")} - {format(dateRange.to, "dd.MM.yyyy")}</>
                  ) : (
                    <>Sélectionnez une période</>
                  )}
                </p>
                <CalendarDateRangePicker date={dateRange} setDate={setDateRange} />
              </div>
            </div>

            <div className="pt-4 border-t border-border space-y-4">
                <div className="space-y-1">
                    <h3 className="font-semibold flex items-center gap-2"><BarChart3 className="h-4 w-4" /> Ratios Clés</h3>
                </div>
                <div className="space-y-3">
                    {ratios.slice(0, 4).map((ratio) => (
                        <div key={ratio.name} className="p-3 bg-card rounded-lg border shadow-sm">
                            <div className="flex justify-between items-start mb-1">
                                <span className="text-xs font-medium text-muted-foreground">{ratio.name}</span>
                                <RatioStatusIcon status={ratio.status} />
                            </div>
                            <div className="text-xl font-bold tabular-nums">
                                {ratio.value.toFixed(ratio.unit === "%" ? 1 : 2)}
                                <span className="text-xs font-normal text-muted-foreground ml-1">{ratio.unit}</span>
                            </div>
                            <div className="text-[10px] text-muted-foreground mt-1">{ratio.interpretation}</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>

        {/* Tabs Content Area */}
        <div className="flex-1 overflow-y-auto p-6">
          <Tabs defaultValue="evolution" className="space-y-6">
            <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent gap-6">
              <TabsTrigger value="evolution" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none py-2 px-1">Évolution</TabsTrigger>
              <TabsTrigger value="comparison" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none py-2 px-1">Comparaison</TabsTrigger>
              <TabsTrigger value="graphiques" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none py-2 px-1">Graphiques</TabsTrigger>
              <TabsTrigger value="details" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none py-2 px-1">Détails</TabsTrigger>
              <TabsTrigger value="resume" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none py-2 px-1">Résumé</TabsTrigger>
              <TabsTrigger value="ratios" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none py-2 px-1">Ratios</TabsTrigger>
              <TabsTrigger value="infos" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none py-2 px-1">Infos</TabsTrigger>
            </TabsList>

            {/* Tab 1: Evolution */}
            <TabsContent value="evolution" className="space-y-6">
              <div className="grid grid-cols-1 gap-6">
                  <Card ref={chartRef}>
                    <CardHeader>
                        <CardTitle>Évolution {isAggregatedView ? "Globale (Somme)" : "Détaillée"}</CardTitle>
                        <CardDescription>
                            {isAggregatedView 
                                ? `Cumul de tous les comptes de la catégorie ${selectedCategory}` 
                                : "Visualisation individuelle des comptes sélectionnés"}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="h-[450px]">
                      {filteredData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                                <XAxis 
                                    dataKey="date" 
                                    stroke="hsl(var(--muted-foreground))" 
                                    fontSize={12} 
                                    tickLine={false} 
                                    axisLine={false}
                                    minTickGap={40}
                                    dy={10}
                                />
                                <YAxis 
                                    stroke="hsl(var(--muted-foreground))" 
                                    fontSize={12} 
                                    tickLine={false} 
                                    axisLine={false}
                                    tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                                    dx={-10}
                                />
                                <Tooltip 
                                    contentStyle={{ backgroundColor: "hsl(var(--popover))", borderColor: "hsl(var(--border))", borderRadius: "var(--radius)", boxShadow: "var(--shadow-md)" }}
                                    itemStyle={{ color: "hsl(var(--popover-foreground))" }}
                                    formatter={(value: number) => [value.toLocaleString('fr-CH', { minimumFractionDigits: 2 }), isAggregatedView ? "Total" : "Solde"]}
                                    labelStyle={{ color: "hsl(var(--muted-foreground))", marginBottom: "0.5rem" }}
                                />
                                <Legend wrapperStyle={{ paddingTop: "20px" }} />
                                {isAggregatedView ? (
                                    <Line 
                                        type="monotone" 
                                        dataKey="Total Categorie" 
                                        stroke="hsl(var(--primary))" 
                                        strokeWidth={3}
                                        dot={false}
                                        activeDot={{ r: 6, strokeWidth: 0 }}
                                    />
                                ) : (
                                    summaryStats.slice(0, 10).map((stat, index) => (
                                        <Line 
                                            key={stat.account} 
                                            type="monotone" 
                                            dataKey={stat.account.split(" - ")[0]} 
                                            stroke={`hsl(var(--chart-${(index % 5) + 1}))`} 
                                            strokeWidth={2}
                                            dot={false}
                                            name={stat.account}
                                            connectNulls
                                        />
                                    ))
                                )}
                            </LineChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="flex h-full items-center justify-center text-muted-foreground bg-muted/10 rounded-lg border border-dashed">
                            Aucune donnée pour ces critères
                        </div>
                      )}
                    </CardContent>
                  </Card>
              </div>
            </TabsContent>

            {/* Tab 2: Comparison */}
            <TabsContent value="comparison" className="space-y-6">
              {/* Mode Selection */}
              <div className="flex items-center gap-2">
                <Button 
                  variant={comparisonMode === "general" ? "default" : "outline"} 
                  size="sm"
                  onClick={() => setComparisonMode("general")}
                >
                  Comparaison générale
                </Button>
                <Button 
                  variant={comparisonMode === "liquidity" ? "default" : "outline"} 
                  size="sm"
                  onClick={() => setComparisonMode("liquidity")}
                >
                  Suivi des Encaissements/Décaissements
                </Button>
              </div>

              {comparisonMode === "general" ? (
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                <Card className="lg:col-span-3">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Montants par Période et Catégorie</CardTitle>
                        <CardDescription>Sélectionnez les catégories à afficher pour une comparaison détaillée</CardDescription>
                      </div>
                      <Select value={selectedPeriodComparison} onValueChange={(value) => setSelectedPeriodComparison(value as "Annuel" | "Semestriel" | "Trimestriel" | "Mensuel")}>
                        <SelectTrigger className="w-40">
                          <SelectValue placeholder="Sélectionner période" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Mensuel">Mensuel</SelectItem>
                          <SelectItem value="Trimestriel">Trimestriel</SelectItem>
                          <SelectItem value="Semestriel">Semestriel</SelectItem>
                          <SelectItem value="Annuel">Annuel</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardHeader>
                  <CardContent className="h-[400px]">
                    {comparisonDataFull.chartData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={comparisonDataFull.chartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                          <XAxis dataKey="period" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                          <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`} />
                          <Tooltip formatter={(value: number) => value.toLocaleString('fr-CH', { minimumFractionDigits: 0 })} />
                          <Legend wrapperStyle={{ fontSize: '11px', maxHeight: '100px' }} />
                          {displayCategoriesComparison.map((category, index) => (
                            <Bar key={category} dataKey={category} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-full text-muted-foreground">
                        Aucune donnée disponible
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Sélection Catégories</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="max-h-[400px] overflow-y-auto space-y-2">
                      {comparisonDataFull.allCategories.map((category) => (
                        <div key={category} className="border rounded-md p-2 space-y-2 bg-muted/30">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setExpandedCategoryComparison(expandedCategoryComparison === category ? null : category)}
                              className="p-1 hover:bg-muted rounded"
                            >
                              {expandedCategoryComparison === category ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                            </button>
                            <Checkbox
                              checked={selectedCategoriesComparison.includes(category)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedCategoriesComparison([...selectedCategoriesComparison, category]);
                                } else {
                                  setSelectedCategoriesComparison(selectedCategoriesComparison.filter(a => a !== category));
                                  setSelectedSubAccountsComparison(selectedSubAccountsComparison.filter(id => {
                                    const acc = accounts.find(a => a.id === id);
                                    return !acc?.number.startsWith(category.substring(0, 2));
                                  }));
                                }
                              }}
                            />
                            <label className="text-xs cursor-pointer flex-1">{category}</label>
                          </div>

                          {expandedCategoryComparison === category && (
                            <div className="ml-6 border-l border-muted pl-2 space-y-1">
                              {comparisonDataFull.subAccountsByCategory[category]?.map((subAcc) => (
                                <div key={subAcc.id} className="flex items-center gap-2">
                                  <Checkbox
                                    checked={selectedSubAccountsComparison.includes(subAcc.id)}
                                    onCheckedChange={(checked) => {
                                      if (checked) {
                                        setSelectedSubAccountsComparison([...selectedSubAccountsComparison, subAcc.id]);
                                      } else {
                                        setSelectedSubAccountsComparison(selectedSubAccountsComparison.filter(id => id !== subAcc.id));
                                      }
                                    }}
                                  />
                                  <label className="text-xs cursor-pointer">
                                    <span className="font-mono font-bold text-[10px]">{subAcc.number}</span> <span className="text-[10px]">{subAcc.name}</span>
                                  </label>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    {(selectedCategoriesComparison.length > 0 || selectedSubAccountsComparison.length > 0) && (
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="w-full"
                        onClick={() => {
                          setSelectedCategoriesComparison([]);
                          setSelectedSubAccountsComparison([]);
                          setExpandedCategoryComparison(null);
                        }}
                      >
                        Réinitialiser
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </div>
              ) : (
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                <Card className="lg:col-span-3">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Suivi des Encaissements et Décaissements</CardTitle>
                        <CardDescription>Visualisation des mouvements de trésorerie par période</CardDescription>
                      </div>
                      <Select value={selectedPeriodComparison} onValueChange={(value) => setSelectedPeriodComparison(value as "Annuel" | "Semestriel" | "Trimestriel" | "Mensuel")}>
                        <SelectTrigger className="w-40">
                          <SelectValue placeholder="Sélectionner période" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Mensuel">Mensuel</SelectItem>
                          <SelectItem value="Trimestriel">Trimestriel</SelectItem>
                          <SelectItem value="Semestriel">Semestriel</SelectItem>
                          <SelectItem value="Annuel">Annuel</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardHeader>
                  <CardContent className="h-[400px]">
                    {liquidityTrackingData.chartData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={liquidityTrackingData.chartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                          <XAxis dataKey="period" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                          <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`} />
                          <Tooltip formatter={(value: number) => value.toLocaleString('fr-CH', { minimumFractionDigits: 0 })} />
                          <Legend wrapperStyle={{ fontSize: '11px' }} />
                          <Bar dataKey="Encaissements" fill="#10b981" />
                          <Bar dataKey="Décaissements" fill="#ef4444" />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-full text-muted-foreground">
                        Aucune donnée disponible
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Sélection Liquidité</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-xs text-muted-foreground">Sélectionnez les comptes à suivre:</p>
                    <div className="max-h-[400px] overflow-y-auto space-y-2">
                      {allLiquidityAccounts.map((acc) => (
                        <div key={acc.id} className="flex items-center gap-2 p-2 rounded-md border border-border hover:bg-muted/50">
                          <Checkbox
                            checked={selectedLiquidityAccounts.includes(acc.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedLiquidityAccounts([...selectedLiquidityAccounts, acc.id]);
                              } else {
                                setSelectedLiquidityAccounts(selectedLiquidityAccounts.filter(id => id !== acc.id));
                              }
                            }}
                          />
                          <label className="text-xs cursor-pointer flex-1">
                            <span className="font-mono font-bold text-[10px]">{acc.number}</span> <span className="text-[10px]">{acc.name}</span>
                          </label>
                        </div>
                      ))}
                    </div>
                    {selectedLiquidityAccounts.length > 0 && (
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="w-full"
                        onClick={() => setSelectedLiquidityAccounts([])}
                      >
                        Réinitialiser
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </div>
              )}
            </TabsContent>

            {/* Tab 3: Graphiques */}
            <TabsContent value="graphiques" className="space-y-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold">Graphiques Circulaires</h3>
                  <p className="text-sm text-muted-foreground">Analyse des 4 catégories comptables</p>
                </div>
                <Select value={selectedYearForPie} onValueChange={setSelectedYearForPie}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Année" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableYears.map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {["Actifs", "Passifs", "Produits", "Charges"].map((categoryName) => {
                  const categoryLabels: Record<string, string> = {
                    "Actifs": "Classe 1",
                    "Passifs": "Classe 2",
                    "Produits": "Classe 3",
                    "Charges": "Classe 4-8"
                  };
                  const pieData = pieChartCategories[categoryName] || [];
                  const hasData = pieData.length > 0;
                  const total = pieData.reduce((sum, item) => sum + item.value, 0);

                  return (
                    <Card key={categoryName} className="flex flex-col">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base">{categoryName}</CardTitle>
                        <CardDescription className="text-xs">{categoryLabels[categoryName]}</CardDescription>
                        {hasData && (
                          <div className="mt-2 text-xs font-semibold">
                            Total: {total.toLocaleString('fr-CH', { minimumFractionDigits: 0 })}
                          </div>
                        )}
                      </CardHeader>
                      <CardContent className="flex-1 flex gap-3">
                        {hasData ? (
                          <>
                            <div className="flex-1 flex items-center justify-center min-h-[250px]">
                              <ResponsiveContainer width="100%" height={250}>
                                <PieChart>
                                  <Pie
                                    data={pieData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={50}
                                    outerRadius={85}
                                    paddingAngle={1}
                                    dataKey="value"
                                  >
                                    {pieData.map((entry, index) => (
                                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                  </Pie>
                                  <Tooltip 
                                    formatter={(value: number) => value.toLocaleString('fr-CH', { minimumFractionDigits: 0 })} 
                                    contentStyle={{
                                      backgroundColor: 'hsl(var(--background))',
                                      border: '1px solid hsl(var(--border))',
                                      borderRadius: '0.5rem',
                                      fontSize: '11px'
                                    }}
                                  />
                                </PieChart>
                              </ResponsiveContainer>
                            </div>

                            <div className="w-40 flex flex-col gap-1 max-h-[250px] overflow-y-auto pr-2">
                              {pieData.map((item, index) => {
                                const percentage = ((item.value / total) * 100).toFixed(1);
                                return (
                                  <div key={item.name} className="text-[11px] p-1.5 rounded-md bg-muted/50 border border-border flex-shrink-0">
                                    <div className="flex items-start gap-1.5">
                                      <div 
                                        className="w-2.5 h-2.5 rounded-full flex-shrink-0 mt-0.5"
                                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                                      />
                                      <div className="flex-1 min-w-0">
                                        <div className="font-semibold text-foreground truncate">{item.name.split(" - ")[0]}</div>
                                        <div className="text-muted-foreground font-mono text-[10px]">
                                          {(item.value / 1000).toFixed(1)}k
                                        </div>
                                        <div className="text-muted-foreground text-[9px] font-medium">
                                          {percentage}%
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </>
                        ) : (
                          <div className="flex items-center justify-center w-full h-[250px] text-muted-foreground text-xs">
                            Aucune donnée
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>

            {/* Tab 4: Details */}
            <TabsContent value="details">
              <Card>
                <CardHeader>
                    <CardTitle>Écritures détaillées</CardTitle>
                    <div className="mt-3">
                      <input
                        type="text"
                        placeholder="Rechercher par compte, date ou description..."
                        className="w-full px-3 py-2 border border-input rounded-md text-sm"
                        value={detailsSearchTerm}
                        onChange={(e) => setDetailsSearchTerm(e.target.value.toLowerCase())}
                      />
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Compte</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead className="text-right">Débit</TableHead>
                                <TableHead className="text-right">Crédit</TableHead>
                                <TableHead className="text-right">Solde Cumulé</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredData.filter(txn => 
                              !detailsSearchTerm || 
                              (txn.accountNumber?.toLowerCase().includes(detailsSearchTerm) ?? false) ||
                              (txn.accountName?.toLowerCase().includes(detailsSearchTerm) ?? false) ||
                              txn.description.toLowerCase().includes(detailsSearchTerm) ||
                              format(parseISO(txn.date), "dd.MM.yyyy").includes(detailsSearchTerm)
                            ).slice(0, 500).map((txn) => (
                                <TableRow key={txn.id}>
                                    <TableCell className="font-mono text-xs">{format(parseISO(txn.date), "dd.MM.yyyy")}</TableCell>
                                    <TableCell className="text-xs">
                                        <span className="font-mono font-bold mr-1">{txn.accountNumber}</span> 
                                        <span className="text-muted-foreground">{txn.accountName}</span>
                                    </TableCell>
                                    <TableCell className="max-w-[300px] truncate text-sm" title={txn.description}>{txn.description}</TableCell>
                                    <TableCell className="text-right font-mono text-muted-foreground text-sm">{txn.debit > 0 ? txn.debit.toLocaleString('fr-CH', { minimumFractionDigits: 2 }) : ""}</TableCell>
                                    <TableCell className="text-right font-mono text-muted-foreground text-sm">{txn.credit > 0 ? txn.credit.toLocaleString('fr-CH', { minimumFractionDigits: 2 }) : ""}</TableCell>
                                    <TableCell className="text-right font-mono font-medium text-sm">{txn.cumulativeBalance?.toLocaleString('fr-CH', { minimumFractionDigits: 2 })}</TableCell>
                                </TableRow>
                            ))}
                            {filteredData.filter(txn => 
                              !detailsSearchTerm || 
                              (txn.accountNumber?.toLowerCase().includes(detailsSearchTerm) ?? false) ||
                              (txn.accountName?.toLowerCase().includes(detailsSearchTerm) ?? false) ||
                              (txn.description?.toLowerCase().includes(detailsSearchTerm) ?? false) ||
                              format(parseISO(txn.date), "dd.MM.yyyy").includes(detailsSearchTerm)
                            ).length > 500 && (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center text-muted-foreground py-4">
                                        + {filteredData.length - 500} autres écritures... (Exportez pour voir tout)
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab 5: Resume */}
            <TabsContent value="resume" className="space-y-6">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h3 className="text-lg font-semibold">Situation financière</h3>
                    <p className="text-sm text-muted-foreground">Bilan et Compte de Résultat par année</p>
                  </div>
                  <Select value={selectedYearForResume} onValueChange={setSelectedYearForResume}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Année" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableYears.map((year) => (
                        <SelectItem key={year} value={year.toString()}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <Card className="lg:col-span-2">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Wallet className="h-5 w-5" /> Bilan {selectedYearForResume}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-6">
                                <div>
                                    <h4 className="font-semibold text-sm mb-3 text-emerald-700 dark:text-emerald-400">Actifs (1xxx)</h4>
                                    <div className="max-h-[400px] overflow-y-auto">
                                    <Table className="text-sm">
                                        <TableBody>
                                            {resumeDataByYear.balanceSheet.filter(i => i.accountNumber.startsWith('1')).map((item) => (
                                                <TableRow key={item.accountNumber}>
                                                    <TableCell className="text-xs"><span className="font-mono font-bold">{item.accountNumber}</span></TableCell>
                                                    <TableCell className="text-xs text-muted-foreground">{item.accountName}</TableCell>
                                                    <TableCell className="text-right font-mono text-xs">{item.amount.toLocaleString('fr-CH', { minimumFractionDigits: 0 })}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                    </div>
                                </div>
                                <div className="border-t pt-4">
                                    <h4 className="font-semibold text-sm mb-3 text-red-700 dark:text-red-400">Passifs & Fonds Propres (2xxx)</h4>
                                    <div className="max-h-[400px] overflow-y-auto">
                                    <Table className="text-sm">
                                        <TableBody>
                                            {resumeDataByYear.balanceSheet.filter(i => i.accountNumber.startsWith('2')).map((item) => (
                                                <TableRow key={item.accountNumber}>
                                                    <TableCell className="text-xs"><span className="font-mono font-bold">{item.accountNumber}</span></TableCell>
                                                    <TableCell className="text-xs text-muted-foreground">{item.accountName}</TableCell>
                                                    <TableCell className="text-right font-mono text-xs">{Math.abs(item.amount).toLocaleString('fr-CH', { minimumFractionDigits: 0 })}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">Résultat Net</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex flex-col items-center gap-3">
                                    <div className={cn("text-3xl font-bold", netResult < 0 ? "text-emerald-600" : "text-red-600")}>
                                        {Math.abs(netResult).toLocaleString('fr-CH', { minimumFractionDigits: 0 })} CHF
                                    </div>
                                    <Badge variant={netResult >= 0 ? "destructive" : "default"}>
                                        {netResult < 0 ? "Bénéfice" : "Perte"}
                                    </Badge>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base flex items-center gap-2">
                                    <FileText className="h-4 w-4" /> Santé financière
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {ratios.slice(0, 4).map(ratio => (
                                    <div key={ratio.name} className="flex justify-between items-center">
                                        <span className="text-xs text-muted-foreground truncate">{ratio.name}</span>
                                        <div className="flex items-center gap-1">
                                            <span className="font-mono font-bold text-sm">{ratio.value.toFixed(1)}{ratio.unit}</span>
                                            <RatioStatusIcon status={ratio.status} size={14} />
                                        </div>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    </div>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" /> Compte de Résultat {selectedYearForResume}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table className="text-sm">
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="text-xs">Compte</TableHead>
                                    <TableHead className="text-right text-xs">Montant</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {resumeDataByYear.incomeStatement.map((item) => (
                                    <TableRow key={item.accountNumber}>
                                        <TableCell className="text-xs">
                                            <span className="font-mono font-bold mr-2">{item.accountNumber}</span>
                                            <span className="text-muted-foreground">{item.accountName}</span>
                                        </TableCell>
                                        <TableCell className={cn("text-right font-mono text-xs", item.amount < 0 ? "text-emerald-600" : "text-red-600")}>
                                            {item.amount.toLocaleString('fr-CH', { minimumFractionDigits: 0 })}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </TabsContent>

            {/* Tab 6: Ratios */}
            <TabsContent value="ratios" className="space-y-6">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4">Ratios Financiers Détaillés</h3>
                  <p className="text-sm text-muted-foreground mb-6">Analyse complète avec méthodes de calcul</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Liquidité */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Wallet className="h-4 w-4" /> Liquidité courante
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="p-3 bg-muted/50 rounded-lg">
                        <p className="text-sm font-semibold mb-2">Formule :</p>
                        <p className="text-xs font-mono bg-background p-2 rounded border">Actifs circulants (10x-13x) / Passifs court terme (20x-23x)</p>
                      </div>
                      <div className="p-3 bg-blue-50/30 dark:bg-blue-900/20 rounded-lg">
                        <p className="text-sm font-semibold mb-2">Interprétation :</p>
                        <p className="text-xs text-muted-foreground">Mesure la capacité à couvrir les dettes à court terme. Idéal : &gt; 1.5</p>
                      </div>
                      <div className="p-3 bg-primary/10 rounded-lg">
                        <p className="text-sm font-bold">{ratios.find(r => r.name === "Liquidité courante")?.value.toFixed(2) || "N/A"} {ratios.find(r => r.name === "Liquidité courante")?.unit}</p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Liquidité immédiate */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Wallet className="h-4 w-4" /> Liquidité immédiate
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="p-3 bg-muted/50 rounded-lg">
                        <p className="text-sm font-semibold mb-2">Formule :</p>
                        <p className="text-xs font-mono bg-background p-2 rounded border">(Actifs circulants - Stocks) / Passifs court terme</p>
                      </div>
                      <div className="p-3 bg-blue-50/30 dark:bg-blue-900/20 rounded-lg">
                        <p className="text-sm font-semibold mb-2">Interprétation :</p>
                        <p className="text-xs text-muted-foreground">Liquidité sans les stocks. Idéal : ≥ 1</p>
                      </div>
                      <div className="p-3 bg-primary/10 rounded-lg">
                        <p className="text-sm font-bold">{ratios.find(r => r.name === "Liquidité immédiate")?.value.toFixed(2) || "N/A"} {ratios.find(r => r.name === "Liquidité immédiate")?.unit}</p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Marge nette */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <TrendingUp className="h-4 w-4" /> Marge nette
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="p-3 bg-muted/50 rounded-lg">
                        <p className="text-sm font-semibold mb-2">Formule :</p>
                        <p className="text-xs font-mono bg-background p-2 rounded border">(Résultat Net / Chiffre d'affaires) × 100</p>
                      </div>
                      <div className="p-3 bg-blue-50/30 dark:bg-blue-900/20 rounded-lg">
                        <p className="text-sm font-semibold mb-2">Interprétation :</p>
                        <p className="text-xs text-muted-foreground">Pourcentage du CA converti en profit. Idéal : &gt; 10%</p>
                      </div>
                      <div className="p-3 bg-primary/10 rounded-lg">
                        <p className="text-sm font-bold">{ratios.find(r => r.name === "Marge nette")?.value.toFixed(1) || "N/A"}%</p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* ROA */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <TrendingUp className="h-4 w-4" /> ROA (Rentabilité des actifs)
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="p-3 bg-muted/50 rounded-lg">
                        <p className="text-sm font-semibold mb-2">Formule :</p>
                        <p className="text-xs font-mono bg-background p-2 rounded border">(Résultat Net / Total Actif) × 100</p>
                      </div>
                      <div className="p-3 bg-blue-50/30 dark:bg-blue-900/20 rounded-lg">
                        <p className="text-sm font-semibold mb-2">Interprétation :</p>
                        <p className="text-xs text-muted-foreground">Efficacité à générer du profit avec les actifs. Idéal : &gt; 5%</p>
                      </div>
                      <div className="p-3 bg-primary/10 rounded-lg">
                        <p className="text-sm font-bold">{ratios.find(r => r.name === "ROA")?.value.toFixed(1) || "N/A"}%</p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* ROE */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <TrendingUp className="h-4 w-4" /> ROE (Rentabilité fonds propres)
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="p-3 bg-muted/50 rounded-lg">
                        <p className="text-sm font-semibold mb-2">Formule :</p>
                        <p className="text-xs font-mono bg-background p-2 rounded border">(Résultat Net / Capitaux Propres) × 100</p>
                      </div>
                      <div className="p-3 bg-blue-50/30 dark:bg-blue-900/20 rounded-lg">
                        <p className="text-sm font-semibold mb-2">Interprétation :</p>
                        <p className="text-xs text-muted-foreground">Rentabilité pour les actionnaires. Idéal : &gt; 10%</p>
                      </div>
                      <div className="p-3 bg-primary/10 rounded-lg">
                        <p className="text-sm font-bold">{ratios.find(r => r.name === "ROE")?.value.toFixed(1) || "N/A"}%</p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Marge EBITDA */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <TrendingUp className="h-4 w-4" /> Marge EBITDA
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="p-3 bg-muted/50 rounded-lg">
                        <p className="text-sm font-semibold mb-2">Formule :</p>
                        <p className="text-xs font-mono bg-background p-2 rounded border">(CA - Coûts directs - Charges) / CA × 100</p>
                      </div>
                      <div className="p-3 bg-blue-50/30 dark:bg-blue-900/20 rounded-lg">
                        <p className="text-sm font-semibold mb-2">Interprétation :</p>
                        <p className="text-xs text-muted-foreground">Rentabilité opérationnelle avant amortissements. Idéal : &gt; 15%</p>
                      </div>
                      <div className="p-3 bg-primary/10 rounded-lg">
                        <p className="text-sm font-bold">{ratios.find(r => r.name === "Marge EBITDA")?.value.toFixed(1) || "N/A"}%</p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Ratio fonds propres */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Wallet className="h-4 w-4" /> Ratio fonds propres
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="p-3 bg-muted/50 rounded-lg">
                        <p className="text-sm font-semibold mb-2">Formule :</p>
                        <p className="text-xs font-mono bg-background p-2 rounded border">Capitaux propres / Total Actif</p>
                      </div>
                      <div className="p-3 bg-blue-50/30 dark:bg-blue-900/20 rounded-lg">
                        <p className="text-sm font-semibold mb-2">Interprétation :</p>
                        <p className="text-xs text-muted-foreground">Indépendance financière. Idéal : 30-60%</p>
                      </div>
                      <div className="p-3 bg-primary/10 rounded-lg">
                        <p className="text-sm font-bold">{((ratios.find(r => r.name === "Ratio fonds propres")?.value || 0) * 100).toFixed(1)}%</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>

            {/* Tab 7: Infos */}
            <TabsContent value="infos" className="space-y-6">
              <Card className="border border-blue-200/50 bg-blue-50/30 dark:bg-blue-900/10">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Info className="h-5 w-5 text-blue-600" />
                    À propos du stockage des données
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="border-l-4 border-red-500 pl-4 py-2 bg-red-50/30 dark:bg-red-900/10 rounded">
                      <h3 className="font-semibold text-red-900 dark:text-red-300 mb-2">❌ Pas de persistence</h3>
                      <ul className="space-y-2 text-sm text-red-800 dark:text-red-200">
                        <li className="flex items-start gap-2">
                          <span className="font-bold">•</span>
                          <span>Les données Excel sont stockées <strong>en mémoire</strong> (contexte React)</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="font-bold">•</span>
                          <span>Elles <strong>disparaissent</strong> si vous rafraîchissez la page</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="font-bold">•</span>
                          <span>Chaque import <strong>remplace les données précédentes</strong></span>
                        </li>
                      </ul>
                    </div>

                    <div className="border-l-4 border-green-500 pl-4 py-2 bg-green-50/30 dark:bg-green-900/10 rounded">
                      <h3 className="font-semibold text-green-900 dark:text-green-300 mb-2">✅ Backend configuré mais pas utilisé</h3>
                      <ul className="space-y-2 text-sm text-green-800 dark:text-green-200">
                        <li className="flex items-start gap-2">
                          <span className="font-bold">•</span>
                          <span><strong>Express.js</strong> est configuré</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="font-bold">•</span>
                          <span><strong>PostgreSQL + Drizzle ORM</strong> sont en place</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="font-bold">•</span>
                          <span>Aucune API n'est implémentée pour sauvegarder les données Excel</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="font-bold">•</span>
                          <span>Le backend existe mais n'interagit pas avec vos imports</span>
                        </li>
                      </ul>
                    </div>

                    <div className="p-4 bg-amber-50/50 dark:bg-amber-900/20 rounded border border-amber-200/50">
                      <p className="text-sm text-amber-900 dark:text-amber-300">
                        💡 <strong>Conseil :</strong> Téléchargez vos rapports avant de quitter pour ne pas perdre votre analyse !
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

function UploadPageIcon(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" x2="12" y1="3" y2="15" />
        </svg>
    )
}

function RatioStatusIcon({ status, size = 16 }: { status?: "good" | "warning" | "bad" | "neutral", size?: number }) {
    if (status === "good") return <ArrowUpRight size={size} className="text-emerald-500" />;
    if (status === "bad") return <ArrowDownRight size={size} className="text-red-500" />;
    if (status === "warning") return <Minus size={size} className="text-amber-500" />;
    return <Minus size={size} className="text-muted-foreground" />;
}
