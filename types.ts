

export enum ViewState {
  HOME = 'HOME',
  DIRECTORY = 'DIRECTORY',
  REPORTS = 'REPORTS',
  DOCUMENTS = 'DOCUMENTS',
  PROFILE = 'PROFILE', // Kept for future drill-down capability
  NEWS = 'NEWS',
  ONBOARDING = 'ONBOARDING',
  SURVEYS = 'SURVEYS',
  EVALUATIONS = 'EVALUATIONS', 
  WELCOME = 'WELCOME',
  SYSTEM_STATUS = 'SYSTEM_STATUS',
  SETTINGS = 'SETTINGS', // New View
  DEBT_CONTROL = 'DEBT_CONTROL', // New: Debiteuren Beheer
  BADGES = 'BADGES', // New: Badge Management
  KNOWLEDGE_BASE = 'KNOWLEDGE_BASE', // New: Knowledge Base
  LINEN_AUDIT = 'LINEN_AUDIT', // New: Moderna Calculator
  RECRUITMENT = 'RECRUITMENT', // New: ATS System
}

// --- PERMISSIONS SYSTEM ---

export type Permission = 
  | 'VIEW_REPORTS'
  | 'MANAGE_EMPLOYEES' // Add/Edit/Delete employees
  | 'MANAGE_DOCUMENTS' // Upload/Delete documents for others
  | 'VIEW_ALL_DOCUMENTS' // See documents of other users
  | 'CREATE_NEWS'
  | 'MANAGE_ONBOARDING' // Edit templates, change status
  | 'MANAGE_SURVEYS' // Create/Delete surveys
  | 'VIEW_SYSTEM_STATUS'
  | 'MANAGE_SETTINGS' // Access to permission settings
  | 'MANAGE_EVALUATIONS' // Create cycles, finalize reports
  | 'MANAGE_DEBTORS' // New: Access Debt Control
  | 'MANAGE_RECRUITMENT' // New: Access Recruitment module
  | 'VIEW_CALENDAR' // Access Calendar
  | 'MANAGE_ATTENDANCE' // Access Attendance/Rooster
  | 'MANAGE_CASES' // Access Arbo/Verzuim cases
  | 'MANAGE_BADGES' // New: Manage and Award Badges
  | 'MANAGE_KNOWLEDGE' // New: Create/Edit Knowledge Articles
  | 'MANAGE_OPERATIONS' // New: Operations & Audit Tools
  | 'MANAGE_TICKETS'; // New: Access Ticket System

export const PERMISSION_LABELS: Record<Permission, string> = {
  'VIEW_REPORTS': 'Rapportages Inzien',
  'MANAGE_EMPLOYEES': 'Medewerkers Beheren',
  'MANAGE_DOCUMENTS': 'Documenten Beheren (Upload/Delete)',
  'VIEW_ALL_DOCUMENTS': 'Inzage Alle Dossiers',
  'CREATE_NEWS': 'Nieuwsberichten Plaatsen',
  'MANAGE_ONBOARDING': 'Onboarding Trajecten Beheren',
  'MANAGE_SURVEYS': 'Surveys Maken & Beheren',
  'VIEW_SYSTEM_STATUS': 'Systeemstatus Bekijken',
  'MANAGE_SETTINGS': 'Rechten & Instellingen Beheren',
  'MANAGE_EVALUATIONS': 'Evaluaties & Performance Beheren',
  'MANAGE_DEBTORS': 'Debiteuren Beheer',
  'MANAGE_RECRUITMENT': 'Recruitment & Vacatures',
  'VIEW_CALENDAR': 'Kalender Inzien',
  'MANAGE_ATTENDANCE': 'Aanwezigheid & Roosters',
  'MANAGE_CASES': 'Cases & Verzuim Dossiers',
  'MANAGE_BADGES': 'Badges & Waardering Beheren',
  'MANAGE_KNOWLEDGE': 'Kennisbank Beheren',
  'MANAGE_OPERATIONS': 'Operationele Tools (Linnen)',
  'MANAGE_TICKETS': 'Tickets & Meldingen Beheren'
};

