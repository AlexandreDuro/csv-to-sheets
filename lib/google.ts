import { google } from 'googleapis';

/**
 * Crée un client Google Sheets authentifié via Service Account
 */
export async function getGoogleSheetsClient() {
  const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!serviceAccountEmail || !privateKey) {
    throw new Error('Variables d\'environnement Google manquantes');
  }

  const auth = new google.auth.JWT({
    email: serviceAccountEmail,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  return google.sheets({ version: 'v4', auth });
}

/**
 * Écrit les données dans Google Sheets (écrase le contenu existant)
 */
export async function writeToGoogleSheets(
  spreadsheetId: string,
  sheetName: string,
  values: string[][]
): Promise<void> {
  const sheets = await getGoogleSheetsClient();

  // Vider toute la feuille existante (utilise A:ZZZ pour couvrir une grande plage)
  await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range: `${sheetName}!A:ZZZ`,
  });

  // Si aucune donnée, on s'arrête ici
  if (values.length === 0) {
    return;
  }

  // Écrire les nouvelles valeurs
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${sheetName}!A1`,
    valueInputOption: 'RAW',
    requestBody: {
      values,
    },
  });
}

