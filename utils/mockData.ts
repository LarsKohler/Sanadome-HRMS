












import { Employee, NewsPost, OnboardingTask, OnboardingTemplate, SystemUpdateLog, Ticket, BadgeDefinition, KnowledgeArticle, PersonalDevelopmentGoal, Vacancy, Applicant, EmailTemplate, TrainingModule } from '../types';

// --- TRAINING MOCK DATA ---
export const MOCK_TRAININGS: TrainingModule[] = [
    {
        id: 't-1',
        title: 'Brandveiligheid & Evacuatie',
        description: 'Jaarlijkse verplichte cursus over veiligheidsprocedures en evacuatieroutes.',
        category: 'Veiligheid',
        recurrence: 'Yearly',
        targetRoles: ['All'],
        createdAt: '2023-01-01',
        createdBy: 'Manager',
        coverImage: 'https://images.unsplash.com/photo-1565514020125-9c8cc641cc76?auto=format&fit=crop&w=800&q=80',
        steps: [
            {
                id: 's1',
                title: 'Introductie Brandveiligheid',
                type: 'Text',
                content: '## Belang van Brandveiligheid\nBrandveiligheid is cruciaal voor de veiligheid van onze gasten en medewerkers. In deze module leer je de basisprincipes van preventie en actie.\n\n### Doelen\n- Herkennen van brandgevaar\n- Weten wat te doen bij alarm\n- Locatie van blusmiddelen',
                durationMinutes: 2
            },
            {
                id: 's2',
                title: 'Evacuatieplan Video',
                type: 'Video',
                content: 'https://www.youtube.com/embed/dQw4w9WgXcQ', // Placeholder
                durationMinutes: 5
            },
            {
                id: 's3',
                title: 'Kennis Check',
                type: 'Quiz',
                durationMinutes: 3,
                quizData: [
                    { id: 'q1', question: 'Wat is het noodnummer intern?', options: ['112', '99', '1000'], correctOptionIndex: 1 },
                    { id: 'q2', question: 'Waar verzamelen we bij evacuatie?', options: ['Lobby', 'Parkeerplaats P3', 'In de keuken'], correctOptionIndex: 1 }
                ]
            }
        ]
    },
    {
        id: 't-2',
        title: 'Gastvrijheid & Etiquette',
        description: 'De Sanadome standaarden voor gastinteractie.',
        category: 'Hospitality',
        recurrence: 'None',
        targetRoles: ['All'],
        createdAt: '2023-02-15',
        createdBy: 'HR',
        coverImage: 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&w=800&q=80',
        steps: [
            {
                id: 's1',
                title: 'De 5 Gouden Regels',
                type: 'Text',
                content: '1. Begroet elke gast\n2. Maak oogcontact\n3. Glimlach\n4. Gebruik de naam van de gast indien bekend\n5. Bedank de gast bij vertrek',
                durationMinutes: 3
            },
            {
                id: 's2',
                title: 'Situatie Quiz',
                type: 'Quiz',
                durationMinutes: 2,
                quizData: [
                    { id: 'q1', question: 'Een gast klaagt over de soep. Wat doe je?', options: ['Zeggen dat de soep prima is', 'Luisteren, excuses aanbieden en oplossen (LEARN)', 'De manager roepen en weglopen'], correctOptionIndex: 1 }
                ]
            }
        ]
    }
];

// --- RECRUITMENT MOCK DATA ---
export const MOCK_VACANCIES: Vacancy[] = [
    {
        id: 'vac-1',
        title: 'Front Office Medewerker',
        department: 'Front Office',
        type: 'Full-Time',
        status: 'Open',
        applicantsCount: 3,
        postedDate: '01 Nov 2023',
        description: 'Wij zoeken een gastvrij talent voor onze receptie.',
        salaryRange: '€2.300 - €2.600',
        requirements: ['Ervaring met IDu PMS', 'Vloeiend Engels', 'Gastvrij']
    },
    {
        id: 'vac-2',
        title: 'Zelfstandig Werkend Kok',
        department: 'F&B',
        type: 'Full-Time',
        status: 'Open',
        applicantsCount: 1,
        postedDate: '15 Okt 2023',
        salaryRange: '€2.800 - €3.200',
        requirements: ['HACCP Kennis', 'Creatief', 'Teamplayer']
    },
    {
        id: 'vac-3',
        title: 'Stagiair Marketing',
        department: 'Management',
        type: 'Stage',
        status: 'Closed',
        applicantsCount: 12,
        postedDate: '01 Sep 2023'
    }
];

