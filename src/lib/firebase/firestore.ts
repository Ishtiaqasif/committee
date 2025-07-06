import { doc, collection, addDoc, getDoc, getDocs, query, serverTimestamp, where, orderBy, updateDoc } from "firebase/firestore";
import { db, storage } from "./config";
import type { Tournament, TournamentCreationData, Team } from "@/types";
import { getDownloadURL, ref, uploadString } from "firebase/storage";

export async function createTournament(tournamentData: TournamentCreationData, userId: string): Promise<string> {
    const dataToSave = { ...tournamentData };

    Object.keys(dataToSave).forEach(keyStr => {
        const key = keyStr as keyof TournamentCreationData;
        if (dataToSave[key] === undefined) {
            delete dataToSave[key];
        }
    });

    const newTournament: Omit<Tournament, 'id' | 'fixture' | 'scores'> = {
        ...dataToSave,
        creatorId: userId,
        createdAt: serverTimestamp(),
        language: 'en'
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

export async function addTeamToTournament(tournamentId: string, teamData: Omit<Team, 'id'>): Promise<string> {
    const tournament = await getTournament(tournamentId);
    if (!tournament) throw new Error("Tournament not found");

    const teamsSnapshot = await getDocs(collection(db, "tournaments", tournamentId, "teams"));
    if (teamsSnapshot.size >= tournament.numberOfTeams) {
        throw new Error("Tournament is already full.");
    }

    let logoUrl = '';
    // If a logo data URI is provided, upload it to Firebase Storage
    if (teamData.logo && teamData.logo.startsWith('data:image')) {
        const storageRef = ref(storage, `logos/${tournamentId}/${teamData.name.replace(/\s+/g, '_')}_${Date.now()}.png`);
        try {
            await uploadString(storageRef, teamData.logo, 'data_url');
            logoUrl = await getDownloadURL(storageRef);
        } catch (error) {
            console.error("Error uploading logo to Firebase Storage:", error);
            // Proceed without a logo if upload fails
        }
    }

    const teamToSave = {
        name: teamData.name,
        ownerName: teamData.ownerName,
        logo: logoUrl // This will be the public URL from Storage or an empty string
    };

    const teamDocRef = await addDoc(collection(db, "tournaments", tournamentId, "teams"), teamToSave);
    return teamDocRef.id;
}


export async function getTeamsForTournament(tournamentId: string): Promise<Team[]> {
    const teamsRef = collection(db, "tournaments", tournamentId, "teams");
    const q = query(teamsRef);
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as Team)).sort((a, b) => a.name.localeCompare(b.name));
}

export async function getTournamentsForUser(userId: string): Promise<Tournament[]> {
    const tournamentsRef = collection(db, "tournaments");
    const q = query(tournamentsRef, where("creatorId", "==", userId), orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Tournament));
}

export async function updateTournament(tournamentId: string, data: Partial<Tournament>): Promise<void> {
    const tournamentRef = doc(db, "tournaments", tournamentId);
    await updateDoc(tournamentRef, data);
}
