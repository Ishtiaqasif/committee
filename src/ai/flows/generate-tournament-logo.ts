'use server';
/**
 * @fileOverview Generates a tournament logo.
 *
 * - generateTournamentLogo - A function that generates a tournament logo image.
 * - GenerateTournamentLogoInput - The input type for the generateTournamentLogo function.
 * - GenerateTournamentLogoOutput - The return type for the generateTournamentLogo function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateTournamentLogoInputSchema = z.object({
  tournamentName: z.string().describe('The name of the tournament.'),
});
export type GenerateTournamentLogoInput = z.infer<typeof GenerateTournamentLogoInputSchema>;

const GenerateTournamentLogoOutputSchema = z.object({
  logoDataUri: z.string().describe('The generated logo as a data URI.'),
});
export type GenerateTournamentLogoOutput = z.infer<typeof GenerateTournamentLogoOutputSchema>;

export async function generateTournamentLogo(
  input: GenerateTournamentLogoInput
): Promise<GenerateTournamentLogoOutput> {
  return generateTournamentLogoFlow(input);
}

const generateTournamentLogoFlow = ai.defineFlow(
  {
    name: 'generateTournamentLogoFlow',
    inputSchema: GenerateTournamentLogoInputSchema,
    outputSchema: GenerateTournamentLogoOutputSchema,
  },
  async ({tournamentName}) => {
    const {media} = await ai.generate({
        model: 'googleai/gemini-2.0-flash-preview-image-generation',
        prompt: `Generate a modern, professional, and visually appealing logo for a tournament named "${tournamentName}". The logo should be circular or shield-shaped, clean, and easily recognizable. Use a strong, vibrant color palette suitable for a competition. The logo must be on a transparent background.`,
        config: {
            responseModalities: ['TEXT', 'IMAGE'],
        },
    });

    if (!media?.url) {
        throw new Error('Image generation failed.');
    }

    return {
      logoDataUri: media.url,
    };
  }
);
