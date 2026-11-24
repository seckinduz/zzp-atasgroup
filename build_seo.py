"""Genereert de landelijke SEO-pagina's van ATAS ZZP: regios.html, zzp-<regio>.html (13) en zzp-<vak>-<stad>.html (36).
Elke pagina krijgt eigen titel, intro, lokale marktanalyse, prijsgids, Wet DBA-tips en FAQ (handgeschreven lokale gegevens, per pagina anders samengesteld).
Gebruik: python build_seo.py   (sitemap.xml wordt daarna door build_sitemap.py bijgewerkt)"""
import html, json, re, zlib
from pathlib import Path

HERE = Path(__file__).resolve().parent
SITE = "https://zzp.atasgroup.nl"
V = "12"
e = html.escape

# ---------------------------------------------------------------- regio's
# slug: naam, stad (voor titels), regio (filterwaarde), factor, steden, eco, bouw, markt, reis, dba, faq
REG = {
 "emmen": dict(naam="Emmen", stad="Emmen", regio="Drenthe (Emmen)", f=0.95, steden="Emmen, Klazienaveen, Erica, Barger-Compascuum, Nieuw-Amsterdam en Coevorden",
  eco="Emmen is een van de grootste gemeenten van Drenthe, met een mix van industrie, logistiek, zorg en toerisme rond Dierenpark Emmen.",
  bouw="In wijken als Emmerhout, Angelslo en Bargeres staan veel naoorlogse woningen en rijtjeshuizen uit de jaren zeventig en tachtig, waar isolatie, keukens, badkamers en groepenkasten aan vervanging toe zijn.",
  markt="De vraag naar vakmensen komt van huiseigenaren, woningcorporaties, mkb'ers en bedrijven op de bedrijventerreinen. Korte reisafstanden laten een zelfstandige vaak meerdere klussen op één dag combineren, en de nabijheid van Duitsland betekent dat opdrachtgevers soms ook over de grens vergelijken.",
  reis="Vanuit Emmen bereikt u Coevorden, Hoogeveen en Stadskanaal ruwweg binnen een halfuur tot drie kwartier rijden, en ook het Duitse Emsland ligt dichtbij.",
  dba="Industriële opdrachtgevers rond Emmen werken vaak met vaste planningen; een zelfstandige houdt daarom zelf de regie over werkwijze en tijdstip en legt de opdracht vast in een Modelovereenkomst.",
  faq=("Werken ZZP'ers in Emmen ook in de rest van Drenthe en over de grens?", "Veel zelfstandigen in Zuidoost-Drenthe werken regionaal in Drenthe en Groningen en soms net over de grens. Vermeld bij uw klus de exacte locatie, dan reageren alleen passende ZZP'ers. Grensoverschrijdend werk kent eigen regels voor btw en verzekeringen; vraag een adviseur om advies.")),
 "drenthe": dict(naam="Drenthe", stad="Drenthe", regio="Drenthe (Emmen)", f=0.95, steden="Assen, Hoogeveen, Meppel, Coevorden, Emmen en Roden",
  eco="Drenthe combineert landbouw, recreatie en maakindustrie, met Assen als provinciehoofdstad en het TT Circuit als bekende publiekstrekker.",
  bouw="De provincie telt veel vrijstaande woningen, boerderijen en vakantieparken, waardoor onderhoud aan dak, schilderwerk, installaties en tuin een groot deel van de klussen vormt.",
  markt="Omdat de afstanden groot zijn, kijken opdrachtgevers in Drenthe nadrukkelijk naar zelfstandigen uit de eigen omgeving. Voorrijkosten en beschikbaarheid voor spoed verschillen daardoor per gemeente meer dan in de Randstad.",
  reis="Van noord naar zuid is Drenthe zo'n 75 kilometer lang; wie een klus plaatst helpt ZZP'ers door de plaats en een eventuele reisvergoeding te vermelden.",
  dba="Bij seizoensgebonden werk op vakantieparken en boerderijen is het slim om per opdracht een eigen offerte en een korte overeenkomst vast te leggen in plaats van een doorlopend rooster.",
  faq=("Rekenen ZZP'ers in Drenthe voorrijkosten?", "Dat verschilt per zelfstandige en per afstand. Veel vakmensen rekenen binnen hun eigen regio geen of een klein bedrag en daarbuiten een kilometervergoeding. Vraag hiernaar bij het bod en leg het vast in de opdracht.")),
 "groningen": dict(naam="Groningen", stad="Groningen", regio="Groningen", f=0.97, steden="Groningen, Hoogezand, Veendam, Stadskanaal, Delfzijl en Winschoten",
  eco="De stad Groningen leeft van onderwijs, zorg en technologie, met de Rijksuniversiteit, de Hanzehogeschool en de Zernike-campus als motor, terwijl de Eemshaven de energiesector bedient.",
  bouw="Het aardbevingsgebied kent herstel- en versterkingsprogramma's, en de binnenstad en de dorpen hebben veel oudere panden en boerderijen die onderhoud en verduurzaming vragen.",
  markt="De combinatie van studentenwoningen, verhuurders, kantoren en versterkingswerk zorgt voor een stabiele vraag naar elektriciens, loodgieters, timmerlieden en schilders. Particuliere opdrachtgevers concurreren met projecten van aannemers om dezelfde zelfstandigen.",
  reis="Vanuit de stad Groningen is Delfzijl, Veendam of Winschoten in ongeveer een halfuur te bereiken, en Assen of Leeuwarden in grofweg drie kwartier.",
  dba="Als onderaannemer op een versterkingsproject werkt u onder een hoofdaannemer; zorg dat u eigen gereedschap, eigen planning en een resultaatgerichte opdracht heeft zodat de zelfstandigheid duidelijk blijft.",
  faq=("Zijn er klussen door de aardbevingsversterking in Groningen?", "In het aardbevingsgebied lopen programma's voor schadeherstel en versterking, die meestal via aannemers worden uitgevoerd. ZZP'ers kunnen daar als onderaannemer aan meewerken. Particuliere klussen plaatst u gewoon via ATAS ZZP.")),
 "overijssel-zwolle": dict(naam="Overijssel en Zwolle", stad="Zwolle", regio="Overijssel", f=1.0, steden="Zwolle, Deventer, Kampen, Enschede, Hengelo en Almelo",
  eco="Zwolle is een Hanzestad met een sterke logistieke ligging, terwijl Twente rond Enschede en Hengelo bekendstaat om techniek en maakindustrie.",
  bouw="Naast een historische binnenstad zijn er grote nieuwbouwwijken zoals Stadshagen, waar zonnepanelen, laadpalen en tuinaanleg vaak op de wensenlijst staan.",
  markt="Door de centrale ligging werken veel zelfstandigen vanuit Zwolle voor klanten in zowel Drenthe, Flevoland als Gelderland. Dat vergroot het aanbod, maar ook de concurrentie op prijs bij standaardwerk.",
  reis="Zwolle ligt op een knooppunt van de A28 en de A50; Deventer, Kampen en Hardenberg liggen binnen ongeveer een half uur.",
  dba="In de logistiek rond Zwolle is veel inhuur van chauffeurs; wees alert op een vast rooster en bedrijfsvoertuig, die de Belastingdienst als aanwijzing voor loondienst kan zien.",
  faq=("Werken Twentse en Zwolse ZZP'ers ook elkaars regio?", "Ja, veel zelfstandigen bedienen heel Overijssel en de aangrenzende regio's. Geef bij uw klus de plaats op, dan ziet u wie binnen redelijke afstand wil reageren.")),
 "friesland-leeuwarden": dict(naam="Friesland en Leeuwarden", stad="Leeuwarden", regio="Friesland", f=0.95, steden="Leeuwarden, Sneek, Heerenveen, Drachten, Harlingen en Franeker",
  eco="Friesland is bekend van de Friese meren, de watersport en de landbouw, en Leeuwarden profiteerde als Culturele Hoofdstad van Europa in 2018 van extra investeringen.",
  bouw="Stelpboerderijen, woonboerderijen en dorpswoningen hebben veel houtwerk en grote daken, terwijl de recreatie voor veel botenhuizen en vakantiewoningen zorgt.",
  markt="De vraag is seizoensgebonden: in het voorjaar en de zomer pieken verbouw- en onderhoudsklussen aan recreatieobjecten, in de rest van het jaar komt het werk vooral van huiseigenaren en agrarische bedrijven.",
  reis="Leeuwarden, Sneek en Heerenveen liggen in een driehoek van ruwweg 30 kilometer; naar de Waddenkust is het circa een halfuur extra.",
  dba="Zelfstandigen die voor meerdere vakantieparken werken, bouwen vanzelf een eigen klantenkring op, wat helpt bij de beoordeling van zelfstandigheid.",
  faq=("Kan ik een ZZP'er vinden voor werk op een Waddeneiland of aan de kust?", "Vermeld duidelijk de locatie en eventuele veerboot- of reistijd. Sommige zelfstandigen werken graag aan de kust, anderen rekenen een toeslag. Zo voorkomt u verrassingen in de offerte.")),
 "noord-holland-amsterdam": dict(naam="Noord-Holland en Amsterdam", stad="Amsterdam", regio="Noord-Holland", f=1.12, steden="Amsterdam, Haarlem, Alkmaar, Zaandam, Hilversum en Amstelveen",
  eco="Amsterdam combineert de Zuidas, creatieve bureaus, toerisme en de luchthaven Schiphol, wat voor een brede vraag naar vakmensen zorgt.",
  bouw="Grachtenpanden, naoorlogse flats en appartementencomplexen met een VvE bepalen het beeld; oude funderingen, houten vloeren en smalle trappenhuizen maken verbouwen maatwerk.",
  markt="Door hoge woningprijzen en veel VvE-onderhoud is de vraag groot, maar parkeerkosten, laad- en lostijden en een milieuzone drukken de praktische kosten. Zelfstandigen met een goed bereikbare werkplek en schone bus hebben daar een voorsprong.",
  reis="Vanuit Amsterdam bereikt u Haarlem, Zaandam en Almere in circa 20 tot 40 minuten, afhankelijk van de spits.",
  dba="Grote opdrachtgevers in Amsterdam hanteren strenge compliance-eisen; een Modelovereenkomst en duidelijke deliverables worden vaak al bij het eerste gesprek gevraagd.",
  faq=("Waarom zijn tarieven in Amsterdam hoger dan elders?", "Zelfstandigen hebben in de stad hogere kosten voor parkeren, bereikbaarheid en werkruimte, en de vraag is groot. Daardoor liggen uurtarieven gemiddeld hoger dan in Noord- of Oost-Nederland.")),
 "zuid-holland-rotterdam-den-haag": dict(naam="Zuid-Holland, Rotterdam en Den Haag", stad="Rotterdam", regio="Zuid-Holland", f=1.08, steden="Rotterdam, Den Haag, Delft, Leiden, Dordrecht en Zoetermeer",
  eco="De haven van Rotterdam, de tuinbouw van het Westland, de overheid in Den Haag en de TU Delft zorgen voor een zeer gevarieerde arbeidsmarkt.",
  bouw="Rotterdam-Zuid en veel wijken in Den Haag worden gerenoveerd, naast de industriële gebouwen rond Botlek en Europoort en de grote kassencomplexen.",
  markt="Haven en industrie vragen om VCA-gecertificeerde zelfstandigen, terwijl particuliere opdrachtgevers in steden als Delft en Leiden meer op prijs en referenties letten. Hierdoor loopt de tariefspreiding in de provincie sterk uiteen.",
  reis="De Randstad is dichtbevolkt; Rotterdam, Den Haag en Delft liggen binnen 20 tot 40 minuten, al maakt de spits het verschil.",
  dba="Havenbedrijven eisen vaak VCA, een AVB en een Modelovereenkomst vooraf; zelfstandigen die dat op orde hebben, krijgen sneller toegang tot grotere opdrachten.",
  faq=("Is een VCA-certificaat verplicht voor werk in de haven?", "Veel havenbedrijven en industriële opdrachtgevers eisen VCA van de mensen die op locatie werken. Het staat niet in de wet, maar wel in hun inkoopvoorwaarden. Zelfstandigen kunnen het VCA-vinkje op hun profiel zelf aangeven.")),
 "utrecht": dict(naam="Utrecht", stad="Utrecht", regio="Utrecht", f=1.10, steden="Utrecht, Amersfoort, Nieuwegein, Zeist, Houten en Veenendaal",
  eco="Utrecht ligt centraal in Nederland en combineert de Jaarbeurs, het universitair medisch centrum en veel kantoren en technologiebedrijven.",
  bouw="Nieuwbouwwijken als Leidsche Rijn staan naast jaren-dertigwoningen en monumentale panden; door de hoge woningprijzen kiezen veel bewoners voor verbouwen in plaats van verhuizen.",
  markt="De centrale ligging maakt dat Utrechtse zelfstandigen ook in Gelderland, Noord-Holland en Zuid-Holland werken. Voor opdrachtgevers betekent dat veel keuze, maar vraagt het om duidelijke planning in de spits.",
  reis="Vanuit Utrecht bereikt u Amersfoort, Nieuwegein en Zeist binnen 20 tot 30 minuten en Amsterdam of Rotterdam in ruwweg drie kwartier.",
  dba="Utrechtse opdrachtgevers in zorg en onderwijs werken veel met inhuur; zij verwachten een duidelijke opdrachtomschrijving en een Modelovereenkomst.",
  faq=("Werken Utrechtse ZZP'ers ook in de rest van het land?", "Door de centrale ligging doen veel zelfstandigen opdrachten in meerdere provincies. Vermeld daarom altijd de locatie, dan weet de ZZP'er direct of het binnen zijn werkgebied past.")),
 "noord-brabant-eindhoven": dict(naam="Noord-Brabant en Eindhoven", stad="Eindhoven", regio="Noord-Brabant", f=1.03, steden="Eindhoven, Tilburg, Breda, Den Bosch, Helmond en Veldhoven",
  eco="Rond Eindhoven draait de Brainportregio op de High Tech Campus, ASML in Veldhoven en een groot netwerk van toeleveranciers, terwijl Tilburg, Breda en Den Bosch sterk zijn in logistiek en dienstverlening.",
  bouw="Door de snelle groei van Brainport worden er veel woningen en bedrijfsunits gebouwd, naast bestaande wijken die verduurzaamd worden.",
  markt="Technische specialisten, installateurs en IT'ers zijn schaars; daardoor stijgen tarieven en wordt snelle reactie belangrijk. Opdrachtgevers die helder zijn over scope en planning, vinden sneller een geschikte zelfstandige.",
  reis="Eindhoven, Helmond en Veldhoven liggen dicht bij elkaar; Tilburg en Den Bosch zijn in ruwweg een halfuur bereikbaar.",
  dba="Hightechbedrijven werken veel met detachering en inhuur; een resultaatgerichte opdracht en het zelf inbrengen van specialistische kennis maken het verschil met loondienst.",
  faq=("Waarom is techniekwerk in Brainport duurder?", "Er is een tekort aan technisch gekwalificeerde zelfstandigen en veel hightechbedrijven hebben spoedeisende vragen. Dat drijft tarieven op; vraag daarom vooraf een duidelijke scope en planning.")),
 "gelderland-arnhem-nijmegen": dict(naam="Gelderland, Arnhem en Nijmegen", stad="Arnhem en Nijmegen", regio="Gelderland", f=1.0, steden="Arnhem, Nijmegen, Apeldoorn, Ede, Doetinchem en Tiel",
  eco="Gelderland loopt van de Veluwe en de Achterhoek tot de Betuwe, met Arnhem en Nijmegen als stedelijke kernen en Apeldoorn als grote gemeente.",
  bouw="Aan de Waal groeit Nijmegen met nieuwe woonwijken, terwijl op de Veluwe en in de Achterhoek veel vrijstaande woningen en recreatiewoningen onderhoud vragen.",
  markt="De provincie is groot en divers: in de steden speelt verbouw en verduurzaming, op het platteland agrarisch en recreatief werk. Zelfstandigen specialiseren zich vaak in een kernregio zoals de Achterhoek of de Betuwe.",
  reis="Arnhem en Nijmegen liggen ruwweg 20 minuten van elkaar; naar Apeldoorn of Doetinchem is het circa een halfuur.",
  dba="Voor seizoenswerk in fruitteelt en recreatie gelden andere afspraken dan bij langdurige inhuur in de zorg; stem de opdrachtvorm daarop af.",
  faq=("In welke delen van Gelderland zijn de meeste klussen?", "De vraag is groot rond Arnhem, Nijmegen en Apeldoorn, maar ook de Achterhoek en Betuwe kennen veel particuliere verbouwingen. Vermeld de exacte plaats in uw klus.")),
 "limburg-maastricht": dict(naam="Limburg en Maastricht", stad="Maastricht", regio="Limburg", f=0.97, steden="Maastricht, Heerlen, Sittard-Geleen, Venlo, Roermond en Weert",
  eco="Limburg grenst aan België en Duitsland en combineert Maastricht als cultuur- en studentenstad met de chemie van Chemelot en de logistiek van Greenport Venlo.",
  bouw="Mergelstenen gebouwen, vakwerk en oude binnensteden vragen om specialistisch onderhoud, naast moderne bedrijventerreinen en vakantieparken in het heuvelland.",
  markt="Door de grensligging werken veel Limburgse zelfstandigen ook in Duitsland en België, wat het aanbod kan beperken voor binnenlandse klussen. Wie een duidelijke opdracht plaatst, vindt vaak toch snel een reactie.",
  reis="Maastricht, Heerlen en Sittard-Geleen liggen binnen ongeveer een half uur van elkaar; Venlo en Roermond zijn in grofweg drie kwartier bereikbaar.",
  dba="Bij grensoverschrijdend werk spelen ook buitenlandse regels voor sociale zekerheid en belasting; raadpleeg een adviseur voordat u een langlopende opdracht aangaat.",
  faq=("Werken Limburgse ZZP'ers ook in België en Duitsland?", "Veel zelfstandigen doen dat. Voor werk over de grens gelden aparte afspraken over btw, verzekeringen en sociale zekerheid. Maak daarom een duidelijke opdracht en vraag een adviseur om hulp.")),
 "flevoland-almere": dict(naam="Flevoland en Almere", stad="Almere", regio="Flevoland", f=1.0, steden="Almere, Lelystad, Dronten, Emmeloord en Zeewolde",
  eco="Flevoland is de jongste provincie, met Almere als groeiende stad, Lelystad met zijn luchthaven en de Noordoostpolder als agrarisch centrum.",
  bouw="De provincie bestaat grotendeels uit woningen van na 1970, met veel nieuwbouw, waardoor zonnepanelen, tuinaanleg, keukens en badkamers populaire klussen zijn.",
  markt="De bevolking groeit snel, maar het aanbod van vakmensen is kleiner dan in de Randstad. Opdrachtgevers die helder zijn over planning en materiaal, vinden daardoor eerder een geschikte zelfstandige.",
  reis="Almere ligt ruwweg 25 minuten van Amsterdam en Utrecht, en Lelystad en Dronten zijn binnen een halfuur te bereiken.",
  dba="In de nieuwbouwketen werken veel zelfstandigen als onderaannemer; leg afspraken over materiaal, gereedschap en oplevering vast in een schriftelijke opdracht.",
  faq=("Vind ik in Flevoland ook ZZP'ers voor nieuwbouwwoningen?", "Ja. In Almere, Lelystad en omliggende gemeenten werken veel zelfstandigen aan oplevering en afwerking van nieuwbouw. Vermeld in de klus of het om opleverpunten of een nieuwe uitbreiding gaat.")),
 "zeeland": dict(naam="Zeeland", stad="Zeeland", regio="Zeeland", f=0.96, steden="Middelburg, Vlissingen, Goes, Terneuzen en Zierikzee",
  eco="Zeeland draait op toerisme, havens en industrie, met de Deltawerken als icoon, het Sloegebied bij Vlissingen en de kerncentrale bij Borssele.",
  bouw="Dijken, kustpanden, campings en vakantiewoningen bepalen het beeld, naast historische binnensteden zoals Middelburg en Zierikzee.",
  markt="De vraag is sterk seizoensafhankelijk: voor de zomer wordt geschilderd, getimmerd en aangelegd, daarna is er onderhoud en winterklaar maken. Zelfstandigen met kennis van zout en wind in de bouwmaterialen zijn gewild.",
  reis="Het schiereilandkarakter betekent dat de reistijd tussen eilanden langer kan zijn dan de afstand doet vermoeden; vermeld dit bij uw klus.",
  dba="Voor seizoenswerk op campings en in de recreatie is het gebruikelijk dat een zelfstandige voor meerdere opdrachtgevers werkt; dat ondersteunt de beoordeling van zelfstandigheid.",
  faq=("Is er in Zeeland meer werk in de zomer?", "Ja, in en rond de recreatie piekt de vraag voor schilderen, timmeren en tuinaanleg in het voorjaar. Plaats uw klus daarom tijdig, bij voorkeur in februari of maart.")),
}
# stad -> regio slug (voor combinaties)
STAD = {"emmen": "emmen", "groningen": "groningen", "zwolle": "overijssel-zwolle", "leeuwarden": "friesland-leeuwarden", "amsterdam": "noord-holland-amsterdam",
        "rotterdam": "zuid-holland-rotterdam-den-haag", "utrecht": "utrecht", "eindhoven": "noord-brabant-eindhoven"}
