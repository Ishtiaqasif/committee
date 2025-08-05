import { supabase } from './config';
import { Tournament, TournamentCreationData, Team, UserProfile, UserRole } from "@/types";

export async function createTournament(tournamentData: TournamentCreationData, userId: string): Promise<string> {
    const { data, error } = await supabase
        .from('tournaments')
        .insert([
            {
                ...tournamentData,
                creator_id: userId,
                language: 'en',
                tiebreaker_rules: ['goalDifference', 'goalsFor', 'headToHead'],
                away_goals_rule: tournamentData.awayGoalsRule ?? false,
                admins: [],
                participants: [],
            },
        ])
        .select();

    if (error) {
        console.error('Error creating tournament: ', error);
        throw error;
    }

    return data[0].id;
}

export async function getTournament(tournamentId: string): Promise<Tournament | null> {
    const { data, error } = await supabase
        .from('tournaments')
        .select('*')
        .eq('id', tournamentId)
        .single();

    if (error) {
        console.error('Error getting tournament: ', error);
        return null;
    }

    return data as Tournament;
}

export async function addTeamToTournament(tournamentId: string, teamData: Omit<Team, 'id'>): Promise<string> {
    const tournament = await getTournament(tournamentId);
    if (!tournament) throw new Error("Tournament not found");

    const { count } = await supabase
        .from('teams')
        .select('* ', { count: 'exact' })
        .eq('tournament_id', tournamentId);

    if (count >= tournament.numberOfTeams) {
        throw new Error("Tournament is already full.");
    }

    let logoUrl = '';
    if (teamData.logo && teamData.logo.startsWith('data:image')) {
        const logoFile = await (await fetch(teamData.logo)).blob();
        const filePath = `logos/${tournamentId}/${teamData.name.replace(/\s+/g, '_')}_${Date.now()}.png`;
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('logos')
            .upload(filePath, logoFile);

        if (uploadError) {
            console.error('Error uploading logo to Supabase Storage:', uploadError);
        } else {
            const { data: urlData } = supabase.storage.from('logos').getPublicUrl(filePath);
            logoUrl = urlData.publicUrl;
        }
    }

    const { data, error } = await supabase
        .from('teams')
        .insert([
            {
                ...teamData,
                tournament_id: tournamentId,
                logo: logoUrl,
            },
        ])
        .select();

    if (error) {
        console.error('Error adding team to tournament: ', error);
        throw error;
    }

    const { error: updateError } = await supabase
        .from('tournaments')
        .update({ participants: supabase.sql(`array_append(participants, '${teamData.ownerId}')`) })
        .eq('id', tournamentId);

    if (updateError) {
        console.error('Error updating tournament participants: ', updateError);
    }

    return data[0].id;
}

export async function getTeamsForTournament(tournamentId: string): Promise<Team[]> {
    const { data, error } = await supabase
        .from('teams')
        .select('*')
        .eq('tournament_id', tournamentId)
        .order('name', { ascending: true });

    if (error) {
        console.error('Error getting teams for tournament: ', error);
        return [];
    }

    return data as Team[];
}

export async function getTournamentsForUserWithRoles(userId: string): Promise<Tournament[]> {
    const { data, error } = await supabase.rpc('get_user_tournaments_with_roles', { user_id: userId });

    if (error) {
        console.error('Error getting tournaments for user: ', error);
        return [];
    }

    return data as Tournament[];
}

export async function updateTournament(tournamentId: string, data: Partial<Tournament>): Promise<void> {
    const { error } = await supabase
        .from('tournaments')
        .update(data)
        .eq('id', tournamentId);

    if (error) {
        console.error('Error updating tournament: ', error);
        throw error;
    }
}

export async function upsertUserProfile(user: UserProfile): Promise<void> {
    const { error } = await supabase.from('profiles').upsert(user);

    if (error) {
        console.error('Error upserting user profile: ', error);
        throw error;
    }
}

export async function getUserProfiles(uids: string[]): Promise<Record<string, UserProfile>> {
    if (uids.length === 0) return {};

    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .in('id', uids);

    if (error) {
        console.error('Error getting user profiles: ', error);
        return {};
    }

    const profiles: Record<string, UserProfile> = {};
    data.forEach(profile => {
        profiles[profile.id] = profile;
    });

    return profiles;
}

export async function getUserByEmail(email: string): Promise<UserProfile | null> {
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', email)
        .single();

    if (error) {
        console.error('Error getting user by email: ', error);
        return null;
    }

    return data as UserProfile;
}
