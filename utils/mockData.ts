
import { Employee, NewsPost, OnboardingTemplate, SystemUpdateLog, KnowledgeArticle, Applicant, Ticket, Vacancy, EvaluationTemplate, BikeSettings, BikeReservation, AcademyCourse, AcademyProgress } from '../types';

export const MOCK_EMPLOYEES: Employee[] = [
  {
    id: '1',
    name: 'Lars Kohler',
    role: 'Manager',
    departments: ['Management', 'Front Office'],
    email: 'lars.kohler@sanadome.nl',
    phone: '+31 6 1234 5678',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
    hiredOn: '01-01-2020',
    employmentType: 'Full-Time',
    accountStatus: 'Active',
    documents: [],
    notes: [],
    onboardingStatus: 'Completed',
    customPermissions: [],
    evaluations: []
  },
  {
    id: '2',
    name: 'Janique Vink',
    role: 'Senior Medewerker',
    departments: ['Front Office'],
    email: 'janique.vink@sanadome.nl',
    phone: '+31 6 8765 4321',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
    hiredOn: '15-03-2021',
    employmentType: 'Full-Time',
    accountStatus: 'Active',
    documents: [],
    notes: [],
    onboardingStatus: 'Completed',
    evaluations: []
  }
];

// ... existing mocks ...

export const MOCK_NEWS: NewsPost[] = [
  {
    id: '1',
    title: 'Zomerrooster 2023',
    shortDescription: 'Het nieuwe rooster voor de zomermaanden is beschikbaar.',
    content: 'Beste collega\'s, het zomerrooster staat online. Graag uiterlijk vrijdag je voorkeuren doorgeven.',
    authorName: 'Lars Kohler',
    authorRole: 'Manager',
    authorAvatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
    date: '12 Juni 2023',
    likes: 5,
    likedBy: ['2']
  }
];

export const MOCK_TEMPLATES: OnboardingTemplate[] = [
  {
    id: 't1',
    title: 'Standaard Front Office',
    description: 'Het standaard inwerktraject voor nieuwe receptionisten.',
    role: 'Medewerker',
    tasks: [
      { id: 't1-1', week: 1, category: 'Introductie', title: 'Rondleiding', description: 'Rondleiding door het hotel.', completed: false },
      { id: 't1-2', week: 1, category: 'IT', title: 'IDu PMS Uitleg', description: 'Basis training IDu PMS.', completed: false },
      { id: 't1-3', week: 2, category: 'Front Office', title: 'Check-in Procedure', description: 'Zelfstandig check-ins uitvoeren.', completed: false }
    ],
    createdAt: '01-01-2023'
  }
];

export const MOCK_SYSTEM_LOGS: SystemUpdateLog[] = [
  {
    id: 'log-1',
    version: 'v2.1.0',
    date: '20-10-2023',
    timestamp: '14:30',
    author: 'Dev Team',
    type: 'Feature',
    impact: 'Medium',
    affectedArea: 'Recruitment',
    description: 'Nieuwe recruitment module toegevoegd.',
    status: 'Success'
  }
];

export const MOCK_KNOWLEDGE_BASE: KnowledgeArticle[] = [
  {
    id: 'kb1',
    title: 'Kassa Afsluiting',
    category: 'Financieel',
    content: '## Stappenplan\n1. Tel de lade\n2. Print het Z-rapport\n3. Noteer verschillen in het logboek.',
    tags: ['kassa', 'geld', 'afsluiting'],
    authorName: 'Janique Vink',
    authorRole: 'Senior Medewerker',
    lastUpdated: '10-10-2023',
    allowedRoles: ['All'],
    allowedDepartments: ['Front Office', 'F&B'],
    views: 120,
    isPinned: true
  }
];

export const MOCK_APPLICANTS: Applicant[] = [
  {
    id: 'app1',
    firstName: 'Sophie',
    lastName: 'de Vries',
    email: 'sophie@example.com',
    phone: '0612345678',
    vacancyId: 'v1',
    stage: 'Interview 1',
    appliedDate: '15-10-2023',
    matchScore: 85,
    skills: ['Horeca', 'Engels', 'Flexibel'],
    timeline: [],
    scorecards: [],
    tasks: []
  }
];

export const MOCK_TICKETS: Ticket[] = [
  {
    id: 'tic1',
    title: 'Foutmelding bij inloggen',
    description: 'Ik krijg soms een 500 error als ik probeer in te loggen op mobiel.',
    type: 'Bug',
    priority: 'High',
    status: 'Open',
    submittedBy: 'Janique Vink',
    submittedById: '2',
    submittedAt: new Date().toISOString(),
    messages: []
  }
];

