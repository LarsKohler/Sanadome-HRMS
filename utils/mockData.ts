
import { Employee, NewsPost, OnboardingTask, EvaluationCycle, KnowledgeArticle, ViewState, ShopItem } from '../types';

// ... (Previous imports and helper functions remain, but keeping file concise)
const generateOnboardingTasks = (): OnboardingTask[] => [
  // WEEK 1: Introductie & Basis
  { id: 'w1-1', week: 1, category: 'Introductie', title: 'Rondleiding Hotel & Spa', description: 'Volledige rondleiding door hotelkamers, spa faciliteiten, restaurants en back-of-house.', completed: false, score: 0 },
  { id: 'w1-2', week: 1, category: 'Facilitair', title: 'Uniform & Lockers', description: 'Uitgifte uniform, naambadge en toewijzing locker en kleedruimte.', completed: false, score: 0 },
  { id: 'w1-3', week: 1, category: 'IT & Systemen', title: 'IDu PMS Training (Basis)', description: 'Aanmaken account, basisnavigatie in IDu en uitleg dashboard.', completed: false, score: 0 },
  { id: 'w1-4', week: 1, category: 'Safety', title: 'Sleutelbeheer & BHV', description: 'Procedure sleutelkaarten aanmaken en noodprocedures doornemen.', completed: false, score: 0 },
  { id: 'w1-5', week: 1, category: 'Front Office', title: 'Kassa procedure', description: 'Openen en sluiten van de kassa, omgaan met contant geld en pinautomaat.', completed: false, score: 0 },

  // WEEK 2: Gastencontact & Check-in
  { id: 'w2-1', week: 2, category: 'Front Office', title: 'Check-in Procedure', description: 'Gasten ontvangen, ID controle, registratieformulier en kamerkaart uitgifte.', completed: false, score: 0 },
  { id: 'w2-2', week: 2, category: 'Communicatie', title: 'Telefoon Etiquette', description: 'Standaard aanname telefoon, doorverbinden en berichten noteren.', completed: false, score: 0 },
  { id: 'w2-3', week: 2, category: 'Service', title: 'Klachtenbehandeling (Level 1)', description: 'Basis omgaan met feedback en wanneer te escaleren naar Senior.', completed: false, score: 0 },
  { id: 'w2-4', week: 2, category: 'Sales', title: 'Arrangementen Kennis', description: 'Kennis van alle lopende arrangementen (Wellness, Diner, Overnachting).', completed: false, score: 0 },

  // WEEK 3: Verdieping & Check-out
  { id: 'w3-1', week: 3, category: 'Front Office', title: 'Check-out Procedure', description: 'Rekening splitsen, betalingen verwerken en factuur opmaken.', completed: false, score: 0 },
  { id: 'w3-2', week: 3, category: 'Admin', title: 'Facturatie Zakelijk', description: 'Facturen opmaken voor zakelijke gasten en debiteurenbeheer basis.', completed: false, score: 0 },
  { id: 'w3-3', week: 3, category: 'Reserveringen', title: 'Reserveringen Invoeren', description: 'Telefonische reservering aannemen en doorgeven aan keuken.', completed: false, score: 0 },
  { id: 'w3-4', week: 3, category: 'F&B', title: 'Room Service Procedures', description: 'Room service bestellingen aannemen en doorgeven aan keuken.', completed: false, score: 0 },

  // WEEK 4: Zelfstandigheid & Afronding
  { id: 'w4-1', week: 4, category: 'Front Office', title: 'Nachtdienst Procedures (Basis)', description: 'Begrijpen wat de nachtportier doet en overdracht procedures.', completed: false, score: 0 },
  { id: 'w4-2', week: 4, category: 'Sales', title: 'Upsell Training', description: 'Training in upselling van kamertypes en spa behandelingen bij check-in.', completed: false, score: 0 },
  { id: 'w4-3', week: 4, category: 'HR', title: 'Evaluatiegesprek Maand 1', description: 'Voortgangsgesprek met Front Office Manager.', completed: false, score: 0 },
  { id: 'w4-4', week: 4, category: 'Praktijk', title: 'Zelfstandig Draaien', description: 'Een volledige shift draaien onder supervisie op afstand.', completed: false, score: 0 },
];

