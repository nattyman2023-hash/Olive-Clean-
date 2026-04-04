import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, CreditCard, Check, ExternalLink } from "lucide-react";
import { toast } from "sonner";

const PLANS = [
  {
    name: "Weekly",
    description: "Professional cleaning every week",
    price: "$149",
    interval: "/week",
    priceId: "price_1TISxmEQ4159PpG30gCjR685",
    productId: "prod_UH0zChxL7s3lV7",
    popular: true,
  },
  {
    name: "Bi-Weekly",
    description: "Professional cleaning twice a month",
    price: "$129",
    interval: "/month",
    priceId: "price_1TISyVEQ4159PpG3yfvk1UCS",
    productId: "prod_UH10lwNzmBkapd",
    popular: false,
  },
  {
    name: "Monthly",
    description: "Professional cleaning once a month",
    price: "$99",
    interval: "/month",
    priceId: "price_1TISyqEQ4159PpG3YWfefusM",
    productId: "prod_UH107J7B4mqz8B",
    popular: false,
  },
];

interface SubscriptionStatus {
  subscribed: boolean;
  product_id: string | null;
  price_id: string | null;
  subscription_end: string | null;
}

export default function SubscriptionPlans() {
  const [subStatus, setSubStatus] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscribingId, setSubscribingId] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);

  const checkSubscription = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("check-subscription");
      if (error) throw error;
      setSubStatus(data);
    } catch {
      setSubStatus({ subscribed: false, product_id: null, price_id: null, subscription_end: null });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkSubscription();
  }, []);

  const handleSubscribe = async (priceId: string) => {
    setSubscribingId(priceId);
    try {
      const { data, error } = await supabase.functions.invoke("create-subscription", {
        body: { priceId },
      });
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to create checkout");
    } finally {
      setSubscribingId(null);
    }
  };

  const handleManage = async () => {
    setPortalLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal");
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to open billing portal");
    } finally {
      setPortalLoading(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>;
  }

  const activePlan = subStatus?.subscribed
    ? PLANS.find((p) => p.productId === subStatus.product_id)
    : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-primary" />
            Cleaning Plans
          </h2>
          {activePlan && subStatus?.subscription_end && (
            <p className="text-xs text-muted-foreground mt-1">
              Active: <span className="font-medium text-foreground">{activePlan.name}</span> · Renews{" "}
              {new Date(subStatus.subscription_end).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </p>
          )}
        </div>
        {subStatus?.subscribed && (
          <Button variant="outline" size="sm" onClick={handleManage} disabled={portalLoading} className="text-xs rounded-lg">
            {portalLoading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <ExternalLink className="h-3 w-3 mr-1" />}
            Manage Billing
          </Button>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {PLANS.map((plan) => {
          const isActive = subStatus?.subscribed && subStatus.product_id === plan.productId;
          return (
            <Card
              key={plan.priceId}
              className={`relative overflow-hidden transition-all ${
                isActive
                  ? "border-primary ring-1 ring-primary/20"
                  : plan.popular
                  ? "border-primary/40"
                  : ""
              }`}
            >
              {plan.popular && !isActive && (
                <div className="absolute top-0 right-0">
                  <Badge className="rounded-none rounded-bl-lg text-[0.55rem] bg-primary text-primary-foreground">
                    Popular
                  </Badge>
                </div>
              )}
              {isActive && (
                <div className="absolute top-0 right-0">
                  <Badge className="rounded-none rounded-bl-lg text-[0.55rem] bg-emerald-500 text-white">
                    <Check className="h-2.5 w-2.5 mr-0.5" />
                    Active
                  </Badge>
                </div>
              )}
              <CardContent className="p-4 space-y-3">
                <div>
                  <p className="font-semibold text-sm text-foreground">{plan.name}</p>
                  <p className="text-xs text-muted-foreground">{plan.description}</p>
                </div>
                <div className="flex items-baseline gap-0.5">
                  <span className="text-2xl font-bold text-foreground">{plan.price}</span>
                  <span className="text-xs text-muted-foreground">{plan.interval}</span>
                </div>
                {isActive ? (
                  <Button variant="outline" size="sm" className="w-full rounded-lg text-xs" disabled>
                    Current Plan
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    className="w-full rounded-lg text-xs"
                    onClick={() => handleSubscribe(plan.priceId)}
                    disabled={subscribingId === plan.priceId}
                  >
                    {subscribingId === plan.priceId ? (
                      <Loader2 className="h-3 w-3 animate-spin mr-1" />
                    ) : null}
                    {subStatus?.subscribed ? "Switch Plan" : "Subscribe"}
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