// --- TICKET SYSTEM TYPES ---

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
  page?: string;
  status: TicketStatus;
  submittedBy: string;
  submittedById: string;
  submittedAt: string;
  resolvedAt?: string;
  messages: TicketMessage[];
}

// --- RECRUITMENT TYPES ---

export type ApplicantStage = 'New' | 'Screening' | 'Interview 1' | 'Interview 2' | 'Offer' | 'Hired' | 'Rejected';

export interface Vacancy {
  id: string;
  title: string;
  department: string;
  type: 'Full-Time' | 'Part-Time' | 'Stage';
  status: 'Open' | 'Closed' | 'Draft';
  applicantsCount: number;
  postedDate: string;
  description?: string;
  requirements?: string[];
  salaryRange?: string;
}

export interface RecruitmentTimelineEvent {
    id: string;
    type: 'StatusChange' | 'Note' | 'Email' | 'Interview' | 'Scorecard';
    author: string;
    date: string;
    content: string;
    meta?: any; // e.g., the new status, or score
}

export interface CandidateScorecard {
    id: string;
    interviewer: string;
    date: string;
    skills: { name: string; score: number }[]; // 1-5
    notes: string;
    recommendation: 'Hire' | 'No Hire' | 'Maybe';
}

export interface CandidateTask {
    id: string;
    text: string;
    completed: boolean;
}

export interface EmailTemplate {
    id: string;
    name: string;
    subject: string;
    body: string; // Supports placeholders like {FirstName}
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
  rating?: number; // 1-5 stars (AI or Manual average)
  notes?: string;
  avatar?: string;
  
  // Advanced ATS features
  skills?: string[]; // Extracted from CV
  tags?: string[]; // New: Talent pooling tags
  matchScore?: number; // AI calculated 0-100
  aiReasoning?: { // NEW: Explanation of the match score
      pros: string[];
      cons: string[];
      summary?: string;
  };
  resumeUrl?: string; 
  coverLetter?: string;
  timeline: RecruitmentTimelineEvent[];
  scorecards: CandidateScorecard[];
  tasks?: CandidateTask[]; // New: To-do list for this candidate
}

// --- KNOWLEDGE BASE TYPES ---

export interface KnowledgeArticle {
  id: string;
  title: string;
  category: string; // e.g., 'Front Office', 'Veiligheid', 'IT', 'HR'
  content: string; // The full explanation/protocol
  tags: string[]; // For smart search
  
  authorName: string;
  authorRole: string;
  lastUpdated: string;
  
  // Visibility Logic
  allowedRoles: string[]; // e.g. ['Manager', 'Senior Medewerker'] or ['All']
  allowedDepartments: string[]; // e.g. ['Front Office'] or ['All']
  
  views: number;
  isPinned?: boolean; // Featured articles
  reviewDate?: string; // New: Reminder to update article
}

// --- BADGE SYSTEM TYPES ---

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
  assignedBy: string; // Name of manager
  assignedById: string; // ID of manager
  assignedAt: string; // Date string
}

// --- DEBT CONTROL TYPES ---

export type DebtorStatus = 'New' | '1st Reminder' | '2nd Reminder' | 'Final Notice' | 'Paid' | 'Blacklist';

export interface Debtor {
  id: string;
  reservationNumber: string; // The "Number" from export
  firstName: string;
  lastName: string; // Parsed from "Group name"
  email?: string; // New: Column E
  phone?: string; // New: Column F
  address: string;
  amount: number; // "Balance of companions"
  status: DebtorStatus;
  statusDate?: string; // New: When was the status last changed?
  lastUpdated: string;
  importedAt: string;
  isEnriched?: boolean; // New: Flag if address was auto-completed via API
}

export interface Notification {
  id: string;
  recipientId: string;
  senderName: string;
  type: 'Document' | 'Note' | 'System' | 'News' | 'Onboarding' | 'Survey' | 'Evaluation' | 'Evaluation' | 'Badge' | 'Knowledge' | 'Recruitment';
  title: string;
  message: string;
  date: string;
  read: boolean;
  isPinned?: boolean; // New: Pinned notifications stay at top until actioned
  targetView: ViewState;
  targetEmployeeId?: string; // If navigating to a specific dossier
  metaId?: string; // Generic ID for linking to specific items (e.g., surveyId)
}

