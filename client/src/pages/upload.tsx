import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileSpreadsheet, Loader2, CheckCircle, AlertCircle, Check, Info } from "lucide-react";
import { processGLFile } from "@/lib/excel-processor";
import { useData } from "@/lib/data-context";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";

export default function UploadPage() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const { setData } = useData();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
        toast({
            title: "Format incorrect",
            description: "Veuillez uploader un fichier Excel (.xlsx)",
            variant: "destructive"
        });
        return;
    }

    setIsProcessing(true);
    setUploadSuccess(false);
    try {
        const result = await processGLFile(file);
        setData({
            accounts: result.accounts,
            transactions: result.transactions,
            balanceSheet: result.balanceSheet,
            incomeStatement: result.incomeStatement,
            processedFiles: result.rawProcessedData
        });
        
        setUploadSuccess(true);
        toast({
            title: "Import réussi",
            description: `${result.transactions.length} écritures importées.`,
        });
        
        // Small delay to show success state
        setTimeout(() => {
            setLocation("/dashboard");
        }, 1000);

    } catch (error) {
        console.error("Error processing file:", error);
        toast({
            title: "Erreur lors de l'import",
            description: "Impossible de lire le fichier. Vérifiez le format.",
            variant: "destructive"
        });
    } finally {
        setIsProcessing(false);
    }
  }, [setData, setLocation, toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    accept: {
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
        'application/vnd.ms-excel': ['.xls']
    },
    maxFiles: 1
  });

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-2xl space-y-8">
        <div className="text-center space-y-2">
            <h1 className="text-4xl font-bold tracking-tight text-primary">Quick Analysis</h1>
            <p className="text-muted-foreground text-lg">Plateforme d'analyse financière intelligente</p>
        </div>

        <Card className="border-dashed border-2 border-muted-foreground/20 shadow-lg bg-card/50 backdrop-blur-sm">
            <CardHeader>
                <CardTitle className="text-center">Importez votre Grand Livre</CardTitle>
                <CardDescription className="text-center">
                    Déposez votre fichier GL.xlsx ici pour générer automatiquement les rapports
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div 
                    {...getRootProps()} 
                    className={`
                        h-64 flex flex-col items-center justify-center rounded-lg border-2 border-dashed transition-all cursor-pointer
                        ${isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/10 hover:border-primary/50 hover:bg-muted/50'}
                        ${uploadSuccess ? 'border-green-500 bg-green-50/10' : ''}
                    `}
                >
                    <input {...getInputProps()} />
                    
                    {isProcessing ? (
                        <div className="flex flex-col items-center gap-4 text-primary animate-in fade-in zoom-in">
                            <Loader2 className="h-12 w-12 animate-spin" />
                            <p className="font-medium">Analyse et nettoyage des données...</p>
                        </div>
                    ) : uploadSuccess ? (
                        <div className="flex flex-col items-center gap-4 text-green-600 animate-in fade-in zoom-in">
                            <div className="p-4 bg-green-100 dark:bg-green-900/20 rounded-full">
                                <Check className="h-12 w-12" />
                            </div>
                            <p className="font-medium text-lg">Importation terminée !</p>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center gap-4 text-muted-foreground">
                            <div className="p-4 bg-background rounded-full shadow-sm">
                                <Upload className="h-8 w-8 text-primary" />
                            </div>
                            <div className="text-center space-y-1">
                                <p className="font-medium text-foreground">Cliquez ou glissez le fichier ici</p>
                                <p className="text-sm">Format supporté: .xlsx (Excel)</p>
                            </div>
                        </div>
                    )}
                </div>

                <div className="mt-6 flex justify-center">
                    <Button variant="outline" className="gap-2 cursor-default">
                        <FileSpreadsheet className="h-4 w-4 text-green-600" />
                        Modèle de données: Abacus / Standard Suisse
                    </Button>
                </div>
            </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center text-sm text-muted-foreground">
            <div className="flex flex-col items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600">1</div>
                <p>Import du fichier brut</p>
            </div>
            <div className="flex flex-col items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600">2</div>
                <p>Nettoyage automatique</p>
            </div>
            <div className="flex flex-col items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600">3</div>
                <p>Génération Dashboard</p>
            </div>
        </div>

        <Card className="border border-green-200/50 bg-green-50/30 dark:bg-green-900/10">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    Votre sécurité et confidentialité
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
                <div className="p-3 bg-green-100/50 dark:bg-green-900/20 rounded-lg border border-green-200/50 dark:border-green-800/30">
                    <p className="text-green-900 dark:text-green-200 font-semibold">✅ Aucune violation de données</p>
                    <p className="text-green-800 dark:text-green-300 mt-1 text-xs">Vos données financières sont traitées de manière entièrement sécurisée et confidentielle. Aucune transmission, stockage serveur ou partage de données n'est effectué.</p>
                </div>

                <div className="space-y-2">
                    <p className="flex items-start gap-2 font-semibold text-foreground">
                        <span className="text-green-600 mt-0.5">🔒</span>
                        <span>Fonctionnement sécurisé</span>
                    </p>
                    <div className="space-y-2 ml-6">
                        <p className="flex items-start gap-2">
                            <span className="text-green-600 font-semibold">•</span>
                            <span><strong>Stockage local uniquement :</strong> Les données Excel sont chargées et stockées exclusivement en mémoire (contexte React) sur votre navigateur. Aucune donnée ne quitte votre ordinateur.</span>
                        </p>
                        <p className="flex items-start gap-2">
                            <span className="text-green-600 font-semibold">•</span>
                            <span><strong>Données temporaires et éphémères :</strong> Les données disparaissent complètement si vous rafraîchissez la page ou fermez votre navigateur. Aucune trace ne reste. Téléchargez vos rapports avant de quitter si vous souhaitez les conserver.</span>
                        </p>
                        <p className="flex items-start gap-2">
                            <span className="text-green-600 font-semibold">•</span>
                            <span><strong>Aucun serveur impliqué :</strong> Chaque fois que vous chargez un nouveau fichier, il remplace simplement les données précédentes en mémoire. Aucune sauvegarde, base de données ou serveur n'est utilisé.</span>
                        </p>
                    </div>
                </div>

                <div className="p-3 bg-blue-100/50 dark:bg-blue-900/20 rounded-lg border border-blue-200/50 dark:border-blue-800/30">
                    <p className="text-blue-900 dark:text-blue-200 font-semibold text-xs">💡 Conseil</p>
                    <p className="text-blue-800 dark:text-blue-300 mt-1 text-xs">Téléchargez vos graphiques et rapports d'analyse avant de fermer l'application pour conserver votre travail.</p>
                </div>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
