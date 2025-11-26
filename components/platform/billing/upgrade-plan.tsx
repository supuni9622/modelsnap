import Pricing from "@/components/landing/pricing/pricing-1";

export default function UpgradePlanComponents() {
  return (
    <section id="upgrade-plan-section" className="mt-10 w-full ">
      <div>
        <h2 className="text-2xl font-bold">Upgrade your current plan</h2>
      </div>
      <div className="mt-5 flex w-full ">
        <Pricing onlyPricingCard />
      </div>
    </section>
  );
}
