export type FellowLevel = 'ADVANCED' | 'UPPER_INTERMEDIATE' | 'INTERMEDIATE' | 'DEVELOPING' | 'BEGINNER';
export type ProjectRoundStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
export type ProjectStatus = 'NOT_SUBMITTED' | 'SUBMITTED' | 'APPROVED' | 'NEEDS_REVISION';

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

export interface GroupMemberWithFellow extends GroupMember {
  fellow: PublicFellow;
}

export interface ProjectGroupWithDetails extends ProjectGroup {
  members: GroupMemberWithFellow[];
  project: Project | null;
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
