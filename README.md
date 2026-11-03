# Matboksen

Familiens kokebok. En enkel nettapp uten server: oppskriftene ligger i `db.json` i dette repoet, og appen lagrer endringer via GitHubs API.

## Kom i gang

### 1. Publiser med GitHub Pages

Settings → Pages → *Deploy from a branch* → `main` / `/ (root)`. Etter et minutt eller to ligger appen på `https://<brukernavn>.github.io/Matboksen/`.

> **Merk:** På GitHubs gratisplan virker Pages bare for offentlige repoer. Med GitHub Pro virker det også for private, men **nettsiden er likevel offentlig**, og det samme er `db.json` og bildene, fordi Pages publiserer alle filene. Et privat repo skjuler altså ikke oppskriftene hvis Pages er slått på.

### 2. Lag en nøkkel (én per person som skal redigere)

GitHub → Settings → Developer settings → Personal access tokens → **Fine-grained tokens** → *Generate new token*:

- **Repository access:** Only select repositories → `Matboksen`
- **Permissions → Repository permissions → Contents:** Read and write
- **Expiration:** velg selv; nøkkelen må fornyes når den utløper

Lim nøkkelen inn under **Innstillinger** i appen. Den lagres bare i den nettleseren og blir aldri lagt i repoet. **Lim aldri nøkkelen inn i en fil i repoet.**

Personer som bare skal lese, trenger ingen nøkkel så lenge Pages er offentlig. Er repoet privat og uten Pages, trenger også de en nøkkel, med *Contents: Read-only*.

## Slik er dataene bygget opp

Alt ligger i `db.json`:

| Del | Innhold |
| --- | --- |
| `units` | Fast liste over enheter (stk, g, kg, ml, dl, l, ts, ss, klype) |
| `ingredients` | Ingredienser, delt mellom oppskrifter. `aliases` = alternative navn |
| `cuisines` | Kjøkken/land. Opprettes fra skjemaet |
| `tags` | Merkelapper (sunn, hverdag …). Opprettes fra skjemaet |
| `recipes` | Oppskrifter med linjer (`ingredientId`, `amount`, `unitId`, `note`, `group`), steg, bilde og kilde |

Kjøkken, merkelapper og ingredienser kan opprettes, få nytt navn og slettes under **Lister** i appen. Sletter du et kjøkken eller en merkelapp, fjernes det fra oppskriftene som bruker det. En ingrediens som er i bruk, kan ikke slettes; slå den sammen med en annen i stedet.

Bilder legges i `images/`, skalert ned til maks 1600 px (WebP, eller JPEG i Safari).

## Hvordan lagring fungerer

Ved lagring henter appen nyeste `db.json`, gjør endringen og skriver filen tilbake. Har noen andre lagret i mellomtiden, avviser GitHub skrivingen, og appen henter på nytt og prøver igjen (opptil fire ganger). Hver lagring blir en commit, så all historikk ligger i git.

## Kjente begrensninger

- Redigerer to personer **samme** oppskrift samtidig, vinner den som lagrer sist.
- Med nøkkel leser appen rett fra API-et og ser endringer med en gang. Uten nøkkel leses den publiserte Pages-versjonen, som henger ca. ett minutt etter.
- Når en oppskrift slettes eller får nytt bilde, blir det gamle bildet liggende i `images/`.
- Import fra URL er ikke laget ennå (se under).
- Uten nettilgang virker ikke appen ennå (offline er i backloggen).

## Neste steg

- Import fra URL med godkjenning av utkast
- 60-tallsdesign (rutete kokebok, polaroidbilder med binders)
- Backlog: porsjonsskalering, handleliste, offline
