import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useData } from "@/lib/data-context";
import { useLocation } from "wouter";
import { ArrowLeft } from "lucide-react";
import { parseISO, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear } from "date-fns";
import { ACCOUNTS as MOCK_ACCOUNTS, TRANSACTIONS as MOCK_TRANSACTIONS } from "@/lib/mockData";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type PeriodType = "monthly" | "quarterly" | "semi-annual" | "annual";

interface CategoryData {
  name: string;
  prefix: string[];
  label: string;
  color: string;
}

export default function PieChartsPage() {
  const { data } = useData();
  const [, setLocation] = useLocation();

  const accounts = data?.accounts || MOCK_ACCOUNTS;
  const transactions = data?.transactions || MOCK_TRANSACTIONS;

  const [periodType, setPeriodType] = useState<PeriodType>("annual");

  // Define the 4 main categories
  const categories: CategoryData[] = [
    { name: "Actifs", prefix: ["1"], label: "Comptes 1XXXXX", color: "hsl(var(--chart-1))" },
    { name: "Passifs", prefix: ["2"], label: "Comptes 2XXXX", color: "hsl(var(--chart-2))" },
    { name: "Produits", prefix: ["3"], label: "Comptes 3XXXX", color: "hsl(var(--chart-3))" },
    { name: "Charges", prefix: ["4", "5", "6", "7", "8"], label: "Comptes 4XXXX-8999X", color: "hsl(var(--chart-4))" }
  ];

  // Get date range based on period type
  const getDateRange = (date: Date, type: PeriodType) => {
    switch (type) {
      case "monthly":
        return { start: startOfMonth(date), end: endOfMonth(date) };
      case "quarterly":
        return { start: startOfQuarter(date), end: endOfQuarter(date) };
      case "semi-annual":
        const month = date.getMonth();
        const year = date.getFullYear();
        if (month < 6) {
          return { start: new Date(year, 0, 1), end: new Date(year, 5, 30) };
        } else {
          return { start: new Date(year, 6, 1), end: new Date(year, 11, 31) };
        }
      case "annual":
        return { start: startOfYear(date), end: endOfYear(date) };
    }
  };

  // Calculate pie chart data for each category
  const chartDataByCategory = useMemo(() => {
    const now = new Date();
    const dateRange = getDateRange(now, periodType);

    const result: Record<string, Array<{ name: string; value: number }>> = {};

    categories.forEach((category) => {
      // Get all accounts for this category
      const categoryAccounts = accounts.filter(acc => {
        const firstChar = acc.number.substring(0, 1);
        return category.prefix.includes(firstChar);
      });

      const accountsMap = new Map(categoryAccounts.map(a => [a.id, a]));

      // Filter transactions for this category in the date range
      const categoryTransactions = transactions.filter(txn => {
        if (!accountsMap.has(txn.accountId)) return false;
        const txnDate = parseISO(txn.date);
        return txnDate >= dateRange.start && txnDate <= dateRange.end;
      });

      // Group by account and sum debits/credits
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

      // Create pie chart entries
      const pieData = Object.values(accountData)
        .map(item => ({
          name: item.name,
          value: Math.abs(item.debit - item.credit)
        }))
        .filter(item => item.value > 0)
        .sort((a, b) => b.value - a.value)
        .slice(0, 10); // Limit to top 10 accounts

      result[category.name] = pieData.length > 0 ? pieData : [{ name: "Aucune donnée", value: 0 }];
    });

    return result;
  }, [transactions, accounts, periodType, categories]);

  // Colors for pie charts
  const PIE_COLORS = [
    'hsl(var(--chart-1))',
    'hsl(var(--chart-2))',
    'hsl(var(--chart-3))',
    'hsl(var(--chart-4))',
    'hsl(var(--chart-5))',
  ];

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => setLocation("/dashboard")}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Retour
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Visualisation par Graphiques Circulaires</h1>
            <p className="text-muted-foreground">Analyse par catégories comptables</p>
          </div>
        </div>

        {/* Period Selection Tabs */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Sélection de Période</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={periodType} onValueChange={(value) => setPeriodType(value as PeriodType)}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="monthly" data-testid="tab-monthly">Mensuel</TabsTrigger>
                <TabsTrigger value="quarterly" data-testid="tab-quarterly">Trimestriel</TabsTrigger>
                <TabsTrigger value="semi-annual" data-testid="tab-semi-annual">Semestriel</TabsTrigger>
                <TabsTrigger value="annual" data-testid="tab-annual">Annuel</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardContent>
        </Card>

        {/* 4 Pie Charts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {categories.map((category) => {
            const pieData = chartDataByCategory[category.name] || [];
            const hasData = pieData.some(d => d.value > 0);
            const total = pieData.reduce((sum, item) => sum + item.value, 0);

            return (
              <Card key={category.name} className="flex flex-col">
                <CardHeader>
                  <CardTitle className="text-lg">{category.name}</CardTitle>
                  <CardDescription>{category.label}</CardDescription>
                  {hasData && (
                    <div className="mt-2 text-sm font-semibold">
                      Total: {total.toLocaleString('fr-CH', { minimumFractionDigits: 0 })}
                    </div>
                  )}
                </CardHeader>
                <CardContent className="flex-1 flex items-center justify-center">
                  {hasData ? (
                    <ResponsiveContainer width="100%" height={400}>
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={(entry) => `${entry.name.split(' - ')[0]}: ${(entry.value / 1000).toFixed(1)}k`}
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value: number) => value.toLocaleString('fr-CH', { minimumFractionDigits: 0 })} 
                          contentStyle={{
                            backgroundColor: 'hsl(var(--background))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '0.5rem'
                          }}
                        />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-[400px] text-muted-foreground text-sm">
                      Aucune donnée pour cette période
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
