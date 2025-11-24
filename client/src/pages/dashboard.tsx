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
import { Download, Filter, TrendingUp, Wallet, FileText, FileSpreadsheet, Camera, BarChart3, PieChart as PieChartIcon, ArrowUpRight, ArrowDownRight, Minus, RotateCcw, ChevronDown, ChevronRight } from "lucide-react";
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
  }, [availableYears, selectedYearForPie]);

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
        const movement = txn.debit - txn.credit;
        accountBalances[txn.accountId] = (accountBalances[txn.accountId] || 0) + movement;
        
        const account = accounts.find(a => a.id === txn.accountId);
        
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
        let runningBalance = 0;
        
        // We need to process all transactions in order to get a correct running sum for the category
        // filteredData is already sorted by date
        
        // Group by date first
        const dailyMovements: Record<string, number> = {};
        filteredData.forEach(t => {
            const d = format(parseISO(t.date), "dd.MM.yyyy");
            dailyMovements[d] = (dailyMovements[d] || 0) + t.movement;
        });

        // Create cumulative trend
        // Note: This is simplified. Ideally we need all dates in range.
        const dates = Object.keys(dailyMovements).sort((a, b) => {
             return parse(a, "dd.MM.yyyy", new Date()).getTime() - parse(b, "dd.MM.yyyy", new Date()).getTime();
        });
        
        const result = [];
        let cumulative = 0;
        
        // Add initial point?
        
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
        // Individual Lines
        return filteredData.map(t => ({
            date: format(parseISO(t.date), "dd.MM.yyyy"),
            timestamp: new Date(t.date).getTime(),
            balance: t.cumulativeBalance,
            account: `${t.accountNumber} - ${t.accountName}`,
            [t.accountNumber!]: t.cumulativeBalance
        }));
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

  // Comparison Data for Bar Chart - Full detailed version with all categories and sub-accounts
  const comparisonDataFull = useMemo(() => {
    const yearsSet = new Set<number>();
    const accountsMap = new Map(accounts.map(a => [a.id, { number: a.number, name: a.name }]));
    
    transactions.forEach(txn => {
      yearsSet.add(new Date(parseISO(txn.date)).getFullYear());
    });

    const years = Array.from(yearsSet).sort();
    
    const dataByCategory: Record<string, Record<number, number>> = {};
    const dataBySubAccount: Record<string, Record<number, number>> = {};
    
    // Initialize sub-account data for ALL accounts
    accounts.forEach(acc => {
      const subAccountKey = `${acc.number} - ${acc.name}`;
      dataBySubAccount[subAccountKey] = {};
      years.forEach(year => {
        dataBySubAccount[subAccountKey][year] = 0;
      });
    });
    
    transactions.forEach(txn => {
      const year = new Date(parseISO(txn.date)).getFullYear();
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
      dataByCategory[categoryKey][year] = (dataByCategory[categoryKey][year] || 0) + amount;
      dataBySubAccount[subAccountKey][year] = (dataBySubAccount[subAccountKey][year] || 0) + amount;
    });

    // For balance sheet accounts (1xxx, 2xxx), calculate cumulative balances
    const finalDataByCategory: Record<string, Record<number, number>> = {};
    const finalDataBySubAccount: Record<string, Record<number, number>> = {};
    
    Object.entries(dataByCategory).forEach(([category, yearData]) => {
      const categoryCode = category.substring(0, 2);
      finalDataByCategory[category] = {};
      
      if (categoryCode.startsWith('1') || categoryCode.startsWith('2')) {
        let cumulative = 0;
        years.forEach(year => {
          cumulative += yearData[year] || 0;
          finalDataByCategory[category][year] = cumulative;
        });
      } else {
        finalDataByCategory[category] = yearData;
      }
    });
    
    Object.entries(dataBySubAccount).forEach(([subAccount, yearData]) => {
      const categoryCode = subAccount.substring(0, 2);
      finalDataBySubAccount[subAccount] = {};
      
      if (categoryCode.startsWith('1') || categoryCode.startsWith('2')) {
        let cumulative = 0;
        years.forEach(year => {
          cumulative += yearData[year] || 0;
          finalDataBySubAccount[subAccount][year] = cumulative;
        });
      } else {
        finalDataBySubAccount[subAccount] = yearData;
      }
    });

    // Transform to recharts format - include both categories and sub-accounts
    const chartData = years.map(year => ({
      year: year.toString(),
      ...Object.fromEntries(
        Object.entries(finalDataByCategory).map(([category, data]) => [
          category,
          Math.abs(data[year] || 0)
        ])
      ),
      ...Object.fromEntries(
        Object.entries(finalDataBySubAccount).map(([subAccount, data]) => [
          subAccount,
          Math.abs(data[year] || 0)
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

    return { chartData, years, allCategories: allCategoriesFiltered, subAccountsByCategory };
  }, [transactions, accounts]);

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

  // Pie Chart Data by Categories (Actifs, Passifs, Produits, Charges)
  const pieChartCategories = useMemo(() => {
    if (!selectedYearForPie) return {};

    const year = parseInt(selectedYearForPie);
    const dateRange = { 
      start: startOfYear(new Date(year, 0, 1)), 
      end: endOfYear(new Date(year, 0, 1))
    };

    const categoryDefs = [
      { name: "Actifs", prefix: ["1"], label: "Comptes 1XXXXX" },
      { name: "Passifs", prefix: ["2"], label: "Comptes 2XXXX" },
      { name: "Produits", prefix: ["3"], label: "Comptes 3XXXX" },
      { name: "Charges", prefix: ["4", "5", "6", "7", "8"], label: "Comptes 4XXXX-8999X" }
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

  const netResult = incomeStatement.reduce((acc, item) => acc + item.amount, 0);
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
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                <Card className="lg:col-span-3">
                  <CardHeader>
                    <CardTitle>Montants par Année et Catégorie</CardTitle>
                    <CardDescription>Sélectionnez les catégories à afficher pour une comparaison détaillée</CardDescription>
                  </CardHeader>
                  <CardContent className="h-[400px]">
                    {comparisonDataFull.chartData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={comparisonDataFull.chartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                          <XAxis dataKey="year" stroke="hsl(var(--muted-foreground))" fontSize={12} />
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
                    "Actifs": "Comptes 1XXXXX",
                    "Passifs": "Comptes 2XXXX",
                    "Produits": "Comptes 3XXXX",
                    "Charges": "Comptes 4XXXX-8999X"
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
                                    innerRadius={40}
                                    outerRadius={70}
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
                              {pieData.map((item, index) => (
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
                                    </div>
                                  </div>
                                </div>
                              ))}
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
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <Card className="lg:col-span-2">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Wallet className="h-5 w-5" /> Bilan</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-6">
                                <div>
                                    <h4 className="font-semibold text-sm mb-3 text-emerald-700 dark:text-emerald-400">Actifs (1xxx)</h4>
                                    <div className="max-h-[400px] overflow-y-auto">
                                    <Table className="text-sm">
                                        <TableBody>
                                            {balanceSheet.filter(i => i.accountNumber.startsWith('1')).map((item) => (
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
                                            {balanceSheet.filter(i => i.accountNumber.startsWith('2')).map((item) => (
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
                        <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" /> Compte de Résultat</CardTitle>
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
                                {incomeStatement.map((item) => (
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
