import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import KcAdminClient from '@keycloak/keycloak-admin-client';
import { KeycloakUserInfo, RegisterRequest } from '@openmaas/types';

@Injectable()
export class KeycloakService implements OnModuleInit {
  private readonly logger = new Logger(KeycloakService.name);
  private kcAdminClient: KcAdminClient;
  private realm: string;

  constructor(private configService: ConfigService) {
    this.kcAdminClient = new KcAdminClient({
      baseUrl: this.configService.get<string>('keycloak.baseUrl'),
      realmName: 'master',
    });
    this.realm = this.configService.get<string>('keycloak.realm') || 'openmaas';
  }

  async onModuleInit() {
    try {
      await this.authenticate();
      await this.ensureRealmExists();
      await this.ensureClientExists();
      this.logger.log('Keycloak service initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Keycloak service', error);
      throw error;
    }
  }

  private async authenticate() {
    const credentials = {
      grantType: 'password' as const,
      clientId: 'admin-cli',
      username: this.configService.get<string>('keycloak.adminUsername') || 'admin',
      password: this.configService.get<string>('keycloak.adminPassword') || 'admin',
    };

    await this.kcAdminClient.auth(credentials);

    // Set up auto-refresh
    setInterval(() => {
      this.kcAdminClient.auth(credentials).catch((error) => {
        this.logger.error('Failed to refresh Keycloak token', error);
      });
    }, 58 * 1000); // Refresh every 58 seconds
  }

  private async ensureRealmExists() {
    try {
      await this.kcAdminClient.realms.findOne({ realm: this.realm });
    } catch (error) {
      // Realm doesn't exist, create it
      await this.kcAdminClient.realms.create({
        id: this.realm,
        realm: this.realm,
        enabled: true,
        displayName: 'OpenMaaS',
        sslRequired: 'external',
        registrationAllowed: true,
        loginWithEmailAllowed: true,
        duplicateEmailsAllowed: false,
        resetPasswordAllowed: true,
        editUsernameAllowed: false,
        bruteForceProtected: true,
      });
      this.logger.log(`Created realm: ${this.realm}`);
    }
  }

  private async ensureClientExists() {
    const clientId = this.configService.get<string>('keycloak.clientId') || 'openmaas-backend';

    try {
      const clients = await this.kcAdminClient.clients.find({
        realm: this.realm,
        clientId,
      });

      if (clients.length === 0) {
        await this.kcAdminClient.clients.create({
          realm: this.realm,
          clientId,
          enabled: true,
          publicClient: false,
          directAccessGrantsEnabled: true,
          serviceAccountsEnabled: true,
          authorizationServicesEnabled: true,
          standardFlowEnabled: true,
          implicitFlowEnabled: false,
          protocol: 'openid-connect',
          secret: this.configService.get<string>('keycloak.clientSecret'),
          redirectUris: ['http://localhost:3000/*', 'http://localhost:3001/*'],
          webOrigins: ['http://localhost:3000', 'http://localhost:3001'],
        });
        this.logger.log(`Created client: ${clientId}`);
      }
    } catch (error) {
      this.logger.error('Failed to ensure client exists', error);
      throw error;
    }
  }

  async createUser(registerData: RegisterRequest): Promise<{ id: string }> {
    try {
      const { email, password, firstName, lastName, phone } = registerData;

      const user = await this.kcAdminClient.users.create({
        realm: this.realm,
        username: email,
        email,
        firstName,
        lastName,
        enabled: true,
        emailVerified: false,
        attributes: {
          phone: phone ? [phone] : undefined,
        },
      });

      if (user.id) {
        // Set password
        await this.kcAdminClient.users.resetPassword({
          realm: this.realm,
          id: user.id,
          credential: {
            type: 'password',
            value: password,
            temporary: false,
          },
        });

        // Assign default role
        await this.assignUserRole(user.id, 'user');
      }

      return { id: user.id || '' };
    } catch (error) {
      this.logger.error('Failed to create user', error);
      throw error;
    }
  }

