export class StringUtils {
  static generateRandomString(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  static slugify(text: string): string {
    return text
      .toString()
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^\w\-]+/g, '')
      .replace(/\-\-+/g, '-')
      .replace(/^-+/, '')
      .replace(/-+$/, '');
  }

  static truncate(text: string, maxLength: number, suffix: string = '...'): string {
    if (text.length <= maxLength) {
      return text;
    }
    return text.substring(0, maxLength - suffix.length) + suffix;
  }

  static maskEmail(email: string): string {
    const [localPart, domain] = email.split('@');
    if (localPart.length <= 3) {
      return `${localPart[0]}***@${domain}`;
    }
    return `${localPart.substring(0, 2)}***@${domain}`;
  }

  static maskPhone(phone: string): string {
    if (phone.length < 7) {
      return phone;
    }
    const visibleStart = 3;
    const visibleEnd = 4;
    const masked = phone.substring(0, visibleStart) + 
                  '****' + 
                  phone.substring(phone.length - visibleEnd);
    return masked;
  }
}