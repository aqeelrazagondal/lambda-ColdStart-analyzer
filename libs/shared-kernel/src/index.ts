export type OrgRole = 'owner' | 'admin' | 'viewer';

export interface User {
  id: string;
  email: string;
  name?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Organization {
  id: string;
  name: string;
  createdAt: string;
}

export interface AwsAccountConnection {
  id: string;
  orgId: string;
  awsAccountId: string;
  roleArn: string;
  externalId: string;
  defaultRegion?: string;
  connectedAt?: string;
}
