# SpotLocal — Studio Musical Web & Local · 112 000 Musiques Intégrales (Zéro Clé API)

> **Démo Web en ligne (GitHub Pages) :** **[https://skailexcode.github.io/SpotLocal/](https://skailexcode.github.io/SpotLocal/)**

**SpotLocal** est un lecteur musical open-source indépendant (licence MIT) conçu prioritairement pour un **navigateur Web** tout en conservant un mode bureau optionnel (Electron `.exe`).

Il réunit dans une interface **Obsidian Sonic Studio** :
- **112 000 musiques en lecture intégrale via YouTube** (`47 338` artistes, `14` univers musicaux, `10` radios d'ambiance, plus de `7 176 heures` d'écoute continue — **zéro extrait coupé à 30 secondes**),
- **l'ajout instantané de n'importe quel lien YouTube / YouTube Music**,
- **vos fichiers audio personnels** (`.mp3`, `.flac`, `.wav`, `.m4a` stockés dans `IndexedDB`) — **sans aucun compte, sans tracker et sans aucune clé API à configurer**.

---

## Points forts

- **Moteur colonnaire de 112 000 titres sans ralentissement** : démarrage instantané sur `1 600` titres phares (`53 Ko` gzippé) puis chargement progressif non-bloquant de `8` shards compressés (`public/catalog/`) avec recherche classée en `< 12 ms` et empreinte mémoire réduite (`TypedArrays`).
- **14 Univers Musicaux & 10 Radios d'Ambiance** : *Scène Française*, *Rap FR*, *Pop*, *Hip-Hop & Rap US*, *Rock & Alternative*, *Électro & Dance*, *R&B & Soul*, *Afro & Reggae*, *Latino & Brésil*, *K-Pop & J-Pop*, *Metal*, *Jazz/Blues/Folk*, *Classique & Cinéma*, *Oriental & Monde* + radios *Chill*, *Workout*, *Focus*, *Soirée*, *Gaming*, *Roadtrip*…
- **Accueil vierge type première visite** : aucune playlist pré-enregistrée ni favori imposé au premier lancement.
- **Import direct par lien de partage YouTube (`Y`) & MP3 local (`IndexedDB`)**.

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
