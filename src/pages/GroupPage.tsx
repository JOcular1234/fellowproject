import { useEffect, useState } from 'react';
import { ArrowLeft, FileText, Users } from 'lucide-react';
import { useRouter } from '@/lib/router';
import { fetchGroupDetails } from '@/lib/queries';
import {
  LEVEL_LABELS,
  PROJECT_STATUS_LABELS,
  type ProjectGroupWithDetails,
  type FellowLevel,
} from '@/lib/types';
import { GroupDetailSkeleton } from '@/components/Skeleton';

const STATUS_COLORS: Record<string, string> = {
  NOT_SUBMITTED: 'bg-slate-100 text-slate-600',
  SUBMITTED: 'bg-blue-50 text-blue-700',
  APPROVED: 'bg-green-50 text-green-700',
  NEEDS_REVISION: 'bg-amber-50 text-amber-700',
};

export function GroupPage({ groupId }: { groupId: string }) {
  const { navigate } = useRouter();
  const [group, setGroup] = useState<ProjectGroupWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchGroupDetails(groupId);
        setGroup(data);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [groupId]);

  if (loading) {
    return <GroupDetailSkeleton />;
  }

  if (error || !group) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <button
          onClick={() => navigate('/groups')}
          className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-brand-600"
        >
          <ArrowLeft className="h-4 w-4" />
          All Groups
        </button>
        <div className="card p-8 text-center">
          <p className="text-sm text-slate-600">
            This project group could not be found or is not yet published.
          </p>
        </div>
      </div>
    );
  }

  const levelLabel = LEVEL_LABELS[group.level as FellowLevel] ?? group.level;
  const project = group.project;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
      <button
        onClick={() => navigate(`/groups/${group.level}`)}
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-brand-600"
      >
        <ArrowLeft className="h-4 w-4" />
        {levelLabel}
      </button>

      <div className="mb-8">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
          Python Level
        </p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">{levelLabel}</h1>
        <p className="mt-3 text-xs font-medium uppercase tracking-wide text-slate-400">
          Project Group
        </p>
        <p className="mt-1 text-lg font-semibold text-slate-800">{group.name}</p>

        <div className="mt-4 flex items-center gap-2">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Group Leader:
          </span>
          <span className="text-sm font-semibold text-slate-800">
            Pending
          </span>
        </div>
      </div>

      <div className="mb-8">
        <div className="mb-3 flex items-center gap-2">
          <Users className="h-5 w-5 text-brand-600" />
          <h2 className="text-lg font-semibold text-slate-900">Group Members</h2>
          <span className="text-sm text-slate-400">({group.members.length})</span>
        </div>

        <div className="card divide-y divide-slate-100">
          {group.members.map((m) => (
            <div key={m.id} className="flex items-center p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-600">
                {m.fellow.first_name[0]}
                {m.fellow.last_name[0]}
              </div>
              <span className="ml-3 text-sm font-medium text-slate-700">
                {m.fellow.first_name} {m.fellow.last_name}
              </span>
            </div>
          ))}

          {group.members.length === 0 && (
            <div className="p-4 text-sm text-slate-500">No members assigned yet.</div>
          )}
        </div>
      </div>

      <div>
        <div className="mb-3 flex items-center gap-2">
          <FileText className="h-5 w-5 text-brand-600" />
          <h2 className="text-lg font-semibold text-slate-900">Project</h2>
        </div>

        <div className="card p-5">
          <div className="mb-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Project Topic
            </p>
            {project?.title ? (
              <p className="mt-1 text-base font-semibold text-slate-900">{project.title}</p>
            ) : (
              <p className="mt-1 text-sm text-slate-500 italic">
                Project topic has not been submitted yet.
              </p>
            )}
          </div>

          {project?.description && (
            <div className="mb-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Project Description
              </p>
              <p className="mt-1 text-sm leading-relaxed text-slate-700">
                {project.description}
              </p>
            </div>
          )}

          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Project Status
            </p>
            <span
              className={`mt-1.5 inline-flex badge ${
                STATUS_COLORS[project?.status ?? 'NOT_SUBMITTED']
              }`}
            >
              {PROJECT_STATUS_LABELS[project?.status ?? 'NOT_SUBMITTED']}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
