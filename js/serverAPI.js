// Client-Side API Wrapper for Server Validation
// This module communicates with the server-side validation endpoints

import { authSystem } from './auth.js';
import { ui } from './ui.js';

class ServerAPI {
    constructor() {
        // Auto-detect environment and set API base URL
        const isLocalhost = window.location.hostname === 'localhost' ||
            window.location.hostname === '127.0.0.1';

        // TODO: Replace 'YOUR-RAILWAY-URL' with your actual Railway domain after deployment
        // Example: 'https://nightclub-production.up.railway.app'
        const productionURL = 'https://nightclub-production-bbcf.up.railway.app';  // ← UPDATE THIS AFTER DEPLOYING TO RAILWAY

        this.baseURL = isLocalhost
            ? 'http://localhost:3000'          // Local development
            : productionURL;                    // Production (Railway)

        this.enabled = true; // Set to false to disable validation (fallback mode)
        this.pendingRequests = new Map();

        console.log(`🔗 Server API configured: ${this.baseURL}`);
    }

    /**
     * Get Firebase auth token for API requests
     */
    async getAuthToken() {
        if (!authSystem.user) {
            throw new Error('User not authenticated');
        }

        try {
            const token = await authSystem.user.getIdToken();
            return token;
        } catch (error) {
            console.error('Failed to get auth token:', error);
            throw error;
        }
    }

    /**
     * Make authenticated API request
     */
    async request(endpoint, method = 'GET', body = null) {
        if (!this.enabled) {
            throw new Error('Server validation disabled');
        }

        try {
            const token = await this.getAuthToken();

            const options = {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            }

            if (body && (method === 'POST' || method === 'PUT')) {
                options.body = JSON.stringify(body);
            }

            const fullURL = `${this.baseURL}${endpoint}`;
            console.log(`📡 API Request: ${method} ${fullURL}`);

            const response = await fetch(fullURL, options);

            console.log(`📡 API Response: ${response.status} ${response.statusText}`);

            const data = await response.json();

            if (!response.ok) {
                console.error('❌ API Error Response:', data);

                // Handle specific error types
                if (data.error === 'RATE_LIMIT') {
                    ui.notify('⏱️ Please slow down!', 'warning');
                } else if (data.error === 'INSUFFICIENT_FUNDS') {
                    ui.notify(`💰 Not enough ${data.message}`, 'error');
                } else if (data.error === 'LEVEL_LOCKED') {
                    ui.notify(`🔒 Requires Level ${data.required} (You: Lv ${data.current})`, 'error');
                } else if (data.error === 'INVALID_ITEM') {
                    ui.notify('❌ Item not found', 'error');
                } else if (data.error === 'MAX_REACHED') {
                    ui.notify(`❌ ${data.message}`, 'error');
                } else if (data.error === 'UNAUTHORIZED') {
                    ui.notify('🔒 Please log in again', 'error');
                } else if (data.message) {
                    ui.notify(`❌ ${data.message}`, 'error');
                }

                throw new Error(data.message || 'Request failed');
            }

            return data;
        } catch (error) {
            console.error(`❌ API request failed (${endpoint}):`, error);
            console.error('Error details:', {
                message: error.message,
                stack: error.stack,
                endpoint,
                baseURL: this.baseURL
            });
            throw error;
        }
    }

    /**
     * Validate furniture or staff purchase
     */
    async validatePurchase(itemType, itemId, metadata = {}) {
        try {
            const result = await this.request('/api/game/validate-purchase', 'POST', {
                itemType,
                itemId,
                metadata
            });

            return result;
        } catch (error) {
            console.error('Purchase validation failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Validate earnings (cash, diamonds, XP)
     */
    async validateEarnings(currency, amount, reason) {
        try {
            const result = await this.request('/api/game/validate-earnings', 'POST', {
                currency,
                amount,
                reason
            });

            return result;
        } catch (error) {
            console.error('Earnings validation failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Validate level up
     */
    async validateLevelUp() {
        try {
            const result = await this.request('/api/game/validate-level-up', 'POST');
            return result;
        } catch (error) {
            console.error('Level-up validation failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Sync client state with server
     */
    async syncState(clientState) {
        try {
            const result = await this.request('/api/game/sync-state', 'POST', {
                clientState
            });

            return result;
        } catch (error) {
            console.error('State sync failed:', error);
            return {
                success: false,
                synced: false,
                error: error.message
            };
        }
    }

    /**
     * Get server-side player state
     */
    async getPlayerState() {
        try {
            const result = await this.request('/api/game/state', 'GET');
            return result;
        } catch (error) {
            console.error('Get player state failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Invalidate server-side cache
     */
    async invalidateCache() {
        try {
            const result = await this.request('/api/game/invalidate-cache', 'POST');
            return result;
        } catch (error) {
            console.error('Cache invalidation failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Batch validate multiple actions
     */
    async batchValidate(actions) {
        // Execute all validations in parallel
        const promises = actions.map(action => {
            switch (action.type) {
                case 'purchase':
                    return this.validatePurchase(action.itemType, action.itemId, action.metadata);
                case 'earnings':
                    return this.validateEarnings(action.currency, action.amount, action.reason);
                case 'levelUp':
                    return this.validateLevelUp();
                default:
                    return Promise.resolve({ success: false, error: 'Unknown action type' });
            }
        });

        try {
            const results = await Promise.all(promises);
            return {
                success: results.every(r => r.success),
                results
            };
        } catch (error) {
            console.error('Batch validation failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Enable server validation
     */
    enable() {
        this.enabled = true;
        console.log('✅ Server validation enabled');
    }

    /**
     * Disable server validation (fallback to client-side)
     */
    disable() {
        this.enabled = false;
        console.warn('⚠️ Server validation disabled - using client-side fallback');
    }

    /**
     * Check if server validation is available
     */
    async checkHealth() {
        try {
            const response = await fetch(`${this.baseURL}/api/game/state`);
            return response.ok;
        } catch (error) {
            return false;
        }
    }
}

export const serverAPI = new ServerAPI();

// Expose globally for debugging
window.serverAPI = serverAPI;
