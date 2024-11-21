import { Injectable } from "@nestjs/common";
import { ConfigService } from "../../config/config.service";
import { OAuthCallbackDto } from "../dto/oauthCallback.dto";
import { OAuthSignInDto } from "../dto/oauthSignIn.dto";
import { ErrorPageException } from "../exceptions/errorPage.exception";
import { OAuthProvider, OAuthToken } from "./oauthProvider.interface";
@Injectable()
export class NWCDProvider implements OAuthProvider<NWCDToken> {
  constructor(private config: ConfigService) {}
  getAuthEndpoint(state: string): Promise<string> {
    return Promise.resolve(
      "https://sso.nwcdcloud.cn/oauth/authorize?" +
        new URLSearchParams({
          response_type: "code",
          client_id: this.config.get("oauth.nwcd-clientId"),
          redirect_uri: 
            this.config.get("general.appUrl") + "/api/oauth/callback/nwcd",
          state: state,
        }).toString()
    );
  }
  async getToken(query: OAuthCallbackDto): Promise<OAuthToken<NWCDToken>> {
    const res = await fetch("https://sso.nwcdcloud.cn/oauth/access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        grant_type: "authorization_code",
        code: query.code,
        redirect_uri: this.config.get("general.appUrl") + "/api/oauth/callback/nwcd",
        client_id: this.config.get("oauth.nwcd-clientId"),
        client_secret: this.config.get("oauth.nwcd-clientSecret")
      })
    });
    const token = await res.json() as NWCDToken;
    return {
      accessToken: token.access_token,
      tokenType: token.token_type,
      scope: token.scope,
      rawToken: token
    };
  }
  async getUserInfo(token: OAuthToken<NWCDToken>): Promise<OAuthSignInDto> {
    const user = await this.getNWCDUser(token);
    if (!user.email) {
      throw new ErrorPageException("no_email", undefined, ["provider_nwcd"]);
    }
    return {
      provider: "nwcd",
      providerId: user._id,
      providerUsername: user.name,
      email: user.email
    };
  }
  async logout(token: OAuthToken<NWCDToken>): Promise<void> {
    const res = await fetch("https://sso.nwcdcloud.cn/api/auth/logout", {
      method: "POST",
      headers: {
        Authorization: `${token.tokenType} ${token.accessToken}`
      }
    });
    const response = await res.json() as NWCDLogoutResponse;
    
    // 检查注销是否成功
    if (response.error_code !== 20000 && response.error_code !== 20004) {
      throw new Error(`Logout failed: ${response.message}`);
    }
  }
  private async getNWCDUser(token: OAuthToken<NWCDToken>): Promise<NWCDUser> {
    const res = await fetch("https://sso.nwcdcloud.cn/api/user", {
      headers: {
        Authorization: `${token.tokenType} ${token.accessToken}`
      }
    });
    return await res.json() as NWCDUser;
  }
}
interface NWCDToken {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
}
interface NWCDUser {
  _id: string;
  email: string;
  name: string;
  username: string;
  groups: Array<{
    _id: string;
    name: string;
  }>;
  permissions: string[];
}
interface NWCDLogoutResponse {
  error_code: number;
  message: string;
}