export const MOCK_EMAIL_TEMPLATES: EmailTemplate[] = [
    {
        id: 'tpl-1',
        name: 'Uitnodiging 1e Gesprek',
        subject: 'Uitnodiging sollicitatiegesprek bij Sanadome',
        body: 'Beste {FirstName},\n\nBedankt voor je interesse in de vacature. We waren onder de indruk van je profiel en willen je graag uitnodigen voor een kennismakingsgesprek.\n\nKun je aangeven welke momenten voor jou goed uitkomen volgende week?\n\nMet vriendelijke groet,\nRecruitment Team Sanadome'
    },
    {
        id: 'tpl-2',
        name: 'Afwijzing (Standaard)',
        subject: 'Update sollicitatie Sanadome',
        body: 'Beste {FirstName},\n\nHartelijk dank voor je interesse in Sanadome. Helaas hebben we besloten om met andere kandidaten verder te gaan die beter aansluiten bij het profiel.\n\nWe wensen je veel succes met je verdere zoektocht.\n\nMet vriendelijke groet,\nRecruitment Team'
    },
    {
        id: 'tpl-3',
        name: 'Aanbod / Contract',
        subject: 'Aanbod Sanadome',
        body: 'Beste {FirstName},\n\nWe hebben het gesprek als zeer positief ervaren en doen je hierbij graag een aanbod!\n\nIn de bijlage vind je het conceptcontract. Laat ons weten of je akkoord bent.\n\nGroet,\nHR Sanadome'
    }
];

export const MOCK_APPLICANTS: Applicant[] = [
    {
        id: 'app-1',
        vacancyId: 'vac-1',
        firstName: 'Sophie',
        lastName: 'de Vries',
        email: 'sophie.dv@email.com',
        phone: '0612345678',
        stage: 'Interview 1',
        appliedDate: '10 Nov 2023',
        rating: 4,
        notes: 'Ervaring bij Van der Valk. Spreekt goed Duits.',
        avatar: 'https://ui-avatars.com/api/?name=Sophie+de+Vries&background=random',
        matchScore: 85,
        skills: ['Engels', 'Duits', 'IDu PMS', 'Horeca'],
        tags: ['#HighPotential', '#DuitsSprekend'],
        tasks: [
            { id: 't1', text: 'Referentie checken bij vorige werkgever', completed: false },
            { id: 't2', text: 'ID kaart controleren', completed: false }
        ],
        timeline: [
            { id: 't1', type: 'StatusChange', author: 'System', date: '10 Nov 2023 09:00', content: 'Sollicitatie ontvangen' },
            { id: 't2', type: 'Note', author: 'Manager', date: '11 Nov 2023 10:30', content: 'Goede ervaring, uitnodigen voor gesprek.' },
            { id: 't3', type: 'Email', author: 'Recruiter', date: '11 Nov 2023 11:00', content: 'Uitnodiging verstuurd voor 15 nov.' },
            { id: 't4', type: 'Interview', author: 'Manager', date: '15 Nov 2023 14:00', content: 'Gesprek gevoerd. Positieve indruk.' }
        ],
        scorecards: [
            { id: 'sc1', interviewer: 'Manager', date: '15 Nov 2023', skills: [{name: 'Communicatie', score: 5}, {name: 'Ervaring', score: 4}], notes: 'Sterke kandidaat.', recommendation: 'Hire' }
        ]
    },
    {
        id: 'app-2',
        vacancyId: 'vac-1',
        firstName: 'Tom',
        lastName: 'Jansen',
        email: 'tom.jansen@email.com',
        phone: '0687654321',
        stage: 'New',
        appliedDate: '14 Nov 2023',
        rating: 0,
        avatar: 'https://ui-avatars.com/api/?name=Tom+Jansen&background=random',
        matchScore: 45,
        skills: ['Engels', 'Retail'],
        tags: [],
        tasks: [],
        timeline: [
            { id: 't1', type: 'StatusChange', author: 'System', date: '14 Nov 2023 15:00', content: 'Sollicitatie ontvangen' }
        ],
        scorecards: []
    },
    {
        id: 'app-3',
        vacancyId: 'vac-1',
        firstName: 'Lisa',
        lastName: 'Bakker',
        email: 'lisa.b@email.com',
        phone: '0655443322',
        stage: 'Offer',
        appliedDate: '05 Nov 2023',
        rating: 5,
        notes: 'Top kandidaat! Aanbod verstuurd op 15-11.',
        avatar: 'https://ui-avatars.com/api/?name=Lisa+Bakker&background=random',
        matchScore: 95,
        skills: ['Engels', 'Duits', 'Frans', 'Receptie', 'Leiderschap'],
        tags: ['#Topper', '#PerDirect'],
        tasks: [
            { id: 't1', text: 'Contract opstellen', completed: true },
            { id: 't2', text: 'Kledingmaten opvragen', completed: false }
        ],
        timeline: [
            { id: 't1', type: 'StatusChange', author: 'System', date: '05 Nov 2023 09:00', content: 'Sollicitatie ontvangen' },
            { id: 't2', type: 'Interview', author: 'Manager', date: '08 Nov 2023 10:00', content: 'Eerste gesprek: Uitstekend.' },
            { id: 't3', type: 'Interview', author: 'HR', date: '12 Nov 2023 14:00', content: 'Tweede gesprek: Culture fit is perfect.' },
            { id: 't4', type: 'StatusChange', author: 'Manager', date: '15 Nov 2023 16:00', content: 'Status gewijzigd naar Offer' }
        ],
        scorecards: [
            { id: 'sc1', interviewer: 'Manager', date: '08 Nov 2023', skills: [{name: 'Vakkennis', score: 5}], notes: 'Weet alles al.', recommendation: 'Hire' }
        ]
    },
    {
        id: 'app-4',
        vacancyId: 'vac-2',
        firstName: 'Mehmet',
        lastName: 'Yilmaz',
        email: 'm.yilmaz@email.com',
        phone: '0699887766',
        stage: 'Screening',
        appliedDate: '12 Nov 2023',
        rating: 3,
        avatar: 'https://ui-avatars.com/api/?name=Mehmet+Yilmaz&background=random',
        matchScore: 60,
        skills: ['Koken', 'HACCP'],
        tags: ['#Keuken'],
        tasks: [],
        timeline: [
            { id: 't1', type: 'StatusChange', author: 'System', date: '12 Nov 2023 11:00', content: 'Sollicitatie ontvangen' }
        ],
        scorecards: []
    }
];

