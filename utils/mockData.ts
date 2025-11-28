
import { Employee, NewsPost, OnboardingTask, OnboardingTemplate, SystemUpdateLog, Ticket, BadgeDefinition, KnowledgeArticle, PersonalDevelopmentGoal } from '../types';

// --- DEVELOPMENT LIBRARY (NEW) ---
// Pre-programmed actionable goals for the evaluation system
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
        isLibraryItem: true
    }
];

// --- MOCK BADGES ---
export const MOCK_BADGES: BadgeDefinition[] = [
    { id: 'b1', name: 'Super Start', description: 'Voltooide de onboarding binnen 2 weken met 100% score.', icon: 'Rocket', color: 'blue', createdAt: '2023-01-01' },
    { id: 'b2', name: 'Klantheld', description: 'Ging boven en buiten verwachting voor een gast.', icon: 'Heart', color: 'red', createdAt: '2023-01-01' },
    { id: 'b3', name: 'Team Player', description: 'Altijd bereid om een dienst over te nemen.', icon: 'Users', color: 'green', createdAt: '2023-01-01' }, // Note: Users icon is mapped later or handled by fallback
    { id: 'b4', name: 'Sales Tijger', description: 'Hoogste upsell percentage van de maand.', icon: 'Trophy', color: 'yellow', createdAt: '2023-01-01' },
    { id: 'b5', name: 'Scherp Oog', description: 'Ontdekte een kritieke fout in een boeking.', icon: 'Eye', color: 'purple', createdAt: '2023-01-01' },
    { id: 'b6', name: 'Probleemoplosser', description: 'Heeft zelfstandig een complex gastprobleem opgelost.', icon: 'Zap', color: 'orange', createdAt: '2023-01-01' }
];

