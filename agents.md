# agents.md

## Projekt: Web aplikacija s integracijom više API-ja i NoSQL baze

### 1. Opis projekta

Aplikacija omogućuje korisnicima prijavu putem Google naloga, dohvaća podatke iz više API-ja, pohranjuje ih u MongoDB i prikazuje interaktivnu kartu te druge relevantne informacije korisniku. Korisnik može pregledavati, filtrirati i manipulirati podacima kroz klijentski dio aplikacije.
Aplikacija neka bude na engleskom.

---

### 2. Tehnologije i alati

- **Frontend**: Next.js 16 (App Router, API Routes), TailwindCSS, Shadcn UI, React Hook Form, React Query
- **Backend**: Next.js API routes
- **Autentikacija**: BetterAuth (Google login)
- **Baza podataka**: MongoDB Atlas (NoSQL)
- **Mape**: MapLibre GL + React MapLibre + OpenFreeMap
- **HTTP klijent**: Axios
- **Package manager**: pnpm

---

### 3. API-jevi

#### 3.1 BetterAuth – Google Login

- **Svrha**: Autentikacija korisnika
- **Funkcionalnost**:
  - Login korisnika s Google računom
  - Pohrana osnovnih podataka korisnika (ime, prezime, email) u MongoDB
- **Dokumentacija**: [BetterAuth docs](https://betterauth.com/)

#### 3.2 Cijene.dev – Trgovine u Hrvatskoj

- **Svrha**: Dohvat adresa i podataka trgovina
- **Funkcionalnost**:
  - Dohvat adresa trgovina po lancima
  - Pohrana podataka u MongoDB
- **Endpoint**: `/docs?section=lanci-poslovnice`
- **Dokumentacija**: [Cijene.dev API](https://cijene.dev/docs?section=lanci-poslovnice)

#### 3.3 Photon Komoot (OpenStreetMap) – Geokodiranje

- **Svrha**: Pretvaranje adresa u geografske koordinate (lat/lon)
- **Funkcionalnost**:
  - Dohvat koordinata adresa trgovina
  - Prikaz na mapi (MapLibre GL)
- **Dokumentacija**: [Photon Komoot API](https://photon.komoot.io/)

---

### 4. Baza podataka (MongoDB Atlas)

- **Kolekcije**:
  - `users`: pohrana korisničkih podataka (ime, prezime, email, Google ID)
  - `stores`: pohrana trgovina s adresom i koordinatama
- **Integracija**: BetterAuth kompatibilan s MongoDB
- **Operacije**: Create, Read, Delete, Filter (putem API-ja i React Query) nad korisničkim podacima

---

### 5. Funkcionalnosti aplikacije

1. **Prijava korisnika** preko Google naloga.
2. **Pohrana korisničkih podataka** u MongoDB.
3. **Dohvat podataka trgovina** iz cijene.dev API-ja.
4. **Geokodiranje adresa** preko Photon Komoot API-ja za prikaz na karti.
5. **Prikaz interaktivne karte** koristeći MapLibre GL.
6. **Manipulacija podacima**: filtriranje i brisanje spremljenih podataka.
7. **Korisničko sučelje** prikazuje podatke u čitljivom formatu, ne JSON-u.

---

### 6. Instalacija

```bash
# instalacija paketa
pnpm install
```

---

### 7. Napomene za razvoj

- React Query koristi se za dohvat i keširanje podataka iz API-ja.
- React Hook Form koristi se za obrasce unosa i filtriranja.
- Axios se koristi za pozive prema API-jima (BetterAuth, cijene.dev, Photon Komoot).
- Tailwind + Shadcn UI za vizualni dizajn.
- Slijediti primjer iz OpenFreeMap [react-example](https://github.com/w3cj/openfreemap-examples/tree/main/react-example) za implementaciju karte.
