import fs from "node:fs";
import path from "node:path";

export default function GuiaCatalogoPage() {
  const filePath = path.join(process.cwd(), "docs", "catalogo-google-sheets.md");
  const content = fs.readFileSync(filePath, "utf-8");

  return (
    <div>
      <h1 className="text-2xl font-semibold text-neutral-900">Guia: catálogo via Google Sheets</h1>
      <div className="mt-6 max-w-3xl rounded-xl border border-neutral-200 bg-white p-6">
        <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-neutral-800">
          {content}
        </pre>
      </div>
    </div>
  );
}