// ... (Rest of file unchanged)
export const MOCK_DEVELOPMENT_LIBRARY: PersonalDevelopmentGoal[] = [
    {
        id: 'lib-1',
        title: 'Masterclass Upselling',
        category: 'Sales & Revenue',
        description: 'Verhogen van de gemiddelde besteding per gast door effectieve verkooptechnieken.',
        actionPlan: '1. Volg de online module "Upselling at Check-in".\n2. Pas de "Top-Down" methode toe bij 5 gasten per dienst.\n3. Evalueer wekelijks de upsell cijfers met de supervisor.',
        status: 'Not Started',
        progress: 0,
        startDate: '',
        deadline: '',
        reflections: [],
        checkIns: [],
        isLibraryItem: true
    },
    {
        id: 'lib-2',
        title: 'MEWS Advanced User',
        category: 'Technische Vaardigheden',
        description: 'Diepgaande kennis van het PMS systeem om fouten te verminderen en snelheid te verhogen.',
        actionPlan: '1. Leer alle sneltoetsen uit het hoofd.\n2. Bestudeer de rapportage functies (Manager Report).\n3. Geef een mini-training aan een nieuwe collega.',
        status: 'Not Started',
        progress: 0,
        startDate: '',
        deadline: '',
        reflections: [],
        checkIns: [],
        isLibraryItem: true
    },
    {
        id: 'lib-3',
        title: 'Leiderschap: Feedback Geven',
        category: 'Leiderschap',
        description: 'Effectief en constructief feedback geven aan teamleden zonder de relatie te schaden.',
        actionPlan: '1. Lees het document "De 4 G\'s van Feedback".\n2. Oefen het geven van 1 compliment en 1 ontwikkelpunt per dienst.\n3. Vraag na 2 weken feedback aan het team over jouw stijl.',
        status: 'Not Started',
        progress: 0,
        startDate: '',
        deadline: '',
        reflections: [],
        checkIns: [],
        isLibraryItem: true
    },
    {
        id: 'lib-4',
        title: 'Stressbestendigheid & Piekmomenten',
        category: 'Persoonlijke Effectiviteit',
        description: 'Kalm en georganiseerd blijven tijdens drukke check-in/out momenten.',
        actionPlan: '1. Maak een stappenplan voor "Ritsen" tijdens drukte.\n2. Focus op één gast tegelijk, laat je niet afleiden door de rij.\n3. Ademhalingstechnieken toepassen tussen interacties door.',
        status: 'Not Started',
        progress: 0,
        startDate: '',
        deadline: '',
        reflections: [],
        checkIns: [],
        isLibraryItem: true
    },
    {
        id: 'lib-5',
        title: 'Engelse Conversatie (Zakelijk)',
        category: 'Communicatie',
        description: 'Professionaliseren van Engels taalgebruik richting internationale zakelijke gasten.',
        actionPlan: '1. Leer de standaard woordenlijst "Business Hotel English".\n2. Oefen telefoongesprekken met een senior collega.\n3. Voer minstens 3 volledige check-ins in het Engels uit zonder hulp.',
        status: 'Not Started',
        progress: 0,
        startDate: '',
        deadline: '',
        reflections: [],
        checkIns: [],
        isLibraryItem: true
    },
    {
        id: 'lib-6',
        title: 'Klachtafhandeling: Van Klacht naar Fan',
        category: 'Gastvrijheid',
        description: 'Klachten zelfstandig oplossen en ombuigen naar een positieve ervaring.',
        actionPlan: '1. Pas de LEARN-methode toe (Listen, Empathize, Apologize, React, Notify).\n2. Krijg mandaat voor kleine compensaties (drankje/upgrade).\n3. Documenteer 3 casussen in het ticketsysteem ter evaluatie.',
        status: 'Not Started',
        progress: 0,
        startDate: '',
        deadline: '',
        reflections: [],
        checkIns: [],
        isLibraryItem: true
    }
];