STADNAAM = {"emmen": "Emmen", "groningen": "Groningen", "zwolle": "Zwolle", "leeuwarden": "Leeuwarden", "amsterdam": "Amsterdam", "rotterdam": "Rotterdam", "utrecht": "Utrecht", "eindhoven": "Eindhoven"}

# ---------------------------------------------------------------- vakken
PRO = {
 "elektricien": dict(naam="elektricien", titel="Elektricien", cat="bouw", sub="elektricien", lo=50, hi=75, klussen="een nieuwe groepenkast, laadpalen en zonnepanelen aansluiten, storingen opsporen en elektra keuren",
  wat="Een zelfstandige elektricien legt leidingen aan, vervangt groepenkasten, installeert laadpalen en zonnepanelen en voert keuringen en storingsonderzoek uit.",
  cert="Let op een afgeronde elektrotechnische opleiding, kennis van veilig werken aan elektrische installaties (NEN 3140) en een AVB-verzekering.",
  dba="Een elektricien die eigen gereedschap meeneemt, zelf bepaalt hoe de installatie wordt uitgevoerd en voor meerdere opdrachtgevers werkt, handelt doorgaans als zelfstandige; leg afspraken schriftelijk vast.",
  faq=("Welke papieren hoort een elektricien te leveren?", "Vraag bij grotere werken om een opleverrapport of keuringsverklaring en om het bijgewerkte schema van de groepenkast. Een goede ZZP-elektricien toont ook zijn KvK-inschrijving en AVB-polis.")),
 "schilder": dict(naam="schilder en stucadoor", titel="Schilder en stucadoor", cat="bouw", sub="schilder", lo=40, hi=60, klussen="binnen- en buitenschilderwerk, stucwerk, spuitwerk en behangen",
  wat="Een zelfstandige schilder en stucadoor verzorgt binnen- en buitenschilderwerk, sauswerk, spuitwerk, stucwerk en behang voor particulieren en bedrijven.",
  cert="Vraag naar referenties en foto's van eerder werk; bij buitenschilderwerk zijn veilig steigerwerk en droge weersomstandigheden belangrijk.",
  dba="Een schilder die zelf de werkwijze bepaalt, eigen materiaal inbrengt en eigen planning houdt, is eenvoudig als zelfstandige aan te merken; werk met een duidelijke opdracht per project.",
  faq=("Wordt materiaal in de prijs van een schilder meegerekend?", "Dat verschilt per offerte. Vraag uitdrukkelijk of verf, afplakmateriaal, stucwerk en eventueel steigerhuur zijn inbegrepen en spreek het aantal lagen af.")),
 "loodgieter": dict(naam="loodgieter en installateur", titel="Loodgieter en installateur", cat="bouw", sub="loodgieter-cv", lo=55, hi=80, klussen="sanitair, cv-ketels, leidingwerk, lekkages, badkamers en warmtepompen",
  wat="Een zelfstandige loodgieter en installateur verzorgt sanitair, cv-ketels, leidingwerk, lekkages, badkamers en warmtepompen.",
  cert="Voor werk aan gas en cv gelden eisen; vraag naar een erkende aansluiting of certificaat, en bij airco of warmtepomp naar een F-gassencertificaat.",
  dba="Een installateur die zelf offertes maakt, eigen gereedschap en bus inzet en meerdere klanten heeft, voldoet aan veel kenmerken van zelfstandigheid.",
  faq=("Wanneer is een lekkage een noodgeval?", "Bij een actieve lekkage sluit u de hoofdkraan en belt u een installateur met spoedservice. Ruikt u gas, ga dan naar buiten en bel het storingsnummer van de netbeheerder (0800-9009). ZZP'ers kunt u daarna inschakelen voor het herstel.")),
 "timmerman": dict(naam="timmerman en bouwvakker", titel="Timmerman en bouw", cat="bouw", sub="timmerman", lo=45, hi=65, klussen="kozijnen, vloeren, keukens, dakkapellen, aanbouwen en schuttingen",
  wat="Een zelfstandige timmerman plaatst kozijnen, vloeren en keukens en bouwt dakkapellen, uitbouwen en schuttingen.",
  cert="Bij verbouwingen kan een omgevingsvergunning nodig zijn; vraag de timmerman wie dit regelt en laat de planning, het materiaal en de oplevermomenten in de offerte opnemen.",
  dba="Een timmerman die zelf het werk organiseert, eigen materiaal inbrengt en een eigen offerte maakt, werkt doorgaans als zelfstandige; wees voorzichtig met vaste diensten naast een aannemer.",
  faq=("Is een omgevingsvergunning nodig voor een dakkapel of uitbouw?", "Vaak is dat niet nodig als de dakkapel of uitbouw binnen de regels voor vergunningvrij bouwen blijft, maar het hangt af van de situatie. Controleer dit via het Omgevingsloket of uw gemeente; een zelfstandige kan het voor u uitzoeken.")),
 "transport": dict(naam="chauffeur en transport", titel="Transport en chauffeur", cat="logistiek", sub="chauffeur-ce/c", lo=35, hi=50, klussen="regioritten, koerierswerk met eigen bus, heftruckwerk en logistieke planning",
  wat="Een zelfstandige chauffeur rijdt met een eigen of ingehuurd voertuig regioritten, koerierswerk en piekdrukte-ritten, of werkt als heftruckchauffeur en logistiek planner.",
  cert="Voor beroepsvervoer is een rijbewijs C of CE met Code 95 nodig; vraag ook naar verzekering, vervoersvergunning en eigen voertuig.",
  dba="Chauffeurs vallen sneller onder gezag; een eigen voertuig, eigen planning en meerdere opdrachtgevers helpen. Gebruik een Modelovereenkomst en wees voorzichtig met vaste diensten in een bedrijfsrooster.",
  faq=("Mag een ZZP-chauffeur met mijn bedrijfswagen rijden?", "Dat is voor de Belastingdienst een duidelijk signaal richting loondienst. Werk liever met een eigen voertuig. Kan dat niet, leg dan goed vast waarom en laat de situatie beoordelen.")),
 "it": dict(naam="IT'er en webspecialist", titel="IT en web", cat="it", sub="web-developer", lo=70, hi=110, klussen="webontwikkeling, systeembeheer, data en AI en cybersecurity",
  wat="Een zelfstandige IT-specialist bouwt websites en webshops, beheert systemen, werkt met data en AI of verzorgt cybersecurity voor mkb en grotere organisaties.",
  cert="Vraag naar referenties en een portfolio, en naar een beroepsaansprakelijkheidsverzekering en een AVB; bij werk met persoonsgegevens is een verwerkersovereenkomst nodig.",
  dba="Bij langdurige inhuur van IT'ers is Wet DBA een belangrijk punt; kies een resultaatgerichte opdracht met duidelijke deliverables en zonder vaste werkplek of werktijden.",
  faq=("Moet ik een verwerkersovereenkomst afsluiten met een ZZP'er?", "Zodra een IT'er toegang krijgt tot persoonsgegevens, bijvoorbeeld in een webshop of klantenbestand, vraagt de AVG om een verwerkersovereenkomst. Een ervaren zelfstandige heeft hiervoor een standaarddocument.")),
 "schoonmaak": dict(naam="zakelijke schoonmaker", titel="Zakelijke schoonmaak", cat="schoonmaak", sub="zakelijke-schoonmaak", lo=25, hi=38, klussen="kantoren, praktijkruimtes, winkels en glasbewassing",
  wat="Een zelfstandige schoonmaker verzorgt periodieke schoonmaak van kantoren, praktijken en winkels, aangevuld met glasbewassing en grondige schoonmaak.",
  cert="Spreek een schoonmaakprotocol, frequentie en middelen af en vraag naar een AVB; werkt u in gevoelige ruimtes, dan is een VOG een logische aanvulling.",
  dba="In de schoonmaak wordt extra kritisch gekeken naar schijnzelfstandigheid; werk daarom met duidelijke opdrachten, eigen middelen en eigen planning.",
  faq=("Welke frequentie is gebruikelijk voor een kantoor?", "Veel kantoren kiezen voor één tot drie keer per week met periodiek extra werk zoals ramen en vloeren. De beste frequentie hangt af van bezetting en oppervlak.")),
 "hovenier": dict(naam="hovenier en stratenmaker", titel="Hovenier en bestrating", cat="tuin", sub="bestrating-en-straatwerk", lo=40, hi=60, klussen="tuinaanleg, bestrating, schuttingen en groenonderhoud",
  wat="Een zelfstandige hovenier legt tuinen aan, bestraat opritten en terrassen, plaatst schuttingen en verzorgt groenonderhoud en snoeiwerk.",
  cert="Vraag bij bestrating naar de opbouw van de ondergrond en de afwatering, en bij grotere tuinaanleg naar een beplantingsplan en onderhoudsadvies.",
  dba="Een hovenier met eigen machines en meerdere klanten werkt doorgaans zelfstandig; leg bij vast onderhoud de afspraken vast per seizoen en niet als rooster.",
  faq=("Wat kost bestrating per m²?", "Dat loopt sterk uiteen met tegel, afwerking, ondergrond en uitgraven. Gebruik de richtbegroting in de wizard voor een indicatie en vraag de hovenier om een gespecificeerde offerte.")),
}

