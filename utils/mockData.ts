
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
    // --- CATEGORIE: MIJNSANADOME & BASIS (1-5) ---
    {
        id: 'kb-sys-1',
        title: 'Startgids: Inloggen & Wachtwoord',
        category: 'MijnSanadome',
        content: `## Welkom bij MijnSanadome
Dit is jouw centrale hub voor alles rondom je werk bij Sanadome. Van roosters tot nieuws en je persoonlijke ontwikkeling.

## Eerste keer inloggen
1. Je hebt van je manager of HR een tijdelijk wachtwoord ontvangen.
2. Ga naar het inlogscherm en gebruik je **@sanadome.nl** e-mailadres.
3. Voer het tijdelijke wachtwoord in.
4. Het systeem zal je direct vragen een nieuw, persoonlijk wachtwoord in te stellen.

## Wachtwoordbeleid
Om de veiligheid van onze gast- en personeelsgegevens te waarborgen, moet je wachtwoord voldoen aan de volgende eisen:
- Minimaal 8 tekens
- Minimaal 1 hoofdletter
- Minimaal 1 cijfer

## Wachtwoord vergeten?
Ben je je wachtwoord vergeten? Klik in het inlogscherm op **"Wachtwoord vergeten?"**. Omdat we met gevoelige gegevens werken, kun je dit niet zelf resetten. Je krijgt instructies om contact op te nemen met de systeembeheerders (Lars Kohler of Janique Vink). Zij kunnen een reset voor je uitvoeren.`,
        tags: ['Inloggen', 'Account', 'Beveiliging', 'Starten'],
        authorName: 'System Admin',
        authorRole: 'Manager',
        lastUpdated: '01 Dec 2023',
        allowedRoles: ['All'],
        allowedDepartments: ['All'],
        views: 450,
        isPinned: true
    },
    {
        id: 'kb-sys-2',
        title: 'Jouw Profiel & Personalia Beheren',
        category: 'MijnSanadome',
        content: `## Waarom is je profiel belangrijk?
Je profiel in MijnSanadome is meer dan alleen een plaatje. Het is zichtbaar voor al je collega's in de "Collega's" lijst (smoelenboek). Een compleet profiel helpt nieuwe collega's om je te herkennen en contact op te nemen.

## Profielfoto aanpassen
1. Navigeer naar **Mijn Profiel** in het menu.
2. Klik op het camera-icoontje dat verschijnt als je met je muis over je huidige foto gaat.
3. Upload een representatieve foto (liefst in uniform of zakelijk).
4. Het systeem snijdt de foto automatisch rond uit.

## Banner & Uitstraling
Je kunt je profiel personaliseren met een achtergrondbanner. Klik rechtsboven in je profielheader op **"Cover Wijzigen"**. Kies een afbeelding die past bij Sanadome of jouw rol (bijv. een foto van de keuken, receptie of wellness).

## Gegevens wijzigen
Kloppen je e-mailadres, telefoonnummer of afdeling niet?
- **Telefoonnummer:** Kun je zelf aanpassen via de "Bewerk" knop bij Contactgegevens.
- **Contract/Functie:** Deze gegevens worden beheerd door HR. Klopt er iets niet? Maak dan een ticket aan via "Support & Tickets".`,
        tags: ['Profiel', 'Foto', 'HR', 'Smoelenboek'],
        authorName: 'HR Support',
        authorRole: 'Manager',
        lastUpdated: '15 Nov 2023',
        allowedRoles: ['All'],
        allowedDepartments: ['All'],
        views: 210,
        isPinned: false
    },
    {
        id: 'kb-sys-3',
        title: 'Notificatiecentrum: Mis niets',
        category: 'MijnSanadome',
        content: `## Het belletje rechtsboven
MijnSanadome houdt je proactief op de hoogte van belangrijke zaken. Het bel-icoon rechtsboven toont een rode indicator als er actie vereist is.

## Soorten meldingen
Het systeem maakt onderscheid tussen verschillende types berichten:
- **Taken & Onboarding:** Je manager heeft een taak afgevinkt of er staat een nieuwe week voor je klaar.
- **Evaluaties:** Er is een uitnodiging voor een gesprek of je moet je voorbereiding invullen.
- **Nieuws:** Belangrijke mededelingen van de directie.
- **Badges:** Een collega heeft je een compliment (badge) gegeven!
- **Systeem:** Updates over onderhoud of nieuwe features.

## Acties
- **Klikken:** Door op een melding te klikken, ga je direct naar de juiste pagina (bijv. meteen naar het evaluatieformulier).
- **Markeren als gelezen:** Heb je alles gezien? Klik in het uitklapmenu op "Lees alles" om de rode teller te resetten.
- **Vastgezette meldingen:** Sommige kritieke meldingen (zoals "Contract verloopt bijna") blijven bovenaan staan totdat de actie is voltooid.`,
        tags: ['Communicatie', 'Meldingen', 'Inbox'],
        authorName: 'IT Support',
        authorRole: 'Manager',
        lastUpdated: '10 Nov 2023',
        allowedRoles: ['All'],
        allowedDepartments: ['All'],
        views: 115,
        isPinned: false
    },
    {
        id: 'kb-sys-4',
        title: 'Collega\'s vinden (Directory)',
        category: 'MijnSanadome',
        content: `## Het digitale smoelenboek
Zoek je het telefoonnummer van een collega of wil je weten wie de manager van F&B is? Gebruik de Directory.

## Zoeken & Filteren
Ga in het menu naar **Collega's**.
1. **Zoekbalk:** Typ een naam, maar je kunt ook zoeken op rol (bijv. "Supervisor") of afdeling.
2. **Afdeling Filter:** Gebruik de dropdown rechtsboven om snel alle collega's van "Huishouding" of "Receptie" te zien.

## Direct contact
In de lijst zie je bij elke collega icoontjes voor E-mail en Telefoon.
- Klik op het **Mail-icoon** om direct Outlook/Mail te openen.
- Klik op het **Telefoon-icoon** (op mobiel) om direct te bellen.

**Privacy:** Alleen zakelijke nummers en e-mailadressen zijn zichtbaar, tenzij een collega expliciet toestemming heeft gegeven voor privé-gegevens.`,
        tags: ['Team', 'Contact', 'Zoeken', 'Telefoonlijst'],
        authorName: 'HR',
        authorRole: 'Manager',
        lastUpdated: '01 Nov 2023',
        allowedRoles: ['All'],
        allowedDepartments: ['All'],
        views: 340,
        isPinned: true
    },
    {
        id: 'kb-sys-5',
        title: 'Mobiele App Installeren (PWA)',
        category: 'MijnSanadome',
        content: `## Altijd bij de hand
MijnSanadome is een zogenaamde "Progressive Web App" (PWA). Dit betekent dat je geen app uit de App Store hoeft te downloaden, maar de website als app op je telefoon kunt installeren.

## Installeren op iPhone (iOS)
1. Open **Safari** en ga naar het portaal.
2. Tik onderin op de **Deel-knop** (vierkantje met pijl omhoog).
3. Scroll naar beneden en kies **"Zet op beginscherm"**.
4. Tik op "Voeg toe".
5. Het Sanadome-icoon staat nu tussen je apps!

## Installeren op Android (Chrome)
1. Open **Chrome** en ga naar het portaal.
2. Tik rechtsboven op de **drie puntjes**.
3. Kies **"App installeren"** of **"Toevoegen aan startscherm"**.
4. Bevestig de installatie.

**Voordelen:**
- Je hoeft niet telkens opnieuw in te loggen.
- De app werkt sneller en full-screen.
- Je ontvangt notificaties direct op je telefoon (indien ingeschakeld).`,
        tags: ['Mobiel', 'App', 'Installatie', 'iPhone', 'Android'],
        authorName: 'IT Support',
        authorRole: 'Manager',
        lastUpdated: '20 Okt 2023',
        allowedRoles: ['All'],
        allowedDepartments: ['All'],
        views: 520,
        isPinned: true
    },

    // --- CATEGORIE: HR & ADMIN (6-10) ---
    {
        id: 'kb-hr-1',
        title: 'Documentenbeheer: Uploaden & Inzien',
        category: 'HR & Admin',
        content: `## Jouw digitale dossier
Onder het kopje **Documenten** vind je al je belangrijke papieren. Dit vervangt de oude papieren personeelsdossiers.

## Wat vind je hier?
- **Contracten:** Je arbeidsovereenkomst en verlengingen.
- **Loonstroken:** Je maandelijkse specificaties.
- **Identificatie:** Een kopie van je ID/Paspoort (veilig opgeslagen).
- **Overig:** Diploma's, certificaten of functioneringsverslagen.

## Zelf documenten toevoegen
Heb je een nieuw diploma behaald of een certificaat?
1. Ga naar het tabblad **"Bestanden"**.
2. Klik rechtsboven op **"Uploaden"**.
3. Selecteer het bestand (PDF of Foto).
4. Kies de categorie "Overig".
5. Je manager en HR krijgen een melding en valideren het document.

**Let op:** Verwijderen kan alleen door een manager/HR om per ongeluk dataverlies te voorkomen.`,
        tags: ['Dossier', 'Contract', 'Uploaden', 'Administratie'],
        authorName: 'HR',
        authorRole: 'Manager',
        lastUpdated: '15 Okt 2023',
        allowedRoles: ['All'],
        allowedDepartments: ['All'],
        views: 180,
        isPinned: false
    },
    {
        id: 'kb-hr-2',
        title: 'Loonstroken: Wanneer & Waar?',
        category: 'HR & Admin',
        content: `## Digitale loonstrook
Je loonstrook wordt niet meer per post verstuurd of gemaild, maar veilig klaargezet in MijnSanadome.

## Wanneer?
Salarissen worden doorgaans rond de **24e van de maand** uitbetaald. De loonstrook is vaak 1 of 2 dagen eerder zichtbaar in het systeem. Je ontvangt automatisch een notificatie (belletje) zodra de strook beschikbaar is.

## Downloaden
1. Ga naar **Documenten**.
2. Filter eventueel op categorie "Loonstrook".
3. Klik op het **Download-icoon** naast de betreffende maand.
4. De PDF opent direct of wordt opgeslagen op je apparaat.

**Tip:** Heb je een loonstrook nodig voor bijvoorbeeld een hypotheekaanvraag? Download ze tijdig en sla ze lokaal op.`,
        tags: ['Salaris', 'Geld', 'Financieel', 'Downloaden'],
        authorName: 'Finance',
        authorRole: 'Manager',
        lastUpdated: '01 Okt 2023',
        allowedRoles: ['All'],
        allowedDepartments: ['All'],
        views: 600,
        isPinned: true
    },
    {
        id: 'kb-hr-3',
        title: 'Ziekteverzuim: Het Protocol',
        category: 'HR & Admin',
        content: `## Ziek melden
Als je ziek bent en niet kunt werken, is het cruciaal dat we dit tijdig weten voor de bezetting.

**Stap 1: Bellen (Vóór 09:00)**
Bel altijd telefonisch naar je direct leidinggevende of de Duty Manager. Appjes of mailtjes worden **niet** geaccepteerd als officiële ziekmelding.
- Geef aan dat je ziek bent.
- Geef een indicatie van de duur (indien mogelijk).
- Je hoeft *niet* te vertellen wat je mankeert (medisch geheim).

**Stap 2: Registratie**
Je leidinggevende zet de melding in MijnSanadome. Je ziet dit terug in je profiel onder "Notities & Tijdlijn" (categorie Verzuim). Dit is belangrijk voor de Wet Verbetering Poortwachter.

**Stap 3: Beter melden**
Ben je weer hersteld? Bel je leidinggevende. Hij/zij sluit de verzuimcase in het systeem.`,
        tags: ['Ziek', 'Verzuim', 'Regels', 'Poortwachter'],
        authorName: 'HR',
        authorRole: 'Manager',
        lastUpdated: '05 Nov 2023',
        allowedRoles: ['All'],
        allowedDepartments: ['All'],
        views: 250,
        isPinned: true
    },
    {
        id: 'kb-hr-4',
        title: 'Vakantie & Verlof Aanvragen',
        category: 'HR & Admin',
        content: `## Verlof aanvragen
Iedereen heeft recht op ontspanning. Vraag je vakantie tijdig aan zodat we het rooster rond krijgen.

**Procedure (Huidig)**
Omdat de volledige roosterintegratie nog loopt, werken we met een digitaal formulier in MijnSanadome.
1. Download het **"Verlofaanvraagformulier"** bij Documenten (onder Categorie: Overig).
2. Vul het in en laat het ondertekenen door je manager.
3. Upload het getekende formulier terug in je dossier.

**Toekomst (Q1 2024)**
Binnenkort verschijnt er een knop **"Verlof Aanvragen"** op je dashboard. Je kunt dan:
- Je actuele saldo (uren) zien.
- Een datumselectie maken in een kalender.
- Direct goedkeuring krijgen van je manager.
Houd de "Systeemstatus" en "Nieuws" in de gaten voor de lancering!`,
        tags: ['Vakantie', 'Vrije tijd', 'Rooster'],
        authorName: 'HR',
        authorRole: 'Manager',
        lastUpdated: '20 Nov 2023',
        allowedRoles: ['All'],
        allowedDepartments: ['All'],
        views: 300,
        isPinned: false
    },
    {
        id: 'kb-hr-5',
        title: 'Functioneringsdossier & Notities',
        category: 'HR & Admin',
        content: `## Jouw groeidossier
In MijnSanadome wordt een logboek bijgehouden van jouw functioneren. Dit is niet om je te controleren, maar om je groei vast te leggen.

## Wat staat erin?
Ga naar **Documenten** > tabblad **"Notities"**.
- **Complimenten:** Als een gast of collega positief over je was.
- **Gespreksverslagen:** Korte samenvattingen van 1-op-1 gesprekken.
- **Incidenten:** Als er iets misging, wordt dit hier genoteerd zodat we er later op kunnen reflecteren.

## Zichtbaarheid
Sommige notities zijn "Privé" voor de manager (bijv. geheugensteuntjes voor een evaluatie). De meeste notities zijn echter openbaar voor jou. Transparantie staat voorop! Zie je iets waar je het niet mee eens bent? Bespreek dit met je manager.`,
        tags: ['Feedback', 'Dossier', 'Groei'],
        authorName: 'HR',
        authorRole: 'Manager',
        lastUpdated: '12 Okt 2023',
        allowedRoles: ['All'],
        allowedDepartments: ['All'],
        views: 130,
        isPinned: false
    },

    // --- CATEGORIE: ONBOARDING & ONTWIKKELING (11-15) ---
    {
        id: 'kb-dev-1',
        title: 'Onboarding: Je eerste 4 weken',
        category: 'Onboarding',
        content: `## Een vliegende start
Welkom! Om te zorgen dat je snel je weg vindt, werken we met een gestructureerd onboarding programma in MijnSanadome.

**Hoe werkt het?**
Ga naar de pagina **Onboarding**. Je ziet hier 4 weken.
- **Week 1 (Introductie):** Huisregels, rondleiding, systemen en kennismaken.
- **Week 2 (Basis):** De kern van je taken uitvoeren onder begeleiding.
- **Week 3 (Verdieping):** Zelfstandiger werken en uitzonderingen leren.
- **Week 4 (Zelfstandig):** Je draait volledig mee en sluit af met een gesprek.

**Voortgang**
Je manager of "buddy" vinkt taken af als je ze beheerst. Je ziet de voortgangsbalk bovenin vollopen. Probeer voor het einde van je proeftijd 100% te halen!`,
        tags: ['Nieuw', 'Starten', 'Training', 'Proeftijd'],
        authorName: 'Training Team',
        authorRole: 'Senior Medewerker',
        lastUpdated: '01 Nov 2023',
        allowedRoles: ['All'],
        allowedDepartments: ['All'],
        views: 220,
        isPinned: true
    },
    {
        id: 'kb-dev-2',
        title: 'Evaluatiecyclus: Van start tot handtekening',
        category: 'Evaluaties',
        content: `## Het digitale evaluatieproces
Geen papieren formulieren meer die kwijtraken. Alles gaat digitaal.

**Stap 1: Uitnodiging**
Je krijgt een melding dat er een evaluatie (bijv. Jaargesprek) voor je klaarstaat.

**Stap 2: Zelfreflectie (Jouw beurt)**
Open de evaluatie. Geef jezelf scores en typ je toelichting. Waar ben je trots op? Wat kan beter? Klik op "Volgende" tot je klaar bent. De manager ziet dit pas als je op "Afronden" klikt.

**Stap 3: Manager Input**
De manager krijgt een seintje, leest jouw input en vult zijn/haar deel in.

**Stap 4: Het Gesprek**
Jullie zitten samen en bespreken de scores. De manager past eventueel nog dingen aan in het verslag tijdens het gesprek.

**Stap 5: Ondertekenen**
Na het gesprek zet de manager de status op "Review". Jullie moeten nu beiden digitaal ondertekenen met de knop "Ondertekenen". Daarna is het dossier gesloten en gearchiveerd.`,
        tags: ['Beoordeling', 'Gesprek', 'HR Cyclus'],
        authorName: 'HR',
        authorRole: 'Manager',
        lastUpdated: '15 Okt 2023',
        allowedRoles: ['All'],
        allowedDepartments: ['All'],
        views: 310,
        isPinned: false
    },
    {
        id: 'kb-dev-3',
        title: 'Groeipad (PDP): Doelen stellen',
        category: 'Evaluaties',
        content: `## Personal Development Plan (PDP)
Wil je doorgroeien? Bijvoorbeeld van Medewerker naar Senior? Of wil je een specifieke vaardigheid leren (bijv. Duits)?

**Een doel aanmaken**
Tijdens een evaluatie of tussentijds overleg kun je samen met je manager een "Groeipad" instellen.
1. De manager voegt een doel toe (bijv. "Upselling Training").
2. Er wordt een **deadline** gekoppeld.
3. Er wordt een **intensiteit** gekozen (hoe vaak checken we in?).

**Check-ins**
Het systeem plant automatisch tussentijdse evaluatiemomenten ("Check-ins"). Je krijgt hier meldingen van. Tijdens zo'n check-in bespreken jullie kort de voortgang en wordt het voortgangspercentage bijgewerkt.`,
        tags: ['Ontwikkeling', 'Opleiding', 'Carrière'],
        authorName: 'HR',
        authorRole: 'Manager',
        lastUpdated: '20 Nov 2023',
        allowedRoles: ['All'],
        allowedDepartments: ['All'],
        views: 145,
        isPinned: false
    },
    {
        id: 'kb-dev-4',
        title: 'Badges: Waardering geven en krijgen',
        category: 'Team',
        content: `## Complimenten cultuur
Bij Sanadome waarderen we extra inzet. Daarom hebben we digitale Badges.

**Een badge ontvangen**
Als je iets bijzonders doet (bijv. een gast extreem goed geholpen, of ingevallen voor een zieke collega), kan een manager of senior je een badge geven. Je krijgt hier een feestelijke melding van en de badge prijkt op je profiel.

**Een badge uitreiken (Voor Seniors/Managers)**
1. Ga naar **Badges** > Bibliotheek.
2. Kies een badge (bijv. "Klantheld" of "Teamplayer").
3. Klik op **Uitreiken**.
4. Selecteer de collega.
5. De badge is direct zichtbaar!`,
        tags: ['Compliment', 'Cultuur', 'Beloning'],
        authorName: 'HR',
        authorRole: 'Manager',
        lastUpdated: '01 Sep 2023',
        allowedRoles: ['All'],
        allowedDepartments: ['All'],
        views: 190,
        isPinned: false
    },
    {
        id: 'kb-dev-5',
        title: 'Surveys: Jouw mening telt',
        category: 'MijnSanadome',
        content: `## Medewerkerstevredenheid
We vinden het belangrijk wat jij vindt. Daarom sturen we regelmatig korte enquêtes (Surveys).

**Hoe werkt het?**
1. Je ziet een melding "Nieuwe Survey beschikbaar".
2. Klik erop of ga naar de pagina **Surveys**.
3. Beantwoord de vragen (dit kan sterren, tekst of meerkeuze zijn).
4. Klik op verzenden.

**Anonimiteit**
Bij elke survey staat duidelijk vermeld of deze **Anoniem** is of niet. Bij anonieme surveys zien managers alleen de totaalcijfers, nooit wie wat heeft ingevuld. Wees dus eerlijk!`,
        tags: ['Feedback', 'Mening', 'Enquête'],
        authorName: 'HR',
        authorRole: 'Manager',
        lastUpdated: '10 Okt 2023',
        allowedRoles: ['All'],
        allowedDepartments: ['All'],
        views: 160,
        isPinned: false
    },

    // --- CATEGORIE: OPERATIE & TOOLS (16-20) ---
    {
        id: 'kb-ops-1',
        title: 'Linnen Audit: Bestelling Importeren',
        category: 'Operatie',
        content: `## Stap 1: De Bestelling
De Linnen Audit vergelijkt wat we besteld hebben bij Moderna met wat er daadwerkelijk geleverd is.

**Bestand**
Zorg dat je de bestelling als digitaal Excel-bestand (.xlsx) hebt. Dit komt meestal uit het inkoopsysteem of de mail van Moderna.

**Importeren**
1. Ga naar **Linnen Audit**.
2. Klik links op het vak "1. Bestelling".
3. Selecteer het Excel-bestand.

**Let op: Containers**
Het systeem bevat slimme logica voor grote aantallen.
- Rij 34 (Badlaken wit): Wordt automatisch x 200 gedaan (volle container).
- Rij 35 (Baddoek wit): Wordt automatisch x 384 gedaan.
- Rij 36 (Baddoek beige): Wordt automatisch x 384 gedaan.
- Rij 37 (Badlaken beige): Wordt automatisch x 160 gedaan.
*Vul in de Excel dus '1' in als je 1 container bedoelt, het systeem rekent dit om naar stuks.*`,
        tags: ['Linnen', 'Facilitair', 'Moderna', 'Excel'],
        authorName: 'Facilitair',
        authorRole: 'Manager',
        lastUpdated: '25 Nov 2023',
        allowedRoles: ['Manager', 'Senior Medewerker'],
        allowedDepartments: ['Huishouding', 'Management'],
        views: 85,
        isPinned: false
    },
    {
        id: 'kb-ops-2',
        title: 'Linnen Audit: Leverbonnen Scannen (OCR)',
        category: 'Operatie',
        content: `## Stap 2: De Levering
De papieren bonnen die bij de karren zitten, moeten digitaal worden gemaakt.

**Scannen**
Scan de bonnen in. Zorg voor een goede resolutie. Sla ze op als PDF. Je mag meerdere bonnen in één PDF doen, of meerdere losse PDF's hebben.

**Uploaden**
1. Sleep de PDF-bestanden naar het rechtervak "2. Leveringen".
2. Klik op **"Start Audit"**.

**Hoe werkt het?**
Het systeem gebruikt OCR (Tekstherkenning) om de PDF uit te lezen. Hij zoekt naar artikelnummers (bijv. 7772) en de aantallen die erachter staan. Daarna worden alle bonnen bij elkaar opgeteld en gematcht met je bestelling.`,
        tags: ['Linnen', 'PDF', 'Scan', 'Automatisering'],
        authorName: 'IT Support',
        authorRole: 'Manager',
        lastUpdated: '25 Nov 2023',
        allowedRoles: ['Manager', 'Senior Medewerker'],
        allowedDepartments: ['Huishouding', 'Management'],
        views: 80,
        isPinned: false
    },
    {
        id: 'kb-ops-3',
        title: 'Linnen Audit: Artikelen Uitsluiten',
        category: 'Operatie',
        content: `## Waarom uitsluiten?
Soms staan er items op de bon die we niet willen tellen. Bijvoorbeeld:
- Dienstkleding (persoonsgebonden).
- Karren/Containers zelf (statiegeld items).
- Specials die niet in de standaardtelling horen.

**Configureren**
1. Ga in de Linnen Audit module naar de knop **"Configuratie"** (rechtsboven).
2. Je ziet een lijst met geblokkeerde Product ID's (bijv. 7772, 0524).
3. **Toevoegen:** Typ een ID in en klik op plus.
4. **Verwijderen:** Klik op het kruisje naast een ID om het weer mee te laten tellen.

Deze instellingen worden opgeslagen voor de volgende keer!`,
        tags: ['Configuratie', 'Instellingen', 'Filter'],
        authorName: 'Facilitair',
        authorRole: 'Manager',
        lastUpdated: '26 Nov 2023',
        allowedRoles: ['Manager', 'Senior Medewerker'],
        allowedDepartments: ['Huishouding', 'Management'],
        views: 65,
        isPinned: false
    },
    {
        id: 'kb-ops-4',
        title: 'Debiteuren: Import & Verrijking',
        category: 'Finance',
        content: `## Openstaande posten beheren
Met de Debiteuren-module houden we grip op onbetaalde rekeningen van gasten.

**Import uit MEWS**
1. Draai in MEWS het "Accounting Report" of "Open Balances".
2. Exporteer naar Excel.
3. Ga in MijnSanadome naar **Debiteuren** > **"Importeer Rapportage"**.
4. Upload het bestand.

**Automatische Verrijking (PDOK)**
Het systeem kijkt naar de adressen in het bestand. Als een adres incompleet is (bijv. alleen postcode en huisnummer), gebruikt het systeem de 'PDOK Locatieserver' van de overheid om automatisch de juiste straatnaam en woonplaats erbij te zoeken. Dit scheelt veel typewerk bij het versturen van brieven!`,
        tags: ['Finance', 'Geld', 'Incasso', 'API'],
        authorName: 'Finance',
        authorRole: 'Manager',
        lastUpdated: '10 Nov 2023',
        allowedRoles: ['Manager', 'Senior Medewerker'],
        allowedDepartments: ['Front Office', 'Management'],
        views: 120,
        isPinned: false
    },
    {
        id: 'kb-ops-5',
        title: 'Debiteuren: WIK Brief Maken',
        category: 'Finance',
        content: `## Wet Incasso Kosten (WIK)
Voordat we een vordering naar een incassobureau mogen sturen, is een officiële "14-dagen brief" wettelijk verplicht (de WIK-brief).

**Brief genereren**
1. Zoek de gast in het overzicht (Filter eventueel op "Final Notice").
2. Klik op het **Printer-icoontje** aan de rechterkant.
3. Er opent een venster. Selecteer de **oorspronkelijke factuurdatum**.
4. Klik op "Genereer & Print".

Het systeem maakt een PDF met de juiste juridische teksten, het openstaande bedrag en de gegevens van de gast. Print deze uit, doe hem in een envelop en stuur hem aangetekend op.`,
        tags: ['Juridisch', 'Brief', 'WIK', 'Incasso'],
        authorName: 'Finance',
        authorRole: 'Manager',
        lastUpdated: '10 Nov 2023',
        allowedRoles: ['Manager'],
        allowedDepartments: ['Management'],
        views: 95,
        isPinned: true
    },

    // --- CATEGORIE: SUPPORT & IT (21-25) ---
    {
        id: 'kb-sup-1',
        title: 'Ticket Systeem: Melding maken',
        category: 'Support',
        content: `## Iets kapot of een goed idee?
Gebruik het ticketsysteem in plaats van losse mailtjes of briefjes. Zo raakt niets kwijt.

**Soorten tickets**
- **Bug:** Er is iets stuk (bijv. "Login werkt niet" of "Koffieapparaat defect").
- **Idea:** Je hebt een verbetersuggestie (bijv. "Kunnen we een donkere modus krijgen?").
- **Fix:** Een kleine aanpassing (bijv. "Spelfout op de website").

**Een ticket maken**
1. Ga naar **Support & Tickets**.
2. Klik op **"Nieuwe Melding"**.
3. Kies de **Locatie** (waar gaat het over?) en de **Prioriteit**.
4. Beschrijf het probleem duidelijk.
5. Klik op versturen.

Je kunt de status (Open, In Behandeling, Opgelost) volgen op het dashboard.`,
        tags: ['Helpdesk', 'IT', 'Onderhoud', 'Melding'],
        authorName: 'IT Support',
        authorRole: 'Manager',
        lastUpdated: '01 Nov 2023',
        allowedRoles: ['All'],
        allowedDepartments: ['All'],
        views: 200,
        isPinned: false
    },
    {
        id: 'kb-sup-2',
        title: 'Systeemstatus & Updates',
        category: 'Support',
        content: `## Werkt alles nog?
Ervaar je traagheid of een storing? Check eerst de statuspagina.

**Database Latency**
Op de pagina **Systeemstatus** (alleen voor managers/seniors) zie je een metertje "Database Latency".
- **Groen (<300ms):** Alles is snel en goed.
- **Oranje/Rood:** Het systeem heeft het druk. Even geduld.

**Update Log**
Onderaan zie je de "Change Log". Hier staat precies wat er in de laatste update is veranderd. We updaten het systeem regelmatig met nieuwe features (gekoppeld aan GitHub).`,
        tags: ['Storing', 'Snelheid', 'Updates', 'Versie'],
        authorName: 'System Admin',
        authorRole: 'Manager',
        lastUpdated: '15 Okt 2023',
        allowedRoles: ['Manager', 'Senior Medewerker'],
        allowedDepartments: ['All'],
        views: 50,
        isPinned: false
    },
    {
        id: 'kb-sup-3',
        title: 'Rechtenbeheer: Wie mag wat?',
        category: 'Beheer',
        content: `## Rollen en Permissies
MijnSanadome werkt met een strikt rechtensysteem. Standaard rechten zijn gekoppeld aan je rol:
- **Manager:** Mag alles zien en bewerken.
- **Senior:** Mag roosters zien, taken afvinken en badges uitdelen.
- **Medewerker:** Ziet alleen eigen gegevens, nieuws en surveys.

**Uitzonderingen maken**
Wil je dat een specifieke medewerker (bijv. een stagiair op kantoor) toch toegang krijgt tot "Documenten Beheer"?
1. Ga naar **Instellingen**.
2. Zoek de medewerker.
3. Vink handmatig extra permissies aan (bijv. "MANAGE_DOCUMENTS").
4. Dit overschrijft de standaard rol.`,
        tags: ['Rechten', 'Beveiliging', 'Admin', 'Toegang'],
        authorName: 'System Admin',
        authorRole: 'Manager',
        lastUpdated: '20 Nov 2023',
        allowedRoles: ['Manager'],
        allowedDepartments: ['Management'],
        views: 40,
        isPinned: true
    },
    {
        id: 'kb-sup-4',
        title: 'Nieuwsberichten Plaatsen',
        category: 'Communicatie',
        content: `## Bereik het hele team
Als Manager of Senior kun je nieuwsberichten plaatsen die direct op het startscherm van alle medewerkers verschijnen.

**Tips voor een goed bericht**
1. **Titel:** Kort en pakkend.
2. **Afbeelding:** Upload altijd een foto. Berichten met foto worden 3x vaker gelezen!
3. **Opmaak:** Gebruik de editor knoppen voor **dikgedrukte tekst** of lijstjes om het leesbaar te houden.
4. **Notificatie:** Bij het publiceren wordt automatisch een push-notificatie naar iedereen gestuurd. Doe dit dus niet 's nachts, tenzij het spoed is.`,
        tags: ['Nieuws', 'Communicatie', 'Redactie'],
        authorName: 'Marketing',
        authorRole: 'Manager',
        lastUpdated: '10 Sep 2023',
        allowedRoles: ['Manager', 'Senior Medewerker'],
        allowedDepartments: ['All'],
        views: 90,
        isPinned: false
    },
    {
        id: 'kb-sup-5',
        title: 'Kennisbank Artikelen Schrijven',
        category: 'Beheer',
        content: `## Deel je kennis
Weet jij alles van de kassa of het koffieapparaat? Schrijf er een artikel over!

1. Ga naar **Kennisbank** > **"Nieuw Artikel"**.
2. **Smart Assist:** Klik op de toverstaf-knop. Kies een sjabloon (bijv. "Protocol" of "Handleiding"). Dit geeft je direct een goede structuur.
3. **Markdown:** Gebruik hekjes (#) voor koppen en sterretjes (*) voor lijstjes.
4. **Zichtbaarheid:** Is dit alleen voor de Receptie? Vink dan bij "Afdelingen" alleen Front Office aan. Zo houden we het overzichtelijk voor de rest.`,
        tags: ['Kennis', 'Schrijven', 'Documentatie'],
        authorName: 'System Admin',
        authorRole: 'Manager',
        lastUpdated: '01 Dec 2023',
        allowedRoles: ['Manager', 'Senior Medewerker'],
        allowedDepartments: ['All'],
        views: 60,
        isPinned: false
    },

    // --- CATEGORIE: VEILIGHEID & HUISREGELS (26-30) ---
    {
        id: 'kb-safe-1',
        title: 'BHV & Noodsituaties',
        category: 'Veiligheid',
        content: `## In geval van nood
Bij brand, ongeval of ontruiming volg je altijd de instructies van de BHV (Bedrijfshulpverlening).

**Alarmnummers**
- **Intern Noodnummer:** Toestel **2222** (Receptie/Duty Manager).
- **Extern:** 112 (Alleen bellen in levensbedreigende situaties, meld dit direct ook intern!).

**Verzamelplaats**
Bij een ontruiming verzamelen we op het parkeerterrein aan de achterzijde (bij de vlaggenmasten).

**Wie is BHV?**
Op het rooster en bij de prikklok hangt dagelijks een lijstje wie er BHV-dienst heeft. Zorg dat je weet wie dit zijn in jouw shift.`,
        tags: ['Brand', 'Ongeval', 'Alarm', 'BHV'],
        authorName: 'Veiligheid',
        authorRole: 'Manager',
        lastUpdated: '01 Jan 2023',
        allowedRoles: ['All'],
        allowedDepartments: ['All'],
        views: 400,
        isPinned: true
    },
    {
        id: 'kb-safe-2',
        title: 'AVG & Privacy: Gastgegevens',
        category: 'Veiligheid',
        content: `## Omgaan met persoonsgegevens
We werken dagelijks met gevoelige data van gasten (NAW, creditcards, paspoorten). Hier gelden strenge regels voor (AVG).

**Gouden Regels**
1. **Clean Desk:** Laat nooit printjes met gastgegevens op de balie slingeren.
2. **Vergrendelen:** Loop je weg bij je computer? Windows-toets + L.
3. **Wachtwoorden:** Deel nooit je wachtwoord met een collega. Iedereen heeft een eigen account.
4. **Papier:** Gooi documenten met persoonsgegevens niet in de prullenbak, maar in de speciale papierversnipperaar-bakken.`,
        tags: ['Privacy', 'AVG', 'Data', 'Security'],
        authorName: 'IT Support',
        authorRole: 'Manager',
        lastUpdated: '15 Sep 2023',
        allowedRoles: ['All'],
        allowedDepartments: ['All'],
        views: 280,
        isPinned: true
    },
    {
        id: 'kb-safe-3',
        title: 'Huisregels & Kledingvoorschrift',
        category: 'HR & Admin',
        content: `## Representativiteit
Jij bent het visitekaartje van Sanadome.

**Kleding**
- Draag altijd het voorgeschreven uniform.
- Zorg dat het schoon en gestreken is.
- Naambadge is verplicht en moet zichtbaar gedragen worden (links op de borst).

**Uiterlijke verzorging**
- Haar moet verzorgd zijn (lang haar vast).
- Geen opvallende sieraden of piercings.
- Tatoeages moeten zoveel mogelijk bedekt zijn.

**Roken & Telefoon**
- Roken alleen in de pauze op de aangewezen plek buiten het zicht van gasten.
- Privételefoons zijn tijdens werktijd niet toegestaan, tenzij met toestemming van je leidinggevende voor werkdoeleinden.`,
        tags: ['Regels', 'Uniform', 'Gedrag'],
        authorName: 'HR',
        authorRole: 'Manager',
        lastUpdated: '01 Jan 2023',
        allowedRoles: ['All'],
        allowedDepartments: ['All'],
        views: 350,
        isPinned: false
    },
    {
        id: 'kb-safe-4',
        title: 'Declaraties Indienen',
        category: 'HR & Admin',
        content: `## Onkostenvergoeding
Heb je kosten gemaakt voor het werk? (bijv. reiskosten voor een training of boodschappen voor de afdeling).

**Procedure**
1. Bewaar altijd de originele bon (met BTW vermelding!).
2. Download het **Declaratieformulier** bij Documenten.
3. Vul het in en niet de bon eraan vast.
4. Laat het tekenen door je afdelingshoofd.
5. Lever het in bij de financiële administratie (postvakje Finance).

De uitbetaling vindt meestal plaats tegelijk met de eerstvolgende salarisbetaling.`,
        tags: ['Geld', 'Kosten', 'Bonnetjes'],
        authorName: 'Finance',
        authorRole: 'Manager',
        lastUpdated: '10 Nov 2023',
        allowedRoles: ['All'],
        allowedDepartments: ['All'],
        views: 90,
        isPinned: false
    },
    {
        id: 'kb-safe-5',
        title: 'Duurzaamheid & Green Key',
        category: 'Operatie',
        content: `## Green Key Goud
Sanadome is gecertificeerd met het Green Key Goud keurmerk. We doen er alles aan om het milieu te sparen. Jij helpt mee!

**Wat kun jij doen?**
- **Afval:** Scheid afval strikt (Papier, Plastic, Rest, Glas).
- **Licht & Apparatuur:** Doe lichten uit in ruimtes waar niemand is. Zet computers en schermen uit na sluitingstijd.
- **Water:** Meld lekkende kranen direct via een Ticket (type: Bug/Fix) zodat de TD het kan maken.
- **Gasten:** Informeer gasten over onze handdoekenwissel-policy (alleen op de grond = wassen).

Samen zorgen we voor een groenere toekomst!`,
        tags: ['Milieu', 'MVO', 'Green Key', 'Afval'],
        authorName: 'Directie',
        authorRole: 'Manager',
        lastUpdated: '01 Sep 2023',
        allowedRoles: ['All'],
        allowedDepartments: ['All'],
        views: 120,
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
    id: 'update-v4.3.0-kb-complete', 
    version: 'v4.3.0',
    date: new Date().toLocaleDateString('nl-NL', { day: '2-digit', month: 'short', year: 'numeric' }),
    timestamp: new Date().toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' }),
    author: 'AI Assistant',
    type: 'Feature',
    impact: 'High',
    affectedArea: 'Kennisbank',
    description: `
- Kennisbank volledig vernieuwd met 30 "slimme" artikelen.
- Uitgebreide markdown ondersteuning en instructies.
- Categorieën geherstructureerd voor betere vindbaarheid.`,
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
