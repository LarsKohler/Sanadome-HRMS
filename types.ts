
export interface SubTask {
    id: string;
    title: string;
    description: string;
    completed: boolean;
}

export interface OnboardingTask {
  id: string;
  week: number;
  category: string;
  title: string;
  description: string;
  completed: boolean;
  score?: number;
  completedBy?: string;
  completedDate?: string;
  notes?: string;
  notesVisibleToEmployee?: boolean;
  subtasks?: SubTask[];
  isSimpleCheck?: boolean;
}

export interface OnboardingWeekData {
    week: number;
    managerNotes: string;
    status: 'Open' | 'Completed';
}

export enum ViewState {
  HOME = 'HOME',
  NEWS = 'NEWS',
  ACADEMY = 'ACADEMY',
  KNOWLEDGE_BASE = 'KNOWLEDGE_BASE',
  DIRECTORY = 'DIRECTORY',
  BIKE_RENTAL = 'BIKE_RENTAL',
  COMPENSATION = 'COMPENSATION',
  CHECKLISTS = 'CHECKLISTS',
  ONBOARDING = 'ONBOARDING',
  EVALUATIONS = 'EVALUATIONS',
  RECRUITMENT = 'RECRUITMENT',
  DOCUMENTS = 'DOCUMENTS',
  DEBT_CONTROL = 'DEBT_CONTROL',
  LINEN_AUDIT = 'LINEN_AUDIT',
  REPORTS = 'REPORTS',
  SYSTEM_STATUS = 'SYSTEM_STATUS',
  SETTINGS = 'SETTINGS',
  PROFILE = 'PROFILE'
}

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
  MANAGE_COMPENSATION: 'Compensaties Beheren',
  DELETE_COMPENSATION: 'Compensaties Verwijderen',
  MANAGE_TICKETS: 'Tickets Beheren',
  MANAGE_CHECKLISTS: 'Checklists Beheren'
};

export interface GlobalSettings {
  modules: Record<string, {
    id: ViewState;
    name: string;
    enabled: boolean;
    hiddenForRoles: string[];
    hiddenForUsers: string[];
  }>;
}

export interface EmployeeNote {
  id: string;
  title: string;
  category: 'General' | 'Performance' | 'Verzuim' | 'Gesprek' | 'Incident';
  content: string;
  date: string;
  author: string;
  visibleToEmployee: boolean;
  impact?: 'Positive' | 'Negative' | 'Neutral';
  score?: number;
}

// --- NEW DOSSIER TYPES ---
export type DossierEntryType = 'Sick' | 'Late' | 'Warning' | 'OfficialNote' | 'Recovery';

export interface DossierEntry {
  id: string;
  type: DossierEntryType;
  date: string;
  endDate?: string; // For sick leave recovery
  title: string;
  description: string;
  loggedBy: string;
  meta?: {
    minutesLate?: number;
    severity?: 'Low' | 'Medium' | 'High';
    sickType?: 'Kort' | 'Lang' | 'Frequent';
    tasksHandedOver?: boolean;
    nextActionDate?: string;
  };
}
// -------------------------

export interface EmployeeDocument {
  id: string;
  name: string;
  type: string;
  category: string;
  date: string;
  size: string;
  uploadedBy: string;
}

export interface NewsPost {
  id: string;
  title: string;
  shortDescription: string;
  content: string;
  authorName: string;
  authorRole: string;
  authorAvatar: string;
  date: string;
  image?: string;
  isPinned?: boolean;
  readBy: string[]; // Changed from likes/likedBy
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
  plannedDate?: string;
  completedAt?: string;
  scores: {
    category: string;
    topic: string;
    employeeScore: number;
    managerScore: number;
    employeeComment?: string;
    managerComment?: string;
  }[];
  goals: string[];
  signatures: string[];
  managerWins?: string;
  employeeWins?: string;
  managerStruggles?: string;
  employeeStruggles?: string;
  managerGeneralFeedback?: string;
  overallRating?: number;
}

export type BadgeIconKey = 'Trophy' | 'Star' | 'Medal' | 'Heart' | 'Zap' | 'Shield' | 'Rocket' | 'Crown' | 'ThumbsUp' | 'Lightbulb' | 'Flame' | 'Target' | 'Users' | 'Eye';

export type BadgeColor = 'yellow' | 'blue' | 'purple' | 'red' | 'green' | 'pink' | 'orange' | 'slate';

export interface AssignedBadge {
  id: string;
  badgeId: string;
  assignedBy: string;
  assignedById: string;
  assignedAt: string;
}

export interface BadgeDefinition {
  id: string;
  name: string;
  description: string;
  icon: BadgeIconKey;
  color: BadgeColor;
  createdAt: string;
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
  content: any;
}

export interface AcademyLesson {
  id: string;
  title: string;
  durationMinutes: number;
  blocks: LearningBlock[];
}

export interface AcademyModule {
  id: string;
  title: string;
  lessons: AcademyLesson[];
}