# (stad, vak): (hook, klus, tip)
COMBO = {
 ("elektricien", "emmen"): ("In Emmen en omgeving combineren veel elektriciens woningwerk met onderhoud bij bedrijven op de bedrijventerreinen.", "Denk aan het vervangen van een verouderde groepenkast in een jaren-zeventigwoning in Emmerhout of het aansluiten van een laadpaal bij een gezin in Klazienaveen.", "Vraag bij woningen van vóór 1990 of de aardlekschakelaar en groepenindeling worden meegenomen in de offerte."),
 ("schilder", "emmen"): ("Zuidoost-Drenthe kent veel rijtjeswoningen en vrijstaande woningen waar schilderwerk eens per zeven tot tien jaar terugkeert.", "Een gevel en kozijnen van een woning in Angelslo opknappen voordat het najaar begint.", "Plan buitenwerk van mei tot september; in Drenthe wordt het in de herfst snel te vochtig voor verf."),
 ("loodgieter", "emmen"): ("Emmen heeft veel naoorlogse woningen met leidingwerk dat aan vervanging toe is.", "Een cv-ketel vervangen en meteen de radiatorkranen en leidingen nakijken in een woning in Bargeres.", "Vraag om een offerte inclusief afvoer van de oude ketel en een onderhoudsbeurt in het eerste jaar."),
 ("timmerman", "emmen"): ("Aanbouw, dakkapel en nieuwe keukens zijn in Emmen populaire klussen, omdat de woningen ruim zijn.", "Een dakkapel plaatsen op een rijtjeswoning en daarbij het dak en de dakbedekking laten nakijken.", "Check bij uw gemeente of de dakkapel vergunningvrij is en vraag de timmerman om de aanvraag voor u te verzorgen."),
 ("hovenier", "emmen"): ("Ruime tuinen en oprijlanen zorgen in Emmen voor veel bestratings- en groenonderhoudsklussen.", "Een nieuwe oprit en terras aanleggen bij een vrijstaande woning in Erica.", "Laat de ondergrond professioneel verdichten; goedkoop straatwerk zakt in zandgrond vaak binnen enkele jaren."),
 ("transport", "emmen"): ("De ligging nabij de Duitse grens maakt Emmen interessant voor regio- en grensritten.", "Een chauffeur CE voor ritten naar Groningen, Zwolle en het Duitse Emsland tijdens een drukke periode.", "Spreek vooraf af wie voor brandstof, tol en verzekering zorgt, zeker bij ritten over de grens."),
 ("schoonmaak", "emmen"): ("Praktijkruimtes, kantoren en winkels in het centrum van Emmen kiezen steeds vaker voor een vaste zelfstandige schoonmaker.", "Een wekelijkse schoonmaak voor een tandartspraktijk met een periodieke glasbewassing.", "Maak afspraken over sleutelbeheer en alarmcode, zodat de schoonmaker ook buiten openingstijden kan werken."),
 ("elektricien", "groningen"): ("In de stad Groningen draait veel om studentenwoningen, kantoren en nieuwbouw rond Zernike en het Europapark.", "Het nakijken van de elektra in een verhuurd pand met meerdere kamers voordat nieuwe huurders intrekken.", "Verhuurders doen er goed aan keuringsrapport en groepenschema te laten vastleggen."),
 ("schilder", "groningen"): ("Groninger boerderijen en stadspanden vragen om vakwerk dat bij oudere details past.", "Een voorgevel van een pand in de binnenstad schilderen met aandacht voor houtrot in de kozijnen.", "Vraag of het herstellen van houtrot in de prijs zit; dat is vaak het grootste verschil tussen offertes."),
 ("loodgieter", "groningen"): ("Veel Groningse woningen worden verduurzaamd, waardoor verwarmingsinstallaties en leidingwerk vaak samen worden aangepakt.", "Een hybride warmtepomp laten plaatsen en de radiatoren daarop afstemmen.", "Laat de installateur een warmteverliesberekening maken voordat u een warmtepomp kiest."),
 ("timmerman", "groningen"): ("Door herstel- en versterkingsprogramma's in het aardbevingsgebied is er veel werk voor timmerlieden en onderaannemers.", "Het herstellen van kozijnen, vloeren en afwerking na schade in een woning in het Groninger land.", "Leg schriftelijk vast welke werkzaamheden onder een schadevergoeding vallen en welke u zelf betaalt."),
 ("it", "groningen"): ("Door de universiteit, de Hanzehogeschool en veel startups heeft Groningen een sterke IT-arbeidsmarkt.", "Een webshop laten koppelen met een voorraad- en boekhoudsysteem voor een mkb-bedrijf.", "Vraag een IT'er altijd om opleverdocumentatie, zodat u niet afhankelijk blijft."),
 ("schoonmaak", "groningen"): ("Studentenhuizen, praktijken en kantoren op Zernike en in de binnenstad zorgen voor een stabiele vraag naar schoonmaak.", "Periodieke schoonmaak van een gedeeld kantoorpand met meerdere huurders.", "Verdeel kosten eerlijk over huurders en spreek een duidelijk protocol voor gezamenlijke ruimtes af."),
 ("elektricien", "zwolle"): ("Zwolle groeit met nieuwbouwwijken zoals Stadshagen, waar laadpalen en zonnepanelen vaak al op de wensenlijst staan.", "Een laadpaal en slimme meter-aansluiting plaatsen bij een nieuwbouwwoning.", "Controleer of uw aansluiting geschikt is voordat u een snellader kiest."),
 ("transport", "zwolle"): ("Zwolle ligt op een knooppunt van de A28 en de A50 en is een logistieke draaischijf.", "Een chauffeur voor ritten tussen distributiecentra op Hessenpoort en de Randstad.", "Spreek rij- en rusttijden en laad- en lostijden duidelijk af; wachttijden drukken anders op het uurtarief."),
 ("timmerman", "zwolle"): ("In de Zwolse binnenstad en de omliggende dorpen staan veel oudere panden waar nauwkeurig timmerwerk gevraagd wordt.", "Kozijnen vervangen in een jaren-dertigwoning met behoud van de uitstraling.", "Vraag of HR++-glas en ventilatievoorzieningen worden meegenomen in de prijs."),
 ("it", "zwolle"): ("Zwolle heeft een groeiend IT-ecosysteem met zorg- en logistieke bedrijven die behoefte hebben aan koppelingen en beheer.", "Het beheer van een kleine kantoor-IT-omgeving uitbesteden aan een zelfstandige systeembeheerder.", "Spreek reactietijden en back-upafspraken schriftelijk af."),
 ("schilder", "leeuwarden"): ("Friese boerderijen en stadshuizen in Leeuwarden hebben veel houtwerk dat regelmatig onderhoud nodig heeft.", "Het schilderen van de kozijnen en dakranden van een stelpboerderij.", "Door de vochtige zeelucht is een goede voorbehandeling belangrijker dan het merk verf."),
 ("timmerman", "leeuwarden"): ("Door de watersport en recreatie rond de Friese meren is er veel werk aan steigers, huisjes en botenhuizen.", "Een botenhuis of vakantiewoning bij de Friese meren laten verbouwen.", "Controleer of de locatie onder waterschap- of natuurregels valt voordat u bouwplannen maakt."),
 ("loodgieter", "leeuwarden"): ("In landelijke delen van Friesland liggen woningen ver uit elkaar, dus reistijd weegt zwaar in de offerte.", "Een cv-ketel vervangen in een woonboerderij buiten Leeuwarden.", "Vraag naar voorrijkosten en beschikbaarheid voor spoed, die verschillen in dunbevolkte gebieden."),
 ("elektricien", "amsterdam"): ("Amsterdamse panden hebben soms nog oude installaties en dikke muren, waardoor leidingwerk maatwerk is.", "De elektra vernieuwen in een benedenwoning in een grachtenpand.", "Houd rekening met parkeertijd en laad- en loskosten in de binnenstad bij het vergelijken van offertes."),
 ("schilder", "amsterdam"): ("In Amsterdam draait schilderwerk vaak om VvE-onderhoud, gevels en appartementen.", "Het schilderen van het trappenhuis en de gevel van een appartementencomplex namens een VvE.", "Een VvE heeft vaak meerdere offertes en een besluit nodig; vraag daarom om een gespecificeerde begroting."),
 ("loodgieter", "amsterdam"): ("In oudere Amsterdamse woningen komt oud leidingwerk vaak aan het licht bij verbouwingen.", "Een lekkende badkamerafvoer vervangen in een bovenwoning.", "Meld bij een bovenwoning altijd even aan de bewoners beneden en stem werktijden af met de VvE."),
 ("it", "amsterdam"): ("De Zuidas, startups en bureaus in Amsterdam zorgen voor veel vraag naar zelfstandige IT-specialisten.", "Een data-analist inhuren om dashboards voor een scale-up te bouwen.", "Wees alert op de Wet DBA bij langdurige inhuur en kies een resultaatgerichte opdracht met duidelijke deliverables."),
 ("schoonmaak", "amsterdam"): ("Kantoren, hotels en horeca in Amsterdam vragen om flexibele, betrouwbare schoonmaak in de ochtend en avond.", "Een boutique-hotel dat een zelfstandige schoonmaker zoekt voor kamers en gangen.", "Spreek buffertijd af voor drukte en late uitcheck; die verschillen in een toeristische stad per weekdag."),
 ("elektricien", "rotterdam"): ("Rond de haven en in Rotterdam-Zuid is veel industrie en woningrenovatie, waardoor elektriciens volop werk hebben.", "Een nieuwe groepenkast plaatsen in een bedrijfsruimte met meerdere werkplekken.", "Vraag in industriële omgevingen om een VCA-certificaat; veel opdrachtgevers eisen dat vooraf."),
 ("loodgieter", "rotterdam"): ("Rotterdam renoveert veel naoorlogse woningen en jaren-dertigwoningen, waarbij badkamer en cv samen worden aangepakt.", "Een complete badkamerrenovatie met nieuwe afvoer en vloerverwarming.", "Laat vloerverwarming zo aansluiten dat toekomstig onderhoud goedkoop blijft."),
 ("transport", "rotterdam"): ("De Rotterdamse haven en distributiecentra zorgen voor een continue vraag naar chauffeurs en koeriers.", "Een chauffeur voor containerwerk of een koerier met eigen bus voor piekdrukte.", "Controleer toegangsregels en pasjes voor havenlocaties en reken wachttijden bij terminals mee."),
 ("timmerman", "rotterdam"): ("Door renovatieprojecten en nieuwe woningen is er in Rotterdam veel vraag naar timmerwerk.", "Het verbouwen van een benedenwoning met een nieuwe tussenwand en vloer.", "Vraag bij tussenwanden naar geluidsisolatie; in Rotterdamse portiekwoningen is dat vaak het grootste ergernispunt."),
 ("elektricien", "utrecht"): ("In Utrecht en Leidsche Rijn staan veel woningen met moderne installaties waar uitbreiding en verduurzaming om vragen.", "Zonnepanelen met een thuisbatterij aansluiten op de bestaande groepenkast.", "Laat controleren of de meterkast voldoende ruimte heeft voor een omvormer en extra groepen."),
 ("timmerman", "utrecht"): ("Door de hoge woningprijzen in Utrecht kiezen veel bewoners voor verbouwen in plaats van verhuizen.", "Een uitbouw aan de achterzijde of een zolder verbouwen tot slaapkamer.", "Vraag om een planning met tussentijdse oplevermomenten, want verbouwingen in een bewoonde woning lopen snel uit."),
 ("it", "utrecht"): ("De Utrechtse regio heeft veel gezondheids-, onderwijs- en technologiebedrijven die structureel IT-specialisten inhuren.", "Een systeembeheerder voor een mkb-kantoor dat naar de cloud migreert.", "Leg beveiligingsafspraken zoals 2FA en back-ups vast in de opdracht."),
 ("schilder", "utrecht"): ("Utrechtse jaren-dertigwoningen en monumentale panden vragen om vakmanschap bij schilderwerk en stucwerk.", "Het binnenschilderwerk van een complete woning na een verbouwing.", "Vraag om een stappenplan met plamuren, voorstrijken en aantal lagen, zodat offertes vergelijkbaar zijn."),
 ("elektricien", "eindhoven"): ("Rond Brainport Eindhoven zijn veel techniekbedrijven en nieuwbouwwijken die elektriciens nodig hebben.", "Een elektra-installatie in een nieuwe bedrijfsunit met hoge eisen aan veiligheid en meetpunten.", "Voor technische bedrijfspanden is ervaring met meet- en regeltechniek vaak belangrijker dan algemeen woningwerk."),
 ("it", "eindhoven"): ("De Brainportregio trekt veel hightechbedrijven aan, wat de vraag naar embedded-, data- en cybersecurity-specialisten stuwt.", "Een cybersecurity-audit voor een toeleverancier in de maakindustrie.", "Definieer scope en rapportage vooraf; dat voorkomt dat een audit uitgroeit tot eindeloos advies."),
 ("transport", "eindhoven"): ("Eindhoven ligt centraal tussen Antwerpen, Rotterdam en het Ruhrgebied, wat transportbewegingen vergroot.", "Een chauffeur voor internationale ritten of koeriersritten voor een hightech toeleverancier.", "Voor internationaal vervoer zijn een CMR-verzekering en de juiste vergunningen belangrijk; vraag ernaar."),
}
assert len(COMBO) == 36

