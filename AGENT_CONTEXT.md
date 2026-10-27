# Contexte de reprise — Intro DevFest Toulouse

> Lire ce document avant d'explorer le code. Il décrit le spectacle existant et les décisions déjà validées, pas un nouveau backlog à implémenter.
>
> Historique visuel documenté le **7 octobre 2026**, complété le **8 octobre** par le lecteur Strudel allégé et le regard caméra droit devant aux popcorns. L'horloge audio native fonctionne de nouveau ; les répétitions musicales historiques ne valident pas automatiquement les trois nouveaux scores. Voir section 11 et vérifier le worktree : les fichiers source restent la référence.
>
> **26 octobre 2026 :** les musiques intégrées utilisent les MP3 320 kbit/s. Viola's Journey possède désormais une carte d'attaques mesurées et un profil de recalage local des effets (< 200 ms), sans décaler l'horloge caméra ni le reveal final. Voir la section de synchronisation du [README](README.md). Le gag chocolatine remplace les pièces en fin de présentation d'Anne-Flore : requête visible à **27 s**, réponse avancée le 27 octobre à **28.5 s exactement sur l'horloge caméra**, fin narrative à 34.5 s ; les carrés lumineux du T sont immobiles et plaqués aux murs latéraux.

> **27 octobre 2026 — remplace les anciennes indications rideau / croissance ci-dessous :** le mur Legacy garde ses 48 positions et son effondrement Havok à 38.2 s, mais s'assemble en douze tétriminos. Son impact alimente progressivement une porte CPU XOR à quatre panneaux rigides, ouverte de 42.6 à 45.7 s pour la traversée vers 46.03 s. Plus de rideau au T. L'astronaute est désormais derrière Orbital Link, taille constante 16.64, actif de 143 à 166 s ; il n'est plus après le buffer. Le panneau chocolatine s'efface entre 31.85 et 32.55 s, avant la traversée 32.75 s. Voir [le rapport Legacy/XOR et les captures](docs/legacy-xor-integration.md). Aucun changement de musique, de durée ou de chorégraphie caméra.
>
> Le lobby sélectionne par défaut **MP3 soundtrack / Viola's Journey**, sans lecture automatique. Le panneau d'entrée affiche **DEVFEST AI4FUN / CLOSING KEYNOTE**, avec la mascotte DevFest verte préchargée et le même fondu ; le shader rétro-gaming commence à **4.3 s** et disparaît à la traversée à **5.925 s** pour dégager le couloir. Le panneau HTTP est déjà présent, perpendiculaire aux murs latéraux et rapproché d'Anne-Flore (ancre 32.75 s, yaw 0) ; sa réponse est à 28.5 s exactement sur l'horloge caméra. Les MP3 terminent par un fondu de 1.25 s calé sur la fin réelle du fichier (177.6 s pour Journey), via un gain de sortie après l'analyse ; rewind/restart restaurent le volume.
>
> **Dernière mise en scène :** le panneau d'entrée est centré sur la traversée caméra à 5.925 s. La sortie du T est un **grand rideau rouge plissé**, ouvert sur le clock 42.6–46.6 s. À **59.200 s exactement**, un éclair unique relie les huit CRT et les passe sur **AI UPDATE / 99% / 42 ans / fallback cassoulet**. Le panneau 404 reste préchargé et opaque de 51.18 à 87.6 s. Le tunnel garde son vol doux, ses quatre traces FFT et sa sortie géométrique exacte à **94.2 s**. L'astronaute grandit de 6.5 à **16.64 unités** (échelle 2.56, 80 % de la précédente taille finale), pieds fixes, avec l'arceau existant 122 s. Le terminal npm est **recentré**, légèrement relevé ; le regard attend la fin de la croissance de l'astronaute avant de cadrer terminal et robot au fond. Le T-800 n'est plus à l'entrée du D : il avance après le terminal dès 119.5 s, dans l'axe X=-448. À **124.4 s**, la fin des 4.80 GB libère les 64 boîtes. Les vrais contacts Havok figent sa marche et pilotent sa destruction : première frappe vers 125.2 s, douze impacts vers 126.25 s, puis **192 pétales de roses rouges** incurvés, shader original, vent et poses physiques enregistrées. Pas de ressources extraites d'Expedition 33, pas de kill par timer. Le panier est retiré et noyau/rings se contractent pour dégager la chute.
>
> **SimReady, direction révisée :** voir [docs/simready-integration.md](docs/simready-integration.md). Neuf modèles NVIDIA convertis/licenciés restent inspectables. **Pas de donut, petit robot ou collision de chariot dans le parcours.** Le distributeur et son panneau 404 sont présents/opaques de 51.18 à 87.6 s ; seuls lumière et snack jouent vers 61.55 s. Pong reste sans panneau « HUMAN vs AI ». Le bras préchargé assiste la fusée à son lancement existant. Les **64 boîtes physiques** tombent à la fin du terminal pour détruire le T-800, puis retombent en tas. Capsule, boîtes et pétales sont calculés ensemble par Havok à pas fixe au chargement, puis rejoués exactement. La même option Toulouse active ou coupe la paire robot/cassoulet. Musique, texte de David, route générale et reveal final restent conservés.

