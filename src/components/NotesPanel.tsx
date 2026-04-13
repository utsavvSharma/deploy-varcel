"use client";

import { Note } from "@/types";
import { formatDateTime } from "@/utils/date";

interface NotesPanelProps {
  notes: Note[];
  onAddNote: (text: string) => void;
}

export default function NotesPanel({ notes = [], onAddNote }: NotesPanelProps) {
  return (
    <div className="mt-4">
      <div className="flex justify-between items-center mb-3">
        <h4 className="font-medium">Notes ({notes.length})</h4>
        <button
          onClick={() => {
            const text = prompt("Enter note");
            if (text) onAddNote(text);
          }}
          className="text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition-colors"
        >
          Add Note
        </button>
      </div>
      <div className="space-y-2">
        {notes.map((note, index) => (
          <div key={index} className="bg-gray-50 p-3 rounded text-sm">
            <div className="text-gray-600">{note.text}</div>
            <div className="text-xs text-gray-400 mt-1">
              By: {note.by} • {formatDateTime(note.createdAt)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}