// --- MOCK KNOWLEDGE BASE ---
export const MOCK_KNOWLEDGE_BASE: KnowledgeArticle[] = [
    {
        id: 'kb-mews-1',
        title: 'MEWS: Gast Inchecken (Stappenplan)',
        category: 'Front Office',
        content: `Dit protocol beschrijft de standaard check-in procedure in MEWS Operations.\n\n## 1. Reservering Zoeken\nGebruik de zoekbalk bovenaan (sneltoets: **Alt + /**) en typ de achternaam van de gast of het reserveringsnummer.\n\n## 2. Controleer Gastprofiel\nVoordat je incheckt, controleer of alle wettelijk verplichte velden zijn ingevuld:\n- **Volledige naam**\n- **Nationaliteit**\n- **Paspoortnummer** (scan indien mogelijk)\n- **E-mailadres** (voor de factuur)\n\n## 3. Kamer Toewijzen\nAls er nog geen kamer is toegewezen:\n1. Klik op het tabblad **Status**.\n2. Klik op **Assign Space** (Ruimte toewijzen).\n3. Kies een schone ('Inspected') kamer uit de lijst.\n\n## 4. Betaling & Autorisatie\nControleer of er een pre-autorisatie is gedaan voor incidentals. Zo niet, vraag de gast om de creditcard en voer een pre-auth uit via de Mews Terminal.\n\n## 5. Inchecken\nKlik op de blauwe knop **Check-in**. Het systeem zal vragen om de kamersleutels te coderen. Leg de kaart op de encoder en wacht op het groene vinkje.`,
        tags: ['MEWS', 'Check-in', 'Front Office', 'Systeem'],
        authorName: 'Lars Kohler',
        authorRole: 'Manager',
        lastUpdated: '26 Okt 2023',
        allowedRoles: ['All'],
        allowedDepartments: ['Front Office'],
        views: 42,
        isPinned: true,
        reviewDate: '2024-01-01'
    },
    {
        id: 'kb-mews-2',
        title: 'MEWS: Gast Uitchecken & Facturatie',
        category: 'Front Office',
        content: `Het uitchecken van een gast en het correct afsluiten van de rekening.\n\n## 1. Billing Scherm Openen\nGa naar de reservering en klik op de tab **Billing**.\n\n## 2. Rekening Controleren\nLoop samen met de gast de posten na. \n- Zijn alle drankjes uit de minibar toegevoegd?\n- Klopt de toeristenbelasting?\n\n## 3. Betaling Verwerken\nAls er nog een openstaand saldo is:\n1. Klik op **Betaling** (Payment).\n2. Selecteer **Mews Terminal** voor kaartbetalingen of **Cash** voor contant.\n3. Zorg dat het saldo op **€0,00** staat.\n\n## 4. Factuur Sluiten\nKlik op **Close** om de factuur definitief te maken. Vraag de gast of ze de factuur per e-mail willen ontvangen. MEWS stuurt deze automatisch als het e-mailadres in het profiel staat.\n\n## 5. Uitchecken\nKlik op de oranje knop **Check-out**. De kamerstatus verandert automatisch naar 'Dirty' voor Housekeeping.`,
        tags: ['MEWS', 'Check-out', 'Billing', 'Finance'],
        authorName: 'Lars Kohler',
        authorRole: 'Manager',
        lastUpdated: '26 Okt 2023',
        allowedRoles: ['All'],
        allowedDepartments: ['Front Office'],
        views: 35,
        isPinned: true
    },
    {
        id: 'kb-mews-3',
        title: 'MEWS: Housekeeping Status Wijzigen',
        category: 'Housekeeping',
        content: `Hoe wijzig je de status van een kamer in de Housekeeping app of MEWS Operations?\n\n## Statussen Begrijpen\n- **Dirty**: Gast is uitgecheckt, kamer moet schoongemaakt worden.\n- **Clean**: Kamer is schoongemaakt, maar nog niet gecontroleerd.\n- **Inspected**: Kamer is gecontroleerd door de supervisor en klaar voor de volgende gast.\n- **Out of Order (OOO)**: Technische mankementen, kamer niet verhuren.\n\n## Status Wijzigen\n1. Ga naar het **Space Status Report**.\n2. Klik op de kamer die je wilt wijzigen.\n3. Selecteer de nieuwe status (bijv. van Dirty naar Clean).\n4. Voeg optioneel een opmerking toe als er iets kapot is (maak dan ook een Taak aan voor TD).`,
        tags: ['MEWS', 'Housekeeping', 'Schoonmaak', 'Kamerstatus'],
        authorName: 'Hoofd Huishouding',
        authorRole: 'Senior Medewerker',
        lastUpdated: '20 Okt 2023',
        allowedRoles: ['All'],
        allowedDepartments: ['Huishouding', 'Front Office', 'Management'],
        views: 28,
        isPinned: false
    },
    {
        id: 'kb-1',
        title: 'VIP Check-in Procedure',
        category: 'Front Office',
        content: `Bij het inchecken van VIP gasten gelden extra service standaarden.\n\n1. **Voorbereiding**: Controleer voor aankomst of de kamer gereed is en of de VIP-amenity (fles wijn/fruit) aanwezig is.\n2. **Ontvangst**: VIP gasten worden bij voorkeur niet aan de balie ingecheckt, maar in de lounge met een welkomstdrankje.\n3. **Kamerbegeleiding**: Een medewerker begeleidt de gast altijd naar de kamer en geeft een korte uitleg over de faciliteiten (thermostaat, minibar, spa-toegang).\n4. **Follow-up**: Bel de gast 15 minuten na aankomst op de kamer om te vragen of alles naar wens is.`,
        tags: ['VIP', 'Check-in', 'Service', 'Protocol'],
        authorName: 'Lars Kohler',
        authorRole: 'Manager',
        lastUpdated: '10 Okt 2023',
        allowedRoles: ['All'],
        allowedDepartments: ['Front Office', 'Management'],
        views: 145,
        isPinned: false
    },
    {
        id: 'kb-2',
        title: 'Brandmeldinstallatie Bediening',
        category: 'Veiligheid',
        content: `In geval van een brandmelding op het paneel:\n\n1. **Controleer de locatie**: Lees op het paneel af welke melder is afgegaan.\n2. **Verifieer**: Stuur direct een BHV'er naar de locatie om te verifiëren of het om een echte brand gaat of een valse melding.\n3. **Echte brand**: Activeer de ontruiming en bel 112. Volg het ontruimingsplan.\n4. **Valse melding**: Reset het paneel (Code: 1234) en noteer het incident in het logboek.\n\n**Let op**: Zet het paneel nooit uit zonder toestemming van de Duty Manager.`,
        tags: ['Brand', 'Veiligheid', 'BHV', 'Noodgeval'],
        authorName: 'System',
        authorRole: 'Manager',
        lastUpdated: '01 Sep 2023',
        allowedRoles: ['All'],
        allowedDepartments: ['All'],
        views: 320,
        isPinned: true
    },
    {
        id: 'kb-3',
        title: 'Kassa Afsluiting & Storting',
        category: 'Finance',
        content: `Aan het einde van elke dienst moet de kassa worden opgemaakt.\n\n- Tel het contante geld in de lade.\n- Vergelijk dit met de Z-afslag uit het kassasysteem.\n- Verschillen groter dan €5,- moeten direct gemeld worden bij de manager.\n- Doe het geld in de kluis-envelop, schrijf de datum, je naam en het bedrag erop.\n- Deponeer de envelop in de afstortkluis.\n\nLaat altijd €300,- wisselgeld in de lade voor de volgende dienst.`,
        tags: ['Kassa', 'Geld', 'Finance', 'Afsluiting'],
        authorName: 'Janique Vink',
        authorRole: 'Senior Medewerker',
        lastUpdated: '15 Sep 2023',
        allowedRoles: ['All'],
        allowedDepartments: ['Front Office', 'F&B'],
        views: 89,
        isPinned: false
    },
    {
        id: 'kb-4',
        title: 'IDu PMS: Reservering Wijzigen',
        category: 'IT & Systemen',
        content: `Om een reservering te wijzigen in IDu:\n1. Zoek de reservering op naam of nummer.\n2. Klik op 'Edit' (potlood icoon).\n3. Pas de data, kamertype of gastgegevens aan.\n4. **Belangrijk**: Als de prijs verandert, moet je dit bevestigen aan de gast via e-mail.\n5. Klik op 'Save' en controleer of de balans klopt.`,
        tags: ['IDu', 'PMS', 'Reservering', 'Software'],
        authorName: 'Janique Vink',
        authorRole: 'Senior Medewerker',
        lastUpdated: '20 Sep 2023',
        allowedRoles: ['All'],
        allowedDepartments: ['Front Office', 'Reserveringen'],
        views: 56,
        isPinned: false
    }
];

