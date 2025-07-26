
import {
    createTournament,
    getTournament,
    addTeamToTournament,
    getTeamsForTournament,
    getTournamentsForUserWithRoles,
    updateTournament,
    deleteTournament,
    upsertUserProfile,
    getUserProfiles,
    getUserByEmail,
    searchUsers,
    updateTeam,
    removeTeam,
    getAppStats,
    getRecentTournaments,
    getRecentUsers,
    getDailyCreationStats,
} from '../firestore';
import { db, storage } from '../config';
import {
    doc,
    collection,
    addDoc,
    getDoc,
    getDocs,
    query,
    serverTimestamp,
    where,
    orderBy,
    updateDoc,
    setDoc,
    documentId,
    limit,
    arrayUnion,
    deleteDoc,
    getCountFromServer,
    Timestamp,
} from 'firebase/firestore';
import { getDownloadURL, ref, uploadString } from 'firebase/storage';
import { Tournament } from '@/types';


// Mock the entire firebase/firestore module
jest.mock('firebase/firestore', () => ({
    ...jest.requireActual('firebase/firestore'),
    doc: jest.fn(),
    collection: jest.fn(),
    addDoc: jest.fn(),
    getDoc: jest.fn(),
    getDocs: jest.fn(),
    query: jest.fn(),
    serverTimestamp: jest.fn(() => Timestamp.now()),
    where: jest.fn(),
    orderBy: jest.fn(),
    updateDoc: jest.fn(),
    setDoc: jest.fn(),
    documentId: jest.fn(),
    limit: jest.fn(),
    arrayUnion: jest.fn((...args) => ({ type: 'arrayUnion', payload: args })),
    deleteDoc: jest.fn(),
    getCountFromServer: jest.fn(),
}));

// Mock the entire firebase/storage module
jest.mock('firebase/storage', () => ({
    ...jest.requireActual('firebase/storage'),
    ref: jest.fn(),
    uploadString: jest.fn(),
    getDownloadURL: jest.fn(),
}));

// Mock our internal config
jest.mock('../config', () => ({
    db: {},
    storage: {},
}));

// Type-cast the mocked functions for TypeScript
const mockedAddDoc = addDoc as jest.Mock;
const mockedGetDoc = getDoc as jest.Mock;
const mockedGetDocs = getDocs as jest.Mock;
const mockedUpdateDoc = updateDoc as jest.Mock;
const mockedUploadString = uploadString as jest.Mock;
const mockedGetDownloadURL = getDownloadURL as jest.Mock;
const mockedRef = ref as jest.Mock;
const mockedArrayUnion = arrayUnion as jest.Mock;
const mockedDoc = doc as jest.Mock;


