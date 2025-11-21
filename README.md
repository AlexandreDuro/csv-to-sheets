# CSV vers Google Sheets

Application Next.js permettant d'uploader un fichier CSV et de le synchroniser automatiquement avec Google Sheets via un Service Account.

## 🚀 Installation

1. **Cloner le projet et installer les dépendances**

```bash
npm install
```

2. **Configurer les variables d'environnement**

Créez un fichier `.env.local` à la racine du projet avec les variables suivantes :

```env
GOOGLE_SERVICE_ACCOUNT_EMAIL=votre-service-account@votre-projet.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nVotre clé privée ici\n-----END PRIVATE KEY-----"
GOOGLE_SHEETS_ID=votre-sheet-id-ici
```

### 📋 Configuration Google Service Account

1. **Créer un Service Account dans Google Cloud Console**
   - Allez sur [Google Cloud Console](https://console.cloud.google.com/)
   - Créez un projet ou sélectionnez-en un existant
   - Activez l'API Google Sheets
   - Créez un Service Account dans "IAM & Admin" > "Service Accounts"
   - Téléchargez la clé JSON

2. **Récupérer les informations nécessaires**
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL` : L'email du Service Account (format: `xxx@xxx.iam.gserviceaccount.com`)
   - `GOOGLE_PRIVATE_KEY` : La clé privée du JSON (avec les `\n` pour les retours à la ligne)
   - `GOOGLE_SHEETS_ID` : L'ID du Google Sheets (visible dans l'URL : `https://docs.google.com/spreadsheets/d/[SHEET_ID]/edit`)

3. **Partager le Google Sheets avec le Service Account**
   - Ouvrez votre Google Sheets
   - Cliquez sur "Partager" (Share)
   - Ajoutez l'email du Service Account avec les permissions "Éditeur" (Editor)

## 🏃 Démarrage

Lancer le serveur de développement :

```bash
npm run dev
```

Ouvrez [http://localhost:3000](http://localhost:3000) dans votre navigateur.

## 📦 Déploiement sur Vercel

1. **Push le code sur GitHub**

2. **Importer le projet sur Vercel**
   - Connectez-vous à [Vercel](https://vercel.com)
   - Importez votre repository GitHub
   - Configurez les variables d'environnement dans les paramètres du projet

3. **Variables d'environnement sur Vercel**
   - Ajoutez les trois variables : `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_PRIVATE_KEY`, `GOOGLE_SHEETS_ID`
   - Pour `GOOGLE_PRIVATE_KEY`, collez la clé complète avec les retours à la ligne (Vercel les gère automatiquement)

4. **Déployer**
   - Vercel déploiera automatiquement votre application

## 🎯 Utilisation

1. Ouvrez l'application dans votre navigateur
2. Glissez-déposez un fichier CSV dans la zone de drop, ou cliquez pour choisir un fichier
3. Le fichier sera automatiquement parsé et synchronisé avec Google Sheets
4. Les données existantes dans la feuille "Sheet1" seront remplacées par les nouvelles données

## 📝 Structure du projet

```
csv-to-sheets/
├── app/
│   ├── api/
│   │   └── upload/
│   │       └── route.ts      # API route pour l'upload
│   ├── globals.css           # Styles globaux
│   ├── layout.tsx            # Layout principal
│   └── page.tsx              # Page principale avec drag & drop
├── lib/
│   └── google.ts             # Utilitaires Google Sheets
├── .env.example              # Exemple de variables d'environnement
├── next.config.js            # Configuration Next.js
├── package.json              # Dépendances
├── tsconfig.json             # Configuration TypeScript
└── README.md                 # Documentation
```

## 🔧 Technologies utilisées

- **Next.js 14** (App Router)
- **TypeScript**
- **react-dropzone** - Drag & drop de fichiers
- **papaparse** - Parsing CSV
- **googleapis** - API Google Sheets

## ⚠️ Notes importantes

- L'application remplace **tout le contenu** de la feuille "Sheet1" par les données du CSV
- Assurez-vous que le Service Account a bien les permissions d'édition sur le Google Sheets
- La clé privée doit contenir les retours à la ligne (`\n`) correctement formatés


