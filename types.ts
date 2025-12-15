
export type ViewState =
  | 'HOME'
  | 'DIRECTORY'
  | 'PROFILE'
  | 'HR_DOSSIER'
  | 'DOCUMENTS'
  | 'NEWS'
  | 'ONBOARDING'
  | 'REPORTS'
  | 'SYSTEM_STATUS'
  | 'SETTINGS'
  | 'DEBT_CONTROL'
  | 'LINEN_AUDIT'
  | 'KNOWLEDGE_BASE'
  | 'EVALUATIONS'
  | 'RECRUITMENT'
  | 'BIKE_RENTAL'
  | 'COMPENSATION'
  | 'CHECKLISTS'
  | 'ACADEMY';

export const ViewState = {
  HOME: 'HOME',
  DIRECTORY: 'DIRECTORY',
  PROFILE: 'PROFILE',
  HR_DOSSIER: 'HR_DOSSIER',
  DOCUMENTS: 'DOCUMENTS',
  NEWS: 'NEWS',
  ONBOARDING: 'ONBOARDING',
  REPORTS: 'REPORTS',
  SYSTEM_STATUS: 'SYSTEM_STATUS',
  SETTINGS: 'SETTINGS',
  DEBT_CONTROL: 'DEBT_CONTROL',
  LINEN_AUDIT: 'LINEN_AUDIT',
  KNOWLEDGE_BASE: 'KNOWLEDGE_BASE',
  EVALUATIONS: 'EVALUATIONS',
  RECRUITMENT: 'RECRUITMENT',
  BIKE_RENTAL: 'BIKE_RENTAL',
  COMPENSATION: 'COMPENSATION',
  CHECKLISTS: 'CHECKLISTS',
  ACADEMY: 'ACADEMY',
} as const;

export type Permission =
  | 'VIEW_REPORTS'
  | 'MANAGE_EMPLOYEES'
  | 'DELETE_EMPLOYEES'
  | 'MANAGE_DOCUMENTS'
  | 'DELETE_DOCUMENTS'
  | 'VIEW_ALL_DOCUMENTS'
  | 'CREATE_NEWS'
  | 'DELETE_NEWS'
  | 'MANAGE_ONBOARDING'
  | 'VIEW_SYSTEM_STATUS'
  | 'MANAGE_SETTINGS'
  | 'MANAGE_EVALUATIONS'
  | 'DELETE_EVALUATIONS'
  | 'MANAGE_DEBTORS'
  | 'MANAGE_RECRUITMENT'
  | 'MANAGE_KNOWLEDGE'
  | 'MANAGE_OPERATIONS'
  | 'MANAGE_RENTALS'
  | 'MANAGE_ACADEMY'
  | 'MANAGE_COMPENSATION'
  | 'DELETE_COMPENSATION'
  | 'MANAGE_TICKETS'
  | 'MANAGE_CHECKLISTS';

export const PERMISSION_LABELS: Record<Permission, string> = {
  VIEW_REPORTS: 'Rapportages Inzien',
  MANAGE_EMPLOYEES: 'Medewerkers Beheren',
  DELETE_EMPLOYEES: 'Medewerkers Verwijderen',
  MANAGE_DOCUMENTS: 'Documenten Beheren',
  DELETE_DOCUMENTS: 'Documenten Verwijderen',
  VIEW_ALL_DOCUMENTS: 'Alle Documenten Inzien',
  CREATE_NEWS: 'Nieuws Plaatsen',
  DELETE_NEWS: 'Nieuws Verwijderen',
  MANAGE_ONBOARDING: 'Onboarding Beheren',
  VIEW_SYSTEM_STATUS: 'Systeemstatus Inzien',
  MANAGE_SETTINGS: 'Instellingen Beheren',
  MANAGE_EVALUATIONS: 'Evaluaties Beheren',
  DELETE_EVALUATIONS: 'Evaluaties Verwijderen',
  MANAGE_DEBTORS: 'Debiteuren Beheren',
  MANAGE_RECRUITMENT: 'Recruitment Beheren',
  MANAGE_KNOWLEDGE: 'Kennisbank Beheren',
  MANAGE_OPERATIONS: 'Operatie Beheren',
  MANAGE_RENTALS: 'Verhuur Beheren',
  MANAGE_ACADEMY: 'Academy Beheren',
  MANAGE_COMPENSATION: 'Compensatie Beheren',
  DELETE_COMPENSATION: 'Compensatie Verwijderen',
  MANAGE_TICKETS: 'Tickets Beheren',
  MANAGE_CHECKLISTS: 'Checklists Beheren',
};

