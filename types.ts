
export enum ViewState {
  HOME = 'HOME',
  NEWS = 'NEWS',
  DIRECTORY = 'DIRECTORY',
  PROFILE = 'PROFILE',
  HR_DOSSIER = 'HR_DOSSIER',
  ONBOARDING = 'ONBOARDING',
  ACADEMY = 'ACADEMY',
  KNOWLEDGE_BASE = 'KNOWLEDGE_BASE',
  CHECKLISTS = 'CHECKLISTS',
  COMPENSATION = 'COMPENSATION',
  STOCK_CONTROL = 'STOCK_CONTROL',
  TODO_LIST = 'TODO_LIST',
  COMPLAINTS = 'COMPLAINTS',
  DEBT_CONTROL = 'DEBT_CONTROL',
  LINEN_AUDIT = 'LINEN_AUDIT',
  DATA_AUDIT = 'DATA_AUDIT',
  REPORTS = 'REPORTS',
  SYSTEM_STATUS = 'SYSTEM_STATUS',
  SETTINGS = 'SETTINGS',
  RECRUITMENT = 'RECRUITMENT',
  EVALUATIONS = 'EVALUATIONS'
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
  | 'MANAGE_ACADEMY'
  | 'MANAGE_COMPENSATION'
  | 'DELETE_COMPENSATION'
  | 'MANAGE_TICKETS'
  | 'MANAGE_CHECKLISTS'
  | 'MANAGE_TASKS'
  | 'MANAGE_COMPLAINTS'
  | 'MANAGE_STOCK';

export const PERMISSION_LABELS: Record<Permission, string> = {
  'VIEW_REPORTS': 'Rapportages Bekijken',
  'MANAGE_EMPLOYEES': 'Medewerkers Beheren',
  'DELETE_EMPLOYEES': 'Medewerkers Verwijderen',
  'MANAGE_DOCUMENTS': 'Documenten Beheren',
  'DELETE_DOCUMENTS': 'Documenten Verwijderen',
  'VIEW_ALL_DOCUMENTS': 'Alle Documenten Inzien',
  'CREATE_NEWS': 'Nieuws Plaatsen',
  'DELETE_NEWS': 'Nieuws Verwijderen',
  'MANAGE_ONBOARDING': 'Onboarding Beheren',
  'VIEW_SYSTEM_STATUS': 'Systeemstatus Inzien',
  'MANAGE_SETTINGS': 'Instellingen Beheren',
  'MANAGE_EVALUATIONS': 'Evaluaties Beheren',
  'DELETE_EVALUATIONS': 'Evaluaties Verwijderen',
  'MANAGE_DEBTORS': 'Debiteuren Beheren',
  'MANAGE_RECRUITMENT': 'Recruitment Beheren',
  'MANAGE_KNOWLEDGE': 'Kennisbank Beheren',
  'MANAGE_OPERATIONS': 'Operatie Beheren',
  'MANAGE_ACADEMY': 'Academy Beheren',
  'MANAGE_COMPENSATION': 'Compensatie Beheren',
  'DELETE_COMPENSATION': 'Compensatie Verwijderen',
  'MANAGE_TICKETS': 'Tickets Beheren',
  'MANAGE_CHECKLISTS': 'Checklists Beheren',
  'MANAGE_TASKS': 'Taken Beheren',
  'MANAGE_COMPLAINTS': 'Klachten Beheren',
  'MANAGE_STOCK': 'Voorraad Beheren'
};

export interface GlobalSettings {
  modules: Record<string, { 
    id: ViewState, 
    name: string, 
    enabled: boolean, 
    accessMode: 'open' | 'restricted',
    hiddenForRoles?: string[],
    hiddenForUsers?: string[],
    allowedUsers?: string[]
  }>;
  branding: {
    loginImages: string[];
  };
  roles?: Record<string, Permission[]>;
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
  reason?: string;
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
  readBy?: string[];
}

export interface Notification {
  id: string;
  recipientId: string;
  senderName: string;
  type: 'System' | 'Badge' | 'Evaluation' | 'Recruitment' | 'General' | 'Evaluation'; // Duplication fixed in logic usually, but here just defining string literal types
  title: string;
  message: string;
  date: string;
  read: boolean;
  targetView: ViewState;
  targetEmployeeId?: string;
  isPinned?: boolean;
}

// --- EMPLOYEE & HR ---

export interface EmployeeNote {
  id: string;
  title: string;
  category: string;
  content: string;
  date: string;
  author: string;
  visibleToEmployee: boolean;
  impact?: 'Positive' | 'Negative' | 'Neutral';
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
  url: string;
}

export type DossierEntryType = 'Sick' | 'Late' | 'Warning' | 'Compliment' | 'Recovery' | 'Note';

export interface DossierEntry {
  id: string;
  type: DossierEntryType;
  date: string;
  endDate?: string;
  title: string;
  description: string;
  loggedBy: string;
  meta?: any;
}

export interface Employee {
  id: string;
  name: string;
  role: string;
  email: string;
  avatar: string;
  departments: string[];
  phone?: string;
  linkedin?: string;
  hiredOn: string;
  employmentType: string;
  accountStatus: 'Active' | 'Pending' | 'Inactive';
  password?: string;
  customPermissions?: Permission[];
  badges?: AssignedBadge[];
  onboardingStatus?: 'Pending' | 'Active' | 'Completed';
  onboardingTasks?: OnboardingTask[];
  onboardingWeeks?: OnboardingWeekData[];
  onboardingWeekCount?: number;
  onboardingWeekTitles?: Record<number, string>;
  activeTemplateId?: string;
  onboardingHistory?: OnboardingHistoryEntry[];
  mentor?: string;
  dossier?: DossierEntry[];
  notes?: EmployeeNote[];
  documents?: EmployeeDocument[];
  evaluations?: EvaluationCycle[];
}

// --- ONBOARDING ---

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
  description?: string;
  completed?: boolean;
  completedBy?: string;
  completedDate?: string;
  score?: number;
  notes?: string;
  notesVisibleToEmployee?: boolean;
  subtasks?: SubTask[];
  isSimpleCheck?: boolean;
}

