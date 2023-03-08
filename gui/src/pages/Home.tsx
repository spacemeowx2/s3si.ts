import { CheckUpdate } from 'components/CheckUpdate';
import { ErrorContent } from 'components/ErrorContent';
import { Loading } from 'components/Loading';
import { STAT_INK } from 'constant';
import { usePromise } from 'hooks/usePromise';
import React from 'react'
import { useTranslation } from 'react-i18next';
import { Link } from "react-router-dom";
import { getConfig, getProfile } from 'services/config';
import { composeLoadable } from 'utils/composeLoadable';

export const Home: React.FC = () => {
  let { loading, error, retry } = composeLoadable({
    config: usePromise(getConfig),
    profile: usePromise(() => getProfile(0)),
  });
  const { t } = useTranslation();

  if (loading) {
    return <>
      <div className='h-full flex items-center justify-center'><Loading /></div>
    </>
  }

  if (error) {
    return <>
      <ErrorContent error={error} retry={retry} />
    </>
  }

  return <>
    <div className='card m-2 h-full'>
      <h1 className='mb-4'>{t('欢迎!')}</h1>
      <div className='flex flex-col gap-2'>
        <Link to='/settings' className='btn btn-primary'>{t('配置')}</Link>
        <a className='btn' href={STAT_INK} target='_blank' rel='noreferrer'>{t('前往 stat.ink')}</a>
        <CheckUpdate className='btn'>{t('检查更新')}</CheckUpdate>
      </div>
    </div>
  </>
}
