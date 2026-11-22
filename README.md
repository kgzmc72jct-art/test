# Mes Extraits — application de lecture pour iPhone

Application web installable (PWA) : photographiez des passages de vos livres, leur texte est lu automatiquement par l'IA (Claude), et tout est classé par auteur, livre, page et thèmes. Les données sont stockées dans **Supabase** (gratuit) et l'application est hébergée sur **Vercel** (gratuit).

## Où sont les fichiers ?

Depuis Windows, ouvrez l'Explorateur à l'adresse : `\\wsl.localhost\Debian\home\sdba\lecture`

Fichiers : `index.html`, `config.js`, `manifest.webmanifest`, `sw.js`, `icon-180.png`, `icon-192.png`, `icon-512.png`, `supabase-setup.sql`, `supabase-mots.sql`, `supabase/functions/lire-texte/index.ts`, `README.md`.

---

## Étape 1 — Créer la base Supabase (≈ 10 min)

1. Créez un compte sur https://supabase.com → **New project**. Choisissez un nom (ex. `lecture`), un mot de passe de base de données (à garder de côté) et la région **Europe (Paris ou Frankfurt)**.
2. Une fois le projet prêt : menu **SQL Editor** → **New query** → collez tout le contenu de `supabase-setup.sql` → **Run**. Cela crée la table, l'espace photos privé et les règles de sécurité.
3. Menu **Authentication → Users** → **Add user → Create new user** : votre e-mail + un mot de passe, et cochez **Auto Confirm User**. C'est le compte avec lequel vous vous connecterez dans l'app.
4. Menu **Authentication → Sign In / Providers** (ou *Settings*) : **désactivez « Allow new users to sign up »**. Ainsi personne d'autre ne pourra créer de compte sur votre base.
5. Menu **Project Settings → API** (ou *API Keys*) : copiez
   - l'**URL du projet** (`https://xxxx.supabase.co`)
   - la clé **anon** ou **publishable** (`sb_publishable_…`).

   ⛔ Ne copiez jamais la clé *service_role* / *secret*.
6. Ouvrez `config.js` (avec le Bloc-notes) et remplacez les deux valeurs `VOTRE-…`.

### Ce qu'offre le forfait gratuit (vérifié sur supabase.com/pricing, novembre 2026)
- 1 Go pour les photos → environ **2 000 à 3 000 extraits** (une photo réduite + sa miniature ≈ 300 à 450 Ko).
- 500 Mo de base de données (largement suffisant pour le texte).
- **Le projet est mis en pause après 1 semaine sans utilisation.** Vos données ne sont pas perdues : il suffit de se connecter sur supabase.com et de cliquer sur **Restore project**. Utiliser l'app au moins une fois par semaine évite la pause.
- **Pas de sauvegarde automatique** : utilisez ⚙︎ → *Préparer une sauvegarde* de temps en temps.

## Étape 1 bis — Activer la lecture du texte par l'IA (≈ 10 min)

La lecture des photos est faite par **Claude Sonnet 5.5** (Anthropic), environ **1 centime par photo**.

1. Créez un compte sur https://console.anthropic.com.
2. **Billing** → ajoutez un crédit prépayé (5 $ suffisent pour environ 400 photos). Conseil : dans **Limits**, fixez une limite de dépense mensuelle.
3. **API Keys** → **Create Key** → copiez la clé (`sk-ant-…`). Elle ne s'affiche qu'une fois.
   ⛔ Ne la mettez **jamais** dans `config.js` ni sur GitHub : elle va uniquement dans Supabase (étape 5).
4. Dans Supabase : menu **Edge Functions** → **Deploy a new function** → **Via Editor**.
   - Nom de la fonction : `lire-texte` (exactement).
   - Remplacez le code d'exemple par tout le contenu du fichier `supabase/functions/lire-texte/index.ts`.
   - **Deploy**. Laissez l'option *Verify JWT* activée.
5. Menu **Edge Functions → Secrets** (ou *Manage secrets*) → ajoutez :
   - Nom : `ANTHROPIC_API_KEY`
   - Valeur : la clé copiée à l'étape 3.

Seuls les utilisateurs connectés à votre app peuvent utiliser cette fonction, donc votre crédit.

## Étape 2 — Tester sur l'ordinateur (facultatif)

```bash
cd /home/sdba/lecture && python3 -m http.server 8000
```
Ouvrez http://localhost:8000 dans Edge ou Chrome sous Windows, connectez-vous et ajoutez un extrait.

## Étape 3 — Publier sur Vercel (≈ 10 min)

1. Créez un compte sur https://github.com → **New repository** → nom `lecture` → choisissez **Private** → *Create repository*.
2. **uploading an existing file** → glissez tous les fichiers du dossier → *Commit changes*.
3. Créez un compte sur https://vercel.com avec **« Continue with GitHub »**.
4. **Add New… → Project** → choisissez le dépôt `lecture` → **Import**.
5. *Framework Preset* : **Other**. Ne remplissez ni *Build Command* ni *Output Directory*. → **Deploy**.
6. Vercel vous donne une adresse du type `https://lecture-xxxx.vercel.app`.
7. Sur l'iPhone : ouvrez cette adresse dans **Safari** → **Partager** → **Sur l'écran d'accueil**.

> Le dépôt GitHub contient seulement le code et la clé publique : vos photos et textes sont dans Supabase, protégés par votre mot de passe.

## Utilisation