export interface GlobalSettings {
  modules: Record<string, {
    id: ViewState;
    name: string;
    enabled: boolean;
    accessMode?: 'open' | 'restricted'; // 'open' = blacklist (hiddenFor...), 'restricted' = whitelist (allowedUsers)
    hiddenForRoles: string[]; // Used in 'open' mode
    hiddenForUsers: string[]; // Used in 'open' mode
    allowedUsers?: string[]; // Used in 'restricted' mode
  }>;
  loginImages?: string[];
  welcomeImages?: string[];
}

export type DossierEntryType = 'Sick' | 'Late' | 'Warning' | 'Recovery' | 'Compliment' | 'Note' | 'OfficialNote';

export interface DossierEntry {
  id: string;
  type: DossierEntryType;
  date: string;
  endDate?: string;
  title: string;
  description: string;
  loggedBy: string;
  meta?: {
    minutesLate?: number;
    scheduledTime?: string;
    actualTime?: string;
    severity?: 'Low' | 'Medium' | 'High';
    sickType?: 'Kort' | 'Lang' | 'Frequent';
    tasksHandedOver?: boolean;
    nextActionDate?: string;
  };
}

export interface EmployeeNote {
  id: string;
  title: string;
  category: 'General' | 'Performance' | 'Verzuim' | 'Gesprek' | 'Incident';
  content: string;
  date: string;
  author: string;
  visibleToEmployee: boolean;
  impact: 'Positive' | 'Negative' | 'Neutral';
  score?: number;
}

export interface EmployeeDocument {
  id: string;
  name: string;
  type: string;
  category: string;
  date: string;
  size: string;
  uploadedBy: string;
}

export interface Employee {
  id: string;
  name: string;
  role: string;
  departments: string[];
  email: string;
  phone?: string;
  avatar?: string;
  linkedin?: string;
  hiredOn: string;
  employmentType: string;
  accountStatus: 'Active' | 'Pending' | 'Inactive';
  password?: string;
  documents?: EmployeeDocument[];
  notes?: EmployeeNote[];
  dossier?: DossierEntry[];
  onboardingStatus?: 'Pending' | 'Active' | 'Completed';
  onboardingTasks?: OnboardingTask[];
  onboardingWeeks?: OnboardingWeekData[];
  onboardingWeekTitles?: Record<number, string>;
  onboardingWeekCount?: number;
  onboardingHistory?: OnboardingHistoryEntry[];
  activeTemplateId?: string;
  customPermissions?: Permission[];
  evaluations?: EvaluationCycle[];
  badges?: AssignedBadge[];
  mentor?: string;
}

export interface NewsPost {
  id: string;
  title: string;
  shortDescription: string;
  content: string;
  authorName: string;
  authorRole: string;
  authorAvatar?: string;
  date: string;
  image?: string;
  readBy?: string[];
  isPinned?: boolean;
}

export interface SubTask {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
}

export interface OnboardingTask {
  id: string;
  week: number;
  category: string;
  title: string;
  description: string;
  completed: boolean;
  score?: number; // 0, 25, 50, 75, 100
  completedBy?: string;
  completedDate?: string;
  notes?: string;
  notesVisibleToEmployee?: boolean;
  subtasks?: SubTask[];
  isSimpleCheck?: boolean;
}

export interface OnboardingWeekData {
  week: number;
  managerNotes?: string;
  status: 'Open' | 'Closed';
}

export interface OnboardingHistoryEntry {
  id: string;
  templateTitle: string;
  role: string;
  startDate: string;
  endDate: string;
  tasks: OnboardingTask[];
  weeks: OnboardingWeekData[];
  finalScore: number;
}

export interface OnboardingTemplate {
  id: string;
  title: string;
  description: string;
  role?: string;
  tasks: OnboardingTask[];
  weekTitles?: Record<number, string>;
  weekCount?: number;
  createdAt: string;
}

export interface SystemUpdateLog {
  id: string;
  version: string;
  date: string;
  timestamp: string;
  author: string;
  type: 'Feature' | 'Bugfix' | 'Maintenance' | 'Security';
  impact: 'High' | 'Medium' | 'Low';
  affectedArea: string;
  description: string;
  status: 'Success' | 'Pending' | 'Failed';
}

export interface KnowledgeArticle {
  id: string;
  title: string;
  category: string;
  content: string;
  tags: string[];
  authorName: string;
  authorRole: string;
  lastUpdated: string;
  allowedRoles: string[];
  allowedDepartments: string[];
  views: number;
  isPinned: boolean;
  reviewDate?: string;
}

export type TicketStatus = 'Open' | 'In Progress' | 'Resolved' | 'Closed';
export type TicketPriority = 'Low' | 'Medium' | 'High';
export type TicketType = 'Bug' | 'Idea' | 'Fix' | 'Other';

