import { Body, Controller, Delete, Get, Injectable, Module, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RoleName } from '@prisma/client';
import { IsArray, IsBoolean, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

const SECTIONS = ['biblioteca', 'voz', 'tendencia', 'galeria', 'articulo'];

class ContentDto {
  @IsIn(SECTIONS) section: string;
  @IsString() @MaxLength(140) title: string;
  @IsOptional() @IsString() @MaxLength(600) description?: string;
  @IsOptional() @IsString() mediaUrl?: string;
  @IsOptional() @IsString() thumbnailUrl?: string;
  @IsOptional() @IsString() author?: string;
  @IsOptional() @IsString() durationLabel?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) tags?: string[];
}
class PostDto {
  @IsString() @MaxLength(1000) body: string;
  @IsOptional() @IsBoolean() anonymous?: boolean;
  @IsOptional() @IsIn(['post', 'pregunta']) type?: string;
}
class ModerateDto {
  @IsIn(['approved', 'hidden']) status: string;
}

@Injectable()
export class CommunityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  // ── Editorial ──
  listContent(section?: string) {
    return this.prisma.communityContent.findMany({
      where: { active: true, ...(section ? { section } : {}) },
      orderBy: { createdAt: 'desc' },
    });
  }
  createContent(dto: ContentDto) {
    return this.prisma.communityContent.create({ data: { ...dto, tags: dto.tags ?? [] } });
  }
  removeContent(id: string) {
    return this.prisma.communityContent.update({ where: { id }, data: { active: false } });
  }

  // ── Feed ──
  async listPosts(userId: string) {
    const posts = await this.prisma.communityPost.findMany({
      where: { status: 'approved' },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { user: { select: { profile: { select: { firstName: true } } } } },
    });
    const myLikes = await this.prisma.communityLike.findMany({ where: { userId, postId: { in: posts.map((p) => p.id) } } });
    const liked = new Set(myLikes.map((l) => l.postId));
    return posts.map((p) => ({
      id: p.id, type: p.type, body: p.body, likes: p.likes, createdAt: p.createdAt,
      author: p.anonymous ? 'Anónimo' : (p.user.profile?.firstName ?? 'Afiliado'),
      likedByMe: liked.has(p.id),
    }));
  }
  createPost(userId: string, dto: PostDto) {
    return this.prisma.communityPost.create({
      data: { userId, body: dto.body, anonymous: dto.anonymous ?? false, type: dto.type ?? 'post' },
    });
  }
  async toggleLike(userId: string, postId: string) {
    const existing = await this.prisma.communityLike.findUnique({ where: { userId_postId: { userId, postId } } });
    if (existing) {
      await this.prisma.communityLike.delete({ where: { userId_postId: { userId, postId } } });
      const p = await this.prisma.communityPost.update({ where: { id: postId }, data: { likes: { decrement: 1 } } });
      return { liked: false, likes: Math.max(0, p.likes) };
    }
    await this.prisma.communityLike.create({ data: { userId, postId } });
    const p = await this.prisma.communityPost.update({ where: { id: postId }, data: { likes: { increment: 1 } } });
    return { liked: true, likes: p.likes };
  }

  // ── Moderación (admin) ──
  async allPosts() {
    const posts = await this.prisma.communityPost.findMany({
      orderBy: { createdAt: 'desc' }, take: 100,
      include: { user: { select: { email: true, profile: { select: { firstName: true, lastName: true } } } } },
    });
    return posts.map((p) => ({
      id: p.id, body: p.body, status: p.status, likes: p.likes, anonymous: p.anonymous, createdAt: p.createdAt,
      author: p.user.profile ? `${p.user.profile.firstName} ${p.user.profile.lastName}` : p.user.email,
    }));
  }
  async moderate(id: string, status: string, actorId: string) {
    await this.prisma.communityPost.update({ where: { id }, data: { status } });
    await this.audit.log({ actorId, action: 'community.post.moderated', resource: `CommunityPost:${id}`, metadata: { status } });
    return { success: true };
  }
}

@ApiTags('community')
@Controller('community')
export class CommunityController {
  constructor(private readonly community: CommunityService) {}

  @Public()
  @Get('content')
  content(@Query('section') section?: string) {
    return this.community.listContent(section);
  }
  @Get('posts')
  posts(@CurrentUser('id') userId: string) {
    return this.community.listPosts(userId);
  }
  @Post('posts')
  createPost(@CurrentUser('id') userId: string, @Body() dto: PostDto) {
    return this.community.createPost(userId, dto);
  }
  @Post('posts/:id/like')
  like(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.community.toggleLike(userId, id);
  }
}

@ApiTags('community-admin')
@Controller('admin/community')
@Roles(RoleName.EPS_ADMIN, RoleName.SUPERADMIN)
export class CommunityAdminController {
  constructor(private readonly community: CommunityService) {}

  @Post('content')
  create(@Body() dto: ContentDto) {
    return this.community.createContent(dto);
  }
  @Delete('content/:id')
  remove(@Param('id') id: string) {
    return this.community.removeContent(id);
  }
  @Get('posts')
  posts() {
    return this.community.allPosts();
  }
  @Patch('posts/:id')
  moderate(@CurrentUser('id') actorId: string, @Param('id') id: string, @Body() dto: ModerateDto) {
    return this.community.moderate(id, dto.status, actorId);
  }
}

@Module({
  controllers: [CommunityController, CommunityAdminController],
  providers: [CommunityService],
})
export class CommunityModule {}