export const MOCK_VACANCIES: Vacancy[] = [
  {
    id: 'v1',
    title: 'Front Office Medewerker',
    department: 'Front Office',
    type: 'Full-Time',
    status: 'Open',
    applicantsCount: 5,
    postedDate: '01-10-2023'
  }
];

export const MOCK_EVALUATION_TEMPLATES: EvaluationTemplate[] = [
    {
        id: 'tpl-1',
        title: 'Kwartaal Evaluatie (Front Office)',
        description: 'Standaard evaluatie voor receptiemedewerkers.',
        createdAt: '01-01-2023',
        updatedAt: '01-01-2023',
        sections: [
            {
                id: 'sec-1',
                title: 'Operationele Vaardigheden',
                questions: [
                    { id: 'q1', text: 'MEWS PMS Kennis', description: 'Beheersing van het systeem.' },
                    { id: 'q2', text: 'Kassa & Financiën', description: 'Nauwkeurigheid bij afrekenen.' },
                    { id: 'q3', text: 'Check-in Flow', description: 'Snelheid en gastvrijheid.' }
                ]
            },
            {
                id: 'sec-2',
                title: 'Soft Skills',
                questions: [
                    { id: 'q4', text: 'Gastvrijheid', description: 'Algemene houding naar gasten.' },
                    { id: 'q5', text: 'Samenwerking', description: 'Communicatie met collega\'s.' },
                    { id: 'q6', text: 'Punctualiteit', description: 'Op tijd komen en afspraken nakomen.' }
                ]
            }
        ]
    },
    {
        id: 'tpl-2',
        title: 'Jaargesprek & Beoordeling',
        description: 'Uitgebreide jaarlijkse review.',
        createdAt: '01-01-2023',
        updatedAt: '01-01-2023',
        sections: [
            {
                id: 'sec-1',
                title: 'Competenties',
                questions: [
                    { id: 'q1', text: 'Vakkennis', description: '' },
                    { id: 'q2', text: 'Kwaliteit van werk', description: '' },
                    { id: 'q3', text: 'Productiviteit', description: '' },
                    { id: 'q4', text: 'Initiatief', description: '' }
                ]
            },
            {
                id: 'sec-2',
                title: 'Leiderschap (Indien van toepassing)',
                questions: [
                    { id: 'q5', text: 'Coaching', description: '' },
                    { id: 'q6', text: 'Delegeren', description: '' }
                ]
            }
        ]
    }
];

export const EVALUATION_TEMPLATES = {
    FRONT_OFFICE: [
        { category: 'Operationele Vaardigheden', topic: 'MEWS PMS Kennis', employeeScore: 0, managerScore: 0 },
        { category: 'Operationele Vaardigheden', topic: 'Kassa & Financiën', employeeScore: 0, managerScore: 0 },
        { category: 'Operationele Vaardigheden', topic: 'Check-in Flow', employeeScore: 0, managerScore: 0 },
        { category: 'Soft Skills', topic: 'Gastvrijheid', employeeScore: 0, managerScore: 0 },
        { category: 'Soft Skills', topic: 'Samenwerking', employeeScore: 0, managerScore: 0 },
        { category: 'Soft Skills', topic: 'Punctualiteit', employeeScore: 0, managerScore: 0 }
    ]
};

// --- BIKE RENTAL MOCKS ---
export const MOCK_BIKE_SETTINGS: BikeSettings = {
    inventory: {
        'City Bike Men': 4, // Matches H9-H12
        'City Bike Women': 6, // Matches D1-D6
        'E-Bike': 7 // Matches E401-E408 (skipping one maybe in list?)
    },
    inMaintenance: [],
    termsAndConditions: "1. De huurder is aansprakelijk voor schade aan de fiets.\n2. De fiets dient voor 22:00 uur ingeleverd te worden.\n3. Bij diefstal dient de huurder direct aangifte te doen en de sleutel te overhandigen.\n4. Het gebruik van de fiets is op eigen risico."
};

