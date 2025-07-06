// This file is machine-generated - edit with caution!

'use server';

/**
 * @fileOverview Generates a tournament fixture based on the specified tournament type and number of teams.
 *
 * - generateTournamentFixture - A function that generates the tournament fixture.
 * - GenerateTournamentFixtureInput - The input type for the generateTournamentFixture function.
 * - GenerateTournamentFixtureOutput - The return type for the generateTournamentFixture function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const TournamentType = z.enum(['round-robin', 'single elimination']);

const GenerateTournamentFixtureInputSchema = z.object({
  tournamentType: TournamentType.describe('The type of tournament (round-robin, single elimination).'),
  numberOfTeams: z.number().int().min(2).describe('The number of teams participating in the tournament.'),
  tournamentName: z.string().describe('The name of the tournament.'),
});
export type GenerateTournamentFixtureInput = z.infer<typeof GenerateTournamentFixtureInputSchema>;

const GenerateTournamentFixtureOutputSchema = z.object({
  fixture: z.string().describe('The generated tournament fixture in JSON format.'),
});
export type GenerateTournamentFixtureOutput = z.infer<typeof GenerateTournamentFixtureOutputSchema>;

export async function generateTournamentFixture(
  input: GenerateTournamentFixtureInput
): Promise<GenerateTournamentFixtureOutput> {
  return generateTournamentFixtureFlow(input);
}

const generateTournamentFixturePrompt = ai.definePrompt({
  name: 'generateTournamentFixturePrompt',
  input: {
    schema: GenerateTournamentFixtureInputSchema,
  },
  output: {
    schema: GenerateTournamentFixtureOutputSchema,
  },
  prompt: `You are a tournament organizer. Generate a tournament fixture in JSON format for a
{{tournamentType}} tournament with {{numberOfTeams}} teams.
The tournament name is {{tournamentName}}.

Make sure that the JSON is parseable.
`,
});

const generateTournamentFixtureFlow = ai.defineFlow(
  {
    name: 'generateTournamentFixtureFlow',
    inputSchema: GenerateTournamentFixtureInputSchema,
    outputSchema: GenerateTournamentFixtureOutputSchema,
  },
  async input => {
    const {output} = await generateTournamentFixturePrompt(input);
    return output!;
  }
);
