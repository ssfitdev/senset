"use client";

import { useState } from "react";
import Papa from "papaparse";
import { toast } from "sonner";
import type { ZodType } from "zod";
import { authFetch } from "@/lib/firebase/authFetch";

interface UseCsvUploadOptions<T> {
  schema: ZodType<T[]>;
  endpoint: string;
}

export function useCsvUpload<T>({ schema, endpoint }: UseCsvUploadOptions<T>) {
  const [rows, setRows] = useState<T[] | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  function handleFile(file: File) {
    setParseError(null);
    setRows(null);
    setFileName(file.name);

    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const parsed = schema.safeParse(results.data);
        if (!parsed.success) {
          const issue = parsed.error.issues[0];
          setParseError(
            issue
              ? `Row ${(issue.path[0] as number) + 1}: ${issue.message}`
              : "The CSV doesn't match the expected format.",
          );
          return;
        }
        setRows(parsed.data);
      },
      error: (err) => setParseError(err.message),
    });
  }

  async function upload(): Promise<boolean> {
    if (!rows || rows.length === 0) return false;
    setUploading(true);
    try {
      const res = await authFetch(endpoint, { method: "POST", body: JSON.stringify(rows) });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Upload failed.");
        return false;
      }
      toast.success(`Uploaded ${data.count ?? rows.length} rows.`);
      setRows(null);
      setFileName(null);
      return true;
    } catch {
      toast.error("Couldn't reach the server.");
      return false;
    } finally {
      setUploading(false);
    }
  }

  function clear() {
    setRows(null);
    setFileName(null);
    setParseError(null);
  }

  return { rows, fileName, parseError, uploading, handleFile, upload, clear };
}
