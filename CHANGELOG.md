# Endringslogg

Versjonsnummeret vises nederst i appen. Ved ny versjon: oppdater `VERSION` i `app.js`, `?v=` i `index.html` (to steder) og legg til en linje her.

## 0.5.9 – 2026-11-04

- «Bytt bilde» / «Legg til bilde» rett under bildet på oppskriften; bildet lagres med en gang.
- I skjemaet ligger bildet ved «Kort beskrivelse», med forhåndsvisning og norsk «Velg bilde»-knapp.
- Kortere hjelpetekster i skjemaet; forklaringen over ingrediensene er fjernet.

## 0.5.8 – 2026-11-04

- Henting fra lenke tar ikke lenger med nettsidens beskrivelse eller bilde. «Kort beskrivelse» (teksten på polaroiden) og bildet er bare familiens egne.
- «Fjern bildet» i skjemaet når en rett har bilde.

## 0.5.7 – 2026-11-04

- Ingredienslinjer kan flyttes opp og ned (↑ ↓), så ingredienser som hører sammen kan samles. Rekkefølgen lagres.
- Kjøkken velges fra en liste i skjemaet og er flyttet ned ved merkelappene. Nye kjøkken legges til under Lister.
- Polaroid: ekte proporsjoner med bred stripe nederst der den korte beskrivelsen står håndskrevet, mykere skygge, glattere skrå kant og varmere fargetone.
- Rettet: teksten «null» ble vist over oppskrifter uten hentestatus (feil fra 0.5.6).

## 0.5.6 – 2026-11-04

- Henting fra lenke: lim inn en lenke (f.eks. matprat.no) på en ny eller tom rett og trykk Lagre. Ingredienser (mengde, enhet, ingrediens), fremgangsmåte, porsjoner, tid og bilde hentes og lagres i db.json. Alt kan redigeres etterpå.
- «Hent fra lenken» / «Hent på nytt fra lenken» ved kilden på oppskriften.
- Statuslinje på oppskriften mens den hentes, og melding om resultat eller feil.
- Lenkefeltet ligger nå øverst i skjemaet; tittel kan stå tom når det er lenke.
- Nye filer: import_recipe.py (leser oppskriften) og .github/workflows/import.yml (GitHub Actions som kjører den).

## 0.5.5 – 2026-11-04

- Toppen viser bare «Matboksen» (fjernet «FAMILIENS»).

## 0.5.4 – 2026-11-03

- Fjernet dobbel navigasjon på oppskrifter: én linje øverst («← Alle retter» og «Rediger») som blir liggende synlig når du blar.
- Skjemaet har ikke lenger egen tilbake-lenke øverst; «Lagre» og «Avbryt» ligger fast nederst på skjermen.
- «Egen oppskrift» vises ikke lenger; kilde vises bare når det finnes en lenke.
- Feltene «Merknad» og «Gruppe» er fjernet fra ingredienslinjene i skjemaet. Eksisterende verdier beholdes og vises fortsatt på oppskriften. (Gruppering kommer tilbake som overskrifter i ingredienslisten.)
- README: oppdatert veiledning for nøkkel (GitHubs nye «Add permissions»).

## 0.5.3 – 2026-11-03

- «Lagre og test» sjekker nå om selve nøkkelen kan lagre (før sjekket den bare om GitHub-brukeren hadde tilgang, og kunne si «Du kan lagre» selv om nøkkelen bare kunne lese).
- Tydeligere feilmelding når nøkkelen mangler skrivetilgang, med hva som må endres på GitHub.

## 0.5.2 – 2026-11-03

- Alt som ser klikkbart ut, er klikkbart: kjøkken på oppskriften, stemplene (merkelapper), kjøkkenoverskriftene i listen og navnene under Lister tar deg til listen filtrert på det du trykket.
- Aktive filtre vises som røde lapper over listen («Viser kun: Kjøkken: Norsk ×»); trykk for å fjerne.
- Tom liste etter filtrering har knappen «Vis alle».
- Etter at nøkkelen er testet i Innstillinger, er det en lenke tilbake til oppskriftene.

## 0.5.1 – 2026-11-03

- Første versjon med design: «Husmorkokeboka» (60-tall) – rutepapir, skrivemaskinskrift, innholdsfortegnelse gruppert på kjøkken, polaroidbilde med teip, merkelapper som stempler, beskrivelse som håndskrevet notat.
- Filtrene «Maks tid» og «Inneholder ingrediens» er fjernet.
- Tilbake-lenke og Rediger-knapp øverst og nederst på oppskrifter.
- «Ny oppskrift» og «Rediger» vises alltid; uten nøkkel forklares hvordan du lager en.
- Lister: opprett, endre navn på og slett kjøkken, merkelapper og ingredienser.
- 37 retter fra familiens håndskrevne liste.
