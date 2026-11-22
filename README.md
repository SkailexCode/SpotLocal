# SpotLocal — Lecteur Musical Web & Local 100 % Intégral (Zéro Clé API)

> **Démo Web en ligne (GitHub Pages) :** **[https://skailexcode.github.io/SpotLocal/](https://skailexcode.github.io/SpotLocal/)**

**SpotLocal** est un lecteur musical open-source indépendant (licence MIT) conçu prioritairement pour un **navigateur Web** tout en conservant un mode bureau optionnel (Electron `.exe`).

Il réunit au même endroit **5 016 musiques en lecture intégrale via YouTube** (`2 234` artistes, aucun extrait coupé à 30 secondes), **l'ajout instantané de n'importe quel lien YouTube / YouTube Music** et **vos fichiers audio personnels** (`.mp3`, `.flac`, `.wav`, `.m4a`) — **sans aucun compte, sans tracker et sans aucune clé API à configurer**.

---

## Points forts

- **Catalogue embarqué de 5 016 titres en lecture intégrale (YouTube IFrame)** : explorez immédiatement **5 016 morceaux et clips complets** répartis en 9 univers (*Scène Française*, *Rap FR*, *Pop*, *Rock & Légendes*, *Rap US & R&B*, *Électro & Dance*, *Afro, Reggae & Latino*, *K-Pop & J-Pop*, *Cinéma & Instrumental*) — zéro extrait de 30 secondes.
- **Accueil vierge type première visite** : aucune playlist pré-enregistrée ni favori imposé au premier lancement — créez librement vos propres playlists et votre liste de titres likés.
- **Import direct par lien de partage YouTube (Zéro Clé API)** : collez simplement un ou plusieurs liens (`https://youtu.be/...`, `youtube.com/watch?v=...`, `music.youtube.com/watch?v=...`) dans l'accueil, la barre de recherche ou la modale dédiée (`Y`). Le titre, l'artiste et la miniature sont extraits automatiquement côté navigateur via `oEmbed`.
- **Lecture MP3 locale persistante dans le navigateur** : glissez-déposez vos fichiers audio n'importe où sur la fenêtre (stockage local `IndexedDB` + lecture directe HTML5, aucun envoi sur un serveur).
- **Persistance légère & sauvegarde JSON portable** : stockage delta dans `localStorage` + export/import complet de vos playlists et favoris au format `.json`.
- **Expérience Web complète** :
  - Mode vidéo **Mini-lecteur (PiP)** et **Mode Cinéma** sans rechargement du flux YouTube (`V`).
  - **Minuterie de mise en veille** (15, 30, 45, 60 min ou fin du titre).
  - **Recherche classée instantanée (`< 5 ms`)** sur les 5 016 titres + filtres par genre et par artiste.
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