export interface OnboardingWeekData {
  week: number;
  managerNotes?: string;
  status: 'Open' | 'Completed';
}

export interface OnboardingHistoryEntry {
  id: string;
  templateTitle: string;
  role: string;
  startDate: string;
  endDate: string;
  finalScore: number;
  tasks: OnboardingTask[];
  weeks: OnboardingWeekData[];
}

export interface OnboardingTemplate {
  id: string;
  title: string;
  description?: string;
  role?: string;
  tasks: OnboardingTask[];
  weekTitles?: Record<number, string>;
  weekCount?: number;
  createdAt: string;
}

// --- RECRUITMENT ---

export type ApplicantStage = 'New' | 'Screening' | 'Interview 1' | 'Interview 2' | 'Offer' | 'Hired' | 'Rejected';

export interface RecruitmentTimelineEvent {
  id: string;
  type: 'StatusChange' | 'Note' | 'Interview' | 'Scorecard';
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
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  vacancyId: string;
  stage: ApplicantStage;
  appliedDate: string;
  resumeUrl?: string;
  motivationUrl?: string;
  rating?: number;
  matchScore?: number;
  skills?: string[];
  timeline: RecruitmentTimelineEvent[];
  scorecards: CandidateScorecard[];
  interviews: Interview[];
}

export interface Vacancy {
  id: string;
  title: string;
  department: string;
  type: string;
  status: string;
  applicantsCount: number;
  postedDate: string;
}

// --- ACADEMY ---

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
  dueDate?: string;
  badgeConfig?: {
    enabled: boolean;
    name: string;
    icon: BadgeIconKey;
    color: BadgeColor;
    minScore: number;
  };
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
  timeCapsuleAnswers?: Record<string, any>;
  startDate?: string;
  completedDate?: string;
  isBadgeEarned?: boolean;
  finalScore?: number;
}

// --- EVALUATIONS ---

export type EvaluationStatus = 'Planned' | 'EmployeeInput' | 'ManagerInput' | 'Review' | 'Signed' | 'Archived';

export interface EvaluationTemplate {
  id: string;
  title: string;
  description: string;
  sections: { id: string; title: string; questions: { id: string; text: string; }[] }[];
  createdAt: string;
  updatedAt: string;
}

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
  goals: any[];
  signatures: any[];
  employeeWins?: string;
  employeeStruggles?: string;
  managerWins?: string;
  managerStruggles?: string;
  managerGeneralFeedback?: string;
}

// --- TICKETS ---