- **+** : prendre ou choisir une photo. Le texte est **lu automatiquement par l'IA** (quelques secondes), et le numéro de page aussi s'il est visible. Relisez et corrigez si besoin.
- Pour ne garder **qu'un passage** d'une page, soulignez-le ou encadrez-le au crayon avant la photo : seule cette partie sera transcrite.
- Plusieurs photos d'un coup : chaque photo devient un extrait avec son propre texte.
- **✨ Lire le texte** : relance la lecture (aussi pour les extraits déjà enregistrés, via « Modifier »).
- **Thèmes suggérés** : dès que le texte d'une photo est lu, l'IA propose automatiquement 3 à 5 thèmes (bouton **✨ Suggérer** à côté des tags pour relancer, par ex. après un texte collé) d'après le texte de l'extrait, en réutilisant de préférence vos tags existants. Touchez une suggestion pour l'ajouter, ou « Tout ajouter ». Coût : bien moins d'un centime.
- **📋 Coller** : ajoute un texte copié ailleurs (par exemple avec « Texte en direct » de l'app Photos).
- La recherche porte aussi sur le texte des extraits.

### Mots de vocabulaire

- En haut, choisissez l'onglet **🔤 Mots**, puis **+** : notez le mot et la phrase du livre où vous l'avez rencontré (le contexte). Auteur et livre sont pré-remplis avec votre dernière saisie.
- **L'IA écrit la définition et indique la langue** du mot dès que vous quittez le champ de la phrase (définition du sens *dans cette phrase*). Relisez et corrigez si besoin. **✨ Définir** relance la recherche. Coût : bien moins d'un centime par mot.
- Affichage **A → Z** (par lettre), **Par livre**, **Par langue** ou **Récents**. La recherche porte sur le mot, la définition, le contexte, le livre…
- Dans la fiche d'un mot, il est mis en valeur dans sa phrase. **Copier** / **Partager** envoient le mot, sa définition, la phrase et la référence du livre.
- Si le mot est déjà dans votre liste, l'app vous le signale avant de l'ajouter.
- Les mots sont inclus dans la sauvegarde (⚙︎).

## Plusieurs utilisateurs

Chaque personne a sa propre base d'extraits et de mots : elle ne voit que ses données.

**Créer un compte** : Supabase → **Authentication → Users → Add user → Create new user** → e-mail + mot de passe provisoire, cochez **Auto Confirm User**. Envoyez-lui l'adresse de l'app, son e-mail et son mot de passe. Elle installe l'app (Safari → Partager → Sur l'écran d'accueil) et se connecte.

⚠️ La lecture des photos et les définitions par l'IA sont payées par **votre** crédit Anthropic, et tous les comptes partagent le 1 Go de photos gratuit de Supabase.

### Compte administrateur (voir tous les comptes, en lecture seule)

1. Ouvrez `supabase-admin.sql`, remplacez `votre-email@exemple.fr` (en bas du fichier) par l'e-mail de **votre** compte dans l'app.
2. Supabase → **SQL Editor → New query** → collez tout le fichier → **Run**. La dernière ligne du résultat doit afficher votre e-mail.
3. Dans l'app : **⚙︎** → rubrique **Administrateur** → touchez un compte pour voir ses extraits et ses mots. Un bandeau « 👁 Compte de … (lecture seule) » s'affiche ; **Mon compte** pour revenir.

Vous pouvez consulter et faire une sauvegarde d'un autre compte, mais pas le modifier ni le supprimer. Prévenez vos utilisateurs que vous pouvez lire leurs extraits et leurs notes.

Pour retirer le rôle : `delete from public.admins;` dans le SQL Editor.

## Internet est-il nécessaire ?

- **Ajouter, modifier, supprimer** un extrait : oui (l'enregistrement se fait dans Supabase).
- **Consulter** les extraits déjà ouverts sur le téléphone : possible hors connexion (copie locale), en lecture seule.
- **Lecture du texte par l'IA** : oui.

## Mettre à jour l'app

> **Novembre 2026 — compte administrateur** : exécutez `supabase-admin.sql` (voir « Compte administrateur » ci-dessus), puis renvoyez `index.html`, `sw.js`, `README.md` et `supabase-admin.sql` sur GitHub.

> **Novembre 2026 — définition et langue par l'IA** : exécutez à nouveau `supabase-mots.sql` dans le SQL Editor (il ajoute la colonne « langue », sans rien effacer), redéployez la fonction `lire-texte` avec le nouveau `supabase/functions/lire-texte/index.ts`, puis renvoyez les fichiers sur GitHub.

> **Novembre 2026 — liste de mots** : dans Supabase → **SQL Editor** → **New query**, collez tout le contenu de `supabase-mots.sql` → **Run** (une seule fois ; vos extraits ne sont pas touchés). Puis renvoyez `index.html`, `sw.js`, `README.md`, `supabase-setup.sql` et `supabase-mots.sql` sur GitHub.

> **Novembre 2026 — suggestion de tags** : redéployez la fonction `lire-texte` (Supabase → Edge Functions → `lire-texte` → *Code* → collez le nouveau contenu de `supabase/functions/lire-texte/index.ts` → *Deploy*), puis renvoyez `index.html` et `sw.js` sur GitHub.

Après une modification, changez `VERSION` dans `sw.js` (ex. `extraits-v5`) et renvoyez les fichiers sur GitHub : Vercel republie automatiquement.
