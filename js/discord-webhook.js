/**
 * ═══════════════════════════════════════════════════════════════════════════
 * NIGHTCLUB GAME - DISCORD WEBHOOK SYSTEM
 * ═══════════════════════════════════════════════════════════════════════════
 * Sends detailed notifications to Discord when updates are pushed
 * ═══════════════════════════════════════════════════════════════════════════
 */

const DISCORD_WEBHOOK = 'https://discord.com/api/webhooks/1444255570763841626/BaF_Rncq0y3is0Je9V4VMOG59hR4TbHvQCJ9Evmv-2qP_ICpSjieCVLbukfyFL2fdSmu';

/**
 * Send update notification to Discord
 */
async function sendUpdateNotification(versionInfo) {
    const {
        version = 'Unknown',
        build = 'Unknown',
        releaseDate = new Date().toISOString().split('T')[0],
        changelog = [],
        environment = 'production'
    } = versionInfo;

    const embed = {
        title: '🚀 Hypeclub Update Deployed!',
        description: `A new version of **Hypeclub** has been pushed to ${environment}.`,
        color: 0x8B5CF6, // Purple color
        fields: [
            {
                name: '📦 Version',
                value: `\`${version}\``,
                inline: true
            },
            {
                name: '🔧 Build',
                value: `\`${build}\``,
                inline: true
            },
            {
                name: '📅 Release Date',
                value: releaseDate,
                inline: true
            },
            {
                name: '🌐 Environment',
                value: environment.charAt(0).toUpperCase() + environment.slice(1),
                inline: true
            },
            {
                name: '🔗 Live URL',
                value: '[hypeclub.city](https://hypeclub.city)',
                inline: true
            },
            {
                name: '⏰ Deployed At',
                value: `<t:${Math.floor(Date.now() / 1000)}:F>`,
                inline: true
            }
        ],
        thumbnail: {
            url: 'https://cdn-icons-png.flaticon.com/512/3418/3418886.png' // Nightclub icon
        },
        footer: {
            text: 'Hypeclub Auto-Deploy System',
            icon_url: 'https://cdn-icons-png.flaticon.com/512/2111/2111370.png'
        },
        timestamp: new Date().toISOString()
    };

    // Add changelog if present
    if (changelog && changelog.length > 0) {
        embed.fields.push({
            name: '📝 Changelog',
            value: changelog.map(item => `• ${item}`).join('\n').substring(0, 1024),
            inline: false
        });
    }

    const payload = {
        username: 'Hypeclub Deploy Bot',
        avatar_url: 'https://cdn-icons-png.flaticon.com/512/3418/3418886.png',
        embeds: [embed]
    };

    try {
        const response = await fetch(DISCORD_WEBHOOK, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            console.log('✅ Discord webhook sent successfully');
            return true;
        } else {
            console.error('❌ Discord webhook failed:', response.status, await response.text());
            return false;
        }
    } catch (error) {
        console.error('❌ Discord webhook error:', error.message);
        return false;
    }
}

/**
 * Send error/alert notification to Discord
 */
async function sendAlertNotification(alertInfo) {
    const {
        title = 'Alert',
        message = 'An alert was triggered',
        type = 'warning', // warning, error, info
        details = {}
    } = alertInfo;

    const colors = {
        warning: 0xFFA500,  // Orange
        error: 0xEF4444,    // Red
        info: 0x3B82F6,     // Blue
        success: 0x22C55E   // Green
    };

    const icons = {
        warning: '⚠️',
        error: '🚨',
        info: 'ℹ️',
        success: '✅'
    };

    const embed = {
        title: `${icons[type] || '📢'} ${title}`,
        description: message,
        color: colors[type] || colors.info,
        fields: Object.entries(details).map(([key, value]) => ({
            name: key,
            value: String(value).substring(0, 1024),
            inline: true
        })),
        footer: {
            text: 'Hypeclub Alert System'
        },
        timestamp: new Date().toISOString()
    };

    const payload = {
        username: 'Hypeclub Alert Bot',
        avatar_url: 'https://cdn-icons-png.flaticon.com/512/1680/1680012.png',
        embeds: [embed]
    };

    try {
        const response = await fetch(DISCORD_WEBHOOK, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        return response.ok;
    } catch (error) {
        console.error('❌ Discord alert error:', error.message);
        return false;
    }
}

/**
 * Send anti-cheat violation notification to Discord
 */
async function sendViolationNotification(violationInfo) {
    const {
        playerName = 'Unknown',
        odeum = 'Unknown',
        violationType = 'Unknown',
        details = '',
        ipAddress = 'Unknown',
        deviceFingerprint = 'Unknown',
        gameState = {}
    } = violationInfo;

    const embed = {
        title: '🚨 Anti-Cheat Violation Detected!',
        description: `A player has triggered the anti-cheat system.`,
        color: 0xEF4444, // Red
        fields: [
            {
                name: '👤 Player',
                value: `${playerName}\n\`${odeum}\``,
                inline: true
            },
            {
                name: '⚠️ Violation Type',
                value: `\`${violationType}\``,
                inline: true
            },
            {
                name: '🌐 IP Address',
                value: `\`${ipAddress}\``,
                inline: true
            },
            {
                name: '🔐 Device',
                value: `\`${deviceFingerprint.substring(0, 20)}...\``,
                inline: true
            },
            {
                name: '💰 Cash',
                value: `$${(gameState.cash || 0).toLocaleString()}`,
                inline: true
            },
            {
                name: '💎 Diamonds',
                value: String(gameState.diamonds || 0),
                inline: true
            },
            {
                name: '📋 Details',
                value: details.substring(0, 1024) || 'No details',
                inline: false
            }
        ],
        footer: {
            text: 'Hypeclub Anti-Cheat System'
        },
        timestamp: new Date().toISOString()
    };

    const payload = {
        username: 'Hypeclub Anti-Cheat',
        avatar_url: 'https://cdn-icons-png.flaticon.com/512/6195/6195678.png',
        embeds: [embed]
    };

    try {
        const response = await fetch(DISCORD_WEBHOOK, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        return response.ok;
    } catch (error) {
        console.error('❌ Discord violation notification error:', error.message);
        return false;
    }
}

// Export for Node.js (server-side)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        sendUpdateNotification,
        sendAlertNotification,
        sendViolationNotification,
        DISCORD_WEBHOOK
    };
}

// Export for browser (client-side)
if (typeof window !== 'undefined') {
    window.DiscordWebhook = {
        sendUpdateNotification,
        sendAlertNotification,
        sendViolationNotification
    };
}