  async validateUser(email: string, password: string): Promise<KeycloakUserInfo | null> {
    try {
      await this.kcAdminClient.auth({
        grantType: 'password',
        clientId: this.configService.get<string>('keycloak.clientId') || 'openmaas-backend',
        clientSecret: this.configService.get<string>('keycloak.clientSecret'),
        username: email,
        password,
        scopes: ['openid'],
      });

      if (this.kcAdminClient.accessToken) {
        // Get user info
        const users = await this.kcAdminClient.users.find({
          realm: this.realm,
          email,
          exact: true,
        });

        if (users.length > 0) {
          const user = users[0];
          return {
            sub: user.id || '',
            email_verified: user.emailVerified || false,
            preferred_username: user.username,
            given_name: user.firstName,
            family_name: user.lastName,
            email: user.email,
          };
        }
      }
    } catch (error) {
      this.logger.error('Failed to validate user', error);
    }

    return null;
  }

  async getUserById(userId: string): Promise<KeycloakUserInfo | null> {
    try {
      const user = await this.kcAdminClient.users.findOne({
        realm: this.realm,
        id: userId,
      });

      if (user) {
        return {
          sub: user.id || '',
          email_verified: user.emailVerified || false,
          preferred_username: user.username,
          given_name: user.firstName,
          family_name: user.lastName,
          email: user.email,
        };
      }
    } catch (error) {
      this.logger.error('Failed to get user by ID', error);
    }

    return null;
  }

  async getUserRoles(userId: string): Promise<string[]> {
    try {
      const roles = await this.kcAdminClient.users.listRealmRoleMappings({
        realm: this.realm,
        id: userId,
      });

      return roles.map((role) => role.name || '').filter(Boolean);
    } catch (error) {
      this.logger.error('Failed to get user roles', error);
      return [];
    }
  }

  async assignUserRole(userId: string, roleName: string): Promise<void> {
    try {
      // Ensure role exists
      let role;
      try {
        role = await this.kcAdminClient.roles.findOneByName({
          realm: this.realm,
          name: roleName,
        });
      } catch (error) {
        // Role doesn't exist, create it
        await this.kcAdminClient.roles.create({
          realm: this.realm,
          name: roleName,
        });

        role = await this.kcAdminClient.roles.findOneByName({
          realm: this.realm,
          name: roleName,
        });
      }

      if (role && role.id && role.name) {
        await this.kcAdminClient.users.addRealmRoleMappings({
          realm: this.realm,
          id: userId,
          roles: [{ id: role.id, name: role.name }],
        });
      }
    } catch (error) {
      this.logger.error('Failed to assign user role', error);
      throw error;
    }
  }

  async deleteUser(userId: string): Promise<void> {
    try {
      await this.kcAdminClient.users.del({
        realm: this.realm,
        id: userId,
      });
    } catch (error) {
      this.logger.error('Failed to delete user', error);
      throw error;
    }
  }

  async updateUserPassword(userId: string, newPassword: string): Promise<void> {
    try {
      await this.kcAdminClient.users.resetPassword({
        realm: this.realm,
        id: userId,
        credential: {
          type: 'password',
          value: newPassword,
          temporary: false,
        },
      });
    } catch (error) {
      this.logger.error('Failed to update user password', error);
      throw error;
    }
  }

  async getUserAttribute(userId: string, attributeName: string): Promise<string | undefined> {
    try {
      const user = await this.kcAdminClient.users.findOne({
        realm: this.realm,
        id: userId,
      });
      
      if (user.attributes && user.attributes[attributeName]) {
        return Array.isArray(user.attributes[attributeName])
          ? user.attributes[attributeName][0]
          : user.attributes[attributeName];
      }
      
      return undefined;
    } catch (error) {
      this.logger.error('Failed to get user attribute', error);
      return undefined;
    }
  }

  async setUserAttribute(userId: string, attributeName: string, value: string): Promise<void> {
    try {
      const user = await this.kcAdminClient.users.findOne({
        realm: this.realm,
        id: userId,
      });
      
      const attributes = user.attributes || {};
      attributes[attributeName] = value ? [value] : [];
      
      await this.kcAdminClient.users.update(
        {
          realm: this.realm,
          id: userId,
        },
        {
          attributes,
        },
      );
    } catch (error) {
      this.logger.error('Failed to set user attribute', error);
      throw error;
    }
  }
}
