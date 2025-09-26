# Rematch Bot

A Discord bot that shows the ranks of players from your last Rematch game using the RematchTracker.com API.

## Features

- 🎮 **`/lastgame <username>`** - Shows ranks of all players from your most recent match
- 👤 **`/rank <username>`** - Check a specific player's rank, stats, and team info
- 🏆 Displays ranks with emojis (Bronze 🥉, Silver 🥈, Gold 🥇, etc.)
- 📊 Shows player statistics and team information
- ⚡ Fast responses using RematchTracker.com API

## Setup

1. **Install dependencies:**
   ```bash
   bun install
   ```

2. **Create a Discord application:**
   - Go to https://discord.com/developers/applications
   - Create a new application
   - Go to the "Bot" section
   - Create a bot and copy the token

3. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env and add your Discord bot token
   ```

4. **Invite the bot to your server:**
   - Go to OAuth2 → URL Generator
   - Select "bot" and "applications.commands" scopes
   - Select necessary permissions (Send Messages, Use Slash Commands)
   - Use the generated URL to invite the bot

5. **Run the bot:**
   ```bash
   bun run dev
   ```

## Commands

### `/lastgame <username>`
Shows the ranks of all players from the specified user's most recent match.

**Example:** `/lastgame baethal`

**Output:** Displays both teams with player ranks, match score, and tournament info.

### `/rank <username>`
Shows detailed information about a specific player.

**Example:** `/rank baethal`

**Output:** Shows rank, position, team, stats, and more.

## Rank System

The bot displays ranks with emojis:
- 🥉 Bronze
- 🥈 Silver
- 🥇 Gold
- 💎 Platinum
- 💠 Diamond
- 🏆 Master
- 👑 Grandmaster

## API

This bot uses the RematchTracker.com API to fetch player and match data. No API key is required as it uses public endpoints.

## Development

```bash
# Development mode with hot reload
bun run dev

# Production mode
bun run start
```

## License

ISC