export interface AcademyCourse {
  id: string;
  title: string;
  description: string;
  category: string;
  coverImage?: string;
  level: string;
  targetRoles: string[];
  targetEmployees?: string[];
  createdAt: string;
  author: string;
  isPublished: boolean;
  xpPoints: number;
  modules: AcademyModule[];
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

export interface AcademyProgress {
  id: string;
  employeeId: string;
  courseId: string;
  status: 'In Progress' | 'Completed';
  progressPercentage: number;
  completedLessonIds: string[];
  quizScores: Record<string, number>;
  startDate: string;
  completedDate?: string;
  isBadgeEarned?: boolean;
  finalScore?: number;
  timeCapsuleAnswers?: Record<string, { before?: string; after?: string }>;
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

export interface Employee {
  id: string;
  name: string;
  role: string;
  departments: string[];
  email: string;
  phone?: string;
  avatar: string;
  linkedin?: string;
  hiredOn: string;
  employmentType: string;
  accountStatus: 'Active' | 'Pending' | 'Inactive';
  password?: string;
  documents: EmployeeDocument[];
  notes: EmployeeNote[];
  dossier?: DossierEntry[]; // NEW: Structured HR Dossier
  onboardingStatus: 'Pending' | 'Active' | 'Completed';
  onboardingTasks: OnboardingTask[];
  onboardingWeeks?: OnboardingWeekData[];
  onboardingWeekTitles?: Record<number, string>;
  onboardingWeekCount?: number;
  activeTemplateId?: string;
  onboardingHistory?: OnboardingHistoryEntry[];
  customPermissions?: Permission[];
  evaluations?: EvaluationCycle[];
  badges?: AssignedBadge[];
  mentor?: string;
}

export type ApplicantStage = 'New' | 'Screening' | 'Interview 1' | 'Interview 2' | 'Offer' | 'Hired' | 'Rejected';

export interface RecruitmentTimelineEvent {
  id: string;
  type: 'StatusChange' | 'Note' | 'Email' | 'Interview' | 'Scorecard';
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
  recommendation: 'Hire' | 'No Hire' | 'Maybe';
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
  matchScore?: number;
  skills?: string[];
  resumeUrl?: string;
  motivationUrl?: string;
  timeline: RecruitmentTimelineEvent[];
  scorecards: CandidateScorecard[];
  interviews: Interview[];
  rating?: number;
}

export interface Vacancy {
  id: string;
  title: string;
  department: string;
  type: string;
  status: 'Open' | 'Closed' | 'Draft';
  applicantsCount: number;
  postedDate: string;
}

export interface OnboardingTemplate {
  id: string;
  title: string;
  description: string;
  role?: string;
  tasks: OnboardingTask[];
  weekTitles?: Record<number, string>;
  createdAt: string;
  weekCount?: number;
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
  status: string;
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

export type TicketType = 'Bug' | 'Idea' | 'Fix' | 'Other';
export type TicketPriority = 'High' | 'Medium' | 'Low';
export type TicketStatus = 'Open' | 'In Progress' | 'Resolved' | 'Closed';

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
  status: TicketStatus;
  page?: string;
  submittedBy: string;
  submittedById: string;
  submittedAt: string;
  messages: TicketMessage[];
  resolvedAt?: string;
}

export interface EvaluationTemplate {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  sections: {
    id: string;
    title: string;
    questions: {
      id: string;
      text: string;
      description?: string;
    }[];
  }[];
}

export type BikeType = 'City Bike Men' | 'City Bike Women' | 'E-Bike';

export interface BikeSettings {
  inventory: Record<string, number>;
  inMaintenance: string[];
  termsAndConditions: string;
  maintenanceReasons?: Record<string, string>;
}

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

export type DebtorStatus = 'New' | '1st Reminder' | '2nd Reminder' | 'Final Notice' | 'Paid' | 'Blacklist' | 'Correction' | 'Cashlist';

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
  notes?: DebtorNote[];
  cashlistReason?: string;
  correctionReason?: string;
}

export type SurveyQuestionType = 'Rating' | 'Scale10' | 'YesNo' | 'Text' | 'Choice';

export interface SurveyQuestion {
  id: string;
  text: string;
  type: SurveyQuestionType;
  options?: string[];
  image?: string;
}

export type SurveyTarget = 'All' | 'Managers' | 'Seniors';

export interface Survey {
  id: string;
  title: string;
  description: string;
  targetAudience: SurveyTarget;
  coverImage?: string;
  questions: SurveyQuestion[];
  createdBy: string;
  createdAt: string;
  status: 'Active' | 'Draft' | 'Closed';
  responseCount: number;
  completedBy: string[];
}

export interface SurveyResponse {
  id: string;
  surveyId: string;
  employeeId: string;
  answers: Record<string, string | number>;
  completedAt: string;
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

export type ChecklistItemType = 
  | 'checkbox' 
  | 'text' 
  | 'yes_no' 
  | 'header' 
  | 'multi_select' 
  | 'select' 
  | 'date' 
  | 'file' 
  | 'rating' 
  | 'signature'; 

export interface ChecklistItem {
  id: string;
  text: string;
  type: ChecklistItemType;
  required?: boolean;
  isCritical?: boolean;
  description?: string; 
  explanationRequiredOn?: 'yes' | 'no' | null;
  explanationLabel?: string; 
  options?: string[]; 
  includeTime?: boolean;
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
  type: string;
  title: string;
  message: string;
  date: string;
  read: boolean;
  targetView: ViewState;
  targetEmployeeId?: string;
  isPinned?: boolean;
}