# ---------------------------------------------------------------- hulpfuncties
def r5(x): return int(round(x / 5.0) * 5)
def h3(slug, n): return zlib.crc32(slug.encode()) % n
def euro(x): return "€ " + str(x)
def prijs(pro, reg): p = PRO[pro]; f = REG[reg]["f"]; return r5(p["lo"] * f), r5(p["hi"] * f)
def combo_file(pro, stad): return f"zzp-{pro}-{stad}.html"
def reg_file(slug): return f"zzp-{slug}.html"
def qs(cat, sub, regio): return f"plaatsen.html?cat={cat}&sub={sub.replace('/', '%2F')}&regio={regio.replace(' ', '%20')}"

HEAD = """<!doctype html>
<html lang="nl-NL"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#ffffff">
<link rel="icon" type="image/svg+xml" href="favicon.svg"><link rel="stylesheet" href="style.css?v={v}"><link rel="stylesheet" href="zzp.css?v={v}">
<title>{title}</title><meta name="description" content="{desc}"><meta name="robots" content="index, follow, max-image-preview:large">
<link rel="canonical" href="{url}"><link rel="alternate" hreflang="nl-NL" href="{url}">
<meta property="og:type" content="website"><meta property="og:locale" content="nl_NL"><meta property="og:site_name" content="ATAS ZZP Netwerk"><meta property="og:title" content="{title}"><meta property="og:description" content="{desc}"><meta property="og:url" content="{url}">
<script type="application/ld+json">{ld}</script></head>
<body data-page="info"><script>document.documentElement.classList.add('js')</script>
<div class="glow" aria-hidden="true"><i></i><i></i><i></i></div><a class="skip" href="#inhoud">Direct naar de inhoud</a>
<header class="site"><div class="wrap hz"><a class="logo" href="index.html" aria-label="ATAS ZZP, naar de homepage"><img src="logo-zzp.svg?v={v}" alt="ATAS ZZP" width="190" height="34"></a>
<nav class="hnav" aria-label="Hoofdmenu"><a class="plain" id="nav-account" href="account.html">Inloggen</a><a class="btn pill" href="plaatsen.html">Klus plaatsen</a></nav></div></header>
<main id="inhoud"><div class="wrap seo" style="padding-top:calc(var(--hh) + 18px);padding-bottom:70px">
"""
FOOT = """</div></main>
<footer class="site"><div class="wrap"><img class="flogo" src="logo-zzp.svg?v={v}" alt="ATAS ZZP" width="150" height="30">
<nav class="fnav" aria-label="Informatie"><a href="werkwijze.html">Hoe het werkt</a><a href="regios.html">Werkgebied</a><a href="wet-dba-kvk.html">Wet DBA &amp; KvK Zekerheid</a><a href="voorwaarden.html">Voorwaarden &amp; Privacy</a><a href="plaatsen.html">Klus plaatsen</a></nav>
<p>ATAS ZZP Netwerk · Onderdeel van <a href="https://atasgroup.nl">Atas Group</a> · Emmen, Nederland · Actief in heel Nederland · <a href="mailto:sales@atasgroup.nl">sales@atasgroup.nl</a></p></div></footer>
<script src="config.js"></script><script src="db.js?v={v}"></script><script src="geo.js?v={v}"></script><script src="app.js?v={v}"></script></body></html>
"""