export const EVALUATION_TEMPLATES = {
    FRONT_OFFICE: [
        { category: 'Hard Skills', topic: 'IDu PMS Kennis' },
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

export const MOCK_NEWS: NewsPost[] = [
  {
    id: 'news-1',
    authorName: 'Dennis de Manager',
    authorAvatar: 'https://ui-avatars.com/api/?name=Dennis+Manager&background=0d9488&color=fff',
    authorRole: 'Manager',
    date: '20 Okt 2023',
    title: 'Welkom bij het nieuwe portaal!',
    shortDescription: 'We zijn live! Lees alles over de nieuwe functies van Mijn Sanadome.',
    content: 'Welkom allemaal in ons nieuwe "Mijn Sanadome" HR systeem.\n\nWe hebben hard gewerkt om alles zo gebruiksvriendelijk mogelijk te maken. Je kunt nu zelf je verlof aanvragen, je dossier inzien en eenvoudig contact opnemen met collega\'s via de directory.\n\n**Wat is er nieuw?**\n- Digitaal verlof aanvragen\n- Inzage in je personeelsdossier\n- Nieuwsupdates direct op je dashboard\n\nLaat het ons weten als je vragen hebt!',
    likes: 12,
    likedBy: ['employee-user']
  },
  {
    id: 'news-2',
    authorName: 'Emily Watson',
    authorAvatar: 'https://picsum.photos/seed/emily/200/200',
    authorRole: 'Senior Medewerker',
    date: '18 Okt 2023',
    title: 'Teamuitje volgende maand',
    shortDescription: 'Het jaarlijkse teamuitje komt eraan! Meld je snel aan voor een avond bowlen.',
    content: 'Vergeet niet je aan te melden voor het jaarlijkse teamuitje. \n\nWe gaan dit jaar **Bowlen en Steengrillen** bij de lokale bowlingbaan. Het belooft een gezellige avond te worden met het hele team.\n\n- **Datum:** 15 November\n- **Tijd:** 18:00 uur\n- **Locatie:** Bowlingcentrum Nijmegen\n\nDe inschrijving sluit aanstaande vrijdag, dus wees er snel bij!',
    image: 'https://images.unsplash.com/photo-1543747579-795b9c2c3ada?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
    likes: 24,
    likedBy: []
  }
];

export const SHOP_CATALOG: ShopItem[] = [
    // FRAMES
    { id: 'frame-gold', name: 'Legendary Gold', category: 'Frame', price: 500, description: 'Een gouden rand voor toppresteerders.', previewValue: 'border-4 border-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.6)]' },
    { id: 'frame-neon', name: 'Neon Vibes', category: 'Frame', price: 350, description: 'Val op met deze felle neon gloed.', previewValue: 'border-4 border-fuchsia-500 shadow-[0_0_15px_rgba(217,70,239,0.8)]' },
    { id: 'frame-nature', name: 'Nature Green', category: 'Frame', price: 200, description: 'Subtiele groene rand met blaadjes effect.', previewValue: 'border-4 border-emerald-500 border-dashed' },
    { id: 'frame-fire', name: 'Firestorm', category: 'Frame', price: 750, description: 'Voor als je on fire bent!', previewValue: 'border-4 border-orange-500 shadow-[0_0_20px_rgba(249,115,22,0.8)] animate-pulse' },

    // BANNERS
    { id: 'banner-tech', name: 'Tech Stack', category: 'Banner', price: 400, description: 'Een moderne code achtergrond.', previewValue: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=1920&q=80' },
    { id: 'banner-zen', name: 'Zen Garden', category: 'Banner', price: 300, description: 'Rustgevende stenen en zand.', previewValue: 'https://images.unsplash.com/photo-1519275528373-c4083d92257e?auto=format&fit=crop&w=1920&q=80' },
    { id: 'banner-space', name: 'Galaxy', category: 'Banner', price: 600, description: 'Reis naar de sterren.', previewValue: 'https://images.unsplash.com/photo-1462331940025-496dfbfc7564?auto=format&fit=crop&w=1920&q=80' },
    
    // THEMES
    { id: 'theme-dark', name: 'Sanadome Dark', category: 'Theme', price: 1000, description: 'Een rustig donker thema voor de late uurtjes.', previewValue: '#1e293b' },
    { id: 'theme-cyber', name: 'Cyberpunk', category: 'Theme', price: 1500, description: 'High contrast, neon accenten.', previewValue: '#0f172a' },
    
    // NAME COLORS
    { id: 'color-gold', name: 'Golden Name', category: 'NameColor', price: 250, description: 'Je naam in goud.', previewValue: 'text-yellow-600 font-extrabold' },
    { id: 'color-purple', name: 'Royal Purple', category: 'NameColor', price: 250, description: 'Koninklijke uitstraling.', previewValue: 'text-purple-700 font-extrabold' },
    { id: 'color-teal', name: 'Signature Teal', category: 'NameColor', price: 150, description: 'Onze brand color, maar dan feller.', previewValue: 'text-teal-500 font-extrabold' },
];

export const KNOWLEDGE_ARTICLES: KnowledgeArticle[] = [
    // ... (Existing articles kept, shortened for brevity)
    {
        id: 'ka-1',
        title: 'Verlof aanvragen',
        category: 'HR',
        tags: ['verlof', 'vakantie', 'vrije dag', 'aanvragen', 'time off', 'ziekte'],
        lastUpdated: '10 Sep 2023',
        content: `# Verlof aanvragen\nJe kunt eenvoudig verlof aanvragen via je persoonlijke profiel.`,
        relatedViews: [ViewState.HOME]
    },
    // New Article about Shop
    {
        id: 'ka-shop',
        title: 'Sanacoins & Shop',
        category: 'Systeem',
        tags: ['punten', 'shop', 'rewards', 'sanacoins', 'avatar'],
        lastUpdated: '26 Oct 2023',
        content: `# Sanacoins verdienen\nJe verdient Sanacoins door taken af te ronden, zoals onboarding taken en surveys. Deze kun je uitgeven in de **Shop**.\n\n**Wat kan ik kopen?**\n- Avatar frames\n- Nieuwe profiel banners\n- Kleurtjes voor je naam\n- Speciale thema's`,
        relatedViews: [ViewState.SHOP]
    }
];

export const MOCK_EMPLOYEES: Employee[] = [
  {
    id: 'manager-user',
    name: 'Dennis de Manager',
    role: 'Manager',
    department: 'Management',
    location: 'Nijmegen',
    avatar: 'https://ui-avatars.com/api/?name=Dennis+Manager&background=0d9488&color=fff',
    banner: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80',
    email: 'manager@sanadome.nl',
    password: 'demo',
    phone: '+31 24 359 7200',
    linkedin: 'Dennis Manager',
    hiredOn: '01 Jan 2018',
    employmentType: 'Full-Time',
    accountStatus: 'Active',
    walletBalance: 2450,
    inventory: ['frame-gold', 'theme-dark', 'color-gold'],
    activeCosmetics: { frameId: 'frame-gold', themeId: 'theme-dark', nameColorId: 'color-gold' },
    leaveBalances: [
      { type: 'Annual Leave', entitled: 30.0, taken: 5.0 },
      { type: 'Sick Leave', entitled: 10.0, taken: 0.0 },
      { type: 'Without Pay', entitled: 0, taken: 0.0 }
    ],
    leaveRequests: [],
    documents: [
      { id: 'd1', name: 'Arbeidsovereenkomst.pdf', type: 'PDF', category: 'Contract', date: '01 Jan 2018', size: '2.4 MB', uploadedBy: 'HR' },
      { id: 'd2', name: 'Personeelshandboek 2023.pdf', type: 'PDF', category: 'Overig', date: '15 Jan 2023', size: '4.1 MB', uploadedBy: 'HR' }
    ],
    notes: [],
    onboardingStatus: 'Completed',
    mentor: 'HR',
    onboardingWeeks: [],
    onboardingTasks: generateOnboardingTasks().map(t => ({...t, completed: true, completedBy: 'System', completedDate: '01 Feb 2018', score: 100, notesVisibleToEmployee: true})),
    evaluations: []
  },
  {
    id: 'employee-user',
    name: 'Mark de Medewerker',
    role: 'Medewerker',
    department: 'Engineering',
    location: 'Nijmegen',
    avatar: 'https://ui-avatars.com/api/?name=Mark+Medewerker&background=2563eb&color=fff',
    email: 'medewerker@sanadome.nl',
    password: 'demo',
    phone: '+31 24 359 7201',
    linkedin: 'Mark Medewerker',
    hiredOn: '15 Mrt 2022',
    employmentType: 'Full-Time',
    accountStatus: 'Active',
    walletBalance: 450,
    inventory: ['frame-neon'],
    activeCosmetics: { frameId: 'frame-neon' },
    leaveBalances: [
      { type: 'Annual Leave', entitled: 25.0, taken: 12.0 },
      { type: 'Sick Leave', entitled: 10.0, taken: 1.0 },
      { type: 'Without Pay', entitled: 0, taken: 0.0 }
    ],
    leaveRequests: [
       { id: 'req-1', type: 'Annual Leave', startDate: '10 Aug 23', endDate: '20 Aug 23', amount: 10.0, status: 'Approved' }
    ],
    documents: [
      { id: 'd3', name: 'Contract_Mark.pdf', type: 'PDF', category: 'Contract', date: '15 Mrt 2022', size: '1.8 MB', uploadedBy: 'Dennis de Manager' },
      { id: 'd4', name: 'Loonstrook_Mei_2023.pdf', type: 'PDF', category: 'Loonstrook', date: '25 Mei 2023', size: '0.5 MB', uploadedBy: 'Finance' }
    ],
    notes: [
      { 
        id: 'n1', 
        author: 'Dennis de Manager', 
        date: '20 Sep 2023', 
        category: 'Performance', 
        title: 'Compliment Gastvrijheid', 
        content: 'Mark heeft vandaag uitstekend gehandeld bij een klacht van een gast. Zeer professioneel opgelost.',
        visibleToEmployee: true,
        impact: 'Positive',
        score: 4,
        tags: ['Gastvrijheid', 'Probleemoplossing']
      }
    ],
    onboardingStatus: 'Active',
    mentor: 'Dennis de Manager',
    onboardingWeeks: [
        { week: 1, status: 'Completed', managerNotes: 'Mark heeft een sterke start gemaakt. Pakt systemen snel op.'},
        { week: 2, status: 'Open' }
    ],
    onboardingTasks: generateOnboardingTasks().map((t, i) => {
        if (i < 6) return { 
          ...t, 
          completed: true, 
          completedBy: 'Dennis de Manager', 
          completedDate: '20 Mrt 2022',
          score: 100,
          notesVisibleToEmployee: true,
          notes: i === 2 ? 'Goed opgepakt, volgende keer sneller.' : undefined
        };
        return t;
    }),
    evaluations: [
        {
            id: 'ev-1',
            employeeId: 'employee-user',
            managerId: 'manager-user',
            type: 'Annual',
            status: 'Completed',
            createdAt: '15 Sep 2023',
            completedAt: '01 Okt 2023',
            employeeGeneralFeedback: 'Ik voel me erg thuis in het team.',
            scores: EVALUATION_TEMPLATES.FRONT_OFFICE.map(t => ({...t, employeeScore: 4, managerScore: 4})),
            goals: [],
            signatures: []
        }
    ]
  }
];
