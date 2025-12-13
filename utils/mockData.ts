
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
    onboardingTasks: [],
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
    onboardingTasks: [],
    evaluations: []
  }
];

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
    readBy: ['2']
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
    matchScore: 0,
    skills: ['Horeca', 'Engels', 'Flexibel'],
    timeline: [
        { id: 't1', type: 'StatusChange', author: 'System', date: '15-10-2023', content: 'Sollicitatie ontvangen' },
        { id: 't2', type: 'Note', author: 'Lars Kohler', date: '16-10-2023', content: 'Goede eerste indruk, uitnodigen voor gesprek.' }
    ],
    scorecards: [],
    interviews: []
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
        title: 'Gastvrijheid Masterclass',
        description: 'De ultieme gids voor 5-sterren service bij Sanadome. Van lichaamstaal tot conflictbeheersing.',
        category: 'Gastvrijheid',
        coverImage: 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&w=1600&q=80',
        level: 'Beginner',
        targetRoles: ['All'],
        createdAt: '01-01-2023',
        author: 'Lars Kohler',
        isPublished: true,
        xpPoints: 500,
        modules: [
            {
                id: 'm1',
                title: 'De Basis van Service',
                lessons: [
                    {
                        id: 'l1',
                        title: 'Welkom bij Sanadome',
                        durationMinutes: 5,
                        blocks: [
                            {
                                id: 'b1',
                                type: 'text',
                                content: {
                                    html: '<p>Welkom bij de Sanadome Academy. In deze cursus leer je de fijne kneepjes van het vak.</p>',
                                    style: 'paragraph'
                                }
                            },
                            {
                                id: 'b2',
                                type: 'image',
                                content: {
                                    url: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1600&q=80',
                                    caption: 'Onze prachtige entree.'
                                }
                            },
                            {
                                id: 'b3',
                                type: 'time-capsule',
                                content: {
                                    question: 'Wat hoop je te leren van deze cursus en hoe denk je dit over 3 maanden toe te passen?'
                                }
                            }
                        ]
                    },
                    {
                        id: 'l2',
                        title: 'Lichaamstaal & Houding',
                        durationMinutes: 10,
                        blocks: [
                            {
                                id: 'b4',
                                type: 'video',
                                content: {
                                    url: 'https://www.youtube.com/embed/dQw4w9WgXcQ', // Placeholder
                                    source: 'youtube'
                                }
                            }
                        ]
                    }
                ]
            },
            {
                id: 'm2',
                title: 'Kennis Toetsing',
                lessons: [
                    {
                        id: 'q1',
                        title: 'Interactieve Oefeningen',
                        durationMinutes: 15,
                        blocks: [
                            {
                                id: 'bq2',
                                type: 'hotspot',
                                content: {
                                    imageUrl: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1600&q=80',
                                    spots: [
                                        { id: 'h1', x: 50, y: 50, title: 'Hoofdingang', description: 'Hier begroet je elke gast.' },
                                        { id: 'h2', x: 20, y: 80, title: 'Bagagekar', description: 'Voor VIP gasten.' }
                                    ]
                                }
                            }
                        ]
                    }
                ]
            }
        ]
    },
    {
        id: 'c2',
        title: 'BHV & Veiligheid',
        description: 'Procedures bij brand, ontruiming en medische noodgevallen.',
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
                        durationMinutes: 5,
                        blocks: [
                            {
                                id: 'b_fire_1',
                                type: 'text',
                                content: { html: 'Bel direct intern nummer **333** bij brand.', style: 'alert' }
                            }
                        ]
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
        status: 'In Progress',
        progressPercentage: 50,
        completedLessonIds: ['l1'],
        quizScores: {},
        timeCapsuleAnswers: {
            'b3': { before: 'Ik hoop beter te leren omgaan met lastige gasten.' }
        },
        startDate: '01-02-2023'
    }
];
