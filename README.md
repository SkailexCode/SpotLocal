# SpotLocal — Studio Musical Web & Local · 332 593 Titres Embarqués + 100M+ YouTube Live (Zéro Clé API)

> **Démo Web en ligne (GitHub Pages) :** **[https://skailexcode.github.io/SpotLocal/](https://skailexcode.github.io/SpotLocal/)**

**SpotLocal** est un lecteur musical open-source indépendant (licence MIT) conçu prioritairement pour un **navigateur Web** tout en conservant un mode bureau optionnel (Electron `.exe`).

Il combine une **architecture hybride à deux niveaux** :
1. **Base locale instantanée de 332 593 musiques intégrales** (`122 764` artistes, `14` univers musicaux, `10` radios d'ambiance, près de `21 000 heures` d'écoute — index colonnaire en `TypedArrays`, `< 15 ms` de recherche, fonctionne même hors-ligne pour la navigation).
2. **Moteur mondial YouTube Music en direct (`100M+ titres`, Zéro Clé API)** : interrogation temps réel via relais InnerTube local (`/api/youtube/search`) ou course multi-instances CORS (`Piped YouTube Music` / `Invidious`) directement depuis le navigateur sur GitHub Pages — chaque résultat est jouable en entier en 1 clic sans quitter SpotLocal.
3. **Vos fichiers audio personnels** (`.mp3`, `.flac`, `.wav`, `.m4a` stockés dans `IndexedDB`) + **collage direct de liens YouTube**.

---

## Démarrage rapide (Version Web)

```bash
npm install
npm start
```

Ouvrez ensuite `http://localhost:3000` dans votre navigateur.

---

## Licence

Distribué sous licence **MIT**. Voir le fichier [LICENSE](./LICENSE).
