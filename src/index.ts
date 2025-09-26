import { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes, EmbedBuilder } from 'discord.js';
import axios from 'axios';

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages]
});

interface RematchPlayer {
    id: string;
    username: string;
    displayName?: string;
    avatarUrl?: string;
    position?: string;
    jerseyNumber?: number;
    country?: string;
    platform: string;
    rank?: string;
    division?: string | null;
    fullRank?: string;
    rank3v3?: string;
    division3v3?: string | null;
    fullRank3v3?: string;
    currentTeam?: {
        id: string;
        name: string;
        tag: string;
        isCaptain: boolean;
        logoUrl?: string;
    };
    stats: {
        goals: number;
        assists: number;
        games: number;
        mvps: number;
        passes: number;
        interceptions: number;
        saves: number;
        winRate: number;
    };
}

interface RematchPlayerWithHistory {
    player: RematchPlayer;
    matchHistory: any[];
}

interface RematchMatch {
    id: string;
    teamFormat: string;
    status: string;
    scoreTeam1: number;
    scoreTeam2: number;
    endedAt: string;
    team1: {
        id: string;
        name: string;
        tag: string;
        members: Array<{
            username: string;
            userId: string;
            isCaptain: boolean;
            user?: {
                id: string;
                username: string;
            };
        }>;
    };
    team2: {
        id: string;
        name: string;
        tag: string;
        members: Array<{
            username: string;
            userId: string;
            isCaptain: boolean;
            user?: {
                id: string;
                username: string;
            };
        }>;
    };
    tournament?: {
        name: string;
    };
}

export class RematchAPI {
    private baseURL = 'https://api.rematchtracker.com';

    private mapPlatformForAPI(platform: string): string {
        switch (platform) {
            case 'playstation':
                return 'psn';
            case 'steam':
            case 'xbox':
            default:
                return platform;
        }
    }

    private async getProfile(platform: string, platformId: string): Promise<any> {
        const profileResponse = await axios.post(`${this.baseURL}/scrap/profile`, {
            platform: this.mapPlatformForAPI(platform),
            platformId: platformId
        }, {
            headers: {
                'Content-Type': 'application/json'
            }
        });
        return profileResponse;
    }

    async searchSteamUsersByAlias(alias: string): Promise<string[]> {
        try {
            console.log(`🔍 Searching Steam for alias "${alias}"...`);

            // First, get cookies from Steam search page (matching steam_search.sh)
            const cookieResponse = await axios.get('https://steamcommunity.com/search/users/', {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
                    'Accept-Language': 'en-GB,en;q=0.9',
                    'Cache-Control': 'no-cache',
                    'Connection': 'keep-alive',
                    'Pragma': 'no-cache',
                    'Sec-Ch-Ua': '"Chromium";v="140", "Not=A?Brand";v="24", "Google Chrome";v="140"',
                    'Sec-Ch-Ua-Mobile': '?0',
                    'Sec-Ch-Ua-Platform': '"Windows"',
                    'Sec-Fetch-Dest': 'document',
                    'Sec-Fetch-Mode': 'navigate',
                    'Sec-Fetch-Site': 'none',
                    'Sec-Fetch-User': '?1',
                    'Upgrade-Insecure-Requests': '1'
                }
            });

            // Extract sessionid from set-cookie headers
            const cookies = cookieResponse.headers['set-cookie'];
            let sessionId = '';

            if (cookies) {
                for (const cookie of cookies) {
                    if (cookie.includes('sessionid=')) {
                        sessionId = cookie.split('sessionid=')[1].split(';')[0];
                        break;
                    }
                }
            }

            if (!sessionId) {
                console.log('❌ No sessionid found in cookies');
                return [];
            }

            console.log(`✅ Using sessionid: ${sessionId}`);

            // Search for users using the AJAX endpoint (matching steam_search.sh headers)
            const searchResponse = await axios.get('https://steamcommunity.com/search/SearchCommunityAjax', {
                params: {
                    text: alias,
                    filter: 'users',
                    sessionid: sessionId,
                    steamid_user: 'false',
                    page: 1
                },
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
                    'Accept': 'application/json, text/javascript, */*; q=0.01',
                    'Accept-Language': 'en-GB,en;q=0.9',
                    'Cache-Control': 'no-cache',
                    'Connection': 'keep-alive',
                    'Pragma': 'no-cache',
                    'Sec-Ch-Ua': '"Chromium";v="140", "Not=A?Brand";v="24", "Google Chrome";v="140"',
                    'Sec-Ch-Ua-Mobile': '?0',
                    'Sec-Ch-Ua-Platform': '"Windows"',
                    'Sec-Fetch-Dest': 'empty',
                    'Sec-Fetch-Mode': 'cors',
                    'Sec-Fetch-Site': 'same-origin',
                    'X-Requested-With': 'XMLHttpRequest',
                    'Origin': 'https://steamcommunity.com',
                    'Cookie': `sessionid=${sessionId}`
                }
            });

