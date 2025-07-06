'use server';
/**
 * @fileOverview Generates a team logo.
 *
 * - generateTeamLogo - A function that generates a team logo image.
 * - GenerateTeamLogoInput - The input type for the generateTeamLogo function.
 * - GenerateTeamLogoOutput - The return type for the generateTeamlogo function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateTeamLogoInputSchema = z.object({
  teamName: z.string().describe('The name of the team.'),
});
export type GenerateTeamLogoInput = z.infer<typeof GenerateTeamLogoInputSchema>;

const GenerateTeamLogoOutputSchema = z.object({
  logoDataUri: z.string().describe('The generated logo as a data URI.'),
});
export type GenerateTeamLogoOutput = z.infer<typeof GenerateTeamLogoOutputSchema>;

export async function generateTeamLogo(
  input: GenerateTeamLogoInput
): Promise<GenerateTeamLogoOutput> {
  return generateTeamLogoFlow(input);
}

const generateTeamLogoFlow = ai.defineFlow(
  {
    name: 'generateTeamLogoFlow',
    inputSchema: GenerateTeamLogoInputSchema,
    outputSchema: GenerateTeamLogoOutputSchema,
  },
  async ({teamName}) => {
    const {media} = await ai.generate({
        model: 'googleai/gemini-2.0-flash-preview-image-generation',
        prompt: `Generate a modern, flat, vector-style, circular esports logo for a team named "${teamName}". The logo should be simple, clean, and easily recognizable. Use a vibrant but limited color palette. The logo must be on a transparent background.`,
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
