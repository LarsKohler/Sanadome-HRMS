

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
  | 'MANAGE_DEBTORS'; // New: Access Debt Control

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
  'MANAGE_EVALUATIONS': 'Evaluaties Beheren',
  'MANAGE_DEBTORS': 'Debiteuren Beheer'
};

// --- DEBT CONTROL TYPES ---

export type DebtorStatus = 'New' | '1st Reminder' | '2nd Reminder' | 'Final Notice' | 'Paid' | 'Blacklist';

export interface Debtor {
  id: string;
  reservationNumber: string; // The "Number" from export
  firstName: string;
  lastName: string; // Parsed from "Group name"
  address: string;
  amount: number; // "Balance of companions"
  status: DebtorStatus;
  lastUpdated: string;
  importedAt: string;
}

export interface Notification {
  id: string;
  recipientId: string;
  senderName: string;
  type: 'LeaveRequest' | 'Document' | 'Note' | 'System' | 'News' | 'Onboarding' | 'Survey' | 'Evaluation';
  title: string;
  message: string;
  date: string;
  read: boolean;
  isPinned?: boolean; // New: Pinned notifications stay at top until actioned
  targetView: ViewState;
  targetEmployeeId?: string; // If navigating to a specific dossier
  metaId?: string; // Generic ID for linking to specific items (e.g., surveyId)
}

export interface LeaveRequest {
  id: string;
  type: 'Annual Leave' | 'Sick Leave' | 'Without Pay';
  startDate: string;
  endDate: string;
  amount: number;
  status: 'Approved' | 'Pending' | 'Rejected';
}

export interface LeaveBalance {
  type: 'Annual Leave' | 'Sick Leave' | 'Without Pay';
  entitled: number; // Total days allowed (e.g. 30)
  taken: number;    // Days already used
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

export type EvaluationStatus = 'Planned' | 'EmployeeInput' | 'ManagerInput' | 'Review' | 'Completed';

export interface EvaluationScore {
    category: string; // e.g. "Front Office Skills"
    topic: string; // e.g. "IDu PMS Kennis"
    employeeScore: number; // 1-5
    managerScore: number; // 1-5
    employeeComment?: string;
    managerComment?: string;
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

    scores: EvaluationScore[];
    goals: EvaluationGoal[]; // New: Future goals
    signatures: EvaluationSignature[]; // New: Digital signatures
    
    overallRating?: number; // Calculated average
    smartAdvice?: string[]; 
}

export interface Employee {
  id: string;
  name: string;
  role: string;
  department: string;
  location: string;
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

  leaveBalances: LeaveBalance[];
  leaveRequests: LeaveRequest[];
  documents: EmployeeDocument[];
  notes: EmployeeNote[];
  
  evaluations?: EvaluationCycle[]; // New field for evaluations
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