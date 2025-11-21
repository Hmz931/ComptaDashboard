import { useData } from "@/lib/data-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Download, Search } from "lucide-react";
import { useLocation } from "wouter";
import { useState, useMemo } from "react";
import * as XLSX from "xlsx";

export default function PlanComptablePage() {
  const { data } = useData();
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");

  const accounts = data?.accounts || [];
  const allAccounts = useMemo(() => {
    if (data?.processedFiles?.planComptable) {
      return data.processedFiles.planComptable;
    }
    // Fallback: derive from accounts
    return accounts.map(acc => ({
      accountNumber: acc.number,
      accountName: acc.name,
      category: acc.category
    }));
  }, [data, accounts]);

  const filteredAccounts = useMemo(() => {
    return allAccounts.filter(acc => 
      acc.accountNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      acc.accountName.toLowerCase().includes(searchTerm.toLowerCase())
    ).sort((a, b) => {
      const numA = parseInt(a.accountNumber) || 0;
      const numB = parseInt(b.accountNumber) || 0;
      return numA - numB;
    });
  }, [allAccounts, searchTerm]);

  const handleExport = () => {
    const ws = XLSX.utils.json_to_sheet(allAccounts);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Plan Comptable");
    XLSX.writeFile(wb, "Plan_Comptable.xlsx");
  };

  // Group by first 2 digits for organization
  const groupedAccounts = useMemo(() => {
    const groups: Record<string, typeof filteredAccounts> = {};
    filteredAccounts.forEach(acc => {
      const prefix = acc.accountNumber.substring(0, 2);
      if (!groups[prefix]) groups[prefix] = [];
      groups[prefix].push(acc);
    });
    return Object.entries(groups).sort((a, b) => parseInt(a[0]) - parseInt(b[0]));
  }, [filteredAccounts]);

  const getCategoryLabel = (accountNum: string) => {
    const firstDigit = accountNum[0];
    const labels: Record<string, string> = {
      '1': 'Actifs',
      '2': 'Passifs & Fonds Propres',
      '3': 'Produits/Revenus',
      '4': 'Coûts directs',
      '5': 'Charges de personnel',
      '6': 'Autres charges',
      '7': 'Charges financières & extraordinaires',
      '8': 'Produits financiers & extraordinaires',
      '9': 'Comptes de résultat'
    };
    return labels[firstDigit] || 'Autre';
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="flex-none p-6 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Plan Comptable</h1>
            <p className="text-muted-foreground mt-1 text-sm">{allAccounts.length} comptes · Classement Swiss GAAP</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setLocation("/dashboard")}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Retour
            </Button>
            <Button size="sm" onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" /> Exporter
            </Button>
          </div>
        </div>
      </div>

      <div className="p-6 max-w-6xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" /> Rechercher
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Input
              placeholder="Rechercher par numéro ou nom de compte..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full"
              data-testid="input-search-accounts"
            />
          </CardContent>
        </Card>

        {groupedAccounts.length > 0 ? (
          <div className="space-y-6">
            {groupedAccounts.map(([prefix, accounts]) => (
              <Card key={prefix}>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-3">
                    <div className="px-3 py-1 bg-primary/10 text-primary rounded font-mono font-bold text-sm">
                      {prefix}xx
                    </div>
                    <span>{getCategoryLabel(prefix + "00")}</span>
                    <span className="ml-auto text-sm font-normal text-muted-foreground">
                      {accounts.length} compte{accounts.length > 1 ? 's' : ''}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>N° Compte</TableHead>
                        <TableHead>Nom du Compte</TableHead>
                        <TableHead className="text-right">Catégorie</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {accounts.map((acc) => (
                        <TableRow key={acc.accountNumber}>
                          <TableCell className="font-mono font-bold text-sm">{acc.accountNumber}</TableCell>
                          <TableCell className="text-sm">{acc.accountName}</TableCell>
                          <TableCell className="text-right text-xs text-muted-foreground">
                            <span className="px-2 py-1 bg-muted rounded">{getCategoryLabel(acc.accountNumber)}</span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-muted-foreground">Aucun compte ne correspond à votre recherche.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
