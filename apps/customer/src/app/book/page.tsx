import { prisma } from "@leads-portal/database";
import BookingForm from "../../components/BookingForm";
import Image from "next/image";

interface PageProps {
  searchParams: Promise<{ leadId?: string }>;
}

// Public route. No auth — email-campaign links land here straight from the
// inbox. If a ?leadId= is supplied (the merge-tag form), we look up the
// lead and pre-fill name + email; otherwise the customer types them in.
export default async function BookMeetingPage({ searchParams }: PageProps) {
  const { leadId } = await searchParams;
  let defaultName = "";
  let defaultEmail = "";
  let leadProjectName = "";
  if (leadId) {
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      select: { customerName: true, customerEmail: true, projectName: true },
    });
    if (lead) {
      defaultName = lead.customerName;
      defaultEmail = lead.customerEmail;
      leadProjectName = lead.projectName;
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-950 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-center mb-8">
          <Image src="/kitlabs-logo.jpg" alt="KITLabs" width={140} height={73} priority />
        </div>

        <BookingForm
          leadId={leadId}
          defaultName={defaultName}
          defaultEmail={defaultEmail}
          header={
            <div className="mb-6 text-center">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Book a meeting with KITLabs</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {leadProjectName ? `For ${leadProjectName} · ` : ""}Pick a time that works for you.
              </p>
            </div>
          }
        />

        <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-6">
          KITLabs Inc · <a href="https://kitlabs.us" className="hover:underline">kitlabs.us</a>
        </p>
      </div>
    </div>
  );
}
