import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import InvoicesSection from "./finance/InvoicesSection";

import PayslipsSection from "./finance/PayslipsSection";
import ExpensesSection from "./finance/ExpensesSection";
import PayoutsSection from "./finance/PayoutsSection";

export default function FinanceTab({ readOnly, onNavigate }: { readOnly?: boolean; onNavigate?: (section: string, targetId?: string) => void }) {
  return (
    <Tabs defaultValue="payouts" className="space-y-4">
      <TabsList className="bg-card border border-border rounded-lg p-1 h-auto">
        <TabsTrigger value="payouts" className="rounded-md text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Payouts</TabsTrigger>
        <TabsTrigger value="invoices" className="rounded-md text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Invoices</TabsTrigger>
        
        <TabsTrigger value="payslips" className="rounded-md text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Payslips</TabsTrigger>
        <TabsTrigger value="expenses" className="rounded-md text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Expenses</TabsTrigger>
      </TabsList>
      <TabsContent value="payouts"><PayoutsSection readOnly={readOnly} /></TabsContent>
      <TabsContent value="invoices"><InvoicesSection readOnly={readOnly} onNavigate={onNavigate} /></TabsContent>
      
      <TabsContent value="payslips"><PayslipsSection readOnly={readOnly} /></TabsContent>
      <TabsContent value="expenses"><ExpensesSection readOnly={readOnly} onNavigate={onNavigate} /></TabsContent>
    </Tabs>
  );
}
