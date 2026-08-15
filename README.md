# Geburtstagswunschliste

Eine kleine Wunschliste zum Selbst-Hosten auf GitHub Pages. Wünsche
tragt ihr in `items.js` ein (Bild, Preis, Beschreibung). Besucher
klicken auf „Ich schenke das!“ und tragen ihren Namen ein — das sehen
dann sofort alle anderen, die die Seite offen haben.

Damit alle Besucher denselben Stand sehen, braucht es eine winzige,
kostenlose Datenbank (Firebase Firestore). Ohne die würde jeder nur
seinen eigenen Browser-Speicher sehen, und Oma und Opa könnten
versehentlich dasselbe schenken.

## 1. Firebase-Projekt anlegen (5 Minuten, kostenlos, keine Kreditkarte)

1. Auf [console.firebase.google.com](https://console.firebase.google.com) gehen und mit einem Google-Konto anmelden.
2. **„Projekt hinzufügen“** klicken, einen Namen vergeben (z. B. `geburtstagswunsch`), Google Analytics kann man abwählen.
3. Im Projekt links auf **Build → Firestore Database** gehen, **„Datenbank erstellen“** klicken.
4. Region wählen (z. B. `eur3 (europe-west)`), dann **„Testmodus starten“** wählen (öffentlich lesbar/schreibbar für 30 Tage — reicht für unseren Zweck locker, siehe Schritt 3 für dauerhafte Regeln).
5. Danach oben links auf das Zahnrad → **„Projekteinstellungen“**, ganz unten bei „Meine Apps“ auf das Web-Symbol `</>` klicken, App registrieren (Name ist egal, Firebase Hosting NICHT aktivieren).
6. Firebase zeigt dir jetzt ein Code-Snippet mit `firebaseConfig = { apiKey: ..., ... }`. Diese Werte brauchst du im nächsten Schritt.

## 2. Zugangsdaten eintragen

Öffne `app.js` in diesem Ordner und ersetze ganz oben die Platzhalter durch
die Werte aus deinem Firebase-Snippet:

```js
const firebaseConfig = {
  apiKey: "DEIN-API-KEY",
  authDomain: "DEIN-PROJEKT.firebaseapp.com",
  projectId: "DEIN-PROJEKT",
  storageBucket: "DEIN-PROJEKT.appspot.com",
  messagingSenderId: "DEINE-SENDER-ID",
  appId: "DEINE-APP-ID"
};
```

Das ist kein Geheimnis, das man verstecken müsste — dieser Schlüssel taucht
in jeder Firebase-Webseite öffentlich im Quellcode auf. Der eigentliche
Schutz passiert über die Firestore-Regeln (nächster Schritt).

## 3. Firestore-Regeln absichern (empfohlen, 2 Minuten)

Testmodus-Regeln laufen nach 30 Tagen ab. Damit die Seite dauerhaft
funktioniert und niemand fremdes eure Datenbank vollmüllen kann, in der
Firebase-Konsole zu **Firestore Database → Regeln** gehen und Folgendes
einsetzen:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /reservations/{itemId} {
      allow read: if true;
      allow write: if request.resource.data.keys().hasOnly(['reservedBy', 'reservedAt'])
                   && request.resource.data.reservedBy is string
                   && request.resource.data.reservedBy.size() < 60;
      allow delete: if true;
    }

    match /contributions/{contribId} {
      // Öffentlich: wer bei welchem Wunsch mit Geld dabei ist (kein Betrag).
      allow read: if true;
      allow create: if request.resource.data.keys().hasOnly(['itemId', 'name', 'timestamp'])
                    && request.resource.data.name is string
                    && request.resource.data.name.size() < 60;
      allow update, delete: if false;
    }

    match /pledges/{pledgeId} {
      // Privat: die eigentlichen Beträge. "read: if false" heißt, dass
      // NIEMAND das über die Webseite auslesen kann - auch nicht mit den
      // Browser-Entwicklertools. Nur du selbst siehst diese Zahlen, wenn
      // du in der Firebase-Konsole unter "Firestore Database -> Daten"
      // nachschaust (die Konsole umgeht die Regeln, weil du als
      // Projektinhaber eingeloggt bist).
      allow read: if false;
      allow create: if request.resource.data.keys().hasOnly(['itemId', 'name', 'amount', 'timestamp'])
                    && request.resource.data.amount is number
                    && request.resource.data.amount > 0
                    && request.resource.data.name is string;
      allow update, delete: if false;
    }
  }
}
```

Das erlaubt jedem, Reservierungen zu lesen, zu setzen und wieder
freizugeben, sowie sich mit einem Namen an einem Geldgeschenk zu
beteiligen — aber sonst nichts an eurer Datenbank zu verändern, und
niemand kann die eingetragenen Beträge einsehen. Für eine private
Familien-Wunschliste ist das ein guter, einfacher Kompromiss.
Auf **„Veröffentlichen“** klicken.

### Beträge einsehen (nur für dich)

Die eingetragenen Beträge kannst nur du sehen, und zwar so:
Firebase-Konsole → **Firestore Database → Daten** → Sammlung
`pledges` öffnen. Dort steht zu jedem Eintrag `itemId`, `name` und
`amount`.

## 4. Eigene Wünsche eintragen

Öffne `items.js` und trag deine Wünsche ein. Für jeden Wunsch:

```js
{
  id: "4",                      // muss einmalig sein
  name: "Kopfhörer",
  description: "Kabellos, am liebsten in Schwarz.",
  price: "89 €",
  image: "https://...jpg",      // Bild-Link oder "images/datei.jpg"
  link: "https://shop.de/..."   // optional, kann leer bleiben: ""
}
```

Eigene Bilder: Lege sie in einen Ordner `images/` in diesem Repo und
verweise dann z. B. mit `image: "images/kopfhoerer.jpg"` darauf.

## 5. Auf GitHub Pages veröffentlichen

1. Neues Repository auf GitHub anlegen (z. B. `wunschliste`), öffentlich
   oder privat — Pages braucht keine Öffentlichkeit des Repos bei GitHub
   Pro/Team, bei kostenlosen Accounts muss das Repo öffentlich sein.
2. Alle Dateien aus diesem Ordner (`index.html`, `style.css`, `app.js`,
   `items.js`, ggf. `images/`) in das Repository hochladen/pushen.
3. Im Repo unter **Settings → Pages**: bei „Source“ **„Deploy from a
   branch“** wählen, Branch `main`, Ordner `/ (root)`, speichern.
4. Nach ein bis zwei Minuten ist die Seite unter
   `https://DEIN-BENUTZERNAME.github.io/wunschliste/` erreichbar.

