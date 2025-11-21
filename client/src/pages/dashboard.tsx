import { useState, useMemo, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ACCOUNTS as MOCK_ACCOUNTS, TRANSACTIONS as MOCK_TRANSACTIONS, BALANCE_SHEET as MOCK_BALANCE_SHEET, INCOME_STATEMENT as MOCK_INCOME_STATEMENT, CATEGORIES } from "@/lib/mockData";
import { format, parseISO, startOfYear, endOfYear } from "date-fns";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from "recharts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CalendarDateRangePicker } from "@/components/dashboard/date-range-picker";
import { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";
import { Download, Filter, TrendingUp, Wallet, FileText, FileSpreadsheet, Camera, BarChart3, ArrowUpRight, ArrowDownRight, Minus, RotateCcw } from "lucide-react";
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
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [selectedYearsForCharts, setSelectedYearsForCharts] = useState<number[]>([]);
  const [accountSearchTerm, setAccountSearchTerm] = useState<string>("");

  // Extract available years from transactions
  const availableYears = useMemo(() => {
    const years = new Set(transactions.map(t => new Date(parseISO(t.date)).getFullYear()));
    return Array.from(years).sort((a, b) => a - b);
  }, [transactions]);

  // Initialize selected years on first load
  useEffect(() => {
    if (selectedYearsForCharts.length === 0 && availableYears.length > 0) {
      setSelectedYearsForCharts(availableYears);
    }
  }, [availableYears]);

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
                HBO Analytics
              </h1>
              <p className="text-muted-foreground mt-1 text-sm">Suivi Évolution des Comptes • {filteredData.length} écritures</p>
            </div>
            <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => { setSelectedCategory("Tous les comptes"); setSelectedAccounts([]); setDateRange(defaultDateRange); }} data-testid="button-reset-filters">
                  <RotateCcw className="mr-2 h-4 w-4" /> Réinitialiser
                </Button>
                {!data && (
                     <Button variant="outline" size="sm" onClick={() => setLocation("/")}>
                        <UploadPageIcon className="mr-2 h-4 w-4" /> Nouvel Import
                     </Button>
                )}
                <Button variant="link" size="sm" onClick={() => setLocation("/ratios")}>
                  <FileText className="mr-2 h-4 w-4" /> Ratios
                </Button>
                <Button variant="link" size="sm" onClick={() => setLocation("/plan-comptable")}>
                  <FileSpreadsheet className="mr-2 h-4 w-4" /> Plan
                </Button>
                <Button variant="link" size="sm" onClick={() => setLocation("/comparison")}>
                  <BarChart3 className="mr-2 h-4 w-4" /> Comparaison
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
                    {Object.keys(CATEGORIES).map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
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
              <TabsTrigger value="details" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none py-2 px-1">Détails</TabsTrigger>
              <TabsTrigger value="resume" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none py-2 px-1">Résumé</TabsTrigger>
            </TabsList>

            {/* Tab 1: Evolution */}
            <TabsContent value="evolution" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <Card className="lg:col-span-2" ref={chartRef}>
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

                  <div className="space-y-6">
                      <Card>
                        <CardHeader>
                            <CardTitle>Top Variations</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Compte</TableHead>
                                        <TableHead className="text-right">Var.</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {summaryStats.slice(0, 5).map((stat) => (
                                        <TableRow key={stat.account}>
                                            <TableCell className="font-medium text-xs">
                                                <div className="font-mono">{stat.account.split(' - ')[0]}</div>
                                                <div className="truncate w-24 text-muted-foreground" title={stat.account.split(' - ')[1]}>{stat.account.split(' - ')[1]}</div>
                                            </TableCell>
                                            <TableCell className={cn("text-right font-mono font-bold text-xs", stat.variation >= 0 ? "text-emerald-600" : "text-red-600")}>
                                                {stat.variation > 0 ? "+" : ""}{stat.variation.toLocaleString('fr-CH', { maximumFractionDigits: 0 })}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                      </Card>
                      
                      <div className="space-y-3">
                          <div>
                              <label className="text-sm font-medium block mb-2">Années pour graphiques:</label>
                              <div className="flex gap-1 flex-wrap p-2 border rounded-md bg-muted/30">
                                  {availableYears.map(year => (
                                      <Button
                                          key={year}
                                          size="sm"
                                          variant={selectedYearsForCharts.includes(year) ? "default" : "outline"}
                                          className="h-6 px-2 text-xs"
                                          onClick={() => {
                                              if (selectedYearsForCharts.includes(year)) {
                                                  setSelectedYearsForCharts(selectedYearsForCharts.filter(y => y !== year));
                                              } else {
                                                  setSelectedYearsForCharts([...selectedYearsForCharts, year]);
                                              }
                                          }}
                                      >
                                          {year}
                                      </Button>
                                  ))}
                              </div>
                              {selectedYearsForCharts.length === 0 && (
                                  <p className="text-[10px] text-red-500 mt-1">Sélectionnez au moins une année</p>
                              )}
                          </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <Card>
                          <CardHeader>
                              <CardTitle>Répartition Charges</CardTitle>
                          </CardHeader>
                          <CardContent>
                                {pieChartDataCharges.length > 0 ? (
                                    <div className="w-full aspect-square flex items-center justify-center">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={pieChartDataCharges}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={30}
                                                    outerRadius={60}
                                                    paddingAngle={3}
                                                    dataKey="value"
                                                >
                                                    {pieChartDataCharges.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                                    ))}
                                                </Pie>
                                                <Tooltip formatter={(value: number) => value.toLocaleString('fr-CH', { minimumFractionDigits: 0 })} />
                                                <Legend wrapperStyle={{ fontSize: '12px' }} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-center aspect-square text-muted-foreground bg-muted/10 rounded-lg border border-dashed">
                                        Aucune donnée
                                    </div>
                                )}
                          </CardContent>
                      </Card>

                      <Card>
                          <CardHeader>
                              <CardTitle>Répartition Produits</CardTitle>
                          </CardHeader>
                          <CardContent>
                                {pieChartDataProduits.length > 0 ? (
                                    <div className="w-full aspect-square flex items-center justify-center">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={pieChartDataProduits}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={30}
                                                    outerRadius={60}
                                                    paddingAngle={3}
                                                    dataKey="value"
                                                >
                                                    {pieChartDataProduits.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                                    ))}
                                                </Pie>
                                                <Tooltip formatter={(value: number) => value.toLocaleString('fr-CH', { minimumFractionDigits: 0 })} />
                                                <Legend wrapperStyle={{ fontSize: '12px' }} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-center aspect-square text-muted-foreground bg-muted/10 rounded-lg border border-dashed">
                                        Aucune donnée
                                    </div>
                                )}
                          </CardContent>
                      </Card>
                      </div>
                  </div>
              </div>
            </TabsContent>

            {/* Tab 2: Details */}
            <TabsContent value="details">
              <Card>
                <CardHeader>
                    <CardTitle>Écritures détaillées</CardTitle>
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
                            {filteredData.slice(0, 500).map((txn) => (
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
                            {filteredData.length > 500 && (
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

            {/* Tab 3: Resume */}
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
