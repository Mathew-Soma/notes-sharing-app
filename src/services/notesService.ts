import { supabase } from "../supabaseClient";
import type { Note } from "../type/Note";

/**
 * Fetch notes owned by or shared with the current user
 */
export async function fetchNotes(userId: string, userEmail: string) {
  const { data, error } = await supabase
    .from("notes")
    .select("*")
    .or(`owner_id.eq.${userId},shared_with.cs.{${userEmail}}`)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data as Note[];
}

/**
 * Create a new note for the given user
 */
export async function createNote(
  title: string,
  content: string,
  userId: string,
  userEmail: string
) {
  const { error } = await supabase
    .from("notes")
    .insert([
      {
        title,
        content,
        owner_id: userId,
        owner_email: userEmail, // <-- add this
        shared_with: []
      }
    ]);

  if (error) throw new Error(error.message);
}

/**
 * Delete a note by ID
 */
export async function deleteNote(id: string) {
  const { error } = await supabase.from("notes").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

/**
 * Share a note by adding a new email to the shared_with array
 * and trigger an Edge Function to send a notification email
 */
export async function shareNote(id: string, email: string) {
  // Get the current note data
  const { data: noteData, error: fetchError } = await supabase
    .from("notes")
    .select("shared_with, title, owner_email")
    .eq("id", id)
    .single();

  if (fetchError) throw new Error(fetchError.message);

  const currentSharedWith = noteData.shared_with || [];

  // Prevent duplicates
  if (currentSharedWith.includes(email)) {
    throw new Error("This note is already shared with that email.");
  }

  const updatedShared = [...currentSharedWith, email];

  // Update the shared_with array
  const { error: updateError } = await supabase
    .from("notes")
    .update({ shared_with: updatedShared })
    .eq("id", id);

  if (updateError) throw new Error(updateError.message);

  // 🔔 Trigger the Supabase Edge Function to send the email
  try {
    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-share-email`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          email,
          noteTitle: noteData.title || "Untitled Note",
          fromUser: noteData.owner_email || "A user",
        }),
      }
    );

    if (!res.ok) {
      console.error("Email notification failed:", await res.text());
    }
  } catch (err: any) {
    console.error("Error sending email notification:", err.message);
  }
}
