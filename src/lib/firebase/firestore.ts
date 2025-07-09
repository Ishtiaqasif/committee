
import { doc, collection, addDoc, getDoc, getDocs, query, serverTimestamp, where, orderBy, updateDoc, setDoc, documentId, limit, QuerySnapshot, arrayUnion, deleteDoc } from "firebase/firestore";
import { db, storage } from "./config";
import { Tournament, TournamentCreationData, Team, UserProfile, UserRole } from "@/types";
import { getDownloadURL, ref, uploadString } from "firebase/storage";
import { User } from "firebase/auth";

export async function createTournament(tournamentData: TournamentCreationData, userId: string): Promise<string> {
    const dataToSave: Partial<TournamentCreationData> = { ...tournamentData };

    // Upload logo if it's a data URI
    if (dataToSave.logo && dataToSave.logo.startsWith('data:image')) {
        const storageRef = ref(storage, `tournament-logos/${userId}/${dataToSave.tournamentName?.replace(/\s+/g, '_')}_${Date.now()}.png`);
        try {
            await uploadString(storageRef, dataToSave.logo, 'data_url');
            dataToSave.logo = await getDownloadURL(storageRef); // update to URL
        } catch (error) {
            console.error("Error uploading tournament logo:", error);
            dataToSave.logo = ''; // set to empty if upload fails
        }
    }


    (Object.keys(dataToSave) as Array<keyof TournamentCreationData>).forEach(key => {
        if (dataToSave[key] === undefined) {
            delete dataToSave[key];
        }
    });

    const newTournament: Omit<Tournament, 'id' | 'fixture' | 'scores' | 'numberOfTeams'> & { numberOfTeams?: number } = {
        ...(dataToSave as TournamentCreationData),
        creatorId: userId,
        createdAt: serverTimestamp(),
        language: 'en',
        tiebreakerRules: ['goalDifference', 'goalsFor', 'headToHead'],
        awayGoalsRule: tournamentData.awayGoalsRule ?? false,
        admins: [],
        participants: [],
        isActive: false,
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

export async function addTeamToTournament(tournamentId: string, teamData: Omit<Team, 'id' | 'status'>): Promise<string> {
    const tournament = await getTournament(tournamentId);
    if (!tournament) throw new Error("Tournament not found");

    if (tournament.isTeamCountFixed) {
      const q = query(collection(db, "tournaments", tournamentId, "teams"), where("status", "==", "approved"));
      const teamsSnapshot = await getDocs(q);
      if (teamsSnapshot.size >= (tournament.numberOfTeams ?? 0)) {
          throw new Error("Tournament is already full.");
      }
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

    const teamToSave: Omit<Team, 'id'> = {
        name: teamData.name,
        ownerName: teamData.ownerName,
        logo: logoUrl, // This will be the public URL from Storage or an empty string
        ownerId: teamData.ownerId,
        status: tournament.isTeamCountFixed ? 'approved' : 'pending',
    };

    const teamDocRef = await addDoc(collection(db, "tournaments", tournamentId, "teams"), teamToSave);
    
    // Also update the parent tournament to include this user in the participants list
    const tournamentRef = doc(db, "tournaments", tournamentId);
    await updateDoc(tournamentRef, {
        participants: arrayUnion(teamData.ownerId)
    });

    return teamDocRef.id;
}


export async function getTeamsForTournament(tournamentId: string): Promise<Team[]> {
    const teamsRef = collection(db, "tournaments", tournamentId, "teams");
    const q = query(teamsRef);
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as Team)).sort((a, b) => a.name.localeCompare(b.name));
}

export async function getTournamentsForUserWithRoles(userId: string): Promise<Tournament[]> {
    const tournamentsMap = new Map<string, Tournament & { roles: UserRole[] }>();
    const tournamentsRef = collection(db, "tournaments");

    const processResults = (snapshot: QuerySnapshot, role: UserRole) => {
        snapshot.forEach(doc => {
            const tournament = { id: doc.id, ...doc.data() } as Tournament;
            const existingEntry = tournamentsMap.get(tournament.id);

            if (existingEntry) {
                if (!existingEntry.roles.includes(role)) {
                    existingEntry.roles.push(role);
                }
            } else {
                tournamentsMap.set(tournament.id, { ...tournament, roles: [role] });
            }
        });
    };

    const ownerQuery = query(tournamentsRef, where("creatorId", "==", userId));
    const adminQuery = query(tournamentsRef, where("admins", "array-contains", userId));
    const participantQuery = query(tournamentsRef, where("participants", "array-contains", userId));

    const [ownerSnapshot, adminSnapshot, participantSnapshot] = await Promise.all([
        getDocs(ownerQuery),
        getDocs(adminQuery),
        getDocs(participantQuery)
    ]);

    processResults(ownerSnapshot, 'owner');
    processResults(adminSnapshot, 'admin');
    processResults(participantSnapshot, 'participant');

    const results = Array.from(tournamentsMap.values());
    results.sort((a, b) => (b.createdAt?.toDate()?.getTime() || 0) - (a.createdAt?.toDate()?.getTime() || 0));

    return results;
}


export async function updateTournament(tournamentId: string, data: Partial<Tournament>): Promise<void> {
    const tournamentRef = doc(db, "tournaments", tournamentId);
    await updateDoc(tournamentRef, data);
}

export async function deleteTournament(tournamentId: string): Promise<void> {
    const teamsRef = collection(db, "tournaments", tournamentId, "teams");
    const teamsSnapshot = await getDocs(teamsRef);
    const deletePromises: Promise<void>[] = [];
    teamsSnapshot.forEach(doc => {
        deletePromises.push(deleteDoc(doc.ref));
    });

    await Promise.all(deletePromises);

    const tournamentRef = doc(db, "tournaments", tournamentId);
    await deleteDoc(tournamentRef);
}


export async function upsertUserProfile(user: Pick<User, 'uid' | 'displayName' | 'email' | 'photoURL'> & { isAnonymous?: boolean }): Promise<void> {
    if (user.isAnonymous) {
        return; // Do not create profiles for anonymous users
    }
    const userRef = doc(db, "users", user.uid);
    // Only save public-safe information
    await setDoc(userRef, {
        displayName: user.displayName || 'Unnamed User',
        email: user.email,
        photoURL: user.photoURL,
    }, { merge: true });
}

export async function getUserProfiles(uids: string[]): Promise<Record<string, UserProfile>> {
    if (uids.length === 0) return {};
    
    // Firestore 'in' queries are limited to 30 items per query.
    // For a larger number of UIDs, this would need to be chunked.
    const uidsToQuery = uids.slice(0, 30);

    const usersRef = collection(db, "users");
    const q = query(usersRef, where(documentId(), "in", uidsToQuery));
    const querySnapshot = await getDocs(q);

    const profiles: Record<string, UserProfile> = {};
    querySnapshot.forEach(doc => {
        profiles[doc.id] = { uid: doc.id, ...doc.data() } as UserProfile;
    });

    return profiles;
}

export async function getUserByEmail(email: string): Promise<UserProfile | null> {
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("email", "==", email), limit(1));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
        return null;
    }

    const userDoc = querySnapshot.docs[0];
    return { uid: userDoc.id, ...userDoc.data() } as UserProfile;
}

