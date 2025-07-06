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

const TournamentType = z.enum(['round-robin', 'single elimination', 'hybrid']);

const GenerateTournamentFixtureInputSchema = z.object({
  tournamentType: TournamentType.describe('The type of tournament (round-robin, single elimination, hybrid).'),
  numberOfTeams: z.number().int().min(3).describe('The number of teams participating in the tournament.'),
  tournamentName: z.string().describe('The name of the tournament.'),
  isEsports: z.boolean().describe('Whether this is an esports tournament (played online).'),
  venues: z.string().optional().describe('A comma-separated list of venues for matches.'),
  roundRobinGrouping: z.enum(['all-play-all', 'grouped']).optional().describe("For round-robin stages, whether all teams play each other or are split into groups."),
  teamsPerGroup: z.number().int().optional().describe("If using grouped round-robin, the number of teams per group."),
  roundRobinHomeAndAway: z.boolean().describe('Whether to generate home and away matches for round-robin stages.'),
  knockoutHomeAndAway: z.boolean().describe('Whether to generate home and away matches (two-legged ties) for knockout stages.'),
  teamsAdvancing: z.number().int().optional().describe('Number of teams advancing to the knockout stage in a hybrid tournament.'),
  fixtureGeneration: z.enum(['random', 'predefined']).describe("Whether to generate fixtures with random pairings or a predefined 'seeded' path."),
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

This is an {{#if isEsports}}esports (online) tournament.{{else}}in-person tournament.{{/if}}

{{#if venues}}
The available venues are: {{venues}}. Assign one of these venues to each match by adding a "venue" field to each match object. Cycle through the venues if there are more matches than venues. Do not assign venues for 'bye' matches.
{{else}}
Each match object in the JSON output must include a "venue" field. If it's an esports tournament, set the venue to "Online". If it's an in-person tournament without specified venues, set it to "TBD".
{{/if}}

Fixture Generation Method: {{fixtureGeneration}}. If 'random', shuffle team pairings. If 'predefined', use a standard berger table or seeding.

- For round-robin stages (including the group stage of a hybrid tournament), {{#if roundRobinHomeAndAway}}generate home and away matches.{{else}}do not generate home and away matches.{{/if}} If there is an odd number of teams in a group or in an all-play-all tournament, one team must have a 'bye' in each round. For a 'bye' match, one of the team names should be the real team and the other should be the string "Bye".
- For single elimination stages (including the knockout stage of a hybrid tournament), {{#if knockoutHomeAndAway}}generate two-legged ties (home and away). The winner should be determined by aggregate score. If scores are level, use away goals, then penalties if needed. Your JSON output for two-legged knockout matches should represent each leg as a separate match within the round. For example, a quarter-final between Team A and Team B would have two match objects.{{else}}generate single-leg matches.{{/if}}

- For 'single elimination' type, the JSON should have a \`rounds\` array at the top level. If the number of teams is not a power of two, you must add 'bye' matches in the first round to make it work. A 'bye' match means one team automatically advances to the next round without playing. For a 'bye' match, one of the team names should be the string "Bye".

- For 'round-robin' type:
  - If 'roundRobinGrouping' is 'all-play-all', the JSON should have a \`rounds\` array at the top level.
  - If 'roundRobinGrouping' is 'grouped', split the {{numberOfTeams}} teams into groups of {{teamsPerGroup}}. The top-level key should be \`groups\`, an array of group objects. Each group object must have: a \`groupName\` (e.g., "Group A"), a \`teams\` array with team names (e.g., ["Team 1", "Team 4"]), and a \`rounds\` array for that group's fixture.

- For 'hybrid' type, the JSON must have a \`groupStage\` and a \`knockoutStage\` key at the top level.
  - \`knockoutStage\` should be a single elimination tournament fixture object, with a \`rounds\` array. The teams in the **first round** of the \`knockoutStage\` matches MUST be placeholders representing the teams advancing from the group stage (e.g., "Winner Group A", "Runner-up Group B"). For subsequent knockout rounds, use placeholders that refer to winners of previous knockout matches (e.g., "Winner Match 1"). Do NOT use match-winner placeholders in the first round of the knockout stage.
  - The \`groupStage\` format depends on the grouping:
    - If 'roundRobinGrouping' is 'all-play-all', it should have a \`rounds\` array.
    - If 'roundRobinGrouping' is 'grouped', it must have a \`groups\` array, following the same structure described for grouped round-robin tournaments.
  {{#if teamsAdvancing}}The knockout stage must be configured for exactly {{teamsAdvancing}} teams.{{else}}You must determine a reasonable number of teams to advance based on the total number of teams (e.g., for 8 total teams, the top 4 advance to a semi-final knockout).{{/if}}

Make sure the entire output is a single, parsable JSON object.
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
