import { ParkHoursSettings } from "@/components/admin/park-hours-settings";
import { StripeSettingsForm } from "@/components/admin/stripe-settings-form";
import { BlockedDatesManager } from "@/components/admin/blocked-dates-manager";
import { getPitchMapSpots } from "@/lib/pitch-map";
import { getParkSettings } from "@/lib/park-settings";
import { getStripeSettingsView } from "@/lib/stripe-settings";

export default async function SettingsPage() {
  const pitches = await getPitchMapSpots();
  const [parkSettings, stripeSettings] = await Promise.all([
    getParkSettings(),
    getStripeSettingsView(),
  ]);

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-3xl font-bold">Definições</h1>

      <ParkHoursSettings initial={parkSettings} />

      <BlockedDatesManager pitches={pitches.map((pitch) => ({ code: pitch.code }))} />

      <StripeSettingsForm initial={stripeSettings} />
    </div>
  );
}
