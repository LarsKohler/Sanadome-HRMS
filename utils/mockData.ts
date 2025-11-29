
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
    // --- CATEGORIE: STARTEN & BASIS (5) ---
    {
        id: 'kb-sys-1',
        title: 'Inloggen & Eerste Keer Gebruik',
        category: 'MijnSanadome',
        content: `Welkom bij MijnSanadome! Dit artikel helpt je op weg bij je eerste keer inloggen.\n\n## Inloggen\n1. Ga naar het startscherm.\n2. Voer je **@sanadome.nl** e-mailadres in.\n3. Voer je tijdelijke wachtwoord in (verkregen via je manager).\n\n## Wachtwoord Wijzigen\nBij de eerste keer inloggen wordt je gevraagd een nieuw wachtwoord in te stellen. Zorg dat deze minimaal 8 tekens bevat.\n\n## Problemen?\nLukt het inloggen niet? Klik op "Wachtwoord vergeten" of neem contact op met HR.`,
        tags: ['Starten', 'Inloggen', 'Account', 'Wachtwoord'],
        authorName: 'System Admin',
        authorRole: 'Manager',
        lastUpdated: '01 Nov 2023',
        allowedRoles: ['All'],
        allowedDepartments: ['All'],
        views: 120,
        isPinned: true
    },
    {
        id: 'kb-sys-2',
        title: 'Jouw Profiel & Gegevens Bewerken',
        category: 'MijnSanadome',
        content: `Je profiel is je visitekaartje binnen de organisatie. Houd deze up-to-date.\n\n## Profielfoto Aanpassen\n1. Ga naar **Mijn Profiel** in het menu.\n2. Klik op het camera-icoon bij je huidige foto.\n3. Upload een professionele foto (JPG/PNG).\n\n## Banner Wijzigen\nJe kunt de achtergrond (banner) van je profiel personaliseren door op "Cover Wijzigen" te klikken rechtsboven in je profiel.\n\n## Contactgegevens\nKloppen je telefoonnummer of e-mailadres niet? Geef dit door aan HR via een ticket of mail.`,
        tags: ['Profiel', 'Foto', 'Instellingen'],
        authorName: 'HR Support',
        authorRole: 'Manager',
        lastUpdated: '28 Okt 2023',
        allowedRoles: ['All'],
        allowedDepartments: ['All'],
        views: 85,
        isPinned: false
    },
    {
        id: 'kb-sys-3',
        title: 'Notificaties Instellen & Begrijpen',
        category: 'MijnSanadome',
        content: `Mis nooit meer een belangrijk bericht met notificaties.\n\n## Waar vind ik ze?\nRechtsboven in de balk zie je een bel-icoon 🔔. Als er een rood bolletje bij staat, heb je ongelezen berichten.\n\n## Soorten Meldingen\n- **Nieuws:** Belangrijke mededelingen van directie.\n- **Taken:** Herinneringen voor onboarding of surveys.\n- **Badges:** Als je een compliment ontvangt van een collega.\n- **Evaluaties:** Uitnodigingen voor gesprekken.\n\n## Alles Lezen\nKlik op "Lees alles" in het dropdown menu om in één keer je inbox op te schonen.`,
        tags: ['Notificaties', 'Berichten', 'Communicatie'],
        authorName: 'System Admin',
        authorRole: 'Manager',
        lastUpdated: '15 Okt 2023',
        allowedRoles: ['All'],
        allowedDepartments: ['All'],
        views: 60,
        isPinned: false
    },
    {
        id: 'kb-sys-4',
        title: 'Collega\'s Zoeken in de Directory',
        category: 'MijnSanadome',
        content: `Op zoek naar het telefoonnummer of e-mailadres van een collega?\n\n1. Ga naar **Collega's** in het menu.\n2. Gebruik de **zoekbalk** bovenin om te zoeken op:\n   - Naam\n   - Afdeling (bijv. "Front Office")\n   - Rol (bijv. "Manager")\n3. Klik op een collega om direct naar hun profiel te gaan.\n\n**Tip:** Je kunt vanuit de lijst direct op het mail- of telefoonicoon klikken om contact op te nemen.`,
        tags: ['Directory', 'Collega', 'Zoeken', 'Contact'],
        authorName: 'HR Support',
        authorRole: 'Manager',
        lastUpdated: '10 Okt 2023',
        allowedRoles: ['All'],
        allowedDepartments: ['All'],
        views: 95,
        isPinned: false
    },
    {
        id: 'kb-sys-5',
        title: 'Mobiel Gebruik van MijnSanadome',
        category: 'MijnSanadome',
        content: `MijnSanadome is volledig geoptimaliseerd voor je smartphone.\n\n## Menu Openen\nOp mobiel is het menu standaard ingeklapt. Klik op het **Menu-icoon** (drie streepjes) linksboven om te navigeren.\n\n## Sneltoets Maken (App Ervaring)\n- **iPhone (Safari):** Klik op de deel-knop onderin en kies "Zet op beginscherm".\n- **Android (Chrome):** Klik op de drie puntjes rechtsboven en kies "App installeren" of "Toevoegen aan startscherm".\n\nZo heb je altijd snel toegang tot je rooster en nieuws!`,
        tags: ['Mobiel', 'App', 'Installatie'],
        authorName: 'IT Support',
        authorRole: 'Manager',
        lastUpdated: '05 Nov 2023',
        allowedRoles: ['All'],
        allowedDepartments: ['All'],
        views: 210,
        isPinned: true
    },

    // --- CATEGORIE: HR & DOCUMENTEN (5) ---
    {
        id: 'kb-hr-1',
        title: 'Documenten Uploaden in je Dossier',
        category: 'HR & Admin',
        content: `Je kunt zelf documenten toevoegen aan je personeelsdossier, zoals diploma's of certificaten.\n\n1. Ga naar **Documenten**.\n2. Zorg dat het tabblad "Bestanden" actief is.\n3. Klik rechtsboven op de knop **Uploaden**.\n4. Selecteer het bestand van je computer of telefoon.\n5. Geef het bestand een duidelijke naam en kies de juiste categorie (bijv. "Overig").\n\n**Let op:** Alleen jij en je manager kunnen deze documenten zien.`,
        tags: ['Documenten', 'Uploaden', 'HR', 'Dossier'],
        authorName: 'HR',
        authorRole: 'Manager',
        lastUpdated: '20 Okt 2023',
        allowedRoles: ['All'],
        allowedDepartments: ['All'],
        views: 45,
        isPinned: false
    },
    {
        id: 'kb-hr-2',
        title: 'Loonstrook Bekijken',
        category: 'HR & Admin',
        content: `Je loonstroken worden digitaal beschikbaar gesteld in MijnSanadome.\n\n1. Ga naar **Documenten**.\n2. Filter in de lijst of zoek op "Loonstrook".\n3. Klik op het download-icoon naast de strook die je wilt bekijken.\n\nDe loonstroken worden meestal rond de **24e van de maand** geüpload. Je krijgt hiervan een notificatie.`,
        tags: ['Loonstrook', 'Salaris', 'Financieel'],
        authorName: 'Finance',
        authorRole: 'Manager',
        lastUpdated: '01 Sep 2023',
        allowedRoles: ['All'],
        allowedDepartments: ['All'],
        views: 300,
        isPinned: true
    },
    {
        id: 'kb-hr-3',
        title: 'Ziek Melden: Procedure',
        category: 'HR & Admin',
        content: `Ben je ziek en kun je niet werken? Volg dan dit protocol:\n\n1. **Bel** vóór 09:00 uur naar je leidinggevende.\n2. Geef aan dat je ziek bent en wat de verwachte duur is (indien bekend).\n3. Je leidinggevende verwerkt de ziekmelding in het systeem.\n4. In je profiel onder "Notities" kun je eventueel het verzuim terugzien (alleen zichtbaar voor jou en HR).\n\n**Beter melden:** Bel je leidinggevende zodra je weer hersteld bent om je betermelding door te geven.`,
        tags: ['Ziek', 'Verzuim', 'Protocol', 'HR'],
        authorName: 'HR',
        authorRole: 'Manager',
        lastUpdated: '10 Nov 2023',
        allowedRoles: ['All'],
        allowedDepartments: ['All'],
        views: 150,
        isPinned: true
    },
    {
        id: 'kb-hr-4',
        title: 'Notities & Feedback Inzien',
        category: 'HR & Admin',
        content: `In je dossier worden gespreksverslagen en feedback bewaard.\n\n1. Ga naar **Documenten**.\n2. Klik op het tabblad **Notities & Tijdlijn**.\n3. Hier zie je een chronologisch overzicht van:\n   - Performance gesprekken\n   - Complimenten\n   - Verzuimregistraties\n\nSommige notities zijn privé voor de manager en zijn hier niet zichtbaar.`,
        tags: ['Feedback', 'Notities', 'Dossier'],
        authorName: 'HR',
        authorRole: 'Manager',
        lastUpdated: '15 Okt 2023',
        allowedRoles: ['All'],
        allowedDepartments: ['All'],
        views: 40,
        isPinned: false
    },
    {
        id: 'kb-hr-5',
        title: 'Verlof Aanvragen (Vakantie)',
        category: 'HR & Admin',
        content: `*Let op: De digitale verlofmodule wordt momenteel uitgerold. Tot die tijd geldt de volgende procedure:*\n\n1. Download het **Vakantieaanvraagformulier** bij Documenten (Categorie: Overig).\n2. Vul het formulier in.\n3. Laat het ondertekenen door je leidinggevende.\n4. Lever het in bij HR of upload de getekende versie terug in je dossier.\n\nZodra de digitale module live is, verschijnt er een knop "Verlof Aanvragen" op je dashboard.`,
        tags: ['Verlof', 'Vakantie', 'Aanvraag'],
        authorName: 'HR',
        authorRole: 'Manager',
        lastUpdated: '01 Nov 2023',
        allowedRoles: ['All'],
        allowedDepartments: ['All'],
        views: 180,
        isPinned: false
    },

    // --- CATEGORIE: ONBOARDING & GROEI (5) ---
    {
        id: 'kb-groei-1',
        title: 'Jouw Onboarding Traject',
        category: 'Onboarding',
        content: `Nieuw bij Sanadome? Je onboarding traject staat voor je klaar.\n\n1. Ga naar **Onboarding** in het menu.\n2. Je ziet hier je voortgang per week (Week 1 t/m 4).\n3. Klik op de week om de openstaande taken te zien.\n4. Je manager zal taken afvinken en beoordelen.\n\nJe kunt zelf zien hoe ver je bent in de voortgangsbalk bovenaan de pagina.`,
        tags: ['Onboarding', 'Nieuw', 'Starten'],
        authorName: 'Training Team',
        authorRole: 'Senior Medewerker',
        lastUpdated: '20 Sep 2023',
        allowedRoles: ['All'],
        allowedDepartments: ['All'],
        views: 110,
        isPinned: false
    },
    {
        id: 'kb-groei-2',
        title: 'Evaluatiecyclus: Hoe werkt het?',
        category: 'Evaluaties',
        content: `Jaarlijks voeren we evaluatiegesprekken. In MijnSanadome verloopt dit digitaal.\n\n## Stap 1: Uitnodiging\nJe ontvangt een notificatie om je voorbereiding te starten.\n\n## Stap 2: Zelfreflectie\nGa naar **Evaluaties**, open de actieve cyclus en vul jouw deel in (terugblik, successen, scores).\n\n## Stap 3: Manager Input\nNadat jij klaar bent, vult de manager zijn/haar deel in.\n\n## Stap 4: Het Gesprek\nTijdens het gesprek bespreken jullie de scores en stellen jullie het rapport definitief vast.\n\n## Stap 5: Ondertekenen\nNa het gesprek tekenen jullie beiden digitaal in het systeem voor akkoord.`,
        tags: ['Evaluatie', 'Beoordeling', 'Cyclus'],
        authorName: 'HR',
        authorRole: 'Manager',
        lastUpdated: '01 Okt 2023',
        allowedRoles: ['All'],
        allowedDepartments: ['All'],
        views: 220,
        isPinned: true
    },
    {
        id: 'kb-groei-3',
        title: 'Groeipad & Doelen Instellen',
        category: 'Evaluaties',
        content: `Wil je groeien in je functie? Stel een Groeipad op.\n\nDit doe je samen met je manager tijdens een evaluatie. Een groeipad bestaat uit:\n- Een concreet doel (bijv. "Leidinggeven").\n- Een deadline.\n- Tussentijdse check-ins (evaluatiemomenten).\n\nJe kunt je actieve doelen en voortgang altijd terugvinden op je **Profiel** onder het tabblad "Groeipad".`,
        tags: ['Groeipad', 'Doelen', 'Ontwikkeling'],
        authorName: 'HR',
        authorRole: 'Manager',
        lastUpdated: '12 Nov 2023',
        allowedRoles: ['All'],
        allowedDepartments: ['All'],
        views: 65,
        isPinned: false
    },
    {
        id: 'kb-groei-4',
        title: 'Badges Uitreiken (Waardering)',
        category: 'Team',
        content: `Waardering uitspreken is belangrijk! Als Senior of Manager kun je badges uitreiken.\n\n1. Ga naar **Badges** in het menu.\n2. Klik op "Bibliotheek" om te zien welke badges er zijn (bijv. "Klantheld", "Teamplayer").\n3. Klik op **Uitreiken** onder een badge.\n4. Selecteer de collega die de badge verdient.\n5. De collega ontvangt direct een feestelijke notificatie!\n\nIedereen kan elkaars badges zien op de profielpagina's.`,
        tags: ['Badges', 'Complimenten', 'Team'],
        authorName: 'HR',
        authorRole: 'Manager',
        lastUpdated: '25 Okt 2023',
        allowedRoles: ['Manager', 'Senior Medewerker'],
        allowedDepartments: ['All'],
        views: 80,
        isPinned: false
    },
    {
        id: 'kb-groei-5',
        title: 'Surveys Invullen',
        category: 'MijnSanadome',
        content: `Jouw mening telt! We sturen regelmatig korte enquêtes (surveys).\n\n1. Als er een nieuwe survey is, zie je een melding op je dashboard.\n2. Klik op de melding of ga naar **Surveys**.\n3. Start de survey en beantwoord de vragen (dit kan anoniem zijn, dit staat erbij vermeld).\n4. Klik op afronden.\n\nDe resultaten worden gebruikt om Sanadome te verbeteren.`,
        tags: ['Survey', 'Feedback', 'Enquête'],
        authorName: 'HR',
        authorRole: 'Manager',
        lastUpdated: '10 Sep 2023',
        allowedRoles: ['All'],
        allowedDepartments: ['All'],
        views: 130,
        isPinned: false
    },

    // --- CATEGORIE: OPERATIE & TOOLS (5) ---
    {
        id: 'kb-ops-1',
        title: 'Linnen Audit: Bestelling Importeren',
        category: 'Operatie',
        content: `Voor de Moderna Linnen Audit begin je met de bestellijst.\n\n1. Ga naar **Linnen Audit**.\n2. Zorg dat je de bestelling van Moderna als **Excel-bestand** (.xlsx) hebt.\n3. Klik op het linker vak ("1. Bestelling") of sleep het bestand erin.\n\n**Let op:** Het systeem herkent automatisch containers (bijv. 200 stuks) op basis van specifieke rijnummers (rij 34-37). Controleer of je de originele Moderna-layout gebruikt.`,
        tags: ['Linnen', 'Audit', 'Moderna', 'Excel'],
        authorName: 'Facilitair',
        authorRole: 'Manager',
        lastUpdated: '15 Nov 2023',
        allowedRoles: ['Manager', 'Senior Medewerker'],
        allowedDepartments: ['Huishouding', 'Management'],
        views: 40,
        isPinned: false
    },
    {
        id: 'kb-ops-2',
        title: 'Linnen Audit: Leverbonnen Verwerken',
        category: 'Operatie',
        content: `Na de bestelling voeg je de leverbonnen toe.\n\n1. Scan de papieren leverbonnen in als **PDF** (of download ze).\n2. Sleep ze in het rechter vak ("2. Leveringen") in de **Linnen Audit** module.\n3. Je kunt meerdere PDF's tegelijk toevoegen.\n4. Klik op **Start Audit**.\n\nHet systeem leest de PDF's uit en matcht de aantallen met de bestelling.`,
        tags: ['Linnen', 'PDF', 'Scan', 'Audit'],
        authorName: 'Facilitair',
        authorRole: 'Manager',
        lastUpdated: '15 Nov 2023',
        allowedRoles: ['Manager', 'Senior Medewerker'],
        allowedDepartments: ['Huishouding', 'Management'],
        views: 35,
        isPinned: false
    },
    {
        id: 'kb-ops-3',
        title: 'Linnen Audit: Artikelen Uitsluiten',
        category: 'Operatie',
        content: `Sommige artikelen wil je niet meetellen in de audit (bijv. dienstkleding of specials).\n\n1. Ga in de Linnen Audit module naar **Configuratie** (knop rechtsboven).\n2. Hier zie je een lijst met uitgesloten Product ID's.\n3. Voeg een nieuw ID toe en klik op "Toevoegen".\n4. Verwijder een ID door op het kruisje te klikken.\n\nDeze instellingen worden onthouden voor de volgende keer.`,
        tags: ['Linnen', 'Configuratie', 'Instellingen'],
        authorName: 'Facilitair',
        authorRole: 'Manager',
        lastUpdated: '18 Nov 2023',
        allowedRoles: ['Manager', 'Senior Medewerker'],
        allowedDepartments: ['Huishouding', 'Management'],
        views: 20,
        isPinned: false
    },
    {
        id: 'kb-ops-4',
        title: 'Debiteuren: Rapportage Importeren',
        category: 'Finance',
        content: `Het importeren van openstaande posten uit MEWS/Excel.\n\n1. Ga naar **Debiteuren**.\n2. Klik rechtsboven op **Importeer Rapportage**.\n3. Upload het Excel-bestand met de openstaande balansen.\n4. Het systeem ontdubbelt automatisch en verrijkt adressen waar mogelijk via de PDOK API.\n5. Na import zie je direct welke dossiers actie vereisen (>14 dagen open).`,
        tags: ['Debiteuren', 'Finance', 'Import', 'Excel'],
        authorName: 'Finance',
        authorRole: 'Manager',
        lastUpdated: '05 Okt 2023',
        allowedRoles: ['Manager', 'Senior Medewerker'],
        allowedDepartments: ['Front Office', 'Management'],
        views: 55,
        isPinned: false
    },
    {
        id: 'kb-ops-5',
        title: 'Debiteuren: WIK Brief Genereren',
        category: 'Finance',
        content: `Voor de laatste aanmaning (Wet Incasso Kosten) kun je een officiële brief genereren.\n\n1. Open het dossier van de gast in de **Debiteuren** module.\n2. Klik op het **Printer-icoontje** bij acties.\n3. Selecteer de originele factuurdatum.\n4. Klik op **Genereer & Print**.\n\nEr opent een nieuw venster met een juridisch correcte brief die je direct kunt printen of opslaan als PDF.`,
        tags: ['WIK', 'Incasso', 'Brief', 'Juridisch'],
        authorName: 'Finance',
        authorRole: 'Manager',
        lastUpdated: '01 Nov 2023',
        allowedRoles: ['Manager'],
        allowedDepartments: ['Management'],
        views: 45,
        isPinned: true
    },

    // --- CATEGORIE: SUPPORT & BEHEER (5) ---
    {
        id: 'kb-sup-1',
        title: 'Ticket Aanmaken (Melding)',
        category: 'Support',
        content: `Zie je een fout in het systeem of heb je een goed idee?\n\n1. Ga naar **Support & Tickets** in het menu.\n2. Klik op **Nieuwe Melding**.\n3. Kies het type:\n   - **Bug:** Iets is kapot.\n   - **Idee:** Je hebt een verbetersuggestie.\n   - **Fix:** Een kleine tekst- of layoutfout.\n4. Beschrijf het probleem duidelijk en klik op versturen.\n\nJe kunt de status van je ticket volgen op dezelfde pagina.`,
        tags: ['Ticket', 'Bug', 'Support', 'Helpdesk'],
        authorName: 'IT Support',
        authorRole: 'Manager',
        lastUpdated: '10 Sep 2023',
        allowedRoles: ['All'],
        allowedDepartments: ['All'],
        views: 125,
        isPinned: false
    },
    {
        id: 'kb-sup-2',
        title: 'Systeemstatus Controleren',
        category: 'Beheer',
        content: `Als het systeem traag lijkt, kun je de status controleren.\n\n1. Ga naar **Systeemstatus** (alleen zichtbaar voor bepaalde rollen).\n2. Hier zie je de "Database Latency" (vertraging). Groen is goed (<300ms).\n3. Je ziet ook een logboek van recente updates en versies.\n\nBij storingen wordt dit hier ook gemeld.`,
        tags: ['Status', 'Uptime', 'Storing', 'IT'],
        authorName: 'IT Support',
        authorRole: 'Manager',
        lastUpdated: '01 Nov 2023',
        allowedRoles: ['All'],
        allowedDepartments: ['All'],
        views: 30,
        isPinned: false
    },
    {
        id: 'kb-sup-3',
        title: 'Rechten & Rollen Beheren',
        category: 'Beheer',
        content: `Als Manager kun je instellen wie wat mag zien.\n\n1. Ga naar **Instellingen**.\n2. Kies **Rollen** om standaardrechten per functie aan te passen.\n3. Kies **Gebruikers** om voor één specifiek persoon een uitzondering te maken (bijv. een Senior die ook Debiteuren mag zien).\n\n**Let op:** Wees voorzichtig met het geven van "Delete" rechten.`,
        tags: ['Rechten', 'Permissies', 'Beheer', 'Manager'],
        authorName: 'System Admin',
        authorRole: 'Manager',
        lastUpdated: '15 Okt 2023',
        allowedRoles: ['Manager'],
        allowedDepartments: ['Management'],
        views: 25,
        isPinned: true
    },
    {
        id: 'kb-sup-4',
        title: 'Nieuwsbericht Plaatsen',
        category: 'Communicatie',
        content: `Heb je een mededeling voor het team?\n\n1. Ga naar **Nieuws**.\n2. Klik op **Bericht Plaatsen**.\n3. Vul een titel en korte samenvatting in.\n4. Schrijf het bericht. Je kunt tekst **dikgedrukt** maken of lijstjes toevoegen.\n5. Voeg optioneel een afbeelding toe voor meer attentiewaarde.\n6. Klik op **Publiceren**.\n\nIedereen ontvangt een notificatie van je nieuwe bericht.`,
        tags: ['Nieuws', 'Publiceren', 'Communicatie'],
        authorName: 'Communicatie',
        authorRole: 'Manager',
        lastUpdated: '20 Sep 2023',
        allowedRoles: ['Manager', 'Senior Medewerker'],
        allowedDepartments: ['All'],
        views: 70,
        isPinned: false
    },
    {
        id: 'kb-sup-5',
        title: 'Knowledge Base Artikel Maken',
        category: 'Beheer',
        content: `Help collega's door kennis te delen in deze kennisbank.\n\n1. Ga naar **Kennisbank**.\n2. Klik op **Nieuw Artikel**.\n3. Gebruik de "Smart Assist" knop voor sjablonen (bijv. voor een Protocol of Handleiding).\n4. Gebruik Markdown voor opmaak (kopjes met #, lijsten met -).\n5. Stel bij "Zichtbaarheid" in voor wie dit artikel bedoeld is (bijv. alleen Front Office).\n6. Klik op Opslaan.`,
        tags: ['Kennisbank', 'Schrijven', 'Documentatie'],
        authorName: 'System Admin',
        authorRole: 'Manager',
        lastUpdated: '25 Nov 2023',
        allowedRoles: ['Manager', 'Senior Medewerker'],
        allowedDepartments: ['All'],
        views: 40,
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
    id: 'update-v4.2.0-kb-update', 
    version: 'v4.2.0',
    date: new Date().toLocaleDateString('nl-NL', { day: '2-digit', month: 'short', year: 'numeric' }),
    timestamp: new Date().toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' }),
    author: 'AI Assistant',
    type: 'Feature',
    impact: 'Medium',
    affectedArea: 'Kennisbank',
    description: `
- Kennisbank gevuld met 30 uitgebreide systeem-artikelen.
- Categorieën en rechtenstructuur voor artikelen geoptimaliseerd.
- Linnen Audit configuratie en logica verbeterd.`,
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
            ],
            developmentPlan: [
                {
                    id: 'pg-1',
                    title: 'Masterclass Upselling',
                    category: 'Sales & Revenue',
                    description: 'Verhogen van de gemiddelde besteding per gast door effectieve verkooptechnieken.',
                    actionPlan: '1. Volg de online module "Upselling at Check-in".\n2. Pas de "Top-Down" methode toe bij 5 gasten per dienst.',
                    status: 'In Progress',
                    progress: 25,
                    startDate: '01 Okt 2023',
                    deadline: '31 Dec 2023',
                    checkIns: [
                        { id: 'ci-1', date: '01 Nov 2023', status: 'Completed', score: 25, completedDate: '02 Nov 2023', managerNotes: 'Goed begin!' },
                        { id: 'ci-2', date: '01 Dec 2023', status: 'Planned', score: 0 }
                    ],
                    reflections: [],
                    isLibraryItem: true
                }
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
            progress: 25,
            startDate: '01 Okt 2023',
            deadline: '31 Dec 2023',
            checkIns: [
                { id: 'ci-1', date: '01 Nov 2023', status: 'Completed', score: 25, completedDate: '02 Nov 2023', managerNotes: 'Goed begin, online module afgerond.' },
                { id: 'ci-2', date: '01 Dec 2023', status: 'Planned', score: 0 }
            ],
            reflections: [
                { id: 'ref-1', date: '10 Okt 2023', content: 'De eerste module afgerond. Interessante techniek over "Choice Architecture".', author: 'Mark de Medewerker' }
            ],
            linkedEvaluationId: 'ev-1'
        }
    ]
  }
];
