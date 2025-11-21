import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ACCOUNTS as MOCK_ACCOUNTS, TRANSACTIONS as MOCK_TRANSACTIONS, BALANCE_SHEET as MOCK_BALANCE_SHEET, INCOME_STATEMENT as MOCK_INCOME_STATEMENT, CATEGORIES } from "@/lib/mockData";
import { format, parseISO, startOfYear, endOfYear } from "date-fns";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CalendarDateRangePicker } from "@/components/dashboard/date-range-picker";
import { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";
import { Download, Filter, TrendingUp, Wallet, FileText, FileSpreadsheet } from "lucide-react";
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

export default function Dashboard() {
  const { data } = useData();
  const [, setLocation] = useLocation();

  // Fallback to mock data if no context data (e.g. direct access)
  // In a real app, we might redirect to upload.
  const accounts = data?.accounts || MOCK_ACCOUNTS;
  const transactions = data?.transactions || MOCK_TRANSACTIONS;
  const balanceSheet = data?.balanceSheet || MOCK_BALANCE_SHEET;
  const incomeStatement = data?.incomeStatement || MOCK_INCOME_STATEMENT;
  
  const [selectedCategory, setSelectedCategory] = useState<string>("Tous les comptes");
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfYear(new Date()),
    to: endOfYear(new Date()),
  });

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
      
      // Balance Sheet
      const wsBS = XLSX.utils.json_to_sheet(data.processedFiles.financialStatements.balanceSheet);
      XLSX.utils.book_append_sheet(wb, wsBS, "Balance Sheet");
      
      // Income Statement
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


  // Filter Logic
  const filteredData = useMemo(() => {
    const pattern = new RegExp(CATEGORIES[selectedCategory as keyof typeof CATEGORIES]);
    
    // 1. Filter Accounts based on Category and Selection
    const relevantAccounts = accounts.filter(acc => {
        if (selectedAccounts.length > 0) {
            return selectedAccounts.includes(acc.id);
        }
        // Use category if available, else try to match number regex
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
    // We need to sort by date first
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

  // Chart Data Preparation
  const chartData = useMemo(() => {
    return filteredData.map(t => ({
        date: format(parseISO(t.date), "dd.MM.yyyy"),
        timestamp: new Date(t.date).getTime(),
        balance: t.cumulativeBalance,
        account: `${t.accountNumber} - ${t.accountName}`,
        [t.accountNumber!]: t.cumulativeBalance
    }));
  }, [filteredData]);

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

  const netResult = incomeStatement.reduce((acc, item) => acc + item.amount, 0);

  return (
    <div className="min-h-screen bg-background font-sans text-foreground p-6 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg text-primary">
                <TrendingUp className="h-8 w-8" />
            </div>
            Mecahome Sarl
          </h1>
          <p className="text-muted-foreground mt-2 text-lg">Suivi Évolution des Comptes</p>
        </div>
        <div className="flex items-center gap-2">
            {!data && (
                 <Button variant="outline" size="sm" onClick={() => setLocation("/")}>
                    <UploadPageIcon className="mr-2 h-4 w-4" /> Nouvel Import
                 </Button>
            )}
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="default" size="sm">
                    <Download className="mr-2 h-4 w-4" /> Exporter Rapports
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
              </DropdownMenuContent>
            </DropdownMenu>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar / Filters */}
        <Card className="h-fit lg:col-span-1 border-sidebar-border bg-sidebar/30 backdrop-blur-sm shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Filter className="h-4 w-4" /> Filtres</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Catégorie</label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
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
              <label className="text-sm font-medium">Période</label>
              <CalendarDateRangePicker date={dateRange} setDate={setDateRange} />
            </div>

            <div className="p-4 bg-muted/50 rounded-md text-sm text-muted-foreground">
                <p>Comptes: {summaryStats.length}</p>
                <p>Écritures: {filteredData.length}</p>
            </div>
          </CardContent>
        </Card>

        {/* Main Content */}
        <div className="lg:col-span-3">
          <Tabs defaultValue="evolution" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
              <TabsTrigger value="evolution">Évolution</TabsTrigger>
              <TabsTrigger value="details">Détails</TabsTrigger>
              <TabsTrigger value="resume">Résumé</TabsTrigger>
            </TabsList>

            {/* Tab 1: Evolution */}
            <TabsContent value="evolution" className="space-y-6">
              <Card>
                <CardHeader>
                    <CardTitle>Évolution du solde cumulé</CardTitle>
                    <CardDescription>Visualisation graphique des mouvements par compte</CardDescription>
                </CardHeader>
                <CardContent className="h-[400px]">
                  {filteredData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                            <XAxis 
                                dataKey="date" 
                                stroke="hsl(var(--muted-foreground))" 
                                fontSize={12} 
                                tickLine={false} 
                                axisLine={false}
                                minTickGap={30}
                            />
                            <YAxis 
                                stroke="hsl(var(--muted-foreground))" 
                                fontSize={12} 
                                tickLine={false} 
                                axisLine={false}
                                tickFormatter={(value) => `${value}`}
                            />
                            <Tooltip 
                                contentStyle={{ backgroundColor: "hsl(var(--popover))", borderColor: "hsl(var(--border))", borderRadius: "var(--radius)" }}
                                itemStyle={{ color: "hsl(var(--popover-foreground))" }}
                            />
                            <Legend />
                            {summaryStats.slice(0, 5).map((stat, index) => (
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
                            ))}
                        </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-full items-center justify-center text-muted-foreground">
                        Aucune donnée pour ces critères
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                    <CardTitle>Variation des soldes</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Compte</TableHead>
                                <TableHead className="text-right">Solde début</TableHead>
                                <TableHead className="text-right">Solde fin</TableHead>
                                <TableHead className="text-right">Variation</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {summaryStats.map((stat) => (
                                <TableRow key={stat.account}>
                                    <TableCell className="font-medium">{stat.account}</TableCell>
                                    <TableCell className="text-right font-mono">{stat.start.toFixed(2)}</TableCell>
                                    <TableCell className="text-right font-mono">{stat.end.toFixed(2)}</TableCell>
                                    <TableCell className={cn("text-right font-mono font-bold", stat.variation >= 0 ? "text-emerald-600" : "text-red-600")}>
                                        {stat.variation > 0 ? "+" : ""}{stat.variation.toFixed(2)}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
              </Card>
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
                            {filteredData.map((txn) => (
                                <TableRow key={txn.id}>
                                    <TableCell className="font-mono text-xs">{format(parseISO(txn.date), "dd.MM.yyyy")}</TableCell>
                                    <TableCell className="text-xs">{txn.accountNumber} - {txn.accountName}</TableCell>
                                    <TableCell className="max-w-[200px] truncate" title={txn.description}>{txn.description}</TableCell>
                                    <TableCell className="text-right font-mono text-muted-foreground">{txn.debit > 0 ? txn.debit.toFixed(2) : "-"}</TableCell>
                                    <TableCell className="text-right font-mono text-muted-foreground">{txn.credit > 0 ? txn.credit.toFixed(2) : "-"}</TableCell>
                                    <TableCell className="text-right font-mono font-medium">{txn.cumulativeBalance?.toFixed(2)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab 3: Resume */}
            <TabsContent value="resume">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Wallet className="h-5 w-5" /> Bilan (Extrait)</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Compte</TableHead>
                                        <TableHead className="text-right">Montant</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {balanceSheet.map((item) => (
                                        <TableRow key={item.accountNumber}>
                                            <TableCell>{item.accountNumber} - {item.accountName}</TableCell>
                                            <TableCell className="text-right font-mono">{item.amount.toLocaleString('fr-CH', { minimumFractionDigits: 2 })}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" /> Compte de Résultat</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                             <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Compte</TableHead>
                                        <TableHead className="text-right">Montant</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {incomeStatement.map((item) => (
                                        <TableRow key={item.accountNumber}>
                                            <TableCell>{item.accountNumber} - {item.accountName}</TableCell>
                                            <TableCell className={cn("text-right font-mono", item.amount < 0 ? "text-red-500" : "")}>
                                                {item.amount.toLocaleString('fr-CH', { minimumFractionDigits: 2 })}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                            
                            <div className="flex justify-between items-center p-4 bg-muted rounded-lg border border-border">
                                <span className="font-bold text-lg">Résultat Net</span>
                                <Badge variant={netResult >= 0 ? "default" : "destructive"} className="text-lg px-3 py-1">
                                    {netResult.toLocaleString('fr-CH', { style: 'currency', currency: 'CHF' })}
                                </Badge>
                            </div>
                        </CardContent>
                    </Card>
                </div>
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
