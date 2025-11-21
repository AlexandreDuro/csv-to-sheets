import { NextRequest, NextResponse } from 'next/server';
import Papa from 'papaparse';
import { google } from 'googleapis';

// --- Types ---

interface AirbnbCSVRow {
  'Date de début': string;
  'Date de fin': string;
  'Voyageur': string;
  'Logement': string;
  'Revenus bruts': string;
  'Frais de ménage': string;
  'Code de confirmation': string;
  'Montant': string;
  [key: string]: string;
}

// --- Configuration ---

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

// --- Helper Functions ---

function parseAmount(amountStr: string): number {
  if (!amountStr) return 0;
  const cleaned = amountStr.replace(/[^\d.,-]/g, '').replace(',', '.');
  return parseFloat(cleaned) || 0;
}

function parseDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  const parts = dateStr.split('/');
  if (parts.length !== 3) return null;
  return new Date(parseInt(parts[2]), parseInt(parts[0]) - 1, parseInt(parts[1]));
}

function getMonthName(date: Date): string {
  return date.toLocaleString('fr-FR', { month: 'long' });
}

function formatDateFR(date: Date): string {
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function extractCommissionRate(sheetName: string): number {
  const match = sheetName.match(/(\d+)%/);
  return match ? parseInt(match[1]) / 100 : 0;
}

function removeAccents(str: string): string {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function extractListingName(sheetName: string): string {
  // Example: "25% La Jungle - Plérin / Amandie & Rémi VIGIER" -> "La Jungle"
  // Strategy: Remove percentage, take text before first " - " or " / "
  let name = sheetName.replace(/^\d+%\s*/, ''); // Remove "25% "
  const separatorIndex = name.search(/\s+[-/]\s+/);
  if (separatorIndex !== -1) {
    name = name.substring(0, separatorIndex);
  }
  return name.trim();
}

// --- Main Logic ---

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const targetSheetName = formData.get('targetSheetName') as string;

    if (!file) {
      return NextResponse.json({ success: false, error: 'Aucun fichier fourni' }, { status: 400 });
    }

    // Extract listing name from filename (e.g., "la_jungle.csv" -> "La Jungle")
    const fileName = file.name.replace('.csv', '');
    const listingNameFromFile = fileName
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

    const csvText = await file.text();

    // 1. Parse CSV
    const parseResult = Papa.parse<any>(csvText, {
      header: true,
      skipEmptyLines: true,
    });

    if (parseResult.errors.length > 0) {
      console.error('CSV Parse Errors:', parseResult.errors);
      return NextResponse.json({ success: false, error: 'Erreur de lecture du CSV' }, { status: 400 });
    }

    const rows = parseResult.data;
    const logs: string[] = [];

    // Detect Type
    const firstRow = rows[0] || {};
    const isBooking = 'Reference number' in firstRow;
    const isAirbnb = 'Code de confirmation' in firstRow;

    if (!isBooking && !isAirbnb) {
      return NextResponse.json({ success: false, error: 'Format CSV non reconnu (ni Airbnb, ni Booking)' }, { status: 400 });
    }

    const platform = isBooking ? 'booking' : 'airbnb';
    logs.push(`ℹ️ Format détecté : ${platform === 'booking' ? 'Booking.com' : 'Airbnb'}`);

    // 2. Extract Metadata
    // Without manual selection, we can't get the commission rate from the sheet name easily.
    // We'll default to 0 for now, or we could implement a lookup if needed.
    // For the listing name, we'll use the CSV "Logement" column, maybe cleaned up.

    const commissionRate = 0; // Defaulting to 0 as we lost the source
    const importDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    logs.push(`ℹ️ Traitement automatique (Taux de commission par défaut : ${commissionRate * 100}%)`);

    // 3. Transform Data
    const dataRows: any[][] = [];

    // Helper for Booking Dates "4 Aug 2025"
    const parseBookingDate = (dateStr: string): Date | null => {
      if (!dateStr) return null;
      const date = new Date(dateStr);
      return isNaN(date.getTime()) ? null : date;
    };

    for (const row of rows) {
      let id, listingName, startDate, endDate, guestName, grossIncome;

      if (isAirbnb) {
        if (!row['Date de début'] || !row['Voyageur']) continue;
        startDate = parseDate(row['Date de début']);
        if (!startDate) continue;

        id = row['Code de confirmation'];
        listingName = removeAccents(row['Logement'] || 'Inconnu');
        // Clean listing name
        const separatorMatch = listingName.match(/ [–-] /);
        if (separatorMatch && separatorMatch.index) {
          listingName = listingName.substring(0, separatorMatch.index).trim();
        }

        endDate = parseDate(row['Date de fin']);
        guestName = row['Voyageur'];
        grossIncome = parseAmount(row['Montant']);

      } else { // Booking
        if (!row['Check-in'] || !row['Guest name']) continue;
        startDate = parseBookingDate(row['Check-in']);
        if (!startDate) continue;

        id = row['Reference number'];
        listingName = removeAccents(listingNameFromFile);
        endDate = parseBookingDate(row['Checkout']);
        guestName = row['Guest name'];
        grossIncome = parseAmount(row['Amount']);
      }

      const commission = grossIncome * commissionRate;

      // Schema:
      // id, plateforme, logement_nom_raw, logement, date_debut, date_fin, mois, annee, voyageur, revenus_bruts, frais_menage, commission_taux, commission, date_import

      dataRows.push([
        id, // id
        platform, // plateforme
        isAirbnb ? row['Logement'] : 'Inconnu', // logement_nom_raw
        listingName, // logement
        "'" + formatDateFR(startDate), // date_debut (Formatted DD/MM/YYYY, forced text)
        endDate ? "'" + formatDateFR(endDate) : '', // date_fin (Formatted DD/MM/YYYY, forced text)
        getMonthName(startDate), // mois
        startDate.getFullYear(), // annee
        guestName, // voyageur
        grossIncome, // revenus_bruts
        '', // frais_menage (Left empty as requested)
        '', // commission_taux
        '', // commission
        "'" + importDate // date_import (YYYY-MM-DD, forced text)
      ]);
    }

    if (dataRows.length === 0) {
      logs.push('Aucune réservation trouvée.');
      return NextResponse.json({ success: true, logs });
    }

    // 4. Google Sheets Integration
    const serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;

    if (!serviceAccountJson || !spreadsheetId) {
      throw new Error('Configuration Google Sheets manquante');
    }

    const auth = new google.auth.GoogleAuth({
      credentials: JSON.parse(serviceAccountJson),
      scopes: SCOPES,
    });

    const sheets = google.sheets({ version: 'v4', auth });

    // Check if "Data" sheet exists
    const sheetMetadata = await sheets.spreadsheets.get({ spreadsheetId });
    const dataSheet = sheetMetadata.data.sheets?.find(s => s.properties?.title === 'Data');

    if (!dataSheet) {
      logs.push(`ℹ️ Feuille "Data" non trouvée. Création...`);
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [
            {
              addSheet: {
                properties: { title: 'Data' }
              }
            }
          ]
        }
      });

      // Add Headers
      const headers = [
        'id', 'plateforme', 'logement_nom_raw', 'logement', 'date_debut', 'date_fin',
        'mois', 'annee', 'voyageur', 'revenus_bruts', 'frais_menage', 'commission_taux',
        'commission', 'date_import'
      ];

      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: 'Data!A1',
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [headers] }
      });
    }

    // 5. Check for Duplicates
    // Fetch existing IDs from Column A
    const existingIdsResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Data!A:A', // Get all IDs
    });

    const existingIds = new Set(
      (existingIdsResponse.data.values || [])
        .flat()
        .map(id => id.toString().trim())
    );

    const newRows = dataRows.filter(row => {
      const id = row[0]; // ID is the first element
      if (existingIds.has(id)) {
        logs.push(`ℹ️ Doublon ignoré : ID ${id}`);
        return false;
      }
      return true;
    });

    if (newRows.length === 0) {
      logs.push('✅ Aucune nouvelle donnée à ajouter (tous les IDs existent déjà).');
      return NextResponse.json({ success: true, logs });
    }

    // Append Data
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'Data!A1', // Append will find the next empty row
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values: newRows }
    });

    logs.push(`✅ ${newRows.length} lignes ajoutées à la feuille "Data".`);

    return NextResponse.json({ success: true, logs });

  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ success: false, error: error.message, logs: [error.message] }, { status: 500 });
  }
}

