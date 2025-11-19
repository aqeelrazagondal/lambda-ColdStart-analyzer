import { SetMetadata } from '@nestjs/common';

export const ORG_ROLES_KEY = 'orgRolesAllowed';
export type OrgAllowedRole = 'owner' | 'admin';

export const RolesAllowed = (...roles: OrgAllowedRole[]) => SetMetadata(ORG_ROLES_KEY, roles);
