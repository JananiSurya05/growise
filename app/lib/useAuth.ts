import { useEffect, useState } from "react";
import { supabase } from "./supabase";

export function useAuth() {
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        supabase.auth.getUser().then(({ data: { user } }) => {
            if (!user) {
                window.location.href = "/login";
                return;
            }
            setUser(user);
            setLoading(false);
        });
    }, []);

    return { user, loading };
}