export interface EmployeeDocument {
  id: string;
  name: string;
  type: 'PDF' | 'DOCX' | 'JPG' | 'XLSX';
  category: 'Contract' | 'Loonstrook' | 'Identificatie' | 'Overig';
  date: string;
  size: string;
  uploadedBy: string;
}

export interface EmployeeNote {
  id: string;
  author: string;
  date: string;
  category: 'General' | 'Performance' | 'Verzuim' | 'Gesprek' | 'Incident';
  title: string;
  content: string;
  visibleToEmployee: boolean; 
  // Performance System
  impact?: 'Positive' | 'Negative' | 'Neutral';
  score?: number; // 1 to 5 scale
  tags?: string[]; // e.g. "Hospitality", "Punctuality", "Teamwork"
}

export interface OnboardingTask {
  id: string;
  week: 1 | 2 | 3 | 4;
  category: string;
  title: string;
  description: string;
  completed: boolean;
  completedBy?: string;
  completedDate?: string;
  notes?: string; // New: specific note for this task
  notesVisibleToEmployee?: boolean; // New: control visibility of task note
  score?: number; // New: 0, 25, 50, 75, 100
}

export interface OnboardingTemplate {
  id: string;
  title: string;
  description?: string;
  role?: string; // Suggest for specific roles
  tasks: OnboardingTask[];
  createdAt: string;
}

export interface OnboardingWeekData {
    week: number;
    status: 'Locked' | 'Open' | 'Completed';
    managerNotes?: string; // New: General evaluation for the week
}

export interface OnboardingHistoryEntry {
    id: string;
    templateTitle: string;
    role: string;
    startDate: string;
    endDate: string;
    tasks: OnboardingTask[];
    weeks?: OnboardingWeekData[]; // Added: Store weekly summaries in history
    finalScore: number;
}

// --- EVALUATION SYSTEM TYPES ---

export type EvaluationStatus = 'Planned' | 'EmployeeInput' | 'ManagerInput' | 'Review' | 'Signed' | 'Archived';

export interface EvaluationScore {
    category: string; // e.g. "Front Office Skills"
    topic: string; // e.g. "IDu PMS Kennis"
    employeeScore: number; // 1-5
    managerScore: number; // 1-5
    employeeComment?: string;
    managerComment?: string;
}

export interface GoalReflection {
    id: string;
    date: string;
    content: string;
    author: string;
}

export interface InterimCheckIn {
    id: string;
    date: string; // Scheduled date
    completedDate?: string; // Actual completion date
    status: 'Planned' | 'Completed' | 'Skipped';
    score: number; // 0-100 progress at this check-in
    managerNotes?: string;
}

export interface TrajectoryResource {
    id: string;
    title: string;
    url: string;
    type: 'Link' | 'File';
}

export interface PersonalDevelopmentGoal {
    id: string;
    title: string;
    description: string;
    actionPlan: string; // The concrete "How to"
    category: string; // Hard skill, Soft skill, Leadership
    status: 'Not Started' | 'In Progress' | 'Completed';
    progress: number; // 0-100 (Calculated from latest check-in)
    startDate: string;
    deadline: string;
    linkedEvaluationId?: string;
    
    supportLevel?: 'Low' | 'Medium' | 'High'; // New: Intensity of guidance needed
    managementNotes?: string; // New: Internal notes for the manager about this trajectory
    
    budget?: {
        allocated: number;
        spent: number;
    };
    resources?: TrajectoryResource[];

    // Timeline / Check-ins
    checkIns: InterimCheckIn[]; 
    reflections: GoalReflection[];
    
    // For library usage
    isLibraryItem?: boolean;
}

export interface EvaluationGoal {
    id: string;
    title: string;
    description: string;
    deadline: string;
    status: 'Proposed' | 'Agreed' | 'Achieved' | 'Missed';
}

export interface EvaluationSignature {
    signedBy: string; // Name
    signedById: string; // ID
    signedAt: string; // Date
    role: 'Manager' | 'Employee';
}

