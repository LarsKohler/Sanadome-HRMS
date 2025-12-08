
export enum ViewState {
  HOME = 'HOME',
  DIRECTORY = 'DIRECTORY',
  PROFILE = 'PROFILE',
  DOCUMENTS = 'DOCUMENTS',
  NEWS = 'NEWS',
  ONBOARDING = 'ONBOARDING',
  REPORTS = 'REPORTS',
  SYSTEM_STATUS = 'SYSTEM_STATUS',
  SETTINGS = 'SETTINGS',
  DEBT_CONTROL = 'DEBT_CONTROL',
  LINEN_AUDIT = 'LINEN_AUDIT',
  KNOWLEDGE_BASE = 'KNOWLEDGE_BASE',
  EVALUATIONS = 'EVALUATIONS',
  RECRUITMENT = 'RECRUITMENT',
  BIKE_RENTAL = 'BIKE_RENTAL',
  ACADEMY = 'ACADEMY'
}

export type Permission = 
  | 'VIEW_REPORTS'
  | 'MANAGE_EMPLOYEES'
  | 'MANAGE_DOCUMENTS'
  | 'VIEW_ALL_DOCUMENTS'
  | 'CREATE_NEWS'
  | 'MANAGE_ONBOARDING'
  | 'VIEW_SYSTEM_STATUS'
  | 'MANAGE_SETTINGS'
  | 'MANAGE_EVALUATIONS'
  | 'MANAGE_DEBTORS'
  | 'MANAGE_RECRUITMENT'
  | 'VIEW_CALENDAR'
  | 'MANAGE_CASES'
  | 'MANAGE_KNOWLEDGE'
  | 'MANAGE_OPERATIONS'
  | 'MANAGE_TICKETS'
  | 'MANAGE_RENTALS'
  | 'MANAGE_ACADEMY';

export const PERMISSION_LABELS: Record<Permission, string> = {
  'VIEW_REPORTS': 'Rapportages Inzien',
  'MANAGE_EMPLOYEES': 'Medewerkers Beheren',
  'MANAGE_DOCUMENTS': 'Documenten Beheren',
  'VIEW_ALL_DOCUMENTS': 'Alle Documenten Inzien',
  'CREATE_NEWS': 'Nieuws Plaatsen',
  'MANAGE_ONBOARDING': 'Onboarding Beheren',
  'VIEW_SYSTEM_STATUS': 'Systeemstatus Inzien',
  'MANAGE_SETTINGS': 'Instellingen Beheren',
  'MANAGE_EVALUATIONS': 'Evaluaties Beheren',
  'MANAGE_DEBTORS': 'Debiteuren Beheren',
  'MANAGE_RECRUITMENT': 'Recruitment Beheren',
  'VIEW_CALENDAR': 'Kalender Inzien',
  'MANAGE_CASES': 'Cases Beheren',
  'MANAGE_KNOWLEDGE': 'Kennisbank Beheren',
  'MANAGE_OPERATIONS': 'Operations Beheren',
  'MANAGE_TICKETS': 'Tickets Beheren',
  'MANAGE_RENTALS': 'Fietsverhuur Beheren',
  'MANAGE_ACADEMY': 'Academy Beheren'
};

// --- ACADEMY / LMS (SANABUILDER ENGINE) ---

export type BlockType = 
  // Content & Media
  | 'text' 
  | 'video' 
  | 'audio' 
  | 'pdf' 
  | 'embed'
  // Interaction
  | 'accordion' 
  | 'hotspot' 
  | 'flashcard' 
  | 'timeline' 
  | 'tabs' 
  | 'beforeAfter'
  // Scenario
  | 'scenario' 
  | 'simulation'
  // Assessment
  | 'quiz' 
  | 'ordering' 
  | 'matching' 
  | 'fillBlanks' 
  | 'videoAssignment';

// Base Block Interface
export interface LearningBlock {
    id: string;
    type: BlockType;
    content: any; // Flexible JSON structure depending on type
    settings?: any; // Specific settings like autoplay, passing score etc.
}

// Specific Content Structures (for type safety where needed)
export interface TextBlockContent {
    html: string;
    style: 'paragraph' | 'h1' | 'h2' | 'quote' | 'alert' | 'tip';
}

export interface VideoBlockContent {
    url: string;
    source: 'youtube' | 'vimeo' | 'upload';
    stops?: Array<{ time: number; question: string; }>; // Pause & Ask feature
}

export interface HotspotBlockContent {
    imageUrl: string;
    spots: Array<{ id: string; x: number; y: number; title: string; text: string }>;
}

export interface FlashcardBlockContent {
    cards: Array<{ id: string; front: string; back: string }>;
}

