# Rematch Bot

A Discord bot that shows the ranks of players from your last Rematch game using the RematchTracker.com API.

## Features

- 🎮 **`/lastgame <username> [platform]`** - Shows ranks of all players from your most recent match
- 👤 **`/rank <username> [platform]`** - Check a specific player's rank, stats, and team info
- 🌐 **Multi-platform support** - Search across Steam, PlayStation, and Xbox
- 🏆 Displays ranks with emojis (Bronze 🥉, Silver 🥈, Gold 🥇, Platinum 💠, Diamond 💎, Elite 👑)
- 📊 Shows player statistics and team information
- ⚡ Fast responses with optimized search order

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

### `/lastgame <username> [platform]`
Shows the ranks of all players from the specified user's most recent match.

**Examples:**
- `/lastgame username:baethal` - Search across all platforms
- `/lastgame username:baethal platform:steam` - Search only on Steam
- `/lastgame username:baethal platform:playstation` - Search only on PlayStation
- `/lastgame username:baethal platform:xbox` - Search only on Xbox

**Output:** Displays both teams with player ranks, match score, and tournament info.

### `/rank <username> [platform]`
Shows detailed information about a specific player.

**Examples:**
- `/rank username:baethal` - Search across all platforms
- `/rank username:baethal platform:steam` - Search only on Steam
- `/rank username:baethal platform:playstation` - Search only on PlayStation
- `/rank username:baethal platform:xbox` - Search only on Xbox

**Output:** Shows rank, position, team, stats, and more.

## Platform Search

The bot supports multi-platform search with optimized performance:

**Multi-platform search (default):**
- Searches Steam Community first for exact matches
- Falls back to PlayStation, then Xbox
- Tries additional Steam results if needed

**Platform-specific search:**
- Faster, targeted search on a specific platform
- Useful when you know exactly where to find the player
- Provides clearer error messages if player not found on that platform

## Rank System

The bot displays ranks with emojis:
- 🥉 Bronze
- 🥈 Silver
- 🥇 Gold
- 💠 Platinum
- 💎 Diamond
- 👑 Elite

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