export interface EvaluationCycle {
    id: string;
    employeeId: string;
    managerId: string;
    type: 'Month 1' | 'Month 3' | 'Annual' | 'Performance';
    status: EvaluationStatus;
    createdAt: string;
    completedAt?: string;
    
    // Qualitative Feedback
    employeeGeneralFeedback?: string; 
    employeeStruggles?: string; 
    employeeWins?: string; 
    
    managerGeneralFeedback?: string;
    managerStruggles?: string;
    managerWins?: string;
    
    privateManagerNotes?: string; // New: Manager only notes

    scores: EvaluationScore[];
    goals: EvaluationGoal[]; 
    signatures: EvaluationSignature[]; 
    
    overallRating?: number; // Calculated average
    smartAdvice?: string[]; 
    potential?: 'Low' | 'Medium' | 'High'; // New for 9-Box Grid
    
    // New: The specific development plan agreed upon in this cycle
    developmentPlan?: PersonalDevelopmentGoal[]; 
}

export interface Employee {
  id: string;
  name: string;
  role: string;
  departments: string[]; // Changed from single string to array
  avatar: string;
  banner?: string; // Custom profile banner
  email: string;
  phone: string;
  linkedin: string;
  hiredOn: string;
  employmentType: string;
  password?: string; // Added for authentication simulation
  
  // Account Status
  accountStatus?: 'Active' | 'Inactive' | 'Pending';

  // Permissions (New)
  customPermissions?: Permission[]; // Overrides role defaults

  // Onboarding Specifics
  mentor?: string; // Name of the buddy/mentor
  onboardingStatus?: 'Pending' | 'Active' | 'Completed' | 'Offboarding';
  onboardingWeeks?: OnboardingWeekData[]; // Store week-level metadata
  onboardingTasks: OnboardingTask[]; // New field for onboarding
  onboardingHistory?: OnboardingHistoryEntry[]; // Archived trajectories
  activeTemplateId?: string; // To track which template is currently active

  documents: EmployeeDocument[];
  notes: EmployeeNote[];
  
  evaluations?: EvaluationCycle[]; // New field for evaluations
  badges?: AssignedBadge[]; // New field for badges
  
  // New: Personal Growth Path
  growthGoals?: PersonalDevelopmentGoal[];
}

export interface HeadcountData {
  month: string;
  newHires: number;
  terminations: number;
  totalHeadcount: number;
  turnover?: number;
}

export interface NewsPost {
  id: string;
  authorName: string;
  authorAvatar: string;
  authorRole: string;
  date: string;
  title: string;
  shortDescription: string; // Text visible on the card
  content: string; // Full content visible in detail view
  image?: string; // Optional image URL
  likes: number;
  likedBy: string[]; // Array of employee IDs who liked this post
}

// --- SURVEY TYPES ---

export type SurveyTarget = 'All' | 'Managers' | 'Seniors' | 'Specific';
export type SurveyQuestionType = 'Rating' | 'Text' | 'Choice' | 'YesNo' | 'Scale10';

export interface SurveyQuestion {
  id: string;
  text: string;
  type: SurveyQuestionType;
  options?: string[]; // For multiple choice
  image?: string; // Optional custom background image for this question
}

export interface Survey {
  id: string;
  title: string;
  description: string; // Rich text description for the welcome screen
  coverImage?: string;
  questions: SurveyQuestion[];
  targetAudience: SurveyTarget;
  targetEmployeeIds?: string[]; // If Specific
  createdBy: string;
  createdAt: string;
  status: 'Draft' | 'Active' | 'Closed';
  responseCount: number;
  completedBy: string[]; // List of employee IDs who completed this survey
}

export interface SurveyResponse {
  id: string;
  surveyId: string;
  employeeId: string;
  answers: Record<string, string | number>; // questionId: answer
  completedAt: string;
}

// --- SYSTEM STATUS TYPES ---

export interface SystemUpdateLog {
  id: string;
  version: string;
  date: string;
  timestamp: string;
  author: string;
  type: 'Feature' | 'Bugfix' | 'Maintenance' | 'Security';
  impact: 'High' | 'Medium' | 'Low';
  affectedArea: string; // New field: Which part of the website is affected
  description: string;
  status: 'Success' | 'Pending' | 'Failed';
}