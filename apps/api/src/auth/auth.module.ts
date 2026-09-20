import { Module, OnModuleInit } from '@nestjs/common';
import { PersistenceModule } from '../persistence/persistence.module';
import { AuthOAuthController } from './auth-oauth.controller';
import { AuthOAuthService } from './auth-oauth.service';
import { OAuthStateStore } from './oauth-state.store';
import { UniPortalClient } from './uniportal.client';

@Module({
  imports: [PersistenceModule],
  controllers: [AuthOAuthController],
  providers: [AuthOAuthService, OAuthStateStore, UniPortalClient],
  exports: [AuthOAuthService],
})
export class AuthModule implements OnModuleInit {
  constructor(private readonly oauth: AuthOAuthService) {}

  /** 启动即自检并打日志：配错了不用等真人来点登录才暴露 */
  onModuleInit(): void {
    this.oauth.logStartupCheck();
  }
}
