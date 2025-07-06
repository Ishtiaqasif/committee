import { doc, collection, addDoc, getDoc, getDocs, query, serverTimestamp } from "firebase/firestore";
import { db } from "./config";
import type { Tournament, TournamentCreationData, Team } from "@/types";

export async function createTournament(tournamentData: TournamentCreationData, userId: string): Promise<string> {
    const newTournament: Omit<Tournament, 'id'> = {
        ...tournamentData,
        creatorId: userId,
        createdAt: serverTimestamp()
    };
    const docRef = await addDoc(collection(db, "tournaments"), newTournament);
    return docRef.id;
}

export async function getTournament(tournamentId: string): Promise<Tournament | null> {
    const docRef = doc(db, "tournaments", tournamentId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as Tournament;
    } else {
        return null;
    }
}

export async function addTeamToTournament(tournamentId: string, team: Omit<Team, 'id'>): Promise<string> {
    const tournament = await getTournament(tournamentId);
    if (!tournament) throw new Error("Tournament not found");

    const teamsSnapshot = await getDocs(collection(db, "tournaments", tournamentId, "teams"));
    if (teamsSnapshot.size >= tournament.numberOfTeams) {
        throw new Error("Tournament is already full.");
    }

    const teamDocRef = await addDoc(collection(db, "tournaments", tournamentId, "teams"), team);
    return teamDocRef.id;
}

export async function getTeamsForTournament(tournamentId: string): Promise<Team[]> {
    const teamsRef = collection(db, "tournaments", tournamentId, "teams");
    const q = query(teamsRef);
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as Team));
}
