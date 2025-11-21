import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowUpRight, ArrowDownRight, Minus, TrendingUp, DollarSign, Percent, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

export default function RatiosDocumentation() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-bold tracking-tight">Documentation des Ratios</h1>
            <p className="text-muted-foreground mt-2">Formules, interprétations et benchmark suisses</p>
          </div>
          <Button variant="outline" onClick={() => setLocation("/dashboard")}>
            Retour au Dashboard
          </Button>
        </div>

        <Tabs defaultValue="liquidity" className="w-full">
          <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent gap-6">
            <TabsTrigger value="liquidity" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none py-2 px-1">Liquidité</TabsTrigger>
            <TabsTrigger value="profitability" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none py-2 px-1">Rentabilité</TabsTrigger>
            <TabsTrigger value="structure" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none py-2 px-1">Structure</TabsTrigger>
            <TabsTrigger value="definitions" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none py-2 px-1">Définitions</TabsTrigger>
          </TabsList>

          {/* LIQUIDITY */}
          <TabsContent value="liquidity" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-blue-500" />
                    Liquidité courante (Current Ratio)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg font-mono text-sm">
                    <div className="text-muted-foreground mb-2">Formule:</div>
                    <div className="font-bold">Actifs circulants / Passifs à court terme</div>
                    <div className="text-xs text-muted-foreground mt-2">(10xx-13xx) / (20xx-23xx)</div>
                  </div>
                  <div>
                    <div className="font-semibold mb-2">Interprétation:</div>
                    <ul className="text-sm space-y-2 text-muted-foreground">
                      <li className="flex items-start gap-2">
                        <ArrowUpRight className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span><strong>&gt; 1.5:</strong> Très bon - L'entreprise couvre confortablement ses dettes CT</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Minus className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                        <span><strong>1.0-1.5:</strong> Acceptable - Couverture suffisante</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <ArrowDownRight className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                        <span><strong>&lt; 1.0:</strong> Risqué - Risque de défaut de paiement</span>
                      </li>
                    </ul>
                  </div>
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded border border-blue-200 dark:border-blue-800">
                    <div className="text-sm"><strong>Contexte Suisse:</strong> Benchmark: 1.5-2.0 selon le secteur</div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-green-500" />
                    Liquidité immédiate (Quick Ratio)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg font-mono text-sm">
                    <div className="text-muted-foreground mb-2">Formule:</div>
                    <div className="font-bold">(Actifs circulants - Stocks) / Passifs CT</div>
                    <div className="text-xs text-muted-foreground mt-2">(10xx-13xx - 12xx) / (20xx-23xx)</div>
                  </div>
                  <div>
                    <div className="font-semibold mb-2">Interprétation:</div>
                    <ul className="text-sm space-y-2 text-muted-foreground">
                      <li className="flex items-start gap-2">
                        <ArrowUpRight className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span><strong>≥ 1.0:</strong> Bon - Peut payer sans vendre ses stocks</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Minus className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                        <span><strong>0.8-1.0:</strong> Acceptable</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <ArrowDownRight className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                        <span><strong>&lt; 0.8:</strong> Faible liquidité</span>
                      </li>
                    </ul>
                  </div>
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded border border-blue-200 dark:border-blue-800">
                    <div className="text-sm"><strong>Utilité:</strong> Plus conservateur que le ratio courant</div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-purple-500" />
                    Ratio de trésorerie (Cash Ratio)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg font-mono text-sm">
                    <div className="text-muted-foreground mb-2">Formule:</div>
                    <div className="font-bold">Liquidités & équivalents / Passifs CT</div>
                    <div className="text-xs text-muted-foreground mt-2">10xx / (20xx-23xx)</div>
                  </div>
                  <div>
                    <div className="font-semibold mb-2">Interprétation:</div>
                    <ul className="text-sm space-y-2 text-muted-foreground">
                      <li className="flex items-start gap-2">
                        <ArrowUpRight className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span><strong>&gt; 0.2:</strong> Bon - 20% des dettes CT en cash</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Minus className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                        <span><strong>0.1-0.2:</strong> Acceptable</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <ArrowDownRight className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                        <span><strong>&lt; 0.1:</strong> Risque de crise</span>
                      </li>
                    </ul>
                  </div>
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded border border-blue-200 dark:border-blue-800">
                    <div className="text-sm"><strong>Note:</strong> Le plus restrictif des trois ratios</div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* PROFITABILITY */}
          <TabsContent value="profitability" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Percent className="h-5 w-5 text-green-500" />
                    Marge nette
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg font-mono text-sm">
                    <div className="text-muted-foreground mb-2">Formule:</div>
                    <div className="font-bold">(Profit Net / Chiffre d'affaires) × 100</div>
                    <div className="text-xs text-muted-foreground mt-2">Résultat Net / (3xxx) × 100</div>
                  </div>
                  <div>
                    <div className="font-semibold mb-2">Interprétation:</div>
                    <ul className="text-sm space-y-2 text-muted-foreground">
                      <li><strong>&gt; 10%:</strong> Excellent - Entreprise très rentable</li>
                      <li><strong>5-10%:</strong> Normal - Bon niveau de profitabilité</li>
                      <li><strong>&lt; 5%:</strong> Faible - Marges comprimées</li>
                    </ul>
                  </div>
                  <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded border border-green-200 dark:border-green-800">
                    <div className="text-sm"><strong>Benchmark Suisse:</strong> 6-8% selon le secteur</div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-blue-500" />
                    ROA (Return on Assets)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg font-mono text-sm">
                    <div className="text-muted-foreground mb-2">Formule:</div>
                    <div className="font-bold">(Profit Net / Total Actif) × 100</div>
                    <div className="text-xs text-muted-foreground mt-2">Résultat Net / (1xxx) × 100</div>
                  </div>
                  <div>
                    <div className="font-semibold mb-2">Interprétation:</div>
                    <ul className="text-sm space-y-2 text-muted-foreground">
                      <li><strong>&gt; 5%:</strong> Bon - Actifs bien utilisés</li>
                      <li><strong>2-5%:</strong> Acceptable</li>
                      <li><strong>&lt; 2%:</strong> Faible - Actifs sous-utilisés</li>
                    </ul>
                  </div>
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded border border-blue-200 dark:border-blue-800">
                    <div className="text-sm"><strong>Mesure:</strong> Efficacité globale de l'utilisation des actifs</div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-amber-500" />
                    ROE (Return on Equity)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg font-mono text-sm">
                    <div className="text-muted-foreground mb-2">Formule:</div>
                    <div className="font-bold">(Profit Net / Capitaux Propres) × 100</div>
                    <div className="text-xs text-muted-foreground mt-2">Résultat Net / (28xx-29xx) × 100</div>
                  </div>
                  <div>
                    <div className="font-semibold mb-2">Interprétation:</div>
                    <ul className="text-sm space-y-2 text-muted-foreground">
                      <li><strong>&gt; 10%:</strong> Excellent - Bonne rentabilité pour les actionnaires</li>
                      <li><strong>5-10%:</strong> Normal</li>
                      <li><strong>&lt; 5%:</strong> Faible - Faible création de valeur</li>
                    </ul>
                  </div>
                  <div className="bg-amber-50 dark:bg-amber-900/20 p-3 rounded border border-amber-200 dark:border-amber-800">
                    <div className="text-sm"><strong>Benchmark Suisse:</strong> 8-12% selon le secteur</div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Percent className="h-5 w-5 text-purple-500" />
                    Marge EBITDA
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg font-mono text-sm">
                    <div className="text-muted-foreground mb-2">Formule:</div>
                    <div className="font-bold">EBITDA / Chiffre d'affaires × 100</div>
                    <div className="text-xs text-muted-foreground mt-2">(CA - Coûts directs - Personnel - Autres charges) / CA</div>
                  </div>
                  <div>
                    <div className="font-semibold mb-2">Interprétation:</div>
                    <ul className="text-sm space-y-2 text-muted-foreground">
                      <li><strong>&gt; 15%:</strong> Excellent - Rentabilité opérationnelle forte</li>
                      <li><strong>10-15%:</strong> Normal</li>
                      <li><strong>&lt; 10%:</strong> Faible - Coûts opérationnels élevés</li>
                    </ul>
                  </div>
                  <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded border border-purple-200 dark:border-purple-800">
                    <div className="text-sm"><strong>Utilité:</strong> Ignorant les variations d'amortissement et de fiscalité</div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* STRUCTURE */}
          <TabsContent value="structure" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-indigo-500" />
                  Ratio des Fonds Propres (Equity Ratio)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg font-mono text-sm">
                  <div className="text-muted-foreground mb-2">Formule:</div>
                  <div className="font-bold">Capitaux Propres / Total Actif</div>
                  <div className="text-xs text-muted-foreground mt-2">(28xx-29xx) / 1xxx</div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <div className="font-semibold mb-2">Interprétation:</div>
                    <ul className="text-sm space-y-2 text-muted-foreground">
                      <li><strong>30-60%:</strong> Bon - Indépendance financière équilibrée (benchmark suisse)</li>
                      <li><strong>&lt; 30%:</strong> Risqué - Forte dépendance au financement externe</li>
                      <li><strong>&gt; 60%:</strong> Très conservateur - Peu de levier</li>
                    </ul>
                  </div>
                  <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded border border-indigo-200 dark:border-indigo-800">
                    <div className="text-sm space-y-2">
                      <div><strong>Interprétation:</strong></div>
                      <div>Mesure l'indépendance financière et la part du financement par fonds propres vs dettes</div>
                      <div className="mt-2"><strong>Benchmark Suisse:</strong> 40-50% selon le secteur</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* DEFINITIONS */}
          <TabsContent value="definitions" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Actifs circulants (AC)</CardTitle>
                  <CardDescription>Comptes 10xx à 13xx</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="text-sm space-y-2 text-muted-foreground">
                    <li><strong>10xx:</strong> Liquidités & équivalents (caisse, banque)</li>
                    <li><strong>11xx:</strong> Créances court terme (clients)</li>
                    <li><strong>12xx:</strong> Stocks de marchandises</li>
                    <li><strong>13xx:</strong> Comptes de régularisation actifs</li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Passifs à court terme (PCT)</CardTitle>
                  <CardDescription>Comptes 20xx à 23xx</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="text-sm space-y-2 text-muted-foreground">
                    <li><strong>20xx:</strong> Dettes envers tiers</li>
                    <li><strong>21xx:</strong> Dettes financières CT</li>
                    <li><strong>22xx:</strong> Dettes fiscales & sociales</li>
                    <li><strong>23xx:</strong> Comptes de régularisation passifs</li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Chiffre d'affaires (CA)</CardTitle>
                  <CardDescription>Comptes 3xxx</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="text-sm space-y-2 text-muted-foreground">
                    <li><strong>30xx:</strong> Ventes de produits fabriqués</li>
                    <li><strong>32xx:</strong> Ventes de marchandises</li>
                    <li><strong>34xx:</strong> Prestations de services</li>
                    <li><strong>36xx:</strong> Produits accessoires</li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Coûts & Charges</CardTitle>
                  <CardDescription>Comptes 4xx à 8xx</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="text-sm space-y-2 text-muted-foreground">
                    <li><strong>4xx:</strong> Coûts directs (matières, achats)</li>
                    <li><strong>5xx:</strong> Charges de personnel</li>
                    <li><strong>6xx:</strong> Autres charges d'exploitation</li>
                    <li><strong>7-8xx:</strong> Activités annexes & exceptionnelles</li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Capitaux Propres (CP)</CardTitle>
                  <CardDescription>Comptes 28xx-29xx</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="text-sm space-y-2 text-muted-foreground">
                    <li><strong>28xx:</strong> Fonds propres & réserves</li>
                    <li><strong>29xx:</strong> Résultats & distributions</li>
                    <li>Représente la part financée par les actionnaires vs les créanciers</li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Dettes à long terme</CardTitle>
                  <CardDescription>Comptes 24xx à 27xx</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="text-sm space-y-2 text-muted-foreground">
                    <li><strong>24xx:</strong> Dettes financières LT</li>
                    <li><strong>25xx:</strong> Autres dettes LT</li>
                    <li><strong>26xx:</strong> Provisions LT</li>
                    <li><strong>27xx:</strong> Prêts postposés</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
