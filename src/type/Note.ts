export type Note = {
  shared_with: any;
  owner_id: string | null;
  id: string;
  user_id?: string;
  title: string | null;
  content: string | null;
  created_at: string;
};
