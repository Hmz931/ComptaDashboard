import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useData } from "@/lib/data-context";
import { useLocation } from "wouter";
import { ArrowLeft } from "lucide-react";
import { parseISO, startOfYear, endOfYear } from "date-fns";
import { ACCOUNTS as MOCK_ACCOUNTS, TRANSACTIONS as MOCK_TRANSACTIONS } from "@/lib/mockData";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface CategoryData {
  name: string;
  prefix: string[];
  label: string;
}

export default function PieChartsPage() {
  const { data } = useData();
  const [, setLocation] = useLocation();

  const accounts = data?.accounts || MOCK_ACCOUNTS;
  const transactions = data?.transactions || MOCK_TRANSACTIONS;

  // Extract available years from transactions
  const availableYears = useMemo(() => {
    const years = new Set(transactions.map(t => new Date(parseISO(t.date)).getFullYear()));
    return Array.from(years).sort((a, b) => b - a);
  }, [transactions]);

  // State for selected year
  const [selectedYear, setSelectedYear] = useState<string>("");

  // Initialize selected year to the latest year on first load
  useEffect(() => {
    if (!selectedYear && availableYears.length > 0) {
      setSelectedYear(availableYears[0].toString());
    }
  }, [availableYears, selectedYear]);

  // Define the 4 main categories
  const categories: CategoryData[] = [
    { name: "Actifs", prefix: ["1"], label: "Comptes 1XXXXX" },
    { name: "Passifs", prefix: ["2"], label: "Comptes 2XXXX" },
    { name: "Produits", prefix: ["3"], label: "Comptes 3XXXX" },
    { name: "Charges", prefix: ["4", "5", "6", "7", "8"], label: "Comptes 4XXXX-8999X" }
  ];

  // Calculate pie chart data for each category (annual only)
  const chartDataByCategory = useMemo(() => {
    if (!selectedYear) return {};

    const year = parseInt(selectedYear);
    const dateRange = { 
      start: startOfYear(new Date(year, 0, 1)), 
      end: endOfYear(new Date(year, 0, 1))
    };

    const result: Record<string, Array<{ name: string; value: number; account: string }>> = {};

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
      const accountData: Record<string, { name: string; account: string; debit: number; credit: number }> = {};

      categoryTransactions.forEach(txn => {
        const account = accountsMap.get(txn.accountId);
        if (!account) return;

        const key = account.id;
        if (!accountData[key]) {
          accountData[key] = { 
            name: account.name, 
            account: `${account.number} - ${account.name}`,
            debit: 0, 
            credit: 0 
          };
        }
        accountData[key].debit += txn.debit;
        accountData[key].credit += txn.credit;
      });

      // Create pie chart entries
      const pieData = Object.values(accountData)
        .map(item => ({
          name: item.name,
          account: item.account,
          value: Math.abs(item.debit - item.credit)
        }))
        .filter(item => item.value > 0)
        .sort((a, b) => b.value - a.value);

      result[category.name] = pieData.length > 0 ? pieData : [];
    });

    return result;
  }, [transactions, accounts, selectedYear, categories]);

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
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" onClick={() => setLocation("/dashboard")}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Retour
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Visualisation par Graphiques Circulaires</h1>
              <p className="text-muted-foreground">Évolution Détaillée</p>
            </div>
          </div>

          {/* Year Selection - Compact */}
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-32" data-testid="select-year">
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

        {/* 4 Pie Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {categories.map((category) => {
            const pieData = chartDataByCategory[category.name] || [];
            const hasData = pieData.length > 0;
            const total = pieData.reduce((sum, item) => sum + item.value, 0);

            return (
              <Card key={category.name} className="flex flex-col">
                <CardHeader>
                  <CardTitle className="text-lg">{category.name}</CardTitle>
                  <CardDescription>{category.label}</CardDescription>
                  {hasData && (
                    <div className="mt-2 text-sm font-semibold">
                      Total: {total.toLocaleString('fr-CH', { minimumFractionDigits: 2 })}
                    </div>
                  )}
                </CardHeader>
                <CardContent className="flex-1 flex gap-4">
                  {hasData ? (
                    <>
                      {/* Pie Chart */}
                      <div className="flex-1 flex items-center justify-center min-h-[350px]">
                        <ResponsiveContainer width="100%" height={350}>
                          <PieChart>
                            <Pie
                              data={pieData}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={100}
                              paddingAngle={2}
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
                                borderRadius: '0.5rem',
                                fontSize: '12px'
                              }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>

                      {/* Legend List */}
                      <div className="w-56 flex flex-col gap-2 max-h-[350px] overflow-y-auto pr-2">
                        {pieData.map((item, index) => (
                          <div key={item.account} className="text-xs p-2 rounded-md bg-muted/50 border border-border flex-shrink-0">
                            <div className="flex items-start gap-2">
                              <div 
                                className="w-3 h-3 rounded-full flex-shrink-0 mt-1"
                                style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}
                              />
                              <div className="flex-1 min-w-0">
                                <div className="font-semibold text-foreground truncate">{item.account}</div>
                                <div className="text-muted-foreground font-mono">
                                  {item.value.toLocaleString('fr-CH', { minimumFractionDigits: 2 })}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center justify-center w-full h-[350px] text-muted-foreground text-sm">
                      Aucune donnée pour cette catégorie
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
