export type FellowLevel = 'ADVANCED' | 'UPPER_INTERMEDIATE' | 'INTERMEDIATE' | 'DEVELOPING' | 'BEGINNER';
export type ProjectRoundStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
export type ProjectStatus = 'NOT_SUBMITTED' | 'SUBMITTED' | 'APPROVED' | 'NEEDS_REVISION';
export type MeetingPlatform = 'GOOGLE_MEET';
export type MeetingStatus = 'NOT_SET' | 'ACTIVE' | 'DISABLED';
export type AdminRole = 'SUPER_ADMIN' | 'ADMIN';
export type ParticipationStatus = 'active' | 'needs_participation' | 'not_participating';

export interface Announcement {
  id: string;
  title: string;
  body: string;
  is_pinned: boolean;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Milestone {
  id: string;
  project_round_id: string;
  title: string;
  description: string | null;
  due_date: string;
  is_completed: boolean;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export type PresentationStatus = 'live' | 'ended';

export type PresentationPhase = 'initial_review' | 'progress_review' | 'final_presentation';

export const PRESENTATION_PHASE_LABELS: Record<PresentationPhase, string> = {
  initial_review: 'Initial Review',
  progress_review: 'Progress Review',
  final_presentation: 'Final Presentation',
};

export const PRESENTATION_PHASE_ORDER: PresentationPhase[] = [
  'initial_review',
  'progress_review',
  'final_presentation',
];

export type ReactionType = 'thumbs_up' | 'thumbs_down' | 'heart' | 'fire' | 'laugh';

export interface Presentation {
  id: string;
  project_round_id: string;
  project_group_id: string;
  status: PresentationStatus;
  presentation_phase: PresentationPhase;
  started_at: string;
  ended_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReactionCount {
  reaction_type: ReactionType;
  count: number;
}

export interface PresentationWithDetails extends Presentation {
  group_name: string;
  group_level: FellowLevel;
  group_number: number;
  project_title: string | null;
  project_description: string | null;
  members: {
    id: string;
    first_name: string;
    last_name: string;
    is_leader: boolean;
  }[];
  reaction_counts: ReactionCount[];
}

export interface Admin {
  id: string;
  email: string;
  role: AdminRole;
  created_at: string;
}

export interface Fellow {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  ranking: number;
  lessons_completed: number;
  level: FellowLevel;
  created_at: string;
  updated_at: string;
}

export interface PublicFellow {
  id: string;
  first_name: string;
  last_name: string;
  level: FellowLevel;
}

export interface ProjectRound {
  id: string;
  name: string;
  description: string | null;
  status: ProjectRoundStatus;
  created_at: string;
  published_at: string | null;
  updated_at: string;
}

export interface ProjectGroup {
  id: string;
  project_round_id: string;
  level: FellowLevel;
  group_number: number;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface GroupMember {
  id: string;
  project_group_id: string;
  fellow_id: string;
  is_leader: boolean;
  participation_status: ParticipationStatus;
  last_reviewed_at: string | null;
  reviewed_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  project_group_id: string;
  title: string | null;
  description: string | null;
  status: ProjectStatus;
  submitted_at: string | null;
  updated_at: string;
}

export interface TeamMeeting {
  id: string;
  project_group_id: string;
  platform: MeetingPlatform;
  meeting_url: string;
  status: MeetingStatus;
  created_at: string;
  updated_at: string;
}

export interface GroupMemberWithFellow extends GroupMember {
  fellow: PublicFellow;
}

export interface ParticipationReview {
  id: string;
  group_member_id: string;
  previous_status: ParticipationStatus | null;
  new_status: ParticipationStatus;
  leader_comment: string | null;
  reviewed_by: string | null;
  created_at: string;
}

export interface ProjectGroupWithDetails extends ProjectGroup {
  members: GroupMemberWithFellow[];
  project: Project | null;
  meeting: TeamMeeting | null;
  project_round: ProjectRound;
}

export const LEVEL_ORDER: FellowLevel[] = [
  'ADVANCED',
  'UPPER_INTERMEDIATE',
  'INTERMEDIATE',
  'DEVELOPING',
  'BEGINNER',
];

export const LEVEL_LABELS: Record<FellowLevel, string> = {
  ADVANCED: 'Advanced',
  UPPER_INTERMEDIATE: 'Upper Intermediate',
  INTERMEDIATE: 'Intermediate',
  DEVELOPING: 'Developing',
  BEGINNER: 'Beginner',
};

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  NOT_SUBMITTED: 'Not Submitted',
  SUBMITTED: 'Submitted',
  APPROVED: 'Approved',
  NEEDS_REVISION: 'Needs Revision',
};

export const ROUND_STATUS_LABELS: Record<ProjectRoundStatus, string> = {
  DRAFT: 'Draft',
  PUBLISHED: 'Published',
  ARCHIVED: 'Archived',
};

export const MEETING_STATUS_LABELS: Record<MeetingStatus, string> = {
  NOT_SET: 'Not Set',
  ACTIVE: 'Active',
  DISABLED: 'Disabled',
};

export const MEETING_PLATFORM_LABELS: Record<MeetingPlatform, string> = {
  GOOGLE_MEET: 'Google Meet',
};

export const PARTICIPATION_STATUS_LABELS: Record<ParticipationStatus, string> = {
  active: 'Active',
  needs_participation: 'Needs Participation',
  not_participating: 'Not Participating',
};

export const PARTICIPATION_STATUS_COLORS: Record<ParticipationStatus, string> = {
  active: 'bg-green-50 text-green-700',
  needs_participation: 'bg-amber-50 text-amber-700',
  not_participating: 'bg-red-50 text-red-700',
};

export const PARTICIPATION_STATUS_DOT_COLORS: Record<ParticipationStatus, string> = {
  active: 'bg-green-500',
  needs_participation: 'bg-amber-500',
  not_participating: 'bg-red-500',
};

export const REACTION_LABELS: Record<ReactionType, { emoji: string; label: string }> = {
  thumbs_up: { emoji: '👍', label: 'Great' },
  thumbs_down: { emoji: '👎', label: 'Needs Work' },
  heart: { emoji: '❤️', label: 'Love it' },
  fire: { emoji: '🔥', label: 'Fire' },
  laugh: { emoji: '😂', label: 'Funny' },
};

// ===== Project Showcase =====

export interface ProjectShowcase {
  id: string;
  project_id: string;
  problem_statement: string | null;
  solution: string | null;
  technologies: string[];
  screenshots: string[];
  github_url: string | null;
  demo_url: string | null;
  is_published: boolean;
  is_featured: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProjectGroupAssignment {
  id: string;
  project_id: string;
  project_group_id: string;
  created_at: string;
}

export interface ShowcaseGroupInfo {
  group_id: string;
  group_name: string;
  group_level: FellowLevel;
  group_number: number;
  is_primary: boolean;
}

export interface ShowcaseCard {
  showcase: ProjectShowcase;
  project_id: string;
  project_title: string | null;
  project_description: string | null;
  groups: ShowcaseGroupInfo[];
  group_id: string;
  group_name: string;
  group_level: FellowLevel;
  group_number: number;
  leader_name: string | null;
  member_count: number;
  total_reactions: number;
  reaction_counts: ReactionCount[];
}

export interface ShowcaseDetail extends ShowcaseCard {
  members: {
    id: string;
    first_name: string;
    last_name: string;
    is_leader: boolean;
    group_name: string;
  }[];
  presentation_date: string | null;
}