Dépôt : [davrous/DevFestToulouseIntro](https://github.com/davrous/DevFestToulouseIntro).

**Punchline manga après le sauvetage :** [CassouletPowerPoster.ts](src/effects/CassouletPowerPoster.ts)
dessine une affiche originale **The Power Of Cassoulet!**, boîte héroïque
musclée, cuillère en bois, trames, lignes de vitesse, K.O. et rappel des 4.80 GB.
Elle est collée au mur ouest de la cellule D (3, 5), en (-488, 17, 70),
orientée vers +X : le mur face caméra au virage à droite après Mitsuru,
**avant** le décollage à 144.6 s, pas le mur de sortie final.
Le regard s'adoucit entre 136.5 et 144.4 s, sans déplacement de caméra.
Le T-800 dessiné est vaincu, yeux en X rouges, boîte sur la tête et drapeau
blanc. Texture préchargée, présence fixe après le kill +0.35 s,
aucun cut-in plein écran ni timer. La même option que le sauvetage la désactive.
Le vrai robot reçoit une clé froide et un liseré rouge, deux lumières sans
ombres limitées à ses meshes et éteintes quand le corps disparaît.

## 1. Comprendre le projet en deux minutes

Il s'agit d'une **intro de trois minutes pour la keynote de clôture du DevFest Toulouse 2026**, destinée à être projetée sur un grand écran devant un public de développeurs.

Ce n'est ni une vidéo précalculée, ni un jeu avec une caméra contrôlée par le spectateur. C'est un spectacle **3D temps réel Babylon.js / TypeScript**, avec un trajet de caméra et une mise en scène pilotés par une horloge de **180 secondes**.

Le ressort principal est un **reveal spatial** : le public traverse des couloirs sans savoir qu'ils sont construits dans les lettres du titre. À la fin, la caméra sort, recule et monte pour révéler :

```text
DEVFEST
TOULOUSE
```

Le trajet commence dans le **T de TOULOUSE**, sort en haut à droite, rejoint le **D de DEVFEST**, parcourt son circuit, puis emprunte son ouverture pour le zoom-out final.

La narration actuelle :

```text
GAME / T
  → LEVEL COMPLETE
  → CLAPPERBOARD / CUT!
  → CINEMA / première de David
  → FILM MACHINERY / bobines et pop-corn
  → CAMÉRA GÉANTE / entrée dans l'objectif
  → PROJECTEUR / passerelle spatiale
  → DIGITAL D / Eric
  → BUFFER OVERFLOW / débordement physique dans le S
  → progression cyan → or
  → Mitsuru / climax
  → DEPLOY TO ORBIT / fusée procédurale
  → sortie / DEVFEST TOULOUSE / AI4Fun
```

L'alto reste **live et externe**. Strudel peut jouer dans sa page locale ou dans
une iframe intégrée à la page principale, pour un démarrage synchronisé sans
changer d'onglet. L'application analyse éventuellement une entrée audio et/ou
reçoit des événements musicaux ; l'entrée capturée n'est ni monitorée vers les
haut-parleurs, ni enregistrée, ni envoyée à un serveur. La musique Strudel
optionnelle est une sortie indépendante. Le spectacle fonctionne aussi sans audio.

**Intention esthétique :** geek, ludique, cinématographique, avec quelques blagues toulousaines. Préférer des moments compréhensibles et bien cadrés à une accumulation de props, de particules ou de rectangles noirs.

## 2. Ce qu'il faut absolument préserver

- **180 s à vitesse 1.** Le titre est entièrement cadré vers **173 s**, puis reste stable jusqu'à 180 s et après l'arrêt de l'horloge.
- Le **reveal final est très apprécié de l'utilisateur**. Ne pas le réinventer pour corriger un problème local.
- La caméra reste **indépendante de l'audio** : son trajet, les speakers et la sortie ne doivent pas dériver avec le rythme ou le volume.
- La passerelle physique **T–D reste au sol à y = 0 jusqu'à 168 s**, sans murs, toit ou copie en hauteur. À la demande de l'utilisateur, ses deux parties se relèvent en ponts-levis de **168 à 172.5 s**, avec rétraction des longueurs vers les ouvertures du T et du bas du D. Elles restent fermées pendant le hold final. Ne pas avancer cette fermeture avant la sortie caméra.
- Garder les **quatre speakers**, leurs noms et leurs titres de démo, sauf demande explicite. David ne doit pas réapparaître dans un ancien portail du D.
- Les noms et les blagues doivent être dans le champ de la caméra, suffisamment grands et lisibles. L'état « mesh enabled » ne prouve pas qu'un spectateur peut lire.
- Les objets physiques ne poussent pas la caméra : elle n'a pas de corps Havok. Les props permanents du T sont visibles pendant leur approche, pas révélés par un pop tardif.
- Les assets nécessaires au spectacle sont **locaux et préchargés avant SYSTEM READY**. Aucun CDN, téléchargement Sketchfab ou service cloud n'est requis pendant la représentation.
- Corriger la zone concernée sans jeter les scènes qui fonctionnent déjà. Sur une nouvelle machine, commencer par vérifier le worktree plutôt que supposer que tout correspond à cette photographie.

## 3. Programme des speakers : source de vérité

Configuration : [src/content/speakers.ts](src/content/speakers.ts).

| Speaker | Titre conservé | Monde / thème | startTime | gateTime | endTime |
| --- | --- | --- | ---: | ---: | ---: |
| Anne-Flore Bernard | Musical Agentic Blender | game / signal | 17 | 29 | 39 |
| David Rousset | Musical Agentic Blender | cinema / neural | 66 | 76 | 83 |
| Eric Mittelette | IA Barrée | digital / neural | 99 | 107 | 116 |
| Mitsuru Furuta | Blague Japonaise | digital / overclock | 128 | 136 | 146 |

**Le doublon de titre entre Anne-Flore et David est conservé intentionnellement : ne pas le « corriger » en inventant un nouveau titre.**

`gateTime` sert aussi d'**ancre spatiale sur la trajectoire**, pas seulement de timestamp. Changer ce nombre déplace le panneau et modifie son angle d'approche. `endTime` n'est pas une garantie que le panneau soit encore dans le champ : la caméra peut déjà l'avoir dépassé.

David est rendu par le monde cinéma, pas par un `SpeakerPortal`. Son support physique est visible dès **51.18 s** jusqu'à la fin du décor cinéma à 87.6 s. Le trajet passe sous sa fiche à 76 s, regarde le mécanisme et la première cascade de popcorn, accélère à 80 s puis entre dans l'objectif à 80.45 s. Son nom garde son fondu à partir de **67 s** et l'enveloppe de présentation **66–83 s**. Mitsuru utilise `lateralOffset = 1.1` et `gateWidth = 22`.

Les constantes cinéma de [src/content/showBeats.ts](src/content/showBeats.ts) reprennent certains timings de David : conserver leur cohérence avec la configuration des speakers.

## 4. Chronologie utile pour les prochaines itérations

Les intervalles se recouvrent volontairement pour assurer les transitions. Pour les détails opérateur, voir [README.md](README.md).

| Temps, en secondes | Ce que doit comprendre le public |
| --- | --- |
| 0–5.925 | DEVFEST AI4FUN / CLOSING KEYNOTE et mascotte verte DevFest, avec les bornes latérales ; shader rétro-gaming plein écran de 4.3 à 5.925 s, terminé au passage du panneau |
| 5–14 | Bornes et pixel art ; plus de panneau chocolatine avant Anne-Flore. Les petits pixels lumineux restent fixes aux murs. Les six grandes plaques lumineuses réactives sont plaquées à 0.01 unité de la surface intérieure des murs, à y = 15 au-dessus des bornes, et non devant leurs écrans |
| 17–39 | Anne-Flore, son portail cyan et un violon voxel avec archet centré juste sous sa fiche ; échange Pong à côté d'elle, dernier tir physique vers 22, chute des voxels déclenchée par le choc Havok puis rejouée exactement, nettoyage à 38 |
| 27–34.5 | `GET /pain-au-chocolat` déjà présent avant l'approche, face au couloir près d'Anne-Flore ; `301 / Location: /chocolatine` dès 28.5 s exactement. Aucune pièce bonus |
| 34.4–41.2 | Assemblage des 48 cubes Legacy en douze L/J, BUILD FAILED, puis effondrement Havok enregistré à 38.2 (recalage Journey existant conservé) |
| 38.2–46.03 | Signal électrique progressif, XOR / ACCESS GRANTED, quatre panneaux biseautés qui glissent et pivotent ; passage réellement libre avant la caméra |
| 46.3–51.03 | LEVEL COMPLETE au-dessus du clap à y = 26, encore visible pendant son approche |
| Approche jusqu'à 51.03 | Clap original déjà présent dès le chargement, sans panneau DEVFEST / SCENE 02 ajouté, ancré à 59 s ; fermeture de 50.85 à 51.03, approche sans quasi-arrêt |
| 50.65–52.18 | Shader plein écran : arcade pixellisée, fermeture CRT à 51.03, trait vert maintenu de 51.135 à 51.38 pendant le changement de décor à 51.18, puis rallumage cathodique ; aucun plan noir |
| 51.18–66 | Décor cinéma entier visible dès l'entrée : sièges, CRT rétro, support de David, bobines / pellicule, deux seaux et caméra |
| 59.2–59.9 | Éclair bleu/blanc unique ; les huit TV conservent ensuite le gag AI UPDATE 99 % / 42 ans / fallback cassoulet |
| 66–77, à l'écran | Première de David : lumière avant le fondu du nom, écran physique supporté, zone plus calme |
| 77–80 | Bobines frontales et pellicule animée ; bascule des seaux à 77.55, première pluie de popcorn dès 78.1 |
| 80–80.45 | Accélération brutale exacte à 80 s, plus de dix fois la vitesse du couloir à la fin du rush, traversée de l'objectif prévisualisant le vrai tunnel |
| 80.45–94.2 | Vol 3D doux, vitesse rythmique, design et quatre traces FFT conservés ; virage final à droite puis traversée de l'ouverture réelle du tube, avec ses parois et le D visibles ensemble, sans iris ni changement de plan |
| 99–116 | Eric, premier chapitre du D digital, avec flux de données convergents |
| 107–116.7 | Bac transparent à droite, yaw pi, perpendiculaire au mur droit. 32 cubes remplissent les mêmes cases ; un 33e cube arrive à 110.7 et déclenche l'eau débordante en shader, puis seulement le texte BUFFER OVERFLOW, terminé à 114.3 |
| 114–132 | Six structures de données s'élèvent progressivement, pulse mobile et transition cyan → or |
| Derrière Orbital Link, 143–166 | Un seul astronaute, directement haut de 16.64 unités, sans croissance ; ancien emplacement du buffer vide |
| 117–125 | Terminal recentré : frappe de `$ npm install cassoulet`, progression jusqu'à 4.80 GB à 124.4 s, puis effacement doux ; robot visible dessous |
| 119.5–134 | Le T-800 de 21.6 unités approche au fond du couloir ; les impacts de boîtes le dissolvent en 192 pétales rouges flottants |
| Après le virage de Mitsuru, avant 144.6 | Affiche murale The Power Of Cassoulet!, boîte musclée, T-800 ridicule vaincu et K.O., lisible plusieurs secondes avant la fusée |
| 124.4–134 | 64 boîtes tombent après l'installation : le cassoulet nous sauve. Capsule, boîtes, pétales et tas final simulés puis enregistrés ensemble, sans panier ni panneau power-up |
| 128–146 | Mitsuru : nom orbital, énergie dorée plus intense, vumètre derrière |
| 140–149.4 | Fusée au **coin suivant**, avant le virage vers Orbital Link : approche lisible, décollage à 144.6, impact au plafond à 146.8, flash / onde / 240 étincelles ; pad immobile |
| 143–166 | TOULOUSE / ORBITAL LINK, placé en profondeur et conservé pendant le début du zoom-out |
| 153–159 | Dernier vumètre, retournement et préparation de la sortie, sans longue attente |
| 159–173 | Recul et montée : reveal du titre complet et de la connexion au sol |
| 168–172.5 | Les deux parties de la passerelle se relèvent en ponts-levis et se rétractent pour fermer les ouvertures T / D |
| 173–180 | Image finale stable, AI4Fun et petites signatures de l'événement |

### Important : narration et géométrie ne sont pas la même chose

Le chapitre cinéma **réutilise la passerelle et une partie de la trajectoire existante dans le D**. L'entrée « DIGITAL D » à 95 s est une **transition de thème et de visibilité**, pas la première entrée géométrique dans la lettre.

Il n'existe pas un nouveau long couloir cinéma indépendant entre les deux lettres. La continuité de position est conservée ; les décors, lumières et racines de visibilité font changer l'univers. Ne pas « réparer » cette distinction en reconstruisant tout le parcours.

## 5. Goûts de l'utilisateur et idées déjà abandonnées

Ces décisions évitent de réintroduire des éléments retirés lors des nombreuses itérations :

- Le T a été **désencombré** : six bornes latérales, moins de sprites et moins d'objets redondants. Ne pas remettre la grosse borne au centre. Conserver le texte d'ouverture.
- Les sprites sont plaqués sur les **murs latéraux**, au-dessus des objets, pas à l'intérieur des bornes ou en tas.
- Ce sont maintenant des **décalcomanies fixes**. L'atlas contient des personnages différents, pas une animation : ne pas changer de tuile avec le temps / kick, ni faire pomper leur taille ou leur position.
- Le personnage voxel a été remplacé par le **violon**, associé à Anne-Flore, centré sous sa fiche et près du sol.
- Les anciens ballons rebondissants, y compris le ballon de rugby, et leurs plateformes ne font plus partie du show actuel. Havok sert maintenant au violon, aux pièces, au mur et au pop-corn.
- La blague **Canal du Midi** et le texte **CONTAINER / NO CLOUD REQUIRED** ont été retirés. Les noms de certains anciens shaders/rubans peuvent encore évoquer MIDI : cela ne signifie pas qu'il faut remettre le panneau.
- Ne pas rétablir **GAME OVER 404 / EXIT NOT FOUND / TEST PASSED** ni l'ancien rideau : le récit de sortie est désormais impact Legacy → signal électrique → XOR / ACCESS GRANTED → quatre panneaux mécaniques.
- Le cassoulet doit rester **entre Eric et Mitsuru**, et visible assez longtemps. Une ancienne demande le plaçait après David ; elle a été corrigée ensuite.
- Le cinéma doit rester une **composition architecturale symétrique**, pas une distribution aléatoire de sièges flottants, de CRT inclinés et de pancartes.
- Tous ses props sont visibles dès l'entrée. Ne pas confondre chargement et visibilité : précharger un GLB puis cacher sa racine jusqu'à son beat provoque quand même un pop.
- Les écrans CRT utilisent toute la vraie surface courbe du GLB, avec huit interfaces originales évoquant DOS / Windows 95 / BBS / écrans bleus. Ne pas remettre de petit panneau flottant devant le verre.
- Les panneaux `agent.observe()` / `agent.plan()` / `agent.act()` sous Eric sont supprimés ; ils appartenaient à une ancienne présentation de David.
- Les props géants sont des héros intentionnels : clap, bobines, caméra. La chaise de réalisateur et les VHS sont des détails, pas des concurrents du speaker.
- La caméra géante doit **pointer vers nous** et être traversée par son objectif. Pas une petite caméra posée sur le côté qui filme dans l'autre sens.
- Éviter les signes plats génériques supplémentaires. Les textes existants sont justifiés par une fiche, un écran, un terminal, un clap ou une architecture.
- Les faisceaux doivent préparer les révélations, pas masquer les noms. Les effets sonores réactifs accentuent certains moments sans rendre toute la scène erratique.

## 6. Architecture : ouvrir seulement les fichiers pertinents

Il n'est pas nécessaire de lire tout le dépôt. Commencer par les trois fichiers de contenu / caméra concernés, puis choisir la ligne appropriée :

| Besoin | Fichiers principaux |
| --- | --- |
| Horloge, lecture, pause, reprise, préparation et rendu | [App.ts](src/engine/App.ts), [Timeline.ts](src/engine/Timeline.ts) |
| Construction de la scène, coordination, visibilité des univers, lumière globale, bloom / fog | [DevFestScene.ts](src/scene/DevFestScene.ts) |
| Position caméra, regard, FOV, ancrage des props, sortie et framing final | [CameraPath.ts](src/camera/CameraPath.ts) |
| Glyphes du titre, grille, murs / sols / toits et vraie passerelle T–D | [title.ts](src/content/title.ts), [Labyrinth.ts](src/scene/Labyrinth.ts) |
| Speakers, fenêtres d'effets, transitions et boutons de répétition | [speakers.ts](src/content/speakers.ts), [cues.ts](src/content/cues.ts), [showBeats.ts](src/content/showBeats.ts) |
| Bornes, écran d'ouverture, LEVEL COMPLETE / NEXT LEVEL | [ArcadeCathedral.ts](src/scene/ArcadeCathedral.ts) |
| Porte et éléments narratifs du T ; pixel art | [ArcadeT.ts](src/scene/ArcadeT.ts), [PixelWorld.ts](src/scene/PixelWorld.ts) |
| Violon voxel, dernier échange Pong et collision Havok enregistrée | [DemosceneTransition.ts](src/scene/DemosceneTransition.ts), [ViolinPongImpact.ts](src/scene/ViolinPongImpact.ts), [violin.ts](src/content/violin.ts) |
| Porte CPU XOR à quatre panneaux et signal de l'impact | [XorCpuGate.ts](src/scene/XorCpuGate.ts), [CircuitSignal.ts](src/effects/CircuitSignal.ts), [LegacyXorSequence.ts](src/scene/LegacyXorSequence.ts) |
| Mur de dette technique, Havok / seek / cleanup ; pièces supprimées | [ArcadePhysics.ts](src/scene/ArcadePhysics.ts) |
| Clap, sièges, CRT, première de David, bobines, caméra, projecteur, espace | [CinemaWorld.ts](src/scene/CinemaWorld.ts) |
| Transition plein écran arcade → ligne de phosphore → CRT, pause / rewind / pipeline | [ClapCrtTransition.ts](src/effects/ClapCrtTransition.ts), [showBeats.ts](src/content/showBeats.ts) |
| Traversée rétro-gaming du panneau d'entrée, cycle de vie partagé des shaders de transition | [ArcadeEntryTransition.ts](src/effects/ArcadeEntryTransition.ts), [TimedPostProcess.ts](src/effects/TimedPostProcess.ts) |
| Vol physique 3D, vitesse rythmique et ouverture réelle sur le D à 94.2 s | [PhysicalTunnel.ts](src/effects/PhysicalTunnel.ts), [TunnelFlight.ts](src/camera/TunnelFlight.ts), [LensVortexTransition.ts](src/effects/LensVortexTransition.ts), [TunnelRendering.ts](src/effects/TunnelRendering.ts) |
| Sauvetage cassoulet et destruction en pétales | [CassouletRescue.ts](src/simready/CassouletRescue.ts), [TerminatorWalk.ts](src/scene/TerminatorWalk.ts), [TerminatorDestruction.ts](src/effects/TerminatorDestruction.ts), [RosePetals.ts](src/effects/RosePetals.ts) |
| Éclair exact 59.2 s et gag sur toutes les TV | [CrtLightningTransition.ts](src/effects/CrtLightningTransition.ts), [CinemaCRT.ts](src/scene/CinemaCRT.ts) |
| Terminal npm animé et cue partagé avec la pluie de boîtes | [NpmCassouletTerminal.ts](src/scene/NpmCassouletTerminal.ts), [showBeats.ts](src/content/showBeats.ts) |
| Mur Matrix continu et signature lisible, atlas de glyphes partagé | [MatrixRainWall.ts](src/effects/MatrixRainWall.ts), racine du distributeur dans [SimReadyGags.ts](src/simready/SimReadyGags.ts) |
| Astronaute final fixe et montée indépendante de l'arceau existant | [CinemaWorld.ts](src/scene/CinemaWorld.ts), [dataArch.ts](src/content/dataArch.ts), [DigitalMoments.ts](src/scene/DigitalMoments.ts) |
| Textures rétro et couverture exacte de la surface courbe des CRT | [CinemaCRT.ts](src/scene/CinemaCRT.ts) |
| Chargement local, normalisation, instances, clone de caméra et animation du clap | [CinemaAssets.ts](src/scene/CinemaAssets.ts) |
| Deux seaux / sources, 72 grains physiques, colliders et hauteur du sol | [CinemaPopcorn.ts](src/scene/CinemaPopcorn.ts) |
| Progression entre Eric et Mitsuru et flux de données distincts | [DigitalMoments.ts](src/scene/DigitalMoments.ts), [Interior.ts](src/scene/Interior.ts) |
| Remplissage du bac BUFFER OVERFLOW, cube supplémentaire et shader d'eau | [DigitalOverflow.ts](src/scene/DigitalOverflow.ts), [BufferWater.ts](src/effects/BufferWater.ts) |
| Boîtes, capsule du robot, vent/pétales et replay physique exact | [CassouletPile.ts](src/simready/CassouletPile.ts), [CassouletRescue.ts](src/simready/CassouletRescue.ts), [PhysicsBake.ts](src/scene/PhysicsBake.ts) |
| Portails non cinéma, typographie et présentation orbitale de Mitsuru | [SpeakerPortal.ts](src/scene/SpeakerPortal.ts) |
| Blagues, cassoulet, orchestration de la fusée, satellite et ORBITAL LINK | [EasterEggs.ts](src/scene/EasterEggs.ts) |
| Fusée, pad fixe, décollage et explosion déterministes | [DeployRocket.ts](src/scene/DeployRocket.ts), configuration / déplacement dans [showBeats.ts](src/content/showBeats.ts) |
| Lasers au sol, vrais spotlights, spectres au sol et aux murs | [ShowLighting.ts](src/effects/ShowLighting.ts), [WallMeters.ts](src/effects/WallMeters.ts) |
| Particules et rubans réactifs ; entrées audio / événementielles | [MusicReactive.ts](src/effects/MusicReactive.ts), [AudioAnalyzer.ts](src/engine/AudioAnalyzer.ts), [ShowController.ts](src/engine/ShowController.ts), [protocol.ts](src/engine/protocol.ts) |
| Carte d'attaques Journey, profil de transitions, régénération FFmpeg et empreinte du MP3 | [violasJourney.ts](src/audio/violasJourney.ts), [violasJourney.json](src/audio/violasJourney.json), [analyze-journey.mjs](scripts/analyze-journey.mjs) |
| Texte sur meshes, boîtes instanciées, habillage de l'événement / fond | [WorldText.ts](src/scene/WorldText.ts), [Instances.ts](src/scene/Instances.ts), [EventBranding.ts](src/scene/EventBranding.ts), [Atmosphere.ts](src/scene/Atmosphere.ts) |
| Interface de répétition et diagnostics | [DebugPanel.ts](src/debug/DebugPanel.ts), [index.html](index.html) |

### Repères spatiaux

- Babylon utilise ici une grille dans le plan **X/Z**, avec **Y vertical**.
- Une cellule mesure **28 unités** ; les lettres font **34 unités** de haut.
- `cellPosition(col, row)` donne `x = (col - 20) * 28`, `z = (7.5 - row) * 28`.
- Départ : T, `col = -1`, `row = 15`, `y = 8`. La caméra remonte le pied, tourne à droite près de `row = 9`, puis sort vers `col = 2`.
- La connexion physique au sol utilise les cellules `(2,9)`, `(2,8)`, `(2,7)` et rejoint le bas du D près de `(2,6)`.
- Le reveal commence à **159 s**. La pose finale de référence en 16:9 est **position `(0,1110,-755)`**, cible `(0,12,0)`. Le framing s'adapte aux autres rapports d'écran : ne pas imposer cette distance à toutes les fenêtres.
- `routeAnchor(time, lateralOffset)` fournit position et orientation à partir du trajet. Les props sont généralement fixés à une ancre future pour être vus pendant l'approche.
- Retimer la caméra déplace aussi ces ancres : un changement local peut donc affecter panneaux, sièges, faisceaux, colliders et durée de lecture.

## 7. Pièges techniques déjà rencontrés et résolus

### Caméra et lisibilité

La route utilise Catmull–Rom, mais **44–58 s** emploie des tangentes Hermite limitées pour éviter l'overshoot / le demi-tour parasite près du ralentissement du clap. Un regard dirigé dans le foyer **59–71 s** évite un virage trop brutal. À la demande de l'utilisateur, le regard spécifique vers le haut aux popcorns a été supprimé : de **76 à 84 s**, la caméra suit sa cible naturelle droit devant vers l'objectif. Les positions, FOV et timings restent inchangés. Les anciens `popcornLookStart/End` ont été supprimés ; les seaux restent cadrés plus tôt dans l'approche.

Les tests maintiennent les rotations sous **45°/s**, la clearance des murs et au moins **quatre secondes** de cadrage complet pour les noms. Le clap sans panneau textuel ne requiert plus que **deux secondes**, volontairement pour accélérer cette transition. Le regard de 140–151 s suit maintenant la fusée du coin suivant, puis un relais doux vers ORBITAL LINK de 146.8–157 s évite le retour brutal vers l'horizon. Les positions de caméra et le reveal restent inchangés. Ne pas déplacer Eric plus tard sans retravailler aussi le regard.

**Fusée / plafond :**
- `DEPLOY_ROCKET.time = 148.5`, offset latéral -6, yaw fixé à PI : ancrage près de la cellule D `(3,6)`, à l'intérieur des nervures du plafond.
- La racine reste à y = 0 et le pad reste ancré au sol ; seule `airframe` monte. Le panneau de lancement et ses supports restent également au sol.
- Décollage 144.6, contact 146.8. La sous-face réelle est **32.85** (`HEIGHT = 34`, `ROOF_THICKNESS = 2.3`) ; le nez étant à 18, la montée est bornée à **14.85**.
- Pas de rigid body Havok pour la fusée : la trajectoire cinématique, le flash, l'onde et les 240 particules sont recalculés à partir du temps absolu. Pause, seek et retour arrière ne déclenchent pas de callbacks irréversibles.
- Les particules partent sous le plafond avec des vitesses vers le bas, dans un shader déterministe seedé. Elles sont exclues du GlowLayer ; flash / onde respectent leur opacité dans le sélecteur de glow des meshes `FX/Rocket /`.
- Airframe masquée au contact ; effets terminés à 149.4 ; pad et console nettoyés avant 159. ORBITAL LINK conserve sa présence jusqu'à 166.

Les textes sont des textures sur meshes **dans le monde 3D**, pas des overlays HTML. Les tests de projection ne détectent pas toutes les occlusions par d'autres meshes ; une vérification visuelle reste nécessaire.

### Clap : ne pas rejouer toute l'animation

Le GLB contient une séquence ouverture / fermeture / réouverture. Utiliser seulement **les frames source 50 → 60**, définies par `CLAPPER_CLOSE`, pendant **50.85–51.03 s**. `LEVEL_COMPLETE` reste au-dessus du modèle ; le regard et l'ancre à 59 s permettent de cadrer simultanément le texte et le clap.

Le clap est normalisé après pose ouverte à la frame 50, afin que le bras ouvert soit inclus dans ses bounds. Sa taille héroïque est 22. Le panneau typographique ajouté devant le clap a été retiré à la demande de l'utilisateur.

`takeClapper` utilise le modèle animé original : instancier aveuglément sa hiérarchie ne garantit pas que l'AnimationGroup cible la bonne copie.

Le plan noir de transition a été supprimé. [ClapCrtTransition.ts](src/effects/ClapCrtTransition.ts) applique un shader GLSL original après le tone mapping : pixellisation, léger décalage RGB et déchirures de lignes, compression verticale en trait vert de phosphore, puis réouverture avec courbure, raster et masque RGB. `CLAP_CRT` couvre **50.65–52.18 s** ; le trait reste fermé **245 ms**, de **51.135 à 51.38 s**. Le changement de décor reste à **51.18 s**, masqué par le trait, et la fermeture du clap conserve ses 0.18 s. Le clap est activé dès le début de la séquence, et non à `clapperStart` (48.8 s), qui reste un repère de lumière / fin de warp.

La partition locale originale utilise `clapTiming` / `cinemaTiming`, fournis par le REPL à partir de ces constantes : descente synthétique de trois octaves et cinq impulsions de kick de plus en plus espacées, silence pendant le trait, reprise à 51.38 s. Les dernières voix avant l'effet raccourcissent leur durée / release et suppriment leur reverb pour ne pas masquer la pause. Le bouton **Start show + music** ajoute un seul hap silencieux à zéro via le hook public `editPattern`, transmet un `show-start` confirmé par le transport, et ancre Babylon au timestamp audible (latence de sortie comprise). Pas d'auto-start par les cues musicaux ordinaires, pas de suivi continu de l'horloge audio. Le lancement accepte désormais l'autre onglet masqué : un timer indépendant du rendu lance l'horloge et le premier frame visible rattrape le temps écoulé. Cette lecture synchronisée continue son horloge lors des changements d'onglet ; les commandes locales restaurent l'auto-pause ordinaire. Refus explicite si non prêt ou déjà en lecture. Pause / seek restent indépendants ; arrêter la musique et relancer les deux après une répétition.

Le shader est compilé avant SYSTEM READY ; une erreur de compilation remonte à l'initialisation, sans fallback noir. Les uniforms dépendent uniquement du temps absolu ; une pause conserve la même image. Le post-process est détaché hors de la fenêtre et replacé en dernier après toute reconstruction Bloom/FXAA. Cette transition narrative reste active même si les effets optionnels sont désactivés. Références conceptuelles : [GM Shaders Mini: CRT](https://mini.gmshaders.com/p/gm-shaders-mini-crt) et [The Book of Shaders: Noise](https://thebookofshaders.com/11/), sans copie de leur code ni ressource externe au runtime.

### Bounds, échelle et orientation des modèles

- Le modèle de caméra contient un grand sol nommé **`ground_0`**. La chaise contient un socle **`Cylinder.003`**. Ils sont retirés de la hiérarchie runtime **avant** de mesurer / normaliser ; sinon les objets utiles deviennent trop petits.
- Les sièges et la chaise de réalisateur ont une hauteur normalisée de **4.2 unités**.
- Les racines glTF peuvent avoir une **échelle Z négative** liée au changement de repère. La préserver : la remplacer arbitrairement par une échelle uniforme inverse certains modèles.
- Les répétitions utilisent des instances partageant la géométrie. La caméra héroïque utilise des **clones partageant la géométrie** : modifier `visibility` sur un `InstancedMesh` ne fonctionne pas et produit des warnings à chaque frame.
- CRT : conserver le yaw local **-π/2**, recopier la surface courbe **`Object_8`** dans le repère du support, puis refaire les UV 0–1. Cacher les surfaces originales `Object_6` / `Object_8`, pas le boîtier. La conversion glTF rend les rotations intuitives trompeuses : vérifier les coordonnées réelles.
- La caméra géante est normalisée à 40 ; l'objectif reste à l'ancre **86.3**, traversée à **80.45 s**. Le disque de rayon **6.66** partage la texture du tube 3D, couche **0x10000000** dans la même scène. `tunnelTravelProgress` garde la fin exacte à **94.2 s**. Le tube maillé s'arrête à `TUNNEL_EXIT_INDEX`, exactement au point atteint à cette fin ; le chemin continue uniquement pour calculer un regard stable. Le target est transparent hors des parois (AA x4 si disponible), et son alpha est le véritable masque géométrique de la sortie. Composer en prémultiplié, sans iris ni mélange plein écran. Le D est prêt à 90 s ; le render target est retiré à 94.2 s.
- Remplacer un GLB impose de revoir ses landmarks, ses axes, sa licence et ses bounds, pas seulement son nom de fichier.
- Un `BoxBatch` fige sa matrice monde. Si on le parente ensuite à une racine transformée, utiliser le pattern existant d'`unfreezeWorldMatrix()`.

### Faisceaux, transparence et ancienne architecture

- David a un écran opaque supporté, une projection arrière et deux spotlights d'allée. Le nom apparaît après l'allumage de la lumière.
- La typographie de David doit recevoir les lumières (`disableLighting = false`). Les spots d'allée visent **l'intérieur du panneau**, du centre vers les côtés et retour, pas x = ±10.8 / y = 23.7 hors de la fiche. Falloff physique, spots ciblant seulement le panneau et specular du support à zéro évitent les énormes halos blancs sur les montants.
- Une texture de texte avec alpha peut être triée comme transparente même si son fond semble opaque. Pour ces écrans, `MATERIAL_OPAQUE` empêche les cônes arrière de passer artificiellement devant le texte.
- Le glow des meshes **`FX/Cinema /`** tient compte de **`material.alpha * mesh.visibility`**. Sans cela, un cône léger devient un masque blanc énorme.
- De **48.8 à 95 s**, l'ancien intérieur digital, ses panneaux NODE, les vumètres, les particules / rubans musicaux concernés et le spectre au sol sont masqués ou calmés. Ne pas réactiver ce bruit pendant la première de David.
- Les meshes du titre sont masqués de **89.85 à 95 s**, sous la transition optique / fog, pour laisser voir le passage spatial. L'architecture du D revient à 95 s. La passerelle T–D au sol reste gérée séparément.
- Si un objet semble absent, vérifier aussi ses parents et les gates de [DevFestScene.ts](src/scene/DevFestScene.ts), pas uniquement son `setEnabled` local.
- Préserver le comportement au rewind : les états doivent être recalculés dans les deux sens, pas uniquement activés une fois.

### Havok et pop-corn

Havok simule en direct les cubes du violon / archet de **22 à 38 s**, le mur du T et **72 grains** de 78.1 à 84.5 s. L'application ne fait avancer la physique live que pendant ces fenêtres. Le violon utilise les thin instances avant la chute, puis des cubes individuels avec collisions au sol. Les **64 boîtes** du cassoulet sont calculées par le même Havok au chargement, à **60 pas fixes/s**, avec cylindres, panier, sol et murs réels du couloir. Les corps temporaires sont ensuite détruits et seules les poses sont rejouées pour des seeks/restarts exacts. Le bac BUFFER OVERFLOW n'éparpille plus ses cubes : 32 restent dans le même volume, le cube supplémentaire provoque l'eau en shader et le texte seulement à son arrivée. Aucun second moteur physique ni simulation de fluide coûteuse.

Les deux seaux sont ancrés à **80.4 s**, offsets latéraux **-5 / +5**, hauteur **18**, taille verticale **4.8**. Leur inclinaison est symétrique dans le repère de la route, vers l'allée. Le déversement débute une fois la bascule terminée, par vagues de six grains par côté espacées de 0.12 s. Les vitesses initiales visent la future position de la caméra à hauteur de tête ; Havok assure ensuite les collisions et le rebond au sol. Le public doit voir les seaux basculer avant de traverser les grains. Le collider de sol couvre tout l'auditorium et ses parois latérales retiennent les grains du déversement anticipé.

**`CINEMA_FLOOR_TOP = 0.28`** est partagé entre scène et collider : le sol visuel est légèrement surélevé. Un collider resté à y = 0 enterre les grains dans le deck. Le test physique simule jusqu'au repos et vérifie cette cohérence.

Les corps temporaires sont détruits en fin de fenêtre et recréés lors d'un seek / rewind. Un seek à l'intérieur de l'événement utilise une position analytique approximative : **ce n'est pas une reproduction exacte des collisions déjà simulées**. Valider le déversement en lecture réelle, pas seulement par saut de temps.

## 8. Audio et vumètres : branche indépendante de la caméra

Les vumètres comportent **trois colonnes** : graves / kick électro, médiums / corps de l'alto, aigus / hats et harmoniques. Cinq groupes existent, dont un dans le T, un derrière Mitsuru et un avant la sortie. Leur état idle doit être visible pendant l'approche, même sans son.

`violaEnergy` issu du mix est une **approximation de bande médium**, pas une séparation d'instruments. Pour un pilotage précis, utiliser une entrée dédiée ou les événements explicites.

API publique utile dans la console ou depuis le scheduler musical :

```javascript
showController.trigger("kick");
showController.trigger("snare", 0.8);
showController.trigger("drop");
showController.setLevels({ bass: 0.7, violaEnergy: 0.8 });
showController.setSection("OVERCLOCK");
showController.setSection(null);
```

Les valeurs sont validées ; une section force une **palette**, pas une position de caméra. Le relay optionnel `npm run bridge` écoute par défaut sur **ws://127.0.0.1:8787**, uniquement en local. Il n'est pas démarré / contacté automatiquement. Une page publique Strudel n'est pas un origin autorisé pour ce relay. Voir le protocole et les permissions dans [README.md](README.md).

Une seconde branche optionnelle fournit maintenant les **haps exacts** du Strudel
local : [STRUDEL_SYNC.md](STRUDEL_SYNC.md). La page `/strudel/` utilise le vrai
CodeMirror Strudel, des versions npm pinnees et des samples de test locaux.
BroadcastChannel, heartbeat/ack et [MusicEventBus.ts](src/engine/MusicEventBus.ts)
sont independants de la capture FFT existante. Les cues sont gardes par les
fenetres de [avProtocol.ts](src/engine/avProtocol.ts), sans retimer la camera ni
recreer les corps physiques. Diagnostics et tests manuels K/S/H/I restent dans D.
Le demo conserve les 150 BPM de l'extrait fourni ; ce n'est pas la composition
de keynote, dont les banques Roland, soundfonts et Hydra doivent etre stages
localement pour une utilisation complete hors ligne.
L'ancienne [composition originale](examples/devfest-keynote.strudel), conservée
comme **Previous keynote**, est
separee de cet extrait : 3:00 en si bemol mineur, grille electronique 150 BPM,
cordes synthetisees progressives et notes originales, sans citation de Barber.
La montee initiale est plus rapide ; pizzicatos et vents synthetiques se
repondent, puis cors et cordes hautes elargissent l'ensemble. Chaque arrivee
de fiche a sa cadence, tiree des memes horaires `SPEAKERS` que la mise en
scene. F7 prepare le tape-stop sur F4, puis Bbm resout a la reouverture CRT.
L'alto live reste externe et central au debut, dans l'objectif (83.2-96 s)
et apres l'impact de sortie (159 s). La relance a 96 s se densifie jusqu'a
la sortie ; la resolution finale reste a 173 s. Les phrases one-shot bornent
leurs queries avant expansion, sans supprimer leurs notes interieures.
Elle utilise uniquement les syntheses locales et les trois WAVs generes.
Chargement explicite avec confirmation dans `/strudel/`; pas de boucle apres
112.5 cycles, mais le scheduler reste actif en silence jusqu'au Stop.
Le [verificateur navigateur](scripts/verify-av.mjs), `npm run verify:av`, repete
180 secondes reelles. `AV_CAPTURE=1` ajoute le vrai mix Strudel via un relay
WebRTC local au FFT et mesure crete/RMS/silence final, sans automatiser les
permissions de capture d'onglet ni changer le routage audio de production.
Pour la keynote, les fenetres PCM de 20 ms sont calees sur l'horloge de la
vraie enveloppe de pitch : montee initiale, silence du trait CRT, cadences
speaker, respiration dans l'objectif, relance et espace du pullback.

Les trois versions actuelles viennent de
[devfest-viola.strudel](examples/devfest-viola.strudel) et du
[catalogue](src/strudel/scores.ts) : Arcade symphonique / ré mineur,
Cinema suspendu / sol mineur, Trance heroique / ré mineur puis ré majeur.
Défaut : Arcade. **Music version** dans le lobby et le sélecteur Strudel utilisent
les mêmes identifiants `arcade`, `cinema`, `trance`, `legacy`.
En manuel : Stop, sélectionner, **Load selected score / 3:00**, confirmer,
puis **Start show + music**. Le brouillon sauvegardé n'est jamais remplacé
automatiquement ; changer le sélecteur seul ne change pas le code de l'éditeur.
Le mode iframe reçoit score + UUID de lancement et ne sauvegarde pas son code.
PLAY et Space suivent tous deux la sélection ; les erreurs de REPL sont
transmises uniquement depuis l'iframe / origin / lancement courants.

Les nouvelles versions ajoutent sept familles acoustiques CC0 (18 WAVs VSCO 2 CE)
aux couleurs pulse/FM/supersaw/sub/acid/choeur. Les samples sont locaux,
préchargés avant chaque évaluation, y compris après une lecture Legacy dans
le même contexte audio. Voir [STRUDEL_SYNC.md](STRUDEL_SYNC.md) pour le détail.
Le tempo et la durée restent 150 BPM / 0.625 CPS / 180 s.
`AV_CAPTURE=pcm` mesure explicitement le mix live sans relay WebRTC, pas le FFT.
Le tap de validation exclut les OfflineAudioContexts de génération de réverb.

## 9. Assets, licences et portabilité

- Les assets Kenney sont dans [public/assets/kenney](public/assets/kenney), avec leurs licences CC0 et leurs dépendances de textures.
- Douze GLBs cinéma / espace sont versionnés dans [public/assets/cinema](public/assets/cinema). **Onze sont préchargés et mis en scène** ; `movie_theatre_environment.glb` est conservé mais n'est plus chargé ni affiché.
- Les textures des GLBs cinéma sélectionnés sont embarquées. Les originaux et attributions CC BY 4.0 figurent dans [CREDITS.md](CREDITS.md). Ne pas recopier d'autres modèles sans vérifier licence et coût géométrique.
- Le projecteur **Cinema Movie Projector AP5**, environ 1.37 million de triangles et licence **CC BY-NC**, a été exclu. Le projecteur affiché est procédural.
- Les GLBs distribués restent inchangés ; suppressions de socles, placements, animation et ajouts de rayons de bobines se font au runtime.
- L'habillage fourni par l'événement est dans [src/assets/event](src/assets/event) : drapeau vert, signature anniversaire, et image violette conservée mais plus affichée au-dessus de David.
- Les 18 WAVs d'orchestre sont dans [public/assets/strudel/orchestra](public/assets/strudel/orchestra), licence CC0 locale et sources détaillées dans [CREDITS.md](CREDITS.md). [orchestraSamples.json](src/strudel/orchestraSamples.json) fixe la révision et les racines réelles vérifiées dans les SFZ / mapping piano. [stage-orchestra.mjs](scripts/stage-orchestra.mjs) nécessite ffmpeg uniquement pour restager, jamais pour jouer.
- Une nouvelle machine n'a **pas besoin du dossier Downloads/SketchfabModels d'origine**, ni d'archives jointes au chat, ni des anciens IDs de pages navigateur.
- Transférer le dépôt complet, **assets + lockfile + ce document**, pas seulement les fichiers TypeScript. Si le transfert passe par Git, vérifier que les changements à transmettre ont bien été commités / poussés.

## 10. Installation et répétition sur une autre machine

Stack de référence : Babylon.js 9.28, Havok 1.3, TypeScript 5.9, Vite 7, Vitest 4. Les versions exactes reproductibles sont celles de [package-lock.json](package-lock.json).

Node.js **22.12+ ou 20.19+**, puis depuis la racine :

```text
npm ci
npm run dev
```

Le dev server annonce normalement http://127.0.0.1:5173. Pour la version de scène :

```text
npm test
npm run build
npm run preview
```

Le preview annonce normalement http://127.0.0.1:4173. Vérifier la sortie du terminal si un port est occupé ; ne pas dépendre des ports utilisés sur l'ancienne machine. Attendre **SYSTEM READY** avant de démarrer. L'installation des dépendances nécessite leur accès initial ; ensuite la représentation utilise ses ressources locales. Ne pas lancer via `file://`.

| Commande opérateur | Action |
| --- | --- |
| Espace | Lecture / pause / reprise |
| R | Restart |
| D | Flight control, scrub, vitesse, jumps narratifs, audio, diagnostics |
| 1–5 | Phases principales |
| 6 | Préparation du reveal à 155 s |
| F | Plein écran |
| Escape | Retour au lobby |

Pour inspecter un beat sans attendre tout le show :

```javascript
window.devfest.seek(69.8);
window.devfest.timeline.pause();

// Vérifier la vitesse 1 dans D, puis lancer la répétition complète :
window.devfest.start(0);
```

Les jumps nommés incluent CLAPPERBOARD, CINEMA, DAVID, FILM REELS, POPCORN, CAMERA LENS, PROJECTOR, SPACE WARP, D ENTRY, ERIC, D ESCALATION, MITSURU et FINAL REVEAL.

**Attention aux captures trompeuses :** un onglet caché met la lecture ordinaire en pause, mais la lecture explicitement synchronisée avec Strudel garde son horloge active. Le navigateur peut suspendre les frames dans les deux cas. Vérifier `document.hidden` et travailler dans une page réellement visible ; certaines captures d'un onglet caché semblaient figées malgré des changements de state.

Balanced plafonne le buffer à **2560×1440** ; Native utilise la résolution réelle. Après un redimensionnement, attendre le resize puis vérifier le buffer du moteur avant d'affirmer qu'un test a été fait en 4K.

## 11. Validation : ce qui est acquis et ce qui reste à refaire

Référence validée le 6 octobre 2026 :

- **70 tests / 13 fichiers**, TypeScript et build Vite réussis.
- Deux répétitions de production complètes à vitesse 1 ; la dernière a duré environ **180.004 s réelles**, avec horloge arrêtée exactement à 180.
- Aucun error / warning navigateur et aucune requête de ressource externe pendant ces répétitions.
- Dernière caméra `(0,1110,-755)` en 16:9 ; passerelle T–D toujours activée à y = 0 ; image finale vérifiée visuellement.
- Les 36 grains tombent et sont nettoyés ; le premier termine vers y = **0.578**, au-dessus du deck de 0.28, pas dedans.
- Sièges et chaise mesurés à **4.2 unités de haut** ; clone de caméra supportant le fondu ; clap réellement ouvert puis fermé.

Passe visuelle du **7 octobre 2026** :

- **34 tests ciblés / 10 fichiers** et build TypeScript / Vite réussis, sans prétendre avoir relancé toute la suite Strudel.
- Répétition réelle **180.007 s**, vitesse 1, navigateur actif en 1600×900 et niveaux / kicks injectés par l'API. Zéro erreur, warning, requête externe ou requête échouée.
- Sprites fixes malgré les basses ; huit surfaces CRT de 81 sommets entièrement couvertes ; props cinéma activés dès l'entrée et au rewind ; ancien panneau du clap et snippets d'Eric absents.
- Reveal inchangé : caméra `(0,1110,-755)`, pont activé à y = 0, son point le plus haut restant sous 0.5.

Suivi fusée :
- **33 tests ciblés / 5 fichiers** et build TypeScript / Vite réussis : placement au prochain coin, pad immobile, contact exact sous le toit, cadrage du nez / impact, particules bornées, seek / replay, cleanup et enveloppes asymétriques du regard.
- Inspection active 1600×900 de l'approche, du décollage, de l'explosion et du virage vers ORBITAL LINK ; répétition réelle **139–180 s en 41.003 s**, vitesse 1.
- Zéro erreur / warning navigateur, requête échouée ou ressource externe ; finale `(0,1110,-755)` et pont au sol conservés. Cette passe ne prétend pas avoir rejoué toute l'intro de trois minutes.
- Après le dernier ajustement pour éviter l'interpénétration initiale des blocs, nouvelle lecture réelle de la fenêtre **109–119 s**, chute Havok et cleanup vérifiés.

Suivi clap / CRT / tape-stop Strudel :
- **92 tests ciblés / 10 fichiers** et build TypeScript / Vite réussis.
- Répétition de production entière à vitesse 1 avec **Start show + music** et capture du vrai mix Strudel, réseau désactivé après préchargement : horloge finale 180 s, caméra `(0,1110,-755)`, zéro erreur / warning navigateur et zéro requête externe.
- Shader actif de **50.651 à 52.169 s**, trait fermé sur **15 images** ; cue du clap reçu à **51.035 s** pour un repère de 51.03 s. Descente Web Audio réellement mesurée à **-3600 cents** sur **0.475 s**, et pas seulement simulée dans les tests.
- Les **72 grains** sont présents simultanément puis nettoyés ; shader détaché à la fin. Pic du mix **0.477**, RMS final **0**, crescendo conservé.
- Clap vu avant son ancien seuil d'apparition ; images à temps constant identiques et rendu hors transition identique après aller-retour par seek, avec rendu explicite dans la page de prévisualisation masquée.
- UI vérifiée : Evaluate reste indépendant, et les lancements sur spectacle caché / non prêt / déjà en lecture arrêtent la musique et affichent un refus explicite. Le cycle de heartbeat est borné à zéro pendant la prélecture audio négative de Strudel.

Correctif du lancement depuis l'autre onglet :
- Le refus d'onglet caché de la passe précédente était un bug d'usage : il arrêtait Strudel après la première note. Ce refus a été retiré ; les refus de renderer non prêt / déjà en lecture restent actifs.
- **21 tests ciblés / 4 fichiers**, type-check et build réussis. [App.test.ts](src/engine/App.test.ts) couvre le lancement sans frame, le rattrapage du temps, les changements d'onglet, l'auto-pause ordinaire et l'annulation des timers.
- Vérification dans deux vrais onglets d'une même fenêtre Edge, avec `connectOverCDP({ noDefaults: true })` : Babylon réellement caché, render loop explicitement arrêté, démarrage confirmé et musique toujours active ; au retour, horloge à **3.5142 s** pour **3.517 s** attendues, zéro erreur navigateur. Auto-pause ordinaire conservée.
- Attention : Playwright active normalement l'émulation de focus et peut présenter tous les onglets comme visibles. Les précédents tests avec pages ordinaires ne reproduisaient donc pas ce cas réel. Cette passe cible le démarrage, sans prétendre avoir relancé une répétition complète de trois minutes.

Réorchestration de la keynote :
- **19 tests ciblés / 3 fichiers** ([keynote.test.ts](src/strudel/keynote.test.ts), helpers Strudel et lancement App), type-check et build TypeScript / Vite réussis. Les phrases d'accents conservent leurs notes intérieures et le score reste muet hors de ses 112.5 cycles.
- Répétition entière de production à vitesse 1, **Start show + music**, vrai mix Web Audio, FFT et réseau désactivé après préchargement : horloge finale **180 s**, caméra `(0,1110,-755)`, aucune erreur / warning navigateur ni requête externe ; réévaluation sans nouvelle session et reconnexion vérifiées.
- Pic audio **0.523**, RMS initial **0.0253**, climax **0.0735**, fin **0**. Montée initiale mesurée **2.96×** ; RMS objectif **0.00448**, relance **0.0621**, pullback **0.00671**. Les quatre cadences sont audibles et le RMS du trait phosphore est **0**.
- Clap appliqué à **51.039 s** pour **51.03 s** prévu ; vraie rampe sur F4 à **-3600 cents / 0.475 s**. CRT de **50.655 à 52.172 s**, **15 images** de trait tenu ; **72 grains** puis cleanup complet.
- Cette validation confirme les horaires et la dynamique technique, pas le goût musical ni l'équilibre avec le vrai alto ; répétition avec l'instrumentiste encore nécessaire.

Seconde passe musicale historique sur l'ancienne keynote (ne pas confondre avec les trois versions actuelles) :
- Retour utilisateur : portraits d'orateurs musicalement étranges ; transitions trop violentes vers l'accalmie de la caméra et vers la sortie. Après écoute de la version en cours : « pas trop mal ».
- Cause identifiée : accords de portrait (F7 puis Gb/Eb/Db) en conflit avec l'harmonie réelle, deux portraits (17 s, 99 s) en contretemps de croche, baisses de gain saccadées autour des orateurs, et coupures nettes de toutes les voix aux frontières de section.
- Fait dans [devfest-keynote.strudel](examples/devfest-keynote.strudel) : portraits = montée sus4 (t-1.6 s) résolue sur un accord de si bémol mineur exactement sur la fiche, cloche sur le temps suivant ; voix décoratives (flûte / pizz / cordes hautes) retirées de t-1.8 à t+2.6 s ; sections `ease` 76.8 / `hush` 80 (descente en volume, kicks, hats, filtre) ; `rise` 155.8 (roulement de caisse claire crescendo, Fm7) ; impact + floraison à 159 s ; les accords tenus se terminent à la section suivante avec leur relâchement naturel (coupure dure seulement avant le tape-stop et la fin) ; fragments de cordes < 0.5 s supprimés.
- [keynote.test.ts](src/strudel/keynote.test.ts) : 10 tests (dont portraits et transitions) et 16 avec helpers passent ; build réussi.
- [verify-av.mjs](scripts/verify-av.mjs) : mesure l'horloge du spectacle dès son vrai démarrage (le décalage de 1.2 s venait du lead-in) ; ajout de mesures swell / lens / exit, d'un profil RMS par seconde et d'un mode `AV_DEBUG=1` (logs console du scheduler).
- **Point ouvert important :** la répétition réelle (profil RMS par seconde) mesure un **silence exact d'environ 82 à 96 s et après 163 s**, alors que les tests de haps (y compris requêtes de la taille du scheduler) trouvent bien les notes (pads 83.2 s, 89.6 s ; afterglow 163 s...). La première répétition de la journée (ancienne version) mesurait 0.0045 et 0.0067 dans ces zones. À éclaircir : vrai silence audio ou artefact de mesure ?
  - Pistes : requêtes ignorées par le scheduler (`skip query: too late`, charge machine élevée, load average ~8.6 pendant les tests) ; changement de fenêtre du worklet de mesure (20 ms, `inputs` vide en silence) ; notes sans `room: 0` / sans coupure dure ; ou vrai problème de lecture des pads graves à bas gain / lpf bas.
  - Le tap du vérificateur interceptait aussi les connexions des OfflineAudioContexts de réverb et tentait de les connecter à un mix live d'un autre contexte. Ce défaut de mesure est corrigé ; les anciennes mesures de silence ne suffisent donc pas à conclure sur le son réel. Ne pas relancer aveuglément des répétitions de trois minutes sans réussir d'abord le preflight natif.

### Trois compositions actuelles et retour musical utilisateur

- **58 tests ciblés / cinq fichiers**, type-check et build Vite réussis :
  [scores.test.ts](src/strudel/scores.test.ts), ancienne keynote, helpers,
  lancement App et mode performance. Le test de montée audio rejette désormais
  un RMS initial nul et un ratio infini.
- Retour utilisateur : mauvaise reprise après le clap / rythme vers David sur
  les trois versions, préparation de sortie trop brutale. Cause trouvée :
  les phases réancraient leurs patterns rythmiques sur un début arbitraire
  (intervalle de kick de 0.22 s au lieu de 0.4 s après le clap) ; les pauses
  décoratives des speakers étaient calculées en temps local avant le décalage.
- Correction commune : grille globale pour les voix rythmiques, accords tenus
  autorisés sur un cue précis, pauses décoratives en temps absolu. Pickup
  orchestral doux **51.38-52.8**, puis **64 kicks espacés de 0.4 s** jusqu'à
  78.4. Dm-Bb-C prépare F pour David ; sa réponse flûte commence à 63.6 s,
  sans flûte régulière concurrente.
- Préparation finale anticipée de **147.2 à 159** (11.8 s) : Bb-Gm-A7,
  arpèges élargis puis raréfiés, respiration finale à demi-temps ; roulement de
  caisse claire précipité et souffle de bruit blanc supprimés. Entrée de cor
  adoucie au reveal. Cinema transpose de cinq demi-tons ; Trance finit en majeur.
- Accalmie après pop-corn de 78.4 à 81.6, accompagnement suspendu jusqu'à 96 ;
  relance plus forte dans le D. Pas de changement caméra, physique ou mise en
  scène. Le **clap 3D n'a pas été supprimé** : GLB chargé, meshes actifs et
  vrai cadrage inspecté à **49.8 s**, sous LEVEL COMPLETE.
- Navigateur : les trois versions démarrent depuis le même onglet principal,
  focus conservé, aucune fenêtre supplémentaire, brouillon intact ; Space,
  passage Legacy -> Cinema (18 buffers chargés) et erreur de parsing affichée
  sur le lobby ont été vérifiés.
- **Blocage audio historique du 7 octobre, validation alors non terminée.** Une répétition Arcade
  a atteint les contrôles visuels de fin avec l'ancien tap invalide, puis a
  échoué aux seuils audio ; ce n'est pas une répétition musicale validée.
  Après correction du tap, le contexte live dit `running` mais son horloge
  reste vers **0.005-0.011 s**, scheduler en prélecture négative. Un oscillateur
  natif seul, sans Strudel ni tap, avance seulement de **0.0053 s en 1.5 s**
  dans Edge et dans le navigateur interactif après clic. La bonne identité du
  contexte global / contrôleur / destination a aussi été confirmée.
  Le relay WebRTC de test ne reçoit pas de paquets. Ne pas modifier
  AudioAnalyzer ni les services audio / permissions du poste partagé pour
  masquer ces blocages.
- Prochaine vérification : contrôler d'abord que l'horloge d'un AudioContext
  natif avance réellement ; sur un poste fonctionnel, lancer successivement
  `AV_CAPTURE=pcm npm run verify:av -- arcade`, puis `cinema`, puis `trance`
  avec `AV_URL` sur le preview local. Vérifier mix audible dans l'objectif /
  finale, headroom, silence du trait CRT et fin, puis écouter avec l'altiste.
  Aucun goût musical ni équilibre live n'est certifié par les tests seuls.

### Performance Strudel et caméra popcorns — 8 octobre

- Demande utilisateur : chutes de framerate avec Strudel connecté ; ne plus
  lever la caméra près des popcorns, continuer vers l'objectif. L'utilisateur
  a confirmé l'adaptation des trajectoires pour garder une pluie visible.
- Profilage réel : l'horloge AudioContext avance normalement sur ce poste,
  contrairement au blocage précédent. Le CodeMirror de l'iframe cachée gardait
  son Drawer actif et recalculait/surlignait les patterns ; ce travail n'est
  pas nécessaire à l'audio ni à BroadcastChannel.
- Sur le passage dense isolé **128-137 s**, en 1920x1080 et vrai Web Audio :
  ancien lecteur = **5 frames >50 ms en 8 s**, p99 **83.3 ms** ; arrêter le
  Drawer supprimait les pics, déconnecter seulement les événements ne les
  supprimait pas. Nouveau lecteur, vérifié deux fois = **p99 16.8 ms**,
  **0 frame >33.4 ms**, 13 événements/s, comme le contrôle sans musique.
  Cela ne certifie pas le poste de projection en 4K.
- [performancePlayer.ts](src/strudel/performancePlayer.ts) utilise le vrai
  `core.repl`, avec les mêmes hooks, tempo, output audio et lancement confirmé,
  mais sans CodeMirror ni boucle graphique. L'éditeur manuel reste disponible ;
  son Drawer est suspendu quand la page est cachée puis repris quand elle
  redevient visible, sans arrêter le scheduler/audio.
- Régression de la caméra : cible naturelle / direction vers l'objectif,
  pitch <8 degrés de 76 à 84 s, rotations globales <45 degrés/s et final
  conservés. Les deux seaux restent entièrement visibles au moins 1.5 s
  plus tôt dans l'approche.
- [CinemaPopcorn.ts](src/scene/CinemaPopcorn.ts) garde les 72 grains, les deux
  seaux, hauteurs, release **78.1**, nettoyage **84.5** et replay. Une moitié
  garde l'interception au-dessus de la caméra ; l'autre vise 2.1 s plus loin
  dans l'allée. Tests Havok : au moins 12 grains de chaque seau visibles en
  chute pendant 0.35 s, au moins 24 passages au-dessus de la tête, collisions
  au sol, cleanup et retour arrière. Le rayon des sphères physiques est
  explicitement celui des meshes, plutôt que le rayon réduit de leur boîte.

Ce sont des résultats historiques, **pas une garantie pour la prochaine modification ou un autre GPU**. Aucun 60 FPS soutenu sur le vrai poste de projection n'a été certifié. Refaire un profil Native / 4K et une répétition avec les vrais musiciens sur cette machine.

Tests les plus utiles pour une itération de mise en scène :

- [CameraPath.test.ts](src/camera/CameraPath.test.ts) : trajet, clearance, portes, vitesse du D, rotations et reveal.
- [StageReadability.test.ts](src/scene/StageReadability.test.ts) : cadrage complet des textes, clap, objectif, durée des blagues.
- [SceneClearance.test.ts](src/scene/SceneClearance.test.ts) : murs, roof, core orbital, fog et framing.
- [CinemaAssets.test.ts](src/scene/CinemaAssets.test.ts) : bounds sans socles, échelle et clones supportant `visibility`.
- [CinemaWorld.test.ts](src/scene/CinemaWorld.test.ts) : cut, écrans, ordre des étapes et rewind.
- [ClapCrtTransition.test.ts](src/effects/ClapCrtTransition.test.ts) : enveloppes bornées, ligne pendant le changement de décor, précompilation / erreurs, pause / seek et ordre après reconstruction du pipeline.
- [CinemaCRT.test.ts](src/scene/CinemaCRT.test.ts) : surface entière, courbure et UV des CRT.
- [PixelWorld.test.ts](src/scene/PixelWorld.test.ts) : atlas et transforms fixes malgré les basses, le temps et le rewind.
- [CinemaPopcorn.test.ts](src/scene/CinemaPopcorn.test.ts) : vrais corps Havok, repos sur le bon sol, nettoyage et replay.
- [DigitalMoments.test.ts](src/scene/DigitalMoments.test.ts) : progression sans trou et cleanup avant le final.
- [DigitalOverflow.test.ts](src/scene/DigitalOverflow.test.ts) : corps Havok, chute / repos / nettoyage et replay.
- [DigitalProps.test.ts](src/scene/DigitalProps.test.ts) : retrait des anciens panneaux, fusée au sol et conservation du satellite.
- [DeployRocket.test.ts](src/scene/DeployRocket.test.ts) : coin suivant, pad fixe, montée plafonnée, explosion déterministe et cleanup / rewind.
- [ShowLighting.test.ts](src/effects/ShowLighting.test.ts) : lasers et spectres.

Les tests NullEngine mockent certains textes / DynamicTextures car ils n'ont pas l'environnement graphique du navigateur. **Des tests verts ne remplacent pas une inspection visuelle.**

Avant de terminer une modification visible : tester les fenêtres concernées, revenir en arrière, vérifier l'audio absent / réactif, puis faire une lecture complète du build de production à vitesse 1. Examiner le clap non obstrué, la lisibilité des quatre speakers, les intersections, l'échelle des props, la cause et l'effet du pop-corn, l'entrée frontale dans l'objectif, la progression du D et le reveal.

## 12. Point de départ recommandé pour le prochain agent

1. Lire ce mémo et la nouvelle demande ; ne pas transformer les anciennes demandes abandonnées en tâches à refaire.
2. Vérifier l'état Git et lancer la version présente pour voir le problème avant modification.
3. Ouvrir [speakers.ts](src/content/speakers.ts), [showBeats.ts](src/content/showBeats.ts) et le module indiqué par la cartographie ci-dessus. Lire la caméra seulement si le changement touche le placement / regard / timing.
4. Réutiliser les helpers d'ancrage, les instanciations et les gates de visibilité existants.
5. Modifier une composition cohérente plutôt que saupoudrer des props ou décaler des timestamps isolés.
6. Préserver le final, vérifier la perception réelle et mettre à jour ce document si une décision structurante change.

**Objectif des prochaines itérations : améliorer ce spectacle déjà fonctionnel, pas redécouvrir son concept ni le reconstruire.**