Diesen Link kannst du dann an Oma, Opa & Co. schicken.

## Wünsche später ändern

Einfach `items.js` im Repo bearbeiten und die Änderung committen —
GitHub Pages aktualisiert die Seite automatisch nach kurzer Zeit.

## Reservierung zurücksetzen

Falls sich mal jemand vertippt: In der Firebase-Konsole unter
**Firestore Database → Daten** die Sammlung `reservations` öffnen und
den entsprechenden Eintrag löschen. Auf der Seite selbst gibt es
außerdem einen „Doch nicht ich – freigeben“-Button an jedem reservierten
Wunsch.
# Geburtstagswunschliste

Eine kleine Wunschliste zum Selbst-Hosten auf GitHub Pages. Wünsche
tragt ihr in `items.js` ein (Bild, Preis, Beschreibung). Besucher
klicken auf „Ich schenke das!“ und tragen ihren Namen ein — das sehen
dann sofort alle anderen, die die Seite offen haben.

Damit alle Besucher denselben Stand sehen, braucht es eine winzige,
kostenlose Datenbank (Firebase Firestore). Ohne die würde jeder nur
seinen eigenen Browser-Speicher sehen, und Oma und Opa könnten
versehentlich dasselbe schenken.

## 1. Firebase-Projekt anlegen (5 Minuten, kostenlos, keine Kreditkarte)