            if (searchResponse.data && searchResponse.data.html) {
                // Parse HTML to extract Steam identifiers preserving order
                const html = searchResponse.data.html;
                const identifierRegex = /https:\/\/steamcommunity\.com\/(profiles\/(\d{17})|id\/([a-zA-Z0-9_-]+))/g;
                const identifiers = [];
                const seen = new Set();
                let match;

                while ((match = identifierRegex.exec(html)) !== null) {
                    let identifier;
                    if (match[2]) {
                        // Direct Steam ID from /profiles/
                        identifier = match[2];
                    } else if (match[3]) {
                        // Custom URL from /id/ - use the custom name as identifier for now
                        identifier = `custom:${match[3]}`;
                    }

                    if (identifier && !seen.has(identifier)) {
                        seen.add(identifier);
                        identifiers.push(identifier);
                    }
                }

                console.log(`✅ Found ${identifiers.length} unique Steam identifiers for "${alias}"`);
                return identifiers.slice(0, 10); // Return up to 10 results preserving order
            }

            return [];
        } catch (error) {
            console.error('Error searching Steam users:', error);
            return [];
        }
    }

    async searchUserByPlatform(username: string, platform: 'steam' | 'playstation' | 'xbox'): Promise<RematchPlayerWithHistory | null> {
        try {
            console.log(`🔍 Searching for "${username}" on ${platform} using scrap API...`);

            // Try to resolve username first
            const resolveResponse = await axios.post(`${this.baseURL}/scrap/resolve`, {
                platform: platform,
                identifier: username
            }, {
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (resolveResponse.data.success) {
                const { platform_id, display_name } = resolveResponse.data;
                console.log(`✅ Resolved "${username}" to "${display_name}" (${platform_id}) on ${platform}`);

                try {
                    // Get full profile data including match history
                    const profileResponse = await this.getProfile(platform, platform_id);

                    if (profileResponse.data.success) {
                        const player = this.convertToRematchPlayer(profileResponse.data);
                        const matchHistory = profileResponse.data.match_history?.items || [];
                        return { player, matchHistory };
                    }

                    return null;
                } catch (profileError: any) {
                    // 500 errors likely mean the profile exists but has no Rematch data
                    if (profileError.response?.status === 500) {
                        console.log(`⚠️  ${platform} ID ${platform_id} exists but has no Rematch data`);
                    } else {
                        console.log(`⚠️  Profile fetch failed for ${platform_id} on ${platform}: ${profileError.response?.status || 'Unknown'} ${profileError.message}`);
                    }
                    return null;
                }
            }

            return null;
        } catch (error: any) {
            console.log(`⚠️  Platform search failed for "${username}" on ${platform}: ${error.response?.status || 'Unknown'} ${error.message}`);
            return null;
        }
    }

    async searchUserBySteamId(identifier: string): Promise<RematchPlayerWithHistory | null> {
        try {
            let platformId: string;
            let displayType: string;

            if (identifier.startsWith('custom:')) {
                // Custom URL - need to resolve using full Steam URL
                const customUrl = identifier.replace('custom:', '');
                const fullSteamUrl = `steamcommunity.com/id/${customUrl}`;
                console.log(`🔍 Searching for custom Steam URL "${fullSteamUrl}" using scrap API...`);

                // Try resolving custom URL using full Steam URL through the scrap API
                return await this.searchUserByPlatform(fullSteamUrl, 'steam');
            } else {
                // Direct Steam ID
                platformId = identifier;
                displayType = `Steam ID "${platformId}"`;
                console.log(`🔍 Searching for ${displayType} using scrap API...`);

                // Get profile data directly by Steam ID
                const profileResponse = await this.getProfile('steam', platformId);

                if (profileResponse.data.success) {
                    const player = this.convertToRematchPlayer(profileResponse.data);
                    const matchHistory = profileResponse.data.match_history?.items || [];
                    return { player, matchHistory };
                }

                return null;
            }
        } catch (error: any) {
            // 500 errors likely mean the Steam profile exists but has no Rematch data
            // This is expected and should be handled gracefully
            if (error.response?.status === 500) {
                console.log(`⚠️  Steam identifier ${identifier} exists but has no Rematch data`);
            } else {
                console.log(`⚠️  Error searching Steam identifier ${identifier}: ${error.response?.status || 'Unknown'} ${error.message}`);
            }
            return null;
        }
    }

    async searchUserMultiPlatform(username: string): Promise<RematchPlayerWithHistory | null> {
        console.log(`🔍 Multi-platform search for "${username}"`);

        // Step 1: Get Steam identifiers from alias search
        const steamIdentifiers = await this.searchSteamUsersByAlias(username);

        // Step 2: Try first Steam result (resolve + fetch profile immediately)
        if (steamIdentifiers.length > 0) {
            console.log(`🎮 Trying first Steam result: ${steamIdentifiers[0]}`);
            const steamResult = await this.searchUserBySteamId(steamIdentifiers[0]);
            if (steamResult) {
                console.log(`✅ Found player on Steam (first result)`);
                return steamResult;
            }
        }

        // Step 3: Try PlayStation API (resolve + fetch profile immediately)
        console.log(`🎮 Trying PlayStation API...`);
        const playstationResult = await this.searchUserByPlatform(username, 'playstation');
        if (playstationResult) {
            console.log(`✅ Found player via PlayStation API`);
            return playstationResult;
        }

        // Step 4: Try Xbox API (resolve + fetch profile immediately)
        console.log(`🎮 Trying Xbox API...`);
        const xboxResult = await this.searchUserByPlatform(username, 'xbox');
        if (xboxResult) {
            console.log(`✅ Found player via Xbox API`);
            return xboxResult;
        }

        // Step 5: Try remaining Steam results (up to 20 total attempts)
        const maxAttempts = Math.min(20, steamIdentifiers.length);
        for (let i = 1; i < maxAttempts; i++) {
            console.log(`🎮 Trying Steam result ${i + 1}: ${steamIdentifiers[i]}`);
            const steamResult = await this.searchUserBySteamId(steamIdentifiers[i]);
            if (steamResult) {
                console.log(`✅ Found player on Steam (result ${i + 1})`);
                return steamResult;
            }
        }

        console.log(`❌ No results found for "${username}" across all platforms`);
        return null;
    }

    async searchUser(username: string): Promise<RematchPlayer | null> {
        try {
            console.log(`🔍 Searching for "${username}" using new scrap API...`);

            // Try to resolve username first (works for Steam usernames like "miltu")
            const resolveResponse = await axios.post(`${this.baseURL}/scrap/resolve`, {
                platform: 'steam',
                identifier: username
            }, {
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (resolveResponse.data.success) {
                const { platform_id, display_name } = resolveResponse.data;
                console.log(`✅ Resolved "${username}" to "${display_name}" (${platform_id})`);

                // Get full profile data
                const profileResponse = await axios.post(`${this.baseURL}/scrap/profile`, {
                    platform: 'steam',
                    platformId: platform_id
                }, {
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });

                if (profileResponse.data.success) {
                    return this.convertToRematchPlayer(profileResponse.data);
                }
            }

            return null;
        } catch (error) {
            console.error('Error searching user:', error);
            return null;
        }
    }

    private convertToRematchPlayer(data: any): RematchPlayer {
        const player = data.player;
        const rank = data.rank;
        const rank3v3 = data.rank3v3;
        const stats = data.lifetime_stats.All || {};

        // Convert 5v5 league/division to readable rank
        const rankName = this.getLeagueRankName(rank.current_league, rank.current_division);
        const division = rank.current_division <= 2 ? `div_${rank.current_division}` : null;
        const fullRankText = division ? `${rankName.toLowerCase()} ${division}` : rankName.toLowerCase();


        const rankName3v3 = this.getLeagueRankName(rank3v3.current_league, rank3v3.current_division);
        const division3v3 = rank3v3.current_division <= 2 ? `div_${rank3v3.current_division}` : null;
        const fullRankText3v3 = division3v3 ? `${rankName3v3.toLowerCase()} ${division3v3}` : rankName3v3.toLowerCase();

        return {
            id: player.platform_id,
            username: player.display_name,
            displayName: player.display_name,
            avatarUrl: undefined, // Not provided in this API
            position: undefined,
            jerseyNumber: undefined,
            country: undefined,
            platform: player.platform,
            rank: rankName.toLowerCase(),
            division: division,
            fullRank: fullRankText,
            rank3v3: rankName3v3?.toLowerCase(),
            division3v3: division3v3,
            fullRank3v3: fullRankText3v3,
            currentTeam: undefined, // Not provided in this API
            stats: {
                goals: stats.goals || 0,
                assists: stats.assists || 0,
                games: stats.matches_played || 0,
                mvps: stats.mvps || 0,
                passes: stats.passes || 0,
                interceptions: stats.intercepted_passes || 0,
                saves: stats.saves || 0,
                winRate: stats.matches_played > 0 ? stats.wins / stats.matches_played : 0
            }
        };
    }

    getLeagueRankName(league: number, division: number): string {
        switch (league) {
            case 0: return 'Bronze';
            case 1: return 'Silver';
            case 2: return 'Gold';
            case 3: return 'Platinum';
            case 4: return 'Diamond';
            case 5: return 'Master';
            case 6: return 'Elite';
            default: return league === -1 ? 'Unranked' : 'Unknown';
        }
    }

    async getRecentMatches(limit: number = 10): Promise<RematchMatch[]> {
        try {
            const response = await axios.get(`${this.baseURL}/matches?page=1`);
            return response.data.data.data.slice(0, limit);
        } catch (error) {
            console.error('Error fetching matches:', error);
            return [];
        }
    }

    async getPlayerMatchHistory(username: string): Promise<any[] | null> {
        try {
            console.log(`🔍 Getting match history for "${username}"...`);

            // First resolve the username to get their platform ID
            const resolveResponse = await axios.post(`${this.baseURL}/scrap/resolve`, {
                platform: 'steam',
                identifier: username
            }, {
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (resolveResponse.data.success) {
                const { platform_id } = resolveResponse.data;

                // Get full profile data which includes match history
                const profileResponse = await axios.post(`${this.baseURL}/scrap/profile`, {
                    platform: 'steam',
                    platformId: platform_id
                }, {
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });

                if (profileResponse.data.success && profileResponse.data.match_history) {
                    return profileResponse.data.match_history.items || [];
                }
            }

            return null;
        } catch (error) {
            console.error('Error getting match history:', error);
            return null;
        }
    }


    getRankEmoji(rank: string | undefined): string {
        if (!rank) return '❓';

        switch (rank.toLowerCase()) {
            case 'bronze': return '🥉';
            case 'silver': return '🥈';
            case 'gold': return '🥇';
            case 'platinum': case 'platinium': return '💠';
            case 'diamond': return '💎';
            case 'master': return '🏆';
            case 'elite': return '👑';
            default: return '❓';
        }
    }

    formatRank(player: RematchPlayer): string {
        if (!player.rank) return 'Unranked';

        const emoji = this.getRankEmoji(player.rank);
        const rank = player.rank.charAt(0).toUpperCase() + player.rank.slice(1);

        // Don't show divisions for unranked players or Elite rank
        if (player.rank.toLowerCase() === 'unranked' || player.rank.toLowerCase() === 'elite') {
            return `${emoji} ${rank}`;
        }

        // Convert div_0 => Div 3, div_1 => Div 2, div_2 => Div 1
        // Division 4 (div_3) should not be displayed
        let division = '';
        if (player.division && player.division.startsWith('div_')) {
            const divNum = parseInt(player.division.split('_')[1]);
            if (divNum <= 2) { // Only show divisions 1-3 (div_0, div_1, div_2)
                const displayDiv = 3 - divNum; // Convert: 0->3, 1->2, 2->1
                division = ` Div ${displayDiv}`;
            }
        }

        return `${emoji} ${rank}${division}`;
    }

    formatRank3v3(player: RematchPlayer): string {
        if (!player.rank3v3) return 'Unranked';

        const emoji = this.getRankEmoji(player.rank3v3);
        const rank = player.rank3v3.charAt(0).toUpperCase() + player.rank3v3.slice(1);

        // Don't show divisions for unranked players or Elite rank
        if (player.rank3v3.toLowerCase() === 'unranked' || player.rank3v3.toLowerCase() === 'elite') {
            return `${emoji} ${rank}`;
        }

        // Convert div_0 => Div 3, div_1 => Div 2, div_2 => Div 1
        // Division 4 (div_3) should not be displayed
        let division = '';
        if (player.division3v3 && player.division3v3.startsWith('div_')) {
            const divNum = parseInt(player.division3v3.split('_')[1]);
            if (divNum <= 2) { // Only show divisions 1-3 (div_0, div_1, div_2)
                const displayDiv = 3 - divNum; // Convert: 0->3, 1->2, 2->1
                division = ` Div ${displayDiv}`;
            }
        }

        return `${emoji} ${rank}${division}`;
    }
}

const rematchAPI = new RematchAPI();

const commands = [
    new SlashCommandBuilder()
        .setName('lastgame')
        .setDescription('Show ranks of players from your last Rematch game')
        .addStringOption(option =>
            option.setName('username')
                .setDescription('Your Rematch username')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('platform')
                .setDescription('Platform to search on (optional)')
                .setRequired(false)
                .addChoices(
                    { name: 'Steam', value: 'steam' },
                    { name: 'PlayStation', value: 'playstation' },
                    { name: 'Xbox', value: 'xbox' }
                )
        ),
    new SlashCommandBuilder()
        .setName('rank')
        .setDescription('Check a specific player\'s rank and stats')
        .addStringOption(option =>
            option.setName('username')
                .setDescription('Player\'s Rematch username')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('platform')
                .setDescription('Platform to search on (optional)')
                .setRequired(false)
                .addChoices(
                    { name: 'Steam', value: 'steam' },
                    { name: 'PlayStation', value: 'playstation' },
                    { name: 'Xbox', value: 'xbox' }
                )
        )
];

client.once('clientReady', async () => {
    console.log(`🤖 Logged in as ${client.user?.tag}!`);

    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN!);

    try {
        console.log('🔄 Started refreshing application (/) commands.');

        await rest.put(
            Routes.applicationCommands(client.user!.id),
            { body: commands }
        );

        console.log('✅ Successfully reloaded application (/) commands.');
        console.log('📝 Commands registered:', commands.map(cmd => `/${cmd.name}`).join(', '));
    } catch (error) {
        console.error('❌ Error refreshing commands:', error);
        console.error('Full error:', JSON.stringify(error, null, 2));
    }
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const { commandName } = interaction;

    if (commandName === 'lastgame') {
        const username = interaction.options.getString('username')!;
        const platform = interaction.options.getString('platform') as 'steam' | 'playstation' | 'xbox' | null;
        await interaction.deferReply();

        try {
            let result: RematchPlayerWithHistory | null;

            if (platform) {
                console.log(`🔍 Looking up player: ${username} on ${platform}`);
                result = await rematchAPI.searchUserByPlatform(username, platform);
            } else {
                console.log(`🔍 Looking up player: ${username}`);
                result = await rematchAPI.searchUserMultiPlatform(username);
            }

            if (!result) {
                const errorMessage = platform
                    ? `❌ Could not find player **${username}** on **${platform.charAt(0).toUpperCase() + platform.slice(1)}**. Make sure the username is correct for that platform.`
                    : `❌ Could not find player **${username}**. Make sure the username is correct.`;
                await interaction.editReply(errorMessage);
                return;
            }

            const { player: playerData, matchHistory } = result;

            if (!matchHistory || matchHistory.length === 0) {
                await interaction.editReply(`❌ Could not find any recent matches for **${playerData.displayName || username}**. Make sure they've played recently.`);
                return;
            }

            // Get the most recent match
            const lastMatch = matchHistory[0];
            const playerRank = rematchAPI.formatRank(playerData);

            const embed = new EmbedBuilder()
                .setTitle('🎮 Last Game Stats')
                .setDescription(
                    `**${playerData?.displayName || username}** • ${playerRank}\n` +
                    `**Playlist:** ${lastMatch.playlist}\n` +
                    `**Result:** ${lastMatch.wins > 0 ? '🟢 WIN' : '🔴 LOSS'}\n` +
                    `**Games:** ${lastMatch.match_count} game(s)`
                )
                .setColor(lastMatch.wins > 0 ? 0x00ff88 : 0xff4444)
                .setTimestamp(new Date(lastMatch.timestamp))
                .setFooter({ text: 'Rematch Bot • Your Personal Stats' });

            // Add performance stats
            embed.addFields({
                name: '⚽ Performance',
                value:
                    `**Goals:** ${lastMatch.goals}\n` +
                    `**Assists:** ${lastMatch.assists}\n` +
                    `**Saves:** ${lastMatch.goalkeeper_saves}\n` +
                    `**MVPs:** ${lastMatch.mvp_titles}`,
                inline: true
            });

            embed.addFields({
                name: '🎯 Accuracy',
                value:
                    `**Shots:** ${lastMatch.shots}\n` +
                    `**On Target:** ${lastMatch.shots_on_target}\n` +
                    `**Passes:** ${lastMatch.passes}\n` +
                    `**Tackles:** ${lastMatch.tackle_success}/${lastMatch.tackles}`,
                inline: true
            });

            // Show rank change if available
            if (lastMatch.previous_league !== undefined && lastMatch.current_league !== undefined) {
                const prevRank = rematchAPI.getLeagueRankName(lastMatch.previous_league, lastMatch.previous_division || 0);
                const currentRank = rematchAPI.getLeagueRankName(lastMatch.current_league, lastMatch.current_division || 0);

                if (lastMatch.previous_league !== lastMatch.current_league || lastMatch.previous_division !== lastMatch.current_division) {
                    const rankChange = lastMatch.current_league > lastMatch.previous_league ||
                                      (lastMatch.current_league === lastMatch.previous_league && lastMatch.current_division > lastMatch.previous_division)
                                      ? '📈 PROMOTED' : '📉 DEMOTED';

                    embed.addFields({
                        name: '🏆 Rank Change',
                        value: `${prevRank} → ${currentRank}\n${rankChange}`,
                        inline: false
                    });
                }
            }

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Error in lastgame command:', error);
            await interaction.editReply('❌ An error occurred while fetching the game data. Please try again later.');
        }

    } else if (commandName === 'rank') {
        const username = interaction.options.getString('username')!;
        const platform = interaction.options.getString('platform') as 'steam' | 'playstation' | 'xbox' | null;
        await interaction.deferReply();

        try {
            let result: RematchPlayerWithHistory | null;

            if (platform) {
                console.log(`🔍 Looking up player: ${username} on ${platform}`);
                result = await rematchAPI.searchUserByPlatform(username, platform);
            } else {
                console.log(`🔍 Looking up player: ${username}`);
                result = await rematchAPI.searchUserMultiPlatform(username);
            }

            if (!result) {
                const errorMessage = platform
                    ? `❌ Could not find player **${username}** on **${platform.charAt(0).toUpperCase() + platform.slice(1)}**. Make sure the username is correct for that platform.`
                    : `❌ Could not find player **${username}**. Make sure the username is correct.`;
                await interaction.editReply(errorMessage);
                return;
            }

            const { player: playerData } = result;

            const embed = new EmbedBuilder()
                .setTitle(`👤 ${playerData.displayName || playerData.username}`)
                .setURL(`https://rematchtracker.com/player/${playerData.platform}/${playerData.id}`)
                .setColor(0x0099ff)
                .setFooter({ text: 'Rematch Bot • Data from RematchTracker.com' });

            if (playerData.avatarUrl) {
                embed.setThumbnail(playerData.avatarUrl);
            }

            // Basic info
            embed.addFields({
                name: '🏆 Rank (5v5)',
                value: rematchAPI.formatRank(playerData),
                inline: true
                
            });

            // Add 3v3 rank if available
            if (playerData.rank3v3) {
                embed.addFields({
                    name: '⚽ Rank (3v3)',
                    value: rematchAPI.formatRank3v3(playerData),
                    inline: true
                });
            }

            if (playerData.position) {
                embed.addFields({
                    name: '⚽ Position',
                    value: playerData.position.charAt(0).toUpperCase() + playerData.position.slice(1),
                    inline: true
                });
            }

            if (playerData.jerseyNumber) {
                embed.addFields({
                    name: '👕 Jersey #',
                    value: playerData.jerseyNumber.toString(),
                    inline: true
                });
            }

            if (playerData.country) {
                embed.addFields({
                    name: '🌍 Country',
                    value: playerData.country,
                    inline: true
                });
            }

            if (playerData.platform) {
                embed.addFields({
                    name: '🎮 Platform',
                    value: playerData.platform.charAt(0).toUpperCase() + playerData.platform.slice(1),
                    inline: true
                });
            }

            // Team info
            if (playerData.currentTeam) {
                embed.addFields({
                    name: `${playerData.currentTeam.isCaptain ? '👑 Team (Captain)' : '⚽ Team'}`,
                    value: `${playerData.currentTeam.name} (${playerData.currentTeam.tag})`,
                    inline: true
                });
            }

            // Stats
            const stats = playerData.stats;
            if (stats.games > 0) {
                embed.addFields({
                    name: '📊 Statistics',
                    value:
                        `**Games:** ${stats.games}\n` +
                        `**Goals:** ${stats.goals}\n` +
                        `**Assists:** ${stats.assists}\n` +
                        `**MVPs:** ${stats.mvps}\n` +
                        `**Win Rate:** ${(stats.winRate * 100).toFixed(1)}%`,
                    inline: false
                });
            }

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Error in rank command:', error);
            await interaction.editReply('❌ An error occurred while fetching the player data. Please try again later.');
        }
    }
});

// Error handling
client.on('error', (error) => {
    console.error('Discord client error:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

if (!process.env.DISCORD_TOKEN) {
    console.error('❌ DISCORD_TOKEN is required in environment variables');
    process.exit(1);
}

client.login(process.env.DISCORD_TOKEN);