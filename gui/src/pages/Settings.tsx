import { ErrorContent } from 'components/ErrorContent';
import { Loading } from 'components/Loading';
import { usePromise, usePromiseLazy } from 'hooks/usePromise';
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next';
import { Config, getConfig, getProfile, Profile, setConfig, setProfile } from 'services/config';
import { composeLoadable } from 'utils/composeLoadable';
import classNames from 'classnames';
import { useLogin } from 'services/s3si';
import { STAT_INK } from 'constant';
import { Header } from 'components/Header';

const Page: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const { t } = useTranslation();
  return <div className='full-card'>
    <Header title={t('配置')} />
    {children}
  </div>
}

type FormData = {
  config: Config,
  profile: Profile,
}

const Form: React.FC<{
  oldValue: FormData,
  onSaved?: () => void,
}> = ({ oldValue, onSaved }) => {
  const { login } = useLogin();
  const { t } = useTranslation();
  const [value, setValue] = useState(oldValue);

  const changed = JSON.stringify(value) !== JSON.stringify(oldValue);

  const setSessionToken = (t: string) => setValue({
    ...value,
    profile: {
      ...value.profile,
      state: {
        ...value.profile.state,
        loginState: {
          ...value.profile.state.loginState,
          sessionToken: t,
        },
      }
    }
  })

  const [onSave, { loading, error }] = usePromiseLazy(async () => {
    await setProfile(0, value.profile);
    await setConfig(value.config);
    onSaved?.();
  })
  const [onLogin, loginState] = usePromiseLazy(async () => {
    const result = await login();
    if (!result) {
      return;
    }
    setSessionToken(result.sessionToken);
  })

  return <>
    <div className='card'>
      <div className="form-control w-full max-w-md mb-4">
        <label className="label">
          <span className="label-text">{t('Nintendo Account 会话令牌')}</span>
          <span className="label-text-alt"><button
            className={classNames('link', {
              loading: loginState.loading,
            })}
            onClick={onLogin}
            disabled={loginState.loading}
          >{t('网页登录')}</button></span>
        </label>
        <input
          className="input input-bordered w-full"
          type="text"
          placeholder={t('请点击右上角的登录填入') ?? undefined}
          value={value.profile.state.loginState?.sessionToken ?? ''}
          onChange={e => setSessionToken(e.target.value)}
        />
      </div>
      <div className="form-control w-full max-w-md mb-4">
        <label className="label">
          <span className="label-text">{t('stat.ink API密钥')}</span>
          <span className="label-text-alt"><a
            className='underline'
            target='_blank'
            rel='noopener noreferrer'
            href={`${STAT_INK}/profile`}
            title={t('打开 stat.ink') ?? undefined}
          >{t('stat.ink')}</a></span>
        </label>
        <input
          className="input input-bordered w-full"
          type="text"
          placeholder={t('长度为43') ?? undefined}
          value={value.profile.state.statInkApiKey ?? ''}
          onChange={e => setValue({
            ...value,
            profile: {
              ...value.profile,
              state: {
                ...value.profile.state,
                statInkApiKey: e.target.value,
              }
            }
          })}
        />
      </div>
    </div>
    <ErrorContent error={error} />
    <div className='flex gap-4 max-w-md justify-between flex-auto-all'>
      <div className="tooltip" data-tip={changed ? undefined : t('没有更改')}>
        <button className={classNames('btn btn-primary w-full', {
          loading,
        })} onClick={onSave} disabled={!changed}>{t('保存')}</button>
      </div>
      <button className={classNames('btn', {
        loading,
      })} onClick={() => setValue(oldValue)}>{t('重置')}</button>
    </div>
  </>
}

export const Settings: React.FC = () => {
  let { loading, error, retry, result } = composeLoadable({
    config: usePromise(getConfig),
    profile: usePromise(() => getProfile(0)),
  });

  if (loading) {
    return <Page>
      <div className='h-full flex items-center justify-center'><Loading /></div>
    </Page>
  }

  if (error) {
    return <Page>
      <ErrorContent error={error} retry={retry} />
    </Page>
  }

  return <Page>
    {result && <Form oldValue={result} onSaved={retry} />}
  </Page>
}
