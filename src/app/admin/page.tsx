
"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/auth-context";
import { useRouter } from "next/navigation";
import {
  getAppStats,
  getRecentTournaments,
  getRecentUsers,
} from "@/lib/firebase/firestore";
import { Tournament, UserProfile } from "@/types";
import { FootballLoader } from "@/components/football-loader";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Users, Trophy, BarChart, Clock } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface AppStats {
  userCount: number;
  tournamentCount: number;
}

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [stats, setStats] = useState<AppStats | null>(null);
  const [recentTournaments, setRecentTournaments] = useState<Tournament[]>([]);
  const [recentUsers, setRecentUsers] = useState<UserProfile[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    if (authLoading) return;

    const ownerUid = process.env.NEXT_PUBLIC_APP_OWNER_UID;

    if (!user) {
      router.push("/login");
      return;
    }

    if (!ownerUid || user.uid !== ownerUid) {
      router.push("/profile");
      return;
    }
    
    setIsAuthorized(true);

    const fetchData = async () => {
      setLoadingData(true);
      try {
        const [
          appStats,
          fetchedTournaments,
          fetchedUsers,
        ] = await Promise.all([
          getAppStats(),
          getRecentTournaments(5),
          getRecentUsers(5),
        ]);
        setStats(appStats);
        setRecentTournaments(fetchedTournaments);
        setRecentUsers(fetchedUsers);
      } catch (error) {
        console.error("Failed to fetch admin data:", error);
      } finally {
        setLoadingData(false);
      }
    };

    fetchData();
  }, [user, authLoading, router]);

  if (authLoading || !isAuthorized) {
    return <FootballLoader className="h-screen w-full" />;
  }

  return (
    <div className="min-h-screen bg-muted/40 p-4 sm:p-6 lg:p-8">
      <main className="mx-auto w-full max-w-7xl">
        <div className="mb-8 flex flex-col items-start gap-4 md:flex-row md:items-center md:justify-between">
            <div>
                <h1 className="text-4xl font-bold tracking-tight">Admin Dashboard</h1>
                <p className="mt-2 text-muted-foreground">
                    An overview of your application's status.
                </p>
            </div>
             <Button asChild>
                <Link href="/">
                    &larr; Back to Home
                </Link>
            </Button>
        </div>

        {loadingData ? (
          <FootballLoader className="h-64 w-full" />
        ) : (
          <div className="space-y-8">
            <section>
              <h2 className="text-2xl font-bold tracking-tight mb-4 flex items-center gap-2 text-primary">
                <BarChart className="h-6 w-6" /> App Statistics
              </h2>
              <div className="grid gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Total Users
                    </CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats?.userCount}</div>
                    <p className="text-xs text-muted-foreground">
                      Total registered users in the system.
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Total Tournaments
                    </CardTitle>
                    <Trophy className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {stats?.tournamentCount}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Total tournaments created.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold tracking-tight mb-4 flex items-center gap-2 text-primary">
                <Clock className="h-6 w-6" /> Recent Activity
              </h2>
              <div className="grid gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Tournaments</CardTitle>
                    <CardDescription>
                      The last 5 tournaments created.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {recentTournaments.map((t) => (
                      <div key={t.id} className="flex items-center gap-4">
                         <Avatar className="hidden h-9 w-9 sm:flex">
                           <AvatarImage src={t.logo} alt="Avatar" />
                           <AvatarFallback><Trophy /></AvatarFallback>
                         </Avatar>
                        <div className="grid gap-1">
                          <p className="text-sm font-medium leading-none">
                            <Link href={`/tournament?id=${t.id}`} className="hover:underline">
                                {t.tournamentName}
                            </Link>
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Created on {t.createdAt?.toDate ? format(t.createdAt.toDate(), "PPP") : "N/A"}
                          </p>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>New Users</CardTitle>
                    <CardDescription>The last 5 users to register.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                     {recentUsers.map((u) => (
                      <div key={u.uid} className="flex items-center gap-4">
                         <Avatar className="hidden h-9 w-9 sm:flex">
                           <AvatarImage src={u.photoURL ?? ""} alt={u.displayName ?? "Avatar"} />
                           <AvatarFallback>{u.displayName?.charAt(0)}</AvatarFallback>
                         </Avatar>
                        <div className="grid gap-1">
                          <p className="text-sm font-medium leading-none">
                            {u.displayName}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {u.email}
                          </p>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
