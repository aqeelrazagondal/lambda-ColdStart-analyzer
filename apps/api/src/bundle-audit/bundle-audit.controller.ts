import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import { BundleAuditService } from './bundle-audit.service';
import { OrgMemberGuard } from '../orgs/guards/org-member.guard';
import { OrgRoleGuard } from '../orgs/guards/org-role.guard';
import { RolesAllowed } from '../orgs/decorators/roles.decorator';
import { Express } from 'express';

const uploadDir = process.env.BUNDLE_AUDIT_UPLOAD_DIR || path.join('/tmp', 'lca-bundle-uploads');

function ensureUploadDir() {
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
}

ensureUploadDir();

const maxFileSizeBytes =
  Number(process.env.BUNDLE_AUDIT_MAX_SIZE_MB || 0) * 1024 * 1024 ||
  Number(process.env.BUNDLE_AUDIT_MAX_UPLOAD_BYTES || 0) ||
  20 * 1024 * 1024;
const maxFileSize = Math.max(1, maxFileSizeBytes);

@UseGuards(AuthGuard('jwt'))
@Controller('orgs/:orgId/functions/:functionId/bundles')
export class BundleAuditController {
  constructor(private readonly svc: BundleAuditService) {}

  @Post()
  @RolesAllowed('owner', 'admin')
  @UseGuards(OrgRoleGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => cb(null, uploadDir),
        filename: (_req, file, cb) => {
          const safe = file.originalname.replace(/[^\w.\-]/g, '_');
          const ext = path.extname(safe) || '.zip';
          cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`);
        },
      }),
      limits: { fileSize: maxFileSize },
      fileFilter: (_req, file, cb) => {
        const allowed =
          file.mimetype === 'application/zip' ||
          file.mimetype === 'application/x-zip-compressed' ||
          file.originalname.toLowerCase().endsWith('.zip');
        if (!allowed) {
          return cb(new BadRequestException('Only .zip archives are accepted'), false);
        }
        cb(null, true);
      },
    })
  )
  async upload(
    @Param('orgId') orgId: string,
    @Param('functionId') functionId: string,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any
  ) {
    if (!file) throw new BadRequestException('File is required');
    const userId = req.user?.userId as string | undefined;
    return this.svc.createUpload({
      orgId,
      functionId,
      userId,
      file,
    });
  }

  @Get()
  @UseGuards(OrgMemberGuard)
  async list(
    @Param('orgId') orgId: string,
    @Param('functionId') functionId: string,
    @Query('limit') limit?: string
  ) {
    return this.svc.listUploads(orgId, functionId, Number(limit) || 10);
  }

  @Get('latest')
  @UseGuards(OrgMemberGuard)
  async latest(@Param('orgId') orgId: string, @Param('functionId') functionId: string) {
    return this.svc.getLatestInsight(orgId, functionId);
  }
}
