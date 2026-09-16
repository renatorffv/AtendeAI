import { google } from "googleapis";

export function getGoogleAuth(scopes: string[]) {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!email || !privateKey) {
    throw new Error(
      "GOOGLE_SERVICE_ACCOUNT_EMAIL / GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY não configurados.",
    );
  }

  return new google.auth.JWT({ email, key: privateKey, scopes });
}

/** Extrai o ID de um arquivo a partir de um link de compartilhamento do Google Drive.
 *  Retorna null se a URL não for reconhecida como um link do Drive. */
export function extractDriveFileId(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) return null;

  const fileMatch = trimmed.match(/drive\.google\.com\/file\/d\/([^/]+)/);
  if (fileMatch) return fileMatch[1];

  const openMatch = trimmed.match(/drive\.google\.com\/open\?id=([^&]+)/);
  if (openMatch) return openMatch[1];

  const ucMatch = trimmed.match(/drive\.google\.com\/uc\?.*[?&]id=([^&]+)/);
  if (ucMatch) return ucMatch[1];

  return null;
}
