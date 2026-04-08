import { Alert } from 'react-native';
import { BaseController } from '../core/BaseController';
import { RootController, DEFAULT_UA } from './RootController';
import { AuthService } from '../../service/auth/AuthService';
import { getOrCreateDeviceId } from '../../storage/SessionStore';

export type LoginStep = 'credentials' | 'otp';

export interface AuthState {
  phone: string;
  password: string;
  loginStep: LoginStep;
  otpPhone: string;
  otp: string;
  otpDeviceId: string;
  trustDevice: boolean;
  loading: boolean;
}

export class AuthController extends BaseController<AuthState> {
  private rootController: RootController;

  constructor(rootController: RootController) {
    super({
      phone: '',
      password: '',
      loginStep: 'credentials',
      otpPhone: '',
      otp: '',
      otpDeviceId: '',
      trustDevice: false,
      loading: false,
    });
    this.rootController = rootController;
  }

  public setPhone = (phone: string) => this.setState({ phone });
  public setPassword = (password: string) => this.setState({ password });
  public setOtp = (otp: string) => this.setState({ otp });
  public setTrustDevice = (trustDevice: boolean) => this.setState({ trustDevice });

  public setLoginStep = (loginStep: LoginStep) => {
    this.setState({ loginStep });
  };

  public async onLogin() {
    const { phone, password } = this.state;
    const baseUrl = this.rootController.getState().baseUrl.trim();

    if (!phone || !password) {
      return Alert.alert('Loi', 'Vui long nhap thong tin dang nhap');
    }

    this.setState({ loading: true });
    try {
      const deviceId = await getOrCreateDeviceId();
      const auth = new AuthService(baseUrl, deviceId, DEFAULT_UA);
      const res = await auth.login(phone, password);

      if (res.kind === 'success') {
        await this.rootController.getRootInstanceForAuth(res.session, baseUrl);
      } else if (res.kind === 'otp') {
        this.setState({
          otpPhone: phone,
          otpDeviceId: deviceId,
          loginStep: 'otp',
          trustDevice: false,
        });
      } else {
        Alert.alert('Dang nhap that bai', res.message);
      }
    } finally {
      this.setState({ loading: false });
    }
  }

  public async onVerify() {
    const { otp, otpPhone, otpDeviceId, trustDevice } = this.state;
    const baseUrl = this.rootController.getState().baseUrl.trim();

    if (!otp) {
      return Alert.alert('Loi', 'Vui long nhap ma OTP');
    }

    this.setState({ loading: true });
    try {
      const auth = new AuthService(baseUrl, otpDeviceId, DEFAULT_UA);
      const res = await auth.verifyOtp(otpPhone, otp);

      if (res.kind === 'success') {
        if (trustDevice) {
          try {
            await auth.saveTrustedDevice(res.session.accessToken);
          } catch (error: any) {
            Alert.alert(
              'Luu thiet bi tin cay that bai',
              error?.response?.data?.message || error?.message || 'Khong the luu thiet bi tin cay.',
            );
          }
        }

        this.setState({
          loginStep: 'credentials',
          otp: '',
          trustDevice: false,
        });
        await this.rootController.getRootInstanceForAuth(res.session, baseUrl);
      } else {
        Alert.alert('Xac thuc that bai', 'Ma OTP khong chinh xac hoac da het han');
      }
    } finally {
      this.setState({ loading: false });
    }
  }
}
