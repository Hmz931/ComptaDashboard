import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Button } from "@/components/ui/button";
import { useData } from "@/lib/data-context";
import { useLocation } from "wouter";
import { ArrowLeft } from "lucide-react";
import { parseISO } from "date-fns";
import { ACCOUNTS as MOCK_ACCOUNTS, TRANSACTIONS as MOCK_TRANSACTIONS } from "@/lib/mockData";

export default function ComparisonPage() {
  const { data } = useData();
  const [, setLocation] = useLocation();
  
  const accounts = data?.accounts || MOCK_ACCOUNTS;
  const transactions = data?.transactions || MOCK_TRANSACTIONS;
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);

  // Extract years and build comparison data
  const comparisonData = useMemo(() => {
    const yearsSet = new Set<number>();
    const accountsMap = new Map(accounts.map(a => [a.id, { number: a.number, name: a.name }]));
    
    transactions.forEach(txn => {
      yearsSet.add(new Date(parseISO(txn.date)).getFullYear());
    });

    const years = Array.from(yearsSet).sort();
    
    // Build data structure: for each account, sum amounts by year
    const dataByAccount: Record<string, Record<number, number>> = {};
    
    transactions.forEach(txn => {
      const year = new Date(parseISO(txn.date)).getFullYear();
      const accountInfo = accountsMap.get(txn.accountId);
      if (!accountInfo) return;
      
      const key = `${accountInfo.number} - ${accountInfo.name}`;
      if (!dataByAccount[key]) {
        dataByAccount[key] = {};
      }
      
      const amount = txn.debit - txn.credit;
      dataByAccount[key][year] = (dataByAccount[key][year] || 0) + amount;
    });

    // Transform to recharts format
    const chartData = years.map(year => ({
      year: year.toString(),
      ...Object.fromEntries(
        Object.entries(dataByAccount).map(([account, data]) => [
          account,
          Math.abs(data[year] || 0)
        ])
      )
    }));

    return { chartData, years, accountsMap, allAccounts: Object.keys(dataByAccount) };
  }, [transactions, accounts]);

  // Colors for bars
  const COLORS = [
    'hsl(var(--chart-1))',
    'hsl(var(--chart-2))',
    'hsl(var(--chart-3))',
    'hsl(var(--chart-4))',
    'hsl(var(--chart-5))',
  ];

  const displayAccounts = selectedAccounts.length > 0 
    ? selectedAccounts 
    : comparisonData.allAccounts;

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => setLocation("/dashboard")}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Retour
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Comparaison Annuelle</h1>
            <p className="text-muted-foreground">Analyse comparative des montants par année</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle>Montants par Année et Compte</CardTitle>
              <CardDescription>Sélectionnez les comptes à afficher pour une comparaison détaillée</CardDescription>
            </CardHeader>
            <CardContent>
              {comparisonData.chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={comparisonData.chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="year" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(value: number) => value.toLocaleString('fr-CH', { minimumFractionDigits: 0 })} />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    {displayAccounts.map((account, index) => (
                      <Bar key={account} dataKey={account} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[400px] text-muted-foreground">
                  Aucune donnée disponible
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Sélection Comptes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="max-h-[400px] overflow-y-auto space-y-2">
                {comparisonData.allAccounts.map((account, idx) => (
                  <label key={account} className="flex items-center gap-2 cursor-pointer p-1 hover:bg-muted rounded">
                    <input
                      type="checkbox"
                      checked={selectedAccounts.includes(account)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedAccounts([...selectedAccounts, account]);
                        } else {
                          setSelectedAccounts(selectedAccounts.filter(a => a !== account));
                        }
                      }}
                      className="w-4 h-4"
                    />
                    <span className="text-xs">{account.split(' - ')[0]}</span>
                  </label>
                ))}
              </div>
              {selectedAccounts.length > 0 && (
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="w-full"
                  onClick={() => setSelectedAccounts([])}
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
