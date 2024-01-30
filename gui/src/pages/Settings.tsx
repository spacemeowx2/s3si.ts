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
import { useSubField } from 'hooks/useSubField';
import { useNavigate } from 'react-router-dom';

const STAT_INK_KEY_LENGTH = 43;

const Page: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const { t } = useTranslation();
  return <div className='full-card'>
    <Header title={t('设置')} />
    {children}
  </div>
}

type FormData = {
  config: Config,
  profile: Profile,
}

const SPLATNET3_LANGS = {
  "de-DE": "German",
  "en-GB": "English (UK/Australia)",
  "en-US": "English (US)",
  "es-ES": "Spanish (Spain)",
  "es-MX": "Spanish (Latin America)",
  "fr-CA": "French (Canada)",
  "fr-FR": "French (France)",
  "it-IT": "Italian",
  "ja-JP": "Japanese",
  "ko-KR": "Korean",
  "nl-NL": "Dutch",
  "ru-RU": "Russian",
  "zh-CN": "Chinese (China)",
  "zh-TW": "Chinese (Taiwan)"
}
const UI_LANGS = {
  "en": "English",
  "zh-CN": "简体中文",
  "ja": "日本語",
};

const Form: React.FC<{
  oldValue: FormData,
  onSaved?: () => void,
}> = ({ oldValue, onSaved }) => {
  const { login } = useLogin();
  const { t, i18n } = useTranslation();
  const [value, setValue] = useState(oldValue);
  const { subField } = useSubField({ value, onChange: setValue });

  const changed = JSON.stringify(value) !== JSON.stringify(oldValue);

  const sessionToken = subField('profile.state.loginState.sessionToken')
  const statInkApiKey = subField('profile.state.statInkApiKey')
  const splatnet3Lang = subField('profile.state.userLang')

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
    sessionToken.onChange(result.sessionToken);
  })

  const statInkKeyError = (statInkApiKey.value?.length ?? STAT_INK_KEY_LENGTH) !== STAT_INK_KEY_LENGTH;

  return <>
    <div className='card'>
      <div className="form-control w-full max-w-md mb-4">
        <label className="label">
          <span className="label-text">{t('Nintendo Account 会话令牌')}</span>
          <span className="label-text-alt"><button
            type='button'
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
          value={sessionToken.value ?? ''}
          onChange={e => sessionToken.onChange(e.target.value)}
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
          >{t('查看API密钥')}</a></span>
        </label>
        <div className='tooltip' data-tip={statInkKeyError ? t('密钥的长度应该为{{length}}, 请检查', { length: STAT_INK_KEY_LENGTH }) : null}>
          <input
            className={classNames("input input-bordered w-full", {
              'input-error': statInkKeyError,
            })}
            type="text"
            placeholder={t('请从stat.ink中获取API密钥') ?? undefined}
            value={statInkApiKey.value ?? ''}
            onChange={e => statInkApiKey.onChange(e.target.value)}
          />
        </div>
      </div>
      <div className="form-control w-full max-w-md mb-4">
        <label className="label">
          <span className="label-text">{t('鱿鱼圈3语言偏好')}</span>
        </label>
        <select className="select w-full" value={splatnet3Lang.value} onChange={
          e => splatnet3Lang.onChange(e.target.value)
        }>
          {Object.entries(SPLATNET3_LANGS).map(([key, value]) => <option key={key} value={key}>{value} ({key})</option>)}
        </select>
      </div>
      <div className="form-control w-full max-w-md mb-4">
        <label className="label">
          <span className="label-text">{t('界面语言')}</span>
        </label>
        <select className="select w-full" value={i18n.language} onChange={
          e => {
            i18n.changeLanguage(e.target.value);
          }
        }>
          {Object.entries(UI_LANGS).map(([key, value]) => <option key={key} value={key}>{value} ({key})</option>)}
        </select>
      </div>
    </div>
    <ErrorContent error={error} />
    <div className='flex gap-4 max-w-md justify-between flex-auto-all'>
      <div className="tooltip" data-tip={changed ? undefined : t('没有更改')}>
        <button
          type='button'
          className={classNames('btn btn-primary w-full', {
            loading,
          })}
          onClick={onSave}
          disabled={!changed || statInkKeyError}
        >{t('保存')}</button>
      </div>
      <button
        type='button'
        className={classNames('btn', {
          loading,
        })}
        onClick={() => setValue(oldValue)}
      >{t('重置')}</button>
    </div>
  </>
}

export const Settings: React.FC = () => {
  const navigate = useNavigate();
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
    {result && <Form oldValue={result} onSaved={() => navigate(-1)} />}
  </Page>
}
