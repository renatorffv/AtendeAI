import { google } from "googleapis";
import { getGoogleAuth, extractDriveFileId } from "@/lib/googleAuth";

const SHEET_RANGE = "Produtos!A2:L";

export type SheetProductRow = {
  sheetRowId: number;
  sku: string;
  name: string;
  category: string | null;
  description: string | null;
  colors: string | null;
  sizes: string[];
  stockBySize: Record<string, number>;
  price: number;
  imageUrls: string[];
  active: boolean;
};

function getSheetsClient() {
  const auth = getGoogleAuth(["https://www.googleapis.com/auth/spreadsheets.readonly"]);
  return google.sheets({ version: "v4", auth });
}

/** Converte um link de compartilhamento do Google Drive em uma URL do nosso proxy de imagens
 *  (que busca o arquivo autenticado via API — links públicos diretos do Drive não são confiáveis
 *  para servidores externos como o WhatsApp buscarem). Links de outros serviços não são alterados. */
export function toDirectImageUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return trimmed;

  const fileId = extractDriveFileId(trimmed);
  if (!fileId) return trimmed;

  const appUrl = process.env.APP_URL ?? "";
  return `${appUrl}/api/images/drive/${fileId}`;
}

function parseStockBySize(raw: string): Record<string, number> {
  const result: Record<string, number> = {};
  raw
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .forEach((part) => {
      const [size, qty] = part.split(":").map((s) => s.trim());
      if (size) result[size.toUpperCase()] = Number(qty ?? 0) || 0;
    });
  return result;
}

function parsePrice(raw: string): number {
  const normalized = raw.replace(/[^\d,.-]/g, "").replace(",", ".");
  const value = Number(normalized);
  return Number.isFinite(value) ? value : 0;
}

export async function fetchStoreCatalog(spreadsheetId: string): Promise<SheetProductRow[]> {
  const sheets = getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: SHEET_RANGE,
  });

  const rows = res.data.values ?? [];

  return rows
    .map((row, index): SheetProductRow | null => {
      const [
        sku,
        name,
        category,
        description,
        colors,
        sizesRaw,
        stockRaw,
        priceRaw,
        image1,
        image2,
        image3,
        activeRaw,
      ] = row;

      if (!sku || !name) return null;

      const imageUrls = [image1, image2, image3]
        .filter((v): v is string => Boolean(v && String(v).trim()))
        .map((v) => toDirectImageUrl(String(v)));

      return {
        sheetRowId: index + 2,
        sku: String(sku).trim(),
        name: String(name).trim(),
        category: category ? String(category).trim() : null,
        description: description ? String(description).trim() : null,
        colors: colors ? String(colors).trim() : null,
        sizes: sizesRaw
          ? String(sizesRaw)
              .split(",")
              .map((s) => s.trim().toUpperCase())
              .filter(Boolean)
          : [],
        stockBySize: stockRaw ? parseStockBySize(String(stockRaw)) : {},
        price: priceRaw ? parsePrice(String(priceRaw)) : 0,
        imageUrls,
        active: activeRaw ? String(activeRaw).trim().toUpperCase() !== "NAO" : true,
      };
    })
    .filter((r): r is SheetProductRow => r !== null);
}
