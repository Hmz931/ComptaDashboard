import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useData } from "@/lib/data-context";
import { useLocation } from "wouter";
import { ArrowLeft, ChevronDown, ChevronRight, X } from "lucide-react";
import { parseISO, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear } from "date-fns";
import { ACCOUNTS as MOCK_ACCOUNTS, TRANSACTIONS as MOCK_TRANSACTIONS, CATEGORIE_LABELS } from "@/lib/mockData";
import { Checkbox } from "@/components/ui/checkbox";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type PeriodType = "monthly" | "quarterly" | "semi-annual" | "annual";

export default function PieChartsPage() {
  const { data } = useData();
  const [, setLocation] = useLocation();

  const accounts = data?.accounts || MOCK_ACCOUNTS;
  const transactions = data?.transactions || MOCK_TRANSACTIONS;
  
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [periodType, setPeriodType] = useState<PeriodType>("annual");

  // Extract unique categories from accounts
  const categories = useMemo(() => {
    const categoryMap = new Map<string, { number: string; label: string; accounts: typeof accounts }>();
    
    accounts.forEach(acc => {
      const categoryCode = acc.number.substring(0, 2);
      const categoryLabel = CATEGORIE_LABELS[categoryCode] || `Catégorie ${categoryCode}`;
      const key = `${categoryCode} - ${categoryLabel}`;
      
      if (!categoryMap.has(key)) {
        categoryMap.set(key, { number: categoryCode, label: categoryLabel, accounts: [] });
      }
      categoryMap.get(key)!.accounts.push(acc);
    });

    return Array.from(categoryMap.entries()).map(([key, value]) => ({
      key,
      ...value
    })).sort((a, b) => a.number.localeCompare(b.number));
  }, [accounts]);

  // Get current date range based on period type
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

  // Calculate pie chart data for selected accounts
  const chartDataByAccount = useMemo(() => {
    if (selectedAccounts.length === 0) return {};

    const now = new Date();
    const dateRange = getDateRange(now, periodType);

    const result: Record<string, Array<{ name: string; value: number }>> = {};

    selectedAccounts.forEach(accountId => {
      const account = accounts.find(a => a.id === accountId);
      if (!account) return;

      const accountTransactions = transactions.filter(txn => {
        if (txn.accountId !== accountId) return false;
        const txnDate = parseISO(txn.date);
        return txnDate >= dateRange.start && txnDate <= dateRange.end;
      });

      // Group by category or create segments
      let totalDebit = 0;
      let totalCredit = 0;
      const movements: Record<string, number> = {};

      accountTransactions.forEach(txn => {
        totalDebit += txn.debit;
        totalCredit += txn.credit;
      });

      // Create data for pie chart
      if (totalDebit > 0) {
        movements["Débits"] = totalDebit;
      }
      if (totalCredit > 0) {
        movements["Crédits"] = totalCredit;
      }

      const pieData = Object.entries(movements).map(([name, value]) => ({
        name,
        value: Math.abs(value)
      }));

      result[accountId] = pieData.length > 0 ? pieData : [{ name: "Aucune donnée", value: 0 }];
    });

    return result;
  }, [selectedAccounts, transactions, accounts, periodType]);

  // Colors for pie charts
  const COLORS = [
    'hsl(var(--chart-1))',
    'hsl(var(--chart-2))',
    'hsl(var(--chart-3))',
    'hsl(var(--chart-4))',
    'hsl(var(--chart-5))',
  ];

  const toggleAccountSelection = (accountId: string) => {
    if (selectedAccounts.includes(accountId)) {
      setSelectedAccounts(selectedAccounts.filter(id => id !== accountId));
    } else {
      setSelectedAccounts([...selectedAccounts, accountId]);
    }
  };

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
            <p className="text-muted-foreground">Analyse détaillée des comptes sélectionnés</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Pie Charts - Main Content */}
          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle>Représentation par Compte</CardTitle>
              <CardDescription>Sélectionnez une période pour afficher les graphiques</CardDescription>
              
              {/* Period Selection Tabs */}
              <Tabs value={periodType} onValueChange={(value) => setPeriodType(value as PeriodType)} className="mt-4">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="monthly" data-testid="tab-monthly">Mensuel</TabsTrigger>
                  <TabsTrigger value="quarterly" data-testid="tab-quarterly">Trimestriel</TabsTrigger>
                  <TabsTrigger value="semi-annual" data-testid="tab-semi-annual">Semestriel</TabsTrigger>
                  <TabsTrigger value="annual" data-testid="tab-annual">Annuel</TabsTrigger>
                </TabsList>
              </Tabs>
            </CardHeader>

            <CardContent>
              {selectedAccounts.length === 0 ? (
                <div className="flex items-center justify-center h-96 text-muted-foreground">
                  <p>Sélectionnez au moins un compte pour afficher les graphiques</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {selectedAccounts.map((accountId) => {
                    const account = accounts.find(a => a.id === accountId);
                    if (!account) return null;

                    const pieData = chartDataByAccount[accountId] || [];
                    const hasData = pieData.some(d => d.value > 0);

                    return (
                      <div key={accountId} className="flex flex-col items-center border rounded-lg p-4 bg-muted/20">
                        <h3 className="font-semibold text-sm mb-2">{account.name}</h3>
                        <p className="text-xs text-muted-foreground mb-4">{account.number}</p>
                        
                        {hasData ? (
                          <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                              <Pie
                                data={pieData}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={(entry) => `${entry.name}: ${entry.value.toLocaleString('fr-CH')}`}
                                outerRadius={80}
                                fill="#8884d8"
                                dataKey="value"
                              >
                                {pieData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                              </Pie>
                              <Tooltip formatter={(value: number) => value.toLocaleString('fr-CH', { minimumFractionDigits: 0 })} />
                            </PieChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="flex items-center justify-center h-[300px] text-muted-foreground text-xs">
                            Aucune donnée pour cette période
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Sidebar - Account Selection */}
          <Card className="h-fit">
            <CardHeader>
              <CardTitle className="text-lg">Sélection Comptes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="max-h-[600px] overflow-y-auto space-y-2">
                {categories.map((category) => (
                  <div key={category.key} className="border rounded-md p-2 space-y-2 bg-muted/30">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setExpandedCategory(expandedCategory === category.key ? null : category.key)}
                        className="p-1 hover:bg-muted rounded"
                        data-testid={`button-expand-${category.number}`}
                      >
                        {expandedCategory === category.key ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      </button>
                      <label className="text-xs cursor-pointer flex-1 font-semibold">{category.label}</label>
                    </div>

                    {expandedCategory === category.key && (
                      <div className="ml-6 border-l border-muted pl-2 space-y-2">
                        {category.accounts.map((account) => (
                          <div key={account.id} className="flex items-center gap-2">
                            <Checkbox
                              checked={selectedAccounts.includes(account.id)}
                              onCheckedChange={() => toggleAccountSelection(account.id)}
                              data-testid={`checkbox-account-${account.id}`}
                            />
                            <label className="text-xs cursor-pointer">
                              <span className="font-mono font-bold text-[10px]">{account.number}</span>{" "}
                              <span className="text-[10px]">{account.name}</span>
                            </label>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {selectedAccounts.length > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full"
                  onClick={() => setSelectedAccounts([])}
                  data-testid="button-clear-selection"
                >
                  Réinitialiser
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
