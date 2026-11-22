# SpotLocal — Lecteur Musical Web & Local (Zéro Clé API)

> **Démo Web en ligne (GitHub Pages) :** **[https://skailexcode.github.io/SpotLocal/](https://skailexcode.github.io/SpotLocal/)**

**SpotLocal** est un lecteur musical open-source indépendant (licence MIT) conçu prioritairement pour un **navigateur Web** tout en conservant un mode bureau optionnel (Electron `.exe`).

Il réunit au même endroit **vos fichiers audio personnels** (`.mp3`, `.flac`, `.wav`, `.m4a`), **vos liens de partage YouTube / YouTube Music** via le lecteur officiel YouTube IFrame et un **double moteur de découverte Apple Music / iTunes + Deezer** — **sans aucun compte, sans tracker et sans aucune clé API à configurer**.

---

## Points forts

- **Import direct par lien de partage YouTube (Zéro Clé API)** : collez simplement un ou plusieurs liens (`https://youtu.be/...`, `youtube.com/watch?v=...`, `music.youtube.com/watch?v=...`) dans l'accueil, la barre de recherche ou la modale dédiée (`Y`). Le titre, l'artiste et la pochette sont extraits automatiquement côté navigateur via `oEmbed`, et la lecture intégrale passe par le lecteur officiel **YouTube IFrame Player API**.
- **Lecture MP3 locale instantanée dans le navigateur** : glissez-déposez vos fichiers audio n'importe où sur la fenêtre (lecture directe via `Blob URL` HTML5, aucun envoi sur un serveur).
- **Double moteur gratuit Apple Music / iTunes + Deezer (Zéro Clé API)** : interrogation simultanée depuis le navigateur d'**Apple iTunes Search API (CORS)** et de **Deezer Public API (JSONP officiel)** + relais serveur parallèle, avec fusion intelligente des résultats, filtres par source (*Fusion*, *Deezer*, *Apple Music*), **Top Tendances en direct** et renouvellement automatique des jetons audio signés Deezer (`hdnea=exp=...`).
- **Persistance légère & sauvegarde JSON portable** : stockage delta dans `localStorage` (~3 Ko au lieu de plusieurs Mo) + export/import complet de votre bibliothèque au format `.json`.
- **Expérience Web complète** :
  - Mode vidéo **Mini-lecteur (PiP)** et **Mode Cinéma** sans rechargement du flux YouTube (`V`).
  - **Minuterie de mise en veille** (15, 30, 45, 60 min ou fin du titre).
  - **Filtres par genre, par source audio** (`MP3`, `YouTube`, `Toutes`) et navigation par **Artiste**.
  - **Raccourcis clavier** (`Espace`, `M`, `S`, `R`, `L`, `Y`, `V`, `/`, `?`) et intégration **Media Session API** (touches multimédia du clavier / OS).
  - Interface **responsive** (barre latérale bureau + barre de navigation mobile sur petits écrans).

---

## Démarrage rapide (Version Web)

### Prérequis
- **Node.js** `>= 20`

### Installation & lancement

```bash
npm install
npm start
```

Ouvrez ensuite `http://localhost:3000` dans votre navigateur.

### Scripts disponibles

| Commande | Description |
| --- | --- |
| `npm start` | Lance le serveur Express + Vite en mode Web (`0.0.0.0:3000`) |
| `npm run dev:vite` | Lance uniquement le serveur front Vite |
| `npm run build` | Compile le bundle Web de production dans `dist/` |
| `npm run lint` | Vérifie le typage strict TypeScript (`tsc --noEmit`) |
| `npm test` | Exécute la suite de tests unitaires (`node --test`) |
| `npm run build:exe` | Génère l'application Windows portable `.exe` via Electron Builder |

---

## Licence

Distribué sous licence **MIT**. Voir le fichier [LICENSE](./LICENSE).
