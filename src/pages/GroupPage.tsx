import { useEffect, useState } from 'react';
import { ArrowLeft, Crown, FileText, Users, Video, ExternalLink, Clock } from 'lucide-react';
import { useRouter } from '@/lib/router';
import { fetchGroupDetails } from '@/lib/queries';
import {
  LEVEL_LABELS,
  PROJECT_STATUS_LABELS,
  PARTICIPATION_STATUS_LABELS,
  PARTICIPATION_STATUS_DOT_COLORS,
  type ProjectGroupWithDetails,
  type FellowLevel,
  type ParticipationStatus,
} from '@/lib/types';
import { GroupDetailSkeleton } from '@/components/Skeleton';
import presentationBg from '@/public/How-to-move-your-presentation-audience-with-this-powerful-story-technique-header-1000x557.jpg';

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
  const [showMeetingConfirm, setShowMeetingConfirm] = useState(false);

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
  const leader = group.members.find((m) => m.is_leader);
  const otherMembers = group.members.filter((m) => !m.is_leader);
  const project = group.project;
  const meeting = group.meeting;

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="relative">
      <div className="pointer-events-none fixed inset-0">
        <img
          src={presentationBg}
          alt=""
          className="h-full w-full object-cover opacity-5"
        />
      </div>

      <div className="relative mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
      <button
        onClick={() => navigate(`/groups/${group.level}`)}
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-brand-600"
      >
        <ArrowLeft className="h-4 w-4" />
        {levelLabel}
      </button>

      <div className="mb-8 card p-5">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
          Python Level
        </p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">{levelLabel}</h1>
        <div className="mt-4 border-t border-slate-100 pt-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Project Group
          </p>
          <p className="mt-1 text-lg font-semibold text-slate-800">{group.name}</p>
        </div>
        <div className="mt-4 border-t border-slate-100 pt-4 flex items-center gap-2">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Group Leader:
          </span>
          {leader ? (
            <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-800">
              <Crown className="h-4 w-4 text-brand-600" />
              {leader.fellow.first_name} {leader.fellow.last_name}
            </span>
          ) : (
            <span className="text-sm font-medium text-slate-400 italic">
              Pending
            </span>
          )}
        </div>
      </div>

      <div className="mb-8">
        <div className="mb-3 flex items-center gap-2">
          <Users className="h-5 w-5 text-brand-600" />
          <h2 className="text-lg font-semibold text-slate-900">Group Members</h2>
          <span className="text-sm text-slate-400">({group.members.length})</span>
        </div>

        <div className="card divide-y divide-slate-100">
          {leader && (
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">
                  {leader.fellow.first_name[0]}
                  {leader.fellow.last_name[0]}
                </div>
                <div>
                  <span className="text-sm font-semibold text-slate-900">
                    {leader.fellow.first_name} {leader.fellow.last_name}
                  </span>
                  <div className="mt-0.5 flex items-center gap-1.5">
                    <span className={`h-2 w-2 rounded-full ${PARTICIPATION_STATUS_DOT_COLORS[(leader.participation_status ?? 'active') as ParticipationStatus]}`} />
                    <span className="text-xs text-slate-500">
                      {PARTICIPATION_STATUS_LABELS[(leader.participation_status ?? 'active') as ParticipationStatus]}
                    </span>
                  </div>
                </div>
              </div>
              <span className="badge bg-brand-50 text-brand-700">
                <Crown className="mr-1 h-3 w-3" />
                GROUP LEADER
              </span>
            </div>
          )}

          {otherMembers.map((m, i) => {
            const status = (m.participation_status ?? 'active') as ParticipationStatus;
            return (
              <div key={m.id} className="flex items-center p-4 transition-colors hover:bg-slate-50">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-600">
                  {m.fellow.first_name[0]}
                  {m.fellow.last_name[0]}
                </div>
                <div className="ml-3">
                  <span className="text-sm font-medium text-slate-700">
                    {m.fellow.first_name} {m.fellow.last_name}
                  </span>
                  <div className="mt-0.5 flex items-center gap-1.5">
                    <span className={`h-2 w-2 rounded-full ${PARTICIPATION_STATUS_DOT_COLORS[status]}`} />
                    <span className="text-xs text-slate-500">
                      {PARTICIPATION_STATUS_LABELS[status]}
                    </span>
                  </div>
                </div>
                <span className="ml-auto text-xs text-slate-300">{i + 2}</span>
              </div>
            );
          })}

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
          {!project ? (
            <div className="flex flex-col items-center py-6 text-center">
              <FileText className="h-8 w-8 text-slate-300" />
              <p className="mt-2 text-sm text-slate-500">
                Project topic has not been submitted yet.
              </p>
            </div>
          ) : (
            <>
              <div className="mb-4">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  Project Topic
                </p>
                {project.title ? (
                  <p className="mt-1 text-base font-semibold text-slate-900">{project.title}</p>
                ) : (
                  <p className="mt-1 text-sm text-slate-500 italic">
                    Project topic has not been submitted yet.
                  </p>
                )}
              </div>

              {project.description && (
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
                    STATUS_COLORS[project.status]
                  }`}
                >
                  {PROJECT_STATUS_LABELS[project.status]}
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Team Meeting */}
      <div className="mt-8">
        <div className="mb-3 flex items-center gap-2">
          <Video className="h-5 w-5 text-brand-600" />
          <h2 className="text-lg font-semibold text-slate-900">Team Meeting</h2>
        </div>

        <div className="card p-5">
          {meeting && meeting.status === 'ACTIVE' ? (
            <div>
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-green-500" />
                <p className="text-sm font-semibold text-slate-900">Google Meet</p>
                <span className="text-xs font-medium text-green-600">
                  Available
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-600">
                Your team meeting is available.
              </p>
              <button
                onClick={() => setShowMeetingConfirm(true)}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-6 py-3.5 text-sm font-bold text-white transition-colors hover:bg-brand-700 sm:w-auto sm:inline-flex"
              >
                <ExternalLink className="h-5 w-5" />
                JOIN TEAM MEETING
              </button>
              <p className="mt-3 text-sm text-slate-500">
                Use this link to join your team's online meeting.
              </p>
              <p className="mt-2 flex items-center gap-1 text-xs text-slate-400">
                <Clock className="h-3 w-3" />
                Last updated: {formatDate(meeting.updated_at)}
              </p>
            </div>
          ) : meeting && meeting.status === 'DISABLED' ? (
            <div>
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-slate-400" />
                <p className="text-sm font-semibold text-slate-700">Google Meet</p>
                <span className="text-xs font-medium text-slate-500">
                  Unavailable
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-600">
                Meeting link currently unavailable.
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Please contact your group leader or administrator for updates.
              </p>
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                <p className="text-sm font-semibold text-slate-700">Google Meet</p>
                <span className="text-xs font-medium text-amber-600">
                  Pending
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-600">
                Meeting link coming soon.
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Your group leader will provide the meeting details to the administrator.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Meeting confirmation modal */}
      {showMeetingConfirm && meeting && meeting.status === 'ACTIVE' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md card p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-50">
                <Video className="h-5 w-5 text-brand-600" />
              </div>
              <h2 className="text-lg font-semibold text-slate-900">
                Are you a member of this project team?
              </h2>
            </div>
            <p className="text-sm text-slate-600">
              This meeting is intended for members of this project team. Please confirm that you are a member before continuing to the meeting.
            </p>
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                onClick={() => setShowMeetingConfirm(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <a
                href={meeting.meeting_url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setShowMeetingConfirm(false)}
                className="flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-6 py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-700"
              >
                <ExternalLink className="h-4 w-4" />
                Yes, I'm a member
              </a>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
