/**
 * PII (Personally Identifiable Information) Redaction Utility
 * 
 * Provides functions to redact sensitive information from logs and data
 */

export class PiiRedactor {
  /**
   * Redact email addresses
   * Example: user@example.com -> u***@example.com
   */
  static redactEmail(email: string): string {
    if (!email || typeof email !== 'string') return email;
    const [local, domain] = email.split('@');
    if (!local || !domain) return email;
    const redactedLocal = local.length > 1 ? `${local[0]}***` : '***';
    return `${redactedLocal}@${domain}`;
  }

  /**
   * Redact passwords - always completely redact
   */
  static redactPassword(password: any): string {
    return '[REDACTED]';
  }

  /**
   * Redact IP addresses - mask last octet
   * Example: 192.168.1.100 -> 192.168.1.***
   */
  static redactIpAddress(ip: string): string {
    if (!ip || typeof ip !== 'string') return ip;
    // Handle IPv4
    const ipv4Match = ip.match(/^(\d{1,3}\.){3}\d{1,3}$/);
    if (ipv4Match) {
      const parts = ip.split('.');
      return `${parts.slice(0, 3).join('.')}.***`;
    }
    // Handle IPv6 - mask last segment
    const ipv6Match = ip.match(/^([0-9a-fA-F:]+):([0-9a-fA-F]+)$/);
    if (ipv6Match) {
      return `${ipv6Match[1]}:***`;
    }
    return '***';
  }

  /**
   * Redact AWS account IDs - show first 9 digits, mask rest
   * Example: 123456789012 -> 123456789***
   */
  static redactAwsAccountId(accountId: string): string {
    if (!accountId || typeof accountId !== 'string') return accountId;
    if (accountId.length >= 9) {
      return `${accountId.substring(0, 9)}***`;
    }
    return '***';
  }

  /**
   * Redact user IDs - hash instead of showing full ID
   */
  static redactUserId(userId: string): string {
    if (!userId || typeof userId !== 'string') return userId;
    // Simple hash for logging purposes
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return `user_${Math.abs(hash).toString(36)}`;
  }

  /**
   * Redact object recursively, applying redaction rules to known PII fields
   */
  static redactObject(obj: any, options: {
    redactEmails?: boolean;
    redactPasswords?: boolean;
    redactIpAddresses?: boolean;
    redactAwsAccountIds?: boolean;
    redactUserIds?: boolean;
  } = {}): any {
    const {
      redactEmails = true,
      redactPasswords = true,
      redactIpAddresses = true,
      redactAwsAccountIds = true,
      redactUserIds = false,
    } = options;

    if (obj === null || obj === undefined) {
      return obj;
    }

    if (typeof obj === 'string') {
      // Check if it's an email
      if (redactEmails && obj.includes('@') && obj.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
        return this.redactEmail(obj);
      }
      // Check if it's an IP address
      if (redactIpAddresses && (obj.match(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/) || obj.includes(':'))) {
        return this.redactIpAddress(obj);
      }
      // Check if it's an AWS account ID (12 digits)
      if (redactAwsAccountIds && /^\d{12}$/.test(obj)) {
        return this.redactAwsAccountId(obj);
      }
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.redactObject(item, options));
    }

    if (typeof obj === 'object') {
      const redacted: any = {};
      for (const [key, value] of Object.entries(obj)) {
        const lowerKey = key.toLowerCase();
        
        // Redact password fields
        if (redactPasswords && (lowerKey.includes('password') || lowerKey.includes('secret') || lowerKey === 'token')) {
          redacted[key] = this.redactPassword(value);
        }
        // Redact email fields
        else if (redactEmails && (lowerKey.includes('email') || lowerKey === 'email')) {
          redacted[key] = typeof value === 'string' ? this.redactEmail(value) : this.redactObject(value, options);
        }
        // Redact IP address fields
        else if (redactIpAddresses && (lowerKey.includes('ip') || lowerKey === 'ipaddress')) {
          redacted[key] = typeof value === 'string' ? this.redactIpAddress(value) : this.redactObject(value, options);
        }
        // Redact AWS account ID fields
        else if (redactAwsAccountIds && (lowerKey.includes('awsaccountid') || lowerKey === 'accountid')) {
          redacted[key] = typeof value === 'string' ? this.redactAwsAccountId(value) : this.redactObject(value, options);
        }
        // Redact user ID fields
        else if (redactUserIds && (lowerKey.includes('userid') || lowerKey === 'id' && typeof value === 'string')) {
          redacted[key] = typeof value === 'string' ? this.redactUserId(value) : this.redactObject(value, options);
        }
        // Recursively redact nested objects
        else {
          redacted[key] = this.redactObject(value, options);
        }
      }
      return redacted;
    }

    return obj;
  }

  /**
   * Redact query parameters
   */
  static redactQueryParams(query: any): any {
    return this.redactObject(query, {
      redactEmails: true,
      redactPasswords: true,
      redactIpAddresses: true,
      redactAwsAccountIds: true,
      redactUserIds: false,
    });
  }

  /**
   * Redact request headers
   */
  static redactHeaders(headers: any): any {
    const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key', 'x-auth-token'];
    const redacted = { ...headers };
    
    for (const header of sensitiveHeaders) {
      if (redacted[header]) {
        redacted[header] = '[REDACTED]';
      }
      // Also check case-insensitive
      const lowerHeader = header.toLowerCase();
      for (const key of Object.keys(redacted)) {
        if (key.toLowerCase() === lowerHeader) {
          redacted[key] = '[REDACTED]';
        }
      }
    }
    
    return this.redactObject(redacted, {
      redactEmails: true,
      redactIpAddresses: true,
      redactAwsAccountIds: false,
      redactUserIds: false,
      redactPasswords: false, // Already handled above
    });
  }
}

