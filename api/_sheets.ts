import { google } from 'googleapis';

// Initialize the Google Auth client
const getAuthClient = () => {
  const clientEmail = process.env.GOOGLE_SHEETS_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_SHEETS_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!clientEmail || !privateKey) {
    throw new Error('Missing Google Sheets Service Account credentials in environment variables.');
  }

  return new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
};

// Initialize the Sheets API client
const getSheetsClient = () => {
  const auth = getAuthClient();
  return google.sheets({ version: 'v4', auth });
};

const getSpreadsheetId = () => {
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  if (!spreadsheetId) {
    throw new Error('Missing GOOGLE_SHEETS_SPREADSHEET_ID in environment variables.');
  }
  return spreadsheetId;
};

/**
 * Reads all data from a specific sheet.
 * @param sheetName The name of the sheet to read (e.g., 'Sheet1')
 * @returns A 2D array representing the rows and columns of the sheet.
 */
export const readSheet = async (sheetName: string): Promise<any[][]> => {
  const sheets = getSheetsClient();
  const spreadsheetId = getSpreadsheetId();

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: sheetName,
  });

  return response.data.values || [];
};

/**
 * Appends rows of data to a specific sheet.
 * @param sheetName The name of the sheet to write to (e.g., 'Sheet1')
 * @param values A 2D array of values to append.
 */
export const writeSheet = async (sheetName: string, values: any[][]): Promise<void> => {
  const sheets = getSheetsClient();
  const spreadsheetId = getSpreadsheetId();

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: sheetName,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values,
    },
  });
};

/**
 * Updates a specific range in a sheet.
 * @param sheetName The name of the sheet.
 * @param range The range to update (e.g., 'A2:Z2').
 * @param values A 2D array of values to update.
 */
export const updateSheet = async (sheetName: string, range: string, values: any[][]): Promise<void> => {
  const sheets = getSheetsClient();
  const spreadsheetId = getSpreadsheetId();

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${sheetName}!${range}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values,
    },
  });
};

/**
 * Gets the 1-based index of the last row that contains data in a specific sheet.
 * @param sheetName The name of the sheet to check.
 * @returns The row number of the last row with data, or 0 if empty.
 */
export const getLastRow = async (sheetName: string): Promise<number> => {
  const values = await readSheet(sheetName);
  return values.length;
};
