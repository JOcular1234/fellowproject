import { useEffect, useState } from 'react';
import { ArrowLeft, Crown, Github, ExternalLink, Star } from 'lucide-react';
import { useRouter } from '@/lib/router';
import { fetchShowcase } from '@/lib/queries';
import type { ShowcaseDetail } from '@/lib/types';
import { LEVEL_LABELS } from '@/lib/types';
import { PublicLayout } from '@/components/PublicLayout';
import presentationBg from '@/public/presentation.jpeg';

export function ShowcaseDetailPage({ projectId }: { projectId: string }) {
  const { navigate } = useRouter();
  const [showcase, setShowcase] = useState<ShowcaseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const data = await fetchShowcase(projectId);
        if (!cancelled) setShowcase(data);
      } catch {
        // ignore
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [projectId]);

  if (loading) {
    return (
      <PublicLayout>
        <div className="mx-auto max-w-4xl px-4 py-20 text-center">
          <p className="text-sm text-slate-500">Loading showcase...</p>
        </div>
      </PublicLayout>
    );
  }

  if (!showcase) {
    return (
      <PublicLayout>
        <div className="mx-auto max-w-4xl px-4 py-20 text-center">
          <p className="text-sm font-semibold text-slate-700">Project showcase not found.</p>
          <button
            onClick={() => navigate('/showcase')}
            className="mt-3 text-sm font-medium text-brand-600 hover:text-brand-700"
          >
            View All Showcases
          </button>
        </div>
      </PublicLayout>
    );
  }

  const screenshots = showcase.showcase.screenshots;
  const presDate = showcase.presentation_date ? new Date(showcase.presentation_date) : null;

  return (
    <PublicLayout>
      <div className="relative min-h-screen">
        <div className="pointer-events-none fixed inset-0">
          <img src={presentationBg} alt="" className="h-full w-full object-cover opacity-5" />
        </div>

        <div className="relative mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
          {/* Back */}
          <button
            onClick={() => navigate('/showcase')}
            className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-brand-600"
          >
            <ArrowLeft className="h-4 w-4" />
            All Showcases
          </button>

          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-bold text-brand-700">
                {LEVEL_LABELS[showcase.group_level]}
              </span>
              <span className="text-xs font-medium text-slate-500">
                {showcase.groups.map((g) => g.group_name).join(' + ')}
              </span>
              {showcase.showcase.is_featured && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700">
                  <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                  Featured
                </span>
              )}
            </div>
            <h1 className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">
              {showcase.project_title ?? 'Untitled Project'}
            </h1>
          </div>

          {/* Screenshot gallery */}
          {screenshots.length > 0 && (
            <div className="mb-8">
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                <img
                  src={screenshots[activeImage]}
                  alt={`${showcase.project_title} screenshot ${activeImage + 1}`}
                  className="w-full object-contain"
                />
              </div>
              {screenshots.length > 1 && (
                <div className="mt-2 flex gap-2 overflow-x-auto">
                  {screenshots.map((url, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveImage(i)}
                      className={`h-16 w-24 shrink-0 overflow-hidden rounded-lg border-2 transition-colors ${
                        i === activeImage ? 'border-brand-500' : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <img src={url} alt={`Thumbnail ${i + 1}`} className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Overview */}
          {(showcase.showcase.problem_statement || showcase.showcase.solution) && (
            <div className="mb-8 grid gap-4 sm:grid-cols-2">
              {showcase.showcase.problem_statement && (
                <div className="card p-5">
                  <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">Problem</h2>
                  <p className="mt-2 text-sm leading-relaxed text-slate-700">
                    {showcase.showcase.problem_statement}
                  </p>
                </div>
              )}
              {showcase.showcase.solution && (
                <div className="card p-5">
                  <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">Solution</h2>
                  <p className="mt-2 text-sm leading-relaxed text-slate-700">
                    {showcase.showcase.solution}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Technologies */}
          {showcase.showcase.technologies.length > 0 && (
            <div className="mb-8">
              <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">Technologies</h2>
              <div className="flex flex-wrap gap-2">
                {showcase.showcase.technologies.map((tech) => (
                  <span key={tech} className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700">
                    {tech}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Team */}
          {showcase.members.length > 0 && (
            <div className="mb-8">
              <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">Team Members</h2>
              <div className="space-y-4">
                {showcase.groups.map((grp) => {
                  const grpMembers = showcase.members.filter((m) => m.group_name === grp.group_name);
                  if (grpMembers.length === 0) return null;
                  const grpLeader = grpMembers.find((m) => m.is_leader);
                  const grpOthers = grpMembers.filter((m) => !m.is_leader);
                  return (
                    <div key={grp.group_id}>
                      {showcase.groups.length > 1 && (
                        <p className="mb-2 text-xs font-bold text-slate-400">
                          {grp.group_name}
                          {grp.is_primary && <span className="ml-1 text-brand-500">(Primary)</span>}
                        </p>
                      )}
                      <div className="card divide-y divide-slate-100">
                        {grpLeader && (
                          <div className="flex items-center gap-3 p-4">
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-700">
                              {grpLeader.first_name[0]}
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Crown className="h-4 w-4 text-brand-600" />
                              <span className="text-sm font-semibold text-slate-900">
                                {grpLeader.first_name} {grpLeader.last_name}
                              </span>
                              <span className="text-xs font-medium text-brand-600">Team Lead</span>
                            </div>
                          </div>
                        )}
                        {grpOthers.map((m) => (
                          <div key={m.id} className="flex items-center gap-3 p-4">
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-200 text-sm font-bold text-slate-600">
                              {m.first_name[0]}
                            </div>
                            <span className="text-sm font-medium text-slate-700">
                              {m.first_name} {m.last_name}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Project links */}
          {(showcase.showcase.github_url || showcase.showcase.demo_url) && (
            <div className="mb-8">
              <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">Project Links</h2>
              <div className="flex flex-wrap gap-3">
                {showcase.showcase.github_url && (
                  <a
                    href={showcase.showcase.github_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
                  >
                    <Github className="h-4 w-4" />
                    GitHub Repository
                  </a>
                )}
                {showcase.showcase.demo_url && (
                  <a
                    href={showcase.showcase.demo_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Live Demo
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Presentation */}
          {presDate && (
            <div className="mb-8">
              <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">Presentation</h2>
              <div className="card p-5">
                <p className="text-sm text-slate-600">
                  Presented on {presDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </PublicLayout>
  );
}