export type TicketStatus = 'Open' | 'In Progress' | 'Resolved';
export type TicketPriority = 'Low' | 'Medium' | 'High';
export type TicketType = 'Bug' | 'Idea' | 'Fix';

export interface TicketMessage {
  id: string;
  senderId: string;
  senderName: string;
  avatar?: string;
  content: string;
  timestamp: string;
  type: 'public' | 'internal' | 'system';
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
  messages?: TicketMessage[];
}

// --- TASKS ---

export type TaskStatus = 'Pending' | 'In Progress' | 'Completed';
export type TaskPriority = 'Low' | 'Medium' | 'High';

export interface TaskUpdate {
  id: string;
  author: string;
  content: string;
  createdAt: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: string;
  assigneeId?: string;
  assigneeName?: string;
  isGeneral: boolean;
  createdBy: string;
  createdById: string;
  createdAt: string;
  shareWithTeam?: boolean;
  subtasks?: SubTask[];
  updates?: TaskUpdate[];
  completedAt?: string;
}

// --- COMPLAINTS ---

export type ComplaintStatus = 'Open' | 'In Progress' | 'Resolved' | 'Closed';
export type ComplaintSeverity = 'Low' | 'Medium' | 'High' | 'Critical';
export type ComplaintCategory = 'Room' | 'Food' | 'Service' | 'Noise' | 'Technical' | 'Other';

export interface ComplaintTimelineItem {
  id: string;
  date: string;
  author: string;
  action: string;
  note: string;
}

export interface Complaint {
  id: string;
  reservationNumber: string;
  guestName: string;
  roomNumber?: string;
  category: ComplaintCategory;
  department?: string;
  severity: ComplaintSeverity;
  status: ComplaintStatus;
  description: string;
  images?: string[];
  compensationDetails: {
    offered: string;
    cost?: number;
    guestAccepted: boolean | null;
  };
  assignedTo?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  timeline: ComplaintTimelineItem[];
}

// --- COMPENSATION ---

export type CompensationCategory = 'Kamer' | 'F&B' | 'Wellness' | 'Service' | 'Overig';

export interface CompensationPolicy {
  id: string;
  category: CompensationCategory;
  complaint: string;
  standardCompensation: string;
  maxRefundAmount?: number;
  procedure: string;
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

// --- DEBTORS ---

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
  notes?: DebtorNote[];
  cashlistReason?: string;
  correctionReason?: string;
}

// --- CHECKLISTS ---

export type ChecklistItemType = 'text' | 'checkbox' | 'yes_no' | 'select' | 'multi_select' | 'date' | 'file' | 'rating' | 'signature' | 'header';

export interface ChecklistItem {
  id: string;
  text: string;
  type: ChecklistItemType;
  required?: boolean;
  isCritical?: boolean;
  description?: string;
  options?: string[];
  explanationRequiredOn?: 'yes' | 'no' | null;
  explanationLabel?: string;
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

// --- SURVEYS ---

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
  status: 'Active' | 'Closed' | 'Draft';
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

// --- BIKE RENTAL ---

export type BikeType = 'City Bike Men' | 'City Bike Women' | 'E-Bike';

export interface BikeSettings {
  inventory: Record<BikeType, number>;
  inMaintenance: string[];
  termsAndConditions: string;
  maintenanceReasons: Record<string, string>;
}

export interface BikeReservation {
  id: string;
  groupId: string;
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

// --- SHIFT HANDOVER ---

export interface ShiftHandoverItem {
  id: string;
  date: string;
  content: string;
  category: 'General' | 'Specific';
  target?: string;
  authorName: string;
  priority: 'Normal' | 'High';
  createdAt: string;
  expiryDate?: string;
}

// --- STOCK CONTROL ---

export interface StockItem {
  id: string;
  name: string;
  category: string;
  currentStock: number;
  minStock: number;
  unit: string;
  itemsPerBox?: number;
  lastUpdated: string;
}

export type StockTransactionType = 'Delivery' | 'Count' | 'Usage' | 'Correction';

export interface StockLog {
  id: string;
  itemId: string;
  itemName: string;
  change: number;
  type: StockTransactionType;
  date: string;
  user: string;
  notes?: string;
}

// --- SYSTEM ---

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
  views?: number;
  isPinned?: boolean;
  reviewDate?: string;
}
