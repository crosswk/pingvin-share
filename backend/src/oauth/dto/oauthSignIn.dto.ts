export interface OAuthSignInDto {
  provider: "github" | "google" | "microsoft" | "discord" | "oidc" | "nwcd";
  providerId: string;
  providerUsername: string;
  email: string;
  isAdmin?: boolean;
  idToken?: string;
}
