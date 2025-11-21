import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DataProvider } from "@/lib/data-context";
import Dashboard from "@/pages/dashboard";
import UploadPage from "@/pages/upload";
import RatiosDocumentation from "@/pages/ratios-documentation";
import PlanComptablePage from "@/pages/plan-comptable";
import ComparisonPage from "@/pages/comparison";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={UploadPage} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/ratios" component={RatiosDocumentation} />
      <Route path="/plan-comptable" component={PlanComptablePage} />
      <Route path="/comparison" component={ComparisonPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <DataProvider>
            <Toaster />
            <Router />
        </DataProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
