

export type LandlordProfile = {
  firstName: string;
  lastName: string;
  email: string;
  mobile: string;
  bio: string;
  avatar: string;
};

export type LandlordAlerts = {
  reviewPush: boolean;
  reportPush: boolean;
  violationPush: boolean;
  listingPush: boolean;
  systemPush: boolean;
  permitPush: boolean;
  digest: string;
  quietStart: string;
  quietEnd: string;
  quietEnabled: boolean;
};

export type LandlordBusiness = {
  businessName: string;
  taxId: string;
  businessType: string;
  yearsActive: string;
};

export type SecurityDevice = {
  id: number;
  name: string;
  location: string;
  lastActive: string;
  current: boolean;
};

export type LandlordSecurity = {
  twoFactor: boolean;
  twoFactorMethod: string;
  loginAlerts: boolean;
  sessionTimeout: string;
  trustedDevices: boolean;
  activeDevices: SecurityDevice[];
  passwordLastChanged: string;
  recoveryEmail: string;
  recoveryMobile: string;
  dataSharing: boolean;
  analyticsConsent: boolean;
  profileIndexing: boolean;
};