def ld_graph(url, naam, beschr, crumbs, faq, area=None, service=None):
    g = [{"@type": "BreadcrumbList", "itemListElement": [{"@type": "ListItem", "position": i + 1, "name": n, "item": SITE + "/" + (u if u else "")} for i, (n, u) in enumerate(crumbs)]}]
    if service:
        g.append({"@type": "Service", "name": naam, "description": beschr, "serviceType": service, "url": url, "areaServed": {"@type": "AdministrativeArea", "name": area},
                  "provider": {"@type": "Organization", "name": "ATAS ZZP Netwerk", "url": SITE + "/", "email": "sales@atasgroup.nl", "address": {"@type": "PostalAddress", "addressLocality": "Emmen", "addressRegion": "Drenthe", "addressCountry": "NL"}}})
    g.append({"@type": "FAQPage", "mainEntity": [{"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in faq]})
    return json.dumps({"@context": "https://schema.org", "@graph": g}, ensure_ascii=False).replace("<", "\\u003c")

def faq_html(faq):
    return "".join(f"<details><summary><h3>{e(q)}</h3></summary><p>{e(a)}</p></details>" for q, a in faq)

def crumbs_html(items):
    return '<nav class="crumbs" aria-label="Kruimelpad">' + " &rsaquo; ".join(f'<a href="{u}">{e(n)}</a>' if u else f"<span>{e(n)}</span>" for n, u in items) + "</nav>"

# ---------------------------------------------------------------- combinatiepagina
def combo_page(pro, stad):
    p, rslug = PRO[pro], STAD[stad]; r = REG[rslug]; hook, klus, tip = COMBO[(pro, stad)]
    s, n = STADNAAM[stad], p["naam"]; slug = f"{pro}-{stad}"; k = h3(slug, 3)
    lo, hi = prijs(pro, rslug); url = f"{SITE}/{combo_file(pro, stad)}"
    h1 = [f"ZZP {p['titel']} in {s}: vakmensen met KvK", f"{p['titel']} nodig in {s}? Vind een ZZP'er met KvK", f"Zelfstandige {n} in {s} vinden en inhuren"][k]
    title = [f"ZZP {p['titel']} in {s} | Klussen en vakmensen met KvK | ATAS ZZP", f"{p['titel']} ZZP'er in {s}: opdrachten en richtprijs | ATAS ZZP", f"Zelfstandige {n} in {s} inhuren of opdrachten vinden | ATAS ZZP"][k]
    desc = f"{hook} Indicatief {euro(lo)} tot {euro(hi)} per uur excl. btw. Plaats uw klus of reageer als ZZP'er, elk lid met geldig KvK-nummer."
    desc = desc if len(desc) <= 300 else desc[:297] + "…"
    faq = [p["faq"], (f"Wat kost een {n} in {s}?", f"In {s} ligt het indicatieve uurtarief van een zelfstandige {n} meestal tussen {euro(lo)} en {euro(hi)} excl. btw. Voor een dag van acht uur komt dat neer op ongeveer {euro(lo * 8)} tot {euro(hi * 8)}. De werkelijke prijs hangt af van de klus, het materiaal en de spoed; ZZP'ers reageren met hun eigen bod."), r["faq"]]
    sec = [f"Wat doet een {n}?", f"Wat kunt u van een {n} verwachten?", f"Het werk van een {n} in het kort"][h3(slug + "a", 3)]
    sec2 = [f"{s}: de lokale markt", f"Zo ziet de vraag eruit in {s}", f"Klussen in {s} en omgeving"][h3(slug + "b", 3)]
    sec3 = [f"Prijsgids {n} in {s}", f"Wat kost een {n} in {s}?", f"Tarieven {n} in {s} (indicatief)"][h3(slug + "c", 3)]
    cat, sub, regio = p["cat"], p["sub"], r["regio"]
    zelfde_stad = [(pp, ss) for (pp, ss) in COMBO if ss == stad and pp != pro]
    zelfde_vak = [(pp, ss) for (pp, ss) in COMBO if pp == pro and ss != stad]
    links = "".join(f'<li><a href="{combo_file(pp, ss)}">ZZP {e(PRO[pp]["titel"])} in {e(STADNAAM[ss])}</a></li>' for pp, ss in zelfde_stad + zelfde_vak)
    body = f"""{crumbs_html([("Home", "index.html"), ("Werkgebied", "regios.html"), (r["naam"], reg_file(rslug)), (f"{p['titel']} in {s}", None)])}
<h1>{e(h1)}</h1>
<p><strong>{e(hook)}</strong> {e(r['eco'])}</p>
<div class="cta"><a class="btn pill" href="{qs(cat, sub, regio)}">Klus plaatsen in {e(s)}</a><a class="btn ghost" href="index.html?regio={regio.replace(' ', '%20')}&amp;cat={cat}#resultaten">Bekijk open klussen</a></div>
<h2>{e(sec)}</h2><p>{e(p['wat'])} {e(p['cert'])}</p>
<h2>{e(sec2)}</h2><p>{e(r['bouw'])} {e(klus)}</p>
<h2>{e(sec3)}</h2>
<div class="pricebox"><small>Indicatief uurtarief excl. btw, regio {e(r['naam'])}</small><b>{euro(lo)} tot {euro(hi)} per uur</b><small>Dagtarief (8 uur): circa {euro(lo * 8)} tot {euro(hi * 8)}. Geen offerte; ZZP'ers bepalen zelf hun tarief.</small></div>
<p>{e(r['reis'])} {e(tip)}</p>
<h2>Wet DBA en zelfstandigheid</h2><p>{e(p['dba'])} {e(r['dba'])} <a class="back" href="wet-dba-kvk.html">Lees meer over Wet DBA &amp; KvK Zekerheid</a>. Dit is algemene informatie en geen juridisch advies.</p>
<h2>Zo werkt het</h2><ul class="klist"><li>Kies de klus en vul oppervlak, materiaal en eventuele spoed in; u ziet direct een richtbegroting.</li><li>Download uw werkplan als PDF en publiceer met uw KvK-nummer.</li><li>ZZP'ers uit {e(s)} en omgeving reageren met een eigen bod; u neemt direct zakelijk contact op.</li></ul>
<div class="cta"><a class="btn pill" href="{qs(cat, sub, regio)}">Start de wizard</a><a class="btn ghost" href="account.html">Aanmelden als ZZP'er</a></div>
<h2>Veelgestelde vragen</h2><div>{faq_html(faq)}</div>
<h2>Meer in dit werkgebied</h2><ul class="linkgrid"><li><a href="{reg_file(rslug)}">ZZP in {e(r['naam'])}</a></li><li><a href="regios.html">Werkgebied heel Nederland</a></li>{links}</ul>
"""
    ld = ld_graph(url, f"ZZP {p['titel']} in {s}", desc, [("Home", ""), ("Werkgebied", "regios.html"), (r["naam"], reg_file(rslug)), (f"{p['titel']} in {s}", combo_file(pro, stad))], faq, area=r["naam"], service=p["titel"])
    return HEAD.format(v=V, title=e(title), desc=e(desc), url=url, ld=ld) + body + FOOT.format(v=V), title

# ---------------------------------------------------------------- regiopagina
def reg_page(slug):
    r = REG[slug]; url = f"{SITE}/{reg_file(slug)}"; k = h3(slug, 3)
    h1 = [f"ZZP'ers en klussen in {r['naam']}", f"Werkgebied {r['naam']}: vakmensen met KvK", f"Klussen plaatsen of opdrachten vinden in {r['naam']}"][k]
    title = [f"ZZP in {r['naam']} | Klussen en vakmensen met KvK | ATAS ZZP", f"Werkgebied {r['naam']}: ZZP'ers en opdrachten | ATAS ZZP", f"ZZP'er of klus zoeken in {r['naam']}? | ATAS ZZP"][k]
    desc = f"{r['eco']} Bekijk richtprijzen per vak in {r['naam']}, Wet DBA-tips en plaats uw klus. Elk lid heeft een geldig KvK-nummer."
    desc = desc if len(desc) <= 300 else desc[:297] + "…"
    rows = "".join(f'<tr><td>{e(PRO[x]["titel"])}</td><td>{euro(prijs(x, slug)[0])} tot {euro(prijs(x, slug)[1])}</td></tr>' for x in PRO)
    combos = [(pp, ss) for (pp, ss) in COMBO if STAD[ss] == slug]
    cl = "".join(f'<li><a href="{combo_file(pp, ss)}">ZZP {e(PRO[pp]["titel"])} in {e(STADNAAM[ss])}</a></li>' for pp, ss in combos)
    cl = cl or "".join(f'<li><a href="{qs(PRO[x]["cat"], PRO[x]["sub"], r["regio"])}">{e(PRO[x]["titel"])} zoeken of plaatsen</a></li>' for x in list(PRO)[:4])
    faq = [r["faq"], (f"Wat kost een ZZP'er in {r['naam']}?", f"Dat hangt af van het vak. In {r['naam']} ligt een elektricien indicatief tussen {euro(prijs('elektricien', slug)[0])} en {euro(prijs('elektricien', slug)[1])} per uur excl. btw, een schilder tussen {euro(prijs('schilder', slug)[0])} en {euro(prijs('schilder', slug)[1])} en een IT-specialist tussen {euro(prijs('it', slug)[0])} en {euro(prijs('it', slug)[1])}. Het blijven richtprijzen, geen offertes."),
           ("Hoe weet ik of een ZZP'er een geldig KvK-nummer heeft?", "Elke ZZP'er en opdrachtgever vult een KvK-nummer van acht cijfers in. Het nummer wordt op vorm gecontroleerd en profielen met een geldig nummer krijgen het label KvK Gecontroleerd. Atas Group kan nummers in het Handelsregister nagaan en profielen met onjuiste gegevens weigeren of verwijderen.")]
    body = f"""{crumbs_html([("Home", "index.html"), ("Werkgebied", "regios.html"), (r["naam"], None)])}
<h1>{e(h1)}</h1>
<p><strong>{e(r['eco'])}</strong> {e(r['bouw'])}</p>
<div class="cta"><a class="btn pill" href="plaatsen.html?regio={r['regio'].replace(' ', '%20')}">Klus plaatsen in {e(r['naam'])}</a><a class="btn ghost" href="index.html?regio={r['regio'].replace(' ', '%20')}#resultaten">Bekijk open klussen</a></div>
<h2>Lokale marktanalyse {e(r['naam'])}</h2><p>{e(r['markt'])} {e(r['reis'])}</p><p>Plaatsen in deze regio: {e(r['steden'])}.</p>
<h2>Prijsgids per vak in {e(r['naam'])}</h2><p>Onderstaande uurtarieven zijn indicatief, excl. btw en gebaseerd op landelijke richtprijzen die met een regiofactor zijn aangepast. ZZP'ers bepalen zelf hun tarief.</p>
<div style="overflow-x:auto"><table class="prijst"><thead><tr><th>Vak</th><th>Richtprijs per uur</th></tr></thead><tbody>{rows}</tbody></table></div>
<h2>Wet DBA in {e(r['naam'])}</h2><p>{e(r['dba'])} <a class="back" href="wet-dba-kvk.html">Lees meer over Wet DBA &amp; KvK Zekerheid</a>. Algemene informatie, geen juridisch advies.</p>
<h2>Populaire combinaties</h2><ul class="linkgrid">{cl}</ul>
<h2>Veelgestelde vragen</h2><div>{faq_html(faq)}</div>
<ul class="linkgrid"><li><a href="regios.html">Werkgebied heel Nederland</a></li><li><a href="plaatsen.html">Klus plaatsen</a></li><li><a href="account.html">Aanmelden als ZZP'er</a></li></ul>
"""
    ld = ld_graph(url, f"ZZP'ers en klussen in {r['naam']}", desc, [("Home", ""), ("Werkgebied", "regios.html"), (r["naam"], reg_file(slug))], faq, area=r["naam"], service="ZZP-bemiddeling en klusplatform")
    return HEAD.format(v=V, title=e(title), desc=e(desc), url=url, ld=ld) + body + FOOT.format(v=V), title

# ---------------------------------------------------------------- regios.html
def regios_page():
    url = f"{SITE}/regios.html"
    title = "Werkgebied heel Nederland: ZZP'ers en klussen per regio | ATAS ZZP"
    desc = "ATAS ZZP is gevestigd in Emmen en actief in alle 12 provincies. Kies uw regio of vak en vind ZZP'ers en klussen met geldig KvK-nummer, met richtprijzen en Wet DBA-tips."
    secs = ""
    for slug, r in REG.items():
        cl = "".join(f'<li><a href="{combo_file(pp, ss)}">{e(PRO[pp]["titel"])} {e(STADNAAM[ss])}</a></li>' for (pp, ss) in COMBO if STAD[ss] == slug)
        secs += f'<section><h2><a href="{reg_file(slug)}" style="color:inherit">{e(r["naam"])}</a></h2><p>{e(r["eco"])} Plaatsen: {e(r["steden"])}.</p><ul class="linkgrid"><li><a href="{reg_file(slug)}">ZZP in {e(r["naam"])}</a></li>{cl}</ul></section>'
    vak = "".join(f'<li><strong>{e(PRO[x]["titel"])}</strong>: ' + ", ".join(f'<a href="{combo_file(x, ss)}">{e(STADNAAM[ss])}</a>' for (pp, ss) in COMBO if pp == x) + "</li>" for x in PRO if any(pp == x for pp, _ in COMBO))
    faq = [("In welke regio's is ATAS ZZP actief?", "ATAS ZZP is gevestigd in Emmen en actief in alle 12 provincies: Drenthe, Groningen, Friesland, Overijssel, Flevoland, Gelderland, Utrecht, Noord-Holland, Zuid-Holland, Zeeland, Noord-Brabant en Limburg, of landelijk en op afstand."),
           ("Kan ik ook buiten mijn regio klussen plaatsen of aannemen?", "Ja. Vermeld de locatie bij uw klus of kies Landelijk of op afstand. ZZP'ers filteren op regio en reageren op klussen binnen hun eigen werkgebied."),
           ("Zijn de prijzen op de regiopagina's bindend?", "Nee. Het zijn indicatieve richtprijzen excl. btw, aangepast per regio. ZZP'ers reageren met een eigen bod en bepalen zelf hun tarief.")]
    body = f"""{crumbs_html([("Home", "index.html"), ("Werkgebied", None)])}
<h1>Werkgebied heel Nederland</h1>
<p><strong>ATAS ZZP is gevestigd in Emmen en actief in alle 12 provincies.</strong> Kies uw regio of vak en vind ZZP'ers en klussen waarbij elk lid een geldig KvK-nummer heeft. Per pagina leest u over de lokale markt, richtprijzen, Wet DBA-tips en veelgestelde vragen.</p>
<div class="cta"><a class="btn pill" href="plaatsen.html">Klus plaatsen</a><a class="btn ghost" href="index.html#resultaten">Bekijk alle klussen</a></div>
{secs}<h2>Per vak</h2><ul class="klist">{vak}</ul>
<h2>Veelgestelde vragen</h2><div>{faq_html(faq)}</div>
"""
    items = [{"@type": "ListItem", "position": i + 1, "name": "ZZP in " + r["naam"], "url": f"{SITE}/{reg_file(s)}"} for i, (s, r) in enumerate(REG.items())]
    g = [{"@type": "BreadcrumbList", "itemListElement": [{"@type": "ListItem", "position": 1, "name": "Home", "item": SITE + "/"}, {"@type": "ListItem", "position": 2, "name": "Werkgebied", "item": url}]},
         {"@type": "CollectionPage", "name": "Werkgebied heel Nederland", "url": url, "description": desc, "mainEntity": {"@type": "ItemList", "itemListElement": items}},
         {"@type": "FAQPage", "mainEntity": [{"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in faq]}]
    ld = json.dumps({"@context": "https://schema.org", "@graph": g}, ensure_ascii=False).replace("<", "\\u003c")
    return HEAD.format(v=V, title=e(title), desc=e(desc), url=url, ld=ld) + body + FOOT.format(v=V), title

if __name__ == "__main__":
    for old in HERE.glob("zzp-*.html"):
        old.unlink()
    titels = {}
    for pro, stad in COMBO:
        t, ti = combo_page(pro, stad); (HERE / combo_file(pro, stad)).write_text(t, encoding="utf-8"); titels[combo_file(pro, stad)] = ti
    for slug in REG:
        t, ti = reg_page(slug); (HERE / reg_file(slug)).write_text(t, encoding="utf-8"); titels[reg_file(slug)] = ti
    t, ti = regios_page(); (HERE / "regios.html").write_text(t, encoding="utf-8"); titels["regios.html"] = ti
    assert len(set(titels.values())) == len(titels), "dubbele titels"
    print(len(titels), "pagina's gegenereerd")
