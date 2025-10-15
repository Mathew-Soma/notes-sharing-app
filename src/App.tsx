import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import Auth from "./components/Auth";
import Dashboard from "./components/Dashboard";

export default function App() {
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));

    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
      }
    );

    return () => subscription?.subscription.unsubscribe();
  }, []);

  if (!session)
    return <Auth onLogin={() => supabase.auth.getSession()} />;

  return (
    <Dashboard
      userEmail={session.user.email}
      onSignOut={() => supabase.auth.signOut()}
    />
  );
}
