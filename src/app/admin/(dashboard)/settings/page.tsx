import { ParkHoursSettings } from "@/components/admin/park-hours-settings";
import { ParkGateAccessSettings } from "@/components/admin/park-gate-access-settings";
import { OnlineBookingSettings } from "@/components/admin/online-booking-settings";
import { StripeSettingsForm } from "@/components/admin/stripe-settings-form";
import { EmailSettingsForm } from "@/components/admin/email-settings-form";
import { BlockedDatesManager } from "@/components/admin/blocked-dates-manager";
import { StaffAccessManager } from "@/components/admin/staff-access-manager";
import { adminT } from "@/lib/admin-i18n";
import { getPitchMapSpots } from "@/lib/pitch-map";
import { getParkSettings } from "@/lib/park-settings";
import { getStripeSettingsView } from "@/lib/stripe-settings";
import { getEmailSettingsView } from "@/lib/email-settings";

export default async function SettingsPage() {
  const pitches = await getPitchMapSpots();
  const [parkSettings, stripeSettings, emailSettings] = await Promise.all([
    getParkSettings(),
    getStripeSettingsView(),
    getEmailSettingsView(),
  ]);

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-3xl font-bold">{adminT.settings.title}</h1>

      <OnlineBookingSettings initial={parkSettings} />

      <ParkHoursSettings initial={parkSettings} />

      <ParkGateAccessSettings initial={parkSettings} />

      <StaffAccessManager />

      <BlockedDatesManager pitches={pitches.map((pitch) => ({ code: pitch.code }))} />

      <EmailSettingsForm initial={emailSettings} />

      <StripeSettingsForm initial={stripeSettings} />
    </div>
  );
}