export async function searchUsers(searchText: string): Promise<UserProfile[]> {
    if (!searchText) return [];
    
    // As Firestore queries are case-sensitive and don't support lowercase searching on the server-side
    // without a dedicated field, we perform prefix searches.
    // This is a basic implementation. For full-text, case-insensitive search, a service like Algolia is recommended.
    const nameQuery = query(
        collection(db, "users"),
        where("displayName", ">=", searchText),
        where("displayName", "<=", searchText + '\uf8ff'),
        limit(5)
    );
    const emailQuery = query(
        collection(db, "users"),
        where("email", ">=", searchText),
        where("email", "<=", searchText + '\uf8ff'),
        limit(5)
    );

    const [nameSnapshot, emailSnapshot] = await Promise.all([
        getDocs(nameQuery),
        getDocs(emailQuery)
    ]);
    
    const usersMap = new Map<string, UserProfile>();

    nameSnapshot.forEach(doc => {
        const userData = { uid: doc.id, ...doc.data() } as UserProfile;
        usersMap.set(doc.id, userData);
    });

    emailSnapshot.forEach(doc => {
        const userData = { uid: doc.id, ...doc.data() } as UserProfile;
        usersMap.set(doc.id, userData); // Replaces duplicate if already added by name query
    });

    return Array.from(usersMap.values());
}


export async function updateTeam(tournamentId: string, teamId: string, data: Partial<Omit<Team, 'id'>>): Promise<void> {
    const teamRef = doc(db, "tournaments", tournamentId, "teams", teamId);
    await updateDoc(teamRef, data);
}

export async function removeTeam(tournamentId: string, teamId: string): Promise<void> {
    const teamRef = doc(db, "tournaments", tournamentId, "teams", teamId);
    await deleteDoc(teamRef);
}