// --- MOCK TICKETS ---
export const MOCK_TICKETS: Ticket[] = [
    {
        id: 'ticket-1',
        title: 'Login pagina laadt traag',
        description: 'Bij het inloggen in de ochtend duurt het soms 10 seconden voordat de pagina reageert.',
        page: 'Login / Startscherm',
        type: 'Bug',
        priority: 'High',
        status: 'Open',
        submittedBy: 'Mark de Medewerker',
        submittedById: 'employee-user',
        submittedAt: new Date(Date.now() - 86400000 * 2).toISOString(), // 2 days ago
        messages: [
            {
                id: 'msg-1',
                senderId: 'employee-user',
                senderName: 'Mark de Medewerker',
                content: 'Het gebeurt vooral rond 09:00 uur als iedereen inlogt.',
                timestamp: new Date(Date.now() - 86400000 * 2 + 3600000).toISOString(),
                type: 'public'
            },
            {
                id: 'msg-2',
                senderId: 'manager-user',
                senderName: 'Manager',
                content: 'Lijkt op een database lock probleem. Ik ga IT vragen de logs te checken.',
                timestamp: new Date(Date.now() - 86400000 * 1.5).toISOString(),
                type: 'internal' // Hidden from Mark
            }
        ]
    },
    {
        id: 'ticket-2',
        title: 'Suggestie: Donkere modus',
        description: 'Het zou fijn zijn om een donkere modus te hebben voor de nachtdienst.',
        page: 'Algemeen',
        type: 'Idea',
        priority: 'Low',
        status: 'In Progress',
        submittedBy: 'Emily Watson',
        submittedById: 'emp-emily',
        submittedAt: new Date(Date.now() - 86400000 * 5).toISOString(), // 5 days ago
        messages: [
            {
                id: 'msg-3',
                senderId: 'manager-user',
                senderName: 'System',
                content: 'Status gewijzigd naar: In Progress',
                timestamp: new Date(Date.now() - 86400000 * 3).toISOString(),
                type: 'system'
            },
            {
                id: 'msg-4',
                senderId: 'manager-user',
                senderName: 'Manager',
                content: 'Goed idee Emily! We zetten dit op de roadmap voor Q4.',
                timestamp: new Date(Date.now() - 86400000 * 3).toISOString(),
                type: 'public'
            }
        ]
    },
    {
        id: 'ticket-3',
        title: 'Verlof aanvraag knop werkt niet op mobiel',
        description: 'Als ik op mijn iPhone op verlof aanvragen klik, gebeurt er niets.',
        page: 'Profiel / Verlof',
        type: 'Fix',
        priority: 'Medium',
        status: 'Resolved',
        submittedBy: 'Mark de Medewerker',
        submittedById: 'employee-user',
        submittedAt: new Date(Date.now() - 86400000 * 10).toISOString(),
        resolvedAt: new Date(Date.now() - 86400000 * 1).toISOString(),
        messages: [
            {
                id: 'msg-5',
                senderId: 'manager-user',
                senderName: 'System',
                content: 'Status gewijzigd naar: Resolved',
                timestamp: new Date(Date.now() - 86400000 * 1).toISOString(),
                type: 'system'
            },
            {
                id: 'msg-6',
                senderId: 'manager-user',
                senderName: 'Manager',
                content: 'Dit is opgelost in update v3.2.1. Graag even je cache legen.',
                timestamp: new Date(Date.now() - 86400000 * 1).toISOString(),
                type: 'public'
            }
        ]
    }
];

