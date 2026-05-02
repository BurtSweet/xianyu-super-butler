import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ShieldCheck, Lock, KeyRound, Loader2, X, Check, Sparkles, ArrowRight } from 'lucide-react';
import { changePassword, checkDefaultPassword } from '../services/api';

const STORAGE_KEY = 'xianyu_onboarding_dismissed_v1';

interface Props {
  onClose: () => void;
  onPasswordChanged?: () => void;
}

/**
 * 首次使用引导 / 默认密码强制修改弹窗。
 *
 * 行为：
 * - 检测到当前账号仍在使用默认密码 admin/admin123 时强制弹出，无法跳过；
 * - 否则仅在用户从未关闭过引导时（localStorage 未记录）显示一次性指引；
 * - 修改密码后会立即关闭并写入 localStorage，避免再次弹出。
 */
const Onboarding: React.FC<Props> = ({ onClose, onPasswordChanged }) => {
  const [step, setStep] = useState<'guide' | 'password' | 'done'>('guide');
  const [usingDefault, setUsingDefault] = useState(false);
  const [checking, setChecking] = useState(true);
  const [oldPwd, setOldPwd] = useState('admin123');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    checkDefaultPassword()
      .then((res) => {
        if (cancelled) return;
        setUsingDefault(!!res.using_default);
        if (res.using_default) {
          // 强制修改密码
          setStep('password');
        }
      })
      .catch(() => {
        // 接口失败时不阻塞，按普通引导处理
      })
      .finally(() => {
        if (!cancelled) setChecking(false);
      });
    return () => { cancelled = true; };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!newPwd || newPwd.length < 6) {
      setError('新密码长度至少为 6 位');
      return;
    }
    if (newPwd === oldPwd) {
      setError('新密码不能与旧密码相同');
      return;
    }
    if (newPwd !== confirmPwd) {
      setError('两次输入的新密码不一致');
      return;
    }
    setSubmitting(true);
    try {
      const res = await changePassword(oldPwd, newPwd);
      if (res.success) {
        setStep('done');
        try { localStorage.setItem(STORAGE_KEY, '1'); } catch {}
        onPasswordChanged?.();
      } else {
        setError(res.message || res.msg || '修改失败');
      }
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.message || '修改失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (usingDefault && step !== 'done') {
      // 强制修改密码场景下不允许关闭
      return;
    }
    try { localStorage.setItem(STORAGE_KEY, '1'); } catch {}
    onClose();
  };

  if (checking) return null;

  return createPortal(
    <div className="modal-overlay-centered" style={{ zIndex: 9999 }}>
      <div className="modal-container" style={{ maxWidth: '560px' }}>
        {!usingDefault && (
          <button
            onClick={handleClose}
            className="self-end p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors mb-2"
            title="关闭"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        )}

        <div className="modal-body">
          {step === 'guide' && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto bg-[#FFE815] rounded-2xl flex items-center justify-center shadow-lg mb-4">
                  <Sparkles className="w-8 h-8 text-black" />
                </div>
                <h3 className="text-2xl font-extrabold text-gray-900">欢迎使用闲鱼智控 Pro</h3>
                <p className="text-gray-500 mt-2">几步即可完成初始化设置</p>
              </div>
              <ol className="space-y-3 text-sm">
                <li className="flex items-start gap-3 p-3 rounded-xl bg-gray-50">
                  <span className="w-6 h-6 rounded-full bg-black text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">1</span>
                  <div>
                    <div className="font-bold text-gray-900">修改默认密码</div>
                    <div className="text-gray-500">默认管理员密码为 <code className="px-1 py-0.5 bg-white rounded text-xs">admin123</code>，请立即修改。</div>
                  </div>
                </li>
                <li className="flex items-start gap-3 p-3 rounded-xl bg-gray-50">
                  <span className="w-6 h-6 rounded-full bg-black text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">2</span>
                  <div>
                    <div className="font-bold text-gray-900">绑定闲鱼账号</div>
                    <div className="text-gray-500">在「账号管理」中扫码登录或粘贴 Cookie 添加账号。</div>
                  </div>
                </li>
                <li className="flex items-start gap-3 p-3 rounded-xl bg-gray-50">
                  <span className="w-6 h-6 rounded-full bg-black text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">3</span>
                  <div>
                    <div className="font-bold text-gray-900">配置自动回复 / 自动发货规则</div>
                    <div className="text-gray-500">在「关键词」「卡密」「规则」三个页面分别完成配置。</div>
                  </div>
                </li>
                <li className="flex items-start gap-3 p-3 rounded-xl bg-gray-50">
                  <span className="w-6 h-6 rounded-full bg-black text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">4</span>
                  <div>
                    <div className="font-bold text-gray-900">（可选）配置 AI 议价 / 邮件通知 / SMTP</div>
                    <div className="text-gray-500">在「系统设置」中按需启用。</div>
                  </div>
                </li>
              </ol>
              <div className="flex gap-3">
                <button
                  onClick={() => setStep('password')}
                  className="flex-1 ios-btn-primary px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2"
                >
                  <ShieldCheck className="w-4 h-4" />
                  立即修改默认密码
                </button>
                <button
                  onClick={handleClose}
                  className="flex-1 px-6 py-3 rounded-xl font-bold bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
                >
                  稍后再说
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {step === 'password' && (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto bg-amber-100 rounded-2xl flex items-center justify-center mb-4">
                  <ShieldCheck className="w-8 h-8 text-amber-600" />
                </div>
                <h3 className="text-2xl font-extrabold text-gray-900">
                  {usingDefault ? '请立即修改默认密码' : '修改登录密码'}
                </h3>
                {usingDefault && (
                  <p className="text-amber-600 mt-2 text-sm font-medium">
                    检测到当前仍在使用系统默认密码，存在严重安全风险，必须修改后才能继续使用。
                  </p>
                )}
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">当前密码</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="password"
                      value={oldPwd}
                      onChange={(e) => setOldPwd(e.target.value)}
                      className="w-full ios-input pl-11 pr-4 py-3 rounded-xl"
                      placeholder="当前密码"
                      autoComplete="current-password"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">新密码</label>
                  <div className="relative">
                    <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="password"
                      value={newPwd}
                      onChange={(e) => setNewPwd(e.target.value)}
                      className="w-full ios-input pl-11 pr-4 py-3 rounded-xl"
                      placeholder="至少 6 位"
                      autoComplete="new-password"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">确认新密码</label>
                  <div className="relative">
                    <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="password"
                      value={confirmPwd}
                      onChange={(e) => setConfirmPwd(e.target.value)}
                      className="w-full ios-input pl-11 pr-4 py-3 rounded-xl"
                      placeholder="再次输入新密码"
                      autoComplete="new-password"
                    />
                  </div>
                </div>

                {error && (
                  <div className="p-3 rounded-xl bg-red-50 text-red-600 text-sm font-medium">{error}</div>
                )}
              </div>

              <div className="flex gap-3">
                {!usingDefault && (
                  <button
                    type="button"
                    onClick={() => setStep('guide')}
                    className="flex-1 px-6 py-3 rounded-xl font-bold bg-gray-100 text-gray-700 hover:bg-gray-200"
                    disabled={submitting}
                  >
                    返回
                  </button>
                )}
                <button
                  type="submit"
                  className="flex-1 ios-btn-primary px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2"
                  disabled={submitting}
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                  {submitting ? '提交中...' : '修改密码'}
                </button>
              </div>
            </form>
          )}

          {step === 'done' && (
            <div className="text-center space-y-6 py-4">
              <div className="w-20 h-20 mx-auto bg-green-100 rounded-full flex items-center justify-center">
                <Check className="w-10 h-10 text-green-600" />
              </div>
              <div>
                <h3 className="text-2xl font-extrabold text-gray-900">密码修改成功</h3>
                <p className="text-gray-500 mt-2">下次登录请使用新密码</p>
              </div>
              <button
                onClick={() => { try { localStorage.setItem(STORAGE_KEY, '1'); } catch {}; onClose(); }}
                className="ios-btn-primary px-8 py-3 rounded-xl font-bold"
              >
                开始使用
              </button>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
};

export const shouldShowOnboarding = (): boolean => {
  try {
    return localStorage.getItem(STORAGE_KEY) !== '1';
  } catch {
    return true;
  }
};

export default Onboarding;
