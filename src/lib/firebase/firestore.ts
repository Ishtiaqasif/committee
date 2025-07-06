import { doc, collection, addDoc, getDoc, getDocs, query, serverTimestamp, where, orderBy, updateDoc } from "firebase/firestore";
import { db, storage } from "./config";
import type { Tournament, TournamentCreationData, Team } from "@/types";
import { getDownloadURL, ref, uploadString } from "firebase/storage";

export async function createTournament(tournamentData: TournamentCreationData, userId: string): Promise<string> {
    const dataToSave: Partial<TournamentCreationData> = { ...tournamentData };

    (Object.keys(dataToSave) as Array<keyof TournamentCreationData>).forEach(key => {
        if (dataToSave[key] === undefined) {
            delete dataToSave[key];
        }
    });

    const newTournament: Omit<Tournament, 'id' | 'fixture' | 'scores' | 'fixtureStoragePath'> = {
        ...(dataToSave as TournamentCreationData),
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
        const data = docSnap.data() as Omit<Tournament, 'id'>;

        // If there's a fixture in storage, download it and add it to the object
        if (data.fixtureStoragePath) {
            try {
                const fixtureRef = ref(storage, data.fixtureStoragePath);
                const url = await getDownloadURL(fixtureRef);
                const response = await fetch(url);
                if (!response.ok) {
                    throw new Error(`Failed to download fixture: ${response.statusText}`);
                }
                data.fixture = await response.text();
            } catch (error) {
                console.error("Error fetching fixture from storage:", error);
                // Return tournament data without the fixture if download fails
            }
        }
        return { id: docSnap.id, ...data } as Tournament;
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

    const dataForFirestore = { ...data };

    // If a fixture is being updated, upload it to storage instead of saving in the doc
    if (dataForFirestore.fixture) {
        const fixtureString = dataForFirestore.fixture;
        delete dataForFirestore.fixture; // Remove from what we save to Firestore doc

        const storageRef = ref(storage, `fixtures/${tournamentId}.json`);
        try {
            // Uploading the raw JSON string
            await uploadString(storageRef, fixtureString, 'raw', { contentType: 'application/json' });
            dataForFirestore.fixtureStoragePath = storageRef.fullPath;
        } catch (error) {
            console.error("Error uploading fixture to Firebase Storage:", error);
            throw new Error("Failed to save the tournament fixture.");
        }
    }

    await updateDoc(tournamentRef, dataForFirestore);
}
