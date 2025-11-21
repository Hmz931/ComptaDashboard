import React, { createContext, useContext, useState, ReactNode } from "react";
import { Account, Transaction, FinancialStatementItem } from "./mockData";

// Define the shape of our application data
interface AppData {
  accounts: Account[];
  transactions: Transaction[];
  balanceSheet: FinancialStatementItem[];
  incomeStatement: FinancialStatementItem[];
  processedFiles: {
    cleanGL: any[]; // Raw data for export
    planComptable: any[];
    financialStatements: {
        balanceSheet: any[];
        incomeStatement: any[];
    };
  } | null;
}

interface DataContextType {
  data: AppData | null;
  setData: (data: AppData) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  return (
    <DataContext.Provider value={{ data, setData, isLoading, setIsLoading }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error("useData must be used within a DataProvider");
  }
  return context;
}