export interface QuizBlockContent {
    question: string;
    type: 'single' | 'multiple';
    options: Array<{ id: string; text: string; isCorrect: boolean }>;
    feedback?: string;
}

export interface ScenarioBlockContent {
    startNodeId: string;
    nodes: Array<{
        id: string;
        text: string; // The situation
        mediaUrl?: string; // Video/Image for situation
        options: Array<{
            text: string;
            nextNodeId: string; // ID or 'END_SUCCESS' / 'END_FAIL'
            feedback?: string;
        }>;
    }>;
}

// Academy Data Structures
export interface AcademyLesson {
    id: string;
    title: string;
    blocks: LearningBlock[]; // The new flexible content structure
    durationMinutes: number;
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
    level: 'Beginner' | 'Intermediate' | 'Advanced';
    modules: AcademyModule[];
    targetRoles: string[]; 
    createdAt: string;
    author: string;
    isPublished: boolean;
    xpPoints?: number;
    estimatedTime?: string;
}

export interface AcademyProgress {
    id: string;
    employeeId: string;
    courseId: string;
    status: 'Not Started' | 'In Progress' | 'Completed';
    progressPercentage: number;
    completedLessonIds: string[];
    quizScores: Record<string, number>; 
    startDate?: string;
    completedDate?: string;
    lastAccessedAt?: string;
}

// ... existing types ...

// --- BIKE RENTAL ---
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
    signatureUrl?: string; 
    termsAccepted: boolean;
    createdAt: string;
    createdBy: string;
    damageReport?: string; 
}

export interface BikeSettings {
    inventory: Record<BikeType, number>; 
    inMaintenance: string[]; 
    termsAndConditions: string;
    maintenanceReasons?: Record<string, string>; 
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

// --- BADGES ---
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

export interface EmployeeNote {
  id: string;
  title: string;
  category: 'General' | 'Performance' | 'Verzuim' | 'Gesprek' | 'Incident';
  content: string;
  date: string;
  author: string;
  visibleToEmployee: boolean;
  impact: 'Positive' | 'Negative' | 'Neutral';
  score: number;
}

export interface EmployeeDocument {
  id: string;
  name: string;
  type: string;
  category: 'Contract' | 'Loonstrook' | 'Identificatie' | 'Overig';
  date: string;
  size: string;
  uploadedBy: string;
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
}

export interface OnboardingWeekData {
    week: number;
    managerNotes: string;
    status: 'Open' | 'Completed';
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
  phone: string;
  avatar: string;
  linkedin?: string;
  hiredOn: string;
  employmentType: 'Full-Time' | 'Part-Time' | 'Contract';
  accountStatus: 'Active' | 'Pending' | 'Inactive';
  password?: string;
  
  documents?: EmployeeDocument[];
  notes?: EmployeeNote[];
  
  // Onboarding
  onboardingStatus?: 'Active' | 'Pending' | 'Completed';
  onboardingTasks?: OnboardingTask[];
  onboardingWeeks?: OnboardingWeekData[];
  onboardingHistory?: OnboardingHistoryEntry[];
  activeTemplateId?: string;
  mentor?: string;

  // Evaluations
  evaluations?: EvaluationCycle[];
  growthGoals?: PersonalDevelopmentGoal[];

  // Permissions
  customPermissions?: Permission[];

  // Badges
  badges?: AssignedBadge[];
  
  // Gamification
  xpPoints?: number;
  level?: number;
}

export interface Notification {
  id: string;
  recipientId: string;
  senderName: string;
  type: 'Note' | 'Document' | 'Onboarding' | 'Evaluation' | 'System' | 'Badge';
  title: string;
  message: string;
  date: string;
  read: boolean;
  targetView?: ViewState;
  targetEmployeeId?: string;
  metaId?: string;
  isPinned?: boolean;
}

export interface NewsPost {
  id: string;
  authorName: string;
  authorAvatar: string;
  authorRole: string;
  date: string;
  title: string;
  shortDescription: string;
  content: string;
  image?: string;
  likes: number;
  likedBy: string[];
}

// --- ONBOARDING TEMPLATES ---
export interface OnboardingTemplate {
    id: string;
    title: string;
    description: string;
    role?: string; // Target role
    tasks: OnboardingTask[];
    createdAt: string;
}

// --- EVALUATIONS ---
export type EvaluationStatus = 'Planned' | 'EmployeeInput' | 'ManagerInput' | 'Review' | 'Signed' | 'Archived';

// NEW: Evaluation Template Structure
export interface EvaluationTemplateSection {
    id: string;
    title: string;
    description?: string;
    questions: { id: string; text: string; description?: string }[];
}

export interface EvaluationTemplate {
    id: string;
    title: string;
    description: string;
    sections: EvaluationTemplateSection[];
    createdAt: string;
    updatedAt: string;
}

export interface EvaluationScore {
    category: string;
    topic: string;
    employeeScore: number;
    managerScore: number;
    employeeComment?: string;
    managerComment?: string;
}

export interface EvaluationGoal {
    id: string;
    description: string;
}

export interface EvaluationSignature {
    signedBy: string;
    signedById: string;
    signedAt: string;
    role: 'Manager' | 'Employee';
}

export interface InterimCheckIn {
    id: string;
    date: string;
    status: 'Planned' | 'Completed' | 'Skipped';
    score: number;
    managerNotes?: string;
    completedDate?: string;
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
    category: string;
    description: string;
    actionPlan: string;
    status: 'Not Started' | 'In Progress' | 'Completed';
    progress: number;
    startDate: string;
    deadline: string;
    
