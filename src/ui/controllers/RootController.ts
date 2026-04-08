import { Alert } from 'react-native';
import { BaseController } from '../core/BaseController';
import { EricAppWorker, AppData, EMPTY_DATA } from '../../worker/EricAppWorker';
import { StoredSession } from '../../service/auth/AuthService';
import {
  readStoredSession,
  persistSession,
  clearStoredSession,
  readStoredBaseUrl,
  persistBaseUrl,
} from '../../storage/SessionStore';

export type Tab = 'home' | 'compose' | 'friends' | 'alerts' | 'profile';

export const DEFAULT_BASE_URL = 'https://social.eric.pro.vn';
export const DEFAULT_UA =
  'ERIC/1.0.0 (iOS; 18.5.0; iPhone 15 Pro)';

export interface RootState {
  booting: boolean;
  refreshing: boolean;
  loading: boolean;
  session: StoredSession | null;
  data: AppData;
  tab: Tab;
  baseUrl: string;
}

export class RootController extends BaseController<RootState> {
  public worker: EricAppWorker | null = null;

  constructor() {
    super({
      booting: true,
      refreshing: false,
      loading: false,
      session: null,
      data: EMPTY_DATA,
      tab: 'home',
      baseUrl: DEFAULT_BASE_URL,
    });

    this.init();
  }

  private shouldResetStoredSession(error: any) {
    const message = String(error?.message || '').toLowerCase();
    return (
      message.includes('phien dang nhap') ||
      message.includes('lam moi phien dang nhap') ||
      message.includes('dang nhap lai') ||
      message.includes('api refresh')
    );
  }

  private async init() {
    try {
      const session = await readStoredSession();
      const url = await readStoredBaseUrl();

      const nextBaseUrl = session?.baseUrl || DEFAULT_BASE_URL;
      this.setState({ baseUrl: nextBaseUrl });
      if (url !== nextBaseUrl) {
        await persistBaseUrl(nextBaseUrl);
      }

      if (session) {
        await this.loadAll(session, true);
      }
    } finally {
      this.setState({ booting: false });
    }
  }

  public async loadAll(seed: StoredSession, showSpinner = false) {
    if (showSpinner) this.setState({ loading: true });

    try {
      this.worker = new EricAppWorker(seed);
      const res = await this.worker.loadAll(seed);

      this.setState({
        session: res.session,
        data: res.data,
      });
      await persistSession(res.session);
    } catch (error: any) {
      if (this.shouldResetStoredSession(error)) {
        await clearStoredSession();
        this.worker = null;
        this.setState({
          session: null,
          data: EMPTY_DATA,
          tab: 'home',
          baseUrl: seed.baseUrl || DEFAULT_BASE_URL,
        });
        return;
      }

      Alert.alert('Loi', error?.message || 'Khong the tai du lieu');
    } finally {
      this.setState({ loading: false, refreshing: false });
    }
  }

  public setTab = (tab: Tab) => {
    this.setState({ tab });
    if (tab === 'friends' && this.state.data.friends.length === 0 && !this.state.loading) {
      this.loadAll(this.state.session!, false);
    }
  };

  public setRefreshing = (refreshing: boolean) => {
    this.setState({ refreshing });
    if (refreshing && this.state.session) {
      this.loadAll(this.state.session, false);
    }
  };

  public setBaseUrl = (url: string) => {
    this.setState({ baseUrl: url });
  };

  public async onLogout() {
    if (this.worker && this.state.session) {
      await this.worker.logout(this.state.session).catch(() => {});
    }
    await clearStoredSession();
    this.worker = null;
    this.setState({
      session: null,
      data: EMPTY_DATA,
      tab: 'home',
      baseUrl: DEFAULT_BASE_URL,
    });
    await persistBaseUrl(DEFAULT_BASE_URL);
  }

  public async onReact(pid: string) {
    if (this.worker && this.state.session) {
      try {
        const next = await this.worker.reactToPost(this.state.session, pid, 'LIKE');
        await this.loadAll(next, false);
      } catch {}
    }
  }

  public async claimAll() {
    if (this.worker && this.state.session) {
      try {
        const res = await this.worker.claimAllEligible(this.state.session);
        await this.loadAll(this.state.session, false);
        Alert.alert('Thanh cong', `Da nhan thuong ${res.claimed.length} nhiem vu.`);
      } catch (e: any) {
        Alert.alert('Loi', e?.message || 'Khong the nhan thuong');
      }
    }
  }

  public async acceptRequest(senderId: string) {
    if (this.worker && this.state.session) {
      try {
        await this.worker.acceptRequest(this.state.session, senderId);
        await this.loadAll(this.state.session, false);
      } catch (e: any) {
        Alert.alert('Loi', e?.message || 'Khong the dong y ket ban');
      }
    }
  }

  public async rejectRequest(senderId: string) {
    if (this.worker && this.state.session) {
      try {
        await this.worker.rejectRequest(this.state.session, senderId);
        await this.loadAll(this.state.session, false);
      } catch (e: any) {
        Alert.alert('Loi', e?.message || 'Khong the tu choi loi moi ket ban');
      }
    }
  }

  public async deleteFriend(friendId: string) {
    if (this.worker && this.state.session) {
      try {
        await this.worker.deleteFriend(this.state.session, friendId);
        await this.loadAll(this.state.session, false);
      } catch (e: any) {
        Alert.alert('Loi', e?.message || 'Khong the xoa ban be');
      }
    }
  }

  public async getRootInstanceForAuth(session: StoredSession, url: string) {
    this.setState({ baseUrl: url });
    await persistBaseUrl(url);
    await this.loadAll(session, true);
  }
}