export const MOCK_BIKE_RESERVATIONS: BikeReservation[] = [
    {
        id: 'br1',
        guestName: 'Dhr. Jansen',
        roomNumber: '102',
        bikeType: 'City Bike Men',
        bikeId: 'H9',
        amount: 1,
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
        status: 'Active',
        termsAccepted: true,
        createdAt: new Date().toISOString(),
        createdBy: 'Lars Kohler'
    },
    {
        id: 'br2',
        guestName: 'Mw. de Vries',
        roomNumber: '205',
        bikeType: 'E-Bike',
        bikeId: 'E401',
        amount: 1,
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
        status: 'Completed',
        termsAccepted: true,
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        createdBy: 'Janique Vink'
    }
];

// --- ACADEMY MOCKS ---
export const MOCK_ACADEMY_COURSES: AcademyCourse[] = [
    {
        id: 'c1',
        title: 'Gastvrijheid Basis',
        description: 'De fundamentele principes van gastvrijheid bij Sanadome. Leer hoe je gasten begroet, helpt en een onvergetelijke ervaring biedt.',
        category: 'Gastvrijheid',
        coverImage: 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&w=1600&q=80',
        level: 'Beginner',
        targetRoles: ['All'],
        createdAt: '01-01-2023',
        author: 'Lars Kohler',
        isPublished: true,
        xpPoints: 150,
        modules: [
            {
                id: 'm1',
                title: 'Welkom & Houding',
                lessons: [
                    {
                        id: 'l1',
                        title: 'De Eerste Indruk',
                        blocks: [
                            {
                                id: 'b1',
                                type: 'text',
                                content: {
                                    html: '# De kracht van een glimlach\n\nEen eerste indruk maak je maar één keer. Zorg altijd voor:\n\n*   Oogcontact\n*   Een oprechte glimlach\n*   Een open houding\n\nBij Sanadome groeten we elke gast die we tegenkomen, ook in de gang.',
                                    style: 'paragraph'
                                }
                            }
                        ],
                        durationMinutes: 5
                    },
                    {
                        id: 'l2',
                        title: 'Kledij & Uiterlijk',
                        blocks: [
                            {
                                id: 'b2',
                                type: 'video',
                                content: {
                                    url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
                                    source: 'youtube'
                                }
                            }
                        ],
                        durationMinutes: 3
                    }
                ]
            },
            {
                id: 'm2',
                title: 'Toetsing',
                lessons: [
                    {
                        id: 'q1',
                        title: 'Eindtoets Module 1',
                        blocks: [
                            {
                                id: 'bq1',
                                type: 'text',
                                content: { html: 'Test je kennis over de basisprincipes.', style: 'paragraph' }
                            },
                            {
                                id: 'bq2',
                                type: 'quiz',
                                content: {
                                    question: 'Wat doe je als je een gast tegenkomt in de gang?',
                                    type: 'single',
                                    options: [
                                        { id: 'opt1', text: 'Je kijkt naar de grond', isCorrect: false },
                                        { id: 'opt2', text: 'Je groet de gast vriendelijk', isCorrect: true },
                                        { id: 'opt3', text: 'Je pakt je telefoon', isCorrect: false }
                                    ]
                                }
                            }
                        ],
                        durationMinutes: 10
                    }
                ]
            }
        ]
    },
    {
        id: 'c2',
        title: 'Veiligheid & Calamiteiten',
        description: 'Essentiële veiligheidsprocedures en wat te doen bij brand of ongevallen.',
        category: 'Veiligheid',
        coverImage: 'https://images.unsplash.com/photo-1582213782179-e0d53f98f2ca?auto=format&fit=crop&w=1600&q=80',
        level: 'Intermediate',
        prerequisiteCourseIds: ['c1'], 
        targetRoles: ['All'],
        createdAt: '01-02-2023',
        author: 'Security Team',
        isPublished: true,
        xpPoints: 200,
        modules: [
            {
                id: 'm1',
                title: 'Brandveiligheid',
                lessons: [
                    {
                        id: 'l1',
                        title: 'Brandmelding',
                        blocks: [
                            {
                                id: 'b_fire_1',
                                type: 'text',
                                content: { html: 'Bel direct intern nummer **333** bij brand.', style: 'alert' }
                            }
                        ],
                        durationMinutes: 5
                    }
                ]
            }
        ]
    }
];

export const MOCK_ACADEMY_PROGRESS: AcademyProgress[] = [
    {
        id: 'p1',
        employeeId: '2', // Janique
        courseId: 'c1',
        status: 'Completed',
        progressPercentage: 100,
        completedLessonIds: ['l1', 'l2', 'q1'],
        quizScores: { 'q1': 100 },
        startDate: '01-02-2023',
        completedDate: '02-02-2023'
    }
];
