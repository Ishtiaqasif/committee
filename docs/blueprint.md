# **App Name**: Gridiron Genesis

## Core Features:

- Tournament Creation: Create new tournaments by specifying name, number of teams, and tournament type (e.g., round-robin, single elimination).
- Team Registration: Register teams for a tournament by providing team names. No database interaction.
- Fixture Generation: Use generative AI to generate a tournament fixture/schedule based on the tournament type (e.g. round robin, single elimination).  The AI LLM will function as a 'tool', reasoning over multiple stages to generate the full tournament fixture list from start to finish. Note: the LLM will generate JSON which must be converted into a structured format that can be understood by humans.
- Result Entry: Enter match results, including team scores.
- Live Points Table: Dynamically update and display a live points table based on entered match results.
- Bracket Presentation: Display tournament bracket - the AI fixture generator tool supplies the matches in JSON; present them visually using nested UI elements, according to the shape and style appropriate to single-elimination.

## Style Guidelines:

- Primary color: Deep indigo (#4B0082) to represent strategy and intensity of the game.
- Background color: Light gray (#F0F0F0) to ensure readability and provide a clean interface.
- Accent color: Gold (#FFD700) for highlights and important actions, symbolizing victory.
- Font: 'Inter' sans-serif for both headlines and body text; clean, modern and versatile.
- Use icons to represent different actions like edit, delete, and view to make the UI intuitive.
- Ensure a clean, modern layout with proper spacing to enhance readability and user experience.
- Use subtle animations for updating match results and points table to make the app dynamic and engaging.