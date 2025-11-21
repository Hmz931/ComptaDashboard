import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Button } from "@/components/ui/button";
import { useData } from "@/lib/data-context";
import { useLocation } from "wouter";
import { ArrowLeft, ChevronDown, ChevronRight, X } from "lucide-react";
import { parseISO } from "date-fns";
import { ACCOUNTS as MOCK_ACCOUNTS, TRANSACTIONS as MOCK_TRANSACTIONS, CATEGORIE_LABELS } from "@/lib/mockData";
import { Checkbox } from "@/components/ui/checkbox";

export default function ComparisonPage() {
  const { data } = useData();
  const [, setLocation] = useLocation();
  
  const accounts = data?.accounts || MOCK_ACCOUNTS;
  const transactions = data?.transactions || MOCK_TRANSACTIONS;
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [selectedSubAccounts, setSelectedSubAccounts] = useState<string[]>([]);

  // Extract years and build comparison data by category
  const comparisonData = useMemo(() => {
    const yearsSet = new Set<number>();
    const accountsMap = new Map(accounts.map(a => [a.id, { number: a.number, name: a.name }]));
    
    transactions.forEach(txn => {
      yearsSet.add(new Date(parseISO(txn.date)).getFullYear());
    });

    const years = Array.from(yearsSet).sort();
    
    // Build data structure: for each category, sum amounts by year
    const dataByCategory: Record<string, Record<number, number>> = {};
    const subAccountsByCategory: Record<string, { id: string, number: string, name: string }[]> = {};
    
    transactions.forEach(txn => {
      const year = new Date(parseISO(txn.date)).getFullYear();
      const accountInfo = accountsMap.get(txn.accountId);
      if (!accountInfo) return;
      
      // Get first 2 digits (category code)
      const categoryCode = accountInfo.number.substring(0, 2);
      const categoryLabel = CATEGORIE_LABELS[categoryCode] || `Catégorie ${categoryCode}`;
      const key = `${categoryCode} - ${categoryLabel}`;
      
      if (!dataByCategory[key]) {
        dataByCategory[key] = {};
      }
      
      const amount = txn.debit - txn.credit;
      dataByCategory[key][year] = (dataByCategory[key][year] || 0) + amount;
    });

    // Build sub-accounts list for each category
    accounts.forEach(acc => {
      const categoryCode = acc.number.substring(0, 2);
      const categoryLabel = CATEGORIE_LABELS[categoryCode] || `Catégorie ${categoryCode}`;
      const key = `${categoryCode} - ${categoryLabel}`;
      
      if (!subAccountsByCategory[key]) {
        subAccountsByCategory[key] = [];
      }
      subAccountsByCategory[key].push({ id: acc.id, number: acc.number, name: acc.name });
    });

    // For balance sheet accounts (1xxx, 2xxx), calculate cumulative balances
    const finalDataByCategory: Record<string, Record<number, number>> = {};
    Object.entries(dataByCategory).forEach(([category, yearData]) => {
      const categoryCode = category.substring(0, 2);
      finalDataByCategory[category] = {};
      
      if (categoryCode.startsWith('1') || categoryCode.startsWith('2')) {
        // Cumulative for balance sheet: each year = all prior years + current year
        let cumulative = 0;
        years.forEach(year => {
          cumulative += yearData[year] || 0;
          finalDataByCategory[category][year] = cumulative;
        });
      } else {
        // For income statement accounts, just use annual amounts
        finalDataByCategory[category] = yearData;
      }
    });

    // Transform to recharts format, filtering out categories with zero amounts across all years
    const chartData = years.map(year => ({
      year: year.toString(),
      ...Object.fromEntries(
        Object.entries(finalDataByCategory).map(([category, data]) => [
          category,
          Math.abs(data[year] || 0)
        ])
      )
    }));

    // Only show categories that have at least one non-zero value across all years
    const allCategoriesFiltered = Object.entries(finalDataByCategory)
      .filter(([_, data]) => Object.values(data).some(val => Math.abs(val) > 0))
      .map(([category, _]) => category)
      .sort();

    return { chartData, years, accountsMap, allCategories: allCategoriesFiltered, subAccountsByCategory };
  }, [transactions, accounts]);

  // Colors for bars
  const COLORS = [
    'hsl(var(--chart-1))',
    'hsl(var(--chart-2))',
    'hsl(var(--chart-3))',
    'hsl(var(--chart-4))',
    'hsl(var(--chart-5))',
  ];

  const displayCategories = selectedCategories.length > 0 
    ? selectedCategories 
    : comparisonData.allCategories;

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => setLocation("/dashboard")}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Retour
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Comparaison Annuelle</h1>
            <p className="text-muted-foreground">Analyse comparative des catégories par année</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle>Montants par Année et Catégorie</CardTitle>
              <CardDescription>Sélectionnez les catégories à afficher pour une comparaison détaillée</CardDescription>
            </CardHeader>
            <CardContent>
              {comparisonData.chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={comparisonData.chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="year" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(value: number) => value.toLocaleString('fr-CH', { minimumFractionDigits: 0 })} />
                    <Legend wrapperStyle={{ fontSize: '11px', maxHeight: '100px' }} />
                    {displayCategories.map((category, index) => (
                      <Bar key={category} dataKey={category} fill={COLORS[index % COLORS.length]} />
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
              <CardTitle className="text-lg">Sélection Catégories</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="max-h-[450px] overflow-y-auto space-y-2">
                {comparisonData.allCategories.map((category) => (
                  <div key={category} className="border rounded-md p-2 space-y-2 bg-muted/30">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setExpandedCategory(expandedCategory === category ? null : category)}
                        className="p-1 hover:bg-muted rounded"
                      >
                        {expandedCategory === category ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      </button>
                      <Checkbox
                        checked={selectedCategories.includes(category)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedCategories([...selectedCategories, category]);
                          } else {
                            setSelectedCategories(selectedCategories.filter(a => a !== category));
                            setSelectedSubAccounts(selectedSubAccounts.filter(id => {
                              const acc = accounts.find(a => a.id === id);
                              return !acc?.number.startsWith(category.substring(0, 2));
                            }));
                          }
                        }}
                      />
                      <label className="text-xs cursor-pointer flex-1">{category}</label>
                    </div>

                    {expandedCategory === category && (
                      <div className="ml-6 border-l border-muted pl-2 space-y-1">
                        {comparisonData.subAccountsByCategory[category]?.map((subAcc) => (
                          <div key={subAcc.id} className="flex items-center gap-2">
                            <Checkbox
                              checked={selectedSubAccounts.includes(subAcc.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedSubAccounts([...selectedSubAccounts, subAcc.id]);
                                } else {
                                  setSelectedSubAccounts(selectedSubAccounts.filter(id => id !== subAcc.id));
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
              {(selectedCategories.length > 0 || selectedSubAccounts.length > 0) && (
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="w-full"
                  onClick={() => {
                    setSelectedCategories([]);
                    setSelectedSubAccounts([]);
                    setExpandedCategory(null);
                  }}
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