export interface TicketMessage {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: string;
  type: 'public' | 'internal' | 'system';
  avatar?: string;
}

export interface Ticket {
  id: string;
  title: string;
  description: string;
  type: TicketType;
  priority: TicketPriority;
  page: string;
  status: TicketStatus;
  submittedBy: string;
  submittedById: string;
  submittedAt: string;
  resolvedAt?: string;
  messages: TicketMessage[];
}

export interface Vacancy {
  id: string;
  title: string;
  department: string;
  type: string;
  status: 'Open' | 'Closed';
  applicantsCount: number;
  postedDate: string;
}

export type ApplicantStage = 'New' | 'Screening' | 'Interview 1' | 'Interview 2' | 'Offer' | 'Hired' | 'Rejected';

export interface RecruitmentTimelineEvent {
  id: string;
  type: 'StatusChange' | 'Note' | 'Interview' | 'Scorecard' | 'Email';
  author: string;
  date: string;
  content: string;
}

export interface CandidateScorecard {
  id: string;
  interviewId: string;
  interviewer: string;
  date: string;
  skills: { name: string; score: number }[];
  notes: string;
  recommendation: 'Hire' | 'Maybe' | 'No Hire';
}

export interface Interview {
  id: string;
  date: string;
  time: string;
  location: string;
  interviewers: string[];
  status: 'Scheduled' | 'Completed' | 'Cancelled';
}

export interface Applicant {
  id: string;
  vacancyId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  stage: ApplicantStage;
  appliedDate: string;
  resumeUrl?: string;
  motivationUrl?: string;
  rating?: number;
  skills?: string[];
  matchScore?: number;
  timeline: RecruitmentTimelineEvent[];
  scorecards: CandidateScorecard[];
  interviews: Interview[];
}

export type EvaluationStatus = 'Planned' | 'EmployeeInput' | 'ManagerInput' | 'Review' | 'Signed' | 'Archived';

export interface EvaluationCycle {
  id: string;
  employeeId: string;
  managerId: string;
  type: string;
  templateId?: string;
  status: EvaluationStatus;
  createdAt: string;
  plannedDate: string;
  completedAt?: string;
  scores: {
    category: string;
    topic: string;
    employeeScore: number;
    managerScore: number;
    employeeComment?: string;
    managerComment?: string;
  }[];
  managerGeneralFeedback?: string;
  employeeWins?: string;
  employeeStruggles?: string;
  managerWins?: string;
  managerStruggles?: string;
  goals: any[];
  signatures: any[];
}

export interface EvaluationTemplate {
  id: string;
  title: string;
  description: string;
  sections: {
    id: string;
    title: string;
    questions: { id: string; text: string; description?: string }[];
  }[];
  createdAt: string;
  updatedAt: string;
}

export interface BikeSettings {
  inventory: Record<string, number>;
  inMaintenance: string[];
  termsAndConditions: string;
  maintenanceReasons?: Record<string, string>;
}

export type BikeType = 'City Bike Men' | 'City Bike Women' | 'E-Bike';

export interface BikeReservation {
  id: string;
  groupId?: string;
  guestName: string;
  roomNumber: string;
  bikeType: BikeType;
  bikeId?: string;
  amount: number;
  startDate: string;
  endDate: string;
  startTime?: string;
  endTime?: string;
  status: 'Pending' | 'Active' | 'Completed' | 'Cancelled';
  termsAccepted: boolean;
  signatureUrl?: string;
  damageReport?: string;
  createdAt: string;
  createdBy: string;
}

export type BadgeIconKey = 'Trophy' | 'Star' | 'Medal' | 'Heart' | 'Zap' | 'Shield' | 'Rocket' | 'Crown' | 'ThumbsUp' | 'Lightbulb' | 'Flame' | 'Target' | 'Users' | 'Eye';
export type BadgeColor = 'yellow' | 'blue' | 'purple' | 'red' | 'green' | 'pink' | 'orange' | 'slate';

export interface BadgeDefinition {
  id: string;
  name: string;
  description: string;
  icon: BadgeIconKey;
  color: BadgeColor;
  createdAt: string;
}

export interface AssignedBadge {
  id: string;
  badgeId: string;
  assignedBy: string;
  assignedById: string;
  assignedAt: string;
}

export interface AcademyCourse {
  id: string;
  title: string;
  description: string;
  category: string;
  level: string;
  coverImage?: string;
  modules: AcademyModule[];
  targetRoles: string[];
  targetEmployees?: string[];
  createdAt: string;
  author: string;
  isPublished: boolean;
  xpPoints: number;
  badgeConfig?: {
    enabled: boolean;
    name: string;
    icon: BadgeIconKey;
    color: BadgeColor;
    minScore: number;
  };
  dueDate?: string;
  prerequisiteCourseIds?: string[];
}

