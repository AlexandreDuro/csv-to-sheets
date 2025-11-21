import { NextResponse } from 'next/server';
import { google } from 'googleapis';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        if (!process.env.GOOGLE_SERVICE_ACCOUNT_JSON || !process.env.GOOGLE_SHEET_ID) {
            return NextResponse.json({ success: false, error: 'Configuration serveur manquante' }, { status: 500 });
        }

        const auth = new google.auth.GoogleAuth({
            credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON),
            scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
        });

        const sheets = google.sheets({ version: 'v4', auth });
        const spreadsheetId = process.env.GOOGLE_SHEET_ID;

        const response = await sheets.spreadsheets.get({
            spreadsheetId,
        });

        const sheetList = response.data.sheets
            ?.map(s => s.properties?.title)
            .filter((title): title is string => !!title && title !== 'Data') || [];

        return NextResponse.json({ success: true, sheets: sheetList });

    } catch (error: any) {
        console.error('API Sheets Error:', error);
        return NextResponse.json({ success: false, error: error.message || 'Erreur serveur' }, { status: 500 });
    }
}
