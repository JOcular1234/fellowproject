import { PublicLayout } from '@/components/PublicLayout';
import { LivePresentation } from '@/components/LivePresentation';
import { PresentationHistory } from '@/components/PresentationHistory';
import presentationBg from '@/public/presentation.jpeg';

export function PresentationsPage() {
  return (
    <PublicLayout>
      <div className="relative min-h-screen">
        {/* Faint background image */}
        <div className="pointer-events-none fixed inset-0">
          <img
            src={presentationBg}
            alt=""
            className="h-full w-full object-cover opacity-5"
          />
        </div>

        {/* Content */}
        <div className="relative mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-12">
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <LivePresentation />
            </div>
            <div className="lg:col-span-1">
              <PresentationHistory />
            </div>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
