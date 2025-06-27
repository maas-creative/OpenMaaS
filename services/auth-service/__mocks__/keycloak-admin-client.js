const mockKeycloakAdminClient = jest.fn().mockImplementation(() => ({
  auth: jest.fn().mockResolvedValue({}),
  users: {
    find: jest.fn().mockResolvedValue([]),
    create: jest.fn().mockResolvedValue({ id: 'mock-user-id' }),
    update: jest.fn().mockResolvedValue({}),
    del: jest.fn().mockResolvedValue({}),
    findOne: jest.fn().mockResolvedValue({
      id: 'mock-user-id',
      username: 'test@example.com',
      email: 'test@example.com',
      enabled: true,
    }),
  },
  realms: {
    findOne: jest.fn().mockResolvedValue({ realm: 'openmaas' }),
  },
  setConfig: jest.fn(),
}));

module.exports = mockKeycloakAdminClient;
module.exports.default = mockKeycloakAdminClient;