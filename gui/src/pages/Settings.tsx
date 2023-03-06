import { ErrorContent } from 'components/ErrorContent';
import { Loading } from 'components/Loading';
import { usePromise, usePromiseLazy } from 'hooks/usePromise';
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next';
import { AiOutlineLeft } from 'react-icons/ai';
import { useNavigate } from 'react-router-dom';
import { Config, getConfig, getProfile, Profile, setConfig, setProfile } from 'services/config';
import { composeLoadable } from 'utils/composeLoadable';
import classNames from 'classnames';

const Page: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  return <div className='card m-2 h-full'>
    <h2 className="card-title" data-tauri-drag-region><button onClick={() => navigate('/')}><AiOutlineLeft /></button>{t('配置')}</h2>
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
  const { t } = useTranslation();
  const [value, setValue] = useState(oldValue);

  const changed = JSON.stringify(value) !== JSON.stringify(oldValue);

  const [onSave, { loading, error }] = usePromiseLazy(async () => {
    await setProfile(0, value.profile);
    await setConfig(value.config);
    onSaved?.();
  })

  return <>
    <div className='card'>
      <div className="form-control w-full max-w-xs mb-4">
        <label className="label">
          <span className="label-text">{t('stat.ink API密钥')}</span>
          <span className="label-text-alt"><a
            className='underline'
            target='_blank'
            rel='noopener noreferrer'
            href='https://stat.ink/profile'
            title={t('打开 stat.ink') ?? undefined}
          >{t('stat.ink')}</a></span>
        </label>
        <input
          className="input input-bordered w-full max-w-xs"
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
    <div className='flex gap-5'>
      <button className={classNames('btn btn-primary w-[150px]', {
        loading,
      })} onClick={onSave} disabled={!changed}>{t('保存')}</button>
      <button className={classNames('btn w-[150px]', {
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