// --- AUTO UPDATE LOGGER ---
export const LATEST_SYSTEM_UPDATE: SystemUpdateLog = {
    id: 'update-v4.0.0-growth', 
    version: 'v4.0.0',
    date: new Date().toLocaleDateString('nl-NL', { day: '2-digit', month: 'short', year: 'numeric' }),
    timestamp: new Date().toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' }),
    author: 'AI Assistant',
    type: 'Feature',
    impact: 'High',
    affectedArea: 'Performance',
    description: `
- Lancering Growth & Development Ecosystem.
- Nieuwe bibliotheek met voorgeprogrammeerde ontwikkeldoelen.
- Slimme actiesuggesties in evaluatierapporten.
- 'Groeipad' dashboard toegevoegd aan medewerkersprofiel.`,
    status: 'Success'
};

// ... (Previous imports and helper functions remain, but keeping file concise)
const generateOnboardingTasks = (): OnboardingTask[] => [
  // WEEK 1: Introductie & Basis
  { id: 'w1-1', week: 1, category: 'Introductie', title: 'Rondleiding Hotel & Spa', description: 'Volledige rondleiding door hotelkamers, spa faciliteiten, restaurants en back-of-house.', completed: false, score: 0 },
  { id: 'w1-2', week: 1, category: 'Facilitair', title: 'Uniform & Lockers', description: 'Uitgifte uniform, naambadge en toewijzing locker en kleedruimte.', completed: false, score: 0 },
  { id: 'w1-3', week: 1, category: 'IT & Systemen', title: 'MEWS PMS Training (Basis)', description: 'Aanmaken account, basisnavigatie in MEWS en uitleg dashboard.', completed: false, score: 0 },
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

export const MOCK_TEMPLATES: OnboardingTemplate[] = [
    {
        id: 'template-basis',
        title: 'Sanadome Basis (Front Office)',
        description: 'Standaard inwerktraject voor nieuwe receptiemedewerkers.',
        role: 'Medewerker',
        createdAt: '2023-01-01',
        tasks: generateOnboardingTasks()
    },
    {
        id: 'template-senior',
        title: 'Senior Leadership Track',
        description: 'Verdiepend traject voor leidinggevenden en senior medewerkers.',
        role: 'Senior Medewerker',
        createdAt: '2023-06-15',
        tasks: [
            { id: 's-w1-1', week: 1, category: 'Introductie', title: 'Meet the Team', description: 'Kennismaking met alle afdelingshoofden.', completed: false, score: 0 },
            { id: 's-w1-2', week: 1, category: 'Strategie', title: 'Visie & Missie', description: 'Uitleg over de lange termijn strategie van Sanadome.', completed: false, score: 0 },
            { id: 's-w2-1', week: 2, category: 'Admin', title: 'Roosterplanning', description: 'Training in het maken van roosters en budgetbeheer.', completed: false, score: 0 },
            { id: 's-w2-2', week: 2, category: 'HR', title: 'Evaluaties Voeren', description: 'Training in het voeren van functioneringsgesprekken.', completed: false, score: 0 }
        ]
    }
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
    {
        id: 'log-1',
        version: 'v3.1.0',
        date: '25 Okt 2023',
        timestamp: '14:30',
        author: 'AI Assistant',
        type: 'Feature',
        impact: 'High',
        affectedArea: 'Systeembeheer',
        description: 'Implementatie Geavanceerd Rechtenbeheer en Instellingen Pagina.',
        status: 'Success'
    },
    {
        id: 'log-2',
        version: 'v2.5.0',
        date: '24 Okt 2023',
        timestamp: '12:15',
        author: 'AI Assistant',
        type: 'Feature',
        impact: 'Medium',
        affectedArea: 'Core System',
        description: 'Automatisch log-systeem geïmplementeerd.',
        status: 'Success'
    },
    {
        id: 'log-3',
        version: 'v2.4.0',
        date: '24 Okt 2023',
        timestamp: '10:00',
        author: 'Manager',
        type: 'Feature',
        impact: 'Medium',
        affectedArea: 'Onboarding',
        description: 'Nieuwe Onboarding Module live gezet. Templates nu beschikbaar voor beheer.',
        status: 'Success'
    }
];

export const MOCK_NEWS: NewsPost[] = [
  {
    id: 'news-1',
    authorName: 'Manager',
    authorAvatar: 'https://ui-avatars.com/api/?name=Manager&background=0d9488&color=fff',
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

export const MOCK_EMPLOYEES: Employee[] = [
  {
    id: 'manager-user',
    name: 'Manager',
    role: 'Manager',
    departments: ['Front Office', 'Management'],
    avatar: 'https://ui-avatars.com/api/?name=Manager&background=0d9488&color=fff',
    banner: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80',
    email: 'manager@sanadome.nl',
    password: 'demo',
    phone: '+31 24 359 7200',
    linkedin: 'Manager',
    hiredOn: '01 Jan 2018',
    employmentType: 'Full-Time',
    accountStatus: 'Active',
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
    onboardingHistory: [],
    activeTemplateId: 'template-senior', // Connected to real template
    evaluations: [],
    badges: [],
    growthGoals: []
  },
  {
    id: 'employee-user',
    name: 'Mark de Medewerker',
    role: 'Medewerker',
    departments: ['Front Office'],
    avatar: 'https://ui-avatars.com/api/?name=Mark+Medewerker&background=2563eb&color=fff',
    email: 'medewerker@sanadome.nl',
    password: 'demo',
    phone: '+31 24 359 7201',
    linkedin: 'Mark Medewerker',
    hiredOn: '15 Mrt 2022',
    employmentType: 'Full-Time',
    accountStatus: 'Active',
    leaveBalances: [
      { type: 'Annual Leave', entitled: 25.0, taken: 12.0 },
      { type: 'Sick Leave', entitled: 10.0, taken: 1.0 },
      { type: 'Without Pay', entitled: 0, taken: 0.0 }
    ],
    leaveRequests: [
       { id: 'req-1', type: 'Annual Leave', startDate: '10 Aug 23', endDate: '20 Aug 23', amount: 10.0, status: 'Approved' }
    ],
    documents: [
      { id: 'd3', name: 'Contract_Mark.pdf', type: 'PDF', category: 'Contract', date: '15 Mrt 2022', size: '1.8 MB', uploadedBy: 'Manager' },
      { id: 'd4', name: 'Loonstrook_Mei_2023.pdf', type: 'PDF', category: 'Loonstrook', date: '25 Mei 2023', size: '0.5 MB', uploadedBy: 'Finance' }
    ],
    notes: [
      { 
        id: 'n1', 
        author: 'Manager', 
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
    mentor: 'Manager',
    onboardingWeeks: [
        { week: 1, status: 'Completed', managerNotes: 'Mark heeft een sterke start gemaakt. Pakt systemen snel op.'},
        { week: 2, status: 'Open' }
    ],
    onboardingTasks: generateOnboardingTasks().map((t, i) => {
        if (i < 6) return { 
          ...t, 
          completed: true, 
          completedBy: 'Manager', 
          completedDate: '20 Mrt 2022',
          score: 100,
          notesVisibleToEmployee: true,
          notes: i === 2 ? 'Goed opgepakt, volgende keer sneller.' : undefined
        };
        return t;
    }),
    onboardingHistory: [],
    activeTemplateId: 'template-basis',
    evaluations: [
        {
            id: 'ev-old-1',
            employeeId: 'employee-user',
            managerId: 'manager-user',
            type: 'Month 3',
            status: 'Archived',
            createdAt: '15 Jun 2022',
            completedAt: '01 Jul 2022',
            overallRating: 3.8,
            scores: EVALUATION_TEMPLATES.FRONT_OFFICE.map(t => ({...t, employeeScore: 4, managerScore: 4})),
            goals: [],
            signatures: []
        },
        {
            id: 'ev-1',
            employeeId: 'employee-user',
            managerId: 'manager-user',
            type: 'Annual',
            status: 'Signed',
            createdAt: '15 Sep 2023',
            completedAt: '01 Okt 2023',
            employeeGeneralFeedback: 'Ik voel me erg thuis in het team.',
            scores: EVALUATION_TEMPLATES.FRONT_OFFICE.map(t => ({...t, employeeScore: 4, managerScore: 4})),
            overallRating: 4.2,
            potential: 'High',
            goals: [
                { id: 'g1', title: 'Senior Training', description: 'Deelnemen aan leiderschapstraining.', deadline: 'Q4 2023', status: 'Agreed' }
            ],
            signatures: [
                { signedBy: 'Manager', signedById: 'manager-user', signedAt: '01 Okt 2023', role: 'Manager' },
                { signedBy: 'Mark de Medewerker', signedById: 'employee-user', signedAt: '01 Okt 2023', role: 'Employee' }
            ]
        }
    ],
    badges: [
        { id: 'ub1', badgeId: 'b1', assignedBy: 'Manager', assignedById: 'manager-user', assignedAt: '20 Mrt 2022' },
        { id: 'ub2', badgeId: 'b2', assignedBy: 'Manager', assignedById: 'manager-user', assignedAt: '15 Nov 2022' }
    ],
    growthGoals: [
        {
            id: 'pg-1',
            title: 'Masterclass Upselling',
            category: 'Sales & Revenue',
            description: 'Verhogen van de gemiddelde besteding per gast door effectieve verkooptechnieken.',
            actionPlan: '1. Volg de online module "Upselling at Check-in".\n2. Pas de "Top-Down" methode toe bij 5 gasten per dienst.\n3. Evalueer wekelijks de upsell cijfers met de supervisor.',
            status: 'In Progress',
            progress: 35,
            startDate: '01 Okt 2023',
            deadline: '31 Dec 2023',
            reflections: [
                { id: 'ref-1', date: '10 Okt 2023', content: 'De eerste module afgerond. Interessante techniek over "Choice Architecture".', author: 'Mark de Medewerker' }
            ]
        }
    ]
  }
];
