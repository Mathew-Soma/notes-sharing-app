// src/components/Dashboard.tsx
import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import type { Note } from "../type/Note";
import {
  fetchNotes,
  createNote,
  deleteNote,
  shareNote,
} from "../services/notesService";
import { supabase } from "../supabaseClient";

interface DashboardProps {
  onSignOut: () => void;
  userEmail: string;
}

export default function Dashboard({ onSignOut, userEmail }: DashboardProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [filteredNotes, setFilteredNotes] = useState<Note[]>([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [search, setSearch] = useState("");
  const [shareEmails, setShareEmails] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [sharingId, setSharingId] = useState<string | null>(null);

  // Get logged-in user
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) {
        setUserId(data.user.id);
      }
    });
  }, []);

  // Fetch notes when userId changes
  useEffect(() => {
    if (userId) handleFetchNotes();
  }, [userId]);

  // Filter notes when search changes
  useEffect(() => {
    if (!search) setFilteredNotes(notes);
    else {
      const lowerSearch = search.toLowerCase();
      setFilteredNotes(
        notes.filter(
          (note) =>
            note.title?.toLowerCase().includes(lowerSearch) ||
            note.content?.toLowerCase().includes(lowerSearch)
        )
      );
    }
  }, [search, notes]);

  async function handleFetchNotes() {
    if (!userId) return;
    setLoading(true);
    try {
      const data = await fetchNotes(userId, userEmail);
      setNotes(data);
      setFilteredNotes(data);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateNote() {
    if (!userId) return;
    setCreating(true);
    try {
      await createNote(title, content, userId, userEmail);
      setTitle("");
      setContent("");
      await handleFetchNotes();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setCreating(false);
    }
  }

  async function handleDeleteNote(id: string) {
    setDeletingId(id);
    try {
      await deleteNote(id);
      setNotes((prev) => prev.filter((n) => n.id !== id));
    } catch (err: any) {
      alert(err.message);
    } finally {
      setDeletingId(null);
    }
  }

  async function handleShareNote(id: string) {
    const email = shareEmails[id];
    if (!email) return alert("Enter an email to share with.");
    setSharingId(id);
    try {
      await shareNote(id, email);
      alert("Note shared successfully!");
      setShareEmails((prev) => ({ ...prev, [id]: "" })); // clear this note's input
      await handleFetchNotes();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSharingId(null);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <header className="flex justify-between mb-6">
        <h1 className="text-2xl font-bold">Notes Sharing Dashboard</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-600">{userEmail}</span>
          <button
            onClick={onSignOut}
            className="border rounded-md px-3 py-1 hover:bg-slate-100"
          >
            Sign Out
          </button>
        </div>
      </header>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Note Creator */}
        <div className="bg-white rounded-xl shadow p-4">
          <h2 className="font-semibold mb-2">New Note</h2>
          <input
            type="text"
            placeholder="Title"
            className="w-full border rounded-md p-2 mb-2"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <textarea
            placeholder="Markdown content"
            className="w-full border rounded-md p-2 h-40 mb-2"
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
          <button
            onClick={handleCreateNote}
            disabled={creating}
            className={`bg-blue-600 text-white rounded-md px-4 py-2 hover:bg-blue-700 ${
              creating ? "opacity-70 cursor-not-allowed" : "cursor-pointer"
            }`}
          >
            {creating ? "Saving..." : "Save Note"}
          </button>
        </div>

        {/* Notes List */}
        <div className="bg-white rounded-xl shadow p-4">
          <h2 className="font-semibold mb-3">All Notes</h2>

          <input
            type="text"
            placeholder="Search notes..."
            className="w-full border rounded-md p-2 mb-4"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          {loading && <p>Loading...</p>}
          {!loading && filteredNotes.length === 0 && (
            <p className="text-sm text-slate-500">No notes found.</p>
          )}

          {filteredNotes.map((note) => (
            <div
              key={note.id}
              className="border rounded-md p-3 mb-3 hover:bg-slate-50"
            >
              <div className="flex justify-between mb-1">
                <h3 className="font-semibold">{note.title || "Untitled"}</h3>
                {note.owner_id === userId && (
                  <button
                    onClick={() => handleDeleteNote(note.id)}
                    disabled={deletingId === note.id}
                    className={`text-sm border px-2 rounded-md ${
                      deletingId === note.id
                        ? "opacity-70 cursor-not-allowed"
                        : "cursor-pointer hover:bg-slate-100"
                    }`}
                  >
                    {deletingId === note.id ? "Deleting..." : "Delete"}
                  </button>
                )}
              </div>

              <div className="prose text-sm mb-2">
                <ReactMarkdown rehypePlugins={[rehypeSanitize]}>
                  {note.content || ""}
                </ReactMarkdown>
              </div>

              {/* Share input for note owner */}
              {note.owner_id === userId && (
                <div className="flex gap-2 mt-2">
                  <input
                    type="email"
                    placeholder="Enter email to share"
                    className="border rounded-md p-1 flex-1"
                    value={shareEmails[note.id] || ""}
                    onChange={(e) =>
                      setShareEmails((prev) => ({
                        ...prev,
                        [note.id]: e.target.value,
                      }))
                    }
                  />
                  <button
                    onClick={() => handleShareNote(note.id)}
                    disabled={sharingId === note.id}
                    className={`bg-green-600 text-white px-2 rounded-md hover:bg-green-700 ${
                      sharingId === note.id
                        ? "opacity-70 cursor-not-allowed"
                        : "cursor-pointer"
                    }`}
                  >
                    {sharingId === note.id ? "Sharing..." : "Share"}
                  </button>
                </div>
              )}

              {/* Shared info for note owner */}
              {note.owner_id === userId && note.shared_with?.length > 0 && (
                <p className="text-xs text-slate-500 mt-1">
                  Shared with: {note.shared_with.join(", ")}
                </p>
              )}

              {/* Show who shared this note if the current user is NOT the owner */}
              {note.owner_email !== userEmail && (
                <p className="text-xs text-slate-500 italic mt-1">
                  Shared by {note.owner_email}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