    // Evaluation Link
    linkedEvaluationId?: string;
    
    // New fields for Trajectory Management
    supportLevel?: 'Low' | 'Medium' | 'High';
    reflections: { id: string; date: string; content: string; author: string }[];
    checkIns: InterimCheckIn[];
    
    // Library
    isLibraryItem?: boolean;

    // Advanced Trajectory Management
    resources?: TrajectoryResource[];
    budget?: { allocated: number; spent: number };
    managementNotes?: string;
}

export interface EvaluationCycle {
    id: string;
    employeeId: string;
    managerId: string;
    type: string; // Changed from literal to string to support custom templates
    templateId?: string; // Reference to the template used
    status: EvaluationStatus;
    createdAt: string;
    plannedDate?: string; 
    completedAt?: string;
    
    // Qualitative Feedback
    employeeGeneralFeedback?: string; 
    employeeStruggles?: string; 
    employeeWins?: string; 
    
    managerGeneralFeedback?: string;
    managerStruggles?: string;
    managerWins?: string;
    
    privateManagerNotes?: string; 

    scores: EvaluationScore[];
    goals: EvaluationGoal[]; 
    signatures: EvaluationSignature[]; 
    
    overallRating?: number; 
    smartAdvice?: string[]; 
    potential?: 'Low' | 'Medium' | 'High'; 
    
    developmentPlan?: PersonalDevelopmentGoal[]; 
}

// --- SYSTEM ---
export interface SystemUpdateLog {
    id: string;
    version: string;
    date: string;
    timestamp?: string;
    author: string;
    type: 'Feature' | 'Bugfix' | 'Maintenance' | 'Security';
    impact: 'High' | 'Medium' | 'Low';
    affectedArea: string;
    description: string;
    status: 'Success' | 'Pending' | 'Failed';
}

// --- DEBTORS ---
export type DebtorStatus = 'New' | '1st Reminder' | '2nd Reminder' | 'Final Notice' | 'Paid' | 'Blacklist';

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
    statusDate: string; // ISO String
    lastUpdated: string; // ISO String
    importedAt: string;
    isEnriched?: boolean;
}

// --- KNOWLEDGE BASE ---
export interface KnowledgeArticle {
    id: string;
    title: string;
    category: string;
    content: string; // Markdown
    tags: string[];
    authorName: string;
    authorRole: string;
    lastUpdated: string;
    allowedRoles: string[]; // ['All'] or specific roles
    allowedDepartments: string[]; // ['All'] or specific depts
    views: number;
    isPinned: boolean;
    reviewDate?: string;
}

// --- TICKETS ---
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
    status: TicketStatus;
    page?: string;
    submittedBy: string;
    submittedById: string;
    submittedAt: string;
    resolvedAt?: string;
    messages: TicketMessage[];
}

// --- RECRUITMENT ---
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
    interviewer: string;
    date: string;
    skills: { name: string; score: number }[];
    notes: string;
    recommendation: 'Hire' | 'No Hire' | 'Maybe';
}

export interface CandidateTask {
    id: string;
    text: string;
    completed: boolean;
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
    rating?: number; // 1-5 stars
    matchScore?: number; // AI Score
    skills?: string[];
    tags?: string[];
    notes?: string;
    avatar?: string;
    resumeUrl?: string;
    
    // AI Analysis
    aiReasoning?: {
        pros: string[];
        cons: string[];
        summary: string;
    };

    // Extended
    timeline: RecruitmentTimelineEvent[];
    scorecards: CandidateScorecard[];
    tasks: CandidateTask[];
}

export interface Vacancy {
    id: string;
    title: string;
    department: string;
    type: 'Full-Time' | 'Part-Time' | 'Stage' | 'Oproep';
    status: 'Open' | 'Closed' | 'Draft';
    applicantsCount: number;
    postedDate: string;
    description?: string;
    salaryRange?: string;
    requirements?: string[];
}

export interface EmailTemplate {
    id: string;
    name: string;
    subject: string;
    body: string;
}