export interface AcademyModule {
  id: string;
  title: string;
  lessons: AcademyLesson[];
}

export type BlockType = 'text' | 'image' | 'video' | 'quiz' | 'hotspot' | 'time-capsule';

export interface HotspotItem {
  id: string;
  x: number;
  y: number;
  title: string;
  description: string;
}

export interface LearningBlock {
  id: string;
  type: BlockType;
  content: any; // Flexible content based on type
}

export interface AcademyLesson {
  id: string;
  title: string;
  blocks: LearningBlock[];
  durationMinutes: number;
}

export interface AcademyProgress {
  id: string;
  employeeId: string;
  courseId: string;
  status: 'In Progress' | 'Completed';
  progressPercentage: number;
  completedLessonIds: string[];
  quizScores: Record<string, any>;
  timeCapsuleAnswers?: Record<string, any>;
  startDate: string;
  completedDate?: string;
  isBadgeEarned?: boolean;
  finalScore?: number;
}

export type CompensationCategory = 'Kamer' | 'F&B' | 'Wellness' | 'Service' | 'Overig';

export interface CompensationPolicy {
  id: string;
  category: CompensationCategory;
  complaint: string;
  standardCompensation: string;
  procedure: string;
  maxRefundAmount?: number;
  authorizedRoles: string[];
  updatedAt: string;
  updatedBy: string;
}

export interface CompensationLog {
  id: string;
  guestName: string;
  reservationNumber: string;
  policyId?: string;
  compensationGiven: string;
  reason: string;
  cost?: number;
  givenBy: string;
  givenById: string;
  date: string;
}

export type ChecklistItemType = 'text' | 'checkbox' | 'select' | 'multi_select' | 'yes_no' | 'date' | 'file' | 'rating' | 'signature' | 'header';

export interface ChecklistItem {
  id: string;
  text: string;
  type: ChecklistItemType;
  description?: string;
  required: boolean;
  isCritical?: boolean;
  options?: string[]; // for select, multi_select, yes_no (as labels)
  explanationRequiredOn?: 'yes' | 'no' | null; // for yes_no
  explanationLabel?: string;
  includeTime?: boolean; // for date
}

export interface ChecklistTemplate {
  id: string;
  title: string;
  description: string;
  category?: string;
  targetRoles?: string[];
  items: ChecklistItem[];
  createdBy: string;
  isActive: boolean;
  createdAt: string;
}

export interface ChecklistSubmission {
  id: string;
  templateId: string;
  templateSnapshot?: ChecklistTemplate;
  submittedBy: string;
  submittedById: string;
  status: 'Draft' | 'Completed';
  responses: Record<string, any>;
  startedAt: string;
  completedAt?: string;
}

export interface Notification {
  id: string;
  recipientId: string;
  senderName: string;
  type: 'System' | 'Evaluation' | 'Badge' | 'Recruitment' | 'General';
  title: string;
  message: string;
  date: string;
  read: boolean;
  targetView?: ViewState;
  targetEmployeeId?: string;
  isPinned?: boolean;
}

export type DebtorStatus = 'New' | '1st Reminder' | '2nd Reminder' | 'Final Notice' | 'Paid' | 'Correction' | 'Cashlist';

export interface DebtorNote {
  id: string;
  content: string;
  date: string;
  author: string;
}

export interface Debtor {
  id: string;
  reservationNumber: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  address: string;
  amount: number;
  status: DebtorStatus;
  statusDate: string;
  lastUpdated: string;
  importedAt: string;
  isEnriched?: boolean;
  cashlistReason?: string;
  correctionReason?: string;
  notes?: DebtorNote[];
}

export type SurveyTarget = 'All' | 'Managers' | 'Seniors';
export type SurveyQuestionType = 'Rating' | 'Scale10' | 'YesNo' | 'Text' | 'Choice';

export interface SurveyQuestion {
  id: string;
  text: string;
  type: SurveyQuestionType;
  options?: string[];
  image?: string;
}

export interface Survey {
  id: string;
  title: string;
  description: string;
  targetAudience: SurveyTarget;
  coverImage?: string;
  questions: SurveyQuestion[];
  createdBy: string;
  createdAt: string;
  status: 'Active' | 'Closed';
  responseCount: number;
  completedBy: string[];
}

export interface SurveyResponse {
  id: string;
  surveyId: string;
  employeeId: string;
  answers: Record<string, any>;
  completedAt: string;
}