describe('Firestore Service', () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('createTournament', () => {
        it('should create a tournament without a logo', async () => {
            mockedAddDoc.mockResolvedValue({ id: 'new-tournament-id' });
            
            const tournamentData = {
                tournamentName: 'Test Tournament',
                isTeamCountFixed: true,
                numberOfTeams: 8,
                isEsports: false,
            };
            
            const tournamentId = await createTournament(tournamentData, 'user-123');
            
            expect(mockedAddDoc).toHaveBeenCalledWith(
                undefined, // collection returns undefined in this mock setup
                expect.objectContaining({
                    ...tournamentData,
                    creatorId: 'user-123',
                    isActive: true,
                })
            );
            expect(tournamentId).toBe('new-tournament-id');
        });

        it('should create a tournament and upload logo if provided as data URI', async () => {
            mockedAddDoc.mockResolvedValue({ id: 'new-tournament-id-2' });
            mockedUploadString.mockResolvedValue({});
            mockedGetDownloadURL.mockResolvedValue('https://firebasestorage.googleapis.com/logo.png');

            const tournamentData = {
                tournamentName: 'Logo Tournament',
                logo: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
                isTeamCountFixed: true,
                numberOfTeams: 16,
                isEsports: true,
            };

            const tournamentId = await createTournament(tournamentData, 'user-123');

            expect(mockedRef).toHaveBeenCalledWith(storage, expect.stringContaining('tournament-logos/user-123/Logo_Tournament'));
            expect(mockedUploadString).toHaveBeenCalled();
            expect(mockedGetDownloadURL).toHaveBeenCalled();
            expect(mockedAddDoc).toHaveBeenCalledWith(
                undefined,
                expect.objectContaining({
                    logo: 'https://firebasestorage.googleapis.com/logo.png',
                })
            );
            expect(tournamentId).toBe('new-tournament-id-2');
        });
    });

    describe('addTeamToTournament', () => {
        const mockTournament: Tournament = {
            id: 'tourney-1',
            tournamentName: 'Test',
            creatorId: 'owner-1',
            createdAt: 'now',
            logo: '',
            isTeamCountFixed: true,
            numberOfTeams: 2
        };

        const teamData = {
            name: 'New Team',
            ownerId: 'new-owner',
            ownerName: 'New Owner Name',
            logo: 'data:image/png;base64,fakedata'
        };

        it('should add a team and upload their logo', async () => {
            // Mock getTournament to return a tournament
            mockedGetDoc.mockResolvedValueOnce({
                exists: () => true,
                data: () => mockTournament,
            });
            // Mock the teams query to show it's not full
            mockedGetDocs.mockResolvedValueOnce({ size: 0, docs: [] });
            // Mock the logo upload
            mockedUploadString.mockResolvedValue({});
            mockedGetDownloadURL.mockResolvedValue('https://firebasestorage.googleapis.com/teamlogo.png');
            // Mock the addDoc for the new team
            mockedAddDoc.mockResolvedValue({ id: 'new-team-id' });

            const newTeam = await addTeamToTournament('tourney-1', teamData);

            expect(mockedGetDoc).toHaveBeenCalledWith(undefined); // doc() is mocked to return undefined
            expect(mockedGetDocs).toHaveBeenCalled();
            expect(mockedUploadString).toHaveBeenCalled();
            expect(mockedAddDoc).toHaveBeenCalledWith(
                undefined,
                expect.objectContaining({
                    name: 'New Team',
                    logo: 'https://firebasestorage.googleapis.com/teamlogo.png',
                    status: 'approved',
                })
            );
            expect(mockedUpdateDoc).toHaveBeenCalledWith(undefined, {
                participants: { type: 'arrayUnion', payload: ['new-owner'] },
            });
            expect(newTeam.id).toBe('new-team-id');
        });
        
        it('should throw an error if the tournament is full', async () => {
            mockedGetDoc.mockResolvedValueOnce({
                exists: () => true,
                data: () => mockTournament,
            });
            // Mock the teams query to show it IS full
            mockedGetDocs.mockResolvedValueOnce({ size: 2, docs: [{}, {}] });
            
            await expect(addTeamToTournament('tourney-1', teamData))
                .rejects.toThrow("Tournament is already full.");
            
            expect(mockedAddDoc).not.toHaveBeenCalled();
        });

        it('should set team status to pending for open registration tournaments', async () => {
            const openRegTournament = { ...mockTournament, isTeamCountFixed: false, numberOfTeams: undefined };
            
            mockedGetDoc.mockResolvedValueOnce({
                exists: () => true,
                data: () => openRegTournament,
            });
             mockedAddDoc.mockResolvedValue({ id: 'new-team-id-pending' });

            await addTeamToTournament('tourney-1', { ...teamData, logo: '' });

            expect(mockedAddDoc).toHaveBeenCalledWith(
                undefined,
                expect.objectContaining({
                    status: 'pending',
                })
            );
        });

         it('should set team status to approved if manually added to open registration tournament', async () => {
            const openRegTournament = { ...mockTournament, isTeamCountFixed: false, numberOfTeams: undefined };
            
            mockedGetDoc.mockResolvedValueOnce({
                exists: () => true,
                data: () => openRegTournament,
            });
             mockedAddDoc.mockResolvedValue({ id: 'new-team-id-approved' });

            await addTeamToTournament('tourney-1', { ...teamData, logo: '' }, true); // isManualAdd = true

            expect(mockedAddDoc).toHaveBeenCalledWith(
                undefined,
                expect.objectContaining({
                    status: 'approved',
                })
            );
        });

    });

    describe('getTournament', () => {
        it('should return a tournament if it exists', async () => {
            const mockData = { tournamentName: 'Existing Tourney' };
            mockedGetDoc.mockResolvedValue({
                exists: () => true,
                id: 'existing-id',
                data: () => mockData
            });

            const tournament = await getTournament('existing-id');
            expect(tournament).toEqual({ id: 'existing-id', ...mockData });
        });

        it('should return null if a tournament does not exist', async () => {
            mockedGetDoc.mockResolvedValue({
                exists: () => false
            });
            const tournament = await getTournament('non-existent-id');
            expect(tournament).toBeNull();
        });
    });

    describe('getTournamentsForUserWithRoles', () => {
        it('should correctly aggregate tournaments and roles for a user', async () => {
            const userId = 'test-user';

            const ownerDocs = [{ id: 'tourney-1', data: () => ({ creatorId: userId, name: 'Owner' }) }];
            const adminDocs = [{ id: 'tourney-2', data: () => ({ admins: [userId], name: 'Admin' }) }];
            const participantDocs = [
                { id: 'tourney-3', data: () => ({ participants: [userId], name: 'Participant' }) },
                { id: 'tourney-1', data: () => ({ participants: [userId], name: 'Owner' }) }, // Also participant
            ];

            mockedGetDocs
                .mockResolvedValueOnce({ docs: ownerDocs })       // Owner query
                .mockResolvedValueOnce({ docs: adminDocs })       // Admin query
                .mockResolvedValueOnce({ docs: participantDocs }); // Participant query
            
            const results = await getTournamentsForUserWithRoles(userId);

            expect(results.length).toBe(3);

            const tourney1 = results.find(t => t.id === 'tourney-1');
            expect(tourney1?.roles).toEqual(expect.arrayContaining(['owner', 'participant']));

            const tourney2 = results.find(t => t.id === 'tourney-2');
            expect(tourney2?.roles).toEqual(['admin']);
            
            const tourney3 = results.find(t => t.id === 'tourney-3');
            expect(tourney3?.roles).toEqual(['participant']);
        });
    });

});
