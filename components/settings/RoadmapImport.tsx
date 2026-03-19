"use client";

import { useState } from "react";
import { Upload, FileJson, Check, AlertTriangle } from "lucide-react";
import type { RoadmapData } from "@/types/database";

interface RoadmapImportProps {
  current: RoadmapData | null;
  onImport: (data: RoadmapData) => Promise<boolean>;
}

export function RoadmapImport({ current, onImport }: RoadmapImportProps) {
  const [jsonText, setJsonText] = useState("");
  const [parseError, setParseError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [imported, setImported] = useState(false);

  function handleParse() {
    setParseError(null);
    setImported(false);

    try {
      const parsed = JSON.parse(jsonText);

      // Validate basic structure
      if (!parsed.goals || !Array.isArray(parsed.goals)) {
        setParseError("JSON must contain a 'goals' array.");
        return;
      }

      if (parsed.goals.length === 0) {
        setParseError("Goals array must not be empty.");
        return;
      }

      for (let i = 0; i < parsed.goals.length; i++) {
        const goal = parsed.goals[i];
        if (!goal.id || !goal.title) {
          setParseError(`Goal at index ${i} must have 'id' and 'title' fields.`);
          return;
        }
        if (typeof goal.completed !== "boolean") {
          setParseError(`Goal "${goal.title}" must have a boolean 'completed' field.`);
          return;
        }
      }

      doImport(parsed as RoadmapData);
    } catch {
      setParseError("Invalid JSON. Please check your input.");
    }
  }

  async function doImport(data: RoadmapData) {
    setImporting(true);
    const ok = await onImport(data);
    setImporting(false);
    if (ok) {
      setImported(true);
      setJsonText("");
    } else {
      setParseError("Failed to save roadmap. Please try again.");
    }
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result;
      if (typeof text === "string") {
        setJsonText(text);
        setParseError(null);
        setImported(false);
      }
    };
    reader.readAsText(file);
  }

  return (
    <div className="rounded-xl border border-foreground/10 bg-card p-5 space-y-5">
      <div className="flex items-center gap-2">
        <FileJson size={18} />
        <h2 className="text-sm font-semibold">Roadmap Import</h2>
      </div>

      {/* Current roadmap status */}
      {current ? (
        <div className="flex items-center gap-2 rounded-md bg-emerald-500/10 px-3 py-2 text-xs">
          <Check size={14} className="text-emerald-400" />
          <span className="text-foreground/70">
            Roadmap loaded: <strong>{current.currentPhase ?? "My Roadmap"}</strong>{" "}
            ({current.goals.length} goal{current.goals.length !== 1 ? "s" : ""})
          </span>
        </div>
      ) : (
        <p className="text-xs text-foreground/40">
          No roadmap imported yet. Paste or upload your roadmap JSON below.
        </p>
      )}

      {/* JSON textarea */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-foreground/50">Roadmap JSON</label>
        <textarea
          value={jsonText}
          onChange={(e) => {
            setJsonText(e.target.value);
            setParseError(null);
            setImported(false);
          }}
          placeholder={`{
  "goals": [
    { "id": "1", "title": "Learn TypeScript", "completed": false, "completion_pct": 40, "targetDate": "2025-06-01" },
    { "id": "2", "title": "Learn React", "completed": true }
  ],
  "currentPhase": "Frontend Mastery"
}`}
          rows={8}
          className="w-full rounded-md border border-foreground/10 bg-background px-3 py-2 font-mono text-xs text-foreground/80 placeholder:text-foreground/20 resize-y"
        />
      </div>

      {/* Error message */}
      {parseError && (
        <div className="flex items-start gap-2 text-xs text-red-400">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          <span>{parseError}</span>
        </div>
      )}

      {/* Import success */}
      {imported && (
        <div className="flex items-center gap-2 text-xs text-emerald-400">
          <Check size={14} />
          <span>Roadmap imported successfully!</span>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={handleParse}
          disabled={!jsonText.trim() || importing}
          className="flex items-center gap-1.5 rounded-md bg-emerald-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
        >
          <Upload size={14} />
          {importing ? "Importing..." : "Import JSON"}
        </button>
        <label className="flex items-center gap-1.5 rounded-md border border-foreground/10 px-4 py-1.5 text-xs text-foreground/60 hover:bg-foreground/5 cursor-pointer transition-colors">
          <FileJson size={14} />
          Upload File
          <input
            type="file"
            accept=".json"
            onChange={handleFileUpload}
            className="hidden"
          />
        </label>
      </div>

      <p className="text-xs text-foreground/30">
        Export your roadmap from Roadmap.sh as JSON, or create one manually following the format above.
      </p>
    </div>
  );
}