1. Auf [console.firebase.google.com](https://console.firebase.google.com) gehen und mit einem Google-Konto anmelden.
2. **„Projekt hinzufügen“** klicken, einen Namen vergeben (z. B. `geburtstagswunsch`), Google Analytics kann man abwählen.
3. Im Projekt links auf **Build → Firestore Database** gehen, **„Datenbank erstellen“** klicken.
4. Region wählen (z. B. `eur3 (europe-west)`), dann **„Testmodus starten“** wählen (öffentlich lesbar/schreibbar für 30 Tage — reicht für unseren Zweck locker, siehe Schritt 3 für dauerhafte Regeln).
5. Danach oben links auf das Zahnrad → **„Projekteinstellungen“**, ganz unten bei „Meine Apps“ auf das Web-Symbol `</>` klicken, App registrieren (Name ist egal, Firebase Hosting NICHT aktivieren).
6. Firebase zeigt dir jetzt ein Code-Snippet mit `firebaseConfig = { apiKey: ..., ... }`. Diese Werte brauchst du im nächsten Schritt.

## 2. Zugangsdaten eintragen

Öffne `app.js` in diesem Ordner und ersetze ganz oben die Platzhalter durch
die Werte aus deinem Firebase-Snippet:

```js
const firebaseConfig = {
  apiKey: "DEIN-API-KEY",
  authDomain: "DEIN-PROJEKT.firebaseapp.com",
  projectId: "DEIN-PROJEKT",
  storageBucket: "DEIN-PROJEKT.appspot.com",
  messagingSenderId: "DEINE-SENDER-ID",
  appId: "DEINE-APP-ID"
};
```

Das ist kein Geheimnis, das man verstecken müsste — dieser Schlüssel taucht
in jeder Firebase-Webseite öffentlich im Quellcode auf. Der eigentliche
Schutz passiert über die Firestore-Regeln (nächster Schritt).

## 3. Firestore-Regeln absichern (empfohlen, 2 Minuten)

Testmodus-Regeln laufen nach 30 Tagen ab. Damit die Seite dauerhaft
funktioniert und niemand fremdes eure Datenbank vollmüllen kann, in der
Firebase-Konsole zu **Firestore Database → Regeln** gehen und Folgendes
einsetzen:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /reservations/{itemId} {
      allow read: if true;
      allow write: if request.resource.data.keys().hasOnly(['reservedBy', 'reservedAt'])
                   && request.resource.data.reservedBy is string
                   && request.resource.data.reservedBy.size() < 60;
      allow delete: if true;
    }
  }
}
```

Das erlaubt jedem, Reservierungen zu lesen, zu setzen und wieder
freizugeben — aber sonst nichts an eurer Datenbank zu verändern. Für eine
private Familien-Wunschliste ist das ein guter, einfacher Kompromiss.
Auf **„Veröffentlichen“** klicken.

## 4. Eigene Wünsche eintragen

Öffne `items.js` und trag deine Wünsche ein. Für jeden Wunsch:

```js
{
  id: "4",                      // muss einmalig sein
  name: "Kopfhörer",
  description: "Kabellos, am liebsten in Schwarz.",
  price: "89 €",
  image: "https://...jpg",      // Bild-Link oder "images/datei.jpg"
  link: "https://shop.de/..."   // optional, kann leer bleiben: ""
}
```

Eigene Bilder: Lege sie in einen Ordner `images/` in diesem Repo und
verweise dann z. B. mit `image: "images/kopfhoerer.jpg"` darauf.

## 5. Auf GitHub Pages veröffentlichen

1. Neues Repository auf GitHub anlegen (z. B. `wunschliste`), öffentlich
   oder privat — Pages braucht keine Öffentlichkeit des Repos bei GitHub
   Pro/Team, bei kostenlosen Accounts muss das Repo öffentlich sein.
2. Alle Dateien aus diesem Ordner (`index.html`, `style.css`, `app.js`,
   `items.js`, ggf. `images/`) in das Repository hochladen/pushen.
3. Im Repo unter **Settings → Pages**: bei „Source“ **„Deploy from a
   branch“** wählen, Branch `main`, Ordner `/ (root)`, speichern.
4. Nach ein bis zwei Minuten ist die Seite unter
   `https://DEIN-BENUTZERNAME.github.io/wunschliste/` erreichbar.

Diesen Link kannst du dann an Oma, Opa & Co. schicken.

## Wünsche später ändern

Einfach `items.js` im Repo bearbeiten und die Änderung committen —
GitHub Pages aktualisiert die Seite automatisch nach kurzer Zeit.

## Reservierung zurücksetzen

Falls sich mal jemand vertippt: In der Firebase-Konsole unter
**Firestore Database → Daten** die Sammlung `reservations` öffnen und
den entsprechenden Eintrag löschen. Auf der Seite selbst gibt es
außerdem einen „Doch nicht ich – freigeben“-Button an jedem reservierten
Wunsch.