// --- MOCK BADGES ---
export const MOCK_BADGES: BadgeDefinition[] = [
    { id: 'b1', name: 'Super Start', description: 'Voltooide de onboarding binnen 2 weken met 100% score.', icon: 'Rocket', color: 'blue', createdAt: '2023-01-01' },
    { id: 'b2', name: 'Klantheld', description: 'Ging boven en buiten verwachting voor een gast.', icon: 'Heart', color: 'red', createdAt: '2023-01-01' },
    { id: 'b3', name: 'Team Player', description: 'Altijd bereid om een dienst over te nemen.', icon: 'Users', color: 'green', createdAt: '2023-01-01' }, 
    { id: 'b4', name: 'Sales Tijger', description: 'Hoogste upsell percentage van de maand.', icon: 'Trophy', color: 'yellow', createdAt: '2023-01-01' },
    { id: 'b5', name: 'Scherp Oog', description: 'Ontdekte een kritieke fout in een boeking.', icon: 'Eye', color: 'purple', createdAt: '2023-01-01' },
    { id: 'b6', name: 'Probleemoplosser', description: 'Heeft zelfstandig een complex gastprobleem opgelost.', icon: 'Zap', color: 'orange', createdAt: '2023-01-01' }
];

// --- MOCK KNOWLEDGE BASE ---
export const MOCK_KNOWLEDGE_BASE: KnowledgeArticle[] = [
    // ... (Keep existing articles)
];

// --- MOCK TICKETS ---
export const MOCK_TICKETS: Ticket[] = [
    // ... (Keep existing tickets)
];

// --- AUTO UPDATE LOGGER ---
export const LATEST_SYSTEM_UPDATE: SystemUpdateLog = {
    id: 'update-v4.4.0-academy', 
    version: 'v4.4.0',
    date: new Date().toLocaleDateString('nl-NL', { day: '2-digit', month: 'short', year: 'numeric' }),
    timestamp: new Date().toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' }),
    author: 'AI Assistant',
    type: 'Feature',
    impact: 'High',
    affectedArea: 'Academy',
    description: `
- Nieuwe module: Sanadome Academy.
- Managers kunnen interactieve trainingen maken (video, quiz).
- Automatische toewijzing en herhaling van compliance trainingen (bv. Brandveiligheid).`,
    status: 'Success'
};

// ... (Previous imports and helper functions remain, but keeping file concise)
const generateOnboardingTasks = (): OnboardingTask[] => [
  // ... (Keep existing tasks)
];

export const MOCK_TEMPLATES: OnboardingTemplate[] = [
    // ... (Keep existing templates)
    {
        id: 'template-basis',
        title: 'Sanadome Basis (Front Office)',
        description: 'Standaard inwerktraject voor nieuwe receptiemedewerkers.',
        role: 'Medewerker',
        createdAt: '2023-01-01',
        tasks: [] // Simplification for brevity, assume filled
    },
];

export const EVALUATION_TEMPLATES = {
    FRONT_OFFICE: [
        { category: 'Hard Skills', topic: 'MEWS PMS Kennis' },
        { category: 'Hard Skills', topic: 'Kassa & Financiën' },
        { category: 'Hard Skills', topic: 'Reserveringen Invoeren' },
        { category: 'Front Office', topic: 'Check-in Flow' },
        { category: 'Front Office', topic: 'Upselling & Sales' },
        { category: 'Front Office', topic: 'Klachtafhandeling' },
        { category: 'Soft Skills', topic: 'Gastvrijheid' },
        { category: 'Soft Skills', topic: 'Samenwerking' },
        { category: 'Soft Skills', topic: 'Punctualiteit' },
    ]
};

export const MOCK_SYSTEM_LOGS: SystemUpdateLog[] = [
    // ... (Keep existing logs)
];

export const MOCK_NEWS: NewsPost[] = [
  // ... (Keep existing news)
];

export const MOCK_EMPLOYEES: Employee[] = [
  // ... (Keep existing employees)
];